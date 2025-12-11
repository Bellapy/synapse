// frontend/src/components/SidePanel.jsx
import React from 'react';
import useGraphStore from '../store/graphStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LoaderCircle, GitBranch, Share2, AlertTriangle } from 'lucide-react';

const SidePanel = () => {
  const { 
    selectedNode, 
    selectedNodeDetails,
    isPanelLoading,
    expandNode,
    clearSelectedNode 
  } = useGraphStore();

  const handleExpand = () => {
    if (selectedNode) {
      expandNode(selectedNode.label, 'general');
      clearSelectedNode(); // Fecha o painel após a ação
    }
  };

  const handleCounter = () => {
    if (selectedNode) {
      expandNode(selectedNode.label, 'counter');
      clearSelectedNode(); // Fecha o painel após a ação
    }
  };

  return (
    <AnimatePresence>
      {selectedNode && (
        <motion.div
          className="absolute top-0 right-0 h-full w-full max-w-md p-4 z-20"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="glass-panel h-full w-full p-6 flex flex-col">
            <button
              onClick={clearSelectedNode}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-30"
            >
              <X size={24} />
            </button>
            
            {isPanelLoading && (
              <div className="flex-grow flex items-center justify-center">
                <LoaderCircle className="animate-spin text-electric-cyan" size={48} />
              </div>
            )}

            {!isPanelLoading && selectedNodeDetails && (
              <>
                {/* 1. Cabeçalho */}
                <div className="mb-4">
                  <span className="bg-magenta-glow/20 text-magenta-glow text-xs font-mono px-2 py-1 rounded">
                    {selectedNodeDetails.type_tag}
                  </span>
                  <h2 className="text-3xl font-bold text-white mt-2">{selectedNodeDetails.label}</h2>
                </div>
                
                {/* 2. A "Essência" */}
                <div className="flex-grow overflow-y-auto pr-2 mb-4">
                  <p className="text-gray-300 font-mono text-base leading-relaxed">
                    {selectedNodeDetails.contextual_summary}
                  </p>
                </div>

                {/* 4. Conexões Visuais */}
                {selectedNodeDetails.connections && selectedNodeDetails.connections.length > 0 && (
                  <div className='mb-4'>
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Conexões</h3>
                    <div className='flex flex-wrap gap-2'>
                      {selectedNodeDetails.connections.map(conn => (
                        <span key={conn} className="bg-gray-700 text-gray-300 text-xs font-mono px-2 py-1 rounded">
                          {conn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Ferramentas de Expansão */}
                <div className="flex-shrink-0 flex flex-col gap-3">
                  <button onClick={handleExpand} className="w-full py-3 rounded-lg bg-electric-cyan/80 hover:bg-electric-cyan text-deep-space font-bold transition-all flex items-center justify-center gap-2">
                    <GitBranch size={18} />
                    Expandir Este Conceito
                  </button>
                  <button onClick={handleCounter} className="w-full py-3 rounded-lg bg-red-500/80 hover:bg-red-500 text-white font-bold transition-all flex items-center justify-center gap-2">
                    <AlertTriangle size={18} />
                    Contra-Argumentar
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SidePanel;