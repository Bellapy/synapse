// frontend/src/services/api.js


import { mockInitialGraph, mockExpansionGraph, mockNodeDetails } from './mockData';


const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const useMock = import.meta.env.VITE_MOCK_API === 'true';


/**

 * @param {any} data
 * @param {number} delay 
 * @returns {Promise<any>}
 */
const mockFetch = (data, delay = 500) => 
  new Promise(resolve => setTimeout(() => resolve(data), delay));


export async function generateGraph(query, existingNodeLabels = null, expansionType = 'general') {
  
  if (useMock) {
    console.warn("API MOCK ATIVA: Retornando dados falsos para generateGraph.");
    if (existingNodeLabels) {
      return mockFetch(mockExpansionGraph);
    }
    return mockFetch(mockInitialGraph);
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
  } catch (error) {
    console.error("Erro no serviço da API (generateGraph):", error);
    throw error;
  }
}

export async function fetchNodeDetails(nodeLabel, originalQuery) {
  
  if (useMock) {
    console.warn("API MOCK ATIVA: Retornando dados falsos para fetchNodeDetails.");
    // Retorna uma cópia para evitar mutações acidentais do objeto original
    return mockFetch({ ...mockNodeDetails, label: nodeLabel });
  }
 

  try {
    const requestBody = {
      node_label: nodeLabel,
      original_query: originalQuery,
    };

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
  } catch (error) {
    console.error("Erro no serviço da API (fetchNodeDetails):", error);
    throw error;
  }
}