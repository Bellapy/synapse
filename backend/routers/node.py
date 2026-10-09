import logging
from fastapi import APIRouter, HTTPException, Depends
from core.rate_limit import rate_limit

from models.graph import NodeDetailRequest, NodeDetailResponse
from services.ai_router import AIUnavailableError
from services.node_detail_generator import generate_contextual_details
from decorators.cache import cache_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Graph Details"])

@router.post("/node-details", response_model=NodeDetailResponse, summary="Get Contextual Node Details", dependencies=[Depends(rate_limit)])
@cache_response(expire=86400)
async def get_node_details(request: NodeDetailRequest):
    try:
        return await generate_contextual_details(request.original_query, request.node_label)
    except AIUnavailableError as e:
        logger.error(f"Todos os modelos de IA falharam em /api/node-details: {e}")
        raise HTTPException(status_code=503, detail="A IA está sobrecarregada no momento. Tente novamente em instantes.")
    except Exception as e:
        logger.exception(f"Erro inesperado em /api/node-details: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno ao obter os detalhes do nó.")
