import { system } from "@minecraft/server";
import { varlikIste } from "../butce.js";
import { hataYaz, kollariIndir, yukseklikAraligi } from "../yardimcilar.js";
import { YAYILMA } from "../ayarlar.js";

/* ============================================================
   ORTAK YAGMUR ISI
   Simsek, TNT ve yildirim halkasi ayni isi yapiyor: bir merkezin
   etrafina parti parti varlik dogurmak. Tek yerde toplandi.

   secenekler:
     ad        gunluk adi
     oyuncu    tetikleyen oyuncu
     hedef     {x,y,z} merkez
     varlik    dogurulacak varlik tipi
     toplam    kac tane
     yukseklik merkezin kac blok ustunde dogsun
     aralik    partiler arasi tick
     grup      her partide kac tane
     halka     {ic, dis} verilirse merkez etrafinda halkaya dagitir,
               verilmezse kare alana saçar
   ============================================================ */

export function yagmurIsi(secenekler) {
  const { ad, oyuncu, hedef, varlik, toplam, yukseklik, aralik, grup, halka } = secenekler;

  const boyut = oyuncu.dimension;
  const sinir = yukseklikAraligi(boyut);
  const oyuncuId = oyuncu.id;

  // Her dogumda yeni nesne uretmek yerine tek nesneyi yeniden kullan
  const nokta = { x: 0, y: 0, z: 0 };

  let dogan = 0;
  let sonrakiTick = system.currentTick;

  return {
    ad: ad,
    oyuncuId: oyuncuId,

    calis() {
      if (system.currentTick < sonrakiTick) return false;

      const kalan = toplam - dogan;
      const izin = varlikIste(grup < kalan ? grup : kalan);
      if (izin === 0) return false;   // butce dolu, sonraki tick'te devam

      for (let i = 0; i < izin; i++) {
        if (halka) {
          // Halkaya dagit: ic yaricaptan yakina dusmesin ki
          // tetikleyen kisi kendi yildirimindan olmesin.
          const aci = Math.random() * Math.PI * 2;
          const mesafe = halka.ic + Math.random() * (halka.dis - halka.ic);
          nokta.x = hedef.x + Math.cos(aci) * mesafe;
          nokta.y = hedef.y + yukseklik;
          nokta.z = hedef.z + Math.sin(aci) * mesafe;
        } else {
          nokta.x = hedef.x + (Math.random() * 2 - 1) * YAYILMA;
          nokta.y = hedef.y + yukseklik;
          nokta.z = hedef.z + (Math.random() * 2 - 1) * YAYILMA;
        }

        // Sinir disina dogurmayi istisna yerine atlayarak gec
        if (nokta.y < sinir.min || nokta.y > sinir.max) {
          dogan++;
          continue;
        }

        try {
          boyut.spawnEntity(varlik, nokta);
        } catch (e) {
          hataYaz(ad + ".spawnEntity", e);
        }
        dogan++;
      }

      sonrakiTick = system.currentTick + aralik;
      return dogan >= toplam;
    },

    bitir() {
      kollariIndir(oyuncu);
    }
  };
}
