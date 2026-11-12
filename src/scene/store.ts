import { create } from "zustand";
export type ViewMode = "isometric" | "orbit";
interface S {
  hour: number; month: number; mode: ViewMode;
  labels: boolean; traffic: boolean; lens: boolean; ready: boolean;
  flight: { name: string; nonce: number };
  set: (p: Partial<Omit<S, "set" | "flyTo">>) => void;
  flyTo: (name: string) => void;
}
export const useTwin = create<S>((set) => ({
  hour: 14.5, month: 4, mode: "isometric", labels: true, traffic: true, lens: false, ready: false,
  flight: { name: "Whole Frame", nonce: 0 },
  set: (p) => set(p),
  flyTo: (name) => set((s) => ({ flight: { name, nonce: s.flight.nonce + 1 } })),
}));
