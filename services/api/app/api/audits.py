from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.enums import Role
from app.models import AuditLog, User
from app.schemas import AuditOut

router = APIRouter(prefix="/audit-logs", tags=["Nhật ký kiểm toán"])


@router.get("", response_model=list[AuditOut])
def list_audits(
    _: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    return list(db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)))
