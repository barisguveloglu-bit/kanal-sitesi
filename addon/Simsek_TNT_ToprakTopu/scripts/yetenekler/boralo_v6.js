import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, koniHedefleri, actionbarYaz,
  parcacikAt, ekraniBoya, varlikKonumu
} from "../yardimcilar.js";
import {
  KAN_YAGMURU_ACIK, KAN_YAGMURU_MENZIL, KAN_YAGMURU_ACI,
  KAN_YAGMURU_TAVAN, KAN_YAGMURU_HASAR, KAN_YAGMURU_YAGMUR,
  KAN_YAGMURU_PARCACIK,
  GOZ_SENSORU_ACIK, GOZ_SENSORU_MENZIL, GOZ_SENSORU_ACI,
  GOZ_SENSORU_TAVAN, GOZ_SENSORU_SURE, GOZ_SENSORU_SES,
  GOZ_SENSORU_PARCACIK, GOZ_SENSORU_FLAS, GOZ_SENSORU_FLAS_SURE
} from "../ayarlar.js";

/* BORALO V6'DAN ALINAN IKI YETENEK

   Paketin tamami REFERANS_BORALO_V6.md'de olculu. Kisaca:
   201 esyanin mekanigi neredeyse tamamen bizde zaten vardi.
   Bu dosya gercekten eksik olan ikisini tutuyor.

   ---- ORTAK ILKE ----
   Kaynagin AMACI korunuyor, ALTYAPISI degil. Paketin her
   yetenegi ayni uc kaliptan cikiyor:

     effect <hedef> <etki> 9999 255      -> sonsuz, cikissiz
     @e ya da @a                         -> kendin de dahil
     clear @s                            -> envanteri/etkileri sil

   Ucu de bu depoda yasak. Sebepleri ayarlar.js'te madde
   madde yazili; burada tekrarlanmiyor, uygulaniyor.        */


/* ============================================================
   1. KAN YAGMURU  (kaynakta: pa:blood_rain)

   Gokyuzu kapaniyor, cevredeki her sey hasar aliyor.

   Yagmur SURELI veriliyor: `weather rain <saniye>` dedikten
   sonra vanilla o surenin sonunda havayi kendisi seciyor.
   Yani "kapatma yolu" bizim kodumuzda degil, oyunun kendi
   isleyisinde -- script corse bile hava takili kalmiyor.
   Kaynakta suresiz `weather rain` vardi ve kalici bir dunya
   degisikligiydi.
   ============================================================ */
yetenekKaydet({
  kimlik: "kan_yagmuru",
  ad: "Kan Yagmuru",
  esyasiz: true,
  sira: 221,

  olustur(oyuncu) {
    if (!KAN_YAGMURU_ACIK) return undefined;

    /* Aci -1 oldugu icin koni degil kure taraniyor; kendimizi
       ve botlari eleyen kurallar yine calisiyor.            */
    const hedefler = koniHedefleri(oyuncu, {
      menzil: KAN_YAGMURU_MENZIL,
      aci: KAN_YAGMURU_ACI,
      tavan: KAN_YAGMURU_TAVAN,
      oyuncuDahil: true
    });

    let vurulan = 0;
    for (const hedef of hedefler) {
      try {
        if (!gecerliMi(hedef)) continue;
        try {
          hedef.applyDamage(KAN_YAGMURU_HASAR, {
            cause: "magic", damagingEntity: oyuncu
          });
        } catch (e) {
          /* Secenekli bicim bazi surumlerde yok -- beden_bol.js'te
             ayni yedek var.                                     */
          try { hedef.applyDamage(KAN_YAGMURU_HASAR); }
          catch (e2) { hataYaz("kan_yagmuru.applyDamage", e2); continue; }
        }
        parcacikAt(hedef.dimension, KAN_YAGMURU_PARCACIK,
                   varlikKonumu(hedef) || hedef.location);
        vurulan++;
      } catch (e) {
        hataYaz("kan_yagmuru.hedef", e);
      }
    }

    /* Hava en sona birakildi: komut catlasa bile hasar zaten
       verilmis oluyor. Ters sirada tek bir istisna butun
       yetenegi yutardi.                                     */
    let yagdi = false;
    if (KAN_YAGMURU_YAGMUR > 0) {
      try {
        const boyut = oyuncu.dimension;
        if (boyut && typeof boyut.runCommand === "function") {
          boyut.runCommand("weather rain " + Math.round(KAN_YAGMURU_YAGMUR));
          yagdi = true;
        }
      } catch (e) {
        hataYaz("kan_yagmuru.hava", e);
      }
    }

    try {
      if (vurulan > 0) {
        actionbarYaz(oyuncu, "§4☂ §f" + vurulan + " hedef kan yagmurunda" +
                             (yagdi ? " §8· gok kapandi" : ""));
      } else if (yagdi) {
        actionbarYaz(oyuncu, "§4☂ §7Gok kapandi §8· menzilde kimse yok");
      } else {
        actionbarYaz(oyuncu, "§7Kan yagmuru tutmadi");
      }
    } catch (e) {
      hataYaz("kan_yagmuru.actionbar", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek, tick tutmuyor
  }
});


/* ============================================================
   2. GOZ SENSORU  (kaynakta: pa:eye_sensor)

   Baktigin yondekileri kisa sureligine kor ediyor.

   ---- NEDEN BU BOSLUK GERCEK BOSLUKTU ----
   Korluk bu modda birkac yetenegin ICINDE var (Jujutsu, asa,
   zaman saati, dusmus) ama tek isi korluk olan bir sey yoktu.
   Ustelik SERSEM_KOR ayari bilerek `false`: sersemletilen
   oyuncu GORSUN diye. Yani "korluk zaten var" demek dogru
   olmazdi -- kasitla disarida birakilmis bir sey vardi ve
   dolduran yoktu.

   ---- SURE NEDEN KISA ----
   Kaynak 9999 tick (sonsuza yakin) veriyordu. Kor edilen
   oyuncu icin oyun orada bitiyor; bu bir yetenek degil
   cezalandirma. 3 saniye bir flasin hissi kadar: nisani
   bozuyor, oyunu bitirmiyor.
   ============================================================ */
yetenekKaydet({
  kimlik: "goz_sensoru",
  ad: "Goz Sensoru",
  esyasiz: true,
  sira: 222,

  olustur(oyuncu) {
    if (!GOZ_SENSORU_ACIK) return undefined;

    const hedefler = koniHedefleri(oyuncu, {
      menzil: GOZ_SENSORU_MENZIL,
      aci: GOZ_SENSORU_ACI,
      tavan: GOZ_SENSORU_TAVAN,
      oyuncuDahil: true
    });

    let korEdilen = 0;
    for (const hedef of hedefler) {
      try {
        if (!gecerliMi(hedef)) continue;
        if (typeof hedef.addEffect !== "function") continue;

        /* Seviye 0: korluk ac/kapa bir etki, seviyesi yok.
           Kaynaktaki 255 sadece sayi buyuklugu.              */
        hedef.addEffect("blindness", GOZ_SENSORU_SURE, {
          amplifier: 0, showParticles: false
        });

        const yer = varlikKonumu(hedef) || hedef.location;
        parcacikAt(hedef.dimension, GOZ_SENSORU_PARCACIK, yer);

        /* Ekran flasi yalniz OYUNCUDA anlamli. */
        if (hedef.typeId === "minecraft:player") {
          ekraniBoya(hedef, GOZ_SENSORU_FLAS,
                     GOZ_SENSORU_FLAS_SURE[0],
                     GOZ_SENSORU_FLAS_SURE[1],
                     GOZ_SENSORU_FLAS_SURE[2]);
        }
        korEdilen++;
      } catch (e) {
        hataYaz("goz_sensoru.hedef", e);
      }
    }

    /* Ses OLAYIN OLDUGU YERDE caliniyor. Kaynak `@a` ile
       dunyadaki herkese caliyordu -- baska kitadaki oyuncu
       da deklanşor sesi duyuyordu.                          */
    try {
      const boyut = oyuncu.dimension;
      if (boyut && typeof boyut.playSound === "function") {
        boyut.playSound(GOZ_SENSORU_SES, oyuncu.location);
      }
    } catch (e) {
      hataYaz("goz_sensoru.ses", e);
    }

    try {
      actionbarYaz(oyuncu, korEdilen > 0
        ? "§e✦ §f" + korEdilen + " hedef kor edildi §8· " +
          (GOZ_SENSORU_SURE / 20).toFixed(1) + " sn"
        : "§7Onunde kimse yok");
    } catch (e) {
      hataYaz("goz_sensoru.actionbar", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek, tick tutmuyor
  }
});
