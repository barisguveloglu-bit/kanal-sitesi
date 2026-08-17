import { yetenekKaydet } from "./kayit.js";
import { hataYaz, actionbarYaz, kollariIndir, sohbeteYaz } from "../yardimcilar.js";
import { YETKILI_ACIK, YETKILI_DUYURU } from "../ayarlar.js";

/* YETKILI MODU -- referanstaki "Admin Olma Esyasi".

   Oradaki fonksiyon iki satirdi:
     op @s
     tellraw @a {"rawtext":[{"text":"ADMİN MOD:Eneblad"}]}

   Iki seyi bilmekte fayda var:

     1. KENDI DUNYANDA ZATEN OPERATORSUN. Dunyayi sen actiysan
        op @s hicbir sey degistirmez. Anlamli oldugu yer sunucu
        ya da Realm.

     2. Tam o yuzden TEHLIKELI: esyayi/yetenegi eline gecirien
        herkes orada operator olur. Referans modda bu, paketi
        kuran herkese aciktı.

   Bu yuzden varsayilan KAPALI. ayarlar.js'te YETKILI_ACIK'i
   true yaparsan calisir.                                       */
yetenekKaydet({
  kimlik: "yetkili",
  ad: "Yetkili Modu",
  esyasiz: true,
  sira: 220,

  olustur(oyuncu) {
    if (!YETKILI_ACIK) {
      actionbarYaz(oyuncu, "§8Yetkili modu kapali §7(ayarlar.js: YETKILI_ACIK)");
      kollariIndir(oyuncu);
      return undefined;
    }

    let oldu = false;
    try {
      const sonuc = oyuncu.runCommand("op @s");
      oldu = !!(sonuc && sonuc.successCount > 0);
    } catch (e) {
      /* Tek oyunculu dunyada zaten operatorsen komut "zaten op"
         diye hata dondurebiliyor -- bu bir basarisizlik degil. */
      hataYaz("yetkili.op", e);
    }

    actionbarYaz(oyuncu, oldu
      ? "§aYetkili modu acildi"
      : "§7Zaten yetkilisin (ya da komut engellendi)");

    if (oldu && YETKILI_DUYURU) {
      sohbeteYaz("§c[SimsekTNT] §f" + (oyuncu.name || "bir oyuncu") +
                 " §7yetkili moduna gecti.");
    }

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
