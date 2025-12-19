// frontend/src/services/api.js

// MODIFICATION START: Importamos nossos dados falsos
import { mockInitialGraph, mockExpansionGraph, mockNodeDetails } from './mockData';
// MODIFICATION END

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
// MODIFICATION START: Lemos a nossa chave de controle do ambiente
const useMock = import.meta.env.VITE_MOCK_API === 'true';
// MODIFICATION END

/**
 * Simula um atraso de rede para que os spinners de carregamento ainda apareçam.
 * @param {any} data - Os dados a serem retornados após o atraso.
 * @param {number} delay - O tempo de atraso em milissegundos.
 * @returns {Promise<any>}
 */
const mockFetch = (data, delay = 500) => 
  new Promise(resolve => setTimeout(() => resolve(data), delay));


export async function generateGraph(query, existingNodeLabels = null, expansionType = 'general') {
  // MODIFICATION START: Lógica do interruptor
  if (useMock) {
    console.warn("API MOCK ATIVA: Retornando dados falsos para generateGraph.");
    if (existingNodeLabels) {
      return mockFetch(mockExpansionGraph);
    }
    return mockFetch(mockInitialGraph);
  }
  // MODIFICATION END

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
  // MODIFICATION START: Lógica do interruptor
  if (useMock) {
    console.warn("API MOCK ATIVA: Retornando dados falsos para fetchNodeDetails.");
    // Retorna uma cópia para evitar mutações acidentais do objeto original
    return mockFetch({ ...mockNodeDetails, label: nodeLabel });
  }
  // MODIFICATION END

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