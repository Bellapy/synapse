// frontend/src/components/SidePanel.jsx
import React from 'react';
import useGraphStore from '../store/graphStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SidePanel = () => {
  // Conecta ao store para obter o nó selecionado e a ação de limpar
  const { selectedNode, clearSelectedNode } = useGraphStore();

  return (
    // AnimatePresence permite animar componentes quando eles são removidos do DOM
    <AnimatePresence>
      {selectedNode && (
        <motion.div
          className="absolute top-0 right-0 h-full w-full max-w-md p-4 z-20"
          // Define os estados da animação
          initial={{ x: '100%' }} // Posição inicial (fora da tela à direita)
          animate={{ x: 0 }}      // Posição final (na tela)
          exit={{ x: '100%' }}    // Posição ao sair (de volta para fora da tela)
          transition={{ type: 'spring', stiffness: 300, damping: 30 }} // Física da animação
        >
          <div className="glass-panel h-full w-full p-6 rounded-l-2xl flex flex-col">
            <button
              onClick={clearSelectedNode}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-electric-cyan mb-4">{selectedNode.label}</h2>
            <div className="overflow-y-auto pr-2">
              <p className="text-gray-300 font-mono text-base leading-relaxed">
                {selectedNode.summary}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SidePanel;