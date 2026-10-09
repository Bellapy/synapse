import { GraphData, NodeDetails } from '../types';

// Em produção a URL do backend DEVE vir de VITE_API_URL (configurada no Vercel).
// O fallback para localhost só existe em desenvolvimento.
const API_URL: string = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''))
  .replace(/\/+$/, '');

const useMock = import.meta.env.VITE_MOCK_API === 'true';

// O plano gratuito do Render "dorme": acordar leva ~50s e a IA ~2s. O servidor limita a própria IA a 40s.
const REQUEST_TIMEOUT_MS = 75000;
// Enquanto o Render acorda, o proxy dele responde 502/504: uma nova tentativa quase sempre resolve.
const RETRYABLE_STATUS = new Set([502, 504]);
const RETRY_DELAY_MS = 2500;

export interface KnownNode {
  id: string;
  label: string;
}

const mockFetch = <T,>(data: T, delay = 500): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), delay));

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function postOnce<T>(path: string, body: unknown): Promise<T> {
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
      // Erros de proxy/cold start costumam vir em HTML, não em JSON.
      const errorData = await response.json().catch(() => null);
      const fallback = response.status >= 502
        ? 'O servidor está acordando ou indisponível. Tente novamente em instantes.'
        : `Erro na API (${response.status})`;
      throw new HttpError(typeof errorData?.detail === 'string' ? errorData.detail : fallback, response.status);
    }
    return (await response.json()) as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('O servidor demorou demais para responder. Tente novamente.');
    }
    if (error instanceof TypeError) {
      throw new HttpError('Não foi possível conectar ao servidor.', 0);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  if (!API_URL) {
    throw new Error('Backend não configurado: defina VITE_API_URL no ambiente de build.');
  }

  try {
    return await postOnce<T>(path, body);
  } catch (error) {
    const retryable = error instanceof HttpError && (error.status === 0 || RETRYABLE_STATUS.has(error.status));
    if (!retryable) throw error;
    await sleep(RETRY_DELAY_MS);
    return postOnce<T>(path, body);
  }
}

/**
 * Acorda o backend assim que a página abre (fire-and-forget): o plano gratuito do Render dorme após alguns minutos
 * e o primeiro pedido real pagaria ~50s. Enquanto a pessoa digita a pergunta, o servidor já está subindo.
 */
export function warmUpBackend(): void {
  if (useMock || !API_URL) return;
  fetch(`${API_URL}/api/health`).catch(() => undefined);
}

export async function generateGraph(
  query: string,
  existingNodes: KnownNode[] | null = null,
  expansionType: string = 'general',
  originalQuery: string | null = null,
): Promise<GraphData> {
  if (useMock) {
    console.warn('API MOCK ATIVA: Retornando dados falsos para generateGraph.');
    const { mockInitialGraph, mockExpansionGraph } = await import('./mockData');
    return mockFetch((existingNodes ? mockExpansionGraph : mockInitialGraph) as GraphData);
  }

  return postJson<GraphData>('/api/generate-graph', {
    query,
    existing_nodes: existingNodes,
    original_query: originalQuery,
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
