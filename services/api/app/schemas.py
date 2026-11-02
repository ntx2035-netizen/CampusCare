import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.enums import AccountType, ImageKind, IncidentPriority, IncidentStatus, LocationKind, Role


class ApiMessage(BaseModel):
    message: str


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: Role


class UserOut(UserBrief):
    phone: str | None = None
    date_of_birth: date | None = None
    temporary_residence: str | None = None
    student_cohort: str | None = None
    avatar_url: str | None = None
    is_active: bool
    account_type: AccountType
    email_verified: bool
    approved_at: datetime | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None
    location_accuracy: float | None = None
    location_updated_at: datetime | None = None
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=12, max_length=128)
    account_type: AccountType

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not all(
            (
                any(char.islower() for char in value),
                any(char.isupper() for char in value),
                any(char.isdigit() for char in value),
                any(not char.isalnum() for char in value),
            )
        ):
            raise ValueError("Mật khẩu cần có chữ hoa, chữ thường, số và ký tự đặc biệt")
        return value


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class RegistrationResult(BaseModel):
    status: str
    message: str
    session: TokenPair | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=150)
    phone: str | None = Field(None, max_length=30)
    date_of_birth: date | None = None
    temporary_residence: str | None = Field(None, max_length=255)
    student_cohort: str | None = Field(None, max_length=30)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    role: Role
    password: str = Field(min_length=12, max_length=128)
    phone: str | None = Field(None, max_length=30)
    date_of_birth: date | None = None
    temporary_residence: str | None = Field(None, max_length=255)
    student_cohort: str | None = Field(None, max_length=30)
    account_type: AccountType | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=150)
    phone: str | None = Field(None, max_length=30)
    date_of_birth: date | None = None
    temporary_residence: str | None = Field(None, max_length=255)
    student_cohort: str | None = Field(None, max_length=30)
    role: Role | None = None
    is_active: bool | None = None
    account_type: AccountType | None = None


class DeviceLocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = Field(None, ge=0, le=10000)


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    code: str = Field(min_length=1, max_length=50, pattern=r"^[A-Za-z0-9._-]+$")
    kind: LocationKind
    parent_id: uuid.UUID | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class LocationUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    parent_id: uuid.UUID | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    is_active: bool | None = None


class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    code: str
    kind: LocationKind
    parent_id: uuid.UUID | None
    latitude: float | None
    longitude: float | None
    qr_token: str
    is_active: bool
    created_at: datetime


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(None, max_length=1000)
    sla_minutes: int = Field(default=1440, ge=15, le=525600)


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = Field(None, max_length=1000)
    sla_minutes: int | None = Field(None, ge=15, le=525600)
    is_active: bool | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None
    sla_minutes: int
    is_active: bool


class IncidentCreate(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=10, max_length=5000)
    category_id: uuid.UUID
    priority: IncidentPriority = IncidentPriority.MEDIUM
    location_id: uuid.UUID | None = None
    location_note: str | None = Field(None, min_length=2, max_length=500)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    idempotency_key: str | None = Field(None, min_length=8, max_length=100)

    @model_validator(mode="after")
    def require_location(self):
        has_latitude = self.latitude is not None
        has_longitude = self.longitude is not None
        if has_latitude != has_longitude:
            raise ValueError("Cần cung cấp đồng thời vĩ độ và kinh độ")
        if (
            self.location_id is None
            and not has_latitude
            and not (self.location_note and self.location_note.strip())
        ):
            raise ValueError("Cần chọn phòng/khu vực, ghi vị trí chi tiết hoặc cung cấp đủ tọa độ")
        return self


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    actor: UserBrief
    from_status: IncidentStatus | None
    to_status: IncidentStatus
    note: str | None
    created_at: datetime


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    kind: ImageKind
    content_type: str
    size: int
    created_at: datetime
    url: str | None = None


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    title: str
    description: str
    category: CategoryOut
    priority: IncidentPriority
    reporter: UserBrief
    location: LocationOut | None
    location_note: str | None
    latitude: float | None
    longitude: float | None
    assigned_staff: UserBrief | None
    status: IncidentStatus
    resolution: str | None
    rejection_reason: str | None
    rating: int | None
    feedback: str | None
    due_at: datetime | None
    created_at: datetime
    updated_at: datetime
    histories: list[HistoryOut] = []
    images: list[ImageOut] = []


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    note: str | None = Field(None, max_length=2000)
    resolution: str | None = Field(None, max_length=5000)


class AssignmentRequest(BaseModel):
    staff_id: uuid.UUID
    note: str | None = Field(None, max_length=2000)


class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    feedback: str | None = Field(None, max_length=2000)


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    message: str
    type: str
    data: dict
    is_read: bool
    created_at: datetime


class ReportSummary(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    average_resolution_hours: float
    on_time_rate: float
    staff_workload: list[dict]


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    entity_type: str
    entity_id: str | None
    details: dict
    ip_address: str | None
    created_at: datetime
