import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { varlikIste, patlamaIste } from "../butce.js";
import { hedefBul, hataYaz, kollariIndir, yukseklikAraligi } from "../yardimcilar.js";
import {
  MENZIL, METEOR_SAYISI, METEOR_YAYILMA, METEOR_GUC,
  METEOR_ARALIK, METEOR_ATES
} from "../ayarlar.js";

/* Yildirim meteoru: baktigin noktaya art arda yildirim + patlama.

   Her meteor iki is yapiyor -- once yildirim duser (gorsel ve ses),
   ayni noktada patlama olur. Patlama en pahali kalem oldugu icin
   tick basina en fazla TICK_PATLAMA_BUTCESI tane isleniyor; butce
   dolarsa meteor sonraki tick'e kayiyor, kaybolmuyor.             */
yetenekKaydet({
  kimlik: "meteor",
  ad: "Yildirim Meteoru",
  esyasiz: true,
  sira: 90,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    const hedef = hedefBul(oyuncu, MENZIL);
    if (!hedef) {
      kollariIndir(oyuncu);
      return undefined;
    }

    // Her meteorun yeri onceden hesaplaniyor: her tick'te
    // Math.random cagirip nesne uretmekten daha ucuz.
    const noktalar = [];
    for (let i = 0; i < METEOR_SAYISI; i++) {
      noktalar.push({
        x: hedef.x + (Math.random() * 2 - 1) * METEOR_YAYILMA,
        y: hedef.y,
        z: hedef.z + (Math.random() * 2 - 1) * METEOR_YAYILMA
      });
    }

    let i = 0;
    let sonrakiTick = system.currentTick;

    return {
      ad: "meteor",
      oyuncuId: oyuncu.id,

      calis() {
        if (system.currentTick < sonrakiTick) return false;
        if (i >= noktalar.length) return true;

        const nokta = noktalar[i];

        // Sinir disindaysa bu meteoru atla, butce harcama
        if (nokta.y < sinir.min || nokta.y > sinir.max) {
          i++;
          return i >= noktalar.length;
        }

        // Once patlama kotasi: en pahali is o, once onu garantile
        if (patlamaIste(1) === 0) return false;

        if (varlikIste(1) > 0) {
          try {
            boyut.spawnEntity("minecraft:lightning_bolt", nokta);
          } catch (e) {
            hataYaz("meteor.spawnEntity", e);
          }
        }

        try {
          boyut.createExplosion(nokta, METEOR_GUC, {
            breaksBlocks: true, causesFire: METEOR_ATES, allowUnderwater: true
          });
        } catch (e) {
          hataYaz("meteor.createExplosion", e);
        }

        i++;
        sonrakiTick = system.currentTick + METEOR_ARALIK;
        return i >= noktalar.length;
      },

      bitir() {
        kollariIndir(oyuncu);
      }
    };
  }
});
