import io
import uuid
from collections.abc import Iterator

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import get_db
from app.dependencies import client_ip, get_current_user, limiter, require_roles
from app.enums import ImageKind, IncidentPriority, IncidentStatus, Role
from app.geo import is_in_campus_scope
from app.models import Incident, IncidentCategory, IncidentHistory, IncidentImage, Location, User
from app.realtime import manager
from app.schemas import (
    AssignmentRequest,
    FeedbackRequest,
    ImageOut,
    IncidentCreate,
    IncidentOut,
    IncidentStatusUpdate,
)
from app.services import (
    add_notification,
    assert_can_view,
    audit,
    make_incident_code,
    set_due_at,
    transition_incident,
)
from app.storage import storage

router = APIRouter(prefix="/incidents", tags=["Sự cố"])
ALLOWED_IMAGES = {"image/jpeg": {"JPEG"}, "image/png": {"PNG"}, "image/webp": {"WEBP"}}
MAX_IMAGE_PIXELS = 25_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


async def publish_to_viewers(incident: Incident, payload: dict) -> None:
    """Chỉ phát sự kiện cho những vai trò/người dùng có quyền xem sự cố."""
    await manager.broadcast_roles({Role.ADMIN, Role.DISPATCHER}, payload)
    await manager.send_user(incident.reporter_id, payload)
    if incident.assigned_staff_id:
        await manager.send_user(incident.assigned_staff_id, payload)


def incident_query():
    return select(Incident).options(
        selectinload(Incident.category),
        selectinload(Incident.reporter),
        selectinload(Incident.assigned_staff),
        selectinload(Incident.location),
        selectinload(Incident.histories).selectinload(IncidentHistory.actor),
        selectinload(Incident.images),
    )


def get_incident_or_404(db: Session, incident_id: uuid.UUID) -> Incident:
    # Session không expire sau commit để tránh truy vấn thừa. Vì vậy cần chủ động
    # nạp đè các relationship, bảo đảm timeline vừa ghi xuất hiện ngay trong response.
    incident = db.scalar(
        incident_query().where(Incident.id == incident_id).execution_options(populate_existing=True)
    )
    if incident is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")
    return incident


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    status_filter: IncidentStatus | None = Query(None, alias="status"),
    priority: IncidentPriority | None = None,
    category_id: uuid.UUID | None = None,
    search: str | None = Query(None, max_length=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = incident_query().order_by(Incident.created_at.desc())
    if user.role == Role.STUDENT:
        query = query.where(Incident.reporter_id == user.id)
    elif user.role == Role.STAFF:
        query = query.where(Incident.assigned_staff_id == user.id)
    if status_filter:
        query = query.where(Incident.status == status_filter)
    if priority:
        query = query.where(Incident.priority == priority)
    if category_id:
        query = query.where(Incident.category_id == category_id)
    if search:
        query = query.where(
            Incident.title.ilike(f"%{search}%") | Incident.code.ilike(f"%{search}%")
        )
    return list(db.scalars(query.limit(300)).unique())


@router.post("", response_model=IncidentOut, status_code=201)
async def create_incident(
    payload: IncidentCreate,
    request: Request,
    user: User = Depends(require_roles(Role.STUDENT, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    if payload.idempotency_key:
        existing = db.scalar(
            incident_query().where(
                Incident.reporter_id == user.id,
                Incident.idempotency_key == payload.idempotency_key,
            )
        )
        if existing:
            return existing
    category = db.get(IncidentCategory, payload.category_id)
    if category is None or not category.is_active:
        raise HTTPException(status_code=422, detail="Loại sự cố không hợp lệ")
    location = None
    if payload.location_id:
        location = db.get(Location, payload.location_id)
        if location is None or not location.is_active:
            raise HTTPException(status_code=422, detail="Địa điểm không hợp lệ")
    latitude = (
        payload.latitude
        if payload.latitude is not None
        else (location.latitude if location else None)
    )
    longitude = (
        payload.longitude
        if payload.longitude is not None
        else (location.longitude if location else None)
    )
    if (
        latitude is not None
        and longitude is not None
        and not is_in_campus_scope(latitude, longitude)
    ):
        raise HTTPException(
            status_code=422,
            detail="Vị trí báo cáo nằm ngoài phạm vi phục vụ quanh ICTU",
        )
    incident_data = payload.model_dump()
    incident_data["latitude"] = latitude
    incident_data["longitude"] = longitude
    incident = Incident(
        **incident_data,
        reporter_id=user.id,
        code=make_incident_code(db),
        status=IncidentStatus.NEW,
    )
    incident.category = category
    set_due_at(incident)
    db.add(incident)
    db.flush()
    db.add(
        IncidentHistory(
            incident_id=incident.id,
            actor_id=user.id,
            from_status=None,
            to_status=IncidentStatus.NEW,
            note="Gửi báo cáo sự cố",
        )
    )
    audit(db, user, "INCIDENT_CREATE", "incident", incident.id, client_ip(request))
    db.commit()
    incident = get_incident_or_404(db, incident.id)
    await publish_to_viewers(
        incident,
        {"event": "incident.created", "incident_id": str(incident.id), "code": incident.code},
    )
    return incident


@router.get("/{incident_id}", response_model=IncidentOut)
def incident_detail(
    incident_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    incident = get_incident_or_404(db, incident_id)
    assert_can_view(user, incident)
    return incident


@router.post("/{incident_id}/assign", response_model=IncidentOut)
async def assign_incident(
    incident_id: uuid.UUID,
    payload: AssignmentRequest,
    actor: User = Depends(require_roles(Role.DISPATCHER, Role.ADMIN)),
    db: Session = Depends(get_db),
):
    incident = get_incident_or_404(db, incident_id)
    if incident.status != IncidentStatus.ACCEPTED:
        raise HTTPException(status_code=409, detail="Chỉ phân công sự cố đã được tiếp nhận")
    staff = db.get(User, payload.staff_id)
    if staff is None or staff.role != Role.STAFF or not staff.is_active:
        raise HTTPException(status_code=422, detail="Nhân viên được chọn không hợp lệ")
    incident.assigned_staff_id = staff.id
    transition_incident(db, incident, actor, IncidentStatus.ASSIGNED, payload.note)
    add_notification(
        db,
        staff.id,
        "Nhiệm vụ mới",
        f"Bạn được phân công xử lý {incident.code}: {incident.title}",
        {"incident_id": str(incident.id)},
    )
    audit(
        db, actor, "INCIDENT_ASSIGN", "incident", incident.id, details={"staff_id": str(staff.id)}
    )
    db.commit()
    await manager.send_user(
        staff.id, {"event": "notification.created", "incident_id": str(incident.id)}
    )
    incident = get_incident_or_404(db, incident.id)
    await publish_to_viewers(
        incident, {"event": "incident.updated", "incident_id": str(incident.id)}
    )
    return incident


@router.patch("/{incident_id}/status", response_model=IncidentOut)
async def update_status(
    incident_id: uuid.UUID,
    payload: IncidentStatusUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    incident = get_incident_or_404(db, incident_id)
    assert_can_view(user, incident)
    transition_incident(db, incident, user, payload.status, payload.note, payload.resolution)
    if incident.reporter_id != user.id:
        add_notification(
            db,
            incident.reporter_id,
            "Sự cố đã cập nhật",
            f"{incident.code} chuyển sang trạng thái {payload.status.value}",
            {"incident_id": str(incident.id), "status": payload.status.value},
        )
    audit(
        db,
        user,
        "INCIDENT_STATUS",
        "incident",
        incident.id,
        details={"status": payload.status.value},
    )
    db.commit()
    incident = get_incident_or_404(db, incident.id)
    await publish_to_viewers(
        incident,
        {
            "event": "incident.updated",
            "incident_id": str(incident.id),
            "status": payload.status.value,
        },
    )
    return incident


@router.post("/{incident_id}/feedback", response_model=IncidentOut)
async def submit_feedback(
    incident_id: uuid.UUID,
    payload: FeedbackRequest,
    user: User = Depends(require_roles(Role.STUDENT)),
    db: Session = Depends(get_db),
):
    incident = get_incident_or_404(db, incident_id)
    if incident.reporter_id != user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")
    if incident.status != IncidentStatus.RESOLVED:
        raise HTTPException(status_code=409, detail="Chỉ đánh giá sự cố đã xử lý")
    incident.rating = payload.rating
    incident.feedback = payload.feedback
    transition_incident(db, incident, user, IncidentStatus.CLOSED, "Sinh viên xác nhận kết quả")
    audit(
        db, user, "INCIDENT_FEEDBACK", "incident", incident.id, details={"rating": payload.rating}
    )
    db.commit()
    incident = get_incident_or_404(db, incident.id)
    await publish_to_viewers(
        incident, {"event": "incident.updated", "incident_id": str(incident.id)}
    )
    return incident


@router.post("/{incident_id}/images", response_model=ImageOut, status_code=201)
async def upload_image(
    incident_id: uuid.UUID,
    request: Request,
    kind: ImageKind = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    limiter.check(f"upload:{user.id}:{client_ip(request)}", get_settings().upload_rate_limit)
    incident = get_incident_or_404(db, incident_id)
    assert_can_view(user, incident)
    if user.role == Role.STUDENT and (incident.reporter_id != user.id or kind != ImageKind.REPORT):
        raise HTTPException(status_code=403, detail="Sinh viên chỉ được tải ảnh báo cáo của mình")
    if user.role == Role.STAFF and incident.assigned_staff_id != user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")
    if user.role == Role.STAFF and kind == ImageKind.REPORT:
        raise HTTPException(status_code=403, detail="Nhân viên chỉ tải ảnh trước hoặc sau xử lý")
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGES:
        raise HTTPException(status_code=415, detail="Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP")
    limit = get_settings().max_upload_bytes
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail="Ảnh vượt quá giới hạn 8 MB")
    try:
        with Image.open(io.BytesIO(data)) as image:
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="Ảnh có độ phân giải quá lớn")
            detected = image.format
            image.verify()
        if detected not in ALLOWED_IMAGES[content_type]:
            raise HTTPException(status_code=415, detail="Nội dung ảnh không khớp định dạng")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=415, detail="File ảnh bị lỗi hoặc không hợp lệ") from exc
    object_name = storage.put(incident.id, data, content_type)
    item = IncidentImage(
        incident_id=incident.id,
        uploader_id=user.id,
        object_name=object_name,
        content_type=content_type,
        size=len(data),
        kind=kind,
    )
    db.add(item)
    db.flush()
    audit(db, user, "INCIDENT_IMAGE_UPLOAD", "incident", incident.id, details={"kind": kind.value})
    db.commit()
    db.refresh(item)
    await publish_to_viewers(
        incident, {"event": "incident.updated", "incident_id": str(incident.id)}
    )
    result = ImageOut.model_validate(item)
    return result.model_copy(update={"url": f"/api/incidents/{incident.id}/images/{item.id}"})


@router.get("/{incident_id}/images/{image_id}")
def download_image(
    incident_id: uuid.UUID,
    image_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    incident = get_incident_or_404(db, incident_id)
    assert_can_view(user, incident)
    image = db.get(IncidentImage, image_id)
    if image is None or image.incident_id != incident.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    response = storage.get(image.object_name)

    def stream() -> Iterator[bytes]:
        try:
            while chunk := response.read(64 * 1024):
                yield chunk
        finally:
            response.close()
            response.release_conn()

    return StreamingResponse(stream(), media_type=image.content_type)
