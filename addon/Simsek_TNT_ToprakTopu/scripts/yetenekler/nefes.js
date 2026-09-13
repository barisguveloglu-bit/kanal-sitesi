import { system, world } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, parcacikAt,
  koniHedefleri, varlikKonumu
} from "../yardimcilar.js";
import { varlikIste } from "../butce.js";
import {
  NEFES_ACIK, NEFES_SIRA_BAS, NEFES_KAYIT_ANAHTAR, NEFES_BEKLEME,
  NEFES_USLUPLAR, NEFES_MERMI_VARLIK, NEFES_HASAR_SEBEP
} from "../ayarlar.js";
/* KILIT_ATLA_TIPLER BURADA YOK, bilerek: botlari eleme isini
   `koniHedefleri` zaten yapiyor. Ilk yazilista ithal edilmisti
   ve tarama.mjs "kullanilmayan ithal" diye dusurdu -- olu
   ithal, okuyana "burada bot elemesi var" diye yalan soyler. */

/* NEFES  --  Kimetsu no Yaiba ver3'ten iki uslup      v7.87

   Kullanici: "en guclusunu sec yani aralarindan iki tanesini
   secebilirsin, sectigin o iki tane sey ile alakali tum
   seyleri alacaksin."

   Secim ve form adlarinin nereden geldigi ayarlar.js'te
   olculu yazili. Bu dosya YALNIZ isi yapiyor.

   ---- USLUP SECIMI NEDEN VAR ----
   23 form birden jest listesine girseydi liste kullanilamaz
   hale gelirdi. Oyuncu once uslubunu seciyor (meyve_sec ve
   karakter_sec ile ayni kalip), sonra yalniz o uslubun
   formlari calisiyor. Oteki uslubun formu secilirse
   yetenek "once o uslubu sec" diyor ve HICBIR SEY YAPMIYOR --
   sessizce baska bir sey yapmak en kotusu olurdu.           */

/* oyuncuId -> uslup anahtari */
const secili = new Map();
/* oyuncuId -> son kullanim ticki */
const bekleme = new Map();

export function nefesUnut(oyuncuId) {
  if (oyuncuId === undefined) { secili.clear(); bekleme.clear(); return; }
  secili.delete(oyuncuId);
  bekleme.delete(oyuncuId);
}
/* Oyuncu CIKARKEN cagriliyor. Yalniz beklemeyi siliyor,
   SECILI USLUBU DEGIL: uslup dunyaya yazili ve geri girince
   durmasi gerekiyor. Ilk yazilista burada `nefesUnut`
   cagriliyordu ve o uslubu da siliyordu -- yani cikip giren
   oyuncu nefesini her seferinde yeniden secmek zorunda
   kalirdi. Kalicilik kodunu yazip sonra onu silmek, bu
   depoda daha once gorulen bir hata sinifi.               */
export function nefesCikti(oyuncuId) { bekleme.delete(oyuncuId); }

export function nefesSecili(oyuncuId) { return secili.get(oyuncuId); }
export function nefesSayisi() { return secili.size; }

/* ---- KALICILIK ----
   Dunya ozelligi yoksa bellekte kaliyor: eksigi durustce
   soylemek, sessizce catlamaktan iyi. mahou.js'te ayni karar
   ayni sebeple alindi.                                     */
function kayitOku() {
  try {
    if (typeof world.getDynamicProperty !== "function") return;
    const ham = world.getDynamicProperty(NEFES_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || !ham) return;
    for (const [id, u] of Object.entries(JSON.parse(ham))) {
      if (NEFES_USLUPLAR.has(u)) secili.set(id, u);
    }
  } catch (e) { hataYaz("nefes.kayitOku", e); }
}
function kayitYaz() {
  try {
    if (typeof world.setDynamicProperty !== "function") return;
    const d = {};
    for (const [id, u] of secili) d[id] = u;
    world.setDynamicProperty(NEFES_KAYIT_ANAHTAR, JSON.stringify(d));
  } catch (e) { hataYaz("nefes.kayitYaz", e); }
}
kayitOku();

function beklemedeMi(oyuncu) {
  const son = bekleme.get(oyuncu.id);
  const simdi = system.currentTick;
  if (son !== undefined && simdi - son < NEFES_BEKLEME) {
    const kalan = ((NEFES_BEKLEME - (simdi - son)) / 20).toFixed(1);
    actionbarYaz(oyuncu, "§8… §7nefes toplanıyor §8· " + kalan + " sn");
    return true;
  }
  bekleme.set(oyuncu.id, simdi);
  return false;
}

/* Hedefe hasar. applyDamage'in secenekli bicimi bazi
   surumlerde yok -- beden_bol.js'teki ayni yedek.          */
function vur(hedef, oyuncu, hasar) {
  try {
    hedef.applyDamage(hasar, {
      cause: NEFES_HASAR_SEBEP, damagingEntity: oyuncu
    });
    return true;
  } catch (e) {
    try { hedef.applyDamage(hasar); return true; }
    catch (e2) { hataYaz("nefes.hasar", e2); return false; }
  }
}

function atesVer(hedef, tick) {
  if (!tick) return;
  try {
    if (typeof hedef.setOnFire === "function") hedef.setOnFire(tick / 20, true);
  } catch (e) { /* ates veremediysek hasar yine gitti */ }
}

function korEt(hedef, tick) {
  if (!tick) return;
  try {
    if (typeof hedef.addEffect === "function") {
      hedef.addEffect("blindness", tick, { amplifier: 0, showParticles: false });
    }
  } catch (e) { /* onemsiz */ }
}

/* Cevredeki hedefler. koniHedefleri kendimizi ve botlarimizi
   zaten eliyor; aci -1 verilince koni degil KURE oluyor.   */
function hedefler(oyuncu, menzil, aci) {
  return koniHedefleri(oyuncu, {
    menzil, aci: aci === undefined ? -1 : aci,
    tavan: 12, oyuncuDahil: true
  });
}

/* ---------------- ALTI MEKANIK ---------------- */
const MEKANIK = {
  /* Bakis konisinde hasar. */
  kesik(oyuncu, u, f) {
    const liste = hedefler(oyuncu, f.menzil, f.aci);
    let n = 0;
    for (let k = 0; k < (f.tekrar || 1); k++) {
      for (const h of liste) {
        if (!gecerliMi(h)) continue;
        if (!vur(h, oyuncu, f.hasar)) continue;
        atesVer(h, f.atesle); korEt(h, f.kor);
        parcacikAt(oyuncu.dimension, u.parcacik,
                   varlikKonumu(h) || h.location);
        if (k === 0) n++;
      }
    }
    return n;
  },

  /* 360 derece: ayni is, koni yok. */
  halka(oyuncu, u, f) {
    return MEKANIK.kesik(oyuncu, u, { ...f, aci: -1 });
  },

  /* Ileri firla, varista cevreye vur. Atilim ANLIK: tick
     tutan bir is acmiyor, itme kuvveti uygulaniyor.        */
  atilim(oyuncu, u, f) {
    try {
      const yon = oyuncu.getViewDirection();
      if (typeof oyuncu.applyKnockback === "function") {
        /* Bedrock 2.x tek nesne, 1.x dort sayi bekliyor.
           Ikisi de deneniyor: surum farki yuzunden yetenegin
           yarisi calismasin.                                */
        try {
          oyuncu.applyKnockback({ x: yon.x * (f.guc || 1.5),
                                  z: yon.z * (f.guc || 1.5) },
                                f.yukari || 0.4);
        } catch (e) {
          oyuncu.applyKnockback(yon.x, yon.z, (f.guc || 1.5) * 3,
                                f.yukari || 0.4);
        }
      }
    } catch (e) { hataYaz("nefes.atilim", e); }
    return MEKANIK.kesik(oyuncu, u, { ...f, aci: 0.2 });
  },

  /* Firlatilan kesik. Vanilla ok kullaniliyor: kendi
     mermimizi uretmek icin sebep yok, gorunumu parcacik
     zaten veriyor.                                         */
  mermi(oyuncu, u, f) {
    if (varlikIste(1) === 0) return 0;
    try {
      const yon = oyuncu.getViewDirection();
      const k = oyuncu.location;
      const dogum = { x: k.x + yon.x, y: k.y + 1.4 + yon.y, z: k.z + yon.z };
      const m = oyuncu.dimension.spawnEntity(NEFES_MERMI_VARLIK, dogum);
      if (m && typeof m.applyImpulse === "function") {
        m.applyImpulse({ x: yon.x * 2.2, y: yon.y * 2.2, z: yon.z * 2.2 });
      }
      parcacikAt(oyuncu.dimension, u.parcacik, dogum);
      return 1;
    } catch (e) {
      hataYaz("nefes.mermi", e);
      return 0;
    }
  },

  /* Kendine sureli efekt. Sureler ayarlar.js'te ve hepsi
     sonlu -- bu depoda kalici etkinin sure siniri sart.   */
  koruma(oyuncu, u, f) {
    for (const [ad, sure, amp] of f.efektler || []) {
      try {
        oyuncu.addEffect(ad, sure, { amplifier: amp, showParticles: false });
      } catch (e) { /* efekt yoksa otekiler versin */ }
    }
    parcacikAt(oyuncu.dimension, u.parcacik, oyuncu.location);
    return 1;
  },

  /* Hedefleri kendine cek. */
  cekis(oyuncu, u, f) {
    const liste = hedefler(oyuncu, f.menzil, -1);
    const m = oyuncu.location;
    let n = 0;
    for (const h of liste) {
      try {
        if (!gecerliMi(h)) continue;
        const k = h.location;
        const dx = m.x - k.x, dz = m.z - k.z;
        const boy = Math.hypot(dx, dz) || 1;
        if (typeof h.applyKnockback === "function") {
          try { h.applyKnockback({ x: dx / boy, z: dz / boy }, 0.3); }
          catch (e) { h.applyKnockback(dx / boy, dz / boy, 1.2, 0.3); }
        }
        vur(h, oyuncu, f.hasar);
        parcacikAt(oyuncu.dimension, u.parcacik, k);
        n++;
      } catch (e) { hataYaz("nefes.cekis", e); }
    }
    return n;
  }
};


/* ---------------- USLUP SECIMI ---------------- */
let _sira = NEFES_SIRA_BAS;

for (const [anahtar, u] of NEFES_USLUPLAR) {
  yetenekKaydet({
    kimlik: "nefes_sec_" + anahtar,
    ad: u.ad + " (seç)",
    esyasiz: true,
    sira: _sira++,
    olustur(oyuncu) {
      if (!NEFES_ACIK) { kollariIndir(oyuncu); return undefined; }
      secili.set(oyuncu.id, anahtar);
      kayitYaz();
      actionbarYaz(oyuncu, u.renk + "❂ §f" + u.ad + " §8· " +
                           u.formlar.length + " form açıldı");
      try { oyuncu.dimension.playSound(u.ses, oyuncu.location); }
      catch (e) { /* ses onemsiz */ }
      kollariIndir(oyuncu);
      return undefined;
    }
  });
}


/* ---------------- FORMLAR ----------------
   Tek tek yazilmiyor, tablodan uretiliyor: yeni bir form
   eklenince burasi kendiliginden dogru kalir. mahou.js'te
   ayni karar ayni sebeple alindi.                          */
for (const [anahtar, u] of NEFES_USLUPLAR) {
  for (const f of u.formlar) {
    yetenekKaydet({
      kimlik: "nefes_" + anahtar + "_" + f.no,
      ad: u.ad + " " + f.no + ": " + f.ad,
      esyasiz: true,
      sira: _sira++,

      olustur(oyuncu) {
        if (!NEFES_ACIK) { kollariIndir(oyuncu); return undefined; }

        /* KAPI: uslup secili olmali. Baska uslubun formu
           secilirse HICBIR SEY yapilmiyor -- sessizce o
           uslubu acmak, oyuncunun istemedigi bir sey
           yapmak olurdu.                                  */
        if (secili.get(oyuncu.id) !== anahtar) {
          actionbarYaz(oyuncu, "§7Önce " + u.renk + u.ad + " §7seç");
          kollariIndir(oyuncu);
          return undefined;
        }
        if (beklemedeMi(oyuncu)) { kollariIndir(oyuncu); return undefined; }

        const is = MEKANIK[f.tur];
        let n = 0;
        if (is) {
          try { n = is(oyuncu, u, f) || 0; }
          catch (e) { hataYaz("nefes." + f.tur, e); }
        }

        try { oyuncu.dimension.playSound(u.ses, oyuncu.location); }
        catch (e) { /* ses onemsiz */ }

        actionbarYaz(oyuncu, u.renk + f.no + ". Form §f" + f.ad +
          (f.tur === "koruma" ? "" : " §8· " + n + " hedef"));
        kollariIndir(oyuncu);
        return undefined;    // formlar anlik, tick tutmuyor
      }
    });
  }
}
