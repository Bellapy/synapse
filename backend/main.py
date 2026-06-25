import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import graph, node

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

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

app.include_router(graph.router)
app.include_router(node.router)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)