import { system } from "@minecraft/server";
import { blokIste } from "../butce.js";
import { hataYaz, kollariIndir, yukseklikAraligi } from "../yardimcilar.js";

/* ============================================================
   GECICI YAPI ISI
   "Blok koy, bir sure dursun, sonra kaldir" iki yetenekte de ayni:
     kubbe.js  -> oyuncunun etrafina koruma kabugu
     hapis.js  -> hedefin etrafina demir kafes
   Tek yerde toplandi.

   Referans modlarda (Dave1545 barrier, Kevin1545 hapis) bu isin
   UCU de yanlisti:
     1. DOLU kutu oruyorlardi -- Dave 50^3 = 125.000 blok
     2. var olan bloklarin ustune yaziyorlardi (fill'de "keep" yok),
        yani sandigina denk gelirse sandik gidiyordu
     3. GERI ALMIYORLARDI -- dunyada kalici iz birakiyorlardi

   Burasi ucunu de kapatiyor: sadece HAVA olan yere koyuyor,
   koydugu yerleri kaydediyor ve sure dolunca tek tek geri aliyor.

   secenekler:
     ad       gunluk adi
     oyuncu   tetikleyen oyuncu (is sahibi)
     merkez   {x,y,z} tam sayi merkez
     noktalar [{x,y,z}, ...] merkeze GORE offsetler (kabuk)
     blok     konacak blok tipi
     sure     kac tick dursun
     bittiMesaji(konanSayisi) -> string | undefined
   ============================================================ */

export function geciciYapiIsi(secenekler) {
  const { ad, oyuncu, merkez, noktalar, blok, sure, bittiMesaji } = secenekler;

  const boyut = oyuncu.dimension;
  const sinir = yukseklikAraligi(boyut);

  /* Sadece BIZIM koydugumuz yerler. Sokerken bu liste geziliyor,
     yani oyuncunun yapinin icinde ordugu bir sey silinmiyor.     */
  const konan = [];

  let i = 0;
  let oruyor = true;
  let sokIndeks = 0;
  let acilmaTick = 0;

  // Her blok icin yeni nesne uretmeyelim
  const _koord = { x: 0, y: 0, z: 0 };

  function sok(n) {
    _koord.x = n.x; _koord.y = n.y; _koord.z = n.z;
    const b = boyut.getBlock(_koord);
    if (!b) return;
    // Baskasi araya girip degistirdiyse dokunma
    if (b.typeId !== blok) return;
    b.setType("minecraft:air");
  }

  return {
    ad: ad,
    oyuncuId: oyuncu.id,

    calis() {
      /* --- 1. asama: yapiyi or --- */
      if (oruyor) {
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

        oruyor = false;
        acilmaTick = system.currentTick + sure;
        return false;
      }

      /* --- 2. asama: sureyi bekle --- */
      if (system.currentTick < acilmaTick) return false;

      /* --- 3. asama: koydugunu geri al --- */
      while (sokIndeks < konan.length) {
        if (blokIste(2) < 2) return false;      // butce dolu, sonraki tick
        try {
          sok(konan[sokIndeks++]);
        } catch (e) {
          hataYaz(ad + ".sokme", e);
        }
      }

      return true;
    },

    bitir() {
      /* DIKKAT: is yarida kesilebilir (oyuncu cikti, hata oldu).
         O durumda dunyada bizim bloklarimiz kalirdi. Burasi kalani
         butcesiz topluyor -- bitir() zaten nadiren calisiyor.     */
      for (let j = sokIndeks; j < konan.length; j++) {
        try {
          sok(konan[j]);
        } catch (e) {
          hataYaz(ad + ".bitir", e);
        }
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
