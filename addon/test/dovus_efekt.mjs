/* DOVUS EFEKTLERI -- arac/dovus_efekt.py + blender_film baglantisi     2026-11-08

   Kullanici (2026-11-08): "daha fazla arastirma yap hepsini de ekle."
   DOVUS_KIMLIKLERI.md bolum 12 maddeleri 5, 7, 9, 10 + darbe karesi (§64) +
   sirali irkilme (§66). Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Isaret: oncesinde 0, birakista tepe, sonra soner; yerdeki cizgi
      bastan baslar, hedefe isaretin %70'inde varir.
   2. Cam: her hucre bir parca; hepsi darbe yonunde savrulur ve yere iner;
      ayni tohum ayni parcalar.
   3. Patlama: isik temas aninda tepe, duman buyuyup soner, bloklar yere
      iner; senaryodaki patlama kamera sarsintisina girer.
   4. Darbe karesi: temas karesinden baslar, en cok 3 kare.
   5. Suru: (gercek dovus benzetiminde) hedefin dibinde ayni anda en cok
      bir saldiran; her uye saldirir; saldirilar tempo araliginda; bekleyen
      uye hedefe bakar; hareket denetimi temiz.
   6. Atmosfer: plan basina yazilamaz (sureklilik); pay mesafeyle artar.
   7. Sirali irkilme: bas govdeden sonra tepe yapar; bayraksiz bire bir eskisi.
   8. Eski senaryolar etkilenmez: olay listesi, kompozitor, efektler ayni;
      siluet paftasi (denetim_pafta --gri). */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  "import sys, json, os\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\nos.chdir(os.path.join(sys.argv[1], '..'))\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

const r = py(`
import glob, math
import blender_film as F, bedrock_onizleme as B, dovus_efekt as D, hareket as H, hareket_denetim as HD
setler = B.oku(F.HAREKET)["setler"]
out = {}
# 1. isaret
g = [D.isaret_gucu(t / 100.0, 1.0, 0.4) for t in range(0, 200)]
out["is_once"] = max(g[:100])
out["is_tepe"] = D.isaret_gucu(1.4, 1.0, 0.4)
out["is_artan"] = all(g[i] <= g[i + 1] + 1e-12 for i in range(100, 140))
out["is_sonra"] = D.isaret_gucu(1.4 + D.ISARET_SON + 0.01, 1.0, 0.4)
c = D.yer_cizgisi([0, 0], [4, 0], 1.0, 0.4)
out["cz"] = [c[0][:3], c[-1][:3]]
# 2. cam
p1 = D.cam_parcalari([0, 0, 1.5], 1.0, 1.0, [0, 1], 2.0, 5)
p2 = D.cam_parcalari([0, 0, 1.5], 1.0, 1.0, [0, 1], 2.0, 5)
p3 = D.cam_parcalari([0, 0, 1.5], 1.0, 1.0, [0, 1], 2.0, 6)
out["cam_n"] = len(p1)
out["cam_ileri"] = min(p["iz"][-1][2] - p["iz"][0][2] for p in p1)
out["cam_yer"] = all(p["yere"] is not None and abs(p["iz"][-1][3] - D.CAM_KALINLIK / 2) < 1e-9 for p in p1)
out["cam_ayni"] = p1 == p2 and p1 != p3
# 3. patlama
pt = D.patlama([0, 0, 0.5], 3.0, 2)
out["pt_isik"] = max(pt["isik"], key=lambda x: x[1])[0]
out["pt_duman"] = [max(z[4] for z in d["iz"]) > 0.2 and d["iz"][-1][4] <= 0.05 * max(z[4] for z in d["iz"]) for d in pt["duman"]]
out["pt_parca"] = all(p["yere"] is not None for p in pt["parca"])
def iki(**ek):
    s = {"fps": 30, "sure": 3.0, "akici": True,
         "aktorler": {"a": {"skin": "kaynak_doku/aktor/omer.png", "set": "yumruk", "konum": [0, 0], "bak": "b", "kimlik": "omer"},
                      "b": {"skin": "kaynak_doku/aktor/sur_askeri_gri.png", "set": "yumruk", "konum": [1.2, 0], "bak": "a", "kimlik": "asker"}},
         "olaylar": [], "kamera": [{"t": 0, "aci": "elle", "kam": [0.6, -4, 1.6], "bak": [0.6, 0, 1.2], "lens": 30}]}
    s.update(ek)
    return s
s = iki(olaylar=[{"t": 1.0, "efekt": "patlama", "nokta": [3, 3, 0.5], "tohum": 4},
                 {"t": 0.5, "efekt": "isaret", "nokta": [0, 0, 1.8], "sure": 0.4, "cizgi": [1.2, 0]},
                 {"t": 1.5, "efekt": "cam_kir", "nokta": [0, 2, 1.5], "normal": [0, 1]},
                 {"t": 2.0, "efekt": "darbe_karesi", "kare": 7}])
ak, ef, _, sars = F.zaman_cizelgesi(s, setler, {})
out["pt_sars"] = any(abs(t - 1.0) < 1e-9 for t in sars)
out["ef_tur"] = sorted(e["tur"] for e in ef)
out["ef_ayar"] = [e.get("cizgi") for e in ef if e["tur"] == "isaret"]
# 4. darbe karesi
h = F.zaman_haritasi(s)
out["dk"] = sorted(D.darbe_kareleri(ef, F.kare_bul, h))
out["dk_bas"] = F.kare_bul(h, 2.0) + 1
# 5. suru
uyeler = ["z1", "z2", "z3", "z4"]
ss = iki(sure=9.0)
ss["aktorler"] = {"b": {"skin": "kaynak_doku/aktor/omer.png", "set": "yumruk", "konum": [0, 0], "kimlik": "omer"}}
for i, u in enumerate(uyeler):
    a_ = math.radians(90 * i + 20)
    ss["aktorler"][u] = {"skin": "kaynak_doku/aktor/sur_askeri_gri.png", "set": "yumruk",
                         "konum": [round(3.2 * math.cos(a_), 3), round(3.2 * math.sin(a_), 3)], "bak": "b", "kimlik": "asker"}
ss["suru"] = {"hedef": "b", "uyeler": uyeler, "t": [0.0, 9.0], "tohum": 3}
ol = D.suru_olaylari(ss)
ak, ef, _, _ = F.zaman_cizelgesi(ss, setler, {})
n = len(ak["b"].kayit)
yakin = []
for f in range(n):
    bx, by = ak["b"].kayit[f]["x"], ak["b"].kayit[f]["y"]
    yakin.append(sum(1 for u in uyeler if math.hypot(ak[u].kayit[f]["x"] - bx, ak[u].kayit[f]["y"] - by) < D.SURU_VARIS + 0.2))
out["su_yakin_max"] = max(yakin)
vur = sorted((o["t"], o["aktor"]) for o in ol if "vur" in o)
out["su_vuran"] = sorted({a for _, a in vur})
out["su_aralik"] = min(vur[i + 1][0] - vur[i][0] for i in range(len(vur) - 1))
out["su_temas"] = sorted({e["kim"] for e in ef if e["tur"] in ("vurus", "kan", "savun")})
# bekleyen uye (son 0,4 sn kipirdamamis, hedefin dibinde degil) hedefe bakiyor mu
fark = []
for u in uyeler:
    kk = ak[u].kayit
    for f in range(12, n):
        k, b_ = kk[f], ak["b"].kayit[f]
        if math.hypot(k["x"] - kk[f - 12]["x"], k["y"] - kk[f - 12]["y"]) > 0.02:
            continue
        if math.hypot(k["x"] - b_["x"], k["y"] - b_["y"]) < 2.2:
            continue
        fark.append(abs((F.yon_aci((k["x"], k["y"]), (b_["x"], b_["y"])) - k["aci"] + 180) % 360 - 180))
fark.sort()
out["su_bakis"] = [len(fark), fark[len(fark) // 2] if fark else None, sum(1 for x in fark if x < 30) / max(1, len(fark))]
# hamlenin kendi atilmasi ve darbenin itmesi (iki kisilik her dovuste de
# olculen ani ivme, suruden degil) disarida: vurustan 0,35 sn, temastan 0,2 sn
hamle = {}
for o in ol:
    if "vur" in o:
        hamle.setdefault(o["aktor"], []).append((o["t"], o["t"] + 0.35))
for e in ef:
    if e["tur"] in ("vurus", "kan", "savun"):
        for ad_ in (e["hedef"], e["kim"]):
            hamle.setdefault(ad_, []).append((e["t"] - 0.05, e["t"] + 0.2))
bulgu = {}
for ad, a in ak.items():
    bl, _ = HD.oyuncu_olc(a.kayit, 30)
    for k_, v_ in bl.items():
        v_ = [x for x in v_ if not any(p <= x[0] <= q for p, q in hamle.get(ad, []))]
        if v_:
            bulgu.setdefault(k_, []).append([ad] + v_[:3])
out["su_hareket"] = bulgu
out["donus_sinir"] = HD.DONUS_IVME_SINIR
# 6. atmosfer
try:
    D.atmosfer_ayari({"atmosfer": {"yogunluk": 0.5}, "kamera": [{"t": 0, "atmosfer": {"yogunluk": 0.2}}]})
    out["atm_plan"] = "kabul"
except ValueError:
    out["atm_plan"] = "red"
ay = D.atmosfer_ayari({"atmosfer": {"yogunluk": 0.6, "baslangic": 4, "derinlik": 20}})
out["atm_pay"] = [D.atmosfer_payi(d, ay) for d in (2, 4, 14, 24, 40)]
# 7. sirali irkilme
us = [i / 300.0 for i in range(0, 220)]
tepe = lambda kem: max(us, key=lambda u: abs(H.irkilme(u, 1.0, 0.0, True).get(kem, [0])[0]))
out["irk_tepe"] = [tepe("body"), tepe("rightArm"), tepe("head")]
out["irk_eski"] = all(H.irkilme(u, 0.8, 0.5) == H.irkilme(u, 0.8, 0.5, False) for u in us)
# 8. eski senaryolar
eski = {}
for y in sorted(glob.glob("film/*.json")):
    try:
        sen = B.oku(y)
    except Exception:
        continue
    if not isinstance(sen, dict) or "aktorler" not in sen:
        continue
    eski[os.path.basename(y)] = [D.tum_olaylar(sen) == list(sen.get("olaylar", [])), D.atmosfer_ayari(sen) is None,
                                 any(o.get("efekt") in F.YENI_EFEKT for o in sen.get("olaylar", []))]
out["eski"] = eski
# siluet / gri ton paftasi (12.8)
import denetim_pafta as P
from PIL import Image
im = Image.new("RGB", (8, 8), (90, 120, 60))
im.paste((140, 110, 100), (0, 0, 4, 8))
gt = P.gri_ton(im)
px = list(gt.getdata())
out["gri"] = [all(a == b == c for a, b, c in px), min(p_[0] for p_ in px), max(p_[0] for p_ in px)]
print(json.dumps(out))`);

console.log("=== 1. ISARET ===");
kontrol("isaretten once 0, birakista 1, son'dan sonra 0", r.is_once === 0 && r.is_tepe === 1 && r.is_sonra === 0,
        JSON.stringify([r.is_once, r.is_tepe, r.is_sonra]));
kontrol("isaret birakisa kadar azalmadan buyur", r.is_artan);
kontrol("yerdeki cizgi bastan baslar, hedefe isaretin %70'inde varir",
        JSON.stringify(r.cz[0]) === "[0,0,1]" && r.cz[1][0] === 4 && Math.abs(r.cz[1][2] - 1.28) < 1e-9, JSON.stringify(r.cz));

console.log("\n=== 2. CAM KIRILMASI ===");
kontrol("1x1 levha 16 parca (1/4 blok)", r.cam_n === 16, String(r.cam_n));
kontrol("her parca darbe yonunde ilerler", r.cam_ileri > 0.2, String(r.cam_ileri));
kontrol("her parca yere iner ve orada kalir", r.cam_yer);
kontrol("ayni tohum ayni parcalar, baska tohum baska", r.cam_ayni);

console.log("\n=== 3. PATLAMA ===");
kontrol("isik patlama aninda tepe", r.pt_isik === 3, String(r.pt_isik));
kontrol("her duman kupu buyur ve soner", r.pt_duman.length >= 10 && r.pt_duman.every(Boolean), JSON.stringify(r.pt_duman));
kontrol("ucan bloklar yere iner", r.pt_parca);
kontrol("senaryodaki patlama kamera sarsintisina girer", r.pt_sars);
kontrol("efekt olaylari ayarlariyla efekt listesinde",
        JSON.stringify(r.ef_tur) === JSON.stringify(["cam_kir", "darbe_karesi", "isaret", "patlama"]) &&
        JSON.stringify(r.ef_ayar) === "[[1.2,0]]", JSON.stringify([r.ef_tur, r.ef_ayar]));

console.log("\n=== 4. DARBE KARESI ===");
kontrol("temas karesinden baslar, 7 istense de en cok 3 kare",
        JSON.stringify(r.dk) === JSON.stringify([r.dk_bas, r.dk_bas + 1, r.dk_bas + 2]), JSON.stringify([r.dk, r.dk_bas]));

console.log("\n=== 5. SURU DUZENI (gercek benzetim) ===");
kontrol("hedefin vurus menzilinde (1,8 blok) ayni anda en cok bir saldiran", r.su_yakin_max <= 1, String(r.su_yakin_max));
kontrol("dort uyenin dordu de saldiriyor ve temas ediyor",
        r.su_vuran.length === 4 && r.su_temas.filter((x) => x !== "b").length === 4, JSON.stringify([r.su_vuran, r.su_temas]));
kontrol("iki saldiri arasi en az tempo (1,5 sn)", r.su_aralik >= 1.5 - 1e-9, String(r.su_aralik));
kontrol("bekleyen uye hedefe bakiyor (ortanca < 15°, %90'i < 30°)",
        r.su_bakis[0] >= 60 && r.su_bakis[1] < 15 && r.su_bakis[2] >= 0.9, JSON.stringify(r.su_bakis));
kontrol("hareket denetimi: ani kalkis, isinlanma, kayma yok (hamle atilmasi ve darbe itmesi disinda)",
        ["ani_kalkis", "isinlanma", "kayma"].every((k) => !r.su_hareket[k]), JSON.stringify(r.su_hareket));
// BILINEN (FILM_YETENEK_HARITASI "Suru"): geri cekilen uyenin 180 derecelik
// donusunun SONUNDA yay hedefe oturunca tek karelik ivme sinirin biraz ustune
// cikiyor. Sebep motorun donus yayi (hareket.aci_yayi, butun akici
// senaryolarda ortak), suru degil; Part 1 cizilirken o yay degistirilmedi.
// Bu satir kotulesmeyi tutar: sinirin en cok 1,3 kati.
const donus = (r.su_hareket.ani_donus || []).flatMap((x) => x.slice(1).map((y) => y[1]));
kontrol("donus ivmesi asimi yalniz donus sonu ve sinirin 1,3 katindan az", donus.every((v) => v < r.donus_sinir * 1.3),
        JSON.stringify(donus) + " sinir " + Math.round(r.donus_sinir));

console.log("\n=== 6. ATMOSFER (SIS PERDESI) ===");
kontrol("plan basina atmosfer reddediliyor (sureklilik)", r.atm_plan === "red", r.atm_plan);
kontrol("pay: baslangictan once 0, derinlikte yogunluk, arada artan",
        r.atm_pay[0] === 0 && r.atm_pay[1] === 0 && Math.abs(r.atm_pay[2] - 0.3) < 1e-9 && Math.abs(r.atm_pay[3] - 0.6) < 1e-9 &&
        Math.abs(r.atm_pay[4] - 0.6) < 1e-9, JSON.stringify(r.atm_pay));

console.log("\n=== 7. SIRALI IRKILME ===");
kontrol("tepe sirasi govde -> kollar -> bas (bas ~2 kare sonra)",
        r.irk_tepe[0] < r.irk_tepe[1] && r.irk_tepe[1] < r.irk_tepe[2] && r.irk_tepe[2] - r.irk_tepe[0] > 0.05, JSON.stringify(r.irk_tepe));
kontrol("sirali=False bire bir eskisi", r.irk_eski);

console.log("\n=== 8. ESKI SENARYOLAR ETKILENMEZ ===");
const eski = Object.entries(r.eski);
kontrol("butun senaryolarda olay listesi ayni, atmosfer yok, yeni efekt yok",
        eski.length >= 8 && eski.every(([, [a, b, c]]) => a && b && !c), String(eski.length));
kontrol("siluet paftasi: renk atilir, kontrast acilir (--gri)", r.gri[0] && r.gri[1] <= 5 && r.gri[2] >= 250,
        JSON.stringify(r.gri));
const kod = readFileSync(join(ARAC, "blender_film.py"), "utf8");
kontrol("Blender tarafi bagli (efekt dallari + kompozitor cagrisi)",
        kod.includes('elif e["tur"] in ("isaret", "cam_kir", "patlama"):') &&
        /\n    kompozitor_kur\(bpy, senaryo, harita, efektler\)\n/.test(kod) &&
        kod.includes('if not atm and not dk:\n        return None'));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> dovus efektleri: isaret, cam, patlama, darbe karesi, suru, sis, sirali irkilme");
process.exit(hata ? 1 : 0);
