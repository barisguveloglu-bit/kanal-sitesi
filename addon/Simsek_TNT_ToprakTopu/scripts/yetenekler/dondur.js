import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, kilitliHedef, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  DONDUR_MENZIL, DONDUR_ACI, DONDUR_SURE, DONDUR_YAVASLIK,
  DONDUR_ARALIK, DONDUR_ANIM
} from "../ayarlar.js";

/* DONDUR -- baktigin hedefi oldugu yerde kilitler.

   Referans mod (Kevin1545, "kol koparma"):
     execute positioned ^^^10 run
       playanimation @e [r=10,c=1] animation.evoker.general a 999

   Iki sorunu vardi:

     1. "@e [r=10,c=1]" -- @e ile kose parantez ARASINDA BOSLUK
        var. Bedrock bunu ayristiramiyor, komut hic calismiyor.
        (Geri alan kevinn_duzelr.mcfunction'da da ayni bosluk.)
     2. Calissaydi bile SADECE GORSEL olurdu: playanimation bir
        poz oynatiyor, zombi o poz icinde sana dogru yurumeye
        devam ediyor. Videoda "dondu" gibi duran sey aslinda
        durmuyor.

   Burasi pozu koruyor ama ANLAMLI hale getiriyor: hedef gercekten
   yerinde kaliyor. Referansin kalici "a 999"u yerine SURELI --
   sure dolunca serbest kaliyor, cunku iyilesmesi olmayan kalici
   etki referans modlarin en can sikici huyu (bkz. NOTLAR.md,
   "slowness 100000 255").

   Hasar YOK: bu bir tutma yetenegi, infaz degil. Hasar isteyen
   buz_mizragi'ni kullanir.                                       */
yetenekKaydet({
  kimlik: "dondur",
  ad: "Dondur",
  esyasiz: true,
  sira: 160,

  olustur(oyuncu) {
    const hedef = kilitliHedef(oyuncu, {
      menzil: DONDUR_MENZIL, aci: DONDUR_ACI
    });

    if (!hedef) {
      actionbarYaz(oyuncu, "§7Donduracak bir hedef yok");
      kollariIndir(oyuncu);
      return undefined;
    }

    let ad = "hedef";
    try {
      const t = hedef.typeId || "";
      const i = t.indexOf(":");
      ad = (i === -1) ? t : t.slice(i + 1);
    } catch (e) {
      hataYaz("dondur.typeId", e);
    }

    /* Poz animasyonu: sadece gorsel, calismazsa yetenek yine
       calisir. playanimation her varlikta desteklenmiyor.        */
    try {
      if (typeof hedef.runCommand === "function") {
        hedef.runCommand("playanimation @s " + DONDUR_ANIM);
      }
    } catch (e) {
      // Sessizce gec: poz olmasa da dondurma isliyor
    }

    actionbarYaz(oyuncu, "§b❄ §fdonduruldu §7· " + ad);

    const bitisTick = system.currentTick + DONDUR_SURE;
    let sonrakiTick = system.currentTick;

    return {
      ad: "dondur",
      oyuncuId: oyuncu.id,

      calis() {
        if (system.currentTick >= bitisTick) return true;
        if (!gecerliMi(hedef)) return true;      // hedef oldu/kayboldu
        if (system.currentTick < sonrakiTick) return false;
        sonrakiTick = system.currentTick + DONDUR_ARALIK;

        try {
          /* Etki suresi kisa tutulup tazeleniyor: is yarida
             kesilirse (oyuncu cikti) hedef en fazla DONDUR_ARALIK
             kadar fazladan kilitli kalir, saatlerce degil.       */
          hedef.addEffect("slowness", DONDUR_ARALIK + 10, {
            amplifier: DONDUR_YAVASLIK, showParticles: false
          });
          const k = hedef.location;
          parcacikAt(oyuncu.dimension, "minecraft:snowflake_particle", k);
        } catch (e) {
          hataYaz("dondur.addEffect", e);
          return true;
        }
        return false;
      },

      bitir() {
        // Pozu geri al; referansta bunu yapan dosya da bozuktu
        try {
          if (gecerliMi(hedef) && typeof hedef.runCommand === "function") {
            hedef.runCommand("playanimation @s animation.humanoid.move a 0");
          }
        } catch (e) {
          // Onemsiz: poz kendiliginden de gecer
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
