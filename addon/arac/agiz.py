# -*- coding: utf-8 -*-
"""AGIZ VE BOYNUZ -- film aktorlerinin yuz ifadesi ve boynuzu    v7.99.16

Kullanici (2026-11-02): "bu yontemleri ekleyelim, butun araclari bul,
yapmaya basla; 2. bolumun Part 2'sinde bu sisteme gecelim." Getirdigi iki
yontem:

AGIZ -- dokuyla yapilan agiz (Minecraft animasyonlarinda en yaygin yol):
yuzun hemen onunde ince bir katman, kafa kemigine bagli; sekiller kareye
gore ANINDA degisir. Sekil adlari dudak senkronunun alisilmis harfleri
(Preston Blair / Rhubarb Lip Sync: A-H, X dinlenme) + uc ifade.

    X  dinlenme: skinin kendi yuzu (katman gizli)
    A  kapali: M B P              E  yuvarlak: O O
    B  az acik, disler: cogu unsuz, I I    F  buzuk: U U
    C  acik: E                    G  ust disler alt dudakta: F V
    D  genis acik: A              H  dil: L
    gulumse, sirit (disli), kahkaha

Sekiller KENDI cizimimiz, kodla piksel piksel (dosya yok). Kullanici bir
karakterin agizlarini kendisi cizerse kaynak_doku/agiz/<skin>.png onun
yerine gecer (yan yana hucreler, SEKILLER sirasinda).

Agiz yuzun son satirlarinda (varsayilan 6-7). Gozleri o satirlara inen
skin (Zisa: kirmizi gozler 6. satirda) AGIZ_SATIR'da: yalniz 7. satir.

DUDAK SENKRONU -- seslendirme kaydi yok (altyazi var); senkron altyazi
METNINDEN kurulur: Turkce harf -> sekil, konusma hizi ~13 harf/sn, ayni
sekil birlesir, en kisa tutma 2 kare (kullanici: "2-3 karede bir degisim
yeterince dogal"). Kayit gelirse Rhubarb Lip Sync (MIT; Turkce icin
"phonetic" tanicisi) ayni harflerle zaman cizelgesi verir.

BOYNUZ -- kuplerden kademeli: "seytan" (kisa, yukari, hafif one/disa
kivrik, sivrilen), "keci" (geriye ve asagi, kulagin cevresinden dolanan,
daha cok parca). Simetrik ikincisi aynalanarak; kafa kemigine bagli.

Saf Python: Blender gerekmiyor (test/agiz.mjs).
"""
import math

SEKILLER = ["A", "B", "C", "D", "E", "F", "G", "H", "gulumse", "sirit", "kahkaha"]
IFADELER = ("gulumse", "sirit", "kahkaha")

# gozleri 6. satira inen skinler: agiz yalniz 7. satir
AGIZ_SATIR = {"zisa.png": 7}
VARSAYILAN_SATIR = 6

KONUSMA_HIZI = 13.0          # harf/sn (Turkce, sakin konusma)
EN_KISA = 2                  # kare: bir sekil en az bu kadar durur

# Turkce harf -> sekil
_HARF = {}
for h in "mbp":
    _HARF[h] = "A"
for h in "fv":
    _HARF[h] = "G"
_HARF["l"] = "H"
_HARF["a"] = "D"
for h in "eıi":
    _HARF[h] = "C" if h == "e" else "B"
for h in "oö":
    _HARF[h] = "E"
for h in "uü":
    _HARF[h] = "F"
for h in "cçdgğhjknrsştyz":
    _HARF[h] = "B"
_DURAK = {",": 0.18, ";": 0.2, ":": 0.2, ".": 0.32, "!": 0.32, "?": 0.32, "…": 0.4}


OZEL_KLASOR = "kaynak_doku/agiz"


def ozel_atlas(skin_yolu, kok=None):
    """Kullanicinin cizdigi agiz resmi (varsa): kaynak_doku/agiz/<skin adi>.
    Hucreler yan yana, SEKILLER sirasinda, her biri 8 x (8 - satir) piksel."""
    import os
    kok = kok or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    yol = os.path.join(kok, OZEL_KLASOR, os.path.basename(str(skin_yolu)))
    return yol if os.path.isfile(yol) else None


def atlas_hucresi(atlas, sekil, n):
    """atlas: satirlar (ustten) [(r, g, b, a)]; sekil hucresi 8 x n."""
    if sekil == "X":
        return [[(0, 0, 0, 0)] * 8 for _ in range(n)]
    i = SEKILLER.index(sekil)
    if len(atlas) != n or len(atlas[0]) < 8 * (i + 1):
        raise ValueError("agiz resmi %d satir, en az %d sutun olmali" % (n, 8 * len(SEKILLER)))
    return [list(atlas[r][8 * i:8 * i + 8]) for r in range(n)]


def agiz_satiri(skin_yolu):
    import os
    return AGIZ_SATIR.get(os.path.basename(str(skin_yolu)), VARSAYILAN_SATIR)


def _kucuk(h):
    return {"I": "ı", "İ": "i"}.get(h, h).lower()


def dudak(metin, t0, fps=30, hiz=KONUSMA_HIZI):
    """Metinden agiz zaman cizelgesi: [(t, sekil)], son eleman X (susma)."""
    out = []
    t = t0
    dt = 1.0 / hiz
    for h in metin:
        k = _kucuk(h)
        if k in _HARF:
            out.append((t, _HARF[k]))
            t += dt
        elif k in _DURAK:
            out.append((t, "X"))
            t += _DURAK[k] * (KONUSMA_HIZI / hiz)     # hizli konusmada duraklar da kisalir
        elif k.isspace():
            t += dt * 0.6            # kelime arasi: agiz kapanmaz, kisa gecis
    out.append((t, "X"))
    # ayni sekil birlesir; en kisa tutma EN_KISA kare
    sade = []
    for t_, s in out:
        if sade and sade[-1][1] == s:
            continue
        if sade and t_ - sade[-1][0] < EN_KISA / float(fps) - 1e-9:
            # onceki cok kisa kaldi: yeni sekil onun yerine gecer (X her zaman kalir)
            if sade[-1][1] != "X" or s == "X":
                sade[-1] = (sade[-1][0], s)
                if len(sade) > 1 and sade[-2][1] == s:
                    sade.pop()
                continue
            continue
        sade.append((t_, s))
    if not sade or sade[-1][1] != "X":
        sade.append((t, "X"))
    return sade


def konusma_suresi(metin, hiz=KONUSMA_HIZI):
    d = dudak(metin, 0.0, hiz=hiz)
    return d[-1][0]


def harf_sayisi(metin):
    return sum(1 for h in metin if _kucuk(h) in _HARF)


def agiz_cizelgesi(olaylar, aktor, fps=30, yazi_suresi=None):
    """Senaryo olaylarindan bir aktorun agiz cizelgesi [(t, sekil)].
    "soyle" -> dudak senkronu; {"agiz": "gulumse"} -> ifade (bir sonraki
    agiz olayina ya da konusmaya kadar); {"agiz": null} -> dinlenme.
    Konusma altyazinin suresine VE bir sonraki konusmanin basina sigar:
    sigmazsa hiz artar (askerin uzun cumlesi 13 harf/sn'de Omer'in
    "Tamam"inin ustune tasiyordu)."""
    cikti = []
    ifade = "X"
    sirali = sorted(olaylar, key=lambda o: o["t"])
    konusmalar = [o["t"] for o in sirali if o.get("soyle")]
    for o in sirali:
        if o.get("aktor") != aktor:
            continue
        if "agiz" in o:
            ifade = o["agiz"] or "X"
            cikti.append((o["t"], ifade))
        if o.get("soyle") and o.get("agiz_kapali") is not True:
            pencere = o.get("sure", yazi_suresi(o["soyle"]) if yazi_suresi else 99.0)
            sonraki = [t for t in konusmalar if t > o["t"] + 1e-9]
            if sonraki:
                pencere = min(pencere, sonraki[0] - o["t"])
            # sure 1/hiz ile olcekleniyor (harf, bosluk ve duraklar): dogal
            # hizda sigmiyorsa hiz tam hedefe oturur
            hedef = max(0.3, pencere * 0.85)
            dogal = konusma_suresi(o["soyle"])
            hiz = KONUSMA_HIZI * max(1.0, dogal / hedef)
            d = dudak(o["soyle"], o["t"], fps, hiz=hiz)
            cikti += d[:-1] + [(d[-1][0], ifade)]
    cikti.sort(key=lambda x: x[0])
    # zaman sirasi: ayni andaki son yazilan gecer
    son = []
    for t, s in cikti:
        if son and abs(son[-1][0] - t) < 1e-9:
            son[-1] = (t, s)
        elif not son or son[-1][1] != s:
            son.append((t, s))
    return son


def sekil_karede(cizelge, t):
    s = "X"
    for t_, s_ in cizelge:
        if t_ <= t + 1e-9:
            s = s_
        else:
            break
    return s


# ---------------- Thomas Rig Legacy'nin 3B agzi ----------------
# Kullanici (2026-11-02): "Thomas Rig Legacy kullan, onda agiz da var."
# Thomas kafasinin kullanildigi planlarda (goz: "thomas") agiz iskeletin
# kendi agzidir (kafa orgusunde sekil anahtarlari, ust/alt dis, dil).
# Kontroller olculdu (REFERANS_THOMAS_RIG.md "Agiz"): iUI_MouthController
# konumu x -0,1648..0,1648 (eksi buzuk "o", arti genis), y -0,2448..0,0848
# (eksi acik, arti kapali); Z donusu eksi gulumseme, arti somurtma; dort
# surgu y 0..0,105 (yuvarlak, yumusak, kare, dis araligi).
THOMAS_KONTROL = "iUI_MouthController"
THOMAS_SURGU = {"yuvarlak": "iUI_RoundMouth", "yumusak": "iUI_SmoothMouth",
                "kare": "iUI_SquarreMouth", "dis": "iUI_TeethGap"}
THOMAS_AGIZ = {
    "X": {},
    "A": {"konum": (0.0, 0.06)},
    "B": {"konum": (0.07, -0.05)},
    "C": {"konum": (0.0, -0.12)},
    "D": {"konum": (0.0, -0.2448)},
    "E": {"konum": (-0.07, -0.14), "yuvarlak": 0.105},
    "F": {"konum": (-0.1648, -0.08)},
    "G": {"konum": (0.05, -0.04), "kare": 0.06},
    "H": {"konum": (0.0, -0.15), "yumusak": 0.105},
    # kapali gulumseme gorunmuyordu (olculdu): agiz cok az aralik
    "gulumse": {"konum": (0.04, -0.035), "don": -0.6},
    "sirit": {"konum": (0.12, -0.08), "don": -0.6},
    "kahkaha": {"konum": (0.08, -0.22), "don": -0.5},
}
THOMAS_SINIR = {"x": (-0.1648, 0.1648), "y": (-0.2448, 0.0848), "surgu": (0.0, 0.105)}


def thomas_degerleri(sekil):
    """{kemik: {"location": (x, y, z), "rotation_euler": (x, y, z)}} -- bir
    sekil icin Thomas iskeletinin agiz kontrolleri (sinirlar icinde)."""
    a = THOMAS_AGIZ[sekil]
    x, y = a.get("konum", (0.0, 0.0))
    out = {THOMAS_KONTROL: {"location": (x, y, 0.0), "rotation_euler": (0.0, 0.0, a.get("don", 0.0))}}
    for ad, kem in THOMAS_SURGU.items():
        out[kem] = {"location": (0.0, a.get(ad, 0.0), 0.0)}
    return out


# ---------------- hucre cizimi ----------------
def _koyu(c, k):
    return tuple(int(max(0, min(255, v * k))) for v in c[:3])


def _parlaklik(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def ten_rengi(yuz, satir):
    """Agiz satirlarinin en sik rengi (skinin teni)."""
    say = {}
    for r in range(satir, 8):
        for c in range(1, 7):
            p = tuple(yuz[r][c][:3])
            say[p] = say.get(p, 0) + 1
    return max(say.items(), key=lambda kv: kv[1])[0]


def agiz_hucresi(yuz, sekil, satir=VARSAYILAN_SATIR):
    """yuz: 8x8 [(r, g, b, a)] (skin dosyasindaki on yuz, ustten). Donus:
    (8 - satir) satir x 8 sutun [(r, g, b, a)]; a = 0 olan piksel skinin
    kendi yuzunu gosterir. sekil == "X": hucre tamamen saydam."""
    n = 8 - satir
    bos = (0, 0, 0, 0)
    out = [[bos] * 8 for _ in range(n)]
    if sekil == "X":
        return out
    ten = ten_rengi(yuz, satir)
    koyu_ten = _parlaklik(ten) < 70
    ic = (70, 16, 22) if koyu_ten else (40, 8, 10)          # agiz ici
    dis = (236, 234, 222)                                   # disler
    dil = (196, 84, 96)
    dudak = (150, 52, 60) if koyu_ten else _koyu(ten, 0.62)
    # once agiz bolgesini (1-6 sutun) tenle ort: skinin kendi agzi gorunmesin
    for r in range(n):
        for c in range(1, 7):
            out[r][c] = tuple(ten) + (255,)

    def koy(r, cs, renk):
        if 0 <= r < n:
            for c in cs:
                out[r][c] = tuple(renk) + (255,)
    alt = n - 1                      # tek satirlik agizda ust = alt
    ust = 0
    if sekil == "A":
        koy(alt if n == 1 else ust, range(2, 6), dudak)
    elif sekil == "B":
        koy(ust, (2, 5), ic)
        koy(ust, (3, 4), dis)
    elif sekil == "C":
        koy(ust, range(2, 6), ic)
        if n > 1:
            koy(alt, (3, 4), ic)
    elif sekil == "D":
        koy(ust, (2, 5), ic)
        koy(ust, (3, 4), dis)
        if n > 1:
            koy(alt, range(2, 6), ic)
        else:
            koy(ust, range(2, 6), ic)
            koy(ust, (3,), dis)
    elif sekil == "E":
        koy(ust, (3, 4), ic)
        if n > 1:
            koy(alt, (3, 4), ic)
            koy(ust, (2, 5), dudak)
    elif sekil == "F":
        koy(ust, (3, 4), ic if n == 1 else dudak)
        if n > 1:
            koy(ust, (3,), ic)
    elif sekil == "G":
        koy(ust, range(2, 6), dis)
        if n > 1:
            koy(alt, range(2, 6), dudak)
    elif sekil == "H":
        koy(ust, range(2, 6), ic)
        if n > 1:
            koy(alt, (3, 4), dil)
        else:
            koy(ust, (3, 4), dil)
    elif sekil == "gulumse":
        if n > 1:
            koy(ust, (1, 6), ic)
            koy(alt, range(2, 6), ic)
        else:
            koy(ust, range(2, 6), ic)
    elif sekil == "sirit":
        if n > 1:
            koy(ust, (1, 6), ic)
            koy(ust, range(2, 6), dis)
            koy(alt, range(2, 6), ic)
        else:
            koy(ust, (1, 6), ic)
            koy(ust, range(2, 6), dis)
    elif sekil == "kahkaha":
        koy(ust, (1, 6), ic)
        koy(ust, range(2, 6), dis)
        if n > 1:
            koy(alt, range(1, 7), ic)
            koy(alt, (3, 4), dil)
    else:
        raise ValueError("agiz sekli yok: %s" % sekil)
    return out


# ---------------- boynuz ----------------
# kafa kemiginin ic uzayinda piksel (Bedrock dosya uzayi): kafa x -4..4,
# y 24..32, on yuz z = -4. Parca: (merkez [x, y, z], kenar). Sag boynuz
# (x > 0) yazilir, sol aynalanir.
def boynuz_parcalari(tur="seytan"):
    if tur == "seytan":
        # kisa, yukari, hafif one ve disa kivrik, sivrilen (5 kademe)
        yol = [((2.6, 32.9, -1.6), 2.0), ((2.9, 34.5, -2.0), 1.7), ((3.3, 35.9, -2.5), 1.4),
               ((3.6, 37.1, -3.1), 1.05), ((3.8, 38.0, -3.7), 0.7)]
    elif tur == "keci":
        # geriye, sonra asagi; kulagin (kafanin yan-arkasi) cevresinden dolanip
        # one kivrilan uc (9 kademe)
        yol = [((2.8, 32.7, 0.6), 2.0), ((3.4, 33.6, 2.0), 1.9), ((4.1, 33.7, 3.4), 1.8),
               ((4.7, 32.9, 4.4), 1.7), ((5.1, 31.6, 4.6), 1.6), ((5.3, 30.2, 4.0), 1.45),
               ((5.3, 29.0, 2.9), 1.3), ((5.1, 28.4, 1.6), 1.1), ((4.8, 28.5, 0.5), 0.9)]
    else:
        raise ValueError("boynuz turu yok: %s (seytan / keci)" % tur)
    sag = [{"merkez": list(m), "kenar": k} for m, k in yol]
    sol = [{"merkez": [-m[0], m[1], m[2]], "kenar": k} for m, k in yol]
    return sag + sol


def boynuz_kupleri(tur="seytan"):
    """Bedrock kup tanimlari (origin, size) -- kafa kemigine eklenebilir."""
    out = []
    for p in boynuz_parcalari(tur):
        (x, y, z), k = p["merkez"], p["kenar"]
        out.append({"origin": [x - k / 2, y - k / 2, z - k / 2], "size": [k, k, k]})
    return out
