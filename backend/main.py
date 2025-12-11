# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Importa todos os nossos modelos e serviços
from models.graph import GraphResponse, QueryRequest, NodeDetailRequest, NodeDetailResponse
from services.graph_generator import generate_graph_from_query
from services.node_detail_generator import generate_contextual_details

app = FastAPI(
    title="Synapse API",
    description="API para gerar e interagir com grafos de conhecimento dinâmicos.",
    version="0.2.0" # Version bump!
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def read_root():
    return {"status": "ok"}


@app.post("/api/generate-graph", response_model=GraphResponse)
async def generate_graph(request: QueryRequest):
    """
    Gera ou expande um grafo de conhecimento.
    - Para geração inicial, envie apenas `query`.
    - Para expansão, envie `query` (o label do nó a expandir), `existing_node_labels`, e opcionalmente `expansion_type` ('general' ou 'counter').
    """
    try:
        graph_data = await generate_graph_from_query(
            request.query, 
            request.existing_node_labels,
            request.expansion_type
        )
        return graph_data
    except Exception as e:
        print(f"Erro no endpoint /api/generate-graph: {e}")
        raise HTTPException(status_code=500, detail=f"Falha ao gerar o grafo: {str(e)}")


# NOVO ENDPOINT
@app.post("/api/node-details", response_model=NodeDetailResponse)
async def get_node_details(request: NodeDetailRequest):
    """
    Busca detalhes contextuais sobre um nó específico para exibir no painel de inspeção.
    """
    try:
        # A lógica para encontrar as conexões existentes não precisa da IA,
        # faremos isso no frontend, que já tem o estado do grafo.
        # Aqui, focamos em gerar o conteúdo da IA.
        details_from_ai = await generate_contextual_details(
            request.original_query,
            request.node_label
        )
        return details_from_ai
    except Exception as e:
        print(f"Erro no endpoint /api/node-details: {e}")
        raise HTTPException(status_code=500, detail=f"Falha ao obter detalhes do nó: {str(e)}")