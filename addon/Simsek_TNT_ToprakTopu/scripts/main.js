import { world, system } from "@minecraft/server";

import {
  SURUM, BEKLEME, KOL_GECIKME, TICK_BLOK_BUTCESI, OLCUM_ACIK,
  OLCUM_SOHBETE, HATA_SOHBETE, ESYASIZ_ACIK, ESYASIZ_EGILME_SART,
  ESYASIZ_BAKIS_ESIGI, ESYASIZ_TUTMA, ESYASIZ_TARAMA,
  KOL_VER_ACIK, KOL_VER_ESIGI, KOL_VER_TUTMA, CIFT_EL_ACIK, AYNI_ANDA,
  MENU_DOKUNUSLA, BOT_KIMLIK, KALP_ADIM, KALP_TAVAN, BETA_GEREKLI,
  SOHBET_ONEK, BOT_TAVAN, DERIN_HEDEFLER, DERIN_VARSAYILAN,
  DONDUR_GIRDI_KILIT, ILKEL_BESLI, ILKEL_ACIK, botTuruMu,
  KILIC_ESYA
} from "./ayarlar.js";

import {
  hataYaz, bilgiYaz, gecerliMi, olayaAbone, sistemOlayaAbone, kollariKaldir,
  kollariIndir, actionbarYaz, eldekiEsya
} from "./yardimcilar.js";

import {
  butceSifirla, olcumSifirla, olcumTickBasla, olcumTickBitir, olcumRaporla
} from "./butce.js";

import { menuAc, menuKullanilabilir } from "./menu.js";
import { asaTara } from "./yetenekler/asa.js";
import { disTara } from "./yetenekler/disler.js";
import { kilicKullan, kilicTara, kilicUnut } from "./yetenekler/kilic.js";
import { tasTara, tasUnut } from "./yetenekler/tas.js";
import { silahKullan, silahTara, silahUnut, silahiBul } from "./yetenekler/silahlar.js";

/* Sohbet komutlari ("can 10", "lazer"...). Bu dosya main.js'i
   import etmiyor; komutlarin calistiracagi fonksiyonlar kanca
   olarak asagida veriliyor.                                    */
import {
  sohbetKur, sohbetKancalari, sohbetDurumMesaji, sohbetCalisiyorMu
} from "./sohbet.js";

import {
  esyaninYetenekleri, yetenekAl, esyasizSira, tumYetenekler, siraDenetimi
} from "./yetenekler/kayit.js";

/* ---------------- Yetenek dosyalari ----------------
   Her yetenek kendini kayit defterine yaziyor. Yeni yetenek
   eklemek icin yetenekler/ altina dosya ac ve buraya bir satir
   ekle. Bedrock'ta klasor tarama yok, import sart.              */
import "./yetenekler/yildirim.js";
import "./yetenekler/yildirim_halkasi.js";
import "./yetenekler/alan_simsegi.js";
import "./yetenekler/tnt_yagmuru.js";
import "./yetenekler/toprak_topu.js";
import "./yetenekler/savur.js";
import "./yetenekler/ucus.js";
import "./yetenekler/guclu_tnt.js";
import "./yetenekler/meteor.js";
import "./yetenekler/ors.js";
import "./yetenekler/buz_adam.js";
import "./yetenekler/toprak_ucus.js";
import "./yetenekler/ucurma.js";
import "./yetenekler/yamult.js";
import "./yetenekler/toprak_duvar.js";
import "./yetenekler/iksirler.js";
import "./yetenekler/goz_lazeri.js";
import "./yetenekler/guc_kapat.js";
import "./yetenekler/buz_mizragi.js";
import "./yetenekler/cekme.js";
import "./yetenekler/isinlanma.js";
import "./yetenekler/yetkili.js";
import "./yetenekler/kasirga.js";
import "./yetenekler/kubbe.js";
import "./yetenekler/hapis.js";
import "./yetenekler/dondur.js";
import "./yetenekler/isin_topu.js";
import "./yetenekler/yumruk.js";
import "./yetenekler/yakala.js";
import "./yetenekler/coklu_simsek.js";
import "./yetenekler/ok_yagmuru.js";
import "./yetenekler/sarsinti.js";
import "./yetenekler/kalp_ekle.js";
import "./yetenekler/kalp_sifirla.js";
import "./yetenekler/bot_cagir.js";
import "./yetenekler/bot_geri.js";
import "./yetenekler/bot_teslim.js";
import "./yetenekler/bot_is.js";
import "./yetenekler/bot_derin.js";
import "./yetenekler/asa.js";
import "./yetenekler/bot_ilkel.js";
import "./yetenekler/bot_guc.js";

/* DIKKAT -- SIRA ONEMLI.
   kollar.js var olan yeteneklere esya BAGLIYOR, yani bagladigi
   yeteneklerin o an kayitli olmasi gerekiyor. ES modulleri import
   satirlarinin YAZILDIGI SIRADA calisir; bu satir yukaridakilerin
   ustune tasinirsa kollar.js once calisir ve hicbir kol baglanmaz
   (sessizce, sadece Content Log'a uyari duser).                    */
import {
  KOL_ESYALARI, kisaAddanEsya, kolDenetimi, kollariVer, kayitliKollar
} from "./yetenekler/kollar.js";

/* Iksirler de kendi dosyasinda kayit oluyor; buradan sadece
   tarama ve temizlik cagriliyor.                              */
import {
  iksirTara, iksirAktifMi, kademeUnut, iksirSayisi, iksirKancalari, kademeAl
} from "./yetenekler/iksirler.js";

/* Lazer modu (Element'in buz/ates secimi). Modul yukaridaki
   yan etkili import satirinda zaten calisti; bu sadece adli
   erisim, yukleme sirasini degistirmiyor.                    */
import {
  lazerModlari, lazerModuAl, lazerModuDegistir, lazerModuUnut
} from "./yetenekler/goz_lazeri.js";

/* Kalpler de is listesine GIRMIYOR -- kalici oldugu icin oyuncunun
   iki is yuvasindan birini sonsuza kadar tutardi. Defter ayri,
   buradan sadece tazeleme cagriliyor.                            */
import {
  kalpTara, kalpliVarMi, kalpEkle, kalpSifirla, kalpAl
} from "./yetenekler/_kalp_defteri.js";

/* Bot da is listesine GIRMIYOR -- kalici oldugu icin oyuncunun
   iki is yuvasindan birini sonsuza kadar tutardi. Kalp ve kafes
   defterleriyle ayni kalip.                                     */
import {
  botTara, botVarMi, botDurum, botGeri, botAl, botunSahibi, botDenetimi,
  botUnut, botKayitliMi, botSayisi, botYanaCagir, botSavas, savasAcikMi,
  cantaDolulugu, eksikBotTurleri
} from "./yetenekler/_bot_defteri.js";

/* Gunes Yumrugu kaydi is listesinden bagimsiz bir Map'te; oyuncu
   cikinca o da temizlenmeli.                                    */
import { yumrukUnut } from "./yetenekler/yumruk.js";

/* Derin tarama hedefi yetenek cercevesinden GECMIYOR (olustur()
   parametre almiyor), ayri bir Map'te bekliyor. Menu ve sohbet
   once hedefi yaziyor, sonra yetenegi tetikliyor.               */
import {
  derinHedefSec, derinHedefUnut, hedefCoz, derinSure, adetKirp
} from "./yetenekler/bot_derin.js";

/* Ilkel Besli de ayni kalibi kullaniyor: hangi uye cagrilacagi
   once yaziliyor, sonra yetenek tetikleniyor.                  */
import {
  ilkelHedefSec, ilkelHedefUnut, ilkelListesi, ilkelAdCoz, ozetle, rutbeSirasi
} from "./yetenekler/bot_ilkel.js";

/* ============================================================
   MERKEZI TICK YONETICISI
   Her yetenek kendi runInterval'ini acmak yerine tek dongu var
   ve butceyi o dagitiyor.
   ============================================================ */

const isler = [];                 // aktif isler
const sonKullanim = new Map();    // oyuncuId -> son tetikleme tick'i

/* oyuncuId -> [is, ...]

   Eskiden oyuncu basina TEK is vardi. Cift el icin gevsetildi:
   sag ve sol eldeki kollar ayni anda calisabilsin diye en fazla
   AYNI_ANDA is tutuluyor. Bu tick yukunu ARTIRMIYOR -- blok/varlik
   butcesi ortak, iki is onu paylasiyor, toplam tavan ayni.      */
const oyuncununIsleri = new Map();

function oyuncuIsSayisi(oyuncuId) {
  const liste = oyuncununIsleri.get(oyuncuId);
  return liste ? liste.length : 0;
}

function isEkle(is) {
  if (OLCUM_ACIK && isler.length === 0) olcumSifirla();
  isler.push(is);
  const liste = oyuncununIsleri.get(is.oyuncuId);
  if (liste) liste.push(is);
  else oyuncununIsleri.set(is.oyuncuId, [is]);
}

function isSil(indeks) {
  const is = isler[indeks];
  isler.splice(indeks, 1);

  const liste = oyuncununIsleri.get(is.oyuncuId);
  if (liste) {
    const i = liste.indexOf(is);
    if (i !== -1) liste.splice(i, 1);
    if (liste.length === 0) oyuncununIsleri.delete(is.oyuncuId);
  }

  try {
    if (typeof is.bitir === "function") is.bitir();
  } catch (e) {
    hataYaz(is.ad + ".bitir", e);
  }
}

system.runInterval(() => {
  /* ---- BUTCE TICK'IN BASINDA SIFIRLANIYOR (v4.85) ----
     v4.22'den beri butceSifirla() asagidaydi, "if
     (isler.length === 0) return;" satirinin ALTINDA. Yani
     butce yalnizca AKTIF IS varken doluyordu ve tick basindaki
     TARAMALAR (bot isleri, disler) bos butceyle calisiyordu.

     O gun bunun etrafindan dolanilmisti: _bot_defteri.js'te
     "burada varlikIste() YOK, bilerek" notu tam bu yuzden
     yazildi -- bot hic dogmuyordu.

     Okazor'un disleri ayni duvara carpti: sekiz dis kuyruga
     giriyor, hicbiri cikmiyordu. Etrafindan bir kez daha
     dolanmak yerine kok duzeltildi.

     Butce TICK BASINA bir kotadir; dogru yeri tick'in basi.
     Simdi taramalar da isler de ayni havuzdan yiyor -- zaten
     amaci buydu.                                             */
  butceSifirla();

  // Esyasiz jest taramasi: aktif is olmasa da calismali
  if (ESYASIZ_ACIK) {
    try {
      esyasizTara();
    } catch (e) {
      hataYaz("esyasizTara", e);
    }
  }

  /* Iksir kademesi is listesine GIRMIYOR. Girseydi "oyuncu basina
     tek efekt" kurali yuzunden 60 saniye boyunca butun yetenekler
     kilitlenirdi. Ayrica Map bosken bu cagri bedava.            */
  /* Kalp defteri de ayni sebeple is listesi disinda. Ikisi de
     oyuncu listesi istiyor; getAllPlayers TEK kez cagriliyor,
     ikisi de bosken hic cagrilmiyor.                           */
  const iksirVar = iksirAktifMi();
  const kalpVar = kalpliVarMi();
  const botVar = botVarMi();
  if (iksirVar || kalpVar || botVar) {
    let oyuncular;
    try {
      oyuncular = world.getAllPlayers();
    } catch (e) {
      hataYaz("getAllPlayers", e);
      oyuncular = [];
    }
    if (iksirVar) {
      try {
        iksirTara(oyuncular);
      } catch (e) {
        hataYaz("iksirTara", e);
      }
    }
    if (kalpVar) {
      try {
        kalpTara(oyuncular);
      } catch (e) {
        hataYaz("kalpTara", e);
      }
    }
    if (botVar) {
      try {
        botTara(oyuncular);
      } catch (e) {
        hataYaz("botTara", e);
      }
    }
  }

  /* ---- BU TARAMALAR OYUNCU LISTESINE BAGLI DEGIL (v4.86) ----
     v4.50'den beri asaTara() yukaridaki "iksir/kalp/bot var mi"
     blogunun ICINDEYDI. Yani hicbir iksir icilmemis, hicbir bot
     cagrilmamissa sersemlik SAYACI HIC ISLEMIYORDU -- kilit
     acilmiyordu.

     Yeni kilicin testi bunu yakaladi: izleyici modu suresi
     dolmasina ragmen oyuncu izleyicide kaliyordu. Ayni sey
     tasa cevrilenler icin de gecerliydi.

     Dordu de kendi defterleri bosken HEMEN donuyor, yani
     disariya almanin bir maliyeti yok. Dogru yer burasi.   */
  try {
    asaTara();
    disTara();
    kilicTara();
    tasTara();
    silahTara();
  } catch (e) {
    hataYaz("taramalar", e);
  }

  if (isler.length === 0) return;

  /* butceSifirla() ARTIK BURADA DEGIL, tick'in basinda
     (bkz. yukaridaki not). Buraya geri konursa taramalar
     yine bos butceyle calisir.                            */
  olcumTickBasla();

  for (let i = isler.length - 1; i >= 0; i--) {
    const is = isler[i];
    let bitti;
    try {
      bitti = is.calis();
    } catch (e) {
      // Isin kendi ele alamadigi hata: bozuk durumda donmeye devam etmesin
      hataYaz(is.ad, e);
      bitti = true;
    }
    if (bitti) isSil(i);
  }

  olcumTickBitir();
  if (isler.length === 0) olcumRaporla();
}, 1);

/* ============================================================
   ORTAK TETIKLEME YOLU
   Esya ve jest ayni kapidan geciyor: bekleme suresi ve
   oyuncu basina tek efekt kurali ikisinde de ayni.
   ============================================================ */

/* Bir ya da BIRDEN FAZLA yetenegi tek tetikleme olarak calistirir.

   Cift elde iki yetenek birlikte gidiyor ama bu TEK tetikleme
   sayiliyor: bekleme suresi bir kez isliyor, yoksa sol el sag
   elin beklemesine takilirdi.                                   */
function yetenekTetikle(oyuncu, kimlikler) {
  const liste = Array.isArray(kimlikler) ? kimlikler : [kimlikler];
  if (liste.length === 0) return false;

  if (oyuncuIsSayisi(oyuncu.id) >= AYNI_ANDA) return false;

  const simdi = system.currentTick;
  const onceki = sonKullanim.get(oyuncu.id);
  if (onceki !== undefined && simdi - onceki < BEKLEME) return false;
  sonKullanim.set(oyuncu.id, simdi);

  kollariKaldir(oyuncu);

  system.runTimeout(() => {
    let acilan = 0;
    for (const kimlik of liste) {
      try {
        if (!gecerliMi(oyuncu)) return;
        if (oyuncuIsSayisi(oyuncu.id) >= AYNI_ANDA) break;

        const tanim = yetenekAl(kimlik);
        if (!tanim) {
          bilgiYaz("UYARI: bilinmeyen yetenek kimligi: " + kimlik);
          continue;
        }

        /* olustur() tek bir is ya da IS DIZISI donebilir.
           Dizi v4.29'da lazim oldu: bot gucleri bot basina bir
           is aciyor (bes bot = bes simsek isi). Tek tetikleme
           sayiliyor, yani bekleme suresi bir kez isliyor.      */
        const sonuc = tanim.olustur(oyuncu);
        if (Array.isArray(sonuc)) {
          for (const is of sonuc) {
            if (is) { isEkle(is); acilan++; }
          }
        } else if (sonuc) {
          isEkle(sonuc);
          acilan++;
        }
      } catch (e) {
        hataYaz("yetenekTetikle(" + kimlik + ")", e);
      }
    }
    // Hicbiri surekli is acmadiysa kollari indir; acanlar kendi
    // bitir()'inde indiriyor.
    if (acilan === 0) kollariIndir(oyuncu);
  }, KOL_GECIKME);

  return true;
}

function kalanBekleme(oyuncuId) {
  const onceki = sonKullanim.get(oyuncuId);
  if (onceki === undefined) return 0;
  const gecen = system.currentTick - onceki;
  return gecen < BEKLEME ? (BEKLEME - gecen) : 0;
}

/* ============================================================
   ESYA ILE TETIKLEME
   ============================================================ */

/* "pa:kol_toprak" -> "Toprak Kol". Menu basligi icin; kimligi
   ham gostermek yerine kollar.js'teki adi kullaniyoruz.        */
function kolBasligi(esyaKimligi) {
  const kisa = esyaKimligi.slice(esyaKimligi.indexOf(":") + 1);
  return kisa.replace(/^kol_/, "").replace(/_/g, " ") + " kolu";
}

/* Menunun altina eklenen yardimci dugmeler. Tek yetenekli kolda
   menuyu anlamli kilan sey bunlar.                             */
/* ============================================================
   DERIN TARAMA MENUSU  (v4.32)

   NEDEN MENU: hedef vermek bir SAYI ve bir CEVHER ADI istiyor,
   yani yazmak gerekiyor. Sohbet komutlari kararli API'de
   calismiyor (chatSend "Beta APIs" istiyor) ve tablette
   /scriptevent yazmak eziyet. Menu tek dokunusluk yol.

   Sohbete yazabilenler icin "bot elmas 64" da duruyor; ikisi
   ayni kapiya cikiyor.

   Liste ayarlardan URETILIYOR, elle yazilmiyor: ayarlar.js'e
   yeni bir cevher eklenince menude kendiliginden cikiyor ve
   sure de dogru gosteriliyor.                                  */
function derinMenusu(oyuncu) {
  const liste = [];
  for (const [anahtar, tanim] of DERIN_HEDEFLER) {
    const adet = DERIN_VARSAYILAN;
    const dk = (derinSure(tanim, adet) / 1200).toFixed(1);
    liste.push({
      anahtar,
      adet,
      ad: adet + " " + tanim.ad + " §8· en fazla " + dk + " dk" +
          (tanim.boyut ? " §8(" + tanim.boyut.replace("minecraft:", "") + ")" : "")
    });
  }

  /* "4 tane 64'luk demir" ornegi: dort yigin isteyen kisayol. */
  const dortYigin = [
    { anahtar: "demir", adet: 256 },
    { anahtar: "elmas", adet: 128 },
    { anahtar: "komur", adet: 256 }
  ];
  for (const s of dortYigin) {
    const tanim = DERIN_HEDEFLER.get(s.anahtar);
    if (!tanim) continue;
    const dk = (derinSure(tanim, s.adet) / 1200).toFixed(1);
    liste.push({
      anahtar: s.anahtar,
      adet: s.adet,
      ad: s.adet + " " + tanim.ad + " §8(" + (s.adet / 64) + " yigin) · " +
          dk + " dk"
    });
  }

  const acildi = menuAc(oyuncu, "§bDerin tarama §7· ne getirsinler?",
    liste, -1,
    (i) => derinBaslat(oyuncu, liste[i].anahtar, liste[i].adet),
    []);

  if (!acildi) {
    /* Menu yoksa sessiz kalma: varsayilanla baslat ve nasil
       hedef verilecegini soyle.                                */
    actionbarYaz(oyuncu, "§7Menu yok; varsayilan derin tarama basliyor");
    derinBaslat(oyuncu, "maden", DERIN_VARSAYILAN);
  }
}

/* Hedefi yaz, sonra yetenegi tetikle. Iki adim ayri cunku
   yetenek cercevesi olustur()'a parametre gecirmiyor.          */
function derinBaslat(oyuncu, anahtar, adet) {
  derinHedefSec(oyuncu.id, anahtar, adet);
  if (yetenekTetikle(oyuncu, "bot_derin")) return undefined;

  /* Tetiklenemedi: bekleyen hedefi BIRAKMA, yoksa bir sonraki
     "bot_derin" tetiklemesi yanlis hedefle calisirdi.          */
  derinHedefUnut(oyuncu.id);
  const kalan = kalanBekleme(oyuncu.id);
  const mesaj = kalan > 0
    ? "§7Derin tarama §8· §c" + (kalan / 20).toFixed(1) + " sn bekle"
    : "§7Derin tarama §8· §caktif isin dolu (" + AYNI_ANDA + ")";
  actionbarYaz(oyuncu, mesaj);
  return mesaj;
}

/* ============================================================
   ILKEL BESLI MENUSU  (v4.34)

   Bes uye tek tek cagriliyor; listede kimin ne yaptigi da
   yaziyor. Ezberlemek zorunda kalma diye ozet ayarlardan
   URETILIYOR -- yeni bir uye eklenirse menude kendiliginden
   dogru gorunur.
   ============================================================ */
function ilkelMenusu(oyuncu) {
  const yaninda = new Set(ilkelListesi(oyuncu.id));
  const liste = [];
  /* RUTBE SIRASINDA: lider ustte. Sira bot_ilkel.js'ten
     geliyor, burada elle yazilmiyor.                          */
  for (const anahtar of rutbeSirasi()) {
    const t = ILKEL_BESLI.get(anahtar);
    liste.push({
      anahtar,
      ad: (yaninda.has(anahtar) ? "§a✔ " : "") + "§6[" + t.rutbe + "] §f" +
          t.ad + " §7· " + t.unvan +
          " §8" + t.can + " can · " + t.hasar + " hasar\n§8" + ozetle(anahtar)
    });
  }

  /* "HEPSINI CAGIR" DUGMESI KALDIRILDI  (v4.36)

     Kullanicinin sozu: "bir anda 5 tanesi de gelmesin, tek tek
     aralarindan secerim." Hakli -- bes patronu ayni anda
     yanina dizmek hem ekibi siradanlastiriyor hem de kimin ne
     yaptigini gormeni engelliyor. Uye secmek artik bilincli
     bir karar: menuden birini sec, o gelir.                   */
  const acildi = menuAc(oyuncu, "§6İlkel Beşli §7· kimi çağırayım?",
    liste, -1,
    (i) => ilkelBaslat(oyuncu, liste[i].anahtar),
    []);

  if (!acildi) ilkelBaslat(oyuncu);
}

function ilkelBaslat(oyuncu, anahtar) {
  if (!ILKEL_ACIK) {
    actionbarYaz(oyuncu, "§cİlkel Beşli kapalı (ILKEL_ACIK).");
    return undefined;
  }
  if (anahtar) ilkelHedefSec(oyuncu.id, anahtar);
  if (yetenekTetikle(oyuncu, "bot_ilkel")) return undefined;

  ilkelHedefUnut(oyuncu.id);
  const kalan = kalanBekleme(oyuncu.id);
  const mesaj = kalan > 0
    ? "§7İlkel Beşli §8· §c" + (kalan / 20).toFixed(1) + " sn bekle"
    : "§7İlkel Beşli §8· §caktif işin dolu (" + AYNI_ANDA + ")";
  actionbarYaz(oyuncu, mesaj);
  return mesaj;
}

function menuEkleri(oyuncu) {
  const ekler = [];

  /* ---- GOZ LAZERI (v4.65) ----
     Sadece lazerli bir kademe ACIKKEN gorunuyor; iksir icmemisken
     menuyu sisirmesin. Ustteki lazerModu notunda anlatilan hatanin
     tabletteki tek-dokunusluk cozumu bu.

     Dokununca hem MODU aciyor hem HEMEN atiyor: "ac" ve "at" iki
     ayri dokunus olsaydi ilk atisi yapmak uc hareket ederdi.    */
  const kademe = lazerliKademe(oyuncu.id);
  if (kademe) {
    const acik = lazerModu.has(oyuncu.id);
    ekler.push({
      ad: acik ? "§e⚡ Goz Lazeri §a· ACIK §8(kapat)"
               : "§e⚡ Goz Lazeri §8(ac ve at)",
      calis() {
        if (lazerModu.has(oyuncu.id)) {
          lazerModunuKapat(oyuncu);
          actionbarYaz(oyuncu, "§8⚡ Goz Lazeri kapandi §7· kol yetenegin geri geldi");
          return;
        }
        lazerModunuAc(oyuncu, true);
        if (!yetenekTetikle(oyuncu, "goz_lazeri")) {
          const kalan = kalanBekleme(oyuncu.id);
          actionbarYaz(oyuncu, "§6⚡ §eGoz Lazeri acik §8· egil+zipla" +
                       (kalan > 0 ? " §c" + (kalan / 20).toFixed(1) + " sn" : ""));
        } else {
          actionbarYaz(oyuncu, "§6⚡ §eGoz Lazeri acik §8· egil+zipla = lazer");
        }
      }
    });

    /* ---- ELEMENT: BUZ / ATES ---- (v4.67)
       Kullanici: "element iksirinde hem bu hem ates var ya,
       atesi olarak ayarladigimiz zaman karsidaki yanmaya
       basliyor, buz haline cevirirsek yavaslik aliyor ve
       etrafi buz blogu ile kaplaniyor."

       Satir SADECE modu olan kademede cikiyor; obur yedi
       iksirde menu sismiyor.                                */
    const modlar = lazerModlari(kademe);
    if (modlar && modlar.length > 1) {
      const simdiki = lazerModuAl(oyuncu.id, kademe);
      ekler.push({
        ad: "§b❄ Lazer modu: §f" + simdiki.ad + " §8(degistir)",
        calis() {
          const yeni = lazerModuDegistir(oyuncu.id, kademe);
          actionbarYaz(oyuncu, "§b❄ §fLazer modu: §b" + yeni.ad +
                       (yeni.kimlik === "buz"
                         ? " §8· yavaslatir ve buza gomer"
                         : " §8· yakar"));
        }
      });
    }
  }

  ekler.push(
    /* ---- EFSANE YAPISI (v4.71) ----
       Jest sirasinda 270. sirada; oraya ulasmak icin onlarca
       kez "egil + yukari bak" gerekirdi. Bot ve goz lazerinde
       ayni tuzaga dusulmustu -- menu tabletteki tek
       tek-dokunusluk yol.                                    */
    {
      ad: "§b◆ Efsane yapisi kur",
      calis() { yetenekTetikle(oyuncu, "efsane_yapisi"); }
    },
    {
      ad: "Butun kollari al",
      calis() { kollariVer(oyuncu); }
    },
    {
      ad: "Gucu kapat",
      calis() { yetenekTetikle(oyuncu, "guc_kapat"); }
    },
    /* Kalpler KALICI. Geri alinamayan kalici bir guc oyunu bozar
       (referans modlarin hatasi tam buydu), o yuzden iptali her
       kolun menusunden bir dokunus uzakta.                       */
    {
      ad: "Kalpleri sifirla",
      calis() { yetenekTetikle(oyuncu, "kalp_sifirla"); }
    },

    /* ---- v4.23: BOT MENUYE GELDI ----
       Bot sadece sohbetten yonetiliyordu ve sohbet komutlari
       KARARLI API'de calismiyor (chatSend "Beta APIs" istiyor).
       Oyuncu dort kez "bot" yazdi, mesaj sohbete duz metin olarak
       dustu ve hicbir sey olmadi.

       Jest sirasi da cozum degil: bot_cagir 36 yetenegin sonuna
       yakin, oraya ulasmak icin onlarca kez "egil + yukari bak"
       gerekiyor -- goz lazerindeki hatanin aynisi.

       Menu tabletteki TEK tek-dokunusluk yol, o yuzden bot
       kontrolleri buraya kondu.                                 */
    {
      ad: "Bot cagir §8(" + botSayisi(oyuncu.id) + "/" + BOT_TAVAN + ")",
      calis() { yetenekTetikle(oyuncu, "bot_cagir"); }
    },
    {
      ad: "Bot: odun topla",
      calis() { yetenekTetikle(oyuncu, "bot_odun"); }
    },
    {
      ad: "Bot: maden kaz",
      calis() { yetenekTetikle(oyuncu, "bot_maden"); }
    },
    {
      ad: "Bot: DERIN TARAMA §8(hedefli)",
      calis() { derinMenusu(oyuncu); }
    },
    {
      ad: "Bot: İLKEL BEŞLİ §8(" + ilkelListesi(oyuncu.id).length + "/" +
          ILKEL_BESLI.size + ")",
      calis() { ilkelMenusu(oyuncu); }
    },
    {
      ad: "Bot: simsek yagdir",
      calis() { yetenekTetikle(oyuncu, "bot_simsek"); }
    },
    {
      ad: "Bot: kil topu at",
      calis() { yetenekTetikle(oyuncu, "bot_top"); }
    },
    {
      ad: "Bot: teslim al §8(" + cantaDolulugu(oyuncu.id) + ")",
      calis() { yetenekTetikle(oyuncu, "bot_teslim"); }
    },
    {
      ad: "Bot: savas " + (savasAcikMi(oyuncu.id) ? "KAPAT" : "AC"),
      calis() { yetenekTetikle(oyuncu, "bot_savas"); }
    },
    {
      ad: "Bot: yanima gel",
      calis() {
        const n = botYanaCagir(oyuncu);
        actionbarYaz(oyuncu, n > 0 ? "§a" + n + " bot yanina geldi" : "§eBotun yok.");
      }
    },
    {
      ad: (botAl(oyuncu.id) || {}).durum === "bekle"
        ? "Bot: takip et" : "Bot: bekle",
      calis() {
        const kayit = botAl(oyuncu.id);
        if (!kayit) {
          actionbarYaz(oyuncu, "§eBotun yok. §7Once 'Bot cagir'.");
          return;
        }
        const yeni = botDurum(oyuncu, kayit.durum === "bekle" ? "takip" : "bekle");
        actionbarYaz(oyuncu, yeni === "bekle"
          ? "§eBot bekliyor" : "§aBot pesinden geliyor");
      }
    },
    {
      ad: "Bot: hepsini geri gonder",
      calis() {
        const n = botGeri(oyuncu);
        actionbarYaz(oyuncu, n > 0
          ? "§8" + n + " bot geri gonderildi" : "§eBotun yok.");
      }
    },

    /* Can eklemek de sohbete bagliydi ("can 10"). Menuden sabit
       adim veriliyor; sayi yazmak isteyen scriptevent'i kullanir. */
    {
      ad: "Durum (her sey calisiyor mu)",
      calis() {
        try {
          oyuncu.sendMessage(durumRaporu(oyuncu));
        } catch (e) {
          hataYaz("menu.durum", e);
        }
      }
    },
    {
      ad: "Can +" + KALP_ADIM + " kalp",
      calis() {
        const s = kalpEkle(oyuncu, KALP_ADIM);
        actionbarYaz(oyuncu, (s && s.eklenen > 0)
          ? "§c❤ +" + s.eklenen + " kalp §7(toplam " + (10 + s.toplam) + ")"
          : "§eTavandasin (" + KALP_TAVAN + " ek kalp)");
      }
    }
  );

  return ekler;
}

const girisKuruldu = olayaAbone("itemUse", (olay) => {
  try {
    const oyuncu = olay.source;
    const esya = olay.itemStack;
    if (!oyuncu || !esya) return;

    /* ---- RESETTING SWORD (v4.86) ----
       Kol degil, kendi basina bir esya. Kol dallarindan ONCE
       bakiliyor cunku esyaninYetenekleri onu tanimaz ve
       asagidaki "liste yoksa cik" satirinda dusup giderdi.  */
    /* ---- SILAHLAR (v4.87) ----
       Kol degil, kendi baslarina esyalar. Kol dallarindan
       ONCE bakiliyor: esyaninYetenekleri onlari tanimaz ve
       asagidaki "liste yoksa cik" satirinda duserlerdi.
       Kilic ile ayni kalip.                                */
    if (silahiBul(esya.typeId)) {
      silahKullan(oyuncu, esya.typeId);
      return;
    }

    if (esya.typeId === KILIC_ESYA) {
      const is = kilicKullan(oyuncu);
      if (is) isEkle(is);
      return;
    }

    /* Cok yetenekli kolda esyaya dokunmak da SECILI yetenegi
       calistirir; jestle ayni davransin diye.                    */
    const liste = esyaninYetenekleri(esya.typeId);
    if (!liste || liste.length === 0) return;

    /* ---- MENU: HER KOLDA VAR, TEK DOKUNUSLA ACILIR ----

       v4.13'e kadar menu ancak EGILEREK kullaninca ve sadece cok
       yetenekli kolda aciliyordu. Tablette egilme dugmesini basili
       tutup esyaya dokunmak zahmetli; ustelik tek yetenekli
       kollarda menu hic yoktu.

       Artik kola DOKUNMAK menuyu aciyor -- tabletteki en kolay
       hareket. Secince yetenek hem secili kaydediliyor hem HEMEN
       calisiyor, yani ikinci bir jest gerekmiyor.

       Jestler aynen duruyor: egil + zipla hala calistiriyor,
       egil + yukari bak hala degistiriyor. Menu onlarin yerine
       degil, yanina geldi.

       MENU_DOKUNUSLA false yapilirsa eski davranisa doner:
       dokunmak calistirir, EGILEREK dokunmak menuyu acar.       */
    const menuIstendi = MENU_DOKUNUSLA ? true : (oyuncu.isSneaking === true);

    if (menuIstendi) {
      const acildi = menuAc(
        oyuncu,
        "§e" + kolBasligi(esya.typeId),
        liste,
        kolSecimAl(oyuncu.id, esya.typeId, liste.length),
        (indeks) => {
          kolSecim.set(oyuncu.id, { esya: esya.typeId, i: indeks });
          /* Secince HEMEN calistir: menuden cikip ayrica jest
             yapmak zorunda kalma.                              */
          if (!yetenekTetikle(oyuncu, liste[indeks].kimlik)) {
            const kalan = kalanBekleme(oyuncu.id);
            actionbarYaz(oyuncu, "§6» §e" + liste[indeks].ad +
                         (kalan > 0 ? " §8· §c" + (kalan / 20).toFixed(1) + " sn"
                                    : " §8· secildi"));
          }
        },
        menuEkleri(oyuncu)
      );
      if (acildi) return;
    }

    /* Menu acilamadi (modul yok ya da kapali): eski yol. */
    const tanim = liste[kolSecimAl(oyuncu.id, esya.typeId, liste.length)];
    yetenekTetikle(oyuncu, tanim.kimlik);
  } catch (e) {
    hataYaz("itemUse", e);
  }
});

if (!girisKuruldu) {
  bilgiYaz("KRITIK: itemUse olayina abone olunamadi, esyalar calismaz.");
}

/* ---- Ikinci giris yolu: elle scriptevent ----
     /scriptevent simsek:kol kol_toprak
   Esya JSON'unda on_use YOK (run_command deneysel ayar
   gerektiriyordu, v3.6'da kaldirildi). Bu dinleyici duruyor cunku
   komutu elle yazmak, esyalar kaydolmadiginda yetenegi denemenin
   en kisa yolu.                                                   */
sistemOlayaAbone("scriptEventReceive", (olay) => {
  try {
    if (olay.id !== "simsek:kol") return;

    const oyuncu = olay.sourceEntity;
    if (!oyuncu || oyuncu.typeId !== "minecraft:player") return;

    const esya = kisaAddanEsya(String(olay.message || "").trim());
    if (!esya) {
      bilgiYaz("UYARI: scriptevent simsek:kol -> tanimsiz kol: " + olay.message);
      return;
    }

    const liste = esyaninYetenekleri(esya);
    if (!liste || liste.length === 0) return;
    const tanim = liste[kolSecimAl(oyuncu.id, esya, liste.length)];
    yetenekTetikle(oyuncu, tanim.kimlik);
  } catch (e) {
    hataYaz("scriptEventReceive", e);
  }
});

/* ============================================================
   ESYASIZ TETIKLEME (JEST)
     egil + tam yukari bak -> yetenek degistir
     egil + zipla          -> secili yetenegi calistir
   ============================================================ */

const esyasizTutma = new Map();   // oyuncuId -> jest kac tick tutuldu
const esyasizSecim = new Map();   // oyuncuId -> sira icindeki indeks
const esyasizZipla = new Map();   // oyuncuId -> onceki taramada zipliyor muydu
const kolVerTutma = new Map();    // oyuncuId -> asagi bakma jesti kac tick tutuldu
const ESYASIZ_TAMAM = -1;         // jest islendi, durus bozulana kadar tekrarlama
let esyasizSayac = 0;

/* Cok yetenekli kollarda (Toprak Kol) hangi yetenegin secili
   oldugu. Secim KOL BASINA tutuluyor: elindeki kolu degistirip
   geri aldiginda o kolun secimi yerinde kalir.
     oyuncuId -> { esya: "pa:kol_toprak", i: 2 }                 */
const kolSecim = new Map();

function kolSecimAl(oyuncuId, esya, uzunluk) {
  const kayit = kolSecim.get(oyuncuId);
  if (!kayit || kayit.esya !== esya) return 0;
  return kayit.i % uzunluk;
}

/* Bir eldeki kolun yetenek listesi, yoksa undefined.
   slot: "Mainhand" (sag) ya da "Offhand" (sol).                */
function eldekiKol(oyuncu, slot) {
  const esya = eldekiEsya(oyuncu, slot);
  if (!esya) return undefined;
  const liste = esyaninYetenekleri(esya);
  if (!liste || liste.length === 0) return undefined;
  return { esya, liste };
}

/* Kolun O AN secili yetenegi. */
function koldakiSecim(oyuncuId, kol) {
  return kol.liste[kolSecimAl(oyuncuId, kol.esya, kol.liste.length)];
}

// isJumping bazi surumlerde olmayabilir; bir kez sinanip onbellege alinir
let ziplamaVar;

function ziplamaOkunabilir(oyuncu) {
  if (ziplamaVar === undefined) {
    ziplamaVar = (typeof oyuncu.isJumping === "boolean");
    if (!ziplamaVar) {
      bilgiYaz("UYARI: player.isJumping yok. Esyasiz CALISTIRMA jesti " +
               "kullanilamiyor, sadece yetenek degistirme calisir.");
    }
  }
  return ziplamaVar;
}

function egilmeTamam(oyuncu) {
  return !ESYASIZ_EGILME_SART || oyuncu.isSneaking === true;
}

function degistirmeDurusu(oyuncu) {
  if (!egilmeTamam(oyuncu)) return false;
  return oyuncu.getViewDirection().y >= ESYASIZ_BAKIS_ESIGI;
}

function secimAl(oyuncuId) {
  const i = esyasizSecim.get(oyuncuId);
  return (i === undefined) ? 0 : i;
}

/* ============================================================
   LAZER MODU  --  "goz taktiysan egil+zipla lazer atar"

   ---- HATANIN HIKAYESI ----
   v4.20: iksir icip "lazer atayim" diye egil + zipla yapilinca
   ETRAFA YILDIRIM yagdi. Teshis: lazer bozuk degil, ULASILAMIYOR.
   Esyasiz jest sirasinda Goz Lazeri 21. sirada, sifirinci sira
   ise Yildirim Halkasi. Secim hic degistirilmediyse sifirinci
   calisir.

   v4.20'deki cozum: icince ESYASIZ SECIMI lazere kaydir.

   v4.65: kullanici ayni hatayi UC SURUM daha bildirdi. Cozum
   eksikmis ve nedeni su:

     Elde KOL varsa esyasiz secime HIC BAKILMIYOR.
     esyasizOyuncu() once eldeki kola bakiyor; kol varsa onun
     secili yetenegi calisiyor ve genel siraya dusulmuyor.

   Kullanici oyunu Toprak Kol elindeyken oynuyor. Toprak Kol'un
   listesi: toprak_topu, yon_simsegi, YILDIRIM_HALKASI,
   ALAN_SIMSEGI, ... COKLU_SIMSEK. Yani icince secim dogru yere
   kaydiriliyordu ama o secim hic okunmuyordu; kolun yetenegi
   calisiyordu ve o yeteneklerin ucu yildirim yagdiriyor.

   Simulasyonda dogrulandi: elde Toprak Kol + iksir + egil/zipla
   -> toprak_topu calisiyor, goz_lazeri degil.

   ---- YENI COZUM ----
   Indeksle oynamak birakildi. Artik acik bir MOD var:

     Lazer modu ACIKKEN egil+zipla HER ZAMAN lazer atar --
     elde ne oldugu fark etmez.

   Mod iksir icilince kendiliginden aciliyor (referansin
   "gozu taktiysan lazer sendedir" mantigi; kullanici:
   "adamlar o sekilde olsun"), kademe bitince kapaniyor,
   ve her kolun menusunden tek dokunusla acilip kapaniyor.

   Neden menu: bu depoda ayni tuzaga ucuncu dususumuz.
   Bot da jest sirasinin sonundaydi ve ulasilamiyordu (v4.23),
   cozum menuye koymak olmustu. Lazer icin de ayni yol.
   ============================================================ */

// Lazer modu acik olan oyuncular
const lazerModu = new Set();

export function lazerModundaMi(oyuncuId) {
  return lazerModu.has(oyuncuId);
}

/* Oyuncunun O ANKI kademesi lazer atabiliyor mu.
   Menu girdisi bunu soruyor: iksir icilmemisken ya da lazersiz
   bir kademe aktifken satiri hic gostermiyoruz.               */
function lazerliKademe(oyuncuId) {
  const k = kademeAl(oyuncuId);
  return (k && k.lazer) ? k : undefined;
}

function lazerModunuAc(oyuncu, sessiz) {
  lazerModu.add(oyuncu.id);
  if (!sessiz) {
    actionbarYaz(oyuncu, "§6⚡ §eGoz Lazeri acik §8· egil+zipla = lazer " +
                 "§7(kola dokun, menuden kapat)");
  }
}

function lazerModunuKapat(oyuncu) {
  lazerModu.delete(oyuncu.id);
}

/* Iksir kancalari. lazerSec iksir icilince, lazerBirak kademe
   bitince ya da elle kapatilinca geliyor (iksirler.js).        */
iksirKancalari({
  lazerSec(oyuncu) {
    try { lazerModunuAc(oyuncu); } catch (e) { hataYaz("lazerSec", e); }
  },
  lazerBirak(oyuncu) {
    try { lazerModunuKapat(oyuncu); } catch (e) { hataYaz("lazerBirak", e); }
  }
});

function esyasizTara() {
  if (++esyasizSayac < ESYASIZ_TARAMA) return;
  esyasizSayac = 0;

  const sira = esyasizSira();
  if (sira.length === 0) return;

  let oyuncular;
  try {
    oyuncular = world.getAllPlayers();
  } catch (e) {
    hataYaz("esyasizTara.getAllPlayers", e);
    return;
  }
  if (!oyuncular || oyuncular.length === 0) return;

  for (const oyuncu of oyuncular) {
    try {
      esyasizOyuncu(oyuncu, sira);
    } catch (e) {
      hataYaz("esyasizTara.oyuncu", e);
    }
  }
}

/* --- Jest 3: egil + tam ASAGI bak -> butun kollari envantere koy ---
   Kollari almak icin "/give pa:kol_top" yazmak zorunda kalmayasin
   diye. Tablette komut yazmak zaten eziyet; ustelik esya kayitli
   degilse komut satiri sadece "soz dizimi hatasi" diyor, sebebini
   soylemiyor. Bu yol dogrudan API kullaniyor ve eksik esyayi ADIYLA
   raporluyor.                                                       */
function kolVerDurusu(oyuncu) {
  if (!egilmeTamam(oyuncu)) return false;
  return oyuncu.getViewDirection().y <= -KOL_VER_ESIGI;
}

function kolVerJesti(oyuncu, id) {
  const durum = kolVerTutma.get(id);

  if (!kolVerDurusu(oyuncu)) {
    if (durum !== undefined) kolVerTutma.delete(id);
    return false;
  }

  if (durum === ESYASIZ_TAMAM) return true;   // durus bozulana kadar tekrarlama

  const tutulan = (durum || 0) + ESYASIZ_TARAMA;
  if (tutulan < KOL_VER_TUTMA) {
    kolVerTutma.set(id, tutulan);
    return true;
  }

  kolVerTutma.set(id, ESYASIZ_TAMAM);
  kollariVer(oyuncu);
  return true;
}

function esyasizOyuncu(oyuncu, sira) {
  const id = oyuncu.id;

  // Asagi bakma jesti once bakilir: yukari bakma jestiyle cakismaz
  // (biri +y, digeri -y) ama ziplamayla ayni anda olabilir.
  if (KOL_VER_ACIK && kolVerJesti(oyuncu, id)) return;

  /* --- Jest 1: egil + zipla -> secili yetenegi calistir ---
     Ziplama anlik bir durum; basili tutuldugu surece tekrar
     tetiklenmesin diye yalnizca gecis aninda calisiyor.        */
  if (ziplamaOkunabilir(oyuncu)) {
    const simdiZipliyor = (oyuncu.isJumping === true) && egilmeTamam(oyuncu);
    const oncekiZipliyor = esyasizZipla.get(id) === true;

    if (simdiZipliyor !== oncekiZipliyor) esyasizZipla.set(id, simdiZipliyor);

    if (simdiZipliyor && !oncekiZipliyor) {
      /* ---- LAZER MODU HER SEYIN ONUNDE (v4.65) ----
         Acikken elde ne oldugu fark etmeksizin lazer atilir.
         Asagidaki kol dalina HIC girilmiyor -- hatanin sebebi
         tam olarak oraya girilmesiydi: iksir icilse bile Toprak
         Kol'un secili yetenegi (cogu zaman bir yildirim
         yetenegi) calisiyordu.                                 */
      if (lazerModu.has(id)) {
        if (!yetenekTetikle(oyuncu, "goz_lazeri")) {
          const kalan = kalanBekleme(id);
          if (kalan > 0) {
            actionbarYaz(oyuncu, "§7Goz Lazeri §8· §c" +
                         (kalan / 20).toFixed(1) + " sn");
          }
        }
        return;
      }

      /* Elde kol varsa KOLUN yetenegi calisir -- "kolu takinca o
         guce sahip olursun" mantigi. Kolda birden fazla yetenek
         varsa (Toprak Kol) o kolun SECILI olani calisir.

         CIFT EL: sag ve sol elde ayri kollar varsa IKISI BIRDEN
         calisiyor (BoraLo videolarindaki gibi: hem ors yagiyor
         hem buz gidiyor). Tek tetikleme sayiliyor, yani sol el
         sag elin beklemesine takilmiyor.                        */
      const sagKol = eldekiKol(oyuncu, "Mainhand");
      const solKol = CIFT_EL_ACIK ? eldekiKol(oyuncu, "Offhand") : undefined;

      const secimler = [];
      if (sagKol) secimler.push(koldakiSecim(id, sagKol));
      if (solKol && (!sagKol || solKol.esya !== sagKol.esya)) {
        secimler.push(koldakiSecim(id, solKol));
      }
      if (secimler.length === 0) {
        const genel = sira[secimAl(id) % sira.length];
        if (genel) secimler.push(genel);
      }

      if (secimler.length > 0) {
        const kimlikler = secimler.map((t) => t.kimlik);
        if (!yetenekTetikle(oyuncu, kimlikler)) {
          const kalan = kalanBekleme(id);
          if (kalan > 0) {
            actionbarYaz(oyuncu, "§7" + secimler.map((t) => t.ad).join(" + ") +
                         " §8· §c" + (kalan / 20).toFixed(1) + " sn");
          }
        } else if (secimler.length > 1) {
          actionbarYaz(oyuncu, "§b⚔ " + secimler.map((t) => t.ad).join(" §7+ §b"));
        }
      }
      return;
    }
  }

  /* --- Jest 2: egil + tam yukari bak -> yetenek degistir --- */
  const durum = esyasizTutma.get(id);

  if (!degistirmeDurusu(oyuncu)) {
    if (durum !== undefined) esyasizTutma.delete(id);
    return;
  }

  if (durum === ESYASIZ_TAMAM) return;   // durus bozulana kadar tekrarlama

  const tutulan = (durum || 0) + ESYASIZ_TARAMA;
  if (tutulan < ESYASIZ_TUTMA) {
    esyasizTutma.set(id, tutulan);
    return;
  }

  esyasizTutma.set(id, ESYASIZ_TAMAM);

  /* Elde COK yetenekli bir kol varsa geçiş o kolun icinde olur;
     genel sirayi karistirmaz. Tek yetenekli kolda degistirecek
     bir sey yok, o yuzden genel siraya dusuluyor.               */
  /* Degistirme SAG eldeki kolu hedefler; sag elde kol yoksa
     sol eldekini. Boylece iki kol takiliyken once sag eli
     ayarlayip sonra sag eli bosaltmadan sola gecmek yerine,
     sag eli bosaltip solu ayarlayabiliyorsun.                 */
  const kol = eldekiKol(oyuncu, "Mainhand")
           || (CIFT_EL_ACIK ? eldekiKol(oyuncu, "Offhand") : undefined);
  if (kol && kol.liste.length > 1) {
    const yeni = (kolSecimAl(id, kol.esya, kol.liste.length) + 1) % kol.liste.length;
    kolSecim.set(id, { esya: kol.esya, i: yeni });
    actionbarYaz(oyuncu, "§6» §e" + kol.liste[yeni].ad +
                 " §8(" + (yeni + 1) + "/" + kol.liste.length + " · egil + zipla)");
    return;
  }

  const yeni = (secimAl(id) + 1) % sira.length;
  esyasizSecim.set(id, yeni);
  actionbarYaz(oyuncu, "§6» §e" + sira[yeni].ad + " §8(egil + zipla)");
}

/* ============================================================
   OYUNCU OLAYLARI
   ============================================================ */

olayaAbone("playerLeave", (olay) => {
  esyasizTutma.delete(olay.playerId);
  esyasizSecim.delete(olay.playerId);
  esyasizZipla.delete(olay.playerId);
  lazerModu.delete(olay.playerId);
  lazerModuUnut(olay.playerId);
  kolVerTutma.delete(olay.playerId);
  kolSecim.delete(olay.playerId);
  kademeUnut(olay.playerId);
  yumrukUnut(olay.playerId);
  botUnut(olay.playerId);
  derinHedefUnut(olay.playerId);
  ilkelHedefUnut(olay.playerId);
  kilicUnut(olay.playerId);
  tasUnut(olay.playerId);
  silahUnut(olay.playerId);

  // Oyuncunun butun isleri durdurulmali, sadece birincisi degil
  const acikIsler = oyuncununIsleri.get(olay.playerId);
  if (acikIsler) {
    for (const is of acikIsler.slice()) {
      const indeks = isler.indexOf(is);
      if (indeks !== -1) isSil(indeks);
    }
  }
  sonKullanim.delete(olay.playerId);
});

/* Paketin gercekten calistigini dunyaya girer girmez gormek icin.
   Bu satiri gormuyorsan paket ya etkin degil ya da script hic
   calismamis demektir.                                            */
olayaAbone("playerSpawn", (olay) => {
  if (!olay.initialSpawn) return;

  /* ---- SON EMNIYET: girdi kilidini AC ----  (v4.33)

     "Dondur" oyuncularda inputpermission ile gercek bir kilit
     kuruyor ve bitir() onu her durumda aciyor. Ama script tam
     kilitliyken CORSE (ya da paket kaldirilirsa) kilit dunyada
     kalir ve oyuncu bir daha kimildayamaz -- geri almanin oyun
     ici yolu da yoktur.

     Fikri aldigimiz referans modlarda tam bu vardi: acan komut
     bir dosyada, kapatan baska dosyada, arada hicbir emniyet
     yok. Bu satir o kapiyi kapatiyor: dunyaya her girisde
     herkes serbest baslar. Kilitli degilsen zaten hicbir sey
     yapmiyor.                                                  */
  if (DONDUR_GIRDI_KILIT) {
    try {
      olay.player.runCommand("inputpermission set @s movement enabled");
      olay.player.runCommand("inputpermission set @s camera enabled");
    } catch (e) {
      // Komut eski surumlerde yok; kilit de kurulamamis demektir
    }
  }

  if (!OLCUM_SOHBETE && !HATA_SOHBETE) return;
  try {
    const eksik = kayitliKollar();
    const kolDurum = (eksik === undefined)
      ? "§7" + KOL_ESYALARI.length + " kol"
      : (eksik.length === 0
          ? "§a" + KOL_ESYALARI.length + " kol hazir"
          : "§c" + eksik.length + "/" + KOL_ESYALARI.length + " kol EKSIK");

    olay.player.sendMessage(
      "§a[SimsekTNT " + SURUM + "] yuklendi §7· " + tumYetenekler().length +
      " yetenek §7· " + kolDurum +
      " §7· butce " + TICK_BLOK_BUTCESI + "/tick" +
      " §7· olcum " + (OLCUM_ACIK ? "§aacik" : "§7kapali")
    );

    if (KOL_VER_ACIK) {
      olay.player.sendMessage("§7Kollari almak icin: §fegil + yere bak, bekle");
    }

    /* Sohbet komutlari calisiyor mu, OYUNDA soyle. Content Log'u
       tablette acmak zahmetli; v4.22'de kullanici "bot" yazip
       dort kez bekledi cunku kapali oldugunu bilmiyordu.        */
    const durum = sohbetDurumMesaji();
    if (durum) olay.player.sendMessage(durum);

    /* Behavior pack RESOURCE pack'i goremez -- Bedrock'ta boyle bir
       API yok. O yuzden tespit edemiyoruz, ama kullanicinin kendi
       bakabilmesi icin nereye bakacagini soyluyoruz. Ikonlarin ve
       3B kol gorunumunun tamami resource pack'te.                */
    olay.player.sendMessage(
      "§7Esyalar gorunmuyorsa: dunya ayarlari > §fKaynak Paketleri§7 " +
      "listesinde §fSimsek Kol§7 etkin mi bak."
    );
    if (eksik && eksik.length > 0) {
      olay.player.sendMessage(
        "§cEksik kol esyasi: §f" + eksik.join(", ") +
        "\n§7Kollar gorunmuyor ama butun yetenekler §fesyasiz§7 calisir: " +
        "§fegil + zipla§7. Yetenek degistirmek icin §fegil + yukari bak§7."
      );
    }
  } catch (e) {
    hataYaz("playerSpawn", e);
  }
});

/* ============================================================
   BOTA DOKUNUNCA MENU

   Botun yonetimi iki yoldan: sohbet ("bot bekle") ve buradan.
   Yeni bir KOL yapilmadi -- "her seyi kol yapma" kurali.

   playerInteractWithEntity her surumde olmayabilir; olayaAbone
   ozellik tespiti yapiyor, yoksa sadece bu yol kapaniyor ve
   sohbet komutlari calismaya devam ediyor.
   ============================================================ */
olayaAbone("playerInteractWithEntity", (olay) => {
  try {
    const oyuncu = olay.player;
    const hedef = olay.target;
    if (!oyuncu || !hedef) return;
    /* v4.35: Ilkel Besli ayri varliklar. Sadece pa:bot'a
       bakilsaydi Okazor'a dokununca menu acilmazdi.           */
    if (!botTuruMu(hedef.typeId)) return;

    /* Baskasinin botuna dokunmak bir sey yapmasin. Sahip
       varligin KENDI ozelliginde; dunya kaydi silinse bile
       bot bunu tasiyor.                                       */
    const sahip = botunSahibi(hedef);
    if (sahip && sahip !== oyuncu.id) {
      actionbarYaz(oyuncu, "§7Bu bot senin degil.");
      return;
    }

    const kayit = botAl(oyuncu.id);
    const durum = kayit ? kayit.durum : "takip";

    const liste = [
      { kimlik: "takip", ad: "Takip et" },
      { kimlik: "bekle", ad: "Bekle" }
    ];
    const secili = (durum === "bekle") ? 1 : 0;

    const acildi = menuAc(oyuncu, "§eBot", liste, secili,
      (indeks) => {
        const yeni = botDurum(oyuncu, liste[indeks].kimlik);
        actionbarYaz(oyuncu, yeni === "bekle"
          ? "§eBot bekliyor" : "§aBot pesinden geliyor");
      },
      [
        {
          ad: "Yanima gel",
          calis() { yetenekTetikle(oyuncu, "bot_cagir"); }
        },
        {
          ad: "Geri gonder",
          calis() { yetenekTetikle(oyuncu, "bot_geri"); }
        }
      ]);

    /* Menu yoksa (server-ui eksik) dokunmak durumu DEGISTIRSIN:
       hicbir sey olmamasindan iyi. Takip <-> bekle arasi gecis. */
    if (!acildi) {
      const yeni = botDurum(oyuncu, durum === "bekle" ? "takip" : "bekle");
      actionbarYaz(oyuncu, yeni === "bekle"
        ? "§eBot bekliyor §8(menu yok, dokununca degisir)"
        : "§aBot pesinden geliyor §8(menu yok, dokununca degisir)");
    }
  } catch (e) {
    hataYaz("playerInteractWithEntity", e);
  }
});

kolDenetimi();
siraDenetimi();
botDenetimi();

/* ---------------- Sohbet komutlari ----------------
   Komutlarin calistiracagi isler burada baglaniyor. sohbet.js
   main.js'i import etmiyor (dairesel olurdu); islevler kanca
   olarak veriliyor.

   yetenekTetikle bekleme suresine ve is tavanina takilabilir;
   takilirsa sebebini metin olarak donduruyoruz ki komut
   "hicbir sey olmadi" diye sessiz kalmasin.                    */
/* ============================================================
   DURUM RAPORU

   NEDEN VAR: butun teshis satirlari (kol denetimi, bot denetimi,
   sohbet durumu, API yuzeyi) Content Log'a yaziliyordu. Kullanici
   Content Log'un ne oldugunu bilmiyordu, yani bu bilgiler
   pratikte HIC gorunmuyordu -- "bot gelmedi" derken sebebi orada
   yaziyordu ama okunamiyordu.

   Artik hepsi sohbete basiliyor: "durum" yaz, yeter.
   ============================================================ */
function durumRaporu(oyuncu) {
  const satir = ["§6--- Simsek durum ---"];

  satir.push("§7Surum §f" + SURUM +
             " §8· API §f" + (BETA_GEREKLI ? "2.0.0-beta" : "2.0.0") +
             " §8· yetenek §f" + tumYetenekler().length);

  satir.push("§7Sohbet komutlari: " +
             (sohbetCalisiyorMu() ? "§aACIK" : "§cKAPALI §7(Beta API'ler?)"));

  satir.push("§7Menu: " + (menuKullanilabilir() ? "§aACIK" : "§cKAPALI §7(server-ui yok)"));

  /* Kollar: kayit defterinde gercekten var mi. "Soz dizimi
     hatasi" alan biri sebebini burada gorur.                  */
  const eksik = kayitliKollar();
  if (eksik === undefined) {
    satir.push("§7Kollar: §e" + KOL_ESYALARI.length + " tanimli §8(denetim yok)");
  } else if (eksik.length === 0) {
    satir.push("§7Kollar: §a" + KOL_ESYALARI.length + "/" + KOL_ESYALARI.length +
               " kayitli");
  } else {
    satir.push("§7Kollar: §c" + eksik.length + "/" + KOL_ESYALARI.length +
               " EKSIK §8" + eksik.slice(0, 3).join(", "));
  }

  // Bot varligi oyuna kayitli mi + su an botun var mi
  const botKayit = botAl(oyuncu.id);
  const botKayitli = botKayitliMi();
  satir.push("§7Bot: " + (botKayitli === undefined
               ? "§edenetim yok"
               : (botKayitli ? "§avarlik kayitli" : "§cvarlik KAYITLI DEGIL")) +
             " §8· " + (botKayit
               ? "§a" + botSayisi(oyuncu.id) + "/" + BOT_TAVAN +
                 " bot §7(" + botKayit.durum + ")"
               : "§7botun yok"));

  // Acik iksir ve kalan sure
  const kademe = kademeAl(oyuncu.id);
  satir.push("§7Iksir: " + (kademe
    ? "§f" + kademe.ad + " §8· lazer icin egil + zipla"
    : "§7yok §8(ic, sonra 'lazer' yaz)"));

  const eksikTur = eksikBotTurleri();
  if (eksikTur && eksikTur.length > 0) {
    satir.push("§cKAYITSIZ varlik: §f" + eksikTur.join(", ") +
               " §8(o uyeler cagrilamaz)");
  }

  const ilkeller = ilkelListesi(oyuncu.id);
  if (ilkeller.length > 0) {
    satir.push("§7İlkel Beşli: §6" + ilkeller.length + "/" + ILKEL_BESLI.size +
               " §8" + ilkeller.map((a) => ILKEL_BESLI.get(a).ad.split(" ").pop())
                                .join(", "));
  }

  if (botKayit) {
    satir.push("§7Bot cantasi: §f" + cantaDolulugu(oyuncu.id) +
               " §7parca §8· savas " +
               (savasAcikMi(oyuncu.id) ? "§cACIK" : "§7kapali"));
  }

  const kalp = kalpAl(oyuncu.id);
  satir.push("§7Kalp: §f+" + kalp + " ek §8(toplam " + (10 + kalp) +
             ", tavan " + KALP_TAVAN + ")");

  satir.push("§8Hatalar sohbete duser; ayrica '" +
             (SOHBET_ONEK || "") + "yardim' komut listesi.");

  return satir.join("\n");
}

sohbetKancalari({
  durum: (oyuncu) => durumRaporu(oyuncu),
  kalpEkle: (oyuncu, adet) => kalpEkle(oyuncu, adet),
  kalpSifirla: (oyuncu) => kalpSifirla(oyuncu),
  kollariVer: (oyuncu) => kollariVer(oyuncu),
  botDurum: (oyuncu, durum) => botDurum(oyuncu, durum),
  botGeri: (oyuncu) => botGeri(oyuncu),
  botYanaCagir: (oyuncu) => botYanaCagir(oyuncu),
  botSavas: (oyuncu, acik) => botSavas(oyuncu, acik),
  botSayisi: (oyuncu) => botSayisi(oyuncu.id),

  /* "bot elmas 64" -> derin tarama. Ad cozulemezse hedef
     listesi yaziliyor; sessiz kalmak yerine ne yazilabilecegini
     soylemek.                                                  */
  /* "bot kajaros" / "bot ilkel" -> Ilkel Besli. */
  ilkel: (oyuncu, kelime) => {
    const anahtar = kelime ? ilkelAdCoz(kelime) : undefined;
    if (kelime && !anahtar) {
      return "§cBilmedigim uye: §7" + kelime + "\n§8" +
             [...ILKEL_BESLI.keys()].join(" · ");
    }
    return ilkelBaslat(oyuncu, anahtar);
  },

  derin: (oyuncu, anahtar, adet) => {
    const hedef = hedefCoz(anahtar);
    if (!hedef) {
      return "§cBilmedigim hedef: §7" + anahtar + "\n§8" +
             [...DERIN_HEDEFLER.keys()].join(" · ");
    }
    return derinBaslat(oyuncu, anahtar, adetKirp(adet));
  },
  yetenek: (oyuncu, kimlik) => {
    const tanim = yetenekAl(kimlik);
    if (!tanim) return "§cBilinmeyen yetenek: " + kimlik;
    if (yetenekTetikle(oyuncu, kimlik)) return undefined;   // calisti, sessiz kal

    const kalan = kalanBekleme(oyuncu.id);
    if (kalan > 0) {
      return "§7" + tanim.ad + " §8· §c" + (kalan / 20).toFixed(1) + " sn bekle";
    }
    return "§7" + tanim.ad + " §8· §caktif isin dolu (" + AYNI_ANDA + ")";
  }
});
sohbetKur();

/* Hangi API yuzeyindeyiz, Content Log'da belli olsun.

   v4.31'e kadar burada "2.0.0-BETA isteniyor" YAZIYORDU ama
   BETA_GEREKLI v4.25'te false'a alinmisti -- yani satir yanlis
   bilgi veriyordu. Artik ayardan okunuyor: ikisi bir daha
   ayrisamaz.                                                    */
bilgiYaz(BETA_GEREKLI
  ? "API: @minecraft/server 2.0.0-BETA isteniyor -- dunya ayarlarinda " +
    "'Beta API'ler' ACIK olmali, yoksa paket HIC yuklenmez."
  : "API: @minecraft/server 2.0.0 (kararli). Beta API ayari gerekmiyor; " +
    "sohbet komutlari (chatSend) sadece Beta acikken calisir, menu ve " +
    "/scriptevent her durumda calisir.");

bilgiYaz(
  SURUM + " yuklendi | yetenek: " + tumYetenekler().length +
  " (esyasiz sirada " + esyasizSira().length + ")" +
  " | kol esyasi: " + KOL_ESYALARI.length +
  " | blok butcesi: " + TICK_BLOK_BUTCESI + "/tick" +
  " | olcum: " + (OLCUM_ACIK ? "acik" : "kapali")
);
