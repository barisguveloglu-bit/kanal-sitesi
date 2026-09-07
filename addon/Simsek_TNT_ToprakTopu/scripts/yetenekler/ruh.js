import { system, world } from "@minecraft/server";
import { hataYaz, gecerliMi, actionbarYaz, bilgiYaz } from "../yardimcilar.js";
import {
  RUH_ACIK, RUH_TAVAN, RUH_DOLUM, RUH_TARAMA, RUH_KADEMELER,
  RUH_EFEKT_SURE, RUH_EFEKTLER, RUH_YOLLAR, RUH_VARSAYILAN_YOL,
  KURTARICI_ACIK, KURTARICI_ESIK, KURTARICI_SURE, KURTARICI_TOPARLAMA,
  RUH_LETZT_BEDEL, RUH_KARAKTERLER, RUH_VARSAYILAN_KARAKTER
} from "../ayarlar.js";

/* RUH GUCU (Reiryoku) ve KURTARICI.

   Kaynak: Bleach: Kurosaki Dynasty 2.4.6. Modun modeli aynen
   alindi: form acikken statlar CARPILIYOR ama SP eriyor, SP
   bitince form kendiliginden kapaniyor. Gerekce ayarlar.js'te.

   ---- BU DOSYA NE YAPIYOR ----
   1. Ruh havuzu (0..RUH_TAVAN) -- mahou.js'in mana kalibi
   2. Kademe 0/1/2 ve kademenin efektleri
   3. KURTARICI: can esigin altina dusunce kademe 2'yi acar

   ---- IKI SINIR BIRDEN, ILK DOLAN KAPATIR ----
   Kurtarici hem SURE hem RUH ile sinirli. Tek sinir olsaydi
   otekinin bittigi durum sessizce sonsuz olurdu.             */

const ANAHTAR_RUH = "simsek:ruh";
const ANAHTAR_YOL = "simsek:ruh_yol";
/* v7.57: IKINCI KATEGORI. Yol ile ayni kalibi kullaniyor ama
   AYRI anahtarda duruyor -- ikisi bagimsiz secilebiliyor,
   yani uc yol x uc karakter = dokuz bilesim.               */
const ANAHTAR_KARAKTER = "simsek:ruh_karakter";

/* oyuncuId -> { kademe, bitis, kurtarildi } */
const durumlar = new Map();
/* Esigi bir kez gecince tetiklenir; toparlayinca yeniden
   dolar. Set TDZ'ye takilmasin diye kullanimdan ONCE. */
const kurtarmaHazir = new Set();
const bellekRuh = new Map();      // dinamik ozellik yoksa
const bellekYol = new Map();
const bellekKarakter = new Map();
let ozellikVar = true;
let sayac = 0;

export function ruhUnut(oyuncuId) {
  if (oyuncuId === undefined) {
    durumlar.clear(); bellekRuh.clear(); bellekYol.clear();
    bellekKarakter.clear(); kurtarmaHazir.clear();
  } else {
    durumlar.delete(oyuncuId); bellekRuh.delete(oyuncuId);
    bellekYol.delete(oyuncuId); bellekKarakter.delete(oyuncuId);
    kurtarmaHazir.delete(oyuncuId);
  }
}

/* ---------------- havuz ----------------
   mahou.js'teki manaOku/manaYaz kalibinin aynisi: dinamik
   ozellik varsa oraya, yoksa bellege. Bir kez patlayinca
   ozellikVar false oluyor -- her taramada gunluge dusmek
   Content Log'u kullanilmaz yapiyordu (Mahou'nun dersi).    */
export function ruhOku(oyuncu) {
  if (ozellikVar) {
    try {
      const v = oyuncu.getDynamicProperty(ANAHTAR_RUH);
      if (typeof v === "number") return v;
    } catch (e) { /* henuz yazilmamis */ }
  }
  const v = bellekRuh.get(oyuncu.id);
  return typeof v === "number" ? v : RUH_TAVAN;
}

export function ruhYaz(oyuncu, deger) {
  const v = Math.max(0, Math.min(RUH_TAVAN, Math.floor(deger)));
  if (ozellikVar) {
    try { oyuncu.setDynamicProperty(ANAHTAR_RUH, v); return v; }
    catch (e) {
      ozellikVar = false;
      bilgiYaz("Ruh gucu yazilamadi, bellege alindi.");
    }
  }
  bellekRuh.set(oyuncu.id, v);
  return v;
}

/* ---------------- yol secimi ---------------- */
export function yolOku(oyuncu) {
  if (ozellikVar) {
    try {
      const v = oyuncu.getDynamicProperty(ANAHTAR_YOL);
      if (typeof v === "string" && yolBul(v)) return v;
    } catch (e) { /* yok */ }
  }
  const v = bellekYol.get(oyuncu.id);
  return (typeof v === "string" && yolBul(v)) ? v : RUH_VARSAYILAN_YOL;
}

export function yolYaz(oyuncu, kimlik) {
  if (!yolBul(kimlik)) return false;
  if (ozellikVar) {
    try { oyuncu.setDynamicProperty(ANAHTAR_YOL, kimlik); return true; }
    catch (e) { ozellikVar = false; }
  }
  bellekYol.set(oyuncu.id, kimlik);
  return true;
}

export function yolBul(kimlik) {
  for (const y of RUH_YOLLAR) if (y.kimlik === kimlik) return y;
  return undefined;
}

/* ---------------- karakter secimi ----------------
   Yol ile AYNI kalip, bilerek: iki kategori de ayni sekilde
   okunup yaziliyor, yani birinde bulunan bir hata otekinde de
   ayni yerde. Ayri iki kalip olsaydi ikisi zamanla ayrisirdi. */
export function karakterOku(oyuncu) {
  if (ozellikVar) {
    try {
      const v = oyuncu.getDynamicProperty(ANAHTAR_KARAKTER);
      if (typeof v === "string" && karakterBul(v)) return v;
    } catch (e) { /* yok */ }
  }
  const v = bellekKarakter.get(oyuncu.id);
  return (typeof v === "string" && karakterBul(v)) ? v : RUH_VARSAYILAN_KARAKTER;
}

export function karakterYaz(oyuncu, kimlik) {
  if (!karakterBul(kimlik)) return false;
  if (ozellikVar) {
    try { oyuncu.setDynamicProperty(ANAHTAR_KARAKTER, kimlik); return true; }
    catch (e) { ozellikVar = false; }
  }
  bellekKarakter.set(oyuncu.id, kimlik);
  return true;
}

export function karakterBul(kimlik) {
  for (const k of RUH_KARAKTERLER) if (k.kimlik === kimlik) return k;
  return undefined;
}

/* ---------------- kademe ---------------- */
export function kademeOku(oyuncuId) {
  const d = durumlar.get(oyuncuId);
  return d ? d.kademe : 0;
}

export function carpanOku(oyuncuId) {
  const k = RUH_KADEMELER[kademeOku(oyuncuId)];
  return k ? k.carpan : 1.0;
}

/* Disaridan sorulabilsin: baska yetenekler sayilarini bununla
   olcekleyecek (menzil, hasar, adet). Tek kapi olmasi onemli --
   iki ayri carpan hesabi er gec ayrisir.                     */
export function ruhCarpani(oyuncu) {
  try { return carpanOku(oyuncu.id); } catch (e) { return 1.0; }
}

function efektVer(oyuncu, kademe) {
  const liste = RUH_EFEKTLER[kademe];
  if (!liste || liste.length === 0) return;
  for (const [ad, seviye] of liste) {
    try {
      oyuncu.addEffect(ad, RUH_EFEKT_SURE, {
        amplifier: seviye, showParticles: false
      });
    } catch (e) { /* efekt yoksa onemsiz */ }
  }
}

/* Kademeyi degistirir. 0'a dusurmek formu kapatmak demek.    */
export function kademeAyarla(oyuncu, kademe, sure) {
  if (!RUH_ACIK || !gecerliMi(oyuncu)) return false;
  const k = Math.max(0, Math.min(RUH_KADEMELER.length - 1, kademe | 0));
  const yol = yolBul(yolOku(oyuncu));

  if (k === 0) {
    const onceki = durumlar.get(oyuncu.id);
    durumlar.delete(oyuncu.id);
    if (onceki && onceki.kademe > 0) {
      /* LETZT BEDELI: yalniz Quincy yolunda ve yalniz 2.
         kademeden inerken. Bleach'te Letzt Stil gucunu
         kaybettiriyor; modda ayri bir drainLeztz olcegi var. */
      if (yol && yol.kimlik === "letzt" && onceki.kademe >= 2) {
        ruhYaz(oyuncu, RUH_TAVAN * RUH_LETZT_BEDEL);
      }
      try {
        actionbarYaz(oyuncu, "§8✦ " + (yol ? yol.ad : "Form") + " kapandı");
      } catch (e) { /* onemsiz */ }
    }
    return true;
  }

  durumlar.set(oyuncu.id, {
    kademe: k,
    bitis: sure ? system.currentTick + sure : undefined,
    kurtarildi: false
  });
  efektVer(oyuncu, k);
  try {
    const form = k >= 2 ? (yol ? yol.ikinci : "?") : (yol ? yol.birinci : "?");
    actionbarYaz(oyuncu, "§b✦ §f" + form + " §7· ruh " + ruhOku(oyuncu));
  } catch (e) { /* onemsiz */ }
  return true;
}

/* ---------------- her tarama ---------------- */
function oyuncuIsle(oyuncu) {
  const d = durumlar.get(oyuncu.id);
  const kademe = d ? d.kademe : 0;

  if (kademe === 0) {
    /* Bos formda ruh doluyor. RUH_TARAMA tick gectigi icin
       dolum o kadar katiyla uygulaniyor -- yoksa tarama
       araligini degistirmek dolum hizini da degistirirdi ve
       iki ayar gizlice birbirine baglanmis olurdu.          */
    const simdi = ruhOku(oyuncu);
    if (simdi < RUH_TAVAN) ruhYaz(oyuncu, simdi + RUH_DOLUM * RUH_TARAMA);
    return;
  }

  /* Sure doldu mu? */
  if (d.bitis !== undefined && system.currentTick >= d.bitis) {
    kademeAyarla(oyuncu, 0);
    return;
  }

  /* Ruh yetiyor mu? */
  const tuketim = (RUH_KADEMELER[kademe].tuketim || 0) * RUH_TARAMA;
  const kalan = ruhOku(oyuncu) - tuketim;
  if (kalan <= 0) {
    ruhYaz(oyuncu, 0);
    kademeAyarla(oyuncu, 0);
    return;
  }
  ruhYaz(oyuncu, kalan);
  efektVer(oyuncu, kademe);      // efektler sonmeden tazele
}

/* ---------------- KURTARICI ----------------
   Canin ORANINA bakiyor, mutlak sayisina degil: 200 kalp
   formunda 20 can "az" ama normalde tam dolu.               */
function kurtariciIsle(oyuncu) {
  if (!KURTARICI_ACIK) return;
  let can, maks;
  try {
    const c = oyuncu.getComponent("minecraft:health");
    if (!c) return;
    can = c.currentValue;
    maks = c.effectiveMax || c.defaultValue || 20;
  } catch (e) { return; }
  if (typeof can !== "number" || typeof maks !== "number" || maks <= 0) return;

  const oran = can / maks;
  const d = durumlar.get(oyuncu.id);

  /* TOPARLANDI MI: esigin cok ustune ciktiysa yeniden
     silahlanir. Bu olmasaydi esikte titreyen can sistemi
     surekli yakardi -- gozcu.js'teki af mantiginin ayni
     gerekcesi.                                              */
  if (oran >= KURTARICI_TOPARLAMA) {
    if (d) d.kurtarildi = false;
    else durumlar.delete(oyuncu.id);
    kurtarmaHazir.add(oyuncu.id);
    return;
  }

  if (oran >= KURTARICI_ESIK) return;
  if (!kurtarmaHazir.has(oyuncu.id)) return;   // bu turda kullanildi
  if (d && d.kademe >= 2) return;              // zaten acik

  kurtarmaHazir.delete(oyuncu.id);
  if (ruhOku(oyuncu) <= 0) return;             // yakacak ruh yok

  const yol = yolBul(yolOku(oyuncu));
  kademeAyarla(oyuncu, 2, KURTARICI_SURE);
  try {
    oyuncu.sendMessage("§b✦ §f" + (yol ? yol.ikinci : "Form") +
                       " §7· can §c" + Math.round(oran * 100) + "%");
  } catch (e) { /* onemsiz */ }
}


export function ruhTara() {
  if (!RUH_ACIK) return;
  if (++sayac < RUH_TARAMA) return;
  sayac = 0;
  let oyuncular;
  try { oyuncular = world.getAllPlayers(); }
  catch (e) { hataYaz("ruh.getAllPlayers", e); return; }
  for (const o of oyuncular) {
    try { oyuncuIsle(o); kurtariciIsle(o); }
    catch (e) { hataYaz("ruh.oyuncu", e); }
  }
}
