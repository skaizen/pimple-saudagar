"""Convert an OpenStreetMap map.json extract into public/scene.json.
Usage: curl "https://api.openstreetmap.org/api/0.6/map.json?bbox=73.7903,18.5913,73.8047,18.6049" -o osm.json
       python3 scripts/osm_to_scene.py osm.json public/scene.json"""
import json, math, sys, random
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))["elements"]
LAT0, LON0 = 18.5981, 73.7975
KX, KZ = 111320 * math.cos(math.radians(LAT0)), 110540
def P(n): return [round((n["lon"] - LON0) * KX, 1), round(-(n["lat"] - LAT0) * KZ, 1)]
nodes = {e["id"]: e for e in d if e["type"] == "node"}
ways = [e for e in d if e["type"] == "way"]
def pts(w): return [P(nodes[i]) for i in w["nodes"] if i in nodes]
HALF = 700
inside = lambda p: abs(p[0]) < HALF and abs(p[1]) < HALF
rnd = random.Random(411027)
cols, rows, step = 12, 12, 128
terrain = {"cols": cols, "rows": rows, "step": step, "values": [round(4 + 1.5 * math.sin(((i - 5.5) * step) / 260) * math.cos(((j - 5.5) * step) / 310), 2) for j in range(rows) for i in range(cols)]}
def ty(x, z): return 4.0
def area(r): return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2
buildings, roads, trees, lamps, parks = [], [], [], [], []
RW = {"trunk": 22, "primary": 18, "secondary": 14, "tertiary": 11, "residential": 7, "unclassified": 7, "living_street": 6, "service": 5}
for w in ways:
    t = w.get("tags", {}); p = pts(w)
    if len(p) < 2: continue
    if "building" in t and len(p) >= 4:
        r = p[:-1] if p[0] == p[-1] else p
        c = [sum(q[0] for q in r) / len(r), sum(q[1] for q in r) / len(r)]
        if not inside(c): continue
        a = area(r)
        if a < 15: continue
        lv = t.get("building:levels")
        if t.get("height"):
            try: h = float(t["height"].split()[0])
            except ValueError: h = None
        else: h = None
        if h is None and lv:
            try: h = float(lv) * 3.2
            except ValueError: h = None
        b = t["building"]
        shop = any(k in t for k in ("shop", "amenity")) or b in ("commercial", "retail", "mall")
        inst = b in ("school", "hospital", "public", "government", "temple", "religious") or "school" in t.get("name", "").lower()
        if h is None:
            if b in ("house", "shed", "garage", "hut", "roof"): h = 4 + rnd.random() * 5
            elif a > 900: h = 30 + rnd.random() * 18   # apartment towers in societies
            elif a > 400: h = 18 + rnd.random() * 15
            elif a > 150: h = 9 + rnd.random() * 9
            else: h = 4 + rnd.random() * 6
        buildings.append({"id": f"w{w['id']}", "h": round(h), "ring": r, "cls": "commercial" if shop else "institution" if inst else "residential", "name": t.get("name")})
    elif t.get("highway") in RW:
        hw = t["highway"]
        if not any(inside(q) for q in p): continue
        roads.append({"name": t.get("name"), "type": "primary" if hw in ("trunk", "primary", "secondary") else "secondary", "width": RW[hw], "points": p})
    elif t.get("waterway") == "river" or t.get("natural") == "water":
        roads.append({"name": t.get("name", "Pavana River"), "type": "river", "width": 40, "points": p})
    elif t.get("leisure") in ("park", "garden") or t.get("landuse") in ("grass", "recreation_ground"):
        parks.append(p)
SPECIES = ["gulmohar", "tabebuia", "cassia", "neem", "banyan", "ashoka"]
def tree(x, z):
    if inside([x, z]): trees.append({"x": round(x, 1), "z": round(z, 1), "y": 4, "species": rnd.choice(SPECIES), "height": round(6 + rnd.random() * 8, 1), "radius": round(2.5 + rnd.random() * 2.5, 1)})
def pip(x, z, poly):
    c = False
    for i in range(len(poly)):
        (ax, az), (bx, bz) = poly[i], poly[i - 1]
        if (az > z) != (bz > z) and x < (bx - ax) * (z - az) / (bz - az + 1e-9) + ax: c = not c
    return c
for poly in parks:
    xs, zs = [q[0] for q in poly], [q[1] for q in poly]
    for _ in range(int(min(400, area(poly) / 60))):
        x, z = rnd.uniform(min(xs), max(xs)), rnd.uniform(min(zs), max(zs))
        if pip(x, z, poly): tree(x, z)
for n in nodes.values():
    if n.get("tags", {}).get("natural") == "tree": tree(*P(n))
for rd in roads:
    if rd["type"] == "river": continue
    p = rd["points"]
    for k in range(len(p) - 1):
        (ax, az), (bx, bz) = p[k], p[k + 1]; L = math.hypot(bx - ax, bz - az) or 1
        nx, nz = -(bz - az) / L, (bx - ax) / L; off = rd["width"] / 2 + 3
        t = 0.0
        while t < L:
            for s in (-1, 1):
                if rnd.random() < (0.45 if rd["type"] == "primary" else 0.18): tree(ax + (bx - ax) * t / L + nx * off * s, az + (bz - az) * t / L + nz * off * s)
            if rd["type"] == "primary" and rnd.random() < 0.6:
                x, z = ax + (bx - ax) * t / L + nx * (off - 1.5), az + (bz - az) * t / L + nz * (off - 1.5)
                if inside([x, z]): lamps.append({"type": "lamp", "x": round(x, 1), "z": round(z, 1), "y": 4})
            t += 18
# drop trees inside buildings
def in_any_building(x, z):
    for b in buildings:
        r = b["ring"]
        if abs(r[0][0] - x) < 80 and abs(r[0][1] - z) < 80 and pip(x, z, r): return True
    return False
trees = [t for t in trees if not in_any_building(t["x"], t["z"])][:1800]
named = {}
for e in d:
    nm = e.get("tags", {}).get("name")
    if not nm: continue
    if e["type"] == "node": named.setdefault(nm, P(e))
    elif e["type"] == "way":
        p = pts(e)
        if p: named.setdefault(nm, [sum(q[0] for q in p) / len(p), sum(q[1] for q in p) / len(p)])
def lbl(name, key, typ): 
    x, z = named[key]; return {"name": name, "x": x, "z": z, "y": 45, "type": typ}
want = [("Govind Garden", "Govind Garden", "area"), ("Govind Garden Chowk", "Govind Garden Chowk New Flyover", "landmark"), ("Vision 9 Mall", "Vision 9 Mall", "landmark"), ("Kokane Chowk", "Kokane Chowk", "landmark"),
        ("Linear Gardens", "Pimple Saudagar Linear Gardens", "area"), ("Nashik Phata – Wakad BRTS", "Nashik Phata - Wakad BRTS", "road"), ("Rahatani Road", "Kokane Chowk - Rahatani Road", "road")]
labels = [lbl(*w) for w in want if w[1] in named and inside(named[w[1]])]
def anchor(name, x, z, dist=180): return {"name": name, "position": [x + dist, dist * 0.8, z + dist], "target": [x, 0, z]}
anchors = [{"name": "Whole Frame", "position": [800, 820, 800], "target": [0, 0, 0]}] + [anchor(l["name"], l["x"], l["z"]) for l in labels if l["type"] != "road"][:5]
for b in buildings: b.pop("name")
scene = {"meta": {"center_lon_lat": [LON0, LAT0], "area_m2": (2 * HALF) ** 2, "source": "© OpenStreetMap contributors (ODbL)", "counts": {"buildings": len(buildings), "trees": len(trees), "roads": len(roads), "lamps": len(lamps)}},
         "terrain": terrain, "buildings": buildings, "roads": roads, "trees": trees, "furniture": lamps, "labels": labels, "anchors": anchors}
json.dump(scene, open(out, "w"), separators=(",", ":"))
print(scene["meta"]["counts"], [l["name"] for l in labels], [a["name"] for a in anchors])
