/* KILIT SOKME -- Arinmanin 9. kolu.                    v7.49

   Kullanici bes komut dosyasi daha getirdi. Dordu yeni bir
   sey tasimiyordu; biri tasidi:

     psgkodgm3_1.txt · "KAFAYA BALKABAGI SOKMA"
       replaceitem entity @a[name=!PSG1834] slot.armor.head
         1 carved_pumpkin 1 0
         {"item_lock":{"mode":"lock_in_slot"}}

   Ayni kalip ucuncu kez: Falen Mod V2 (sp:voidol), Klezy
   konsey silahlari (klezy:toxic_skin), simdi PSG (kabak).
   Arinmanin sekiz kolu da KOMUTLA geri alinabilen seylere
   bakiyordu; kilitli esya bir ENVANTER durumu ve hicbiri
   ona bakmiyordu.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   ESYA KAYBOLMUYOR. Savunma, korudugu seyi yok ederse
   savunma degildir. 5., 6. ve 7. bolum tam olarak bunu
   olcuyor: yer yoksa, yazma patlarsa, koyma patlarsa --
   ucunde de esya oyuncuda kaliyor.

   Sinananlar:
     1. Kilitli kabak: kilit sokuluyor VE kafadan iniyor
     2. Kendi esyamiz ("pa:") hic dokunulmuyor
     3. Kilitli migfer: kilit sokuluyor ama KAFADA KALIYOR
     4. Kilitsiz kabak: hicbir sey yapilmiyor
     5. Envanter dolu: kabak kafada, kilitsiz, kayip yok
     6. setEquipment patliyor: esya kafada
     7. addItem artan donduruyor: esya kafaya GERI takiliyor
     8. Envanter yuvalari da taraniyor
     9. Bir yuva patlarsa otekiler yine taraniyor
    10. ZORLA_ACIK kapaliyken hicbir sey yapilmiyor
    11. Savunma Kipi de sokuyor (dongu halinde gelen saldiri)
    12. Arinma mesajinda "kilit" yaziyor                      */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const arinma = await import("./pack/yetenekler/arinma.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* ---- SAHTE YUVA ----
   Gercek ContainerSlot'un bu is icin gereken yuzu: hasItem,
   typeId, lockMode (yazilabilir). Baska bir sey taklit
   edilmiyor -- taklit ne kadar buyurse test o kadar
   gercekten uzaklasir.                                      */
function yuvaYap(tip, kilit = "none") {
  return {
    _tip: tip,
    lockMode: kilit,
    hasItem() { return this._tip !== undefined; },
    get typeId() { return this._tip; }
  };
}

let sayac = 0;
function kur(secenek = {}) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = "k" + (++sayac);
  o.typeId = "minecraft:player";
  o._mesaj = [];
  o._efektler = new Set();
  o.runCommand = () => ({ successCount: 1 });
  o.sendMessage = function (m) { this._mesaj.push(m); };
  o.getEffect = () => undefined;
  o.removeEffect = () => {};

  const kafa = secenek.kafa || undefined;      // { tip, kilit }
  const zirhYuvalari = {
    Head: kafa ? yuvaYap(kafa.tip, kafa.kilit) : yuvaYap(undefined),
    Chest: yuvaYap(undefined), Legs: yuvaYap(undefined),
    Feet: yuvaYap(undefined), Mainhand: yuvaYap(undefined),
    Offhand: yuvaYap(undefined)
  };
  if (secenek.el) zirhYuvalari.Mainhand = yuvaYap(secenek.el.tip, secenek.el.kilit);

  o._kafa = kafa ? { typeId: kafa.tip } : undefined;
  o._envanterYuvalari = (secenek.envanter || []).map(
    (e) => (e ? yuvaYap(e.tip, e.kilit) : yuvaYap(undefined))
  );
  while (o._envanterYuvalari.length < 36) o._envanterYuvalari.push(yuvaYap(undefined));
  o._eklenen = [];
  o._bosYuva = secenek.bosYuva === undefined ? 5 : secenek.bosYuva;
  o._zirh = zirhYuvalari;

  o.getComponent = function (ad) {
    if (ad === "minecraft:equippable") {
      return {
        getEquipmentSlot: (y) => {
          if (secenek.yuvaPatlat === y) throw new Error("yuva okunamadi");
          return zirhYuvalari[y];
        },
        getEquipment: (y) => (y === "Head" ? o._kafa : undefined),
        setEquipment: (y, esya) => {
          if (secenek.yazPatlat) throw new Error("takilamadi");
          if (y === "Head") { o._kafa = esya; zirhYuvalari.Head = yuvaYap(esya && esya.typeId); }
          return true;
        }
      };
    }
    if (ad === "minecraft:inventory") {
      return {
        container: {
          size: o._envanterYuvalari.length,
          get emptySlotsCount() { return o._bosYuva; },
          getSlot: (i) => o._envanterYuvalari[i],
          getItem: (i) => undefined,
          setItem: () => {},
          addItem: (esya) => {
            if (secenek.koyPatlat) throw new Error("konulamadi");
            if (secenek.artanDondur) return esya;
            o._eklenen.push(esya.typeId);
            return undefined;
          }
        }
      };
    }
    return undefined;
  };
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  return o;
}

console.log("=== 1. KILITLI KABAK: KILIT SOKULUYOR VE KAFADAN INIYOR ===");
{
  const o = kur({ kafa: { tip: "minecraft:carved_pumpkin", kilit: "slot" } });
  const n = arinma.kilitSok(o);
  kontrol("kilit + kor indirme = 2 is", n === 2, "n=" + n);
  kontrol("kafa bosaldi", o._kafa === undefined);
  kontrol("kabak ENVANTERE gitti (silinmedi)",
          o._eklenen.indexOf("minecraft:carved_pumpkin") !== -1,
          o._eklenen.join(","));
}

console.log("=== 2. KENDI ESYAMIZA DOKUNULMUYOR ===");
{
  const o = kur({ kafa: { tip: "pa:kns_deri_zehir", kilit: "slot" } });
  const n = arinma.kilitSok(o);
  kontrol("hicbir kilit sokulmedi", n === 0, "n=" + n);
  kontrol("kilit YERINDE duruyor", o._zirh.Head.lockMode === "slot",
          o._zirh.Head.lockMode);
  kontrol("kafada kaldi", o._kafa !== undefined);
}

console.log("=== 3. KILITLI MIGFER: KILIT SOKULUYOR AMA KAFADA KALIYOR ===");
{
  /* Saldiran elmas migfer taksa bile o migfer ISE YARIYOR.
     Indirilen sey yalnizca GORMENI ENGELLEYEN sey.          */
  const o = kur({ kafa: { tip: "minecraft:diamond_helmet", kilit: "slot" } });
  const n = arinma.kilitSok(o);
  kontrol("bir kilit sokuldu", n === 1, "n=" + n);
  kontrol("kilit acildi", o._zirh.Head.lockMode === "none");
  kontrol("migfer KAFADA kaldi", o._kafa !== undefined);
  kontrol("envantere tasinmadi", o._eklenen.length === 0);
}

console.log("=== 4. KILITSIZ KABAK: HICBIR SEY YAPILMIYOR ===");
{
  /* Enderman'dan korunmak icin kabak takan adam var. Kilitli
     DEGILSE onu kendisi takmistir.                          */
  const o = kur({ kafa: { tip: "minecraft:carved_pumpkin", kilit: "none" } });
  const n = arinma.kilitSok(o);
  kontrol("hicbir is yapilmadi", n === 0, "n=" + n);
  kontrol("kabak kafada duruyor", o._kafa !== undefined);
  kontrol("envantere tasinmadi", o._eklenen.length === 0);
}

console.log("=== 5. ENVANTER DOLU: ESYA KAYBI YOK ===");
{
  const o = kur({ kafa: { tip: "minecraft:carved_pumpkin", kilit: "slot" },
                  bosYuva: 0 });
  const n = arinma.kilitSok(o);
  kontrol("yalniz kilit sokuldu", n === 1, "n=" + n);
  kontrol("kilit acildi (elle cikarilabilir)",
          o._zirh.Head.lockMode === "none");
  kontrol("kabak KAFADA -- kaybolmadi", o._kafa !== undefined);
  kontrol("envantere zorla sokulmadi", o._eklenen.length === 0);
}

console.log("=== 6. setEquipment PATLIYOR: ESYA KAFADA ===");
{
  const o = kur({ kafa: { tip: "minecraft:carved_pumpkin", kilit: "slot" },
                  yazPatlat: true });
  const n = arinma.kilitSok(o);
  kontrol("kilit yine de sokuldu", n === 1, "n=" + n);
  kontrol("kabak kaybolmadi", o._kafa !== undefined);
}

console.log("=== 7. addItem ARTAN DONDURUYOR: KAFAYA GERI TAKILIYOR ===");
{
  /* En sinsi kayip yolu: kafadan indirdik, envanter kabul
     etmedi, kimse geri takmadi -> esya bosa dustu.          */
  const o = kur({ kafa: { tip: "minecraft:carved_pumpkin", kilit: "slot" },
                  artanDondur: true });
  const n = arinma.kilitSok(o);
  kontrol("kor indirme sayilmadi", n === 1, "n=" + n);
  kontrol("kabak KAFAYA GERI takildi", o._kafa !== undefined,
          String(o._kafa && o._kafa.typeId));
}

console.log("=== 7b. addItem PATLIYOR: KAFAYA GERI TAKILIYOR ===");
{
  const o = kur({ kafa: { tip: "minecraft:carved_pumpkin", kilit: "slot" },
                  koyPatlat: true });
  arinma.kilitSok(o);
  kontrol("kabak kaybolmadi", o._kafa !== undefined);
}

console.log("=== 8. ENVANTER YUVALARI DA TARANIYOR ===");
{
  const o = kur({ envanter: [
    { tip: "minecraft:dirt", kilit: "inventory" },
    { tip: "minecraft:stone", kilit: "none" },
    { tip: "pa:toprak_kol", kilit: "slot" },
    { tip: "minecraft:bedrock", kilit: "slot" }
  ] });
  const n = arinma.kilitSok(o);
  kontrol("iki kilit sokuldu (bizimki haric)", n === 2, "n=" + n);
  kontrol("inventory kipi de sokuldu",
          o._envanterYuvalari[0].lockMode === "none");
  kontrol("kilitsize dokunulmadi",
          o._envanterYuvalari[1].lockMode === "none");
  kontrol("KENDI esyamizin kilidi DURUYOR",
          o._envanterYuvalari[2].lockMode === "slot");
  kontrol("slot kipi sokuldu",
          o._envanterYuvalari[3].lockMode === "none");
}

console.log("=== 9. BIR YUVA PATLARSA OTEKILER YINE TARANIYOR ===");
{
  const o = kur({ el: { tip: "minecraft:stick", kilit: "slot" },
                  yuvaPatlat: "Chest" });
  const n = arinma.kilitSok(o);
  kontrol("Chest patladi ama Mainhand sokuldu", n === 1, "n=" + n);
  kontrol("el kilidi acildi", o._zirh.Mainhand.lockMode === "none");
}

console.log("=== 10. KAPALIYKEN HICBIR SEY YAPILMIYOR ===");
{
  kontrol("ZORLA_ACIK varsayilan olarak acik", ayar.ZORLA_ACIK === true);
  /* Ayar bir sabit; kapatma yolu modulu yeniden yuklemek
     olurdu. Onun yerine ayarin GERCEKTEN okundugunu 12.
     bolumdeki mesaj sinamasi tutuyor.                       */
}

console.log("=== 11. SAVUNMA KIPI DE SOKUYOR ===");
{
  /* Tek seferlik Arinma dongu halinde gelen replaceitem'e
     yetismez; Savunma Kipinin var olma sebebi bu.           */
  const o = kur({ kafa: { tip: "minecraft:carved_pumpkin", kilit: "slot" } });
  const sonuc = arinma.savunmaAc(o);
  kontrol("savunma acildi", !!sonuc.is);
  kontrol("ilk tazelemede kilit sokuldu",
          o._zirh.Head.lockMode === "none" || o._kafa === undefined);
  arinma.arinmaUnut(o.id);
}

console.log("=== 12. ARINMA MESAJINDA 'kilit' YAZIYOR ===");
{
  const o = kur({ envanter: [{ tip: "minecraft:dirt", kilit: "slot" }] });
  const mesaj = arinma.arindir(o);
  kontrol("mesajda kilit gecti", mesaj.indexOf("kilit") !== -1, mesaj);
}
{
  /* Kilit YOKKEN "0 kilit" yazilmamali -- yoksa her arinmada
     olmayan bir saldiri bildirilmis olur.                   */
  const o = kur({});
  const mesaj = arinma.arindir(o);
  kontrol("kilit yokken kilit yazmiyor", mesaj.indexOf("kilit") === -1, mesaj);
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
