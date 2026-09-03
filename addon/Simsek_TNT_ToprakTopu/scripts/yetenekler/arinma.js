import { system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi } from "../yardimcilar.js";
import {
  ARIN_ACIK, ARIN_BEKLEME, ARIN_SIRA, ARIN_EFEKTLER
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

export function arinmaUnut(oyuncuId) {
  if (oyuncuId === undefined) sonArinma.clear();
  else sonArinma.delete(oyuncuId);
}

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
