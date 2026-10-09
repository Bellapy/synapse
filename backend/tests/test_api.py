from unittest.mock import AsyncMock

import pytest

from models.graph import GraphResponse, Node, NodeDetailResponse

ORIGIN = "https://synapse-six-inky.vercel.app"


@pytest.fixture
def fake_graph():
    return GraphResponse(nodes=[Node(id="a", label="Entropia", summary="Desordem")], edges=[])


@pytest.fixture
def mock_ai(monkeypatch, fake_graph):
    graph = AsyncMock(return_value=fake_graph)
    details = AsyncMock(
        return_value=NodeDetailResponse(label="Qualia", type_tag="Conceito", contextual_summary="...", connections=[])
    )
    monkeypatch.setattr("routers.graph.generate_graph_from_query", graph)
    monkeypatch.setattr("routers.node.generate_contextual_details", details)
    return graph, details


def test_health_reports_optional_services(client):
    body = client.get("/api/health").json()
    assert body == {"status": "ok", "cache": False, "history": False}


def test_generate_graph_returns_ai_result(client, mock_ai):
    graph, _ = mock_ai
    response = client.post("/api/generate-graph", json={"query": "  Entropia  "})

    assert response.status_code == 200
    assert response.json()["nodes"][0]["label"] == "Entropia"
    graph.assert_awaited_once_with("Entropia", [], "general", None)


def test_generate_graph_passes_expansion_context(client, mock_ai):
    graph, _ = mock_ai
    client.post(
        "/api/generate-graph",
        json={
            "query": "Entropia",
            "existing_nodes": [{"id": "a", "label": "A"}],
            "original_query": "termodinâmica",
            "expansion_type": "counter",
        },
    )
    query, known, expansion_type, original_query = graph.await_args.args
    assert (query, expansion_type, original_query) == ("Entropia", "counter", "termodinâmica")
    assert [(n.id, n.label) for n in known] == [("a", "A")]


def test_legacy_label_only_payload_still_works(client, mock_ai):
    graph, _ = mock_ai
    response = client.post("/api/generate-graph", json={"query": "Entropia", "existing_node_labels": ["Calor"]})

    assert response.status_code == 200
    known = graph.await_args.args[1]
    assert [(n.id, n.label) for n in known] == [("calor", "Calor")]


def test_identical_requests_are_answered_from_cache(client, mock_ai):
    graph, _ = mock_ai
    first = client.post("/api/generate-graph", json={"query": "Entropia"})
    second = client.post("/api/generate-graph", json={"query": "  entropia "})

    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    graph.assert_awaited_once()


def test_all_models_unavailable_returns_503_without_leaking_details(client, monkeypatch):
    from services.ai_router import AIUnavailableError

    monkeypatch.setattr(
        "routers.graph.generate_graph_from_query",
        AsyncMock(side_effect=AIUnavailableError("gemini-x: 503 secret detail")),
    )
    response = client.post("/api/generate-graph", json={"query": "x"})

    assert response.status_code == 503
    assert "secret detail" not in response.text
    assert "sobrecarregada" in response.json()["detail"]


@pytest.mark.parametrize(
    "payload",
    [{"query": ""}, {"query": "x" * 201}, {"query": "x", "expansion_type": "hack"}, {}],
)
def test_invalid_payloads_are_rejected_before_reaching_the_ai(client, mock_ai, payload):
    graph, _ = mock_ai
    assert client.post("/api/generate-graph", json=payload).status_code == 422
    graph.assert_not_awaited()


def test_ai_failure_becomes_a_generic_500(client, monkeypatch):
    monkeypatch.setattr("routers.graph.generate_graph_from_query", AsyncMock(side_effect=RuntimeError("quota secret")))
    response = client.post("/api/generate-graph", json={"query": "x"})

    assert response.status_code == 500
    assert "quota secret" not in response.text


def test_node_details(client, mock_ai):
    response = client.post("/api/node-details", json={"original_query": "consciência", "node_label": "Qualia"})

    assert response.status_code == 200
    assert response.json()["label"] == "Qualia"


def test_rate_limit_returns_429_after_the_limit(client, mock_ai):
    statuses = [client.post("/api/generate-graph", json={"query": f"q{i}"}).status_code for i in range(7)]

    assert statuses[:5] == [200] * 5
    assert statuses[5:] == [429, 429]


def test_rate_limit_is_per_ip_and_per_endpoint(client, mock_ai):
    for i in range(5):
        client.post("/api/generate-graph", json={"query": f"q{i}"}, headers={"x-forwarded-for": "1.1.1.1"})

    blocked = client.post("/api/generate-graph", json={"query": "z"}, headers={"x-forwarded-for": "1.1.1.1"})
    other_ip = client.post("/api/generate-graph", json={"query": "z"}, headers={"x-forwarded-for": "2.2.2.2"})
    other_endpoint = client.post(
        "/api/node-details",
        json={"original_query": "a", "node_label": "b"},
        headers={"x-forwarded-for": "1.1.1.1"},
    )

    assert blocked.status_code == 429
    assert blocked.headers["retry-after"] == "60"
    assert other_ip.status_code == 200
    assert other_endpoint.status_code == 200


@pytest.mark.parametrize(
    "origin,allowed",
    [
        (ORIGIN, True),
        ("https://synapse-git-feature-x.vercel.app", True),
        ("http://localhost:5173", True),
        ("https://evil.example.com", False),
        ("https://synapse.evil.com", False),
    ],
)
def test_cors_allows_only_known_origins(client, origin, allowed):
    response = client.options(
        "/api/generate-graph",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )
    assert (response.headers.get("access-control-allow-origin") == origin) is allowed
