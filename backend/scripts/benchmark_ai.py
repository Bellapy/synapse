"""Benchmark de modelos/prompts do Synapse.

Uso (na pasta backend, com GOOGLE_API_KEY no .env):
    python scripts/benchmark_ai.py --models gemini-3.5-flash-lite gemini-2.5-flash \
        --variants current lean --thinking default minimal --queries "o que é consciência?"

Mede, por chamada: latência, tokens de entrada/saída/raciocínio, se o JSON valida no schema e se o grafo é coerente
(arestas apontando para nós existentes, quantidade de nós, nós duplicados). Resultados vão para stdout em JSON lines.
"""
import argparse
import json
import os
import sys
import time
from typing import List, Literal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from google import genai  # noqa: E402
from google.genai import types  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from models.graph import GraphResponse  # noqa: E402


# ---------------------------------------------------------------- variantes de schema / prompt
class LeanNode(BaseModel):
    id: str = Field(description="slug curto e único, ex.: 'livre_arbitrio'")
    label: str = Field(description="nome do conceito, 1 a 4 palavras")
    type: Literal["concept", "person", "theory", "field", "event", "work"] = "concept"
    summary: str = Field(description="uma frase de no máximo 18 palavras")


class LeanEdge(BaseModel):
    source: str = Field(description="id de um nó existente")
    target: str = Field(description="id de um nó existente")
    relation: str = Field(description="verbo ou locução curta, 1 a 3 palavras")


class LeanGraph(BaseModel):
    nodes: List[LeanNode]
    edges: List[LeanEdge]


class TinyNode(BaseModel):
    id: str = Field(description="slug curto e único, ex.: 'livre_arbitrio'")
    label: str = Field(description="nome do conceito, 1 a 4 palavras")


class TinyGraph(BaseModel):
    nodes: List[TinyNode]
    edges: List[LeanEdge]


CURRENT_PROMPTS = {
    "initial": (
        'Você é um arquiteto do conhecimento. Para a pergunta do usuário: "{query}", gere um grafo de conhecimento inicial.\n\n'
        "1. Gere de 5 a 7 nós interconectados. Cada nó deve ter um id, label, type, summary.\n"
        "2. Gere as arestas que conectam esses nós. Cada aresta deve ter um source, target, relation.\n"
        '3. Para TODOS os nós e arestas gerados nesta primeira resposta, defina o campo "origin" como "initial".\n'
    ),
    "general": (
        'Você é um arquiteto do conhecimento. A partir do conceito de origem "{query}", gere de 3 a 5 NOVOS nós relacionados.\n'
        "O grafo atual já contém: [{existing}]. NÃO gere nós que já existem.\n"
        'Crie arestas que conectem os novos nós ao nó de origem "{query}".\n\n'
        "A lista de 'nodes' DEVE incluir o(s) novo(s) nó(s) E o nó de origem \"{query}\".\n"
        'Para TODOS os novos nós e arestas gerados, defina o campo "origin" como "general".\n'
        'Para o nó de origem "{query}" incluído, mantenha seu "origin" original.\n'
    ),
}

LEAN_PROMPTS = {
    "initial": (
        "Crie um mapa de conceitos para a pergunta abaixo.\n"
        "Pergunta: {query}\n\n"
        "Regras:\n"
        "- Responda no mesmo idioma da pergunta.\n"
        "- 6 nós: o primeiro é o tema central; os outros são conceitos, pessoas, teorias ou áreas distintas e importantes para entendê-lo.\n"
        "- 6 a 9 arestas ligando nós por relações significativas (não ligue tudo ao centro).\n"
        "- Use apenas ids de nós que você criou."
    ),
    "general": (
        "Expanda um mapa de conceitos a partir do nó \"{query}\".\n"
        "Nós que já existem (não repita nem reformule): {existing}\n\n"
        "Regras:\n"
        "- Responda no mesmo idioma dos nós existentes.\n"
        "- 4 NOVOS nós relacionados a \"{query}\" que acrescentem ideias diferentes das existentes.\n"
        "- Arestas: cada novo nó se liga a \"{query}\" (use o id exato \"__origin__\") ou a outro novo nó.\n"
        "- Não crie o nó \"{query}\" de novo."
    ),
}

SAMPLE_EXISTING = "'Consciência', 'Qualia', 'Problema difícil', 'Neurociência', 'Dualismo'"


def build(variant: str, kind: str, query: str):
    prompts = CURRENT_PROMPTS if variant == "current" else LEAN_PROMPTS
    text = prompts[kind].format(query=query, existing=SAMPLE_EXISTING)
    schema = {"current": GraphResponse, "lean": LeanGraph, "tiny": TinyGraph}[variant]
    return text, schema


def thinking_config(model: str, mode: str):
    if mode == "default":
        return None
    if model.startswith("gemini-2.5"):
        return types.ThinkingConfig(thinking_budget=0)
    return types.ThinkingConfig(thinking_level=types.ThinkingLevel.LOW)


def coherence(parsed) -> dict:
    ids = [n.id for n in parsed.nodes]
    labels = [n.label.strip().lower() for n in parsed.nodes]
    idset = set(ids) | {"__origin__"}
    dangling = sum(1 for e in parsed.edges if e.source not in idset or e.target not in idset)
    return {
        "nodes": len(parsed.nodes),
        "edges": len(parsed.edges),
        "dangling_edges": dangling,
        "duplicate_ids": len(ids) - len(set(ids)),
        "duplicate_labels": len(labels) - len(set(labels)),
    }


def run_once(client, model, variant, kind, thinking, query, timeout_s):
    prompt, schema = build(variant, kind, query)
    config = types.GenerateContentConfig(
        temperature=0.6,
        response_mime_type="application/json",
        response_schema=schema,
        thinking_config=thinking_config(model, thinking),
        http_options=types.HttpOptions(timeout=timeout_s * 1000),
    )
    row = {"model": model, "variant": variant, "kind": kind, "thinking": thinking, "prompt_chars": len(prompt)}
    start = time.perf_counter()
    try:
        response = client.models.generate_content(model=model, contents=prompt, config=config)
        row["seconds"] = round(time.perf_counter() - start, 2)
        usage = response.usage_metadata
        row["in_tok"] = usage.prompt_token_count
        row["out_tok"] = usage.candidates_token_count
        row["thought_tok"] = getattr(usage, "thoughts_token_count", 0) or 0
        parsed = response.parsed
        if parsed is None:
            row["ok"] = False
            row["error"] = "unparsed"
        else:
            row["ok"] = True
            row.update(coherence(parsed))
            if hasattr(parsed.nodes[0], "summary"):
                row["avg_summary_words"] = round(sum(len(n.summary.split()) for n in parsed.nodes) / max(len(parsed.nodes), 1), 1)
    except Exception as e:  # noqa: BLE001
        row["seconds"] = round(time.perf_counter() - start, 2)
        row["ok"] = False
        row["error"] = f"{type(e).__name__}: {str(e)[:140]}"
    return row


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="+", required=True)
    ap.add_argument("--variants", nargs="+", default=["current"], choices=["current", "lean", "tiny"])
    ap.add_argument("--thinking", nargs="+", default=["default"], choices=["default", "minimal"])
    ap.add_argument("--kinds", nargs="+", default=["initial"], choices=["initial", "general"])
    ap.add_argument("--queries", nargs="+", default=["o que é consciência?"])
    ap.add_argument("--runs", type=int, default=1)
    ap.add_argument("--timeout", type=int, default=90)
    ap.add_argument("--pause", type=float, default=3.0, help="segundos entre chamadas (respeita RPM do plano gratuito)")
    args = ap.parse_args()

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    for model in args.models:
        for variant in args.variants:
            for thinking in args.thinking:
                for kind in args.kinds:
                    for query in args.queries:
                        for _ in range(args.runs):
                            row = run_once(client, model, variant, kind, thinking, query if kind == "initial" else "Consciência", args.timeout)
                            print(json.dumps(row, ensure_ascii=False), flush=True)
                            time.sleep(args.pause)


if __name__ == "__main__":
    main()
