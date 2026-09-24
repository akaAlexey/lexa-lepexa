from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography
revision="0001_initial";down_revision=None;branch_labels=None;depends_on=None
def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    S=sa.String;D=sa.DateTime(timezone=True)
    op.create_table("teams",sa.Column("id",S(50),primary_key=True),sa.Column("name",S(255)),sa.Column("region",S(255)),sa.Column("budget_goal_rub",sa.Integer),sa.Column("budget_collected_rub",sa.Integer),sa.Column("found_this_month",sa.Integer),sa.Column("demo",sa.Boolean))
    op.create_table("graves",sa.Column("id",S(50),primary_key=True),sa.Column("lat",sa.Float),sa.Column("lon",sa.Float),sa.Column("full_name",S(255)),sa.Column("unit",S(255)),sa.Column("demo",sa.Boolean),sa.Column("location",Geography(geometry_type="POINT",srid=4326)))
    op.create_table("battles",sa.Column("id",S(50),primary_key=True),sa.Column("date",sa.Date),sa.Column("text",sa.Text),sa.Column("archive_url",sa.Text),sa.Column("place_name",S(255)),sa.Column("lat",sa.Float),sa.Column("lon",sa.Float),sa.Column("demo",sa.Boolean),sa.Column("location",Geography(geometry_type="POINT",srid=4326)))
    op.create_table("last_battle_sites",sa.Column("id",S(50),primary_key=True),sa.Column("lat",sa.Float),sa.Column("lon",sa.Float),sa.Column("place_name",S(255)),sa.Column("fighters_count",sa.Integer),sa.Column("fighters",sa.JSON),sa.Column("unit",S(255)),sa.Column("date_text",S(255)),sa.Column("circumstances",sa.Text),sa.Column("status",S(50)),sa.Column("sources",sa.JSON),sa.Column("team_id",S(50),sa.ForeignKey("teams.id")),sa.Column("volunteers_ready",sa.Integer),sa.Column("created_at",D),sa.Column("demo",sa.Boolean),sa.Column("location",Geography(geometry_type="POINT",srid=4326)))
    op.create_table("subscriptions",sa.Column("id",S(50),primary_key=True),sa.Column("lat",sa.Float),sa.Column("lon",sa.Float),sa.Column("radius_km",sa.Float),sa.Column("topics",sa.JSON),sa.Column("team_id",S(50)),sa.Column("user_key",S(255)),sa.Column("location",Geography(geometry_type="POINT",srid=4326)))
    op.create_table("notifications",sa.Column("id",S(50),primary_key=True),sa.Column("kind",S(50)),sa.Column("site_id",S(50),sa.ForeignKey("last_battle_sites.id")),sa.Column("user_key",S(255)),sa.Column("distance_km",sa.Float),sa.Column("title",S(255)),sa.Column("body",sa.Text),sa.Column("created_at",D))
    for t in ["graves","battles","last_battle_sites","subscriptions"]: op.create_index("ix_"+t+"_location",t,["location"],postgresql_using="gist")
def downgrade():
    for t in ["notifications","subscriptions","last_battle_sites","battles","graves","teams"]: op.drop_table(t)
