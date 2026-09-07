import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, basKonumu, parcacikAt, parcacikHalkasi,
  actionbarYaz, koniHedefleri
} from "../yardimcilar.js";
import { blokIste, varlikIste } from "../butce.js";
import {
  ruhCarpani, ruhOku, ruhYaz, karakterOku, karakterYaz
} from "./ruh.js";
import { mermiIsi } from "./ruh_yetenekler.js";
import {
  KARAKTER_ACIK, RUH_KARAKTERLER, KARAKTER_SIRA,
  ONIBI_ACIK, ONIBI_SIRA, ONIBI_MENZIL, ONIBI_ACI, ONIBI_HASAR,
  ONIBI_TAVAN, ONIBI_YAKMA, ONIBI_BEDEL,
  HALE_ACIK, HALE_SIRA, HALE_SURE, HALE_ADIM, HALE_YARICAP,
  HALE_HASAR, HALE_YAKMA, HALE_BEDEL,
  GAYZER_ACIK, GAYZER_SIRA, GAYZER_SURE, GAYZER_ADIM, GAYZER_KUTU,
  GAYZER_ADET, GAYZER_YUKSEK, GAYZER_HASAR, GAYZER_YAKMA, GAYZER_BEDEL,
  KESIK_ACIK, KESIK_SIRA, KESIK_MENZIL, KESIK_ACI, KESIK_HASAR,
  KESIK_TAVAN, KESIK_ITME, KESIK_BEDEL,
  UCLU_ACIK, UCLU_SIRA, UCLU_KAYDIR, UCLU_GECIKME, UCLU_HASAR,
  UCLU_MENZIL, UCLU_HIZ, UCLU_OMUR, UCLU_BEDEL,
  BERSERK_ACIK, BERSERK_SIRA, BERSERK_SURE, BERSERK_ADIM,
  BERSERK_MENZIL, BERSERK_YAKIN, BERSERK_HASAR, BERSERK_BEDEL,
  TETIK_ACIK, TETIK_SIRA, TETIK_MENZIL, TETIK_HIZ, TETIK_OMUR,
  TETIK_HASAR, TETIK_ZEHIR, TETIK_BEDEL,
  KAMI_ACIK, KAMI_SIRA, KAMI_MENZIL, KAMI_ACI, KAMI_HASAR,
  KAMI_TAVAN, KAMI_ZEHIR, KAMI_BEDEL,
  BUTO_ACIK, BUTO_SIRA, BUTO_ADET, BUTO_ADIM, BUTO_MENZIL,
  BUTO_ACI, BUTO_HASAR, BUTO_TAVAN, BUTO_BEDEL
} from "../ayarlar.js";

/* UC KARAKTERIN YETENEKLERI  --  IKINCI KATEGORI.

   Kaynak: BleachAwaken 1.6.1 (Deephantom, Forge 1.16.5).
   Sinif sabit havuzlari OKUNARAK cikarildi; jar calistirilmadi.
   Her yetenegin basinda hangi yordamdan geldigi yaziyor.

   ---- YOL'DAN FARKI ----
   Yol (ruh_yetenekler.js) ile karakter BAGIMSIZ secilir. Bir
   yetenek yalniz KENDI karakterinde acilir, tipki yol
   yeteneklerinin kendi yolunda acilmasi gibi. Ayni kalip
   bilerek: iki kategori ayni sekilde okunuyor.

   ---- KAYNAKTAN AYRILAN UC SEY ----
   1. HEPSI RUH YAKIYOR. Kaynakta reiatsu bedeli var ama tavan
      seviyeyle buyudugu icin mutlak sayilar gecmiyor; oran
      gecti (ayarlar.js'te tablo).
   2. HIC BLOK YAZMIYOR. Gayzer bile parcacik + hasar; kaynakta
      da oyle. Bu depoda blok yazan her sey defter tutuyor,
      gereksiz defter tutmuyoruz.
   3. KADEME AYRI KURULMADI. Kaynakta her karakterin uc formu
      ve her formda ayri esya var. Bizde kademe zaten
      RUH_KADEMELER; ikinci bir "form acik mi" defteri iki
      dogruluk kaynagi demekti.                               */

/* Bu yetenek bu karaktere mi ait? */
function karakterdeMi(oyuncu, kimlik) {
  return karakterOku(oyuncu) === kimlik;
}

/* Ruh bedeli. Yetmiyorsa yetenek SESSIZCE acilmiyor --
   actionbar'a bir satir yaziyor ve undefined donuyor.      */
function bedelAl(oyuncu, bedel, etiket) {
  if (ruhOku(oyuncu) < bedel) {
    try { actionbarYaz(oyuncu, etiket + " §cRuh yetmiyor"); }
    catch (e) { /* onemsiz */ }
    return false;
  }
  ruhYaz(oyuncu, ruhOku(oyuncu) - bedel);
  return true;
}

/* Koni vurusu: bir kerelik alan hasari. Onibi · Guclu Kesik ·
   Kamishini · Buto Renjin'in ortak govdesi.                 */
function koniVur(oyuncu, secenek) {
  let hedefler;
  try {
    hedefler = koniHedefleri(oyuncu, {
      menzil: secenek.menzil, aci: secenek.aci,
      tavan: secenek.tavan, oyuncuDahil: true
    });
  } catch (e) { hataYaz("karakter.koni", e); return 0; }

  let n = 0;
  for (const v of hedefler) {
    try {
      if (!varlikIste(1)) break;
      v.applyDamage(secenek.hasar,
                    { cause: "entityAttack", damagingEntity: oyuncu });
      if (secenek.yakma) v.setOnFire(secenek.yakma, true);
      if (secenek.zehir) v.addEffect("poison", secenek.zehir * 20, { amplifier: 1 });
      if (secenek.itme && v.applyKnockback) {
        const k = v.location, m = oyuncu.location;
        v.applyKnockback(k.x - m.x, k.z - m.z, secenek.itme, 0.4);
      }
      n++;
    } catch (e) { /* varlik kayboldu */ }
  }
  return n;
}

/* ============ RYUJIN 1/3 · ONIBI (OnibiProcedure) ============ */
yetenekKaydet({
  kimlik: "onibi", ad: "Onibi",
  esyasiz: true, sira: ONIBI_SIRA,
  olustur(oyuncu) {
    if (!ONIBI_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "ryujin")) return undefined;
    if (!bedelAl(oyuncu, ONIBI_BEDEL, "§6🔥 §fOnibi")) return undefined;
    const c = ruhCarpani(oyuncu);
    const n = koniVur(oyuncu, {
      menzil: ONIBI_MENZIL * c, aci: ONIBI_ACI, tavan: ONIBI_TAVAN,
      hasar: ONIBI_HASAR * c, yakma: ONIBI_YAKMA
    });
    try {
      parcacikHalkasi(oyuncu.dimension, "minecraft:basic_flame_particle",
                      oyuncu.location, 16, 3);
      actionbarYaz(oyuncu, "§6🔥 §fOnibi §7·×" + c.toFixed(1) +
                   " §8(" + n + ")");
    } catch (e) { /* onemsiz */ }
    return undefined;              // anlik, is acmiyor
  }
});

/* ==== RYUJIN 2/3 · ALEV HALESI (FlameAoeEffectTickProcedure) ====
   Kaynakta her tick tarayan bir kutu var; bizde HALE_ADIM
   tickte bir. Her tick taramak butcenin tamamini yerdi ve
   goze ayni gorunurdu.                                       */
yetenekKaydet({
  kimlik: "alev_halesi", ad: "Alev Halesi",
  esyasiz: true, sira: HALE_SIRA,
  olustur(oyuncu) {
    if (!HALE_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "ryujin")) return undefined;
    if (!bedelAl(oyuncu, HALE_BEDEL, "§6◎ §fAlev Halesi")) return undefined;

    const c = ruhCarpani(oyuncu);
    const boyut = oyuncu.dimension;
    const bitis = system.currentTick + HALE_SURE;
    let sonraki = 0;
    try { actionbarYaz(oyuncu, "§6◎ §fAlev Halesi §7·×" + c.toFixed(1)); }
    catch (e) { /* onemsiz */ }

    return {
      ad: "alev_halesi", oyuncuId: oyuncu.id,
      calis() {
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick >= bitis) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + HALE_ADIM;

        let merkez;
        try { merkez = oyuncu.location; } catch (e) { return true; }
        try {
          parcacikHalkasi(boyut, "minecraft:basic_flame_particle",
                          merkez, 14, HALE_YARICAP);
        } catch (e) { /* onemsiz */ }
        /* Hale ETRAFTA, onunde degil: aci -1 butun cevre. */
        koniVur(oyuncu, {
          menzil: HALE_YARICAP, aci: -1, tavan: ONIBI_TAVAN,
          hasar: HALE_HASAR * c, yakma: HALE_YAKMA
        });
        return false;
      }
    };
  }
});

/* ==== RYUJIN 3/3 · ATES GAYZERI (GeyserOfFireEffectTick) ====
   Kaynakta -6..6 kutu, 15 yukseklik. Blok YAZMIYOR: sutun
   parcacik, hasar varliga.                                   */
yetenekKaydet({
  kimlik: "ates_gayzeri", ad: "Ateş Gayzeri",
  esyasiz: true, sira: GAYZER_SIRA,
  olustur(oyuncu) {
    if (!GAYZER_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "ryujin")) return undefined;
    if (!bedelAl(oyuncu, GAYZER_BEDEL, "§6⇑ §fAteş Gayzeri")) return undefined;

    const c = ruhCarpani(oyuncu);
    const boyut = oyuncu.dimension;
    const bitis = system.currentTick + GAYZER_SURE;
    let sonraki = 0;
    try { actionbarYaz(oyuncu, "§6⇑ §fAteş Gayzeri §7·×" + c.toFixed(1)); }
    catch (e) { /* onemsiz */ }

    return {
      ad: "ates_gayzeri", oyuncuId: oyuncu.id,
      calis() {
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick >= bitis) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + GAYZER_ADIM;

        let m;
        try { m = oyuncu.location; } catch (e) { return true; }
        for (let i = 0; i < GAYZER_ADET; i++) {
          if (!varlikIste(1)) break;
          const x = m.x + (Math.random() * 2 - 1) * GAYZER_KUTU;
          const z = m.z + (Math.random() * 2 - 1) * GAYZER_KUTU;
          /* Sutun: dikey parcacik dizisi. Ucu havada bitiyor,
             yerle temas aranmiyor -- yer arasaydik her sutun
             icin blok okumasi gerekirdi, defter bosuna sisirdi. */
          for (let dy = 0; dy < GAYZER_YUKSEK; dy += 2) {
            try {
              parcacikAt(boyut, "minecraft:basic_flame_particle",
                         { x, y: m.y + dy, z });
            } catch (e) { break; }
          }
          let yakin;
          try {
            yakin = boyut.getEntities({
              location: { x, y: m.y, z }, maxDistance: 2.5,
              excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
            });
          } catch (e) { yakin = []; }
          for (const v of yakin) {
            try {
              if (!v || v.id === oyuncu.id) continue;
              v.applyDamage(GAYZER_HASAR * c,
                            { cause: "entityAttack", damagingEntity: oyuncu });
              v.setOnFire(GAYZER_YAKMA, true);
            } catch (e) { /* onemsiz */ }
          }
        }
        return false;
      }
    };
  }
});

/* ==== NOZARASHI 1/3 · GUCLU KESIK (StrongSlashProcedure) ====
   Kaynakta xRadius/zRadius kutu supurmesi. Kisa menzil, genis
   aci: Getsuga'nin tam tersi.                                */
yetenekKaydet({
  kimlik: "guclu_kesik", ad: "Güçlü Kesik",
  esyasiz: true, sira: KESIK_SIRA,
  olustur(oyuncu) {
    if (!KESIK_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "nozarashi")) return undefined;
    if (!bedelAl(oyuncu, KESIK_BEDEL, "§c⚔ §fGüçlü Kesik")) return undefined;
    const c = ruhCarpani(oyuncu);
    const n = koniVur(oyuncu, {
      menzil: KESIK_MENZIL, aci: KESIK_ACI, tavan: KESIK_TAVAN,
      hasar: KESIK_HASAR * c, itme: KESIK_ITME
    });
    try {
      parcacikHalkasi(oyuncu.dimension, "minecraft:critical_hit_emitter",
                      oyuncu.location, 12, 2);
      actionbarYaz(oyuncu, "§c⚔ §fGüçlü Kesik §7·×" + c.toFixed(1) +
                   " §8(" + n + ")");
    } catch (e) { /* onemsiz */ }
    return undefined;
  }
});

/* ==== NOZARASHI 2/3 · UCLU KESIK (TripleSlashProcedure) ====
   Kaynakta 1.5 / 0 / -1.5 yanal ofset ve gecikme. Uc AYRI is
   acmiyoruz: AYNI_ANDA=2 tavanina takilirdi ve ikisi
   dogmadan olurdu. Tek is, icinde uc mermi.                  */
yetenekKaydet({
  kimlik: "uclu_kesik", ad: "Üçlü Kesik",
  esyasiz: true, sira: UCLU_SIRA,
  olustur(oyuncu) {
    if (!UCLU_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "nozarashi")) return undefined;
    if (!bedelAl(oyuncu, UCLU_BEDEL, "§c⋙ §fÜçlü Kesik")) return undefined;

    const c = ruhCarpani(oyuncu);
    const mermiler = [];
    let acilan = 0, sonraki = 0;
    try { actionbarYaz(oyuncu, "§c⋙ §fÜçlü Kesik §7·×" + c.toFixed(1)); }
    catch (e) { /* onemsiz */ }

    return {
      ad: "uclu_kesik", oyuncuId: oyuncu.id,
      calis() {
        /* Sirayla ac, hepsini birlikte yurut. */
        if (acilan < UCLU_KAYDIR.length && system.currentTick >= sonraki) {
          sonraki = system.currentTick + UCLU_GECIKME;
          const m = mermiIsi({
            ad: "uclu_kesik_" + acilan, oyuncu,
            hasar: UCLU_HASAR * c, menzil: UCLU_MENZIL * c,
            hiz: UCLU_HIZ, omur: UCLU_OMUR,
            parcacik: "minecraft:critical_hit_emitter",
            blokKir: false, kaydir: UCLU_KAYDIR[acilan]
          });
          acilan++;
          if (m) mermiler.push(m);
        }
        for (let i = mermiler.length - 1; i >= 0; i--) {
          let bitti = true;
          try { bitti = mermiler[i].calis(); } catch (e) { bitti = true; }
          if (bitti) mermiler.splice(i, 1);
        }
        return acilan >= UCLU_KAYDIR.length && mermiler.length === 0;
      }
    };
  }
});

/* ==== NOZARASHI 3/3 · BERSERK (Berserk2OnEffectActiveTick) ====
   Kaynakta tick basina hedefe ISINMA (CanTeleport + shunpo
   sesi + pence parcaciklari). Bu ailenin en ozgun mekanigi.

   ISINMANIN IKI SINIRI (ayarlar.js'te gerekcesi):
     1. hedefin YANINA, ustune degil
     2. varis yeri ve ustu HAVA degilse isinma yok
   Oyuncuyu duvara sokan bir yetenek bu depoda olmaz.        */
const berserkte = new Map();
export function berserkUnut(id) {
  if (id === undefined) berserkte.clear(); else berserkte.delete(id);
}

yetenekKaydet({
  kimlik: "berserk", ad: "Berserk",
  esyasiz: true, sira: BERSERK_SIRA,
  olustur(oyuncu) {
    if (!BERSERK_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "nozarashi")) return undefined;

    /* Acikken tekrar tetiklenirse KAPANIYOR (reishi'nin
       kalibi): ayniIsVarMi yeni is acilmasini engelledigi
       icin kapatma buradan yapiliyor.                       */
    const varOlan = berserkte.get(oyuncu.id);
    if (varOlan) { varOlan.kapat = true; return undefined; }
    if (!bedelAl(oyuncu, BERSERK_BEDEL, "§4⚡ §fBerserk")) return undefined;

    const durum = { kapat: false };
    berserkte.set(oyuncu.id, durum);
    const c = ruhCarpani(oyuncu);
    const boyut = oyuncu.dimension;
    const bitis = system.currentTick + BERSERK_SURE;
    let sonraki = 0;
    try {
      oyuncu.addEffect("speed", BERSERK_SURE, { amplifier: 1 });
      actionbarYaz(oyuncu, "§4⚡ §fBerserk §aAÇIK §7·×" + c.toFixed(1));
    } catch (e) { /* onemsiz */ }

    return {
      ad: "berserk", oyuncuId: oyuncu.id,
      calis() {
        if (durum.kapat) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick >= bitis) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + BERSERK_ADIM;

        /* aci -1: berserk yon gozetmiyor, en yakini aliyor. */
        let hedefler;
        try {
          hedefler = koniHedefleri(oyuncu, {
            menzil: BERSERK_MENZIL, aci: -1, tavan: 1, oyuncuDahil: true
          });
        } catch (e) { return false; }
        const hedef = hedefler && hedefler[0];
        if (!hedef) return false;

        try {
          const h = hedef.location, b = oyuncu.location;
          const dx = b.x - h.x, dz = b.z - h.z;
          const uz = Math.hypot(dx, dz) || 1;
          const varis = { x: h.x + (dx / uz) * BERSERK_YAKIN,
                          y: h.y,
                          z: h.z + (dz / uz) * BERSERK_YAKIN };
          /* Iki blok birden okunuyor: ayak ve bas. Biri bile
             dolu ise isinma yok -- yerinde vuruyoruz.        */
          if (blokIste(2)) {
            const ayak = boyut.getBlock(varis);
            const bas = boyut.getBlock({ x: varis.x, y: varis.y + 1, z: varis.z });
            if (ayak && bas && ayak.isAir && bas.isAir) {
              oyuncu.teleport(varis, { dimension: boyut });
              parcacikAt(boyut, "minecraft:critical_hit_emitter", varis);
            }
          }
          if (varlikIste(1)) {
            hedef.applyDamage(BERSERK_HASAR * c,
                              { cause: "entityAttack", damagingEntity: oyuncu });
          }
        } catch (e) { hataYaz("berserk.atak", e); }
        return false;
      },
      bitir() {
        berserkte.delete(oyuncu.id);
        try { actionbarYaz(oyuncu, "§4⚡ §7Berserk kapandı"); }
        catch (e) { /* onemsiz */ }
      }
    };
  }
});

/* ==== SHINSO 1/3 · TETIK (ShinsoTriggerProcedure) ====
   Sinifta double 100.0 -- Shinso'nun butun olayi bu. Delici:
   ilk hedefte durmuyor, hattaki herkesi birer kez vuruyor.  */
yetenekKaydet({
  kimlik: "tetik", ad: "Tetik",
  esyasiz: true, sira: TETIK_SIRA,
  olustur(oyuncu) {
    if (!TETIK_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "shinso")) return undefined;
    if (!bedelAl(oyuncu, TETIK_BEDEL, "§d➤ §fTetik")) return undefined;
    const c = ruhCarpani(oyuncu);
    try { actionbarYaz(oyuncu, "§d➤ §fTetik §7·×" + c.toFixed(1)); }
    catch (e) { /* onemsiz */ }
    return mermiIsi({
      ad: "tetik", oyuncu,
      hasar: TETIK_HASAR * c, menzil: TETIK_MENZIL,
      hiz: TETIK_HIZ, omur: TETIK_OMUR,
      parcacik: "minecraft:critical_hit_emitter", blokKir: false,
      carpinca(v) {
        try { v.addEffect("poison", TETIK_ZEHIR * 20, { amplifier: 1 }); }
        catch (e) { /* onemsiz */ }
      }
    });
  }
});

/* ==== SHINSO 2/3 · KAMISHINI NO YARI (KamishiniNoYari) ====
   Koni + uzun zehir. Tetik'ten farki: yakin ve genis --
   kacani degil, cevreni temizliyor.                        */
yetenekKaydet({
  kimlik: "kamishini", ad: "Kamishini no Yari",
  esyasiz: true, sira: KAMI_SIRA,
  olustur(oyuncu) {
    if (!KAMI_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "shinso")) return undefined;
    if (!bedelAl(oyuncu, KAMI_BEDEL, "§d☠ §fKamishini")) return undefined;
    const c = ruhCarpani(oyuncu);
    const n = koniVur(oyuncu, {
      menzil: KAMI_MENZIL * c, aci: KAMI_ACI, tavan: KAMI_TAVAN,
      hasar: KAMI_HASAR * c, zehir: KAMI_ZEHIR
    });
    try {
      actionbarYaz(oyuncu, "§d☠ §fKamishini no Yari §7·×" + c.toFixed(1) +
                   " §8(" + n + ")");
    } catch (e) { /* onemsiz */ }
    return undefined;
  }
});

/* ==== SHINSO 3/3 · BUTO RENJIN (ButoRenjin -> ButoRenjinShot) ====
   Dis yordam ic yordami tekrar tekrar cagiriyor: kisa menzilli
   bir yaylim.                                                */
yetenekKaydet({
  kimlik: "buto_renjin", ad: "Butō Renjin",
  esyasiz: true, sira: BUTO_SIRA,
  olustur(oyuncu) {
    if (!BUTO_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (!karakterdeMi(oyuncu, "shinso")) return undefined;
    if (!bedelAl(oyuncu, BUTO_BEDEL, "§d≡ §fButō Renjin")) return undefined;

    const c = ruhCarpani(oyuncu);
    let atilan = 0, sonraki = 0;
    try { actionbarYaz(oyuncu, "§d≡ §fButō Renjin §7·×" + c.toFixed(1)); }
    catch (e) { /* onemsiz */ }

    return {
      ad: "buto_renjin", oyuncuId: oyuncu.id,
      calis() {
        if (atilan >= BUTO_ADET) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + BUTO_ADIM;
        atilan++;
        koniVur(oyuncu, {
          menzil: BUTO_MENZIL * c, aci: BUTO_ACI, tavan: BUTO_TAVAN,
          hasar: BUTO_HASAR * c
        });
        try {
          parcacikAt(oyuncu.dimension, "minecraft:critical_hit_emitter",
                     basKonumu(oyuncu));
        } catch (e) { /* onemsiz */ }
        return false;
      }
    };
  }
});

/* ==== KARAKTER SECIMI ====
   Yol secimiyle ayni kalip, ayri anahtar.                  */
yetenekKaydet({
  kimlik: "karakter_sec", ad: "Karakter Seç",
  esyasiz: true, sira: KARAKTER_SIRA,
  olustur(oyuncu) {
    if (!KARAKTER_ACIK || !gecerliMi(oyuncu)) return undefined;
    const simdi = karakterOku(oyuncu);
    let i = 0;
    for (let k = 0; k < RUH_KARAKTERLER.length; k++) {
      if (RUH_KARAKTERLER[k].kimlik === simdi) { i = k; break; }
    }
    const y = RUH_KARAKTERLER[(i + 1) % RUH_KARAKTERLER.length];
    karakterYaz(oyuncu, y.kimlik);
    try {
      oyuncu.sendMessage("§6✦ §f" + y.ad + " §7· " + y.sahip +
                         " §8(" + y.tema + ")");
      actionbarYaz(oyuncu, "§6✦ §f" + y.ad);
    } catch (e) { /* onemsiz */ }
    return undefined;
  }
});
