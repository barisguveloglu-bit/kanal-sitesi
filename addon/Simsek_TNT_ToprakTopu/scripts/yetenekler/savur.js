import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, kollariIndir, bilgiYaz } from "../yardimcilar.js";
import {
  SAVUR_MENZIL, SAVUR_ACI, SAVUR_GUC, SAVUR_YUKARI, SAVUR_OYUNCU
} from "../ayarlar.js";

/* Baktigin yondeki varliklari savurur. Blok kirmaz, sadece iter.
   Tek tick'te biter, butce harcamaz.                              */

let knockbackUyarisi = false;

// Oyunculara applyImpulse calismaz, applyKnockback gerekir. Imzasi
// surumler arasinda degisti: once yeni bicim, olmazsa eskisi denenir.
function oyuncuyuIt(oyuncu, dx, dz, yatay, dikey) {
  try {
    oyuncu.applyKnockback({ x: dx, z: dz }, dikey * yatay);
    return true;
  } catch (e) { /* eski imzayi dene */ }
  try {
    oyuncu.applyKnockback(dx, dz, yatay, dikey);
    return true;
  } catch (e) {
    if (!knockbackUyarisi) {
      knockbackUyarisi = true;
      bilgiYaz("UYARI: applyKnockback iki imzada da calismadi, " +
               "oyuncular savrulmayacak: " + (e && e.message));
    }
    return false;
  }
}

yetenekKaydet({
  kimlik: "savur",
  ad: "Baktigini Ucur",
  esyasiz: true,
  sira: 60,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const merkez = oyuncu.location;
    const yon = oyuncu.getViewDirection();

    let yakin;
    try {
      yakin = boyut.getEntities({
        location: merkez,
        maxDistance: SAVUR_MENZIL,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
      });
    } catch (e) {
      hataYaz("savur.getEntities", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    let savrulan = 0;
    for (const varlik of yakin) {
      try {
        if (varlik.id === oyuncu.id) continue;
        if (!gecerliMi(varlik)) continue;

        const oyuncuMu = varlik.typeId === "minecraft:player";
        if (oyuncuMu && !SAVUR_OYUNCU) continue;

        const k = varlik.location;
        let dx = k.x - merkez.x, dy = k.y - merkez.y, dz = k.z - merkez.z;
        const uzaklik = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (uzaklik < 0.001) continue;

        // Bakis konisi disindakileri atla
        const nokta = (dx * yon.x + dy * yon.y + dz * yon.z) / uzaklik;
        if (nokta < SAVUR_ACI) continue;

        // Itme yonu: oyuncunun BAKTIGI yon (varliga dogru degil),
        // boylece hepsi ayni tarafa savruluyor
        if (oyuncuMu) {
          oyuncuyuIt(varlik, yon.x, yon.z, SAVUR_GUC, SAVUR_YUKARI);
        } else {
          varlik.applyImpulse({
            x: yon.x * SAVUR_GUC,
            y: SAVUR_YUKARI,
            z: yon.z * SAVUR_GUC
          });
        }
        savrulan++;
      } catch (e) {
        hataYaz("savur.it", e);
      }
    }

    try {
      oyuncu.sendMessage(savrulan > 0
        ? "§b" + savrulan + " hedef savruldu."
        : "§eOnunde savrulacak bir sey yok.");
    } catch (e) {
      hataYaz("savur.sendMessage", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek, surekli is yok
  }
});
