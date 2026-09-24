"""Координаты у заявок и сборов — для карты потребностей отрядов (задача 3 кейса).

Поля необязательные: заявка без координат просто не попадает на карту.
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_needs_coordinates"
down_revision = "0003_contract_tables"
branch_labels = None
depends_on = None

TABLES = ("volunteer_requests", "fundraisers")


def upgrade():
    for table in TABLES:
        op.add_column(table, sa.Column("lat", sa.Float(), nullable=True))
        op.add_column(table, sa.Column("lon", sa.Float(), nullable=True))


def downgrade():
    for table in TABLES:
        op.drop_column(table, "lon")
        op.drop_column(table, "lat")
