import { system } from "@minecraft/server";
import {
  hataYaz, actionbarYaz, eldekiEsya, parcacikAt
} from "../yardimcilar.js";
import {
  KAHRAMAN_ACIK, KAHRAMANLAR, KAHRAMAN_ONEK,
  KAHRAMAN_TARAMA, KAHRAMAN_SURE, KAHRAMAN_CAKMA
} from "../ayarlar.js";

/* ================================================================
   FISK'S SUPERHEROES -- DOKUZ KAHRAMAN                    v4.96

   Kullanici dokuz isim verdi: The Spectre, Anti-Monitor, The
   Monitor, Martian Manhunter, Vision, Iron Man Mark 85, Shazam,
   The Tick, Harbinger. Dokuzu da modda var, dokuzu da burada.

   ---- BU DOSYA NE YAPIYOR ----
   Tek is: ELINDE KAHRAMAN ESYASI olan oyuncuya o kahramanin
   efektlerini vermek. Gorunus AYRI bir yoldan geliyor
   (attachable, kol_uret.py:kahraman_attachable) -- ikisi de
   AYNI kosula bakiyor, yani "kostum uzerimde ama gucum yok"
   durumu yapisal olarak imkansiz.

   ---- NEDEN ZIRH.JS'IN KOPYASI GIBI ----
   Cunku ayni is. Iki dosya bilerek ayri:
     - zirh.js  cekirdegi okur, oyuncunun MODELINI degistirir
     - burasi   kahramani okur, oyuncunun USTUNE cizer
   Ortak kod tek satirlik bir "elindeki X" fonksiyonu olurdu;
   birlestirmek iki sistemi birbirine baglar ve birinde
   yapilan degisiklik digerini kirardi. Ayni sebeple kalp ve
   iksir defterleri de ayri.
   ================================================================ */

/* oyuncuId -> bir sonraki tazeleme tick'i */
const sonraki = new Map();
/* oyuncuId -> son bilinen kahraman (donusum caktisi icin) */
const sonKahraman = new Map();

/* Testler ve dunya degisimi icin. */
export function kahramanUnut() {
  sonraki.clear();
  sonKahraman.clear();
}

export function kahramanUnutOyuncu(oyuncuId) {
  sonraki.delete(oyuncuId);
  sonKahraman.delete(oyuncuId);
}

/* ---------------- Elindeki kahraman ----------------

   Ana el ve yan el sinaniyor. eldekiEsya once deneniyor
   (yardimcilarin kendi yolu), sonra equippable bileseni --
   ikisi de her surumde ayni davranmayabiliyor ve KACIRMAK
   "kostum var ama guc yok" demek.                            */
export function elindekiKahraman(oyuncu) {
  const adaylar = [];
  try {
    const el = eldekiEsya(oyuncu);
    if (el) adaylar.push(el.typeId);
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
    if (!kimlik.startsWith(KAHRAMAN_ONEK)) continue;
    const anahtar = kimlik.slice(KAHRAMAN_ONEK.length);
    if (KAHRAMANLAR.has(anahtar)) return anahtar;
  }
  return undefined;
}

/* Donusum caktisi. Mod cekirdeklerindekiyle ayni bicim: uc
   nokta, cunku tek nokta govdenin icinde kaybolup gorunmuyor. */
function cakma(oyuncu) {
  try {
    const k = oyuncu.location;
    for (const y of [0.2, 1.0, 1.8]) {
      parcacikAt(oyuncu.dimension, KAHRAMAN_CAKMA,
                 { x: k.x, y: k.y + y, z: k.z });
    }
  } catch (e) {
    hataYaz("kahraman.cakma", e);
  }
}

/* ---------------- Tarama ---------------- */
export function kahramanTara(oyuncular) {
  if (!KAHRAMAN_ACIK) return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    let kahraman;
    try {
      kahraman = elindekiKahraman(oyuncu);
    } catch (e) {
      kahraman = undefined;
    }

    /* Degisti -> DONUSUM. Caktı ve mesaj burada. */
    const onceki = sonKahraman.get(oyuncu.id);
    if (onceki !== kahraman) {
      sonKahraman.set(oyuncu.id, kahraman);
      if (kahraman) {
        cakma(oyuncu);
        const t = KAHRAMANLAR.get(kahraman);
        try {
          actionbarYaz(oyuncu,
            "§b★ §f" + (t ? t.ad : kahraman) + " §8· kademe " +
            (t ? t.tier : "?"));
        } catch (e) { /* mesaj onemli degil */ }
      } else if (onceki !== undefined) {
        cakma(oyuncu);
        try {
          actionbarYaz(oyuncu, "§7★ Kostüm çıkarıldı");
        } catch (e) { /* mesaj onemli degil */ }
      }
      sonraki.set(oyuncu.id, 0);
    }

    if (!kahraman) continue;
    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + KAHRAMAN_TARAMA);

    const t = KAHRAMANLAR.get(kahraman);
    if (!t) continue;
    for (const [ad, , seviye] of t.efektler) {
      try {
        oyuncu.addEffect(ad, KAHRAMAN_SURE, {
          amplifier: seviye,
          /* Parcacik KAPALI: yedi efekt birden acikken oyuncu
             yuruyen bir parcacik bulutuna donuyor (zirh dersi). */
          showParticles: false
        });
      } catch (e) {
        /* Efekt adi bu surumde yoksa digerleri yine verilsin. */
      }
    }
  }
}

/* Menu icin: kahraman listesi, siralamasi ayarlar.js'teki sira.

   Zirh menusuyle AYNI bicim: SECIM YOK, bilgi var. Donusum
   esyayi ELINE ALMAKLA oluyor.                               */
export function kahramanListesi(oyuncu) {
  let elde;
  try {
    elde = elindekiKahraman(oyuncu);
  } catch (e) {
    elde = undefined;
  }
  const liste = [];
  for (const [anahtar, t] of KAHRAMANLAR) {
    liste.push({
      anahtar, ad: t.ad, en: t.en, tier: t.tier, ozet: t.ozet,
      elinde: anahtar === elde,
      esya: KAHRAMAN_ONEK + anahtar,
      yetenekler: t.yetenekler
    });
  }
  return liste;
}
