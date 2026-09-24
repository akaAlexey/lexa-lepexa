import asyncio
from datetime import date
from app.main import Session,Grave,Battle,Team


async def main():
    async with Session() as s:
        existing_team_ids = set((await s.execute(Team.__table__.select().with_only_columns(Team.id))).scalars().all())
        existing_grave_ids = set((await s.execute(Grave.__table__.select().with_only_columns(Grave.id))).scalars().all())
        existing_battle_ids = set((await s.execute(Battle.__table__.select().with_only_columns(Battle.id))).scalars().all())

        teams = [
            Team(id="T01",name="Высота",region="Орловская обл.",budget_goal_rub=50000,budget_collected_rub=15000,found_this_month=7,demo=True),
            Team(id="T02",name="Поиск-Орёл",region="Орловская обл.",budget_goal_rub=80000,budget_collected_rub=32000,found_this_month=4,demo=True),
        ]
        graves = [
            Grave(id="G001",lat=53.02005,lon=35.74399,full_name="Попов Б.Г.",unit="283-я стрелковая дивизия",demo=True),
            Grave(id="G002",lat=52.79687,lon=36.07694,full_name="Киселёв М.П.",unit="10-я вдбр, 5-й ВДК",demo=True),
        ]
        battles = [
            Battle(id="B01",date=date(1941,10,3),text="Демо-текст. Бой на подступах к Орлу.",archive_url="https://pamyat-naroda.ru/",place_name="Орёл",lat=52.9651,lon=36.0785,demo=True),
        ]

        s.add_all([x for x in teams if x.id not in existing_team_ids])
        s.add_all([x for x in graves if x.id not in existing_grave_ids])
        s.add_all([x for x in battles if x.id not in existing_battle_ids])
        await s.commit()


asyncio.run(main())
