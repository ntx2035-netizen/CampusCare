import uuid

import jwt
import redis
from fastapi import APIRouter, FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.api import audits, auth, categories, incidents, locations, notifications, reports, users
from app.config import get_settings
from app.database import SessionLocal
from app.models import User
from app.realtime import manager
from app.security import decode_token
from app.storage import storage

settings = get_settings()
docs_enabled = settings.environment != "production"
app = FastAPI(
    title="CampusCare API",
    description="Nền tảng tiếp nhận và điều phối sự cố trong khuôn viên trường",
    version="1.0.0",
    docs_url="/api/docs" if docs_enabled else None,
    redoc_url="/api/redoc" if docs_enabled else None,
    openapi_url="/api/openapi.json" if docs_enabled else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)

api = APIRouter(prefix="/api")
for route in (
    auth.router,
    users.router,
    locations.router,
    categories.router,
    incidents.router,
    notifications.router,
    reports.router,
    audits.router,
):
    api.include_router(route)


@api.get("/health", tags=["Hệ thống"])
def health():
    checks: dict[str, str] = {}
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    redis.from_url(settings.redis_url, socket_timeout=2).ping()
    checks["redis"] = "ok"
    storage.ensure_bucket()
    checks["object_storage"] = "ok"
    return {"status": "healthy", "service": "campuscare-api", "checks": checks}


@api.get("/live", tags=["Hệ thống"])
def live():
    return {"status": "ok"}


app.include_router(api)


@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    protocols = [
        item.strip() for item in websocket.headers.get("sec-websocket-protocol", "").split(",")
    ]
    token = protocols[1] if len(protocols) > 1 and protocols[0] == "campuscare" else ""
    try:
        claims = decode_token(token, "access")
        user_id = uuid.UUID(claims["sub"])
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
            if user is None:
                raise ValueError("inactive user")
    except (jwt.InvalidTokenError, ValueError):
        await websocket.close(code=4401)
        return
    await manager.connect(user_id, user.role, websocket)
    try:
        await websocket.send_json({"event": "connected"})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


@app.exception_handler(Exception)
async def unhandled_exception(_: Request, __: Exception):
    # Không trả stack trace hoặc chi tiết hạ tầng ra client.
    return JSONResponse(
        status_code=500, content={"detail": "Hệ thống gặp lỗi, vui lòng thử lại sau"}
    )
