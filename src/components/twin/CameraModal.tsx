import { useState, useEffect } from "react";
import { X, Video, RefreshCw, Radio, ExternalLink, ShieldAlert, Sliders } from "lucide-react";
import { useTwin } from "@/scene/store";
import { CAMERA_FEEDS } from "@/scene/cameras";
import type { CameraFeed } from "@/scene/types";
import { formatHour } from "@/scene/sun";

export function CameraModal() {
  const { activeCamera, set, trafficCorridors, hour } = useTwin();
  const [customUrl, setCustomUrl] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!activeCamera) return null;

  const timeStr = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
  const dateStr = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric", month: "short", day: "numeric" });

  // Associated corridor traffic info
  const corridor = activeCamera.id === "cam-01" || activeCamera.id === "cam-02"
    ? trafficCorridors["brts"]
    : activeCamera.id === "cam-03"
    ? trafficCorridors["kunal"]
    : activeCamera.id === "cam-04"
    ? trafficCorridors["shivar"]
    : trafficCorridors["rahatani"];

  const currentStream = useCustom && customUrl.trim() ? customUrl.trim() : activeCamera.streamUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass pointer-events-auto relative w-full max-w-2xl overflow-hidden rounded-2xl border border-primary/30 bg-[#121615]/95 shadow-2xl">
        {/* Top Surveillance Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-black/40 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-red-600" />
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider text-red-400">
              LIVE CCTV FEED
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs text-primary">{activeCamera.id.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
              {dateStr} {timeStr} IST
            </span>
            <button
              onClick={() => set({ activeCamera: null })}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Close camera feed"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video Canvas Container */}
        <div className="relative aspect-video w-full bg-black">
          {/* Scanline CRT overlay */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(18,22,21,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />

          {/* OSD (On Screen Display) Overlay */}
          <div className="pointer-events-none absolute left-3 top-3 z-20 font-mono text-[10px] text-white/80">
            <p className="font-bold tracking-wide text-primary">{activeCamera.junction.toUpperCase()}</p>
            <p>CAM-ID: {activeCamera.id.toUpperCase()} | FPS: {activeCamera.fps ?? 30}</p>
            <p>REC [●] {timeStr}</p>
          </div>

          {corridor && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-20 font-mono text-[10px]">
              <span
                className="inline-flex items-center gap-1.5 rounded bg-black/70 px-2 py-1 font-semibold"
                style={{ color: corridor.color }}
              >
                <span>●</span>
                <span>{corridor.name}: {corridor.speedKmH} km/h ({corridor.level.toUpperCase()})</span>
              </span>
            </div>
          )}

          {/* Video Player */}
          {activeCamera.youtubeId && !useCustom ? (
            <iframe
              className="h-full w-full border-0"
              src={`https://www.youtube-nocookie.com/embed/${activeCamera.youtubeId}?autoplay=1&mute=1&controls=0&loop=1`}
              title={activeCamera.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <Radio className="mb-2 h-8 w-8 text-primary animate-pulse" />
              <p className="font-mono text-sm text-foreground">Secure Video Stream Connected</p>
              <p className="mt-1 max-w-sm font-mono text-[11px] text-muted-foreground">
                Municipal CCTV feed routed via PCMC Traffic ICCC Command Center.
              </p>
            </div>
          )}
        </div>

        {/* Camera Station Selector Tabs */}
        <div className="border-t border-border/60 bg-black/20 p-3">
          <p className="eyebrow mb-2 text-[9px]">Select Junction Camera</p>
          <div className="flex flex-wrap gap-1.5">
            {CAMERA_FEEDS.map((cam) => (
              <button
                key={cam.id}
                onClick={() => set({ activeCamera: cam })}
                className={`twin-chip text-xs ${
                  activeCamera.id === cam.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "glass hover:text-foreground"
                }`}
              >
                <Video className="h-3 w-3" />
                <span>{cam.name.replace(/CAM \d+ · /, "")}</span>
              </button>
            ))}
          </div>

          {/* Custom Stream Input for user's own IP cameras */}
          <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-2.5">
            <input
              type="text"
              placeholder="Paste custom RTSP / HLS / YouTube URL to link your own camera..."
              className="flex-1 rounded-lg border border-border/60 bg-black/40 px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            <button
              onClick={() => setUseCustom(Boolean(customUrl.trim()))}
              className="twin-chip flex-none text-xs"
              data-on={useCustom}
            >
              {useCustom ? "Active" : "Connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
