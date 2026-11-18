import { locations, type LocationId } from './content.ts';

/** Tiny typed event bus shared by the Phaser scene and the DOM UI. */
type Events = {
  discover: LocationId;
  progress: number;
  'game-start': void;
  'squash': number;
};
type Handler<T> = (payload: T) => void;
const handlers = new Map<keyof Events, Set<Handler<never>>>();

export const bus = {
  on<K extends keyof Events>(event: K, fn: Handler<Events[K]>) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(fn as Handler<never>);
    return () => void handlers.get(event)?.delete(fn as Handler<never>);
  },
  emit<K extends keyof Events>(event: K, ...payload: Events[K] extends void ? [] : [Events[K]]) {
    handlers.get(event)?.forEach((h) => (h as Handler<Events[K]>)(payload[0] as Events[K]));
  },
};

// ---- persistence (best effort; private windows may block storage)
const KEY = 'akthar-world:v1';
interface Saved {
  discovered: LocationId[];
  sound: boolean;
  character: number;
  squashed: number;
}
function load(): Saved {
  const fallback: Saved = { discovered: [], sound: true, character: -1, squashed: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    return {
      discovered: (parsed.discovered ?? []).filter((id): id is LocationId => id in locations),
      sound: parsed.sound ?? true,
      character: parsed.character ?? -1,
      squashed: parsed.squashed ?? 0,
    };
  } catch {
    return fallback;
  }
}
const saved = load();
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    /* storage unavailable — progress just won't persist */
  }
}

export const TOTAL_PLACES = Object.keys(locations).length;

export const state = {
  /** True while a dialog/panel/overlay owns the keyboard. */
  uiBlocking: false,
  started: false,
  get discovered(): ReadonlySet<LocationId> {
    return new Set(saved.discovered);
  },
  isDiscovered(id: LocationId) {
    return saved.discovered.includes(id);
  },
  /** Marks a place discovered; returns true the first time. */
  discover(id: LocationId): boolean {
    if (saved.discovered.includes(id)) return false;
    saved.discovered.push(id);
    persist();
    bus.emit('discover', id);
    bus.emit('progress', saved.discovered.length);
    return true;
  },
  get sound() {
    return saved.sound;
  },
  set sound(v: boolean) {
    saved.sound = v;
    persist();
  },
  get character() {
    return saved.character;
  },
  set character(v: number) {
    saved.character = v;
    persist();
  },
  get squashed() {
    return saved.squashed;
  },
  addSquash() {
    saved.squashed++;
    persist();
    bus.emit('squash', saved.squashed);
  },
  resetProgress() {
    saved.discovered = [];
    saved.squashed = 0;
    persist();
    bus.emit('progress', 0);
  },
};

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
