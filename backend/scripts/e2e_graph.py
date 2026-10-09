"""Teste ponta a ponta contra o Gemini real (não roda no CI). Uso: python scripts/e2e_graph.py"""
import asyncio, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from models.graph import ExistingNode
from services.graph_generator import generate_graph_from_query
from services.node_detail_generator import generate_contextual_details


def show(title, graph, secs):
    safe = lambda s: s.encode("ascii", "replace").decode()
    print(f"\n## {title}  ({secs:.1f}s, {len(graph.nodes)} nodes, {len(graph.edges)} edges)")
    print("  nodes:", [f"{n.id}={safe(n.label)}[{n.origin}]" for n in graph.nodes])
    print("  edges:", [f"{e.source}-[{safe(e.relation)}]->{e.target}" for e in graph.edges])


async def main():
    for q in ("o que e consciencia?", "stoicism", "por que o ceu e azul"):
        t = time.perf_counter()
        g = await generate_graph_from_query(q)
        show(f"initial: {q}", g, time.perf_counter() - t)

    known = [ExistingNode(id=n.id, label=n.label) for n in g.nodes]
    target = g.nodes[2].label
    for kind in ("general", "counter"):
        t = time.perf_counter()
        x = await generate_graph_from_query(target, known, kind, original_query="por que o ceu e azul")
        show(f"{kind}: {target}", x, time.perf_counter() - t)

    t = time.perf_counter()
    d = await generate_contextual_details("stoicism", "Dichotomy of Control")
    print(f"\n## details ({time.perf_counter()-t:.1f}s): {d.type_tag.encode('ascii','replace').decode()} | {len(d.contextual_summary.split())} words")

asyncio.run(main())
