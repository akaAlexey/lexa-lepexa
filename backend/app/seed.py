import asyncio
from datetime import date

from app.main import Session, Grave, Battle, Team


async def main():
    async with Session() as s:
        existing_team_ids = set((await s.execute(Team.__table__.select())).scalars().all())
        existing_grave_ids = set((await s.execute(Grave.__table__.select())).scalars().all())
        existing_battle_ids = set((await s.execute(Battle.__table__.select())).scalars().all())

        rows = []

        if "G001" not in existing_grave_ids:
            rows.append(Grave(
                id="G001", lat=53.02005, lon=35.74399,
                full_name="Попов Б.Г.", unit="283-я стрелковая дивизия", demo=True,
            ))
        if "G002" not in existing_grave_ids:
            rows.append(Grave(
                id="G002", lat=52.79687, lon=36.07694,
                full_name="Киселёв М.П.", unit="10-я вдбр, 5-й ВДК", demo=True,
            ))
        if "B01" not in existing_battle_ids:
            rows.append(Battle(
                id="B01", date=date(1941, 10, 3),
                text="Демо-текст. Бой на подступах к Орлу.",
                archive_url="https://pamyat-naroda.ru/",
                place_name="Орёл", lat=52.9651, lon=36.0785, demo=True,
            ))
        if "T01" not in existing_team_ids:
            rows.append(Team(
                id="T01", name="Высота", region="Орловская обл.",
                budget_goal_rub=50000, budget_collected_rub=15000,
                found_this_month=7, demo=True,
            ))
        if "T02" not in existing_team_ids:
            rows.append(Team(
                id="T02", name="Поиск-Орёл", region="Орловская обл.",
                budget_goal_rub=80000, budget_collected_rub=32000,
                found_this_month=4, demo=True,
            ))

        if rows:
            s.add_all(rows)
            await s.commit()


if __name__ == "__main__":
    asyncio.run(main())
