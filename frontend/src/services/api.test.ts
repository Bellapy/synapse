import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// api.ts lê VITE_API_URL na importação, por isso cada teste reimporta o módulo.
async function loadApi(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('VITE_API_URL', env.VITE_API_URL ?? 'https://api.example.com/');
  vi.stubEnv('VITE_MOCK_API', env.VITE_MOCK_API ?? 'false');
  return import('./api');
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('posts to the configured backend without a double slash', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ nodes: [], edges: [] }));
    const { generateGraph } = await loadApi();

    await generateGraph('entropia', ['A'], 'counter');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/generate-graph');
    expect(JSON.parse(init.body)).toEqual({
      query: 'entropia',
      existing_node_labels: ['A'],
      expansion_type: 'counter',
    });
  });

  it('surfaces the API detail message on errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Muitas requisições.' }, 429));
    const { generateGraph } = await loadApi();

    await expect(generateGraph('x')).rejects.toThrow('Muitas requisições.');
  });

  it('shows a friendly message when a cold-starting server answers with HTML', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));
    const { fetchNodeDetails } = await loadApi();

    await expect(fetchNodeDetails('Qualia', 'consciência')).rejects.toThrow(/acordando|indisponível/);
  });

  it('turns network failures into a readable error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { generateGraph } = await loadApi();

    await expect(generateGraph('x')).rejects.toThrow('Não foi possível conectar ao servidor.');
  });

  it('turns an aborted request into a timeout message', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const { generateGraph } = await loadApi();

    await expect(generateGraph('x')).rejects.toThrow('demorou demais');
  });

  it('uses mock data without touching the network in mock mode', async () => {
    const { generateGraph } = await loadApi({ VITE_MOCK_API: 'true' });

    const data = await generateGraph('qualquer coisa');

    expect(data.nodes.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
