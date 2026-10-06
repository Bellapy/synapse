import os
from dotenv import load_dotenv

load_dotenv()

AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-3.5-flash-lite")
AI_TIMEOUT_SECONDS = int(os.getenv("AI_TIMEOUT_SECONDS", "45"))
AI_MAX_RETRIES = int(os.getenv("AI_MAX_RETRIES", "2"))

# CORS: FRONTEND_URL aceita várias origens separadas por vírgula.
FRONTEND_URLS = [u.strip().rstrip("/") for u in os.getenv("FRONTEND_URL", "http://localhost:5173").split(",") if u.strip()]
# Padrão: domínio de produção e previews do projeto no Vercel (synapse-*.vercel.app).
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"https://synapse-[a-z0-9-]+\.vercel\.app") or None

# Rate limit por IP (janela de 60s) para os endpoints que gastam cota do Gemini.
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "10"))
