from datetime import date,datetime,timezone
from uuid import uuid4
from typing import Any
import asyncio,json
from fastapi import FastAPI,APIRouter,Depends,Header,HTTPException,Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel,ConfigDict,Field,AliasChoices
from pydantic_settings import BaseSettings,SettingsConfigDict
from sqlalchemy import String,Text,Integer,Float,Boolean,Date,DateTime,JSON,ForeignKey,select,func
from sqlalchemy.ext.asyncio import create_async_engine,async_sessionmaker
from sqlalchemy.orm import DeclarativeBase,Mapped,mapped_column
from geoalchemy2 import Geography
from geoalchemy2.functions import ST_DWithin,ST_Distance,ST_SetSRID,ST_MakePoint

class Settings(BaseSettings):
    database_url:str="postgresql+asyncpg://postgres:postgres@localhost:5432/memory_trail"
    cors_origins:str="http://localhost:3000,http://localhost:5173"
    model_config=SettingsConfigDict(env_file=".env",extra="ignore")
settings=Settings()
engine=create_async_engine(settings.database_url,pool_pre_ping=True)
Session=async_sessionmaker(engine,expire_on_commit=False)
async def db():
    async with Session() as s: yield s
class Base(DeclarativeBase): pass
def now(): return datetime.now(timezone.utc)
def gid(p): return p+"_"+uuid4().hex[:10]

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
    location:Mapped[Any]=mapped_column(Geography(geometry_type="POINT",srid=4326))
class Battle(Base):
    __tablename__="battles"
    id:Mapped[str]=mapped_column(String(50),primary_key=True);date:Mapped[date]=mapped_column(Date);text:Mapped[str]=mapped_column(Text)
    archive_url:Mapped[str]=mapped_column(Text);place_name:Mapped[str|None]=mapped_column(String(255));lat:Mapped[float|None]=mapped_column(Float);lon:Mapped[float|None]=mapped_column(Float)
    demo:Mapped[bool]=mapped_column(Boolean);location:Mapped[Any|None]=mapped_column(Geography(geometry_type="POINT",srid=4326))
class Site(Base):
    __tablename__="last_battle_sites"
    id:Mapped[str]=mapped_column(String(50),primary_key=True);lat:Mapped[float]=mapped_column(Float);lon:Mapped[float]=mapped_column(Float)
    place_name:Mapped[str]=mapped_column(String(255));fighters_count:Mapped[int]=mapped_column(Integer);fighters:Mapped[list]=mapped_column(JSON)
    unit:Mapped[str]=mapped_column(String(255));date_text:Mapped[str]=mapped_column(String(255));circumstances:Mapped[str]=mapped_column(Text)
    status:Mapped[str]=mapped_column(String(50));sources:Mapped[list]=mapped_column(JSON);team_id:Mapped[str|None]=mapped_column(ForeignKey("teams.id"))
    volunteers_ready:Mapped[int]=mapped_column(Integer);created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now);demo:Mapped[bool]=mapped_column(Boolean)
    location:Mapped[Any]=mapped_column(Geography(geometry_type="POINT",srid=4326))
class Subscription(Base):
    __tablename__="subscriptions"
    id:Mapped[str]=mapped_column(String(50),primary_key=True);lat:Mapped[float]=mapped_column(Float);lon:Mapped[float]=mapped_column(Float)
    radius_km:Mapped[float]=mapped_column(Float);topics:Mapped[list]=mapped_column(JSON);team_id:Mapped[str|None]=mapped_column(String(50))
    user_key:Mapped[str]=mapped_column(String(255));location:Mapped[Any]=mapped_column(Geography(geometry_type="POINT",srid=4326))
class Notification(Base):
    __tablename__="notifications"
    id:Mapped[str]=mapped_column(String(50),primary_key=True);kind:Mapped[str]=mapped_column(String(50));site_id:Mapped[str]=mapped_column(ForeignKey("last_battle_sites.id"))
    user_key:Mapped[str]=mapped_column(String(255));distance_km:Mapped[float]=mapped_column(Float);title:Mapped[str]=mapped_column(String(255))
    body:Mapped[str]=mapped_column(Text);created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

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
    return {"foundThisMonth":int((await s.execute(select(func.coalesce(func.sum(Team.found_this_month),0)))).scalar_one())}

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
    x=Site(id=gid("SITE"),lat=b.lat,lon=b.lon,place_name=b.place_name,fighters_count=b.fighters_count,fighters=b.fighters,unit=b.unit,date_text=b.date_text,circumstances=b.circumstances,status="found_needs_check",sources=[z.model_dump() for z in b.sources],team_id=b.team_id,volunteers_ready=0,demo=False,location=f"SRID=4326;POINT({b.lon} {b.lat})")
    s.add(x);await s.flush();target=ST_SetSRID(ST_MakePoint(b.lon,b.lat),4326)
    rows=(await s.execute(select(Subscription,ST_Distance(Subscription.location,target)/1000).where(ST_DWithin(Subscription.location,target,Subscription.radius_km*1000),Subscription.team_id.is_distinct_from(b.team_id)))).all()
    for sub,d in rows:
        km=max(1,round(float(d)));s.add(Notification(id=gid("NTF"),kind="site_found",site_id=x.id,user_key=sub.user_key,distance_km=km,title="Обнаружено место гибели",body=f"В {km} км от вас обнаружено место гибели бойца. Требуется помощь в идентификации"))
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
    x.volunteers_ready+=1;await s.commit();return {"ok":True}

@api.post("/subscriptions")
async def subscribe(b:SubIn,x_demo_user:str=Header("demo"),x_demo_team_id:str|None=Header(None),s=Depends(db)):
    x=Subscription(id=gid("SUB"),lat=b.lat,lon=b.lon,radius_km=b.radius_km,topics=b.topics,team_id=x_demo_team_id,user_key=x_demo_user,location=f"SRID=4326;POINT({b.lon} {b.lat})")
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

app=FastAPI(title="Тропа памяти: Последний бой — API",version="0.1.0",openapi_url="/api/v1/openapi.json")
app.add_middleware(CORSMiddleware,allow_origins=[x for x in settings.cors_origins.split(",") if x],allow_methods=["GET","POST","PATCH","DELETE","OPTIONS"],allow_headers=["*"])
@app.get("/health")
async def health(): return {"ok":True}
app.include_router(api,prefix="/api/v1")
