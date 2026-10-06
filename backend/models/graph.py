# backend/models/graph.py

import re
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


# --- Modelos de Grafo ---
class Node(BaseModel):
    id: str
    label: str
    type: str = "concept"
    summary: str
    origin: str = Field("initial", description="Indica como o nó foi gerado: 'initial', 'general' (expansão), ou 'counter' (contra-argumento).")

class Edge(BaseModel):
    source: str
    target: str
    relation: str
    origin: str = Field("initial", description="Indica como a aresta foi gerada.")

class GraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

# --- Requisição de Grafo ---
class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    existing_node_labels: Optional[List[str]] = Field(None, max_length=100)
    expansion_type: Literal["initial", "general", "counter"] = "general"

    @field_validator("query")
    @classmethod
    def clean_query(cls, v: str) -> str:
        v = _clean(v)
        if not v:
            raise ValueError("A pergunta não pode ser vazia.")
        return v

    @field_validator("existing_node_labels")
    @classmethod
    def clean_labels(cls, v):
        if v is None:
            return v
        return [_clean(label)[:120] for label in v if label and label.strip()]

    def cache_payload(self) -> dict:
        """Forma canônica da requisição para a chave de cache (ignora caixa, espaços e ordem)."""
        return {
            "query": self.query.casefold(),
            "existing": sorted({l.casefold() for l in (self.existing_node_labels or [])}),
            "type": self.expansion_type,
        }

# --- Detalhes de nó ---
class NodeDetailRequest(BaseModel):
    """Corpo da requisição para buscar detalhes de um nó."""
    original_query: str = Field(..., min_length=1, max_length=200)
    node_label: str = Field(..., min_length=1, max_length=120)

    @field_validator("original_query", "node_label")
    @classmethod
    def clean_text(cls, v: str) -> str:
        v = _clean(v)
        if not v:
            raise ValueError("Campo não pode ser vazio.")
        return v

    def cache_payload(self) -> dict:
        return {"query": self.original_query.casefold(), "node": self.node_label.casefold()}

class NodeDetailLLM(BaseModel):
    """Saída estruturada pedida ao modelo."""
    label: str
    type_tag: str = Field(..., description="Etiqueta curta que classifica o conceito (ex: 'Conceito Filosófico').")
    contextual_summary: str = Field(..., description="Resumo que conecta o conceito à dúvida original do usuário.")

class NodeDetailResponse(BaseModel):
    """Resposta da API com os detalhes contextuais de um nó."""
    label: str
    type_tag: str = Field(..., description="Uma etiqueta curta que classifica o conceito (ex: 'Conceito Filosófico').")
    contextual_summary: str = Field(..., description="Um resumo que conecta o conceito à dúvida original do usuário.")
    connections: List[str] = Field(..., description="Lista dos labels dos nós diretamente conectados a este no grafo atual.")
