/* BEGEN / ABONE CAGRI ANIMASYONU -- arac/cagri_animasyon.py + film_birlestir --cagri   2026-11-08

   Kullanici (2026-11-08): "like atma animasyonu ve abone olma animasyonu
   yapalim ... videonun belli dakikalarina ekleriz." 2. tur: "uzerinde
   birazcik daha ugras, guzel yapalim."

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Kareler: ilk ve son kare tamamen saydam; her sey altyazinin (0,86 H)
      ustunde, ekranin ortasi (filmin olayi) hic kapanmiyor; tiklamadan once
      begen gri / ABONE OL kirmizi, sonra begen mavi / ABONE OLUNDU gri;
      yazi dugmeye sigiyor; Baris goz kirpiyor; basarim bildirimi geliyor
      ve gidiyor.
   2. Yazi tipi: her harf 11 satirlik hucrede, satirlar esit genislikte;
      animasyonun butun metinleri ve Turk alfabesi yazi tipinde var.
   3. Ses: uc tiklama aninda ses var, hic kirpilmiyor.
   4. Filme ekleme -- FILM DURUR (kullanici, 2026-11-22: "abone ol begen
      geldigi an animasyon dursun, bittikten sonra baslasin"): kayipsiz
      sahte filmde kare dizisi bire bir "film -> son kare SURE boyunca
      donuk -> kaldigi yerden"; film sesi duraklamada susuyor, kenarda tik
      yok; katman donmus karenin ustunde; film sesi kisilmiyor (normalize=0).
   5. YouTube logosu yok: simgeler ve yazi tipi kod icinde kendi desenimiz. */
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
def kutu(t, ad):
    x, y, w, h = yer[ad]
    return a(t)[C.PANEL_Y + y: C.PANEL_Y + y + h, x0 + x: x0 + x + w].reshape(-1, 4)
def renk(t, ad):
    x, y, w, h = yer[ad]
    b = a(t)[C.PANEL_Y + y + h // 2 - 8: C.PANEL_Y + y + h // 2 + 8, x0 + x + 12: x0 + x + w - 12]
    return b.reshape(-1, 4)[:, :3].mean(0).round().tolist()
def mavi(t):
    b = kutu(t, "begen")
    return int(((b[:, 2] > 200) & (b[:, 0] < 100)).sum())
def goz(t):                                   # yuzdeki acik mavi goz pikselleri (8cd2ff)
    b = kutu(t, "yuz")
    return int(((b[:, 2] > 200) & (b[:, 0] > 100) & (b[:, 0] < 180)).sum())
tb = C.TIK["begen"]; ta = C.TIK["abone"]
x, y, w, h = yer["abone"]
b2 = a(ta + 1.2)
kenar = np.concatenate([b2[C.PANEL_Y + y + 10: C.PANEL_Y + y + h - 10, x0 + x - 14: x0 + x - 2],
                        b2[C.PANEL_Y + y + 10: C.PANEL_Y + y + h - 10, x0 + x + w + 2: x0 + x + w + 14]]).reshape(-1, 4)
tasma = int(((kenar[:, :3] > 245).all(1)).sum())
son = np.asarray(Image.open(os.path.join(d, "%04d.png" % n)).convert("RGBA"))
alt, orta = 0, 0
for t in np.arange(0.0, C.SURE, 0.1):
    al = a(t)[..., 3]
    ys = np.nonzero(al.max(1))[0]
    if len(ys):
        alt = max(alt, int(ys.max()))
    orta += int(al[200:600, 300:1000].sum())
def tost(t):
    return int(a(t)[C.TOST_UST: C.TOST_UST + C.TOST[1], C.W - C.TOST_SAG - C.TOST[0]: C.W - C.TOST_SAG, 3].mean())
# yazi tipi
hucre = all(bas + len(sat) <= 11 and len(set(len(s) for s in sat)) == 1 for bas, sat in C.YAZI_TIPI.values())
metinler = [C.SOHBET_METNI, C.TOST_BASLIK, C.TOST_ALT, "+1", "1"] + list(C.DUGME)
eksik = sorted({c for m in metinler for c in m if c not in C.YAZI_TIPI})
alfabe = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZabcçdefgğhıijklmnoöprsştuüvyz0123456789"
alfabe_eksik = [c for c in alfabe if c not in C.YAZI_TIPI]
# ses
with wave.open(os.path.join(k, "c", "cagri.wav")) as wv:
    x_ = np.frombuffer(wv.readframes(wv.getnframes()), dtype="<i2").reshape(-1, 2) / 32767.0
def tepe(t0, t1):
    return float(np.abs(x_[int(t0 * 48000): int(t1 * 48000)]).max())
# filme ekleme (2026-11-22, kullanici: "abone ol begen geldigi an animasyon
# dursun, bittikten sonra baslasin"): cagri aninda FILM DURUR. Sahte film:
# zemin + ustte saga kayan beyaz kutu, her kare farkli. KAYIPSIZ yazilir
# (ffv1 + pcm): kareler ozetle, ses ornek ornek karsilastirilir.
import hashlib
mov = os.path.join(k, "c", "cagri.mov")
def yaz(cik, boy, sure, ara, cv, ca, g=()):
    # kutu her karede 2 px (n: kare numarasi): t ile kaydirinca overlay yuv420p'de
    # x'i cift sayiya yuvarliyor, ardisik kareler ayni cikiyordu (olculdu)
    kutu = (20, 20, 2, 80) if boy == "480x180" else (80, 80, 6, 100)
    fc = ("color=c=white:s=%dx%d:r=30[kutu];[0:v][kutu]overlay=x='%d*n':y=%d:shortest=1[v];[1:a]anull[a0];" % kutu
          + ara + "[%s]anull[a]" % ca)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-t", str(sure), "-i", "color=c=0x305030:s=%s:r=30" % boy,
                    "-f", "lavfi", "-t", str(sure), "-i", "sine=f=220:r=48000"] + list(g) +
                   ["-filter_complex", fc, "-map", "[%s]" % cv, "-map", "[a]", "-c:v", "ffv1", "-c:a", "pcm_s16le", cik], check=True)
def ozetler(cik):
    ham = subprocess.run(["ffmpeg", "-v", "error", "-i", cik, "-f", "rawvideo", "-pix_fmt", "yuv420p", "-"], capture_output=True, check=True).stdout
    n = 480 * 180 * 3 // 2
    return [hashlib.md5(ham[i:i + n]).hexdigest() for i in range(0, len(ham), n)]
def ses(cik):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", cik, "-f", "f32le", "-ac", "1", "-ar", "48000", "-"],
                                        capture_output=True, check=True).stdout, dtype=np.float32)
def rms(s_, t0, t1):
    return float(np.sqrt((s_[int(t0 * 48000): int(t1 * 48000)] ** 2).mean()))
def tepe_(s_, t0, t1):
    return float(np.abs(s_[int(t0 * 48000): int(t1 * 48000)]).max())
# (a) yalniz durdurma, iki duraklama (1. ve 3. saniye): kare dizisi bire bir beklenen mi
S_ = C.SURE
ref = os.path.join(k, "ref.mkv")
yaz(ref, "480x180", 6, "", "v", "a0")
dz, vd, ad, anlar = FB.durdurma_filtre([3.0, 1.0], S_, 30)     # sirasiz verilir, kendisi siralar
dur = os.path.join(k, "dur.mkv")
yaz(dur, "480x180", 6, dz, vd, ad)
R, D = ozetler(ref), ozetler(dur)
tut = int(round(S_ * 30))
bek = R[:30] + [R[29]] * tut + R[30:90] + [R[89]] * tut + R[90:]
sd = ses(dur)
dur_ol = {"kare_ayni": D == bek, "kare": len(D), "bek": len(bek), "film_farkli": len(set(R)) == len(R), "anlar": anlar,
          "sure": len(sd) / 48000.0,
          "ses": [rms(sd, 0.1, 0.9), rms(sd, 1.02, 1 + S_ - 0.02), rms(sd, 1 + S_ + 0.1, 3 + S_ - 0.1),
                  rms(sd, 3 + S_ + 0.02, 3 + 2 * S_ - 0.02), rms(sd, 3 + 2 * S_ + 0.1, 6 + 2 * S_ - 0.1)],
          "kenar": max(tepe_(sd, 0.998, 1.0), tepe_(sd, 1 + S_, 1 + S_ + 0.002),
                       tepe_(sd, 3 + S_ - 0.002, 3 + S_), tepe_(sd, 3 + 2 * S_, 3 + 2 * S_ + 0.002))}
# (b) durdurma + cagri katmani, tam boyut: katman donmus karenin ustunde
dz, vd, ad, an = FB.durdurma_filtre([2.0], S_, 30)
g, ek, vc, ac = FB.cagri_filtre(an, mov, 2, v=vd, a=ad)     # 0: goruntu, 1: ses, 2: katman
cik = os.path.join(k, "film.mkv")
yaz(cik, "1920x1080", 4, dz + ek, vc, ac, g)
def film_kare(t):
    ham = subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.4f" % (t + 1 / 60), "-i", cik, "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    if not ham:                               # video o ana kadar surmuyor (film durmadiysa): olcu dusmeli, cokmemeli
        return np.full((1080, 1920, 3), -1)
    return np.frombuffer(ham, dtype=np.uint8).reshape(1080, 1920, 3).astype(int)
def kirmizi(f):
    x, y, w, h = yer["abone"]
    b = f[C.PANEL_Y + y + 20: C.PANEL_Y + y + h - 20, x0 + x + 20: x0 + x + w - 20].reshape(-1, 3)
    return int(((b[:, 0] > 160) & (b[:, 1] < 80)).sum())
s = ses(cik)
kb = [film_kare(t)[100:180, :1300] for t in (2.0 - 1 / 30, 2.0 + 0.5, 2.0 + 4.0)]
cg_ol = {"anlar": an, "once": kirmizi(film_kare(1.0)), "ara": kirmizi(film_kare(2.0 + 1.2)),
         "sonra": kirmizi(film_kare(2.0 + S_ + 0.5)),
         "donuk": bool(np.array_equal(kb[0], kb[1]) and np.array_equal(kb[0], kb[2])),
         "ses_once": rms(s, 0.5, 1.5), "ses_sonra": rms(s, 2.0 + S_ + 0.3, 2.0 + S_ + 1.0)}
print(json.dumps({"n": n, "beklenen": int(round(C.SURE * C.FPS)), "ilk_alfa": int(a(0.0)[..., 3].max()), "son_alfa": int(son[..., 3].max()),
                  "alt": alt, "orta": orta,
                  "begen_once": mavi(tb - 0.2), "begen_sonra": mavi(tb + 0.4),
                  "abone_once": renk(C.PARLAMA[0] - 0.05, "abone"), "abone_sonra": renk(ta + 1.2, "abone"), "tasma": tasma,
                  "goz_acik": goz(0.6), "goz_kirpik": goz(C.KIRP[0] + 0.03),
                  "tost": [tost(C.TOST_ZAMAN[0] - 0.1), tost(C.TOST_ZAMAN[0] + 0.8), tost(C.TOST_ZAMAN[1] + 0.1)],
                  "hucre": hucre, "eksik": eksik, "alfabe_eksik": alfabe_eksik,
                  "ses_tik": [tepe(tk - 0.01, tk + 0.06) for tk in C.TIK.values()], "ses_tepe": tepe(0, C.SURE),
                  "dur": dur_ol, "cg": cg_ol, "cagri_sure": S_}))`);

  console.log("=== 1. KARELER ===");
  kontrol("6 sn; ilk ve son kare tamamen saydam", r.n === r.beklenen && r.ilk_alfa === 0 && r.son_alfa === 0,
          JSON.stringify([r.n, r.ilk_alfa, r.son_alfa]));
  kontrol("hicbir sey altyazinin (0,86 H = 929) ustune inmiyor", r.alt < 929, String(r.alt));
  kontrol("ekranin ortasi (filmin olayi) hic kapanmiyor", r.orta === 0, String(r.orta));
  kontrol("begen tiklamadan once gri, sonra mavi", r.begen_once < 50 && r.begen_sonra > 1000,
          JSON.stringify([r.begen_once, r.begen_sonra]));
  kontrol("ABONE OL kirmizi -> ABONE OLUNDU gri", r.abone_once[0] - r.abone_once[1] > 80 &&
          Math.abs(r.abone_sonra[0] - r.abone_sonra[1]) < 30, JSON.stringify([r.abone_once, r.abone_sonra]));
  kontrol("ABONE OLUNDU yazisi dugmeye sigiyor (kenarda beyaz yazi pikseli yok)", r.tasma === 0, String(r.tasma));
  kontrol("Baris goz kirpiyor (gozler kapaninca acik mavi piksel kalmiyor)", r.goz_acik > 100 && r.goz_kirpik === 0,
          JSON.stringify([r.goz_acik, r.goz_kirpik]));
  kontrol("basarim bildirimi abone olunca gelir, sonra gider", r.tost[0] === 0 && r.tost[1] > 200 && r.tost[2] === 0,
          JSON.stringify(r.tost));

  console.log("\n=== 2. YAZI TIPI ===");
  kontrol("her harf 11 satirlik hucrede, satirlari esit genislikte", r.hucre);
  kontrol("animasyonun butun metinleri yazi tipinde var", r.eksik.length === 0, JSON.stringify(r.eksik));
  kontrol("Turk alfabesinin buyuk/kucuk harfleri ve rakamlar tam (metin degisirse)", r.alfabe_eksik.length === 0,
          JSON.stringify(r.alfabe_eksik));

  console.log("\n=== 3. SES ===");
  kontrol("uc tiklama aninda ses var, hic kirpilmiyor", r.ses_tik.every((x) => x > 0.2) && r.ses_tepe < 0.98,
          JSON.stringify([r.ses_tik, r.ses_tepe]));

  console.log("\n=== 4. FILME EKLEME: CAGRI ANINDA FILM DURUR (--cagri) ===");
  // Kullanici (2026-11-22): "abone ol begen geldigi an animasyon dursun, bittikten sonra baslasin."
  const D = r.dur, S = r.cagri_sure;
  kontrol("sahte filmin her karesi farkli (donma olcusu anlamli)", D.film_farkli);
  kontrol("kare dizisi bire bir: film -> son kare " + S + " sn donuk -> kaldigi yerden, kare atlanmiyor (iki duraklama)",
          D.kare_ayni, JSON.stringify([D.kare, D.bek]));
  kontrol("video her cagri icin " + S + " sn uzuyor", Math.abs(D.sure - (6 + 2 * S)) < 0.01, String(D.sure));
  kontrol("cagri anlari duraklamaya gore kayiyor (sirasiz verilse de)",
          JSON.stringify(D.anlar) === JSON.stringify([1.0, 3.0 + S]), JSON.stringify(D.anlar));
  // kaynak: ffmpeg sine (genlik 1/8) -> rms 0,0884
  kontrol("film sesi duraklamada susuyor, oncesinde, arada ve sonrasinda kaynaktaki seviyede",
          D.ses[1] < 1e-4 && D.ses[3] < 1e-4 && [0, 2, 4].every((i) => D.ses[i] > 0.08), JSON.stringify(D.ses));
  kontrol("kesimde ve donuste tik yok (KENAR_MS gecisi)", D.kenar < 0.04, String(D.kenar));
  const G = r.cg;
  kontrol("katman donmus karenin ustunde; oncesinde ve film yeniden akinca yok",
          G.once === 0 && G.ara > 1000 && G.sonra === 0, JSON.stringify([G.once, G.ara, G.sonra]));
  kontrol("katman varken goruntu donuk (duraklamadan onceki son kare)", G.donuk);
  // amix normalize ederse film sesi yariya iner
  kontrol("film sesi kisilmiyor (normalize=0): duraklamadan once ve sonra kaynaktaki gibi",
          G.ses_once > 0.08 && G.ses_sonra > 0.08, JSON.stringify([G.ses_once, G.ses_sonra]));

  console.log("\n=== 4b. HER VIDEODA 3 KEZ (varsayilan) ===");
  // Kullanici (2026-11-08): "bundan sonraki her videoda bunu ekleyelim, 3 tane olsun, farkli yerlerde."
  const v = py(`
import film_birlestir as FB, cagri_animasyon as C
z = FB.cagri_zamanlari(76.7, 2.5, 0.6, C.SURE)
kisa = FB.cagri_zamanlari(8.0, 2.5, 0.6, C.SURE)
kod = open(os.path.join(sys.argv[1], "film_birlestir.py"), encoding="utf-8").read()
ana = kod[kod.index("def main("):]
g, f, _, _ = FB.cagri_filtre([3.0], "x.mov", 5, boyut="960x540")
print(json.dumps({"z": z, "kisa": kisa, "sure": C.SURE,
                  "durur": "durdurma_filtre(" in ana and "cagri_filtre(" in ana
                           and ana.index("durdurma_filtre(") < ana.index("cagri_filtre("),
                  "varsayilan": "if cagri is None:" in ana and "cagri_zamanlari(" in ana,
                  "yok": '== "yok"' in ana, "olcek": "scale=960:540" in f}))`);
  const z = v.z;
  kontrol("~77 sn'lik videoda 3 kez: baslik kartindan sonra, siyah sondan once, ust uste binmeden",
          z.length === 3 && z[0] >= 3.0 && z[2] + v.sure <= 76.7 - 0.6 &&
          z[1] - z[0] >= v.sure + 1 && z[2] - z[1] >= v.sure + 1, JSON.stringify(z));
  kontrol("videonun basina, ortasina ve sonuna yayiliyor (%15 / %50 / %85)",
          Math.abs(z[0] + v.sure / 2 - 0.15 * 76.7) < 1 && Math.abs(z[1] + v.sure / 2 - 0.5 * 76.7) < 1 &&
          Math.abs(z[2] + v.sure / 2 - 0.85 * 76.7) < 1, JSON.stringify(z));
  kontrol("sigmayan kisa onizlemede eklenmiyor", v.kisa.length === 0, JSON.stringify(v.kisa));
  kontrol("film_birlestir --cagri verilmezse varsayilan 3 an; --cagri yok kapatir", v.varsayilan && v.yok);
  kontrol("film_birlestir her cagride once filmi durduruyor, katmani donmus karenin ustune koyuyor", v.durur);
  kontrol("taslak (kucuk cozunurluk) filmde katman filmin boyutuna olceklenir", v.olcek);

  console.log("\n=== 5. MARKA ===");
  const kod = readFileSync(join(ARAC, "cagri_animasyon.py"), "utf8");
  kontrol("simgeler ve yazi tipi kod icinde kendi desenimiz; disaridan logo/yazi tipi dosyasi yuklenmiyor",
          kod.includes("BASPARMAK = [") && kod.includes("YAZI_TIPI = {") && !/\.ttf|youtube.*\.(png|svg)/i.test(kod));
} finally {
  rmSync(gecici, { recursive: true, force: true });
}
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> cagri animasyonu: saydam, durumlar dogru, filme dogru saniyede biniyor");
process.exit(hata ? 1 : 0);
