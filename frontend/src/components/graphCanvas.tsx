import React, { useMemo, useRef, useEffect } from 'react';
import useMeasure from 'react-use-measure';
import ForceGraph3D from 'react-force-graph-3d';
import useGraphStore from '../store/graphStore';
import * as THREE from 'three';
import { BloomEffect, EffectPass } from 'postprocessing';
import { SynapseNode } from '../types';

const ForceGraph3DComponent = ForceGraph3D as any;

const GraphCanvas = () => {
  const { nodes, edges, setSelectedNode, clearSelectedNode, expandNode } = useGraphStore();
  const graphRef = useRef<any>();
  const [ref, bounds] = useMeasure();

  const graphData = useMemo(() => ({
    nodes,
    links: edges.map((edge: any) => ({
      ...edge,
      source: typeof edge.source === 'object' ? (edge.source as any).id : edge.source,
      target: typeof edge.target === 'object' ? (edge.target as any).id : edge.target,
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

  const getNodeColor = (node: SynapseNode) => {
    switch (node.origin) {
      case 'general':
        return '#34d399'; 
      case 'counter':
        return '#f43f5e'; 
      case 'initial':
      default:
        return '#22d3ee'; 
    }
  };

  const getLinkColor = (link: any) => {
    switch (link.origin) {
      case 'general':
        return '#34d399';
      case 'counter':
        return '#f43f5e';
      case 'initial':
      default:
        return '#d946ef'; 
    }
  };

  const getNodeObject = (node: SynapseNode) => {
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        coreColor: { value: new THREE.Color('#ffffff') },
        glowColor: { value: new THREE.Color(getNodeColor(node)) },
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
  
    return new THREE.Mesh(geometry, material as any) as any;
  };

  if (!nodes || nodes.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="absolute top-0 left-0 w-full h-full z-0">
      {bounds.width > 0 && (
        <ForceGraph3DComponent
          ref={graphRef}
          width={bounds.width}
          height={bounds.height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeLabel="label"
          linkLabel="name"
          nodeThreeObject={getNodeObject}
          linkColor={getLinkColor}
          linkWidth={0.3}
          linkOpacity={0.5}
          onNodeClick={(node: any) => {
            const distance = 40;
            const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
            graphRef.current.cameraPosition(
              { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
              node, 3000
            );
            setSelectedNode(node);
          }}
          onNodeDoubleClick={(node: any) => {
            clearSelectedNode(); 
            expandNode(node.label);
          }}
          onBackgroundClick={clearSelectedNode}
        />
      )}
    </div>
  );
};

export default GraphCanvas;