import os
from dotenv import load_dotenv

load_dotenv()


def _list(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


# --- IA ---
# Modelo preferido. Os demais entram como reserva (ver services/ai_router.py).
AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-3.5-flash-lite")
AI_FALLBACK_MODELS = _list(os.getenv("AI_FALLBACK_MODELS", "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest"))
# Tempo máximo de cada tentativa e de todas juntas (o frontend espera até 75s, incluindo o cold start do Render).
AI_ATTEMPT_TIMEOUT_SECONDS = float(os.getenv("AI_ATTEMPT_TIMEOUT_SECONDS", "12"))
AI_TOTAL_TIMEOUT_SECONDS = float(os.getenv("AI_TOTAL_TIMEOUT_SECONDS", "40"))
# Depois de quanto tempo sem resposta o próximo modelo é disparado em paralelo (hedging).
AI_HEDGE_AFTER_SECONDS = float(os.getenv("AI_HEDGE_AFTER_SECONDS", "5"))

# --- CORS ---
# FRONTEND_URL aceita várias origens separadas por vírgula.
FRONTEND_URLS = [u.rstrip("/") for u in _list(os.getenv("FRONTEND_URL", "http://localhost:5173"))]
# Padrão: domínio de produção e previews do projeto no Vercel (synapse-*.vercel.app).
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"https://synapse-[a-z0-9-]+\.vercel\.app") or None

# --- Proteção ---
# Rate limit por IP (janela de 60s) para os endpoints que gastam cota do Gemini.
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "10"))

# --- Cache em memória (usado quando não há Redis) ---
MEMORY_CACHE_MAX_ENTRIES = int(os.getenv("MEMORY_CACHE_MAX_ENTRIES", "256"))
