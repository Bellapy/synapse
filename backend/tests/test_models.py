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


def test_cache_payload_ignores_case_spacing_and_label_order():
    a = QueryRequest(query="Consciência", existing_node_labels=["B", "a"], expansion_type="general")
    b = QueryRequest(query="  consciência ", existing_node_labels=["A", "b"], expansion_type="general")
    assert a.cache_payload() == b.cache_payload()


def test_cache_payload_distinguishes_expansion_types():
    general = QueryRequest(query="x", existing_node_labels=["a"], expansion_type="general")
    counter = QueryRequest(query="x", existing_node_labels=["a"], expansion_type="counter")
    assert general.cache_payload() != counter.cache_payload()


def test_node_detail_request_validation_and_payload():
    request = NodeDetailRequest(original_query=" Entropia ", node_label=" Qualia ")
    assert request.cache_payload() == {"query": "entropia", "node": "qualia"}
    with pytest.raises(ValidationError):
        NodeDetailRequest(original_query="", node_label="x")
