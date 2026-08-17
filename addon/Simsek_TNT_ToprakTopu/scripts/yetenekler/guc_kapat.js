import { yetenekKaydet } from "./kayit.js";
import { kademeBitir } from "./iksirler.js";
import { hataYaz, kollariIndir, actionbarYaz } from "../yardimcilar.js";

/* GUCU KAPAT -- iksir kademesini suresi dolmadan bitirir.

   Referansta "kapama" / "hiper_ozellikler_kapama" fonksiyonlari
   vardi ama sadece ESYALARI temizliyorlardi:
     clear @s pa:hiper_goz_lazer
     clear @s pa:mavi_goz
     clear @s pa:hiper_lazer_ucma
     ...
   Efektler uzerinde kaliyordu. Ustelik goz "item_lock" ile
   kilitli oldugu icin clear'in ise yarayip yaramadigi da belirsiz.

   Bizimki hem efektleri siliyor hem gozu cikariyor hem de
   kayittan dusuyor -- yani gercekten bitiriyor.

   Neden lazim: yuksek kademe iksirler seni cok hizli yapiyor,
   ince is yaparken kapatmak isteyebilirsin. Bir de kademeler
   birikmedigi icin, dusuk kademeye gecmek istersen once bunu
   kullanman gerekmiyor -- yeni iksir zaten eskisini iptal eder.  */
yetenekKaydet({
  kimlik: "guc_kapat",
  ad: "Gucu Kapat",
  esyasiz: true,
  sira: 180,

  olustur(oyuncu) {
    let kademe;
    try {
      kademe = kademeBitir(oyuncu);
    } catch (e) {
      hataYaz("guc_kapat", e);
    }

    actionbarYaz(oyuncu, kademe
      ? "§8" + kademe.ad + " kapatildi"
      : "§eAcik bir iksir yok.");

    kollariIndir(oyuncu);
    return undefined;   // anlik yetenek
  }
});
