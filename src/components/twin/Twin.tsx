import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { World } from "./World";
import { Hud } from "./Hud";
import { loadScene } from "@/scene/generate";
import type { SceneData } from "@/scene/types";
import { useTwin } from "@/scene/store";
import { istNow } from "@/scene/sun";

export function Twin() {
  const [data, setData] = useState<SceneData | null>(null);
  const ready = useTwin((s) => s.ready), lens = useTwin((s) => s.lens);
  const [gone, setGone] = useState(false);
  useEffect(() => { loadScene().then(setData); }, []);
  const live = useTwin((s) => s.live);
  useEffect(() => {
    if (!live) return undefined;
    const tick = () => useTwin.getState().set(istNow());
    tick(); const id = setInterval(tick, 30000); return () => clearInterval(id);
  }, [live]);
  useEffect(() => {
    const load = () => fetch("https://api.open-meteo.com/v1/forecast?latitude=18.596&longitude=73.795&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FKolkata")
      .then((r) => r.json()).then((j) => { const c = j?.current; if (c) useTwin.getState().set({ weather: { temp: c.temperature_2m, code: c.weather_code, wind: c.wind_speed_10m } }); }).catch(() => {});
    load(); const id = setInterval(load, 600000); return () => clearInterval(id);
  }, []);
  useEffect(() => { if (ready) { const t = setTimeout(() => setGone(true), 900); return () => clearTimeout(t); } return undefined; }, [ready]);
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background" data-scene-ready={ready ? "" : undefined}>
      {data && <Canvas shadows dpr={[1, 1.75]} camera={{ position: [1250, 1250, 1250], fov: 30, near: 1, far: 7000 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <Suspense fallback={null}><World data={data} /></Suspense>
      </Canvas>}
      <div className="lens-vignette" data-on={lens} aria-hidden />
      {data && <Hud data={data} />}
      {!gone && <div className="loader" data-done={ready}>
        <div className="text-center">
          <p className="eyebrow">PCMC PUNE · 411027</p>
          <h2 className="font-display mt-2 text-4xl text-foreground">Pimple Saudagar, <em className="text-primary">Live</em></h2>
          <div className="loader-bar mx-auto mt-6"><span /></div>
          <p className="mt-4 text-sm text-muted-foreground">Raising buildings and trees across Pimple Saudagar...</p>
        </div>
      </div>}
    </main>
  );
}
