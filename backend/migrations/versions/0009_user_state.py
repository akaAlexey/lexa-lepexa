"""Личное состояние аккаунта (user_state): профиль, «мои» записи, прогресс — одно на все устройства."""

import sqlalchemy as sa
from alembic import op

revision = "0009_user_state"
down_revision = "0008_family_archive"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_state",
        sa.Column(
            "user_id",
            sa.String(50),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.JSON),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("user_state")
