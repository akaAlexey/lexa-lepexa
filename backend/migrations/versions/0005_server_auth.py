"""Серверная авторизация: логин по email/телефону и таблица HttpOnly-сессий."""

import sqlalchemy as sa
from alembic import op

revision = "0005_server_auth"
down_revision = "0004_needs_coordinates"
branch_labels = None
depends_on = None


def upgrade():
    # Регистрация поддерживает либо email, либо телефон.
    op.alter_column("users", "email", existing_type=sa.String(255), nullable=True)
    op.create_unique_constraint("uq_users_phone", "users", ["phone"])
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(50),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_token_hash", "auth_sessions", ["token_hash"], unique=True)
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])


def downgrade():
    op.drop_index("ix_auth_sessions_expires_at", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_token_hash", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_constraint("uq_users_phone", "users", type_="unique")
    op.alter_column("users", "email", existing_type=sa.String(255), nullable=False)
