/* BLOK MEKAN, YER CEKIMI VE ZIPLA                               v7.99.16

   Film araci blokla kurulan mekanlari (arac/mekan.py: bataklik, hanedan)
   aciyor. Blender gerekmiyor: zemin, zaman cizelgesi ve kamera denetimi
   saf Python.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Zemin bloklardan: kulubenin onu 0, veranda ve taban 4, yatagin ustu
      4 + 9/16; kulubenin icindeki aktor CATIYA basmiyor (Minecraft'in 0,6
      bloklik adimi); basamak yarim yarim cikiliyor.
   2. Eksen donusumu: Blender (x, y) -> Minecraft (x, -y); senaryoya
      yazilan yatak noktasi bilgi'deki yatak blogunda.
   3. Zipla Minecraft'in tik hesabi: tepe +1,2522 blok, hedefe tam inis,
      inis sesi. Kenardan yurunen aktor de yer cekimiyle duser.
   4. Inis cokmesi: uyluk theta, baldir 2 theta -- ayak kalcanin altinda
      kalir, govdenin alcalmasi 12(1 - cos theta) px.
   5. Zipla blok mekan disinda HATA (ormanda yer cekimi yok, 1. bolum degismez).
   6. Kamera denetimi: duvarin icindeki kamera DUVAR; duvar ve sarkan
      sarmasik perdesi gorusu kesiyor (ilk film denemesinde sarmasik
      kareyi kapliyordu, denetim "0 sorun" demisti); blok mekanda hayali
      orman agaci yok.
   7. Ufuk ortasi bos: kare cerceve mekanin sinirindan, hanedanda surdan
      baslayan halka (tam disk havuz ve tarla sularini ortuyordu). */
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
const py = (kod) => JSON.parse(execFileSync("python3", ["-c",
  "import sys, json, math\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

// Kulubeden atlayis: icerden kapiya, verandaya, asagi.
const ATLA = `
SEN = {"fps": 30, "sure": 5.0, "akici": True, "mekan": "bataklik",
       "aktorler": {"b": {"skin": "Simsek_Kol_Kaynak/textures/entity/aktor/uzak_akraba.png",
                          "konum": [0.5, -0.5], "kat": 4, "aci": 0}},
       "olaylar": [{"t": 0.4, "aktor": "b", "git": [1.5, 1.3]},
                   {"t": 1.6, "aktor": "b", "git": [1.4, 3.65]},
                   {"t": 2.9, "aktor": "b", "zipla": [1.4, 7.5]}],
       "kamera": [{"t": 0.0, "aci": "elle", "kam": [4.2, 15.5, 2.3], "bak": [1.0, 4.5, 3.0], "lens": 30, "a": "b"}]}
import blender_film as F, bedrock_onizleme as B
SETLER = B.oku(F.HAREKET)["setler"]
`;

console.log("=== 1-2. ZEMIN VE EKSEN ===");
{
  const r = py(`
import mekan as MK
M = MK.yukle({"mekan": "bataklik"})
k = M.bilgi["kulube"]
B_ = lambda x, z: (x + 0.5, -(z + 0.5))           # Minecraft blok ortasi -> Blender
yb = k["yatak"]["bas"]
H = MK.yukle({"mekan": "hanedan"})
# hanedanda bir basamak: alcak yarisi 0,5, yuksek yarisi 1,0
bas = None
for q in H.bloklar:
    if q["t"].endswith("_stairs") and not q.get("s", {}).get("upside_down_bit"):
        x, y, z = q["p"]
        if (x, y + 1, z) not in H.harita and (x, y - 1, z) in H.harita:
            bas = q; break
x, y, z = bas["p"]
from blok_kur import BASAMAK_YON
f = BASAMAK_YON[bas["s"]["weirdo_direction"]]
yuksek = (x + 0.5 + f[0] * 0.25, -(z + 0.5 + f[1] * 0.25))
alcak = (x + 0.5 - f[0] * 0.25, -(z + 0.5 - f[1] * 0.25))
print(json.dumps({
  "on": M.zemin(*B_(0, -8), ust=0.0), "veranda": M.zemin(*B_(0, -4), ust=4.0),
  "ic": M.zemin(*B_(0, 0), ust=4.0), "cati": M.zemin(*B_(0, 0)),
  "yatak": M.yuzey(*B_(yb[0], yb[2]), ust=4.0), "yatak_y": yb[1],
  "duvar_dibi": M.zemin(*B_(0, 1), ust=4.0),
  "bas_yuksek": H.yuzey(*yuksek, ust=y + 0.5) - y, "bas_alcak": H.yuzey(*alcak, ust=y) - y,
  "bas_alttan": H.yuzey(*yuksek, ust=y - 0.1) - y}))`);
  kontrol("kulubenin onu 0", r.on === 0, String(r.on));
  kontrol("veranda 4, kulubenin tabani 4", r.veranda === 4 && r.ic === 4, r.veranda + " / " + r.ic);
  kontrol("icerdeki aktor catiya basmiyor (ust yoksa cati 8)", r.ic === 4 && r.cati === 8, r.ic + " / " + r.cati);
  kontrol("yatagin ustu taban + 9/16", Math.abs(r.yatak - (r.yatak_y + 9 / 16)) < 1e-9, String(r.yatak));
  kontrol("basamak: alcak yarisi 0,5, yuksek yarisi 1,0", r.bas_alcak === 0.5 && r.bas_yuksek === 1.0,
          r.bas_alcak + " / " + r.bas_yuksek);
  kontrol("basamagin yuksek yarisina yerden tek adimda cikilmiyor (0,6 kurali)", r.bas_alttan < 1.0, String(r.bas_alttan));
}

console.log("\n=== 3. ZIPLA VE DUSME (Minecraft tik hesabi) ===");
{
  const r = py(ATLA + `
ak, ef, _, _ = F.zaman_cizelgesi(SEN, SETLER, F.film_pozlari(True))
k = ak["b"].kayit
# kalkistan onceki kare: akici kalkis olayin karesinde basliyor; 2,9'un
# kayan noktali karesi (2,8999...) artik havada, payli secilir
once = [q for q in k if q["t"] < 2.9 - 1e-6][-1]
tepe = max(q["z"] for q in k if q["t"] >= 2.9)
son = k[-1]
inis = [e for e in ef if e.get("ses") == "inis"]
# kenardan yurunerek dusme (ziplamasiz)
S2 = json.loads(json.dumps(SEN)); S2["olaylar"] = S2["olaylar"][:2] + [{"t": 2.9, "aktor": "b", "git": [1.4, 7.5]}]
ak2, ef2, _, _ = F.zaman_cizelgesi(S2, SETLER, F.film_pozlari(True))
k2 = ak2["b"].kayit
dus = [q for q in k2 if 0.05 < q["z"] < 3.95]
import hareket as H
yer = [i for i, q in enumerate(k) if q["t"] >= 2.9 and q["z"] == 0]
i0 = yer[0]
temas = k[i0]
hizlar = [math.hypot(k[i]["x"] - k[i - 1]["x"], k[i]["y"] - k[i - 1]["y"]) * 30 for i in range(i0, len(k))]
ucus = [math.hypot(k[i]["x"] - k[i - 1]["x"], k[i]["y"] - k[i - 1]["y"]) * 30 for i in range(1, i0) if k[i]["t"] > 3.0]
print(json.dumps({"z_once": once["z"], "tepe": tepe - once["z"], "son": [son["x"], son["y"], son["z"]],
                  "temas": [temas["x"], temas["y"]], "kayma": son["y"] - 7.5, "v_ucus": ucus[-1],
                  "ilk_kayma": hizlar[1], "azalan": all(hizlar[j + 1] <= hizlar[j] + 1e-9 for j in range(len(hizlar) - 1)),
                  "inis": len(inis), "dus_kare": len(dus), "son2": k2[-1]["z"],
                  "inis2": len([e for e in ef2 if e.get("ses") == "inis"]),
                  "yorunge_tepe": max(H.yorunge(0, H.ZIPLA_TIK, u / 1000.0)[0] for u in range(0, 800))}))`);
  kontrol("zipla tepesi +1,2522 blok (Minecraft)", Math.abs(r.tepe - 1.2522) < 2e-3, r.tepe.toFixed(4));
  // akici: yere degme hedefte, sonra yatay hiz surtunmeyle soner (Minecraft
  // gibi ~0,5 blok kayma; eskisi tek karede 4,5 -> 0 duruyordu, robotik)
  kontrol("yere degme hedefte (degme karesi hedefin en cok bir kare kaymasi ilerisinde)",
          Math.abs(r.temas[0] - 1.4) < 1e-3 && r.temas[1] >= 7.5 - 1e-9 && r.temas[1] - 7.5 < r.v_ucus / 30 + 1e-9,
          JSON.stringify(r.temas));
  kontrol("iniste kayma: hiz soner, 0,3-0,8 blok, tek karede durmaz", r.kayma > 0.3 && r.kayma < 0.8 && r.azalan && r.ilk_kayma > 0.5 * r.v_ucus,
          "kayma " + r.kayma.toFixed(3) + ", ilk kare " + r.ilk_kayma.toFixed(2) + " / ucus " + r.v_ucus.toFixed(2));
  kontrol("iniste ses (dusus/inis)", r.inis === 1, String(r.inis));
  kontrol("kenardan yuruyen aktor yer cekimiyle dusuyor (ara karelerde havada) ve iniyor",
          r.dus_kare >= 3 && r.son2 === 0 && r.inis2 === 1, r.dus_kare + " kare, inis " + r.inis2);
}

console.log("\n=== 4. INIS COKMESI ===");
{
  const r = py(`
import hareket as H
bob, ek = H.inis_cokmesi(0.07, 1.0, 1.0, True)
th = -ek["rightLeg"][0]
_, ek2 = H.inis_cokmesi(0.07, 1.0, 1.0, False)
bob2 = H.inis_cokmesi(0.07, 1.0, 1.0, False)[0]
print(json.dumps({"bob": bob, "th": th, "alt": ek["rightLegAlt"][0], "sol": [ek["leftLeg"][0], ek["leftLegAlt"][0]],
                  "beklenen": -12 * (1 - math.cos(math.radians(th))) / 16, "dizsiz_bacak": "rightLeg" in ek2,
                  "dizsiz_bob": bob2, "bitti": H.inis_cokmesi(0.7)}))`);
  kontrol("baldir uylugun iki kati geri (ayak kalcanin altinda)", Math.abs(r.alt - 2 * r.th) < 1e-9 && r.th > 30,
          r.th.toFixed(1) + " / " + r.alt.toFixed(1));
  kontrol("govdenin alcalmasi 12(1 - cos theta) px", Math.abs(r.bob - r.beklenen) < 1e-12, r.bob.toFixed(4));
  kontrol("dizsiz modelde bacak bukulmuyor, govde alcalmiyor", !r.dizsiz_bacak && r.dizsiz_bob === 0);
  kontrol("0,6 sn sonra bitti", r.bitti[0] === 0 && Object.keys(r.bitti[1]).length === 0);
}

console.log("\n=== 5. ZIPLA YALNIZ BLOK MEKANDA ===");
{
  const r = py(ATLA + `
S3 = json.loads(json.dumps(SEN)); del S3["mekan"]
try:
    F.zaman_cizelgesi(S3, SETLER, F.film_pozlari(True)); print(json.dumps({"hata": None}))
except ValueError as e:
    print(json.dumps({"hata": str(e)}))`);
  kontrol("ormanda zipla HATA veriyor", !!r.hata, String(r.hata));
}

console.log("\n=== 6. KAMERA DENETIMI ===");
{
  const r = py(ATLA + `
import kamera_denetim as KD, mekan as MK
def yalniz_sarmasik():
    """Iki yaninda 3'er blok bos bir sarmasik: cizgiyi YALNIZ o kesiyor
    (ust satirdaki kamerada yapraklar da kesiyordu, sarmasik bozmasi kacmisti)."""
    M = MK.yukle(SEN)
    for (x, y, z), q in sorted(M.harita.items()):
        if q["t"] == "vine" and all((x + d, y, z) not in M.harita for d in (-3, -2, -1, 1, 2, 3)):
            return M.gorus_acik((x - 2.5, -(z + 0.5), y + 0.5), (x + 3.5, -(z + 0.5), y + 0.5))
    return None
def kurallar(kam, sure=1.0, verandada=False):
    s = json.loads(json.dumps(SEN)); s["sure"] = sure; s["kamera"] = [kam]
    if verandada:                                   # Baris verandada duruyor
        s["aktorler"]["b"]["konum"] = [1.4, 3.6]; s["olaylar"] = []
    return sorted({q["kural"] for q in KD.denetle(s)[0]})
print(json.dumps({
  "duvarda": kurallar({"t": 0, "aci": "elle", "kam": [-1.5, -0.5, 4.5], "bak": "b", "a": "b", "lens": 24}),
  "arkasinda": kurallar({"t": 0, "aci": "elle", "kam": [0.5, -9.5, 5.3], "bak": "b", "a": "b", "lens": 24}),
  "perde": kurallar({"t": 0, "aci": "elle", "kam": [7.5, 9.5, 2.2], "bak": [1.2, 3.5, 2.8], "a": "b", "lens": 24}, 5.0),
  "acik": kurallar({"t": 0, "aci": "elle", "kam": [4.2, 15.5, 2.3], "bak": [1.0, 4.5, 3.0], "a": "b", "lens": 30}, 0.5, True),
  "agac": len(KD.agac_kutulari(SEN)),
  "yalniz_sarmasik": yalniz_sarmasik()}))`);
  kontrol("duvarin icindeki kamera DUVAR", r.duvarda.includes("DUVAR"), r.duvarda.join(","));
  kontrol("duvarin arkasindaki aktor KADRAJ (blok kapatiyor)", r.arkasinda.includes("KADRAJ"), r.arkasinda.join(","));
  kontrol("sarkan sarmasik perdesi gorusu kesiyor", r.perde.includes("KADRAJ"), r.perde.join(","));
  kontrol("yalniz sarmasigin kestigi cizgi kapali", r.yalniz_sarmasik === false, String(r.yalniz_sarmasik));
  kontrol("acik gorus temiz (kuru seritten verandadaki Baris)", r.acik.length === 0, r.acik.join(",") || "temiz");
  kontrol("blok mekanda hayali orman agaci yok", r.agac === 0, String(r.agac));
}

console.log("\n=== 7. UFUK ===");
{
  const r = py(`
import mekan as MK, kulube, hanedan
k, y = MK.ufuk_ormesi(MK.yukle({"mekan": "bataklik"}).ufuk)
ic = sorted({abs(round(v[0], 6)) for v in k[4:]})
k2, y2 = MK.ufuk_ormesi(MK.yukle({"mekan": "hanedan"}).ufuk)
r_ic = min(math.hypot(v[0], v[1]) for v in k2)
print(json.dumps({"ic": ic, "yaricap": kulube.YARICAP, "h": k[0][2], "r_ic": r_ic, "sur": hanedan.SUR_YARICAP,
                  "yuz": len(y), "yuz2": len(y2)}))`);
  kontrol("bataklik: ortasi bos kare cerceve, mekanin sinirindan",
          r.yuz === 4 && JSON.stringify(r.ic) === JSON.stringify([r.yaricap, r.yaricap + 1]) && r.h < 0,
          JSON.stringify(r.ic) + " h " + r.h);
  kontrol("hanedan: surdan baslayan halka", Math.abs(r.r_ic - r.sur) < 1e-6 && r.yuz2 > 32, r.r_ic.toFixed(2));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> mekan: zemin, zipla, inis ve kamera denetimi tutarli");
process.exit(hata ? 1 : 0);
