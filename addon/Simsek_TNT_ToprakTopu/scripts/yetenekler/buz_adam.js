import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, yukseklikAraligi, bilgiYaz
} from "../yardimcilar.js";
import {
  BUZ_MENZIL, BUZ_ACI, BUZ_SURE, BUZ_YARICAP, BUZ_YUKSEK,
  BUZ_BLOK, BUZ_YAVASLIK, BUZ_OYUNCU
} from "../ayarlar.js";

/* BUZ ADAM -- baktigin hedefi buz kabugunun icine hapseder.

   Referans mod bunu gorunum olarak yapiyordu: hedefin kafasina
   kilitli bir "buz adam" kaski takiyor (item_lock: lock_in_slot).
   Yani hedef aslinda SERBEST kaliyor, sadece kafasi buz gorunuyor,
   ve kaski cikarmanin yolu yok -- kalici.
   Ustelik "duzelt" fonksiyonlari "clear @a pa:buz_man" diyordu,
   yani bir kisiyi cozerken haritadaki HERKESI cozuyordu.

   Bizimki gercek bir hapis:
     1. Hedefin etrafina buz kabugu oruluyor
     2. Yavaslik veriliyor
     3. Sure dolunca buz kendiliginden eriyor
     4. Sadece HAVANIN yerine buz konuyor; erirken de yalnizca
        BIZIM koydugumuz buz kaldiriliyor. Hicbir sey yok olmuyor.

   Is uc asamali: ORME -> BEKLEME -> ERIME. Orme ve erime blok
   butcesine uyuyor, bekleme bedava.                              */

/* Kabuk hucreleri modul yuklenirken bir kez hesaplaniyor.
   Duvarlar + tavan; taban bilerek bos birakiliyor ki hedefin
   uzerinde durdugu blok degismesin.                              */
const KABUK = [];
for (let dx = -BUZ_YARICAP; dx <= BUZ_YARICAP; dx++) {
  for (let dz = -BUZ_YARICAP; dz <= BUZ_YARICAP; dz++) {
    for (let dy = 0; dy <= BUZ_YUKSEK; dy++) {
      const duvar = (Math.abs(dx) === BUZ_YARICAP || Math.abs(dz) === BUZ_YARICAP);
      const tavan = (dy === BUZ_YUKSEK);
      if (duvar ? dy < BUZ_YUKSEK : tavan) KABUK.push({ x: dx, y: dy, z: dz });
    }
  }
}

/* Bakis dogrultusundaki hedefi bulur.

   Once getEntitiesFromViewDirection denenir: tam nisan aldigin
   varligi verir. Bazi surumlerde yok, o zaman koni taramasina
   dusuluyor (savur.js'teki yontem) -- daha kaba ama her yerde
   calisiyor.                                                     */
let isinVar;

function hedefVarlik(oyuncu) {
  if (isinVar !== false) {
    try {
      if (typeof oyuncu.getEntitiesFromViewDirection === "function") {
        const vurus = oyuncu.getEntitiesFromViewDirection({ maxDistance: BUZ_MENZIL });
        isinVar = true;
        if (vurus && vurus.length > 0) {
          for (const v of vurus) {
            const varlik = v.entity || v;
            if (varlik && varlik.id !== oyuncu.id && gecerliMi(varlik)) return varlik;
          }
        }
        return undefined;   // isin calisti ama onunde kimse yok
      }
      isinVar = false;
      bilgiYaz("getEntitiesFromViewDirection yok, buz adam koni taramasina dusuyor.");
    } catch (e) {
      isinVar = false;
      hataYaz("buz_adam.isin", e);
    }
  }

  // Yedek: bakis konisindeki en yakin varlik
  let yakin;
  try {
    yakin = oyuncu.dimension.getEntities({
      location: oyuncu.location,
      maxDistance: BUZ_MENZIL,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) {
    hataYaz("buz_adam.getEntities", e);
    return undefined;
  }

  const merkez = oyuncu.location;
  const yon = oyuncu.getViewDirection();
  let enIyi, enYakin = Infinity;

  for (const varlik of yakin) {
    try {
      if (varlik.id === oyuncu.id || !gecerliMi(varlik)) continue;
      const k = varlik.location;
      const dx = k.x - merkez.x, dy = k.y - merkez.y, dz = k.z - merkez.z;
      const uzaklik = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (uzaklik < 0.001 || uzaklik >= enYakin) continue;
      if ((dx * yon.x + dy * yon.y + dz * yon.z) / uzaklik < BUZ_ACI) continue;
      enIyi = varlik;
      enYakin = uzaklik;
    } catch (e) {
      hataYaz("buz_adam.tarama", e);
    }
  }
  return enIyi;
}

yetenekKaydet({
  kimlik: "buz_adam",
  ad: "Buz Adam",
  esyasiz: true,
  sira: 120,

  olustur(oyuncu) {
    const boyut = oyuncu.dimension;
    const sinir = yukseklikAraligi(boyut);

    const hedef = hedefVarlik(oyuncu);
    if (!hedef) {
      try {
        oyuncu.sendMessage("§eOnunde donduracak bir sey yok.");
      } catch (e) { /* sohbet kapali olabilir */ }
      kollariIndir(oyuncu);
      return undefined;
    }

    if (hedef.typeId === "minecraft:player" && !BUZ_OYUNCU) {
      try {
        oyuncu.sendMessage("§eOyuncular dondurulmuyor (BUZ_OYUNCU kapali).");
      } catch (e) { /* sohbet kapali olabilir */ }
      kollariIndir(oyuncu);
      return undefined;
    }

    // Kabuk hedefin BASLANGIC yerine oruluyor; hedef hareket
    // ederse kabuk pesinden gitmiyor. Zaten yavaslatiliyor.
    let taban;
    try {
      const k = hedef.location;
      taban = { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };
    } catch (e) {
      hataYaz("buz_adam.location", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      hedef.addEffect("slowness", BUZ_SURE, {
        amplifier: BUZ_YAVASLIK, showParticles: true
      });
      hedef.addEffect("weakness", BUZ_SURE, {
        amplifier: 1, showParticles: false
      });
    } catch (e) {
      hataYaz("buz_adam.addEffect", e);
    }

    const ORME = 0, BEKLEME = 1, ERIME = 2;
    let asama = ORME;
    let i = 0;                    // ORME asamasinda sirada olan KABUK hucresi
    let eritilen = 0;             // ERIME asamasinda sirada olan konan[] girdisi
    let cozulmeTick = 0;
    const konan = [];             // SADECE bizim koydugumuz bloklar

    /* i ve eritilen AYRI sayaclar. Tek sayac kullanilsaydi is ORME
       sirasinda durdurulunca (oyuncu cikti, hata oldu) bitir() yanlis
       yerden baslar ve koydugumuz buzu temizlemeden birakirdi --
       i o anda KABUK indeksi, konan.length ise ondan kucuk.        */

    // getBlock'a verilen koordinat her hucrede yeniden uretilmesin
    const koord = { x: 0, y: 0, z: 0 };

    function hucre(n) {
      koord.x = taban.x + n.x;
      koord.y = taban.y + n.y;
      koord.z = taban.z + n.z;
      return koord;
    }

    return {
      ad: "buz_adam",
      oyuncuId: oyuncu.id,

      calis() {
        /* --- 1) ORME: hava olan hucrelere buz koy --- */
        if (asama === ORME) {
          while (i < KABUK.length) {
            const k = hucre(KABUK[i]);

            if (k.y < sinir.min || k.y > sinir.max) { i++; continue; }
            if (blokIste(2) < 2) return false;     // butce dolu

            try {
              const blok = boyut.getBlock(k);
              if (blok && blok.isAir) {
                blok.setType(BUZ_BLOK);
                konan.push({ x: k.x, y: k.y, z: k.z });
              }
            } catch (e) {
              hataYaz("buz_adam.orme", e);
            }
            i++;
          }

          asama = BEKLEME;
          cozulmeTick = system.currentTick + BUZ_SURE;
          return false;
        }

        /* --- 2) BEKLEME: bedava --- */
        if (asama === BEKLEME) {
          // Hedef oldu/kayboldu ise erken erit, buz bosuna durmasin
          if (system.currentTick >= cozulmeTick || !gecerliMi(hedef)) {
            asama = ERIME;
          }
          return false;
        }

        /* --- 3) ERIME: sadece BIZIM koydugumuz buzu kaldir --- */
        while (eritilen < konan.length) {
          if (blokIste(2) < 2) return false;

          const k = konan[eritilen];
          try {
            const blok = boyut.getBlock(k);
            // Baskasi kirmis ya da yerine bir sey koymus olabilir:
            // hala bizim buzumuzse kaldir, degilse dokunma.
            if (blok && blok.typeId === BUZ_BLOK) blok.setType("minecraft:air");
          } catch (e) {
            hataYaz("buz_adam.erime", e);
          }
          eritilen++;
        }
        return true;
      },

      bitir() {
        /* Guvenlik agi: is erken durdurulduysa (oyuncu cikti,
           hata oldu) geride buz kalmasin. Erime asamasini
           tamamlamissak eritilen === konan.length olur ve bu
           dongu hicbir sey yapmaz.                              */
        for (let j = eritilen; j < konan.length; j++) {
          try {
            const blok = boyut.getBlock(konan[j]);
            if (blok && blok.typeId === BUZ_BLOK) blok.setType("minecraft:air");
          } catch (e) {
            hataYaz("buz_adam.temizlik", e);
          }
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
