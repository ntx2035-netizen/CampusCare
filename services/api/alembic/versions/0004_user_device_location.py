"""Store the latest consented device location for each user.

Revision ID: 0004_user_device_location
Revises: 0003_fix_archived_user_emails
"""

import sqlalchemy as sa

from alembic import op

revision = "0004_user_device_location"
down_revision = "0003_fix_archived_user_emails"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("current_latitude", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("current_longitude", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("location_accuracy", sa.Float(), nullable=True))
    op.add_column(
        "users",
        sa.Column("location_updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "location_updated_at")
    op.drop_column("users", "location_accuracy")
    op.drop_column("users", "current_longitude")
    op.drop_column("users", "current_latitude")
