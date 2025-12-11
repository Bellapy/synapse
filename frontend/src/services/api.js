// frontend/src/services/api.js

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Chama a API para gerar ou expandir um grafo.
 * @param {string} query - O conceito a ser explorado.
 * @param {string[]} [existingNodeLabels] - (Opcional) Labels dos nós existentes.
 * @param {string} [expansionType] - (Opcional) 'general' ou 'counter'.
 * @returns {Promise<object>} Os dados do grafo.
 */
export async function generateGraph(query, existingNodeLabels = null, expansionType = 'general') {
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

/**
 * Busca os detalhes contextuais de um nó na API.
 * @param {string} nodeLabel - O label do nó selecionado.
 * @param {string} originalQuery - A pergunta inicial do usuário.
 * @returns {Promise<object>} Os detalhes do nó (type_tag, contextual_summary, etc.).
 */
export async function fetchNodeDetails(nodeLabel, originalQuery) {
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