import * as api from "@minecraft/server";
import { world, system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikAt, eldekiEsya
} from "../yardimcilar.js";
import {
  KOL_TAKAS_ACIK, KOL_TAKAS_KAYNAK, KOL_TAKAS_HEDEF, KOL_TAKAS_ISARET,
  KOL_TAKAS_DUSEN_SAG, KOL_TAKAS_DUSEN_SOL, KOL_TAKAS_GELEN,
  KOL_TAKAS_OMUZ_BOY, KOL_TAKAS_OMUZ_Y, KOL_TAKAS_OMUZ_X,
  KOL_TAKAS_YERDE, KOL_TAKAS_GELIS_YUKSEK, KOL_TAKAS_GELIS_HIZ,
  KOL_TAKAS_VARIS, KOL_TAKAS_TAVAN, KOL_TAKAS_SES_DUSUS, KOL_TAKAS_SES_TAKIL,
  KOL_TAKAS_KAYIT_ANAHTAR, KOL_TAKAS_PARCACIK,
  KOL_TAKAS_PARCACIK_ADET, KOL_TAKAS_PARCACIK_YARICAP, PARCACIK_TOPRAK
} from "../ayarlar.js";

/* ============================================================
   KOL TAKASI -- DEPODAKI ILK SINEMATIK           v7.9

   Kullanicinin tarif ettigi sahne:
     "Toprak kollar yere dusuyor ikisi de ayni sekilde yani sag
      ve sol kol ardindan kanli kol ortaya cikiyor... Toprak kol
      yere dusuyor ardindan kanli kol geliyor ve takilmis oluyor."

   ---- BES EVRE ----
     0  Toprak Kol ana elden BOS BIR YUVAYA TASINIR, yerine
        isaret girer -> oyuncu o anda KOLSUZ cizilir.
        Iki dusen kol omuzlarda dogar.
     1  Kollar yercekimiyle duser (motorun isi, script karismaz).
     2  KOL_TAKAS_YERDE tick kollar yerde bekler.
     3  Kanli kol yukarida dogar, her tick omza yaklasir.
     4  Varista: uc varlik silinir, Kanli Kol ana ele TASINIR.

   ---- ESYA KAYBI: DEFTER YOK, TASIMA VAR ----
   Ilk tasarimda Toprak Kol'u bir Map'te tutup sonunda geri
   vermeyi dusundum. VAZGECILDI: o defter script yeniden
   yuklenince ucar ve esya YOK OLUR. Bunun yerine esya GERCEKTEN
   tasiniyor -- sahne boyunca envanterde duran, elle
   tutulabilen bir esya. Oyun kapansa, oyuncu olse, dunya
   degisse bile Toprak Kol yerinde.

   Ayni sebeple sahne BOS YUVA YOKSA hic baslamiyor: tasinacak
   yer olmadan baslasaydi tek secenek silmek olurdu.

   ---- KOPYALA-SONRA-SIL ----
   Her takasta once HEDEF yazilir, sonra KAYNAK temizlenir.
   Ters sirada olsaydi ikinci adim basarisiz olunca esya yok
   olurdu. Bu sirada en kotu ihtimal bir anlik KOPYA -- ve o
   telafi edilebilir, silinen esya edilemez.

   ---- setEquipment NEDEN OZELLIK TESPITIYLE ----
   Ana ele esya koymanin iki yolu var: container'in secili
   yuvasi (selectedSlotIndex) ve equippable.setEquipment.
   Birincisi bu depoda HIC KULLANILMADI, yani kanitli degil.
   Ikincisi eldekiEsya()'nin kullandigi getEquipment'in tam
   esi. Yine de VAR SAYILMIYOR: yoksa sahne hic baslamiyor ve
   sebebini yaziyor. Yarim oynanan bir sahne, hic oynamayan bir
   sahneden kotudur.
   ============================================================ */

/* iksirler.js'teki kalip: ithalat YILDIZLA yapiliyor ki
   ItemStack bu surumde yoksa modul ithalatta olmesin -- sahne
   calismaz ama modun geri kalani ayakta kalir.               */
const ItemStack = api.ItemStack;

/* ---------------- Envanter yardimcilari ---------------- */

function kutuAl(oyuncu) {
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    return (env && env.container) || null;
  } catch (e) {
    return null;
  }
}

function ekipAl(oyuncu) {
  try {
    const e = oyuncu.getComponent("minecraft:equippable");
    if (!e || typeof e.setEquipment !== "function") return null;
    if (typeof e.getEquipment !== "function") return null;
    return e;
  } catch (e) {
    return null;
  }
}

/* setEquipment bazi surumlerde boolean, bazilarinda hicbir sey
   donuyor. `!== false` ikisini de dogru sayiyor; yalniz ACIK
   basarisizlik hata sayiliyor.                                */
function eleKoy(ekip, esya) {
  try {
    return ekip.setEquipment("Mainhand", esya) !== false;
  } catch (e) {
    hataYaz("kol_takas.eleKoy", e);
    return false;
  }
}

function bosYuvaBul(kutu) {
  for (let i = 0; i < kutu.size; i++) {
    if (!kutu.getItem(i)) return i;
  }
  return -1;
}

function yuvaBul(kutu, tip) {
  for (let i = 0; i < kutu.size; i++) {
    const e = kutu.getItem(i);
    if (e && e.typeId === tip) return i;
  }
  return -1;
}

/* ---------------- Sahne varliklarinin defteri ----------------
   Yarida kalan sahnenin varliklari yerinde kalir (`persistent`
   bilesenleri var). Kimlikleri dunya ozelligine yaziliyor,
   sonraki kullanimda taranip siliniyor. donusum.js'teki kalip.  */

let okundu = false;

function varlikSil(kimlik) {
  try {
    const v = world.getEntity(kimlik);
    if (v && gecerliMi(v)) v.remove();
  } catch (e) {
    /* Chunk yuklu degil: varlik kalir ama kayit da kalir --
       bir sonraki taramada yine denenecek. Bu bir bekleme,
       bir hata degil.                                        */
  }
}

function defteriOku() {
  if (okundu) return;
  okundu = true;
  try {
    const ham = world.getDynamicProperty(KOL_TAKAS_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    for (const kimlik of JSON.parse(ham)) varlikSil(kimlik);
    world.setDynamicProperty(KOL_TAKAS_KAYIT_ANAHTAR, "");
  } catch (e) {
    hataYaz("kol_takas.defteriOku", e);
  }
}

function deftereYaz(kimlikler) {
  try {
    world.setDynamicProperty(KOL_TAKAS_KAYIT_ANAHTAR,
                             JSON.stringify(kimlikler));
  } catch (e) {
    hataYaz("kol_takas.deftereYaz", e);
  }
}

/* Testler ve dunya degisimi icin: yalniz bellegi temizler. */
export function takasUnut() {
  okundu = false;
}

/* ---------------- Omuz konumlari ----------------
   Oyuncunun SAG tarafi bakis yonunden tureniyor. Yon acisi
   (yaw) 0 iken oyuncu +Z'ye bakiyor; o durumda sag el -X'e
   bakar (guneye bakarken bati sagdadir). Yani:
       ileri = (-sin, cos)  ->  sag = (-cos, -sin)             */
function omuzlar(oyuncu) {
  const k = oyuncu.location;
  let sx = -1, sz = 0;
  try {
    const yaw = (oyuncu.getRotation().y * Math.PI) / 180;
    sx = -Math.cos(yaw);
    sz = -Math.sin(yaw);
  } catch (e) {
    /* Donus okunamazsa kollar govdenin iki yanina yine de
       duser, sadece yonu sabit kalir. Sahne bozulmaz.       */
  }
  return {
    sag: { x: k.x + sx * KOL_TAKAS_OMUZ_X, y: k.y + KOL_TAKAS_OMUZ_Y,
           z: k.z + sz * KOL_TAKAS_OMUZ_X },
    sol: { x: k.x - sx * KOL_TAKAS_OMUZ_X, y: k.y + KOL_TAKAS_OMUZ_Y,
           z: k.z - sz * KOL_TAKAS_OMUZ_X },
    /* Gelen kolun hedefi GERCEK omuz yuksekligi: o modelin
       merkezi kendi orijininde (geometride olculerek
       merkezlendi), dusen kollarinki gibi tabanindan degil. */
    varis: { x: k.x + sx * KOL_TAKAS_OMUZ_X, y: k.y + KOL_TAKAS_OMUZ_BOY,
             z: k.z + sz * KOL_TAKAS_OMUZ_X }
  };
}

function dogur(oyuncu, tip, nokta) {
  try {
    return oyuncu.dimension.spawnEntity(tip, nokta) || null;
  } catch (e) {
    hataYaz("kol_takas.dogur(" + tip + ")", e);
    return null;
  }
}

/* Omuzun cevresine kucuk bir kan halkasi.

   NEDEN HALKA VE NEDEN SAYILI: ilk surumde tek bir
   `mobflame_emitter` atiyordum. Emitter tek seferlik bir puf
   degil, surekli alev pusluren bir KAYNAK -- oyuncunun
   yaninda boyundan buyuk, sonmeyen bir alev sutunu dikildi.
   Simdi atilan sey `_particle` ile biten tek seferlik bir toz
   ve KAC TANE oldugu burada belli: kendiliginden buyuyemez. */
function kanHalkasi(boyut, merkez) {
  for (let i = 0; i < KOL_TAKAS_PARCACIK_ADET; i++) {
    const a = (i / KOL_TAKAS_PARCACIK_ADET) * Math.PI * 2;
    parcacikAt(boyut, KOL_TAKAS_PARCACIK, {
      x: merkez.x + Math.cos(a) * KOL_TAKAS_PARCACIK_YARICAP,
      y: merkez.y,
      z: merkez.z + Math.sin(a) * KOL_TAKAS_PARCACIK_YARICAP
    });
  }
}

function sesCal(oyuncu, ses) {
  try {
    if (typeof oyuncu.dimension.playSound === "function") {
      oyuncu.dimension.playSound(ses, oyuncu.location);
    }
  } catch (e) {
    /* playSound bu surumde yoksa sahne yine oynuyor. */
  }
}

/* ============================================================ */

yetenekKaydet({
  kimlik: "kol_takas",
  ad: "Kanlı Kola Geç",
  /* 146 bos: 140 ucurma, 141 can_ver, 142-144 will, 145 kubbe,
     150 yamult. Cakisma testi (siraDenetimi) bunu zorluyor.   */
  sira: 146,

  olustur(oyuncu) {
    if (!KOL_TAKAS_ACIK) {
      actionbarYaz(oyuncu, "Kol takası kapalı (KOL_TAKAS_ACIK).");
      return undefined;
    }
    defteriOku();

    /* ---- ON DENETIM: hicbir seye dokunmadan ----
       Besinin de gecmesi sart. Biri tutmazsa TEK BIR ESYA bile
       oynatilmadan cikiliyor.                                 */
    const ekip = ekipAl(oyuncu);
    if (!ekip) {
      actionbarYaz(oyuncu, "Bu sürümde el değiştirilemiyor, sahne oynatılamaz.");
      return undefined;
    }
    if (eldekiEsya(oyuncu) !== KOL_TAKAS_KAYNAK) {
      actionbarYaz(oyuncu, "Bunun için elinde Toprak Kol olmalı.");
      return undefined;
    }
    const kutu = kutuAl(oyuncu);
    if (!kutu) {
      actionbarYaz(oyuncu, "Envanter okunamadı.");
      return undefined;
    }
    if (yuvaBul(kutu, KOL_TAKAS_HEDEF) === -1) {
      actionbarYaz(oyuncu, "Önce Kanlı Kol'u edinmen lazım.");
      return undefined;
    }
    const bos = bosYuvaBul(kutu);
    if (bos === -1) {
      actionbarYaz(oyuncu, "Envanterde bir boş yer lazım — Toprak Kol oraya konacak.");
      return undefined;
    }

    /* ---- EVRE 0: el degisiyor ----
       KOPYALA-SONRA-SIL: once Toprak Kol bos yuvaya yazilir,
       ANCAK SONRA ana el isaretle eziliyor. Ikinci adim
       tutmazsa kopya geri aliniyor ve sahne hic baslamiyor.  */
    let toprak;
    try {
      toprak = ekip.getEquipment("Mainhand");
    } catch (e) {
      hataYaz("kol_takas.getEquipment", e);
      return undefined;
    }
    if (!toprak) return undefined;

    try {
      kutu.setItem(bos, toprak);
    } catch (e) {
      hataYaz("kol_takas.kopya", e);
      actionbarYaz(oyuncu, "Toprak Kol güvenli bir yere konamadı, sahne iptal.");
      return undefined;
    }

    /* ItemStack YIKICI OLABILIR: kayit defterinde olmayan bir
       kimlik verilirse kurucu ATIYOR (ilkel.mjs'te olculdu --
       gercek oyunda da oyle). Isaret esyasi behavior pack'ten
       geliyor; paket eksikse burasi patlar ve sahne baslamadan
       geri aliniyor.                                          */
    let isaret = null;
    try {
      if (ItemStack) isaret = new ItemStack(KOL_TAKAS_ISARET, 1);
    } catch (e) {
      hataYaz("kol_takas.isaretUret", e);
      isaret = null;
    }
    if (!isaret || !eleKoy(ekip, isaret)) {
      try { kutu.setItem(bos, undefined); } catch (e2) { /* kopya kaldi */ }
      actionbarYaz(oyuncu, "İşaret ele konamadı, sahne iptal — eşyan yerinde.");
      return undefined;
    }

    const yer = omuzlar(oyuncu);
    const dusenler = [
      dogur(oyuncu, KOL_TAKAS_DUSEN_SAG, yer.sag),
      dogur(oyuncu, KOL_TAKAS_DUSEN_SOL, yer.sol)
    ].filter(Boolean);
    deftereYaz(dusenler.map((v) => v.id));

    sesCal(oyuncu, KOL_TAKAS_SES_DUSUS);
    parcacikAt(oyuncu.dimension, PARCACIK_TOPRAK, yer.sag);
    parcacikAt(oyuncu.dimension, PARCACIK_TOPRAK, yer.sol);

    const basladi = system.currentTick;
    let gelen = null;
    let bitti = false;

    return {
      ad: "Kol Takası",
      oyuncuId: oyuncu.id,

      calis() {
        if (bitti) return true;
        if (!gecerliMi(oyuncu)) return true;

        /* GUVENLIK TAVANI: takilan bir varlik ya da hic gelmeyen
           bir varis sahneyi sonsuza kadar acik tutmasin.      */
        const gecen = system.currentTick - basladi;
        if (gecen >= KOL_TAKAS_TAVAN) return true;

        /* ---- EVRE 1-2: kollar dusuyor, sonra bekliyor ----
           Dusmeyi MOTOR yapiyor (varliklarin yercekimi acik),
           burada tek yapilan beklemek. Her tick konum vermek
           hem pahali olurdu hem de yalpalardi.                */
        if (gecen < KOL_TAKAS_YERDE) return false;

        const yeni = omuzlar(oyuncu);

        /* ---- EVRE 3: kanli kol yukarida doguyor ---- */
        if (!gelen) {
          gelen = dogur(oyuncu, KOL_TAKAS_GELEN, {
            x: yeni.varis.x,
            y: yeni.varis.y + KOL_TAKAS_GELIS_YUKSEK,
            z: yeni.varis.z
          });
          if (!gelen) return true;   // dogmadiysa sahne bitsin
          deftereYaz(dusenler.map((v) => v.id).concat([gelen.id]));
          return false;
        }
        if (!gecerliMi(gelen)) return true;

        /* ---- EVRE 3 (devam): her tick omza yaklasiyor ----
           Hedef HER TICK yeniden okunuyor: oyuncu sahne
           sirasinda yuruyebilir, kol pesinden gelsin.         */
        let k;
        try {
          k = gelen.location;
        } catch (e) {
          return true;
        }
        const dx = yeni.varis.x - k.x;
        const dy = yeni.varis.y - k.y;
        const dz = yeni.varis.z - k.z;
        const uzak = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (uzak > KOL_TAKAS_VARIS) {
          const adim = Math.min(KOL_TAKAS_GELIS_HIZ, uzak) / uzak;
          try {
            gelen.teleport({
              x: k.x + dx * adim, y: k.y + dy * adim, z: k.z + dz * adim
            }, { dimension: oyuncu.dimension, keepVelocity: false });
          } catch (e) {
            return true;
          }
          return false;
        }

        /* ---- EVRE 4: TAKILDI ----
           Yine kopyala-sonra-sil: once Kanli Kol ana ele
           yaziliyor (ana elde ezilen sey bizim degersiz
           isaretimiz), ANCAK SONRA kaynak yuvasi bosaltiliyor.
           Ters sirada olsaydi ve ele koyma tutmasaydi Kanli
           Kol yok olurdu.                                     */
        const yuva = yuvaBul(kutu, KOL_TAKAS_HEDEF);
        if (yuva === -1) {
          /* Oyuncu sahne sirasinda Kanli Kol'u atmis. Sahne
             biter, bitir() isareti temizler, hicbir sey
             kaybolmaz.                                        */
          actionbarYaz(oyuncu, "Kanlı Kol envanterde bulunamadı.");
          return true;
        }
        let kanli;
        try {
          kanli = kutu.getItem(yuva);
        } catch (e) {
          return true;
        }
        if (!kanli || !eleKoy(ekip, kanli)) return true;
        try {
          kutu.setItem(yuva, undefined);
        } catch (e) {
          hataYaz("kol_takas.kaynakTemizle", e);   // kopya kaldi, kayip yok
        }

        sesCal(oyuncu, KOL_TAKAS_SES_TAKIL);
        kanHalkasi(oyuncu.dimension, yeni.varis);
        actionbarYaz(oyuncu, "Kanlı Kol takıldı.");
        bitti = true;
        return true;
      },

      bitir() {
        /* HER KOSULDA toparlar: sahne bitse de, tavana carpsa
           da, oyuncu cikip is silinse de.                     */
        for (const v of dusenler) {
          if (v && gecerliMi(v)) {
            try { v.remove(); } catch (e) { hataYaz("kol_takas.temizle", e); }
          }
        }
        if (gelen && gecerliMi(gelen)) {
          try { gelen.remove(); } catch (e) { hataYaz("kol_takas.temizle", e); }
        }
        deftereYaz([]);

        /* Ana elde HALA isaret duruyorsa sahne yarida kalmis.
           Isaret degersiz ve BIZIM urettigimiz -- silinmesi
           kayip degil. Toprak Kol zaten evre 0'da envantere
           TASINDI, yani orada duruyor.                        */
        if (gecerliMi(oyuncu) && eldekiEsya(oyuncu) === KOL_TAKAS_ISARET) {
          eleKoy(ekip, undefined);
        }
        kollariIndir(oyuncu);
      }
    };
  }
});
