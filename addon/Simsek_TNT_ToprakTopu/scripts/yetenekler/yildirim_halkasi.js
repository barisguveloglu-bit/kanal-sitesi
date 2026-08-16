import { yetenekKaydet } from "./kayit.js";
import { yagmurIsi } from "./_yagmur.js";
import {
  SIMSEK_GRUP, SIMSEK_ARALIK,
  HALKA_SAYISI, HALKA_IC_YARICAP, HALKA_DIS_YARICAP
} from "../ayarlar.js";

/* Oyuncunun ETRAFINA yildirim yagar, baktigi yere degil.
   Esyasiz tetiklerken yukari bakmak gerektiginden "baktigi yer"
   gokyuzu olurdu ve yildirim gorunmeyecek kadar yukarida dogardi.
   Ayrica ustune duserse tetikleyen kisi kendi yildirimindan olurdu,
   o yuzden ic yaricap kadar guvenlik payi var.                    */
yetenekKaydet({
  kimlik: "yildirim_halkasi",
  ad: "Yildirim Halkasi",
  esyasiz: true,
  sira: 10,

  olustur(oyuncu) {
    const k = oyuncu.location;
    return yagmurIsi({
      ad: "yildirim_halkasi",
      oyuncu: oyuncu,
      hedef: { x: k.x, y: k.y, z: k.z },
      varlik: "minecraft:lightning_bolt",
      toplam: HALKA_SAYISI,
      yukseklik: 0,
      aralik: SIMSEK_ARALIK,
      grup: SIMSEK_GRUP,
      halka: { ic: HALKA_IC_YARICAP, dis: HALKA_DIS_YARICAP }
    });
  }
});
