import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle } from 'lucide-react';
import useGraphStore from './store/graphStore';
import { useGraphBusy, useSearchGraph } from './hooks/useGraphQueries';
import { useSlowHint } from './hooks/useSlowHint';
import { useMediaQuery } from './hooks/useMediaQuery';
import SearchBar from './components/SearchBar';
import PulseLoader from './components/PulseLoader';
import SidePanel from './components/SidePanel';
// O canvas 3D (three.js) é pesado: só é baixado quando necessário.
const loadGraphCanvas = () => import('./components/graphCanvas');
const GraphCanvas = lazy(loadGraphCanvas);

const SUGGESTIONS = ['Por que sonhamos?', 'Buracos negros', 'Revolução Industrial', 'Consciência'];

function App() {
  const [query, setQuery] = useState('');
  const search = useSearchGraph();
  const isLoading = useGraphBusy();
  const isSlow = useSlowHint(isLoading);
  const narrow = useMediaQuery('(max-width: 639px)');
  const error = useGraphStore(state => state.error);
  const hasNodes = useGraphStore(state => state.nodes.length > 0);
  const clearGraph = useGraphStore(state => state.clearGraph);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !isLoading) search.mutate(trimmed);
  };

  const firstLoad = isLoading && !hasNodes;
  const showHero = !hasNodes && !firstLoad;

  return (
    <main className="relative h-full w-full overflow-hidden bg-ink">
      <div className="grain-bg absolute inset-0" aria-hidden="true" />
      {/* Com o grafo na tela, o fundo escurece para os nós ganharem destaque. */}
      <motion.div
        className="absolute inset-0 bg-ink"
        aria-hidden="true"
        initial={false}
        animate={{ opacity: hasNodes ? 0.55 : 0 }}
        transition={{ duration: 1 }}
      />

      {hasNodes && (
        <Suspense fallback={null}>
          <GraphCanvas />
        </Suspense>
      )}

      <div className="film-grain" aria-hidden="true" />

      {/* Marca: clicar volta ao início. */}
      <header className="absolute left-5 top-5 z-30 sm:left-8 sm:top-7">
        <button
          onClick={() => {
            clearGraph();
            setQuery('');
          }}
          aria-label="Voltar ao início"
        >
          <span className="text-[1.65rem] font-semibold leading-none tracking-tightest text-white">
            syn<span className="accent-serif text-[1.15em] font-normal">apse</span>
          </span>
        </button>
      </header>

      {/* Coluna central: título, espera e busca compartilham a mesma posição. */}
      <motion.div
        className="absolute left-1/2 z-20 w-full max-w-2xl px-5"
        initial={false}
        animate={{ top: hasNodes ? (narrow ? '4.6rem' : '1.35rem') : '50%', y: hasNodes ? '0%' : '-50%' }}
        transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        style={{ x: '-50%', maxWidth: hasNodes ? '34rem' : undefined }}
      >
        <AnimatePresence mode="wait">
          {showHero && (
            <motion.div
              key="hero"
              className="mb-9 text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="eyebrow mb-5">mapa vivo de conexões</p>
              <h1 className="text-[clamp(2.6rem,7.4vw,5.2rem)] font-light leading-[0.98] tracking-tightest text-white">
                O que você quer
                <br />
                <span className="accent-serif text-[1.18em]">desvendar?</span>
              </h1>
              <p className="mx-auto mt-6 max-w-md text-base font-light leading-relaxed text-white/70 sm:text-lg">
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
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <PulseLoader slow={isSlow} />
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
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } } }}
          >
            {SUGGESTIONS.map(suggestion => (
              <motion.li key={suggestion} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <button
                  onClick={() => {
                    setQuery(suggestion);
                    submit(suggestion);
                  }}
                  className="btn-ghost rounded-full px-4 py-2 text-sm font-light tracking-tight text-white"
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
            className="accent-serif mt-4 text-center text-xl text-white"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Espera durante expansões: o grafo continua visível e um aviso discreto mostra que algo está vindo. */}
      <AnimatePresence>
        {isLoading && hasNodes && (
          <motion.div
            className="liquid-glass absolute bottom-6 left-1/2 z-30 flex items-center gap-3 !rounded-full px-6 py-3"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          >
            <LoaderCircle className="h-4 w-4 animate-spin text-white" />
            <span className="accent-serif text-xl text-white">{isSlow ? 'Acordando o servidor…' : 'Puxando novos fios…'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <SidePanel />
    </main>
  );
}

export default App;
