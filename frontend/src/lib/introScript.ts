export type Kind = 'sans' | 'serif' | 'soft' | 'accent';

export interface Segment {
  text: string;
  kind: Kind;
}

// A frase da abertura: curta, deixa uma pergunta no ar e empurra para a busca.
export const LINES: Segment[][] = [
  [
    { text: 'Toda ideia ', kind: 'sans' },
    { text: 'esconde outra.', kind: 'serif' },
  ],
  [
    { text: 'Qual delas você vai ', kind: 'soft' },
    { text: 'puxar?', kind: 'accent' },
  ],
];

/** O texto corrido, com "\n" entre as linhas: é o que a digitação percorre letra a letra. */
export const FULL_TEXT = LINES.map(line => line.map(segment => segment.text).join('')).join('\n');

/** Divide cada trecho em parte já digitada e parte ainda oculta, dado quantas letras já apareceram. */
export function revealLines(lines: Segment[][], count: number) {
  let offset = 0;
  return lines.map((line, lineIndex) => {
    const segments = line.map(segment => {
      const visible = Math.max(0, Math.min(segment.text.length, count - offset));
      offset += segment.text.length;
      return { ...segment, visible: segment.text.slice(0, visible), hidden: segment.text.slice(visible) };
    });
    offset += 1; // o "\n" entre linhas
    return { lineIndex, segments };
  });
}
