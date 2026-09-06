import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kilitliHedef, varlikKonumu, hedefBul, actionbarYaz
} from "../yardimcilar.js";
import { varlikIste } from "../butce.js";
import {
  TEK_SIMSEK_ACIK, TEK_SIMSEK_SIRA, TEK_SIMSEK_BEKLEME,
  TEK_SIMSEK_MENZIL, TEK_SIMSEK_UZAK,
  KILIT_ACI, SIMSEK_OYUNCU_HEDEF
} from "../ayarlar.js";

/* TEK SIMSEK -- nisan aldigin yere BIR simsek, hemen.

   ---- NEREDEN GELDI ----
   Kullanici iki eklenti gonderdi ve sordu: "bir tanesinde tek
   tek Simsek atabiliyorsun ... onun nasil yaptigina bir bak."

   Iki kaynakta iki ayri yol var, ikisi de ayni ise cikiyor:

     Kevin1545 · yildirim.mcfunction  (TEK SATIR)
       summon lightning_bolt ^^^12
     Boby1545 · menu.js "1535_0"
       getEntitiesFromRay -> getBlockFromRay -> yon*12
       sonra tek summon lightning_bolt

   Bizde dort simsek yetenegi vardi ve DORDU DE YAGMUR
   (SIMSEK_SAYISI tane, SIMSEK_ARALIK tickte bir). Tek bir
   moba nisan alip bir kere basmak diye bir sey yoktu.

   ---- KAYNAKTAN AYRILAN UC SEY ----
   1. Kevin'in `^^^12`si arada DUVAR OLSA DA 12 blok ileri
      vuruyor, yani duvarin arkasina. Burada uc kademe var ve
      "12 blok ileri" yalnizca UCUNCU kademe: once varliga,
      sonra bloga nisan aliniyor. Duvara bakarken duvara
      vuruyor -- kaynakta oyle degil.
   2. Bekleme esyada degil JS'te. Kaynak `minecraft:cooldown`
      kullaniyor; bu depodaki butun beklemeler tek yerden
      (ayarlar.js) okunuyor ve tek yerden degistiriliyor.
   3. IS ACMIYOR. Bir tick, bir varlik, bitti. Yagmur isi
      acsaydi "tek tek basma" hissi kaybolurdu -- yetenegin
      var olma sebebi zaten bu.                              */

// oyuncuId -> en son ne zaman atti (tick)
const sonAtis = new Map();

export function tekSimsekUnut(oyuncuId) {
  if (oyuncuId === undefined) sonAtis.clear();
  else sonAtis.delete(oyuncuId);
}

/* UC KADEMELI NISAN -- Boby'nin menu.js'indeki sira.
   Geriye { nokta, varlik } donuyor; varlik yalniz ilk
   kademede dolu (actionbar'da adini yazabilmek icin).

   Kademeler AYRI try'larda degil ayri fonksiyon cagrilarinda:
   kilitliHedef ve hedefBul kendi hatalarini kendileri
   yutuyor, ikisi de undefined donebiliyor.                  */
function nisanAl(oyuncu) {
  // 1. VARLIK -- artinin ustundeki canli
  const kilit = kilitliHedef(oyuncu, {
    menzil: TEK_SIMSEK_MENZIL,
    aci: KILIT_ACI,
    oyuncuDahil: SIMSEK_OYUNCU_HEDEF
  });
  if (kilit) {
    const k = varlikKonumu(kilit);
    if (k) return { nokta: k, varlik: kilit };
  }

  // 2. BLOK -- baktigin yuzey
  const nokta = hedefBul(oyuncu, TEK_SIMSEK_MENZIL);
  if (nokta) return { nokta: nokta, varlik: undefined };

  // 3. Hicbiri yoksa TEK_SIMSEK_UZAK blok ileri (kaynagin
  //    davranisi). hedefBul zaten bu yola dusuyor ama
  //    getViewDirection da patlayabilir; o zaman burasi.
  try {
    const yon = oyuncu.getViewDirection();
    const b = oyuncu.location;
    return {
      nokta: {
        x: b.x + yon.x * TEK_SIMSEK_UZAK,
        y: b.y + yon.y * TEK_SIMSEK_UZAK,
        z: b.z + yon.z * TEK_SIMSEK_UZAK
      },
      varlik: undefined
    };
  } catch (e) {
    hataYaz("tek_simsek.nisan", e);
    return undefined;
  }
}

function kisaAd(varlik) {
  try {
    if (varlik.typeId === "minecraft:player") return varlik.name || "oyuncu";
    return String(varlik.typeId).replace("minecraft:", "");
  } catch (e) {
    return "hedef";
  }
}

yetenekKaydet({
  kimlik: "tek_simsek",
  ad: "Tek Şimşek",
  esyasiz: true,
  sira: TEK_SIMSEK_SIRA,

  olustur(oyuncu) {
    if (!TEK_SIMSEK_ACIK) return undefined;
    if (!gecerliMi(oyuncu)) return undefined;

    const simdi = system.currentTick;
    const onceki = sonAtis.get(oyuncu.id);
    if (onceki !== undefined && simdi - onceki < TEK_SIMSEK_BEKLEME) {
      return undefined;      // sessiz: hizli basmak ceza degil
    }

    /* Butce KOYMADAN ONCE soruluyor. Tek varlik ama kural
       kural: tavani asan tickte bu da beklemeli, yoksa
       "tek varlik zaten ucuz" diyen her yetenek birikip
       tavani anlamsizlastirir.                              */
    if (!varlikIste(1)) return undefined;

    const hedef = nisanAl(oyuncu);
    if (!hedef) return undefined;
    sonAtis.set(oyuncu.id, simdi);

    try {
      oyuncu.dimension.spawnEntity("minecraft:lightning_bolt", hedef.nokta);
    } catch (e) {
      hataYaz("tek_simsek.spawn", e);
      return undefined;
    }

    try {
      actionbarYaz(oyuncu, hedef.varlik
        ? "§e⚡ §f" + kisaAd(hedef.varlik)
        : "§e⚡");
    } catch (e) { /* actionbar onemsiz */ }

    return undefined;        // is yok -- tek tick, bitti
  }
});
