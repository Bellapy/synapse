import { beforeEach, describe, expect, it } from 'vitest';
import useGraphStore from './graphStore';
import { GraphData } from '../types';

const graph: GraphData = {
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  edges: [{ source: 'a', target: 'b', relation: 'liga' }],
};

describe('graphStore', () => {
  beforeEach(() => {
    useGraphStore.getState().clearGraph();
    useGraphStore.getState().setError(null);
  });

  it('setGraph replaces the graph and remembers the original query', () => {
    useGraphStore.getState().setSelectedNode(graph.nodes[0]);
    useGraphStore.getState().setGraph('o que é A?', graph);

    const state = useGraphStore.getState();
    expect(state.nodes).toHaveLength(2);
    expect(state.originalQuery).toBe('o que é A?');
    expect(state.selectedNode).toBeNull();
  });

  it('applyExpansion merges into the current graph', () => {
    useGraphStore.getState().setGraph('q', graph);
    useGraphStore.getState().applyExpansion({
      nodes: [{ id: 'c', label: 'C' }],
      edges: [{ source: 'a', target: 'c', relation: 'gera' }],
    });

    const state = useGraphStore.getState();
    expect(state.nodes.map(n => n.label)).toEqual(['A', 'B', 'C']);
    expect(state.edges).toHaveLength(2);
  });

  it('clearGraph resets graph, query and selection', () => {
    useGraphStore.getState().setGraph('q', graph);
    useGraphStore.getState().setSelectedNode(graph.nodes[0]);
    useGraphStore.getState().clearGraph();

    const state = useGraphStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.originalQuery).toBe('');
    expect(state.selectedNode).toBeNull();
  });
});
