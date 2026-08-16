import { yetenekKaydet } from "./kayit.js";
import { hataYaz, kollariIndir } from "../yardimcilar.js";
import { UCUS_SURE, UCUS_SIDDET, UCUS_YUMUSAK } from "../ayarlar.js";

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
    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
