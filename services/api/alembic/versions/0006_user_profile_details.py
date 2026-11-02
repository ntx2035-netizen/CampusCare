"""Add optional personal details for students and staff."""

from alembic import op
import sqlalchemy as sa

revision = "0006_user_profile_details"
down_revision = "0005_incident_location_note"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("temporary_residence", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("student_cohort", sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "student_cohort")
    op.drop_column("users", "temporary_residence")
    op.drop_column("users", "date_of_birth")
