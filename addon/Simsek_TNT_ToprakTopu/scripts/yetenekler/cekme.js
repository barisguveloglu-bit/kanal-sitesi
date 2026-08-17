import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, koniHedefleri, parcacikAt
} from "../yardimcilar.js";
import {
  CEKME_MENZIL, CEKME_ACI, CEKME_GUC, CEKME_YUKARI, CEKME_TAVAN,
  CEKME_OYUNCU, PARCACIK_TOPRAK
} from "../ayarlar.js";

/* CEKME -- baktiklarini kendine ceker. SAVUR'un tersi.

   Referans ("Bobby whip") bunu ISINLAMAYLA yapiyordu:
     execute @s^^^2 /tp @e[r=2,c=1] @s
     execute @s^^^4 /tp @e[r=4,c=1] @s
     execute @s^^^5 /tp @e[r=6,c=1] @s
   Uc sorun:
     1. Nokta tariyor; aradakiler kurtuluyor. (Ucuncu satirda
        mesafe 5 ama yaricap 6 -- kendi desenine bile uymuyor.)
     2. Isinlama hedefi tam ustune yapistiriyor; duvar dibindeysen
        icine sokabiliyor.
     3. c=1 yuzunden her mesafede sadece bir hedef.

   Bizimki koninin tamamini tariyor ve isinlamak yerine ITIYOR --
   fizigi oyuna birakinca hedef duvarin icine girmiyor.          */

let knockbackUyarisi = false;

// Oyunculara applyImpulse islemiyor, applyKnockback gerekiyor
function oyuncuyuCek(hedef, dx, dz, yatay, dikey) {
  try {
    hedef.applyKnockback({ x: dx, z: dz }, dikey * yatay);
    return true;
  } catch (e) { /* eski imzayi dene */ }
  try {
    hedef.applyKnockback(dx, dz, yatay, dikey);
    return true;
  } catch (e) {
    if (!knockbackUyarisi) {
      knockbackUyarisi = true;
      hataYaz("cekme.applyKnockback", e);
    }
    return false;
  }
}

yetenekKaydet({
  kimlik: "cekme",
  ad: "Cekme",
  esyasiz: true,
  sira: 200,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    let merkez;
    try {
      merkez = oyuncu.location;
    } catch (e) {
      hataYaz("cekme.location", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    const hedefler = koniHedefleri(oyuncu, {
      menzil: CEKME_MENZIL,
      aci: CEKME_ACI,
      tavan: CEKME_TAVAN,
      oyuncuDahil: CEKME_OYUNCU
    });

    let cekilen = 0;
    for (const hedef of hedefler) {
      try {
        if (!gecerliMi(hedef)) continue;

        const k = hedef.location;
        // Hedeften BIZE dogru yon (savurmanin tersi)
        let dx = merkez.x - k.x, dz = merkez.z - k.z;
        const uzunluk = Math.hypot(dx, dz);
        if (uzunluk < 0.001) continue;
        dx /= uzunluk;
        dz /= uzunluk;

        if (hedef.typeId === "minecraft:player") {
          oyuncuyuCek(hedef, dx, dz, CEKME_GUC, CEKME_YUKARI);
        } else {
          hedef.applyImpulse({
            x: dx * CEKME_GUC,
            y: CEKME_YUKARI,
            z: dz * CEKME_GUC
          });
        }
        parcacikAt(boyut, PARCACIK_TOPRAK, k);
        cekilen++;
      } catch (e) {
        hataYaz("cekme.it", e);
      }
    }

    try {
      oyuncu.sendMessage(cekilen > 0
        ? "§e" + cekilen + " hedef sana cekildi."
        : "§eOnunde cekecek bir sey yok.");
    } catch (e) {
      hataYaz("cekme.sendMessage", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
