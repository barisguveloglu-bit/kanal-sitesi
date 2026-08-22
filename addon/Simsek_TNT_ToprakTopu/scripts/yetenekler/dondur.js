import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, kilitliHedef, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  DONDUR_MENZIL, DONDUR_ACI, DONDUR_SURE, DONDUR_YAVASLIK,
  DONDUR_ARALIK, DONDUR_ANIM, DONDUR_GIRDI_KILIT, DONDUR_KAMERA_KILIT,
  DONDUR_OYUNCU
} from "../ayarlar.js";

/* ---------------- Girdi kilidi ----------------  (v4.33)

   Fikir uc referans moddan: zaman_durdur.mcfunction. Onlarda
   "inputpermission set @a movement disabled" tek satirdi ve
   SURESIZDI -- kapatan ayri bir komuttu, unutursan oyuncu
   sonsuza kadar kilitli kalirdi.

   Burada kilit hep CIFT: acan yer bitir()'de kapatani garanti
   ediyor. Ayrica main.js dunyaya girerken herkesi seriyor.

   Neden slowness yetmiyor: slowness bir OYUNCUYU yavaslatir ama
   durdurmaz (seviye 255'te bile zorlayarak yurunur). Moblarda
   slowness yeterli, oyuncularda degil -- referansin bu tespiti
   dogruydu, uygulamasi degildi.                                */
function girdiKilidi(hedef, acikMi) {
  if (!DONDUR_GIRDI_KILIT) return;
  if (hedef.typeId !== "minecraft:player") return;   // sadece oyuncu
  if (typeof hedef.runCommand !== "function") return;

  const deger = acikMi ? "enabled" : "disabled";
  try {
    hedef.runCommand("inputpermission set @s movement " + deger);
    if (DONDUR_KAMERA_KILIT) {
      hedef.runCommand("inputpermission set @s camera " + deger);
    }
  } catch (e) {
    /* Komut eski surumlerde yok. Sessiz gecilir: slowness zaten
       uygulaniyor, yani yetenek yine calisiyor.                */
  }
}

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
  sira: 165,

  olustur(oyuncu) {
    const hedef = kilitliHedef(oyuncu, {
      menzil: DONDUR_MENZIL, aci: DONDUR_ACI,
      /* Oyuncu dahil: yoksa girdi kilidi hic calismazdi
         (bkz. ayarlar.js:DONDUR_OYUNCU).                       */
      oyuncuDahil: DONDUR_OYUNCU
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

    /* Oyuncuysa gercekten kilitle; mobta slowness zaten yeter. */
    girdiKilidi(hedef, false);

    const oyuncuMu = (hedef.typeId === "minecraft:player");
    actionbarYaz(oyuncu, "§b❄ §fdonduruldu §7· " + ad +
                 (oyuncuMu && DONDUR_GIRDI_KILIT ? " §8(girdi kilitli)" : ""));

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
        /* EN ONEMLI SATIR. Kilidi acan tek yer burasi ve bitir()
           her durumda cagriliyor: sure dolsa da, hedef olse de,
           oyuncu cikip is silinse de (main.js:isSil). Referans
           modun sonsuza kadar kilitleyen hatasi buradan
           kapatiliyor.                                          */
        try {
          girdiKilidi(hedef, true);
        } catch (e) {
          hataYaz("dondur.girdiAc", e);
        }

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
