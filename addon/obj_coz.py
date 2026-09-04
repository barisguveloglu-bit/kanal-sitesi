#!/usr/bin/env python3
"""Blockbench OBJ -> Bedrock geometrisi.                    (v5.1)

Mekanism'in MekaSuit'i Java tarafinda bir OBJ dosyasi:
    assets/mekanism/models/entity/mekasuit.obj
"Made in Blockbench 4.3.1" yaziyor, yani KUTULARDAN olusuyor --
serbest ucgen agi degil. Kutu oldugu icin Bedrock'a birebir
cevrilebiliyor; cevrilemeyecek olsaydi (Draconic'in Blender
mesh'i gibi) hic denenmezdi.

Kullanici kurali: "hafizandan yaparsan belki yanlis cikabilir".
Bu yuzden hicbir sayi elle yazilmadi -- kose noktalari, UV'ler
ve donuslar dosyadan OKUNUYOR.

---- OBJ'DE NE VAR ----
  o <ad>        nesne (bir kutu, 8 kose)
  v  x y z      kose        (blok birimi; 1 blok = 16 piksel)
  vt u v        doku noktasi (0..1, SOL ALT baslangicli)
  usemtl <n>    hangi doku
  f v/vt v/vt.. yuz (dortgen ya da ucgen)

---- OBJ -> BEDROCK ----
  konum : p_bedrock = 16 * p_obj     (x, y, z ayni yonde)
          OBJ zaten oyuncu uzayinda: ayak y=0, kafa ustu y=32/16.
  uv    : v ekseni TERS. u_px = u*W, v_px = (1-v)*H
  donme : kutunun uc kenar vektoru dik bir cerceve veriyor;
          o cerceveden euler XYZ cikariliyor. Bedrock dosyaya
          MATEMATIKSEL DONUSUN TERSI yaziliyor (v4.88'de olculdu,
          NOTLAR.md'de yazili) -- BEDROCK_TERS bunu uyguluyor.

---- NEDEN YUZ BAZLI UV ----
Blockbench'in "box uv" duzeni OBJ'ye tasinmiyor; her yuzun kendi
uv dortgeni var. Bedrock 1.12.0 zaten yuz bazli uv kabul ediyor:
    "uv": {"north": {"uv": [..], "uv_size": [..]}, ...}
Kutu uv'sine ZORLAMAK doku kaymasi demek olurdu.
"""
import json
import math
import os
import re
import sys

BEDROCK_TERS = True     # bkz. NOTLAR.md v4.88
OLCEK = 16.0            # blok -> piksel


def obj_oku(yol, x_ters=False):
    """OBJ'yi nesnelere ayirir.

    Donen: [{ad, yuzler: [{malzeme, kose: [(vi, ti)..]}, ..]}]

    MALZEME YUZ BAZINDA tutuluyor, nesne bazinda DEGIL: dosyada
    `usemtl none` satiri bir nesnenin SONUNDA gecip bir sonraki
    nesneye sarkiyor (chest_body_brace1/2'de olculdu). Nesneye
    yazsaydik o iki kutu tamamen dusecekti.
    Kose ve doku indisleri 1'den basliyor (OBJ boyle), burada
    0 tabanina cekiliyor.

    ---- x_ters ----
    Blockbench'in OBJ cikisi X eksenini TERS veriyor. OLCULDU,
    tahmin degil: cevrilen modelde `chest_left_arm` x=-9..-3.5
    araligina, `chest_right_arm` x=+3.5..+9 araligina dustu --
    yani vanilla oyuncunun sol/sag kollarinin tam AYNASI (sol
    kol +4..+8, sag kol -8..-4 olmaliydi). Z ve Y tutuyordu.

    Ayna, yuzlerin sarim yonunu da ters cevirir; normal disari
    degil ICERI bakar. Bu yuzden X ile birlikte her yuzun kose
    SIRASI da ters cevriliyor.                                  """
    kose, doku, nesneler = [], [], []
    simdiki = None
    malzeme = None
    for satir in open(yol, encoding="utf-8", errors="replace"):
        p = satir.split()
        if not p:
            continue
        if p[0] == "v":
            nokta = tuple(float(x) for x in p[1:4])
            if x_ters:
                nokta = (-nokta[0], nokta[1], nokta[2])
            kose.append(nokta)
        elif p[0] == "vt":
            doku.append((float(p[1]), float(p[2])))
        elif p[0] in ("o", "g"):
            simdiki = {"ad": " ".join(p[1:]), "yuzler": []}
            nesneler.append(simdiki)
        elif p[0] == "usemtl":
            malzeme = p[1] if len(p) > 1 else None
        elif p[0] == "f" and simdiki is not None:
            yuz = []
            for bilesen in p[1:]:
                parcalar = bilesen.split("/")
                vi = int(parcalar[0]) - 1
                ti = int(parcalar[1]) - 1 if len(parcalar) > 1 and parcalar[1] else None
                yuz.append((vi, ti))
            if x_ters:
                yuz.reverse()
            simdiki["yuzler"].append({"malzeme": malzeme, "kose": yuz})
    return kose, doku, nesneler


# ---------------- kutu cozumu ----------------

def _cikar(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _uzunluk(v):
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])


def _bol(v, s):
    return (v[0] / s, v[1] / s, v[2] / s)


def _nokta(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def kutu_coz(noktalar):
    """8 koseden yonlu kutu cikarir.

    Donen: (merkez, boyut, R)  --  R sutunlari kutunun yerel
    eksenleri (dunya uzayinda). Kutu degilse None.

    Yontem: p0'dan cikan UC KENARI bul. "En yakin uc komsu"
    ISE YARAMIYOR -- uzun ince bir kutuda kosegen, uzun kenardan
    kisa olabiliyor (olculdu: 124 kutunun 98'i boyle elendi).
    Onun yerine kesin olan sinaniyor: uc vektor birbirine dik VE
    toplamlari en uzak koseye (kutunun kosegeni) esit olmali.   """
    if len(noktalar) != 8:
        return None
    p0 = noktalar[0]
    vektorler = [_cikar(p, p0) for p in noktalar[1:]]
    kosegen = max(vektorler, key=_uzunluk)
    if _uzunluk(kosegen) < 1e-9:
        return None
    kenarlar = None
    for i in range(len(vektorler)):
        for j in range(i + 1, len(vektorler)):
            for k in range(j + 1, len(vektorler)):
                uclu = [vektorler[i], vektorler[j], vektorler[k]]
                toplam = [sum(v[e] for v in uclu) for e in range(3)]
                if _uzunluk(_cikar(tuple(toplam), kosegen)) > 1e-6:
                    continue
                dik = True
                for a in range(3):
                    for b in range(a + 1, 3):
                        if abs(_nokta(uclu[a], uclu[b])) > 1e-6:
                            dik = False
                    if not dik:
                        break
                if dik:
                    kenarlar = uclu
                    break
            if kenarlar:
                break
        if kenarlar:
            break
    if kenarlar is None:
        return None
    boylar = [_uzunluk(k) for k in kenarlar]
    if min(boylar) < 1e-9:
        return None
    eksenler = [_bol(k, b) for k, b in zip(kenarlar, boylar)]
    merkez = tuple(p0[k] + sum(kenarlar[e][k] for e in range(3)) / 2.0
                   for k in range(3))
    # Eksenleri x/y/z'ye en cok benzeyene gore sirala; kutu
    # "dondurulmus bir kutu" olarak okunsun, eksenleri karismasin.
    sira = []
    kalan = [0, 1, 2]
    for hedef in range(3):
        en_iyi = max(kalan, key=lambda e: abs(eksenler[e][hedef]))
        sira.append(en_iyi)
        kalan.remove(en_iyi)
    eksenler = [eksenler[i] for i in sira]
    boylar = [boylar[i] for i in sira]
    # Sag el sistemi olsun: her eksen kendi hedefiyle ayni yone baksin.
    for i in range(3):
        if eksenler[i][i] < 0:
            eksenler[i] = tuple(-c for c in eksenler[i])
    R = [[eksenler[j][i] for j in range(3)] for i in range(3)]  # sutun = eksen
    if _determinant(R) < 0:
        eksenler[2] = tuple(-c for c in eksenler[2])
        R = [[eksenler[j][i] for j in range(3)] for i in range(3)]
    return merkez, tuple(boylar), R


def _determinant(m):
    return (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
            - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))


def euler_xyz(R):
    """Donme matrisinden XYZ euler (derece).

    ef_cevir.py'dekiyle AYNI bicim -- iki cevirici ayni kurali
    kullansin diye kopyalanmadi, ayni sirayla yazildi:
        R = Rx(a) . Ry(b) . Rz(c)                                """
    sy = -R[2][0]
    sy = max(-1.0, min(1.0, sy))
    b = math.asin(sy)
    if abs(sy) > 0.999999:          # gimbal
        a = math.atan2(-R[1][2], R[1][1])
        c = 0.0
    else:
        a = math.atan2(R[2][1], R[2][2])
        c = math.atan2(R[1][0], R[0][0])
    return [math.degrees(x) for x in (a, b, c)]


# ---------------- yuz -> Bedrock yonu ----------------

YONLER = {
    "north": (0, 0, -1), "south": (0, 0, 1),
    "east": (1, 0, 0), "west": (-1, 0, 0),
    "up": (0, 1, 0), "down": (0, -1, 0),
}


def yuz_yonu(normal, R):
    """Bir yuzun KUTU YEREL uzayindaki yonu.

    Dunya normali kutunun eksenlerine yansitiliyor; en buyuk
    bileseni hangi yuz oldugunu soyluyor.                        """
    yerel = tuple(sum(R[i][k] * normal[i] for i in range(3)) for k in range(3))
    en_iyi, en_buyuk = None, 0.0
    for ad, v in YONLER.items():
        s = sum(yerel[i] * v[i] for i in range(3))
        if s > en_buyuk:
            en_iyi, en_buyuk = ad, s
    return en_iyi


def normal_hesapla(noktalar):
    a, b, c = noktalar[0], noktalar[1], noktalar[2]
    u, v = _cikar(b, a), _cikar(c, a)
    n = (u[1] * v[2] - u[2] * v[1],
         u[2] * v[0] - u[0] * v[2],
         u[0] * v[1] - u[1] * v[0])
    b = _uzunluk(n)
    return _bol(n, b) if b > 1e-12 else (0.0, 1.0, 0.0)


# ================================================================
#  MEKASUIT'E OZEL: nesne adindan kemik ve parca
# ================================================================
# Nesne adlari parcayi ve kemigi ZATEN soyluyor -- eslesme
# uydurulmadi, adlar okundu:
#   helmet_head_*                 -> baslik  / head
#   chest_body*                   -> govde   / body
#   chest_left_arm* / right_arm*  -> govde   / leftArm, rightArm
#   leggings_*_leg*               -> bacak   / leftLeg, rightLeg
#   boots_*_leg*, excl_boots_*    -> ayak    / *Leg
#   shared_chest_leggings_body_*  -> govde   (asagiya bak)
#   shared_boots_leggings_*_leg_* -> bacak   (asagiya bak)
#
# PAYLASILAN PARCALAR TEK YERE YAZILIYOR: Java tarafinda
# MekaSuit dort parcayi TEK modelde ciziyor ve paylasilanlari
# bir kez ciziyor. Bizde her parca ayri bir attachable, yani
# ayni kutuyu iki parcaya da koyarsak ikisi de takiliyken
# z-cakismasi (titreyen yuzey) olur. Bu yuzden:
#   shared_chest_leggings -> GOVDE
#   shared_boots_leggings -> BACAK
# Sonucu: yalniz botu takarsan diz cercevesi gorunmez. Kaynak
# oyle degil; Bedrock'ta parcalar ayri attachable oldugu icin
# baska secenek yok. NOTLAR.md'de yazili.
PARCA_KURALLARI = [
    ("helmet_",                "bas"),
    ("excl_boots_",            "ayak"),
    ("shared_boots_leggings_", "bacak"),
    ("shared_chest_leggings_", "govde"),
    ("boots_",                 "ayak"),
    ("leggings_",              "bacak"),
    ("chest_",                 "govde"),
]

KEMIK_KURALLARI = [
    ("_head",      "head"),
    ("_left_arm",  "leftArm"),
    ("_right_arm", "rightArm"),
    ("_left_leg",  "leftLeg"),
    ("_right_leg", "rightLeg"),
    ("_body",      "body"),
]

# Vanilla oyuncu kemiklerinin donme merkezleri. Kemik adlari
# VANILLA ILE AYNI olmak zorunda (zirh_geometrisi'ndeki not).
KEMIK_PIVOT = {
    "head":     [0, 24, 0],
    "body":     [0, 24, 0],
    "leftArm":  [5, 22, 0],
    "rightArm": [-5, 22, 0],
    "leftLeg":  [1.9, 12, 0],
    "rightLeg": [-1.9, 12, 0],
}


def parca_ve_kemik(ad):
    parca = None
    for onek, p in PARCA_KURALLARI:
        if ad.startswith(onek):
            parca = p
            break
    kemik = None
    for parcacik, k in KEMIK_KURALLARI:
        if parcacik in ad:
            kemik = k
            break
    return parca, kemik


def geometri_uret(yol, atlas, kimlik_onek, parca_secimi=None,
                  atlas_boyut=(64, 64), x_ters=True):
    """OBJ'den parca parca Bedrock geometrisi.

    atlas: {malzeme_adi: (ofset_x, ofset_y, kaynak_en, kaynak_boy)}
    Donen: {parca_adi: geometri_sozlugu}                          """
    kose, doku, nesneler = obj_oku(yol, x_ters=x_ters)
    atlas_en, atlas_boy = atlas_boyut
    parcalar = {}
    atlanan = []

    for nesne in nesneler:
        parca, kemik = parca_ve_kemik(nesne["ad"])
        if parca is None or kemik is None:
            atlanan.append((nesne["ad"], "ad cozulemedi"))
            continue
        if parca_secimi and parca not in parca_secimi:
            continue

        indisler = sorted({vi for yuz in nesne["yuzler"]
                           for vi, _ in yuz["kose"]})
        noktalar = [kose[i] for i in indisler]
        cozum = kutu_coz(noktalar)
        if cozum is None:
            atlanan.append((nesne["ad"], "kutu degil"))
            continue
        merkez, boyut, R = cozum

        merkez_px = [c * OLCEK for c in merkez]
        boyut_px = [b * OLCEK for b in boyut]
        donme = euler_xyz(R)
        donuk = any(abs(a) > 1e-4 for a in donme)

        # Kutu, donmemis halinde nerede duruyor? origin = merkez - boyut/2
        kaynak = [merkez_px[i] - boyut_px[i] / 2.0 for i in range(3)]

        yuz_uv = {}
        for yuz in nesne["yuzler"]:
            noktalar_yuz = [kose[vi] for vi, _ in yuz["kose"]]
            yon = yuz_yonu(normal_hesapla(noktalar_yuz), R)
            if yon is None or yon in yuz_uv:
                continue
            uvler = [doku[ti] for _, ti in yuz["kose"] if ti is not None]
            if len(uvler) < 3:
                continue
            mal = yuz["malzeme"]
            if mal not in atlas:
                # `none` = kaynagin CIZMEDIGI yuz (kutunun ic yuzu).
                # Bizde de cizilmiyor; atlama sebebi olarak yazilmiyor.
                if mal not in (None, "none"):
                    atlanan.append((nesne["ad"], "malzeme yok: %s" % mal))
                continue
            ofx, ofy, ken, kboy = atlas[mal]
            us = [u for u, _ in uvler]
            vs = [v for _, v in uvler]
            # OBJ'nin v ekseni SOL ALT baslangicli, Bedrock'inki
            # SOL UST. Bu yuzden ters cevriliyor.
            x0 = ofx + min(us) * ken
            x1 = ofx + max(us) * ken
            y0 = ofy + (1.0 - max(vs)) * kboy
            y1 = ofy + (1.0 - min(vs)) * kboy
            yuz_uv[yon] = {"uv": [round(x0, 4), round(y0, 4)],
                           "uv_size": [round(x1 - x0, 4), round(y1 - y0, 4)]}

        kutu = {
            "origin": [round(v, 4) for v in kaynak],
            "size": [round(v, 4) for v in boyut_px],
            "uv": yuz_uv,
        }
        if donuk:
            kutu["pivot"] = [round(v, 4) for v in merkez_px]
            kutu["rotation"] = [round(-a if BEDROCK_TERS else a, 4)
                                for a in donme]

        p = parcalar.setdefault(parca, {})
        p.setdefault(kemik, []).append(kutu)

    cikti = {}
    for parca, kemikler in parcalar.items():
        cikti[parca] = {
            "format_version": "1.12.0",
            "minecraft:geometry": [{
                "description": {
                    "identifier": "geometry." + kimlik_onek + parca,
                    "texture_width": atlas_en,
                    "texture_height": atlas_boy,
                    "visible_bounds_width": 2,
                    "visible_bounds_height": 3,
                    "visible_bounds_offset": [0, 1.5, 0],
                },
                "bones": [
                    {"name": k, "pivot": KEMIK_PIVOT[k], "cubes": kutular}
                    for k, kutular in sorted(kemikler.items())
                ],
            }],
        }
    return cikti, atlanan


if __name__ == "__main__":
    yol = sys.argv[1]
    atlas = {"2": (0, 0, 32, 32), "3": (32, 0, 32, 32),
             "4": (0, 32, 32, 32), "5": (32, 32, 32, 32)}
    g, atlanan = geometri_uret(yol, atlas, "meka_")
    for parca, veri in sorted(g.items()):
        kemikler = veri["minecraft:geometry"][0]["bones"]
        print(parca, "->", sum(len(k["cubes"]) for k in kemikler), "kutu",
              [k["name"] for k in kemikler])
    for ad, sebep in atlanan:
        print("  ATLANDI", ad, "--", sebep)
