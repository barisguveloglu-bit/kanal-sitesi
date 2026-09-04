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

/* ============================================================
   IKSIR KAYIT DEFTERI

   Iksirler yeteneklerle AYNI mantikla kaydediliyor: kendi
   dosyasinda tanimlanip buraya yaziliyor, main.js sadece bir
   import satiri goruyor. Fark sadece tetiklenme bicimi --
   yetenek "kullaninca", iksir "icip BITIRINCE" calisiyor.

   TANIM ALANLARI:
     kimlik   (zorunlu) benzersiz kisa ad, orn. "nitroksin"
     ad       (zorunlu) oyuncuya gosterilen Turkce ad
     esya     (zorunlu) icilecek esya tipi
     sure     (zorunlu) kac tick surecek
     efektler (zorunlu) [[efektAdi, seviye], ...]
     goz      (istege bagli) kafaya takilacak gorunum esyasi
   ============================================================ */

const iksirler = new Map();       // kimlik -> tanim
const iksirEsyasi = new Map();    // esya tipi -> tanim

export function iksirKaydet(tanim) {
  if (!tanim || !tanim.kimlik || !tanim.esya) {
    bilgiYaz("UYARI: kimliksiz/esyasiz iksir kaydi atlandi.");
    return;
  }
  if (!Array.isArray(tanim.efektler) || tanim.efektler.length === 0) {
    bilgiYaz("UYARI: " + tanim.kimlik + " icin efekt listesi yok, atlandi.");
    return;
  }
  if (iksirler.has(tanim.kimlik)) {
    bilgiYaz("UYARI: " + tanim.kimlik + " iksiri zaten kayitli, ustune yazilmadi.");
    return;
  }
  if (iksirEsyasi.has(tanim.esya)) {
    bilgiYaz("UYARI: " + tanim.esya + " zaten baska iksire bagli, atlandi.");
    return;
  }

  iksirler.set(tanim.kimlik, tanim);
  iksirEsyasi.set(tanim.esya, tanim);
}

export function iksirinKademesi(esyaTipi) {
  return iksirEsyasi.get(esyaTipi);
}

export function tumIksirler() {
  return Array.from(iksirler.values());
}

/* Esyasiz jest sirasinda gosterilecek yetenekler, sirali. */
export function esyasizSira() {
  return tumYetenekler()
    .filter((t) => t.esyasiz)
    .sort((a, b) => (a.sira || 0) - (b.sira || 0));
}

/* ---------------- Sira cakismasi denetimi ----------------
   v4.20'de esyasiz sirada ON BIR cift ayni "sira" degerini
   paylasiyordu (110, 130, 140, 150, 160, 170, 180, 190, 200,
   210, 220). Esit degerlerde siralamanin sonucu import sirasina
   kaliyor; yani jest sirasinda hangi yetenegin once gelecegi
   ayarlardan degil, main.js'teki import satirlarinin sirasindan
   belirleniyordu. Yeni bir yetenek eklemek, ilgisiz bir
   yetenegin sirasini kaydirabiliyordu.

   Sessiz kalmasin diye acilista bakiliyor. Cakisma oyunu
   bozmuyor, o yuzden sadece uyari.                             */
export function siraDenetimi() {
  const gorulen = new Map();     // sira -> [ad, ...]
  for (const t of esyasizSira()) {
    const n = t.sira || 0;
    const liste = gorulen.get(n);
    if (liste) liste.push(t.ad);
    else gorulen.set(n, [t.ad]);
  }

  const cakisan = [];
  for (const [n, adlar] of gorulen) {
    if (adlar.length > 1) cakisan.push(n + ": " + adlar.join(" / "));
  }

  if (cakisan.length > 0) {
    bilgiYaz("UYARI: ayni 'sira' degerini paylasan yetenekler var -> " +
             cakisan.join(" · ") + ". Jest sirasi import sirasina kaliyor; " +
             "her yetenege benzersiz bir sira ver.");
  }
  return cakisan;
}
