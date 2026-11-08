"""Begen / abone ol / zil cagri animasyonu -- saydam katman.        2026-11-08

Kullanici (2026-11-08): "like atma animasyonu ve abone olma animasyonu
yapalim ... izliyorlar ama abone olmuyorlar, like atmiyorlar ... videonun
belli dakikalarina ekleriz."

Blender'siz: Minecraft arayuzu (gri, kabartma kenarli) panelde Baris'in
yuzu (skininin 8x8 on yuzu + sapka katmani); piksel imlec sirayla begen'e,
ABONE OL'a ve zile tiklar. Begen maviye doner, dugme "ABONE OLUNDU" olur,
zil sallanir. YouTube'un logosu/simgesi KULLANILMAZ: simgeler kendi piksel
cizimimiz (marka katmani; REFERANS_MOJANG_KILAVUZ.md'deki ayni ilke).

    python3 addon/arac/cagri_animasyon.py <cikti_klasoru> [--skin yol]

Cikti: kare/%04d.png (RGBA 1920x1080), cagri.wav (48 kHz),
cagri.mov (ProRes 4444, alfali: kullanicinin kendi kurgu programi icin),
onizleme.mp4 (gri zemin ustunde, bakmak icin). Filme eklemek:
film_birlestir.py ... --cagri 35,95 (saniye).
"""
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ADDON = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YAZI = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SKIN = os.path.join(ADDON, "kaynak_doku", "film_aktor", "baris_iyilesmis.png")
ZIL_SES = os.path.join(ADDON, "kaynak_ses", "film", "impactBell_heavy_000.ogg")

W, H, FPS = 1920, 1080, 30
SURE = 4.4                       # sn
P = 6                            # bir "arayuz pikseli" (Minecraft GUI olcegi)
PANEL = (900, 200)               # en, boy
PANEL_Y = 650                    # ust kenar: altyazinin (0,86 H) ustunde kalir
PANEL_SAG = 60                   # sag kenar boslugu
GIRIS, CIKIS = (0.0, 0.35), (3.95, 4.3)
TIK = {"begen": 0.95, "abone": 1.65, "zil": 2.35}
YOL = [(0.35, None), (0.45, "begen"), (0.85, "begen"), (1.15, "begen"), (1.55, "abone"),
       (1.85, "abone"), (2.25, "zil")]          # (t, hedef): imlec hareket anahtarlari

# piksel simgeler (kendi cizimimiz). 1 = govde, 2 = koyu kenar
BASPARMAK = ["....11......",
             "...1221.....",
             "...1221.....",
             "..12221.....",
             "..122211111.",
             "1112222222221",
             "1212222222221",
             "1212222222211",
             "1212222222221",
             "1212222222211",
             "1212222222221",
             "1111111111111"]
ZIL = ["....1111....",
       "...122221...",
       "..12222221..",
       "..12222221..",
       "..12222221..",
       ".1222222221.",
       ".1222222221.",
       "122222222221",
       "111111111111",
       "....1221....",
       ".....11.....",
       "............"]
IMLEC = ["1.........",
         "11........",
         "121.......",
         "1221......",
         "12221.....",
         "122221....",
         "1222221...",
         "12222221..",
         "122222221.",
         "1222222221",
         "1222211111",
         "12121.....",
         "11.121....",
         "1..121....",
         "....121...",
         ".....11..."]


def _yumusak(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def yerlesim():
    """Panel ici kutular (panelin sol ustune gore): {ad: (x, y, en, boy)}."""
    return {"yuz": (24, 52, 96, 96), "begen": (150, 40, 120, 120),
            "abone": (300, 55, 380, 90), "zil": (730, 40, 120, 120)}


def durum(t):
    """t anindaki her sey: panel kaymasi (0 yerinde, 1 tamamen disarida),
    imlec (x, y, basili), begen/abone/zil durumu, zil acisi, sicrama olcegi."""
    if t < GIRIS[1]:
        kay = 1.0 - _yumusak((t - GIRIS[0]) / (GIRIS[1] - GIRIS[0]))
    elif t >= CIKIS[0]:
        kay = _yumusak((t - CIKIS[0]) / (CIKIS[1] - CIKIS[0]))
    else:
        kay = 0.0
    yer = yerlesim()

    def merkez(ad):
        x, y, w, h = yer[ad]
        return (x + w * 0.6, y + h * 0.65)
    imlec = None
    if YOL[0][0] <= t < CIKIS[0]:
        nokta = [(YOL[0][0], (PANEL[0] * 0.15, PANEL[1] + 60))] + [(tt, merkez(h)) for tt, h in YOL[1:]]
        if t >= nokta[-1][0]:
            ix, iy = nokta[-1][1]
        else:
            for (ta, pa), (tb, pb) in zip(nokta, nokta[1:]):
                if ta <= t < tb:
                    u = _yumusak((t - ta) / (tb - ta))
                    ix, iy = pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u
                    break
        basili = any(0 <= t - tk < 0.08 for tk in TIK.values())
        imlec = (ix, iy, basili)
    begen = t >= TIK["begen"]
    abone = t >= TIK["abone"]
    zil = t >= TIK["zil"]
    u = t - TIK["zil"]
    zil_aci = 18.0 * math.exp(-u / 0.25) * math.sin(u * 2 * math.pi * 5) if zil else 0.0
    sicra = {ad: (1.0 + 0.15 * math.exp(-(t - tk) / 0.07) if t >= tk else 1.0) for ad, tk in TIK.items()}
    return {"kay": kay, "imlec": imlec, "begen": begen, "abone": abone, "zil": zil,
            "zil_aci": zil_aci, "sicra": sicra}


def _piksel(desen, renk1, renk2, olcek):
    h, w = len(desen), len(desen[0])
    im = Image.new("RGBA", (w * olcek, h * olcek), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y, sat in enumerate(desen):
        for x, c in enumerate(sat):
            if c in "12":
                d.rectangle([x * olcek, y * olcek, (x + 1) * olcek - 1, (y + 1) * olcek - 1],
                            fill=renk1 if c == "1" else renk2)
    return im


def _kabartma(d, x, y, w, h, zemin, acik=(255, 255, 255, 255), koyu=(85, 85, 85, 255)):
    """Minecraft arayuz kutusu: siyah dis cizgi, ust-sol acik, alt-sag koyu."""
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=(0, 0, 0, 255))
    d.rectangle([x + P, y + P, x + w - 1 - P, y + h - 1 - P], fill=koyu)
    d.rectangle([x + P, y + P, x + w - 1 - 2 * P, y + h - 1 - 2 * P], fill=acik)
    d.rectangle([x + 2 * P, y + 2 * P, x + w - 1 - 2 * P, y + h - 1 - 2 * P], fill=zemin)


def yuz(skin=SKIN, olcek=12):
    s = Image.open(skin).convert("RGBA")
    y = s.crop((8, 8, 16, 16))
    sapka = s.crop((40, 8, 48, 16))
    y.alpha_composite(sapka)
    return y.resize((8 * olcek, 8 * olcek), Image.NEAREST)


def kare(t, yuz_im, yazi):
    dr = durum(t)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if dr["kay"] >= 1.0:
        return im
    pw, ph = PANEL
    x0 = int(W - PANEL_SAG - pw + dr["kay"] * (pw + PANEL_SAG + 10))
    pn = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    d = ImageDraw.Draw(pn)
    _kabartma(d, 0, 0, pw, ph, (198, 198, 198, 245))
    yer = yerlesim()
    x, y, w, h = yer["yuz"]
    d.rectangle([x - P, y - P, x + w + P - 1, y + h + P - 1], fill=(55, 55, 55, 255))
    pn.alpha_composite(yuz_im, (x, y))
    # begen
    x, y, w, h = yer["begen"]
    _kabartma(d, x, y, w, h, (139, 139, 139, 255))
    renk = ((60, 140, 255, 255), (25, 70, 170, 255)) if dr["begen"] else ((240, 240, 240, 255), (120, 120, 120, 255))
    ik = _piksel(BASPARMAK, renk[1], renk[0], 6)
    s_ = dr["sicra"]["begen"]
    ik = ik.resize((int(ik.width * s_), int(ik.height * s_)), Image.NEAREST)
    pn.alpha_composite(ik, (x + (w - ik.width) // 2, y + (h - ik.height) // 2 - 4))
    # abone ol
    x, y, w, h = yer["abone"]
    if dr["abone"]:
        _kabartma(d, x, y, w, h, (90, 90, 90, 255), acik=(150, 150, 150, 255), koyu=(40, 40, 40, 255))
        metin = "ABONE OLUNDU ✓"
    else:
        _kabartma(d, x, y, w, h, (200, 30, 30, 255), acik=(255, 110, 110, 255), koyu=(110, 10, 10, 255))
        metin = "ABONE OL"
    s_ = dr["sicra"]["abone"]
    f = yazi[min(len(yazi) - 1, int((s_ - 1.0) / 0.15 * 3))] if s_ > 1.0 else yazi[0]
    while d.textlength(metin, font=f) > w - 6 * P and f.size > 20:   # dugmeye sigsin
        f = ImageFont.truetype(YAZI, f.size - 2)
    gw = d.textlength(metin, font=f)
    d.text((x + (w - gw) / 2 + 3, y + h / 2 - f.size * 0.62 + 3), metin, font=f, fill=(40, 0, 0, 255))
    d.text((x + (w - gw) / 2, y + h / 2 - f.size * 0.62), metin, font=f, fill=(255, 255, 255, 255))
    # zil
    x, y, w, h = yer["zil"]
    _kabartma(d, x, y, w, h, (139, 139, 139, 255))
    renk = ((255, 205, 40, 255), (150, 100, 0, 255)) if dr["zil"] else ((240, 240, 240, 255), (120, 120, 120, 255))
    ik = _piksel(ZIL, renk[1], renk[0], 7).rotate(dr["zil_aci"], resample=Image.NEAREST, expand=True)
    pn.alpha_composite(ik, (x + (w - ik.width) // 2, y + (h - ik.height) // 2))
    if dr["zil"] and t - TIK["zil"] < 0.9:           # cinlama cizgileri
        a = int(255 * max(0.0, 1 - (t - TIK["zil"]) / 0.9))
        for k in (-1, 1):
            cx = x + w // 2 + k * 52
            d.rectangle([cx - 3, y + 34, cx + 3, y + 58], fill=(255, 205, 40, a))
    im.alpha_composite(pn, (x0, PANEL_Y))
    # imlec (panelle birlikte kayar)
    if dr["imlec"]:
        ix, iy, bas = dr["imlec"]
        c = _piksel(IMLEC, (0, 0, 0, 255), (255, 255, 255, 255), 4 if not bas else 3)
        im.alpha_composite(c, (int(x0 + ix), int(PANEL_Y + iy)))
    return im


# ---- ses ----
ORAN = 48000


def _tik(oran=ORAN):
    n = int(0.03 * oran)
    t = np.arange(n) / oran
    return (0.5 * np.sin(2 * math.pi * 2200 * t) * np.exp(-t / 0.004)
            + 0.25 * np.random.RandomState(4).uniform(-1, 1, n) * np.exp(-t / 0.002)).astype(np.float32)


def _pop(oran=ORAN):
    n = int(0.09 * oran)
    t = np.arange(n) / oran
    f = 500 + 900 * t / 0.09
    return (0.35 * np.sin(2 * math.pi * np.cumsum(f) / oran) * np.exp(-t / 0.04)).astype(np.float32)


def ses(sure=SURE, oran=ORAN):
    x = np.zeros((int(sure * oran) + oran // 2, 2), dtype=np.float32)

    def ekle(s, t, d=1.0):
        i = int(t * oran)
        j = min(len(x), i + len(s))
        x[i:j] += (s[:j - i] * d)[:, None] if s.ndim == 1 else s[:j - i] * d
    for ad, tk in TIK.items():
        ekle(_tik(oran), tk, 0.9)
        if ad != "zil":
            ekle(_pop(oran), tk + 0.02, 0.8)
    if os.path.exists(ZIL_SES):
        ham = subprocess.run(["ffmpeg", "-v", "error", "-i", ZIL_SES, "-f", "f32le", "-ac", "2", "-ar", str(oran), "-"],
                             capture_output=True, check=True).stdout
        ekle(np.frombuffer(ham, dtype=np.float32).reshape(-1, 2), TIK["zil"], 0.55)
    return np.clip(x, -1, 1)


def uret(cikti, skin=SKIN, video=True):
    os.makedirs(os.path.join(cikti, "kare"), exist_ok=True)
    yz = yuz(skin)
    yazi = [ImageFont.truetype(YAZI, s) for s in (38, 41, 44, 46)]
    n = int(round(SURE * FPS))
    for i in range(n):
        kare(i / FPS, yz, yazi).save(os.path.join(cikti, "kare", "%04d.png" % (i + 1)))
    x = ses()
    with wave.open(os.path.join(cikti, "cagri.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(ORAN)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    if video:
        kp = os.path.join(cikti, "kare", "%04d.png")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", kp, "-i", os.path.join(cikti, "cagri.wav"),
                        "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-c:a", "pcm_s16le",
                        "-shortest", os.path.join(cikti, "cagri.mov")], check=True)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=0x5a6e50:s=%dx%d:r=%d" % (W, H, FPS),
                        "-framerate", str(FPS), "-i", kp, "-i", os.path.join(cikti, "cagri.wav"),
                        "-filter_complex", "[0:v][1:v]overlay=shortest=1,format=yuv420p[v]", "-map", "[v]", "-map", "2:a",
                        "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-shortest",
                        os.path.join(cikti, "onizleme.mp4")], check=True)
    return n


if __name__ == "__main__":
    a = sys.argv[1:]
    sk = a[a.index("--skin") + 1] if "--skin" in a else SKIN
    print(uret(os.path.abspath(a[0]), sk), "kare ->", os.path.abspath(a[0]))
