export interface SynapseNode {
  id: string;
  label: string;
  type: string;
  summary: string;
  origin: 'initial' | 'general' | 'counter';
  x?: number;
  y?: number;
  z?: number;
}