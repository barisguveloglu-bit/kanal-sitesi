"""Begen / abone ol / zil cagri animasyonu -- saydam katman.     2026-11-08 (2. tur)

Kullanici (2026-11-08): "like atma animasyonu ve abone olma animasyonu
yapalim ... videonun belli dakikalarina ekleriz." Ilk onizlemeden sonra:
"uzerinde birazcik daha ugras, guzel yapalim."

Blender'siz, piksel piksel cizilir. Minecraft arayuzu havasinda ama butun
cizim ve yazi tipi BIZIM: Mojang'in yazi tipi/dokusu yok, YouTube logosu
yok (marka katmani; REFERANS_MOJANG_KILAVUZ.md'deki ilke).

  0,00  panel sagdan esnek bir kayisla girer (hafif tasip oturur), golgeli
  0,30  ustunde sohbet satiri: "<Baris> Begen ve abone ol!"
  0,55  piksel imlec kavisli yollarla dolasir; uzerine geldigi dugme parlar
  1,25  BEGEN: basparmak maviye doner, yaylanir; halka, kivilcim, "+1"
  1,55  ABONE OL uzerinden isik suzulur (dikkat cekmek icin)
  2,15  ABONE OL: beyaz parlar, "ABONE OLUNDU" + tik cizilir, konfeti;
        sag ustte "Basarim kazanildi! / Kanala abone oldun!" bildirimi
  3,05  ZIL: sallanir, altina doner, ses dalgalari, kirmizi "1" rozeti
  Baris'in yuzu her tiklamada basini sallar, iki kez goz kirpar.
  5,30  hepsi geri cekilerek cikar; son kareler tamamen saydam.
Sesler: kayis (Kenney kumas, CC0), tik ve pop (sentez), begen ciglik ve
abone arpeji (8-bit, sentez), zil (Kenney, CC0, inceltilmis + sentez cin).

    python3 addon/arac/cagri_animasyon.py <cikti_klasoru> [--skin yol] [--zemin kare.png]

Cikti: kare/%04d.png (RGBA 1920x1080), cagri.wav (48 kHz), cagri.mov
(ProRes 4444, alfali: kullanicinin kendi kurgu programi icin), onizleme.mp4
(--zemin verilirse o karenin ustunde). Filme eklemek:
film_birlestir.py ... --cagri 35,95 (bitmis filmin saniyeleri).
"""
import math
import os
import random
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw

ADDON = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIN = os.path.join(ADDON, "kaynak_doku", "film_aktor", "baris_iyilesmis.png")
SES = os.path.join(ADDON, "kaynak_ses", "film")

W, H, FPS = 1920, 1080, 30
P = 6                            # bir "arayuz pikseli"
SURE = 6.0                       # sn

# ---- yerlesim (piksel) ----
PANEL = (820, 180)               # en, boy
PANEL_SAG = 60                   # sag kenar boslugu
PANEL_Y = 700                    # alt kenar 880: altyazi (0,86 H = 929) ustunde
SOHBET_Y = 640                   # sohbet satirinin ustu (panelin ustunde)
TOST = (560, 128)                # basarim bildirimi
TOST_UST, TOST_SAG = 40, 40
ALT_SINIR = 920                  # hicbir sey bunun altina inmez (altyazi 0,86 H = 929'da)

# ---- metinler (yazi tipinde olmayan harf HATA verir) ----
SOHBET_METNI = "<Barış> Beğen ve abone ol!"
DUGME = ("ABONE OL", "ABONE OLUNDU")
TOST_BASLIK = "Başarım kazanıldı!"
TOST_ALT = "Kanala abone oldun!"

# ---- zaman (sn) ----
GIRIS = (0.0, 0.45)
SOHBET = (0.30, 5.30)
TIK = {"begen": 1.25, "abone": 2.15, "zil": 3.05}
PARLAMA = (1.55, 1.95)
TOST_ZAMAN = (2.40, 4.70)
KIRP = (0.95, 4.05)
IMLEC_ZAMAN = (0.55, 3.75)
CIKIS = (5.30, 5.75)

# ---- renkler ----
BEYAZ = (255, 255, 255, 255)
SARI = (255, 255, 85, 255)        # basarim basligi
MAVI, MAVI_KOYU = (60, 140, 255, 255), (25, 70, 170, 255)
ALTIN, ALTIN_KOYU = (255, 205, 40, 255), (150, 100, 0, 255)
KIRMIZI = (200, 30, 30, 255)

# ============================================================
# piksel yazi tipi (kendi cizimimiz). Hucre 11 satir: 0-1 ust isaret,
# 2-8 buyuk harf (taban 8), 4-8 kucuk harf govdesi, 9-10 kuyruk.
# ============================================================
_O = [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."]
_U = ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."]
_S = [".####", "#....", "#....", ".###.", "....#", "....#", "####."]
_C = [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."]
_G = [".####", "#....", "#....", "#..##", "#...#", "#...#", ".###."]
_KUYRUK = ["..#..", ".#..."]
YAZI_TIPI = {
    "A": (2, [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"]),
    "B": (2, ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."]),
    "C": (2, _C), "Ç": (2, _C + _KUYRUK),
    "D": (2, ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."]),
    "E": (2, ["#####", "#....", "#....", "####.", "#....", "#....", "#####"]),
    "F": (2, ["#####", "#....", "#....", "####.", "#....", "#....", "#...."]),
    "G": (2, _G), "Ğ": (0, ["#...#", ".###."] + _G),
    "H": (2, ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"]),
    "I": (2, ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"]),
    "İ": (0, [".#.", "..."] + ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"]),
    "J": (2, ["....#", "....#", "....#", "....#", "....#", "#...#", ".###."]),
    "K": (2, ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"]),
    "L": (2, ["#....", "#....", "#....", "#....", "#....", "#....", "#####"]),
    "M": (2, ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"]),
    "N": (2, ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"]),
    "O": (2, _O), "Ö": (0, [".#.#.", "....."] + _O),
    "P": (2, ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."]),
    "Q": (2, [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"]),
    "R": (2, ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"]),
    "S": (2, _S), "Ş": (2, _S + _KUYRUK),
    "T": (2, ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."]),
    "U": (2, _U), "Ü": (0, [".#.#.", "....."] + _U),
    "V": (2, ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."]),
    "W": (2, ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"]),
    "X": (2, ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"]),
    "Y": (2, ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."]),
    "Z": (2, ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"]),
    "a": (4, [".###.", "....#", ".####", "#...#", ".####"]),
    "b": (2, ["#....", "#....", "#.##.", "##..#", "#...#", "#...#", "####."]),
    "c": (4, [".###.", "#...#", "#....", "#...#", ".###."]),
    "ç": (4, [".###.", "#...#", "#....", "#...#", ".###."] + _KUYRUK),
    "d": (2, ["....#", "....#", ".##.#", "#..##", "#...#", "#...#", ".####"]),
    "e": (4, [".###.", "#...#", "#####", "#....", ".####"]),
    "f": (2, ["..##", ".#..", "####", ".#..", ".#..", ".#..", ".#.."]),
    "g": (4, [".####", "#...#", "#...#", "#...#", ".####", "....#", "####."]),
    "ğ": (1, ["#...#", ".###.", ".....", ".####", "#...#", "#...#", "#...#", ".####", "....#", "####."]),
    "h": (2, ["#....", "#....", "#.##.", "##..#", "#...#", "#...#", "#...#"]),
    "ı": (4, ["#", "#", "#", "#", "#"]),
    "i": (2, ["#", ".", "#", "#", "#", "#", "#"]),
    "j": (2, ["....#", ".....", "....#", "....#", "....#", "....#", "#...#", ".###."]),
    "k": (2, ["#...", "#...", "#..#", "#.#.", "##..", "#.#.", "#..#"]),
    "l": (2, ["#.", "#.", "#.", "#.", "#.", "#.", ".#"]),
    "m": (4, ["##.#.", "#.#.#", "#.#.#", "#...#", "#...#"]),
    "n": (4, ["####.", "#...#", "#...#", "#...#", "#...#"]),
    "o": (4, [".###.", "#...#", "#...#", "#...#", ".###."]),
    "ö": (2, [".#.#.", ".....", ".###.", "#...#", "#...#", "#...#", ".###."]),
    "p": (4, ["#.##.", "##..#", "#...#", "####.", "#....", "#....", "#...."]),
    "q": (4, [".##.#", "#..##", "#...#", ".####", "....#", "....#", "....#"]),
    "r": (4, ["#.##.", "##..#", "#....", "#....", "#...."]),
    "s": (4, [".####", "#....", ".###.", "....#", "####."]),
    "ş": (4, [".####", "#....", ".###.", "....#", "####."] + _KUYRUK),
    "t": (2, ["#..", "#..", "###", "#..", "#..", "#..", ".##"]),
    "u": (4, ["#...#", "#...#", "#...#", "#...#", ".####"]),
    "ü": (2, [".#.#.", ".....", "#...#", "#...#", "#...#", "#...#", ".####"]),
    "v": (4, ["#...#", "#...#", "#...#", ".#.#.", "..#.."]),
    "w": (4, ["#...#", "#...#", "#.#.#", "#.#.#", ".#.#."]),
    "x": (4, ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"]),
    "y": (4, ["#...#", "#...#", "#...#", "#...#", ".####", "....#", "####."]),
    "z": (4, ["#####", "...#.", "..#..", ".#...", "#####"]),
    "0": (2, [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."]),
    "1": (2, ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"]),
    "2": (2, [".###.", "#...#", "....#", "..##.", ".#...", "#....", "#####"]),
    "3": (2, [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."]),
    "4": (2, ["...##", "..#.#", ".#..#", "#...#", "#####", "....#", "....#"]),
    "5": (2, ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."]),
    "6": (2, ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."]),
    "7": (2, ["#####", "#...#", "....#", "...#.", "..#..", "..#..", "..#.."]),
    "8": (2, [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."]),
    "9": (2, [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."]),
    "<": (2, ["...#", "..#.", ".#..", "#...", ".#..", "..#.", "...#"]),
    ">": (2, ["#...", ".#..", "..#.", "...#", "..#.", ".#..", "#..."]),
    "!": (2, ["#", "#", "#", "#", "#", ".", "#"]),
    "?": (2, [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."]),
    ".": (8, ["#"]),
    ",": (8, ["#", "#"]),
    ":": (4, ["#", ".", ".", ".", "#"]),
    "-": (5, ["####"]),
    "+": (3, ["..#..", "..#..", "#####", "..#..", "..#.."]),
    "'": (2, ["#", "#"]),
    " ": (2, ["..."]),
}
_METIN = {}


def metin_genislik(metin, olcek):
    """Golgesiz genislik (piksel)."""
    if not metin:
        return 0
    return (sum(len(YAZI_TIPI[c][1][0]) + 1 for c in metin) - 1) * olcek


def metin_resmi(metin, olcek, renk=BEYAZ, golge=True):
    """Metnin resmi; hucrenin 0. satiri resmin ustu (buyuk harf 2. satirda).
    Golge Minecraft'taki gibi: renginin dortte biri, bir piksel sag-asagi."""
    k = (metin, olcek, renk, golge)
    if k in _METIN:
        return _METIN[k]
    for c in metin:
        if c not in YAZI_TIPI:
            raise ValueError("piksel yazi tipinde yok: %r (%s)" % (c, metin))
    gen = metin_genislik(metin, olcek) + olcek
    im = Image.new("RGBA", (gen, 12 * olcek), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    katman = ([(1, (renk[0] // 4, renk[1] // 4, renk[2] // 4, renk[3]))] if golge else []) + [(0, renk)]
    for kay, rk in katman:
        x = 0
        for c in metin:
            bas, sat = YAZI_TIPI[c]
            for j, row in enumerate(sat):
                for i, ch in enumerate(row):
                    if ch == "#":
                        X, Y = (x + i + kay) * olcek, (bas + j + kay) * olcek
                        d.rectangle([X, Y, X + olcek - 1, Y + olcek - 1], fill=rk)
            x += len(sat[0]) + 1
    _METIN[k] = im
    return im


# ============================================================
# piksel simgeler (kendi cizimimiz): 1 = dis cizgi, 2 = govde
# ============================================================
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
TIK_ISARETI = ["......2",
               ".....22",
               "2...22.",
               "22.22..",
               ".222...",
               "..2...."]


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


def _kabartma(d, x, y, w, h, zemin, acik=(255, 255, 255, 255), koyu=(85, 85, 85, 255), cizgi=(0, 0, 0, 255)):
    """Minecraft arayuz kutusu: dis cizgi, ust-sol acik, alt-sag koyu."""
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=cizgi)
    d.rectangle([x + P, y + P, x + w - 1 - P, y + h - 1 - P], fill=koyu)
    d.rectangle([x + P, y + P, x + w - 1 - 2 * P, y + h - 1 - 2 * P], fill=acik)
    d.rectangle([x + 2 * P, y + 2 * P, x + w - 1 - 2 * P, y + h - 1 - 2 * P], fill=zemin)


# ============================================================
# zaman egrileri
# ============================================================
def _kirp(u):
    return max(0.0, min(1.0, u))


def _yumusak(u):
    u = _kirp(u)
    return u * u * (3 - 2 * u)


def _tasarak_cik(u, s=1.2):
    """ease-out-back: hedefi hafif asip oturur."""
    u = _kirp(u) - 1.0
    return 1 + (s + 1) * u ** 3 + s * u ** 2


def _gerilip_gir(u, s=1.2):
    """ease-in-back: once hafif geri, sonra hizlanir."""
    u = _kirp(u)
    return (s + 1) * u ** 3 - s * u ** 2


def _yay(u, genlik=0.4, sonum=0.12, periyot=0.24):
    """Tiklama sicramasi: buyuyup yaylanarak 1'e iner."""
    if u < 0:
        return 1.0
    return max(0.85, 1.0 + genlik * math.exp(-u / sonum) * math.cos(2 * math.pi * u / periyot))


# ============================================================
# yerlesim ve durum
# ============================================================
def yerlesim():
    """Panel ici kutular (panelin sol ustune gore): {ad: (x, y, en, boy)}."""
    return {"yuz": (24, 42, 96, 96), "begen": (144, 30, 120, 120),
            "abone": (288, 45, 364, 90), "zil": (676, 30, 120, 120)}


def _hedef(ad):
    x, y, w, h = yerlesim()[ad]
    return (x + w * 0.55, y + h * 0.6)


def _imlec_yolu():
    """[(t0, t1, baslangic, bitis, kavis)]: kavisli (ikinci derece Bezier) parcalar."""
    # giris ve cikis panelin YANINDAN: alttan gelen imlec altyaziya iniyordu (test 1)
    bas = (-90, 110)
    return [(0.55, 1.05, bas, _hedef("begen"), (0, -60)),
            (1.40, 1.95, _hedef("begen"), _hedef("abone"), (0, -70)),
            (2.30, 2.85, _hedef("abone"), _hedef("zil"), (0, -70)),
            (3.30, 3.75, _hedef("zil"), (_hedef("zil")[0] + 170, _hedef("zil")[1] - 40), (0, -30))]


def imlec(t):
    """(x, y) panel koordinatinda imlecin ucu ya da None; alfa."""
    if not (IMLEC_ZAMAN[0] <= t < IMLEC_ZAMAN[1]):
        return None
    yol = _imlec_yolu()
    xy = yol[0][2]
    for t0, t1, a, b, k in yol:
        if t >= t1:
            xy = b
        elif t >= t0:
            u = _yumusak((t - t0) / (t1 - t0))
            c = ((a[0] + b[0]) / 2 + k[0], (a[1] + b[1]) / 2 + k[1])
            xy = ((1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0],
                  (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1])
            break
        else:
            break
    alfa = min(1.0, (t - IMLEC_ZAMAN[0]) / 0.15, (IMLEC_ZAMAN[1] - t) / 0.15)
    return xy[0], xy[1], alfa


def durum(t):
    """t anindaki durum: panel kaymasi (0 yerinde, 1 tamamen disarida, < 0
    tasma), panel alfasi, imlec, uzerinde durulan dugme, tiklama durumlari."""
    if t < GIRIS[1]:
        u = (t - GIRIS[0]) / (GIRIS[1] - GIRIS[0])
        kay, alfa = 1.0 - _tasarak_cik(u), _kirp(u / 0.35)
    elif t >= CIKIS[0]:
        u = (t - CIKIS[0]) / (CIKIS[1] - CIKIS[0])
        kay, alfa = _gerilip_gir(u), _kirp((1 - u) / 0.35)
    else:
        kay, alfa = 0.0, 1.0
    im = imlec(t)
    uzerinde = None
    if im:
        for ad in ("begen", "abone", "zil"):
            x, y, w, h = yerlesim()[ad]
            if x <= im[0] <= x + w and y <= im[1] <= y + h:
                uzerinde = ad
    return {"kay": kay, "alfa": alfa, "imlec": im, "uzerinde": uzerinde,
            "begen": t >= TIK["begen"], "abone": t >= TIK["abone"], "zil": t >= TIK["zil"],
            "basili": any(0 <= t - tk < 0.1 for tk in TIK.values())}


# ============================================================
# parcaciklar (tohumlu: her cizim ayni)
# ============================================================
def _parcaciklar(tohum, n, renkler, hiz=(260, 560), aci=(20, 160), omur=(0.45, 0.8)):
    rnd = random.Random(tohum)
    return [(math.radians(rnd.uniform(*aci)), rnd.uniform(*hiz), rnd.choice(renkler),
             rnd.choice((P, P, int(P * 1.5))), rnd.uniform(*omur)) for _ in range(n)]


KIVILCIM = _parcaciklar(1, 12, [MAVI, BEYAZ, (150, 200, 255, 255)])
KONFETI = _parcaciklar(2, 22, [KIRMIZI, ALTIN, BEYAZ, (90, 220, 255, 255), (120, 230, 90, 255)],
                       hiz=(300, 700), aci=(30, 150), omur=(0.6, 1.0))


def _parcacik_ciz(d, x0, y0, parca, u):
    for a, v, renk, boy, omur in parca:
        if not (0 <= u < omur):
            continue
        x = x0 + math.cos(a) * v * u
        y = y0 - math.sin(a) * v * u + 0.5 * 1400 * u * u
        if y + boy / 2 > ALT_SINIR:          # altyaziya dusmeden kaybolur
            continue
        al = int(renk[3] * (1 - u / omur))
        d.rectangle([x - boy / 2, y - boy / 2, x + boy / 2, y + boy / 2], fill=renk[:3] + (al,))


# ============================================================
# Baris'in yuzu
# ============================================================
def yuz(skin=SKIN, olcek=12, kirpik=False):
    s = Image.open(skin).convert("RGBA")
    y = s.crop((8, 8, 16, 16))
    y.alpha_composite(s.crop((40, 8, 48, 16)))
    if kirpik:
        # gozler: 3-6. satirlarin parlak pikselleri; kapatilinca yuzun koyu rengi
        a = np.asarray(y).copy()
        ten = tuple(int(v) for v in np.median(a[1:7].reshape(-1, 4), axis=0))
        for yy in range(3, 7):
            for xx in range(8):
                r, g, b, _ = a[yy, xx]
                if 0.2126 * r + 0.7152 * g + 0.0722 * b > 110:
                    a[yy, xx] = ten
        y = Image.fromarray(a, "RGBA")
    return y.resize((8 * olcek, 8 * olcek), Image.NEAREST)


# ============================================================
# kare
# ============================================================
def _alfa_carp(im, k):
    if k >= 1.0:
        return im
    im = im.copy()
    im.putalpha(im.getchannel("A").point(lambda v: int(v * max(0.0, k))))
    return im


def _dugme_metni(metin, en):
    for olcek in (5, 4, 3):
        if metin_genislik(metin, olcek) + (9 * olcek if metin == DUGME[1] else 0) <= en - 6 * P:
            return olcek
    return 3


def panel_resmi(t, dr, yuzler):
    pw, ph = PANEL
    pn = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    d = ImageDraw.Draw(pn)
    _kabartma(d, 0, 0, pw, ph, (198, 198, 198, 248))
    yer = yerlesim()
    # yuz: tiklamada bas sallar, iki kez goz kirpar
    x, y, w, h = yer["yuz"]
    d.rectangle([x - P, y - P, x + w + P - 1, y + h + P - 1], fill=(55, 55, 55, 255))
    sal = max([1.0 - (t - tk) / 0.15 for tk in TIK.values() if 0 <= t - tk < 0.15] + [0.0])
    kirpik = any(0 <= t - k < 0.1 for k in KIRP)
    pn.alpha_composite(yuzler[kirpik], (x, int(y - P * sal)))
    # begen
    x, y, w, h = yer["begen"]
    cizgi = BEYAZ if dr["uzerinde"] == "begen" and not dr["begen"] else (0, 0, 0, 255)
    _kabartma(d, x, y, w, h, (139, 139, 139, 255), cizgi=cizgi)
    renk = (MAVI_KOYU, MAVI) if dr["begen"] else ((120, 120, 120, 255), (240, 240, 240, 255))
    ik = _piksel(BASPARMAK, renk[0], renk[1], 6)
    s_ = _yay(t - TIK["begen"])
    ik = ik.resize((int(ik.width * s_), int(ik.height * s_)), Image.NEAREST)
    pn.alpha_composite(ik, (x + (w - ik.width) // 2, y + (h - ik.height) // 2 - 4))
    # abone ol
    x, y, w, h = yer["abone"]
    u = t - TIK["abone"]
    if dr["abone"]:
        _kabartma(d, x, y, w, h, (90, 90, 90, 255), acik=(150, 150, 150, 255), koyu=(40, 40, 40, 255))
        metin = DUGME[1]
    else:
        parlak = dr["uzerinde"] == "abone"
        _kabartma(d, x, y, w, h, (225, 45, 45, 255) if parlak else KIRMIZI,
                  acik=(255, 130, 130, 255), koyu=(110, 10, 10, 255),
                  cizgi=BEYAZ if parlak else (0, 0, 0, 255))
        metin = DUGME[0]
    olcek = _dugme_metni(metin, w)
    mi = metin_resmi(metin, olcek)
    s_ = _yay(u, genlik=0.12, sonum=0.1)
    if s_ != 1.0:
        mi = mi.resize((int(mi.width * s_), int(mi.height * s_)), Image.NEAREST)
    ekstra = 9 * olcek if dr["abone"] else 0
    mx = x + (w - (metin_genislik(metin, olcek) * s_ + ekstra)) / 2
    my = y + h / 2 - 5.5 * olcek * s_
    pn.alpha_composite(mi, (int(mx), int(my)))
    if dr["abone"]:                                   # tik isareti soldan saga cizilir
        ti = _piksel(TIK_ISARETI, BEYAZ, BEYAZ, olcek)
        gor = int(ti.width * _kirp(u / 0.18))
        if gor > 0:
            pn.alpha_composite(ti.crop((0, 0, gor, ti.height)),
                               (int(mx + metin_genislik(metin, olcek) * s_ + 2 * olcek), int(y + h / 2 - 3 * olcek)))
        if u < 0.2:                                   # basilinca beyaz parlama
            fl = Image.new("RGBA", (w - 2 * P, h - 2 * P), (255, 255, 255, int(180 * (1 - u / 0.2))))
            pn.alpha_composite(fl, (x + P, y + P))
    elif PARLAMA[0] <= t < PARLAMA[1]:                # isik suzulmesi (capraz bant)
        v = (t - PARLAMA[0]) / (PARLAMA[1] - PARLAMA[0])
        bant = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        bd = ImageDraw.Draw(bant)
        bx = -60 + (w + 120) * v
        al = int(110 * math.sin(math.pi * v))
        bd.polygon([(bx, 0), (bx + 34, 0), (bx + 34 - h * 0.5, h), (bx - h * 0.5, h)], fill=(255, 255, 255, al))
        maske = Image.new("L", (w, h), 0)
        ImageDraw.Draw(maske).rectangle([2 * P, 2 * P, w - 2 * P - 1, h - 2 * P - 1], fill=255)
        bant.putalpha(Image.fromarray(np.minimum(np.asarray(bant.getchannel("A")), np.asarray(maske))))
        pn.alpha_composite(bant, (x, y))
    # zil
    x, y, w, h = yer["zil"]
    cizgi = BEYAZ if dr["uzerinde"] == "zil" and not dr["zil"] else (0, 0, 0, 255)
    _kabartma(d, x, y, w, h, (139, 139, 139, 255), cizgi=cizgi)
    u = t - TIK["zil"]
    renk = (ALTIN_KOYU, ALTIN) if dr["zil"] else ((120, 120, 120, 255), (240, 240, 240, 255))
    aci = 20.0 * math.exp(-u / 0.35) * math.sin(2 * math.pi * 4.5 * u) if dr["zil"] else 0.0
    ik = _piksel(ZIL, renk[0], renk[1], 7).rotate(aci, resample=Image.NEAREST, expand=True)
    pn.alpha_composite(ik, (x + (w - ik.width) // 2, y + (h - ik.height) // 2))
    if dr["zil"] and u < 1.2:                         # ses dalgalari (ayri katman: panel delinmesin)
        dl = Image.new("RGBA", pn.size, (0, 0, 0, 0))
        dd = ImageDraw.Draw(dl)
        for k in (1, 2):
            al = int(255 * max(0.0, 1 - u / 1.2) * (0.5 + 0.5 * math.sin(2 * math.pi * (3 * u - k * 0.25))))
            for yon in (-1, 1):
                cx = x + w // 2 + yon * (40 + 11 * k)
                for dy, dx in ((-14, 0), (0, yon * 4), (14, 0)):
                    dd.rectangle([cx + dx - 2, y + 54 + dy - 5, cx + dx + 2, y + 54 + dy + 5], fill=ALTIN[:3] + (al,))
        pn.alpha_composite(dl)
    if dr["zil"] and u >= 0.15:                       # kirmizi "1" rozeti
        s_ = _yay(u - 0.15, genlik=0.5, sonum=0.1)
        rb = int(34 * s_)
        rz = Image.new("RGBA", (rb, rb), (0, 0, 0, 0))
        rd = ImageDraw.Draw(rz)
        rd.rectangle([0, 0, rb - 1, rb - 1], fill=(90, 0, 0, 255))
        rd.rectangle([2, 2, rb - 3, rb - 3], fill=(225, 30, 30, 255))
        bir = metin_resmi("1", 3, golge=False)
        bir = bir.crop((0, 2 * 3, metin_genislik("1", 3), 9 * 3))
        bir = bir.resize((max(1, int(bir.width * s_)), max(1, int(bir.height * s_))), Image.NEAREST)
        rz.alpha_composite(bir, ((rb - bir.width) // 2, (rb - bir.height) // 2))
        pn.alpha_composite(rz, (x + w - rb + 6, y - 6))
    return pn


def tost_resmi():
    tw, th = TOST
    im = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    _kabartma(d, 0, 0, tw, th, (33, 33, 33, 245), acik=(85, 85, 85, 255), koyu=(10, 10, 10, 255))
    d.rectangle([24, 28, 24 + 72 - 1, 28 + 72 - 1], fill=(55, 55, 55, 255))
    im.alpha_composite(yuz(olcek=8), (28, 32))
    im.alpha_composite(metin_resmi(TOST_BASLIK, 4, SARI), (120, 28 - 8))
    im.alpha_composite(metin_resmi(TOST_ALT, 4, BEYAZ), (120, 72 - 8))
    return im


def _bindir(im, kat, x, y):
    """kat'i im'e (x, y)'den bindirir; ekran disina tasan kismi kirpar."""
    x, y = int(x), int(y)
    x0, y0 = max(0, -x), max(0, -y)
    x1, y1 = min(kat.width, im.width - x), min(kat.height, im.height - y)
    if x1 > x0 and y1 > y0:
        im.alpha_composite(kat.crop((x0, y0, x1, y1)), (x + x0, y + y0))


def kare(t, yuzler, tost):
    dr = durum(t)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ust = Image.new("RGBA", (W, H), (0, 0, 0, 0))     # halka ve parcaciklar: ayri katman
    d = ImageDraw.Draw(ust)
    pw, ph = PANEL
    x_yer = W - PANEL_SAG - pw
    # sohbet satiri (Minecraft sohbeti gibi: yari saydam siyah serit)
    if SOHBET[0] <= t < SOHBET[1]:
        al = min(1.0, (t - SOHBET[0]) / 0.2, (SOHBET[1] - t) / 0.3)
        kay = int(10 * (1 - _yumusak((t - SOHBET[0]) / 0.2)))
        mi = metin_resmi(SOHBET_METNI, 4)
        sw = metin_genislik(SOHBET_METNI, 4) + 2 * 12
        serit = Image.new("RGBA", (sw, 44), (0, 0, 0, 110))
        serit.alpha_composite(mi, (12, 0))          # buyuk harf 8-36: seridin ortasinda
        _bindir(im, _alfa_carp(serit, al), x_yer, SOHBET_Y + kay)
    # panel
    if dr["alfa"] > 0 and dr["kay"] < 1.0:
        x0 = int(x_yer + dr["kay"] * (pw + PANEL_SAG + 40))
        _bindir(im, Image.new("RGBA", (pw, ph), (0, 0, 0, int(100 * dr["alfa"]))), x0 + P, PANEL_Y + P)
        _bindir(im, _alfa_carp(panel_resmi(t, dr, yuzler), dr["alfa"]), x0, PANEL_Y)
        yer = yerlesim()
        # tiklama halkalari ve parcaciklar (panel koordinati -> ekran)
        for ad, tk in TIK.items():
            u = t - tk
            if 0 <= u < 0.3:
                cx, cy = x0 + _hedef(ad)[0], PANEL_Y + _hedef(ad)[1]
                r = 8 + 60 * _yumusak(u / 0.3)
                d.rectangle([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, int(220 * (1 - u / 0.3))), width=3)
        u = t - TIK["begen"]
        if 0 <= u < 1.0:
            bx, by, bw, bh = yer["begen"]
            _parcacik_ciz(d, x0 + bx + bw / 2, PANEL_Y + by + bh / 2, KIVILCIM, u)
            if u < 0.8:                                   # "+1" yukari suzulur
                art = _alfa_carp(metin_resmi("+1", 5, MAVI), min(1.0, u / 0.1, (0.8 - u) / 0.3))
                _bindir(ust, art, x0 + bx + bw / 2 - 27, PANEL_Y + by - 40 - 70 * _yumusak(u / 0.8))
        u = t - TIK["abone"]
        if 0 <= u < 1.1:
            ax, ay, aw, ah = yer["abone"]
            _parcacik_ciz(d, x0 + ax + aw / 2, PANEL_Y + ay + ah / 2, KONFETI, u)
    im.alpha_composite(ust)
    # imlec
    if dr["imlec"] and dr["kay"] < 1.0:
        ix, iy, al = dr["imlec"]
        x0 = int(x_yer + dr["kay"] * (pw + PANEL_SAG + 40))
        c = _piksel(IMLEC, (0, 0, 0, 255), (255, 255, 255, 255), 3 if dr["basili"] else 4)
        _bindir(im, _alfa_carp(c, al), x0 + ix, PANEL_Y + iy)
    # basarim bildirimi (sag ust)
    if TOST_ZAMAN[0] <= t < TOST_ZAMAN[1]:
        tw, th = TOST
        if t < TOST_ZAMAN[0] + 0.3:
            k = 1 - _tasarak_cik((t - TOST_ZAMAN[0]) / 0.3)
        elif t > TOST_ZAMAN[1] - 0.3:
            k = _gerilip_gir((t - (TOST_ZAMAN[1] - 0.3)) / 0.3)
        else:
            k = 0.0
        _bindir(im, tost, W - TOST_SAG - tw + k * (tw + TOST_SAG + 20), TOST_UST)
    return im


# ============================================================
# ses
# ============================================================
ORAN = 48000


def _oku(ad, hiz=1.0):
    ham = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(SES, ad), "-f", "f32le", "-ac", "2",
                          "-ar", str(ORAN), "-"], capture_output=True, check=True).stdout
    s = np.frombuffer(ham, dtype=np.float32).reshape(-1, 2)
    if hiz != 1.0:
        s = s[np.clip((np.arange(int(len(s) / hiz)) * hiz).astype(int), 0, len(s) - 1)]
    return s


def _ton(frek, sure, dalga="ucgen", atak=0.004, sonum=0.12):
    t = np.arange(int(sure * ORAN)) / ORAN
    x = (2 * np.abs(2 * ((t * frek) % 1.0) - 1) - 1) if dalga == "ucgen" else np.sin(2 * np.pi * frek * t)
    return (x * np.minimum(1.0, t / atak) * np.exp(-t / sonum)).astype(np.float32)


def _tik():
    n = int(0.03 * ORAN)
    t = np.arange(n) / ORAN
    return (0.5 * np.sin(2 * math.pi * 2200 * t) * np.exp(-t / 0.004)
            + 0.25 * np.random.RandomState(4).uniform(-1, 1, n) * np.exp(-t / 0.002)).astype(np.float32)


def _pop():
    n = int(0.09 * ORAN)
    t = np.arange(n) / ORAN
    f = 500 + 900 * t / 0.09
    return (0.35 * np.sin(2 * math.pi * np.cumsum(f) / ORAN) * np.exp(-t / 0.04)).astype(np.float32)


def ses(sure=SURE):
    x = np.zeros((int(sure * ORAN) + ORAN // 2, 2), dtype=np.float32)

    def ekle(s, t, d=1.0):
        i = int(t * ORAN)
        j = min(len(x), i + len(s))
        if j > i:
            x[i:j] += (s[:j - i] * d)[:, None] if s.ndim == 1 else s[:j - i] * d
    ekle(_oku("cloth1.ogg", 1.5), GIRIS[0], 0.35)          # panel kayisi
    ekle(_pop(), SOHBET[0], 0.45)                          # sohbet satiri
    for tk in TIK.values():
        ekle(_tik(), tk, 0.9)
    ekle(_pop(), TIK["begen"] + 0.02, 0.7)                 # begen: pop + iki nota
    ekle(_ton(1318.5, 0.25), TIK["begen"] + 0.03, 0.18)
    ekle(_ton(1760.0, 0.35), TIK["begen"] + 0.10, 0.18)
    for k, f in enumerate((523.25, 659.25, 783.99, 1046.5)):   # abone: 8-bit arpej
        ekle(_ton(f, 0.3, sonum=0.1), TIK["abone"] + 0.03 + 0.06 * k, 0.17)
    ekle(_ton(783.99, 0.5, "sinus", sonum=0.2), TOST_ZAMAN[0] + 0.05, 0.12)   # bildirim cini
    ekle(_ton(1046.5, 0.6, "sinus", sonum=0.25), TOST_ZAMAN[0] + 0.15, 0.12)
    ekle(_oku("impactBell_heavy_000.ogg", 1.5), TIK["zil"], 0.4)              # zil
    ekle(_ton(1568.0, 0.8, "sinus", sonum=0.35), TIK["zil"] + 0.01, 0.14)
    ekle(_oku("cloth2.ogg", 1.6), CIKIS[0], 0.3)           # cikis kayisi
    return np.clip(x, -1, 1)


def uret(cikti, skin=SKIN, video=True, zemin=None):
    os.makedirs(os.path.join(cikti, "kare"), exist_ok=True)
    yuzler = {False: yuz(skin), True: yuz(skin, kirpik=True)}
    tost = tost_resmi()
    n = int(round(SURE * FPS))
    for i in range(n):
        kare(i / FPS, yuzler, tost).save(os.path.join(cikti, "kare", "%04d.png" % (i + 1)))
    x = ses()
    with wave.open(os.path.join(cikti, "cagri.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(ORAN)
        w.writeframes((x * 32767).astype("<i2").tobytes())
    if video:
        kp = os.path.join(cikti, "kare", "%04d.png")
        wav = os.path.join(cikti, "cagri.wav")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-i", kp, "-i", wav,
                        "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-c:a", "pcm_s16le",
                        "-shortest", os.path.join(cikti, "cagri.mov")], check=True)
        alt = (["-loop", "1", "-framerate", str(FPS), "-t", str(SURE), "-i", zemin] if zemin else
               ["-f", "lavfi", "-i", "color=c=0x5a6e50:s=%dx%d:r=%d:d=%g" % (W, H, FPS, SURE)])
        subprocess.run(["ffmpeg", "-y", "-v", "error"] + alt + ["-framerate", str(FPS), "-i", kp, "-i", wav,
                        "-filter_complex", "[0:v]scale=%d:%d,format=rgba[z];[z][1:v]overlay=shortest=1,format=yuv420p[v]" % (W, H),
                        "-map", "[v]", "-map", "2:a", "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-shortest",
                        os.path.join(cikti, "onizleme.mp4")], check=True)
    return n


if __name__ == "__main__":
    a = sys.argv[1:]
    sk = a[a.index("--skin") + 1] if "--skin" in a else SKIN
    zm = a[a.index("--zemin") + 1] if "--zemin" in a else None
    print(uret(os.path.abspath(a[0]), sk, zemin=zm), "kare ->", os.path.abspath(a[0]))
