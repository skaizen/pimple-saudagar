import { useState } from "react";
import {
  Box,
  Orbit,
  Tag,
  Car,
  Aperture,
  Sun,
  ChevronDown,
  ChevronUp,
  Flower2,
  MousePointer2,
  Layers,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useTwin } from "@/scene/store";
import { PRESETS, formatHour, lightLabel } from "@/scene/sun";
import { MONTHS, floweringNow } from "@/scene/season";
import type { SceneData, PoiKind } from "@/scene/types";

const PLACES: { k: PoiKind; label: string }[] = [
  { k: "school", label: "Schools" },
  { k: "temple", label: "Temples" },
  { k: "mall", label: "Malls" },
  { k: "construction", label: "Under construction" },
];

function Toggle({
  on,
  onClick,
  icon: Icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  icon: typeof Box;
  children: React.ReactNode;
}) {
  return (
    <button
      className="twin-chip text-xs"
      data-on={on}
      onClick={onClick}
      aria-pressed={on}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export function Hud({ data }: { data: SceneData }) {
  const s = useTwin();
  const [eco, setEco] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [mobileLayersOpen, setMobileLayersOpen] = useState(false);
  const [mobileTimeOpen, setMobileTimeOpen] = useState(false);
  const [hideAll, setHideAll] = useState(false);

  const flowering = floweringNow(s.month);
  const c = data.meta.counts;
  const w = s.weather;
  const sky = w
    ? w.code === 0
      ? "Clear"
      : w.code <= 3
      ? "Partly cloudy"
      : w.code <= 48
      ? "Hazy"
      : w.code <= 67 || (w.code >= 80 && w.code <= 82)
      ? "Rain"
      : w.code >= 95
      ? "Thunderstorm"
      : "Cloudy"
    : null;

  // Zen Mode: Minimal floating pill to restore HUD
  if (hideAll) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={() => setHideAll(false)}
          className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground shadow-lg transition-transform active:scale-95"
          title="Show controls"
        >
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span>Show UI</span>
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] md:p-6">
      {/* ── TOP BAR ── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        {/* Header: Compact on mobile, rich on desktop */}
        <header className="glass pointer-events-auto rounded-xl p-2.5 shadow-xl md:max-w-md md:rounded-2xl md:px-5 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="eyebrow text-[9px] md:text-[10px]">
                PCMC PUNE · PINCODE 411027
              </p>
              <h1 className="font-display text-lg leading-tight text-foreground md:text-3xl">
                Pimple Saudagar, <em className="text-primary">Live</em>
              </h1>
            </div>
            {/* Quick mobile buttons: stats toggle + Zen mode */}
            <div className="flex items-center gap-1 md:hidden">
              <button
                onClick={() => setShowStats(!showStats)}
                className="twin-chip px-2 py-1 text-[11px]"
                aria-label="Toggle statistics"
              >
                {showStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setHideAll(true)}
                className="twin-chip px-2 py-1 text-[11px]"
                title="Hide UI"
                aria-label="Hide UI for full map view"
              >
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Desktop subtitle */}
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            Govind Garden · Vision 9 · Linear Gardens
          </p>

          {/* Subtitle / live ticker: Collapsible on mobile, always visible on desktop */}
          <div
            className={`mt-1.5 text-xs text-foreground/85 md:mt-3 md:block ${
              showStats ? "block" : "hidden md:block"
            }`}
          >
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] md:text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                {s.live ? <span className="live-dot" /> : null}
                {formatHour(s.hour)} IST
                {s.live ? "" : " (preview)"}
              </span>
              {w ? <span>· {Math.round(w.temp)}°C {sky}</span> : null}
              <span>· {lightLabel(s.hour, s.month)}</span>
              <span>· {c.buildings} bldgs</span>
              <span>· {c.trees} trees</span>
              {s.traffic && s.trafficCorridors["brts"] ? (
                <span className="flex items-center gap-1 font-medium" style={{ color: s.trafficCorridors["brts"].color }}>
                  <span>●</span>
                  <span>Google Maps: {s.trafficCorridors["brts"].level} ({s.trafficCorridors["brts"].speedKmH} km/h)</span>
                </span>
              ) : null}
            </p>
          </div>
        </header>

        {/* ── DESKTOP CONTROLS (Hidden on mobile) ── */}
        <div className="glass pointer-events-auto hidden flex-wrap gap-1.5 self-start rounded-2xl p-2 md:flex">
          <Toggle
            on={s.mode === "isometric"}
            onClick={() => s.set({ mode: "isometric" })}
            icon={Box}
          >
            Isometric
          </Toggle>
          <Toggle
            on={s.mode === "orbit"}
            onClick={() => s.set({ mode: "orbit" })}
            icon={Orbit}
          >
            Orbit
          </Toggle>
          <span className="mx-1 w-px bg-border" />
          <Toggle
            on={s.labels}
            onClick={() => s.set({ labels: !s.labels })}
            icon={Tag}
          >
            Labels
          </Toggle>
          <Toggle
            on={s.traffic}
            onClick={() => s.set({ traffic: !s.traffic })}
            icon={Car}
          >
            Live Traffic
          </Toggle>
          <Toggle
            on={s.lens}
            onClick={() => s.set({ lens: !s.lens })}
            icon={Aperture}
          >
            Miniature
          </Toggle>
          <button
            onClick={() => setHideAll(true)}
            className="twin-chip text-xs"
            title="Clean map mode"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Hide UI
          </button>
          <span className="basis-full" />
          {PLACES.map(({ k, label }) => {
            const on = s.places.includes(k);
            const n = (data.pois ?? []).filter((p) => p.kind === k).length;
            return (
              <button
                key={k}
                className="twin-chip text-xs"
                data-on={on}
                aria-pressed={on}
                onClick={() =>
                  s.set({
                    places: on
                      ? s.places.filter((x) => x !== k)
                      : [...s.places, k],
                  })
                }
              >
                <span className="twin-poi-dot" data-kind={k} />
                {label} <span className="opacity-60">{n}</span>
              </button>
            );
          })}
        </div>

        {/* ── MOBILE FLOATING ACTION BAR (Top) ── */}
        <div className="pointer-events-auto flex items-center justify-between gap-1.5 md:hidden">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setMobileLayersOpen(!mobileLayersOpen);
                setMobileTimeOpen(false);
              }}
              className="glass twin-chip py-1.5 text-xs font-medium shadow-md"
              data-on={mobileLayersOpen}
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Layers</span>
            </button>
            <button
              onClick={() => {
                setMobileTimeOpen(!mobileTimeOpen);
                setMobileLayersOpen(false);
              }}
              className="glass twin-chip py-1.5 text-xs font-medium shadow-md"
              data-on={mobileTimeOpen}
            >
              <Sun className="h-3.5 w-3.5 text-primary" />
              <span className="tabular-nums">{formatHour(s.hour)}</span>
            </button>
          </div>
          <button
            onClick={() =>
              s.set({ mode: s.mode === "isometric" ? "orbit" : "isometric" })
            }
            className="glass twin-chip py-1.5 text-xs font-medium shadow-md"
          >
            {s.mode === "isometric" ? (
              <>
                <Box className="h-3.5 w-3.5 text-primary" />
                <span>Iso</span>
              </>
            ) : (
              <>
                <Orbit className="h-3.5 w-3.5 text-primary" />
                <span>Orbit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── MOBILE POPUP SHEETS (Layers & Time) ── */}
      {/* Mobile Layers Drawer */}
      {mobileLayersOpen && (
        <div className="glass pointer-events-auto animate-in fade-in slide-in-from-top-2 mx-auto my-auto w-full max-w-sm rounded-2xl p-4 shadow-2xl md:hidden">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="eyebrow flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Map Layers & View
            </span>
            <button
              onClick={() => setMobileLayersOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Toggle
              on={s.mode === "isometric"}
              onClick={() => s.set({ mode: "isometric" })}
              icon={Box}
            >
              Isometric
            </Toggle>
            <Toggle
              on={s.mode === "orbit"}
              onClick={() => s.set({ mode: "orbit" })}
              icon={Orbit}
            >
              Orbit
            </Toggle>
            <Toggle
              on={s.labels}
              onClick={() => s.set({ labels: !s.labels })}
              icon={Tag}
            >
              Labels
            </Toggle>
            <Toggle
              on={s.traffic}
              onClick={() => s.set({ traffic: !s.traffic })}
              icon={Car}
            >
              Traffic
            </Toggle>
            <Toggle
              on={s.lens}
              onClick={() => s.set({ lens: !s.lens })}
              icon={Aperture}
            >
              Miniature
            </Toggle>
          </div>
          <p className="eyebrow mt-3 text-[9px]">Points of Interest</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PLACES.map(({ k, label }) => {
              const on = s.places.includes(k);
              const n = (data.pois ?? []).filter((p) => p.kind === k).length;
              return (
                <button
                  key={k}
                  className="twin-chip text-xs"
                  data-on={on}
                  aria-pressed={on}
                  onClick={() =>
                    s.set({
                      places: on
                        ? s.places.filter((x) => x !== k)
                        : [...s.places, k],
                    })
                  }
                >
                  <span className="twin-poi-dot" data-kind={k} />
                  {label} <span className="opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Time & Season Drawer */}
      {mobileTimeOpen && (
        <div className="glass pointer-events-auto animate-in fade-in slide-in-from-top-2 mx-auto my-auto w-full max-w-sm rounded-2xl p-4 shadow-2xl md:hidden">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="eyebrow flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5" /> Time & Atmosphere
            </span>
            <button
              onClick={() => setMobileTimeOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Lighting</span>
            <div className="flex items-center gap-2">
              <button
                className="twin-chip px-2 py-0.5 text-[10px]"
                data-on={s.live}
                aria-pressed={s.live}
                onClick={() => s.set({ live: !s.live })}
              >
                {s.live ? <span className="live-dot" /> : null}
                Live
              </button>
              <span className="font-display text-xl text-primary tabular-nums">
                {formatHour(s.hour)}
              </span>
            </div>
          </div>
          <input
            aria-label="Time of day"
            type="range"
            className="twin-range mt-2"
            min={0}
            max={23.75}
            step={0.25}
            value={s.hour}
            onChange={(e) => s.set({ hour: +e.target.value, live: false })}
          />
          <div className="mt-2 grid grid-cols-4 gap-1">
            {Object.entries(PRESETS).map(([k, v]) => (
              <button
                key={k}
                className="twin-chip justify-center px-1 text-[10px]"
                data-on={s.hour === v}
                onClick={() => s.set({ hour: v, live: false })}
              >
                {k}
              </button>
            ))}
          </div>

          <button
            className="mt-3 flex w-full items-center justify-between border-t border-border pt-2 text-left"
            onClick={() => setEco(!eco)}
            aria-expanded={eco}
          >
            <span className="eyebrow flex items-center gap-1.5 text-[9px]">
              <Flower2 className="h-3 w-3" /> Season & Ecology
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                eco ? "rotate-180" : ""
              }`}
            />
          </button>
          {eco && (
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Month</span>
                <span className="text-foreground">{MONTHS[s.month - 1]}</span>
              </div>
              <input
                aria-label="Month"
                type="range"
                className="twin-range mt-1"
                min={1}
                max={12}
                step={1}
                value={s.month}
                onChange={(e) => s.set({ month: +e.target.value, live: false })}
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {flowering.length ? (
                  flowering.map((f) => (
                    <span key={f} className="bloom-tag text-[10px]">
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    No active bloom
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        {/* Landmarks: Single horizontal swipeable strip on mobile, wrapped card on desktop */}
        <div className="glass pointer-events-auto rounded-xl p-2 shadow-xl md:max-w-xl md:rounded-2xl md:p-3">
          <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-none md:flex-wrap">
            {data.anchors.map((a) => (
              <button
                key={a.name}
                className="twin-chip flex-none text-xs"
                data-on={s.flight.name === a.name}
                onClick={() => s.flyTo(a.name)}
              >
                {a.name}
              </button>
            ))}
          </div>
          <p className="mt-2 hidden items-center gap-1.5 px-1 text-[11px] text-muted-foreground md:flex">
            <MousePointer2 className="h-3 w-3" />
            Drag to move map · Right-drag to rotate · Arrow keys pan · Scroll to zoom
          </p>
        </div>

        {/* Desktop Time of day panel (Hidden on mobile) */}
        <div className="glass pointer-events-auto hidden w-full rounded-2xl p-4 shadow-xl md:block md:w-80">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow flex items-center gap-1.5">
              <Sun className="h-3 w-3" /> Time of day
            </span>
            <span className="flex items-baseline gap-2">
              <button
                className="twin-chip px-2 text-[10px]"
                data-on={s.live}
                aria-pressed={s.live}
                onClick={() => s.set({ live: !s.live })}
              >
                {s.live ? <span className="live-dot" /> : null}
                Live
              </button>
              <span className="font-display text-2xl text-primary tabular-nums">
                {formatHour(s.hour)}
              </span>
            </span>
          </div>
          <input
            aria-label="Time of day"
            type="range"
            className="twin-range mt-2"
            min={0}
            max={23.75}
            step={0.25}
            value={s.hour}
            onChange={(e) => s.set({ hour: +e.target.value, live: false })}
          />
          <div className="mt-2 grid grid-cols-4 gap-1">
            {Object.entries(PRESETS).map(([k, v]) => (
              <button
                key={k}
                className="twin-chip justify-center px-1 text-[10px]"
                data-on={s.hour === v}
                onClick={() => s.set({ hour: v, live: false })}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            className="mt-3 flex w-full items-center justify-between border-t border-border pt-3 text-left"
            onClick={() => setEco(!eco)}
            aria-expanded={eco}
          >
            <span className="eyebrow flex items-center gap-1.5">
              <Flower2 className="h-3 w-3" /> Season & Ecology
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                eco ? "rotate-180" : ""
              }`}
            />
          </button>
          {eco && (
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Month</span>
                <span className="text-foreground">{MONTHS[s.month - 1]}</span>
              </div>
              <input
                aria-label="Month"
                type="range"
                className="twin-range mt-1"
                min={1}
                max={12}
                step={1}
                value={s.month}
                onChange={(e) => s.set({ month: +e.target.value, live: false })}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {flowering.length ? (
                  flowering.map((f) => (
                    <span key={f} className="bloom-tag">
                      {f} in bloom
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    No major flowering this month
                  </span>
                )}
              </div>
            </div>
          )}
          <p className="mt-3 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
            © OpenStreetMap · Overture Maps · heights estimated · three.js
          </p>
        </div>
      </div>
    </div>
  );
}
