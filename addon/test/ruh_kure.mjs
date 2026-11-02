/* SATANACHIA'NIN RUHU ve GORUNTU TITREMESI -- 2. bolum Part 1   v7.99.16

   Cadi gecitten Nether'e gider; arkasindan Satanachia'nin ruhu (kara
   duman kure) cikar, kulubenin penceresinden girer, yarali Baris'in
   bedenine girer. O anda goruntu titrer. Yol ve titreme saf Python
   (arac/blender_film.py ruh_yolu, titreme_karaleri); Blender gerekmiyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Kure yolun ilk aninda yok (olcek 0), 0,35 sn'de tam boy; "gir"
      aninda yine 0 ve ondan sonra hic gorunmuyor.
   2. Yol her anahtar noktadan TAM geciyor (pencere, yatak boyle tutuyor).
   3. Yol yumusak: anahtar noktada hiz sicramiyor (duz cizgi parcalari
      her noktada kirilirdi; Catmull-Rom kirilmiyor).
   4. Titreme yalniz verilen aralikta; uclarda 0,15 sn'de acilip kapaniyor.
   5. "titreme" yazmayan senaryoda hicbir kare titremiyor -- 1. bolumun
      kamerasi bire bir eskisi kalir. */
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

const ORNEK = `ruh = {"yaricap": 0.35, "gir": 7.1, "yol": [
  {"t": 2.6, "nokta": [-19.5, -1.0, 2.5]}, {"t": 3.3, "nokta": [-16.5, -1.0, 3.4]},
  {"t": 4.2, "nokta": [-11.0, -1.2, 4.8]}, {"t": 5.1, "nokta": [-5.5, -1.0, 5.6]},
  {"t": 5.9, "nokta": [-2.2, -1.0, 5.5]}, {"t": 6.7, "nokta": [-0.5, -0.9, 4.95]}]}`;

console.log("=== 1-3. RUHUN YOLU ===");
{
  const r = py(`
import blender_film as F
${ORNEK}
y = F.ruh_yolu
s = lambda t: (y(ruh, t) or (None, None))[1]
uzak = lambda a, b: math.dist(a, b)
gecis = max(uzak(y(ruh, k["t"])[0], k["nokta"]) for k in ruh["yol"])
# anahtar noktada sol ve sag hiz (sonlu fark)
h = 1e-4
def hiz(t, yon):
    a, b = (t - h, t) if yon < 0 else (t, t + h)
    return [(q - p) / h for p, q in zip(y(ruh, a)[0], y(ruh, b)[0])]
kirik = max(uzak(hiz(k["t"], -1), hiz(k["t"], 1)) for k in ruh["yol"][1:-1])
adim = [y(ruh, 2.6 + i / 24.0) for i in range(int((7.1 - 2.6) * 24) + 1)]
sicra = max(uzak(a[0], b[0]) for a, b in zip(adim, adim[1:]))
print(json.dumps({"once": y(ruh, 2.59), "sonra": y(ruh, 7.11), "bas": s(2.6), "tam": s(2.95),
                  "gir": s(7.1), "ara": s(6.9), "gecis": gecis, "kirik": kirik, "sicra": sicra}))`);
  kontrol("ilk anahtardan once ve 'gir'den sonra kure yok", r.once === null && r.sonra === null);
  kontrol("gecitten cikarken olcek 0, 0,35 sn'de tam boy", r.bas === 0 && Math.abs(r.tam - 1) < 1e-9,
          r.bas + " -> " + r.tam);
  kontrol("Baris'a girerken kuculuyor, 'gir' aninda 0", r.gir === 0 && r.ara > 0 && r.ara < 1,
          r.ara.toFixed(3) + " -> " + r.gir);
  kontrol("yol her anahtar noktadan tam geciyor", r.gecis < 1e-9, r.gecis.toExponential(2));
  kontrol("anahtar noktalarda hiz sicramiyor (egri kirilmiyor)", r.kirik < 0.05, r.kirik.toFixed(4) + " blok/sn");
  kontrol("24 fps'de kareden kareye sicrama yok (< 0,5 blok)", r.sicra < 0.5, r.sicra.toFixed(3));
}

console.log("\n=== 4-5. GORUNTU TITREMESI ===");
{
  const r = py(`
import blender_film as F
harita = [i / 24.0 for i in range(24 * 9)]
k = F.titreme_karaleri({"titreme": [{"t": [6.4, 7.8]}]}, harita, len(harita))
bos = F.titreme_karaleri({}, harita, len(harita))
ic = [f for f in k]
print(json.dumps({"ilk": min(ic) / 24.0, "son": max(ic) / 24.0, "orta": k[int(7.0 * 24)],
                  "uc": k[min(ic)], "bos": len(bos), "disari": [f for f in k if not 6.4 <= f / 24.0 <= 7.8]}))`);
  kontrol("titreme yalniz 6,4-7,8 sn araliginda", r.disari.length === 0 && r.ilk >= 6.4 && r.son <= 7.8,
          r.ilk.toFixed(3) + " .. " + r.son.toFixed(3));
  kontrol("ortada tam guc, ucta yumusak", Math.abs(r.orta - 1) < 1e-9 && r.uc < 0.5, r.uc.toFixed(3) + " / " + r.orta);
  kontrol("'titreme' yoksa hicbir kare titremiyor (1. bolum kamerasi degismez)", r.bos === 0);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> ruh ve titreme: yol, olcek ve aralik tutarli");
process.exit(hata ? 1 : 0);
