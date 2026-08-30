import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { guctekiKahraman, gucKumesi } from "./marvel.js";
import {
  hataYaz, gecerliMi, actionbarYaz, kollariIndir, parcacikAt,
  yukseklikAraligi, basKonumu
} from "../yardimcilar.js";
import {
  MARVEL_MEKANIK_ACIK, MARVEL_TIRMANMA_GUC, MARVEL_TIRMANMA_MENZIL,
  MARVEL_TIRMANMA_TARAMA, MARVEL_CENGEL_MENZIL, MARVEL_SALLANMA_GUC,
  MARVEL_SALLANMA_TICK, MARVEL_SUZULME_GUC, MARVEL_SUZULME_DIKEY,
  MARVEL_ATILMA_GUC, MARVEL_SICRAYIS_GUC, MARVEL_FAZ_MENZIL,
  MARVEL_ALAN_YARICAP, MARVEL_ALAN_HASAR_MENZIL, MARVEL_ALAN_EN_YAKIN,
  MARVEL_ALAN_HIZ, MARVEL_ALAN_HASAR, MARVEL_ALAN_HASAR_ARA,
  MARVEL_ALAN_YAVASLIK, MARVEL_ALAN_YAVASLIK_SURE, MARVEL_ALAN_SURE,
  MARVEL_GECIT_MENZIL, MARVEL_BOY_OLAY, MARVEL_BOY_OLCEK,
  LAZER_HASAR_SEBEP
} from "../ayarlar.js";

/* ================================================================
   MARVEL MEKANIKLERI                                       v5.3

   Kullanici: "duvar tirmanma, ag sallanma, boy degistirme, faz
   gecisi, kuvvet alani, portallar... bunlari almayacaksan zaten
   kahraman diye bir sey kalmiyor, kostum oluyor."

   HAKLIYDI. v5.2'de "Bedrock'ta oyuncuya EFEKTLE verilemiyor"
   demistim; cumle dogruydu ama yaniltiyordu -- mod bunlari
   efektle degil SCRIPT'le yapiyor ve mod zaten Bedrock.

   ---- ITME BICIMI ----
   Oyuncularda applyImpulse ISLEMIYOR (bu depoda v4.x'te
   olculmustu, cekme.js'te yazili). Modun kendisi de her yerde
   applyKnockback kullaniyor. Ayni cagri korundu:
       applyKnockback(dx, dz, hypot(dx, dz), dy)

   ---- KAPI ----
   Her mekanik, o kahramanin GUC KAYNAGI uzerindeyken aciliyor
   (marvel.js:guctekiKahraman). Yani Orumcek Adam'in agini
   Thor'la atamiyorsun. Kapi yetenegin kendi icinde, cunku
   yetenek MENUDEN de secilebiliyor.

   ---- TIRMANMA NEDEN AYRI ----
   Otekiler ANLIK (bas, olsun). Tirmanma SUREKLI bir durum:
   comeldigin ve duvara baktigin surece calisiyor. Kaynakta bu
   bir animasyon denetleyicisinde durum makinesi olarak duruyor
   ve etiket ekleyip cikariyor; bizde tek yerde, script'te.
   ================================================================ */

/* ---------------- ortak yardimcilar ---------------- */

/* Kahramanin bu mekanigi var mi? */
function mekanikVar(oyuncu, mekanik) {
  let k;
  try { k = guctekiKahraman(oyuncu); } catch (e) { return false; }
  const t = gucKumesi(k);
  if (!t || !t.mekanikler) return false;
  return t.mekanikler.indexOf(mekanik) !== -1;
}

/* Modun her yerde kullandigi itme. dx/dz yatay, dy dikey. */
function it(oyuncu, yon, carpan, dikeyCarpan) {
  const dx = yon.x * carpan;
  const dy = (dikeyCarpan === undefined ? yon.y * carpan : dikeyCarpan);
  const dz = yon.z * carpan;
  try {
    if (typeof oyuncu.applyKnockback === "function") {
      oyuncu.applyKnockback(dx, dz, Math.hypot(dx, dz), dy);
      return true;
    }
  } catch (e) { /* asagidaki yola dus */ }
  try {
    /* Eski surumlerde applyKnockback baska imza istiyordu;
       applyImpulse oyuncuda islemiyor ama hicbir sey
       yapmamaktan iyidir.                                    */
    if (typeof oyuncu.applyImpulse === "function") {
      oyuncu.applyImpulse({ x: dx, y: dy, z: dz });
      return true;
    }
  } catch (e) { /* olmadi */ }
  return false;
}

/* Baktigi yerdeki blok (cengel/gecit icin). */
function bakilanBlok(oyuncu, menzil) {
  try {
    if (typeof oyuncu.getBlockFromViewDirection !== "function") return undefined;
    const v = oyuncu.getBlockFromViewDirection({
      includeLiquidBlocks: false, maxDistance: menzil
    });
    return v && v.block ? v.block : v;
  } catch (e) {
    return undefined;
  }
}

function bosMu(boyut, sinir, x, y, z) {
  if (y < sinir.min || y + 1 > sinir.max) return false;
  try {
    const a = boyut.getBlock({ x, y, z });
    const b = boyut.getBlock({ x, y: y + 1, z });
    return !!a && !!b && a.isAir && b.isAir;
  } catch (e) {
    return false;
  }
}

/* ---------------- 1. TIRMANMA (surekli) ----------------

   Kaynak kosullari (animation_controllers/spiderman.json):
     q.is_sneaking && arathnido:escalar && !q.is_on_ground
   `escalar` = "baktigin yerde blok var" (detect_blocks.js).
   Bizde ucu de tek yerde sinaniyor.                          */
const tirmanmaSonraki = new Map();

export function tirmanmaUnut(oyuncuId) {
  if (oyuncuId === undefined) { tirmanmaSonraki.clear(); return; }
  tirmanmaSonraki.delete(oyuncuId);
}

export function tirmanmaTara(oyuncular) {
  if (!MARVEL_MEKANIK_ACIK) return;
  const simdi = system.currentTick;
  for (const oyuncu of oyuncular) {
    if (simdi < (tirmanmaSonraki.get(oyuncu.id) || 0)) continue;
    tirmanmaSonraki.set(oyuncu.id, simdi + MARVEL_TIRMANMA_TARAMA);

    if (!mekanikVar(oyuncu, "tirmanma")) continue;
    let comelmis, yerde;
    try {
      comelmis = oyuncu.isSneaking === true;
      yerde = oyuncu.isOnGround === true;
    } catch (e) { continue; }
    if (!comelmis) continue;

    /* Duvar var mi: KISA menzil. Uzaga bakinca tirmanmamali. */
    const blok = bakilanBlok(oyuncu, MARVEL_TIRMANMA_MENZIL);
    if (!blok) continue;

    let yon;
    try { yon = oyuncu.getViewDirection(); } catch (e) { continue; }
    /* Yerdeyken de yukari kaldiriyoruz: duvarin dibinden
       tirmanmaya baslayabilmek icin. Kaynak "!is_on_ground"
       istiyor ama orada zipla-tirman zinciri var; bizde
       comelme zaten bilincli bir hareket.                    */
    const dikey = yerde ? MARVEL_TIRMANMA_GUC : yon.y * MARVEL_TIRMANMA_GUC;
    it(oyuncu, yon, MARVEL_TIRMANMA_GUC, Math.max(dikey, 0.25));
  }
}

/* ---------------- 2. SALLANMA (ag / kanca) ---------------- */
yetenekKaydet({
  kimlik: "marvel_sallanma",
  ad: "Ag Sallanmasi",
  esyasiz: true,
  sira: 320,

  olustur(oyuncu) {
    if (!mekanikVar(oyuncu, "sallanma")) {
      actionbarYaz(oyuncu, "§7Bu güç sende yok §8(ağ/kanca)");
      kollariIndir(oyuncu);
      return undefined;
    }
    const blok = bakilanBlok(oyuncu, MARVEL_CENGEL_MENZIL);
    if (!blok) {
      actionbarYaz(oyuncu, "§7Ağ tutunacak yer yok §8(" +
                   MARVEL_CENGEL_MENZIL + " blok)");
      kollariIndir(oyuncu);
      return undefined;
    }
    let hedef;
    try { hedef = { x: blok.x + 0.5, y: blok.y + 0.5, z: blok.z + 0.5 }; }
    catch (e) { kollariIndir(oyuncu); return undefined; }

    kollariIndir(oyuncu);
    let kalan = MARVEL_SALLANMA_TICK;
    return {
      calis() {
        kalan--;
        if (kalan <= 0 || !gecerliMi(oyuncu)) return true;
        let k;
        try { k = basKonumu(oyuncu); } catch (e) { return true; }
        const dx = hedef.x - k.x, dy = hedef.y - k.y, dz = hedef.z - k.z;
        const uz = Math.hypot(dx, dy, dz);
        /* Cengele varinca birak: yoksa oyuncu bloga yapisip
           titrer.                                            */
        if (uz < 2) return true;
        it(oyuncu, { x: dx / uz, y: dy / uz, z: dz / uz },
           MARVEL_SALLANMA_GUC);
        try {
          parcacikAt(oyuncu.dimension, "minecraft:crop_growth_emitter", hedef);
        } catch (e) { /* parcacik onemli degil */ }
        return false;
      }
    };
  }
});

/* ---------------- 3. SUZULME ---------------- */
yetenekKaydet({
  kimlik: "marvel_suzulme",
  ad: "Suzulme",
  esyasiz: true,
  sira: 321,

  olustur(oyuncu) {
    if (!mekanikVar(oyuncu, "sallanma")) {
      actionbarYaz(oyuncu, "§7Bu güç sende yok §8(süzülme)");
      kollariIndir(oyuncu);
      return undefined;
    }
    let yon;
    try { yon = oyuncu.getViewDirection(); } catch (e) {
      kollariIndir(oyuncu); return undefined;
    }
    it(oyuncu, yon, MARVEL_SUZULME_GUC, MARVEL_SUZULME_DIKEY);
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ---------------- 4. ATILMA (dash) ---------------- */
yetenekKaydet({
  kimlik: "marvel_atilma",
  ad: "Atilma",
  esyasiz: true,
  sira: 322,

  olustur(oyuncu) {
    if (!mekanikVar(oyuncu, "atilma")) {
      actionbarYaz(oyuncu, "§7Bu güç sende yok §8(atılma)");
      kollariIndir(oyuncu);
      return undefined;
    }
    let yon;
    try { yon = oyuncu.getViewDirection(); } catch (e) {
      kollariIndir(oyuncu); return undefined;
    }
    it(oyuncu, yon, MARVEL_ATILMA_GUC);
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ---------------- 5. SICRAYIS (leap) ---------------- */
yetenekKaydet({
  kimlik: "marvel_sicrayis",
  ad: "Sicrayis",
  esyasiz: true,
  sira: 323,

  olustur(oyuncu) {
    if (!mekanikVar(oyuncu, "sicrayis")) {
      actionbarYaz(oyuncu, "§7Bu güç sende yok §8(sıçrayış)");
      kollariIndir(oyuncu);
      return undefined;
    }
    let yon;
    try { yon = oyuncu.getViewDirection(); } catch (e) {
      kollariIndir(oyuncu); return undefined;
    }
    it(oyuncu, yon, MARVEL_SICRAYIS_GUC);
    /* Inise yumusak: kaynakta Hulk yere carpip alan hasari
       veriyor, biz oyuncuyu oldurmuyoruz.                    */
    try {
      oyuncu.addEffect("slow_falling", 200, {
        amplifier: 0, showParticles: false
      });
    } catch (e) { /* efekt yoksa gec */ }
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ---------------- 6. FAZ GECISI ----------------

   Kaynak once GERI (x-1) sonra ILERI (x2.5) itiyor -- yani
   duvarin icinden gecirmiyor, hizla gecip gidiyor. Bedrock'ta
   salt itme duvarda takiliyor, o yuzden bizimki duvarin
   OTESINDEKI ilk bos yere isinliyor. Fark ayarlar.js'te de
   yazili.                                                    */
yetenekKaydet({
  kimlik: "marvel_faz",
  ad: "Faz Gecisi",
  esyasiz: true,
  sira: 324,

  olustur(oyuncu) {
    if (!mekanikVar(oyuncu, "faz")) {
      actionbarYaz(oyuncu, "§7Bu güç sende yok §8(faz geçişi)");
      kollariIndir(oyuncu);
      return undefined;
    }
    let bas, yon, boyut;
    try {
      bas = oyuncu.location;
      yon = oyuncu.getViewDirection();
      boyut = oyuncu.dimension;
    } catch (e) { kollariIndir(oyuncu); return undefined; }
    const sinir = yukseklikAraligi(boyut);

    /* YAKINDAN UZAGA: faz gecisi "duvarin obur yuzu" demek,
       en uzak nokta degil. Isinlanma yetenegi tam tersini
       yapiyor ve sebebi orada yazili.                        */
    for (let d = 1; d <= MARVEL_FAZ_MENZIL; d++) {
      const x = Math.floor(bas.x + yon.x * d);
      const y = Math.floor(bas.y + yon.y * d);
      const z = Math.floor(bas.z + yon.z * d);
      if (!bosMu(boyut, sinir, x, y, z)) continue;
      /* Bos yer bulundu ama ARADA duvar var miydi? Yoksa bu
         faz degil sadece yuruyus olurdu.                     */
      let duvarVar = false;
      for (let g = 1; g < d; g++) {
        const gx = Math.floor(bas.x + yon.x * g);
        const gy = Math.floor(bas.y + yon.y * g);
        const gz = Math.floor(bas.z + yon.z * g);
        if (!bosMu(boyut, sinir, gx, gy, gz)) { duvarVar = true; break; }
      }
      if (!duvarVar) continue;
      try {
        oyuncu.teleport({ x: x + 0.5, y, z: z + 0.5 },
                        { dimension: boyut });
        parcacikAt(boyut, "minecraft:large_explosion", { x: x + 0.5, y: y + 1, z: z + 0.5 });
      } catch (e) {
        hataYaz("marvel.faz", e);
      }
      kollariIndir(oyuncu);
      return undefined;
    }
    actionbarYaz(oyuncu, "§7Geçilecek duvar yok");
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ---------------- 7. KUVVET ALANI ----------------

   sue_force_physics.js: yaricap 12'de cek, 16'da hasar ver,
   4 blogdan yakina cekme, yavaslik amp 1.                    */
yetenekKaydet({
  kimlik: "marvel_kuvvet_alani",
  ad: "Kuvvet Alani",
  esyasiz: true,
  sira: 325,

  olustur(oyuncu) {
    if (!mekanikVar(oyuncu, "kuvvet_alani")) {
      actionbarYaz(oyuncu, "§7Bu güç sende yok §8(kuvvet alanı)");
      kollariIndir(oyuncu);
      return undefined;
    }
    kollariIndir(oyuncu);
    let kalan = MARVEL_ALAN_SURE;
    let sonHasar = 0;
    return {
      calis() {
        kalan--;
        if (kalan <= 0 || !gecerliMi(oyuncu)) return true;
        let merkez, boyut;
        try { merkez = oyuncu.location; boyut = oyuncu.dimension; }
        catch (e) { return true; }

        let hedefler = [];
        try {
          hedefler = boyut.getEntities({
            location: merkez, maxDistance: MARVEL_ALAN_HASAR_MENZIL,
            excludeTypes: ["minecraft:player", "minecraft:item"]
          });
        } catch (e) { return true; }

        const simdi = system.currentTick;
        const hasarZamani = simdi - sonHasar >= MARVEL_ALAN_HASAR_ARA;
        if (hasarZamani) sonHasar = simdi;

        for (const v of hedefler) {
          if (!gecerliMi(v)) continue;
          let k;
          try { k = v.location; } catch (e) { continue; }
          const dx = merkez.x - k.x, dy = merkez.y - k.y, dz = merkez.z - k.z;
          const uz = Math.hypot(dx, dy, dz);
          if (uz > MARVEL_ALAN_YARICAP) continue;

          try {
            v.addEffect("slowness", MARVEL_ALAN_YAVASLIK_SURE, {
              amplifier: MARVEL_ALAN_YAVASLIK, showParticles: false
            });
          } catch (e) { /* efekt yoksa gec */ }

          /* Kaynak ITIYOR (isaret ters): alan disari savuruyor. */
          if (uz > MARVEL_ALAN_EN_YAKIN) {
            try {
              if (typeof v.applyKnockback === "function") {
                v.applyKnockback(-dx / uz, -dz / uz, MARVEL_ALAN_HIZ, 0.2);
              } else if (typeof v.applyImpulse === "function") {
                v.applyImpulse({
                  x: (-dx / uz) * MARVEL_ALAN_HIZ, y: 0.2,
                  z: (-dz / uz) * MARVEL_ALAN_HIZ
                });
              }
            } catch (e) { /* itilemedi */ }
          }
          if (hasarZamani) {
            try {
              v.applyDamage(MARVEL_ALAN_HASAR, {
                cause: LAZER_HASAR_SEBEP, damagingEntity: oyuncu
              });
            } catch (e) {
              try { v.applyDamage(MARVEL_ALAN_HASAR); } catch (e2) { /* gec */ }
            }
          }
        }
        try {
          parcacikAt(boyut, "minecraft:sonic_explosion",
                     { x: merkez.x, y: merkez.y + 1, z: merkez.z });
        } catch (e) { /* parcacik onemli degil */ }
        return false;
      }
    };
  }
});

/* ---------------- 8. GECIT (Doctor Strange) ----------------

   Kaynakta iki ucu olan GERCEK bir portal varligi var
   (dr_strange/portal.js, 384 satir, kendi varligi ve iki uc
   arasi tasima). Bizdeki tek atislik: baktigin yerdeki ilk
   guvenli noktaya gecis. Iki uclu portal ayri bir varlik
   sistemi ister; o kadari ALINMADI ve adi bu yuzden "portal"
   degil "gecit".                                             */
yetenekKaydet({
  kimlik: "marvel_gecit",
  ad: "Gecit",
  esyasiz: true,
  sira: 326,

  olustur(oyuncu) {
    if (!mekanikVar(oyuncu, "gecit")) {
      actionbarYaz(oyuncu, "§7Bu güç sende yok §8(geçit)");
      kollariIndir(oyuncu);
      return undefined;
    }
    let bas, yon, boyut;
    try {
      bas = oyuncu.location;
      yon = oyuncu.getViewDirection();
      boyut = oyuncu.dimension;
    } catch (e) { kollariIndir(oyuncu); return undefined; }
    const sinir = yukseklikAraligi(boyut);

    /* UZAKTAN YAKINA: gecit en uzak guvenli noktaya acilmali
       (isinlanma yetenegindeki karar).                       */
    for (let d = MARVEL_GECIT_MENZIL; d >= 2; d--) {
      const x = Math.floor(bas.x + yon.x * d);
      const y = Math.floor(bas.y + yon.y * d);
      const z = Math.floor(bas.z + yon.z * d);
      if (!bosMu(boyut, sinir, x, y, z)) continue;
      try {
        parcacikAt(boyut, "minecraft:dragon_breath_fire",
                   { x: bas.x, y: bas.y + 1, z: bas.z });
        oyuncu.teleport({ x: x + 0.5, y, z: z + 0.5 },
                        { dimension: boyut });
        parcacikAt(boyut, "minecraft:dragon_breath_fire",
                   { x: x + 0.5, y: y + 1, z: z + 0.5 });
      } catch (e) {
        hataYaz("marvel.gecit", e);
      }
      kollariIndir(oyuncu);
      return undefined;
    }
    actionbarYaz(oyuncu, "§7Geçit açacak güvenli yer yok");
    kollariIndir(oyuncu);
    return undefined;
  }
});

/* ---------------- 9. BOY DEGISTIRME ----------------

   entities/player.json'daki bilesen gruplari. Olcekler modun
   kendi dosyasindan: 0.05 / 1.0 / 5.0.

   Bu TEK mekanik script'ten degil VARLIK OLAYINDAN geliyor,
   cunku Bedrock'ta oyuncunun olcegini script degistiremiyor --
   yalniz bilesen grubu degistirebiliyor.                     */
const boySirasi = ["normal", "kucuk", "buyuk"];
const boyDurum = new Map();

export function boyUnut(oyuncuId) {
  if (oyuncuId === undefined) { boyDurum.clear(); return; }
  boyDurum.delete(oyuncuId);
}

yetenekKaydet({
  kimlik: "marvel_boy",
  ad: "Boy Degistir",
  esyasiz: true,
  sira: 327,

  olustur(oyuncu) {
    if (!mekanikVar(oyuncu, "boy")) {
      actionbarYaz(oyuncu, "§7Bu güç sende yok §8(boy değiştirme)");
      kollariIndir(oyuncu);
      return undefined;
    }
    const simdiki = boyDurum.get(oyuncu.id) || "normal";
    const sonraki = boySirasi[(boySirasi.indexOf(simdiki) + 1) %
                              boySirasi.length];
    boyDurum.set(oyuncu.id, sonraki);
    try {
      oyuncu.triggerEvent(MARVEL_BOY_OLAY[sonraki]);
      actionbarYaz(oyuncu, "§b⇕ §fBoy §8· " + sonraki + " §8(x" +
                   MARVEL_BOY_OLCEK[sonraki] + ")");
    } catch (e) {
      /* Varlik olayi yoksa (paket eski) boy degismez ama
         paket olmez -- ve sebebini soyluyoruz.               */
      actionbarYaz(oyuncu, "§cBoy değiştirilemedi §8(paket eski olabilir)");
      hataYaz("marvel.boy", e);
    }
    kollariIndir(oyuncu);
    return undefined;
  }
});
