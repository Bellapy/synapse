import { useEffect, useState } from 'react';

/** Vira `true` quando `active` fica ligado por mais de `afterMs` (ex.: servidor gratuito acordando). */
export function useSlowHint(active: boolean, afterMs = 7000): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setElapsed(true), afterMs);
    return () => {
      clearTimeout(id);
      setElapsed(false);
    };
  }, [active, afterMs]);

  return active && elapsed;
}
