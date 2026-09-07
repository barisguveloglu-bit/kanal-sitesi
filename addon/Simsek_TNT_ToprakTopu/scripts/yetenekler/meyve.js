import { system } from "@minecraft/server";
import { yetenekKaydet, esyaninYetenekleri } from "./kayit.js";
import {
  hataYaz, gecerliMi, eldekiEsya, basKonumu, parcacikAt,
  parcacikHalkasi, actionbarYaz, koniHedefleri
} from "../yardimcilar.js";
import { blokIste, varlikIste } from "../butce.js";
import { sadelestir } from "../sohbet.js";
import { ruhCarpani, ruhOku, ruhYaz } from "./ruh.js";
import { mermiIsi } from "./ruh_yetenekler.js";
import {
  MEYVE_ACIK, MEYVE_KOL_KES, MEYVE_LISTESI, MEYVE_VARSAYILAN, MEYVE_SEC_SIRA,
  GURA_GEKISHIN_ACIK, GURA_GEKISHIN_SIRA, GURA_GEKISHIN_MENZIL,
  GURA_GEKISHIN_HASAR, GURA_GEKISHIN_HIZ, GURA_GEKISHIN_OMUR,
  GURA_GEKISHIN_ITME, GURA_GEKISHIN_BEDEL,
  GURA_TENCHI_ACIK, GURA_TENCHI_SIRA, GURA_TENCHI_YARICAP,
  GURA_TENCHI_HASAR, GURA_TENCHI_ITME, GURA_TENCHI_TAVAN, GURA_TENCHI_BEDEL,
  GURA_KABUTO_ACIK, GURA_KABUTO_SIRA, GURA_KABUTO_MENZIL, GURA_KABUTO_ACI,
  GURA_KABUTO_HASAR, GURA_KABUTO_ITME, GURA_KABUTO_BEDEL,
  YAMI_KUROUZU_ACIK, YAMI_KUROUZU_SIRA, YAMI_KUROUZU_MENZIL,
  YAMI_KUROUZU_HASAR, YAMI_KUROUZU_CEKIM, YAMI_KUROUZU_TAVAN,
  YAMI_KUROUZU_BEDEL, YAMI_SOKULEN,
  YAMI_DELIK_ACIK, YAMI_DELIK_SIRA, YAMI_DELIK_YARICAP, YAMI_DELIK_SURE,
  YAMI_DELIK_ADIM, YAMI_DELIK_HASAR, YAMI_DELIK_CEKIM, YAMI_DELIK_TAVAN,
  YAMI_DELIK_BEDEL,
  YAMI_MADDE_ACIK, YAMI_MADDE_SIRA, YAMI_MADDE_MENZIL, YAMI_MADDE_HASAR,
  YAMI_MADDE_HIZ, YAMI_MADDE_OMUR, YAMI_MADDE_BEDEL,
  OPE_ODA_ACIK, OPE_ODA_SIRA, OPE_ODA_YARICAP, OPE_ODA_SURE, OPE_ODA_ADIM,
  OPE_ODA_BEDEL,
  OPE_SHAMBLES_ACIK, OPE_SHAMBLES_SIRA, OPE_SHAMBLES_BEDEL,
  OPE_GAMMA_ACIK, OPE_GAMMA_SIRA, OPE_GAMMA_MENZIL, OPE_GAMMA_ACI,
  OPE_GAMMA_HASAR, OPE_GAMMA_ZAYIF, OPE_GAMMA_BEDEL,
  OPE_SOK_ACIK, OPE_SOK_SIRA, OPE_SOK_MENZIL, OPE_SOK_HASAR,
  OPE_SOK_ITME, OPE_SOK_TAVAN, OPE_SOK_BEDEL
} from "../ayarlar.js";

/* SEYTAN MEYVELERI  --  Gura · Yami · Ope.

   Kaynak: Mine Mine no Mi 1.20.10 (11.5). Sinif sabit
   havuzlari OKUNARAK cikarildi; jar calistirilmadi. Secimin
   gerekcesi (eserin kendi metnindeki "en guclu" / "nihai"
   ifadeleri) ayarlar.js'te ve REFERANS_MINEMINE.md'de.

   ---- UC KURAL, UCU DE ONCEKI SURUMLERDEN ----
   1. KOL TAKILIYKEN KAPALI (v7.58/SLR). Iki yarim: tetikleme
      zaten esyasiz siradan geliyor, SUREN IS de her tick ele
      bakiyor. Olcut main.js'inkiyle ayni, iki el birden.
   2. ISINLANMA IKI DENETIMDEN GECER (v7.57/Berserk). Varis
      yeri VE ustu hava olacak; degilse isinma yok.
   3. TEK GUC KAPISI (ruhCarpani). Iki ayri hesap er gec
      ayrisir.                                               */

const ANAHTAR = "simsek:meyve";
const bellek = new Map();
const ozellikYok = new Set();          // v7.62 dersi: oyuncu basina

export function meyveUnut(id) {
  if (id === undefined) {
    bellek.clear(); ozellikYok.clear(); odada.clear();
  } else {
    bellek.delete(id); ozellikYok.delete(id); odada.delete(id);
  }
}

export function meyveBul(kimlik) {
  for (const m of MEYVE_LISTESI) if (m.kimlik === kimlik) return m;
  return undefined;
}

/* Ad -> meyve. sadelestir ile: sohbet tarafi da ayni
   normallestiriciyi kullaniyor (v7.62 dersi -- iki ayri
   normallestirici Turkce harfli bir ad eklenince ayrisir). */
export function meyveAdBul(metin) {
  if (typeof metin !== "string") return undefined;
  const m = sadelestir(metin);
  for (const k of MEYVE_LISTESI) {
    if (sadelestir(k.kimlik) === m) return k;
    for (const a of k.adlar) if (sadelestir(a) === m) return k;
  }
  return undefined;
}

export function meyveOku(oyuncu) {
  if (!ozellikYok.has(oyuncu.id)) {
    try {
      const v = oyuncu.getDynamicProperty(ANAHTAR);
      if (typeof v === "string" && meyveBul(v)) return v;
    } catch (e) { /* yok */ }
  }
  const v = bellek.get(oyuncu.id);
  return (typeof v === "string" && meyveBul(v)) ? v : MEYVE_VARSAYILAN;
}

export function meyveYaz(oyuncu, kimlik) {
  if (!meyveBul(kimlik)) return false;
  if (!ozellikYok.has(oyuncu.id)) {
    try { oyuncu.setDynamicProperty(ANAHTAR, kimlik); return true; }
    catch (e) { ozellikYok.add(oyuncu.id); }
  }
  bellek.set(oyuncu.id, kimlik);
  return true;
}

/* Sohbetten cagriliyor. Ad tanimazsa uc adi da yazip donuyor. */
export function meyveSec(oyuncu, metin) {
  const k = meyveAdBul(metin);
  if (!k) {
    const su = meyveBul(meyveOku(oyuncu));
    return "§7Şu an: §f" + (su ? su.ad : "-") + "  §8|  yaz: §f" +
           MEYVE_LISTESI.map((x) => x.adlar[0]).join(" §8/ §f");
  }
  meyveYaz(oyuncu, k.kimlik);
  return "§e🍎 §f" + k.ad + " §7· " + k.sahip + " §8(" + k.tur + ")";
}

/* ---- kol denetimi (v7.58'den) ---- */
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
  if (!MEYVE_KOL_KES) return false;
  try { return kolTakili(oyuncu); } catch (e) { return false; }
}

/* Ortak kapi: acik · gecerli · kol yok · bu meyve · ruh yeter. */
function kapi(oyuncu, kimlik, bedel, etiket) {
  if (!MEYVE_ACIK || !gecerliMi(oyuncu)) return false;
  if (kesilsinMi(oyuncu)) return false;
  if (meyveOku(oyuncu) !== kimlik) return false;
  if (ruhOku(oyuncu) < bedel) {
    try { actionbarYaz(oyuncu, etiket + " §cGüç yetmiyor"); }
    catch (e) { /* onemsiz */ }
    return false;
  }
  ruhYaz(oyuncu, ruhOku(oyuncu) - bedel);
  return true;
}

function bilgi(oyuncu, metin) {
  try { actionbarYaz(oyuncu, metin); } catch (e) { /* onemsiz */ }
}

/* Ortak alan vurusu. */
function alanVur(oyuncu, s) {
  let hedefler;
  try {
    hedefler = koniHedefleri(oyuncu, {
      menzil: s.menzil, aci: s.aci, tavan: s.tavan, oyuncuDahil: true
    });
  } catch (e) { hataYaz("meyve.alan", e); return { vurulan: 0, sokulen: 0 }; }

  let vurulan = 0, sokulen = 0;
  for (const v of hedefler) {
    try {
      if (!varlikIste(1)) break;
      v.applyDamage(s.hasar, { cause: "entityAttack", damagingEntity: oyuncu });
      if (s.zayif) v.addEffect("weakness", s.zayif * 20, { amplifier: 1 });
      const k = v.location, m = oyuncu.location;
      if (s.itme && v.applyKnockback) {
        v.applyKnockback(k.x - m.x, k.z - m.z, s.itme, s.dikey || 0.4);
      }
      if (s.cekim && v.applyKnockback) {
        v.applyKnockback(m.x - k.x, m.z - k.z, s.cekim, 0.2);
      }
      /* KARANLIGIN IPTALI: yalniz FAYDALI efektler sokuluyor.
         Zararlilara dokunmak hedefe yardim etmek olurdu.   */
      if (s.iptal && typeof v.removeEffect === "function") {
        for (const e of YAMI_SOKULEN) {
          try { if (v.removeEffect(e)) sokulen++; } catch (h) { /* yok */ }
        }
      }
      vurulan++;
    } catch (e) { /* varlik kayboldu */ }
  }
  return { vurulan, sokulen };
}

/* ================= GURA GURA NO MI ================= */

/* ---- 1. GEKISHIN (GekishinAbility) ---- */
yetenekKaydet({
  kimlik: "gura_gekishin", ad: "Gekishin",
  esyasiz: true, sira: GURA_GEKISHIN_SIRA,
  olustur(oyuncu) {
    if (!GURA_GEKISHIN_ACIK) return undefined;
    if (!kapi(oyuncu, "gura", GURA_GEKISHIN_BEDEL, "§e☲ §fGekishin")) return undefined;
    const c = ruhCarpani(oyuncu);
    bilgi(oyuncu, "§e☲ §fGekishin §7·×" + c.toFixed(1));
    return mermiIsi({
      ad: "gura_gekishin", oyuncu,
      hasar: GURA_GEKISHIN_HASAR * c, menzil: GURA_GEKISHIN_MENZIL,
      hiz: GURA_GEKISHIN_HIZ, omur: GURA_GEKISHIN_OMUR,
      parcacik: "minecraft:sonic_explosion", blokKir: false,
      carpinca(v) {
        try {
          if (!v.applyKnockback) return;
          const k = v.location, m = oyuncu.location;
          v.applyKnockback(k.x - m.x, k.z - m.z, GURA_GEKISHIN_ITME, 0.6);
        } catch (e) { /* onemsiz */ }
      }
    });
  }
});

/* ---- 2. TENCHI MEIDO (TenchiMeidoAbility) ----
   Kaynakta RANGE 26, modun en genis alani. Blok KIRMIYOR. */
yetenekKaydet({
  kimlik: "gura_tenchi", ad: "Tenchi Meidō",
  esyasiz: true, sira: GURA_TENCHI_SIRA,
  olustur(oyuncu) {
    if (!GURA_TENCHI_ACIK) return undefined;
    if (!kapi(oyuncu, "gura", GURA_TENCHI_BEDEL, "§e☴ §fTenchi Meidō")) return undefined;
    const c = ruhCarpani(oyuncu);
    const r = alanVur(oyuncu, {
      menzil: GURA_TENCHI_YARICAP, aci: -1, tavan: GURA_TENCHI_TAVAN,
      hasar: GURA_TENCHI_HASAR * c, itme: GURA_TENCHI_ITME, dikey: 0.8
    });
    try {
      for (const yari of [6, 14, GURA_TENCHI_YARICAP]) {
        parcacikHalkasi(oyuncu.dimension, "minecraft:sonic_explosion",
                        oyuncu.location, 20, yari);
      }
    } catch (e) { /* onemsiz */ }
    bilgi(oyuncu, "§e☴ §fTenchi Meidō §7·×" + c.toFixed(1) +
          " §8(" + r.vurulan + ")");
    return undefined;
  }
});

/* ---- 3. KABUTOWARI (KabutowariAbility) ---- */
yetenekKaydet({
  kimlik: "gura_kabuto", ad: "Kabutowari",
  esyasiz: true, sira: GURA_KABUTO_SIRA,
  olustur(oyuncu) {
    if (!GURA_KABUTO_ACIK) return undefined;
    if (!kapi(oyuncu, "gura", GURA_KABUTO_BEDEL, "§e⩚ §fKabutowari")) return undefined;
    const c = ruhCarpani(oyuncu);
    const r = alanVur(oyuncu, {
      menzil: GURA_KABUTO_MENZIL, aci: GURA_KABUTO_ACI, tavan: 3,
      hasar: GURA_KABUTO_HASAR * c, itme: GURA_KABUTO_ITME, dikey: 1.0
    });
    try {
      parcacikAt(oyuncu.dimension, "minecraft:sonic_explosion",
                 basKonumu(oyuncu));
    } catch (e) { /* onemsiz */ }
    bilgi(oyuncu, "§e⩚ §fKabutowari §7·×" + c.toFixed(1) +
          " §8(" + r.vurulan + ")");
    return undefined;
  }
});

/* ================= YAMI YAMI NO MI ================= */

/* ---- 1. KUROUZU (KurouzuAbility) ----
   Ceker VE meyve gucunu iptal eder. Ikincisi bu meyvenin
   eserdeki imzasi; birakilsaydi Yami sadece bir cekme
   yetenegi olurdu.                                        */
yetenekKaydet({
  kimlik: "yami_kurouzu", ad: "Kurouzu",
  esyasiz: true, sira: YAMI_KUROUZU_SIRA,
  olustur(oyuncu) {
    if (!YAMI_KUROUZU_ACIK) return undefined;
    if (!kapi(oyuncu, "yami", YAMI_KUROUZU_BEDEL, "§8◉ §fKurouzu")) return undefined;
    const c = ruhCarpani(oyuncu);
    const r = alanVur(oyuncu, {
      menzil: YAMI_KUROUZU_MENZIL, aci: -1, tavan: YAMI_KUROUZU_TAVAN,
      hasar: YAMI_KUROUZU_HASAR * c, cekim: YAMI_KUROUZU_CEKIM, iptal: true
    });
    try {
      parcacikHalkasi(oyuncu.dimension, "minecraft:sculk_soul_particle",
                      oyuncu.location, 18, 4);
    } catch (e) { /* onemsiz */ }
    bilgi(oyuncu, "§8◉ §fKurouzu §7·×" + c.toFixed(1) +
          " §8(" + r.vurulan + " · " + r.sokulen + " güç söküldü)");
    return undefined;
  }
});

/* ---- 2. KARA DELIK (BlackHoleAbility) ----
   Blok yutma ALINMADI (gerekce ayarlar.js'te): geri
   verilmeyen blok bu depoda esya kaybi.                   */
yetenekKaydet({
  kimlik: "yami_delik", ad: "Kara Delik",
  esyasiz: true, sira: YAMI_DELIK_SIRA,
  olustur(oyuncu) {
    if (!YAMI_DELIK_ACIK) return undefined;
    if (!kapi(oyuncu, "yami", YAMI_DELIK_BEDEL, "§8⬤ §fKara Delik")) return undefined;
    const c = ruhCarpani(oyuncu);
    const boyut = oyuncu.dimension;
    const bitis = system.currentTick + YAMI_DELIK_SURE;
    let sonraki = 0;
    bilgi(oyuncu, "§8⬤ §fKara Delik §7·×" + c.toFixed(1));

    return {
      ad: "yami_delik", oyuncuId: oyuncu.id,
      calis() {
        if (!gecerliMi(oyuncu)) return true;
        if (kesilsinMi(oyuncu)) return true;
        if (system.currentTick >= bitis) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + YAMI_DELIK_ADIM;
        try {
          parcacikHalkasi(boyut, "minecraft:sculk_soul_particle",
                          oyuncu.location, 18, YAMI_DELIK_YARICAP);
        } catch (e) { /* onemsiz */ }
        alanVur(oyuncu, {
          menzil: YAMI_DELIK_YARICAP, aci: -1, tavan: YAMI_DELIK_TAVAN,
          hasar: YAMI_DELIK_HASAR * c, cekim: YAMI_DELIK_CEKIM
        });
        return false;
      }
    };
  }
});

/* ---- 3. KARA MADDE (DarkMatterAbility) ---- */
yetenekKaydet({
  kimlik: "yami_madde", ad: "Kara Madde",
  esyasiz: true, sira: YAMI_MADDE_SIRA,
  olustur(oyuncu) {
    if (!YAMI_MADDE_ACIK) return undefined;
    if (!kapi(oyuncu, "yami", YAMI_MADDE_BEDEL, "§8✦ §fKara Madde")) return undefined;
    const c = ruhCarpani(oyuncu);
    bilgi(oyuncu, "§8✦ §fKara Madde §7·×" + c.toFixed(1));
    return mermiIsi({
      ad: "yami_madde", oyuncu,
      hasar: YAMI_MADDE_HASAR * c, menzil: YAMI_MADDE_MENZIL,
      hiz: YAMI_MADDE_HIZ, omur: YAMI_MADDE_OMUR,
      parcacik: "minecraft:sculk_soul_particle", blokKir: false
    });
  }
});

/* ================= OPE OPE NO MI ================= */

/* ODA. Kaynakta Shambles · Gamma Knife · Counter Shock hepsi
   `RoomAbility.hasRoomActive` denetiminden geciyor. Ayni
   bagimlilik burada da var: oda kapaliysa ucu de calismiyor. */
const odada = new Map();               // oyuncuId -> { kapat, bitis }

export function odaAcikMi(oyuncuId) {
  const d = odada.get(oyuncuId);
  if (!d) return false;
  if (system.currentTick >= d.bitis) return false;
  return true;
}
export function odaUnut(id) {
  if (id === undefined) odada.clear(); else odada.delete(id);
}

yetenekKaydet({
  kimlik: "ope_oda", ad: "ROOM",
  esyasiz: true, sira: OPE_ODA_SIRA,
  olustur(oyuncu) {
    if (!OPE_ODA_ACIK || !MEYVE_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (kesilsinMi(oyuncu)) return undefined;
    if (meyveOku(oyuncu) !== "ope") return undefined;

    /* Acikken tekrar tetiklenirse KAPANIYOR (reishi kalibi). */
    const varOlan = odada.get(oyuncu.id);
    if (varOlan) { varOlan.kapat = true; return undefined; }
    if (!kapi(oyuncu, "ope", OPE_ODA_BEDEL, "§b◯ §fROOM")) return undefined;

    const durum = { kapat: false, bitis: system.currentTick + OPE_ODA_SURE };
    odada.set(oyuncu.id, durum);
    const boyut = oyuncu.dimension;
    let sonraki = 0;
    bilgi(oyuncu, "§b◯ §fROOM §aAÇIK §8· " +
          Math.round(OPE_ODA_SURE / 20) + " sn");

    return {
      ad: "ope_oda", oyuncuId: oyuncu.id,
      calis() {
        if (durum.kapat) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (kesilsinMi(oyuncu)) return true;
        if (system.currentTick >= durum.bitis) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + OPE_ODA_ADIM;
        try {
          parcacikHalkasi(boyut, "minecraft:basic_crit_particle",
                          oyuncu.location, 24, OPE_ODA_YARICAP);
        } catch (e) { /* onemsiz */ }
        return false;
      },
      bitir() {
        odada.delete(oyuncu.id);
        bilgi(oyuncu, "§b◯ §7ROOM kapandı");
      }
    };
  }
});

/* Oda sarti. Kaynaktaki hasRoomActive denetiminin karsiligi. */
function odaSart(oyuncu, etiket) {
  if (odaAcikMi(oyuncu.id)) return true;
  bilgi(oyuncu, etiket + " §cÖnce ROOM aç");
  return false;
}

/* ---- SHAMBLES (ShamblesAbility) ----
   Oda icinde YER DEGISTIRME. Isinlanma iki denetimden geciyor
   (v7.57 Berserk dersi): varis yeri ve ustu hava olacak.   */
yetenekKaydet({
  kimlik: "ope_shambles", ad: "Shambles",
  esyasiz: true, sira: OPE_SHAMBLES_SIRA,
  olustur(oyuncu) {
    if (!OPE_SHAMBLES_ACIK || !MEYVE_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (kesilsinMi(oyuncu)) return undefined;
    if (meyveOku(oyuncu) !== "ope") return undefined;
    if (!odaSart(oyuncu, "§b⇄ §fShambles")) return undefined;
    if (!kapi(oyuncu, "ope", OPE_SHAMBLES_BEDEL, "§b⇄ §fShambles")) return undefined;

    let hedefler;
    try {
      hedefler = koniHedefleri(oyuncu, {
        menzil: OPE_ODA_YARICAP, aci: -1, tavan: 1, oyuncuDahil: true
      });
    } catch (e) { hataYaz("ope.shambles", e); return undefined; }
    const hedef = hedefler && hedefler[0];
    if (!hedef) { bilgi(oyuncu, "§b⇄ §7Odada kimse yok"); return undefined; }

    try {
      const boyut = oyuncu.dimension;
      const benim = oyuncu.location, onun = hedef.location;
      /* IKI TARAF ICIN DE hava denetimi: yer degistirme
         karsilikli, biri duvara girerse takas bozulur.    */
      if (!blokIste(4)) { bilgi(oyuncu, "§b⇄ §7Şu an yoğun"); return undefined; }
      const bos = (k) => {
        try {
          const a = boyut.getBlock(k);
          const b = boyut.getBlock({ x: k.x, y: k.y + 1, z: k.z });
          return !!(a && b && a.isAir && b.isAir);
        } catch (e) { return false; }
      };
      if (!bos(onun) || !bos(benim)) {
        bilgi(oyuncu, "§b⇄ §7Yer değiştirilecek nokta kapalı");
        return undefined;
      }
      oyuncu.teleport({ x: onun.x, y: onun.y, z: onun.z }, { dimension: boyut });
      hedef.teleport({ x: benim.x, y: benim.y, z: benim.z }, { dimension: boyut });
      parcacikAt(boyut, "minecraft:basic_crit_particle", onun);
      parcacikAt(boyut, "minecraft:basic_crit_particle", benim);
      bilgi(oyuncu, "§b⇄ §fShambles");
    } catch (e) { hataYaz("ope.shambles.takas", e); }
    return undefined;
  }
});

/* ---- GAMMA KNIFE (GammaKnifeAbility) ----
   Kaynakta DAMAGE 70, modun en agir tek hedef hasari. ODA sart. */
yetenekKaydet({
  kimlik: "ope_gamma", ad: "Gamma Knife",
  esyasiz: true, sira: OPE_GAMMA_SIRA,
  olustur(oyuncu) {
    if (!OPE_GAMMA_ACIK || !MEYVE_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (kesilsinMi(oyuncu)) return undefined;
    if (meyveOku(oyuncu) !== "ope") return undefined;
    if (!odaSart(oyuncu, "§b✚ §fGamma Knife")) return undefined;
    if (!kapi(oyuncu, "ope", OPE_GAMMA_BEDEL, "§b✚ §fGamma Knife")) return undefined;
    const c = ruhCarpani(oyuncu);
    const r = alanVur(oyuncu, {
      menzil: OPE_GAMMA_MENZIL, aci: OPE_GAMMA_ACI, tavan: 1,
      hasar: OPE_GAMMA_HASAR * c, zayif: OPE_GAMMA_ZAYIF
    });
    try {
      parcacikAt(oyuncu.dimension, "minecraft:basic_crit_particle",
                 basKonumu(oyuncu));
    } catch (e) { /* onemsiz */ }
    bilgi(oyuncu, "§b✚ §fGamma Knife §7·×" + c.toFixed(1) +
          " §8(" + r.vurulan + ")");
    return undefined;
  }
});

/* ---- COUNTER SHOCK (CounterShockAbility) -- ODA sart. */
yetenekKaydet({
  kimlik: "ope_sok", ad: "Counter Shock",
  esyasiz: true, sira: OPE_SOK_SIRA,
  olustur(oyuncu) {
    if (!OPE_SOK_ACIK || !MEYVE_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (kesilsinMi(oyuncu)) return undefined;
    if (meyveOku(oyuncu) !== "ope") return undefined;
    if (!odaSart(oyuncu, "§b⚡ §fCounter Shock")) return undefined;
    if (!kapi(oyuncu, "ope", OPE_SOK_BEDEL, "§b⚡ §fCounter Shock")) return undefined;
    const c = ruhCarpani(oyuncu);
    const r = alanVur(oyuncu, {
      menzil: OPE_SOK_MENZIL, aci: -1, tavan: OPE_SOK_TAVAN,
      hasar: OPE_SOK_HASAR * c, itme: OPE_SOK_ITME
    });
    try {
      parcacikHalkasi(oyuncu.dimension, "minecraft:basic_crit_particle",
                      oyuncu.location, 14, 3);
    } catch (e) { /* onemsiz */ }
    bilgi(oyuncu, "§b⚡ §fCounter Shock §7·×" + c.toFixed(1) +
          " §8(" + r.vurulan + ")");
    return undefined;
  }
});

/* ==== MEYVE SECIMI (jest sirasindan da) ==== */
yetenekKaydet({
  kimlik: "meyve_sec", ad: "Şeytan Meyvesi Seç",
  esyasiz: true, sira: MEYVE_SEC_SIRA,
  olustur(oyuncu) {
    if (!MEYVE_ACIK || !gecerliMi(oyuncu)) return undefined;
    const simdi = meyveOku(oyuncu);
    let i = 0;
    for (let k = 0; k < MEYVE_LISTESI.length; k++) {
      if (MEYVE_LISTESI[k].kimlik === simdi) { i = k; break; }
    }
    const y = MEYVE_LISTESI[(i + 1) % MEYVE_LISTESI.length];
    meyveYaz(oyuncu, y.kimlik);
    try {
      oyuncu.sendMessage("§e🍎 §f" + y.ad + " §7· " + y.sahip +
                         " §8(" + y.tur + ")");
      actionbarYaz(oyuncu, "§e🍎 §f" + y.ad);
    } catch (e) { /* onemsiz */ }
    return undefined;
  }
});
