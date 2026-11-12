"""Merge Overture Maps buildings + places into public/scene.json (OSM base).
Fetch with duckdb (see AGENTS.md), then: python3 scripts/overture_merge.py b.json p.json public/scene.json"""
import json, math, sys, random, re
bf, pf, out = sys.argv[1:4]
LAT0, LON0 = 18.5960, 73.7950
KX, KZ = 111320 * math.cos(math.radians(LAT0)), 110540
P = lambda lon, lat: [round((lon - LON0) * KX, 1), round(-(lat - LAT0) * KZ, 1)]
HALF = 1250; rnd = random.Random(7)
scene = json.load(open(out))
def area(r): return abs(sum(r[i][0]*r[i-1][1]-r[i-1][0]*r[i][1] for i in range(len(r))))/2
def pip(x, z, poly):
    c = False
    for i in range(len(poly)):
        (ax, az), (bx, bz) = poly[i], poly[i-1]
        if (az > z) != (bz > z) and x < (bx-ax)*(z-az)/(bz-az+1e-9)+ax: c = not c
    return c
cent = lambda r: (sum(q[0] for q in r)/len(r), sum(q[1] for q in r)/len(r))
grid = {}
def key(x, z): return (int(x//60), int(z//60))
def add(b):
    x, z = cent(b["ring"]); grid.setdefault(key(x, z), []).append(b)
def near(x, z):
    kx, kz = key(x, z)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1): yield from grid.get((kx+i, kz+j), [])
for b in scene["buildings"]: add(b)
SHOP = re.compile("restaurant|store|shop|mall|bank|financial|hotel|cafe|market|clinic|pharmacy|salon|gym|real_estate|service")
INST = re.compile("school|college|hospital|temple|church|mosque|government|university|police")
places = [(P(p["lon"], p["lat"]), p["cat"] or "") for p in json.load(open(pf))]
added = 0
for o in json.load(open(bf)):
    m = re.search(r"\(\(([^()]*)\)", o["wkt"])
    if not m: continue
    r = [P(*map(float, s.split())) for s in m.group(1).split(",")]
    r = r[:-1] if r[0] == r[-1] else r
    if len(r) < 3 or area(r) < 20: continue
    x, z = cent(r)
    if abs(x) > HALF or abs(z) > HALF: continue
    if any(pip(x, z, b["ring"]) or pip(*cent(b["ring"]), r) for b in near(x, z)): continue
    a = area(r)
    h = o["height"] or (o["num_floors"] and o["num_floors"] * 3.2)
    if not h:
        h = 30 + rnd.random()*18 if a > 900 else 18 + rnd.random()*15 if a > 400 else 9 + rnd.random()*9 if a > 150 else 4 + rnd.random()*6
    b = {"id": "o" + o["id"][:12], "h": round(h), "ring": r, "cls": "residential"}
    add(b); scene["buildings"].append(b); added += 1
# classify any building containing a place
for (x, z), cat in places:
    for b in near(x, z):
        if pip(x, z, b["ring"]):
            if INST.search(cat): b["cls"] = "institution"
            elif SHOP.search(cat) and b["cls"] == "residential": b["cls"] = "commercial"
            break
scene["meta"]["counts"]["buildings"] = len(scene["buildings"])
scene["meta"]["source"] = "© OpenStreetMap contributors (ODbL) · Overture Maps Foundation"
json.dump(scene, open(out, "w"), separators=(",", ":"))
print("added", added, "total", len(scene["buildings"]), {c: sum(b["cls"] == c for b in scene["buildings"]) for c in ("residential", "commercial", "institution")})
