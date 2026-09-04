import { hataYaz, gecerliMi } from "../yardimcilar.js";
import { YEDEK_ACIK } from "../ayarlar.js";

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

export function yedekUnut(oyuncuId) {
  if (oyuncuId === undefined) yedekler.clear();
  else yedekler.delete(oyuncuId);
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
  const kap = kapAl(oyuncu);
  if (!kap) return "§cEnvanter okunamadı.";

  const liste = [];
  for (let i = 0; i < kap.size; i++) {
    let e;
    try { e = kap.getItem(i); } catch (hata) { e = undefined; }
    if (e) liste.push({ slot: i, esya: e });
  }
  yedekler.set(oyuncu.id, liste);
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
  return "§aEnvanter geri yüklendi §7· " + yazilan + " yuva";
}
