from collections.abc import Callable

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.enums import Role
from app.models import (
    AuditLog,
    Incident,
    IncidentCategory,
    IncidentHistory,
    IncidentImage,
    Location,
    Notification,
    RefreshToken,
    RegistrationOtp,
    User,
)


def clear_operational_data(
    db: Session,
    keep_admin_email: str,
    remove_image: Callable[[str], None] | None = None,
) -> dict[str, int]:
    """Xóa dữ liệu phát sinh nhưng giữ ADMIN và dữ liệu danh mục/địa điểm nền."""
    admin = db.scalar(select(User).where(User.email == keep_admin_email.lower()))
    if admin is None or admin.role != Role.ADMIN:
        raise RuntimeError("Không tìm thấy đúng tài khoản ADMIN cần giữ lại")

    image_names = list(db.scalars(select(IncidentImage.object_name)))
    if remove_image:
        for object_name in image_names:
            remove_image(object_name)

    summary = {
        "incidents": db.scalar(select(func.count()).select_from(Incident)) or 0,
        "images": len(image_names),
        "non_admin_users": db.scalar(
            select(func.count()).select_from(User).where(User.id != admin.id)
        )
        or 0,
        "categories_kept": db.scalar(select(func.count()).select_from(IncidentCategory)) or 0,
        "locations_kept": db.scalar(select(func.count()).select_from(Location)) or 0,
    }

    # Xóa theo thứ tự khóa ngoại để chạy nhất quán trên cả PostgreSQL và SQLite test.
    db.execute(delete(IncidentImage))
    db.execute(delete(IncidentHistory))
    db.execute(delete(Notification))
    db.execute(delete(AuditLog))
    db.execute(delete(Incident))
    db.execute(delete(RegistrationOtp))
    db.execute(delete(RefreshToken).where(RefreshToken.user_id != admin.id))
    db.execute(delete(User).where(User.id != admin.id))
    db.commit()
    return summary
