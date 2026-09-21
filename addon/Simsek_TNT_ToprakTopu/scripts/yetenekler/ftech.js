import { system, ItemStack } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, gecerliMi, actionbarYaz, koniHedefleri,
  varlikKonumu, basKonumu, parcacikAt, yukseklikAraligi
} from "../yardimcilar.js";
import {
  FTECH_ACIK, FTECH_KOL, FTECH_SES,
  FTECH_KAZI_TAVAN, FTECH_KAZI_DERINLIK,
  FTECH_DOVUS_MENZIL, FTECH_DOVUS_KOL_HEDEF, FTECH_DOVUS_ENAZ_HASAR,
  FTECH_DOVUS_BEKLEME,
  FTECH_TOPLA_MENZIL, FTECH_TOPLA_TARAMA,
  FTECH_KAVRA_MENZIL, FTECH_KAVRA_MESAFE, FTECH_KAVRA_YUMUSAK,
  FTECH_KAVRA_ADIM, FTECH_KAVRA_ENAZ, FTECH_KAVRA_ENCOK,
  FTECH_KAVRANAMAZ,
  FTECH_FIRLAT_ENAZ_SARJ, FTECH_FIRLAT_ENCOK_SARJ,
  FTECH_FIRLAT_ENAZ_HIZ, FTECH_FIRLAT_ENCOK_HIZ,
  FTECH_HAREKET_MENZIL, FTECH_HAREKET_ENAZ_KOL, FTECH_HAREKET_SIDDET,
  FTECH_HAREKET_HIZ, FTECH_HAREKET_SURE,
  FTECH_YAPRAK_MENZIL, FTECH_YAPRAK_ACI, FTECH_YAPRAK_DUSME,
  FTECH_YAPRAK_BEKLEME, FTECH_YAPRAK_BLOKLAR,
  FTECH_YUKSELTMELER
} from "../ayarlar.js";
import {
  modulAcikMi, kolMenzili, yukseltmeTak, doluYuva, takiliYukseltmeler
} from "./_ftech_defteri.js";

/* ================================================================
   F-TECH SIRT CANTASI                                     v7.96.4

   Kaynak: F-Tech: Equipment 1.0.1 (MIT, BillBodkin).
   Olcumun tamami addon/REFERANS_FTECH.md.

   ---- SEKIZ KOL NEREDE ----
   Kaynakta sekiz ayri kol nesnesi var ve her birinin kendi
   gorevi, kendi yolu, kendi animasyonu. Bedrock'ta oyuncuya
   bagli sekiz hareketli uzuv cizmek attachable basina bir
   kemik demek ve `query.get_equipped_item_name` yalniz iki
   eli okuyabiliyor -- sekiz kolu GORSEL olarak cizmek bu
   paketin kurdugu makineyle olmuyor.

   Bu yuzden 8 sayisi burada GORUNUS degil PARALELLIK:
     - bir tarama turunda en cok 8 blok kiriliyor
     - en cok 8 hedefe vuruluyor
     - bir hedefe en cok 2 kol (kaynaktaki MAX_ARMS_PER_TARGET)
   Yani kaynagin sinirlari yasiyor, cizimi yasamiyor.

   ---- MODULLER KILITLI ----
   Kaynakta her kip bir yukseltme esyasi istiyor. Burada da
   oyle: `modulAcikMi` gecmezse yetenek CALISMIYOR ve sebebi
   yaziliyor. Yukseltme takmak icin yukseltme esyasini elde
   kullan (defter dosyasinda gerekcesi yazili).
   ================================================================ */

/* oyuncuId -> { varlikId, sarjBasi } */
const kavranan = new Map();
/* oyuncuId -> tutma mesafesi sapmasi (blok).

   ---- KAYNAKTA KAYDIRMA TEKERI, BIZDE COMELME ----
   Kaynakta tutulan varligin mesafesi Shift + tekerlekle
   degisiyor (HOLD_DISTANCE_STEP 0.35, sinirlar -1.75 .. 6.0).
   Bedrock Script API'sinde tekerlek okunamiyor -- olculdu,
   boyle bir olay yok. Comelme okunabiliyor (`isSneaking`),
   o yuzden: comeliyken varlik UZAKLASIYOR, birakinca
   yakinlasiyor. Adim ve sinirlar kaynagin kendi sayilari.  */
const tutmaMesafesi = new Map();

export function ftechUnutOyuncu(oyuncuId) {
  kavranan.delete(oyuncuId);
  yaprakBekleme.delete(oyuncuId);
  tutmaMesafesi.delete(oyuncuId);
}

function ses(oyuncu) {
  try {
    oyuncu.dimension.playSound(FTECH_SES, varlikKonumu(oyuncu));
  } catch (e) {
    /* playSound bu surumde yoksa is yine yapildi */
  }
}

/* Modul kapaliysa false doner ve sebebini yazar. */
function modulGecidi(oyuncu, kimlik, ad) {
  if (modulAcikMi(oyuncu.id, kimlik)) return true;
  try {
    actionbarYaz(oyuncu, "§c⚙ " + ad + " §7modülü takılı değil");
  } catch (e) { /* mesaj onemli degil */ }
  return false;
}

/* ---------------------------------------------------------------
   1. KAZI -- Block Operations
   Kaynak alani +/- dugmeleriyle dort yone genisletiyor; bizde
   tavan ayarda (FTECH_KAZI_TAVAN) ve menzil yukseltmesi
   derinligi artiriyor.
   Butceye uyuyor: blokIste gecmezse o tur kazmiyor, is olmuyor
   ama yetenek de durmuyor -- toprak_ucus'taki kalibin aynisi.
   --------------------------------------------------------------- */
yetenekKaydet({
  kimlik: "ftech_kazi",
  ad: "F-Tech Kazı",
  esyasiz: true,
  sira: 640,

  olustur(oyuncu) {
    if (!FTECH_ACIK) return undefined;
    if (!modulGecidi(oyuncu, "ftech_kazi", "Kazı")) return undefined;

    let yon, bas, boyut, sinir;
    try {
      yon = oyuncu.getViewDirection();
      bas = basKonumu(oyuncu);
      boyut = oyuncu.dimension;
      sinir = yukseklikAraligi(boyut);
    } catch (e) {
      hataYaz("ftech_kazi.hazirlik", e);
      return undefined;
    }

    /* Bakis yonunun baskin ekseni: kesit ona dik duruyor. */
    const ax = Math.abs(yon.x), az = Math.abs(yon.z);
    const ileriX = ax >= az ? Math.sign(yon.x) || 1 : 0;
    const ileriZ = ax >= az ? 0 : Math.sign(yon.z) || 1;

    const t = FTECH_KAZI_TAVAN;
    const derinlik = FTECH_KAZI_DERINLIK + kolMenzili(oyuncu.id) - 1;

    /* Hedef listesi bir kez kuruluyor; tur basina en cok
       FTECH_KOL blok tuketiliyor.                          */
    const hedefler = [];
    for (let d = 1; d <= derinlik; d++) {
      for (let yan = -t; yan <= t; yan++) {
        for (let yuk = -t; yuk <= t; yuk++) {
          const x = Math.floor(bas.x) + ileriX * d + (ileriX ? 0 : yan);
          const z = Math.floor(bas.z) + ileriZ * d + (ileriZ ? 0 : yan);
          const y = Math.floor(bas.y) + yuk;
          if (y < sinir.min || y > sinir.max) continue;
          hedefler.push({ x, y, z });
        }
      }
    }

    let i = 0;
    ses(oyuncu);

    return {
      ad: "ftech_kazi",
      oyuncuId: oyuncu.id,

      calis() {
        if (i >= hedefler.length) return true;
        if (!gecerliMi(oyuncu)) return true;

        const pay = blokIste(FTECH_KOL);
        if (pay < 1) return false;            // butce dolu, sonraki tick

        let kirilan = 0;
        while (i < hedefler.length && kirilan < pay) {
          const k = hedefler[i++];
          try {
            const blok = boyut.getBlock(k);
            if (!blok || blok.isAir || blok.isLiquid) continue;
            /* Dayanikli bloklara dokunulmuyor: kaynakta da
               matkap tier'i sinir koyuyor.                 */
            if (blok.typeId === "minecraft:bedrock") continue;
            blok.setType("minecraft:air");
            kirilan++;
          } catch (e) {
            /* Yuklenmemis parca: bu blok atlaniyor */
          }
        }
        return i >= hedefler.length;
      }
    };
  }
});

/* ---------------------------------------------------------------
   2. DOVUS -- Combat
   AttackAction.ATTACK_RANGE = 10, MAX_ARMS_PER_TARGET = 2,
   MIN_ATTACK_DAMAGE = 1.0. Sekiz kol, yani bir turda en cok
   sekiz vurus ve hedef basina en cok iki.
   --------------------------------------------------------------- */
yetenekKaydet({
  kimlik: "ftech_dovus",
  ad: "F-Tech Dövüş",
  esyasiz: true,
  sira: 641,

  olustur(oyuncu) {
    if (!FTECH_ACIK) return undefined;
    if (!modulGecidi(oyuncu, "ftech_dovus", "Dövüş")) return undefined;

    const bitis = system.currentTick + FTECH_DOVUS_BEKLEME * 6;
    let sonraki = 0;
    ses(oyuncu);

    return {
      ad: "ftech_dovus",
      oyuncuId: oyuncu.id,

      calis() {
        if (system.currentTick >= bitis) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + FTECH_DOVUS_BEKLEME;

        /* aci -1: tam kure. Kaynak dovusu bakisa bagli degil,
           cantanin etrafindaki her dusmana uzaniyor.        */
        let hedefler;
        try {
          hedefler = koniHedefleri(oyuncu, {
            menzil: FTECH_DOVUS_MENZIL, aci: -1
          });
        } catch (e) {
          hataYaz("ftech_dovus.hedef", e);
          return true;
        }

        /* koniHedefleri VARLIK donduruyor, sarmalayici nesne
           degil (`.map((x) => x.varlik)` ile bitiyor). Ilk
           yazista burada `h.varlik` okunuyordu ve undefined
           geliyordu; hasar cagrisi kendi try'ina dusuyor,
           yetenek SESSIZCE hicbir sey yapmiyordu. Deponun
           `eldekiEsya` dize/nesne karisikligiyla ayni sinif.  */
        let kolKalan = FTECH_KOL;
        for (const hedef of hedefler) {
          if (kolKalan <= 0) break;
          const kol = Math.min(FTECH_DOVUS_KOL_HEDEF, kolKalan);
          kolKalan -= kol;
          try {
            hedef.applyDamage(FTECH_DOVUS_ENAZ_HASAR * kol, {
              cause: "entityAttack", damagingEntity: oyuncu
            });
            parcacikAt(oyuncu.dimension, "minecraft:critical_hit_emitter",
                       varlikKonumu(hedef));
          } catch (e) {
            /* Hedef bu arada oldu: digerleri devam etsin */
          }
        }
        return false;
      }
    };
  }
});

/* ---------------------------------------------------------------
   3. TOPLAMA -- Item Pickup
   PickupAction menzilleri 8.0 (uzanma) ve 10.0 (tarama).
   --------------------------------------------------------------- */
yetenekKaydet({
  kimlik: "ftech_topla",
  ad: "F-Tech Toplama",
  esyasiz: true,
  sira: 642,

  olustur(oyuncu) {
    if (!FTECH_ACIK) return undefined;
    if (!modulGecidi(oyuncu, "ftech_topla", "Toplama")) return undefined;

    let merkez, boyut;
    try {
      merkez = varlikKonumu(oyuncu);
      boyut = oyuncu.dimension;
    } catch (e) {
      hataYaz("ftech_topla.hazirlik", e);
      return undefined;
    }

    let esyalar = [];
    try {
      esyalar = boyut.getEntities({
        location: merkez, maxDistance: FTECH_TOPLA_TARAMA,
        type: "minecraft:item"
      });
    } catch (e) {
      hataYaz("ftech_topla.getEntities", e);
      return undefined;
    }

    let i = 0;
    let toplanan = 0;
    ses(oyuncu);

    return {
      ad: "ftech_topla",
      oyuncuId: oyuncu.id,

      calis() {
        if (!gecerliMi(oyuncu)) return true;

        /* Tur basina en cok FTECH_KOL esya: sekiz kol,
           sekiz uzanma.                                   */
        let kalan = FTECH_KOL;
        while (i < esyalar.length && kalan > 0) {
          const e = esyalar[i++];
          kalan--;
          try {
            if (!gecerliMi(e)) continue;
            const k = varlikKonumu(e);
            const dx = k.x - merkez.x, dy = k.y - merkez.y, dz = k.z - merkez.z;
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) > FTECH_TOPLA_MENZIL) continue;
            /* Esyayi oyuncunun ustune isinliyoruz; vanilla
               toplama onu envantere aliyor. Envanteri
               kendimiz doldurmuyoruz cunku bu, dolu
               envanterde esyayi YOK ederdi -- deponun
               "oyuncu esyasi asla kaybolmaz" kurali.      */
            e.teleport({ x: merkez.x, y: merkez.y + 0.2, z: merkez.z });
            toplanan++;
          } catch (err) {
            /* Esya bu arada alindi */
          }
        }
        if (i < esyalar.length) return false;
        try {
          actionbarYaz(oyuncu, "§b⚙ §f" + toplanan + " eşya toplandı");
        } catch (e) { /* mesaj onemli degil */ }
        return true;
      }
    };
  }
});

/* ---------------------------------------------------------------
   4. KAVRAMA / FIRLATMA -- Entity Manipulation
   GRAB_RANGE 10, HOLD_LERP_FACTOR 0.4.
   Sarj 6..40 tick -> hiz 0.8..2.8 (EntityReleaseHandler).

   Tek yetenek, iki is: elde varlik yoksa KAVRAR, varsa
   FIRLATIR. Kaynakta iki ayri tus var; Bedrock'ta ikinci
   bir tus yok, bu yuzden ayni yetenek iki duruma bakiyor.
   Sarj = kavramadan firlatmaya gecen sure.
   --------------------------------------------------------------- */
yetenekKaydet({
  kimlik: "ftech_kavra",
  ad: "F-Tech Kavrama",
  esyasiz: true,
  sira: 643,

  olustur(oyuncu) {
    if (!FTECH_ACIK) return undefined;
    if (!modulGecidi(oyuncu, "ftech_kavra", "Kavrama")) return undefined;

    const tutulan = kavranan.get(oyuncu.id);

    /* ---- FIRLATMA ---- */
    if (tutulan) {
      kavranan.delete(oyuncu.id);
      tutmaMesafesi.delete(oyuncu.id);
      let hedef;
      try {
        hedef = oyuncu.dimension.getEntities({
          location: varlikKonumu(oyuncu), maxDistance: FTECH_KAVRA_MENZIL
        }).find((v) => v.id === tutulan.varlikId);
      } catch (e) {
        hataYaz("ftech_kavra.firlat.bul", e);
      }
      if (!hedef || !gecerliMi(hedef)) {
        try { actionbarYaz(oyuncu, "§7⚙ Kavranan varlık kayboldu"); }
        catch (e) { /* onemsiz */ }
        return undefined;
      }

      const sarj = Math.max(0, system.currentTick - tutulan.sarjBasi);
      const kirp = Math.min(FTECH_FIRLAT_ENCOK_SARJ,
                            Math.max(FTECH_FIRLAT_ENAZ_SARJ, sarj));
      const oran = (kirp - FTECH_FIRLAT_ENAZ_SARJ) /
                   (FTECH_FIRLAT_ENCOK_SARJ - FTECH_FIRLAT_ENAZ_SARJ);
      const hiz = FTECH_FIRLAT_ENAZ_HIZ +
                  oran * (FTECH_FIRLAT_ENCOK_HIZ - FTECH_FIRLAT_ENAZ_HIZ);

      try {
        const yon = oyuncu.getViewDirection();
        hedef.applyImpulse({ x: yon.x * hiz, y: yon.y * hiz + 0.2, z: yon.z * hiz });
      } catch (e) {
        /* applyImpulse bu varlikta islemiyor: knockback dene */
        try {
          const yon = oyuncu.getViewDirection();
          hedef.applyKnockback(yon.x, yon.z, hiz, yon.y * hiz + 0.2);
        } catch (err) {
          hataYaz("ftech_kavra.firlat", err);
        }
      }
      ses(oyuncu);
      try {
        actionbarYaz(oyuncu, "§b⚙ §fFırlatıldı §8· şarj %" +
                             Math.round(oran * 100));
      } catch (e) { /* onemsiz */ }
      return undefined;
    }

    /* ---- KAVRAMA ---- */
    let aday;
    try {
      const liste = koniHedefleri(oyuncu, {
        menzil: FTECH_KAVRA_MENZIL, aci: 0.85, aciyaGore: true
      });
      /* Ayni sey: liste VARLIK tasiyor. */
      aday = liste.find((v) => !FTECH_KAVRANAMAZ.has(v.typeId));
    } catch (e) {
      hataYaz("ftech_kavra.hedef", e);
      return undefined;
    }
    if (!aday) {
      try { actionbarYaz(oyuncu, "§7⚙ Bakılan yerde kavranacak varlık yok"); }
      catch (e) { /* onemsiz */ }
      return undefined;
    }

    const hedef = aday;
    kavranan.set(oyuncu.id, {
      varlikId: hedef.id, sarjBasi: system.currentTick
    });
    ses(oyuncu);
    try {
      actionbarYaz(oyuncu, "§b⚙ §fKavrandı §8· tekrar bas, fırlat");
    } catch (e) { /* onemsiz */ }

    const bitis = system.currentTick + FTECH_FIRLAT_ENCOK_SARJ * 8;

    return {
      ad: "ftech_kavra",
      oyuncuId: oyuncu.id,

      calis() {
        if (!gecerliMi(oyuncu)) { kavranan.delete(oyuncu.id); return true; }
        /* Firlatma yeteneği tutulani sildiyse tasima biter. */
        if (kavranan.get(oyuncu.id) === undefined) return true;
        if (system.currentTick >= bitis) { kavranan.delete(oyuncu.id); return true; }
        if (!gecerliMi(hedef)) { kavranan.delete(oyuncu.id); return true; }

        try {
          const yon = oyuncu.getViewDirection();
          const bas = basKonumu(oyuncu);

          /* Comelme mesafeyi buyutuyor, birakmak kuculuyor.
             Sinirlar kaynagin kendi degerleri.             */
          let sapma = tutmaMesafesi.get(oyuncu.id) || 0;
          let comeli = false;
          try { comeli = !!oyuncu.isSneaking; } catch (e) { /* okunamadi */ }
          sapma += comeli ? FTECH_KAVRA_ADIM : -FTECH_KAVRA_ADIM;
          if (sapma < FTECH_KAVRA_ENAZ) sapma = FTECH_KAVRA_ENAZ;
          if (sapma > FTECH_KAVRA_ENCOK) sapma = FTECH_KAVRA_ENCOK;
          tutmaMesafesi.set(oyuncu.id, sapma);

          const uzaklik = FTECH_KAVRA_MESAFE + sapma;
          const istenen = {
            x: bas.x + yon.x * uzaklik,
            y: bas.y + yon.y * uzaklik,
            z: bas.z + yon.z * uzaklik
          };
          /* HOLD_LERP_FACTOR 0.4: aninda isinlamak degil,
             yumusak takip -- kaynaktaki deger.            */
          const k = varlikKonumu(hedef);
          hedef.teleport({
            x: k.x + (istenen.x - k.x) * FTECH_KAVRA_YUMUSAK,
            y: k.y + (istenen.y - k.y) * FTECH_KAVRA_YUMUSAK,
            z: k.z + (istenen.z - k.z) * FTECH_KAVRA_YUMUSAK
          });
        } catch (e) {
          kavranan.delete(oyuncu.id);
          return true;
        }
        return false;
      }
    };
  }
});

/* ---------------------------------------------------------------
   5. HAREKET -- Locomotion
   Kaynakta kollar yuzeye tutunup oyuncuyu itiyor; en az bir kol
   tutunmali (backpack_locomotion.en_us.txt).

   ---- BEDROCK SINIRI ----
   applyImpulse OYUNCULARA islemiyor (deponun kendi olcumu,
   toprak_ucus.js'te yazili). Havada tutmanin kararli tek yolu
   levitation. Yani "kollarin ittigi" hareket yerine "kollarin
   tuttugu surece havada kalma" var; tutunacak yuzey yoksa
   yetenek CALISMIYOR, kaynaktaki kuralin karsiligi bu.
   --------------------------------------------------------------- */
yetenekKaydet({
  kimlik: "ftech_hareket",
  ad: "F-Tech Hareket",
  esyasiz: true,
  sira: 644,

  olustur(oyuncu) {
    if (!FTECH_ACIK) return undefined;
    if (!modulGecidi(oyuncu, "ftech_hareket", "Hareket")) return undefined;

    /* Tutunacak yuzey sayimi: alti yonde ilk kati blok.
       GrabType kaynakta SIDE ve CORNER; bizde yon basina
       tek isin, yani en cok alti cipa.                    */
    let cipa = 0;
    try {
      const boyut = oyuncu.dimension;
      const bas = basKonumu(oyuncu);
      const yonler = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
      for (const [dx, dy, dz] of yonler) {
        for (let d = 1; d <= FTECH_HAREKET_MENZIL; d++) {
          const blok = boyut.getBlock({
            x: Math.floor(bas.x) + dx * d,
            y: Math.floor(bas.y) + dy * d,
            z: Math.floor(bas.z) + dz * d
          });
          if (!blok) break;
          if (!blok.isAir && !blok.isLiquid) { cipa++; break; }
        }
      }
    } catch (e) {
      hataYaz("ftech_hareket.cipa", e);
      return undefined;
    }

    if (cipa < FTECH_HAREKET_ENAZ_KOL) {
      try {
        actionbarYaz(oyuncu, "§c⚙ Tutunacak yüzey yok §8· " +
                             FTECH_HAREKET_MENZIL + " blok içinde");
      } catch (e) { /* onemsiz */ }
      return undefined;
    }

    try {
      oyuncu.addEffect("levitation", FTECH_HAREKET_SURE, {
        amplifier: FTECH_HAREKET_SIDDET, showParticles: false
      });
      oyuncu.addEffect("speed", FTECH_HAREKET_SURE, {
        amplifier: FTECH_HAREKET_HIZ, showParticles: false
      });
      oyuncu.addEffect("slow_falling", FTECH_HAREKET_SURE + 40, {
        amplifier: 0, showParticles: false
      });
    } catch (e) {
      hataYaz("ftech_hareket.addEffect", e);
      return undefined;
    }

    ses(oyuncu);
    try {
      actionbarYaz(oyuncu, "§b⚙ §f" + cipa + " kol tutundu");
    } catch (e) { /* onemsiz */ }
    return undefined;
  }
});

/* ---------------------------------------------------------------
   6. YAPRAK TEMIZLEYICI -- Foliage Clearer
   CONE_RANGE 18, CONE_ANGLE 30, DROP_CHANCE 0.125, COOLDOWN 20.
   Bu kaynakta AYRI bir esya; bizde de ayri esya (pa:ftech_yaprak)
   ama yetenek defterine normal yetenek olarak giriyor ve
   yukseltme ISTEMIYOR -- kaynakta da istemiyor.
   --------------------------------------------------------------- */
const yaprakBekleme = new Map();

yetenekKaydet({
  kimlik: "ftech_yaprak",
  ad: "Yaprak Temizleyici",
  esya: "pa:ftech_yaprak",
  sira: 645,

  olustur(oyuncu) {
    if (!FTECH_ACIK) return undefined;

    const bekle = yaprakBekleme.get(oyuncu.id) || 0;
    if (system.currentTick < bekle) return undefined;
    yaprakBekleme.set(oyuncu.id, system.currentTick + FTECH_YAPRAK_BEKLEME);

    let boyut, bas, yon, sinir;
    try {
      boyut = oyuncu.dimension;
      bas = basKonumu(oyuncu);
      yon = oyuncu.getViewDirection();
      sinir = yukseklikAraligi(boyut);
    } catch (e) {
      hataYaz("ftech_yaprak.hazirlik", e);
      return undefined;
    }

    /* Koni: kaynakta 30 derece yari acisi. Kosinus esigi
       bir kez hesaplaniyor.                               */
    const esik = Math.cos(FTECH_YAPRAK_ACI * Math.PI / 180);
    const r = FTECH_YAPRAK_MENZIL;

    const hedefler = [];
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          const uz = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (uz < 0.5 || uz > r) continue;
          if ((dx * yon.x + dy * yon.y + dz * yon.z) / uz < esik) continue;
          const y = Math.floor(bas.y) + dy;
          if (y < sinir.min || y > sinir.max) continue;
          hedefler.push({ x: Math.floor(bas.x) + dx, y,
                          z: Math.floor(bas.z) + dz, uz });
        }
      }
    }
    /* Yakindan uzaga: butce dolarsa en yakinlar temizlenmis
       olur, uzakta delik kalmaz.                           */
    hedefler.sort((a, b) => a.uz - b.uz);

    let i = 0;
    let silinen = 0;
    ses(oyuncu);

    return {
      ad: "ftech_yaprak",
      oyuncuId: oyuncu.id,

      calis() {
        if (i >= hedefler.length) return true;
        if (!gecerliMi(oyuncu)) return true;

        const pay = blokIste(FTECH_KOL);
        if (pay < 1) return false;

        let is = 0;
        while (i < hedefler.length && is < pay) {
          const k = hedefler[i++];
          try {
            const blok = boyut.getBlock(k);
            if (!blok || blok.isAir) continue;
            if (!FTECH_YAPRAK_BLOKLAR.has(blok.typeId)) continue;
            const tip = blok.typeId;
            blok.setType("minecraft:air");
            is++;
            silinen++;
            /* DROP_CHANCE 0.125 -- kaynagin kendi degeri. */
            if (Math.random() < FTECH_YAPRAK_DUSME) {
              try {
                boyut.spawnItem(new ItemStack(tip, 1),
                                { x: k.x + 0.5, y: k.y + 0.5, z: k.z + 0.5 });
              } catch (err) {
                /* Bu blok esya olarak var olmayabilir (ornegin
                   cave_vines_plant). Dusurme atlanir, blok yine
                   temizlendi -- is yarim kalmiyor.            */
              }
            }
          } catch (e) {
            /* Yuklenmemis parca */
          }
        }
        if (i < hedefler.length) return false;
        try {
          actionbarYaz(oyuncu, "§a⚙ §f" + silinen + " bitki temizlendi");
        } catch (e) { /* onemsiz */ }
        return true;
      }
    };
  }
});

/* ---------------------------------------------------------------
   YUKSELTME TAKMA
   Her yukseltme esyasi kendi yetenegini kaydediyor: esya elde
   kullanilinca takiliyor. Kaynaktaki 3x3 grid yerine bu jest --
   gerekcesi _ftech_defteri.js'te yazili.
   --------------------------------------------------------------- */
/* SIRA BENZERSIZ OLMAK ZORUNDA: jest sirasi `sira` ile
   belirleniyor ve iki yetenek ayni sayiyi tasirsa sira
   kararsiz olur. Ilk yazista onunun da 650 idi; dort ayri
   test birden dustu (capraz_bag, viltrumite, ben10_saldiri,
   tarama). Sayac tablonun sirasindan turuyor, elle
   yazilmiyor -- yeni yukseltme eklenince kendiliginden
   dogru kaliyor.                                            */
let _ftSira = 650;
for (const [kimlik, tanim] of FTECH_YUKSELTMELER) {
  yetenekKaydet({
    kimlik: "tak_" + kimlik,
    ad: tanim.ad + " Tak",
    esya: "pa:" + kimlik,
    sira: _ftSira++,

    olustur(oyuncu) {
      if (!FTECH_ACIK) return undefined;
      const sonuc = yukseltmeTak(oyuncu.id, kimlik);
      try {
        if (sonuc.oldu) {
          ses(oyuncu);
          actionbarYaz(oyuncu, "§a⚙ §f" + tanim.ad +
            " §8· yuva " + doluYuva(oyuncu.id) + "/9");
        } else if (sonuc.sebep === "tekrar") {
          actionbarYaz(oyuncu, "§c⚙ " + tanim.ad + " §7ikinci kez takılamaz");
        } else if (sonuc.sebep === "dolu") {
          actionbarYaz(oyuncu, "§c⚙ Dokuz yuva da dolu");
        }
      } catch (e) { /* mesaj onemli degil */ }
      return undefined;
    }
  });
}

/* Menu icin: takili yukseltmelerin okunur listesi. */
export function yukseltmeListesi(oyuncuId) {
  const sayac = takiliYukseltmeler(oyuncuId);
  const liste = [];
  for (const [kimlik, t] of FTECH_YUKSELTMELER) {
    if (sayac[kimlik]) liste.push({ kimlik, ad: t.ad, adet: sayac[kimlik] });
  }
  return liste;
}
