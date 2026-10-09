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
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('posts to the configured backend without a double slash', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ nodes: [], edges: [] }));
    const { generateGraph } = await loadApi();

    await generateGraph('entropia', [{ id: 'a', label: 'A' }], 'counter', 'tema original');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/generate-graph');
    expect(JSON.parse(init.body)).toEqual({
      query: 'entropia',
      existing_nodes: [{ id: 'a', label: 'A' }],
      original_query: 'tema original',
      expansion_type: 'counter',
    });
  });

  it('surfaces the API detail message on errors without retrying', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Muitas requisições.' }, 429));
    const { generateGraph } = await loadApi();

    await expect(generateGraph('x')).rejects.toThrow('Muitas requisições.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([503, 422])('does not retry on status %i', async status => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'falhou' }, status));
    const { generateGraph } = await loadApi();

    await expect(generateGraph('x')).rejects.toThrow('falhou');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once when a cold-starting server answers 502, then succeeds', async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }))
      .mockResolvedValueOnce(jsonResponse({ nodes: [], edges: [] }));
    const { generateGraph } = await loadApi();

    const promise = generateGraph('x');
    await vi.advanceTimersByTimeAsync(3000);

    await expect(promise).resolves.toEqual({ nodes: [], edges: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows a friendly message when the cold-starting server keeps answering with HTML', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response('<html>Bad Gateway</html>', { status: 502 }));
    const { fetchNodeDetails } = await loadApi();

    const assertion = expect(fetchNodeDetails('Qualia', 'consciência')).rejects.toThrow(/acordando|indisponível/);
    await vi.advanceTimersByTimeAsync(3000);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a network failure once before giving up', async () => {
    vi.useFakeTimers();
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { generateGraph } = await loadApi();

    const assertion = expect(generateGraph('x')).rejects.toThrow('Não foi possível conectar ao servidor.');
    await vi.advanceTimersByTimeAsync(3000);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('turns an aborted request into a timeout message without retrying', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const { generateGraph } = await loadApi();

    await expect(generateGraph('x')).rejects.toThrow('demorou demais');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses mock data without touching the network in mock mode', async () => {
    const { generateGraph, warmUpBackend } = await loadApi({ VITE_MOCK_API: 'true' });

    const data = await generateGraph('qualquer coisa');
    warmUpBackend();

    expect(data.nodes.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('warmUpBackend', () => {
    it('pings the health endpoint', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));
      const { warmUpBackend } = await loadApi();

      warmUpBackend();

      expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/health');
    });

    it('swallows failures', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const { warmUpBackend } = await loadApi();

      expect(() => warmUpBackend()).not.toThrow();
    });
  });
});
