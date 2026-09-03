import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, koniHedefleri
} from "../yardimcilar.js";
import {
  BEDEN_ACIK, BEDEN_MENZIL, BEDEN_ACI, BEDEN_TAVAN, BEDEN_OYUNCU,
  BEDEN_SURE, BEDEN_HASAR, BEDEN_ANIM, BEDEN_ANIM_BITIS,
  BEDEN_DUVAR, BEDEN_KORUNAN
} from "../ayarlar.js";

/* BEDENI BOL -- baktiginin bedenini ayirir ve agir vurur.

   Kullanicinin gonderdigi toolbox komut listesinden iki satir:
     execute positioned ^^^10 run playanimation @e[r=10,c=1]
             animation.villager.get_in_bed animation 10000000
     execute positioned ^^^15 run kill @e[r=10,c=1]

   Numara: animation.villager.get_in_bed KOYLU iskeletine gore
   yazilmis. Oyuncu iskeletinde ayni kemikler yok, oynatilinca
   govde parcalari birbirinden ayriliyor. Sondaki koca sayi da
   sure degil GECIS suresi; o kadar buyuk olunca poz hic
   bitmiyor.

   ---- BU DOSYANIN KAYNAKTAN AYRILDIGI UC YER ----
   1. POZ GERI ALINIYOR. Kaynakta geri alan hicbir sey yok --
      vurdugun kisi bedeni bolunmus halde kaliyor. Ayni
      sikayeti Yamultma'da yazmisiz; ayni hatayi burada
      tekrarlamiyoruz. Is nesnesi BEDEN_SURE dolunca pozu
      duzeltiyor ve bitir() her kosulda ayni isi yapiyor --
      is yarida kesilse de kimse bolunmus kalmiyor.
   2. `kill` DEGIL, agir HASAR. `kill` zirhi, direnci, totemi
      hic dinlemiyor; ustelik kaynaktaki @e armor stand'i,
      evcil hayvani, yerdeki esyayi da siliyordu.
   3. DUVAR ARKASINA GECMIYOR. Kaynaktaki `positioned ^^^15`
      bloklari tanimiyor. Burada bakis isini nereye carparsa
      hedef ondan oteye gecemiyor.

   ---- YAMULTMA'DAN FARKI ----
   Yamultma FELC eder (yavaslik/zayiflik/kazma yorgunlugu),
   hasar vermez ve caresi vardir. Bu ise VURUR ve gorsel olarak
   parcalar; felc etmez. Ikisi ayri ayri kullanilabilsin diye
   ayri yetenek olarak duruyor.                                */

/* varlikId -> { varlik, bitis }  -- pozu geri alinacaklar.
   Isin kendi defteri; oyuncuya bagli degil, o yuzden
   playerLeave temizligine girmiyor (sizinti.mjs'in aradigi
   sey oyuncu anahtarli defterler).                            */
function pozVer(hedef, anim) {
  try {
    if (typeof hedef.runCommand === "function") {
      hedef.runCommand("playanimation @s " + anim);
    }
  } catch (e) {
    /* playanimation her varlikta ve her surumde yok. Calismazsa
       yetenek yine calisir -- hasar zaten uygulandi, sadece
       hedef dik durur. Yamultma'daki ayni karar.              */
  }
}

/* Bakis isininin carptigi yere kadarki uzaklik. Isin bir seye
   carpmazsa menzilin tamami serbest.                          */
function duvarMesafesi(oyuncu, menzil) {
  if (!BEDEN_DUVAR) return menzil;
  try {
    if (typeof oyuncu.getBlockFromViewDirection !== "function") return menzil;
    const vurus = oyuncu.getBlockFromViewDirection({ maxDistance: menzil });
    if (!vurus || !vurus.block) return menzil;
    const bas = oyuncu.getHeadLocation();
    const k = vurus.block.location;
    const dx = k.x + 0.5 - bas.x, dy = k.y + 0.5 - bas.y, dz = k.z + 0.5 - bas.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  } catch (e) {
    hataYaz("beden_bol.duvarMesafesi", e);
    return menzil;
  }
}

function uzaklik(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const KORUNAN = new Set(BEDEN_KORUNAN);

yetenekKaydet({
  kimlik: "beden_bol",
  ad: "Bedeni Böl",
  esyasiz: true,
  sira: 151,

  olustur(oyuncu) {
    if (!BEDEN_ACIK) return undefined;

    const duvar = duvarMesafesi(oyuncu, BEDEN_MENZIL);
    let bas;
    try {
      bas = oyuncu.getHeadLocation();
    } catch (e) {
      hataYaz("beden_bol.getHeadLocation", e);
      return undefined;
    }

    const aday = koniHedefleri(oyuncu, {
      menzil: BEDEN_MENZIL,
      aci: BEDEN_ACI,
      tavan: BEDEN_TAVAN,
      oyuncuDahil: BEDEN_OYUNCU
    });

    const vurulan = [];
    for (const hedef of aday) {
      try {
        if (!gecerliMi(hedef)) continue;
        if (KORUNAN.has(hedef.typeId)) continue;
        /* Duvarin arkasina gecme. Kucuk bir pay birakiliyor:
           hedef duvarin tam onunde dururken isin bloga
           carptigi icin hedef "duvarin arkasinda" sayilmasin. */
        if (uzaklik(hedef.location, bas) > duvar + 1.5) continue;

        try {
          hedef.applyDamage(BEDEN_HASAR, {
            cause: "entityAttack", damagingEntity: oyuncu
          });
        } catch (e) {
          /* applyDamage secenekli bicimi bazi surumlerde yok. */
          try { hedef.applyDamage(BEDEN_HASAR); }
          catch (e2) { hataYaz("beden_bol.applyDamage", e2); }
        }

        /* Poz olmus varliga verilmez: olduyse zaten dagildi ve
           gecersiz nesneye komut atmak istisna atiyor.        */
        if (gecerliMi(hedef)) {
          pozVer(hedef, BEDEN_ANIM);
          vurulan.push(hedef);
        }
      } catch (e) {
        hataYaz("beden_bol.hedef", e);
      }
    }

    try {
      oyuncu.sendMessage(vurulan.length
        ? "§c" + vurulan.length + " bedeni bölündü"
        : "§eÖnünde bölecek bir şey yok.");
    } catch (e) {
      hataYaz("beden_bol.sendMessage", e);
    }

    kollariIndir(oyuncu);
    if (vurulan.length === 0) return undefined;

    /* Poz kendiliginden BITMEZ (gecis suresi kocaman). Suresi
       dolunca ya da is yarida kesilince MUTLAKA geri alinmali;
       is nesnesi bunun icin var.                              */
    const bitisTick = system.currentTick + BEDEN_SURE;
    let kapandi = false;
    const duzelt = () => {
      if (kapandi) return;
      kapandi = true;
      for (const hedef of vurulan) {
        try {
          if (gecerliMi(hedef)) pozVer(hedef, BEDEN_ANIM_BITIS);
        } catch (e) {
          hataYaz("beden_bol.duzelt", e);
        }
      }
      vurulan.length = 0;
    };

    return {
      ad: "beden_bol",
      oyuncuId: oyuncu.id,
      calis() { return system.currentTick >= bitisTick; },
      bitir() { duzelt(); }
    };
  }
});
