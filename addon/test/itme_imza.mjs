/* GERI ITME: IKI IMZA                                   v7.98.2

   @minecraft/server 2.0.0'da applyKnockback'in imzasi degisti:
     eski  (yonX, yonZ, yatayGuc, dikeyGuc)
     yeni  ({ x, z }, dikeyGuc)   -- x,z = yon x yatayGuc
   Depoda 21 cagri yalniz eskisini kullaniyordu; 2.0.0'da hata
   atiyor ve cevredeki try yutuyordu. Mod taramasi buldu.
   Sahte varliklar her imzayi kabul ettigi icin testler hicbirini
   gormedi -- bu dosya 2.0.0 gibi DAVRANAN bir varlik kuruyor.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. itmeUygula 2.0.0 varliginda yeni imzayla, dogru vektorle
      itiyor; eski API varliginda eski imzayla.
   2. Kaynakta yalniz-eski-imza cagrisi KALMADI. Iki imzayi da
      deneyen dosyalar (kendi try/catch'leriyle) listede.      */
import { readFileSync, readdirSync } from "node:fs";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const Y = await import("./pack/yardimcilar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== 1. IKI IMZA DA CALISIYOR ===");
{
  /* 2.0.0: ilk arguman nesne degilse yerel tip donusumu hata atar. */
  const yeni = { kayit: [], applyKnockback(a, b) {
    if (typeof a !== "object") throw new TypeError("Native type conversion failed");
    this.kayit.push({ a, b });
  } };
  const oldu = Y.itmeUygula(yeni, 3, 4, 2, 0.5);
  const k = yeni.kayit[0];
  kontrol("2.0.0 varligi itildi", oldu === true && !!k, JSON.stringify(yeni.kayit));
  kontrol("  vektor = birim yon x yatay guc",
          k && Math.abs(k.a.x - 1.2) < 1e-9 && Math.abs(k.a.z - 1.6) < 1e-9 && k.b === 0.5,
          k && JSON.stringify(k));
  const sifir = { kayit: [], applyKnockback(a, b) {
    if (typeof a !== "object") throw new TypeError("x");
    this.kayit.push({ a, b });
  } };
  Y.itmeUygula(sifir, 0, 0, 0, -1.4);
  kontrol("  sifir yon NaN uretmiyor (Mahou yere basma)",
          sifir.kayit[0] && sifir.kayit[0].a.x === 0 && sifir.kayit[0].a.z === 0 &&
          sifir.kayit[0].b === -1.4, JSON.stringify(sifir.kayit[0]));

  const eski = { kayit: [], applyKnockback(...a) { this.kayit.push(a); } };
  Y.itmeUygula(eski, 3, 4, 2, 0.5);
  kontrol("eski API varligi eski imzayla", eski.kayit.length === 1 &&
          eski.kayit[0].join(",") === "3,4,2,0.5", JSON.stringify(eski.kayit));

  const hic = { applyKnockback() { throw new Error("yok"); } };
  kontrol("ikisi de olmazsa hata FIRLATMIYOR, false", Y.itmeUygula(hic, 1, 0, 1, 1) === false);
}

console.log("\n=== 2. KAYNAKTA YALNIZ-ESKI-IMZA CAGRISI YOK ===");
{
  /* Iki imzayi da kendi try/catch'iyle deneyen dosyalar. Eski
     imza orada YEDEK; ilk deneme nesne bicimi.               */
  const IKISI = new Set(["cekme.js", "savur.js", "nefes.js", "powerborne.js",
                         "ben10_evrim.js", "savunma_merdiveni.js"]);
  const kok = new URL("./pack/yetenekler/", import.meta.url).pathname;
  const kalan = [];
  for (const f of readdirSync(kok).filter((x) => x.endsWith(".js"))) {
    if (IKISI.has(f)) continue;
    const kod = readFileSync(kok + f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const re = /\.applyKnockback\(\s*([^{\s)])/g;
    let m;
    while ((m = re.exec(kod))) kalan.push(f + ":" + kod.slice(0, m.index).split("\n").length);
  }
  kontrol("yalniz eski imzayla cagri kalmadi", kalan.length === 0, kalan.join(", ") || "yok");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> geri itme iki imzada da calisiyor");
process.exit(hata ? 1 : 0);
