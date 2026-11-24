# -*- coding: utf-8 -*-
"""Ice-man'in buz ordusu: zombi, iskelet, creeper, orumcek (yalniz film).  2026-11-24

Kullanici (2026-11-24): "Part 2'de siradaki is buz yaratiklari: zombi, iskelet,
creeper ve orumcek. Olculerini oyunun kendi model kodundan okuyup skinlerini
kodla cizeceksin." Genel gorunus ayni gun onaylandi (SERI_SEZON1.md): zombi
donmakta (bir kismi buz kabuklu), iskelet kristalli ve buz yayli, creeper kar
renginde ve tislarken yuzu isiyan, orumcek koyu lacivert ve sirti kristalli;
hepsi Ice-man'in turkuaz renklerinde, gozleri camgobegi. Yaratiklar buzdan
yapilmis degil, BUZLASMAKTA (buz virusu): ayni yaratigin 2-3 asamasi
kalabalikta cesitlilik verir.

MODEL UYDURULMADI. Kutular, pivotlar ve donusler Mojang'in Java 26.3 istemci
JAR'indan (SHA-1 e877b6a0...7b87, koylu.py ile ayni dosya) javap ile okundu:
  zombi    LayerDefinitions: ZOMBIE = HumanoidModel.createMesh(NONE, 0)
  iskelet  SkeletonModel.createBodyLayer = createMesh + createDefaultSkeletonMesh
           (kol ve bacak 2x12x2); el: SkeletonModel.translateToHand kolu 1 px
           iceri kaydirip tutuyor
  creeper  CreeperModel.createBodyLayer(NONE): dort bacak tek kutu listesi
  orumcek  SpiderModel.createSpiderBodyLayer: 8 bacak offsetAndRotation
Sayilar alindi, dosya alinmadi: JAR depoya girmez (REFERANS_MOJANG_KILAVUZ.md
"Buz ordusu modelleri"). Dokular Mojang'in DEGIL, her piksel burada ciziliyor.

KEMIK ADLARI: zombi ve iskelet aktorun iskeletini kullaniyor (root > waist >
body > head/kollar, root > bacaklar; rightItem/leftItem): film aracinin aktor
hareketleri onlara da gecsin diye. Creeper ve orumcek Java alan adlarini
tasiyor (rightHindLeg ...).

DOKU DUZENI (64x64): Java'nin texOffs'u korunuyor. Java'da ayna ile ortak
kullanilan parcalar (sol kol ve bacak, creeper'in dort bacagi, orumcegin sol
bacaklari) kendi alanini aliyor (AYRI_UV): film araci (bedrock_onizleme.kupler)
"mirror"u uygulamiyor, bir de buz her parcada farkli yayilsin diye.

CIZIM: dokunun her pikseli modelin uzerindeki 3B yerine cevriliyor (kupler'in
UV kurali, yani filmde gorundugu yer). Buz, damar ve kar o 3B alanda tanimli,
kutu kenarlarindan kesintisiz geciyor. Kristaller ayri kupler, yuzleri
paletten tek renk; isiyan pikseller ayri bir isima haritasinda (_isik.png;
creeper'da tislama icin ikincisi: _tislama.png).

DUZELTME (kullanici, ayni gun: "Zombi ve iskeleti daha iyi yapmaya calis"):
buz boya degil HACIM: govdeyi saran yari saydam KABUK katmani. Kalinliklar
oyunun zirh katmanlarindan (LayerDefinitions: INNER_ARMOR_DEFORMATION 0.5,
OUTER_ARMOR_DEFORMATION 1.0; oyunun buz iskeleti Stray de kemigini
HumanoidModel.createMesh(0.25) ile sarar). Zombi: isirik V yakadaki tende,
damar yalniz tende ve koyu cerceveli, kabuk sol yarida, uzanan kollarin
altinda buz sarkitlari, morarmis eller ve ayaklar. Iskelet: kaburga aralari
bos, icinde isiyan buz kalbi; kafatasinda isiyan catlak ve buz taci; bilek ve
inciklerde icinden kemik gorunen kabuk.

    python3 addon/arac/buz_ordu.py <cikti_klasoru>
"""
import json
import math
import os
import struct
import sys
import zlib

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bedrock_onizleme as B  # noqa: E402  (UV ve kemik zinciri kurali film araciyla ayni)

DOKU = 64
ASAMALAR = {"zombi": 3, "iskelet": 2, "creeper": 2, "orumcek": 2}

# ---------------------------------------------------------------- olculer
# Java model uzayi: y ASAGI, yuz -z'ye bakar, (0, 24, 0) zemin.
# parca: (java_adi, mutlak pivot, donus (radyan x, y, z) | None,
#         [((x, y, z, w, h, d) pivota gore, texOffs, sisirme, ayna)])
PI4, PI8, ORTA = 0.7853982, 0.3926991, 0.58119464      # bayt kodundaki sabitler
_KAFA = ((-4, -8, -4, 8, 8, 8), (0, 0), 0.0, False)
_SAPKA = ((-4, -8, -4, 8, 8, 8), (32, 0), 0.5, False)
_GOVDE = ((-4, 0, -2, 8, 12, 4), (16, 16), 0.0, False)
_OB_SAG = ((-15, -1, -1, 16, 2, 2), (18, 0), 0.0, False)
_OB_SOL = ((-1, -1, -1, 16, 2, 2), (18, 0), 0.0, True)
_CR_BACAK = ((-2, 0, -2, 4, 6, 4), (0, 16), 0.0, False)
JAVA = {
    "zombi": [
        ("head", (0, 0, 0), None, [_KAFA]),
        ("hat", (0, 0, 0), None, [_SAPKA]),
        ("body", (0, 0, 0), None, [_GOVDE]),
        ("right_arm", (-5, 2, 0), None, [((-3, -2, -2, 4, 12, 4), (40, 16), 0.0, False)]),
        ("left_arm", (5, 2, 0), None, [((-1, -2, -2, 4, 12, 4), (40, 16), 0.0, True)]),
        ("right_leg", (-1.9, 12, 0), None, [((-2, 0, -2, 4, 12, 4), (0, 16), 0.0, False)]),
        ("left_leg", (1.9, 12, 0), None, [((-2, 0, -2, 4, 12, 4), (0, 16), 0.0, True)]),
    ],
    "iskelet": [
        ("head", (0, 0, 0), None, [_KAFA]),
        ("hat", (0, 0, 0), None, [_SAPKA]),
        ("body", (0, 0, 0), None, [_GOVDE]),
        ("right_arm", (-5, 2, 0), None, [((-1, -2, -1, 2, 12, 2), (40, 16), 0.0, False)]),
        ("left_arm", (5, 2, 0), None, [((-1, -2, -1, 2, 12, 2), (40, 16), 0.0, True)]),
        ("right_leg", (-2, 12, 0), None, [((-1, 0, -1, 2, 12, 2), (0, 16), 0.0, False)]),
        ("left_leg", (2, 12, 0), None, [((-1, 0, -1, 2, 12, 2), (0, 16), 0.0, True)]),
    ],
    "creeper": [
        ("head", (0, 6, 0), None, [_KAFA]),
        ("body", (0, 6, 0), None, [_GOVDE]),
        ("right_hind_leg", (-2, 18, 4), None, [_CR_BACAK]),
        ("left_hind_leg", (2, 18, 4), None, [_CR_BACAK]),
        ("right_front_leg", (-2, 18, -4), None, [_CR_BACAK]),
        ("left_front_leg", (2, 18, -4), None, [_CR_BACAK]),
    ],
    "orumcek": [
        ("head", (0, 15, -3), None, [((-4, -4, -8, 8, 8, 8), (32, 4), 0.0, False)]),
        ("body0", (0, 15, 0), None, [((-3, -3, -3, 6, 6, 6), (0, 0), 0.0, False)]),
        ("body1", (0, 15, 9), None, [((-5, -4, -6, 10, 8, 12), (0, 12), 0.0, False)]),
        ("right_hind_leg", (-4, 15, 2), (0, PI4, -PI4), [_OB_SAG]),
        ("left_hind_leg", (4, 15, 2), (0, -PI4, PI4), [_OB_SOL]),
        ("right_middle_hind_leg", (-4, 15, 1), (0, PI8, -ORTA), [_OB_SAG]),
        ("left_middle_hind_leg", (4, 15, 1), (0, -PI8, ORTA), [_OB_SOL]),
        ("right_middle_front_leg", (-4, 15, 0), (0, -PI8, -ORTA), [_OB_SAG]),
        ("left_middle_front_leg", (4, 15, 0), (0, PI8, ORTA), [_OB_SOL]),
        ("right_front_leg", (-4, 15, -1), (0, -PI4, -PI4), [_OB_SAG]),
        ("left_front_leg", (4, 15, -1), (0, PI4, PI4), [_OB_SOL]),
    ],
}

# Java'da aynayla ortak kullanilan alanlarin yerine bizim alanlarimiz
AYRI_UV = {
    "zombi": {"left_arm": (32, 48), "left_leg": (16, 48)},
    "iskelet": {"left_arm": (32, 48), "left_leg": (16, 48)},
    "creeper": {"left_hind_leg": (0, 32), "right_front_leg": (16, 32), "left_front_leg": (32, 32)},
    "orumcek": {ad: (0, 32) for ad in ("left_hind_leg", "left_middle_hind_leg",
                                       "left_middle_front_leg", "left_front_leg")},
}

_INSAN = [("root", None, None, [0, 0, 0]), ("waist", None, "root", [0, 12, 0]),
          ("body", "body", "waist", None), ("head", "head", "body", None),
          ("hat", "hat", "head", None),
          ("rightArm", "right_arm", "body", None), ("rightItem", None, "rightArm", None),
          ("leftArm", "left_arm", "body", None), ("leftItem", None, "leftArm", None),
          ("rightLeg", "right_leg", "root", None), ("leftLeg", "left_leg", "root", None)]
# (bedrock adi, java adi, ebeveyn, sabit pivot)
KEMIK = {
    "zombi": _INSAN, "iskelet": _INSAN,
    "creeper": [("root", None, None, [0, 0, 0]), ("body", "body", "root", None),
                ("head", "head", "body", None),
                ("rightHindLeg", "right_hind_leg", "root", None),
                ("leftHindLeg", "left_hind_leg", "root", None),
                ("rightFrontLeg", "right_front_leg", "root", None),
                ("leftFrontLeg", "left_front_leg", "root", None)],
    "orumcek": [("root", None, None, [0, 0, 0]), ("body0", "body0", "root", None),
                ("head", "head", "body0", None), ("body1", "body1", "body0", None)]
               + [(a, j, "body0", None) for a, j in (
                   ("rightHindLeg", "right_hind_leg"), ("leftHindLeg", "left_hind_leg"),
                   ("rightMiddleHindLeg", "right_middle_hind_leg"),
                   ("leftMiddleHindLeg", "left_middle_hind_leg"),
                   ("rightMiddleFrontLeg", "right_middle_front_leg"),
                   ("leftMiddleFrontLeg", "left_middle_front_leg"),
                   ("rightFrontLeg", "right_front_leg"), ("leftFrontLeg", "left_front_leg"))],
}
# Oyunun olcusunde zombinin bacaklari 0.2 px ust uste biniyor (x -0.1..0.1): on
# yuzler ayni duzlemde ve o seritte isik kendi golgesine dusuyor (onizlemede
# bacak arasinda siyah cizgi). Film araci aktorde ayni careyi kullaniyor
# (blender_film.DIS_KATMAN_PAY["leftLeg"] = 0.01): sol bacak 0.01 px sisiyor.
AYRISMA = {("zombi", "left_leg"): 0.01}
# Esya noktasi: aktorunki [-6, 13.3, 0.5] (4 px kol). Iskelet: translateToHand
# kolu 1 px iceri aliyor, nokta da 1 px iceri.
ESYA = {"zombi": ([-6, 13.3, 0.5], [6, 13.3, 0.5]), "iskelet": ([-5, 13.3, 0.5], [5, 13.3, 0.5])}

# Buz kabugu (yari saydam ust katman). Kalinliklar oyunun zirh katmanlarindan:
# LayerDefinitions INNER_ARMOR_DEFORMATION = 0.5, OUTER_ARMOR_DEFORMATION = 1.0.
ZIRH_IC, ZIRH_DIS = 0.5, 1.0
# zombi: govdeyi ZIRH_IC ile saran katman; doku duzeni 64x64 oyuncu derisinin
# dis katmanlari (ceket, kollar, pantolon)
ZOMBI_KABUK = {"body": (16, 32), "rightArm": (40, 32), "leftArm": (48, 48),
               "rightLeg": (0, 32), "leftLeg": (0, 48)}
# iskelet: kemigin kesiti her yandan ZIRH_DIS kalin (4x4), boyu kolun ve bacagin
# alt yarisi (bilek, incik). Bacak kabuklari aralarinda 0.1 px birakir (degen
# yuzler ust uste binip titremesin). (origin, size, uv)
ISKELET_KABUK = {"rightArm": ([-7, 11.6, -2], [4, 6, 4], (0, 32)),
                 "leftArm": ([3, 11.6, -2], [4, 6, 4], (16, 32)),
                 "rightLeg": ([-4.05, 1, -2], [4, 6, 4], (32, 32)),
                 "leftLeg": ([0.05, 1, -2], [4, 6, 4], (48, 32))}
# palet (x0, y0, satir eni): kutularin ve kabuklarin bos biraktigi kose
PALET_YERI = {"zombi": (56, 16, 8), "iskelet": (56, 16, 8), "creeper": (48, 56, 16),
              "orumcek": (48, 56, 16)}


def cevir_pivot(p):
    """Java mutlak pivot -> Bedrock (jar_model_coz.py ile ayni kural)."""
    return [p[0] + 0.0, 24 - p[1] + 0.0, p[2] + 0.0]


def cevir_origin(p, kutu):
    x, y, z, w, h, d = kutu
    return [round(p[0] + x, 4) + 0.0, round(24 - (p[1] + y + h), 4) + 0.0, round(p[2] + z, 4) + 0.0]


def cevir_donus(r):
    """y ve z isareti iki kaynakta da ayni (+ry, +rz). x'in isareti
    jar_model_coz.py (-rx) ile bedrock_onizleme'nin bb_mat'i arasinda
    tartismali; bu dort modelin dinlenme pozunda x donusu YOK, olursa once
    olculsun diye burada duruyor."""
    if abs(r[0]) > 1e-9:
        raise ValueError("x donusu: isaret kurali olculmeden cevrilmez")
    return [0.0, round(math.degrees(r[1]), 4) + 0.0, round(math.degrees(r[2]), 4) + 0.0]


# ---------------------------------------------------------------- renk
CAMGOBEGI = (3, 219, 235)            # Ice-man (#03dbeb)
TURKUAZ = (12, 216, 236)             # #0cd8ec
ACIK_CAM = (140, 245, 255)           # #8cf5ff
TEAL = (29, 134, 142)                # #1d868e
KOYU_TEAL = (23, 62, 69)             # #173e45
KIRAGI = (186, 220, 232)
BUZ1 = (192, 230, 241)
SIYAH = (0, 0, 0)


def kar(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def carp(c, f):
    return tuple(max(0, min(255, int(round(v * f)))) for v in c)


def _karistir(x):
    x &= 0xFFFFFFFF
    x ^= x >> 16
    x = (x * 0x7FEB352D) & 0xFFFFFFFF
    x ^= x >> 15
    x = (x * 0x846CA68B) & 0xFFFFFFFF
    x ^= x >> 16
    return x


def h(*a):
    """Belirlenimci karma -> [0, 1)."""
    x = 0x811C9DC5
    for v in a:
        x = _karistir(x ^ (int(v) & 0xFFFFFFFF))
    return x / 4294967296.0


def _yum(t):
    return t * t * (3 - 2 * t)


def gurultu(p, olcek, tohum):
    """3B deger gurultusu, [0, 1)."""
    x, y, z = p[0] / olcek, p[1] / olcek, p[2] / olcek
    x0, y0, z0 = math.floor(x), math.floor(y), math.floor(z)
    fx, fy, fz = _yum(x - x0), _yum(y - y0), _yum(z - z0)

    def c(i, j, k):
        return h(x0 + i, y0 + j, z0 + k, tohum)

    def ara(a, b, t):
        return a + (b - a) * t
    return ara(ara(ara(c(0, 0, 0), c(1, 0, 0), fx), ara(c(0, 1, 0), c(1, 1, 0), fx), fy),
               ara(ara(c(0, 0, 1), c(1, 0, 1), fx), ara(c(0, 1, 1), c(1, 1, 1), fx), fy), fz)


def fbm(p, olcek, tohum, kat=3):
    t, a, top = 0.0, 1.0, 0.0
    for i in range(kat):
        t += a * gurultu(p, olcek / (2 ** i), tohum + 101 * i)
        top += a
        a *= 0.5
    return t / top


def uzak(a, b):
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))


# ---------------------------------------------------------------- kristal
def yon_acisi(yon):
    """+y'yi `yon`a (dosya uzayi) ceviren Bedrock kup donusu [x, 0, z],
    bedrock_onizleme.bb_mat kuraliyla (test olcuyor)."""
    n = math.sqrt(sum(v * v for v in yon))
    dx, dy, dz = (v / n for v in yon)
    rx = math.degrees(math.asin(max(-1.0, min(1.0, -dz))))
    rz = math.degrees(math.atan2(dx, dy)) if abs(dx) + abs(dy) > 1e-9 else 0.0
    return [round(rx, 3) + 0.0, 0.0, round(rz, 3) + 0.0]


# kristal yuz renkleri: seviye (0 kok, 1 orta, 2 uc) x yuz sinifi
KRISTAL = {
    0: {"up": (196, 240, 250), "ns": (150, 222, 238), "ew": (112, 198, 222), "down": (70, 150, 178)},
    1: {"up": (214, 248, 255), "ns": (166, 234, 248), "ew": (124, 214, 236), "down": (82, 168, 194)},
    2: {"up": (238, 254, 255), "ns": (178, 246, 255), "ew": (134, 232, 248), "down": (96, 192, 214)},
}
# zombi ve iskeletin kristalleri: koku koyu, ucu acik (daha belirgin)
BUZ_KRISTAL = {
    0: {"up": (176, 232, 246), "ns": (108, 198, 224), "ew": (78, 168, 200), "down": (46, 118, 150)},
    1: {"up": (208, 246, 254), "ns": (142, 226, 244), "ew": (104, 200, 228), "down": (66, 148, 180)},
    2: {"up": (242, 255, 255), "ns": (188, 248, 255), "ew": (150, 236, 250), "down": (98, 188, 214)},
}
# iskeletin gogsundeki buz kalbi: her kademesi isiyor
KALP = {
    0: {"up": (120, 238, 250), "ns": (54, 214, 236), "ew": (34, 184, 212), "down": (26, 140, 170)},
    1: {"up": (176, 248, 255), "ns": (96, 232, 248), "ew": (60, 210, 234), "down": (40, 166, 196)},
    2: {"up": (236, 255, 255), "ns": (160, 250, 255), "ew": (110, 236, 250), "down": (70, 196, 222)},
}
SINIF = {"up": "up", "down": "down", "north": "ns", "south": "ns", "east": "ew", "west": "ew"}


class Palet:
    """Kristal ve kuc parcalarin tek renkli hucreleri (dokunun bos kosesinde)."""

    def __init__(self, x0, y0, en):
        self.x0, self.y0, self.en = x0, y0, en
        self.hucre = {}            # ad -> (x, y)
        self.renk = {}             # ad -> (rgb, isik_rgb)

    def ekle(self, ad, rgb, isik=SIYAH):
        if ad not in self.hucre:
            k = len(self.hucre)
            self.hucre[ad] = (self.x0 + k % self.en, self.y0 + k // self.en)
            self.renk[ad] = (tuple(rgb), tuple(isik))
        return self.hucre[ad]


def _kup_uv(palet, adlar):
    return {f: {"uv": list(palet.hucre[adlar[f]]), "uv_size": [1, 1]} for f in B.YUZLER}


def kristal(palet, taban, yon, boy, en, isik=0.0, onek="k", renk=None, isik_kok=0.0):
    """Uc kademeli buz kristali: kok, orta, sivri uc. `taban` dosya uzayinda,
    kok yuzeyin 0.4 px icine gomulu. `isik` ucun (ve onun yarisi kadar
    ortanin) isimasi; `isik_kok` kok ve ortanin en az isimasi (kalp);
    `renk` yuz renk takimi (varsayilan KRISTAL)."""
    renk = renk or KRISTAL
    egim = yon_acisi(yon)
    n = math.sqrt(sum(v * v for v in yon))
    piv = [round(taban[i] - 0.4 * yon[i] / n, 3) for i in range(3)]
    kupler = []
    y = piv[1]
    for sev, (pay, gen) in enumerate(((0.44, 1.0), (0.34, 0.66), (0.26, 0.36))):
        w = round(en * gen, 3)
        hh = round(boy * pay + (0.4 if sev == 0 else 0.0), 3)
        guc = isik if sev == 2 else max(isik * 0.5 if sev == 1 else 0.0, isik_kok)
        adlar = {}
        for f, s in SINIF.items():
            rgb = renk[sev][s]
            ad = "%s%d_%s_%d" % (onek, sev, s, int(round(guc * 100)))
            palet.ekle(ad, rgb, carp(ACIK_CAM if s in ("up", "ns") else TURKUAZ, guc) if guc else SIYAH)
            adlar[f] = ad
        kupler.append({"origin": [round(piv[0] - w / 2, 3), round(y, 3), round(piv[2] - w / 2, 3)],
                       "size": [w, hh, w], "pivot": piv, "rotation": egim, "uv": _kup_uv(palet, adlar)})
        y += hh
    return kupler


# ---------------------------------------------------------------- kristal yerleri
# (kemik, taban (dosya uzayi), yon, boy, en, isik); asamaya gore birikimli
def kristaller(yaratik, asama):
    L = []
    if yaratik == "zombi":
        # isirik (boynun sol dibi)
        L += [(1, "body", (2.3, 23.3, -2.0), (0.25, 0.7, -1), 2.6, 1.3, 0.3, "b"),
              (1, "body", (3.4, 21.9, -2.0), (0.7, 0.3, -1), 1.9, 1.0, 0.3, "b")]
        if asama >= 2:
            # sol omuz kumesi (kabugun ustunde) ve kafanin sol tepesi
            L += [(2, "leftArm", (6.0, 24.4, -0.5), (0.3, 1, -0.2), 4.8, 2.1, 0.3, "b"),
                  (2, "leftArm", (7.5, 24.2, 1.0), (0.9, 1, 0.3), 3.6, 1.6, 0.3, "b"),
                  (2, "leftArm", (4.8, 24.3, 1.3), (-0.15, 1, 0.5), 2.9, 1.3, 0.3, "b"),
                  (2, "leftArm", (8.4, 21.6, -0.4), (1, 0.4, -0.1), 2.7, 1.2, 0.3, "b"),
                  (2, "head", (2.8, 32.4, 1.2), (0.45, 1, 0.3), 3.0, 1.4, 0.3, "b"),
                  # buz sarkitlari: sol on kolun alti. Dinlenmede +z'ye bakar,
                  # kol one kalkinca (zombi duruşu) asagi sarkar.
                  (2, "leftArm", (5.0, 13.8, 2.4), (0, -0.12, 1), 2.8, 1.0, 0.2, "b"),
                  (2, "leftArm", (6.6, 15.4, 2.4), (0, -0.1, 1), 2.0, 0.9, 0.2, "b"),
                  (2, "leftArm", (7.4, 13.0, 2.4), (0, -0.1, 1), 1.5, 0.8, 0.2, "b")]
        if asama >= 3:
            L += [(3, "body", (1.6, 22.6, 2.5), (0.3, 0.6, 1), 4.8, 2.1, 0.3, "b"),       # sirt
                  (3, "body", (-1.2, 20.8, 2.5), (-0.3, 0.45, 1), 3.8, 1.7, 0.3, "b"),
                  (3, "body", (2.8, 18.6, 2.5), (0.5, 0.2, 1), 2.9, 1.3, 0.3, "b"),
                  (3, "head", (1.0, 32.5, -1.6), (0.1, 1, -0.4), 3.8, 1.7, 0.3, "b"),
                  (3, "head", (3.6, 32.5, -2.8), (0.6, 1, -0.6), 2.5, 1.1, 0.3, "b"),
                  (3, "head", (4.5, 30.0, 0.5), (1, 0.4, 0.1), 2.3, 1.0, 0.3, "b"),
                  (3, "rightArm", (-6.0, 24.4, 0.4), (-0.3, 1, 0.2), 2.6, 1.2, 0.3, "b"),
                  (3, "leftArm", (8.5, 17.0, 0.6), (1, -0.05, 0.2), 3.1, 1.4, 0.3, "b"),
                  (3, "rightArm", (-6.0, 13.6, 2.4), (0, -0.12, 1), 2.2, 0.9, 0.2, "b"),
                  (3, "rightArm", (-7.2, 15.0, 2.4), (0, -0.1, 1), 1.5, 0.8, 0.2, "b"),
                  (3, "leftArm", (5.8, 16.6, 2.4), (0, -0.1, 1), 2.1, 0.9, 0.2, "b"),
                  # cenenin altinda (kafanin on-alt kenari) sarkitlar
                  (3, "head", (2.6, 24.0, -3.9), (0.05, -1, -0.1), 1.9, 0.8, 0.2, "b"),
                  (3, "head", (1.2, 24.0, -3.9), (0, -1, -0.1), 1.3, 0.7, 0.2, "b")]
    elif yaratik == "iskelet":
        # buz taci (kafanin ust kenari boyunca), omuz, omurga ve gogusteki buz kalbi
        L += [(1, "head", (-2.6, 32.0, -1.8), (-0.45, 1, -0.35), 2.8, 1.3, 0.3, "b"),
              (1, "head", (2.4, 32.0, 1.4), (0.4, 1, 0.3), 2.3, 1.1, 0.3, "b"),
              (1, "rightArm", (-5.0, 24.0, 0.0), (-0.35, 1, 0.1), 3.2, 1.4, 0.3, "b"),
              (1, "body", (0.0, 20.5, 2.0), (0, 0.4, 1), 2.6, 1.2, 0.3, "b"),
              (1, "body", (0.0, 17.6, 0.0), (0, 1, 0), 3.6, 2.0, 1.0, "kalp")]
        if asama >= 2:
            L += [(2, "head", (0.0, 32.0, -2.6), (0, 1, -0.45), 4.2, 1.7, 0.35, "b"),
                  (2, "head", (-2.8, 32.0, 1.2), (-0.5, 1, 0.25), 3.2, 1.4, 0.3, "b"),
                  (2, "head", (2.8, 32.0, -2.0), (0.5, 1, -0.35), 3.6, 1.5, 0.3, "b"),
                  (2, "head", (0.4, 32.0, 2.6), (0.1, 1, 0.45), 2.8, 1.3, 0.3, "b"),
                  (2, "leftArm", (5.0, 24.0, 0.0), (0.35, 1, -0.1), 3.2, 1.4, 0.3, "b"),
                  (2, "rightArm", (-6.0, 22.0, 0.6), (-1, 0.5, 0.2), 2.5, 1.1, 0.3, "b"),
                  (2, "body", (0.0, 17.5, 2.0), (0, 0.25, 1), 3.4, 1.5, 0.3, "b"),
                  (2, "body", (0.0, 14.5, 2.0), (0, 0.1, 1), 2.5, 1.1, 0.3, "b"),
                  (2, "body", (0.8, 17.4, 0.2), (0.5, 1, 0.1), 2.5, 1.3, 1.0, "kalp"),
                  (2, "body", (-0.9, 17.5, -0.2), (-0.5, 1, -0.1), 2.3, 1.2, 1.0, "kalp"),
                  # bilek kabugunun dis yuzunde sivri buz
                  (2, "rightArm", (-7.0, 15.0, 0.0), (-1, 0.3, 0), 2.5, 1.0, 0.3, "b"),
                  (2, "leftArm", (7.0, 15.0, 0.0), (1, 0.3, 0), 2.5, 1.0, 0.3, "b")]
    elif yaratik == "creeper":
        sar = [(-2.6, 2.4, 1.6), (1.8, 1.8, 1.4)]                  # (x, boy, en) buz sarkitlari
        if asama >= 2:
            sar = [(-3.0, 2.6, 1.0), (-1.4, 1.4, 0.8), (0.2, 3.0, 1.1), (1.9, 1.8, 0.9), (3.2, 1.2, 0.7)]
        for x, boy, en in sar:
            L.append((1, "head", (x, 18.0, -3.3), (0.04 * x, -1, 0), boy, en, 0.2))
        if asama >= 2:
            L += [(2, "head", (-2.2, 26.0, -1.0), (-0.3, 1, -0.2), 3.0, 1.4, 0.3),
                  (2, "head", (1.2, 26.0, 1.6), (0.25, 1, 0.3), 2.4, 1.2, 0.3),
                  (2, "head", (2.9, 26.0, -2.4), (0.5, 1, -0.3), 1.8, 1.0, 0.3)]
    elif yaratik == "orumcek":
        L += [(1, "body1", (0.0, 13.0, 6.5), (0, 1, 0.35), 4.6, 2.0, 0.7),
              (1, "body1", (0.5, 13.0, 9.8), (0.1, 1, 0.45), 5.6, 2.2, 0.7),
              (1, "body1", (-0.4, 13.0, 13.0), (-0.1, 1, 0.6), 3.8, 1.8, 0.7)]
        if asama >= 2:
            L += [(2, "body1", (-3.0, 13.0, 8.2), (-0.6, 1, 0.3), 3.2, 1.5, 0.7),
                  (2, "body1", (3.0, 13.0, 8.6), (0.6, 1, 0.35), 3.4, 1.5, 0.7),
                  (2, "body1", (-2.6, 13.0, 11.8), (-0.55, 1, 0.5), 2.6, 1.3, 0.7),
                  (2, "body1", (2.7, 13.0, 12.2), (0.55, 1, 0.55), 2.8, 1.3, 0.7),
                  (2, "head", (-2.0, 13.0, -6.0), (-0.35, 1, 0.3), 2.0, 1.0, 0.7),
                  (2, "head", (2.0, 13.0, -6.0), (0.35, 1, 0.3), 2.0, 1.0, 0.7)]
    # (kemik, taban, yon, boy, en, isik, tur); tur: k (creeper, orumcek), b (zombi, iskelet), kalp
    return [tuple(x[1:7]) + (x[7] if len(x) > 7 else "k",) for x in L if x[0] <= asama]


# ---------------------------------------------------------------- geometri
def _sapkali(yaratik, asama):
    """zombinin sapka katmani kafanin buz kabugu; bos kalirsa yaratik() budar"""
    return yaratik == "zombi" and asama >= 2


def geometri(yaratik, asama, palet=None):
    palet = palet or Palet(*PALET_YERI[yaratik])
    parca = {p[0]: p for p in JAVA[yaratik]}
    kemikler, pivot = [], {}
    for ad, java_ad, ebeveyn, sabit in KEMIK[yaratik]:
        if yaratik not in ESYA and java_ad is None and ad not in ("root",):
            continue
        b = {"name": ad}
        if ebeveyn:
            b["parent"] = ebeveyn
        if java_ad:
            _, jp, donus, kutular = parca[java_ad]
            b["pivot"] = cevir_pivot(jp)
            if donus:
                b["rotation"] = cevir_donus(donus)
            if java_ad != "hat" or _sapkali(yaratik, asama):
                b["cubes"] = []
                for kutu, uv, sis, _ayna in kutular:
                    uv = AYRI_UV.get(yaratik, {}).get(java_ad, uv)
                    c = {"origin": cevir_origin(jp, kutu), "size": list(kutu[3:]), "uv": list(uv)}
                    sis = sis or AYRISMA.get((yaratik, java_ad), 0.0)
                    if sis:
                        c["inflate"] = sis
                    b["cubes"].append(c)
        elif ad in ("rightItem", "leftItem"):
            b["pivot"] = list(ESYA[yaratik][0 if ad == "rightItem" else 1])
        else:
            b["pivot"] = list(sabit)
        pivot[ad] = b["pivot"]
        kemikler.append(b)
    # buz kabugu: kutu-UV'li yari saydam ust katman (ustune buz dusmeyen kup budanir)
    if yaratik == "zombi" and asama >= 2:
        for ad, uv in ZOMBI_KABUK.items():
            taban = next(b for b in kemikler if b["name"] == ad)["cubes"][0]
            kemikler.append({"name": "buz_" + ad, "parent": ad, "pivot": list(pivot[ad]),
                             "cubes": [{"origin": list(taban["origin"]), "size": list(taban["size"]),
                                        "uv": list(uv),
                                        "inflate": ZIRH_IC + (0.01 if ad == "leftLeg" else 0.0)}]})
    if yaratik == "iskelet" and asama >= 2:
        for ad, (o, boyut, uv) in ISKELET_KABUK.items():
            kemikler.append({"name": "buz_" + ad, "parent": ad, "pivot": list(pivot[ad]),
                             "cubes": [{"origin": list(o), "size": list(boyut), "uv": list(uv)}]})
    turler = {"k": (KRISTAL, "k", 0.0), "b": (BUZ_KRISTAL, "b", 0.0), "kalp": (KALP, "h", 0.8)}
    gruplar = {}
    for kemik, taban, yon, boy, en, isik, tur in kristaller(yaratik, asama):
        renk, onek, kok = turler[tur]
        gruplar.setdefault(kemik, []).extend(kristal(palet, taban, yon, boy, en, isik, onek, renk, kok))
    for kemik, kupler in gruplar.items():
        kemikler.append({"name": "kristal_" + kemik, "parent": kemik, "pivot": list(pivot[kemik]),
                         "cubes": kupler})
    sinir = {"zombi": (2, 3, 1.5), "iskelet": (2, 3, 1.5), "creeper": (2, 2.5, 1.25),
             "orumcek": (3.5, 2, 1)}[yaratik]
    return {"format_version": "1.12.0", "minecraft:geometry": [{
        "description": {"identifier": "geometry.buz_%s_%d" % (yaratik, asama),
                        "texture_width": DOKU, "texture_height": DOKU,
                        "visible_bounds_width": sinir[0], "visible_bounds_height": sinir[1],
                        "visible_bounds_offset": [0, sinir[2], 0]},
        "bones": kemikler}]}


# ---------------------------------------------------------------- piksel -> 3B
class Piksel:
    __slots__ = ("kemik", "yuz", "i", "j", "w", "h", "p", "n", "px", "py", "pivot")


def pikseller(geo):
    """Kutu-UV'li her kupun her yuz pikseli icin Piksel: filmde dunyadaki
    yeri (dosya uzayi, dinlenme pozu), yuzun disa bakan normali ve yuzdeki
    yerel (i, j). Ortak kullanilan UV ilk kupte boyanir."""
    g = geo["minecraft:geometry"][0]
    tw, th = g["description"]["texture_width"], g["description"]["texture_height"]
    goruldu = set()
    for b in g["bones"]:
        for c in b.get("cubes", []):
            if not isinstance(c.get("uv"), list):
                continue
            tek = json.loads(json.dumps(geo))
            for bb in tek["minecraft:geometry"][0]["bones"]:
                bb["cubes"] = [c] if bb["name"] == b["name"] else []
            yuzler = B.kupler(B.Model(tek))
            merkez = [sum(sum(q[i] for q in pts) / 4 for pts, _ in yuzler) / 6 for i in range(3)]
            for ad, (pts, uv) in zip(B.YUZLER, yuzler):
                us = [q[0] * tw for q in uv]
                vs = [(1 - q[1]) * th for q in uv]
                u0, u1 = int(round(min(us))), int(round(max(us)))
                v0, v1 = int(round(min(vs))), int(round(max(vs)))
                TR, TL, BL, BR = pts
                yo = [sum(q[i] for q in pts) / 4 for i in range(3)]
                nn = [yo[i] - merkez[i] for i in range(3)]
                ln = math.sqrt(sum(v * v for v in nn)) or 1.0
                for py in range(v0, v1):
                    for px in range(u0, u1):
                        if (px, py) in goruldu:
                            continue
                        goruldu.add((px, py))
                        s = (px + 0.5 - u0) / (u1 - u0)
                        t = (py + 0.5 - v0) / (v1 - v0)
                        q = [(1 - t) * ((1 - s) * TL[i] + s * TR[i]) + t * ((1 - s) * BL[i] + s * BR[i])
                             for i in range(3)]
                        P = Piksel()
                        P.kemik, P.yuz = b["name"], ad
                        P.i, P.j, P.w, P.h = px - u0, py - v0, u1 - u0, v1 - v0
                        P.p = (-q[0], q[1], q[2])                       # ic uzay -> dosya uzayi
                        P.n = (-nn[0] / ln, nn[1] / ln, nn[2] / ln)
                        P.px, P.py = px, py
                        P.pivot = b["pivot"]
                        yield P


def _birim(v):
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


class Yuzey:
    """Boyanan yuzey: pikseller ve 3B komsuluklari. Komsuluk kutu kenarlarindan
    ve degen yuzlerden (boyun, omuz) gecer; damar ve buz bu yuzden kafadan
    govdeye, govdeden kola kesintisiz yayilir."""

    def __init__(self, geo):
        self.liste = list(pikseller(geo))
        izgara = {}
        for k, P in enumerate(self.liste):
            izgara.setdefault(self._hucre(P.p), []).append(k)
        self.komsu = []
        for k, P in enumerate(self.liste):
            a = self._hucre(P.p)
            kk = []
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for dz in (-1, 0, 1):
                        for j in izgara.get((a[0] + dx, a[1] + dy, a[2] + dz), ()):
                            if j != k:
                                d = uzak(self.liste[j].p, P.p)
                                if d <= 1.25:
                                    kk.append((j, d))
            self.komsu.append(sorted(kk))

    @staticmethod
    def _hucre(p):
        return tuple(int(math.floor(v / 1.3)) for v in p)

    def en_yakin(self, nokta, uygun):
        return min((k for k, P in enumerate(self.liste) if uygun(P)),
                   key=lambda k: (uzak(self.liste[k].p, nokta), k))

    def damar(self, kok, tohum, kol, boy, dal, uygun):
        """Kokten yuzey boyunca dallanan damarlar -> {piksel sirasi: yas}.
        Her kol yonunu korumaya calisir, kokten uzaklasmayi sever, rastgele
        sapar ve arada bir dal verir; kokun yakini kalin."""
        L = self.liste

        def akis(p):
            """yavasca donen 3B akis alani: damar duz cizgi degil, kivrilarak ilerler"""
            return _birim([fbm(p, 4.5, tohum + 300 + 17 * i, 2) - 0.5 for i in range(3)])

        def bos(k):
            """k'dan gidilebilen, baska bir dala DEGMEYEN pikseller (kumelenmesin)."""
            return [j for j, _ in self.komsu[k] if j not in yas and uygun(L[j])
                    and all(n == k or n not in yas for n, d in self.komsu[j] if d <= 1.01)]
        bas = self.en_yakin(kok, uygun)
        yas = {bas: 0}
        kuyruk = [(bas, None, boy, i + 1) for i in range(kol)]
        sayac = 0
        while kuyruk:
            k, v, kalan, kim = kuyruk.pop(0)
            if not bos(k):                       # kok doldu: kokun yakinindan basla
                yakin = sorted((a, h(kk, kim, tohum), kk) for kk, a in yas.items() if a <= 2 and bos(kk))
                if not yakin:
                    continue
                k = yakin[0][2]
            while kalan > 0:
                aday = bos(k)
                if not aday:
                    break
                P = L[k]

                def puan(j):
                    q = L[j].p
                    d = _birim([q[i] - P.p[i] for i in range(3)])
                    ayni = 0.0 if v is None else sum(d[i] * v[i] for i in range(3))
                    ak = akis(q)
                    return (0.6 * ayni + 0.35 * (uzak(q, kok) - uzak(P.p, kok))
                            + 1.3 * sum(d[i] * ak[i] for i in range(3))
                            + 0.9 * (h(j, kim, sayac, tohum) - 0.5))
                j = max(aday, key=puan)
                d = _birim([L[j].p[i] - P.p[i] for i in range(3)])
                v = d if v is None else _birim([0.5 * v[i] + 0.5 * d[i] for i in range(3)])
                yas[j] = yas[k] + 1
                k, kalan, sayac = j, kalan - 1, sayac + 1
                if kalan > 3 and h(k, kim, 77, tohum) < dal:
                    kuyruk.append((k, None, int(kalan * 0.6), kim * 37 + sayac))
        for k in sorted(k for k, a in yas.items() if a <= 2):          # kokte kalin
            for j, d in self.komsu[k]:
                if d <= 1.01 and j not in yas and uygun(L[j]):
                    yas[j] = yas[k]
        return yas

    def taban_esi(self, uygun):
        """Ust katman (kabuk, sapka) pikseli -> altindaki en yakin govde pikseli."""
        izgara = {}
        for k, P in enumerate(self.liste):
            if uygun(P):
                izgara.setdefault(self._hucre(P.p), []).append(k)
        esi = {}
        for k, P in enumerate(self.liste):
            if uygun(P):
                continue
            a = self._hucre(P.p)
            en, enk = 1e9, None
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-2, -1, 0, 1, 2):
                    for dz in (-2, -1, 0, 1, 2):
                        for j in izgara.get((a[0] + dx, a[1] + dy, a[2] + dz), ()):
                            d = uzak(self.liste[j].p, P.p)
                            if d < en:
                                en, enk = d, j
            esi[k] = enk
        return esi

    def yayilim(self, kaynak, adim, uygun):
        """Yuzey boyunca en kisa yol (Dijkstra): {k: baslangic} -> {k: deger};
        `adim` bir piksel ilerlemenin bedeli."""
        import heapq
        en = dict(kaynak)
        yigin = [(v, k) for k, v in kaynak.items()]
        heapq.heapify(yigin)
        while yigin:
            v, k = heapq.heappop(yigin)
            if v > en.get(k, 1e9):
                continue
            for j, d in self.komsu[k]:
                if uygun(self.liste[j]):
                    w = v + d * adim
                    if w < en.get(j, 1e9):
                        en[j] = w
                        heapq.heappush(yigin, (w, j))
        return en


def jit(P, tohum, miktar):
    return 1 + (h(P.px, P.py, tohum) - 0.5) * 2 * miktar


# ---------------------------------------------------------------- ortak: buz kabugu
def kabuk_rengi(P, skor, tohum, saydam=1.0):
    """Yari saydam buz kabugu pikseli -> (rgb, alfa). Kenar (dusuk skor) koyu
    ve belirgin, kabugun kalinligi okunsun; ici camsi: capraz parlama seritleri,
    ic catlaklar. saydam < 1: icinden daha cok gorunur (iskeletin kemigi)."""
    n = fbm(P.p, 2.0, tohum, 2)
    if skor < 0.12:
        return carp((106, 190, 218), jit(P, tohum + 1, 0.05)), int(232 * min(1.0, saydam + 0.15))
    c = kar((156, 216, 236), (216, 245, 252), (n - 0.25) * 1.5)
    a = 172 + 52 * n
    if (P.p[0] * 0.7 + P.p[1] + P.p[2] * 0.7) % 4.6 < 0.75 and n > 0.42:
        c, a = (240, 253, 255), 236                                  # parlama seridi
    elif abs(fbm(P.p, 1.5, tohum + 2, 2) - 0.5) < 0.028:
        c, a = (96, 176, 206), 214                                   # ic catlak
    return carp(c, jit(P, tohum + 3, 0.03)), int(max(40, min(250, a * saydam)))


def ust_katman(P):
    return P.kemik == "hat" or P.kemik.startswith("buz_")


# ---------------------------------------------------------------- zombi
ZT = {"ten": (84, 126, 90), "ten_k": (62, 96, 70), "ten_a": (104, 146, 106), "sac": (42, 62, 48),
      "soguk": (122, 152, 170), "morarti": (72, 84, 130),
      "gom_k": (24, 98, 108), "gom_a": (50, 158, 166), "pan_k": (34, 42, 76), "pan_a": (64, 76, 122),
      "oyuk": (28, 38, 38), "agiz": (22, 26, 26), "dis": (150, 184, 190),
      "damar": (60, 232, 248), "halka": (30, 84, 94)}
ISIRIK = (2.4, 22.6, -2.05)       # boynun sol dibi: V yakadaki acik ten
# asama -> (damar kolu, damar boyu, dal, ince buz siniri, kabuk siniri,
#           ayak kabugu, el kabugu, tenin soguk tonu)
ZOMBI_ASAMA = {1: (5, 9, 0.0, 3.5, 0.0, 0.0, 0.0, 0.0),
               2: (7, 15, 0.07, 9.0, 6.5, 2.4, 15.0, 0.22),
               3: (9, 21, 0.09, 15.0, 13.0, 5.0, 16.0, 0.42)}


def zombi_ressam(yuzey, asama):
    kol, boy, dal, E_ince, E_kabuk, ayak, el, soguk = ZOMBI_ASAMA[asama]
    beden = lambda P: not ust_katman(P)
    damar = yuzey.damar(ISIRIK, 31, kol, boy, dal, beden)
    virus = yuzey.yayilim(damar, 1.7, beden)          # buz damarlarin cevresine yayiliyor
    halka = {j for k in damar for j, d in yuzey.komsu[k]
             if d <= 1.01 and j not in damar and beden(yuzey.liste[j])}
    esi = yuzey.taban_esi(beden)
    kollar = ("leftArm",) if asama == 2 else ("leftArm", "rightArm")

    def malzeme(P):
        k, (x, y, z) = P.kemik, P.p
        if k == "head":
            return "ten"
        if k == "body":
            if P.yuz == "north" and y > 20 and abs(x) < (y - 20) * 0.9 + 0.5:
                return "ten"                                           # V yaka
            if fbm(P.p, 2.0, 41) > 0.72 or (y < 12.9 and h(P.px, P.py, 7) < 0.45):
                return "ten"                                           # yirtik, etek
            return "gomlek"
        if k in ("rightArm", "leftArm"):
            return "gomlek" if (y > 19.6 + (h(P.px, 11) - 0.5) * 1.6 or P.yuz == "up") else "ten"
        return "pantolon" if (y > 3.0 + h(P.px, 14) * 1.4 and P.yuz != "down") else "ten"

    def taban(P, mz, k):
        x, y, z = P.p
        n = fbm(P.p, 2.4, 3)
        if mz == "ten":
            c = kar(ZT["ten"], ZT["ten_k"], (n - 0.45) * 2.0)
            if P.kemik == "head" and (P.yuz == "up" or (P.yuz != "down" and y > 30.4 + h(P.px, P.py, 4))):
                c = kar(ZT["ten_k"], ZT["sac"], h(P.px, P.py, 5) * 1.2)        # sac dibi
            c = kar(c, ZT["soguk"], soguk + 0.45 * max(0.0, 1 - virus.get(k, 99.0) / 12.0))
            if P.kemik in ("rightArm", "leftArm"):
                c = kar(c, ZT["morarti"], (14.4 - y) / 2.4)                   # morarmis parmaklar
            if P.kemik in ("rightLeg", "leftLeg"):
                c = kar(c, ZT["morarti"], (3.0 - y) / 3.0)                    # morarmis ayaklar
            return carp(c, jit(P, 6, 0.06))
        if mz == "gomlek":
            c = kar(ZT["gom_k"], ZT["gom_a"], (n - 0.25) * 1.6)
            return carp(kar(c, (110, 160, 176), soguk * 0.6), jit(P, 9, 0.05))
        c = kar(ZT["pan_k"], ZT["pan_a"], (n - 0.3) * 1.6)
        return carp(kar(c, (96, 112, 150), soguk * 0.5), jit(P, 15, 0.05))

    def yuz_ozellik(P):
        """kafanin on yuzu (8x8), simetrik: kaslar, isiyan gozler, oyuklar,
        burun delikleri, buz disli acik agiz."""
        i, j = P.i, P.j
        if i in (1, 2, 5, 6):
            if j == 2:
                return carp(ZT["ten_k"], 0.8), SIYAH
            if j == 3:
                ic = i in (2, 5)
                return (ACIK_CAM if ic else TURKUAZ), carp(CAMGOBEGI, 1.0 if ic else 0.55)
            if j == 4:
                return ZT["oyuk"], SIYAH
        if j == 5 and i in (3, 4):
            return carp(ZT["ten_k"], 0.75), SIYAH
        if j == 6 and 2 <= i <= 5:
            return (ZT["dis"] if i in (3, 4) else ZT["agiz"]), SIYAH
        if j == 7 and 2 <= i <= 5:
            return ZT["agiz"], SIYAH
        return None

    def kiragi(P, k):
        n = fbm(P.p, 3.0, 21) - 0.5
        s = (E_ince - virus.get(k, 99.0)) / 5.0 + 0.6 * n
        if P.n[1] > 0.7:
            s = max(s, 0.06 * asama + 0.4 * n)                         # tepede biriken kiragi
        return s

    def kabuk_skor(Pb, kb):
        n = fbm(Pb.p, 3.0, 27) - 0.5
        y = Pb.p[1]
        s = (E_kabuk - virus.get(kb, 99.0)) / 4.0 + 0.6 * n if E_kabuk else -1.0
        if ayak and Pb.kemik in ("rightLeg", "leftLeg"):
            s = max(s, (ayak - y) / 2.0 + 0.5 * n)
        if el and Pb.kemik in kollar:
            s = max(s, (el - y) / 2.0 + 0.5 * n)
        return s

    def ressam(P, k):
        if not beden(P):                                               # buz kabugu katmani
            b = esi.get(k)
            s = kabuk_skor(yuzey.liste[b], b) if b is not None else -1.0
            if P.kemik == "hat" and P.yuz == "north" and P.p[1] < 30.2:
                s = -1.0                                               # gozler ve agiz acik
            if s <= 0:
                return (0, 0, 0, 0), SIYAH
            c, a = kabuk_rengi(P, s, 40)
            return c + (a,), SIYAH
        oz = yuz_ozellik(P) if (P.kemik == "head" and P.yuz == "north") else None
        if oz and oz[1] != SIYAH:
            return oz[0] + (255,), oz[1]                               # gozler hep gorunur
        mz = malzeme(P)
        c = oz[0] if oz else taban(P, mz, k)
        s = kiragi(P, k)
        if s > 0:
            c = kar(c, KIRAGI, min(0.85, 0.3 + s * 1.2))
        if kabuk_skor(P, k) > 0:
            c = kar(c, (126, 166, 190), 0.5)                           # kabugun altinda donmus
        isik = SIYAH
        if mz == "ten" and not oz:                                     # damar yalniz tende gorunur
            if k in damar:
                c = ZT["damar"]
                isik = carp(CAMGOBEGI, max(0.25, 0.85 - 0.55 * damar[k] / boy))
            elif k in halka:
                c = kar(c, ZT["halka"], 0.75)                           # damarin koyu cercevesi
        if uzak(P.p, ISIRIK) < 0.9:
            c, isik = (24, 36, 44), SIYAH                               # isirik yarasi
        return c + (255,), isik
    return ressam


# ---------------------------------------------------------------- iskelet
IT = {"kemik": (224, 233, 239), "golge": (190, 204, 216), "koyu": (126, 142, 158),
      "oyuk": (18, 26, 42), "dis": (238, 245, 249), "catlak": (54, 74, 96)}
CATLAK = {(5, 0), (5, 1), (6, 2)}        # kafatasinin on yuzunde buz catlagi


def iskelet_ressam(yuzey, asama):
    beden = lambda P: not ust_katman(P)
    esi = yuzey.taban_esi(beden)
    R_buz = (0.0, 7.0)[asama - 1]
    BUZ_MERKEZ = (-6.0, 22.0, 0.0)                    # yay kolunun (sag) omzu

    def kemik(P, f=1.0):
        c = kar(IT["kemik"], IT["golge"], (fbm(P.p, 2.6, 61) - 0.45) * 1.2)
        if P.n[1] > 0.7:
            c = carp(c, 1.04)
        elif P.n[1] < -0.7:
            c = carp(c, 0.84)
        return carp(c, f * jit(P, 63, 0.025))

    def govde_deseni(P):
        i, j = P.i, P.j
        if P.yuz == "north":                                           # gogus kafesi
            if j == 10 and i in (2, 5):
                return "bosluk"
            if j == 0 or i in (3, 4) or (j in (1, 3, 5, 7) and 1 <= i <= 6) or j >= 9:
                return "kemik"
            return "bosluk"
        if P.yuz == "south":                                           # omurga, kurek kemikleri
            if i in (3, 4) or j == 0 or j >= 9 or (1 <= j <= 4 and i in (1, 2, 5, 6)):
                return "kemik"
            return "kemik" if j in (5, 7) and 1 <= i <= 6 else "bosluk"
        if P.yuz in ("east", "west"):
            return "kemik" if (j in (0, 1, 3, 5, 7) or j >= 9) else "bosluk"
        return "kemik"

    def yuz_ozellik(P):
        """kafatasi (ofkeli): buz catlagi, koyu kas, oyugun ic-ust kosesinde
        isiyan bebek, burun boslugu, elmacik, duz agiz ve aralikli alt disler
        (koseleri yukarida kalan agiz sirittiriyordu)."""
        i, j = P.i, P.j
        if (i, j) in CATLAK:
            if asama >= 2:
                return (70, 210, 230), carp(CAMGOBEGI, 0.6)
            return IT["catlak"], carp(CAMGOBEGI, 0.25)
        if j == 2 and i in (1, 2, 5, 6):
            return IT["koyu"], SIYAH                                   # kas: golgeli, ofkeli
        if j in (3, 4) and i in (1, 2, 5, 6):
            if j == 3 and i in (2, 5):
                return ACIK_CAM, CAMGOBEGI                             # isiyan bebek
            return IT["oyuk"], SIYAH
        if j == 5 and i in (3, 4):
            return (30, 40, 56), SIYAH
        if j == 5 and i in (1, 6):
            return IT["golge"], SIYAH
        if j == 6 and 1 <= i <= 6:
            return IT["oyuk"], SIYAH                                   # duz agiz cizgisi
        if j == 7 and 1 <= i <= 6:
            return (IT["dis"] if i in (1, 3, 4, 6) else IT["oyuk"]), SIYAH   # aralikli alt disler
        if j == 7 and i in (0, 7):
            return IT["golge"], SIYAH
        return None

    def skor(P):
        n = fbm(P.p, 3.2, 71) - 0.5
        s = (1.2 - P.p[1]) / 1.6 + 0.5 * n                              # ayaklar
        if P.n[1] > 0.7:
            s = max(s, 0.04 + 0.4 * n)
        if R_buz:
            s = max(s, (R_buz - uzak(P.p, BUZ_MERKEZ)) / 4.5 + 0.55 * n)
        return s

    def ressam(P, k):
        kem, (x, y, z) = P.kemik, P.p
        if not beden(P):
            # bilek ve incik kabugu: icinden kemik gorunur; ust kenari duzensiz, ustu acik
            n = fbm(P.p, 1.8, 77) - 0.5
            ust = (16.8 if "Arm" in kem else 6.2) + 1.6 * n
            s = (ust - y) / 2.0
            if P.yuz == "up" or s <= 0:
                return (0, 0, 0, 0), SIYAH
            c, a = kabuk_rengi(P, s, 78, saydam=0.72)
            return c + (a,), SIYAH
        if kem == "head" and P.yuz == "north":
            oz = yuz_ozellik(P)
            if oz:
                return oz[0] + (255,), oz[1]
        if kem == "body" and govde_deseni(P) == "bosluk":
            # kaburga aralari BOS: icteki buz kalbi gorunsun. 2. asamada kalbin
            # cevresindeki araliklar yari saydam, isiyan buzla dolu.
            if asama >= 2 and abs(x) < 3.2 and 15.0 < y < 22.5:
                return (52, 182, 206, 150), carp(CAMGOBEGI, 0.3)
            if P.yuz in ("east", "west"):
                return (34, 48, 70, 255), SIYAH                         # yanda: golgeli aralik
            return (0, 0, 0, 0), SIYAH
        f = 1.0
        if kem in ("rightArm", "leftArm") and (abs(y - 17.5) < 0.6 or y < 13.6):
            f = 0.86                                                    # dirsek, el
        if kem in ("rightLeg", "leftLeg") and (abs(y - 6.5) < 0.6 or y < 1.4):
            f = 0.86                                                    # diz, ayak
        c = kemik(P, f)
        s = skor(P)
        if s > 0:
            c = kar(c, KIRAGI, min(0.8, 0.35 + s))
        return c + (255,), SIYAH
    return ressam


# ---------------------------------------------------------------- creeper
KT = [(160, 182, 202), (198, 214, 228), (228, 238, 245), (246, 250, 252)]
KYUZ = ["........", "........", ".GG..GG.", ".GG..GG.", "...DD...", "..DDDD..", "..DDDD..", "..D..D.."]
AGIZ = (0.0, 20.2, -4.0)


def creeper_ressam(yuzey, asama, tislama=False):
    boy = 7 + 3 * asama
    # agizdan yayilan catlaklar (yuzun kendi pikselleri ustte cizildigi icin gorunmez)
    catlak = yuzey.damar(AGIZ, 85, 7 + 2 * asama, boy, 0.16, lambda P: True)

    def ressam(P, k):
        kem, (x, y, z) = P.kemik, P.p
        if kem == "head" and P.yuz == "north":
            m = KYUZ[P.j][P.i]
            if m == "G":
                c = (150, 246, 255) if P.j == 2 else TURKUAZ
                return c + (255,), carp(CAMGOBEGI, 1.0 if tislama else 0.7)
            if m == "D":
                # agiz gozlerden sonuk isiyor: tislarken de creeper yuzu okunsun
                return (18, 40, 48, 255), (carp(CAMGOBEGI, 0.45) if tislama else SIYAH)
        n = 0.55 * fbm(P.p, 3.0, 81) + 0.45 * h(P.px, P.py, 82)
        if P.yuz == "up":
            n += 0.18                                                   # tepede biriken kar
        c = KT[0] if n < 0.30 else KT[1] if n < 0.50 else KT[2] if n < 0.72 else KT[3]
        r = h(P.px, P.py, 83)
        if r < 0.05 + 0.05 * (asama - 1):
            c = (166, 222, 236)                                         # buz zerresi
        elif r > 0.975 and P.yuz != "up":
            c = (120, 146, 160)
        if asama >= 2 and fbm(P.p, 3.6, 84) > 0.66:
            c = kar(c, (176, 230, 242), 0.7)
        if P.yuz == "down" and kem != "head":
            c = (150, 198, 216)                                         # ayak tabani: sikismis buz
        isik = SIYAH
        if k in catlak:
            a = catlak[k] / boy
            if tislama:
                c, isik = (70, 232, 246), carp(CAMGOBEGI, max(0.25, 0.8 - 0.6 * a))
            else:
                c = kar(c, (128, 176, 200), 0.5 - 0.3 * a)               # kar kabugunda ince catlak
        return carp(c, jit(P, 86, 0.03)) + (255,), isik
    return ressam


# ---------------------------------------------------------------- orumcek
OT = {"n0": (22, 30, 58), "n1": (15, 21, 43), "n2": (33, 45, 83), "tuy": (54, 72, 112),
      "eklem": (46, 66, 104), "teal": (29, 134, 142), "teal_k": (20, 98, 108), "dis": (196, 232, 242)}
# sekiz goz: iki buyuk (2x2) ve hicbirine degmeyen alti kucuk
OGOZ = {(1, 3): 2, (2, 3): 2, (5, 3): 2, (6, 3): 2, (1, 4): 1, (2, 4): 1, (5, 4): 1, (6, 4): 1,
        (1, 1): 0, (3, 1): 0, (4, 1): 0, (6, 1): 0, (0, 6): 0, (7, 6): 0}


def orumcek_ressam(yuzey, asama):
    tabanlar = [t for kem, t, *_ in kristaller("orumcek", asama) if kem == "body1"]

    def taban(P):
        n = fbm(P.p, 2.2, 91)
        c = OT["n1"] if n < 0.38 else OT["n0"] if n < 0.62 else OT["n2"]
        if h(P.px, P.py, 92) < 0.06:
            c = OT["tuy"]
        return c

    def ressam(P, k):
        kem, (x, y, z) = P.kemik, P.p
        if kem == "head" and P.yuz == "north":
            g = OGOZ.get((P.i, P.j))
            if g is not None:
                if g == 2:
                    return ACIK_CAM + (255,), CAMGOBEGI
                if g == 1:
                    return TURKUAZ + (255,), carp(CAMGOBEGI, 0.85)
                return (60, 226, 242, 255), carp(CAMGOBEGI, 0.6)
            if P.i in (2, 5) and P.j >= 6:
                return OT["dis"] + (255,), SIYAH                         # buz disler
        if "Leg" in kem:
            # bacak boyunca uzaklik (temsilci bacagin pivotundan); iki uca simetrik
            r = math.sqrt(sum((P.p[i] - P.pivot[i]) ** 2 for i in range(3)))
            u = min(r, 16 - r)
            c = OT["n0"] if h(P.px, P.py, 93) > 0.18 else OT["n1"]
            if abs(r - 5.5) < 0.6 or abs(r - 10.5) < 0.6:
                c = OT["eklem"]
            if u < (1.6 if asama == 1 else 3.2):
                c = kar(c, BUZ1 if u < 0.9 else KIRAGI, 0.85)
            return carp(c, jit(P, 94, 0.05)) + (255,), SIYAH
        c = taban(P)
        if kem == "body1" and P.yuz == "up":
            # sirtta virus isareti: one bakan teal oklar; kristallerin dibinde kiragi
            ax = abs(x)
            if ax < 3.2 and abs(ax - ((z - 3.0) % 4.0)) < 0.55:
                c = OT["teal"] if ax < 2.2 else OT["teal_k"]
            if any(uzak(P.p, t) < 1.1 + 0.6 * h(P.px, P.py, 95) for t in tabanlar):
                c = kar(c, KIRAGI, 0.6)
        if kem == "head" and P.yuz == "up" and asama >= 2 and h(P.px, P.py, 96) < 0.25:
            c = kar(c, KIRAGI, 0.6)
        return carp(c, jit(P, 97, 0.05)) + (255,), SIYAH
    return ressam


RESSAM = {"zombi": zombi_ressam, "iskelet": iskelet_ressam, "creeper": creeper_ressam,
          "orumcek": orumcek_ressam}


# ---------------------------------------------------------------- doku
def boya(yuzey, palet, ressam):
    """(renk, isik) satirlari (RGBA); bos yerler saydam / siyah."""
    renk = [[(0, 0, 0, 0)] * DOKU for _ in range(DOKU)]
    isik = [[(0, 0, 0, 255)] * DOKU for _ in range(DOKU)]
    for k, P in enumerate(yuzey.liste):
        c, e = ressam(P, k)
        renk[P.py][P.px] = tuple(c)
        isik[P.py][P.px] = tuple(e) + (255,)
    for ad, (x, y) in palet.hucre.items():
        rgb, e = palet.renk[ad]
        renk[y][x] = rgb + (255,)
        isik[y][x] = e + (255,)
    return renk, isik


def _bos_katmanlari_buda(geo, yuzey, renk):
    """Ustune hic buz dusmeyen kabuk ve sapka kuplerini atar (saydam kup cizilmesin)."""
    dolu = {}
    for P in yuzey.liste:
        if ust_katman(P):
            dolu[P.kemik] = dolu.get(P.kemik, False) or renk[P.py][P.px][3] > 0
    for b in geo["minecraft:geometry"][0]["bones"]:
        if b["name"] in dolu and not dolu[b["name"]]:
            b.pop("cubes", None)


def yaratik(ad, asama):
    """-> {"geo", "renk", "isik"} (+ creeper'da "tislama")"""
    palet = Palet(*PALET_YERI[ad])
    geo = geometri(ad, asama, palet)
    yuzey = Yuzey(geo)
    renk, isik = boya(yuzey, palet, RESSAM[ad](yuzey, asama))
    _bos_katmanlari_buda(geo, yuzey, renk)
    cikti = {"geo": geo, "renk": renk, "isik": isik}
    if ad == "creeper":
        _, cikti["tislama"] = boya(yuzey, palet, creeper_ressam(yuzey, asama, tislama=True))
    return cikti


# ---------------------------------------------------------------- buz yayi
# Iskeletin rightItem'inde; dinlenme pozunda (kol asagida) kollar z boyunca,
# kiris +y'de (omuza dogru): kol -90 derece kalkinca yay dikilir, kiris
# okcuya bakar (HumanoidModel BOW_AND_ARROW: sag kol xRot -pi/2, yRot -0.1).
YAY_PIV = list(ESYA["iskelet"][0])
YAY_RENK = [
    ("sap", KOYU_TEAL, SIYAH), ("sap2", TEAL, SIYAH), ("sarg", (220, 244, 250), SIYAH),
    ("buz_k", (70, 170, 196), SIYAH), ("buz1", (150, 226, 240), SIYAH), ("buz2", (196, 240, 250), SIYAH),
    ("buz3", (232, 252, 255), SIYAH), ("karin", (60, 236, 250), CAMGOBEGI),
    ("kiris", (170, 250, 255), carp(CAMGOBEGI, 0.6)), ("uc", (214, 252, 255), carp(ACIK_CAM, 0.4)),
]
YAY_HUCRE = {ad: (i % 16, i // 16) for i, (ad, _, _) in enumerate(YAY_RENK)}


def _yk(o, s, adlar):
    if isinstance(adlar, str):
        adlar = {f: adlar for f in B.YUZLER}
    return {"origin": [round(v, 3) for v in o], "size": [round(v, 3) for v in s],
            "uv": {f: {"uv": list(YAY_HUCRE[adlar[f]]), "uv_size": [1, 1]} for f in B.YUZLER}}


def yay_kupleri():
    gx, gy, gz = YAY_PIV
    k = [_yk([gx - 0.85, gy - 0.85, gz - 1.6], [1.7, 1.7, 3.2], "sap"),
         _yk([gx - 0.95, gy - 0.3, gz - 0.9], [1.9, 0.6, 0.5], "sarg"),
         _yk([gx - 0.95, gy - 0.3, gz + 0.4], [1.9, 0.6, 0.5], "sarg")]
    UZ, EG = 9.0, 3.2                                    # yarim boy, uclarin kirise egimi
    for yon in (-1, 1):
        for adim in range(8):
            z0 = 1.6 + adim * (UZ - 1.6) / 8
            z1 = 1.6 + (adim + 1) * (UZ - 1.6) / 8
            t = ((z0 + z1) / 2 - 1.6) / (UZ - 1.6)
            yc = gy + EG * t ** 1.7
            kal = 1.5 - 0.65 * t
            za = gz + (z0 if yon > 0 else -z1)
            renk = {"up": "buz3", "down": "buz2", "north": "buz1", "south": "buz1",
                    "east": "buz2" if adim % 2 else "buz1", "west": "buz_k"}
            k.append(_yk([gx - kal / 2, yc - kal / 2, za], [kal, kal, z1 - z0], renk))
            # karin: kirise bakan yuzde isiyan buz cizgisi
            k.append(_yk([gx - 0.22, yc + kal / 2 - 0.08, za], [0.44, 0.26, z1 - z0], "karin"))
        # uc: disa ve kirise egik sivri kristal
        zu = gz + yon * UZ
        k.append(_yk([gx - 0.45, gy + EG - 0.45, zu - (0.0 if yon > 0 else 1.6)], [0.9, 0.9, 1.6], "uc"))
        k.append(_yk([gx - 0.25, gy + EG + 0.1, zu + (1.6 if yon > 0 else -2.4)], [0.5, 0.5, 0.8], "uc"))
    k.append(_yk([gx - 0.12, gy + EG - 0.12, gz - UZ], [0.24, 0.24, 2 * UZ], "kiris"))
    return k


def yay_geometri():
    return {"format_version": "1.12.0", "minecraft:geometry": [{
        "description": {"identifier": "geometry.buz_yay", "texture_width": 16, "texture_height": 16,
                        "visible_bounds_width": 3, "visible_bounds_height": 3,
                        "visible_bounds_offset": [0, 1, 0]},
        "bones": [{"name": "rightItem", "pivot": list(YAY_PIV)},
                  {"name": "yay", "parent": "rightItem", "pivot": list(YAY_PIV), "cubes": yay_kupleri()}]}]}


def yay_paleti(isik_mi):
    s = [[(0, 0, 0, 0 if not isik_mi else 255)] * 16 for _ in range(16)]
    for ad, rgb, e in YAY_RENK:
        x, y = YAY_HUCRE[ad]
        s[y][x] = (e if isik_mi else rgb) + (255,)
    return s


# ---------------------------------------------------------------- yazma
def png_yaz(yol, satirlar):
    """Saf Python PNG (Blender'in Python'unda PIL yok)."""
    h_, w = len(satirlar), len(satirlar[0])
    ham = b"".join(b"\x00" + bytes(v for p in sat for v in p) for sat in satirlar)

    def parca(tur, veri):
        return struct.pack(">I", len(veri)) + tur + veri + struct.pack(">I", zlib.crc32(tur + veri) & 0xffffffff)
    with open(yol, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + parca(b"IHDR", struct.pack(">IIBBBBB", w, h_, 8, 6, 0, 0, 0))
                + parca(b"IDAT", zlib.compress(ham, 9)) + parca(b"IEND", b""))


def uret(klasor):
    os.makedirs(klasor, exist_ok=True)
    yollar = []

    def yaz(ad, veri):
        yol = os.path.join(klasor, ad)
        if ad.endswith(".json"):
            with open(yol, "w", encoding="utf-8") as f:
                json.dump(veri, f, indent=1)
        else:
            png_yaz(yol, veri)
        yollar.append(yol)
    for ad, n in ASAMALAR.items():
        for asama in range(1, n + 1):
            y = yaratik(ad, asama)
            kok = "buz_%s_%d" % (ad, asama)
            yaz(kok + ".geo.json", y["geo"])
            yaz(kok + ".png", y["renk"])
            yaz(kok + "_isik.png", y["isik"])
            if "tislama" in y:
                yaz(kok + "_tislama.png", y["tislama"])
    yaz("buz_yay.geo.json", yay_geometri())
    yaz("buz_yay.png", yay_paleti(False))
    yaz("buz_yay_isik.png", yay_paleti(True))
    return yollar


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    for y in uret(sys.argv[1]):
        print(y)
