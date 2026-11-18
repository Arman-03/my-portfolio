/**
 * Tiny chiptune-style sound effects synthesised with WebAudio — no audio files.
 * The AudioContext is created lazily on the first user gesture (browser autoplay rules).
 */
import { state } from './state.ts';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 1, slideTo?: number) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.5) {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(master);
  src.start(ctx.currentTime + start);
}

const sounds = {
  blip: () => tone(660 + Math.random() * 80, 0, 0.035, 'square', 0.25),
  select: () => {
    tone(523, 0, 0.06, 'square', 0.5);
    tone(784, 0.05, 0.08, 'square', 0.5);
  },
  open: () => {
    tone(392, 0, 0.07, 'triangle', 0.8);
    tone(523, 0.06, 0.07, 'triangle', 0.8);
    tone(659, 0.12, 0.12, 'triangle', 0.8);
  },
  close: () => {
    tone(523, 0, 0.06, 'triangle', 0.7);
    tone(392, 0.05, 0.09, 'triangle', 0.7);
  },
  discover: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.16, 'square', 0.45)),
  complete: () =>
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, i === 6 ? 0.5 : 0.14, 'square', 0.45)),
  portal: () => tone(200, 0, 0.6, 'sawtooth', 0.35, 1200),
  squash: () => {
    noise(0, 0.12, 0.6);
    tone(140, 0, 0.12, 'square', 0.5, 60);
  },
  error: () => {
    tone(160, 0, 0.2, 'sawtooth', 0.6);
    tone(110, 0.18, 0.35, 'sawtooth', 0.6);
    noise(0.05, 0.4, 0.4);
  },
  step: () => tone(90 + Math.random() * 30, 0, 0.03, 'triangle', 0.25),
};

export type Sfx = keyof typeof sounds;

export function sfx(name: Sfx) {
  if (!state.sound || !ctx) return;
  try {
    sounds[name]();
  } catch {
    /* audio is decorative; never let it break the game */
  }
}
