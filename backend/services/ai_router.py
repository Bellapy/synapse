"""Roteador de modelos: tenta o modelo preferido e cai para reservas, com disjuntor (circuit breaker).

Por que existe: em produção o Gemini devolve 503 ("high demand") e 429 (cota por minuto) com frequência, e a cauda
de latência chega a 10-15s mesmo quando a mediana é ~2s. Em vez de esperar/retentar o mesmo modelo, falhamos rápido
e tentamos o próximo; um modelo que falhou fica de molho por um tempo (crescente) para não atrasar as próximas
requisições.
"""
import asyncio
import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Callable

from core import config

logger = logging.getLogger(__name__)


class AIUnavailableError(Exception):
    """Todos os modelos falharam (ou o orçamento de tempo acabou)."""


@dataclass
class _Health:
    failures: int = 0
    unhealthy_until: float = 0.0


_health: dict[str, _Health] = {}

_RETRY_IN = re.compile(r"retry in (\d+(?:\.\d+)?)s", re.IGNORECASE)
_MAX_COOLDOWN = 600.0


def reset_state() -> None:
    _health.clear()


def classify_failure(exc: BaseException, failures: int) -> float:
    """Quanto tempo (s) o modelo deve ficar de molho depois deste erro. 0 = não penaliza."""
    text = f"{type(exc).__name__} {exc}"
    lowered = text.lower()

    if "429" in text or "RESOURCE_EXHAUSTED" in text:
        match = _RETRY_IN.search(text)
        suggested = float(match.group(1)) if match else 60.0
        return min(max(suggested, 15.0), 120.0)

    if isinstance(exc, (asyncio.TimeoutError, TimeoutError)) or "timeout" in lowered or "timed out" in lowered:
        return min(20.0 * 2 ** max(failures - 1, 0), _MAX_COOLDOWN)

    if any(code in text for code in ("503", "500", "502", "504", "UNAVAILABLE", "INTERNAL", "DEADLINE")):
        return min(30.0 * 2 ** max(failures - 1, 0), _MAX_COOLDOWN)

    if any(code in text for code in ("404", "NOT_FOUND", "403", "PERMISSION_DENIED")):
        return _MAX_COOLDOWN  # modelo inexistente ou sem acesso: não adianta insistir

    return 0.0  # erro de parsing/validação etc.: é do prompt, não do modelo


def candidate_models() -> list[str]:
    """Ordem de tentativa: preferido, depois reservas; modelos de molho vão para o fim (último recurso)."""
    ordered: list[str] = []
    for name in [config.AI_MODEL_NAME, *config.AI_FALLBACK_MODELS]:
        if name and name not in ordered:
            ordered.append(name)

    now = time.monotonic()
    healthy = [m for m in ordered if _health.get(m, _Health()).unhealthy_until <= now]
    resting = [m for m in ordered if m not in healthy]
    return healthy + resting


def _mark_ok(model: str) -> None:
    _health[model] = _Health()


def _mark_failed(model: str, exc: BaseException) -> float:
    health = _health.setdefault(model, _Health())
    health.failures += 1
    cooldown = classify_failure(exc, health.failures)
    if cooldown > 0:
        health.unhealthy_until = time.monotonic() + cooldown
    else:
        health.failures -= 1  # não conta como falha do modelo
    return cooldown


async def run_with_fallback(build: Callable[[str], Any], inputs: dict) -> tuple[Any, str]:
    """Executa `build(model).ainvoke(inputs)` até um modelo responder. Retorna (resultado, modelo usado).

    - falha rápida: um erro leva imediatamente ao próximo modelo;
    - hedging: se o modelo atual passa de `AI_HEDGE_AFTER_SECONDS` sem responder, o próximo é disparado em paralelo
      e vale quem responder primeiro (a "cauda" lenta do Gemini chega a 10-15s com mediana de ~2s, e o 503 de alta
      demanda só é devolvido depois de ~10s). O custo extra de cota só existe nos casos lentos.
    """
    deadline = time.monotonic() + config.AI_TOTAL_TIMEOUT_SECONDS
    queue = candidate_models()
    running: dict[asyncio.Task, tuple[str, float]] = {}
    failures: list[str] = []

    async def attempt(model: str) -> Any:
        # Montar o cliente do Gemini é síncrono e pesado (cria o contexto SSL, que no Windows lê o repositório de
        # certificados e já levou dezenas de segundos). Fora do event loop, nada mais fica parado esperando por isso.
        chain = await asyncio.to_thread(build, model)
        return await chain.ainvoke(inputs)

    def launch() -> bool:
        remaining = deadline - time.monotonic()
        if not queue or remaining < 1.0:
            return False
        model = queue.pop(0)
        timeout = min(config.AI_ATTEMPT_TIMEOUT_SECONDS, remaining)
        task = asyncio.ensure_future(asyncio.wait_for(attempt(model), timeout=timeout))
        running[task] = (model, time.monotonic())
        return True

    try:
        launch()
        while running:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            wait_for = min(config.AI_HEDGE_AFTER_SECONDS, remaining) if queue else remaining
            done, _ = await asyncio.wait(running, timeout=wait_for, return_when=asyncio.FIRST_COMPLETED)

            if not done:
                # Ninguém respondeu a tempo: dispara o próximo modelo sem abandonar os que estão em andamento.
                if not launch() and not running:
                    break
                continue

            for task in done:
                model, started = running.pop(task)
                elapsed = time.monotonic() - started
                try:
                    result = task.result()
                except Exception as exc:  # noqa: BLE001 - qualquer falha de um modelo leva ao próximo
                    cooldown = _mark_failed(model, exc)
                    summary = f"{model}: {type(exc).__name__}: {str(exc)[:160]}"
                    failures.append(summary)
                    logger.warning("Modelo falhou após %.1fs (cooldown %.0fs) - %s", elapsed, cooldown, summary)
                    continue

                _mark_ok(model)
                logger.info("IA ok com %s em %.1fs", model, elapsed)
                return result, model

            if not running:
                launch()  # tudo que estava em andamento falhou: tenta o próximo da fila
    finally:
        for task, (model, started) in running.items():
            task.cancel()  # perdedores do hedge ou orçamento esgotado: não gasta mais nada
            if time.monotonic() - started >= config.AI_HEDGE_AFTER_SECONDS:
                # Passou do limiar sem responder e perdeu para outro modelo: trata como lento, senão todo pedido
                # voltaria a pagar a espera do hedge neste mesmo modelo.
                cooldown = _mark_failed(model, asyncio.TimeoutError("lento demais (perdeu o hedge)"))
                logger.warning("Modelo %s lento: de molho por %.0fs", model, cooldown)

    raise AIUnavailableError("; ".join(failures) or "sem tempo restante para tentar um modelo")
