import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, kollariIndir, yukseklikAraligi, parcacikAt
} from "../yardimcilar.js";
import { ISIN_MENZIL, ISIN_ADIM, PARCACIK_BUZ } from "../ayarlar.js";

/* ISINLANMA -- baktigin yone kisa mesafe atlar.

   Referans ("Kevin1545 Sword (isinlanma)") tek satirdi:
     tp @s ^^^8
   Duvar olsun olmasin 8 blok ileri isinliyor. Tasin icine
   girersen bogulup oluyorsun -- kontrol yok.

   Bizimki once GUVENLI YER ariyor: uzaktan yakina dogru bakip
   ayagin (y) ve basin (y+1) icin bos yer bulunan ilk noktaya
   gidiyor. Hicbiri uygun degilse isinlanmiyor ve sebebini
   soyluyor -- sessizce duvara gommek yerine.

   Uzaktan yakina taramanin sebebi: mumkun olan EN UZAK guvenli
   noktaya gitmek istiyoruz, ilk bos noktaya degil.              */
yetenekKaydet({
  kimlik: "isinlanma",
  ad: "Isinlanma",
  esyasiz: true,
  sira: 210,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    let bas, yon;
    try {
      bas = oyuncu.location;
      yon = oyuncu.getViewDirection();
    } catch (e) {
      hataYaz("isinlanma.baslangic", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    const koord = { x: 0, y: 0, z: 0 };

    function bosMu(x, y, z) {
      if (y < sinir.min || y + 1 > sinir.max) return false;
      try {
        koord.x = x; koord.y = y; koord.z = z;
        const ayak = boyut.getBlock(koord);
        koord.y = y + 1;
        const kafa = boyut.getBlock(koord);
        return !!(ayak && kafa && ayak.isAir && kafa.isAir);
      } catch (e) {
        return false;   // chunk yuklu degil: guvenli sayma
      }
    }

    let hedef;
    for (let d = ISIN_MENZIL; d >= ISIN_ADIM; d -= ISIN_ADIM) {
      const x = Math.floor(bas.x + yon.x * d);
      const y = Math.floor(bas.y + yon.y * d);
      const z = Math.floor(bas.z + yon.z * d);
      if (bosMu(x, y, z)) {
        hedef = { x: x + 0.5, y: y, z: z + 0.5 };
        break;
      }
    }

    if (!hedef) {
      try {
        oyuncu.sendMessage("§eIsinlanacak bos yer yok, onun kapali.");
      } catch (e) { /* sohbet kapali olabilir */ }
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      parcacikAt(boyut, PARCACIK_BUZ, bas);
      oyuncu.teleport(hedef, { dimension: boyut });
      parcacikAt(boyut, PARCACIK_BUZ, hedef);
    } catch (e) {
      hataYaz("isinlanma.teleport", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
