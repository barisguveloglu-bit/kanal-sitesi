import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import { hedefBul, hataYaz, kollariIndir, yukseklikAraligi } from "../yardimcilar.js";
import {
  MENZIL, ORS_SAYISI, ORS_YAYILMA, ORS_YUKSEK, ORS_ARALIK, ORS_BLOK
} from "../ayarlar.js";

/* ORS YAGDIR -- baktigin noktanin uzerine ors yagar.

   Referans mod tek satirdi:
     execute @s^^^6 /setblock ~~10~ anvil
   Yani tek ors, sabit 6 blok ileri, ne oldugunu gozetmeden.
   Orada ne varsa YOK EDIYOR -- sandiginin ustune denk gelirse
   sandik gider.

   Bizimki:
     1. Nisan aldigin noktanin etrafina birden fazla ors yagiyor
     2. Sadece HAVA olan yere koyuyor, hicbir seyi yok etmiyor
     3. Blok butcesine uyuyor, tick sismiyor
     4. Dunya sinirinin disina cikmiyor

   Ors DUSMESI vanilla fizigi: havada birakilan ors kendiliginden
   dusen bloga donusuyor ve altindakine hasar veriyor. Bizim ayrica
   hasar hesaplamamiza gerek yok, oyun yapiyor.                    */
yetenekKaydet({
  kimlik: "ors",
  ad: "Ors Yagdir",
  esyasiz: true,
  sira: 110,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    const hedef = hedefBul(oyuncu, MENZIL);
    if (!hedef) {
      kollariIndir(oyuncu);
      return undefined;
    }

    /* Yerler onceden hesaplaniyor: her tick Math.random cagirip
       nesne uretmek yerine bir kez. (Toprak topundaki ve
       meteordaki ayni yaklasim.)                                 */
    const noktalar = [];
    for (let i = 0; i < ORS_SAYISI; i++) {
      noktalar.push({
        x: Math.floor(hedef.x + (Math.random() * 2 - 1) * ORS_YAYILMA),
        y: Math.floor(hedef.y + ORS_YUKSEK),
        z: Math.floor(hedef.z + (Math.random() * 2 - 1) * ORS_YAYILMA)
      });
    }

    let i = 0;
    let konan = 0;
    let dolu = 0;                       // hava olmadigi icin atlanan
    let sonrakiTick = system.currentTick;

    return {
      ad: "ors",
      oyuncuId: oyuncu.id,

      calis() {
        if (system.currentTick < sonrakiTick) return false;
        if (i >= noktalar.length) return true;

        const nokta = noktalar[i];

        // Sinir disindaysa butce harcamadan atla
        if (nokta.y < sinir.min || nokta.y > sinir.max) {
          i++;
          return i >= noktalar.length;
        }

        // Iki blok islemi: bir okuma (hava mi?) + bir yazma
        if (blokIste(2) < 2) return false;   // butce dolu, sonraki tick

        try {
          const blok = boyut.getBlock(nokta);
          if (!blok) {
            // Chunk yuklu degil: bu orsu atla, hata degil
            i++;
          } else if (blok.isAir) {
            blok.setType(ORS_BLOK);
            konan++;
            i++;
          } else {
            dolu++;
            i++;
          }
        } catch (e) {
          hataYaz("ors.setType", e);
          i++;
        }

        sonrakiTick = system.currentTick + ORS_ARALIK;
        return i >= noktalar.length;
      },

      bitir() {
        try {
          oyuncu.sendMessage(
            "§7" + konan + " ors dustu" +
            (dolu > 0 ? " §8· " + dolu + " yer doluydu, atlandi" : "")
          );
        } catch (e) {
          hataYaz("ors.sendMessage", e);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
