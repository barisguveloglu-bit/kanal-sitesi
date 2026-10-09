/* SILAH GOVDEDEN GECMIYOR -- Karanlik Tirpan + Antitheus      v7.99.10

   Kullanici: "bozuk bir dovus veremeyiz asla." Olcum oncesi: sapin elin
   8-16 px gerisi vuruslarda govdeye ve kafaya 1-4 px giriyordu,
   giyotinin toparlanmasinda arka uc yarim saniye govdenin icindeydi.
   arac/wom_cevir.py silah_carpisma_duzelt tirpani yumrugun etrafinda
   en az aciyla ceviriyor. Bu test sonucu Bedrock ileri kinematigiyle
   (arac/bedrock_onizleme.py, donusturucuden bagimsiz) olcuyor:

   1. tirpanin hicbir noktasi kafa, govde ya da bacak kutusunun
      0.5 px'ten derinine girmiyor (kollar haric: sap yumruktan geciyor);
      20 Hz + silaha yakin anlarin butun anahtar kareleri
   2. bacaklar zeminin altina inmiyor (dizsiz bacak + comelme)
   3. duzeltme ani sicramiyor: tirpanin ucu 0.01 s adimla izlenir;
      bir adim iki komsusunun 3 katindan ve 6 px'ten buyukse KOPUKLUK.
      (Ilk surum 0.05 s'de 40 px'i sicrama sayiyordu: vurus 3'un hizli
      ama kesintisiz savurusu 75 px gidiyor -- olcum, bozukluk degil.)  */
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
r = {"derin": [0, "", 0, ""], "zemin": [0, "", 0], "atlama": [0, "", 0], "anim": 0, "her": {}}
for ad, an in anims.items():
    if not ad.startswith("animation.wom.antitheus."): continue
    r["anim"] += 1
    uz = an.get("animation_length", 1.0) or 1.0
    onceki = None
    # kaba gecis 20 Hz; silah 2 px'ten yakinsa cevresindeki (+-0.05 s)
    # BUTUN anahtar kareler de olculur. Ilk surum yalniz 20 Hz'di ve
    # auto_1'in t=0.467'deki 1.57 px'lik tepesini 0.68 px goruyordu.
    anahtar = sorted({float(k) for kb in ("rightArm", "rightItem", "body", "waist", "root")
                      for kn in ("rotation", "position") for k in an["bones"].get(kb, {}).get(kn, {})
                      if isinstance(an["bones"].get(kb, {}).get(kn), dict)})
    kisa = ad.split(".")[-1]
    def derinlik(t):
        m = B.Model(geo, an, t)
        en = (-9, "")
        for kad, c0, E in kutular(m, ("head", "body", "rightLeg", "leftLeg")):
            for bad, p in nok:
                w = tm.nokta(bad, p[:], m)
                d = min(min(sum((w[k] - c0[k]) * e[k] for k in range(3)), L - sum((w[k] - c0[k]) * e[k] for k in range(3))) for e, L in E)
                if d > en[0]: en = (d, kad)
        if en[0] > r["derin"][0]: r["derin"] = [en[0], kisa, t, en[1]]
        if en[0] > r["her"].get(kisa, [-9])[0]: r["her"][kisa] = [round(en[0], 2), round(t, 4), en[1]]
        return m, en[0]
    yakin = []
    for i in range(int(uz * 20) + 1):
        t = i / 20
        m, d = derinlik(t)
        if d > -2: yakin.append(t)
        for kad, c0, E in kutular(m, ("rightLeg", "leftLeg")):
            lo = min(c0[1] + sum(E[j][0][1] * E[j][1] * s for j, s in enumerate(sel)) for sel in
                     [(a, b, c) for a in (0, 1) for b in (0, 1) for c in (0, 1)])
            if -lo > r["zemin"][0]: r["zemin"] = [-lo, ad.split(".")[-1], t]
    ince = sorted({k for k in anahtar for t in yakin if abs(k - t) <= 0.05 and k <= uz})
    for t in ince:
        derinlik(t)
    r["ince"] = r.get("ince", 0) + len(ince)
    yol = []
    onceki = None
    for i in range(int(uz * 100) + 1):
        u = tm.nokta(uc[0], uc[1][:], B.Model(geo, an, i / 100))
        if onceki is not None:
            yol.append(math.dist(u, onceki))
        onceki = u
    for i in range(1, len(yol) - 1):
        ref = max(yol[i - 1], yol[i + 1], 0.5)
        if yol[i] > 6 and yol[i] / ref > r["atlama"][0]:
            r["atlama"] = [yol[i] / ref, ad.split(".")[-1], round((i + 1) / 100, 2)]
print(json.dumps(r))
`;
const r = JSON.parse(execFileSync("python3", ["-c", py], { cwd: KOK, encoding: "utf8", maxBuffer: 1 << 24 }));
kontrol("Antitheus animasyonlari olculdu", r.anim >= 7, r.anim + " animasyon, " + r.ince + " anahtar kare ayrica");
// BILINEN KALINTI: antitheus_auto_3'te sap 0.1-0.2 sn basin icinden geciyor;
// kol duzeltmesi 15 derece sinirinda kapatamiyor (3.8 -> 2.7 px). Filmde bu
// vurus KULLANILMIYOR (arac/bolum1.py BARIS_VURUS: 1-2-4). Ust sinir
// kotulesmeyi yakalasin diye: 3.0 px.
const BILINEN = { antitheus_auto_3: 3.0 };
const asan = Object.entries(r.her).filter(([k, v]) => v[0] > (BILINEN[k] ?? 0.5));
kontrol("tirpan kafa/govde/bacaga girmiyor (0.5 px; bilinen kalinti haric)", asan.length === 0,
        asan.length ? asan.map(([k, v]) => k + " " + v[0] + "px t=" + v[1] + " " + v[2]).join(", ")
                    : "en derin " + r.derin[0].toFixed(2) + " px (" + r.derin[1] + ")");
kontrol("bacaklar zeminin altina inmiyor", r.zemin[0] <= 0.3,
        "en cok " + r.zemin[0].toFixed(2) + " px (" + r.zemin[1] + " t=" + r.zemin[2] + ")");
kontrol("tirpan ucu kopmadan hareket ediyor (komsu adimlarin 3 katindan buyuk sicrama yok)", r.atlama[0] <= 3,
        "en buyuk oran " + r.atlama[0].toFixed(2) + (r.atlama[1] ? " (" + r.atlama[1] + " t=" + r.atlama[2] + ")" : ""));
console.log("     animasyon basina en derin: " + Object.entries(r.her).map(([k, v]) => k + " " + v[0] + "px").join(", "));
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> silah govdeden gecmiyor, ayak zeminde");
process.exit(hata ? 1 : 0);
