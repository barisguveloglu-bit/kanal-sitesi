import { system } from "@minecraft/server";
import { hataYaz, bilgiYaz, olayaAbone, eldekiEsya } from "../yardimcilar.js";
import {
  WOM_DOVUS_ACIK, WOM_SERI, WOM_ANIM_ONEK, WOM_SERI_UNUTMA, WOM_ONEK
} from "../ayarlar.js";

/* ================================================================
   DOVUS ANIMASYONLARI                                      v5.0

   Kullanici: "bir tane dovus modu buldum, ek animasyonlar
   ekliyor, bunu da kullanabiliriz sanirim."

   ---- BU DOSYA NE YAPIYOR ----
   Tek is: WoM silahiyla vurdugunda o silahin SIRADAKI vurus
   animasyonunu oynatmak. Animasyonlarin kendisi kaynak
   pakette (Epic Fight/WoM'dan cevrildi; nasil oldugu
   ayarlar.js:WOM_SERI basliginda).

   ---- NEDEN SERI ----
   Modda her silahin 3-4 adimli bir vurus serisi var ve
   arka arkaya vurunca sirayla oynuyorlar. Tek animasyon
   oynatmak o modun en belirgin ozelligini atmak olurdu.
   WOM_SERI_UNUTMA kadar vurmazsan seri basa doner --
   Epic Fight'in combo penceresinin karsiligi.

   ---- NEDEN IS LISTESINE GIRMIYOR ----
   Olay tabanli: tick basina is yapmiyor, sadece vurusta
   caliisiyor. Kalp defteriyle ayni sinif.

   ---- OLAY YOKSA PAKET OLMUYOR ----
   entityHitEntity her surumde yok. olayaAbone eksik olayda
   sessizce false donuyor ve yalniz bu ozellik kapaniyor
   (bot_ilkel dersi).
   ================================================================ */

/* oyuncuId -> { silah, adim, sonTick } */
const seri = new Map();

export function womDovusUnut(oyuncuId) {
  if (oyuncuId === undefined) seri.clear();
  else seri.delete(oyuncuId);
}

/* Elindeki WoM silahi hangisi? Yoksa undefined.

   Yalniz ANA EL: vurus ana elle yapiliyor, yan eldeki silah
   vurmuyor. (Cekirdek ve kostum iki eli de sayiyor cunku
   onlar TASINIYOR, vurmuyor.)                               */
export function elindekiSilah(oyuncu) {
  let kimlik;
  try {
    /* DIKKAT: eldekiEsya ESYAYI degil KIMLIGINI donduruyor
       (yardimcilar.js: `return esya ? esya.typeId : undefined`).
       Ilk yazimda `.typeId` almistim ve fonksiyon her zaman
       undefined donuyordu -- test yakaladi.                */
    kimlik = eldekiEsya(oyuncu);
  } catch (e) {
    return undefined;
  }
  if (typeof kimlik !== "string") return undefined;
  if (!kimlik.startsWith(WOM_ONEK)) return undefined;
  const anahtar = kimlik.slice(WOM_ONEK.length);
  return WOM_SERI.has(anahtar) ? anahtar : undefined;
}

/* Siradaki adimin animasyon adi. Seri penceresi kapandiysa
   ya da silah degistiyse bastan baslar.                     */
export function siradakiAnimasyon(oyuncuId, silah, simdi) {
  const adimlar = WOM_SERI.get(silah);
  if (!adimlar || adimlar.length === 0) return undefined;
  const d = seri.get(oyuncuId);
  let adim = 0;
  if (d && d.silah === silah && (simdi - d.sonTick) <= WOM_SERI_UNUTMA) {
    adim = (d.adim + 1) % adimlar.length;
  }
  seri.set(oyuncuId, { silah, adim, sonTick: simdi });
  return WOM_ANIM_ONEK + adimlar[adim];
}

function oynat(oyuncu, ad) {
  /* Once API, olmazsa komut -- goz lazeri pozundaki yolun
     aynisi. Ikisi de yoksa sessizce geciliyor: animasyon
     gorsel, vurus onsuz da isliyor.                         */
  try {
    if (typeof oyuncu.playAnimation === "function") {
      oyuncu.playAnimation(ad);
      return;
    }
  } catch (e) {
    /* API var ama oynatamadi: komutu deneyelim */
  }
  try {
    if (typeof oyuncu.runCommand === "function") {
      oyuncu.runCommand("playanimation @s " + ad);
    }
  } catch (e) {
    /* komut da olmadi -- onemli degil */
  }
}

/* Disaridan da cagrilabilsin (test ve baska yetenekler).   */
export function dovusAnimasyonuOynat(oyuncu) {
  if (!WOM_DOVUS_ACIK) return undefined;
  const silah = elindekiSilah(oyuncu);
  if (!silah) return undefined;
  const ad = siradakiAnimasyon(oyuncu.id, silah, system.currentTick);
  if (!ad) return undefined;
  oynat(oyuncu, ad);
  return ad;
}

export function womDovusKur() {
  if (!WOM_DOVUS_ACIK) return false;
  const kuruldu = olayaAbone("entityHitEntity", (olay) => {
    try {
      const vuran = olay.damagingEntity;
      if (!vuran || vuran.typeId !== "minecraft:player") return;
      dovusAnimasyonuOynat(vuran);
    } catch (e) {
      hataYaz("wom_dovus.vurus", e);
    }
  });
  if (!kuruldu) {
    bilgiYaz("entityHitEntity yok: WoM dovus animasyonlari kapali. " +
             "Silahlar aynen calisiyor, sadece animasyon oynamiyor.");
  }
  return kuruldu;
}
