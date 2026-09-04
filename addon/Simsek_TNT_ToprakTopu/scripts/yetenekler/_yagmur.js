import { system } from "@minecraft/server";
import { varlikIste } from "../butce.js";
import {
  hataYaz, kollariIndir, yukseklikAraligi, varlikKonumu
} from "../yardimcilar.js";
import { YAYILMA, KILIT_YAYILMA } from "../ayarlar.js";

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
     kilit     verilirse merkez SABIT DEGIL: her partide bu varligin
               o anki konumu okunur, yani hedef kacsa da pesinden
               gider. Kacilmaz olmasin diye sacilma da daralir.
               Varlik olur/kaybolursa son bilinen yere devam edilir.
   ============================================================ */

export function yagmurIsi(secenekler) {
  const {
    ad, oyuncu, hedef, varlik, toplam, yukseklik, aralik, grup, halka, kilit,
    /* v4.29: botlar da bu isi kullaniyor. Botun kolu yok
       (kolIndir false) ve is oyuncunun kovasinda degil
       'bot:' kovasinda sayilmali (oyuncuId).            */
    oyuncuId: isKovasi, kolIndir
  } = secenekler;

  const boyut = oyuncu.dimension;
  const sinir = yukseklikAraligi(boyut);
  const oyuncuId = isKovasi || oyuncu.id;

  // Her dogumda yeni nesne uretmek yerine tek nesneyi yeniden kullan
  const nokta = { x: 0, y: 0, z: 0 };

  /* Kilitli hedefte merkez her partide tazelenir. Sabit bir nesne
     tutup icini guncelliyoruz ki tick basina yeni nesne olmasin. */
  const merkez = { x: hedef.x, y: hedef.y, z: hedef.z };
  const sacilma = kilit ? KILIT_YAYILMA : YAYILMA;

  function merkeziTazele() {
    if (!kilit) return;
    const k = varlikKonumu(kilit);
    if (!k) return;            // hedef oldu/kayboldu: son yere yagmaya devam
    merkez.x = k.x; merkez.y = k.y; merkez.z = k.z;
  }

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

      merkeziTazele();

      for (let i = 0; i < izin; i++) {
        if (halka) {
          // Halkaya dagit: ic yaricaptan yakina dusmesin ki
          // tetikleyen kisi kendi yildirimindan olmesin.
          const aci = Math.random() * Math.PI * 2;
          const mesafe = halka.ic + Math.random() * (halka.dis - halka.ic);
          nokta.x = merkez.x + Math.cos(aci) * mesafe;
          nokta.y = merkez.y + yukseklik;
          nokta.z = merkez.z + Math.sin(aci) * mesafe;
        } else {
          nokta.x = merkez.x + (Math.random() * 2 - 1) * sacilma;
          nokta.y = merkez.y + yukseklik;
          nokta.z = merkez.z + (Math.random() * 2 - 1) * sacilma;
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
      if (kolIndir !== false) kollariIndir(oyuncu);
    }
  };
}
