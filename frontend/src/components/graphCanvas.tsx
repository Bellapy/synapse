import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import useMeasure from 'react-use-measure';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Vector2 } from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { useShallow } from 'zustand/react/shallow';
import useGraphStore from '../store/graphStore';
import { useExpandNode } from '../hooks/useGraphQueries';
import { SynapseNode } from '../types';

const ForceGraph3DComponent = ForceGraph3D as any;

type Origin = NonNullable<SynapseNode['origin']>;

const NODE_COLORS: Record<Origin, string> = {
  initial: '#22d3ee',
  general: '#34d399',
  counter: '#f43f5e',
};

const LINK_COLORS: Record<Origin, string> = {
  initial: '#d946ef',
  general: '#34d399',
  counter: '#f43f5e',
};

const VERTEX_SHADER = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 coreColor;
  uniform vec3 glowColor;
  varying vec3 vNormal;
  void main() {
    float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float falloff = pow(intensity, 4.0);
    vec3 blendedColor = mix(glowColor, coreColor, falloff);
    float alpha = falloff * 0.8 + 0.2;
    gl_FragColor = vec4(blendedColor, alpha);
  }
`;

// Uma geometria e um material por origem, compartilhados entre todos os nós
// (antes cada nó, a cada render, criava os seus e nunca os liberava).
const sharedGeometry = new THREE.SphereGeometry(5, 24, 24);
const materialCache = new Map<Origin, THREE.ShaderMaterial>();

const getMaterial = (origin: Origin) => {
  let material = materialCache.get(origin);
  if (!material) {
    material = new THREE.ShaderMaterial({
      uniforms: {
        coreColor: { value: new THREE.Color('#ffffff') },
        glowColor: { value: new THREE.Color(NODE_COLORS[origin]) },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    materialCache.set(origin, material);
  }
  return material;
};

const getNodeObject = (node: SynapseNode) =>
  new THREE.Mesh(sharedGeometry, getMaterial(node.origin ?? 'initial')) as any;

const getLinkColor = (link: any) => LINK_COLORS[(link.origin as Origin) ?? 'initial'] ?? LINK_COLORS.initial;

const GraphCanvas = () => {
  const { nodes, edges, setSelectedNode, clearSelectedNode } = useGraphStore(
    useShallow(state => ({
      nodes: state.nodes,
      edges: state.edges,
      setSelectedNode: state.setSelectedNode,
      clearSelectedNode: state.clearSelectedNode,
    }))
  );
  const { expand } = useExpandNode();
  const graphRef = useRef<any>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const [ref, bounds] = useMeasure();

  const graphData = useMemo(() => ({
    nodes,
    links: edges.map(edge => ({
      ...edge,
      source: typeof edge.source === 'object' ? edge.source.id : edge.source,
      target: typeof edge.target === 'object' ? edge.target.id : edge.target,
      name: edge.relation,
    })),
  }), [nodes, edges]);

  const hasGraph = nodes.length > 0 && bounds.width > 0;

  // O ForceGraph só existe depois de haver nós e medidas; antes disso graphRef é nulo.
  // Por isso o efeito depende de `hasGraph` e aplica o bloom uma única vez.
  useEffect(() => {
    const graph = graphRef.current;
    if (!hasGraph || !graph || bloomRef.current) return;

    const bloom = new UnrealBloomPass(new Vector2(bounds.width, bounds.height), 0.6, 0.4, 0.3);
    graph.postProcessingComposer().addPass(bloom);
    bloomRef.current = bloom;

    // Limita o custo em telas de alta densidade.
    graph.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, [hasGraph, bounds.width, bounds.height]);

  useEffect(() => {
    bloomRef.current?.setSize(bounds.width, bounds.height);
  }, [bounds.width, bounds.height]);

  // Pausa o loop de render quando a aba está oculta.
  useEffect(() => {
    const onVisibility = () => {
      const graph = graphRef.current;
      if (!graph) return;
      if (document.hidden) graph.pauseAnimation();
      else graph.resumeAnimation();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Libera recursos da GPU ao desmontar.
  useEffect(() => {
    return () => {
      bloomRef.current?.dispose();
      bloomRef.current = null;
      // O ForceGraph só existe depois do primeiro render com nós medidos, então a ref é lida aqui, no desmonte.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      graphRef.current?._destructor?.();
    };
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    const { x = 0, y = 0, z = 0 } = node;
    const distRatio = 1 + 40 / Math.max(Math.hypot(x, y, z), 1);
    graphRef.current?.cameraPosition({ x: x * distRatio, y: y * distRatio, z: z * distRatio }, node, 3000);
    setSelectedNode(node);
  }, [setSelectedNode]);

  const handleNodeDoubleClick = useCallback((node: any) => {
    clearSelectedNode();
    expand(node.label);
  }, [clearSelectedNode, expand]);

  if (nodes.length === 0) return null;

  return (
    // O bloom torna o fundo do canvas opaco (preto); `screen` o deixa transparente sobre o gradiente da página.
    <div ref={ref} className="absolute top-0 left-0 w-full h-full z-0" style={{ mixBlendMode: 'screen' }}>
      {bounds.width > 0 && (
        <ForceGraph3DComponent
          ref={graphRef}
          width={bounds.width}
          height={bounds.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          rendererConfig={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          cooldownTicks={200}
          nodeLabel="label"
          linkLabel="name"
          nodeThreeObject={getNodeObject}
          linkColor={getLinkColor}
          linkWidth={0.3}
          linkOpacity={0.5}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onBackgroundClick={clearSelectedNode}
        />
      )}
    </div>
  );
};

export default memo(GraphCanvas);
