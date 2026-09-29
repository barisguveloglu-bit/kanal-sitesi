import { system } from "@minecraft/server";
import { hataYaz, gecerliMi, olayaAbone, itmeUygula } from "../yardimcilar.js";
import { AKTOR_KIMLIK, AKTOR_SKINLER } from "./_aktor_skinleri.js";
import { WOM_KILIC_SETLER, WOM_KILIC_ESYA } from "./_wom_hareket.js";
import { bakisAcisi } from "./sinematik.js";
import {
  CEKIM_ACIK, CEKIM_YURU, CEKIM_KOS, CEKIM_VARIS, CEKIM_MENZIL,
  CEKIM_ITME, CEKIM_ITME_DIKEY, CEKIM_SERI_ARA, CEKIM_TAVAN,
  CEKIM_ADIM, CEKIM_YAKLASMA, CEKIM_SAHNELER
} from "../ayarlar.js";

/* ============================================================
   CEKIM SETI                                          v7.99.6

   Video icin oyun ici cekim (kullanicinin "A yolu"). Uc parca:

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

/* Siradaki oto vurusu sec (koşu/hava ayrimi yok: aktor sahnede). */
export function komboSec(set, d, simdi) {
  const s = WOM_KILIC_SETLER[set];
  if (!s) return undefined;
  const oto = s.saldirilar.filter((x) => x.tur === "oto");
  if (oto.length === 0) return undefined;
  if (!d || d.set !== set || simdi - d.son > CEKIM_SERI_ARA) return { vurus: oto[0], sira: 0 };
  const sira = (d.sira + 1) % oto.length;
  return { vurus: oto[sira], sira };
}

function vurBaslat(v, hedef, set) {
  const simdi = system.currentTick;
  const secim = komboSec(set, seriler.get(v.id), simdi);
  if (!secim) return "§cBöyle bir dövüş seti yok: §f" + set;
  const s = secim.vurus;
  seriler.set(v.id, { set, sira: secim.sira, son: simdi + Math.round(s.sure * 20) });
  yuzunuCevir(v, hedef.location);
  const yon = yatayYon(v.location, hedef.location);
  try {
    v.playAnimation(s.anim, { blendOutTime: s.gecis });
  } catch (e) { hataYaz("cekim.oyna", e); }
  eylemler.set(v.id, {
    tur: "vur", v, hedef, s, yon, bas: simdi, cikis: { ...v.location },
    vuruldu: s.fazlar.map(() => false)
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
    try {
      e.v.teleport({ x, y: e.v.location.y, z },
                   { facingLocation: { x: x + nx, y: e.v.location.y + 1.62, z: z + nz } });
    } catch (hata) { hataYaz("cekim.hamle", hata); }
  }
  /* Degme anlari. */
  s.fazlar.forEach((f, i) => {
    if (e.vuruldu[i] || t < Math.round(f.contact * 20)) return;
    e.vuruldu[i] = true;
    if (!gecerliMi(e.hedef)) return;
    const a = e.v.location, b = e.hedef.location;
    if (Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > CEKIM_MENZIL) return;
    try {
      e.hedef.applyDamage(Math.max(1, Math.round(f.hasar || 1)),
                          { cause: "entityAttack", damagingEntity: e.v });
    } catch (hata) { hataYaz("cekim.hasar", hata); }
    itmeUygula(e.hedef, e.yon.x, e.yon.z, CEKIM_ITME * (f.hasar || 1), CEKIM_ITME_DIKEY);
  });
  return t >= Math.round(s.sure * 20);
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
  if (!gecerliMi(oyuncu)) return;
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
  "§foyna <ad> <animasyon>§7 · §fanimler [set]§7 · §fvur <ad> <hedef> [set]",
  "§fkamera <açı> <ad> [ad2] [süre]§7 · açılar: " + KAMERA_KALIPLARI.join(", "),
  "§fhud kapat|ac§7 · §fyazi <metin>§7 · §fsahne <ad>§7 · §fsahneler§7 · §fdur§7 / §fbirak",
  "§8hedef: aktör adı ya da 'ben'. Rehber: addon/CEKIM_REHBERI.md"
].join("\n");

/* kelimeler: "cekim"den SONRAKI kelimeler. sahnede=true iken
   sahne satirindan geliyor ("birak" sahneyi de bitirir). */
export function cekimKomutu(oyuncu, kelimeler, sahnede = false, ham = undefined) {
  if (!CEKIM_ACIK) return "§7Çekim seti kapalı (ayarlar.js CEKIM_ACIK).";
  const k = (kelimeler || []).filter((x) => x !== "");
  const alt = k[0];
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
      return vurBaslat(v, h, k[3] || elSeti(v));
    }

    case "kamera": {
      if (k[1] === "birak" || k[1] === "kapat") { cekimBirak(oyuncu); return "§aKamera bırakıldı."; }
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
      const metin = (ham !== undefined && ham !== "") ? ham : k.slice(1).join(" ");
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
      const bitti = e.tur === "vur" ? vurTick(e, simdi) : yuruTick(e);
      if (bitti || simdi >= (e.bitis || Infinity)) eylemler.delete(id);
    } catch (hata) { hataYaz("cekim.eylem", hata); eylemler.delete(id); }
  }
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
  sahneler.delete(oyuncuId);
  cekimdekiler.delete(oyuncuId);
}

export function cekimDurum() {
  return { eylem: eylemler.size, kamera: kameralar.size, sahne: sahneler.size, cekimde: cekimdekiler.size };
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
  esyaSetleri.clear();
}

