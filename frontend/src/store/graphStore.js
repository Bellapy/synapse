// frontend/src/store/graphStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { generateGraph } from '../services/api';

const useGraphStore = create(devtools((set, get) => ({
  // Estado
  nodes: [],
  edges: [],
  isLoading: false,
  error: null,
  selectedNode: null,

  // Ação para buscar um grafo do zero
  fetchGraphData: async (query) => {
    set({ isLoading: true, error: null, selectedNode: null }, false, 'FETCH_GRAPH_DATA_START');
    try {
      const graphData = await generateGraph(query); // Não passa nós existentes
      
      const uniqueNodes = Array.from(new Map(graphData.nodes.map(node => [node.id, node])).values());

      set({ 
        nodes: uniqueNodes, 
        edges: graphData.edges, 
        isLoading: false 
      }, false, 'FETCH_GRAPH_DATA_SUCCESS');
    } catch (error) {
      console.error("Falha ao buscar dados do grafo:", error);
      set({ error: error.message, isLoading: false, nodes: [], edges: [] }, false, 'FETCH_GRAPH_DATA_ERROR');
    }
  },

  // NOVA AÇÃO para expandir um nó existente
  expandNode: async (nodeLabel) => {
    // getState() nos dá acesso ao estado atual do store.
    const { nodes: currentNodes } = get();

    // Previne múltiplas expansões simultâneas
    if (get().isLoading) return;

    set({ isLoading: true, error: null }, false, 'EXPAND_NODE_START');
    
    try {
      // Coleta os labels de todos os nós que já existem no grafo.
      const existingNodeLabels = currentNodes.map(n => n.label);

      // Chama a API com o contexto dos nós existentes.
      const newGraphData = await generateGraph(nodeLabel, existingNodeLabels);

      // Lógica para mesclar o grafo antigo com os novos dados
      set(state => {
        // Usamos um Map para garantir que não haja IDs de nós duplicados
        const nodeMap = new Map(state.nodes.map(node => [node.id, node]));
        newGraphData.nodes.forEach(node => nodeMap.set(node.id, node));

        // Mescla as arestas, assumindo que novas arestas são únicas
        const newEdges = [...state.edges, ...newGraphData.edges];
        
        return {
          nodes: Array.from(nodeMap.values()),
          edges: newEdges,
          isLoading: false,
        };
      }, false, 'EXPAND_NODE_SUCCESS');

    } catch (error) {
      console.error(`Falha ao expandir o nó ${nodeLabel}:`, error);
      set({ error: error.message, isLoading: false }, false, 'EXPAND_NODE_ERROR');
    }
  },

  // Ações para o nó selecionado
  setSelectedNode: (node) => set({ selectedNode: node }, false, 'SET_SELECTED_NODE'),
  clearSelectedNode: () => set({ selectedNode: null }, false, 'CLEAR_SELECTED_NODE'),

}), { name: "SynapseGraphStore" }));

export default useGraphStore;