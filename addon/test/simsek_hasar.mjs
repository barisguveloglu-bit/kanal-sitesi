/* SIMSEK EK HASARI                                        v7.94.4

   Kullanici: "simsekle alakali olan seylerin hasarini birazcik
   daha arttirabilir misin".

   ---- ONCE OLCULDU ----
   Dort simsek yeteneginin de (yon_simsegi, yildirim_halkasi,
   coklu_simsek, tek_simsek) hasari vanilla `lightning_bolt`
   varligindan geliyordu. Yani ORTADA ARTIRILACAK BIR SAYI
   YOKTU. SIMSEK_EK_HASAR o sayiyi ekliyor.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI IKI SEY ----
   1. EK HASAR YALNIZ YILDIRIMDA. `_yagmur.js` genel bir
      yagdirici: TNT ve meteor da ayni koddan geciyor. Guard
      kalkarsa TNT yagmuru da sessizce guclenir ve kimse fark
      etmez. 5. bolum tam bunu sinliyor.
   2. KENDINI VURMAMA. ayarlar.js'te yazili: "yoksa yetenek
      intihar tusuna donerdi". 2. bolum bunu tutuyor.         */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const eh   = await import("./pack/yetenekler/_simsek_hasar.js");
const yag  = await import("./pack/yetenekler/_yagmur.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Hasari KAYDEDEN kurban. dunya.mjs'in kendi varligi
   `applyDamage: () => true` -- yani hicbir sey tutmuyor ve
   onunla "hasar verildi mi" sorusu sinanamaz.              */
function kurban(tip, x, y, z, id) {
  return {
    id: id || (tip + "-" + x), typeId: tip, isValid: true,
    location: { x, y, z },
    _yenen: [],
    applyDamage(n) { this._yenen.push(n); return true; }
  };
}

function kurulum() {
  butce.butceSifirla();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0, y: 4, z: 0 });
  o.id = "vuran"; o.typeId = "minecraft:player";
  o._yenen = [];
  o.applyDamage = function (n) { this._yenen.push(n); return true; };
  D.boyut._varliklar = [];
  _durum.oyuncular = [o];
  return { D, o };
}

console.log("=== 0. AYAR VAR VE MAKUL ===");
kontrol("SIMSEK_EK_HASAR tanimli ve pozitif",
        typeof ayar.SIMSEK_EK_HASAR === "number" && ayar.SIMSEK_EK_HASAR > 0,
        String(ayar.SIMSEK_EK_HASAR));
kontrol("SIMSEK_EK_YARICAP pozitif",
        typeof ayar.SIMSEK_EK_YARICAP === "number" && ayar.SIMSEK_EK_YARICAP > 0,
        String(ayar.SIMSEK_EK_YARICAP));
/* Yaricap vanilla yildirimin kendi etki alanindan genis olmamali:
   genis olursa bu "daha guclu simsek" degil "daha buyuk simsek"
   olur -- istenen o degildi.                                   */
kontrol("yaricap dar tutulmus (<= 4 blok)", ayar.SIMSEK_EK_YARICAP <= 4,
        ayar.SIMSEK_EK_YARICAP + " blok");
kontrol("muaf listesi esya/xp/yildirim iceriyor",
        ["minecraft:item", "minecraft:xp_orb", "minecraft:lightning_bolt"]
          .every((t) => ayar.SIMSEK_EK_MUAF.includes(t)));

console.log("");
console.log("=== 1. YARICAP ICINDEKI VURULUYOR, DISINDAKI VURULMUYOR ===");
{
  const { D, o } = kurulum();
  const yakin = kurban("minecraft:zombie", 0, 4, 1);
  const uzak  = kurban("minecraft:zombie", 0, 4, ayar.SIMSEK_EK_YARICAP + 5);
  D.boyut._varliklar = [yakin, uzak];

  const n = eh.simsekEkHasar(D.boyut, { x: 0, y: 4, z: 0 }, o);

  kontrol("yakindaki vuruldu", yakin._yenen.length === 1,
          JSON.stringify(yakin._yenen));
  kontrol("uzaktaki VURULMADI", uzak._yenen.length === 0,
          JSON.stringify(uzak._yenen));
  kontrol("hasar ayardan geliyor", yakin._yenen[0] === ayar.SIMSEK_EK_HASAR,
          yakin._yenen[0] + " / " + ayar.SIMSEK_EK_HASAR);
  kontrol("donen sayi vurulan kadar", n === 1, String(n));
}

console.log("");
console.log("=== 2. VURAN KENDINI VURMUYOR ===");
{
  const { D, o } = kurulum();
  o.location = { x: 0, y: 4, z: 0 };          // tam simsegin dibinde
  const baska = kurban("minecraft:zombie", 0, 4, 1);
  D.boyut._varliklar = [o, baska];

  eh.simsekEkHasar(D.boyut, { x: 0, y: 4, z: 0 }, o);

  kontrol("vuran hasar YEMEDI", o._yenen.length === 0,
          JSON.stringify(o._yenen));
  kontrol("yanindaki yine de vuruldu", baska._yenen.length === 1);
}

console.log("");
console.log("=== 3. MUAF TIPLER ATLANIYOR ===");
{
  const { D, o } = kurulum();
  const esya = kurban("minecraft:item", 0, 4, 0.5);
  const xp   = kurban("minecraft:xp_orb", 0, 4, 0.5);
  const bolt = kurban("minecraft:lightning_bolt", 0, 4, 0.5);
  const mob  = kurban("minecraft:zombie", 0, 4, 0.5);
  D.boyut._varliklar = [esya, xp, bolt, mob];

  eh.simsekEkHasar(D.boyut, { x: 0, y: 4, z: 0 }, o);

  kontrol("dusen esya vurulmadi", esya._yenen.length === 0);
  kontrol("tecrube kuresi vurulmadi", xp._yenen.length === 0);
  kontrol("yildirimin kendisi vurulmadi", bolt._yenen.length === 0);
  kontrol("mob vuruldu", mob._yenen.length === 1);
}

console.log("");
console.log("=== 4. DORT YETENEK DE BAGLI ===");
{
  const KOK = "../Simsek_TNT_ToprakTopu/scripts/yetenekler/";
  /* yon_simsegi ve yildirim_halkasi _yagmur uzerinden geciyor,
     diger ikisi kendi spawnEntity'sini cagiriyor.            */
  for (const [dosya, aciklama] of [
    ["_yagmur.js", "yon_simsegi + yildirim_halkasi"],
    ["coklu_simsek.js", "coklu_simsek"],
    ["tek_simsek.js", "tek_simsek"]
  ]) {
    let src = "";
    try { src = readFileSync(new URL(KOK + dosya, import.meta.url), "utf8"); }
    catch (e) { /* asagida kirmizi yanar */ }
    kontrol(aciklama + ": ek hasar cagriliyor",
            src.includes("simsekEkHasar(") &&
            src.includes('from "./_simsek_hasar.js"'),
            dosya);
  }
}

console.log("");
console.log("=== 5. EK HASAR YALNIZ YILDIRIMDA (TNT GUCLENMIYOR) ===");
{
  /* _yagmur.js TNT ve meteor icin de kullaniliyor. Guard
     kalkarsa onlar da sessizce guclenir. Ayni kurulumla iki
     kez kosuluyor, tek fark dogan varlik tipi.              */
  /* KILITLI yol kullaniliyor, sebebi olculdu: kilitsiz yagmurda
     sacilma YAYILMA = 7 blok, yani yildirim hedefin 7 blok
     otesine dusebiliyor ve 2,5 bloklik ek hasar yaricapini
     issizlar. Ilk yazilista bu yuzden 0 vurus cikti ve sanki
     guard bozukmus gibi gorundu -- bozuk degildi, sinama
     yanlis suruyordu. Kilitliyken sacilma KILIT_YAYILMA = 1,
     yani vurus kesin. Kilit zaten gercek bir kullanim yolu:
     yon_simsegi hedefe kilitlenince tam boyle yagiyor.       */
  function yagdir(tip) {
    const { D, o } = kurulum();
    const hedef = kurban("minecraft:zombie", 0, 4, 0);
    D.boyut._varliklar = [hedef];
    const is = yag.yagmurIsi({
      ad: "sinama", oyuncu: o, hedef: { x: 0, y: 4, z: 0 },
      kilit: hedef,
      varlik: tip, toplam: 3, yukseklik: 0,
      aralik: 0, grup: 3, halka: null
    });
    for (let i = 0; i < 40 && is && !is.calis(); i++) { /* is bitene kadar */ }
    return hedef._yenen.length;
  }

  const simsekli = yagdir("minecraft:lightning_bolt");
  const tntli    = yagdir("minecraft:tnt");

  kontrol("yildirim ek hasar veriyor", simsekli > 0, simsekli + " vurus");
  kontrol("TNT ek hasar VERMIYOR", tntli === 0, tntli + " vurus");
}

console.log("");
console.log(hata ? "SORUN VAR" : "temiz");
process.exit(hata ? 1 : 0);
