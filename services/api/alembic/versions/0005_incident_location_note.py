"""Allow a free-form incident location note for outdoor areas."""

from alembic import op
import sqlalchemy as sa

revision = "0005_incident_location_note"
down_revision = "0004_user_device_location"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("incidents", sa.Column("location_note", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("incidents", "location_note")
