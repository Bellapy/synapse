import json
import hashlib
import logging
from functools import wraps
from core.redis import redis_client

logger = logging.getLogger(__name__)

def cache_response(expire: int = 86400):
  
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):

            request_obj = kwargs.get("request")
            if not request_obj:
         
                return await func(*args, **kwargs)

            req_dict = request_obj.model_dump()
            req_string = json.dumps(req_dict, sort_keys=True)
            cache_key = f"{func.__name__}_cache:{hashlib.md5(req_string.encode()).hexdigest()}"

            try:
                cached_result = await redis_client.get(cache_key)
                if cached_result:
                    logger.info(f"Retornando cache ({func.__name__}) do Redis.")
                    return json.loads(cached_result)
            except Exception as e:
                logger.error(f"Erro ao ler do Redis: {e}")

            result = await func(*args, **kwargs)

            try:
                await redis_client.set(cache_key, result.model_dump_json(), ex=expire)
            except Exception as e:
                logger.error(f"Erro ao salvar no Redis: {e}")

            return result
        return wrapper
    return decorator