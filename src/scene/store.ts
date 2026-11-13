import { create } from "zustand";
import type { PoiKind, CameraFeed, TrafficCorridor } from "./types";
import { getSimulatedGoogleTraffic } from "./traffic";

export type ViewMode = "isometric" | "orbit";

interface S {
  hour: number;
  month: number;
  mode: ViewMode;
  live: boolean;
  weather: { temp: number; code: number; wind: number } | null;
  labels: boolean;
  traffic: boolean;
  cctv: boolean;
  lens: boolean;
  ready: boolean;
  places: PoiKind[];
  activeCamera: CameraFeed | null;
  trafficCorridors: Record<string, TrafficCorridor>;
  trafficSource: "google_api" | "ist_model";
  flight: { name: string; nonce: number };
  set: (p: Partial<Omit<S, "set" | "flyTo">>) => void;
  flyTo: (name: string) => void;
}

export const useTwin = create<S>((set) => ({
  hour: 14.5,
  month: 4,
  live: true,
  weather: null,
  mode: "isometric",
  labels: true,
  traffic: true,
  cctv: true,
  lens: false,
  ready: false,
  places: ["school", "temple", "mall", "construction"],
  activeCamera: null,
  trafficCorridors: getSimulatedGoogleTraffic(14.5),
  trafficSource: "ist_model",
  flight: { name: "Whole Frame", nonce: 0 },
  set: (p) => set(p),
  flyTo: (name) => set((s) => ({ flight: { name, nonce: s.flight.nonce + 1 } })),
}));
