import { system } from "@minecraft/server";
import { actionbarYaz } from "../yardimcilar.js";
import {
  MARVEL_ACIK, MARVEL_ONEK, MARVEL_AYIRAC, MARVEL_TARAMA, MARVEL_SURE,
  MARVEL_YUVALAR, MARVEL_GUCLER, MARVEL_TAKMA_AD
} from "../ayarlar.js";

/* ================================================================
   MARVEL PROJECT KAHRAMANLARI                              v5.2

   Kullanici: "eski kahramanlari tamamen atiyoruz, Fisk modunu
   bos veriyoruz. Onun yerine bunu ekle, bunun tum kahramanlarini."

   Fisk'in yerine gecen dosya bu. kahraman.js SILINDI.

   ---- KAYNAK ----
   Marvel Project Addon v3.0.1, BEDROCK paketi. Kostum,
   maske ve guc esyalarinin kalibi kaynagin kendisi:
     kostum -> ayak yuvasi (gorunus + zirh)
     maske  -> kafa yuvasi (gorunus + zirh)
     guc    -> bacak yuvasi (YETENEK)

   ---- BU DOSYA NE YAPIYOR ----
   Tek is: BACAGINDA GUC ESYASI OLAN oyuncuya o kahramanin
   efektlerini vermek. Kostum ve maske yalnizca gorunus ve
   zirh puani -- onlari oyun kendisi hallediyor.

   ---- NEDEN KOSTUM DEGIL DE GUC ----
   Kaynakta da oyle: kostumu giyip gucu takmamak gecerli bir
   secim. Ucunu tek esyada birlestirmek modun dengesini
   bozardi.

   ---- KIMLIKTEN KAHRAMAN ----
   pa:mrv_<kahraman>__<anahtar>. Cift alt cizgi bilerek: hem
   kahraman adinda hem anahtarda tek alt cizgi var
   (ironman_mark50). Boylece 268 satirlik bir esleme
   tablosunu iki yerde tutmak gerekmiyor.

   ---- NEDEN IS LISTESINE GIRMIYOR ----
   Kalp defteri ve cekirdeklerdeki ders: kalici bir durum
   oyuncunun AYNI_ANDA (2) is yuvasini sonsuza kadar tutamaz.
   ================================================================ */

/* oyuncuId -> bir sonraki tazeleme tick'i */
const sonraki = new Map();
/* oyuncuId -> son bilinen guc kahramani (giyme mesaji icin) */
const sonGuc = new Map();

export function marvelUnut(oyuncuId) {
  if (oyuncuId === undefined) {
    sonraki.clear(); sonGuc.clear();
    return;
  }
  sonraki.delete(oyuncuId);
  sonGuc.delete(oyuncuId);
}

/* Kimligi coz: "pa:mrv_ironman__ironman_mark50"
   -> { kahraman: "ironman", anahtar: "ironman_mark50" }      */
export function kimligiCoz(kimlik) {
  if (typeof kimlik !== "string") return undefined;
  if (!kimlik.startsWith(MARVEL_ONEK)) return undefined;
  const govde = kimlik.slice(MARVEL_ONEK.length);
  const i = govde.indexOf(MARVEL_AYIRAC);
  if (i <= 0) return undefined;
  return {
    kahraman: govde.slice(0, i),
    anahtar: govde.slice(i + MARVEL_AYIRAC.length)
  };
}

/* Uzerindeki Marvel parcalari.

   Donen: { bas, govde, bacak, ayak } -- her biri
   {kahraman, anahtar} ya da undefined.                       */
export function takilanMarvel(oyuncu) {
  let bilesen;
  try {
    bilesen = oyuncu.getComponent("minecraft:equippable");
  } catch (e) {
    return undefined;
  }
  if (!bilesen || typeof bilesen.getEquipment !== "function") return undefined;

  const ADLAR = ["bas", "govde", "bacak", "ayak"];
  const cikti = {};
  let varMi = false;
  for (let i = 0; i < MARVEL_YUVALAR.length; i++) {
    let kimlik;
    try {
      const e = bilesen.getEquipment(MARVEL_YUVALAR[i]);
      kimlik = e ? e.typeId : undefined;
    } catch (e) {
      continue;   /* yuva okunamadi, otekiler yine baksin */
    }
    const c = kimligiCoz(kimlik);
    if (c) { cikti[ADLAR[i]] = c; varMi = true; }
  }
  return varMi ? cikti : undefined;
}

/* Guclerin kaynagi olan kahraman -- isinlarin da kapisi.

   ONCE BACAK: kaynakta guc esyasi bacak yuvasinda ve kural
   bu. Ama ON BIR kahramanin modda GUC ESYASI YOK (Iron Man,
   Doctor Strange, Falcon, Star-Lord, White Tiger, Taskmaster,
   Punisher, Winter Soldier, Ms. Marvel, Muse, Guardians);
   onlarin gucu kostumun kendisinde. Uydurma bir guc esyasi
   uretmek yerine, o kahramanlar icin AYAKTAKI kostume
   bakiliyor -- isareti ayarlar.js'te `gucKostumden`.

   Takma ad da burada cozuluyor: Kaptan Amerika'nin guc
   esyasi kaynakta `super_soldier_powers`.                   */
export function guctekiKahraman(oyuncu) {
  let u;
  try { u = takilanMarvel(oyuncu); } catch (e) { return undefined; }
  if (!u) return undefined;
  if (u.bacak) return u.bacak.kahraman;
  if (u.ayak) {
    const t = gucKumesi(u.ayak.kahraman);
    if (t && t.gucKostumden) return u.ayak.kahraman;
  }
  return undefined;
}

/* Bir kahramanin guc kumesi. Takma ad varsa ona bakiyor.     */
export function gucKumesi(kahraman) {
  if (!kahraman) return undefined;
  const t = MARVEL_GUCLER.get(kahraman);
  if (t) return t;
  const takma = MARVEL_TAKMA_AD.get(kahraman);
  return takma ? MARVEL_GUCLER.get(takma) : undefined;
}

/* ---------------- Tarama ---------------- */
export function marvelTara(oyuncular) {
  if (!MARVEL_ACIK) return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    /* v7.40: `uzerinde` burada atanip HIC OKUNMUYORDU (asagida
       yalniz `guc` kullaniliyor; ayni adli degisken 193. satirda
       BASKA bir fonksiyonda ve orada gercekten okunuyor).
       Cagri da yan etkisiz -- ikisi birden dustu.          */
    let guc;
    try { guc = guctekiKahraman(oyuncu); } catch (e) { guc = undefined; }

    /* Guc esyasi degisti -> tek satirlik bildirim. Kostum
       degisimi SESSIZ: gorunusu zaten goruyorsun, actionbar'i
       kirletmenin anlami yok (can sayaci dersi).             */
    const onceki = sonGuc.get(oyuncu.id);
    if (onceki !== guc) {
      sonGuc.set(oyuncu.id, guc);
      sonraki.set(oyuncu.id, 0);
      if (guc) {
        const t = gucKumesi(guc);
        try {
          actionbarYaz(oyuncu, "§c✶ §f" + (t ? t.ad : guc) + " §8· güçler açık");
        } catch (e) { /* mesaj onemli degil */ }
      }
    }

    if (!guc) continue;
    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + MARVEL_TARAMA);

    const t = gucKumesi(guc);
    if (!t) continue;
    for (const [ad, sure, amp] of t.efektler || []) {
      try {
        oyuncu.addEffect(ad, sure || MARVEL_SURE, {
          amplifier: amp,
          /* Parcacik KAPALI: dort efekt birden acikken oyuncu
             yuruyen bir parcacik bulutuna donuyor.           */
          showParticles: false
        });
      } catch (e) {
        /* Efekt adi bu surumde yoksa otekiler yine verilsin. */
      }
    }
  }
}

/* ---------------- Menu icin ----------------

   Kostum ve maske SAYISI kahraman basina onlarca olabiliyor
   (Iron Man 10 zirh, Kaptan Amerika 15 kostum). Menu tek tek
   esya listelemiyor -- KAHRAMAN listeliyor ve o kahramanin
   gucunu yaziyor. Esya adlari dil dosyasinda zaten var.      */
export function marvelListesi(oyuncu) {
  let uzerinde;
  try { uzerinde = takilanMarvel(oyuncu); } catch (e) { uzerinde = undefined; }
  let takiliGuc;
  try { takiliGuc = guctekiKahraman(oyuncu); } catch (e) { takiliGuc = undefined; }
  const takiliKostum = uzerinde && uzerinde.ayak
    ? uzerinde.ayak.kahraman : undefined;

  const cikti = [];
  for (const [anahtar, t] of MARVEL_GUCLER) {
    cikti.push({
      anahtar,
      ad: t.ad,
      ozet: t.ozet,
      yetenek: t.yetenek,
      isin: t.isin,
      gucTakili: takiliGuc === anahtar ||
                 MARVEL_TAKMA_AD.get(takiliGuc) === anahtar,
      kostumTakili: takiliKostum === anahtar ||
                    MARVEL_TAKMA_AD.get(takiliKostum) === anahtar
    });
  }
  return cikti;
}
