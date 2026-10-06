import time
import logging
from collections import defaultdict
from fastapi import HTTPException, Request

from core.config import RATE_LIMIT_PER_MINUTE
from core.redis import redis_client

logger = logging.getLogger(__name__)

WINDOW_SECONDS = 60
_memory_hits: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _over_limit(key: str) -> bool:
    if redis_client is not None:
        try:
            count = await redis_client.incr(key)
            if count == 1:
                await redis_client.expire(key, WINDOW_SECONDS)
            return count > RATE_LIMIT_PER_MINUTE
        except Exception as e:
            logger.error(f"Rate limit via Redis falhou, usando memória: {e}")

    now = time.monotonic()
    hits = [t for t in _memory_hits[key] if now - t < WINDOW_SECONDS]
    hits.append(now)
    _memory_hits[key] = hits
    return len(hits) > RATE_LIMIT_PER_MINUTE


async def rate_limit(request: Request) -> None:
    """Dependência do FastAPI: limita requisições por IP."""
    if RATE_LIMIT_PER_MINUTE <= 0:
        return
    key = f"rl:{request.url.path}:{_client_ip(request)}"
    if await _over_limit(key):
        raise HTTPException(
            status_code=429,
            detail="Muitas requisições. Aguarde um instante antes de tentar novamente.",
            headers={"Retry-After": str(WINDOW_SECONDS)},
        )
