/* KARANLIK TIRPAN TUTUSU -- yumruklar SAPIN USTUNDE mi    v7.99.10

   Kullanici deneme filminde tutusu "garip" buldu ve "tekrar tekrar
   kontrol et" dedi. Bu test gorunen seyi olcuyor, aci degil:

   1. sag yumruk her karede sapin ustunde (yumruk merkezi -> sap
      dogru parcasi <= 2.75 px: yumruk 4 px, sap sargisi 1.5 px;
      merkezler bundan yakinsa birbirine degiyor) ve SAPIN ICINDE
      (ucundan tasmiyor)
   2. Epic Fight'in sol eli sapa koydugu anlarda (wom_kilic.iz.json
      "iki el", JAR'dan olculdu) sol yumruk da sapa degiyor
   3. sol kol en cok %12 uzuyor (dirseksiz kolun tek telafisi)

   Ileri kinematik arac/bedrock_onizleme.py (donusturucuden bagimsiz,
   position + scale kanallari dahil). Film de oyun da bu dosyalari
   kullaniyor.                                                     */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, sys, math
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import bedrock_onizleme as B
geo = B.oku("Simsek_Kol_Kaynak/models/entity/aktor.geo.json")
tg = B.oku("Simsek_Kol_Kaynak/models/entity/karanlik_tirpan.geo.json")["minecraft:geometry"][0]["bones"][1]["cubes"]
sap = next(c for c in tg if c["uv"]["east"]["uv"][0] == 0)
z0, z1 = sap["origin"][2], sap["origin"][2] + sap["size"][2]
anims = B.oku("Simsek_Kol_Kaynak/animations/wom_kilic.animation.json")["animations"]
iz = B.oku("kaynak_anim/wom/wom_kilic.iz.json")["animasyonlar"]
def seg(p, a, b):
    ab = [b[i]-a[i] for i in range(3)]; ap = [p[i]-a[i] for i in range(3)]
    L = sum(x*x for x in ab); u = sum(ap[i]*ab[i] for i in range(3)) / L
    q = [a[i] + ab[i]*max(0, min(1, u)) for i in range(3)]
    return math.dist(p, q), u
out = {"sag": [], "sol": [], "uzama": 1.0, "anim": 0}
for ad, an in anims.items():
    if not ad.startswith("animation.wom.antitheus."):
        continue
    out["anim"] += 1
    uz = an.get("animation_length", 2.0) or 2.0
    def olc(t):
        m = B.Model(geo, an, t)
        a = m.nokta("rightItem", [6.0, 13.3, z0]); b = m.nokta("rightItem", [6.0, 13.3, z1])
        return m, a, b
    for i in range(int(uz / 0.05) + 1):
        t = round(i * 0.05, 4)
        m, a, b = olc(t)
        d, u = seg(m.nokta("rightArm", [6.0, 13.3, 0.5]), a, b)
        out["sag"].append([d, u, ad.split(".")[-1], t])
    for t in iz.get(ad, {}).get("iki el", []):
        m, a, b = olc(t)
        d, u = seg(m.nokta("leftArm", [-6.0, 13.3, 0.5]), a, b)
        out["sol"].append([d, u, ad.split(".")[-1], t])
    for v in an.get("bones", {}).get("leftArm", {}).get("scale", {}).values():
        out["uzama"] = max(out["uzama"], v[1])
print(json.dumps(out))
`;
const r = JSON.parse(execFileSync("python3", ["-c", py], { cwd: KOK, encoding: "utf8" }));
const DEGME = 2.75;
const enKotu = (l) => l.reduce((m, x) => (x[0] > m[0] ? x : m), [0, 0, "", 0]);
const s = enKotu(r.sag);
kontrol("Antitheus animasyonlari olculdu", r.anim >= 7, r.anim + " animasyon");
kontrol("sag yumruk her karede sapa degiyor", s[0] <= DEGME,
        r.sag.length + " kare, en kotu " + s[0].toFixed(2) + " px (" + s[2] + " t=" + s[3] + ")");
const tasan = r.sag.filter((x) => x[1] < 0 || x[1] > 1);
kontrol("sag yumruk sapin ucundan tasmiyor", tasan.length === 0,
        tasan.length ? tasan[0].slice(2).join(" t=") : "0 kare");
kontrol("Epic Fight'in iki elli anlari kayitli", r.sol.length >= 10, r.sol.length + " an");
const l = enKotu(r.sol);
kontrol("iki elli anlarda sol yumruk sapa degiyor", l[0] <= DEGME,
        "en kotu " + l[0].toFixed(2) + " px (" + l[2] + " t=" + l[3] + ")");
kontrol("sol kol en cok %12 uzuyor", r.uzama <= 1.12 + 1e-6, "en cok x" + r.uzama.toFixed(3));
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tutus: iki yumruk da sapin ustunde");
process.exit(hata ? 1 : 0);
