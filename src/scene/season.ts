export const SPECIES = ["gulmohar", "tabebuia", "cassia", "neem", "banyan", "ashoka"] as const;
export type Species = (typeof SPECIES)[number];
const BLOOM: Record<string, { months: number[]; color: string; label: string }> = {
  gulmohar: { months: [4, 5, 6], color: "#d8462a", label: "Gulmohar" },
  tabebuia: { months: [2, 3], color: "#e58fb4", label: "Tabebuia" },
  cassia: { months: [4, 5], color: "#e9c43a", label: "Cassia fistula" },
};
/** Canopy colour for a species in a month (1-12). */
export function canopyColor(species: string, month: number): string {
  const b = BLOOM[species];
  if (b && b.months.includes(month)) return b.color;
  if (month >= 7 && month <= 9) return "#4f7a3a"; // monsoon lush
  if (month >= 3 && month <= 5) return "#7b7f45"; // dry summer
  return "#5d7341";
}
export function floweringNow(month: number): string[] {
  return Object.values(BLOOM).filter((b) => b.months.includes(month)).map((b) => b.label);
}
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
