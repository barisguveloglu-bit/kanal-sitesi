import {
  TICK_BLOK_BUTCESI, TICK_VARLIK_BUTCESI, TICK_PATLAMA_BUTCESI,
  OLCUM_ACIK, OLCUM_SOHBETE
} from "./ayarlar.js";
import { bilgiYaz, sohbeteYaz, simdiMs } from "./yardimcilar.js";

/* ============================================================
   TICK BUTCESI
   Yetenekler is yapmadan once buradan kota ister. Butce TUM
   oyuncular arasinda paylasilir, oyuncu basina degil. Kac kisi
   ayni anda ates ederse etsin tick basina toplam is sabit kalir.
   ============================================================ */

let blokButcesi = 0;
let varlikButcesi = 0;
let patlamaButcesi = 0;

export function butceSifirla() {
  blokButcesi = TICK_BLOK_BUTCESI;
  varlikButcesi = TICK_VARLIK_BUTCESI;
  patlamaButcesi = TICK_PATLAMA_BUTCESI;
}

/* Istenen miktardan butcenin izin verdigi kadarini dondurur.
   Kalani cagiran tarafin sonraki tick'e devretmesi gerekir.     */
export function blokIste(adet) {
  const verilen = adet < blokButcesi ? adet : blokButcesi;
  blokButcesi -= verilen;
  if (OLCUM_ACIK) olcum.blokIslemi += verilen;
  return verilen;
}

export function varlikIste(adet) {
  const verilen = adet < varlikButcesi ? adet : varlikButcesi;
  varlikButcesi -= verilen;
  if (OLCUM_ACIK) olcum.varlikDogumu += verilen;
  return verilen;
}

/* Patlama en pahali is; ayri ve dusuk tavani var. */
export function patlamaIste(adet) {
  const verilen = adet < patlamaButcesi ? adet : patlamaButcesi;
  patlamaButcesi -= verilen;
  if (OLCUM_ACIK) olcum.patlama += verilen;
  return verilen;
}

export function butceDoldu() {
  return blokButcesi === 0 || varlikButcesi === 0 || patlamaButcesi === 0;
}

/* ============================================================
   OLCUM HARNESS'I
   Tableti test edemedigimiz icin gercek ms maliyetini oyundan
   toplayip raporluyoruz.
   ============================================================ */

const olcum = {
  tickSayisi: 0, toplamMs: 0, maksMs: 0,
  blokIslemi: 0, varlikDogumu: 0, patlama: 0, ertelenenTick: 0
};

let olcumBaslangic = 0;

export function olcumSifirla() {
  olcum.tickSayisi = 0;
  olcum.toplamMs = 0;
  olcum.maksMs = 0;
  olcum.blokIslemi = 0;
  olcum.varlikDogumu = 0;
  olcum.patlama = 0;
  olcum.ertelenenTick = 0;
}

export function olcumTickBasla() {
  if (OLCUM_ACIK) olcumBaslangic = simdiMs();
}

export function olcumTickBitir() {
  if (!OLCUM_ACIK) return;
  const gecen = simdiMs() - olcumBaslangic;
  olcum.tickSayisi++;
  olcum.toplamMs += gecen;
  if (gecen > olcum.maksMs) olcum.maksMs = gecen;
  if (butceDoldu()) olcum.ertelenenTick++;
}

export function olcumRaporla() {
  if (!OLCUM_ACIK || olcum.tickSayisi === 0) return;
  const ort = olcum.toplamMs / olcum.tickSayisi;
  const blokTick = olcum.blokIslemi / olcum.tickSayisi;

  bilgiYaz(
    "OLCUM | tick: " + olcum.tickSayisi +
    " | ort: " + ort.toFixed(2) + "ms" +
    " | maks: " + olcum.maksMs.toFixed(2) + "ms" +
    " | toplam: " + olcum.toplamMs.toFixed(1) + "ms" +
    " | blok: " + olcum.blokIslemi + " (" + blokTick.toFixed(1) + "/tick)" +
    " | varlik: " + olcum.varlikDogumu + " | patlama: " + olcum.patlama +
    " | butce dolan tick: " + olcum.ertelenenTick
  );

  if (!OLCUM_SOHBETE) return;

  // "maks" en onemli sutun: tek bir tick'in en kotu suresi
  const renk = olcum.maksMs >= 5 ? "§c" : (olcum.maksMs >= 2 ? "§e" : "§a");
  sohbeteYaz(
    "§6[OLCUM] §fmaks " + renk + olcum.maksMs.toFixed(1) + "ms" +
    " §fort §b" + ort.toFixed(2) + "ms" +
    " §ftoplam §b" + olcum.toplamMs.toFixed(0) + "ms"
  );
  sohbeteYaz(
    "§7        blok " + olcum.blokIslemi + " (" + blokTick.toFixed(1) + "/tick)" +
    " · varlik " + olcum.varlikDogumu + " · patlama " + olcum.patlama +
    " · tick " + olcum.tickSayisi +
    " · butce dolan " + olcum.ertelenenTick
  );
}
