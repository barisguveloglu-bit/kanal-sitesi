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
_hizli = {}


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

    def _blok(self, p, t=None):
        """p'deki blok (t aninda; patlamasiz mekanda t yok sayilir)."""
        return self.harita.get(p)

    def kutular(self, p, t=None):
        if p not in self._kutu:
            q = self.harita.get(p)
            if q is None or blok_kur.sekil(q["t"]) in GECIRGEN:
                self._kutu[p] = []
            else:
                self._kutu[p] = blok_kur.kutular(q["t"], q.get("s", {}))
        return self._kutu[p]

    def yuzey(self, x, y, ust=None, t=None):
        """Blender (x, y) noktasinda, ust + ADIM'dan alcak en yuksek yuzey.
        ust None: en yuksegi (catilar dahil). t: patlamali mekanda an."""
        bx, bz = math.floor(x), math.floor(-y)
        fx, fz = x - bx, -y - bz
        sinir = math.inf if ust is None else ust + ADIM + 1e-9
        en = YOK
        for by in reversed(self.sutun.get((bx, bz), ())):
            if by > sinir:
                continue
            for k in self.kutular((bx, by, bz), t):
                if k[0] - 1e-9 <= fx <= k[3] + 1e-9 and k[2] - 1e-9 <= fz <= k[5] + 1e-9:
                    h = by + k[4]
                    if h <= sinir and h > en:
                        en = h
            if en > YOK:
                break           # bu blogun yuzeyi alttakilerin hepsinden yuksek
        return en

    def zemin(self, x, y, ust=None, yari=0.3, t=None):
        """Ayak izinin dort kosesinin en yuksek yuzeyi (Minecraft gibi)."""
        return max(self.yuzey(x + dx, y + dy, ust, t) for dx in (-yari, yari) for dy in (-yari, yari))

    def kati_mi(self, p, saydam_gecer=True, t=None):
        """Blender noktasi p bir blogun kati kutusunun icinde mi."""
        bx, by, bz = math.floor(p[0]), math.floor(p[2]), math.floor(-p[1])
        q = self._blok((bx, by, bz), t)
        if q is None:
            return False
        if saydam_gecer and any(k in q["t"] for k in SAYDAM):
            return False
        if blok_kur.sekil(q["t"]) in PERDE:
            return True
        fx, fy, fz = p[0] - bx, p[2] - by, -p[1] - bz
        return any(k[0] <= fx <= k[3] and k[1] <= fy <= k[4] and k[2] <= fz <= k[5]
                   for k in self.kutular((bx, by, bz), t))

    def duvarda_mi(self, p, pay=0.12, t=None):
        """Kamera icin: nokta ya da pay kadar cevresi bir blogun icinde mi."""
        if self.kati_mi(p, saydam_gecer=False, t=t):
            return True
        for i in range(3):
            for s in (-pay, pay):
                q = list(p)
                q[i] += s
                if self.kati_mi(q, saydam_gecer=False, t=t):
                    return True
        return False

    def gorus_acik(self, p0, p1, adim=0.1, uc=0.25, t=None):
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
            if self.kati_mi(q, t=t):
                return False
        return True


class ZamanliMekan(Mekan):
    """Patlamali senaryonun mekani (gedik.py): ozgun bloklar patlama aninda
    kalkar, moloz MOLOZ_GECIKME sonra belirir. Ortak Mekan'i degistirmez
    (onbellekteki taban paylasilir); sorgular t ister, t None ise
    patlamadan onceki hal.
      kalkis   {p: t}                       ozgun blogun kalktigi an
      gelis    {p: [[t_bas, t_son, blok]]}  moloz (sonraki patlama kirabilir)
      yer_alti {p: blok}                    patlama cevresinde zeminin alti
    Mekanin zemini tek kat (hanedanda y = 0 cimen, alti bos): patlama
    cukuru bosluga acilmasin diye patlamanin cevresinde zeminin altina
    YER_ALTI katmanlari konur (oyunda da zeminin alti doludur). Halka
    ufuk zemin bloklarinin bittigi yere cekilir: sur disindaki cukuru
    0,9 yukseklikteki ufuk duzlemi ortmesin (bloklarin ustunde gorunus
    ayni, olculdu: hanedanin zemini her yonde 110 bloga kadar dolu).
    Cizim (blender_film.mekan_kur) gruplari cizim_gruplari'ndan kurar."""

    YER_ALTI = ("dirt", "dirt", "dirt", "stone", "stone")
    TEMEL = "cobblestone"         # tas yapinin altinda (surun temeli)
    TEMEL_USTU = ("stone_bricks", "mossy_stone_bricks", "cracked_stone_bricks", "cobblestone",
                  "chiseled_stone_bricks", "stone", "andesite", "polished_andesite")
    YER_ALTI_YARICAP = 7          # patlamanin en uzak isini ~5,2 blok (guc 3,9)

    def __init__(self, taban, patlamalar):
        import gedik as G
        self.ad, self.bloklar, self.bilgi = taban.ad, taban.bloklar, taban.bilgi
        self.renkler = taban.renkler
        self.harita = taban.harita             # paylasilir, degistirilmez
        self._kutu = taban._kutu               # ozgun bloklarin kutulari (paylasilir)
        self._kutu_m = {}
        self.sutun = {k: list(v) for k, v in taban.sutun.items()}
        self.ufuk = dict(taban.ufuk)
        if self.ufuk.get("tur") == "halka":
            self.ufuk["r"] = max(self.ufuk["r"], self._zemin_kenari() - 1.0)
        self.kalkis, self.gelis, self.yer_alti, self.patlamalar = {}, {}, {}, []
        for e in patlamalar:
            self._yer_alti_ekle(e)
        for e in patlamalar:
            self._patlat(e, G)

    def _zemin_kenari(self):
        """Halka ufuk icin: her yondeki en dis zemin blogunun en yakini (blok)."""
        en_dis = {}
        for (x, y, z) in self.harita:
            a = int(math.degrees(math.atan2(z + 0.5, x + 0.5)) // 2)
            r = math.hypot(x + 0.5, z + 0.5)
            if r > en_dis.get(a, 0.0):
                en_dis[a] = r
        return min(en_dis.values()) if en_dis else 0.0

    def _yer_alti_ekle(self, e):
        x0, z0 = math.floor(e["nokta"][0]), math.floor(-e["nokta"][1])
        r = self.YER_ALTI_YARICAP
        for x in range(x0 - r, x0 + r + 1):
            for z in range(z0 - r, z0 + r + 1):
                ys = self.sutun.get((x, z), ())
                if not ys:
                    continue
                y_min = min(ys)
                # surun (ya da baska bir tas yapinin) altinda temel: tas
                ust = self.harita.get((x, y_min + 1, z))
                temel = ust is not None and ust["t"] in self.TEMEL_USTU
                for i, t in enumerate(self.YER_ALTI):
                    t = self.TEMEL if temel else t
                    p = (x, y_min - 1 - i, z)
                    if p in self.harita or p in self.yer_alti:
                        continue
                    self.yer_alti[p] = {"p": list(p), "t": t, "s": {}}
                    ys_ = self.sutun.setdefault((x, z), [])
                    ys_.append(p[1])
                    ys_.sort()

    def zemin_seviyesi(self, x, y, r=3):
        """Noktanin cevresindeki (2r+1)^2 sutunda patlamadan onceki en sik
        yuzey yuksekligi: yerin seviyesi (sur, ev ve agac sutunlari azinlikta)."""
        say = {}
        for dx in range(-r, r + 1):
            for dy in range(-r, r + 1):
                h = Mekan.yuzey(self, x + dx, y + dy, None, None)
                if h > YOK + 1:
                    say[h] = say.get(h, 0) + 1
        if not say:
            return YOK
        return max(say, key=lambda h: (say[h], -h))

    def _bas_dolu(self, x, y, z, t, boy):
        """Ayakta duranin boyu boyunca ilk dolu yukseklik, bos ise None."""
        for k in range(1, 9):
            q = [x, y, z + boy * k / 8.0]
            if self.kati_mi(q, saydam_gecer=False, t=t):
                return q[2]
        return None

    def _ozgun(self, p):
        q = self.harita.get(p)
        return q if q is not None else self.yer_alti.get(p)

    def _blok(self, p, t=None):
        if t is not None:
            for a, b, q in self.gelis.get(p, ()):
                if a <= t < b:
                    return q
            if t >= self.kalkis.get(p, math.inf):
                return None
        return self._ozgun(p)

    def kutular(self, p, t=None):
        q = self._blok(p, t)
        if q is None:
            return []
        k = (p, id(q))
        if k not in self._kutu_m:
            self._kutu_m[k] = ([] if blok_kur.sekil(q["t"]) in GECIRGEN
                               else blok_kur.kutular(q["t"], q.get("s", {})))
        return self._kutu_m[k]

    def _dolu(self, p, t):
        q = self._blok(p, t)
        return q is not None and blok_kur.sekil(q["t"]) not in GECIRGEN

    def _patlat(self, e, G):
        t = e["t"]
        once = t - 1e-6
        x, y = e["nokta"][0], e["nokta"][1]
        if len(e["nokta"]) > 2:
            z = e["nokta"][2]
        else:
            # creeper yerde yuruyerek gelir: cevrenin zemin seviyesinden en cok
            # bir adim yukaridaki yuzeye basar (cukurda cukurun dibine; surun
            # dibinde surun tepesine degil)
            z = self.yuzey(x, y, self.zemin_seviyesi(x, y), once)
        if z <= YOK + 1:
            raise ValueError("patla: (%.2f, %.2f) altinda zemin yok" % (x, y))
        # creeper orada durabilir mi (film aracinda duvar carpismasi yok;
        # denetlenmezse blogun icinde patlardi)
        dolu_z = self._bas_dolu(x, y, z, once, G.CREEPER_BOY)
        if dolu_z is not None:
            raise ValueError("patla: (%.2f, %.2f, %.2f) noktasinda creeper blogun icinde kalir "
                             "(%.2f yukseklikte blok)" % (x, y, z, dolu_z))
        mc = (x, z, -y)

        def blok_al(p):
            q = self._blok(p, once)
            return q["t"] if q is not None else None
        kirilan = G.kirilan_bloklar(blok_al, mc, e["yaricap"], e["tohum"])
        turler = {p: blok_al(p) for p in kirilan}
        for p in kirilan:
            aktif = [iv for iv in self.gelis.get(p, ()) if iv[0] <= once < iv[1]]
            if aktif:
                aktif[0][1] = t                     # onceki patlamanin molozu kirildi
            else:
                self.kalkis[p] = t
        tm = t + G.MOLOZ_GECIKME
        yeni = G.moloz(lambda p: self._dolu(p, t + 1e-6), kirilan, turler, mc, e["tohum"])
        konan = []
        for q in yeni:
            p = tuple(q["p"])
            eski = self._blok(p, tm)
            if eski is not None:
                if blok_kur.sekil(eski["t"]) not in GECIRGEN:
                    continue                        # dolu hucre (olmamali): atlanir
                aktif = [iv for iv in self.gelis.get(p, ()) if iv[0] <= tm < iv[1]]
                if aktif:
                    aktif[0][1] = tm                # moloz otu, cicegi ortuyor
                else:
                    self.kalkis[p] = min(self.kalkis.get(p, math.inf), tm)
            self.gelis.setdefault(p, []).append([tm, math.inf, q])
            ys = self.sutun.setdefault((p[0], p[2]), [])
            if p[1] not in ys:
                ys.append(p[1])
                ys.sort()
            konan.append(p)
        self.patlamalar.append({"t": t, "nokta": [x, y, z], "mc": mc, "yaricap": e["yaricap"],
                                "tohum": e["tohum"], "aktor": e.get("aktor"), "kirilan": sorted(kirilan),
                                "turler": {p: turler[p] for p in kirilan}, "moloz": konan, "moloz_t": tm})

    def cizim_gruplari(self):
        """Cizim icin: (sabit bloklar, [(t_bas, t_son, [blok])]) -- her grup
        bir nesne, t_bas'ta belirir, t_son'da kaybolur (ozgun ve yer alti
        bloklarinda t_bas -inf)."""
        sabit, gruplar = [], {}
        for q in list(self.bloklar) + list(self.yer_alti.values()):
            p = tuple(q["p"])
            if p in self.kalkis:
                gruplar.setdefault((-math.inf, self.kalkis[p]), []).append(q)
            else:
                sabit.append(q)
        for p, ivler in self.gelis.items():
            for a, b, q in ivler:
                gruplar.setdefault((a, b), []).append(q)
        return sabit, [(a, b, g) for (a, b), g in sorted(gruplar.items())]


def yukle(senaryo):
    """Senaryonun blok mekani (onbellekte), yoksa None. Senaryoda "patla"
    olayi varsa patlamalari islenmis ZamanliMekan (patlama listesine gore
    onbellekte; ortak Mekan degismez)."""
    ad = senaryo.get("mekan")
    if ad not in MEKANLAR:
        return None
    # hizli yol: zemin her aktor ve her karede soruluyor; ayni senaryo nesnesi
    # ve ayni olay listesi (ayni uzunluk) icin onceki sonuc (nesneler tutulur,
    # id baska bir nesneye gecemez)
    h = _hizli.get(id(senaryo))
    olaylar = senaryo.get("olaylar")
    if h is not None and h[0] is senaryo and h[1] is olaylar and h[2] == len(olaylar or ()) and h[3] == ad:
        return h[4]
    if ad not in _onbellek:
        _onbellek[ad] = Mekan(ad)
    import gedik as G
    pl = G.patlama_olaylari(senaryo)
    if not pl:
        sonuc = _onbellek[ad]
    else:
        anahtar = (ad, tuple((e["t"], tuple(e["nokta"]), e["yaricap"], e["tohum"]) for e in pl))
        if anahtar not in _onbellek:
            _onbellek[anahtar] = ZamanliMekan(_onbellek[ad], pl)
        sonuc = _onbellek[anahtar]
    _hizli[id(senaryo)] = (senaryo, olaylar, len(olaylar or ()), ad, sonuc)
    return sonuc


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
