/* SURUM TUTARLILIGI                                      v7.9.8

   ---- NEDEN VAR ----
   Kullanici tablette dort paketi yan yana gordu ve hangisinin
   yeni oldugunu anlayamadi: "bu dogru surum degil mi, adlari
   biraz daha basitlestir, ekstra da dogru surum diye bakmak
   istemiyorum."

   Hakliydi ve sebebi bir hataydi. Surum IKI ayri yerde elle
   tutuluyordu:
     - manifest.json'lar (v7.9'da [7,9,0] yazildi, YEDI surum
       boyunca bir daha dokunulmadi)
     - paketle.sh (adi "<taban> v%d.%d" diye YENIDEN yaziyordu,
       yani yama numarasini dusuruyordu)
   Sonuc: 7.9.1'den 7.9.7'ye kadar butun surumler oyunda
   "v7.9 / 7.9.0" gorunuyordu.

   Artik tek kaynak kol_uret.py'deki SURUM_NO. Bu dosya o
   birligi kilitliyor -- ayrisma sessizce geri gelemez.       */

import { readFileSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (p) => readFileSync(KOK + "/" + p, "utf8");

/* Tek kaynak: kol_uret.py'deki SURUM_NO satiri. */
const uretici = oku("kol_uret.py");
const m = uretici.match(/^SURUM_NO = \((\d+), *(\d+), *(\d+)\)/m);

console.log("=== 1. TEK KAYNAK ===");
kontrol("kol_uret.py'de SURUM_NO var", !!m, m ? m[0] : "bulunamadi");
if (!m) { console.log("\nBAZI SINAMALAR KALDI"); process.exit(1); }
const surum = [Number(m[1]), Number(m[2]), Number(m[3])];
const metin = surum.join(".");
console.log("     kaynak surum: " + metin);

console.log("");
console.log("=== 2. DORT MANIFEST DE AYNI SURUMDE ===");
const paketler = [
  ["Simsek_TNT_ToprakTopu", "Mod"],
  ["Simsek_Kol_Kaynak",     "Görünüm"],
  ["Simsek_Oyuncu_Modeli",  "Oyuncu Modeli"],
  ["Simsek_Skin",           "Skin"]
];
for (const [klasor, etiket] of paketler) {
  const d = JSON.parse(oku(klasor + "/manifest.json"));
  kontrol(etiket + ": header surumu " + metin,
          d.header.version.join(".") === metin, d.header.version.join("."));
  const modul = (d.modules || []).map((x) => (x.version || []).join("."));
  kontrol("  modul surumleri de ayni",
          modul.every((v) => v === metin), modul.join(" / ") || "modul yok");
}

console.log("");
console.log("=== 3. ADLAR: SURUM ADIN ICINDE VE SADE ===");
for (const [klasor, etiket] of paketler) {
  const d = JSON.parse(oku(klasor + "/manifest.json"));
  const ad = d.header.name;
  /* Surum ADDA olmali: kullanici paket listesine bakinca
     dogrudan gorsun, "hangisi yeni" diye dusunmesin.        */
  kontrol(etiket + ": adinda tam surum var", ad.includes(metin), ad);
  kontrol("  ortak onekle basliyor (listede yan yana dursunlar)",
          ad.startsWith("Şimşek " + metin), ad);
  kontrol("  ne oldugunu soyluyor", ad.endsWith(etiket), ad);
  /* Aciklama tablette kesilmesin. */
  kontrol("  aciklama kisa (<= 100 karakter)",
          d.header.description.length <= 100,
          d.header.description.length + " karakter");
}

console.log("");
console.log("=== 4. ESKI SURUM IZI KALMAMIS ===");
{
  /* "v7.9" gibi yama numarasiz bir etiket adda kalirsa
     kullanici yine ayirt edemez. Eski bicimi ariyoruz.     */
  const eskiBicim = [];
  for (const [klasor] of paketler) {
    const ad = JSON.parse(oku(klasor + "/manifest.json")).header.name;
    if (/v\d+\.\d+(?!\.\d)/.test(ad)) eskiBicim.push(ad);
  }
  kontrol("hicbir adda yama'siz surum etiketi yok", eskiBicim.length === 0,
          eskiBicim.join(" | ") || "temiz");

  /* paketle.sh adi bir daha EZMEMELI: iki kaynak olursa
     biri otekini sessizce bozar (yasandi).                 */
  const betik = oku("paketle.sh");
  const kod = betik.replace(/^\s*#.*$/gm, "");
  kontrol("paketle.sh manifest adini YENIDEN yazmiyor",
          !/\["header"\]\["name"\]\s*=/.test(kod),
          "adlar yalniz kol_uret.py'de");
}

console.log("");
console.log("=== 5. OYUN ICI SURUM YAZISI DA AYNI ===");
{
  const ayar = oku("Simsek_TNT_ToprakTopu/scripts/ayarlar.js");
  const s = ayar.match(/export const SURUM = "([^"]*)";/);
  kontrol("ayarlar.js SURUM tanimli", !!s, s ? s[1] : "yok");
  kontrol("  paket surumuyle ayni", !!s && s[1] === "v" + metin,
          (s ? s[1] : "?") + " / v" + metin);
}

console.log("");
console.log(hata ? "BAZI SINAMALAR KALDI" : "hepsi gecti");
process.exit(hata ? 1 : 0);
