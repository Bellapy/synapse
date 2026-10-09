import asyncio

import pytest

from core import config
from services import ai_router
from services.ai_router import AIUnavailableError, classify_failure, run_with_fallback


class FakeChain:
    """Imita um Runnable: espera `delay` e então devolve `result` ou levanta `error`."""

    def __init__(self, result=None, error=None, delay=0.0):
        self.result, self.error, self.delay = result, error, delay
        self.cancelled = False

    async def ainvoke(self, _inputs):
        try:
            await asyncio.sleep(self.delay)
        except asyncio.CancelledError:
            self.cancelled = True
            raise
        if self.error:
            raise self.error
        return self.result


@pytest.fixture(autouse=True)
def _models(monkeypatch):
    monkeypatch.setattr(config, "AI_MODEL_NAME", "primary")
    monkeypatch.setattr(config, "AI_FALLBACK_MODELS", ["primary", "backup", "last"])
    monkeypatch.setattr(config, "AI_ATTEMPT_TIMEOUT_SECONDS", 2.0)
    monkeypatch.setattr(config, "AI_TOTAL_TIMEOUT_SECONDS", 5.0)
    monkeypatch.setattr(config, "AI_HEDGE_AFTER_SECONDS", 0.2)


def builder(chains):
    calls = []

    def build(model):
        calls.append(model)
        return chains[model]

    build.calls = calls
    return build


UNAVAILABLE = RuntimeError("503 UNAVAILABLE. This model is currently experiencing high demand.")


async def test_uses_the_preferred_model_first():
    build = builder({"primary": FakeChain("ok-primary")})
    result, model = await run_with_fallback(build, {})
    assert (result, model) == ("ok-primary", "primary")
    assert build.calls == ["primary"]


async def test_candidates_are_deduplicated_and_ordered():
    assert ai_router.candidate_models() == ["primary", "backup", "last"]


async def test_error_falls_through_to_the_next_model_and_penalises_the_failed_one():
    build = builder({"primary": FakeChain(error=UNAVAILABLE), "backup": FakeChain("ok-backup")})
    result, model = await run_with_fallback(build, {})

    assert (result, model) == ("ok-backup", "backup")
    # o modelo que falhou vai para o fim da fila nas próximas requisições
    assert ai_router.candidate_models() == ["backup", "last", "primary"]


async def test_success_clears_a_models_failure_history():
    build = builder({"primary": FakeChain(error=UNAVAILABLE), "backup": FakeChain("ok")})
    await run_with_fallback(build, {})
    ai_router.reset_state()
    build = builder({"primary": FakeChain("ok")})
    _, model = await run_with_fallback(build, {})
    assert model == "primary"


async def test_non_model_errors_do_not_penalise_the_model():
    # erro de parsing/validação é culpa do prompt: tenta o próximo, mas não deixa o modelo de molho
    build = builder({"primary": FakeChain(error=ValueError("grafo vazio")), "backup": FakeChain("ok-backup")})
    _, model = await run_with_fallback(build, {})

    assert model == "backup"
    assert ai_router.candidate_models()[0] == "primary"


async def test_all_models_failing_raises_with_a_summary():
    build = builder({m: FakeChain(error=UNAVAILABLE) for m in ("primary", "backup", "last")})

    with pytest.raises(AIUnavailableError) as excinfo:
        await run_with_fallback(build, {})

    assert "primary" in str(excinfo.value) and "last" in str(excinfo.value)


async def test_hedging_returns_the_fast_model_and_cancels_the_slow_one():
    slow = FakeChain("slow-answer", delay=3.0)
    build = builder({"primary": slow, "backup": FakeChain("fast-answer", delay=0.05)})

    result, model = await run_with_fallback(build, {})

    assert (result, model) == ("fast-answer", "backup")
    await asyncio.sleep(0)  # deixa o cancelamento propagar
    assert slow.cancelled
    # o modelo lento perdeu depois do limiar: fica de molho para não atrasar todo pedido
    assert ai_router.candidate_models()[0] == "backup"


async def test_hedging_does_not_fire_when_the_first_model_is_fast_enough():
    build = builder({"primary": FakeChain("quick", delay=0.05), "backup": FakeChain("never")})
    _, model = await run_with_fallback(build, {})

    assert model == "primary"
    assert build.calls == ["primary"]


async def test_attempt_timeout_counts_as_a_failure(monkeypatch):
    monkeypatch.setattr(config, "AI_ATTEMPT_TIMEOUT_SECONDS", 0.1)
    monkeypatch.setattr(config, "AI_HEDGE_AFTER_SECONDS", 5.0)  # sem hedge: só o timeout
    build = builder({"primary": FakeChain("late", delay=1.0), "backup": FakeChain("ok-backup")})

    _, model = await run_with_fallback(build, {})

    assert model == "backup"


async def test_total_budget_is_respected(monkeypatch):
    monkeypatch.setattr(config, "AI_TOTAL_TIMEOUT_SECONDS", 1.5)
    monkeypatch.setattr(config, "AI_ATTEMPT_TIMEOUT_SECONDS", 5.0)
    build = builder({m: FakeChain("never", delay=10.0) for m in ("primary", "backup", "last")})

    loop = asyncio.get_running_loop()
    started = loop.time()
    with pytest.raises(AIUnavailableError):
        await run_with_fallback(build, {})

    assert loop.time() - started < 3.0


@pytest.mark.parametrize(
    "message,expected_min,expected_max",
    [
        ("429 RESOURCE_EXHAUSTED ... Please retry in 18.03s.", 18, 19),
        ("429 RESOURCE_EXHAUSTED ... Please retry in 2s.", 15, 15),  # piso de 15s
        ("429 RESOURCE_EXHAUSTED sem dica", 60, 60),
        ("503 UNAVAILABLE high demand", 30, 30),
        ("404 NOT_FOUND model", 600, 600),
        ("ValueError: grafo vazio", 0, 0),
    ],
)
def test_classify_failure(message, expected_min, expected_max):
    cooldown = classify_failure(RuntimeError(message), failures=1)
    assert expected_min <= cooldown <= expected_max


def test_cooldown_grows_with_consecutive_failures_up_to_a_cap():
    exc = RuntimeError("503 UNAVAILABLE")
    values = [classify_failure(exc, n) for n in (1, 2, 3, 10)]
    assert values == [30, 60, 120, 600]


async def test_slow_client_construction_does_not_block_the_event_loop():
    """Regressão: criar o cliente do Gemini é lento (SSL) e já travou o servidor inteiro, inclusive o hedge."""
    import time

    def slow_build(_model):
        time.sleep(0.5)  # síncrono, como o construtor real
        return FakeChain(result="ok")

    ticks = []

    async def ticker():
        while True:
            ticks.append(time.monotonic())
            await asyncio.sleep(0.05)

    task = asyncio.create_task(ticker())
    result, _ = await run_with_fallback(slow_build, {})
    task.cancel()

    assert result == "ok"
    gaps = [b - a for a, b in zip(ticks, ticks[1:])]
    assert max(gaps) < 0.3, f"o event loop ficou parado por {max(gaps):.2f}s"
