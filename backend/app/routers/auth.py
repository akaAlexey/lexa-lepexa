"""Регистрация и вход с серверной сессией в HttpOnly-cookie."""

import base64
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import Session, get_session
from ..models_domain import AuthSession, User
from ..timeutil import gid, iso_z, now

router = APIRouter(prefix="/auth", tags=["Авторизация"])

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE = re.compile(r"^\d{10,11}$")
SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
DKLEN = 32


class LoginIn(BaseModel):
    login: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=200)


class RegisterIn(LoginIn):
    name: str = Field(min_length=2, max_length=80)
    terms: bool
    privacy: bool


def normalize_login(raw: str) -> tuple[str, str]:
    value = raw.strip()
    if EMAIL.match(value):
        return "email", value.lower()
    digits = re.sub(r"[\s()+-]", "", value)
    if PHONE.match(digits):
        if len(digits) == 10:
            digits = "7" + digits
        elif digits.startswith("8"):
            digits = "7" + digits[1:]
        return "phone", digits
    raise HTTPException(422, "Введите корректный email или номер телефона")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=DKLEN,
    )
    return "$".join(
        (
            "scrypt",
            str(SCRYPT_N),
            str(SCRYPT_R),
            str(SCRYPT_P),
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(digest).decode("ascii"),
        )
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt64, digest64 = encoded.split("$", 5)
        if algorithm != "scrypt":
            return False
        salt = base64.urlsafe_b64decode(salt64.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest64.encode("ascii"))
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n),
            r=int(r),
            p=int(p),
            dklen=len(expected),
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def account(user: User) -> dict:
    login = user.email or user.phone or user.username
    return {
        "id": user.id,
        "login": login,
        "name": user.first_name or user.username,
        "since": iso_z(user.created_at),
    }


async def find_user(s: AsyncSession, raw_login: str) -> User | None:
    kind, login = normalize_login(raw_login)
    if kind == "email":
        q = select(User).where(or_(User.email == login, User.username == login))
    else:
        q = select(User).where(or_(User.phone == login, User.username == login))
    return await s.scalar(q)


async def issue_session(response: Response, user: User, s: AsyncSession) -> None:
    token = secrets.token_urlsafe(32)
    created = now()
    s.add(
        AuthSession(
            id=gid("SES"),
            user_id=user.id,
            token_hash=token_hash(token),
            created_at=created,
            expires_at=created + timedelta(days=settings.auth_session_days),
        )
    )
    await s.commit()
    response.set_cookie(
        settings.auth_cookie_name,
        token,
        max_age=settings.auth_session_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.cookie_samesite,
        path="/api/v1",
    )


async def signed_in_user_id(request: Request) -> str | None:
    """id вошедшего пользователя по cookie сессии или None — без ошибок (для разделов, где вход не обязателен)."""
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        return None
    async with Session() as s:
        session = await s.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash(token)))
        if session is None:
            return None
        expires = session.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=now().tzinfo)
        if expires <= now():
            return None
        user = await s.get(User, session.user_id)
        return user.id if user is not None and user.is_active else None


async def current_user(
    request: Request,
    s: AsyncSession = Depends(get_session),
) -> User:
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise HTTPException(401, "Требуется вход")
    session = await s.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash(token)))
    if session is None:
        raise HTTPException(401, "Сессия не найдена")
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=now().tzinfo)
    if expires <= now():
        await s.delete(session)
        await s.commit()
        raise HTTPException(401, "Сессия истекла")
    user = await s.get(User, session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(401, "Пользователь недоступен")
    return user


@router.post("/register", status_code=201)
async def register(body: RegisterIn, response: Response, s: AsyncSession = Depends(get_session)):
    if not body.terms or not body.privacy:
        raise HTTPException(422, "Нужно принять условия и политику конфиденциальности")
    kind, login = normalize_login(body.login)
    if await find_user(s, login):
        raise HTTPException(409, "Пользователь с таким логином уже зарегистрирован")
    created = now()
    user = User(
        id=gid("USR"),
        email=login if kind == "email" else None,
        phone=login if kind == "phone" else None,
        username=login,
        password_hash=hash_password(body.password),
        first_name=body.name.strip(),
        last_name=None,
        is_active=True,
        created_at=created,
        updated_at=created,
    )
    s.add(user)
    await s.flush()
    await issue_session(response, user, s)
    return account(user)


@router.post("/login")
async def login(body: LoginIn, response: Response, s: AsyncSession = Depends(get_session)):
    user = await find_user(s, body.login)
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Неверный логин или пароль")
    await issue_session(response, user, s)
    return account(user)


@router.get("/me")
async def me(user: User = Depends(current_user)):
    return account(user)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    s: AsyncSession = Depends(get_session),
):
    token = request.cookies.get(settings.auth_cookie_name)
    if token:
        session = await s.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash(token)))
        if session is not None:
            await s.delete(session)
            await s.commit()
    response.delete_cookie(
        settings.auth_cookie_name,
        path="/api/v1",
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )
    return {"ok": True}
