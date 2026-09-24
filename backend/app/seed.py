import asyncio
from datetime import date
from app.main import Session,Grave,Battle,Team
async def main():
    async with Session() as s:
        s.add_all([
            Grave(id="G001",lat=53.02005,lon=35.74399,full_name="Попов Б.Г.",unit="283-я стрелковая дивизия",demo=True),
            Grave(id="G002",lat=52.79687,lon=36.07694,full_name="Киселёв М.П.",unit="10-я вдбр, 5-й ВДК",demo=True),
            Battle(id="B01",date=date(1941,10,3),text="Демо-текст. Бой на подступах к Орлу.",archive_url="https://pamyat-naroda.ru/",place_name="Орёл",lat=52.9651,lon=36.0785,demo=True),
            Team(id="T01",name="Высота",region="Орловская обл.",budget_goal_rub=50000,budget_collected_rub=15000,found_this_month=7,demo=True),
            Team(id="T02",name="Поиск-Орёл",region="Орловская обл.",budget_goal_rub=80000,budget_collected_rub=32000,found_this_month=4,demo=True)
        ])
        await s.commit()
asyncio.run(main())
