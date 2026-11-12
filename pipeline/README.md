# 🗺️ 3D Digital Twin Data Pipeline

This Python pipeline queries the live **OpenStreetMap (OSM) API** and bakes production-grade `scene.json` files for the 3D WebGL viewer.

---

## 🚀 Quick Start

No dependencies or virtual environments needed — runs on standard **Python 3.8+**.

### 1. Bake Pimple Saudagar (Default):
```bash
python3 pipeline/build_scene.py
```
This generates `public/scene.json` centered at `18.596° N, 73.795° E` (Pimple Saudagar, PCMC Pune).

---

### 2. Bake for ANY Indian Pincode / Neighborhood:
Pass `--lat`, `--lon`, and `--size` (in km):

```bash
# Example: Indiranagar, Bengaluru
python3 pipeline/build_scene.py --lat 12.9786 --lon 77.6401 --size 1.2 --out public/scene.json

# Example: Bandra West, Mumbai
python3 pipeline/build_scene.py --lat 19.0596 --lon 72.8295 --size 1.5 --out public/scene.json

# Example: Connaught Place, New Delhi
python3 pipeline/build_scene.py --lat 28.6315 --lon 77.2167 --size 1.5 --out public/scene.json
```

---

## 📦 What the Pipeline Generates:
- **Buildings**: Real polygonal footprint rings, height estimation from OSM levels, classifications (`residential`, `commercial`, `institution`, `construction`).
- **Roads**: Waypoint polylines with realistic street widths, flyovers, and underpasses.
- **Vegetation**: Real mapped trees + species classification for seasonal color shifting (Gulmohar, Tabebuia, Cassia, Neem, Banyan, Ashoka).
- **Lamps**: Emissive fixtures placed along major arterial corridors for nighttime lighting.
- **Terrain**: 16x15 elevation grid matching local topography.
- **Landmarks & Anchors**: Camera bookmarks for smooth cinematic fly-throughs.

