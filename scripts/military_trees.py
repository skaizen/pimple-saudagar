"""Plant dense tree cover inside Aundh Military Station (OSM landuse=military). Run after overture_pois.py.
Usage: python3 scripts/military_trees.py <osm tile json...>"""
import json,sys,math,random
LAT0,LON0=18.5960,73.7950;KX,KZ=111320*math.cos(math.radians(LAT0)),110540;HALF=1250
rnd=random.Random(7);SPECIES=["neem","banyan","peepal","rain-tree","cassia","gulmohar"]
nodes={};ways={}
for f in sys.argv[1:]:
  for e in json.load(open(f))["elements"]:
    if e["type"]=="node":nodes[e["id"]]=e
    elif e["type"]=="way":ways[e["id"]]=e
poly=[((nodes[n]["lon"]-LON0)*KX,-(nodes[n]["lat"]-LAT0)*KZ) for w in ways.values() if w.get("tags",{}).get("landuse")=="military" for n in w["nodes"] if n in nodes]
def pip(p,x,z):
  c=False;j=len(p)-1
  for i in range(len(p)):
    xi,zi=p[i];xj,zj=p[j]
    if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi+1e-9)+xi:c=not c
    j=i
  return c
d=json.load(open("public/scene.json"))
fps=[b["ring"] for b in d["buildings"]]
boxes=[(min(p[0] for p in f),max(p[0] for p in f),min(p[1] for p in f),max(p[1] for p in f)) for f in fps]
def inb(x,z):return any(a-3<x<b+3 and c-3<z<e+3 for a,b,c,e in boxes)
xs=[p[0] for p in poly];zs=[p[1] for p in poly];new=[]
x=max(min(xs),-HALF+5)
while x<min(max(xs),HALF-5):
  z=max(min(zs),-HALF+5)
  while z<min(max(zs),HALF-5):
    jx,jz=x+rnd.uniform(-6,6),z+rnd.uniform(-6,6)
    if pip(poly,jx,jz) and not inb(jx,jz) and rnd.random()<0.8:
      new.append({"x":round(jx,1),"z":round(jz,1),"y":4,"species":rnd.choice(SPECIES),"height":round(8+rnd.random()*10,1),"radius":round(3+rnd.random()*3,1)})
    z+=16
  x+=16
d["trees"]=[t for t in d["trees"] if not pip(poly,t["x"],t["z"])]+new
d["meta"]["counts"]["trees"]=len(d["trees"])
json.dump(d,open("public/scene.json","w"),separators=(",",":"))
print(len(poly),"pts",len(new),"defence trees; total",len(d["trees"]))
