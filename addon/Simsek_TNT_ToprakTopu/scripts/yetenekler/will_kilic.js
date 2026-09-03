import { system } from "@minecraft/server";
import { yetenekKaydet, esyaBagla } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, koniHedefleri, eldekiEsya
} from "../yardimcilar.js";
import {
  WILL_ACIK, WILL_KILIC, WILL_ISIN_MESAFE, WILL_ISIN_BEKLEME,
  WILL_UCUS_SURE, WILL_UCUS_SIDDET,
  WILL_YATIR_MENZIL, WILL_YATIR_SURE, WILL_YATIR_ANIM, WILL_YATIR_DUZEL,
  WILL_KAN_PARCACIK, WILL_KAN_KAT, WILL_KAN_YUKSEK, WILL_KAN_ARALIK
} from "../ayarlar.js";

/* WILL1545 KILICI -- kullanicinin komut listesi.

   Kaynak komutlar komut bloguyla calisiyor ve hepsi ayni
   kapiyi kullaniyor:
       @a[hasitem={item=golden_sword,location=slot.weapon.mainhand}]
   yani "elinde altin kilic varsa". Bizde kapi kendi esyamiz
   (pa:will_kilic) -- vanilla altin kilici tutan HERKESIN
   isinlanmasi istenmez.

   Buradaki uc yetenek disinda bir de KAN ISINI var; o ayri
   yazilmadi, ayarlar.js:KOL_ISIN'e bir satir olarak eklendi ve
   var olan isin motorunu kullaniyor (v6.8'den beri).       */

/* Elinde Will kilici var mi. */
export function willVar(oyuncu) {
  try {
    return eldekiEsya(oyuncu) === WILL_KILIC;
  } catch (e) {
    return false;
  }
}

/* ---------------- 1. ISINLANMA ---------------- */
/* Kaynak: tp @p ^^^+8   -- sekiz blok ileri, bakis
   dogrultusunda. Kaynakta ENGEL KONTROLU YOK: duvarin icine
   isinlanabiliyorsun ve orada sikisip oluyorsun. Bizde geriye
   dogru guvenli yer araniyor -- ISIN_ADIM'daki ayni kalip. */
/* Kaynagin kendi bekleme suresi: "Onay Gecikme suresi : 20".
   Ilk yazimda ayara koyup KULLANMAMISTIM; tarama.mjs'in oksuz
   ayar bekcisi yakaladi. Isinlanma en cok kotuye kullanilabilen
   yetenek (duvardan gecme), beklemesiz birakmak yanlisti.   */
const isinBekleme = new Map();

/* v7.24: bu defter oyuncu KIMLIGIYLE anahtarlaniyordu ama
   kimse silmiyordu -- oyuncu cikinca kaydi kaliyor, girip
   cikan her oyuncu bir satir birakiyordu. Temizleyici zaten
   YAZILMISTI, yalnizca main.js'in playerLeave'ine BAGLANMAMISTI.
   Genel taramada once "kullanilmayan export" sanip silmistim;
   yanlisti -- olu olan kod degil, eksik olan BAGLANTIYDI.   */
export function willBeklemeUnut(oyuncuId) {
  if (oyuncuId === undefined) { isinBekleme.clear(); return; }
  isinBekleme.delete(oyuncuId);
}

yetenekKaydet({
  kimlik: "will_isinlan",
  ad: "Kılıçla Işınlanma",
  sira: 142,

  olustur(oyuncu) {
    const simdi = system.currentTick;
    const erken = isinBekleme.get(oyuncu.id) || 0;
    if (simdi < erken) {
      actionbarYaz(oyuncu, "§7Işınlanma hazır değil §8· " +
                   ((erken - simdi) / 20).toFixed(1) + " sn");
      kollariIndir(oyuncu);
      return undefined;
    }
    isinBekleme.set(oyuncu.id, simdi + WILL_ISIN_BEKLEME);
    try {
      const yon = oyuncu.getViewDirection();
      const k = oyuncu.location;
      /* Sekizden geriye dogru: ilk BOS yere in. */
      for (let d = WILL_ISIN_MESAFE; d >= 1; d--) {
        const hedef = {
          x: k.x + yon.x * d, y: k.y + yon.y * d, z: k.z + yon.z * d
        };
        let bos = true;
        try {
          const b1 = oyuncu.dimension.getBlock({
            x: Math.floor(hedef.x), y: Math.floor(hedef.y), z: Math.floor(hedef.z)
          });
          const b2 = oyuncu.dimension.getBlock({
            x: Math.floor(hedef.x), y: Math.floor(hedef.y) + 1, z: Math.floor(hedef.z)
          });
          bos = (!b1 || b1.isAir !== false) && (!b2 || b2.isAir !== false);
        } catch (e) {
          bos = true;      // blok okunamiyorsa kaynagin davranisi
        }
        if (!bos) continue;
        oyuncu.teleport(hedef, { dimension: oyuncu.dimension });
        actionbarYaz(oyuncu, "§d✦ §f" + d + " blok ışınlandın");
        kollariIndir(oyuncu);
        return undefined;
      }
      actionbarYaz(oyuncu, "§cÖnün kapalı §8· ışınlanacak yer yok");
    } catch (e) {
      hataYaz("will.isinlan", e);
    }
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ---------------- 2. UCMA ---------------- */
/* Kaynak: effect @p levitation 1 2 -- BIR TICK, seviye 3.
   Yani ucus degil, kisa bir sicrayis. Aynen alindi; buyutmek
   kaynakta olmayan bir sey uretirdi.                       */
yetenekKaydet({
  kimlik: "will_sicra",
  ad: "Kılıçla Sıçrayış",
  sira: 143,

  olustur(oyuncu) {
    try {
      oyuncu.addEffect("levitation", WILL_UCUS_SURE,
                       { amplifier: WILL_UCUS_SIDDET, showParticles: false });
      actionbarYaz(oyuncu, "§d✦ §fSıçrayış");
    } catch (e) {
      hataYaz("will.sicra", e);
    }
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ---------------- 3. YATIRMA ---------------- */
/* Kaynak iki animasyonu ust uste biniyor:
       playanimation @p animation.player.sleeping x 1 "0" anim1
       playanimation @p animation.agent.move    x 1 "0" anim2p
   ve geri donus icin humanoid.base_pose.

   IKI FARK:
     1. Kaynak @p -- yani KOMUTU CALISTIRANI yatiriyor. Bizde
        HEDEF yatiyor; bir silahin kendini yatirmasi anlamsiz.
     2. Kaynakta geri donus ELLE. Bizde sure dolunca kendi
        kalkiyor -- yoksa hedef sonsuza kadar yerde kalirdi
        (Zaman Saati'nde ogrenilen ayni ders).              */
yetenekKaydet({
  kimlik: "will_yatir",
  ad: "Yere Serme",
  sira: 144,

  olustur(oyuncu) {
    let sayi = 0;
    try {
      const hedefler = koniHedefleri(oyuncu, {
        menzil: WILL_YATIR_MENZIL, aci: 0.7, tavan: 6, oyuncuDahil: true
      });
      for (const hedef of hedefler) {
        if (!gecerliMi(hedef)) continue;
        try {
          hedef.runCommand("playanimation @s " + WILL_YATIR_ANIM +
                           ' x 1 "0" will_yat');
          sayi++;
          /* Kendiliginden kalksin. Kaynakta bu YOK ve hedef
             sonsuza kadar yerde kalir. */
          const kimlik = hedef.id;
          system.runTimeout(() => {
            try {
              const h = oyuncu.dimension.getEntities()
                .find((v) => v.id === kimlik);
              if (h && gecerliMi(h)) {
                h.runCommand("playanimation @s " + WILL_YATIR_DUZEL +
                             ' x 1 "0" will_yat');
              }
            } catch (e) { /* hedef gitmis olabilir */ }
          }, WILL_YATIR_SURE);
        } catch (e) { /* animasyon komutu her varlikta yok */ }
      }
      actionbarYaz(oyuncu, sayi > 0
        ? "§4☠ §f" + sayi + " hedef yere serildi"
        : "§cÖnünde kimse yok");
    } catch (e) {
      hataYaz("will.yatir", e);
    }
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ---------------- 4. GOGUSTEKI KAN (pasif) ----------------
   Kaynak ayni parcacik satirini UC KEZ yaziyor ("daha belirgin
   olsun diye"). Bizde tek dongu, sayi ayarda -- uc satiri
   kopyalamak yerine.

   Merkezi tick'ten cagriliyor ve elinde kilic OLMAYAN oyuncu
   icin hicbir sey yapmiyor: kilici tutan yoksa dongu bedava. */
let sonrakiKan = 0;

export function willTara(oyuncular) {
  if (!WILL_ACIK) return;
  const simdi = system.currentTick;
  if (simdi < sonrakiKan) return;
  sonrakiKan = simdi + WILL_KAN_ARALIK;

  for (const oyuncu of oyuncular) {
    try {
      if (!willVar(oyuncu)) continue;
      const k = oyuncu.location;
      for (let i = 0; i < WILL_KAN_KAT; i++) {
        try {
          oyuncu.dimension.spawnParticle(WILL_KAN_PARCACIK, {
            x: k.x, y: k.y + WILL_KAN_YUKSEK, z: k.z
          });
        } catch (e) { return; }   /* parcacik yoksa bir daha deneme */
      }
    } catch (e) {
      hataYaz("will.kan", e);
    }
  }
}

/* Kilicin yetenekleri: isinlanma, sicrayis, yere serme.
   Kan Isini KOL_ISIN'den geliyor ve esyasiz sirada. */
if (WILL_ACIK) {
  for (const y of ["will_isinlan", "will_sicra", "will_yatir"]) {
    esyaBagla(WILL_KILIC, y);
  }
}
