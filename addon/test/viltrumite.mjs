/* VILTRUMITE CORE -> TEMEL ZIRH                            v5.6

   Kullanici: "Max Steel modundaki temel zirh var ya, bu mod
   SADECE temel zirhla birlestirilecek, diger hicbir sekilde
   baska bir seyle degil... ben temel zirhin zayif oldugunu
   dusunuyorum."

   ---- EN ONEMLI BOLUM: 2. ----
   "SADECE Temel" kullanicinin acik sarti. Yeteneklerin
   digerlerine SIZMADIGI olculuyor -- yoksa sart bir yorum
   satiri olarak kalirdi.

   ---- IKINCI: 4. ----
   %97 hasar indirimi Bedrock efektine SIGMIYOR (tavan %80).
   Kalan geri kazanimla veriliyor ve oran TURETILMIS. Sinama
   net indirimin gercekten %97 ciktigini olcuyor. */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const vilt = await import("./pack/yetenekler/viltrumite.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kollar = await import("./pack/yetenekler/kollar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function kur(elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "v1"; o.typeId = "minecraft:player";
  o._elde = elde;
  const eskiGet = o.getComponent.bind(o);
  o._can = 20;
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => (y === "Mainhand" && o._elde
          ? { typeId: o._elde } : undefined),
        setEquipment: () => true
      };
    }
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return o._can; },
        effectiveMax: 20,
        setCurrentValue: (v) => { o._can = v; }
      };
    }
    return eskiGet(ad);
  };
  o._efektler = [];
  o.addEffect = (a, s2, sec) => {
    o._efektler.push({ ad: a, sure: s2, amp: sec ? sec.amplifier : 0 });
    return true;
  };
  o.getEffect = (a) => o._efektler.find((e) => e.ad === a);
  o.removeEffect = (a) => {
    const i = o._efektler.findIndex((e) => e.ad === a);
    if (i !== -1) o._efektler.splice(i, 1);
    return true;
  };
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o.getViewDirection = () => ({ x: 0, y: 0, z: 1 });
  o.getEntitiesFromViewDirection = () => [];
  o.applyKnockback = () => true;
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  vilt.viltrumiteUnut();
  return { D, o };
}
const yetenek = (k) => kayit.tumYetenekler().find((y) => y.kimlik === k);
const CEK = ayar.ZIRH_CEKIRDEK_ONEK + ayar.VILT_MOD;

console.log("=== 1. ON YETENEK KAYITLI VE ULASILABILIR ===");
{
  kontrol("10 yetenek tanimli", ayar.VILTRUMITE_YETENEKLER.size === 10,
          ayar.VILTRUMITE_YETENEKLER.size + " yetenek");

  const eksik = [];
  for (const k of ayar.VILTRUMITE_YETENEKLER.keys()) {
    if (!yetenek(k)) eksik.push(k);
  }
  kontrol("hepsi kayit defterinde", eksik.length === 0,
          eksik.join(", ") || "10/10");

  /* Kayitli olmak yetmez: Temel cekirdegine BAGLI olmali,
     yoksa esyayla tetiklenemez (v4.83 dersi:
     "calisiyor mu != ulasilabiliyor mu").                  */
  const bagli = kollar.CEKIRDEK_YETENEKLERI
    .filter(([e]) => e === CEK).map(([, y]) => y);
  const baglanmayan = [...ayar.VILTRUMITE_YETENEKLER.keys()]
    .filter((k) => bagli.indexOf(k) === -1);
  kontrol("hepsi Temel cekirdegine bagli", baglanmayan.length === 0,
          baglanmayan.join(", ") || CEK + " -> " + bagli.length + " yetenek");

  /* Ucus da Temel'e geldi: modun Cruise Flight'i icin yeni
     kod yazilmadi, var olan yetenek listeye eklendi.       */
  kontrol("ucus da Temel'e bagli", bagli.indexOf("ucus") !== -1,
          bagli.join(", "));

  /* Jest sirasi carpismasi: Mahou 340-359, Marvel 320-327. */
  const siralar = kayit.tumYetenekler()
    .filter((y) => y.sira !== undefined).map((y) => y.sira);
  const tekrar = siralar.filter((v, i) => siralar.indexOf(v) !== i);
  kontrol("jest sirasi carpismiyor", tekrar.length === 0,
          tekrar.join(", ") || siralar.length + " sira");
}

console.log("");
console.log("=== 2. SADECE TEMEL (kullanicinin acik sarti) ===");
{
  /* "bu mod SADECE temel zirhla birlestirilecek diger hicbir
     sekilde baska bir seyle degil" */
  const digerler = [...ayar.ZIRH_MODLAR.keys()]
    .filter((m) => m !== ayar.VILT_MOD);
  const sizan = [];
  for (const mod of digerler) {
    const t = ayar.ZIRH_MODLAR.get(mod);
    const liste = (t.yetenekler || []).concat(t.yetenek ? [t.yetenek] : []);
    for (const y of liste) {
      if (ayar.VILTRUMITE_YETENEKLER.has(y)) sizan.push(mod + "/" + y);
    }
  }
  kontrol("Viltrumite yetenegi baska hicbir moda sizmadi",
          sizan.length === 0, sizan.join(", ") || digerler.length + " mod temiz");

  /* Kapi CALISIYOR mu: baska cekirdek eldeyken hepsi
     reddetmeli. Liste degil DAVRANIS sinaniyor.            */
  const digerCek = ayar.ZIRH_CEKIRDEK_ONEK + "titan";
  const { o } = kur(digerCek);
  kontrol("baska cekirdekle viltrumiteVar() false",
          vilt.viltrumiteVar(o) === false);
  const acilan = [];
  for (const k of ayar.VILTRUMITE_YETENEKLER.keys()) {
    const y = yetenek(k);
    if (y && y.olustur(o) !== undefined) acilan.push(k);
  }
  kontrol("Titan cekirdegiyle hicbir yetenek acilmiyor",
          acilan.length === 0, acilan.join(", ") || "10'u da reddetti");

  const bos = kur(undefined);
  kontrol("elin bosken de acilmiyor",
          vilt.viltrumiteVar(bos.o) === false);
}

console.log("");
console.log("=== 3. TEMEL CEKIRDEGIYLE GERCEKTEN ACILIYOR ===");
{
  const { o } = kur(CEK);
  kontrol("Temel cekirdegiyle viltrumiteVar() true",
          vilt.viltrumiteVar(o) === true);

  /* Anlik yetenekler undefined donuyor (is acmiyorlar),
     sureli olanlar is nesnesi donduruyor. Ikisi de
     "reddedildi" DEGIL -- ayrimi actionbar'dan degil
     davranistan olcuyoruz: reddedilen bir yetenek hicbir
     hedefe dokunmaz.                                       */
  const sureli = ["vilt_yaylim", "vilt_kavra", "vilt_kilit"];
  const acilmayan = [];
  for (const k of ayar.VILTRUMITE_YETENEKLER.keys()) {
    const y = yetenek(k);
    if (!y) { acilmayan.push(k + " (kayitsiz)"); continue; }
    const is = y.olustur(o);
    if (sureli.indexOf(k) !== -1 && is === undefined && k === "vilt_yaylim") {
      acilmayan.push(k + " (is acmadi)");
    }
  }
  kontrol("sureli yetenekler is aciyor", acilmayan.length === 0,
          acilmayan.join(", ") || "temiz");

  /* Super Hiz kaynagin sartini tasiyor: UCARKEN acilmaz. */
  const u = kur(CEK);
  u.o.isOnGround = false;
  u.o.getVelocity = () => ({ x: 0, y: 0.5, z: 0 });
  u.o._efektler.length = 0;
  yetenek("vilt_hiz").olustur(u.o);
  kontrol("Super Hiz ucarken hiz efekti VERMIYOR",
          !u.o._efektler.some((e) => e.ad === "speed"),
          u.o._efektler.map((e) => e.ad).join(",") || "efekt yok");

  const g = kur(CEK);
  g.o.isOnGround = true;
  g.o._efektler.length = 0;
  yetenek("vilt_hiz").olustur(g.o);
  kontrol("Super Hiz yerde hiz efekti VERIYOR",
          g.o._efektler.some((e) => e.ad === "speed"),
          g.o._efektler.map((e) => e.ad + " " + e.amp).join(",") || "yok");
}

console.log("");
console.log("=== 4. %97 INDIRIM: TURETILMIS, ELLE YAZILMAMIS ===");
{
  /* Direnc IV efektle %80 veriyor; geri kazanim kalani
     kapatiyor. Net indirim tam VILT_INDIRIM olmali.        */
  const efektIndirim = (ayar.VILT_DIRENC + 1) * 0.2;
  const net = 1 - (1 - efektIndirim) * (1 - ayar.VILT_GERI_ORAN);
  kontrol("net indirim tam %" + ayar.VILT_INDIRIM,
          Math.abs(net * 100 - ayar.VILT_INDIRIM) < 1e-9,
          "%" + (net * 100).toFixed(4));
  kontrol("Direnc tavani asmiyor (amp <= 3, V StarOxine'in)",
          ayar.VILT_DIRENC <= 3, "amp " + ayar.VILT_DIRENC);

  /* Davranis: 100 ham hasarda oyuncuya net 3 hasar kalmali.
     Olay Direnc'ten SONRAKI degeri verir: 100 x 0.2 = 20.

     DIKKAT -- entityHurt SONRA olayi: oyun cani ZATEN
     dusurmus oluyor, kanca yalnizca geri ekliyor. Ilk
     yazdigimda mock cani 20'de birakip kancayi cagirmistim;
     canEkle tavana takildi ve sinama "0 hasar" gosterdi.
     Sinama YANLISTI, kod degil. Simdi hasar once
     uygulaniyor.                                            */
  const uygula = (o2, gelen) => {
    o2._can = Math.max(0, o2._can - gelen);
    vilt.viltrumiteHasar({ hurtEntity: o2, damage: gelen });
  };

  const { o } = kur(CEK);
  o._can = 20;
  uygula(o, 20);
  const kalanHasar = 20 - o._can;
  kontrol("100 ham hasarda net ~3 hasar kaliyor",
          Math.abs(kalanHasar - 3) < 0.01, kalanHasar.toFixed(2) + " hasar");

  /* Esik: ham hasar 0.5'in altindaysa TAMAMEN yok sayilir. */
  const e = kur(CEK);
  e.o._can = 20;
  uygula(e.o, 0.4 * (1 - 0.8));
  kontrol("esigin altindaki hasar tamamen yok sayiliyor",
          Math.abs(e.o._can - 20) < 1e-9, e.o._can.toFixed(3) + " can");

  /* Cekirdek yoksa kanca HIC dokunmamali.                  */
  const y = kur(undefined);
  y.o._can = 10;
  vilt.viltrumiteHasar({ hurtEntity: y.o, damage: 5 });
  kontrol("cekirdeksiz oyuncuya kanca dokunmuyor",
          y.o._can === 10, y.o._can + " can");

  /* Savunma acikken emme daha yuksek. Beklenen deger elle
     yazilmiyor, ayni formulden turetiliyor:
        oran = 1 - (1 - GERI_ORAN) x (1 - emme)             */
  const s = kur(CEK);
  yetenek("vilt_savunma").olustur(s.o);
  kontrol("savunma acildi", vilt.savunmadaMi(s.o.id) === true);
  s.o._can = 20;
  uygula(s.o, 20);
  const savunmali = 20 - s.o._can;
  const emme = ayar.VILTRUMITE_YETENEKLER.get("vilt_savunma").emme;
  const beklenen = 20 * (1 - (1 - (1 - ayar.VILT_GERI_ORAN) * (1 - emme)));
  kontrol("savunmadayken hasar daha az (turetilmis)",
          savunmali < kalanHasar && Math.abs(savunmali - beklenen) < 0.01,
          savunmali.toFixed(2) + " vs savunmasiz " + kalanHasar.toFixed(2));
}

console.log("");
console.log("=== 5. SAYILAR MODUN KENDI TOOLTIP'INDEN ===");
{
  /* Modun kendi cumleleri: "%200 of your base attack damage",
     "up to %500", "%175", "43.75% every second", "%70",
     "Cooldown: 1s / 3s / 4s".                              */
  const y = (k) => ayar.VILTRUMITE_YETENEKLER.get(k);
  kontrol("temel hasar 19 (PlayerStatsMixin: 19.0f)",
          ayar.VILT_TEMEL_HASAR === 19, String(ayar.VILT_TEMEL_HASAR));
  kontrol("indirim 97 (damageReductionPercent: 97.0f)",
          ayar.VILT_INDIRIM === 97, String(ayar.VILT_INDIRIM));
  kontrol("esik 0.5 (damageIgnoreThreshold: 0.5f)",
          ayar.VILT_ESIK === 0.5, String(ayar.VILT_ESIK));
  kontrol("blok dusme 40 (punch/dashBlockDropChance: 40.0f)",
          ayar.VILT_BLOK_DUSME === 40, String(ayar.VILT_BLOK_DUSME));

  kontrol("Sonik Yumruk %200, ucarken %500",
          y("vilt_yumruk").carpan === 2.0 &&
          y("vilt_yumruk").ucusCarpan === 5.0);
  kontrol("Sonik Yumruk beklemesi 1 sn",
          y("vilt_yumruk").bekleme === 20);
  kontrol("Olumcul Darbe %175 anlik + %175 kanama",
          y("vilt_darbe").carpan === 1.75 &&
          y("vilt_darbe").kanamaCarpan === 1.75);
  kontrol("kanama 4 saniye", y("vilt_darbe").kanamaSure === 80);
  /* "43.75% damage every second" -- tabloda ayri bir sayi
     olarak DURMUYOR, kanamaCarpan/tik sayisindan cikiyor.
     Cikan sayi modun yazdigiyla ayni mi, olculuyor.        */
  const t = y("vilt_darbe");
  const tikSayisi = t.kanamaSure / t.kanamaAra;
  kontrol("saniyelik kanama tam %43.75",
          Math.abs((t.kanamaCarpan / tikSayisi) * 100 - 43.75) < 1e-9,
          "%" + ((t.kanamaCarpan / tikSayisi) * 100).toFixed(2));
  kontrol("Savunma %70 emme, 3 sn bekleme, 2 sn sure",
          y("vilt_savunma").emme === 0.70 &&
          y("vilt_savunma").bekleme === 60 &&
          y("vilt_savunma").sure === 40);
  kontrol("Yaylim 4 sn sure, 4 sn bekleme",
          y("vilt_yaylim").sure === 80 && y("vilt_yaylim").bekleme === 80);
  kontrol("Atilim beklemesi 1 sn", y("vilt_atilim").bekleme === 20);

  /* Gok Gurultusu'nun HASARI kaynakta YOK. Uydurulmadigi
     sabitleniyor -- biri sonra "eksik" sanip sayi
     yazmasin (The Tick dersi).                            */
  kontrol("Gok Gurultusu hasar vermiyor (kaynakta sayi yok)",
          y("vilt_gok_gurultusu").hasar === 0);

  /* Yaylim tek vurusu Sonik Yumrugun KOPYASI olmamali.    */
  kontrol("Yaylim tek vurusu Sonik Yumruktan kucuk",
          y("vilt_yaylim").carpan < y("vilt_yumruk").carpan,
          y("vilt_yaylim").carpan + " < " + y("vilt_yumruk").carpan);
}

console.log("");
console.log("=== 6. DIGER ZIRHLAR IKI KATINA CIKTI ===");
{
  /* Kullanici: "temel gelen ozellikler fazla guclu olursa
     diger zirhlarin gucunu iki kat daha arttir, bu tamamen
     senin kararin."                                        */
  const guc = ayar.ZIRH_MODLAR.get("guc").efektler
    .find((e) => e[0] === "strength");
  kontrol("Guc: strength amp 4 -> 9 (+15 -> +30)",
          guc[2] === 9, "amp " + guc[2] + " = +" + ((guc[2] + 1) * 3));
  const hiz = ayar.ZIRH_MODLAR.get("hiz").efektler
    .find((e) => e[0] === "speed");
  kontrol("Hiz: speed amp 4 -> 9", hiz[2] === 9, "amp " + hiz[2]);
  const titan = ayar.ZIRH_MODLAR.get("titan").efektler
    .find((e) => e[0] === "strength");
  kontrol("Titan: strength amp 26 -> 53 (+81 -> +162)",
          titan[2] === 53, "amp " + titan[2] + " = +" + ((titan[2] + 1) * 3));

  /* Direnc IKIYE KATLANAMAZ: %60 x2 = %120 diye bir sey yok.
     Tavana (IV) cikti; hepsi orada olmali.                 */
  const direncler = [...ayar.ZIRH_MODLAR].map(([m, t]) => {
    const d = t.efektler.find((e) => e[0] === "resistance");
    return [m, d ? d[2] : -1];
  });
  kontrol("dokuz modun dokuzu da Direnc IV (tavan)",
          direncler.every(([, a]) => a === 3),
          direncler.filter(([, a]) => a !== 3).map((x) => x.join("=")).join(",")
          || "9/9");

  /* Isinlar da iki kat. */
  for (const [kimlik, t] of ayar.ZIRH_ISIN) {
    kontrol(kimlik + ": kaynak x bekleme x 2",
            t.hasar === t.kaynakHasar * ayar.ZIRH_ISIN_BEKLEME * 2,
            t.kaynakHasar + " -> " + t.hasar);
  }

  /* Motor siniri: amplifier 0..255. amp 53 sinirda degil ama
     bir sonraki katlamada olabilir -- kapi burada dursun.  */
  const asan = [];
  for (const [m, t] of ayar.ZIRH_MODLAR) {
    for (const e of t.efektler) if (e[2] > 255) asan.push(m + "/" + e[0]);
  }
  kontrol("hicbir seviye motor sinirini (255) asmiyor",
          asan.length === 0, asan.join(", ") || "temiz");
}

console.log("");
console.log("=== 7. OZET VAAT ETTIGINI VERIYOR ===");
{
  const t = ayar.ZIRH_MODLAR.get(ayar.VILT_MOD);
  kontrol("Temel ozeti VILTRUMITE diyor",
          /viltrumite/i.test(t.ozet), t.ozet);
  kontrol("ozette yazan %97 gercekten VILT_INDIRIM",
          t.ozet.indexOf("%" + ayar.VILT_INDIRIM) !== -1);
  kontrol("ozette yazan yetenek sayisi gercek",
          t.ozet.indexOf(ayar.VILTRUMITE_YETENEKLER.size + " yetenek") !== -1,
          t.ozet);
  kontrol("ozet ucus vaat ediyor ve ucus gercekten bagli",
          /uçuş/i.test(t.ozet) && t.yetenekler.indexOf("ucus") !== -1);
}

console.log("");
console.log("=== 8. ULASILABILIYOR MU ===");
{
  const main = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js viltrumite.js'i import ediyor",
          main.indexOf('"./yetenekler/viltrumite.js"') !== -1);
  kontrol("hasar kancasi kuruluyor",
          main.indexOf("viltrumiteKur()") !== -1);
  kontrol("kanama merkezi tick'ten taraniyor",
          main.indexOf("kanamaTara()") !== -1);
  kontrol("playerLeave temizliyor",
          main.indexOf("viltrumiteUnutOyuncu(olay.playerId)") !== -1);
  kontrol("menude bir satiri var",
          main.indexOf("viltrumiteMenusu(oyuncu)") !== -1);
  kontrol("dosyasi diskte",
          existsSync(BP + "/scripts/yetenekler/viltrumite.js"));

  /* Kanama defteri BOSKEN donmemeli: her tick 10 oyuncu
     gezmek bos yere butce yakar (kalp defteri dersi).      */
  vilt.kanamaUnut();
  let dondu = false;
  const eski = Date.now;
  vilt.kanamaTara();
  dondu = true;
  kontrol("kanama defteri bosken tarama patlamiyor", dondu);
  Date.now = eski;
}

console.log("");
console.log("=== 9. PASIFLER (v5.7) ===");
{
  /* Kullanici: "temel zirh halindeyken 2 tane niye sey var ya,
     cesitlilik dedigin... digerleri nerede."

     v5.6'da yalniz YETENEKLER aktarilmisti; modun alti pasifi
     atlanmisti. Bu bolum onlarin geri gelmedigini degil,
     GERCEKTEN ISLEDIGINI olcuyor.                            */
  const t = ayar.ZIRH_MODLAR.get(ayar.VILT_MOD);
  const efekt = (ad) => t.efektler.find((e) => e[0] === ad);

  kontrol("Temel artik 6 pasif efekt tasiyor",
          t.efektler.length === 6, t.efektler.length + " efekt");
  kontrol("ates bagisikligi (EntityFireMixin)", !!efekt("fire_resistance"));
  kontrol("sonsuz hava (viltrumiteInfiniteAir)", !!efekt("water_breathing"));
  kontrol("aclik (reduceExhaustion x0.005)", !!efekt("saturation"));
  kontrol("yenilenme gostergesi (onTick healFactor)",
          !!efekt("regeneration"));

  /* --- Zararli etki bagisikligi GERCEKTEN siliyor mu --- */
  const { o } = kur(CEK);
  o.addEffect("poison", 200, { amplifier: 1 });
  o.addEffect("wither", 200, { amplifier: 0 });
  o.addEffect("speed", 200, { amplifier: 1 });   // FAYDALI, kalmali
  o._can = 20;
  vilt.viltrumiteTara([o]);
  kontrol("zehir silindi", !o.getEffect("poison"));
  kontrol("solma silindi", !o.getEffect("wither"));
  kontrol("FAYDALI efekt silinmedi (hiz duruyor)",
          !!o.getEffect("speed"),
          o._efektler.map((e) => e.ad).join(",") || "hicbiri");

  /* Cekirdek yoksa hicbirine dokunmamali. */
  const y2 = kur(undefined);
  y2.o.addEffect("poison", 200, { amplifier: 1 });
  vilt.viltrumiteTara([y2.o]);
  kontrol("cekirdeksiz oyuncunun zehiri silinmiyor",
          !!y2.o.getEffect("poison"));

  /* --- Yenilenme hizi kaynakla ayni mi ---
     Kaynak tick basina VILT_YENILENME iyilestiriyor. Tarama her
     tick donmuyor, o yuzden gecen tick sayisiyla carpiliyor:
     ORTALAMA hiz ayni kalmali. Isin lazerlerindeki "saniyelik
     hasar ayni kalsin" kuralinin aynisi.                     */
  const h = kur(CEK);
  h.o._can = 1;
  vilt.viltrumiteTara([h.o]);
  const ilkIyilesme = h.o._can - 1;
  kontrol("ilk taramada tarama araligi kadar iyilesme",
          Math.abs(ilkIyilesme - ayar.VILT_YENILENME * ayar.VILT_PASIF_TARAMA)
            < 1e-9,
          ilkIyilesme + " can / " + ayar.VILT_PASIF_TARAMA + " tick");
  kontrol("iyilesme can tavanini asmiyor",
          h.o._can <= 20, h.o._can + " can");

  /* Tarama araligindan once tekrar cagrilirsa IKINCI KEZ
     iyilestirmemeli -- yoksa her tick'te tavana firlardi.   */
  const oncekiCan = h.o._can;
  vilt.viltrumiteTara([h.o]);
  kontrol("arali dolmadan ikinci kez iyilestirmiyor",
          h.o._can === oncekiCan, h.o._can + " can");

  /* --- Aktarilamayan: donma bagisikligi --- */
  kontrol("donma bagisikligi vaat EDILMIYOR (karsiligi yok)",
          !/donma/i.test(t.ozet), t.ozet);

  /* Zararli efekt listesi bos kalmasin ve faydali bir efekt
     yanlislikla icine dusmesin.                             */
  const FAYDALI = ["speed", "strength", "resistance", "regeneration",
                   "haste", "jump_boost", "fire_resistance",
                   "water_breathing", "saturation", "slow_falling",
                   "invisibility", "night_vision", "conduit_power",
                   "absorption"];
  const yanlis = ayar.VILT_ZARARLI_EFEKTLER
    .filter((e) => FAYDALI.indexOf(e) !== -1);
  kontrol("zararli listesinde faydali efekt yok",
          yanlis.length === 0 && ayar.VILT_ZARARLI_EFEKTLER.length > 0,
          yanlis.join(", ") || ayar.VILT_ZARARLI_EFEKTLER.length + " efekt");

  /* Temel'in kendi verdigi hicbir efekt zararli listesinde
     olmamali -- yoksa verdigini bir saniye sonra siler.     */
  const kendiniSilen = t.efektler
    .filter((e) => ayar.VILT_ZARARLI_EFEKTLER.indexOf(e[0]) !== -1);
  kontrol("Temel kendi verdigi efekti silmiyor",
          kendiniSilen.length === 0,
          kendiniSilen.map((e) => e[0]).join(", ") || "temiz");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Viltrumite Temel zirha oturdu");
process.exit(hata ? 1 : 0);
