import { hataYaz, actionbarYaz } from "../yardimcilar.js";
import { SIS_KIMLIK, SIS_KIMLIK_HAFIF, SIS_ETIKET } from "../ayarlar.js";

/* ================================================================
   OZEL SIS: SKININ RENGI                                   v6.6

   Kullanici: "/fog @a push minecraft:fog_hell 12 havayi
   kirmiziya cevirmeye yariyormus; biz bunu benim skinimin
   rengine cevirelim."

   Rengin nereden geldigi kol_uret.py'de yaziyor: skin
   OLCULDU, tahmin edilmedi (#20C5B5, turkuaz).

   ---- NEDEN MENUDEN ----
   Ilk halinde yalnizca kaynak paketteki fogs/*.json vardi ve
   komutu oyuncunun elle yazmasi gerekiyordu. Testin "oksuz
   ayar" denetimi bunu yakaladi: SIS_KIMLIK, SIS_KIMLIK_HAFIF
   ve SIS_ETIKET tanimliydi ama HICBIR yerde okunmuyordu --
   yani ayarlar yalan soyluyordu. Ustelik tablette komut
   yazmak zaten eziyet. Sis artik kol menusunden aciliyor.

   ---- NEDEN runCommand ----
   Script API'sinde sis icin bir cagri YOK; tek yol komut.
   Komut da her surumde ayni yerde olmayabilir diye
   ozellik tespitiyle cagriliyor -- yoksa paket olmuyor,
   yalnizca sis acilmiyor.
   ================================================================ */

/* Etiket (SIS_ETIKET) sis yiginindaki katmanin ADI. Ayni ad
   ile push edip ayni ad ile remove ediyoruz; baska bir
   eklentinin sisini kazara silmemek icin sabit tek bir ad. */
function komut(oyuncu, satir) {
  try {
    if (typeof oyuncu.runCommand === "function") {
      oyuncu.runCommand(satir);
      return true;
    }
  } catch (e) {
    hataYaz("sis.komut", e);
  }
  return false;
}

export function sisAc(oyuncu, hafif = false) {
  const kimlik = hafif ? SIS_KIMLIK_HAFIF : SIS_KIMLIK;
  /* Once eskisini kaldir: iki kez basinca yigin buyumesin. */
  komut(oyuncu, 'fog @s remove "' + SIS_ETIKET + '"');
  const oldu = komut(oyuncu, 'fog @s push ' + kimlik + ' "' + SIS_ETIKET + '"');
  actionbarYaz(oyuncu, oldu
    ? (hafif ? "§b☁ §fSis: hafif" : "§b☁ §fSis: acik")
    : "§7Sis komutu bu surumde yok.");
  return oldu;
}

export function sisKapat(oyuncu) {
  const oldu = komut(oyuncu, 'fog @s remove "' + SIS_ETIKET + '"');
  actionbarYaz(oyuncu, oldu ? "§8☁ Sis kapandi" : "§7Sis komutu bu surumde yok.");
  return oldu;
}
