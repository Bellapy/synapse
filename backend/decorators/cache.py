import asyncio
import json
import hashlib
import logging
from functools import wraps

from core.config import MEMORY_CACHE_MAX_ENTRIES
from core.memory_cache import TTLCache
from core.redis import redis_client

logger = logging.getLogger(__name__)

memory_cache = TTLCache(MEMORY_CACHE_MAX_ENTRIES)
_inflight: dict[str, "asyncio.Task"] = {}


def cache_response(expire: int = 86400):
    """Cache em duas camadas (memória -> Redis, se configurado) + deduplicação de requisições simultâneas.

    Duas requisições idênticas ao mesmo tempo compartilham uma única chamada à IA.
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request_obj = kwargs.get("request")
            if not request_obj:
                return await func(*args, **kwargs)

            # Usa a forma canônica (ignora caixa/espaços/ordem) quando o modelo a define.
            payload = getattr(request_obj, "cache_payload", None)
            req_dict = payload() if payload else request_obj.model_dump()
            req_string = json.dumps(req_dict, sort_keys=True)
            cache_key = f"{func.__name__}_cache:{hashlib.md5(req_string.encode()).hexdigest()}"

            cached = memory_cache.get(cache_key)
            if cached is not None:
                logger.info("Cache de memória (%s).", func.__name__)
                return cached

            if redis_client is not None:
                try:
                    cached_result = await redis_client.get(cache_key)
                    if cached_result:
                        logger.info("Cache do Redis (%s).", func.__name__)
                        value = json.loads(cached_result)
                        memory_cache.set(cache_key, value, expire)
                        return value
                except Exception as e:
                    logger.error(f"Erro ao ler do Redis: {e}")

            # Já há uma chamada idêntica em andamento: espera por ela em vez de gastar outra chamada de IA.
            running = _inflight.get(cache_key)
            if running is not None:
                logger.info("Requisição idêntica em andamento (%s): compartilhando resultado.", func.__name__)
                result = await asyncio.shield(running)
                return result

            task = asyncio.ensure_future(func(*args, **kwargs))
            _inflight[cache_key] = task
            task.add_done_callback(lambda _t, k=cache_key: _inflight.pop(k, None))

            result = await asyncio.shield(task)

            serialized = result.model_dump_json()
            memory_cache.set(cache_key, json.loads(serialized), expire)
            if redis_client is not None:
                try:
                    await redis_client.set(cache_key, serialized, ex=expire)
                except Exception as e:
                    logger.error(f"Erro ao salvar no Redis: {e}")

            return result
        return wrapper
    return decorator
