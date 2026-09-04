import { world } from "@minecraft/server";
import { hataYaz } from "../yardimcilar.js";
import {
  ZIRH_AGAC_ACIK, ZIRH_AGAC_ANAHTAR, ZIRH_AGAC_KOK, ZIRH_AGAC_BEDEL,
  ZIRH_CARK_XP, ZIRH_MODLAR, ZIRH_CEKIRDEK_ONEK
} from "../ayarlar.js";

/* ================================================================
   MAX STEEL YETENEK AGACI                                  v5.9

   Kullanici: "yetenek agaclarini dikkatlice hepsinin
   aldiklarimiz dahil teker teker bak, bizim yetenek agacimiz
   ile ayni olmasini istiyorum, bu modun yetenek agaci ile."

   Kaynakta olculdu (base_mode.json, 24 dugum): her mod
   `palladium:item_buyable` ile, KENDI CEKIRDEGI odenerek
   aciliyor. Bizde cekirdek ELDE TUTULAN bir anahtardi --
   birakinca guc gidiyordu, yani agac yoktu.

   Artik cekirdek bir kez HARCANIYOR, mod KALICI aciliyor.
   Tablo ve gerekcesi ayarlar.js:ZIRH_AGAC_BEDEL.

   ---- DEFTER DUNYADA ----
   Beceri agacindaki kalibin aynisi: dunya dinamik ozelliginde
   tek bir JSON. Oyuncu basina ayri anahtar tutmak dunya
   ozelligi sayisini oyuncu sayisiyla carpardi.

   ---- OZELLIK YOKSA ----
   getDynamicProperty her surumde yok. Yoksa agac BELLEKTE
   tutuluyor (dunya kapaninca sifirlanir) ve bir kez bilgi
   yaziliyor -- mahou'daki mana kalibinin aynisi. Boylece
   "cekirdegim gitti ama mod acilmadi" olmuyor.
   ================================================================ */

/* oyuncuId -> Set(mod) */
let defter;
/* Mod carki alindi mi: oyuncuId kumesi */
let cark;
/* oyuncuId -> SECILI mod (kaynaktaki mode_select carkinin
   sonucu). Cekirdek HARCANDIGI icin "elinde ne var" artik
   modu belirleyemez -- kaynakta da belirlemiyor.            */
let secili;
let ozellikVar;

function yukle() {
  if (defter) return;
  defter = new Map();
  cark = new Set();
  secili = new Map();
  try {
    if (typeof world.getDynamicProperty !== "function") {
      ozellikVar = false;
      return;
    }
    ozellikVar = true;
    const ham = world.getDynamicProperty(ZIRH_AGAC_ANAHTAR);
    if (typeof ham !== "string" || !ham) return;
    const d = JSON.parse(ham);
    for (const [oid, modlar] of Object.entries(d.acik || {})) {
      defter.set(oid, new Set(modlar));
    }
    for (const oid of (d.cark || [])) cark.add(oid);
    for (const [oid, m] of Object.entries(d.secili || {})) secili.set(oid, m);
  } catch (e) {
    hataYaz("zirh_agac.yukle", e);
  }
}

function kaydet() {
  if (!ozellikVar) return;
  try {
    const acik = {};
    for (const [oid, kume] of defter) acik[oid] = [...kume];
    world.setDynamicProperty(ZIRH_AGAC_ANAHTAR,
      JSON.stringify({ acik, cark: [...cark],
                       secili: Object.fromEntries(secili) }));
  } catch (e) {
    hataYaz("zirh_agac.kaydet", e);
  }
}

/* Testler ve dunya degisimi icin: HER SEYI unutur. */
export function zirhAgacUnut() {
  defter = undefined;
  cark = undefined;
  secili = undefined;
  ozellikVar = undefined;
}

/* ---- TEK OYUNCUYU UNUT  (v7.24) ----
   Yukaridaki modulun TAMAMINI sifirliyor; oyuncu cikinca onu
   cagirmak oyunda kalanlarin da agacini silerdi. O yuzden
   playerLeave'e hic baglanmamisti ve uc defter (secili,
   defter, cark) oyuncu kimligiyle suresiz buyuyordu.

   Bu ise yalniz o oyuncunun satirlarini dusuruyor. Defterler
   tembel kuruluyor (undefined olabilir), o yuzden her birine
   ayri bakiliyor -- birini unutmak sessiz bir sizinti olurdu. */
export function zirhAgacOyuncuUnut(oyuncuId) {
  if (oyuncuId === undefined) return;
  if (secili) secili.delete(oyuncuId);
  if (defter) defter.delete(oyuncuId);
  if (cark) cark.delete(oyuncuId);
}

/* ---- SECILI MOD  (v5.9) ----
   Kaynakta cekirdek HARCANIYOR; modu "elinde ne var" degil
   `mode_select` carki belirliyor. Bizde de oyle: acilmis
   modlardan biri secili kaliyor.                            */
export function secilenMod(oyuncuId) {
  yukle();
  const m = secili.get(oyuncuId);
  if (m && modAcikMi(oyuncuId, m)) return m;
  return undefined;
}

export function modSec(oyuncu, mod) {
  if (!ZIRH_AGAC_ACIK) return { tamam: false, sebep: "Ağaç kapalı" };
  if (!modAcikMi(oyuncu.id, mod)) {
    return { tamam: false, sebep: "Bu mod henüz açık değil" };
  }
  /* ---- CARK SECIMIN SARTI DEGIL ----
   Once "moda gecmek icin cark gerek" yazmistim. KAYNAKTA
   OYLE DEGIL: base_mode agacinda her modun kendi dugumu bir
   `command` -- dugumu acmak zaten o moda geciriyor.
   `mode_select` ayri bir dugum ve isi HIZLI GECIS (cark
   arayuzu), gecisin sarti degil. Test yakaladi: ilk
   cekirdegini harcayan oyuncu 30 XP bulana kadar hicbir
   moda giremiyordu -- kaynakta olmayan bir kilit.          */
  yukle();
  secili.set(oyuncu.id, mod);
  kaydet();
  return { tamam: true, sebep: "" };
}

/* Bu mod bu oyuncuda ACIK mi? Kok her zaman acik. */
export function modAcikMi(oyuncuId, mod) {
  if (!ZIRH_AGAC_ACIK) return true;
  if (mod === ZIRH_AGAC_KOK) return true;
  yukle();
  const kume = defter.get(oyuncuId);
  return !!kume && kume.has(mod);
}

export function carkAlindiMi(oyuncuId) {
  if (!ZIRH_AGAC_ACIK) return true;
  yukle();
  return cark.has(oyuncuId);
}

export function acikModlar(oyuncuId) {
  yukle();
  const kume = defter.get(oyuncuId);
  const liste = [ZIRH_AGAC_KOK];
  if (kume) for (const m of kume) if (m !== ZIRH_AGAC_KOK) liste.push(m);
  return liste;
}

/* Cekirdegi HARCAYIP modu kalici ac.

   Donus: {tamam, sebep}. Sebep metni menude gosteriliyor --
   "neden olmadi" sorusunun cevabi kullanicida kalsin.        */
export function modAc(oyuncu, mod) {
  if (!ZIRH_AGAC_ACIK) return { tamam: false, sebep: "Ağaç kapalı" };
  if (!ZIRH_MODLAR.has(mod)) return { tamam: false, sebep: "Böyle bir mod yok" };
  if (mod === ZIRH_AGAC_KOK) {
    return { tamam: false, sebep: "Temel zaten açık (ağacın kökü)" };
  }
  yukle();
  if (modAcikMi(oyuncu.id, mod)) {
    return { tamam: false, sebep: "Zaten açık" };
  }
  const esya = ZIRH_CEKIRDEK_ONEK + mod;
  if (!cekirdekHarca(oyuncu, esya)) {
    const t = ZIRH_MODLAR.get(mod);
    return { tamam: false,
             sebep: (t ? t.ad : mod) + " çekirdeği gerek (elinde yok)" };
  }
  let kume = defter.get(oyuncu.id);
  if (!kume) { kume = new Set(); defter.set(oyuncu.id, kume); }
  kume.add(mod);
  kaydet();
  return { tamam: true, sebep: "" };
}

/* Mod carkini (mod secimini) XP ile ac -- kaynaktaki
   mode_select dugumu, 30 XP kademesi.                        */
export function carkAc(oyuncu) {
  if (!ZIRH_AGAC_ACIK) return { tamam: false, sebep: "Ağaç kapalı" };
  yukle();
  if (cark.has(oyuncu.id)) return { tamam: false, sebep: "Zaten açık" };
  let kademe = 0;
  try { kademe = oyuncu.level || 0; } catch (e) { kademe = 0; }
  if (kademe < ZIRH_CARK_XP) {
    return { tamam: false,
             sebep: ZIRH_CARK_XP + " XP kademesi gerek (sende " + kademe + ")" };
  }
  try {
    if (typeof oyuncu.addLevels === "function") oyuncu.addLevels(-ZIRH_CARK_XP);
  } catch (e) {
    hataYaz("zirh_agac.xp", e);
    return { tamam: false, sebep: "XP alınamadı" };
  }
  cark.add(oyuncu.id);
  kaydet();
  return { tamam: true, sebep: "" };
}

/* Elindeki cekirdegi bir adet eksilt. Kaynaktaki
   item_buyable de esyayi TUKETIYOR.                          */
function cekirdekHarca(oyuncu, esyaKimlik) {
  let env;
  try {
    const c = oyuncu.getComponent("minecraft:inventory");
    env = c && c.container;
  } catch (e) {
    return false;
  }
  if (!env) return false;
  for (let i = 0; i < env.size; i++) {
    let y;
    try { y = env.getItem(i); } catch (e) { continue; }
    if (!y || y.typeId !== esyaKimlik) continue;
    try {
      if (y.amount > 1) {
        y.amount = y.amount - 1;
        env.setItem(i, y);
      } else {
        env.setItem(i, undefined);
      }
      return true;
    } catch (e) {
      hataYaz("zirh_agac.harca", e);
      return false;
    }
  }
  return false;
}

/* Menu icin: her modun agactaki durumu. */
export function agacListesi(oyuncu) {
  const liste = [];
  for (const [anahtar, t] of ZIRH_MODLAR) {
    liste.push({
      anahtar,
      ad: t.ad,
      ozet: t.ozet,
      kok: anahtar === ZIRH_AGAC_KOK,
      acik: modAcikMi(oyuncu.id, anahtar),
      bedel: ZIRH_AGAC_BEDEL.get(anahtar) || null,
      esya: ZIRH_CEKIRDEK_ONEK + anahtar
    });
  }
  return liste;
}

/* Oyuncu cikinca bellek defterinden dusmesin: agac KALICI.
   Yalniz dunya ozelligi yoksa bellekte tutuluyor ve orada da
   kalmali (oyuncu geri girerse acik kalsin).                 */
