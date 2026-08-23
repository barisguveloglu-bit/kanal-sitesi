#!/usr/bin/env python3
"""OYUNCU SKINI -- "Uzak Akraba"  (v4.57)

Bu dosya PAKETIN PARCASI DEGIL. Bedrock'ta oyuncu skini
add-on'la gelmiyor; oyuncu kendi profilinden ice aktariyor.
Burada uretilen tek sey bir 64x64 PNG.

---- NEREDEN GELDI ----
Kullanici Code-Man'den (Minecraft Creepypasta Wiki) esinlenmek
istedi ama "birebir ayni olmasin" dedi. Wiki'deki skin olculdu:
tamamen siyah govde, uzerinde kan kirmizisi damarlar
(#740001, #860019, #871018), sirtan kirmizi bir yuz.

Alinan: siyah govde + parlak damar deseni.
Alinmayan: kirmizi. Kullanici hikayede Code-Man'in DUSMANI --
ayni rengi tasimasi yanlis olurdu.

---- NEDEN TURKUAZ ----
Kullanicinin "mavi turkuaz vardi" dedigi sey aslinda BIZIM
modumuzdan: Hiperoksin icince goz mavi oluyor (140,210,255).
Ustelik dismont cevheri de ayni aileden (#4aedd9, vanilla
elmastan olculmus).

Yani turkuaz uydurma bir tercih degil, modun kendi rengi.
Sonuc: ayni karanlik govde, ters isik.

---- GOZLER: TEK KRITIK NOKTA ----
Goz kaplamasi (iksir icince degisen goz) kafanin SU
piksellerine biniyor:  y = GOZ_SATIR,  x = GOZ_SUTUNLAR
Bu degerler kol_uret.py'den IMPORT EDILIYOR, elle yazilmiyor.
Skin'in gozu baska bir satirdaysa iksir gozu havada duruyor ve
sebebi hic anlasilmiyor -- v4.2'de tam bu yasandi, iki surum
surdu.

Skin'in kendi gozu de turkuaz: iksir icilmediginde bile
"gozunde bir sey var" hissi kaliyor, icince rengi degisiyor.

Calistirmak icin:  python3 skin_uret.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kol_uret import GOZ_SATIR, GOZ_SUTUNLAR, png_yaz, golge

CIKTI = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "UzakAkraba_skin.png")

# ---- Palet ----
# Code-Man'in siyahi kadar koyu ama tam siyah degil: mutlak
# siyah oyunda hacmi yok ediyor, karakter duz bir siluete
# donuyor.
KOYU      = (10, 10, 13)
DAHA_KOYU = (6, 6, 8)
GRI       = (22, 24, 27)

# Turkuaz kademe -- dismont cevheriyle AYNI degerler.
DAMAR_KOY = (20, 94, 83)      # #145e53  elmasin en koyu tonu
DAMAR     = (32, 197, 181)    # #20c5b5
DAMAR_ISK = (74, 237, 217)    # #4aedd9  ana elmas
GOZ       = (140, 210, 255)   # Hiperoksin'in goz rengi

# ---- 64x64 oyuncu skini duzeni ----
# (x1, y1, x2, y2) dahil. Ikinci katman (sapka/ceket/kol
# kaplamalari) BOS birakiliyor: ayni renkle doldurulunca
# karakter sismis gorunuyor.
BIRINCI_KATMAN = [
    (8, 0, 15, 7),     (16, 0, 23, 7),    (0, 8, 31, 15),     # kafa
    (4, 16, 7, 19),    (8, 16, 11, 19),   (0, 20, 15, 31),    # sag bacak
    (20, 16, 27, 19),  (28, 16, 35, 19),  (16, 20, 39, 31),   # govde
    (44, 16, 47, 19),  (48, 16, 51, 19),  (40, 20, 55, 31),   # sag kol
    (20, 48, 23, 51),  (24, 48, 27, 51),  (16, 52, 31, 63),   # sol bacak
    (36, 48, 39, 51),  (40, 48, 43, 51),  (32, 52, 47, 63),   # sol kol
]

# Gorunen on yuzler -- damarlar buraya ciziliyor.
GOVDE_ON   = (20, 20)   # 8 genis, 12 yuksek
SAG_KOL_DIS = (40, 20)  # 4 genis, 12 yuksek
SOL_KOL_DIS = (44, 52)
SAG_KOL_ON  = (44, 20)  # onden bakinca gorunen yuz
SOL_KOL_ON  = (36, 52)
KAFA_ON    = (8, 8)


def taban():
    """Govdenin tamami: koyu, hafif benekli. Duz tek renk
    plastik gorunuyor; benek hacim veriyor."""
    px = {}
    for (x1, y1, x2, y2) in BIRINCI_KATMAN:
        for x in range(x1, x2 + 1):
            for y in range(y1, y2 + 1):
                n = (x * 7 + y * 13) % 7
                px[(x, y)] = (DAHA_KOYU if n < 2 else
                              GRI if n > 5 else KOYU) + (255,)
    return px


def damar_ciz(px, kok, desen, renkler):
    """ASCII desen govdeye basiliyor. Sekli gozle gormek
    piksel listesinden cok daha kolay -- dismont dokusunda da
    ayni yol kullanildi."""
    ox, oy = kok
    for j, satir in enumerate(desen):
        for i, c in enumerate(satir):
            if c in renkler:
                px[(ox + i, oy + j)] = renkler[c] + (255,)


def skin():
    px = taban()
    R = {"o": DAMAR_KOY, "x": DAMAR, "X": DAMAR_ISK}

    # ---- YUZ ----
    # Code-Man'in yuzu sirtiyor. Bunda AGIZ YOK -- kullanicinin
    # hikayesinde o "uzak duran" taraf; sirtan bir yuz yanlis
    # karakteri anlatirdi. Geriye sadece gozler kaliyor.
    yuz = [
        "........",
        "........",
        "..o..o..",
        "........",
        "........",
        "........",
        "........",
        "........",
    ]
    damar_ciz(px, KAFA_ON, yuz, R)

    # Gozler EN SON, cunku uzerine hicbir sey binmemeli.
    # Satir ve sutunlar kol_uret.py'den geliyor.
    for sol, sag in GOZ_SUTUNLAR:
        for x in (sol, sag):
            px[(x, GOZ_SATIR)] = GOZ + (255,)

    # ---- GOVDE ----
    # Ortadan asagi inen bir hat, gogsun ustunde catallaniyor.
    # Code-Man'in damar deseninin ayni fikri, baska cizim.
    govde = [
        "..o..o..",
        ".ox..xo.",
        "..X..X..",
        "...xx...",
        "...XX...",
        "...xx...",
        "..x..x..",
        ".o....o.",
        "..o..o..",
        "........",
        "...oo...",
        "........",
    ]
    damar_ciz(px, GOVDE_ON, govde, R)

    # ---- KOLLAR ----
    # Dis yuzlerde ince birer hat: karakter yandan da okunuyor.
    kol = [
        "..o.",
        ".ox.",
        ".xX.",
        ".Xx.",
        ".x..",
        ".o..",
        "..o.",
        "..x.",
        "..X.",
        "..x.",
        "..o.",
        "....",
    ]
    damar_ciz(px, SAG_KOL_DIS, kol, R)
    # Sol kolda desen AYNALANIYOR, yoksa iki kol birebir ayni
    # duruyor ve goze carpiyor.
    kol_ayna = ["".join(reversed(s)) for s in kol]
    damar_ciz(px, SOL_KOL_DIS, kol_ayna, R)

    # ON yuzlere de ince bir iz: karakter cogu zaman ONDEN
    # goruluyor ve sadece dis yuze cizince kollar bombos
    # kaliyordu (ilk onizlemede tam bu goruldu).
    kol_on = [
        "....",
        "..o.",
        "..x.",
        "..X.",
        "..x.",
        "..o.",
        "....",
        ".o..",
        ".x..",
        ".X..",
        ".o..",
        "....",
    ]
    damar_ciz(px, SAG_KOL_ON, kol_on, R)
    damar_ciz(px, SOL_KOL_ON, ["".join(reversed(s)) for s in kol_on], R)

    return px


def main():
    png_yaz(CIKTI, 64, 64, skin())
    print("uretildi:", CIKTI)
    print("goz satiri:", GOZ_SATIR, "sutunlar:", GOZ_SUTUNLAR)
    print()
    print("Minecraft'a eklemek icin:")
    print("  Profil -> Klasik Skinler -> Sahip Olunan -> Yeni Skin Ice Aktar")
    print("  Model: Steve (kalin kol)")


if __name__ == "__main__":
    main()
