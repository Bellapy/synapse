import { describe, expect, it } from 'vitest';
import { mergeExpansion } from './mergeGraph';
import { GraphData } from '../types';

const base: GraphData = {
  nodes: [
    { id: 'a', label: 'Consciência', origin: 'initial' },
    { id: 'b', label: 'Qualia', origin: 'initial' },
  ],
  edges: [{ source: 'a', target: 'b', relation: 'inclui', origin: 'initial' }],
};

describe('mergeExpansion', () => {
  it('adds new nodes and edges', () => {
    const incoming: GraphData = {
      nodes: [
        { id: 'a', label: 'Consciência', origin: 'general' },
        { id: 'c', label: 'Atenção', origin: 'general' },
      ],
      edges: [{ source: 'a', target: 'c', relation: 'depende de', origin: 'general' }],
    };

    const result = mergeExpansion(base, incoming);

    expect(result.nodes.map(n => n.id)).toEqual(['a', 'b', 'c']);
    expect(result.edges).toHaveLength(2);
  });

  it('reuses an existing node when the label matches, remapping the new id', () => {
    const incoming: GraphData = {
      nodes: [
        { id: 'x1', label: 'Qualia', origin: 'general' },
        { id: 'x2', label: 'Emergência', origin: 'general' },
      ],
      edges: [{ source: 'x1', target: 'x2', relation: 'sugere', origin: 'general' }],
    };

    const result = mergeExpansion(base, incoming);

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.find(n => n.label === 'Qualia')?.origin).toBe('initial');
    expect(result.edges[1]).toMatchObject({ source: 'b', target: 'x2' });
  });

  it('drops duplicate edges, including ones that only become duplicates after remapping', () => {
    const incoming: GraphData = {
      nodes: [
        { id: 'p', label: 'Consciência' },
        { id: 'q', label: 'Qualia' },
      ],
      edges: [
        { source: 'p', target: 'q', relation: 'repetida' },
        { source: 'a', target: 'b', relation: 'repetida de novo' },
      ],
    };

    const result = mergeExpansion(base, incoming);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });

  it('does not mutate the current graph', () => {
    const snapshot = JSON.stringify(base);
    mergeExpansion(base, { nodes: [{ id: 'z', label: 'Novo' }], edges: [] });
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});
