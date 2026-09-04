import { world } from "@minecraft/server";
import { hataYaz } from "../yardimcilar.js";
import { MEZAR_KAYIT_ANAHTAR, MEZAR_TAVAN } from "../ayarlar.js";

/* ============================================================
   MEZAR DEFTERI  (v4.50)

   El-Harkos'un actigi mezarlar SURESIZ: kendiliginden
   acilmiyor, dismont tasi gerekiyor. Suresiz olan her sey
   KAYDEDILMEK zorunda -- yoksa dunyadan cikip girince mezar
   duruyor ama kimin oldugu, hangi bloklarin ona ait oldugu
   unutuluyor ve dunyada sokulemez bir kutu kaliyor.

   Kalip _kafes_defteri.js'ten birebir alindi (o da ayni
   sorunu cozuyor). Ikinci bir kalip icat edilmedi.

   ---- KAYIT BICIMI ----
   Tek bir JSON dizisi:
     [{ b: boyutId, m: [x,y,z], k: [[x,y,z],...], i: tutsakId }]

   k = mezari olusturan bloklarin konumlari. Acarken bunlarin
   HEPSI havaya donuyor; "yakindaki tas bloklari sil" gibi bir
   tahmin yapilmiyor, cunku oyuncunun kendi yapisini silmek
   geri alinamaz bir hata olurdu.

   i = tutsagin varlik kimligi. Varlik ID'leri dunya yeniden
   yuklenince degisebiliyor, o yuzden buna GUVENILMIYOR:
   sadece "mezar acilinca kimi serbest birakmayi denemeli"
   ipucu. Bulunamazsa mezar yine aciliyor.                     */

let defter = [];
let yuklendi = false;

function yukle() {
  if (yuklendi) return;
  yuklendi = true;
  try {
    const ham = world.getDynamicProperty(MEZAR_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    const veri = JSON.parse(ham);
    if (Array.isArray(veri)) defter = veri;
  } catch (e) {
    /* Kayit bozuksa BOS baslaniyor, paket olmuyor. v4.27'de
       kayit bicimi degisince eski dunyalar okunamaz olmustu;
       ders: okuma hatasi hicbir zaman olumcul degil.          */
    hataYaz("mezar.yukle", e);
    defter = [];
  }
}

function kaydet() {
  try {
    world.setDynamicProperty(MEZAR_KAYIT_ANAHTAR, JSON.stringify(defter));
  } catch (e) {
    hataYaz("mezar.kaydet", e);
  }
}

export function mezarEkle(boyutId, merkez, konan, tutsakId) {
  yukle();
  defter.push({
    b: boyutId,
    m: [merkez.x, merkez.y, merkez.z],
    k: konan.map((n) => [n.x, n.y, n.z]),
    i: tutsakId || ""
  });
  kaydet();
  return defter[defter.length - 1];
}

export function mezarSayisi() {
  yukle();
  return defter.length;
}

export function tavanDoldu() {
  return mezarSayisi() >= MEZAR_TAVAN;
}

/* Bu konumdaki blok bir mezara mi ait? Donen: mezar ya da
   undefined.

   Blok kimligine DEGIL kayda bakiliyor: oyuncu kendi koydugu
   bir mezar tasini kirdiginda mezar acilmasin.                */
export function mezariBul(boyutId, konum) {
  yukle();
  const x = Math.floor(konum.x), y = Math.floor(konum.y), z = Math.floor(konum.z);
  for (const m of defter) {
    if (m.b !== boyutId) continue;
    for (const n of m.k) {
      if (n[0] === x && n[1] === y && n[2] === z) return m;
    }
  }
  return undefined;
}

/* Oyuncuya en yakin mezar (mesafe siniri icinde). */
export function enYakinMezar(boyutId, konum, enFazla) {
  yukle();
  let iyi, iyiUzak = Infinity;
  for (const m of defter) {
    if (m.b !== boyutId) continue;
    const dx = m.m[0] - konum.x, dy = m.m[1] - konum.y, dz = m.m[2] - konum.z;
    const u = dx * dx + dy * dy + dz * dz;
    if (u < iyiUzak) { iyiUzak = u; iyi = m; }
  }
  if (!iyi) return undefined;
  if (enFazla !== undefined && iyiUzak > enFazla * enFazla) return undefined;
  return iyi;
}

export function mezarSil(mezar) {
  yukle();
  const i = defter.indexOf(mezar);
  if (i >= 0) {
    defter.splice(i, 1);
    kaydet();
    return true;
  }
  return false;
}

/* Testler icin: dunya yeniden yuklenmis gibi yapar. */
export function defteriUnut() {
  defter = [];
  yuklendi = false;
}
