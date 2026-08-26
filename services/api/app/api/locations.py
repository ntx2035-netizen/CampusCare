import io
import json
import uuid

import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.enums import LocationKind, Role
from app.models import Location, User
from app.schemas import LocationCreate, LocationOut, LocationUpdate
from app.services import audit

router = APIRouter(prefix="/locations", tags=["Địa điểm"])

PARENT_KIND = {
    LocationKind.AREA: None,
    LocationKind.BUILDING: LocationKind.AREA,
    LocationKind.FLOOR: LocationKind.BUILDING,
    LocationKind.ROOM: LocationKind.FLOOR,
}


def validate_parent(db: Session, kind: LocationKind, parent_id: uuid.UUID | None) -> None:
    required = PARENT_KIND[kind]
    if required is None and parent_id is not None:
        raise HTTPException(status_code=422, detail="Khu vực không có địa điểm cha")
    if required is not None:
        parent = db.get(Location, parent_id) if parent_id else None
        if parent is None or parent.kind != required:
            raise HTTPException(
                status_code=422, detail=f"Địa điểm cha phải có loại {required.value}"
            )


@router.get("", response_model=list[LocationOut])
def list_locations(
    include_inactive: bool = False,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Location).order_by(Location.code)
    if not include_inactive:
        query = query.where(Location.is_active.is_(True))
    return list(db.scalars(query))


@router.get("/resolve/{qr_token}", response_model=LocationOut)
def resolve_qr(qr_token: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    location = db.scalar(
        select(Location).where(Location.qr_token == qr_token, Location.is_active.is_(True))
    )
    if location is None:
        raise HTTPException(status_code=404, detail="Mã QR địa điểm không hợp lệ")
    return location


@router.post("", response_model=LocationOut, status_code=201)
def create_location(
    payload: LocationCreate,
    actor: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    if db.scalar(select(Location).where(Location.code == payload.code.upper())):
        raise HTTPException(status_code=409, detail="Mã địa điểm đã tồn tại")
    validate_parent(db, payload.kind, payload.parent_id)
    location = Location(**payload.model_dump(exclude={"code"}), code=payload.code.upper())
    db.add(location)
    db.flush()
    audit(db, actor, "LOCATION_CREATE", "location", location.id)
    db.commit()
    db.refresh(location)
    return location


@router.patch("/{location_id}", response_model=LocationOut)
def update_location(
    location_id: uuid.UUID,
    payload: LocationUpdate,
    actor: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    location = db.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa điểm")
    changes = payload.model_dump(exclude_unset=True)
    if "parent_id" in changes:
        validate_parent(db, location.kind, changes["parent_id"])
    for key, value in changes.items():
        setattr(location, key, value)
    audit(db, actor, "LOCATION_UPDATE", "location", location.id, details={"fields": list(changes)})
    db.commit()
    db.refresh(location)
    return location


@router.get("/{location_id}/qr")
def location_qr(
    location_id: uuid.UUID,
    _: User = Depends(require_roles(Role.ADMIN, Role.DISPATCHER)),
    db: Session = Depends(get_db),
):
    location = db.get(Location, location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa điểm")
    payload = json.dumps({"type": "campuscare-location", "token": location.qr_token})
    image = qrcode.make(payload)
    output = io.BytesIO()
    image.get_image().save(output, format="PNG")
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{location.code}.png"'},
    )
