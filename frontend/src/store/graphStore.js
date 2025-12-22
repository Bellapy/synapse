// frontend/src/store/graphStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { generateGraph, fetchNodeDetails } from '../services/api';

const useGraphStore = create(devtools((set, get) => ({
  nodes: [],
  edges: [],
  isLoading: false,
  isPanelLoading: false,
  error: null,
  selectedNode: null,
  selectedNodeDetails: null,
  originalQuery: "",

  fetchGraphData: async (query) => {
    set({ isLoading: true, error: null, originalQuery: query }, false, 'FETCH_GRAPH_DATA_START');
    try {
      const graphData = await generateGraph(query);
      // Simplesmente define o grafo, já que é a primeira busca
      set({ nodes: graphData.nodes, edges: graphData.edges, isLoading: false }, false, 'FETCH_GRAPH_DATA_SUCCESS');
    } catch (error) {
      set({ error: error.message, isLoading: false, nodes: [], edges: [] }, false, 'FETCH_GRAPH_DATA_ERROR');
    }
  },

  expandNode: async (nodeLabel, expansionType = 'general') => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_START`);
    
    try {
      const { nodes: currentNodes } = get();
      const existingNodeLabels = currentNodes.map(n => n.label);
      const newGraphData = await generateGraph(nodeLabel, existingNodeLabels, expansionType);
      
      set(state => {
        const nodeLabelMap = new Map(state.nodes.map(node => [node.label, node]));
        const idRemapping = new Map();
        const newNodesToAdd = [];

        newGraphData.nodes.forEach(newNode => {
          if (nodeLabelMap.has(newNode.label)) {
            const existingNode = nodeLabelMap.get(newNode.label);
            idRemapping.set(newNode.id, existingNode.id);
          } else {
            newNodesToAdd.push(newNode);
            nodeLabelMap.set(newNode.label, newNode);
            idRemapping.set(newNode.id, newNode.id);
          }
        });

        const remappedEdges = newGraphData.edges
          .map(edge => ({
            ...edge,
            source: idRemapping.get(edge.source),
            target: idRemapping.get(edge.target),
          }))
          .filter(edge => edge.source && edge.target);

        const edgeSet = new Set(state.edges.map(e => `${e.source}-${e.target}`));
        const newUniqueEdges = remappedEdges.filter(edge => {
            const edgeKey = `${edge.source}-${edge.target}`;
            if (edgeSet.has(edgeKey)) return false;
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

  setSelectedNode: async (node) => {
    if (!node) {
      set({ selectedNode: null, selectedNodeDetails: null }, false, 'CLEAR_SELECTED_NODE');
      return;
    }
    set({ selectedNode: node, isPanelLoading: true, selectedNodeDetails: null, error: null }, false, 'SET_SELECTED_NODE');
    try {
      const { originalQuery, edges, nodes } = get();
      const details = await fetchNodeDetails(node.label, originalQuery);
      
      const connections = edges
        .filter(edge => edge.source === node.id || edge.target === node.id)
        .map(edge => {
          const connectedNodeId = edge.source === node.id ? edge.target : edge.source;
          const connectedNode = nodes.find(n => n.id === connectedNodeId);
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
  
  
  clearGraph: () => {
    set({ nodes: [], edges: [], originalQuery: "" }, false, 'CLEAR_GRAPH');
  },
  

}), { name: "SynapseGraphStore" }));

export default useGraphStore;