import { esyaBagla } from "./kayit.js";
import { bilgiYaz, hataYaz, actionbarYaz } from "../yardimcilar.js";

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
                    "kalp_ekle", "kalp_sifirla"],

  /* BUZ KOL -- dondurma takimi. */
  ["pa:kol_buz",    "buz_adam", "buz_mizragi"],

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
  ["pa:kol_ucus",   "ucus"]
];

for (const satir of KOL_ESYALARI) {
  for (let i = 1; i < satir.length; i++) esyaBagla(satir[0], satir[i]);
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
