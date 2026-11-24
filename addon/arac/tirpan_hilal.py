# -*- coding: utf-8 -*-
"""Karanlik Tirpan 2.0 "Hilal Ay" -- yalniz film icin kendi kup modelimiz.

Kullanici:
  2026-11-21: Karanlik Tirpan'in gorunusu yenilensin, kapsam "yalniz filmde";
              uc taslak (Hilal Ay, Ruh Atesi, Golge ve Kemik) gosterildi.
  2026-11-22: "Hilal Ay olsun."
  2026-11-24: "Hilal ay depoya alabilirsin." 2. bolum Part 2'de Baris onu
              cikarip pencereden atliyor.

Oyundaki Karanlik Tirpan (kol_uret.py TIRPAN_*) DEGISMEZ. Hilal Ay ayni
pivotta, ayni sap ekseninde durur: el, oyundaki tirpanla ayni yerden tutar,
Antitheus setinin tutusu (test/tutus.mjs) aynen gecerli. Cizim: sap boyunca
uzun bir hilal bicak, sirti gumus, ici koyu ve acik mor, agzi isiyan mor
kenar; bicak yuvasi obsidyen, yaninda hilal ay amblemi, arka ucta agirlik.
Taslaktan tek fark palet: yalniz bu modelin kullandigi 13 renk kaldi (kup
olculeri ve her kupun rengi onaylanan taslakla ayni).

    python3 addon/arac/tirpan_hilal.py <cikti_klasoru>
        -> karanlik_tirpan_hilal.geo.json + karanlik_tirpan_hilal.png
           + karanlik_tirpan_hilal_isik.png

_isik.png: isiyan renklerin hucresi kendi renginde, obur hucreler siyah
(isima haritasi). Film aracina henuz bagli degil; bagladiginda silahin
malzemesi bu haritayla isimali (bugunku SILAH malzemesi tek renk isiyor).
"""
import json
import math
import os
import struct
import sys
import zlib

# kol_uret.py TIRPAN_PIVOT / TIRPAN_ON / TIRPAN_ARKA ile ayni (test esitligi olcuyor)
PIV = [-6, 13.3, 0.5]          # aktorun rightItem'i (yumruk)
ON, ARKA = 20, 36              # elden bicagin tabanina / sapin arka ucuna (px)
X0, YC, ZC = PIV
ZB = ZC - ON - 1               # bicagin tabani

# renk -> (rgb, isiyor mu); sira paletteki hucre sirasi
RENKLER = [
    ("sap", (34, 26, 44), False), ("sap2", (58, 44, 72), False),
    ("sarg", (18, 12, 24), False), ("sarg_m", (88, 40, 140), False),
    ("gum", (150, 156, 172), False), ("gum2", (214, 220, 232), False),
    ("obs", (26, 20, 38), False), ("mor1", (62, 34, 100), False),
    ("mor2", (104, 58, 168), False), ("kenar", (206, 140, 255), True),
    ("kenar2", (150, 80, 235), True), ("oluk", (14, 10, 22), False),
    ("mtas", (180, 100, 255), True),
]
DOKU = 16
HUCRE = {ad: (i % DOKU, i // DOKU) for i, (ad, _, _) in enumerate(RENKLER)}


def _kup(o, s, renk):
    y = {"uv": list(HUCRE[renk]), "uv_size": [1, 1]}
    return {"origin": [round(v, 3) for v in o], "size": [round(v, 3) for v in s],
            "uv": {f: dict(y) for f in ("north", "south", "east", "west", "up", "down")}}


def _kutu(cx, cy, cz, sx, sy, sz, renk):
    """merkez + boyut (px)"""
    return _kup([cx - sx / 2, cy - sy / 2, cz - sz / 2], [sx, sy, sz], renk)


def _bicak(h, kalin):
    """(y, z) -> renk haritasini kuplere cevirir; kalinlik renge gore (sirt
    kalin, kenar ince): kenara dogru incelen bir bicak."""
    k = []
    for y in sorted({a for a, _ in h}):
        zs = sorted(z for (a, z) in h if a == y)
        i = 0
        while i < len(zs):
            j, r = i, h[(y, zs[i])]
            while j + 1 < len(zs) and zs[j + 1] == zs[j] + 1 and h[(y, zs[j + 1])] == r:
                j += 1
            t = kalin.get(r, 0.6)
            k.append(_kup([X0 - t / 2, y, zs[i]], [t, 1, zs[j] - zs[i] + 1], r))
            i = j + 1
    return k


def _hilal(L_alt, L_ust, kv_alt, kv_ust, g_alt, g_ust, renkle, us=1.8, ug=0.9):
    """Sap boyunca (y) uzanan hilal: alt kol L_alt, ust kol L_ust px; kv
    kavis, g kalinlik. renkle(on'a uzaklik, arkaya uzaklik, yy, z, genislik)."""
    h = {}
    for yy in range(-L_alt, L_ust + 1):
        if yy <= 0:
            t = -yy / L_alt
            z_on = ZB - 2 + kv_alt * t ** us
            gen = g_alt * (1 - t) ** 0.8 + 0.6
        else:
            t = yy / L_ust
            z_on = ZB - 2 + kv_ust * t ** 1.6
            gen = g_ust * (1 - t) ** ug + 0.6
        for z in range(math.floor(z_on), math.floor(z_on + gen) + 1):
            if z + 0.5 < z_on or z + 0.5 > z_on + gen + 0.5:
                continue
            r = renkle((z + 0.5) - z_on, (z_on + gen) - (z + 0.5), yy, z, gen)
            if r:
                h[(YC + yy, z)] = r
    return h


def _sap():
    k = [_kup([X0 - 0.5, YC - 0.5, ZC - ON], [1, 1, ON + ARKA], "sap"),
         _kup([X0 - 0.55, YC - 0.35, ZC - ON], [1.1, 0.3, ON + ARKA], "sap2")]
    for z0, z1 in ((-3, 3), (22, 32)):              # iki el sargisi, capraz serit
        k.append(_kup([X0 - 0.72, YC - 0.72, ZC + z0], [1.44, 1.44, z1 - z0], "sarg"))
        for z in range(z0, z1, 2):
            k.append(_kup([X0 - 0.78, YC - 0.2, ZC + z + 0.5], [1.56, 0.4, 0.6], "sarg_m"))
    for z in (-16, 9, 20):                          # gumus halkalar
        k.append(_kutu(X0, YC, ZC + z + 0.5, 1.5, 1.5, 1, "gum"))
    return k


def kupler():
    def renk(d_on, d_ar, yy, z, gen):
        if d_on < 1.0:
            return "gum2" if yy < -1 else "gum"     # sirt
        if d_ar < 1.0:
            return "kenar"                          # agiz
        if d_ar < 2.0:
            return "kenar2"
        if abs(d_on - 2.2) < 0.5 and gen > 4.5:
            return "oluk"                           # sirta paralel oluk
        return "mor2" if d_on < 3.2 else "mor1"
    h = _hilal(34, 8, 27, 5, 9, 3.5, renk)
    for yy in range(-6, -1):                        # yuvanin yaninda hilal ay amblemi
        h[(YC + yy, ZB + 1 + round(0.9 * abs(yy + 3.5)))] = "mtas"
    k = _sap()
    k += _bicak(h, {"gum2": 1.0, "gum": 1.0, "oluk": 0.8, "mor1": 0.8, "mor2": 0.75,
                    "kenar2": 0.55, "kenar": 0.4, "mtas": 0.9})
    k += [_kutu(X0, YC, ZC - ON - 1.5, 2.2, 2.2, 3, "obs"),            # bicak yuvasi: obsidyen
          _kutu(X0, YC, ZC - ON + 0.2, 2.6, 2.6, 0.6, "gum"),
          _kutu(X0, YC, ZC - ON - 3.2, 2.6, 2.6, 0.6, "gum"),
          _kutu(X0, YC + 1.3, ZC - ON - 1.5, 0.8, 0.8, 3.6, "gum"),     # yuvanin sirt cikintisi
          _kutu(X0, YC + 1.6, ZC - ON - 1.5, 1.2, 1.2, 1.2, "mtas"),    # yuvada mor tas
          _kutu(X0, YC, ZC - ON - 3.4, 1.6, 1.6, 0.8, "gum2"),
          _kutu(X0, YC, ZC + ARKA + 1, 2.2, 2.2, 2, "gum"),             # arka uc: agirlik
          _kutu(X0, YC, ZC + ARKA + 2.6, 1.4, 1.4, 1.2, "mtas"),
          _kutu(X0, YC, ZC + ARKA + 4.2, 0.9, 0.9, 2, "gum2"),
          _kutu(X0, YC, ZC + ARKA + 5.7, 0.4, 0.4, 1, "kenar")]
    return k


def geometri():
    return {"format_version": "1.12.0", "minecraft:geometry": [{
        "description": {"identifier": "geometry.karanlik_tirpan_hilal", "texture_width": DOKU,
                        "texture_height": DOKU, "visible_bounds_width": 5, "visible_bounds_height": 5,
                        "visible_bounds_offset": [0, 1, 0]},
        "bones": [{"name": "rightItem", "pivot": list(PIV)},
                  {"name": "tirpan", "parent": "rightItem", "pivot": list(PIV), "cubes": kupler()}]}]}


def _palet(isik_mi):
    satirlar = [[(0, 0, 0, 0)] * DOKU for _ in range(DOKU)]
    for ad, rgb, isiyor in RENKLER:
        x, y = HUCRE[ad]
        satirlar[y][x] = ((rgb if isiyor else (0, 0, 0)) if isik_mi else rgb) + (255,)
    return satirlar


def doku():
    """Renk paleti: her renk 1x1 hucre (RGBA satirlari)."""
    return _palet(False)


def isik():
    """Isima haritasi: isiyan renklerin hucresi kendi renginde, obur hucreler siyah."""
    return _palet(True)


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
    geo = os.path.join(klasor, "karanlik_tirpan_hilal.geo.json")
    png = os.path.join(klasor, "karanlik_tirpan_hilal.png")
    isik_png = os.path.join(klasor, "karanlik_tirpan_hilal_isik.png")
    with open(geo, "w", encoding="utf-8") as f:
        json.dump(geometri(), f, indent=1)
    png_yaz(png, doku())
    png_yaz(isik_png, isik())
    return geo, png, isik_png


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    for y in uret(sys.argv[1]):
        print(y)
