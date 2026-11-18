/**
 * Builds the whole world procedurally (but deterministically) from a layout
 * description. Pure TypeScript, no Phaser imports, so it can also run in Node
 * for map previews and reachability checks (see tools/).
 */
import { T, D, C, TOWN, DUNGEON, CUSTOM } from './tiles.ts';
import type { LocationId } from '../content.ts';

export const MAP_W = 96;
export const MAP_H = 46;
const EMPTY = -1;

export interface Rect { x: number; y: number; w: number; h: number }

export type InteractKind =
  | { type: 'location'; id: LocationId }
  | { type: 'exhibit'; projectId: string }
  | { type: 'dialog'; lines: keyof typeof import('../content.ts').lines; discover?: LocationId }
  | { type: 'terminal' }
  | { type: 'rootChest' }
  | { type: 'portal'; to: 'dungeon' | 'world' };

export interface Interactable {
  key: string;
  /** Tile the object occupies (what gets highlighted / clicked). */
  tx: number;
  ty: number;
  w: number;
  h: number;
  label: string;
  kind: InteractKind;
  /** If true, walking into the object triggers it (doors, portals). */
  bump?: boolean;
  /** Side the player walks in from when bumping. Defaults to 'below' (walking up). */
  approach?: 'below' | 'above';
}

export interface NpcSpawn {
  key: string;
  frame: number;
  tx: number;
  ty: number;
  name: string;
  lines: keyof typeof import('../content.ts').lines;
  wander: number; // tiles; 0 = stands still
  area: 'world' | 'dungeon';
  squashable?: boolean;
}

export interface Zone { id: string; name: string; rect: Rect; area: 'world' | 'dungeon' }

export interface WorldData {
  width: number;
  height: number;
  ground: number[][];
  decor: number[][];
  objects: number[][];
  /** Drawn above characters (tree crowns). Never solid. */
  above: number[][];
  solid: boolean[][];
  waterCells: { x: number; y: number; local: number }[];
  flagCells: { x: number; y: number }[];
  interactables: Interactable[];
  npcs: NpcSpawn[];
  zones: Zone[];
  spawn: { tx: number; ty: number };
  dungeonSpawn: { tx: number; ty: number };
  worldExit: { tx: number; ty: number };
  areas: { world: Rect; dungeon: Rect };
}

/** Small deterministic PRNG so the decoration layout never changes between loads. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grid = <V>(v: V) => Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => v));

export function buildWorld(): WorldData {
  const rand = mulberry32(20261118);
  const ground = grid(T(TOWN.grass));
  const decor = grid(EMPTY);
  const objects = grid(EMPTY);
  const above = grid(EMPTY);
  const solid = grid(false);
  /** Cells reserved for paths/buildings/clearance; random decoration skips them. */
  const reserved = grid(false);
  const waterCells: WorldData['waterCells'] = [];
  const flagCells: WorldData['flagCells'] = [];
  const interactables: Interactable[] = [];
  const npcs: NpcSpawn[] = [];
  const zones: Zone[] = [];

  const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  const reserve = (x: number, y: number, w = 1, h = 1, pad = 0) => {
    for (let j = y - pad; j < y + h + pad; j++)
      for (let i = x - pad; i < x + w + pad; i++) if (inMap(i, j)) reserved[j][i] = true;
  };
  const putObj = (x: number, y: number, gid: number, isSolid = true) => {
    objects[y][x] = gid;
    if (isSolid) solid[y][x] = true;
    reserve(x, y);
  };
  const stamp = (x: number, y: number, rows: number[][], toGid: (i: number) => number = T) => {
    rows.forEach((row, j) => row.forEach((i, k) => i >= 0 && putObj(x + k, y + j, toGid(i))));
  };

  // ---------------------------------------------------------------- world area
  const WORLD: Rect = { x: 0, y: 0, w: 64, h: MAP_H };
  const DUNGEON_AREA: Rect = { x: 64, y: 0, w: 32, h: MAP_H };

  // Grass variation.
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < WORLD.w; x++) {
      const r = rand();
      ground[y][x] = T(r < 0.035 ? TOWN.grassFlowers : r < 0.16 ? TOWN.grassTufts : TOWN.grass);
    }

  // Generic 9-slice autotiler (used for water and the dirt plaza).
  const nineSlice = (
    mask: (x: number, y: number) => boolean,
    rect: Rect,
    slice: (n: number) => number,
    inner: (n: number) => number,
    onCell?: (x: number, y: number, local: number) => void,
  ) => {
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (!mask(x, y)) continue;
        const u = mask(x, y - 1), d = mask(x, y + 1), l = mask(x - 1, y), r = mask(x + 1, y);
        let n: number;
        let isInner = false;
        if (!u && !l) n = 0;
        else if (!u && !r) n = 2;
        else if (!u) n = 1;
        else if (!d && !l) n = 6;
        else if (!d && !r) n = 8;
        else if (!d) n = 7;
        else if (!l) n = 3;
        else if (!r) n = 5;
        else if (!mask(x - 1, y - 1)) { n = 0; isInner = true; }
        else if (!mask(x + 1, y - 1)) { n = 1; isInner = true; }
        else if (!mask(x - 1, y + 1)) { n = 2; isInner = true; }
        else if (!mask(x + 1, y + 1)) { n = 3; isInner = true; }
        else n = 4;
        ground[y][x] = isInner ? inner(n) : slice(n);
        onCell?.(x, y, isInner ? 9 + n : n);
      }
  };

  // --- Forest border with a secret clearing in the north-east.
  const clearing: Rect = { x: 54, y: 5, w: 4, h: 5 };
  const corridor: Rect = { x: 55, y: 10, w: 2, h: 3 };
  const inRect = (x: number, y: number, r: Rect) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
  const isForest = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || y >= MAP_H) return true;
    if (x >= WORLD.w) return true;
    if (inRect(x, y, clearing) || inRect(x, y, corridor)) return false;
    if (x < 4 || x >= 60 || y < 4 || y >= 42) return true;
    if (x >= 51 && y <= 12) return true; // north-east thicket hiding the ruin
    if (x <= 6 && y >= 36) return true; // south-west corner fill
    return false;
  };
  const isAutumn = (x: number, y: number) => x > 40 && y > 30;
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < WORLD.w; x++) {
      if (!isForest(x, y)) continue;
      const f = isAutumn(x, y) ? TOWN.forestAutumn : TOWN.forest;
      const u = isForest(x, y - 1), d = isForest(x, y + 1), l = isForest(x - 1, y), r = isForest(x + 1, y);
      let t: number = f.fill;
      if (!u) t = !l ? f.topLeft : !r ? f.topRight : f.top;
      else if (!d) t = !l ? f.bottomLeft : !r ? f.bottomRight : f.bottom;
      else if (!l) t = f.left;
      else if (!r) t = f.right;
      putObj(x, y, T(t));
    }

  // --- Paths (Kenney stepping stones).
  const path = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        ground[y][x] = T(TOWN.stonePath);
        reserve(x, y, 1, 1, 1);
      }
  };

  // --- Central plaza (dirt 9-slice).
  const plaza: Rect = { x: 26, y: 19, w: 12, h: 9 };
  nineSlice((x, y) => inRect(x, y, plaza), plaza, (n) => T(TOWN.dirt[n]), (n) => T(TOWN.dirtInner[n]));
  reserve(plaza.x, plaza.y, plaza.w, plaza.h, 1);

  path(5, 23, plaza.x - 1, 23); // main road west
  path(plaza.x + plaza.w, 23, 58, 23); // main road east
  path(31, 13, 32, plaza.y - 1); // north avenue to Hall of Fame
  path(31, plaza.y + plaza.h, 32, 34); // south avenue
  path(8, 35, 54, 35); // south road

  // --- Lake (water 9-slice, animated) with a dock.
  const lake: Rect = { x: 14, y: 6, w: 12, h: 8 };
  const lakeMask = (x: number, y: number) =>
    inRect(x, y, lake) && !(x === lake.x && y === lake.y) && !(x >= lake.x + lake.w - 3 && y === lake.y);
  nineSlice(
    lakeMask,
    lake,
    (n) => C(CUSTOM.waterA + n),
    (n) => C(CUSTOM.waterA + 9 + n),
    (x, y, local) => {
      waterCells.push({ x, y, local });
      solid[y][x] = true;
    },
  );
  reserve(lake.x, lake.y, lake.w, lake.h, 1);
  const dockX = 20;
  for (let y = 11; y <= 13; y++) {
    decor[y][dockX] = C(CUSTOM.dock);
    solid[y][dockX] = false;
  }
  path(dockX, 14, dockX, 22);
  [[16, 8, CUSTOM.lily], [23, 9, CUSTOM.lilyFlower], [18, 11, CUSTOM.lily], [22, 7, CUSTOM.lily], [24, 11, CUSTOM.lily]].forEach(
    ([x, y, i]) => (decor[y][x] = C(i)),
  );
  putObj(22, 14, T(TOWN.sign));
  interactables.push({ key: 'lakeSign', tx: 22, ty: 14, w: 1, h: 1, label: 'Read sign', kind: { type: 'dialog', lines: 'lakeSign', discover: 'lake' } });
  zones.push({ id: 'lake', name: 'Side-Project Lake', rect: { x: 13, y: 5, w: 14, h: 11 }, area: 'world' });

  // --- Buildings. Each door gets a location interactable + a spur to a road.
  const door = (id: LocationId, x: number, y: number, label: string) => {
    interactables.push({ key: `door-${id}`, tx: x, ty: y, w: 1, h: 1, label, kind: { type: 'location', id }, bump: true });
  };

  // Akthar's Home (About) — red roof, wooden walls.
  stamp(9, 15, [[52, 55, 53, 54], [64, 65, 67, 66], [72, 84, 86, 75]]);
  door('about', 11, 17, 'Enter home');
  path(11, 18, 11, 22);
  // Fenced bee garden beside the house.
  const F = TOWN.fence;
  stamp(14, 15, [
    [F.left, F.mid, F.mid, F.right],
    [F.postMid, -1, -1, F.postMid],
    [F.bottomLeft, F.bottomMid, F.bottomMid, F.bottomRight],
  ]);
  putObj(15, 16, T(TOWN.beehive));
  putObj(16, 16, T(TOWN.beehive));
  putObj(8, 17, T(TOWN.barrel));
  zones.push({ id: 'about', name: 'Akthar’s Home', rect: { x: 6, y: 14, w: 9, h: 8 }, area: 'world' });

  // Hall of Fame (Achievements) — castle.
  stamp(29, 9, [[123, 96, 97, 98, 124], [123, 108, 109, 110, 124], [123, 120, 121, 122, 124], [125, 126, 111, 112, 125]]);
  door('hall', 31, 12, 'Enter Hall of Fame');
  interactables.push({ key: 'door-hall-b', tx: 32, ty: 12, w: 1, h: 1, label: 'Enter Hall of Fame', kind: { type: 'location', id: 'hall' }, bump: true });
  zones.push({ id: 'hall', name: 'Hall of Fame', rect: { x: 27, y: 8, w: 9, h: 9 }, area: 'world' });

  // Project Lab (Projects) — big stone building with exhibits out front.
  stamp(44, 15, [[48, 49, 51, 49, 50], [60, 61, 63, 61, 62], [76, 88, 90, 88, 79]]);
  door('projects', 46, 17, 'Enter Project Lab');
  const yard: Rect = { x: 40, y: 19, w: 13, h: 3 };
  nineSlice((x, y) => inRect(x, y, yard), yard, (n) => T(TOWN.dirt[n]), (n) => T(TOWN.dirtInner[n]));
  reserve(yard.x, yard.y, yard.w, yard.h, 1);
  path(46, 18, 46, 18);
  path(46, 22, 46, 22);
  const exhibitX = [41, 43, 49, 51];
  ['nfs', 'buysell', 'picsysnap', 'taxmanager'].forEach((projectId, i) => {
    putObj(exhibitX[i], 20, T(TOWN.sign));
    interactables.push({ key: `exhibit-${projectId}`, tx: exhibitX[i], ty: 20, w: 1, h: 1, label: 'View project', kind: { type: 'exhibit', projectId } });
  });
  zones.push({ id: 'projects', name: 'Project Lab', rect: { x: 40, y: 14, w: 13, h: 9 }, area: 'world' });

  // The Library (Skills).
  stamp(9, 31, [[48, 51, 49, 50], [60, 61, 63, 62], [76, 88, 90, 79]]);
  door('skills', 11, 33, 'Enter Library');
  path(11, 34, 11, 34);
  zones.push({ id: 'skills', name: 'The Library', rect: { x: 7, y: 29, w: 9, h: 8 }, area: 'world' });

  // Vayu House — with waving Vayu flags.
  stamp(19, 31, [[52, 55, 53, 54], [64, 65, 67, 66], [72, 84, 86, 75]]);
  door('vayu', 21, 33, 'Enter Vayu House');
  path(21, 34, 21, 34);
  for (const fx of [17, 24]) {
    putObj(fx, 33, C(CUSTOM.flagA));
    flagCells.push({ x: fx, y: 33 });
  }
  zones.push({ id: 'vayu', name: 'Vayu House', rect: { x: 16, y: 29, w: 10, h: 8 }, area: 'world' });

  // E-Cell HQ (Leadership).
  stamp(39, 31, [[52, 53, 55, 53, 54], [64, 65, 67, 65, 66], [76, 88, 90, 88, 79]]);
  door('ecell', 41, 33, 'Enter E-Cell HQ');
  path(41, 34, 41, 34);
  zones.push({ id: 'ecell', name: 'E-Cell HQ', rect: { x: 37, y: 29, w: 9, h: 8 }, area: 'world' });

  // Post Office (Contact).
  stamp(49, 31, [[48, 49, 50], [60, 63, 62], [72, 86, 75]]);
  door('contact', 50, 33, 'Enter Post Office');
  path(50, 34, 50, 34);
  zones.push({ id: 'contact', name: 'Post Office', rect: { x: 47, y: 29, w: 7, h: 8 }, area: 'world' });

  // Target range (goals).
  stamp(54, 26, [[TOWN.target, -1, TOWN.target]]);
  stamp(55, 28, [[TOWN.target]]);
  putObj(53, 29, T(TOWN.sign));
  interactables.push({ key: 'goalsSign', tx: 53, ty: 29, w: 1, h: 1, label: 'Read sign', kind: { type: 'dialog', lines: 'goalsSign' } });

  // --- Plaza props.
  putObj(31, 21, T(TOWN.well));
  putObj(28, 21, T(TOWN.sign));
  interactables.push({ key: 'welcomeSign', tx: 28, ty: 21, w: 1, h: 1, label: 'Read sign', kind: { type: 'dialog', lines: 'welcomeSign' } });
  putObj(36, 21, C(CUSTOM.terminal));
  interactables.push({ key: 'terminal', tx: 36, ty: 21, w: 1, h: 1, label: 'Use terminal', kind: { type: 'terminal' } });
  zones.push({ id: 'plaza', name: 'Town Square', rect: plaza, area: 'world' });

  // Chai stall just west of the plaza.
  putObj(23, 20, T(TOWN.cart));
  reserve(22, 19, 3, 4);

  // --- Secret ruin in the north-east clearing.
  stamp(55, 6, [[126, 126], [113, 114]]);
  interactables.push({ key: 'portal-a', tx: 55, ty: 7, w: 1, h: 1, label: 'Enter the ruin', kind: { type: 'portal', to: 'dungeon' }, bump: true });
  interactables.push({ key: 'portal-b', tx: 56, ty: 7, w: 1, h: 1, label: 'Enter the ruin', kind: { type: 'portal', to: 'dungeon' }, bump: true });
  putObj(54, 8, T(TOWN.sign));
  interactables.push({ key: 'ruinSign', tx: 54, ty: 8, w: 1, h: 1, label: 'Read glyphs', kind: { type: 'dialog', lines: 'ruinSign' } });
  decor[13][54] = T(TOWN.mushrooms);
  decor[13][57] = T(TOWN.mushrooms);
  decor[9][57] = T(TOWN.mushrooms);
  reserve(clearing.x, clearing.y, clearing.w, clearing.h + 4);
  zones.push({ id: 'ruin', name: '???', rect: clearing, area: 'world' });

  // --- NPCs in the world.
  npcs.push(
    { key: 'akthar', frame: DUNGEON.headband, tx: 34, ty: 23, name: 'Akthar', lines: 'akthar', wander: 0, area: 'world' },
    { key: 'chai', frame: DUNGEON.bald, tx: 23, ty: 21, name: 'Chai Bhaiya', lines: 'chai', wander: 0, area: 'world' },
    { key: 'fresher', frame: DUNGEON.villager, tx: 14, ty: 36, name: 'Lost Fresher', lines: 'fresher', wander: 2, area: 'world' },
    { key: 'knight', frame: DUNGEON.knight, tx: 47, ty: 21, name: 'Code Reviewer', lines: 'knight', wander: 2, area: 'world' },
    { key: 'wizard', frame: DUNGEON.wizard, tx: 36, ty: 14, name: 'Prof. Merge Conflict', lines: 'wizard', wander: 2, area: 'world' },
    { key: 'captain', frame: DUNGEON.viking, tx: 26, ty: 37, name: 'Vayu Cheerleader', lines: 'captain', wander: 2, area: 'world' },
  );
  for (const n of npcs) reserve(n.tx, n.ty, 1, 1, n.wander + 1);

  // Keep every interactable approachable.
  for (const it of interactables) reserve(it.tx, it.ty, it.w, it.h, 1);

  // --- Decoration: trees grow in groves (smooth value noise), flowers bloom near buildings.
  const lattice = new Map<string, number>();
  const latticeAt = (i: number, j: number) => {
    const k = `${i},${j}`;
    if (!lattice.has(k)) lattice.set(k, rand());
    return lattice.get(k)!;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const noise = (x: number, y: number, cell = 5) => {
    const gx = x / cell, gy = y / cell;
    const i = Math.floor(gx), j = Math.floor(gy);
    const fx = smooth(gx - i), fy = smooth(gy - j);
    const a = latticeAt(i, j), b = latticeAt(i + 1, j), c = latticeAt(i, j + 1), d = latticeAt(i + 1, j + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const nearBuilding = (x: number, y: number) => {
    for (let j = y - 2; j <= y + 2; j++)
      for (let i = x - 2; i <= x + 2; i++) if (inMap(i, j) && objects[j][i] !== EMPTY && !isForest(i, j)) return true;
    return false;
  };
  for (let y = 5; y < 41; y++)
    for (let x = 5; x < 59; x++) {
      if (solid[y][x] || isForest(x, y)) continue;
      const g = ground[y][x];
      const isGrass = g === T(TOWN.grass) || g === T(TOWN.grassTufts) || g === T(TOWN.grassFlowers);
      if (!isGrass) continue;
      if (!reserved[y][x]) {
        const n = noise(x, y);
        const r = rand();
        const autumn = isAutumn(x, y) || (x > 34 && y > 36);
        if ((n > 0.66 && r < 0.5) || r < 0.012) {
          const tall = autumn ? TOWN.tallAutumn : TOWN.tallGreen;
          const crownFree = objects[y - 1][x] === EMPTY && above[y - 1][x] === EMPTY;
          if (crownFree && rand() < 0.6) {
            putObj(x, y, T(tall.bottom));
            above[y - 1][x] = T(tall.top);
          } else {
            putObj(x, y, T(autumn ? TOWN.treeAutumn : TOWN.treeGreen));
          }
          continue;
        }
        if (n > 0.55 && r < 0.6 && rand() < 0.12) {
          putObj(x, y, T(TOWN.bushRound));
          continue;
        }
        if (n > 0.6 && rand() < 0.05) decor[y][x] = T(TOWN.mushrooms);
      }
      if (nearBuilding(x, y) && rand() < 0.22) ground[y][x] = T(TOWN.grassFlowers);
    }

  // ------------------------------------------------------------- dungeon area
  // Fill the whole dungeon column with void so a tall viewport never sees grass.
  for (let y = 0; y < MAP_H; y++)
    for (let x = DUNGEON_AREA.x; x < DUNGEON_AREA.x + DUNGEON_AREA.w; x++) {
      ground[y][x] = D(DUNGEON.void);
      solid[y][x] = true;
    }
  // Room 15 x 10 centered in the dungeon area.
  const R: Rect = { x: 72, y: 4, w: 15, h: 10 };
  const W = DUNGEON.wall;
  for (let x = R.x; x < R.x + R.w; x++) {
    const i = x - R.x;
    const pillar = i === 3 || i === R.w - 4;
    const banner = i === Math.floor(R.w / 2);
    objects[R.y][x] = D(i === 0 ? W.topLeft : i === R.w - 1 ? W.topRight : pillar ? W.topPillar : W.top);
    objects[R.y + 1][x] = D(i === 0 ? W.left : i === R.w - 1 ? W.right : pillar ? W.pillar : banner ? W.banner : W.face);
    objects[R.y + R.h - 1][x] = D(i === 0 ? W.bottomLeft : i === R.w - 1 ? W.bottomRight : banner ? W.door : W.bottom);
  }
  for (let y = R.y + 2; y < R.y + R.h - 1; y++) {
    objects[y][R.x] = D(W.left);
    objects[y][R.x + R.w - 1] = D(W.right);
    for (let x = R.x + 1; x < R.x + R.w - 1; x++) {
      const i = x - R.x;
      const r = rand();
      if (y === R.y + 2) ground[y][x] = D(i === 3 || i === R.w - 4 ? W.pillarBase : r < 0.2 ? W.shadowAlt : W.shadow);
      else ground[y][x] = D(r < 0.06 ? DUNGEON.floorRubble : r < 0.2 ? DUNGEON.floorAlt : DUNGEON.floor);
      solid[y][x] = false;
    }
  }
  const doorX = R.x + Math.floor(R.w / 2);
  interactables.push({ key: 'dungeonExit', tx: doorX, ty: R.y + R.h - 1, w: 1, h: 1, label: 'Leave', kind: { type: 'portal', to: 'world' }, bump: true, approach: 'above' });
  putObj(doorX, R.y + 3, D(DUNGEON.chest));
  interactables.push({ key: 'rootChest', tx: doorX, ty: R.y + 3, w: 1, h: 1, label: 'Open chest', kind: { type: 'rootChest' } });
  putObj(R.x + 1, R.y + 2, D(DUNGEON.barrel));
  putObj(R.x + R.w - 2, R.y + 2, D(DUNGEON.barrel));
  putObj(R.x + 1, R.y + R.h - 2, D(DUNGEON.tombstone));
  npcs.push(
    { key: 'ghost', frame: DUNGEON.ghost, tx: R.x + 3, ty: R.y + 5, name: 'Ghost of Deadlines Past', lines: 'ghost', wander: 3, area: 'dungeon' },
    { key: 'bug1', frame: DUNGEON.spider, tx: R.x + 10, ty: R.y + 4, name: 'Bug', lines: 'bug', wander: 3, area: 'dungeon', squashable: true },
    { key: 'bug2', frame: DUNGEON.spider, tx: R.x + 5, ty: R.y + 7, name: 'Bug', lines: 'bug', wander: 3, area: 'dungeon', squashable: true },
    { key: 'bug3', frame: DUNGEON.spider, tx: R.x + 11, ty: R.y + 7, name: 'Bug', lines: 'bug', wander: 3, area: 'dungeon', squashable: true },
  );
  zones.push({ id: 'secret', name: '/root', rect: R, area: 'dungeon' });

  // The collision grid is the source of truth; make sure every object tile is solid
  // except walkable decor (dock).
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (objects[y][x] !== EMPTY) solid[y][x] = true;

  return {
    width: MAP_W,
    height: MAP_H,
    ground,
    decor,
    objects,
    above,
    solid,
    waterCells,
    flagCells,
    interactables,
    npcs,
    zones,
    spawn: { tx: 32, ty: 26 },
    dungeonSpawn: { tx: doorX, ty: R.y + R.h - 2 },
    worldExit: { tx: 55, ty: 9 },
    areas: { world: WORLD, dungeon: DUNGEON_AREA },
  };
}
