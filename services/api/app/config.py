from functools import lru_cache
from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CampusCare API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://campuscare:campuscare@localhost:5432/campuscare"
    redis_url: str = "redis://localhost:6379/0"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "campuscare"
    minio_secret_key: str = "campuscare-development"
    minio_bucket: str = "campuscare-images"
    minio_secure: bool = False
    jwt_secret: str = "development-only-secret-change-me-please"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost",
        "http://localhost:8081",
        "http://localhost:5173",
    ]
    max_upload_bytes: int = 8 * 1024 * 1024
    login_rate_limit: int = 10
    upload_rate_limit: int = 30
    school_email_domains: Annotated[list[str], NoDecode] = ["ictu.edu.vn"]
    dispatcher_email_domains: Annotated[list[str], NoDecode] = ["gmail.com"]
    otp_expire_minutes: int = 10
    smtp_host: str = ""
    smtp_port: int = 1025
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "CampusCare <no-reply@campuscare.local>"
    smtp_starttls: bool = False
    campus_center_latitude: float = 21.5862035
    campus_center_longitude: float = 105.8063499
    campus_radius_meters: int = 2500

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("school_email_domains", mode="before")
    @classmethod
    def split_school_domains(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip().lower() for item in value.split(",") if item.strip()]
        return value

    @field_validator("dispatcher_email_domains", mode="before")
    @classmethod
    def split_dispatcher_domains(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip().lower() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def reject_insecure_production_defaults(self):
        if self.environment == "production":
            weak_jwt = self.jwt_secret in {
                "development-only-secret-change-me-please",
                "change-this-development-secret-at-least-32-characters",
            }
            if weak_jwt or len(self.jwt_secret) < 32:
                raise ValueError(
                    "JWT_SECRET production phải là chuỗi ngẫu nhiên tối thiểu 32 ký tự"
                )
            weak_minio = self.minio_secret_key in {
                "campuscare",
                "campuscare-development",
                "CampusCare_MinIO_2026!",
            }
            if weak_minio:
                raise ValueError("MINIO_SECRET_KEY production không được dùng giá trị demo")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
