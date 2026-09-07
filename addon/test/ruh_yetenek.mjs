/* UC YOLUN YETENEKLERI                                 v7.56

   Hepsi Bleach: Kurosaki Dynasty 2.4.6 siniflarindan OKUNARAK
   cikarildi (jar calistirilmadi):

     EntityGetsuga        -> Getsuga Tensho
     ItemBankai           -> shockwaveRing/healTimer -> Bankai Halkasi
     EntityCeroCharge/Fired -> Cero (iki asama)
     ItemLeztzBow         -> RapidFire/WideShot/Charged
     BlockReishiPlatform  -> Reishi Zemini

   ---- BU DOSYANIN TUTTUGU IKI SEY ----
   1. YOL AYRIMI. Her yetenek yalniz KENDI yolunda calisiyor.
      Bu duserse uc yol tek yiginla karisir ve secim anlamsizlasir.
   2. CARPAN. Butun sayilar ruhCarpani ile olcekleniyor; tek
      kapi olmasi onemli, iki ayri hesap er gec ayrisir.      */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const ruh = await import("./pack/yetenekler/ruh.js");
const ry = await import("./pack/yetenekler/ruh_yetenekler.js");
const butce = await import("./pack/butce.js");
const yardim = await import("./pack/yardimcilar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const bul = (k) => [...kayit.tumYetenekler()].find((y) => y.kimlik === k);

let n = 0;
function kur(yol = "getsuga", kademe = 0) {
  ruh.ruhUnut(); ry.quincyUnut(); ry.reishiUnut(); butce.butceSifirla();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "y" + (++n); o.typeId = "minecraft:player";
  o._can = 20; o._maks = 20; o._mesaj = []; o._efekt = [];
  o._ozellik = new Map();
  o.isSneaking = false;
  o.getComponent = (a) => a === "minecraft:health"
    ? { currentValue: o._can, effectiveMax: o._maks, defaultValue: 20 } : undefined;
  o.addEffect = (ad, s, x) => { o._efekt.push({ ad, s, a: x && x.amplifier }); return true; };
  o.sendMessage = (m) => o._mesaj.push(m);
  o.runCommand = () => ({ successCount: 1 });
  o.getDynamicProperty = (k) => o._ozellik.get(k);
  o.setDynamicProperty = (k, v) => { o._ozellik.set(k, v); };
  _durum.oyuncular = [o];
  ruh.yolYaz(o, yol);
  if (kademe > 0) ruh.kademeAyarla(o, kademe);
  return { D, o };
}
const yurut = (is, kere = 200) => { for (let i = 0; i < kere && !is.calis(); i++); };

console.log("=== 0. BES YETENEK + SECIM KAYITLI ===");
for (const k of ["getsuga", "bankai_halka", "cero", "quincy_ok", "reishi", "ruh_yol"]) {
  kontrol(k + " kayitli", !!bul(k), bul(k) ? bul(k).ad : "yok");
}
kontrol("hepsi 500+ sirada (cekirdek sira bozulmadi)",
        ["getsuga", "bankai_halka", "cero", "quincy_ok", "reishi", "ruh_yol"]
          .every((k) => bul(k).sira >= 500),
        ["getsuga", "bankai_halka", "cero", "quincy_ok", "reishi", "ruh_yol"]
          .map((k) => bul(k).sira).join(","));

console.log("=== 1. YOL AYRIMI ===");
{
  /* Her yetenek YALNIZ kendi yolunda. Bu duserse secim
     anlamsizlasir: uc yol tek yigina doner.                */
  const esles = { getsuga: "getsuga", bankai_halka: "getsuga",
                  cero: "cero", quincy_ok: "letzt", reishi: "letzt" };
  for (const [kimlik, dogruYol] of Object.entries(esles)) {
    for (const yol of ["getsuga", "cero", "letzt"]) {
      const { o } = kur(yol, 2);
      const is = bul(kimlik).olustur(o);
      const olmali = (yol === dogruYol);
      if (olmali) kontrol(kimlik + " · " + yol + " -> CALISIR", !!is);
      else kontrol(kimlik + " · " + yol + " -> sessiz", is === undefined);
    }
  }
}

console.log("=== 2. GETSUGA: mermi ilerliyor, hasar veriyor ===");
{
  const { D, o } = kur("getsuga", 2);
  const kurban = { id: "k1", typeId: "minecraft:zombie", isValid: true,
                   location: { x: 8, y: 89, z: 0.5 }, _hasar: 0,
                   applyDamage(n) { this._hasar += n; return true; } };
  D.boyut._varliklar = [kurban];
  D.boyut.getEntities = () => [kurban];
  const is = bul("getsuga").olustur(o);
  kontrol("is acildi", !!is);
  yurut(is);
  kontrol("kurban vuruldu", kurban._hasar > 0, "hasar " + kurban._hasar.toFixed(1));
  kontrol("hasar CARPANLA olcekli",
          kurban._hasar >= ayar.GETSUGA_HASAR * ayar.RUH_KADEMELER[2].carpan - 0.01,
          kurban._hasar.toFixed(1) + " >= " +
          (ayar.GETSUGA_HASAR * ayar.RUH_KADEMELER[2].carpan).toFixed(1));
}
{
  /* AYNI hedefe iki kez vurmamali: mermi icinden gecerken
     her tick vursaydi hasar menzile baglanirdi.            */
  const { D, o } = kur("getsuga", 0);
  const kurban = { id: "k2", typeId: "minecraft:zombie", isValid: true,
                   location: { x: 8, y: 89, z: 0.5 }, _kez: 0,
                   applyDamage() { this._kez++; return true; } };
  D.boyut.getEntities = () => [kurban];
  yurut(bul("getsuga").olustur(o));
  kontrol("ayni hedefe TEK kez vurdu", kurban._kez === 1, kurban._kez + " kez");
}
{
  /* DUVAR. GETSUGA_BLOK_KIR kapaliyken mermi duvarda DURMALI.
     Bu dusunce kacmisti: mutasyon "else return true" satirini
     silince butun testler yesil kaldi -- yani duvarin ardindaki
     oyuncuyu vuran bir mermi kimseye carpmiyordu. Duvar arkasi
     vurus, blok kirmaktan daha kotu.                          */
  const { D, o } = kur("getsuga", 0);
  const kurban = { id: "k2b", typeId: "minecraft:zombie", isValid: true,
                   location: { x: 8, y: 89, z: 0.5 }, _hasar: 0,
                   applyDamage(n) { this._hasar += n; return true; } };
  D.boyut.getEntities = () => [kurban];
  const bas = yardim.basKonumu(o);
  const yd = Math.floor(bas.y), zd = Math.floor(bas.z);
  for (let x = 2; x <= 12; x++) D.boyut.getBlock({ x, y: yd, z: zd }).setType("minecraft:stone");
  const is = bul("getsuga").olustur(o);
  let adim = 0;
  while (adim < 200 && !is.calis()) adim++;
  kontrol("mermi duvarda DURDU", adim <= 2, adim + " tick sonra bitti");
  kontrol("duvarin ardindaki hedef VURULMADI", kurban._hasar === 0,
          "hasar " + kurban._hasar);
  kontrol("duvar kirilmadi (BLOK_KIR kapali)",
          D.boyut.getBlock({ x: 2, y: yd, z: zd }).typeId === "minecraft:stone");
}

console.log("=== 3. BANKAI HALKASI YALNIZ KADEME 2'DE ===");
{
  const { o } = kur("getsuga", 1);
  kontrol("kademe 1'de acilmiyor", bul("bankai_halka").olustur(o) === undefined);
  const { o: o2 } = kur("getsuga", 2);
  const is = bul("bankai_halka").olustur(o2);
  kontrol("kademe 2'de aciliyor", !!is);
  kontrol("healTimer karsiligi: regeneration verildi",
          o2._efekt.some((e) => e.ad === "regeneration"));
}
{
  /* HALKA BUYUMEYI BIRAKIYOR MU. HALKA_MAKS yalniz gorunumu
     degil, isin OMRUNU belirliyor: durmayan bir halka her
     adimda maxDistance'i buyuten bir tarama demek. Mutasyon
     tavani 99 katina cikardiginda hicbir test kirilmamisti. */
  const { D, o } = kur("getsuga", 2);
  D.boyut.getEntities = () => [];
  const is = bul("bankai_halka").olustur(o);
  let tick = 0, bitti = false;
  const tavan = ayar.HALKA_MAKS * ayar.RUH_KADEMELER[2].carpan;
  const sinir = Math.ceil((tavan + 2) * ayar.HALKA_ADIM) + 10;
  while (tick < 4000) { if (is.calis()) { bitti = true; break; } tickIlerlet(1); tick++; }
  kontrol("halka kendi kendine kapandi", bitti, tick + " tick");
  kontrol("tavana gore kapandi (sinir " + sinir + ")", bitti && tick <= sinir,
          tick + " tick · tavan yaricap " + tavan.toFixed(1));
}

console.log("=== 4. CERO: IKI ASAMA ===");
{
  /* Kaynakta CHARGE -> fireCero. Bizde tek is, iki asama:
     once sarj, sonra mermi. Sarj bitmeden ates olmamali.   */
  const { D, o } = kur("cero", 0);
  const kurban = { id: "k3", typeId: "minecraft:zombie", isValid: true,
                   location: { x: 10, y: 89, z: 0.5 }, _hasar: 0,
                   applyDamage(n) { this._hasar += n; return true; } };
  D.boyut.getEntities = () => [kurban];
  const is = bul("cero").olustur(o);
  kontrol("is acildi", !!is);
  for (let i = 0; i < ayar.CERO_SARJ - 2; i++) is.calis();
  kontrol("sarj bitmeden hasar YOK", kurban._hasar === 0,
          "hasar " + kurban._hasar);
  yurut(is, 300);
  kontrol("sarj bitince ateslendi ve vurdu", kurban._hasar > 0,
          "hasar " + kurban._hasar.toFixed(1));
}

console.log("=== 5. QUINCY: UC KIP ve RUH BEDELI ===");
{
  kontrol("uc kip tanimli", ayar.QUINCY_KIPLER.length === 3,
          ayar.QUINCY_KIPLER.map((k) => k.ad).join(" · "));
  kontrol("adlar kaynaktaki gibi",
          ayar.QUINCY_KIPLER.map((k) => k.ad).join(",") ===
          "RapidFire,WideShot,Charged");
  const { o } = kur("letzt", 0);
  const once = ruh.ruhOku(o);
  yurut(bul("quincy_ok").olustur(o), 60);
  kontrol("ruh bedeli alindi", ruh.ruhOku(o) === once - ayar.QUINCY_BEDEL,
          once + " -> " + ruh.ruhOku(o));
  /* Egilirken KIP DEGISTIRIYOR, atmiyor. */
  o.isSneaking = true;
  const r = ruh.ruhOku(o);
  kontrol("egilince atis YOK", bul("quincy_ok").olustur(o) === undefined);
  kontrol("egilince ruh harcanmadi", ruh.ruhOku(o) === r);
  o.isSneaking = false;
  /* Ruh yetmezse atmiyor. */
  ruh.ruhYaz(o, 1);
  kontrol("ruh yetmezse atmiyor", bul("quincy_ok").olustur(o) === undefined);
}

console.log("=== 6. REISHI ZEMINI: YALNIZ HAVAYA, GERI ALINIYOR ===");
{
  const { D, o } = kur("letzt", 0);
  D.boyut.getBlock({ x: 5, y: 88, z: 0 }).setType("minecraft:stone");
  const is = bul("reishi").olustur(o);
  kontrol("is acildi", !!is);
  for (const x of [0, 1, 2, 3]) {
    o.location = { x: x + 0.5, y: 90, z: 0.5 };
    butce.butceSifirla(); is.calis();
  }
  const kondu = D.sayac.yazilan.filter((b) => b.tip === ayar.REISHI_BLOK);
  kontrol("havaya blok kondu", kondu.length > 0, kondu.length + " blok");
  /* Tas uzerine KONMAMALI: bu bir kopru, kazma degil. */
  o.location = { x: 5.5, y: 89, z: 0.5 };
  butce.butceSifirla(); is.calis();
  kontrol("dolu blogun uzerine yazilmadi",
          D.boyut.getBlock({ x: 5, y: 88, z: 0 }).typeId === "minecraft:stone",
          D.boyut.getBlock({ x: 5, y: 88, z: 0 }).typeId);
  is.bitir();
  const kalan = kondu.filter((b) =>
    D.boyut.getBlock({ x: b.x, y: b.y, z: b.z }).typeId === ayar.REISHI_BLOK);
  kontrol("kapaninca HEPSI geri alindi", kalan.length === 0,
          kalan.length + " blok kaldi");
}

console.log("=== 7. YOL SECIMI SIRAYLA DEGISIYOR ===");
{
  const { o } = kur("getsuga", 0);
  const gorulen = [];
  for (let i = 0; i < 4; i++) {
    bul("ruh_yol").olustur(o);
    gorulen.push(ruh.yolOku(o));
  }
  kontrol("uc yolu da dolasti", new Set(gorulen).size === 3, gorulen.join(" -> "));
  kontrol("basa donuyor", gorulen[3] === gorulen[0], gorulen.join(" -> "));
}

console.log("=== 8. OYUNCU CIKINCA DEFTERLER TEMIZ ===");
{
  const fs = await import("node:fs");
  const m = fs.readFileSync("./pack/main.js", "utf8");
  for (const f of ["quincyUnut", "reishiUnut"]) {
    kontrol("main.js " + f + " cagiriyor",
            new RegExp(f + "\\(olay\\.playerId\\)").test(m));
  }
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
