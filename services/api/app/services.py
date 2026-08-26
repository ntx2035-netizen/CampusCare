import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.enums import IncidentStatus, Role
from app.models import AuditLog, Incident, IncidentHistory, Notification, User

TRANSITIONS: dict[IncidentStatus, set[IncidentStatus]] = {
    IncidentStatus.NEW: {IncidentStatus.ACCEPTED, IncidentStatus.REJECTED},
    IncidentStatus.ACCEPTED: {IncidentStatus.ASSIGNED, IncidentStatus.REJECTED},
    IncidentStatus.ASSIGNED: {IncidentStatus.IN_PROGRESS},
    IncidentStatus.IN_PROGRESS: {IncidentStatus.RESOLVED},
    IncidentStatus.RESOLVED: {IncidentStatus.CLOSED, IncidentStatus.IN_PROGRESS},
    IncidentStatus.CLOSED: set(),
    IncidentStatus.REJECTED: set(),
}


def make_incident_code(db: Session) -> str:
    today = datetime.now(UTC).strftime("%Y%m%d")
    # UUID tránh hai request đồng thời cùng đếm được một số và gây lỗi unique.
    return f"CC-{today}-{uuid.uuid4().hex[:8].upper()}"


def can_view_incident(user: User, incident: Incident) -> bool:
    if user.role in {Role.ADMIN, Role.DISPATCHER}:
        return True
    if user.role == Role.STAFF:
        return incident.assigned_staff_id == user.id
    return incident.reporter_id == user.id


def assert_can_view(user: User, incident: Incident) -> None:
    if not can_view_incident(user, incident):
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")


def transition_incident(
    db: Session,
    incident: Incident,
    actor: User,
    target: IncidentStatus,
    note: str | None = None,
    resolution: str | None = None,
) -> None:
    source = incident.status
    if target not in TRANSITIONS[source]:
        raise HTTPException(status_code=409, detail=f"Không thể chuyển từ {source} sang {target}")

    if target in {IncidentStatus.ACCEPTED, IncidentStatus.REJECTED} and actor.role not in {
        Role.DISPATCHER,
        Role.ADMIN,
    }:
        raise HTTPException(
            status_code=403, detail="Chỉ điều phối viên được tiếp nhận hoặc từ chối"
        )
    if target == IncidentStatus.IN_PROGRESS and source == IncidentStatus.ASSIGNED:
        if actor.role != Role.ADMIN and incident.assigned_staff_id != actor.id:
            raise HTTPException(status_code=403, detail="Chỉ nhân viên được giao mới được cập nhật")
    if target == IncidentStatus.RESOLVED:
        if actor.role != Role.ADMIN and incident.assigned_staff_id != actor.id:
            raise HTTPException(status_code=403, detail="Chỉ nhân viên được giao mới được cập nhật")
    if target == IncidentStatus.CLOSED:
        if actor.role == Role.STUDENT and incident.reporter_id != actor.id:
            raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")
        if actor.role not in {Role.STUDENT, Role.DISPATCHER, Role.ADMIN}:
            raise HTTPException(status_code=403, detail="Không có quyền đóng sự cố")
    if target == IncidentStatus.IN_PROGRESS and source == IncidentStatus.RESOLVED:
        if actor.role == Role.STUDENT and incident.reporter_id != actor.id:
            raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")
        if actor.role not in {Role.STUDENT, Role.DISPATCHER, Role.ADMIN}:
            raise HTTPException(status_code=403, detail="Không có quyền yêu cầu xử lý lại")
        incident.resolved_at = None

    if target == IncidentStatus.RESOLVED:
        if not resolution or len(resolution.strip()) < 10:
            raise HTTPException(
                status_code=422, detail="Cần nhập nội dung giải quyết tối thiểu 10 ký tự"
            )
        incident.resolution = resolution.strip()
        incident.resolved_at = datetime.now(UTC)
    elif target == IncidentStatus.ACCEPTED:
        incident.accepted_at = datetime.now(UTC)
    elif target == IncidentStatus.ASSIGNED:
        incident.assigned_at = datetime.now(UTC)
    elif target == IncidentStatus.CLOSED:
        incident.closed_at = datetime.now(UTC)
    elif target == IncidentStatus.REJECTED:
        if not note or len(note.strip()) < 5:
            raise HTTPException(status_code=422, detail="Cần nhập lý do từ chối")
        incident.rejection_reason = note.strip()

    incident.status = target
    db.add(
        IncidentHistory(
            incident_id=incident.id,
            actor_id=actor.id,
            from_status=source,
            to_status=target,
            note=note,
        )
    )


def add_notification(
    db: Session, user_id: uuid.UUID, title: str, message: str, data: dict | None = None
) -> Notification:
    item = Notification(user_id=user_id, title=title, message=message, data=data or {})
    db.add(item)
    return item


def audit(
    db: Session,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: object | None,
    ip: str | None = None,
    details: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            details=details or {},
            ip_address=ip,
        )
    )


def set_due_at(incident: Incident) -> None:
    incident.due_at = datetime.now(UTC) + timedelta(minutes=incident.category.sla_minutes)
