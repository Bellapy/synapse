# backend/models/graph.py

from pydantic import BaseModel
from typing import List

# Define a estrutura de um único nó no grafo
class Node(BaseModel):
    id: str
    label: str
    type: str = "concept"  # Valor padrão para simplificar
    summary: str

# Define a estrutura de uma única aresta (conexão)
class Edge(BaseModel):
    source: str  # ID do nó de origem
    target: str  # ID do nó de destino
    relation: str

# Define o formato da resposta JSON completa da API
class GraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

# Define o formato do corpo da requisição POST que esperamos
class QueryRequest(BaseModel):
    query: str