import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, basKonumu, parcacikAt, parcacikHalkasi,
  actionbarYaz
} from "../yardimcilar.js";
import { blokIste, varlikIste } from "../butce.js";
import { ruhCarpani, ruhOku, ruhYaz, kademeOku, yolOku, yolYaz } from "./ruh.js";
import {
  GETSUGA_ACIK, GETSUGA_SIRA, GETSUGA_HASAR, GETSUGA_MENZIL,
  GETSUGA_HIZ, GETSUGA_OMUR, GETSUGA_BLOK_KIR,
  HALKA_ACIK, HALKA_SIRA, HALKA_MAKS, HALKA_ADIM, HALKA_HASAR, HALKA_IYILES,
  CERO_ACIK, CERO_SIRA, CERO_SARJ, CERO_ONDE, CERO_HASAR, CERO_MENZIL,
  CERO_HIZ, CERO_OMUR, CERO_BLOK_KIR,
  QUINCY_ACIK, QUINCY_SIRA, QUINCY_BEDEL, QUINCY_KIPLER,
  REISHI_ACIK, REISHI_SIRA, REISHI_BLOK, REISHI_SURE, REISHI_TAVAN,
  REISHI_YARICAP, RUH_YOLLAR, RUH_YOL_SIRA
} from "../ayarlar.js";

/* UC YOLUN YETENEKLERI.

   Hepsi Bleach: Kurosaki Dynasty 2.4.6 siniflarindan OKUNARAK
   cikarildi; jar calistirilmadi. Her yetenegin basinda hangi
   siniftan geldigi yaziyor.

   ---- KAYNAKTAN AYRILAN ORTAK UC SEY ----
   1. HEPSI CARPANLA OLCEKLENIYOR (ruhCarpani). Kaynakta
      boost* ayri ayri uygulaniyor; bizde tek kapi var, cunku
      iki ayri carpan hesabi er gec ayrisir.
   2. BLOK KIRMA AYARDAN KAPALI BASLIYOR. Kaynakta
      lunarBlockDestruction / ceroBlockDestruction varsayilan
      acik; bu depoda blok kiran her sey once kapali gelir.
   3. MERMILER VARLIK DEGIL IS. Bedrock'ta ozel mermi varligi
      tanimlamak BP'de yeni bir varlik demek; burada mermi bir
      is olarak adim adim ilerliyor (isinlar.js'in kalibi) --
      ayni gorunum, sifir yeni varlik.                        */

/* ---------------- ortak: ilerleyen mermi ----------------
   Her tick HIZ kadar ilerler, carptigi ilk seye hasar verir.
   Kaynagin accelX/Y/Z alanlarinin karsiligi.                */
export function mermiIsi(secenek) {
  const { ad, oyuncu, hasar, menzil, hiz, omur, parcacik, blokKir,
          kaydir, carpinca } = secenek;
  const boyut = oyuncu.dimension;
  let konum, yon;
  try {
    konum = basKonumu(oyuncu);
    yon = oyuncu.getViewDirection();
  } catch (e) { return undefined; }
  if (!konum || !yon) return undefined;

  /* YANAL KAYDIRMA (v7.57, Nozarashi'nin Uclu Kesigi icin).
     Kaynakta ofsetler 1.5 / 0 / -1.5. Bakis yonunun YATAY
     dikini aliyoruz; dikey bilesen kullanilsaydi yukari
     bakarken uc kesik ust uste binerdi.                    */
  if (kaydir) {
    const uz = Math.hypot(yon.x, yon.z) || 1;
    konum = { x: konum.x + (-yon.z / uz) * kaydir, y: konum.y,
              z: konum.z + (yon.x / uz) * kaydir };
  }

  let gidilen = 0;
  let tick = 0;
  const vurulan = new Set();

  return {
    ad: ad,
    oyuncuId: oyuncu.id,
    calis() {
      if (++tick > omur) return true;
      if (gidilen >= menzil) return true;

      konum = { x: konum.x + yon.x * hiz,
                y: konum.y + yon.y * hiz,
                z: konum.z + yon.z * hiz };
      gidilen += hiz;

      try { parcacikAt(boyut, parcacik, konum); } catch (e) { /* onemsiz */ }

      /* Blok carpmasi. Kirma AYARDAN kapali; kapaliyken
         mermi duvarda DURUYOR -- duvarin arkasina gecen bir
         mermi, duvari kirmaktan daha kotu.                  */
      let blok;
      try { blok = boyut.getBlock(konum); } catch (e) { return true; }
      if (blok && !blok.isAir) {
        if (blokKir && blokIste(1)) {
          try { blok.setType("minecraft:air"); } catch (e) { /* onemsiz */ }
        } else {
          return true;
        }
      }

      /* Carptigi canlilar. Her hedefe BIR kez vuruyor:
         yoksa mermi icinden gectigi sure boyunca her tick
         vururdu ve hasar menzile bagli olurdu.              */
      let yakin;
      try {
        yakin = boyut.getEntities({ location: konum, maxDistance: 1.6 });
      } catch (e) { yakin = []; }
      for (const v of yakin) {
        try {
          if (!v || v.id === oyuncu.id || vurulan.has(v.id)) continue;
          if (v.typeId === "minecraft:item") continue;
          vurulan.add(v.id);
          v.applyDamage(hasar, { cause: "entityAttack", damagingEntity: oyuncu });
          if (carpinca) carpinca(v);
        } catch (e) { /* varlik kayboldu */ }
      }
      return false;
    }
  };
}

/* Bu yetenek bu yola ait mi? Yol disi tetiklemede sessizce
   undefined donuyor -- jest sirasi ortak, yol kisiye ozel.  */
function yoldaMi(oyuncu, kimlik) {
  return yolOku(oyuncu) === kimlik;
}

/* ============ 1. GETSUGA TENSHO (EntityGetsuga) ============ */
yetenekKaydet({
  kimlik: "getsuga", ad: "Getsuga Tenshō",
  esyasiz: true, sira: GETSUGA_SIRA,
  olustur(oyuncu) {
    if (!GETSUGA_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!yoldaMi(oyuncu, "getsuga")) return undefined;
    const c = ruhCarpani(oyuncu);
    try {
      actionbarYaz(oyuncu, "§b⚔ §fGetsuga Tenshō §7·×" + c.toFixed(1));
    } catch (e) { /* onemsiz */ }
    return mermiIsi({
      ad: "getsuga", oyuncu,
      hasar: GETSUGA_HASAR * c, menzil: GETSUGA_MENZIL * c,
      hiz: GETSUGA_HIZ, omur: GETSUGA_OMUR,
      parcacik: "minecraft:sonic_explosion", blokKir: GETSUGA_BLOK_KIR
    });
  }
});

/* ==== 2. BANKAI SARSINTI HALKASI (ItemBankai) ====
   Sinifta shockwaveRing · shockwaveMax · ringTimer · healTimer.
   YALNIZ KADEME 2'de: kaynakta da Bankai'ye ait.            */
yetenekKaydet({
  kimlik: "bankai_halka", ad: "Bankai Halkası",
  esyasiz: true, sira: HALKA_SIRA,
  olustur(oyuncu) {
    if (!HALKA_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!yoldaMi(oyuncu, "getsuga")) return undefined;
    if (kademeOku(oyuncu.id) < 2) {
      try { actionbarYaz(oyuncu, "§8Bankai gerekiyor"); } catch (e) { /* */ }
      return undefined;
    }
    const c = ruhCarpani(oyuncu);
    const boyut = oyuncu.dimension;
    let merkez;
    try { merkez = oyuncu.location; } catch (e) { return undefined; }

    /* healTimer'in karsiligi: halka acilirken kendine
       yenilenme. Kaynakta Bankai tasirken suruyor.          */
    try { oyuncu.addEffect("regeneration", HALKA_IYILES, { amplifier: 1 }); }
    catch (e) { /* onemsiz */ }

    let yaricap = 1;
    let sonraki = 0;
    const vurulan = new Set();
    return {
      ad: "bankai_halka", oyuncuId: oyuncu.id,
      calis() {
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + HALKA_ADIM;
        if (yaricap > HALKA_MAKS * c) return true;

        try { parcacikHalkasi(boyut, "minecraft:sonic_explosion",
                              merkez, 12, yaricap); } catch (e) { /* */ }
        let yakin;
        try {
          yakin = boyut.getEntities({ location: merkez, maxDistance: yaricap + 1 });
        } catch (e) { yakin = []; }
        for (const v of yakin) {
          try {
            if (!v || v.id === oyuncu.id || vurulan.has(v.id)) continue;
            if (v.typeId === "minecraft:item") continue;
            vurulan.add(v.id);
            v.applyDamage(HALKA_HASAR * c,
                          { cause: "entityAttack", damagingEntity: oyuncu });
            v.applyKnockback
              ? v.applyKnockback(v.location.x - merkez.x, v.location.z - merkez.z, 2, 0.4)
              : undefined;
          } catch (e) { /* onemsiz */ }
        }
        yaricap += 1;
        return false;
      }
    };
  }
});

/* ==== 3. CERO (EntityCeroCharge -> EntityCeroFired) ====
   Kaynakta IKI ASAMA: CHARGE/CHARGE_MAX ile onunde
   (infrontUser) toplaniyor, sonra fireCero ile ateslenıyor.
   Bizde de iki asama: once sarj isi, sonra mermi isi.       */
yetenekKaydet({
  kimlik: "cero", ad: "Cero",
  esyasiz: true, sira: CERO_SIRA,
  olustur(oyuncu) {
    if (!CERO_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!yoldaMi(oyuncu, "cero")) return undefined;
    const c = ruhCarpani(oyuncu);
    let sarj = 0;
    let ates;                 // ikinci asama: mermi isi

    /* TEK IS, IKI ASAMA. Ilk yazimda ates bitir() icinden
       aciliyordu ve bir kuyruk gerekiyordu -- cunku bitir()
       merkezi is listesi YURURKEN cagriliyor, oradan yeni is
       eklenemiyor. Tek is icinde asama degistirmek hem
       kuyrugu hem main.js'e dokunmayi gereksiz kildi.       */
    return {
      ad: "cero", oyuncuId: oyuncu.id,
      calis() {
        /* --- ASAMA 2: ates --- */
        if (ates) return ates.calis();

        /* --- ASAMA 1: sarj (CHARGE / CHARGE_MAX) --- */
        sarj++;
        if (sarj < CERO_SARJ) {
          try {
            const b = basKonumu(oyuncu), y = oyuncu.getViewDirection();
            parcacikAt(oyuncu.dimension, "minecraft:huge_explosion_emitter",
              { x: b.x + y.x * CERO_ONDE, y: b.y + y.y * CERO_ONDE,
                z: b.z + y.z * CERO_ONDE });
            if (sarj % 10 === 0) {
              actionbarYaz(oyuncu, "§c◉ §fCero §7· %" +
                           Math.round(sarj / CERO_SARJ * 100));
            }
          } catch (e) { /* onemsiz */ }
          return false;
        }

        /* Sarj doldu -> ates. Eksik sarjla cikilamiyor cunku
           burasi ancak tam sarjda calisiyor; oran yine de
           hesaplaniyor ki ileride yarida birakma eklenirse
           hasar kendiliginden oranli olsun.                 */
        const oran = Math.min(1, sarj / CERO_SARJ);
        ates = mermiIsi({
          ad: "cero_ates", oyuncu,
          hasar: CERO_HASAR * c * oran, menzil: CERO_MENZIL * c,
          hiz: CERO_HIZ, omur: CERO_OMUR,
          parcacik: "minecraft:huge_explosion_emitter", blokKir: CERO_BLOK_KIR
        });
        try { actionbarYaz(oyuncu, "§c◉ §fCero §7· ateşlendi"); }
        catch (e) { /* onemsiz */ }
        return ates ? false : true;
      }
    };
  }
});

/* ==== 4. QUINCY OKU (ItemQuincyBow / ItemLeztzBow) ====
   ItemLeztzBow'da UC KIP var, adlari sinifta aynen geciyor:
   RapidFire · WideShot · Charged. Her atis ruh yakiyor
   (spiritcost).                                             */
const quincyKip = new Map();      // oyuncuId -> kip indeksi
export function quincyUnut(id) {
  if (id === undefined) quincyKip.clear(); else quincyKip.delete(id);
}

yetenekKaydet({
  kimlik: "quincy_ok", ad: "Quincy Oku",
  esyasiz: true, sira: QUINCY_SIRA,
  olustur(oyuncu) {
    if (!QUINCY_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!yoldaMi(oyuncu, "letzt")) return undefined;

    /* Egilirken tetiklenirse KIP DEGISTIRIYOR, atmiyor.
       Kaynakta ayri bir tus var; bizde jest zaten egilmeyle
       geliyor, o yuzden ikinci bir isaret gerekliydi.       */
    let egik = false;
    try { egik = oyuncu.isSneaking === true; } catch (e) { /* */ }
    const simdiki = quincyKip.get(oyuncu.id) || 0;
    if (egik) {
      const yeni = (simdiki + 1) % QUINCY_KIPLER.length;
      quincyKip.set(oyuncu.id, yeni);
      try {
        actionbarYaz(oyuncu, "§b➶ §f" + QUINCY_KIPLER[yeni].ad +
                     " §8(" + (yeni + 1) + "/" + QUINCY_KIPLER.length + ")");
      } catch (e) { /* onemsiz */ }
      return undefined;
    }

    const bedel = QUINCY_BEDEL;
    if (ruhOku(oyuncu) < bedel) {
      try { actionbarYaz(oyuncu, "§b➶ §cRuh yetmiyor"); } catch (e) { /* */ }
      return undefined;
    }
    ruhYaz(oyuncu, ruhOku(oyuncu) - bedel);

    const kip = QUINCY_KIPLER[simdiki];
    const c = ruhCarpani(oyuncu);
    const boyut = oyuncu.dimension;
    let atilan = 0, sonraki = 0;
    try {
      actionbarYaz(oyuncu, "§b➶ §f" + kip.ad + " §7·×" + c.toFixed(1));
    } catch (e) { /* onemsiz */ }

    return {
      ad: "quincy_ok", oyuncuId: oyuncu.id,
      calis() {
        if (atilan >= kip.adet) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + (kip.aralik || 0);
        if (!varlikIste(1)) return false;
        atilan++;
        let b, y;
        try { b = basKonumu(oyuncu); y = oyuncu.getViewDirection(); }
        catch (e) { return true; }
        const sap = kip.yayilma;
        const yon = {
          x: y.x + (Math.random() * 2 - 1) * sap,
          y: y.y + (Math.random() * 2 - 1) * sap,
          z: y.z + (Math.random() * 2 - 1) * sap
        };
        try {
          const ok = boyut.spawnEntity("minecraft:arrow", {
            x: b.x + yon.x, y: b.y + yon.y, z: b.z + yon.z
          });
          if (ok && typeof ok.applyImpulse === "function") {
            ok.applyImpulse({ x: yon.x * 3, y: yon.y * 3, z: yon.z * 3 });
          }
        } catch (e) { hataYaz("quincy.ok", e); }
        return false;
      }
    };
  }
});

/* ==== 5. REISHI ZEMINI (BlockReishiPlatform) ====
   Sinifta CARPET_AABB · TRANSLUCENT · reishi_platform.
   Hirenkyaku: havada basacak zemin. toprak_izi'nin kardesi --
   ayni defter, ayni geri koyma borcu.                       */
const reishide = new Map();
export function reishiUnut(id) {
  if (id === undefined) reishide.clear(); else reishide.delete(id);
}

yetenekKaydet({
  kimlik: "reishi", ad: "Reishi Zemini",
  esyasiz: true, sira: REISHI_SIRA,
  olustur(oyuncu) {
    if (!REISHI_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!yoldaMi(oyuncu, "letzt")) return undefined;

    const varOlan = reishide.get(oyuncu.id);
    if (varOlan) { varOlan.kapat = true; return undefined; }

    const durum = { kapat: false };
    reishide.set(oyuncu.id, durum);
    const boyut = oyuncu.dimension;
    const kuyruk = [];
    const yazilan = new Set();
    const bitis = system.currentTick + REISHI_SURE;
    let sonAnahtar = "";

    function geriKoy(k) {
      try {
        const b = boyut.getBlock({ x: k.x, y: k.y, z: k.z });
        if (b && b.typeId === REISHI_BLOK) b.setType("minecraft:air");
      } catch (e) { hataYaz("reishi.geri", e); }
      yazilan.delete(k.a);
    }

    try { actionbarYaz(oyuncu, "§b❖ §fReishi zemini §aAÇIK"); }
    catch (e) { /* onemsiz */ }

    return {
      ad: "reishi", oyuncuId: oyuncu.id,
      calis() {
        if (durum.kapat) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick >= bitis) return true;

        let k;
        try { k = oyuncu.location; } catch (e) { return true; }
        const y = Math.floor(k.y - 0.5);
        const a0 = Math.floor(k.x) + "," + y + "," + Math.floor(k.z);
        if (a0 === sonAnahtar) return false;   // kimildamadi
        sonAnahtar = a0;

        const r = Math.max(0, REISHI_YARICAP);
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            const x = Math.floor(k.x) + dx, z = Math.floor(k.z) + dz;
            const a = x + "," + y + "," + z;
            if (yazilan.has(a)) continue;
            if (!blokIste(1)) return false;
            let blok;
            try { blok = boyut.getBlock({ x, y, z }); } catch (e) { continue; }
            /* YALNIZ HAVAYA konuyor: bu bir kopru, kazma
               degil. toprak_izi'nde de ayni ayrim var ama
               tersi -- orada havaya KONMUYOR.               */
            if (!blok || !blok.isAir) continue;
            try { blok.setType(REISHI_BLOK); } catch (e) { continue; }
            kuyruk.push({ a, x, y, z });
            yazilan.add(a);
            while (kuyruk.length > REISHI_TAVAN) geriKoy(kuyruk.shift());
          }
        }
        return false;
      },
      bitir() {
        reishide.delete(oyuncu.id);
        let n = 0;
        while (kuyruk.length > 0) { geriKoy(kuyruk.pop()); n++; }
        try {
          oyuncu.sendMessage("§7Reishi zemini kapandı §8· " + n + " blok geri alındı");
        } catch (e) { /* onemsiz */ }
      }
    };
  }
});

/* ==== YOL SECIMI ====
   Uc yol arasinda gecis. Her basista sirayi ilerletiyor;
   secim dinamik ozellikte, yani dunya kapanip acilinca
   duruyor (ruh.js yolYaz/yolOku).                          */
yetenekKaydet({
  kimlik: "ruh_yol", ad: "Ruh Yolu Seç",
  esyasiz: true, sira: RUH_YOL_SIRA,
  olustur(oyuncu) {
    if (!gecerliMi(oyuncu)) return undefined;
    const simdi = yolOku(oyuncu);
    let i = 0;
    for (let k = 0; k < RUH_YOLLAR.length; k++) {
      if (RUH_YOLLAR[k].kimlik === simdi) { i = k; break; }
    }
    const y = RUH_YOLLAR[(i + 1) % RUH_YOLLAR.length];
    yolYaz(oyuncu, y.kimlik);
    try {
      oyuncu.sendMessage("§b✦ §f" + y.ad + " §7· " + y.irk +
                         " §8(" + y.birinci + " → " + y.ikinci + ")");
      actionbarYaz(oyuncu, "§b✦ §f" + y.ad);
    } catch (e) { /* onemsiz */ }
    return undefined;
  }
});
