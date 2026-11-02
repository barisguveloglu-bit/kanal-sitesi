# -*- coding: utf-8 -*-
"""BARIS'IN HANEDANI -- 2. bolumun yerlesimi (blok listesi uretici).   v7.99.16

Kayittaki tasarim (SERI_SEZON1.md, kullanici 2026-10-10 / 10-17):
  * YUVARLAK bir yerlesim; dis ceperi SURLAR, surlar koy evlerinin hemen
    dibinde.
  * Icinde birden fazla siradan koylu evi (Minecraft koy evleri);
    golemler, KOYLULER; bazi evlerde insanlar.
  * ORTADA dag gibi yuksek bir yerin ustunde hanedanin ANA YAPISI; oraya
    MERDIVENLE cikiliyor. Tepenin icindeki jeot lav cukuru 4. partin isi.
  * 2. bolumun dovus mekanlari: sur gedigi (DOGU, firtina dogudan),
    sokaklar, meydan, ana yapiya cikan merdivenler.
Kullanici (2026-11-01, ilk onizlemeden sonra): "Daha fazla genislet daha
fazla ev ekle azicik cicek agac ekle. Ayrica koyluler de olacak fakat biraz
az olsun."
Olculer, ana yapinin bicimi, kapi yeri, ev halkalari, tarlalar ve renkler
CLAUDE'UN ONERISIYDI; kullanici 2026-11-02'de ONAYLADI ("onayli, onay
veriyorum"; kayit SERI_SEZON1.md). Degerler en ustte, tek yerde.

Evler: koy evlerini oyundan olcmek icin arac/yapi_olc.py var; olcum
bitmedigi icin evler simdilik ova koyu uslubunda elle kurulu (ev_tipi);
arac/yapilar/koy_evleri.json olusursa onlar kullanilir. Zisa'nin evi elle
tasarim (zisa_evi()). Koyluler blok degil: bilgi["koyluler"] konum, yon ve
doku katmanini verir (cizimi arac/koylu.py).

Cikti: blok_kur'un bicimi -- [{"p": [x, y, z], "t": ad, "s": {...}}].
Eksenler Minecraft'inki: x dogu, y yukari, z guney; merkez (0, 0, 0),
zemin y = 0.
"""
import json
import math
import os
import random

import blok_kur
import koylu

BURASI = os.path.dirname(os.path.abspath(__file__))

# ---- DEGERLER (Claude'un onerisi, kullanici onayladi 2026-11-02) ----
ZEMIN_YARICAP = 112       # cimen alan (surun disinda da cimen ve agac)
SUR_YARICAP = 84          # surun orta cizgisi (ikinci genisleme: 66 -> 84, ucuncu ev halkasi)
SUR_KALINLIK = 3
SUR_YUKSEKLIK = 9         # yuruyus yolu y = 9, mazgallar y = 10
KULE_SAYISI = 16          # halkadaki kule; kapi iki kulenin tam ortasinda (+2 kapi kulesi)
KULE_YARICAP = 3
KULE_YUKSEKLIK = 14
KAPI_ACISI = 90           # derece; 90 = guney (ana kapi, merdivenin karsisi)
KAPI_GENISLIK = 5         # ana kapinin agzi (blok); iki yaninda kapi kuleleri
KAPI_YUKSEKLIK = 7
TEPE_YARICAP = 18
TEPE_YUKSEKLIK = 20
DUZLUK_YARICAP = 9        # tepenin ustu, ana yapi icin
MEYDAN_YARICAP = 29       # tasli meydan halkasi MEYDAN-7..MEYDAN; merdivenin dibi burada
IC_YOL = (30, 33)         # meydanin cevresindeki halka sokak
ORTA_YOL = (47, 50)       # ic ve orta ev halkasinin arasindaki halka sokak
DIS_YOL = (65, 68)        # orta ve dis ev halkasinin arasindaki halka sokak
IC_EV_HALKASI = 40        # ic halka evlerinin orta cizgisi
ORTA_EV_HALKASI = 57.5    # orta halka (Zisa'nin evi burada)
DIS_EV_HALKASI = 75.5     # dis halka: surun hemen dibi
EV_SUR_ARASI = 1.0        # evin en uzak blogu ile surun ic yuzu arasi (blok)
ANA_SOKAKLAR = (0, 90, 180, 270)    # ic yoldan sura; 180 Zisa'nin kapisinda biter
ARA_SOKAKLAR = (45, 135, 225, 315)  # ic yoldan sura
# yalniz dis halkada (dis yoldan sura); her sokak bir ev yeri yiyor, dort
# tane yetiyor (sekiz taneyken dis halkaya 24 ev sigiyordu)
DIS_ARA_SOKAKLAR = (22.5, 112.5, 202.5, 292.5)
TARLA_SIKLIGI = 6         # dis halkada her 6. yer tarla
AGAC_IC = 18              # surun icindeki agac ("azicik"; alan iki katina cikti)
AGAC_TEPE = 3
AGAC_DIS = 20
CICEK_ORANI = 0.012       # bos cimenin %1.2'si cicek ("azicik")
OT_ORANI = 0.05
KOYLU_SAYISI = 14         # "biraz az olsun": ~70 eve 14 koylu
# uc katli kule ev her bosluga sigiyordu (40 evin 8'i); buyukler de sinirli
EV_SINIRI = {"kule_ev": 7, "kutuphane": 3, "han": 3, "firin": 4}
TOHUM = 2026



def _b(p, t, s=None, **ek):
    e = {"p": [int(p[0]), int(p[1]), int(p[2])], "t": t}
    if s:
        e["s"] = s
    e.update(ek)
    return e


class Dunya:
    """Ust uste yazilabilen blok haritasi (son yazan kazanir)."""

    def __init__(self):
        self.h = {}

    def koy(self, p, t, s=None, **ek):
        self.h[(int(p[0]), int(p[1]), int(p[2]))] = _b(p, t, s, **ek)

    def sil(self, p):
        self.h.pop((int(p[0]), int(p[1]), int(p[2])), None)

    def var(self, p):
        return (int(p[0]), int(p[1]), int(p[2])) in self.h

    def bloklar(self):
        return list(self.h.values())


def tepe_yuksekligi(x, z):
    r = math.hypot(x, z)
    if r <= DUZLUK_YARICAP:
        return TEPE_YUKSEKLIK
    if r >= TEPE_YARICAP:
        return 0
    u = (r - DUZLUK_YARICAP) / float(TEPE_YARICAP - DUZLUK_YARICAP)
    return int(round(TEPE_YUKSEKLIK * (1 - u ** 1.6) ** 0.9))


def _sokak_mu(x, z, aci, r0, r1, yari=1.5):
    a = math.radians(aci)
    dx, dz = math.cos(a), math.sin(a)
    boy = x * dx + z * dz
    return r0 <= boy <= r1 and abs(-x * dz + z * dx) <= yari


def sokak_bitisi(aci):
    """Ana sokagin dis ucu: kapi sokagi surdan cikip uzaga gider, bati
    sokagi Zisa'nin evinin onundeki orta yolda biter, digerleri surun ic
    yuzunde (sur blogunun altindan gecmez)."""
    if aci == KAPI_ACISI:
        return ZEMIN_YARICAP
    if aci == 180:
        return ORTA_YOL[1]
    return SUR_YARICAP - SUR_KALINLIK / 2.0 - 0.5


def yol_mu(x, z):
    """Hucre bir yolun ustunde mi (meydan haric)."""
    r = math.hypot(x, z)
    if IC_YOL[0] <= r <= IC_YOL[1] or ORTA_YOL[0] <= r <= ORTA_YOL[1] or DIS_YOL[0] <= r <= DIS_YOL[1]:
        return True
    ic_yuz = SUR_YARICAP - SUR_KALINLIK / 2.0 - 0.5
    return (any(_sokak_mu(x, z, a, IC_YOL[0], sokak_bitisi(a), KAPI_GENISLIK / 2.0 if a == KAPI_ACISI else 1.5)
                for a in ANA_SOKAKLAR)
            or any(_sokak_mu(x, z, a, IC_YOL[0], ic_yuz) for a in ARA_SOKAKLAR)
            or any(_sokak_mu(x, z, a, DIS_YOL[0], ic_yuz) for a in DIS_ARA_SOKAKLAR))


def zemin_ve_yollar(d, rnd):
    """Zemin, meydan ve yollar. Donus: yol hucreleri {(x, z)}."""
    yollar = set()
    for x in range(-ZEMIN_YARICAP, ZEMIN_YARICAP + 1):
        for z in range(-ZEMIN_YARICAP, ZEMIN_YARICAP + 1):
            r = math.hypot(x, z)
            if r > ZEMIN_YARICAP:
                continue
            t = "grass_block"
            if MEYDAN_YARICAP - 7 <= r <= MEYDAN_YARICAP and tepe_yuksekligi(x, z) == 0:
                t = rnd.choice(["stone_bricks"] * 5 + ["cobblestone", "mossy_stone_bricks", "andesite"])
            elif yol_mu(x, z):
                t = "dirt_path"
            d.koy((x, 0, z), t)
            if t != "grass_block":
                yollar.add((x, z))
    return yollar



def _gurultu(x, z):
    """Deterministik kucuk dalga: tepe koni gibi durmasin."""
    return math.sin(x * 0.55 + z * 0.23) * 0.9 + math.sin(z * 0.61 - x * 0.31) * 0.7


def tepe(d, rnd):
    """Her sutunun ustu cimen, altinda iki toprak, derinde tas (Minecraft
    tepesi gibi); dik yerlerde yer yer kaya cikintisi."""
    for x in range(-TEPE_YARICAP - 2, TEPE_YARICAP + 3):
        for z in range(-TEPE_YARICAP - 2, TEPE_YARICAP + 3):
            h = tepe_yuksekligi(x, z)
            r = math.hypot(x, z)
            if DUZLUK_YARICAP < r < TEPE_YARICAP + 2:
                h = max(0, int(round(h + _gurultu(x, z) * (1.5 if h else 0.6))))
            if h <= 0:
                continue
            dusuk = min(tepe_yuksekligi(x + 1, z), tepe_yuksekligi(x - 1, z),
                        tepe_yuksekligi(x, z + 1), tepe_yuksekligi(x, z - 1))
            kaya = h - dusuk >= 3 and rnd.random() < 0.35
            for y in range(1, h + 1):
                if y == h:
                    t = rnd.choice(["stone", "andesite", "cobblestone"]) if kaya else "grass_block"
                elif y >= h - 2:
                    t = "stone" if kaya else "dirt"
                else:
                    t = rnd.choice(["stone"] * 6 + ["andesite", "cobblestone", "mossy_cobblestone"])
                d.koy((x, y, z), t)
            if not kaya and h < TEPE_YUKSEKLIK and rnd.random() < 0.08:
                d.koy((x, h + 1, z), rnd.choice(["short_grass", "short_grass", "poppy", "dandelion"]))


def merdiven(d):
    """Meydandan (guney) tepenin ustune: 5 genis, tas tugla basamak,
    iki yanda duvar. Basamak kuzeye cikiyor (yuksek taraf kuzey = 3)."""
    bas_z = DUZLUK_YARICAP + TEPE_YUKSEKLIK      # en alt basamak
    for i in range(TEPE_YUKSEKLIK):
        z = bas_z - i
        y = i + 1
        for x in range(-2, 3):
            for yy in range(y, TEPE_YUKSEKLIK + 4):       # basamagin ustunu ac
                d.sil((x, yy, z))
            for yy in range(1, y):
                d.koy((x, yy, z), "stone_bricks")
            d.koy((x, y, z), "stone_brick_stairs", {"weirdo_direction": 3, "upside_down_bit": False,
                                                     "corner": "none"})
        for x in (-3, 3):
            for yy in range(1, y + 1):
                d.koy((x, yy, z), "stone_bricks")
            d.koy((x, y + 1, z), "stone_brick_wall", {"wall_post_bit": True,
                                                       "wall_connection_type_north": "short",
                                                       "wall_connection_type_south": "short"})
            if i % 5 == 0:
                d.koy((x, y + 2, z), "lantern")


def ana_yapi(d, rnd):
    """Tepe ustundeki kale: 13x13 govde, dort kose kulesi, mazgallar,
    guneye bakan buyuk kapi. (Bicim onerisi; kayitta bicim yok.)"""
    y0 = TEPE_YUKSEKLIK + 1
    G = 6
    def tas():
        return rnd.choice(["stone_bricks"] * 6 + ["mossy_stone_bricks", "cracked_stone_bricks"])
    for x in range(-G, G + 1):
        for z in range(-G, G + 1):
            d.koy((x, y0 - 1, z), "polished_andesite" if (x + z) % 2 else "stone_bricks")
            kenar = abs(x) == G or abs(z) == G
            for y in range(y0, y0 + 9):
                if kenar:
                    pencere = (y in (y0 + 2, y0 + 3, y0 + 6) and (abs(x) == G) != (abs(z) == G)
                               and (x % 3 == 0 if abs(z) == G else z % 3 == 0))
                    d.koy((x, y, z), "glass_pane" if pencere else tas())
                elif y == y0 + 4:
                    d.koy((x, y, z), "dark_oak_planks")
            if kenar and (x + z) % 2 == 0:
                d.koy((x, y0 + 9, z), "stone_brick_wall", {"wall_post_bit": True})
            elif not kenar:
                d.koy((x, y0 + 8, z), "dark_oak_planks")
    # buyuk kapi (guney, merdivenin ucunda)
    for x in range(-1, 2):
        for y in range(y0, y0 + 4):
            d.sil((x, y, G))
    for x, kz in ((-G, -G), (G, -G), (-G, G), (G, G)):
        for dx in range(-2, 3):
            for dz in range(-2, 3):
                for y in range(y0 - 1, y0 + 14):
                    kenar = abs(dx) == 2 or abs(dz) == 2
                    if kenar or y in (y0 - 1, y0 + 4, y0 + 9):
                        pen = kenar and y in (y0 + 6, y0 + 11) and (dx == 0 or dz == 0)
                        d.koy((x + dx, y, kz + dz), "glass_pane" if pen else tas())
                    else:
                        d.sil((x + dx, y, kz + dz))
                if abs(dx) == 2 or abs(dz) == 2:
                    if (dx + dz) % 2 == 0:
                        d.koy((x + dx, y0 + 14, kz + dz), "stone_brick_wall", {"wall_post_bit": True})
        d.koy((x, y0 + 15, kz), "lantern")
    # avlu meseleleri
    for x, z in ((-3, 8), (3, 8)):
        d.koy((x, y0, z - 1), "lantern")


def savas_odasi(d):
    """Komutan Omer'in savas odasi: kalenin zemin katinda (kullanici: "savas
    odasi kalenin icinde"). Kayit: "isiklarla dolu, biraz sasali; buyuk bir
    haritanin serildigi, ulkelerin birbirine karsi plan kurdugu oda";
    sancaklar "kapinin girisinde" (kullanici, 2026-11-02).
    Bicim CLAUDE'UN ONERISI (kayitta bicim yok):
      * zemin katin kuzey yarisi (x -5..5, z -5..1); z = 2'de bolme duvari,
        ortasinda acik koyu mese kapi (guneyden, kalenin buyuk kapisindan gelinir);
      * ortada 5x3 koyu mese masa, ustunde harita (doku film aracinda
        cizilir: bilgi["savas_odasi"]["harita"]); altinda kirmizi hali;
      * tavandan sarkan alti fener, duvarlarda mesaleler, kose ayaklarinda
        altin bloklar ("biraz sasali"); bati duvarinda kitapliklar ve kursu;
      * kapinin iki yaninda, odanin icinde iki sancak (bilgi["savas_odasi"]
        ["sancaklar"]; desen film aracinda).
    rnd KULLANMAZ: hanedanin geri kalaninin rastgele dizisi degismesin.
    Kalenin disi degismez (her sey ic duvarlarin icinde)."""
    y0 = TEPE_YUKSEKLIK + 1
    # bolme duvari ve kapi
    for x in range(-5, 6):
        for y in range(y0, y0 + 4):
            if x == 0 and y < y0 + 2:
                continue
            d.koy((x, y, 2), "stone_bricks" if (x + y) % 3 else "chiseled_stone_bricks")
    d.koy((0, y0, 2), "dark_oak_door", {"direction": 3, "open_bit": True})
    d.koy((0, y0 + 1, 2), "dark_oak_door", {"direction": 3, "open_bit": True, "upper_block_bit": True})
    # hali ve masa
    for x in range(-3, 4):
        for z in range(-4, 1):
            d.koy((x, y0, z), "red_carpet")
    for x in range(-2, 3):
        for z in range(-3, 0):
            d.koy((x, y0, z), "dark_oak_planks")
    # kose ayaklari: altin ust (biraz sasali)
    for x, z in ((-5, -5), (5, -5), (-5, 1), (5, 1)):
        for y in range(y0, y0 + 3):
            d.koy((x, y, z), "polished_andesite")
        d.koy((x, y0 + 3, z), "gold_block")
    # bati duvari: kitaplik ve kursu (strateji belgeleri)
    for z in (-4, -3, -1, 0):
        for y in range(y0, y0 + 2):
            d.koy((-5, y, z), "bookshelf")
    d.koy((-4, y0, -2), "lectern", {"direction": 1})
    # dogu duvari: sandiklar (harita ve belgeler)
    for z in (-4, -3):
        d.koy((5, y0, z), "chest", {"facing_direction": 4})
    # tavandan sarkan fenerler (tavan y0 + 4)
    for x, z in ((-3, -4), (0, -4), (3, -4), (-3, 0), (0, 0), (3, 0)):
        d.koy((x, y0 + 3, z), "lantern", {"hanging": True})
    # duvar mesaleleri (kuzey duvari z = -6'nin icinde)
    for x in (-4, -2, 2, 4):
        d.koy((x, y0 + 2, -5), "wall_torch", {"torch_facing_direction": "south"})
    return {
        "zemin_y": y0,
        "kapi": [0, y0, 2],
        "masa": {"x": [-2, 3], "z": [-3, 0], "ust": y0 + 1},
        # harita masanin ustunde (Minecraft koordinatlari: x0, x1, z0, z1, y)
        "harita": {"x": [-2.0, 3.0], "z": [-3.0, 0.0], "y": y0 + 1 + 0.01},
        # sancaklar: kapinin iki yaninda, odanin icinde, kumasi kuzeye bakar
        "sancaklar": [{"p": [-0.6, y0, 1.6], "bak": "kuzey", "desen": "surda_safak"},
                      {"p": [1.6, y0, 1.6], "bak": "kuzey", "desen": "surda_safak"}],
    }


def kule_acilari():
    """Halkadaki kuleler kapinin iki yaninda simetrik; ayrica kapinin agzina
    bitisik iki kapi kulesi (kapi tek basina kucuk bir delik gibi duruyordu)."""
    kapi = math.degrees((KAPI_GENISLIK / 2.0 + KULE_YARICAP + 1.5) / SUR_YARICAP)
    return [KAPI_ACISI + (i + 0.5) * 360.0 / KULE_SAYISI for i in range(KULE_SAYISI)] + \
        [KAPI_ACISI - kapi, KAPI_ACISI + kapi]


def sur(d, rnd):
    """Sur ve kuleler. Donus: sur ve kule hucreleri {(x, z)}."""
    def tas():
        return rnd.choice(["stone_bricks"] * 7 + ["mossy_stone_bricks", "cracked_stone_bricks", "cobblestone"])
    hucre = set()
    ic, dis = SUR_YARICAP - SUR_KALINLIK / 2.0, SUR_YARICAP + SUR_KALINLIK / 2.0
    kuleler = [(math.cos(math.radians(a)) * SUR_YARICAP, math.sin(math.radians(a)) * SUR_YARICAP)
               for a in kule_acilari()]
    sinir = SUR_YARICAP + KULE_YARICAP + 3
    for x in range(-sinir, sinir + 1):
        for z in range(-sinir, sinir + 1):
            r = math.hypot(x, z)
            if r < ic - KULE_YARICAP - 2 or r > dis + KULE_YARICAP + 2:
                continue
            aci = (math.degrees(math.atan2(z, x)) + 360) % 360
            kapi = abs(((aci - KAPI_ACISI + 180) % 360) - 180) * math.pi / 180 * r <= KAPI_GENISLIK / 2.0 + 0.1
            kule = None
            for kx, kz in kuleler:
                if math.hypot(x - kx, z - kz) <= KULE_YARICAP + 0.5:
                    kule = (kx, kz)
            if kule:
                rk = math.hypot(x - kule[0], z - kule[1])
                for y in range(1, KULE_YUKSEKLIK + 1):
                    if rk >= KULE_YARICAP - 0.5 or y in (1, SUR_YUKSEKLIK, KULE_YUKSEKLIK):
                        pen = rk >= KULE_YARICAP - 0.5 and y in (SUR_YUKSEKLIK + 2,) and (x + z) % 3 == 0
                        d.koy((x, y, z), "glass_pane" if pen else tas())
                if rk >= KULE_YARICAP - 0.5 and (x + z) % 2 == 0:
                    d.koy((x, KULE_YUKSEKLIK + 1, z), tas())
                hucre.add((x, z))
                continue
            if not (ic <= r <= dis):
                continue
            for y in range(1, SUR_YUKSEKLIK + 1):
                if kapi and y <= KAPI_YUKSEKLIK:
                    continue
                d.koy((x, y, z), tas())
            if r >= dis - 1 and (x + z) % 2 == 0:
                d.koy((x, SUR_YUKSEKLIK + 1, z), tas())
            elif r <= ic + 1 and (x + z) % 4 == 0:
                d.koy((x, SUR_YUKSEKLIK + 1, z), "stone_brick_wall", {"wall_post_bit": True})
            hucre.add((x, z))
    return hucre


def fener_direkleri(d, yollar):
    """Halka yollarin dis kenarinda fener direkleri (sokak acilarinin
    arasinda). Donus: direk hucreleri."""
    hucre = set()
    for r, adet, kayma in ((IC_YOL[1] + 1.0, 16, 11.25), (ORTA_YOL[1] + 1.0, 24, 7.5),
                           (DIS_YOL[1] + 1.0, 32, 5.625)):
        for i in range(adet):
            a = math.radians(i * 360.0 / adet + kayma)
            rr = r
            while True:
                x, z = int(math.floor(math.cos(a) * rr + 0.5)), int(math.floor(math.sin(a) * rr + 0.5))
                if (x, z) not in yollar:
                    break
                rr += 0.5
            for y in (1, 2):
                d.koy((x, y, z), "oak_fence")
            d.koy((x, 3, z), "lantern")
            hucre.add((x, z))
    return hucre



# ---------------------------------------------------------------------
# ZISA'NIN EVI -- elle tasarim (hanedanla birlikte onaylandi, 2026-11-02)
# ---------------------------------------------------------------------
def zisa_evi():
    """Iki katli koy evi; on cephesi (kapi, 2. kat pencereleri) KUZEYE
    bakar, yerlestirirken meydana dondurulur.
      * Zemin kati (y 1-3) tas temel uzerinde; UST KAT sokaga bir blok
        CIKMA yapar (z = -1), alti ters basamak konsollarla tutulur --
        kapi bu cikmanin altinda, korunakli.
      * 2. kat on cephede iki genis pencere: 2. bolum Part 2'de Baris
        birinin camini kirip asagi atliyor.
      * Zisa'nin buyu rengi mor (kayit): ust kattaki odasinda mor hali ve
        mor yatak; kitapliklar ve kursu (kraliyet buyuculugune aday).
    Taban 9 (x) x 7 (z); yerel koken evin kuzeybati kosesi, zemin y = 0."""
    B = Dunya()
    X, Z = 9, 7
    log = lambda eksen: {"pillar_axis": eksen}
    # temel ve zemin kati dosemesi
    for x in range(X):
        for z in range(Z):
            kenar = x in (0, X - 1) or z in (0, Z - 1)
            B.koy((x, 0, z), "cobblestone" if kenar else "spruce_planks")
    # zemin kati duvarlari (y 1-3)
    for y in range(1, 4):
        for x in range(X):
            for z in range(Z):
                if not (x in (0, X - 1) or z in (0, Z - 1)):
                    continue
                if x in (0, 4, X - 1) and z in (0, Z - 1) or (x in (0, X - 1) and z == 3):
                    B.koy((x, y, z), "oak_log", log("y"))
                else:
                    B.koy((x, y, z), "cobblestone" if y == 1 else "oak_planks")
    # kat kirisi (y 4) ve ust kat dosemesi; on tarafta cikma (z = -1)
    for x in range(X):
        for z in range(-1, Z):
            kenar = x in (0, X - 1) or z in (-1, Z - 1)
            B.koy((x, 4, z), "stripped_oak_log" if kenar else "spruce_planks",
                  log("x" if z in (-1, Z - 1) else "z") if kenar else None)
    for x in (0, 4, X - 1):                    # cikma konsollari
        B.koy((x, 3, -1), "spruce_stairs", {"weirdo_direction": 2, "upside_down_bit": True, "corner": "none"})
    # ust kat duvarlari (y 5-8), on duvar z = -1
    for y in range(5, 9):
        for x in range(X):
            for z in range(-1, Z):
                if not (x in (0, X - 1) or z in (-1, Z - 1)):
                    continue
                if (x in (0, 4, X - 1) and z in (-1, Z - 1)) or (x in (0, X - 1) and z == 3):
                    B.koy((x, y, z), "oak_log", log("y"))
                elif y == 8:
                    B.koy((x, y, z), "stripped_oak_log", log("x" if z in (-1, Z - 1) else "z"))
                else:
                    B.koy((x, y, z), "oak_planks")
    for x in range(1, X - 1):                  # tavan
        for z in range(0, Z - 1):
            B.koy((x, 8, z), "spruce_planks")
    # ---- on cephe ----
    for y in (1, 2):                           # kapi (cikmanin altinda)
        B.koy((2, y, 0), "spruce_door", {"direction": 1, "upper_block_bit": y == 2, "door_hinge_bit": False})
    B.koy((1, 1, -1), "oak_fence")             # kapi yaninda fener diregi
    B.koy((1, 2, -1), "lantern")
    for x in (5, 6):                           # zemin kati penceresi + cicek kutusu
        for y in (2, 3):
            B.koy((x, y, 0), "glass_pane")
        B.koy((x, 1, -1), "spruce_trapdoor", {"direction": 3, "open_bit": False, "upside_down_bit": True})
        B.koy((x, 2, -1), "flower_pot", bitki="allium" if x == 5 else "azure_bluet")
    for x in (4, 7):                           # kepenkler
        for y in (2, 3):
            B.koy((x, y, -1), "spruce_trapdoor", {"direction": 3, "open_bit": True})
    for x in (2, 3, 5, 6):                     # 2. kat: Baris'in kiracagi genis pencereler
        for y in (6, 7):
            B.koy((x, y, -1), "glass_pane")
        B.koy((x, 5, -2), "spruce_trapdoor", {"direction": 3, "open_bit": False, "upside_down_bit": True})
        B.koy((x, 6, -2), "flower_pot", bitki=["poppy", "allium", "oxeye_daisy", "allium"][(x + 1) % 4])
    # yan ve arka pencereler
    for z in (1, 5):
        for y in (2, 3):
            B.koy((0, y, z), "glass_pane")
            B.koy((X - 1, y, z), "glass_pane")
    for z in (1, 4):
        for y in (6, 7):
            B.koy((0, y, z), "glass_pane")
            B.koy((X - 1, y, z), "glass_pane")
    for x in (2, 6):
        for y in (2, 6):
            B.koy((x, y, Z - 1), "glass_pane")
            B.koy((x, y + 1, Z - 1), "glass_pane")
    # ---- cati: dogu-bati mahya; on yamac cikmanin da ustunden ----
    on0, arka0 = -2, Z
    k = 0
    while on0 + k <= arka0 - k:
        y = 9 + k
        for x in range(-1, X + 1):
            B.koy((x, y, on0 + k), "spruce_stairs", {"weirdo_direction": 2, "upside_down_bit": False,
                                                     "corner": "none"})
            B.koy((x, y, arka0 - k), "spruce_stairs", {"weirdo_direction": 3, "upside_down_bit": False,
                                                       "corner": "none"})
        for x in (0, X - 1):                   # alinliklar
            for z in range(on0 + k + 1, arka0 - k):
                B.koy((x, y, z), "oak_planks")
        k += 1
    for x in (0, X - 1):                       # alinlikta kucuk pencere
        B.koy((x, 10, 2), "glass_pane")
        B.koy((x, 10, 3), "glass_pane")
    # baca (arka, dogu)
    for y in range(0, 15):
        B.koy((X - 2, y, Z), "cobblestone" if y < 14 else "cobblestone_wall",
              {"wall_post_bit": True} if y == 14 else None)
    # ---- ic: zemin kati ----
    B.koy((1, 1, 5), "furnace", {"minecraft:cardinal_direction": "north"})
    B.koy((2, 1, 5), "smoker", {"minecraft:cardinal_direction": "north"})
    B.koy((3, 1, 5), "barrel", {"facing_direction": 1})
    B.koy((1, 1, 3), "crafting_table")
    B.koy((4, 1, 3), "oak_fence")
    B.koy((4, 2, 3), "white_carpet")
    B.koy((4, 3, 3), "lantern")
    B.koy((3, 1, 3), "oak_stairs", {"weirdo_direction": 1, "upside_down_bit": False, "corner": "none"})
    B.koy((5, 1, 3), "oak_stairs", {"weirdo_direction": 0, "upside_down_bit": False, "corner": "none"})
    B.koy((1, 1, 1), "flower_pot", bitki="fern")
    # ust kata merdiven: dogu duvari boyunca kuzeye cikar
    for i in range(3):
        B.koy((X - 2, 1 + i, 5 - i), "spruce_stairs", {"weirdo_direction": 3, "upside_down_bit": False,
                                                       "corner": "none"})
        for yy in range(1, 1 + i):
            B.koy((X - 2, yy, 5 - i), "spruce_planks")
    for z in (1, 2, 3):
        B.sil((X - 2, 4, z))                   # doseme acikligi
    # ---- ic: ust kat (Zisa'nin odasi) ----
    for x in range(1, X - 1):
        for z in range(0, Z - 1):
            if x == X - 2 and z in (1, 2, 3):
                continue
            B.koy((x, 5, z), "purple_carpet" if 2 <= x <= 5 and 1 <= z <= 4 else "white_carpet")
    for z in (1, 2, 3):                        # aciklik korkulugu
        B.koy((X - 3, 5, z), "oak_fence", {"connection_north": z > 1, "connection_south": z < 3})
    B.koy((1, 5, 2), "bed", {"direction": 0, "head_piece_bit": True, "renk": "purple"})
    B.koy((1, 5, 3), "bed", {"direction": 0, "head_piece_bit": False, "renk": "purple"})
    for x in (1, 2, 3, 4):
        for y in (5, 6, 7):
            B.koy((x, y, Z - 2), "bookshelf")
    B.koy((5, 5, 4), "lectern", {"direction": 0})
    B.koy((3, 7, 2), "lantern", {"hanging": True})
    B.koy((6, 5, 0), "chest", {"minecraft:cardinal_direction": "south"})
    B.koy((1, 5, 0), "flower_pot", bitki="allium")
    B.koy((7, 5, 5), "flower_pot", bitki="azure_bluet")
    return B.bloklar()


# ---------------------------------------------------------------------
# KOY EVLERI -- el tasarimi tipler (ova koyu uslubu)
# ---------------------------------------------------------------------
# Gercek koy evlerini olcmek icin arac/yapi_olc.py + arac/koy_evleri.py
# var; 2026-11-01'deki olcum betik bekcisine takilip bitmedi. O olcum
# gelene kadar evler burada, ova koyunun bilinen dokusuyla elle kurulu.
def ev_tipi(X, Z, kat=1, duvar="oak_planks", alt_duvar="cobblestone", direk="oak_log",
            cati="oak", veranda=False, cicek=False, baca=False, tente=False, ic=("bed", "crafting_table"),
            tohum=0):
    """On cephe (kapi) KUZEY (z = 0). Yerel koken kuzeybati kose, zemin y = 0."""
    rnd = random.Random(tohum)
    B = Dunya()
    Y = 4 * kat                          # kat yuksekligi 4 (3 duvar + kiris)
    for x in range(X):
        for z in range(Z):
            kenar = x in (0, X - 1) or z in (0, Z - 1)
            B.koy((x, 0, z), "cobblestone" if kenar else cati + "_planks")
    def dikme(x, z):
        return (x in (0, X - 1) and z in (0, Z - 1)) or (x in (0, X - 1) and Z > 6 and z == Z // 2) \
            or (z in (0, Z - 1) and X > 6 and x == X // 2)
    for y in range(1, Y):
        for x in range(X):
            for z in range(Z):
                if not (x in (0, X - 1) or z in (0, Z - 1)):
                    continue
                if dikme(x, z):
                    B.koy((x, y, z), direk, {"pillar_axis": "y"})
                elif y % 4 == 0:
                    B.koy((x, y, z), "stripped_" + direk if direk.endswith("_log") else direk,
                          {"pillar_axis": "x" if z in (0, Z - 1) else "z"})
                else:
                    B.koy((x, y, z), alt_duvar if y == 1 else duvar)
        if y % 4 == 0:
            for x in range(1, X - 1):
                for z in range(1, Z - 1):
                    B.koy((x, y, z), cati + "_planks")
    for x in range(1, X - 1):            # tavan
        for z in range(1, Z - 1):
            B.koy((x, Y, z), cati + "_planks")
    for x in range(X):
        for z in (0, Z - 1):
            B.koy((x, Y, z), "stripped_" + direk if direk.endswith("_log") else direk, {"pillar_axis": "x"})
    for z in range(Z):
        for x in (0, X - 1):
            B.koy((x, Y, z), "stripped_" + direk if direk.endswith("_log") else direk, {"pillar_axis": "z"})
    kapi_x = X // 2
    for y in (1, 2):
        B.koy((kapi_x, y, 0), cati + "_door", {"direction": 1, "upper_block_bit": y == 2, "door_hinge_bit": False})
    # pencereler: her katta, dikme ve kapi disindaki yerlerde
    for k in range(kat):
        y0 = 4 * k + 2
        for x in range(1, X - 1):
            if dikme(x, 0) or abs(x - kapi_x) <= (1 if k == 0 else -1):
                continue
            if x % 2 == (1 if X % 4 == 1 else 0):
                B.koy((x, y0, 0), "glass_pane")
                B.koy((x, y0, Z - 1), "glass_pane")
                if cicek and k == kat - 1:
                    B.koy((x, y0 - 1, -1), cati + "_trapdoor", {"direction": 3, "open_bit": False,
                                                               "upside_down_bit": True})
                    B.koy((x, y0, -1), "flower_pot", bitki=rnd.choice(["poppy", "dandelion", "allium",
                                                                        "azure_bluet", "oxeye_daisy"]))
        for z in range(1, Z - 1):
            if dikme(0, z) or z % 2 == 0:
                continue
            B.koy((0, y0, z), "glass_pane")
            B.koy((X - 1, y0, z), "glass_pane")
    # cati: dogu-bati mahya, her yonde bir blok tasma
    k = 0
    while -1 + k <= Z - k:
        y = Y + 1 + k
        on, arka = -1 + k, Z - k
        for x in range(-1, X + 1):
            if on < arka:
                B.koy((x, y, on), cati + "_stairs", {"weirdo_direction": 2, "upside_down_bit": False,
                                                     "corner": "none"})
                B.koy((x, y, arka), cati + "_stairs", {"weirdo_direction": 3, "upside_down_bit": False,
                                                       "corner": "none"})
            else:
                B.koy((x, y, on), cati + "_slab", {"vertical_half": "bottom"})
        for x in (0, X - 1):
            for z in range(on + 1, arka):
                B.koy((x, y, z), duvar if duvar != "cobblestone" else cati + "_planks")
        if on >= arka - 1:
            if on == arka - 1:
                for x in range(-1, X + 1):
                    B.koy((x, y + 1, on), cati + "_slab", {"vertical_half": "bottom"})
                    B.koy((x, y + 1, arka), cati + "_slab", {"vertical_half": "bottom"})
            break
        k += 1
    if veranda:                          # kapi onunde iki direk + yarim kat cati + fener
        for x in (kapi_x - 1, kapi_x + 1):
            for y in (1, 2):
                B.koy((x, y, -1), "oak_fence")
            B.koy((x, 3, -1), cati + "_slab", {"vertical_half": "bottom"})
        B.koy((kapi_x, 3, -1), cati + "_slab", {"vertical_half": "bottom"})
        B.koy((kapi_x + 1, 4, -1), "lantern")
    else:
        B.koy((kapi_x - 1, 1, -1), "oak_fence")
        B.koy((kapi_x - 1, 2, -1), "lantern")
    if tente:                            # atolye: onde saçak, variller, saman
        for x in range(0, X):
            B.koy((x, 3, -1), cati + "_slab", {"vertical_half": "top"})
            B.koy((x, 3, -2), cati + "_slab", {"vertical_half": "bottom"})
        for x in (0, X - 1):
            for y in (1, 2):
                B.koy((x, y, -2), "oak_fence")
        B.koy((1, 1, -1), "barrel", {"facing_direction": 1})
        B.koy((X - 2, 1, -1), "hay_block", {"pillar_axis": "y"})
        B.koy((X - 3, 1, -1), "hay_block", {"pillar_axis": "x"})
    if baca:
        for y in range(0, Y + 5):
            B.koy((X - 2, y, Z), "cobblestone")
    # ic esyalar
    yer = [(x, z) for x in range(1, X - 1) for z in range(1, Z - 1)
           if not (x == kapi_x and z == 1) and not (baca and (x, z) == (X - 2, Z - 2))]
    rnd.shuffle(yer)
    for i, e in enumerate(ic):
        if i >= len(yer):
            break
        x, z = yer[i]
        if e == "bed":
            if z + 1 < Z - 1:
                B.koy((x, 1, z), "bed", {"direction": 2, "head_piece_bit": False})
                B.koy((x, 1, z + 1), "bed", {"direction": 2, "head_piece_bit": True})
        else:
            B.koy((x, 1, z), e)
    B.koy((X // 2, Y - 1, Z // 2), "lantern", {"hanging": True})
    return B.bloklar()


EV_TIPLERI = [
    ("kucuk_ev", dict(X=5, Z=5, tohum=1)),
    ("beyaz_ev", dict(X=7, Z=5, duvar="white_terracotta", cati="spruce", veranda=True, tohum=2,
                      ic=("bed", "crafting_table", "barrel"))),
    ("iki_katli", dict(X=7, Z=7, kat=2, cati="spruce", cicek=True, baca=True, tohum=3,
                       ic=("bed", "crafting_table", "chest", "furnace"))),
    ("atolye", dict(X=9, Z=5, alt_duvar="cobblestone", cati="oak", tente=True, tohum=4,
                    ic=("crafting_table", "smithing_table", "barrel", "chest"))),
    ("tas_ev", dict(X=6, Z=6, duvar="stone_bricks", alt_duvar="cobblestone", direk="dark_oak_log",
                    cati="dark_oak", cicek=True, tohum=5, ic=("bed", "bookshelf", "chest"))),
    ("beyaz_iki_katli", dict(X=7, Z=6, kat=2, duvar="white_terracotta", cati="oak", veranda=True,
                             baca=True, tohum=6, ic=("bed", "crafting_table", "barrel"))),
    ("kule_ev", dict(X=5, Z=5, kat=3, duvar="white_terracotta", direk="spruce_log", cati="spruce",
                     cicek=True, tohum=7, ic=("bed", "crafting_table", "barrel"))),
    ("kutuphane", dict(X=7, Z=7, kat=2, duvar="oak_planks", alt_duvar="stone_bricks", direk="spruce_log",
                       cati="spruce", cicek=True, tohum=8,
                       ic=("bookshelf", "bookshelf", "lectern", "bookshelf", "bookshelf", "crafting_table"))),
    ("ahir", dict(X=9, Z=7, duvar="spruce_planks", alt_duvar="cobblestone", direk="dark_oak_log",
                  cati="dark_oak", tente=True, tohum=9, ic=("hay_block", "hay_block", "barrel", "chest"))),
    ("genis_ev", dict(X=11, Z=7, duvar="oak_planks", alt_duvar="cobblestone", cati="oak", veranda=True,
                      cicek=True, baca=True, tohum=10, ic=("bed", "bed", "crafting_table", "furnace", "chest"))),
    ("han", dict(X=9, Z=7, kat=2, duvar="oak_planks", alt_duvar="cobblestone", direk="dark_oak_log",
                 cati="spruce", veranda=True, cicek=True, baca=True, tohum=11,
                 ic=("bed", "bed", "bed", "crafting_table", "barrel", "chest", "furnace", "barrel"))),
    ("firin", dict(X=7, Z=6, duvar="cobblestone", alt_duvar="stone_bricks", direk="oak_log", cati="dark_oak",
                   baca=True, tente=True, tohum=12, ic=("furnace", "smoker", "furnace", "barrel", "crafting_table"))),
    ("gri_ev", dict(X=6, Z=6, kat=2, duvar="light_gray_terracotta", direk="spruce_log", cati="spruce",
                    cicek=True, tohum=13, ic=("bed", "crafting_table", "chest"))),
]
# genis ya da derin olanlar ic halkaya sigmiyor; ic halka bunlarsiz dizilir
DIS_HALKA_TIPLERI = ("atolye", "ahir", "genis_ev", "han", "firin")
EKINLER = ("wheat", "carrots", "potatoes", "beetroot")


def tarla(X=9, Z=7, ekin="wheat", tohum=0):
    """Koy tarlasi: kutuk cerceve, ortada su arki, iki yaninda islak tarla
    topragi ve ekin. On (giris) KUZEY, yerel koken kuzeybati kose."""
    rnd = random.Random(tohum)
    B = Dunya()
    for x in range(X):
        for z in range(Z):
            kenar_x, kenar_z = x in (0, X - 1), z in (0, Z - 1)
            if kenar_x or kenar_z:
                eksen = "y" if kenar_x and kenar_z else ("x" if kenar_z else "z")
                B.koy((x, 0, z), "oak_log", {"pillar_axis": eksen})
            elif z == Z // 2:
                B.koy((x, 0, z), "water")
            else:
                B.koy((x, 0, z), "farmland", {"moisturized_amount": 7})
                tur = ekin if rnd.random() < 0.85 else rnd.choice(EKINLER)
                B.koy((x, 1, z), tur, {"growth": rnd.choice([3, 5, 6, 7, 7, 7])})
    B.koy((0, 1, 0), "composter")
    return B.bloklar()


def el_evleri():
    return [{"ad": ad, "kapi_yonu": [0, -1], "bloklar": ev_tipi(**prm)} for ad, prm in EV_TIPLERI]


def tarlalar():
    return [{"ad": "tarla_" + e, "kapi_yonu": [0, -1], "bloklar": tarla(ekin=e, tohum=20 + i), "tarla": True}
            for i, e in enumerate(EKINLER)]



# ---------------------------------------------------------------------
# KOY EVLERI -- olculmus evleri halkaya diz
# ---------------------------------------------------------------------
def evleri_oku(yol=None):
    yol = yol or os.path.join(BURASI, "yapilar", "koy_evleri.json")
    if not os.path.exists(yol):
        return []
    return json.load(open(yol, encoding="utf-8"))["evler"]


def _kutu(bloklar):
    xs = [b["p"][0] for b in bloklar]
    zs = [b["p"][2] for b in bloklar]
    ys = [b["p"][1] for b in bloklar]
    return min(xs), min(ys), min(zs), max(xs), max(ys), max(zs)


def ev_yerlestir(d, ev, aci, r, kapi_yonu, lo=None, hi=None, yasak=None, yaz=True):
    """`ev` (bloklar, on = kapi yonu kuzey) aciya gore dondurulup halkaya
    konur; kapisi merkeze bakar. Evin BUTUN bloklari lo..hi yaricap
    bandina sigana dek ev ice/disa kaydirilir; `yasak` bir hucreye (yol,
    sur, fener, baska ev) dusen ev konmaz. Donus: None (konamadi) ya da
    yerlesim sozlugu; yaz=False yalniz dener."""
    # kapi kuzeyde (z-) olacak sekilde: kapi_yonu (x, z) -> ceyrek
    donus = {(0, -1): 0, (1, 0): 3, (0, 1): 2, (-1, 0): 1}[kapi_yonu]
    bl = blok_kur.dondur(ev, donus)
    # simdi kapi kuzeyde; merkeze bakmasi icin hedef yon = -(cos a, sin a)
    hedef = (-math.cos(math.radians(aci)), -math.sin(math.radians(aci)))
    adaylar = {(0, -1): 0, (1, 0): 1, (0, 1): 2, (-1, 0): 3}
    on = max(adaylar, key=lambda v: v[0] * hedef[0] + v[1] * hedef[1])
    bl = blok_kur.dondur(bl, adaylar[on])
    x0, y0, z0, x1, y1, z1 = _kutu(bl)
    cx, cz = (x0 + x1) / 2.0, (z0 + z1) / 2.0
    taban = min(b["p"][1] for b in bl if b["t"] not in ("dirt_path",))
    hi = SUR_YARICAP - SUR_KALINLIK / 2.0 - EV_SUR_ARASI if hi is None else hi

    def kaydirma(rr):
        tx, tz = math.cos(math.radians(aci)) * rr, math.sin(math.radians(aci)) * rr
        # Kaydirma BIR KEZ ve tam sayi: blok basina round() yarimlari cifte
        # yuvarliyordu (-34.5 -> -34, -33.5 -> -34), komsu iki sutun ayni
        # yere dusup birbirini eziyordu -- Zisa'nin 2. kat penceresi boyle
        # kayboldu.
        return int(math.floor(tx - cx + 0.5)), int(math.floor(tz - cz + 0.5))

    # Ev merkeze bakan en yakin ana yone donuyor; 20-45 derecelik acilarda
    # kosesi halkadan tasiyor (baca, cati sacagi). Ev banda sigana dek
    # kaydirilir; sigmiyorsa (bant evden dar) konmaz.
    sigdi = False
    for _ in range(30):
        ox, oz = kaydirma(r)
        uzaklik = [math.hypot(b["p"][0] + ox, b["p"][2] + oz) for b in bl]
        uzak, yakin = max(uzaklik), min(uzaklik)
        if uzak > hi + 1e-9:
            r -= uzak - hi + 0.25
        elif lo is not None and yakin < lo - 1e-9:
            r += lo - yakin + 0.25
        else:
            sigdi = True
            break
    if not sigdi:
        return None
    hucreler = {(b["p"][0] + ox, b["p"][2] + oz) for b in bl}
    if yasak is not None and hucreler & yasak:
        return None
    yazilacak = [((b["p"][0] + ox, b["p"][1] - taban, b["p"][2] + oz), b) for b in bl]
    s = {"boy": (x1 - x0 + 1, z1 - z0 + 1), "r": r, "on": on, "hucreler": hucreler,
         "yazilacak": yazilacak, "uzak": uzak,
         "kapilar": [p for p, b in yazilacak if b["t"].endswith("_door")
                     and not b.get("s", {}).get("upper_block_bit")]}
    if yaz:
        ev_yaz(d, s)
    return s


def ev_yaz(d, s):
    for p, b in s["yazilacak"]:
        d.koy(p, b["t"], b.get("s"), **({"bitki": b["bitki"]} if "bitki" in b else {}))


def _komsu(hucreler, k=1):
    return {(x + dx, z + dz) for x, z in hucreler for dx in range(-k, k + 1) for dz in range(-k, k + 1)}


def _yaylar(sokaklar, r, pay=2.5):
    """Sokaklarin arasindaki serbest yaylar (derece), sokaga `pay` blok."""
    s = sorted(a % 360 for a in sokaklar)
    d = math.degrees(pay / r)
    return [(a + d, (s[(i + 1) % len(s)] + (360 if i == len(s) - 1 else 0)) - d) for i, a in enumerate(s)]


def halka_diz(d, liste, r, lo, hi, yaylar, yasak, bilgi, halka, sayac):
    """Evleri yay boyunca SIKI dizer: her ev bir oncekinin gercek ucundan
    (hucrelerinin en buyuk acisindan) hemen sonra baslar, yasaktaki bir
    hucrelik tampon aralarinda en az bir blok birakir. Ev sigmazsa yay
    boyunca birer blok kaydirilarak denenir, sonra siradaki tip; hicbiri
    olmazsa iki blok ilerlenir. (Ilk yazilis evi en genis kenarina gore
    sabit adimla diziyordu: araliklar bos kaliyordu.)"""
    for a0, a1 in yaylar:
        a = a0
        while a < a1:
            konuldu = False
            for deneme in range(len(liste)):
                ev = liste[(sayac[0] + deneme) % len(liste)]
                if sum(1 for q in bilgi["evler"] if q["ad"] == ev["ad"]) >= EV_SINIRI.get(ev["ad"], 10 ** 6):
                    continue
                xs = [b["p"][0] for b in ev["bloklar"]]
                zs = [b["p"][2] for b in ev["bloklar"]]
                yari = min(max(xs) - min(xs), max(zs) - min(zs)) / 2.0 + 0.5
                s, orta = None, None
                for kay in range(10):
                    orta = a + math.degrees((yari + 0.5 + kay) / r)
                    if orta + math.degrees(yari / r) > a1:
                        break
                    s = ev_yerlestir(d, ev["bloklar"], orta, r, tuple(ev["kapi_yonu"]), lo, hi, yasak, yaz=False)
                    if s is not None:
                        break
                if s is None:
                    continue
                ev_yaz(d, s)
                yasak |= _komsu(s["hucreler"], 1)
                bilgi["evler"].append({"ad": ev["ad"], "aci": round(orta, 2), "boy": s["boy"],
                                       "yaricap": round(s["r"], 2), "uzak": round(s["uzak"], 3), "halka": halka,
                                       "tarla": bool(ev.get("tarla")), "on": list(s["on"]),
                                       "kapilar": s["kapilar"],
                                       "hucreler": sorted(list(c) for c in s["hucreler"])})
                # sonraki ev bu evin gercek ucundan baslar
                uc = max(((math.degrees(math.atan2(z, x)) - orta + 180) % 360) - 180 for x, z in s["hucreler"])
                a = orta + uc + math.degrees(1.0 / r)
                sayac[0] += deneme + 1
                konuldu = True
                break
            if not konuldu:
                a += math.degrees(2.0 / r)


def kapi_yollari(d, evler, yollar):
    """Her kapidan merkeze dogru en yakin yola toprak patika (en cok 14
    blok; arada bir engel varsa patika dokulmez)."""
    patika = set()
    for e in evler:
        fx, fz = e["on"]
        for (x, _, z) in e["kapilar"]:
            yol, cx, cz = [], x + fx, z + fz
            for _ in range(14):
                if (cx, cz) in yollar or (cx, cz) in patika:
                    break
                b0 = d.h.get((cx, 0, cz))
                if b0 is None or b0["t"] != "grass_block" or d.var((cx, 1, cz)):
                    yol = None
                    break
                yol.append((cx, cz))
                cx, cz = cx + fx, cz + fz
            else:
                yol = None
            for (px, pz) in yol or []:
                d.koy((px, 0, pz), "dirt_path")
                patika.add((px, pz))
    return patika


def ust_y(d, x, z, en=45):
    for y in range(en, -1, -1):
        if d.var((x, y, z)):
            return y
    return None


def agac(d, x, y0, z, tur, rnd):
    """Minecraft mese/hus agaci: govde 4-6 (hus 5-7), dort kat yaprak,
    alttaki iki kat 5x5, ustteki iki kat 3x3, koseler yer yer eksik."""
    h = rnd.randint(4, 6) if tur == "oak" else rnd.randint(5, 7)
    for y in range(y0, y0 + h):
        d.koy((x, y, z), tur + "_log", {"pillar_axis": "y"})
    ust = y0 + h - 1
    for dy, yr in ((-2, 2), (-1, 2), (0, 1), (1, 1)):
        y = ust + dy
        for dx in range(-yr, yr + 1):
            for dz in range(-yr, yr + 1):
                if dx == 0 and dz == 0 and dy <= 0:
                    continue
                if abs(dx) == yr and abs(dz) == yr and (dy == 1 or rnd.random() < 0.5):
                    continue
                if not d.var((x + dx, y, z + dz)):
                    d.koy((x + dx, y, z + dz), tur + "_leaves", {"persistent_bit": True})


def agaclar(d, rnd, ev_hucre, yollar):
    """Azicik agac: surun icinde evlerden ve yollardan uzak bosluklara,
    tepenin yamacina birkac, surun disina biraz. Donus: {yer: [(x, z)]}."""
    ic_sinir = SUR_YARICAP - SUR_KALINLIK / 2.0 - 3
    dis_alt = SUR_YARICAP + SUR_KALINLIK / 2.0 + KULE_YARICAP + 4
    konan = {"ic": [], "tepe": [], "dis": []}
    hepsi = []

    def uzak_mi(x, z, kume, k):
        return not any((x + dx, z + dz) in kume for dx in range(-k, k + 1) for dz in range(-k, k + 1))

    adaylar = sorted((x, z) for (x, y, z), b in d.h.items() if y == 0 and b["t"] == "grass_block")
    rnd.shuffle(adaylar)
    for x, z in adaylar:
        r = math.hypot(x, z)
        if IC_YOL[1] + 2 <= r <= ic_sinir:
            yer, en = "ic", AGAC_IC
        elif dis_alt <= r <= ZEMIN_YARICAP - 3:
            yer, en = "dis", AGAC_DIS
        else:
            continue
        if len(konan[yer]) >= en or d.var((x, 1, z)):
            continue
        if not (uzak_mi(x, z, ev_hucre, 3) and uzak_mi(x, z, yollar, 3)):
            continue
        if any(abs(x - a) < 6 and abs(z - b) < 6 for a, b in hepsi):
            continue
        agac(d, x, 1, z, "birch" if rnd.random() < 0.3 else "oak", rnd)
        konan[yer].append((x, z))
        hepsi.append((x, z))
    # tepenin yamaci: merdivenden ve kaleden uzak, ustu cimen
    yamac = sorted((x, z) for x in range(-TEPE_YARICAP, TEPE_YARICAP + 1)
                   for z in range(-TEPE_YARICAP, TEPE_YARICAP + 1)
                   if DUZLUK_YARICAP + 3 <= math.hypot(x, z) <= TEPE_YARICAP - 3 and not (abs(x) <= 8 and z > 0))
    rnd.shuffle(yamac)
    for x, z in yamac:
        if len(konan["tepe"]) >= AGAC_TEPE:
            break
        y = ust_y(d, x, z)
        if y is None or d.h[(x, y, z)]["t"] != "grass_block":
            continue
        if any(abs(x - a) < 7 and abs(z - b) < 7 for a, b in konan["tepe"]):
            continue
        agac(d, x, y + 1, z, "oak", rnd)
        konan["tepe"].append((x, z))
    return konan


CICEKLER = ("poppy", "dandelion", "azure_bluet", "oxeye_daisy", "cornflower", "allium", "red_tulip",
            "white_tulip", "orange_tulip", "pink_tulip", "lily_of_the_valley")


def cicekler(d, rnd, bos_kalsin=()):
    """Bos cimenin azicigina cicek, biraz daha fazlasina kisa ot."""
    n = 0
    for (x, y, z), b in sorted(list(d.h.items())):
        if y != 0 or b["t"] != "grass_block" or d.var((x, 1, z)) or (x, z) in bos_kalsin:
            continue
        u = rnd.random()
        if u < CICEK_ORANI:
            d.koy((x, 1, z), rnd.choice(CICEKLER))
            n += 1
        elif u < CICEK_ORANI + OT_ORANI:
            d.koy((x, 1, z), "short_grass")
    return n


def yurunur(d, x, z):
    """Koylu durabilir mi: altinda kati zemin (su ve tarla degil), ustunde
    iki blok bos."""
    b0 = d.h.get((x, 0, z))
    return (b0 is not None and b0["t"] not in ("water", "farmland") and not d.var((x, 1, z))
            and not d.var((x, 2, z)))


def koylu_yerlestir(d, rnd, yollar, evler):
    """Az sayida koylu: meydanda, sokaklarda, tarlalarin kenarinda ve
    Zisa'nin sokaginda. Donus: [{"p", "yon", "tip", "meslek", "seviye"}]."""
    secilen = []

    def ekle(adaylar, adet, meslek=None):
        rnd.shuffle(adaylar)
        for x, z in adaylar:
            if adet <= 0 or len(secilen) >= KOYLU_SAYISI:
                return
            if not yurunur(d, x, z) or any(math.hypot(x - a["h"][0], z - a["h"][1]) < 4 for a in secilen):
                continue
            secilen.append({"h": (x, z), "meslek": meslek})
            adet -= 1

    meydan = sorted(c for c in yollar if MEYDAN_YARICAP - 6 <= math.hypot(*c) <= MEYDAN_YARICAP - 1)
    sokak = sorted(c for c in yollar if math.hypot(*c) >= IC_YOL[0] and math.hypot(*c) < SUR_YARICAP - 4)
    tarla_kenari = []
    for e in evler:
        if e.get("tarla"):
            h = {tuple(c) for c in e["hucreler"]}
            tarla_kenari.extend(sorted(c for c in _komsu(h, 1) - h))
    zisa_sokagi = sorted(c for c in yollar if _sokak_mu(c[0], c[1], 180, ORTA_YOL[0] - 1, ORTA_YOL[1] + 1, 3))
    ekle(tarla_kenari, 2, "farmer")
    ekle(meydan, 3)
    ekle(zisa_sokagi, 1)
    ekle(sokak, KOYLU_SAYISI)
    meslekler = ["librarian", "cleric", "armorer", "butcher", "cartographer", "fletcher", "shepherd",
                 "toolsmith", "weaponsmith", "mason", "leatherworker", "fisherman", "nitwit", "none"]
    rnd.shuffle(meslekler)
    sonuc = []
    for i, k in enumerate(secilen):
        x, z = k["h"]
        aci = math.radians(rnd.uniform(0, 360))
        zemin = d.h[(x, 0, z)]["t"]
        sonuc.append({"p": [x + 0.5, 15 / 16.0 if zemin in ("dirt_path", "farmland") else 1.0, z + 0.5],
                      "yon": [round(math.cos(aci), 4), round(math.sin(aci), 4)], "tip": "plains",
                      "meslek": k["meslek"] or meslekler[i % len(meslekler)],
                      "seviye": rnd.choice(["stone", "stone", "iron", "gold", "emerald"])})
    return sonuc


def hanedan(evler=None, zisa_acisi=180.0):
    """Butun yerlesim. Donus: (bloklar, bilgi)."""
    rnd = random.Random(TOHUM)
    d = Dunya()
    yollar = zemin_ve_yollar(d, rnd)
    tepe(d, rnd)
    merdiven(d)
    ana_yapi(d, rnd)
    oda = savas_odasi(d)
    sur_hucre = sur(d, rnd)
    fener_hucre = fener_direkleri(d, yollar)
    yasak = set(yollar) | sur_hucre | _komsu(fener_hucre, 1)
    bilgi = {"evler": [], "savas_odasi": oda}
    # Zisa'nin evi: batida, orta halkada; bati sokagi kapisinin onunde biter.
    # Part 2'de Baris dogudaki gedige sokaklardan kosarak gidiyor.
    z = ev_yerlestir(d, zisa_evi(), zisa_acisi, ORTA_EV_HALKASI, (0, -1), lo=ORTA_YOL[1] + 2,
                     hi=DIS_YOL[0] - 2, yasak=yasak)
    if z is None:
        raise RuntimeError("Zisa'nin evi orta halkaya sigmadi")
    yasak |= _komsu(z["hucreler"], 1)
    bilgi["zisa"] = {"aci": zisa_acisi, "yaricap": round(z["r"], 3), "uzak": round(z["uzak"], 3),
                     "on": list(z["on"]), "hucreler": sorted(list(c) for c in z["hucreler"])}
    tipler = (evleri_oku() if evler is None else evler) or el_evleri()
    ic_liste = [e for e in tipler if e["ad"] not in DIS_HALKA_TIPLERI] or tipler
    def karisik_liste(tohum, tarlali):
        """Butun tipler karisik; tarlali ise her TARLA_SIKLIGI. yer tarla
        (tarlalar yerlesimin kenarinda: yalniz dis halka)."""
        karisik = list(tipler)
        random.Random(tohum).shuffle(karisik)
        liste = []
        for i, e in enumerate(karisik * 2):
            liste.append(e)
            if tarlali and (i + 1) % (TARLA_SIKLIGI - 1) == 0:
                liste.append(tarlalar()[(i // (TARLA_SIKLIGI - 1)) % len(EKINLER)])
        return liste
    random.Random(TOHUM + 2).shuffle(ic_liste)
    halka_diz(d, ic_liste, IC_EV_HALKASI, IC_YOL[1] + 2, ORTA_YOL[0] - 2,
              _yaylar(ANA_SOKAKLAR + ARA_SOKAKLAR, IC_EV_HALKASI), yasak, bilgi, "ic", [0])
    halka_diz(d, karisik_liste(TOHUM + 1, False), ORTA_EV_HALKASI, ORTA_YOL[1] + 2, DIS_YOL[0] - 2,
              _yaylar([a for a in ANA_SOKAKLAR if a != 180] + list(ARA_SOKAKLAR), ORTA_EV_HALKASI),
              yasak, bilgi, "orta", [0])
    halka_diz(d, karisik_liste(TOHUM + 3, True), DIS_EV_HALKASI, DIS_YOL[1] + 2, None,
              _yaylar([a for a in ANA_SOKAKLAR if a != 180] + list(ARA_SOKAKLAR) + list(DIS_ARA_SOKAKLAR),
                      DIS_EV_HALKASI), yasak, bilgi, "dis", [0])
    yerlesen = [{"on": z["on"], "kapilar": z["kapilar"]}] + bilgi["evler"]
    patika = kapi_yollari(d, yerlesen, yollar)
    ev_hucre = set(map(tuple, bilgi["zisa"]["hucreler"]))
    for e in bilgi["evler"]:
        ev_hucre |= set(map(tuple, e["hucreler"]))
    bilgi["agaclar"] = agaclar(d, rnd, ev_hucre, yollar | patika)
    bilgi["koyluler"] = koylu_yerlestir(d, rnd, yollar | patika, bilgi["evler"])
    bilgi["cicek"] = cicekler(d, rnd, {(int(k["p"][0]), int(k["p"][2])) for k in bilgi["koyluler"]})
    bilgi["yollar"] = sorted(list(c) for c in yollar)
    bilgi["patika"] = len(patika)
    return d.bloklar(), bilgi
