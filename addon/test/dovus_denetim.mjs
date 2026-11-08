/* DOVUS PLANI DENETIMI -- kamera_denetim.py 10-11. kurallar        2026-11-08

   Kullanici (2026-11-08): "daha fazla arastir, hepsini ekle."
   DOVUS_KIMLIKLERI.md bolum 12, 8. madde; REFERANS_DOVUS_KOREOGRAFI §1, §8,
   §69. Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. TEMAS_KESME: vurusun son 6 karesinde (agir vurusun savrulmasi) kesme
      bulgu; 10 kare once kesme temiz.
   2. ANA_PLAN: dovusun ilk vurusunda taraflardan biri kadraj disindaysa
      bulgu; ikisi de kadrajdaysa temiz.
   3. Yalniz yeni dovus senaryolarinda ("vurus_donmasi"/"darbe_vurgusu"):
      bayraksiz ayni senaryo bu kurallardan bulgu vermez (1. bolum bu
      kurallardan once cizildi). */
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
  "import sys, json, os\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\nos.chdir(os.path.join(sys.argv[1], '..'))\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

const r = py(`
import copy
import blender_film as F, bedrock_onizleme as B, kamera_denetim as K
genis = {"t": 0, "aci": "elle", "kam": [0.6, -3.2, 1.5], "bak": [0.6, 0, 1.2], "lens": 30}
yakin_b = {"aci": "elle", "kam": [2.6, -1.4, 1.6], "bak": [1.2, 0, 1.4], "lens": 50}
def sen(kameralar, **ek):
    s = {"fps": 30, "sure": 2.4, "akici": True, "vurus_donmasi": True,
         "aktorler": {"a": {"skin": "kaynak_doku/aktor/omer.png", "set": "yumruk", "konum": [0, 0], "bak": "b", "kimlik": "omer"},
                      "b": {"skin": "kaynak_doku/aktor/sur_askeri_gri.png", "set": "yumruk", "konum": [1.2, 0], "bak": "a", "kimlik": "asker"}},
         "olaylar": [{"t": 0.5, "aktor": "a", "vur": "oto", "hedef": "b"}],
         "kamera": kameralar}
    s.update(ek)
    for k in list(s):
        if s[k] is None:
            del s[k]
    return s
temas = [e["t"] for e in F.zaman_cizelgesi(sen([genis]), B.oku(F.HAREKET)["setler"], {})[1] if e["tur"] == "vurus"][0]
def bul(s):
    return sorted({x["kural"] for x in K.denetle(s)[0] if x["kural"] in ("TEMAS_KESME", "ANA_PLAN")})
kes3 = sen([genis, dict(yakin_b, t=round(temas - 3 / 30.0, 4))])
kes10 = sen([genis, dict(yakin_b, t=round(temas - 10 / 30.0, 4))])
tek = sen([{"t": 0, "aci": "elle", "kam": [-1.6, -0.6, 1.6], "bak": [-3.0, 0.4, 1.4], "lens": 50}])
print(json.dumps({"temas": temas, "temiz": bul(sen([genis])), "kes3": bul(kes3), "kes10": bul(kes10), "tek": bul(tek),
                  "kes3_bayraksiz": bul(sen([genis, dict(yakin_b, t=round(temas - 3 / 30.0, 4))], vurus_donmasi=None)),
                  "tek_bayraksiz": bul(sen(tek["kamera"], vurus_donmasi=None))}))`);

console.log("=== 1. TEMASTAN ONCE KESME ===");
kontrol("tek genis plan: temiz", r.temiz.length === 0, JSON.stringify(r.temiz));
kontrol("temastan 3 kare once kesme: TEMAS_KESME", r.kes3.includes("TEMAS_KESME"), JSON.stringify(r.kes3));
kontrol("temastan 10 kare once kesme: temiz", !r.kes10.includes("TEMAS_KESME"), JSON.stringify(r.kes10));

console.log("\n=== 2. ANA PLAN ===");
kontrol("ilk vurusta taraflardan biri kadraj disinda: ANA_PLAN", r.tek.includes("ANA_PLAN"), JSON.stringify(r.tek));

console.log("\n=== 3. YALNIZ YENI DOVUS SENARYOLARINDA ===");
kontrol("bayraksiz ayni senaryolar bu kurallardan bulgu vermiyor",
        r.kes3_bayraksiz.length === 0 && r.tek_bayraksiz.length === 0, JSON.stringify([r.kes3_bayraksiz, r.tek_bayraksiz]));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> dovus plani denetimi: temastan once kesme ve ana plan yakalaniyor");
process.exit(hata ? 1 : 0);
