import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useMeasure from 'react-use-measure';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Vector2 } from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { useShallow } from 'zustand/react/shallow';
import useGraphStore from '../store/graphStore';
import { useExpandNode } from '../hooks/useGraphQueries';
import { SynapseNode } from '../types';

const ForceGraph3DComponent = ForceGraph3D as any;

type Origin = NonNullable<SynapseNode['origin']>;

/** Cada origem tem sua própria "substância": núcleo, corpo e um brilho de borda. */
const PALETTE: Record<Origin, { core: string; body: string; rim: string; link: string; scale: number }> = {
  initial: { core: '#4a2bff', body: '#ff4f93', rim: '#58b8ff', link: '#b9a2ff', scale: 1.7 },
  general: { core: '#ff6a3d', body: '#ffc46b', rim: '#ff7aa8', link: '#ffc79a', scale: 1.25 },
  counter: { core: '#a3124f', body: '#ff5a86', rim: '#ffb3c7', link: '#ff7e9d', scale: 1.15 },
};

// Tempo compartilhado entre todos os materiais: um único valor, atualizado uma vez por quadro.
const timeUniform = { value: 0 };

const ORB_VERTEX = `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vBlob;

  // Ondulação barata (soma de senos) que faz a superfície "respirar" como uma gota.
  float blob(vec3 p, float t) {
    return sin(p.x * 0.9 + t * 1.1 + p.y * 0.6) * 0.5
         + sin(p.y * 1.1 - t * 0.9 + p.z * 0.7) * 0.3
         + sin(p.z * 1.3 + t * 0.7 - p.x * 0.5) * 0.2;
  }

  void main() {
    vec3 seed = modelMatrix[3].xyz * 0.021;
    float b = blob(position * 0.55 + seed, uTime);
    vec3 displaced = position + normal * b * 0.9;
    vBlob = b;
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normalize(normal + vec3(b * 0.15)));
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const ORB_FRAGMENT = `
  uniform vec3 uCore;
  uniform vec3 uBody;
  uniform vec3 uRim;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vBlob;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    float facing = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - facing, 2.4);

    // Miolo em degradê, deslocado pela ondulação para a cor "escorrer" em vez de ser chapada.
    float k = smoothstep(-0.55, 0.75, N.y * 0.7 + vBlob * 0.9);
    vec3 col = mix(uCore, uBody, k);

    // Borda iridescente: o matiz gira de leve com o ângulo e com o tempo, como película de sabão.
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fresnel * 0.8 + vec3(0.0, 0.33, 0.67) + uTime * 0.04 + vBlob * 0.3));
    col += mix(uRim, irid, 0.4) * fresnel * 0.85;

    // Brilho especular macio, sempre do mesmo lado: dá volume sem parecer plástico.
    vec3 L = normalize(vec3(-0.45, 0.7, 0.6));
    col += pow(max(dot(reflect(-L, N), V), 0.0), 26.0) * 0.32;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const LINK_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LINK_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // Pulsos de luz que viajam pela ligação; o resto fica como um fio fino e translúcido.
    float pulse = pow(0.5 + 0.5 * sin(vUv.x * 14.0 - uTime * 2.2), 3.0);
    float ends = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float a = (0.28 + 0.6 * pulse) * ends;
    gl_FragColor = vec4(uColor * (0.8 + 0.7 * pulse), a);
  }
`;

// Uma geometria e um material por origem, compartilhados entre todos os nós.
const sharedGeometry = new THREE.IcosahedronGeometry(5, 6);
const orbMaterials = new Map<Origin, THREE.ShaderMaterial>();
const linkMaterials = new Map<Origin, THREE.ShaderMaterial>();

const getOrbMaterial = (origin: Origin) => {
  let material = orbMaterials.get(origin);
  if (!material) {
    const colors = PALETTE[origin];
    material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: timeUniform,
        uCore: { value: new THREE.Color(colors.core) },
        uBody: { value: new THREE.Color(colors.body) },
        uRim: { value: new THREE.Color(colors.rim) },
      },
      vertexShader: ORB_VERTEX,
      fragmentShader: ORB_FRAGMENT,
    });
    orbMaterials.set(origin, material);
  }
  return material;
};

const getLinkMaterial = (origin: Origin) => {
  let material = linkMaterials.get(origin);
  if (!material) {
    material = new THREE.ShaderMaterial({
      uniforms: { uTime: timeUniform, uColor: { value: new THREE.Color(PALETTE[origin].link) } },
      vertexShader: LINK_VERTEX,
      fragmentShader: LINK_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    linkMaterials.set(origin, material);
  }
  return material;
};

const getNodeObject = (node: SynapseNode) => {
  const origin = node.origin ?? 'initial';
  const group = new THREE.Group();

  const orb = new THREE.Mesh(sharedGeometry, getOrbMaterial(origin));
  orb.scale.setScalar(PALETTE[origin].scale);
  orb.onBeforeRender = () => {
    timeUniform.value = performance.now() / 1000;
  };
  group.add(orb);

  const element = document.createElement('div');
  element.className = 'node-label';
  element.dataset.origin = origin;
  const text = document.createElement('span');
  text.textContent = node.label;
  element.appendChild(text);
  group.add(new CSS2DObject(element));

  return group as any;
};

// Curvaturas e rotações variam por ligação (determinístico pelo índice) para o conjunto parecer orgânico.
const linkCurvature = (link: any) => 0.14 + ((link.__idx * 37) % 10) * 0.02;
const linkRotation = (link: any) => ((link.__idx * 53) % 360) * (Math.PI / 180);
const getLinkMaterialFor = (link: any) => getLinkMaterial((link.origin as Origin) ?? 'initial');
const getParticleColor = (link: any) => PALETTE[(link.origin as Origin) ?? 'initial'].link;
const linkLabel = (link: any) => `<span class="link-tip">${link.name ?? ''}</span>`;

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
  const [measureRef, bounds] = useMeasure();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ref = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
    measureRef(element);
  }, [measureRef]);
  // Os rótulos são HTML (tipografia de verdade) desenhado por cima da cena; o renderer é criado uma vez.
  const [extraRenderers] = useState(() => [new CSS2DRenderer() as any]);

  const graphData = useMemo(() => ({
    nodes,
    links: edges.map((edge, index) => ({
      ...edge,
      source: typeof edge.source === 'object' ? edge.source.id : edge.source,
      target: typeof edge.target === 'object' ? edge.target.id : edge.target,
      name: edge.relation,
      __idx: index,
    })),
  }), [nodes, edges]);

  const hasGraph = nodes.length > 0 && bounds.width > 0;

  // O ForceGraph só existe depois de haver nós e medidas; antes disso graphRef é nulo.
  // Por isso o efeito depende de `hasGraph` e configura bloom e câmera uma única vez.
  useEffect(() => {
    const graph = graphRef.current;
    if (!hasGraph || !graph || bloomRef.current) return;

    const bloom = new UnrealBloomPass(new Vector2(bounds.width, bounds.height), 0.55, 0.7, 0.62);
    graph.postProcessingComposer().addPass(bloom);
    bloomRef.current = bloom;

    // Limita o custo em telas de alta densidade.
    graph.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // O grafo gira devagar sozinho: parado, o 3D parece uma imagem.
    const controls = graph.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableDamping = true;

    // Nós maiores e com rótulo precisam de mais espaço entre si; a câmera começa perto e se ajusta ao terminar.
    graph.d3Force('link')?.distance(85);
    graph.d3Force('charge')?.strength(-170);
    graph.cameraPosition({ x: 0, y: 0, z: 320 });
  }, [hasGraph, bounds.width, bounds.height]);

  // Quando o layout assenta (inclusive após uma expansão), a câmera enquadra o grafo inteiro.
  const handleEngineStop = useCallback(() => {
    if (!useGraphStore.getState().selectedNode) graphRef.current?.zoomToFit(1200, 150);
  }, []);

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
    const distRatio = 1 + 60 / Math.max(Math.hypot(x, y, z), 1);
    const graph = graphRef.current;
    if (graph) graph.controls().autoRotate = false;
    graph?.cameraPosition({ x: x * distRatio, y: y * distRatio, z: z * distRatio }, node, 2200);
    setSelectedNode(node);
  }, [setSelectedNode]);

  const handleBackgroundClick = useCallback(() => {
    const graph = graphRef.current;
    if (graph) graph.controls().autoRotate = true;
    clearSelectedNode();
  }, [clearSelectedNode]);

  const handleNodeDoubleClick = useCallback((node: any) => {
    clearSelectedNode();
    expand(node.label);
  }, [clearSelectedNode, expand]);

  const handleNodeHover = useCallback((node: any) => {
    if (containerRef.current) containerRef.current.style.cursor = node ? 'pointer' : 'grab';
  }, []);

  if (nodes.length === 0) return null;

  return (
    // O bloom torna o fundo do canvas opaco (preto); `screen` o deixa transparente sobre o fundo fluido da página.
    <div ref={ref} className="absolute left-0 top-0 z-0 h-full w-full" style={{ mixBlendMode: 'screen', cursor: 'grab' }}>
      {bounds.width > 0 && (
        <ForceGraph3DComponent
          ref={graphRef}
          width={bounds.width}
          height={bounds.height}
          graphData={graphData}
          controlType="orbit"
          extraRenderers={extraRenderers}
          showNavInfo={false}
          backgroundColor="rgba(0,0,0,0)"
          rendererConfig={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          cooldownTicks={200}
          warmupTicks={25}
          onEngineStop={handleEngineStop}
          nodeLabel={null}
          linkLabel={linkLabel}
          nodeThreeObject={getNodeObject}
          linkMaterial={getLinkMaterialFor}
          linkWidth={1.2}
          linkCurvature={linkCurvature}
          linkCurveRotation={linkRotation}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleColor={getParticleColor}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeHover={handleNodeHover}
          onBackgroundClick={handleBackgroundClick}
        />
      )}
    </div>
  );
};

export default memo(GraphCanvas);
