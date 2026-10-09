/* FILM ARACLARI KURULUMU -- arac/arac_kur.sh                    v7.99.10

   Kullanici: "yeni sohbetlerde de bu otomatik olarak kurulu gelsin."
   Betik bulut ortaminin Setup script alanindan cagriliyor; burada
   INDIRMEDEN olculur (indirme ve dogrulama elle bir kez kosuldu:
   55 sn, SHA-256 84098912...a168 resmi listeyle ayni, ikinci kosu hicbir
   sey indirmedi):
   1. sozdizimi gecerli (bash -n)
   2. Blender surumu SABIT ve RESMI kaynaktan; SHA-256 resmi listeyle
      karsilastiriliyor, tutmazsa cikis kodu 1
   3. MCprep md5'i REFERANS_BLENDER_MCPREP.md'deki ile ayni
   4. ikili dosyalar depoda yok (Blender/MCprep depoya girmez)  */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const betik = readFileSync(KOK + "arac/arac_kur.sh", "utf8");
let sozdizimi = true;
try { execFileSync("bash", ["-n", KOK + "arac/arac_kur.sh"]); } catch { sozdizimi = false; }
kontrol("sozdizimi gecerli", sozdizimi);
kontrol("Blender surumu sabit (5.2.2) ve resmi kaynaktan",
        /BLENDER_SURUM=5\.2\.2\b/.test(betik) && betik.includes("https://download.blender.org/release/Blender5.2/"));
kontrol("Blender SHA-256 resmi listeyle karsilastiriliyor, tutmazsa duruyor",
        betik.includes("sha256sum") && /blender-\$\{BLENDER_SURUM\}\.sha256/.test(betik) && /TUTMUYOR[\s\S]{0,80}exit 1/.test(betik));
const ref = readFileSync(KOK + "REFERANS_BLENDER_MCPREP.md", "utf8").match(/md5 `([0-9a-f]{32})`/);
const md5 = betik.match(/MCPREP_MD5=([0-9a-f]{32})/);
kontrol("MCprep md5 referans belgeyle ayni", ref && md5 && ref[1] === md5[1], md5 ? md5[1] : "yok");
const izli = execFileSync("git", ["ls-files"], { cwd: KOK, encoding: "utf8" }).split("\n")
  .filter((f) => /blender-\d.*\.tar|MCprep_addon.*\.zip|(^|\/)blender$/.test(f));
kontrol("Blender/MCprep ikili dosyalari depoda yok", izli.length === 0, izli.join(", "));
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> film araclari: resmi kaynak, dogrulamali, depo disinda");
process.exit(hata ? 1 : 0);
