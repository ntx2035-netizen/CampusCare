import time
import uuid
from collections import defaultdict, deque
from collections.abc import Callable
from ipaddress import ip_address

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import Role
from app.models import User
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chưa đăng nhập")
    try:
        payload = decode_token(credentials.credentials, "access")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Token không hợp lệ hoặc đã hết hạn") from exc
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Tài khoản không tồn tại hoặc đã bị khóa")
    return user


def require_roles(*roles: Role) -> Callable:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này")
        return user

    return dependency


class MemoryRateLimiter:
    """Giới hạn đơn giản theo tiến trình; Redis có thể thay bằng adapter khi scale ngang."""

    def __init__(self) -> None:
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int = 60) -> None:
        now = time.monotonic()
        entries = self.hits[key]
        while entries and entries[0] <= now - window_seconds:
            entries.popleft()
        if len(entries) >= limit:
            raise HTTPException(status_code=429, detail="Thao tác quá nhanh, vui lòng thử lại sau")
        entries.append(now)


limiter = MemoryRateLimiter()


def client_ip(request: Request) -> str:
    # Nginx ghi đè X-Real-IP bằng địa chỉ kết nối thật. Không tin phần tử đầu
    # X-Forwarded-For vì client có thể tự gửi header này để né rate limit.
    candidate = request.headers.get("x-real-ip") or (
        request.client.host if request.client else "unknown"
    )
    try:
        return str(ip_address(candidate.strip()))
    except ValueError:
        return "unknown"
