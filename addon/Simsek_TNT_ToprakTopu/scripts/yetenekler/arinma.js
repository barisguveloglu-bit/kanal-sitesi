import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, actionbarYaz } from "../yardimcilar.js";
import {
  ARIN_ACIK, ARIN_BEKLEME, ARIN_SIRA, ARIN_EFEKTLER,
  SAVUNMA_ARALIK, SAVUNMA_SURE, SAVUNMA_SIRA
} from "../ayarlar.js";

/* ARINMA -- disaridan gelen kilitleri tek hareketle acar.

   Kullanici: "toolbox gibi seyler kullanirsa ve benden daha
   guclu cikarsa ne olacak? Karsi savunma gecir bana."

   ---- NEYE KARSI ----
   Bir baskasinin sana yapabilecegi ve KENDILIGINDEN GECMEYEN
   bes sey var: kalici poz (playanimation ... 9999), girdi
   kilidi (inputpermission disabled), kamera kilidi (camera
   set free), cok uzun efekt (slowness 100000 255) ve ekran
   sarsintisi. Besinin de saldiran tarafta geri alan bir
   satiri yok.

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
  if (komut(oyuncu, "inputpermission set @s movement enabled")) {
    komut(oyuncu, "inputpermission set @s camera enabled");
    yapilan.push("girdi");
  }

  // 2. KAMERA KILIDI
  if (komut(oyuncu, "camera @s clear")) yapilan.push("kamera");

  // 3. EKRAN SARSINTISI
  komut(oyuncu, "camerashake stop @s");

  // 4. KALICI POZ -- gecis suresi 0, yani hemen normale.
  if (komut(oyuncu, "playanimation @s animation.humanoid.move a 0")) {
    yapilan.push("poz");
  }

  // 5. OLUMSUZ EFEKTLER -- adi yazili olanlar, hepsi degil.
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
  komut(oyuncu, "inputpermission set @s movement enabled");
  komut(oyuncu, "inputpermission set @s camera enabled");
  komut(oyuncu, "camera @s clear");
  komut(oyuncu, "camerashake stop @s");
  komut(oyuncu, "playanimation @s animation.humanoid.move a 0");
  for (const ad of ARIN_EFEKTLER) {
    try {
      if (typeof oyuncu.getEffect === "function" && !oyuncu.getEffect(ad)) {
        continue;
      }
      oyuncu.removeEffect(ad);
    } catch (e) { /* onemsiz */ }
  }
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
        try {
          actionbarYaz(oyuncu, "§a◈ Savunma kipi açık", true);
        } catch (e) { /* actionbar onemsiz */ }
        return false;
      },
      bitir() {
        savunmada.delete(oyuncu.id);
        try {
          oyuncu.sendMessage("§7Savunma kipi kapandı.");
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
