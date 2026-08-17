import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, kollariIndir, yukseklikAraligi, kureNoktalari
} from "../yardimcilar.js";
import { KUBBE_YARICAP, KUBBE_SURE, KUBBE_BLOK } from "../ayarlar.js";

/* KORUMA KUBBESI -- etrafina gecici, gorunmez bir kabuk orer.

   Referans mod (Dave1545) tek satirdi:
     fill ~~50~~50~~0barrier
   Bosluksuz oldugu icin hic calismiyordu. Calissaydi 50x50x50'lik
   DOLU bir barrier kupu olurdu: 125.000 blok, tablette kesin
   donma, ustelik iceride sen de kalirdin ve GERI ALINMIYORDU --
   dunyada kalici bir gorunmez kup birakirdi.

   Buradaki fark:
     1. Dolu kup degil, ICI BOS kure kabugu (~100 blok)
     2. Sadece HAVA olan yere koyuyor; hicbir seyi yok etmiyor
     3. Koydugu yerleri KAYDEDIYOR ve sure bitince tek tek geri
        aliyor -- kalici iz yok
     4. Blok butcesine uyuyor, hem orerken hem sokerken
     5. Sen icindesin ama ayaginin altina koymuyor (kabuk zaten
        kure yuzeyi), yani hapsolmuyorsun -- sure bitince acilir */

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
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    let merkez;
    try {
      const k = oyuncu.location;
      merkez = { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };
    } catch (e) {
      hataYaz("kubbe.location", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    /* Sadece BIZIM koydugumuz yerler. Sokerken bu listeyi
       geziyoruz, yani oyuncunun kubbe icinde ordugu bir sey
       yanlislikla silinmiyor.                                   */
    const konan = [];

    let i = 0;
    let oruyor = true;
    let sokIndeks = 0;
    let acilmaTick = 0;

    const _koord = { x: 0, y: 0, z: 0 };

    return {
      ad: "kubbe",
      oyuncuId: oyuncu.id,

      calis() {
        /* --- 1. asama: kabugu or --- */
        if (oruyor) {
          while (i < KABUK.length) {
            const n = KABUK[i];
            const y = merkez.y + n.y;

            if (y < sinir.min || y > sinir.max) { i++; continue; }

            // Blok basina iki islem: bir okuma + bir yazma
            if (blokIste(2) < 2) return false;    // butce dolu, sonraki tick

            i++;
            try {
              _koord.x = merkez.x + n.x; _koord.y = y; _koord.z = merkez.z + n.z;
              const blok = boyut.getBlock(_koord);
              if (!blok) continue;                // yuklenmemis chunk
              if (!blok.isAir) continue;          // dolu yere dokunma
              blok.setType(KUBBE_BLOK);
              konan.push({ x: _koord.x, y: _koord.y, z: _koord.z });
            } catch (e) {
              hataYaz("kubbe.setType", e);
            }
          }

          oruyor = false;
          acilmaTick = system.currentTick + KUBBE_SURE;
          return false;
        }

        /* --- 2. asama: sureyi bekle --- */
        if (system.currentTick < acilmaTick) return false;

        /* --- 3. asama: koydugunu geri al --- */
        while (sokIndeks < konan.length) {
          if (blokIste(2) < 2) return false;      // butce dolu, sonraki tick

          const n = konan[sokIndeks++];
          try {
            _koord.x = n.x; _koord.y = n.y; _koord.z = n.z;
            const blok = boyut.getBlock(_koord);
            if (!blok) continue;
            // Baskasi araya girip degistirdiyse dokunma
            if (blok.typeId !== KUBBE_BLOK) continue;
            blok.setType("minecraft:air");
          } catch (e) {
            hataYaz("kubbe.sokme", e);
          }
        }

        return true;
      },

      bitir() {
        /* DIKKAT: is yarida kesilebilir (oyuncu cikti, hata oldu).
           O durumda dunyada gorunmez barrier bloklari kalirdi.
           Burasi kalan her seyi butcesiz, tek seferde topluyor --
           bitir() zaten tick basina bir kez ve nadiren calisiyor. */
        for (let j = sokIndeks; j < konan.length; j++) {
          const n = konan[j];
          try {
            _koord.x = n.x; _koord.y = n.y; _koord.z = n.z;
            const blok = boyut.getBlock(_koord);
            if (blok && blok.typeId === KUBBE_BLOK) blok.setType("minecraft:air");
          } catch (e) {
            hataYaz("kubbe.bitir", e);
          }
        }

        try {
          oyuncu.sendMessage("§7Kubbe kapandi §8· " + konan.length + " blok geri alindi");
        } catch (e) {
          hataYaz("kubbe.sendMessage", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
