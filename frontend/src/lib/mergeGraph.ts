import { GraphData, SynapseEdge, SynapseNode } from '../types';

/**
 * Incorpora ao grafo atual o resultado de uma expansão.
 * - nós com o mesmo rótulo já existentes são reaproveitados (os ids novos são remapeados para os antigos);
 * - arestas duplicadas ou sem extremidade válida são descartadas.
 */
export function mergeExpansion(
  current: GraphData,
  incoming: GraphData
): { nodes: SynapseNode[]; edges: SynapseEdge[] } {
  const nodeByLabel = new Map(current.nodes.map(node => [node.label, node]));
  const idRemap = new Map<string, string>();
  const nodesToAdd: SynapseNode[] = [];

  for (const node of incoming.nodes) {
    const existing = nodeByLabel.get(node.label);
    if (existing) {
      idRemap.set(node.id, existing.id);
    } else {
      nodesToAdd.push(node);
      nodeByLabel.set(node.label, node);
      idRemap.set(node.id, node.id);
    }
  }

  const edgeKeys = new Set(current.edges.map(e => `${e.source}-${e.target}`));
  const edgesToAdd: SynapseEdge[] = [];

  for (const edge of incoming.edges) {
    const source = idRemap.get(edge.source as string) ?? edge.source;
    const target = idRemap.get(edge.target as string) ?? edge.target;
    if (!source || !target) continue;

    const key = `${source}-${target}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edgesToAdd.push({ ...edge, source, target });
  }

  return {
    nodes: [...current.nodes, ...nodesToAdd],
    edges: [...current.edges, ...edgesToAdd],
  };
}
