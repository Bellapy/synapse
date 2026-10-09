import { useSyncExternalStore } from 'react';

/** Acompanha uma media query CSS (ex.: telas estreitas) sem useEffect + estado. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    notify => {
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
