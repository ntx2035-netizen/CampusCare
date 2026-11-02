import json
import os

import qrcode
from sqlalchemy import select

from app.database import SessionLocal
from app.enums import AccountType, LocationKind, Role
from app.models import IncidentCategory, Location, User
from app.security import hash_password

BOOTSTRAP_USERS = [
    (
        "ntx2035@gmail.com",
        "Nguyễn Thanh Xuân",
        Role.ADMIN,
        AccountType.ADMIN,
        os.getenv("DEMO_ADMIN_PASSWORD", "CampusCare@Admin2026!"),
    ),
]


def seed() -> None:
    with SessionLocal() as db:
        for email, full_name, role, account_type, password in BOOTSTRAP_USERS:
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(
                    email=email,
                    full_name=full_name,
                    role=role,
                    account_type=account_type,
                    email_verified=True,
                    password_hash=hash_password(password),
                    is_active=True,
                )
                db.add(user)
                db.flush()
            else:
                user.role = role
                user.account_type = account_type
                user.email_verified = True
                user.is_active = True

        for name, description, sla in [
            ("Điện - chiếu sáng", "Mất điện, chập điện, đèn hỏng", 240),
            ("Nước - vệ sinh", "Rò rỉ nước và vấn đề vệ sinh", 360),
            ("Thiết bị học tập", "Máy chiếu, âm thanh, bàn ghế", 720),
            ("An ninh", "Sự cố an ninh và tài sản", 60),
            ("Hạ tầng mạng", "Wi-Fi và kết nối mạng", 180),
        ]:
            item = db.scalar(select(IncidentCategory).where(IncidentCategory.name == name))
            if item is None:
                item = IncidentCategory(name=name, description=description, sla_minutes=sla)
                db.add(item)
                db.flush()

        def ensure_location(name, code, kind, parent=None, lat=None, lng=None):
            item = db.scalar(select(Location).where(Location.code == code))
            if item is None:
                item = Location(
                    name=name,
                    code=code,
                    kind=kind,
                    parent_id=parent.id if parent else None,
                    latitude=lat,
                    longitude=lng,
                )
                db.add(item)
                db.flush()
            else:
                item.name = name
                item.kind = kind
                item.parent_id = parent.id if parent else None
                if lat is not None:
                    item.latitude = lat
                if lng is not None:
                    item.longitude = lng
            return item

        main = ensure_location(
            "Khuôn viên ICTU", "MAIN", LocationKind.AREA, lat=21.5862035, lng=105.8063499
        )
        building_a = ensure_location(
            "Tòa nhà A", "A", LocationKind.BUILDING, main, 21.58665, 105.80575
        )
        building_b = ensure_location(
            "Tòa nhà B", "B", LocationKind.BUILDING, main, 21.58710, 105.80498
        )
        building_c = ensure_location(
            "Tòa nhà C", "C", LocationKind.BUILDING, main, 21.58595, 105.80690
        )
        dorm_a = ensure_location(
            "Ký túc xá A", "KTX-A", LocationKind.BUILDING, main, 21.58920, 105.80490
        )
        dorm_b = ensure_location(
            "Ký túc xá B", "KTX-B", LocationKind.BUILDING, main, 21.59010, 105.80390
        )
        floor_a1 = ensure_location("Tầng 1 - Tòa A", "A-1", LocationKind.FLOOR, building_a)
        floor_a2 = ensure_location("Tầng 2 - Tòa A", "A-2", LocationKind.FLOOR, building_a)
        floor_b1 = ensure_location("Tầng 1 - Tòa B", "B-1", LocationKind.FLOOR, building_b)
        floor_c1 = ensure_location("Tầng 1 - Tòa C", "C-1", LocationKind.FLOOR, building_c)
        floor_c2 = ensure_location("Tầng 2 - Tòa C", "C-2", LocationKind.FLOOR, building_c)
        floor_c3 = ensure_location("Tầng 3 - Tòa C", "C-3", LocationKind.FLOOR, building_c)
        floor_ka1 = ensure_location("Tầng 1 - Ký túc xá A", "KTX-A-1", LocationKind.FLOOR, dorm_a)
        floor_ka2 = ensure_location("Tầng 2 - Ký túc xá A", "KTX-A-2", LocationKind.FLOOR, dorm_a)
        floor_kb1 = ensure_location("Tầng 1 - Ký túc xá B", "KTX-B-1", LocationKind.FLOOR, dorm_b)
        floor_kb2 = ensure_location("Tầng 2 - Ký túc xá B", "KTX-B-2", LocationKind.FLOOR, dorm_b)
        rooms = [
            ensure_location("Phòng A101", "A101", LocationKind.ROOM, floor_a1, 21.58662, 105.80570),
            ensure_location("Phòng A202", "A202", LocationKind.ROOM, floor_a2, 21.58672, 105.80578),
            ensure_location("Phòng B105", "B105", LocationKind.ROOM, floor_b1, 21.58710, 105.80498),
            ensure_location("Phòng C101", "C101", LocationKind.ROOM, floor_c1, 21.58595, 105.80690),
            ensure_location("Phòng C102", "C102", LocationKind.ROOM, floor_c1),
            ensure_location("Phòng C201", "C201", LocationKind.ROOM, floor_c2),
            ensure_location("Phòng C202", "C202", LocationKind.ROOM, floor_c2),
            ensure_location("Phòng C301", "C301", LocationKind.ROOM, floor_c3),
            ensure_location("Phòng C302", "C302", LocationKind.ROOM, floor_c3),
            ensure_location(
                "Phòng KTX-A101", "KTXA101", LocationKind.ROOM, floor_ka1, 21.58920, 105.80490
            ),
            ensure_location("Phòng KTX-A102", "KTXA102", LocationKind.ROOM, floor_ka1),
            ensure_location("Phòng KTX-A201", "KTXA201", LocationKind.ROOM, floor_ka2),
            ensure_location("Phòng KTX-A202", "KTXA202", LocationKind.ROOM, floor_ka2),
            ensure_location(
                "Phòng KTX-B101", "KTXB101", LocationKind.ROOM, floor_kb1, 21.59010, 105.80390
            ),
            ensure_location("Phòng KTX-B102", "KTXB102", LocationKind.ROOM, floor_kb1),
            ensure_location("Phòng KTX-B201", "KTXB201", LocationKind.ROOM, floor_kb2),
            ensure_location("Phòng KTX-B202", "KTXB202", LocationKind.ROOM, floor_kb2),
        ]
        ensure_location("Sân bóng", "SAN-BONG", LocationKind.AREA, lat=21.58780, lng=105.80370)
        ensure_location("Cổng chính", "CONG-CHINH", LocationKind.AREA, lat=21.58590, lng=105.80740)
        ensure_location("Nhà xe", "NHA-XE", LocationKind.AREA, lat=21.58690, lng=105.80680)

        # Không tạo tài khoản hay sự cố giả. Dữ liệu mới phải đến từ người dùng
        # đã xác minh OTP; chỉ ADMIN là tài khoản bootstrap cố định.
        legacy_emails = {
            "dispatcher.demo@gmail.com",
            "kythuat1@ictu.edu.vn",
            "kythuat2@ictu.edu.vn",
            "dtc225210001@ictu.edu.vn",
            "giangvien.demo@ictu.edu.vn",
        }
        legacy_users = db.scalars(
            select(User).where(
                User.email.like("%@campuscare.example.com")
                | User.email.like("%@campuscare.local")
                | User.email.in_(legacy_emails)
            )
        )
        for legacy_user in legacy_users:
            legacy_user.is_active = False
            # Dùng miền hợp lệ về cú pháp để Pydantic vẫn tuần tự hóa được reporter
            # trong lịch sử sự cố, nhưng tài khoản đã khóa và không thể đăng nhập.
            legacy_user.email = f"archived.{legacy_user.id.hex}@archive.campuscare.vn"
        db.commit()
        qr_output = os.getenv("QR_OUTPUT_DIR", "/app/generated_qr")
        os.makedirs(qr_output, exist_ok=True)
        for room in rooms[:3]:
            qr_payload = json.dumps({"type": "campuscare-location", "token": room.qr_token})
            qrcode.make(qr_payload).get_image().save(
                os.path.join(qr_output, f"{room.code}.png"), format="PNG"
            )
        print("Đã tạo/cập nhật dữ liệu nền CampusCare.")


if __name__ == "__main__":
    seed()
