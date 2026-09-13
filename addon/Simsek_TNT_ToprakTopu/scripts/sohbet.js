/* system: beforeEvents salt-okunur; v7.79'dan beri hem CEVAP
   hem KOMUTUN KENDISI system.run ile
   bir sonraki tick'e ataniyor (v7.40).                     */
import { world, system } from "@minecraft/server";
import { bilgiYaz, hataYaz, sistemOlayaAbone } from "./yardimcilar.js";
import {
  SOHBET_ACIK, SOHBET_ONEK, KALP_ADIM, KALP_TAVAN, DERIN_ADLAR, ILKEL_ADLAR,
  KOMUT_ETIKET, KOMUT_KORUMALI, JJK_KARAKTERLER, MEYVE_LISTESI
} from "./ayarlar.js";

/* ============================================================
   SOHBET KOMUTLARI  --  "aramizda bir dil"

   NEDEN VAR: her sey icin ayri bir KOL yapmak israf. Bazi seyler
   (kac can istedigini SOYLEMEK gibi) zaten bir sayi istiyor;
   menuden sayi secmek yerine yazmak dogal.

     can 10        -> 10 kalp ekle
     can           -> varsayilan kadar (KALP_ADIM) ekle
     can sifirla   -> eklenen butun kalpleri geri al
     lazer         -> goz lazerini at
     kol           -> butun kollari envantere koy
     guc kapat     -> acik iksiri kapat
     yardim        -> bu listeyi yaz

   ---- IKI GIRIS KAPISI ----
   Ayni cozumleyici iki yerden besleniyor:

     1. SOHBET       world.beforeEvents.chatSend
        Rahat olan yol: sohbete "can 10" yaz, yeter.
        AMA bu olayin API'deki yeri surumler arasinda oynadi.
        Varsa kullaniliyor, yoksa ozellik sessizce kapaniyor.

     2. SCRIPTEVENT  /scriptevent simsek:komut can 10
        Cirkin ama HER surumde var. Sohbet olayi yoksa kalan yol
        bu; ayni metni ayni cozumleyiciye veriyor.

   Yani "can 10" calismazsa "/scriptevent simsek:komut can 10"
   kesin calisir. Ikisi de ayni koddan geciyor, davranis birebir
   ayni.

   ---- TURKCE YAZIM ----
   Tablette Turkce klavye her zaman acik olmuyor. "sifirla" da
   "sıfırla" da, "guc" da "güç" de kabul ediliyor: girdi once
   sadelestiriliyor (kucuk harf + Turkce harfler ASCII karsiligina).
   Ayrica Turkce'de "I" harfinin kucugu "ı"dir; toLowerCase()
   bunu dogru yapmayabilecegi icin donusum elle yapiliyor.
   ============================================================ */

/* Komutlari calistiran fonksiyonlar disaridan veriliyor.
   Bu dosya main.js'i import ETMIYOR -- ederse dairesel import
   olur (main.js zaten burayi import ediyor).                   */
let kancalar = {};

export function sohbetKancalari(k) {
  kancalar = k || {};
}

/* ---- NORMAL SOHBETI DINLEYENLER  (v6.5) ----
   `komutCozumle` yalnizca KOMUTLARI taniyor; duz cumleler ona
   takilmadan geciyor. Dusmus yemini gibi seyler icin duz
   cumleyi de gormek gerekiyor.

   Neden ayri bir chatSend aboneligi acilmadi: iki abone ayni
   olayin `cancel` alanini paylasir ve hangisinin kazandigi
   siraya kalir. Tek abone var, dinleyiciler ona takiliyor.

   Dinleyici `true` dondurursa mesaj sohbete DUSMEZ (yemin
   herkesin ekranina yazilmasin diye).                        */
const dinleyiciler = [];

export function sohbetDinleyiciEkle(fn) {
  if (typeof fn === "function") dinleyiciler.push(fn);
}

/* Dinleyicilere sor: biri sahiplenirse true.
   v7.63'te DISA cikarildi -- eskiden yalniz chatSend
   aboneligi icinde cagriliyordu ve chatSend "Beta APIs"
   istiyor. Yani Beta kapaliyken Dusmus yemini HICBIR yere
   ulasmiyordu: yonerge ekrana geliyor, yazilan cumle
   kayboluyordu. Komutlarin scriptevent yedegi vardi,
   dinleyicilerin yoktu.                                    */
export function dinleyicilereSor(oyuncu, metin) {
  for (const d of dinleyiciler) {
    try {
      if (d(oyuncu, metin)) return true;
    } catch (hata) {
      hataYaz("sohbet.dinleyici", hata);
    }
  }
  return false;
}

const TR_HARF = {
  "ç": "c", "ğ": "g", "ı": "i", "İ": "i", "ö": "o", "ş": "s", "ü": "u",
  "Ç": "c", "Ğ": "g", "I": "i", "Ö": "o", "Ş": "s", "Ü": "u"
};

export function sadelestir(metin) {
  let s = "";
  for (const h of String(metin)) {
    s += (TR_HARF[h] !== undefined) ? TR_HARF[h] : h.toLowerCase();
  }
  return s.trim().replace(/\s+/g, " ");
}

/* ---- KOMUT YETKISI  (v7.44) ----

   GOZCU_ETIKET ile AYNI kural ve ayni gerekce: etiketi tasiyan
   oyuncu YOKSA kapi aciktir.

     - Kendi dunyanda hicbir sey degismiyor; ayardan habersiz
       biri komutlarini sessizce kaybetmiyor.
     - Duellodan once `/tag @s add simsek_yetkili` yazan kisi
       ayni anda herkesi disari almis oluyor. Tek komut.

   "Kimse etiketli degilse kimse kullanamasin" secilseydi paket
   kurulur kurulmaz butun komutlar oluydu ve sebebi gorunmezdi.  */
/* v7.62: DISA ACILDI. main.js jest kapisi icin ayni olcutu
   kullaniyor. Iki ayri kopya yazsaydik biri sikilastirilirken
   oteki geride kalirdi -- zaten sorun tam buydu: sohbet
   kapaliydi, jest acikti.                                   */
export function yetkiliMi(oyuncu, ad) {
  if (!KOMUT_ETIKET) return true;
  if (KOMUT_KORUMALI.indexOf(ad) < 0) return true;   // korumali degil
  let etiketliVar = false;
  try {
    for (const p of world.getAllPlayers()) {
      try { if (p.hasTag(KOMUT_ETIKET)) { etiketliVar = true; break; } }
      catch (e) { /* bu oyuncuda etiket okunamadi */ }
    }
  } catch (e) {
    return true;                  // liste okunamadi: kapiyi kapatma
  }
  if (!etiketliVar) return true;  // kimse etiketli degil: kapi acik
  try { return oyuncu.hasTag(KOMUT_ETIKET); } catch (e) { return true; }
}

/* ---- TANIYICI: YAN ETKISIZ  (v7.79) ----
   `komutCozumle` hem TANIYOR hem CALISTIRIYOR. Salt-okunur
   kipte (beforeEvents.chatSend) calistirmak yasak, ama
   "bu bir komut mu" sorusunu orada sormak zorundayiz --
   `e.cancel` ancak o anda yazilabiliyor.

   Bu yuzden tanima ayri: hicbir sey degistirmiyor, yalnizca
   ilk kelimeye bakiyor.

   ---- LISTE NEDEN ELLE YAZILI VE NASIL KORUNUYOR ----
   Cozumleyici uzun bir `if (ad === "...")` zinciri; oradan
   calisma aninda liste cikarmanin yolu yok. Elle yazilan
   liste ise KAYAR: yeni komut eklenir, buraya yazilmaz ve
   komut sessizce calismaz olur.

   O yuzden `test/sohbet.mjs` bu listeyi DOSYADAN cikariyor
   ve birebir karsilastiriyor. Kaymasi mumkun degil; kayarsa
   test duser.                                              */
const SABIT_KOMUTLAR = new Set([
  "and", "arin", "arın", "bilgi", "bot", "can", "carpik",
  "carpik hal", "carpil", "cik", "durum", "duvar", "esyalarim",
  "fruit", "geriyukle", "goz", "guc", "guc kullan", "jjk",
  "jujutsu", "kafes", "kalkan", "kalp", "kir", "kol", "kollar",
  "komut", "komutlar", "kurtul", "kusak", "kuşak", "kır", "lazer",
  "meyve", "savunma", "serbest", "set", "teknik", "test", "yardim",
  "yedek", "yemin", "yetenek", "yetenekler", "yukle", "çık"
]);

export function komutMu(hamMetin) {
  let metin = sadelestir(hamMetin);
  if (metin.length === 0) return false;
  if (SOHBET_ONEK && metin.startsWith(SOHBET_ONEK)) {
    metin = metin.slice(SOHBET_ONEK.length).trim();
  }
  const ad = metin.split(" ")[0];
  if (SABIT_KOMUTLAR.has(ad)) return true;
  /* Bu ikisi ZATEN yan etkisiz birer yuklem; kopyalanmiyor. */
  return meyveAdiMi(ad) || jjkAdiMi(ad);
}

/* Cozumleyici. Donen deger:
     undefined  -> bu bir komut degil, sohbete dokunma
     {cevap}    -> komuttu, sohbetten gizle ve cevabi yaz         */
/* Yazilan kelime bir Jujutsu karakter adi mi. Liste
   ayarlar.js'ten okunuyor, burada kopyalanmiyor.          */
function meyveAdiMi(ad) {
  for (const k of MEYVE_LISTESI) {
    if (sadelestir(k.kimlik) === ad) return true;
    for (const a of k.adlar) if (sadelestir(a) === ad) return true;
  }
  return false;
}

function jjkAdiMi(ad) {
  for (const k of JJK_KARAKTERLER) {
    if (k.kimlik === ad) return true;
    for (const a of k.adlar) if (sadelestir(a) === ad) return true;
  }
  return false;
}

export function komutCozumle(oyuncu, hamMetin) {
  let metin = sadelestir(hamMetin);
  if (metin.length === 0) return undefined;

  /* Onek istege bagli: "!can 10" da "can 10" da olur. Onek
     kullanirsan sohbette baskasiyla konusurken yanlislikla
     komut calistirmazsin.                                      */
  if (SOHBET_ONEK && metin.startsWith(SOHBET_ONEK)) {
    metin = metin.slice(SOHBET_ONEK.length).trim();
  }

  const parca = metin.split(" ");
  const ad = parca[0];

  /* ---- YETKI KAPISI  (v7.44) ----
     Dis inceleme: "sohbete duz 'can 10' yazan herkes kendine
     10 kalp ekliyor; KALP_TAVAN=200 oldugu icin tavan 200 ek
     kalp." Duelloda karsindaki de paketi kurmus oluyor.

     Kapi YALNIZ KOMUT_KORUMALI'daki komutlar icin. Arinma,
     savunma ve kafes kirma ASLA kapatilmiyor: ucu de KILIT
     ACMA komutu ve girdisi kilitli oyuncunun tek cikis yolu.
     Onlar bu satirin USTUNDE degil ALTINDA olsaydi bile
     korumali listede olmadiklari icin gecerlerdi; yine de
     sira burada, cozumlemenin en basinda.                  */
  if (!yetkiliMi(oyuncu, ad)) {
    return { cevap: "§c⛔ §7Bu komut yetkili oyunculara açık. " +
                    "§8(/tag @s add " + KOMUT_ETIKET + ")" };
  }

  /* ARINMA -- disaridan gelen kilitleri acar.

     Bu komutun SOHBETTE olmasi susleme degil, savunmanin can
     damari: hareket kilitliyken (inputpermission disabled)
     jest yapamazsin, ama sohbete yazabilirsin. Kilidi acacak
     sey, kilidin engellemedigi bir yoldan tetiklenmeli.

     Uc ad da kabul ediliyor cunku panik anindayken insan ne
     yazacagini dusunmez.                                     */
  if (ad === "arin" || ad === "arın" || ad === "kurtul" ||
      ad === "serbest") {
    return { cevap: cagir("arindir", oyuncu) };
  }

  /* SAVUNMA KIPI -- surekli tazelenen arinma. Arinma tek
     seferlik; kilit dongu halinde geliyorsa elle yetisilmez.
     Bu da sohbette, ayni sebeple: girdi kilitliyken jest
     yapamazsin ama yazabilirsin.                            */
  if (ad === "savunma" || ad === "kalkan" || ad === "duvar") {
    return { cevap: cagir("savunma", oyuncu) };
  }

  /* KAFES KIRMA -- bloklarla hapsedilmeye karsi (v7.36).
     Bu da sohbette olmali: bes blok bedrock'in ortasindaysan
     jest menusunu acabilirsin ama isin acisindan fark etmez;
     asil mesele Arinma ile ayni refleksle yazilabilmesi.
     "cik" ve "kir" da kabul ediliyor, panik aninda kimse
     "kafes" kelimesini aramaz.                              */
  if (ad === "kafes" || ad === "cik" || ad === "çık" || ad === "kir" ||
      ad === "kır") {
    return { cevap: cagir("kafesKir", oyuncu) };
  }

  /* ENVANTER YEDEGI -- "/clear" ile silinen esyanin karsiligi.
     Sohbette, cunku envanterin silindigi an genellikle
     kilitlerin de geldigi andir.                            */
  /* JUJUTSU KARAKTER SECIMI (v7.60).
     Kullanici: "adlarini yazarak aralarinda degisim
     yapabileyim." Iki bicim de calisiyor:
        gojo            -> dogrudan sec
        jujutsu gojo    -> ayni sey, onekli
        jujutsu         -> su anki karakteri ve adlari yaz
     Adin KENDISI komut oldugu icin liste ayarlar.js'te
     (JJK_KARAKTERLER[].adlar) -- burada elle yazilsaydi iki
     liste zamanla ayrisirdi.                                */
  if (ad === "jujutsu" || ad === "jjk" || ad === "teknik") {
    return { cevap: cagir("jjkSec", oyuncu, parca[1] || "") };
  }
  if (jjkAdiMi(ad)) {
    return { cevap: cagir("jjkSec", oyuncu, ad) };
  }

  /* SEYTAN MEYVESI SECIMI (v7.64). jjk ile ayni kalip: adin
     KENDISI komut, liste ayarlar.js'ten okunuyor.         */
  if (ad === "meyve" || ad === "fruit") {
    return { cevap: cagir("meyveSec", oyuncu, parca[1] || "") };
  }
  if (meyveAdiMi(ad)) {
    return { cevap: cagir("meyveSec", oyuncu, ad) };
  }

  /* DUSMUS YEMINI  (v7.63).
     Uzun cumle hala calisiyor (dinleyici yoluyla); bu kisa yol
     tablet icin. 47 harflik Turkce bir cumleyi yazmak asil
     zorluktu ve Beta kapaliysa cumle hicbir yere ulasmiyordu. */
  if (ad === "yemin" || ad === "and") {
    return { cevap: cagir("dusmusYeminEt", oyuncu) };
  }
  /* Askerin kusagi: envanter doluyken yer acip tekrar istemek
     icin. Bir kez veriliyor.                                */
  if (ad === "kusak" || ad === "kuşak" || ad === "set") {
    return { cevap: cagir("dusmusKusak", oyuncu) };
  }

  if (ad === "yedek") {
    return { cevap: cagir("yedekAl", oyuncu) };
  }
  if (ad === "geriyukle" || ad === "yukle" || ad === "esyalarim") {
    return { cevap: cagir("yedekYukle", oyuncu) };
  }

  if (ad === "can" || ad === "kalp") {
    const arg = parca[1];

    if (arg === "sifirla" || arg === "sil" || arg === "kapat") {
      const silinen = cagir("kalpSifirla", oyuncu);
      return {
        cevap: silinen > 0
          ? "§8" + silinen + " ek kalp silindi §7· normal 10 kalbe donuldu"
          : "§eEklenmis kalbin yok."
      };
    }

    /* Sayi verilmediyse varsayilan adim. Verildiyse OLDUGU GIBI
       isteniyor -- tavan kontrolu tek yerde, kalp defterinde.   */
    let istenen = KALP_ADIM;
    if (arg !== undefined) {
      const n = Number(arg);
      if (!isFinite(n) || n <= 0) {
        return { cevap: "§cSayi anlasilmadi: §7" + arg + " §8(ornek: can 10)" };
      }
      istenen = n;
    }

    const sonuc = cagir("kalpEkle", oyuncu, istenen);
    if (!sonuc) return { cevap: "§cKalp eklenemedi." };

    if (sonuc.eklenen <= 0) {
      /* v7.62: TAVAN MI, GECERSIZ MIKTAR MI. Ikisine de
         "tavandasin" deniyordu; 0 kalpken "can 1" yazan biri
         tavana geldigini saniyordu. Sebep tek sayinin cift
         sayiya yuvarlanmasiydi.                            */
      if (sonuc.gecersizMiktar) {
        return {
          cevap: "§eKalp ÇİFT sayı olmalı: §7" + istenen +
                 " istedin, çifte yuvarlanınca 0 kaldı " +
                 "§8(örnek: can 2)"
        };
      }
      return {
        cevap: "§eTavandasin: §7en fazla " + KALP_TAVAN +
               " ek kalp §8(toplam " + (10 + sonuc.toplam) + " kalp)"
      };
    }

    /* Istenen ile verilen farkliysa SEBEBINI soyle. Kullanici
       "sinir vardi" diyordu; sessizce kirpmak yerine neden
       kirpildigini yazmak lazim.                                */
    let cevap = "§c❤ +" + sonuc.eklenen + " kalp §7(toplam " +
                (10 + sonuc.toplam) + " kalp)";
    if (sonuc.eklenen < istenen) {
      cevap += " §8· " + istenen + " istedin ama tavan " + KALP_TAVAN +
               " ek kalp";
    }
    if (sonuc.tavanaCarpti) cevap += " §8· tavandasin";
    return { cevap };
  }

  if (ad === "lazer" || ad === "goz") {
    return { cevap: cagir("yetenek", oyuncu, "goz_lazeri") };
  }

  /* ---- Bot ----
     "bot"        cagir / yanina getir
     "bot bekle"  oldugu yerde dursun
     "bot takip"  pesinden gelsin
     "bot geri"   gonder (sil)
     Yeni bir KOL yapilmadi: "her seyi kol yapma" kurali.      */
  if (ad === "bot") {
    const alt = parca[1];

    /* ---- Derin tarama (v4.32) ----
       EN BASTA bakiliyor: "bot odun" hizli istir ama "bot odun
       64" bir HEDEFTIR, ikisi ayni koda gitmemeli. Ayrinti
       derinIstekCoz'de.                                        */
    const derin = derinIstekCoz(parca.slice(1));
    if (derin) {
      return { cevap: cagir("derin", oyuncu, derin.anahtar, derin.adet) };
    }

    /* Geri gonderme BEKLEME suresine takilmiyor: bu bir guc
       degil, guvenlik cikisi. Bot ayak altinda dolasiyorsa ya
       da bir yere sikismissa 3 saniye beklemek sinir bozucu.
       Ayni gerekce kalp sifirlamada da vardi.                 */
    if (alt === "geri" || alt === "git" || alt === "sil") {
      const silindi = cagir("botGeri", oyuncu);
      return { cevap: silindi
        ? "§8Bot geri gonderildi."
        : "§eBotun yok. §7'bot' yaz." };
    }
    if (alt === "bekle" || alt === "dur" || alt === "kal") {
      const d = cagir("botDurum", oyuncu, "bekle");
      return { cevap: d ? "§eBot bekliyor." : "§eBotun yok. §7'bot' yaz." };
    }
    if (alt === "takip" || alt === "pesim") {
      const d = cagir("botDurum", oyuncu, "takip");
      return { cevap: d ? "§aBotlar pesinden geliyor." : "§eBotun yok. §7'bot' yaz." };
    }
    if (alt === "gel" || alt === "yanima") {
      const n = cagir("botYanaCagir", oyuncu);
      return { cevap: n > 0 ? "§a" + n + " bot yanina geldi." : "§eBotun yok." };
    }

    /* ---- Asama 2 isleri ----
       Bot KENDI etrafini isliyor (Bedrock'ta yol bulma API'si
       yok). Yani once botla birlikte ormana/madene git, sonra
       soyle.                                                   */
    if (alt === "odun" || alt === "agac" || alt === "kes") {
      return { cevap: cagir("yetenek", oyuncu, "bot_odun") };
    }
    if (alt === "maden" || alt === "kaz" || alt === "cevher") {
      return { cevap: cagir("yetenek", oyuncu, "bot_maden") };
    }
    /* ---- Ozel gucler (v4.29) ----
       Botlar SENIN nisan aldigin yere atiyor; kendi bakislari
       kullanilsaydi top sana gelirdi (look_at_player).        */
    if (alt === "simsek" || alt === "yildirim") {
      return { cevap: cagir("yetenek", oyuncu, "bot_simsek") };
    }
    if (alt === "top" || alt === "kil" || alt === "toprak") {
      return { cevap: cagir("yetenek", oyuncu, "bot_top") };
    }
    /* ---- Ilkel Besli (v4.34) ----
         bot ilkel            -> siradaki eksik uye
         bot kajaros          -> o uye
         bot suikastci        -> harkos                        */
    if (alt === "ilkel" || alt === "besli" || alt === "patron") {
      return { cevap: cagir("ilkel", oyuncu, parca[2]) };
    }
    if (alt !== undefined && ILKEL_ADLAR.has(alt)) {
      return { cevap: cagir("ilkel", oyuncu, alt) };
    }

    if (alt === "teslim" || alt === "ver" || alt === "canta") {
      return { cevap: cagir("yetenek", oyuncu, "bot_teslim") };
    }
    if (alt === "savas" || alt === "dov" || alt === "koru") {
      const durum = parca[2];
      const istenen = (durum === "ac" || durum === "acik") ? true
                    : (durum === "kapat" || durum === "kapali") ? false
                    : undefined;   // argumansiz = tersine cevir
      const acik = cagir("botSavas", oyuncu, istenen);
      return { cevap: acik
        ? "§cBotlar savasa hazir. §7Sen vurunca onlar da saldirir."
        : "§7Botlar barisci." };
    }
    if (alt !== undefined) {
      return { cevap: "§cBilmedigim bot komutu: §7" + alt +
                      "\n§8bot · bot odun · bot maden · bot elmas 64 · bot derin · bot ilkel · " +
                      "bot teslim · bot simsek · " +
                      "bot top · bot savas · bot bekle · bot takip · bot gel · bot geri" };
    }
    return { cevap: cagir("yetenek", oyuncu, "bot_cagir") };
  }

  if (ad === "kol" || ad === "kollar") {
    cagir("kollariVer", oyuncu);
    return { cevap: "§aKollar envantere kondu." };
  }

  if (ad === "guc" && (parca[1] === "kapat" || parca[1] === "kapa")) {
    return { cevap: cagir("yetenek", oyuncu, "guc_kapat") };
  }

  /* ---- durum ----
     NEDEN VAR: butun teshis satirlari Content Log'a yaziliyordu
     ve kullanici Content Log'un ne oldugunu bilmiyordu -- yani
     "kollar kayitli mi", "sohbet acik mi", "bot varligi tanindi
     mi" gibi sorularin cevabi pratikte HIC gorunmuyordu.

     Bu komut ayni bilgileri SOHBETE basiyor. Content Log'a
     ihtiyac kalmiyor.                                          */
  if (ad === "durum" || ad === "bilgi" || ad === "test") {
    return { cevap: cagir("durum", oyuncu) || "§cDurum okunamadi." };
  }

  /* ---- YETENEGI ADIYLA CALISTIR  (v7.66) ----

     NEDEN VAR: jest dongusu 216 yetenege ulasti. Yeni eklenen
     her sey listenin SONUNA giriyor, cunku sira numaralari
     artan. Son 16'ya (JJK, Simbiyot, Seytan Meyveleri) jestle
     ulasmak icin 200'den fazla kez donmek gerekiyordu -- yani
     yazildilar, sinandilar ve pratikte ERISILEMEZDILER.

     Bu bir "yeni guc" degil, VAR OLAN gucun kapisi. Ayni
     kapidan geciyor: yetenekTetikle AYNI_ANDA, BEKLEME,
     yetenekYetkisi ve anlikHazirMi denetimlerini yapiyor.
     Yani sohbetten calistirmak jestten calistirmaktan daha
     serbest DEGIL.

     Arama kimlikte ve Turkce adda birden yapiliyor; "gura",
     "mabet", "simbiyot" gibi bir parca yeter. Birden fazla
     esleserse SECMIYOR, listeliyor -- yanlis yetenegi
     calistirmak bekleme suresini bosa harcatirdi.            */
  /* ---- CARPIK HAL  (v7.67) ----
     Jest dongusunde 252. sirada; "yetenek carpik" da calisir
     ama form gunluk kullanilacak bir sey oldugu icin kendi
     kisa komutu var. sadelestir "çarpık" -> "carpik" yapiyor,
     iki yazim da tutuyor.                                    */
  if (ad === "carpik" || ad === "carpik hal" || ad === "carpil") {
    return { cevap: cagir("yetenek", oyuncu, "carpik") };
  }

  if (ad === "yetenek" || ad === "yetenekler" || ad === "guc kullan") {
    const arama = parca.slice(1).join(" ").trim();
    return { cevap: cagir("yetenekAra", oyuncu, arama) };
  }

  if (ad === "yardim" || ad === "komut" || ad === "komutlar") {
    return { cevap: YARDIM };
  }

  return undefined;   // komut degil
}

/* ============================================================
   DERIN TARAMA ISTEGI COZUMLEME  (v4.32)

   Kullanicinin agzindan cikan seyi oldugu gibi anlamaya
   calisiyor. Hepsi calisan girdiler:

     bot elmas              -> 64 elmas (varsayilan adet)
     bot elmas 64           -> 64 elmas
     bot 64 tane elmas      -> 64 elmas
     bot 4 tane 64luk demir -> 256 demir   (sayilar CARPILIR)
     bot demir 4x64         -> 256 demir
     bot derin              -> ne cevher cikarsa (varsayilan)
     bot odun 64            -> 64 odun (hedefli)

   AMA:
     bot odun / bot maden   -> ESKI hizli is, derin tarama DEGIL

   Ayrim su: sayi ya da "derin" kelimesi varsa hedeflidir. "bot
   odun" dedigin an yanindaki agaclari kessin istiyorsun, "bot
   odun 64" dedigin an bir HEDEF veriyorsun. Kullanicinin
   kendi cumlesi de boyleydi: "odun topla dedigimde hemen yapar
   ama elmas bul 64 tane dedigimde is dakikasi artsin."

   Donen deger: {anahtar, adet} ya da undefined (= derin tarama
   istegi degil, alt komutlara devam et).                      */

/* Turkce ek yutucu: "elmasi", "demiri", "elmastan" da tutsun.
   Sadece 4 harften uzun anahtarlarda onek eslesmesi yapiliyor;
   kisa anahtarlarda ("odun") yanlis eslesme riski var.        */
function hedefAdiBul(kelime) {
  const tam = DERIN_ADLAR.get(kelime);
  if (tam) return tam;
  for (const [ad, anahtar] of DERIN_ADLAR) {
    if (ad.length >= 5 && kelime.startsWith(ad)) return anahtar;
  }
  return undefined;
}

/* Sayilari gormezden gelinecek dolgu kelimeler. Kullanici
   "4 tane 64luk demir topla" diye yaziyor; "tane" ve "topla"
   ayristirmayi bozmamali.                                     */
const DOLGU = new Set([
  "tane", "adet", "tanesi", "getir", "bul", "topla", "kaz", "ara",
  "tarama", "tara", "yap", "bana", "lutfen", "hemen", "git"
]);

export function derinIstekCoz(parcalar) {
  let anahtar;
  let carpim;                 // bulunan sayilarin carpimi
  let derinKelimesi = false;

  for (const ham of parcalar) {
    if (!ham) continue;
    if (ham === "derin") { derinKelimesi = true; continue; }
    if (DOLGU.has(ham)) continue;

    /* "4x64" / "4*64" -> 256. Kullanici "4 tane 64'luk" yerine
       kisayolu da yazabilsin.                                  */
    const c = ham.match(/^(\d+)[x*](\d+)$/);
    if (c) {
      carpim = (carpim === undefined ? 1 : carpim) * Number(c[1]) * Number(c[2]);
      continue;
    }

    /* Basi rakam olan her sey sayi sayiliyor: "64", "64luk",
       "64'luk" sadelestirilmis hali dahil.                     */
    if (/^\d/.test(ham)) {
      const n = parseInt(ham, 10);
      if (isFinite(n) && n > 0) {
        carpim = (carpim === undefined ? 1 : carpim) * n;
      }
      continue;
    }

    if (!anahtar) {
      const bulunan = hedefAdiBul(ham);
      if (bulunan) anahtar = bulunan;
    }
  }

  const sayiVar = carpim !== undefined;

  /* "derin" dendiyse hedef soylenmese de calisir. */
  if (derinKelimesi) return { anahtar: anahtar || "maden", adet: carpim };

  if (!anahtar) return undefined;

  /* odun/maden SAYISIZ soylenmisse eski hizli is calissin. */
  if (!sayiVar && (anahtar === "odun" || anahtar === "maden")) return undefined;

  return { anahtar, adet: carpim };
}

const YARDIM = [
  "§6--- Simsek komutlari ---",
  "§ecan 10§7 · 10 kalp ekle (tavan " + KALP_TAVAN + ")",
  "§ecan§7 · varsayilan " + KALP_ADIM + " kalp",
  "§ecan sifirla§7 · eklenen kalpleri geri al",
  "§earin§7 · KILITLERI AC: poz, girdi, kamera, sarsinti, olumsuz efekt",
  "§esavunma§7 · SAVUNMA KIPI: kilitleri surekli kirar (vs icin)",
  "§ekafes§7 · BLOKLA HAPSEDILDIYSEN cevreni kir (fill/setblock)",
  "§eyedek§7 · envanterini yedekle (dovus oncesi)",
  "§egeriyukle§7 · yedekten geri yukle (/clear yediysen)",
  "§elazer§7 · goz lazeri at (once iksir ic)",
  "§ecarpik§7 · ÇARPIK HAL: renklerin tersi, sırıtış, titreyen beden",
  "§eyetenek gura§7 · YETENEGI ADIYLA CALISTIR (jestle 216. sirada olani da)",
  "§eyetenek§7 · adiyla arama nasil yapilir, kac yetenek var",
  "§ebot§7 · botu cagir / yanina getir",
  "§ebot odun§7 · botlar etrafindaki agaclari keser",
  "§ebot maden§7 · botlar etrafindaki cevheri kazar",
  "§ebot elmas 64§7 · DERIN TARAMA: durak durak arar, madene iner",
  "§ebot 4 tane 64luk demir§7 · sayilar carpilir (256 demir)",
  "§ebot derin§7 · hedefsiz derin tarama (ne cikarsa)",
  "§ebot ilkel§7 · Ilkel Besli'den siradaki uyeyi cagir",
  "§ebot kajaros§7 · §ebot miskel§7 · §ebot harkos§7 · §ebot raxxan§7 · §ebot okazor",
  "§ebot simsek§7 · baktigin yere simsek yagdirirlar",
  "§ebot top§7 · baktigin yere kil topu atarlar",
  "§ebot teslim§7 · topladiklarini sana verir",
  "§ebot savas§7 · kopek gibi: sen vurunca onlar da saldirir",
  "§ebot bekle§7 · §ebot takip§7 · §ebot gel§7 · §ebot geri",
  "§ekol§7 · butun kollari al",
  "§eguc kapat§7 · acik iksiri kapat",
  "§edurum§7 · her sey calisiyor mu, tek bakista",
  "§8Sohbet calismazsa: §7/scriptevent s:k can 10"
].join("\n");

function cagir(ad, ...arg) {
  const f = kancalar[ad];
  if (typeof f !== "function") {
    hataYaz("sohbet.kanca", new Error("kanca yok: " + ad));
    return undefined;
  }
  try {
    return f(...arg);
  } catch (e) {
    hataYaz("sohbet." + ad, e);
    return undefined;
  }
}

/* ---- SALT-OKUNUR KIP: DENE, OLMAZSA ERTELE  (v7.40) ----

   Bu fonksiyon beforeEvents.chatSend'in ICINDEN de cagriliyor.
   `beforeEvents` salt-okunur kipte calisir ve `sendMessage`
   dunyayi degistiren bir cagridir -- orada dogrudan cagirmak
   "Cannot modify the world in read-only mode" atar.

   Eski yorum "burada sadece metin yaziliyor" diyordu ve
   yanlisti; metin yazmak da bir degisiklik. Bugune kadar
   patlamamis olmasinin tek sebebi chatSend'in KARARLI API'DE
   HIC BULUNMAMASI, yani o dalin zaten calismamasiydi. Beta
   acilir acilmaz butun komutlar cevapsiz kalirdi.

   ---- NEDEN KOSULSUZ system.run DEGIL ----
   Kosulsuz ertelemek CALISAN durumu da bir tick geciktirir ve
   cagri sirasini degistirir; olculdu, uc testte cevap artik
   "son mesaj" olmaktan cikti. Burada modYaz'daki kalip
   kullaniliyor: once dogrudan dene, istisna atarsa yedek yola
   dus. Erteleme yalnizca gercekten gerektiginde oluyor.    */
function cevapYaz(oyuncu, cevap) {
  if (!cevap) return;
  try {
    oyuncu.sendMessage(cevap);
    return;
  } catch (e) {
    /* Salt-okunur olabilir; asagida bir sonraki tick'e atiyoruz. */
  }
  try {
    system.run(() => {
      try {
        oyuncu.sendMessage(cevap);
      } catch (e2) {
        hataYaz("sohbet.cevapYaz.ertelenmis", e2);
      }
    });
  } catch (e) {
    hataYaz("sohbet.cevapYaz", e);
  }
}

/* ---------------- Giris 1: sohbet ----------------
   beforeEvents.chatSend: mesaji GONDERILMEDEN once yakalar,
   boylece komut satirini herkesin sohbetinde gostermeden
   iptal edebiliyoruz (olay.cancel = true).

   Ayri bir yardimci yok cunku yardimcilar.js sadece
   afterEvents ve system.afterEvents icin abone oluyor. Ayni
   ozellik tespiti burada elle yapiliyor: olay yoksa paket
   olmemeli, sadece bu ozellik kapanmali.                       */
function sohbeteAbone() {
  try {
    const oncekiler = world.beforeEvents;
    const olay = oncekiler ? oncekiler.chatSend : undefined;
    if (!olay || typeof olay.subscribe !== "function") {
      /* v4.24'te manifest "@minecraft/server": "2.0.0-beta" oldu.
         Buraya dusuyorsak beta modulu yuklenmemis demektir --
         ama o durumda script hic calismazdi. Yani pratikte
         buraya ancak API bicimi degisirse duseriz.             */
      /* ---- METIN v7.40'TA DUZELTILDI ----
         Eskiden "Beta modulu yuklu ama olay bulunamadi" diyordu.
         O cumle v4.24 donemine ait: manifest o zaman
         "2.0.0-beta" istiyordu. Manifest v4.25'te KARARLI
         "2.0.0"a gecti, yani mesaj o gunden beri yanlis bir
         sebep gosteriyordu -- kullanici "beta neden yuklu
         degil" diye bakardi, oysa beta hic istenmiyor.

         chatSend Bedrock'ta hala beta kapisinin arkasinda;
         kararli modulde yoktur. Yani buraya dusmek BEKLENEN
         durum, ariza degil.                                */
      bilgiYaz("world.beforeEvents.chatSend YOK -- kararli API'de bu olay " +
               "bulunmuyor (beta kapisinin arkasinda). Sohbet komutlari " +
               "kapali; menu ve /scriptevent simsek:komut calismaya " +
               "devam ediyor.");
      return false;
    }

    olay.subscribe((e) => {
      try {
        const oyuncu = e.sender;
        if (!oyuncu) return;
        const metin = e.message;

        /* ---- CALISTIRMA DA ERTELENIYOR  (v7.79) ----
           v7.40 yalniz CEVABI ertelemisti ve yorumu "sorun
           cozuldu" diyordu. Yarisi cozulmustu: `komutCozumle`
           tanimakla kalmiyor, CALISTIRIYOR da --
           cagir("kalpEkle"), arindir, botGeri, yedekYukle
           hepsi dunyayi degistiriyor. Salt-okunur kipte
           hepsi "Cannot modify the world in read-only mode"
           atar ve `cagir`in try/catch'i yutar: kullanici
           cevabi gorur, komut hic calismaz.

           Bugune kadar patlamamasinin sebebi chatSend'in
           kararli API'de HIC BULUNMAMASI. Beta acilir acilmaz
           butun sohbet komutlari sessizce olurdu.

           Artik tanima burada (yan etkisiz), calistirma bir
           sonraki tick'te.                                  */
        if (!komutMu(metin)) {
          /* Komut degil. Dinleyicilere sor; biri sahiplenirse
             mesaj sohbete dusmez.                            */
          if (dinleyicilereSor(oyuncu, metin)) { e.cancel = true; return; }
          return;                   // normal sohbet olarak gitsin
        }

        e.cancel = true;            // komut satiri sohbete dusmesin

        system.run(() => {
          try {
            const sonuc = komutCozumle(oyuncu, metin);
            /* Taniyici "komut" dedi ama cozumleyici tanimadiysa
               (ornegin yetki kapisi disi bir durum) sessiz
               kalmak yanlis olurdu -- yine de bir sey yaz.  */
            cevapYaz(oyuncu, sonuc ? sonuc.cevap : undefined);
          } catch (hata) {
            hataYaz("sohbet.komutCalistir", hata);
          }
        });
      } catch (hata) {
        hataYaz("sohbet.chatSend", hata);
      }
    });
    return true;
  } catch (e) {
    hataYaz("sohbeteAbone", e);
    return false;
  }
}

/* ---------------- Giris 2: scriptevent ----------------
   /scriptevent simsek:komut can 10
   Her surumde var; sohbet olayi yoksa kalan yol bu.            */
function scripteventeAbone() {
  return sistemOlayaAbone("scriptEventReceive", (olay) => {
    try {
      /* Iki kimlik de kabul: uzun olan okunakli, kisa olan
         tablette yazilabilir. "s:k bot" 9 karakter.           */
      if (olay.id !== "simsek:komut" && olay.id !== "s:k") return;
      const oyuncu = olay.sourceEntity;
      if (!oyuncu || oyuncu.typeId !== "minecraft:player") return;

      const metin = olay.message || "";
      const sonuc = komutCozumle(oyuncu, metin);
      if (sonuc) { cevapYaz(oyuncu, sonuc.cevap); return; }
      /* v7.63: komut degilse DINLEYICILERE de sor. Dusmus
         yemininin Beta'siz tek yolu burasi.                */
      if (dinleyicilereSor(oyuncu, metin)) return;
      cevapYaz(oyuncu, "§cAnlamadim: §7" + metin + "\n" + YARDIM);
    } catch (e) {
      hataYaz("sohbet.scriptevent", e);
    }
  });
}

/* Sohbetten komut YAZILABILIYOR mu? Oyuncuya dogru yolu
   soyleyebilmek icin disari aciliyor.

   v4.23'te ogrenildi: world.beforeEvents.chatSend KARARLI API'de
   YOK, "Beta APIs" deneysel ayari gerektiriyor. Kapali oldugunda
   abonelik sessizce kurulmuyor ve yazdigin "bot" sohbete normal
   bir mesaj olarak dusuyor. Oyunda tam olarak bu goruldu.       */
let sohbetCalisiyor = false;

export function sohbetCalisiyorMu() {
  return sohbetCalisiyor;
}

export function sohbetKur() {
  if (!SOHBET_ACIK) return;
  sohbetCalisiyor = sohbeteAbone();
  const olay = scripteventeAbone();
  bilgiYaz("sohbet komutlari: " +
           (sohbetCalisiyor ? "sohbet ACIK" : "sohbet KAPALI (Beta APIs gerekiyor)") +
           ", " + (olay ? "scriptevent ACIK" : "scriptevent kapali"));
}

/* Oyuncuya oyun ICINDE haber ver. Content Log'u tablette acmak
   zahmetli; komutun neden calismadigini orada birakirsak
   kullanici bosuna dener (dort kez denendi).                    */
export function sohbetDurumMesaji() {
  if (!SOHBET_ACIK) return undefined;
  if (sohbetCalisiyor) {
    return "§7Sohbete §fyardim§7 yazarak komutlari gorebilirsin.";
  }
  return "§eSohbet komutlari bu surumde CALISMIYOR §7(dunya ayarlarinda " +
         "§fBeta APIs§7 kapali).\n§7Bunun yerine: §fkola dokun -> menu§7, " +
         "ya da §f/scriptevent simsek:komut bot";
}
