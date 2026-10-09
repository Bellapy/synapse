import logging
from fastapi import APIRouter, HTTPException, Depends
from core.rate_limit import rate_limit
from sqlalchemy.ext.asyncio import AsyncSession

from models.graph import GraphResponse, QueryRequest
from models.history import QueryHistory
from database import get_db
from services.ai_router import AIUnavailableError
from services.graph_generator import generate_graph_from_query
from decorators.cache import cache_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Graph"])

@router.post("/generate-graph", response_model=GraphResponse, summary="Generate or Expand Knowledge Graph", dependencies=[Depends(rate_limit)])
@cache_response(expire=86400)
async def generate_graph(request: QueryRequest, db: AsyncSession | None = Depends(get_db)):

    if db is not None:
        try:
            db.add(QueryHistory(query=request.query, expansion_type=request.expansion_type))
            await db.commit()
            logger.info(f"Busca salva no PostgreSQL: '{request.query}'")
        except Exception as e:
            logger.error(f"Erro ao salvar histórico no banco de dados: {e}")

    try:
        return await generate_graph_from_query(
            request.query,
            request.known_nodes,
            request.expansion_type,
            request.original_query,
        )
    except AIUnavailableError as e:
        logger.error(f"Todos os modelos de IA falharam em /api/generate-graph: {e}")
        raise HTTPException(status_code=503, detail="A IA está sobrecarregada no momento. Tente novamente em instantes.")
    except Exception as e:
        logger.exception(f"Erro inesperado em /api/generate-graph: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno ao tentar gerar o grafo.")
