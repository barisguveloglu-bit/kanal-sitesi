import { system } from "@minecraft/server";
import { blokIste } from "../butce.js";
import { hataYaz, kollariIndir, yukseklikAraligi } from "../yardimcilar.js";

/* ============================================================
   YAPI KURMA / SOKME ALTYAPISI
   "Blok koy" ve "koydugunu geri al" isini uc yetenek paylasiyor:
     kubbe.js  -> koy, BEKLE, kaldir  (sureli)
     hapis.js  -> koy ... sonra ayri bir tetiklemeyle kaldir
                  (suresiz, oyuncu ne zaman isterse)

   Referans modlarda (Dave1545 barrier, Kevin1545 hapis) bu isin
   UCU de yanlisti:
     1. DOLU kutu oruyorlardi -- Dave 50^3 = 125.000 blok
     2. var olan bloklarin ustune yaziyorlardi (fill'de "keep" yok)
     3. GERI ALMIYORLARDI -- Kevin1545'te tum pakette "iron_bars"
        tek bir yerde geciyor, o da kuran komut. Kafesi acan
        hicbir sey yok.
   ============================================================ */

/* Blok koyucu adimlayici. Her cagrida butcenin izin verdigi kadar
   blok koyar; bitince true doner. Koydugu yerleri "konan"a yazar.

   SADECE HAVA olan yere koyuyor -- referansin "keep"siz fill'inin
   duzeltmesi. Konan listesi de bu yuzden onemli: sokerken sadece
   BIZIM koydugumuz yerlere dokunuyoruz.                          */
function orucuYap(ad, boyut, merkez, noktalar, blok, konan) {
  const sinir = yukseklikAraligi(boyut);
  const _koord = { x: 0, y: 0, z: 0 };
  let i = 0;

  return function or() {
    while (i < noktalar.length) {
      const n = noktalar[i];
      const y = merkez.y + n.y;

      if (y < sinir.min || y > sinir.max) { i++; continue; }

      // Blok basina iki islem: bir okuma + bir yazma
      if (blokIste(2) < 2) return false;    // butce dolu, sonraki tick

      i++;
      try {
        _koord.x = merkez.x + n.x; _koord.y = y; _koord.z = merkez.z + n.z;
        const b = boyut.getBlock(_koord);
        if (!b) continue;                   // yuklenmemis chunk
        if (!b.isAir) continue;             // dolu yere dokunma
        b.setType(blok);
        konan.push({ x: _koord.x, y: _koord.y, z: _koord.z });
      } catch (e) {
        hataYaz(ad + ".setType", e);
      }
    }
    return true;
  };
}

/* Sokucu adimlayici. Baskasi araya girip blogu degistirdiyse
   dokunmuyor -- oyuncunun yapinin icinde ordugu sey silinmesin. */
function sokucuYap(ad, boyut, konan, blok) {
  const _koord = { x: 0, y: 0, z: 0 };
  let i = 0;

  function birTane(n) {
    _koord.x = n.x; _koord.y = n.y; _koord.z = n.z;
    const b = boyut.getBlock(_koord);
    if (!b) return;
    if (b.typeId !== blok) return;
    b.setType("minecraft:air");
  }

  return {
    sok() {
      while (i < konan.length) {
        if (blokIste(2) < 2) return false;   // butce dolu, sonraki tick
        try {
          birTane(konan[i++]);
        } catch (e) {
          hataYaz(ad + ".sokme", e);
        }
      }
      return true;
    },
    /* Butcesiz temizlik: is yarida kesilirse (oyuncu cikti, hata
       oldu) dunyada bizim bloklarimiz kalmasin diye.            */
    kalaniTopla() {
      for (let j = i; j < konan.length; j++) {
        try {
          birTane(konan[j]);
        } catch (e) {
          hataYaz(ad + ".kalaniTopla", e);
        }
      }
    }
  };
}

/* ---------------- Sureli yapi (kubbe) ----------------
   Koy -> sure kadar dur -> kaldir. Tek is icinde.              */
export function geciciYapiIsi(secenekler) {
  const { ad, oyuncu, merkez, noktalar, blok, sure, bittiMesaji } = secenekler;

  const boyut = oyuncu.dimension;
  const konan = [];
  const or = orucuYap(ad, boyut, merkez, noktalar, blok, konan);
  let sokucu = null;
  let oruyor = true;
  let acilmaTick = 0;

  return {
    ad: ad,
    oyuncuId: oyuncu.id,

    calis() {
      if (oruyor) {
        if (!or()) return false;
        oruyor = false;
        acilmaTick = system.currentTick + sure;
        sokucu = sokucuYap(ad, boyut, konan, blok);
        return false;
      }
      if (system.currentTick < acilmaTick) return false;
      return sokucu.sok();
    },

    bitir() {
      if (sokucu) sokucu.kalaniTopla();
      if (bittiMesaji) {
        try {
          const m = bittiMesaji(konan.length);
          if (m) oyuncu.sendMessage(m);
        } catch (e) {
          hataYaz(ad + ".sendMessage", e);
        }
      }
      kollariIndir(oyuncu);
    }
  };
}

/* ---------------- Sadece OR (hapis) ----------------
   Yapi kurulup is BITER; blok listesi bittiginde
   tamamlandi(konan) cagriliyor ki cagiran onu kaydedebilsin.
   Boylece yapi is yuvasini tutmuyor -- suresiz durabiliyor.    */
export function yapiOrIsi(secenekler) {
  const { ad, oyuncu, merkez, noktalar, blok, tamamlandi, bittiMesaji } = secenekler;

  const boyut = oyuncu.dimension;
  const konan = [];
  const or = orucuYap(ad, boyut, merkez, noktalar, blok, konan);
  let haberVerildi = false;

  return {
    ad: ad,
    oyuncuId: oyuncu.id,

    calis() {
      if (!or()) return false;
      if (!haberVerildi) {
        haberVerildi = true;
        try {
          tamamlandi(konan);
        } catch (e) {
          hataYaz(ad + ".tamamlandi", e);
        }
      }
      return true;
    },

    bitir() {
      /* Is yarida kesildiyse tamamlandi() hic cagrilmadi; o zaman
         koydugumuz bloklar kimsenin kaydinda degil, hemen topla.
         Yoksa dunyada sahipsiz kafes kalirdi.                    */
      if (!haberVerildi && konan.length > 0) {
        sokucuYap(ad, boyut, konan, blok).kalaniTopla();
      }
      if (bittiMesaji) {
        try {
          const m = bittiMesaji(konan.length);
          if (m) oyuncu.sendMessage(m);
        } catch (e) {
          hataYaz(ad + ".sendMessage", e);
        }
      }
      kollariIndir(oyuncu);
    }
  };
}

/* ---------------- Sadece SOK (hapis acma) ---------------- */
export function yapiSokIsi(secenekler) {
  const { ad, oyuncu, boyut, konan, blok, bittiMesaji } = secenekler;

  const sokucu = sokucuYap(ad, boyut, konan, blok);

  return {
    ad: ad,
    oyuncuId: oyuncu.id,
    calis() { return sokucu.sok(); },
    bitir() {
      sokucu.kalaniTopla();
      if (bittiMesaji) {
        try {
          const m = bittiMesaji(konan.length);
          if (m) oyuncu.sendMessage(m);
        } catch (e) {
          hataYaz(ad + ".sendMessage", e);
        }
      }
      kollariIndir(oyuncu);
    }
  };
}

/* Ici bos KUTU kabugu: |x| ya da |z| kenarda, ya da en alt/en ust
   kat. Ic hacim bos kalir -- referansin dolu fill'inin duzeltmesi. */
export function kutuKabugu(yariCap, yukseklik) {
  const noktalar = [];
  for (let x = -yariCap; x <= yariCap; x++) {
    for (let z = -yariCap; z <= yariCap; z++) {
      for (let y = 0; y <= yukseklik; y++) {
        const kenar = (Math.abs(x) === yariCap) || (Math.abs(z) === yariCap);
        if (kenar || y === 0 || y === yukseklik) noktalar.push({ x, y, z });
      }
    }
  }
  return noktalar;
}
