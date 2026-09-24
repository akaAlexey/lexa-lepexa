import asyncio
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context
from app.main import Base,settings
config=context.config
config.set_main_option("sqlalchemy.url",settings.database_url)
target_metadata=Base.metadata
def run(c):
    context.configure(connection=c,target_metadata=target_metadata)
    with context.begin_transaction(): context.run_migrations()
async def main():
    e=async_engine_from_config(config.get_section(config.config_ini_section),prefix="sqlalchemy.",poolclass=pool.NullPool)
    async with e.connect() as c: await c.run_sync(run)
    await e.dispose()
if context.is_offline_mode():
    context.configure(url=settings.database_url,target_metadata=target_metadata);context.run_migrations()
else: asyncio.run(main())
