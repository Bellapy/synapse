import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MascotLying } from './Mascot';

const PHRASES = ['Seguindo os rastros…', 'Puxando os fios…', 'Ligando os pontos…', 'Quase lá…'];

/** Espera da primeira busca: o filhote respira e pisca enquanto a IA monta o grafo. */
export default function MascotLoader({ slow }: { slow: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => Math.min(i + 1, PHRASES.length - 1)), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <MascotLying className="h-auto w-[min(62vw,300px)]" />
      <div className="relative h-9 w-full">
        <AnimatePresence mode="wait">
          <motion.p
            key={slow ? 'slow' : index}
            className="accent-serif absolute inset-x-0 text-3xl text-cream"
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.45 }}
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
