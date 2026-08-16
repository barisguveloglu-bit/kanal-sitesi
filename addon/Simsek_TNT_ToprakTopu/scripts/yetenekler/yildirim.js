import { yetenekKaydet } from "./kayit.js";
import { yagmurIsi } from "./_yagmur.js";
import { hedefBul, kollariIndir } from "../yardimcilar.js";
import {
  SIMSEK_ESYA, MENZIL, SIMSEK_SAYISI, SIMSEK_GRUP, SIMSEK_ARALIK
} from "../ayarlar.js";

/* Baktigin noktaya simsek yagmuru. */
yetenekKaydet({
  kimlik: "yon_simsegi",
  ad: "Yon Simsegi",
  esya: SIMSEK_ESYA,
  esyasiz: true,
  sira: 20,

  olustur(oyuncu) {
    const hedef = hedefBul(oyuncu, MENZIL);
    if (!hedef) {
      kollariIndir(oyuncu);
      return undefined;
    }
    return yagmurIsi({
      ad: "yon_simsegi",
      oyuncu: oyuncu,
      hedef: hedef,
      varlik: "minecraft:lightning_bolt",
      toplam: SIMSEK_SAYISI,
      yukseklik: 0,
      aralik: SIMSEK_ARALIK,
      grup: SIMSEK_GRUP,
      halka: null
    });
  }
});
