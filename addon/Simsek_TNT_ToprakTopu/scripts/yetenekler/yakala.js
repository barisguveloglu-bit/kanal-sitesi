import { world, system } from "@minecraft/server";
import { yetenekKaydet } from "./kayit.js";
import {
  hataYaz, bilgiYaz, gecerliMi, kollariIndir, kilitliHedef, varlikKonumu,
  actionbarYaz, hedefBul, parcacikAt
} from "../yardimcilar.js";
import {
  YAKALA_MENZIL, YAKALA_ACI, YAKALA_BIRAK_MENZIL, YAKALA_YASAK,
  YAKALA_KAYIT_ANAHTAR, YAKALA_PARCACIK
} from "../ayarlar.js";

/* YAKALA / BIRAK -- mobu tutup cebine atarsin, sonra baktigin
   yere birakirsin.

   Fikir Boralo Mod V2'deki "Mob Picker"dan. Adi Mob Picker ama
   ISIN GARIBI: kodu sadece OYUNCU yakaliyor (getNearestPlayer),
   moba hic dokunmuyor. Yani adiyla yaptigi is tutmuyor.

   REFERANSTAKI HATALAR

   1. Kurbani 200 blok yukari isinlayip 5 tick'te bir ORAYA GERI
      isinliyordu. Yani tutsak, dunya boyunca surekli isinlanan
      bir varliktI. Burada varlik kaydedilip DUNYADAN ALINIYOR;
      tutarken hicbir tick maliyeti yok.

   2. Yakalayan oyuncu cikarsa temizlik hic calismiyordu: interval
      donmeye devam ediyor ve kurban sonsuza kadar yukarida
      kaliyordu. Burada tutulan sey bir kayit; oyuncu ciksa da
      birakilabiliyor, dunya yeniden yuklense de duruyor.

   3. victim.isValid() -- yeni API'de isValid bir OZELLIK, metot
      degil. Ayni pakette iceman_staff.js dogru kullaniyor
      (player.isValid), mobpicker.js yanlis. Burada gecerliMi()
      ikisini de destekliyor.

   4. Oyuncu yakalamak, kacisi olmayan bir hapis demek. Burada
      oyuncu yakalanmiyor; YAKALA_YASAK listesi de bosslari ve
      esya/mermi turlerini disarida tutuyor.

   NE KAYBOLUYOR: varlik dunyadan alinip TURU kaydediliyor, yani
   birakinca yeni bir tane doguyor. Evcillestirilmis kurdunun
   sahipligi, sandigin icindekiler gibi ayrintilar korunmuyor.
   Kisisel bir mod icin kabul edilebilir; NBT kopyalama Script
   API'de yok.                                                    */

/* oyuncuId -> { tip, ad, boyutId } */
const cepler = new Map();

let kaliciDestek;

function kaliciMi() {
  if (kaliciDestek === undefined) {
    kaliciDestek = (typeof world.setDynamicProperty === "function") &&
                   (typeof world.getDynamicProperty === "function");
    if (!kaliciDestek) {
      bilgiYaz("UYARI: dunya ozellikleri yok. Yakalanan mob kaydedilemiyor; " +
               "dunyadan cikip girersen cebindeki mob unutulur.");
    }
  }
  return kaliciDestek;
}

function yaz() {
  if (!kaliciMi()) return;
  try {
    const dizi = [];
    for (const [oyuncuId, k] of cepler) dizi.push([oyuncuId, k.tip, k.ad || ""]);
    world.setDynamicProperty(YAKALA_KAYIT_ANAHTAR,
                             dizi.length === 0 ? undefined : JSON.stringify(dizi));
  } catch (e) {
    hataYaz("yakala.yaz", e);
  }
}

let okundu = false;

function oku() {
  if (okundu) return;
  okundu = true;
  if (!kaliciMi()) return;
  try {
    const ham = world.getDynamicProperty(YAKALA_KAYIT_ANAHTAR);
    if (typeof ham !== "string" || ham.length === 0) return;
    const dizi = JSON.parse(ham);
    if (!Array.isArray(dizi)) return;
    for (const satir of dizi) {
      if (!Array.isArray(satir) || satir.length < 2) continue;
      cepler.set(satir[0], { tip: satir[1], ad: satir[2] || "" });
    }
  } catch (e) {
    hataYaz("yakala.oku", e);
  }
}

function kisaAd(tip) {
  const i = tip.indexOf(":");
  return i === -1 ? tip : tip.slice(i + 1);
}

yetenekKaydet({
  kimlik: "yakala",
  ad: "Yakala / Birak",
  esyasiz: true,
  sira: 190,

  olustur(oyuncu) {
    oku();
    const oyuncuId = oyuncu.id;
    const boyut = oyuncu.dimension;

    /* Cepte mob VARSA birak, YOKSA yakala. Hapisteki ile ayni
       mantik: tek yetenek, duruma gore iki is.                  */
    const cepte = cepler.get(oyuncuId);
    if (cepte) return birak(oyuncu, boyut, oyuncuId, cepte);

    const hedef = kilitliHedef(oyuncu, {
      menzil: YAKALA_MENZIL, aci: YAKALA_ACI
    });

    if (!hedef) {
      actionbarYaz(oyuncu, "§7Yakalanacak bir sey yok §8(cebin de bos)");
      kollariIndir(oyuncu);
      return undefined;
    }

    let tip;
    try {
      tip = hedef.typeId || "";
    } catch (e) {
      kollariIndir(oyuncu);
      return undefined;
    }

    /* Oyuncu yakalanmiyor -- referansin TEK yaptigi seydi ve
       kacisi olmayan bir hapis demekti.                        */
    if (tip === "minecraft:player") {
      actionbarYaz(oyuncu, "§cOyuncu yakalanamaz");
      kollariIndir(oyuncu);
      return undefined;
    }
    if (YAKALA_YASAK.indexOf(tip) !== -1) {
      actionbarYaz(oyuncu, "§c" + kisaAd(tip) + " yakalanamaz");
      kollariIndir(oyuncu);
      return undefined;
    }

    const k = varlikKonumu(hedef);
    if (!k) {
      kollariIndir(oyuncu);
      return undefined;
    }

    let ad = "";
    try {
      ad = hedef.nameTag || "";
    } catch (e) {
      // nameTag her varlikta yok; onemsiz
    }

    try {
      parcacikAt(boyut, YAKALA_PARCACIK, k);
      hedef.remove();
    } catch (e) {
      hataYaz("yakala.remove", e);
      actionbarYaz(oyuncu, "§cYakalanamadi");
      kollariIndir(oyuncu);
      return undefined;
    }

    cepler.set(oyuncuId, { tip, ad });
    yaz();

    actionbarYaz(oyuncu, "§a✋ §f" + (ad || kisaAd(tip)) + " §7cebe girdi " +
                 "§8(birakmak icin tekrar calistir)");
    kollariIndir(oyuncu);
    return undefined;   // anlik is, tick tutmuyor
  }
});

function birak(oyuncu, boyut, oyuncuId, cepte) {
  /* Baktigin yere birak; bakis bosluktaysa hedefBul zaten
     menzilin ucundaki noktayi veriyor.                        */
  const nokta = hedefBul(oyuncu, YAKALA_BIRAK_MENZIL);
  if (!nokta) {
    actionbarYaz(oyuncu, "§cBirakilacak yer bulunamadi");
    kollariIndir(oyuncu);
    return undefined;
  }

  try {
    const yeni = boyut.spawnEntity(cepte.tip, nokta);
    if (cepte.ad && yeni) {
      try {
        yeni.nameTag = cepte.ad;
      } catch (e) {
        // nameTag yazilamadi; onemsiz
      }
    }
    parcacikAt(boyut, YAKALA_PARCACIK, nokta);
  } catch (e) {
    /* Dogurulamadiysa cepten SILME -- yoksa mob buharlasirdi.
       Sebebi genelde yuklenmemis chunk ya da gecersiz tur.    */
    hataYaz("yakala.spawnEntity", e);
    actionbarYaz(oyuncu, "§cBirakilamadi, cebinde duruyor");
    kollariIndir(oyuncu);
    return undefined;
  }

  cepler.delete(oyuncuId);
  yaz();

  actionbarYaz(oyuncu, "§e✋ §f" + (cepte.ad || kisaAd(cepte.tip)) + " §7birakildi");
  kollariIndir(oyuncu);
  return undefined;
}

/* Oyuncu cikinca kayit SILINMIYOR: cebindeki mob geri gelince
   birakilabilsin diye. Sadece bellekteki okuma bayragi testler
   icin sifirlanabiliyor.                                      */
export function ceptekiSayisi(oyuncuId) {
  oku();
  return cepler.has(oyuncuId) ? 1 : 0;
}

export function cepleriUnut() {
  cepler.clear();
  okundu = false;
}
