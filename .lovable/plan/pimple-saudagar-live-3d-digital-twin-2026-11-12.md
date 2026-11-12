# Pimple Saudagar, Live — 3D digital twin

Build the full brief as a single-page 3D map at `/`.

## What you'll see
- Loading screen ("Raising buildings and trees across Pimple Saudagar...") fading into the 3D scene.
- ~1 km² procedural neighbourhood: terrain, ~150 extruded buildings, roads with moving traffic dots, instanced trees, street lamps, six landmark labels.
- Time-of-day slider (05:00–23:00, default 14:30) + Morning / Afternoon / Golden Hour / Night presets; night lights lamps and windows.
- Month slider: sun height changes, Gulmohar / Tabebuia / Cassia bloom colours, flowering tags.
- Isometric / Orbit toggle, landmark chips with smooth camera flights, Labels / Traffic / Miniature lens toggles.
- Dark luxury cartography theme (#15191a, #f3ead8, #e6b872, glass panels), HUD layout as specified, data credit badge.

## Data
App fetches `/scene.json`; if missing, a seeded procedural generator builds the same shape so it works immediately. Drop a real `scene.json` in later to replace it.

## Technical details
- three + @react-three/fiber@9 + drei@10, route `ssr: false`.
- `src/scene/types.ts` (schema), `generate.ts` (seeded mock), `sun.ts` / `season.ts` (pure logic), components: Terrain, Buildings (merged extrusions + edges), Roads (ribbons), Traffic (instanced, ref-driven), Trees (InstancedMesh), Lamps (emissive instances + a few point lights), Labels (drei Html), CameraRig (tweened target/position, OrbitControls damping), Vignette/tilt-shift via CSS overlay.
- HUD in React with zustand store for UI state only; per-frame state in refs.
- Fonts: serif display + clean sans via <link>. Tokens in styles.css.
- Verify with screenshots; vitest for sun/season logic.
