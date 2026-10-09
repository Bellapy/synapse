import pytest
from pydantic import ValidationError

from models.graph import NodeDetailRequest, QueryRequest


def test_query_is_trimmed_and_whitespace_collapsed():
    request = QueryRequest(query="  o   que  é \n consciência?  ")
    assert request.query == "o que é consciência?"


@pytest.mark.parametrize("bad", ["", "   ", "x" * 201])
def test_query_length_limits(bad):
    with pytest.raises(ValidationError):
        QueryRequest(query=bad)


def test_expansion_type_is_restricted():
    with pytest.raises(ValidationError):
        QueryRequest(query="x", expansion_type="hack")


def test_existing_labels_are_capped_and_cleaned():
    request = QueryRequest(query="x", existing_node_labels=["  A  ", "", "B" * 500])
    assert request.existing_node_labels[0] == "A"
    assert len(request.existing_node_labels) == 2
    assert len(request.existing_node_labels[1]) == 120

    with pytest.raises(ValidationError):
        QueryRequest(query="x", existing_node_labels=["a"] * 101)


def test_existing_nodes_with_ids_are_validated_and_capped():
    request = QueryRequest(query="x", existing_nodes=[{"id": "a", "label": "  A  b "}])
    assert [(n.id, n.label) for n in request.known_nodes] == [("a", "A b")]

    with pytest.raises(ValidationError):
        QueryRequest(query="x", existing_nodes=[{"id": "a", "label": "A"}] * 101)
    with pytest.raises(ValidationError):
        QueryRequest(query="x", existing_nodes=[{"id": "", "label": "A"}])


def test_known_nodes_falls_back_to_labels_with_synthetic_ids():
    request = QueryRequest(query="x", existing_node_labels=["Espalhamento de Rayleigh"])
    assert [(n.id, n.label) for n in request.known_nodes] == [("espalhamento_de_rayleigh", "Espalhamento de Rayleigh")]


def test_original_query_is_optional_and_cleaned():
    assert QueryRequest(query="x").original_query is None
    assert QueryRequest(query="x", original_query="   ").original_query is None
    assert QueryRequest(query="x", original_query="  tema   geral ").original_query == "tema geral"


def test_cache_payload_ignores_case_accents_spacing_and_label_order():
    a = QueryRequest(query="Consciência", existing_node_labels=["B", "a"], expansion_type="general")
    b = QueryRequest(query="  consciencia ", existing_node_labels=["Á", "b"], expansion_type="general")
    assert a.cache_payload() == b.cache_payload()


def test_cache_payload_distinguishes_type_and_context():
    base = dict(query="x", existing_node_labels=["a"])
    general = QueryRequest(**base, expansion_type="general")
    counter = QueryRequest(**base, expansion_type="counter")
    with_context = QueryRequest(**base, original_query="tema")

    assert general.cache_payload() != counter.cache_payload()
    assert general.cache_payload() != with_context.cache_payload()


def test_node_detail_request_validation_and_payload():
    request = NodeDetailRequest(original_query=" Entropia ", node_label=" Qualia ")
    payload = request.cache_payload()
    assert (payload["query"], payload["node"]) == ("entropia", "qualia")
    with pytest.raises(ValidationError):
        NodeDetailRequest(original_query="", node_label="x")
