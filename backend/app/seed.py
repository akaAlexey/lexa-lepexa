"""Демо-данные — те же, что в демо фронтенда (frontend/src/api/fixtures/seed.ts).

Повторный запуск безопасен: добавляются только записи, которых ещё нет, изменения пользователей не затираются.
"""
import asyncio
from datetime import date, datetime, timezone
from app.main import Session,Grave,Battle,Team,Site

BOOK_OF_MEMORY_5={"kind":"book_of_memory","title":"Книга Памяти. Орловская область, т. 5","url":"http://library.gu-unpk.ru/9_mai_2010/kniga_pamyati.php"}
DEMO_TEXT={"kind":"demo","title":"Демо-текст прототипа, требует проверки краеведом"}

def rows():
    return [
        Team(id="T01",name="Высота",region="Орловская обл.",budget_goal_rub=50000,budget_collected_rub=15000,found_this_month=7,demo=True),
        Team(id="T02",name="Поиск-Орёл",region="Орловская обл.",budget_goal_rub=80000,budget_collected_rub=32000,found_this_month=4,demo=True),
        Team(id="T03",name="Десант",region="Мценский р-н",budget_goal_rub=40000,budget_collected_rub=9000,found_this_month=3,demo=True),
        Team(id="T04",name="Кромы",region="Кромской р-н",budget_goal_rub=30000,budget_collected_rub=21000,found_this_month=2,demo=True),
        Team(id="T05",name="Память Оки",region="Орловская обл.",budget_goal_rub=60000,budget_collected_rub=12500,found_this_month=5,demo=True),
        Grave(id="G001",lat=53.02005,lon=35.74399,full_name="Попов Б.Г.",unit="283-я стрелковая дивизия",demo=True),
        Grave(id="G002",lat=52.79687,lon=36.07694,full_name="Киселёв М.П.",unit="10-я вдбр, 5-й ВДК",demo=True),
        Battle(id="B01",date=date(1941,10,3),text="Демо-текст. Бой на подступах к Орлу.",archive_url="https://pamyat-naroda.ru/",place_name="Орёл",lat=52.9651,lon=36.0785,demo=True),
        Site(id="S01",lat=52.74,lon=35.84,place_name="Овраг у д. Крупышино",fighters_count=1,fighters=[{"fullName":"Иванов И.И.","rank":"Красноармеец"}],unit="Неизвестно",date_text="1943",circumstances="Требуется подъём. Пример карточки из прототипа кейса.",status="found_needs_check",sources=[BOOK_OF_MEMORY_5],team_id=None,volunteers_ready=3,created_at=datetime(2026,9,10,12,tzinfo=timezone.utc),demo=True),
        Site(id="S02",lat=53.21,lon=36.45,place_name="Опушка у д. Первый Воин",fighters_count=2,fighters=[{},{}],unit="201-я вдбр, 5-й ВДК",date_text="октябрь 1941",circumstances="Место указано по рассказу местных жителей, сверено с донесением.",status="archive_confirmed",sources=[{"kind":"eyewitness","title":"Рассказ местных жителей (демо)"},DEMO_TEXT],team_id="T03",volunteers_ready=6,created_at=datetime(2026,8,28,12,tzinfo=timezone.utc),demo=True),
        Site(id="S03",lat=52.9,lon=36.25,place_name="Поле у д. Становой Колодезь",fighters_count=4,fighters=[{},{},{},{}],unit="Неизвестно",date_text="июль 1943",circumstances="Останки подняты и перезахоронены.",status="remains_raised",sources=[DEMO_TEXT],team_id="T02",volunteers_ready=0,created_at=datetime(2026,7,15,12,tzinfo=timezone.utc),demo=True),
    ]

async def main():
    async with Session() as s:
        for row in rows():
            if await s.get(type(row),row.id) is None:
                s.add(row)
                await s.flush()  # команды — раньше мест, которые на них ссылаются
        await s.commit()

if __name__=="__main__":
    asyncio.run(main())
