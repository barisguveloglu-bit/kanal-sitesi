import { system } from "@minecraft/server";
import { actionbarYaz, hataYaz } from "./yardimcilar.js";
import {
  ENERJI_ACIK, ENERJI_TAVAN, ENERJI_BASLIK,
  ENERJI_TABAN, ENERJI_ARALIK, ENERJI_EGIM, ENERJI_ORTA,
  ENERJI_ARALIK_TICK, ENERJI_ISTE_BOSTA, ENERJI_UYARI
} from "./ayarlar.js";

/* ================================================================
   ENERJI (CHI)                                            v7.97.0

   Kaynak: Avatar Addon 2.0.0, olcum REFERANS_AVATAR.md.

   Deponun ucuncu freni. Ilk ikisi:
     butce.js  -> tick basina TOPLAM is (butun oyuncular ortak)
     bekleme   -> yetenek basina siklik
   Bu ucuncusu oyuncu basina "pes etmeden kac tane" diyor.

   ---- BELLEKTE, DINAMIK OZELLIKTE DEGIL ----
   Envanter yedegindeki ve mahou manasindaki kararin aynisi:
   dunya kapaninca sifirlaniyor ve bu DOGRU -- enerji bir
   birikim degil, o oturumun nefesi. Dinamik ozelliğe yazmak
   her tick bir yazma demekti.
   ================================================================ */

/* oyuncuId -> enerji (ondalik; gosterirken yuvarlaniyor) */
const defter = new Map();
/* oyuncuId -> bir sonraki yenilenme tick'i */
const sonraki = new Map();

export function enerjiUnut(oyuncuId) {
  if (oyuncuId === undefined) { defter.clear(); sonraki.clear(); }
  else { defter.delete(oyuncuId); sonraki.delete(oyuncuId); }
}

export function enerjiOku(oyuncuId) {
  const e = defter.get(oyuncuId);
  return e === undefined ? ENERJI_BASLIK : e;
}

function yaz(oyuncuId, deger) {
  defter.set(oyuncuId, Math.max(0, Math.min(ENERJI_TAVAN, deger)));
}

/* ---- YENILENME EGRISI ----
   Kaynaktan birebir (bender.js:180):
     0.3 + 1.7 / (1 + e^(-0.05 x (enerji - 39.8)))

   Egri TERS: enerji BOSKEN ~0.3, DOLUYKEN ~2.0. Yani
   tukenmek cezali, idareli kullanmak cezasiz.               */
export function yenilenmeHizi(enerji) {
  return ENERJI_TABAN + ENERJI_ARALIK /
         (1 + Math.exp(-ENERJI_EGIM * (enerji - ENERJI_ORTA)));
}

/* Her tarama turunda cagriliyor. `mesgulMu` oyuncunun calisan
   isi olup olmadigini soyluyor -- kaynagin "bekleme sifir mi"
   kosulunun karsiligi.                                       */
export function enerjiTara(oyuncular, mesgulMu) {
  if (!ENERJI_ACIK) return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    try {
      if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
      sonraki.set(oyuncu.id, simdi + ENERJI_ARALIK_TICK);

      if (ENERJI_ISTE_BOSTA && typeof mesgulMu === "function" &&
          mesgulMu(oyuncu.id)) continue;

      const simdiki = enerjiOku(oyuncu.id);
      if (simdiki >= ENERJI_TAVAN) continue;

      /* Aralik kadar carpiliyor: daha seyrek uyguluyoruz ama
         toplam hiz kaynakla ayni kaliyor.                    */
      yaz(oyuncu.id, simdiki + yenilenmeHizi(simdiki) * ENERJI_ARALIK_TICK);
    } catch (e) {
      hataYaz("enerjiTara", e);
    }
  }
}

/* Yetenek kapisi. Doner: gecti mi.

   Bedeli OLMAYAN yetenek (enerji alani yazilmamis) her zaman
   geciyor -- 150+ eski yetenek boyle ve hicbiri etkilenmedi. */
export function enerjiIste(oyuncu, bedel, ad) {
  if (!ENERJI_ACIK) return true;
  if (!bedel) return true;

  const simdiki = enerjiOku(oyuncu.id);
  if (simdiki < bedel) {
    if (ENERJI_UYARI) {
      try {
        actionbarYaz(oyuncu, "§b⚡ §7Enerji yetmiyor §8· " +
          Math.floor(simdiki) + "/" + bedel +
          (ad ? " §8(" + ad + ")" : ""));
      } catch (e) { /* mesaj onemli degil */ }
    }
    return false;
  }
  yaz(oyuncu.id, simdiki - bedel);
  return true;
}

/* Disaridan enerji vermek (fuzyon bozulunca iade gibi). */
export function enerjiVer(oyuncuId, miktar) {
  yaz(oyuncuId, enerjiOku(oyuncuId) + miktar);
}

/* Menu ve actionbar icin okunur satir. */
export function enerjiMetni(oyuncuId) {
  const e = Math.floor(enerjiOku(oyuncuId));
  const dolu = Math.round((e / ENERJI_TAVAN) * 10);
  return "§b" + "▮".repeat(dolu) + "§8" + "▯".repeat(10 - dolu) +
         " §7" + e + "/" + ENERJI_TAVAN;
}
