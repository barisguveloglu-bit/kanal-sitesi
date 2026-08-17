import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, kollariIndir, koniHedefleri } from "../yardimcilar.js";
import {
  YAMULT_MENZIL, YAMULT_ACI, YAMULT_SURE, YAMULT_SIDDET,
  YAMULT_TAVAN, YAMULT_OYUNCU
} from "../ayarlar.js";

/* YAMULTMA -- baktiklarini felce ugratir.

   Referansta bu yetenek soyleydi:
     execute @s^^^2  /playanimation @e[r=2,c=1] animation.fox.sleep a 9999
     execute @s^^^2  /effect @e[r=2,c=1] slowness 100000 255 true
   Yani ~83 dakika, seviye 255 yavaslik. Ve GERI ALAN HICBIR
   FONKSIYON YOK -- vurdugun kisi pratikte oyunu birakmak zorunda.

   Bizimki iki yerde ayriliyor:
     1. Sure sinirli (YAMULT_SURE)
     2. CARESI VAR: felcli birine tekrar yamultma kullanirsan
        cozulur. Ayni yetenek hem vurur hem iyilestirir.

   Kimin felcli oldugunu bilmek icin kucuk bir kayit tutuluyor;
   sadece BIZIM felc ettiklerimiz cozuluyor, baskasinin verdigi
   yavasliga dokunulmuyor.                                        */

// varlikId -> ne zaman kendiliginden gececek (tick)
const felcliler = new Map();

function temizle() {
  if (felcliler.size === 0) return;
  const simdi = system.currentTick;
  for (const [id, bitis] of felcliler) {
    if (simdi >= bitis) felcliler.delete(id);
  }
}

yetenekKaydet({
  kimlik: "yamult",
  ad: "Yamultma",
  esyasiz: true,
  sira: 150,

  olustur(oyuncu) {
    temizle();

    const hedefler = koniHedefleri(oyuncu, {
      menzil: YAMULT_MENZIL,
      aci: YAMULT_ACI,
      tavan: YAMULT_TAVAN,
      oyuncuDahil: YAMULT_OYUNCU
    });

    let felc = 0, cozulen = 0;

    for (const hedef of hedefler) {
      try {
        if (!gecerliMi(hedef)) continue;

        if (felcliler.has(hedef.id)) {
          // CARE: bizim felc ettigimiz birine tekrar kullanmak cozer
          felcliler.delete(hedef.id);
          try {
            hedef.removeEffect("slowness");
            hedef.removeEffect("weakness");
          } catch (e) {
            /* removeEffect yoksa sure zaten dolacak; kaydi
               sildigimiz icin en azindan tekrar felc edilebilir. */
          }
          cozulen++;
          continue;
        }

        hedef.addEffect("slowness", YAMULT_SURE, {
          amplifier: YAMULT_SIDDET, showParticles: true
        });
        hedef.addEffect("weakness", YAMULT_SURE, {
          amplifier: 1, showParticles: false
        });
        felcliler.set(hedef.id, system.currentTick + YAMULT_SURE);
        felc++;
      } catch (e) {
        hataYaz("yamult.hedef", e);
      }
    }

    try {
      const parca = [];
      if (felc > 0) parca.push("§c" + felc + " hedef yamuldu");
      if (cozulen > 0) parca.push("§a" + cozulen + " hedef duzeldi");
      oyuncu.sendMessage(parca.length
        ? parca.join(" §7· ")
        : "§eOnunde yamultacak bir sey yok.");
    } catch (e) {
      hataYaz("yamult.sendMessage", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
