import { world } from "@minecraft/server";
import { bilgiYaz, hataYaz, sistemOlayaAbone } from "./yardimcilar.js";
import {
  SOHBET_ACIK, SOHBET_ONEK, KALP_ADIM, KALP_TAVAN, DERIN_ADLAR, ILKEL_ADLAR
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

/* Cozumleyici. Donen deger:
     undefined  -> bu bir komut degil, sohbete dokunma
     {cevap}    -> komuttu, sohbetten gizle ve cevabi yaz         */
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

  /* ENVANTER YEDEGI -- "/clear" ile silinen esyanin karsiligi.
     Sohbette, cunku envanterin silindigi an genellikle
     kilitlerin de geldigi andir.                            */
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
  "§eyedek§7 · envanterini yedekle (dovus oncesi)",
  "§egeriyukle§7 · yedekten geri yukle (/clear yediysen)",
  "§elazer§7 · goz lazeri at (once iksir ic)",
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

function cevapYaz(oyuncu, cevap) {
  if (!cevap) return;
  try {
    oyuncu.sendMessage(cevap);
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
      bilgiYaz("world.beforeEvents.chatSend YOK. Beta modulu yuklu ama " +
               "olay bulunamadi (API bicimi degismis olabilir). Sohbet " +
               "komutlari kapali; menu ve /scriptevent simsek:komut " +
               "calismaya devam ediyor.");
      return false;
    }

    olay.subscribe((e) => {
      try {
        const oyuncu = e.sender;
        if (!oyuncu) return;
        const sonuc = komutCozumle(oyuncu, e.message);
        if (!sonuc) {
          /* Komut degil. Dinleyicilere sor; biri sahiplenirse
             mesaj sohbete dusmez.                            */
          for (const d of dinleyiciler) {
            try {
              if (d(oyuncu, e.message)) { e.cancel = true; return; }
            } catch (hata) {
              hataYaz("sohbet.dinleyici", hata);
            }
          }
          return;                   // normal sohbet olarak gitsin
        }

        e.cancel = true;            // komut satiri sohbete dusmesin

        /* Cevap bir sonraki tick'te yazilmali: beforeEvents
           icinde dunyayi degistirmek yasak. Kancalar zaten
           system.run ile sariliyor (main.js), burada sadece
           metin yaziliyor.                                     */
        cevapYaz(oyuncu, sonuc.cevap);
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

      const sonuc = komutCozumle(oyuncu, olay.message || "");
      cevapYaz(oyuncu, sonuc ? sonuc.cevap
        : "§cAnlamadim: §7" + olay.message + "\n" + YARDIM);
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
