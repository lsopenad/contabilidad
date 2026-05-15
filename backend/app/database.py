from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import config

motor = create_async_engine(config.async_database_url, echo=False)
SesionLocal = async_sessionmaker(motor, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def obtener_sesion() -> AsyncGenerator[AsyncSession, None]:
    async with SesionLocal() as sesion:
        yield sesion
