import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, actionbarYaz, baslikYaz,
  varlikKonumu, parcacikHalkasi
} from "../yardimcilar.js";
import {
  FUZYON_ACIK, FUZYON_MESAFE, FUZYON_PENCERE, FUZYON_SURE,
  FUZYON_KOPMA, FUZYON_BEDEL, FUZYON_EFEKTLER, FUZYON_TAZELEME,
  FUZYON_PARCACIK, FUZYON_SES, FUZYON_BOZULMA_SES
} from "../ayarlar.js";
import { enerjiIste, enerjiVer } from "../enerji.js";

/* ================================================================
   FUZYON                                                   v7.97.0

   Kaynak: Dragon Block C Ultimate V1.1.0, olcum REFERANS_DBC.md.
   Kaynakta ic ice bir fonksiyon agaci:
     fusion_start -> acontesa_fusao -> fusao_segura -> fusion_end

   ---- BEDROCK IKI OYUNCUYU BIRLESTIREMEZ ----
   Oyuncu varligi silinemiyor, baskasina bindirilemiyor.
   Kaynak da bunu yapmiyor: etiket ve skorla "birlesmis sayiyor"
   ve iki oyuncuya da ayni gucu veriyor. Bizdeki de oyle.

   ---- UC ADIM ----
   1. DAVET   ilk oyuncu tetikler, pencere acilir
   2. KABUL   ikinci oyuncu FUZYON_MESAFE icinde tetiklerse
              fuzyon baslar, ikisinden de bedel alinir
   3. TUTMA   sure boyunca efektler tazelenir; FUZYON_KOPMA'yi
              asarlarsa BOZULUR (kaynagin "fusao_segura" adimi)

   ---- NEDEN ULTIMATE'TEN ZAYIF ----
   Efekt tablosu Ultimate Form'un bir kademe altinda tutuldu.
   Ultimate tek kisinin EN YUKSEK hali; iki kisinin birlesmesi
   ondan guclu olsaydi Ultimate anlamsizlasirdi. Kaynagin kendi
   sayilari (NPC'leri 4000 can) bizim olcegimizin on kati,
   oldugu gibi ALINMADI -- gerekce ayarlar.js'te yazili.
   ================================================================ */

/* Bekleyen davet: davetciId -> {tick, konum} */
const davetler = new Map();
/* Etkin fuzyon: oyuncuId -> {esId, bitis, sonrakiTazeleme} */
const etkin = new Map();

export function fuzyonUnut(oyuncuId) {
  if (oyuncuId === undefined) { davetler.clear(); etkin.clear(); return; }
  davetler.delete(oyuncuId);
  const f = etkin.get(oyuncuId);
  if (f) etkin.delete(f.esId);
  etkin.delete(oyuncuId);
}

export function fuzyondaMi(oyuncuId) { return etkin.has(oyuncuId); }

function uzaklik(a, b) {
  const p = varlikKonumu(a), q = varlikKonumu(b);
  const dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function efektVer(oyuncu) {
  for (const [ad, seviye] of FUZYON_EFEKTLER) {
    try {
      oyuncu.addEffect(ad, FUZYON_TAZELEME + 20, {
        amplifier: seviye, showParticles: false
      });
    } catch (e) {
      /* Efekt adi bu surumde yoksa digerleri yine gitsin. */
    }
  }
}

function sahne(oyuncu, ses) {
  try {
    parcacikHalkasi(oyuncu.dimension, FUZYON_PARCACIK,
                    varlikKonumu(oyuncu), 16, 1.6);
  } catch (e) { /* cizim sus */ }
  try {
    oyuncu.dimension.playSound(ses, varlikKonumu(oyuncu));
  } catch (e) { /* playSound yoksa is yine oldu */ }
}

/* Yakindaki, fuzyonda olmayan, davet bekleyen baska oyuncu. */
function davetciBul(oyuncu) {
  const simdi = system.currentTick;
  let yakin, liste = [];
  /* ---- getEntities, getPlayers DEGIL ----
     `getPlayers` her surumde yok; deponun kendi kodu da onu
     korumali cagiriyor (efsane_korku.js:232). getEntities
     her yerde var ve ayni suzgeci (location + maxDistance)
     zaten destekliyor. Ilk yazista getPlayers kullanilmisti
     ve test dustu: sahte dunyada yok.                      */
  try {
    liste = oyuncu.dimension.getEntities({
      location: varlikKonumu(oyuncu), maxDistance: FUZYON_MESAFE
    });
  } catch (e) {
    hataYaz("fuzyon.getEntities", e);
    return undefined;
  }
  for (const aday of liste) {
    if (!aday || aday.typeId !== "minecraft:player") continue;
    if (aday.id === oyuncu.id) continue;
    if (etkin.has(aday.id)) continue;
    const d = davetler.get(aday.id);
    if (!d) continue;
    if (simdi - d.tick > FUZYON_PENCERE) { davetler.delete(aday.id); continue; }
    yakin = aday;
    break;
  }
  return yakin;
}

yetenekKaydet({
  kimlik: "fuzyon",
  ad: "Füzyon",
  esyasiz: true,
  sira: 660,
  /* Enerji kapisi: cagiran taraftan burada alinmiyor, cunku
     DAVET bedava olmali -- bedel ancak fuzyon GERCEKTEN
     baslarsa aliniyor, ikisinden birden. Yoksa davet eden
     kisi bosuna odeme yapardi.                              */

  olustur(oyuncu) {
    if (!FUZYON_ACIK) return undefined;

    /* ---- ZATEN FUZYONDA: AYIR ---- */
    const varOlan = etkin.get(oyuncu.id);
    if (varOlan) {
      const esId = varOlan.esId;
      etkin.delete(oyuncu.id);
      etkin.delete(esId);
      try { actionbarYaz(oyuncu, "§7⚯ Füzyon sonlandırıldı"); }
      catch (e) { /* onemsiz */ }
      sahne(oyuncu, FUZYON_BOZULMA_SES);
      return undefined;
    }

    /* ---- KABUL: yakinda davet bekleyen var mi ---- */
    const davetci = davetciBul(oyuncu);
    if (davetci) {
      davetler.delete(davetci.id);

      /* Bedel IKISINDEN de aliniyor. Biri odeyemezse fuzyon
         olmuyor ve odeyen taraf geri aliyor -- yarim odeme
         birakmak "esyasi kayboldu" sinifinda bir hata olurdu. */
      if (!enerjiIste(oyuncu, FUZYON_BEDEL, "Füzyon")) return undefined;
      if (!enerjiIste(davetci, FUZYON_BEDEL, "Füzyon")) {
        enerjiVer(oyuncu.id, FUZYON_BEDEL);
        try { actionbarYaz(oyuncu, "§c⚯ Eşinin enerjisi yetmiyor"); }
        catch (e) { /* onemsiz */ }
        return undefined;
      }

      const bitis = system.currentTick + FUZYON_SURE;
      etkin.set(oyuncu.id,  { esId: davetci.id, bitis });
      etkin.set(davetci.id, { esId: oyuncu.id,  bitis });

      for (const k of [oyuncu, davetci]) {
        efektVer(k);
        sahne(k, FUZYON_SES);
        try {
          baslikYaz(k, "§d⚯ FÜZYON", "§7" +
            Math.round(FUZYON_SURE / 20) + " saniye");
        } catch (e) { /* onemsiz */ }
      }

      let sonrakiTazeleme = system.currentTick + FUZYON_TAZELEME;

      return {
        ad: "fuzyon",
        oyuncuId: oyuncu.id,

        calis() {
          const simdi = system.currentTick;
          const a = etkin.get(oyuncu.id);
          /* Oburu ayirdiysa is de bitsin. */
          if (!a || a.esId !== davetci.id) return true;

          if (!gecerliMi(oyuncu) || !gecerliMi(davetci)) {
            etkin.delete(oyuncu.id); etkin.delete(davetci.id);
            return true;
          }

          if (simdi >= bitis) {
            etkin.delete(oyuncu.id); etkin.delete(davetci.id);
            for (const k of [oyuncu, davetci]) {
              try { actionbarYaz(k, "§7⚯ Füzyon sona erdi"); }
              catch (e) { /* onemsiz */ }
              sahne(k, FUZYON_BOZULMA_SES);
            }
            return true;
          }

          /* ---- TUTMA: ayrilirlarsa BOZULUR ----
             Kaynaktaki "fusao_segura" adiminin karsiligi. */
          let d;
          try { d = uzaklik(oyuncu, davetci); }
          catch (e) { d = 0; }
          if (d > FUZYON_KOPMA) {
            etkin.delete(oyuncu.id); etkin.delete(davetci.id);
            for (const k of [oyuncu, davetci]) {
              try {
                actionbarYaz(k, "§c⚯ Füzyon koptu §8· " +
                  Math.round(d) + " blok ayrıldınız");
              } catch (e) { /* onemsiz */ }
              sahne(k, FUZYON_BOZULMA_SES);
            }
            return true;
          }

          if (simdi >= sonrakiTazeleme) {
            sonrakiTazeleme = simdi + FUZYON_TAZELEME;
            efektVer(oyuncu);
            efektVer(davetci);
          }
          return false;
        }
      };
    }

    /* ---- DAVET ---- */
    davetler.set(oyuncu.id, { tick: system.currentTick });
    try {
      actionbarYaz(oyuncu, "§d⚯ §fFüzyon daveti §8· eşin " +
        FUZYON_MESAFE + " blok içinde bassın");
    } catch (e) { /* onemsiz */ }
    sahne(oyuncu, FUZYON_SES);
    return undefined;
  }
});
