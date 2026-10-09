# backend/models/graph.py

import re
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from core.text import normalize, slugify

# Mude ao alterar o formato da resposta: invalida entradas antigas do cache.
CACHE_VERSION = "v2"


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


# --- Modelos de Grafo (contrato da API) ---
class Node(BaseModel):
    id: str
    label: str
    type: str = "concept"
    summary: str = ""
    origin: str = Field("initial", description="Indica como o nó foi gerado: 'initial', 'general' (expansão), ou 'counter' (contra-argumento).")

class Edge(BaseModel):
    source: str
    target: str
    relation: str
    origin: str = Field("initial", description="Indica como a aresta foi gerada.")

class GraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


# --- Saída estruturada pedida ao modelo (enxuta: sem texto longo, sem 'origin') ---
class LLMNode(BaseModel):
    id: str = Field(description="slug curto e único, minúsculo, sem acentos. Ex.: 'livre_arbitrio'")
    label: str = Field(description="nome do conceito, de 1 a 4 palavras")

class LLMEdge(BaseModel):
    source: str = Field(description="id de um nó")
    target: str = Field(description="id de um nó")
    relation: str = Field(description="verbo ou locução curta, de 1 a 3 palavras")

class GraphLLM(BaseModel):
    nodes: List[LLMNode]
    edges: List[LLMEdge]


# --- Requisição de Grafo ---
class ExistingNode(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    # Formato novo: nós existentes com id (permite ligar novos nós a nós já presentes).
    existing_nodes: Optional[List[ExistingNode]] = Field(None, max_length=100)
    # Formato antigo, mantido por compatibilidade.
    existing_node_labels: Optional[List[str]] = Field(None, max_length=100)
    # Tema do mapa: mantém as expansões alinhadas com a pergunta original.
    original_query: Optional[str] = Field(None, max_length=200)
    expansion_type: Literal["initial", "general", "counter"] = "general"

    @field_validator("query", "original_query")
    @classmethod
    def clean_text(cls, v: Optional[str], info) -> Optional[str]:
        if v is None:
            return v
        v = _clean(v)
        if not v and info.field_name == "query":
            raise ValueError("A pergunta não pode ser vazia.")
        return v or None

    @field_validator("existing_node_labels")
    @classmethod
    def clean_labels(cls, v):
        if v is None:
            return v
        return [_clean(label)[:120] for label in v if label and label.strip()]

    @property
    def known_nodes(self) -> List[ExistingNode]:
        """Nós já presentes no grafo, com ids (sintéticos quando o cliente só enviou rótulos)."""
        if self.existing_nodes:
            return [ExistingNode(id=n.id, label=_clean(n.label)) for n in self.existing_nodes]
        return [ExistingNode(id=slugify(label), label=label) for label in (self.existing_node_labels or [])]

    def cache_payload(self) -> dict:
        """Forma canônica da requisição para a chave de cache (ignora caixa, acentos, espaços e ordem)."""
        return {
            "v": CACHE_VERSION,
            "query": normalize(self.query),
            "context": normalize(self.original_query or ""),
            "existing": sorted({normalize(n.label) for n in self.known_nodes}),
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
        return {"v": CACHE_VERSION, "query": normalize(self.original_query), "node": normalize(self.node_label)}

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
