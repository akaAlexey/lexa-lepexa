from copy import deepcopy
from datetime import date,datetime,timezone
from uuid import uuid4
import asyncio,json,math
from fastapi import FastAPI,APIRouter,Depends,Header,HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel,ConfigDict,Field,AliasChoices
from pydantic_settings import BaseSettings,SettingsConfigDict
from sqlalchemy import String,Text,Integer,Float,Boolean,Date,DateTime,JSON,ForeignKey,select,func
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column

class Settings(BaseSettings):
    database_url:str="postgresql+asyncpg://postgres:postgres@localhost:5432/memory_trail"
    cors_origins:str="http://localhost:3000,http://localhost:5173,https://akalexey.github.io"
    model_config=SettingsConfigDict(env_file=".env",extra="ignore")
settings=Settings()
engine=create_async_engine(settings.database_url,pool_pre_ping=True)
Session=async_sessionmaker(engine,expire_on_commit=False)
async def db():
    async with Session() as s: yield s
class Base(DeclarativeBase): pass
def now(): return datetime.now(timezone.utc)
def gid(p): return p+"_"+uuid4().hex[:10]

EARTH_RADIUS_KM = 6371.0088

def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

class Team(Base):
    __tablename__="teams"
    id:Mapped[str]=mapped_column(String(50),primary_key=True)
    name:Mapped[str]=mapped_column(String(255));region:Mapped[str]=mapped_column(String(255))
    budget_goal_rub:Mapped[int]=mapped_column(Integer);budget_collected_rub:Mapped[int]=mapped_column(Integer)
    found_this_month:Mapped[int]=mapped_column(Integer);demo:Mapped[bool]=mapped_column(Boolean)
class Grave(Base):
    __tablename__="graves"
    id:Mapped[str]=mapped_column(String(50),primary_key=True);lat:Mapped[float]=mapped_column(Float);lon:Mapped[float]=mapped_column(Float)
    full_name:Mapped[str]=mapped_column(String(255));unit:Mapped[str]=mapped_column(String(255));demo:Mapped[bool]=mapped_column(Boolean)
    
class Battle(Base):
    __tablename__="battles"
    id:Mapped[str]=mapped_column(String(50),primary_key=True);date:Mapped[date]=mapped_column(Date);text:Mapped[str]=mapped_column(Text)
    archive_url:Mapped[str]=mapped_column(Text);place_name:Mapped[str|None]=mapped_column(String(255));lat:Mapped[float|None]=mapped_column(Float);lon:Mapped[float|None]=mapped_column(Float)
    demo:Mapped[bool]=mapped_column(Boolean);
class Site(Base):
    __tablename__="last_battle_sites"
    id:Mapped[str]=mapped_column(String(50),primary_key=True);lat:Mapped[float]=mapped_column(Float);lon:Mapped[float]=mapped_column(Float)
    place_name:Mapped[str]=mapped_column(String(255));fighters_count:Mapped[int]=mapped_column(Integer);fighters:Mapped[list]=mapped_column(JSON)
    unit:Mapped[str]=mapped_column(String(255));date_text:Mapped[str]=mapped_column(String(255));circumstances:Mapped[str]=mapped_column(Text)
    status:Mapped[str]=mapped_column(String(50));sources:Mapped[list]=mapped_column(JSON);team_id:Mapped[str|None]=mapped_column(ForeignKey("teams.id"))
    volunteers_ready:Mapped[int]=mapped_column(Integer);created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now);demo:Mapped[bool]=mapped_column(Boolean)
    
class Subscription(Base):
    __tablename__="subscriptions"
    id:Mapped[str]=mapped_column(String(50),primary_key=True);lat:Mapped[float]=mapped_column(Float);lon:Mapped[float]=mapped_column(Float)
    radius_km:Mapped[float]=mapped_column(Float);topics:Mapped[list]=mapped_column(JSON);team_id:Mapped[str|None]=mapped_column(String(50))
    user_key:Mapped[str]=mapped_column(String(255));
class Notification(Base):
    __tablename__="notifications"
    id:Mapped[str]=mapped_column(String(50),primary_key=True)
    kind:Mapped[str]=mapped_column(String(50))
    site_id:Mapped[str]=mapped_column(ForeignKey("last_battle_sites.id"))
    user_key:Mapped[str]=mapped_column(String(255))
    distance_km:Mapped[float]=mapped_column(Float)
    title:Mapped[str]=mapped_column(String(255))
    body:Mapped[str]=mapped_column(Text)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    # Full-domain notification fields. The legacy P0 fields above are kept
    # for backward compatibility with the current frontend contract.
    user_id:Mapped[str|None]=mapped_column(String(50),ForeignKey("users.id"))
    type:Mapped[str|None]=mapped_column(String(50))
    message:Mapped[str|None]=mapped_column(Text)
    data:Mapped[dict|None]=mapped_column(JSON)
    is_read:Mapped[bool]=mapped_column(Boolean,default=False)
    read_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True))

class M(BaseModel): model_config=ConfigDict(populate_by_name=True)
class Source(M): kind:str;title:str;url:str|None=None
class NewSite(M):
    lat:float=Field(ge=-90,le=90);lon:float=Field(ge=-180,le=180)
    place_name:str=Field(validation_alias=AliasChoices("placeName","place_name"));fighters_count:int=Field(validation_alias=AliasChoices("fightersCount","fighters_count"),gt=0)
    fighters:list[dict];unit:str;date_text:str=Field(validation_alias=AliasChoices("dateText","date_text"));circumstances:str;sources:list[Source]
    team_id:str|None=Field(None,validation_alias=AliasChoices("teamId","team_id"))
class StatusChange(M): status:str;source:Source
class SubIn(M):
    lat:float;lon:float;radius_km:float=Field(20,validation_alias=AliasChoices("radiusKm","radius_km"));topics:list[str]

api=APIRouter()
def site_json(x):
    return {"id":x.id,"lat":x.lat,"lon":x.lon,"placeName":x.place_name,"fightersCount":x.fighters_count,"fighters":x.fighters,"unit":x.unit,"dateText":x.date_text,"circumstances":x.circumstances,"status":x.status,"sources":x.sources,"teamId":x.team_id,"volunteersReady":x.volunteers_ready,"createdAt":x.created_at,"demo":x.demo}

@api.get("/graves")
async def graves(s=Depends(db)):
    return [{"id":x.id,"lat":x.lat,"lon":x.lon,"fullName":x.full_name,"unit":x.unit,"demo":x.demo} for x in (await s.execute(select(Grave))).scalars()]
@api.get("/battles")
async def battles(s=Depends(db)):
    return [{"id":x.id,"date":x.date,"text":x.text,"archiveUrl":x.archive_url,"place":({"name":x.place_name,"lat":x.lat,"lon":x.lon} if x.place_name else None),"demo":x.demo} for x in (await s.execute(select(Battle).order_by(Battle.date))).scalars()]
@api.get("/teams")
async def teams(s=Depends(db)):
    return [{"id":x.id,"name":x.name,"region":x.region,"budgetGoalRub":x.budget_goal_rub,"budgetCollectedRub":x.budget_collected_rub,"foundThisMonth":x.found_this_month,"demo":x.demo} for x in (await s.execute(select(Team))).scalars()]
@api.get("/stats/search")
async def stats(s=Depends(db)):
    return {"month": now().strftime("%Y-%m"), "foundThisMonth": int((await s.execute(select(func.coalesce(func.sum(Team.found_this_month),0)))).scalar_one())}

@api.get("/sites")
async def sites(s=Depends(db)):
    all_sites=(await s.execute(select(Site).order_by(Site.created_at.desc()))).scalars()
    # Do not expose technical test records to the public frontend.
    sites=[x for x in all_sites if not x.place_name.startswith("ТЕСТ")]
    return [site_json(x) for x in sites]
@api.get("/sites/{id}")
async def site(id,s=Depends(db)):
    x=await s.get(Site,id)
    if not x: raise HTTPException(404,detail={"message":"Место не найдено"})
    return site_json(x)
@api.post("/sites")
async def create_site(b:NewSite,s=Depends(db)):
    x=Site(id=gid("SITE"),lat=b.lat,lon=b.lon,place_name=b.place_name,fighters_count=b.fighters_count,fighters=b.fighters,unit=b.unit,date_text=b.date_text,circumstances=b.circumstances,status="found_needs_check",sources=[z.model_dump() for z in b.sources],team_id=b.team_id,volunteers_ready=0,demo=False)
    s.add(x)
    await s.flush()

    rows=[]
    subscriptions=(await s.execute(select(Subscription))).scalars().all()
    for sub in subscriptions:
        if sub.team_id == b.team_id:
            continue
        d=distance_km(sub.lat,sub.lon,b.lat,b.lon)
        if d <= sub.radius_km:
            rows.append((sub,d))

    for sub,d in rows:
        km=max(1,round(d))
        s.add(Notification(id=gid("NTF"),kind="site_found",site_id=x.id,user_key=sub.user_key,distance_km=km,title="Обнаружено место гибели",body=f"В {km} км от вас обнаружено место гибели бойца. Требуется помощь в идентификации"))
    await s.commit();await s.refresh(x);return {"site":site_json(x),"notifiedCount":len(rows)}
@api.patch("/sites/{id}/status")
async def status(id,b:StatusChange,s=Depends(db)):
    x=await s.get(Site,id)
    if not x: raise HTTPException(404,detail={"message":"Место не найдено"})
    allowed={"found_needs_check":"archive_confirmed","archive_confirmed":"remains_raised"}
    if allowed.get(x.status)!=b.status: raise HTTPException(409,detail={"message":"Недопустимый переход статуса"})
    x.status=b.status;x.sources.append(b.source.model_dump());await s.commit();await s.refresh(x);return site_json(x)
@api.post("/sites/{id}/volunteer")
async def volunteer(id,s=Depends(db)):
    x=await s.get(Site,id)
    if not x: raise HTTPException(404,detail={"message":"Место не найдено"})
    x.volunteers_ready+=1;await s.commit();await s.refresh(x);return site_json(x)

@api.post("/subscriptions")
async def subscribe(b:SubIn,x_demo_user:str=Header("demo"),x_demo_team_id:str|None=Header(None),s=Depends(db)):
    x=Subscription(id=gid("SUB"),lat=b.lat,lon=b.lon,radius_km=b.radius_km,topics=b.topics,team_id=x_demo_team_id,user_key=x_demo_user)
    s.add(x);await s.commit();return {"id":x.id}
@api.delete("/subscriptions/{id}")
async def unsubscribe(id,s=Depends(db)):
    x=await s.get(Subscription,id)
    if not x: raise HTTPException(404,detail={"message":"Подписка не найдена"})
    await s.delete(x);await s.commit();return {"ok":True}
@api.get("/notifications/stream")
async def stream(request:Request,x_demo_user:str=Header("demo")):
    async def gen():
        seen=set()
        while not await request.is_disconnected():
            async with Session() as s:
                rows=(await s.execute(select(Notification).where(Notification.user_key==x_demo_user).order_by(Notification.created_at))).scalars().all()
                for n in rows:
                    if n.id in seen: continue
                    seen.add(n.id)
                    p={"id":n.id,"kind":n.kind,"siteId":n.site_id,"distanceKm":n.distance_km,"title":n.title,"body":n.body,"createdAt":n.created_at.isoformat()}
                    yield "data: "+json.dumps(p,ensure_ascii=False)+"\\n\\n"
            await asyncio.sleep(2)
    return StreamingResponse(gen(),media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Demo domain API
# The frontend contract already contains these modules. Until the full
# database-backed services are split out, the demo content lives in memory.
# This keeps the hackathon prototype fully navigable in live mode.
# ---------------------------------------------------------------------------

DEMO_MEMORIALS = [
    {"id":"osm-node-5832583820","lat":53.02707,"lon":36.95299,"name":"Блиндаж Горбатова","kind":"monument","osmUrl":"https://www.openstreetmap.org/node/5832583820"},
    {"id":"osm-node-1659573526","lat":53.27615,"lon":35.67959,"name":"Братская могила","kind":"grave","osmUrl":"https://www.openstreetmap.org/node/1659573526"},
    {"id":"osm-node-3824242584","lat":52.96799,"lon":36.07849,"name":"Братская могила","kind":"grave","osmUrl":"https://www.openstreetmap.org/node/3824242584"},
    {"id":"osm-node-5604184856","lat":52.91741,"lon":35.99210,"name":"Ветеранам Орловского бронетанкового училища Танк Т-34-85","kind":"vehicle","osmUrl":"https://www.openstreetmap.org/node/5604184856"},
    {"id":"osm-node-4825976528","lat":53.28111,"lon":36.56860,"name":"Вечный огонь","kind":"flame","osmUrl":"https://www.openstreetmap.org/node/4825976528"},
    {"id":"osm-node-9230884301","lat":53.16878,"lon":36.24788,"name":"Военный мемориал погибшим в Великой Отечественной войне","kind":"monument","osmUrl":"https://www.openstreetmap.org/node/9230884301"},
    {"id":"osm-node-3149024355","lat":53.45509,"lon":36.37631,"name":"Воинам 116-й Отдельной морской стрелковой бригады Тихоокеанского флота","kind":"monument","osmUrl":"https://www.openstreetmap.org/node/3149024355"},
    {"id":"osm-node-2190091277","lat":52.96140,"lon":36.08852,"name":"Воинам 5-ой Орловской дивизии","kind":"monument","osmUrl":"https://www.openstreetmap.org/node/2190091277"},
    {"id":"osm-node-4825564622","lat":53.46626,"lon":36.00630,"name":"Воинам Великой Отечественной войны (1941-1945)","kind":"monument","osmUrl":"https://www.openstreetmap.org/node/4825564622"}
]

DEMO_ROUTE_PATH = [
    {"lat":52.96661,"lon":36.06760},
    {"lat":52.96704,"lon":36.06727},
    {"lat":52.96775,"lon":36.06760},
    {"lat":52.96966,"lon":36.06888},
    {"lat":52.97257,"lon":36.07025},
    {"lat":52.97614,"lon":36.07182},
    {"lat":52.97314,"lon":36.06703},
    {"lat":52.97004,"lon":36.06804},
    {"lat":52.96661,"lon":36.06760}
]

DEMO_ROUTES = [{
    "id":"park-3km",
    "title":"Тропа у Оки",
    "summary":"Семейная прогулка на 3 км с четырьмя остановками и заданиями для ребёнка",
    "lengthM":3000,
    "durationMin":75,
    "path":DEMO_ROUTE_PATH,
    "demo":True,
    "points":[
        {
            "id":"rubezh","kind":"battle","title":"Рубеж десантников",
            "lat":52.96966,"lon":36.06888,
            "story":"В октябре 1941 года 5-й воздушно-десантный корпус задержал врага под Орлом. Многие десантники погибли, и точные места их захоронений до сих пор неизвестны.",
            "task":{"question":"Сколько бригад было в 5-м воздушно-десантном корпусе?","options":["Две","Три","Пять"],"answerIndex":1,"explanation":"Три: 9-я, 10-я и 201-я воздушно-десантные бригады."},
            "sources":[{"kind":"literature","title":"Овчинников А. «Десант в Орле» (1998)"}]
        },
        {
            "id":"okop","kind":"trench","title":"Окоп у дороги",
            "lat":52.97412,"lon":36.06964,
            "story":"Окоп полного профиля копали так, чтобы боец мог стрелять стоя и укрываться от осколков. Представь, сколько земли нужно было вынуть лопатой за одну ночь.",
            "task":{"question":"Зачем окоп делали зигзагом, а не прямой линией?","options":["Так быстрее копать","Чтобы осколки не летели вдоль всего окопа","Чтобы было красивее"],"answerIndex":1,"explanation":"Изломы окопа останавливали осколки и взрывную волну."},
            "sources":[{"kind":"demo","title":"Демо-текст прототипа, требует проверки краеведом"}]
        },
        {
            "id":"shtab","kind":"hq","title":"Полевой штаб",
            "lat":52.97314,"lon":36.06703,
            "story":"В штабе получали и отправляли донесения. Важные сообщения шифровали, чтобы противник не узнал планы.",
            "task":{"question":"Расшифруй донесение: каждая буква заменена следующей по алфавиту. «ПЛБ» — это…","options":["ОКА","ОРЁЛ","МЦЕНСК"],"answerIndex":0,"explanation":"П → О, Л → К, Б → А. Получается «ОКА» — река, на которой стоит Орёл."},
            "sources":[{"kind":"demo","title":"Демо-текст прототипа, требует проверки краеведом"}]
        },
        {
            "id":"salut","kind":"battle","title":"Первый салют",
            "lat":52.97199,"lon":36.06972,
            "story":"5 августа 1943 года Орёл был освобождён. В тот же вечер в Москве прогремел первый в годы войны артиллерийский салют — в честь освобождения Орла и Белгорода.",
            "task":{"question":"В честь освобождения каких городов прогремел первый салют?","options":["Курска и Брянска","Орла и Белгорода","Тулы и Калуги"],"answerIndex":1,"explanation":"Орла и Белгорода. Поэтому Орёл называют городом первого салюта."},
            "sources":[{"kind":"archive","title":"«Выстояли и победили! Орловская область в годы Великой Отечественной войны» (ГАОО, 2015)","url":"http://www.gosarchiv-orel.ru/"}]
        }
    ]
}]

DEMO_FUNDRAISERS = [
    {"id":"F01","teamId":"T01","purpose":"fuel","title":"Бензин на Вахту Памяти","goalRub":50000,"collectedRub":15000,"lat":53.28,"lon":36.57,"demo":True},
    {"id":"F02","teamId":"T03","purpose":"equip","title":"Экипировать отряд: щупы и металлоискатель","goalRub":40000,"collectedRub":9000,"lat":53.21,"lon":36.45,"demo":True},
    {"id":"F03","teamId":"T04","purpose":"raise_fighter","title":"Поднять бойца: овраг у д. Крупышино","goalRub":30000,"collectedRub":21000,"lat":52.74,"lon":35.84,"demo":True},
    {"id":"F04","teamId":"T02","purpose":"fuel","title":"Бензин на разведку у р. Оптуха","goalRub":80000,"collectedRub":32000,"lat":53.15,"lon":36.33,"demo":True},
    {"id":"F05","teamId":"T05","purpose":"equip","title":"Экипировать отряд: палатки и аптечки","goalRub":60000,"collectedRub":12500,"lat":52.97,"lon":36.07,"demo":True}
]

DEMO_REQUESTS = [{
    "id":"R01","teamId":"T01","title":"Вахта Памяти (Орловская обл.)","date":"2026-10-03",
    "place":"Мценский р-н","roles":[{"role":"digger","count":5}],"joined":2,"fundraiserId":"F01",
    "lat":53.28,"lon":36.57,"createdAt":"2026-09-20T09:00:00Z","demo":True
}]

DEMO_CHECKLIST = [
    {"id":"shovel","label":"Лопата"},
    {"id":"probe","label":"Щуп"},
    {"id":"gloves","label":"Перчатки"},
    {"id":"pamyat","label":"Регистрация на сайте «Память народа»","url":"https://pamyat-naroda.ru/"}
]

DEMO_TRIPS = [
    {"id":"W01","teamId":"T01","date":"2026-10-03","title":"Раскопки у д. Семенково","place":"д. Семенково","lat":53.05,"lon":36.22,"spotsTotal":12,"spotsTaken":5,"checklist":DEMO_CHECKLIST,"demo":True},
    {"id":"W02","teamId":"T03","date":"2026-10-10","title":"Разведка у р. Оптуха","place":"р. Оптуха","lat":53.15,"lon":36.33,"spotsTotal":8,"spotsTaken":1,"checklist":DEMO_CHECKLIST,"demo":True}
]

DEMO_GROUP_APPLICATIONS = [{
    "id":"G01","tripId":"W01","organization":"Школа № 1, 8 «Б» класс (демо)",
    "contactName":"Классный руководитель (демо)","contact":"+7 900 000-00-00",
    "peopleCount":12,"comment":"10 учеников и 2 взрослых, нужен вводный инструктаж",
    "status":"pending","createdAt":"2026-09-21T10:00:00Z","demo":True
}]

DEMO_STORIES = [
    {
        "id":"ST01","title":"Памятник морякам-тихоокеанцам","place":"с. Крупышино, Кромской район",
        "story":"Мало кто знает, что возле села Крупышино стоит памятник подвигу моряков Тихоокеанского флота, сражавшихся за Орловскую землю. Пример истории из кейса хакатона.",
        "sourceText":"Кейс хакатона «Маршруты победы», раздел «Описание текущей ситуации»",
        "author":"Краеведческий кружок (демо)","status":"verified","verifiedBy":"Краевед (демо)",
        "createdAt":"2026-09-12T10:00:00Z","demo":True
    },
    {
        "id":"ST02","title":"Землянка у оврага (демо)","place":"д. Семенково",
        "story":"Демо-пример: местные жители помнят землянку у оврага за деревней, где зимой 1942 года стояли бойцы. Нужна сверка с архивом.",
        "sourceText":"Рассказ местного жителя (демо)","author":"Семья Петровых (демо)",
        "status":"pending","createdAt":"2026-09-20T15:00:00Z","demo":True
    },
    {
        "id":"ST03","title":"Письмо с фронта (демо)","place":"Кромской район",
        "story":"Демо-пример: в семье хранится письмо прадеда, отправленное летом 1943 года перед наступлением на Орёл.",
        "sourceText":"","author":"Внук бойца (демо)","status":"clarify","verifiedBy":"Краевед (демо)",
        "reviewNote":"Пришлите, пожалуйста, фото письма или номер полевой почты — без источника подтвердить нельзя.",
        "createdAt":"2026-09-18T12:00:00Z","demo":True
    }
]

DEMO_LIVE_PHOTOS = [
    {
        "id":"soldier","title":"Офицер-победитель","caption":"Портрет советского офицера, 1945 год. Архивный снимок",
        "speech":"Здравствуй, потомок! Я прошёл эту войну до самой Победы. Мы выстояли, потому что были вместе — весь Советский Союз: и солдат на фронте, и мать у станка, и мальчишка в тылу. Победа досталась нам дорогой ценой. Береги мир, береги память и гордись своей страной. Помни нас!",
        "photoUrl":"live/soldier.jpg","videoUrl":"live/soldier.mp4","captionsUrl":"live/soldier.vtt","targetUrl":"live/soldier.mind",
        "photoAspect":716/500,"animation":"lip_sync","consent":"Демо для хакатона. Для публикации нужно согласие родственников",
        "sources":[{"kind":"archive","title":"Архивный снимок из открытых публикаций (демо, требует атрибуции)"}],"demo":True
    },
    {
        "id":"reichstag","title":"У Рейхстага","caption":"Советские бойцы у Рейхстага, Берлин, 1945 год. Колоризованный архивный снимок",
        "speech":"Товарищи! Мы дошли до Берлина! Через огонь и потери, от Москвы и Орла — до самого Рейхстага! Враг разбит! Победа за нами! Ура!",
        "photoUrl":"live/reichstag.jpg","videoUrl":"live/reichstag.mp4","captionsUrl":"live/reichstag.vtt","targetUrl":"live/reichstag.mind",
        "photoAspect":689/959,"animation":"neural_motion","consent":"Демо для хакатона. Для публикации нужно согласие родственников",
        "sources":[{"kind":"archive","title":"Архивный снимок из открытых публикаций (демо, требует атрибуции)"}],"demo":True
    }
]

DEMO_SITES = [
    {"id":"S01","lat":52.74,"lon":35.84,"placeName":"Овраг у д. Крупышино","fightersCount":1,
     "fighters":[{"fullName":"Иванов И.И.","rank":"Красноармеец"}],"unit":"Неизвестно","dateText":"1943",
     "circumstances":"Требуется подъём. Пример карточки из прототипа кейса.","status":"found_needs_check",
     "sources":[{"kind":"book_of_memory","title":"Книга Памяти. Орловская область, т. 5","url":"http://library.gu-unpk.ru/9_mai_2010/kniga_pamyati.php"}],
     "volunteersReady":3,"createdAt":"2026-09-10T12:00:00Z","demo":True},
    {"id":"S02","lat":53.21,"lon":36.45,"placeName":"Опушка у д. Первый Воин","fightersCount":2,
     "fighters":[{},{}],"unit":"201-я вдбр, 5-й ВДК","dateText":"октябрь 1941",
     "circumstances":"Место указано по рассказу местных жителей, сверено с донесением.","status":"archive_confirmed",
     "sources":[{"kind":"eyewitness","title":"Рассказ местных жителей (демо)"},{"kind":"demo","title":"Демо-текст прототипа, требует проверки краеведом"}],
     "teamId":"T03","volunteersReady":6,"createdAt":"2026-08-28T12:00:00Z","demo":True},
    {"id":"S03","lat":52.9,"lon":36.25,"placeName":"Поле у д. Становой Колодезь","fightersCount":4,
     "fighters":[{},{},{},{}],"unit":"Неизвестно","dateText":"июль 1943",
     "circumstances":"Останки подняты и перезахоронены.","status":"remains_raised",
     "sources":[{"kind":"demo","title":"Демо-текст прототипа, требует проверки краеведом"}],
     "teamId":"T02","volunteersReady":0,"createdAt":"2026-07-15T12:00:00Z","demo":True}
]

@api.get("/memorials")
async def memorials():
    return deepcopy(DEMO_MEMORIALS)

@api.get("/routes")
async def list_routes():
    return deepcopy(DEMO_ROUTES)

@api.get("/routes/{id}")
async def get_route(id):
    for item in DEMO_ROUTES:
        if item["id"] == id:
            return deepcopy(item)
    raise HTTPException(404,detail={"message":"Маршрут не найден"})

@api.get("/requests")
async def list_requests():
    return deepcopy(sorted(DEMO_REQUESTS,key=lambda x:x["createdAt"],reverse=True))

@api.post("/requests")
async def create_request(b:dict):
    item = deepcopy(b)
    item["id"]=gid("REQ")
    item["joined"]=0
    item["createdAt"]=now().isoformat()
    item["demo"]=True
    DEMO_REQUESTS.append(item)
    return deepcopy(item)

@api.post("/requests/{id}/join")
async def join_request(id):
    for item in DEMO_REQUESTS:
        if item["id"] == id:
            item["joined"] += 1
            return deepcopy(item)
    raise HTTPException(404,detail={"message":"Заявка не найдена"})

@api.get("/fundraisers")
async def list_fundraisers():
    return deepcopy(DEMO_FUNDRAISERS)

@api.post("/donations")
async def donate(b:dict):
    fundraiser_id=b.get("fundraiserId")
    amount=int(b.get("amountRub",0))
    if amount < 1:
        raise HTTPException(422,detail={"message":"Сумма должна быть не меньше 1 ₽"})
    for item in DEMO_FUNDRAISERS:
        if item["id"] == fundraiser_id:
            item["collectedRub"] += amount
            return {"paymentId":gid("PAY"),"status":"test_succeeded","fundraiser":deepcopy(item)}
    raise HTTPException(404,detail={"message":"Сбор не найден"})

@api.get("/trips")
async def list_trips():
    return deepcopy(sorted(DEMO_TRIPS,key=lambda x:x["date"]))

@api.get("/trips/{id}")
async def get_trip(id):
    for item in DEMO_TRIPS:
        if item["id"] == id:
            return deepcopy(item)
    raise HTTPException(404,detail={"message":"Выезд не найден"})

@api.post("/trips/{id}/register")
async def register_trip(id):
    for item in DEMO_TRIPS:
        if item["id"] == id:
            if item["spotsTaken"] >= item["spotsTotal"]:
                raise HTTPException(409,detail={"message":"Мест нет"})
            item["spotsTaken"] += 1
            return deepcopy(item)
    raise HTTPException(404,detail={"message":"Выезд не найден"})

@api.get("/group-applications")
async def list_group_applications():
    return deepcopy(sorted(DEMO_GROUP_APPLICATIONS,key=lambda x:x["createdAt"],reverse=True))

@api.post("/group-applications")
async def create_group_application(b:dict):
    item=deepcopy(b)
    item["id"]=gid("GRP")
    item["status"]="pending"
    item["createdAt"]=now().isoformat()
    item["demo"]=True
    DEMO_GROUP_APPLICATIONS.append(item)
    return deepcopy(item)

@api.patch("/group-applications/{id}")
async def decide_group_application(id,b:dict):
    status=b.get("status")
    if status not in {"confirmed","clarify"}:
        raise HTTPException(422,detail={"message":"Статус должен быть confirmed или clarify"})
    for item in DEMO_GROUP_APPLICATIONS:
        if item["id"] == id:
            item["status"]=status
            return deepcopy(item)
    raise HTTPException(404,detail={"message":"Заявка не найдена"})

@api.get("/stories")
async def list_stories():
    return deepcopy(sorted(DEMO_STORIES,key=lambda x:x["createdAt"],reverse=True))

@api.get("/stories/{id}")
async def get_story(id):
    for item in DEMO_STORIES:
        if item["id"] == id:
            return deepcopy(item)
    raise HTTPException(404,detail={"message":"История не найдена"})

@api.post("/stories")
async def create_story(b:dict):
    item=deepcopy(b)
    if len(item.get("title","")) < 4 or len(item.get("place","")) < 2 or len(item.get("story","")) < 30:
        raise HTTPException(422,detail={"message":"Заполните название, место и историю (не менее 30 символов)"})
    item["id"]=gid("STORY")
    item["status"]="pending"
    item["createdAt"]=now().isoformat()
    item["demo"]=True
    DEMO_STORIES.append(item)
    return deepcopy(item)

@api.post("/stories/{id}/review")
async def review_story(id,b:dict):
    decision=b.get("decision")
    reviewer=str(b.get("reviewer","")).strip()
    note=str(b.get("note","")).strip()
    if decision not in {"verified","clarify"} or not reviewer:
        raise HTTPException(422,detail={"message":"Неверное решение или проверяющий"})
    for item in DEMO_STORIES:
        if item["id"] == id:
            if item["status"] not in {"pending","clarify"}:
                raise HTTPException(409,detail={"message":"История уже рассмотрена"})
            if decision=="verified" and not item["sourceText"].strip():
                raise HTTPException(422,detail={"message":"Без источника подтвердить нельзя"})
            item["status"]=decision
            item["verifiedBy"]=reviewer
            if note:
                item["reviewNote"]=note
            return deepcopy(item)
    raise HTTPException(404,detail={"message":"История не найдена"})

@api.get("/live-photos")
async def list_live_photos():
    return deepcopy(DEMO_LIVE_PHOTOS)

@api.get("/live-photos/{id}")
async def get_live_photo(id):
    for item in DEMO_LIVE_PHOTOS:
        if item["id"] == id:
            return deepcopy(item)
    raise HTTPException(404,detail={"message":"Живое фото не найдено"})


app=FastAPI(title="Тропа памяти: Последний бой — API",version="0.1.0",openapi_url="/api/v1/openapi.json")
allowed_origins = {x.strip() for x in settings.cors_origins.split(",") if x.strip()}
allowed_origins.add("https://team-shpilit.github.io")
app.add_middleware(CORSMiddleware,allow_origins=sorted(allowed_origins),allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"],allow_headers=["*"])
@app.get("/health")
async def health(): return {"ok":True}
app.include_router(api,prefix="/api/v1")


# ---------------------------------------------------------------------------
# Full domain schema (25 tables)
# These models extend the P0 API models above. They are intentionally kept
# in this module for the first backend milestone; endpoints can be split into
# feature modules later without changing the database contract.
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(30))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Role(Base):
    __tablename__ = "roles"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str | None] = mapped_column(Text)

class UserRole(Base):
    __tablename__ = "user_roles"
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[str] = mapped_column(String(50), ForeignKey("roles.id"), primary_key=True)

class HistoricalPoint(Base):
    __tablename__ = "historical_points"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    event_date: Mapped[date | None] = mapped_column(Date)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    created_by: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class HistoricalSource(Base):
    __tablename__ = "historical_sources"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    source_type: Mapped[str] = mapped_column(String(100))
    author: Mapped[str | None] = mapped_column(String(255))
    publication_date: Mapped[date | None] = mapped_column(Date)
    url: Mapped[str | None] = mapped_column(Text)
    archive_name: Mapped[str | None] = mapped_column(String(255))
    document_number: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class HistoricalPointSource(Base):
    __tablename__ = "historical_point_sources"
    historical_point_id: Mapped[str] = mapped_column(String(50), ForeignKey("historical_points.id"), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(50), ForeignKey("historical_sources.id"), primary_key=True)

class HistoricalSubmission(Base):
    __tablename__ = "historical_submissions"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    submitted_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    event_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class SubmissionReview(Base):
    __tablename__ = "submission_reviews"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    submission_id: Mapped[str] = mapped_column(String(50), ForeignKey("historical_submissions.id"))
    reviewer_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(50))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Soldier(Base):
    __tablename__ = "soldiers"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[str | None] = mapped_column(String(100))
    birth_date: Mapped[date | None] = mapped_column(Date)
    birth_place: Mapped[str | None] = mapped_column(Text)
    military_unit: Mapped[str | None] = mapped_column(String(255))
    rank: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str | None] = mapped_column(String(100))
    external_id: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class LastBattleCase(Base):
    __tablename__ = "last_battle_cases"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50))
    source_description: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    verified_by: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class LastBattleSoldier(Base):
    __tablename__ = "last_battle_soldiers"
    last_battle_case_id: Mapped[str] = mapped_column(String(50), ForeignKey("last_battle_cases.id"), primary_key=True)
    soldier_id: Mapped[str] = mapped_column(String(50), ForeignKey("soldiers.id"), primary_key=True)

class LastBattleStatusHistory(Base):
    __tablename__ = "last_battle_status_history"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(50), ForeignKey("last_battle_cases.id"))
    old_status: Mapped[str | None] = mapped_column(String(50))
    new_status: Mapped[str] = mapped_column(String(50))
    changed_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class SearchTeam(Base):
    __tablename__ = "search_teams"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    region: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(30))
    website: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class SearchTeamMember(Base):
    __tablename__ = "search_team_members"
    team_id: Mapped[str] = mapped_column(String(50), ForeignKey("search_teams.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"), primary_key=True)
    role: Mapped[str | None] = mapped_column(String(100))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class TeamNeed(Base):
    __tablename__ = "team_needs"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(String(50), ForeignKey("search_teams.id"))
    type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[int | None] = mapped_column(Integer)
    amount_required: Mapped[float | None] = mapped_column(Float)
    amount_collected: Mapped[float | None] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(50), default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Route(Base):
    __tablename__ = "routes"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    region: Mapped[str | None] = mapped_column(String(255))
    distance_km: Mapped[float | None] = mapped_column(Float)
    duration_minutes: Mapped[int | None] = mapped_column(Integer)
    difficulty: Mapped[str | None] = mapped_column(String(50))
    created_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class RoutePoint(Base):
    __tablename__ = "route_points"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    route_id: Mapped[str] = mapped_column(String(50), ForeignKey("routes.id"))
    historical_point_id: Mapped[str] = mapped_column(String(50), ForeignKey("historical_points.id"))
    order_index: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    quest_text: Mapped[str | None] = mapped_column(Text)
    audio_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class UserRouteProgress(Base):
    __tablename__ = "user_route_progress"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    route_id: Mapped[str] = mapped_column(String(50), ForeignKey("routes.id"))
    route_point_id: Mapped[str] = mapped_column(String(50), ForeignKey("route_points.id"))
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

class VolunteerEvent(Base):
    __tablename__ = "volunteer_events"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(String(50), ForeignKey("search_teams.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    max_participants: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class VolunteerEventParticipant(Base):
    __tablename__ = "volunteer_event_participants"
    event_id: Mapped[str] = mapped_column(String(50), ForeignKey("volunteer_events.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"), primary_key=True)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    status: Mapped[str] = mapped_column(String(50), default="REGISTERED")

class FundraisingCampaign(Base):
    __tablename__ = "fundraising_campaigns"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    team_id: Mapped[str] = mapped_column(String(50), ForeignKey("search_teams.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    target_amount: Mapped[float] = mapped_column(Float)
    collected_amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(50), default="OPEN")
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Donation(Base):
    __tablename__ = "donations"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    campaign_id: Mapped[str] = mapped_column(String(50), ForeignKey("fundraising_campaigns.id"))
    user_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    payment_provider: Mapped[str | None] = mapped_column(String(50))
    payment_id: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Media(Base):
    __tablename__ = "media"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    uploaded_by: Mapped[str] = mapped_column(String(50), ForeignKey("users.id"))
    file_url: Mapped[str] = mapped_column(Text)
    file_type: Mapped[str | None] = mapped_column(String(50))
    mime_type: Mapped[str | None] = mapped_column(String(100))
    title: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(50), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str] = mapped_column(String(50))
    old_values: Mapped[dict | None] = mapped_column(JSON)
    new_values: Mapped[dict | None] = mapped_column(JSON)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
