"""Платежи ЮKassa (тестовый магазин): наш id, id ЮKassa, сумма, сбор, статус, отметка о зачислении."""

import sqlalchemy as sa
from alembic import op

revision = "0006_yookassa_payments"
down_revision = "0005_server_auth"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "yookassa_payments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("yookassa_id", sa.String(50), unique=True),
        sa.Column(
            "fundraiser_id",
            sa.String(50),
            sa.ForeignKey("fundraisers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount_rub", sa.Integer, nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("credited_at", sa.DateTime(timezone=True)),
        sa.Column("user_key", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_yookassa_payments_fundraiser_id", "yookassa_payments", ["fundraiser_id"])


def downgrade():
    op.drop_index("ix_yookassa_payments_fundraiser_id", table_name="yookassa_payments")
    op.drop_table("yookassa_payments")
