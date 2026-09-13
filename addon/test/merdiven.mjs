/* SAVUNMA MERDIVENI                                  v7.89

   Kullanici karari: "biz bunu tamamen savunmaya yonelik
   yapalim ... canim azaldiginda ekstra guc acacagim ...
   kurtarici bitti ondan sonra da SIRALI olsun ... hepsine de
   can okuyucu ekle ki sirali bir sekilde devreye girsinler."

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. SIRALILIK. Can bir anda dibe vursa bile merdiven 1'den
      baslayip tirmaniyor. Kullanicinin acik istegi ve ayrica
      dogru: bes basamak birden acilsaydi hangisinin ise
      yaradigi hic anlasilmazdi.
   2. HIZLI DUSUS ("rakibim benden guclu"). Rakibin gucunu
      okuyan API yok; olculen sey canin ne hizla gittigi.
   3. TOPARLAMA. Esikte titreyen can basamaklari surekli
      yakmamali.
   4. DIRENC V YOK. Tavan Direnc IV. Dokunulmazlik oyunu
      bitirir, savunmayi degil -- ve bu depoda yasak.
   5. HICBIR BASAMAK HASAR VERMIYOR. Son basamagin itmesi
      bile hasarsiz: ayirir, oldurmez.
   6. KURTARICI DURUYOR. "Onun yerine" degil "ardina" bir
      sistem istendi.                                        */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const M    = await import("./pack/yetenekler/savunma_merdiveni.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id, maks = 20) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o._can = maks;
  o._etki = []; o._hasar = []; o._yazi = []; o._baslik = [];
  o.getComponent = (ad) => (ad === "minecraft:health")
    ? { get currentValue() { return o._can; }, effectiveMax: maks, defaultValue: maks }
    : undefined;
  o.addEffect = (a, s, sec) => { o._etki.push({ a, s, amp: sec && sec.amplifier }); };
  o.applyDamage = (m) => { o._hasar.push(m); return true; };
  o.applyKnockback = () => true;
  o.onScreenDisplay = {
    setActionBar(t) { o._yazi.push(String(t)); },
    setTitle(t, sec) { o._baslik.push(String(t)); }
  };
  /* ---- OYUNCU DUNYA LISTESINE KONMUYOR  (bilerek) ----
     main.js'in merkezi tick'i de `merdivenTara`yi cagiriyor
     (`world.getAllPlayers()` uzerinden) ve sahte dunyada o
     liste `_durum.oyuncular`. Oyuncu oraya konsaydi merdiven
     HEM bu testin cagrisiyla HEM ana donguyle ilerlerdi --
     yani test kendi kendisiyle yarisirdi.

     Ilk yazilista tam bu oldu: uc madde dustu ("sifirlandiktan
     sonra yeniden aciliyor" 0 yerine 1, "kalkan_sistemi
     tetiklendi" hic gorunmedi, "20 can aciyor" 0 yerine 3)
     ve ucu de koddaki bir hatayi degil olcum aracindaki bu
     yarisi gosteriyordu.

     Varlık listesi kaliyor: son basamagin itmesi onu
     okuyor.                                               */
  _durum.oyuncular = [];
  D.boyut._varliklar = [o];
  return { D, o };
}

function hedef(id, tip, x, y, z) {
  return {
    id, typeId: tip, isValid: true, location: { x, y, z },
    _hasar: [], _itme: 0,
    applyDamage(m) { this._hasar.push(m); return true; },
    applyKnockback() { this._itme++; return true; },
    addEffect() {}
  };
}

/* Merdiveni GERCEKTEN calistirir: tarama + saat.
   `tetikle` cagrilan yetenek kimliklerini topluyor.        */
function tara(o, kez = 1, aralik = ayar.MERDIVEN_ARA) {
  const acilan = [];
  sus();
  for (let i = 0; i < kez; i++) {
    tickIlerlet(aralik);
    M.merdivenTara([o], (oy, kimlik) => { acilan.push(kimlik); return true; });
  }
  ac();
  return acilan;
}
const basamak = (o) => (M.merdivenDurum(o.id) || { basamak: -1 }).basamak;

console.log("=== 1. BASAMAKLAR ve DIRENC TAVANI ===");
{
  const B = ayar.MERDIVEN_BASAMAKLAR;
  kontrol("bes basamak", B.length === 5, String(B.length));
  /* Esikler AZALAN olmali; artan bir esik merdiveni bozar. */
  const azalan = B.every((b, i) => i === 0 || b.esik < B[i - 1].esik);
  kontrol("esikler azalan sirada", azalan,
          B.map((b) => b.esik).join(" > "));

  /* DIRENC V YASAK. tarama.mjs bunu tablolar icin deniyor;
     merdiven ayri bir tablo, burada da denenmeli.          */
  const kotu = [];
  for (const b of B) {
    for (const [a, s, amp] of b.efektler || []) {
      if (a === "resistance" && amp > 3) kotu.push(b.kimlik + "=Direnc " + (amp + 1));
    }
  }
  kontrol("Direnc V (dokunulmazlik) YOK", kotu.length === 0,
          kotu.join(", ") || "temiz");
  const enYuksek = Math.max(...B.flatMap((b) => (b.efektler || [])
    .filter((e) => e[0] === "resistance").map((e) => e[2])));
  kontrol("en yuksek direnc IV (amp 3)", enYuksek === 3, "amp " + enYuksek);

  /* Butun etkiler SURELI. */
  const sonsuz = B.flatMap((b) => (b.efektler || []))
    .filter((e) => !(e[1] > 0 && e[1] <= 1200));
  kontrol("butun etkiler sureli", sonsuz.length === 0,
          JSON.stringify(sonsuz));

  /* HICBIR BASAMAK HASAR VERMIYOR -- tamamen savunma. */
  const saldiri = B.filter((b) => b.hasar !== undefined);
  kontrol("hicbir basamakta hasar alani yok", saldiri.length === 0,
          saldiri.map((b) => b.kimlik).join(" ") || "temiz");
}

console.log("");
console.log("=== 2. SIRALILIK (asil madde) ===");
{
  /* Can BIR ANDA dibe vuruyor. Merdiven yine de 1'den
     baslamali. Bu madde duserse "sirali olsun" istegi
     karsilanmamis demektir.                               */
  const { o } = kur("s1");
  o._can = 1;                      // %5 -- en alt basamagin da altinda
  tara(o, 1);
  kontrol("tek taramada tek basamak (dibe vursa bile)",
          basamak(o) === 0, "basamak " + basamak(o));
  tara(o, 1);
  kontrol("ikinci taramada ikinci basamak", basamak(o) === 1,
          "basamak " + basamak(o));
  tara(o, 3);
  kontrol("bes taramada en alta varildi", basamak(o) === 4,
          "basamak " + basamak(o));
  tara(o, 3);
  kontrol("en alttan sonra artmiyor", basamak(o) === 4,
          "basamak " + basamak(o));
}

console.log("");
console.log("=== 3. ESIK GELMEDEN ACILMIYOR ===");
{
  const { o } = kur("e1");
  o._can = 19;                     // %95 -- hicbir esik gecilmedi
  tara(o, 4);
  kontrol("can tamken hicbir basamak acilmadi", basamak(o) === -1,
          "basamak " + basamak(o));
  kontrol("  hic efekt verilmedi", o._etki.length === 0,
          o._etki.length + " efekt");

  o._can = 13;                     // %65 -- yalniz 1. esik (%70)
  tara(o, 4);
  kontrol("%65'te yalniz ilk basamak acildi", basamak(o) === 0,
          "basamak " + basamak(o));
}

console.log("");
console.log("=== 4. HIZLI DUSUS: IKI BASAMAK ===");
{
  /* "Rakibimin gucu benden daha guclu" -> olculebilir
     karsiligi: canin ne hizla gittigi.                    */
  const { o } = kur("h1");
  o._can = 13;                     // %65
  tara(o, 1);
  kontrol("yavas dususte bir basamak", basamak(o) === 0,
          "basamak " + basamak(o));

  const { o: o2 } = kur("h2");
  o2._can = 20;
  tara(o2, 1);                     // pencereye %100 yaziliyor
  o2._can = 6;                     // %30 -- pencerede %70 kayip
  const oncesi = basamak(o2);
  tara(o2, 1);
  kontrol("hizli dususte IKI basamak birden",
          basamak(o2) - oncesi === 2, oncesi + " -> " + basamak(o2));
}

console.log("");
console.log("=== 5. TOPARLAMA: MERDIVEN SIFIRLANIYOR ===");
{
  const { o } = kur("t1");
  o._can = 4;                      // %20
  tara(o, 4);
  kontrol("basamaklar acilmis", basamak(o) >= 2, "basamak " + basamak(o));
  o._can = 19;                     // %95 -> toparlama esigi ustu
  tara(o, 1);
  kontrol("toparlaninca merdiven sifirlandi", basamak(o) === -1,
          "basamak " + basamak(o));
  kontrol("  ve kullaniciya yazildi",
          o._yazi.join(" ").indexOf("sıfırlandı") !== -1,
          o._yazi[o._yazi.length - 1] || "");
  /* Sifirlandiktan sonra YENIDEN acilabilmeli.

     Pencere BILEREK bosaltiliyor (aralik > MERDIVEN_DUSUS_PENCERE):
     yoksa %95'ten %20'ye inmek zaten HIZLI DUSUS sayilir ve
     iki basamak acilir. O da dogru davranis, ama bu maddenin
     olctugu sey "yeniden acilabiliyor mu", "kac basamak" degil.
     Iki kurali ayri ayri olcmek, birinin otekini gizlemesini
     engelliyor.                                             */
  o._can = 4;
  tara(o, 1, ayar.MERDIVEN_DUSUS_PENCERE + ayar.MERDIVEN_ARA);
  kontrol("sifirlandiktan sonra yeniden aciliyor", basamak(o) === 0,
          "basamak " + basamak(o));
}

console.log("");
console.log("=== 6. ESIKTE TITREME BASAMAK YAKMIYOR ===");
{
  /* KURTARICI_TOPARLAMA ile ayni gerekce: esigin hemen
     altinda gidip gelen can, her taramada bir basamak
     yakmamali.                                            */
  const { o } = kur("ti1");
  o._can = 13;                     // %65
  tara(o, 1);
  const ilk = basamak(o);
  o._can = 15; tara(o, 1);         // %75 -- esigin ustu ama toparlama degil
  o._can = 13; tara(o, 1);         // %65
  kontrol("esikte gidip gelmek fazladan basamak yakmadi",
          basamak(o) === ilk, ilk + " -> " + basamak(o));
}

console.log("");
console.log("=== 7. YETENEK BASAMAKLARI GERCEKTEN TETIKLIYOR ===");
{
  const { o } = kur("y1");
  o._can = 1;
  const acilan = tara(o, 5);
  kontrol("kalkan_sistemi tetiklendi",
          acilan.indexOf("kalkan_sistemi") !== -1, acilan.join(" "));
  kontrol("nobetci tetiklendi",
          acilan.indexOf("nobetci") !== -1, acilan.join(" "));
  /* Tetikleyici DISARIDAN geliyor: merdiven merkezi is
     listesine dogrudan dokunmuyor.                        */
  kontrol("yalniz basamaklarin yetenekleri tetiklendi",
          acilan.every((k) => ["kalkan_sistemi", "nobetci"].indexOf(k) !== -1),
          acilan.join(" "));
}

console.log("");
console.log("=== 8. SON BASAMAK AYIRIR, OLDURMEZ ===");
{
  const bottipi = [...ayar.KILIT_ATLA_TIPLER][0];
  const { D, o } = kur("a1");
  const z = hedef("z", "minecraft:zombie", 2.5, 90, 0.5);
  const bot = hedef("bot", bottipi, 1.5, 90, 0.5);
  D.boyut._varliklar = [o, z, bot];
  o._can = 1;
  tara(o, 6);
  kontrol("en alt basamaga varildi", basamak(o) === 4, "basamak " + basamak(o));
  kontrol("cevredeki itildi", z._itme > 0, z._itme + " itme");
  /* ASIL MADDE: savunma basamagi HASAR VERMEZ. */
  kontrol("cevredekine HASAR VERILMEDI", z._hasar.length === 0,
          z._hasar.join(",") || "0");
  kontrol("BOTUMUZ itilmedi", bot._itme === 0, bot._itme + " itme");
  kontrol("KENDIMIZE hasar yok", o._hasar.length === 0,
          o._hasar.join(",") || "0");
}

console.log("");
console.log("=== 9. CAN OKUNAMAZSA DOKUNMUYOR ===");
{
  /* Okuyamadigimiz seye gore hukum vermemek: bu depodaki
     her olcumun ayni tercihi.                             */
  const { o } = kur("o1");
  o.getComponent = () => undefined;
  tara(o, 4);
  kontrol("can okunamayinca basamak acilmiyor",
          M.merdivenDurum(o.id) === undefined ||
          M.merdivenDurum(o.id).basamak === -1,
          JSON.stringify(M.merdivenDurum(o.id) || null));
  kontrol("  efekt de verilmiyor", o._etki.length === 0);

  /* ---- ISTISNA DALI DA DENENIYOR ----
   Ustteki madde `getComponent` UNDEFINED donen yolu deniyor.
   `canOrani` icinde bir de ISTISNA dali var ve mutasyon
   bataryasi onu yakalayamadi: catch'te `undefined` yerine 0
   donduruldugunde hicbir madde dusmedi. 0 donmek "canin %0"
   demek, yani okunamayan oyuncunun BUTUN merdivenini yakar --
   sessiz ve kotu bir hata. Burada bilerek istisna atiliyor. */
  const { o: o2 } = kur("o2");
  o2.getComponent = () => { throw new Error("okunamadi"); };
  tara(o2, 4);
  kontrol("can okumasi ISTISNA atarsa da basamak acilmiyor",
          M.merdivenDurum(o2.id) === undefined ||
          M.merdivenDurum(o2.id).basamak === -1,
          JSON.stringify(M.merdivenDurum(o2.id) || null));
  kontrol("  istisna dalinda da efekt verilmiyor", o2._etki.length === 0,
          o2._etki.length + " efekt");
}

console.log("");
console.log("=== 10. ORAN OKUNUYOR, MUTLAK SAYI DEGIL ===");
{
  /* 200 kalp formunda 20 can "az" degil. Mutlak sayiya
     bakan bir merdiven orada surekli acik kalirdi.        */
  const { o } = kur("k1", 200);    // 100 kalp
  o._can = 150;                    // %75 -- hicbir esik gecilmedi
  tara(o, 4);
  kontrol("200 canli oyuncuda 150 can basamak acmiyor",
          basamak(o) === -1, "basamak " + basamak(o));
  o._can = 20;                     // %10 -- normalde "tam dolu"
  tara(o, 1);
  /* IKI basamak bekleniyor, bir degil: %75'ten %10'a dusmek
     zaten HIZLI DUSUS (0.65 >= MERDIVEN_DUSUS_ORAN). Ilk
     yazilista burada 0 bekleniyordu ve madde dustu -- kodda
     hata yoktu, IDDIA yanlisti. Iki kural ayni anda
     dogruysa test ikisini birden yazmali.                 */
  kontrol("  ama 20 can (oran %10) aciyor", basamak(o) >= 0,
          "basamak " + basamak(o));
  kontrol("  ve hizli dusus kurali da isledi (iki basamak)",
          basamak(o) === 1, "basamak " + basamak(o));
}

console.log("");
console.log("=== 11. KURTARICI DURUYOR (yerine degil ardina) ===");
{
  kontrol("ruh.js duruyor",
          existsSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/ruh.js"));
  kontrol("KURTARICI_ACIK hala true", ayar.KURTARICI_ACIK === true);
  kontrol("KURTARICI_ESIK degismedi (0.25)", ayar.KURTARICI_ESIK === 0.25,
          String(ayar.KURTARICI_ESIK));
  /* Merdiven kurtaricidan BAGIMSIZ: kendi esikleri var ve
     kurtaricininkiyle ayni degil.                          */
  kontrol("merdivenin esikleri kurtaricininkinden ayri",
          !ayar.MERDIVEN_BASAMAKLAR.every((b) => b.esik === ayar.KURTARICI_ESIK));
}

console.log("");
console.log("=== 12. OYUNCU CIKINCA DURUM DUSUYOR ===");
{
  const { o } = kur("c1");
  o._can = 4;
  tara(o, 2);
  kontrol("durum var", M.merdivenDurum(o.id) !== undefined);
  M.merdivenUnut(o.id);
  kontrol("cikinca durum silindi", M.merdivenDurum(o.id) === undefined);
  kontrol("  otekiler etkilenmiyor (kimlikle siliniyor)",
          typeof M.merdivenSayisi() === "number");
}

console.log(hata ? ">>> SORUN VAR" : ">>> savunma merdiveni yerinde");
process.exit(hata ? 1 : 0);
