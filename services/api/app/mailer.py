import smtplib
from email.message import EmailMessage

from app.config import get_settings


def send_registration_otp(recipient: str, code: str) -> None:
    settings = get_settings()
    if not settings.smtp_host:
        raise RuntimeError("Máy chủ gửi email OTP chưa được cấu hình")
    message = EmailMessage()
    message["Subject"] = "Mã OTP đăng ký CampusCare"
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(
        f"Mã OTP CampusCare của bạn là: {code}\n"
        f"Mã có hiệu lực trong {settings.otp_expire_minutes} phút. "
        "Không chia sẻ mã này với người khác."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_starttls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
