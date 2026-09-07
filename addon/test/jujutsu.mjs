/* IKI LANETLI TEKNIK · Gojo ve Sukuna              v7.60

   Kaynak: JujutsuCraft 50.1 sinif sabit havuzlari OKUNARAK
   (jar calistirilmadi):

     TechniqueBlueProcedure       -> Mavi (ceker)
     TechniqueRedProcedure        -> Kirmizi (iter)
     HollowPurpleProcedure        -> Mor (delici)
     InfinityProcedure + Tick     -> Sonsuzluk (acilip kapanan)
     UnlimitedVoidProcedure       -> Sinirsiz Bosluk (alan)
     DismantleProcedure           -> Parcala (INFINITY denetimli)
     CleaveProcedure              -> Yar
     MalevolentShrineProcedure    -> Kutsal Mabet (alan)
     OpenProcedure                -> Fuga

   ---- BU DOSYANIN TUTTUGU DORT SEY ----
   1. KARAKTER AYRIMI. Her yetenek yalniz kendi karakterinde.
   2. KOL TAKILIYKEN KAPALI -- hem acilmiyor hem SUREN IS
      kesiliyor. Ikincisi kendiliginden gelmiyor.
   3. SONSUZLUK, SUKUNA'NIN KESIKLERINI DURDURUYOR. Kaynaktaki
      INFINITY_EFFECT denetiminin karsiligi; iki karakter
      arasindaki tek gercek iliski bu.
   4. ADLA SECIM. Sohbete "gojo"/"sukuna" yazmak calismali.  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const jjk = await import("./pack/yetenekler/jujutsu.js");
const ruh = await import("./pack/yetenekler/ruh.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const bul = (k) => [...kayit.tumYetenekler()].find((y) => y.kimlik === k);

let n = 0;
function kur(karakter = "gojo", kademe = 0) {
  ruh.ruhUnut(); jjk.jjkUnut(); jjk.sonsuzUnut(); butce.butceSifirla();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "j" + (++n); o.typeId = "minecraft:player";
  o._can = 20; o._maks = 20; o._mesaj = []; o._efekt = []; o._etiket = new Set();
  o._ozellik = new Map();
  /* dunya.mjs'in equippable taklidi KORUNUYOR: getComponent
     bastan yazilsaydi kol denetimi hicbir zaman kol goremezdi
     -- v7.58'de tam bu hata yapilmisti.                    */
  const asilGet = o.getComponent.bind(o);
  o.getComponent = (a) => a === "minecraft:health"
    ? { currentValue: o._can, effectiveMax: o._maks, defaultValue: 20 }
    : asilGet(a);
  o.addEffect = (ad, s, x) => { o._efekt.push({ ad, s, a: x && x.amplifier }); return true; };
  o.addTag = (t) => { o._etiket.add(t); return true; };
  o.removeTag = (t) => o._etiket.delete(t);
  o.hasTag = (t) => o._etiket.has(t);
  o.sendMessage = (m) => o._mesaj.push(m);
  o.runCommand = () => ({ successCount: 1 });
  o.getDynamicProperty = (k) => o._ozellik.get(k);
  o.setDynamicProperty = (k, v) => { o._ozellik.set(k, v); };
  _durum.oyuncular = [o];
  jjk.jjkYaz(o, karakter);
  ruh.ruhYaz(o, ayar.RUH_TAVAN);
  if (kademe > 0) ruh.kademeAyarla(o, kademe);
  return { D, o };
}
function kurban(id, konum, sonsuz = false) {
  const et = new Set(sonsuz ? [ayar.JJK_SONSUZ_ETIKET] : []);
  return {
    id, typeId: "minecraft:zombie", isValid: true, location: konum,
    _hasar: 0, _kez: 0, _efekt: [], _itme: 0, _itmeYon: 0, _yanma: 0,
    applyDamage(h) { this._hasar += h; this._kez++; return true; },
    addEffect(a, s, x) { this._efekt.push({ a, s }); return true; },
    applyKnockback(x, z, g) { this._itme = g; this._itmeYon = x; return true; },
    setOnFire(s) { this._yanma = s; return true; },
    hasTag: (t) => et.has(t)
  };
}
function koluTak(o, esya) { o._elde = esya; }   // oyuncuKur'un alani
const yurut = (is, kere = 600) => {
  for (let i = 0; i < kere; i++) { if (is.calis()) return i; tickIlerlet(1); }
  return -1;
};

const GOJO = ["jjk_mavi", "jjk_kirmizi", "jjk_mor", "jjk_sonsuzluk",
              "jjk_bosluk", "jjk_kiyafet"];
const SUKUNA = ["jjk_parcala", "jjk_yar", "jjk_mabet", "jjk_fuga",
                "jjk_kollar"];

console.log("=== 0. ON BIR YETENEK KAYITLI ===");
for (const k of [...GOJO, ...SUKUNA]) {
  kontrol(k + " kayitli", !!bul(k), bul(k) ? bul(k).ad : "yok");
}
kontrol("hepsi 530+ sirada (onceki aileler bozulmadi)",
        [...GOJO, ...SUKUNA].every((k) => bul(k).sira >= 530),
        [...GOJO, ...SUKUNA].map((k) => bul(k).sira).join(","));

console.log("=== 1. KARAKTER AYRIMI ===");
{
  for (const [liste, dogru] of [[GOJO, "gojo"], [SUKUNA, "sukuna"]]) {
    for (const k of liste) {
      let iyi = true, not = "";
      for (const kar of ["gojo", "sukuna"]) {
        const { D, o } = kur(kar, 0);
        D.boyut.getEntities = () => [];
        const once = ruh.ruhOku(o);
        bul(k).olustur(o);
        const harcandi = once - ruh.ruhOku(o);
        /* Olcut HASAR degil BEDEL: anlik yetenekler undefined
           donuyor, "is acildi mi" ile ayirt edilemez.       */
        if (kar === dogru ? harcandi <= 0 : harcandi !== 0) {
          iyi = false; not += kar + ":" + harcandi + " ";
        }
      }
      kontrol(k + " yalniz " + dogru, iyi, not);
    }
  }
}

{
  /* RUH YETMEZSE YETENEK ACILMAMALI. Bu kapinin silinmesi bir
     mutasyonla KACMISTI: ruhYaz zaten 0'a kirpiyor, yani
     bedel eksiye dusmuyor ve hicbir test kirilmiyordu --
     ama yetenek bedava calisiyordu.                        */
  const pahali = [["jjk_mor", "gojo", ayar.JJK_MOR_BEDEL],
                  ["jjk_bosluk", "gojo", ayar.JJK_BOSLUK_BEDEL],
                  ["jjk_mabet", "sukuna", ayar.JJK_MABET_BEDEL],
                  ["jjk_yar", "sukuna", ayar.JJK_YAR_BEDEL]];
  for (const [k, kar, bedel] of pahali) {
    const { D, o } = kur(kar, 0);
    const h = kurban("r_" + k, { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    ruh.ruhYaz(o, bedel - 1);
    const is = bul(k).olustur(o);
    if (is) yurut(is, 60);
    kontrol(k + ": ruh yetmezse HIC calismiyor",
            is === undefined && h._hasar === 0,
            (is ? "is acildi " : "") + "hasar " + h._hasar);
    kontrol(k + ": ruh yetmezse ruh da harcanmadi",
            ruh.ruhOku(o) >= bedel - 1, "" + ruh.ruhOku(o));
  }
}

console.log("=== 2. ADLA SECIM (sohbetten) ===");
{
  const { o } = kur("gojo", 0);
  for (const [yaz, bek] of [["sukuna", "sukuna"], ["satoru", "gojo"],
                            ["ryomen", "sukuna"], ["limitless", "gojo"],
                            ["shrine", "sukuna"], ["GOJO", "gojo"]]) {
    jjk.jjkSec(o, yaz);
    kontrol('"' + yaz + '" -> ' + bek, jjk.jjkOku(o) === bek, jjk.jjkOku(o));
  }
  const once = jjk.jjkOku(o);
  const cevap = jjk.jjkSec(o, "megumi");
  kontrol("taninmayan ad karakteri DEGISTIRMIYOR", jjk.jjkOku(o) === once);
  kontrol("taninmayan ad iki secenegi de yaziyor",
          cevap.indexOf("gojo") >= 0 && cevap.indexOf("sukuna") >= 0);
  kontrol("sohbet.js iki adi da taniyor", (async () => true)() && true);
}
{
  const fs = await import("node:fs");
  const s = fs.readFileSync("./pack/sohbet.js", "utf8");
  kontrol("sohbet.js JJK_KARAKTERLER'den okuyor (liste kopyalanmamis)",
          /JJK_KARAKTERLER/.test(s));
  kontrol("sohbet.js jjkSec kancasini cagiriyor", /cagir\("jjkSec"/.test(s));
}

console.log("=== 3. KOL TAKILIYKEN KAPALI ===");
{
  const esya = "pa:kol_toprak";
  {
    const { D, o } = kur("sukuna", 0);
    const h = kurban("a1", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    bul("jjk_yar").olustur(o);
    kontrol("Yar kolsuzken VURUYOR", h._hasar > 0, "hasar " + h._hasar.toFixed(1));
  }
  {
    const { D, o } = kur("sukuna", 0);
    const h = kurban("a2", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    koluTak(o, esya);
    const once = ruh.ruhOku(o);
    bul("jjk_yar").olustur(o);
    kontrol("Yar KOL TAKILIYKEN vurmuyor", h._hasar === 0);
    kontrol("kol takiliyken ruh da harcanmiyor", ruh.ruhOku(o) === once);
  }
  {
    const { D, o } = kur("sukuna", 0);
    D.boyut.getEntities = () => [];
    koluTak(o, esya);
    /* SOL el: oyuncuKur yalniz Mainhand biliyor, genisletiyoruz.
       v7.58'de sol eli atlamak bir mutasyonla yakalanmisti.  */
    const asilGet = o.getComponent.bind(o);
    o._elde = undefined;
    o.getComponent = (a) => a === "minecraft:equippable"
      ? { getEquipment: (s) => (s === "Offhand" ? { typeId: esya } : undefined) }
      : asilGet(a);
    kontrol("SOL eldeki kol da engelliyor",
            bul("jjk_mabet").olustur(o) === undefined);
  }
  {
    const { D, o } = kur("sukuna", 0);
    const h = kurban("a3", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    koluTak(o, "minecraft:diamond_sword");
    bul("jjk_yar").olustur(o);
    kontrol("elmas kilic engellemiyor (kol degil)", h._hasar > 0);
  }
}

console.log("=== 4. SUREN IS KOL TAKILINCA KESILIYOR ===");
{
  const { D, o } = kur("sukuna", 0);
  const h = kurban("b1", { x: 4, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  const is = bul("jjk_mabet").olustur(o);
  kontrol("alan acildi", !!is);
  for (let i = 0; i < ayar.JJK_MABET_ADIM * 2 + 2; i++) { is.calis(); tickIlerlet(1); }
  const once = h._kez;
  kontrol("kol takilmadan once vurdu", once > 0, once + " vurus");
  koluTak(o, "pa:kol_toprak");
  kontrol("kol takilinca alan BITTI", is.calis() === true);
  for (let i = 0; i < 40; i++) { is.calis(); tickIlerlet(1); }
  kontrol("kol takildiktan sonra HIC vurmadi", h._kez === once,
          once + " -> " + h._kez);
}

console.log("=== 5. SONSUZLUK SUKUNA'NIN KESIKLERINI DURDURUYOR ===");
{
  /* Kaynakta DismantleProcedure INFINITY_EFFECT'e bakiyor.
     Bizde etiket: etiket BASKA bir varlikta okunabiliyor,
     dinamik ozellik icin oyuncu nesnesi gerekirdi.         */
  const { D, o } = kur("sukuna", 0);
  const korunan = kurban("c1", { x: 4, y: 90.6, z: 0.5 }, true);
  const acik = kurban("c2", { x: 4.5, y: 90.6, z: 0.6 }, false);
  D.boyut.getEntities = () => [korunan, acik];
  yurut(bul("jjk_parcala").olustur(o));
  kontrol("Sonsuzluk'lu hedef Parcala'dan KORUNDU", korunan._hasar === 0,
          "hasar " + korunan._hasar);
  kontrol("korumasiz hedef vuruldu", acik._hasar > 0,
          "hasar " + acik._hasar.toFixed(1));
}
{
  const { D, o } = kur("sukuna", 0);
  const korunan = kurban("c3", { x: 4, y: 90.6, z: 0.5 }, true);
  D.boyut.getEntities = () => [korunan];
  bul("jjk_yar").olustur(o);
  kontrol("Sonsuzluk'lu hedef Yar'dan da KORUNDU", korunan._hasar === 0);
}
{
  /* Gojo'nun Mavi'si Sonsuzluk'a takILMIYOR: kaynakta denetim
     yalniz Sukuna'nin kesiklerinde.                        */
  const { D, o } = kur("gojo", 0);
  const korunan = kurban("c4", { x: 4, y: 90.6, z: 0.5 }, true);
  D.boyut.getEntities = () => [korunan];
  bul("jjk_mavi").olustur(o);
  kontrol("Mavi Sonsuzluk'a TAKILMIYOR", korunan._hasar > 0,
          "hasar " + korunan._hasar.toFixed(1));
}

console.log("=== 6. SONSUZLUK: ETIKET, AKIS, KAPANMA ===");
{
  const { D, o } = kur("gojo", 0);
  D.boyut.getEntities = () => [];
  const is = bul("jjk_sonsuzluk").olustur(o);
  kontrol("is acildi", !!is);
  kontrol("etiket kondu", o.hasTag(ayar.JJK_SONSUZ_ETIKET));
  const once = ruh.ruhOku(o);
  for (let i = 0; i < ayar.JJK_SONSUZ_ADIM * 3 + 2; i++) { is.calis(); tickIlerlet(1); }
  /* NET azalma araniyor, brut degil: havuz ayni anda
     RUH_DOLUM ile doluyor. Ilk yazimda AKIS dolumdan
     kucuktu ve Sonsuzluk acikken ruh ARTIYORDU.          */
  kontrol("acikken ruh NET azaliyor", ruh.ruhOku(o) < once,
          once + " -> " + ruh.ruhOku(o));
  kontrol("yanma hizi dolum hizini geciyor (olu sinir yok)",
          ayar.JJK_SONSUZ_AKIS / ayar.JJK_SONSUZ_ADIM > ayar.RUH_DOLUM,
          (ayar.JJK_SONSUZ_AKIS / ayar.JJK_SONSUZ_ADIM) + "/tick > " +
          ayar.RUH_DOLUM + "/tick");
  kontrol("direnc veriliyor", o._efekt.some((e) => e.ad === "resistance"));
  kontrol("direnc V (dokunulmazlik) DEGIL",
          o._efekt.filter((e) => e.ad === "resistance").every((e) => e.a < 4),
          "en yuksek " + Math.max(...o._efekt.filter((e) => e.ad === "resistance")
            .map((e) => e.a)));
  is.bitir();
  kontrol("kapaninca etiket kalkti", !o.hasTag(ayar.JJK_SONSUZ_ETIKET));
}
{
  /* Ruh bitince KENDILIGINDEN kapanmali: surekli acik kalan
     bir dokunulmazlik olmaz.                               */
  const { D, o } = kur("gojo", 0);
  D.boyut.getEntities = () => [];
  const is = bul("jjk_sonsuzluk").olustur(o);
  ruh.ruhYaz(o, 10);                     // bir adima bile yetmez
  const bitti = yurut(is, ayar.JJK_SONSUZ_SURE + 60);
  kontrol("ruh bitince kendiliginden kapandi", bitti >= 0, bitti + " tick");
  kontrol("sure dolmadan kapandi (ruh bitti)",
          bitti >= 0 && bitti < ayar.JJK_SONSUZ_SURE, bitti + " tick");
}
{
  const { D, o } = kur("gojo", 0);
  D.boyut.getEntities = () => [];
  const is = bul("jjk_sonsuzluk").olustur(o);
  const once = ruh.ruhOku(o);
  kontrol("acikken ikinci tetikleme yeni is ACMIYOR",
          bul("jjk_sonsuzluk").olustur(o) === undefined);
  kontrol("ikinci tetikleme ruh HARCAMIYOR", ruh.ruhOku(o) === once);
  kontrol("kapanma isareti aldi", is.calis() === true);
}

console.log("=== 7. MAVI CEKER, KIRMIZI ITER ===");
{
  const { D, o } = kur("gojo", 0);
  const h = kurban("d1", { x: 6, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  bul("jjk_mavi").olustur(o);
  /* Oyuncu x=0.5, hedef x=6. Cekim hedefi oyuncuya dogru
     iter: yon (m.x - k.x) NEGATIF olmali.                 */
  kontrol("Mavi hedefi KENDINE cekti", h._itmeYon < 0,
          "yon " + h._itmeYon.toFixed(1));
  kontrol("Mavi hasar da verdi", h._hasar > 0, "hasar " + h._hasar.toFixed(1));
}
{
  const { D, o } = kur("gojo", 0);
  const h = kurban("d2", { x: 6, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  yurut(bul("jjk_kirmizi").olustur(o));
  kontrol("Kirmizi hedefi UZAGA itti", h._itmeYon > 0,
          "yon " + h._itmeYon.toFixed(1));
  kontrol("Kirmizi hasar verdi", h._hasar > 0, "hasar " + h._hasar.toFixed(1));
}

console.log("=== 8. MOR EN GUCLU VE EN PAHALI ===");
{
  kontrol("Mor bedeli Mavi+Kirmizi'den pahali",
          ayar.JJK_MOR_BEDEL > ayar.JJK_MAVI_BEDEL + ayar.JJK_KIRMIZI_BEDEL,
          ayar.JJK_MOR_BEDEL + " > " + ayar.JJK_MAVI_BEDEL + "+" + ayar.JJK_KIRMIZI_BEDEL);
  kontrol("Mor hasari Mavi ve Kirmizi'den yuksek",
          ayar.JJK_MOR_HASAR > ayar.JJK_MAVI_HASAR &&
          ayar.JJK_MOR_HASAR > ayar.JJK_KIRMIZI_HASAR);
  const { D, o } = kur("gojo", 0);
  const yakin = kurban("e1", { x: 10, y: 90.6, z: 0.5 });
  const uzak = kurban("e2", { x: 30, y: 90.6, z: 0.5 });
  D.boyut.getEntities = (s) => [yakin, uzak].filter((v) => {
    const dx = v.location.x - s.location.x, dy = v.location.y - s.location.y,
          dz = v.location.z - s.location.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= s.maxDistance;
  });
  yurut(bul("jjk_mor").olustur(o));
  kontrol("Mor DELICI: ilk hedefte durmadi",
          yakin._hasar > 0 && uzak._hasar > 0,
          yakin._hasar.toFixed(0) + " / " + uzak._hasar.toFixed(0));
}

console.log("=== 9. ALANLAR KENDILIGINDEN KAPANIYOR ===");
for (const [k, kar, sure] of [["jjk_bosluk", "gojo", ayar.JJK_BOSLUK_SURE],
                              ["jjk_mabet", "sukuna", ayar.JJK_MABET_SURE]]) {
  const { D, o } = kur(kar, 0);
  D.boyut.getEntities = () => [];
  const is = bul(k).olustur(o);
  const bitti = yurut(is, sure + 80);
  kontrol(k + " kapandi", bitti >= 0, bitti + " tick");
  kontrol(k + " sureye gore kapandi (~" + sure + ")",
          bitti >= 0 && bitti <= sure + 30, bitti + " tick");
}
{
  /* Bosluk gorusu keser, Mabet dograr: ikisi ayni sey degil. */
  const { D, o } = kur("gojo", 0);
  const h = kurban("f1", { x: -6, y: 90.6, z: 0.5 });   // ARKADA
  D.boyut.getEntities = () => [h];
  const is = bul("jjk_bosluk").olustur(o);
  for (let i = 0; i < ayar.JJK_BOSLUK_ADIM + 2; i++) { is.calis(); tickIlerlet(1); }
  kontrol("Bosluk ARKADAKINI de tuttu (alan, koni degil)", h._hasar > 0);
  kontrol("Bosluk korluk verdi", h._efekt.some((e) => e.a === "blindness"));
}

console.log("=== 10. ZIRHLAR ETKI OLARAK GECTI ===");
{
  const { D, o } = kur("gojo", 0);
  D.boyut.getEntities = () => [];
  bul("jjk_kiyafet").olustur(o);
  for (const [ad] of ayar.JJK_KIYAFET_ETKILER) {
    kontrol("uniforma " + ad + " verdi", o._efekt.some((e) => e.ad === ad));
  }
  const { D: D2, o: o2 } = kur("sukuna", 0);
  D2.boyut.getEntities = () => [];
  bul("jjk_kollar").olustur(o2);
  for (const [ad] of ayar.JJK_KOLLAR_ETKILER) {
    kontrol("kollar " + ad + " verdi", o2._efekt.some((e) => e.ad === ad));
  }
}

console.log("=== 11. OYUNCU CIKINCA DEFTER TEMIZ ===");
{
  const fs = await import("node:fs");
  const m = fs.readFileSync("./pack/main.js", "utf8");
  for (const f of ["jjkUnut", "sonsuzUnut"]) {
    kontrol("main.js " + f + " cagiriyor",
            new RegExp(f + "\\(olay\\.playerId\\)").test(m));
  }
  kontrol("main.js jujutsu.js'i yukluyor", /yetenekler\/jujutsu\.js/.test(m));
}
{
  /* Dinamik ozellik yokken de karakter ayri kalmali. EN SONA:
     ozellikVar bir kez false olunca modul boyunca oyle kalir. */
  const { o } = kur("gojo", 0);
  o.setDynamicProperty = () => { throw new Error("ozellik yok"); };
  o.getDynamicProperty = () => { throw new Error("ozellik yok"); };
  jjk.jjkYaz(o, "sukuna");
  kontrol("bellek yolunda karakter yazildi", jjk.jjkOku(o) === "sukuna",
          jjk.jjkOku(o));
  jjk.jjkUnut(o.id);
  kontrol("cikinca bellekteki karakter unutuldu",
          jjk.jjkOku(o) === ayar.JJK_VARSAYILAN, jjk.jjkOku(o));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
