import { world } from "@minecraft/server";
import { hataYaz, kaliciYaz } from "../yardimcilar.js";
import { FTECH_YUKSELTMELER, FTECH_YUVA, FTECH_DEPO_TABAN,
         FTECH_MENZIL_TABAN, DEFTER_TAVAN } from "../ayarlar.js";

/* ================================================================
   F-TECH YUKSELTME DEFTERI                                v7.96.4

   Kaynakta yukseltmeler cantanin 3x3 GRIDINDE duran esyalar.
   Bedrock'ta ozel bir kap arayuzu YOK -- `ActionFormData` liste
   ve dugme cizebiliyor, yuva cizemiyor. Bu yuzden yukseltme
   esyasi ELDE KULLANILARAK takiliyor ve esya harcanyor.

   Kaynagin ilerlemesi korunuyor: yukseltmeyi uret -> tak ->
   modul acilir. Degisen tek sey takma jesti.

   ---- DEFTER DUNYADA ----
   zirh_agac.js'teki kalibin aynisi: tek dunya ozelliginde tek
   JSON. Oyuncu basina ayri anahtar tutmak dunya ozelligi
   sayisini oyuncu sayisiyla carpardi.

   ---- OZELLIK YOKSA ----
   getDynamicProperty her surumde yok. Yoksa defter BELLEKTE
   duruyor (dunya kapaninca sifirlanir). Yukseltme esyasi o
   durumda da harcaniyor -- yoksa "taktim ama acilmadi"
   olurdu; harcanmamasi daha kotu, cunku oyuncu ayni esyayi
   tekrar tekrar takip sonsuz menzil kazanirdi.
   ================================================================ */

const ANAHTAR = "pa_ftech";

/* oyuncuId -> { <yukseltmeKimligi>: adet } */
let defter;
let ozellikVar;
let uyarildi = false;

function yukle() {
  if (defter) return;
  defter = new Map();
  try {
    if (typeof world.getDynamicProperty !== "function") {
      ozellikVar = false;
      return;
    }
    ozellikVar = true;
    const ham = world.getDynamicProperty(ANAHTAR);
    if (typeof ham !== "string" || !ham) return;
    const d = JSON.parse(ham);
    for (const [oid, sayac] of Object.entries(d.takili || {})) {
      defter.set(oid, Object.assign({}, sayac));
    }
  } catch (e) {
    hataYaz("ftech_defteri.yukle", e);
  }
}

function kaydet() {
  if (!ozellikVar) return;
  try {
    const takili = {};
    for (const [oid, sayac] of defter) takili[oid] = sayac;
    /* Kirpma EN ESKI OYUNCUYU dusuruyor: nesne anahtarlari
       eklenme sirasini koruyor, yani ilk anahtar en eski. */
    kaliciYaz(ANAHTAR, { takili }, (d, oran) => {
      const kimlikler = Object.keys(d.takili);
      const at = Math.max(1, Math.ceil(kimlikler.length * oran));
      if (kimlikler.length <= at) return undefined;
      const dusen = new Set(kimlikler.slice(0, at));
      const yeni = {};
      for (const [k, v] of Object.entries(d.takili)) if (!dusen.has(k)) yeni[k] = v;
      return { takili: yeni };
    }, DEFTER_TAVAN);
  } catch (e) {
    hataYaz("ftech_defteri.kaydet", e);
  }
}

export function ftechUnut(oyuncuId) {
  yukle();
  if (oyuncuId === undefined) defter.clear();
  else defter.delete(oyuncuId);
  kaydet();
}

/* Takili yukseltmelerin sayaci. Kopya doner -- cagiran
   tarafin defteri elle degistirmesini engeller.           */
export function takiliYukseltmeler(oyuncuId) {
  yukle();
  return Object.assign({}, defter.get(oyuncuId) || {});
}

/* Kac yuva dolu. Istiflenen yukseltmeler her biri bir yuva. */
export function doluYuva(oyuncuId) {
  const s = takiliYukseltmeler(oyuncuId);
  let n = 0;
  for (const k of Object.keys(s)) n += s[k];
  return n;
}

/* Bir yetenek acik mi: onu acan yukseltme takili mi.       */
export function modulAcikMi(oyuncuId, yetenekKimligi) {
  const s = takiliYukseltmeler(oyuncuId);
  for (const [kimlik, t] of FTECH_YUKSELTMELER) {
    if (t.acar === yetenekKimligi && s[kimlik]) return true;
  }
  return false;
}

export function kuyrukAcikMi(oyuncuId) {
  const s = takiliYukseltmeler(oyuncuId);
  for (const [kimlik, t] of FTECH_YUKSELTMELER) {
    if (t.kuyruk && s[kimlik]) return true;
  }
  return false;
}

/* BackpackItem.BASE_CAPACITY + takili depo yukseltmeleri. */
export function depoKapasitesi(oyuncuId) {
  const s = takiliYukseltmeler(oyuncuId);
  let k = FTECH_DEPO_TABAN;
  for (const [kimlik, t] of FTECH_YUKSELTMELER) {
    if (t.depo && s[kimlik]) k += t.depo * s[kimlik];
  }
  return k;
}

/* BackpackItem.BASE_MAX_RANGE + takili menzil yukseltmeleri. */
export function kolMenzili(oyuncuId) {
  const s = takiliYukseltmeler(oyuncuId);
  let m = FTECH_MENZIL_TABAN;
  for (const [kimlik, t] of FTECH_YUKSELTMELER) {
    if (t.menzil && s[kimlik]) m += t.menzil * s[kimlik];
  }
  return m;
}

/* Takma. Doner: {oldu, sebep}.
   Sebepler kaynagin kendi iki reddi:
     - "dolu"  : dokuz yuva dolu
     - "tekrar": allowsMultiple() false olan bir yukseltme
                 ikinci kez takilamaz                        */
export function yukseltmeTak(oyuncuId, kimlik) {
  yukle();
  const tanim = FTECH_YUKSELTMELER.get(kimlik);
  if (!tanim) return { oldu: false, sebep: "bilinmiyor" };

  const sayac = defter.get(oyuncuId) || {};
  if (!tanim.coklu && sayac[kimlik]) return { oldu: false, sebep: "tekrar" };

  let dolu = 0;
  for (const k of Object.keys(sayac)) dolu += sayac[k];
  if (dolu >= FTECH_YUVA) return { oldu: false, sebep: "dolu" };

  sayac[kimlik] = (sayac[kimlik] || 0) + 1;
  defter.set(oyuncuId, sayac);
  kaydet();

  if (!ozellikVar && !uyarildi) {
    uyarildi = true;
    hataYaz("ftech_defteri", new Error(
      "getDynamicProperty yok: yukseltmeler bellekte, dunya kapaninca gider"));
  }
  return { oldu: true, sebep: "" };
}
