/* YENILMEZ ZIRH                                      v7.90

   Kullanici: "bu modda o zirhi taktiginda /kill yazinca bile
   oldurmuyormus ... /kill yazinca hata mesaji versin,
   Ingilizce."

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   KAYNAKTA OYLE BIR MEKANIK YOK. Avaritia'daki `immortal`
   yalniz modun kendi silahlarini atlatan bir etiket. Bu
   dosyanin ilk bolumu o olcumu SABITLIYOR: biri gun gelip
   "kaynakta vardi" derse, kaynak elde ve olcum yazili.

   Gerisi bizim yazdigimiz seyin kurallari:
     - dort parca BIRDEN takili olmali
     - hasar geri iyilestiriliyor (Avaritia'nin dusme hasari
       teknigi)
     - SARJLI: sinirsiz degil, bitince soguyor
     - iyilestirme TAVANLI
     - oldurme girisiminde Ingilizce mesaj
     - mesaj susturmali (/kill spam'i sohbeti bogmasin)      */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, hasarTetikle, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const Z    = await import("./pack/yetenekler/yenilmez_zirh.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id, { tam = true, maks = 20 } = {}) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o._can = maks;
  o._yazi = [];
  const P = ayar.YENILMEZ_PARCALAR;
  o.getComponent = (ad) => {
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return o._can; },
        effectiveMax: maks, defaultValue: maks,
        setCurrentValue(v) { o._can = v; return true; }
      };
    }
    if (ad === "minecraft:equippable") {
      return {
        getEquipment(yuva) {
          if (!tam && yuva === "Feet") return undefined;   // bir parca eksik
          return P[yuva] ? { typeId: P[yuva] } : undefined;
        }
      };
    }
    return undefined;
  };
  o.onScreenDisplay = {
    setActionBar(t) { o._yazi.push(String(t)); }, setTitle() {}
  };
  _durum.oyuncular = [o];
  D.boyut._varliklar = [o];
  return { D, o };
}

/* Gercek `entityHurt` olayini firlatir -- metin eslemesi
   degil, davranis.                                          */
function vurul(o, hasar, sebep) {
  o._can = Math.max(0, o._can - hasar);      // oyunun yaptigi sey
  sus();
  hasarTetikle({ hurtEntity: o, damage: hasar, damageSource: { cause: sebep } });
  ac();
}
const sohbet = () => _durum.sohbet.join("\n");

console.log("=== 1. KAYNAKTA BOYLE BIR MEKANIK YOKTU (olcum) ===");
{
  /* Avaritia Ultimate 1.5.0 okundu. Bulunan: `immortal` bir
     ETIKET ve tek isi modun KENDI silahlarinin atlamasi.
     Paketin tamaminda beforeEvents.entityHurt yok, entityDie
     ile dirilten bir sey yok.

     Bu madde kodun kendi belgesine bakiyor: olcumun nerede
     yazili oldugunu sabitliyor. Biri "kaynakta vardi" derse
     gerekce elde.                                           */
  const { readFileSync } = await import("node:fs");
  const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const a = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/ayarlar.js", "utf8");
  kontrol("olcum ayarlar.js'te yazili",
          a.indexOf("Avaritia Ultimate 1.5.0") !== -1);
  kontrol("  `immortal` etiketinin ne oldugu yazili",
          a.indexOf("immortal") !== -1 && a.indexOf("infinityHit") !== -1);
  kontrol("  beforeEvents.entityHurt olmadigi yazili",
          a.indexOf("beforeEvents.entityHurt` YOK") !== -1 ||
          a.indexOf("beforeEvents.entityHurt") !== -1);
}

console.log("");
console.log("=== 2. DORT PARCA BIRDEN SART ===");
{
  const { o } = kur("t1");
  kontrol("tam set takili -> zirh var", Z.zirhTam(o) === true);

  const { o: o2 } = kur("t2", { tam: false });
  kontrol("bir parca eksik -> zirh YOK", Z.zirhTam(o2) === false);

  /* Eksik setle vurulunca iyilesme OLMAMALI. */
  o2._can = 20;
  vurul(o2, 6, "entityAttack");
  kontrol("eksik setle hasar geri alinmiyor", o2._can === 14,
          "can " + o2._can);
}

console.log("");
console.log("=== 3. HASAR GERI ALINIYOR ===");
{
  const { o } = kur("h1");
  vurul(o, 7, "entityAttack");
  kontrol("can geri geldi", o._can === 20, "can " + o._can);
  const d = Z.yenilmezDurum(o.id);
  kontrol("bir sarj harcandi", d && d.sarj === ayar.YENILMEZ_SARJ - 1,
          d ? d.sarj + "/" + ayar.YENILMEZ_SARJ : "yok");
  kontrol("kullaniciya yazildi",
          o._yazi.join(" ").indexOf("Zırh tuttu") !== -1,
          o._yazi[o._yazi.length - 1] || "");
}

console.log("");
console.log("=== 4. CAN TAVANI ASILMIYOR ===");
{
  /* ---- BIR AYAR SILINDI, GEREKCESI BURADA ----
     Ilk yazilista ayrica bir `YENILMEZ_TAVAN_HASAR` vardi.
     Mutasyon bataryasi onu kaldirdi ve hicbir madde dusmedi:
     iyilestirme zaten `Math.min(maks, ...)` ile can tavanina
     vuruyordu, yani ikinci tavan olu bir ayardi. Silindi.

     Gercek sinir bu madde: 100000 hasar geri alinsa bile can
     maksimumu asmamali. Asaydi oyuncu her /kill'de daha da
     guclenirdi.                                            */
  const { o } = kur("v1", { maks: 20 });
  o._can = 20;
  vurul(o, 100000, "selfDestruct");
  kontrol("can maksimumu ASMADI", o._can <= 20, "can " + o._can);
  kontrol("  ve tam dolduruldu", o._can === 20, "can " + o._can);

  /* 200 canli oyuncuda da ayni: tavan ORANLI degil MUTLAK,
     yani setin max'i neyse o.                              */
  const { o: o2 } = kur("v2", { maks: 200 });
  o2._can = 200;
  vurul(o2, 100000, "selfDestruct");
  kontrol("200 canli oyuncuda da tavan asilmadi", o2._can === 200,
          "can " + o2._can);
  kontrol("olu ayar geri gelmedi",
          ayar.YENILMEZ_TAVAN_HASAR === undefined,
          String(ayar.YENILMEZ_TAVAN_HASAR));
}

console.log("");
console.log("=== 5. /kill MESAJI: INGILIZCE ve BELIRGIN ===");
{
  _durum.sohbet.length = 0;
  const { o } = kur("Earsh");
  vurul(o, 100000, "selfDestruct");
  const s = sohbet();
  kontrol("mesaj basildi", s.length > 0, s.split("\n")[0] || "(bos)");
  kontrol("INGILIZCE", s.indexOf("COMMAND FAILED") !== -1 &&
          s.indexOf("cannot be executed") !== -1, s.replace(/\n/g, " / "));
  kontrol("oyuncunun adi geciyor", s.indexOf("Earsh") !== -1);
  kontrol("kalan sarj yaziyor", /Charges: §7\d+§8\/\d+/.test(s), s.replace(/\n/g, " / "));
  kontrol("cok satirli (bayagi yaziyor)", s.split("\n").length >= 4,
          s.split("\n").length + " satir");
}

console.log("");
console.log("=== 6. NORMAL HASARDA SOHBETE YAZMIYOR ===");
{
  /* Her vurusta sohbete satir basmak duelloyu okunamaz
     yapardi; oldurme girisimi ayri bir sey.                */
  _durum.sohbet.length = 0;
  const { o } = kur("n1");
  vurul(o, 5, "entityAttack");
  kontrol("normal vurus sohbete yazmiyor", sohbet().length === 0,
          sohbet() || "temiz");
  kontrol("  ama aksiyon cubuguna yaziyor",
          o._yazi.join(" ").indexOf("Zırh tuttu") !== -1);
}

console.log("");
console.log("=== 7. MESAJ SUSTURMALI (/kill spam) ===");
{
  _durum.sohbet.length = 0;
  const { o } = kur("s1");
  for (let i = 0; i < 5; i++) vurul(o, 100000, "selfDestruct");
  const satir = _durum.sohbet.length;
  kontrol("bes /kill tek mesaj bastı", satir === 1, satir + " mesaj");
  sus(); tickIlerlet(ayar.YENILMEZ_SUS + 2); ac();
  vurul(o, 100000, "selfDestruct");
  kontrol("susturma dolunca yeniden basiyor", _durum.sohbet.length === 2,
          _durum.sohbet.length + " mesaj");
}

console.log("");
console.log("=== 8. SARJ BITINCE ZIRH SOGUYOR (asil sinir) ===");
{
  /* Sinirsiz olsaydi hem bu depodaki kurali cignerdi hem
     duelloyu bitirirdi: yenilmez bir rakiple oynamak
     oynamak degildir.                                      */
  const { o } = kur("b1");
  for (let i = 0; i < ayar.YENILMEZ_SARJ; i++) vurul(o, 3, "entityAttack");
  const d = Z.yenilmezDurum(o.id);
  kontrol("sarj tukendi", d && d.sarj === 0, d ? String(d.sarj) : "yok");
  o._can = 20;
  vurul(o, 6, "entityAttack");
  kontrol("sarj bitince hasar GERI ALINMIYOR", o._can === 14, "can " + o._can);
  kontrol("  ve sebebi yaziliyor",
          o._yazi.join(" ").indexOf("soğuyor") !== -1,
          o._yazi[o._yazi.length - 1] || "");
}

console.log("");
console.log("=== 9. SARJ ZAMANLA DOLUYOR ===");
{
  const { o } = kur("d1");
  for (let i = 0; i < ayar.YENILMEZ_SARJ; i++) vurul(o, 3, "entityAttack");
  kontrol("once tukendi", Z.yenilmezDurum(o.id).sarj === 0);
  sus(); tickIlerlet(ayar.YENILMEZ_DOLUM * 3 + 5); ac();
  o._can = 20;
  vurul(o, 4, "entityAttack");
  const d = Z.yenilmezDurum(o.id);
  /* Uc dolum gecti, biri harcandi -> 2 kalmali.            */
  kontrol("uc dolumda uc sarj geldi, biri harcandi", d.sarj === 2,
          String(d.sarj));
  kontrol("  ve hasar yine geri alindi", o._can === 20, "can " + o._can);
}

console.log("");
console.log("=== 10. OLDURME GIRISIMI AYRIMI ===");
{
  const O = Z.oldurmeGirisimi;
  kontrol("selfDestruct oldurme girisimi", O("selfDestruct", 5) === true);
  kontrol("void oldurme girisimi", O("void", 5) === true);
  kontrol("devasa hasar da oyle", O("entityAttack", 100000) === true);
  kontrol("normal vurus DEGIL", O("entityAttack", 6) === false);
  kontrol("sebep okunamazsa ve hasar kucukse DEGIL",
          O(undefined, 3) === false);
  kontrol("esik ayardan",
          O("entityAttack", ayar.YENILMEZ_OLDURME_HASAR) === true &&
          O("entityAttack", ayar.YENILMEZ_OLDURME_HASAR - 1) === false,
          String(ayar.YENILMEZ_OLDURME_HASAR));
}

console.log("");
console.log("=== 11. ZIRHSIZ OYUNCUYA HIC DOKUNMUYOR ===");
{
  _durum.sohbet.length = 0;
  const { o } = kur("z1", { tam: false });
  o._can = 20;
  vurul(o, 100000, "selfDestruct");
  kontrol("zirhsiz oyuncu korunmuyor", o._can === 0, "can " + o._can);
  kontrol("  ve onun adina mesaj basilmiyor", sohbet().length === 0,
          sohbet() || "temiz");
  kontrol("  defterde kaydi da yok", Z.yenilmezDurum(o.id) === undefined);
}

console.log("");
console.log("=== 12. OYUNCU CIKINCA SARJ DUSUYOR ===");
{
  const { o } = kur("c1");
  vurul(o, 3, "entityAttack");
  kontrol("kayit var", Z.yenilmezDurum(o.id) !== undefined);
  Z.yenilmezUnut(o.id);
  kontrol("cikinca silindi", Z.yenilmezDurum(o.id) === undefined);
}

console.log(hata ? ">>> SORUN VAR" : ">>> yenilmez zirh yerinde");
process.exit(hata ? 1 : 0);
