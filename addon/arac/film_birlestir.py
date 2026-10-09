"""Parcalari tek filme baglar: altyazi + ses + ardarda + siyah son.   v7.99.10

    python3 addon/arac/film_birlestir.py cikti.mp4 klasor1:senaryo1.json klasor2:senaryo2.json ... [--adim 3]

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


def parca(klasor, senaryo_yolu, adim=1):
    sen = B.oku(os.path.abspath(senaryo_yolu))
    F.altyazi_bas(klasor, adim)                 # -> klasor/film.mp4 (sessiz)
    wav = os.path.join(klasor, "ses.wav")
    film_ses.yaz(film_ses.ses_kur(sen), wav)
    cikti = os.path.join(klasor, "parca.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(klasor, "film.mp4"), "-i", wav,
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", cikti], check=True)
    return cikti, sen.get("fps", 24) / adim


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
    parcalar = []
    fps = 30
    for a in argv[1:]:
        k, s = a.split(":", 1)
        p, fps = parca(os.path.abspath(k), s, adim)
        parcalar.append(p)
    girdi, filtre = [], []
    for i, p in enumerate(parcalar):
        girdi += ["-i", p]
        filtre.append("[%d:v][%d:a]" % (i, i))
    n = len(parcalar)
    girdi += ["-f", "lavfi", "-t", str(SIYAH_SON), "-i", "color=c=black:s=%s:r=%g" % (boyut(parcalar[0]), fps),
              "-f", "lavfi", "-t", str(SIYAH_SON), "-i", "anullsrc=r=48000:cl=stereo"]
    filtre.append("[%d:v][%d:a]" % (n, n + 1))
    fc = "".join(filtre) + "concat=n=%d:v=1:a=1[v][a]" % (n + 1)
    subprocess.run(["ffmpeg", "-y", "-v", "error"] + girdi +
                   ["-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", cikti], check=True)
    print("film:", cikti)


if __name__ == "__main__":
    main(sys.argv[1:])
