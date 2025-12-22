// frontend/src/App.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, LoaderCircle, Sparkles } from 'lucide-react';
import useGraphStore from './store/graphStore';
import GraphCanvas from './components/graphCanvas';
import SidePanel from './components/SidePanel';

function App() {
  const [query, setQuery] = useState('');
  const fetchGraphData = useGraphStore(state => state.fetchGraphData);
  const isLoading = useGraphStore(state => state.isLoading);
  const error = useGraphStore(state => state.error);
  const hasNodes = useGraphStore(state => state.nodes.length > 0);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      fetchGraphData(query);
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-galaxy-gradient overflow-hidden">
      <GraphCanvas />

      {/* Container para a barra de busca, que se anima */}
      <motion.div
        className="absolute w-full max-w-lg px-4 z-10"
        initial={{ top: '50%', left: '50%', x: '-50%', y: '-50%' }}
        animate={{ top: hasNodes ? '2rem' : '50%' }}
        transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.2 }}
      >
        <div className="w-full text-center mb-8">
            <motion.h1 
                className="text-6xl font-bold text-white tracking-tighter"
                initial={{ opacity: 1 }}
                animate={{ opacity: hasNodes ? 0 : 1, y: hasNodes ? -20 : 0 }}
                transition={{ duration: 0.5 }}
            >
                Synapse
            </motion.h1>
            <motion.p 
                className="text-xl text-gray-400 mt-2 font-mono"
                initial={{ opacity: 1 }}
                animate={{ opacity: hasNodes ? 0 : 1, y: hasNodes ? -10 : 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                The Thought Weaver
            </motion.p>
        </div>
        
        <form onSubmit={handleSearch} className="glass-panel p-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tecelã, desvende para mim..."
              className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 pl-12 focus:outline-none focus:border-electric-cyan transition-all"
              disabled={isLoading}
            />
            <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
            <button
              type="submit"
              className="absolute right-2 top-[7px] h-9 px-4 rounded-md bg-magenta-glow/80 hover:bg-magenta-glow text-white font-bold transition-all shadow-lg shadow-magenta-glow/20 flex items-center justify-center gap-2 disabled:bg-gray-500"
              disabled={isLoading}
            >
              {isLoading ? <LoaderCircle className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              <span>Tecelar</span>
            </button>
          </div>
          {error && <p className="text-red-400 text-center mt-2">{error}</p>}
        </form>
      </motion.div>

      <SidePanel />
    </main>
  );
}

export default App;