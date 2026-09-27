import { system } from "@minecraft/server";
import { hataYaz, bilgiYaz, olayaAbone, eldekiEsya } from "../yardimcilar.js";
import {
  WOM_DOVUS_ACIK, WOM_SERI, WOM_ANIM_ONEK, WOM_SERI_UNUTMA, WOM_ONEK,
  WOM_DURDUR, WOM_BITIS_GECIS
} from "../ayarlar.js";

/* ================================================================
   DOVUS ANIMASYONLARI                              v5.0 -> v7.98.0

   Tek is: WoM silahiyla vurdugunda o silahin SIRADAKI vurus
   animasyonunu oynatmak. Animasyonlarin kendisi kaynak pakette
   (kaynak_anim/wom/, cevirici arac/ef_anim_cevir.py).

   v5.8'de bu dosya silinmisti: animasyonlar oyunda bozuktu.
   Bozukluk bu dosyada DEGILDI, cevirideydi (ayarlar.js WOM
   basligi). Mantik v5.0'dakiyle ayni; tek ek birinci sahis.

   ---- NEDEN SERI ----
   Modda her silahin 3-4 adimli bir vurus serisi var ve arka
   arkaya vurunca sirayla oynuyorlar. WOM_SERI_UNUTMA kadar
   vurmazsan seri basa doner -- Epic Fight'in kombo penceresi.

   ---- NEDEN IS LISTESINE GIRMIYOR ----
   Olay tabanli: tick basina is yapmiyor, yalniz vurusta
   calisiyor.

   ---- OLAY YOKSA PAKET OLMUYOR ----
   entityHitEntity her surumde yok. olayaAbone eksik olayda
   sessizce false donuyor ve yalniz bu ozellik kapaniyor.
   ================================================================ */

/* oyuncuId -> { silah, adim, sonTick } */
const seri = new Map();

export function womDovusUnut(oyuncuId) {
  if (oyuncuId === undefined) seri.clear();
  else seri.delete(oyuncuId);
}

/* Elindeki WoM silahi hangisi? Yoksa undefined. Yalniz ANA EL:
   vurus ana elle yapiliyor.

   DIKKAT: eldekiEsya ESYAYI degil KIMLIGINI donduruyor. v5.0'da
   `.typeId` alinmisti ve fonksiyon hep undefined donuyordu.     */
export function elindekiSilah(oyuncu) {
  let kimlik;
  try {
    kimlik = eldekiEsya(oyuncu);
  } catch (e) {
    return undefined;
  }
  if (typeof kimlik !== "string" || !kimlik.startsWith(WOM_ONEK)) return undefined;
  const anahtar = kimlik.slice(WOM_ONEK.length);
  return WOM_SERI.has(anahtar) ? anahtar : undefined;
}

/* Siradaki adimin animasyon adi. Seri penceresi kapandiysa ya da
   silah degistiyse bastan baslar.                                */
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
  /* Once API, olmazsa komut. Ikisinde de AYNI durdurma ifadesi:
     birinci sahista animasyon hic oynamiyor (ayarlar.js
     WOM_DURDUR). Komutun sirasi: <varlik> <animasyon>
     [sonraki_durum] [cikis_suresi] [durdurma_ifadesi].        */
  try {
    if (typeof oyuncu.playAnimation === "function") {
      oyuncu.playAnimation(ad, {
        blendOutTime: WOM_BITIS_GECIS,
        stopExpression: WOM_DURDUR
      });
      return "api";
    }
  } catch (e) {
    /* API var ama oynatamadi: komutu deneyelim */
  }
  try {
    if (typeof oyuncu.runCommand === "function") {
      oyuncu.runCommand("playanimation @s " + ad + " default " +
                        WOM_BITIS_GECIS + " \"" + WOM_DURDUR + "\"");
      return "komut";
    }
  } catch (e) {
    /* komut da olmadi -- animasyon gorsel, vurus onsuz da isliyor */
  }
  return undefined;
}

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
