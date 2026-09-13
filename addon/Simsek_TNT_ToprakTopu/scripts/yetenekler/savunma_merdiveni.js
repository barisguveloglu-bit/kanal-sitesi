import { system } from "@minecraft/server";
import {
  hataYaz, gecerliMi, actionbarYaz, baslikYaz, parcacikAt
} from "../yardimcilar.js";
import {
  MERDIVEN_ACIK, MERDIVEN_TOPARLAMA,
  MERDIVEN_DUSUS_PENCERE, MERDIVEN_DUSUS_ORAN,
  MERDIVEN_BASAMAKLAR, MERDIVEN_ITME_YARICAP, MERDIVEN_ITME_GUC,
  MERDIVEN_PARCACIK, MERDIVEN_SES,
  KILIT_ATLA_TIPLER
} from "../ayarlar.js";

/* SAVUNMA MERDIVENI                                  v7.89

   Kullanici karari: "biz bunu tamamen savunmaya yonelik
   yapalim ... canim azaldiginda ekstra guc acacagim ... o
   kurtarici dediginiz ile bir sistem kuralim ... kurtarici
   bitti ondan sonra da sirali olsun ... hepsine de can
   okuyucu ekle."

   Tasarim gerekceleri ayarlar.js'te madde madde yazili. Bu
   dosya isi yapiyor.

   ---- KENDI DONGUSUNU ACMIYOR ----
   Depo kurali. main.js merkezi tick'ten MERDIVEN_ARA tickte
   bir cagiriyor -- hareketTara ve ruhTara ile ayni yol.     */

/* oyuncuId -> {
     basamak,        // acilan son basamak indeksi (-1 = hic)
     gecmis,         // [[tick, oran]] -- hizli dusus olcumu
     sonAcilis       // tick
   }                                                         */
const durum = new Map();

export function merdivenUnut(oyuncuId) {
  if (oyuncuId === undefined) durum.clear();
  else durum.delete(oyuncuId);
}
export function merdivenDurum(oyuncuId) { return durum.get(oyuncuId); }
export function merdivenSayisi() { return durum.size; }

/* Canin ORANI. Mutlak sayi degil: 200 kalp formunda 20 can
   "az", normalde tam dolu. ruh.js'teki kurtarici da ayni
   sebeple orana bakiyor.                                    */
function canOrani(oyuncu) {
  try {
    const c = oyuncu.getComponent("minecraft:health");
    if (!c) return undefined;
    const can = c.currentValue;
    const maks = c.effectiveMax || c.defaultValue || 20;
    if (typeof can !== "number" || typeof maks !== "number" || maks <= 0) {
      return undefined;
    }
    return can / maks;
  } catch (e) { return undefined; }
}

/* HIZLI DUSUS: kisa pencerede oranin buyuk kismi gittiyse
   karsi taraf agir basiyor demektir.

   Rakibin gucunu okuyan bir API yok; olculebilen sey canin
   ne hizla gittigi. Tahmin degil olcum -- kullanicinin
   "rakibimin gucu benden daha gucluyse" cumlesinin
   olculebilir karsiligi bu.                                 */
function hizliDususMu(d, simdi, oran) {
  d.gecmis.push([simdi, oran]);
  /* Pencere disi kayitlar dusuyor.                         */
  while (d.gecmis.length && simdi - d.gecmis[0][0] > MERDIVEN_DUSUS_PENCERE) {
    d.gecmis.shift();
  }
  if (d.gecmis.length < 2) return false;
  const enYuksek = d.gecmis.reduce((a, b) => (b[1] > a ? b[1] : a), 0);
  return (enYuksek - oran) >= MERDIVEN_DUSUS_ORAN;
}

/* Son basamagin itmesi. HASAR YOK -- bu bir savunma
   basamagi, saldiri degil. Uzerindekileri ayiriyor.         */
function cevreyiAyir(oyuncu) {
  let yakinlar;
  const boyut = oyuncu.dimension;
  const m = oyuncu.location;
  try {
    yakinlar = boyut.getEntities({
      location: m, maxDistance: MERDIVEN_ITME_YARICAP,
      excludeTypes: ["minecraft:item", "minecraft:xp_orb"]
    });
  } catch (e) { hataYaz("merdiven.ayir", e); return 0; }
  let n = 0;
  for (const v of yakinlar) {
    try {
      if (!gecerliMi(v)) continue;
      if (v.id === oyuncu.id) continue;                 // kendimiz
      if (KILIT_ATLA_TIPLER.has(v.typeId)) continue;    // botlarimiz
      if (typeof v.applyKnockback !== "function") continue;
      const k = v.location;
      const dx = k.x - m.x, dz = k.z - m.z;
      const boy = Math.hypot(dx, dz) || 1;
      try {
        v.applyKnockback({ x: (dx / boy) * MERDIVEN_ITME_GUC,
                           z: (dz / boy) * MERDIVEN_ITME_GUC }, 0.5);
      } catch (e) {
        v.applyKnockback(dx / boy, dz / boy, MERDIVEN_ITME_GUC * 3, 0.5);
      }
      n++;
    } catch (e) { /* tek hedef itilemedi, otekiler dursun */ }
  }
  return n;
}

function basamagiAc(oyuncu, b, tetikle) {
  for (const [ad, sure, amp] of b.efektler || []) {
    try {
      oyuncu.addEffect(ad, sure, { amplifier: amp, showParticles: false });
    } catch (e) { /* efekt yoksa otekiler versin */ }
  }
  /* Basamagin yetenegi varsa ACILIYOR. Tetikleyici disaridan
     geliyor (main.js'in yetenekTetikle'si) -- bu dosya
     merkezi is listesine dogrudan dokunmuyor, hareketTara'nin
     `isVarMi` almasiyla ayni kalip.                         */
  let yetenekAcildi = false;
  if (b.yetenek && typeof tetikle === "function") {
    try { yetenekAcildi = tetikle(oyuncu, b.yetenek) === true; }
    catch (e) { hataYaz("merdiven.yetenek", e); }
  }
  let ayrilan = 0;
  if (b.itme) ayrilan = cevreyiAyir(oyuncu);

  try {
    parcacikAt(oyuncu.dimension, MERDIVEN_PARCACIK, oyuncu.location);
    oyuncu.dimension.playSound(MERDIVEN_SES, oyuncu.location);
  } catch (e) { /* gorsel/ses onemsiz */ }

  try {
    baslikYaz(oyuncu, b.renk + "▣ " + b.ad,
              "§7savunma basamağı " + b.renk + "açıldı");
    actionbarYaz(oyuncu, b.renk + "▣ §f" + b.ad +
      (yetenekAcildi ? " §8+ " + b.yetenek : "") +
      (ayrilan > 0 ? " §8· " + ayrilan + " ayrıldı" : ""));
  } catch (e) { hataYaz("merdiven.yazi", e); }
  return { yetenekAcildi, ayrilan };
}

/* main.js her MERDIVEN_ARA tickte cagiriyor.
   `tetikle(oyuncu, kimlik) -> bool` main.js'ten geliyor.   */
export function merdivenTara(oyuncular, tetikle) {
  if (!MERDIVEN_ACIK) return;
  const simdi = system.currentTick;

  for (const o of oyuncular || []) {
    try {
      if (!gecerliMi(o)) continue;
      const oran = canOrani(o);
      if (oran === undefined) continue;   // okunamadi -> dokunmuyoruz

      let d = durum.get(o.id);
      if (!d) { d = { basamak: -1, gecmis: [], sonAcilis: -99999 }; durum.set(o.id, d); }

      /* ---- ONCE KAYIT, SONRA KARAR  (v7.89) ----
         Can gecmisi HER taramada yaziliyor -- toparlanmis
         olsa bile.

         Ilk yazilista toparlama dalinda `d.gecmis.length = 0`
         vardi ve `continue` ediyordu, yani TAM CANDAN baslayan
         dusus hic olculemiyordu: %100'deki ornek silindigi
         icin bir sonraki taramada pencerede tek deger kaliyor
         ve "hizli dusus" hicbir zaman dogru cikmiyordu.

         Kacirilan sey tam da kullanicinin anlattigi durumdu:
         "rakibimin gucu benden daha guclu" -- yani tam candan
         bir anda dibe vurmak. Testin 4. maddesi bunu yakaladi
         (-1 -> 0, oysa -1 -> 1 olmaliydi).                  */
      const hizli = hizliDususMu(d, simdi, oran);

      /* TOPARLANDI: merdiven bastan kuruluyor. Esikte
         titreyen can basamaklari surekli yakmasin.
         GECMIS SILINMIYOR: yukaridaki gerekce.             */
      if (oran >= MERDIVEN_TOPARLAMA) {
        if (d.basamak >= 0) {
          d.basamak = -1;
          try { actionbarYaz(o, "§a▣ §7Savunma merdiveni sıfırlandı"); }
          catch (e) { /* onemsiz */ }
        }
        continue;
      }

      /* SIRALI: taramada en fazla bir basamak, hizli dususte
         iki. Can bir anda dibe vursa bile merdiven 1'den
         baslayip tirmaniyor -- kullanicinin acik istegi.   */
      const adim = hizli ? 2 : 1;

      for (let k = 0; k < adim; k++) {
        const sonraki = d.basamak + 1;
        if (sonraki >= MERDIVEN_BASAMAKLAR.length) break;
        const b = MERDIVEN_BASAMAKLAR[sonraki];
        if (oran >= b.esik) break;        // bu basamagin esigi gelmedi
        d.basamak = sonraki;
        d.sonAcilis = simdi;
        basamagiAc(o, b, tetikle);
      }
    } catch (e) {
      hataYaz("merdiven.oyuncu", e);
    }
  }
}
