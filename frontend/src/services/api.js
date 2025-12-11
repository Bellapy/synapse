// frontend/src/services/api.js

// Usa uma variável de ambiente para a URL da API, com um fallback para desenvolvimento local.
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Chama a API do backend para gerar ou expandir um grafo.
 * @param {string} query - O conceito ou pergunta a ser explorado.
 * @param {string[]} [existingNodeLabels] - (Opcional) Uma lista dos labels dos nós já existentes no grafo.
 * @returns {Promise<object>} Os dados do grafo (nós e arestas) retornados pela API.
 */
export async function generateGraph(query, existingNodeLabels = null) {
  try {
    // Monta o corpo da requisição.
    const requestBody = {
      query: query,
      existing_node_labels: existingNodeLabels
    };

    const response = await fetch(`${API_URL}/api/generate-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Se a resposta do servidor não for 'ok', lança um erro para ser capturado no store.
      const errorData = await response.json();
      throw new Error(errorData.detail || `Erro na API: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Captura erros de rede ou de parsing do JSON.
    console.error("Erro no serviço da API:", error);
    throw error; // Re-lança o erro para ser tratado pela lógica que chamou a função.
  }
}