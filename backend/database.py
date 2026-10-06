import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _normalize_url(url: str) -> str:
    # Provedores (Render, Heroku...) entregam "postgres://" ou "postgresql://"; o driver async exige +asyncpg.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


# Sem DATABASE_URL o histórico de buscas é simplesmente desativado.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    engine = create_async_engine(_normalize_url(DATABASE_URL), echo=False, pool_pre_ping=True)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
else:
    engine = None
    AsyncSessionLocal = None


async def get_db():
    if AsyncSessionLocal is None:
        yield None
        return
    async with AsyncSessionLocal() as session:
        yield session
