import { esyaBagla } from "./kayit.js";
import { bilgiYaz, hataYaz, actionbarYaz } from "../yardimcilar.js";
import {
  ZIRH_MODLAR, ZIRH_CEKIRDEK_ONEK, MARVEL_GUCLER, MARVEL_ONEK,
  BEN10, BEN10_SALDIRI, BEN10_ISIN,
  KONSEY_SILAH, KONSEY_ASA_SESI
} from "../ayarlar.js";

/* ============================================================
   KOL ESYALARI

   Her kol, ZATEN VAR OLAN bir yetenege baglaniyor. Yetenek
   dosyalarina hic dokunulmuyor; burasi sadece esya -> yetenek
   eslemesi yapiyor.

   Kol elde tutulunca:
     - esyaya dokunmak yetenegi tetikler
     - egil + zipla da secili yetenek yerine KOLUN yetenegini
       calistirir (main.js icinde)

   ---- Gorunum tarafi (Simsek_Kol_Kaynak resource pack'i) ----
     models/entity/simsek_kol.geo.json   tek geometri, hepsi paylasiyor
     attachables/<kol>.json              elde 3B kol olarak cizer
     textures/entity/<kol>.png           kol kaplamasi (64x64)
     textures/item/<kol>.png             envanter ikonu (16x16)
     texts/*.lang                        gorunen ad

   Bu dosyalarin hepsini scratchpad'deki kol_uret.py uretiyor.
   Elle duzenleme; sekiz dosyayi senkron tutmak hataya davetiye.

   ---- NEDEN GORUNMUYORDU (v3.3 hatasi) ----
   Geometrinin kok kemigi "kol_kok" adindaydi. Bedrock attachable
   modelini oyuncu iskeletine BAGLARKEN kemik adlarini esliyor;
   oyuncuda "kol_kok" diye bir kemik olmadigi icin model kola hic
   oturmuyordu. Kok kemik artik "RightArm".
   ============================================================ */

/* Her satir: [esya, ...o kolun yetenekleri]

   Bir kolda birden fazla yetenek olabilir. TOPRAK KOL boyle:
   tek esya, icinde bes yetenek. Eldeyken:
     egil + yukari bak, tut -> KOL ICINDE sonraki yetenege gec
     egil + zipla           -> secili yetenegi calistir

   Tek yetenekli kollar ayni yolu kullaniyor, sadece listede tek
   eleman var; ayri bir kod yolu yok.                             */
export const KOL_ESYALARI = [
  // Cok yetenekli kol
  /* TOPRAK KOL -- on yetenek. Meteor ve Guclu TNT kendi
     kollarindan buraya tasindi, o iki kol tamamen kaldirildi.

     v4.21: kalp yetenekleri de buraya geldi ve pa:kol_kalp
     kaldirildi. Sebep kullanicinin kendi kurali: "her seyi kol
     yapma, kol israfini onle". Menu tek dokunusla acildigi icin
     on yetenekli bir kol iki ayri koldan daha kullanisli --
     envanterde bir yer kapliyor, hepsi ayni listede.

     Kalp eklemenin asil yolu artik SOHBET: "can 10". Menudeki
     yer ikinci yol.

     v4.33: CAN VERME CIKARILDI. Gerekcesi kullanicinin kendi
     sozu: "zaten hem kalp ekleme var, hem iksir icince onun 4-5
     kati sureyle yenilenme geliyor -- artik gereksizlesti."
     Dogru tespit: can_verme 10 saniyelik yenilenme veriyordu,
     iksirler 300 saniye veriyor ve kalp ekleme KALICI. Bir
     yetenegin uc ayri karsiligi olmasi, jest sirasini uzatmak
     disinda bir sey yapmiyordu.

     v4.54: BORALO KOLU BURAYA KATILDI (kullanici istegi).
     Yakala, Coklu Simsek, Ok Yagmuru ve Sarsinti buraya geldi;
     pa:kol_boralo kaldirildi. Toprak Kol artik 16 yetenekli.

     SIRA ONEMLI: dort yetenek kalp ikilisinin ONUNE konuldu.
     Menu listeyi bu sirayla ciziyor ve kalp yetenekleri en son
     kullanilanlar -- asil yolu zaten sohbet ("can 10").
     Dovus yetenekleri ustte, bakim yetenekleri altta.          */
  ["pa:kol_toprak", "toprak_topu", "yon_simsegi", "yildirim_halkasi",
                    "alan_simsegi", "savur", "ors",
                    "toprak_ucus", "toprak_duvar", "meteor", "guclu_tnt",
                    "yakala", "coklu_simsek", "ok_yagmuru", "sarsinti",
                    "kalp_ekle", "kalp_sifirla",
   /* v7.9: KANLI KOLA GEC -- yetenek degil, bir SAHNE.
      Listenin EN SONUNA konuldu cunku bu bir dovus ya da bakim
      yetenegi degil, Toprak Kol'dan CIKIS. Ustteki on alti
      yetenek "bu kolla ne yapabilirim", bu ise "bu kolu
      birakiyorum". Yeni bir KOL acilmadi -- kol israfini onleme
      kurali; sahne zaten Toprak Kol'un kendi sonu.            */
                    "kol_takas"],

  /* BUZ KOL -- dondurma takimi.

     v6.8: BUZ ISINI eklendi. Kullanicinin gonderdigi Ice-Man
     komut listesinden; kaynakta dokuz ayri parcacik satiri +
     bir hasar + bir yavaslik satiriydi, bizde tek yetenek.  */
  ["pa:kol_buz",    "buz_adam", "buz_mizragi", "buz_isini"],

  /* DAVE KOL -- Dave1545 modundan alinan takim. Dordu de orada
     tek satirlik komutlardi ve dordunun de sozdizimi ya da
     mantigi bozuktu; burada yeniden yazildilar. Toprak Kol'a
     eklenmediler cunku orasi zaten sekiz yetenekli, onuncu
     yetenege gecmek icin sekiz kez jest yapmak gerekirdi.      */
  ["pa:kol_dave",   "kasirga", "kubbe", "cekme", "isinlanma"],

  /* KEVIN KOL -- Kevin1545 modundan alinan takim. Referansta
     hapis calisiyordu ama dolu kutu oruyor ve geri almiyordu;
     "kol koparma" ise @e ile parantez arasindaki bosluk yuzunden
     hic calismiyordu.                                          */
  ["pa:kol_kevin",  "hapis", "dondur"],

  /* GUNES KOL -- Gunes modundan alinan takim. O mod digerlerinin
     aksine gercek script iceriyordu; fikirleri iyiydi ama her
     atis kendi runInterval'ini aciyor, oyuncu cikinca durmuyor
     ve durumlari oyuncu ADIYLA tutuyordu.                     */
  ["pa:kol_gunes",  "isin_topu", "yumruk"],

  /* ANNA KOLU (v7.7). Kaynak: fear1545'in "En Iyi BoraLo Kol
     Modu V2" -- oradaki Anna1545 Arm'in yetenekleri simsek,
     ucma, ucurma, can verme.

     UCU ALINMADI cunku "kol israfi" kuralina takiliyor
     (v4.33 ve v4.46'da SEKIZ kol tam bu yuzden kaldirildi):
       simsek -> yon_simsegi ZATEN Toprak Kol'da
       ucma   -> toprak_ucus ZATEN Toprak Kol'da, ayrica
                 pa:kol_ucus var
     Ikisini de buraya koymak, kaldirdigimiz kollarin
     aynisini yeniden yapmak olurdu.

     KALAN IKISI Anna'ya kimligini veriyor:
       can_ver -> BASKASINI iyilestirmek. Depoda bunu yapan
                  baska hicbir sey yok (kalp_ekle kendine,
                  iksirler kendine, bot_ilkel botun pasifi).
       ucurma  -> kaynagin listesinde var ve bugune kadar
                  HICBIR KOLDA degildi; yalniz esyasiz jest
                  sirasindaydi. Artik bir evi de var.        */
  ["pa:kol_anna",   "can_ver", "ucurma"],

  /* Tek yetenekli kollar.

     v4.33'te DORT KOL KALDIRILDI -- hepsi "kol israfi" kuralinin
     geregi:
       pa:kol_can    -> can_verme yetenegi tamamen silindi
       pa:kol_alan   -> alan_simsegi Yildirim Halkasi koluna gecti
       pa:kol_top    -> toprak_topu zaten Toprak Kol'da vardi
       pa:kol_golge  -> yetenekleri Boralo Kolu'na gecti

     v4.46'da DORT KOL DAHA KALDIRILDI. Gerekce kullanicidan ve
     REFERANS MODDAN geliyor: "Simsek kolu diye bir sey yok
     zaten, o tamamen Toprak Kol'un guclerine ait; ayni sekilde
     Yildirim Halkasi, savurma, bir de ors -- bunlar ayri kollar
     degil, Toprak Kol'un gucunde goruluyor."

       pa:kol_simsek -> yon_simsegi ZATEN Toprak Kol'daydi (kopya)
       pa:kol_ors    -> ors ZATEN Toprak Kol'daydi (kopya)
       pa:kol_halka  -> yildirim_halkasi + alan_simsegi Toprak'a gecti
       pa:kol_savur  -> savur Toprak'a gecti

     Ikisi tamamen gereksizdi (ayni yetenek iki esyada), diger
     ikisinin yetenekleri tasindi. Envanterdeki esya sayisi
     11'den 7'ye indi, kaybolan yetenek YOK.                    */
  ["pa:kol_ucus",   "ucus"],

  /* KANLI KOL (v6.7) -- Bobby1545 Mod V3'ten.

     Kaynakta her yetenek AYRI bir esya ve "Aktif Et"e basinca
     yedisi birden envanterine doluyor. Bizde tek esya, menuden
     seciliyor -- alti kolun duzeni bu.

     Alti yetenegin IKISI yeni (kanli_ors, kanli_simsek);
     digerleri bizde ZATEN vardi ve yeniden yazilmadi:
       kaynak Meteor        -> meteor
       kaynak Super Meteor  -> guclu_tnt
       kaynak Kendini Ucur  -> toprak_ucus
       kaynak Baya Yildirim -> yon_simsegi
     Ayni iki seyi iki kez yazmak, iki ayri yerde bozulacak tek
     bir mantik demekti.

     KAYNAKTAN ALINMAYAN: "Kapat" esyasi `Envanteri_Sil`
     cagiriyor ve o fonksiyon tek satir -- `clear @s`. Yani
     kolu kapatmak butun envanteri siliyor.                  */
  ["pa:kol_kanli",  "kanli_ors", "kanli_simsek", "meteor",
                    "guclu_tnt", "yon_simsegi", "toprak_ucus"],

  /* BOBBY KANLI KOL (v7.12).

     Kullanici: "sadece chris1545'in kanli kolu var, Bobby1545'in
     de kanli kolu vardi, onu da ekle... ayrismasi icin
     yetenekleri birebir [olmasin], Toprak Kol'dan bazi
     ozelliklerini ekle."

     ---- ONCE OLCUM: BUGUNKU KANLI KOL BIR MELEZ ----
     Ustteki satirin yetenekleri Bobby1545 Mod V3'ten geliyor
     (yukaridaki notta yaziyor), ama v7.3'te modeli ve dokusu
     chris1545'e gecti. Yani Bobby'nin kolu eksik degildi --
     ikiye bolunmustu, gorunumu bir yerde yetenekleri baska
     yerdeydi. Burasi onu geri topluyor.

     ---- CAKISMA SIFIR ----
     Ustteki alti yetenegin HICBIRI bu satirda yok. Iki kanli
     kol yan yana durunca ayni menuyu acmiyor.

     ---- NEDEN BUNLAR ----
     Kaynak modelin kollari DUZ ve uclarinda YUMRUK var
     (chris'inki bogumlu zincir, ucunda disli pence). Yumruk
     kolu bir DARBE kolu: hepsi temas ve sarsinti isi.
       ors              tek noktaya ors -- chris'te ALAN hali var
       savur            onundekini iter, yumrugun isi
       sarsinti         carpmanin ekranda hissedilmesi
       yakala           yumruk kavrar
       yildirim_halkasi etrafinda halka -- chris'te YONLU var

     ---- ACIK NOT: KOL ISRAFI KURALI ----
     Bes yetenegin besi de Toprak Kol'da VAR. v4.46'da dort kol
     tam bu yuzden kaldirilmisti. Ustteki Kanli Kol'un da alti
     yeteneginin dordu Toprak Kol'dan; yani "kanli kol =
     Toprak Kol'un secilmis guclerinin kendi govdesiyle
     tasinmasi" kalibi zaten kurulu ve burasi ona uyuyor.
     Kaldirilan kollardan farki: bunun KENDI modeli, KENDI
     dokusu ve kendi temasi var; onlar tek yetenekli kopyalardi.
     Yine de secim kullanicinindir -- istenirse tek satir. */
  ["pa:kol_kanli_bobby", "ors", "savur", "sarsinti", "yakala",
                         "yildirim_halkasi"]
];

for (const satir of KOL_ESYALARI) {
  for (let i = 1; i < satir.length; i++) esyaBagla(satir[0], satir[i]);
}

/* ---- MOD CEKIRDEKLERI (v4.95) ----

   Cekirdek bir "kol" degil ama esya -> yetenek eslemesi ayni
   defter. Uc modun kaynakta pasif efektten fazlasi var:
     Ucus  -> var olan "ucus" yetenegi (yeni kod yazilmadi)
     Isi   -> zirh_isi_isini   (20 hasar, 30 blok)
     Titan -> zirh_titan_lazeri (50 hasar, 100 blok)
   Diger alti modun kaynakta boyle bir yetenegi YOK; onlara
   uydurma bir sey baglanmadi.

   Liste ZIRH_MODLAR'dan turuyor: yeni bir mod eklenip
   "yetenek" alani yazilinca burasi kendiliginden dogru kalir.
   Elle ikinci bir liste tutmak, ayrisan iki liste demekti.  */
export const CEKIRDEK_YETENEKLERI = [];
for (const [mod, t] of ZIRH_MODLAR) {
  /* Tek "yetenek" ya da coklu "yetenekler". Temel v5.6'da
     Viltrumite'in on yetenegini + ucusu tasiyor, tek alana
     sigmiyordu; digerlerinin tek alani oldugu gibi duruyor.
     Ikisini de okumak, iki ayri liste tutmaktan iyi.        */
  const liste = [];
  if (t.yetenek) liste.push(t.yetenek);
  if (Array.isArray(t.yetenekler)) {
    for (const y of t.yetenekler) if (liste.indexOf(y) === -1) liste.push(y);
  }
  if (liste.length === 0) continue;
  const esya = ZIRH_CEKIRDEK_ONEK + mod;
  for (const y of liste) {
    CEKIRDEK_YETENEKLERI.push([esya, y]);
    esyaBagla(esya, y);
  }
}

/* ---- MARVEL KAHRAMANLARI (v5.2) ----

   Cekirdeklerle ayni kalip: guc esyasi bir "kol" degil ama
   esya -> yetenek eslemesi ayni defter.

   Baglanan esya GUC esyasi (bacak yuvasi), kostum degil --
   kaynakta da yetenegi tasiyan o. Guc kumesinin "yetenek"
   (ucus) ve "isin" alanlari varsa baglaniyor; ikisi de yoksa
   kahramanin aktif yetenegi YOKTUR ve ona uydurma bir sey
   BAGLANMIYOR (The Tick'te ogrenilen kural).

   Liste MARVEL_GUCLER'den turuyor: yeni bir kahraman eklenince
   burasi kendiliginden dogru kalir.                         */
/* Mekanik adi -> yetenek kimligi. Tirmanma BURADA YOK:
   surekli bir durum, tetiklenen bir yetenek degil (merkezi
   tick'ten taraniyor).                                        */
const MARVEL_MEKANIK_YETENEK = {
  sallanma: "marvel_sallanma",
  atilma: "marvel_atilma",
  sicrayis: "marvel_sicrayis",
  faz: "marvel_faz",
  kuvvet_alani: "marvel_kuvvet_alani",
  gecit: "marvel_gecit",
  boy: "marvel_boy"
};

export const MARVEL_YETENEKLERI = [];
for (const [anahtar, t] of MARVEL_GUCLER) {
  /* GUC ESYASI OLMAYAN kahramanlar (Iron Man, Doctor Strange,
     Falcon...) burada ATLANIYOR: onlara bagli olmayan bir esya
     kimligi yazsaydik menude "var gorunen, envanterde olmayan"
     bir esya cikardi. Testte yakalandi -- once tam oyle
     olmustu.

     Yeteneklerini yine kullanabiliyorlar: isinlarin kapisi
     (isinlar.js:kapiAcik) guctekiKahraman'a bakiyor ve o,
     gucKostumden isaretli kahramanlarda AYAKTAKI kostume
     bakiyor.                                                */
  if (t.gucKostumden) continue;
  const esya = MARVEL_ONEK + anahtar + "__" + anahtar + "_powers";
  /* v5.3: mekanikler de bagli. Kaynakta bunlar kahramanin
     ASIL ozelligi -- kullanicinin dedigi gibi, onlar olmayinca
     "kahraman degil kostum" kaliyor.                         */
  const mekYetenek = (t.mekanikler || []).map((m) => MARVEL_MEKANIK_YETENEK[m]);
  for (const y of [t.yetenek, t.isin, ...mekYetenek]) {
    if (!y) continue;
    MARVEL_YETENEKLERI.push([esya, y]);
    esyaBagla(esya, y);
  }
}

/* ---- BEN 10 YARATIKLARI (v6.1) ----

   Cekirdek ve kahraman esyalariyla ayni kalip. Bagli olan sey
   YARATIK ESYASI: elinde tutunca o yaratik oluyorsun, gucleri
   de o esyada.

   Liste ELLE YAZILMIYOR -- BEN10_SALDIRI ile BEN10_ISIN'daki
   `yaratik` alani TABAN adi, esya adlari da o tabandan turuyor
   (ben_<taban>, ben_<taban>_proto, ben_<taban>_10k). Yani
   uc bicimin de ayni yetenekleri var; modda da oyle, cunku
   powers dosyasi tur basina tek.

   Mekanikler de bagli: kaynakta duvar tirmanma, faz gecisi ve
   suzulme o yaratigin ASIL ozelligi. Marvel'de ogrenilen
   kural -- onlar olmayinca "kahraman degil kostum" kaliyor.  */
export const BEN10_YETENEKLERI = [];
{
  const tabanaYetenek = new Map();
  const ekle = (taban, y) => {
    if (!tabanaYetenek.has(taban)) tabanaYetenek.set(taban, []);
    const l = tabanaYetenek.get(taban);
    if (l.indexOf(y) === -1) l.push(y);
  };
  for (const [kimlik, t] of BEN10_SALDIRI) ekle(t.yaratik, kimlik);
  for (const [kimlik, t] of BEN10_ISIN) ekle(t.yaratik, kimlik);
  for (const [, t] of BEN10) {
    for (const m of (t.mekanikler || [])) {
      /* Tirmanma BURADA YOK: surekli bir durum, tetiklenen bir
         yetenek degil (merkezi tick'ten taraniyor). Marvel
         tarafinda da oyle.                                   */
      const y = MARVEL_MEKANIK_YETENEK[m];
      if (y) ekle(t.taban, y);
    }
  }
  for (const [esya, t] of BEN10) {
    for (const y of (tabanaYetenek.get(t.taban) || [])) {
      BEN10_YETENEKLERI.push(["pa:" + esya, y]);
      esyaBagla("pa:" + esya, y);
    }
  }
}

/* ---- KONSEY SILAHLARI VE AY ISIGI ASASI (v6.3) ----

   Kaynakta iki silahin mermisi carpinca kurbani donduruyor
   (`biogunyap1` / `bobbygundirt1`), Ay Isigi Asasi'nin ses
   dosyasi ise pakette duruyor ama modun kendisi hic calmiyor.
   Ucu de birer YETENEK oldu; burasi onlari kendi esyalarina
   bagliyor.

   Liste ELLE YAZILMIYOR: ayarlar.js'teki iki tablodan
   tureniyor -- yeni bir silah eklenince burasi kendiliginden
   dogru kalir.                                              */
export const KONSEY_SILAH_YETENEKLERI = [];
for (const [esya] of KONSEY_SILAH) {
  const y = "kns_atis_" + esya.replace("kns_silah_", "");
  KONSEY_SILAH_YETENEKLERI.push(["pa:" + esya, y]);
  esyaBagla("pa:" + esya, y);
}
for (const [esya] of KONSEY_ASA_SESI) {
  const y = "kns_sarki_" + esya.replace("kns_asa_", "");
  KONSEY_SILAH_YETENEKLERI.push(["pa:" + esya, y]);
  esyaBagla("pa:" + esya, y);
}

/* Kisa addan tam kimlige. scriptevent koprusu bunu kullaniyor:
     /scriptevent simsek:kol kol_top
   Esya JSON'unda artik on_use YOK (run_command deneysel ayar
   gerektiriyordu), ama komut elle yazilinca hala calisiyor --
   esyalar kaydolmadiginda yetenegi denemenin en kisa yolu.       */
const KISA_AD = new Map();
for (const satir of KOL_ESYALARI) {
  KISA_AD.set(satir[0].slice(satir[0].indexOf(":") + 1), satir[0]);
}

export function kisaAddanEsya(kisa) {
  return KISA_AD.get(kisa);
}

/* ============================================================
   ESYA KAYIT DENETIMI

   "/give @s pa:kol_top" SOZ DIZIMI HATASI veriyorsa sebep tek:
   esya oyunun kayit defterinde yok, yani behavior pack'in items/
   klasoru dunyaya yuklenmemis. Komut satirindan bunu anlamak zor
   oldugu icin script acilista kendisi bakiyor ve hangi esyanin
   eksik oldugunu tek tek yaziyor.

   ItemTypes @minecraft/server 2.0.0'da kararli. Yine de bazi
   surumlerde bulunmayabilir diye ozellik tespitiyle cagriliyor;
   yoksa denetim atlanir, kollar calismaya devam eder.
   ============================================================ */

/* Ad ile import ("import { ItemTypes } from ...") API'de o ad yoksa
   modul BAGLANIRKEN hata verir ve tum paket olur. Isim alani importu
   ("* as") boyle bir sey yapmaz: olmayan ad sadece undefined kalir.
   Ust duzey await de kullanilmiyor -- Bedrock motorunda garantisi yok. */
import * as api from "@minecraft/server";

const ItemTypes = api.ItemTypes;
const ItemStack = api.ItemStack;

export function kayitliKollar() {
  if (!ItemTypes || typeof ItemTypes.get !== "function") return undefined;

  const eksik = [];
  for (const [esya] of KOL_ESYALARI) {   // satirin ilk elemani = esya kimligi
    let tip;
    try {
      tip = ItemTypes.get(esya);
    } catch (e) {
      tip = undefined;
    }
    if (!tip) eksik.push(esya);
  }
  return eksik;
}

export function kolDenetimi() {
  const eksik = kayitliKollar();

  if (eksik === undefined) {
    bilgiYaz("ItemTypes bu surumde yok, kol esyasi denetimi atlandi.");
    return;
  }
  if (eksik.length === 0) {
    bilgiYaz("kol denetimi: " + KOL_ESYALARI.length + " esyanin hepsi kayitli.");
    return;
  }
  const hepsi = (eksik.length === KOL_ESYALARI.length);

  bilgiYaz(
    "KRITIK: " + eksik.length + "/" + KOL_ESYALARI.length +
    " kol esyasi oyuna KAYITLI DEGIL -> " + eksik.join(", ") +
    ". Bu esyalari /give ile alamazsin (soz dizimi hatasi verir)."
  );

  /* HEPSI eksikse sebep tek bir dosyada degil, yapinin tamamindadir --
     bozuk bir JSON olsa sadece o esya duserdi. Bir kismi eksikse
     gercekten o dosyalarda sorun vardir.                             */
  bilgiYaz(hepsi
    ? "Hepsi birden eksik. Muhtemel sebepler: (1) dunyada BEHAVIOR " +
      "pack etkin degil, sadece resource pack eklenmis; (2) esya " +
      "formati oyunun surumune uymuyor. Yetenekler yine de esyasiz " +
      "calisir: egil + zipla."
    : "Bir kismi eksik: bu dosyalarin JSON'unda sorun var, " +
      "items/ altindaki ilgili dosyalara bak.");
}

/* ============================================================
   KOLLARI ENVANTERE KOY

   /give yazmak zorunda kalmamak icin. Komut degil dogrudan API
   kullaniliyor: esya kayitli degilse ItemStack kurucusu hata
   firlatir, biz de bunu ADIYLA raporlariz -- komut satirinin
   verdigi "soz dizimi hatasi"ndan cok daha kullanisli.
   ============================================================ */

export function kollariVer(oyuncu) {
  if (!ItemStack) {
    actionbarYaz(oyuncu, "§cItemStack API'si yok, kollar verilemiyor.");
    return 0;
  }

  let kap;
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    kap = env ? env.container : undefined;
  } catch (e) {
    hataYaz("kollariVer.envanter", e);
  }
  if (!kap || typeof kap.addItem !== "function") {
    actionbarYaz(oyuncu, "§cEnvanter okunamadi.");
    return 0;
  }

  let verilen = 0;
  const basarisiz = [];

  for (const [esya] of KOL_ESYALARI) {
    try {
      kap.addItem(new ItemStack(esya, 1));
      verilen++;
    } catch (e) {
      basarisiz.push(esya);
    }
  }

  if (basarisiz.length > 0) {
    hataYaz("kollariVer", new Error("kayitli olmayan esyalar: " + basarisiz.join(", ")));
    actionbarYaz(oyuncu, "§e" + verilen + " kol verildi §8· §c" +
                 basarisiz.length + " tanesi oyuna kayitli degil");
  } else {
    actionbarYaz(oyuncu, "§a" + verilen + " kol envantere kondu");
  }

  return verilen;
}
