import { bilgiYaz, hataYaz, actionbarYaz } from "./yardimcilar.js";
import { MENU_ACIK } from "./ayarlar.js";

/* ============================================================
   YETENEK MENUSU  (@minecraft/server-ui)

   Fikir Gunes modundan: esyayi EGILEREK kullaninca menu aciliyor,
   normal kullaninca secili guc calisiyor. Tablette bu, jestle
   tek tek yetenek arasinda dolasmaktan cok daha rahat -- Toprak
   Kol'da sekiz yetenek var, sekizinciye gecmek icin yedi kez
   "egil + yukari bak + bekle" yapmak gerekiyordu.

   REFERANSTAN FARKLAR
   Gunes modunda menu ve durum yonetimi ic ice girmisti:
     - secim Map'i oyuncu ADIYLA anahtarlaniyordu (player.name).
       Ad degisebilir, kimlik degismez; burada durum main.js'te
       ve oyuncu KIMLIGIYLE tutuluyor.
     - menu dosyasi hem arayuz cizip hem komut calistiriyordu.
       Burasi SADECE arayuz: ne secildigini geri bildiriyor,
       secimi kaydetmek ve calistirmak cagiranin isi.

   NEDEN AYRI DOSYA VE OZELLIK TESPITI
   @minecraft/server-ui ayri bir modul. Yoksa ya da surum
   uyusmazsa "import" satiri MODUL BAGLANIRKEN patlar ve paketin
   TAMAMI olur -- kollar da, iksirler de gider. O yuzden burada
   dinamik import kullaniliyor ve basarisiz olursa menu sessizce
   devre disi kaliyor; jestle secim eskisi gibi calismaya devam
   ediyor.
   ============================================================ */

let modul;            // yuklenen @minecraft/server-ui
let denendi = false;
let calisiyor = true; // yuklenene kadar iyimser

/* Modulu bir kez yuklemeyi dene. Ust duzey await Bedrock
   motorunda garantili degil, o yuzden ilk kullanimda.        */
function moduluYukle() {
  if (denendi) return modul;
  denendi = true;
  try {
    /* Statik import degil: yoksa paketi oldurmesin diye.
       import() bir soz donduruyor; sonucu saklaniyor.        */
    import("@minecraft/server-ui").then((m) => {
      modul = m;
      if (!m || typeof m.ActionFormData !== "function") {
        calisiyor = false;
        bilgiYaz("UYARI: @minecraft/server-ui var ama ActionFormData yok. " +
                 "Menu kapali, jestle secim calisiyor.");
      }
    }).catch((e) => {
      calisiyor = false;
      bilgiYaz("@minecraft/server-ui yuklenemedi (" +
               (e && e.message ? e.message : e) + "). Menu kapali; " +
               "yetenek secimi jestle calismaya devam ediyor.");
    });
  } catch (e) {
    calisiyor = false;
    hataYaz("menu.moduluYukle", e);
  }
  return modul;
}

// Paket acilirken yuklemeyi baslat ki ilk kullanimda hazir olsun
if (MENU_ACIK) moduluYukle();

export function menuKullanilabilir() {
  return MENU_ACIK && calisiyor && modul !== undefined;
}

/* Kolun yeteneklerini menu olarak gosterir.

     oyuncu   menuyu gorecek oyuncu
     baslik   menu basligi
     liste    [{kimlik, ad}, ...]
     secili   su an secili indeks (basina isaret konur)
     secildi  (indeks) => void   -- kullanici sectiginde cagrilir

   Menu acilamazsa false doner; cagiran eski yola dusebilir.   */
export function menuAc(oyuncu, baslik, liste, secili, secildi) {
  if (!menuKullanilabilir()) {
    moduluYukle();
    return false;
  }

  try {
    const form = new modul.ActionFormData().title(baslik);

    for (let i = 0; i < liste.length; i++) {
      // Secili olan isaretli: menude nerede oldugunu gormek icin
      form.button((i === secili ? "§a▸ §f" : "§7") + liste[i].ad);
    }

    form.show(oyuncu).then((sonuc) => {
      /* canceled: oyuncu menuyu kapatti. selection undefined
         olabiliyor; ikisi de "secim yok" demek.               */
      if (!sonuc || sonuc.canceled || sonuc.selection === undefined) return;
      if (sonuc.selection < 0 || sonuc.selection >= liste.length) return;
      try {
        secildi(sonuc.selection);
      } catch (e) {
        hataYaz("menu.secildi", e);
      }
    }).catch((e) => {
      /* Oyuncu sohbet/envanter acikken menu gosterilemez; bu
         bir hata degil, sadece haber ver.                     */
      actionbarYaz(oyuncu, "§7Menu acilamadi, once ekrani kapat");
      hataYaz("menu.show", e);
    });

    return true;
  } catch (e) {
    hataYaz("menu.menuAc", e);
    return false;
  }
}
