import useGraphStore from '../store/graphStore';
import { useExpandNode, useGraphBusy, useNodeConnections, useNodeDetails } from '../hooks/useGraphQueries';
import { AnimatePresence, motion } from 'framer-motion';
import { X, GitBranch, Swords, RotateCcw } from 'lucide-react';
import { MascotMark } from './Mascot';

const ORIGIN_DOT: Record<string, string> = {
  initial: 'from-iris to-rose',
  general: 'from-ember to-honey',
  counter: 'from-rose to-orchid',
};

const SidePanel = () => {
  const selectedNode = useGraphStore(state => state.selectedNode);
  const clearSelectedNode = useGraphStore(state => state.clearSelectedNode);
  const { expand } = useExpandNode();
  const isBusy = useGraphBusy();
  const { data: details, isPending, isError, refetch } = useNodeDetails(selectedNode);
  const connections = useNodeConnections(selectedNode);

  const run = (type: 'general' | 'counter') => {
    if (!selectedNode) return;
    expand(selectedNode.label, type);
    clearSelectedNode();
  };

  return (
    <AnimatePresence>
      {selectedNode && (
        <motion.aside
          key="panel"
          className="absolute inset-x-3 bottom-3 z-20 max-h-[68vh] md:inset-x-auto md:bottom-5 md:right-5 md:top-24 md:max-h-none md:w-[26rem]"
          // Sem `filter` aqui: um filtro no ancestral impede o backdrop-filter do vidro de enxergar o 3D atrás.
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ type: 'spring', stiffness: 170, damping: 24 }}
        >
          <div className="liquid-glass flex h-full flex-col p-7 sm:p-8">
            <button
              onClick={clearSelectedNode}
              className="btn-ghost absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-cream"
              aria-label="Fechar painel"
            >
              <X size={16} />
            </button>

            {isPending && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
                <MascotMark size={84} animated />
                <p className="accent-serif text-2xl text-cream">Lendo “{selectedNode.label}”…</p>
              </div>
            )}

            {isError && (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center">
                <p className="accent-serif text-2xl leading-snug text-cream">Não consegui ler este conceito agora.</p>
                <button onClick={() => refetch()} className="btn-ghost flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium">
                  <RotateCcw size={15} />
                  Tentar de novo
                </button>
              </div>
            )}

            {details && (
              <>
                <div className="mb-5 pr-10">
                  <span className="eyebrow flex items-center gap-2 !text-cream/75">
                    <span className={`h-2 w-2 rounded-full bg-gradient-to-br ${ORIGIN_DOT[selectedNode.origin ?? 'initial']}`} />
                    {details.type_tag}
                  </span>
                  <h2 className="mt-3 text-[2.5rem] font-light leading-[1.02] tracking-tightest text-cream">
                    {details.label}
                  </h2>
                </div>

                <div className="mb-6 min-h-0 flex-1 overflow-y-auto pr-2">
                  <p className="text-[1.05rem] font-light leading-[1.7] text-cream/85">{details.contextual_summary}</p>

                  {connections.length > 0 && (
                    <div className="mt-7">
                      <h3 className="eyebrow mb-3">Ligado a</h3>
                      <div className="flex flex-wrap gap-2">
                        {connections.map(connection => (
                          <span key={connection} className="accent-serif rounded-full bg-white/10 px-3.5 py-1 text-[1.05rem] text-cream shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]">
                            {connection}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-3">
                  <button
                    onClick={() => run('general')}
                    disabled={isBusy}
                    className="btn-aurora flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[0.95rem] font-semibold tracking-tight"
                  >
                    <GitBranch size={17} />
                    Expandir este conceito
                  </button>
                  <button
                    onClick={() => run('counter')}
                    disabled={isBusy}
                    className="btn-ghost flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[0.95rem] font-medium tracking-tight text-[#ffc2d2]"
                  >
                    <Swords size={17} />
                    Contra-argumentar
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default SidePanel;
