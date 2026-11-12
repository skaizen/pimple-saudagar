import type { SceneData, Building, Road, Tree, Furniture, XZ, BuildingClass } from "./types";
import { sampleTerrain, distToPolyline } from "./terrain";
import { SPECIES } from "./season";

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const line = (f: (s: number) => XZ, n = 24): XZ[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

export function generateScene(seed = 411027): SceneData {
  const r = rng(seed);
  const cols = 16, rows = 15, step = 128;
  const values: number[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = (i - (cols - 1) / 2) * step, z = (j - (rows - 1) / 2) * step;
    values.push(6 + 3 * Math.sin(x / 260) * Math.cos(z / 310) - Math.max(0, (z - 250) / 60));
  }
  const terrain = { cols, rows, step, values };

  const roads: Road[] = [
    { name: "Kunal Icon Road", type: "primary", width: 18, points: line((s) => [-560 + 1120 * s, -70 + 30 * Math.sin(s * 5)]) },
    { name: "Shivar Road", type: "primary", width: 16, points: line((s) => [40 + 40 * Math.sin(s * 4), -560 + 1060 * s]) },
    { name: "Rahatani Link", type: "primary", width: 14, points: line((s) => [-560 + 1120 * s, 230 + 50 * Math.cos(s * 3)]) },
    { name: "PCMC Metro Link", type: "rail", width: 10, points: line((s) => [-560 + 1120 * s, -430 + 20 * s]) },
    { name: "Mula River", type: "river", width: 46, points: line((s) => [-600 + 1200 * s, 470 + 35 * Math.sin(s * 6)], 40) },
  ];
  for (const x of [-400, -250, 220, 380]) roads.push({ type: "secondary", width: 9, points: line((s) => [x + 15 * Math.sin(s * 7), -520 + 960 * s], 12) });
  for (const z of [-300, 90, 360]) roads.push({ type: "secondary", width: 9, points: line((s) => [-540 + 1080 * s, z + 12 * Math.cos(s * 9)], 12) });

  const gardens = [
    { name: "Linear Garden", test: (x: number, z: number) => Math.abs(z - 150) < 22 && x > -350 && x < 300 },
    { name: "Govind Garden", test: (x: number, z: number) => Math.hypot(x + 180, z + 180) < 55 },
    { name: "Shivar Garden", test: (x: number, z: number) => Math.hypot(x - 130, z + 160) < 45 },
  ];
  const inGarden = (x: number, z: number) => gardens.some((g) => g.test(x, z));
  const nearRoad = (x: number, z: number, pad: number) => roads.some((rd) => distToPolyline(x, z, rd.points) < rd.width / 2 + pad);

  const buildings: Building[] = [];
  for (let gx = -480; gx <= 480; gx += 52) for (let gz = -480; gz <= 420; gz += 52) {
    const cx = gx + (r() - 0.5) * 18, cz = gz + (r() - 0.5) * 18;
    if (r() < 0.3 || inGarden(cx, cz) || nearRoad(cx, cz, 22)) continue;
    const nearMain = distToPolyline(cx, cz, roads[0].points) < 70;
    const cls: BuildingClass = nearMain ? "commercial" : r() < 0.08 ? "institution" : "residential";
    const w = 14 + r() * 20, d = 14 + r() * 18, a = (r() - 0.5) * 0.25;
    const h = cls === "residential" ? (r() < 0.3 ? 45 + r() * 35 : 12 + r() * 22) : cls === "commercial" ? 10 + r() * 22 : 9 + r() * 10;
    const c = Math.cos(a), s = Math.sin(a);
    const ring: XZ[] = ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as XZ[]).map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
    buildings.push({ id: `b${buildings.length}`, h: Math.round(h), ring, cls });
  }

  const trees: Tree[] = [];
  const addTree = (x: number, z: number) => {
    const sp = SPECIES[Math.floor(r() * SPECIES.length)];
    const height = 6 + r() * 8;
    trees.push({ x, z, y: sampleTerrain(terrain, x, z), species: sp, height, radius: 2.5 + r() * 2.5 });
  };
  for (const rd of roads) {
    if (rd.type === "river" || rd.type === "rail") continue;
    for (let k = 0; k < rd.points.length - 1; k++) {
      const [ax, az] = rd.points[k], [bx, bz] = rd.points[k + 1];
      const len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
      for (let t = 0; t < len; t += 16) for (const side of [-1, 1]) {
        if (r() < 0.35) continue;
        const off = rd.width / 2 + 4;
        addTree(ax + ((bx - ax) * t) / len + nx * off * side, az + ((bz - az) * t) / len + nz * off * side);
      }
    }
  }
  for (let n = 0; n < 2600 && trees.length < 1300; n++) {
    const x = (r() - 0.5) * 1100, z = (r() - 0.5) * 1000;
    const g = inGarden(x, z), river = z > 420 && z < 445;
    if ((g || river || r() < 0.06) && !nearRoad(x, z, 3)) addTree(x, z);
  }

  const furniture: Furniture[] = [];
  for (const rd of roads.filter((x) => x.type === "primary")) {
    for (let k = 0; k < rd.points.length; k += 1) {
      const [x, z] = rd.points[k];
      for (const side of [-1, 1]) furniture.push({ type: "lamp", x: x + side * (rd.width / 2 + 1.5) * (rd.name === "Shivar Road" ? 1 : 0), z: z + side * (rd.width / 2 + 1.5) * (rd.name === "Shivar Road" ? 0 : 1), y: sampleTerrain(terrain, x, z) });
    }
  }
  const lbl = (name: string, x: number, z: number, type: "landmark" | "road" | "area" = "landmark") => ({ name, x, z, y: sampleTerrain(terrain, x, z) + 40, type });
  return {
    meta: { center_lon_lat: [73.7983, 18.6161], area_m2: 1_000_000, counts: { buildings: buildings.length, trees: trees.length, roads: roads.length, lamps: furniture.length } },
    terrain, buildings, roads, trees, furniture,
    labels: [lbl("Shivar Garden / Chowk", 90, -110), lbl("Kunal Icon Road", -300, -65, "road"), lbl("Govind Garden", -180, -180, "area"), lbl("Linear Garden", -40, 150, "area"), lbl("Mula River Edge", -200, 470, "area"), lbl("PCMC Metro Link", 300, -420, "road")],
    anchors: [
      { name: "Whole Frame", position: [620, 640, 620], target: [0, 0, 0] },
      { name: "Shivar Chowk", position: [260, 150, 80], target: [70, 0, -100] },
      { name: "Kunal Icon", position: [-160, 110, 90], target: [-320, 0, -70] },
      { name: "Linear Garden", position: [80, 120, 320], target: [-40, 0, 150] },
      { name: "River View", position: [-40, 70, 640], target: [-120, 0, 420] },
    ],
  };
}

export async function loadScene(): Promise<SceneData> {
  try {
    const res = await fetch("/scene.json");
    if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) {
      const d = (await res.json()) as SceneData;
      if (d?.buildings?.length && d.terrain) return d;
    }
  } catch { /* fall through */ }
  return generateScene();
}
