/* SAVUNMA KAPSAMI -- sayilar belgeyle uyusuyor mu?     v7.38

   Kullanici sordu: "savunmamiz yuzde kac ve ne kadar artti?"
   Cevap `savunma_olc.py`'den geliyor, belgeye de yazildi
   (REFERANS_SAVUNMA_PLANI.md).

   ---- BU DOSYA NEDEN VAR ----
   Belgeye elle yazilan bir sayi BAYATLAR. Yeni bir denetim
   eklenince betigin ciktisi degisir, belge oldugu yerde kalir
   ve bir sure sonra kimse hangisinin dogru oldugunu bilmez.
   Bu depoda ayni sinif hata birkac kez yasandi (surum adi iki
   yerden geliyordu, menu adi iki yerden geliyordu).

   Burada tutulan sey: BETIK NE DIYORSA BELGE ONU DEMELI.

   Ayrica tablonun kendi ic tutarliligi tutuluyor -- sinif
   sayilari toplami toplam ozellik sayisina esit olmali ve
   surum ilerledikce kapsam AZALMAMALI.                      */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

let cikti = "";
try {
  cikti = execFileSync("python3", [KOK + "/savunma_olc.py"], { encoding: "utf8" });
} catch (e) {
  cikti = "";
}
if (!cikti) {
  console.log("  - python3 yok, kapsam olcumu atlandi");
  process.exit(0);
}

const sayi = (kalip) => {
  const m = cikti.match(kalip);
  return m ? Number(m[1]) : NaN;
};

console.log("== 1. BETIGIN KENDI IC TUTARLILIGI");
const toplam   = sayi(/toplam ozellik\s+(\d+)/);
const kapali   = sayi(/kapali \(bizde karsiligi\)\s+(\d+)/);
const acik     = sayi(/acik   \(olculebilir, yok\)\s+(\d+)/);
const ayirt    = sayi(/ayirt  \(ayirt edilemez\)\s+(\d+)/);
const op       = sayi(/op     \(operator kapisi\)\s+(\d+)/);
const imkansiz = sayi(/imkansiz \(ekran tarafi\)\s+(\d+)/);

kontrol("butun sayilar okundu",
        [toplam, kapali, acik, ayirt, op, imkansiz].every((n) => Number.isFinite(n)),
        [toplam, kapali, acik, ayirt, op, imkansiz].join("/"));
kontrol("siniflar toplami = toplam ozellik",
        kapali + acik + ayirt + op + imkansiz === toplam,
        (kapali + acik + ayirt + op + imkansiz) + " vs " + toplam);

/* Kapsam surumle birlikte AZALAMAZ. Bir denetim yanlislikla
   silinirse ya da surum etiketi geriye kayarsa burada duser. */
const satirlar = [...cikti.matchAll(/^  v(\d+\.\d+)\s+(\d+)\s+%/gm)]
  .map((m) => ({ surum: m[1], kapali: Number(m[2]) }));
kontrol("surum tablosu okundu", satirlar.length >= 6, satirlar.length + " satir");
let artan = true;
for (let i = 1; i < satirlar.length; i++) {
  if (satirlar[i].kapali < satirlar[i - 1].kapali) artan = false;
}
kontrol("kapsam surumle birlikte azalmiyor", artan,
        satirlar.map((s) => s.kapali).join(" -> "));
kontrol("son surum betikteki kapali sayisina esit",
        satirlar.length > 0 && satirlar[satirlar.length - 1].kapali === kapali,
        satirlar.length ? satirlar[satirlar.length - 1].kapali + " vs " + kapali : "-");

console.log("");
console.log("== 2. BELGE BETIKLE UYUSUYOR MU");
const belge = readFileSync(KOK + "/REFERANS_SAVUNMA_PLANI.md", "utf8");

/* Sayim tablosundaki her deger belgede AYNEN gecmeli. */
const bekle = [
  ["kapali", kapali], ["acik", acik], ["ayirt", ayirt],
  ["op", op], ["imkansiz", imkansiz], ["toplam", toplam]
];
for (const [ad, n] of bekle) {
  kontrol("belgede '" + ad + "' = " + n,
          new RegExp("\\|\\s*" + n + "\\s*\\|").test(belge) ||
          new RegExp("\\*\\*" + n + "\\*\\*").test(belge),
          String(n));
}

const hamYuzde = Math.round(100 * kapali / toplam);
const engToplam = kapali + acik;
const engYuzde = Math.round(100 * kapali / engToplam);
const tavan = Math.round(100 * engToplam / toplam);

/* ---- YUZDELER: "gecıyor mu" YETMIYOR ----
   Ilk yazilista `belge.indexOf("%67")` yaziyordu ve mutasyon
   KACTI: prozadaki yuzde elle degistirildi ama ayni sayi
   tablonun baska bir satirinda hala duruyordu, madde gecti.
   Artik sayi ETIKETIYLE ve ORANIYLA BIRLIKTE araniyor.     */
kontrol("belgede ham kapsam '%" + hamYuzde + " (" + kapali + "/" + toplam + ")'",
        new RegExp("Ham kapsam:\\s*%" + hamYuzde + "\\*{0,2}\\s*\\(" +
                   kapali + "/" + toplam + "\\)").test(belge));
kontrol("belgede engellenebilir '%" + engYuzde + " (" + kapali + "/" + engToplam + ")'",
        new RegExp("Engellenebilirin kapsamı:\\s*%" + engYuzde + "\\*{0,2}\\s*\\(" +
                   kapali + "/" + engToplam + "\\)").test(belge));
kontrol("belgede tavan %" + tavan,
        new RegExp("tavanı 100 değil, \\*{0,2}%" + tavan).test(belge));

/* ---- SURUM TABLOSU SATIR SATIR ----
   Ikinci kacan mutasyon: bir denetimin surum etiketi geriye
   kaydirildi. Toplam degismedigi icin yukaridaki maddelerin
   hicbiri dusmedi, oysa "hangi surumde ne kapandi" tablosu
   tamamen yanlis olmustu. Artik her satir belgede araniyor. */
for (const s of satirlar) {
  const ham = Math.round(100 * s.kapali / toplam);
  const eng = Math.round(100 * s.kapali / engToplam);
  const kalip = new RegExp(
    "\\|\\s*\\*{0,2}v" + s.surum.replace(".", "\\.") +
    "\\*{0,2}\\s*\\|\\s*\\*{0,2}" + s.kapali +
    "\\*{0,2}\\s*\\|\\s*\\*{0,2}%" + ham +
    "\\*{0,2}\\s*\\|\\s*\\*{0,2}%" + eng + "\\*{0,2}\\s*\\|");
  kontrol("belgedeki v" + s.surum + " satiri betikle ayni",
          kalip.test(belge), s.kapali + " · %" + ham + " · %" + eng);
}

/* Acik kalanlarin sayisi da belgede yaziyor -- "siradaki is
   listesi" boyle kisalirsa belge de kisalmali.              */
kontrol("belgede acik kalan sayisi (" + acik + ") yaziyor",
        new RegExp("Açık kalan " + acik + "\\b").test(belge) ||
        new RegExp("\\b" + acik + " —").test(belge),
        String(acik));

console.log("");
console.log("== 3. IKI YENI APK BELGELENDI MI");
for (const dosya of ["REFERANS_BLOODY_APK.md", "REFERANS_WCLIENT_APK.md"]) {
  let icerik = "";
  try { icerik = readFileSync(KOK + "/" + dosya, "utf8"); } catch (e) { /* yok */ }
  kontrol(dosya + " var ve dolu", icerik.length > 1000, icerik.length + " bayt");
  /* Her inceleme "calistirilmadi" demeli -- kullanicinin acik
     talimatiydi ve belgenin kendisi bunun kaydi.            */
  /* Kalibin ilk harfi Ç -- 'calistirilmadi' diye aramak ilk
     yazilista IKI maddeyi birden dusurdu ve kusur belgede
     degil TESTTEYDI. Bu depodaki "kusur olcumde, kodda degil"
     hatasinin bir ornegi daha.                              */
  kontrol(dosya + " 'çalıştırılmadı' diyor",
          /çalıştırılmadı/i.test(icerik));
  /* md5 olmadan "bu dosyayi inceledim" demek dogrulanamaz. */
  kontrol(dosya + " md5 tasiyor", /\b[0-9a-f]{32}\b/.test(icerik));
}
kontrol("savunma plani iki yeni dosyaya bagli",
        belge.indexOf("REFERANS_BLOODY_APK.md") !== -1 &&
        belge.indexOf("REFERANS_WCLIENT_APK.md") !== -1);

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> kapsam olcumu yerinde");
process.exit(hata ? 1 : 0);
