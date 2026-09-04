import { yetenekKaydet } from "./kayit.js";
import { hataYaz, gecerliMi, kollariIndir } from "../yardimcilar.js";
import {
  POZ_ACIK, POZ_DENEME, POZ_LISTESI, POZ_BITIS
} from "../ayarlar.js";

/* POZ SANDIGI -- kullanicinin gonderdigi playanimation
   listesinden 39 poz.

   Listenin alti bizde ZATEN vardi ve hepsi gercekten
   kullaniliyor: player.sleeping ve agent.move (Will Kilici),
   zombie.attack_bare_hand (kol kaldirma), fox.sleep
   (Yamultma), evoker.general (Dondur), villager.get_in_bed
   (Bedeni Bol). Onlar tekrar eklenmedi.

   ---- IKI YETENEK, CUNKU CIKIS YOLU SART ----
   "Poz Ver"  : listedeki bir sonraki pozu verir
   "Pozu Birak": normale doner
   Ikincisi susleme degil GUVENLIK: kalici poz (gecis suresi
   9999) kendiliginden bitmez. Ciksi olmayan bir poz, kaynak
   modun Yamultma'sindaki hatanin aynisi olurdu -- oyuncu
   bolunmus/yatmis halde kalir.

   ---- LISTE DOGRULANMADI ----
   Vanilla animasyon kimlik listesi bu depoda yok ve Bedrock
   bilinmeyen bir kimlige sessizce hicbir sey yapmiyor. O
   yuzden POZ_DENEME acikken her pozun ADI VE SIRASI sohbete
   yaziliyor: oynamayan varsa kullanici gorup soyluyor,
   listeden siliniyor. "Calisiyor" diye sunulmuyor.          */

// oyuncuId -> listedeki son gosterilen indeks
const sonPoz = new Map();

/* Oyuncu cikinca defterden dussun. main.js'in playerLeave
   blogu bunu cagiriyor; sizinti.mjs oyuncu anahtarli her
   defter icin bunu ariyor.                                  */
export function pozUnut(oyuncuId) {
  if (oyuncuId === undefined) sonPoz.clear();
  else sonPoz.delete(oyuncuId);
}

function pozVer(oyuncu, anim) {
  try {
    if (typeof oyuncu.runCommand !== "function") return false;
    oyuncu.runCommand("playanimation @s " + anim);
    return true;
  } catch (e) {
    hataYaz("pozlar.playanimation", e);
    return false;
  }
}

yetenekKaydet({
  kimlik: "poz_ver",
  ad: "Poz Ver",
  esyasiz: true,
  sira: 152,

  olustur(oyuncu) {
    if (!POZ_ACIK || POZ_LISTESI.length === 0) return undefined;
    if (!gecerliMi(oyuncu)) return undefined;

    const onceki = sonPoz.get(oyuncu.id);
    const i = onceki === undefined ? 0 : (onceki + 1) % POZ_LISTESI.length;
    const [kimlik, ad] = POZ_LISTESI[i];

    if (pozVer(oyuncu, kimlik + " a 9999")) {
      sonPoz.set(oyuncu.id, i);
      try {
        oyuncu.sendMessage(POZ_DENEME
          ? "§b" + (i + 1) + "/" + POZ_LISTESI.length + " §f" + ad +
            " §8" + kimlik
          : "§b" + ad);
      } catch (e) {
        hataYaz("pozlar.sendMessage", e);
      }
    }

    /* ---- kollariIndir BURADA CAGRILMIYOR ----
       Cagriliyordu ve TEST YAKALADI: kollariIndir kendisi de
       bir playanimation (kol indirme pozu). Pozu verdikten
       hemen sonra cagirilinca pozun USTUNE yaziyor ve poz bir
       tik sonra kayboluyordu -- oyunda "hicbir sey olmuyor"
       gibi gorunurdu.

       Yamultma'da ayni cagri sorun cikarmiyor, cunku orada
       poz HEDEFE veriliyor, kollariIndir ise OYUNCUYA. Burada
       ikisi de ayni oyuncu.                                  */
    return undefined;          // anlik yetenek
  }
});

yetenekKaydet({
  kimlik: "poz_birak",
  ad: "Pozu Bırak",
  esyasiz: true,
  sira: 153,

  olustur(oyuncu) {
    if (!POZ_ACIK) return undefined;
    if (!gecerliMi(oyuncu)) return undefined;

    /* Sayac SIFIRLANMIYOR, siliniyor: bir dahaki "Poz Ver"
       listenin basindan baslasin. Kaldigi yerden devam etseydi
       cikip tekrar girmek listeyi karistirirdi.              */
    sonPoz.delete(oyuncu.id);
    pozVer(oyuncu, POZ_BITIS);
    try {
      oyuncu.sendMessage("§7Poz bırakıldı.");
    } catch (e) {
      hataYaz("pozlar.birak.sendMessage", e);
    }
    kollariIndir(oyuncu);
    return undefined;
  }
});
