import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { MascotLying } from './Mascot';
import { useTypewriter } from '../hooks/useTypewriter';
import { isMuted, playTypeTick, setMuted, unlockAudio } from '../lib/typeSound';
import { FULL_TEXT, LINES, revealLines, type Kind } from '../lib/introScript';

const KIND_CLASS: Record<Kind, string> = {
  sans: 'font-light text-cream',
  serif: 'accent-serif text-aurora text-[1.16em]',
  soft: 'font-light text-mist text-[0.55em] tracking-tight',
  accent: 'accent-serif text-honey text-[0.72em]',
};

const REVEAL_DELAY_MS = 850;
const REVEAL_DURATION_S = 1.7;

interface IntroProps {
  /** Dispara quando a revelação começa: a tela principal já pode surgir por baixo. */
  onReveal: () => void;
  /** Dispara quando a abertura sai de cena por completo. */
  onDone: () => void;
  reducedMotion: boolean;
}

export default function Intro({ onReveal, onDone, reducedMotion }: IntroProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const [muted, setMutedState] = useState(isMuted);
  const [revealing, setRevealing] = useState(false);

  const onChar = useCallback((char: string) => {
    if (char !== '\n') playTypeTick(char);
  }, []);
  const { count, done, skip } = useTypewriter(FULL_TEXT, { onChar, instant: reducedMotion });

  const revealStarted = useRef(false);
  const startReveal = useCallback(() => {
    if (revealStarted.current) return;
    revealStarted.current = true;
    setRevealing(true);
    onReveal();
  }, [onReveal]);

  // Qualquer gesto libera o áudio; o primeiro pula a digitação, o segundo pula a espera.
  useEffect(() => {
    const onGesture = () => {
      unlockAudio();
      if (!done) skip();
      else startReveal();
    };
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [done, skip, startReveal]);

  useEffect(() => {
    if (!done || revealing) return;
    const id = setTimeout(startReveal, reducedMotion ? 1200 : REVEAL_DELAY_MS);
    return () => clearTimeout(id);
  }, [done, revealing, startReveal, reducedMotion]);

  // A revelação: um buraco macio cresce a partir do mascote e deixa o fundo fluido aparecer.
  useEffect(() => {
    if (!revealing) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    if (reducedMotion) {
      const controls = animate(1, 0, {
        duration: 0.6,
        onUpdate: value => (overlay.style.opacity = String(value)),
        onComplete: onDone,
      });
      return () => controls.stop();
    }

    const rect = mascotRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width * 0.7 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height * 0.35 : window.innerHeight / 2;
    const maxRadius = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) + 200;

    const controls = animate(0, maxRadius, {
      duration: REVEAL_DURATION_S,
      ease: [0.65, 0, 0.3, 1],
      onUpdate: radius => {
        const feather = Math.min(220, radius * 0.9 + 1);
        const mask = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${radius}px, #000 ${radius + feather}px)`;
        overlay.style.maskImage = mask;
        overlay.style.webkitMaskImage = mask;
      },
      onComplete: onDone,
    });
    return () => controls.stop();
  }, [revealing, reducedMotion, onDone]);

  const toggleMute = (event: React.PointerEvent) => {
    event.stopPropagation();
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) unlockAudio();
  };

  const rendered = useMemo(() => revealLines(LINES, count), [count]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-ink px-6"
      role="dialog"
      aria-label="Abertura do Synapse"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5"
        style={{ background: 'radial-gradient(60% 70% at 50% 100%, rgb(122 92 255 / 0.18), transparent 70%)' }}
      />

      <h1 className="relative w-full max-w-4xl text-left" aria-label={FULL_TEXT.replace('\n', ' ')}>
        {rendered.map(({ lineIndex, segments }) => (
          <span
            key={lineIndex}
            aria-hidden="true"
            className={`block ${lineIndex === 0 ? 'text-[clamp(2.7rem,8.4vw,6.4rem)] leading-[0.98] tracking-tightest' : 'mt-4 text-[clamp(2.7rem,8.4vw,6.4rem)] leading-none'}`}
          >
            {segments.map((segment, i) => (
              <span key={i} className={KIND_CLASS[segment.kind]}>
                {segment.visible}
                {/* O restante fica invisível só para reservar o espaço: o texto não "pula" ao digitar. */}
                <span className="opacity-0">{segment.hidden}</span>
              </span>
            ))}
          </span>
        ))}
        {!revealing && (
          <span
            aria-hidden="true"
            className="absolute -bottom-3 left-0 h-[3px] w-14 origin-left rounded-full bg-gradient-to-r from-honey via-rose to-orchid"
            style={{ transform: `scaleX(${Math.min(1, count / FULL_TEXT.length)})`, transition: 'transform 0.15s linear' }}
          />
        )}
      </h1>

      <motion.div
        ref={mascotRef}
        className="w-[min(70vw,380px)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <MascotLying className="h-auto w-full" />
      </motion.div>

      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
        <span className="eyebrow opacity-60">toque para pular</span>
        <button
          onPointerDown={toggleMute}
          className="btn-ghost flex h-10 w-10 items-center justify-center rounded-full text-mist"
          aria-label={muted ? 'Ativar som' : 'Silenciar'}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>
    </div>
  );
}
