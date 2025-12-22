
import os
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


from models.graph import GraphResponse, QueryRequest, NodeDetailRequest, NodeDetailResponse
from services.graph_generator import generate_graph_from_query
from services.node_detail_generator import generate_contextual_details


load_dotenv()

app = FastAPI(
    title="Synapse API",
    description="API para gerar e interagir com grafos de conhecimento dinâmicos.",
    version="1.0.0", 
    docs_url="/api/docs", 
    redoc_url="/api/redoc"
)


origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

vercel_url = os.getenv("VERCEL_URL")
if vercel_url:
    
    
    origins.append(f"https://{vercel_url}")
 
    origins.append(f"https://{vercel_url.split('-git-')[0]}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", summary="Health Check", tags=["System"])
def read_root():
  
    return {"status": "ok"}


@app.post("/api/generate-graph", response_model=GraphResponse, summary="Generate or Expand Knowledge Graph", tags=["Graph"])
async def generate_graph(request: QueryRequest):
    """
    Gera ou expande um grafo de conhecimento.
    - Para geração inicial, envie apenas `query`.
    - Para expansão, envie `query` (o label do nó a expandir), `existing_node_labels`, e `expansion_type`.
    """
    try:
        graph_data = await generate_graph_from_query(
            request.query, 
            request.existing_node_labels,
            request.expansion_type
        )
        return graph_data
    except Exception as e:
        print(f"Erro detalhado no endpoint /api/generate-graph: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno ao tentar gerar o grafo.")


@app.post("/api/node-details", response_model=NodeDetailResponse, summary="Get Contextual Node Details", tags=["Graph"])
async def get_node_details(request: NodeDetailRequest):
    """
    Busca detalhes contextuais sobre um nó específico para exibir no painel de inspeção.
    """
    try:
        details_from_ai = await generate_contextual_details(
            request.original_query,
            request.node_label
        )
        return details_from_ai
    except Exception as e:
        print(f"Erro detalhado no endpoint /api/node-details: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno ao obter os detalhes do nó.")


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False) 