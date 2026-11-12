import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, MapControls, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneData, XZ } from "@/scene/types";
import { sampleTerrain, roadLift } from "@/scene/terrain";
import { sunDirection, nightFactor, sunPosition } from "@/scene/sun";
import { canopyColor } from "@/scene/season";
import { useTwin } from "@/scene/store";

const C = (h: string) => new THREE.Color(h);

function canvasTex(draw: (g: CanvasRenderingContext2D, s: number) => void, s = 256) {
  const c = document.createElement("canvas"); c.width = c.height = s;
  draw(c.getContext("2d")!, s);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function Terrain({ data }: { data: SceneData }) {
  const { geo, tex } = useMemo(() => {
    const t = data.terrain, W = (t.cols - 1) * t.step, D = (t.rows - 1) * t.step;
    const g = new THREE.PlaneGeometry(W, D, 160, 160); g.rotateX(-Math.PI / 2);
    const p = g.getAttribute("position");
    for (let i = 0; i < p.count; i++) p.setY(i, sampleTerrain(t, p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const tex = canvasTex((c, s) => {
      c.fillStyle = "#5b5a4c"; c.fillRect(0, 0, s, s);
      for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(${90 + Math.random() * 40},${88 + Math.random() * 30},70,0.25)`; c.fillRect(Math.random() * s, Math.random() * s, 3, 3); }
      c.strokeStyle = "rgba(230,184,114,0.10)"; c.lineWidth = 2; c.strokeRect(0, 0, s, s);
    });
    tex.repeat.set(W / 64, D / 64);
    return { geo: g, tex };
  }, [data]);
  return <mesh geometry={geo} receiveShadow><meshStandardMaterial map={tex} roughness={0.95} /></mesh>;
}

function Buildings({ data, night }: { data: SceneData; night: React.MutableRefObject<number> }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const { geo, edges, win } = useMemo(() => {
    const tint: Record<string, string> = { residential: "#c9bfae", commercial: "#b7ab98", institution: "#a9b0a4" };
    const parts = data.buildings.map((b) => {
      const shape = new THREE.Shape(b.ring.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      const cx = b.ring.reduce((a, p) => a + p[0], 0) / b.ring.length, cz = b.ring.reduce((a, p) => a + p[1], 0) / b.ring.length;
      g.translate(0, sampleTerrain(data.terrain, cx, cz) - 1, 0);
      const col = C(tint[b.cls]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06);
      const n = g.getAttribute("position").count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.toArray(arr, i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
      return g.index ? g.toNonIndexed() : g;
    });
    const geo = mergeGeometries(parts)!;
    const edges = new THREE.EdgesGeometry(geo, 25);
    const win = canvasTex((c, s) => {
      c.fillStyle = "#000"; c.fillRect(0, 0, s, s);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (Math.random() < 0.55) { c.fillStyle = `rgba(255,${190 + Math.random() * 40},120,${0.6 + Math.random() * 0.4})`; c.fillRect(x * 32 + 8, y * 32 + 10, 16, 14); }
    });
    win.repeat.set(1 / 24, 1 / 25);
    return { geo, edges, win };
  }, [data]);
  useFrame(() => { if (mat.current) mat.current.emissiveIntensity = night.current * 1.4; });
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial ref={mat} vertexColors roughness={0.85} emissive="#ffc27a" emissiveMap={win} emissiveIntensity={0} />
      </mesh>
      <lineSegments geometry={edges}><lineBasicMaterial color="#e6b872" transparent opacity={0.18} /></lineSegments>
    </group>
  );
}

function ribbon(pts: XZ[], width: number, data: SceneData, lift: number, flat?: number, road?: SceneData["roads"][number]) {
  const pos: number[] = [], idx: number[] = [];
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  pts.forEach(([x, z], i) => {
    const extra = road ? roadLift(road, cum[i], len) : 0;
    const [px, pz] = pts[Math.max(i - 1, 0)], [nx, nz] = pts[Math.min(i + 1, pts.length - 1)];
    const dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1, ox = (-dz / l) * width / 2, oz = (dx / l) * width / 2;
    for (const s of [-1, 1]) { const X = x + ox * s, Z = z + oz * s; pos.push(X, (flat ?? sampleTerrain(data.terrain, X, Z) + lift) + extra, Z); }
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function Roads({ data }: { data: SceneData }) {
  // One merged mesh per road kind keeps draw calls low over 1000+ OSM ways.
  const items = useMemo(() => {
    const kind = (r: SceneData["roads"][number]) => r.bridge ? "flyover" : r.tunnel ? "underpass" : r.type;
    const groups: Record<string, THREE.BufferGeometry[]> = {};
    const piers: THREE.Matrix4[] = [];
    for (const r of data.roads) {
      const lift = r.type === "rail" ? 0.8 : r.bridge ? 0.6 : r.type === "secondary" ? 0.3 : 0.4;
      (groups[kind(r)] ??= []).push(ribbon(r.points, r.width, data, lift, undefined, r).toNonIndexed());
      if (r.bridge) {
        let acc = 0, len = 0; for (let i = 1; i < r.points.length; i++) len += Math.hypot(r.points[i][0] - r.points[i - 1][0], r.points[i][1] - r.points[i - 1][1]);
        for (let i = 1; i < r.points.length; i++) {
          const [ax, az] = r.points[i - 1], [bx, bz] = r.points[i], l = Math.hypot(bx - ax, bz - az);
          for (let t = 12; t < l; t += 24) {
            const x = ax + ((bx - ax) * t) / l, z = az + ((bz - az) * t) / l, h = roadLift(r, acc + t, len);
            if (h > 3) piers.push(new THREE.Matrix4().makeScale(2.2, h, 2.2).setPosition(x, sampleTerrain(data.terrain, x, z) + h / 2, z));
          }
          acc += l;
        }
      }
    }
    return { merged: Object.entries(groups).map(([k, gs]) => ({ k, g: mergeGeometries(gs)! })), piers };
  }, [data]);
  const pierRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const m = pierRef.current; if (!m) return; items.piers.forEach((p, i) => m.setMatrixAt(i, p)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }, [items]);
  const col: Record<string, string> = { primary: "#2b2f2e", secondary: "#353936", rail: "#6d5a44", river: "#2e4a52", flyover: "#4a4c48", underpass: "#161918" };
  return <group>{items.merged.map(({ k, g }) => (
    <mesh key={k} geometry={g} receiveShadow castShadow={k === "flyover"} position-y={k === "river" ? -0.2 : 0}>
      <meshStandardMaterial color={col[k] ?? "#333"} roughness={k === "river" ? 0.15 : 0.9} metalness={k === "river" ? 0.4 : 0} side={THREE.DoubleSide} />
    </mesh>))}
    {items.piers.length > 0 && <instancedMesh ref={pierRef} args={[undefined, undefined, items.piers.length]} castShadow><boxGeometry /><meshStandardMaterial color="#8c867a" roughness={0.9} /></instancedMesh>}
  </group>;
}

function Traffic({ data }: { data: SceneData }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const visible = useTwin((s) => s.traffic);
  const sim = useMemo(() => {
    const paths = data.roads.filter((r) => r.type === "primary" || r.type === "secondary").map((r) => {
      const cum = [0]; for (let i = 1; i < r.points.length; i++) cum.push(cum[i - 1] + Math.hypot(r.points[i][0] - r.points[i - 1][0], r.points[i][1] - r.points[i - 1][1]));
      return { r, cum, len: cum[cum.length - 1] };
    });
    const cars = Array.from({ length: 360 }, (_, i) => ({ p: paths[i % paths.length], t: Math.random(), dir: i % 2 ? 1 : -1, v: 9 + Math.random() * 6 }));
    return cars;
  }, [data]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); const mesh = ref.current; if (!mesh) return;
    sim.forEach((c, i) => {
      c.t = (c.t + (c.dir * c.v * dt) / c.p.len + 1) % 1;
      const d = c.t * c.p.len, cum = c.p.cum; let k = 1; while (k < cum.length - 1 && cum[k] < d) k++;
      const a = c.p.r.points[k - 1], b = c.p.r.points[k], s = (d - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, off = c.dir * c.p.r.width * 0.22;
      const x = a[0] + dx * s - (dz / l) * off, z = a[1] + dz * s + (dx / l) * off;
      m.makeTranslation(x, sampleTerrain(data.terrain, x, z) + 1.6 + roadLift(c.p.r, d, c.p.len), z); mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, sim.length]} visible={visible} frustumCulled={false}>
    <sphereGeometry args={[1.4, 8, 6]} /><meshBasicMaterial color="#ffd89a" toneMapped={false} />
  </instancedMesh>;
}

function Trees({ data }: { data: SceneData }) {
  const month = useTwin((s) => s.month);
  const round = useRef<THREE.InstancedMesh>(null), cone = useRef<THREE.InstancedMesh>(null), trunk = useRef<THREE.InstancedMesh>(null);
  const groups = useMemo(() => ({ round: data.trees.filter((t) => t.species !== "ashoka"), cone: data.trees.filter((t) => t.species === "ashoka") }), [data]);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    groups.round.forEach((t, i) => { m.compose(v.set(t.x, t.y + t.height * 0.65, t.z), q, s.set(t.radius, t.radius * 0.85, t.radius)); round.current!.setMatrixAt(i, m); });
    groups.cone.forEach((t, i) => { m.compose(v.set(t.x, t.y + t.height * 0.55, t.z), q, s.set(t.radius * 0.6, t.height, t.radius * 0.6)); cone.current!.setMatrixAt(i, m); });
    data.trees.forEach((t, i) => { m.compose(v.set(t.x, t.y + t.height * 0.25, t.z), q, s.set(0.4, t.height * 0.5, 0.4)); trunk.current!.setMatrixAt(i, m); });
    [round, cone, trunk].forEach((r) => { r.current!.instanceMatrix.needsUpdate = true; r.current!.computeBoundingSphere(); });
  }, [groups, data]);
  useEffect(() => {
    const c = new THREE.Color();
    groups.round.forEach((t, i) => round.current!.setColorAt(i, c.set(canopyColor(t.species, month)).offsetHSL(0, 0, (i % 7) * 0.008)));
    groups.cone.forEach((t, i) => cone.current!.setColorAt(i, c.set(canopyColor(t.species, month))));
    [round, cone].forEach((r) => { if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true; });
  }, [month, groups]);
  return <group>
    <instancedMesh ref={round} args={[undefined, undefined, groups.round.length]} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial roughness={0.9} flatShading /></instancedMesh>
    <instancedMesh ref={cone} args={[undefined, undefined, Math.max(groups.cone.length, 1)]} castShadow><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial roughness={0.9} flatShading /></instancedMesh>
    <instancedMesh ref={trunk} args={[undefined, undefined, data.trees.length]}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#4a3b2d" /></instancedMesh>
  </group>;
}

function Lamps({ data, night }: { data: SceneData; night: React.MutableRefObject<number> }) {
  const pole = useRef<THREE.InstancedMesh>(null), bulb = useRef<THREE.InstancedMesh>(null), bm = useRef<THREE.MeshBasicMaterial>(null);
  const lamps = data.furniture.filter((f) => f.type === "lamp");
  useEffect(() => {
    const m = new THREE.Matrix4();
    lamps.forEach((l, i) => { m.makeScale(0.25, 7, 0.25).setPosition(l.x, l.y + 3.5, l.z); pole.current!.setMatrixAt(i, m); m.makeTranslation(l.x, l.y + 7.2, l.z); bulb.current!.setMatrixAt(i, m); });
    pole.current!.instanceMatrix.needsUpdate = bulb.current!.instanceMatrix.needsUpdate = true;
    pole.current!.computeBoundingSphere(); bulb.current!.computeBoundingSphere();
  }, [lamps]);
  useFrame(() => { if (bm.current) bm.current.color.setRGB(0.25 + night.current * 2.2, 0.22 + night.current * 1.6, 0.18 + night.current * 0.8); });
  return <group>
    <instancedMesh ref={pole} args={[undefined, undefined, lamps.length]}><boxGeometry /><meshStandardMaterial color="#2a2c2b" /></instancedMesh>
    <instancedMesh ref={bulb} args={[undefined, undefined, lamps.length]}><sphereGeometry args={[0.9, 8, 6]} /><meshBasicMaterial ref={bm} toneMapped={false} /></instancedMesh>
  </group>;
}

function Labels({ data }: { data: SceneData }) {
  const on = useTwin((s) => s.labels);
  if (!on) return null;
  return <>{data.labels.map((l) => (
    <Html key={l.name} position={[l.x, l.y, l.z]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className="twin-label" data-type={l.type}><span className="twin-label-dot" />{l.name}</div>
    </Html>))}</>;
}

function Lighting({ night }: { night: React.MutableRefObject<number> }) {
  const sun = useRef<THREE.DirectionalLight>(null), amb = useRef<THREE.HemisphereLight>(null);
  const { scene } = useThree();
  const tmp = useMemo(() => ({ day: C("#a9b8b2"), dawn: C("#d59a6a"), nightC: C("#11181b"), c: new THREE.Color(), warm: C("#ffb978"), white: C("#fff4e2") }), []);
  useEffect(() => { scene.background = new THREE.Color(); scene.fog = new THREE.Fog("#000", 1500, 3800); }, [scene]);
  useFrame(() => {
    const { hour, month } = useTwin.getState();
    const [x, y, z] = sunDirection(hour, month), el = sunPosition(hour, month).elevation;
    const nf = nightFactor(hour, month); night.current = nf;
    const low = Math.max(0, 1 - Math.abs(el - 6) / 18);
    tmp.c.copy(tmp.day).lerp(tmp.dawn, low * 0.7).lerp(tmp.nightC, nf);
    (scene.background as THREE.Color).copy(tmp.c); (scene.fog as THREE.Fog).color.copy(tmp.c);
    if (sun.current) { sun.current.position.set(x * 1500, y * 1500, z * 1500); sun.current.intensity = (1 - nf) * 2.6; sun.current.color.copy(tmp.white).lerp(tmp.warm, low); }
    if (amb.current) amb.current.intensity = 0.35 + (1 - nf) * 0.7;
  });
  return <>
    <hemisphereLight ref={amb} args={["#cfd8d2", "#3a332a", 0.8]} />
    <directionalLight ref={sun} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
      shadow-camera-left={-1300} shadow-camera-right={1300} shadow-camera-top={1300} shadow-camera-bottom={-1300} shadow-camera-far={3000} />
    <Environment resolution={64}>
      <Lightformer intensity={1.2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
      <Lightformer intensity={0.6} color="#e6b872" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
    </Environment>
  </>;
}

function CameraRig({ data }: { data: SceneData }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  const flight = useTwin((s) => s.flight), mode = useTwin((s) => s.mode);
  const goal = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3; fov: number; active: boolean }>({ pos: new THREE.Vector3(1250, 1250, 1250), tgt: new THREE.Vector3(), fov: 30, active: true });
  useEffect(() => {
    const a = data.anchors.find((x) => x.name === flight.name) ?? data.anchors[0];
    const pos = new THREE.Vector3(...a.position), tgt = new THREE.Vector3(...a.target);
    if (mode === "orbit" && a.name === data.anchors[0].name) pos.set(760, 520, 880);
    goal.current = { pos, tgt, fov: mode === "isometric" ? 30 : 45, active: true };
  }, [flight, mode, data]);
  useFrame((_, dt) => {
    const g = goal.current; if (!g.active || !controls) return;
    const k = 1 - Math.exp(-3 * Math.min(dt, 0.1));
    camera.position.lerp(g.pos, k); controls.target.lerp(g.tgt, k);
    camera.fov += (g.fov - camera.fov) * k; camera.updateProjectionMatrix(); controls.update();
    if (camera.position.distanceTo(g.pos) < 0.5) g.active = false;
  });
  return <MapControls makeDefault keyEvents keyPanSpeed={40} screenSpacePanning={false} enableDamping dampingFactor={0.08} maxPolarAngle={mode === "isometric" ? 1.0 : 1.45} minPolarAngle={mode === "isometric" ? 0.7 : 0.1} minDistance={60} maxDistance={2800} onStart={() => (goal.current.active = false)} />;
}

function Ready() {
  const set = useTwin((s) => s.set); const n = useRef(0);
  useFrame(() => { if (++n.current === 3) set({ ready: true }); });
  return null;
}

export function World({ data }: { data: SceneData }) {
  const night = useRef(0);
  return <>
    <Lighting night={night} />
    <Terrain data={data} />
    <Roads data={data} />
    <Buildings data={data} night={night} />
    <Trees data={data} />
    <Lamps data={data} night={night} />
    <Traffic data={data} />
    <Labels data={data} />
    <CameraRig data={data} />
    <Ready />
  </>;
}
