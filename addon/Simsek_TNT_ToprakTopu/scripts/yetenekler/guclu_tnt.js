import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { varlikIste, patlamaIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, yukseklikAraligi, parcacikAt, ekraniSars
} from "../yardimcilar.js";
import {
  GTNT_HIZ, GTNT_FITIL, GTNT_GUC, GTNT_ATES,
  PARCACIK_PATLAMA, SARSINTI_PATLAMA, SARSINTI_SURE
} from "../ayarlar.js";

/* Baktigin yone guclu TNT firlatir.

   Vanilla TNT'nin patlama gucu motor tarafinda SABIT (4) ve script
   ile degistirilemez. Bu yuzden: TNT varligi firlatiliyor, fitil
   dolunca varlik ELLE kaldiriliyor ve yerine kendi patlamamiz
   cagriliyor. Boylece gorunum vanilla TNT, guc bizim.             */
yetenekKaydet({
  kimlik: "guclu_tnt",
  ad: "Guclu TNT",
  esyasiz: true,
  sira: 80,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    let yon, bas;
    try {
      yon = oyuncu.getViewDirection();
      bas = oyuncu.getHeadLocation();
    } catch (e) {
      hataYaz("guclu_tnt.baslangic", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    // Kendi ayagimizin dibinde patlamasin diye biraz ileriden
    const dogumNoktasi = {
      x: bas.x + yon.x * 1.5,
      y: bas.y + yon.y * 1.5,
      z: bas.z + yon.z * 1.5
    };

    if (dogumNoktasi.y < sinir.min || dogumNoktasi.y > sinir.max) {
      kollariIndir(oyuncu);
      return undefined;
    }

    let tnt = null;
    let dogdu = false;
    let patlamaTick = 0;
    // Varlik kaybolursa (chunk bosaldi, biri oldurdu) son bilinen yer
    let sonYer = dogumNoktasi;

    return {
      ad: "guclu_tnt",
      oyuncuId: oyuncu.id,

      calis() {
        // 1) TNT'yi dogur (butce izin verince)
        if (!dogdu) {
          if (varlikIste(1) === 0) return false;
          dogdu = true;
          patlamaTick = system.currentTick + GTNT_FITIL;
          try {
            tnt = boyut.spawnEntity("minecraft:tnt", dogumNoktasi);
            tnt.applyImpulse({
              x: yon.x * GTNT_HIZ,
              y: yon.y * GTNT_HIZ + 0.15,   // hafif yukari, yay gibi ucsun
              z: yon.z * GTNT_HIZ
            });
          } catch (e) {
            hataYaz("guclu_tnt.spawnEntity", e);
            tnt = null;
          }
          return false;
        }

        // 2) Ucarken yerini takip et
        if (tnt && gecerliMi(tnt)) {
          try {
            const k = tnt.location;
            sonYer = { x: k.x, y: k.y, z: k.z };
          } catch (e) {
            hataYaz("guclu_tnt.location", e);
          }
        }

        // 3) Fitil dolmadiysa bekle
        if (system.currentTick < patlamaTick) return false;

        // 4) Patlama butcesi bosalana kadar bekle (tavan asilmasin)
        if (patlamaIste(1) === 0) return false;

        // Vanilla TNT kendi patlamasini yapmadan once kaldirilir,
        // yoksa iki patlama olur: biri guc 4, biri bizimki.
        if (tnt && gecerliMi(tnt)) {
          try {
            tnt.remove();
          } catch (e) {
            hataYaz("guclu_tnt.remove", e);
          }
        }

        if (sonYer.y >= sinir.min && sonYer.y <= sinir.max) {
          try {
            boyut.createExplosion(sonYer, GTNT_GUC, {
              breaksBlocks: true, causesFire: GTNT_ATES, allowUnderwater: true
            });
          } catch (e) {
            hataYaz("guclu_tnt.createExplosion", e);
          }
          parcacikAt(boyut, PARCACIK_PATLAMA, sonYer);
          ekraniSars(oyuncu, SARSINTI_PATLAMA, SARSINTI_SURE);
        }
        return true;
      },

      bitir() {
        tnt = null;
        kollariIndir(oyuncu);
      }
    };
  }
});
