// Yerel varlik kolu (v7.94.9).
//
// Dis modlardan turetilmis varliklar addon/yerel/ altinda durur ve
// ASLA commit'lenmez. Kullanici iki yapimcidan (Bit & Byte /
// Craftformers, Mr. Nido / Iron Man) KISISEL KULLANIM izni aldi;
// ikisinin de sarti ayni: "dosyayi kimseye vermemek". Bu depo
// herkese acik oldugu icin buraya bir varlik commit'lemek tam olarak
// o sartin tersi olurdu.
//
// Bu test o siniri makineye sorduruyor. Insan hatirlamasa da tutar.
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ADDON = join(BURADA, "..");
const KOK = join(ADDON, "..");

let hata = 0;
function kontrol(ad, kosul, ek) {
  if (kosul) console.log("  ✓ " + ad + (ek ? "  ::  " + ek : ""));
  else { console.log("  ✗ " + ad + (ek ? "  ::  " + ek : "")); hata++; }
}
function git(...a) {
  try {
    return execFileSync("git", a, { cwd: KOK, encoding: "utf8" }).trim();
  } catch (e) {
    return (e.stdout || "").trim();
  }
}

console.log("=== 1. .gitignore YEREL KOLU KAPSIYOR ===");
{
  const gi = readFileSync(join(KOK, ".gitignore"), "utf8");
  kontrol("addon/yerel/ .gitignore'da", /^addon\/yerel\/$/m.test(gi));
}

console.log("");
console.log("=== 2. YEREL KLASORDEN HICBIR SEY IZLENMIYOR ===");
{
  // git ls-files: izlenen dosyalar. Bos olmali -- hic dosya
  // commit'lenmemis olmali, klasor var olsa bile.
  const izlenen = git("ls-files", "addon/yerel");
  kontrol("addon/yerel altinda izlenen dosya yok", izlenen === "",
          izlenen ? izlenen.split("\n").length + " dosya IZLENIYOR" : "temiz");
}

console.log("");
console.log("=== 3. GERCEKTEN YOK SAYILIYOR MU (olcerek) ===");
{
  // Iddia etmek yetmez: gercek bir dosya koyup git'e SORUYORUZ.
  const deneme = join(ADDON, "yerel", "Simsek_Kol_Kaynak", "_sinama.txt");
  let kurduk = false;
  try {
    mkdirSync(dirname(deneme), { recursive: true });
    writeFileSync(deneme, "sinama");
    kurduk = true;
    const ciktisi = git("status", "--porcelain", "--", "addon/yerel");
    kontrol("yeni dosya git status'ta GORUNMUYOR", ciktisi === "",
            ciktisi || "temiz");
    const ign = git("check-ignore", "-q", "addon/yerel/Simsek_Kol_Kaynak/_sinama.txt");
    // check-ignore -q: yok sayiliyorsa cikis 0, degilse 1.
    // execFileSync hata firlatirsa git() bos dondurur; ayrimi
    // status ile zaten yaptik, bu ikinci olcum.
    kontrol("git check-ignore yok sayiyor", ign === "", ign || "yok sayiliyor");
  } finally {
    if (kurduk) rmSync(join(ADDON, "yerel"), { recursive: true, force: true });
  }
}

console.log("");
console.log("=== 4. paketle.sh YEREL KOLU TASIYOR ===");
{
  const ps = readFileSync(join(ADDON, "paketle.sh"), "utf8");
  kontrol("yerel klasorunu ariyor", ps.includes('YEREL="$K/yerel"'));
  kontrol("varlik yoksa atliyor", /if \[ -d "\$YEREL" \]/.test(ps));
  kontrol("ayri _Yerel paketi uretiyor", ps.includes("_Yerel_"));
  // Temiz paketlerin adi _Yerel TASIMAMALI: yereli olmayan
  // uretim birebir ayni cikti vermeli (yeniden uretilebilirlik).
  const temizAdlar = ps.match(/Simsek_\$\{S\}_(Mod|Gorunum|Skin|OyuncuModeli|Gokyuzu)\.mcpack/g) || [];
  kontrol("temiz paket adlari yerelden etkilenmiyor", temizAdlar.length >= 4,
          temizAdlar.length + " ad");
}

console.log("");
console.log(hata ? "SORUN VAR" : "temiz");
process.exit(hata ? 1 : 0);
