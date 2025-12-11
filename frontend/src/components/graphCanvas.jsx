// frontend/src/components/GraphCanvas.jsx
import React, { useMemo, useRef, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import useGraphStore from '../store/graphStore';
import * as THREE from 'three';
import { BloomEffect, EffectPass } from 'postprocessing';

const GraphCanvas = () => {
  const { nodes, edges, setSelectedNode, clearSelectedNode, expandNode } = useGraphStore();
  const graphRef = useRef();

  const graphData = useMemo(() => ({
    nodes,
    links: edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      name: edge.relation
    }))
  }), [nodes, edges]);

  useEffect(() => {
    if (graphRef.current) {
      const bloomEffect = new BloomEffect({
        luminanceThreshold: 0.1,
        luminanceSmoothing: 0.2,
        intensity: 2.0,
        radius: 0.6,
      });
      const effectPass = new EffectPass(graphRef.current.camera(), bloomEffect);
      graphRef.current.postProcessingComposer().addPass(effectPass);
    }
  }, []);

  if (!nodes || nodes.length === 0) {
    return null;
  }

  const getNodeObject = () => {
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        coreColor: { value: new THREE.Color('#ffffff') },
        glowColor: { value: new THREE.Color('#22d3ee') },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
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
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.Mesh(geometry, material);
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full z-0">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel="label"
        linkLabel="name"
        nodeThreeObject={getNodeObject}
        linkColor={() => '#d946ef'}
        linkWidth={0.3}
        linkOpacity={0.5}
        onNodeClick={(node) => {
          const distance = 40;
          const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
          graphRef.current.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node,
            3000
          );
          setSelectedNode(node);
        }}
        // --- NOVA INTERAÇÃO ---
        onNodeDoubleClick={(node) => {
          // Limpa a seleção do painel para não confundir o usuário
          clearSelectedNode(); 
          // Chama a nova ação de expansão do store
          expandNode(node.label);
        }}
        onBackgroundClick={clearSelectedNode}
      />
    </div>
  );
};

export default GraphCanvas;