import { system } from "@minecraft/server";
import { hataYaz, gecerliMi, olayaAbone, itmeUygula } from "../yardimcilar.js";
import { AKTOR_KIMLIK, AKTOR_SKINLER } from "./_aktor_skinleri.js";
import { WOM_KILIC_SETLER, WOM_KILIC_ESYA } from "./_wom_hareket.js";
import { bakisAcisi } from "./sinematik.js";
import {
  CEKIM_ACIK, CEKIM_YURU, CEKIM_KOS, CEKIM_VARIS, CEKIM_MENZIL,
  CEKIM_ITME, CEKIM_ITME_DIKEY, CEKIM_SERI_ARA, CEKIM_TAVAN,
  CEKIM_ADIM, CEKIM_YAKLASMA, CEKIM_SAHNELER,
  CEKIM_SAVUN_SURE, CEKIM_SAVUN_ITME, CEKIM_KACIN, CEKIM_KACIN_TICK,
  CEKIM_SARSINTI, CEKIM_DOVUS_TAVAN, CEKIM_ANIM, CEKIM_SES, CEKIM_PARCACIK,
  CEKIM_ALTYAZI_HARF, CEKIM_ALTYAZI_EN_AZ, CEKIM_ALTYAZI_YENILE,
  CEKIM_YOL_ALFA, CEKIM_YOL_EN_AZ
} from "../ayarlar.js";

/* ============================================================
   CEKIM SETI                                          v7.99.6

   Video icin oyun ici cekim (kullanicinin "A yolu"). Uc parca
   (v7.99.7'de dovus cesitleri, otomatik dovus, altyazi ve kamera
   yolu eklendi):

     AKTORLER  pa:aktor varligi. AI'si yok; ne yapacagini bu
               dosya soyluyor: yuru, bak, esya tut, animasyon
               oyna, WoM kombosuyla vur.
     KAMERA    /camera ile hazir acilar (genis, yan, omuz,
               yakin, ust, dusuk, yorunge, takip).
     SAHNE     [tick, "komut"] satirlarindan zaman cizelgesi
               (ayarlar.js CEKIM_SAHNELER).

   Butun komutlar tek girisle geliyor: cekimKomutu(oyuncu,
   kelimeler). Sahne satirlari da AYNI girisi kullaniyor --
   yani sohbette calisan her komut sahnede de calisiyor.

   ---- CIKIS GARANTISI ----
   Kamerayi, HUD'u ve gorunmezligi geri alan tek yer
   cekimBirak(). Sahne biterken, "cekim dur"da, oyuncu cikinca
   ve CEKIM_TAVAN dolunca cagriliyor.

   ---- DONGU YOK ----
   Kendi runInterval'i yok; main.js her tick cekimTick()
   cagiriyor (depo kurali: tek dongu).
   ============================================================ */

const ETIKET = "cekim:";

/* aktorId -> suren eylem: { tur: "yuru" | "vur", ... } */
const eylemler = new Map();
/* aktorId -> { set, sira, son } -- kombo sirasi */
const seriler = new Map();
/* oyuncuId -> { kalip, a, b, bas, bitis, sonraki, sure } -- hareketli kamera */
const kameralar = new Map();
/* oyuncuId -> { ad, satirlar, i, bas } */
const sahneler = new Map();
/* oyuncuId -> oyuncu: HUD gizli / gorunmez -- geri alinacak */
const cekimdekiler = new Map();
/* aktorId -> WoM seti (esya komutuyla verilen) */
const esyaSetleri = new Map();
/* aktorId -> savunmanin bittigi tick (v7.99.7) */
const savunanlar = new Map();
/* "a|b" -> otomatik dovus durumu (v7.99.7) */
const dovusler = new Map();
/* oyuncuId -> { metin, bitis, sonraki } -- ekrandaki altyazi */
const altyazilar = new Map();
/* oyuncuId -> [{ x, y, z, pitch, yaw }] -- kamera yolu noktalari */
const yolNoktalari = new Map();
/* aktorId -> altyazida gorunen ad */
const isimler = new Map();

/* ---------------- yardimcilar ---------------- */

function komut(oyuncu, k) {
  try { oyuncu.runCommand(k); return true; }
  catch (e) { hataYaz("cekim.komut", e); return false; }
}

function yatayYon(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const boy = Math.hypot(dx, dz);
  return boy > 1e-6 ? { x: dx / boy, z: dz / boy } : { x: 0, z: 1 };
}

/* Varligin yuzunun yonu (yaw'dan). */
function bakisYonu(v) {
  try {
    if (typeof v.getViewDirection === "function") {
      const y = v.getViewDirection();
      const boy = Math.hypot(y.x, y.z);
      if (boy > 1e-6) return { x: y.x / boy, z: y.z / boy };
    }
  } catch (e) { /* asagida */ }
  return { x: 0, z: 1 };
}

function basNoktasi(v) {
  const k = v.location;
  return { x: k.x, y: k.y + 1.62, z: k.z };
}

export function skinBul(ad) {
  if (ad === undefined || ad === "") return 0;
  const n = Number(ad);
  if (Number.isInteger(n) && n >= 0 && n < AKTOR_SKINLER.length) return n;
  const i = AKTOR_SKINLER.findIndex((s) => s.ad === ad);
  return i >= 0 ? i : -1;
}

function aktorleri(boyut) {
  try { return boyut.getEntities({ type: AKTOR_KIMLIK }); }
  catch (e) { hataYaz("cekim.aktorleri", e); return []; }
}

function aktorAdi(v) {
  try {
    for (const t of v.getTags()) if (t.startsWith(ETIKET)) return t.slice(ETIKET.length);
  } catch (e) { /* adsiz */ }
  return undefined;
}

export function aktorBul(boyut, ad) {
  for (const v of aktorleri(boyut)) {
    if (gecerliMi(v) && aktorAdi(v) === ad) return v;
  }
  return undefined;
}

/* "ben" oyuncunun kendisi, geri kalan aktor adi. */
function hedefBul(oyuncu, ad) {
  if (ad === "ben") return oyuncu;
  return aktorBul(oyuncu.dimension, ad);
}

/* Hedefin yuzunu cevir. */
function yuzunuCevir(v, hedefKonum) {
  try {
    v.teleport(v.location, { facingLocation: { x: hedefKonum.x, y: v.location.y + 1.62, z: hedefKonum.z } });
  } catch (e) { hataYaz("cekim.bak", e); }
}

/* ---------------- aktor komutlari ---------------- */

function aktorKur(oyuncu, ad, skinAd) {
  if (!ad) return "§cAd ver: §fcekim aktor <ad> [skin]";
  if (ad === "ben") return "§c'ben' ad olamaz (oyuncunun kendisi).";
  const skin = skinBul(skinAd);
  if (skin < 0) return "§cBöyle bir skin yok: §f" + skinAd + " §7(cekim skinler)";
  const bak = bakisYonu(oyuncu);
  const k = oyuncu.location;
  const yer = { x: k.x + bak.x * 2.5, y: k.y, z: k.z + bak.z * 2.5 };
  let v = aktorBul(oyuncu.dimension, ad);
  const yeni = !v;
  try {
    if (!v) {
      v = oyuncu.dimension.spawnEntity(AKTOR_KIMLIK, yer);
      v.addTag(ETIKET + ad);
    } else {
      v.teleport(yer);
    }
    if (skinAd !== undefined || yeni) v.setProperty("pa:skin", skin);
    yuzunuCevir(v, k);
  } catch (e) {
    hataYaz("cekim.aktor", e);
    return "§cAktör kurulamadı.";
  }
  return "§a" + (yeni ? "Aktör kuruldu: " : "Aktör buraya getirildi: ") + "§f" + ad +
         (skinAd !== undefined || yeni ? " §7(" + AKTOR_SKINLER[skin].ad + ")" : "");
}

function esyaVer(oyuncu, v, esya) {
  if (!esya) return "§cEşya ver: §fcekim esya <ad> <eşya|bos>";
  const tam = esya === "bos" ? "air" : (esya.indexOf(":") >= 0 ? esya : "minecraft:" + esya);
  try {
    v.runCommand("replaceitem entity @s slot.weapon.mainhand 0 " + tam);
  } catch (e) {
    hataYaz("cekim.esya", e);
    return "§cEşya verilemedi: §f" + tam;
  }
  seriler.delete(v.id);
  const kayit = WOM_KILIC_ESYA[tam];
  if (kayit) esyaSetleri.set(v.id, kayit.set); else esyaSetleri.delete(v.id);
  return "§aEşya: §f" + tam;
}

/* Elindeki esyanin WoM seti; yoksa yumruk. */
function elSeti(v) {
  try {
    const e = v.getComponent("minecraft:equippable");
    const esya = e && e.getEquipment ? e.getEquipment("Mainhand") : undefined;
    const kayit = esya ? WOM_KILIC_ESYA[esya.typeId] : undefined;
    if (kayit) return kayit.set;
  } catch (e) { /* okunamadi */ }
  return esyaSetleri.get(v.id) || "yumruk";
}

/* ---------------- eylemler ---------------- */

function yuruBaslat(v, hedef, kos) {
  eylemler.set(v.id, { tur: "yuru", v, hedef, hiz: kos ? CEKIM_KOS : CEKIM_YURU,
                       bitis: system.currentTick + CEKIM_TAVAN });
}

/* Siradaki vurusu sec. tur "oto" kombo sirasini ilerletiyor;
   "kosu" (atilma) ve "hava" setin o turdeki ilk vurusu, sirayi
   bozmuyor. */
export function komboSec(set, d, simdi, tur = "oto") {
  const s = WOM_KILIC_SETLER[set];
  if (!s) return undefined;
  if (tur !== "oto") {
    const x = s.saldirilar.find((v) => v.tur === tur);
    return x ? { vurus: x, sira: d && d.set === set ? d.sira : -1, ozel: true } : undefined;
  }
  const oto = s.saldirilar.filter((x) => x.tur === "oto");
  if (oto.length === 0) return undefined;
  if (!d || d.set !== set || simdi - d.son > CEKIM_SERI_ARA) return { vurus: oto[0], sira: 0 };
  const sira = (d.sira + 1) % oto.length;
  return { vurus: oto[sira], sira };
}

export const VURUS_TURLERI = ["oto", "kosu", "hava"];

function vurBaslat(v, hedef, set, tur = "oto") {
  const simdi = system.currentTick;
  if (!WOM_KILIC_SETLER[set]) return "§cBöyle bir dövüş seti yok: §f" + set;
  const secim = komboSec(set, seriler.get(v.id), simdi, tur);
  if (!secim) return "§c" + set + " setinde '" + tur + "' vuruşu yok.";
  const s = secim.vurus;
  const oto = WOM_KILIC_SETLER[set].saldirilar.filter((x) => x.tur === "oto").length;
  seriler.set(v.id, { set, sira: secim.sira, son: simdi + Math.round(s.sure * 20) });
  savunanlar.delete(v.id);                    // vuran savunmayi birakiyor
  yuzunuCevir(v, hedef.location);
  const yon = yatayYon(v.location, hedef.location);
  try {
    v.playAnimation(s.anim, { blendOutTime: s.gecis });
  } catch (e) { hataYaz("cekim.oyna", e); }
  eylemler.set(v.id, {
    tur: "vur", v, hedef, s, yon, bas: simdi, cikis: { ...v.location },
    vuruldu: s.fazlar.map(() => false),
    /* Bitirici: kombonun son adimi ya da kosu/hava. Sarsinti onda. */
    bitirici: secim.ozel || secim.sira === oto - 1,
    dikey: tur === "hava" || !!s.dikey
  });
  return "§a" + s.ad;
}

function vurTick(e, simdi) {
  const t = simdi - e.bas;
  const s = e.s;
  /* Hamle: izin tick basina [sag, on, yukari] farki, cikis yonune gore. */
  if (t > 0 && t < s.iz.length) {
    const p = s.iz[t];
    const sag = p[0], on = p[1];
    const nx = e.yon.x, nz = e.yon.z;
    const x = e.cikis.x + on * nx - sag * nz;
    const z = e.cikis.z + on * nz + sag * nx;
    /* Hava vurusunda izin yukari bileseni de: aktor gercekten sicriyor. */
    const y = e.dikey ? e.cikis.y + Math.max(0, p[2]) : e.v.location.y;
    try {
      e.v.teleport({ x, y, z },
                   { facingLocation: { x: x + nx, y: y + 1.62, z: z + nz } });
    } catch (hata) { hataYaz("cekim.hamle", hata); }
  }
  /* Degme anlari. */
  s.fazlar.forEach((f, i) => {
    if (e.vuruldu[i] || t < Math.round(f.contact * 20)) return;
    e.vuruldu[i] = true;
    if (!gecerliMi(e.hedef)) return;
    const a = e.v.location, b = e.hedef.location;
    if (Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > CEKIM_MENZIL) return;
    const savundu = savunuyorMu(e.hedef, a, simdi);
    efekt(e.hedef, savundu ? "savun" : "vurus");
    if (!savundu) {
      try {
        e.hedef.applyDamage(Math.max(1, Math.round(f.hasar || 1)),
                            { cause: "entityAttack", damagingEntity: e.v });
      } catch (hata) { hataYaz("cekim.hasar", hata); }
      tepkiOyna(e.hedef, CEKIM_ANIM.darbe);
    }
    const carpan = savundu ? CEKIM_SAVUN_ITME : 1;
    itmeUygula(e.hedef, e.yon.x, e.yon.z, CEKIM_ITME * (f.hasar || 1) * carpan, CEKIM_ITME_DIKEY * carpan);
    if (e.bitirici && i === s.fazlar.length - 1 && !savundu) sars();
  });
  return t >= Math.round(s.sure * 20);
}

/* ---------------- savunma, kacinma, tepki (v7.99.7) ---------------- */

/* Savunuyor ve saldirana DONUK mu? Arkadan gelen vurus savunulmaz. */
function savunuyorMu(h, saldiran, simdi) {
  const bitis = savunanlar.get(h.id);
  if (bitis === undefined || simdi > bitis) return false;
  const on = bakisYonu(h);
  const y = yatayYon(h.location, saldiran);
  return on.x * y.x + on.z * y.z > 0.3;
}

function tepkiOyna(v, anim) {
  if (v.typeId !== AKTOR_KIMLIK) return;
  try { v.playAnimation(anim, { controller: "cekim_tepki" }); }
  catch (e) { hataYaz("cekim.tepki", e); }
}

function efekt(v, tur) {
  try {
    const k = v.location;
    const g = { x: k.x, y: k.y + 1.1, z: k.z };
    v.dimension.spawnParticle(CEKIM_PARCACIK, g);
    v.dimension.playSound(CEKIM_SES[tur], g);
  } catch (e) { hataYaz("cekim.efekt", e); }
}

/* Bitirici vuruslarda kamerayi tutan herkesin ekrani sarsilir. */
function sars() {
  for (const oyuncu of cekimdekiler.values()) {
    if (!gecerliMi(oyuncu)) continue;
    komut(oyuncu, "camerashake add @s " + CEKIM_SARSINTI[0] + " " + CEKIM_SARSINTI[1] + " positional");
  }
}

function savunBaslat(v, sure = CEKIM_SAVUN_SURE) {
  savunanlar.set(v.id, system.currentTick + sure);
  try {
    v.playAnimation(CEKIM_ANIM.savun, { controller: "cekim_savun",
                                        stopExpression: "query.anim_time > " + (sure / 20).toFixed(2) });
  } catch (e) { hataYaz("cekim.savun", e); }
}

export const KACIS_YONLERI = ["sol", "sag", "geri"];

function kacinBaslat(v, yon = "geri", tehdit) {
  const on = tehdit ? yatayYon(v.location, tehdit) : bakisYonu(v);
  const sag = { x: -on.z, z: on.x };
  const d = yon === "sol" ? { x: -sag.x, z: -sag.z } : yon === "sag" ? sag : { x: -on.x, z: -on.z };
  savunanlar.delete(v.id);
  eylemler.set(v.id, { tur: "kacin", v, d, bak: tehdit, adim: 0, cikis: { ...v.location } });
  tepkiOyna(v, CEKIM_ANIM["kacin_" + yon]);
  efekt(v, "kacin");
}

function kacinTick(e) {
  e.adim++;
  const u = Math.min(1, e.adim / CEKIM_KACIN_TICK);
  const yumusak = 1 - (1 - u) * (1 - u);
  const k = { x: e.cikis.x + e.d.x * CEKIM_KACIN * yumusak, y: e.v.location.y,
              z: e.cikis.z + e.d.z * CEKIM_KACIN * yumusak };
  try {
    e.v.teleport(k, e.bak ? { facingLocation: { x: e.bak.x, y: k.y + 1.62, z: e.bak.z } } : undefined);
  } catch (hata) { hataYaz("cekim.kacin", hata); return true; }
  return u >= 1;
}

function yuruTick(e) {
  if (!e.hedef.nokta && !gecerliMi(e.hedef)) return true;
  const hedef = e.hedef.nokta || e.hedef.location;
  const k = e.v.location;
  const dx = hedef.x - k.x, dz = hedef.z - k.z;
  const uz = Math.hypot(dx, dz);
  const dur = e.hedef.nokta ? 0.05 : CEKIM_VARIS;
  if (uz <= dur) return true;
  const adim = Math.min(e.hiz, uz - dur);
  const nx = dx / uz, nz = dz / uz;
  const yeni = { x: k.x + nx * adim, y: k.y, z: k.z + nz * adim };
  try {
    e.v.teleport(yeni, { facingLocation: { x: yeni.x + nx, y: yeni.y + 1.62, z: yeni.z + nz } });
  } catch (hata) { hataYaz("cekim.yuru", hata); return true; }
  return false;
}

/* ---------------- otomatik dovus (v7.99.7) ----------------
   Iki aktor kendi kendine dovusuyor: yaklas, kombo, atilma, hava
   vurusu, savunma, kacinma. Karar YALNIZ tohumlu rastgele sayidan
   geliyor (mulberry32): ayni baslangic + ayni tohum = ayni dovus.
   Boylece ayni dovusu once genis, sonra omuz acisindan cekip
   kurguda birlestirebilirsin.                                  */
export function rastgele(tohum) {
  let t = (Number(tohum) || 1) >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function turVar(set, tur) {
  const s = WOM_KILIC_SETLER[set];
  return !!s && s.saldirilar.some((x) => x.tur === tur);
}

function dovusBaslat(a, b, saniye, tohum) {
  const sure = Math.round(Math.max(1, Math.min(CEKIM_DOVUS_TAVAN, saniye)) * 20);
  const r = rastgele(tohum);
  const simdi = system.currentTick;
  dovusler.set([a.id, b.id].sort().join("|"), {
    a, b, r, bitis: simdi + sure,
    bekle: { [a.id]: simdi, [b.id]: simdi + 6 + Math.floor(r() * 8) }
  });
}

function dovusKarar(d, ben, rakip, simdi) {
  if (eylemler.has(ben.id) || simdi < d.bekle[ben.id]) return;
  const r = d.r;
  const a = ben.location, b = rakip.location;
  const uz = Math.hypot(b.x - a.x, b.z - a.z);
  const set = elSeti(ben);
  yuzunuCevir(ben, b);
  let ara = 4 + Math.floor(r() * 8);
  if (uz > 6) {
    yuruBaslat(ben, rakip, true);
    ara = 0;
  } else if (uz > 3.2) {
    if (r() < 0.4 && turVar(set, "kosu")) vurBaslat(ben, rakip, set, "kosu");
    else { yuruBaslat(ben, rakip, false); ara = 0; }
  } else {
    const x = r();
    if (x < 0.6) {
      vurBaslat(ben, rakip, set, "oto");
      /* Rakip bosta ise tepki verebilir: savun ya da kac. */
      if (!eylemler.has(rakip.id)) {
        const t = r();
        if (t < 0.3) savunBaslat(rakip);
        else if (t < 0.42) {
          kacinBaslat(rakip, KACIS_YONLERI[Math.floor(r() * 3)], a);
          d.bekle[rakip.id] = simdi + CEKIM_KACIN_TICK + 4;
        }
      }
    } else if (x < 0.7 && turVar(set, "hava")) {
      vurBaslat(ben, rakip, set, "hava");
    } else if (x < 0.82) {
      kacinBaslat(ben, KACIS_YONLERI[Math.floor(r() * 3)], b);
    } else {
      savunBaslat(ben);
      ara = CEKIM_SAVUN_SURE;
    }
  }
  d.bekle[ben.id] = simdi + ara;
}

function dovusTick(anahtar, d, simdi) {
  if (simdi >= d.bitis || !gecerliMi(d.a) || !gecerliMi(d.b)) {
    dovusler.delete(anahtar);
    savunanlar.delete(d.a.id); savunanlar.delete(d.b.id);
    return;
  }
  dovusKarar(d, d.a, d.b, simdi);
  dovusKarar(d, d.b, d.a, simdi);
}

/* ---------------- altyazi (v7.99.7) ---------------- */

function gorunenAd(v, ad) {
  if (isimler.has(v.id)) return isimler.get(v.id);
  try {
    const d = v.getDynamicProperty && v.getDynamicProperty("cekim:isim");
    if (typeof d === "string" && d) return d;
  } catch (e) { /* yok */ }
  return ad.charAt(0).toUpperCase() + ad.slice(1);
}

export function altyaziSure(metin) {
  return Math.max(CEKIM_ALTYAZI_EN_AZ, Math.round(String(metin).length * CEKIM_ALTYAZI_HARF));
}

function altyaziGoster(oyuncu, metin) {
  const simdi = system.currentTick;
  const k = { oyuncu, metin, bitis: simdi + altyaziSure(metin), sonraki: simdi };
  altyazilar.set(oyuncu.id, k);
  altyaziTick(k, simdi);
}

function altyaziTick(k, simdi) {
  try {
    if (simdi >= k.bitis) {
      k.oyuncu.onScreenDisplay.setActionBar(" ");
      altyazilar.delete(k.oyuncu.id);
      return;
    }
    if (simdi >= k.sonraki) {
      k.oyuncu.onScreenDisplay.setActionBar(k.metin);
      k.sonraki = simdi + CEKIM_ALTYAZI_YENILE;
    }
  } catch (e) { hataYaz("cekim.altyazi", e); altyazilar.delete(k.oyuncu.id); }
}

function konustur(v, metin) {
  if (v.typeId !== AKTOR_KIMLIK) return;
  try {
    v.playAnimation(CEKIM_ANIM.konus, { controller: "cekim_konus",
      stopExpression: "query.anim_time > " + (altyaziSure(metin) / 20).toFixed(2) });
  } catch (e) { hataYaz("cekim.konus", e); }
}

/* ---------------- kamera yolu (v7.99.7) ----------------
   Oyuncu gezip "cekim nokta ekle" diyor; "cekim kamera yol"
   bu noktalardan (baktigi yonleriyle) gecen yumusak bir
   yoldan akiyor. Merkezcil Catmull-Rom (alfa 0,5): noktalar
   arasi mesafe cok farkliyken bile dugum atmiyor, kivrilmiyor.
   Fikir ReplayMod'un yol duzenleyicisinden; kod bizim.     */
function oyuncuNoktasi(o) {
  let pitch = 0, yaw = 0;
  try {
    if (typeof o.getRotation === "function") {
      const r = o.getRotation(); pitch = r.x; yaw = r.y;
    } else {
      const y = o.getViewDirection();
      yaw = Math.atan2(-y.x, y.z) * 180 / Math.PI;
      pitch = -Math.asin(Math.max(-1, Math.min(1, y.y))) * 180 / Math.PI;
    }
  } catch (e) { /* 0,0 */ }
  let g;
  try { g = typeof o.getHeadLocation === "function" ? o.getHeadLocation() : undefined; } catch (e) { g = undefined; }
  const k = g || { x: o.location.x, y: o.location.y + 1.62, z: o.location.z };
  return { x: k.x, y: k.y, z: k.z, pitch, yaw };
}

function crDugum(p, q, t) {
  const d = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
  return t + Math.max(1e-4, Math.pow(d, CEKIM_YOL_ALFA));
}

function crKarisim(a, b, ta, tb, t, alan) {
  const u = (tb - t) / (tb - ta), v = (t - ta) / (tb - ta);
  const o = {};
  for (const k of alan) o[k] = a[k] * u + b[k] * v;
  return o;
}

/* Yolun 0..1 arasindaki noktasi. */
export function yolNoktasi(noktalar, ilerleme) {
  const n = noktalar.length;
  if (n === 1) return { ...noktalar[0] };
  /* yaw'i duz ac: 350 -> 10 gecisi 340 derece donmesin */
  const acik = [];
  for (let i = 0; i < n; i++) {
    const p = { ...noktalar[i] };
    if (i > 0) {
      let fark = p.yaw - acik[i - 1].yaw;
      while (fark > 180) fark -= 360;
      while (fark < -180) fark += 360;
      p.yaw = acik[i - 1].yaw + fark;
    }
    acik.push(p);
  }
  const u = Math.max(0, Math.min(1, ilerleme)) * (n - 1);
  const i = Math.min(n - 2, Math.floor(u));
  const yerel = u - i;
  const P1 = acik[i], P2 = acik[i + 1];
  const yansit = (a, b) => {
    const o = {};
    for (const k of ["x", "y", "z", "pitch", "yaw"]) o[k] = 2 * a[k] - b[k];
    return o;
  };
  const P0 = i > 0 ? acik[i - 1] : yansit(P1, P2);
  const P3 = i + 2 < n ? acik[i + 2] : yansit(P2, P1);
  const alan = ["x", "y", "z", "pitch", "yaw"];
  const t0 = 0, t1 = crDugum(P0, P1, t0), t2 = crDugum(P1, P2, t1), t3 = crDugum(P2, P3, t2);
  const t = t1 + (t2 - t1) * yerel;
  const A1 = crKarisim(P0, P1, t0, t1, t, alan);
  const A2 = crKarisim(P1, P2, t1, t2, t, alan);
  const A3 = crKarisim(P2, P3, t2, t3, t, alan);
  const B1 = crKarisim(A1, A2, t0, t2, t, alan);
  const B2 = crKarisim(A2, A3, t1, t3, t, alan);
  return crKarisim(B1, B2, t1, t2, t, alan);
}

function kameraKomutuDon(p, gecis) {
  const ease = gecis > 0 ? " ease " + gecis.toFixed(2) + " linear" : "";
  return "camera @s set minecraft:free" + ease + " pos " +
         p.x.toFixed(2) + " " + p.y.toFixed(2) + " " + p.z.toFixed(2) +
         " rot " + p.pitch.toFixed(1) + " " + p.yaw.toFixed(1);
}

function yolKur(oyuncu, sure) {
  const n = yolNoktalari.get(oyuncu.id) || [];
  if (n.length < CEKIM_YOL_EN_AZ) {
    return "§cKamera yolu için en az " + CEKIM_YOL_EN_AZ + " nokta gerek: §fcekim nokta ekle";
  }
  cekimeGir(oyuncu);
  const simdi = system.currentTick;
  komut(oyuncu, kameraKomutuDon(n[0], 0));
  kameralar.set(oyuncu.id, { kalip: "yol", noktalar: n.map((p) => ({ ...p })), bas: simdi,
                             sure: sure || 100, sonraki: simdi + CEKIM_ADIM, bitis: simdi + CEKIM_TAVAN });
  return "§aKamera yolu: §f" + n.length + " nokta, " + ((sure || 100) / 20).toFixed(1) + " sn";
}

function noktaKomutu(oyuncu, alt) {
  const liste = yolNoktalari.get(oyuncu.id) || [];
  if (alt === "ekle") {
    liste.push(oyuncuNoktasi(oyuncu));
    yolNoktalari.set(oyuncu.id, liste);
    return "§aNokta " + liste.length + " eklendi.";
  }
  if (alt === "sil") { liste.pop(); yolNoktalari.set(oyuncu.id, liste); return "§aSon nokta silindi (" + liste.length + " kaldı)."; }
  if (alt === "temizle") { yolNoktalari.delete(oyuncu.id); return "§aNoktalar temizlendi."; }
  return "§eNoktalar: §f" + liste.length + " §7(cekim nokta ekle|sil|temizle)";
}

/* ---------------- kamera ---------------- */

/* Kalibin kamera noktasi ve baktigi nokta. a zorunlu, b istege bagli. */
export function kameraNoktasi(kalip, a, b, ilerleme = 0) {
  const A = a.location, bA = basNoktasi(a);
  const B = b ? b.location : undefined;
  const orta = B ? { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 } : { ...A };
  const eksen = B ? yatayYon(A, B) : bakisYonu(a);
  const dik = { x: -eksen.z, z: eksen.x };             // eksene dik (sag)
  const ara = B ? Math.hypot(B.x - A.x, B.z - A.z) : 0;
  let poz, bak;
  switch (kalip) {
    case "genis": {
      const u = Math.max(6, ara * 1.6);
      poz = { x: orta.x + dik.x * u, y: orta.y + 2.8, z: orta.z + dik.z * u };
      bak = { x: orta.x, y: orta.y + 1.0, z: orta.z };
      break;
    }
    case "yan": {
      const u = Math.max(3.5, ara * 1.1);
      poz = { x: orta.x + dik.x * u, y: orta.y + 1.5, z: orta.z + dik.z * u };
      bak = { x: orta.x, y: orta.y + 1.2, z: orta.z };
      break;
    }
    case "omuz": {
      /* a'nin arkasi, sag omzu; b'ye bakiyor. */
      poz = { x: A.x - eksen.x * 2.2 + dik.x * 0.9, y: A.y + 2.0, z: A.z - eksen.z * 2.2 + dik.z * 0.9 };
      bak = B ? basNoktasi(b) : { x: A.x + eksen.x * 5, y: bA.y, z: A.z + eksen.z * 5 };
      break;
    }
    case "yakin": {
      /* Yuzun onu. b varsa b tarafindan. */
      const on = B ? eksen : bakisYonu(a);
      poz = { x: bA.x + on.x * 1.7, y: bA.y + 0.1, z: bA.z + on.z * 1.7 };
      bak = bA;
      break;
    }
    case "ust": {
      poz = { x: orta.x + 0.01, y: orta.y + 9, z: orta.z };
      bak = { x: orta.x, y: orta.y, z: orta.z };
      break;
    }
    case "dusuk": {
      const on = B ? eksen : bakisYonu(a);
      poz = { x: A.x + on.x * 2.6 + dik.x * 0.8, y: A.y + 0.3, z: A.z + on.z * 2.6 + dik.z * 0.8 };
      bak = { x: bA.x, y: bA.y + 0.2, z: bA.z };
      break;
    }
    case "yorunge": {
      const r = Math.max(4.5, ara * 1.3);
      const a0 = Math.atan2(dik.x, dik.z) + ilerleme * Math.PI * 2;
      poz = { x: orta.x + Math.sin(a0) * r, y: orta.y + 2.2, z: orta.z + Math.cos(a0) * r };
      bak = { x: orta.x, y: orta.y + 1.1, z: orta.z };
      break;
    }
    case "takip": {
      const on = bakisYonu(a);
      poz = { x: A.x - on.x * 4 + dik.x * 0.6, y: A.y + 2.4, z: A.z - on.z * 4 + dik.z * 0.6 };
      bak = { x: bA.x + on.x * 2, y: bA.y, z: bA.z + on.z * 2 };
      break;
    }
    default:
      return undefined;
  }
  return { poz, bak };
}

export const KAMERA_KALIPLARI = ["genis", "yan", "omuz", "yakin", "ust", "dusuk", "yorunge", "takip"];
const HAREKETLI = new Set(["yorunge", "takip"]);

function kameraKomutu(n, gecis) {
  const { yaw, pitch } = bakisAcisi(n.poz, n.bak);
  const ease = gecis > 0 ? " ease " + gecis.toFixed(2) + " in_out_sine" : "";
  return "camera @s set minecraft:free" + ease + " pos " +
         n.poz.x.toFixed(2) + " " + n.poz.y.toFixed(2) + " " + n.poz.z.toFixed(2) +
         " rot " + pitch.toFixed(1) + " " + yaw.toFixed(1);
}

function cekimeGir(oyuncu) {
  if (cekimdekiler.has(oyuncu.id)) return;
  cekimdekiler.set(oyuncu.id, oyuncu);
  /* Kameraman kadraja girmesin. */
  try { oyuncu.addEffect("invisibility", CEKIM_TAVAN + 40, { showParticles: false }); }
  catch (e) { hataYaz("cekim.gorunmez", e); }
}

function kameraKur(oyuncu, kalip, a, b, sure) {
  const n = kameraNoktasi(kalip, a, b, 0);
  if (!n) return "§cBöyle bir kamera açısı yok: §f" + kalip + " §7(" + KAMERA_KALIPLARI.join(", ") + ")";
  cekimeGir(oyuncu);
  komut(oyuncu, kameraKomutu(n, kameralar.has(oyuncu.id) ? CEKIM_YAKLASMA : 0));
  const simdi = system.currentTick;
  if (HAREKETLI.has(kalip)) {
    kameralar.set(oyuncu.id, { kalip, a, b, bas: simdi, sure: sure || 100,
                               sonraki: simdi + CEKIM_ADIM, bitis: simdi + CEKIM_TAVAN });
  } else {
    kameralar.set(oyuncu.id, { kalip, a, b, bas: simdi, sabit: true, bitis: simdi + CEKIM_TAVAN });
  }
  return "§aKamera: §f" + kalip;
}

function kameraTick(oyuncu, k, simdi) {
  if (simdi >= k.bitis) return true;
  if (k.sabit || simdi < k.sonraki) return false;
  if (k.kalip === "yol") {
    k.sonraki = simdi + CEKIM_ADIM;
    const u = Math.min(1, (simdi + CEKIM_ADIM - k.bas) / k.sure);
    komut(oyuncu, kameraKomutuDon(yolNoktasi(k.noktalar, u), CEKIM_ADIM / 20));
    if (u >= 1) k.sabit = true;           // son noktada durur; sahne kesebilir
    return false;
  }
  if (!gecerliMi(k.a) || (k.b && !gecerliMi(k.b))) return false;
  k.sonraki = simdi + CEKIM_ADIM;
  const ilerleme = k.kalip === "yorunge" ? ((simdi - k.bas) / k.sure) : 0;
  const n = kameraNoktasi(k.kalip, k.a, k.b, ilerleme);
  if (n) komut(oyuncu, kameraKomutu(n, CEKIM_ADIM / 20));
  return false;
}

/* TEK CIKIS YOLU: kamera, HUD, gorunmezlik, sahne. */
export function cekimBirak(oyuncu) {
  kameralar.delete(oyuncu.id);
  sahneler.delete(oyuncu.id);
  const icerde = cekimdekiler.delete(oyuncu.id);
  const yazi = altyazilar.delete(oyuncu.id);
  if (!gecerliMi(oyuncu)) return;
  if (yazi) { try { oyuncu.onScreenDisplay.setActionBar(" "); } catch (e) { /* onemsiz */ } }
  komut(oyuncu, "camera @s clear");
  komut(oyuncu, "hud @s reset");
  if (icerde) {
    try { oyuncu.removeEffect("invisibility"); } catch (e) { hataYaz("cekim.gorunur", e); }
  }
}

/* ---------------- sahne ---------------- */

function sahneBaslat(oyuncu, ad) {
  const satirlar = CEKIM_SAHNELER[ad];
  if (!satirlar) return "§cBöyle bir sahne yok: §f" + ad + " §7(" + Object.keys(CEKIM_SAHNELER).join(", ") + ")";
  const sirali = satirlar.slice().sort((x, y) => x[0] - y[0]);
  sahneler.set(oyuncu.id, { ad, satirlar: sirali, i: 0, bas: system.currentTick });
  cekimeGir(oyuncu);
  komut(oyuncu, "hud @s hide all");
  sahneTick(oyuncu, sahneler.get(oyuncu.id), system.currentTick);
  return undefined;           // sahne sirasinda sohbete yazmiyoruz
}

function sahneTick(oyuncu, sh, simdi) {
  const t = simdi - sh.bas;
  if (t > CEKIM_TAVAN) { cekimBirak(oyuncu); return; }
  while (sh.i < sh.satirlar.length && sh.satirlar[sh.i][0] <= t) {
    const satir = sh.satirlar[sh.i++];
    const cevap = cekimKomutu(oyuncu, String(satir[1]).split(" "), true);
    if (typeof cevap === "string" && cevap.startsWith("§c")) {
      try { oyuncu.sendMessage("§7[sahne " + sh.ad + " @" + satir[0] + "] " + cevap); } catch (e) { /* onemsiz */ }
    }
    if (!sahneler.has(oyuncu.id)) return;     // "birak" satiri sahneyi bitirdi
  }
}

/* ---------------- tek giris ---------------- */

const YARDIM_METNI = [
  "§e— Çekim Seti —",
  "§faktor <ad> [skin]§7 · §fskin <ad> <skin>§7 · §fskinler§7 · §fliste§7 · §fsil <ad>§7 · §ftemizle",
  "§fesya <ad> <eşya|bos>§7 · §fbak <ad> <hedef>§7 · §fgit <ad> <hedef> [kos]§7 · §fgit <ad> ileri <blok> [kos]",
  "§foyna <ad> <animasyon>§7 · §fanimler [set]§7 · §fvur <ad> <hedef> [set] [oto|kosu|hava]",
  "§fsavun <ad> [tick]§7 · §fkacin <ad> [sol|sag|geri]§7 · §fdovus <a> <b> [sn] [tohum]§7 · §fdovus dur",
  "§fsoyle <ad> <söz>§7 · §fanlat <metin>§7 · §fisim <ad> <görünen ad>",
  "§fkamera <açı> <ad> [ad2] [süre]§7 · açılar: " + KAMERA_KALIPLARI.join(", "),
  "§fnokta ekle|sil|temizle§7 · §fkamera yol [süre]§7 (işaretlediğin noktalardan geçen kamera)",
  "§fhud kapat|ac§7 · §fyazi <metin>§7 · §fsahne <ad>§7 · §fsahneler§7 · §fdur§7 / §fbirak",
  "§8hedef: aktör adı ya da 'ben'. Rehber: addon/CEKIM_REHBERI.md"
].join("\n");

/* kelimeler: "cekim"den SONRAKI kelimeler. sahnede=true iken
   sahne satirindan geliyor ("birak" sahneyi de bitirir). */
export function cekimKomutu(oyuncu, kelimeler, sahnede = false, ham = undefined) {
  if (!CEKIM_ACIK) return "§7Çekim seti kapalı (ayarlar.js CEKIM_ACIK).";
  const k = (kelimeler || []).filter((x) => x !== "");
  const alt = k[0];
  /* Metin tasiyan komutlar (yazi, soyle, anlat, isim) HAM kelimeleri
     kullaniyor: sohbetten gelen kelimeler sadelestirilmis (Turkce harf
     ve buyuk harf yok). ham = "cekim"den sonraki ham metin. */
  const hamK = (ham !== undefined && ham !== "") ? String(ham).split(/\s+/).filter((x) => x !== "") : k;
  const metinden = (i) => hamK.slice(i).join(" ");
  const boyut = oyuncu.dimension;
  const aktorZorunlu = (ad) => {
    const v = aktorBul(boyut, ad);
    return v ? v : undefined;
  };
  const yok = (ad) => "§cAktör yok: §f" + (ad || "?") + " §7(cekim liste)";

  switch (alt) {
    case undefined: case "yardim": case "komut":
      return YARDIM_METNI;

    case "aktor":
      return aktorKur(oyuncu, k[1], k[2]);

    case "skin": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      const n = skinBul(k[2]);
      if (n < 0) return "§cBöyle bir skin yok: §f" + k[2];
      try { v.setProperty("pa:skin", n); } catch (e) { hataYaz("cekim.skin", e); return "§cSkin değişmedi."; }
      return "§aSkin: §f" + AKTOR_SKINLER[n].ad;
    }

    case "skinler":
      return "§eSkinler: §f" + AKTOR_SKINLER.map((s, i) => i + "=" + s.ad).join(" §7·§f ");

    case "liste": {
      const adlar = aktorleri(boyut).map(aktorAdi).filter((x) => x);
      return adlar.length ? "§eAktörler: §f" + adlar.join(", ") : "§7Hiç aktör yok. §fcekim aktor <ad>";
    }

    case "sil": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      eylemler.delete(v.id); seriler.delete(v.id);
      try { v.remove(); } catch (e) { hataYaz("cekim.sil", e); }
      return "§aSilindi: §f" + k[1];
    }

    case "temizle": {
      let n = 0;
      for (const v of aktorleri(boyut)) {
        eylemler.delete(v.id); seriler.delete(v.id);
        try { v.remove(); n++; } catch (e) { hataYaz("cekim.temizle", e); }
      }
      return "§a" + n + " aktör silindi.";
    }

    case "esya": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      return esyaVer(oyuncu, v, k[2]);
    }

    case "bak": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      const h = hedefBul(oyuncu, k[2]);
      if (!h) return yok(k[2]);
      yuzunuCevir(v, h.location);
      return "§a" + k[1] + " → " + k[2];
    }

    case "git": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      if (k[2] === "ileri") {
        const blok = Number(k[3]);
        if (!(blok > 0)) return "§cKaç blok? §fcekim git <ad> ileri <blok>";
        const y = bakisYonu(v), l = v.location;
        yuruBaslat(v, { nokta: { x: l.x + y.x * blok, y: l.y, z: l.z + y.z * blok } }, k[4] === "kos");
        return "§a" + k[1] + " " + blok + " blok ileri";
      }
      const h = hedefBul(oyuncu, k[2]);
      if (!h) return yok(k[2]);
      yuruBaslat(v, h, k[3] === "kos");
      return "§a" + k[1] + " → " + k[2];
    }

    case "oyna": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      if (!k[2]) return "§cAnimasyon adı: §fcekim animler";
      const tam = k[2].startsWith("animation.") ? k[2] : animBul(k[2]);
      if (!tam) return "§cBöyle bir animasyon yok: §f" + k[2] + " §7(cekim animler)";
      try { v.playAnimation(tam); } catch (e) { hataYaz("cekim.oyna", e); return "§cOynatılamadı."; }
      return "§a" + tam;
    }

    case "animler": {
      if (k[1] && WOM_KILIC_SETLER[k[1]]) {
        return "§e" + k[1] + ": §f" + WOM_KILIC_SETLER[k[1]].saldirilar.map((s) => s.ad).join(", ");
      }
      return "§eSetler: §f" + Object.keys(WOM_KILIC_SETLER).join(", ") +
             " §7(cekim animler <set>) · başka animasyon için tam adı yaz: animation.x.y";
    }

    case "vur": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      const h = hedefBul(oyuncu, k[2]);
      if (!h) return yok(k[2]);
      if (VURUS_TURLERI.includes(k[3])) return vurBaslat(v, h, elSeti(v), k[3]);
      return vurBaslat(v, h, k[3] || elSeti(v), VURUS_TURLERI.includes(k[4]) ? k[4] : "oto");
    }

    case "savun": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      const sure = Number(k[2]) > 0 ? Math.round(Number(k[2])) : CEKIM_SAVUN_SURE;
      savunBaslat(v, sure);
      return "§a" + k[1] + " savunmada (" + (sure / 20).toFixed(1) + " sn)";
    }

    case "kacin": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      const yon = KACIS_YONLERI.includes(k[2]) ? k[2] : "geri";
      const t = k[3] ? hedefBul(oyuncu, k[3]) : undefined;
      kacinBaslat(v, yon, t ? t.location : undefined);
      return "§a" + k[1] + " kaçtı: " + yon;
    }

    case "dovus": {
      if (k[1] === "dur" || k[1] === "bitir") {
        const n = dovusler.size;
        dovusler.clear(); savunanlar.clear();
        return "§a" + n + " dövüş durduruldu.";
      }
      const a = aktorZorunlu(k[1]);
      if (!a) return yok(k[1]);
      const b = aktorZorunlu(k[2]);
      if (!b) return yok(k[2]);
      if (a.id === b.id) return "§cBir aktör kendisiyle dövüşemez.";
      const sn = Number(k[3]) > 0 ? Number(k[3]) : 15;
      const tohum = Number.isFinite(Number(k[4])) && k[4] !== undefined ? Number(k[4]) : 1;
      dovusBaslat(a, b, sn, tohum);
      return "§aDövüş: §f" + k[1] + " × " + k[2] + " §7(" + Math.min(sn, CEKIM_DOVUS_TAVAN) +
             " sn, tohum " + tohum + " — aynı tohum aynı dövüş)";
    }

    case "soyle": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      const metin = metinden(2);
      if (!metin) return "§cNe söylesin? §fcekim soyle <ad> <söz>";
      altyaziGoster(oyuncu, "§e" + gorunenAd(v, k[1]) + "§7: §f" + metin);
      konustur(v, metin);
      return undefined;
    }

    case "anlat": {
      const metin = metinden(1);
      if (!metin) return "§cMetin yaz: §fcekim anlat <metin>";
      altyaziGoster(oyuncu, "§7§o" + metin);
      return undefined;
    }

    case "isim": {
      const v = aktorZorunlu(k[1]);
      if (!v) return yok(k[1]);
      const isim = metinden(2);
      if (!isim) return "§cGörünen ad: §fcekim isim <ad> <görünen ad>";
      isimler.set(v.id, isim);
      try { v.setDynamicProperty("cekim:isim", isim); } catch (e) { /* bellekte kalsin */ }
      return "§aAltyazıda: §f" + isim;
    }

    case "nokta":
      return noktaKomutu(oyuncu, k[1]);

    case "kamera": {
      if (k[1] === "birak" || k[1] === "kapat") { cekimBirak(oyuncu); return "§aKamera bırakıldı."; }
      if (k[1] === "yol") return yolKur(oyuncu, Number(k[2]) > 0 ? Math.round(Number(k[2])) : undefined);
      const a = hedefBul(oyuncu, k[2]);
      if (!a) return yok(k[2]);
      let b, sure;
      if (k[3] !== undefined && Number.isFinite(Number(k[3]))) sure = Number(k[3]);
      else if (k[3] !== undefined) {
        b = hedefBul(oyuncu, k[3]);
        if (!b) return yok(k[3]);
        if (k[4] !== undefined && Number.isFinite(Number(k[4]))) sure = Number(k[4]);
      }
      return kameraKur(oyuncu, k[1], a, b, sure);
    }

    case "hud":
      if (k[1] === "ac") { komut(oyuncu, "hud @s reset"); return "§aHUD açık."; }
      komut(oyuncu, "hud @s hide all");
      return sahnede ? undefined : "§aHUD gizlendi §7(cekim hud ac)";

    case "yazi": {
      const metin = metinden(1);
      komut(oyuncu, "title @s times 5 40 10");
      komut(oyuncu, "title @s title " + metin);
      return undefined;
    }

    case "sahne":
      return sahneBaslat(oyuncu, k[1]);

    case "sahneler":
      return "§eSahneler: §f" + Object.keys(CEKIM_SAHNELER).join(", ");

    case "dur": case "birak":
      cekimBirak(oyuncu);
      return sahnede ? undefined : "§aÇekim bitti: kamera, HUD ve görünürlük geri alındı.";

    default:
      return "§cBilinmeyen çekim komutu: §f" + alt + "\n" + YARDIM_METNI;
  }
}

/* "ruine.ruine_auto_1" ya da yalniz "ruine_auto_1" */
export function animBul(ad) {
  const [set, isim] = ad.indexOf(".") >= 0 ? ad.split(".") : [undefined, ad];
  for (const [sAd, s] of Object.entries(WOM_KILIC_SETLER)) {
    if (set && sAd !== set) continue;
    const x = s.saldirilar.find((v) => v.ad === isim);
    if (x) return x.anim;
  }
  return undefined;
}

/* ---------------- tick + kurulum ---------------- */

export function cekimTick() {
  if (!CEKIM_ACIK) return;
  const simdi = system.currentTick;
  for (const [id, e] of eylemler) {
    try {
      if (!gecerliMi(e.v)) { eylemler.delete(id); continue; }
      const bitti = e.tur === "vur" ? vurTick(e, simdi)
                  : e.tur === "kacin" ? kacinTick(e) : yuruTick(e);
      if (bitti || simdi >= (e.bitis || Infinity)) eylemler.delete(id);
    } catch (hata) { hataYaz("cekim.eylem", hata); eylemler.delete(id); }
  }
  for (const [anahtar, d] of dovusler) {
    try { dovusTick(anahtar, d, simdi); }
    catch (hata) { hataYaz("cekim.dovus", hata); dovusler.delete(anahtar); }
  }
  for (const k of altyazilar.values()) altyaziTick(k, simdi);
  for (const [id, bitis] of savunanlar) if (simdi > bitis) savunanlar.delete(id);
  for (const [id, k] of kameralar) {
    const oyuncu = cekimdekiler.get(id);
    if (!oyuncu || !gecerliMi(oyuncu)) { kameralar.delete(id); continue; }
    try { if (kameraTick(oyuncu, k, simdi)) cekimBirak(oyuncu); }
    catch (hata) { hataYaz("cekim.kamera", hata); cekimBirak(oyuncu); }
  }
  for (const [id, sh] of sahneler) {
    const oyuncu = cekimdekiler.get(id);
    if (!oyuncu || !gecerliMi(oyuncu)) { sahneler.delete(id); continue; }
    try { sahneTick(oyuncu, sh, simdi); }
    catch (hata) { hataYaz("cekim.sahne", hata); cekimBirak(oyuncu); }
  }
}

/* Oyuncu cikinca: durumu dusur. Kamera istemci tarafinda
   oturumla birlikte bitiyor; geri yuklenecek bir sey yok. */
export function cekimUnut(oyuncuId) {
  kameralar.delete(oyuncuId);
  altyazilar.delete(oyuncuId);
  yolNoktalari.delete(oyuncuId);
  sahneler.delete(oyuncuId);
  cekimdekiler.delete(oyuncuId);
}

export function cekimDurum() {
  return { eylem: eylemler.size, kamera: kameralar.size, sahne: sahneler.size, cekimde: cekimdekiler.size,
           dovus: dovusler.size, savunan: savunanlar.size, altyazi: altyazilar.size };
}

export function cekimKur() {
  if (!CEKIM_ACIK) return false;
  /* Aktor olmez: vurulunca kirmizi yanip sonsun, geri itilsin,
     sonra can dolsun. */
  return olayaAbone("entityHurt", (olay) => {
    try {
      const v = olay.hurtEntity;
      if (!v || v.typeId !== AKTOR_KIMLIK || !gecerliMi(v)) return;
      const c = v.getComponent("minecraft:health");
      if (c && typeof c.resetToMaxValue === "function") c.resetToMaxValue();
    } catch (e) { hataYaz("cekim.can", e); }
  });
}

/* Test icin: kombo defterini sifirla. */
export function cekimSifirla() {
  eylemler.clear(); seriler.clear(); kameralar.clear(); sahneler.clear(); cekimdekiler.clear();
  esyaSetleri.clear(); savunanlar.clear(); dovusler.clear(); altyazilar.clear();
  yolNoktalari.clear(); isimler.clear();
}

