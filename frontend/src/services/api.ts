import { GraphData, NodeDetails } from '../types';

// Em produção a URL do backend DEVE vir de VITE_API_URL (configurada no Vercel).
// O fallback para localhost só existe em desenvolvimento.
const API_URL: string = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''))
  .replace(/\/+$/, '');

const useMock = import.meta.env.VITE_MOCK_API === 'true';

// O plano gratuito do Render "dorme" e pode levar ~50s para acordar.
const REQUEST_TIMEOUT_MS = 60000;

const mockFetch = <T,>(data: T, delay = 500): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), delay));

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error('Backend não configurado: defina VITE_API_URL no ambiente de build.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Erros de proxy/cold start (502/503) costumam vir em HTML, não em JSON.
      const errorData = await response.json().catch(() => null);
      const fallback = response.status >= 502
        ? 'O servidor está acordando ou indisponível. Tente novamente em instantes.'
        : `Erro na API (${response.status})`;
      throw new Error(typeof errorData?.detail === 'string' ? errorData.detail : fallback);
    }
    return (await response.json()) as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('O servidor demorou demais para responder. Tente novamente.');
    }
    if (error instanceof TypeError) {
      throw new Error('Não foi possível conectar ao servidor.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateGraph(query: string, existingNodeLabels: string[] | null = null, expansionType: string = 'general'): Promise<GraphData> {
  if (useMock) {
    console.warn('API MOCK ATIVA: Retornando dados falsos para generateGraph.');
    const { mockInitialGraph, mockExpansionGraph } = await import('./mockData');
    return mockFetch((existingNodeLabels ? mockExpansionGraph : mockInitialGraph) as GraphData);
  }

  return postJson<GraphData>('/api/generate-graph', {
    query,
    existing_node_labels: existingNodeLabels,
    expansion_type: expansionType,
  });
}

export async function fetchNodeDetails(nodeLabel: string, originalQuery: string): Promise<NodeDetails> {
  if (useMock) {
    console.warn('API MOCK ATIVA: Retornando dados falsos para fetchNodeDetails.');
    const { mockNodeDetails } = await import('./mockData');
    return mockFetch({ ...mockNodeDetails, label: nodeLabel } as NodeDetails);
  }

  return postJson<NodeDetails>('/api/node-details', {
    node_label: nodeLabel,
    original_query: originalQuery,
  });
}
