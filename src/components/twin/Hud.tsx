import { useState } from "react";
import { Box, Orbit, Tag, Car, Aperture, Sun, ChevronDown, Flower2, MousePointer2 } from "lucide-react";
import { useTwin } from "@/scene/store";
import { PRESETS, formatHour, lightLabel } from "@/scene/sun";
import { MONTHS, floweringNow } from "@/scene/season";
import type { SceneData } from "@/scene/types";

function Toggle({ on, onClick, icon: Icon, children }: { on: boolean; onClick: () => void; icon: typeof Box; children: React.ReactNode }) {
  return <button className="twin-chip" data-on={on} onClick={onClick} aria-pressed={on}><Icon className="h-3.5 w-3.5" />{children}</button>;
}

export function Hud({ data }: { data: SceneData }) {
  const s = useTwin();
  const [eco, setEco] = useState(true);
  const flowering = floweringNow(s.month);
  const c = data.meta.counts;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <header className="glass pointer-events-auto max-w-md rounded-2xl px-5 py-4">
          <p className="eyebrow">PCMC PUNE · 5.5 KM² · PINCODE 411027</p>
          <h1 className="font-display text-3xl leading-tight text-foreground md:text-4xl">Pimple Saudagar, <em className="text-primary">Live</em></h1>
          <p className="mt-1 text-sm text-muted-foreground">Govind Garden · Vision 9 · Linear Gardens</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-foreground/80"><span className="live-dot" />{formatHour(s.hour)} IST · {lightLabel(s.hour, s.month)} · {c.buildings} buildings · {c.trees} trees{s.traffic ? " · traffic flowing" : ""}</p>
        </header>
        <div className="glass pointer-events-auto flex flex-wrap gap-1.5 self-start rounded-2xl p-2">
          <Toggle on={s.mode === "isometric"} onClick={() => s.set({ mode: "isometric" })} icon={Box}>Isometric</Toggle>
          <Toggle on={s.mode === "orbit"} onClick={() => s.set({ mode: "orbit" })} icon={Orbit}>Orbit</Toggle>
          <span className="mx-1 w-px bg-border" />
          <Toggle on={s.labels} onClick={() => s.set({ labels: !s.labels })} icon={Tag}>Labels</Toggle>
          <Toggle on={s.traffic} onClick={() => s.set({ traffic: !s.traffic })} icon={Car}>Traffic</Toggle>
          <Toggle on={s.lens} onClick={() => s.set({ lens: !s.lens })} icon={Aperture}>Miniature</Toggle>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="glass pointer-events-auto max-w-xl rounded-2xl p-3">
          <div className="flex flex-wrap gap-1.5">
            {data.anchors.map((a) => <button key={a.name} className="twin-chip" data-on={s.flight.name === a.name} onClick={() => s.flyTo(a.name)}>{a.name}</button>)}
          </div>
          <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground"><MousePointer2 className="h-3 w-3" />Drag to rotate · Right-drag to pan · Scroll to zoom</p>
        </div>

        <div className="glass pointer-events-auto w-full rounded-2xl p-4 md:w-80">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow flex items-center gap-1.5"><Sun className="h-3 w-3" />Time of day</span>
            <span className="font-display text-2xl text-primary tabular-nums">{formatHour(s.hour)}</span>
          </div>
          <input aria-label="Time of day" type="range" className="twin-range mt-2" min={5} max={23} step={0.25} value={s.hour} onChange={(e) => s.set({ hour: +e.target.value })} />
          <div className="mt-2 grid grid-cols-4 gap-1">
            {Object.entries(PRESETS).map(([k, v]) => <button key={k} className="twin-chip justify-center px-1 text-[10px]" data-on={s.hour === v} onClick={() => s.set({ hour: v })}>{k}</button>)}
          </div>
          <button className="mt-3 flex w-full items-center justify-between border-t border-border pt-3 text-left" onClick={() => setEco(!eco)} aria-expanded={eco}>
            <span className="eyebrow flex items-center gap-1.5"><Flower2 className="h-3 w-3" />Season & Ecology</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${eco ? "rotate-180" : ""}`} />
          </button>
          {eco && <div className="mt-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Month</span><span className="text-foreground">{MONTHS[s.month - 1]}</span></div>
            <input aria-label="Month" type="range" className="twin-range mt-1" min={1} max={12} step={1} value={s.month} onChange={(e) => s.set({ month: +e.target.value })} />
            <div className="mt-2 flex flex-wrap gap-1">
              {flowering.length ? flowering.map((f) => <span key={f} className="bloom-tag">{f} in bloom</span>) : <span className="text-[11px] text-muted-foreground">No major flowering this month</span>}
            </div>
          </div>}
          <p className="mt-3 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">© OpenStreetMap contributors · heights estimated · three.js</p>
        </div>
      </div>
    </div>
  );
}
