import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import { hataYaz, gecerliMi, kollariIndir, yukseklikAraligi } from "../yardimcilar.js";
import {
  TUCUS_SURE, TUCUS_SIDDET, TUCUS_YUMUSAK, TUCUS_ARALIK,
  TUCUS_TAVAN, TUCUS_BLOK
} from "../ayarlar.js";

/* TOPRAK YUKSELISI -- Toprak Kol'un kendi ucusu.

   Normal "Ucus" yetenegi duz levitation: havada asili kalirsin,
   geride bir sey kalmaz. Bu farkli: yukselirken ALTINDA toprak
   sutunu oruluyor, yani gercekten topraktan bir kule cikariyorsun.
   Ucus bitince kule duruyor -- ustunde durabilirsin, asagi
   inebilirsin, bir sey insa edebilirsin.

   Levitation'a neden hala ihtiyac var: applyImpulse oyunculara
   islemiyor, oyuncuyu yukari tasimanin kararli tek yolu bu.
   Toprak sutunu itmiyor, sadece arkandan geliyor.

   Blok butcesine uyuyor. Butce doluysa o tick sutun buyumez ama
   ucus devam eder -- yani sutunda bosluk olabilir, is durmaz.   */
yetenekKaydet({
  kimlik: "toprak_ucus",
  ad: "Toprak Yukselisi",
  esyasiz: true,
  sira: 130,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    try {
      oyuncu.addEffect("levitation", TUCUS_SURE, {
        amplifier: TUCUS_SIDDET, showParticles: false
      });
      // Levitation bitince serbest dususe gecmeyesin diye
      oyuncu.addEffect("slow_falling", TUCUS_SURE + TUCUS_YUMUSAK, {
        amplifier: 0, showParticles: false
      });
    } catch (e) {
      hataYaz("toprak_ucus.addEffect", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    const bitisTick = system.currentTick + TUCUS_SURE;
    let sonrakiTick = system.currentTick;
    let konan = 0;

    // Ayni yere iki kez yazmaya calisilmasin (oyuncu duruyorsa
    // her aralikta ayni blok gelir)
    let sonY = null;

    const koord = { x: 0, y: 0, z: 0 };

    return {
      ad: "toprak_ucus",
      oyuncuId: oyuncu.id,

      calis() {
        if (system.currentTick >= bitisTick) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick < sonrakiTick) return false;
        if (konan >= TUCUS_TAVAN) return false;   // ucus devam, sutun durur

        let yer;
        try {
          yer = oyuncu.location;
        } catch (e) {
          hataYaz("toprak_ucus.location", e);
          return true;
        }

        // Ayagimizin bir alti
        koord.x = Math.floor(yer.x);
        koord.y = Math.floor(yer.y) - 1;
        koord.z = Math.floor(yer.z);

        if (koord.y < sinir.min || koord.y > sinir.max) {
          sonrakiTick = system.currentTick + TUCUS_ARALIK;
          return false;
        }
        if (sonY === koord.y) {                   // henuz yukselmedik
          sonrakiTick = system.currentTick + TUCUS_ARALIK;
          return false;
        }

        if (blokIste(2) < 2) return false;        // butce dolu, sonraki tick

        try {
          const blok = boyut.getBlock(koord);
          // Sadece havanin yerine: altindaki zemini ya da birinin
          // yapisini yok etmiyoruz.
          if (blok && blok.isAir) {
            blok.setType(TUCUS_BLOK);
            konan++;
          }
        } catch (e) {
          hataYaz("toprak_ucus.setType", e);
        }

        sonY = koord.y;
        sonrakiTick = system.currentTick + TUCUS_ARALIK;
        return false;
      },

      bitir() {
        try {
          oyuncu.sendMessage(
            "§6Toprak yukselisi bitti §7· " + konan + " blokluk sutun" +
            (konan >= TUCUS_TAVAN ? " §8(tavan)" : "")
          );
        } catch (e) {
          hataYaz("toprak_ucus.sendMessage", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
