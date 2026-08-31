import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, kollariIndir, parcacikAt, varlikKonumu
} from "../yardimcilar.js";
import {
  UCUS_SURE, UCUS_SIDDET, UCUS_YUMUSAK,
  UCUS_PARCACIK, UCUS_PARCACIK_YUKSEK
} from "../ayarlar.js";

/* Ucus. applyImpulse oyuncularda calismadigi icin levitation
   efekti kullaniliyor: stabil, ucuz ve guvenli. Bitince yavas
   dusme veriliyor ki dusup olmeyesin.                            */
yetenekKaydet({
  kimlik: "ucus",
  ad: "Ucus",
  esyasiz: true,
  sira: 70,

  olustur(oyuncu) {
    try {
      oyuncu.addEffect("levitation", UCUS_SURE, {
        amplifier: UCUS_SIDDET, showParticles: false
      });
      // Levitation bitince serbest dususe gecmeyesin diye
      oyuncu.addEffect("slow_falling", UCUS_SURE + UCUS_YUMUSAK, {
        amplifier: 0, showParticles: false
      });
      oyuncu.sendMessage("§b" + (UCUS_SURE / 20).toFixed(1) + " saniye ucus.");
    } catch (e) {
      hataYaz("ucus.addEffect", e);
    }

    /* ---- UCUS AURASI  (v6.9) ----
       Kullanicinin Code-Man listesinden:
         particle minecraft:raid_omen_ambient ~~1~
         particle minecraft:raid_omen_ambient ~~2~
       Kaynak bunu her tick calistiriyordu. `raid_omen_ambient`
       zaten SUREKLI bir yayici; tek dogurmak yetiyor ve her
       tick parcacik dogurmanin tablette bedeli var.

       Efektler yukarida zaten verildi: aura cikmasa da ucus
       calisiyor.                                             */
    if (UCUS_PARCACIK) {
      try {
        const k = varlikKonumu(oyuncu);
        for (const dy of UCUS_PARCACIK_YUKSEK) {
          parcacikAt(oyuncu.dimension, UCUS_PARCACIK,
                     { x: k.x, y: k.y + dy, z: k.z });
        }
      } catch (e) {
        /* Parcacik cikmadi: ucus yine calisiyor. */
      }
    }
    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
