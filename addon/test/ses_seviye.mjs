/* SES SEVIYESI -- film_birlestir.ses_ayarla                     v7.99.12

   Hedef YouTube'un -14 LUFS'u. Eskiden yalniz loudnorm (tek gecis) vardi;
   38 sn'lik gercek Part 1 denemesinde -11.3 LUFS olculdu. Simdi film once
   kayipsiz sesle ara dosyaya yaziliyor, yukseklik OLCULUYOR, kazanc
   olculerek yaklastiriliyor (mutlak -70 LUFS kapisi yuzunden tek seferlik
   kazanc tutmuyor: -2.7 dB -> -13.5).
   1. yuksek ses (~-6 LUFS) -> -14 +- 0.3, tepe <= -1 dBTP
   2. kisik ses (~-23 LUFS) + kapi yakininda sessiz bolum: yine -14 +- 0.3
   3. video KOPYALANIYOR (yeniden sikistirilmiyor: ayni paket boyutu)
   4. sessiz parca YUKSELTILMIYOR (kazanc 0)
   2b. GERCEK Part 1 sesi (film_ses + ayni zincir) yine -14 +- 0.3
   2c. ortam (ruzgar) -42..-32 LUFS, iki kanal dengeli, basta tik yok
       (eskiden -80: suzgec yalniz sol kanaldan, olcek kenar artigindan)
   Mutasyonla isirdigi gosterildi: kazanc 0'a sabitlenince 1-2-2b dustu;
   eski ruzgar() geri konunca 2c dustu. Yineleme dongusu: ilk olcumde
   (ortam -80 LUFS iken) gercek ses tek kazancla -13.5 veriyordu; ortam
   duzelince tek kazanc da tutuyor -- dongu guvenlik payi, SU AN hicbir
   kontrol onu isirmiyor (durust kayit). */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const ARAC = new URL("../arac/", import.meta.url).pathname;
const T = mkdtempSync(join(tmpdir(), "ses_seviye_"));
const ff = (...a) => execFileSync("ffmpeg", ["-y", "-v", "error", ...a], { cwd: T });
const ayarla = (ara, cikti) => JSON.parse(execFileSync("python3", ["-c", `
import sys, json; sys.path.insert(0, ${JSON.stringify(ARAC)})
import film_birlestir as B
o, k, s = B.ses_ayarla(${JSON.stringify(join(T, ara))}, ${JSON.stringify(join(T, cikti))})
sonlu = lambda d: {x: (v if abs(v) != float("inf") else -999.0) for x, v in d.items()}  # sessizde tepe -inf
print(json.dumps({"once": sonlu(o), "kazanc": k, "sonra": sonlu(s)}))`], { encoding: "utf8" }).trim());
const videoBoyu = (d) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries",
  "stream=codec_name:packet=size", "-of", "csv=p=0", join(T, d)], { encoding: "utf8" }).trim();
try {
  const video = ["-f", "lavfi", "-i", "testsrc2=s=160x90:r=10:d=8"];
  const cikis = ["-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "30", "-c:a", "flac", "-ar", "48000", "-shortest"];
  // 1. yuksek, surekli ses
  ff(...video, "-f", "lavfi", "-i", "sine=f=440:d=8,volume=6", ...cikis, "yuksek.mkv");
  const a = ayarla("yuksek.mkv", "yuksek.mp4");
  kontrol("yuksek ses (~-6 LUFS) -> -14 +- 0.3 LUFS", a.once.I > -9 && Math.abs(a.sonra.I + 14) <= 0.3,
          `once ${a.once.I}, kazanc ${a.kazanc.toFixed(2)}, sonra ${a.sonra.I}`);
  kontrol("tepe <= -1 dBTP", a.sonra.TP <= -1.0, String(a.sonra.TP));
  // 2. kisik (~-23 LUFS, yukseltilir) + uzun cok kisik bolum: mutlak kapi
  ff(...video, "-f", "lavfi", "-i",
     "sine=f=440:d=3[s];anoisesrc=d=5:a=0.0006:c=pink[n];[s][n]concat=n=2:v=0:a=1",
     ...cikis, "kapi.mkv");
  const b = ayarla("kapi.mkv", "kapi.mp4");
  kontrol("kisik bolumlu ses de -14 +- 0.3 LUFS (yineleme)", Math.abs(b.sonra.I + 14) <= 0.3,
          `once ${b.once.I}, kazanc ${b.kazanc.toFixed(2)}, sonra ${b.sonra.I}`);
  // 2b. GERCEK Part 1 efekt + muzigi (ortamsiz, aralar sessiz): tek kazanc tutmuyordu
  const KOK = new URL("../", import.meta.url).pathname;
  execFileSync("python3", ["-c", `
import sys, subprocess; sys.path.insert(0, ${JSON.stringify(ARAC)})
import film_ses, film_birlestir as B, bedrock_onizleme as O
sen = O.oku(${JSON.stringify(KOK + "film/bolum1_orman.json")})
a, b = sen["parcalar"]["part1"]
kat = film_ses.ses_kur(sen, katmanlar=True)   # ortamsiz: efekt + muzik, aralarinda sessizlik (kapi etkisi)
k = (kat["efekt"] + kat["muzik"])[int((a - 1) / sen["fps"] * film_ses.ORAN):int(b / sen["fps"] * film_ses.ORAN)]
film_ses.yaz(k, "p1.wav")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=gray:s=160x90:r=10", "-i", "p1.wav",
                "-filter_complex", "[1:a]" + B.SES_ZINCIR + "[a]", "-map", "0:v", "-map", "[a]", "-shortest",
                "-c:v", "libx264", "-crf", "30", "-c:a", "flac", "-ar", "48000", "gercek.mkv"], check=True)`], { cwd: T });
  const g = ayarla("gercek.mkv", "gercek.mp4");
  kontrol("gercek Part 1 efekt+muzik (sessiz aralarla) -14 +- 0.3 LUFS (tek kazanc tutmuyor, yineleme sart)", Math.abs(g.sonra.I + 14) <= 0.3,
          `once ${g.once.I}, kazanc ${g.kazanc.toFixed(2)}, sonra ${g.sonra.I}`);
  // 2c. ORTAM (ruzgar) gercekten duyulur: eskiden -80 LUFS (kanal + olcek hatasi)
  const ortam = JSON.parse(execFileSync("python3", ["-c", `
import sys, json, subprocess, re; sys.path.insert(0, ${JSON.stringify(ARAC)})
import film_ses, bedrock_onizleme as O, numpy as np
sen = O.oku(${JSON.stringify(KOK + "film/bolum1_orman.json")})
a, b = sen["parcalar"]["part1"]
x = film_ses.ses_kur(sen, katmanlar=True)["ortam"][int((a - 1) / sen["fps"] * film_ses.ORAN):int(b / sen["fps"] * film_ses.ORAN)]
film_ses.yaz(x, "ortam.wav")
c = subprocess.run(["ffmpeg", "-nostats", "-i", "ortam.wav", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
i = float(c[c.rindex("Summary:"):].split("I:")[1].split("LUFS")[0])
sol, sag = (float(np.sqrt(np.mean(x[:, k] ** 2))) for k in (0, 1))
print(json.dumps({"I": i, "denge": sag / max(sol, 1e-12), "bas": float(np.abs(x[:4800]).max()) / max(float(np.abs(x).max()), 1e-12)}))`],
    { encoding: "utf8", cwd: T }).trim());
  kontrol("ortam (orman ruzgari) -42..-32 LUFS -- sessiz anda duyulur", ortam.I >= -42 && ortam.I <= -32, String(ortam.I));
  kontrol("ortam iki kanal dengeli (sag/sol RMS 0.7..1.4)", ortam.denge > 0.7 && ortam.denge < 1.4, ortam.denge.toFixed(2));
  kontrol("ortamin basinda kenar artigi (tik) yok", ortam.bas < 1.0, ortam.bas.toFixed(2));
  // 3. video kopya
  kontrol("video yeniden sikistirilmadi (paketler bire bir)", videoBoyu("yuksek.mkv") === videoBoyu("yuksek.mp4"));
  // 4. sessiz parca
  ff(...video, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", ...cikis, "sessiz.mkv");
  const c = ayarla("sessiz.mkv", "sessiz.mp4");
  kontrol("sessiz parca yukseltilmedi (kazanc 0)", c.kazanc === 0, String(c.kazanc));
} finally {
  rmSync(T, { recursive: true, force: true });
}
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> ses seviyesi: olculerek -14 LUFS, video kopya");
process.exit(hata ? 1 : 0);
