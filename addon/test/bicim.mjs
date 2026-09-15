/* BICIM DOGRULAMA — .animation.json ve .geo.json          v7.94.2

   Bu dosya iki Python betigini cagirip hukum veriyor:

     arac/bicim_dogrula.py   depodaki 15 animasyon + 379 geometri
                             dosyasini GeckoLib'in kurallarina gore
                             dogruluyor
     arac/bicim_mutasyon.py  dogrulayicinin gercekten isirdigini
                             gosteriyor (15 bilerek bozma)

   ---- NEDEN IKISI BIRDEN ----
   Sadece birincisi kosulsaydi "HATA : 0" iki farkli sey demek
   olurdu: ya dosyalar saglam, ya dogrulayici hicbir sey olcmuyor.
   Bu depoda ikinci ihtimal en pahali hata bicimi (bkz. NOTLAR.md).
   Mutasyon bataryasi ikisini birbirinden ayiriyor.

   ---- anim_tara.py'den FARKI ----
   animasyon.mjs -> anim_tara.py animasyonlarin BIRBIRIYLE
   tutarliligina bakiyor (cift kimlik, modelde olmayan kemik,
   uzunluk asimi). Burasi BICIM soruyor: easing adi gercek mi,
   MoLang fonksiyonu var mi, format_version kabul ediliyor mu.
   Ikisi ayri sorular; geometri dosyalari bugune kadar hicbir
   sekilde dogrulanmiyordu.

   ---- NEDEN PYTHON ----
   animasyon.mjs ile ayni gerekce: tarama dosya sistemini geziyor
   ve JSON cozuyor, ayni is iki dilde iki kez yazilmasin.
   Cikti bicimi sabit: "HATA : <n>".                            */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const kos = (betik) => {
  try {
    return execFileSync("python3", ["../arac/" + betik], {
      encoding: "utf8", cwd: import.meta.dirname, maxBuffer: 32 * 1024 * 1024
    });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
};

const hataSayisi = (cikti) => {
  const s = cikti.split("\n").find((x) => x.startsWith("HATA :"));
  return s ? parseInt(s.split(":")[1].trim(), 10) : -1;
};

const satir = (cikti, onek) =>
  (cikti.split("\n").find((x) => x.startsWith(onek)) || "").trim();

console.log("=== 1. DEPODAKI DOSYALAR BICIM OLARAK GECERLI MI ===");
{
  const cikti = kos("bicim_dogrula.py");
  const n = hataSayisi(cikti);

  kontrol("dogrulayici calisti", n >= 0, n >= 0 ? "" : cikti.slice(0, 300));
  console.log("  " + satir(cikti, "kaynak:"));
  console.log("  " + satir(cikti, "animasyon dosyasi:"));
  console.log("  " + satir(cikti, "geometri dosyasi:"));

  /* Dosya sayisi da olculuyor: dogrulayici yanlis koke bakarsa
     (ya da bir klasor adi degisirse) hicbir dosya bulamaz, HATA 0
     verir ve YESIL yanar. anim_tara.py'de tam bu tuzak vardi --
     mutlak yol tasiyordu ve baska bir makinede sessizce bos
     tarardi. O yuzden "en az su kadar dosya gordun mu" soruluyor. */
  const anim = parseInt(satir(cikti, "animasyon dosyasi:").split(":")[1], 10);
  const geo = parseInt(satir(cikti, "geometri dosyasi:").split(":")[1], 10);
  kontrol("animasyon dosyalari bulundu", anim >= 15, String(anim));
  kontrol("geometri dosyalari bulundu", geo >= 350, String(geo));

  if (n > 0) {
    for (const s of cikti.split("\n").filter((x) => x.startsWith("  - ")))
      console.log("      " + s.trim());
  }
  kontrol("bicim hatasi yok", n === 0, "HATA " + n);
}

console.log("");
console.log("=== 2. DOGRULAYICI GERCEKTEN ISIRIYOR MU ===");
{
  const cikti = kos("bicim_mutasyon.py");
  const sagKalan = hataSayisi(cikti);

  kontrol("mutasyon bataryasi calisti", sagKalan >= 0,
          sagKalan >= 0 ? "" : cikti.slice(0, 300));
  console.log("  " + satir(cikti, "mutasyon:"));

  for (const s of cikti.split("\n").filter((x) => x.includes("SAG KALDI")))
    console.log("      " + s.trim());

  kontrol("her bozma yakalandi", sagKalan === 0, "sag kalan " + sagKalan);
}

console.log("");
console.log(hata ? "SORUN VAR" : "temiz");
process.exit(hata ? 1 : 0);
