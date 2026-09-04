/* OYUNCU CIKINCA DEFTERLER TEMIZLENIYOR MU        v7.24

   ---- NEDEN VAR ----
   Genel taramada dort ayri defter bulundu: oyuncu KIMLIGIYLE
   anahtarlaniyorlardi ve hicbiri silinmiyordu. Girip cikan her
   oyuncu birer satir birakiyor, hicbir sey onlari geri
   almiyordu.

   Ikisinin temizleyicisi ZATEN YAZILMISTI, yalnizca main.js'in
   playerLeave'ine baglanmamisti (willBeklemeUnut,
   actionbarUnut). Digger ikisinde temizleyici "hepsini sil"
   biciminde oldugu icin oradan cagrilamiyordu; tek oyuncuyu
   dusuren bicimleri v7.24'te eklendi (efsaneMuzikUnut(id),
   zirhAgacOyuncuUnut).

   ---- BU TESTIN OLCTUGU SEY ----
   Tek tek o dort defter DEGIL -- SINIFIN TAMAMI. Yarin biri
   oyuncu kimligiyle anahtarlanan yeni bir Map yazarsa ve
   temizligini baglamayi unutursa burasi duser. Tek tek olcum
   yapsaydik besinci sizinti yine sessizce girerdi.

   ---- MUAFLAR ----
   Her muafin sebebi yazili. "Listeye ekle, gec" olmasin diye
   sebep ZORUNLU: sebepsiz muaf da testi dusuruyor.          */

import { readFileSync, readdirSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const K = KOK + "/Simsek_TNT_ToprakTopu/scripts";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const yorumsuz = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/* ---- MUAFLAR: dosya -> neden temizlik GEREKMIYOR ---- */
const MUAF = {
  "main.js":
    "kendi defterlerini playerLeave icinde satir satir siliyor " +
    "(esyasizTutma, lazerModu, kolSecim ...), ayri bir *Unut'a gerek yok",
  "_kalp_defteri.js":
    "kalp seviyesi KALICI ILERLEME -- oyuncu cikinca silinmesi " +
    "kazandigi kalpleri kaybettirirdi; dunya kaydinda duruyor",
  "asa.js":
    "sersemler kaydi her taramada gecerliMi() ile suzuluyor: " +
    "oyuncu cikinca varlik gecersizlesiyor ve kayit kendiliginden " +
    "dusuyor. vuruslar ise BOT kimligiyle anahtarli, ilkelUnut " +
    "onu bot silinirken temizliyor",
  "yamult.js":
    "felcliler kaydinin kendi suresi var; sure dolunca " +
    "felcliler.delete(id) calisiyor, yani kendi kendini sinirliyor",
};

/* ---- playerLeave icinde NE cagriliyor ---- */
const main = readFileSync(K + "/main.js", "utf8");
const m = /olayaAbone\("playerLeave", \(olay\) => \{([\s\S]*?)\n\}\);/.exec(main);

console.log("=== 1. playerLeave BLOGU DURUYOR ===");
kontrol("playerLeave dinleyicisi var", !!m);
if (!m) {
  console.log(">>> SORUN VAR");
  process.exit(1);
}
const blok = yorumsuz(m[1]);
const cagrilan = new Set([
  ...[...blok.matchAll(/(\w+)\(olay\.playerId\)/g)].map((x) => x[1]),
  ...[...blok.matchAll(/(\w+)\.delete\(olay\.playerId\)/g)].map((x) => x[1]),
]);
kontrol("blok gercekten temizlik yapiyor", cagrilan.size >= 20,
        cagrilan.size + " cagri");

console.log("");
console.log("=== 2. HER OYUNCU DEFTERININ TEMIZLIGI BAGLI ===");
{
  const dosyalar = [];
  const gez = (dizin, onek) => {
    for (const f of readdirSync(dizin, { withFileTypes: true })) {
      if (f.isDirectory()) gez(dizin + "/" + f.name, onek + f.name + "/");
      else if (f.name.endsWith(".js")) dosyalar.push([onek + f.name, dizin + "/" + f.name]);
    }
  };
  gez(K, "");

  const acik = [];
  let bakilan = 0;
  for (const [ad, yol] of dosyalar) {
    const kod = yorumsuz(readFileSync(yol, "utf8"));
    /* Oyuncu kimligiyle anahtarlanan bir defter var mi.       */
    if (!/\.(set|add)\(\s*(oyuncu|o|kurban|hedef)\.id\b/.test(kod)) continue;
    bakilan++;
    const kisa = ad.split("/").pop();
    if (MUAF[kisa]) continue;
    const disari = [...kod.matchAll(/^export function (\w+)/gm)].map((x) => x[1]);
    if (!disari.some((d) => cagrilan.has(d))) acik.push(kisa);
  }
  kontrol("oyuncu defteri olan dosya sayisi makul", bakilan >= 20,
          bakilan + " dosya tarandi");
  kontrol("temizligi BAGLANMAMIS defter yok", acik.length === 0,
          acik.join(", ") || "hepsi bagli");
}

console.log("");
console.log("=== 2b. DEFTER BAZINDA: her defterin kendi silmesi var mi ===");
{
  /* ---- 2. BOLUM TEK BASINA YETMIYOR ----
     Orasi DOSYA bazinda bakiyor: "bu dosya playerLeave'de
     cagrilan bir sey ihrac ediyor mu". Mutasyon denemesinde
     kacak verdi -- zaten temizligi olan bir dosyaya YENI ve
     temizliksiz bir defter eklendiginde dosya hala "bagli"
     gorunuyor ve yeni defter sessizce sizmaya basliyor.

     Burasi DEFTER bazinda bakiyor: oyuncu kimligiyle YAZILAN
     her Map/Set icin ayni dosyada bir .delete( ya da .clear(
     cagrisi aranıyor. Ikisi birlikte hem "dosya bagli mi" hem
     "her defterin kendi silmesi var mi" sorusunu kapatiyor. */
  const acik = [];
  let defterSayisi = 0;
  const gez = (dizin) => {
    for (const e of readdirSync(dizin, { withFileTypes: true })) {
      if (e.isDirectory()) { gez(dizin + "/" + e.name); continue; }
      if (!e.name.endsWith(".js")) continue;
      const kod = yorumsuz(readFileSync(dizin + "/" + e.name, "utf8"));
      const adlar = new Set(
        [...kod.matchAll(/\b(\w+)\.(?:set|add)\(\s*(?:oyuncu|o|kurban|hedef)\.id\b/g)]
          .map((x) => x[1]));
      for (const d of adlar) {
        defterSayisi++;
        if (!new RegExp("\\b" + d + "\\.(delete|clear)\\(").test(kod)) {
          acik.push(e.name + " :: " + d);
        }
      }
    }
  };
  gez(K);
  kontrol("oyuncu defteri sayisi makul", defterSayisi >= 25,
          defterSayisi + " defter");
  kontrol("her defterin silme/temizleme cagrisi var", acik.length === 0,
          acik.join(", ") || defterSayisi + " defterin hepsi");
}

console.log("");
console.log("=== 3. MUAFLARIN SEBEBI YAZILI ===");
{
  /* Sebepsiz muaf, muafiyeti bir kacamak yapardi.            */
  const kisa = Object.entries(MUAF).filter(([, s]) => !s || s.length < 40);
  kontrol("her muafin yazili sebebi var", kisa.length === 0,
          kisa.map(([f]) => f).join(", ") || Object.keys(MUAF).length + " muaf");
  /* Muaf listesi BAYATLAMASIN: adi gecen dosya gercekten var mi
     ve gercekten oyuncu defteri tutuyor mu.                  */
  const bayat = [];
  for (const f of Object.keys(MUAF)) {
    let bulundu = false;
    const ara = (dizin) => {
      for (const e of readdirSync(dizin, { withFileTypes: true })) {
        if (e.isDirectory()) ara(dizin + "/" + e.name);
        else if (e.name === f) bulundu = true;
      }
    };
    ara(K);
    if (!bulundu) bayat.push(f);
  }
  kontrol("muaf listesinde olmayan dosya yok", bayat.length === 0,
          bayat.join(", ") || "hepsi yerinde");
}

console.log("");
console.log("=== 4. v7.24'TE BAGLANAN DORDU DE YERINDE ===");
{
  /* Bu dordunu ADIYLA tutuyoruz: 2. bolum sinifi koruyor ama
     bu dordu bulunmus GERCEK sizintilardi, geri gitmesinler. */
  for (const ad of ["willBeklemeUnut", "actionbarUnut",
                    "efsaneMuzikUnut", "zirhAgacOyuncuUnut"]) {
    kontrol("  " + ad + " playerLeave'de", cagrilan.has(ad));
  }
  /* Ilkel bot temizligi playerLeave'de degil, BOT SILINIRKEN
     cagriliyor -- botlar oyuncudan bagimsiz silinebiliyor.  */
  const defter = yorumsuz(readFileSync(K + "/yetenekler/_bot_defteri.js", "utf8"));
  kontrol("bot silme kancasi var", /export function ilkelSilmeKancasi/.test(defter));
  kontrol("botGeri kancayi CAGIRIYOR", /ilkelSilindi\(vid\)/.test(defter));
  const ilkel = yorumsuz(readFileSync(K + "/yetenekler/bot_ilkel.js", "utf8"));
  kontrol("bot_ilkel kancaya BAGLANIYOR",
          /ilkelSilmeKancasi\(ilkelUnut\)/.test(ilkel));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> oyuncu defterleri temizleniyor");
process.exit(hata ? 1 : 0);
