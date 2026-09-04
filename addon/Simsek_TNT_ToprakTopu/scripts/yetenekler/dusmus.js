import { system, world, ItemStack } from "@minecraft/server";
import {
  hataYaz, bilgiYaz, gecerliMi, actionbarYaz, baslikYaz, parcacikAt,
  varlikKonumu, olayaAbone
} from "../yardimcilar.js";
import { sohbetDinleyiciEkle, sadelestir } from "../sohbet.js";
import {
  DUSMUS_ACIK, DUSMUS_BLOK, DUSMUS_TARAMA, DUSMUS_ASAMA_ARA,
  DUSMUS_ASAMA_SAYISI, DUSMUS_ASAMALAR, DUSMUS_KORLUK,
  DUSMUS_ATES_TICK, DUSMUS_BAGISIKLIK, DUSMUS_KAYIT_ANAHTAR,
  DUSMUS_SECILME_SURE, DUSMUS_SECILME_BASLIK, DUSMUS_SECILME_ALT,
  DUSMUS_YEMIN_YONERGE, DUSMUS_YEMIN, DUSMUS_ASKER_BASLIK,
  DUSMUS_ASKER_MESAJ, DUSMUS_YEMIN_TEKRAR
} from "../ayarlar.js";

/* ================================================================
   DUSMUS VIRUSU  (Fallen)                                   v6.4

   Kullanici: "fallen bir BLOK, ustune ciktigimiz zaman dort
   asamadan olusuyor; dorde geldikten sonra bedenden CIKMAYAN
   bir zirha donusuyor. Temel olarak VIRUS gibi bir sey, tek
   zaafi ATES: cakmakla yaktiginizda ayni dort asamadan ama bu
   sefer normale donuyorsunuz."

   ---- UC DURUM ----
     yok        temiz
     yozlasiyor 1..3. asama. Blogun ustunden inersen GERI
                DONUYOR (kaynakta da oyle).
     dusmus     4. asama. KALICI -- blogun ustunden inmek
                kurtarmiyor. Tek cikis ates.
     secilmis   4. asamada DUSMUS_SECILME_SURE kadar dayandi.
                Korluk kalkiyor, ekrana "SECILDIN" yaziliyor ve
                sohbete YEMIN dusuyor.
     asker      yemini yazdi. Son durum.
     ariniyor   ates degdi, asamalar TERSINE isliyor.

   ---- ZIRHIN KAYBOLMUYOR ----
   Kaynak dort zirh yuvasini da SILIYOR (`replaceitem ... air`).
   Bu depoda esya kaybettiren hicbir sey yok. Bulasmadan ONCE
   dort yuvadaki gercek zirh deftere yaziliyor ve iyilesince
   AYNEN geri takiliyor.

   Defter DUNYA OZELLIGINDE: dunyadan cikip girsen de zirhin
   kayip degil. Kalp defteriyle ayni kalip; dunya ozelligi
   yoksa uyari yaziliyor ve virus yine calisiyor -- ama o
   durumda zirh yalniz bellekte tutuluyor.

   ---- NEDEN KONSEY_SILAH.JS'IN ICINE YAZILMADI ----
   Orasi ANLIK bir vurus: nisan al, kurbani dondur, sure
   dolunca birak. Burasi SUREKLI bir durum makinesi: dort
   ileri, dort geri, arada blok kontrolu ve kalicilik. Ikisini
   birlestirmek iki farkli seyin ortak atasini yaratirdi.
   ================================================================ */

/* oyuncuId -> { durum, asama, sonrakiTick, zirh } */
const defter = new Map();
/* oyuncuId -> bagisikligin bittigi tick. Iyilesen kurban
   blogun ustunden inmeye vakit bulsun diye; yoksa ayni tarama
   turunda yeniden bulasiyor ve ates hicbir ise yaramiyor
   (testte goruldu).                                          */
const bagisik = new Map();
/* "boyut|x|y|z" -> true.  DUNYADAKI Dusmus bloklari.

   ---- NEDEN AYRI BIR DEFTER ----
   Ilk yazdigimda tarama HER OYUNCU icin bes tick'te bir
   getBlock cagiriyordu. Uc test birden dustu:
     ciftel.mjs / duvardel.mjs  "57 / 56" -- tick basina blok
                                tavani asildi
     iksir.mjs                  "hicbir blok okunmadi/yazilmadi
                                :: 40 okuma" -- iksir testinin
                                dunyasinda hic blok islemi
                                olmamasi gerekiyordu
   Yani hic Dusmus blogu olmayan bir dunyada bile surekli blok
   okuyordum. Deponun kurali acik: defter bosken HIC DONME
   (kalpTara, tasTara, konseySilahTara hepsi oyle).

   Cozum: blok KONULDUGUNDA deftere yaziliyor, KIRILDIGINDA
   siliniyor. Tarama artik tek bir getBlock bile yapmiyor --
   oyuncunun tam sayi konumunu defterle karsilastiriyor.

   SINIR: /setblock, yapi (structure) ya da dunya duzenleyici
   ile konan blok bu deftere GIRMEZ ve virus bulasmaz. Elle
   konan blok calisir; bu bilincli bir takas ve baska yolu yok
   (yoksa her tick dunyayi taramak gerekirdi).                */
const bloklar = new Map();
let kaliciDestek;

function kaliciMi() {
  if (kaliciDestek === undefined) {
    kaliciDestek = (typeof world.setDynamicProperty === "function") &&
                   (typeof world.getDynamicProperty === "function");
    if (!kaliciDestek) {
      bilgiYaz("UYARI: dunya ozellikleri yok. Dusmus virusu calisiyor ama " +
               "kurbanin zirhi yalniz bellekte tutuluyor; dunyadan cikip " +
               "girersen geri verilemez.");
    }
  }
  return kaliciDestek;
}

function blokAnahtar(boyutId, x, y, z) {
  return boyutId + "|" + x + "|" + y + "|" + z;
}

export function dusmusBlokSayisi() { return bloklar.size; }

/* Kayit bicimi: [[oyuncuId, durum, asama, [zirh...]], ...]
   Zirh yalniz TIP olarak saklaniyor: dunya ozelliginin boyut
   siniri var ve buyu/ad gibi verileri tasimak defteri
   sisirirdi. Sinir burada ACIKCA yaziyor -- buyulu bir zirh
   geri gelirken buyusunu kaybeder.                           */
function yaz() {
  if (!kaliciMi()) return;
  try {
    const dizi = [];
    for (const [id, k] of defter) {
      dizi.push([id, k.durum, k.asama, k.zirh || []]);
    }
    const paket = { k: dizi, b: [...bloklar.keys()] };
    world.setDynamicProperty(DUSMUS_KAYIT_ANAHTAR,
      (dizi.length === 0 && bloklar.size === 0)
        ? undefined : JSON.stringify(paket));
  } catch (e) {
    hataYaz("dusmus.yaz", e);
  }
}

let okundu = false;

export function dusmusOku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;
  try {
    const ham = world.getDynamicProperty(DUSMUS_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    const paket = JSON.parse(ham);
    const dizi = (paket && Array.isArray(paket.k)) ? paket.k : [];
    if (paket && Array.isArray(paket.b)) {
      for (const a of paket.b) bloklar.set(String(a), true);
    }
    for (const satir of dizi) {
      if (!Array.isArray(satir) || satir.length < 4) continue;
      defter.set(String(satir[0]), {
        durum: String(satir[1]), asama: Number(satir[2]) || 0,
        zirh: Array.isArray(satir[3]) ? satir[3] : [],
        sonrakiTick: 0
      });
    }
    bilgiYaz("Dusmus defteri okundu: " + defter.size + " kurban, " +
             bloklar.size + " blok.");
  } catch (e) {
    hataYaz("dusmus.oku", e);
  }
}

export function dusmusUnut(oyuncuId) {
  if (oyuncuId === undefined) {
    /* "Hepsini unut" DUNYA KAYDINI da temizlemeli. Ilk halinde
       yalnizca bellek siliniyor ve `okundu` sifirlaniyordu --
       bir sonraki tarama ESKI kaydi geri okuyup kurbanlari
       dirilttiyordu. Testte goruldu: iyilesen oyuncunun zirhi
       bir onceki turun bos zirhiyla degisiyordu.            */
    defter.clear(); bloklar.clear(); bagisik.clear();
    yaz();
    okundu = false;
    return;
  }
  defter.delete(oyuncuId);
  bagisik.delete(oyuncuId);
  yaz();
}

export function dusmusDurum(oyuncuId) {
  const k = defter.get(oyuncuId);
  return k ? k.durum : undefined;
}
export function dusmusSayisi() { return defter.size; }

const YUVALAR = ["Head", "Chest", "Legs", "Feet"];

function kap(oyuncu) {
  try {
    return oyuncu.getComponent("minecraft:equippable");
  } catch (e) {
    return undefined;
  }
}

/* Dort yuvadaki GERCEK zirhi tipleriyle okur. */
function zirhiOku(oyuncu) {
  const c = kap(oyuncu);
  if (!c) return [];
  const liste = [];
  for (const y of YUVALAR) {
    let tip = "";
    try {
      const e = c.getEquipment(y);
      if (e && typeof e.typeId === "string") tip = e.typeId;
    } catch (e) { /* yuva okunamadi */ }
    liste.push(tip);
  }
  return liste;
}

/* Deftere yazilan zirhi aynen geri takar. */
function zirhiGeriVer(oyuncu, zirh) {
  const c = kap(oyuncu);
  if (!c) return;
  for (let i = 0; i < YUVALAR.length; i++) {
    try {
      const tip = zirh && zirh[i];
      c.setEquipment(YUVALAR[i],
        tip ? new ItemStack(tip, 1) : undefined);
    } catch (e) {
      /* Esya kaydolmadiysa yuva bos kaliyor; virus yine bitti. */
    }
  }
}

function asamayiGiy(oyuncu, indis) {
  const a = DUSMUS_ASAMALAR[indis];
  if (!a) return;
  const c = kap(oyuncu);
  if (c) {
    for (const y of a.yuvalar) {
      try {
        c.setEquipment(y, new ItemStack(a.parca, 1));
      } catch (e) { /* parca kaydolmadi: gorunum eksik kalir */ }
    }
  }
  try { actionbarYaz(oyuncu, a.yazi); } catch (e) { /* onemsiz */ }
  try {
    parcacikAt(oyuncu.dimension, "minecraft:sculk_soul_particle",
               varlikKonumu(oyuncu));
  } catch (e) { /* parcacik onemsiz */ }
}

function korlukVer(oyuncu, acikMi) {
  if (!DUSMUS_KORLUK) return;
  try {
    if (acikMi) {
      oyuncu.addEffect("blindness", 99999,
                       { amplifier: 0, showParticles: false });
    } else {
      oyuncu.removeEffect("blindness");
    }
  } catch (e) { /* efekt yoksa onemsiz */ }
}

/* ---------------- durum gecisleri ---------------- */

function bulastir(oyuncu) {
  const kayit = {
    durum: "yozlasiyor", asama: 1,
    sonrakiTick: system.currentTick + DUSMUS_ASAMA_ARA,
    zirh: zirhiOku(oyuncu)          // GERCEK zirh burada saklandi
  };
  defter.set(oyuncu.id, kayit);
  /* 1. asama HEMEN giyiliyor, bir tarama beklemiyor. Kaynakta
     da oyle: ilk asama `system.run()` icinde, aninda. Bir
     tarama beklemek "bloga bastim, hicbir sey olmadi" hissi
     verirdi.                                                */
  asamayiGiy(oyuncu, 0);
  yaz();
}

/* Temize cikar: asama parcalarini soker, gercek zirhi geri
   verir, korlugu kaldirir.                                   */
function arindir(oyuncu, kayit) {
  defter.delete(oyuncu.id);
  bagisik.set(oyuncu.id, system.currentTick + DUSMUS_BAGISIKLIK);
  korlukVer(oyuncu, false);
  zirhiGeriVer(oyuncu, kayit.zirh);
  yaz();
  try {
    actionbarYaz(oyuncu, "§a§lARINDIN: §fLanet bozuldu.");
    parcacikAt(oyuncu.dimension, "minecraft:villager_happy",
               varlikKonumu(oyuncu));
  } catch (e) { /* onemsiz */ }
}

/* Dorduncu asamada dayanan oyuncu SECILIYOR: korluk kalkiyor,
   ekrana buyuk yazi dusuyor, sohbete yemin yaziliyor.       */
function sec(oyuncu, kayit) {
  kayit.durum = "secilmis";
  kayit.secilmeTick = undefined;
  kayit.yeminTick = system.currentTick + DUSMUS_YEMIN_TEKRAR;
  korlukVer(oyuncu, false);          // karanlik gecti
  yaz();
  try {
    baslikYaz(oyuncu, DUSMUS_SECILME_BASLIK, DUSMUS_SECILME_ALT);
    oyuncu.sendMessage(DUSMUS_YEMIN_YONERGE);
    parcacikAt(oyuncu.dimension, "minecraft:totem_particle",
               varlikKonumu(oyuncu));
  } catch (e) {
    hataYaz("dusmus.sec", e);
  }
}

/* Yemin edildi mi? sohbet.js'in dinleyicisinden cagriliyor.
   Donen deger: mesaj sohbete DUSMESIN mi.                   */
export function dusmusYemin(oyuncu, metin) {
  const kayit = defter.get(oyuncu.id);
  if (!kayit || kayit.durum !== "secilmis") return false;
  /* Karsilastirma sadelestirilmis: buyuk/kucuk harf ve Turkce
     sapkalar onemli degil. Tabletten yazan biri icin harfi
     harfine eslesme eziyet olurdu.                          */
  if (sadelestir(metin) !== sadelestir(DUSMUS_YEMIN)) return false;
  kayit.durum = "asker";
  kayit.yeminTick = undefined;
  yaz();
  try {
    baslikYaz(oyuncu, DUSMUS_ASKER_BASLIK, DUSMUS_ASKER_MESAJ);
    oyuncu.sendMessage(DUSMUS_ASKER_MESAJ);
    parcacikAt(oyuncu.dimension, "minecraft:totem_particle",
               varlikKonumu(oyuncu));
  } catch (e) {
    hataYaz("dusmus.yemin", e);
  }
  return true;                       // yemin herkesin sohbetine dusmesin
}

/* Ates degdi mi: yaniyorsa ya da cakmak kullandiysa. */
function yaniyorMu(oyuncu) {
  try {
    const c = oyuncu.getComponent("minecraft:onfire");
    if (c && typeof c.onFireTicksRemaining === "number") {
      return c.onFireTicksRemaining >= DUSMUS_ATES_TICK;
    }
  } catch (e) { /* bilesen bu surumde yok */ }
  return false;
}

/* Cakmak kullanimi: main.js'in itemUse dalindan cagriliyor.
   Yanmayi beklemeye gerek yok -- kullanici "cakmak ile
   yaktiginizda" dedi, dogrudan tetikliyor.                   */
export function dusmusAtesle(oyuncu) {
  const kayit = defter.get(oyuncu.id);
  if (!kayit) return false;
  if (kayit.durum === "ariniyor") return false;
  kayit.durum = "ariniyor";
  kayit.sonrakiTick = system.currentTick;
  yaz();
  try {
    actionbarYaz(oyuncu, "§6§lATEŞ: §fLanet yanıyor...");
  } catch (e) { /* onemsiz */ }
  return true;
}

/* Ayagin altinda Dusmus blogu var mi?  TEK BIR getBlock
   CAGIRMADAN: oyuncunun tam sayi konumu blok defteriyle
   karsilastiriliyor. Gerekcesi defterin basinda yaziyor.    */
function blogunUstundeMi(oyuncu) {
  try {
    const k = oyuncu.location;
    const a = blokAnahtar(oyuncu.dimension.id, Math.floor(k.x),
                          Math.floor(k.y - 0.1), Math.floor(k.z));
    return bloklar.has(a);
  } catch (e) {
    return false;
  }
}

/* ---------------- merkezi tarama ---------------- */
let sonraki = 0;

export function dusmusTara(oyuncular) {
  if (!DUSMUS_ACIK) return;
  dusmusOku();
  /* IKI DEFTER DE BOSSA HIC DONME: ne blok var ne kurban.
     Bu satir olmadan tarama her tick butun oyuncularin
     konumunu okuyordu ve uc test birden dusuyordu.          */
  if (bloklar.size === 0 && defter.size === 0 && bagisik.size === 0) return;
  const simdi = system.currentTick;
  if (simdi < sonraki) return;
  sonraki = simdi + DUSMUS_TARAMA;

  for (const oyuncu of oyuncular) {
    if (!gecerliMi(oyuncu)) continue;
    const kayit = defter.get(oyuncu.id);

    /* Blok YALNIZ iki durumda onemli: temizken (bulasma) ve
       yozlasirken (ustunden inince geri donme). Kalici
       "dusmus" ile "ariniyor" hallerinde okumaya gerek yok --
       gereksiz okuma butceyi yiyordu.                       */
    /* Blok YALNIZ iki durumda onemli: temizken (bulasma) ve
       yozlasirken (ustunden inince geri donme).             */
    const blokGerek = !kayit || kayit.durum === "yozlasiyor";
    const ustunde = blokGerek ? blogunUstundeMi(oyuncu) : false;

    /* --- temizken bloga bastiysa --- */
    if (!kayit) {
      const kalkan = bagisik.get(oyuncu.id);
      if (kalkan !== undefined) {
        if (simdi < kalkan) continue;      // hala bagisik
        bagisik.delete(oyuncu.id);
      }
      if (ustunde) bulastir(oyuncu);
      continue;
    }

    /* --- ates her durumda arinmayi baslatir --- */
    if (kayit.durum !== "ariniyor" && yaniyorMu(oyuncu)) {
      dusmusAtesle(oyuncu);
      continue;
    }

    if (kayit.durum === "yozlasiyor") {
      /* Blogun ustunden indiyse GERI DONUYOR -- ama yalniz
         dorduncu asamaya varmadan. Kaynakta da boyle.       */
      if (!ustunde) { arindir(oyuncu, kayit); continue; }
      if (simdi < kayit.sonrakiTick) continue;
      asamayiGiy(oyuncu, kayit.asama);
      kayit.asama++;
      kayit.sonrakiTick = simdi + DUSMUS_ASAMA_ARA;
      if (kayit.asama >= DUSMUS_ASAMA_SAYISI) {
        /* TAM YOZLASMA: artik kalici. Blogun ustunden inmek
           kurtarmiyor; tek cikis ates.                      */
        kayit.durum = "dusmus";
        korlukVer(oyuncu, true);
        /* Dorduncu asama bir SON degil bir ESIK: bu tick'ten
           itibaren DUSMUS_SECILME_SURE kadar dayanirsa
           seciliyor.                                        */
        kayit.secilmeTick = simdi + DUSMUS_SECILME_SURE;
      }
      yaz();
      continue;
    }

    if (kayit.durum === "dusmus") {
      /* Dunya kaydinda secilmeTick YOK (defter yalniz durum,
         asama ve zirhi tasiyor -- ozelligin boyut siniri var).
         Cikip giren kurban bu satir olmadan SONSUZA KADAR
         secilemezdi. Eksikse sayac bastan basliyor.         */
      if (kayit.secilmeTick === undefined) {
        kayit.secilmeTick = simdi + DUSMUS_SECILME_SURE;
      }
      /* Dayandi mi? Dayandiysa karanlik geciyor.            */
      if (simdi >= kayit.secilmeTick) {
        sec(oyuncu, kayit);
        continue;
      }
      /* Kalici: parcalar uzerinde kalsin. Biri cikardiysa
         (ya da olup dirildiyse) yeniden giydiriliyor --
         "bedenden cikmayan zirh" tam olarak bu.             */
      if (simdi < kayit.sonrakiTick) continue;
      kayit.sonrakiTick = simdi + DUSMUS_ASAMA_ARA;
      asamayiGiy(oyuncu, DUSMUS_ASAMA_SAYISI - 1);
      continue;
    }

    if (kayit.durum === "secilmis" || kayit.durum === "asker") {
      /* Parcalar hala bedende ve hala cikmiyor. */
      if (simdi < kayit.sonrakiTick) continue;
      kayit.sonrakiTick = simdi + DUSMUS_ASAMA_ARA;
      asamayiGiy(oyuncu, DUSMUS_ASAMA_SAYISI - 1);
      /* Yemin yonergesi kaybolmasin: secilmis ama henuz
         yemin etmemis olana araliklarla tekrarlaniyor.     */
      if (kayit.durum === "secilmis" &&
          (kayit.yeminTick === undefined || simdi >= kayit.yeminTick)) {
        kayit.yeminTick = simdi + DUSMUS_YEMIN_TEKRAR;
        try { oyuncu.sendMessage(DUSMUS_YEMIN_YONERGE); } catch (e) { /* */ }
      }
      continue;
    }

    if (kayit.durum === "ariniyor") {
      if (simdi < kayit.sonrakiTick) continue;
      kayit.asama--;
      kayit.sonrakiTick = simdi + DUSMUS_ASAMA_ARA;
      if (kayit.asama <= 0) { arindir(oyuncu, kayit); continue; }
      /* Tersine giyinme: bir alt asamanin gorunumu.         */
      korlukVer(oyuncu, false);
      asamayiGiy(oyuncu, kayit.asama - 1);
      yaz();
    }
  }
}

/* ---------------- blok defteri: olaylar ----------------
   Blok konuldugunda/kirildiginda defter guncelleniyor. Boylece
   tarama HIC getBlock cagirmiyor.                            */
if (DUSMUS_ACIK) {
  olayaAbone("playerPlaceBlock", (olay) => {
    try {
      const b = olay.block;
      if (!b || b.typeId !== DUSMUS_BLOK) return;
      dusmusOku();
      bloklar.set(blokAnahtar(b.dimension.id, b.location.x,
                              b.location.y, b.location.z), true);
      yaz();
    } catch (e) {
      hataYaz("dusmus.playerPlaceBlock", e);
    }
  });
  olayaAbone("playerBreakBlock", (olay) => {
    try {
      const b = olay.block;
      if (!b) return;
      const a = blokAnahtar(b.dimension.id, b.location.x,
                            b.location.y, b.location.z);
      if (!bloklar.has(a)) return;
      bloklar.delete(a);
      yaz();
    } catch (e) {
      hataYaz("dusmus.playerBreakBlock", e);
    }
  });
}

/* Testler icin: blogu elle deftere yazmak (oyunda olaylar
   yapiyor).                                                  */
export function dusmusBlokEkle(boyutId, x, y, z) {
  bloklar.set(blokAnahtar(boyutId, x, y, z), true);
}

/* Yemin dinleyicisi. sohbet.js'in TEK chatSend aboneligine
   takiliyor -- ikinci bir abonelik acmak `cancel` yarisina yol
   acardi.                                                     */
if (DUSMUS_ACIK) {
  sohbetDinleyiciEkle(dusmusYemin);
}
