import { describe, expect, it } from 'vitest';
import { FULL_TEXT, LINES, revealLines } from './introScript';

const visibleText = (count: number) =>
  revealLines(LINES, count)
    .map(line => line.segments.map(segment => segment.visible).join(''))
    .join('\n');

describe('intro script', () => {
  it('joins the lines with a newline so typing can walk the whole text', () => {
    expect(FULL_TEXT.split('\n')).toHaveLength(LINES.length);
    expect(FULL_TEXT.startsWith('Toda ideia')).toBe(true);
  });

  it('shows nothing before typing starts and everything at the end', () => {
    expect(visibleText(0)).toBe('\n');
    expect(visibleText(FULL_TEXT.length)).toBe(FULL_TEXT);
  });

  it('reveals letter by letter across segments of the same line', () => {
    const [first] = revealLines(LINES, 'Toda ideia es'.length);
    expect(first.segments[0].visible).toBe('Toda ideia ');
    expect(first.segments[1].visible).toBe('es');
    expect(first.segments[1].hidden).toBe('conde outra.');
  });

  it('only starts the second line after the first one is complete', () => {
    const firstLineLength = FULL_TEXT.split('\n')[0].length;
    expect(visibleText(firstLineLength).split('\n')[1]).toBe('');
    expect(visibleText(firstLineLength + 1 + 4).split('\n')[1]).toBe('Qual');
  });

  it('keeps visible + hidden equal to the original text so layout never jumps', () => {
    for (let count = 0; count <= FULL_TEXT.length; count++) {
      const rebuilt = revealLines(LINES, count)
        .map(line => line.segments.map(segment => segment.visible + segment.hidden).join(''))
        .join('\n');
      expect(rebuilt).toBe(FULL_TEXT);
    }
  });
});
