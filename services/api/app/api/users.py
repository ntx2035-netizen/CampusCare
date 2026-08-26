import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_roles
from app.enums import AccountType, Role
from app.models import User
from app.schemas import UserCreate, UserOut, UserUpdate
from app.security import hash_password
from app.services import audit

router = APIRouter(prefix="/users", tags=["Người dùng"])


def validate_account_identity(email: str, role: Role, account_type: AccountType) -> None:
    allowed_types = {
        Role.STUDENT: {AccountType.STUDENT, AccountType.LECTURER},
        Role.STAFF: {AccountType.STAFF},
        Role.DISPATCHER: {AccountType.DISPATCHER},
        Role.ADMIN: {AccountType.ADMIN},
    }
    if account_type not in allowed_types[role]:
        raise HTTPException(status_code=422, detail="Loại tài khoản không khớp vai trò")
    domain = email.rsplit("@", 1)[-1]
    if account_type in {AccountType.STUDENT, AccountType.LECTURER}:
        if domain not in get_settings().school_email_domains:
            raise HTTPException(status_code=422, detail="Sinh viên/giảng viên phải dùng email ICTU")
    if account_type in {AccountType.DISPATCHER, AccountType.STAFF}:
        if domain not in get_settings().dispatcher_email_domains:
            raise HTTPException(
                status_code=422,
                detail="Điều phối viên và kỹ thuật viên phải dùng tài khoản Gmail",
            )


@router.get("", response_model=list[UserOut])
def list_users(
    role: Role | None = None,
    active: bool | None = None,
    search: str | None = Query(None, max_length=100),
    actor: User = Depends(require_roles(Role.ADMIN, Role.DISPATCHER)),
    db: Session = Depends(get_db),
):
    query = (
        select(User)
        .where(
            ~User.email.like("%@invalid.local"),
            ~User.email.like("archived.%@archive.campuscare.vn"),
        )
        .order_by(User.full_name)
    )
    if actor.role == Role.DISPATCHER:
        if role not in {None, Role.STAFF}:
            raise HTTPException(status_code=403, detail="Điều phối viên chỉ được xem nhân viên")
        query = query.where(User.role == Role.STAFF)
    elif role:
        query = query.where(User.role == role)
    if active is not None:
        query = query.where(User.is_active == active)
    if search:
        query = query.where(User.full_name.ilike(f"%{search}%"))
    return list(db.scalars(query.limit(200)))


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    actor: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    if payload.role == Role.ADMIN or payload.account_type == AccountType.ADMIN:
        raise HTTPException(status_code=403, detail="Hệ thống chỉ sử dụng một tài khoản ADMIN")
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=409, detail="Email đã tồn tại")
    account_type = payload.account_type or AccountType(payload.role.value)
    validate_account_identity(payload.email.lower(), payload.role, account_type)
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        role=payload.role,
        account_type=account_type,
        email_verified=True,
        approved_at=datetime.now(UTC) if payload.role in {Role.DISPATCHER, Role.STAFF} else None,
        password_hash=hash_password(payload.password),
        phone=payload.phone,
    )
    db.add(user)
    db.flush()
    audit(db, actor, "USER_CREATE", "user", user.id, details={"role": user.role.value})
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    actor: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    changes = payload.model_dump(exclude_unset=True)
    if target.id == actor.id and changes.get("is_active") is False:
        raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản")
    if target.id == actor.id and changes.get("role") not in {None, Role.ADMIN}:
        raise HTTPException(status_code=400, detail="Không thể tự hạ quyền quản trị")
    next_role = changes.get("role", target.role)
    next_type = changes.get("account_type", target.account_type)
    if target.role != Role.ADMIN and (next_role == Role.ADMIN or next_type == AccountType.ADMIN):
        raise HTTPException(status_code=403, detail="Không thể tạo thêm tài khoản ADMIN")
    validate_account_identity(target.email, next_role, next_type)
    approving_account = (
        target.role in {Role.DISPATCHER, Role.STAFF}
        and target.approved_at is None
        and changes.get("is_active") is True
    )
    if approving_account:
        target.approved_at = datetime.now(UTC)
    for key, value in changes.items():
        setattr(target, key, value)
    audit(db, actor, "USER_UPDATE", "user", target.id, details={"fields": list(changes)})
    if approving_account:
        audit(db, actor, "ACCOUNT_APPROVE", "user", target.id)
    db.commit()
    db.refresh(target)
    return target
