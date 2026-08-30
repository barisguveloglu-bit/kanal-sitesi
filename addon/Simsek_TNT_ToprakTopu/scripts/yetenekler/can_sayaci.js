import { system } from "@minecraft/server";
import { hataYaz, actionbarYaz, actionbarSonYazma } from "../yardimcilar.js";
import {
  CAN_SAYACI_ACIK, CAN_SAYACI_MOD, CAN_SAYACI_TARAMA,
  CAN_SAYACI_SURE, CAN_SAYACI_SESSIZLIK, CAN_SAYACI_RENKLER
} from "../ayarlar.js";

/* ================================================================
   CAN SAYACI  (Health Overlay)                            v4.99

   Modun renkli kalp cizimi Bedrock'a aktarilamiyor (gerekcesi
   ayarlar.js'te). Aktarilan sey ikinci ozelligi: KALP SAYACI.

   Neden gercekten gerekli: KALP_TAVAN = 200, yani oyuncu 210
   kalbe kadar cikabiliyor. Bedrock bunu 21 satir kalp olarak
   ciziyor, ekranin yarisi kapaniyor ve kac can kaldigini
   saymak imkansiz oluyor.

   ---- UC MOD, MODUN KENDI SECENEKLERI ----
     kapali    . healthoverlay off
     hep       . healthoverlay always
     degisince . healthoverlay on_change  (varsayilan)

   ---- NEDEN SESSIZ ----
   Actionbar'i lazer sayaci, donusum mesajlari ve kademe
   bildirimleri de kullaniyor. Bu sayac baska bir sey
   yazdiktan sonra CAN_SAYACI_SESSIZLIK tick susuyor --
   yoksa lazerin "359 vurus" yazisinin ustune binerdi ve
   kullanicinin bildirdigi hatayi gorunmez yapardi.

   Kendi yazisini "baskasi yazdi" defterine ISLEMIYOR
   (actionbarYaz'in ucuncu parametresi): yoksa ilk yazidan
   sonra kendi kendini susturur ve bir daha hic gorunmezdi.
   ================================================================ */

/* oyuncuId -> son gorulen {can, maks} */
const sonDurum = new Map();
/* oyuncuId -> sayacin gorunecegi son tick ("degisince" modu) */
const gosterBitis = new Map();
/* oyuncuId -> bir sonraki tarama tick'i */
const sonraki = new Map();

export function canSayaciUnut(oyuncuId) {
  if (oyuncuId === undefined) {
    sonDurum.clear(); gosterBitis.clear(); sonraki.clear();
    return;
  }
  sonDurum.delete(oyuncuId);
  gosterBitis.delete(oyuncuId);
  sonraki.delete(oyuncuId);
}

function renk(oran) {
  for (const [esik, kod] of CAN_SAYACI_RENKLER) {
    if (oran > esik) return kod;
  }
  return CAN_SAYACI_RENKLER[CAN_SAYACI_RENKLER.length - 1][1];
}

/* Kalp sayisi = can / 2, yarim kalpler icin bir ondalik.
   "20.5 kalp" yerine "20,5" degil: Minecraft'ta nokta
   kullaniliyor, tutarli kalsin.                             */
function kalp(can) {
  const k = can / 2;
  return Number.isInteger(k) ? String(k) : k.toFixed(1);
}

export function canMetni(can, maks) {
  const oran = maks > 0 ? can / maks : 0;
  return renk(oran) + "❤ " + kalp(can) + "§7/" + kalp(maks) + " kalp";
}

export function canSayaciTara(oyuncular) {
  if (!CAN_SAYACI_ACIK) return;
  if (CAN_SAYACI_MOD === "kapali") return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + CAN_SAYACI_TARAMA);

    let can, maks;
    try {
      const c = oyuncu.getComponent("minecraft:health");
      if (!c) continue;
      can = c.currentValue;
      maks = c.effectiveMax || c.defaultValue || 20;
    } catch (e) {
      continue;
    }
    if (typeof can !== "number" || typeof maks !== "number") continue;

    /* Degisti mi? Yarim kalpten kucuk oynamalari saymiyoruz:
       yenilenme efekti acikken can surekli kipirdiyor ve
       sayac hic sonmezdi.                                   */
    const onceki = sonDurum.get(oyuncu.id);
    if (!onceki) {
      /* ILK TARAMADA YAZI YOK: dunyaya girer girmez ekrana
         sayac dusmesin, ve o anda gorunen baska bir mesajin
         (iksir icince secilen yetenek, donusum bildirimi)
         ustune binmesin. Zirh sistemindeki kuralin aynisi --
         orada da ilk tarama sessiz.                          */
      sonDurum.set(oyuncu.id, { can, maks });
      continue;
    }
    const degisti =
      Math.abs(onceki.can - can) >= 1 || onceki.maks !== maks;
    if (degisti) {
      sonDurum.set(oyuncu.id, { can, maks });
      gosterBitis.set(oyuncu.id, simdi + CAN_SAYACI_SURE);
    }

    if (CAN_SAYACI_MOD === "degisince" &&
        simdi > (gosterBitis.get(oyuncu.id) || 0)) continue;

    /* Baska bir sey az once yazdiysa sus. */
    if (simdi - actionbarSonYazma(oyuncu.id) < CAN_SAYACI_SESSIZLIK) continue;

    try {
      actionbarYaz(oyuncu, canMetni(can, maks), true);
    } catch (e) {
      hataYaz("can_sayaci.yaz", e);
    }
  }
}
