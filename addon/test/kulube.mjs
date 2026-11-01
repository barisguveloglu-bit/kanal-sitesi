/* BATAKLIK VE CADININ KULUBESI                                  v7.99.16

   2. bolum Part 1'in mekani (arac/kulube.py). Blender gerekmiyor: blok
   listesi ve orgu saf Python.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Kulube olculen kulubenin AYNISI (147 blok, durumlariyla); kullanicinin
      iki eklemesi var: kirmizi yatak (iki blok, basi kuzeyde, cunku yastik
      dokusu kuzeye ciziliyor) ve iki katli kitaplik, yatagin basinda.
      Kapidan yatagin yanina giden yol bos.
   2. Kaziklar kulubenin tabanindan zemine (suda dibe) kesintisiz iniyor.
   3. Bataklik renkleri Minecraft 26.3 JAR'indan okunanlar (swamp.json ve
      GrassColorModifier$3): yaprak ve su, cimenin iki tonu, esik -0,1.
   4. Bataklik mesesi swamp_oak.json'a uyuyor: govde 5-8, yaprak katmanlari
      ustten yaricap 2, 2, 3, 3; her sarmasik bir yapraga (ya da ustundeki
      sarmasiga) yapisik, en fazla 5 blok.
   5. Kapinin onundeki kuru serit ve gecidin onu: su yok, ustlerinde yaprak,
      kutuk ya da sarkan sarmasik yok (Baris orada yuruyor; ilk onizlemede
      kapinin onune sarmasik sarkiyordu).
   6. Gecit: 4x5 obsidyen cerceve, ici 2x3 gecit, kulubeye bakiyor.
   7. Ayni tohum ayni bataklik.
   8. Orgu: su ve gecit dokusunun yalniz ilk karesi (serit dokular bir bloga
      sikisiyordu); gecit iki ince yuz; biyom boyasi ve blok basina boya;
      cimen yan yuzune ortu yalniz ova disinda ve dort yanda (kuzey yuzu
      "on" sayildigi icin ilk yazista ortusuz kalmisti); ovanin (hanedanin)
      boyalari degismedi. */
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ARAC = join(BURADA, "..", "arac");
const ORTAM = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const py = (kod) => JSON.parse(execFileSync("python3", ["-c", "import sys, json\nsys.path.insert(0, sys.argv[1])\n" + kod,
                                                       ARAC], { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

const ORTAK = `
import kulube as KU
b, bilgi = KU.bataklik()
H = {tuple(q["p"]): q for q in b}
kx, ky, kz = KU.KULUBE_KOKEN
def tip(x, y, z):
    q = H.get((x, y, z)); return q["t"] if q else None
`;

console.log("=== 1. KULUBE VE EKLEMELER ===");
{
  const r = py(ORTAK + `
k = KU.kulube_yukle()
eksik = [q["p"] for q in k["bloklar"]
         if (H.get((q["p"][0] + kx, q["p"][1] + ky, q["p"][2] + kz)) or {}).get("t") != q["t"]
         or (H.get((q["p"][0] + kx, q["p"][1] + ky, q["p"][2] + kz)) or {}).get("s") != q.get("s")]
yatak = [q for q in b if q["t"] == "bed"]
bas = [q for q in yatak if q["s"].get("head_piece_bit")]
ayak = [q for q in yatak if not q["s"].get("head_piece_bit")]
kitap = sorted(q["p"] for q in b if q["t"] == "bookshelf")
(ix0, iy0, iz0), (ix1, iy1, iz1) = bilgi["kulube"]["ic"]
icinde = lambda p: ix0 <= p[0] <= ix1 and iy0 <= p[1] <= iy1 and iz0 <= p[2] <= iz1
yol = [(4, 1, 2), (4, 2, 2), (4, 1, 3), (3, 1, 3), (3, 1, 4), (3, 1, 5)]
yol_dolu = [p for p in yol if tip(p[0] + kx, p[1] + ky, p[2] + kz)]
print(json.dumps({"eksik": eksik, "yatak": len(yatak), "bas": [q["p"] for q in bas], "ayak": [q["p"] for q in ayak],
                  "renk": [q["s"].get("renk") for q in yatak], "kitap": kitap,
                  "icinde": all(icinde(q["p"]) for q in yatak) and all(icinde(p) for p in kitap),
                  "yol_dolu": yol_dolu}))`);
  kontrol("olculen 147 blok yerinde ve durumlariyla ayni", r.eksik.length === 0, r.eksik.length + " fark");
  kontrol("yatak iki blok, kirmizi", r.yatak === 2 && r.renk.every((x) => x === "red"), r.renk.join(","));
  const b = r.bas[0], a = r.ayak[0];
  kontrol("yatagin basi kuzeyde (yastik dokusu kuzeye ciziliyor)", b && a && b[0] === a[0] && b[2] === a[2] - 1,
          JSON.stringify([b, a]));
  kontrol("kitaplik iki kat, yatagin basinda",
          r.kitap.length === 2 && r.kitap.every((p) => p[0] === b[0] && p[2] === b[2] - 1), JSON.stringify(r.kitap));
  kontrol("yatak ve kitaplik kulubenin icinde", r.icinde);
  kontrol("kapidan yatagin yanina giden yol bos", r.yol_dolu.length === 0, JSON.stringify(r.yol_dolu));
}

console.log("\n=== 2. KAZIKLAR ===");
{
  const r = py(ORTAK + `
k = KU.kulube_yukle()
sorun = []
for sx, sz in k["kaziklar"]["sutunlar"]:
    x, z = sx + kx, sz + kz
    y = ky - 1
    while tip(x, y, z) == "oak_log": y -= 1
    alt = tip(x, y, z)
    if alt not in ("dirt", "clay", "grass_block"): sorun.append([x, z, alt, y])
print(json.dumps({"sorun": sorun}))`);
  kontrol("dort kazik da zemine (suda dibe) kesintisiz iniyor", r.sorun.length === 0, JSON.stringify(r.sorun));
}

console.log("\n=== 3. RENKLER (Minecraft 26.3 JAR'indan) ===");
{
  const r = py(`
import kulube as KU
h = lambda c: "%02X%02X%02X" % tuple(int(round(v * 255)) for v in c)
print(json.dumps({"yaprak": h(KU.BATAKLIK_RENK["yaprak"]), "su": h(KU.BATAKLIK_RENK["su"]),
                  "cimen": h(KU.BATAKLIK_RENK["cimen"]), "koyu": h(KU.CIMEN_KOYU), "esik": KU.CIMEN_ESIK}))`);
  kontrol("yaprak #6A7039 (swamp.json foliage_color)", r.yaprak === "6A7039", r.yaprak);
  kontrol("su #617B64 (swamp.json water_color)", r.su === "617B64", r.su);
  kontrol("cimen iki ton #6A7039 / #4C763C, esik -0,1 (GrassColorModifier$3)",
          r.cimen === "6A7039" && r.koyu === "4C763C" && r.esik === -0.1, r.cimen + " " + r.koyu + " " + r.esik);
}

console.log("\n=== 4. BATAKLIK MESESI (swamp_oak.json) ===");
{
  const r = py(ORTAK + `
import math
sorun = []
for a in bilgi["agaclar"]:
    x, t0, z = a["p"]; h = a["boy"]
    if not 5 <= h <= 8: sorun.append(["boy", a["p"], h])
    for y in range(t0, t0 + h):
        if tip(x, y, z) != "oak_log": sorun.append(["govde", [x, y, z]])
    for i, r in ((0, 2), (-1, 2), (-2, 3), (-3, 3)):
        y = t0 + h + i
        for dx in range(-4, 5):
            for dz in range(-4, 5):
                if tip(x + dx, y, z + dz) == "oak_leaves":
                    m = max(abs(dx), abs(dz))
                    if m > r and not any(math.hypot(x + dx - o["p"][0], z + dz - o["p"][2]) <= 3 * 1.5
                                         for o in bilgi["agaclar"] if o is not a):
                        sorun.append(["yaprak", [dx, i, dz], r])
                    if i == 0 and abs(dx) == r and abs(dz) == r:
                        sorun.append(["ust kose", [dx, dz]])
YON = {8: (1, 0), 2: (-1, 0), 1: (0, 1), 4: (0, -1)}
uzun = 0
for q in b:
    if q["t"] != "vine": continue
    x, y, z = q["p"]
    bit = q["s"]["vine_direction_bits"]
    dx, dz = YON[bit]
    # zinciri yalniz AYNI yondeki sarmasiklarla yukari izle: ayni sutunda
    # iki zincir ust uste gelebiliyor (biri guneydeki, biri kuzeydeki yapraga)
    yy = y; n = 0
    while tip(x, yy + 1, z) == "vine" and H[(x, yy + 1, z)]["s"]["vine_direction_bits"] == bit: yy += 1; n += 1
    if n + 1 > 5: uzun += 1
    if tip(x + dx, yy, z + dz) != "oak_leaves": sorun.append(["sarmasik", q["p"]])
print(json.dumps({"agac": len(bilgi["agaclar"]), "sorun": sorun[:8], "n": len(sorun), "uzun": uzun,
                  "sarmasik": sum(1 for q in b if q["t"] == "vine")}))`);
  kontrol("agaclar kuruldu", r.agac >= 10, String(r.agac));
  kontrol("govde 5-8 blok, yaprak katmanlari 2-2-3-3, ust koseler bos", r.n === 0, JSON.stringify(r.sorun));
  kontrol("her sarmasik bir yapraga asili, en fazla 5 blok", r.uzun === 0 && r.sarmasik > 0,
          r.sarmasik + " sarmasik, " + r.uzun + " uzun");
}

console.log("\n=== 5. KURU SERIT VE GECIDIN ONU ===");
{
  const r = py(ORTAK + `
su = []; ust = []
for x in range(-KU.YARICAP, KU.YARICAP + 1):
    for z in range(-KU.YARICAP, KU.YARICAP + 1):
        if not KU._kuru_mu(x, z): continue
        if tip(x, -1, z) == "water": su.append([x, z])
        for y in range(0, 14):
            t = tip(x, y, z)
            if t in ("oak_leaves", "vine") or (t == "oak_log" and y < ky):
                ust.append([x, y, z, t])
# kuru seridin kazik disinda kalan yeri: kulubenin kazik sutunlari haric
kazik = {(sx + kx, sz + kz) for sx, sz in KU.kulube_yukle()["kaziklar"]["sutunlar"]}
ust = [u for u in ust if (u[0], u[2]) not in kazik]
print(json.dumps({"su": su[:5], "nsu": len(su), "ust": ust[:5], "nust": len(ust)}))`);
  kontrol("kuru seritte su yok", r.nsu === 0, JSON.stringify(r.su));
  kontrol("kuru seridin ustunde yaprak, kutuk, sarmasik yok", r.nust === 0, JSON.stringify(r.ust));
}

console.log("\n=== 6. GECIT ===");
{
  const r = py(ORTAK + `
ob = [q["p"] for q in b if q["t"] == "obsidian"]
pt = [q for q in b if q["t"] == "portal"]
xs = sorted({p[0] for p in ob}); ys = sorted({p[1] for p in ob}); zs = sorted({p[2] for p in ob})
print(json.dumps({"ob": len(ob), "pt": len(pt), "eksen": sorted({q["s"]["portal_axis"] for q in pt}),
                  "xs": xs, "boy": [ys[-1] - ys[0] + 1, zs[-1] - zs[0] + 1], "gx": KU.GECIT["x"], "kx": kx}))`);
  kontrol("obsidyen cerceve 4 genis x 5 yuksek (14 blok)", r.ob === 14 && r.boy[0] === 5 && r.boy[1] === 4,
          r.ob + " blok, " + r.boy.join("x"));
  kontrol("ici 2x3 gecit, hepsi ayni eksende", r.pt === 6 && r.eksen.length === 1, r.pt + " " + r.eksen);
  kontrol("gecit kulubeye bakiyor (duzlemi z boyunca, kulube doguda)",
          r.eksen[0] === "z" && r.xs.length === 1 && r.gx < r.kx, JSON.stringify(r.eksen));
}

console.log("\n=== 7. AYNI TOHUM AYNI BATAKLIK ===");
{
  const r = py(`
import kulube as KU
a = KU.bataklik()[0]; b = KU.bataklik()[0]
print(json.dumps({"ayni": a == b, "n": len(a)}))`);
  kontrol("iki kosu bire bir ayni", r.ayni, r.n + " blok");
}

console.log("\n=== 8. ORGU ===");
{
  const r = py(`
import blok_kur as K, kulube as KU
var = {"water_still", "nether_portal", "grass_block_top", "grass_block_side", "grass_block_side_overlay",
       "dirt", "oak_leaves", "obsidian"}
su = K.orgu([{"p": [0, 0, 0], "t": "water"}], K.Dokular(var))
sv = [v for c in su.values() for u, v in c["uv"]]
gc = K.orgu([{"p": [0, 0, 0], "t": "portal", "s": {"portal_axis": "x"}}], K.Dokular(var))
gv = [v for c in gc.values() for u, v in c["uv"]]
gk = list(gc.keys())
zemin = [{"p": [0, 0, 0], "t": "grass_block"}]
ova = K.orgu(zemin, K.Dokular(var))
bat = K.orgu(zemin, K.Dokular(var, renkler=KU.BATAKLIK_RENK))
boya = K.orgu([{"p": [0, 0, 0], "t": "grass_block", "renk": [0.1, 0.2, 0.3]}], K.Dokular(var, renkler=KU.BATAKLIK_RENK))
ortu = lambda o: sum(len(c["f"]) for k, c in o.items() if k[0] == "grass_block_side_overlay")
ust_renk = lambda o: [k[1] for k in o if k[0] == "grass_block_top"]
dk = K.Dokular(var)
print(json.dumps({"su_v": [min(sv), max(sv)], "gecit_v": [min(gv), max(gv)], "gecit_yuz": sum(len(c["f"]) for c in gc.values()),
                  "gecit_isik": [k[2] for k in gk], "ova_ortu": ortu(ova), "bat_ortu": ortu(bat),
                  "ova_ust": ust_renk(ova), "bat_ust": ust_renk(bat), "boya_ust": ust_renk(boya),
                  "boya_ortu": [k[1] for k in boya if k[0] == "grass_block_side_overlay"],
                  "varsayilan": [dk.renk["cimen"] == K.CIMEN, dk.renk["yaprak"] == K.YAPRAK, dk.renk["su"] == K.SU]}))`);
  kontrol("su dokusunun yalniz ilk karesi (32 karelik serit)", r.su_v[0] >= 1 - 1 / 32 - 1e-9 && r.su_v[1] <= 1,
          JSON.stringify(r.su_v));
  kontrol("gecit dokusunun yalniz ilk karesi", r.gecit_v[0] >= 1 - 1 / 32 - 1e-9, JSON.stringify(r.gecit_v));
  kontrol("gecit iki ince yuz, isik sacar", r.gecit_yuz === 2 && r.gecit_isik.every((x) => x > 0),
          r.gecit_yuz + " yuz");
  kontrol("ovada cimen yan yuzune ortu yok (hanedan degismedi)", r.ova_ortu === 0, String(r.ova_ortu));
  kontrol("bataklikta dort yan yuzun dordune de ortu", r.bat_ortu === 4, String(r.bat_ortu));
  kontrol("cimenin ustu biyomla boyaniyor",
          JSON.stringify(r.bat_ust[0]) !== JSON.stringify(r.ova_ust[0]), JSON.stringify(r.bat_ust));
  kontrol("blok basina boya ustte ve ortude kullaniliyor",
          JSON.stringify(r.boya_ust[0]) === "[0.1,0.2,0.3]" && r.boya_ortu.every((c) => JSON.stringify(c) === "[0.1,0.2,0.3]"),
          JSON.stringify(r.boya_ust));
  kontrol("varsayilan boyalar ovanin (hanedanin) eskileri", r.varsayilan.every(Boolean), JSON.stringify(r.varsayilan));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> kulube: olcum, eklemeler, bataklik ve orgu tutarli");
process.exit(hata ? 1 : 0);
