import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, kollariIndir, koniHedefleri } from "../yardimcilar.js";
import {
  CAN_VER_MENZIL, CAN_VER_ACI, CAN_VER_TAVAN, CAN_VER_MIKTAR,
  CAN_VER_SURE, CAN_VER_SIDDET, CAN_VER_KALKAN, CAN_VER_KENDINE,
  CAN_VER_DOSTLAR
} from "../ayarlar.js";

/* CAN VERME -- Anna Kolu'nun kimligi.

   ---- KAYNAKTAN NEYIN ALINMADIGI ----
   fear1545'in kol modunda Anna'nin can vermesi su iki satir:
       effect @s health_boost 100000 255 true
       effect @s instant_health 1 255
   Yani KENDINE sinirsiz can. Alinmadi, cunku:

     1. Bu depoda can_verme v4.33'te SILINMISTI ve gerekcesi
        kullanicinin kendi sozu: "zaten hem kalp ekleme var,
        hem iksir icince onun 4-5 kati sureyle yenilenme
        geliyor; artik gereksizlesti."
     2. health_boost 255 sinirsiz can demek -- oynanisi
        bitirir.

   ---- BUNUN YERINE: BASKASINA ----
   Depoda hicbir sey BASKA bir varligi iyilestirmiyor
   (kalp_ekle kendine, iksirler kendine, bot_ilkel botun
   kendi pasifi). Anna'nin adi zaten "can VERME" -- yon
   degistirince hem kaynagin kimligi korunuyor hem de silinen
   yetenegin kopyasi olmuyor.

   ---- DUSMANI IYILESTIRMEZ ----
   Bedrock'ta "bu varlik bana dost mu" diye sorulamiyor;
   evcillestirme sahibi script'ten okunamiyor. Sorulabilen tek
   sey TUR. O yuzden DUSMAN listesi degil IZIN listesi
   kullaniliyor: yeni bir dusman mob ciktiginda liste
   eskimesin, sadece o mob iyilesmesin.                       */

function canBileseni(varlik) {
  try {
    return varlik.getComponent("minecraft:health");
  } catch (e) {
    return undefined;
  }
}

/* Cani doldurur. Uc yol sirayla deneniyor -- ayni kalip
   _kalp_defteri.js:canDoldur'da da var: resetToMaxValue her
   surumde yok, setCurrentValue bazen tavani vermiyor, en
   sonda instant_health kaliyor. */
export function canVer(varlik, miktar) {
  const c = canBileseni(varlik);
  try {
    if (c && typeof c.setCurrentValue === "function") {
      const simdi = (typeof c.currentValue === "number") ? c.currentValue : 0;
      const tavan = (typeof c.effectiveMax === "number")
        ? c.effectiveMax : simdi + miktar;
      const yeni = Math.min(tavan, simdi + miktar);
      if (yeni > simdi) {
        c.setCurrentValue(yeni);
        return true;
      }
      return false;            // zaten dolu
    }
  } catch (e) {
    hataYaz("can_ver.setCurrentValue", e);
  }
  try {
    varlik.addEffect("instant_health", 1, { amplifier: 4, showParticles: true });
    return true;
  } catch (e) {
    return false;
  }
}

export function dostMu(varlik) {
  try {
    return CAN_VER_DOSTLAR.includes(varlik.typeId);
  } catch (e) {
    return false;
  }
}

yetenekKaydet({
  kimlik: "can_ver",
  ad: "Can Verme",
  /* 145 ILK YAZIMDA SECILMISTI ve Viltrumite'in kubbe'siyle
     carpisti; viltrumite.mjs "jest sirasi carpismiyor" diye
     bagirdi. 141 bos -- 140 ucurma, 145 kubbe.
     Ucurma'nin hemen yanina konuldu: ikisi de Anna Kolu'nda,
     menude yan yana dursunlar.                              */
  sira: 141,

  olustur(oyuncu) {
    const hedefler = koniHedefleri(oyuncu, {
      menzil: CAN_VER_MENZIL,
      aci: CAN_VER_ACI,
      tavan: CAN_VER_TAVAN,
      oyuncuDahil: true
    });

    let sayi = 0, atlanan = 0;
    for (const hedef of hedefler) {
      try {
        if (!gecerliMi(hedef)) continue;
        if (!dostMu(hedef)) { atlanan++; continue; }
        let oldu = canVer(hedef, CAN_VER_MIKTAR);
        try {
          hedef.addEffect("regeneration", CAN_VER_SURE,
                          { amplifier: CAN_VER_SIDDET, showParticles: true });
          hedef.addEffect("absorption", CAN_VER_KALKAN,
                          { amplifier: 1, showParticles: false });
          oldu = true;
        } catch (e) { /* efekt yoksa dogrudan can yine verildi */ }
        if (oldu) sayi++;
      } catch (e) {
        hataYaz("can_ver.hedef", e);
      }
    }

    if (CAN_VER_KENDINE) {
      try {
        canVer(oyuncu, CAN_VER_MIKTAR);
        oyuncu.addEffect("regeneration", CAN_VER_SURE,
                         { amplifier: CAN_VER_SIDDET, showParticles: true });
      } catch (e) { /* */ }
    }

    try {
      oyuncu.sendMessage(
        sayi > 0
          ? "§a" + sayi + " dosta can verildi."
          : (atlanan > 0
             ? "§eOnundekiler dost degil §8· can yalnizca dostlara geciyor"
             : "§eOnunde can verecek kimse yok."));
    } catch (e) {
      hataYaz("can_ver.sendMessage", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
