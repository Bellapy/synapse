// frontend/src/services/api.js

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export async function generateGraph(query) {
  try {
    const response = await fetch(`${API_URL}/api/generate-graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: query }),
    });

    if (!response.ok) {
      // Se a resposta do servidor não for 'ok' (ex: erro 500), lança um erro
      throw new Error(`Erro na API: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Captura erros de rede ou de parsing do JSON
    console.error("Erro no serviço da API:", error);
    throw error; // Re-lança o erro para ser capturado no store
  }
}