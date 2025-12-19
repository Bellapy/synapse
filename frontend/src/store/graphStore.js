// frontend/src/store/graphStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { generateGraph, fetchNodeDetails } from '../services/api';

const useGraphStore = create(devtools((set, get) => ({
  // Estado
  nodes: [],
  edges: [],
  isLoading: false,
  isPanelLoading: false,
  error: null,
  selectedNode: null,
  selectedNodeDetails: null,
  originalQuery: "",

  // Ações
  fetchGraphData: async (query) => {
    set({ 
      isLoading: true, 
      error: null, 
      selectedNode: null, 
      selectedNodeDetails: null,
      originalQuery: query
    }, false, 'FETCH_GRAPH_DATA_START');
    try {
      const graphData = await generateGraph(query);
      const uniqueNodes = Array.from(new Map(graphData.nodes.map(node => [node.id, node])).values());
      set({ nodes: uniqueNodes, edges: graphData.edges, isLoading: false }, false, 'FETCH_GRAPH_DATA_SUCCESS');
    } catch (error) {
      set({ error: error.message, isLoading: false, nodes: [], edges: [] }, false, 'FETCH_GRAPH_DATA_ERROR');
    }
  },

  // MODIFICATION START: Lógica de merge de expansão totalmente refatorada
  expandNode: async (nodeLabel, expansionType = 'general') => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_START`);
    
    try {
      const { nodes: currentNodes, edges: currentEdges } = get();
      const existingNodeLabels = currentNodes.map(n => n.label);
      const newGraphData = await generateGraph(nodeLabel, existingNodeLabels, expansionType);
      
      set(state => {
        // CRÍTICO: Resolve o problema de IDs instáveis da IA.
        // A fonte da verdade para a identidade de um nó é o seu LABEL.
        const nodeLabelMap = new Map(state.nodes.map(node => [node.label, node]));
        const idRemapping = new Map();
        const newNodesToAdd = [];

        // 1. De-duplicar nós baseados no LABEL, não no ID.
        newGraphData.nodes.forEach(newNode => {
          if (nodeLabelMap.has(newNode.label)) {
            // O nó já existe. Mapeamos o ID instável da IA para o nosso ID estável.
            const existingNode = nodeLabelMap.get(newNode.label);
            idRemapping.set(newNode.id, existingNode.id);
          } else {
            // É um nó genuinamente novo.
            newNodesToAdd.push(newNode);
            nodeLabelMap.set(newNode.label, newNode);
            // Mapeamos o novo ID para si mesmo para consistência.
            idRemapping.set(newNode.id, newNode.id);
          }
        });

        // 2. "Reescrever" as arestas com os IDs estáveis.
        const remappedEdges = newGraphData.edges
          .map(edge => ({
            ...edge,
            source: idRemapping.get(edge.source),
            target: idRemapping.get(edge.target),
          }))
          .filter(edge => edge.source && edge.target); // Filtra arestas quebradas

        // 3. De-duplicar arestas para evitar múltiplos links entre os mesmos nós.
        const edgeSet = new Set(state.edges.map(e => `${e.source}-${e.target}`));
        const newUniqueEdges = remappedEdges.filter(edge => {
            const edgeKey = `${edge.source}-${edge.target}`;
            if (edgeSet.has(edgeKey)) {
                return false;
            }
            edgeSet.add(edgeKey);
            return true;
        });

        return {
          nodes: [...state.nodes, ...newNodesToAdd],
          edges: [...state.edges, ...newUniqueEdges],
          isLoading: false,
        };
      }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_SUCCESS`);

    } catch (error) {
      set({ error: error.message, isLoading: false }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_ERROR`);
    }
  },
  // MODIFICATION END

  setSelectedNode: async (node) => {
    if (!node) {
      set({ selectedNode: null, selectedNodeDetails: null }, false, 'CLEAR_SELECTED_NODE');
      return;
    }
    set({ selectedNode: node, isPanelLoading: true, selectedNodeDetails: null, error: null }, false, 'SET_SELECTED_NODE');
    try {
      const { originalQuery, edges } = get();
      const details = await fetchNodeDetails(node.label, originalQuery);
      const connections = edges
        .filter(edge => edge.source === node.id || edge.target === node.id)
        .map(edge => {
          const connectedNodeId = edge.source === node.id ? edge.target : edge.source;
          const connectedNode = get().nodes.find(n => n.id === connectedNodeId);
          return connectedNode ? connectedNode.label : null;
        })
        .filter(Boolean);
      details.connections = connections;
      set({ selectedNodeDetails: details, isPanelLoading: false }, false, 'FETCH_NODE_DETAILS_SUCCESS');
    } catch (error) {
      set({ error: error.message, isPanelLoading: false }, false, 'FETCH_NODE_DETAILS_ERROR');
    }
  },

  clearSelectedNode: () => {
    set({ selectedNode: null, selectedNodeDetails: null }, false, 'CLEAR_SELECTED_NODE');
  },

}), { name: "SynapseGraphStore" }));

export default useGraphStore;