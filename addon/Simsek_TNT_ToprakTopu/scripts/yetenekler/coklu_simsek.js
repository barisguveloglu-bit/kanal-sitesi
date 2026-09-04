import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { varlikIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, yukseklikAraligi
} from "../yardimcilar.js";
import {
  COKLU_MENZIL, COKLU_EN_YAKIN, COKLU_HEDEF, COKLU_ARALIK,
  COKLU_OYUNCU, COKLU_MUAF
} from "../ayarlar.js";

/* COKLU SIMSEK -- etraftaki en yakin birkac hedefe ayni anda
   yildirim.

   Fikir Boralo Mod V2'deki "Astrape Weapon"dan. Oradaki en iyi
   ayrinti MIN MESAFE: 4 bloktan yakindakini vurmuyor, boylece
   kendini ve yanindakini yakmiyorsun. Bizim alan_simsegi'nde bu
   yok -- o yaricaptaki HERKESI vuruyor.

   REFERANSTAKI HATALAR

   1. Bekleme suresi Date.now() ile tutuluyordu, yani DUVAR SAATI.
      Oyun duraklatildiginda ya da tick hizi dustugunde oyunla
      alakasi kalmiyor. Bizde her sey system.currentTick.

   2. cooldowns Map'i hic temizlenmiyordu; oyuncu ciksa da kayit
      kaliyordu. Bizde bekleme zaten main.js'in ortak yolunda ve
      playerLeave onu siliyor.

   3. Butun yildirimlar TEK TICK'te dogruluyordu (dongu icinde
      runCommandAsync). Uc yildirim idare eder ama sayiyi
      artirinca tick sisiyor. Burasi varlik butcesini kullaniyor
      ve partiye boluyor.

   4. summon komutu koordinatlari metne cevirip cagriyordu; dunya
      sinirinin disina denk gelirse komut hata veriyordu. Burasi
      spawnEntity kullaniyor ve siniri onceden kontrol ediyor.   */
yetenekKaydet({
  kimlik: "coklu_simsek",
  ad: "Coklu Simsek",
  esyasiz: true,
  sira: 205,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);
    const oyuncuId = oyuncu.id;

    let merkez;
    try {
      merkez = oyuncu.location;
    } catch (e) {
      hataYaz("coklu_simsek.location", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    let yakin;
    try {
      yakin = boyut.getEntities({
        location: merkez,
        maxDistance: COKLU_MENZIL,
        excludeTypes: COKLU_MUAF
      });
    } catch (e) {
      hataYaz("coklu_simsek.getEntities", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    /* MIN MESAFE referanstan: cok yakindakini vurma. Yildirim
       alan hasari veriyor, dibindekini vurursan kendin de
       yaniyorsun.                                              */
    const bulunan = [];
    for (const varlik of yakin) {
      try {
        if (varlik.id === oyuncuId) continue;
        if (!gecerliMi(varlik)) continue;
        if (varlik.typeId === "minecraft:player" && !COKLU_OYUNCU) continue;

        const k = varlik.location;
        const dx = k.x - merkez.x, dy = k.y - merkez.y, dz = k.z - merkez.z;
        const uzaklik = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (uzaklik < COKLU_EN_YAKIN) continue;

        bulunan.push({ nokta: { x: k.x, y: k.y, z: k.z }, uzaklik });
      } catch (e) {
        hataYaz("coklu_simsek.tarama", e);
      }
    }

    if (bulunan.length === 0) {
      actionbarYaz(oyuncu, "§7" + COKLU_EN_YAKIN + "-" + COKLU_MENZIL +
                   " blok arasi hedef yok");
      kollariIndir(oyuncu);
      return undefined;
    }

    // En yakinlar once
    bulunan.sort((a, b) => a.uzaklik - b.uzaklik);
    const hedefler = bulunan.slice(0, COKLU_HEDEF);

    /* Konumlar SIMDI okunuyor: referans gibi tek tick'te hepsini
       dogurmuyoruz ama hedefin kacmasini da beklemiyoruz --
       yildirim nisan alindigi yere duser.                       */
    let i = 0;
    let dusen = 0;
    let sonrakiTick = system.currentTick;

    return {
      ad: "coklu_simsek",
      oyuncuId: oyuncuId,

      calis() {
        if (i >= hedefler.length) return true;
        if (system.currentTick < sonrakiTick) return false;

        if (varlikIste(1) === 0) return false;   // butce dolu

        const nokta = hedefler[i++].nokta;
        sonrakiTick = system.currentTick + COKLU_ARALIK;

        if (nokta.y < sinir.min || nokta.y > sinir.max) {
          return i >= hedefler.length;
        }

        try {
          boyut.spawnEntity("minecraft:lightning_bolt", nokta);
          dusen++;
        } catch (e) {
          hataYaz("coklu_simsek.spawnEntity", e);
        }

        return i >= hedefler.length;
      },

      bitir() {
        try {
          if (gecerliMi(oyuncu)) {
            actionbarYaz(oyuncu, "§b⚡ §f" + dusen + " hedef vuruldu");
          }
        } catch (e) {
          hataYaz("coklu_simsek.bitir", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
