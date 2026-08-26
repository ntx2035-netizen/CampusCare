from enum import StrEnum


class Role(StrEnum):
    STUDENT = "STUDENT"
    STAFF = "STAFF"
    DISPATCHER = "DISPATCHER"
    ADMIN = "ADMIN"


class AccountType(StrEnum):
    STUDENT = "STUDENT"
    LECTURER = "LECTURER"
    STAFF = "STAFF"
    DISPATCHER = "DISPATCHER"
    ADMIN = "ADMIN"


class LocationKind(StrEnum):
    AREA = "AREA"
    BUILDING = "BUILDING"
    FLOOR = "FLOOR"
    ROOM = "ROOM"


class IncidentPriority(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    EMERGENCY = "EMERGENCY"


class IncidentStatus(StrEnum):
    NEW = "NEW"
    ACCEPTED = "ACCEPTED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"


class ImageKind(StrEnum):
    REPORT = "REPORT"
    BEFORE = "BEFORE"
    AFTER = "AFTER"
