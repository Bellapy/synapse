"""Transforma a saída crua do modelo (GraphLLM) no contrato da API (GraphResponse).

O modelo só decide *conteúdo* (nós, relações). Tudo que é mecânico fica aqui, em código determinístico e testável:
atribuição de `origin`, unicidade de ids, remoção de duplicatas e de arestas inválidas, reaproveitamento de nós que
já existem no grafo e resolução do nó de origem (`__origin__`).
"""
from typing import Dict, List

from core.text import normalize, slugify
from models.graph import Edge, ExistingNode, GraphLLM, GraphResponse, Node

ORIGIN_PLACEHOLDER = "__origin__"

MAX_NEW_NODES = {"initial": 8, "general": 5, "counter": 3}
MAX_RELATION_CHARS = 40


class InvalidGraphError(ValueError):
    """A resposta do modelo não rende um grafo utilizável (ex.: só repetiu nós existentes)."""


def _relation(text: str) -> str:
    return " ".join(text.split())[:MAX_RELATION_CHARS] or "relaciona-se com"


def _unique_id(wanted: str, taken: set) -> str:
    candidate, n = wanted, 2
    while candidate in taken:
        candidate = f"{wanted}_{n}"
        n += 1
    taken.add(candidate)
    return candidate


def _dedupe_edges(edges: List[Edge]) -> List[Edge]:
    seen, result = set(), []
    for edge in edges:
        key = (edge.source, edge.target)
        if edge.source == edge.target or key in seen:
            continue
        seen.add(key)
        result.append(edge)
    return result


def build_initial_graph(raw: GraphLLM, query: str) -> GraphResponse:
    """Primeira busca: o primeiro nó é o tema central."""
    taken: set = set()
    alias: Dict[str, str] = {}
    seen_labels: Dict[str, str] = {}
    nodes: List[Node] = []

    for node in raw.nodes:
        label = " ".join(node.label.split())
        norm = normalize(label)
        if not label or norm in seen_labels:
            if label:
                alias[node.id] = seen_labels[norm]
            continue
        if len(nodes) >= MAX_NEW_NODES["initial"]:
            break
        new_id = _unique_id(slugify(label), taken)
        alias[node.id] = new_id
        seen_labels[norm] = new_id
        nodes.append(Node(id=new_id, label=label, origin="initial"))

    edges = _dedupe_edges([
        Edge(source=alias[e.source], target=alias[e.target], relation=_relation(e.relation), origin="initial")
        for e in raw.edges
        if e.source in alias and e.target in alias
    ])

    connected = {e.source for e in edges} | {e.target for e in edges}
    nodes = [n for i, n in enumerate(nodes) if n.id in connected or i == 0]
    if len(nodes) < 2 or not edges:
        raise InvalidGraphError("grafo inicial sem nós/arestas suficientes")
    return GraphResponse(nodes=nodes, edges=edges)


def build_expansion(
    raw: GraphLLM,
    query: str,
    known: List[ExistingNode],
    expansion_type: str,
) -> GraphResponse:
    """Expansão ou contra-argumento a partir do nó `query`.

    A resposta traz um nó "âncora" com o rótulo de `query`: o frontend junta nós pelo rótulo, então a âncora
    se funde ao nó que já existe e as arestas novas se ligam a ele.
    """
    kind = expansion_type if expansion_type in ("general", "counter") else "general"
    known_by_label = {normalize(n.label): n.id for n in known}
    known_ids = {n.id for n in known}
    origin_id = known_by_label.get(normalize(query)) or slugify(query)

    taken = set(known_ids) | {origin_id}
    alias: Dict[str, str] = {ORIGIN_PLACEHOLDER: origin_id}
    new_nodes: List[Node] = []
    seen_new: set = set()

    for node in raw.nodes:
        label = " ".join(node.label.split())
        norm = normalize(label)
        if not label:
            continue
        if norm == normalize(query):
            alias[node.id] = origin_id
        elif norm in known_by_label:
            alias[node.id] = known_by_label[norm]
        elif norm in seen_new:
            continue
        elif len(new_nodes) < MAX_NEW_NODES[kind]:
            new_id = _unique_id(slugify(label), taken)
            alias[node.id] = new_id
            seen_new.add(norm)
            new_nodes.append(Node(id=new_id, label=label, origin=kind))

    # ids de nós existentes podem ser citados diretamente pelo modelo
    for known_id in known_ids:
        alias.setdefault(known_id, known_id)

    edges = _dedupe_edges([
        Edge(source=alias[e.source], target=alias[e.target], relation=_relation(e.relation), origin=kind)
        for e in raw.edges
        if e.source in alias and e.target in alias
    ])

    connected = {e.source for e in edges} | {e.target for e in edges}
    new_nodes = [n for n in new_nodes if n.id in connected]
    if not new_nodes:
        raise InvalidGraphError("a expansão não trouxe nós novos")

    new_ids = {n.id for n in new_nodes}
    edges = [e for e in edges if e.source in new_ids or e.target in new_ids or origin_id in (e.source, e.target)]

    anchor = Node(id=origin_id, label=query, origin="initial")
    return GraphResponse(nodes=[anchor, *new_nodes], edges=edges)


def build_graph(
    raw: GraphLLM,
    query: str,
    known: List[ExistingNode],
    expansion_type: str,
) -> GraphResponse:
    if expansion_type == "counter" or known:
        return build_expansion(raw, query, known, expansion_type)
    return build_initial_graph(raw, query)
