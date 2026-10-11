"""Parcalari tek filme baglar: altyazi + ses + ardarda + siyah son.   v7.99.10

    python3 addon/arac/film_birlestir.py cikti.mp4 klasor1:senaryo1.json klasor2:senaryo2.json ... [--adim 3]
    python3 addon/arac/film_birlestir.py part1.mp4 orman:bolum1_orman.json:part1
    python3 addon/arac/film_birlestir.py part2.mp4 orman:bolum1_orman.json:part2 oda:bolum1_oda.json

--adim N: onizleme (blender_film --adim N ile cizilmis); video fps/N'de
akar, ses ve altyazi yine film zamaninda. Eksik kare varsa durur.

Her klasor blender_film.py ciktisi (kare/0001.png ... + yazilar.json).
Adimlar: altyazi (blender_film.altyazi_bas) -> ses (film_ses.py, ayni
senaryodan) -> parca.mp4; sonra parcalar ardarda, en sona 0.6 sn siyah
(dorduncu duvar: "ondan sonra bitsin"). YouTube icin H.264 + AAC,
+faststart (yukleme yarim kalsa da oynar).
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_film as F  # noqa: E402
import bedrock_onizleme as B  # noqa: E402
import film_ses  # noqa: E402

SIYAH_SON = 0.6
# loudnorm tek geciste hedefi tutturmuyor: 38 sn'lik Part 1 denemesinde
# -14 yerine -11.3 LUFS olculdu (v7.99.12). Bu yuzden film once kayipsiz
# sesle (FLAC) ara dosyaya yazilir, butunlesik yukseklik OLCULUR, fark
# dogrusal kazancla kapatilir (video kopyalanir, AAC yalniz bir kez).
HEDEF_LUFS = -14.0
SON_SES = "volume=%.2fdB,alimiter=limit=0.84:attack=2:release=60:level=false"
# Son ses zinciri (kullanicinin arastirmasi: "dovus videosunda muzik, vurus
# ve efekt ust uste biniyor, limiter sart"): yumusak kompresor -> YouTube
# hedefi -14 LUFS / -1 dBTP -> tepe sinirlayici. Hepsi ffmpeg, ucretsiz.
SES_ZINCIR = ("acompressor=threshold=-18dB:ratio=3:attack=5:release=120:makeup=2,"
              "loudnorm=I=-14:TP=-1.5:LRA=11,"
              "alimiter=limit=0.89:attack=2:release=60:level=false")


def parca(klasor, senaryo_yolu, adim=1, parca_adi=None):
    """parca_adi ("part1"/"part2"): senaryonun "parcalar" araligi; ses ve
    goruntu ayni araliktan kesilir (ses tam filmden uretilip dilimlenir,
    boylece kesme noktasindaki muzik/efekt dogal devam eder)."""
    sen = B.oku(os.path.abspath(senaryo_yolu))
    fps0 = sen.get("fps", 24)
    aralik = sen["parcalar"][parca_adi] if parca_adi else None
    F.altyazi_bas(klasor, adim, aralik)         # -> klasor/film.mp4 (sessiz)
    dilim = slice(None)
    if aralik:
        dilim = slice(int((aralik[0] - 1) / fps0 * film_ses.ORAN), int(aralik[1] / fps0 * film_ses.ORAN))
    ek = "_" + parca_adi if parca_adi else ""
    wav = os.path.join(klasor, "ses%s.wav" % ek)
    film_ses.yaz(film_ses.ses_kur(sen)[dilim], wav)
    # stem'ler: muzik / efekt / ortam ayri (Resolve Fairlight'ta son miksaj icin)
    for ad, k in film_ses.ses_kur(sen, katmanlar=True).items():
        film_ses.yaz(k[dilim], os.path.join(klasor, "stem%s_%s.wav" % (ek, ad)))
    cikti = os.path.join(klasor, "parca%s.mp4" % ek)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(klasor, "film.mp4"), "-i", wav,
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", cikti], check=True)
    return cikti, sen.get("fps", 24) / adim


KART_SURE = 2.5


def baslik_karti(klasor, senaryo_yolu, parca_adi, cikti_png, wh):
    """Parcanin araligina dusen "baslik" yazilarindan siyah kart (PNG).
    Mojang kilavuzu: baslik karti oyun iceriginin DISINDA olmali. Yoksa None."""
    from PIL import Image, ImageDraw, ImageFont
    sen = B.oku(os.path.abspath(senaryo_yolu))
    fps0 = sen.get("fps", 24)
    a, b = sen["parcalar"][parca_adi] if parca_adi else (1, 10 ** 9)
    yol = os.path.join(klasor, "yazilar.json")
    if not os.path.exists(yol):
        return None
    import json
    metin = [y["metin"] for y in json.load(open(yol, encoding="utf-8"))["yazilar"]
             if y.get("tur") == "baslik" and (a - 1) / fps0 <= y["t"] < b / fps0]
    if not metin:
        return None
    W, H = wh
    im = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(F.YAZI_TIPI, int(H * 0.12))
    yazi = "  ".join(metin)
    g = d.textlength(yazi, font=f)
    d.text(((W - g) / 2, H * 0.44), yazi, font=f, fill=(255, 255, 255))
    im.save(cikti_png)
    return cikti_png


def boyut(video):
    o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height", "-of", "csv=p=0", video], capture_output=True, text=True, check=True)
    return o.stdout.strip().replace(",", "x")


def main(argv):
    adim = 1
    if "--adim" in argv:
        i = argv.index("--adim")
        adim = int(argv[i + 1])
        argv = argv[:i] + argv[i + 2:]
    cikti = os.path.abspath(argv[0])
    parcalar, kartlar = [], []
    fps = 30
    for a in argv[1:]:
        k, s, *pa = a.split(":")              # klasor:senaryo[:part1]
        p, fps = parca(os.path.abspath(k), s, adim, pa[0] if pa else None)
        kart = baslik_karti(os.path.abspath(k), s, pa[0] if pa else None,
                            os.path.join(os.path.abspath(k), "baslik_karti.png"),
                            [int(x) for x in boyut(p).split("x")])
        if kart and not kartlar and not parcalar:
            kartlar.append(kart)              # yalniz filmin basinda
        parcalar.append(p)
    girdi, filtre = [], []
    j = 0
    for kart in kartlar:
        # kart: sessiz, yumusak giris/cikis; sahnenin ustune degil ONUNE
        girdi += ["-loop", "1", "-framerate", "%g" % fps, "-t", str(KART_SURE), "-i", kart,
                  "-f", "lavfi", "-t", str(KART_SURE), "-i", "anullsrc=r=48000:cl=stereo"]
        filtre.append("[%d:v]format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st=%g:d=0.3[k%d];[k%d][%d:a]"
                      % (j, KART_SURE - 0.3, j, j, j + 1))
        j += 2
    for p in parcalar:
        girdi += ["-i", p]
        filtre.append("[%d:v][%d:a]" % (j, j))
        j += 1
    n = len(parcalar) + len(kartlar)
    girdi += ["-f", "lavfi", "-t", str(SIYAH_SON), "-i", "color=c=black:s=%s:r=%g" % (boyut(parcalar[0]), fps),
              "-f", "lavfi", "-t", str(SIYAH_SON), "-i", "anullsrc=r=48000:cl=stereo"]
    filtre.append("[%d:v][%d:a]" % (j, j + 1))
    # ses zinciri filtre grafiginin ICINDE: ffmpeg -af ile -filter_complex'i
    # birlikte kabul etmiyor (cikis 234)
    fc = "".join(filtre) + "concat=n=%d:v=1:a=1[v][a0];[a0]%s[a]" % (n + 1, SES_ZINCIR)
    ara = cikti + ".ara.mkv"
    subprocess.run(["ffmpeg", "-y", "-v", "error"] + girdi +
                   ["-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-c:a", "flac", "-ar", "48000", ara], check=True)
    olcu, kazanc, sonra = ses_ayarla(ara, cikti)
    os.remove(ara)
    print("ses: once %.1f LUFS, kazanc %+.2f dB, sonra %.1f LUFS, tepe %.1f dBTP"
          % (olcu["I"], kazanc, sonra["I"], sonra["TP"]))
    print("film:", cikti)


def ses_ayarla(ara, cikti):
    """ara (video + kayipsiz ses) -> cikti (.mp4): video KOPYA, ses HEDEF_LUFS'a
    olculerek getirilir, AAC'ye bir kez cevrilir. (once, kazanc, sonra) doner."""
    olcu = yukseklik(ara)
    kazanc = 0.0
    if olcu["I"] > -50:                       # sessiz parcayi (test, bos ses) yukseltme
        # butunlesik yukseklik kazanca dogrusal degil (mutlak -70 LUFS kapisi
        # sessiz bloklari kazancla birlikte disari atiyor: -2.7 dB -> -13.5,
        # -14 degil). Kazanc yalniz sesle (hizli) olculerek yaklastirilir.
        kazanc = HEDEF_LUFS - olcu["I"]
        for _ in range(4):
            kazanc = max(-12.0, min(12.0, kazanc))
            dene = ara + ".flac"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", ara, "-map", "0:a", "-af", SON_SES % kazanc,
                            "-c:a", "flac", dene], check=True)
            fark = HEDEF_LUFS - yukseklik(dene)["I"]
            os.remove(dene)
            if abs(fark) < 0.15:
                break
            kazanc += fark
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", ara, "-map", "0:v", "-map", "0:a", "-c:v", "copy",
                    "-af", SON_SES % kazanc,
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", cikti], check=True)
    return olcu, kazanc, yukseklik(cikti)


def yukseklik(dosya):
    """EBU R128 butunlesik yukseklik (LUFS) ve gercek tepe (dBTP)."""
    c = subprocess.run(["ffmpeg", "-nostats", "-v", "info", "-i", dosya, "-map", "0:a",
                        "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    ozet = c[c.rindex("Summary:"):]
    i = float(ozet.split("I:")[1].split("LUFS")[0])
    tp = float(ozet.split("Peak:")[-1].split("dBFS")[0])
    return {"I": i, "TP": tp}


if __name__ == "__main__":
    main(sys.argv[1:])
