/* BEGEN / ABONE CAGRI ANIMASYONU -- arac/cagri_animasyon.py + film_birlestir --cagri   2026-11-08

   Kullanici (2026-11-08): "like atma animasyonu ve abone olma animasyonu
   yapalim ... videonun belli dakikalarina ekleriz."

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Kareler: ilk ve son kare tamamen saydam (film gorunur), panel
      altyazinin ustunde; tiklamadan once begen gri / ABONE OL kirmizi,
      sonra begen mavi / ABONE OLUNDU gri; yazi dugmeye sigiyor.
   2. Ses: uc tiklama aninda ses var, arasi sessiz.
   3. Filme ekleme: sahte bir filmde katman tam istenen saniyede biniyor,
      oncesinde film degismiyor; film sesi kisilmiyor (normalize=0).
   4. YouTube logosu yok: simgeler kendi piksel desenimiz (dosya yok). */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ARAC = join(BURADA, "..", "arac");
const ORTAM = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const gecici = mkdtempSync(join(tmpdir(), "cagri-"));
const py = (kod) => JSON.parse(execFileSync("python3", ["-c",
  "import sys, json, os\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\n" + kod, ARAC, gecici],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

try {
  const r = py(`
import subprocess, wave
import numpy as np
from PIL import Image
import cagri_animasyon as C, film_birlestir as FB
k = sys.argv[2]
n = C.uret(os.path.join(k, "c"))
d = os.path.join(k, "c", "kare")
def a(t):
    return np.asarray(Image.open(os.path.join(d, "%04d.png" % (int(round(t * C.FPS)) + 1))).convert("RGBA")).astype(int)
yer = C.yerlesim()
x0 = C.W - C.PANEL_SAG - C.PANEL[0]
def renk(t, ad):
    x, y, w, h = yer[ad]
    b = a(t)[C.PANEL_Y + y + h // 2 - 8: C.PANEL_Y + y + h // 2 + 8, x0 + x + 12: x0 + x + w - 12]
    return b.reshape(-1, 4)[:, :3].mean(0).round().tolist()
def mavi(t):
    x, y, w, h = yer["begen"]
    b = a(t)[C.PANEL_Y + y: C.PANEL_Y + y + h, x0 + x: x0 + x + w].reshape(-1, 4)
    return int(((b[:, 2] > 200) & (b[:, 0] < 100)).sum())
# yazi dugmeye sigiyor: dugmenin hemen solu/sagi (panel zemini) beyaz yazi icermiyor
x, y, w, h = yer["abone"]
b2 = a(2.0)
kenar = np.concatenate([b2[C.PANEL_Y + y + 10: C.PANEL_Y + y + h - 10, x0 + x - 14: x0 + x - 2],
                        b2[C.PANEL_Y + y + 10: C.PANEL_Y + y + h - 10, x0 + x + w + 2: x0 + x + w + 14]]).reshape(-1, 4)
tasma = int(((kenar[:, :3] > 245).all(1)).sum())
ilk, son = a(0.0), np.asarray(Image.open(os.path.join(d, "%04d.png" % n)).convert("RGBA"))
alfa_y = np.nonzero(a(2.0)[..., 3].max(1))[0]
# ses
with wave.open(os.path.join(k, "c", "cagri.wav")) as w:
    x_ = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").reshape(-1, 2) / 32767.0
def tepe(t0, t1):
    return float(np.abs(x_[int(t0 * 48000): int(t1 * 48000)]).max())
# filme ekleme: 6 sn sahte film, cagri 2. saniyede
mov = os.path.join(k, "c", "cagri.mov")
g, ek, vc, ac = FB.cagri_filtre([2.0], mov, 2)     # 0: goruntu, 1: ses, 2: katman
fc = "[0:v]null[v];[1:a]anull[a0];" + ek + "[%s]anull[a]" % ac
cik = os.path.join(k, "film.mp4")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-t", "6", "-i", "color=c=0x305030:s=1920x1080:r=30",
                "-f", "lavfi", "-t", "6", "-i", "sine=f=220:r=48000"] + g +
               ["-filter_complex", fc, "-map", "[%s]" % vc, "-map", "[a]",
                "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", cik], check=True)
def film_kare(t):
    ham = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", cik, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(ham, dtype=np.uint8).reshape(1080, 1920, 3).astype(int)
def kirmizi(f):
    x, y, w, h = yer["abone"]
    b = f[C.PANEL_Y + y + 20: C.PANEL_Y + y + h - 20, x0 + x + 20: x0 + x + w - 20].reshape(-1, 3)
    return int(((b[:, 0] > 160) & (b[:, 1] < 80)).sum())
ham = subprocess.run(["ffmpeg", "-v", "error", "-i", cik, "-f", "f32le", "-ac", "1", "-ar", "48000", "-"], capture_output=True, check=True).stdout
s = np.frombuffer(ham, dtype=np.float32)
def rms(t0, t1):
    return float(np.sqrt((s[int(t0 * 48000): int(t1 * 48000)] ** 2).mean()))
print(json.dumps({"n": n, "ilk_alfa": int(ilk[..., 3].max()), "son_alfa": int(son[..., 3].max()),
                  "ust": int(alfa_y.min()), "alt": int(alfa_y.max()),
                  "begen_once": mavi(0.6), "begen_sonra": mavi(1.3),
                  "abone_once": renk(1.3, "abone"), "abone_sonra": renk(2.0, "abone"), "tasma": tasma,
                  "ses_tik": [tepe(tk - 0.01, tk + 0.06) for tk in C.TIK.values()], "ses_bos": tepe(0.2, 0.8),
                  "film_once": kirmizi(film_kare(1.0)), "film_sonra": kirmizi(film_kare(2.0 + 1.2)),
                  "film_ses_once": rms(0.5, 1.5), "film_ses_sira": rms(2.0 + 0.5, 2.0 + 0.8)}))`);

  console.log("=== 1. KARELER ===");
  kontrol("4,4 sn, 132 kare; ilk ve son kare tamamen saydam", r.n === 132 && r.ilk_alfa === 0 && r.son_alfa === 0,
          JSON.stringify([r.n, r.ilk_alfa, r.son_alfa]));
  kontrol("panel altyazinin (0,86 H = 929) ustunde", r.alt < 929 && r.ust > 500, JSON.stringify([r.ust, r.alt]));
  kontrol("begen tiklamadan once gri, sonra mavi", r.begen_once < 50 && r.begen_sonra > 1000,
          JSON.stringify([r.begen_once, r.begen_sonra]));
  kontrol("ABONE OL kirmizi -> ABONE OLUNDU gri", r.abone_once[0] - r.abone_once[1] > 80 &&
          Math.abs(r.abone_sonra[0] - r.abone_sonra[1]) < 30, JSON.stringify([r.abone_once, r.abone_sonra]));
  kontrol("ABONE OLUNDU yazisi dugmeye sigiyor (kenarda beyaz yazi pikseli yok)", r.tasma === 0, String(r.tasma));

  console.log("\n=== 2. SES ===");
  kontrol("uc tiklama aninda ses, oncesi sessiz", r.ses_tik.every((x) => x > 0.2) && r.ses_bos < 0.01,
          JSON.stringify([r.ses_tik, r.ses_bos]));

  console.log("\n=== 3. FILME EKLEME (--cagri) ===");
  kontrol("katman istenen saniyede biniyor, oncesinde film ayni", r.film_once === 0 && r.film_sonra > 1000,
          JSON.stringify([r.film_once, r.film_sonra]));
  // kaynak: ffmpeg sine (genlik 1/8) -> rms 0,0884; amix normalize ederse yariya iner
  kontrol("film sesi kisilmiyor (normalize=0): seviye kaynaktaki gibi", r.film_ses_once > 0.08 && r.film_ses_sira > 0.08,
          JSON.stringify([r.film_ses_once, r.film_ses_sira]));

  console.log("\n=== 4. MARKA ===");
  const kod = readFileSync(join(ARAC, "cagri_animasyon.py"), "utf8");
  kontrol("simgeler kod icinde piksel desen; disaridan logo/simge dosyasi yuklenmiyor",
          kod.includes("BASPARMAK = [") && !/youtube.*\.(png|svg)/i.test(kod));
} finally {
  rmSync(gecici, { recursive: true, force: true });
}
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> cagri animasyonu: saydam, durumlar dogru, filme dogru saniyede biniyor");
process.exit(hata ? 1 : 0);
