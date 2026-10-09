import { useEffect, useRef, useState } from 'react';

const PAUSE_AFTER: Record<string, number> = { '.': 380, ',': 180, '?': 420, '!': 320 };

interface Options {
  /** Milissegundos por letra. */
  speed?: number;
  /** Chamado a cada letra revelada (usado para o som). */
  onChar?: (char: string) => void;
  /** Sem animação: mostra o texto inteiro de uma vez. */
  instant?: boolean;
}

/**
 * Revela `text` letra por letra, com pausa extra após pontuação.
 * Devolve quantas letras já aparecem, se terminou e uma função para pular direto ao fim.
 */
export function useTypewriter(text: string, { speed = 52, onChar, instant = false }: Options = {}) {
  const [count, setCount] = useState(instant ? text.length : 0);
  const onCharRef = useRef(onChar);

  useEffect(() => {
    onCharRef.current = onChar;
  }, [onChar]);

  useEffect(() => {
    if (instant || count >= text.length) return;
    const previous = count > 0 ? text[count - 1] : '';
    const delay = count === 0 ? 600 : speed + (PAUSE_AFTER[previous] ?? 0);
    const id = setTimeout(() => {
      onCharRef.current?.(text[count]);
      setCount(count + 1);
    }, delay);
    return () => clearTimeout(id);
  }, [count, text, speed, instant]);

  return {
    count: instant ? text.length : count,
    done: instant || count >= text.length,
    skip: () => setCount(text.length),
  };
}
