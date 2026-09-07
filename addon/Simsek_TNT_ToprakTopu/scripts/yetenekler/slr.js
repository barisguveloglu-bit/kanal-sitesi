import { system } from "@minecraft/server";
import { yetenekKaydet, esyaninYetenekleri } from "./kayit.js";
import {
  hataYaz, gecerliMi, eldekiEsya, parcacikAt,
  parcacikHalkasi, actionbarYaz, koniHedefleri
} from "../yardimcilar.js";
import { varlikIste } from "../butce.js";
import { ruhCarpani } from "./ruh.js";
import {
  SLR_ACIK, SLR_ORAN, SLR_STAT, SLR_STAT_TAVAN, SLR_RUTBELER, SLR_KOL_KES,
  SLR_KILIC_ACIK, SLR_KILIC_SIRA, SLR_KILIC_MENZIL, SLR_KILIC_ACI,
  SLR_KILIC_HASAR, SLR_KILIC_TAVAN, SLR_KILIC_ITME, SLR_KILIC_ZAYIF,
  SLR_HANCER_ACIK, SLR_HANCER_SIRA, SLR_HANCER_MENZIL, SLR_HANCER_ACI,
  SLR_HANCER_ADET, SLR_HANCER_ADIM, SLR_HANCER_HASAR, SLR_HANCER_YAVAS
} from "../ayarlar.js";

/* SLR · SOLO LEVELING SILAHLARI.

   Kaynak "SLR 1.7.8" bir CurseForge MODPAKETI; mod jar'lari
   icinde YOK. Silahlarin hasar sayilari olculemedi, secim
   gorev agacindan ve adlandirmadan yapildi -- gerekcesi
   ayarlar.js'te ve REFERANS_SLR.md'de.

   ---- KOL TAKILIYKEN KAPALI ----
   Kullanici: "Toprak kol taktigimda bitecek, kol takmadigim
   zaman bu gucler acilacak."

   Bunun IKI yarisi var ve yalniz biri kendiliginden vardi:
     1. TETIKLEME. Zaten esyasiz jest sirasindan geliyor;
        elde kol varsa main.js genel siraya HIC bakmiyor.
     2. SUREN IS. Iste eksik olan buydu: bir is baslamisken
        ortasinda kol takilinca is devam ediyordu. Asagidaki
        kolTakili() her tick ele bakiyor ve kol gorurse is
        kendini kapatiyor.
   Ikincisi olmadan "kol takinca biter" yalan olurdu.       */

/* Elinde YETENEGI OLAN bir esya var mi -- yani kol.
   Olcut main.js'in kullandiginin AYNISI (esyaninYetenekleri):
   "kol" diye ayri bir liste tutsaydik iki tanim zamanla
   ayrisirdi ve biri kolu gorup oteki gormezdi.             */
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

/* SLR isleri her tick bunu soruyor. Ayar kapaliysa hep false,
   yani eski davranis (is kol takilinca da surer).          */
function kesilsinMi(oyuncu) {
  if (!SLR_KOL_KES) return false;
  try { return kolTakili(oyuncu); } catch (e) { return false; }
}

/* Guc kapisi: rutbe orani X ruh carpani. Tek yerde, cunku
   iki ayri hesap er gec ayrisir (yol/karakter ailelerinde de
   ayni karar verildi).                                     */
function slrGuc(oyuncu) {
  return SLR_ORAN * ruhCarpani(oyuncu);
}

/* Rutbe harfi. Kaynaktan okunan merdiven E·D·C·B·A·S ve S
   TAVANIN kendisi: tavanin altindaki her deger en fazla A
   olabiliyor. Kullanicinin "tavanin 10 altı" kurali boylece
   ekranda da gorunuyor -- 90/100 A, yalniz 100 S.          */
/* Sayilari PARAMETRE aliyor, sabitleri okumuyor: tavandaki
   dal (S) ancak boyle sinanabilir -- SLR_STAT modul sabiti,
   test icinde degistirilemez. Mutasyon tam oradan kacmisti. */
export function slrRutbe(stat = SLR_STAT, tavan = SLR_STAT_TAVAN) {
  const n = SLR_RUTBELER.length;
  if (stat >= tavan) return SLR_RUTBELER[n - 1];
  /* "A tavani" burada ZORLANMIYOR, yukaridaki dal zaten
     zorluyor: i ancak stat >= tavan iken n-1'e ulasabiliyor
     ve o durum yukarida donuyor. Ilk yazimda burada bir de
     Math.min(n-2, i) vardi; mutasyon testi onu n-1 yapinca
     hicbir sey degismedi -- cunku o satira hic ulasilmiyordu.
     Olu bir savunma satiri, dogru gorunse bile olu.        */
  const i = Math.floor(stat / tavan * (n - 1));
  return SLR_RUTBELER[Math.max(0, Math.min(n - 1, i))];
}

const rutbeYazisi = "§8[" + slrRutbe() + " · " + SLR_STAT + "/" +
                    SLR_STAT_TAVAN + "]";

/* ==== 1. SEYTAN KRALI'NIN UZUN KILICI ====
   demon_kings_long_sword -- gorev dosyalarindaki tek uzun
   kilic. Genis yay, agir vurus, savurma + zayiflik.        */
yetenekKaydet({
  kimlik: "slr_kilic", ad: "Şeytan Kralı'nın Uzun Kılıcı",
  esyasiz: true, sira: SLR_KILIC_SIRA,
  olustur(oyuncu) {
    if (!SLR_ACIK || !SLR_KILIC_ACIK || !gecerliMi(oyuncu)) return undefined;
    /* Anlik yetenek: is acmadigi icin "her tick kol var mi"
       denetimi anlamsiz. Tetiklendigi anda bakiyoruz --
       jest zaten elde kol varken buraya gelmiyor, bu ikinci
       kapi lazer modu gibi yollardan gelen cagriya karsi.  */
    if (kesilsinMi(oyuncu)) return undefined;

    const g = slrGuc(oyuncu);
    let hedefler;
    try {
      hedefler = koniHedefleri(oyuncu, {
        menzil: SLR_KILIC_MENZIL, aci: SLR_KILIC_ACI,
        tavan: SLR_KILIC_TAVAN, oyuncuDahil: true
      });
    } catch (e) { hataYaz("slr.kilic", e); return undefined; }

    let n = 0;
    for (const v of hedefler) {
      try {
        if (!varlikIste(1)) break;
        v.applyDamage(SLR_KILIC_HASAR * g,
                      { cause: "entityAttack", damagingEntity: oyuncu });
        v.addEffect("weakness", SLR_KILIC_ZAYIF * 20, { amplifier: 1 });
        if (v.applyKnockback) {
          const k = v.location, m = oyuncu.location;
          v.applyKnockback(k.x - m.x, k.z - m.z, SLR_KILIC_ITME, 0.4);
        }
        n++;
      } catch (e) { /* varlik kayboldu */ }
    }
    try {
      parcacikHalkasi(oyuncu.dimension, "minecraft:sonic_explosion",
                      oyuncu.location, 14, 3);
      actionbarYaz(oyuncu, "§5⚔ §fŞeytan Kralı'nın Kılıcı §7·×" +
                   g.toFixed(2) + " " + rutbeYazisi + " §8(" + n + ")");
    } catch (e) { /* onemsiz */ }
    return undefined;
  }
});

/* ==== 2. BARUKA'NIN HANCERI ====
   barukas_dagger -- gorev agacinin en ucundaki adli silah.
   Uzun kilicin zitti: TEK hedefe hizli ard arda vurus.

   ---- 10 TICK DOKUNULMAZLIGI ----
   Minecraft'ta bir varlik hasar aldiktan sonra 10 tick
   dokunulmaz. SLR_HANCER_ADIM 3 olsaydi yedi vurusun ancak
   ikisi sayilirdi. Bunun icin her vurusta hedef DEGISIYOR:
   listedeki siradaki hedefe geciyoruz, tek hedef varsa
   vurus yine de sayiliyor cunku applyDamage'in "daha buyuk
   hasar farki gecer" kurali disinda kalmasin diye hasar
   sabit tutuluyor -- yani tek hedefte hancer bir supurme,
   kalabalikta bir yaylim.                                 */
yetenekKaydet({
  kimlik: "slr_hancer", ad: "Baruka'nın Hançeri",
  esyasiz: true, sira: SLR_HANCER_SIRA,
  olustur(oyuncu) {
    if (!SLR_ACIK || !SLR_HANCER_ACIK || !gecerliMi(oyuncu)) return undefined;
    if (kesilsinMi(oyuncu)) return undefined;

    const g = slrGuc(oyuncu);
    let atilan = 0, sonraki = 0, sira = 0;
    try {
      actionbarYaz(oyuncu, "§5🗡 §fBaruka'nın Hançeri §7·×" +
                   g.toFixed(2) + " " + rutbeYazisi);
    } catch (e) { /* onemsiz */ }

    return {
      ad: "slr_hancer", oyuncuId: oyuncu.id,
      calis() {
        if (!gecerliMi(oyuncu)) return true;
        /* KOL TAKILDI -> IS BITER. Kullanicinin asil istegi
           bu satir: yetenek ortasinda kol takinca durmali. */
        if (kesilsinMi(oyuncu)) {
          try { actionbarYaz(oyuncu, "§5🗡 §7Kol takıldı §8· SLR kapandı"); }
          catch (e) { /* onemsiz */ }
          return true;
        }
        if (atilan >= SLR_HANCER_ADET) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + SLR_HANCER_ADIM;
        atilan++;

        let hedefler;
        try {
          hedefler = koniHedefleri(oyuncu, {
            menzil: SLR_HANCER_MENZIL, aci: SLR_HANCER_ACI,
            tavan: SLR_KILIC_TAVAN, oyuncuDahil: true
          });
        } catch (e) { return false; }
        if (!hedefler || hedefler.length === 0) return false;

        const v = hedefler[sira++ % hedefler.length];
        try {
          if (!varlikIste(1)) return false;
          v.applyDamage(SLR_HANCER_HASAR * g,
                        { cause: "entityAttack", damagingEntity: oyuncu });
          v.addEffect("slowness", SLR_HANCER_YAVAS * 20, { amplifier: 1 });
          parcacikAt(oyuncu.dimension, "minecraft:critical_hit_emitter",
                     v.location);
        } catch (e) { /* varlik kayboldu */ }
        return false;
      }
    };
  }
});
