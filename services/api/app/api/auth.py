import hashlib
import hmac
import secrets
import smtplib
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import client_ip, get_current_user, limiter
from app.enums import AccountType, Role
from app.mailer import send_registration_otp
from app.models import RefreshToken, RegistrationOtp, User
from app.schemas import (
    ApiMessage,
    LoginRequest,
    OtpVerifyRequest,
    PasswordChange,
    ProfileUpdate,
    RefreshRequest,
    RegisterRequest,
    RegistrationResult,
    TokenPair,
    UserOut,
)
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    token_digest,
    verify_password,
)
from app.services import audit

router = APIRouter(prefix="/auth", tags=["Xác thực"])


def _otp_digest(email: str, code: str) -> str:
    secret = get_settings().jwt_secret.encode()
    return hmac.new(secret, f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


def _issue_pair(db: Session, user: User) -> TokenPair:
    settings = get_settings()
    access, _ = create_access_token(user.id)
    refresh, refresh_expires = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_digest(refresh),
            expires_at=refresh_expires,
        )
    )
    db.flush()
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_minutes * 60,
        user=user,
    )


@router.post("/register/request-otp", response_model=ApiMessage)
def request_registration_otp(
    payload: RegisterRequest, request: Request, db: Session = Depends(get_db)
):
    """Gửi OTP; tài khoản nghiệp vụ cần ADMIN phê duyệt sau khi xác minh."""
    ip = client_ip(request)
    limiter.check(f"register:{ip}", get_settings().login_rate_limit)
    email = payload.email.lower()
    domain = email.rsplit("@", 1)[-1]
    campus_types = {AccountType.STUDENT, AccountType.LECTURER}
    if payload.account_type in campus_types and domain not in get_settings().school_email_domains:
        raise HTTPException(status_code=400, detail="Sinh viên/giảng viên phải dùng email ICTU")
    privileged_types = {AccountType.DISPATCHER, AccountType.STAFF}
    if (
        payload.account_type in privileged_types
        and domain not in get_settings().dispatcher_email_domains
    ):
        raise HTTPException(
            status_code=400,
            detail="Điều phối viên và kỹ thuật viên phải đăng ký bằng Gmail",
        )
    if payload.account_type not in campus_types | privileged_types:
        raise HTTPException(status_code=403, detail="Loại tài khoản này chỉ do ADMIN tạo")
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="Email này đã được đăng ký")
    full_name = payload.full_name.strip()
    if len(full_name) < 2:
        raise HTTPException(status_code=422, detail="Họ và tên phải có ít nhất 2 ký tự")
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        RegistrationOtp(
            email=email,
            full_name=full_name,
            password_hash=hash_password(payload.password),
            account_type=payload.account_type,
            code_hash=_otp_digest(email, code),
            expires_at=datetime.now(UTC) + timedelta(minutes=get_settings().otp_expire_minutes),
        )
    )
    try:
        send_registration_otp(email, code)
    except (OSError, RuntimeError, smtplib.SMTPException) as exc:
        raise HTTPException(
            status_code=503, detail="Chưa gửi được email OTP, vui lòng thử lại"
        ) from exc
    db.commit()
    return ApiMessage(message="Đã gửi mã OTP đến email của bạn")


@router.post("/register/verify-otp", response_model=RegistrationResult, status_code=201)
def verify_registration_otp(
    payload: OtpVerifyRequest, request: Request, db: Session = Depends(get_db)
):
    limiter.check(f"verify-otp:{client_ip(request)}", get_settings().login_rate_limit)
    email = payload.email.lower()
    record = db.scalar(
        select(RegistrationOtp)
        .where(RegistrationOtp.email == email, RegistrationOtp.used_at.is_(None))
        .order_by(RegistrationOtp.created_at.desc())
    )
    if record is None:
        raise HTTPException(status_code=400, detail="Không tìm thấy yêu cầu OTP")
    expires_at = (
        record.expires_at if record.expires_at.tzinfo else record.expires_at.replace(tzinfo=UTC)
    )
    if expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn")
    record.attempts += 1
    if record.attempts > 5 or not hmac.compare_digest(
        record.code_hash, _otp_digest(email, payload.code)
    ):
        db.commit()
        raise HTTPException(status_code=400, detail="Mã OTP không đúng")
    role_by_type = {
        AccountType.STUDENT: Role.STUDENT,
        AccountType.LECTURER: Role.STUDENT,
        AccountType.STAFF: Role.STAFF,
        AccountType.DISPATCHER: Role.DISPATCHER,
    }
    role = role_by_type[record.account_type]
    pending = role in {Role.DISPATCHER, Role.STAFF}
    user = User(
        email=email,
        full_name=record.full_name,
        password_hash=record.password_hash,
        role=role,
        account_type=record.account_type,
        email_verified=True,
        is_active=not pending,
    )
    record.used_at = datetime.now(UTC)
    db.add(user)
    db.flush()
    audit(db, user, "AUTH_REGISTER_OTP_VERIFIED", "user", user.id, client_ip(request))
    session = None if pending else _issue_pair(db, user)
    db.commit()
    return RegistrationResult(
        status="PENDING_APPROVAL" if pending else "ACTIVE",
        message="Email đã xác minh. Chờ ADMIN duyệt tài khoản nghiệp vụ."
        if pending
        else "Đăng ký thành công",
        session=session,
    )


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    limiter.check(f"login:{ip}", get_settings().login_rate_limit)
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        audit(db, user, "AUTH_LOGIN_FAILED", "user", user.id if user else None, ip)
        db.commit()
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    if not user.is_active:
        detail = (
            "Tài khoản đang chờ ADMIN phê duyệt"
            if user.role in {Role.DISPATCHER, Role.STAFF} and user.approved_at is None
            else "Tài khoản đã bị khóa"
        )
        raise HTTPException(status_code=403, detail=detail)
    pair = _issue_pair(db, user)
    audit(db, user, "AUTH_LOGIN", "user", user.id, ip)
    db.commit()
    return pair


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        claims = decode_token(payload.refresh_token, "refresh")
        user_id = uuid.UUID(claims["sub"])
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ") from exc
    record = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_digest(payload.refresh_token))
    )
    if record is None:
        raise HTTPException(status_code=401, detail="Refresh token đã hết hạn hoặc bị thu hồi")
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if record.revoked_at is not None or expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Refresh token đã hết hạn hoặc bị thu hồi")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không khả dụng")
    record.revoked_at = datetime.now(UTC)
    pair = _issue_pair(db, user)
    replacement = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_digest(pair.refresh_token))
    )
    record.replaced_by = replacement.id if replacement else None
    db.commit()
    return pair


@router.post("/logout", response_model=ApiMessage)
def logout(
    payload: RefreshRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    record = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_digest(payload.refresh_token),
            RefreshToken.user_id == user.id,
        )
    )
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(UTC)
    audit(db, user, "AUTH_LOGOUT", "user", user.id)
    db.commit()
    return ApiMessage(message="Đã đăng xuất")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    audit(db, user, "PROFILE_UPDATE", "user", user.id)
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", response_model=ApiMessage)
def change_password(
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải khác mật khẩu hiện tại")
    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(UTC)
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    audit(db, user, "PASSWORD_CHANGE", "user", user.id)
    db.commit()
    return ApiMessage(message="Đã đổi mật khẩu, vui lòng đăng nhập lại")
