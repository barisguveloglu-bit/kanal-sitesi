import { yetenekKaydet } from "./kayit.js";
import { hataYaz, kollariIndir, parcacikAt } from "../yardimcilar.js";
import { kalpEkle, kalpAl } from "./_kalp_defteri.js";
import { KALP_TOPTAN, KALP_TAVAN, PARCACIK_IYILES } from "../ayarlar.js";

/* ================================================================
   UZAK AKRABA -- TEK DOKUNUSTA 400 KALP                    v4.88

   Kullanici: "bu skin ekstra olarak 400 kalp eklesin".

   ---- NEDEN SKINE BAGLI DEGIL ----
   Bedrock'ta bir oyuncunun SKININI script OKUYAMIYOR. Ne
   `player.skin` var, ne bir olay. Referans mod bunu Java'da
   MorePlayerModels'in `mpm url @p <skin>` komutuyla yapiyordu;
   Bedrock'ta karsiligi yok (REFERANS_BORALO.md'de "zor ya da
   imkansiz" kovasinda yaziyor).

   Yani "bu skini giyince" diye bir kanca kurulamiyor. Elde
   kalan en yakin sey: skinin ADINI tasiyan tek bir dugme.
   Uzak Akraba skinini giy, menuden bir kez bas, 410 kalple
   dolas. Otomatik degil, ama tek dokunus.

   ---- MEVCUT SISTEMIN USTUNE BINIYOR ----
   Yeni bir can mekanigi YAZILMADI. kalp_ekle ile ayni deftere
   yaziyor, dolayisiyla:
     - kalpler kalici (olsen de, cikip girsen de, sut icsen de)
     - "Kalpleri sifirla" ikisini de geri aliyor
   Tek fark KALP_ADIM (10) yerine KALP_TOPTAN (400) istemesi.
   ================================================================ */
yetenekKaydet({
  kimlik: "kalp_toptan",
  ad: "Uzak Akraba: 400 kalp",
  esyasiz: true,
  sira: 116,          // kalp_ekle'nin (115) hemen ardindan

  olustur(oyuncu) {
    let sonuc;
    try {
      sonuc = kalpEkle(oyuncu, KALP_TOPTAN);
    } catch (e) {
      hataYaz("kalp_toptan", e);
      return undefined;
    }

    try {
      parcacikAt(oyuncu.dimension, PARCACIK_IYILES, oyuncu.location);
    } catch (e) {
      hataYaz("kalp_toptan.parcacik", e);
    }

    try {
      if (sonuc.eklenen > 0) {
        oyuncu.sendMessage(
          "§c❤ §fUzak Akraba§7 · §c+" + sonuc.eklenen + " kalp\n" +
          "§7Toplam §f" + (10 + sonuc.toplam) + " kalp§7 (" +
          sonuc.toplam + " ek · " + ((10 + sonuc.toplam) * 2) + " can)\n" +
          "§8Can barı ekranda satır satır sarılır — bu oyunun sınırı, hata değil.\n" +
          "§8Geri almak: menüde \"Kalpleri sıfırla\"."
        );
      } else {
        oyuncu.sendMessage(
          "§eZaten tavandasın: " + KALP_TAVAN + " ek kalp (toplam " +
          (10 + kalpAl(oyuncu.id)) + ")."
        );
      }
    } catch (e) {
      hataYaz("kalp_toptan.sendMessage", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
