import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { generateGraph, fetchNodeDetails } from '../services/api';
import { SynapseNode, SynapseEdge, NodeDetails } from '../types';

interface GraphState {
  nodes: SynapseNode[];
  edges: SynapseEdge[];
  isLoading: boolean;
  isPanelLoading: boolean;
  error: string | null;
  selectedNode: SynapseNode | null;
  selectedNodeDetails: NodeDetails | null;
  originalQuery: string;
  cachedNodeDetails: Record<string, NodeDetails>;

  fetchGraphData: (query: string) => Promise<void>;
  expandNode: (nodeLabel: string, expansionType?: string) => Promise<void>;
  setSelectedNode: (node: SynapseNode | null) => Promise<void>;
  clearSelectedNode: () => void;
  clearGraph: () => void;
}

const useGraphStore = create<GraphState>()(devtools((set, get) => ({
  nodes: [],
  edges: [],
  isLoading: false,
  isPanelLoading: false,
  error: null,
  selectedNode: null,
  selectedNodeDetails: null,
  originalQuery: "",
  cachedNodeDetails: {},

  fetchGraphData: async (query: string) => {
    set({ isLoading: true, error: null, originalQuery: query }, false, 'FETCH_GRAPH_DATA_START' as any);
    try {
      const graphData = await generateGraph(query);
      set({ nodes: graphData.nodes, edges: graphData.edges, isLoading: false }, false, 'FETCH_GRAPH_DATA_SUCCESS' as any);
    } catch (error: any) {
      set({ error: error.message, isLoading: false, nodes: [], edges: [] }, false, 'FETCH_GRAPH_DATA_ERROR' as any);
    }
  },

  expandNode: async (nodeLabel: string, expansionType = 'general') => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_START` as any);
    
    try {
      const { nodes: currentNodes } = get();
      const existingNodeLabels = currentNodes.map(n => n.label);
      const newGraphData = await generateGraph(nodeLabel, existingNodeLabels, expansionType);
      
      set(state => {
        const nodeLabelMap = new Map(state.nodes.map(node => [node.label, node]));
        const idRemapping = new Map<string, string>();
        const newNodesToAdd: SynapseNode[] = [];

        newGraphData.nodes.forEach(newNode => {
          if (nodeLabelMap.has(newNode.label)) {
            const existingNode = nodeLabelMap.get(newNode.label)!;
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
            source: idRemapping.get(edge.source as string) || edge.source,
            target: idRemapping.get(edge.target as string) || edge.target,
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
      }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_SUCCESS` as any);

    } catch (error: any) {
      set({ error: error.message, isLoading: false }, false, `EXPAND_NODE_${expansionType.toUpperCase()}_ERROR` as any);
    }
  },

  setSelectedNode: async (node: SynapseNode | null) => {
    if (!node) {
      set({ selectedNode: null, selectedNodeDetails: null }, false, 'CLEAR_SELECTED_NODE' as any);
      return;
    }

    const { cachedNodeDetails, originalQuery, edges, nodes } = get();

    if (cachedNodeDetails && cachedNodeDetails[node.label]) {
      set({ 
        selectedNode: node, 
        selectedNodeDetails: cachedNodeDetails[node.label], 
        isPanelLoading: false 
      }, false, 'FETCH_NODE_DETAILS_CACHE_HIT' as any);
      return;
    }

    set({ selectedNode: node, isPanelLoading: true, selectedNodeDetails: null, error: null }, false, 'SET_SELECTED_NODE' as any);
    try {
      const details = await fetchNodeDetails(node.label, originalQuery);
      
      const connections = edges
        .filter(edge => edge.source === node.id || edge.target === node.id)
        .map(edge => {
          const connectedNodeId = edge.source === node.id ? edge.target : edge.source;
          const connectedNode = nodes.find(n => n.id === connectedNodeId);
          return connectedNode ? connectedNode.label : null;
        })
        .filter(Boolean) as string[];
        
      details.connections = connections;
   
      set(state => ({
        selectedNodeDetails: details,
        isPanelLoading: false,
        cachedNodeDetails: {
          ...state.cachedNodeDetails,
          [node.label]: details
        }
      }), false, 'FETCH_NODE_DETAILS_SUCCESS' as any);
    } catch (error: any) {
      set({ error: error.message, isPanelLoading: false }, false, 'FETCH_NODE_DETAILS_ERROR' as any);
    }
  },

  clearSelectedNode: () => set({ selectedNode: null, selectedNodeDetails: null }, false, 'CLEAR_SELECTED_NODE' as any),
  clearGraph: () => set({ nodes: [], edges: [], originalQuery: "", cachedNodeDetails: {} }, false, 'CLEAR_GRAPH' as any),

}), { name: "SynapseGraphStore" }));

export default useGraphStore;