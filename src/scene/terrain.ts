import type { SceneData } from "./types";
export function sampleTerrain(t: SceneData["terrain"], x: number, z: number) {
  const W = (t.cols - 1) * t.step, D = (t.rows - 1) * t.step;
  const fx = Math.min(Math.max((x + W / 2) / t.step, 0), t.cols - 1.0001);
  const fz = Math.min(Math.max((z + D / 2) / t.step, 0), t.rows - 1.0001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const g = (a: number, b: number) => t.values[b * t.cols + a];
  return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v;
}
export function distToPolyline(px: number, pz: number, pts: [number, number][]) {
  let best = Infinity;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const s = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
    best = Math.min(best, Math.hypot(px - ax - s * dx, pz - az - s * dz));
  }
  return best;
}

/** Extra height of a road at distance d along it: flyovers ramp up to their deck, underpasses dip. */
export function roadLift(r: { bridge?: number; tunnel?: boolean }, d: number, len: number) {
  const ramp = Math.min(1, d / 40, (len - d) / 40);
  if (r.bridge) return 7 * Math.min(r.bridge, 2) * Math.max(0, ramp);
  if (r.tunnel) return -0.2;
  return 0;
}
