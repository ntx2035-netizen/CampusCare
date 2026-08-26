import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.enums import Role
from app.models import Incident, IncidentCategory, User
from app.schemas import ReportSummary

router = APIRouter(prefix="/reports", tags=["Báo cáo"])


def csv_safe(value: object) -> object:
    """Ngăn bảng tính diễn giải dữ liệu người dùng nhập thành công thức."""
    if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


@router.get("/summary", response_model=ReportSummary)
def summary(
    _: User = Depends(require_roles(Role.ADMIN, Role.DISPATCHER)),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count(Incident.id))) or 0
    status_rows = db.execute(select(Incident.status, func.count()).group_by(Incident.status)).all()
    category_rows = db.execute(
        select(IncidentCategory.name, func.count(Incident.id))
        .join(Incident, Incident.category_id == IncidentCategory.id)
        .group_by(IncidentCategory.name)
    ).all()
    avg_seconds = (
        db.scalar(
            select(
                func.avg(func.extract("epoch", Incident.resolved_at - Incident.created_at))
            ).where(Incident.resolved_at.is_not(None))
        )
        or 0
    )
    finished = db.scalar(select(func.count()).where(Incident.resolved_at.is_not(None))) or 0
    on_time = (
        db.scalar(
            select(func.count()).where(
                Incident.resolved_at.is_not(None),
                Incident.due_at.is_not(None),
                Incident.resolved_at <= Incident.due_at,
            )
        )
        or 0
    )
    workload_rows = db.execute(
        select(User.id, User.full_name, func.count(Incident.id))
        .outerjoin(Incident, Incident.assigned_staff_id == User.id)
        .where(User.role == Role.STAFF)
        .group_by(User.id, User.full_name)
        .order_by(User.full_name)
    ).all()
    return ReportSummary(
        total=total,
        by_status={str(key.value): value for key, value in status_rows},
        by_category={key: value for key, value in category_rows},
        average_resolution_hours=round(float(avg_seconds) / 3600, 2),
        on_time_rate=round(on_time * 100 / finished, 2) if finished else 0,
        staff_workload=[
            {"staff_id": str(row[0]), "name": row[1], "count": row[2]} for row in workload_rows
        ],
    )


@router.get("/incidents.csv")
def export_csv(
    _: User = Depends(require_roles(Role.ADMIN, Role.DISPATCHER)),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(
            Incident.code,
            Incident.title,
            Incident.status,
            Incident.priority,
            Incident.created_at,
            Incident.resolved_at,
            IncidentCategory.name,
        ).join(IncidentCategory)
    ).all()
    output = io.StringIO()
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow(["Mã", "Tiêu đề", "Trạng thái", "Ưu tiên", "Ngày tạo", "Ngày xử lý", "Loại"])
    for row in rows:
        writer.writerow(
            [
                csv_safe(row[0]),
                csv_safe(row[1]),
                row[2].value,
                row[3].value,
                row[4],
                row[5] or "",
                csv_safe(row[6]),
            ]
        )
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="bao-cao-su-co.csv"'},
    )
