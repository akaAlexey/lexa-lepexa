from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography

revision = "0002_full_domain_schema"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    # The existing P0 notification table is extended into the full-domain
    # notification model instead of creating a second notification table.
    op.add_column("notifications", sa.Column("user_id", sa.String(50), nullable=True))
    op.add_column("notifications", sa.Column("type", sa.String(50), nullable=True))
    op.add_column("notifications", sa.Column("message", sa.Text(), nullable=True))
    op.add_column("notifications", sa.Column("data", sa.JSON(), nullable=True))
    op.add_column("notifications", sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("notifications", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "users",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("first_name", sa.String(100)),
        sa.Column("last_name", sa.String(100)),
        sa.Column("phone", sa.String(30)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    # Add the FK after users exists.
    op.create_foreign_key("fk_notifications_user_id_users", "notifications", "users", ["user_id"], ["id"])

    op.create_table(
        "roles",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
    )
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("role_id", sa.String(50), sa.ForeignKey("roles.id"), primary_key=True),
    )
    op.create_table(
        "historical_points",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("event_date", sa.Date()),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("created_by", sa.String(50), sa.ForeignKey("users.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "historical_sources",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("source_type", sa.String(100), nullable=False),
        sa.Column("author", sa.String(255)),
        sa.Column("publication_date", sa.Date()),
        sa.Column("url", sa.Text()),
        sa.Column("archive_name", sa.String(255)),
        sa.Column("document_number", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "historical_point_sources",
        sa.Column("historical_point_id", sa.String(50), sa.ForeignKey("historical_points.id"), primary_key=True),
        sa.Column("source_id", sa.String(50), sa.ForeignKey("historical_sources.id"), primary_key=True),
    )
    op.create_table(
        "historical_submissions",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("submitted_by", sa.String(50), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("event_date", sa.Date()),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "submission_reviews",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("submission_id", sa.String(50), sa.ForeignKey("historical_submissions.id"), nullable=False),
        sa.Column("reviewer_id", sa.String(50), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("comment", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "soldiers",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("middle_name", sa.String(100)),
        sa.Column("birth_date", sa.Date()),
        sa.Column("birth_place", sa.Text()),
        sa.Column("military_unit", sa.String(255)),
        sa.Column("rank", sa.String(100)),
        sa.Column("status", sa.String(100)),
        sa.Column("external_id", sa.String(255)),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "last_battle_cases",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("source_description", sa.Text()),
        sa.Column("created_by", sa.String(50), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("verified_by", sa.String(50), sa.ForeignKey("users.id")),
        sa.Column("verified_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "last_battle_soldiers",
        sa.Column("last_battle_case_id", sa.String(50), sa.ForeignKey("last_battle_cases.id"), primary_key=True),
        sa.Column("soldier_id", sa.String(50), sa.ForeignKey("soldiers.id"), primary_key=True),
    )
    op.create_table(
        "last_battle_status_history",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("case_id", sa.String(50), sa.ForeignKey("last_battle_cases.id"), nullable=False),
        sa.Column("old_status", sa.String(50)),
        sa.Column("new_status", sa.String(50), nullable=False),
        sa.Column("changed_by", sa.String(50), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("comment", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "search_teams",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("region", sa.String(255)),
        sa.Column("contact_email", sa.String(255)),
        sa.Column("contact_phone", sa.String(30)),
        sa.Column("website", sa.Text()),
        sa.Column("created_by", sa.String(50), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "search_team_members",
        sa.Column("team_id", sa.String(50), sa.ForeignKey("search_teams.id"), primary_key=True),
        sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("role", sa.String(100)),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "team_needs",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("team_id", sa.String(50), sa.ForeignKey("search_teams.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("quantity", sa.Integer()),
        sa.Column("amount_required", sa.Float()),
        sa.Column("amount_collected", sa.Float(), server_default="0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "routes",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("region", sa.String(255)),
        sa.Column("distance_km", sa.Float()),
        sa.Column("duration_minutes", sa.Integer()),
        sa.Column("difficulty", sa.String(50)),
        sa.Column("created_by", sa.String(50), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "route_points",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("route_id", sa.String(50), sa.ForeignKey("routes.id"), nullable=False),
        sa.Column("historical_point_id", sa.String(50), sa.ForeignKey("historical_points.id"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("quest_text", sa.Text()),
        sa.Column("audio_url", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "user_route_progress",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("route_id", sa.String(50), sa.ForeignKey("routes.id"), nullable=False),
        sa.Column("route_point_id", sa.String(50), sa.ForeignKey("route_points.id"), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "volunteer_events",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("team_id", sa.String(50), sa.ForeignKey("search_teams.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_participants", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "volunteer_event_participants",
        sa.Column("event_id", sa.String(50), sa.ForeignKey("volunteer_events.id"), primary_key=True),
        sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="REGISTERED"),
    )
    op.create_table(
        "fundraising_campaigns",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("team_id", sa.String(50), sa.ForeignKey("search_teams.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("target_amount", sa.Float(), nullable=False),
        sa.Column("collected_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(50), nullable=False, server_default="OPEN"),
        sa.Column("deadline", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "donations",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("campaign_id", sa.String(50), sa.ForeignKey("fundraising_campaigns.id"), nullable=False),
        sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id")),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="RUB"),
        sa.Column("payment_provider", sa.String(50)),
        sa.Column("payment_id", sa.String(255)),
        sa.Column("status", sa.String(50), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "media",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("uploaded_by", sa.String(50), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("file_type", sa.String(50)),
        sa.Column("mime_type", sa.String(100)),
        sa.Column("title", sa.String(255)),
        sa.Column("description", sa.Text()),
        sa.Column("size_bytes", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("user_id", sa.String(50), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(50), nullable=False),
        sa.Column("old_values", sa.JSON()),
        sa.Column("new_values", sa.JSON()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    for table in ("historical_points", "historical_submissions", "last_battle_cases", "volunteer_events"):
        op.create_index(f"ix_{table}_location", table, ["location"], postgresql_using="gist")
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_historical_points_status", "historical_points", ["status"])
    op.create_index("ix_last_battle_cases_status", "last_battle_cases", ["status"])
    op.create_index("ix_team_needs_team_id_status", "team_needs", ["team_id", "status"])
    op.create_index("ix_routes_region", "routes", ["region"])
    op.create_index("ix_donations_campaign_id", "donations", ["campaign_id"])


def downgrade():
    op.drop_constraint("fk_notifications_user_id_users", "notifications", type_="foreignkey")
    op.drop_column("notifications", "read_at")
    op.drop_column("notifications", "is_read")
    op.drop_column("notifications", "data")
    op.drop_column("notifications", "message")
    op.drop_column("notifications", "type")
    op.drop_column("notifications", "user_id")

    for table in (
        "audit_logs",
        "media",
        "donations",
        "fundraising_campaigns",
        "volunteer_event_participants",
        "volunteer_events",
        "user_route_progress",
        "route_points",
        "routes",
        "team_needs",
        "search_team_members",
        "search_teams",
        "last_battle_status_history",
        "last_battle_soldiers",
        "last_battle_cases",
        "soldiers",
        "submission_reviews",
        "historical_submissions",
        "historical_point_sources",
        "historical_sources",
        "historical_points",
        "user_roles",
        "roles",
        "users",
    ):
        op.drop_table(table)

