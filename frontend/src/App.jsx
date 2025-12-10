
import React from 'react';
import { Search, Zap } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-space-gradient flex items-center justify-center p-4">
      
      {/* Container de Teste Glassmorphism */}
      <div className="glass-panel p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <Zap className="text-electric-cyan w-12 h-12" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Synapse Framework</h1>
        <p className="text-gray-400 mb-6 font-mono text-sm">
          A interface galáctica está online.
        </p>

        {/* Input estilizado */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Qual o sentido da vida?"
            className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 pl-12 focus:outline-none focus:border-electric-cyan transition-all"
          />
          <Search className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
        </div>

        <button className="mt-6 w-full py-3 rounded-lg bg-magenta-glow/80 hover:bg-magenta-glow text-white font-bold transition-all shadow-lg shadow-magenta-glow/20">
          Tecelar Conhecimento
        </button>
      </div>
    </div>
  );
}

export default App;