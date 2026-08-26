import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.enums import Role
from app.models import IncidentCategory, User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import audit

router = APIRouter(prefix="/categories", tags=["Loại sự cố"])


@router.get("", response_model=list[CategoryOut])
def list_categories(
    include_inactive: bool = False,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(IncidentCategory).order_by(IncidentCategory.name)
    if not include_inactive:
        query = query.where(IncidentCategory.is_active.is_(True))
    return list(db.scalars(query))


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    actor: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    if db.scalar(select(IncidentCategory).where(IncidentCategory.name == payload.name)):
        raise HTTPException(status_code=409, detail="Loại sự cố đã tồn tại")
    category = IncidentCategory(**payload.model_dump())
    db.add(category)
    db.flush()
    audit(db, actor, "CATEGORY_CREATE", "category", category.id)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    actor: User = Depends(require_roles(Role.ADMIN)),
    db: Session = Depends(get_db),
):
    category = db.get(IncidentCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại sự cố")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(category, key, value)
    audit(db, actor, "CATEGORY_UPDATE", "category", category.id, details={"fields": list(changes)})
    db.commit()
    db.refresh(category)
    return category
