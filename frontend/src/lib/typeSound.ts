/**
 * Som de digitação gerado na hora com WebAudio (nenhum arquivo para baixar).
 * Navegadores só liberam áudio depois de um gesto da pessoa, então `unlockAudio` é chamado em qualquer
 * clique/tecla; até lá a digitação acontece em silêncio.
 */

const MUTE_KEY = 'synapse-muted';

let context: AudioContext | null = null;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

let muted = readMuted();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    /* armazenamento indisponível: a preferência só vale nesta visita */
  }
}

export function unlockAudio(): void {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

/** Um "tec" curto e macio; o tom varia com a letra para não soar como metrônomo. */
export function playTypeTick(char: string): void {
  if (muted || !context || context.state !== 'running' || char === ' ') return;

  const now = context.currentTime;
  const base = 420 + (char.toLowerCase().charCodeAt(0) % 11) * 38;

  const osc = context.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(base * 1.5, now);
  osc.frequency.exponentialRampToValueAtTime(base, now + 0.05);

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2600;

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

  osc.connect(filter).connect(gain).connect(context.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}
