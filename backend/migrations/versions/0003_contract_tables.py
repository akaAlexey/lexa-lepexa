"""Таблицы для разделов фронта, которых не было на сервере: тропа, штаб, выезды, коллективные заявки, архив.

Имена не пересекаются с целевой схемой 0002 (routes, donations, …): это слой совместимости
с контрактом фронта, как и таблицы 0001.
"""

import sqlalchemy as sa
from alembic import op

revision = "0003_contract_tables"
down_revision = "0002_full_domain_schema"
branch_labels = None
depends_on = None

S = sa.String
TS = sa.DateTime(timezone=True)


def upgrade():
    op.create_table(
        "trail_routes",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("title", S(255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("length_m", sa.Integer(), nullable=False),
        sa.Column("duration_min", sa.Integer(), nullable=False),
        sa.Column("path", sa.JSON(), nullable=False),
        sa.Column("demo", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "trail_points",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("route_id", S(50), sa.ForeignKey("trail_routes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("kind", S(20), nullable=False),
        sa.Column("title", S(255), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("story", sa.Text(), nullable=False),
        sa.Column("task", sa.JSON(), nullable=False),
        sa.Column("sources", sa.JSON(), nullable=False),
    )
    op.create_index("ix_trail_points_route_id", "trail_points", ["route_id"])

    op.create_table(
        "volunteer_requests",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("team_id", S(50), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("title", S(255), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("place", S(255), nullable=False),
        sa.Column("roles", sa.JSON(), nullable=False),
        sa.Column("joined", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fundraiser_id", S(50)),
        sa.Column("created_at", TS, nullable=False),
        sa.Column("demo", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_volunteer_requests_team_id", "volunteer_requests", ["team_id"])
    op.create_table(
        "volunteer_request_joins",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("request_id", S(50), sa.ForeignKey("volunteer_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_key", S(255), nullable=False),
        sa.Column("created_at", TS, nullable=False),
    )
    op.create_index("ix_volunteer_request_joins_request_id", "volunteer_request_joins", ["request_id"])

    op.create_table(
        "fundraisers",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("team_id", S(50), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("purpose", S(20), nullable=False),
        sa.Column("title", S(255), nullable=False),
        sa.Column("goal_rub", sa.Integer(), nullable=False),
        sa.Column("collected_rub", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("demo", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_fundraisers_team_id", "fundraisers", ["team_id"])
    op.create_table(
        "fundraiser_donations",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("fundraiser_id", S(50), sa.ForeignKey("fundraisers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount_rub", sa.Integer(), nullable=False),
        sa.Column("status", S(30), nullable=False),
        sa.Column("user_key", S(255), nullable=False),
        sa.Column("created_at", TS, nullable=False),
    )
    op.create_index("ix_fundraiser_donations_fundraiser_id", "fundraiser_donations", ["fundraiser_id"])

    op.create_table(
        "trips",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("team_id", S(50), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("title", S(255), nullable=False),
        sa.Column("place", S(255), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("spots_total", sa.Integer(), nullable=False),
        sa.Column("spots_taken", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("checklist", sa.JSON(), nullable=False),
        sa.Column("demo", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_trips_team_id", "trips", ["team_id"])
    op.create_table(
        "trip_registrations",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("trip_id", S(50), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_key", S(255), nullable=False),
        sa.Column("created_at", TS, nullable=False),
    )
    op.create_index("ix_trip_registrations_trip_id", "trip_registrations", ["trip_id"])
    op.create_table(
        "group_applications",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("trip_id", S(50), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization", S(255), nullable=False),
        sa.Column("contact_name", S(255), nullable=False),
        sa.Column("contact", S(255), nullable=False),
        sa.Column("people_count", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", S(20), nullable=False),
        sa.Column("created_at", TS, nullable=False),
        sa.Column("demo", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_group_applications_trip_id", "group_applications", ["trip_id"])

    op.create_table(
        "archive_stories",
        sa.Column("id", S(50), primary_key=True),
        sa.Column("title", S(255), nullable=False),
        sa.Column("place", S(255), nullable=False),
        sa.Column("story", sa.Text(), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("author", S(255), nullable=False),
        sa.Column("status", S(20), nullable=False),
        sa.Column("verified_by", S(255)),
        sa.Column("review_note", sa.Text()),
        sa.Column("created_at", TS, nullable=False),
        sa.Column("demo", sa.Boolean(), nullable=False),
    )

    # Поток уведомлений выбирает новые записи пользователя по времени.
    op.create_index("ix_notifications_user_key_created_at", "notifications", ["user_key", "created_at"])


def downgrade():
    op.drop_index("ix_notifications_user_key_created_at", table_name="notifications")
    for table in (
        "archive_stories",
        "group_applications",
        "trip_registrations",
        "trips",
        "fundraiser_donations",
        "fundraisers",
        "volunteer_request_joins",
        "volunteer_requests",
        "trail_points",
        "trail_routes",
    ):
        op.drop_table(table)
