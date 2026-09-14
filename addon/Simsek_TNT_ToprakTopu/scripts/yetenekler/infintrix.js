import { world } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, baslikYaz, parcacikAt
} from "../yardimcilar.js";
import {
  SNS_ACIK, SNS_SIRA_BAS, SNS_KAYIT_ANAHTAR,
  SNS_SES_AC, SNS_SES_KAPA, SNS_SES_TAK, SNS_SES_YAN,
  SNS_PARCACIK_AC, SNS_PARCACIK_KAPA, SNS_PARCACIK_TAK,
  SNS_OMNI_SURE, SNS_SARJ, SNS_GUC_SAYAC, SNS_GUC_ESIK,
  SNS_USTA_SURE, SNS_YANIK, SNS_KILIT_ESIK,
  SONSUZLUK_TASLARI, BEN10_BICIM
} from "../ayarlar.js";

/* SONSUZLUK TASLARI  --  `infintrix-2.2.jar`          v7.93

   Modun ne oldugu, hangi bes mekanigin alindigi ve dort tasin
   neden bos durdugu ayarlar.js'te ve REFERANS_INFINTRIX.md'de
   olculeriyle yazili. Bu dosya YALNIZ isi yapiyor.

   ---- NEDEN BEN10.JS'E ITHAL EDILMIYOR ----
   Bu dosya ben10.js'ten HICBIR SEY ithal etmiyor, tersi var:
   ben10.js buradan `omniIlerlet` aliyor. Iki yonlu olsaydi
   dairesel ithal olurdu ve ESM'de dairesel ithal yuklenme
   sirasina gore `undefined` verir -- sessiz, bulmasi zor bir
   hata sinifi. Bicim ekini de BEN10_BICIM'den kendimiz
   cikariyoruz, ben10.js'ten istemiyoruz.                     */

/* oyuncuId -> durum */
const durumlar = new Map();

function yeni() {
  return {
    eldiven: false,
    taslar: [],          // secili tas anahtarlari (sirali, benzersiz)
    sayac: 0,            // donusumde gecen tick
    sarj: 0,             // kalan sarj/kilit tick
    sertKilit: false,    // kaynaktaki `no_instant_timein`
    usta: 0,             // Usta Denetimi'nde gecen tick
    ustaAcik: false
  };
}
function d(oyuncuId) {
  let s = durumlar.get(oyuncuId);
  if (!s) { s = yeni(); durumlar.set(oyuncuId, s); }
  return s;
}

export function sonsuzlukUnut(oyuncuId) {
  if (oyuncuId === undefined) durumlar.clear();
  else durumlar.delete(oyuncuId);
}
/* Oyuncu CIKARKEN cagriliyor. Eldiveni ve taslari SILMIYOR --
   ikisi de dunyaya yazili ve geri girince durmali. Yalniz o
   anki sayaclar sifirlaniyor; cikip giren oyuncunun yanik
   cezasi devam etmesin diye degil, cikikken gecen sureyi
   sayamadigimiz icin: yanlis bir sayac tutmaktansa sifirdan
   baslamak durust.  (nefes.js'te ayni ayrim yazili.)         */
export function sonsuzlukCikti(oyuncuId) {
  const s = durumlar.get(oyuncuId);
  if (!s) return;
  s.sayac = 0; s.sarj = 0; s.sertKilit = false;
  s.usta = 0; s.ustaAcik = false;
}
export function sonsuzlukDurum(oyuncuId) { return durumlar.get(oyuncuId); }
export function eldivenAcikMi(oyuncuId) {
  const s = durumlar.get(oyuncuId);
  return !!(s && s.eldiven);
}
export function tasTam(oyuncuId) {
  const s = durumlar.get(oyuncuId);
  return !!(s && s.taslar.length === SONSUZLUK_TASLARI.size);
}

/* ---- KALICILIK ----
   Dunya ozelligi yoksa bellekte kaliyor: eksigi durustce
   soylemek, sessizce catlamaktan iyi (nefes.js ile ayni). */
function kayitOku() {
  try {
    if (typeof world.getDynamicProperty !== "function") return;
    const ham = world.getDynamicProperty(SNS_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || !ham) return;
    for (const [id, k] of Object.entries(JSON.parse(ham))) {
      const s = yeni();
      s.eldiven = !!(k && k.e);
      for (const t of (k && k.t) || []) {
        if (SONSUZLUK_TASLARI.has(t) && !s.taslar.includes(t)) s.taslar.push(t);
      }
      durumlar.set(id, s);
    }
  } catch (e) { hataYaz("sonsuzluk.kayitOku", e); }
}
function kayitYaz() {
  try {
    if (typeof world.setDynamicProperty !== "function") return;
    const o = {};
    for (const [id, s] of durumlar) {
      if (!s.eldiven && s.taslar.length === 0) continue;   // bos kayit yazma
      o[id] = { e: s.eldiven, t: s.taslar };
    }
    world.setDynamicProperty(SNS_KAYIT_ANAHTAR, JSON.stringify(o));
  } catch (e) { hataYaz("sonsuzluk.kayitYaz", e); }
}
kayitOku();

/* Yaratik anahtarindan BICIM EKI. "ben_ates_10k" -> "_10k".
   Yanik cezasinin uzunlugu buna bagli (kaynakta da Omnitrix
   surumune bagli).                                          */
export function bicimEki(anahtar) {
  if (typeof anahtar !== "string") return "";
  for (const [ek] of BEN10_BICIM) {
    if (ek && anahtar.endsWith(ek)) return ek;
  }
  return "";
}

function ses(oyuncu, ad) {
  try { oyuncu.dimension.playSound(ad, oyuncu.location); }
  catch (e) { /* ses onemsiz */ }
}
function toz(oyuncu, tip) {
  try { parcacikAt(oyuncu.dimension, tip, oyuncu.location); }
  catch (e) { /* gorsel onemsiz */ }
}

/* ============================================================
   OMNITRIX SAYACI
   ben10.js her taramada bunu cagiriyor ve donen karari
   uyguluyor. Donen: { engelle, usta }
     engelle -> bu tarama efekt VERILMESIN
     usta    -> yaratik elde olmasa da son turun gucleri devam
   ============================================================ */
export function omniIlerlet(oyuncuId, anahtar, gecen) {
  if (!SNS_ACIK) return { engelle: false, usta: false };
  const s = durumlar.get(oyuncuId);
  /* ELDIVEN KAPALIYSA HIC KARISMA. Bugune kadarki Ben 10
     davranisi aynen kalsin -- bu sistem istege bagli.       */
  if (!s || !s.eldiven) return { engelle: false, usta: false };

  const adim = gecen > 0 ? gecen : 1;
  const tam = s.taslar.length === SONSUZLUK_TASLARI.size;
  const gucVar = s.taslar.includes("guc");

  /* ---- 1. KILIT/SARJ ISLIYOR MU ---- */
  if (s.sarj > 0) {
    s.sarj -= adim;
    /* `remove_tag`: sayac esigin altina inince sert kilit
       kalkiyor. Kaynakta esik 5.                            */
    if (s.sarj <= SNS_KILIT_ESIK) s.sertKilit = false;
    /* `infinite_power`: Guc Tasi sayaci 2'ye cekiyor -- ama
       sert kilit varken DEGIL. Kaynaktaki kosul birebir.    */
    if (gucVar && !s.sertKilit && s.sarj >= SNS_GUC_ESIK) {
      s.sarj = SNS_GUC_SAYAC;
    }
    if (s.sarj > 0) return { engelle: true, usta: false };
    s.sarj = 0;
    s.sayac = 0;
  }

  /* ---- 2. USTA DENETIMI ----
     `all_6` + eldiven. Kaynakta MasterControl etiketi; bizde
     "yaratik elde olmasa da guc devam eder".                */
  if (tam) {
    if (!s.ustaAcik) { s.ustaAcik = true; s.usta = 0; }
    s.usta += adim;
    if (s.usta >= SNS_USTA_SURE) {
      /* `snap_burn`: Usta Denetimi yaniyor.                 */
      s.ustaAcik = false;
      s.usta = 0;
      s.sarj = SNS_YANIK.get(bicimEki(anahtar)) || SNS_YANIK.get("") || SNS_SARJ;
      s.sertKilit = true;      // Guc Tasi BU cezayi atlayamaz
      s.sayac = 0;
      return { engelle: true, usta: false, yandi: true };
    }
    return { engelle: false, usta: true };
  }
  s.ustaAcik = false;
  s.usta = 0;

  /* ---- 3. NORMAL DONUSUM SAYACI ----
     Yalniz yaratik ELDEYKEN isliyor; el bosalinca sifirlaniyor
     (kaynakta da sayac donusum sirasinda isliyor).           */
  if (!anahtar) { s.sayac = 0; return { engelle: false, usta: false }; }
  s.sayac += adim;
  if (s.sayac >= SNS_OMNI_SURE) {
    s.sayac = 0;
    s.sarj = SNS_SARJ;
    s.sertKilit = false;
    /* Guc Tasi normal sarji ANINDA bitiriyor -- modun tek
       gercek guclendirmesi bu.                              */
    if (gucVar && s.sarj >= SNS_GUC_ESIK) s.sarj = SNS_GUC_SAYAC;
    return { engelle: true, usta: false };
  }
  return { engelle: false, usta: false };
}

/* ============================================================
   YETENEKLER
   ============================================================ */
let _sira = SNS_SIRA_BAS;

/* 1. ELDIVEN -- kaynaktaki gauntlet_on / gauntlet_off. */
yetenekKaydet({
  kimlik: "eldiven",
  ad: "Sonsuzluk Eldiveni",
  esyasiz: true,
  sira: _sira++,
  olustur(oyuncu) {
    if (!SNS_ACIK) { kollariIndir(oyuncu); return undefined; }
    const s = d(oyuncu.id);
    s.eldiven = !s.eldiven;
    if (!s.eldiven) {
      /* Cikarinca sayaclar da sifirlaniyor: yanik cezasini
         eldiveni cikarip takarak silmek sorun degil mi diye
         dusunuldu -- degil, cunku eldiven kapaliyken Usta
         Denetimi ve sinirsiz donusum de yok. Ceza ile odul
         ayni anahtara bagli.                                */
      s.sayac = 0; s.sarj = 0; s.sertKilit = false;
      s.usta = 0; s.ustaAcik = false;
      ses(oyuncu, SNS_SES_KAPA);
      toz(oyuncu, SNS_PARCACIK_KAPA);
      actionbarYaz(oyuncu, "§8✦ Sonsuzluk Eldiveni çıkarıldı");
    } else {
      ses(oyuncu, SNS_SES_AC);
      toz(oyuncu, SNS_PARCACIK_AC);
      actionbarYaz(oyuncu, "§e✦ §fSonsuzluk Eldiveni §8· " +
        s.taslar.length + "/" + SONSUZLUK_TASLARI.size + " taş");
    }
    kayitYaz();
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* 2. ALTI TAS -- her biri TAKMA/CIKARMA anahtari.

   Kaynakta tasi yuvaya oturtan taraf `Infinity Stone Core`
   modu; o mod yuklenmedigi icin burada komutla takiliyor.
   Bu bir UYDURMA degil, beyan edilmis bir ikame: kaynaktaki
   `objective_score` okumasinin yerine gecen sey.             */
for (const [anahtar, t] of SONSUZLUK_TASLARI) {
  yetenekKaydet({
    kimlik: "tas_" + anahtar,
    ad: t.ad,
    esyasiz: true,
    sira: _sira++,
    olustur(oyuncu) {
      if (!SNS_ACIK) { kollariIndir(oyuncu); return undefined; }
      const s = d(oyuncu.id);
      /* Kaynakta her tas yetenegi `has_power infinity_gauntlet`
         istiyor: eldiven yoksa yuva da yok.                  */
      if (!s.eldiven) {
        actionbarYaz(oyuncu, "§7Önce Sonsuzluk Eldiveni'ni tak");
        kollariIndir(oyuncu);
        return undefined;
      }
      const yer = s.taslar.indexOf(anahtar);
      if (yer >= 0) {
        s.taslar.splice(yer, 1);
        s.ustaAcik = false; s.usta = 0;
        actionbarYaz(oyuncu, "§8" + t.ad + " çıkarıldı §8· " +
          s.taslar.length + "/" + SONSUZLUK_TASLARI.size);
      } else {
        s.taslar.push(anahtar);
        ses(oyuncu, SNS_SES_TAK);
        toz(oyuncu, SNS_PARCACIK_TAK);
        actionbarYaz(oyuncu, t.renk + "✦ §f" + t.ad + " takıldı §8· " +
          s.taslar.length + "/" + SONSUZLUK_TASLARI.size);
        if (s.taslar.length === SONSUZLUK_TASLARI.size) {
          try {
            baslikYaz(oyuncu, "§e✦ Usta Denetimi", "§7altı taş tamam");
          } catch (e) { /* gorsel onemsiz */ }
        }
      }
      kayitYaz();
      kollariIndir(oyuncu);
      return undefined;
    }
  });
}

/* 3. DURUM -- sayaclari okumanin tek yolu.
   Kaynakta bu bilgi ability bar'da duruyor; bizde jest
   listesi var, o yuzden ayri bir okuma yetenegi.            */
yetenekKaydet({
  kimlik: "sonsuzluk_durum",
  ad: "Sonsuzluk Durumu",
  esyasiz: true,
  sira: _sira++,
  olustur(oyuncu) {
    if (!SNS_ACIK) { kollariIndir(oyuncu); return undefined; }
    const s = durumlar.get(oyuncu.id);
    if (!s || (!s.eldiven && s.taslar.length === 0)) {
      actionbarYaz(oyuncu, "§7Sonsuzluk Eldiveni takılı değil");
      kollariIndir(oyuncu);
      return undefined;
    }
    const takili = [...SONSUZLUK_TASLARI]
      .map(([k, t]) => (s.taslar.includes(k) ? t.renk + "●" : "§8○"))
      .join("");
    let satir = (s.eldiven ? "§e✦ " : "§8✦ ") + takili;
    if (s.sarj > 0) {
      satir += " §8· §c" + (s.sertKilit ? "yanık " : "şarj ") +
               Math.ceil(s.sarj / 20) + " sn";
    } else if (s.ustaAcik) {
      satir += " §8· §eUsta Denetimi " +
               Math.ceil((SNS_USTA_SURE - s.usta) / 20) + " sn";
    } else if (s.eldiven) {
      satir += " §8· §ahazır";
    }
    actionbarYaz(oyuncu, satir);
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* Yanma anini oyuncuya DUYURMAK icin: ben10.js karari
   uygularken bunu cagiriyor. Ayri durmasinin sebebi
   omniIlerlet'in saf kalmasi -- o yalniz karar veriyor,
   ekrana yazmiyor; boylece testte yan etkisiz cagrilabiliyor. */
export function yanmaBildir(oyuncu) {
  try {
    if (!gecerliMi(oyuncu)) return;
    ses(oyuncu, SNS_SES_YAN);
    toz(oyuncu, SNS_PARCACIK_KAPA);
    baslikYaz(oyuncu, "§c✦ Omnitrix yandı", "§7usta denetimi bitti");
  } catch (e) { hataYaz("sonsuzluk.yanma", e); }
}
