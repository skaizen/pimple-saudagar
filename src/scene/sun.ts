const LAT = (18.6161 * Math.PI) / 180;
const rad = Math.PI / 180;
/** Solar elevation (deg) and azimuth (rad, from south, +west) for Pune. */
export function sunPosition(hour: number, month: number) {
  const doy = Math.round((month - 0.5) * 30.4);
  const decl = 23.44 * rad * Math.sin((2 * Math.PI * (284 + doy)) / 365);
  const H = (hour - 12.4) * 15 * rad; // IST solar noon ~12:25
  const sinEl = Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(H);
  const el = Math.asin(sinEl);
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(decl) * Math.cos(LAT));
  return { elevation: el / rad, azimuth: az };
}
export function sunDirection(hour: number, month: number): [number, number, number] {
  const { elevation, azimuth } = sunPosition(hour, month);
  const el = Math.max(elevation, 4) * rad;
  return [-Math.sin(azimuth) * Math.cos(el), Math.sin(el), Math.cos(azimuth) * Math.cos(el)];
}
const sstep = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
/** 0 = full day, 1 = full night. */
export function nightFactor(hour: number, month: number) {
  return 1 - sstep(-6, 4, sunPosition(hour, month).elevation);
}
export function lightLabel(hour: number, month: number) {
  const el = sunPosition(hour, month).elevation;
  if (el < -2) return "Night";
  if (el < 12) return hour < 12 ? "Dawn light" : "Golden hour";
  return hour < 11.5 ? "Morning" : "Afternoon";
}
export const PRESETS = { Morning: 7.5, Afternoon: 14.5, "Golden Hour": 18.1, Night: 21.5 } as const;
export function formatHour(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${String(hh + (mm === 60 ? 1 : 0)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
}
