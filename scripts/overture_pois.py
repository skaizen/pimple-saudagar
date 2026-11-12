import json,math
LAT0,LON0=18.5960,73.7950;KX,KZ=111320*math.cos(math.radians(LAT0)),110540
s=json.load(open("/dev-server/public/scene.json"));pois=s["pois"]
M={"elementary_school":"school","college_university":"school","hindu_place_of_worship":"temple","religious_organization":"temple","shopping_mall":"mall"}
for p in json.load(open("p.json")):
  k=M.get(p["cat"]); 
  if not k or not p["name"]: continue
  x,z=round((p["lon"]-LON0)*KX,1),round(-(p["lat"]-LAT0)*KZ,1)
  if abs(x)>1250 or abs(z)>1250 or any(q["kind"]==k and math.hypot(q["x"]-x,q["z"]-z)<50 for q in pois): continue
  pois.append({"name":p["name"],"kind":k,"x":x,"z":z})
json.dump(s,open("/dev-server/public/scene.json","w"),separators=(",",":"))
from collections import Counter;print(Counter(o["kind"] for o in pois));print([o["name"] for o in pois])
