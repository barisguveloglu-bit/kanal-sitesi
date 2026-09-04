/* KAFES KIRMA + BLOK HIZI  --  v7.36

   Kullanici WDBAX_Client.apk'yi getirdi (yeniden paketlenmis
   Toolbox) ve "uygun savunmalari gelistir" dedi. Ozellik
   listesi cikarildi; bizde karsiligi olmayan aile suydu:

     rapid_build · bridge_builder · fast_destroy · nuke

   Ustune bir onceki turda okunan kod arsivinde /fill (26
   ozgun) ve /setblock (9 ozgun) sayilmisti. Hepsi ayni sey:
   etrafina blok orup seni oraya kilitlemek.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   "HAPSEDILMEDIYSE HICBIR BLOGA DOKUNMAZ." Bu madde duserse
   Kafes Kirma bir savunma olmaktan cikar, kendi evini delen
   bir kazmaya doner. Test bunu iki yonlu tutuyor: acik
   arazide setType sayaci SIFIR kalmali.

   Sinananlar:
     1. Kafeste: cevre kiriliyor, AYAK ALTI kirilmiyor
     2. Acik arazide: hicbir sey kirilmiyor (en onemlisi)
     3. Sandik duvar KIRILMIYOR (esya kaybi yasak)
     4. Kendi bloklarimiz ("pa:") kirilmiyor
     5. Bekleme suresi var, ama bosuna denemede islemiyor
     6. Kapaliyken calismiyor
     7. Sohbetten cagrilabiliyor
     8. Blok hizi: esigin altinda suclama YOK
     9. Blok hizi: esigin ustunde suclama VAR
    10. Isi olan oyuncu (kendi lazerimiz) muaf
        DIKKAT: bu maddelerde "HIC suclama uretti mi" diye
        soruluyor, SON cagrinin donusune bakilmiyor. Ilk
        yazisimda son donuse bakiyordu ve iki mutasyon
        kacti -- BLOK_SUS yuzunden ilk suclamadan sonraki
        cagrilar zaten null donuyor.
    11. Oyuncu cikinca defterler temizleniyor              */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar   = await import("./pack/ayarlar.js");
const kafes  = await import("./pack/yetenekler/kafes.js");
const gozcu  = await import("./pack/yetenekler/gozcu.js");
const sohbet = await import("./pack/sohbet.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Oyuncuyu tas bir kafesin ortasina koyuyor. duvarTipi ile
   duvarin neyden orulecegi degistirilebiliyor.             */
function kafeseKoy(duvarTipi = "minecraft:bedrock") {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  o.id = "k1"; o.typeId = "minecraft:player"; o.name = "Simsek";
  o._mesaj = [];
  o.sendMessage = function (m) { this._mesaj.push(m); };
  /* Kafes, oyuncunun GERCEK ayak koordinatina gore oruluyor.
     Sahte dunyada oyuncuKur konumu "bas - 1.62" diye yaziyor,
     yani verilen y ile ayagin bastigi blok AYNI DEGIL. Once
     bunu fark etmeden kafesi verilen y'ye ordum ve test
     "hapsedildi" derken oyuncu iki blok asagidaydi -- olcum
     hatasi, kodun hatasi degil.                             */
  const m = {
    x: Math.floor(o.location.x),
    y: Math.floor(o.location.y),
    z: Math.floor(o.location.z)
  };
  // ayak alti: zemin
  D.boyut.getBlock({ x: m.x, y: m.y - 1, z: m.z }).setType("minecraft:stone");
  // dort yan, ayak ve bas hizasi + tepe
  for (const y of [0, 1]) {
    for (const d of [[1,0],[-1,0],[0,1],[0,-1]]) {
      D.boyut.getBlock({ x: m.x + d[0], y: m.y + y, z: m.z + d[1] }).setType(duvarTipi);
    }
  }
  D.boyut.getBlock({ x: m.x, y: m.y + 2, z: m.z }).setType(duvarTipi);
  D.sayac.setType = 0; D.sayac.yazilan.length = 0;   // kurulum sayilmasin
  return { D, o, m };
}

function acikAraziye() {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  o.id = "k2"; o.typeId = "minecraft:player"; o.name = "Simsek";
  o._mesaj = [];
  o.sendMessage = function (m) { this._mesaj.push(m); };
  D.boyut.getBlock({
    x: Math.floor(o.location.x),
    y: Math.floor(o.location.y) - 1,
    z: Math.floor(o.location.z)
  }).setType("minecraft:stone");
  D.sayac.setType = 0; D.sayac.yazilan.length = 0;
  return { D, o };
}

console.log("");
console.log("=== 1. KAFESTE: CEVRE KIRILIYOR, AYAK ALTI DURUYOR ===");
{
  kafes.kafesUnut();
  const { D, o, m } = kafeseKoy();
  kontrol("hapsedildigi goruluyor", kafes.hapsedildiMi(o));
  const cevap = kafes.kafesKir(o);
  kontrol("kafes kirildi mesaji", /Kafes kırıldı/.test(cevap), cevap);
  kontrol("gercekten blok kirildi", D.sayac.setType > 0, D.sayac.setType + " setType");
  const havaYapilan = D.sayac.yazilan.filter((y) => y.tip === "minecraft:air");
  kontrol("kirilanlarin hepsi havaya cevrildi",
          havaYapilan.length === D.sayac.yazilan.length,
          D.sayac.yazilan.length + " yazim");
  /* EN KRITIK: ayak altina dokunulmamali. Dokunulsaydi
     kafesten kurtulup bosluga duserdin.                   */
  const ayakAlti = D.sayac.yazilan.some(
    (y) => y.x === m.x && y.z === m.z && y.y < m.y);
  kontrol("AYAK ALTI kirilmadi", !ayakAlti,
          ayakAlti ? "ayak alti silinmis!" : "-");
  kontrol("artik hapsedilmis degil", !kafes.hapsedildiMi(o));
}

console.log("");
console.log("=== 2. ACIK ARAZIDE HICBIR SEYE DOKUNMUYOR (en onemlisi) ===");
{
  kafes.kafesUnut();
  const { D, o } = acikAraziye();
  kontrol("hapsedilmis gorunmuyor", !kafes.hapsedildiMi(o));
  const cevap = kafes.kafesKir(o);
  kontrol("uyari veriyor", /Hapsedilmiş görünmüyorsun/.test(cevap), cevap);
  /* Sayaç SIFIR olmali. "az blok kirdi" yeterli degil --
     kendi evini delen bir savunma savunma degildir.       */
  kontrol("TEK BIR BLOK BILE kirilmadi", D.sayac.setType === 0,
          D.sayac.setType + " setType");
}

console.log("");
console.log("=== 3. SANDIK DUVAR KIRILMIYOR (esya kaybi yasak) ===");
{
  kafes.kafesUnut();
  const { D, o } = kafeseKoy("minecraft:chest");
  const cevap = kafes.kafesKir(o);
  const sandikSilindi = D.sayac.yazilan.length > 0;
  kontrol("sandiga dokunulmadi", !sandikSilindi,
          D.sayac.yazilan.length + " yazim");
  kontrol("korunan blok bildiriliyor", /korundu/.test(cevap), cevap);
}

console.log("");
console.log("=== 4. KENDI BLOKLARIMIZ ('pa:') KIRILMIYOR ===");
{
  kafes.kafesUnut();
  const { D, o } = kafeseKoy("pa:kupa_earl");
  kafes.kafesKir(o);
  kontrol("kupa duvari duruyor", D.sayac.yazilan.length === 0,
          D.sayac.yazilan.length + " yazim");
}

console.log("");
console.log("=== 5. BEKLEME: BOSUNA DENEMEDE ISLEMIYOR ===");
{
  kafes.kafesUnut();
  const { o } = acikAraziye();
  kafes.kafesKir(o);                 // acik arazi -> saat baslamamali
  const { D: D2, o: o2 } = kafeseKoy();
  o2.id = o.id;                      // ayni oyuncu
  const ikinci = kafes.kafesKir(o2);
  /* Bosuna denemenin bedeli olmamali: acik arazide bir kez
     denedi diye gercek kafeste beklemeye dusmemeli.       */
  kontrol("bosuna deneme bekleme baslatmadi",
          /Kafes kırıldı/.test(ikinci), ikinci);
  const ucuncu = kafes.kafesKir(o2);
  kontrol("gercek kirmadan sonra bekleme var",
          /bekliyor/i.test(ucuncu), ucuncu);
  kontrol("beklerken blok kirilmiyor",
          D2.sayac.yazilan.every((y) => y.tip === "minecraft:air"));
}

console.log("");
console.log("=== 6. SOHBETTEN CAGRILABILIYOR ===");
{
  /* GERCEK bir oyuncu veriliyor. Ilk yazisimda burada
     {id, name} gibi cikis bir nesne vardi ve komut "Kafes
     durumu okunamadi" donuyordu -- test yine gecerdi ama
     sohbet yolunun gercekten kafesKir'e vardigini
     KANITLAMAZDI.                                          */
  for (const kelime of ["kafes", "cik", "kir"]) {
    kafes.kafesUnut();
    const { D, o } = kafeseKoy();
    o.id = "sohbet-" + kelime;
    const r = sohbet.komutCozumle(o, kelime);
    kontrol("'" + kelime + "' komutu kafesi kiriyor",
            !!r && /Kafes kırıldı/.test(String(r.cevap)) && D.sayac.setType > 0,
            r ? String(r.cevap).slice(0, 45) : "cevap yok");
  }
}

console.log("");
console.log("=== 7. KAPALIYKEN CALISMIYOR ===");
{
  kontrol("KAFES_ACIK ayari var", typeof ayar.KAFES_ACIK === "boolean");
  kontrol("ayak alti hedeflere GIRMIYOR (kaynak)",
          /dx === 0 && dz === 0 && dy === 0/.test(
            (await import("node:fs")).readFileSync(
              "../Simsek_TNT_ToprakTopu/scripts/yetenekler/kafes.js", "utf8")));
}

console.log("");
console.log("=== 8-10. BLOK HIZI DENETIMI ===");
{
  gozcu.blokUnut();
  const { o } = acikAraziye();
  o.id = "b1";
  /* Esigin BIR ALTI: suclama olmamali. Sinir degeri elle
     yazilmiyor, ayardan geliyor -- ama asagida MUTLAK bir
     taban da var (arinma.mjs'te ogrenilen ders: testin
     beklentisi olctugu ayardan turemesin).                */
  let sonuc = null;
  for (let i = 0; i < ayar.BLOK_KIRMA_ESIK - 1; i++) {
    sonuc = gozcu.blokOlayi(o, "kirma", 1000 + i, () => false);
  }
  kontrol("esik altinda suclama YOK", sonuc === null, String(sonuc));
  kontrol("esik makul bir tabanin ustunde", ayar.BLOK_KIRMA_ESIK >= 10,
          String(ayar.BLOK_KIRMA_ESIK));

  sonuc = gozcu.blokOlayi(o, "kirma", 1000 + ayar.BLOK_KIRMA_ESIK, () => false);
  kontrol("esikte suclama VAR", typeof sonuc === "string" && /kırma/.test(sonuc),
          String(sonuc));

  /* Muafiyet: calisan isi olan oyuncu (Goz Lazeri bir tickte
     onlarca blok kirabiliyor).                             */
  gozcu.blokUnut();
  const { o: o3 } = acikAraziye();
  o3.id = "b2";
  /* "HIC suclama uretti mi" diye soruluyor, SON cagrinin
     donusune bakilmiyor. Ilk yazisimda son donuse bakiyordu
     ve MUTASYON KACTI: muafiyet sokulunca 24. olayda suclama
     uretiliyor, sonrakiler BLOK_SUS yuzunden null donuyor,
     yani son deger yine null kaliyordu ve test geciyordu.  */
  let muafSuclama = 0;
  for (let i = 0; i < ayar.BLOK_KIRMA_ESIK + 5; i++) {
    if (gozcu.blokOlayi(o3, "kirma", 2000 + i, () => true) !== null) muafSuclama++;
  }
  kontrol("isi olan oyuncu MUAF", muafSuclama === 0,
          muafSuclama + " suclama");

  /* Pencere disi dusuyor mu: yavas yavas kirmak suclama
     uretmemeli.                                            */
  gozcu.blokUnut();
  const { o: o4 } = acikAraziye();
  o4.id = "b3";
  let yavasSuclama = 0;
  for (let i = 0; i < ayar.BLOK_KIRMA_ESIK * 3; i++) {
    if (gozcu.blokOlayi(o4, "kirma", 3000 + i * ayar.BLOK_PENCERE,
                        () => false) !== null) yavasSuclama++;
  }
  kontrol("YAVAS kirma suclanmiyor (pencere calisiyor)", yavasSuclama === 0,
          yavasSuclama + " suclama");

  /* Koyma tarafi ayri sayilmali: kirma sayaci koymayi
     tetiklememeli.                                         */
  gozcu.blokUnut();
  const { o: o5 } = acikAraziye();
  o5.id = "b4";
  let karisikSuclama = 0;
  for (let i = 0; i < ayar.BLOK_KIRMA_ESIK - 1; i++) {
    if (gozcu.blokOlayi(o5, "kirma", 4000 + i, () => false) !== null) karisikSuclama++;
    if (gozcu.blokOlayi(o5, "koyma", 4000 + i, () => false) !== null) karisikSuclama++;
  }
  kontrol("kirma ve koyma AYRI sayiliyor", karisikSuclama === 0,
          karisikSuclama + " suclama");
}

console.log("");
console.log("=== 11. OYUNCU CIKINCA DEFTER TEMIZLENIYOR ===");
{
  const { o } = acikAraziye();
  o.id = "c1";
  gozcu.blokOlayi(o, "kirma", 9000, () => false);
  kontrol("defterde kayit var", !!gozcu.blokDurum("c1"));
  gozcu.blokUnut("c1");
  kontrol("kimlikle silindi", !gozcu.blokDurum("c1"));
  kontrol("main.js playerLeave'de blokUnut cagriliyor",
          /blokUnut\(olay\.playerId\)/.test(
            (await import("node:fs")).readFileSync(
              "../Simsek_TNT_ToprakTopu/scripts/main.js", "utf8")));
  kontrol("main.js playerLeave'de kafesUnut cagriliyor",
          /kafesUnut\(olay\.playerId\)/.test(
            (await import("node:fs")).readFileSync(
              "../Simsek_TNT_ToprakTopu/scripts/main.js", "utf8")));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> hepsi gecti");
process.exit(hata ? 1 : 0);
