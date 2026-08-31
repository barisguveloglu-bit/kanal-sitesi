import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste, varlikIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, yukseklikAraligi,
  ekraniSars
} from "../yardimcilar.js";
import {
  KANLI_ACIK, KANLI_MENZIL, KANLI_MUAF, KANLI_OYUNCU_VUR,
  KANLI_ORS_YUKSEK, KANLI_ORS_BLOK, KANLI_ORS_ARALIK,
  KANLI_SIMSEK_ARALIK, KANLI_SARSINTI, KANLI_SARSINTI_SURE
} from "../ayarlar.js";

/* ================================================================
   KANLI KOL YETENEKLERI                                    v6.7

   Gerekcenin tamami ayarlar.js'teki KANLI KOL bolumunde.
   Burada yalniz iki yetenek var ve ikisinin de ortak yani su:
   NISAN ALMIYORLAR. Depodaki `ors` ve `coklu_simsek` bir
   noktaya ya da en yakin birkac hedefe vuruyor; bunlar
   cevredeki HERKESI birden vuruyor. Kaynagin Kanli Kol'unu
   Toprak Kol'dan ayiran sey de tam bu.

   ---- IKISI NEDEN AYNI DOSYADA ----
   Ikisi de ayni taramayi yapiyor: menzildeki varliklari bul,
   suz, sirala. O taramayi iki dosyaya kopyalamak iki ayri
   yerde bozulacak tek bir mantik demekti.
   ================================================================ */

/* Menzildeki vurulabilir varliklar. Iki yetenek de bunu
   kullaniyor; suzgec TEK YERDE duruyor.                     */
function hedefleriBul(oyuncu) {
  let merkez;
  try {
    merkez = oyuncu.location;
  } catch (e) {
    hataYaz("kanli.location", e);
    return undefined;
  }

  let yakin;
  try {
    yakin = oyuncu.dimension.getEntities({
      location: merkez,
      maxDistance: KANLI_MENZIL,
      excludeTypes: KANLI_MUAF
    });
  } catch (e) {
    hataYaz("kanli.getEntities", e);
    return undefined;
  }

  const bulunan = [];
  for (const varlik of yakin) {
    try {
      if (varlik.id === oyuncu.id) continue;      // kendini vurma
      if (!gecerliMi(varlik)) continue;
      if (varlik.typeId === "minecraft:player" && !KANLI_OYUNCU_VUR) continue;
      const k = varlik.location;
      const dx = k.x - merkez.x, dy = k.y - merkez.y, dz = k.z - merkez.z;
      bulunan.push({
        nokta: { x: k.x, y: k.y, z: k.z },
        uzaklik: Math.sqrt(dx * dx + dy * dy + dz * dz)
      });
    } catch (e) {
      hataYaz("kanli.tarama", e);
    }
  }
  /* En yakindan uzaga: butce dolarsa once yanindakiler
     vurulmus olsun, uzaktakiler degil.                      */
  bulunan.sort((a, b) => a.uzaklik - b.uzaklik);
  return bulunan;
}

function kapaliMi(oyuncu) {
  if (KANLI_ACIK) return false;
  actionbarYaz(oyuncu, "§7Kanli Kol kapali.");
  kollariIndir(oyuncu);
  return true;
}

function hedefsiz(oyuncu) {
  actionbarYaz(oyuncu, "§7" + KANLI_MENZIL + " blok icinde hedef yok");
  kollariIndir(oyuncu);
  return undefined;
}

/* ---------------- KANLI ORS ----------------
   Kaynak: `execute positioned ^^^10 at @e[type=!player] run
            fill ~~15~ ~~11~ anvil keep`

   Kaynaktan iki farki var:
     1. Kaynak bes katli bir SUTUN dokuyor (11..15). Bes ors
        ust uste dusen hicbir sey sag kalmiyor. Biz tek ors
        birakiyoruz.
     2. `keep` yalniz havaya koyar; biz de once HAVA MI diye
        bakiyoruz. Yani kimsenin evi delinmiyor.             */
yetenekKaydet({
  kimlik: "kanli_ors",
  ad: "Kanli Ors",
  esyasiz: true,
  sira: 212,

  olustur(oyuncu) {
    if (kapaliMi(oyuncu)) return undefined;
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    const hedefler = hedefleriBul(oyuncu);
    if (hedefler === undefined) { kollariIndir(oyuncu); return undefined; }
    if (hedefler.length === 0) return hedefsiz(oyuncu);

    /* Konumlar SIMDI okunuyor: ors nisan alindigi yere duser,
       hedef kacarsa isabet etmez. `coklu_simsek`teki karar. */
    const noktalar = hedefler.map((h) => ({
      x: Math.floor(h.nokta.x),
      y: Math.floor(h.nokta.y + KANLI_ORS_YUKSEK),
      z: Math.floor(h.nokta.z)
    }));

    ekraniSars(oyuncu, KANLI_SARSINTI, KANLI_SARSINTI_SURE);

    let i = 0, konan = 0, dolu = 0;
    let sonrakiTick = system.currentTick;

    return {
      ad: "kanli_ors",
      oyuncuId: oyuncu.id,

      calis() {
        if (i >= noktalar.length) return true;
        if (system.currentTick < sonrakiTick) return false;

        const nokta = noktalar[i];
        if (nokta.y < sinir.min || nokta.y > sinir.max) {
          i++;
          return i >= noktalar.length;
        }
        /* Bir okuma + bir yazma. */
        if (blokIste(2) < 2) return false;

        try {
          const blok = boyut.getBlock(nokta);
          if (!blok) {
            i++;                       // chunk yuklu degil
          } else if (blok.isAir) {
            blok.setType(KANLI_ORS_BLOK);
            konan++;
            i++;
          } else {
            dolu++;
            i++;
          }
        } catch (e) {
          hataYaz("kanli_ors.setType", e);
          i++;
        }
        sonrakiTick = system.currentTick + KANLI_ORS_ARALIK;
        return i >= noktalar.length;
      },

      bitir() {
        try {
          if (gecerliMi(oyuncu)) {
            actionbarYaz(oyuncu, "§4⚒ §f" + konan + " ors dustu" +
              (dolu > 0 ? " §8· " + dolu + " yer doluydu" : ""));
          }
        } catch (e) {
          hataYaz("kanli_ors.bitir", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});

/* ---------------- ULTI SIMSEK ----------------
   Kaynak: `execute at @e run summon lightning_bolt`

   `coklu_simsek`ten farki: hedef SAYISI sinirsiz ve en yakin
   mesafe sarti yok -- dibindekini de vuruyor. Kaynakta da
   oyle. Bunun bedeli kendi de yanabilmek; kaynak da bu
   bedeli oduyor.

   Kaynaktan farki: menzil var (kaynak butun dunyayi vuruyor)
   ve yildirimlar tick'e yayiliyor (kaynak hepsini tek tick'te
   doguruyor -- 30 varlik varsa o tick kilitleniyor).       */
yetenekKaydet({
  kimlik: "kanli_simsek",
  ad: "Ulti Simsek",
  esyasiz: true,
  sira: 213,

  olustur(oyuncu) {
    if (kapaliMi(oyuncu)) return undefined;
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    const hedefler = hedefleriBul(oyuncu);
    if (hedefler === undefined) { kollariIndir(oyuncu); return undefined; }
    if (hedefler.length === 0) return hedefsiz(oyuncu);

    ekraniSars(oyuncu, KANLI_SARSINTI, KANLI_SARSINTI_SURE);

    let i = 0, dusen = 0;
    let sonrakiTick = system.currentTick;

    return {
      ad: "kanli_simsek",
      oyuncuId: oyuncu.id,

      calis() {
        if (i >= hedefler.length) return true;
        if (system.currentTick < sonrakiTick) return false;
        if (varlikIste(1) === 0) return false;    // butce dolu

        const nokta = hedefler[i++].nokta;
        sonrakiTick = system.currentTick + KANLI_SIMSEK_ARALIK;

        if (nokta.y < sinir.min || nokta.y > sinir.max) {
          return i >= hedefler.length;
        }
        try {
          boyut.spawnEntity("minecraft:lightning_bolt", nokta);
          dusen++;
        } catch (e) {
          hataYaz("kanli_simsek.spawnEntity", e);
        }
        return i >= hedefler.length;
      },

      bitir() {
        try {
          if (gecerliMi(oyuncu)) {
            actionbarYaz(oyuncu, "§4⚡ §fUlti Simsek: §c" + dusen + " hedef");
          }
        } catch (e) {
          hataYaz("kanli_simsek.bitir", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
