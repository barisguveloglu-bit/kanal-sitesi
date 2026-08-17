import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, kollariIndir, koniHedefleri } from "../yardimcilar.js";
import {
  YAMULT_MENZIL, YAMULT_ACI, YAMULT_SURE, YAMULT_SIDDET,
  YAMULT_TAVAN, YAMULT_OYUNCU, YAMULT_KAZMA, YAMULT_ANIM,
  YAMULT_ANIM_BITIS
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
   yavasliga dokunulmuyor.

   ---- v4.10: Boralo Mod V2'den alinanlar ----

   O modun yamultmasi (spm_advanced_dirtarms_power_3) sunu
   yapiyordu:
     tag @p[r=8,rm=1] add Yamul
     inputpermission set @p[...] movement disabled
     inputpermission set @p[...] camera disabled
     playanimation @p[...] animation.sp_m_animasyon_yamulma.

   Bizden IYI olan tek yani GORSELDI: hedef gercekten yamulmus
   gibi duruyordu. Bizde hic poz yoktu. POZ ALINDI.

   Gerisi alinmadi cunku bizdeki zaten daha iyi:
     - onlarinki @p, yani SADECE OYUNCU; tek kisilik dunyada
       hicbir ise yaramiyor
     - onlarinki SURESIZ, caresi ayri bir menu kipi; kolu
       kaybedersen kurban sonsuza kadar kilitli
     - camera disabled alinmadi: kurban etrafina bile bakamiyor
       ve moblarda zaten hicbir etkisi yok

   Kelepce silahindan (kelepcejsoenaam.js) mining_fatigue fikri
   alindi -- yamulan biri kazma da sallayamamali. Onlarinki
   99999 saniye veriyordu; bizimki YAMULT_SURE kadar.           */

// varlikId -> ne zaman kendiliginden gececek (tick)
const felcliler = new Map();

/* Poz oynatma sadece GORSEL. playanimation her varlikta ve her
   surumde yok; calismazsa yetenek yine calisir, sadece hedef
   dik durur.                                                    */
function pozVer(hedef, anim) {
  try {
    if (typeof hedef.runCommand === "function") {
      hedef.runCommand("playanimation @s " + anim);
    }
  } catch (e) {
    // Sessizce gec: efektler zaten uygulandi
  }
}

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
            hedef.removeEffect("mining_fatigue");
          } catch (e) {
            /* removeEffect yoksa sure zaten dolacak; kaydi
               sildigimiz icin en azindan tekrar felc edilebilir. */
          }
          pozVer(hedef, YAMULT_ANIM_BITIS);
          cozulen++;
          continue;
        }

        hedef.addEffect("slowness", YAMULT_SURE, {
          amplifier: YAMULT_SIDDET, showParticles: true
        });
        hedef.addEffect("weakness", YAMULT_SURE, {
          amplifier: 1, showParticles: false
        });
        /* Kazma sallayamasin. Fikir kelepce silahindan; oradaki
           99999 saniye yerine yetenegin kendi suresi kadar.    */
        hedef.addEffect("mining_fatigue", YAMULT_SURE, {
          amplifier: YAMULT_KAZMA, showParticles: false
        });
        // Referansin tek ustunlugu: hedef yamulmus gibi dursun
        pozVer(hedef, YAMULT_ANIM);
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
