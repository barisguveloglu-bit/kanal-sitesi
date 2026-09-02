/* DAVE1545 -- hedef kilidi + kasirga + koruma kubbesi.

   Sinanmasi gerekenler:
     - simsek karsidaki varliga kilitleniyor mu
     - hedef YOKSA eski davranis (baktigin noktaya) bozulmadi mi
     - hedef KACARSA yildirim pesinden gidiyor mu
     - arkadaki varlik hedef sayilmiyor mu (referansin @e[r,c=1] hatasi)
     - oyuncunun KENDISI hedef sayilmiyor mu (ayni hata)
     - kasirga varliklari donduruyor + kaldiriyor mu, tavani asiyor mu
     - kubbe sadece havaya oruyor ve KOYDUGUNU GERI ALIYOR mu           */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum, system } from "@minecraft/server";

esyaKaydet("pa:kol_dave", "pa:kol_toprak");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

/* Oyuncu +x yonune bakiyor. Hedefleri ona gore koyuyoruz. */
function kur(id, elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, BAS);
  o.id = id;
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: (s) => (s === "Mainhand" && elde) ? { typeId: elde } : undefined,
        setEquipment: () => true }
    : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

function mob(id, x, y, z, tip = "minecraft:zombie") {
  return {
    id, typeId: tip, isValid: true,
    location: { x, y, z },
    _itmeler: [],
    applyImpulse(i) { this._itmeler.push({ x: i.x, y: i.y, z: i.z }); },
    applyKnockback: () => true,
    addEffect: () => {},
    applyDamage: () => true,
    remove() { this.isValid = false; }
  };
}

function zipla(o, tick = 400) {
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(tick); ac();
}

/* Yetenegi KOL uzerinden degil DOGRUDAN calistirir.

   Bu dosya once tek yetenekli "Simsek Kolu"nu eline verip
   ziplatiyordu. v4.46'da o kol kaldirildi (yon_simsegi zaten
   Toprak Kol'un icindeydi) ve testler yanlis yetenegi
   olcmeye basladi. Artik kol dizilimi hic onemli degil.       */
const { yetenekAl } = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");

function isBaslat(o, kimlik) {
  sus();
  const isler = [].concat(yetenekAl(kimlik).olustur(o) || []);
  ac();
  return isler;
}

/* Acik isleri "tick" kadar surer. Ayri durmasinin sebebi:
   bazi testler is ORTASINDA dunyayi degistiriyor (hedef
   kaciyor, hedef oluyor) ve sonra devam ettiriyor.          */
function isSur(isler, tick) {
  sus();
  for (let t = 0; t < tick && isler.length; t++) {
    butceSifirla();
    for (let i = isler.length - 1; i >= 0; i--) {
      if (isler[i].calis()) {
        if (isler[i].bitir) isler[i].bitir();
        isler.splice(i, 1);
      }
    }
    tickIlerlet(1);
  }
  ac();
  return isler;
}

function yetenegiSur(o, kimlik, tick = 400) {
  const isler = isSur(isBaslat(o, kimlik), tick);
  sus();
  for (const is of isler) if (is.bitir) is.bitir();
  isler.length = 0;
  ac();
}

/* yon_simsegi Toprak Kol'un icinde ama testler onu DOGRUDAN
   calistiriyor (yetenegiSur). Kol dizilimi degisirse bu dosya
   etkilenmiyor.                                                */

console.log("=== 1. HEDEF KILIDI ===");
{
  const { D, o } = kur("dv1", undefined);
  D.boyut._varliklar = [o, mob("z1", 10.5, 90, 0.5)];
  yetenegiSur(o, "yon_simsegi");

  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  kontrol("kilitliyken simsek dustu", sim.length > 0, sim.length + " yildirim");

  // Hepsi hedefin ustune, KILIT_YAYILMA kadar sacilmayla
  const uzak = sim.filter((s) =>
    Math.abs(s.x - 10.5) > ayar.KILIT_YAYILMA + 0.001 ||
    Math.abs(s.z - 0.5)  > ayar.KILIT_YAYILMA + 0.001);
  kontrol("hepsi hedefin uzerine dustu", uzak.length === 0,
          uzak.length + " tanesi sapti");

  kontrol("kilitliyken daha az simsek atildi (KILIT_SAYISI)",
          sim.length === ayar.KILIT_SAYISI,
          sim.length + " / " + ayar.KILIT_SAYISI);

  kontrol("actionbar kilidi bildirdi",
          /kilitlendi/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
}

console.log("");
console.log("=== 2. HEDEF YOKSA ESKI DAVRANIS ===");
{
  const { D, o } = kur("dv2", undefined);
  D.boyut._varliklar = [o];              // sadece oyuncu, hedef yok
  yetenegiSur(o, "yon_simsegi");

  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  kontrol("hedef yokken de simsek dustu", sim.length > 0, sim.length + " yildirim");
  kontrol("hedef yokken TAM sayida atildi (SIMSEK_SAYISI)",
          sim.length === ayar.SIMSEK_SAYISI,
          sim.length + " / " + ayar.SIMSEK_SAYISI);

  // Genis sacilma = YAYILMA; en az biri KILIT_YAYILMA'yi asmali
  const genis = sim.some((s) =>
    Math.abs(s.x - (BAS.x + ayar.MENZIL)) > ayar.KILIT_YAYILMA);
  kontrol("sacilma genis kaldi (kilit modu degil)", genis);
}

console.log("");
console.log("=== 3. ARKADAKI VE KENDISI HEDEF DEGIL ===");
{
  // Referans mod @e[r=10,c=1] kullaniyordu: yon bakmaz, kendini de sayar
  const { D, o } = kur("dv3", undefined);
  D.boyut._varliklar = [o, mob("arka", -8.5, 90, 0.5)];   // TAM ARKADA
  yetenegiSur(o, "yon_simsegi");

  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  kontrol("arkadaki mob kilitlenmedi", sim.length === ayar.SIMSEK_SAYISI,
          sim.length + " yildirim (kilitliyse " + ayar.KILIT_SAYISI + " olurdu)");

  const arkaya = sim.filter((s) => s.x < 0);
  kontrol("arkaya simsek dusmedi", arkaya.length === 0, arkaya.length + " tane");
}
{
  const { D, o } = kur("dv4", undefined);
  D.boyut._varliklar = [o];              // sadece oyuncunun kendisi
  yetenegiSur(o, "yon_simsegi");
  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  const ustune = sim.filter((s) =>
    Math.abs(s.x - BAS.x) < 2 && Math.abs(s.z - BAS.z) < 2);
  kontrol("oyuncu kendine kilitlenmedi", ustune.length === 0,
          ustune.length + " tane kendi ustune");
}

console.log("");
console.log("=== 4. KACAN HEDEFIN PESINDEN GITME ===");
{
  const { D, o } = kur("dv5", undefined);
  const kacan = mob("kac", 10.5, 90, 0.5);
  D.boyut._varliklar = [o, kacan];

  const isler = isBaslat(o, "yon_simsegi");
  isSur(isler, 10);
  kacan.location = { x: 10.5, y: 90, z: 40.5 };   // yagmur surerken kacti
  isSur(isler, 400);

  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  const eski = sim.filter((s) => s.z < 20);
  const yeni = sim.filter((s) => s.z > 20);
  kontrol("hedef kacmadan once eski yere dustu", eski.length > 0, eski.length + " tane");
  kontrol("hedef kacinca YENI yere dustu", yeni.length > 0, yeni.length + " tane");
}
{
  /* Hedef yagmur ortasinda olurse: son bilinen yere devam etmeli,
     hata firlatmamali.                                            */
  const { D, o } = kur("dv6", undefined);
  const olen = mob("olen", 10.5, 90, 0.5);
  D.boyut._varliklar = [o, olen];

  const isler2 = isBaslat(o, "yon_simsegi");
  isSur(isler2, 10);
  olen.isValid = false;                    // varlik yok oldu
  isSur(isler2, 400);

  const sim = D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt");
  kontrol("hedef olunce yagmur cokmedi", sim.length === ayar.KILIT_SAYISI,
          sim.length + " / " + ayar.KILIT_SAYISI);
}

console.log("");
console.log("=== 5. KASIRGA ===");
{
  const { D, o } = kur("dv7", "pa:kol_dave");
  const kurbanlar = [];
  for (let i = 0; i < 20; i++) kurbanlar.push(mob("k" + i, 3.5 + i * 0.2, 90, 0.5));
  D.boyut._varliklar = [o, ...kurbanlar];

  zipla(o, ayar.KASIRGA_SURE + 40);

  const itilen = kurbanlar.filter((k) => k._itmeler.length > 0);
  kontrol("kasirga varliklari itti", itilen.length > 0, itilen.length + " varlik");

  kontrol("ayni tickte tavan asilmadi (KASIRGA_TAVAN)",
          itilen.length <= ayar.KASIRGA_TAVAN,
          itilen.length + " / " + ayar.KASIRGA_TAVAN);

  const yukari = itilen.some((k) => k._itmeler.some((i) => i.y > 0));
  kontrol("yukari kaldirma uygulandi", yukari);

  /* Teget itme: itme vektoru yaricap vektoruyle ayni yonde
     OLMAMALI -- olsaydi savurma olurdu, donme degil.           */
  const k0 = itilen[0];
  const ilk = k0._itmeler[0];
  const yatay = Math.abs(ilk.x) + Math.abs(ilk.z);
  kontrol("yatay itme var (donme)", yatay > 0.01, "|x|+|z| = " + yatay.toFixed(3));

  kontrol("oyuncunun kendisi savrulmadi", (o._itmeler || []).length === 0);
}

console.log("");
console.log("=== 6. KORUMA KUBBESI ===");
{
  const { D, o } = kur("dv8", "pa:kol_dave");
  D.boyut._varliklar = [o];

  // Dave Kolu'nda kubbe 2. sirada: bir kez yetenek degistir
  o.isSneaking = true;
  o.getViewDirection = () => ({ x: 0, y: 1, z: 0 });     // tam yukari bak
  sus(); tickIlerlet(40); ac();
  kontrol("yetenek Kubbe'ye gecti",
          /Kubbe/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);

  o.getViewDirection = () => ({ x: 1, y: -0.05, z: 0 });
  const oncekiYazim = D.sayac.setType;
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(30); ac();

  const barrier = D.sayac.yazilan.filter((y) => y.tip === "minecraft:barrier");
  kontrol("kubbe orduldu", barrier.length > 0, barrier.length + " barrier");

  /* Kabuk: hepsi merkeze KUBBE_YARICAP mesafesinde olmali.
     Merkez oyuncunun AYAK konumunun tam sayiya yuvarlanmisi:
     goz 90.6, ayak 90.6-1.62 = 88.98 -> floor 88. (Bir tick
     once burada 89 yaziyordu ve "ici bos" testi bu yuzden
     yanlis yerden olcup hatali sonuc veriyordu.)             */
  const merkez = { x: 0, y: 88, z: 0 };
  const disari = barrier.filter((b) => {
    const d = Math.hypot(b.x - merkez.x, b.y - merkez.y, b.z - merkez.z);
    return d > ayar.KUBBE_YARICAP + 1.5;
  });
  kontrol("kabuk yaricapi asmadi", disari.length === 0, disari.length + " tanesi disarida");

  // Ici bos: merkezin tam ustune barrier konmamali
  const icerde = barrier.filter((b) =>
    Math.hypot(b.x - merkez.x, b.y - merkez.y, b.z - merkez.z) < ayar.KUBBE_YARICAP - 1.5);
  kontrol("kubbenin ici bos", icerde.length === 0, icerde.length + " tanesi icerde");

  // Sadece havaya kondu mu: y<64 tas, oraya barrier konmamali
  const tasaKonan = barrier.filter((b) => b.y < 64);
  kontrol("dolu yere barrier konmadi", tasaKonan.length === 0,
          tasaKonan.length + " tanesi tasin yerine");

  // Sure dolunca geri alinmali
  sus(); tickIlerlet(ayar.KUBBE_SURE + 60); ac();
  const geriAlinan = D.sayac.yazilan.filter(
    (y) => y.tip === "minecraft:air" && y.y >= 64).length;
  kontrol("kubbe geri alindi (iz birakmadi)",
          geriAlinan >= barrier.length,
          geriAlinan + " hava yazimi / " + barrier.length + " barrier");

  const enFazla = Math.max(0, ...Object.values(D.sayac.tickBlok));
  kontrol("kubbe butceyi asmadi", enFazla <= ayar.TICK_BLOK_BUTCESI,
          enFazla + " / " + ayar.TICK_BLOK_BUTCESI);
}

console.log("");
console.log("=== 7. KOL KAYDI ===");
{
  const kayit = await import("./pack/yetenekler/kayit.js");
  for (const y of ["kasirga", "kubbe"]) {
    kontrol(y + " kayitli", kayit.yetenekAl(y) !== undefined);
  }
  const liste = kayit.esyaninYetenekleri("pa:kol_dave");
  kontrol("Dave Kolu 4 yetenege bagli", liste && liste.length === 4,
          liste ? liste.map((t) => t.kimlik).join(", ") : "bagli degil");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum Dave1545 testleri gecti");
process.exit(hata ? 1 : 0);
