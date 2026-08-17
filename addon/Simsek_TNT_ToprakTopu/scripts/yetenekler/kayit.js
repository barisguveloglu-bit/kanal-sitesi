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
const esyaHaritasi = new Map();  // esya tipi -> [tanim, ...]

/* Bir esya BIRDEN FAZLA yetenek tasiyabilir. Toprak Kol boyle:
   tek esya, icinde bes yetenek, aralarinda jestle geciliyor.
   Tek yetenekli kollar da ayni yapiyi kullaniyor, sadece listede
   bir eleman var -- iki ayri kod yolu olmasin.                   */
function esyayaEkle(esyaTipi, tanim) {
  const liste = esyaHaritasi.get(esyaTipi);
  if (!liste) {
    esyaHaritasi.set(esyaTipi, [tanim]);
    return true;
  }
  if (liste.indexOf(tanim) !== -1) return false;
  liste.push(tanim);
  return true;
}

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

  if (tanim.esya) esyayaEkle(tanim.esya, tanim);
}

/* Var olan bir yetenege EK bir tetikleyici esya baglar.
   Kol esyalari boyle baglaniyor: yetenek dosyasina dokunmadan
   ayni yetenege ikinci bir esya eklenebiliyor.

   Ayni esyaya birden fazla kez cagrilirsa yetenekler o esyanin
   listesine SIRAYLA eklenir; kol ustunde jestle aralarinda
   gecilir.                                                       */
export function esyaBagla(esyaTipi, kimlik) {
  const tanim = kayitlar.get(kimlik);
  if (!tanim) {
    bilgiYaz("UYARI: esyaBagla -> bilinmeyen yetenek: " + kimlik);
    return false;
  }
  if (!esyayaEkle(esyaTipi, tanim)) {
    bilgiYaz("UYARI: " + esyaTipi + " -> " + kimlik + " zaten bagli, atlandi.");
    return false;
  }
  return true;
}

export function yetenekAl(kimlik) {
  return kayitlar.get(kimlik);
}

/* Esyanin TASIDIGI yetenekler, bagladigi sirada. Tek yetenekli
   kollarda tek elemanli dizi doner.                              */
export function esyaninYetenekleri(esyaTipi) {
  return esyaHaritasi.get(esyaTipi);
}

/* Esyanin ILK yetenegi. Cok yetenekli kollarda "hangisi secili"
   sorusunun cevabi degil -- onu main.js'teki secim tutuyor.      */
export function esyaninYetenegi(esyaTipi) {
  const liste = esyaHaritasi.get(esyaTipi);
  return liste ? liste[0] : undefined;
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
