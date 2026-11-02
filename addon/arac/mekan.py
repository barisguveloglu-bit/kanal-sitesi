# -*- coding: utf-8 -*-
"""BLOK MEKANLAR -- film aracinin bloklarla kurulan sahneleri.   v7.99.16

Senaryoda:
    "mekan": "bataklik"      (arac/kulube.py: cadinin kulubesi ve bataklik)
    "mekan": "hanedan"       (arac/hanedan.py: hanedan ve Zisa'nin evi)
("mekan": "oda" eskisi gibi blender_film.oda_kur; yazilmazsa orman.)

Saf Python, Blender gerekmiyor: zaman cizelgesi ve kamera denetimi de
bunu kullaniyor.

EKSENLER. Senaryo ve film Blender eksenlerinde (x dogu, y KUZEY, z yukari);
bloklar Minecraft eksenlerinde (x dogu, y yukari, z GUNEY). Blender
(X, Y, Z) noktasi Minecraft'ta (X, Z, -Y): blok (bx, by, bz) Blender'da
X [bx, bx+1], Y [-bz-1, -bz], Z [by, by+1] araligini kaplar (blok_kur.orgu
ayni donusumle ciziyor). Senaryoya konum yazarken: Minecraft (x, z) ->
senaryo [x, -z].

ZEMIN. Aktor, ayak izinin (0,6 x 0,6) dort kosesinin altindaki en yuksek
yuzeye basar; ama yalniz bulundugu yerden en fazla ADIM (0,6 blok)
yukaridaki yuzeylere -- Minecraft'ta yurunerek cikilan yukseklik. Boylece
kulubenin icindeki aktor catinin ustune "basmaz", duvarin dibindeki aktor
duvarin tepesine sicramaz, basamaklar (alt yarisi 0,5) adim adim cikilir.
Yuzey yuksekligi blogun kendi kutularindan (blok_kur.kutular) ve kosenin
blok icindeki yerinden okunur: basamagin alcak ve yuksek yarisi ayri.
"""
import math
import os
import sys

BURASI = os.path.dirname(os.path.abspath(__file__))
if BURASI not in sys.path:
    sys.path.insert(0, BURASI)

import blok_kur  # noqa: E402

ADIM = 0.6                  # Minecraft: yurunerek cikilan en yuksek basamak (blok)
YOK = -64.0                 # altinda hic yuzey yoksa (dunyanin disi)
# uzerine basilamayan, gorusu de kesmeyen sekiller (blok_kur.sekil)
GECIRGEN = {"carpraz", "sarmasik", "su", "nilufer", "gecit", "mesale", "fener", "kapi", "bolme",
            "merdiven", "saksi", "can"}
SAYDAM = ("glass", "ice", "barrier", "light_block")     # basilir ama gorus gecer
# basilmaz ama GORUSU KESER: sarkan sarmasik perdesi kameranin onune dusunce
# kareyi kapliyordu, denetim "0 sorun" demisti (ilk film denemesi)
PERDE = {"sarmasik"}


def dogrusal(c):
    """sRGB 0-1 -> dogrusal (Blender renk kutusu dogrusal ister)."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _bataklik():
    import kulube
    b, bilgi = kulube.bataklik()
    a, u = -kulube.YARICAP, kulube.YARICAP + 1
    r, g, b_ = kulube.BATAKLIK_RENK["cimen"]
    renk = (dogrusal(r * 0.55), dogrusal(g * 0.62), dogrusal(b_ * 0.5))
    return b, bilgi, kulube.BATAKLIK_RENK, {"tur": "kare", "a": a, "u": u, "h": -0.02, "renk": renk}


def _hanedan():
    import hanedan
    b, bilgi = hanedan.hanedan()
    # ufuk surun disinda baslayan halka, yolun ustunden (0,9375) alcakta
    # (hanedan_onizle.py ile ayni; tam disk tarla sularini ortuyordu)
    return b, bilgi, None, {"tur": "halka", "r": float(hanedan.SUR_YARICAP), "h": 0.90, "renk": (0.24, 0.42, 0.13)}


MEKANLAR = {"bataklik": _bataklik, "hanedan": _hanedan}
_onbellek = {}


def blok_mekan_mi(senaryo):
    return senaryo.get("mekan") in MEKANLAR


class Mekan:
    def __init__(self, ad):
        self.ad = ad
        self.bloklar, self.bilgi, self.renkler, self.ufuk = MEKANLAR[ad]()
        self.harita = {tuple(q["p"]): q for q in self.bloklar}
        self._kutu = {}
        # sutun: (bx, bz) -> o sutundaki basilabilir bloklarin y'leri (asagidan yukari)
        self.sutun = {}
        for (x, y, z), q in self.harita.items():
            if blok_kur.sekil(q["t"]) in GECIRGEN:
                continue
            self.sutun.setdefault((x, z), []).append(y)
        for v in self.sutun.values():
            v.sort()

    def kutular(self, p):
        if p not in self._kutu:
            q = self.harita.get(p)
            if q is None or blok_kur.sekil(q["t"]) in GECIRGEN:
                self._kutu[p] = []
            else:
                self._kutu[p] = blok_kur.kutular(q["t"], q.get("s", {}))
        return self._kutu[p]

    def yuzey(self, x, y, ust=None):
        """Blender (x, y) noktasinda, ust + ADIM'dan alcak en yuksek yuzey.
        ust None: en yuksegi (catilar dahil)."""
        bx, bz = math.floor(x), math.floor(-y)
        fx, fz = x - bx, -y - bz
        sinir = math.inf if ust is None else ust + ADIM + 1e-9
        en = YOK
        for by in reversed(self.sutun.get((bx, bz), ())):
            if by > sinir:
                continue
            for k in self.kutular((bx, by, bz)):
                if k[0] - 1e-9 <= fx <= k[3] + 1e-9 and k[2] - 1e-9 <= fz <= k[5] + 1e-9:
                    h = by + k[4]
                    if h <= sinir and h > en:
                        en = h
            if en > YOK:
                break           # bu blogun yuzeyi alttakilerin hepsinden yuksek
        return en

    def zemin(self, x, y, ust=None, yari=0.3):
        """Ayak izinin dort kosesinin en yuksek yuzeyi (Minecraft gibi)."""
        return max(self.yuzey(x + dx, y + dy, ust) for dx in (-yari, yari) for dy in (-yari, yari))

    def kati_mi(self, p, saydam_gecer=True):
        """Blender noktasi p bir blogun kati kutusunun icinde mi."""
        bx, by, bz = math.floor(p[0]), math.floor(p[2]), math.floor(-p[1])
        q = self.harita.get((bx, by, bz))
        if q is None:
            return False
        if saydam_gecer and any(k in q["t"] for k in SAYDAM):
            return False
        if blok_kur.sekil(q["t"]) in PERDE:
            return True
        fx, fy, fz = p[0] - bx, p[2] - by, -p[1] - bz
        return any(k[0] <= fx <= k[3] and k[1] <= fy <= k[4] and k[2] <= fz <= k[5] for k in self.kutular((bx, by, bz)))

    def duvarda_mi(self, p, pay=0.12):
        """Kamera icin: nokta ya da pay kadar cevresi bir blogun icinde mi."""
        if self.kati_mi(p, saydam_gecer=False):
            return True
        for i in range(3):
            for s in (-pay, pay):
                q = list(p)
                q[i] += s
                if self.kati_mi(q, saydam_gecer=False):
                    return True
        return False

    def gorus_acik(self, p0, p1, adim=0.1, uc=0.25):
        """p0'dan p1'e cizgi bir bloga carpmiyor mu (cam ve buz gecirir).
        Uclardaki `uc` blok sayilmaz: hedef aktorun basi bir yapragin
        dibinde olabilir."""
        d = math.dist(p0, p1)
        n = max(1, int(d / adim))
        for i in range(n + 1):
            u = i / n
            if u * d < uc or (1 - u) * d < uc:
                continue
            q = [p0[k] + (p1[k] - p0[k]) * u for k in range(3)]
            if self.kati_mi(q):
                return False
        return True


def yukle(senaryo):
    """Senaryonun blok mekani (onbellekte), yoksa None."""
    ad = senaryo.get("mekan")
    if ad not in MEKANLAR:
        return None
    if ad not in _onbellek:
        _onbellek[ad] = Mekan(ad)
    return _onbellek[ad]


def ufuk_ormesi(ufuk, uzak=400.0, dilim=96):
    """Mekanin disinda duz zemin: (koseler, yuzler), Blender eksenlerinde.
    Ortasi bos (suyun ustunu ortmesin): kare cerceve ya da halka."""
    h = ufuk["h"]
    if ufuk["tur"] == "kare":
        a, u, U = ufuk["a"], ufuk["u"], uzak
        k = [(-U, -U, h), (U, -U, h), (U, U, h), (-U, U, h), (a, -u, h), (u, -u, h), (u, -a, h), (a, -a, h)]
        return k, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    r = ufuk["r"]
    k, y = [], []
    for i in range(dilim):
        a = 2 * math.pi * i / dilim
        k += [(math.cos(a) * r, math.sin(a) * r, h), (math.cos(a) * uzak, math.sin(a) * uzak, h)]
    for i in range(dilim):
        j = (i + 1) % dilim
        y.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
    return k, y
