// frontend/src/store/graphStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { generateGraph } from '../services/api';

const useGraphStore = create(devtools((set) => ({
  // Estados existentes...
  nodes: [],
  edges: [],
  isLoading: false,
  error: null,

  // --- NOVO ESTADO ---
  selectedNode: null, // Armazena o objeto do nó atualmente selecionado

  // Ações existentes...
  fetchGraphData: async (query) => {
    // Limpa a seleção anterior ao buscar um novo grafo
    set({ isLoading: true, error: null, selectedNode: null }, false, 'FETCH_GRAPH_DATA_START');
    try {
      const graphData = await generateGraph(query);
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

  // --- NOVAS AÇÕES ---
  // Ação para definir o nó selecionado
  setSelectedNode: (node) => set({ selectedNode: node }, false, 'SET_SELECTED_NODE'),
  
  // Ação para limpar a seleção (fechar o painel)
  clearSelectedNode: () => set({ selectedNode: null }, false, 'CLEAR_SELECTED_NODE'),

}), { name: "SynapseGraphStore" }));

export default useGraphStore;