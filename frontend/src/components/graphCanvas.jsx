// frontend/src/components/GraphCanvas.jsx
import React, { useMemo, useRef, useEffect } from 'react';
import useMeasure from 'react-use-measure';
import ForceGraph3D from 'react-force-graph-3d';
import useGraphStore from '../store/graphStore';
import * as THREE from 'three';
import { BloomEffect, EffectPass } from 'postprocessing';

const GraphCanvas = () => {
  const { nodes, edges, setSelectedNode, clearSelectedNode, expandNode } = useGraphStore();
  const graphRef = useRef();
  const [ref, bounds] = useMeasure();

  const graphData = useMemo(() => ({
    nodes,
    links: edges.map(edge => ({
      ...edge, // Propaga todos os campos, incluindo 'origin'
      source: edge.source,
      target: edge.target,
      name: edge.relation,
    }))
  }), [nodes, edges]);

  useEffect(() => {
    if (graphRef.current) {
      const bloomEffect = new BloomEffect({
        luminanceThreshold: 0.1, luminanceSmoothing: 0.2, intensity: 1.5, radius: 0.6,
      });
      const effectPass = new EffectPass(graphRef.current.camera(), bloomEffect);
      graphRef.current.postProcessingComposer().addPass(effectPass);
    }
  }, []);

  // MODIFICATION START: Lógica de coloração condicional
  const getNodeColor = (node) => {
    switch (node.origin) {
      case 'general':
        return '#34d399'; // Verde para expansão
      case 'counter':
        return '#f43f5e'; // Vermelho para contra-argumento
      case 'initial':
      default:
        return '#22d3ee'; // Ciano padrão
    }
  };

  const getLinkColor = (link) => {
    switch (link.origin) {
      case 'general':
        return '#34d399';
      case 'counter':
        return '#f43f5e';
      case 'initial':
      default:
        return '#d946ef'; // Magenta padrão
    }
  };

  const getNodeObject = (node) => {
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        coreColor: { value: new THREE.Color('#ffffff') },
        glowColor: { value: new THREE.Color(getNodeColor(node)) },
      },
      vertexShader: `...`, // (Vertex shader sem alterações)
      fragmentShader: `...`, // (Fragment shader sem alterações)
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.Mesh(geometry, material);
  };
  // MODIFICATION END

  return (
    <div ref={ref} className="absolute top-0 left-0 w-full h-full z-0">
      {/* Adicionamos a checagem de bounds para evitar renderizar com tamanho 0 */}
      {bounds.width > 0 && (
        <ForceGraph3D
          ref={graphRef}
          width={bounds.width}
          height={bounds.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeLabel="label"
          linkLabel="name"
          // MODIFICATION START: Usamos nossas novas funções de coloração
          nodeThreeObject={getNodeObject}
          linkColor={getLinkColor}
          // MODIFICATION END
          linkWidth={0.3}
          linkOpacity={0.5}
          onNodeClick={(node) => {
            const distance = 40;
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
            graphRef.current.cameraPosition(
              { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
              node, 3000
            );
            setSelectedNode(node);
          }}
          onNodeDoubleClick={(node) => {
            clearSelectedNode(); 
            expandNode(node.label);
          }}
          onBackgroundClick={clearSelectedNode}
        />
      )}
    </div>
  );
};
// Adicionando o código do shader que foi omitido para manter o post conciso
GraphCanvas.prototype.getNodeObject = function(node) {
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        coreColor: { value: new THREE.Color('#ffffff') },
        glowColor: { value: new THREE.Color(this.getNodeColor(node)) },
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

export default GraphCanvas;