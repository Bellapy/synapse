# backend/models/graph.py

from pydantic import BaseModel, Field
from typing import List, Optional

# --- Modelos de Grafo (Existentes) ---
class Node(BaseModel):
    id: str
    label: str
    type: str = "concept"
    summary: str
    # MODIFICATION START: Adicionamos o campo de origem para estilização
    origin: str = Field("initial", description="Indica como o nó foi gerado: 'initial', 'general' (expansão), ou 'counter' (contra-argumento).")
    # MODIFICATION END

class Edge(BaseModel):
    source: str
    target: str
    relation: str
    # MODIFICATION START: Adicionamos o campo de origem para estilização
    origin: str = Field("initial", description="Indica como a aresta foi gerada.")
    # MODIFICATION END

class GraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

# --- Modelo de Requisição de Grafo (Atualizado) ---
class QueryRequest(BaseModel):
    query: str
    existing_node_labels: Optional[List[str]] = None
    expansion_type: str = "general"

# --- NOVOS MODELOS PARA O PAINEL DE DETALHES ---
class NodeDetailRequest(BaseModel):
    """Corpo da requisição para buscar detalhes de um nó."""
    original_query: str
    node_label: str

class NodeDetailResponse(BaseModel):
    """Resposta da API com os detalhes contextuais de um nó."""
    label: str
    type_tag: str = Field(..., description="Uma etiqueta curta que classifica o conceito (ex: 'Conceito Filosófico').")
    contextual_summary: str = Field(..., description="Um resumo que conecta o conceito à dúvida original do usuário.")
    connections: List[str] = Field(..., description="Lista dos labels dos nós diretamente conectados a este no grafo atual.")