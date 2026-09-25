"""Архивные снимки к историям (фото из открытых источников с подписью и лицензией).

Поле необязательное: у истории может не быть снимков.
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_story_photos"
down_revision = "0004_needs_coordinates"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("archive_stories", sa.Column("photos", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("archive_stories", "photos")
