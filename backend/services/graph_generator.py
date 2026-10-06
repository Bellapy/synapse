# backend/services/graph_generator.py

import logging
from typing import List, Optional

from langchain_core.prompts import ChatPromptTemplate

from core.ai import get_model
from models.graph import GraphResponse

logger = logging.getLogger(__name__)

PROMPTS = {
    "counter": """
Você é um especialista em dialética. A partir do conceito de origem "{query}", gere 1 ou 2 NOVOS nós que representem um forte contra-argumento.
O grafo atual já contém: [{existing_nodes}]. NÃO gere nós que já existem.
Crie arestas que conectem os novos nós ao nó de origem "{query}".

A lista de 'nodes' DEVE incluir o(s) novo(s) nó(s) E o nó de origem "{query}".
Para TODOS os novos nós e arestas gerados, defina o campo "origin" como "counter".
Para o nó de origem "{query}" incluído, mantenha seu "origin" original.
""",
    "general": """
Você é um arquiteto do conhecimento. A partir do conceito de origem "{query}", gere de 3 a 5 NOVOS nós relacionados.
O grafo atual já contém: [{existing_nodes}]. NÃO gere nós que já existem.
Crie arestas que conectem os novos nós ao nó de origem "{query}".

A lista de 'nodes' DEVE incluir o(s) novo(s) nó(s) E o nó de origem "{query}".
Para TODOS os novos nós e arestas gerados, defina o campo "origin" como "general".
Para o nó de origem "{query}" incluído, mantenha seu "origin" original.
""",
    "initial": """
Você é um arquiteto do conhecimento. Para a pergunta do usuário: "{query}", gere um grafo de conhecimento inicial.

1. Gere de 5 a 7 nós interconectados. Cada nó deve ter um id, label, type, summary.
2. Gere as arestas que conectam esses nós. Cada aresta deve ter um source, target, relation.
3. Para TODOS os nós e arestas gerados nesta primeira resposta, defina o campo "origin" como "initial".
""",
}


def _select_prompt(existing_node_labels: Optional[List[str]], expansion_type: str) -> str:
    if expansion_type == "counter":
        return PROMPTS["counter"]
    if existing_node_labels:
        return PROMPTS["general"]
    return PROMPTS["initial"]


async def generate_graph_from_query(query: str, existing_node_labels: Optional[List[str]] = None, expansion_type: str = "general") -> GraphResponse:
    prompt = ChatPromptTemplate.from_template(_select_prompt(existing_node_labels, expansion_type))
    chain = prompt | get_model(0.6).with_structured_output(GraphResponse)

    existing_nodes_str = ", ".join(f"'{label}'" for label in existing_node_labels) if existing_node_labels else ""

    try:
        return await chain.ainvoke({"query": query, "existing_nodes": existing_nodes_str})
    except Exception:
        logger.exception("Erro ao gerar o grafo com a IA")
        raise
