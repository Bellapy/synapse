import pytest

from models.graph import ExistingNode, GraphLLM, LLMEdge, LLMNode
from services.graph_postprocess import InvalidGraphError, build_expansion, build_graph, build_initial_graph


def graph(nodes, edges):
    return GraphLLM(
        nodes=[LLMNode(id=i, label=l) for i, l in nodes],
        edges=[LLMEdge(source=s, target=t, relation=r) for s, t, r in edges],
    )


# ----------------------------------------------------------------------------- busca inicial
def test_initial_assigns_origin_and_normalises_ids():
    raw = graph(
        [("Céu Azul!", "Céu Azul"), ("luz", "Luz Solar"), ("atm", "Atmosfera")],
        [("Céu Azul!", "luz", "depende de"), ("luz", "atm", "atravessa")],
    )
    result = build_initial_graph(raw, "por que o céu é azul")

    assert [n.id for n in result.nodes] == ["ceu_azul", "luz_solar", "atmosfera"]
    assert {n.origin for n in result.nodes} == {"initial"}
    assert {e.origin for e in result.edges} == {"initial"}
    assert result.edges[0].source == "ceu_azul"


def test_initial_merges_duplicate_labels_ignoring_accents_and_case():
    raw = graph(
        [("a", "Consciência"), ("b", "consciencia"), ("c", "Qualia")],
        [("a", "c", "possui"), ("b", "c", "tem")],
    )
    result = build_initial_graph(raw, "x")

    assert [n.label for n in result.nodes] == ["Consciência", "Qualia"]
    assert len(result.edges) == 1  # as duas arestas viraram a mesma


def test_initial_drops_dangling_self_loop_and_duplicate_edges():
    raw = graph(
        [("a", "A"), ("b", "B")],
        [("a", "b", "r"), ("a", "b", "r de novo"), ("a", "a", "si mesmo"), ("a", "zzz", "fantasma")],
    )
    result = build_initial_graph(raw, "x")

    assert len(result.edges) == 1


def test_initial_removes_isolated_nodes_but_keeps_the_central_one():
    raw = graph([("a", "A"), ("b", "B"), ("c", "C")], [("a", "b", "r")])
    assert [n.id for n in build_initial_graph(raw, "x").nodes] == ["a", "b"]


def test_initial_caps_the_number_of_nodes():
    nodes = [(f"n{i}", f"Nó {i}") for i in range(15)]
    edges = [("n0", f"n{i}", "liga") for i in range(1, 15)]
    assert len(build_initial_graph(graph(nodes, edges), "x").nodes) == 8


def test_initial_without_usable_edges_is_invalid():
    with pytest.raises(InvalidGraphError):
        build_initial_graph(graph([("a", "A"), ("b", "B")], []), "x")


# ----------------------------------------------------------------------------- expansão
KNOWN = [
    ExistingNode(id="consciencia", label="Consciência"),
    ExistingNode(id="qualia", label="Qualia"),
    ExistingNode(id="atencao", label="Atenção"),
]


def test_expansion_returns_an_anchor_with_the_origin_label_and_known_id():
    raw = graph([("meditacao", "Meditação")], [("__origin__", "meditacao", "modifica")])
    result = build_expansion(raw, "Consciência", KNOWN, "general")

    anchor, new = result.nodes
    assert (anchor.id, anchor.label) == ("consciencia", "Consciência")
    assert new.origin == "general"
    assert result.edges[0].source == "consciencia"
    assert result.edges[0].origin == "general"


def test_expansion_reuses_existing_nodes_instead_of_duplicating_them():
    raw = graph(
        [("q2", "qualia"), ("novo", "Panpsiquismo")],  # 'qualia' já existe (caixa diferente)
        [("__origin__", "novo", "inclui"), ("novo", "q2", "explica")],
    )
    result = build_expansion(raw, "Consciência", KNOWN, "general")

    assert [n.label for n in result.nodes] == ["Consciência", "Panpsiquismo"]
    assert ("panpsiquismo", "qualia") in {(e.source, e.target) for e in result.edges}


def test_expansion_keeps_cross_links_to_existing_nodes_by_id():
    raw = graph([("n", "Neurociência")], [("__origin__", "n", "inclui"), ("n", "atencao", "estuda")])
    result = build_expansion(raw, "Consciência", KNOWN, "general")

    assert ("neurociencia", "atencao") in {(e.source, e.target) for e in result.edges}


def test_expansion_drops_edges_to_unknown_ids():
    raw = graph([("n", "Neurociência")], [("__origin__", "n", "inclui"), ("n", "id_inventado", "liga")])
    result = build_expansion(raw, "Consciência", KNOWN, "general")

    assert len(result.edges) == 1


def test_expansion_that_only_repeats_existing_nodes_is_invalid():
    raw = graph([("a", "Qualia"), ("b", "Atenção")], [("__origin__", "a", "r")])
    with pytest.raises(InvalidGraphError):
        build_expansion(raw, "Consciência", KNOWN, "general")


def test_expansion_drops_new_nodes_without_any_edge():
    raw = graph([("a", "Ligado"), ("b", "Solto")], [("__origin__", "a", "r")])
    assert [n.label for n in build_expansion(raw, "Consciência", KNOWN, "general").nodes] == ["Consciência", "Ligado"]


def test_counter_marks_origin_and_caps_new_nodes():
    nodes = [(f"c{i}", f"Contra {i}") for i in range(6)]
    edges = [(f"c{i}", "__origin__", "contesta") for i in range(6)]
    result = build_expansion(graph(nodes, edges), "Consciência", KNOWN, "counter")

    assert len(result.nodes) == 1 + 3
    assert {n.origin for n in result.nodes[1:]} == {"counter"}


def test_new_ids_never_collide_with_existing_ones():
    # "Consciência!" não é igual a "Consciência" depois de normalizar, mas gera o mesmo slug de um nó que já existe
    raw = graph([("x", "Consciência!")], [("__origin__", "x", "r")])
    result = build_expansion(raw, "Atenção", KNOWN, "general")

    assert result.nodes[1].id == "consciencia_2"


def test_ids_come_from_labels_not_from_whatever_the_model_invented():
    raw = graph([("node_1", "Teoria da Mente"), ("node_2", "Empatia")], [("node_1", "node_2", "envolve")])
    result = build_initial_graph(raw, "x")

    assert [n.id for n in result.nodes] == ["teoria_da_mente", "empatia"]
    assert (result.edges[0].source, result.edges[0].target) == ("teoria_da_mente", "empatia")


def test_build_graph_dispatches_by_context():
    initial = graph([("a", "A"), ("b", "B")], [("a", "b", "r")])
    assert build_graph(initial, "A", [], "general").nodes[0].origin == "initial"

    expansion = graph([("n", "Novo")], [("__origin__", "n", "r")])
    assert build_graph(expansion, "Consciência", KNOWN, "general").nodes[1].origin == "general"
