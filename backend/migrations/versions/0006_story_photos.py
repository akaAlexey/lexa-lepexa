"""Архивные снимки к историям (фото из открытых источников с подписью и лицензией).

Поле необязательное: у истории может не быть снимков.
"""

import sqlalchemy as sa
from alembic import op

revision = "0006_story_photos"
down_revision = "0005_server_auth"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("archive_stories", sa.Column("photos", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("archive_stories", "photos")
