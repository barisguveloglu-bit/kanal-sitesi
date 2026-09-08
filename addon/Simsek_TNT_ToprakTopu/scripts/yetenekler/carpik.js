import { yetenekKaydet } from "./kayit.js";
import { hataYaz, actionbarYaz, kollariIndir } from "../yardimcilar.js";
import { donus, kilikKimligi } from "./donusum.js";
import {
  CARPIK_ACIK, CARPIK_KILIK_KIMLIK, CARPIK_AD, CARPIK_SIRA
} from "../ayarlar.js";

/* ================================================================
   ÇARPIK HAL                                              v7.67

   Kullanici: "benim skinin renklerini tam terse cevirelim, tam
   tersi cevirdikten sonra bir tane siritis ekleyelim, yeni bir
   form oldugu icin boyle yapmak istedim." Titremenin siddetini
   de bize birakti.

   ---- BU DOSYA NE YAPMIYOR ----
   Hizalama, temizlik, kalicilik, gorunmezlik, cikis: HICBIRI
   burada degil. Hepsi donusum.js'te ve o dosya v7.67'de tek bir
   parametre aldi (kilik kimligi). Kopyalanmadi -- kopyalansaydi
   bir gun biri duzeltilir, oteki geride kalirdi.

   ---- ARASTIRMA ----
   Minecraft CreepyPasta Wiki'nin "Distorted Alex" sayfasi ve
   Turkce cevirisi okundu (wiki API'sinden ham metin; sayfalar
   WebFetch'e 402 veriyor). Tamami LORE.md EK-A'da.

   Kaynakta varligin tarifi TEK CUMLE: varsayilan Alex skini,
   uzerinde buyuk ve carpik bir siritis. Devasa degil, kosmuyor,
   saldirmiyor, KONUSMUYOR. O yuzden bu form da bagirmiyor,
   parcacik patlatmiyor, hasar vermiyor: sadece gorunuyor.

   ---- NEDEN GUC VERMIYOR ----
   Bu bir GORUNUM formu. Guc verseydi "Carpik Hal'e gec, daha
   cok vur" olurdu ve dovus dengesine girerdi; kullanicinin
   istedigi sey bu degil.                                     */

yetenekKaydet({
  kimlik: "carpik",
  ad: CARPIK_AD,
  esyasiz: true,
  sira: CARPIK_SIRA,

  olustur(oyuncu) {
    if (!CARPIK_ACIK) {
      actionbarYaz(oyuncu, "§7Çarpık Hal kapalı.");
      kollariIndir(oyuncu);
      return undefined;
    }

    /* ONCEKI KILIGI SORUYORUZ, cikis mesajini dogru secmek
       icin. donus() zaten "kiliktaysan cik" diyor, ama cikinca
       hangi formdan cikildigini bilmiyor.                    */
    const oncekiKilik = kilikKimligi(oyuncu.id);

    let sonuc;
    try {
      sonuc = donus(oyuncu, CARPIK_KILIK_KIMLIK);
    } catch (e) {
      hataYaz("carpik", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    /* sonuc undefined olabilir: butce dolu (varlikIste). Sessiz
       kalmak yerine soyluyoruz -- yoksa "tus calismadi" gibi
       gorunur.                                               */
    if (!sonuc) {
      actionbarYaz(oyuncu, "§7Bütçe dolu, bir tık sonra dene.");
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      if (sonuc.hata) {
        oyuncu.sendMessage("§c" + sonuc.hata);
      } else if (sonuc.donustu) {
        oyuncu.sendMessage(
          "§8☗ §f" + CARPIK_AD + "§7.\n" +
          "§8Renklerin tersi. Yüzünde sırıtış. Beden sürekli titriyor.\n" +
          "§8F5'e bas — kendini gör. Diğer oyuncular da seni böyle görür.\n" +
          "§7Geri dönmek: aynı yetenek."
        );
      } else if (oncekiKilik === CARPIK_KILIK_KIMLIK) {
        actionbarYaz(oyuncu, "§7Kendi haline döndün.");
      } else {
        /* Baska bir kiliktaydi (O Sey) ve bu yetenek onu
           cikardi. Yanlis mesaj vermeyelim.                 */
        actionbarYaz(oyuncu, "§7İnsan haline döndün.");
      }
    } catch (e) {
      hataYaz("carpik.mesaj", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
