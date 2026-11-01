# -*- coding: utf-8 -*-
"""Cocukluk arkadasinin ikiz tabancalari (Ebony & Ivory) -- kendi kup modelimiz.   v7.99.16

Kullanici (2026-11-01): Baris'in cocukluk arkadasi kraliyet buyucusu ama
asa yerine silah tasiyor; arkadasinin istegiyle skin Dante'ye benzetildi,
silahlari "Ebony & Ivory": sag elde siyah, sol elde beyaz tabanca.

KENDI MODELIMIZ: Capcom'un modeli, dokusu ya da oymalari alinmadi; iki
renkli, buyuk govdeli iki tabanca fikri alindi (REFERANS kurali: "sayiyi /
fikri al, dosyayi alma"). Olculer Minecraft esya olceginde (1 px = 1/16
blok), elle tasarlandi.

    python3 addon/arac/ikiz_tabanca.py <cikti_klasoru>
        -> ikiz_tabanca.geo.json + ikiz_tabanca.png

Eksenler (tabancanin kendi cercevesi, piksel):
    b: namlu yonu (ileri)   u: yukari (kabzadan surgunun ustune)   l: yan
Model uzayina (kol asagi sarkarken): namlu kol boyunca ASAGI (-y), surgu
yumrugun ONUNDE (-z), kabza yumrugun icinden arkaya (+z). Kol one
kalkinca (film_poz: kol X -90) namlu ileri, surgu yukari bakar. Kabzanin
ortasi yumrugun ortasinda (rightItem / leftItem pivotu).
"""
import json
import os
import random
import struct
import sys
import zlib

SAG_YUMRUK = (-6.0, 13.3, 0.5)     # aktor.geo.json rightItem pivotu
SOL_YUMRUK = (6.0, 13.3, 0.5)      # leftItem pivotu
KABZA_ORTA = (-1.4, -1.5)          # (b, u): yumrugun sardigi nokta
KABZA_EGIM = 15.0                  # kabzanin alti geriye (derece)

# (ad, renk anahtari, b1, b2, u1, u2, l1, l2, kabzayla donsun mu)
PARCALAR = [
    ("surgu", "govde", -3.5, 8.5, 1.5, 4.0, -0.9, 0.9, False),
    ("namlu_ucu", "namlu", 8.5, 9.1, 2.0, 3.5, -0.7, 0.7, False),
    ("govde", "koyu", 0.5, 8.0, 0.5, 1.5, -0.8, 0.8, False),
    ("kabza", "kabza", -3.0, 0.2, -4.5, 1.5, -1.0, 1.0, True),
    ("sarjor_tabani", "metal", -3.1, 0.3, -5.0, -4.5, -1.05, 1.05, True),
    ("korkuluk_alt", "koyu", 0.2, 3.2, -1.6, -1.0, -0.4, 0.4, False),
    ("korkuluk_on", "koyu", 2.6, 3.2, -1.6, 0.5, -0.4, 0.4, False),
    ("tetik", "metal", 0.9, 1.4, -0.9, 0.5, -0.3, 0.3, False),
    ("horoz", "metal", -4.2, -3.5, 3.0, 4.2, -0.4, 0.4, False),
    ("arpacik", "metal", 7.6, 8.2, 4.0, 4.5, -0.25, 0.25, False),
    ("gez", "metal", -3.2, -2.4, 4.0, 4.5, -0.6, 0.6, False),
]

# Ebony siyah govde, celik ayrintilar; Ivory fildisi beyazi govde, koyu
# celik ayrintilar (karsitlik icin). Renkler elle secildi.
RENKLER = {
    "ebony": {"govde": (42, 42, 46), "koyu": (28, 28, 31), "kabza": (20, 20, 22),
              "metal": (154, 156, 163), "namlu": (6, 6, 7)},
    "ivory": {"govde": (233, 230, 223), "koyu": (201, 197, 188), "kabza": (242, 238, 228),
              "metal": (74, 76, 82), "namlu": (14, 14, 15)},
}
SIRA = ("govde", "koyu", "kabza", "metal", "namlu")
KARE = 8                            # atlasta her renk 8x8 px
DOKU_EN, DOKU_BOY = KARE * len(SIRA), KARE * 2


def _kup(yumruk, b1, b2, u1, u2, l1, l2):
    """(b, u, l) kutusu -> model uzayinda (origin, size)."""
    b0, u0 = KABZA_ORTA
    fx, fy, fz = yumruk
    x1, x2 = fx + l1, fx + l2
    y1, y2 = fy - (b2 - b0), fy - (b1 - b0)
    z1, z2 = fz - (u2 - u0), fz - (u1 - u0)
    r = lambda v: round(v, 4)
    return [r(x1), r(y1), r(z1)], [r(x2 - x1), r(y2 - y1), r(z2 - z1)]


def _yuz_uv(satir, anahtar, size):
    """Her yuz kendi renk karesinden, 1 piksel = 1 doku pikseli."""
    u = SIRA.index(anahtar) * KARE
    v = satir * KARE
    w = lambda a: max(0.5, min(KARE, round(a, 3)))
    x, y, z = size
    return {"north": {"uv": [u, v], "uv_size": [w(x), w(y)]}, "south": {"uv": [u, v], "uv_size": [w(x), w(y)]},
            "east": {"uv": [u, v], "uv_size": [w(z), w(y)]}, "west": {"uv": [u, v], "uv_size": [w(z), w(y)]},
            "up": {"uv": [u, v], "uv_size": [w(x), w(z)]}, "down": {"uv": [u, v], "uv_size": [w(x), w(z)]}}


def geometri():
    kemikler = [{"name": "rightItem", "pivot": list(SAG_YUMRUK)},
                {"name": "leftItem", "pivot": list(SOL_YUMRUK)}]
    for satir, (ad, ebeveyn, yumruk) in enumerate((("ebony", "rightItem", SAG_YUMRUK),
                                                    ("ivory", "leftItem", SOL_YUMRUK))):
        kupler = []
        b0, u0 = KABZA_ORTA
        # kabzanin ust ucu (surguye degdigi yer) donme ekseni
        eksen = [yumruk[0], round(yumruk[1] - (-1.4 - b0), 4), round(yumruk[2] - (1.5 - u0), 4)]
        for _, renk, b1, b2, u1, u2, l1, l2, egik in PARCALAR:
            o, s = _kup(yumruk, b1, b2, u1, u2, l1, l2)
            k = {"origin": o, "size": s, "uv": _yuz_uv(satir, renk, s)}
            if egik:
                # kabzanin alti (+z) geriye, omuza dogru (+y) yatar
                k["pivot"] = eksen
                k["rotation"] = [-KABZA_EGIM, 0, 0]
            kupler.append(k)
        kemikler.append({"name": ad, "parent": ebeveyn, "pivot": list(yumruk), "cubes": kupler})
    return {"format_version": "1.12.0", "minecraft:geometry": [{
        "description": {"identifier": "geometry.ikiz_tabanca", "texture_width": DOKU_EN,
                        "texture_height": DOKU_BOY, "visible_bounds_width": 3, "visible_bounds_height": 3,
                        "visible_bounds_offset": [0, 1, 0]},
        "bones": kemikler}]}


def doku():
    """RGBA satirlari: her renk karesine hafif piksel gurultusu (Minecraft
    esyasi gibi duz degil), kenarlara bir ton koyuluk."""
    rnd = random.Random(1907)
    satirlar = [[(0, 0, 0, 0)] * DOKU_EN for _ in range(DOKU_BOY)]
    for satir, tabanca in enumerate(("ebony", "ivory")):
        for i, anahtar in enumerate(SIRA):
            r0, g0, b0 = RENKLER[tabanca][anahtar]
            for y in range(KARE):
                for x in range(KARE):
                    oynama = rnd.randint(-6, 6)
                    kenar = -10 if x in (0, KARE - 1) or y in (0, KARE - 1) else 0
                    c = lambda v: max(0, min(255, v + oynama + kenar))
                    satirlar[satir * KARE + y][i * KARE + x] = (c(r0), c(g0), c(b0), 255)
    return satirlar


def png_yaz(yol, satirlar):
    """Saf Python PNG (Blender'in Python'unda PIL yok)."""
    h, w = len(satirlar), len(satirlar[0])
    ham = b"".join(b"\x00" + bytes(v for p in sat for v in p) for sat in satirlar)

    def parca(tur, veri):
        return struct.pack(">I", len(veri)) + tur + veri + struct.pack(">I", zlib.crc32(tur + veri) & 0xffffffff)
    with open(yol, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + parca(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                + parca(b"IDAT", zlib.compress(ham, 9)) + parca(b"IEND", b""))


def uret(klasor):
    os.makedirs(klasor, exist_ok=True)
    geo = os.path.join(klasor, "ikiz_tabanca.geo.json")
    png = os.path.join(klasor, "ikiz_tabanca.png")
    with open(geo, "w", encoding="utf-8") as f:
        json.dump(geometri(), f, indent=1)
    png_yaz(png, doku())
    return geo, png


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    for y in uret(sys.argv[1]):
        print(y)
