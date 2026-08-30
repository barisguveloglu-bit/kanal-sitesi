import * as api from "@minecraft/server";
import { world, system } from "@minecraft/server";
import { bilgiYaz, hataYaz, gecerliMi } from "../yardimcilar.js";

import {
  BOT_ACIK, BOT_KIMLIK, BOT_TAVAN, BOT_KURTARMA_MENZIL,
  BOT_TARAMA, BOT_CAGIR_YAKIN, BOT_DOGUM_YAKIN, BOT_KAYIT_ANAHTAR,
  BOT_SAHIP_OZELLIK, BOT_DURUM_OZELLIK, BOT_OLAY_TAKIP, BOT_OLAY_BEKLE,
  BOT_SCRIPT_MENZIL, BOT_CANTA_TAVAN,
  BOT_SAVAS_VARSAYILAN, BOT_OLAY_SAVAS_AC, BOT_OLAY_SAVAS_KAPAT,
  BOT_YERDEN_TOPLA, BOT_KIMLIKLER, BOT_OLAY_EVCIL, BOT_EVCIL_DENEME
} from "../ayarlar.js";

/* ============================================================
   BOT DEFTERI  --  Asama 1

   Depodaki ILK ozel VARLIK. Su ana kadar sadece esya vardi.

   ---- MIMARIYI BELIRLEYEN KISIT ----
   @minecraft/server'da YOL BULMA API'SI YOK. Script'ten bir
   varliga "su koordinata yuru" denemiyor. O yuzden is bolundu:

     YURUMEYI  vanilla AI yapar (minecraft:behavior.follow_owner,
               kurdun/kedinin kullandigi hedef). Gercek yol
               bulma, bedava, akici.
     KURTARMAYI script yapar. Bot cok geride kaldiysa, sikistiysa
               ya da baska boyuttaysa yanina isinlaniyor --
               vanilla takip bunlarin hicbirini cozmuyor.

   ---- BELIRSIZ NOKTA (bilerek iki yollu) ----
   follow_owner bir SAHIP ister ve sahip tameable.tame(oyuncu)
   ile atanir. Bu cagrinin bu API surumundeki tam sekli kesin
   DEGIL. O yuzden:

     tame() tuttuysa  -> vanilla yuruyor, script sadece 24 blokta
                         kurtariyor
     tutmadiysa       -> script takibi: 8 blokta isinlaniyor

   Hangisinin calistigi Content Log'a yaziliyor; tablet denemesi
   soyleyecek. Tahmin edilmiyor.

   ---- NEDEN AYRI DEFTER (is listesine girmiyor) ----
   Kalp ve kafeslerdeki ders. Bot kalici; is listesinde dursaydi
   oyuncunun iki is yuvasindan birini sonsuza kadar tutardi ve
   bot varken tek elle oynamak zorunda kalirdin.
   ============================================================ */

/* oyuncuId -> [ { botId, boyutId, durum, evcil }, ... ]

   v4.27'de tek bottan DIZIYE gecildi (BOT_TAVAN 1 -> 20).
   Tek nesne birakilsaydi her yerde "hangi bot" sorusu cikardi;
   dizi ile butun islemler "sahibin butun botlari" uzerinde
   calisiyor: cagir bir tane EKLER, bekle/takip/geri HEPSINE
   uygulanir. Kullanicinin zihnindeki model de bu -- botlar bir
   ekip, tek tek yonetilen nesneler degil.                      */
const defter = new Map();

function listeAl(oyuncuId) {
  const l = defter.get(oyuncuId);
  return l || [];
}

/* oyuncuId -> bir sonraki tarama tick'i */
const sonraki = new Map();

/* ---------------- Ekip cantasi ----------------
   oyuncuId -> Map(esyaKimligi -> adet)

   Botlarin topladigi seyler once buraya giriyor, sonra topluca
   teslim ediliyor. Bot BASINA degil EKIP basina: yirmi ayri
   canta ne kayitta ne oynanista bir sey kazandirir, sen zaten
   tek bir yigin aliyorsun.                                     */
const cantalar = new Map();

/* oyuncuId -> savas acik mi */
const savasDurumu = new Map();

function cantaAl(oyuncuId) {
  let c = cantalar.get(oyuncuId);
  if (!c) { c = new Map(); cantalar.set(oyuncuId, c); }
  return c;
}

export function cantaDolulugu(oyuncuId) {
  let n = 0;
  const c = cantalar.get(oyuncuId);
  if (c) for (const adet of c.values()) n += adet;
  return n;
}

/* Cantaya koy. Donen deger: gercekten kondu mu (tavan asilmadi).

   DIKKAT -- BURADA yaz() YOK, bilerek.
   v4.30'a kadar her blokta yaz() cagriliyordu: blok basina bir
   JSON.stringify + setDynamicProperty. Bot saniyede onlarca blok
   kirdigi icin bu, isin en pahali kismi olmustu. Artik kayit
   TOPLU: is bitince cantaKaydet() cagriliyor.                  */
export function cantayaKoy(oyuncuId, esyaKimligi, adet = 1) {
  if (cantaDolulugu(oyuncuId) >= BOT_CANTA_TAVAN) return false;
  const c = cantaAl(oyuncuId);
  c.set(esyaKimligi, (c.get(esyaKimligi) || 0) + adet);
  return true;
}

/* Cantayi diske yaz. Is bitince ve teslimde cagriliyor. */
export function cantaKaydet() {
  yaz();
}

export function cantaListesi(oyuncuId) {
  const c = cantalar.get(oyuncuId);
  return c ? [...c.entries()] : [];
}

export function cantaBosalt(oyuncuId) {
  cantalar.delete(oyuncuId);
  yaz();
}

/* ---------------- Yerden toplama ----------------  (v4.33)

   Bot varlik JSON'unda minecraft:behavior.pickup_items tasiyor:
   yerde duran esyayi kendisi gidip aliyor ve KENDI kutusuna
   koyuyor. Buradaki is o kutuyu bosaltip ekip cantasina
   aktarmak.

   NEDEN AKTARILIYOR: yoksa iki ayri depo olurdu -- botun kutusu
   ve ekip cantasi. "bot teslim" dedigin zaman botun kutusundaki
   sey gelmezdi, sen de aldigini sanip birakip giderdin. Tek
   kapi: her sey cantaya girer, teslim cantayi bosaltir.

   FIKIR NEREDEN GELDI: uc referans modun ortak yani, butun
   karakterlerin koylu klonu olmasiydi. Koyluler yerdeki esyayi
   toplar; o modlarda bu bir YAN ETKIYDI (koyluyu kopyalayinca
   geldi, kimse istememisti). Burada bilincli: sen blok kirarken
   yere dusen seyi bot topluyor.                                */

let kutuUyarisi = false;

/* Bir botun kutusunu cantaya bosaltir. Donen deger: kac parca.  */
function kutuyuBosalt(varlik, oyuncuId) {
  let alinan = 0;
  let kap;
  try {
    const env = varlik.getComponent("minecraft:inventory");
    kap = env ? env.container : undefined;
  } catch (e) {
    kap = undefined;
  }
  if (!kap || typeof kap.getItem !== "function") {
    if (!kutuUyarisi) {
      kutuUyarisi = true;
      bilgiYaz("bot: envanter bileseni okunamadi; yerden topladigi " +
               "esya cantaya aktarilamiyor (kendi kutusunda kalir).");
    }
    return 0;
  }

  const boyut = (typeof kap.size === "number") ? kap.size : 0;
  for (let i = 0; i < boyut; i++) {
    let esya;
    try {
      esya = kap.getItem(i);
    } catch (e) {
      continue;
    }
    if (!esya) continue;

    const adet = esya.amount || 1;
    /* Canta doluysa esyayi botun kutusunda BIRAK. Silmek
       oyuncunun malini yok etmek olurdu.                       */
    if (!cantayaKoy(oyuncuId, esya.typeId, adet)) break;

    try {
      kap.setItem(i, undefined);
    } catch (e) {
      /* Silinemedi: cantaya da girdi, kutuda da duruyor -- yani
         esya KOPYALANMIS olurdu. Geri al.

         Geri alma cantayaKoy ile yapilamaz: o tavan dolduysa
         hicbir sey yapmadan doner ve kopya kalirdi.            */
      const c = cantaAl(oyuncuId);
      const kalan = (c.get(esya.typeId) || 0) - adet;
      if (kalan > 0) c.set(esya.typeId, kalan);
      else c.delete(esya.typeId);
      continue;
    }
    alinan += adet;
  }
  return alinan;
}

/* ---------------- Ilkel Besli kancasi ----------------
   bot_ilkel.js buraya bir bakim fonksiyonu birakiyor; tarama
   dongusu her botta onu cagiriyor.

   NEDEN KANCA: bu dosya bot_ilkel.js'i import EDEMEZ -- o dosya
   zaten burayi import ediyor, dairesel olurdu. Sohbet ve iksir
   kancalarindaki kalibin aynisi.                              */
let ilkelBakim;

export function ilkelKancasi(fn) {
  ilkelBakim = (typeof fn === "function") ? fn : undefined;
}

/* ---------------- Savas anahtari ---------------- */

export function savasAcikMi(oyuncuId) {
  const d = savasDurumu.get(oyuncuId);
  return (d === undefined) ? BOT_SAVAS_VARSAYILAN : d;
}

/* Butun botlara uygulanir. Donen deger: yeni durum.            */
export function botSavas(oyuncu, acik) {
  oku();
  const yeni = (acik === undefined) ? !savasAcikMi(oyuncu.id) : !!acik;
  savasDurumu.set(oyuncu.id, yeni);

  for (const { varlik } of botVarliklari(oyuncu.id)) {
    try {
      if (typeof varlik.triggerEvent === "function") {
        varlik.triggerEvent(yeni ? BOT_OLAY_SAVAS_AC : BOT_OLAY_SAVAS_KAPAT);
      }
    } catch (e) {
      hataYaz("bot.savas", e);
    }
  }
  yaz();
  return yeni;
}

let tameUyarisi = false;

/* ---------------- Kalicilik ---------------- */

let kaliciDestek;

function kaliciMi() {
  if (kaliciDestek === undefined) {
    kaliciDestek = (typeof world.setDynamicProperty === "function") &&
                   (typeof world.getDynamicProperty === "function");
    if (!kaliciDestek) {
      bilgiYaz("UYARI: dunya ozellikleri yok. Botlar kaydedilemiyor; " +
               "dunyadan cikip girersen bot sahipsiz kalir.");
    }
  }
  return kaliciDestek;
}

/* Kayit bicimi kisa tutuluyor (dunya ozelliginin boyut siniri var):
     { b: [[oyuncuId, botId, boyutId, durum], ...],
       c: { oyuncuId: "oak_log:12,raw_iron:3" },
       s: { oyuncuId: 0|1 } }

   Canta kimliklerinden "minecraft:" oneki atiliyor: yirmi botun
   topladigi seyle kayit gereksiz yere sismesin.                */
const ONEK = "minecraft:";

function yaz() {
  if (!kaliciMi()) return;
  try {
    const b = [];
    for (const [oyuncuId, liste] of defter) {
      for (const k of liste) b.push([oyuncuId, k.botId, k.boyutId, k.durum]);
    }

    const c = {};
    for (const [oyuncuId, canta] of cantalar) {
      if (canta.size === 0) continue;
      const parcalar = [];
      for (const [esya, adet] of canta) {
        parcalar.push((esya.startsWith(ONEK) ? esya.slice(ONEK.length) : esya) +
                      ":" + adet);
      }
      c[oyuncuId] = parcalar.join(",");
    }

    const sv = {};
    for (const [oyuncuId, acik] of savasDurumu) sv[oyuncuId] = acik ? 1 : 0;

    const bos = (b.length === 0 && Object.keys(c).length === 0 &&
                 Object.keys(sv).length === 0);
    world.setDynamicProperty(BOT_KAYIT_ANAHTAR,
                             bos ? undefined : JSON.stringify({ b, c, s: sv }));
  } catch (e) {
    hataYaz("bot.yaz", e);
  }
}

let okundu = false;

function oku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;
  try {
    const ham = world.getDynamicProperty(BOT_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    const kayit = JSON.parse(ham);

    /* v4.27 ve oncesi DUZ DIZI yaziyordu. Eski kaydi olan bir
       dunya acilinca botlar kaybolmasin diye ikisi de okunuyor. */
    const dizi = Array.isArray(kayit) ? kayit : (kayit.b || []);

    if (kayit && !Array.isArray(kayit)) {
      for (const [oyuncuId, metin] of Object.entries(kayit.c || {})) {
        const canta = cantaAl(oyuncuId);
        for (const parca of String(metin).split(",")) {
          const i = parca.lastIndexOf(":");
          if (i <= 0) continue;
          const ad = parca.slice(0, i);
          const adet = Number(parca.slice(i + 1));
          if (!isFinite(adet) || adet <= 0) continue;
          canta.set(ad.includes(":") ? ad : ONEK + ad, adet);
        }
      }
      for (const [oyuncuId, acik] of Object.entries(kayit.s || {})) {
        savasDurumu.set(oyuncuId, acik === 1 || acik === true);
      }
    }

    let sayi = 0;
    for (const satir of dizi) {
      if (!Array.isArray(satir) || satir.length < 2) continue;
      const oyuncuId = String(satir[0]);
      const liste = defter.get(oyuncuId) || [];
      liste.push({
        botId: String(satir[1]),
        boyutId: satir[2],
        durum: satir[3] === "bekle" ? "bekle" : "takip",
        /* evcil bilgisi KAYDEDILMIYOR: tame() dunya yeniden
           yuklenince de gecerli mi bilmiyoruz. Ilk taramada
           yeniden deneniyor.                                   */
        evcil: undefined
      });
      defter.set(oyuncuId, liste);
      sayi++;
    }
    bilgiYaz("bot defteri okundu: " + sayi + " bot, " + defter.size + " sahip.");
  } catch (e) {
    hataYaz("bot.oku", e);
  }
}

/* ---------------- Varligi bulma ----------------
   world.getEntity(id) her surumde yok; yoksa boyut taramasina
   dusuluyor (pahali, o yuzden sadece yedek).                   */

let getEntityDestek;

function varligiBul(kayit) {
  if (getEntityDestek === undefined) {
    getEntityDestek = (typeof world.getEntity === "function");
    if (!getEntityDestek) {
      bilgiYaz("world.getEntity yok; bot aramasi boyut taramasiyla " +
               "yapilacak (biraz daha pahali).");
    }
  }

  if (getEntityDestek) {
    try {
      const v = world.getEntity(kayit.botId);
      if (v && gecerliMi(v)) return v;
    } catch (e) {
      hataYaz("bot.getEntity", e);
    }
    return undefined;
  }

  try {
    const boyut = world.getDimension(kayit.boyutId || "minecraft:overworld");
    /* Butun bot turleri taraniyor: Ilkel Besli ayri varliklar
       (v4.35). Sadece pa:bot'a bakilsaydi Okazor'un kaydi
       "chunk yuklu degil" sanilir, kurtarma hic calismazdi.   */
    for (const tip of BOT_KIMLIKLER) {
      for (const v of boyut.getEntities({ type: tip })) {
        if (v.id === kayit.botId) return v;
      }
    }
  } catch (e) {
    hataYaz("bot.varligiBul", e);
  }
  return undefined;
}

/* ---------------- Sorgu ---------------- */

/* Sahibin BUTUN botlari. Bos dizi doner, undefined degil --
   cagiran her yerde null kontrolu yapmasin.                    */
export function botlarAl(oyuncuId) {
  oku();
  return listeAl(oyuncuId);
}

/* Ilk bot. Durum raporu ve menu basligi gibi "tek bir ornek
   yeter" yerlerde kullaniliyor.                                */
export function botAl(oyuncuId) {
  oku();
  return listeAl(oyuncuId)[0];
}

export function botVarMi() {
  oku();
  return BOT_ACIK && defter.size > 0;
}

/* Sahibin kac botu var. Argumansiz cagrilirsa dunyadaki toplam. */
export function botSayisi(oyuncuId) {
  oku();
  if (oyuncuId !== undefined) return listeAl(oyuncuId).length;
  let n = 0;
  for (const liste of defter.values()) n += liste.length;
  return n;
}

/* Kayitli varligi dunyada bulunanlarla eslestir. Donen dizi:
   [{kayit, varlik}, ...]. Chunk yuklu degilse o bot atlanir ama
   DEFTERDEN SILINMEZ -- geri gelince yine bizim.                */
export function botVarliklari(oyuncuId) {
  const cift = [];
  for (const kayit of listeAl(oyuncuId)) {
    const v = varligiBul(kayit);
    if (v) cift.push({ kayit, varlik: v });
  }
  return cift;
}

/* Bir varligin sahibi kim? Varligin KENDI ozelliginden okunuyor.
   Dunya kaydi silinse bile bot bunu tasiyor, yani dokununca
   kendini yeniden baglayabiliyor.                              */
export function botunSahibi(varlik) {
  try {
    if (typeof varlik.getDynamicProperty !== "function") return undefined;
    const s = varlik.getDynamicProperty(BOT_SAHIP_OZELLIK);
    return (typeof s === "string" && s.length > 0) ? s : undefined;
  } catch (e) {
    return undefined;
  }
}

function ozellikYaz(varlik, ad, deger) {
  try {
    if (typeof varlik.setDynamicProperty === "function") {
      varlik.setDynamicProperty(ad, deger);
    }
  } catch (e) {
    /* Varlik ozellikleri bazi surumlerde yok. Dunya kaydi zaten
       var, bu sadece yedek -- sessizce gecilebilir.            */
  }
}

/* ---------------- Evcillestirme ----------------
   follow_owner'in calismasi icin botun bir SAHIBI olmali.

   ---- v4.67: BURADA IKI HATA VARDI ----
   Kullanici: "ilkel besli hareket etmiyor, beni takip etmiyorlar
   sadece yanima isinlaniyorlar."

   1. tame() BIR BOOLEAN DONDURUYOR ve biz onu hic okumuyorduk:

        t.tame(oyuncu);
        return true;        // <- basarisiz olsa da "oldu" diyorduk

      @minecraft/server 2.0.0'in resmi tanimi (index.d.ts):
        tame(player: Player): boolean
        "Returns true if the entity was tamed."
      Tahmin degil, paket cekilip okundu.

      Sonucu okumayinca kayit.evcil hep true oluyordu ve
      kurtarma esigi "vanilla takip calisiyor" varsayimiyla
      24 bloga (BOT_KURTARMA_MENZIL) ayarlaniyordu. Yani bot
      yerinde duruyor, 24 blok uzaklasinca isinlaniyordu --
      sikayetin birebir tarifi.

   2. minecraft:is_tamed HIC EKLENMIYORDU. Varlik JSON'unda
      "pa:evcillestir" olayi var ve pa:evcil grubunu (yani
      is_tamed'i) ekliyor, ama script bu olayi hicbir yerde
      tetiklemiyordu. durumUygula sadece takip/bekle
      tetikliyor.

   Ikisi de tek basina follow_owner'i olduruyor.

   ---- SIMDI ----
   Uc adim, ucu de sonucu DOGRULANIYOR:
     olay      pa:evcillestir  -> is_tamed bileseni
     tame()    sahibi atar     -> donen deger okunuyor
     dogrula   isTamed / tamedToPlayerId ile teyit

   Yeni dogan varligin bilesenleri ayni tick'te hazir
   olmayabiliyor; bu yuzden basarisizlik KALICI sayilmiyor,
   sonraki taramalarda tekrar deneniyor (bkz. botTara).     */
function evcillestir(varlik, oyuncu) {
  /* is_tamed bileseni: olayla eklenir. tame()'den bagimsiz,
     o yuzden once ve ayri.                                  */
  try {
    if (typeof varlik.triggerEvent === "function") {
      varlik.triggerEvent(BOT_OLAY_EVCIL);
    }
  } catch (e) {
    // Olay yoksa paket olmesin; tame() tek basina da yeter
  }

  try {
    const t = varlik.getComponent("minecraft:tameable");
    if (!t) return false;

    if (typeof t.tame === "function") {
      const sonuc = t.tame(oyuncu);
      /* Eski surumler undefined donebilir: o zaman "hayir"
         demek yerine asagidaki dogrulamaya birakiyoruz.     */
      if (sonuc === false) return false;
    }

    /* DOGRULAMA -- asil cevap bu. tame() true dese bile
       gercekten sahiplenildi mi diye varliga soruyoruz.     */
    if (typeof t.isTamed === "boolean") return t.isTamed;
    if (t.tamedToPlayerId !== undefined) return t.tamedToPlayerId === oyuncu.id;

    /* Ne isTamed ne tamedToPlayerId var: eski API. tame()
       patlamadiysa olmus sayiyoruz.                          */
    return typeof t.tame === "function";
  } catch (e) {
    hataYaz("bot.evcillestir", e);
    return false;
  }
}

/* Evcillestirme kac kez denendi (botId -> deneme sayisi).
   Sinirsiz denemek her taramada bir API cagrisi demek;
   bir yerden sonra vazgecip script takibine geciyoruz.      */
const evcilDeneme = new Map();

function evcilDene(varlik, oyuncu, botId) {
  if (evcillestir(varlik, oyuncu)) {
    evcilDeneme.delete(botId);
    return true;
  }

  const n = (evcilDeneme.get(botId) || 0) + 1;
  evcilDeneme.set(botId, n);
  if (n < BOT_EVCIL_DENEME) return undefined;   // sonraki taramada yine dene

  if (!tameUyarisi) {
    tameUyarisi = true;
    bilgiYaz("BOT: sahiplendirme " + BOT_EVCIL_DENEME + " denemede " +
             "tutmadi. Vanilla takip (follow_owner) calismayacak; " +
             "bot SCRIPT TAKIBIYLE yurutulecek -- " + BOT_SCRIPT_MENZIL +
             " bloktan uzaklasinca yanina isinlanir.");
  }
  return false;
}

/* ---------------- Dogurma ---------------- */

/* kimlik: hangi bot turu dogsun. Bos birakilirsa normal bot.
   Ilkel Besli kendi varliklarini boyle doguruyor (v4.35).     */
export function botCagir(oyuncu, kimlik = BOT_KIMLIK) {
  oku();
  if (!BOT_ACIK) return { hata: "Bot kapali (ayarlar.js: BOT_ACIK)." };

  const liste = listeAl(oyuncu.id);

  /* Olmus/kaybolmus kayitlari temizle. Chunk yuklu degilse
     varlik BULUNAMAZ ama olmus da olmayabilir -- o yuzden
     sadece defterde olup dunyada da gorunmeyenler degil,
     GORUNENLER sayiliyor. Yani sayim eksik olabilir; bu
     kasitli: olmeyen bir botu silmektense fazladan bir tane
     dogurmak daha az zarar verir.                             */
  const canli = botVarliklari(oyuncu.id);

  // Tavandaysa yenisini dogurma, olanlari yanina getir
  if (liste.length >= BOT_TAVAN) {
    for (const { kayit, varlik } of canli) {
      yanaGetir(varlik, oyuncu, 0);
      kayit.durum = "takip";
      durumUygula(varlik, kayit);
    }
    yaz();
    return { tavan: true, tasinan: canli.length, toplam: liste.length };
  }

  /* DIKKAT -- burada varlikIste() YOK, bilerek.

     v4.22'de varlikIste(1) vardi ve bot HIC dogmuyordu. Sebep
     main.js'teki tick dongusu:

         if (isler.length === 0) return;
         butceSifirla();

     Butce ancak AKTIF IS varken doluyor. Bot cagirmak anlik bir
     istek; o anda calisan bir is yoksa butce 0'da kaliyor ve
     spawn sonsuza kadar reddediliyordu.

     v4.85 NOTU: o sira hatasi ARTIK DUZELDI -- butceSifirla()
     tick'in basina alindi (Okazor'un disleri ayni duvara
     carpinca kok duzeltildi). Yani buraya varlikIste()
     eklemek artik teknik olarak mumkun. Yine de EKLENMEDI:
     asagidaki sebep hala gecerli, bot bir kez doguyor ve
     zaten iki kapiya takili.

     Butce tick basina ONLARCA sey doguran yetenekler icin var
     (ok yagmuru, TNT yagmuru). Bot bir kez doguyor ve zaten iki
     kapiya takili: BEKLEME (3 sn) ve BOT_TAVAN.               */

  let varlik;
  const nokta = yanNokta(oyuncu, BOT_DOGUM_YAKIN, liste.length);
  try {
    varlik = oyuncu.dimension.spawnEntity(kimlik, nokta);
  } catch (e) {
    hataYaz("bot.spawnEntity", e);
    return {
      hata: "Bot varligi oyuna kayitli degil (" + kimlik + "). " +
            "Behavior pack etkin mi?"
    };
  }
  if (!varlik) return { hata: "Bot dogurulamadi." };

  /* v4.67: yeni dogan varligin bilesenleri ayni tick'te
     hazir olmayabiliyor. undefined = 'daha belli degil',
     botTara sonraki taramalarda tekrar deniyor.        */
  const evcil = evcilDene(varlik, oyuncu, varlik.id);
  ozellikYaz(varlik, BOT_SAHIP_OZELLIK, oyuncu.id);
  ozellikYaz(varlik, BOT_DURUM_OZELLIK, "takip");

  const yeni = {
    botId: varlik.id,
    boyutId: oyuncu.dimension.id,
    durum: "takip",
    evcil
  };
  liste.push(yeni);
  defter.set(oyuncu.id, liste);
  durumUygula(varlik, yeni);

  /* Savas durumu EKIP capinda: sonradan dogan bot da ayni
     ayarla gelsin, yoksa "kapattim ama yeni bot saldiriyor"
     olurdu.                                                   */
  try {
    if (typeof varlik.triggerEvent === "function" && !savasAcikMi(oyuncu.id)) {
      varlik.triggerEvent(BOT_OLAY_SAVAS_KAPAT);
    }
  } catch (e) {
    hataYaz("bot.savasBaslangic", e);
  }
  yaz();

  /* varlik da doniyor: Ilkel Besli dogan botu hemen bir uyeye
     ceviriyor (bot_ilkel.js). Kimligi tekrar aramak yerine
     buradan almasi hem ucuz hem kesin.                        */
  return { dogdu: true, evcil, toplam: liste.length, tavan: BOT_TAVAN, varlik };
}

/* Butun botlari yanina getirir (yenisini DOGURMAZ). */
export function botYanaCagir(oyuncu) {
  oku();
  const canli = botVarliklari(oyuncu.id);
  for (const { kayit, varlik } of canli) {
    yanaGetir(varlik, oyuncu, 0);
    kayit.durum = "takip";
    durumUygula(varlik, kayit);
  }
  if (canli.length > 0) yaz();
  return canli.length;
}

/* Butun botlari geri gonderir. Donen deger: kac tane silindi. */
export function botGeri(oyuncu) {
  oku();
  const liste = listeAl(oyuncu.id);
  if (liste.length === 0) return 0;

  let silinen = 0;
  for (const kayit of liste) {
    const v = varligiBul(kayit);
    if (v) {
      try {
        v.remove();
        silinen++;
      } catch (e) {
        hataYaz("bot.remove", e);
      }
    }
  }

  /* Varlik bulunamasa bile kayit DUSUYOR: "geri gonder" dedin,
     defterde bot kalmamali. Chunk yuklenince sahipsiz bir bot
     kalabilir; ona dokununca kendini yeniden baglar.          */
  const vardi = liste.length;
  defter.delete(oyuncu.id);
  sonraki.delete(oyuncu.id);
  yaz();
  return vardi;
}

/* ---------------- Durum: takip / bekle ----------------
   HEPSINE birden uygulaniyor. Botlar bir ekip.               */

export function botDurum(oyuncu, durum) {
  oku();
  const liste = listeAl(oyuncu.id);
  if (liste.length === 0) return undefined;

  const yeni = (durum === "bekle") ? "bekle" : "takip";
  for (const kayit of liste) {
    kayit.durum = yeni;
    const v = varligiBul(kayit);
    if (v) {
      durumUygula(v, kayit);
      ozellikYaz(v, BOT_DURUM_OZELLIK, yeni);
    }
  }
  yaz();
  return yeni;
}

/* Varlik JSON'undaki olayi calistirir. "bekle" grubu hareket
   hizini 0 yapiyor, "takip" grubu geri aciyor. triggerEvent
   her surumde var ama olay adi JSON'da yoksa sessizce hicbir
   sey olmuyor -- o yuzden script takibi de duruma bakiyor.    */
function durumUygula(varlik, kayit) {
  try {
    if (typeof varlik.triggerEvent !== "function") return;
    varlik.triggerEvent(kayit.durum === "bekle" ? BOT_OLAY_BEKLE : BOT_OLAY_TAKIP);
  } catch (e) {
    hataYaz("bot.durumUygula", e);
  }
}

/* ---------------- Isinlanma ---------------- */

function yanNokta(oyuncu, uzaklik, indeks = 0) {
  const k = oyuncu.location;
  let yon;
  try {
    yon = oyuncu.getViewDirection();
  } catch (e) {
    yon = { x: 0, y: 0, z: 1 };
  }

  /* Bakis yonunun SAGINA koy: tam onune koyarsak nisani kapatir,
     tam arkasina koyarsak gorunmez.

     INDEKS: yirmi bot ayni noktaya dogarsa ust uste binip
     birbirini itiyor ve dagilana kadar tabletin fizigi bosuna
     calisiyor. Her bot yay uzerinde bir adim yana konuyor.   */
  const aci = Math.atan2(yon.z, yon.x) + (indeks * 0.7);
  const r = uzaklik + (indeks * 0.35);
  return {
    x: k.x + Math.cos(aci - Math.PI / 2) * r,
    y: k.y,
    z: k.z + Math.sin(aci - Math.PI / 2) * r
  };
}

function yanaGetir(varlik, oyuncu, indeks = 0) {
  const nokta = yanNokta(oyuncu, BOT_CAGIR_YAKIN, indeks);
  try {
    varlik.teleport(nokta, { dimension: oyuncu.dimension });
  } catch (e) {
    /* Bazi surumlerde teleport secenek almiyor; secenegsiz dene */
    try {
      varlik.teleport(nokta);
    } catch (e2) {
      hataYaz("bot.yanaGetir", e2);
    }
  }
}

/* ---------------- Her tick ----------------
   Merkezi tick yoneticisinden cagriliyor. Defter bosken dongu
   hic donmuyor -- iksir ve kalptekiyle ayni kural.

   YIRMI BOT: tarama oyuncu basina BOT_TARAMA (20 tick) araliginda
   ve botlarin hepsi ayni turda geziliyor. Yirmi getEntity + yirmi
   mesafe hesabi saniyede bir -- olculebilir bir yuk degil. Asil
   maliyet vanilla AI tarafinda, o da bizim elimizde degil.     */

export function botTara(oyuncular) {
  if (!BOT_ACIK || defter.size === 0) return;

  const simdi = system.currentTick;

  for (const oyuncu of oyuncular) {
    const liste = defter.get(oyuncu.id);
    if (!liste || liste.length === 0) continue;

    const ne = sonraki.get(oyuncu.id) || 0;
    if (simdi < ne) continue;
    sonraki.set(oyuncu.id, simdi + BOT_TARAMA);

    if (!gecerliMi(oyuncu)) continue;

    /* Kutu bosaltma kayit gerektiriyor ama tarama saniyede bir
       donuyor: her turda yaz() cagirmak bosuna. Sadece
       GERCEKTEN bir sey aktarildiysa yaziliyor.                */
    let yazBekliyor = false;

    let indeks = 0;
    for (const kayit of liste) {
      const sira = indeks++;

      const v = varligiBul(kayit);
      if (!v) continue;            // chunk yuklu degil; defterden SILME

      /* Yerden topladiklarini cantaya aktar. BEKLE kontrolunun
         USTUNDE: duran bot da esya topluyor (pickup_items hiz
         gerektirmiyor, yanina dusen seyi alir) ve derin tarama
         boyunca butun botlar "bekle" durumunda -- asagida olsa
         is boyunca hic bosaltilmazdi.                          */
      if (BOT_YERDEN_TOPLA) {
        try {
          if (kutuyuBosalt(v, oyuncu.id) > 0) yazBekliyor = true;
        } catch (e) {
          hataYaz("bot.kutuyuBosalt", e);
        }
      }

      /* Ilkel Besli bakimi: Harkos'un pasif iyilesmesi,
         Raxxan'in aurasi ve gizlenmesi. BEKLE kontrolunun
         USTUNDE -- duran bir Harkos da iyilesmeli.            */
      if (ilkelBakim) {
        try {
          ilkelBakim(v, oyuncu);
        } catch (e) {
          hataYaz("bot.ilkelBakim", e);
        }
      }

      // Bekle durumundayken kurtarma da yok: dur dedik, duracak
      if (kayit.durum === "bekle") continue;

      /* Evcillestirme dunya yeniden yuklenince bilinmiyor
         olabilir; bir kez daha denenip sonuc saklaniyor.      */
      if (kayit.evcil === undefined || kayit.evcil === false) {
        /* v4.67: false da tekrar deneniyor. Eskiden sadece
           undefined denenirdi ve evcillestir() HEP true
           dondugu icin bu dal hic calismazdi.

           Basarili olunca durum yeniden uygulaniyor: is_tamed
           eklendikten sonra pa:takip grubunun tazelenmesi
           follow_owner'i uyandiriyor.                        */
        const onceki = kayit.evcil;
        kayit.evcil = evcilDene(v, oyuncu, kayit.botId);
        if (kayit.evcil === true && onceki !== true) {
          durumUygula(v, kayit);
          yazBekliyor = true;
        }
      }

      try {
        const ayniBoyut = (v.dimension && oyuncu.dimension &&
                           v.dimension.id === oyuncu.dimension.id);

        if (!ayniBoyut) {
          yanaGetir(v, oyuncu, sira);
          kayit.boyutId = oyuncu.dimension.id;
          yaz();
          continue;
        }

        const a = v.location, b = oyuncu.location;
        const uzaklik = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

        /* Vanilla takip calisiyorsa sadece "gercekten kayboldu"
           durumunda karisiyoruz (24 blok). Calismiyorsa botun
           yaninda kalmasinin tek yolu biziz (8 blok).          */
        const esik = kayit.evcil ? BOT_KURTARMA_MENZIL : BOT_SCRIPT_MENZIL;
        if (uzaklik > esik) yanaGetir(v, oyuncu, sira);
      } catch (e) {
        hataYaz("bot.tara", e);
      }
    }

    if (yazBekliyor) yaz();
  }
}

/* Bot varligi oyunun kayit defterinde var mi?

   Bu, "bot neden gelmiyor" sorusunun en sik cevabi: behavior
   pack'teki entities/ klasoru dunyaya yuklenmemisse varlik hic
   yok demektir. Durum raporu bunu sohbete basiyor -- Content
   Log'a bakmadan gorulebilsin diye.

   undefined = denetim yapilamadi (EntityTypes yok), false =
   gercekten kayitli degil.                                     */
export function botKayitliMi() {
  if (!BOT_ACIK) return false;
  const EntityTypes = api.EntityTypes;
  if (!EntityTypes || typeof EntityTypes.get !== "function") return undefined;
  try {
    return EntityTypes.get(BOT_KIMLIK) !== undefined;
  } catch (e) {
    return false;
  }
}

/* Kayitli OLMAYAN bot turleri. Bos dizi = hepsi tamam,
   undefined = denetim yapilamadi.

   v4.35'te alti tur var (bot + bes ilkel uye); biri kaydolmazsa
   o uye cagrildiginda spawnEntity patliyor ve sebebi ancak
   Content Log'da goruluyordu. Durum raporu artik bunu sohbete
   basiyor.                                                     */
export function eksikBotTurleri() {
  const EntityTypes = api.EntityTypes;
  if (!EntityTypes || typeof EntityTypes.get !== "function") return undefined;
  const eksik = [];
  for (const tip of BOT_KIMLIKLER) {
    try {
      if (EntityTypes.get(tip) === undefined) eksik.push(tip);
    } catch (e) {
      eksik.push(tip);
    }
  }
  return eksik;
}

export function botDenetimi() {
  if (!BOT_ACIK) {
    bilgiYaz("bot: kapali (BOT_ACIK = false).");
    return;
  }
  const EntityTypes = api.EntityTypes;
  if (!EntityTypes || typeof EntityTypes.get !== "function") {
    bilgiYaz("EntityTypes bu surumde yok, bot varlik denetimi atlandi.");
    return;
  }
  let tip;
  try {
    tip = EntityTypes.get(BOT_KIMLIK);
  } catch (e) {
    tip = undefined;
  }
  if (tip) {
    bilgiYaz("bot denetimi: " + BOT_KIMLIK + " kayitli. Sohbete 'bot' yaz.");
  } else {
    bilgiYaz("KRITIK: " + BOT_KIMLIK + " oyuna KAYITLI DEGIL. Bot " +
             "cagrilamaz. Muhtemel sebep: behavior pack'teki entities/ " +
             "klasoru dunyaya yuklenmemis ya da varlik JSON'u reddedildi.");
  }
}

/* Testler ve oyuncu cikisi icin. */
export function botUnut(oyuncuId) {
  sonraki.delete(oyuncuId);
}

export function defteriUnut() {
  defter.clear();
  sonraki.clear();
  cantalar.clear();
  savasDurumu.clear();
  okundu = false;
  tameUyarisi = false;
}
