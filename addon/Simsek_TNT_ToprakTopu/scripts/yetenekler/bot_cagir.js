import { yetenekKaydet } from "./kayit.js";
import { hataYaz, kollariIndir, actionbarYaz } from "../yardimcilar.js";
import { botCagir } from "./_bot_defteri.js";

/* BOT CAGIR -- botu dogurur, zaten varsa yanina getirir.

   Asama 1 kapsaminda bot sadece VAR OLUYOR, TAKIP EDIYOR ve
   BEKLIYOR. Odun toplama / maden kazma sonraki asama.

   Yeni bir KOL yapilmadi: kullanicinin kurali "her seyi kol
   yapma". Bot sohbetten yonetiliyor ("bot", "bot bekle",
   "bot takip", "bot geri") ve bota dokununca menu aciliyor.
   Bu yetenek jest sirasinda da duruyor, yani sohbet olayi
   olmayan bir surumde de ulasilabilir.                        */
yetenekKaydet({
  kimlik: "bot_cagir",
  ad: "Bot Cagir",
  esyasiz: true,
  sira: 230,

  olustur(oyuncu) {
    let sonuc;
    try {
      sonuc = botCagir(oyuncu);
    } catch (e) {
      hataYaz("bot_cagir", e);
      kollariIndir(oyuncu);
      return undefined;
    }

    try {
      if (sonuc && sonuc.hata) {
        oyuncu.sendMessage("§c" + sonuc.hata);
      } else if (sonuc && sonuc.dogdu) {
        oyuncu.sendMessage(
          "§aBot geldi. §7Dokun -> menu · sohbete §fbot bekle§7 / " +
          "§fbot takip§7 / §fbot geri" +
          (sonuc.evcil ? "" : " §8· (script takibi)")
        );
      } else {
        actionbarYaz(oyuncu, "§aBot yanina getirildi");
      }
    } catch (e) {
      hataYaz("bot_cagir.mesaj", e);
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
