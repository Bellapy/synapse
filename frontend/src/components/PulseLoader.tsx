import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const PHRASES = ['Seguindo os rastros…', 'Puxando os fios…', 'Ligando os pontos…', 'Quase lá…'];

/** Espera da primeira busca: um ponto dispara anéis (como uma sinapse) enquanto a IA monta o grafo. */
export default function PulseLoader({ slow }: { slow: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => Math.min(i + 1, PHRASES.length - 1)), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="relative h-28 w-28" aria-hidden="true">
        <span className="pulse-ring" />
        <span className="pulse-ring" style={{ animationDelay: '0.8s' }} />
        <span className="pulse-ring" style={{ animationDelay: '1.6s' }} />
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_24px_6px_rgba(255,255,255,0.55)]" />
      </div>
      <div className="relative h-9 w-full">
        <AnimatePresence mode="wait">
          <motion.p
            key={slow ? 'slow' : index}
            className="accent-serif absolute inset-x-0 text-3xl text-white"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            {slow ? 'Acordando o servidor…' : PHRASES[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      {slow && (
        <p className="eyebrow max-w-xs !normal-case !tracking-normal leading-relaxed">
          O servidor gratuito dormiu. A primeira busca pode levar até 1 minuto, as próximas são rápidas.
        </p>
      )}
    </div>
  );
}
