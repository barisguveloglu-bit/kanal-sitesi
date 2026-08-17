import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { varlikIste, patlamaIste } from "../butce.js";
import {
  hedefBul, hataYaz, gecerliMi, kollariIndir, yukseklikAraligi
} from "../yardimcilar.js";
import {
  MENZIL, METEOR_SAYISI, METEOR_YAYILMA, METEOR_GUC, METEOR_ARALIK,
  METEOR_ATES, METEOR_YUKSEK, METEOR_INIS, METEOR_TAVAN
} from "../ayarlar.js";

/* YILDIRIM METEORU -- baktigin noktaya gokten meteor yagar.

   ESKI HALIMIZ: hedefte anlik yildirim + patlama. Guclu ama
   GELEN BIR SEY GORUNMUYORDU; birden patliyordu.

   Referans mod bunu "execute @s^^^12 /summon tnt ~~30~" ile
   yapiyordu: TNT 30 blok yukarida doguyor ve dusuyor. Zayif
   tarafi vanilla TNT'nin gucunun motorda SABIT 4 olmasi --
   degistirilemiyor. Iyi tarafi meteorun goruluyor olmasi.

   Ikisini birlestirdik:
     - govde yukarida doguyor ve gercekten dusuyor  (onlardan)
     - yere yaklasinca govde kaldirilip yerine BIZIM patlamamiz
       cagriliyor, guc METEOR_GUC                   (bizden)
     - yildirim carpma aninda dusuyor, once degil

   METEOR_YUKSEK = 0 yapilirsa eski anlik davranisa doner.

   Ayni anda birden fazla govde havada olabilir; hepsi tek listede
   izleniyor ve patlama butcesini paylasiyorlar.                  */
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

    // Her meteorun yeri onceden hesaplaniyor: her tick Math.random
    // cagirip nesne uretmekten ucuz.
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
    const ucanlar = [];   // {govde, hedefY, sonYer, zorlaTick}

    /* Patlama + yildirim tek yerde. Sinir disindaysa hicbir sey
       yapmadan doner: butce zaten harcanmis olmaz.               */
    function patlat(yer) {
      if (yer.y < sinir.min || yer.y > sinir.max) return;

      if (varlikIste(1) > 0) {
        try {
          boyut.spawnEntity("minecraft:lightning_bolt", yer);
        } catch (e) {
          hataYaz("meteor.yildirim", e);
        }
      }
      try {
        boyut.createExplosion(yer, METEOR_GUC, {
          breaksBlocks: true, causesFire: METEOR_ATES, allowUnderwater: true
        });
      } catch (e) {
        hataYaz("meteor.createExplosion", e);
      }
    }

    return {
      ad: "meteor",
      oyuncuId: oyuncu.id,

      calis() {
        /* --- 1) Havadaki govdeleri izle --- */
        for (let j = ucanlar.length - 1; j >= 0; j--) {
          const m = ucanlar[j];

          if (m.govde && gecerliMi(m.govde)) {
            try {
              const k = m.govde.location;
              m.sonYer.x = k.x; m.sonYer.y = k.y; m.sonYer.z = k.z;
            } catch (e) {
              hataYaz("meteor.location", e);
            }
          }

          /* Inis sarti: ya hedef yuksekligine indi, ya govde
             kayboldu (biri vurdu, chunk bosaldi), ya da tavan
             suresi doldu. Tavan olmazsa takilan bir govde isi
             sonsuza kadar acik tutardi.                          */
          const indi = m.sonYer.y <= m.hedefY + METEOR_INIS;
          const kayip = !m.govde || !gecerliMi(m.govde);
          const zorla = system.currentTick >= m.zorlaTick;
          if (!indi && !kayip && !zorla) continue;

          if (patlamaIste(1) === 0) continue;   // butce dolu, sonraki tick

          // Vanilla TNT kendi guc-4 patlamasini yapmadan kaldirilir,
          // yoksa iki patlama olur.
          if (m.govde && gecerliMi(m.govde)) {
            try {
              m.govde.remove();
            } catch (e) {
              hataYaz("meteor.remove", e);
            }
          }
          patlat(m.sonYer);
          ucanlar.splice(j, 1);
        }

        /* --- 2) Sirasi gelen yeni meteoru dogur --- */
        if (i < noktalar.length && system.currentTick >= sonrakiTick) {
          const nokta = noktalar[i];

          if (METEOR_YUKSEK <= 0) {
            // Anlik mod: govde yok, dogrudan patlat
            if (patlamaIste(1) > 0) {
              patlat(nokta);
              i++;
              sonrakiTick = system.currentTick + METEOR_ARALIK;
            }
          } else {
            const dogumY = nokta.y + METEOR_YUKSEK;

            if (dogumY > sinir.max || nokta.y < sinir.min) {
              i++;   // sinir disi: butce harcamadan atla
              sonrakiTick = system.currentTick + METEOR_ARALIK;
            } else if (varlikIste(1) > 0) {
              const dogum = { x: nokta.x, y: dogumY, z: nokta.z };
              let govde = null;
              try {
                govde = boyut.spawnEntity("minecraft:tnt", dogum);
              } catch (e) {
                hataYaz("meteor.spawnEntity", e);
              }
              ucanlar.push({
                govde,
                hedefY: nokta.y,
                sonYer: { x: dogum.x, y: dogum.y, z: dogum.z },
                zorlaTick: system.currentTick + METEOR_TAVAN
              });
              i++;
              sonrakiTick = system.currentTick + METEOR_ARALIK;
            }
          }
        }

        // Hepsi dogdu VE hepsi indi ise is biter
        return i >= noktalar.length && ucanlar.length === 0;
      },

      bitir() {
        /* Is erken durdurulduysa havada TNT birakma: fitili
           dolunca vanilla guc-4 patlamasi yapardi ve biz onu
           artik izlemiyor olurduk.                              */
        for (const m of ucanlar) {
          if (m.govde && gecerliMi(m.govde)) {
            try {
              m.govde.remove();
            } catch (e) {
              hataYaz("meteor.bitir.remove", e);
            }
          }
        }
        ucanlar.length = 0;
        kollariIndir(oyuncu);
      }
    };
  }
});
