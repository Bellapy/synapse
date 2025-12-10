// frontend/src/store/graphStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware'; // 1. Importar o middleware
import { generateGraph } from '../services/api';

// 2. Envolver nossa função de criação de store com o 'devtools'
const useGraphStore = create(devtools((set) => ({
  // O estado e as ações permanecem exatamente os mesmos
  nodes: [],
  edges: [],
  isLoading: false,
  error: null,

  fetchGraphData: async (query) => {
    set({ isLoading: true, error: null }, false, 'FETCH_GRAPH_DATA_START'); // Adicionando nome à ação
    try {
      const graphData = await generateGraph(query);
      
      const uniqueNodes = Array.from(new Map(graphData.nodes.map(node => [node.id, node])).values());

      set({ 
        nodes: uniqueNodes, 
        edges: graphData.edges, 
        isLoading: false 
      }, false, 'FETCH_GRAPH_DATA_SUCCESS'); // Nomeando a ação de sucesso
    } catch (error) {
      console.error("Falha ao buscar dados do grafo:", error);
      set({ error: error.message, isLoading: false, nodes: [], edges: [] }, false, 'FETCH_GRAPH_DATA_ERROR'); // Nomeando a ação de erro
    }
  },
}), { name: "SynapseGraphStore" })); // Damos um nome ao nosso store para fácil identificação

export default useGraphStore;