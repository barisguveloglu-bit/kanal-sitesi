import { bilgiYaz } from "../yardimcilar.js";

/* ============================================================
   YETENEK KAYIT DEFTERI

   Yeni yetenek eklemek icin:
     1. yetenekler/ altina bir dosya ac
     2. Icinde yetenekKaydet({...}) cagir
     3. main.js'in en ustundeki import listesine bir satir ekle

   Ucuncu adim kacinilmaz: Bedrock'ta klasor tarama yok, her
   dosyanin bir kez import edilmesi gerekiyor.

   TANIM ALANLARI:
     kimlik   (zorunlu) benzersiz kisa ad, orn. "toprak_topu"
     ad       (zorunlu) oyuncuya gosterilen Turkce ad
     esya     (istege bagli) bu esya kullanilinca tetiklenir
     esyasiz  (istege bagli) esyasiz jest sirasina girsin mi
     sira     (istege bagli) jest sirasindaki yeri, kucukten buyuge
     olustur(oyuncu) (zorunlu)
              Calisacak "is" nesnesini dondurur, veya bir sey
              yapilmayacaksa undefined.

   IS NESNESI:
     ad        gunlukte gorunecek isim
     oyuncuId  hangi oyuncuya ait
     calis()   her tick cagrilir; true donerse is biter
     bitir()   is bitince bir kez cagrilir (temizlik)
   ============================================================ */

const kayitlar = new Map();      // kimlik -> tanim
const esyaHaritasi = new Map();  // esya tipi -> tanim

export function yetenekKaydet(tanim) {
  if (!tanim || !tanim.kimlik) {
    bilgiYaz("UYARI: kimliksiz yetenek kaydi atlandi.");
    return;
  }
  if (typeof tanim.olustur !== "function") {
    bilgiYaz("UYARI: " + tanim.kimlik + " icin olustur() yok, atlandi.");
    return;
  }
  if (kayitlar.has(tanim.kimlik)) {
    bilgiYaz("UYARI: " + tanim.kimlik + " zaten kayitli, ustune yazilmadi.");
    return;
  }

  kayitlar.set(tanim.kimlik, tanim);

  if (tanim.esya) {
    if (esyaHaritasi.has(tanim.esya)) {
      bilgiYaz("UYARI: " + tanim.esya + " birden fazla yetenege bagli. " +
               "Ilki (" + esyaHaritasi.get(tanim.esya).kimlik + ") gecerli.");
    } else {
      esyaHaritasi.set(tanim.esya, tanim);
    }
  }
}

export function yetenekAl(kimlik) {
  return kayitlar.get(kimlik);
}

export function esyaninYetenegi(esyaTipi) {
  return esyaHaritasi.get(esyaTipi);
}

export function tumYetenekler() {
  return Array.from(kayitlar.values());
}

/* Esyasiz jest sirasinda gosterilecek yetenekler, sirali. */
export function esyasizSira() {
  return tumYetenekler()
    .filter((t) => t.esyasiz)
    .sort((a, b) => (a.sira || 0) - (b.sira || 0));
}
