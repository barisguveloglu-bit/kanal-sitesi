import { system } from "@minecraft/server";
import { yetenekKaydet, esyaninYetenekleri } from "./kayit.js";
import { sadelestir } from "../sohbet.js";
import {
  hataYaz, gecerliMi, eldekiEsya, basKonumu, parcacikAt,
  parcacikHalkasi, actionbarYaz, koniHedefleri
} from "../yardimcilar.js";
import { varlikIste } from "../butce.js";
import { ruhCarpani, ruhOku, ruhYaz } from "./ruh.js";
import { mermiIsi } from "./ruh_yetenekler.js";
import {
  JJK_ACIK, JJK_KOL_KES, JJK_KARAKTERLER, JJK_VARSAYILAN,
  JJK_SONSUZ_ETIKET,
  JJK_MAVI_ACIK, JJK_MAVI_SIRA, JJK_MAVI_MENZIL, JJK_MAVI_YARICAP,
  JJK_MAVI_HASAR, JJK_MAVI_CEKIM, JJK_MAVI_TAVAN, JJK_MAVI_BEDEL,
  JJK_KIRMIZI_ACIK, JJK_KIRMIZI_SIRA, JJK_KIRMIZI_MENZIL,
  JJK_KIRMIZI_HASAR, JJK_KIRMIZI_HIZ, JJK_KIRMIZI_OMUR,
  JJK_KIRMIZI_ITME, JJK_KIRMIZI_BEDEL,
  JJK_MOR_ACIK, JJK_MOR_SIRA, JJK_MOR_MENZIL, JJK_MOR_HASAR,
  JJK_MOR_HIZ, JJK_MOR_OMUR, JJK_MOR_BEDEL,
  JJK_SONSUZ_ACIK, JJK_SONSUZ_SIRA, JJK_SONSUZ_SURE, JJK_SONSUZ_AKIS,
  JJK_SONSUZ_ADIM, JJK_SONSUZ_DIRENC, JJK_SONSUZ_BEDEL,
  JJK_BOSLUK_ACIK, JJK_BOSLUK_SIRA, JJK_BOSLUK_YARICAP, JJK_BOSLUK_SURE,
  JJK_BOSLUK_ADIM, JJK_BOSLUK_HASAR, JJK_BOSLUK_KORLUK,
  JJK_BOSLUK_TAVAN, JJK_BOSLUK_BEDEL,
  JJK_KIYAFET_ACIK, JJK_KIYAFET_SIRA, JJK_KIYAFET_SURE,
  JJK_KIYAFET_BEDEL, JJK_KIYAFET_ETKILER,
  JJK_PARCALA_ACIK, JJK_PARCALA_SIRA, JJK_PARCALA_MENZIL, JJK_PARCALA_ACI,
  JJK_PARCALA_HASAR, JJK_PARCALA_ADET, JJK_PARCALA_ADIM,
  JJK_PARCALA_TAVAN, JJK_PARCALA_BEDEL,
  JJK_YAR_ACIK, JJK_YAR_SIRA, JJK_YAR_MENZIL, JJK_YAR_ACI,
  JJK_YAR_HASAR, JJK_YAR_ITME, JJK_YAR_BEDEL,
  JJK_MABET_ACIK, JJK_MABET_SIRA, JJK_MABET_YARICAP, JJK_MABET_SURE,
  JJK_MABET_ADIM, JJK_MABET_HASAR, JJK_MABET_KORLUK,
  JJK_MABET_TAVAN, JJK_MABET_BEDEL,
  JJK_FUGA_ACIK, JJK_FUGA_SIRA, JJK_FUGA_MENZIL, JJK_FUGA_HASAR,
  JJK_FUGA_HIZ, JJK_FUGA_OMUR, JJK_FUGA_YAKMA, JJK_FUGA_BEDEL,
  JJK_KOLLAR_ACIK, JJK_KOLLAR_SIRA, JJK_KOLLAR_SURE,
  JJK_KOLLAR_BEDEL, JJK_KOLLAR_ETKILER
} from "../ayarlar.js";

/* IKI LANETLI TEKNIK  --  Gojo (Limitless) ve Sukuna (Shrine).

   Kaynak: JujutsuCraft 50.1 sinif sabit havuzlari OKUNARAK
   cikarildi; jar calistirilmadi. Her yetenegin basinda hangi
   yordamdan geldigi yaziyor.

   ---- KOL TAKILIYKEN KAPALI (SLR'den devralindi) ----
   Iki yarimi var; ikincisi kendiliginden GELMIYOR ve asil
   istenen oydu. Gerekce REFERANS_SLR.md'de.

   ---- KARAKTER SECIMI SOHBETTEN ----
   "gojo" / "sukuna" yaziliyor. Jest sirasina ucuncu bir
   secici konmadi: sira zaten 20'yi gecti.                   */

const ANAHTAR = "simsek:jjk";
const bellek = new Map();
/* ---- OZELLIK ARIZASI ARTIK OYUNCU BASINA  (v7.62) ----
   Eskiden tek bir `let ozellikVar` vardi: BIR oyuncuda
   setDynamicProperty patlayinca herkesin kaliciligi
   kapaniyordu. Dis inceleme buldu.
   Simdi arizali oyuncu bellege duser, digerleri dinamik
   ozellikte kalir.                                          */
const ozellikYok = new Set();

export function jjkUnut(id) {
  if (id === undefined) { bellek.clear(); sonsuzda.clear(); ozellikYok.clear(); }
  else { bellek.delete(id); sonsuzda.delete(id); ozellikYok.delete(id); }
}

export function jjkBul(kimlik) {
  for (const k of JJK_KARAKTERLER) if (k.kimlik === kimlik) return k;
  return undefined;
}

/* Yazilan ADI kimlige cevirir. Her karakterin birden fazla
   adi var (adlar[]) cunku kullanici "satoru" da yazabilir,
   "gojō" da -- sohbet.js Turkce harfleri zaten sadelestiriyor
   ama ingilizce uzatmalar ondan gecmiyor.                   */
export function jjkAdBul(metin) {
  if (typeof metin !== "string") return undefined;
  /* v7.62: sohbet.js ile AYNI normallestirici. Eskiden burasi
     duz toLowerCase, sohbet tarafi sadelestir kullaniyordu.
     Su anki liste ikisinden de ayni geciyordu -- yani kirik
     degildi -- ama listeye Turkce harfli bir ad eklendigi anda
     sohbet kapisi adi tanir, secici tanimazdi. Dis inceleme
     bunu "henuz kirilmadi ama kirilacak" diye bildirdi ve
     hakliydi; iki kopya olmasin diye tek yerden geciyor.   */
  const m = sadelestir(metin);
  for (const k of JJK_KARAKTERLER) {
    if (sadelestir(k.kimlik) === m) return k;
    for (const a of k.adlar) if (sadelestir(a) === m) return k;
  }
  return undefined;
}

export function jjkOku(oyuncu) {
  if (!ozellikYok.has(oyuncu.id)) {
    try {
      const v = oyuncu.getDynamicProperty(ANAHTAR);
      if (typeof v === "string" && jjkBul(v)) return v;
    } catch (e) { /* yok */ }
  }
  const v = bellek.get(oyuncu.id);
  return (typeof v === "string" && jjkBul(v)) ? v : JJK_VARSAYILAN;
}

export function jjkYaz(oyuncu, kimlik) {
  if (!jjkBul(kimlik)) return false;
  if (!ozellikYok.has(oyuncu.id)) {
    try { oyuncu.setDynamicProperty(ANAHTAR, kimlik); return true; }
    catch (e) { ozellikYok.add(oyuncu.id); }
  }
  bellek.set(oyuncu.id, kimlik);
  return true;
}

/* Sohbetten cagriliyor (sohbet.js). Ad tanimazsa iki adi da
   yazip geri donuyor -- kullanici ne yazacagini aramasin.  */
export function jjkSec(oyuncu, metin) {
  const k = jjkAdBul(metin);
  if (!k) {
    const su = jjkBul(jjkOku(oyuncu));
    return "§7Şu an: §f" + (su ? su.ad : "-") + "  §8|  yaz: §f" +
           JJK_KARAKTERLER.map((x) => x.adlar[0]).join(" §8/ §f");
  }
  jjkYaz(oyuncu, k.kimlik);
  return "§d✦ §f" + k.ad + " §7· " + k.teknik;
}

/* ---- kol denetimi ----
   Olcut main.js'inkiyle AYNI (esyaninYetenekleri) ve iki el
   birden. v7.58'de sol eli atlamak bir mutasyonla yakalandi. */
export function kolTakili(oyuncu) {
  for (const slot of ["Mainhand", "Offhand"]) {
    let esya;
    try { esya = eldekiEsya(oyuncu, slot); } catch (e) { continue; }
    if (!esya) continue;
    const liste = esyaninYetenekleri(esya);
    if (liste && liste.length > 0) return true;
  }
  return false;
}

function kesilsinMi(oyuncu) {
  if (!JJK_KOL_KES) return false;
  try { return kolTakili(oyuncu); } catch (e) { return false; }
}

/* Ortak kapi: acik mi · gecerli mi · kol yok mu · bu karakter
   mi · ruh yetiyor mu. Bes denetimin hepsi her yetenekte
   ayni sirada olsun diye tek yerde.                         */
function kapi(oyuncu, kimlik, bedel, etiket) {
  if (!JJK_ACIK || !gecerliMi(oyuncu)) return false;
  if (kesilsinMi(oyuncu)) return false;
  if (jjkOku(oyuncu) !== kimlik) return false;
  if (ruhOku(oyuncu) < bedel) {
    try { actionbarYaz(oyuncu, etiket + " §cLanetli enerji yetmiyor"); }
    catch (e) { /* onemsiz */ }
    return false;
  }
  ruhYaz(oyuncu, ruhOku(oyuncu) - bedel);
  return true;
}

/* Sonsuzluk etiketi tasiyan hedefe Sukuna'nin kesikleri
   islemiyor -- kaynaktaki INFINITY_EFFECT denetiminin
   karsiligi. Iki karakter arasindaki tek gercek iliski bu. */
function sonsuzlukVarMi(v) {
  try { return v.hasTag && v.hasTag(JJK_SONSUZ_ETIKET); }
  catch (e) { return false; }
}

/* Bir kerelik alan vurusu. Parcala · Yar · Mavi · alanlarin
   ortak govdesi.                                            */
function alanVur(oyuncu, s) {
  let hedefler;
  try {
    hedefler = koniHedefleri(oyuncu, {
      menzil: s.menzil, aci: s.aci, tavan: s.tavan, oyuncuDahil: true
    });
  } catch (e) { hataYaz("jjk.alan", e); return { vurulan: 0, korunan: 0 }; }

  let vurulan = 0, korunan = 0;
  for (const v of hedefler) {
    try {
      if (s.sonsuzlukGecmez && sonsuzlukVarMi(v)) { korunan++; continue; }
      if (!varlikIste(1)) break;
      v.applyDamage(s.hasar, { cause: "entityAttack", damagingEntity: oyuncu });
      if (s.yakma) v.setOnFire(s.yakma, true);
      if (s.korluk) v.addEffect("blindness", s.korluk * 20, { amplifier: 0 });
      if (s.yavas) v.addEffect("slowness", s.yavas * 20, { amplifier: 1 });
      const k = v.location, m = oyuncu.location;
      if (s.itme && v.applyKnockback) {
        v.applyKnockback(k.x - m.x, k.z - m.z, s.itme, 0.4);
      }
      /* CEKIM: itmenin isareti ters. Kaynakta -50 yaziyordu,
         eksi isaret zaten bunu soyluyordu.                  */
      if (s.cekim && v.applyKnockback) {
        v.applyKnockback(m.x - k.x, m.z - k.z, s.cekim, 0.2);
      }
      vurulan++;
    } catch (e) { /* varlik kayboldu */ }
  }
  return { vurulan, korunan };
}

function bilgi(oyuncu, metin) {
  try { actionbarYaz(oyuncu, metin); } catch (e) { /* onemsiz */ }
}

/* ================= GOJO · LIMITLESS ================= */

/* ---- 1. MAVI (TechniqueBlueProcedure) ---- */
yetenekKaydet({
  kimlik: "jjk_mavi", ad: "Cursed Technique Lapse: Blue",
  esyasiz: true, sira: JJK_MAVI_SIRA,
  olustur(oyuncu) {
    if (!JJK_MAVI_ACIK) return undefined;
    if (!kapi(oyuncu, "gojo", JJK_MAVI_BEDEL, "§9◉ §fMavi")) return undefined;
    const c = ruhCarpani(oyuncu);
    const r = alanVur(oyuncu, {
      menzil: JJK_MAVI_MENZIL, aci: -1, tavan: JJK_MAVI_TAVAN,
      hasar: JJK_MAVI_HASAR * c, cekim: JJK_MAVI_CEKIM
    });
    try {
      parcacikHalkasi(oyuncu.dimension, "minecraft:sonic_explosion",
                      oyuncu.location, 16, JJK_MAVI_YARICAP);
    } catch (e) { /* onemsiz */ }
    bilgi(oyuncu, "§9◉ §fMavi §7·×" + c.toFixed(1) + " §8(" + r.vurulan + ")");
    return undefined;
  }
});

/* ---- 2. KIRMIZI (TechniqueRedProcedure) ----
   Kaynak bir RED varligi doguruyor; bizde mermi bir is.     */
yetenekKaydet({
  kimlik: "jjk_kirmizi", ad: "Cursed Technique Reversal: Red",
  esyasiz: true, sira: JJK_KIRMIZI_SIRA,
  olustur(oyuncu) {
    if (!JJK_KIRMIZI_ACIK) return undefined;
    if (!kapi(oyuncu, "gojo", JJK_KIRMIZI_BEDEL, "§c◉ §fKırmızı")) return undefined;
    const c = ruhCarpani(oyuncu);
    bilgi(oyuncu, "§c◉ §fKırmızı §7·×" + c.toFixed(1));
    return mermiIsi({
      ad: "jjk_kirmizi", oyuncu,
      hasar: JJK_KIRMIZI_HASAR * c, menzil: JJK_KIRMIZI_MENZIL,
      hiz: JJK_KIRMIZI_HIZ, omur: JJK_KIRMIZI_OMUR,
      parcacik: "minecraft:huge_explosion_emitter", blokKir: false,
      carpinca(v) {
        try {
          if (!v.applyKnockback) return;
          const k = v.location, m = oyuncu.location;
          v.applyKnockback(k.x - m.x, k.z - m.z, JJK_KIRMIZI_ITME, 0.5);
        } catch (e) { /* onemsiz */ }
      }
    });
  }
});

/* ---- 3. MOR (HollowPurpleProcedure) ----
   Mavi + Kirmizi'nin bilesimi: ikisinden pahali, ikisinden
   guclu ve DELICI.                                          */
yetenekKaydet({
  kimlik: "jjk_mor", ad: "Hollow Purple",
  esyasiz: true, sira: JJK_MOR_SIRA,
  olustur(oyuncu) {
    if (!JJK_MOR_ACIK) return undefined;
    if (!kapi(oyuncu, "gojo", JJK_MOR_BEDEL, "§5◉ §fMor")) return undefined;
    const c = ruhCarpani(oyuncu);
    bilgi(oyuncu, "§5◉ §fHollow Purple §7·×" + c.toFixed(1));
    return mermiIsi({
      ad: "jjk_mor", oyuncu,
      hasar: JJK_MOR_HASAR * c, menzil: JJK_MOR_MENZIL,
      hiz: JJK_MOR_HIZ, omur: JJK_MOR_OMUR,
      parcacik: "minecraft:huge_explosion_emitter", blokKir: false
    });
  }
});

/* ---- 4. SONSUZLUK (InfinityProcedure + ActiveTick) ----
   Acilip kapanan. Her JJK_SONSUZ_ADIM'da ruh yakiyor, ruh
   bitince KENDILIGINDEN kapaniyor -- kaynakta da oyle.
   Etiket, Sukuna'nin kesiklerini durduran sey.              */
const sonsuzda = new Map();
export function sonsuzUnut(id) {
  if (id === undefined) sonsuzda.clear(); else sonsuzda.delete(id);
}

yetenekKaydet({
  kimlik: "jjk_sonsuzluk", ad: "Infinity",
  esyasiz: true, sira: JJK_SONSUZ_SIRA,
  olustur(oyuncu) {
    if (!JJK_SONSUZ_ACIK || !JJK_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (kesilsinMi(oyuncu)) return undefined;
    if (jjkOku(oyuncu) !== "gojo") return undefined;

    /* Acikken tekrar tetiklenirse KAPANIYOR (reishi kalibi):
       ayniIsVarMi yeni is acilmasini engelledigi icin
       kapatma buradan yapiliyor.                            */
    const varOlan = sonsuzda.get(oyuncu.id);
    if (varOlan) { varOlan.kapat = true; return undefined; }
    if (!kapi(oyuncu, "gojo", JJK_SONSUZ_BEDEL, "§b∞ §fSonsuzluk")) return undefined;

    const durum = { kapat: false };
    sonsuzda.set(oyuncu.id, durum);
    const bitis = system.currentTick + JJK_SONSUZ_SURE;
    let sonraki = 0;
    try { oyuncu.addTag(JJK_SONSUZ_ETIKET); } catch (e) { /* onemsiz */ }
    bilgi(oyuncu, "§b∞ §fInfinity §aAÇIK");

    return {
      ad: "jjk_sonsuzluk", oyuncuId: oyuncu.id,
      calis() {
        if (durum.kapat) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (kesilsinMi(oyuncu)) return true;
        if (system.currentTick >= bitis) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + JJK_SONSUZ_ADIM;

        /* Ruh bitince kendiliginden kapaniyor: surekli acik
           kalan bir dokunulmazlik olmaz.                    */
        const kalan = ruhOku(oyuncu) - JJK_SONSUZ_AKIS;
        if (kalan < 0) return true;
        ruhYaz(oyuncu, kalan);
        try {
          oyuncu.addEffect("resistance", JJK_SONSUZ_ADIM + 10,
                           { amplifier: JJK_SONSUZ_DIRENC });
          parcacikHalkasi(oyuncu.dimension, "minecraft:sonic_explosion",
                          oyuncu.location, 8, 1.5);
        } catch (e) { /* onemsiz */ }
        return false;
      },
      bitir() {
        sonsuzda.delete(oyuncu.id);
        try { oyuncu.removeTag(JJK_SONSUZ_ETIKET); } catch (e) { /* onemsiz */ }
        bilgi(oyuncu, "§b∞ §7Infinity kapandı");
      }
    };
  }
});

/* ---- 5. SINIRSIZ BOSLUK (UnlimitedVoidProcedure) ---- */
yetenekKaydet({
  kimlik: "jjk_bosluk", ad: "Unlimited Void",
  esyasiz: true, sira: JJK_BOSLUK_SIRA,
  olustur(oyuncu) {
    if (!JJK_BOSLUK_ACIK) return undefined;
    if (!kapi(oyuncu, "gojo", JJK_BOSLUK_BEDEL, "§8◈ §fSınırsız Boşluk")) return undefined;
    const c = ruhCarpani(oyuncu);
    const boyut = oyuncu.dimension;
    const bitis = system.currentTick + JJK_BOSLUK_SURE;
    let sonraki = 0;
    bilgi(oyuncu, "§8◈ §fUnlimited Void §7·×" + c.toFixed(1));

    return {
      ad: "jjk_bosluk", oyuncuId: oyuncu.id,
      calis() {
        if (!gecerliMi(oyuncu)) return true;
        if (kesilsinMi(oyuncu)) return true;
        if (system.currentTick >= bitis) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + JJK_BOSLUK_ADIM;
        try {
          parcacikHalkasi(boyut, "minecraft:sonic_explosion",
                          oyuncu.location, 20, JJK_BOSLUK_YARICAP);
        } catch (e) { /* onemsiz */ }
        alanVur(oyuncu, {
          menzil: JJK_BOSLUK_YARICAP, aci: -1, tavan: JJK_BOSLUK_TAVAN,
          hasar: JJK_BOSLUK_HASAR * c,
          korluk: JJK_BOSLUK_KORLUK, yavas: JJK_BOSLUK_KORLUK
        });
        return false;
      }
    };
  }
});

/* ---- 6. KIYAFET (uniform_gojo_*) ----
   Esya degil ETKI: uydurma doku uretmemek icin.            */
yetenekKaydet({
  kimlik: "jjk_kiyafet", ad: "Gojō'nun Üniforması",
  esyasiz: true, sira: JJK_KIYAFET_SIRA,
  olustur(oyuncu) {
    if (!JJK_KIYAFET_ACIK) return undefined;
    if (!kapi(oyuncu, "gojo", JJK_KIYAFET_BEDEL, "§f▣ §fÜniforma")) return undefined;
    for (const [ad, sev] of JJK_KIYAFET_ETKILER) {
      try { oyuncu.addEffect(ad, JJK_KIYAFET_SURE, { amplifier: sev }); }
      catch (e) { /* onemsiz */ }
    }
    bilgi(oyuncu, "§f▣ §fÜniforma + Gözbağı §7· " +
          Math.round(JJK_KIYAFET_SURE / 20) + " sn");
    return undefined;
  }
});

/* ================= SUKUNA · MALEVOLENT SHRINE ================= */

/* ---- 1. PARCALA (DismantleProcedure) ----
   Kaynakta dismantle1/2/3 combo ve INFINITY_EFFECT denetimi.
   Sonsuzluk tasiyan hedefe ISLEMIYOR.                       */
yetenekKaydet({
  kimlik: "jjk_parcala", ad: "Dismantle",
  esyasiz: true, sira: JJK_PARCALA_SIRA,
  olustur(oyuncu) {
    if (!JJK_PARCALA_ACIK) return undefined;
    if (!kapi(oyuncu, "sukuna", JJK_PARCALA_BEDEL, "§4⨯ §fParçala")) return undefined;
    const c = ruhCarpani(oyuncu);
    let atilan = 0, sonraki = 0, korunanToplam = 0;
    bilgi(oyuncu, "§4⨯ §fDismantle §7·×" + c.toFixed(1));

    return {
      ad: "jjk_parcala", oyuncuId: oyuncu.id,
      calis() {
        if (!gecerliMi(oyuncu)) return true;
        if (kesilsinMi(oyuncu)) return true;
        if (atilan >= JJK_PARCALA_ADET) {
          if (korunanToplam > 0) {
            bilgi(oyuncu, "§4⨯ §7Infinity kesikleri durdurdu");
          }
          return true;
        }
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + JJK_PARCALA_ADIM;
        atilan++;
        const r = alanVur(oyuncu, {
          menzil: JJK_PARCALA_MENZIL, aci: JJK_PARCALA_ACI,
          tavan: JJK_PARCALA_TAVAN, hasar: JJK_PARCALA_HASAR * c,
          sonsuzlukGecmez: true
        });
        korunanToplam += r.korunan;
        try {
          parcacikAt(oyuncu.dimension, "minecraft:critical_hit_emitter",
                     basKonumu(oyuncu));
        } catch (e) { /* onemsiz */ }
        return false;
      }
    };
  }
});

/* ---- 2. YAR (CleaveProcedure) ----
   Parcala coklu, Yar TEK ve agir. Sonsuzluk yine geciyor.  */
yetenekKaydet({
  kimlik: "jjk_yar", ad: "Cleave",
  esyasiz: true, sira: JJK_YAR_SIRA,
  olustur(oyuncu) {
    if (!JJK_YAR_ACIK) return undefined;
    if (!kapi(oyuncu, "sukuna", JJK_YAR_BEDEL, "§4⧗ §fYar")) return undefined;
    const c = ruhCarpani(oyuncu);
    const r = alanVur(oyuncu, {
      menzil: JJK_YAR_MENZIL, aci: JJK_YAR_ACI, tavan: 4,
      hasar: JJK_YAR_HASAR * c, itme: JJK_YAR_ITME,
      sonsuzlukGecmez: true
    });
    bilgi(oyuncu, r.korunan > 0
      ? "§4⧗ §7Infinity Yar'ı durdurdu"
      : "§4⧗ §fCleave §7·×" + c.toFixed(1) + " §8(" + r.vurulan + ")");
    return undefined;
  }
});

/* ---- 3. KUTSAL MABET (MalevolentShrineProcedure) ----
   Gojo'nun alani gorusu keser, bu alan surekli DOGRAR.     */
yetenekKaydet({
  kimlik: "jjk_mabet", ad: "Malevolent Shrine",
  esyasiz: true, sira: JJK_MABET_SIRA,
  olustur(oyuncu) {
    if (!JJK_MABET_ACIK) return undefined;
    if (!kapi(oyuncu, "sukuna", JJK_MABET_BEDEL, "§4卍 §fKutsal Mabet")) return undefined;
    const c = ruhCarpani(oyuncu);
    const boyut = oyuncu.dimension;
    const bitis = system.currentTick + JJK_MABET_SURE;
    let sonraki = 0;
    bilgi(oyuncu, "§4卍 §fMalevolent Shrine §7·×" + c.toFixed(1));

    return {
      ad: "jjk_mabet", oyuncuId: oyuncu.id,
      calis() {
        if (!gecerliMi(oyuncu)) return true;
        if (kesilsinMi(oyuncu)) return true;
        if (system.currentTick >= bitis) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + JJK_MABET_ADIM;
        try {
          parcacikHalkasi(boyut, "minecraft:critical_hit_emitter",
                          oyuncu.location, 20, JJK_MABET_YARICAP);
        } catch (e) { /* onemsiz */ }
        alanVur(oyuncu, {
          menzil: JJK_MABET_YARICAP, aci: -1, tavan: JJK_MABET_TAVAN,
          hasar: JJK_MABET_HASAR * c, korluk: JJK_MABET_KORLUK,
          sonsuzlukGecmez: true
        });
        return false;
      }
    };
  }
});

/* ---- 4. ATES AC / FUGA (OpenProcedure) ---- */
yetenekKaydet({
  kimlik: "jjk_fuga", ad: "Divine Flame: Open",
  esyasiz: true, sira: JJK_FUGA_SIRA,
  olustur(oyuncu) {
    if (!JJK_FUGA_ACIK) return undefined;
    if (!kapi(oyuncu, "sukuna", JJK_FUGA_BEDEL, "§6🔥 §fFūga")) return undefined;
    const c = ruhCarpani(oyuncu);
    bilgi(oyuncu, "§6🔥 §fDivine Flame: Open §7·×" + c.toFixed(1));
    return mermiIsi({
      ad: "jjk_fuga", oyuncu,
      hasar: JJK_FUGA_HASAR * c, menzil: JJK_FUGA_MENZIL,
      hiz: JJK_FUGA_HIZ, omur: JJK_FUGA_OMUR,
      parcacik: "minecraft:basic_flame_particle", blokKir: false,
      carpinca(v) {
        try { v.setOnFire(JJK_FUGA_YAKMA, true); } catch (e) { /* onemsiz */ }
      }
    });
  }
});

/* ---- 5. SUKUNA'NIN KOLLARI (sukuna_body_chestplate) ----
   Gojo'nun kiyafetiyle ayni gerekce: esya degil ETKI.      */
yetenekKaydet({
  kimlik: "jjk_kollar", ad: "Sukuna'nın Kolları",
  esyasiz: true, sira: JJK_KOLLAR_SIRA,
  olustur(oyuncu) {
    if (!JJK_KOLLAR_ACIK) return undefined;
    if (!kapi(oyuncu, "sukuna", JJK_KOLLAR_BEDEL, "§4▣ §fKollar")) return undefined;
    for (const [ad, sev] of JJK_KOLLAR_ETKILER) {
      try { oyuncu.addEffect(ad, JJK_KOLLAR_SURE, { amplifier: sev }); }
      catch (e) { /* onemsiz */ }
    }
    bilgi(oyuncu, "§4▣ §fSukuna'nın Kolları §7· " +
          Math.round(JJK_KOLLAR_SURE / 20) + " sn");
    return undefined;
  }
});
