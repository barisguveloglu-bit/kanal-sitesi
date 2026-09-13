import { hataYaz, gecerliMi } from "../yardimcilar.js";
import { system } from "@minecraft/server";
import { YEDEK_ACIK, YEDEK_BEKLEME } from "../ayarlar.js";

/* ENVANTER YEDEGI -- "/clear" ile silinen esyanin karsiligi.

   Tehdit modelindeki DUNYA ailesinden: karsi taraf operatorse
   envanterini tek komutta silebiliyor ve bunu ONLEMEK mumkun
   degil -- komut sunucuda calisiyor, biz olayi sonradan
   goruyoruz. Onlenemeyen seyin karsiligi geri almak.

   Deponun "OYUNCU ESYASI ASLA KAYBOLMAZ" kuralinin savunma
   tarafindaki karsiligi.

   ---- UC KARAR ----
   1. BELLEKTE. Dinamik ozellik bu depoda guvenilir degil
      (Mahou manasi da bellekte). Yedek dunya kapaninca
      gider; dovus icinde kullanilacak bir sey, kalici
      sandik degil.
   2. DEGISTIRME, EKLEME DEGIL. Geri yukleme envanteri oldugu
      gibi yediyle degistiriyor. Ustune ekleseydi iki kez
      geri yukleyen esyasini ikiye katlardi -- savunma
      hilenin kendisi olurdu.
   3. BOS YEDEK GERI YUKLENMEZ. Yedek alinmadan geri yukleme
      denenirse envanter SILINMEZ; hata verilir. Yoksa
      savunma, korumaya calistigi seyi yok ederdi.           */

// oyuncuId -> [ {slot, esya} ... ]
const yedekler = new Map();
/* oyuncuId -> bir sonraki yedek alinabilecek tick.
   Gerekce ayarlar.js'te YEDEK_BEKLEME'nin ustunde.        */
const sonrakiYedek = new Map();

export function yedekUnut(oyuncuId) {
  if (oyuncuId === undefined) { yedekler.clear(); sonrakiYedek.clear(); }
  else { yedekler.delete(oyuncuId); sonrakiYedek.delete(oyuncuId); }
}

/* Kac tick sonra yeniden yedek alinabilir. 0 = simdi. */
export function yedekKalanBekleme(oyuncuId) {
  const s = sonrakiYedek.get(oyuncuId);
  if (s === undefined) return 0;
  const kalan = s - system.currentTick;
  return kalan > 0 ? kalan : 0;
}

export function yedekVarMi(oyuncuId) { return yedekler.has(oyuncuId); }

export function yedekSayisi(oyuncuId) {
  const y = yedekler.get(oyuncuId);
  return y ? y.length : 0;
}

function kapAl(oyuncu) {
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    return (env && env.container) || undefined;
  } catch (e) {
    hataYaz("yedek.kap", e);
    return undefined;
  }
}

export function yedekAl(oyuncu) {
  if (!YEDEK_ACIK) return "§7Envanter yedeği kapalı.";
  if (!gecerliMi(oyuncu)) return "§cYedek alınamadı.";
  /* ---- BEKLEME: COGALTMA DONGUSUNUN FRENI  (v7.79) ----
     Bu satir olmadan "yedek -> sandiga bosalt -> yukle ->
     yedek" dongusu envanteri her turda ikiye katliyor.
     Gerekcenin tamami ayarlar.js'te.                       */
  const kalan = yedekKalanBekleme(oyuncu.id);
  if (kalan > 0) {
    return "§eYedek beklemede §7· " + Math.ceil(kalan / 20) + " sn sonra";
  }

  const kap = kapAl(oyuncu);
  if (!kap) return "§cEnvanter okunamadı.";

  const liste = [];
  for (let i = 0; i < kap.size; i++) {
    let e;
    try { e = kap.getItem(i); } catch (hata) { e = undefined; }
    if (e) liste.push({ slot: i, esya: e });
  }
  yedekler.set(oyuncu.id, liste);
  sonrakiYedek.set(oyuncu.id, system.currentTick + YEDEK_BEKLEME);
  return "§aEnvanter yedeklendi §7· " + liste.length + " dolu yuva";
}

export function yedekYukle(oyuncu) {
  if (!YEDEK_ACIK) return "§7Envanter yedeği kapalı.";
  if (!gecerliMi(oyuncu)) return "§cGeri yüklenemedi.";
  const yedek = yedekler.get(oyuncu.id);
  /* BOS YEDEKLE ENVANTER SILINMEZ. Yedek yokken "temizle ve
     yaz" yapsaydik savunma, korudugu seyi yok ederdi.      */
  if (!yedek) return "§eYedeğin yok. Önce §fyedek§e yaz.";

  const kap = kapAl(oyuncu);
  if (!kap) return "§cEnvanter okunamadı.";

  /* Once TEMIZLE, sonra yaz: yedek envanterin YERINE geciyor,
     ustune eklenmiyor.                                      */
  let yazilan = 0;
  try {
    for (let i = 0; i < kap.size; i++) {
      try { kap.setItem(i, undefined); } catch (e) { /* yuva kilitli olabilir */ }
    }
    for (const k of yedek) {
      if (k.slot >= kap.size) continue;
      try { kap.setItem(k.slot, k.esya); yazilan++; }
      catch (e) { hataYaz("yedek.setItem", e); }
    }
  } catch (e) {
    hataYaz("yedek.yukle", e);
    return "§cGeri yükleme yarıda kaldı.";
  }
  /* ---- YEDEK GERI YUKLENINCE SILINIYOR  (v7.62) ----
     Dis inceleme bir cogaltma acigi buldu ve hakliydi:
       yedek yaz -> esyalari sandiga koy -> geriyukle
     Envanter geri geliyor, sandiktakiler de duruyor. Yedek
     silinmedigi icin dongu SINIRSIZ tekrarlanabiliyordu.

     "Ekleme degil degistirme" korumasi (asagida) yalniz ust
     uste iki geri yuklemeyi engelliyordu; DISARI AKTARMAYI
     degil. Tek seferlik yapmak ikisini birden kapatiyor.  */
  yedekler.delete(oyuncu.id);
  return "§aEnvanter geri yüklendi §7· " + yazilan + " yuva §8· yedek harcandı";
}
