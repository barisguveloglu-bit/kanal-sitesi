import { system } from "@minecraft/server";
import { patlamaIste } from "../butce.js";
import {
  hataYaz, gecerliMi, actionbarYaz, varlikKonumu, parcacikAt
} from "../yardimcilar.js";
import {
  SILAH_ACIK, SILAHLAR, SILAH_ADIM, SILAH_KALINLIK,
  SILAH_IZ_ARALIK, SILAH_IZ_PARCACIK, SILAH_TAVAN,
  KORUNAN_KUME, DONDUR_GIRDI_KILIT, DONDUR_KAMERA_KILIT,
  SERSEM_YAVASLIK, SERSEM_GUCSUZ, botTuruMu
} from "../ayarlar.js";

/* ============================================================
   SILAH SISTEMI  (v4.87)

   Kullanici: "silahla alakali olan tum seyleri al, bedrock'a
   uyumlu yap."

   Referansta (Zabri Studios BoraLo Mod) 11 atesli silah var ve
   HEPSININ iskeleti ayni: esya + mermi + bekleme + ses +
   carpma etkisi. Farklari sadece sayilar. O yuzden burada da
   tek bir motor var; silahlar ayarlar.js:SILAHLAR tablosunda
   birer SATIR.

   ---- MERMI VARLIGI YOK, ISIN TARAMASI VAR ----
   Java'da her silah ucan bir mermi VARLIGI doguruyor.
   Bedrock'ta bu varlik butcesini yer (tick basina dort) ve her
   atis bir varlik demek. Bunun yerine goz lazerinin ray
   yurüyüsünun aynisi kullaniliyor: anlik, bedava, zaten
   calistigi bilinen kod. Ucus HISSI parcacik iziyle veriliyor.

   Tek kayip: bazukanin roketi havada suzulmuyor, patlama
   dogrudan carpma noktasinda oluyor. Sonuc ayni.
   ============================================================ */

/* oyuncuId -> { silah: son atis tick'i } */
const beklemeler = new Map();

export function silahUnut(oyuncuId) {
  beklemeler.delete(oyuncuId);
}

/* Esya kimliginden silah tanimini bulur. Tablo kucuk (alti
   satir) oldugu icin dogrusal arama yeterli; her atista tek
   kez donuyor.                                               */
export function silahiBul(esyaKimligi) {
  if (!esyaKimligi) return undefined;
  for (const [kimlik, t] of SILAHLAR) {
    if (t.esya === esyaKimligi) return { kimlik, ...t };
  }
  return undefined;
}

/* ---------------- Mermi ----------------
   Referansta da mermi gercekten tuketiliyor. Tuketilmeseydi
   silahlar dengeyi tek basina bozardi -- lazerden farksiz
   ama beklemesiz olurlardi.                                  */
function mermiSay(oyuncu, mermi) {
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    const kutu = env && env.container;
    if (!kutu) return 0;
    let toplam = 0;
    for (let i = 0; i < kutu.size; i++) {
      const e = kutu.getItem(i);
      if (e && e.typeId === mermi) toplam += e.amount;
    }
    return toplam;
  } catch (e) {
    return 0;
  }
}

function mermiHarca(oyuncu, mermi) {
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    const kutu = env && env.container;
    if (!kutu) return false;
    for (let i = 0; i < kutu.size; i++) {
      const e = kutu.getItem(i);
      if (!e || e.typeId !== mermi) continue;
      if (e.amount <= 1) kutu.setItem(i, undefined);
      else { e.amount -= 1; kutu.setItem(i, e); }
      return true;
    }
  } catch (e) {
    hataYaz("silah.mermiHarca", e);
  }
  return false;
}

/* ---------------- Kilit (asa.js ile ayni kural) ---------------- */
function girdiKilidi(hedef, acikMi) {
  if (!DONDUR_GIRDI_KILIT) return;
  if (hedef.typeId !== "minecraft:player") return;
  if (typeof hedef.runCommand !== "function") return;
  const deger = acikMi ? "enabled" : "disabled";
  try {
    hedef.runCommand("inputpermission set @s movement " + deger);
    if (DONDUR_KAMERA_KILIT) {
      hedef.runCommand("inputpermission set @s camera " + deger);
    }
  } catch (e) { /* komut eski surumlerde yok */ }
}

/* Sersemletici: kilit + yavaslik. Suresi dolunca acan taraf
   silahTara(); kilit hep cift.                               */
const sersemler = new Map();

function sersemlet(hedef, sure) {
  try {
    hedef.addEffect("slowness", sure,
                    { amplifier: SERSEM_YAVASLIK, showParticles: false });
  } catch (e) { /* efekt verilemedi */ }
  try {
    hedef.addEffect("weakness", sure,
                    { amplifier: SERSEM_GUCSUZ, showParticles: false });
  } catch (e) { /* efekt verilemedi */ }
  girdiKilidi(hedef, false);
  sersemler.set(hedef.id, { varlik: hedef, bitis: system.currentTick + sure });
}

/* Merkezi tick'ten cagriliyor. Defter bosken hic donmuyor. */
export function silahTara() {
  if (sersemler.size === 0) return;
  const simdi = system.currentTick;
  for (const [id, kayit] of sersemler) {
    if (!gecerliMi(kayit.varlik)) { sersemler.delete(id); continue; }
    if (simdi < kayit.bitis) continue;
    sersemler.delete(id);
    girdiKilidi(kayit.varlik, true);
    try { kayit.varlik.removeEffect("slowness"); } catch (e) { /* onemsiz */ }
    try { kayit.varlik.removeEffect("weakness"); } catch (e) { /* onemsiz */ }
  }
}

/* Sadece testler icin. */
export function defteriUnut() {
  beklemeler.clear();
  sersemler.clear();
}

/* ---------------- Hedef bulma ----------------
   Goz lazerinin izdusum suzgecinin aynisi: bir kure taramasi,
   sonra isina izdusum. Kure yaricapi menzil + kalinlik --
   lazerde bu bir hataydi (uctaki hedefler kureye sigmiyordu),
   burada bastan dogru yaziliyor.                             */
function hedefleriBul(oyuncu, bas, yon, t) {
  let yakin;
  try {
    yakin = oyuncu.dimension.getEntities({
      location: bas,
      maxDistance: t.menzil + SILAH_KALINLIK,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) {
    return [];
  }

  const vurulanlar = [];
  for (const varlik of yakin) {
    try {
      if (varlik.id === oyuncu.id) continue;            // kendimize asla
      if (!gecerliMi(varlik)) continue;
      /* Kendi botlarini vurma: lazerde ve dislerde ayni kural. */
      if (botTuruMu(varlik.typeId)) continue;

      const k = varlik.location;
      const dx = k.x - bas.x, dy = k.y - bas.y, dz = k.z - bas.z;
      const ileri = dx * yon.x + dy * yon.y + dz * yon.z;
      if (ileri < 0 || ileri > t.menzil) continue;
      const sapmaKare = (dx * dx + dy * dy + dz * dz) - ileri * ileri;
      if (sapmaKare > SILAH_KALINLIK * SILAH_KALINLIK) continue;

      vurulanlar.push({ varlik, ileri });
    } catch (e) { /* varlik okunamadi */ }
  }
  vurulanlar.sort((a, b) => a.ileri - b.ileri);
  return vurulanlar;
}

/* Isinin ilk DEGDIGI blok. Patlama ve iz uzunlugu icin.
   Donen: {x,y,z,uzak} ya da menzil sonu.                    */
function carpmaNoktasi(boyut, bas, yon, menzil) {
  const koord = { x: 0, y: 0, z: 0 };
  for (let d = SILAH_ADIM; d <= menzil; d += SILAH_ADIM) {
    const x = bas.x + yon.x * d, y = bas.y + yon.y * d, z = bas.z + yon.z * d;
    try {
      koord.x = Math.floor(x); koord.y = Math.floor(y); koord.z = Math.floor(z);
      const b = boyut.getBlock(koord);
      if (b && !b.isAir) return { x, y, z, uzak: d, blok: b };
    } catch (e) {
      /* Yuklenmemis parca ya da dunya siniri: menzil sonu say. */
      break;
    }
  }
  return {
    x: bas.x + yon.x * menzil,
    y: bas.y + yon.y * menzil,
    z: bas.z + yon.z * menzil,
    uzak: menzil, blok: undefined
  };
}

/* ---------------- Ates ----------------
   Donen: {hata} ya da {vuran, uzak}.                         */
export function silahAtes(oyuncu, t) {
  if (!SILAH_ACIK) return { hata: "Silahlar kapali." };
  if (!gecerliMi(oyuncu)) return { hata: "Oyuncu gecersiz." };

  const simdi = system.currentTick;
  const defter = beklemeler.get(oyuncu.id) || {};
  const son = defter[t.kimlik];
  if (son !== undefined && simdi - son < t.bekleme) {
    const kalan = ((t.bekleme - (simdi - son)) / 20).toFixed(1);
    return { hata: "§8" + t.ad + " dolduruluyor §7· " + kalan + " sn" };
  }

  if (t.mermi) {
    if (mermiSay(oyuncu, t.mermi) < 1) {
      return { hata: "§c" + t.ad + " boş §7· mermi gerekiyor" };
    }
    if (!mermiHarca(oyuncu, t.mermi)) {
      return { hata: "§c" + t.ad + " mermisi alınamadı" };
    }
  }

  defter[t.kimlik] = simdi;
  beklemeler.set(oyuncu.id, defter);

  let bas, yon, boyut;
  try {
    bas = oyuncu.getHeadLocation();
    yon = oyuncu.getViewDirection();
    boyut = oyuncu.dimension;
  } catch (e) {
    return { hata: "Bakış okunamadı." };
  }
  if (!bas || !yon || !boyut) return { hata: "Bakış okunamadı." };

  const carpma = carpmaNoktasi(boyut, bas, yon, t.menzil);

  /* ---- IZ: mermiyi GORMEK icin ----
     Varlik dogurmuyoruz; parcacik izi ucus hissini veriyor ve
     hicbir butce yemiyor.                                    */
  for (let d = SILAH_IZ_ARALIK; d < carpma.uzak; d += SILAH_IZ_ARALIK) {
    parcacikAt(boyut, SILAH_IZ_PARCACIK, {
      x: bas.x + yon.x * d, y: bas.y + yon.y * d, z: bas.z + yon.z * d
    });
  }

  try {
    if (t.ses) boyut.playSound(t.ses, bas);
  } catch (e) { /* ses yoksa onemsiz */ }

  /* ---- HEDEFLER ---- */
  const hedefler = hedefleriBul(oyuncu, bas, yon, t);
  let vuran = 0;
  for (const h of hedefler) {
    if (vuran >= SILAH_TAVAN) break;
    /* Delici degilse ILK hedefte duruyor: gercek bir kursun
       gibi. Delici olanlar sirayi delip geciyor.             */
    if (!t.delici && vuran >= 1) break;
    /* Hedef DUVARIN ARKASINDA ise vurulmamali. */
    if (h.ileri > carpma.uzak + 1) continue;

    try {
      if (t.hasar > 0) {
        h.varlik.applyDamage(t.hasar, {
          cause: "projectile", damagingEntity: oyuncu
        });
      }
      if (t.sersem) sersemlet(h.varlik, t.sersem);
      if (t.ceker) {
        /* Yercekimi silahi: hedefi kendine dogru cekiyor.
           Hasar vermiyor -- tasima araci.                    */
        const k = varlikKonumu(h.varlik);
        const dx = bas.x - k.x, dy = bas.y - k.y, dz = bas.z - k.z;
        const uz = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        h.varlik.applyKnockback
          ? h.varlik.applyKnockback(dx / uz, dz / uz, 1.6, 0.35)
          : h.varlik.applyImpulse({ x: dx / uz, y: 0.35, z: dz / uz });
      }
      vuran++;
    } catch (e) {
      hataYaz("silah.vurus", e);
    }
  }

  /* ---- PATLAMA (bazuka) ----
     Patlama butcesi ayri ve dusuk: tick basina bir kac tane.
     Bulunamazsa atis yine sayiliyor, sadece patlama olmuyor. */
  if (t.patlama) {
    if (patlamaIste(1) >= 1) {
      try {
        boyut.createExplosion(
          { x: carpma.x, y: carpma.y, z: carpma.z },
          t.patlama,
          /* Blok kirmasi ACIK ama korunanlar zaten patlamaya
             dayanikli (mezar tasi, heykel). Sandiklar vanilla
             patlamada da kirilabiliyor -- burada oyunun kendi
             kurallarindan sapmiyoruz.                        */
          { breaksBlocks: true, causesFire: false, source: oyuncu }
        );
      } catch (e) {
        /* Bazi surumlerde secenekler farkli: sade cagriyi dene. */
        try {
          boyut.createExplosion(
            { x: carpma.x, y: carpma.y, z: carpma.z }, t.patlama);
        } catch (e2) {
          hataYaz("silah.patlama", e2);
        }
      }
    }
  }

  return { vuran, uzak: Math.round(carpma.uzak) };
}

/* main.js'in itemUse dalindan cagriliyor.
   Donen: mesaj (actionbar'a yazilacak) ya da undefined.      */
export function silahKullan(oyuncu, esyaKimligi) {
  const t = silahiBul(esyaKimligi);
  if (!t) return undefined;

  const sonuc = silahAtes(oyuncu, t);
  if (sonuc.hata) {
    actionbarYaz(oyuncu, sonuc.hata);
    return sonuc;
  }
  actionbarYaz(oyuncu,
    "§6➤ §f" + t.ad + " §7· " + sonuc.vuran + " isabet §8· " +
    sonuc.uzak + " blok");
  return sonuc;
}
