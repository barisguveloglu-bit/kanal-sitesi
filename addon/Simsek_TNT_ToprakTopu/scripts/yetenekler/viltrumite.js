import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { elindekiCekirdek } from "./zirh.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikAt,
  koniHedefleri, kilitliHedef, basKonumu, varlikKonumu,
  yukseklikAraligi, olayaAbone, bilgiYaz
} from "../yardimcilar.js";
import {
  VILTRUMITE_ACIK, VILT_MOD, VILT_TEMEL_HASAR, VILT_INDIRIM,
  VILT_ESIK, VILT_BLOK_DUSME, VILT_DIRENC, VILT_GERI_ORAN,
  VILT_YENILENME, VILT_PASIF_TARAMA, VILT_ZARARLI_EFEKTLER,
  VILTRUMITE_YETENEKLER, LAZER_HASAR_SEBEP
} from "../ayarlar.js";

/* ================================================================
   VILTRUMITE CORE  ->  TEMEL ZIRH                          v5.6

   Kullanici: "bu mod SADECE temel zirhla birlestirilecek, diger
   hicbir sekilde baska bir seyle degil... cunku ben temel zirhin
   zayif oldugunu dusunuyorum."

   Kaynak: viltrumitecore 1.8.1 (baranhan123). Butun sayilar
   ayarlar.js:VILTRUMITE_YETENEKLER icinde, her biri modun hangi
   cumlesinden/alanindan geldigiyle birlikte yazili. Burada
   SAYI YOK -- deponun kurali.

   ---- KAPI TEK YERDE ----
   viltrumiteVar(): elindeki cekirdek VILT_MOD mu? Yetenekler
   menuden de secilebildigi icin kapi her yetenegin KENDI
   icinde -- Marvel mekaniklerindeki kalibin aynisi. Boylece
   "Titan cekirdegiyle Sonik Yumruk" mumkun degil.

   ---- ITME BICIMI ----
   Oyuncularda applyImpulse ISLEMIYOR (v4.x'te olculdu,
   cekme.js'te yazili); applyKnockback calisiyor. Marvel
   mekanikleriyle ayni cagri.

   ---- NEDEN AYRI DOSYA ----
   zirh.js'in tek isi "elindeki cekirdegin EFEKTLERINI vermek".
   Viltrumite on tetiklenen yetenek + bir hasar kancasi
   getiriyor; oraya koymak o dosyanin tek isini bozardi.
   ================================================================ */

/* ---------------- ortak yardimcilar ---------------- */

/* Elinde Temel cekirdegi var mi? Butun yeteneklerin kapisi. */
export function viltrumiteVar(oyuncu) {
  if (!VILTRUMITE_ACIK) return false;
  try {
    return elindekiCekirdek(oyuncu) === VILT_MOD;
  } catch (e) {
    return false;
  }
}

/* Kapi + mesaj. Yetenekler bunu cagirip undefined donuyor. */
function kapi(oyuncu) {
  if (viltrumiteVar(oyuncu)) return true;
  actionbarYaz(oyuncu, "§7Bu güç sende yok §8(Temel çekirdeği gerek)");
  kollariIndir(oyuncu);
  return false;
}

function tablo(kimlik) {
  return VILTRUMITE_YETENEKLER.get(kimlik);
}

/* Derece -> kosinus. koniHedefleri kosinus esigi istiyor. */
function kos(derece) {
  return Math.cos((derece * Math.PI) / 180);
}

/* Modun her yerde kullandigi itme (marvel_mekanik ile ayni). */
function it(oyuncu, yon, carpan, dikeyCarpan) {
  const dx = yon.x * carpan;
  const dy = (dikeyCarpan === undefined ? yon.y * carpan : dikeyCarpan);
  const dz = yon.z * carpan;
  try {
    if (typeof oyuncu.applyKnockback === "function") {
      oyuncu.applyKnockback(dx, dz, Math.hypot(dx, dz), dy);
      return true;
    }
  } catch (e) { /* asagi dus */ }
  try {
    if (typeof oyuncu.applyImpulse === "function") {
      oyuncu.applyImpulse({ x: dx, y: dy, z: dz });
      return true;
    }
  } catch (e) { /* olmadi */ }
  return false;
}

function vur(hedef, hasar, vuran) {
  if (!(hasar > 0)) return;
  try {
    hedef.applyDamage(hasar, {
      cause: LAZER_HASAR_SEBEP, damagingEntity: vuran
    });
  } catch (e) {
    try { hedef.applyDamage(hasar); } catch (e2) { /* olmadi */ }
  }
}

/* Modun "launched like a meteor" firlatmasi. */
function firlat(hedef, yon, guc, dikey) {
  try {
    if (typeof hedef.applyKnockback === "function") {
      hedef.applyKnockback(yon.x * guc, yon.z * guc,
                           Math.hypot(yon.x * guc, yon.z * guc), dikey);
      return;
    }
  } catch (e) { /* asagi dus */ }
  try {
    if (typeof hedef.applyImpulse === "function") {
      hedef.applyImpulse({ x: yon.x * guc, y: dikey, z: yon.z * guc });
    }
  } catch (e) { /* olmadi */ }
}

/* Uçuyor mu? Sonik Yumruk ucarken %500'e cikiyor.
   isOnGround her surumde var; "ucus" onun tersi degil (ziplama
   da yerde degildir), o yuzden DUSME HIZI da bakiliyor: ucan
   oyuncu asagi dusmez.                                        */
function ucuyorMu(oyuncu) {
  try {
    if (oyuncu.isOnGround === true) return false;
    const h = oyuncu.getVelocity ? oyuncu.getVelocity() : undefined;
    if (!h || typeof h.y !== "number") return false;
    return h.y > -0.1;
  } catch (e) {
    return false;
  }
}

/* Konideki blogu kir. Butce ISTENIYOR -- toprak topundaki
   kural: butce dolduysa hic kirmiyoruz, yarim is yapmiyoruz.  */
function koniKir(oyuncu, menzil, dusmeYuzde) {
  let boyut, merkez, yon, sinir;
  try {
    boyut = oyuncu.dimension;
    merkez = basKonumu(oyuncu);
    yon = oyuncu.getViewDirection();
    sinir = yukseklikAraligi(boyut);
  } catch (e) {
    return 0;
  }
  const noktalar = [];
  for (let d = 1; d <= menzil; d++) {
    for (let yy = -1; yy <= 1; yy++) {
      for (let xx = -1; xx <= 1; xx++) {
        noktalar.push({
          x: Math.floor(merkez.x + yon.x * d + xx),
          y: Math.floor(merkez.y + yon.y * d + yy),
          z: Math.floor(merkez.z + yon.z * d)
        });
      }
    }
  }
  if (!blokIste(noktalar.length)) return 0;
  let kirilan = 0;
  for (const n of noktalar) {
    if (n.y < sinir.min || n.y > sinir.max) continue;
    try {
      const b = boyut.getBlock(n);
      if (!b || b.isAir || b.isLiquid) continue;
      /* Kirilmaz blok: bedrock ve benzeri. setType patlamiyor
         ama sonuc alinmiyor; yine de denemek zararsiz.        */
      if (Math.random() * 100 < dusmeYuzde) {
        /* "block drop chance %40" -- dusen blok esya olsun.   */
        try { boyut.runCommand(
          "setblock " + n.x + " " + n.y + " " + n.z + " air destroy"); }
        catch (e) { b.setType("minecraft:air"); }
      } else {
        b.setType("minecraft:air");
      }
      kirilan++;
    } catch (e) { /* bu blok olmadi, digerleri devam */ }
  }
  return kirilan;
}


/* ================================================================
   1. SONIK YUMRUK  (viltrumite:punch)
   "200% of base attack damage; while flying up to 500%."
   ================================================================ */
const yumrukSarj = new Map();

yetenekKaydet({
  kimlik: "vilt_yumruk",
  ad: tablo("vilt_yumruk").ad,
  esyasiz: true,
  sira: tablo("vilt_yumruk").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_yumruk");
    const simdi = system.currentTick;
    if (simdi < (yumrukSarj.get(oyuncu.id) || 0)) {
      actionbarYaz(oyuncu, "§7Sonik Yumruk hazır değil");
      kollariIndir(oyuncu);
      return undefined;
    }
    yumrukSarj.set(oyuncu.id, simdi + t.bekleme);

    const ucta = ucuyorMu(oyuncu);
    const hasar = VILT_TEMEL_HASAR * (ucta ? t.ucusCarpan : t.carpan);
    let yon;
    try { yon = oyuncu.getViewDirection(); }
    catch (e) { kollariIndir(oyuncu); return undefined; }

    const hedefler = koniHedefleri(oyuncu, {
      menzil: t.menzil, aci: kos(t.koniAci)
    });
    for (const h of hedefler) {
      vur(h, hasar, oyuncu);
      firlat(h, yon, t.firlatma, t.dikey);
    }
    const kirilan = koniKir(oyuncu, t.kirmaMenzil, VILT_BLOK_DUSME);
    try {
      parcacikAt(oyuncu.dimension, t.parcacik,
                 { x: oyuncu.location.x + yon.x * 2,
                   y: oyuncu.location.y + 1 + yon.y * 2,
                   z: oyuncu.location.z + yon.z * 2 });
    } catch (e) { /* parcacik onemli degil */ }
    actionbarYaz(oyuncu, "§b✊ Sonik Yumruk §8· §f" +
      Math.round(hasar) + " hasar" + (ucta ? " §e(uçarken)" : "") +
      " §8· " + hedefler.length + " hedef · " + kirilan + " blok");
    kollariIndir(oyuncu);
    return undefined;
  }
});


/* ================================================================
   2. OLUMCUL DARBE  (viltrumite:chop)
   "175% instantly... bleeding for 4 seconds... an additional
    175% over time which equals to 43.75% every second."
   ================================================================ */
/* varlikId -> {kalan, hasar, vuran} */
const kanayanlar = new Map();

export function kanamaUnut(varlikId) {
  if (varlikId === undefined) kanayanlar.clear();
  else kanayanlar.delete(varlikId);
}

/* Merkezi tick'ten cagriliyor -- defter bosken HIC donmuyor
   (kalp defterindeki kural).                                  */
export function kanamaTara() {
  if (!VILTRUMITE_ACIK || kanayanlar.size === 0) return;
  const t = tablo("vilt_darbe");
  const simdi = system.currentTick;
  for (const [kimlik, d] of kanayanlar) {
    if (simdi < d.sonraki) continue;
    if (!gecerliMi(d.varlik)) { kanayanlar.delete(kimlik); continue; }
    d.sonraki = simdi + t.kanamaAra;
    d.kalan -= t.kanamaAra;
    vur(d.varlik, d.tik, d.vuran);
    try {
      parcacikAt(d.varlik.dimension, t.parcacik, varlikKonumu(d.varlik));
    } catch (e) { /* parcacik onemli degil */ }
    if (d.kalan <= 0) kanayanlar.delete(kimlik);
  }
}

yetenekKaydet({
  kimlik: "vilt_darbe",
  ad: tablo("vilt_darbe").ad,
  esyasiz: true,
  sira: tablo("vilt_darbe").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_darbe");
    const anlik = VILT_TEMEL_HASAR * t.carpan;
    /* Kanama TOPLAMI da %175; kac tike bolunecegi
       kanamaSure/kanamaAra.                                   */
    const tikSayisi = Math.max(1, Math.round(t.kanamaSure / t.kanamaAra));
    const tik = (VILT_TEMEL_HASAR * t.kanamaCarpan) / tikSayisi;

    const hedefler = koniHedefleri(oyuncu, {
      menzil: t.menzil, aci: kos(t.koniAci)
    });
    const simdi = system.currentTick;
    for (const h of hedefler) {
      vur(h, anlik, oyuncu);
      kanayanlar.set(h.id, {
        varlik: h, vuran: oyuncu, tik,
        kalan: t.kanamaSure, sonraki: simdi + t.kanamaAra
      });
    }
    actionbarYaz(oyuncu, "§c🗡 Ölümcül Darbe §8· §f" +
      Math.round(anlik) + " hasar §8· " + hedefler.length +
      " hedef kanıyor");
    kollariIndir(oyuncu);
    return undefined;
  }
});


/* ================================================================
   3. GOK GURULTUSU  (viltrumite:thunderclap)
   "massive cone-shaped shockwave... launches targets high into
    the air." Hasar sayisi kaynakta YOK -- verilmiyor.
   ================================================================ */
yetenekKaydet({
  kimlik: "vilt_gok_gurultusu",
  ad: tablo("vilt_gok_gurultusu").ad,
  esyasiz: true,
  sira: tablo("vilt_gok_gurultusu").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_gok_gurultusu");
    let yon;
    try { yon = oyuncu.getViewDirection(); }
    catch (e) { kollariIndir(oyuncu); return undefined; }

    const hedefler = koniHedefleri(oyuncu, {
      menzil: t.menzil, aci: kos(t.koniAci)
    });
    for (const h of hedefler) {
      if (t.hasar > 0) vur(h, t.hasar, oyuncu);
      firlat(h, yon, t.firlatma, t.dikey);
    }
    try {
      const k = oyuncu.location;
      for (const d of [2, 5, 8]) {
        parcacikAt(oyuncu.dimension, t.parcacik,
                   { x: k.x + yon.x * d, y: k.y + 1, z: k.z + yon.z * d });
      }
    } catch (e) { /* parcacik onemli degil */ }
    actionbarYaz(oyuncu, "§e☁ Gök Gürültüsü §8· " +
                 hedefler.length + " hedef havada");
    kollariIndir(oyuncu);
    return undefined;
  }
});


/* ================================================================
   4. YAYLIM ATESI  (viltrumite:barrage)
   "Hold to unleash a relentless series of rapid punches."
   Cooldown 4s, Duration 4s (Max). Bizde SURELI is: basip
   birakiyorsun, sure boyunca vuruyor.
   ================================================================ */
const yaylimSarj = new Map();

yetenekKaydet({
  kimlik: "vilt_yaylim",
  ad: tablo("vilt_yaylim").ad,
  esyasiz: true,
  sira: tablo("vilt_yaylim").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_yaylim");
    const simdi = system.currentTick;
    if (simdi < (yaylimSarj.get(oyuncu.id) || 0)) {
      actionbarYaz(oyuncu, "§7Yaylım Ateşi hazır değil");
      kollariIndir(oyuncu);
      return undefined;
    }
    yaylimSarj.set(oyuncu.id, simdi + t.bekleme + t.sure);
    kollariIndir(oyuncu);

    const hasar = VILT_TEMEL_HASAR * t.carpan;
    let kalan = t.sure;
    let sayac = 0;
    return {
      ad: t.ad,
      oyuncuId: oyuncu.id,
      calis() {
        kalan--;
        if (kalan <= 0 || !gecerliMi(oyuncu)) return true;
        if (kalan % t.vurusAra !== 0) return false;
        const hedefler = koniHedefleri(oyuncu, {
          menzil: t.menzil, aci: kos(t.koniAci)
        });
        for (const h of hedefler) { vur(h, hasar, oyuncu); sayac++; }
        try {
          const yon = oyuncu.getViewDirection();
          const k = oyuncu.location;
          parcacikAt(oyuncu.dimension, t.parcacik,
                     { x: k.x + yon.x * 2, y: k.y + 1.2, z: k.z + yon.z * 2 });
        } catch (e) { /* parcacik onemli degil */ }
        return false;
      },
      bitir() {
        try {
          actionbarYaz(oyuncu, "§6☄ Yaylım Ateşi §8· " + sayac + " vuruş");
        } catch (e) { /* mesaj onemli degil */ }
      }
    };
  }
});


/* ================================================================
   5. ATILIM  (viltrumite:dash)
   "Dash forward at extreme speed and smash through blocks and
    enemies in your path." Cooldown 1s.
   ================================================================ */
const atilimSarj = new Map();

yetenekKaydet({
  kimlik: "vilt_atilim",
  ad: tablo("vilt_atilim").ad,
  esyasiz: true,
  sira: tablo("vilt_atilim").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_atilim");
    const simdi = system.currentTick;
    if (simdi < (atilimSarj.get(oyuncu.id) || 0)) {
      actionbarYaz(oyuncu, "§7Atılım hazır değil");
      kollariIndir(oyuncu);
      return undefined;
    }
    atilimSarj.set(oyuncu.id, simdi + t.bekleme);

    let yon;
    try { yon = oyuncu.getViewDirection(); }
    catch (e) { kollariIndir(oyuncu); return undefined; }

    it(oyuncu, yon, t.guc, t.dikey);
    const hedefler = koniHedefleri(oyuncu, {
      menzil: t.menzil, aci: kos(60)
    });
    const hasar = VILT_TEMEL_HASAR * t.carpan;
    for (const h of hedefler) {
      vur(h, hasar, oyuncu);
      firlat(h, yon, t.guc, t.dikey);
    }
    const kirilan = koniKir(oyuncu, t.kirmaMenzil, VILT_BLOK_DUSME);
    try {
      parcacikAt(oyuncu.dimension, t.parcacik, basKonumu(oyuncu));
    } catch (e) { /* parcacik onemli degil */ }
    actionbarYaz(oyuncu, "§9💨 Atılım §8· " + hedefler.length +
                 " hedef · " + kirilan + " blok");
    kollariIndir(oyuncu);
    return undefined;
  }
});


/* ================================================================
   6. SAVUNMA DURUSU  (viltrumite:block)
   "Absorbs 70% of all damage taken from the direction you are
    facing." Cooldown 3s, Duration 2s (Max).

   YON SARTI ALINMADI: entityHurt olayi hasarin GELDIGI YONU
   vermiyor (damageSource'ta konum yok). Onden gelen hasari
   ayirt edemedigimiz icin sart uygulanmiyor -- yani bizde
   savunma her yonden koruyor. Bu bir SAPMA, ozette de boyle
   yaziyor.
   ================================================================ */
/* oyuncuId -> savunmanin bittigi tick */
const savunmada = new Map();
const savunmaSarj = new Map();

export function savunmaUnut(oyuncuId) {
  if (oyuncuId === undefined) { savunmada.clear(); savunmaSarj.clear(); return; }
  savunmada.delete(oyuncuId);
  savunmaSarj.delete(oyuncuId);
}

export function savunmadaMi(oyuncuId) {
  const bitis = savunmada.get(oyuncuId);
  return bitis !== undefined && system.currentTick < bitis;
}

yetenekKaydet({
  kimlik: "vilt_savunma",
  ad: tablo("vilt_savunma").ad,
  esyasiz: true,
  sira: tablo("vilt_savunma").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_savunma");
    const simdi = system.currentTick;
    if (simdi < (savunmaSarj.get(oyuncu.id) || 0)) {
      actionbarYaz(oyuncu, "§7Savunma hazır değil");
      kollariIndir(oyuncu);
      return undefined;
    }
    savunmada.set(oyuncu.id, simdi + t.sure);
    savunmaSarj.set(oyuncu.id, simdi + t.sure + t.bekleme);
    actionbarYaz(oyuncu, "§a⛨ Savunma Duruşu §8· %" +
                 Math.round(t.emme * 100) + " emme");
    kollariIndir(oyuncu);
    return undefined;
  }
});


/* ================================================================
   7. KAVRA VE TASI  (viltrumite:grab)
   "Grab a living entity by the throat and carry them through
    the air. Toggle again to release."
   ================================================================ */
/* oyuncuId -> kavranan varlik */
const kavrananlar = new Map();

export function kavramaUnut(oyuncuId) {
  if (oyuncuId === undefined) kavrananlar.clear();
  else kavrananlar.delete(oyuncuId);
}

yetenekKaydet({
  kimlik: "vilt_kavra",
  ad: tablo("vilt_kavra").ad,
  esyasiz: true,
  sira: tablo("vilt_kavra").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_kavra");

    /* Zaten kavramissa BIRAK -- kaynakta da acma/kapama.     */
    if (kavrananlar.has(oyuncu.id)) {
      kavrananlar.delete(oyuncu.id);
      actionbarYaz(oyuncu, "§7✋ Bıraktın");
      kollariIndir(oyuncu);
      return undefined;
    }
    const hedef = kilitliHedef(oyuncu, { menzil: t.menzil, aci: kos(50) });
    if (!hedef) {
      actionbarYaz(oyuncu, "§7Önünde kavranacak bir şey yok");
      kollariIndir(oyuncu);
      return undefined;
    }
    kavrananlar.set(oyuncu.id, hedef);
    kollariIndir(oyuncu);
    actionbarYaz(oyuncu, "§e✊ Kavradın §8· tekrar bas, bırak");

    let kalan = t.sure;
    return {
      ad: t.ad,
      oyuncuId: oyuncu.id,
      calis() {
        kalan--;
        /* Yetenek yeniden basildiginda defterden silindi;
           is de o zaman bitiyor -- tek dogruluk kaynagi
           defter.                                            */
        if (kalan <= 0 || kavrananlar.get(oyuncu.id) !== hedef) return true;
        if (!gecerliMi(oyuncu) || !gecerliMi(hedef)) return true;
        try {
          const yon = oyuncu.getViewDirection();
          const k = oyuncu.location;
          hedef.teleport({
            x: k.x + yon.x * t.tutusMesafe,
            y: k.y + 0.6,
            z: k.z + yon.z * t.tutusMesafe
          }, { facingLocation: k });
        } catch (e) { return true; }
        return false;
      },
      bitir() { kavrananlar.delete(oyuncu.id); }
    };
  }
});


/* ================================================================
   8. HEDEF KILIDI  (viltrumite:lock)
   "Lock your focus onto a living target and track their every
    move... disables if the target moves too far away."

   Bedrock'ta oyuncunun kamerasini dondurmenin tek yolu
   teleport(konum, {facingLocation}) -- Marvel modu da ayni
   cagriyi kullaniyor (ghost_rider_bike.js). Konum
   DEGISTIRILMIYOR, yalniz bakis yonu.
   ================================================================ */
const kilitler = new Map();

export function kilitUnut(oyuncuId) {
  if (oyuncuId === undefined) kilitler.clear();
  else kilitler.delete(oyuncuId);
}

yetenekKaydet({
  kimlik: "vilt_kilit",
  ad: tablo("vilt_kilit").ad,
  esyasiz: true,
  sira: tablo("vilt_kilit").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_kilit");
    if (kilitler.has(oyuncu.id)) {
      kilitler.delete(oyuncu.id);
      actionbarYaz(oyuncu, "§7🎯 Kilit çözüldü");
      kollariIndir(oyuncu);
      return undefined;
    }
    /* Kavradigin seye kilitlenilmiyor -- kaynagin kurali. */
    const kavranan = kavrananlar.get(oyuncu.id);
    const hedef = kilitliHedef(oyuncu, { menzil: t.menzil, aci: kos(45) });
    if (!hedef || (kavranan && hedef.id === kavranan.id)) {
      actionbarYaz(oyuncu, "§7Kilitlenecek hedef yok");
      kollariIndir(oyuncu);
      return undefined;
    }
    kilitler.set(oyuncu.id, hedef);
    kollariIndir(oyuncu);
    actionbarYaz(oyuncu, "§c🎯 Kilit §8· tekrar bas, çöz");

    let kalan = t.sure;
    return {
      ad: t.ad,
      oyuncuId: oyuncu.id,
      calis() {
        kalan--;
        if (kalan <= 0 || kilitler.get(oyuncu.id) !== hedef) return true;
        if (!gecerliMi(oyuncu) || !gecerliMi(hedef)) return true;
        if (kalan % t.tarama !== 0) return false;
        let k, h;
        try { k = oyuncu.location; h = varlikKonumu(hedef); }
        catch (e) { return true; }
        if (!h) return true;
        const uz = Math.hypot(h.x - k.x, h.y - k.y, h.z - k.z);
        if (uz > t.kopmaMenzil) {
          actionbarYaz(oyuncu, "§7🎯 Hedef uzaklaştı");
          return true;
        }
        try {
          oyuncu.teleport(k, {
            facingLocation: { x: h.x, y: h.y + 1, z: h.z }
          });
        } catch (e) { return true; }
        return false;
      },
      bitir() { kilitler.delete(oyuncu.id); }
    };
  }
});


/* ================================================================
   9. SUPER HIZ  (viltrumite:speed)
   "Gain immense movement speed while on the ground. Cannot be
    activated or used while flying."
   ================================================================ */
yetenekKaydet({
  kimlik: "vilt_hiz",
  ad: tablo("vilt_hiz").ad,
  esyasiz: true,
  sira: tablo("vilt_hiz").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_hiz");
    /* Kaynagin sarti: ucarken ACILAMAZ.                      */
    if (ucuyorMu(oyuncu)) {
      actionbarYaz(oyuncu, "§7Uçarken Süper Hız açılmıyor");
      kollariIndir(oyuncu);
      return undefined;
    }
    try {
      oyuncu.addEffect("speed", t.sure, {
        amplifier: t.seviye, showParticles: false
      });
    } catch (e) { /* efekt yoksa gec */ }
    actionbarYaz(oyuncu, "§b⚡ Süper Hız §8· " +
                 Math.round(t.sure / 20) + " sn");
    kollariIndir(oyuncu);
    return undefined;
  }
});


/* ================================================================
   10. HIZLI KALKIS  (viltrumite:fast_takeoff)
   "Press Sneak and Double Jump to instantly launch yourself
    high into the sky."
   Jest yerine yetenek olarak: bu depoda cift ziplama okunmuyor.
   ================================================================ */
yetenekKaydet({
  kimlik: "vilt_firlayis",
  ad: tablo("vilt_firlayis").ad,
  esyasiz: true,
  sira: tablo("vilt_firlayis").sira,

  olustur(oyuncu) {
    if (!kapi(oyuncu)) return undefined;
    const t = tablo("vilt_firlayis");
    it(oyuncu, { x: 0, y: 1, z: 0 }, 0, t.dikey);
    actionbarYaz(oyuncu, "§9🚀 Hızlı Kalkış");
    kollariIndir(oyuncu);
    return undefined;
  }
});


/* ================================================================
   PASIF TARAMA  (v5.7)

   Kullanici: "temel zirh halindeyken 2 tane niye sey var ya,
   cesitlilik dedigin... digerleri nerede."

   Haklyidi: v5.6'da yalniz yetenekler aktarilmisti, modun
   PASIFLERI atlanmisti. Alti pasifin dordu dogrudan efekte
   cevrildi (ayarlar.js:ZIRH_MODLAR["temel"]); ikisinin
   Bedrock'ta efekt karsiligi YOK ve burada yapiliyor:

     1. rejectDebuffs -- Bedrock script API'sinde "bu efekt
        zararli mi" sorusu yok, o yuzden liste ayarlar.js'te
        acikca yazili ve burada tek tek siliniyor.
     2. onTick heal -- kaynak her tick getHealFactor() kadar
        iyilestiriyor. Tarama her tick donmuyor (butce), o
        yuzden aradaki tick sayisiyla CARPILIYOR: ortalama hiz
        kaynakla ayni kaliyor. Isin lazerlerdeki "saniyelik
        hasar ayni kalsin" kuralinin aynisi.
   ================================================================ */
/* oyuncuId -> bir sonraki tarama tick'i */
const pasifSonraki = new Map();

export function pasifUnut(oyuncuId) {
  if (oyuncuId === undefined) pasifSonraki.clear();
  else pasifSonraki.delete(oyuncuId);
}

export function viltrumiteTara(oyuncular) {
  if (!VILTRUMITE_ACIK) return;
  const simdi = system.currentTick;
  for (const oyuncu of oyuncular) {
    const hazir = pasifSonraki.get(oyuncu.id) || 0;
    if (simdi < hazir) continue;
    /* Gecen tick sayisi: ilk taramada hazir=0 oldugu icin
       tarama araligi kadar sayiliyor, yoksa dunyaya girer
       girmez binlerce tick'lik iyilesme verilirdi.          */
    const gecen = hazir === 0 ? VILT_PASIF_TARAMA
                              : Math.min(VILT_PASIF_TARAMA * 4,
                                         simdi - hazir + VILT_PASIF_TARAMA);
    pasifSonraki.set(oyuncu.id, simdi + VILT_PASIF_TARAMA);

    if (!viltrumiteVar(oyuncu)) continue;

    /* ---- 1. ZARARLI ETKI BAGISIKLIGI ---- */
    for (const ad of VILT_ZARARLI_EFEKTLER) {
      try {
        if (typeof oyuncu.getEffect !== "function") break;
        if (oyuncu.getEffect(ad)) oyuncu.removeEffect(ad);
      } catch (e) {
        /* Bu surumde o efekt adi yoksa digerleri devam etsin --
           hepsini birden dusurmek gereksiz (bot_ilkel dersi). */
      }
    }

    /* ---- 2. YENILENME ---- */
    canEkle(oyuncu, VILT_YENILENME * gecen);
  }
}


/* ================================================================
   HASAR KANCASI: %97 indirim + %0.5 esik + savunma

   Direnc IV efektle %80 veriyor; kalan buradan geri
   kazandiriliyor. Oran ayarlar.js'te TURETILDI (VILT_GERI_ORAN),
   burada tekrar hesaplanmiyor.

   ONEMLI: verilen SIFA yeni bir entityHurt uretmiyor (hasar
   degil can) -- teknoloji zirhlarindaki ayni kural.
   ================================================================ */
export function viltrumiteHasar(olay) {
  if (!VILTRUMITE_ACIK) return;
  const oyuncu = olay ? olay.hurtEntity : undefined;
  if (!oyuncu || oyuncu.typeId !== "minecraft:player") return;
  if (!viltrumiteVar(oyuncu)) return;

  const gelen = typeof olay.damage === "number" ? olay.damage : 0;
  if (!(gelen > 0)) return;

  /* Ham hasar: olay Direnc'TEN SONRAKI degeri veriyor.
     Direnc IV = %80, yani ham = gelen / (1 - 0.80).           */
  const ham = gelen / (1 - (VILT_DIRENC + 1) * 0.2);

  /* damageIgnoreThreshold: ham hasar esigin altindaysa
     TAMAMEN yok sayiliyor.                                    */
  if (ham < VILT_ESIK) { canEkle(oyuncu, gelen); return; }

  let oran = VILT_GERI_ORAN;
  if (savunmadaMi(oyuncu.id)) {
    /* Savunma %70 daha emiyor: kalan hasarin %30'u geciyor.
       Yeni oran = 1 - (1 - VILT_GERI_ORAN) x (1 - emme).      */
    const t = tablo("vilt_savunma");
    oran = 1 - (1 - VILT_GERI_ORAN) * (1 - t.emme);
  }
  canEkle(oyuncu, gelen * oran);
}

function canEkle(varlik, miktar) {
  if (!(miktar > 0)) return;
  try {
    const c = varlik.getComponent("minecraft:health");
    if (!c) return;
    const simdi = typeof c.currentValue === "number"
      ? c.currentValue
      : (typeof c.getCurrentValue === "function" ? c.getCurrentValue() : undefined);
    if (simdi === undefined) return;
    let tavan = 20;
    if (typeof c.effectiveMax === "number") tavan = c.effectiveMax;
    else if (typeof c.defaultValue === "number") tavan = c.defaultValue;
    const yeni = Math.min(tavan, simdi + miktar);
    if (typeof c.setCurrentValue === "function") c.setCurrentValue(yeni);
  } catch (e) {
    hataYaz("viltrumite.canEkle", e);
  }
}

/* Olay her surumde yok; olayaAbone eksik olayda paketi
   oldurmuyor, yalniz bu ozelligi kapatiyor.                   */
export function viltrumiteKur() {
  if (!VILTRUMITE_ACIK) return false;
  const kuruldu = olayaAbone("entityHurt", (olay) => {
    try {
      viltrumiteHasar(olay);
    } catch (e) {
      hataYaz("viltrumite.entityHurt", e);
    }
  });
  if (!kuruldu) {
    bilgiYaz("entityHurt yok: Viltrumite %" + VILT_INDIRIM +
             " hasar indirimi Direnc IV (%80) ile sinirli. " +
             "Yetenekler aynen calisiyor.");
  }
  return kuruldu;
}

/* Oyuncu cikinca butun defterlerden dus. */
export function viltrumiteUnutOyuncu(oyuncuId) {
  pasifUnut(oyuncuId);
  yumrukSarj.delete(oyuncuId);
  yaylimSarj.delete(oyuncuId);
  atilimSarj.delete(oyuncuId);
  savunmaUnut(oyuncuId);
  kavramaUnut(oyuncuId);
  kilitUnut(oyuncuId);
}

export function viltrumiteUnut() {
  pasifUnut();
  yumrukSarj.clear();
  yaylimSarj.clear();
  atilimSarj.clear();
  savunmaUnut();
  kavramaUnut();
  kilitUnut();
  kanamaUnut();
}

/* Menu/test icin: aktarilan yetenek kimlikleri. */
export function viltrumiteListesi() {
  return [...VILTRUMITE_YETENEKLER.keys()];
}
