import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, kollariIndir, yukseklikAraligi, parcacikAt
} from "../yardimcilar.js";
import {
  DUVAR_UZAKLIK, DUVAR_GENISLIK, DUVAR_YUKSEK, DUVAR_DERINLIK,
  DUVAR_BLOK, PARCACIK_TOPRAK
} from "../ayarlar.js";

/* TOPRAK DUVAR -- onune topraktan bir duvar orer.

   Referans bunu tek satirda yapiyordu:
     fill ^1^5^6 ^-2^^6 dirt
   Yani sabit olculu bir kutuyu doldurup gecmek. Iki sorunu var:
     1. "fill" orada ne varsa YOK EDIYOR -- evinin duvarina
        denk gelirse evin gider
     2. tek tick'te 100+ blok yaziyor, tablette takilma yapar

   Bizimki:
     - blok butcesine uyuyor, tick basina en fazla tavan kadar
     - sadece HAVANIN yerine koyuyor, hicbir sey yok etmiyor
     - dunya sinirinin disina tasmiyor

   GEOMETRI: duvar bakis yonune DIK durmali. Yatay bakis yonu
   (bx, bz) ise ona dik olan yon (bz, -bx) -- duvarin genislik
   ekseni bu. Dikey eksen zaten y.                              */
yetenekKaydet({
  kimlik: "toprak_duvar",
  ad: "Toprak Duvar",
  esyasiz: true,
  sira: 160,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    let yer, yon;
    try {
      yer = oyuncu.location;
      yon = oyuncu.getViewDirection();
    } catch (e) {
      hataYaz("toprak_duvar.baslangic", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    // Yatay bakis yonu (y atiliyor, duvar dik dursun)
    const uzunluk = Math.hypot(yon.x, yon.z);
    if (uzunluk < 0.001) {
      // Tam yukari/asagi bakiyor: duvarin yonu belirsiz
      try {
        oyuncu.sendMessage("§eDuvar icin ileri bakman lazim.");
      } catch (e) { /* sohbet kapali olabilir */ }
      kollariIndir(oyuncu);
      return undefined;
    }
    const bx = yon.x / uzunluk, bz = yon.z / uzunluk;

    // Bakis yonune dik eksen: duvarin genisligi bu yonde uzuyor
    const gx = bz, gz = -bx;

    const taban = {
      x: Math.floor(yer.x + bx * DUVAR_UZAKLIK),
      y: Math.floor(yer.y),
      z: Math.floor(yer.z + bz * DUVAR_UZAKLIK)
    };

    /* Hucreler onceden hesaplaniyor. Sira ONEMLI: asagidan yukari
       ve ortadan disa dogru oruluyor ki butce yetmezse duvar
       "yarim ama ise yarar" kalsin -- rastgele delikli degil.   */
    const hucreler = [];
    for (let d = 0; d < DUVAR_DERINLIK; d++) {
      for (let y = 0; y < DUVAR_YUKSEK; y++) {
        for (let g = 0; g <= DUVAR_GENISLIK; g++) {
          for (const isaret of (g === 0 ? [0] : [-1, 1])) {
            const k = g * isaret;
            hucreler.push({
              x: taban.x + Math.round(gx * k + bx * d),
              y: taban.y + y,
              z: taban.z + Math.round(gz * k + bz * d)
            });
          }
        }
      }
    }

    let i = 0, konan = 0, dolu = 0;

    return {
      ad: "toprak_duvar",
      oyuncuId: oyuncu.id,

      calis() {
        while (i < hucreler.length) {
          const k = hucreler[i];

          if (k.y < sinir.min || k.y > sinir.max) { i++; continue; }
          if (blokIste(2) < 2) return false;      // butce dolu

          try {
            const blok = boyut.getBlock(k);
            if (blok && blok.isAir) {
              blok.setType(DUVAR_BLOK);
              konan++;
            } else if (blok) {
              dolu++;
            }
          } catch (e) {
            hataYaz("toprak_duvar.setType", e);
          }
          i++;
        }
        return true;
      },

      bitir() {
        // Duvarin ortasinda tek parcacik: nereye orduldugu belli olsun
        parcacikAt(boyut, PARCACIK_TOPRAK, {
          x: taban.x + 0.5,
          y: taban.y + DUVAR_YUKSEK / 2,
          z: taban.z + 0.5
        });

        try {
          oyuncu.sendMessage(
            "§6Toprak duvar §7· " + konan + " blok" +
            (dolu > 0 ? " §8· " + dolu + " yer doluydu, atlandi" : "")
          );
        } catch (e) {
          hataYaz("toprak_duvar.sendMessage", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
