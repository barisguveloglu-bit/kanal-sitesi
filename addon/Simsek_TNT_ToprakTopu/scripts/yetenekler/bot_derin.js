import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, yukseklikAraligi
} from "../yardimcilar.js";
import {
  botVarliklari, botSayisi, botDurum, botYanaCagir, cantaKaydet
} from "./_bot_defteri.js";
import { teslimEtVeYaz } from "./bot_teslim.js";
import { offsetler, kirBlok } from "./bot_is.js";
import {
  DERIN_ACIK, DERIN_TABAN_SURE, DERIN_EN_UZUN, DERIN_PARCA_TICK,
  DERIN_VARSAYILAN, DERIN_ADET_TAVAN, DERIN_YARICAP, DERIN_DERINLIK,
  DERIN_DURAK_ADIM, DERIN_DURAK_TAVAN, DERIN_DURAK_SURE, DERIN_Y_ADIM,
  DERIN_ISINLA, DERIN_TUNEL, DERIN_DONUS, DERIN_YOL_USTU, DERIN_RAPOR,
  DERIN_TEHLIKELI, DERIN_HEDEFLER, DERIN_ADLAR,
  BOT_ODUN_BLOKLARI, BOT_MADEN_BLOKLARI, BOT_IS_BOT_BASI, KORUNAN_KUME
} from "../ayarlar.js";

/* ============================================================
   DERIN TARAMA  --  Asama 3

   Istenen: "madenlerde 10 dakika boyunca kazim yapsin... Elmas
   getir dedigimde... ardindan cesitli yerlere baksin... verdigim
   zorluga gore is dakikasi artsin... ben bu adam yapiyor
   gercekten hissini versin."

   ---- NORMAL "BOT MADEN"DEN FARKI ----

   bot maden      : botun DURDUGU yeri tarar, biter. Ne buldugu
                    onemli degil, sadece sureye bakar.
   bot elmas 64   : bir HEDEFI var. 64 elmas bulana kadar
                    calisir, bir daireyi bitirince bir sonraki
                    duraga gecer, cevherin gercek Y seviyesine
                    dogru iner.

   ---- SURE ELLE GIRILMIYOR, HESAPLANIYOR ----

     sure = TABAN + adet * zorluk * PARCA_TICK,  EN_UZUN'a kadar

   Zorluk ayarlar.js'te, oyunun kendi cevher dagilimindan cikti.
   Sonuc tam olarak istenen davranis:

     odun 64      ->  1712 tick  (~1.4 dk)   "yanimda odun var, hemen"
     demir 256    ->  7344 tick  (~6.1 dk)   "4 tane 64'luk demir"
     elmas 64     -> 10160 tick  (~8.5 dk)
     netherit 64  -> 12000 tick  (10 dk, tavan)

   SURE BIR TAVAN, ZORUNLU BEKLEME DEGIL. 64 elmas 3. dakikada
   bulunursa is 3. dakikada biter. "10 dakika bekle" degil "10
   dakikaya kadar arar" -- gercek bir iscinin calisma bicimi bu.

   ---- DURAKLAR: "CESITLI YERLERE BAKSIN" ----
   Her durak = bir tarama kuresi. Kure bitince (ya da DURAK_SURE
   dolunca) bot bir sonraki duraga gidiyor:

     yatay : altin acili sarmal (durakNo * 2.39996 radyan,
             yaricap DURAK_ADIM * sqrt(durakNo+1)). Sarmal
             SECILDI cunku duzgun bir daire ayni yerleri ust uste
             tarar; altin aci noktalari birbirine en uzak dagitir.
     dikey : cevherin Y seviyesine dogru DERIN_Y_ADIM'lik
             basamaklarla. Tek hamlede inmiyor -- inis yolundaki
             komuru, demiri de topluyor. "Cesitli yerler" bu.

     BOTLAR AYRI YONE GIDER: her botun sarmali (sira * 2pi/n)
     kadar donuk baslar. Bes bot bes ayri koridor tarar, ayni
     yeri bes kez degil.

   ---- NEDEN ISINLANIYOR ----
   Bedrock'ta YOL BULMA API'SI YOK (bkz. _bot_defteri.js). Bota
   "su magaraya yuru" denemiyor. Duraga isinlanmak bunun tek
   calisan karsiligi. Varis noktasi tas doluysa iki blok
   aciliyor: madenci zaten tunel kazar.

   ---- NEDEN "BEKLE"YE ALINIYOR ----
   Bot uzaga gidiyor. Durum "takip" kalsaydi botTara() onu
   BOT_KURTARMA_MENZIL'de yakalayip yanina isinlardi ve bot
   madene bir turlu inemezdi. Is boyunca "bekle", bitince
   botYanaCagir() ile geri geliyor -- "gitti, calisti, geri
   dondu" hissi de buradan geliyor.
   ============================================================ */

/* Bir duragin tarama kuresi. Modul yuklenirken BIR KEZ. */
const DERIN_OFFSET = offsetler(DERIN_YARICAP, -DERIN_DERINLIK, DERIN_DERINLIK);

/* Altin aci (radyan): ardisik noktalari birbirine en uzak
   dagitan aci. Ayciceginin cekirdek dizilimi de bu.            */
const ALTIN_ACI = 2.39996;

/* ---------------- Hedef cozumleme ---------------- */

/* "elmas", "diamond", "pirlanta" -> DERIN_HEDEFLER kaydi.
   Bulunamazsa undefined.                                       */
export function hedefCoz(ad) {
  if (!ad) return undefined;
  const anahtar = DERIN_ADLAR.get(String(ad));
  if (!anahtar) return undefined;
  const tanim = DERIN_HEDEFLER.get(anahtar);
  if (!tanim) return undefined;
  return { anahtar, ...tanim };
}

/* Sure = taban + adet * zorluk * parca. TABAN ile EN_UZUN
   arasinda kirpiliyor.                                         */
export function derinSure(hedef, adet) {
  const ham = DERIN_TABAN_SURE + adet * hedef.zorluk * DERIN_PARCA_TICK;
  return Math.max(DERIN_TABAN_SURE, Math.min(DERIN_EN_UZUN, Math.round(ham)));
}

/* Hangi bloklar kirilacak, kirilinca ne cikacak.

   YOL USTU: hedef elmas olsa bile yol ustundeki demire, komure
   de dokunuluyor -- gercek bir madenci de oyle yapar ve canta
   dolu doner. Sayima girmezler; sayilan sadece istenen sey.    */
function isTanimi(hedef) {
  if (hedef.odun) {
    return {
      hedefMi: (tip) => BOT_ODUN_BLOKLARI.has(tip),
      esya: (tip) => tip
    };
  }
  const hepsi = DERIN_YOL_USTU || hedef.esya === undefined;
  return {
    hedefMi: (tip) => BOT_MADEN_BLOKLARI.has(tip) &&
                      (hepsi || BOT_MADEN_BLOKLARI.get(tip) === hedef.esya),
    esya: (tip) => BOT_MADEN_BLOKLARI.get(tip)
  };
}

/* Cikan esya HEDEFE sayilir mi? "maden" hedefinde her cevher
   sayilir; odunda her kutuk; digerlerinde tam esleme.          */
function sayacFonksiyonu(hedef) {
  if (hedef.odun) return (esya) => BOT_ODUN_BLOKLARI.has(esya);
  if (hedef.esya === undefined) return () => true;
  return (esya) => esya === hedef.esya;
}

/* ---------------- Durak noktasi ---------------- */

/* durakNo'ncu duragin koordinati.
     kok       : isin basladigi yer
     sira      : bu bot kacinci (sarmali dondurur)
     botSayisi : kac bot calisiyor
     hedefY    : cevherin Y seviyesi (yoksa inis yok)
     sinir     : {min, max} dunya yukseklik siniri              */
export function durakNoktasi(kok, sira, botSayisi, durakNo, hedefY, sinir) {
  const aci = durakNo * ALTIN_ACI +
              (sira * 2 * Math.PI / Math.max(1, botSayisi));

  /* ILK DURAK = OLDUGUN YER.

     Ilk surumde sarmal 1'den basliyordu ve bot ise baslar
     baslamaz 14 blok oteye, 16 blok asagi isinlaniyordu. Yani
     dibindeki elmasa hic bakmadan gidiyordu; testte de tam bu
     goruldu (etraf bastan basa elmas, bot sifir getirdi).

     Artik durak 0 botun DURDUGU yer: once burasi taraniyor,
     bitince sarmal aciliyor. "Once yanindakini al, sonra uzaga
     bak" -- bot_is.js'teki offset siralamasinin ayni mantigi.

     Durak 0'da yaricap 0 oldugu icin ACI ise yaramaz, yani
     butun botlar ayni noktaya yigilirdi. O yuzden orada botlar
     yaricapa gore ayriliyor: her bot bir tarama kuresi kadar
     yanda basliyor.                                           */
  const sarmal = DERIN_DURAK_ADIM * Math.sqrt(durakNo);
  const r = sarmal > 0 ? sarmal : sira * DERIN_YARICAP;

  let y = kok.y;
  if (hedefY !== undefined) {
    /* Basamakli inis: durak basina en fazla DERIN_Y_ADIM blok.
       Hedefe varinca orada kaliyor. Durak 0'da inis YOK --
       once bulundugun seviye taraniyor.                        */
    const fark = hedefY - kok.y;
    const enfazla = DERIN_Y_ADIM * durakNo;
    y = kok.y + (Math.abs(fark) <= enfazla
      ? fark
      : (fark < 0 ? -enfazla : enfazla));
  }

  if (sinir) {
    y = Math.max(sinir.min + 2, Math.min(sinir.max - 2, y));
  }

  return {
    x: Math.floor(kok.x + Math.cos(aci) * r),
    y: Math.floor(y),
    z: Math.floor(kok.z + Math.sin(aci) * r)
  };
}

/* Noktadaki blogun tipi, okunamazsa undefined. */
function blokTipi(boyut, nokta) {
  try {
    const b = boyut.getBlock(nokta);
    return b ? b.typeId : undefined;
  } catch (e) {
    return undefined;      // chunk yuklu degil / dunya disi
  }
}

/* Duraga tasi. Donen deger: gercekten tasindi mi.

   Basarisiz olabilecegi yerler bilerek SESSIZ: chunk yuklu
   degilse ya da lav varsa o durak atlanir, bir sonrakine
   gecilir. Hata yazmak gereksiz gurultu olurdu -- lav bulmak
   bir hata degil, madenciligin normali.                        */
function duragaTasi(varlik, boyut, nokta) {
  const ust = { x: nokta.x, y: nokta.y + 1, z: nokta.z };
  const alt = { x: nokta.x, y: nokta.y - 1, z: nokta.z };

  for (const p of [nokta, ust, alt]) {
    const tip = blokTipi(boyut, p);
    if (tip === undefined) return false;          // yuklu degil
    if (DERIN_TEHLIKELI.has(tip)) return false;   // lav: baska duraga bak
  }

  /* Tunel ac: varis noktasi tas doluysa iki blok bosalt.
     Korunan bloklar (anakaya vb.) acilmaz -- o durak atlanir. */
  if (DERIN_TUNEL) {
    for (const p of [nokta, ust]) {
      const tip = blokTipi(boyut, p);
      if (tip === "minecraft:air") continue;
      if (KORUNAN_KUME.has(tip)) return false;
      if (blokIste(1) < 1) return false;          // butce yok, sonraki tick
      try {
        boyut.getBlock(p).setType("minecraft:air");
      } catch (e) {
        return false;
      }
    }
  }

  try {
    varlik.teleport(nokta, { dimension: boyut });
    return true;
  } catch (e) {
    try {
      varlik.teleport(nokta);
      return true;
    } catch (e2) {
      hataYaz("bot_derin.isinla", e2);
      return false;
    }
  }
}

/* ---------------- Tek botun durumu ---------------- */

function botDurumu(varlik, sira) {
  return {
    varlik,
    sira,
    durakNo: -1,        // -1 = daha ilk duraga gitmedi
    merkez: undefined,
    imlec: 0,
    durakBaslangic: 0,
    bitti: false
  };
}

/* ---------------- Is nesnesi ---------------- */

export function derinIs(oyuncu, hedef, adet) {
  const boyut = oyuncu.dimension;
  const sinir = yukseklikAraligi(boyut);
  const tanim = isTanimi(hedef);
  const sayilirMi = sayacFonksiyonu(hedef);
  const sure = derinSure(hedef, adet);
  const bitis = system.currentTick + sure;

  /* Kok: isin basladigi yer. Sarmal buradan aciliyor. Botun
     kendi konumu degil OYUNCUNUN konumu -- "buradan basla"
     demek daha anlasilir, botlar zaten yaninda.                */
  const k = oyuncu.location;
  const kok = { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };

  const botlar = botVarliklari(oyuncu.id)
    .map((c, i) => botDurumu(c.varlik, i));

  let bulunan = 0;        // hedefe sayilan
  let yanUrun = 0;        // yol ustunde toplanan
  let sonRapor = system.currentTick;
  let raporlandi = false;
  let enDerin = kok.y;

  /* Bot uzaga gidecek: "takip" kalsaydi botTara() onu geri
     cekerdi (yukaridaki acikamaya bak).                        */
  try {
    botDurum(oyuncu, "bekle");
  } catch (e) {
    hataYaz("bot_derin.durdur", e);
  }

  return {
    ad: "bot_derin_" + hedef.anahtar,
    oyuncuId: "bot:" + oyuncu.id,

    /* Disaridan okunabilsin diye (test ve rapor).             */
    hedefAdi: hedef.ad,
    hedefAdet: adet,
    sure,

    calis() {
      if (!gecerliMi(oyuncu)) return true;
      if (system.currentTick >= bitis) return true;
      if (bulunan >= adet) return true;            // is bitti, erken don

      let calisan = 0;

      for (const b of botlar) {
        if (b.bitti) continue;
        if (!gecerliMi(b.varlik)) { b.bitti = true; continue; }
        calisan++;

        /* Durak degistirme: ya kure bitti ya da o durakta cok
           oyalandi. Sure siniri, chunk yuklenmeyen bir yerde
           sonsuza kadar bos tarama yapmasin diye.              */
        const kureBitti = b.merkez !== undefined &&
                          b.imlec >= DERIN_OFFSET.length;
        const oyalandi = b.merkez !== undefined &&
                         system.currentTick - b.durakBaslangic > DERIN_DURAK_SURE;

        if (b.merkez === undefined || kureBitti || oyalandi) {
          if (!sonrakiDurak(b)) continue;          // bu tick tasinamadi
        }

        let islem = 0;
        while (islem < BOT_IS_BOT_BASI) {
          if (b.imlec >= DERIN_OFFSET.length) break;
          if (blokIste(1) < 1) break;              // butce doldu
          islem++;

          const o = DERIN_OFFSET[b.imlec++];
          const nokta = { x: b.merkez.x + o.x, y: b.merkez.y + o.y,
                          z: b.merkez.z + o.z };
          if (nokta.y <= sinir.min || nokta.y >= sinir.max) continue;

          let blok;
          try {
            blok = boyut.getBlock(nokta);
          } catch (e) {
            continue;
          }
          if (!blok) continue;

          let tip;
          try {
            tip = blok.typeId;
          } catch (e) {
            continue;
          }
          if (!tanim.hedefMi(tip)) continue;
          if (KORUNAN_KUME.has(tip)) continue;

          if (blokIste(1) < 1) { b.imlec--; break; }
          islem++;

          const esya = kirBlok(blok, boyut, nokta, tip, tanim, oyuncu);
          if (!esya) continue;

          if (sayilirMi(esya)) {
            bulunan++;
            if (bulunan >= adet) return true;      // hedefe varildi
          } else {
            yanUrun++;
          }
        }
      }

      ilerlemeYaz();

      if (calisan === 0) return true;              // butun botlar dustu
      return false;
    },

    bitir() {
      if (raporlandi) return;
      raporlandi = true;

      try {
        cantaKaydet();
      } catch (e) {
        hataYaz("bot_derin.cantaKaydet", e);
      }

      /* Botlar madenin dibinde: geri cagir. Hem teslim menzili
         icin sart, hem de "gitti, calisti, geri dondu" hissinin
         son adimi.                                             */
      if (DERIN_DONUS) {
        try {
          botYanaCagir(oyuncu);
        } catch (e) {
          hataYaz("bot_derin.donus", e);
        }
      } else {
        try {
          botDurum(oyuncu, "takip");
        } catch (e) {
          hataYaz("bot_derin.durumGeri", e);
        }
      }

      try {
        if (bulunan === 0 && yanUrun === 0) {
          oyuncu.sendMessage(bosDonusMesaji(hedef, botlar.length, enDerin));
          return;
        }

        const basarili = bulunan >= adet;
        const bas = (basarili ? "§a✔ " : "§e") + botlar.length + " bot " +
          hedef.ad + " taramasini bitirdi §7· §f" + bulunan + "§7/" + adet +
          (yanUrun > 0 ? " §8(+" + yanUrun + " yol ustu)" : "") +
          " §8· en derin y=" + enDerin + "\n§7getirdi: ";
        teslimEtVeYaz(oyuncu, bas);
      } catch (e) {
        hataYaz("bot_derin.bitir", e);
      }
    }
  };

  /* ---- Bir sonraki duraga gec ----
     Donen deger: tasindi mi. Tasinamadiysa (lav, yuklu olmayan
     chunk, butce) bu tick atlaniyor, bir sonraki tick yeniden
     deneniyor -- ama durakNo ilerledigi icin AYNI kotu noktaya
     takilip kalmiyor.                                          */
  function sonrakiDurak(b) {
    b.durakNo++;
    if (b.durakNo >= DERIN_DURAK_TAVAN) {
      b.bitti = true;
      return false;
    }

    const nokta = durakNoktasi(kok, b.sira, botlar.length, b.durakNo,
                               hedef.y, sinir);

    if (DERIN_ISINLA && !duragaTasi(b.varlik, boyut, nokta)) return false;

    b.merkez = nokta;
    b.imlec = 0;
    b.durakBaslangic = system.currentTick;
    if (nokta.y < enDerin) enDerin = nokta.y;
    return true;
  }

  /* ---- Ilerleme ----
     Kullanici bot calisirken hicbir sey gormedigi icin "bosuna
     kiriliyor" sanmisti (v4.31). Derin taramada bot GOZDEN DE
     kayboluyor, o yuzden bildirim burada daha da onemli.       */
  function ilerlemeYaz() {
    if (DERIN_RAPOR <= 0) return;
    if (system.currentTick - sonRapor < DERIN_RAPOR) return;
    sonRapor = system.currentTick;

    const kalanTick = Math.max(0, bitis - system.currentTick);
    const dk = Math.floor(kalanTick / 1200);
    const sn = Math.floor((kalanTick % 1200) / 20);
    const derinlik = botlar.length > 0 && botlar[0].merkez
      ? botlar[0].merkez.y : kok.y;

    try {
      actionbarYaz(oyuncu,
        "§b⛏ " + hedef.ad + " §f" + bulunan + "§7/" + adet +
        " §8· y=" + derinlik +
        " §8· durak " + (botlar[0] ? botlar[0].durakNo + 1 : 0) +
        " §8· " + dk + ":" + (sn < 10 ? "0" : "") + sn + " kaldi");
    } catch (e) {
      hataYaz("bot_derin.rapor", e);
    }
  }
}

/* Hicbir sey bulunamadiysa SEBEBINI soyle. Uydurma yapmiyoruz:
   yanlis boyutta arandiysa bunu acikca yaziyoruz.              */
function bosDonusMesaji(hedef, botSayisi, enDerin) {
  let m = "§e" + botSayisi + " bot " + hedef.ad + " bulamadi §8(en derin y=" +
          enDerin + ")";
  if (hedef.boyut) {
    m += "\n§7" + hedef.ad + " sadece §f" +
         hedef.boyut.replace("minecraft:", "") + "§7 boyutunda cikar.";
  } else if (hedef.anahtar === "zumrut") {
    m += "\n§7Zumrut sadece §fdag biyomunda§7 cikar; dagda dene.";
  } else if (hedef.y !== undefined) {
    m += "\n§7" + hedef.ad + " en sik §fy=" + hedef.y +
         "§7 civarinda bulunur; oraya yakin bir yerden baslat.";
  }
  return m;
}

/* ---------------- Bekleyen hedef ----------------
   Yetenek cercevesi olustur(oyuncu) cagiriyor, parametre
   gecirmiyor. Hedef bu yuzden ONCE buraya yaziliyor, sonra
   yetenek tetikleniyor. Menu ve sohbet ayni kapidan geciyor.  */

const bekleyen = new Map();      // oyuncuId -> {anahtar, adet}

export function derinHedefSec(oyuncuId, anahtar, adet) {
  bekleyen.set(oyuncuId, { anahtar, adet });
}

export function derinHedefUnut(oyuncuId) {
  bekleyen.delete(oyuncuId);
}

/* Adet kirpma tek yerde: hem menu hem sohbet buradan geciyor. */
export function adetKirp(n) {
  if (!isFinite(n) || n <= 0) return DERIN_VARSAYILAN;
  return Math.min(DERIN_ADET_TAVAN, Math.floor(n));
}

/* ---------------- Yetenek kaydi ---------------- */

yetenekKaydet({
  kimlik: "bot_derin",
  ad: "Bot: Derin Tarama",
  esyasiz: true,
  sira: 247,

  olustur(oyuncu) {
    if (!DERIN_ACIK) {
      actionbarYaz(oyuncu, "§cDerin tarama kapali (DERIN_ACIK).");
      kollariIndir(oyuncu);
      return undefined;
    }

    if (botSayisi(oyuncu.id) === 0) {
      actionbarYaz(oyuncu, "§eBotun yok. §7Once 'Bot cagir'.");
      kollariIndir(oyuncu);
      return undefined;
    }

    const istek = bekleyen.get(oyuncu.id);
    bekleyen.delete(oyuncu.id);

    /* Hedef soylenmediyse "maden": ne cikarsa. Sessizce hicbir
       sey yapmamaktansa makul bir varsayilan.                  */
    const hedef = hedefCoz(istek ? istek.anahtar : "maden") ||
                  hedefCoz("maden");
    const adet = adetKirp(istek ? istek.adet : DERIN_VARSAYILAN);

    /* Yanlis boyutta arama BASLATMA. Netherit'i Overworld'de
       aramak on dakika bos kazmak demek; botu bosuna
       yollamaktansa sebebini soylemek dogru olan.
       (Sahte is yaptirma kurali: uydurma sonuc yok.)           */
    if (hedef.boyut && oyuncu.dimension.id !== hedef.boyut) {
      try {
        oyuncu.sendMessage("§c" + hedef.ad + " burada YOK. §7Sadece §f" +
          hedef.boyut.replace("minecraft:", "") + "§7 boyutunda cikar; " +
          "oraya gec, botlari yanina al, sonra tekrar soyle.");
      } catch (e) {
        hataYaz("bot_derin.boyutUyari", e);
      }
      kollariIndir(oyuncu);
      return undefined;
    }

    let is;
    try {
      is = derinIs(oyuncu, hedef, adet);
    } catch (e) {
      hataYaz("bot_derin", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    const dk = (is.sure / 1200).toFixed(1);
    try {
      oyuncu.sendMessage(
        "§b⛏ Derin tarama: §f" + adet + " " + hedef.ad + "§7 aranıyor · " +
        botSayisi(oyuncu.id) + " bot · en fazla §f" + dk + " dk§7 · " +
        (hedef.y !== undefined ? "y=" + hedef.y + " seviyesine iniyorlar"
                               : "etrafi tariyorlar") +
        "\n§8Bulunca erken donerler. Bekleme: 'bot teslim' ile ara sonuc alinir.");
    } catch (e) {
      hataYaz("bot_derin.duyuru", e);
    }

    kollariIndir(oyuncu);
    return is;
  }
});
