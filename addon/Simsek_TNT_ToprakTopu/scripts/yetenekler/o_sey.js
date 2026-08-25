import { yetenekKaydet } from "./kayit.js";
import { hataYaz, kollariIndir, actionbarYaz } from "../yardimcilar.js";
import { botCagir, botVarliklari } from "./_bot_defteri.js";
import {
  SEY_ACIK, SEY_KIMLIK, SEY_AD, SEY_TAVAN, SEY_CAN, SEY_HASAR, BOT_TAVAN
} from "../ayarlar.js";

/* ================================================================
   O SEY  ("That Thing")                                    v4.88

   Kullanicinin istegi: "6 tane kolu var bir tane daha bedeni var
   ... kendi skinimize gore detaylica bir arastirma yap."

   Bu dosya SADECE cagirmayi yapiyor. Govde, takip, bekle, savas,
   canta -- hepsi pa:bot'un altyapisindan geliyor, cunku O Sey de
   botCagir ile doguyor. Ilkel Besli'de calisan yolun aynisi;
   yeni bir defter yazilmadi.

   YENI KOL YAPILMADI. Kullanicinin kurali acik: "her seyi kol
   yapma, kol israfini onle". Menude tek satir, o kadar.
   ================================================================ */

/* Oyuncunun yaninda kac tane O Sey var? Defterden sayiliyor;
   ayri bir kayit tutulmuyor ki dunya kaydi bicimi degismesin
   (v4.27 dersi: kayit bicimi degisince eski dunyalar okunamaz). */
export function seySayisi(oyuncuId) {
  let n = 0;
  for (const { varlik } of botVarliklari(oyuncuId)) {
    try {
      if (varlik.typeId === SEY_KIMLIK) n++;
    } catch (e) {
      /* varlik chunk disinda kaldi: sayma, hata da verme */
    }
  }
  return n;
}

/* Donen deger: {hata} ya da {dogdu}. */
export function seyCagir(oyuncu) {
  if (!SEY_ACIK) return { hata: SEY_AD + " kapalı (SEY_ACIK)." };

  const mevcut = seySayisi(oyuncu.id);
  if (mevcut >= SEY_TAVAN) {
    return { hata: SEY_AD + " zaten yanında (" + mevcut + "/" + SEY_TAVAN + ")." };
  }

  const sonuc = botCagir(oyuncu, SEY_KIMLIK);
  if (sonuc.hata) return sonuc;

  /* DIKKAT: botCagir'in "tavan" alani iki anlamda kullaniliyor
     (basarida sayi, tavan dolunca bayrak). Dogru sinama DOGDU --
     bu tuzak ilkelCagir'da bir kez yasandi.                    */
  if (!sonuc.dogdu) {
    return { hata: "Bot tavanındasın (" + BOT_TAVAN + "). Önce birkaçını geri gönder." };
  }
  return { dogdu: true };
}

yetenekKaydet({
  kimlik: "o_sey",
  ad: "O Şey",
  esyasiz: true,
  sira: 249,          // Ilkel Besli'nin (248) hemen ardindan

  olustur(oyuncu) {
    let sonuc;
    try {
      sonuc = seyCagir(oyuncu);
    } catch (e) {
      hataYaz("o_sey", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      if (sonuc.hata) {
        oyuncu.sendMessage("§c" + sonuc.hata);
      } else {
        oyuncu.sendMessage(
          "§8☗ §f" + SEY_AD + "§7 yanında. §8" + (SEY_CAN / 2) + " kalp · " +
          (SEY_HASAR / 2) + " kalp vuruş\n" +
          "§7Altı kolu ve iki bedeni var. §8Dokun → menü."
        );
      }
    } catch (e) {
      hataYaz("o_sey.mesaj", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
