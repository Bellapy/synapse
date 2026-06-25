import { mockInitialGraph, mockExpansionGraph, mockNodeDetails } from './mockData';
import { GraphData, NodeDetails } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const useMock = import.meta.env.VITE_MOCK_API === 'true';

const mockFetch = <T,>(data: T, delay = 500): Promise<T> => 
  new Promise(resolve => setTimeout(() => resolve(data), delay));

export async function generateGraph(query: string, existingNodeLabels: string[] | null = null, expansionType: string = 'general'): Promise<GraphData> {
  if (useMock) {
    console.warn("API MOCK ATIVA: Retornando dados falsos para generateGraph.");
    if (existingNodeLabels) return mockFetch(mockExpansionGraph as GraphData);
    return mockFetch(mockInitialGraph as GraphData);
  }

  try {
    const requestBody = {
      query: query,
      existing_node_labels: existingNodeLabels,
      expansion_type: expansionType,
    };

    const response = await fetch(`${API_URL}/api/generate-graph`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Erro na API: ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Erro no serviço da API (generateGraph):", error);
    throw error;
  }
}

export async function fetchNodeDetails(nodeLabel: string, originalQuery: string): Promise<NodeDetails> {
  if (useMock) {
    console.warn("API MOCK ATIVA: Retornando dados falsos para fetchNodeDetails.");
    return mockFetch({ ...mockNodeDetails, label: nodeLabel } as NodeDetails);
  }

  try {
    const requestBody = { node_label: nodeLabel, original_query: originalQuery };

    const response = await fetch(`${API_URL}/api/node-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Erro na API: ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error("Erro no serviço da API (fetchNodeDetails):", error);
    throw error;
  }
}