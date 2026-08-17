import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, yukseklikAraligi, parcacikAt
} from "../yardimcilar.js";
import {
  MIZRAK_MENZIL, MIZRAK_HIZ, MIZRAK_YARICAP, MIZRAK_HASAR, MIZRAK_ETKI,
  MIZRAK_YAVASLIK, MIZRAK_ZEHIR, MIZRAK_ALAN, MIZRAK_TAVAN, MIZRAK_OYUNCU,
  MIZRAK_DIKIT, MIZRAK_BLOK, BUZ_SURE, PARCACIK_BUZ
} from "../ayarlar.js";

/* BUZ MIZRAGI -- Buz Kol'un firlatma yetenegi.

   Baktigin yone bir buz parcasi gidiyor. Carptigi seye UZUN
   sureli yavaslik + zehir veriyor: zehir cani yavas yavas
   goturuyor ama OLDURMUYOR (vanilla zehir 1 canda birakir).
   Yani hedefi hapsedip eritiyorsun, aninda infaz degil.

   Mizrak VARLIK DEGIL, bizim isimiz olarak uçuyor: her tick
   MIZRAK_HIZ kadar ilerleyip yolda carpma ariyor. Boylece
   varlik butcesi harcanmiyor, chunk sinirinda kaybolmuyor ve
   biri onu vurup yok edemiyor.

   Carpinca yere kisa bir buz dikiti birakiyor; o da kendi
   suresi dolunca eriyor -- geride kalici bir sey birakmiyoruz.  */
yetenekKaydet({
  kimlik: "buz_mizragi",
  ad: "Buz Mizragi",
  esyasiz: true,
  sira: 190,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    let konum, yon;
    try {
      const bas = oyuncu.getHeadLocation();
      yon = oyuncu.getViewDirection();
      konum = { x: bas.x, y: bas.y, z: bas.z };
    } catch (e) {
      hataYaz("buz_mizragi.baslangic", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    let gidilen = 0;
    let carpti = false;
    let vuran = 0;
    const dikitler = [];          // {x,y,z} -- SADECE bizim koydugumuz
    let eritilen = 0;
    let erimeTick = 0;

    /* Carpma anindaki isler: hasar + uzun sureli efektler.
       Kendimizi hicbir zaman hedef almiyoruz.                  */
    function patlat() {
      let yakin;
      try {
        yakin = boyut.getEntities({
          location: konum,
          maxDistance: MIZRAK_ALAN,
          excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
        });
      } catch (e) {
        hataYaz("buz_mizragi.getEntities", e);
        return;
      }

      for (const varlik of yakin) {
        if (vuran >= MIZRAK_TAVAN) break;
        try {
          if (varlik.id === oyuncu.id) continue;
          if (!gecerliMi(varlik)) continue;
          if (varlik.typeId === "minecraft:player" && !MIZRAK_OYUNCU) continue;

          varlik.applyDamage(MIZRAK_HASAR, { cause: "freezing" });
          varlik.addEffect("slowness", MIZRAK_ETKI, {
            amplifier: MIZRAK_YAVASLIK, showParticles: true
          });
          varlik.addEffect("poison", MIZRAK_ETKI, {
            amplifier: MIZRAK_ZEHIR, showParticles: true
          });
          varlik.addEffect("weakness", MIZRAK_ETKI, {
            amplifier: 1, showParticles: false
          });
          vuran++;
        } catch (e) {
          hataYaz("buz_mizragi.etki", e);
        }
      }
    }

    // Carpma yerine kisa bir buz dikiti; sadece havanin yerine
    function dikitOr() {
      const taban = {
        x: Math.floor(konum.x),
        y: Math.floor(konum.y),
        z: Math.floor(konum.z)
      };
      for (let i = 0; i < MIZRAK_DIKIT; i++) {
        const k = { x: taban.x, y: taban.y + i, z: taban.z };
        if (k.y < sinir.min || k.y > sinir.max) continue;
        if (blokIste(2) < 2) return;          // butce dolu, dikit kisa kalir
        try {
          const blok = boyut.getBlock(k);
          if (blok && blok.isAir) {
            blok.setType(MIZRAK_BLOK);
            dikitler.push(k);
          }
        } catch (e) {
          hataYaz("buz_mizragi.dikit", e);
        }
      }
    }

    return {
      ad: "buz_mizragi",
      oyuncuId: oyuncu.id,

      calis() {
        /* --- 1) Ucus --- */
        if (!carpti) {
          konum.x += yon.x * MIZRAK_HIZ;
          konum.y += yon.y * MIZRAK_HIZ;
          konum.z += yon.z * MIZRAK_HIZ;
          gidilen += MIZRAK_HIZ;

          parcacikAt(boyut, PARCACIK_BUZ, konum);

          // Menzil doldu ya da dunya sinirindan cikti
          if (gidilen >= MIZRAK_MENZIL || konum.y < sinir.min || konum.y > sinir.max) {
            carpti = true;
            erimeTick = system.currentTick + BUZ_SURE;
            return false;
          }

          // Kati bir bloga carpma
          let katiyaCarpti = false;
          if (blokIste(1) > 0) {
            try {
              const blok = boyut.getBlock(konum);
              if (blok && !blok.isAir) katiyaCarpti = true;
            } catch (e) {
              hataYaz("buz_mizragi.getBlock", e);
            }
          }

          // Varliga carpma
          let varligaCarpti = false;
          if (!katiyaCarpti) {
            try {
              const yakin = boyut.getEntities({
                location: konum,
                maxDistance: MIZRAK_YARICAP,
                excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
              });
              for (const v of yakin) {
                if (v.id !== oyuncu.id && gecerliMi(v)) { varligaCarpti = true; break; }
              }
            } catch (e) {
              hataYaz("buz_mizragi.carpma", e);
            }
          }

          if (katiyaCarpti || varligaCarpti) {
            carpti = true;
            patlat();
            dikitOr();
            erimeTick = system.currentTick + BUZ_SURE;

            try {
              oyuncu.sendMessage(vuran > 0
                ? "§b" + vuran + " hedef donduruldu §7(" +
                  (MIZRAK_ETKI / 20 / 60).toFixed(0) + " dk yavaslik + zehir)"
                : "§7Buz mizragi carpti, kimseye denk gelmedi.");
            } catch (e) {
              hataYaz("buz_mizragi.sendMessage", e);
            }
          }
          return false;
        }

        /* --- 2) Dikit erisin --- */
        if (system.currentTick < erimeTick) return false;

        while (eritilen < dikitler.length) {
          if (blokIste(2) < 2) return false;
          const k = dikitler[eritilen];
          try {
            const blok = boyut.getBlock(k);
            // Hala BIZIM buzumuzse kaldir
            if (blok && blok.typeId === MIZRAK_BLOK) blok.setType("minecraft:air");
          } catch (e) {
            hataYaz("buz_mizragi.erime", e);
          }
          eritilen++;
        }
        return true;
      },

      bitir() {
        // Is erken durdurulduysa geride buz kalmasin
        for (let j = eritilen; j < dikitler.length; j++) {
          try {
            const blok = boyut.getBlock(dikitler[j]);
            if (blok && blok.typeId === MIZRAK_BLOK) blok.setType("minecraft:air");
          } catch (e) {
            hataYaz("buz_mizragi.temizlik", e);
          }
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
