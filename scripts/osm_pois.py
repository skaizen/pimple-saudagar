import json,glob,math,re
LAT0,LON0=18.5960,73.7950;KX,KZ=111320*math.cos(math.radians(LAT0)),110540
P=lambda lon,lat:[round((lon-LON0)*KX,1),round(-(lat-LAT0)*KZ,1)]
nodes={};ways={}
for f in glob.glob("t_*.json"):
  for e in json.load(open(f))["elements"]:
    (nodes if e["type"]=="node" else ways if e["type"]=="way" else {})[e["id"]]=e
def kind(t):
  a=t.get("amenity","")
  if a in("school","college","university","kindergarten"): return "school"
  if a=="place_of_worship": return "temple"
  if t.get("shop")=="mall" or t.get("building")=="mall": return "mall"
  if t.get("building")=="construction" or t.get("landuse")=="construction" or "construction" in t and not t.get("highway"): return "construction"
out=[];rings=[]
for e in list(nodes.values())+list(ways.values()):
  t=e.get("tags",{});k=kind(t)
  if not k: continue
  if e["type"]=="node": p=P(e["lon"],e["lat"]); ring=None
  else:
    r=[P(nodes[i]["lon"],nodes[i]["lat"]) for i in e["nodes"] if i in nodes]
    if not r: continue
    p=[sum(q[0] for q in r)/len(r),sum(q[1] for q in r)/len(r)]; ring=r[:-1] if r[0]==r[-1] else r
  if abs(p[0])>1250 or abs(p[1])>1250: continue
  nm=t.get("name") or t.get("name:en") or {"school":"School","temple":"Temple","mall":"Mall","construction":"Under construction"}[k]
  out.append({"name":nm,"kind":k,"x":round(p[0],1),"z":round(p[1],1)})
  if k=="construction" and ring and len(ring)>=3: rings.append(ring)
s=json.load(open("/dev-server/public/scene.json"))
def pip(x,z,poly):
  c=False
  for i in range(len(poly)):
    (ax,az),(bx,bz)=poly[i],poly[i-1]
    if (az>z)!=(bz>z) and x<(bx-ax)*(z-az)/(bz-az+1e-9)+ax: c=not c
  return c
n=0
for b in s["buildings"]:
  cx=sum(q[0] for q in b["ring"])/len(b["ring"]);cz=sum(q[1] for q in b["ring"])/len(b["ring"])
  if any(pip(cx,cz,r) for r in rings) or b.get("cls")=="construction": b["cls"]="construction";n+=1
s["pois"]=out
json.dump(s,open("/dev-server/public/scene.json","w"),separators=(",",":"))
from collections import Counter;print(Counter(o["kind"] for o in out),"construction bldgs",n);print([o["name"] for o in out if o["kind"]=="mall"])
