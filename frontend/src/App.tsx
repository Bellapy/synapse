import { lazy, Suspense, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGraphStore from './store/graphStore';
import { useGraphBusy, useSearchGraph } from './hooks/useGraphQueries';
import { useSlowHint } from './hooks/useSlowHint';
import { useMediaQuery } from './hooks/useMediaQuery';
import FluidBackground from './components/FluidBackground';
import Intro from './components/Intro';
import SearchBar from './components/SearchBar';
import MascotLoader from './components/MascotLoader';
import { MascotLying, MascotMark } from './components/Mascot';
import SidePanel from './components/SidePanel';
// O canvas 3D (three.js) é pesado: só é baixado quando necessário.
const loadGraphCanvas = () => import('./components/graphCanvas');
const GraphCanvas = lazy(loadGraphCanvas);

const INTRO_KEY = 'synapse-intro-seen';
const SUGGESTIONS = ['Por que sonhamos?', 'Buracos negros', 'Revolução Industrial', 'Consciência'];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function introAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function App() {
  const [query, setQuery] = useState('');
  const [introVisible, setIntroVisible] = useState(() => !introAlreadySeen());
  const [revealed, setRevealed] = useState(() => introAlreadySeen());
  const search = useSearchGraph();
  const isLoading = useGraphBusy();
  const isSlow = useSlowHint(isLoading);
  const narrow = useMediaQuery('(max-width: 639px)');
  const error = useGraphStore(state => state.error);
  const hasNodes = useGraphStore(state => state.nodes.length > 0);
  const clearGraph = useGraphStore(state => state.clearGraph);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* sem sessionStorage a abertura simplesmente toca de novo no próximo carregamento */
    }
  }, []);
  const handleIntroDone = useCallback(() => setIntroVisible(false), []);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !isLoading) search.mutate(trimmed);
  };

  const firstLoad = isLoading && !hasNodes;
  const showHero = !hasNodes && !firstLoad;

  return (
    <main className="relative h-full w-full overflow-hidden bg-ink">
      <FluidBackground calm={hasNodes ? 1 : 0} />

      {hasNodes && (
        <Suspense fallback={null}>
          <GraphCanvas />
        </Suspense>
      )}

      <div className="film-grain" aria-hidden="true" />

      {/* Marca: o filhote + nome. Clicar volta ao início. */}
      <motion.header
        className="absolute left-5 top-5 z-30 sm:left-8 sm:top-7"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : -12 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={() => {
            clearGraph();
            setQuery('');
          }}
          className="group flex items-center gap-2.5"
          aria-label="Voltar ao início"
        >
          <MascotMark size={46} animated className="transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" />
          <span className="text-[1.65rem] font-semibold leading-none tracking-tightest text-cream">
            syn<span className="accent-serif text-aurora text-[1.15em]">apse</span>
          </span>
        </button>
      </motion.header>

      {/* Coluna central: título, mascote de espera e busca compartilham a mesma posição. */}
      <motion.div
        className="absolute left-1/2 z-20 w-full max-w-2xl px-5"
        initial={false}
        animate={{ top: hasNodes ? (narrow ? '4.6rem' : '1.35rem') : '50%', y: hasNodes ? '0%' : '-50%', opacity: revealed ? 1 : 0 }}
        transition={{
          top: { type: 'spring', stiffness: 90, damping: 20 },
          y: { type: 'spring', stiffness: 90, damping: 20 },
          opacity: { duration: 1, delay: 0.35 },
        }}
        style={{ x: '-50%', maxWidth: hasNodes ? '34rem' : undefined }}
      >
        <AnimatePresence mode="wait">
          {showHero && (
            <motion.div
              key="hero"
              className="mb-9 text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="eyebrow mb-5">mapa vivo de conexões</p>
              <h1 className="text-[clamp(2.6rem,7.4vw,5.2rem)] font-light leading-[0.98] tracking-tightest text-cream">
                O que você quer
                <br />
                <span className="accent-serif text-aurora text-[1.18em]">desvendar</span>
                <span className="text-honey">?</span>
              </h1>
              <p className="mx-auto mt-6 max-w-md text-base font-light leading-relaxed text-mist sm:text-lg">
                Digite uma ideia e eu puxo os fios que a ligam ao resto do mundo.
              </p>
            </motion.div>
          )}
          {firstLoad && (
            <motion.div
              key="loader"
              className="mb-9"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <MascotLoader slow={isSlow} />
            </motion.div>
          )}
        </AnimatePresence>

        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={() => submit(query)}
          onFocus={loadGraphCanvas}
          loading={isLoading}
          compact={hasNodes}
        />

        {showHero && (
          <motion.ul
            className="mt-6 flex flex-wrap justify-center gap-2.5"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 1 } } }}
          >
            {SUGGESTIONS.map(suggestion => (
              <motion.li
                key={suggestion}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              >
                <button
                  onClick={() => {
                    setQuery(suggestion);
                    submit(suggestion);
                  }}
                  className="btn-ghost rounded-full px-4 py-2 text-sm font-light tracking-tight text-cream/90"
                >
                  {suggestion}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}

        {error && (
          <motion.p
            key={error}
            className="accent-serif mt-4 text-center text-xl text-rose"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* O filhote descansa no canto enquanto não há grafo. */}
      <AnimatePresence>
        {showHero && revealed && (
          <motion.div
            className="pointer-events-none absolute -bottom-3 right-2 z-10 hidden w-[min(34vw,330px)] opacity-95 md:block"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 1.1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <MascotLying className="h-auto w-full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Espera durante expansões: o grafo continua visível e o filhote avisa que algo está vindo. */}
      <AnimatePresence>
        {isLoading && hasNodes && (
          <motion.div
            className="liquid-glass absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 !rounded-full py-2 pl-3 pr-6"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            <MascotMark size={42} animated />
            <span className="accent-serif text-xl text-cream">{isSlow ? 'Acordando o servidor…' : 'Puxando novos fios…'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <SidePanel />

      {introVisible && <Intro onReveal={handleReveal} onDone={handleIntroDone} reducedMotion={prefersReducedMotion()} />}
    </main>
  );
}

export default App;
