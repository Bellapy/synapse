// frontend/src/App.jsx
import React, { useState } from 'react';
import { Search, LoaderCircle } from 'lucide-react';
import useGraphStore from './store/graphStore';
import GraphCanvas from './components/graphCanvas';
// 1. Importe o novo componente que criamos
import SidePanel from './components/SidePanel';

function App() {
  const [query, setQuery] = useState('');
  const { fetchGraphData, isLoading, error } = useGraphStore();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      fetchGraphData(query);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-space-gradient overflow-hidden">
      {/* O Canvas do Grafo fica no fundo */}
      <GraphCanvas />

      {/* O painel de busca flutua sobre o grafo */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 w-full max-w-lg px-4">
        <form onSubmit={handleSearch} className="glass-panel p-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Explore o universo do conhecimento..."
              className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 pl-12 focus:outline-none focus:border-electric-cyan transition-all"
              disabled={isLoading}
            />
            <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
            <button
              type="submit"
              className="absolute right-2 top-[7px] h-9 px-4 rounded-md bg-magenta-glow/80 hover:bg-magenta-glow text-white font-bold transition-all shadow-lg shadow-magenta-glow/20 flex items-center justify-center disabled:bg-gray-500"
              disabled={isLoading}
            >
              {isLoading ? <LoaderCircle className="animate-spin" /> : 'Tecelar'}
            </button>
          </div>
          {error && <p className="text-red-400 text-center mt-2">{error}</p>}
        </form>
      </div>
      
      {/* 2. Renderize o componente SidePanel. Ele gerencia sua própria visibilidade internamente. */}
      <SidePanel />
    </div>
  );
}

export default App;