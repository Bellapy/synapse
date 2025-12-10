# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Importa os modelos e nosso novo serviço
from models.graph import GraphResponse, QueryRequest
from services.graph_generator import generate_graph_from_query

# Cria a instância da aplicação FastAPI
app = FastAPI(
    title="Synapse API",
    description="API para gerar e interagir com grafos de conhecimento dinâmicos.",
    version="0.1.0"
)

# Configura o CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def read_root():
    """Endpoint de verificação de saúde."""
    return {"status": "ok"}


@app.post("/api/generate-graph", response_model=GraphResponse)
async def generate_graph(request: QueryRequest):
    """
    Recebe uma query de texto e retorna um grafo de conhecimento gerado pela IA.
    """
    try:
        print(f"Gerando grafo para a query: '{request.query}'")
        # Substituímos os dados mock pela chamada ao nosso serviço de IA assíncrono
        graph_data = await generate_graph_from_query(request.query)
        return graph_data

    except Exception as e:
        # Tratamento de erro se a IA falhar ou ocorrer outro problema
        print(f"Erro no endpoint /api/generate-graph: {e}")
        raise HTTPException(status_code=500, detail=f"Falha ao gerar o grafo: {str(e)}")