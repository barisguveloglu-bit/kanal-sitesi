import { yetenekKaydet } from "./kayit.js";
import { yagmurIsi } from "./_yagmur.js";
import { hedefBul, kollariIndir } from "../yardimcilar.js";
import {
  TNT_ESYA, MENZIL, TNT_SAYISI, TNT_YUKSEKLIK, TNT_GRUP, TNT_ARALIK
} from "../ayarlar.js";

/* Baktigin noktanin ustunden TNT yagmuru. */
yetenekKaydet({
  kimlik: "tnt_yagmuru",
  ad: "TNT Yagmuru",
  esya: TNT_ESYA,
  esyasiz: true,
  sira: 40,

  olustur(oyuncu) {
    const hedef = hedefBul(oyuncu, MENZIL);
    if (!hedef) {
      kollariIndir(oyuncu);
      return undefined;
    }
    return yagmurIsi({
      ad: "tnt_yagmuru",
      oyuncu: oyuncu,
      hedef: hedef,
      varlik: "minecraft:tnt",
      toplam: TNT_SAYISI,
      yukseklik: TNT_YUKSEKLIK,
      aralik: TNT_ARALIK,
      grup: TNT_GRUP,
      halka: null
    });
  }
});
