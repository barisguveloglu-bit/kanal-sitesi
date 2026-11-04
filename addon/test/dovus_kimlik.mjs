/* DOVUS KIMLIKLERI -- karakterlerin dovus kimligi film aracinda   v7.99.16

   Kullanici (2026-11-04): "bu ogrendigin seylerden hepsini karakterlerimize
   yedir, entegre et." Arastirma REFERANS_DOVUS_KOREOGRAFI.md (61 konu),
   karakterlere islenmesi DOVUS_KIMLIKLERI.md, aractaki karsiligi
   arac/dovus_kimlik.py. Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Yedi kimlik var (Baris, Ice-man, Pipos, Omer, Zisa, cocukluk arkadasi,
      sur askeri), alanlari tam, bacak acilari <= 8 derece; belgede
      karsiliklari var.
   2. Dovus halinde nefes karaktere gore: Ice-man kipirtisiz (genlik
      <= %20), Baris hizli solur, Pipos yavas; genlik kimligin sayisi.
   3. Dovus halinde bekleme durusu: dururken tam (Baris'in beli 8 derece
      one), yururken soner; dovus disinda hic yok.
   4. Part 1'in alti senaryosu kimlik etiketi tasiyor ama dovus olmadigi
      icin pozlar etiketsiz haliyle BIRE BIR ayni.
   5. Hamle kunyesi dogrulamasi ve vurus donmasi (Saldiri II +1 kare).
   6. Bilinmeyen kimlik cizimden once hata. */
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
  "import sys, json, math\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

console.log("=== 1. YEDI KIMLIK, ALANLARI TAM ===");
{
  const r = py(`
import dovus_kimlik as DK
alan = ("tip", "taban", "agirlik", "bekleme", "nefes_sure", "nefes_genlik", "salinim", "ses", "cikis")
eksik = {ad: [a for a in alan if a not in k] for ad, k in DK.KIMLIKLER.items()}
bacak = max([abs(v) for k in DK.KIMLIKLER.values() for kem, d in k["bekleme"].items() if "Leg" in kem for v in d] or [0])
gecersiz = [ad for ad, k in DK.KIMLIKLER.items() if k["agirlik"] not in DK.AGIRLIK or k["nefes_sure"] <= 0
            or k["nefes_genlik"] < 0 or k["salinim"] < 0 or any(len(d) != 3 for d in k["bekleme"].values())]
print(json.dumps({"adlar": sorted(DK.KIMLIKLER), "eksik": {a: e for a, e in eksik.items() if e},
                  "bacak": bacak, "gecersiz": gecersiz}))`);
  kontrol("yedi kimlik", JSON.stringify(r.adlar) === JSON.stringify(["arkadas", "asker", "baris", "ice_man", "omer", "pipos", "zisa"]),
          r.adlar.join(" "));
  kontrol("her kimlikte butun alanlar, sayilar gecerli", Object.keys(r.eksik).length === 0 && r.gecersiz.length === 0,
          JSON.stringify(r.eksik) + " " + r.gecersiz.join(" "));
  kontrol("bacak acilari <= 8 derece (ayak zeminden kalkmaz)", r.bacak <= 8, r.bacak + " derece");
  const belge = readFileSync(join(BURADA, "..", "DOVUS_KIMLIKLERI.md"), "utf8");
  const baslik = ["Barış", "Ice-man", "Pipos", "Ömer", "Zisa", "Çocukluk arkadaşı", "Sur askerleri"];
  kontrol("belgede yedisinin de bolumu var", baslik.every((b) => new RegExp("^## \\d+\\. " + b, "m").test(belge)),
          baslik.filter((b) => !new RegExp("^## \\d+\\. " + b, "m").test(belge)).join(" "));
}

const ORTAK = `
import blender_film as F, bedrock_onizleme as B, dovus_kimlik as DK
setler = B.oku(F.HAREKET)["setler"]
anims = {}
anims.update(B.oku(F.ANIM_WOM)["animations"]); anims.update(B.oku(F.ANIM_AKTOR)["animations"])
anims.update(F.film_pozlari(True))
kem = ["root", "waist", "body", "head", "rightArm", "leftArm", "rightLeg", "leftLeg"]
def kos(kimlik, dovus=True, yuru=False, sure=12.0):
    akt = {"skin": "x.png", "konum": [0.0, 0.0], "bak": 0}
    if kimlik:
        akt["kimlik"] = kimlik
    ol = [{"t": 0.0, "aktor": "a", "dovus": True}] if dovus else []
    if yuru:
        ol.append({"t": 0.5, "aktor": "a", "git": [0.0, 40.0], "adim": 4.3})
    sen = {"fps": 30, "sure": sure, "akici": True, "aktorler": {"a": akt}, "olaylar": ol,
           "kamera": [{"t": 0, "aci": "genis", "a": "a"}]}
    ak, *_ = F.zaman_cizelgesi(sen, setler, anims)
    return ak["a"]
def pozlar(a):
    return [F.kare_pozu(a, k, kem, anims, setler)[0] for k in a.kayit]
def nefes_payi(kimlik):
    # nefesin pozdaki payi: nefes sabitleri sifirken cizilen pozla fark
    a = kos(kimlik)
    tam = pozlar(a)
    eski = (F.NEFES_BAS, F.NEFES_GOVDE, F.NEFES_KOL, F.AGIRLIK_SALINIM)
    F.NEFES_BAS = F.NEFES_GOVDE = F.NEFES_KOL = F.AGIRLIK_SALINIM = 0.0
    try:
        taban = pozlar(a)
    finally:
        F.NEFES_BAS, F.NEFES_GOVDE, F.NEFES_KOL, F.AGIRLIK_SALINIM = eski
    c = [t["head"][0][0][0] - b["head"][0][0][0] for t, b in zip(tam, taban)]
    gecis = sum(1 for i in range(1, len(c)) if (c[i - 1] < 0) != (c[i] < 0))
    return max(c) - min(c), gecis / 2.0
`;

console.log("\n=== 2. DOVUS HALINDE NEFES KARAKTERE GORE ===");
{
  const r = py(ORTAK + `
olcu = {ad: nefes_payi(ad) for ad in ("baris", "ice_man", "pipos")}
olcu["yok"] = nefes_payi(None)
print(json.dumps({"olcu": olcu, "genlik": {ad: DK.KIMLIKLER[ad]["nefes_genlik"] for ad in ("baris", "ice_man", "pipos")}}))`);
  const g = (ad) => r.olcu[ad][0], d = (ad) => r.olcu[ad][1];
  kontrol("Ice-man kipirtisiz: nefes genligi olagan nefesin <= %20'si", g("ice_man") <= 0.2 * g("yok"),
          (g("ice_man") / g("yok")).toFixed(3));
  kontrol("genlik kimligin sayisi (Baris 1,3; Pipos 0,8)",
          Math.abs(g("baris") / g("yok") - r.genlik.baris) < 0.05 && Math.abs(g("pipos") / g("yok") - r.genlik.pipos) < 0.05,
          (g("baris") / g("yok")).toFixed(3) + " / " + (g("pipos") / g("yok")).toFixed(3));
  kontrol("Baris hizli solur, Pipos yavas (12 sn'de dongu sayisi)", d("baris") > d("yok") && d("pipos") < d("yok"),
          "Baris " + d("baris") + ", olagan " + d("yok") + ", Pipos " + d("pipos"));
}

console.log("\n=== 3. BEKLEME DURUSU: DURURKEN TAM, YURURKEN SONER, DOVUS DISINDA YOK ===");
{
  const r = py(ORTAK + `
bel = lambda a, i: pozlar(a)[i]["waist"][0][0][0]
dur, dis, yok = kos("baris"), kos("baris", dovus=False), kos(None)
i = 60                                                        # 2. saniye, ayakta
yur, yur0 = kos("baris", yuru=True, sure=4.0), kos(None, yuru=True, sure=4.0)
j = 90                                                        # 3. saniye, tam yuruyuste
print(json.dumps({"dur": bel(dur, i) - bel(yok, i), "dis": bel(dis, i) - bel(yok, i),
                  "yur": bel(yur, j) - bel(yur0, j), "hizli": yur.kayit[j]["hizli"],
                  "beklenen": DK.KIMLIKLER["baris"]["bekleme"]["waist"][0],
                  "kayit_dovus": [dur.kayit[i].get("dovus"), dis.kayit[i].get("dovus"), "dovus" in yok.kayit[i]]}))`);
  kontrol("dovus halinde ayakta: Baris'in beli kimlikteki kadar one", Math.abs(r.dur - r.beklenen) < 1e-6,
          r.dur.toFixed(3) + " derece");
  kontrol("yururken bekleme durusu soner", Math.abs(r.yur) < 0.5, r.yur.toFixed(3) + " derece, hiz orani " + r.hizli.toFixed(2));
  kontrol("dovus disinda bekleme durusu yok", Math.abs(r.dis) < 1e-9, String(r.dis));
  kontrol("kayit dovus halini tasiyor; kimliksiz aktorde alan yok",
          r.kayit_dovus[0] === true && r.kayit_dovus[1] === false && r.kayit_dovus[2] === false, JSON.stringify(r.kayit_dovus));
}

console.log("\n=== 4. PART 1: KIMLIK ETIKETI VAR, CIZIM BIRE BIR AYNI ===");
{
  const r = py(ORTAK + `
import glob, copy, os
sonuc = {}
for yol in sorted(glob.glob(os.path.join(sys.argv[1], "..", "film", "bolum2_p1_*.json"))):
    s = json.load(open(yol))
    etiket = [ad for ad, v in s["aktorler"].items() if v.get("kimlik")]
    s0 = copy.deepcopy(s)
    for v in s0["aktorler"].values():
        v.pop("kimlik", None)
    ak1, *_ = F.zaman_cizelgesi(s, setler, anims)
    ak0, *_ = F.zaman_cizelgesi(s0, setler, anims)
    fark = 0; say = 0
    for ad in ak1:
        a1, a0 = ak1[ad], ak0[ad]
        for i in range(0, len(a1.kayit), 15):
            p1 = F.kare_pozu(a1, a1.kayit[i], kem, anims, setler)[0]
            p0 = F.kare_pozu(a0, a0.kayit[i], kem, anims, setler)[0]
            say += 1
            fark += p1 != p0
    sonuc[os.path.basename(yol)] = {"etiket": len(etiket), "fark": fark, "kare": say}
print(json.dumps(sonuc))`);
  const adlar = Object.keys(r);
  kontrol("alti senaryoda karakterler kimlik etiketi tasiyor", adlar.length === 6 && adlar.every((a) => r[a].etiket >= 1),
          adlar.map((a) => a.replace("bolum2_p1_", "").replace(".json", "") + ":" + r[a].etiket).join(" "));
  kontrol("dovus olmadigi icin pozlar etiketsiz haliyle bire bir ayni", adlar.every((a) => r[a].fark === 0),
          adlar.map((a) => r[a].fark + "/" + r[a].kare).join(" "));
}

console.log("\n=== 5. HAMLE KUNYESI VE VURUS DONMASI ===");
{
  const r = py(`
import dovus_kimlik as DK
iyi = {"baslangic": 0.0, "temas": 0.3, "toparlanma": 0.6, "agirlik": "orta", "isaret": 0.15,
       "savrulma": 0.3 - 4 / 30.0, "tepki": "sendele"}
kotu = {
  "sira": dict(iyi, temas=0.7),
  "agirlik": dict(iyi, agirlik="dev"),
  "savrulma": dict(iyi, savrulma=0.3 - 10 / 30.0),
  "tepki": dict(iyi, tepki=" "),
  "agir_isaret": dict(iyi, agirlik="agir", isaret=0.1),
  "eksik": {k: v for k, v in iyi.items() if k != "tepki"},
}
print(json.dumps({"iyi": DK.kunye_dogrula(iyi), "kotu": {a: len(DK.kunye_dogrula(k)) for a, k in kotu.items()},
                  "donma": [DK.donma_kare(a) for a in DK.AGIRLIK],
                  "saldiri_ii": [DK.donma_kare(a, saldiri_ii=True) for a in DK.AGIRLIK]}))`);
  kontrol("gecerli kunye gecer", r.iyi.length === 0, JSON.stringify(r.iyi));
  kontrol("bozuk kunyelerin hepsi yakalanir (sira, agirlik, savrulma, tepki, agir isaret, eksik)",
          Object.values(r.kotu).every((n) => n > 0), JSON.stringify(r.kotu));
  kontrol("vurus donmasi hafif 1, orta 2, agir 3 kare; Saldiri II +1 (en cok 4)",
          JSON.stringify(r.donma) === "[1,2,3]" && JSON.stringify(r.saldiri_ii) === "[2,3,4]",
          JSON.stringify(r.donma) + " " + JSON.stringify(r.saldiri_ii));
}

console.log("\n=== 6. BILINMEYEN KIMLIK CIZIMDEN ONCE HATA ===");
{
  const r = py(ORTAK + `
try:
    kos("ice-man")
    print(json.dumps({"hata": None}))
except ValueError as e:
    print(json.dumps({"hata": str(e)}))`);
  kontrol("yanlis yazilmis kimlik (ice-man) hata verir", r.hata && r.hata.includes("ice_man"), r.hata || "hata yok");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> dovus kimlikleri: karakterlere islendi, dovus disinda hicbir sey degismedi");
process.exit(hata ? 1 : 0);
