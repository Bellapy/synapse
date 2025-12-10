# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Importa os modelos que acabamos de criar
from models.graph import GraphResponse, Node, Edge, QueryRequest

# Cria a instância da aplicação FastAPI
app = FastAPI(
    title="Synapse API",
    description="API para gerar e interagir com grafos de conhecimento dinâmicos.",
    version="0.1.0"
)

# Configura o CORS (Cross-Origin Resource Sharing)
# Isso é CRUCIAL para permitir que nosso frontend React (em outra "origem")
# se comunique com este backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restrinja para o domínio do seu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def read_root():
    """Endpoint de verificação de saúde para saber se a API está online."""
    return {"status": "ok"}


@app.post("/api/generate-graph", response_model=GraphResponse)
async def generate_graph(request: QueryRequest):
    """
    Recebe uma query de texto e retorna um grafo de conhecimento mock.
    Por enquanto, não usa IA, apenas devolve dados estáticos.
    """
    try:
        # Lógica de negócio (aqui ficará a chamada para o Gemini no futuro)
        print(f"Query recebida: '{request.query}'")

        # Dados mock para testar o contrato da API
        mock_nodes = [
            Node(id="1", label="Filosofia", summary="O estudo de questões fundamentais sobre existência, conhecimento, valores, razão, mente e linguagem."),
            Node(id="2", label="Estoicismo", summary="Uma escola de filosofia helenística que ensina que a virtude, o bem maior, é baseada no conhecimento."),
            Node(id="3", label="Sêneca", summary="Um filósofo estoico romano e um dos principais expoentes do Estoicismo Imperial.")
        ]
        mock_edges = [
            Edge(source="1", target="2", relation="contém"),
            Edge(source="2", target="3", relation="exemplificado por")
        ]

        return GraphResponse(nodes=mock_nodes, edges=mock_edges)

    except Exception as e:
        # Um bom tratamento de erro genérico para começar
        print(f"Erro inesperado: {e}")
        raise HTTPException(status_code=500, detail="Ocorreu um erro interno no servidor.")