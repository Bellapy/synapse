import logging

from langchain_core.prompts import ChatPromptTemplate

from core.ai import DETAIL_LLM, LANGUAGE_RULE, get_model
from models.graph import NodeDetailLLM, NodeDetailResponse
from services.ai_router import run_with_fallback

logger = logging.getLogger(__name__)

# Mais curto que a versão anterior (~25% menos tokens) e com idioma alinhado ao do grafo.
PROMPT = (
    'Mapa de conceitos sobre: "{original_query}". O usuário clicou no conceito "{node_label}".\n'
    f"{LANGUAGE_RULE}\n"
    "- label: o nome do conceito.\n"
    "- type_tag: categoria em 2 a 3 palavras (ex.: Conceito Filosófico, Viés Cognitivo, Obra Literária).\n"
    '- contextual_summary: 2 a 3 frases (no máximo 60 palavras) explicando como "{node_label}" se relaciona com '
    '"{original_query}". Não defina o termo como um dicionário; vá direto à relação.'
)


async def generate_contextual_details(original_query: str, node_label: str) -> NodeDetailResponse:
    """Gera detalhes contextuais de um nó, baseado na pergunta original do usuário."""
    template = ChatPromptTemplate.from_template(PROMPT)

    def build(model: str):
        return template | get_model(model, *DETAIL_LLM).with_structured_output(NodeDetailLLM)

    response, model = await run_with_fallback(build, {"original_query": original_query, "node_label": node_label})
    logger.info("Detalhes de '%s' gerados por %s", node_label, model)

    return NodeDetailResponse(
        label=response.label,
        type_tag=response.type_tag,
        contextual_summary=response.contextual_summary,
        connections=[],  # preenchido no frontend a partir do grafo atual
    )
