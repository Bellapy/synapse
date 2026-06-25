import os
import json
import hashlib
import logging
import redis.asyncio as redis
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from models.graph import GraphResponse, QueryRequest, NodeDetailRequest, NodeDetailResponse
from services.graph_generator import generate_graph_from_query
from services.node_detail_generator import generate_contextual_details
from database import get_db
from models.history import QueryHistory

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

app = FastAPI(
    title="Synapse API",
    description="API para gerar e interagir com grafos de conhecimento dinâmicos.",
    version="1.0.0", 
    docs_url="/api/docs", 
    redoc_url="/api/redoc"
)

origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

vercel_url = os.getenv("VERCEL_URL")
if vercel_url:
    origins.append(f"https://{vercel_url}")
    origins.append(f"https://{vercel_url.split('-git-')[0]}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", summary="Health Check", tags=["System"])
def read_root():
    return {"status": "ok"}


@app.post("/api/generate-graph", response_model=GraphResponse, summary="Generate or Expand Knowledge Graph", tags=["Graph"])
async def generate_graph(request: QueryRequest, db: AsyncSession = Depends(get_db)):

    try:
        new_history = QueryHistory(
            query=request.query,
            expansion_type=request.expansion_type
        )
        db.add(new_history)
        await db.commit()
        logger.info(f"Busca salva no PostgreSQL: '{request.query}'")
    except Exception as e:
        logger.error(f"Erro ao salvar histórico no banco de dados: {e}")

    req_dict = request.model_dump()
    req_string = json.dumps(req_dict, sort_keys=True)
    cache_key = f"graph_cache:{hashlib.md5(req_string.encode()).hexdigest()}"

    try:
        cached_result = await redis_client.get(cache_key)
        if cached_result:
            logger.info("Retornando grafo do Redis.")
            return json.loads(cached_result)

        logger.info("Gerando via IA...")
        graph_data = await generate_graph_from_query(
            request.query, 
            request.existing_node_labels,
            request.expansion_type
        )

        await redis_client.set(cache_key, graph_data.model_dump_json(), ex=86400)
        
        return graph_data
    except Exception as e:
        logger.error(f"Erro detalhado no endpoint /api/generate-graph: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno ao tentar gerar o grafo.")


@app.post("/api/node-details", response_model=NodeDetailResponse, summary="Get Contextual Node Details", tags=["Graph"])
async def get_node_details(request: NodeDetailRequest):

    try:
        details_from_ai = await generate_contextual_details(
            request.original_query,
            request.node_label
        )
        return details_from_ai
    except Exception as e:
        logger.error(f"Erro detalhado no endpoint /api/node-details: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno ao obter os detalhes do nó.")


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)