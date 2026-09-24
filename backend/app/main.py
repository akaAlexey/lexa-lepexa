from datetime import date,datetime,timezone
from uuid import uuid4
import asyncio,json,math
from fastapi import FastAPI,APIRouter,Depends,Header,HTTPException,Query,Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel,ConfigDict,Field,AliasChoices
from pydantic_settings import BaseSettings,SettingsConfigDict
from sqlalchemy import String,Text,Integer,Float,Boolean,Date,DateTime,JSON,ForeignKey,select,func
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column

class Settings(BaseSettings):
    database_url:str="postgresql+asyncpg://postgres:postgres@localhost:5432/memory_trail"
    cors_origins:str="http://localhost:3000,http://localhost:5173,https://akalexey.github.io,https://team-shpilit.github.io"
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
    return [site_json(x) for x in (await s.execute(select(Site).order_by(Site.created_at.desc()))).scalars()]
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
async def stream(request:Request,user:str|None=Query(None),x_demo_user:str=Header("demo")):
    # Браузерный EventSource не умеет заголовки: демо-пользователь приходит параметром ?user=
    user_key=user or x_demo_user
    async def gen():
        seen=set()
        while not await request.is_disconnected():
            async with Session() as s:
                rows=(await s.execute(select(Notification).where(Notification.user_key==user_key).order_by(Notification.created_at))).scalars().all()
                for n in rows:
                    if n.id in seen: continue
                    seen.add(n.id)
                    p={"id":n.id,"kind":n.kind,"siteId":n.site_id,"distanceKm":n.distance_km,"title":n.title,"body":n.body,"createdAt":n.created_at.isoformat()}
                    yield "data: "+json.dumps(p,ensure_ascii=False)+"\n\n"
            await asyncio.sleep(2)
    return StreamingResponse(gen(),media_type="text/event-stream")

app=FastAPI(title="Тропа памяти: Последний бой — API",version="0.1.0",openapi_url="/api/v1/openapi.json")
app.add_middleware(CORSMiddleware,allow_origins=[x for x in settings.cors_origins.split(",") if x],allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"],allow_headers=["*"])
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
