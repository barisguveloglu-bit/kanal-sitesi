import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, parcacikAt,
  koniHedefleri, varlikKonumu, eldekiEsya
} from "../yardimcilar.js";
import { blokIste } from "../butce.js";
import {
  PB_ACIK, PB_SIRA_BAS,
  PB_TIRMAN_SURE, PB_TIRMAN_ARA, PB_TIRMAN_ITME, PB_TIRMAN_MESAFE,
  PB_HIS_SURE, PB_HIS_YARICAP, PB_HIS_TAVAN, PB_HIS_EFEKTLER,
  PB_AG_MENZIL, PB_AG_ACI, PB_AG_TAVAN, PB_AG_SURE, PB_AG_SEVIYE,
  PB_AG_PARCACIK,
  PB_KALKAN_MENZIL, PB_KALKAN_ACI, PB_KALKAN_HASAR, PB_KALKAN_SEKME,
  PB_KALKAN_PARCACIK,
  PB_CAGIR_YARICAP, PB_CAGIR_TAVAN,
  PB_YUMRUK_MENZIL, PB_YUMRUK_ACI, PB_YUMRUK_HASAR,
  PB_YUMRUK_HEDEF_YUKARI, PB_YUMRUK_KENDI_YUKARI,
  PB_DALIS_YARICAP, PB_DALIS_HASAR, PB_DALIS_ITME, PB_DALIS_PARCACIK,
  PB_NEFES_MENZIL, PB_NEFES_ACI, PB_NEFES_HASAR, PB_NEFES_SURE,
  PB_NEFES_PARCACIK,
  PB_GOK_YARICAP, PB_GOK_HASAR, PB_GOK_ITME, PB_GOK_SES,
  PB_MADDE_MENZIL, PB_MADDE_TABLO, PB_PISIR_TABLO
} from "../ayarlar.js";

/* POWERBORNE HEROES -- eksik onbir mekanik          v7.87

   REFERANS_POWERBORNE.md'de olculdu: modun mekaniklerinin
   cogu bizde zaten vardi, onbiri yoktu. Onbiri de burada.

   FiskHeroes zaten v5.2'de tamamen silinmisti; Marvel Project
   duruyor ve bu dosya ONUN YANINA ekleniyor -- kullanicinin
   istegi aynen boyleydi.

   ---- ORTAK ILKE ----
   Kaynak yetenekleri BASILI TUTULAN tuşla calisiyor ve cogu
   surekli. Bizde jest var: her sey anlik ya da SURELI.
   Kalici etkinin sure siniri bu depoda sart.               */

let _sira = PB_SIRA_BAS;
const yeni = (kimlik, ad, olustur) => yetenekKaydet({
  kimlik, ad, esyasiz: true, sira: _sira++, olustur
});

/* Hasar: secenekli bicim bazi surumlerde yok (beden_bol.js
   ayni yedegi tasiyor).                                    */
function vur(hedef, oyuncu, hasar) {
  try {
    hedef.applyDamage(hasar, { cause: "entityAttack", damagingEntity: oyuncu });
    return true;
  } catch (e) {
    try { hedef.applyDamage(hasar); return true; }
    catch (e2) { hataYaz("pb.hasar", e2); return false; }
  }
}

/* Itme: Bedrock 2.x tek nesne, 1.x dort sayi bekliyor.
   Ikisi de deneniyor -- surum farki yuzunden yetenegin
   yarisi calismasin.                                       */
function it(varlik, yatayX, yatayZ, dikey) {
  try {
    if (typeof varlik.applyKnockback !== "function") return false;
    try { varlik.applyKnockback({ x: yatayX, z: yatayZ }, dikey); }
    catch (e) { varlik.applyKnockback(yatayX, yatayZ, Math.hypot(yatayX, yatayZ) * 3, dikey); }
    return true;
  } catch (e) { hataYaz("pb.itme", e); return false; }
}

function sureliIs(ad, oyuncu, sure, ara, adim, bitirme) {
  const bas = system.currentTick;
  let sonraki = bas;
  return {
    ad, oyuncuId: oyuncu.id,
    calis() {
      const simdi = system.currentTick;
      if (simdi - bas >= sure) return true;
      if (simdi < sonraki) return false;
      sonraki = simdi + ara;
      try { adim(); } catch (e) { hataYaz(ad + ".adim", e); }
      return false;
    },
    bitir() { try { if (bitirme) bitirme(); } catch (e) { hataYaz(ad + ".bitir", e); } }
  };
}


/* ---------- 1. DUVARDA YURUME (wall_crawl) ---------- */
yeni("duvar_tirmanma", "Duvarda Yurume", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  const boyut = oyuncu.dimension;
  kollariIndir(oyuncu);
  actionbarYaz(oyuncu, "§8🕷 §fDuvarda yürüme §8· " +
                       (PB_TIRMAN_SURE / 20).toFixed(0) + " sn");
  let tirmandi = 0;
  return sureliIs("duvar_tirmanma", oyuncu, PB_TIRMAN_SURE, PB_TIRMAN_ARA, () => {
    if (!gecerliMi(oyuncu)) return;
    /* Onunde duvar VAR MI -- yoksa tirmanma olmuyor, yani
       bu bir ucus degil TIRMANMA. Kaynakta da oyle.       */
    let onunde;
    try {
      const yon = oyuncu.getViewDirection();
      const k = oyuncu.location;
      const b = boyut.getBlock({
        x: k.x + yon.x * PB_TIRMAN_MESAFE,
        y: k.y + 1,
        z: k.z + yon.z * PB_TIRMAN_MESAFE
      });
      onunde = b && !b.isAir;
    } catch (e) { return; }     // parca yuklu degil: tirmanma yok
    if (!onunde) return;
    it(oyuncu, 0, 0, PB_TIRMAN_ITME);
    tirmandi++;
    parcacikAt(boyut, "minecraft:basic_smoke_particle", oyuncu.location);
  }, () => {
    if (gecerliMi(oyuncu)) {
      actionbarYaz(oyuncu, "§7Duvarda yürüme bitti §8· " + tirmandi + " adım");
    }
  });
});


/* ---------- 2. ORUMCEK HISSI (spider_sense) ---------- */
yeni("orumcek_hissi", "Orumcek Hissi", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  for (const [ad, sure, amp] of PB_HIS_EFEKTLER) {
    try { oyuncu.addEffect(ad, sure, { amplifier: amp, showParticles: false }); }
    catch (e) { /* efekt yoksa otekiler versin */ }
  }
  /* Yakindakileri PARLAT: Bedrock'ta "tehlikeyi goster"in
     tek karsiligi glowing.                                */
  const liste = koniHedefleri(oyuncu, {
    menzil: PB_HIS_YARICAP, aci: -1, tavan: PB_HIS_TAVAN, oyuncuDahil: true
  });
  let n = 0;
  for (const h of liste) {
    try {
      if (!gecerliMi(h) || typeof h.addEffect !== "function") continue;
      h.addEffect("glowing", PB_HIS_SURE, { amplifier: 0, showParticles: false });
      n++;
    } catch (e) { /* tek hedef parlatilamadi */ }
  }
  actionbarYaz(oyuncu, "§e🕷 §fÖrümcek hissi §8· " + n + " tehlike işaretli");
  return undefined;
});


/* ---------- 3. AG ATMA (web_shoot) ---------- */
yeni("ag_at", "Ag At", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  const liste = koniHedefleri(oyuncu, {
    menzil: PB_AG_MENZIL, aci: PB_AG_ACI, tavan: PB_AG_TAVAN,
    oyuncuDahil: true, aciyaGore: true
  });
  let n = 0;
  for (const h of liste) {
    try {
      if (!gecerliMi(h) || typeof h.addEffect !== "function") continue;
      /* AG HASAR VERMIYOR -- kaynakta da oyle: is tutmak.  */
      h.addEffect("slowness", PB_AG_SURE,
                  { amplifier: PB_AG_SEVIYE, showParticles: true });
      h.addEffect("weakness", PB_AG_SURE,
                  { amplifier: 1, showParticles: false });
      parcacikAt(oyuncu.dimension, PB_AG_PARCACIK,
                 varlikKonumu(h) || h.location);
      n++;
    } catch (e) { hataYaz("pb.ag", e); }
  }
  actionbarYaz(oyuncu, n > 0 ? "§f🕸 " + n + " hedef ağa takıldı"
                             : "§7Önünde kimse yok");
  return undefined;
});


/* ---------- 4. KALKAN FIRLATMA (throw_shield) ---------- */
yeni("kalkan_firlat", "Kalkan Firlat", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  /* SIRALAMA MESAFEYE GORE, aciya gore DEGIL.
     Ilk yazilista `aciyaGore: true` vardi ve test yakaladi:
     kalkan en UZAKTAKINE once vuruyordu. Sebebi olculur --
     goz yuksekligi 1,6 blok oldugu icin tam onundeki uc
     hedeften en uzaktaki en KUCUK aciyi veriyor. Aci
     siralamasi nisan almak icin dogru; sekme icin dogru
     olan mesafe: firlatilan kalkan once yakina carpar.   */
  const liste = koniHedefleri(oyuncu, {
    menzil: PB_KALKAN_MENZIL, aci: PB_KALKAN_ACI,
    tavan: PB_KALKAN_SEKME, oyuncuDahil: true
  });
  let n = 0;
  for (const h of liste) {
    try {
      if (!gecerliMi(h)) continue;
      /* SEKME: her sicramada hasar azaliyor -- kaynakta da
         kalkan her sekmede guc kaybediyor.                */
      const hasar = Math.max(1, PB_KALKAN_HASAR - n * 2);
      if (!vur(h, oyuncu, hasar)) continue;
      parcacikAt(oyuncu.dimension, PB_KALKAN_PARCACIK,
                 varlikKonumu(h) || h.location);
      n++;
    } catch (e) { hataYaz("pb.kalkan", e); }
  }
  actionbarYaz(oyuncu, n > 0 ? "§b⊙ Kalkan §8· " + n + " sekme"
                             : "§7Kalkan boşa gitti");
  return undefined;
});


/* ---------- 5. CEKIC CAGIRMA (mjolnir_call) ---------- */
yeni("cekic_cagir", "Cekic Cagir", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  const boyut = oyuncu.dimension;
  let esyalar;
  try {
    esyalar = boyut.getEntities({
      location: oyuncu.location, maxDistance: PB_CAGIR_YARICAP,
      type: "minecraft:item"
    });
  } catch (e) {
    /* type suzgeci olmayan surumler icin yedek. */
    try {
      esyalar = boyut.getEntities({
        location: oyuncu.location, maxDistance: PB_CAGIR_YARICAP
      }).filter((v) => { try { return v.typeId === "minecraft:item"; }
                         catch (e2) { return false; } });
    } catch (e2) { hataYaz("pb.cagir", e2); return undefined; }
  }
  const m = oyuncu.location;
  let n = 0;
  for (const e of esyalar) {
    if (n >= PB_CAGIR_TAVAN) break;
    try {
      if (!gecerliMi(e)) continue;
      const k = e.location;
      const dx = m.x - k.x, dz = m.z - k.z;
      const boy = Math.hypot(dx, dz) || 1;
      /* ESYA SILINMIYOR, CEKILIYOR. Bu depoda hicbir yetenek
         oyuncunun esyasini goturmez -- goturmemek yetmez,
         yerdeki esyayi da yok etmemek gerekiyor.          */
      it(e, dx / boy, dz / boy, 0.25);
      n++;
    } catch (e2) { /* tek esya cekilemedi */ }
  }
  actionbarYaz(oyuncu, n > 0 ? "§6⚒ " + n + " eşya çağrıldı"
                             : "§7Çevrede eşya yok");
  return undefined;
});


/* ---------- 6. YUKARI YUMRUK (rising_uppercut) ---------- */
yeni("yukari_yumruk", "Yukari Yumruk", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  const liste = koniHedefleri(oyuncu, {
    menzil: PB_YUMRUK_MENZIL, aci: PB_YUMRUK_ACI, tavan: 3,
    oyuncuDahil: true, aciyaGore: true
  });
  let n = 0;
  for (const h of liste) {
    try {
      if (!gecerliMi(h)) continue;
      if (!vur(h, oyuncu, PB_YUMRUK_HASAR)) continue;
      it(h, 0, 0, PB_YUMRUK_HEDEF_YUKARI);
      n++;
    } catch (e) { hataYaz("pb.yumruk", e); }
  }
  /* Kendimiz de havaya kalkiyoruz -- kaynakta uppercut
     vuranı da kaldiriyor.                                 */
  if (n > 0) it(oyuncu, 0, 0, PB_YUMRUK_KENDI_YUKARI);
  actionbarYaz(oyuncu, n > 0 ? "§c↑ " + n + " hedef havaya"
                             : "§7Önünde kimse yok");
  return undefined;
});


/* ---------- 7. DALIS VURUSU (blazing/photonic strike) ---------- */
yeni("dalis_vurusu", "Dalis Vurusu", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  /* YERDEYKEN CALISMIYOR. Kaynakta da oyle ve bu, yetenegi
     "her zaman basilabilir bir alan hasari" olmaktan
     cikariyor -- havaya cikmak bir bedel.                 */
  let havada = false;
  try { havada = oyuncu.isFalling === true || oyuncu.isJumping === true; }
  catch (e) { havada = false; }
  if (!havada) {
    actionbarYaz(oyuncu, "§7Dalış vuruşu için HAVADA olmalısın");
    return undefined;
  }
  it(oyuncu, 0, 0, -PB_DALIS_ITME);
  const liste = koniHedefleri(oyuncu, {
    menzil: PB_DALIS_YARICAP, aci: -1, tavan: 12, oyuncuDahil: true
  });
  let n = 0;
  for (const h of liste) {
    try {
      if (!gecerliMi(h)) continue;
      if (!vur(h, oyuncu, PB_DALIS_HASAR)) continue;
      const k = h.location, m = oyuncu.location;
      const dx = k.x - m.x, dz = k.z - m.z;
      const boy = Math.hypot(dx, dz) || 1;
      it(h, dx / boy, dz / boy, 0.5);
      n++;
    } catch (e) { hataYaz("pb.dalis", e); }
  }
  parcacikAt(oyuncu.dimension, PB_DALIS_PARCACIK, oyuncu.location);
  actionbarYaz(oyuncu, "§6✹ Dalış vuruşu §8· " + n + " hedef");
  return undefined;
});


/* ---------- 8. DONDURAN NEFES (freeze_breath) ---------- */
yeni("donduran_nefes", "Donduran Nefes", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  const liste = koniHedefleri(oyuncu, {
    menzil: PB_NEFES_MENZIL, aci: PB_NEFES_ACI, tavan: 8, oyuncuDahil: true
  });
  let n = 0;
  for (const h of liste) {
    try {
      if (!gecerliMi(h)) continue;
      vur(h, oyuncu, PB_NEFES_HASAR);
      if (typeof h.addEffect === "function") {
        h.addEffect("slowness", PB_NEFES_SURE,
                    { amplifier: 3, showParticles: true });
        h.addEffect("mining_fatigue", PB_NEFES_SURE,
                    { amplifier: 2, showParticles: false });
      }
      parcacikAt(oyuncu.dimension, PB_NEFES_PARCACIK,
                 varlikKonumu(h) || h.location);
      n++;
    } catch (e) { hataYaz("pb.nefes", e); }
  }
  /* BLOK KOYULMUYOR. Kaynak hedefi buz blogunun icine
     hapsediyor; bir oyuncuyu blogun icine hapsetmek bu
     depoda yasak (kafes.js'te ayni karar yazili).         */
  actionbarYaz(oyuncu, n > 0 ? "§b❄ " + n + " hedef donduruldu"
                             : "§7Önünde kimse yok");
  return undefined;
});


/* ---------- 9. GOK GURLEMESI (thunderclap) ---------- */
yeni("gok_gurlemesi", "Gok Gurlemesi", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  const liste = koniHedefleri(oyuncu, {
    menzil: PB_GOK_YARICAP, aci: -1, tavan: 16, oyuncuDahil: true
  });
  const m = oyuncu.location;
  let n = 0;
  for (const h of liste) {
    try {
      if (!gecerliMi(h)) continue;
      vur(h, oyuncu, PB_GOK_HASAR);
      const k = h.location;
      const dx = k.x - m.x, dz = k.z - m.z;
      const boy = Math.hypot(dx, dz) || 1;
      /* ISI ITMEK: hasar dusuk, mesele savurmak.          */
      it(h, (dx / boy) * PB_GOK_ITME, (dz / boy) * PB_GOK_ITME, 0.6);
      n++;
    } catch (e) { hataYaz("pb.gok", e); }
  }
  try { oyuncu.dimension.playSound(PB_GOK_SES, m); } catch (e) { /* sessiz */ }
  actionbarYaz(oyuncu, "§7☁ Gök gürlemesi §8· " + n + " hedef savruldu");
  return undefined;
});


/* ---------- 10. MADDE DONUSTURME (molecular_shift) ---------- */
yeni("madde_donustur", "Madde Donustur", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  let blok;
  try {
    if (typeof oyuncu.getBlockFromViewDirection !== "function") {
      actionbarYaz(oyuncu, "§7Bakılan blok okunamıyor");
      return undefined;
    }
    const v = oyuncu.getBlockFromViewDirection({ maxDistance: PB_MADDE_MENZIL });
    blok = v && v.block;
  } catch (e) { hataYaz("pb.madde.bak", e); return undefined; }
  if (!blok) { actionbarYaz(oyuncu, "§7Bakılan blok yok"); return undefined; }

  let tip;
  try { tip = blok.typeId; } catch (e) { tip = undefined; }
  const hedef = tip && PB_MADDE_TABLO.get(tip);
  if (!hedef) {
    actionbarYaz(oyuncu, "§7Bu madde dönüşmüyor §8· " + (tip || "?"));
    return undefined;
  }
  if (blokIste(1) === 0) return undefined;    // butce
  try { blok.setType(hedef); }
  catch (e) { hataYaz("pb.madde.yaz", e); return undefined; }
  parcacikAt(oyuncu.dimension, "minecraft:totem_particle", blok.location);
  actionbarYaz(oyuncu, "§a⚛ " + tip.replace("minecraft:", "") + " §8→ §f" +
                       hedef.replace("minecraft:", ""));
  return undefined;
});


/* ---------- 11. ELDE PISIRME (cook_item) ---------- */
yeni("elde_pisir", "Elde Pisir", (oyuncu) => {
  if (!PB_ACIK) return undefined;
  kollariIndir(oyuncu);
  const tip = eldekiEsya(oyuncu);
  const hedef = tip && PB_PISIR_TABLO.get(tip);
  if (!hedef) {
    actionbarYaz(oyuncu, "§7Elindeki şey pişmiyor §8· " +
                         (tip ? tip.replace("minecraft:", "") : "boş"));
    return undefined;
  }
  try {
    const donanim = oyuncu.getComponent("minecraft:equippable");
    const eski = donanim && donanim.getEquipment("Mainhand");
    if (!eski) { actionbarYaz(oyuncu, "§7Elin boş"); return undefined; }
    /* ADET KORUNUYOR. Esya turu degisiyor, sayisi degil --
       bu depoda hicbir yetenek oyuncunun esyasini goturmez. */
    const adet = eski.amount || 1;
    const YeniEsya = eski.constructor;
    let taze;
    try { taze = new YeniEsya(hedef, adet); }
    catch (e) { taze = undefined; }
    if (!taze) { actionbarYaz(oyuncu, "§7Pişirilemedi"); return undefined; }
    donanim.setEquipment("Mainhand", taze);
    parcacikAt(oyuncu.dimension, "minecraft:basic_flame_particle",
               oyuncu.location);
    actionbarYaz(oyuncu, "§6🔥 " + adet + "x " + hedef.replace("minecraft:", ""));
  } catch (e) {
    hataYaz("pb.pisir", e);
    actionbarYaz(oyuncu, "§7Pişirilemedi");
  }
  return undefined;
});
