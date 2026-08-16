import { world, system } from "@minecraft/server";

import {
  SURUM, BEKLEME, KOL_GECIKME, TICK_BLOK_BUTCESI, OLCUM_ACIK,
  OLCUM_SOHBETE, HATA_SOHBETE, ESYASIZ_ACIK, ESYASIZ_EGILME_SART,
  ESYASIZ_BAKIS_ESIGI, ESYASIZ_TUTMA, ESYASIZ_TARAMA
} from "./ayarlar.js";

import {
  hataYaz, bilgiYaz, gecerliMi, olayaAbone, kollariKaldir,
  kollariIndir, actionbarYaz
} from "./yardimcilar.js";

import {
  butceSifirla, olcumSifirla, olcumTickBasla, olcumTickBitir, olcumRaporla
} from "./butce.js";

import { esyaninYetenegi, yetenekAl, esyasizSira, tumYetenekler } from "./yetenekler/kayit.js";

/* ---------------- Yetenek dosyalari ----------------
   Her yetenek kendini kayit defterine yaziyor. Yeni yetenek
   eklemek icin yetenekler/ altina dosya ac ve buraya bir satir
   ekle. Bedrock'ta klasor tarama yok, import sart.              */
import "./yetenekler/yildirim.js";
import "./yetenekler/yildirim_halkasi.js";
import "./yetenekler/alan_simsegi.js";
import "./yetenekler/tnt_yagmuru.js";
import "./yetenekler/toprak_topu.js";
import "./yetenekler/savur.js";
import "./yetenekler/ucus.js";
import "./yetenekler/guclu_tnt.js";
import "./yetenekler/meteor.js";

/* ============================================================
   MERKEZI TICK YONETICISI
   Her yetenek kendi runInterval'ini acmak yerine tek dongu var
   ve butceyi o dagitiyor.
   ============================================================ */

const isler = [];                 // aktif isler
const oyuncununIsi = new Map();   // oyuncuId -> is (oyuncu basina tek efekt)
const sonKullanim = new Map();    // oyuncuId -> son tetikleme tick'i

function isEkle(is) {
  if (OLCUM_ACIK && isler.length === 0) olcumSifirla();
  isler.push(is);
  oyuncununIsi.set(is.oyuncuId, is);
}

function isSil(indeks) {
  const is = isler[indeks];
  isler.splice(indeks, 1);
  if (oyuncununIsi.get(is.oyuncuId) === is) oyuncununIsi.delete(is.oyuncuId);
  try {
    if (typeof is.bitir === "function") is.bitir();
  } catch (e) {
    hataYaz(is.ad + ".bitir", e);
  }
}

system.runInterval(() => {
  // Esyasiz jest taramasi: aktif is olmasa da calismali
  if (ESYASIZ_ACIK) {
    try {
      esyasizTara();
    } catch (e) {
      hataYaz("esyasizTara", e);
    }
  }

  if (isler.length === 0) return;

  butceSifirla();
  olcumTickBasla();

  for (let i = isler.length - 1; i >= 0; i--) {
    const is = isler[i];
    let bitti;
    try {
      bitti = is.calis();
    } catch (e) {
      // Isin kendi ele alamadigi hata: bozuk durumda donmeye devam etmesin
      hataYaz(is.ad, e);
      bitti = true;
    }
    if (bitti) isSil(i);
  }

  olcumTickBitir();
  if (isler.length === 0) olcumRaporla();
}, 1);

/* ============================================================
   ORTAK TETIKLEME YOLU
   Esya ve jest ayni kapidan geciyor: bekleme suresi ve
   oyuncu basina tek efekt kurali ikisinde de ayni.
   ============================================================ */

function yetenekTetikle(oyuncu, kimlik) {
  if (oyuncununIsi.has(oyuncu.id)) return false;

  const simdi = system.currentTick;
  const onceki = sonKullanim.get(oyuncu.id);
  if (onceki !== undefined && simdi - onceki < BEKLEME) return false;
  sonKullanim.set(oyuncu.id, simdi);

  kollariKaldir(oyuncu);

  system.runTimeout(() => {
    try {
      if (!gecerliMi(oyuncu)) return;
      // Gecikme sirasinda baska bir is baslamis olabilir
      if (oyuncununIsi.has(oyuncu.id)) return;

      const tanim = yetenekAl(kimlik);
      if (!tanim) {
        bilgiYaz("UYARI: bilinmeyen yetenek kimligi: " + kimlik);
        kollariIndir(oyuncu);
        return;
      }

      const is = tanim.olustur(oyuncu);
      if (is) isEkle(is);
      else kollariIndir(oyuncu);
    } catch (e) {
      hataYaz("yetenekTetikle(" + kimlik + ")", e);
      kollariIndir(oyuncu);
    }
  }, KOL_GECIKME);

  return true;
}

function kalanBekleme(oyuncuId) {
  const onceki = sonKullanim.get(oyuncuId);
  if (onceki === undefined) return 0;
  const gecen = system.currentTick - onceki;
  return gecen < BEKLEME ? (BEKLEME - gecen) : 0;
}

/* ============================================================
   ESYA ILE TETIKLEME
   ============================================================ */

const girisKuruldu = olayaAbone("itemUse", (olay) => {
  try {
    const oyuncu = olay.source;
    const esya = olay.itemStack;
    if (!oyuncu || !esya) return;

    const tanim = esyaninYetenegi(esya.typeId);
    if (!tanim) return;

    yetenekTetikle(oyuncu, tanim.kimlik);
  } catch (e) {
    hataYaz("itemUse", e);
  }
});

if (!girisKuruldu) {
  bilgiYaz("KRITIK: itemUse olayina abone olunamadi, esyalar calismaz.");
}

/* ============================================================
   ESYASIZ TETIKLEME (JEST)
     egil + tam yukari bak -> yetenek degistir
     egil + zipla          -> secili yetenegi calistir
   ============================================================ */

const esyasizTutma = new Map();   // oyuncuId -> jest kac tick tutuldu
const esyasizSecim = new Map();   // oyuncuId -> sira icindeki indeks
const esyasizZipla = new Map();   // oyuncuId -> onceki taramada zipliyor muydu
const ESYASIZ_TAMAM = -1;         // jest islendi, durus bozulana kadar tekrarlama
let esyasizSayac = 0;

// isJumping bazi surumlerde olmayabilir; bir kez sinanip onbellege alinir
let ziplamaVar;

function ziplamaOkunabilir(oyuncu) {
  if (ziplamaVar === undefined) {
    ziplamaVar = (typeof oyuncu.isJumping === "boolean");
    if (!ziplamaVar) {
      bilgiYaz("UYARI: player.isJumping yok. Esyasiz CALISTIRMA jesti " +
               "kullanilamiyor, sadece yetenek degistirme calisir.");
    }
  }
  return ziplamaVar;
}

function egilmeTamam(oyuncu) {
  return !ESYASIZ_EGILME_SART || oyuncu.isSneaking === true;
}

function degistirmeDurusu(oyuncu) {
  if (!egilmeTamam(oyuncu)) return false;
  return oyuncu.getViewDirection().y >= ESYASIZ_BAKIS_ESIGI;
}

function secimAl(oyuncuId) {
  const i = esyasizSecim.get(oyuncuId);
  return (i === undefined) ? 0 : i;
}

function esyasizTara() {
  if (++esyasizSayac < ESYASIZ_TARAMA) return;
  esyasizSayac = 0;

  const sira = esyasizSira();
  if (sira.length === 0) return;

  let oyuncular;
  try {
    oyuncular = world.getAllPlayers();
  } catch (e) {
    hataYaz("esyasizTara.getAllPlayers", e);
    return;
  }
  if (!oyuncular || oyuncular.length === 0) return;

  for (const oyuncu of oyuncular) {
    try {
      esyasizOyuncu(oyuncu, sira);
    } catch (e) {
      hataYaz("esyasizTara.oyuncu", e);
    }
  }
}

function esyasizOyuncu(oyuncu, sira) {
  const id = oyuncu.id;

  /* --- Jest 1: egil + zipla -> secili yetenegi calistir ---
     Ziplama anlik bir durum; basili tutuldugu surece tekrar
     tetiklenmesin diye yalnizca gecis aninda calisiyor.        */
  if (ziplamaOkunabilir(oyuncu)) {
    const simdiZipliyor = (oyuncu.isJumping === true) && egilmeTamam(oyuncu);
    const oncekiZipliyor = esyasizZipla.get(id) === true;

    if (simdiZipliyor !== oncekiZipliyor) esyasizZipla.set(id, simdiZipliyor);

    if (simdiZipliyor && !oncekiZipliyor) {
      const secim = sira[secimAl(id) % sira.length];
      if (secim && !yetenekTetikle(oyuncu, secim.kimlik)) {
        const kalan = kalanBekleme(id);
        if (kalan > 0) {
          actionbarYaz(oyuncu, "§7" + secim.ad + " §8· §c" +
                       (kalan / 20).toFixed(1) + " sn");
        }
      }
      return;
    }
  }

  /* --- Jest 2: egil + tam yukari bak -> yetenek degistir --- */
  const durum = esyasizTutma.get(id);

  if (!degistirmeDurusu(oyuncu)) {
    if (durum !== undefined) esyasizTutma.delete(id);
    return;
  }

  if (durum === ESYASIZ_TAMAM) return;   // durus bozulana kadar tekrarlama

  const tutulan = (durum || 0) + ESYASIZ_TARAMA;
  if (tutulan < ESYASIZ_TUTMA) {
    esyasizTutma.set(id, tutulan);
    return;
  }

  esyasizTutma.set(id, ESYASIZ_TAMAM);
  const yeni = (secimAl(id) + 1) % sira.length;
  esyasizSecim.set(id, yeni);
  actionbarYaz(oyuncu, "§6» §e" + sira[yeni].ad + " §8(egil + zipla)");
}

/* ============================================================
   OYUNCU OLAYLARI
   ============================================================ */

olayaAbone("playerLeave", (olay) => {
  esyasizTutma.delete(olay.playerId);
  esyasizSecim.delete(olay.playerId);
  esyasizZipla.delete(olay.playerId);

  const is = oyuncununIsi.get(olay.playerId);
  if (is) {
    const indeks = isler.indexOf(is);
    if (indeks !== -1) isSil(indeks);
  }
  sonKullanim.delete(olay.playerId);
});

/* Paketin gercekten calistigini dunyaya girer girmez gormek icin.
   Bu satiri gormuyorsan paket ya etkin degil ya da script hic
   calismamis demektir.                                            */
olayaAbone("playerSpawn", (olay) => {
  if (!olay.initialSpawn) return;
  if (!OLCUM_SOHBETE && !HATA_SOHBETE) return;
  try {
    olay.player.sendMessage(
      "§a[SimsekTNT " + SURUM + "] yuklendi §7· " + tumYetenekler().length +
      " yetenek · butce " + TICK_BLOK_BUTCESI + "/tick" +
      " · olcum " + (OLCUM_ACIK ? "§aacik" : "§7kapali")
    );
  } catch (e) {
    hataYaz("playerSpawn", e);
  }
});

bilgiYaz(
  SURUM + " yuklendi | yetenek: " + tumYetenekler().length +
  " (esyasiz sirada " + esyasizSira().length + ")" +
  " | blok butcesi: " + TICK_BLOK_BUTCESI + "/tick" +
  " | olcum: " + (OLCUM_ACIK ? "acik" : "kapali")
);
