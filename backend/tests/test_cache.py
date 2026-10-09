import asyncio

import pytest

from core.memory_cache import TTLCache
from decorators import cache as cache_module
from decorators.cache import cache_response
from models.graph import GraphResponse, Node, QueryRequest


class FakeRedis:
    def __init__(self, fail=False):
        self.store = {}
        self.fail = fail

    async def get(self, key):
        if self.fail:
            raise ConnectionError("redis down")
        return self.store.get(key)

    async def set(self, key, value, ex=None):
        if self.fail:
            raise ConnectionError("redis down")
        self.store[key] = value


def make_endpoint(delay=0.0):
    calls = {"n": 0}

    @cache_response(expire=60)
    async def endpoint(request: QueryRequest):
        calls["n"] += 1
        await asyncio.sleep(delay)
        return GraphResponse(nodes=[Node(id="a", label=request.query)], edges=[])

    return endpoint, calls


# ------------------------------------------------------------------- decorator
async def test_second_equivalent_request_is_served_from_cache(monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr(cache_module, "redis_client", fake)
    endpoint, calls = make_endpoint()

    first = await endpoint(request=QueryRequest(query="Entropia"))
    second = await endpoint(request=QueryRequest(query="  entropia "))

    assert calls["n"] == 1
    assert len(fake.store) == 1
    assert first.nodes[0].label == "Entropia"
    assert second["nodes"][0]["label"] == "Entropia"


async def test_cache_ignores_accents_and_label_order(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", None)
    endpoint, calls = make_endpoint()

    await endpoint(request=QueryRequest(query="Consciência", existing_node_labels=["B", "á"]))
    await endpoint(request=QueryRequest(query="consciencia", existing_node_labels=["A", "b"]))

    assert calls["n"] == 1


async def test_different_requests_do_not_share_cache(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", FakeRedis())
    endpoint, calls = make_endpoint()

    await endpoint(request=QueryRequest(query="a"))
    await endpoint(request=QueryRequest(query="b"))

    assert calls["n"] == 2


async def test_without_redis_the_memory_cache_still_works(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", None)
    endpoint, calls = make_endpoint()

    await endpoint(request=QueryRequest(query="a"))
    await endpoint(request=QueryRequest(query="a"))

    assert calls["n"] == 1


async def test_redis_failures_do_not_break_the_request(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", FakeRedis(fail=True))
    endpoint, calls = make_endpoint()

    result = await endpoint(request=QueryRequest(query="a"))

    assert calls["n"] == 1
    assert result.nodes[0].label == "a"


async def test_redis_hit_warms_the_memory_cache(monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr(cache_module, "redis_client", fake)
    endpoint, calls = make_endpoint()
    await endpoint(request=QueryRequest(query="a"))
    cache_module.memory_cache.clear()

    await endpoint(request=QueryRequest(query="a"))  # vem do Redis e repovoa a memória
    fake.fail = True
    await endpoint(request=QueryRequest(query="a"))  # Redis fora do ar, memória responde

    assert calls["n"] == 1


async def test_identical_concurrent_requests_share_one_call(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", None)
    endpoint, calls = make_endpoint(delay=0.1)

    results = await asyncio.gather(*(endpoint(request=QueryRequest(query="Entropia")) for _ in range(5)))

    assert calls["n"] == 1
    assert all(r.nodes[0].label == "Entropia" for r in results)
    assert cache_module._inflight == {}


async def test_errors_are_shared_but_never_cached(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", None)
    calls = {"n": 0}

    @cache_response(expire=60)
    async def endpoint(request: QueryRequest):
        calls["n"] += 1
        await asyncio.sleep(0.05)
        raise RuntimeError("falhou")

    results = await asyncio.gather(*(endpoint(request=QueryRequest(query="a")) for _ in range(3)), return_exceptions=True)
    assert all(isinstance(r, RuntimeError) for r in results)
    assert calls["n"] == 1

    with pytest.raises(RuntimeError):
        await endpoint(request=QueryRequest(query="a"))  # tenta de novo: falha não ficou em cache
    assert calls["n"] == 2


# ------------------------------------------------------------------- TTLCache
def test_ttl_cache_expires_entries(monkeypatch):
    now = {"t": 1000.0}
    monkeypatch.setattr("core.memory_cache.time.monotonic", lambda: now["t"])
    cache = TTLCache(max_entries=10)

    cache.set("k", {"v": 1}, ttl=60)
    assert cache.get("k") == {"v": 1}
    now["t"] += 61
    assert cache.get("k") is None
    assert len(cache) == 0


def test_ttl_cache_evicts_least_recently_used():
    cache = TTLCache(max_entries=2)
    cache.set("a", 1, 60)
    cache.set("b", 2, 60)
    cache.get("a")  # 'a' vira o mais recente
    cache.set("c", 3, 60)  # expulsa 'b'

    assert cache.get("a") == 1
    assert cache.get("b") is None
    assert cache.get("c") == 3
