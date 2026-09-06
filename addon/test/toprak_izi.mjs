/* TOPRAK IZI -- yurudugun yer toprak olur, sonra GERI DONER.

   Kaynak: Boby1545 Mini Pack · menu.js "boby_2 Yurudugun Yer
   Toprak". Kaynakta tek dongu: runInterval(..., 1) icinde her
   oyuncu icin bir setblock.

   ---- BU DOSYANIN TUTTUGU UC SEY ----
   Kaynagin uc sorunu var; ucu de burada olmamali:
     1. HER TICK yaziyor (duruyorken bile)
     2. GERI ALMIYOR (kalici toprak)
     3. SURESIZ

   Sinananlar:
     1. Yuruyunce ayagin ALTI toprak oluyor
     2. DURUYORKEN tek islem bile yapilmiyor   <- kaynagin 1. sorunu
     3. Kapaninca hepsi GERI konuyor           <- kaynagin 2. sorunu
     4. Suresi dolunca kendi kapaniyor         <- kaynagin 3. sorunu
     5. Sandik/bedrock ve "pa:" bloklari korunuyor
     6. Tavan dolunca en ESKI blok geri konuyor (kuyruk)
     7. Ikinci basis KAPATIYOR (cikis yolu)
     8. Arada biri ustune insa ettiyse onunki bozulmuyor
     9. Butce doluyken blok yazilmiyor
    10. Oyuncu cikinca defter temizleniyor                     */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const iz = await import("./pack/yetenekler/toprak_izi.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const tanim = kayit.yetenekBul
  ? kayit.yetenekBul("toprak_izi")
  : [...kayit.tumYetenekler()].find((y) => y.kimlik === "toprak_izi");

let n = 0;
function kur() {
  butce.butceSifirla();
  iz.izUnut();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 65.62, z: 0.5 });
  o.id = "iz" + (++n); o.typeId = "minecraft:player";
  o.runCommand = () => ({ successCount: 1 });
  o._mesaj = []; o.sendMessage = function (m) { this._mesaj.push(m); };
  _durum.oyuncular = [o];
  return { D, o };
}

/* Oyuncuyu bir bloga tasi ve isi bir tick yurut. */
function yuru(is, o, x, z) {
  o.location = { x: x + 0.5, y: 64, z: z + 0.5 };
  butce.butceSifirla();
  return is.calis();
}

const tipi = (D, x, y, z) => D.boyut.getBlock({ x, y, z }).typeId;

console.log("=== 0. KAYITLI ===");
kontrol("toprak_izi kayitli", !!tanim, tanim ? tanim.ad : "yok");
kontrol("ayar acik", ayar.IZ_ACIK === true);
kontrol("sure sinirli (kaynakta suresiz)", ayar.IZ_SURE > 0,
        ayar.IZ_SURE + " tick");

console.log("=== 1. YURUYUNCE AYAGIN ALTI TOPRAK ===");
{
  const { D, o } = kur();
  for (let x = 0; x < 4; x++) D.boyut.getBlock({ x, y: 63, z: 0 }).setType("minecraft:stone");
  const is = tanim.olustur(o);
  kontrol("is acildi", !!is);
  for (let x = 0; x < 4; x++) yuru(is, o, x, 0);
  const toprak = [0, 1, 2, 3].filter((x) => tipi(D, x, 63, 0) === ayar.IZ_BLOK);
  kontrol("yurunen her blok toprak oldu", toprak.length === 4,
          toprak.length + "/4");
}

console.log("=== 2. DURUYORKEN TEK ISLEM YOK  (kaynagin 1. sorunu) ===");
{
  const { D, o } = kur();
  D.boyut.getBlock({ x: 0, y: 63, z: 0 }).setType("minecraft:stone");
  const is = tanim.olustur(o);
  yuru(is, o, 0, 0);                       // ilk adim: yazar
  const ilkYazim = D.sayac.setType;
  for (let t = 0; t < 40; t++) yuru(is, o, 0, 0);   // ayni yerde 40 tick
  kontrol("40 tick duruldu, TEK setblock bile eklenmedi",
          D.sayac.setType === ilkYazim,
          "once " + ilkYazim + " -> sonra " + D.sayac.setType);
}
{
  /* ---- MUTASYONUN YAKALADIGI TEST BOSLUGU ----
     Ilk yazimda bu bolum TAS uzerinde duruyordu. Tas
     YAZILABILIR, yani ilk tickte deftere giriyor ve sonraki
     tickler "zaten yazdim" kaydina takilip donuyor. Yani
     koordinat denetimini SILSEM BILE test yesil yaniyordu:
     olculen sey, olculmek istenen sey degildi.

     Asil sizinti YAZILAMAYAN blokta: sandik deftere hic
     girmiyor, dolayisiyla koordinat denetimi yoksa her tick
     yeniden butce isteniyor ve blok okunuyor -- sandikta
     duran adam saniyede 20 blok okutuyor. Bu depodaki en
     eski kural "bos duran mod hicbir blok okumaz".        */
  const { D, o } = kur();
  D.boyut.getBlock({ x: 0, y: 63, z: 0 }).setType("minecraft:chest");
  const is = tanim.olustur(o);
  yuru(is, o, 0, 0);
  const oncekiOkuma = D.sayac.getBlock;
  for (let t = 0; t < 40; t++) yuru(is, o, 0, 0);
  kontrol("YAZILAMAYAN blokta 40 tick: tek okuma bile yok",
          D.sayac.getBlock === oncekiOkuma,
          "once " + oncekiOkuma + " -> sonra " + D.sayac.getBlock);
}

console.log("=== 3. KAPANINCA HEPSI GERI  (kaynagin 2. sorunu) ===");
{
  const { D, o } = kur();
  for (let x = 0; x < 5; x++) D.boyut.getBlock({ x, y: 63, z: 0 }).setType("minecraft:stone");
  const is = tanim.olustur(o);
  for (let x = 0; x < 5; x++) yuru(is, o, x, 0);
  is.bitir();
  const tas = [0, 1, 2, 3, 4].filter((x) => tipi(D, x, 63, 0) === "minecraft:stone");
  kontrol("bes blogun besi de TASA geri dondu", tas.length === 5,
          tas.length + "/5");
  kontrol("mesajda blok sayisi yaziyor",
          o._mesaj.some((m) => m.indexOf("geri kondu") !== -1),
          o._mesaj.join(" | "));
}

console.log("=== 4. SURESI DOLUNCA KENDI KAPANIYOR  (3. sorun) ===");
{
  const { D, o } = kur();
  const is = tanim.olustur(o);
  yuru(is, o, 0, 0);
  for (let t = 0; t < ayar.IZ_SURE + 5; t++) tickIlerlet(1);
  kontrol("is kendi bitti", yuru(is, o, 9, 9) === true);
}

console.log("=== 5. KORUNAN BLOKLAR ===");
{
  const { D, o } = kur();
  D.boyut.getBlock({ x: 0, y: 63, z: 0 }).setType("minecraft:chest");
  D.boyut.getBlock({ x: 1, y: 63, z: 0 }).setType("minecraft:bedrock");
  D.boyut.getBlock({ x: 2, y: 63, z: 0 }).setType("pa:mezar_tasi");
  D.boyut.getBlock({ x: 3, y: 63, z: 0 }).setType("minecraft:stone");
  const is = tanim.olustur(o);
  for (let x = 0; x < 4; x++) yuru(is, o, x, 0);
  kontrol("sandik topraga cevrilmedi", tipi(D, 0, 63, 0) === "minecraft:chest",
          tipi(D, 0, 63, 0));
  kontrol("bedrock topraga cevrilmedi", tipi(D, 1, 63, 0) === "minecraft:bedrock");
  kontrol("KENDI blogumuz (pa:) korundu", tipi(D, 2, 63, 0) === "pa:mezar_tasi");
  kontrol("normal tas cevrildi", tipi(D, 3, 63, 0) === ayar.IZ_BLOK);
}

console.log("=== 6. TAVAN DOLUNCA EN ESKI GERI KONUYOR ===");
{
  const { D, o } = kur();
  const uzun = ayar.IZ_TAVAN + 5;
  for (let x = 0; x < uzun; x++) D.boyut.getBlock({ x, y: 63, z: 0 }).setType("minecraft:stone");
  const is = tanim.olustur(o);
  for (let x = 0; x < uzun; x++) yuru(is, o, x, 0);
  kontrol("ILK adim geri kondu (kuyruk kaydi)",
          tipi(D, 0, 63, 0) === "minecraft:stone", tipi(D, 0, 63, 0));
  kontrol("SON adim hala toprak",
          tipi(D, uzun - 1, 63, 0) === ayar.IZ_BLOK,
          tipi(D, uzun - 1, 63, 0));
  const toprak = [];
  for (let x = 0; x < uzun; x++) if (tipi(D, x, 63, 0) === ayar.IZ_BLOK) toprak.push(x);
  kontrol("ayni anda en fazla IZ_TAVAN blok toprak",
          toprak.length <= ayar.IZ_TAVAN,
          toprak.length + " <= " + ayar.IZ_TAVAN);
  is.bitir();
}

console.log("=== 7. IKINCI BASIS KAPATIYOR (cikis yolu) ===");
{
  const { D, o } = kur();
  const is = tanim.olustur(o);
  kontrol("ilk basista acildi", !!is && iz.izdeMi(o.id));
  const ikinci = tanim.olustur(o);
  kontrol("ikinci basis YENI is acmadi", ikinci === undefined);
  kontrol("is bir sonraki tickte bitiyor", yuru(is, o, 5, 5) === true);
}

console.log("=== 8. USTUNE INSA EDILENI BOZMUYOR ===");
{
  const { D, o } = kur();
  D.boyut.getBlock({ x: 0, y: 63, z: 0 }).setType("minecraft:stone");
  const is = tanim.olustur(o);
  yuru(is, o, 0, 0);
  /* Arada biri oraya bir sey koydu. */
  D.boyut.getBlock({ x: 0, y: 63, z: 0 }).setType("minecraft:diamond_block");
  is.bitir();
  kontrol("baskasinin blogu YERINDE kaldi",
          tipi(D, 0, 63, 0) === "minecraft:diamond_block",
          tipi(D, 0, 63, 0));
}

console.log("=== 9. BUTCE DOLUYKEN YAZMIYOR ===");
{
  const { D, o } = kur();
  D.boyut.getBlock({ x: 0, y: 63, z: 0 }).setType("minecraft:stone");
  const is = tanim.olustur(o);
  o.location = { x: 0.5, y: 64, z: 0.5 };
  let g = 0;
  while (butce.blokIste(1) && ++g < 200000) { /* tuket */ }
  is.calis();
  kontrol("butce doluyken blok yazilmadi",
          tipi(D, 0, 63, 0) === "minecraft:stone", tipi(D, 0, 63, 0));
}

console.log("=== 10. OYUNCU CIKINCA DEFTER TEMIZ ===");
{
  const { o } = kur();
  tanim.olustur(o);
  kontrol("defterde", iz.izdeMi(o.id));
  iz.izUnut(o.id);
  kontrol("unutuldu", !iz.izdeMi(o.id));
  const fs = await import("node:fs");
  kontrol("main.js izUnut'u cagiriyor",
          /izUnut\(olay\.playerId\)/.test(fs.readFileSync("./pack/main.js", "utf8")));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
