import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { varlikIste } from "../butce.js";
import { hataYaz, gecerliMi, kollariIndir } from "../yardimcilar.js";
import { ALAN_ESYA, ALAN_YARICAP, ALAN_GRUP, ALAN_ARALIK, MUAF } from "../ayarlar.js";

/* Cevredeki TUM moblara tek tek simsek. */
yetenekKaydet({
  kimlik: "alan_simsegi",
  ad: "Alan Simsegi",
  esya: ALAN_ESYA,
  esyasiz: true,
  sira: 30,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;

    let hedefler;
    try {
      hedefler = boyut.getEntities({
        location: oyuncu.location,
        maxDistance: ALAN_YARICAP,
        excludeTypes: MUAF
      });
    } catch (e) {
      hataYaz("alan_simsegi.getEntities", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    if (hedefler.length === 0) {
      try {
        oyuncu.sendMessage("§eEtrafta vurulacak mob yok.");
      } catch (e) {
        hataYaz("alan_simsegi.sendMessage", e);
      }
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      oyuncu.sendMessage("§b" + hedefler.length + " hedef bulundu.");
    } catch (e) {
      hataYaz("alan_simsegi.sendMessage", e);
    }

    let i = 0;
    let sonrakiTick = system.currentTick;

    return {
      ad: "alan_simsegi",
      oyuncuId: oyuncu.id,

      calis() {
        if (system.currentTick < sonrakiTick) return false;

        const kalan = hedefler.length - i;
        const izin = varlikIste(ALAN_GRUP < kalan ? ALAN_GRUP : kalan);
        if (izin === 0) return false;

        for (let k = 0; k < izin; k++) {
          const hedef = hedefler[i++];
          try {
            // Mob arada olmus olabilir
            if (gecerliMi(hedef)) {
              boyut.spawnEntity("minecraft:lightning_bolt", hedef.location);
            }
          } catch (e) {
            hataYaz("alan_simsegi.spawnEntity", e);
          }
        }

        sonrakiTick = system.currentTick + ALAN_ARALIK;
        return i >= hedefler.length;
      },

      bitir() {
        hedefler = undefined;   // varlik referanslarini birak
        kollariIndir(oyuncu);
      }
    };
  }
});
