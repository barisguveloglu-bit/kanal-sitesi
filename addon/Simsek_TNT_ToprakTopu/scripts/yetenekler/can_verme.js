import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, kollariIndir } from "../yardimcilar.js";
import {
  CAN_YARICAP, CAN_SURE, CAN_REJEN, CAN_KALKAN, CAN_ANLIK,
  CAN_TAVAN, CAN_DUSMAN
} from "../ayarlar.js";

/* CAN VERME -- kendini ve cevredeki dostlari iyilestirir.

   Referans mod bunu tek satirla yapiyordu:
     effect @s health_boost 100000 255
     effect @s instant_health 1 255
   Yani sadece kendine, ~83 dakika, 255 seviye. Bu oyunu bozuyor:
   health_boost 255 can barini ekrandan tasiriyor ve etkisi
   pratikte sonsuz.

   Bizimki uc yerde ayriliyor:
     1. CEVREDEKI dostlari da iyilestiriyor (asil "can verme" bu)
     2. Suresi belli (CAN_SURE) ve seviyeler makul
     3. Dusmanlari atliyor -- yoksa sana saldiran zombiyi de
        iyilestirirsin

   health_boost yerine absorption kullaniliyor: health_boost can
   barinin TAVANINI yukseltiyor ama bosunu doldurmuyor, yani
   yaralanmis birine hicbir sey yapmiyor. absorption ise ustune
   kalkan ekliyor ve suresi bitince temiz siliniyor.

   Anlik yetenek: tek tick'te bitiyor, surekli is birakmiyor,
   butce harcamiyor (tek getEntities cagrisi).                    */

function dostMu(varlik, oyuncu) {
  if (varlik.id === oyuncu.id) return false;          // kendisi ayrica isleniyor
  const tip = varlik.typeId;
  if (!tip) return false;
  if (tip === "minecraft:item" || tip === "minecraft:xp_orb") return false;
  return !CAN_DUSMAN.has(tip);
}

function iyilestir(varlik) {
  // Once anlik iyilestirme, sonra sureli olanlar. Sirasi onemli
  // degil ama instant_health'in tek basina da ise yaramasi icin
  // ilk o veriliyor -- digerleri desteklenmese bile can dolar.
  varlik.addEffect("instant_health", 1, {
    amplifier: CAN_ANLIK, showParticles: true
  });
  varlik.addEffect("regeneration", CAN_SURE, {
    amplifier: CAN_REJEN, showParticles: true
  });
  varlik.addEffect("absorption", CAN_SURE, {
    amplifier: CAN_KALKAN, showParticles: false
  });
}

yetenekKaydet({
  kimlik: "can_verme",
  ad: "Can Verme",
  esyasiz: true,
  sira: 100,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;

    // Kendini her halukarda iyilestir: cevrede kimse olmasa bile
    // yetenek bir ise yaramis olsun.
    let iyilesen = 0;
    try {
      iyilestir(oyuncu);
      iyilesen = 1;
    } catch (e) {
      hataYaz("can_verme.kendi", e);
    }

    let yakin;
    try {
      yakin = boyut.getEntities({
        location: oyuncu.location,
        maxDistance: CAN_YARICAP,
        excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
      });
    } catch (e) {
      hataYaz("can_verme.getEntities", e);
      yakin = [];
    }

    let atlanan = 0;
    for (const varlik of yakin) {
      // Tavan: kalabalik bir surunun ortasinda tick sismesin
      if (iyilesen >= CAN_TAVAN) break;
      try {
        if (!gecerliMi(varlik)) continue;
        if (!dostMu(varlik, oyuncu)) {
          atlanan++;
          continue;
        }
        iyilestir(varlik);
        iyilesen++;
      } catch (e) {
        hataYaz("can_verme.iyilestir", e);
      }
    }

    try {
      oyuncu.sendMessage(
        "§d" + iyilesen + " can yenilendi §7(" +
        (CAN_SURE / 20).toFixed(0) + " sn rejenerasyon + kalkan)" +
        (atlanan > 0 ? " §8· " + atlanan + " dusman atlandi" : "")
      );
    } catch (e) {
      hataYaz("can_verme.sendMessage", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek, surekli is yok
  }
});
