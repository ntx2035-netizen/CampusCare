"""Account classification and registration OTP.

Revision ID: 0002_account_otp
Revises: 0001_initial
"""

import sqlalchemy as sa

from alembic import op

revision = "0002_account_otp"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("account_type", sa.String(10), nullable=True))
    op.add_column(
        "users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true())
    )
    op.add_column("users", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE users SET account_type = role")
    op.execute("UPDATE users SET approved_at = CURRENT_TIMESTAMP WHERE role = 'DISPATCHER'")
    op.alter_column("users", "account_type", nullable=False)
    op.create_index("ix_users_account_type", "users", ["account_type"])
    op.create_table(
        "registration_otps",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("account_type", sa.String(10), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_registration_otps_email", "registration_otps", ["email"])
    op.create_index("ix_registration_otps_account_type", "registration_otps", ["account_type"])
    op.create_index("ix_registration_otps_expires_at", "registration_otps", ["expires_at"])


def downgrade() -> None:
    op.drop_table("registration_otps")
    op.drop_index("ix_users_account_type", table_name="users")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "approved_at")
    op.drop_column("users", "account_type")
