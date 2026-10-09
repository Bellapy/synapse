import asyncio
import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import FRONTEND_URLS, CORS_ORIGIN_REGEX
from core.redis import redis_client
from database import engine
from core.ai import prewarm_models
from routers import graph, node

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Em segundo plano: o servidor já atende (ex.: /api/health acorda o Render) enquanto os clientes de IA esquentam.
    warmup = asyncio.create_task(asyncio.to_thread(prewarm_models))
    warmup.add_done_callback(lambda t: not t.cancelled() and t.exception() and logger.warning("Pré-aquecimento da IA falhou: %s", t.exception()))
    yield


app = FastAPI(
    lifespan=lifespan,
    title="Synapse API",
    description="API para gerar e interagir com grafos de conhecimento dinâmicos.",
    version="1.0.0", 
    docs_url="/api/docs", 
    redoc_url="/api/redoc"
)

# Origens liberadas: FRONTEND_URL (lista separada por vírgula), localhost em dev e,
# opcionalmente, um regex (ex.: previews do Vercel) via CORS_ORIGIN_REGEX.
origins = list({*FRONTEND_URLS, "http://localhost:5173", "http://127.0.0.1:5173"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

@app.get("/api/health", summary="Health Check", tags=["System"])
def read_root():
    return {"status": "ok", "cache": redis_client is not None, "history": engine is not None}

app.include_router(graph.router)
app.include_router(node.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, proxy_headers=True, forwarded_allow_ips="*")