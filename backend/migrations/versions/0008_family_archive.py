"""Семейный архив (A7): бойцы семьи пользователя и найденные записи в официальных базах."""

import sqlalchemy as sa
from alembic import op

revision = "0008_family_archive"
down_revision = "0007_story_photos"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "family_fighters",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(50),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("last_name", sa.String(60), nullable=False),
        sa.Column("first_name", sa.String(60), nullable=False, server_default=""),
        sa.Column("middle_name", sa.String(60), nullable=False, server_default=""),
        sa.Column("birth_year", sa.Integer),
        sa.Column("relation", sa.String(60), nullable=False, server_default=""),
        sa.Column("note", sa.Text, nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_family_fighters_user_id", "family_fighters", ["user_id"])
    op.create_table(
        "family_records",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column(
            "fighter_id",
            sa.String(50),
            sa.ForeignKey("family_fighters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("fighter_id", "url", name="uq_family_records_fighter_url"),
    )
    op.create_index("ix_family_records_fighter_id", "family_records", ["fighter_id"])


def downgrade():
    op.drop_index("ix_family_records_fighter_id", table_name="family_records")
    op.drop_table("family_records")
    op.drop_index("ix_family_fighters_user_id", table_name="family_fighters")
    op.drop_table("family_fighters")
