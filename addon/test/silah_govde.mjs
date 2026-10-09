/* SILAH GOVDEDEN GECMIYOR -- Karanlik Tirpan + Antitheus      v7.99.10

   Kullanici: "bozuk bir dovus veremeyiz asla." Olcum oncesi: sapin elin
   8-16 px gerisi vuruslarda govdeye ve kafaya 1-4 px giriyordu,
   giyotinin toparlanmasinda arka uc yarim saniye govdenin icindeydi.
   arac/wom_cevir.py silah_carpisma_duzelt tirpani yumrugun etrafinda
   en az aciyla ceviriyor. Bu test sonucu Bedrock ileri kinematigiyle
   (arac/bedrock_onizleme.py, donusturucuden bagimsiz) olcuyor:

   1. tirpanin hicbir noktasi kafa, govde ya da bacak kutusunun
      0.5 px'ten derinine girmiyor (kollar haric: sap yumruktan geciyor)
   2. bacaklar zeminin altina inmiyor (dizsiz bacak + comelme)
   3. duzeltme ani sicramiyor: tirpanin ucu iki ornek arasinda
      Epic Fight'in kendi hizinin otesinde ziplamiyor (ust sinir)  */
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
tgeo = B.oku("Simsek_Kol_Kaynak/models/entity/karanlik_tirpan.geo.json")
kem = {b["name"]: b for b in geo["minecraft:geometry"][0]["bones"]}
anims = B.oku("Simsek_Kol_Kaynak/animations/wom_kilic.animation.json")["animations"]
tm = B.Model(tgeo)
nok = []
for b in tgeo["minecraft:geometry"][0]["bones"]:
    for c in b.get("cubes", []):
        o, z = c["origin"], c["size"]
        ek = max(range(3), key=lambda i: z[i]); n = max(1, int(z[ek] / 2))
        for j in range(n + 1):
            q = [o[i] + z[i] / 2 for i in range(3)]; q[ek] = o[ek] + z[ek] * j / n
            nok.append((b["name"], B.ic(q)))
uc = (tgeo["minecraft:geometry"][0]["bones"][1]["name"], B.ic([-6, 13.3, 40.5]))
def kutular(m, adlar):
    out = []
    for ad in adlar:
        for c in kem[ad].get("cubes", []):
            if c.get("inflate", 0) > 0: continue
            o, z = c["origin"], c["size"]
            mn = [-(o[0] + z[0]), o[1], o[2]]; mx = [-o[0], o[1] + z[1], o[2] + z[2]]
            k = lambda a, b, d: m.nokta(ad, [mx[0] if a else mn[0], mx[1] if b else mn[1], mx[2] if d else mn[2]])
            c0 = k(0, 0, 0); E = []
            for v in (k(1, 0, 0), k(0, 1, 0), k(0, 0, 1)):
                e = [v[i] - c0[i] for i in range(3)]; L = math.sqrt(sum(x * x for x in e))
                E.append(([x / L for x in e], L))
            out.append((ad, c0, E))
    return out
r = {"derin": [0, "", 0, ""], "zemin": [0, "", 0], "atlama": [0, "", 0], "anim": 0}
for ad, an in anims.items():
    if not ad.startswith("animation.wom.antitheus."): continue
    r["anim"] += 1
    uz = an.get("animation_length", 1.0) or 1.0
    onceki = None
    for i in range(int(uz * 20) + 1):
        t = i / 20
        m = B.Model(geo, an, t)
        for kad, c0, E in kutular(m, ("head", "body", "rightLeg", "leftLeg")):
            for bad, p in nok:
                w = tm.nokta(bad, p[:], m)
                d = min(min(sum((w[k] - c0[k]) * e[k] for k in range(3)), L - sum((w[k] - c0[k]) * e[k] for k in range(3))) for e, L in E)
                if d > r["derin"][0]: r["derin"] = [d, ad.split(".")[-1], t, kad]
        for kad, c0, E in kutular(m, ("rightLeg", "leftLeg")):
            lo = min(c0[1] + sum(E[j][0][1] * E[j][1] * s for j, s in enumerate(sel)) for sel in
                     [(a, b, c) for a in (0, 1) for b in (0, 1) for c in (0, 1)])
            if -lo > r["zemin"][0]: r["zemin"] = [-lo, ad.split(".")[-1], t]
        u = tm.nokta(uc[0], uc[1][:], m)
        if onceki is not None:
            s = math.dist(u, onceki)
            if s > r["atlama"][0]: r["atlama"] = [s, ad.split(".")[-1], t]
        onceki = u
print(json.dumps(r))
`;
const r = JSON.parse(execFileSync("python3", ["-c", py], { cwd: KOK, encoding: "utf8", maxBuffer: 1 << 24 }));
kontrol("Antitheus animasyonlari olculdu", r.anim >= 7, r.anim + " animasyon");
kontrol("tirpan kafa/govde/bacaga 0.5 px'ten derin girmiyor", r.derin[0] <= 0.5,
        "en derin " + r.derin[0].toFixed(2) + " px (" + r.derin[1] + " t=" + r.derin[2] + " " + r.derin[3] + ")");
kontrol("bacaklar zeminin altina inmiyor", r.zemin[0] <= 0.3,
        "en cok " + r.zemin[0].toFixed(2) + " px (" + r.zemin[1] + " t=" + r.zemin[2] + ")");
// Arka uc 40 px yaricapli; 0.05 s'de 40 px = saniyede ~12 blok. Daha fazlasi sicramadir.
kontrol("tirpan ucu ani sicramiyor", r.atlama[0] <= 40,
        "iki ornek arasi en cok " + r.atlama[0].toFixed(1) + " px (" + r.atlama[1] + " t=" + r.atlama[2] + ")");
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> silah govdeden gecmiyor, ayak zeminde");
process.exit(hata ? 1 : 0);
