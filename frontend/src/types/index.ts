export interface SynapseNode {
  id: string;
  label: string;
  type?: string;
  summary?: string;
  origin?: 'initial' | 'general' | 'counter';

  x?: number;
  y?: number;
  z?: number;
}

export interface SynapseEdge {
  source: string | SynapseNode;
  target: string | SynapseNode;
  relation: string;
  origin?: 'initial' | 'general' | 'counter';
}

export interface GraphData {
  nodes: SynapseNode[];
  edges: SynapseEdge[];
}

export interface NodeDetails {
  label: string;
  type_tag: string;
  contextual_summary: string;
  connections?: string[];
}