import { yetenekKaydet } from "./kayit.js";
import { hataYaz, kollariIndir, parcacikAt } from "../yardimcilar.js";
import { kalpEkle, kalpAl } from "./_kalp_defteri.js";
import { KALP_ADIM, KALP_TAVAN, PARCACIK_IYILES } from "../ayarlar.js";

/* KALP EKLE -- kalp SAYISINI kalici olarak buyutur.

   can_verme ile karistirma:
     can_verme  bos kalpleri doldurur  (iyilestirme, gecici)
     kalp_ekle  yeni kalp ekler        (kalici, birikir)

   Her kullanimda KALP_ADIM (10) kalp, KALP_TAVAN'a (100) kadar.
   Normal 10 kalp de sayilinca en fazla 110 kalple dolasirsin.

   ---- REFERANSTA NASILDI ----
   Iksir modlarinin hepsinde ayni tek satir vardi:
     effect @s health_boost 100000 255
   Uc sorun:
     1. 255 seviye = +512 can. Can bari ekrana sigmiyor.
     2. 100000 tick ~83 dakika ama GERI ALINAMIYOR; sut icmek
        disinda cikis yok, o da butun efektleri siliyor.
     3. Olunce efekt gidiyor, kalpler kayboluyor ve geri
        gelmiyor -- yani "kalici" da degil.

   Bizde kalp sayisi bir DEFTERDE. Efekt sadece defterin
   goruntusu; olsen de, cikip girsen de, sut icsen de defter
   duruyor ve kalpler geri geliyor. Iptali de var:
   "Kalpleri sifirla" (kalp_sifirla).                           */
yetenekKaydet({
  kimlik: "kalp_ekle",
  ad: "Kalp Ekle",
  esyasiz: true,
  sira: 110,

  olustur(oyuncu) {
    let sonuc;
    try {
      sonuc = kalpEkle(oyuncu, KALP_ADIM);
    } catch (e) {
      hataYaz("kalp_ekle", e);
      return undefined;
    }

    try {
      parcacikAt(oyuncu.dimension, PARCACIK_IYILES, oyuncu.location);
    } catch (e) {
      hataYaz("kalp_ekle.parcacik", e);
    }

    try {
      if (sonuc.eklenen > 0) {
        oyuncu.sendMessage(
          "§c❤ +" + sonuc.eklenen + " kalp §7(toplam " +
          (10 + sonuc.toplam) + " kalp · " + sonuc.toplam + " ek)" +
          (sonuc.tavanaCarpti ? " §8· tavan" : "")
        );
      } else {
        oyuncu.sendMessage(
          "§eTavandasin: " + KALP_TAVAN + " ek kalp (toplam " +
          (10 + kalpAl(oyuncu.id)) + "). §7Daha fazlasi icin " +
          "ayarlar.js'teki KALP_TAVAN'i yukselt."
        );
      }
    } catch (e) {
      hataYaz("kalp_ekle.sendMessage", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek, surekli is yok
  }
});
