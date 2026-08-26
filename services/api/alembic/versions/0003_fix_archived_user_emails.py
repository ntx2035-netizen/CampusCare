"""Normalize archived user emails for response validation.

Revision ID: 0003_fix_archived_user_emails
Revises: 0002_account_otp
"""

import sqlalchemy as sa

from alembic import op

revision = "0003_fix_archived_user_emails"
down_revision = "0002_account_otp"
branch_labels = None
depends_on = None


def _replace_emails(source_pattern: str, target_template: str) -> None:
    connection = op.get_bind()
    rows = connection.execute(
        sa.text("SELECT id, email FROM users WHERE email LIKE :pattern"),
        {"pattern": source_pattern},
    )
    for row in rows:
        user_id = str(row.id)
        email = target_template.format(id=user_id.replace("-", ""))
        connection.execute(
            sa.text("UPDATE users SET email = :email WHERE email = :old_email"),
            {"email": email, "old_email": row.email},
        )


def upgrade() -> None:
    _replace_emails(
        "archived-%@invalid.local",
        "archived.{id}@archive.campuscare.vn",
    )


def downgrade() -> None:
    _replace_emails(
        "archived.%@archive.campuscare.vn",
        "archived-{id}@invalid.local",
    )
