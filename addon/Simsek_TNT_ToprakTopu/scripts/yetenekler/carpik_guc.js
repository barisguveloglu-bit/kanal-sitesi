import { kilikKimligi } from "./donusum.js";
import { CARPIK_KILIK_KIMLIK, CARPIK_GUC_CARPANI, CARPIK_GUC_YETENEKLER }
  from "../ayarlar.js";

/* ÇARPIK HAL'İN GÜCÜ                                      v7.68

   Kullanici: "daha guclu bir haliyse... o forma gectigim zaman
   kollar normalden iki kat daha guclu olsun, mesela guclu TNT
   var ya, onun iki katini dusun."

   ---- NEDEN TEK YERDE ----
   Carpani her yetenegin icine ayri ayri yazmak kolaydi. Yazsaydik
   bir gun biri 2'yi 3 yapar, otekiler 2'de kalir ve "iki kat"
   diye bir sey kalmazdi. Kural burada, tek satirda.

   ---- NEDEN LISTE VAR, HERKESE UYGULANMIYOR ----
   "Butun yetenekler iki kat" demek olculemeyen bir vaat: 222
   yetenegin cogunun sayisal bir "gucu" yok (menu acan, kilik
   giren, esya veren...). Carpan YALNIZ patlama gucu olan dort
   yetenege uygulaniyor ve hangileri oldugu ayarlar.js'te ADIYLA
   yazili. Boylece "hangisi iki kat" sorusunun cevabi var.

   Liste buyutulebilir; buyuten kisi ayarlar.js'teki tek satiri
   uzatir ve testteki sayi kendiliginden onu okur.

   ---- BUTCEYE DOKUNMUYOR ----
   Degisen sey patlamanin GUCU, SAYISI degil. patlamaIste() yine
   ayni sayida patlama istiyor, yani v7.62'de konan butce kapisi
   aynen gecerli. Ikiye katlanan tek sey yaricap.               */

export function carpiktaMi(oyuncuId) {
  try {
    return kilikKimligi(oyuncuId) === CARPIK_KILIK_KIMLIK;
  } catch (e) {
    return false;      // defter okunamadi: guc VERME, kapiyi acma
  }
}

/* Yetenek carpik formdayken guclendirilmeli mi.
   Kimlik listede degilse carpan UYGULANMAZ -- sessizce
   herkesi guclendirmek "hangisi iki kat" sorusunu cevapsiz
   birakirdi.                                                  */
export function carpikGuc(oyuncuId, kimlik, deger) {
  if (typeof deger !== "number" || !isFinite(deger)) return deger;
  if (CARPIK_GUC_YETENEKLER.indexOf(kimlik) < 0) return deger;
  if (!carpiktaMi(oyuncuId)) return deger;
  return deger * CARPIK_GUC_CARPANI;
}
