#!/usr/bin/env python3
"""
Enrich building heights in scene.json using:
1. Overture Maps & OpenStreetMap explicit height/floor tags
2. Known landmark society height anchors
3. Footprint morphometry (area-based PCMC FSI zoning)
4. Distance to arterial transit corridors (BRTS high-rise boosting)
"""

import os
import json
import math
import random

def polygon_area(ring):
    """Compute polygon area in square meters using Shoelace formula."""
    n = len(ring)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += ring[i][0] * ring[j][1]
        area -= ring[j][0] * ring[i][1]
    return abs(area) / 2.0

def enrich_heights(scene_path=None):
    if scene_path is None:
        repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        scene_path = os.path.join(repo_dir, "public", "scene.json")

    print(f"📖 Loading {scene_path}...")
    with open(scene_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    buildings = data.get("buildings", [])
    print(f"Loaded {len(buildings)} buildings.")

    # Known Landmark & Society Anchors in Pimple Saudagar
    # Coordinates in meter space (relative to scene center [73.795, 18.596])
    LANDMARK_ANCHORS = [
        {"name": "Presidential Tower", "x": 10.0, "z": -120.0, "radius": 90.0, "h": 50.0, "cls": "residential"},
        {"name": "Vision 9 Mall", "x": -201.6, "z": 192.0, "radius": 75.0, "h": 20.0, "cls": "commercial"},
        {"name": "Spot 18 Mall", "x": -960.6, "z": 261.2, "radius": 90.0, "h": 25.0, "cls": "commercial"},
        {"name": "Vision Flora", "x": 522.7, "z": 362.6, "radius": 80.0, "h": 22.0, "cls": "commercial"},
        {"name": "Kunal Icon Society", "x": -310.0, "z": -70.0, "radius": 140.0, "h": 36.0, "cls": "residential"},
        {"name": "Roseland Residency", "x": 180.0, "z": 80.0, "radius": 160.0, "h": 34.0, "cls": "residential"},
        {"name": "Planet Millennium", "x": 420.0, "z": -80.0, "radius": 150.0, "h": 35.0, "cls": "residential"},
        {"name": "Park Royale", "x": -180.0, "z": -240.0, "radius": 120.0, "h": 38.0, "cls": "residential"},
        {"name": "SNBP School", "x": -838.5, "z": -547.9, "radius": 60.0, "h": 15.0, "cls": "institution"},
        {"name": "GK Gurukul", "x": 727.2, "z": 22.2, "radius": 60.0, "h": 16.0, "cls": "institution"},
        {"name": "P K International", "x": 197.5, "z": 116.3, "radius": 50.0, "h": 15.0, "cls": "institution"},
    ]

    random.seed(411027)

    before_heights = [b["h"] for b in buildings]
    updated_count = 0
    anchored_count = 0

    for b in buildings:
        ring = b.get("ring", [])
        if not ring:
            continue

        cx = sum(p[0] for p in ring) / len(ring)
        cz = sum(p[1] for p in ring) / len(ring)
        area = polygon_area(ring)
        old_h = b["h"]

        # Check landmark anchors
        matched_anchor = None
        for a in LANDMARK_ANCHORS:
            if math.hypot(cx - a["x"], cz - a["z"]) <= a["radius"]:
                matched_anchor = a
                break

        if matched_anchor:
            # Vary individual wings of the society slightly (e.g. ±2-4m)
            variance = (random.random() - 0.5) * 4.0
            new_h = round(matched_anchor["h"] + variance, 1)
            b["h"] = max(new_h, 12.0)
            if matched_anchor.get("cls"):
                b["cls"] = matched_anchor["cls"]
            anchored_count += 1
            updated_count += 1
            continue

        # If building already had a realistic high-rise height from explicit OSM tag (> 24m)
        if old_h >= 24.0:
            b["h"] = round(old_h, 1)
            continue

        # Footprint Morphometry (PCMC FSI Building Regulations)
        # In Pimple Saudagar:
        # - Small footprints (< 120 m²): bungalows, row houses, Gaothan village homes (G+1, G+2) -> 6.5m to 9.5m
        # - Medium footprints (120 - 320 m²): standalone apartments, clinics (G+3 to G+5) -> 12m to 18m
        # - Large footprints (320 - 800 m²): typical residential society wings (G+8 to G+11) -> 26m to 36m
        # - Very large footprints (> 800 m²): major residential towers or commercial complexes (G+12 to G+15) -> 38m to 48m
        if area < 100.0:
            floors = random.choice([2, 2, 3])
            new_h = floors * 3.2 + 0.8 + (random.random() - 0.5) * 0.8
        elif area < 250.0:
            floors = random.choice([3, 4, 4, 5])
            new_h = floors * 3.2 + 1.2 + (random.random() - 0.5) * 1.0
        elif area < 650.0:
            # Typical Pimple Saudagar society wing
            floors = random.choice([7, 8, 9, 10, 11])
            new_h = floors * 3.2 + 1.5 + (random.random() - 0.5) * 1.5
        elif area < 1200.0:
            # Prominent residential tower
            floors = random.choice([10, 11, 12, 13])
            new_h = floors * 3.2 + 1.5 + (random.random() - 0.5) * 2.0
        else:
            # Major complex / superblock
            floors = random.choice([12, 13, 14, 15])
            new_h = floors * 3.2 + 2.0 + (random.random() - 0.5) * 2.0

        # Corridor FSI Boost:
        # Buildings near the Nashik Phata - Wakad BRTS corridor (z around -150 to -50) get higher ceilings
        dist_to_brts = abs(cz - (-100.0))
        if dist_to_brts < 120.0 and area > 200.0:
            new_h = min(new_h * 1.25, 52.0)

        # Gaothan River Belt Dampening:
        # Buildings south near Mula River (z > 350) are mostly low-rise greenery and village settlements
        if cz > 380.0:
            new_h = min(new_h, 12.0)

        # Minimum clamp to prevent invisible buildings
        b["h"] = round(max(new_h, 4.5), 1)
        updated_count += 1

    # Save enriched scene.json
    with open(scene_path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))

    after_heights = [b["h"] for b in buildings]
    after_heights.sort()

    print(f"\n🎉 Successfully enriched {updated_count} buildings ({anchored_count} landmark-anchored)!")
    print(f"📊 Before: min={min(before_heights):.1f}m, median={sorted(before_heights)[len(before_heights)//2]:.1f}m, max={max(before_heights):.1f}m")
    print(f"📊 After:  min={min(after_heights):.1f}m, median={after_heights[len(after_heights)//2]:.1f}m, max={max(after_heights):.1f}m")
    
    # Print new distribution
    bins = {'4-9m': 0, '10-22m': 0, '24-38m': 0, '40-52m': 0}
    for h in after_heights:
        if h < 10: bins['4-9m'] += 1
        elif h < 24: bins['10-22m'] += 1
        elif h < 40: bins['24-38m'] += 1
        else: bins['40-52m'] += 1

    print("\n🏙️ New Skyline Distribution:")
    for k, v in bins.items():
        print(f"  • {k}: {v} buildings ({v/len(after_heights)*100:.1f}%)")

if __name__ == "__main__":
    enrich_heights()
