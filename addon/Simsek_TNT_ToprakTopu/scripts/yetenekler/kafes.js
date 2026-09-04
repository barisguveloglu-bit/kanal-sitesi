import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi } from "../yardimcilar.js";
import {
  KAFES_ACIK, KAFES_SIRA, KAFES_BEKLEME, KAFES_YARICAP,
  KAFES_KORUNAN, KAFES_KORUNAN_ONEK
} from "../ayarlar.js";

/* KAFES KIRMA -- bloklarla hapsedilmeye karsi savunma.

   ---- NEREDEN GELDI ----
   WDBAX_Client.apk (yeniden paketlenmis Toolbox) incelendi.
   Ozellik listesinde rapid_build, bridge_builder,
   fast_destroy ve nuke var. Bir onceki turda okunan kod
   arsivinde de /fill (26 ozgun) ve /setblock (9 ozgun)
   sayilmisti. Hepsi ayni sonuca cikiyor: etrafina blok
   orup seni oraya kilitlemek.

   Bu, Arinma'nin kapsamadigi tek buyuk delikti: Arinma
   komut kilitlerini aciyor, ama bes blok bedrock'in
   ortasindaysan girdi kilidin acik olmasi seni kurtarmiyor.

   ---- IKI KURAL ----
   1. HAPSEDILMEDIYSEN HICBIR SEYE DOKUNMAZ.
      Bu bir savunma; kendi evini delen bir kazma degil.
      Denetim gecmezse tek bir setType bile calismaz.
   2. AYAGININ ALTINI KIRMAZ.
      Kirsaydi kafesten kurtulup bosluga duserdin.

   ---- ESYA KAYBI ----
   setType("air") esya DUSURMEZ. Duvar bir sandiksa
   icindekiler de yok olurdu. Bu yuzden KAFES_KORUNAN
   listesi var: sandik/firin/huni gibi kap bloklari ve
   "pa:" ile baslayan kendi bloklarimiz kirilmiyor,
   yerlerinde birakilip sayisi bildiriliyor.               */

// oyuncuId -> en son ne zaman kirdi (tick)
const sonKirma = new Map();

export function kafesUnut(oyuncuId) {
  if (oyuncuId === undefined) sonKirma.clear();
  else sonKirma.delete(oyuncuId);
}

const korunanKume = new Set(KAFES_KORUNAN);

/* Bir blok "duvar" mi? Hava ve icinden gecilen seyler degil.
   Liste yerine tersinden bakiliyor: gecilebilen sey azdir,
   duvar olabilecek blok binlercedir.                       */
const GECILIR = new Set([
  "minecraft:air", "minecraft:water", "minecraft:flowing_water",
  "minecraft:lava", "minecraft:flowing_lava", "minecraft:tallgrass",
  "minecraft:short_grass", "minecraft:fire", "minecraft:soul_fire",
  "minecraft:snow_layer", "minecraft:vine", "minecraft:ladder",
  "minecraft:torch", "minecraft:light_block", "minecraft:structure_void"
]);

function gecilirMi(blok) {
  if (!blok) return true;               // yuklenmemis kesim: duvar sayma
  let t;
  try { t = blok.typeId; } catch (e) { return true; }
  if (!t) return true;
  return GECILIR.has(t);
}

function korunanMi(blok) {
  let t;
  try { t = blok.typeId; } catch (e) { return true; }
  if (!t) return true;
  if (korunanKume.has(t)) return true;
  return t.indexOf(KAFES_KORUNAN_ONEK) === 0;
}

/* Oyuncunun ayak ve bas hizasindaki DORT yani ile bas ustu.
   Ayak alti BILEREK yok -- ne olculuyor ne kiriliyor.      */
const YONLER = [
  { x:  1, z:  0 }, { x: -1, z:  0 },
  { x:  0, z:  1 }, { x:  0, z: -1 }
];

function koord(oyuncu) {
  const k = oyuncu.location;
  return { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };
}

/* HAPSEDILDI MI?
   Dort yonun DORDU de hem ayak hem bas hizasinda kapaliysa
   ve tepesi de kapaliysa evet. Uc yon kapali bir kose degil,
   kafes ariyoruz.                                          */
export function hapsedildiMi(oyuncu) {
  const boyut = oyuncu.dimension;
  const m = koord(oyuncu);
  for (const yon of YONLER) {
    for (const dy of [0, 1]) {
      const b = boyut.getBlock({ x: m.x + yon.x, y: m.y + dy, z: m.z + yon.z });
      if (gecilirMi(b)) return false;
    }
  }
  const tepe = boyut.getBlock({ x: m.x, y: m.y + 2, z: m.z });
  if (gecilirMi(tepe)) return false;
  return true;
}

/* Kirilacak yerlerin listesi. Ayak alti (dy < 0) hicbir
   zaman girmiyor.                                          */
function hedefler(m) {
  const r = Math.max(1, KAFES_YARICAP);
  const liste = [];
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dy = 0; dy <= 2; dy++) {
        if (dx === 0 && dz === 0 && dy === 0) continue;   // ayagin durdugu yer
        liste.push({ x: m.x + dx, y: m.y + dy, z: m.z + dz });
      }
    }
  }
  return liste;
}

export function kafesKir(oyuncu) {
  if (!KAFES_ACIK) return "§7Kafes kırma kapalı.";
  if (!gecerliMi(oyuncu)) return "§cKafes kırılamadı.";

  const simdi = system.currentTick;
  const onceki = sonKirma.get(oyuncu.id);
  if (onceki !== undefined && simdi - onceki < KAFES_BEKLEME) {
    const kalan = ((KAFES_BEKLEME - (simdi - onceki)) / 20).toFixed(1);
    return "§eKafes kırma bekliyor §7· " + kalan + " sn";
  }

  let kapali;
  try {
    kapali = hapsedildiMi(oyuncu);
  } catch (e) {
    hataYaz("kafes.denetim", e);
    return "§cKafes durumu okunamadı.";
  }
  /* ANAHTAR MADDE: denetim gecmediyse HICBIR SEY yapilmiyor.
     Bekleme saati bile baslatilmiyor -- bosuna bir denemenin
     bedeli olmamali.                                        */
  if (!kapali) return "§7Hapsedilmiş görünmüyorsun §8· hiçbir bloğa dokunulmadı";

  sonKirma.set(oyuncu.id, simdi);

  const boyut = oyuncu.dimension;
  const m = koord(oyuncu);
  let kirilan = 0, korunan = 0;
  for (const nokta of hedefler(m)) {
    let blok;
    try { blok = boyut.getBlock(nokta); } catch (e) { continue; }
    if (!blok) continue;
    if (gecilirMi(blok)) continue;
    if (korunanMi(blok)) { korunan++; continue; }
    try { blok.setType("minecraft:air"); kirilan++; } catch (e) {
      /* Tek bir blok kirilamazsa OTEKILER YINE KIRILSIN --
         kismi kurtulus da kurtulustur (arinma.js'teki
         ayni gerekce).                                     */
      hataYaz("kafes.setType", e);
    }
  }

  let mesaj = "§aKafes kırıldı §7· " + kirilan + " blok";
  if (korunan > 0) {
    mesaj += " §8· " + korunan + " blok korundu (sandık/kendi bloğun)";
  }
  return mesaj;
}

yetenekKaydet({
  kimlik: "kafes",
  ad: "Kafes Kır",
  esyasiz: true,
  sira: KAFES_SIRA,

  olustur(oyuncu) {
    const cevap = kafesKir(oyuncu);
    try { oyuncu.sendMessage(cevap); } catch (e) {
      hataYaz("kafes.sendMessage", e);
    }
    return undefined;
  }
});
