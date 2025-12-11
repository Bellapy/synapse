// frontend/src/store/graphStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { generateGraph, fetchNodeDetails } from '../services/api';

const useGraphStore = create(devtools((set, get) => ({
  // Estado
  nodes: [],
  edges: [],
  isLoading: false, // Usado para a busca inicial e expansão
  isPanelLoading: false, // Novo estado para o carregamento do painel
  error: null,
  selectedNode: null, // Agora armazena o objeto do nó do grafo (com id, x, y, z...)
  selectedNodeDetails: null, // Novo estado para os detalhes da API
  originalQuery: "", // Novo estado para guardar a primeira pergunta

  // Ações
  fetchGraphData: async (query) => {
    set({ 
      isLoading: true, 
      error: null, 
      selectedNode: null, 
      selectedNodeDetails: null,
      originalQuery: query // Salva a query original
    }, false, 'FETCH_GRAPH_DATA_START');
    try {
      const graphData = await generateGraph(query);
      const uniqueNodes = Array.from(new Map(graphData.nodes.map(node => [node.id, node])).values());
      set({ nodes: uniqueNodes, edges: graphData.edges, isLoading: false }, false, 'FETCH_GRAPH_DATA_SUCCESS');
    } catch (error) {
      set({ error: error.message, isLoading: false, nodes: [], edges: [] }, false, 'FETCH_GRAPH_DATA_ERROR');
    }
  },

  expandNode: async (nodeLabel, expansionType = 'general') => {
    const { nodes: currentNodes } = get();
    if (get().isLoading) return;
    set({ isLoading: true, error: null }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_START`);
    try {
      const existingNodeLabels = currentNodes.map(n => n.label);
      const newGraphData = await generateGraph(nodeLabel, existingNodeLabels, expansionType);
      
      set(state => {
        const nodeMap = new Map(state.nodes.map(node => [node.id, node]));
        newGraphData.nodes.forEach(node => nodeMap.set(node.id, node));
        const newEdges = [...state.edges, ...newGraphData.edges];
        return {
          nodes: Array.from(nodeMap.values()),
          edges: newEdges,
          isLoading: false,
        };
      }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_SUCCESS`);
    } catch (error) {
      set({ error: error.message, isLoading: false }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_ERROR`);
    }
  },

  // Ação de seleção de nó ATUALIZADA
  setSelectedNode: async (node) => {
    if (!node) {
      set({ selectedNode: null, selectedNodeDetails: null }, false, 'CLEAR_SELECTED_NODE');
      return;
    }
    // Define o nó selecionado imediatamente para a câmera focar
    set({ selectedNode: node, isPanelLoading: true, selectedNodeDetails: null, error: null }, false, 'SET_SELECTED_NODE');
    try {
      const { originalQuery, edges } = get();
      // Busca os detalhes contextuais da API
      const details = await fetchNodeDetails(node.label, originalQuery);

      // Calcula as conexões a partir do estado local
      const connections = edges
        .filter(edge => edge.source === node.id || edge.target === node.id)
        .map(edge => {
          const connectedNodeId = edge.source === node.id ? edge.target : edge.source;
          const connectedNode = get().nodes.find(n => n.id === connectedNodeId);
          return connectedNode ? connectedNode.label : null;
        })
        .filter(Boolean); // Filtra nulos caso um nó não seja encontrado

      details.connections = connections;

      set({ selectedNodeDetails: details, isPanelLoading: false }, false, 'FETCH_NODE_DETAILS_SUCCESS');
    } catch (error) {
      set({ error: error.message, isPanelLoading: false }, false, 'FETCH_NODE_DETAILS_ERROR');
    }
  },

  // Ação para limpar a seleção
  clearSelectedNode: () => {
    set({ selectedNode: null, selectedNodeDetails: null }, false, 'CLEAR_SELECTED_NODE');
  },

}), { name: "SynapseGraphStore" }));

export default useGraphStore;