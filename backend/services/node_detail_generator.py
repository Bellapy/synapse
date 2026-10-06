import logging

from langchain_core.prompts import ChatPromptTemplate

from core.ai import get_model
from models.graph import NodeDetailLLM, NodeDetailResponse

logger = logging.getLogger(__name__)

PROMPT = """
Você é um especialista em síntese de conhecimento chamado Synapse. Sua tarefa é explicar um conceito de forma contextual.

A dúvida original do usuário foi: "{original_query}"
O conceito que ele quer entender agora é: "{node_label}"

Sua resposta deve ter 3 partes:
1.  `label`: Apenas o nome do conceito, "{node_label}".
2.  `type_tag`: Uma etiqueta curta e precisa que classifique este conceito (Ex: "Conceito Filosófico", "Físico Teórico", "Obra Literária", "Viés Cognitivo").
3.  `contextual_summary`: Um resumo inteligente. NÃO dê uma definição de dicionário. Explique como o conceito "{node_label}" se relaciona, responde ou ilumina a dúvida original do usuário: "{original_query}". Seja profundo, conciso e conecte as ideias.
"""


async def generate_contextual_details(original_query: str, node_label: str) -> NodeDetailResponse:
    """Gera detalhes contextuais de um nó, baseado na pergunta original do usuário."""
    chain = ChatPromptTemplate.from_template(PROMPT) | get_model(0.3).with_structured_output(NodeDetailLLM)

    try:
        response = await chain.ainvoke({"original_query": original_query, "node_label": node_label})
    except Exception:
        logger.exception("Erro ao gerar detalhes do nó com a IA")
        raise

    return NodeDetailResponse(
        label=response.label,
        type_tag=response.type_tag,
        contextual_summary=response.contextual_summary,
        connections=[],  # preenchido no frontend a partir do grafo atual
    )
