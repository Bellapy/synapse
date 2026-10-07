import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { mergeExpansion } from '../lib/mergeGraph';
import { GraphData, SynapseEdge, SynapseNode } from '../types';

/**
 * Estado do cliente: o grafo exibido, a seleção e a mensagem de erro.
 * Estado do servidor (requisições, cache, loading) fica no React Query — ver hooks/useGraphQueries.ts.
 */
interface GraphState {
  nodes: SynapseNode[];
  edges: SynapseEdge[];
  originalQuery: string;
  selectedNode: SynapseNode | null;
  error: string | null;

  setGraph: (query: string, data: GraphData) => void;
  applyExpansion: (data: GraphData) => void;
  setSelectedNode: (node: SynapseNode | null) => void;
  clearSelectedNode: () => void;
  setError: (message: string | null) => void;
  clearGraph: () => void;
}

const useGraphStore = create<GraphState>()(devtools(set => ({
  nodes: [],
  edges: [],
  originalQuery: '',
  selectedNode: null,
  error: null,

  setGraph: (query, data) =>
    set({ nodes: data.nodes, edges: data.edges, originalQuery: query, selectedNode: null, error: null }, false, 'SET_GRAPH' as any),

  applyExpansion: data =>
    set(state => mergeExpansion({ nodes: state.nodes, edges: state.edges }, data), false, 'APPLY_EXPANSION' as any),

  setSelectedNode: node => set({ selectedNode: node }, false, 'SET_SELECTED_NODE' as any),
  clearSelectedNode: () => set({ selectedNode: null }, false, 'CLEAR_SELECTED_NODE' as any),
  setError: message => set({ error: message }, false, 'SET_ERROR' as any),
  clearGraph: () =>
    set({ nodes: [], edges: [], originalQuery: '', selectedNode: null }, false, 'CLEAR_GRAPH' as any),
}), { name: 'SynapseGraphStore' }));

export default useGraphStore;
