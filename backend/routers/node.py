import logging
from fastapi import APIRouter, HTTPException

from models.graph import NodeDetailRequest, NodeDetailResponse
from services.node_detail_generator import generate_contextual_details
from decorators.cache import cache_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Graph Details"])

@router.post("/node-details", response_model=NodeDetailResponse, summary="Get Contextual Node Details")
@cache_response(expire=86400) 
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