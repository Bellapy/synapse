# backend/services/graph_generator.py
import logging
from typing import List, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda

from core.ai import LANGUAGE_RULE, get_model
from models.graph import ExistingNode, GraphLLM, GraphResponse
from services.ai_router import run_with_fallback
from services.graph_postprocess import build_graph

logger = logging.getLogger(__name__)

# Escolhas de projeto (ver scripts/benchmark_ai.py):
# - o modelo não escreve resumos nem 'origin': o painel busca o texto sob demanda e `origin` é atribuído em código;
#   isso corta ~30% dos tokens na busca inicial e ~70% na expansão;
# - responde no idioma da pergunta (antes o grafo e o painel podiam sair em idiomas diferentes);
# - nós existentes entram com id, permitindo ligações entre ramos; o tema original mantém a expansão no assunto.
PROMPTS = {
    "initial": (
        "Você constrói mapas de conceitos.\n"
        'Pergunta ou tema: "{query}"\n\n'
        "Regras:\n"
        f"- {LANGUAGE_RULE}\n"
        "- Exatamente 6 nós. O primeiro é o tema central, nomeado como um conceito curto (1 a 4 palavras; não copie a "
        "pergunta inteira). Os outros 5 são conceitos, pessoas, teorias ou áreas distintas e essenciais para entendê-lo.\n"
        "- 7 a 9 arestas com relações significativas. Nem todo nó deve se ligar ao central: conecte também os conceitos "
        "entre si.\n"
        "- Todo nó precisa ter ao menos uma aresta. Use somente ids dos nós que você criou."
    ),
    "general": (
        "Você expande mapas de conceitos.\n"
        'Tema geral do mapa: "{context}"\n'
        'Nó a expandir: "{query}"\n'
        "Nós existentes (id = nome):\n{existing}\n\n"
        "Regras:\n"
        f"- {LANGUAGE_RULE}\n"
        '- Crie exatamente 4 NOVOS nós que aprofundem "{query}" com ideias diferentes das existentes. '
        "Não repita nem reformule nenhum nó existente.\n"
        '- Arestas: cada novo nó se liga a "{query}" (use o id "__origin__"). Você também pode ligar novos nós entre si '
        "ou a nós existentes (use o id exato)."
    ),
    "counter": (
        "Você é um especialista em dialética e expande mapas de conceitos com contrapontos.\n"
        'Tema geral do mapa: "{context}"\n'
        'Nó a contestar: "{query}"\n'
        "Nós existentes (id = nome):\n{existing}\n\n"
        "Regras:\n"
        f"- {LANGUAGE_RULE}\n"
        '- Crie exatamente 2 NOVOS nós que contestem "{query}" com um contraponto sólido (crítica, teoria rival ou '
        "contraexemplo). Não repita nós existentes.\n"
        '- Cada novo nó se liga a "{query}" (use o id "__origin__") com uma relação de oposição '
        "(ex.: contesta, refuta, contradiz)."
    ),
}


def _prompt_kind(known: List[ExistingNode], expansion_type: str) -> str:
    if expansion_type == "counter":
        return "counter"
    return "general" if known else "initial"


async def generate_graph_from_query(
    query: str,
    known_nodes: Optional[List[ExistingNode]] = None,
    expansion_type: str = "general",
    original_query: Optional[str] = None,
) -> GraphResponse:
    known = known_nodes or []
    kind = _prompt_kind(known, expansion_type)
    template = ChatPromptTemplate.from_template(PROMPTS[kind])

    inputs = {
        "query": query,
        "context": original_query or query,
        "existing": "\n".join(f"- {n.id} = {n.label}" for n in known) or "(nenhum)",
    }

    def build(model: str):
        llm = get_model(model, 0.6, 1000).with_structured_output(GraphLLM)
        postprocess = RunnableLambda(lambda raw: build_graph(raw, query, known, expansion_type))
        return template | llm | postprocess

    graph, model = await run_with_fallback(build, inputs)
    logger.info("Grafo '%s' (%s) gerado por %s: %d nós, %d arestas", query, kind, model, len(graph.nodes), len(graph.edges))
    return graph
