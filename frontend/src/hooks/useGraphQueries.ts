import { useCallback, useMemo } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNodeDetails, generateGraph } from '../services/api';
import useGraphStore from '../store/graphStore';
import { NodeDetails, SynapseNode } from '../types';

const GRAPH_MUTATION_KEY = ['graph'] as const;

/** Verdadeiro enquanto uma busca ou expansão estiver em andamento. */
export function useGraphBusy(): boolean {
  return useIsMutating({ mutationKey: GRAPH_MUTATION_KEY }) > 0;
}

/** Primeira busca: substitui o grafo inteiro. */
export function useSearchGraph() {
  const { setGraph, clearGraph, setError } = useGraphStore.getState();

  return useMutation({
    mutationKey: GRAPH_MUTATION_KEY,
    mutationFn: (query: string) => generateGraph(query),
    onMutate: () => setError(null),
    onSuccess: (data, query) => setGraph(query, data),
    onError: (error: Error) => {
      clearGraph();
      setError(error.message);
    },
  });
}

type ExpansionType = 'general' | 'counter';

/** Expansão ou contra-argumento a partir de um nó: acrescenta ao grafo existente. */
export function useExpandNode() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: GRAPH_MUTATION_KEY,
    mutationFn: ({ label, type }: { label: string; type: ExpansionType }) => {
      const existingLabels = useGraphStore.getState().nodes.map(n => n.label);
      return generateGraph(label, existingLabels, type);
    },
    onMutate: () => useGraphStore.getState().setError(null),
    onSuccess: data => useGraphStore.getState().applyExpansion(data),
    onError: (error: Error) => useGraphStore.getState().setError(error.message),
  });

  // Ignora novos pedidos enquanto outro está em andamento (cada chamada gasta cota da IA).
  const expand = useCallback(
    (label: string, type: ExpansionType = 'general') => {
      if (queryClient.isMutating({ mutationKey: GRAPH_MUTATION_KEY }) > 0) return;
      mutation.mutate({ label, type });
    },
    [mutation.mutate, queryClient]
  );

  return { expand, isPending: mutation.isPending };
}

/**
 * Detalhes contextuais de um nó. A chave inclui a pergunta original, então a mesma palavra
 * em buscas diferentes não reaproveita o texto da busca anterior; dentro da mesma busca o
 * resultado fica em cache e reabrir o nó é instantâneo.
 */
export function useNodeDetails(node: SynapseNode | null) {
  const originalQuery = useGraphStore(state => state.originalQuery);

  return useQuery<NodeDetails>({
    queryKey: ['node-details', originalQuery, node?.label],
    queryFn: () => fetchNodeDetails(node!.label, originalQuery),
    enabled: !!node,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });
}

/** Rótulos dos nós ligados diretamente a `node` no grafo atual. */
export function useNodeConnections(node: SynapseNode | null): string[] {
  const nodes = useGraphStore(state => state.nodes);
  const edges = useGraphStore(state => state.edges);

  return useMemo(() => {
    if (!node) return [];
    const labelById = new Map(nodes.map(n => [n.id, n.label]));
    const labels: string[] = [];
    for (const edge of edges) {
      const source = typeof edge.source === 'object' ? edge.source.id : edge.source;
      const target = typeof edge.target === 'object' ? edge.target.id : edge.target;
      if (source !== node.id && target !== node.id) continue;
      const label = labelById.get(source === node.id ? target : source);
      if (label && !labels.includes(label)) labels.push(label);
    }
    return labels;
  }, [node, nodes, edges]);
}
