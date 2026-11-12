<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Architecture
- 3D twin: pure logic (sun, season, terrain, mock generator) in `src/scene/` with no React/three imports so it stays unit-testable; three.js drawing lives in `src/components/twin/`.
- Scene data comes from `/scene.json` if present, else the seeded generator — keep both on the `SceneData` type so real data drops in.
- Per-frame values (traffic, night factor, camera tween) live in refs; zustand holds only UI state.
- `noUncheckedIndexedAccess` is off: the 3D geometry code indexes point arrays heavily and bounds are guaranteed by loops.
- Real map data: `public/scene.json` is generated from an OpenStreetMap extract by `scripts/osm_to_scene.py`; rerun it to refresh, keep OSM attribution in the HUD.
- Overture Maps buildings/places are merged on top of the OSM scene by `scripts/overture_merge.py` (run after `osm_to_scene.py`; fetch via duckdb from `s3://overturemaps-us-west-2/release/<latest>/`) — OSM wins where footprints overlap because it carries names, levels and bridge data.
- Place markers (schools, temples, malls, construction) live in `scene.json` `pois`, added by `scripts/osm_pois.py` then `scripts/overture_pois.py` (run after the merge) — markers stay optional on `SceneData` so the generator still type-checks.
- Defence-area tree cover: `scripts/military_trees.py` fills the OSM landuse=military polygon with trees (run last in the pipeline).
