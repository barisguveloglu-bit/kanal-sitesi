/* NEFES -- Kimetsu no Yaiba'dan Gunes ve Ay          v7.87

   Kullanici: "en guclusunu sec yani aralarindan iki tanesini
   secebilirsin, sectigin o iki tane sey ile alakali tum
   seyleri alacaksin."

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. SECIM OLCULEBILIR: iki uslup da kayitli, 23 formun
      hepsi kayitli, form adlari moddan geldigi gibi.
   2. USLUP KAPISI: baska uslubun formu HICBIR SEY yapmiyor.
      Sessizce o uslubu acmak, oyuncunun istemedigi bir sey
      yapmak olurdu.
   3. USLUP CIKISTA SILINMIYOR. Kalicilik kodunu yazip sonra
      onu playerLeave'de silmek, bu depoda gorulen bir hata
      sinifi.
   4. Alti mekanigin hepsi gercekten calisiyor -- metin
      eslesmesi degil, DAVRANIS.
   5. Kendimizi vurmuyoruz, botlarimizi vurmuyoruz.
   6. Bekleme suresi var ve gercekten tutuyor.               */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const nefes = await import("./pack/yetenekler/nefes.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o._hasar = []; o._etki = []; o._itme = 0;
  o.applyDamage = (m) => { o._hasar.push(m); return true; };
  o.addEffect = (a, s, sec) => { o._etki.push({ a, s, sec }); };
  o.applyKnockback = () => { o._itme++; return true; };
  o._yazilar = [];
  o.onScreenDisplay = {
    _son: null,
    setActionBar(t) { this._son = t; o._yazilar.push(String(t)); },
    setTitle() {}
  };
  _durum.oyuncular = [o];
  return { D, o };
}

function hedef(id, tip, x, y, z) {
  return {
    id, typeId: tip, isValid: true, name: id, location: { x, y, z },
    _hasar: [], _etki: [], _ates: 0, _itme: 0,
    applyDamage(m) { this._hasar.push(m); return true; },
    addEffect(a, s, sec) { this._etki.push({ a, s, sec }); },
    setOnFire(sn) { this._ates = sn; return true; },
    applyKnockback() { this._itme++; return true; },
    applyImpulse() { return true; }
  };
}

function calistir(kimlik, o) {
  const t = kayit.yetenekAl(kimlik);
  if (!t) return undefined;
  sus();
  const is = t.olustur(o);
  ac();
  return is;
}
/* Bekleme suresini gecmek icin saati ilerlet. */
const bekle = () => { sus(); tickIlerlet(ayar.NEFES_BEKLEME + 2); ac(); };

console.log("=== 1. IKI USLUP, 23 FORM ===");
{
  kontrol("iki uslup tanimli", ayar.NEFES_USLUPLAR.size === 2,
          [...ayar.NEFES_USLUPLAR.keys()].join(" "));
  const g = ayar.NEFES_USLUPLAR.get("gunes");
  const a = ayar.NEFES_USLUPLAR.get("ay");
  kontrol("Gunes 12 form", g.formlar.length === 12, String(g.formlar.length));
  kontrol("Ay 11 form", a.formlar.length === 11, String(a.formlar.length));

  const hepsi = kayit.tumYetenekler().filter((x) => x.kimlik.startsWith("nefes"));
  kontrol("25 yetenek kayitli (2 secim + 23 form)", hepsi.length === 25,
          hepsi.length + " yetenek");
  kontrol("sira carpismasi yok", kayit.siraDenetimi().length === 0,
          kayit.siraDenetimi().join(" | ") || "temiz");

  /* Form adlari MODDAN geldi, uydurulmadi. Birkac tanesi
     birebir sabitlenmis durumda: biri degisirse bu madde
     duser ve "nereden geldi" sorusu yeniden sorulur.      */
  kontrol("Gunes 1. form 'Dance'", g.formlar[0].en === "Dance");
  kontrol("Gunes 9. form 'Beneficent Radiance'",
          g.formlar.find((f) => f.no === 9).en === "Beneficent Radiance");
  kontrol("Ay 1. form 'Dark Moon - Evening Palace'",
          a.formlar[0].en === "Dark Moon - Evening Palace");
  kontrol("Ay 14. form 'Catastrophe, Tenman Crescent Moon'",
          a.formlar.find((f) => f.no === 14).en ===
          "Catastrophe, Tenman Crescent Moon");
  /* Modda BOS birakilan anahtarlar alinmadi: olmayan seyi
     uydurmak bu depoda yasak.                             */
  kontrol("modda bos olan Ay 4/11/12/13/15 alinmadi",
          ![4, 11, 12, 13, 15].some((n) => a.formlar.some((f) => f.no === n)),
          a.formlar.map((f) => f.no).join(","));
  kontrol("modda bos olan Gunes 13 alinmadi",
          !g.formlar.some((f) => f.no === 13));
}

console.log("");
console.log("=== 2. USLUP KAPISI ===");
{
  const { D, o } = kur("u1");
  const z = hedef("z", "minecraft:zombie", 0.5, 90, 3.5);
  D.boyut._varliklar = [o, z];
  nefes.nefesUnut();

  /* Uslup SECILMEDEN form hicbir sey yapmamali. */
  calistir("nefes_gunes_1", o);
  kontrol("uslup secilmeden form hasar VERMIYOR", z._hasar.length === 0,
          z._hasar.join(",") || "0");
  kontrol("  ve kullaniciya ne yapmasi gerektigi yaziliyor",
          o._yazilar.join(" ").indexOf("seç") !== -1,
          o._yazilar[o._yazilar.length - 1] || "");

  calistir("nefes_sec_gunes", o);
  kontrol("uslup secilince kayit olustu",
          nefes.nefesSecili(o.id) === "gunes", String(nefes.nefesSecili(o.id)));
  bekle();
  calistir("nefes_gunes_1", o);
  kontrol("secildikten sonra form calisiyor", z._hasar.length > 0,
          z._hasar.join(","));

  /* OTEKI uslubun formu -- sessizce uslup degistirmemeli. */
  const oncesi = z._hasar.length;
  bekle();
  calistir("nefes_ay_1", o);
  kontrol("oteki uslubun formu hicbir sey yapmiyor",
          z._hasar.length === oncesi, z._hasar.length + " vs " + oncesi);
  kontrol("  ve uslup DEGISMEDI", nefes.nefesSecili(o.id) === "gunes",
          String(nefes.nefesSecili(o.id)));
}

console.log("");
console.log("=== 3. ALTI MEKANIK GERCEKTEN CALISIYOR ===");
{
  const { D, o } = kur("m1");
  const z = hedef("z2", "minecraft:zombie", 0.5, 90, 3.0);
  D.boyut._varliklar = [o, z];
  nefes.nefesUnut();
  calistir("nefes_sec_gunes", o);

  bekle(); calistir("nefes_gunes_1", o);     // kesik
  kontrol("kesik: hasar verdi", z._hasar.length > 0, z._hasar.join(","));
  kontrol("  ates de verdi (Gunes'in imzasi)", z._ates > 0, z._ates + " sn");

  bekle(); const h1 = z._hasar.length; calistir("nefes_gunes_2", o);   // halka
  kontrol("halka: hasar verdi", z._hasar.length > h1);

  bekle(); const i1 = o._itme; calistir("nefes_gunes_3", o);           // atilim
  kontrol("atilim: oyuncuyu itti", o._itme > i1, o._itme + " itme");

  bekle(); calistir("nefes_gunes_8", o);                               // kor
  kontrol("kor eden form korluk verdi",
          z._etki.some((e) => e.a === "blindness"), JSON.stringify(z._etki));

  bekle(); const e1 = o._etki.length; calistir("nefes_gunes_11", o);   // koruma
  kontrol("koruma: KENDIMIZE efekt verdi", o._etki.length > e1,
          JSON.stringify(o._etki.map((x) => x.a)));
  kontrol("  koruma efektleri SURELI",
          o._etki.every((x) => typeof x.s === "number" && x.s > 0 && x.s <= 400),
          o._etki.map((x) => x.a + ":" + x.s).join(" "));

  bekle(); const v1 = D.sayac.dogan ? D.sayac.dogan.length : 0;
  calistir("nefes_gunes_10", o);                                       // mermi
  const v2 = D.sayac.dogan ? D.sayac.dogan.length : 0;
  kontrol("mermi: varlık dogurdu", v2 > v1, v1 + " -> " + v2);
}

console.log("");
console.log("=== 4. AY: CEKIS ve TEKRAR ===");
{
  const { D, o } = kur("a1");
  const z = hedef("z3", "minecraft:zombie", 0.5, 90, 6.5);
  D.boyut._varliklar = [o, z];
  nefes.nefesUnut();
  calistir("nefes_sec_ay", o);
  bekle(); calistir("nefes_ay_3", o);        // cekis
  kontrol("cekis: hedefi cekti", z._itme > 0, z._itme + " itme");
  kontrol("cekis: hasar da verdi", z._hasar.length > 0, z._hasar.join(","));

  /* `tekrar` alani gercekten birden fazla vurus uretmeli. */
  const t = ayar.NEFES_USLUPLAR.get("ay").formlar.find((f) => f.no === 8);
  kontrol("Ay 8 tekrarli tanimli", t.tekrar === 3, String(t.tekrar));
  const z2 = hedef("z4", "minecraft:zombie", 0.5, 90, 3.0);
  D.boyut._varliklar = [o, z2];
  bekle(); calistir("nefes_ay_8", o);
  kontrol("tekrarli form 3 kez vurdu", z2._hasar.length === 3,
          z2._hasar.length + " vurus");
  /* Ay ATES VERMIYOR -- imza farki Gunes ile. */
  kontrol("Ay ates vermiyor (Gunes'ten fark)", z2._ates === 0,
          z2._ates + " sn");
}

console.log("");
console.log("=== 5. KENDIMIZI ve BOTU VURMUYORUZ ===");
{
  const bottipi = [...ayar.KILIT_ATLA_TIPLER][0];
  const { D, o } = kur("k1");
  const bot = hedef("bot", bottipi, 0.5, 90, 2.5);
  const z = hedef("z5", "minecraft:zombie", 0.5, 90, 3.5);
  D.boyut._varliklar = [o, bot, z];
  nefes.nefesUnut();
  calistir("nefes_sec_gunes", o);
  bekle(); calistir("nefes_gunes_9", o);     // en genis halka
  kontrol("mob vuruldu", z._hasar.length > 0);
  kontrol("KENDIMIZ vurulmadi", o._hasar.length === 0, o._hasar.join(",") || "0");
  kontrol("BOTUMUZ vurulmadi", bot._hasar.length === 0,
          bottipi + " :: " + (bot._hasar.join(",") || "0"));
}

console.log("");
console.log("=== 6. BEKLEME SURESI GERCEKTEN TUTUYOR ===");
{
  const { D, o } = kur("b1");
  const z = hedef("z6", "minecraft:zombie", 0.5, 90, 3.0);
  D.boyut._varliklar = [o, z];
  nefes.nefesUnut();
  calistir("nefes_sec_gunes", o);
  bekle();
  calistir("nefes_gunes_1", o);
  const ilk = z._hasar.length;
  calistir("nefes_gunes_1", o);             // ARKA ARKAYA, beklemeden
  kontrol("beklemeden ikinci form calismiyor", z._hasar.length === ilk,
          ilk + " -> " + z._hasar.length);
  bekle();
  calistir("nefes_gunes_1", o);
  kontrol("bekleme dolunca yeniden calisiyor", z._hasar.length > ilk,
          z._hasar.length + " vurus");
}

console.log("");
console.log("=== 7. CIKISTA USLUP SILINMIYOR ===");
{
  /* Kalicilik kodunu yazip sonra onu playerLeave'de silmek,
     bu depoda gorulen bir hata sinifi. Madde davranisi
     olcuyor: cikis islemi cagriliyor ve uslup duruyor mu
     diye bakiliyor.                                       */
  const { D, o } = kur("c1");
  D.boyut._varliklar = [o];
  nefes.nefesUnut();
  calistir("nefes_sec_ay", o);
  kontrol("uslup secili", nefes.nefesSecili(o.id) === "ay");
  nefes.nefesCikti(o.id);
  kontrol("cikistan SONRA uslup duruyor", nefes.nefesSecili(o.id) === "ay",
          String(nefes.nefesSecili(o.id)));
  /* nefesUnut ise gercekten siliyor (test aracı). */
  nefes.nefesUnut(o.id);
  kontrol("nefesUnut siliyor", nefes.nefesSecili(o.id) === undefined);
}

console.log(hata ? ">>> SORUN VAR" : ">>> nefes yerinde");
process.exit(hata ? 1 : 0);
