/** 8-directional A* on the tile grid (no corner cutting). Returns tile steps excluding the start. */
export function findPath(
  solid: boolean[][],
  from: { x: number; y: number },
  to: { x: number; y: number },
  limit = 4000,
): { x: number; y: number }[] | null {
  const H = solid.length, W = solid[0].length;
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !solid[y][x];
  if (!free(to.x, to.y)) return null;
  const key = (x: number, y: number) => y * W + x;
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - to.x), dy = Math.abs(y - to.y);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  const g = new Map<number, number>([[key(from.x, from.y), 0]]);
  const came = new Map<number, number>();
  const open: { k: number; x: number; y: number; f: number }[] = [{ k: key(from.x, from.y), x: from.x, y: from.y, f: h(from.x, from.y) }];
  const closed = new Set<number>();
  let steps = 0;
  while (open.length && steps++ < limit) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.x === to.x && cur.y === to.y) {
      const out: { x: number; y: number }[] = [];
      let k = cur.k;
      while (came.has(k)) {
        out.push({ x: k % W, y: Math.floor(k / W) });
        k = came.get(k)!;
      }
      return out.reverse();
    }
    if (closed.has(cur.k)) continue;
    closed.add(cur.k);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cur.x + dx, ny = cur.y + dy;
        if (!free(nx, ny)) continue;
        if (dx && dy && (!free(cur.x + dx, cur.y) || !free(cur.x, cur.y + dy))) continue;
        const nk = key(nx, ny);
        const ng = g.get(cur.k)! + (dx && dy ? Math.SQRT2 : 1);
        if (ng < (g.get(nk) ?? Infinity)) {
          g.set(nk, ng);
          came.set(nk, cur.k);
          open.push({ k: nk, x: nx, y: ny, f: ng + h(nx, ny) });
        }
      }
  }
  return null;
}
