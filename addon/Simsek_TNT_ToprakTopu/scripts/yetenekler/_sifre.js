import { SGA, SGA_BOY } from "./_sga.js";

/* ============================================================
   IKI KATMANLI SIFRE  --  efsane yapisinin yaziti

   Kullanici: "arkadaslarimla oynayabilecegim bir dunya acarsam
   beni bir efsane gibi zannetsinler diye bir tane lapisten
   piramit, etrafina da kiziltas mesalesi, yaninda da bizim
   secegimiz dillerden bir tanesi olsun ama bu diller gercekten
   cozmek icin ugrastirici dillerden olsun."

   Sectigi: iki katman -- disi Standard Galactic Alphabet,
   ici Baconian.

   ---- KATMANLAR NEDEN AYRI GORUNUYOR ----
   Ilk tasarimda Baconian'in A/B harfleri SGA ile yazilacakti.
   O zaman yazitta SADECE IKI farkli sekil defalarca tekrar
   ederdi: hem cirkin, hem "bu bir ikili kod" diye bagirirdi.

   Bunun yerine iki katman iki AYRI yerde:

     SGA yazisi   -> yerdeki harf tarlasi. Gercek bir cumle,
                     yani 26 harfin hepsi cikabiliyor. Cozunce
                     IKINCI sifrenin ADINI soyluyor.
     Baconian bandi -> iki cesit bloktan olusan bir serit.
                     Cozunce KOORDINAT cikiyor.

   Yani: once SGA'yi tanirlar (buyu masasi dili, internette
   tablosu var), cozerler, "BACON" yazdigini gorurler, sonra
   seritteki iki blogu A/B diye okuyup Baconian tablosuyla
   koordinati bulurlar. Adil ama ugrastirici.
   ============================================================ */

/* ---------------- Baconian ----------------
   Klasik Baconian: her harf BES ikili basamak. Bacon'in
   kendi 24 harflik dizisi degil, 26 harflik modern hali
   kullaniliyor -- I/J ve U/V ayrildi, yoksa koordinat
   cozulurken belirsizlik olurdu.

   5 basamak = 32 yuva, 26 harf. Kalan alti yuva rakamlar
   icin DEGIL: rakamlar A-J'ye eslenip harf olarak yaziliyor
   (bkz. sayiyiHarfle). Boylece tablo hep 26 harflik klasik
   tablo kaliyor ve internetten bulunan her Baconian cozucu
   dogrudan calisiyor.                                        */
const BACON_ALFABE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function baconKodla(metin) {
  let cikti = "";
  for (const ch of String(metin).toUpperCase()) {
    const i = BACON_ALFABE.indexOf(ch);
    if (i < 0) continue;                 // bosluk/noktalama atlanir
    for (let bit = 4; bit >= 0; bit--) {
      cikti += ((i >> bit) & 1) ? "B" : "A";
    }
  }
  return cikti;
}

export function baconCoz(kod) {
  let cikti = "";
  const s = String(kod).toUpperCase().replace(/[^AB]/g, "");
  for (let i = 0; i + 5 <= s.length; i += 5) {
    let n = 0;
    for (let k = 0; k < 5; k++) n = (n << 1) | (s[i + k] === "B" ? 1 : 0);
    cikti += (n < BACON_ALFABE.length) ? BACON_ALFABE[n] : "?";
  }
  return cikti;
}

/* ---------------- Sayilari harfe cevirme ----------------
   Koordinat rakam iceriyor, Baconian tablosu ise sadece harf.
   Rakamlar A-J'ye esleniyor (0=A, 1=B, ... 9=J), eksi isareti
   M ("minus"). Cozen kisi once harfleri bulur, sonra bunun
   bir sayi oldugunu anlar -- son kucuk adim.

   AYIRAC: X ve Z arasina "N" konmuyor, cunku N zaten bir
   rakam harfi degil ama karisiklik yaratirdi. Bunun yerine
   iki sayi ARDARDA yazilip uzunluktan ayriliyor... hayir,
   o kirilgan. Ayirac "Y": koordinatta Y ekseni zaten
   kullanilmiyor, yani okuyan icin dogal bir isaret.        */
const RAKAM_HARF = "ABCDEFGHIJ";
const EKSI_HARF = "M";
const AYIRAC = "Y";

export function sayiyiHarfle(n) {
  const tam = Math.trunc(n);
  const negatif = tam < 0;
  const basamaklar = String(Math.abs(tam)).split("")
    .map((d) => RAKAM_HARF[Number(d)]).join("");
  return (negatif ? EKSI_HARF : "") + basamaklar;
}

export function harfiSayi(harfler) {
  const s = String(harfler).toUpperCase();
  const negatif = s[0] === EKSI_HARF;
  const govde = negatif ? s.slice(1) : s;
  let sayi = 0;
  for (const ch of govde) {
    const d = RAKAM_HARF.indexOf(ch);
    if (d < 0) return NaN;
    sayi = sayi * 10 + d;
  }
  return negatif ? -sayi : sayi;
}

/* ---------------- UZUN SAYILAR ----------------
   sayiyiHarfle() sayiyi once Number'a ceviriyor. Bir TOHUM
   22 haneli ve JavaScript'in guvenli tam sayi siniri 2^53
   (16 hane) -- yani sayiyi Number olarak tutmak son haneleri
   BOZUYOR.

   Testte birebir goruldu:
     girdi  7778749381209293789578
     cikan  777874938120929300      <- son haneler ucmus

   Tohum bir sayi degil bir DIZI: basamak basamak cevriliyor,
   hicbir yerde Number'a ugramiyor.                          */
export function rakamHarfle(basamaklar) {
  let cikti = "";
  for (const ch of String(basamaklar)) {
    const d = ch.charCodeAt(0) - 48;
    if (d < 0 || d > 9) continue;
    cikti += RAKAM_HARF[d];
  }
  return cikti;
}

export function harfRakam(harfler) {
  let cikti = "";
  for (const ch of String(harfler).toUpperCase()) {
    const d = RAKAM_HARF.indexOf(ch);
    if (d < 0) return "";
    cikti += String(d);
  }
  return cikti;
}

/* Koordinati Baconian'a hazir harf dizisine cevirir. */
export function koordinatiHarfle(x, z) {
  return sayiyiHarfle(x) + AYIRAC + sayiyiHarfle(z);
}

export function harfiKoordinat(harfler) {
  const parca = String(harfler).toUpperCase().split(AYIRAC);
  if (parca.length !== 2) return undefined;
  const x = harfiSayi(parca[0]);
  const z = harfiSayi(parca[1]);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return undefined;
  return { x, z };
}

/* ---------------- SGA harf tarlasi ----------------
   Metni SGA harfleriyle bir bit haritasina cevirir.

   Donen: { en, boy, noktalar: [{x, y}, ...] }
   x saga, y ASAGI artiyor (doku duzeni). Yapiyi kuran taraf
   bunu dunya eksenine ceviriyor.

   Bilinmeyen karakter (bosluk dahil) bos yer birakiyor --
   kelimeler ayrilsin diye.                                   */
export function sgaTarlasi(metin, aralik = 1) {
  const harfler = String(metin).toUpperCase().split("");
  const noktalar = [];
  let x0 = 0;
  for (const ch of harfler) {
    const bit = SGA[ch];
    if (bit) {
      for (let y = 0; y < bit.length; y++) {
        const satir = bit[y];
        for (let x = 0; x < satir.length; x++) {
          if (satir[x] === "#") noktalar.push({ x: x0 + x, y });
        }
      }
    }
    x0 += SGA_BOY + aralik;
  }
  return {
    en: Math.max(0, x0 - aralik),
    boy: SGA_BOY,
    noktalar
  };
}

/* ---------------- Turkce harfleri katlama ----------------
   SGA'da yalniz A-Z var. Turkce metin oldugu gibi yazilirsa
   C, G, I, O, S, U harfleri SESSIZCE DUSER ve cumlede delik
   acilir -- yazit da cozulemez hale gelir.

   O yuzden once katlaniyor. Cozecek kisi "COZEMEDI" gorup
   "cozemedi" diye okuyacak; Turkce bilen biri icin sorun degil.
   Buyuk I / kucuk i ayrimi da burada bitiyor.               */
const TR_KATLAMA = new Map([
  ["Ç", "C"], ["Ğ", "G"], ["İ", "I"], ["Ö", "O"], ["Ş", "S"], ["Ü", "U"],
  ["ç", "C"], ["ğ", "G"], ["ı", "I"], ["ö", "O"], ["ş", "S"], ["ü", "U"],
]);

export function sgaKatla(metin) {
  let cikti = "";
  for (const ch of String(metin)) {
    const k = TR_KATLAMA.get(ch);
    cikti += (k !== undefined) ? k : ch.toUpperCase();
  }
  return cikti;
}

/* ---------------- Cok satirli SGA ----------------
   Her harf SGA_BOY + aralik blok genislik yiyor. Uzun bir
   cumle tek satirda yuzlerce blok eder ve okunmaz; kelime
   sinirindan satirlara boluyoruz.

   satirHarf: bir satira en fazla kac HARF (bosluk dahil).   */
export function sgaSatirlar(metin, satirHarf = 14) {
  const kelimeler = sgaKatla(metin).split(/\s+/).filter((k) => k.length > 0);
  const satirlar = [];
  let simdiki = "";
  for (const k of kelimeler) {
    if (simdiki.length === 0) {
      simdiki = k;
    } else if (simdiki.length + 1 + k.length <= satirHarf) {
      simdiki += " " + k;
    } else {
      satirlar.push(simdiki);
      simdiki = k;
    }
    /* Tek basina satiri asan kelime: oldugu gibi biraksin,
       ortadan bolmek yaziti okunmaz yapar.                  */
    while (simdiki.length > satirHarf) {
      satirlar.push(simdiki.slice(0, satirHarf));
      simdiki = simdiki.slice(satirHarf);
    }
  }
  if (simdiki.length > 0) satirlar.push(simdiki);
  return satirlar;
}

/* Cok satirli metni tek bir bit haritasina cevirir.
   satirAra: satirlar arasi bos blok sayisi.                 */
export function sgaBlok(metin, satirHarf = 14, aralik = 1, satirAra = 3) {
  const satirlar = sgaSatirlar(metin, satirHarf);
  const noktalar = [];
  let enGenis = 0;
  satirlar.forEach((satir, i) => {
    const t = sgaTarlasi(satir, aralik);
    const yKay = i * (SGA_BOY + satirAra);
    enGenis = Math.max(enGenis, t.en);
    for (const n of t.noktalar) noktalar.push({ x: n.x, y: n.y + yKay });
  });
  return {
    satirlar,
    en: enGenis,
    boy: satirlar.length === 0
      ? 0
      : satirlar.length * (SGA_BOY + satirAra) - satirAra,
    noktalar
  };
}

/* Bir metnin SGA olarak kac blok genislik tutacagi. */
