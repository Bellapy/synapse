import pytest

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


def make_endpoint():
    calls = {"n": 0}

    @cache_response(expire=60)
    async def endpoint(request: QueryRequest):
        calls["n"] += 1
        return GraphResponse(nodes=[Node(id="a", label=request.query, summary="s")], edges=[])

    return endpoint, calls


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


async def test_different_requests_do_not_share_cache(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", FakeRedis())
    endpoint, calls = make_endpoint()

    await endpoint(request=QueryRequest(query="a"))
    await endpoint(request=QueryRequest(query="b"))

    assert calls["n"] == 2


async def test_without_redis_the_function_always_runs(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", None)
    endpoint, calls = make_endpoint()

    await endpoint(request=QueryRequest(query="a"))
    await endpoint(request=QueryRequest(query="a"))

    assert calls["n"] == 2


async def test_redis_failures_do_not_break_the_request(monkeypatch):
    monkeypatch.setattr(cache_module, "redis_client", FakeRedis(fail=True))
    endpoint, calls = make_endpoint()

    result = await endpoint(request=QueryRequest(query="a"))

    assert calls["n"] == 1
    assert result.nodes[0].label == "a"
