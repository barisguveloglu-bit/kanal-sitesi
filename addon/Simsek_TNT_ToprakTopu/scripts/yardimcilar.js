import { world, system } from "@minecraft/server";
import {
  HATA_SOHBETE, HATA_SOHBET_ARALIK, KOL_ANIMASYON, YUKSEKLIK_TABLO
} from "./ayarlar.js";

/* ============================================================
   GUNLUK
   Bos catch yok. Her hata nerede oldugu yazili olarak Content
   Log'a duser, istenirse sohbete de.
   ============================================================ */

export function sohbeteYaz(metin) {
  try {
    world.sendMessage(metin);
  } catch (e) {
    // Dunya henuz hazir degil: Content Log yeterli
  }
}

export function bilgiYaz(mesaj) {
  console.warn("[SimsekTNT] " + mesaj);
}

const sonHataTick = new Map();

export function hataYaz(nerede, e) {
  const mesaj = (e && e.message) ? e.message : String(e);
  const iz = (e && e.stack) ? "\n  " + String(e.stack).split("\n").join("\n  ") : "";
  console.warn("[SimsekTNT] HATA @ " + nerede + ": " + mesaj + iz);

  if (!HATA_SOHBETE) return;

  // Ayni hata her tick tekrarlanabilir; sohbeti bogmasin
  const simdi = system.currentTick;
  const onceki = sonHataTick.get(nerede);
  if (onceki !== undefined && simdi - onceki < HATA_SOHBET_ARALIK) return;
  sonHataTick.set(nerede, simdi);

  sohbeteYaz("§c[SimsekTNT] HATA §f" + nerede + "§7: " + mesaj);
}

/* ============================================================
   API UYUMLULUGU
   Surumler arasi farklar tek yerde toplandi.
   ============================================================ */

/* isValid bazi surumlerde property, bazilarinda metot. Metot oldugu
   surumde "if (e.isValid)" HER ZAMAN dogru doner (fonksiyon truthy),
   yani sessizce yanlis calisir. Ikisini de dogru ele alan tek gecit. */
export function gecerliMi(varlik) {
  if (!varlik) return false;
  try {
    const d = varlik.isValid;
    if (typeof d === "function") return !!varlik.isValid();
    if (typeof d === "boolean") return d;
    return true;   // isValid hic yoksa gecerli varsay
  } catch (e) {
    return false;
  }
}

// Date.now bazi calisma ortamlarinda olmayabilir
const ZAMAN_VAR = (typeof Date !== "undefined" && typeof Date.now === "function");
export function simdiMs() { return ZAMAN_VAR ? Date.now() : 0; }

/* Bir olay adi API surumunde yoksa .subscribe cagrisi script
   YUKLENIRKEN hata firlatir ve tum paket olur. Her abonelik
   buradan gecerse eksik olay sadece o ozelligi kapatir.            */
export function olayaAbone(olayAdi, isleyici) {
  try {
    const olaylar = world.afterEvents;
    const olay = olaylar ? olaylar[olayAdi] : undefined;
    if (!olay || typeof olay.subscribe !== "function") {
      bilgiYaz("UYARI: world.afterEvents." + olayAdi +
               " bu API surumunde yok. Ilgili ozellik devre disi.");
      return false;
    }
    olay.subscribe(isleyici);
    return true;
  } catch (e) {
    hataYaz("olayaAbone(" + olayAdi + ")", e);
    return false;
  }
}

/* ============================================================
   DUNYA SINIRLARI
   Sinir disina cikinca getBlock her cagrida throw ediyordu.
   Istisna firlatmak normal cagridan cok daha pahali; sinir
   artik onceden kontrol ediliyor.
   ============================================================ */

const yukseklikOnbellek = new Map();

export function yukseklikAraligi(boyut) {
  const onceki = yukseklikOnbellek.get(boyut.id);
  if (onceki) return onceki;

  let aralik = YUKSEKLIK_TABLO[boyut.id] || { min: -64, max: 319 };

  // Ozellik tespiti: heightRange bazi surumlerde yok. Buradaki catch
  // hatayi yutmak degil, API varligini sinamak.
  try {
    const r = boyut.heightRange;
    if (r && typeof r.min === "number" && typeof r.max === "number") {
      aralik = { min: r.min, max: r.max };
    }
  } catch (e) {
    bilgiYaz("heightRange okunamadi (" + boyut.id + "), tablo degeri kullaniliyor.");
  }

  yukseklikOnbellek.set(boyut.id, aralik);
  return aralik;
}

/* ============================================================
   OYUNCU YARDIMCILARI
   ============================================================ */

export function kollariKaldir(oyuncu) {
  try {
    oyuncu.runCommand("playanimation @s " + KOL_ANIMASYON + " a 999");
  } catch (e) {
    hataYaz("kollariKaldir", e);
  }
}

export function kollariIndir(oyuncu) {
  try {
    if (gecerliMi(oyuncu)) {
      oyuncu.runCommand("playanimation @s " + KOL_ANIMASYON + " a 0");
    }
  } catch (e) {
    hataYaz("kollariIndir", e);
  }
}

export function actionbarYaz(oyuncu, metin) {
  try {
    const ekran = oyuncu.onScreenDisplay;
    if (ekran && typeof ekran.setActionBar === "function") {
      ekran.setActionBar(metin);
      return;
    }
  } catch (e) {
    // Actionbar yoksa sohbete dus
  }
  try {
    oyuncu.sendMessage(metin);
  } catch (e) {
    hataYaz("actionbarYaz", e);
  }
}

/* Oyuncunun baktigi noktayi bulur. Isin bir seye carpmazsa
   bakis yonunde uzak bir nokta doner.                             */
export function hedefBul(oyuncu, menzil) {
  try {
    const vurus = oyuncu.getBlockFromViewDirection({ maxDistance: menzil });
    if (vurus && vurus.block) {
      const k = vurus.block.location;
      return { x: k.x + 0.5, y: k.y + 1, z: k.z + 0.5 };
    }
  } catch (e) {
    hataYaz("hedefBul.raycast", e);
  }

  try {
    const yon = oyuncu.getViewDirection();
    const bas = oyuncu.getHeadLocation();
    return {
      x: bas.x + yon.x * menzil,
      y: bas.y + yon.y * menzil,
      z: bas.z + yon.z * menzil
    };
  } catch (e) {
    hataYaz("hedefBul.yon", e);
    return undefined;
  }
}

/* ============================================================
   KURE GEOMETRISI
   Blok yazan yeteneklerin ortak altyapisi.
   ============================================================ */

export function kureNoktalari(r) {
  const noktalar = [];
  const t = Math.ceil(r);
  for (let x = -t; x <= t; x++) {
    for (let y = -t; y <= t; y++) {
      for (let z = -t; z <= t; z++) {
        if (x * x + y * y + z * z <= r * r + 0.5) noktalar.push({ x, y, z });
      }
    }
  }
  return noktalar;
}

// Kucuk tam sayi koordinatlarini tek sayiya paketle (-16..15 guvenli)
export function kureAnahtar(x, y, z) {
  return (x + 16) * 1024 + (y + 16) * 32 + (z + 16);
}
