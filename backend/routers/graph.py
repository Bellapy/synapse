import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from models.graph import GraphResponse, QueryRequest
from models.history import QueryHistory
from database import get_db
from services.graph_generator import generate_graph_from_query
from decorators.cache import cache_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Graph"])

@router.post("/generate-graph", response_model=GraphResponse, summary="Generate or Expand Knowledge Graph")
@cache_response(expire=86400) 
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

    try:
        logger.info("Gerando grafo via IA...")
        graph_data = await generate_graph_from_query(
            request.query, 
            request.existing_node_labels,
            request.expansion_type
        )
        return graph_data
    except Exception as e:
        logger.error(f"Erro detalhado no endpoint /api/generate-graph: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno ao tentar gerar o grafo.")