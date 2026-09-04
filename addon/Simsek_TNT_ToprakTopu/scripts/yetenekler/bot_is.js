import { system } from "@minecraft/server";
import * as api from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { blokIste } from "../butce.js";
import {
  hataYaz, gecerliMi, kollariIndir, actionbarYaz, parcacikAt
} from "../yardimcilar.js";
import {
  botVarliklari, botSayisi, cantayaKoy, cantaDolulugu, botDurum, cantaKaydet
} from "./_bot_defteri.js";
import { teslimEtVeYaz } from "./bot_teslim.js";
import {
  BOT_IS_ACIK, BOT_IS_SURE, BOT_IS_YARICAP, BOT_ODUN_YUKSEK, BOT_MADEN_DERIN,
  BOT_IS_BOT_BASI, BOT_ODUN_BLOKLARI, BOT_MADEN_BLOKLARI, KORUNAN_KUME,
  BOT_CANTA_TAVAN, BOT_IS_DURARAK, BOT_IS_MERKEZ_KAYMA, BOT_IS_PARCACIK,
  BOT_IS_SES, BOT_IS_RAPOR_ARALIK, PARCACIK_TOPRAK
} from "../ayarlar.js";

/* ============================================================
   BOT ISLERI  --  Asama 2: odun topla, maden kaz

   ---- NEDEN BOTUN ETRAFINDA ----
   Bedrock'ta yol bulma API'si yok; bota "su agaca yuru"
   denemiyor. Bot KENDI etrafini isliyor. Sen ormana gidiyorsun,
   bot pesinden geliyor (vanilla takip), "odun" diyorsun, etrafi
   kesiyor. Referans modlarin "calisan bot"u da tam olarak bu --
   yuruyor gorunen sey aslinda seni takip etmesi.

   ---- IS LISTESINE GIRIYOR AMA OYUNCUNUN YUVASINI YEMIYOR ----
   Is nesnesinin oyuncuId'si "bot:" onekli. Boylece merkezi tick
   yoneticisi onu ayri bir kovada sayiyor ve oyuncunun AYNI_ANDA
   (2) yuvasi bos kaliyor -- bot calisirken sen de yetenek
   kullanabilesin diye. Kalp ve kafeslerde ogrenilen ders.

   ---- ARAMA UCUZ ----
   Offset listeleri modul yuklenirken BIR KEZ hesaplaniyor ve
   mesafeye gore siralaniyor. Tarama imlecli: her tick butcenin
   verdigi kadar blok okunuyor, kaldigi yerden devam ediliyor.
   Yirmi bot ayni 56 islem/tick butcesini paylasiyor, yani bot
   sayisi tick yukunu ARTIRMIYOR -- sadece isi yavaslatiyor.

   ---- ODUN: GOVDE TAKIBI ----
   Agac ararken kure taramak israf; govde DIKEY. Bot hizasinda
   yatay bir disk taraniyor; kutuk bulununca "tirmanma" moduna
   geciliyor ve o sutun yukari dogru kiriliyor. Gercek odun
   kesme de boyle.
   ============================================================ */

const ItemStack = api.ItemStack;

/* ---------------- Offset listeleri (bir kez) ----------------
   Mesafeye gore sirali: bot once dibindekini alsin, uzaga
   sonra baksin. Sirali olmasaydi rastgele bir blok kirip
   yanindakini atlardi ve "calisiyor" hissi kaybolurdu.        */

export function offsetler(yaricap, altY, ustY) {
  const liste = [];
  for (let dx = -yaricap; dx <= yaricap; dx++) {
    for (let dz = -yaricap; dz <= yaricap; dz++) {
      for (let dy = altY; dy <= ustY; dy++) {
        if (dx * dx + dz * dz > yaricap * yaricap) continue;
        liste.push({ x: dx, y: dy, z: dz, d: dx * dx + dy * dy + dz * dz });
      }
    }
  }
  liste.sort((a, b) => a.d - b.d);
  return liste;
}

/* Odun: yatay disk. Govde bot hizasinda bulunur, yukarisi
   tirmanma moduyla halledilir -- o yuzden ustY kucuk.         */
const ODUN_OFFSET = offsetler(BOT_IS_YARICAP, -1, 2);

/* Maden: asagi agirlikli kure. Cevher yukarida degil asagida. */
const MADEN_OFFSET = offsetler(BOT_IS_YARICAP, -BOT_MADEN_DERIN, 1);

const ISLER = {
  odun: {
    ad: "odun topluyor",
    offset: ODUN_OFFSET,
    hedefMi: (tip) => BOT_ODUN_BLOKLARI.has(tip),
    esya: (tip) => tip,                       // kutuk = kendi esyasi
    tirman: true
  },
  maden: {
    ad: "maden kaziyor",
    offset: MADEN_OFFSET,
    hedefMi: (tip) => BOT_MADEN_BLOKLARI.has(tip),
    esya: (tip) => BOT_MADEN_BLOKLARI.get(tip),
    tirman: false
  }
};

/* ---------------- Esya ----------------
   setType("air") esya DUSURMEZ, o yuzden karsiligi elle
   uretiliyor ve EKIP CANTASINA konuyor. Envantere aktarma
   bot_teslim.js'in isi.                                        */

let esyaUyarisi = false;

/* Esyayi OLUSTURUR ama vermez. Blogu kirmadan ONCE cagriliyor:
   esya uretilemiyorsa blok da kirilmamali, yoksa kaynak yok
   olur -- bot cevheri patlatip eline hicbir sey vermez. Test
   bu sirayi sinliyor.                                          */
function esyaHazirla(esyaKimligi) {
  if (!ItemStack || !esyaKimligi) return undefined;
  try {
    return new ItemStack(esyaKimligi, 1);
  } catch (e) {
    if (!esyaUyarisi) {
      esyaUyarisi = true;
      hataYaz("bot_is.ItemStack(" + esyaKimligi + ")", e);
    }
    return undefined;
  }
}

/* ---------------- Tek botun durumu ---------------- */

function botDurumu(varlik) {
  return {
    varlik,
    imlec: 0,          // offset listesinde nerede kaldik
    merkez: undefined, // taramanin baslatildigi nokta
    tirmanma: undefined, // {x, y, z} -- govde takibi
    bitti: false
  };
}

function merkezAl(varlik) {
  const k = varlik.location;
  return { x: Math.floor(k.x), y: Math.floor(k.y), z: Math.floor(k.z) };
}

/* ---------------- Is nesnesi ---------------- */

function botIsi(oyuncu, tur) {
  const tanim = ISLER[tur];
  const boyut = oyuncu.dimension;
  const bitis = system.currentTick + BOT_IS_SURE;

  /* Botlar isin BASINDA saptaniyor. Sonradan cagrilan bot bu
     ise katilmiyor -- katilsaydi "kac bot calisiyor" sayisi
     tick ortasinda degisir ve rapor yalan soylerdi.           */
  const botlar = botVarliklari(oyuncu.id).map((c) => botDurumu(c.varlik));

  let toplandi = 0;
  let raporlandi = false;
  let sonRapor = system.currentTick;

  /* Bot calisirken DURUYOR: hem imleci sifirlamiyor (yani
     gercekten tariyor) hem de nerede calistigi belli oluyor.
     Onceki durum saklaniyor, is bitince geri veriliyor.       */
  let oncekiDurum;
  if (BOT_IS_DURARAK) {
    try {
      const ilk = botVarliklari(oyuncu.id)[0];
      oncekiDurum = ilk ? ilk.kayit.durum : "takip";
      botDurum(oyuncu, "bekle");
    } catch (e) {
      hataYaz("bot_is.durdur", e);
    }
  }

  return {
    ad: "bot_" + tur,
    /* "bot:" oneki: oyuncunun AYNI_ANDA yuvasini yemesin diye.
       Merkezi yonetici isleri oyuncuId'ye gore kovaliyor.     */
    oyuncuId: "bot:" + oyuncu.id,

    calis() {
      if (!gecerliMi(oyuncu)) return true;
      if (system.currentTick >= bitis) return true;

      let calisan = 0;

      for (const b of botlar) {
        if (b.bitti) continue;
        if (!gecerliMi(b.varlik)) { b.bitti = true; continue; }
        calisan++;

        /* DIKKAT -- IMLEC SIFIRLAMA.

           v4.30'a kadar burada "bot bir blok bile kimildadiysa
           imleci sifirla" yaziyordu. Bot seni takip ettigi icin
           SUREKLI kimildiyordu: imlec hep 0'a doeuyor, bot da
           sadece en yakin ~8 offseti tekrar tekrar tariyordu.
           Uzaktaki agaclara hic sira gelmiyor, canta bos
           kaliyordu. Gercek oyunda goruelen hata buydu.

           Artik iki sey var: bot ise baslayinca DURUYOR (asagida)
           ve buradaki esik KAYDA DEGER kaymaya bakiyor -- fizik
           itmesi ya da mob carpmasi taramayi bastan baslatmasin. */
        const m = merkezAl(b.varlik);
        if (!b.merkez) {
          b.merkez = m;
          b.imlec = 0;
        } else {
          const kayma = Math.hypot(m.x - b.merkez.x, m.y - b.merkez.y,
                                   m.z - b.merkez.z);
          if (kayma > BOT_IS_MERKEZ_KAYMA) {
            b.merkez = m;
            b.imlec = 0;
          }
        }

        let islem = 0;
        while (islem < BOT_IS_BOT_BASI) {
          // Once govde takibi: bulunan agaci bitirmeden yenisini arama
          if (b.tirmanma) {
            if (blokIste(2) < 2) break;          // butce doldu
            islem += 2;
            const kirildi = blokKir(boyut, b.tirmanma, tanim, oyuncu);
            if (kirildi) {
              toplandi++;
              b.tirmanma = { x: b.tirmanma.x, y: b.tirmanma.y + 1,
                             z: b.tirmanma.z };
              if (b.tirmanma.y - b.merkez.y > BOT_ODUN_YUKSEK) b.tirmanma = undefined;
            } else {
              b.tirmanma = undefined;             // govde bitti
            }
            continue;
          }

          if (b.imlec >= tanim.offset.length) { b.bitti = true; break; }

          if (blokIste(1) < 1) break;             // butce doldu, sonraki tick
          islem++;

          const o = tanim.offset[b.imlec++];
          const nokta = { x: b.merkez.x + o.x, y: b.merkez.y + o.y,
                          z: b.merkez.z + o.z };

          let blok;
          try {
            blok = boyut.getBlock(nokta);
          } catch (e) {
            continue;                             // dunya siniri / yuklu degil
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

          if (blokIste(1) < 1) { b.imlec--; break; }   // yazma butcesi yok
          islem++;
          if (kirBlok(blok, boyut, nokta, tip, tanim, oyuncu)) {
            toplandi++;
            if (tanim.tirman) {
              b.tirmanma = { x: nokta.x, y: nokta.y + 1, z: nokta.z };
            }
          }
        }
      }

      /* Ilerleme bildirimi: "calisiyor mu, duruyor mu" sorusunu
         ortadan kaldiriyor. Kullanici bot calisirken hicbir sey
         gormedigi icin bosuna kirildigini sanmisti.            */
      if (BOT_IS_RAPOR_ARALIK > 0 && toplandi > 0 &&
          system.currentTick - sonRapor >= BOT_IS_RAPOR_ARALIK) {
        sonRapor = system.currentTick;
        try {
          actionbarYaz(oyuncu, "§b⛏ " + botlar.length + " bot " + tanim.ad +
                       " §7· §f" + toplandi + "§7 parca");
        } catch (e) {
          hataYaz("bot_is.rapor", e);
        }
      }

      if (calisan === 0) return true;             // butun botlar bitti
      return false;
    },

    bitir() {
      if (raporlandi) return;
      raporlandi = true;

      // Calisirken durdurulmuslardi; takibe geri don
      if (BOT_IS_DURARAK) {
        try {
          botDurum(oyuncu, oncekiDurum === "bekle" ? "bekle" : "takip");
        } catch (e) {
          hataYaz("bot_is.durumGeri", e);
        }
      }

      /* Canta her blokta degil BURADA kaydediliyor: blok basina
         setDynamicProperty + JSON.stringify cok pahaliydi.     */
      try {
        cantaKaydet();
      } catch (e) {
        hataYaz("bot_is.cantaKaydet", e);
      }

      try {
        if (toplandi === 0) {
          oyuncu.sendMessage("§eEtrafta " + (tur === "odun" ? "agac" : "cevher") +
            " bulunamadi. §7Botla birlikte oraya git, sonra tekrar soyle.");
          return;
        }

        /* "Topladiktan sonra bana versinler": is bitince teslim
           OTOMATIK. Elle 'bot teslim' demek zorunda kalmayasin
           diye; o komut is ortasinda ya da bot uzaktayken lazim. */
        teslimEtVeYaz(oyuncu,
          "§a" + botlar.length + " bot " + tanim.ad + " §7· getirdi: ");
      } catch (e) {
        hataYaz("bot_is.bitir", e);
      }
    }
  };
}

/* Blogu kirar ve esyayi cantaya koyar.

   DONEN DEGER: cantaya giren ESYA KIMLIGI (dogru), kirilmadiysa
   undefined. v4.32'de bool degildi artik string donuyor: derin
   tarama "kac ELMAS buldum" diye sayiyor, "kac blok kirdim"
   diye degil. Cagiran yerlerin hepsi dogruluk sinamasi yapiyor,
   yani string de bool gibi calisiyor.

   SIRA ONEMLI: once esya olusturuluyor. Olusturulamiyorsa blok
   KIRILMIYOR -- aksi halde bot cevheri yok eder ve eline hicbir
   sey gecmez. Bu, esya kimligi tablosunda bir yanlis varsa
   verinin sessizce kaybolmasini engelliyor.                    */
export function kirBlok(blok, boyut, nokta, tip, tanim, oyuncu) {
  const esyaKimligi = tanim.esya(tip);

  /* SIRA ONEMLI. Once esyanin uretilebildigi dogrulaniyor, sonra
     blok kiriliyor. Ters olsaydi kimlik tablosundaki bir yanlis
     blogu yok eder ve ele hicbir sey gecmezdi -- bot cevheri
     patlatirdi. Test bu sirayi kilitliyor.                     */
  if (!esyaHazirla(esyaKimligi)) return undefined;

  /* Canta doluysa blogu KIRMA: yerinde dursun. Kirip
     dusurseydik oyuncu farkinda olmadan birakip giderdi.      */
  if (cantaDolulugu(oyuncu.id) >= BOT_CANTA_TAVAN) return undefined;

  try {
    blok.setType("minecraft:air");
  } catch (e) {
    hataYaz("bot_is.setType", e);
    return undefined;
  }

  /* v4.28: esya DOGRUDAN envantere gitmiyor, EKIP CANTASINA
     giriyor ve is bitince topluca teslim ediliyor. Sebepleri
     bot_teslim.js'in basinda.                                 */
  cantayaKoy(oyuncu.id, esyaKimligi, 1);

  /* GORUNURLUK. Kullanici "botun onu yaptigini gormem gerek"
     dedi: bot yaninda duruyor, agac uzakta sessizce kayboluyordu.
     Kirilan blokta parcacik cikiyor ve ses caliniyor -- artik
     nerede ne yapildigi belli.                                 */
  if (BOT_IS_PARCACIK) {
    try {
      parcacikAt(boyut, PARCACIK_TOPRAK,
                 { x: nokta.x + 0.5, y: nokta.y + 0.5, z: nokta.z + 0.5 });
    } catch (e) {
      // gorsel; oynanisi etkilemiyor
    }
  }
  if (BOT_IS_SES) {
    try {
      if (typeof boyut.playSound === "function") {
        boyut.playSound(BOT_IS_SES,
                        { x: nokta.x + 0.5, y: nokta.y + 0.5, z: nokta.z + 0.5 });
      }
    } catch (e) {
      // ses her surumde yok; sessiz gecilir
    }
  }
  return esyaKimligi;
}

/* Govde takibi icin: noktadaki blok hedefse kir.
   Donen deger kirBlok ile ayni: esya kimligi ya da undefined. */
export function blokKir(boyut, nokta, tanim, oyuncu) {
  let blok;
  try {
    blok = boyut.getBlock(nokta);
  } catch (e) {
    return undefined;
  }
  if (!blok) return undefined;

  let tip;
  try {
    tip = blok.typeId;
  } catch (e) {
    return undefined;
  }
  if (!tanim.hedefMi(tip)) return undefined;
  if (KORUNAN_KUME.has(tip)) return undefined;

  return kirBlok(blok, boyut, nokta, tip, tanim, oyuncu);
}

/* ---------------- Yetenek kayitlari ---------------- */

function kaydet(kimlik, ad, tur, sira) {
  yetenekKaydet({
    kimlik, ad, esyasiz: true, sira,

    olustur(oyuncu) {
      if (!BOT_IS_ACIK) {
        actionbarYaz(oyuncu, "§cBot isleri kapali (BOT_IS_ACIK).");
        kollariIndir(oyuncu);
        return undefined;
      }

      const sayi = botSayisi(oyuncu.id);
      if (sayi === 0) {
        actionbarYaz(oyuncu, "§eBotun yok. §7Once 'Bot cagir'.");
        kollariIndir(oyuncu);
        return undefined;
      }

      let is;
      try {
        is = botIsi(oyuncu, tur);
      } catch (e) {
        hataYaz(kimlik, e);
        kollariIndir(oyuncu);
        return undefined;
      }

      actionbarYaz(oyuncu, "§a" + sayi + " bot " + ISLER[tur].ad + "...");
      kollariIndir(oyuncu);
      return is;
    }
  });
}

kaydet("bot_odun", "Bot: Odun Topla", "odun", 240);
kaydet("bot_maden", "Bot: Maden Kaz", "maden", 245);
