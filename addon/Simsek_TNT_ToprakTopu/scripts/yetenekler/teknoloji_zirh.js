import { system } from "@minecraft/server";
import { hataYaz, actionbarYaz, olayaAbone } from "../yardimcilar.js";
import {
  TEKNOLOJI_ACIK, TEKNOLOJI_TARAMA, TEKNOLOJI_SURE, TEKNOLOJI_ONEK,
  TEKNOLOJI_YUVALAR, TEKNOLOJI_PARCALAR, TEKNOLOJI_TAKIMLAR,
  TEKNOLOJI_ETKINLIK, TEKNOLOJI_DIRENC_ADIM, TEKNOLOJI_DIRENC_TAVAN,
  TEKNOLOJI_GERI_KAZANIM_ACIK, TEKNOLOJI_KALKAN_BIRIM,
  TEKNOLOJI_OLMEZLIK_ACIK, TEKNOLOJI_KORUMA
} from "../ayarlar.js";

/* ================================================================
   TEKNOLOJI ZIRHLARI                                       v5.1

   ProjectE · Mekanism · Draconic Evolution -- uc modun
   YALNIZCA zirhlari. Sayilarin hepsi jar bytecode'undan;
   nereden okundugu REFERANS_TEKNOLOJI.md'de, ceviri karari
   ayarlar.js'te satir satir yazili.

   ---- BU DOSYA NE YAPIYOR ----
     1. Zirh yuvalarini okur, hangi takimin kac parcasi
        uzerinde bulur.
     2. Takimin efektlerini ve parca efektlerini verir.
     3. Azaltmayi Direnc'e cevirir (eksik parca = eksik direnc).
     4. Direnc IV'un ustunde kalan azaltmayi hasar sonrasi
        GERI KAZANDIRIR.
     5. Draconic kalkanini Absorption olarak tazeler.
     6. Draconic olmezligini olumcul hasarda calistirir.

   ---- NEDEN CEKIRDEK GIBI DEGIL ----
   Max Steel cekirdegi ELDE tutuluyordu, cunku o bir donusum
   ve Molang zirh yuvalarini okuyamiyor. Burada donusum yok;
   gorunusu attachable ciziyor ve script zirh yuvalarini
   equippable ile rahatca okuyor. Kaynakta da zirh, bizde de
   zirh.

   ---- NEDEN IS LISTESINE GIRMIYOR ----
   Kalp defteri ve cekirdeklerdeki ders: kalici bir durum
   oyuncunun AYNI_ANDA (2) is yuvasini sonsuza kadar tutamaz.
   ================================================================ */

/* oyuncuId -> bir sonraki efekt tazeleme tick'i */
const sonraki = new Map();
/* oyuncuId -> son bilinen takim anahtari (giyme/cikarma mesaji) */
const sonTakim = new Map();
/* oyuncuId -> kalkanin bir sonraki tazeleme tick'i */
const kalkanSonraki = new Map();
/* oyuncuId -> olmezligin yeniden hazir olacagi tick */
const olmezlikSarj = new Map();

export function teknolojiUnut(oyuncuId) {
  if (oyuncuId === undefined) {
    sonraki.clear(); sonTakim.clear();
    kalkanSonraki.clear(); olmezlikSarj.clear();
    return;
  }
  sonraki.delete(oyuncuId);
  sonTakim.delete(oyuncuId);
  kalkanSonraki.delete(oyuncuId);
  olmezlikSarj.delete(oyuncuId);
}

/* ---------------- Uzerindeki takim ----------------

   Dort yuvayi okur ve HANGI TAKIMDAN kac parca oldugunu
   dondurur. Karisik takim (Kara baslik + Kizil gogusluk)
   mumkun; o zaman en cok parcasi olan takim gecerli sayiliyor
   ve azaltma yalniz O TAKIMIN parcalarindan hesaplaniyor --
   kaynakta da her parca kendi takiminin azaltmasini
   tasiyor, karisim toplanmiyor.                              */
export function takilanTakim(oyuncu) {
  let bilesen;
  try {
    bilesen = oyuncu.getComponent("minecraft:equippable");
  } catch (e) {
    return undefined;
  }
  if (!bilesen || typeof bilesen.getEquipment !== "function") return undefined;

  const sayim = new Map();
  for (let i = 0; i < TEKNOLOJI_YUVALAR.length; i++) {
    let kimlik;
    try {
      const esya = bilesen.getEquipment(TEKNOLOJI_YUVALAR[i]);
      kimlik = esya ? esya.typeId : undefined;
    } catch (e) {
      continue;   /* yuva okunamadi, otekiler yine baksin */
    }
    if (typeof kimlik !== "string") continue;
    if (!kimlik.startsWith(TEKNOLOJI_ONEK)) continue;
    const govde = kimlik.slice(TEKNOLOJI_ONEK.length);
    const parca = TEKNOLOJI_PARCALAR[i];
    /* Kimlik "<takim>_<parca>" bicinde; parca ADI SONDA.
       Sondan kesiyoruz cunku takim anahtarinda da alt cizgi
       var (pe_kara_bas -> pe_kara).                           */
    const son = "_" + parca;
    if (!govde.endsWith(son)) continue;
    const takim = govde.slice(0, govde.length - son.length);
    if (!TEKNOLOJI_TAKIMLAR.has(takim)) continue;
    if (!sayim.has(takim)) sayim.set(takim, []);
    sayim.get(takim).push(parca);
  }
  if (sayim.size === 0) return undefined;

  let enIyi, enCok = 0;
  for (const [takim, parcalar] of sayim) {
    if (parcalar.length > enCok) { enIyi = takim; enCok = parcalar.length; }
  }
  return { anahtar: enIyi, parcalar: sayim.get(enIyi) };
}

/* ---------------- Azaltma -> Direnc ----------------

   azaltma = taban * (takilan parcalarin etkinlik toplami)
   Tam takimda etkinlik toplami 1.0, yani azaltma = taban.

   amp = floor(azaltma / 0.2) - 1, tavan 3 (Direnc IV = %80).
   Esitlik ASAGI: kaynaktan fazlasini asla verme.             */
export function direncSeviyesi(takim, parcalar) {
  const t = TEKNOLOJI_TAKIMLAR.get(takim);
  if (!t || !t.azaltma) return -1;
  const oran = azaltmaOrani(t, parcalar);
  const seviye = Math.floor(oran / TEKNOLOJI_DIRENC_ADIM + 1e-9);
  if (seviye < 1) return -1;
  return Math.min(seviye - 1, TEKNOLOJI_DIRENC_TAVAN);
}

export function azaltmaOrani(t, parcalar) {
  if (!t || !t.azaltma) return 0;
  let etkinlik = 0;
  for (const p of parcalar) etkinlik += TEKNOLOJI_ETKINLIK[p] || 0;
  return t.azaltma * etkinlik;
}

/* Direnc IV'un ustunde kalan pay. Hasar ALINDIKTAN sonra
   geri verilecek oran:
       1 - (1 - azaltma) / (1 - tavanOrani)
   Kara Madde'de (azaltma 0.80) tam 0 cikiyor.                */
export function geriKazanimOrani(takim, parcalar) {
  if (!TEKNOLOJI_GERI_KAZANIM_ACIK) return 0;
  const t = TEKNOLOJI_TAKIMLAR.get(takim);
  if (!t || !t.azaltma) return 0;
  /* Yalniz TAM TAKIM: kaynakta da azaltma parca parca
     birikiyor ve eksik takimda tavanin ustune cikmiyor.     */
  if (parcalar.length < t.parcalar.length) return 0;
  const oran = azaltmaOrani(t, parcalar);
  const tavanOrani = (TEKNOLOJI_DIRENC_TAVAN + 1) * TEKNOLOJI_DIRENC_ADIM;
  if (oran <= tavanOrani) return 0;
  return 1 - (1 - oran) / (1 - tavanOrani);
}

/* ---------------- Efekt verme ---------------- */
function efektVer(oyuncu, liste) {
  for (const [ad, sure, amp] of liste) {
    try {
      oyuncu.addEffect(ad, sure || TEKNOLOJI_SURE, {
        amplifier: amp,
        /* Parcacik KAPALI: sekiz efekt birden acikken oyuncu
           yuruyen bir parcacik bulutuna donuyor (cekirdek
           dersi).                                            */
        showParticles: false
      });
    } catch (e) {
      /* Efekt adi bu surumde yoksa otekiler yine verilsin. */
    }
  }
}

/* ---------------- Kalkan (Draconic) ----------------

   Absorption KENDILIGINDEN dolmuyor, o yuzden sabit araliklarla
   tazeleniyor. Aralik kaynagin kendi dolum suresinden geldi
   (gerekcesi ayarlar.js'te). Her taramada tazelenseydi zirh
   pratikte olumsuzluk olurdu.                                */
function kalkanTazele(oyuncu, t, simdi) {
  if (!t.kalkan) return;
  const hazir = kalkanSonraki.get(oyuncu.id);
  if (hazir !== undefined && simdi < hazir) return;
  kalkanSonraki.set(oyuncu.id, simdi + t.kalkan.aralik);
  const amp = Math.max(0,
    Math.floor(t.kalkan.can / TEKNOLOJI_KALKAN_BIRIM + 1e-9) - 1);
  try {
    oyuncu.addEffect("absorption", t.kalkan.aralik + TEKNOLOJI_SURE, {
      amplifier: amp, showParticles: false
    });
  } catch (e) {
    hataYaz("teknoloji.kalkan", e);
  }
}

/* ---------------- Tarama ---------------- */
export function teknolojiTara(oyuncular) {
  if (!TEKNOLOJI_ACIK) return;
  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    let uzerinde;
    try {
      uzerinde = takilanTakim(oyuncu);
    } catch (e) {
      uzerinde = undefined;
    }

    const oncekiT = sonTakim.get(oyuncu.id);
    const simdikiT = uzerinde ? uzerinde.anahtar : undefined;
    if (oncekiT !== simdikiT) {
      sonTakim.set(oyuncu.id, simdikiT);
      sonraki.set(oyuncu.id, 0);
      kalkanSonraki.delete(oyuncu.id);
      if (simdikiT) {
        const t = TEKNOLOJI_TAKIMLAR.get(simdikiT);
        try {
          actionbarYaz(oyuncu, "§b⛨ §f" + (t ? t.ad : simdikiT) +
                               " §8· " + uzerinde.parcalar.length + "/" +
                               (t ? t.parcalar.length : 4) + " parça");
        } catch (e) { /* mesaj onemli degil */ }
      }
    }

    if (!uzerinde) continue;
    if (simdi < (sonraki.get(oyuncu.id) || 0)) continue;
    sonraki.set(oyuncu.id, simdi + TEKNOLOJI_TARAMA);

    const t = TEKNOLOJI_TAKIMLAR.get(uzerinde.anahtar);
    if (!t) continue;

    /* Takim efektleri YALNIZ TAM TAKIMDA. Kaynakta da MekaSuit'in
       sogurmasi "full suit equipped" sartina bagli, Draconic'te
       zaten tek parca var (tam takim = gogusluk).              */
    if (uzerinde.parcalar.length >= t.parcalar.length) {
      efektVer(oyuncu, t.efektler || []);
      kalkanTazele(oyuncu, t, simdi);
    }

    /* Parca efektleri PARCA PARCA: hangi parca uzerindeyse
       yalniz onunki. Mucevher takiminda kaynak da boyle.      */
    if (t.parcaEfektleri) {
      for (const p of uzerinde.parcalar) {
        const liste = t.parcaEfektleri[p];
        if (liste) efektVer(oyuncu, liste);
      }
    }

    /* Azaltma -> Direnc. Eksik parca = eksik direnc.          */
    const amp = direncSeviyesi(uzerinde.anahtar, uzerinde.parcalar);
    if (amp >= 0) {
      try {
        oyuncu.addEffect("resistance", TEKNOLOJI_SURE, {
          amplifier: amp, showParticles: false
        });
      } catch (e) { /* efekt yoksa gec */ }
    }
  }
}

/* ---------------- Hasar sonrasi ----------------

   Iki is:
     1. Direnc IV'un ustunde kalan azaltmayi geri kazandir.
     2. Olumcul hasarda olmezligi calistir.

   ONEMLI: burada verilen SIFA yeni bir entityHurt uretmiyor
   (hasar degil can). Ionstrike'in ek hasarindaki sonsuz
   dongu tuzagi burada yok.                                   */
export function teknolojiHasar(olay) {
  if (!TEKNOLOJI_ACIK) return;
  const oyuncu = olay ? olay.hurtEntity : undefined;
  if (!oyuncu || oyuncu.typeId !== "minecraft:player") return;

  let uzerinde;
  try {
    uzerinde = takilanTakim(oyuncu);
  } catch (e) {
    return;
  }
  if (!uzerinde) return;
  const t = TEKNOLOJI_TAKIMLAR.get(uzerinde.anahtar);
  if (!t) return;

  const alinan = typeof olay.damage === "number" ? olay.damage : 0;

  /* ---- 1. Geri kazanim ---- */
  const oran = geriKazanimOrani(uzerinde.anahtar, uzerinde.parcalar);
  if (oran > 0 && alinan > 0) {
    canEkle(oyuncu, alinan * oran);
  }

  /* ---- 2. Olmezlik ---- */
  if (!TEKNOLOJI_OLMEZLIK_ACIK || !t.olmezlik) return;
  const simdi = system.currentTick;
  const hazir = olmezlikSarj.get(oyuncu.id);
  if (hazir !== undefined && simdi < hazir) return;

  const can = canDegeri(oyuncu);
  if (can === undefined || can > 0) return;

  olmezlikSarj.set(oyuncu.id, simdi + t.olmezlik.sarj);
  canEkle(oyuncu, t.olmezlik.can);
  try {
    oyuncu.addEffect("absorption", t.olmezlik.dokunulmaz + TEKNOLOJI_SURE, {
      amplifier: Math.max(0,
        Math.floor(t.olmezlik.kalkan / TEKNOLOJI_KALKAN_BIRIM + 1e-9) - 1),
      showParticles: false
    });
  } catch (e) { /* efekt yoksa can yine verildi */ }
  try {
    /* Dokunulmazlik: Bedrock'ta "invulnerable" diye bir efekt
       yok. Kaynaktaki 2-3 saniyelik dokunulmazligin en yakin
       karsiligi Direnc IV -- tam bagisiklik degil, ama o
       StarOxine'e ayrilmis.                                   */
    oyuncu.addEffect("resistance", t.olmezlik.dokunulmaz, {
      amplifier: TEKNOLOJI_DIRENC_TAVAN, showParticles: false
    });
  } catch (e) { /* gec */ }
  try {
    actionbarYaz(oyuncu, "§d⛨ Ölmezlik §8· " + t.ad);
  } catch (e) { /* mesaj onemli degil */ }
}

function canDegeri(varlik) {
  try {
    const c = varlik.getComponent("minecraft:health");
    if (!c) return undefined;
    if (typeof c.currentValue === "number") return c.currentValue;
    if (typeof c.getCurrentValue === "function") return c.getCurrentValue();
  } catch (e) { /* bilesen yok */ }
  return undefined;
}

function canEkle(varlik, miktar) {
  if (!(miktar > 0)) return;
  try {
    const c = varlik.getComponent("minecraft:health");
    if (!c) return;
    const simdi = typeof c.currentValue === "number"
      ? c.currentValue
      : (typeof c.getCurrentValue === "function" ? c.getCurrentValue() : undefined);
    if (simdi === undefined) return;
    let tavan = 20;
    if (typeof c.effectiveMax === "number") tavan = c.effectiveMax;
    else if (typeof c.defaultValue === "number") tavan = c.defaultValue;
    const yeni = Math.min(tavan, simdi + miktar);
    if (typeof c.setCurrentValue === "function") c.setCurrentValue(yeni);
  } catch (e) {
    hataYaz("teknoloji.canEkle", e);
  }
}

/* Hasar olayina abone. entityHurt her surumde YOK -- olayaAbone
   eksik olayda paketi oldurmuyor, ozelligi kapatiyor.         */
export function teknolojiKur() {
  if (!TEKNOLOJI_ACIK) return false;
  return olayaAbone("entityHurt", (olay) => {
    try {
      teknolojiHasar(olay);
    } catch (e) {
      hataYaz("teknoloji.entityHurt", e);
    }
  });
}

/* ---------------- Menu icin ----------------

   Cekirdek ve kahraman menuleriyle AYNI bicim: hangi takim ne
   veriyor, uzerinde kac parcasi var.                         */
export function teknolojiListesi(oyuncu) {
  let uzerinde;
  try {
    uzerinde = takilanTakim(oyuncu);
  } catch (e) {
    uzerinde = undefined;
  }
  const cikti = [];
  for (const [anahtar, t] of TEKNOLOJI_TAKIMLAR) {
    const uzerimde = uzerinde && uzerinde.anahtar === anahtar;
    /* Zirh puani ozette YAZILI DEGIL, buradan TOPLANIYOR:
       tek kaynak TEKNOLOJI_KORUMA olsun ve esyanin verdigi
       sayiyla menunun yazdigi sayi ayrisamasin.            */
    let zirh = 0;
    for (const p of t.parcalar) zirh += TEKNOLOJI_KORUMA[p] || 0;
    cikti.push({
      anahtar,
      ad: t.ad,
      mod: t.mod,
      kaynak: t.kaynak,
      ozet: t.ozet,
      zirh,
      parcalar: t.parcalar,
      takili: uzerimde ? uzerinde.parcalar.length : 0,
      esyalar: t.parcalar.map((p) => TEKNOLOJI_ONEK + anahtar + "_" + p),
      yetenek: t.yetenek
    });
  }
  return cikti;
}
