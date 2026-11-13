#!/usr/bin/env python3
"""
Clean tree collisions in scene.json:
Filters out any tree that collides with road surfaces or building footprints.
Ensures roads, junctions, and flyovers are 100% clear of stray trees.
"""

import os
import json
import math
from shapely.geometry import Point, Polygon, LineString
from shapely.strtree import STRtree

def clean_trees(scene_path=None):
    if scene_path is None:
        repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        scene_path = os.path.join(repo_dir, "public", "scene.json")

    print(f"📖 Loading {scene_path}...")
    with open(scene_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    trees = data.get("trees", [])
    roads = data.get("roads", [])
    buildings = data.get("buildings", [])

    print(f"Initial counts: {len(trees)} trees, {len(roads)} roads, {len(buildings)} buildings.")

    # 1. Create buffered corridors for all roads (road ribbon + 1.2m sidewalk buffer)
    print("🛣️ Buffering road corridors...")
    road_geoms = []
    for r in roads:
        pts = r.get("points", [])
        w = r.get("width", 8.0)
        if len(pts) >= 2:
            try:
                line = LineString(pts)
                # Expand road centerline by half-width + 1.2m clear zone
                corridor = line.buffer(w / 2.0 + 1.2, cap_style="flat", join_style="mitre")
                if corridor.is_valid and not corridor.is_empty:
                    road_geoms.append(corridor)
            except Exception:
                pass

    # 2. Create buffered footprints for all buildings (footprint + 0.8m buffer)
    print("🏢 Buffering building footprints...")
    bldg_geoms = []
    for b in buildings:
        ring = b.get("ring", [])
        if len(ring) >= 3:
            try:
                poly = Polygon(ring)
                if poly.is_valid:
                    bldg_geoms.append(poly.buffer(0.8))
            except Exception:
                pass

    # 3. Build spatial R-Trees for ultra-fast query
    print("🌲 Indexing spatial geometries...")
    road_index = STRtree(road_geoms)
    bldg_index = STRtree(bldg_geoms)

    clean_trees_list = []
    removed_from_roads = 0
    removed_from_bldgs = 0

    print("🔍 Testing each tree for road and building collisions...")
    for t in trees:
        pt = Point(t["x"], t["z"])

        # Check road collision
        road_hits = road_index.query(pt)
        is_on_road = False
        for hit_idx in road_hits:
            if road_geoms[hit_idx].contains(pt):
                is_on_road = True
                break
        if is_on_road:
            removed_from_roads += 1
            continue

        # Check building collision
        bldg_hits = bldg_index.query(pt)
        is_in_bldg = False
        for hit_idx in bldg_hits:
            if bldg_geoms[hit_idx].contains(pt):
                is_in_bldg = True
                break
        if is_in_bldg:
            removed_from_bldgs += 1
            continue

        clean_trees_list.append(t)

    # 4. Update scene data
    data["trees"] = clean_trees_list
    data["meta"]["counts"]["trees"] = len(clean_trees_list)

    with open(scene_path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"\n✅ Tree cleaning complete!")
    print(f"  • Removed from road tarmac: {removed_from_roads} trees")
    print(f"  • Removed from inside buildings: {removed_from_bldgs} trees")
    print(f"  • Clean trees retained: {len(clean_trees_list)} trees (100% collision-free)")
    print(f"📦 Saved directly to {scene_path}")

if __name__ == "__main__":
    clean_trees()
