import io
import uuid

from minio import Minio

from app.config import get_settings


class ObjectStorage:
    def __init__(self) -> None:
        settings = get_settings()
        self.bucket = settings.minio_bucket
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    def ensure_bucket(self) -> None:
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def put(self, incident_id: uuid.UUID, data: bytes, content_type: str) -> str:
        extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[content_type]
        object_name = f"incidents/{incident_id}/{uuid.uuid4().hex}{extension}"
        self.ensure_bucket()
        self.client.put_object(
            self.bucket,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return object_name

    def get(self, object_name: str):
        return self.client.get_object(self.bucket, object_name)


storage = ObjectStorage()
