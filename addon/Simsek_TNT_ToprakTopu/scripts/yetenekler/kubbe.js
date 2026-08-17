import { yetenekKaydet } from "./kayit.js";
import { geciciYapiIsi } from "./_gecici_yapi.js";
import { hataYaz, kollariIndir, kureNoktalari } from "../yardimcilar.js";
import { KUBBE_YARICAP, KUBBE_SURE, KUBBE_BLOK } from "../ayarlar.js";

/* KORUMA KUBBESI -- etrafina gecici, gorunmez bir kabuk orer.

   Referans mod (Dave1545) tek satirdi:
     fill ~~50~~50~~0barrier
   Bosluksuz oldugu icin hic calismiyordu. Calissaydi 50x50x50'lik
   DOLU bir barrier kupu olurdu: 125.000 blok, tablette kesin
   donma, ustelik iceride sen de kalirdin ve GERI ALINMIYORDU --
   dunyada kalici bir gorunmez kup birakirdi.

   Buradaki fark:
     1. Dolu kup degil, ICI BOS kure kabugu (~134 blok)
     2. Sadece HAVA olan yere koyuyor; hicbir seyi yok etmiyor
     3. Koydugu yerleri kaydediyor, sure dolunca geri aliyor
     4. Blok butcesine uyuyor, hem orerken hem sokerken

   Koyma/kaldirma isinin tamami _gecici_yapi.js'te; hapis.js de
   ayni altyapiyi kullaniyor.                                     */

// Kabuk = yaricapa yakin bloklar. Bir kez hesaplanip saklaniyor.
const KABUK = kureNoktalari(KUBBE_YARICAP).filter((n) => {
  const u2 = n.x * n.x + n.y * n.y + n.z * n.z;
  const ic = KUBBE_YARICAP - 1;
  return u2 > ic * ic;
});

yetenekKaydet({
  kimlik: "kubbe",
  ad: "Koruma Kubbesi",
  esyasiz: true,
  sira: 140,

  olustur(oyuncu) {
    let merkez;
    try {
      const k = oyuncu.location;
      merkez = { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };
    } catch (e) {
      hataYaz("kubbe.location", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    return geciciYapiIsi({
      ad: "kubbe",
      oyuncu: oyuncu,
      merkez: merkez,
      noktalar: KABUK,
      blok: KUBBE_BLOK,
      sure: KUBBE_SURE,
      bittiMesaji: (n) => "§7Kubbe kapandi §8· " + n + " blok geri alindi"
    });
  }
});
