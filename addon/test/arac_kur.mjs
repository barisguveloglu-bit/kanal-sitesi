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
   4. ikili dosyalar depoda yok (Blender/MCprep depoya girmez)
   v7.99.15 hazir paketler (REFERANS_HAZIR_PAKETLER.md):
   5. her paketin SHA-256'si referans belgedeki tabloyla ayni
   6. JangaFX VDB'leri yalniz --vdb ile
   7. paket_kur GERCEKTEN kosturulur (file:// kaynakla, ag yok): SHA'si
      tutmayan dosya kurulmuyor, tutan kuruluyor, ikinci kosu indirmiyor
   8. paket dosyalari depoda yok
   v7.99.16 koylu dokulari (REFERANS_MOJANG_KILAVUZ.md):
   9. Mojang'in resmi istemci JAR'i, surum ve iki ozet sabit, yalniz
      entity/villager aciliyor; doku da JAR da depoda yok  */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";

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

const paketSha = [...betik.matchAll(/^\s*paket_kur \S+ \S+ ([0-9a-f]{64}) /gm)].map((m) => m[1]);
const belge = readFileSync(KOK + "REFERANS_HAZIR_PAKETLER.md", "utf8");
const belgeSha = belge.split("\n").filter((s) => s.startsWith("| `"))
  .flatMap((s) => [...s.matchAll(/`([0-9a-f]{64})`/g)].map((m) => m[1]));
kontrol("paket SHA-256'lari referans belgedeki tabloyla ayni",
        paketSha.length >= 13 && paketSha.length === belgeSha.length &&
        [...paketSha].sort().join() === [...belgeSha].sort().join(),
        paketSha.length + " betikte, " + belgeSha.length + " belgede");
const vdbBlok = betik.match(/if \[ "\$VDB" = 1 \]; then([\s\S]*?)\nelse/);
const vdbSatir = [...betik.matchAll(/^\s*paket_kur jangafx\S* .*$/gm)];
kontrol("JangaFX VDB'leri yalniz --vdb ile",
        vdbBlok && vdbSatir.length === 4 && vdbSatir.every((m) => vdbBlok[1].includes(m[0].trim())));
const fonk = betik.match(/\npaket_kur\(\) \{[\s\S]*?\n\}\n/);
let deneme = "";
if (fonk) {
  const T = mkdtempSync(tmpdir() + "/paket_kur_");
  mkdirSync(T + "/kaynak");
  writeFileSync(T + "/kaynak/a.txt", "deneme icerigi\n");
  const dogru = createHash("sha256").update("deneme icerigi\n").digest("hex");
  const yanlis = "0".repeat(64);
  const sh = `set -euo pipefail
exec 2>&1
PAKET=${T}/paket; gecici=${T}/gecici; mkdir -p "$PAKET" "$gecici"
${fonk[0]}
paket_kur d a.txt ${yanlis} file://${T}/kaynak/a.txt
[ -e "$PAKET/d/a.txt" ] && echo YANLIS_KURULDU
paket_kur d a.txt ${dogru} file://${T}/kaynak/a.txt
[ -f "$PAKET/d/a.txt" ] && [ -f "$PAKET/d/.sha_${dogru.slice(0, 16)}" ] && echo DOGRU_KURULDU
paket_kur d a.txt ${dogru} file://${T}/kaynak/a.txt
`;
  try { deneme = execFileSync("bash", ["-c", sh], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { deneme = (e.stdout || "") + " CIKIS " + e.status; }
  rmSync(T, { recursive: true, force: true });
}
kontrol("paket_kur: SHA-256 tutmayan kurulmuyor, tutan kuruluyor, ikinci kosu indirmiyor",
        !!fonk && deneme.includes("TUTMUYOR") && !deneme.includes("YANLIS_KURULDU") && deneme.includes("DOGRU_KURULDU") && deneme.includes("zaten kurulu"),
        deneme.replace(/\s+/g, " ").trim().slice(0, 160));
// koylu dokulari (v7.99.16): Mojang'in resmi istemci JAR'i, surum sabit, iki
// ozet de tutmazsa kurulmuyor; JAR'dan yalniz entity/villager aciliyor ve JAR
// siliniyor; ozetler REFERANS_MOJANG_KILAVUZ.md'deki tabloyla ayni
const kSurum = betik.match(/^KOYLU_SURUM=(\S+)$/m), kS1 = betik.match(/^KOYLU_SHA1=([0-9a-f]{40})$/m);
const kS256 = betik.match(/^KOYLU_SHA256=([0-9a-f]{64})$/m);
const mojang = readFileSync(KOK + "REFERANS_MOJANG_KILAVUZ.md", "utf8");
kontrol("koylu JAR'i: surum sabit, resmi Mojang adresi (SHA-1 adresin icinde)",
        !!kSurum && kSurum[1] === "26.3" && !!kS1 &&
        betik.includes("KOYLU_URL=https://piston-data.mojang.com/v1/objects/${KOYLU_SHA1}/client.jar"),
        kSurum ? kSurum[1] : "yok");
kontrol("koylu JAR'i: SHA-1 VE SHA-256 karsilastiriliyor, tutmazsa kurulmuyor",
        /\[ "\$s1" != "\$KOYLU_SHA1" \] \|\| \[ "\$s256" != "\$KOYLU_SHA256" \]/.test(betik) &&
        /TUTMUYOR[^\n]*Kurulmadi/.test(betik.slice(betik.indexOf("KOYLU_SURUM="))));
kontrol("koylu JAR'i: yalniz entity/villager aciliyor, JAR siliniyor",
        betik.includes('KOYLU_ICI=assets/minecraft/textures/entity/villager') &&
        betik.includes('unzip -q -o "$gecici/client.jar" "$KOYLU_ICI/*"') && betik.includes('rm -f "$gecici/client.jar"'));
kontrol("koylu ozetleri REFERANS_MOJANG_KILAVUZ.md ile ayni",
        !!kS1 && !!kS256 && mojang.includes("`" + kS1[1] + "`") && mojang.includes("`" + kS256[1] + "`"));
const koyluIzli = execFileSync("git", ["ls-files"], { cwd: KOK, encoding: "utf8" }).split("\n")
  .filter((f) => /textures\/entity\/villager|(^|\/)client\.jar$|profession_level|(^|\/)villager(_baby)?\.png$/.test(f));
kontrol("Mojang koylu dokusu ve JAR'i depoda yok", koyluIzli.length === 0, koyluIzli.join(", "));
const paketIzli = execFileSync("git", ["ls-files"], { cwd: KOK, encoding: "utf8" }).split("\n")
  .filter((f) => /\.(vdb|glb|rar|7z)$|pooka_efektler|kenney_particlePack|smokeParticleAssets|qubodupPunch/i.test(f));
kontrol("hazir paket dosyalari depoda yok", paketIzli.length === 0, paketIzli.join(", "));
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> film araclari: resmi kaynak, dogrulamali, depo disinda");
process.exit(hata ? 1 : 0);
