import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  gecerliMi, parcacikHalkasi, actionbarYaz, koniHedefleri
} from "../yardimcilar.js";
import { varlikIste } from "../butce.js";
import { ruhCarpani, ruhOku, ruhYaz } from "./ruh.js";
import {
  SIMBIYOT_ACIK, SIMBIYOT_SIRA, SIMBIYOT_SURE, SIMBIYOT_BEDEL,
  SIMBIYOT_DIRENC, SIMBIYOT_ETKILER, SIMBIYOT_SUSLAR,
  SIMBIYOT_KADEMELER, SIMBIYOT_EN_GUCLU_SUS, SIMBIYOT_EN_GUCLU_KADEME,
  SIMBIYOT_VURUS_ADIM, SIMBIYOT_VURUS_MENZIL, SIMBIYOT_VURUS_HASAR,
  SIMBIYOT_VURUS_TAVAN, SIMBIYOT_ROYAL_CARPAN
} from "../ayarlar.js";

/* SIMBIYOT · APEX FORM.

   Kaynak: symbiote 1.1.2 sinif sabit havuzlari OKUNARAK
   cikarildi; jar calistirilmadi.

   ---- KULLANICININ ISTEDIGI SEY ----
   "Ben 10 donusumlerinin oldugu yere ekle, bir de butona
   bastigim zaman EN GUCLUSUNU versin."

   Bu yuzden burada SECIM YOK: tek bir yetenek var ve o da
   dogrudan en guclusunu veriyor -- ROYAL susu, DOMINANT
   kademesi, Apex Form. Bes sus ve bes kademe ayarlar.js'te
   duruyor ama secilebilir degil; hangisinin en ustte oldugu
   oradan OKUNUYOR, burada elle yazilmiyor.

   ---- NEDEN BEN 10 GIBI ESYA DEGIL ----
   Ben 10 donusumleri esyayi ELINE ALMAKLA oluyor, cunku
   gorunusu suren molang sorgusu (get_equipped_item_name)
   yalniz eli okuyabiliyor. Simbiyotun BEDROCK'ta bir modeli
   yok; yeni bir yaratik modeli uydurmak "sahte icerik yasak"
   kuralina girer. O yuzden bu bir GUC formu: menuden ve
   jestten aciliyor, sureli, cikisi var.                    */

/* En guclu sus/kademe LISTEDEN okunuyor. Elle "royal"
   yazsaydik listeye yeni bir sus eklenince burasi geride
   kalirdi.                                                 */
export function enGucluSus() {
  const s = SIMBIYOT_SUSLAR[SIMBIYOT_SUSLAR.length - 1];
  return s ? s : { kimlik: SIMBIYOT_EN_GUCLU_SUS, ad: "Royal" };
}
export function enGucluKademe() {
  return SIMBIYOT_KADEMELER[SIMBIYOT_KADEMELER.length - 1] ||
         SIMBIYOT_EN_GUCLU_KADEME;
}

const acikta = new Map();
export function simbiyotUnut(id) {
  if (id === undefined) acikta.clear(); else acikta.delete(id);
}

export function simbiyotAcikMi(oyuncuId) { return acikta.has(oyuncuId); }

/* Menuden de jestten de AYNI fonksiyon cagriliyor: iki ayri
   giris iki ayri davranisa donusmesin.                     */
export function simbiyotBaslat(oyuncu) {
  if (!SIMBIYOT_ACIK || !gecerliMi(oyuncu)) return undefined;

  /* Acikken tekrar cagrilirsa KAPANIYOR (reishi kalibi). */
  const varOlan = acikta.get(oyuncu.id);
  if (varOlan) { varOlan.kapat = true; return undefined; }

  if (ruhOku(oyuncu) < SIMBIYOT_BEDEL) {
    try { actionbarYaz(oyuncu, "§8🕷 §cSimbiyot aç değil… enerji yetmiyor"); }
    catch (e) { /* onemsiz */ }
    return undefined;
  }
  ruhYaz(oyuncu, ruhOku(oyuncu) - SIMBIYOT_BEDEL);

  const durum = { kapat: false };
  acikta.set(oyuncu.id, durum);
  const sus = enGucluSus();
  /* Royal carpani X ruh carpani: tek kapi. */
  const g = SIMBIYOT_ROYAL_CARPAN * ruhCarpani(oyuncu);
  const bitis = system.currentTick + SIMBIYOT_SURE;
  let sonraki = 0;

  try {
    /* Carapace.DAMAGE_REDUCTION 0.65 -> Direnc III. */
    oyuncu.addEffect("resistance", SIMBIYOT_SURE, { amplifier: SIMBIYOT_DIRENC });
    for (const [ad, sev] of SIMBIYOT_ETKILER) {
      oyuncu.addEffect(ad, SIMBIYOT_SURE, { amplifier: sev });
    }
    actionbarYaz(oyuncu, "§8🕷 §fApex §7· " + sus.ad + " / " +
                 enGucluKademe() + " §8·×" + g.toFixed(1));
  } catch (e) { /* onemsiz */ }

  return {
    ad: "simbiyot", oyuncuId: oyuncu.id,
    calis() {
      if (durum.kapat) return true;
      if (!gecerliMi(oyuncu)) return true;
      if (system.currentTick >= bitis) return true;
      if (system.currentTick < sonraki) return false;
      sonraki = system.currentTick + SIMBIYOT_VURUS_ADIM;

      /* FRENZY: kaynakta Apex acikken kendiliginden vuruyor.
         STRIKE_INTERVAL 8 · RANGE 6.0 · DAMAGE 7.0 -- ucu de
         sinif sabiti olarak okundu.                         */
      let hedefler;
      try {
        hedefler = koniHedefleri(oyuncu, {
          menzil: SIMBIYOT_VURUS_MENZIL, aci: -1,
          tavan: SIMBIYOT_VURUS_TAVAN, oyuncuDahil: true
        });
      } catch (e) { return false; }
      for (const v of hedefler) {
        try {
          if (!varlikIste(1)) break;
          v.applyDamage(SIMBIYOT_VURUS_HASAR * g,
                        { cause: "entityAttack", damagingEntity: oyuncu });
        } catch (e) { /* varlik kayboldu */ }
      }
      try {
        parcacikHalkasi(oyuncu.dimension, "minecraft:sonic_explosion",
                        oyuncu.location, 10, 2);
      } catch (e) { /* onemsiz */ }
      return false;
    },
    bitir() {
      acikta.delete(oyuncu.id);
      try { actionbarYaz(oyuncu, "§8🕷 §7Simbiyot geri çekildi"); }
      catch (e) { /* onemsiz */ }
    }
  };
}

yetenekKaydet({
  kimlik: "simbiyot", ad: "Simbiyot · Apex",
  esyasiz: true, sira: SIMBIYOT_SIRA,
  olustur(oyuncu) { return simbiyotBaslat(oyuncu); }
});
