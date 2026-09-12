import { system, world } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, gecerliMi, varlikKonumu, kaliciYaz
} from "../yardimcilar.js";
import { varlikIste } from "../butce.js";
import {
  KUTLAMA_ACIK, KUTLAMA_SURE, KUTLAMA_SANIYE, KUTLAMA_KIMLIK,
  KUTLAMA_ADET, KUTLAMA_YARICAP, KUTLAMA_IC_YARICAP, KUTLAMA_YUKSEK,
  KUTLAMA_HIZALA, KUTLAMA_METIN, KUTLAMA_RENK, KUTLAMA_SES,
  KUTLAMA_SIRA, KUTLAMA_KAYIT_ANAHTAR, DEFTER_TAVAN
} from "../ayarlar.js";

/* ================================================================
   KUTLAMA SAHNESİ                                           v7.75

   İstek ayarlar.js'te aynen yazılı. Altı şart vardı, altısı da
   burada:

     1. iki bembeyaz göz     -> pa:izleyici dokusu
     2. "bayağı olsun"       -> KUTLAMA_ADET, iki halka
     3. etrafımda            -> halka oyuncunun çevresinde
     4. körlük efekti        -> sahne boyu, sahneyle biter
     5. büyük harf İngilizce -> KUTLAMA_METIN
     6. isim etiketi yok     -> nameTag HİÇ yazılmıyor
     7. 25 saniye            -> KUTLAMA_SURE

   ---- İZLEYİCİLER SALDIRAMAZ ----
   `pa:izleyici` bileşenleri kılıklarla aynı: hiçbir yapay zeka
   hedefi yok. Efsane Korkusu'ndaki Kaçan Gölge için yazılan
   garanti burada da geçerli ve testi de aynı dosyadan okuyor.

   ---- DÜNYA KAPANIRSA ----
   İzleyici KALICI bir varlık. Sahne yarıda kalırsa ortada
   kalırlardı -- donusum.js'te yaşanmış, efsane_korku.js'te
   tekrar yaşanmış tuzak. Aynı çözüm: kimlikler dünya
   özelliğine yazılıyor, açılışta taranıp temizleniyor.
   Defter Kaçan Gölge'ninkinden AYRI, çünkü süpürme ölçütleri
   ayrı.
   ================================================================ */

/* Sahnede duran izleyici kimlikleri (kalici defterin belleği) */
const izleyiciler = new Set();

export function izleyiciSayisi() {
  return izleyiciler.size;
}

function defteriYaz() {
  try {
    kaliciYaz(KUTLAMA_KAYIT_ANAHTAR, [...izleyiciler],
              (d, oran) => {
                const at = Math.max(1, Math.ceil(d.length * oran));
                return d.length > at ? d.slice(at) : undefined;
              }, DEFTER_TAVAN);
  } catch (e) {
    hataYaz("kutlama.defteriYaz", e);
  }
}

function izleyiciSil(kimlik) {
  try {
    const v = world.getEntity ? world.getEntity(kimlik) : null;
    if (v && gecerliMi(v)) v.remove();
    return true;
  } catch (e) {
    /* Chunk yuklu degil: bir sonraki acilista yine denenir. */
    return false;
  }
}

let supuruldu = false;
export function izleyicileriSupur() {
  if (supuruldu) return;
  supuruldu = true;
  try {
    const ham = world.getDynamicProperty
      ? world.getDynamicProperty(KUTLAMA_KAYIT_ANAHTAR) : "";
    if (typeof ham !== "string" || ham.length === 0) return;
    for (const k of JSON.parse(ham)) izleyiciSil(k);
    world.setDynamicProperty(KUTLAMA_KAYIT_ANAHTAR, "");
  } catch (e) {
    hataYaz("kutlama.izleyicileriSupur", e);
  }
}

/* Testler ve dunya degisimi icin. */
export function kutlamaUnut() {
  izleyiciler.clear();
  supuruldu = false;
}

/* i. izleyicinin halka uzerindeki yeri.

   IKI HALKA: tek halkada 18 tane yan yana dizilince cit gibi
   duruyor. Cift sayilar ic halkaya, tekler disa -- boylece ic
   halka dis halkanin BOSLUKLARINA denk geliyor ve "kalabalik"
   hissi cikiyor.                                              */
function halkaNoktasi(merkez, i) {
  const icMi = (i % 2 === 0);
  const yaricap = icMi ? KUTLAMA_IC_YARICAP : KUTLAMA_YARICAP;
  /* Ic halka yarim adim kaydiriliyor ki dis halkayla ayni
     aciya denk gelmesin.                                     */
  const kayma = icMi ? Math.PI / KUTLAMA_ADET : 0;
  const t = (i / KUTLAMA_ADET) * Math.PI * 2 + kayma;
  return {
    x: merkez.x + Math.cos(t) * yaricap,
    y: merkez.y + KUTLAMA_YUKSEK,
    z: merkez.z + Math.sin(t) * yaricap
  };
}

function komut(oyuncu, metin) {
  try {
    if (typeof oyuncu.runCommand !== "function") return false;
    oyuncu.runCommand(metin);
    return true;
  } catch (e) {
    return false;
  }
}

yetenekKaydet({
  kimlik: "kutlama",
  ad: "Kutlama Sahnesi",
  esyasiz: true,
  sira: KUTLAMA_SIRA,

  olustur(oyuncu) {
    if (!KUTLAMA_ACIK) return undefined;
    if (!gecerliMi(oyuncu)) return undefined;

    let merkez, boyut;
    try {
      merkez = varlikKonumu(oyuncu) || oyuncu.location;
      boyut = oyuncu.dimension;
    } catch (e) { return undefined; }
    if (!merkez || !boyut) return undefined;

    /* ---- IZLEYICILER TEK TICK'TE DOGMUYOR ----
       Tick basina varlik butcesi DORT (TICK_VARLIK_BUTCESI).
       Onsekizini bir tickte istemek butceyi tuketiyor ve
       gerisi sessizce dusuyordu -- ilk yazilista tam bu oldu,
       testte 18 yerine 4 izleyici cikti.

       Artik her tick butce kadar doguyorlar. Yan etkisi de
       iyi: karanlikta gozler TEK TEK aciliyor, hepsi birden
       belirmiyor.                                            */
    const doganlar = [];
    let sonrakiIndeks = 0;

    const birazDogur = (yer) => {
      while (sonrakiIndeks < KUTLAMA_ADET) {
        if (varlikIste(1) === 0) return;            // bu tick doldu
        const i = sonrakiIndeks++;
        let v = null;
        try { v = boyut.spawnEntity(KUTLAMA_KIMLIK, halkaNoktasi(yer, i)); }
        catch (e) { continue; }
        /* nameTag ATANMIYOR -- istek "isim etiketi gozukmesin".
           Bir ad yazsaydik varligin ustunde gorunurdu.       */
        doganlar.push(v);
        try { if (v.id) izleyiciler.add(v.id); }
        catch (e) { /* kimlik okunamadi, yine de sahnede */ }
      }
    };

    birazDogur(merkez);
    if (doganlar.length === 0) return undefined;
    defteriYaz();

    /* Korluk: sahne boyu, sahneyle birlikte biter. Saniye
       cinsinden veriliyor; +1 son karede efekt bitmis
       gorunmesin diye.                                       */
    komut(oyuncu, "effect @s blindness " + (KUTLAMA_SANIYE + 1) + " 0 true");
    komut(oyuncu, "playsound " + KUTLAMA_SES + " @s ~ ~ ~ 1 1");

    /* Replik SOHBETE yaziliyor (istek "chat'te soylesin").    */
    try {
      world.sendMessage(KUTLAMA_RENK + KUTLAMA_METIN);
    } catch (e) {
      /* Dunya mesaji yoksa hic olmazsa oyuncuya.             */
      try { oyuncu.sendMessage(KUTLAMA_RENK + KUTLAMA_METIN); }
      catch (e2) { hataYaz("kutlama.mesaj", e2); }
    }

    let kalan = KUTLAMA_SURE;
    let sonrakiHizala = 0;
    let bitti = false;

    const temizle = () => {
      if (bitti) return;
      bitti = true;
      for (const v of doganlar) {
        try { if (v && gecerliMi(v)) v.remove(); }
        catch (e) { /* zaten gitmis */ }
        try { if (v && v.id) izleyiciler.delete(v.id); }
        catch (e) { /* onemsiz */ }
      }
      defteriYaz();
      /* Korluk sahneyle BIRLIKTE bitsin: sure dolmadan is
         yarida kesilirse oyuncu kor kalmasin.                */
      try {
        if (gecerliMi(oyuncu)) komut(oyuncu, "effect @s clear blindness");
      } catch (e) { /* onemsiz */ }
    };

    return {
      ad: "kutlama",
      oyuncuId: oyuncu.id,

      calis() {
        if (--kalan <= 0) return true;
        if (!gecerliMi(oyuncu)) return true;

        /* Oyuncu yururse halka onunla gelsin. Her tick degil:
           KUTLAMA_HIZALA tikte bir, yoksa 18 varligin konumu
           saniyede 20 kez yazilirdi.                         */
        if (system.currentTick < sonrakiHizala) return false;
        sonrakiHizala = system.currentTick + KUTLAMA_HIZALA;

        let k;
        try { k = varlikKonumu(oyuncu) || oyuncu.location; }
        catch (e) { return false; }
        if (!k) return false;

        /* Kalanlar bu tickin butcesinden dogsun. */
        if (sonrakiIndeks < KUTLAMA_ADET) {
          birazDogur(k);
          defteriYaz();
        }

        for (let i = 0; i < doganlar.length; i++) {
          const v = doganlar[i];
          if (!v || !gecerliMi(v)) continue;
          const yer = halkaNoktasi(k, i);
          try {
            /* teleport varsa o, yoksa komut. Ikisi de yoksa
               izleyici yerinde kalir -- sahne yine oynar.    */
            if (typeof v.teleport === "function") v.teleport(yer);
          } catch (e) { /* onemsiz */ }
          /* Oyuncuya BAKSINLAR: sahnenin butun mesele bu.    */
          komut(oyuncu, "execute as @e[type=" + KUTLAMA_KIMLIK +
                ",r=" + (KUTLAMA_YARICAP + 2) +
                "] at @s run tp @s ~ ~ ~ facing @p");
          break;    /* tek komut hepsini dondurur, dongude kalma */
        }
        return false;
      },

      bitir() { temizle(); }
    };
  }
});
