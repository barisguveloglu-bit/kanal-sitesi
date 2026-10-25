/* INCE KOL -- filmde Alex tipi (3 px) kollu skin                v7.99.15

   Zisa'nin skini ince kollu. Oyunda kol_uret.py boyle bir skine
   geometry.pa_aktor_ince'yi veriyor (aktor_ince_mi); film araci ise
   herkese genis kollu modeli giydiriyordu: 4. sutun saydam oldugu icin
   kolda bos bir serit ve kayik doku cikardi. Film artik ayni olcuyle
   seciyor. Blender'in Python'unda PIL yok, skin bpy ile okunuyor.

   1. geometri: iki modelde yalniz dort kol kemigi farkli, ikisi de
      ureticinin ciktisi; genis + formsuz + dizsiz aktor eski geometriyi
      aliyor (eski filmler bire bir)
   2. algilama: filmin olcusu oyununkiyle her skinde ayni, Blender'in
      satir sirasiyla da; Zisa ince, 1. bolumun butun skinleri genis
   3. ayar: "ince" yalniz true/false, form ile birlikte HATA; kol
      pivotlari yalniz ince aktorde; zaman cizelgesi etkilenmiyor
   4. mutasyon: sutun kayinca, satir sirasi ters okununca ve tek piksel
      boyaninca olcu dusuyor                                          */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, sys, copy, glob, os
sys.path.insert(0, ${JSON.stringify(KOK)})
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
from PIL import Image
import kol_uret as KU
import bedrock_onizleme as B
import blender_film as F
import diz_model as DM
import form_model as FM
out = {}

def kemikler(g):
    return {b["name"]: b for b in g["minecraft:geometry"][0]["bones"]}

# ---- 1. geometri ----
geo, gi = B.oku(F.GEO_AKTOR), B.oku(F.GEO_AKTOR_INCE)
k0, k1 = kemikler(geo), kemikler(gi)
out["ayni_adlar"] = list(k0) == list(k1)
out["farkli"] = sorted(a for a in k0 if k0[a] != k1.get(a))
out["ince_kol"] = {a: (k1[a]["cubes"][0]["size"][0], k1[a]["cubes"][0]["origin"][1], k1[a]["pivot"][1])
                   for a in F.INCE_KEMIKLER}
out["uretec"] = [KU.aktor_geometrisi(False) == geo, KU.aktor_geometrisi(True) == gi]
out["genis_ayni"] = F.aktor_geosu(geo, gi, False, None, False) is geo
d = kemikler(F.aktor_geosu(geo, gi, True, None, True))
out["ince_diz"] = (all(d[a] == k1[a] for a in F.INCE_KEMIKLER) and "rightLegAlt" in d
                   and kemikler(DM.dizli_geo(gi)) == d)
out["form_ayni"] = F.aktor_geosu(geo, gi, False, {"kol": "alt"}, False) == FM.form_geo(geo, "alt")

# ---- 2. algilama ----
def pil_alfa(im):
    return lambda x, y: im.getpixel((x, y))[3] / 255.0

def bpy_px(im, ters=False):
    """Blender'in Image.pixels'i: RGBA float, satirlar ALTTAN uste."""
    w, h = im.size
    sira = range(h) if ters else range(h - 1, -1, -1)
    return [c / 255.0 for y in sira for x in range(w) for c in im.getpixel((x, y))]

skinler = sorted(glob.glob("Simsek_Kol_Kaynak/textures/entity/aktor/*.png"))
skinler += ["Simsek_Kol_Kaynak/textures/entity/ilkel_harkos.png", "Simsek_Kol_Kaynak/textures/entity/ilkel_okazor.png"]
sonuc, uyusmayan, bpy_uyusmayan, ters_uyusmayan = {}, [], [], []
for p in skinler:
    im = Image.open(p).convert("RGBA")
    w, h = im.size
    s = F.skin_ince_mi(w, h, pil_alfa(im))
    sonuc[os.path.basename(p)] = s
    if s != KU.aktor_ince_mi(p):
        uyusmayan.append(p)
    if F.skin_ince_mi(w, h, F.bpy_alfa(bpy_px(im), w, h)) != s:
        bpy_uyusmayan.append(p)
    if F.skin_ince_mi(w, h, F.bpy_alfa(bpy_px(im, ters=True), w, h)) != s:
        ters_uyusmayan.append(os.path.basename(p))
out["skin_sayisi"] = len(skinler)
out["uyusmayan"] = uyusmayan
out["bpy_uyusmayan"] = bpy_uyusmayan
out["ince_olanlar"] = sorted(a for a, s in sonuc.items() if s)
bolum1 = set()
for f in sorted(glob.glob("film/*.json")):
    for a in json.load(open(f, encoding="utf-8"))["aktorler"].values():
        bolum1.add(a["skin"])
out["bolum1"] = {os.path.basename(s): F.skin_ince_mi(*Image.open(B.yol(s)).size, pil_alfa(Image.open(B.yol(s)).convert("RGBA")))
                 for s in sorted(bolum1)}
out["buyuk_genis"] = F.skin_ince_mi(128, 128, lambda x, y: 0.0) is False

# ---- 3. ayar ----
gecerli = [F.ince_ayari(v) for v in (None, True, False)]
hatali = []
for v in ("evet", 1, 0, "true", [True]):
    try:
        F.ince_ayari(v)
    except ValueError:
        hatali.append(True)
    else:
        hatali.append(False)
out["ayar"] = [gecerli == [None, True, False], all(hatali)]
setler = B.oku(F.HAREKET)["setler"]
def aktor_hata(v):
    try:
        F.Aktor("z", dict({"skin": "x.png", "set": "yumruk"}, **v), setler)
    except ValueError:
        return True
    return False
out["aktor_hata"] = [aktor_hata({"ince": True, "form": "alt"}), aktor_hata({"ince": "x"}),
                     aktor_hata({"ince": False, "form": "alt"}), aktor_hata({})]
out["aktor_ince"] = [F.Aktor("z", {"skin": "x.png", "set": "yumruk"}, setler).ince,
                     F.Aktor("z", {"skin": "x.png", "set": "yumruk", "ince": True}, setler).ince]
out["pivot_genis"] = F.kol_pivotlari(B.Model(geo), False)
out["pivot_ince"] = F.kol_pivotlari(B.Model(gi), True)
sen = json.loads(sys.stdin.read())
def cizelge(ince):
    s = copy.deepcopy(sen)
    for a in s["aktorler"].values():
        a["ince"] = ince
    ak = F.zaman_cizelgesi(s, setler, {})[0]
    return {ad: [(round(k["x"], 6), round(k["y"], 6), round(k["z"], 6), round(k["aci"], 4),
                  (k["eylem"] or {}).get("anim")) for k in a.kayit] for ad, a in ak.items()}
out["cizelge_ayni"] = cizelge(None) == cizelge(True) == cizelge(False)

# ---- 4. mutasyon ----
z = Image.open("Simsek_Kol_Kaynak/textures/entity/aktor/zisa.png").convert("RGBA")
za = pil_alfa(z)
out["m_sutun"] = F.skin_ince_mi(64, 64, lambda x, y: za(x - 2, y))
out["m_ters"] = ters_uyusmayan
z2 = z.copy()
z2.putpixel((54, 31), (255, 255, 255, 255))
out["m_piksel"] = F.skin_ince_mi(64, 64, pil_alfa(z2))
print(json.dumps(out))
`;
const sen = {
  fps: 24, sure: 2.5,
  aktorler: {
    z: { skin: "x.png", isim: "Zisa", set: "yumruk", konum: [-1.6, 0], bak: "d" },
    d: { skin: "y.png", isim: "Asker", set: "yumruk", konum: [1.6, 0], bak: "z" }
  },
  olaylar: [{ t: 0.3, aktor: "z", vur: "oto", hedef: "d" }, { t: 1.4, aktor: "d", vur: "oto", hedef: "z" }],
  kamera: [{ t: 0, aci: "genis", a: "z", b: "d" }]
};
const r = JSON.parse(execFileSync("python3", ["-c", py], { cwd: KOK, input: JSON.stringify(sen), encoding: "utf8", maxBuffer: 1 << 26 }));

console.log("=== 1. GEOMETRI ===");
kontrol("iki modelde ayni kemikler, yalniz dort kol kemigi farkli",
        r.ayni_adlar && JSON.stringify(r.farkli) === JSON.stringify(["leftArm", "leftSleeve", "rightArm", "rightSleeve"]),
        JSON.stringify(r.farkli));
kontrol("ince kol 3 px, alt ucu y 11.5, pivot y 21.5 (Java'nin ince kolu)",
        Object.values(r.ince_kol).every((x) => x[0] === 3 && x[1] === 11.5 && x[2] === 21.5), JSON.stringify(r.ince_kol));
kontrol("iki geometri de ureticinin (kol_uret.aktor_geometrisi) ciktisi", r.uretec.every(Boolean), JSON.stringify(r.uretec));
kontrol("genis + formsuz + dizsiz aktor eski geometriyi aliyor (ayni nesne)", r.genis_ayni);
kontrol("ince + diz: kollar ince, bacaklar dizli", r.ince_diz);
kontrol("formlu genis aktorun geometrisi eskisi", r.form_ayni);

console.log("\n=== 2. ALGILAMA ===");
kontrol("filmin olcusu oyununkiyle (kol_uret.aktor_ince_mi) her skinde ayni", r.uyusmayan.length === 0 && r.skin_sayisi >= 10,
        r.skin_sayisi + " skin" + (r.uyusmayan.length ? ", uyusmayan " + r.uyusmayan.join(", ") : ""));
kontrol("Blender'in satir sirasiyla (alttan uste) okununca da ayni", r.bpy_uyusmayan.length === 0, r.bpy_uyusmayan.join(", "));
kontrol("ince olan yalniz Zisa", JSON.stringify(r.ince_olanlar) === JSON.stringify(["zisa.png"]), JSON.stringify(r.ince_olanlar));
kontrol("1. bolum senaryolarinin butun skinleri genis (eski filmler degismez)",
        Object.keys(r.bolum1).length >= 4 && Object.values(r.bolum1).every((x) => x === false), JSON.stringify(r.bolum1));
kontrol("64x64 olmayan skin genis sayiliyor (oyundaki gibi)", r.buyuk_genis);

console.log("\n=== 3. AYAR ===");
kontrol("\"ince\" yalniz true / false / yazilmaz; baskasi HATA", r.ayar.every(Boolean), JSON.stringify(r.ayar));
kontrol("ince + form HATA, yanlis deger HATA, genis + form ve yazilmayan gecerli",
        JSON.stringify(r.aktor_hata) === JSON.stringify([true, true, false, false]), JSON.stringify(r.aktor_hata));
kontrol("yazilmayan ayar skinden olculecek (None), yazilan aynen", r.aktor_ince[0] === null && r.aktor_ince[1] === true,
        JSON.stringify(r.aktor_ince));
kontrol("genis aktorde kol pivotu sozlugu bos (ortak tablo, eskisi bire bir)", Object.keys(r.pivot_genis).length === 0);
kontrol("ince aktorde dort kol pivotu y 21.5, x +-5",
        Object.keys(r.pivot_ince).length === 4 && Object.values(r.pivot_ince).every((p) => p[1] === 21.5 && Math.abs(p[0]) === 5),
        JSON.stringify(r.pivot_ince));
kontrol("zaman cizelgesi inceden etkilenmiyor (konum, aci, vurus bire bir)", r.cizelge_ayni);

console.log("\n=== 4. MUTASYON ===");
kontrol("olcu iki sutun kayinca Zisa genis cikiyor", r.m_sutun === false);
kontrol("satirlar ustten alta okununca en az bir skin yanlis cikiyor", r.m_ters.length > 0, r.m_ters.join(", "));
kontrol("Zisa'nin bos sutununa tek piksel boyaninca genis cikiyor", r.m_piksel === false);

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> ince kol: model, algilama ve film araci tamam");
process.exit(hata ? 1 : 0);
