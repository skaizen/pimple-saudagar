export type XZ = [number, number];
export type BuildingClass = "residential" | "commercial" | "institution";
export interface Building { id: string; h: number; ring: XZ[]; cls: BuildingClass }
export interface Road { points: XZ[]; width: number; type: string; name?: string; /** flyover deck level (OSM layer) */ bridge?: number; /** underpass below grade */ tunnel?: boolean }
export interface Tree { x: number; z: number; y: number; species: string; height: number; radius: number }
export interface Furniture { type: "lamp"; x: number; z: number; y: number }
export interface Label { name: string; x: number; z: number; y: number; type: "landmark" | "road" | "area" }
export interface Anchor { name: string; position: [number, number, number]; target: [number, number, number] }
export interface SceneData {
  meta: { center_lon_lat: [number, number]; area_m2: number; counts: { buildings: number; trees: number; roads: number; lamps: number } };
  terrain: { cols: number; rows: number; step: number; values: number[] };
  buildings: Building[];
  roads: Road[];
  trees: Tree[];
  furniture: Furniture[];
  labels: Label[];
  anchors: Anchor[];
}
