import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, actionbarYaz } from "../yardimcilar.js";
import {
  ARIN_ACIK, ARIN_BEKLEME, ARIN_SIRA, ARIN_EFEKTLER,
  ARIN_EKRAN, ARIN_SES, ARIN_SIS, ARIN_SIS_BILINEN, ARIN_SIS_KIMLIK,
  ARIN_GIRDI, ARIN_POZ_ANIM, ARIN_POZ_KONTROLCU,
  ZORLA_ACIK, ZORLA_YUVALAR, ZORLA_ENVANTER, ZORLA_MUAF_ONEK,
  ZORLA_KOR_ESYALAR,
  SAVUNMA_ARALIK, SAVUNMA_SURE, SAVUNMA_SIRA, SAVUNMA_UYARI
} from "../ayarlar.js";

/* ARINMA -- disaridan gelen kilitleri tek hareketle acar.

   Kullanici: "toolbox gibi seyler kullanirsa ve benden daha
   guclu cikarsa ne olacak? Karsi savunma gecir bana."

   ---- NEYE KARSI ----
   Bir baskasinin sana yapabilecegi ve KENDILIGINDEN GECMEYEN
   DOKUZ sey var: kalici poz (playanimation ... 9999), girdi
   kilidi (inputpermission disabled), kamera kilidi (camera
   set free), cok uzun efekt (slowness 100000 255), ekran
   sarsintisi, ekrani kapatan title duvari, ses bombasi,
   sis ve KILITLI ESYA (item_lock). Dokuzunun da saldiran
   tarafta geri alan bir satiri yok.

   Ekran/ses/sis v7.35'te eklendi: 53 MB'lik bir kod
   arsivindeki 6.808 OZGUN komut sayilinca ucunun de
   kullanildigi ve bizde karsiliginin olmadigi goruldu.
   Kilitli esya v7.49'da eklendi; gerekcesi ayarlar.js'teki
   ZORLA_ACIK notunda.

   ---- NEDEN SOHBETTEN DE CAGRILIYOR ----
   Hareket kilitliyken jest yapamazsin. Kilidi acacak sey,
   kilidin engellemedigi bir yoldan tetiklenebilmeli. Sohbet
   girdi kilidinden etkilenmiyor. Bu yuzden ayni is hem
   yetenek hem "arin" sohbet komutu.

   ---- EFEKTLERDE "hepsini sil" YOK ----
   komut_isin.mjs'te kayitli ders: kaynak listedeki
   "effect @p clear" oyuncunun KENDI ictigi iksiri de
   siliyordu. Burada yalniz ADI YAZILI olumsuz efektler
   siliniyor.                                                 */

// oyuncuId -> en son ne zaman arindi (tick)
const sonArinma = new Map();

// oyuncuId -> { kapat }  -- savunma kipi acik olanlar
const savunmada = new Map();

export function arinmaUnut(oyuncuId) {
  if (oyuncuId === undefined) { sonArinma.clear(); savunmada.clear(); }
  else { sonArinma.delete(oyuncuId); savunmada.delete(oyuncuId); }
}

export function savunmadaMi(oyuncuId) { return savunmada.has(oyuncuId); }

/* Savunma Kipi HERHANGI BIR oyuncuda acik mi (v7.38).

   Gozcu'nun oyun kipi denetimi buna bakiyor. Neden kisiye
   degil dunyaya bakiyor: Savunma Kipini KENDINI savunan
   acar, oysa yaratici kipe gecen KARSI TARAFTIR. Kisiye
   bakan bir kosul her zaman yanlis cikardi.

   Yani bunun anlami "su an bir vs var" -- kullanicinin
   dugmeyi actigi an zaten tam olarak bunu soyluyor.        */
export function savunmaVarMi() { return savunmada.size > 0; }

function komut(oyuncu, metin) {
  try {
    if (typeof oyuncu.runCommand !== "function") return false;
    oyuncu.runCommand(metin);
    return true;
  } catch (e) {
    /* Bir komut calismazsa OTEKILER YINE CALISSIN. Arinma
       kismen basarili olabilmeli: kamerayi acamasak bile
       girdiyi acmak ise yarar.                              */
    hataYaz("arinma." + metin.split(" ")[0], e);
    return false;
  }
}


/* Butun girdi turlerini acar (v7.50). Once "movement",
   cunku otekileri denemek icin bile once kimildayabilmen
   lazim ve liste sirasi bunu garanti ediyor.

   Donen deger: EN AZ BIRI tuttu mu. Hepsini sart kosmuyoruz:
   eski bir surumde "move_left" diye bir tur olmayabilir ve
   onun dusmesi "girdi acilmadi" demek degil.                 */
function girdiAc(oyuncu) {
  let oldu = false;
  for (const tur of ARIN_GIRDI) {
    if (komut(oyuncu, "inputpermission set @s " + tur + " enabled")) oldu = true;
  }
  return oldu;
}

/* ---- EKRAN · SES · SIS  (v7.35) ----
   Ucu de olculmus bir saldiriya karsilik geliyor; sayilar
   ayarlar.js'teki ARIN_EKRAN/ARIN_SES/ARIN_SIS notunda.
   Ucu de AYRI fonksiyon, cunku hem arindir() hem
   savunmaTazele() ayni seyi yapmak zorunda ve iki yere
   kopyalanan bir savunma er gec ikiye ayrisiyor.            */

/* /title @a actionbar "████████..." -- ekrani kapatma.
   clear duran yaziyi siler, reset sure/gecis ayarlarini
   fabrika degerine dondurur. Ikisi ayri sey: yalniz clear
   yazarsan bir sonraki title yine 99999 tick kalir.         */
function ekranTemizle(oyuncu) {
  if (!ARIN_EKRAN) return false;
  const a = komut(oyuncu, "title @s clear");
  const b = komut(oyuncu, "title @s reset");
  return a || b;
}

/* /playsound + /music -- ses bombasi.
   stopsound'a ses adi VERILMIYOR: adsiz hali o oyuncudaki
   butun sesleri durduruyor. Adini yazsaydik saldiranin
   hangi sesi caldigini bilmemiz gerekirdi.                  */
function sesSustur(oyuncu) {
  if (!ARIN_SES) return false;
  const a = komut(oyuncu, "stopsound @s");
  const b = komut(oyuncu, "music stop");
  return a || b;
}

/* /fog @a push "minecraft:fog_hell" -- gorusu bogma.
   Iki yol birden deneniyor; gerekcesi ayarlar.js'te.
   Once kendi eski sisimizi topluyoruz (ust uste birikmesin),
   sonra bilinen kimlikleri kaldirip ustune varsayilan sisi
   itiyoruz.                                                 */
function sisKaldir(oyuncu) {
  if (!ARIN_SIS) return false;
  let oldu = false;
  komut(oyuncu, "fog @s remove " + ARIN_SIS_KIMLIK);
  for (const kimlik of ARIN_SIS_BILINEN) {
    if (komut(oyuncu, "fog @s remove " + kimlik)) oldu = true;
  }
  if (komut(oyuncu, 'fog @s push "minecraft:fog_default" ' + ARIN_SIS_KIMLIK)) {
    oldu = true;
  }
  return oldu;
}

/* ---- KALICI POZ  (v7.28, denetleyici yuvasi v7.65) ----
   Iki asamali, cunku saldirinin asil yuku komutun SON
   argumaninda: kok denetleyici yuvasina yazilan animasyon.
   Gerekce ve olculen sayilar ayarlar.js'teki
   ARIN_POZ_KONTROLCU notunda.

   1. Adsiz cagri  -- v7.28'den beri var, KALIYOR. Adiyla
      yazilmamis (yani yuvasiz) bir pozu bu geri aliyor ve
      arsivdeki komutlarin ucte ikisi tam da oyle.
   2. Yuva adiyla cagri -- saldiranin yazdigi yuvanin ustune
      notr animasyonu yaziyor.

   Gecis suresi ikisinde de 0: hemen normale donsun.

   Bir yuva tutmazsa OTEKILER YINE DENENSIN diye her biri
   ayri komut(); ARIN_SIS_BILINEN'deki desenin aynisi.       */
function pozAc(oyuncu) {
  let oldu = komut(oyuncu, "playanimation @s " + ARIN_POZ_ANIM + " a 0");
  for (const yuva of ARIN_POZ_KONTROLCU) {
    if (komut(oyuncu, "playanimation @s " + ARIN_POZ_ANIM + " a 0 true " + yuva)) {
      oldu = true;
    }
  }
  return oldu;
}

/* ---- KILITLI ESYA  (v7.49) ----
   item_lock ile kafana/eline zorla takilan parcanin kilidini
   soker. Gerekce ve iki kural ayarlar.js'teki ZORLA_ACIK
   notunda; ozeti: esya SILINMEZ, "pa:" onekli kendi
   esyalarimiza DOKUNULMAZ.                                  */
const KOR_KUME = new Set(ZORLA_KOR_ESYALAR);

function bizimMi(tip) {
  return typeof tip === "string" && tip.indexOf(ZORLA_MUAF_ONEK) === 0;
}

/* Tek bir ContainerSlot. Kilit sokulduyse true doner.

   Her adim ayri try icinde, cunku bir yuvada patlayan sey
   OTEKI YUVALARI durdurmamali -- komut() ile ayni gerekce.
   Kismi kurtarma, hic kurtarmamaya yegdir.                  */
function yuvaCoz(yuva) {
  let tip;
  try {
    if (!yuva || typeof yuva.hasItem !== "function" || !yuva.hasItem()) {
      return false;
    }
    tip = yuva.typeId;
    /* "none" disindaki her sey kilit sayiliyor: hem "slot"
       hem "inventory". Ikisi ayrilmiyor cunku ikisi de
       oyuncunun kendi eliyle cozemedigi bir durum.          */
    if (yuva.lockMode === undefined || yuva.lockMode === "none") return false;
  } catch (e) {
    /* lockMode okunamiyorsa (eski surum) bu yuva atlanir.   */
    return false;
  }
  if (bizimMi(tip)) return false;

  try {
    yuva.lockMode = "none";
    return true;
  } catch (e) {
    hataYaz("arinma.kilit.yaz", e);
    return false;
  }
}

/* Kafadaki parca GORUSU KAPATIYORSA envantere indirilir.
   Kilidi sokmus olmak yetmiyor: kabak kilitsizken de ekrani
   kapatmaya devam ediyor.

   Envanterde yer yoksa esya KAFADA KALIYOR -- ama artik
   kilitsiz, yani elle cikarilabiliyor. Yere atmak ya da
   silmek YOK: ikisi de esya kaybi, bu depoda o riske
   girilmiyor.                                               */
function korlukIndir(oyuncu, ekip) {
  let esya;
  try {
    esya = ekip.getEquipment("Head");
    if (!esya || !KOR_KUME.has(esya.typeId) || bizimMi(esya.typeId)) return false;
  } catch (e) { return false; }

  let kap;
  try {
    const env = oyuncu.getComponent("minecraft:inventory");
    kap = env && env.container;
  } catch (e) { kap = undefined; }
  if (!kap || typeof kap.addItem !== "function") return false;

  /* YER VAR MI, ONCE O. Sonra indir, sonra koy. Ters sirada
     (once indir, sonra "sigmadi" de) esya bosluga duserdi;
     once koyup sonra indirmek de setEquipment patlarsa esyayi
     IKIYE cikarirdi. Bu sira ikisini de yapmiyor.            */
  try { if (!(kap.emptySlotsCount > 0)) return false; }
  catch (e) { return false; }

  try { ekip.setEquipment("Head", undefined); }
  catch (e) { hataYaz("arinma.kilit.cikar", e); return false; }

  let artan;
  try { artan = kap.addItem(esya); }
  catch (e) { artan = esya; hataYaz("arinma.kilit.envanter", e); }

  /* Konamadiysa GERI TAK. Esya kaybettirmemek, kabagi
     indirmekten onemli -- kabak kilitsiz kaldi, oyuncu
     kendi de cikarabilir.                                    */
  if (artan) {
    try { ekip.setEquipment("Head", esya); }
    catch (e) { hataYaz("arinma.kilit.geritak", e); }
    return false;
  }
  return true;
}

/* Disaridan cagrilan tek giris. Donen deger: sokulen kilit
   sayisi (kor parca indirildiyse +1).                       */
export function kilitSok(oyuncu) {
  if (!ZORLA_ACIK) return 0;
  let sayi = 0;

  let ekip;
  try { ekip = oyuncu.getComponent("minecraft:equippable"); }
  catch (e) { ekip = undefined; }

  if (ekip && typeof ekip.getEquipmentSlot === "function") {
    /* Kafadaki parca KILITLIYDIYSE indirme hakki dogar.
       Bu kosul testin 4. bolumunden geldi: kosulsuz yazilmis
       hali, enderman'dan korunmak icin KENDI taktigi kabagi
       da indiriyordu. Kilitli olmasi "bunu sen takmadin"in
       tek olculebilir kaniti -- oyuncunun kendi eli bir
       esyayi kilitleyemez.                                   */
    let kafaKilitliydi = false;
    for (const ad of ZORLA_YUVALAR) {
      let yuva;
      try { yuva = ekip.getEquipmentSlot(ad); }
      catch (e) { continue; }
      if (yuvaCoz(yuva)) {
        sayi++;
        if (ad === "Head") kafaKilitliydi = true;
      }
    }
    if (kafaKilitliydi && korlukIndir(oyuncu, ekip)) sayi++;
  }

  if (ZORLA_ENVANTER) {
    let kap;
    try {
      const env = oyuncu.getComponent("minecraft:inventory");
      kap = env && env.container;
    } catch (e) { kap = undefined; }
    if (kap && typeof kap.getSlot === "function") {
      for (let i = 0; i < kap.size; i++) {
        let yuva;
        try { yuva = kap.getSlot(i); }
        catch (e) { continue; }
        if (yuvaCoz(yuva)) sayi++;
      }
    }
  }

  return sayi;
}

/* Asil is. Hem yetenek hem sohbet komutu bunu cagiriyor.
   Geriye kullaniciya gosterilecek metin donuyor.            */
export function arindir(oyuncu) {
  if (!ARIN_ACIK) return "§7Arınma kapalı.";
  if (!gecerliMi(oyuncu)) return "§cArınma yapılamadı.";

  const simdi = system.currentTick;
  const onceki = sonArinma.get(oyuncu.id);
  if (onceki !== undefined && simdi - onceki < ARIN_BEKLEME) {
    const kalan = ((ARIN_BEKLEME - (simdi - onceki)) / 20).toFixed(1);
    return "§eArınma bekliyor §7· " + kalan + " sn";
  }
  sonArinma.set(oyuncu.id, simdi);

  const yapilan = [];

  // 1. GIRDI KILIDI -- en oncelikli, cunku otekileri denemek
  //    icin bile once kimildayabilmen lazim.
  if (girdiAc(oyuncu)) yapilan.push("girdi");

  // 2. KAMERA KILIDI
  if (komut(oyuncu, "camera @s clear")) yapilan.push("kamera");

  // 3. EKRAN SARSINTISI
  komut(oyuncu, "camerashake stop @s");

  // 4. KALICI POZ -- adsiz + yuva adiyla; bkz. pozAc().
  if (pozAc(oyuncu)) yapilan.push("poz");

  // 5. EKRAN KAPATMA (v7.35)
  if (ekranTemizle(oyuncu)) yapilan.push("ekran");

  // 6. SES BOMBASI (v7.35)
  if (sesSustur(oyuncu)) yapilan.push("ses");

  // 7. SIS (v7.35)
  if (sisKaldir(oyuncu)) yapilan.push("sis");

  // 8. OLUMSUZ EFEKTLER -- adi yazili olanlar, hepsi degil.
  let silinen = 0;
  for (const ad of ARIN_EFEKTLER) {
    try {
      if (typeof oyuncu.getEffect === "function" && !oyuncu.getEffect(ad)) {
        continue;      // yoksa ugrasma
      }
      oyuncu.removeEffect(ad);
      silinen++;
    } catch (e) {
      /* removeEffect yoksa ya da efekt zaten yoksa onemsiz. */
    }
  }
  if (silinen > 0) yapilan.push(silinen + " efekt");

  // 9. KILITLI ESYA (v7.49) -- item_lock ile zorla takilan
  //    parca. En sona konuldu: otekilerin hicbirini
  //    geciktirmiyor ve envanter taramasi en pahalisi.
  const kilit = kilitSok(oyuncu);
  if (kilit > 0) yapilan.push(kilit + " kilit");

  return yapilan.length
    ? "§aArındın §7· " + yapilan.join(" · ")
    : "§7Arındın.";
}

yetenekKaydet({
  kimlik: "arinma",
  ad: "Arınma",
  esyasiz: true,
  sira: ARIN_SIRA,

  olustur(oyuncu) {
    const cevap = arindir(oyuncu);
    try {
      oyuncu.sendMessage(cevap);
    } catch (e) {
      hataYaz("arinma.sendMessage", e);
    }
    /* kollariIndir CAGRILMIYOR: o da bir playanimation ve
       arinmanin poz sifirlamasinin ustune yazardi. Ayni
       hatayi pozlar.js'te bir kez yaptik, test yakalamisti. */
    return undefined;
  }
});


/* ---- SAVUNMA KIPI ----
   Arinma tek seferlik: fark edip yazman lazim. Kilit dongu
   halinde geliyorsa elle yetisilmez. Bu kip acikken savunma
   her SAVUNMA_ARALIK tickte kendiliginden tazeleniyor.

   Sürekli acik DEGIL, cunku o zaman kendi Yamultma/Dondur
   yeteneklerimiz kimseyi tutamazdi. Dovus kipi: acilip
   kapatiliyor, SAVUNMA_SURE sonunda kendi de kapaniyor.    */
function savunmaTazele(oyuncu) {
  girdiAc(oyuncu);
  komut(oyuncu, "camera @s clear");
  komut(oyuncu, "camerashake stop @s");
  pozAc(oyuncu);
  ekranTemizle(oyuncu);
  sesSustur(oyuncu);
  sisKaldir(oyuncu);
  for (const ad of ARIN_EFEKTLER) {
    try {
      if (typeof oyuncu.getEffect === "function" && !oyuncu.getEffect(ad)) {
        continue;
      }
      oyuncu.removeEffect(ad);
    } catch (e) { /* onemsiz */ }
  }
  /* Kilit sokme burada da var: saldiran replaceitem'i dongu
     halinde atiyorsa tek seferlik Arinma yetismez -- Savunma
     Kipinin var olma sebebi tam olarak bu.                  */
  kilitSok(oyuncu);
}

/* Cagiran taraf { mesaj, is } aliyor. is varsa merkezi is
   listesine eklenmeli (yetenek kendisi ekliyor; sohbet
   kancasi main.js'te isEkle ile ekliyor).                  */
export function savunmaAc(oyuncu) {
  if (!ARIN_ACIK) return { mesaj: "§7Savunma kapalı." };
  if (!gecerliMi(oyuncu)) return { mesaj: "§cSavunma açılamadı." };

  const varOlan = savunmada.get(oyuncu.id);
  if (varOlan) {
    varOlan.kapat = true;          // is kendi bitir()'ine dusecek
    return { mesaj: "§7Savunma kipi §ckapatıldı§7." };
  }

  const durum = { kapat: false };
  savunmada.set(oyuncu.id, durum);
  savunmaTazele(oyuncu);           // hemen bir kez

  const bitisTick = system.currentTick + SAVUNMA_SURE;
  let sonraki = system.currentTick + SAVUNMA_ARALIK;
  /* Tavan saate DEGIL calis() sayisina bakiyor: saat takilirsa
     da is bitsin. Sinematikte ayni hatayi bir kez yapmistik --
     tavan sure denetimiyle ayni saati okuyunca tavan olmuyor. */
  let calisti = 0;
  const tavan = Math.ceil(SAVUNMA_SURE / 1) + 100;
  /* Son dakikaya girildiginde bir kez sohbete yaziliyor. */
  let uyarildi = false;

  return {
    mesaj: "§aSavunma kipi §fAÇIK §7· kilitler " +
           (SAVUNMA_ARALIK / 20).toFixed(1) + " sn'de bir kırılıyor §8· " +
           (SAVUNMA_SURE / 1200).toFixed(0) + " dk sonra kapanır",
    is: {
      ad: "savunma",
      oyuncuId: oyuncu.id,
      calis() {
        if (++calisti >= tavan) return true;
        if (durum.kapat) return true;
        if (!gecerliMi(oyuncu)) return true;
        if (system.currentTick >= bitisTick) return true;
        if (system.currentTick < sonraki) return false;
        sonraki = system.currentTick + SAVUNMA_ARALIK;
        savunmaTazele(oyuncu);

        /* ---- SON DAKIKA GERI SAYIMI  (v7.81) ----
           Kip sessizce kapaniyordu; dovusun ortasinda
           korumasiz kaldigini fark etmenin yolu yoktu.     */
        const kalan = bitisTick - system.currentTick;
        try {
          if (kalan <= SAVUNMA_UYARI) {
            if (!uyarildi) {
              uyarildi = true;
              oyuncu.sendMessage(
                "§e⚠ Savunma kipi §f" + Math.ceil(kalan / 1200) +
                " dk§e sonra kapanacak §7· yeniden açmak için " +
                "sohbete §fsavunma§7 yaz");
            }
            actionbarYaz(oyuncu, "§e◈ Savunma §f" +
                         Math.ceil(kalan / 20) + " sn", true);
          } else {
            actionbarYaz(oyuncu, "§a◈ Savunma kipi açık", true);
          }
        } catch (e) { /* actionbar onemsiz */ }
        return false;
      },
      bitir() {
        savunmada.delete(oyuncu.id);
        try {
          /* Kapanis mesaji da artik NE YAPILACAGINI soyluyor. */
          oyuncu.sendMessage("§cSavunma kipi KAPANDI §7· yeniden açmak " +
                             "için sohbete §fsavunma§7 yaz");
        } catch (e) { /* onemsiz */ }
      }
    }
  };
}

yetenekKaydet({
  kimlik: "savunma",
  ad: "Savunma Kipi",
  esyasiz: true,
  sira: SAVUNMA_SIRA,

  olustur(oyuncu) {
    const sonuc = savunmaAc(oyuncu);
    try { oyuncu.sendMessage(sonuc.mesaj); }
    catch (e) { hataYaz("savunma.sendMessage", e); }
    return sonuc.is;      // is varsa merkezi listeye giriyor
  }
});
