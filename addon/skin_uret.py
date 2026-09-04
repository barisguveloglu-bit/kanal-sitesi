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

---- HASAR: KARAKTERIN KENDI HIKAYESI  (v7.10) ----
Kullanici skinin hikayeyi tasimasini istedi, kendi sozleriyle:

  "hapsedildi ... normale gore daha zayif olmasi gerekiyor
   zamaninda chris1545 tarafindan boralo zehirlenmis ve bir ay
   boyunca yarim sekilde kalmisti zaten dosyayi incelersin nasil
   yarim kaldigini gorebiliyorsun sonra tam vucut haline kavustu
   ... o gozdeki detaylari bana da ekle yani ben bayagi bir
   hasar almis sekilde olayim"

Bes cumle, bes ayri iz. Hicbiri "hasarli dursun" diye
serpistirilmedi; her birinin dosyada bir dayanagi var:

  1. HAPSEDILDI   -> bilek ve ayak bileginde PRANGA halkasi.
     Halka seridin TAMAMINA ciziliyor (dort yuz birden), yoksa
     yandan bakinca kayboluyor. Demir icin yeni renk
     uydurulmadi, paletteki GRI/DAHA_KOYU kullanildi.

  2. BIR AY YARIM KALDI -> KAVUSMA IZI. Nereye cizilecegi
     tahmin edilmedi: kullanici "dosyayi incelersin nasil yarim
     kaldigini gorebiliyorsun" dedi ve dosya bunu gercekten
     soyluyor -- kolsuz surumde silinen bolge KOL_BOLGELERI.
     Dikis tam o bolgenin ust kenarina, govdede de karsisina
     ciziliyor. Kutular tek yerde yazili, iz onlardan turetiliyor.

  3. BORALO ZEHIRI (chris1545) -> damarlarin bir kismi kirmizi.
     Renk OLCULDU, uydurulmadi: chris1545'in kanli kol dokusunda
     (kns_kolluk_chris_kanli.png, 256x256) en cok kullanilan uc
     opak renk sayildi -- (73,0,0) 13710, (186,9,9) 10078,
     (142,0,0) 9359 piksel. Yani zehir, onu getiren kolun
     rengini tasiyor; bugun taktigi Kanli Kol da ayni doku.

  4. DAHA ZAYIF -> turkuaz damarlar SONDU. Parlak kademe
     (DAMAR_ISK) govdede artik yok, orta kademe seyreldi,
     gogsun ortasindaki hat KIRILDI. Yeni bir sey eklenmedi;
     olan azaltildi -- "zayif" tam olarak bu.

  5. BAYAGI HASAR -> sirtta kirbac izleri, yuzde catlak.
     Sirt bugune kadar bombostu; hikayenin yazilacak yeri orasi.

  + O GOZDEKI DETAYLAR -> asagida, goz_detaylari().

Sirt/yuz izleri disinda hicbiri serbest cizim degil; kutulardan
ve olculmus renklerden turetiliyor.

Calistirmak icin:  python3 skin_uret.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kol_uret import GOZ_SATIR, GOZ_SUTUNLAR, png_yaz, golge

CIKTI = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "UzakAkraba_skin.png")
# Kanli Kol icin kolsuz surum (v7.5). Ayni skin, kollari
# saydam.
CIKTI_KOLSUZ = CIKTI.replace(".png", "_kolsuz.png")

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


def kaynastir(a, b, oran):
    """Iki rengi karistirir.

    Yara/hale gibi ARA tonlar icin yeni renk UYDURULMUYOR:
    palette zaten olan iki renkten hesaplaniyor. Boylece palet
    degisirse turevleri de kendiliginden degisiyor."""
    return tuple(int(round(a[i] + (b[i] - a[i]) * oran)) for i in range(3))


# ---- ZEHIR  (v7.10) ----
# "chris1545 tarafindan boralo zehirlenmis."
# OLCULDU, uydurulmadi: chris1545'in kanli kol dokusunda
# (Simsek_Kol_Kaynak/textures/entity/kns_kolluk_chris_kanli.png)
# en cok kullanilan uc OPAK renk sayildi:
#     (73,0,0) 13710 px   (186,9,9) 10078 px   (142,0,0) 9359 px
# Turkuazin kademelendigi gibi bunlar da koyu -> orta -> parlak
# diziliyor. Zehir, onu getiren kolun rengini tasiyor.
ZEHIR_KOY = (73, 0, 0)
ZEHIR     = (142, 0, 0)
ZEHIR_ISK = (186, 9, 9)

# Yara dokusu: ten ile zehir arasi. Ayri bir renk secilmedi.
YARA      = kaynastir(KOYU, ZEHIR_KOY, 0.55)
YARA_ACIK = kaynastir(KOYU, ZEHIR, 0.55)

# Demir (pranga). Palette metal tonu YOKTU: en acik notr GRI ve
# o da tabandan ancak 12 birim ayrilıyor, yani pranga govdeye
# karisip lekeye donuyordu (v7.10 ilk render'inda tam bu
# goruldu). Yeni renk secilmedi, GRI notr olarak acildi.
DEMIR     = kaynastir(GRI, (255, 255, 255), 0.27)
DEMIR_KOY = kaynastir(GRI, (255, 255, 255), 0.12)

# ---- SONMUS GOZ  (v7.23) ----
# Kullanici: "bir gozunden yarali, yeni hasar almis halim."
# Yeni renk UYDURULMADI: gozun kendi rengi zehre dogru
# cekildi. Iki kademe var cunku goz TAMAMEN sonmedi --
# birinde isik bitti, otekinde titriyor.
GOZ_OLU    = kaynastir(GOZ, ZEHIR_KOY, 0.72)
GOZ_YARIM  = kaynastir(GOZ, ZEHIR_KOY, 0.38)

# Gozun cevresi -- bkz. goz_detaylari().
GOZ_HALE   = kaynastir(KOYU, GOZ, 0.30)
GOZ_SACAK  = kaynastir(KOYU, GOZ, 0.58)
GOZ_KHALE  = kaynastir(KOYU, ZEHIR, 0.45)      # zehirli gozun halesi
GOZ_KSACAK = kaynastir(KOYU, ZEHIR_ISK, 0.72)

# ---- 64x64 oyuncu skini duzeni ----
# (x1, y1, x2, y2) dahil. Ikinci katman (sapka/ceket/kol
# kaplamalari) BOS birakiliyor: ayni renkle doldurulunca
# karakter sismis gorunuyor.
# ---- KOLLAR AYRI TUTULUYOR  (v7.5) ----
# Kullanici: "ben kolluyum ya skinde, onu kolsuz hale
# getirebilir misin, iki kolu da olmayan sekilde -- cunku bu
# kanli kollar bir garip oluyor."
#
# Kaynak modun KENDI uyarisi da bunu soyluyor; Code-Man
# paketinin dil dosyasindan, oldugu gibi:
#   "bobby1545's Red Bloody Arms
#    (Kolun Duzgun Calismasi Icin Skininizin Kolsuz Olmasi
#     Lazimdir!)"
# Yani kolsuz skin bizim bulusumuz degil, kaynagin sarti.
#
# Kol kutulari BURADA tek kez yazili ve hem normal skine hem
# de kolsuz surume ayni yerden gidiyor. Iki ayri listede
# tutulsaydi biri degisip oteki kalirdi.
SAG_KOL_KUTU = [(44, 16, 47, 19),  (48, 16, 51, 19),  (40, 20, 55, 31)]
SOL_KOL_KUTU = [(36, 48, 39, 51),  (40, 48, 43, 51),  (32, 52, 47, 63)]

# Ikinci katman (kol kaplamalari). Bu betik onlari zaten
# CIZMIYOR, ama kolsuz surumde yine de siliniyor: ileride
# birisi kaplama eklerse kolsuz skin sessizce kollu olurdu.
SAG_KOL_KAPLAMA = [(44, 32, 47, 35), (48, 32, 51, 35), (40, 36, 55, 47)]
SOL_KOL_KAPLAMA = [(52, 48, 55, 51), (56, 48, 59, 51), (48, 52, 63, 63)]

KOL_BOLGELERI = (SAG_KOL_KUTU + SOL_KOL_KUTU
                 + SAG_KOL_KAPLAMA + SOL_KOL_KAPLAMA)

# Govde ve bacaklar da kutu kutu adlandirildi (v7.10): hasar
# izleri bu kutulardan TURETILIYOR, ayri koordinat yazilmiyor.
# Her uclu ayni sirada: ust kapak, alt kapak, dort yuzu birden
# tasiyan SERIT. Izler hep seride ciziliyor -- yalniz on yuze
# cizilen bir halka yandan bakinca kayboluyor.
KAFA_KUTU      = [(8, 0, 15, 7),    (16, 0, 23, 7),   (0, 8, 31, 15)]
SAG_BACAK_KUTU = [(4, 16, 7, 19),   (8, 16, 11, 19),  (0, 20, 15, 31)]
GOVDE_KUTU     = [(20, 16, 27, 19), (28, 16, 35, 19), (16, 20, 39, 31)]
SOL_BACAK_KUTU = [(20, 48, 23, 51), (24, 48, 27, 51), (16, 52, 31, 63)]

BIRINCI_KATMAN = (KAFA_KUTU + SAG_BACAK_KUTU + GOVDE_KUTU
                  + SOL_BACAK_KUTU + SAG_KOL_KUTU + SOL_KOL_KUTU)

# Izlerin dayandigi tek kaynak. Elle koordinat yazilmiyor:
# yukaridaki listeler degisirse burasi da degisir.
SAG_KOL_UST,   _, SAG_KOL_SERIT   = SAG_KOL_KUTU
SOL_KOL_UST,   _, SOL_KOL_SERIT   = SOL_KOL_KUTU
_,             _, GOVDE_SERIT     = GOVDE_KUTU
_,             _, SAG_BACAK_SERIT = SAG_BACAK_KUTU
_,             _, SOL_BACAK_SERIT = SOL_BACAK_KUTU

# Gorunen on yuzler -- damarlar buraya ciziliyor.
GOVDE_ON   = (20, 20)   # 8 genis, 12 yuksek
SAG_KOL_DIS = (40, 20)  # 4 genis, 12 yuksek
SOL_KOL_DIS = (44, 52)
SAG_KOL_ON  = (44, 20)  # onden bakinca gorunen yuz
SOL_KOL_ON  = (36, 52)
KAFA_ON    = (8, 8)
GOVDE_ARKA = (32, 20)   # v7.10'a kadar BOMBOStu


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


def damar_ciz(px, kok, desen, renkler, en=None):
    """ASCII desen govdeye basiliyor. Sekli gozle gormek
    piksel listesinden cok daha kolay -- dismont dokusunda da
    ayni yol kullanildi.

    `en` verilirse her satirin uzunlugu KONTROL EDILIYOR. Bir
    satirda tek karakter eksik/fazla olunca desen sessizce
    kayiyor ve sebebi ancak render'a bakinca anlasiliyor
    (v7.10'da tam bunun icin eklendi)."""
    ox, oy = kok
    for j, satir in enumerate(desen):
        if en is not None and len(satir) != en:
            raise ValueError("desen satiri %d: %d karakter, %d bekleniyordu "
                             "(%r)" % (j, len(satir), en, satir))
        for i, c in enumerate(satir):
            if c in renkler:
                px[(ox + i, oy + j)] = renkler[c] + (255,)


def serit_ciz(px, kutu, satirlar, boya):
    """Bir SERIDIN belirli satirlarini bastan sona boyar.

    Satirlar kutunun UST kenarina gore sayiliyor, mutlak y
    olarak degil: kutu yer degistirirse iz de birlikte gider.
    `boya(i, j)` None dondururse o piksele dokunulmuyor."""
    x1, y1, x2, y2 = kutu
    for j in satirlar:
        y = y1 + j
        if not (y1 <= y <= y2):
            continue
        for x in range(x1, x2 + 1):
            renk = boya(x - x1, j)
            if renk:
                px[(x, y)] = renk + (255,)


# ---- 2. BIR AY YARIM KALDI: KAVUSMA IZI ----
# Kolun koptugu yer TAHMIN EDILMIYOR: kolsuz surumde silinen
# bolge KOL_BOLGELERI, onun ust kenari da kol seridinin ilk
# satirlari. Iz oradan turetiliyor.
DIKIS_SATIR = (0, 1)


def kavusma_izi(px):
    """Kollarin geri takildigi dikis + govdedeki karsiligi.

    Iki satir, cunku tek satir oyunda omuz kivriminda kayboluyor
    (kol seridinin ilk satiri yukari bakan yuze cok yakin).
    Govde tarafinda iz seridin TAMAMINA gidiyor: kol yalniz onden
    takilmadi."""
    def dikis(i, j):
        # Bir dolu bir bos: duz cizgi "boyanmis" duruyor, kesikli
        # olan dikis gibi okunuyor.
        if (i + j) % 2:
            return None
        return YARA_ACIK if (i // 2) % 3 == 0 else YARA

    for serit in (SAG_KOL_SERIT, SOL_KOL_SERIT):
        serit_ciz(px, serit, DIKIS_SATIR, dikis)

    # Govde tarafi: iz gogsu bastan basa GECMEMELI, kol govdenin
    # YANINDAN takiliyor. Ilk render'da butun serit boyanmisti ve
    # yaka gibi duruyordu.
    #
    # 24 piksellik govde seridinin duzeni (Bedrock/Java klasik):
    #   0-3   sag yan | 4-11  on | 12-15 sol yan | 16-23 arka
    # Iz iki yan yuzun TAMAMI + on/arka yuzlerin dis iki sutunu.
    def omuz(i, j):
        yan = i < 4 or 12 <= i < 16
        dis = i in (4, 5, 10, 11, 16, 17, 22, 23)
        return dikis(i, j) if (yan or dis) else None

    serit_ciz(px, GOVDE_SERIT, DIKIS_SATIR, omuz)

    # Kolun UST kapagi: kesit. Kol oradan koptu, orasi tamamen
    # yara dokusu.
    for ust in (SAG_KOL_UST, SOL_KOL_UST):
        serit_ciz(px, ust, range(4),
                  lambda i, j: YARA_ACIK if (i + j) % 3 == 0 else YARA)


# ---- 1. HAPSEDILDI: PRANGA ----
# Bilek/ayak bilegi halkasi. Serit 12 satir; 8-9 el ve ayagin
# hemen ustu.
PRANGA_SATIR = (8, 9)
TAHRIS_SATIR = (10,)


def pranga(px):
    """Dort uzuvda da demir halka + altinda tahris izi.

    Demir icin yeni renk uydurulmadi: paletteki GRI ve
    DAHA_KOYU. Halka DAMARLARIN USTUNE ciziliyor -- turkuaz hat
    demirin altinda kesiliyor, istenen bu."""
    def demir(i, j):
        # Ust satir halkanin isik alan yuzu, alt satir golgesi;
        # perc delikleri dortte bir.
        # Iki ton da SADECE prangada kullaniliyor; tabanda
        # gecmiyorlar. Halkanin tamami boylece sayilabiliyor --
        # golge satirinda DAHA_KOYU kullanildiginda o pikseller
        # tabandan ayirt edilemiyordu ve halka delik delik
        # gorunuyordu.
        if j == PRANGA_SATIR[0]:
            return DEMIR_KOY if i % 4 == 0 else DEMIR   # perc deligi
        return DEMIR if i % 4 == 2 else DEMIR_KOY       # golge

    def tahris(i, j):
        return ZEHIR_KOY if i % 5 == 1 else None

    for serit in (SAG_KOL_SERIT, SOL_KOL_SERIT,
                  SAG_BACAK_SERIT, SOL_BACAK_SERIT):
        serit_ciz(px, serit, PRANGA_SATIR, demir)
        serit_ciz(px, serit, TAHRIS_SATIR, tahris)


# ---- "O GOZDEKI DETAYLAR" ----
def goz_detaylari(px):
    """Goz kaplamasinin anatomisi 64x64'e indiriliyor.

    kol_uret.py'deki goz_dokusu() dort kat ciziyor: dolu
    cekirdek, ustunden yukselen sacak, cevredeki hale, altina
    sizan isik. Skinde bugune kadar SADECE cekirdek vardi --
    goz basina iki piksel. Iksir icilmediginde goz olu
    duruyordu; kullanicinin "o gozdeki detaylari bana da ekle"
    dedigi eksik buydu.

    64x64'te alt piksel yok, o yuzden dort kat dort KOMSU
    piksele iniyor. Sira kaplamadakiyle ayni: once hale, sonra
    sacak ve sizinti, cekirdek EN SON (uzerine hicbir sey
    binmemeli).

    Satir/sutun yine kol_uret.py'den geliyor. Elle yazilan tek
    sayi yok -- v4.2'de goz iki satir kaymisti ve iki surum
    boyunca sebebi anlasilmamisti.

    ZEHIRLI GOZ: GOZ_SUTUNLAR[0] (dosyanin kendi adlandirmasiyla
    "sol goz") kanli hale tasiyor, obur goz temiz. CekirDEKLERIN
    IKISI DE turkuaz kaliyor: zehir govdeyi aldi, isigini
    almadi. Ayrica iksir goz kaplamasi cekirdegin uzerine
    biniyor; iki gozun cekirdegi ayrilsaydi kaplama takilinca
    ortadan kalkardi."""
    for i, (sol, sag) in enumerate(GOZ_SUTUNLAR):
        zehirli = (i == 0)
        hale = GOZ_KHALE if zehirli else GOZ_HALE
        sacak = GOZ_KSACAK if zehirli else GOZ_SACAK

        # 3. hale -- cekirdegin USTU ve ALTI.
        #    Ilk denemede yanlara da tasiyordu: goz 4x3 oluyor,
        #    8 piksel genisligindeki yuzun yarisini kapliyordu ve
        #    goz degil pencere gibi duruyordu.
        for x in (sol, sag):
            for y in (GOZ_SATIR - 1, GOZ_SATIR + 1):
                px[(x, y)] = hale + (255,)
        #    Tek yanda bir parilti: iki yana da konunca goz
        #    genisliyor, tek yanda kalinca hacim veriyor.
        px[(sol - 1, GOZ_SATIR)] = hale + (255,)

        # 2. sacak -- USTTEN yukseliyor
        px[(sol, GOZ_SATIR - 1)] = sacak + (255,)

        # 5. alta sizan isik -- kaplamada da asagi siziyor,
        #    cunku gozun ustu sac, alti duz ten.
        px[(sag, GOZ_SATIR + 1)] = sacak + (255,)

        # 1. cekirdek EN SON
        for x in (sol, sag):
            px[(x, GOZ_SATIR)] = GOZ + (255,)


# ---- 4. BIR GOZUNDEN YARALI  (v7.23) ----
# Kullanici: "hasar almis halim... mesela bir gozunden yarali,
# yeni hasar almis halim o sekilde olacak."
#
# ---- NEDEN CEKIRDEK ARTIK AYRILIYOR ----
# v7.10'da iki gozun cekirdegi de bilerek turkuaz birakilmisti
# ve gerekcesi yaziliydi: "iksir goz kaplamasi cekirdegin
# uzerine biniyor; iki gozun cekirdegi ayrilsaydi kaplama
# takilinca ortadan kalkardi."
#
# O gerekce YANLIS DEGIL ama TAM DEGILDI: kaplama yalniz iksir
# ACIKKEN biniyor. Iksir icilmedigi zamanlarda -- yani vaktin
# cogunda -- gozler skinden okunuyor ve fark orada goruluyor.
# Yani kaybedilen sey "iksirliyken iki goz ayni gorunur";
# kazanilan sey "iksirsizken bir gozu sonmus". Kullanicinin
# istedigi ikincisi.
#
# ---- HANGI GOZ ----
# GOZ_SUTUNLAR[0] -- zaten kanli haleyi tasiyan goz. Yara ikinci
# bir yere degil, hasarin ZATEN oldugu yere biniyor; iki ayri
# gozu yaralamak "iki kez dovulmus" gibi okunurdu.
YARA_SIZINTI = 2          # gozden asagi kac piksel siziyor


def goz_yarasi(px):
    """Sonmus goz + kastan gecen yarik + asagi sizan iz.

    goz_detaylari()'ndan SONRA cagriliyor: hale ve sacak alta
    kaliyor, yara ustune biniyor. Ters sirada cizilseydi hale
    yarayi orterdi."""
    sol, sag = GOZ_SUTUNLAR[0]

    # Kastan gecen yarik -- gozun USTUNDEN geliyor, yani darbe
    # yukaridan. Iki piksel: tek piksel yara degil ben gibi
    # duruyor.
    # Ustteki piksel ZEHIR_ISK, alttaki YARA_ACIK. Kullanicinin
    # sozu "YENI hasar almis halim" -- taze bir yara govdedeki
    # eski izlerden daha parlak olur. Butun izler ayni tonda
    # olsaydi bu yara da eskilerden biri gibi okunurdu.
    px[(sol, GOZ_SATIR - 2)] = ZEHIR_ISK + (255,)
    px[(sol, GOZ_SATIR - 1)] = YARA_ACIK + (255,)

    # Cekirdek. IKI PIKSEL AYRI: biri olu, oteki yarim. Ikisi de
    # olu olsaydi goz kapali gorunurdu -- istenen "kor" degil
    # "YARALI".
    px[(sol, GOZ_SATIR)] = GOZ_OLU + (255,)
    px[(sag, GOZ_SATIR)] = GOZ_YARIM + (255,)

    # Asagi sizan iz. Yanaktan iniyor, gozun ALTINDAN degil
    # KENARINDAN: tam altindan inseydi gozyasi gibi okunurdu.
    for n in range(1, YARA_SIZINTI + 1):
        px[(sol, GOZ_SATIR + n)] = (ZEHIR_KOY if n == 1
                                    else YARA) + (255,)


# ---- 5. BOYUN PRANGASI  (v7.23) ----
# Bilek ve ayak bileginde halka vardi, boyunda yoktu. Hapsedilen
# birinin dort uzvu baglanip boynu serbest kalmaz.
#
# Kafanin serit kutusunun SON satiri: kafanin alt kenari, yani
# boyun hizasi. Sayi elle yazilmiyor, kutunun boyundan
# hesaplaniyor -- kutu degisirse halka da birlikte gider.
KAFA_SERIT = KAFA_KUTU[2]


def boyun_prangasi(px):
    """Kafanin dibinde demir halka. pranga()'nin `demir`
    boyasiyla AYNI desen: ayni zindanin ayni demiri."""
    x1, y1, x2, y2 = KAFA_SERIT
    son = y2 - y1                      # seridin son satiri

    def demir_boyun(i, j):
        # Bilek prangasindan KOYU. Sebep olcum: bilek halkasi iki
        # satir (isik + golge), bu tek satir. Ayni parlak tonu tek
        # satira koyunca halka demir gibi degil BEYAZ BIR BANT
        # gibi okunuyordu -- ilk render'da yuzun altinda atki
        # gibi duruyordu. Simdi taban koyu, parilti dortte bir.
        return DEMIR if i % 4 == 1 else DEMIR_KOY

    serit_ciz(px, KAFA_SERIT, (son,), demir_boyun)


# ---- 6. KIRBAC IZLERI  (v7.23) ----
# Sirtta zaten vardi; bacaklarda ve govdenin YAN yuzlerinde
# yoktu. Onden bakinca hasar govde deseninden ibaret kaliyordu.
#
# Izler sozde-rastgele ama SABIT: her uretimde ayni yere
# dusuyorlar. Lineer bir ifade (i*3+j*5)%7 gibi bir sey
# KAFES uretiyor -- bu depoda uc kez yasandi (agac dokusu,
# aura sprite'i, goz). O yuzden karistirici bir hash.
def _iz_zar(x, y, tuz):
    h = (x * 374761393 + y * 668265263 + tuz * 2246822519) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return (h ^ (h >> 16)) & 0xFF


def kirbac_izleri(px):
    """Bacaklara ve govdenin yan yuzlerine seyrek izler.

    SEYREK olmasi sart: yogun olunca giysi deseni gibi
    okunuyor (sirt deseninde ayni ders yazili). Yaklasik her
    besinci piksel."""
    # Bacaklar -- prangann USTU. Pranga 8-9, tahris 10; izler
    # 2..7 arasinda kaliyor ki demirle carpismasin.
    for tuz, serit in ((11, SAG_BACAK_SERIT), (23, SOL_BACAK_SERIT)):
        def iz(i, j, _t=tuz):
            z = _iz_zar(i, j, _t)
            if z > 226:
                return YARA_ACIK
            if z > 198:
                return YARA
            return None
        serit_ciz(px, serit, range(2, 8), iz)

    # Govdenin YAN yuzleri. Serit duzeni (Bedrock/Java klasik):
    #   0-3 sag yan | 4-11 on | 12-15 sol yan | 16-23 arka
    # On ve arkaya dokunulmuyor: onun deseni damar_ciz ile
    # ayrica yaziliyor, ustune iz basmak ikisini de bozar.
    def yan_iz(i, j):
        if not (i < 4 or 12 <= i < 16):
            return None
        z = _iz_zar(i, j, 37)
        if z > 222:
            return YARA_ACIK
        if z > 192:
            return YARA
        return None

    serit_ciz(px, GOVDE_SERIT, range(2, 11), yan_iz)


def skin():
    px = taban()
    # Turkuaz kademe + zehir kademesi + yara dokusu + demir.
    # Buyuk harf = parlak, kucuk = orta, "o"/"q" = koyu.
    R = {"o": DAMAR_KOY, "x": DAMAR, "X": DAMAR_ISK,
         "q": ZEHIR_KOY, "Q": ZEHIR, "!": ZEHIR_ISK,
         "-": YARA, "=": YARA_ACIK}

    # ---- IZLER DAMARLARDAN ONCE ----
    # Zehir dikisten SIZIYOR: dikis altta kalirsa damar deseni
    # onun uzerinden gecebiliyor. Pranga ise en sonda, cunku o
    # damari KESMELI.
    kavusma_izi(px)

    # ---- YUZ ----
    # Code-Man'in yuzu sirtiyor. Bunda AGIZ YOK -- kullanicinin
    # hikayesinde o "uzak duran" taraf; sirtan bir yuz yanlis
    # karakteri anlatirdi. Geriye sadece gozler kaliyor.
    #
    # v7.10: yuze catlak geldi. Bilerek ASIMETRIK ve goz
    # sutunlarindan uzak: simetrik olsaydi alt satirdaki iki iz
    # AGIZ gibi okunurdu, goz sutunlarina girseydi iksir goz
    # kaplamasinin altinda ezilirdi.
    yuz = [
        "=.......",
        "-.......",
        "=.......",
        "-.......",
        "........",
        "........",
        ".......=",
        "......-.",
    ]
    damar_ciz(px, KAFA_ON, yuz, R, en=8)

    # "O gozdeki detaylar" -- hale, sacak, sizinti, cekirdek.
    goz_detaylari(px)
    # ...ve v7.23: bir gozun sonmus hali. SONRA cagriliyor,
    # yoksa hale yaranin uzerine biner.
    goz_yarasi(px)

    # ---- GOVDE ----
    # Eski desen: ortadan asagi inen KESINTISIZ bir hat, gogsun
    # ustunde catallaniyordu.
    #
    # v7.10'da ayni desen ama:
    #   - parlak kademe (X) govdeden TAMAMEN kalkti  -> zayifladi
    #   - gogsun ortasindaki hat KIRILDI (5. satir)   -> zayifladi
    #   - omuzlardan (0-2. satir, iki kenar) zehir giriyor ve
    #     asagi indikce turkuazi yiyor: ust yari onun, alt yari
    #     zehrin.
    # Yani "daha zayif" icin yeni bir sey eklenmedi, olan
    # azaltildi.
    govde = [
        "........",
        "q.o..o.q",
        ".qx..xq.",
        "..X..X..",
        "...xx...",
        "...x!...",
        "..x..Q..",
        ".o....q.",
        "..o..q..",
        "...x....",
        "...oq...",
        "........",
    ]
    damar_ciz(px, GOVDE_ON, govde, R, en=8)

    # ---- SIRT ----
    # v7.10'a kadar BOMBOStu. "Bayagi hasar almis" en okunakli
    # burada duruyor: sirt tek parca, deseni bolen bir sey yok.
    # Izler capraz ve DUZENSIZ -- duzenli olsaydi giysi deseni
    # gibi gorunurdu.
    sirt = [
        "........",
        "=..=...=",
        ".=-..-=.",
        "..=-.=..",
        ".=..-=..",
        "=..=...=",
        "..=..-=.",
        ".=-....=",
        "...=-...",
        "..=...=.",
        "....-...",
        "........",
    ]
    damar_ciz(px, GOVDE_ARKA, sirt, R, en=8)

    # ---- KOLLAR ----
    # Dis yuzlerde ince birer hat: karakter yandan da okunuyor.
    #
    # v7.10: iki kol artik AYNALANMIYOR, ayri yazili. Sebebi
    # hikaye: zehiri getiren el birdi, ikisi ayni derecede
    # zehirlenmedi. SAG kol agir, SOL kol hafif. Ust iki satir
    # bos birakildi -- orasi kavusma dikisi.
    kol_sag = [
        "....",
        "....",
        ".qx.",
        ".!x.",
        ".x..",
        ".q..",
        "..Q.",
        "..!.",
        "..x.",
        "..q.",
        "..Q.",
        "....",
    ]
    damar_ciz(px, SAG_KOL_DIS, kol_sag, R, en=4)

    kol_sol = [
        "....",
        "....",
        ".xX.",
        ".Xx.",
        ".x..",
        ".o..",
        "..q.",
        "..x.",
        "..X.",
        "..x.",
        "..q.",
        "....",
    ]
    # Sol kolda desen AYNALANIYOR, yoksa iki kol birebir ayni
    # duruyor ve goze carpiyor.
    damar_ciz(px, SOL_KOL_DIS, ["".join(reversed(r)) for r in kol_sol], R,
              en=4)

    # ON yuzlere de ince bir iz: karakter cogu zaman ONDEN
    # goruluyor ve sadece dis yuze cizince kollar bombos
    # kaliyordu (ilk onizlemede tam bu goruldu).
    kol_on_sag = [
        "....",
        "....",
        "..q.",
        "..!.",
        "..q.",
        "....",
        ".Q..",
        ".q..",
        ".!..",
        "....",
        "....",
        "....",
    ]
    kol_on_sol = [
        "....",
        "....",
        "..o.",
        "..x.",
        "..X.",
        "..x.",
        "..o.",
        ".q..",
        ".x..",
        ".X..",
        ".q..",
        "....",
    ]
    damar_ciz(px, SAG_KOL_ON, kol_on_sag, R, en=4)
    damar_ciz(px, SOL_KOL_ON, ["".join(reversed(r)) for r in kol_on_sol], R,
              en=4)

    # ---- IZLER, SONRA DEMIR ----
    # Kirbac izleri damarlarin ustune, demir de izlerin ustune.
    # Sira onemli: demir en sert sey, hicbir sey onu kesmiyor.
    kirbac_izleri(px)
    pranga(px)
    boyun_prangasi(px)

    return px


def kolsuz(px):
    """Kol piksellerini SAYDAM yapar (silmez, saydamlar).

    Bedrock skinlerde alfasi sifir piksel cizilmiyor; kol
    kutusu modelde duruyor ama gorunmuyor. Kolu modelden
    cikarmak MUMKUN DEGIL -- skins.json yalniz
    humanoid.custom / customSlim kabul ediyor (bkz.
    kol_uret.py:SKIN_LISTE notu).                          """
    p = dict(px)
    for (x1, y1, x2, y2) in KOL_BOLGELERI:
        for x in range(x1, x2 + 1):
            for y in range(y1, y2 + 1):
                p.pop((x, y), None)
    return p


def main():
    temel = skin()
    png_yaz(CIKTI, 64, 64, temel)
    print("uretildi:", CIKTI)
    png_yaz(CIKTI_KOLSUZ, 64, 64, kolsuz(temel))
    print("uretildi:", CIKTI_KOLSUZ)
    print("goz satiri:", GOZ_SATIR, "sutunlar:", GOZ_SUTUNLAR)
    print()
    print("Minecraft'a eklemek icin:")
    print("  Profil -> Klasik Skinler -> Sahip Olunan -> Yeni Skin Ice Aktar")
    print("  Model: Steve (kalin kol)")


if __name__ == "__main__":
    main()
