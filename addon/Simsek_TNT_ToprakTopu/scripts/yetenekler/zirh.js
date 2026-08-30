import { system } from "@minecraft/server";
import {
  hataYaz, actionbarYaz, eldekiEsya, parcacikAt
} from "../yardimcilar.js";
import {
  ZIRH_ACIK, ZIRH_MODLAR, ZIRH_TARAMA, ZIRH_SURE,
  ZIRH_CEKIRDEK_ONEK, ZIRH_CAKMA, ZIRH_CAKMA_ACIK
} from "../ayarlar.js";

/* ================================================================
   MAX STEEL MOD CEKIRDEKLERI                              v4.95

   Kaynak: ionstrike (Max Steel) -- Palladium eklentisi, tamamen
   JSON. Sayilar powers/*.json'dan okundu; ceviri tablosu
   ayarlar.js:ZIRH_MODLAR icinde satir satir yazili.

   ---- BU DOSYA NE YAPIYOR ----
   Tek is: ELINDE MOD CEKIRDEGI OLAN oyuncuya o modun
   efektlerini vermek.

   ---- IKI KAPIDAN BIRE  (v4.95) ----
   v4.91'de tek yol GIYILEBILIR TAKIMDI: dort parcayi giy,
   menuden mod sec. v4.94'te CEKIRDEK geldi ve iki yol yan
   yana yasadi -- cekirdek varken takim sarti es geciliyordu,
   menu secimi de cekirdek tarafindan eziliyordu.

   Kullanici ikisini de kapatti: "menuden o modlara gerek
   kalmadi", "temel zirha ihtiyac kalmadi". Haklyidi -- iki
   kapi ayni odaya aciliyordu ve hangisinin gecerli oldugunu
   anlatmak icin her yerde bir "ama cekirdek varsa" dali
   vardi.

   ARTIK TEK KAYNAK: elindeki cekirdek. Menu secimi ve takim
   kaldirildi; bu dosyada da mod DEFTERI kalmadi. Gorunusu
   suren molang kosulu da (oyuncu modeli paketi) ayni seye
   bakiyor, yani "takim gibi gorunuyorum ama gucum yok"
   durumu artik yapisal olarak imkansiz.

   ---- NEDEN EFEKT TAZELENIYOR ----
   Kalp ve donusum sistemlerindeki dersin aynisi: efektler
   olunce, sure dolunca ve SUT ICINCE siliniyor. Kaynak
   "elinde cekirdek var mi" sorusu; efekt onun goruntusu.
   ZIRH_TARAMA'da bir yeniden veriliyor.

   ---- NEDEN IS LISTESINE GIRMIYOR ----
   Kalici bir durum, oyuncunun AYNI_ANDA (2) is yuvasindan
   birini sonsuza kadar tutamaz. Kalp defteri de ayni sebeple
   disarida.
   ================================================================ */

/* oyuncuId -> bir sonraki tazeleme tick'i */
const sonraki = new Map();

/* Testler ve dunya degisimi icin. */
export function zirhUnut() {
  sonraki.clear();
  sonCekirdek.clear();
}

export function zirhUnutOyuncu(oyuncuId) {
  sonraki.delete(oyuncuId);
  sonCekirdek.delete(oyuncuId);
}

/* ---------------- GIYILEBILIR TAKIM YOK  (v4.95) ----------------

   takimParcalari() ve takimVarMi() buradaydi: dort zirh
   yuvasini okuyup "tam takim uzerinde mi" diye bakiyorlardi.
   Takim kaldirilinca ikisi de amacsiz kaldi. Gerekcesi
   ayarlar.js'te (GIYILEBILIR TAKIM KALDIRILDI).

   Artik tek soru elindeki CEKIRDEK -- asagida.               */

/* ---------------- MOD CEKIRDEGI ----------------  (v4.94)

   Elindeki (ya da yan elindeki) cekirdek hangi mod? Cekirdek
   bir DONUSUM anahtari: gorunusu oyuncu modeli paketi
   degistiriyor, gucleri burasi veriyor.

   Cekirdek varken TAM TAKIM SARTI ARANMIYOR: donusumun kendisi
   zaten "takimi giymis olmak" demek. Zirh parcalarini da
   giyersen zirh PUANI ustune biner -- ikisi cakismiyor.       */
export function elindekiCekirdek(oyuncu) {
  const adaylar = [];
  try {
    /* eldekiEsya ESYAYI degil KIMLIGINI donduruyor. Once
       `.typeId` aliniyordu; o hep undefined'di ve bu yol
       hicbir sey katmiyordu -- asagidaki equippable yolu
       maskeliyordu. v5.0'da yakalandi (o test WoM ile
       birlikte kaldirildi, ders duruyor). */
    const kimlik = eldekiEsya(oyuncu);
    if (kimlik) adaylar.push(kimlik);
  } catch (e) { /* eli bos */ }
  try {
    const b = oyuncu.getComponent("minecraft:equippable");
    if (b && typeof b.getEquipment === "function") {
      for (const yuva of ["Mainhand", "Offhand"]) {
        try {
          const e = b.getEquipment(yuva);
          if (e) adaylar.push(e.typeId);
        } catch (e) { /* yuva okunamadi */ }
      }
    }
  } catch (e) { /* bilesen yok */ }

  for (const kimlik of adaylar) {
    if (typeof kimlik !== "string") continue;
    if (!kimlik.startsWith(ZIRH_CEKIRDEK_ONEK)) continue;
    const mod = kimlik.slice(ZIRH_CEKIRDEK_ONEK.length);
    if (ZIRH_MODLAR.has(mod)) return mod;
  }
  return undefined;
}

/* Donusum caktisi: referanstaki transform_flash'in karsiligi. */
function cakma(oyuncu) {
  if (!ZIRH_CAKMA_ACIK) return;
  try {
    const k = oyuncu.location;
    /* Uc nokta: ayak, govde, kafa -- tek nokta govdenin
       icinde kaybolup gorunmuyordu.                          */
    for (const y of [0.2, 1.0, 1.8]) {
      parcacikAt(oyuncu.dimension, ZIRH_CAKMA,
                 { x: k.x, y: k.y + y, z: k.z });
    }
  } catch (e) {
    hataYaz("zirh.cakma", e);
  }
}

/* oyuncuId -> son bilinen cekirdek (caktı icin) */
const sonCekirdek = new Map();

/* ---------------- Tarama ---------------- */
export function zirhTara(oyuncular) {
  if (!ZIRH_ACIK) return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    let cekirdek;
    try {
      cekirdek = elindekiCekirdek(oyuncu);
    } catch (e) {
      cekirdek = undefined;
    }

    /* Cekirdek degisti -> DONUSUM. Caktı ve mesaj burada.   */
    const oncekiC = sonCekirdek.get(oyuncu.id);
    if (oncekiC !== cekirdek) {
      sonCekirdek.set(oyuncu.id, cekirdek);
      if (cekirdek) {
        cakma(oyuncu);
        const t = ZIRH_MODLAR.get(cekirdek);
        try {
          actionbarYaz(oyuncu,
            "§b⚡ §fMax Steel §8· §f" + (t ? t.ad : cekirdek) + " modu");
        } catch (e) { /* mesaj onemli degil */ }
      } else if (oncekiC !== undefined) {
        cakma(oyuncu);
        try {
          actionbarYaz(oyuncu, "§7⚡ Dönüşüm çözüldü");
        } catch (e) { /* mesaj onemli degil */ }
      }
      sonraki.set(oyuncu.id, 0);
    }

    /* v4.95: TEK KAYNAK CEKIRDEK. Once "tam takim uzerinde mi"
       diye de bakiliyordu; takim kaldirildi. Cekirdek yoksa
       guc de yok -- gorunusun ne ise gucun de o.             */
    if (!cekirdek) continue;

    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + ZIRH_TARAMA);

    const t = ZIRH_MODLAR.get(cekirdek);
    if (!t) continue;
    for (const [ad, , seviye] of t.efektler) {
      try {
        oyuncu.addEffect(ad, ZIRH_SURE, {
          amplifier: seviye,
          /* Parcacik KAPALI: dokuz efekt birden acikken oyuncu
             yuruyen bir parcacik bulutuna donuyordu.          */
          showParticles: false
        });
      } catch (e) {
        /* Efekt adi bu surumde yoksa digerleri yine verilsin --
           hepsini birden dusurmek gereksiz (bot_ilkel dersi). */
      }
    }
  }
}

/* Menu icin: mod listesi, siralamasi ayarlar.js'teki sira.

   v4.95: "secili" alani KALKTI. Menu artik secim yapmiyor,
   hangi cekirdegin ne verdigini YAZIYOR. Alani birakmak
   menude yanlis bir onay isareti cizerdi.

   "elinde" alani onun yerine geldi: hangi satirin su an
   uzerinde oldugunu gosteriyor.                             */
export function modListesi(oyuncu) {
  let cekirdek;
  try {
    cekirdek = elindekiCekirdek(oyuncu);
  } catch (e) {
    cekirdek = undefined;
  }
  const liste = [];
  for (const [anahtar, t] of ZIRH_MODLAR) {
    liste.push({
      anahtar, ad: t.ad, ozet: t.ozet,
      elinde: anahtar === cekirdek,
      esya: ZIRH_CEKIRDEK_ONEK + anahtar,
      yetenek: t.yetenek
    });
  }
  return liste;
}
