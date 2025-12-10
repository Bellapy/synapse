import React, { useMemo } from 'react';
import ForceGraph3D from "react-force-graph-3d";
import useGraphStore from '../store/graphStore';
import * as THREE from 'three';


const GraphCanvas = () => {
  const { nodes, edges } = useGraphStore();

  const graphData = useMemo(() => ({
    nodes,
    links: edges.map(edge => ({
      source: edge.source,
      target: edge.target,
      name: edge.relation
    }))
  }), [nodes, edges]);

  if (!nodes || nodes.length === 0) {
    return null;
  }

  // A função que cria o objeto 3D para cada nó foi completamente refeita
  const getNodeObject = (node) => {
    // 1. Criar um 'Group' que conterá o núcleo e a aura
    const group = new THREE.Group();

    // 2. Criar a aura de brilho (a esfera maior e semitransparente)
    const auraGeometry = new THREE.SphereGeometry(6, 32, 32);
    
    // Este é o truque: um material customizado que fica mais transparente nas bordas
    const auraMaterial = new THREE.ShaderMaterial({
      uniforms: {
        'c': { type: 'f', value: 0.8 },
        'p': { type: 'f', value: 3.0 },
        glowColor: { type: 'c', value: new THREE.Color('#22d3ee') },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize( normalMatrix * normal );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow( 0.8 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 3.0 );
          gl_FragColor = vec4( glowColor, 1.0 ) * intensity;
        }
      `,
      side: THREE.BackSide, // Renderiza o lado de dentro da esfera
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.scale.set(1.1, 1.1, 1.1); // Ligeiramente maior que o núcleo
    group.add(aura);

    // 3. Criar o núcleo do nó (a esfera menor e mais sólida)
    const coreGeometry = new THREE.SphereGeometry(3, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    return group;
  };


  return (
    <div className="absolute top-0 left-0 w-full h-full z-0">
      <ForceGraph3D
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel="label"
        linkLabel="name"
        
        // Substituindo a antiga implementação pelo nosso novo método
        nodeThreeObject={getNodeObject}
        
        linkColor={() => '#d946ef'}
        linkWidth={0.3}
        linkOpacity={0.5}
      />
    </div>
  );
};

export default GraphCanvas;