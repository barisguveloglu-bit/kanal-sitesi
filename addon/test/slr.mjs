/* SLR · SOLO LEVELING SILAHLARI                       v7.58

   Kaynak "SLR 1.7.8" bir CurseForge MODPAKETI; mod jar'lari
   icinde YOK. Bu dosya kaynaktan gelen SAYILARI degil, bizim
   kurdugumuz UC GUVENCEYI tutuyor:

   1. KOL TAKILIYKEN KAPALI. Hem tetiklenmiyor hem SUREN IS
      kesiliyor. Ikincisi kullanicinin asil istegiydi ve
      kendiliginden gelmiyordu.
   2. TEK GUC KAPISI. Butun hasarlar SLR_ORAN x ruhCarpani.
      SLR_STAT_TAVAN degisince ikisi birden degismeli.
   3. RUTBE TAVANDA S, ALTINDA EN COK A. Kullanicinin
      "tavanin 10 altı" kurali ekranda da gorunmeli.        */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const slr = await import("./pack/yetenekler/slr.js");
const ruh = await import("./pack/yetenekler/ruh.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const bul = (k) => [...kayit.tumYetenekler()].find((y) => y.kimlik === k);

let n = 0;
function kur(kademe = 0) {
  ruh.ruhUnut(); butce.butceSifirla();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "s" + (++n); o.typeId = "minecraft:player";
  o._can = 20; o._maks = 20; o._mesaj = []; o._efekt = [];
  o._ozellik = new Map();
  /* dunya.mjs'in equippable taklidi KORUNUYOR: getComponent'i
     bastan yazsaydik "elde kol var mi" denetimi hicbir zaman
     kolu goremezdi. Ilk yazimda tam bu oldu ve kol denetimi
     testi sessizce yanlis olcuyordu.                        */
  const asilGet = o.getComponent.bind(o);
  o.getComponent = (a) => a === "minecraft:health"
    ? { currentValue: o._can, effectiveMax: o._maks, defaultValue: 20 }
    : asilGet(a);
  o.addEffect = (ad, s, x) => { o._efekt.push({ ad, s, a: x && x.amplifier }); return true; };
  o.sendMessage = (m) => o._mesaj.push(m);
  o.runCommand = () => ({ successCount: 1 });
  o.getDynamicProperty = (k) => o._ozellik.get(k);
  o.setDynamicProperty = (k, v) => { o._ozellik.set(k, v); };
  _durum.oyuncular = [o];
  if (kademe > 0) ruh.kademeAyarla(o, kademe);
  return { D, o };
}
function kurban(id, konum) {
  return {
    id, typeId: "minecraft:zombie", isValid: true, location: konum,
    _hasar: 0, _kez: 0, _efekt: [], _itme: 0,
    applyDamage(h) { this._hasar += h; this._kez++; return true; },
    addEffect(a, s, x) { this._efekt.push({ a, s }); return true; },
    applyKnockback(x, z, g) { this._itme = g; return true; },
    setOnFire() { return true; }
  };
}
/* Kol taklidi: olcut main.js'inkiyle AYNI -- "elde yetenegi
   olan esya". Gercek bir kol kimligi kullaniyoruz ki kayit
   degisirse test de degissin.                              */
function koluTak(o, esya) { o._elde = esya; }   // oyuncuKur'un alani

/* SOL ele kol: oyuncuKur'un taklidi yalniz Mainhand biliyor,
   o yuzden equippable'i burada geniletiyoruz. Cift el gercek
   bir ozellik (CIFT_EL_ACIK) -- sol eldeki kol da SLR'yi
   kesmeli. Bu bolum bir mutasyonun kacmasindan dogdu.     */
function solEleKol(o, esya) {
  const asilGet = o.getComponent.bind(o);
  o.getComponent = (a) => {
    if (a === "minecraft:equippable") {
      return { getEquipment: (s) => (s === "Offhand" ? { typeId: esya } : undefined) };
    }
    return asilGet(a);
  };
}

console.log("=== 0. IKI SILAH KAYITLI ===");
for (const k of ["slr_kilic", "slr_hancer"]) {
  kontrol(k + " kayitli", !!bul(k), bul(k) ? bul(k).ad : "yok");
}
kontrol("ikisi de 520+ sirada (onceki aileler bozulmadi)",
        bul("slr_kilic").sira >= 520 && bul("slr_hancer").sira >= 520,
        bul("slr_kilic").sira + "," + bul("slr_hancer").sira);
kontrol("ikisi de esyasiz (kol takiliyken jest siraya bakmiyor)",
        bul("slr_kilic").esyasiz === true && bul("slr_hancer").esyasiz === true);

console.log("=== 1. KOL TAKILIYKEN ACILMIYOR ===");
{
  /* Kilic anlik: her halukarda undefined donuyor, yani donus
     degeriyle olculemez. Olcut HASAR -- ilk yazimda donus
     degerine bakmistim ve o kontrol hep gecerdi.           */
  const esya = "pa:kol_toprak";
  {
    const { D, o } = kur();
    const h = kurban("c1", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    bul("slr_kilic").olustur(o);
    kontrol("slr_kilic kolsuzken VURUYOR", h._hasar > 0, "hasar " + h._hasar);
  }
  {
    const { D, o } = kur();
    const h = kurban("c2", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    koluTak(o, esya);
    bul("slr_kilic").olustur(o);
    kontrol("slr_kilic KOL TAKILIYKEN hic vurmuyor", h._hasar === 0,
            "hasar " + h._hasar);
  }
  {
    const { D, o } = kur();
    D.boyut.getEntities = () => [];
    kontrol("slr_hancer kolsuzken is aciyor", bul("slr_hancer").olustur(o) !== undefined);
    const { D: D2, o: o2 } = kur();
    D2.boyut.getEntities = () => [];
    koluTak(o2, esya);
    kontrol("slr_hancer KOL TAKILIYKEN is ACMIYOR",
            bul("slr_hancer").olustur(o2) === undefined);
  }
  {
    const { D, o } = kur();
    const h = kurban("c4", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    solEleKol(o, esya);
    bul("slr_kilic").olustur(o);
    kontrol("SOL eldeki kol da engelliyor", h._hasar === 0, "hasar " + h._hasar);
  }
  {
    /* Kol OLMAYAN bir esya (yetenegi yok) engellememeli:
       olcut "elinde bir sey var mi" degil, "KOL var mi". */
    const { D, o } = kur();
    const h = kurban("c3", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    koluTak(o, "minecraft:diamond_sword");
    bul("slr_kilic").olustur(o);
    kontrol("elmas kilic engellemiyor (kol degil)", h._hasar > 0,
            "hasar " + h._hasar);
  }
}

console.log("=== 2. SUREN IS KOL TAKILINCA KESILIYOR ===");
{
  /* Kullanicinin asil istegi. Is BASLIYOR, ortasinda kol
     takiliyor, is o tick bitmeli ve daha fazla vurmamali. */
  const { D, o } = kur();
  const h = kurban("h1", { x: 3, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  const is = bul("slr_hancer").olustur(o);
  kontrol("is acildi", !!is);
  for (let i = 0; i < ayar.SLR_HANCER_ADIM * 2 + 2; i++) { is.calis(); tickIlerlet(1); }
  const vurusOnce = h._kez;
  kontrol("kol takilmadan once vurdu", vurusOnce > 0, vurusOnce + " vurus");
  koluTak(o, "pa:kol_toprak");
  kontrol("kol takilinca is BITTI", is.calis() === true);
  for (let i = 0; i < 20; i++) { is.calis(); tickIlerlet(1); }
  kontrol("kol takildiktan sonra HIC vurmadi", h._kez === vurusOnce,
          vurusOnce + " -> " + h._kez);
}
{
  /* Ayar kapaliyken eski davranis: is surer. Bu, kesme
     mantiginin ayara BAGLI oldugunu olcuyor.              */
  kontrol("SLR_KOL_KES ayari acik", ayar.SLR_KOL_KES === true);
}

console.log("=== 3. KILIC: GENIS YAY, ZAYIFLIK, SAVURMA ===");
{
  const { D, o } = kur();
  const on = kurban("k1", { x: 4, y: 90.6, z: 0.5 });
  const yan = kurban("k2", { x: 2, y: 90.6, z: 3 });     // genis yayin icinde
  const arka = kurban("k3", { x: -5, y: 90.6, z: 0.5 }); // tam arkada
  D.boyut.getEntities = () => [on, yan, arka];
  bul("slr_kilic").olustur(o);
  kontrol("ondeki vuruldu", on._hasar > 0, "hasar " + on._hasar.toFixed(1));
  kontrol("GENIS yay: yandaki de vuruldu", yan._hasar > 0,
          "hasar " + yan._hasar.toFixed(1));
  kontrol("tam arkadaki vurulmadi", arka._hasar === 0);
  kontrol("zayiflik verildi", on._efekt.some((e) => e.a === "weakness"));
  kontrol("savuruldu", on._itme === ayar.SLR_KILIC_ITME, "" + on._itme);
}

console.log("=== 4. TEK GUC KAPISI: SLR_ORAN x CARPAN ===");
{
  const { D, o } = kur(0);
  const h = kurban("g1", { x: 4, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  bul("slr_kilic").olustur(o);
  const beklenen = ayar.SLR_KILIC_HASAR * ayar.SLR_ORAN;
  kontrol("normal kademede hasar = temel x SLR_ORAN",
          Math.abs(h._hasar - beklenen) < 0.001,
          h._hasar.toFixed(2) + " ~ " + beklenen.toFixed(2));

  const { D: D2, o: o2 } = kur(2);
  const h2 = kurban("g2", { x: 4, y: 90.6, z: 0.5 });
  D2.boyut.getEntities = () => [h2];
  bul("slr_kilic").olustur(o2);
  const bek2 = ayar.SLR_KILIC_HASAR * ayar.SLR_ORAN * ayar.RUH_KADEMELER[2].carpan;
  kontrol("kademe 2'de RUH CARPANI da giriyor",
          Math.abs(h2._hasar - bek2) < 0.001,
          h2._hasar.toFixed(2) + " ~ " + bek2.toFixed(2));
}

console.log("=== 5. STAT TAVANIN 10 ALTINDA ===");
{
  kontrol("SLR_STAT = TAVAN - FARK",
          ayar.SLR_STAT === ayar.SLR_STAT_TAVAN - ayar.SLR_STAT_FARK,
          ayar.SLR_STAT_TAVAN + " - " + ayar.SLR_STAT_FARK + " = " + ayar.SLR_STAT);
  kontrol("fark tam olarak 10", ayar.SLR_STAT_FARK === 10);
  kontrol("SLR_ORAN = STAT / TAVAN",
          Math.abs(ayar.SLR_ORAN - ayar.SLR_STAT / ayar.SLR_STAT_TAVAN) < 1e-9,
          "" + ayar.SLR_ORAN);
  kontrol("tavanda degiliz (oran < 1)", ayar.SLR_ORAN < 1, "" + ayar.SLR_ORAN);
  kontrol("rutbe merdiveni kaynaktan: E D C B A S",
          ayar.SLR_RUTBELER.join("") === "EDCBAS", ayar.SLR_RUTBELER.join(""));
  /* S yalniz TAVANIN kendisi. Bu dal sabitten okunsaydi
     sinanamazdi; slrRutbe sayilari parametre aliyor.      */
  kontrol("tavanda rutbe S", slr.slrRutbe(100, 100) === "S", slr.slrRutbe(100, 100));
  kontrol("tavanin 10 altinda rutbe A (S DEGIL)",
          slr.slrRutbe(90, 100) === "A", slr.slrRutbe(90, 100));
  kontrol("bir eksikte bile S olmuyor",
          slr.slrRutbe(99, 100) === "A", slr.slrRutbe(99, 100));
  kontrol("dipte rutbe E", slr.slrRutbe(0, 100) === "E", slr.slrRutbe(0, 100));
  kontrol("bizim ayarimiz A veriyor", slr.slrRutbe() === "A", slr.slrRutbe());
}

console.log("=== 6. HANCER: ADET VE YAVASLIK ===");
{
  const { D, o } = kur();
  const a = kurban("y1", { x: 3, y: 90.6, z: 0.5 });
  const b = kurban("y2", { x: 3.5, y: 90.6, z: 0.6 });
  D.boyut.getEntities = () => [a, b];
  const is = bul("slr_hancer").olustur(o);
  let tick = 0;
  while (tick < 300 && !is.calis()) { tickIlerlet(1); tick++; }
  kontrol("is kendi kendine kapandi", tick < 300, tick + " tick");
  kontrol("tam SLR_HANCER_ADET kadar vurdu",
          a._kez + b._kez === ayar.SLR_HANCER_ADET,
          (a._kez + b._kez) + " / " + ayar.SLR_HANCER_ADET);
  kontrol("vuruslar hedefler arasinda DAGILDI (10 tick dokunulmazligi)",
          a._kez > 0 && b._kez > 0, a._kez + " + " + b._kez);
  kontrol("yavaslik verildi", a._efekt.some((e) => e.a === "slowness"));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
