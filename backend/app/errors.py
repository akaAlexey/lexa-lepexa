from typing import NoReturn, TypeVar

from fastapi import HTTPException

T = TypeVar("T")


def fail(status: int, message: str) -> NoReturn:
    raise HTTPException(status, detail={"message": message})


def found(item: T | None, what: str) -> T:
    if item is None:
        fail(404, f"{what} не найден")
    return item
