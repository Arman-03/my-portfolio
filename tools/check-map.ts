// Verifies the generated world is playable: every interactable and NPC is reachable
// on foot from its area's spawn. Run: node tools/check-map.ts  (exit code 1 on failure)
import { buildWorld } from '../src/world/worldMap.ts';

const w = buildWorld();
const reach = (sx: number, sy: number) => {
  const seen = new Set<string>([`${sx},${sy}`]);
  const q: [number, number][] = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= w.width || ny >= w.height || seen.has(k) || w.solid[ny][nx]) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
};
const inArea = (x: number, a: 'world' | 'dungeon') => x >= w.areas[a].x && x < w.areas[a].x + w.areas[a].w;
const fromWorld = reach(w.spawn.tx, w.spawn.ty);
const fromDungeon = reach(w.dungeonSpawn.tx, w.dungeonSpawn.ty);
let failures = 0;
const fail = (msg: string) => { failures++; console.error('✗', msg); };

if (w.solid[w.spawn.ty][w.spawn.tx]) fail('world spawn is solid');
if (w.solid[w.dungeonSpawn.ty][w.dungeonSpawn.tx]) fail('dungeon spawn is solid');
if (!fromWorld.has(`${w.worldExit.tx},${w.worldExit.ty}`)) fail('dungeon exit point not reachable in world');

for (const it of w.interactables) {
  const set = inArea(it.tx, 'dungeon') ? fromDungeon : fromWorld;
  let ok = false;
  for (let y = it.ty - 1; y <= it.ty + it.h; y++)
    for (let x = it.tx - 1; x <= it.tx + it.w; x++) if (set.has(`${x},${y}`)) ok = true;
  if (!ok) fail(`interactable ${it.key} at ${it.tx},${it.ty} unreachable`);
  const dy = it.approach === 'above' ? -1 : it.h;
  if (it.bump && !set.has(`${it.tx},${it.ty + dy}`)) fail(`door ${it.key} cannot be approached from its ${it.approach ?? 'below'} side`);
}
for (const n of w.npcs) {
  const set = n.area === 'dungeon' ? fromDungeon : fromWorld;
  if (!set.has(`${n.tx},${n.ty}`)) fail(`npc ${n.key} at ${n.tx},${n.ty} spawns somewhere unreachable`);
}
console.log(failures ? `${failures} problem(s)` : `map ok: ${w.interactables.length} interactables, ${w.npcs.length} npcs, ${fromWorld.size} walkable world tiles`);
process.exit(failures ? 1 : 0);
