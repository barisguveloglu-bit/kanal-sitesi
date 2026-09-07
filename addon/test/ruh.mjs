/* RUH GUCU ve KURTARICI                                v7.54

   Kaynak: Bleach: Kurosaki Dynasty 2.4.6 (733 sinif okundu,
   calistirilmadi). Modun modeli aynen alindi: form acikken
   statlar CARPILIYOR ama SP eriyor, SP bitince form
   kendiliginden kapaniyor.

   Kullanici: "pvp gibi durumlarda canimin azaldigi durumlarda
   bu devreye girsin, bana bir destek saglasin."

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   FORMUN KENDILIGINDEN KAPANMASI. Iki sinir birden var (sure
   ve ruh); ikisi de calismali. Biri duserse guc sonsuz olur ve
   bu depoda "cikisi olmayan guc" en eski reddedilen kalip
   (Yamultma, Zaman Saati, picker_0 -- ucu de bu yuzden
   alinmadi).

   Sinananlar:
     1. Ruh havuzu doluyor ve tavani asmiyor
     2. Kademe efekt veriyor (carpanin gorunumu)
     3. RUH bitince form KENDI kapaniyor
     4. SURE dolunca form KENDI kapaniyor
     5. Can esigin altina dusunce KURTARICI kademe 2 aciyor
     6. Esikte titreyen can sistemi surekli yakmiyor
     7. Toparlayinca yeniden silahlaniyor
     8. Letzt Stil bedeli: yalniz Quincy yolunda ruh dibe vuruyor
     9. Yol secimi kaydediliyor
    10. Oyuncu cikinca defter temizleniyor                    */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const ruh = await import("./pack/yetenekler/ruh.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

let n = 0;
function kur(can = 20, maks = 20) {
  ruh.ruhUnut();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "r" + (++n); o.typeId = "minecraft:player";
  o._can = can; o._maks = maks;
  o._efekt = []; o._mesaj = [];
  o._ozellik = new Map();
  o.getComponent = (a) => a === "minecraft:health"
    ? { currentValue: o._can, effectiveMax: o._maks, defaultValue: 20 }
    : undefined;
  o.addEffect = (ad, sure, s) => { o._efekt.push({ ad, sure, a: s && s.amplifier }); return true; };
  o.sendMessage = (m) => o._mesaj.push(m);
  o.runCommand = () => ({ successCount: 1 });
  o.getDynamicProperty = (k) => o._ozellik.get(k);
  o.setDynamicProperty = (k, v) => { o._ozellik.set(k, v); };
  _durum.oyuncular = [o];
  return { D, o };
}
const efektVar = (o, ad) => o._efekt.some((e) => e.ad === ad);
const ab = (o) => (o.onScreenDisplay && o.onScreenDisplay._son) || "";

console.log("=== 0. AYARLAR ===");
kontrol("RUH_ACIK", ayar.RUH_ACIK === true);
kontrol("uc yol tanimli", ayar.RUH_YOLLAR.length === 3,
        ayar.RUH_YOLLAR.map((y) => y.ad).join(" · "));
kontrol("uc kademe", ayar.RUH_KADEMELER.length === 3);
kontrol("carpanlar artan",
        ayar.RUH_KADEMELER.every((k, i, a) => i === 0 || a[i - 1].carpan < k.carpan),
        ayar.RUH_KADEMELER.map((k) => k.carpan).join(" < "));
kontrol("tuketimler artan",
        ayar.RUH_KADEMELER.every((k, i, a) => i === 0 || a[i - 1].tuketim < k.tuketim));
kontrol("esik toparlamadan KUCUK",
        ayar.KURTARICI_ESIK < ayar.KURTARICI_TOPARLAMA,
        ayar.KURTARICI_ESIK + " < " + ayar.KURTARICI_TOPARLAMA);

/* ---- v7.55: IKI SINIR AYNI YERDE BULUSMALI ----
   v7.54'te tavan 1000'di: 1000/5 = 200 tick = 10 sn, oysa
   KURTARICI_SURE 600 tick. Ruh HER ZAMAN once bitiyordu ve
   sure sinirit hicbir zaman islemiyordu -- iki sinirdan biri
   olu yatiyordu ve bunu hicbir test soylemiyordu.

   Kural: tam dolu ruhla giren tam sureyi yasar.             */
{
  const omur = ayar.RUH_TAVAN / ayar.RUH_KADEMELER[2].tuketim;
  kontrol("tam ruhun kademe-2 omru = KURTARICI_SURE",
          omur === ayar.KURTARICI_SURE,
          omur + " tick vs " + ayar.KURTARICI_SURE + " tick");
}
kontrol("seviye sistemi BILEREK kapali (tavan otomatik)",
        ayar.RUH_SEVIYE_ACIK === false);

console.log("=== 1. HAVUZ DOLUYOR, TAVANI ASMIYOR ===");
{
  /* Kullanici: "SP maksimum kac olabiliyorsa o bende otomatik
     olacak." Modda seviye atlayarak buyuyor (reiryokuXPRate,
     maxReiryoku, prestigeSP); bizde ilerleme YOK, yeni oyuncu
     dogrudan tavanda basliyor.                              */
  const { o: yeni } = kur();
  kontrol("yeni oyuncu TAVANDA basliyor",
          ruh.ruhOku(yeni) === ayar.RUH_TAVAN, String(ruh.ruhOku(yeni)));
}
{
  const { o } = kur();
  ruh.ruhYaz(o, 100);
  for (let t = 0; t < 400; t++) tickIlerlet(1);
  const v = ruh.ruhOku(o);
  kontrol("doldu", v > 100, "100 -> " + v);
  /* TAVAN denetimi ancak havuz gercekten TAVANA DAYANINCA
     olculebilir. Ilk yazimda 400 tick kosuluyordu ve havuz
     500'e ancak cikiyordu -- tavani silen mutasyon KACTI,
     cunku hicbir zaman tavana gelinmiyordu.                */
  for (let t = 0; t < 3000; t++) tickIlerlet(1);
  const dolu = ruh.ruhOku(o);
  kontrol("tavani asmadi", dolu <= ayar.RUH_TAVAN,
          dolu + " <= " + ayar.RUH_TAVAN);
  kontrol("tavana dayandi (olcum gercekten yapildi)",
          dolu === ayar.RUH_TAVAN, String(dolu));
  /* ruhYaz'in KENDI kelepcesi ayri bir guvence: dolum yolu
     zaten "tavandan kucukse doldur" diyor, yani o yoldan
     tavan asilmiyor ve kelepceyi silen mutasyon KACIYORDU.
     Kelepce disaridan gelen degeri de tutmali -- baska
     yetenekler ruhYaz'i cagiracak.                         */
  ruh.ruhYaz(o, ayar.RUH_TAVAN * 10);
  kontrol("ruhYaz tavanin USTUNU kirpiyor",
          ruh.ruhOku(o) === ayar.RUH_TAVAN, String(ruh.ruhOku(o)));
  ruh.ruhYaz(o, -500);
  kontrol("ruhYaz negatifi sifira cekiyor",
          ruh.ruhOku(o) === 0, String(ruh.ruhOku(o)));
}
{
  /* ---- DOLUM HIZI  (v7.55) ----
     Kullanici "SP hizini birazcik daha arttiralim ama
     birazcik" dedi ve 1 -> 4 secildi. Bu bolum HIZI olcuyor;
     onceki bolumler yalnizca "doldu mu" diye bakiyordu ve
     dolumu 1'e geri ceken mutasyon KACIYORDU -- her pozitif
     hiz er gec dolduruyor, yeter ki yeterince tick versin.  */
  const { o } = kur();
  ruh.ruhYaz(o, 0);
  let tick = 0;
  while (ruh.ruhOku(o) < ayar.RUH_TAVAN && tick < 20000) { tickIlerlet(1); tick++; }
  const sn = tick / 20;
  const beklenen = ayar.RUH_TAVAN / ayar.RUH_DOLUM / 20;
  kontrol("bostan tam doluma sure ayarla uyuyor",
          Math.abs(sn - beklenen) <= 1.0,
          sn.toFixed(1) + " sn (beklenen " + beklenen.toFixed(1) + ")");
  kontrol("kullanicinin sectigi hiz: ~37,5 sn",
          Math.abs(sn - 37.5) <= 1.0, sn.toFixed(1) + " sn");
}

console.log("=== 2. KADEME EFEKT VERIYOR (carpanin gorunumu) ===");
{
  const { o } = kur();
  ruh.kademeAyarla(o, 2);
  kontrol("kademe 2", ruh.kademeOku(o.id) === 2);
  kontrol("carpan 2.6", ruh.ruhCarpani(o) === ayar.RUH_KADEMELER[2].carpan,
          String(ruh.ruhCarpani(o)));
  for (const e of ["strength", "speed", "resistance", "haste"]) {
    kontrol("  " + e + " verildi", efektVar(o, e));
  }
  ruh.kademeAyarla(o, 0);
  kontrol("kapaninca carpan 1.0", ruh.ruhCarpani(o) === 1.0);
}

console.log("=== 3. RUH BITINCE FORM KENDI KAPANIYOR ===");
{
  /* Iki sinirdan birincisi. Bu dusrse guc sonsuz olur.      */
  const { o } = kur();
  ruh.ruhYaz(o, 60);                  // kademe 2 tuketimi 5/tick
  ruh.kademeAyarla(o, 2);
  /* KAPANDIGI ANDA olcuyoruz. Ilk yazimda 400 tick birden
     yurutulmustu ve ruh 380 cikti -- form dogru kapanmisti
     ama havuz sonrasinda YENIDEN DOLMUSTU. Yani olcum
     kapanmayi degil, kapanma SONRASINI goruyordu.          */
  let kapanmaRuhu = -1;
  for (let t = 0; t < 400; t++) {
    tickIlerlet(1);
    if (ruh.kademeOku(o.id) === 0 && kapanmaRuhu < 0) kapanmaRuhu = ruh.ruhOku(o);
  }
  kontrol("kapandigi an ruh tukenmisti", kapanmaRuhu === 0,
          String(kapanmaRuhu));
  kontrol("form KAPANDI", ruh.kademeOku(o.id) === 0,
          "kademe " + ruh.kademeOku(o.id));
  kontrol("sonra havuz yeniden doluyor", ruh.ruhOku(o) > 0,
          String(ruh.ruhOku(o)));
}

console.log("=== 4. SURE DOLUNCA FORM KENDI KAPANIYOR ===");
{
  /* Ikinci sinir. Ruh bol olsa BILE sure kapatmali.         */
  const { o } = kur();
  ruh.ruhYaz(o, ayar.RUH_TAVAN);
  ruh.kademeAyarla(o, 1, 40);         // kisa sure, tuketim dusuk
  for (let t = 0; t < 80; t++) tickIlerlet(1);
  kontrol("form KAPANDI", ruh.kademeOku(o.id) === 0,
          "kademe " + ruh.kademeOku(o.id));
  kontrol("ruh hala vardi (sure kapatti)", ruh.ruhOku(o) > 0,
          String(ruh.ruhOku(o)));
}

console.log("=== 5. KURTARICI: CAN ESIGIN ALTINA DUSUNCE ===");
{
  const { o } = kur(20, 20);
  for (let t = 0; t < 40; t++) tickIlerlet(1);
  kontrol("dolu canda kapali", ruh.kademeOku(o.id) === 0);
  o._can = 20 * (ayar.KURTARICI_ESIK - 0.05);   // esigin ALTI
  for (let t = 0; t < 40; t++) tickIlerlet(1);
  kontrol("esigin altinda kademe 2 acildi", ruh.kademeOku(o.id) === 2,
          "kademe " + ruh.kademeOku(o.id));
  kontrol("mesaj geldi", o._mesaj.length > 0, o._mesaj.join(" | "));
}

console.log("=== 5b. ESIK ILE TOPARLAMA ARASINDA TETIKLENMIYOR ===");
{
  /* Mutasyon "esik denetimi yok" ILK TURDA KACTI: dolu canda
     zaten toparlama dali donuyordu, yani esik denetimine hic
     gelinmiyordu. Asil fark ARADAKI bolgede: %35 canla
     tetiklenmemeli, cunku esik %25.                        */
  const orta = (ayar.KURTARICI_ESIK + ayar.KURTARICI_TOPARLAMA) / 2;
  const { o } = kur(20, 20);
  for (let t = 0; t < 40; t++) tickIlerlet(1);   // silahlansin
  o._can = 20 * orta;                            // esik USTU, toparlama ALTI
  for (let t = 0; t < 200; t++) tickIlerlet(1);
  kontrol("%" + Math.round(orta * 100) + " canda tetiklenmedi",
          ruh.kademeOku(o.id) === 0, "kademe " + ruh.kademeOku(o.id));
  o._can = 20 * (ayar.KURTARICI_ESIK - 0.05);    // simdi esigin ALTI
  for (let t = 0; t < 40; t++) tickIlerlet(1);
  kontrol("esigin altina inince tetiklendi", ruh.kademeOku(o.id) === 2,
          "kademe " + ruh.kademeOku(o.id));
}

console.log("=== 6. ESIKTE TITREYEN CAN SUREKLI YAKMIYOR ===");
{
  /* Toparlama esigi olmasaydi esikte gidip gelen can her
     seferinde formu yeniden acar, ruhu bitirirdi. gozcu.js'in
     af mantiginin ayni gerekcesi.                           */
  const { o } = kur(20, 20);
  o._can = 20 * (ayar.KURTARICI_ESIK - 0.05);
  for (let t = 0; t < 40; t++) tickIlerlet(1);
  ruh.kademeAyarla(o, 0);             // form bitti diyelim
  const once = ruh.ruhOku(o);
  for (let t = 0; t < 200; t++) tickIlerlet(1);   // can HALA dusuk
  kontrol("yeniden ACILMADI", ruh.kademeOku(o.id) === 0,
          "kademe " + ruh.kademeOku(o.id));
}

console.log("=== 7. TOPARLAYINCA YENIDEN SILAHLANIYOR ===");
{
  const { o } = kur(20, 20);
  o._can = 20 * (ayar.KURTARICI_ESIK - 0.05);
  for (let t = 0; t < 40; t++) tickIlerlet(1);
  ruh.kademeAyarla(o, 0);
  o._can = 20 * (ayar.KURTARICI_TOPARLAMA + 0.1);   // toparladi
  for (let t = 0; t < 40; t++) tickIlerlet(1);
  o._can = 20 * (ayar.KURTARICI_ESIK - 0.05);       // yine dustu
  for (let t = 0; t < 40; t++) tickIlerlet(1);
  kontrol("ikinci kez tetiklendi", ruh.kademeOku(o.id) === 2,
          "kademe " + ruh.kademeOku(o.id));
}

console.log("=== 8. LETZT STIL BEDELI ===");
{
  /* Bleach'te Letzt Stil gucunu kaybettiriyor; modda ayri bir
     drainLeztz olcegi var. Yalniz Quincy yolunda ve yalniz
     2. kademeden inerken uygulaniyor.                       */
  const { o } = kur();
  ruh.yolYaz(o, "letzt");
  ruh.ruhYaz(o, ayar.RUH_TAVAN);
  ruh.kademeAyarla(o, 2);
  ruh.kademeAyarla(o, 0);
  kontrol("Quincy: ruh dibe vurdu",
          ruh.ruhOku(o) === Math.floor(ayar.RUH_TAVAN * ayar.RUH_LETZT_BEDEL),
          String(ruh.ruhOku(o)));

  const { o: o2 } = kur();
  ruh.yolYaz(o2, "getsuga");
  ruh.ruhYaz(o2, ayar.RUH_TAVAN);
  ruh.kademeAyarla(o2, 2);
  ruh.kademeAyarla(o2, 0);
  kontrol("Getsuga: bedel UYGULANMADI", ruh.ruhOku(o2) === ayar.RUH_TAVAN,
          String(ruh.ruhOku(o2)));
}

console.log("=== 9. YOL SECIMI ===");
{
  const { o } = kur();
  kontrol("varsayilan yol", ruh.yolOku(o) === ayar.RUH_VARSAYILAN_YOL,
          ruh.yolOku(o));
  for (const y of ayar.RUH_YOLLAR) {
    kontrol("  " + y.ad + " secilebiliyor",
            ruh.yolYaz(o, y.kimlik) && ruh.yolOku(o) === y.kimlik);
  }
  kontrol("bilinmeyen yol REDDEDILIYOR", ruh.yolYaz(o, "yok_boyle") === false);
}

console.log("=== 10. OYUNCU CIKINCA DEFTER TEMIZ ===");
{
  const { o } = kur();
  ruh.kademeAyarla(o, 2);
  kontrol("kademe var", ruh.kademeOku(o.id) === 2);
  ruh.ruhUnut(o.id);
  kontrol("unutuldu", ruh.kademeOku(o.id) === 0);
  const fs = await import("node:fs");
  kontrol("main.js ruhUnut'u cagiriyor",
          /ruhUnut\(olay\.playerId\)/.test(fs.readFileSync("./pack/main.js", "utf8")));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
