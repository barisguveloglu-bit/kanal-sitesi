import { yetenekKaydet } from "./kayit.js";
import { hataYaz, kollariIndir, actionbarYaz } from "../yardimcilar.js";
import { kalpSifirla } from "./_kalp_defteri.js";

/* KALPLERI SIFIRLA -- eklenen butun kalpleri geri alir.

   NEDEN VAR: kalici bir guc geri alinamiyorsa oyunu bozar.
   Referans modlarda "health_boost 100000 255" tek yon: bir kez
   alinca 256 kalple dolasmak zorundasin, sut icmek disinda
   cikis yok -- o da butun efektleri birden siliyor.

   Buradan sonra normal 10 kalbe donuyorsun ve canin dolu
   basliyor. Kalp defterinden de dusuyor, yani cikip girince
   geri gelmiyor.                                                */
yetenekKaydet({
  kimlik: "kalp_sifirla",
  ad: "Kalpleri Sifirla",
  esyasiz: true,
  sira: 190,

  olustur(oyuncu) {
    let silinen = 0;
    try {
      silinen = kalpSifirla(oyuncu);
    } catch (e) {
      hataYaz("kalp_sifirla", e);
    }

    actionbarYaz(oyuncu, silinen > 0
      ? "§8" + silinen + " ek kalp silindi §7· normal 10 kalp"
      : "§eEklenmis kalbin yok.");

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
