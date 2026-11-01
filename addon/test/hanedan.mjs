/* HANEDAN, YAPI KURUCUSU, KOYLU VE OLCULEN YAPILAR             v7.99.16

   2. bolumun mekanlari: cadi kulubesi (oyundan olculdu), hanedan
   (yuvarlak sur, tepe, merdiven, ana yapi, iki ev halkasi, tarlalar,
   agaclar, koyluler) ve Zisa'nin evi (elle tasarim). Blender gerekmiyor:
   blok listesi, orgu ve koylu modeli saf Python'da uretiliyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Kulube olcumu: 147 blok, 7x5x9 kutu, dort kazik; cati basamaklarinin
      YUKSEK tarafi ice bakiyor (Bedrock weirdo_direction anlami olcumden).
   2. Orgu: iki tam blogun arasindaki yuz cizilmiyor; basamak iki kutu;
      fener dokusunu kendi atlas bolgesinden okuyor; yatik kutugun ustu
      kabuk (halka degil).
   3. Dondurme: dort ceyrek = kendisi; dondurulmus kulubede de basamaklar
      ice bakiyor (yon durumlari konumla birlikte donuyor).
   4. Hanedan: sur kapi disinda kesintisiz; kapi agzi KAPI_GENISLIK;
      merdiven duzluge ulasiyor; Zisa'nin evi 2. kat penceresi meydana
      bakiyor; sur halkasinda sur blogundan baska bir sey yok.
   5. Evler: surun icinde (en uzak bloklari dahil), birbirine degmiyor,
      yollar acik; ilk onizlemeden FAZLA ev ("daha fazla ev ekle"),
      AZICIK agac ve cicek.
   6. Koyluler: az ("biraz az olsun"), her biri yurunur zeminde, iki blok
      bos yerde, ayaklari zeminin ustunde.
   7. Koylu modeli (Java 26.3 JAR'indan): 11 kutu, burun guneye, butun
      yuz normalleri disari, aynali bacakta yan yuzler yer degistiriyor;
      katman birlestirme Java'nin sapka kuralina uyuyor.
   8. yapi_olc.py tickingarea sinirini (100 chunk) asan yaricapi reddediyor. */
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

console.log("=== 1. KULUBE OLCUMU ===");
{
  const r = py(`
import blok_kur as K
d = json.load(open(sys.argv[1] + "/yapilar/cadi_kulubesi.json"))
b = d["bloklar"]
xs = [q["p"][0] for q in b]; ys = [q["p"][1] for q in b]; zs = [q["p"][2] for q in b]
cx, cz = (min(xs) + max(xs)) / 2.0, (min(zs) + max(zs)) / 2.0
ice = 0; disa = 0
for q in b:
    if q["t"] != "spruce_stairs": continue
    f = K.BASAMAK_YON[q["s"]["weirdo_direction"]]
    v = (cx - q["p"][0], cz - q["p"][2])
    if f[0] * v[0] + f[1] * v[1] > 0: ice += 1
    else: disa += 1
print(json.dumps({"n": len(b), "kutu": [max(xs)-min(xs)+1, max(ys)-min(ys)+1, max(zs)-min(zs)+1],
                  "kazik": len(d["kaziklar"]["sutunlar"]), "ice": ice, "disa": disa}))`);
  kontrol("147 blok", r.n === 147, String(r.n));
  kontrol("kutu 7x5x9 (Java'daki cadi kulubesiyle ayni)", r.kutu.join("x") === "7x5x9", r.kutu.join("x"));
  kontrol("dort kazik", r.kazik === 4);
  kontrol("cati basamaklarinin hepsi ice bakiyor", r.ice === 26 && r.disa === 0, r.ice + " ice, " + r.disa + " disa");
}

console.log("\n=== 2. ORGU ===");
{
  const r = py(`
import blok_kur as K
dk = K.Dokular({"oak_planks", "spruce_planks", "oak_log", "oak_log_top"})
tek = K.orgu([{"p": [0, 0, 0], "t": "oak_planks"}], dk)
cift = K.orgu([{"p": [0, 0, 0], "t": "oak_planks"}, {"p": [1, 0, 0], "t": "oak_planks"}], dk)
bas = K.kutular("spruce_stairs", {"weirdo_direction": 0, "corner": "none"})
dis = K.kutular("spruce_stairs", {"weirdo_direction": 2, "corner": "outer_left"})
fen = K.orgu([{"p": [0, 0, 0], "t": "lantern"}], K.Dokular({"lantern"}))
uv = [q for v in fen.values() for q in v["uv"]]
# yatik (x ekseni) kutuk: halka yalniz dogu ve bati yuzunde, ust yuz kabuk
yat = K.orgu([{"p": [0, 0, 0], "t": "oak_log", "s": {"pillar_axis": "x"}}], dk)
dik = K.orgu([{"p": [0, 0, 0], "t": "oak_log", "s": {"pillar_axis": "y"}}], dk)
def halka_yuzleri(o):
    return sum(len(c["f"]) for (doku, _, _, _), c in o.items() if doku == "oak_log_top")
def ust_doku(o):
    # Blender ekseninde yukari = 3. bilesen; ust yuzun butun koseleri z = 1
    for (doku, _, _, _), c in o.items():
        for f in c["f"]:
            if all(abs(c["v"][i][2] - 1.0) < 1e-9 for i in f):
                return doku
print(json.dumps({"tek": sum(len(v["f"]) for v in tek.values()), "cift": sum(len(v["f"]) for v in cift.values()),
                  "bas": bas, "dis": dis, "fen_u": max(a for a, b in uv), "fen_v": min(b for a, b in uv),
                  "yat_halka": halka_yuzleri(yat), "yat_ust": ust_doku(yat), "dik_ust": ust_doku(dik)}))`);
  kontrol("tek blok 6 yuz", r.tek === 6, String(r.tek));
  kontrol("yan yana iki blok 10 yuz (aradaki iki yuz yok)", r.cift === 10, String(r.cift));
  kontrol("dogu basamagi: taban + dogu yarisi", r.bas.length === 2 && r.bas[1][0] === 0.5 && r.bas[1][3] === 1,
          JSON.stringify(r.bas[1]));
  kontrol("guney dis kose (outer_left): guneydogu ceyregi",
          r.dis.length === 2 && r.dis[1][0] === 0.5 && r.dis[1][2] === 0.5, JSON.stringify(r.dis[1]));
  // lantern.png 16x48 kucuk atlas: fener yalniz sol ustteki 6x15 piksellik
  // bolgeyi ve ilk kareyi okumali (genel UV bos ortaya dusup feneri siliyordu)
  kontrol("fener dokusunun kendi bolgesinden okunuyor (u <= 6/16, ilk kare)",
          r.fen_u <= 6 / 16 + 1e-9 && r.fen_v >= 1 - 15 / 48 - 1e-9, r.fen_u + " / " + r.fen_v);
  kontrol("yatik kutuk: halka yalniz iki ucta, ustu kabuk", r.yat_halka === 2 && r.yat_ust === "oak_log",
          r.yat_halka + " halka yuzu, ust: " + r.yat_ust);
  kontrol("  dik kutugun ustu halka", r.dik_ust === "oak_log_top", r.dik_ust);
}

console.log("\n=== 3. DONDURME ===");
{
  const r = py(`
import blok_kur as K
d = json.load(open(sys.argv[1] + "/yapilar/cadi_kulubesi.json"))["bloklar"]
dort = K.dondur(K.dondur(K.dondur(K.dondur(d, 1), 1), 1), 1)
anahtar = lambda b: json.dumps(b, sort_keys=True)
ayni = sorted(map(anahtar, d)) == sorted(map(anahtar, dort))
bir = K.dondur(d, 1)
xs = [q["p"][0] for q in bir]; zs = [q["p"][2] for q in bir]
cx, cz = (min(xs) + max(xs)) / 2.0, (min(zs) + max(zs)) / 2.0
ice = sum(1 for q in bir if q["t"] == "spruce_stairs" and
          K.BASAMAK_YON[q["s"]["weirdo_direction"]][0] * (cx - q["p"][0]) +
          K.BASAMAK_YON[q["s"]["weirdo_direction"]][1] * (cz - q["p"][2]) > 0)
print(json.dumps({"ayni": ayni, "ice": ice}))`);
  kontrol("dort ceyrek donus = kendisi", r.ayni);
  kontrol("90 derece donmus kulubede basamaklar yine ice bakiyor", r.ice === 26, String(r.ice));
}

console.log("\n=== 4-6. HANEDAN, EVLER, KOYLULER ===");
{
  const r = py(`
import math, hanedan as H, koylu as KY
bl, bilgi = H.hanedan()
h = {tuple(b["p"]): b for b in bl}
ic, dis = H.SUR_YARICAP - H.SUR_KALINLIK / 2.0, H.SUR_YARICAP + H.SUR_KALINLIK / 2.0
SUR_TUR = ("stone_bricks", "mossy_stone_bricks", "cracked_stone_bricks", "cobblestone", "glass_pane",
           "stone_brick_wall")
# sur: yer seviyesinden (y 2) disari giden isin bir sur ya da kule blokuna
# carpiyor mu (halka uzerinde ornek almak ici bos kuleleri bosluk sayiyordu)
bos = []
for i in range(720):
    a = math.radians(i / 2.0)
    engel = False
    for rr in range(H.SUR_YARICAP - 6, H.SUR_YARICAP + 9):
        x, z = int(math.floor(math.cos(a) * rr + 0.5)), int(math.floor(math.sin(a) * rr + 0.5))
        if (x, 2, z) in h:
            engel = True
            break
    if not engel: bos.append(i / 2.0)
kapi_disi = [a for a in bos if abs(((a - H.KAPI_ACISI + 180) % 360) - 180) > 5]
# kapi agzi: surun orta cizgisinde kapi yuksekligine kadar acik genislik
agiz = [dx for dx in range(-6, 7) if not any((dx, y, H.SUR_YARICAP) in h for y in range(1, H.KAPI_YUKSEKLIK + 1))]
mer = [b for b in bl if b["t"] == "stone_brick_stairs"]
z = bilgi["zisa"]
zx, zz = math.cos(math.radians(z["aci"])) * z["yaricap"], math.sin(math.radians(z["aci"])) * z["yaricap"]
cam = [b for b in bl if b["t"] == "glass_pane" and b["p"][1] in (6, 7)
       and math.hypot(b["p"][0] - zx, b["p"][2] - zz) < 8]
on_cam = [b for b in cam if math.hypot(b["p"][0], b["p"][2]) < z["yaricap"] - 3]
# sur halkasinda (ic..dis) y >= 1'de sur blogundan baska bir sey yok
halkada = [b["p"] for b in bl if b["p"][1] >= 1 and ic <= math.hypot(b["p"][0], b["p"][2]) <= dis
           and b["t"] not in SUR_TUR]
# evler: en uzak blok, birbirine degme (arada bir hucre), yollar acik
sinir = H.SUR_YARICAP - H.SUR_KALINLIK / 2.0 - H.EV_SUR_ARASI
evler = bilgi["evler"]
uzak = max([z["uzak"]] + [e["uzak"] for e in evler])
sahip = {}
for i, e in enumerate([{"hucreler": z["hucreler"]}] + evler):
    for c in e["hucreler"]:
        sahip[tuple(c)] = i
degen = []
for c, i in sahip.items():
    for dx in (-1, 0, 1):
        for dz in (-1, 0, 1):
            j = sahip.get((c[0] + dx, c[1] + dz))
            if j is not None and j != i:
                degen.append([i, j, list(c)])
YOL_TUR = ("dirt_path", "stone_bricks", "cobblestone", "mossy_stone_bricks", "andesite")
kapali = []
for x, zc in bilgi["yollar"]:
    if abs(x) <= 3 and 0 <= zc <= H.MEYDAN_YARICAP:
        continue                                  # merdivenin ayagi meydanda
    if h.get((x, 0, zc), {}).get("t") not in YOL_TUR or (x, 1, zc) in h:
        kapali.append([x, zc])
cimen = sum(1 for b in bl if b["p"][1] == 0 and b["t"] == "grass_block")
# koyluler
ky = bilgi["koyluler"]
kotu = []
for k in ky:
    x, zc = int(math.floor(k["p"][0])), int(math.floor(k["p"][2]))
    alt = h.get((x, 0, zc), {}).get("t")
    beklenen = 15 / 16.0 if alt in ("dirt_path", "farmland") else 1.0
    if alt is None or alt in ("water", "farmland") or (x, 1, zc) in h or (x, 2, zc) in h \\
            or abs(k["p"][1] - beklenen) > 1e-9:
        kotu.append(k["p"])
    KY.katman_listesi(k["tip"], k["meslek"], k["seviye"], {})
yakin = min(math.hypot(a["p"][0] - b["p"][0], a["p"][2] - b["p"][2]) for i, a in enumerate(ky) for b in ky[i + 1:])
print(json.dumps({"kapi_disi_bos": len(kapi_disi), "kapi_bos": len(bos) - len(kapi_disi), "agiz": len(agiz),
                  "mer_ust": max(b["p"][1] for b in mer), "tepe": H.TEPE_YUKSEKLIK,
                  "zisa_on_cam": len(on_cam), "halkada": halkada[:4], "halkada_n": len(halkada),
                  "uzak": uzak, "sinir": sinir, "degen": degen[:3], "degen_n": len(degen),
                  "kapali": kapali[:4], "kapali_n": len(kapali), "yol_n": len(bilgi["yollar"]),
                  "ev": sum(1 for e in evler if not e["tarla"]), "tarla": sum(1 for e in evler if e["tarla"]),
                  "agac": {k: len(v) for k, v in bilgi["agaclar"].items()}, "cicek": bilgi["cicek"],
                  "cimen": cimen, "koylu": len(ky), "kotu": kotu, "yakin": yakin, "patika": bilgi["patika"],
                  "olculmus": bool(H.evleri_oku())}))`);
  kontrol("sur kapi disinda kesintisiz", r.kapi_disi_bos === 0, r.kapi_disi_bos + " bosluk");
  kontrol("  kapi acik", r.kapi_bos > 0, r.kapi_bos + " ornek");
  kontrol("  kapi agzi KAPI_GENISLIK (5) blok, kapi yuksekligine kadar", r.agiz === 5, r.agiz + " blok");
  kontrol("merdiven tepenin duzlugune ulasiyor", r.mer_ust === r.tepe, r.mer_ust + " / " + r.tepe);
  kontrol("Zisa'nin evi: 2. katta meydana bakan genis pencere (>= 8 cam)", r.zisa_on_cam >= 8, String(r.zisa_on_cam));
  kontrol("sur halkasinda sur blogundan baska blok yok", r.halkada_n === 0, JSON.stringify(r.halkada));
  kontrol("her evin en uzak blogu surun ic yuzunden iceride (tas ve cam dahil)", r.uzak <= r.sinir + 1e-9,
          r.uzak + " / " + r.sinir);
  kontrol("evler birbirine degmiyor (arada en az bir blok)", r.degen_n === 0, JSON.stringify(r.degen));
  kontrol("yollar acik: zemini yol, ustu bos (" + r.yol_n + " hucre)", r.kapali_n === 0, JSON.stringify(r.kapali));
  kontrol("ilk onizlemeden fazla ev (14 -> en az 30)", r.ev >= 30, r.ev + " ev, " + r.tarla + " tarla");
  kontrol("  tarla var", r.tarla >= 3, String(r.tarla));
  kontrol("azicik agac: surun icinde 4-15", r.agac.ic >= 4 && r.agac.ic <= 15, JSON.stringify(r.agac));
  kontrol("azicik cicek: bos cimenin %3'unden az", r.cicek > 0 && r.cicek < 0.03 * r.cimen,
          r.cicek + " cicek / " + r.cimen + " cimen");
  kontrol("kapilardan yola patika", r.patika > 0, r.patika + " hucre");
  kontrol("koylu az: 6-14", r.koylu >= 6 && r.koylu <= 14, String(r.koylu));
  kontrol("  her koylu yurunur zeminde, ustu iki blok bos, ayagi zeminde", r.kotu.length === 0, JSON.stringify(r.kotu));
  kontrol("  koyluler birbirinden en az 3 blok uzak", r.yakin >= 3, r.yakin.toFixed(2));
  console.log("  - evler: " + (r.olculmus ? "oyundan olculmus" : "el tasarimi (koy_evleri.json yok)"));
}

console.log("\n=== 7. KOYLU MODELI VE DOKU KATMANLARI ===");
{
  const r = py(`
import koylu as K
y = K.kutular()
ters = 0
for i in range(0, len(y), 6):
    kutu = y[i:i + 6]
    m = [sum(p[j] for _, _, k, _ in kutu for p in k) / 24.0 for j in range(3)]
    for _, _, k, _ in kutu:
        a = [k[1][j] - k[0][j] for j in range(3)]
        b = [k[2][j] - k[1][j] for j in range(3)]
        n = (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
        c = [sum(p[j] for p in k) / 4.0 - m[j] for j in range(3)]
        if n[0] * c[0] + n[1] * c[1] + n[2] * c[2] <= 0:
            ters += 1
uvler = [q for _, _, _, uv in y for q in uv]
burun = [k for a, f, k, _ in y if a == "nose" and f == "on"][0]
govde_on = max(p[2] for a, f, k, _ in y if a == "body" for p in k)
kol_on = max(p[2] for a, f, k, _ in y if a == "arms" for p in k)
sol_bacak = [uv for a, f, k, uv in y if a == "left_leg" and f == "sag"][0]
sag_bacak = [uv for a, f, k, uv in y if a == "right_leg" and f == "sag"][0]
bas = max(p[1] for a, f, k, _ in y if a == "head" for p in k)
# katman: biyom sapkasi meslegin TAM sapkasi altinda gizlenir; kesik (alfa < 0.1) cizilmez
gri = [[(0.5, 0.5, 0.5, 1.0)] * 64 for _ in range(64)]
bos = lambda: [[(0.0, 0.0, 0.0, 0.0)] * 64 for _ in range(64)]
tip = bos(); tip[5][40] = (1, 0, 0, 1); tip[50][5] = (0, 0, 1, 1); tip[60][20] = (1, 1, 0, 0.05)
mes = bos(); mes[5][41] = (0, 1, 0, 1)
gizli = dict(K.katman_listesi("plains", "farmer", "stone", {"profession/farmer": "full"}))
out = K.birlestir([(gri, False), (tip, gizli["type/plains.png"]), (mes, False)])
yok = K.katman_listesi("snow", "none", "stone", {"type/snow": "full"})
aptal = K.katman_listesi("plains", "nitwit", "gold", {})
yarim = K.katman_listesi("snow", "butcher", "stone", {"type/snow": "full", "profession/butcher": "partial"})
yarim2 = K.katman_listesi("plains", "butcher", "stone", {"profession/butcher": "partial"})
print(json.dumps({"yuz": len(y), "ters": ters, "uv_ok": all(0 <= a <= 1 and 0 <= b <= 1 for a, b in uvler),
                  "burun_z": burun[0][2], "govde_on": govde_on, "kol_on": kol_on,
                  "sol_bacak_u": [min(a for a, b in sol_bacak) * 64, max(a for a, b in sol_bacak) * 64],
                  "sag_bacak_u": [min(a for a, b in sag_bacak) * 64, max(a for a, b in sag_bacak) * 64],
                  "bas": bas,
                  "sapka_gizli": out[5][40][:3] == (0.5, 0.5, 0.5), "cubbe": out[50][5] == (0, 0, 1, 1.0),
                  "meslek": out[5][41] == (0, 1, 0, 1.0), "kesik": out[60][20] == (0.5, 0.5, 0.5, 1.0),
                  "yok_katman": [k for k, _ in yok], "yok_gizli": dict(yok)["type/snow.png"],
                  "aptal": [k for k, _ in aptal], "yarim": dict(yarim)["type/snow.png"],
                  "yarim2": dict(yarim2)["type/plains.png"]}))`);
  kontrol("11 kutu x 6 yuz", r.yuz === 66, String(r.yuz));
  kontrol("butun yuz normalleri disari", r.ters === 0, r.ters + " ters");
  kontrol("UV'ler 0-1 arasinda", r.uv_ok);
  kontrol("burun guneye (+z) bakiyor", r.burun_z > 0.3, r.burun_z.toFixed(3));
  kontrol("kavusturulmus kollar govdenin onunde (-0.75 rad)", r.kol_on > r.govde_on,
          r.kol_on.toFixed(3) + " > " + r.govde_on.toFixed(3));
  kontrol("bas 34 piksel x 0.9375 (1.992 blok)", Math.abs(r.bas - 34 / 16 * 0.9375) < 1e-9, r.bas.toFixed(4));
  kontrol("aynali sol bacakta sag yan yuz SOL yanin dokusunu aliyor (u 8-12)",
          r.sol_bacak_u[0] === 8 && r.sol_bacak_u[1] === 12 && r.sag_bacak_u[0] === 0 && r.sag_bacak_u[1] === 4,
          JSON.stringify(r.sol_bacak_u) + " / " + JSON.stringify(r.sag_bacak_u));
  kontrol("tam sapkali meslek altinda biyom sapkasi gizli", r.sapka_gizli);
  kontrol("  biyomun cubbesi kaliyor, meslegin sapkasi ciziliyor", r.cubbe && r.meslek);
  kontrol("  alfa < 0.1 cizilmiyor (kesik cizim)", r.kesik);
  kontrol("meslegi olmayan: yalniz cipla + biyom, biyom sapkasi gorunur",
          r.yok_katman.length === 2 && r.yok_gizli === false, JSON.stringify(r.yok_katman));
  kontrol("aptal koyluye (nitwit) rutbe rozeti yok", !r.aptal.some((k) => k.includes("profession_level")),
          JSON.stringify(r.aptal));
  kontrol("yarim sapka: biyomun sapkasi tamsa gizli, degilse gorunur", r.yarim === true && r.yarim2 === false,
          r.yarim + " / " + r.yarim2);
}

console.log("\n=== 8. OLCUM ARACI ===");
{
  let kod = 0;
  try {
    execFileSync("python3", [join(ARAC, "yapi_olc.py"), "--bds", "x", "--calisma", "y", "--biyom", "a",
                             "--yapi", "b", "--isaret", "c", "--cikti", "z", "--yaricap", "72"],
                 { encoding: "utf8", env: ORTAM, stdio: "pipe" });
  } catch (e) { kod = e.status; }
  kontrol("tickingarea sinirini asan yaricap (72) reddediliyor", kod === 2, "kod " + kod);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> hanedan: olcum, orgu, yerlesim ve koylu tutarli");
process.exit(hata ? 1 : 0);
