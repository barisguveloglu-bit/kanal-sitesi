import { yetenekKaydet } from "./kayit.js";
import { hataYaz, kollariIndir, actionbarYaz } from "../yardimcilar.js";
import { botGeri } from "./_bot_defteri.js";

/* BOT GERI -- botu gonderir (varligi siler, defterden duser).

   NEDEN VAR: bot KALICI bir varlik. Geri gonderilemeyen kalici
   bir sey oyunu bozar -- kalp sisteminde ogrendigimiz ders.
   Bot bir yere sikisirsa, ayak altinda dolasirsa ya da sadece
   canin istemezse tek dokunusla gidiyor.

   Sonra "bot" yazip yenisini cagirabilirsin; bu bir ceza degil,
   sadece temizlik.                                             */
yetenekKaydet({
  kimlik: "bot_geri",
  ad: "Botu Geri Gonder",
  esyasiz: true,
  sira: 235,

  olustur(oyuncu) {
    let silindi = false;
    try {
      silindi = botGeri(oyuncu);
    } catch (e) {
      hataYaz("bot_geri", e);
    }

    actionbarYaz(oyuncu, silindi
      ? "§8Bot geri gonderildi"
      : "§eBotun yok. §7Sohbete 'bot' yaz.");

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
