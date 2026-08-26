import json
import os

from app.config import get_settings
from app.database import SessionLocal
from app.maintenance import clear_operational_data
from app.storage import storage

CONFIRMATION = "DELETE_ALL_NON_ADMIN_DATA"
ADMIN_EMAIL = "ntx2035@gmail.com"


def main() -> None:
    settings = get_settings()
    if settings.environment != "development":
        raise RuntimeError("Chỉ cho phép dọn dữ liệu bằng lệnh này trong development")
    if os.getenv("CONFIRM_RESET_DATA") != CONFIRMATION:
        raise RuntimeError("Thiếu xác nhận dọn dữ liệu")

    with SessionLocal() as db:
        summary = clear_operational_data(
            db,
            ADMIN_EMAIL,
            remove_image=lambda name: storage.client.remove_object(storage.bucket, name),
        )
    print(
        json.dumps(
            {
                "status": "clean",
                "deleted": {
                    "incidents": summary["incidents"],
                    "images": summary["images"],
                    "non_admin_users": summary["non_admin_users"],
                },
                "kept": {
                    "admin": ADMIN_EMAIL,
                    "categories": summary["categories_kept"],
                    "locations": summary["locations_kept"],
                },
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
