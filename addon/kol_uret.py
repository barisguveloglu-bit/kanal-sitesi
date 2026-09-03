#!/usr/bin/env python3
"""Kol esyalarini, attachable'larini, dil dosyalarini ve yer tutucu
dokularini uretir. Tek kaynak burasi; sekiz dosyayi elle senkron
tutmaya calismak hataya davetiye.

Referans: add-ons.zip icindeki "En Iyi BoraLo Kol Modu V2".
Oradan alinan TEKNIK karar:
  - kok kemik adi "RightArm" (oyuncu iskeletindeki kemikle ayni ad;
    model boylece oyuncunun koluna oturuyor)
Model, doku ve yetenek mantigi bize ait.

Referansin ESYA formati alinmadi: o mod format_version 1.16.100 ve
run_command kullaniyor, ikisi de deneysel ayar gerektiriyor. Bizim
esyalarimiz kararli formatta (asagidaki esya() aciklamasina bak).
"""

import json, math, os, re, struct, zlib

BP = "/home/user/kanal-sitesi/addon/Simsek_TNT_ToprakTopu"
RP = "/home/user/kanal-sitesi/addon/Simsek_Kol_Kaynak"
# ---- SKIN PAKETI (v4.88) ----
# Kullanici: "bu yeni surume actigim zaman skin otomatik olarak
# bana geliyor mu".
#
# CEVAP: davranis/kaynak paketi oyuncu skinini DEGISTIREMEZ --
# Bedrock'ta script'ten skin atamanin yolu yok (referans mod bunu
# Java'da `mpm url @p <skin>` ile yapiyordu, o komut MorePlayer-
# Models'e bagli ve Bedrock'ta karsiligi yok).
#
# AMA Bedrock'un kendi SKIN PAKETI turu var: iceri aktarilinca
# skin dogrudan Giyinme Odasi'na dusuyor, oradan tek dokunusla
# secilebiliyor. Otomatik degil ama tek dokunus.
#
# Bicim tahmin degil: Microsoft'un "Skin Pack JSON Formatting and
# Localization Reference" belgesinden alindi.
#   geometry.humanoid.custom      Steve modeli (4 piksel kol)
#   geometry.humanoid.customSlim  Alex modeli (3 piksel kol)
# Bizim skinimiz klasik 64x64 duzeninde ve kollari 4 piksel,
# yani "custom".
# ---- OYUNCU MODELI PAKETI (v4.90) ----
# Kullanici: "ama kanka bunu yapiyorlar mobilde nasil yapiyorlar...
# tum yontemleri bul... bir tane mod yuklemistim sen orada var
# demistin, onu yapacagiz, kararliyim."
#
# HAKLIYDI. Yontem SKIN degil, OYUNCU ISTEMCI TANIMINI EZMEK.
# Kanit uydurma degil: kullanicinin daha once yukledigi DORT
# pakette de ayni sey var --
#   ses/Boralo Mod V2, boralo_canli/YeniBoraLoV3_RP,
#   yeni_modlar/GuneyLo_Nitroxin, yeni_modlar/DistortedB
# Hepsi entity/player.entity.json'u eziyor ve sunu yapiyor:
#
#   geometry:        "elharkos": "geometry.elharkos"      <- EK model
#   pre_animation:   variable.elharkos =
#                      query.get_equipped_item_name('main_hand') == 'elharkos';
#   render_controllers: {"controller.render.elharkos": "variable.elharkos"}
#
# Yani ELDEKI ESYAYA gore oyuncuya FAZLADAN bir geometri
# ciziliyor. Resmi istemcide, mobilde calisiyor -- kullanici bu
# paketleri kendi tabletinde calistirdi.
#
# Bizim farkimiz: onlar asa/silah EKLIYOR, biz GOVDEYI
# DEGISTIRIYORUZ. Bunun icin bir adim daha gerekiyor: vanilla
# ucuncu sahis denetleyicisini KAPATMAK
#   "...&& !variable.o_sey"
# yoksa oyuncunun kendi bedeni O Sey'in icinde kalirdi.
#
# DIKKAT -- BU PAKET AYRI TUTULUYOR. Iki sebep:
#   1. player.entity.json'u ezen IKI paket ayni anda calisamaz;
#      ustteki kazanir. Kullanici referans modlardan birini de
#      acarsa biri digerini bastirir -- ayri paket olunca
#      hangisinin kapanacagi TEK dokunusla secilebiliyor.
#   2. Dosya oyunun surumune bagli (icinde vanilla animasyon
#      adlari var). Bozarsa sadece bu paket kapatilir, modun
#      geri kalani calismaya devam eder.
OMP = "/home/user/kanal-sitesi/addon/Simsek_Oyuncu_Modeli"
OMP_TABAN = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "oyuncu_modeli_taban")
OMP_UUID_BAS = "c1f0a4d7-9b62-4f8e-9a31-2d6b8f4c7e05"
OMP_UUID_MOD = "6e2b91c4-3d57-4a10-8f7d-b53e19a06c88"
# Esyanin kimligi. get_equipped_item_name AD ALANINI ATIYOR
# (belgede ve referans paketlerde boyle: 'pa:ilkel_asa' -> 'ilkel_asa'),
# o yuzden molang'de karsilastirilan metin ON EKSIZ.
MASKE_ESYA = "o_sey_maskesi"
MASKE_TR   = "O Şey Maskesi"
MASKE_EN   = "That Thing Mask"

SKP = "/home/user/kanal-sitesi/addon/Simsek_Skin"
SKIN_SERI   = "SimsekUzakAkraba"      # lang anahtarlarinin koku
# ==================== SURUM: TEK KAYNAK  (v7.9.8) ====================
#
# ---- NEDEN BOYLE OLDU ----
# Kullanici tablette dort paketi yan yana gordu ve soramadi:
# "bu dogru surum mu?" Hakliydi. Manifest surumu v7.9'da ELLE
# [7,9,0] yazilmis ve YEDI SURUM boyunca bir daha
# dokunulmamisti -- 7.9.1'den 7.9.7'ye kadar hepsi oyunda
# AYNI gorunuyordu (v7.9.0). Ustelik ad da ayri bir yerde
# "... v7.9" diye yaziliydi, yani iki numara vardi ve ikisi de
# yanlisti.
#
# Simdi TEK kaynak burasi. Dort manifest, dort paket adi,
# ayarlar.js'teki SURUM ve .mcpack dosya adlari hepsi bundan
# tureniyor -- ayrisabilecekleri bir yer kalmadi.
#
# YENI SURUM CIKARIRKEN: yalnizca asagidaki satiri degistir.
SURUM_NO = (7, 26, 0)

SURUM_METIN = "%d.%d.%d" % SURUM_NO
SURUM_ETIKET = "v" + SURUM_METIN

# ---- PAKET ADLARI ----
# Kullanici: "surum adlarini basitlestir, cok fazla kafami
# yormak istemiyorum, zaten test yapiyorum."
# Dordu de AYNI onekle basliyor (listede yan yana duruyorlar),
# surum ADIN ICINDE (tek bakista goruluyor) ve arkasindaki tek
# kelime ne oldugunu soyluyor. Aciklamalar da kisaltildi:
# oncekiler tablette yarida kesiliyordu.
PAKET_ONEK = "Şimşek " + SURUM_METIN + " · "
PAKETLER = {
    "bp":   (PAKET_ONEK + "Mod",
             "Yetenekler, kollar, iksirler, botlar. Ana paket."),
    "rp":   (PAKET_ONEK + "Görünüm",
             "İkonlar ve 3B kol görünümü. Bu paket kapalıysa eşyalar çalışır ama görünmez."),
    "omp":  (PAKET_ONEK + "Oyuncu Modeli",
             "Maskeyi eline al, O Şey ol. Ayrı paket: oyuncu modelini ezen başka bir paketle birlikte çalışmaz."),
    "skin": (PAKET_ONEK + "Skin",
             "Uzak Akraba ve diğer skinler."),
}

SKIN_PAKET_AD = PAKETLER["skin"][0]

# ---- IKI SKIN (v4.89) ----
# Kullanici: "2 tane skin yapman lazim, birincisini elleme,
# ikincisini elle yani that thing halim."
#
# ---- ALTI KOL BIR SKIN OLAMIYOR ----
# Denendi ve olmuyor: Mojang skin paketlerinde OZEL GEOMETRIYI
# KALDIRDI (kotuye kullanildigi icin). Resmi istemcide skins.json
# yalnizca iki degeri kabul ediyor:
#     geometry.humanoid.custom      (Steve, 4 piksel kol)
#     geometry.humanoid.customSlim  (Alex, 3 piksel kol)
# Dolasan "4D skin" paketleri ya Marketplace imzali ya da yamali
# istemci (LeviLauncher + Lib4dskin) istiyor. Ozel geometriyi
# yine de yazmak paketin TAMAMINI ice aktarilamaz hale
# getirebilirdi -- yani BIRINCI skini de gotururdu. Yazilmadi.
#
# O yuzden gercek donusum SKIN degil, KILIK: pa:o_sey_kilik
# varligi (bkz. donusum.js). Buradaki ikinci skin onun DUZ
# karsiligi -- ayni doku, normal oyuncu govdesinde.
#
# Ikinci skinin dokusu varliginkiyle BIREBIR ayni dosya: donusup
# cikinca "ayni karakter" hissi bozulmasin. Test bayt bayt
# karsilastiriyor.
SKIN_LISTE = [
    # (anahtar, dosya, TR ad, EN ad, kaynak)
    ("uzak_akraba", "uzak_akraba.png", "Uzak Akraba", "Uzak Akraba",
     "skin"),
    ("o_sey", "uzak_akraba_o_sey.png", "Uzak Akraba · O Şey Formu",
     "Uzak Akraba · That Thing Form", "o_sey"),
    # v7.5: Kanli Kol takarken normal kollar altta kalip garip
    # duruyordu. Kaynak modun kendi uyarisi da bunu istiyor:
    # "Kolun Duzgun Calismasi Icin Skininizin Kolsuz Olmasi
    # Lazimdir!" (Code-Man paketi, dil dosyasindan aynen).
    # Ayni skin, kol pikselleri saydam.
    ("kolsuz", "uzak_akraba_kolsuz.png", "Uzak Akraba · Kolsuz",
     "Uzak Akraba · Armless", "kolsuz"),
]
SKIN_ANAHTAR = SKIN_LISTE[0][0]        # eski adlar (testler icin)
SKIN_DOSYA  = SKIN_LISTE[0][1]
SKIN_AD     = SKIN_LISTE[0][2]
# UUID'ler SABIT: her uretimde degisirse oyun paketi YENI sanip
# eskisini birakiyor ve giyinme odasinda iki kopya oluyor.
SKIN_UUID_BAS = "45f22ff1-d633-49d1-b5e9-f8870fe98200"
SKIN_UUID_MOD = "8333e7a8-7e19-4736-b1f5-e5558a586b52"

# kimlik, yetenek, gorunen ad, ana renk (r,g,b), vurgu rengi
# NOT: "yetenek" sutunu sadece belge amacli; gercek eslesme
# scripts/yetenekler/kollar.js icinde. Cok yetenekli kollarda
# buraya kolun ana yetenegi yaziliyor.
KOLLAR = [
    ("kol_toprak", "cok",                "Toprak Kol",            (24, 22, 20),    (198, 138, 90)),
    ("kol_ucus",   "ucus",             "Ucus Kolu",             (120, 190, 236), (226, 246, 255)),
    ("kol_buz",    "buz_adam",         "Buz Kol",               (126, 190, 200), (196, 232, 238)),
    ("kol_dave",   "kasirga",          "Dave Kolu",             (96, 108, 76),   (176, 200, 140)),
    ("kol_kevin",  "hapis",            "Kevin Kolu",            (108, 112, 120), (188, 194, 204)),
    ("kol_gunes",  "isin_topu",        "Gunes Kolu",            (232, 168, 40),  (255, 232, 150)),
    # KANLI KOL (v6.7; model v7.3'te chris1545'e gecti).
    # Buradaki iki renk yalnizca YER TUTUCU: hem model hem doku
    # kaynaktan geldigi icin uretilen kol dokusu hemen eziliyor.
    # Yine de dogru olculer: kan #FF0303, pihti #390808.
    ("kol_kanli",  "kanli",            "Kanli Kol",             (57, 8, 8),      (255, 3, 3)),
    # ANNA KOLU (v7.7) -- fear1545'in kol modundan gelen isim.
    # Renkler UYDURULMADI: depodaki `kns_kolluk_boralo_anna`
    # dokusundan OLCULDU (BoraLo'nun "Anna + Toprak" kolluk
    # susu). Baskin iki renk:
    #     #699190 turkuaz (138 px) -- govde
    #     #966C4A toprak  ( 52 px) -- damar deseni
    # Modun kendi Anna dokusu ALINMADI: o 2560x1931 bulanik
    # bir TAS BLOGU, kol dokusu degil (bkz.
    # REFERANS_BORALO_KOL_V2.md).
    ("kol_anna",   "can_ver",          "Anna Kolu",             (105, 145, 144), (150, 108, 74)),
    # BOBBY KANLI KOL (v7.12). Renkler yer tutucu -- model de
    # doku da kaynaktan geliyor, uretilen doku hemen eziliyor.
    # Yine de dogru olculer: kaynagin (Bobby1545 Mod V3) kendi
    # paletinden, turuncu et #E58D3F ve pihti #390808.
    ("kol_kanli_bobby", "ors",          "Bobby Kanli Kol",       (57, 8, 8),      (229, 141, 63)),
]

# Turkce gorunen adlar (dil dosyasi icin; JSON'da ASCII tutuluyor)
TR_AD = {
    "kol_toprak": "Toprak Kol",
    "kol_ucus":   "Uçuş Kolu",
    "kol_buz":    "Buz Kol",
    "kol_dave":   "Dave Kolu",
    "kol_kevin":  "Kevin Kolu",
    "kol_gunes":  "Güneş Kolu",
    "kol_kanli":  "Kanlı Kol",
    "kol_anna":   "Anna Kolu",
    "kol_kanli_bobby": "Bobby Kanlı Kol",
}

# BEKLEME = 60 tick = 3 sn. Esya beklemesi bununla ayni tutuluyor ki
# oyuncu ekranda donen bekleme gostergesini gorsun.
BEKLEME_SN = 3.0

# ---------------------------------------------------------------
#  INSANSI ISKELET DUZENI (v5.5)
#
#  Bedrock oyuncusunun gercek kemik agaci OLCULDU (Marvel
#  Project'in 46 oyuncu modeli, hepsinde ayni; pivotlar da):
#
#      root  (0,0,0)
#        |- waist (0,12,0)
#        |    \- body (0,24,0)
#        |         |- head     (0,24,0)
#        |         |- rightArm (-5,22,0)
#        |         \- leftArm  (5,22,0)
#        |- rightLeg (-2,12,0)
#        \- leftLeg  (2,12,0)
#
#  Bizim urettigimiz modellerde iki sapma vardi:
#    * Ben 10 uzaylilari ve omnitrix: HIC ebeveyn yok, alti
#      kemik de kok seviyesinde. Govde donunce kafa ve kollar
#      yerinde kaliyor -- yani "uzuvlar govdeden kopuyor".
#    * zirh_mod_* ve o_sey: bacaklar body'nin cocugu. Degil;
#      root'un cocugu. Govde donusu bacaklara da geciyordu.
#
#  Duzeltme yalniz SAPMAYI onariyor: ebeveyni None olan ya da
#  bacaklarda yanlislikla "body" olan kemikler duzeltiliyor.
#  Kaynak modlarin bilerek kurdugu ozel baglar (Marvel'in
#  "rotation" kemigi gibi) OLDUGU GIBI birakiliyor -- onlarin
#  kendi animasyonlari o baglara gore yazilmis.
#
#  Tek yerde duruyor cunku geometri dosyalari altı ayri
#  yerden yaziliyor; her birine ayri eklemek unutulmaya acik.
# ---------------------------------------------------------------
INSAN_EBEVEYN = {
    "waist": "root", "body": "waist", "head": "body",
    "rightArm": "body", "leftArm": "body",
    "rightLeg": "root", "leftLeg": "root",
}
INSAN_PIVOT = {"root": [0, 0, 0], "waist": [0, 12, 0]}
INSAN_GEREK = ("body", "head", "rightArm", "leftArm",
               "rightLeg", "leftLeg")


def insan_hiyerarsisi(veri):
    """Insansi geometrilerde eksik/yanlis ebeveynleri onarir."""
    if not isinstance(veri, dict):
        return veri
    for g in veri.get("minecraft:geometry", []) or []:
        kemikler = g.get("bones")
        if not isinstance(kemikler, list):
            continue
        adlar = {b.get("name"): b for b in kemikler if isinstance(b, dict)}
        if not all(k in adlar for k in INSAN_GEREK):
            continue
        # ---- AD CAKISMASI ----
        # Elmas Kafa'da zaten `root` adinda bir kemik var:
        # kafadaki KRISTAL (head'in cocugu, 3 kup). Onu iskelet
        # koku sanip govdeyi ona bagladigimda butun vucut
        # kafadan sarkti. Ayni tuzak `head`/`body` icin
        # BEN10_KEMIK tarafinda zaten cozulmustu.
        #
        # Olcut: gercek iskelet koku EBEVEYNSIZ ve KUPSUZDUR.
        # Oyle degilse kemik `_ic` ekiyle yeniden adlandirilip
        # cocuklari yeni ada baglaniyor.
        for ek in ("root", "waist"):
            b = adlar.get(ek)
            if b is not None and (b.get("parent") or b.get("cubes")):
                yeni_ad = ek + "_ic"
                while yeni_ad in adlar:
                    yeni_ad += "_ic"
                for c in kemikler:
                    if isinstance(c, dict) and c.get("parent") == ek:
                        c["parent"] = yeni_ad
                b["name"] = yeni_ad
                adlar[yeni_ad] = b
                del adlar[ek]
                print("   %s: cakisan kemik yeniden adlandirildi -> %s=%s"
                      % (g.get("description", {}).get("identifier", "?"),
                         ek, yeni_ad))
        # Eksik root/waist'i ekle (kutusuz, yalniz donus tasir)
        for ek in ("root", "waist"):
            if ek not in adlar:
                yeni = {"name": ek, "pivot": list(INSAN_PIVOT[ek])}
                if ek == "waist":
                    yeni["parent"] = "root"
                kemikler.insert(0, yeni)
                adlar[ek] = yeni
        for ad, dogru in INSAN_EBEVEYN.items():
            b = adlar.get(ad)
            if b is None:
                continue
            simdi = b.get("parent")
            if simdi is None or (ad in ("rightLeg", "leftLeg")
                                 and simdi == "body"):
                b["parent"] = dogru
    return veri


def yaz_json(yol, veri):
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    if yol.endswith(".geo.json") or "/models/entity/" in yol.replace("\\", "/"):
        veri = insan_hiyerarsisi(veri)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, indent=2, ensure_ascii=False)
        f.write("\n")


# ---------------------------------------------------------------- esya
def esya(kimlik, ad):
    """v3.5'te 11/11 esya oyuna KAYDOLMADI. Sebep tek bir esyada
    degil, yapinin tamaminda -- tek dosya bozuk olsa 1/11 hata
    verirdi. Iki deneysel bagimlilik vardi, ikisi de kaldirildi:

      1. format_version "1.16.100" = ESKI veri-tabanli esya formati.
         Modern surumlerde "Holiday Creator Features" deneysel ayari
         acik degilse sessizce yok sayiliyor. Kararli yol
         format_version 1.20.50+ ve description.menu_category.

      2. minecraft:on_use -> events -> run_command. Bu olay yaniti
         hicbir zaman kararli hale gelmedi. Kaldirildi; tetikleme
         zaten script tarafindaki itemUse olayindan ve jest
         sisteminden geliyor.

    Bilesenler bilerek AZ tutuldu: her fazladan bilesen esyanin
    tamamen reddedilme riski. Sadece kararli oldugundan emin
    olunanlar var.

    render_offsets da cikarildi -- eski bir bilesen ve bize gerekmiyor:
    kol modelinin kok kemigi "RightArm" oldugu icin zaten oyuncunun
    koluyla ayni olcekte cizilir."""
    tam = "pa:" + kimlik
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": tam,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                # DIKKAT: ikonun bicimi.
                #   {"texture": "ad"}  -> 1.16.100'den beri calisan bicim
                #   "ad" (duz metin)   -> daha yeni kisayol
                # v3.6-v4.0'da duz metin kullanildi; esyalar KAYDOLDU ama
                # ikonlar gorunmedi. Uzun sureli desteklenen bicime donuldu.
                "minecraft:icon": {"texture": kimlik},
                "minecraft:display_name": {"value": ad},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                # Cift el: iki kolu ayni anda takabilmek icin sol el
                # slotuna da girebilmeli.
                "minecraft:allow_off_hand": True,
                "minecraft:cooldown": {
                    "category": kimlik + "_bekleme",
                    "duration": BEKLEME_SN,
                },
            },
        },
    }


# ---------------------------------------------------------------- iksir
# kimlik, gorunen ad, sivi rengi, goz kimligi, goz rengi
# v4.12: hiyerarsi kaldirildi, her iksir kendi alaninda uzman.
# Referanstan gelen iki yeni iksir: redoksin, firenoksin.
# v4.18: orman_atesi (referansta forest_fire) cikarildi -- "her seyden
# orta" bir kimlik degil, hicbir durumda tercih sebebi olmuyordu.
# ---- GOZ ZIRHI (v4.62, v4.75'te 7 -> 8,5 simge) ----
# "7 dis boslugunu doldursun, 10 tane var ya" -> 7 simge.
# Zirh cubugunda 1 simge = 2 puan, yani 7 simge = 14 puan.
# Referans modlar 7 YAZIYOR ama o 3,5 simge ediyor; burada
# kullanicinin TARIFI esas alindi. Tek sayi, tek yerde.
#
# v4.75: "zirh barinda 10 tanesinden 7 yapmistik ya, onu 8,5
# olsun yapabiliyorsan" -> 8,5 simge x 2 puan = 17 puan.
# YARIM SIMGE OLUYOR: zirh cubugu yarim simge cizebiliyor
# (tek sayilar hep yarim gosterir), o yuzden 8,5 tam olarak
# ciziliyor. 10 simgeye 1,5 simge kaldi.
GOZ_ZIRH = 17

# GOZ RENGI iki bicimde yazilabilir:
#   (r, g, b)              -> iki goz de ayni renk
#   ((r,g,b), (r,g,b))     -> sol goz / sag goz ayri (bkz. goz_renkleri)
IKSIRLER = [
    ("nitroksin",   "Nitroksin",   (236, 240, 248), "goz_beyaz",    (245, 248, 255)),
    ("grinoksin",   "Grinoksin",   (96, 214, 110),  "goz_yesil",    (150, 255, 160)),
    ("redoksin",    "Redoksin",    (206, 44, 44),   "goz_kirmizi",  (255, 96, 96)),
    ("firenoksin",  "Firenoksin",  (240, 130, 40),  "goz_ates",     (255, 190, 90)),
    ("kan_iksiri",  "Kan Iksiri",  (140, 20, 28),   "goz_kan",      (220, 50, 50)),
    ("hiperoksin",  "Hiperoksin",  (70, 150, 240),  "goz_mavi",     (140, 210, 255)),
    # ---- v4.62: iki yeni iksir, iki yeni referans moddan ----
    # StarOxine  (best StarOxine mod)  -> koruma uzmani
    # Element    (Element Iksiri V2)   -> element uzmani, lazeri dondurur
    #
    # v4.63: asagidaki renkler artik TAHMIN DEGIL. Referans modlarin
    # kaynak paketleri acildi, dokular piksel sayilarak olculdu
    # (bkz. kaynak_doku/NEREDEN.md). Onceki degerler hatirdan
    # yazilmisti ve ikisi de yanlisti:
    #   StarOxine  (245,225,140) soluk altin  ->  gercegi doygun sari
    #   Element    (110,225,215) tek turkuaz  ->  gercegi IKI AYRI GOZ
    ("staroxine",   "StarOxine",   (255, 223, 76),  "goz_yildiz",   (255, 245, 0)),
    # Element'in kimligi cift element: bir goz buz, obur goz ates.
    # Referansin goz dokusu da lazeri de boyle ciziliyordu.
    ("element",     "Element",     (56, 225, 255),  "goz_element",
     ((56, 225, 255), (255, 178, 0))),
]

# ---- Referans modlardan gelen iksir ikonlari (v4.63) ----
# kimlik -> kaynak_doku/ altindaki dosya adi. Dosya varsa uretilen
# sise ikonu yerine O kopyalanir; yoksa uretilene dusulur ve paket
# yine calisir. Kollarin elle cizilmis dokularindaki kalibin ayni.
DOKU_KAYNAK = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "kaynak_doku")
IKSIR_DOKU = {
    "staroxine": "iksir_staroxine.png",
    "element":   "iksir_element.png",
}

# Her gozun bir de LAZER varyanti var: lazer atarken kisa sureligine
# ona geciliyor. Referansta da boyleydi (pa:beyaz_goz -> beyaz_goz_lazer),
# tek farki bizde kilit olmamasi.

IKSIR_TR = {
    "nitroksin": "Nitroksin", "grinoksin": "Grinoksin",
    "redoksin": "Redoksin", "firenoksin": "Firenoksin",
    "kan_iksiri": "Kan İksiri", "hiperoksin": "Hiperoksin",
    "staroxine": "StarOxine", "element": "Element İksiri",
}
GOZ_TR = {
    "goz_beyaz": "Beyaz Göz", "goz_yesil": "Yeşil Göz",
    "goz_kirmizi": "Kırmızı Göz", "goz_ates": "Ateş Gözü",
    "goz_yildiz": "Yıldız Gözü", "goz_element": "Element Gözü",
    "goz_yildiz_lazer": "Yıldız Gözü (lazer)",
    "goz_element_lazer": "Element Gözü (lazer)",
    "goz_kan": "Kanlı Göz", "goz_mavi": "Mavi Göz",
    "goz_beyaz_lazer": "Beyaz Göz (Lazer)", "goz_yesil_lazer": "Yeşil Göz (Lazer)",
    "goz_kirmizi_lazer": "Kırmızı Göz (Lazer)", "goz_ates_lazer": "Ateş Gözü (Lazer)",
    "goz_kan_lazer": "Kanlı Göz (Lazer)", "goz_mavi_lazer": "Mavi Göz (Lazer)",
}


def iksir_esyasi(kimlik, ad):
    """Icilebilir iksir. minecraft:food bileseni referanstan alindi --
    icme animasyonunu ve "bitince bos siseye donusme" davranisini
    oyunun kendisi hallediyor, biz yazmiyoruz.

    AMA referanstaki gibi efektleri buraya KOYMUYORUZ. Orada
    food.effects icinde sabit efektler vardi; bizde gucler script
    tarafinda, cunku kademe suresi/tazeleme/goz yonetimi gerekiyor.
    Buradaki food sadece "icilebilir olsun" diye.                  """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:iksir_" + kimlik,
                "menu_category": {"category": "items"},
            },
            "components": {
                "minecraft:icon": {"texture": "iksir_" + kimlik},
                "minecraft:display_name": {"value": ad},
                "minecraft:max_stack_size": 16,
                # use_animation OLMADAN esya ICILEBILIR SAYILMIYOR:
                # dokununca hicbir sey olmuyor, dolayisiyla
                # itemCompleteUse olayi da hic tetiklenmiyor.
                # v4.1'de "icince etki yok" hatasinin sebebi buydu.
                "minecraft:use_animation": "drink",
                "minecraft:food": {"nutrition": 0, "can_always_eat": True},
                "minecraft:use_modifiers": {"use_duration": 1.4, "movement_modifier": 0.35},
                "minecraft:cooldown": {"category": "iksir", "duration": 1.0},
            },
        },
    }


def goz_esyasi(kimlik, ad):
    """Kafaya takilan goz. SADECE GORUNUM -- guc bayragi degil.

    Referansta guc bu esyadan geliyordu (her tick @e[hasitem=...]
    taramasi) ve bu yuzden item_lock ile kilitlemek zorundaydilar.
    Bizde durum script'te, o yuzden kilit yok: cikarabilirsin,
    kademe yine de devam eder ve sure dolunca script kendisi
    cikarir.                                                       """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + kimlik,
                # ---- v4.65: GOZ ARTIK YARATICI MENUDE YOK ----
                # Kullanici: "gozleri ayri bir esya yapma, iksiri
                # ictigimizde otomatik olarak takilsin, yani ayri
                # bir sey olmasin."
                #
                # Goz ZATEN iksir icilince otomatik takiliyordu
                # (iksirler.js gozTak). Sikayet edilen sey onun
                # YARATICI MENUDE de ayri bir esya olarak durmasi:
                # 16 goz (8 iksir x normal/lazer) listeyi sisiriyor
                # ve "elle takilan bir zirh" gibi duruyordu. Oysa
                # goz bir esya degil, iksirin gorunumu.
                #
                # "none" = yaratici menude gosterme. Esya KAYITLI
                # kalmaya devam ediyor, sadece listede cikmiyor;
                # script setEquipment ile takmaya devam ediyor.
                #
                # "none" TAHMIN DEGIL: best StarOxine mod tam bu
                # isi boyle yapiyor -- dy:slazer, dy:sun_lazer,
                # dy:hipnoz_gozu, dy:staroxine_ozeligi ve
                # dy:staroxine_menu esyalarinin hepsi
                # {"category": "none"} ile gizlenmis. Yani
                # calisan bir modda kanitli.
                #
                # (Element modu gizlemiyor, gozlerini helmet
                # grubuna koyuyor -- iki referans burada ayrisiyor,
                # StarOxine'inki dogru olan.)
                "menu_category": {"category": "none"},
            },
            "components": {
                "minecraft:icon": {"texture": kimlik},
                "minecraft:display_name": {"value": ad},
                "minecraft:max_stack_size": 1,
                # ---- YARATICI MENUDE YOK (v4.65) ----
                # Bkz. yukaridaki description.menu_category notu.
                # ---- ZIRH (v4.62) ----
                # Kullanici: "gozu 7 dis boslugunu doldursun,
                # hani 10 tane var ya, 7 tanesini doldursun."
                #
                # Zirh cubugu 10 SIMGE, 20 zirh PUANI gosteriyor;
                # yani bir simge 2 puan. 7 simge = 14 puan.
                #
                # v4.75'te kullanici 8,5 simge istedi -> 17 puan.
                # Tek sayi oldugu icin cubukta son simge YARIM
                # ciziliyor; "8,5" birebir goruluyor.
                #
                # DIKKAT -- iki referans mod da "protection": 7
                # yaziyor, ama o 7 PUAN yani 3,5 simge. Yani
                # onlarinki kullanicinin tarif ettigi seyin
                # yarisi. Burada TARIF esas alindi; referansi
                # birebir istersen bu sayiyi 7 yap.
                #
                # Kiyas: elmas kask 3 puan. 14 puan cok yuksek --
                # ama bu iksirler zaten tanri seviyesi ve gozu
                # takmanin bir bedeli yok, o yuzden kullanicinin
                # istedigi gibi.
                "minecraft:wearable": {
                    "slot": "slot.armor.head",
                    "protection": GOZ_ZIRH,
                },
                "minecraft:armor": {"protection": GOZ_ZIRH},
                "minecraft:allow_off_hand": False,
            },
        },
    }


GOZ_GEOMETRI = {
    "format_version": "1.12.0",
    "minecraft:geometry": [
        {
            "description": {
                "identifier": "geometry.simsek_goz",
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 2,
                "visible_bounds_height": 2,
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": [
                # Kol modelindeki ile ayni kural: kemik adi oyuncu
                # iskeletindekiyle ayni olmali ki kafaya otursun.
                #
                # ---- v4.64: INFLATE GITTI, YERINE 0.2 ONE KAYMA ----
                # Onceki hal: origin z=-4 + "inflate": 0.52.
                # Inflate kutuyu MERKEZDEN disari geriyor, yani
                # dokuyu de geriyor: kayma merkeze uzaklikla
                # buyuyor. Duz iki piksellik gozde bu gorunmuyordu
                # (0.07 satir), ama goz artik HALELI ve SACAKLI --
                # gerilme dogrudan halede bozulma olarak cikiyor.
                # Ustelik 0.52 yuzden yarim piksel one duruyor,
                # yumusak bir isik orada "havada asili" duruyor.
                #
                # Referans (best StarOxine mod) inflate KULLANMIYOR:
                # kafayla ayni boy kutuyu z ekseninde 0.2 one
                # kaydiriyor (origin [-4, 24, -4.2]). Kaydirma
                # gerdirmiyor, sadece tasiyor. Arka ve yan yuzler
                # kafanin icinde kaliyor ama o bolgeler dokuda
                # TAMAMEN SAYDAM, yani hicbir sey cizilmiyor.
                {
                    "name": "Head",
                    "pivot": [0, 24, 0],
                    "cubes": [
                        {
                            "origin": [-4, 24, -4.2],
                            "size": [8, 8, 8],
                            "uv": [0, 0],
                        }
                    ],
                }
            ],
        }
    ],
}


# ============================================================
# ISIN GEOMETRISI  (v4.73)
#
# Kullanici: "goz lazerini partikul seklinde atiyor, onu cok
# sevemedim... gozumden gorseldeki gibi lazer atsin, ben goz
# lazerini KARE olarak algiladim, gozden cikan sey kare
# seklinde uzayip gidiyor."
#
# Onceki hal: minecraft:basic_flame_particle, 1,5 blok arayla,
# her 4 tickte yeniden. Yani isin degil ALEV BULUTU -- 25
# saniyede ~1900 alev parcacigi. Ekran goruntusunde oyuncu
# yaniyormus gibi duruyordu.
#
# ---- REFERANS BUNU MODELLE YAPIYOR ----
# Element Iksiri modu V2, geometry.pa_element_lazer (dosyadan
# CANLI okundu, hatirdan degil):
#   kemik Head, pivot [0, 24, 1.225]
#     origin [-3, 25, -134.775]  size [2, 1, 134]
#     origin [ 1, 25, -134.775]  size [2, 1, 134]
# Yani parcacik degil, kafa kemigine bagli IKI UZUN KUTU.
# Kafa donunce isin de donuyor; tick basina sifir maliyet.
#
# ---- ISININ YERI TAHMIN DEGIL ----
# Referansin kutulari x -3..-1 ve x 1..3.
# Bizim goz sutunlarimiz GOZ_SUTUNLAR = ((9,10),(13,14)),
# skin uzayinda. Kafa kubu origin x -4, size 8, uv [0,0]:
# on yuz skin x 8..15'e dusuyor ve skin x'i model x'in TERSI
# yonunde artiyor (onden bakinca +x seyircinin SOLU):
#     model_x_sol_kenar(sx) = 12 - sx
#   sx 9,10 -> model x 1..3
#   sx 13,14 -> model x -3..-1
# Referansla BIREBIR AYNI. Iki bagimsiz hesap ayni yeri
# gosteriyor -- isinin yatay yeri dogru.
#
# YUKSEKLIK FARKLI: referansinki y 25..26, yani CENE hizasi.
# Bizim goz satirimiz GOZ_SATIR = 12; ayni cevrimle
#     model_y_ust(sy) = 40 - sy  ->  sy 12 icin 27..28
# Isin gozun ORTASINA oturtuluyor: origin y 26.5, size 2.
# Boylece kesit 2x2 -- kullanicinin istedigi KARE.
#
# UZUNLUK: LAZER_MENZIL bloktan turuyor (1 blok = 16 birim).
# Cok uzun kutu Bedrock'ta gorunurluk siniri sorunu
# cikarabilir, o yuzden kullaniciyla 14 bloktan baslamaya
# karar verildi.
#
# GORUNURLUK KUTUSU: referans width 16 / height 4 yazmis --
# 8,4 bloklik isin icin bile KUCUK, yani onlarinki bazi
# acilardan eleniyor olmali. Bizde isin boyuna gore
# hesaplaniyor.
# ============================================================
# v4.82: 17 -> 21. ayarlar.js LAZER_MENZIL ile AYNI olmali;
# doku.mjs iki sayinin esitligini kilitliyor. Ayrisirsa isin
# gordugunden baska yerde vurur (ya da tersi).
LAZER_ISIN_MENZIL = 24      # blok -- ayarlar.js LAZER_MENZIL'in IKIZI
LAZER_ISIN_KALIN  = 2       # birim, kesit (2x2 = kare)
LAZER_ISIN_UV     = [0, 20] # dokuda duz renk yamasinin yeri (64'luk uzay)

# ============================================================
# ISININ RENGI  --  "bizimki birazcik soluk gibi geldi" (v4.75)
#
# ---- OLCUM, TAHMIN DEGIL ----
# Kullanicinin oyun ici ekran goruntusu, dort ayri yatay
# taramada AYNI degeri verdi:      (79, 101, 115)
# Bizim Hiperoksin isin yamasi:    (176, 224, 255)
#     79/176 = 0,449   101/224 = 0,451   115/255 = 0,451
# Yani isin dokunun TAM %45'inde ciziliyor -- dunya isigi
# varligi golgeliyor. Ekran goruntusu GUPEGUNDUZ cekildi,
# yani karanliktan degil, cizim boyle.
#
# ---- REFERANSIN DOKUSU CANLI OKUNDU ----
# "Element Iksiri modu V2" (iyimisin.mcaddon),
# textures/entity/pamobile/pa_element_lazer.png, 64x64:
#     (0, 0, 0, 0)      3692 piksel   (bos)
#     (0, 255, 243)      280 piksel   <- BUZ isini
#     (255, 98, 0)       124 piksel   <- ATES isini
# Ikisi de TAM DOYGUN. Hicbiri beyaza cekilmemis.
#
# Bizimki neden soluktu: isin yamasi gozun "beyaza cekilmis"
# halinden (0,32 oraninda) aliniyordu. Beyaza cekmek gozde
# dogru -- "goz acildi" hissini o veriyor -- ama isinda
# doygunlugu oldurup griye yaklastiriyor. Golgelenince de
# gri-mavi cikiyor: olculen (79, 101, 115) tam olarak bu.
#
# Cozum referansin yaptigi: isin gozun DOYGUN hali.
# Doygunluk carpanla artiyor, tavana carpinca duruyor --
# boylece Nitroksin'in BEYAZ gozu beyaz kaliyor (doygunlugu
# zaten sifira yakin), Hiperoksin'in mavisi tam maviye,
# Element'in turkuazi referansin (0,255,243) tonuna gidiyor.
LAZER_ISIN_DOYGUN = 2.6     # doygunluk kazanci (1.0 = degistirme)

# ---- IKI KIRMIZI AYNI RENGE DUSUYORDU (v4.76) ----
# Kullanici: "Kan ve Redoksin kirmizi olsunlar ama farkli
# kirmizi turu olsun."
#
# Sebep matematiksel: iki gozun de TONU birebir ayni.
#     Redoksin  goz (255, 96, 96)
#     Kan       goz (220, 50, 50)
# Ikisinde de yesil ve mavi kanallar ESIT, yani ikisi de saf
# kirmizi tonunda -- sadece aciklik/doygunluk farkliydi.
# isin_rengi() doygunlugu tavana cekince o fark siliniyor ve
# ikisi de (255, 0, 0) oluyor. Hicbir doygunlastirma bunlari
# ayiramaz; ayirmak icin TON vermek gerekiyor.
#
# GOZLERE DOKUNULMADI: onlar zaten birbirinden farkli iki
# kirmizi ve kullanici gozleri begendi. Ayrisan tek yer isin.
#
# Secilen iki ton, birbirinden VE Firenoksin'in turuncusundan
# (255, 155, 0) uzak duracak sekilde secildi:
LAZER_ISIN_RENK = {
    "goz_kirmizi": (255, 24, 0),    # Redoksin: parlak al -- atese bir tik
    "goz_kan":     (205, 0, 48),    # Kan: koyu bordo -- morumsu tarafa
}

# ---- PARLAKLIK: dunya isigini bypass et ----
# Doygunluk rengi DUZELTIYOR ama %45 golgelemeyi kaldirmiyor.
# Hicbir doku degeri bunu kapatamaz: 255'in ustune cikilamiyor.
# Tek gercek cozum malzeme -- "entity_emissive" dokunun alfa
# kanalini PARLAKLIK maskesi olarak kullaniyor ve pikseli
# dunya isigindan bagimsiz ciziyor. Alfa DUSTUKCE daha cok
# parliyor; "_alpha" ekli surumun aksine piksel yine de tam
# opak kaliyor, yani isin saydamlasmiyor.
#
# GOZE UYGULANAMAZ: gozun halesi ve sacaklari ara alfa
# degerleriyle yumusuyor (bkz. goz_dokusu). entity_emissive
# altinda o ara degerler saydamlik degil PARLAKLIK sayilir --
# hale opak parlayan bir leke olur, yani v4.18'de temizlenen
# "gozluk" hatasi geri gelir. O yuzden isin AYRI BIR KEMIGE
# alindi ve malzeme kemik basina veriliyor (kendi render
# denetleyicimiz). Goz kemigi eskisi gibi entity_alphablend.
#
# REFERANS BUNU YAPMIYOR: Element modu duz "armor" kullaniyor,
# yani onun isini da golgeleniyor. Kullanicinin gonderdigi
# parlak turkuaz gorsel bir OYUN ICI kare degil, islenmis bir
# animasyon karesi. Yani burasi referansi GECIYOR.
#
# KAPATMA: LAZER_ISIN_PARLAK = False -> isin yine Head
# kemiginde, tek malzeme, ozel render denetleyicisi yok.
# Tablette goz kaybolursa tek satirlik donus yolu budur.
LAZER_ISIN_PARLAK  = True
LAZER_ISIN_ALFA    = 64          # dusuk alfa = cok parlama
LAZER_ISIN_KEMIK   = "isin"
LAZER_ISIN_MALZEME = "entity_emissive"
LAZER_ISIN_DENETIM = "controller.render.simsek_goz_lazer"


def isin_rengi(renk):
    """Goz renginin ISIN icin doygunlastirilmis hali.

    HSV'ye cevirip S'yi LAZER_ISIN_DOYGUN kati yapiyor (1.0'da
    kesiliyor), V'yi tavana cekiyor. TON degismiyor: hangi
    iksiri ictigin isinin renginden yine anlasiliyor.

    Beyaz goz beyaz kaliyor cunku doygunlugu ~0; sifirin kati
    yine sifir. Bu bilincli -- Nitroksin'in isini maviye
    donseydi kimlik karisirdi.                                 """
    r, g, b = (max(0, min(255, int(c))) for c in renk)
    maks, mins = max(r, g, b), min(r, g, b)
    if maks == 0:
        return (0, 0, 0)
    s = (maks - mins) / maks
    yeni_s = min(1.0, s * LAZER_ISIN_DOYGUN)
    # V tavana: en parlak kanal 255 olsun
    c_ = 255.0 * yeni_s
    m = 255.0 - c_
    fark = maks - mins
    if fark == 0:
        return (255, 255, 255)
    # Tonu koru: kanallarin BIRBIRINE gore siralamasi ve
    # aradaki oran aynen tasiniyor.
    def tasi(k):
        return int(round(m + c_ * ((k - mins) / fark)))
    return (tasi(r), tasi(g), tasi(b))


def isin_kutulari():
    """Iki goz isini: model uzayinda kutu tanimlari."""
    uzun = LAZER_ISIN_MENZIL * 16
    k = LAZER_ISIN_KALIN
    # Goz satirinin ORTASI: skin sy=GOZ_SATIR -> model y 40-sy
    ust = 40 - GOZ_SATIR                     # 28
    orta = ust - 0.5                         # 27.5, satirin ortasi
    y0 = orta - k / 2.0                      # 26.5
    # Kafanin ON yuzu: GOZ_GEOMETRI'deki kutunun origin z'si
    on = -4.2
    z0 = on - uzun

    kutular = []
    for i, (sol, sag) in enumerate(GOZ_SUTUNLAR):
        # skin sutunu -> model x.
        # Bir skin sutunu sx, model x araligi [11-sx, 12-sx].
        # Kafa kenarlariyla sinandi:
        #   sx=8  -> [3, 4]    (on yuzun sol kenari, +x)
        #   sx=15 -> [-4, -3]  (sag kenar, -x)
        # Ilk yazimda 12-sx kullanilmisti ve isin BIR BIRIM
        # kaymisti: cikan [2,4] / [-2,0], referansin [1,3] /
        # [-3,-1] degerleriyle tutmuyordu. Referansla
        # karsilastirmasak fark edilmezdi.
        x_dusuk = 11 - sag                   # daha kucuk model x
        x_yuksek = 12 - sol                  # daha buyuk model x
        genis = x_yuksek - x_dusuk           # bitisik iki sutun -> 2
        # Kesit KARE olsun: genislik zaten 2, kalinligi da 2
        kutular.append({
            "origin": [x_dusuk, round(y0, 3), round(z0, 3)],
            "size": [genis, k, uzun],
            # Her yuz ayni duz renk yamasina bakiyor. Kutu-UV
            # bu kadar uzun bir kutuda dokuyu her yuze farkli
            # gerdirir; yuz basina UV ile hepsi tek renkte.
            "uv": {
                yuz: {"uv": [LAZER_ISIN_UV[0] + i * 2, LAZER_ISIN_UV[1]],
                      "uv_size": [2, 2]}
                for yuz in ("north", "south", "east", "west", "up", "down")
            },
        })
    return kutular


def goz_lazer_geometrisi():
    """Goz kaplamasi + iki isin. Sadece _lazer varyanti kullaniyor."""
    import copy
    g = copy.deepcopy(GOZ_GEOMETRI)
    tanim = g["minecraft:geometry"][0]
    tanim["description"]["identifier"] = "geometry.simsek_goz_lazer"
    # Isin bu kadar uzunken gorunurluk kutusu da buyumeli,
    # yoksa kafa ekran kenarina gelince model TAMAMEN eleniyor.
    tanim["description"]["visible_bounds_width"] = LAZER_ISIN_MENZIL * 2 + 4
    tanim["description"]["visible_bounds_height"] = LAZER_ISIN_MENZIL + 4
    tanim["description"]["visible_bounds_offset"] = [0, 1, 0]

    if not LAZER_ISIN_PARLAK:
        # Eski duzen: isin gozle ayni kemikte, tek malzeme.
        tanim["bones"][0]["cubes"].extend(isin_kutulari())
        return g

    # ---- ISIN AYRI KEMIKTE (v4.75) ----
    # Malzeme render denetleyicisinde KEMIK BASINA veriliyor;
    # ayni kemikteki iki kutuya iki ayri malzeme verilemiyor.
    # Isin kendi kemigine alindi ki gozun yumusak halesi
    # entity_alphablend'de kalsin, isin entity_emissive'e gecsin.
    #
    # Kemik Head'in COCUGU: kafa donunce isin de donuyor,
    # eskisi gibi. Kutu koordinatlari mutlak model uzayinda
    # zaten -- pivot [0,24,0] ile hicbir sey kaymiyor.
    kafa = tanim["bones"][0]["name"]
    tanim["bones"].append({
        "name": LAZER_ISIN_KEMIK,
        "parent": kafa,
        "pivot": [0, 24, 0],
        "cubes": isin_kutulari(),
    })
    return g


def goz_lazer_denetleyicisi():
    """Isin kemigine AYRI malzeme veren render denetleyicisi.

    DIKKAT -- deponun kendi tarihi uyariyor: v4.31'de ozel bir
    render denetleyicisi botu UC SURUM boyunca gorunmez yapti.
    O yuzden buradaki denetleyici vanilla controller.render.armor
    ile BIREBIR ayni; tek fark materials dizisine eklenen ikinci
    satir.

    materials dizisi SIRAYLA uygulaniyor: once "*" butun
    kemiklere Material.default veriyor, sonra "isin" satiri
    sadece o kemigin uzerine yaziyor. Goz kemigi hic
    etkilenmiyor.                                              """
    return {
        "format_version": "1.10.0",
        "render_controllers": {
            LAZER_ISIN_DENETIM: {
                "geometry": "Geometry.default",
                "materials": [
                    {"*": "Material.default"},
                    {LAZER_ISIN_KEMIK: "Material.isin"},
                ],
                "textures": ["Texture.default"],
            }
        },
    }


# ============================================================
#  GOZ ANIMASYONU -- MEKANIZMA DENEMESI                v7.16
#
#  Sira bende degil, kanitta: bu depoda v5.3'te OLCULMUS bir
#  gercek var -- ATTACHABLE ANIMASYONLARI CALISMIYOR. Dort
#  surum boyunca calismayan bir animasyon tasinmis, kimse fark
#  etmemis. O yuzden 128 doku uretip sonra "calismiyormus"
#  demek istemiyorum.
#
#  Denenen sey FARKLI bir mekanizma: animasyon degil, RENDER
#  DENETLEYICI. Denetleyicide bir doku DIZISI tanimlaniyor ve
#  hangi karenin cizilecegi molang ile seciliyor:
#      "textures": [ "Array.kareler[math.floor(query.life_time * H)]" ]
#  Resmi belge (bedrock.dev/docs/stable/MoLang) diyor ki
#  "pozitif dizi indisleri dizi boyunca SARIYOR" -- yani mod
#  almaya gerek yok, sayac buyuduce basa donuyor.
#
#  ---- NEDEN RISKSIZ ----
#  Uc ayri koruma var:
#    1. KARE 0 BUGUNKU DOKUNUN BIREBIR AYNISI. Tohum
#       degismiyor, yani dosya bayt bayt ayni cikiyor.
#       Mekanizma calismazsa denetleyici hep kare 0'i cizer --
#       yani BUGUNKU GORUNUS. Basarisizlik hali gerileme degil.
#    2. YALNIZ TEK GOZ. Kalan yedi iksir hic dokunulmadan
#       eski yolunda (controller.render.armor) kaliyor; yani
#       denetleyicim tamamen bozuk olsa bile yedi iksir
#       calismaya devam eder. Kontrol grubu onlar.
#    3. TEK SATIRLA KAPANIYOR: GOZ_ANIM_DENEME = None.
#
#  ---- KARELER NEDEN AYNI GOZ ----
#  Kareler baska bir goz DEGIL, ayni gozun alevleri baska
#  yerde duran hali: tohum "goz:k1", "goz:k2"... Yani renk,
#  cekirdek ve hale sabit; yalniz alev dilleri ve korlar
#  oynuyor. Baska turlu goz her karede baska bir goze
#  donusmus gibi zipliyordu (lazer varyantinda ayni ders
#  v4.73'te yazili).
#
#  ---- KAYBEDILEN TEK SEY ----
#  controller.render.armor'un buyulenmis parlamasi (glint).
#  Goz kaplamasi buyulenebilir bir esya degil; kaybi yok.
# ============================================================
# ---- SONUC: DENEME BASARISIZ, KAPATILDI (v7.17) ----
# Kullanici v7.16.0'i oyunda denedi: "goz titremiyor". Yani
# render denetleyici + doku dizisi + query.life_time yolu da
# attachable uzerinde CALISMIYOR. Bu, v5.3'teki "attachable
# animasyonlari calismiyor" olcumunun yanina yazilan IKINCI
# olculmus gercek.
#
# Deneme tam da bunun icin ucuz tasarlanmisti (3 dosya, tek
# goz, kare 0 = bugunku doku) ve tasarim ise yaradi: cevap
# ogrenildi, hicbir sey gerilemedi.
#
# Anahtar simdi None. Kod SILINMEDI, cunku basarisizligin
# KAYDI degerli: birisi ayni fikri tekrar denemesin diye
# mekanizma ve olcum burada duruyor. None yapmak uc seyi
# birden geri aliyor -- denetleyici dosyasi yazilmiyor, kare
# dokulari uretilmiyor (3 x 832x832, ekran kartinda ~8 MB),
# ve gozler vanilla controller.render.armor'a donuyor.
#
# Hareket artik dokudan degil PARCACIKtan geliyor: v7.17
# "goz alevi" (bkz. aura_gozalev). Parcaciklarin calistigini
# kullanici oyunda gordu.
GOZ_ANIM_DENEME = None
GOZ_ANIM_KARE = 4              # kare 0 bugunku doku
GOZ_ANIM_HIZ = 9               # saniyede kac kare
GOZ_ANIM_DENETIM = "controller.render.simsek_goz_anim"


def goz_anim_tohumu(goz, kare):
    """Kare 0 BUGUNKU tohum -- dosya bayt bayt ayni kalsin.
    Digerleri ayni gozun baska bir savrulmasi."""
    return goz if kare == 0 else (goz + ":k%d" % kare)


def goz_anim_denetleyicisi():
    """Doku dizisi + molang indisi.

    Indis mod almiyor: belge "pozitif indisler dizi boyunca
    sariyor" diyor. math.floor sart, yoksa ondalik indis
    kesilirken kare atlanabiliyor."""
    return {
        "format_version": "1.10.0",
        "render_controllers": {
            GOZ_ANIM_DENETIM: {
                "arrays": {
                    "textures": {
                        "Array.kareler": [
                            "Texture.default" if k == 0 else "Texture.kare%d" % k
                            for k in range(GOZ_ANIM_KARE)
                        ]
                    }
                },
                "geometry": "Geometry.default",
                "materials": [{"*": "Material.default"}],
                "textures": [
                    "Array.kareler[math.floor(query.life_time * %d)]"
                    % GOZ_ANIM_HIZ
                ],
            }
        },
    }


def _goz_dokulari(kimlik):
    """Denenen gozde kare dokulari da bildiriliyor; digerlerinde
    eskisi gibi tek doku."""
    d = {
        "default": "textures/entity/" + kimlik,
        "enchanted": "textures/misc/enchanted_actor_glint",
    }
    if kimlik == GOZ_ANIM_DENEME:
        for k in range(1, GOZ_ANIM_KARE):
            d["kare%d" % k] = "textures/entity/%s_k%d" % (kimlik, k)
    return d


def _goz_denetleyicisi(kimlik, lazerli):
    """Uc yol: lazer isini (parlak malzeme), animasyon denemesi,
    ya da vanilla zirh denetleyicisi. Deneme YALNIZ tek goze
    uygulaniyor -- kalan yedisi kontrol grubu."""
    if lazerli and LAZER_ISIN_PARLAK:
        return LAZER_ISIN_DENETIM
    if GOZ_ANIM_DENEME and kimlik == GOZ_ANIM_DENEME:
        return GOZ_ANIM_DENETIM
    return "controller.render.armor"


def goz_attachable(kimlik):
    """Referanstan alinan kritik satir: parent_setup ile
    helmet_layer_visible = 0 -- yoksa kaskin kendisi de cizilir ve
    goz kaskin altinda kalir.

    ---- v4.64: MALZEME "armor" DEGIL "entity_alphablend" ----
    Bu bir gorsel tercih degil, ZORUNLULUK. "armor" malzemesi
    ALPHA TEST yapiyor: bir piksel ya tam opak ya tam saydam,
    aradaki degerler KESILIP ATILIYOR. Goz artik yumusak bir
    hale ve saydamligi azalan sacaklar tasiyor; alpha test
    altinda o pikseller hic cizilmez ve goz eskisi gibi duz iki
    kareye doner -- ustelik hicbir hata vermeden.

    entity_alphablend gercek harmanlama yapiyor. Referans
    (best StarOxine mod) da tam olarak bunu kullaniyor:
      "materials": { "default": "entity_alphablend" }
    Element modu "armor" kullaniyor ama onun dokusunda ara ton
    yok, o yuzden farki gormemis.

    enchanted dokusu da referanstaki gibi ACTOR glint: bu bir
    esya degil, vucuda giyilen bir sey. Onceki "item" yolu
    buyulenmis gorunumde yanlis dokuyu ariyordu.               """
    lazerli = kimlik.endswith("_lazer")
    # Isin kemigi icin AYRI malzeme: goz harmanlamada kalirken
    # isin dunya isigini bypass ediyor (bkz. LAZER_ISIN_PARLAK).
    malzemeler = {
        "default": "entity_alphablend",
        "enchanted": "armor_enchanted",
    }
    if lazerli and LAZER_ISIN_PARLAK:
        malzemeler["isin"] = LAZER_ISIN_MALZEME

    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": "pa:" + kimlik,
                "materials": malzemeler,
                "textures": _goz_dokulari(kimlik),
                # Lazer varyanti ISINLI geometriyi kullaniyor:
                # ayni goz kaplamasi + kafadan cikan iki uzun
                # kutu. Normal goz sade geometride kaliyor,
                # yoksa iksir icer icmez isin cikardi.
                "geometry": {
                    "default": ("geometry.simsek_goz_lazer"
                                if lazerli else "geometry.simsek_goz")
                },
                "scripts": {"parent_setup": "variable.helmet_layer_visible = 0.0;"},
                "render_controllers": [_goz_denetleyicisi(kimlik, lazerli)],
            }
        },
    }



# ==================== DURUS (POZ) SISTEMI  (v7.4) ====================
#
# ---- NEREDEN GELDI ----
# Kullanici Blockbuster'i (McHorse) gonderdi: "bu en onemlisi
# skin yapmakta, bunu genelde cok kullaniyorlar, once mantigini
# anla sonra kodlarina bak, ardindan bizim versiyonumuzu ekle."
# Jar acildi, 1529 sinif CFR ile cozuldu ve mantik OKUNDU
# (tahmin edilmedi). Ozet:
#
#   Model      -> `limbs` (adli kutular: size/texture/anchor/parent)
#                 + `poses` (duruslar)
#   ModelPose  -> {kemik: ModelTransform} + carpisma kutusu olcusu
#   ModelTransform -> translate / rotate / scale
#                 (mchorse.blockbuster.api.ModelTransform, ve donus
#                  sirasi MatrixUtils.RotationOrder.XYZ -- bizim
#                  v7.3'te OLCTUGUMUZ sirayla ayni)
#   CustomMorph -> model + skin + currentPose + currentPoseOnSneak
#   BodyPart   -> baska bir gorunusun bir UZVA takilmasi
#   EntityUtils.getPose -> ucuyorsa "flying", binekteyse "riding",
#                 sinsiyse "sneaking", degilse "standing";
#                 ozel bir duruş secildiyse o hepsini eziyor.
#
# ---- BEDROCK'TA NE YAPILABILIR, NE YAPILAMAZ ----
# Blockbuster bir GUI'de canli poz veriyor. Bedrock'ta script
# istemci tarafina (molang'a) bir sey yazamaz, yani "menuden poz
# sec" DOGRUDAN mumkun degil. Istemcinin gorebildigi tek oyuncuya
# ozel isaret ELDEKI ESYA (query.get_equipped_item_name) --
# depodaki butun gorunusler zaten bu tetikle calisiyor.
#
# ---- DONUS ANIMASYONA DEGIL GEOMETRIYE PISIRILIYOR ----
# Ilk aklima gelen her duruş icin bir .animation.json yazmakti.
# YAPILMADI: Bedrock animasyonlarindaki donus isareti/sirasi
# ayri bir sozlesme ve BURADA OLCEMIYORUM -- yanlis isaret
# kollari ters cevirir ve bunu ancak tablette gorurduk.
# Geometrideki donus sozlesmesi ise v7.3'te OLCULDU (pozitif
# aci, XYZ sirasi). O yuzden her duruş kendi GEOMETRISINE
# pisiriliyor: yeni bir mekanizma yok, olculmus olan kullanildi.
#
# ---- KOL KEMIKLERI NEDEN YENIDEN ADLANDIRILIYOR ----
# Vanilla animasyonlar kemikleri ADINA gore suruyor. Kollar
# `rightArm`/`leftArm` kalsaydi vanilla salinim bizim duruşumuzun
# USTUNE binerdi. `durus_sag_kol`/`durus_sol_kol` adlarini hicbir
# vanilla animasyon tanimaz -- duruş sabit kalir. Buna karsilik
# head/body/bacaklar VANILLA ADLARINI KORUYOR: yuruyus ve kafa
# cevirme bedava gelmeye devam ediyor.
#
# ---- DOKU: OYUNCUNUN KENDI DERISI ----
# Ayri doku YOK. Render denetleyicisi `Texture.default` diyor,
# yani oyuncunun kendi skini. Skin degisince duruş da degisir.
#
# ---- SINIR (bilerek, gizlenmeden) ----
# Kopya `geometry.humanoid.custom` (genis/Steve kollari). Ince
# (Alex) skin kullanan biri duruş acikken kollarini 1 piksel
# kalin gorur. Simsek_Skin/skins.json zaten `humanoid.custom`
# diyor, yani bu depodaki skin icin dogru olan bu.
DURUS_ACIK = True

# Vanilla oyuncu modelinin kopyasi. Kemik adlari ve olculer
# depodaki INSAN_EBEVEYN/INSAN_PIVOT ile ayni yerden geliyor;
# uv'ler 64x64 skin duzeninin standart bolgeleri ve DOGRULANDI:
# oyuncunun kendi derisiyle cizdirildi, yuz kafanin on yuzune,
# govde desenleri govdeye dustu (yanlis uv karmakarisik bir
# sonuc verirdi, tanidik bir sonuc degil).
DURUS_GOVDE = [
    # (ad, ebeveyn, pivot, kup_origin, kup_olcu, uv, sisme)
    ("root",       None,       [0, 0, 0],    None, None, None, 0),
    ("waist",      "root",     [0, 12, 0],   None, None, None, 0),
    ("body",       "waist",    [0, 24, 0],   [-4, 12, -2], [8, 12, 4], [16, 16], 0),
    ("jacket",     "body",     [0, 24, 0],   [-4, 12, -2], [8, 12, 4], [16, 32], 0.25),
    ("head",       "body",     [0, 24, 0],   [-4, 24, -4], [8, 8, 8],  [0, 0],   0),
    ("hat",        "head",     [0, 24, 0],   [-4, 24, -4], [8, 8, 8],  [32, 0],  0.5),
    ("rightLeg",   "root",     [-1.9, 12, 0], [-3.9, 0, -2], [4, 12, 4], [0, 16], 0),
    ("rightPants", "rightLeg", [-1.9, 12, 0], [-3.9, 0, -2], [4, 12, 4], [0, 32], 0.25),
    ("leftLeg",    "root",     [1.9, 12, 0],  [-0.1, 0, -2], [4, 12, 4], [16, 48], 0),
    ("leftPants",  "leftLeg",  [1.9, 12, 0],  [-0.1, 0, -2], [4, 12, 4], [0, 48],  0.25),
]

# Duruş VERILEBILEN kemikler: vanilla adlari birakiliyor ki
# vanilla salinim bunlara ULASAMASIN.
DURUS_KOL = [
    # (bizim ad, kilif adi, pivot, kup_origin, kol_uv, kilif_uv)
    ("durus_sag_kol", "durus_sag_kilif", [-5, 22, 0], [-8, 12, -2], [40, 16], [40, 32]),
    ("durus_sol_kol", "durus_sol_kilif", [5, 22, 0],  [4, 12, -2],  [32, 48], [48, 48]),
]

# ---- DURUŞ TABLOSU ----
# Bir satir = bir duruş. Blockbuster'in ModelTransform'u ile ayni
# uc alan: don (rotate) / kaydir (translate) / olcek (scale).
# Aci DERECE, sira XYZ, isaret POZITIF -- v7.3'te olculdu.
#
# Acilar goz karariyla yazilmadi: her duruş icin EL UCUNUN
# dustugu nokta hesaplandi (bkz. NOTLAR.md v7.4).
DURUSLAR = [
    # (kimlik, Turkce ad, ikon rengi, {kemik: {"don"/"kaydir"/"olcek"}})
    ("bagli_eller", "Bağlı Eller", (150, 122, 74), {
        # Bilekler govdenin ONUNDE bulusuyor: sag el (-0,6, 14,0, -4,2),
        # sol el (0,6, 14,0, -4,2) -- aralik 1,2 birim, yani bitisik.
        "durus_sag_kol": {"don": [25, 0, 35]},
        "durus_sol_kol": {"don": [25, 0, -35]},
    }),
    ("eller_yukari", "Eller Yukarı", (208, 66, 66), {
        # Bobby'nin gorselindeki duruş: iki kol da yukari, hafif disa.
        "durus_sag_kol": {"don": [0, 0, -160]},
        "durus_sol_kol": {"don": [0, 0, 160]},
    }),
    ("kavusuk", "Kavuşuk Kollar", (92, 108, 140), {
        # Gogus onunde kavusmus kollar: biri otekinin ustunde.
        "durus_sag_kol": {"don": [15, 0, 78], "kaydir": [0, -1, -3]},
        "durus_sol_kol": {"don": [15, 0, -78], "kaydir": [0, 1, -4]},
    }),
    ("t_durusu", "T Duruşu", (120, 190, 120), {
        # Blockbuster'in kendi `t_pose`u: iki kol tam yatay.
        "durus_sag_kol": {"don": [0, 0, -90]},
        "durus_sol_kol": {"don": [0, 0, 90]},
    }),
    ("selam", "Selam", (200, 168, 90), {
        # Tek kol yukari, oteki yanda.
        "durus_sag_kol": {"don": [0, 0, -150]},
        "durus_sol_kol": {},
    }),
]

DURUS_ONEK = "durus_"


def durus_govde_kemikleri():
    """DURUS_GOVDE'nin kemik listesi -- KOLLAR HARIC.

    v7.9'da ayri bir fonksiyon oldu cunku kol takasi animasyonu
    tam olarak bunu istiyor: KOLSUZ bir oyuncu govdesi. Iki yerde
    iki kopya govde listesi tutmak, bir gun ayrisacak iki liste
    demekti -- duruşun govdesi degisince kolsuz hâli de degismeli.
    """
    kemikler = []
    for ad, ebeveyn, pivot, orij, olcu, uv, sis in DURUS_GOVDE:
        k = {"name": ad, "pivot": list(pivot)}
        if ebeveyn:
            k["parent"] = ebeveyn
        if orij is not None:
            kup = {"origin": list(orij), "size": list(olcu), "uv": list(uv)}
            if sis:
                kup["inflate"] = sis
            k["cubes"] = [kup]
        kemikler.append(k)
    return kemikler


def durus_kemikleri(poz):
    """Bir duruşun kemik listesi: govde vanilla adlarini korur,
    kollar bizim adlarimizi tasir ve duruş DONUSU pisirilmis
    gelir.                                                      """
    kemikler = durus_govde_kemikleri()
    for ad, kilif, pivot, orij, uv, kuv in DURUS_KOL:
        d = poz.get(ad, {})
        temel = {"name": ad, "parent": "body", "pivot": list(pivot)}
        if d.get("don"):
            temel["rotation"] = list(d["don"])
        # `kaydir` kupun yerini oynatiyor; Bedrock geometrisinde
        # kemigin "translate" alani YOK, o yuzden kupun origin'ine
        # ekleniyor. Sonuc ayni, ve tek sozlesmede kaliyoruz.
        kay = d.get("kaydir") or [0, 0, 0]
        yer = [orij[i] + kay[i] for i in range(3)]
        temel["cubes"] = [{"origin": yer, "size": [4, 12, 4], "uv": list(uv)}]
        kemikler.append(temel)
        kemikler.append({
            "name": kilif, "parent": ad, "pivot": list(pivot),
            "cubes": [{"origin": yer, "size": [4, 12, 4],
                       "uv": list(kuv), "inflate": 0.25}],
        })
    return kemikler


def durus_geometrisi(kimlik, poz):
    """Bir duruşun tam geometrisi. Oyuncunun KENDI derisiyle
    cizilecegi icin uv uzayi 64x64 (skin duzeni).              """
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + DURUS_ONEK + kimlik,
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 3,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": durus_kemikleri(poz),
        }],
    }


def durus_esyasi(kimlik, ad):
    """Duruş tasi: bir SILAH degil, bir ANAHTAR (maske_esyasi ile
    ayni kalip). Yan ele de girebiliyor -- ana el bos kalsin diye,
    ki bagli eller duruşunda elinde kilic durmasin.             """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + DURUS_ONEK + kimlik,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": DURUS_ONEK + kimlik},
                "minecraft:display_name": {"value": "Duruş · " + ad},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                "minecraft:allow_off_hand": True,
            },
        },
    }


def durus_ikonu(renk):
    """16x16 ikon: bir insan silueti. Duruşlar birbirinden RENKLE
    ayriliyor; sekil ayni cunku hepsi ayni sey -- bir duruş."""
    p = {}
    govde = [(x, y) for y in range(6, 12) for x in range(6, 10)]
    kafa = [(x, y) for y in range(2, 6) for x in range(6, 10)]
    bacak = [(x, y) for y in range(12, 15) for x in (6, 7, 8, 9)]
    kol = [(x, y) for y in range(6, 11) for x in (4, 5, 10, 11)]
    for nokta, k in ((kafa, 1.15), (govde, 1.0), (bacak, 0.8), (kol, 0.9)):
        for xy in nokta:
            p[xy] = golge(renk, k) + (255,)
    return p


# ==================== KOL TAKASI ANIMASYONU  (v7.9) ====================
#
# ---- KULLANICI NE ISTEDI ----
# "Toprak kollar yere dusuyor ikisi de ayni sekilde yani sag ve
#  sol kol ardindan kanli kol ortaya cikiyor... Toprak kol yere
#  dusuyor ardindan kanli kol geliyor ve takilmis oluyor."
#
# ---- BU DEPODAKI ILK SINEMATIK ----
# Simdiye kadarki butun yetenekler ANLIK. Bu ise EVRELERI olan,
# birkac saniye suren bir sahne. O yuzden yeni bir mekanizma
# icat etmek yerine, calistigi GORULMUS uc parca birlestirildi:
#
#   yere dusen kol   -> pa:o_sey_kilik kalibi (sahte varlik)
#   varlik animasyon -> bot.entity.json'daki scripts.animate
#                       (attachable'da CALISMAYAN sey burada
#                        calisiyor -- v5.3'te kaldirilan olu
#                        attachable animasyonu bu yuzden geri
#                        getirilmedi)
#   oyuncuyu kolsuz  -> durus sisteminin govdesi tek basina
#      cizmek           (DURUS_GOVDE zaten DURUS_KOL'dan ayri)
#
# ---- NEDEN KOLSUZ GOVDE ----
# v7.5'te kullanici kolsuz skin istemisti: "bu kanli kollar bir
# garip oluyor, kolsuz nasil gorunecegine bakalim." Ama SKIN
# script'ten degistirilemiyor. Elde tutulan ISARET esyasi ise
# istemciye gecen tek isaret (query.get_equipped_item_name) --
# OMP'deki 75 geometrinin hepsi bununla calisiyor. Yani kollar
# dustugu anda oyuncu gercekten kolsuz ciziliyor.
KOL_TAKAS_ACIK = True

# Elde tutulan ISARET. Bir silah degil, bir anahtar (durus
# taslariyla ayni kalip). Sahne bitince yok ediliyor.
# ADI BILEREK `kol_` ILE BASLAMIYOR. Ilk denemede
# "kol_dusuyor" yazdim ve depodaki IKI koruma birden dustu:
# kol2.mjs "8 kol esyasi var" dedi 9 buldu, temizlik.mjs
# "items/ klasoru kollar.js ile ayni" dedi 9/8 gordu. Ikisi de
# HAKLIYDI -- bu bir KOL DEGIL, sahnenin gecici tasi. Sayaci
# 9'a cekmek korumayi kor etmek olurdu; dogru olan adi
# duzeltmek.
TAKAS_ISARET   = "takas_isareti"
# Kolsuz govde geometrisi ISARETLE AYNI ADI tasiyor: OMP'nin
# tetigi `variable.<ad> = get_equipped_item_name(...) == '<ad>'`
# kalibinda, iki ad ayrissa degisken hic dogru olmaz.
TAKAS_GOVDE    = TAKAS_ISARET

# Ucu de sahte varlik: yapay zeka yok, vurulamiyor, itilemiyor.
TAKAS_DUSEN_SAG = "kol_dusen_sag"
TAKAS_DUSEN_SOL = "kol_dusen_sol"
TAKAS_GELEN     = "kol_gelen"

# Sahnenin iki ucu. Bunlar KOLLAR tablosundaki kimlikler ve
# varlik dokulari da ayni adi tasiyor (attachable() `textures/
# entity/<kimlik>` diyor). Uretimde ikisinin de tabloda oldugu
# DENETLENIYOR: biri yeniden adlandirilirsa uretim sikayet etsin,
# oyunda mor-siyah bir kup cikmasin.
TAKAS_KAYNAK_KOL = "kol_toprak"
TAKAS_HEDEF_KOL  = "kol_kanli"


def takas_dusen_geometrisi(kimlik, ayna):
    """Yere dusen toprak kol.

    Kup GEOMETRI'den (simsek_kol) TURETILIYOR, elle yazilmiyor:
    Toprak Kol'un olcusu degisirse dusen kol da degissin.

    IKI FARK var ve ikisinin de sebebi bu artik bir ATTACHABLE
    degil, bagimsiz bir VARLIK olmasi:

      1. Kup y=0..12'ye tasiniyor. Varligin carpisma kutusu
         orijininde (0,0,0) ve yercekimi ACIK; model orijinin
         ALTINA sarksaydi kol yere inince toprağın icinde
         kalirdi.
      2. `inflate` DUSTU. Sismenin tek isi skinin kolunun
         uzerini kapatmakti; altta bir skin yok.

    `ayna` sol kol icin: ayni kup, dokusu X'te cevrilmis.
    Bedrock'ta bunun alani `mirror` ve depoda zaten kullaniliyor
    (kns_deri_dusmus.geo.json).                                 """
    import copy
    kaynak = GEOMETRI["minecraft:geometry"][0]
    kup = None
    for k in kaynak["bones"]:
        if k.get("cubes"):
            kup = copy.deepcopy(k["cubes"][0])
            break
    if kup is None:
        return None
    olcu = kup["size"]
    kup["origin"] = [-olcu[0] / 2.0, 0, -olcu[2] / 2.0]
    kup.pop("inflate", None)
    if ayna:
        kup["mirror"] = True
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + kimlik,
                "texture_width": kaynak["description"]["texture_width"],
                "texture_height": kaynak["description"]["texture_height"],
                "visible_bounds_width": 2,
                "visible_bounds_height": 2,
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": [{"name": "kol", "pivot": [0, 0, 0], "cubes": [kup]}],
        }],
    }


def _takas_don(p, aci):
    """Bir noktayi ORIJIN etrafinda dondurur.

    Sozlesme v7.3'te OLCULDU ve ciz_kemik.don()'da yaziyor:
    POZITIF aci, XYZ sirasi. Tahmin degil -- yanlis isaret
    denenip kollarin ic ice gectigi GORULEREK bulundu.

    Cizer buraya IMPORT EDILMIYOR: uretici cizim kutuphanesine
    (PIL vb.) bagimli olmamali. Onun yerine ayni olcum burada
    on iki satirda tekrarlaniyor ve kaynagi yaziyor.          """
    import math
    x, y, z = p
    rx, ry, rz = [math.radians(a) for a in aci]
    c, sn = math.cos(rx), math.sin(rx); y, z = y * c - z * sn, y * sn + z * c
    c, sn = math.cos(ry), math.sin(ry); x, z = x * c + z * sn, -x * sn + z * c
    c, sn = math.cos(rz), math.sin(rz); x, y = x * c - y * sn, x * sn + y * c
    return (x, y, z)


def takas_gelen_geometrisi():
    """Havadan gelen kanli kol.

    kanli_geometrisi()'nin SAG kolundan (33 kup) turetiliyor.
    Kemik kendi pivotu etrafinda DONUK geldigi icin (v7.3'te
    olculen [0,90,-175]), donusu bozmadan tasimanin tek yolu
    pivotu VE butun kuplerin origin'ini AYNI vektorle kaydirmak
    -- bu kati bir oteleme, donus aynen kalir.

    Pivot orijine tasiniyor. Modelin y=0'in altina sarkmasi
    onemli degil: bu varligin yercekimi KAPALI, konumunu her
    tick script veriyor (o_sey_kilik gibi). Yere hic degmiyor,
    yani gomulme sorunu yok -- ve donus merkezi tam olarak
    script'in koydugu nokta oluyor.                            """
    import copy
    kaynak = kanli_geometrisi()
    if kaynak is None:
        return None
    g = kaynak["minecraft:geometry"][0]
    # Sag kol: ebeveyni `rightArm` olan, kupu olan kemik.
    kemik = None
    for k in g["bones"]:
        if k.get("parent") == "rightArm" and k.get("cubes"):
            kemik = copy.deepcopy(k)
            break
    if kemik is None:
        return None
    kay = [-kemik["pivot"][i] for i in range(3)]
    kemik["pivot"] = [0, 0, 0]
    kemik.pop("parent", None)
    kemik["name"] = "kol"
    for c in kemik["cubes"]:
        c["origin"] = [c["origin"][i] + kay[i] for i in range(3)]

    # ---- DONUS SONRASI MERKEZLEME ----
    # Pivotu orijine tasimak YETMIYOR. Kemik [0,90,-175] donuk
    # geliyor; donusten SONRA kolun kutlesi orijinin epey
    # disinda kaliyor -- olculdu: merkez (-3,66 / -8,28 / -1,95)
    # birim, yani YARIM BLOK asagida ve yana kacik. Script kolu
    # omza koydugunda kol omuzda degil, omzun yarim blok
    # altinda gorunurdu.
    #
    # Duzeltme: pivot VE butun kupler AYNI vektorle kaydirilinca
    # donmus sonuc da tam o kadar kayiyor. Ispati bir satir --
    # donus p -> R(p - pivot) + pivot; ikisini de q kadar
    # kaydirinca R(p+q - (pivot+q)) + pivot+q = R(p-pivot)+pivot+q.
    #
    # PIVOTU KAYDIRMAYI ATLAMAK ILK DENEMEDE HATA OLDU: yalniz
    # kupleri kaydirdim, merkez (-3,66/-8,28/-1,95)'ten
    # (-4,88/-16,70/-5,61)'e gitti -- yani DAHA KOTU oldu.
    # Sebep tam da bu: kupleri tek basina kaydirmak, donusten
    # sonra R(q) kadar kaydiriyor, q kadar degil. Olcum yapmasam
    # "duzelttim" deyip gecerdim.
    #
    # Sayi ELLE YAZILMIYOR, her uretimde yeniden olculuyor:
    # kaynak model degisirse duzeltme de kendiliginden degisir.
    kose = []
    for c in kemik["cubes"]:
        o, b = c["origin"], c["size"]
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    kose.append(_takas_don(
                        (o[0] + dx * b[0], o[1] + dy * b[1], o[2] + dz * b[2]),
                        kemik["rotation"]))
    merkez = [(min(k[i] for k in kose) + max(k[i] for k in kose)) / 2.0
              for i in range(3)]
    kemik["pivot"] = [round(-merkez[i], 4) for i in range(3)]
    for c in kemik["cubes"]:
        c["origin"] = [round(c["origin"][i] - merkez[i], 4) for i in range(3)]
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + TAKAS_GELEN,
                "texture_width": g["description"]["texture_width"],
                "texture_height": g["description"]["texture_height"],
                "visible_bounds_width": 3,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 0, 0],
            },
            "bones": [kemik],
        }],
    }


def kolsuz_geometrisi():
    """Oyuncunun KOLSUZ govdesi. durus_govde_kemikleri() ile
    ayni kaynaktan, yani durusun govdesi degisince burasi da
    kendiliginden degisir.

    Doku YOK: render denetleyicisi `Texture.default` diyor, yani
    oyuncunun kendi derisi. Duruslarda ogrenilen kalip.        """
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + TAKAS_GOVDE,
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 3,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": durus_govde_kemikleri(),
        }],
    }


def takas_isaret_esyasi():
    """Isaret tasi. durus_esyasi() ile ayni kalip.

    `menu_category` BILEREK "equipment" birakildi. Bu esyanin
    yaratici menude gorunmesine gerek yok ama "gizli esya"nin
    dogru alan degerini TAHMIN ETMIYORUM: yanlis bir kategori
    esyayi oyunun kayit defterinden dusurur ve o zaman sahne hic
    baslamaz (v3.5'te 11 esya tam boyle sessizce kaydolmamisti).
    Menude fazladan bir satir, calismayan bir sahneden iyidir.
    """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + TAKAS_ISARET,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": TAKAS_ISARET},
                "minecraft:display_name": {"value": "Kol Takası (geçici)"},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                "minecraft:allow_off_hand": True,
            },
        },
    }


def takas_isaret_ikonu():
    """16x16: dusen bir kol. Solgun -- bu esya bir odul degil,
    sahnenin gecici bir parcasi."""
    p = {}
    renk = (120, 96, 72)
    for y in range(3, 13):
        for x in range(6, 10):
            p[(x, y)] = golge(renk, 1.0 if (y % 3) else 0.8) + (255,)
    for x in range(4, 12):
        p[(x, 14)] = golge(renk, 0.5) + (255,)   # yer cizgisi
    return p


def takas_varligi(kimlik, yercekimi):
    """Sahnenin sahte varliklari. o_sey_kilik_varligi() kalibi:
    yapay zeka yok, vurulamaz, itilemez, isimlendirilemez.

    TEK FARK yercekimi. Dusen kollar icin ACIK -- dusmeyi
    motorun kendisi yapsin, script her tick konum vermeye
    calismasin (o hem pahali hem de yalpalar). Gelen kanli kol
    icin KAPALI: onun yolu bir yorunge, script veriyor.

    `is_spawnable: False` -- bunlar oyuncak degil, sahnenin
    parcasi; envanteri yumurta ile kirletmesinler.             """
    return {
        "format_version": "1.16.0",
        "minecraft:entity": {
            "description": {
                "identifier": "pa:" + kimlik,
                "is_spawnable": False,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                # pa_kilik ailesinde: botlarimiz ve Ilkel Besli
                # sahnenin parcalarina saldirmasin.
                "minecraft:type_family": {"family": ["pa_bot", "pa_kilik"]},
                "minecraft:physics": {"has_gravity": bool(yercekimi),
                                      "has_collision": False},
                "minecraft:pushable": {"is_pushable": False,
                                       "is_pushable_by_piston": False},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": True,
                "minecraft:damage_sensor": {
                    "triggers": [{"cause": "all", "deals_damage": False}],
                },
                "minecraft:health": {"value": 1, "max": 1},
                "minecraft:collision_box": {"width": 0.1, "height": 0.1},
                # Dunya yeniden yuklenince kaybolmasin; temizligi
                # kol_takas.js yapiyor (donusum.js'teki kalip).
                "minecraft:persistent": {},
                "minecraft:nameable": {"allow_name_tag_renaming": False},
            },
        },
    }


def takas_istemci_varligi(kimlik, doku, animasyon):
    """Gorunum. o_sey_kilik.entity.json ile ayni: tek geometri,
    tek doku, vanilla render denetleyicisi, bir animasyon."""
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "pa:" + kimlik,
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/entity/" + doku},
                "geometry": {"default": "geometry." + kimlik},
                "render_controllers": ["controller.render.default"],
                "scripts": {"animate": ["oyna"]},
                "animations": {"oyna": animasyon},
            },
        },
    }


# ---- SAHNE ANIMASYONLARI ----
# Ikisi de MOLANG KULLANMIYOR, sadece anahtar kare. Sebep:
# molang sorgularinin hangisinin bu baglamda derlendigini
# BURADA olcemiyorum ve yanlis bir sorgu varligin cizimini
# komple bozar (v7.4'te ayni sebeple `is_riding` yazilmamisti).
#
# ---- DONUS ISARETI BILINMIYOR AMA ONEMLI DEGIL ----
# Bedrock ANIMASYONLARINDAKI donus isaretini burada
# olcemiyorum (v7.4'te duruslarin geometriye pisirilmesinin
# sebebi buydu). Burada sorun degil, cunku X ekseninde 90
# derece IKI YONDE DE kolu yatiriyor -- fark yalnizca hangi
# yone uzandigi. Olculdu: her iki isarette de kupun y araligi
# -2..+2 birim. Yani asagidaki +2'lik kaldirma iki durumda da
# dogru. Tahmin edilen bir sey yok.
#
# ---- SURE DUSMEYE UYDURULDU  (v7.9 duzeltmesi) ----
# Ilk surumde animasyon 1,0 saniyeydi ama kollar yalnizca 0,6
# blok dusuyor, yani ~7 tick'te yere degiyorlar. Kullanici
# tablette gordu: kol yere degdikten sonra 13 tick daha
# donmeye devam ediyordu. Sure 0,4 saniyeye indi -- kol tam
# indigi anda oturuyor.
#
# ---- YERDE NASIL DURUYOR ----
# Kullanici: "Toprak kolun eni kac onun yarisini dusun sanki
# yere birakilmis." Kolun eni 4 birim; yatinca merkezi
# yerden 2 birim yukarida olmali, yoksa yarisi topragin
# icinde kalir. `position` alanindaki +2 tam bu.
#
# SAG VE SOL AYRI: ayni animasyonu ikisine de verseydim iki
# kol yere BIREBIR ayni acida duserdi, kopya gibi gorunurdu.
# Yalnizca son yaw ayna simetrik (+25 / -25); dusus ayni.
def _takas_dusus(yon):
    return {
        "loop": "hold_on_last_frame",
        "animation_length": 0.4,
        "bones": {
            "kol": {
                "rotation": {
                    "0.0": [0, 0, 0],
                    "0.2": [50, 18 * yon, 12 * yon],
                    "0.4": [90, 25 * yon, 0],
                },
                "position": {
                    "0.0": [0, 0, 0],
                    "0.4": [0, 2, 0],
                },
            },
        },
    }


TAKAS_ANIMASYON = {
    "format_version": "1.8.0",
    "animations": {
        "animation.kol_dusen.dusus_sag": _takas_dusus(1),
        "animation.kol_dusen.dusus_sol": _takas_dusus(-1),
        "animation.kol_gelen.suzul": {
            "loop": True,
            "animation_length": 2.0,
            "bones": {
                "kol": {
                    "rotation": {
                        "0.0": [0, 0, 0],
                        "1.0": [0, 180, 0],
                        "2.0": [0, 360, 0],
                    },
                },
            },
        },
    },
}

# ---------------------------------------------------------- attachable
def attachable(kimlik, geometri="geometry.simsek_kol"):
    tam = "pa:" + kimlik
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": tam,
                "materials": {
                    "default": "entity_alphatest",
                    "enchanted": "entity_alphatest_glint",
                },
                "textures": {
                    "default": "textures/entity/" + kimlik,
                    "enchanted": "textures/misc/enchanted_item_glint",
                },
                "geometry": {"default": geometri},
                # v5.3: TUTUS ANIMASYONU KALDIRILDI. Var olmayan
                # bir kemige (rightitem) yaziyordu, yani dort
                # surumdur hicbir sey yapmiyordu. Gerekcesi
                # TUTUS_ANIM'in eski yerinde uzun uzun yazili.
                "render_controllers": ["controller.render.item_default"],
            }
        },
    }


# ============================================================ BOT
# Depodaki ILK ozel VARLIK (v4.22). Su ana kadar sadece esya vardi.
#
# Uc dosya birden uretiliyor ve ucu de birbirine bagli:
#   BP/entities/bot.json          davranis (AI, saglik, olaylar)
#   RP/entity/bot.entity.json     gorunum (model, doku, yumurta)
#   RP/models/entity/simsek_bot.geo.json   insansi model
#
# Elle yazilsalardi kimlik/geometri/doku adlarini uc yerde senkron
# tutmak gerekirdi; kol esyalarinda ogrendigimiz ders.
BOT_KIMLIK = "pa:bot"
BOT_AD = "Simsek Bot"
BOT_TR = "Şimşek Bot"
BOT_ANA = (58, 110, 165)      # tulum mavisi
BOT_TEN = (198, 138, 96)


# Kac gorsel cesit. Yirmi bot birbirinin AYNISI olunca hangisine
# ne soyledigin karisiyor; cesit sayesinde ayirt ediliyorlar.
# minecraft:variant + render controller dizisi vanilla yontemi.
BOT_CESIT = 6
BOT_KUTU = 16          # botun kendi kutusu (yerden topladigi buraya duser)
BOT_TOPLA_MENZIL = 6   # kac blok oteden esya alsin

# Her cesit: sac, gomlek, pantolon. Ten hepsinde ayni --
# ayirt edici olan KIYAFET, ekipteki rolleri degil.
BOT_RENKLER = [
    ((38, 32, 28),  (58, 110, 165), (48, 62, 96)),    # siyah sac, mavi
    ((126, 78, 32), (176, 72, 60),  (72, 54, 44)),    # kahve sac, kirmizi
    ((216, 188, 96),(86, 148, 82),  (60, 78, 54)),    # sari sac, yesil
    ((60, 56, 60),  (150, 120, 60), (74, 62, 40)),    # gri sac, hardal
    ((150, 60, 40), (120, 96, 168), (66, 56, 92)),    # kizil sac, mor
    ((30, 30, 34),  (200, 200, 206),(90, 92, 100)),   # siyah sac, beyaz
]
BOT_TEN = (198, 146, 108)

# Savas degerleri. Bunlar SADECE varlik JSON'una giriyor, script
# okumuyor -- o yuzden ayarlar.js'te degil burada.
#
# v4.29: 5 -> 7 hasar, 24 -> 25 can.
# v4.43: ikisi de IKIYE KATLANDI (14 hasar / 50 can).
# Karsilastirma: vanilla kurt 4 hasar / 8 can, demir golem
# 21 hasar / 100 can. Bot artik golemin canininin yarisinda
# ama ondan daha sert vuruyor -- otuz tane olabildigi icin
# bu bilincli bir guc tercihi.
# v4.43: kullanici istegi -- "botlar artik guclendi", ikisi de
# ikiye katlandi. Kalp cinsinden: 25 can = 12,5 kalp,
# 7 hasar = 3,5 kalp/vurus.
# ---- NORMAL BOTUN GUCU (v4.67) ----
# Kullanici: "normal botlari, ilkel besli disindaki normal
# botlari canini 40 yapalim, vuruslari da 25 olsun... yani cani
# 40 KALP, goturmesi de yani vuruslari da 25 olsun."
#
# Birim KALP olarak verildi, Bedrock CAN PUANI istiyor:
# 1 kalp = 2 can puani.
#
#   can    40 kalp -> 80 puan   (eskiden 25 kalp / 50 puan)
#   hasar  25 kalp -> 50 puan   (eskiden  7 kalp / 14 puan)
#
# Kiyas: Ilkel Besli'nin lideri Okazor 50 kalp vuruyor, yani
# normal bot onun tam yarisi. Vanilla olculer: iskelet/zombi
# 10 kalp, warden 250 kalp -- normal bot artik iskeleti tek
# vuruslta oldurur.
BOT_HASAR = 50   # = 25 kalp / vurus
BOT_CAN = 80     # = 40 kalp

# ---------------- ILKEL BESLI (v4.34) ----------------
# Kullanicinin getirdigi boss listesi. Orada bunlar SANA saldiran
# bes patrondu; burada SENIN yaninda dovusuyorlar. Sayilar aynen
# korundu, hedefleri ters cevrildi: debuff'lar oyuncuya degil
# botun VURDUGU seye gidiyor.
#
# Bunlar ayri bir VARLIK degil, pa:bot'un bilesen gruplari.
# Sebep: boyle yapinca defter, canta, teslim, odun/maden, derin
# tarama -- hepsi oldugu gibi calisiyor. Ayri varlik yapsaydik
# _bot_defteri.js bastan yazilirdi.
#
# alan: (anahtar, gorunen ad, can, hasar, secenekler)
#   ittirilmez : knockback_resistance 1.0
#   olcek      : minecraft:scale
#   menzilli   : ok atar (shooter + ranged_attack)
#   sicrar     : leap_at_target (Harkos'un "havada zipla"si)
#   hiz        : movement degeri
# ---- CANLAR KALP DEGIL HP OLARAK YAZILIR (v4.41) ----
# Kaynak listedeki "1750 HP" aslinda 1750 KALP demekmis
# (kullanici bildirdi). Minecraft'ta 1 kalp = 2 HP oldugu icin
# buraya iki kati yaziliyor:
#
#   listede        buraya      oyunda gorunen
#   1750 "HP"  ->  3500    ->  1750 kalp
#   1300       ->  2600    ->  1300 kalp
#
# Ilk surumde sayilar oldugu gibi girilmisti, yani herkes
# yarim canla dolasiyordu.
#
# HASAR DA IKIYE KATLANDI (v4.42, kullanici karari): kaynaktaki
# "23 Hasar" da kalp cinsindenmis.
#
#   listede    buraya    oyunda
#   23 hasar   46        23 kalp / vurus
#   50 hasar   100       50 kalp / vurus  <- Okazor
#
# Yani Okazor'un tek vurusu 50 kalp goturuyor: normal bir
# oyuncuyu (10 kalp) bes kez, kalp tavanindaki bir oyuncuyu
# (110 kalp) uc vuruste bitirir.
#
# rutbe: 1 = lider. Siranin TAMAMI kullanicinin karari (v4.36):
#   1 Okazor  2 Miskel  3 Kajaros  4 Raxxan  5 Harkos
# Bu ekipte buyu askeri rutbenin ustunde -- Miskel, 1750 canli
# Kajaros'un amiri. Can sirasiyla ortusmemesi bilincli.
# ---- SALDIRGANLIK (v4.60) ----
# Kullanici: "bana zombi vurdugunda ilk algilamadi, vurmadilar;
# ikincide algiladilar sonra vurmaya basladilar."
#
# Sebebi net: Ilkel Besli'de HIC hedef arama davranisi yoktu.
# Ellerindeki tek sey TEPKIYDI --
#   owner_hurt_by_target : sahibi vurulunca
#   owner_hurt_target    : sahibinin vurduguna
#   hurt_by_target       : kendisi vurulunca
# Yani ilk darbeyi yiyene kadar dusmanin varligindan haberleri
# yoktu. Kullanicinin gordugu gecikme tam olarak bu.
#
# NORMAL BOTA EKLENMIYOR, bilincli: v4.22'de "ormanda odun
# toplarken her koyune saldirmasin" diye kasitli birakilmisti.
# Ilkel Besli'nin isi ise koruma; ayrim burada.
#
# SADECE "monster" AILESI: koyun, inek, koylu, at guvende.
# Bir koruma ekibinin ciftligini dagitmasi ozellik degil zarar.
ILKEL_AV_YARICAP  = 20     # kac blok icinde dusman arasin
ILKEL_AV_TARAMA   = 4      # kac tick'te bir taransin (varsayilan 10)
ILKEL_AV_UNUTMA   = 200    # gozden kaybolunca kac tick kovalasin
ILKEL_SALDIRI_HIZ = 1.6    # melee_attack hizi (normal bot 1.4)

ILKEL = [
    ("kajaros", "Ilkel Muhafiz Kajaros",      3500, 46,
     dict(ittirilmez=True, olcek=1.15, hiz=0.30, rutbe=3)),
    ("miskel",  "Ilkel Sihirbaz Miskel",      2600, 28,
     dict(menzilli=True, olcek=1.0, hiz=0.30, rutbe=2)),
    # v4.83: 26 -> 28. Kullanici: "normal vurusu da 14+ olsun."
    # 28 hasar = 14 KALP. Bu sayi OYUNDA GORULEN TOPLAM; varlik
    # JSON'una yazilan taban daha dusuk, cunku elindeki asanin
    # hasari uzerine EKLENIYOR (bkz. ilkel_taban_hasar).
    ("harkos",  "Ilkel Suikastci El-Harkos",  2600, 28,
     dict(sicrar=True, olcek=0.95, hiz=0.42, rutbe=5)),
    # v4.55: guclendirildi. Sebep kullanicinin tespiti: en alt
    # rutbedeki El-Harkos 2600 can tasirken Golge Ajani 2000'de
    # kaliyordu. v4.56'da carpan 1,5'ten 1,4'e cekildi
    # ("bir tik dusur ama cok da dusurme").
    # TABAN 2600: Harkos'un ustunde kalmak zorunda.
    ("raxxan",  "Ilkel Zihin Bukucu Raxxan",  2800, 42,
     dict(ittirilmez=True, olcek=1.05, hiz=0.32, rutbe=4)),
    ("okazor",  "Ilkel Savasci Okazor",       2400, 100,
     dict(ittirilmez=True, olcek=1.25, hiz=0.34, rutbe=1)),
]

# Kullanicinin gonderdigi skin dosyalari (64x64, tek katman).
# Bot geometrisi zaten oyuncu skin duzeninde: kafa 0,0 / govde
# 16,16 / sag kol 40,16 / sol kol 32,48 / sag bacak 0,16 / sol
# bacak 16,48. Yani bu skinler dogrudan oturuyor, donusturmeye
# gerek yok.
#
# ESLESTIRMEYI DEGISTIRMEK: sadece bu tablodaki dosya adini
# degistir ve kol_uret.py'yi tekrar calistir.
#
# ---- ESLESTIRME ARTIK TAMAMEN ONAYLI ----
# v4.35'te bu tabloyu BEN TAHMIN ETTIM (skinlerin rengine ve
# havasina bakarak). Bes tahminden UCU yanlisti:
#   El-Harkos'u Kajaros sandim
#   Miskel'i Raxxan sandim
#   Raxxan'i Kajaros sandim
# Ders: skin bir GORUNUS degil KIMLIK; tahmin edilmez, sorulur.
#
# Bu tabloyu DEGISTIRME. Renklere bakip "su daha cok lider
# duruyor" diye duzeltmeye kalkma -- tam olarak o hata
# yapilmisti. Kullanici bes uyeyi de tek tek dogruladi.
#
# ONAYLI = kullanici oyunda gorup dogruladi
# tahmin  = hala benim tahminim, degisebilir
ILKEL_SKIN = {
    "harkos":  "1ee88523-image.png",
    "raxxan":  "84013466-image.png",
    "miskel":  "6e1e30e1-image.png",
    "okazor":  "228e7f78-image.png",
    "kajaros": "9837eeac-image.png",
}

# Hangi eslestirmeyi kullanici DOGRULADI. Tek kaynak burasi;
# onizleme betigi (onizle_ilkel.py) de burayi okuyor, yoksa
# "onayli mi tahmin mi" iki yerde yazili olur ve ayrisirdi.
ILKEL_SKIN_ONAY = {
    "harkos":  True,    # v4.38: "bu kajaros degil, el-harkos"
    "raxxan":  True,    # v4.39: "kajaros'tan raxxan'a, bu"
    "miskel":  True,    # v4.39: "raxxan olarak adlandirilan kisi aslinda miskel"
    "okazor":  True,    # v4.39: "ikisi de olduğu yerde kalsin, ikisi de dogru"
    "kajaros": True,
}
ILKEL_SKIN_KAYNAK = "/root/.claude/uploads/e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11"

# ---- ELLE CIZILMIS KOL DOKULARI ----
# kimlik -> kaynak dosya. Bos birakilan kollar uretilen (yer
# tutucu) dokuyla kaliyor.
#
# Dosya OYUNCU SKIN duzeninde 64x64 olmali: kol modelimizin
# tek kubu var ve UV'si (40,16) -- yani vanilla skinin SAG KOL
# bolgesi. Kullanicinin gonderdigi dosya tam oraya oturdu,
# donusturmeye gerek kalmadi.
# Deger: (dosya, yuva). Yuva "sag" ya da "sol".
#
# NEDEN YUVA: kullanici bir skin dosyasina IKI AYRI kol
# ciziyor -- sag kol yuvasina toprak, sol kol yuvasina buz.
# Bizim kol modelimizin tek kubu var ve hep (40,16)
# ornekliyor, yani sol yuvadaki kol oraya TASINMALI.
KOL_SKIN = {
    "kol_toprak": ("fa85d183-image.png", "sag"),
    "kol_buz":    ("fa85d183-image.png", "sol"),
}

# Oyuncu skininde kol kutularinin basladigi nokta.
# Ikisinin IC duzeni ayni (ust, alt, dogu, on, bati, arka),
# sadece baslangic noktalari farkli -- o yuzden 16x16'lik blogu
# oldugu gibi tasimak yetiyor.
KOL_YUVA = {"sag": (40, 16), "sol": (32, 48)}


def kol_skin_uygula(kimlik):
    """Kolun dokusunu elle cizilmis dosyayla degistirir.

    Iki sey yaziliyor:
      entity/<kol>.png  3B kolun dokusu (dosya oldugu gibi)
      item/<kol>.png    envanter ikonu -- ayni dosyanin ON YUZU
                        (44,20 4x12) 16x16 ikona ortalanarak

    Ikon neden turetiliyor: uretilen ikon duz renkti ve elde
    tutulan kolla alakasi yoktu. Ayni dokudan turetilince
    envanterdeki resim ile eldeki kol AYNI seye benziyor.       """
    kayit = KOL_SKIN.get(kimlik)
    if not kayit:
        return False
    dosya, yuva = kayit
    kaynak = os.path.join(ILKEL_SKIN_KAYNAK, dosya)
    if not os.path.exists(kaynak):
        print("UYARI: %s dokusu bulunamadi (%s), uretilen kullaniliyor"
              % (kimlik, kaynak))
        return False

    try:
        from PIL import Image
    except ImportError:
        print("UYARI: PIL yok, %s icin uretilen doku kullaniliyor" % kimlik)
        return False

    skin = Image.open(kaynak).convert("RGBA")
    kx, ky = KOL_YUVA[yuva]

    # Kol blogunu HEP (40,16)'ya tasi: modelimiz orayi ornekliyor.
    # Sag yuvadan geliyorsa bu bir kopyalama, sol yuvadan
    # geliyorsa gercek bir tasima.
    doku = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    doku.alpha_composite(skin.crop((kx, ky, kx + 16, ky + 16)), (40, 16))
    doku.save(os.path.join(RP, "textures/entity", kimlik + ".png"))

    # Ikon: ayni kolun ON YUZU (tasima sonrasi 44,20 4x12)
    ikon = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    ikon.alpha_composite(doku.crop((44, 20, 48, 32)), (6, 2))
    ikon.save(os.path.join(RP, "textures/item", kimlik + ".png"))
    return True


def kaynak_doku_kopyala(dosya, hedef):
    """kaynak_doku/ altindaki bir dokuyu oldugu gibi pakete
    kopyalar. Doner: kopyalandi mi.

    False donerse cagiran taraf URETILEN dokuyu ciziyor -- yani
    kaynak_doku/ silinse bile paket calisir, sadece o ikon yer
    tutucuya doner. iksir_dokusu_kopyala ile ayni sozlesme,
    sadece esleme tablosu olmadan.                            """
    kaynak = os.path.join(DOKU_KAYNAK, dosya)
    if not os.path.exists(kaynak):
        print("UYARI: kaynak doku yok (%s), uretilen kullaniliyor" % kaynak)
        return False
    import shutil
    shutil.copyfile(kaynak, hedef)
    return True


def iksir_dokusu_kopyala(kimlik, hedef):
    """Referans moddan cikarilan iksir ikonunu pakete kopyalar.

    Doner: kopyalandi mi. False donerse cagiran uretilen siseyi
    cizer -- yani kaynak_doku/ silinse bile paket calisir, sadece
    ikonlar yer tutucuya doner.

    PIL GEREKMIYOR: dosya zaten dogru boyutta ve bicimde, oldugu
    gibi kopyalaniyor. Kucultme bir kereye mahsus yapildi ve
    sonucu kaynak_doku/ altinda duruyor (bkz. NEREDEN.md) --
    her uretimde yeniden hesaplanacak bir sey degil.
    """
    dosya = IKSIR_DOKU.get(kimlik)
    if not dosya:
        return False
    kaynak = os.path.join(DOKU_KAYNAK, dosya)
    if not os.path.exists(kaynak):
        print("UYARI: iksir_%s icin kaynak doku yok (%s), uretilen kullaniliyor"
              % (kimlik, kaynak))
        return False
    import shutil
    shutil.copyfile(kaynak, hedef)
    return True


# NORMAL botun skini (Ilkel Besli'den ayri). Kullanici v4.43'te
# gonderdi: "botlar artik guclendigi icin gorunumu bu sekilde
# olacak". Ilkel Besli'nin kendi skinleri var, onlara dokunmuyor.
BOT_SKIN = "61d145cb-image.png"

# ---- ILKEL BESLI'NIN SILAHLARI (v4.48, v4.49'da uyeye ozel) ----
# Dokular kullanicinin elle cizdikleri.
#
# v4.48: tek balta, besinin de elinde ("bunlar genel olarak
#        ilkel beslinin tamaminda olsun").
# v4.49: kullanici El-Harkos'un asasini gonderdi ("bu normalde
#        de zaten el-harkos'un elinde bulunan bir esyaydi").
#        Yani silah artik UYEYE OZEL; balta varsayilan kaldi.
#
# HASAR BILESENI BILEREK YOK. Bedrock'ta elde silah tasimak
# mobun vurusuna eklenir; silah hasar tasisaydi uyelerin hasari
# sessizce artardi. O sayilar kullanicinin listesinden geliyor
# ve ayarlar.js ile testler onlari kilitliyor -- silah bir
# GORUNUM, bir denge degisikligi degil. Hasar degismesi
# istenirse ILKEL tablosundaki sayi degisir, silah degil.
#
# anahtar -> (esya kimligi, Turkce ad, kaynak dosya)
ILKEL_SILAHLAR = {
    "balta": ("ilkel_balta", "İlkel Baltası", "6893255b-image.png"),
    "asa":   ("ilkel_asa", "El-Harkos'un Asası", "14b8762c-image.png"),
}

# Kim neyi tasiyor. Burada YAZMAYAN herkes varsayilani tasiyor.
# Tek kaynak burasi: ayarlar.js'teki esleme de bunu yansitiyor
# ve ilkel.mjs ikisinin ayni seyi soyledigini sinliyor.
ILKEL_SILAH = {
    "harkos": "asa",
}
ILKEL_SILAH_VARSAYILAN = "balta"


def ilkel_silahi(anahtar):
    """Uyenin tasidigi silahin (kimlik, ad, kaynak) uclusu."""
    return ILKEL_SILAHLAR[ILKEL_SILAH.get(anahtar, ILKEL_SILAH_VARSAYILAN)]

# Turkce gorunen adlar (JSON'da ASCII tutuluyor, dil dosyasinda degil)
ILKEL_TR = {
    "okazor":  "İlkel Savaşçı Okazor",
    "kajaros": "İlkel Muhafız Kajaros",
    "raxxan":  "İlkel Zihin Bükücü Raxxan",
    "miskel":  "İlkel Sihirbaz Miskel",
    "harkos":  "İlkel Suikastçı El-Harkos",
}


def ilkel_taban_hasar(anahtar, hasar):
    """Varlik JSON'una yazilacak minecraft:attack.damage.

    ---- BEDROCK KURALI (v4.83'te olculdu) ----
    Elde tutulan esyanin minecraft:damage'i mobun taban
    vurusuna EKLENIYOR, yerine gecmiyor -- zombinin demir
    kilicla daha sert vurmasinin sebebi bu.

    v4.83'e kadar bu hic sorun degildi cunku silahlarin
    HICBIRINDE damage yoktu; ilkel.mjs de "silahta hasar
    olmasin" diye bir bekci tutuyordu. Asaya 14 hasar verilince
    o bekci hakli cikti: dokunulmasaydi El-Harkos sessizce
    26'dan 40'a firlardi.

    Cozum sayilari gizlemek degil, ACIKCA bolmek: ILKEL
    tablosundaki sayi OYUNDA GORULEN toplam, buradan cikan
    sayi taban. Kullanicinin gordugu sayi hep tablodaki.

    Silahsiz kalirsa (birisi asasini alirsa) vurusu tabana
    duser -- bu dogru davranis, asa gercekten bir silah.     """
    silah_kimlik, _ad, _kaynak = ilkel_silahi(anahtar)
    ek = SILAH_HASARI.get(silah_kimlik, 0)
    return max(1, hasar - ek)


def ilkel_gruplari():
    """Bes uyenin bilesen gruplari. Her biri cani, hasari ve
    dovus stilini degistiriyor; geri kalan her sey (takip, canta,
    is yapma) normal bottan geliyor."""
    gruplar = {}
    for anahtar, _ad, can, hasar, sec in ILKEL:
        g = {
            "minecraft:health": {"value": can, "max": can},
            "minecraft:attack": {"damage": ilkel_taban_hasar(anahtar, hasar)},
            "minecraft:movement": {"value": sec.get("hiz", 0.32)},
            "minecraft:scale": {"value": sec.get("olcek", 1.0)},
        }
        if sec.get("ittirilmez"):
            # Listede "geri itilmeye bagisikli" yazan uyeler
            g["minecraft:knockback_resistance"] = {"value": 1.0}
        if sec.get("menzilli"):
            # Miskel mermi atar. Vanilla ok kullaniliyor: yeni bir
            # mermi varligi yapmak yeni bir kayit riski demek.
            g["minecraft:shooter"] = {"def": "minecraft:arrow"}
            g["minecraft:behavior.ranged_attack"] = {
                "priority": 2,
                "burst_shots": 1,
                "charge_charged_trigger": 0.0,
                "charge_shoot_trigger": 2,
                "attack_interval_min": 1,
                "attack_interval_max": 2,
                "attack_radius": 20,
            }
        if sec.get("sicrar"):
            # "Havada kisa mesafe ziplama": vanilla ornumcek/ocelot
            # bunu leap_at_target ile yapiyor.
            g["minecraft:behavior.leap_at_target"] = {
                "priority": 3,
                "target_dist": 5,
                "yd": 0.55,
                "must_be_on_ground": False,
            }
        # ---- SILAH ELDE (v4.48, v4.59'da DUZELTILDI) ----
        #
        # v4.48'de yalniz minecraft:equippable yazilmisti ve
        # yuvasi "slot.weapon.mainhand" metniydi. OYUNDA HIC
        # CALISMADI: bu bilesen yuvayi SAYI olarak bekliyor
        # (kutu yuva indeksi), metin verilince bilesen
        # ayristirilamiyor. Sonuc: script tarafinda
        # getComponent("minecraft:equippable") undefined
        # donuyor, silah ele hic konulmuyor ve tek belirti
        # Content Log'a dusen bir satir oluyor.
        #
        # Asil yol minecraft:equipment: vanilla zombiye kilic
        # veren mekanizma bu. Ganimet tablosu doguşta calisiyor,
        # script gerektirmiyor, dunya yeniden yuklenince de
        # duruyor.
        g["minecraft:equipment"] = {
            "table": "loot_tables/equipment/ilkel_%s.json" % anahtar
        }
        # equippable YINE duruyor ama artik dogru bicimde:
        # script tarafindaki tazeleme yolu (silah duserse geri
        # koyma) buna bagli.
        g["minecraft:equippable"] = {
            "slots": [{
                "slot": 0,
                "accepted_items": ["pa:" + ilkel_silahi(anahtar)[0]],
            }]
        }
        gruplar["pa:ilkel_" + anahtar] = g
    return gruplar


# ---- SILAHLARIN VURUS HASARI (v4.83, v4.84) ----
# Ikisi de bir sure "tamamen olu esya"ydi: minecraft:damage
# bilesenleri yoktu, yani oyuncunun elinde YUMRUK kadar
# vuruyorlardi (1 hasar). Kullanici ikisini de ayri ayri
# bildirdi.
#
#   ASA   14 hasar =  7 kalp  (elmas kilicin iki kati)
#   BALTA 16 hasar =  8 kalp  (netherite baltanin 1,6 kati)
#
# ayarlar.js'teki ikizleri var; test esitligi kilitliyor.
#
# DIKKAT -- BU SAYILAR MOBUN VURUSUNA EKLENIYOR. Bedrock'ta
# elde tutulan esyanin damage'i taban vurusun USTUNE biniyor.
# O yuzden varlik JSON'una yazilan sayi ILKEL tablosundakinden
# silahin hasari kadar DUSUK (bkz. ilkel_taban_hasar).
ASA_HASAR = 14
BALTA_HASAR = 16

# esya kimligi -> vurus hasari. Silahsiz bir uye eklenirse
# burada yazmaz ve tabani oldugu gibi kalir.
SILAH_HASARI = {
    "ilkel_asa": ASA_HASAR,
    "ilkel_balta": BALTA_HASAR,
}


def ilkel_silah_esyasi(kimlik, ad):
    """Bir uyenin elindeki silah.

    Envanterde de gorunuyor (menu_category equipment) cunku
    yumurtayla elle deneme yapabilmek isteniyor -- ayni sebeple
    varliklar da is_spawnable.

    ---- ASA ARTIK GERCEK BIR SILAH (v4.83) ----
    Kullanici: "El-Harkos'un asasi 4 surumdur calismiyor...
    normal vurusu da 14+ olsun."

    Iki ayri eksik vardi:
      1. minecraft:damage YOKTU. Yani oyuncu asayi eline alip
         vurdugunda hasari YUMRUK kadardi (1). "Silah bir
         GORUNUM" notu bunu bilerek boyle birakmisti -- ama o
         not El-Harkos'un elindeki silah icin dogruydu; onun
         hasari zaten varlik JSON'undaki minecraft:attack'tan
         geliyor ve esyanin sayisi oraya karismiyor.
         Oyuncunun elinde ise esyanin sayisi TEK belirleyici.
      2. Asa zinciri (yere serme + mezar) yalnizca bes uyeden
         biri vurunca calisiyordu; oyuncuya hic bagli degildi.
         O kisim asa.js:asaOyuncuKancasi ile eklendi.

    BALTA DEGISMEDI: onun sayisi yok, cunku onu tasiyan dort
    uyenin hasari varlik JSON'unda ve orada kalmali.           """
    bilesenler = {
        "minecraft:icon": {"texture": kimlik},
        "minecraft:display_name": {"value": ad},
        "minecraft:max_stack_size": 1,
        "minecraft:hand_equipped": True,
        "minecraft:allow_off_hand": False,
    }
    if kimlik in SILAH_HASARI:
        bilesenler["minecraft:damage"] = SILAH_HASARI[kimlik]
        # Dayaniklilik YOK: patron silahi kullanildikca
        # kirilmamali. Bileseni hic yazmamak "sonsuz" demek.

    # ---- BALTA GERCEKTEN BALTA OLSUN (v4.84) ----
    # Kullanici "tamamen olu bir esya" dedi ve hasar tek
    # eksigi degildi: balta ODUN DA KESMIYORDU, cunku
    # minecraft:digger bileseni yoktu. Elinde balta gibi
    # duran ama agaca vurunca yumruk kadar is goren bir sey.
    #
    # Hizlar netherite baltadan (9) bir tik yukari. Asaya
    # kazma yetenegi VERILMEDI: o bir silah degil, bir asa.
    if kimlik == "ilkel_balta":
        bilesenler["minecraft:digger"] = {
            "use_efficiency": True,
            "destroy_speeds": [
                # Yazim Microsoft belgelerindeki ornekle BIREBIR:
                # {"speed": 6, "block": {"tags": "query.any_tag('wood')"}}
                # 'wood' etiketi kutuk ve tahtayi birden kapsiyor.
                {"block": {"tags": "query.any_tag('wood')"},
                 "speed": 12},
            ],
        }

    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + kimlik,
                "menu_category": {"category": "equipment"},
            },
            "components": bilesenler,
        },
    }


def ilkel_varliklari():
    """Bes uyenin SUNUCU varliklari.

    ---- NEDEN AYRI VARLIK (v4.35) ----
    v4.34'te besi de pa:bot'un bilesen gruplariydi. Kullanici bes
    ayri SKIN gonderince bu yetmedi: bir varligin tek istemci
    tanimi, tek dokusu vardir. Cesitlere gore doku secmek icin
    "arrays + query.variant" ozel render controller'i gerekiyor
    -- v4.28'de tam o denendi ve BOT GORUNMEZ OLDU (bkz.
    bot_istemci_varligi'ndaki not).

    O yuzden yol degistirildi: her uye kendi varligi, kendi
    istemci tanimi, KENDI TEK DOKUSU. Cizim yolu botunkiyle
    birebir ayni -- controller.render.default + tek texture.
    Yani calistigi bilinen kurulum bes kez tekrarlaniyor,
    calismadigi bilinen kurulum hic kullanilmiyor.

    Riski de dar: bes uyenin cizimi bozulsa bile NORMAL BOT
    etkilenmez, cunku onun dosyalarina dokunulmadi.

    Geri kalan her sey pa:bot'tan geliyor (aile, evcillestirme,
    takip, savas, yerden toplama) -- yani defter, canta, teslim,
    odun/maden ve derin tarama bu bes uyede de calisiyor.        """
    import copy
    varliklar = {}
    temel = bot_sunucu_varligi()
    gruplar = ilkel_gruplari()

    for anahtar, ad, _can, _hasar, sec in ILKEL:
        v = copy.deepcopy(temel)
        govde = v["minecraft:entity"]
        govde["description"]["identifier"] = "pa:" + anahtar

        # Uyenin istatistikleri TEMEL bilesen olarak giriyor;
        # grup olarak degil, cunku bu varlik zaten o uye.
        govde["components"].update(gruplar["pa:ilkel_" + anahtar])

        # ---- v4.66: BILESEN GRUPLARI ISTATISTIGI EZIYORDU ----
        # Kullanici: "Okazor 50 kalp vurdugunu soyledin ama
        # iskeleti IKI vuruslta oldurdu, tek vuruslta olmesi
        # gerekiyordu, verdigin bilgi ile oyundaki hasar
        # uyusmuyor."
        #
        # Haklıydi. Bu varliklar NORMAL BOT'un govdesinin
        # kopyasi (yukaridaki deepcopy) ve normal botun
        # gruplari da birlikte geliyor:
        #
        #   components         : minecraft:attack  damage 100  <- uyenin
        #   pa:savas grubu     : minecraft:attack  damage 14   <- botun
        #   pa:takip grubu     : minecraft:movement 0.32       <- botun
        #
        # Bedrock'ta bir bilesen grubu EKLENINCE icindekiler
        # temel bilesenlerin USTUNE yaziliyor. Yani uye savasa
        # girer girmez hasari 14'e (7 kalp) dusuyordu; ustelik
        # saldirganlik hedefi de (v4.60) pa:savas icinde, yani
        # "saldirgan olmak" ile "zayif olmak" ayni anda geliyordu.
        #
        # Iskelet 20 can: 14 hasar oldurmuyor (6 can kaliyor),
        # ikinci vurus olduruyor. Kullanicinin gordugu tam bu.
        # 100 hasarla tek vuruslta olurdu.
        #
        # Ayni sey hizda: pa:takip herkesi 0.32'ye esitliyordu,
        # yani El-Harkos'un 0.42'si ve Raxxan'in "hizli golge
        # ajani" kimligi takipteyken yok oluyordu.
        #
        # KURAL: uyenin ISTATISTIGI neyse o gecerlidir; hicbir
        # grup onu golgeleyemez. Sadece pa:bekle'nin movement 0
        # kaliyor -- o bir istatistik degil, DURUM ("bekle"
        # demek "kimildama" demek).
        for grup, ic in govde.get("component_groups", {}).items():
            if grup == "pa:bekle":
                continue
            for bilesen in ("minecraft:attack", "minecraft:health",
                            "minecraft:movement"):
                if bilesen in ic and bilesen in govde["components"]:
                    del ic[bilesen]

        # ---- SALDIRGANLIK (v4.60) ----
        # Bu blok SADECE Ilkel Besli'ye giriyor; normal bot
        # tepkisel kaliyor.
        savas = govde["component_groups"].get("pa:savas")
        if savas is not None:
            savas["minecraft:behavior.nearest_attackable_target"] = {
                "priority": 1,
                "within_radius": ILKEL_AV_YARICAP,
                "must_see": True,
                "must_see_forget_ticks": ILKEL_AV_UNUTMA,
                "reselect_targets": True,
                "scan_interval": ILKEL_AV_TARAMA,
                "entity_types": [{
                    "filters": {
                        "test": "is_family", "subject": "other",
                        "value": "monster",
                    },
                    "max_dist": ILKEL_AV_YARICAP,
                }],
            }
            m = savas.get("minecraft:behavior.melee_attack")
            if m is not None:
                m["speed_multiplier"] = ILKEL_SALDIRI_HIZ
                m["track_target"] = True
        # within_radius tek basina yetmiyor: takip menzili
        # follow_range'den geliyor ve varsayilani daha dar.
        # Ikisi ayrisirsa bot 20 blokta hedefi SECIYOR ama
        # 16'da unutuyor -- sinsi bir "bazen kovaliyor" hatasi.
        govde["components"]["minecraft:follow_range"] = {
            "value": ILKEL_AV_YARICAP,
            "max": ILKEL_AV_YARICAP,
        }

        # Cesit gruplari anlamsiz: her uyenin tek gorunumu var.
        for i in range(BOT_CESIT):
            govde["component_groups"].pop("pa:tip%d" % i, None)
        dogum = govde["events"]["minecraft:entity_spawned"]["sequence"]
        govde["events"]["minecraft:entity_spawned"]["sequence"] = [
            adim for adim in dogum if "randomize" not in adim
        ]

        varliklar[anahtar] = v
    return varliklar


def ilkel_istemci_varliklari():
    """Bes uyenin ISTEMCI tanimlari.

    DIKKAT: burada da ozel render controller YOK. Botunkiyle
    ayni: controller.render.default + tek doku. Tek fark doku
    dosyasinin adi.                                              """
    tanimlar = {}
    for anahtar, ad, _can, _hasar, sec in ILKEL:
        tanimlar[anahtar] = {
            "format_version": "1.10.0",
            "minecraft:client_entity": {
                "description": {
                    "identifier": "pa:" + anahtar,
                    "materials": {"default": "entity_alphatest"},
                    "textures": {"default": "textures/entity/ilkel_" + anahtar},
                    "geometry": {"default": "geometry.simsek_bot"},
                    "render_controllers": ["controller.render.default"],
                    "spawn_egg": {
                        "base_color": "#4a1010",
                        "overlay_color": "#d8b040",
                    },
                    "scripts": {"animate": ["yuru"]},
                    "animations": {"yuru": "animation.simsek_bot.yuru"},
                }
            },
        }
    return tanimlar


# ============================================================
# GOZ LAZERI POZU  (v4.70)
#
# Kullanici: "goz lazeri attiginda ellerim one dogru, yukariya
# dogru degil, gorseldeki gibi degil, birazcik one dogru
# yapsin. Ayrica birazcik beden tarafim birazcik egilsin."
#
# ---- REFERANSTA BU VAR VE OKUNDU ----
# BoraLo Nitroksin Mod, lazer fonksiyonunun son satirinda
# oyuncuya bir poz oynatiyor:
#   playanimation @s animation.pa_yeni_haraket.nitroksin_lazer
# Animasyonun kendisi (pa_yeni_haraket.animation.json):
#   body     0 -> [20, 0, 0]
#   head  -2.5 -> [-25, 0, 0] -> [-20, 0, 0]
#   leftArm  0 -> [-136.1, -32.4,  29.2]
#   rightArm 0 -> [-133.1,  27.1, -23.1]
#
# Yani onlarin kollari YUKARI ve GERIYE kalkiyor (kullanicinin
# gonderdigi gorseldeki poz). Kullanici bunu istemedigini
# soyledi: "yukariya dogru degil, gorseldeki gibi degil".
#
# ---- BIZIM POZ ----
# Kol X ekseninde -90 tam yatay ONE demek. Referansin -136'si
# yataydan 46 derece daha geriye, yani yukari. Biz -82
# kullaniyoruz: yataydan biraz asagida, "one uzatilmis" hali.
# Z ekseninde kucuk bir aci kollari govdeden ayiriyor, yoksa
# dirsekler bedene giriyor.
#
# Govde 20 degil 14: "birazcik egilsin" dendi.
#
# BAS NEDEN TERS DONUYOR: govde one egilince kafa da onunla
# geliyor ve oyuncu yere bakiyormus gibi duruyor. Lazer ise
# getViewDirection()'i takip ediyor, yani nisan degismiyor --
# goruntu ile isin ayrisiyordu. Bas govdenin tam TERSI kadar
# donduruluyor, ikisi birbirini goturuyor.
# ============================================================
LAZER_ANIM_ADI    = "animation.simsek.goz_lazeri"
LAZER_ANIM_GOVDE  = 14      # derece, one egilme
LAZER_ANIM_KOL_X  = -82     # -90 = tam yatay one
LAZER_ANIM_KOL_Z  = 9       # govdeden ayirma acisi
LAZER_ANIM_GIRIS  = 0.2     # poza girme suresi (saniye)
LAZER_ANIM_CIKIS  = 0.3     # cikma suresi (saniye)

# Isin suresiyle AYNI olmali. ayarlar.js LAZER_SURE = 600.
# Iki yerde yazili bir sayi -- test ikisinin esitligini
# kilitliyor (bu depoda dorduncu kez ayni ders).
LAZER_ANIM_TICK   = 600


# ============================================================
# STANDARD GALACTIC ALPHABET  (v4.71)
#
# Minecraft'in BUYU MASASINDA kullandigi alfabe. Kullanici
# efsane yapisinin yazitinda bunu istedi.
#
# Harfler HATIRDAN CIZILMEDI: oyunun kendi font atlasi
# (kaynak_doku/ascii_sga.png, 128x128, 16x16 hucre, harf basina
# 8x8 piksel, ASCII yerlesimi) okunup bit haritasina ceviriliyor.
#
# Neden onemli: uydurma harflerle yazit COZULEMEZ olurdu.
# Internetteki SGA tablosuyla ugrasacak biri bizim cizdigimiz
# seyi tanimaz. Atlas oyunun kendisinden geldigi icin yazit
# gercekten cozulebiliyor.
#
# Uretilen dosya: scripts/yetenekler/_sga.js
# ============================================================
SGA_ATLAS = os.path.join(DOKU_KAYNAK, "ascii_sga.png")
SGA_BOY = 8          # harf basina piksel (atlastan geliyor)


def sga_bitleri():
    """Atlastan 26 harfin bit haritasini okur.

    Donen: {"A": ["..##....", ...8 satir...], ...}
    Atlas yoksa bos sozluk -- efsane yaziti kapanir, paket
    calismaya devam eder.                                     """
    if not os.path.exists(SGA_ATLAS):
        print("UYARI: %s yok, SGA yaziti uretilemiyor" % SGA_ATLAS)
        return {}
    try:
        from PIL import Image
    except ImportError:
        print("UYARI: PIL yok, SGA yaziti uretilemiyor")
        return {}

    im = Image.open(SGA_ATLAS).convert("RGBA")
    px = im.load()
    harfler = {}
    for i in range(26):
        c = chr(ord("A") + i)
        k = ord(c)
        sx, sy = (k % 16) * SGA_BOY, (k // 16) * SGA_BOY
        satirlar = []
        for y in range(SGA_BOY):
            satirlar.append("".join(
                "#" if px[sx + x, sy + y][3] > 60 else "."
                for x in range(SGA_BOY)))
        harfler[c] = satirlar
    return harfler


def sga_modulu():
    """_sga.js: 26 harfin bit haritasi, script tarafi icin."""
    harfler = sga_bitleri()
    satir = []
    satir.append("/* URETILEN DOSYA -- ELLE DUZENLEME.")
    satir.append("   Kaynak: kaynak_doku/ascii_sga.png (Minecraft'in kendi")
    satir.append("   buyu masasi fontu). Ureten: kol_uret.py sga_modulu().")
    satir.append("")
    satir.append("   Her harf %d satir, her satir %d karakter:" % (SGA_BOY, SGA_BOY))
    satir.append("   '#' = blok konur, '.' = bos.")
    satir.append("")
    satir.append("   Harfler hatirdan cizilmedi -- uydurma harflerle yazit")
    satir.append("   COZULEMEZ olurdu. Bkz. kaynak_doku/NEREDEN.md.        */")
    satir.append("export const SGA_BOY = %d;" % SGA_BOY)
    satir.append("")
    satir.append("export const SGA = {")
    for c in sorted(harfler):
        ic = ", ".join('"%s"' % r for r in harfler[c])
        satir.append('  %s: [%s],' % (c, ic))
    satir.append("};")
    satir.append("")
    return "\n".join(satir)


def lazer_animasyonu():
    """Goz lazeri atarken oyuncunun aldigi poz.

    playAnimation() ile oynatiliyor; oyuncunun istemci
    varligina ya da bir animasyon denetleyicisine KAYDEDILMESI
    gerekmiyor -- tek seferlik calisiyor. Referans da boyle
    yapiyor (playanimation @s ...).

    Poz sonunda notr'a donuyor: donmeseydi isin bitince oyuncu
    kollari havada donmus kalirdi.                             """
    uzunluk = round(LAZER_ANIM_TICK / 20.0, 3)
    # TAM SAYIYSA int yaz: 600 tick = 30.0 saniye ve Python
    # bunu "30.0" diye seri hale getiriyor, ama animation_length
    # okunurken 30 oluyor. Kare ANAHTARI "30.0", aranan anahtar
    # "30" -- ikisi ayrisiyor. Oyun ikisini de sayi olarak
    # okuyor, yani oyunda sorun cikmiyor; ama son kareyi
    # anahtardan arayan her sey (testimiz dahil) bulamiyor.
    # 510 tick = 25,5 saniyeyken bu hic gorulmedi, cunku
    # "25.5" iki tarafta da ayni yaziliyordu.
    if uzunluk == int(uzunluk):
        uzunluk = int(uzunluk)
    gir = LAZER_ANIM_GIRIS
    cik = round(uzunluk - LAZER_ANIM_CIKIS, 3)

    def kanal(poz):
        # notr -> poz -> (tut) -> notr
        return {
            "rotation": {
                "0.0": [0, 0, 0],
                str(gir): poz,
                str(cik): poz,
                str(uzunluk): [0, 0, 0],
            }
        }

    return {
        "format_version": "1.8.0",
        "animations": {
            LAZER_ANIM_ADI: {
                "loop": False,
                "animation_length": uzunluk,
                "bones": {
                    "body":     kanal([LAZER_ANIM_GOVDE, 0, 0]),
                    # Govdenin tersi: bakis yonu goruntuyle ayrismasin
                    "head":     kanal([-LAZER_ANIM_GOVDE, 0, 0]),
                    "rightArm": kanal([LAZER_ANIM_KOL_X, 0, -LAZER_ANIM_KOL_Z]),
                    "leftArm":  kanal([LAZER_ANIM_KOL_X, 0, LAZER_ANIM_KOL_Z]),
                },
            }
        },
    }


def bot_sunucu_varligi():
    """format_version 1.16.0: varliklar icin en genis desteklenen
    surum ve hicbir deneysel ayar istemiyor.

    ---- SAVAS: KOPEK MODELI (v4.28) ----
    Kullanicinin tarifi: "kopek evcillestirirsin ya, birine
    vurdugun zaman ona saldiriyor". Vanilla kurdun kullandigi
    UC davranis tam olarak bu:

      owner_hurt_target     sahibi bir seye VURUNCA bot ona saldirir
      owner_hurt_by_target  sahibine bir sey VURUNCA bot ona saldirir
      hurt_by_target        botun kendisine vurana karsilik verir

    Ucu de SAHIP ister; sahip tameable.tame() ile atandi ve takip
    calistigina gore baglandi. Yani bu davranislar da baglanmali.

    Botlar birbirini dovmesin diye hedef suzgecinde pa_bot ailesi
    disarida. OYUNCULAR disarida DEGIL: "benim icin savassinlar"
    denince arkadasinin da dahil olmasi bekleniyor.

    Savas bir GRUP icinde, cunku kapatilabilmesi lazim -- ormanda
    odun toplarken botun her koyuna saldirmasi istenmez. pa:savas
    ve pa:barisci gruplari olaylarla degistiriliyor.

    ---- CESITLER ----
    minecraft:variant + component_group. entity_spawned olayinda
    rastgele bir cesit ekleniyor; istemci tarafi query.variant ile
    dokuyu seciyor.
    """
    gruplar = {
        "pa:evcil": {"minecraft:is_tamed": {}},
        "pa:takip": {"minecraft:movement": {"value": 0.32}},
        # Hiz 0 = yerinde durur; AI hedefleriyle ugrasmaya gerek yok
        "pa:bekle": {"minecraft:movement": {"value": 0.0}},

        "pa:savas": {
            "minecraft:attack": {"damage": BOT_HASAR},
            "minecraft:behavior.melee_attack": {
                "priority": 2,
                "speed_multiplier": 1.4,
                "track_target": True,
                "reach_multiplier": 1.2,
            },
            # Sahibi bir seye vurdu -> bot da ona
            "minecraft:behavior.owner_hurt_target": {
                "priority": 1,
                "entity_types": [{"filters": {
                    "test": "is_family", "subject": "other",
                    "operator": "!=", "value": "pa_bot",
                }}],
            },
            # Sahibine vuruldu -> bot vurana
            "minecraft:behavior.owner_hurt_by_target": {
                "priority": 1,
                "entity_types": [{"filters": {
                    "test": "is_family", "subject": "other",
                    "operator": "!=", "value": "pa_bot",
                }}],
            },
            # Botun kendisine vuruldu -> karsilik verir
            "minecraft:behavior.hurt_by_target": {
                "priority": 2,
                "entity_types": [{"filters": {
                    "test": "is_family", "subject": "other",
                    "operator": "!=", "value": "pa_bot",
                }}],
            },
        },
        # Bos grup: savas bilesenlerini kaldirmak icin
        "pa:barisci": {},
    }
    for i in range(BOT_CESIT):
        gruplar["pa:tip%d" % i] = {"minecraft:variant": {"value": i}}

    # v4.35: Ilkel Besli artik AYRI VARLIK (her birinin kendi
    # skini olsun diye). Bilesen gruplari buradan cikti.

    # entity_spawned: takip + savas + rastgele cesit
    cesit_secimi = [{"weight": 1, "add": {"component_groups": ["pa:tip%d" % i]}}
                    for i in range(BOT_CESIT)]

    return {
        "format_version": "1.16.0",
        "minecraft:entity": {
            "description": {
                "identifier": BOT_KIMLIK,
                # Yumurta VAR: tablette elle test etmenin en kolay yolu
                "is_spawnable": True,
                "is_summonable": True,
                "is_experimental": False,
            },
            "component_groups": gruplar,
            "components": {
                # pa_bot ailesi: botlarin birbirini dovmemesi buna bagli
                "minecraft:type_family": {"family": ["pa_bot", "mob"]},
                "minecraft:health": {"value": BOT_CAN, "max": BOT_CAN},
                "minecraft:collision_box": {"width": 0.6, "height": 1.8},
                "minecraft:physics": {},
                "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
                "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
                "minecraft:nameable": {},
                # Kaybolmasin: bot kalici, chunk bosalinca silinmemeli
                "minecraft:persistent": {},
                "minecraft:movement": {"value": 0.32},
                "minecraft:movement.basic": {},
                "minecraft:jump.static": {"jump_power": 0.42},
                "minecraft:can_climb": {},
                # Yol bulmayi ACAN bilesen: bu olmadan follow_owner yurumez
                "minecraft:navigation.walk": {
                    "can_path_over_water": True,
                    "avoid_water": True,
                    "avoid_damage_blocks": True,
                    "can_pass_doors": True,
                    "can_open_doors": True,
                    "can_jump": True,
                },
                "minecraft:tameable": {
                    "probability": 1.0,
                    "tame_items": ["minecraft:bone"],
                    "tame_event": {"event": "pa:evcillestir", "target": "self"},
                },
                # Suda bogulmasin -- oncelik 0, her seyin onunde
                "minecraft:behavior.float": {"priority": 0},
                "minecraft:behavior.follow_owner": {
                    "priority": 4,
                    "speed_multiplier": 1.2,
                    "start_distance": 4,
                    "stop_distance": 2,
                },
                # ---- YERDEN ESYA TOPLAMA (v4.33) ----
                # Fikir uc referans modun ortak varligindan geldi:
                # hepsinde karakterler koylu klonuydu ve koyluler
                # yerdeki esyayi behavior.pickup_items ile aliyor.
                # Onlarda bu bir yan etkiydi (koyluyu kopyalayinca
                # geldi); burada BILINCLI: sen blok kirinca yere
                # dusen esyayi bot topluyor ve ekip cantasina
                # aktariliyor (_bot_defteri.js:cantayaAktar).
                #
                # inventory SART: pickup_items alacagi yeri
                # burada buluyor. private=True -> oyuncu botun
                # kutusunu acamaz; esya cantaya script ile giriyor,
                # yoksa iki ayri depo olurdu.
                "minecraft:inventory": {
                    "inventory_size": BOT_KUTU,
                    "private": True,
                },
                "minecraft:behavior.pickup_items": {
                    "priority": 5,
                    "max_dist": BOT_TOPLA_MENZIL,
                    "goal_radius": 1.5,
                    "speed_multiplier": 1.3,
                    "pickup_based_on_chance": False,
                    "can_pickup_any_item": True,
                    # v4.48: topladigi seyi ELINE ALMASIN.
                    # Varsayilan davranista mob buldugu kilici/
                    # baltayi eline geciriyor -- Ilkel Besli'nin
                    # baltasi boylece ilk odun parcasinda
                    # degisirdi. Toplananin yeri zaten kutu;
                    # oradan ekip cantasina aktariliyor.
                    "can_pickup_to_hand_or_equipment": False,
                },
                "minecraft:behavior.look_at_player": {
                    "priority": 8, "look_distance": 8, "probability": 0.4
                },
                "minecraft:behavior.random_look_around": {"priority": 9},
            },
            "events": {
                "minecraft:entity_spawned": {
                    "sequence": [
                        {"add": {"component_groups": ["pa:takip", "pa:savas"]}},
                        {"randomize": cesit_secimi},
                    ]
                },
                "pa:evcillestir": {"add": {"component_groups": ["pa:evcil"]}},
                # Script bu olaylari triggerEvent ile calistiriyor.
                # Adlar ayarlar.js'teki BOT_OLAY_* ile AYNI olmali.
                "pa:takip": {
                    "remove": {"component_groups": ["pa:bekle"]},
                    "add": {"component_groups": ["pa:takip"]},
                },
                "pa:bekle": {
                    "remove": {"component_groups": ["pa:takip"]},
                    "add": {"component_groups": ["pa:bekle"]},
                },
                "pa:savas_ac": {
                    "remove": {"component_groups": ["pa:barisci"]},
                    "add": {"component_groups": ["pa:savas"]},
                },
                "pa:savas_kapat": {
                    "remove": {"component_groups": ["pa:savas"]},
                    "add": {"component_groups": ["pa:barisci"]},
                },
            },
        },
    }


def bot_istemci_varligi():
    """DIKKAT -- BURAYA DOKUNMA.

    v4.28'de cesit basina ayri doku denendi: client entity'de
    "arrays" tanimi, ozel bir render controller ve
    Array.cesitler[query.variant] ifadesi. Yapi belgelere uygundu
    ama OYUNDA BOT HIC CIZILMEDI -- gorunmez oldu, davranisi
    calismaya devam etti (takip ediyor, odun topluyor, savasiyor).
    Yani sunucu tarafi saglamdi, kirilan sey CIZIM yoluydu.

    v4.30'da v4.27'nin CALISAN kurulumuna donuldu:
      - vanilla controller.render.default
      - tek doku: textures/entity/bot

    Kaybedilen tek sey botlarin birbirinden renkle ayrilmasi.
    Detayli doku (gercek yuz, kiyafet, kemer, botlar) DURUYOR --
    asil gorsel iyilestirme oydu.

    CESITLERI TEKRAR DENEMEK ISTERSEK: sunucu tarafindaki
    pa:tipN gruplari ve minecraft:variant bilerek BIRAKILDI, yani
    is yalnizca bu dosyayi ve bir render controller'i yeniden
    yazmak. Ama once TEK cesitle denenmeli: gorunmezlik SESSIZ
    bir hata, hicbir test yakalayamiyor.
    """
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": BOT_KIMLIK,
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/entity/bot"},
                "geometry": {"default": "geometry.simsek_bot"},
                # Vanilla controller: v4.27'de calisiyordu
                "render_controllers": ["controller.render.default"],
                "spawn_egg": {"base_color": "#3a6ea5", "overlay_color": "#c68a60"},
                "scripts": {"animate": ["yuru"]},
                "animations": {"yuru": "animation.simsek_bot.yuru"},
            }
        },
    }


# Insansi model: vanilla 64x64 skin duzeniyle AYNI UV.
# Boylece istersen dokuyu bir Minecraft skini ile degistirebilirsin,
# hicbir sey ayarlamana gerek kalmaz.
BOT_GEOMETRI = {
    "format_version": "1.12.0",
    "minecraft:geometry": [
        {
            "description": {
                "identifier": "geometry.simsek_bot",
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 2,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": [
                # Kemik adlari vanilla insansi duzeniyle ayni: ileride
                # vanilla animasyon kullanmak istersek dogrudan oturur.
                {"name": "body", "pivot": [0, 24, 0], "cubes": [
                    {"origin": [-4, 12, -2], "size": [8, 12, 4], "uv": [16, 16]},
                    {"origin": [-4, 12, -2], "size": [8, 12, 4], "uv": [16, 32], "inflate": 0.25},
                ]},
                {"name": "head", "parent": "body", "pivot": [0, 24, 0], "cubes": [
                    {"origin": [-4, 24, -4], "size": [8, 8, 8], "uv": [0, 0]},
                    {"origin": [-4, 24, -4], "size": [8, 8, 8], "uv": [32, 0], "inflate": 0.5},
                ]},
                {"name": "rightArm", "parent": "body", "pivot": [-5, 22, 0], "cubes": [
                    {"origin": [-8, 12, -2], "size": [4, 12, 4], "uv": [40, 16]},
                ]},
                {"name": "leftArm", "parent": "body", "pivot": [5, 22, 0], "cubes": [
                    {"origin": [4, 12, -2], "size": [4, 12, 4], "uv": [32, 48]},
                ]},
                {"name": "rightLeg", "parent": "body", "pivot": [-2, 12, 0], "cubes": [
                    {"origin": [-4, 0, -2], "size": [4, 12, 4], "uv": [0, 16]},
                ]},
                {"name": "leftLeg", "parent": "body", "pivot": [2, 12, 0], "cubes": [
                    {"origin": [0, 0, -2], "size": [4, 12, 4], "uv": [16, 48]},
                ]},
                # ---- ELDEKI ESYANIN CIZILDIGI YER (v4.48) ----
                # KUPU YOK, sadece bir tutamak noktasi. Oyun mobun
                # ana elindeki esyayi "rightItem" adli kemige
                # ciziyor; kemik yoksa esya hic gorunmuyor.
                #
                # Ad ve pivot TAHMIN DEGIL: Dave1545 modundaki
                # oyuncu bicimli varliktan olculdu (pa_dave1545.json,
                # rightItem parent rightArm pivot [-6,15,1]) -- o mod
                # tablette calisiyor.
                #
                # Kupsuz kemik cizime hicbir sey EKLEMIYOR, yani
                # v4.28'deki "bot gorunmez oldu" riski burada yok:
                # o kaza ozel render controller + variant dizisi
                # yuzundendi, kemik yuzunden degil. Render
                # controller'a dokunulmadi.
                {"name": "rightItem", "parent": "rightArm",
                 "pivot": [-6, 15, 1]},
            ],
        }
    ],
}

# Kendi yuruyus animasyonumuz. Vanilla "animation.humanoid.*"
# kimliklerine BILEREK guvenilmedi: o kimlikler vanilla resource
# pack'inde tanimli ve surumden surume degisebiliyor. Bu dosya
# bizim, hep burada.
BOT_ANIM = {
    "format_version": "1.8.0",
    "animations": {
        "animation.simsek_bot.yuru": {
            "loop": True,
            "bones": {
                # modified_distance_moved: yurudukce artan sayac.
                # 38.17 vanilla'nin kullandigi carpan (adim frekansi).
                "rightLeg": {"rotation": [
                    "math.cos(query.modified_distance_moved * 38.17) * 40 * query.modified_move_speed",
                    0, 0]},
                "leftLeg": {"rotation": [
                    "math.cos(query.modified_distance_moved * 38.17 + 180) * 40 * query.modified_move_speed",
                    0, 0]},
                "rightArm": {"rotation": [
                    "math.cos(query.modified_distance_moved * 38.17 + 180) * 30 * query.modified_move_speed",
                    0, 0]},
                "leftArm": {"rotation": [
                    "math.cos(query.modified_distance_moved * 38.17) * 30 * query.modified_move_speed",
                    0, 0]},
            },
        }
    },
}


# ================================================================
#  O SEY  ("That Thing" / turkishminecraftlegends)      v4.88
# ================================================================
# Kullanici: "bunu yapabilir miyiz yani 6 tane kolu var bir tane
# daha bedeni var... kendi skinimize gore detaylica bir arastirma
# yap en iyisini yapmani istiyorum."
#
# ---- SAYILAR NEREDEN GELDI ----
# TAHMIN YOK. Referans modun (ZabriStudios v2.1) jar'i acildi,
#   net.memir.boralo.mod.entity.EntityTRMCThatThing
#     $Modelthatthingturkishmcl
# sinifi javap -c ile sokuldu ve BYTECODE'dan cozuldu
# (scratchpad/trmc_coz.py). Java 1.12 ModelRenderer cagrilari:
#   func_78793_a  = setRotationPoint
#   ModelBox<init>= addBox(u, v, x, y, z, w, h, d, olcek, ayna)
#   func_78792_a  = addChild
#
# Cikan Java tablosu (doku 64x64 = DUZ OYUNCU SKINI):
#
#   kemik           pivot          kutu(rel)+boyut       uv
#   Head            0,-12,0        -4,-8,-4 + 8x8x8      0,0
#   Body            0,0,0          -4,0,-2  + 8x6x4      16,16
#   Body            0,0,0          -4,-12,-2+ 8x12x4     16,32   <- IKINCI BEDEN
#   RightArm        -5,2,0         -3,-2,-2 + 4x12x4     40,16
#   LeftArm          5,2,0         -1,-2,-2 + 4x12x4     32,48
#   RightLeg        -1.9,12,0      -2,-6,-2 + 4x18x4     0,16    <- 18 UZUN
#   LeftLeg          1.9,12,0      -2,-6,-2 + 4x18x4     0,42
#   LeftMiddleArm    5,-3,0        (cocuk LeftArm_r1, Z=-90)
#   LeftUpperArm     5,-9,0        (cocuk LeftArm_r2, Z=-90)
#   RightMiddleArm  -5,-3,0        (cocuk RightArm_r2, Z=+90)
#   RightUpperArm   -5,-9,0        (cocuk RightArm_r1, Z=+90)
#
# Tasarim ozeti: govde 18 uzun (6 alt + 12 UST), bacaklar 18
# uzun, kafa 12 birim yukarida ve dort fazladan kol +-90 donuk
# oldugu icin YANLARA YATAY cikiyor. Toplam boy 44 birim = 2,75
# blok.
#
# ---- JAVA -> BEDROCK CEVIRISI ----
# Iki motorun veri uzayi arasindaki bagi TAHMIN ETMEDIK, vanilla
# insansi modelin iki surumunu KARSILASTIRDIK:
#   Java  ModelBiped.bipedRightArm : pivot(-5,2,0) kutu(-3,-2,-2)
#                                    -> mutlak x[-8,-4] y[0,12]
#   Bedrock rightArm               : pivot[-5,22,0] origin[-8,12,-2]
# Yani:  x AYNI · z AYNI · uv AYNI · y = 24 - y   (tek fark)
#
# ---- DONME ISARETI (olculdu, tahmin edilmedi) ----
# Bedrock dosyasindaki "rotation" degeri, matematiksel sag-el
# donusunun TERSI. Iki bagimsiz olcum:
#   1) boralo_canli/.../dirt_staff.geo.json -- elde tutulan asa.
#      Duz okumada asa ayaklarin ALTINA (y ~ -8) dusuyor; ters
#      okumada tam el hizasina (y ~ +8) oturuyor.
#   2) Elimizdeki BUTUN Bedrock paketlerindeki donmus kupler
#      (1184 adet) iki isaretle de dondurulup ele olan uzakligi
#      olculdu: 948 kup ters okumayi, 236 duz okumayi destekledi.
# Sonuc kurali:  bedrock_dosya = [-rx_java, +ry_java, +rz_java]
# Z icin cift olumsuzlama oldugu icin Java'daki sayi AYNEN
# geciyor (-90 sol, +90 sag). Asagidaki origin degerleri bu
# kuralla hesaplandi ve donmus kutunun varacagi yer AYRICA elle
# de hesaplanip karsilastirildi (ikisi tutuyor).
# Doku kaynagi KENDI SKINIMIZ: kullanicinin istegi buydu
# ("kendi skinimize gore"). skin_uret.py'nin urettigi dosya.
SEY_SKIN_KAYNAK = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "UzakAkraba_skin.png")
SEY_KIMLIK = "pa:o_sey"
SEY_AD     = "That Thing"
SEY_TR     = "O Şey"
SEY_DOKU   = "o_sey"
SEY_CAN    = 4400      # 2200 kalp -- Ilkel Besli'nin en sertinden ustte
SEY_HASAR  = 60        # 30 kalp / vurus
SEY_HIZ    = 0.36
SEY_BOY    = 2.75      # blok (44 birim / 16)
SEY_EN     = 0.9

# Fazladan kollarin acisi. TEK BELIRSIZ SAYI BU: oyunda kollar
# govdenin ICINE dogru bakiyorsa isareti ters cevir, baska hicbir
# yere dokunma.
SEY_KOL_ACI = 90


def o_sey_geometrisi():
    """6 kollu, cift bedenli govde. Kemik adlari vanilla insansi
    duzeninde (head/body/rightArm/...) -- yuruyus animasyonumuz
    dogrudan oturuyor.

    Fazladan dort kol iki katmanli: disardaki kemik SWING icin
    (Java da onu donduruyordu, Y ekseninde), icerideki `_r` kemik
    kolu yatay yapan sabit +-90 donusu tasiyor.                  """
    def yatay_kol(ad, taban_ad, pivot_y, kutu_y, sag):
        """Bir fazladan kol cifti: tasiyici kemik + donuk cocuk."""
        isaret = SEY_KOL_ACI if sag else -SEY_KOL_ACI
        x = -5 if sag else 5
        cx = -4 if sag else 4
        org_x = -7 if sag else 3
        uv = [40, 16] if sag else [32, 48]
        return [
            {"name": ad, "parent": "body", "pivot": [x, pivot_y, 0]},
            {"name": taban_ad, "parent": ad, "pivot": [cx, pivot_y, 0],
             "rotation": [0, 0, isaret],
             "cubes": [{"origin": [org_x, kutu_y, -2],
                        "size": [4, 12, 4], "uv": uv}]},
        ]

    kemikler = [
        # ---- GOVDE: iki kup ust uste = "bir tane daha beden" ----
        # alt kup 6 uzun (16,16 = normal govde bolgesi)
        # ust kup 12 uzun (16,32 = govde KAPLAMA bolgesi)
        {"name": "body", "pivot": [0, 24, 0], "cubes": [
            {"origin": [-4, 18, -2], "size": [8, 6, 4], "uv": [16, 16]},
            {"origin": [-4, 24, -2], "size": [8, 12, 4], "uv": [16, 32]},
        ]},
        # Kafa 12 birim yukarida: ust bedenin tepesinde
        {"name": "head", "parent": "body", "pivot": [0, 36, 0], "cubes": [
            {"origin": [-4, 36, -4], "size": [8, 8, 8], "uv": [0, 0]},
        ]},
        # ---- ALT (normal) KOL CIFTI: bel hizasinda sarkiyor ----
        {"name": "rightArm", "parent": "body", "pivot": [-5, 22, 0], "cubes": [
            {"origin": [-8, 12, -2], "size": [4, 12, 4], "uv": [40, 16]},
        ]},
        {"name": "leftArm", "parent": "body", "pivot": [5, 22, 0], "cubes": [
            {"origin": [4, 12, -2], "size": [4, 12, 4], "uv": [32, 48]},
        ]},
        # ---- BACAKLAR: 12 degil 18 uzun ----
        {"name": "rightLeg", "parent": "body", "pivot": [-1.9, 12, 0], "cubes": [
            {"origin": [-3.9, 0, -2], "size": [4, 18, 4], "uv": [0, 16]},
        ]},
        {"name": "leftLeg", "parent": "body", "pivot": [1.9, 12, 0], "cubes": [
            {"origin": [-0.1, 0, -2], "size": [4, 18, 4], "uv": [0, 42]},
        ]},
    ]
    # ---- DORT FAZLADAN KOL ----
    # orta cift  y=27 · ust cift y=33
    kemikler += yatay_kol("rightMiddleArm", "rightArm_r2", 27, 16, True)
    kemikler += yatay_kol("rightUpperArm",  "rightArm_r1", 33, 22, True)
    kemikler += yatay_kol("leftMiddleArm",  "leftArm_r1",  27, 16, False)
    kemikler += yatay_kol("leftUpperArm",   "leftArm_r2",  33, 22, False)

    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.o_sey",
                "texture_width": 64,
                "texture_height": 64,
                # Kollar +-15 birime uzaniyor: gorunur kutu genis
                # olmali, yoksa yandan bakinca kirpiliyor.
                "visible_bounds_width": 3,
                "visible_bounds_height": 3.5,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": kemikler,
        }],
    }


# Yuruyus. Alt kol/bacak ciftleri normal botunkiyle ayni (X
# ekseni). Fazladan dort kol YATAY oldugu icin onlarin salinimi
# Y ekseninde -- referans mod da tam olarak boyle yapiyor
# (func_78087_a icinde field_78796_g = rotateAngleY yaziyor).
_SEY_FAZ = "math.cos(query.modified_distance_moved * 38.17%s) * %d * query.modified_move_speed"
SEY_ANIM = {
    "format_version": "1.8.0",
    "animations": {
        "animation.o_sey.yuru": {
            "loop": True,
            "bones": {
                "rightLeg":       {"rotation": [_SEY_FAZ % ("", 40), 0, 0]},
                "leftLeg":        {"rotation": [_SEY_FAZ % (" + 180", 40), 0, 0]},
                "rightArm":       {"rotation": [_SEY_FAZ % (" + 180", 30), 0, 0]},
                "leftArm":        {"rotation": [_SEY_FAZ % ("", 30), 0, 0]},
                # Yatay kollar: Y ekseninde, ust ve orta cift ters faz
                "rightUpperArm":  {"rotation": [0, _SEY_FAZ % (" + 180", 22), 0]},
                "leftMiddleArm":  {"rotation": [0, _SEY_FAZ % (" + 180", 22), 0]},
                "leftUpperArm":   {"rotation": [0, _SEY_FAZ % ("", 22), 0]},
                "rightMiddleArm": {"rotation": [0, _SEY_FAZ % ("", 22), 0]},
            },
        }
    },
}


def o_sey_dokusu(kaynak_yol):
    """Kendi skinimizden (UzakAkraba_skin.png) O Sey dokusu uretir.

    ---- NEDEN AYRI DOSYA GEREKIYOR ----
    Modelin ornekledigi UC bolge oyuncu skininin IKINCI KATMAN
    (ceket/pantolon kaplamasi) alanina dusuyor:

        ust beden   uv(16,32)  -> govde KAPLAMASI
        bacak alti  y 32..37   -> sag bacak KAPLAMASI
        sol bacak   uv(0,42)   -> bacak KAPLAMA alani

    skin_uret.py ikinci katmani BILEREK bos birakiyor ("ayni
    renkle doldurunca karakter sismis gorunuyor"). Olculdu:
    kaplama bolgelerinde dolu piksel sayisi 0/384, 0/256, 0/256.
    Yani doku oldugu gibi kullanilsaydi O Sey'in UST BEDENI ve
    SOL BACAGI oyunda GORUNMEZ olurdu.

    Cozum: birinci katmani bu alanlara kopyalamak. Ust beden alt
    bedenin aynisi oluyor -- "bir tane daha beden" tam olarak bu.

    Skin degisirse burasi kendiliginde dogru kalir: hicbir renk
    elle yazilmiyor, hepsi kaynaktan kopyalaniyor.               """
    try:
        from PIL import Image
    except ImportError:
        print("UYARI: PIL yok, O Sey dokusu uretilemedi")
        return None
    if not os.path.exists(kaynak_yol):
        print("UYARI: O Sey icin skin bulunamadi (%s)" % kaynak_yol)
        return None

    im = Image.open(kaynak_yol).convert("RGBA")
    if im.size != (64, 64):
        print("UYARI: O Sey skini 64x64 degil (%s), atlaniyor" % (im.size,))
        return None

    def kopyala(kaynak, hedef, en, boy):
        im.paste(im.crop((kaynak[0], kaynak[1],
                          kaynak[0] + en, kaynak[1] + boy)), hedef)

    # 1) UST BEDEN: govde blogunun tamami kaplama alanina
    #    (24 genis x 16 yuksek = ust serit + dort yan yuz)
    kopyala((16, 16), (16, 32), 24, 16)

    # 2) SAG BACAK 18 uzun: yan yuzler y=20..37. Kaynakta 20..31
    #    var; 32..37 icin 20..25 tekrarlaniyor (12'lik periyot).
    kopyala((0, 20), (0, 32), 16, 6)

    # 3) SOL BACAK bastan asagi kaplama alaninda (uv 0,42):
    #    ust serit 4 satir, sonra 18 satir yan yuz.
    kopyala((16, 48), (0, 42), 16, 4)      # ust/alt kapak
    kopyala((16, 52), (0, 46), 16, 12)     # yan yuzler 46..57
    kopyala((16, 52), (0, 58), 16, 6)      # 58..63 tekrar

    return im


# ============================================================
# MUTANT HALIM                                          v7.2
#
# Kullanici: "that thing Halim vardi ya, bir de MUTANT Halim
# olsun ekstra olarak" ve nasil yapildigina dair uc ornek
# gonderdi (Mutant Boralo / Catalina / Great Master --
# Chameleon modunun Metamorph kaliplari).
#
# ---- ORNEKLER OLCULDU ----
# Uc modelin de iskeleti AYNI, govdeleri farkli:
#   Anchor -> Body2 -> Torso -> BodyUpper -> kollar
#   Body2 -> Head,  Body2 -> bacaklar (iki parcali)
# Poz verisinde ortak olan sey:
#   Anchor  SX/SY/SZ 0.7    butun govde %70'e olceklenmis
#   RightArm/LeftArm  Y:46  kollar one-asagi sarkiyor
#   Torso   Y:-28..+9       govde one egilmis (kambur)
#   Fist kemikleri 7 kup    yumruklar govdenin en detayli yeri
# Cizdirilince siluet net: kambur, dev omuz, yere sarkan koca
# yumruk, kisa kalin bacak.
#
# ---- NEDEN KAYNAK MODELLER DOGRUDAN ALINMADI ----
# Ucu de BASKA karakterler (Boralo, Catalina, Great Master) ve
# kendi dokularini tasiyor. Halim bizim; kullanicinin istedigi
# de "Halim'in mutant hali". O yuzden ORANLAR ve DURUS
# orneklerden, KIMLIK (alti kol, palet) O Sey'den geliyor.
#
# ---- NEDEN KEMIK ADLARI KAYNAKTAKI GIBI DEGIL ----
# Kaynak `Anchor/Torso/BodyUpper` kullaniyor; bizim yuruyus
# animasyonumuz (`animation.o_sey.yuru`) vanilla adlari
# (body/head/rightArm/leftLeg...) oynatiyor. Kaynagin adlarini
# alsaydik model yuruyusun hicbir kemigini tanimazdi ve
# HAREKETSIZ dururdu -- hicbir hata da gorunmezdi. O Sey'de
# ayni karar zaten verilmisti.
MUTANT_KIMLIK = "pa:o_sey_mutant"
MUTANT_AD     = "Mutant That Thing"
MUTANT_TR     = "Mutant Halim"
MUTANT_DOKU   = "o_sey_mutant"
# O Sey'in bir buçuk kati: 4400 -> 6600 (3300 kalp).
MUTANT_CAN    = 6600
MUTANT_HASAR  = 90         # 45 kalp / vurus  (O Sey 60)
MUTANT_HIZ    = 0.30       # daha agir (O Sey 0.36)
MUTANT_BOY    = 3.4        # blok (54 birim / 16)
MUTANT_EN     = 1.4        # omuzlar cok genis


def mutant_geometrisi():
    """Mutant Halim. O Sey'in alti kolu duruyor; govde
    orneklerdeki mutant oranlarinda.

    ---- KULLANICI DUZELTTI: KAMBUR DEGIL ----
    Ilk denemede yaratigi kambur yaptim -- kafayi omuzlarin
    arasina gomup govdeyi one egdim. Kullanici Mutant Boralo'nun
    ekran goruntusunu gonderdi: yaratik DIK duruyor, kafa
    govdenin tepesinde normal yerinde, ve asil ozellik
    KOLLARIN UZUNLUGU -- omuzdan basliyor, dizin ALTINA kadar
    iniyor, ucunda koca koyu yumruklar var.

    Kaynagin poz verisi de bunu soyluyordu ama yanlis okumusum:
    `RightArm:{Y:46}` kolu one-asagi sarkitiyor, `Torso` donusu
    ise govdeyi egmiyor, KOLLARI ONE aciyor.

    Olculer (birim, 16 = 1 blok):
      bacak alt   0..12    kalin
      bacak ust  12..22
      kalca      22..30    14 genis
      gogus      30..44    18 genis
      kafa       44..54    normal boy, TEPEDE
      kollar     42..10    otuz iki birim -- dizin altina iner
      yumruk      2..10    koca
    Toplam 54 birim = 3,4 blok.                                """

    def uzun_kol(ad, yumruk_ad, sag, uv, yumruk_uv):
        """Mutantin imzasi: omuzdan dizin altina inen kalin kol
        ve ucunda koca yumruk.

        Disardaki kemik SWING icin (yuruyus animasyonu onu
        donduruyor), yumruk kemigi kolun ucuna asili."""
        omuz = 42
        dip = 10
        kalin = 7
        x = -9 if sag else 9
        org_x = (-9 - kalin) if sag else 9
        return [
            {"name": ad, "parent": "body", "pivot": [x, omuz, 0],
             "cubes": [{"origin": [org_x, dip, -3.5],
                        "size": [kalin, omuz - dip, 7], "uv": uv}]},
            {"name": yumruk_ad, "parent": ad, "pivot": [x, dip, 0],
             "cubes": [{"origin": [org_x - 1.5, dip - 8, -5],
                        "size": [kalin + 3, 8, 10], "uv": yumruk_uv}]},
        ]

    def yatay_kol(ad, taban_ad, pivot_y, sag, uv):
        """Fazladan kol cifti -- O Sey'deki kalibin AYNISI:
        disardaki kemik swing icin, icerideki +-90 donusu
        tasiyor. Mutantta daha kalin."""
        isaret = SEY_KOL_ACI if sag else -SEY_KOL_ACI
        x = -8 if sag else 8
        cx = -7 if sag else 7
        org_x = -13 if sag else 7
        return [
            {"name": ad, "parent": "body", "pivot": [x, pivot_y, 0]},
            {"name": taban_ad, "parent": ad, "pivot": [cx, pivot_y, 0],
             "rotation": [0, 0, isaret],
             "cubes": [{"origin": [org_x, pivot_y - 14, -3],
                        "size": [6, 14, 6], "uv": uv}]},
        ]

    kemikler = [
        # ---- GOVDE: kalca + gogus, ikisi de DIK ----
        # Ornekteki gibi iki parcali: alt bant dar, gogus genis.
        {"name": "body", "pivot": [0, 30, 0], "cubes": [
            {"origin": [-7, 22, -4], "size": [14, 8, 8], "uv": [16, 16]},
            {"origin": [-9, 30, -5], "size": [18, 14, 9], "uv": [16, 32]},
        ]},
        # ---- KAFA: govdenin TEPESINDE, normal yerinde ----
        # Boyun yok ama kafa gomulu de degil.
        {"name": "head", "parent": "body", "pivot": [0, 44, 0], "cubes": [
            {"origin": [-5, 44, -5], "size": [10, 10, 10], "uv": [0, 0]},
        ]},
        # ---- BACAKLAR: kalin, iki parcali ----
        {"name": "rightLeg", "parent": "body", "pivot": [-4, 22, 0], "cubes": [
            {"origin": [-8, 12, -3.5], "size": [7, 10, 7], "uv": [0, 16]},
            {"origin": [-8, 0, -3.5], "size": [7, 12, 7], "uv": [0, 16]},
        ]},
        {"name": "leftLeg", "parent": "body", "pivot": [4, 22, 0], "cubes": [
            {"origin": [1, 12, -3.5], "size": [7, 10, 7], "uv": [0, 42]},
            {"origin": [1, 0, -3.5], "size": [7, 12, 7], "uv": [0, 42]},
        ]},
    ]
    # ---- ANA KOL CIFTI: mutantin imzasi ----
    kemikler += uzun_kol("rightArm", "rightFist", True, [40, 16], [40, 16])
    kemikler += uzun_kol("leftArm", "leftFist", False, [32, 48], [32, 48])
    # ---- DORT FAZLADAN KOL (Halim'in kimligi) ----
    kemikler += yatay_kol("rightMiddleArm", "rightArm_r2", 34, True, [40, 16])
    kemikler += yatay_kol("rightUpperArm",  "rightArm_r1", 41, True, [40, 16])
    kemikler += yatay_kol("leftMiddleArm",  "leftArm_r1",  34, False, [32, 48])
    kemikler += yatay_kol("leftUpperArm",   "leftArm_r2",  41, False, [32, 48])

    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.o_sey_mutant",
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 4,
                "visible_bounds_height": 4.5,
                "visible_bounds_offset": [0, 2, 0],
            },
            "bones": kemikler,
        }],
    }


# ---- ZAMAN SAATI  (v7.2) ----
# Kaynak: "Zaman Saati Ifsa" (f.a. eymoxa). Esya duz: modeli
# yok, 16x16 ikonu var. Ikon kaynagin KENDI ikonu.
SAAT_ESYA = "zaman_saati"
SAAT_TR   = "Zaman Saati"
SAAT_EN   = "Time Watch"


def saat_esyasi():
    """Zaman Saati. Kaynakta dayaniklilik ve hasar YOK: elde
    tutulan, sag tiklanan bir alet. Bes modu script tarafinda
    (yetenekler/zaman_saati.js).                               """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + SAAT_ESYA,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": SAAT_ESYA},
                "minecraft:display_name": {"value": SAAT_TR},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                "minecraft:glint": True,
            },
        },
    }


def mutant_dokusu(kaynak_yol):
    """Mutant Halim'in dokusu. O Sey'in KENDI dokusundan
    turetiliyor -- uydurma bir doku degil, Halim'in paletinin
    mutasyona ugramis hali.

    ---- NEDEN TURETILIYOR, OLDUGU GIBI ALINMIYOR ----
    Ilk denemede mutanti dogrudan o_sey.png ile cizdirdim ve
    yaratik SIYAH BIR KUTLE cikti: o doku %95,6 siyaha yakin
    (olculdu, v6.6). Ince bir govdede sorun degil, ama mutantin
    govdesi uc kat genis -- siluetin okunmasi icin vurgunun
    daha cok yer kaplamasi gerekiyor.

    Yapilan is olculebilir:
      1. Siyaha yakin pikseller HAFIFCE aciliyor (mutasyonun
         damarlari zeminin uzerinde secilsin).
      2. Turkuaz vurgu (#20C5B5 ailesi) parlatiliyor.
      3. Zemine seyrek turkuaz DAMARLAR isleniyor -- desen
         deterministik (piksel koordinatindan turuyor), yani
         her uretimde ayni cikiyor.
    Palet DEGISMIYOR: yeni renk uydurulmuyor, var olan iki ton
    kullaniliyor.                                              """
    try:
        from PIL import Image
    except ImportError:
        print("UYARI: PIL yok, mutant dokusu uretilemedi")
        return None
    if not os.path.exists(kaynak_yol):
        print("UYARI: O Sey dokusu yok (%s), mutant dokusu atlandi"
              % kaynak_yol)
        return None

    im = Image.open(kaynak_yol).convert("RGBA")
    en, boy = im.size
    cikti = Image.new("RGBA", (en, boy), (0, 0, 0, 0))
    gp = im.load()
    cp = cikti.load()
    VURGU = (32, 197, 181)        # #20C5B5 -- olculen ana vurgu
    PARLAK = (74, 237, 217)       # #4AEDD9 -- olculen acik ton

    for y2 in range(boy):
        for x2 in range(en):
            r, g, b, a = gp[x2, y2]
            if a < 40:
                continue
            parlaklik = (r + g + b) / 3.0
            if parlaklik < 40:
                # Zemin: hafifce aciliyor ki uzerindeki damar
                # secilsin. Damarlar deterministik bir desende.
                if (x2 * 5 + y2 * 3) % 17 == 0:
                    cp[x2, y2] = VURGU + (255,)
                elif (x2 * 3 + y2 * 7) % 29 == 0:
                    cp[x2, y2] = PARLAK + (255,)
                else:
                    k = 1.6
                    cp[x2, y2] = (min(255, int(r * k) + 6),
                                  min(255, int(g * k) + 8),
                                  min(255, int(b * k) + 9), 255)
            else:
                # Vurgu tonlari: parlatiliyor.
                cp[x2, y2] = (min(255, int(r * 1.25)),
                              min(255, int(g * 1.25)),
                              min(255, int(b * 1.25)), 255)
    return cikti


def o_sey_varligi():
    """Sunucu varligi. Ilkel Besli ile AYNI yol: normal botun
    govdesi kopyalanip istatistikleri degistiriliyor. Boylece
    defter, canta, teslim, takip, bekle -- hepsi calisiyor.

    v4.66 dersi burada da gecerli: bilesen gruplari temel
    bilesenleri EZIYOR. attack/health/movement gruplardan
    siliniyor, yoksa savasa girer girmez normal bot sayilarina
    dusuyor.                                                     """
    import copy
    v = copy.deepcopy(bot_sunucu_varligi())
    govde = v["minecraft:entity"]
    govde["description"]["identifier"] = SEY_KIMLIK

    govde["components"]["minecraft:health"] = {"value": SEY_CAN, "max": SEY_CAN}
    govde["components"]["minecraft:attack"] = {"damage": SEY_HASAR}
    govde["components"]["minecraft:movement"] = {"value": SEY_HIZ}
    govde["components"]["minecraft:knockback_resistance"] = {"value": 1.0}
    # Carpisma kutusu modelin gercek boyu: 44 birim = 2,75 blok.
    # Yanlis birakilirsa iki blokluk deliklerden gecip duvarin
    # icinde kaliyor.
    govde["components"]["minecraft:collision_box"] = {
        "width": SEY_EN, "height": SEY_BOY}
    govde["components"]["minecraft:follow_range"] = {
        "value": ILKEL_AV_YARICAP, "max": ILKEL_AV_YARICAP}

    for grup, ic in govde.get("component_groups", {}).items():
        if grup == "pa:bekle":
            continue
        for bilesen in ("minecraft:attack", "minecraft:health",
                        "minecraft:movement"):
            ic.pop(bilesen, None)

    # Saldirganlik: Ilkel Besli'nin aynisi, sadece "monster"
    # ailesine. Koyun, inek, koylu guvende.
    savas = govde["component_groups"].get("pa:savas")
    if savas is not None:
        savas["minecraft:behavior.nearest_attackable_target"] = {
            "priority": 1,
            "within_radius": ILKEL_AV_YARICAP,
            "must_see": True,
            "must_see_forget_ticks": ILKEL_AV_UNUTMA,
            "reselect_targets": True,
            "scan_interval": ILKEL_AV_TARAMA,
            "entity_types": [{
                "filters": {"test": "is_family", "subject": "other",
                            "value": "monster"},
                "max_dist": ILKEL_AV_YARICAP,
            }],
        }
        m = savas.get("minecraft:behavior.melee_attack")
        if m is not None:
            m["speed_multiplier"] = ILKEL_SALDIRI_HIZ
            m["track_target"] = True

    # Tek gorunumu var: cesit gruplari ve rastgele secim anlamsiz
    for i in range(BOT_CESIT):
        govde["component_groups"].pop("pa:tip%d" % i, None)
    dogum = govde["events"]["minecraft:entity_spawned"]["sequence"]
    govde["events"]["minecraft:entity_spawned"]["sequence"] = [
        adim for adim in dogum if "randomize" not in adim
    ]
    return v


# ---- KILIK: OYUNCUNUN DONUSTUGU BEDEN (v4.89) ----
# Kullanici: "buna donusebiliyor olmam lazim... skin olmalidir."
#
# SKIN OLARAK YAPILAMIYOR: Mojang skin paketlerinde ozel
# geometriyi kaldirdi (bkz. SKIN_LISTE notu). Resmi istemcide bir
# oyuncunun modeli DEGISTIRILEMEZ -- ne paketten, ne script'ten.
#
# Bedrock'ta gercekten calisan tek yol "kilik" (morph):
#   1. oyuncu gorunmez olur
#   2. yerine bu varlik ciziliyor
#   3. her tick oyuncunun konumuna ve donusune isinlaniyor
# Kendi bakisin birinci sahista degismiyor; F5'e basinca ve
# BASKA OYUNCULAR icin O Sey gorunuyorsun.
#
# Bu varlik pa:o_sey'den AYRI olmak zorunda: o birisi savasan,
# canli, hedef alinabilen bir bot. Kilik ise bir GORUNTU --
# vurulamaz, itilemez, dusmez, ses cikarmaz, kimseyi hedef almaz.
# Ayni varligi iki ise kosmak, botun savas davranislarini oyuncunun
# uzerine yapistirmak olurdu.
SEY_KILIK_KIMLIK = "pa:o_sey_kilik"


def mutant_varligi():
    """Mutant Halim'in sunucu varligi. O Sey'in AYNI yolu:
    govdesi kopyalanip sayilari degistiriliyor -- boylece
    defter, canta, teslim, takip, bekle hepsi calisiyor.

    v4.66 dersi burada da gecerli: bilesen gruplari temel
    bilesenleri EZIYOR, o yuzden attack/health/movement
    gruplardan siliniyor.                                      """
    import copy
    v = copy.deepcopy(o_sey_varligi())
    govde = v["minecraft:entity"]
    govde["description"]["identifier"] = MUTANT_KIMLIK
    govde["components"]["minecraft:health"] = {
        "value": MUTANT_CAN, "max": MUTANT_CAN}
    govde["components"]["minecraft:attack"] = {"damage": MUTANT_HASAR}
    govde["components"]["minecraft:movement"] = {"value": MUTANT_HIZ}
    # Carpisma kutusu modelin GERCEK olculeri. Yanlis birakilirsa
    # duvarin icinde kaliyor (O Sey'de bu bir kez yasandi).
    govde["components"]["minecraft:collision_box"] = {
        "width": MUTANT_EN, "height": MUTANT_BOY}
    for grup, ic in govde.get("component_groups", {}).items():
        if grup == "pa:bekle":
            continue
        for bilesen in ("minecraft:attack", "minecraft:health",
                        "minecraft:movement"):
            ic.pop(bilesen, None)
    return v


def mutant_istemci_varligi():
    """Ozel render controller YOK -- v4.28'de bot tam o yuzden
    gorunmez olmustu."""
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": MUTANT_KIMLIK,
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/entity/" + MUTANT_DOKU},
                "geometry": {"default": "geometry.o_sey_mutant"},
                "render_controllers": ["controller.render.default"],
                "spawn_egg": {
                    "base_color": "#16303a",     # mutant zemini
                    "overlay_color": "#4aedd9",  # damar turkuazi
                },
                # Yuruyus animasyonu O SEY ile AYNI: kemik adlari
                # bilerek vanilla duzeninde tutuldu, yoksa model
                # hareketsiz kalirdi.
                "scripts": {"animate": ["yuru"]},
                "animations": {"yuru": "animation.o_sey.yuru"},
            }
        },
    }


def o_sey_kilik_varligi():
    """Sadece GORUNTU. Yapay zeka yok, can yok, carpisma yok."""
    return {
        "format_version": "1.16.0",
        "minecraft:entity": {
            "description": {
                "identifier": SEY_KILIK_KIMLIK,
                # Yumurtasi YOK: bu bir oyuncak degil, donusumun
                # parcasi. Envanteri kirletmesin.
                "is_spawnable": False,
                "is_summonable": True,
                "is_experimental": False,
            },
            "components": {
                # pa_bot ailesinde: botlarimiz ve Ilkel Besli
                # kendi sahibinin kiligina saldirmasin.
                "minecraft:type_family": {"family": ["pa_bot", "pa_kilik"]},
                # Yercekimi ve carpisma KAPALI: konumu her tick
                # script veriyor. Acik kalsaydi oyuncuyu iteleyip
                # ikisi birlikte titrerdi.
                "minecraft:physics": {"has_gravity": False,
                                      "has_collision": False},
                "minecraft:pushable": {"is_pushable": False,
                                       "is_pushable_by_piston": False},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:fire_immune": True,
                "minecraft:damage_sensor": {
                    "triggers": [{
                        "cause": "all",
                        "deals_damage": False,
                    }],
                },
                "minecraft:health": {"value": 1, "max": 1},
                # Carpisma kutusu MUMKUN OLAN EN KUCUK: cizimi
                # etkilemiyor ama nisan almayi ve tikanmayi
                # etkiliyor.
                "minecraft:collision_box": {"width": 0.1, "height": 0.1},
                "minecraft:can_climb": {},
                # Dunya yeniden yuklenince kaybolmasin; temizligi
                # donusum.js yapiyor.
                "minecraft:persistent": {},
                # Adi ustunde yazmasin, isaretlenmesin.
                "minecraft:nameable": {"allow_name_tag_renaming": False},
            },
        },
    }


# ================================================================
#  ZIRH YUKSELTMESI  (Ionstrike / Max Steel)             v4.91
# ================================================================
# Kullanici: "bu modda bazi seylerini alacagiz, alinabilir olan
# seylerini, ve ekstra kostum olarak takilabilir sekilde yani
# ZIRH olarak takilabilir... adi zirh yukseltmesi olsun."
#
# ---- KAYNAK ----
# mod.jar = `ionstrike` v1.0.0 (Bionic), Palladium eklentisi.
# `lowcodefml` yani DERLENMIS SINIF YOK -- her sey JSON. Bu
# yuzden bytecode cozmeye gerek kalmadi, sayilar dogrudan
# okundu:  data/ionstrike/palladium/powers/*.json
#
# Modun kendisi Max Steel: TEK bir takim, bircok MOD (base,
# strength, speed, flight, stealth, heat, scuba, recon, titan...).
# Bizde de oyle: tek takim + menuden secilen mod.
#
# ---- ZIRH DEGERI NEREDEN ----
# base_mode:  generic.armor +20 · armor_toughness +15
# Vanilla netherite takimi da tam 20 zirh puani veriyor, yani
# referansin tabani netherite seviyesi. Dagilim netherite ile
# ayni: 3 / 8 / 6 / 3.
#
# TOKLUK (toughness) TASINAMIYOR: Bedrock'ta ozel esyaya
# armor_toughness verilmiyor, oyle bir bilesen yok. Referansin
# +15 toklugu bu yuzden MOD ETKISI olarak (Direnc) karsilaniyor
# -- kayip degil, baska bir yoldan.
ZIRH_DOKU = "zirh_suit"

# ---- MOD DONUSUMU (v4.94) ----
# Kullanici: "Max steel modlarda ayri bir DONUSUM seyi olmasi
# lazim... zirhi aliyorum, donusum ayni kaliyor, tamamen ayni
# kaliyorum. Modun incelemesini izledigim icin biliyorum."
#
# HAKLIYDI. Referansta her modun KENDI TAKIMI var ve Palladium
# onu `render_layer` ile oyuncunun uzerine ciziyor. Cozuldu:
#   powers/<mod>.json -> abilities[].render_layer
#   render_layers/<katman>.json -> geo + doku
#
# Cikan eslesme (okundu, tahmin degil):
#   temel     base_model          ionstrike_rebirth2  + ionstrike_new
#   guc       strength_mode       strength_mode       + strength_mode
#   hiz       speed_suit2         ionstrike_speed_suit2 + speed_suit2
#   ucus      flight_mode_2       flight2_mode        + flight_suit2
#   gizlilik  stealth_mode_model  ionstrike_rebirth   + stealth_suit
#   isi       heat_mode           heat                + heat_texture
#   dalis     scuba_mode_model    ionstrike_scuba     + scuba_texture
#   kesif     recon_mode_model    ionstrike_rebirth   + recon_suit
#   titan     titan               ionstrike_rebirth   + ionstrike_new
#
# Modellerin hepsi ayni alti armorX kemiginden sarkiyor, yani
# Ben 10 donusturucusunun AYNISI calisiyor.
#
# ---- NASIL VERILIYOR ----
# Zirh Yukseltmesi'ne DOKUNULMADI (kullanici: "hicbir seyi
# degistirmeden"). Her mod icin ayri bir CEKIRDEK esyasi var:
# eline al -> o modun takimina donusursun VE o modun gucleri
# gelir. Zirhi da giyersen zirh puani ustune biner.
#
# Gorunus v4.90'in makinesinden (player.entity.json), yani
# Ben 10 ile birebir ayni yol.
ZIRH_MODLAR_LISTE = [
    ("temel",    "Temel"),
    ("guc",      "Güç"),
    ("hiz",      "Hız"),
    ("ucus",     "Uçuş"),
    ("gizlilik", "Gizlilik"),
    ("isi",      "Isı"),
    ("dalis",    "Dalış"),
    ("kesif",    "Keşif"),
    ("titan",    "Titan"),
]
# (anahtar, TR ad, EN ad, geo dosyalari, tur)  -- BEN10 ile ayni
# bicim, cunku ayni makineye giriyor.
ZIRH_MOD = [("zirh_mod_" + _m, "Çekirdek · " + _ad,
             "Mode Core: " + _ad, ["zirh_mod_" + _m], "Max Steel")
            for _m, _ad in ZIRH_MODLAR_LISTE]
# ---- MODLARIN EK KATMANLARI  (v4.97) ----
#
# Kullanici: "Max steel modunda su eksikleri gordum,
# animasyonlar eklenmeli cunku modun kendisinde var,
# referanstan bakarsin."
#
# BAKILDI. Modun TAMAMINDA tek bir animasyon dosyasi var:
#   assets/ionstrike/animations/animation.drill_spin.json
# Guc modunun kol MATKAPLARININ donusu. Bicimi zaten Bedrock
# (format_version 1.8.0), donusturmeye gerek yok.
#
# Ama animasyonu ararken daha buyuk bir eksik cikti: her modun
# BIRDEN COK render katmani var ve biz her modun yalnizca
# ANA katmanini almisiz. Denetim (powers/*.json ->
# palladium:render_layer):
#
#   guc    . exo_mode + DRILLS + transform_flash + strength_mode
#   titan  . HALO + transform_flash + titan
#   ucus   . steel_glow + thrusters + transform_flash + flight2
#   dalis  . steel_glow + transform_flash + scuba2
#   gizli  . steel_glow + glow_model + stealth_model
#
# Yani Guc modunun MATKAPLARI ve Titan'in HALESI hic
# aktarilmamis. Ikisi de artik burada.
#
# ---- NEDEN AYRI KATMAN, TEK GEOMETRI DEGIL ----
# Bedrock'ta bir geometrinin TEK dokusu olur. Matkabin dokusu
# 256x256 (drill_mode.png), takimin dokusu da ayri bir
# 256x256; halenin dokusu 64x64. Uc farkli doku tek
# geometriye sigmiyor -- uv'leri yeniden hesaplamak gerekirdi.
#
# Onun yerine v4.90 makinesinin kendi yolu kullaniliyor:
# ek katman KENDI geometrisi, KENDI dokusu ve KENDI render
# denetleyicisiyle geliyor, ama tetigi ANA MODUN degiskeni.
# Yani cekirdek elde oldugunda ikisi birden ciziliyor.
#
# ---- ALINMAYANLAR (uydurulmadi, raporlaniyor) ----
#   exo_mode      . Guc modunun ikinci takimi; ana takimla
#                   ayni bolgeleri kapliyor, uzerine binince
#                   z-cakismasi yapiyor.
#   steel_glow /  . emissive katmanlar. Bedrock'un oyuncu
#   *_glow          modelinde parlama yok; rengi zaten ana
#                   dokuya bindirildi (v4.94), parlamasi eksik.
#   thrusters,    . parcacik/isik yayici katmanlar, model
#   lightning       degil.
#   transform_flash . donusum caktisi; bizde ZIRH_CAKMA
#                     parcacigi olarak zaten var (v4.94).
#
# ---- MATKAP NEDEN ARTIK ACILARAK GELIYOR  (v5.8) ----
# Kullanici: "Max steel modunda guc modunu actigin zaman direkt
# elimde matkap oluyor; normalde matkap icin yetenekler kismi
# var ya, agac seklinde, tek tek acabiliyorsun."
#
# HAKLIYDI, ve kaynakta olculdu. strength_mode.json:
#     "gui_display_type": "tree"
#     drill_hands  -> tur palladium:tool_hands
#                     list_index 1, hidden_in_bar FALSE
# Yani matkap modun YETENEK BARINDA 1 numarali slot: oyuncu
# acip kapatiyor. Digerleri de oyle -- drilling 0, exo_render 2,
# armour 8. Biz "cekirdek eldeyse hep cizili" yapmisiz.
#
# Duzeltme: ek katmanin dorduncu alani bir VARLIK OZELLIGI.
# Doluysa katman yalniz o ozellik acikken ciziliyor; bosaysa
# eskisi gibi (Titan halesi oyle -- kaynakta onun bar slotu
# yok, takimin ayrilmaz parcasi).
#
# (mod anahtari, ek katman anahtari, geo dosyasi, animasyon, ozellik)
ZIRH_EK = [
    ("guc",   "zirh_mod_guc_matkap",  "zirh_mod_guc_matkap",  "drill_spin",
     "pa:matkap"),
    ("titan", "zirh_mod_titan_hale",  "zirh_mod_titan_hale",  None, None),
]

# Ek katman ozellikleri -> BP oyuncu varligindaki tanim.
# Bicim Marvel Project'in kendi player.json'undan alindi
# (27 ozellik, hepsi ayni sekilde) -- calistigi BILINIYOR.
ZIRH_EK_OZELLIKLER = {
    ozellik: {"type": "bool", "default": False, "client_sync": True}
    for _m, _k, _g, _a, ozellik in ZIRH_EK if ozellik
}

# Ek katmanlarin animasyonlari: dosya adi -> Bedrock kimligi.
#
# ---- BU DOSYA OLDUGU GIBI KOPYALANAMIYOR ----
# Ben 10 animasyonlari oldugu gibi kopyalanabilmisti cunku
# anahtarlari zaten "animation." ile basliyordu
# (animation.ripjaws.swim_fast gibi). Ionstrike'inki OYLE
# DEGIL: dosyanin icindeki anahtar duz "drill".
#
#   {"format_version":"1.8.0","animations":{"drill":{...}}}
#
# Bu GeckoLib'in kendi kurali; Bedrock'ta bir animasyonun
# kimligi "animation." ile BASLAMAK ZORUNDA, yoksa oyun onu
# hic tanimiyor ve animasyon SESSIZCE hic oynamiyor.
#
# (Modun kendi render_layer'i zaten "animation.drill_spin"
# diye cagiriyor -- yani dogru ad bu, dosyadaki anahtar
# eksik yazilmis.)
#
# O yuzden tek sey degistiriliyor: ANAHTAR. Kemikler, kare
# zamanlari, donusler HIC ELLENMIYOR; test ikisini
# karsilastiriyor.
ZIRH_EK_ANIM = {"drill_spin": "animation.drill_spin"}

ZIRH_TR_TAKIM = "Zırh Yükseltmesi"

# (anahtar, yuva, koruma, TR ad, EN ad, ikon bolgesi)
# ikon bolgesi = 64x64 skin duzeninde hangi kare ikona gececek.
# Uydurma cizim YOK: giydigin seyin kendi pikselleri.
# ---- GIYILEBILIR TAKIM KALDIRILDI  (v4.95) ----
#
# Kullanici: "iki surum oncesinde modlara donusebilmek icin
# temel zirh gerekiyordu... sonra cekirdek kavrami geldi ve
# artik temel zirha ihtiyac kalmadi... sadece yaratici
# modundayken oradan zirhi giyebiliyorduk ya, temel zirhi --
# onu kaldir, ama cekirdek kismini, temel zirhi, ekle."
#
# Yani: DORT GIYILEBILIR PARCA gidiyor, DOKUZ CEKIRDEK
# (Temel dahil) kaliyor. Gerekcesi ayarlar.js'te uzun uzun
# yazili; ozeti: takim bir kapiydi, arkasindaki her sey artik
# cekirdekten geliyor.
#
# Liste BOS BIRAKILDI, silinmedi: asagidaki dongular ve
# "beklenen ikonlar" denetimi ayni sekilde calissin, geri
# eklemek gerekirse tek satir olsun.
#
# zirh_esyasi / zirh_ikonu / zirh_attachable fonksiyonlari da
# duruyor -- zirh_geometrisi'ni MOD CEKIRDEKLERI kullaniyor,
# digerleri onunla ayni bolumde ve silmek diffi buyutmekten
# baska bir sey yapmazdi.
ZIRH = []


def zirh_geometrisi(anahtar):
    """Zirh parcasinin modeli.

    KEMIK ADLARI VANILLA OYUNCUNUNKIYLE AYNI olmak zorunda:
    attachable o adlarla oyuncunun kemiklerine yapisiyor. Ad
    kayarsa parca havada durur.

    UV'ler skin duzeninden; doku zaten oyuncu skini duzeninde
    (Ionstrike'in kendi dosyasi, donusturulmedi).

    SISIRME (inflate) degerleri vanilla zirhin mantigiyla:
    ustteki katman altakinden buyuk olmali, yoksa z-cakismasi
    (titreyen yuzeyler) olur. Bot bacakligin USTUNDE oldugu icin
    daha cok sisiyor ve daha KISA bir kutuya biniyor.            """
    def kup(org, boyut, uv, sis):
        return {"origin": org, "size": boyut, "uv": uv, "inflate": sis}

    if anahtar == "zirh_bas":
        kemikler = [{"name": "head", "pivot": [0, 24, 0], "cubes": [
            kup([-4, 24, -4], [8, 8, 8], [0, 0], 1.0)]}]
    elif anahtar == "zirh_govde":
        kemikler = [
            {"name": "body", "pivot": [0, 24, 0], "cubes": [
                kup([-4, 12, -2], [8, 12, 4], [16, 16], 1.01)]},
            {"name": "rightArm", "pivot": [-5, 22, 0], "cubes": [
                kup([-8, 12, -2], [4, 12, 4], [40, 16], 1.0)]},
            {"name": "leftArm", "pivot": [5, 22, 0], "cubes": [
                kup([4, 12, -2], [4, 12, 4], [32, 48], 1.0)]},
        ]
    elif anahtar == "zirh_bacak":
        kemikler = [
            {"name": "rightLeg", "pivot": [-1.9, 12, 0], "cubes": [
                kup([-3.9, 0, -2], [4, 12, 4], [0, 16], 0.5)]},
            {"name": "leftLeg", "pivot": [1.9, 12, 0], "cubes": [
                kup([-0.1, 0, -2], [4, 12, 4], [16, 48], 0.5)]},
        ]
    else:  # zirh_ayak
        # ALT 6 BIRIM. UV'si OLCULDU, tahmin degil:
        # 4x12x4 bir bacagin yan yuzleri v+4 satirindan baslar ve
        # 12 satir surer (sag bacak: 20..31). Alt 6 satir 26..31.
        # 4x6x4 bir kutunun bandi 4+6=10 satir; uv (0,22) yazinca
        # yan yuzleri tam 26..31'e oturuyor.
        kemikler = [
            {"name": "rightLeg", "pivot": [-1.9, 12, 0], "cubes": [
                kup([-3.9, 0, -2], [4, 6, 4], [0, 22], 1.0)]},
            {"name": "leftLeg", "pivot": [1.9, 12, 0], "cubes": [
                kup([-0.1, 0, -2], [4, 6, 4], [16, 54], 1.0)]},
        ]

    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + anahtar,
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 2,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": kemikler,
        }],
    }


def zirh_attachable(anahtar):
    """Parcanin oyuncuya cizilmesi.

    controller.render.armor + tek doku: GOZ SISTEMIMIZLE BIREBIR
    AYNI kurulum, yani oyunda calistigi BILINEN yol. Ozel render
    controller'a girilmedi -- v4.28'de tam o denendi ve bot
    gorunmez oldu.                                               """
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": "pa:" + anahtar,
                "materials": {
                    "default": "armor",
                    "enchanted": "armor_enchanted",
                },
                "textures": {
                    "default": "textures/entity/" + ZIRH_DOKU,
                    "enchanted": "textures/misc/enchanted_actor_glint",
                },
                "geometry": {"default": "geometry." + anahtar},
                "render_controllers": ["controller.render.armor"],
            }
        },
    }


def zirh_esyasi(anahtar, yuva, koruma, ad):
    """Giyilebilir parca.

    Dayaniklilik YOK: bir yukseltme kullandikca kirilmamali
    (patron silahlarindaki karar).                               """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + anahtar,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": anahtar},
                "minecraft:display_name": {"value": ad},
                "minecraft:max_stack_size": 1,
                "minecraft:wearable": {"slot": yuva, "protection": koruma},
                # Etiket: script "takim uzerinde mi" diye bakarken
                # kimlikleri tek tek yazmak zorunda kalmasin.
                "minecraft:tags": {"tags": ["pa:zirh_yukseltmesi"]},
            },
        },
    }


def zirh_ikonu(bolge):
    """Ikon = giydigin seyin KENDI pikselleri.

    Skin degisirse ikon da degisir; iki yerde cizim olmadigi icin
    ayrisamazlar.                                                """
    try:
        from PIL import Image
    except ImportError:
        return None
    kaynak = os.path.join(DOKU_KAYNAK, ZIRH_DOKU + ".png")
    if not os.path.exists(kaynak):
        return None
    im = Image.open(kaynak).convert("RGBA")
    parca = im.crop(bolge)
    # 16x16'ya oturt: en-boy orani korunuyor, ortalaniyor.
    en, boy = parca.size
    k = min(16 // max(1, en), 16 // max(1, boy)) or 1
    parca = parca.resize((en * k, boy * k), Image.NEAREST)
    ikon = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    ikon.paste(parca, ((16 - parca.width) // 2, (16 - parca.height) // 2), parca)
    return ikon




# ================================================================
#  TEKNOLOJI ZIRHLARI                                      v5.1
#  ProjectE · Mekanism · Draconic Evolution
# ================================================================
# Kullanici: "bunlar direkt zirh modlari degil ama bizim
# odaklanacagimiz sey bunlarin verdigi zirhlar, sadece onlari
# alacagiz, hicbir seyi almayacagiz onlardan baska."
#
# Sayilarin nereden okundugu REFERANS_TEKNOLOJI.md'de sinif
# adiyla yazili; ceviri kararlari ayarlar.js'te. Burasi yalniz
# DOSYA URETIYOR.
#
# ---- UC AYRI GORUNUS YOLU, UC AYRI SEBEP ----
#
# ProjectE : modun kendi JAVA ZIRH KATMANLARI (64x32) var ve
#            duzeni Bedrock'in zirh geometrisiyle birebir ayni.
#            Dogrudan kullaniliyor; sol kol/bacak vanilla gibi
#            AYNALANIYOR (mirror), cunku 64x32 duzende sol
#            parcanin ayri pikselleri yok.
#
# Mekanism : model bir OBJ. Blockbench cikisi, yani KUTULARDAN
#            olusuyor -> Bedrock'a birebir cevrildi
#            (obj_coz.py). Dort 32x32 doku tek 64x64 atlasta.
#
# Draconic : model Blender'dan cikma SERBEST UCGEN AGI. Bedrock
#            varlik geometrisi yalniz kutu kabul ediyor, yani
#            giyilen model AKTARILAMIYOR. Gogusluk esya
#            ikonuyla geliyor, attachable YOK. Uydurma bir
#            model cizmek yerine eksik birakildi ve rapor
#            edildi.
TEKNOLOJI_ONEK = "pa:"

# (parca, yuva, koruma) -- koruma ayarlar.js:TEKNOLOJI_KORUMA
# ile AYNI olmak zorunda; test ikisini karsilastiriyor.
TEKNOLOJI_PARCA = [
    ("bas",   "slot.armor.head",  3, "Başlık",  "Helmet"),
    ("govde", "slot.armor.chest", 8, "Göğüslük", "Chestplate"),
    ("bacak", "slot.armor.legs",  6, "Pantolon", "Leggings"),
    ("ayak",  "slot.armor.feet",  3, "Bot",     "Boots"),
]

# (anahtar, TR ad, EN ad, parcalar, gorunus)
#   gorunus = "pe"    -> java zirh katmani (k1/k2)
#             "meka"  -> obj'den cevrilmis geometri + atlas
#             None    -> giyilen model yok (Draconic)
TEKNOLOJI_TAKIM = [
    ("pe_kara",      "Kara Madde",         "Dark Matter",
     ["bas", "govde", "bacak", "ayak"], "pe"),
    ("pe_kizil",     "Kızıl Madde",        "Red Matter",
     ["bas", "govde", "bacak", "ayak"], "pe"),
    ("pe_mucevher",  "Mücevher",           "Gem",
     ["bas", "govde", "bacak", "ayak"], "pe"),
    ("meka",         "MekaSuit",           "MekaSuit",
     ["bas", "govde", "bacak", "ayak"], "meka"),
    ("draco_wyvern",   "Wyvern Göğüslüğü",   "Wyvern Chestpiece",
     ["govde"], None),
    ("draco_draconic", "Draconic Göğüslüğü", "Draconic Chestpiece",
     ["govde"], None),
    ("draco_chaotic",  "Chaotic Göğüslüğü",  "Chaotic Chestpiece",
     ["govde"], None),
]

# ProjectE: hangi parca hangi katmani kullaniyor. Java'nin
# kurali; okundu, secilmedi:
#   layer_1 -> baslik, gogusluk, bot
#   layer_2 -> pantolon
PE_KATMAN = {"bas": 1, "govde": 1, "bacak": 2, "ayak": 1}

# Mekanism atlasi: dort 32x32 doku bir 64x64 karede.
# (malzeme numarasi -> kaynak dosya, atlas ofseti)
MEKA_ATLAS = {
    "2": ("mekasuit_player",              0,  0),
    "3": ("mekasuit_armor_body",         32,  0),
    "4": ("mekasuit_armor_helmet",        0, 32),
    "5": ("mekasuit_armor_exoskeleton",  32, 32),
}
MEKA_DOKU = "meka_suit"
# Modun KENDI obj'si depoya alindi (kaynak_geo/mekasuit.obj) ve
# uretim sirasinda cevriliyor -- onceden cevrilmis bir JSON
# saklanmadi. Sebep: cevirinin kendisi denetlenebilir kalsin,
# "bu sayilar nereden geldi" sorusunun cevabi dosyada dursun.
MEKA_OBJ = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "kaynak_geo", "mekasuit.obj")


def meka_geometrileri():
    """MekaSuit'in dort parcasi, OBJ'den cevrilmis.

    Cevirici obj_coz.py; nasil calistigi orada yazili. Burada
    yalniz atlas yerlesimi veriliyor.

    obj_coz yoksa (ya da obj dosyasi yoksa) BOS donuyor ve
    uretim devam ediyor -- eksik bir dosya butun paketi
    dusurmesin.                                              """
    if not os.path.exists(MEKA_OBJ):
        print("UYARI: mekasuit.obj yok (%s)" % MEKA_OBJ)
        return {}
    try:
        from obj_coz import geometri_uret
    except ImportError:
        print("UYARI: obj_coz.py yok -- MekaSuit modeli uretilmedi")
        return {}
    harita = {m: (x, y, 32, 32) for m, (_, x, y) in MEKA_ATLAS.items()}
    geo, atlanan = geometri_uret(MEKA_OBJ, harita, "meka_")
    for ad, sebep in atlanan:
        print("UYARI: mekasuit kutusu atlandi: %s -- %s" % (ad, sebep))
    return geo


def teknoloji_esyasi(takim, parca, yuva, koruma, ad):
    """Giyilebilir zirh parcasi.

    Dayaniklilik YOK: kaynakta da yok. ProjectE'nin
    PEArmor.damageItem'i sabit 0 donduruyor (yani zirh hic
    yipranmiyor), Mekanism ve Draconic enerjiyle calisiyor
    ve dayanikliligi hic kullanmiyor.                        """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": TEKNOLOJI_ONEK + takim + "_" + parca,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": takim + "_" + parca},
                "minecraft:display_name": {"value": ad},
                "minecraft:max_stack_size": 1,
                "minecraft:wearable": {"slot": yuva, "protection": koruma},
                "minecraft:armor": {"protection": koruma},
                # Etiket: script "teknoloji zirhi mi" diye
                # bakarken kimlikleri tek tek yazmasin.
                "minecraft:tags": {"tags": ["pa:teknoloji_zirhi"]},
            },
        },
    }


def teknoloji_pe_geometrisi(takim, parca):
    """ProjectE parcasinin modeli -- JAVA ZIRH DUZENI (64x32).

    Bu duzen `zirh_geometrisi`nin kullandigi 64x64 SKIN
    duzeninden BASKA: sol kol ve sol bacagin ayri pikselleri
    yok, sag olanin AYNASI cizilyor. Bedrock'ta bunun karsiligi
    kutunun "mirror" alani.

    Sisirme (inflate) vanillanin degerleriyle: pantolon 0.5,
    otekiler 1.0. Ustteki katman altakinden buyuk olmali,
    yoksa z-cakismasi (titreyen yuzey) olur.                 """
    def kup(org, boyut, uv, sis, ayna=False):
        k = {"origin": org, "size": boyut, "uv": uv, "inflate": sis}
        if ayna:
            k["mirror"] = True
        return k

    if parca == "bas":
        kemikler = [{"name": "head", "pivot": [0, 24, 0], "cubes": [
            kup([-4, 24, -4], [8, 8, 8], [0, 0], 1.0)]}]
    elif parca == "govde":
        kemikler = [
            {"name": "body", "pivot": [0, 24, 0], "cubes": [
                kup([-4, 12, -2], [8, 12, 4], [16, 16], 1.01)]},
            {"name": "rightArm", "pivot": [-5, 22, 0], "cubes": [
                kup([-8, 12, -2], [4, 12, 4], [40, 16], 1.0)]},
            {"name": "leftArm", "pivot": [5, 22, 0], "cubes": [
                kup([4, 12, -2], [4, 12, 4], [40, 16], 1.0, ayna=True)]},
        ]
    elif parca == "bacak":
        kemikler = [
            {"name": "body", "pivot": [0, 24, 0], "cubes": [
                kup([-4, 12, -2], [8, 12, 4], [16, 16], 0.51)]},
            {"name": "rightLeg", "pivot": [-1.9, 12, 0], "cubes": [
                kup([-3.9, 0, -2], [4, 12, 4], [0, 16], 0.5)]},
            {"name": "leftLeg", "pivot": [1.9, 12, 0], "cubes": [
                kup([-0.1, 0, -2], [4, 12, 4], [0, 16], 0.5, ayna=True)]},
        ]
    else:   # ayak
        # Bot vanilla Java'da BACAGIN TAMAMI kadar bir kutu:
        # dokuda yalniz botun pikselleri var, ustu saydam.
        # 6 birimlik kisa kutuya inmedik cunku o zaman
        # dokunun UV'si kayardi (v4.91'de olculmustu).
        kemikler = [
            {"name": "rightLeg", "pivot": [-1.9, 12, 0], "cubes": [
                kup([-3.9, 0, -2], [4, 12, 4], [0, 16], 1.0)]},
            {"name": "leftLeg", "pivot": [1.9, 12, 0], "cubes": [
                kup([-0.1, 0, -2], [4, 12, 4], [0, 16], 1.0, ayna=True)]},
        ]

    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + takim + "_" + parca,
                "texture_width": 64,
                "texture_height": 32,
                "visible_bounds_width": 2,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": kemikler,
        }],
    }


def teknoloji_attachable(takim, parca, doku):
    """Parcanin oyuncuya cizilmesi.

    controller.render.armor + tek doku: goz ve zirh
    yukseltmesindeki kurulumun AYNISI, yani oyunda calistigi
    BILINEN yol. Ozel render controller'a girilmedi -- v4.28'de
    tam o denendi ve bot gorunmez oldu.                      """
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": TEKNOLOJI_ONEK + takim + "_" + parca,
                "materials": {
                    "default": "armor",
                    "enchanted": "armor_enchanted",
                },
                "textures": {
                    "default": "textures/entity/" + doku,
                    "enchanted": "textures/misc/enchanted_actor_glint",
                },
                "geometry": {"default": "geometry." + takim + "_" + parca},
                "render_controllers": ["controller.render.armor"],
            }
        },
    }


# ---- WEAPONS OF MIRACLES KALDIRILDI  (v5.8) ----
# Kullanici: "animasyon tarafinda gene bozulmalar var. En iyisi
# onun ekledigi silahlar ve animasyonlari tum dosyalardan hangi
# dosyalarda varsa silelim tamamiyla."
#
# Kaldirilanlar: WOM tablosu (27 silah), wom_esyasi(), WOM_RENK,
# WOM_ANIM_DOSYA/ONEK, WOM_SERI (63 animasyon) ve uretim
# dongusu. Gerekcesi ayarlar.js'te uzun uzun yazili.
#
# Cevirinin dersleri NOTLAR.md v5.5'te duruyor; kod gitti,
# bilgi kaldi.

# ================================================================
#  MAHOU TSUKAI  (Buyucu)                                v5.4
# ================================================================
# Kullanici: "bir tane daha mod buldum, bunu da ekle aynı
# şekilde... kalıcı olarak aktar."
#
# ---- KAYNAK ----
# mahoutsukai 1.21.1 v1.36.27. Sayilar modun KENDI
# yapilandirmasindan (MTConfig$Server, 448 ayar); cikarma
# mahou_coz.py'nin isi ve sonucu depoda (mahou_config.json).
#
# ---- BUYULER TEK DOKUYU PAYLASIYOR ----
# Modda butun parsomenler `spell_scroll.png` kullaniyor --
# 45 buyu icin 45 ayri ikon YOK. Bizde de oyle: yirmi
# parsomen tek ikonla geliyor. Farkli gorunsunler diye ikon
# UYDURMADIK; ayirt edici sey esyanin ADI ve menudeki ozeti.
#
# ---- WILLIAM ALINMADI ----
# Modda 2B ikonu yok (builtin/entity ile ciziliyor), yani
# alinacak piksel yok. Uydurma ikon cizmek yerine
# aktarilmadi ve NOTLAR.md'de yazili.
MAHOU_ONEK = "mahou_"
MAHOU_DOKU_KAYNAK = os.path.join(DOKU_KAYNAK, "mahou")
MAHOU_PARSOMEN_DOKU = "spell_scroll"

# (anahtar, TR ad, EN ad, java hasar modifier|None, dayaniklilik|None)
# ayarlar.js:MAHOU_ESYALAR ile AYNI olmak zorunda; test
# ikisini karsilastiriyor.
MAHOU_ESYA = [
    ("caliburn", "Caliburn", "Caliburn", 3, 1000),
    ("clarent", "Clarent", "Clarent", 3, 1500),
    ("morgan", "Morgan", "Morgan", 3, 1000),
    ("rule_breaker", "Rule Breaker", "Rule Breaker", 5, 1000),
    ("rhongomyniad", "Rhongomyniad", "Rhongomyniad", 3, 1000),
    ("theripper", "The Ripper", "The Ripper", 2.5, 1200),
    ("nobu", "Nobu", "Nobu", 8, 10000),
    ("staff_emrys", "Emrys", "Emrys", None, 1000),
    ("mystic_staff", "Patlayıcı Mana Asası",
     "Mystic Staff of Explosive Mana Condensation", None, 1000),
    ("spatial_staff", "Uzamsal Karışıklık Asası",
     "Mystic Staff of Spatial Disorientation", None, 1000),
    ("treasury_projection_gauntlet", "Hazine Yansıtma Eldiveni",
     "Treasury Projection Gauntlet", None, 1000),
    ("dagger", "Hançer", "Dagger", None, None),
    ("hammer", "Çekiç", "Hammer", None, None),
    ("kodoku", "Kodoku", "Kodoku", None, None),
    ("attuned_diamond", "Uyumlu Elmas", "Attuned Diamond", None, None),
    ("attuned_emerald", "Uyumlu Zümrüt", "Attuned Emerald", None, None),
]

# (anahtar, TR ad, EN ad) -- hepsi ayni parsomen ikonunu
# kullaniyor (kaynakta da oyle).
MAHOU_BUYU = [
    ("fay_gorusu", "Fay Görüşü Parşömeni", "Scroll of Fay Sight"),
    ("icgoru", "İçgörü Parşömeni", "Scroll of the Mystic Eyes of Insight"),
    ("kehanet", "Kehanet Parşömeni",
     "Scroll of the Mystic Eyes of Clairvoyance"),
    ("baglama", "Bağlama Parşömeni",
     "Scroll of the Mystic Eyes of Binding"),
    ("guclendirme", "Güçlendirme Parşömeni", "Scroll of Strengthening"),
    ("bagisiklik_takasi", "Bağışıklık Takası Parşömeni",
     "Scroll of Immunity Exchange"),
    ("gizlenme", "Varlık Gizleme Parşömeni",
     "Scroll of Presence Concealment"),
    ("gandr", "Gandr Parşömeni", "Scroll of Gandr"),
    ("kara_alev", "Kara Alev Parşömeni",
     "Scroll of the Mystic Eyes of the Black Flame"),
    ("dusus", "Düşüş Parşömeni", "Scroll of Fallen Down"),
    ("rho_aias", "Rho Aias Parşömeni", "Scroll of Rho Aias"),
    ("can_emme_siniri", "Can Emme Sınırı Parşömeni",
     "Scroll of the Boundary of Drain Life"),
    ("yercekimi_siniri", "Yerçekimi Sınırı Parşömeni",
     "Scroll of the Gravity Boundary"),
    ("alarm_siniri", "Alarm Sınırı Parşömeni",
     "Scroll of the Alarm Boundary"),
    ("yer_degistirme", "Zihinsel Yer Değiştirme Parşömeni",
     "Scroll of Mental Displacement"),
    ("uzamsal_karisiklik", "Uzamsal Karışıklık Parşömeni",
     "Scroll of Spatial Disorientation"),
    ("yukselis", "Yükseliş Parşömeni", "Scroll of Ascension"),
    ("olum_toplama", "Ölüm Toplama Parşömeni",
     "Scroll of the Mystic Eyes of Death Collection"),
    ("kelebek_etkisi", "Kelebek Etkisi Parşömeni",
     "Scroll of the Butterfly Effect"),
    ("hasar_takasi", "Hasar Takası Parşömeni", "Scroll of Damage Exchange"),
]


def mahou_esyasi(anahtar, tr_ad, hasar, dayaniklilik):
    """Mahou esyasi.

    Hasar Java'da DEGISTIRICI, Bedrock'ta TOPLAM -> +1
    (WoM'da olculmus kural). `hasar` None ise silah degil,
    alet/odak: hasar bileseni HIC yazilmiyor -- kaynakta da
    yok.                                                     """
    bilesenler = {
        "minecraft:icon": {"texture": MAHOU_ONEK + anahtar},
        "minecraft:display_name": {"value": tr_ad},
        "minecraft:max_stack_size": 1,
        "minecraft:tags": {"tags": ["pa:mahou", "pa:mahou_esya"]},
    }
    if hasar is not None:
        bilesenler["minecraft:hand_equipped"] = True
        bilesenler["minecraft:allow_off_hand"] = False
        bilesenler["minecraft:damage"] = int(round(hasar)) + 1
    if dayaniklilik:
        bilesenler["minecraft:durability"] = {"max_durability": dayaniklilik}
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + MAHOU_ONEK + anahtar,
                "menu_category": {"category": "equipment"},
            },
            "components": bilesenler,
        },
    }


def mahou_parsomeni(anahtar, tr_ad):
    """Buyu parsomeni. Silah degil: hasar ve dayaniklilik YOK,
    tutulup tetikleniyor.                                     """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + MAHOU_ONEK + anahtar,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": MAHOU_ONEK + anahtar},
                "minecraft:display_name": {"value": tr_ad},
                "minecraft:max_stack_size": 1,
                "minecraft:tags": {"tags": ["pa:mahou", "pa:mahou_buyu"]},
            },
        },
    }


# ================================================================
#  MARVEL PROJECT                                        v5.2
# ================================================================
# Kullanici: "bir tane daha mod kurdum, bu sefer ugrasmana gerek
# kalmayacak cunku bedrock uzerine kurulu. Eski kahramanlari
# tamamen atiyoruz, Fisk modunu bos veriyoruz artik. Onun yerine
# bunu ekle, bunun tum kahramanlarini."
#
# FISK GITTI: dokuz kahraman, kostum geometrisi, dokulari,
# ikonlari ve kaynak_doku/kahraman_coz.py silindi.
#
# ---- KAYNAK ----
# Marvel Project Addon v3.0.1 (.mcaddon). BEDROCK paketi:
# geometri, doku ve ikon DOGRUDAN kullanilabiliyor. Cikarma
# marvel_coz.py'nin isi ve BIR KEZ yapildi; sonucu depoda:
#     marvel_tablo.py         268 parcanin tablosu
#     kaynak_geo/marvel/      geometriler
#     kaynak_doku/marvel/     dokular ve ikonlar
# Bu dosya moda hic bakmiyor, yalniz o uce bakiyor.
#
# ---- UCLU KALIP ----
# Kaynagin kendi kalibi korundu:
#     kostum -> ayak yuvasi (gorunus + zirh)
#     maske  -> kafa yuvasi (gorunus + zirh)
#     guc    -> bacak yuvasi (YETENEK, gorunusu yok)
#
# ---- RENDER CONTROLLER NEDEN DEGISTI ----
# Modun attachable'lari kendi varlik ozelliklerine bakiyor
# (`q.property('arathnido:SuitTexture0')`). O ozellikler bizim
# pakette YOK; oyle birakilsa kostum hic cizilmezdi. Hepsi
# `controller.render.armor`a cevrildi -- goz, zirh ve teknoloji
# zirhlarinda calistigi BILINEN yol (v4.28 dersi: ozel render
# controller denendi ve bot gorunmez oldu).
# Bedeli: bir kostumun doku VARYANTLARI gelmiyor, varsayilan
# doku geliyor. Gizlenmedi, NOTLAR.md'de yazili.
MARVEL_ONEK = "mrv_"
MARVEL_AYIRAC = "__"
MARVEL_GEO_KAYNAK = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "kaynak_geo", "marvel")
MARVEL_DOKU_KAYNAK = os.path.join(DOKU_KAYNAK, "marvel")

try:
    from marvel_tablo import MARVEL_PARCA
except ImportError:      # tablo yoksa uretim yine calissin
    MARVEL_PARCA = []
    print("UYARI: marvel_tablo.py yok -- Marvel parcalari uretilmedi")


def marvel_kimlik(p):
    """pa:mrv_<kahraman>__<anahtar> -- kimlik kendi kahramanini
    soyluyor, boylece calisma zamani 268 satirlik bir esleme
    tablosu tutmak zorunda kalmiyor.                          """
    return MARVEL_ONEK + p["kahraman"] + MARVEL_AYIRAC + p["anahtar"]


# ---- OYUNCU VARLIGI: BOY DEGISTIRME  (v5.3) ----
# Kullanici: "boy degistirme... bunlari almayacaksan zaten
# kahraman diye bir sey kalmiyor."
#
# Bedrock'ta oyuncunun OLCEGINI script degistiremiyor; yalniz
# BILESEN GRUBU degistirebiliyor. Bu yuzden depoda ilk kez bir
# BP oyuncu varligi var.
#
# ---- BILESENLER NEREDEN ----
# `components` blogu vanilla oyuncunun kendi bilesen kumesi;
# Marvel modunun bp/entities/player.json dosyasindan BIREBIR
# alindi (1979 bayt, 23 bilesen). Elle yazilmadi -- eksik bir
# bilesen oyuncuyu bozar ve hatasi cok gec anlasilir.
#
# ---- NEDEN MODUN TAMAMI ALINMADI ----
# Modun player.json'u 272 KB ve 612 olay tasiyor (kendi 385
# bilesen grubu). Bize yalniz UC olcek grubu lazim; gerisi
# baska kahramanlarin makinesi ve bizde karsiligi yok.
#
# Olcekler modun kendi dosyasindan:
#   antman:small -> scale 0.05, carpisma kutusu 0.6 x 0.6
#   antman:big   -> scale 5.0,  carpisma kutusu 0.6 x 1.8
MARVEL_OYUNCU_BILESEN = {
    "minecraft:experience_reward": {
        "on_death": "Math.Min(query.player_level * 7, 100)"},
    "minecraft:type_family": {"family": ["player"]},
    "minecraft:is_hidden_when_invisible": {},
    "minecraft:loot": {"table": "loot_tables/empty.json"},
    "minecraft:collision_box": {"width": 0.6, "height": 1.8},
    "minecraft:can_climb": {},
    "minecraft:movement": {"value": 0.1},
    "minecraft:hurt_on_condition": {"damage_conditions": [{
        "filters": {"test": "in_lava", "subject": "self",
                    "operator": "==", "value": True},
        "cause": "lava", "damage_per_tick": 4}]},
    "minecraft:attack": {"damage": 1},
    "minecraft:exhaustion_values": {
        "heal": 6, "jump": 0.05, "sprint_jump": 0.2, "mine": 0.005,
        "attack": 0.1, "damage": 0.1, "walk": 0.0, "sprint": 0.1,
        "swim": 0.01},
    "minecraft:player.saturation": {"value": 5, "max": 20},
    "minecraft:player.exhaustion": {"value": 0, "max": 20},
    "minecraft:player.level": {"value": 0, "max": 24791},
    "minecraft:player.experience": {"value": 0, "max": 1},
    "minecraft:breathable": {"total_supply": 15, "suffocate_time": -1,
                             "inhale_time": 3.75, "generates_bubbles": False},
    "minecraft:nameable": {"always_show": True,
                           "allow_name_tag_renaming": False},
    "minecraft:physics": {"push_towards_closest_space": True},
    "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": True},
    "minecraft:insomnia": {"days_until_insomnia": 3},
    "minecraft:rideable": {
        "seat_count": 2, "family_types": ["parrot_tame"],
        "pull_in_entities": True,
        "seats": [
            {"position": [0.4, -0.2, -0.1], "min_rider_count": 0,
             "max_rider_count": 0, "lock_rider_rotation": 0},
            {"position": [-0.4, -0.2, -0.1], "min_rider_count": 1,
             "max_rider_count": 2, "lock_rider_rotation": 0}]},
    "minecraft:conditional_bandwidth_optimization": {},
    "minecraft:block_climber": {},
}

# (olay, grup, olcek, kutu eni, kutu boyu) -- ayarlar.js
# MARVEL_BOY_OLCEK ile AYNI olmak zorunda; test karsilastiriyor.
MARVEL_BOY = [
    ("pa:boy_normal", "pa_boy_normal", 1.0,  0.6, 1.8),
    ("pa:boy_kucuk",  "pa_boy_kucuk",  0.05, 0.6, 0.6),
    ("pa:boy_buyuk",  "pa_boy_buyuk",  5.0,  0.6, 1.8),
]


def marvel_oyuncu_varligi():
    """BP oyuncu varligi -- yalniz boy degistirme icin.

    format_version 1.18.20: modun kendi dosyasindaki surum.
    Daha yenisi denenmedi cunku bu surumun tablette calistigi
    BILINIYOR (mod calisiyor).                                 """
    gruplar = {}
    olaylar = {}
    adlar = [g for _, g, _, _, _ in MARVEL_BOY]
    for olay, grup, olcek, en, boy in MARVEL_BOY:
        gruplar[grup] = {
            "minecraft:scale": {"value": olcek},
            "minecraft:collision_box": {"width": en, "height": boy},
        }
        olaylar[olay] = {
            "add": {"component_groups": [grup]},
            "remove": {"component_groups": [g for g in adlar if g != grup]},
        }
    return {
        "format_version": "1.18.20",
        "minecraft:entity": {
            "description": {
                "identifier": "minecraft:player",
                "is_spawnable": False,
                "is_summonable": False,
                "is_experimental": False,
                # v5.8: acilabilir katmanlarin anahtarlari
                # (matkap). Script setProperty ile aciyor,
                # kaynak paket q.property ile okuyor.
                "properties": ZIRH_EK_OZELLIKLER,
            },
            "component_groups": gruplar,
            "components": MARVEL_OYUNCU_BILESEN,
            "events": olaylar,
        },
    }


def marvel_esyasi(p):
    """Giyilebilir parca. Zirh puani, yuva ve dayaniklilik
    MODUN KENDI esyasindan -- hicbiri yeniden hesaplanmadi.  """
    ad = marvel_kimlik(p)
    bilesenler = {
        "minecraft:icon": {"texture": ad},
        "minecraft:display_name": {"value": p["ad"]},
        "minecraft:max_stack_size": 1,
        "minecraft:wearable": {"slot": p["yuva"],
                               "protection": p["koruma"]},
        "minecraft:tags": {"tags": ["pa:marvel", "pa:marvel_" + p["tur"]]},
    }
    if p["koruma"]:
        bilesenler["minecraft:armor"] = {"protection": p["koruma"]}
    if p["dayaniklilik"]:
        bilesenler["minecraft:durability"] = {
            "max_durability": p["dayaniklilik"]}
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + ad,
                "menu_category": {"category": "equipment"},
            },
            "components": bilesenler,
        },
    }


def marvel_attachable(p):
    """Kostum/maskenin oyuncuya cizilmesi.

    Geometri kimligi cikarma sirasinda `geometry.mrv_*` olarak
    yeniden adlandirildi: modun kendi adlari vanilla ve bizim
    geometrilerle carpisabilirdi.                             """
    ad = marvel_kimlik(p)
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": "pa:" + ad,
                "materials": {
                    "default": "armor",
                    "enchanted": "armor_enchanted",
                },
                "textures": {
                    "default": "textures/entity/" + ad,
                    "enchanted": "textures/misc/enchanted_actor_glint",
                },
                "geometry": {"default": "geometry." + p["geo"]},
                "render_controllers": ["controller.render.armor"],
            }
        },
    }


# ================================================================
#  KONSEY  (CodeMan / Astra Studios + BoraLo / Dragon Studios)
#                                                        v6.2
# ================================================================
# Kullanici: "yeni boralo notlari buldum, bunlardan alabildigimizi
# alalim, esya dahil her sey."
#
# ---- BUNLAR ZATEN BEDROCK ----
# Onceki BoraLo bir JAVA moduydu (REFERANS_BORALO.md) ve
# modellerini bytecode'dan cozmek gerekmisti. Bu ikisi
# `.mcaddon`: `.geo.json` 1.12.0, dokular PNG, animasyonlar
# 1.8.0. Donusturme yok -- konsey_al.py tasiyor, burasi
# paketliyor.
#
# ---- NEDEN MARVEL'IN MAKINESI ----
# Kaynagin tekniği ile bizimki AYNI: giyilebilir bir esya +
# attachable + oyuncuya gorunmezlik. Marvel kostumlerinde de
# oyle. O yuzden `konsey_esyasi` ile `konsey_attachable`
# `marvel_*` ikizlerinin ayni kalibi; ayri tutulmalarinin tek
# sebebi kimlik uretimi (Marvel'de kahraman__parca, burada duz
# ad).
#
# ---- SAYILAR KAYNAGIN KENDI ESYA JSON'UNDAN ----
# Hicbiri yeniden hesaplanmadi. Asalarin hasari 24-62, Earl
# aletleri 11-21, giyilebilirlerin korumasi 7 ve dayanikliligi
# 200/600.
#
# ---- DUSMUS PARCALARI: 1000 -> 750  (v6.3) ----
# Kaynakta koruma 1000 ve orada bu bir CEZA durumu:
# void_multitool kurbana giydiriyor, kurban zaten kimildayamiyor,
# yani 1000 "kurban donuk kalsin" demek. Bizde esya menuden
# alinabildigi icin onu giyen PRATIKTE DOKUNULMAZ oluyordu.
#
# Kullanici: "koruma 1000 pratikte dokunulmaz oldugu icin bunu
# birazcik asagi dogru cekelim, en iyisi 750 olsun."
#
# Tek degistirilen sayi bu. Digerlerinin hepsi kaynaktakiyle
# birebir ve konsey.mjs onlari jar'la karsilastiriyor -- bu
# satir testte AYRICA muaf tutuluyor ve gerekcesi yaziyor.
KONSEY_ONEK = "kns_"
KONSEY_GEO_KAYNAK = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "kaynak_geo", "konsey")
KONSEY_DOKU_KAYNAK = os.path.join(DOKU_KAYNAK, "konsey")
KONSEY_IKON_KAYNAK = os.path.join(DOKU_KAYNAK, "konsey_ikon")
SES_KAYNAK = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "kaynak_ses")
KONSEY_SES_KAYNAK = os.path.join(SES_KAYNAK, "konsey")


# Skinden OLCULEN vurgu rengi. Gerekcesi ve olcum dokumu
# asagida, sis dosyalarinin yazildigi yerde.
SIS_RENK      = "#20C5B5"   # ana vurgu (skinde %1,6)
SIS_RENK_KOYU = "#145E53"   # koyu ton  (skinde %1,8) -- su altinda


def sis_tanimi(kimlik, bas, bit):
    """Bedrock sis tanimi.

    Bedrock'ta bir sis girdisinde TEK renk var: yakin/uzak
    gecisi yok, yalnizca fog_start ve fog_end. O yuzden
    olculen uc tonu bir gecise yayamiyoruz; ana vurgu
    seciliyor, su altinda koyu ton kullaniliyor (su zaten
    karartiyor, acik turkuaz orada yikaniyor).

    render_distance_type "fixed": blok cinsinden sabit
    mesafe. "render" olsaydi sisin kalinligi oyuncunun
    goruntuleme mesafesi ayarina gore degisirdi -- yani
    tablette bambaska, bilgisayarda bambaska gorunurdu.
    """
    def _k(renk, b, e):
        return {"fog_start": b, "fog_end": e, "fog_color": renk,
                "render_distance_type": "fixed"}
    return {
        "format_version": "1.16.100",
        "minecraft:fog_settings": {
            "description": {"identifier": kimlik},
            "distance": {
                "air":            _k(SIS_RENK, bas, bit),
                "weather":        _k(SIS_RENK, bas, bit * 0.8),
                "water":          _k(SIS_RENK_KOYU, 0.5, bit * 0.25),
                "lava":           _k("#FF3300", 0.0, 3.0),
                "lava_resistance": _k("#FF9900", 0.0, 8.0),
                "powder_snow":    _k(SIS_RENK, 0.0, 2.0),
            },
        },
    }
# Dusmus Blogu: virusun kaynagi. Kimlik ve doku adi tek yerde.
DUSMUS_BLOK = "pa:kns_dusmus_blok"
DUSMUS_BLOK_DOKU = "kns_dusmus_blok"

# (anahtar, TR ad, tur, yuva, koruma, dayaniklilik, hasar)
#   tur: kostum · deri · maske · kolluk · asa · alet · zirh
#        silah · dusmus
KONSEY = [
    ("okazor",            "Okazor",                        "kostum",   "head", 7,  200,  0),
    ("miskel",            "Miskel",                        "kostum",   "head", 7,  200,  0),
    ("kajaros",           "Kajaros",                       "kostum",   "head", 7,  200,  0),
    ("harkos",            "Harkos",                        "kostum",   "head", 7,  200,  0),
    ("raxxan",            "Raxxan",                        "kostum",   "head", 7,  200,  0),
    ("codeman",           "CodeMan",                       "kostum",   "head", 7,  200,  0),
    ("deri_toprak",       "Toprak Derisi",                 "deri",     "head", 7,  200,  0),
    ("deri_dusmus",       "Düşmüş Derisi",                 "deri",     "head", 7,  200,  0),
    ("deri_tas",          "Taş Derisi",                    "deri",     "head", 7,  200,  0),
    ("deri_zehir",        "Zehir Derisi",                  "deri",     "head", 7,  200,  0),
    ("maske_kemik",       "Kemik Maskesi",                 "maske",    "head", 7,  200,  0),
    ("maske_deadmau5",    "Deadmau5",                      "maske",    "chest", 7,  200,  0),
    ("maske_redmau5",     "Redmau5",                       "maske",    "chest", 7,  200,  0),
    ("maske_kanli",       "Kanlı Deadmau5",                "maske",    "chest", 7,  200,  0),
    ("kolluk_toprak_ince",   "Toprak Kol (İnce)",             "kolluk",      "chest", 7,  200,  0),
    ("kolluk_toprak_kalin",  "Toprak Kol (Kalın)",            "kolluk",      "chest", 7,  200,  0),
    ("kolluk_guclu_ince",    "Güçlendirilmiş Kol (İnce)",     "kolluk",      "chest", 7,  200,  0),
    ("kolluk_guclu_kalin",   "Güçlendirilmiş Kol (Kalın)",    "kolluk",      "chest", 7,  200,  0),
    ("kolluk_dusmus_ince",   "Düşmüş Kol (İnce)",             "kolluk",      "chest", 7,  200,  0),
    ("kolluk_dusmus_kalin",  "Düşmüş Kol (Kalın)",            "kolluk",      "chest", 7,  200,  0),
    ("kolluk_bobby",         "Bobby1545'in Kolları",          "kolluk",      "chest", 7,  200,  0),
    ("kolluk_bobby_buz",     "Bobby1545 · Buz+Toprak",        "kolluk",      "chest", 7,  200,  0),
    ("kolluk_bobby_kanli",   "Bobby1545 · Kanlı",             "kolluk",      "chest", 7,  200,  0),
    ("kolluk_bobby_kum",     "Bobby1545 · Sarı Kum",          "kolluk",      "chest", 7,  200,  0),
    ("kolluk_boralo_anna",   "BoraLo · Anna+Toprak",          "kolluk",      "chest", 7,  200,  0),
    ("kolluk_boralo_kanli",  "BoraLo · Kanlı",                "kolluk",      "chest", 7,  200,  0),
    ("kolluk_boralo_kum",    "BoraLo · Güçlendirilmiş Kum",   "kolluk",      "chest", 7,  200,  0),
    ("kolluk_chris_kanli",   "Chris1545 · Kanlı",             "kolluk",      "chest", 7,  200,  0),
    ("asa_kemikcagiran",  "Kemik Çağıran Asa",             "asa",      "", 0,  600, 62),
    ("asa_ayisigi",       "Ay Işığı Asası",                "asa",      "", 0,  600, 42),
    ("asa_vurucu",        "Vurucu Asa",                    "asa",      "", 0,  600, 25),
    ("asa_golge",         "Gölge Asası",                   "asa",      "", 0,  600, 24),
    ("asa_yeralti",       "Yeraltı Asası",                 "asa",      "", 0,  600, 29),
    ("asa_harkos",        "Harkos'un Asası",               "asa",      "", 0,  600, 24),
    ("asa_sihirli_ok",    "Sihirli Ok Asası",              "asa",      "", 0,  600, 62),
    ("earl_kilic",        "Earl Kılıcı",                   "alet",     "", 0,  600, 21),
    ("earl_balta",        "Earl Baltası",                  "alet",     "", 0,  600, 19),
    ("earl_kazma",        "Earl Kazması",                  "alet",     "", 0,  600, 14),
    ("earl_kurek",        "Earl Küreği",                   "alet",     "", 0,  600, 12),
    ("earl_capa",         "Earl Çapası",                   "alet",     "", 0,  600, 11),
    ("olubuyucu_baslik",  "Ölü Büyücü Başlığı",            "zirh",     "head", 7,  200,  0),
    ("olubuyucu_govde",   "Ölü Büyücü Zırhı",              "zirh",     "chest", 7,  200,  0),
    ("olubuyucu_bacak",   "Ölü Büyücü Pantolonu",          "zirh",     "legs", 7,  200,  0),
    ("olubuyucu_bot",     "Ölü Büyücü Botu",               "zirh",     "feet", 7,  200,  0),
    ("guczirhi_baslik",   "Güç Zırhı Başlığı",             "zirh",     "head", 7,  200,  0),
    ("guczirhi_govde",    "Güç Zırhı",                     "zirh",     "chest", 7,  200,  0),
    ("guczirhi_bacak",    "Güç Zırhı Pantolonu",           "zirh",     "legs", 7,  200,  0),
    ("guczirhi_bot",      "Güç Zırhı Botu",                "zirh",     "feet", 7,  200,  0),
    ("silah_biyo",        "Biyo Silah",                    "silah",    "", 0,    0,  0),
    ("silah_bobby",       "Bobby Silahı",                  "silah",    "", 0,    0,  0),
    ("dusmus_1",          "Düşmüş · 1. Aşama",             "dusmus",   "chest", 750, 9999,  0),
    ("dusmus_2",          "Düşmüş · 2. Aşama",             "dusmus",   "chest", 750, 9999,  0),
    ("dusmus_3",          "Düşmüş · 3. Aşama",             "dusmus",   "chest", 750, 9999,  0),
    ("dusmus_4",          "Düşmüş · 4. Aşama",             "dusmus",   "chest", 750, 9999,  0),
    # ---- KURBAN ZIRHI  (v7.0, Falen Mod V2 / Trb1545) ----
    # Butun sayilar kaynagin kendi esya JSON'undan OLCULDU:
    #   minecraft:armor.protection        7   (dort parcada da)
    #   minecraft:durability.max          200
    #   minecraft:knockback_resistance    0.75
    # Dort parca toplam 28 koruma: netherite takimi (3+6+8+3=20)
    # ustunde. Kaynak boyle yazmis, degistirilmedi -- ama
    # dayanikliligi 200, yani netherite'in (407-555) yarisindan
    # az. Kaynagin dengesi bu: sert ama cabuk kiriliyor.
    ("kurban_kask",       "Kurban Kask",                   "zirh",     "head", 7,  200,  0),
    ("kurban_zirh",       "Kurban Zırh",                   "zirh",     "chest", 7,  200,  0),
    ("kurban_pantolon",   "Kurban Pantolon",               "zirh",     "legs", 7,  200,  0),
    ("kurban_bot",        "Kurbanlar Botu",                "zirh",     "feet", 7,  200,  0),
    # ---- VOID TAKIMI VE KILICLER  (v7.1, Falen Mod V2) ----
    # Butun sayilar kaynagin esya JSON'undan OLCULDU. Bunlarin
    # 3B modeli YOK, yalnizca ikonu var (KONSEY_DUZ).
    #
    # VOID KILICI'NIN 255 HASARI KAYNAKTAKI GIBI BIRAKILDI.
    # Karsilastirma: netherite kilic 8, bu depodaki en guclu
    # esya 62 (Sihirli Ok Asasi). 255 Bedrock'un tavani.
    # Dusmus'un 1000 korumasini dusurmustuk cunku o KALICI bir
    # DURUMDU (giyen dokunulmaz oluyordu); bu ise elde tutulan
    # bir kilic -- kullanan kisi onu bilerek seciyor. Yine de
    # tek satir: begenmezsen tablodan degistirilir.
    ("void_kilic",        "Void Kılıcı",                   "silah",    "", 0, 600, 255),
    ("void_balta",        "Void Baltası",                  "alet",     "", 0, 600,   5),
    ("void_kazma",        "Void Kazması",                  "alet",     "", 0, 600,   5),
    ("void_kurek",        "Void Küreği",                   "alet",     "", 0, 600,   4),
    ("void_alet",         "Void Çoklu Alet",               "alet",     "", 0, 600,   5),
    # Ender Kilici kaynakta 1 hasar veriyor: isi vurusu degil,
    # vurdugunu FIRLATMASI (asagida, ender_kilic yetenegi).
    ("ender_kilic",       "Ender Kılıcı",                  "silah",    "", 0, 600,   1),
    ("evren_kilic",       "Evren Kılıcı",                  "silah",    "", 0, 600,  15),
    ("trb_kilic",         "Trb1545 Kılıcı",                "silah",    "", 0, 600,  12),
    # Kafaya takilan iki parca. Sayilari Kurban zirhiyla ayni.
    ("void_migfer",       "Void Miğferi",                  "zirh",     "head", 7, 200, 0),
    ("enigma",            "Enigma",                        "zirh",     "head", 7, 200, 0),
]

# 3B modeli olmayan, yalnizca ikonu olan parcalar. Kaynakta da
# oyle: bir kilic zaten duz bir esya olarak gorunur. Bu kume
# olmadan uretec her uretimde "geometri yok" diye uyarir ve
# konsey.mjs "model eksik" der -- oysa eksik bir sey yok.
# konsey_al.py:DUZ ile AYNI kalmali.
KONSEY_DUZ = {"void_kilic", "void_balta", "void_kazma", "void_kurek",
              "void_alet", "ender_kilic", "evren_kilic", "trb_kilic"}


# Kaynagin `minecraft:knockback_resistance` degerleri. Tabloya
# sekizinci alan eklemek 58 satirin hepsini degistirmek
# demekti; yalniz Kurban zirhinda var, ayri bir sozlukte
# duruyor. Deger 0.0-1.0: 0.75 = itmenin dortte ucu kesiliyor.
KONSEY_ITME = {
    "kurban_kask": 0.75, "kurban_zirh": 0.75,
    "kurban_pantolon": 0.75, "kurban_bot": 0.75,
    # Void Migferi ve Enigma da kaynakta 0.75 tasiyor.
    "void_migfer": 0.75, "enigma": 0.75,
}


def konsey_esyasi(t):
    """Giyilebilir ya da elde tutulan parca. Butun sayilar
    kaynagin kendi esya JSON'undan.

    ---- DUSMUS ASAMALARI MENUDE YOK  (v6.4) ----
    Kullanici: "sen fallen'i bir zirh olarak eklemissin, zirh
    olmayacak, bir blok olacak."

    Haklıydi. Dort asama GIYILECEK bir takim degil, bir DURUM:
    bloga basinca ustune geliyor. Menude durursa "1000 koruma"
    bedava bir zirh olur. Menu kategorisi kaldirildi -- esya
    duruyor (durum makinesi onu yuvaya koyuyor) ama yaratici
    envanterinde gorunmuyor. Menude gorunen tek sey BLOK.  """
    anahtar, ad, tur, yuva, koruma, dayaniklilik, hasar = t
    kimlik = KONSEY_ONEK + anahtar
    bilesenler = {
        "minecraft:icon": {"texture": kimlik},
        "minecraft:display_name": {"value": ad},
        "minecraft:max_stack_size": 1,
        "minecraft:tags": {"tags": ["pa:konsey", "pa:konsey_" + tur]},
    }
    if yuva:
        bilesenler["minecraft:wearable"] = {
            "slot": "slot.armor." + yuva, "protection": koruma}
        bilesenler["minecraft:armor"] = {"protection": koruma}
    else:
        # Elde tutulanlar: asalar, aletler, silahlar.
        bilesenler["minecraft:hand_equipped"] = True
        bilesenler["minecraft:glint"] = True
    if hasar:
        bilesenler["minecraft:damage"] = hasar
    if dayaniklilik:
        bilesenler["minecraft:durability"] = {"max_durability": dayaniklilik}
    if anahtar in KONSEY_ITME:
        bilesenler["minecraft:knockback_resistance"] = {
            "value": KONSEY_ITME[anahtar]}
    tanim = {"identifier": "pa:" + kimlik}
    if tur != "dusmus":
        tanim["menu_category"] = {"category": "equipment"}
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": tanim,
            "components": bilesenler,
        },
    }


def dusmus_blogu():
    """Dusmus Blogu -- virusun kaynagi.

    Kullanici: "fallen bir blok, ustune ciktigimiz zaman dort
    asamadan olusuyor; dorde geldikten sonra bedenden cikmayan
    bir zirha donusuyor. Tek zaafi ates."

    Bilesenler kaynagin kendi blogundan (BoraLo:
    blocks/dragon_fallen_block.json) -- kirilma suresi 3 sn,
    patlama direnci 3, surtunme 0.4, isik 4, yanabilir.
    Degistirilen tek sey ad alani ve doku adi.

    `tag:wood` KORUNDU: kaynakta var ve baltayla kirilmasini
    sagliyor -- ayrica YANABILIR olmasinin gerekcesi de o.
    Virusun ates zaafiyla tutarli.                           """
    return {
        "format_version": "1.21.0",
        "minecraft:block": {
            "description": {
                "identifier": DUSMUS_BLOK,
                "menu_category": {"category": "construction"},
            },
            "components": {
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 3.0},
                "minecraft:destructible_by_explosion": {
                    "explosion_resistance": 3.0},
                "minecraft:friction": 0.4,
                "minecraft:flammable": {"catch_chance_modifier": 5,
                                        "destroy_chance_modifier": 20},
                "minecraft:map_color": "#5B2C82",
                "minecraft:light_dampening": 0,
                "minecraft:light_emission": 4,
                "minecraft:collision_box": {"origin": [-8.0, 0.0, -8.0],
                                            "size": [16.0, 16.0, 16.0]},
                "minecraft:selection_box": {"origin": [-8.0, 0.0, -8.0],
                                            "size": [16.0, 16.0, 16.0]},
                "tag:wood": {},
                "minecraft:material_instances": {
                    "*": {"texture": DUSMUS_BLOK_DOKU,
                          "render_method": "opaque"}
                },
            },
        },
    }


def konsey_attachable(t):
    """Parcanin oyuncuya cizilmesi. Geometri kimligi cikarma
    sirasinda `geometry.kns_*` olarak yeniden adlandirildi --
    kaynagin `klezy_*` adlari bizim ad alanimiz degil.        """
    anahtar, ad, tur, yuva, koruma, dayaniklilik, hasar = t
    kimlik = KONSEY_ONEK + anahtar
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": "pa:" + kimlik,
                "materials": {
                    "default": "armor",
                    "enchanted": "armor_enchanted",
                },
                "textures": {
                    "default": "textures/entity/" + kimlik,
                    "enchanted": "textures/misc/enchanted_actor_glint",
                },
                "geometry": {"default": "geometry." + kimlik},
                "render_controllers": ["controller.render.armor"],
            }
        },
    }


# ================================================================
#  BEN 10  (AlienEvo)                                    v4.92
# ================================================================
# Kullanici: "ben 10 modu bu iste. Elmas kafayi, dort kolu, yuzen
# ceneyi ve Ates topunu ekle SADECE."
#
# ---- KAYNAK ----
# AlienEvo 1.1.3 (Habb & Stephen), Fabric + Palladium.
# md5 18b2b7b17aa9b5d4efa794d3fbbfd7e4
#
# ---- BUYUK SANS: MODELLER ZATEN BEDROCK BICIMINDE ----
# Mod GeckoLib kullaniyor ve GeckoLib Bedrock'un `.geo.json`
# bicimini kullaniyor. Yani ne bytecode cozmek gerekti (BoraLo)
# ne de elle cizmek. Dosyalar oldugu gibi okunuyor.
#
# ---- TEK DEGISIKLIK: KEMIK ADLARI ----
# Modun butun modelleri ALTI KOK kemikten sarkiyor:
#   armorHead · armorBody · armorLeftArm · armorRightArm
#   armorLeftLeg · armorRightLeg
# Bu Palladium'un oyuncu parcalarina baglama kurali. Bedrock'un
# kurali ise oyuncunun KENDI kemik adlari. Altisini yeniden
# adlandirinca butun agac (66 kemige kadar) vanilla oyuncu
# animasyonlariyla suruluyor -- yuruyus, kol sallama, egilme
# BEDAVA geliyor. Zirh Yukseltmesi'ndeki numaranin aynisi.
#
# ---- DOKULAR ----
# Mod dokuyu katmanlara bolmus (skin / uniform / glow). Bedrock'ta
# bir geometri TEK doku kullanabildigi icin katmanlar
# birlestiriliyor -- bu isi ben10_al.py yapiyor, burada hazir
# PNG okunuyor.
#
# v4.92'DE YANLIS OLCULMUSTU. O zaman "uniform ve glow neredeyse
# bos -- 0/16384" yazmistim ve sadece `skin` katmanini almistim.
# Olcum SADECE `default` bicimi icin dogruymus; Prototip ve 10K
# bicimlerinde uniform katmani DOLU:
#     tetramand_uniform_10k       2267/4096  (%55)
#     tetramand_skin_10k           960/4096  (%23)
#     piscciss_volann_uniform_10k 1275/4096  (%31)
#     petrosapien_uniform_10k     1625/16384 (%10)
# Yani Dort Kol'un 10K bicimi dokusunun yarisindan cogunu
# kaybediyordu. v6.0'da uc bicimin de dokusu yeniden uretildi.
#
# Ates Topu DOKUNULMADI: onun katmanlari sekiz kareli bir alev
# animasyonu (heatblast_#I_glow) ve v4.92'de elle birlestirilmisti;
# yeniden uretmek gorunumunu degistirirdi.
BEN10_GEO = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "kaynak_geo")
# Palladium kok kemigi -> Bedrock oyuncu kemigi
BEN10_KEMIK = {
    "armorHead":     "head",
    "armorBody":     "body",
    "armorLeftArm":  "leftArm",
    "armorRightArm": "rightArm",
    "armorLeftLeg":  "leftLeg",
    "armorRightLeg": "rightLeg",
}
# Blockbench'in bos kok kemigi: cocugu yok, atiliyor.
# Atilan SARMALAYICI kemikler: kupleri yok, sadece agaci
# sariyorlar. Cocuklari koke tasiniyor.
#   bb_main  Blockbench'in varsayilan koku
#   group    Ionstrike'in Isi ve HidroIsi modellerindeki sarmalayici
#   armorLeftBoot / armorRightBoot  (v6.0)
#            Palladium'un COT yuvasi. Kroma Tasi, Yanki Yanki ve
#            Devasaur'da var ama UCUNDE DE BOS -- kupu da yok,
#            cocugu da yok (olculdu). Bedrock'ta oyuncunun ayri
#            bir cizme kemigi olmadigi icin atiliyor; dolu
#            olsalardi bacaga baglanmalari gerekirdi.
BEN10_ATILAN = {"bb_main", "group", "armorLeftBoot", "armorRightBoot"}

# ---- UC BICIM (v4.93) ----
# Kullanici: "bunlarin da bir formlari daha varmis, bir baksana
# icerisinde var mi, onlari da ekle."
#
# Vardi -- HER uzaylinin UC bicimi var ve bunlar Ben 10'un kendi
# zaman cizgisi:
#   prototype  ilk Omnitrix        (2005 dizisi)
#   default    yeniden ayarlanmis  (Alien Force -- modun "recal"i)
#   10k        Ben 10.000          (gelecekteki hali)
#
# Bicimler GERCEKTEN farkli: kup sayilari ve doku boyutlari
# ayri (or. Dort Kol default 41 kup/128px, prototype 33 kup/64px).
BEN10_BICIM = [
    ("",       "Recal",    "Recal"),      # default
    ("_proto", "Prototip", "Prototype"),
    ("_10k",   "10K",      "10K"),
]

# ---- UZAYLI BOYUTLARI  (v4.97) ----
#
# Kullanici: "uzayli boyutlari daha buyuk olmasi gerekiyordu,
# normal Steve boyutunda."
#
# HAKLIYDI ve sebebi bulundu. Modun her uzayli gucunde bir
# palladium:size yetenegi var ve oyuncuyu O CARPANLA
# buyutuyor:
#     data/alienevo_aliens/palladium/powers/petrosapien.json
#       "size_change": {"type": "palladium:size", "scale": 1.35}
#
# Biz modun `.geo.json`'unu HAM haliyle aliyorduk; o dosyalar
# 1x oyuncu icin cizilmis ve carpan CIZIM SIRASINDA
# uygulaniyor. Yani dosyayi dogru aktarmisiz ama carpani
# kacirmisiz -- Dort Kol tam 2 KAT kucuk cikiyordu.
#
# Bedrock'ta oyuncu modelini calistirma aninda olceklemek yok
# (query.model_scale oyunculara islemiyor), o yuzden carpan
# GEOMETRIYE ISLENIYOR: her kup origin/size, her pivot ve her
# sisirme carpanla carpiliyor. Sonuc birebir ayni sekil,
# dogru boyda.
#
# Sayilar modun kendi JSON'undan, tahmin degil:
#     Petrosapien      1.35
#     Tetramand        2
#     Piscciss Volann  1.17
#     Pyronite         1.1
#
# DIKKAT -- CARPISMA KUTUSU BUYUMUYOR. Bedrock'ta oyuncunun
# kutusu sabit (0.6 x 1.8). Yani Dort Kol iki kat gorunuyor
# ama hala normal bir kapidan geciyor ve ates topunun
# omzundan gecen ok ona degmiyor. Bu MOTOR SINIRI, eksik is
# degil; NOTLAR'da yaziyor.
#
# ---- ALINMAYAN UZAYLILAR (v6.0) ----
#
# Kullanici: "ben 10'den almadigimiz uzaylilari ve formlari
# eklemeyi dusunuyorum... uzaylilarin guclerini birebir yapmaya
# calisacagiz."
#
# Modda 23 guc dosyasi var. Bunlardan:
#   4  zaten alinmisti (asagidaki ilk dort satir)
#   16 alindi (bu surum)
#   1  ALINAMADI: kryptonian -- MODELI YOK. Gucleri tanimli ama
#      hicbir render_layer'i yok, jar'da tek bir kryptonian
#      modeli ya da dokusu bulunmuyor. Uydurma bir model
#      cizilmedi.
#   2  yardimci dosya (pyronite_absorb, galvanic_rod) -- ilki
#      bos, ikincisi Yukseltme'nin ayri bir bicimi.
#
# "nucleonix" guc dosyasinin modeli `alien_60/atomix` --
# dosya adi ile guc adi tutmuyor, render_layer'dan okundu.
#
# BICIMLER HER UZAYLIDA UC TANE DEGIL. Modun ilk on bir
# uzaylisinda uc bicim (default/prototype/10k) var; alien_34,
# 60, 100, 101 ve afomni'nin bes uzaylisinda TEK model var.
# Olmayan bicim UYDURULMADI.
#
# (kisa ad, TR ad, EN ad, tur, olcek, bicim sayisi, ek dosya sayisi)
BEN10_TABAN = [
    # -- v4.92'de alinanlar --
    ("elmas",     "Elmas Kafa",   "Diamondhead",  "Petrosapien",         1.35, 3, 0),
    ("dortkol",   "Dört Kol",     "Four Arms",    "Tetramand",           2.0,  3, 0),
    ("cene",      "Yüzen Çene",   "Ripjaws",      "Piscciss Volann",     1.17, 3, 0),
    ("ates",      "Ateş Topu",    "Heatblast",    "Pyronite",            1.1,  3, 0),
    # -- v6.0'da alinanlar: uc bicimli --
    ("vahsi",     "Vahşi Sırtlan", "Wildmutt",    "Vulpimancer",         1.0,  3, 0),
    ("xlr",       "Şimşek Hız",   "XLR8",         "Kineceleran",         1.1,  3, 0),
    ("gri",       "Gri Madde",    "Grey Matter",  "Galvan",              0.25, 3, 0),
    # Sinek Suratli'nin arka bacaklari ve kanatlari ayri
    # dosyalarda (ben10_al.py atlasa aldi) -- iki ek dosya.
    ("sinek",     "Sinek Suratlı", "Stinkfly",    "Lepidopterran",       1.0,  3, 2),
    ("yukseltme", "Yükseltme",    "Upgrade",      "Galvanic Mechamorph", 1.4,  3, 0),
    ("hayalet",   "Hayalet",      "Ghostfreak",   "Ectonurite",          1.3,  3, 0),
    ("gulle",     "Gülle",        "Cannonbolt",   "Arburian Pelarota",   1.33, 3, 0),
    # -- v6.0'da alinanlar: tek bicimli --
    ("jet",       "Jet Işını",    "Jetray",       "Aerophibian",         1.0,  1, 0),
    ("atomik",    "Atomik",       "Atomix",       "Nucleonix",           3.3,  1, 0),
    ("ejder",     "Ejderha",      "Dragonoid",    "Dragonoid",           8.7,  1, 0),
    ("astro",     "Astro Bot",    "Astrobot",     "Astrobot",            0.55, 1, 0),
    ("bataklik",  "Bataklık Ateşi", "Swampfire",  "Methanosian",         1.7,  1, 0),
    ("buz",       "Büyük Üşütük", "Big Chill",    "Necrofriggian",       1.0,  1, 0),
    ("yanki",     "Yankı Yankı",  "Echo Echo",    "Sonorosian",          0.5,  1, 0),
    ("devasa",    "Devasaur",     "Humungousaur", "Vaxasaurian",         2.8,  1, 0),
    # -- v6.1'de alinanlar: EK FORMLAR --
    # Kaynakta bunlar bir TUSLA gecilen haller ve gecince hem
    # gorunus hem nitelik degisiyor. Bizde tus yok, her form
    # ayri esya -- butun Ben 10 sistemi zaten boyle.
    ("gri_zirh",  "Gri Madde · Zırh",  "Grey Matter (Armor)", "Galvan",       0.25, 3, 1),
    ("gri_uzuv",  "Gri Madde · Uzuv",  "Grey Matter (Limbs)", "Galvan",       1.25, 3, 1),
    ("gri_takim", "Gri Madde · Takım", "Grey Matter (Suit)",  "Galvan",       1.65, 3, 0),
    ("gulle_top", "Gülle · Top",       "Cannonbolt (Ball)",   "Arburian Pelarota", 1.3699, 3, 0),
    ("yukseltme_cubuk", "Yükseltme · Çubuk", "Upgrade (Rod)", "Galvanic Rod", 0.8,  3, 0),
]

# ---- OLCEK HANGI YETENEKTEN GELIYOR (v6.1) ----
# Modun `palladium:size` yetenekleri her zaman kosulsuz degil:
# Gri Madde'nin uzuvlu (x5) ve takimli (x6.6) halleri ile
# Gulle'nin top hali (x1.03) BIR TUSA BASILIYKEN geciyor ve
# kosullari `unlocking` altinda duruyor (Palladium'un kendi
# tuhafligi -- olculdu).
#
# Kosul agacini genel olarak cozmek yerine hangi satirin hangi
# yetenekten geldigi BURADA yaziyor; ben10.mjs bu adi jar'da
# arayip olcegi karsilastiriyor. Yazmayan satir kosulsuz
# `size_change`i (ya da hic yoksa 1.0) kullaniyor.
# ---- IKI OLCEK CARPILIYOR, BIRI OTEKINI EZMIYOR ----
# Ilk denemede uzuvlu Gri Madde 149, takimli 186 birim cikti
# (9 ve 11.6 BLOK). Sebep: kosullu olcegi tek basina almistim.
#
# Kaynakta iki `palladium:size` AYNI ANDA acik ve pehkui
# bunlari CARPIYOR. Kanit modun kendi icinde: Devasaur'un
# `size_change` 2.8 ve `size_change_grow` 2.3. Grow BUYUME
# demek; ezseydi 2.3 < 2.8 oldugu icin oyuncuyu KUCULTURDU.
# Carpim 6.44 veriyor -- dizideki Ultimate Humungousaur.
#
# Dogru sayilar:
#   Gri Madde uzuvlu  0.25 x 5    = 1.25
#   Gri Madde takimli 0.25 x 6.6  = 1.65
#   Gulle top hali    1.33 x 1.03 = 1.3699
# (carpan, taban)  -- ben10.mjs ikisini de jar'da ariyor
BEN10_BOY_YETENEK = {
    "gri_uzuv":  ("size_change_limbs", "size_change"),
    "gri_takim": ("size_change_suit",  "size_change"),
    "gulle_top": ("size_change_ball",  "size_change"),
}

# tur adi -> modun kendi power dosyasi (test karsilastiriyor)
BEN10_GUC_DOSYA = {
    "Petrosapien":         "petrosapien",
    "Tetramand":           "tetramand",
    "Piscciss Volann":     "piscciss_volann",
    "Pyronite":            "pyronite",
    "Vulpimancer":         "vulpimancer",
    "Kineceleran":         "kineceleran",
    "Galvan":              "galvan",
    "Lepidopterran":       "lepidopterran",
    "Galvanic Mechamorph": "galvanic_mechamorph",
    "Ectonurite":          "ectonurite",
    "Arburian Pelarota":   "arburian_pelarota",
    "Aerophibian":         "aerophibian",
    "Nucleonix":           "nucleonix",
    "Dragonoid":           "dragonoid",
    "Astrobot":            "astrobot",
    "Methanosian":         "methanosian",
    "Necrofriggian":       "necrofriggian",
    "Sonorosian":          "sonorosian",
    "Vaxasaurian":         "vaxasaurian",
    # Yukseltme'nin cubugu modda AYRI bir guc dosyasi.
    "Galvanic Rod":        "galvanic_rod",
}

# (anahtar, TR ad, EN ad, geo dosyalari, tur adi)
BEN10 = []
# anahtar -> olcek (v4.97). Ayri bir sozluk cunku BEN10 demeti
# bes elemanli ve onu genisletmek ALTI yerde dongu imzasi
# degistirmek demekti.
BEN10_OLCEK = {}
for _kisa, _tr, _en, _tur, _olcek, _bsayi, _eksayi in BEN10_TABAN:
    for _son, _btr, _ben in BEN10_BICIM[:_bsayi]:
        _a = "ben_" + _kisa + _son
        _dosyalar = [_a]
        # Dort Kol'un FAZLADAN IKI KOLU her bicimde ayri dosyada
        if _kisa == "dortkol":
            _dosyalar.append(_a + "_kollar")
        # Sinek Suratli'nin arka bacaklari ve kanatlari
        _dosyalar += ["%s_ek%d" % (_a, _i) for _i in range(_eksayi)]
        # Tek bicimli uzaylida bicim adi ASILMIYOR: "Jet Isini ·
        # Recal" diye bir sey yok, modda tek model var.
        _tam = "%s · %s" % (_tr, _btr) if _bsayi > 1 else _tr
        _tamen = "%s (%s)" % (_en, _ben) if _bsayi > 1 else _en
        BEN10.append((_a, _tam, _tamen, _dosyalar, _tur))
        BEN10_OLCEK[_a] = _olcek

# ---- OMNITRIX (v4.93) ----
# Kullanici: "hani ben 10 saati var ya onun da modeli varsa onu
# da ekle ki SAAT OLMALI sadece."
#
# Modun saat modelleri de ayni alti kok kemikten sarkiyor ve
# kupleri x[3.5, 9.8] y[13.5, 17.0] araliginda -- yani ZATEN
# SOL BILEK konumunda. Elinde tutunca bilegine ciziliyor,
# ayrica bir yuva harcamiyor.
#
# 10K saati YOK: modun kendisi onun dokusunu Palladium'un
# dinamik doku sistemiyle uretiyor, hazir bir PNG yok. Iki saat
# aliniyor -- uydurma bir ucuncu cizilmedi.
OMNITRIX = [
    ("omnitrix_proto", "Omnitrix · Prototip", "Omnitrix (Prototype)"),
    ("omnitrix_recal", "Omnitrix · Recal",    "Omnitrix (Recalibrated)"),
]

# ---- ANIMASYONLAR (v4.93) ----
# Kullanici: "animasyon falan varsa her seyi ekle."
#
# Modun animasyonlari da Bedrock bicimi (format_version 1.8.0) --
# GeckoLib oyle kullaniyor. Kemik adlarina bakildi: HICBIRI
# armorX kemiklerini surmuyor, hepsi ic kemikleri suruyor. Yani
# bizim yeniden adlandirmamizdan ETKILENMIYORLAR, oldugu gibi
# kopyalaniyorlar.
BEN10_ANIM = ["petrosapien", "ripjaws", "prototype", "recal_omnitrix"]
BEN10_ANIM_KAYNAK = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "kaynak_anim")

# Oyuncuya BAGLANAN animasyonlar: (animasyon adi, kosul molang)
# Sadece KOSULU GUVENLE KURULABILENLER baglandi. Kalanlar
# (kalkan, kilic, isirma...) paketin icinde duruyor ama bir
# tetige bagli degil -- uydurma bir kosul yazmaktansa boyle.
BEN10_ANIM_BAGLI = [
    # Yuzen Cene yuzerken: modun kendi yuzme animasyonu, loop.
    ("ripjaws_yavas", "animation.ripjaws.swim_slow",
     "variable.ben_cene_ailesi && query.is_in_water && !query.is_sprinting"),
    ("ripjaws_hizli", "animation.ripjaws.swim_fast",
     "variable.ben_cene_ailesi && query.is_in_water && query.is_sprinting"),
]


def ben10_geometrisi(anahtar, dosyalar):
    """Modun `.geo.json`'unu oyuncu kemik adlarina cevirir.

    Birden fazla dosya verilebiliyor: Dort Kol'un FAZLADAN IKI
    KOLU ayri bir dosyada duruyor (tetramand_arms). O dosyada
    kok kemikler BOS, sadece kol zincirleri var -- yani ikisini
    birlestirmek cakisma yaratmiyor (kemik adlari da farkli:
    forearm5/hand5 ile forearm/hand).

    Kupler, uv'ler, donuslar, sisirmeler HIC ELLENMIYOR. Tek
    dokunulan sey kemik ADLARI ve kimlik.                        """
    kemikler = []
    gorulen = set()
    doku_en = doku_boy = 64
    for i, dosya in enumerate(dosyalar):
        yol = os.path.join(BEN10_GEO, dosya + ".geo.json")
        if not os.path.exists(yol):
            print("UYARI: %s geometrisi yok (%s)" % (anahtar, yol))
            continue
        with open(yol, encoding="utf-8") as f:
            g = json.load(f)["minecraft:geometry"][0]
        if i == 0:
            d = g["description"]
            doku_en = d.get("texture_width", 64)
            doku_boy = d.get("texture_height", 64)
        # ---- ONCE CAKISMALARI COZ ----
        # Ates Topu ve Yuzen Cene'de zaten `head` adinda BIR
        # KEMIK VAR. armorHead'i dogrudan `head` yapmak ikisini
        # carpistiriyordu ve dolu olan kemik SESSIZCE
        # dusuruluyordu -- yani yaratigin kafasi kayboluyordu.
        # Cakisan kemik once yeniden adlandiriliyor.
        hedefler = set(BEN10_KEMIK.values())
        cakisan = {b["name"]: b["name"] + "_ic"
                   for b in g["bones"] if b["name"] in hedefler}
        if cakisan:
            print("   %s: cakisan kemik yeniden adlandirildi -> %s"
                  % (anahtar, ", ".join("%s=%s" % kv for kv in cakisan.items())))

        yeniden = {}          # bu dosyada yeniden adlandirilanlar
        for b in g["bones"]:
            ad = b["name"]
            if ad in BEN10_ATILAN:
                continue
            b = dict(b)
            b["name"] = BEN10_KEMIK.get(cakisan.get(ad, ad), cakisan.get(ad, ad))
            if b.get("parent") in cakisan:
                b["parent"] = cakisan[b["parent"]]
            if b.get("parent") in BEN10_ATILAN:
                b.pop("parent", None)
            elif b.get("parent") in BEN10_KEMIK:
                b["parent"] = BEN10_KEMIK[b["parent"]]
            # ---- YINELENEN KEMIK ----
            # Ikinci dosyanin BOS kok kemikleri: birincide zaten
            # var, atlaniyor.
            #
            # AMA DOLU olan bir kemik atlanamaz. Dort Kol 10K'da
            # tam bu oldu: fazladan kollarin zinciri taban
            # dosyayla AYNI adlari kullaniyor (forearm2, hand2,
            # thumb2) ve ikisi de dolu. Atlansaydi 10K bicimi
            # IKI KOLUNU KAYBEDERDI -- ustelik sessizce.
            # Cozum: yeniden adlandir, cocuklarini da bagla.
            if b["name"] in gorulen:
                if not b.get("cubes"):
                    continue
                yeni_ad = "%s_ek%d" % (b["name"], i)
                yeniden[b["name"]] = yeni_ad
                b["name"] = yeni_ad
            if b.get("parent") in yeniden:
                b["parent"] = yeniden[b["parent"]]
            gorulen.add(b["name"])
            kemikler.append(b)

    # ---- OLCEK (v4.97) ----
    # Modun palladium:size yetenegi oyuncuyu carpanla
    # buyutuyor; `.geo.json` dosyalari 1x cizilmis. Bedrock'ta
    # oyuncu modelini calistirma aninda olceklemek yok, o
    # yuzden carpan GEOMETRIYE isleniyor.
    #
    # Neler carpiliyor: kup origin ve size, kemik pivot,
    # sisirme (inflate). DONUSLER CARPILMIYOR -- aci olcekten
    # bagimsiz; carpsaydik model burulurdu.
    #
    # UV'lere de DOKUNULMUYOR: doku ayni, sadece kaplandigi
    # yuzey buyuyor.
    olcek = BEN10_OLCEK.get(anahtar, 1.0)
    if olcek != 1.0:
        def _c(v):
            return [round(x * olcek, 4) for x in v]
        for b in kemikler:
            if "pivot" in b:
                b["pivot"] = _c(b["pivot"])
            yeni_kupler = []
            for k in b.get("cubes", []):
                k = dict(k)
                if "origin" in k:
                    k["origin"] = _c(k["origin"])
                if "size" in k:
                    k["size"] = _c(k["size"])
                if "pivot" in k:
                    k["pivot"] = _c(k["pivot"])
                if k.get("inflate"):
                    k["inflate"] = round(k["inflate"] * olcek, 4)
                yeni_kupler.append(k)
            if yeni_kupler:
                b["cubes"] = yeni_kupler

    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                # Modun kendi kimlikleri BOZUK (tetramand'in
                # kimligi "geometry.Diamondhead", piscciss'inki
                # "geometry.unknown"). Kendi kimligimizi
                # yaziyoruz -- yoksa dordu birbirini ezerdi.
                "identifier": "geometry." + anahtar,
                "texture_width": doku_en,
                "texture_height": doku_boy,
                "visible_bounds_width": 4,
                "visible_bounds_height": 5,
                "visible_bounds_offset": [0, 2, 0],
            },
            "bones": kemikler,
        }],
    }


def ben10_ikonu(anahtar, geo):
    """Ikon: yaratigin KENDI kafasinin on yuzu.

    Uydurma cizim yok. Kafa kemigindeki ilk kupun uv'si
    okunuyor ve o kare 16x16'ya buyutuluyor.                    """
    try:
        from PIL import Image
    except ImportError:
        return None
    kaynak = os.path.join(DOKU_KAYNAK, anahtar + ".png")
    if not os.path.exists(kaynak):
        return None
    im = Image.open(kaynak).convert("RGBA")

    # Kafanin ALT AGACINDA kup ara: modellerin cogunda `head`
    # kemigi BOS, kupler cocuklarinda (mask, jaw, top...).
    kemikler = geo["minecraft:geometry"][0]["bones"]
    cocuk = {}
    for b in kemikler:
        cocuk.setdefault(b.get("parent"), []).append(b)

    def alt_agac(kok):
        sira, agac = [kok], []
        while sira:
            ad = sira.pop(0)
            for b in cocuk.get(ad, []):
                agac.append(b)
                sira.append(b["name"])
        return [b for b in kemikler if b["name"] == kok] + agac

    # v6.0: Gulle'nin (Cannonbolt) `head` kemigi TAMAMEN BOS --
    # kafasi govdenin icinde cizilmis, ayri bir kemigi yok.
    # Bos ciktisinda govdeye, o da bossa butun modele bakiliyor;
    # yoksa ikon uretilemiyordu ve esya mor-siyah kalirdi.
    agac = alt_agac("head")
    if not any(b.get("cubes") for b in agac):
        agac = alt_agac("body")
    if not any(b.get("cubes") for b in agac):
        agac = kemikler

    kutu = None
    for b in agac:
        for kup in (b.get("cubes") or []):
            uv = kup.get("uv")
            boyut = kup.get("size")
            if not boyut:
                continue
            w, h, d = [int(round(x)) for x in boyut]
            if w <= 0 or h <= 0:
                continue
            if isinstance(uv, list):
                aday = (uv[0] + d, uv[1] + d, uv[0] + d + w, uv[1] + d + h)
            elif isinstance(uv, dict) and isinstance(uv.get("north"), dict):
                # Per-face uv (Dort Kol boyle): on yuz dogrudan
                # yazili, hesaplamaya gerek yok.
                n = uv["north"]
                ux, uy = n["uv"]
                sw, sh = n.get("uv_size", [w, h])
                aday = (int(ux), int(uy),
                        int(ux + abs(sw)), int(uy + abs(sh)))
                w, h = aday[2] - aday[0], aday[3] - aday[1]
            else:
                continue
            if (aday[2] <= im.width and aday[3] <= im.height and
                    aday[2] > aday[0] and aday[3] > aday[1]):
                kutu = aday
                break
        if kutu:
            break
    if kutu is None:
        return None
    w, h = kutu[2] - kutu[0], kutu[3] - kutu[1]
    yuz = im.crop(kutu)
    k = max(1, min(16 // max(1, w), 16 // max(1, h)))
    yuz = yuz.resize((w * k, h * k), Image.NEAREST)
    ikon = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    ikon.paste(yuz, ((16 - yuz.width) // 2, (16 - yuz.height) // 2), yuz)
    return ikon


def ben10_esyasi(anahtar, ad):
    """Omnitrix anahtari: bu esyayi eline al, o yaratik ol.

    Silah degil -- hasari yok. Yan ele de konabiliyor ki ana
    elin bos kalsin (maskedeki karar).                           """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + anahtar,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": anahtar},
                "minecraft:display_name": {"value": ad},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                "minecraft:allow_off_hand": True,
            },
        },
    }


def omnitrix_attachable(anahtar):
    """Saat ELDE tutulunca BILEGE ciziliyor.

    Modelin kupleri zaten x[3.5, 9.8] y[13.5, 17.0] araliginda,
    yani sol bilek konumunda. Kemik adlari cevrildigi icin
    (armorLeftArm -> leftArm) oyuncunun kol kemigine yapisiyor
    ve kol sallandikca saat de sallaniyor.

    Boylece bir ZIRH YUVASI harcanmiyor -- Zirh Yukseltmesi ile
    cakismiyor.                                                  """
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": "pa:" + anahtar,
                "materials": {"default": "entity_alphatest",
                              "enchanted": "armor_enchanted"},
                "textures": {
                    "default": "textures/entity/" + anahtar,
                    "enchanted": "textures/misc/enchanted_actor_glint",
                },
                "geometry": {"default": "geometry." + anahtar},
                # Goz ve zirh sistemimizle ayni yol.
                "render_controllers": ["controller.render.armor"],
            }
        },
    }


def oyuncu_modeli_paketi(surum):
    """OYUNCUNUN KENDI MODELINI O SEY YAPAN paket.

    Taban dosya (oyuncu_modeli_taban/player.entity.json) vanilla
    oyuncu tanimidir; referans paketten alinip onlarin kendi
    ekleri TEMIZLENEREK saklandi. Elle yazilmadi -- icinde
    ~70 satir vanilla molang ve ~70 animasyon adi var, biri
    kaysa oyuncu cizimi bozulurdu.

    Buraya eklenen SADECE dort sey:
      1. geometry.o_sey  + dokusu
      2. variable.o_sey  (elde ya da yan elde maske var mi)
      3. controller.render.o_sey
      4. vanilla ucuncu sahis denetleyicisine "&& !variable.o_sey"

    Dorduncusu kritik: onsuz oyuncunun kendi bedeni O Sey'in
    icinde kalirdi.                                              """
    import copy, shutil
    taban = os.path.join(OMP_TABAN, "player.entity.json")
    if not os.path.exists(taban):
        print("UYARI: oyuncu modeli tabani yok (%s), paket uretilmedi" % taban)
        return False

    with open(taban, encoding="utf-8") as f:
        v = json.load(f)
    d = v["minecraft:client_entity"]["description"]

    # 1. Ek geometri ve doku
    d.setdefault("geometry", {})["o_sey"] = "geometry.o_sey"
    d.setdefault("textures", {})["o_sey"] = "textures/entity/" + SEY_DOKU
    # v4.97: modlarin EK KATMANLARI (Guc'un matkaplari,
    # Titan'in halesi). Kendi geometrisi ve kendi dokusuyla
    # geliyorlar cunku Bedrock'ta bir geometrinin tek dokusu
    # olur ve uc katmanin uc ayri dokusu var.
    for _em, _ek, _egeo, _eanim, _eoz in ZIRH_EK:
        d["geometry"][_ek] = "geometry." + _ek
        d["textures"][_ek] = "textures/entity/" + _ek
    # v4.92: Ben 10 yaratiklari + v4.94: Max Steel mod
    # cekirdekleri. Ayni kalibin tekrari -- her biri kendi
    # geometrisi, kendi dokusu, kendi tetigi.
    for _ba, _btr, _ben, _bdos, _btur in BEN10 + ZIRH_MOD:
        d["geometry"][_ba] = "geometry." + _ba
        d["textures"][_ba] = "textures/entity/" + _ba
    # ---- DURUŞLAR (v7.4) ----
    # Doku YOK: her duruş `Texture.default` ile, yani oyuncunun
    # KENDI derisiyle ciziliyor. Bu Blockbuster'daki "skin"in
    # karsiligi -- orada da poz modelin dokusunu degistirmiyor.
    if DURUS_ACIK:
        for _dk, _dad, _dr, _dp in DURUSLAR:
            d["geometry"][DURUS_ONEK + _dk] = ("geometry." + DURUS_ONEK + _dk)
    # ---- KOLSUZ GOVDE (v7.9) ----
    # Kol takasi sirasinda oyuncu KOLSUZ ciziliyor. Duruslarla
    # ayni yol: geometri + tetik + denetleyici. Dokusu da yok --
    # oyuncunun kendi derisi.
    if KOL_TAKAS_ACIK:
        d["geometry"][TAKAS_GOVDE] = "geometry." + TAKAS_GOVDE

    # 2. Tetik. IKI yuva da sinaniyor: yan el ana eli bos birakir
    #    ama her surumde ayni davranmayabilir; ana el kesin
    #    calisiyor (referans paketlerin hepsi onu kullaniyor).
    tetik = ("variable.o_sey = query.get_equipped_item_name('main_hand') == '%s'"
             " || query.get_equipped_item_name('off_hand') == '%s';"
             % (MASKE_ESYA, MASKE_ESYA))
    d["scripts"]["pre_animation"].append(tetik)
    for _ba, _btr, _ben, _bdos, _btur in BEN10 + ZIRH_MOD:
        d["scripts"]["pre_animation"].append(
            "variable.%s = query.get_equipped_item_name('main_hand') == '%s'"
            " || query.get_equipped_item_name('off_hand') == '%s';"
            % (_ba, _ba, _ba))
    # Duruş tetigi ayni kalip. AYRICA kaynagin kendi onceligi
    # taklit ediliyor: mchorse.metamorph.api.EntityUtils.getPose
    # ucarken "flying" donuyor, yani ozel duruş o sirada
    # GECERSIZ. Bizde de oyle -- yoksa oyuncu kanat acmis halde
    # T duruşunda donardi.
    #
    # NEDEN "riding" YOK: kaynagin listesinde var ama bu depoda
    # binmeyi soran KANITLANMIS bir molang sorgusu yok. Taban
    # dosyada (vanilla player.entity.json) gecen sorgular
    # olculdu: is_gliding ve is_swimming VAR, is_riding YOK.
    # Var oldugunu VARSAYIP yazsaydim ve yanlis olsaydi ifade
    # derlenmez, oyuncunun cizimi komple bozulurdu. Kanitli
    # olmayan bir sorgu icin alinacak risk degil.
    if DURUS_ACIK:
        for _dk, _dad, _dr, _dp in DURUSLAR:
            _dt = DURUS_ONEK + _dk
            d["scripts"]["pre_animation"].append(
                "variable.%s = (query.get_equipped_item_name('main_hand') == '%s'"
                " || query.get_equipped_item_name('off_hand') == '%s')"
                " && !query.is_gliding && !query.is_swimming;"
                % (_dt, _dt, _dt))
    # "Herhangi bir donusum acik mi": vanilla govdeyi kapatan
    # kosul. Tek tek yazmak yerine TEK degisken -- yeni bir
    # yaratik eklenince burasi kendiliginden dogru kaliyor.
    # Duruşlar da buraya giriyor: duruş acikken oyuncunun kendi
    # bedeni ciziliyor olsaydi POZ VERILMIS kopyanin icinde
    # kalirdi -- iki govde ust uste. Kaynakta bunun karsiligi
    # morph'un vanilla modeli tamamen degistirmesi.
    # Kolsuz govde tetigi. Ayni kalip, ayni iki yuva.
    # `is_gliding`/`is_swimming` istisnasi da AYNI sebeple var:
    # kanat acmis ya da yuzerken vanilla animasyon kollari
    # suruyor, kolsuz govdede surecek kol yok ve oyuncu garip
    # bir sekilde donardi.
    if KOL_TAKAS_ACIK:
        d["scripts"]["pre_animation"].append(
            "variable.%s = (query.get_equipped_item_name('main_hand') == '%s'"
            " || query.get_equipped_item_name('off_hand') == '%s')"
            " && !query.is_gliding && !query.is_swimming;"
            % (TAKAS_GOVDE, TAKAS_ISARET, TAKAS_ISARET))
    _durus_degiskenleri = ([DURUS_ONEK + _d[0] for _d in DURUSLAR]
                           if DURUS_ACIK else [])
    # Kolsuz govde de `donusuk`e giriyor: girmeseydi oyuncunun
    # KENDI bedeni (kollariyla birlikte) kolsuz kopyanin icinde
    # cizilirdi -- yani kollar hic dusmemis gorunurdu.
    _takas_degiskenleri = [TAKAS_GOVDE] if KOL_TAKAS_ACIK else []
    d["scripts"]["pre_animation"].append(
        "variable.donusuk = variable.o_sey" +
        "".join(" || variable." + _b[0] for _b in BEN10 + ZIRH_MOD) +
        "".join(" || variable." + _v for _v in _durus_degiskenleri) +
        "".join(" || variable." + _v for _v in _takas_degiskenleri) + ";")

    # 3. + 4. Denetleyiciler
    yeni_rc = []
    for kayit in d["render_controllers"]:
        if isinstance(kayit, dict):
            kayit = copy.deepcopy(kayit)
            for ad in list(kayit):
                # Ucuncu sahis (ve izleyici hali): donusukken KAPAT
                if "third_person" in ad:
                    kayit[ad] = kayit[ad] + " && !variable.donusuk"
        yeni_rc.append(kayit)
    # Kendi denetleyicimiz EN SONA: sira cizim sirasi.
    yeni_rc.append({
        "controller.render.o_sey":
            "variable.o_sey && !variable.is_first_person && !variable.map_face_icon"
    })
    for _ba, _btr, _ben, _bdos, _btur in BEN10 + ZIRH_MOD:
        yeni_rc.append({
            "controller.render." + _ba:
                "variable.%s && !variable.is_first_person"
                " && !variable.map_face_icon" % _ba
        })
    for _dv in _durus_degiskenleri + _takas_degiskenleri:
        yeni_rc.append({
            "controller.render." + _dv:
                "variable.%s && !variable.is_first_person"
                " && !variable.map_face_icon" % _dv
        })
    # Ek katmanin TETIGI ana modun degiskeni: cekirdek elde
    # oldugunda ikisi birden ciziliyor. Kendi degiskeni
    # OLMAMALI -- ayri bir tetik iki katmanin ayrisabilecegi
    # anlamina gelirdi (matkaplar var, takim yok gibi).
    for _em, _ek, _egeo, _eanim, _eoz in ZIRH_EK:
        _kosul = ("variable.zirh_mod_%s && !variable.is_first_person"
                  " && !variable.map_face_icon" % _em)
        if _eoz:
            # v5.8: katman ayrica ACILMIS olmali (matkap).
            _kosul += " && q.property('%s')" % _eoz
        yeni_rc.append({"controller.render." + _ek: _kosul})
    d["render_controllers"] = yeni_rc

    # 5. Fazladan dort kolun salinimi. Vanilla oyuncu
    #    animasyonlari head/body/rightArm/leftArm/rightLeg/leftLeg
    #    kemiklerini adiyla suruyor -- bizim model o adlari
    #    kullandigi icin yuruyus BEDAVA geliyor. Yatay dort kol
    #    vanilla'da olmadigi icin kendi animasyonumuz gerekiyor.
    d["animations"]["o_sey_kollar"] = "animation.o_sey.yuru"
    d["scripts"]["animate"].append({"o_sey_kollar": "variable.o_sey"})

    # ---- MODUN KENDI ANIMASYONLARI (v4.93) ----
    # Dosyalar oldugu gibi kopyalaniyor: bicimleri zaten Bedrock
    # (format_version 1.8.0) ve hicbiri armorX kemiklerini
    # surmuyor, yani yeniden adlandirmamizdan etkilenmiyorlar.
    for _an in BEN10_ANIM:
        _ak = os.path.join(BEN10_ANIM_KAYNAK, _an + ".animation.json")
        if os.path.exists(_ak):
            shutil.copyfile(_ak, os.path.join(
                OMP, "animations/%s.animation.json" % _an))
        else:
            print("UYARI: %s animasyonu yok" % _an)

    # Bicim AILELERI: "Yuzen Cene'nin herhangi bir bicimi" gibi
    # kosullar icin. Uc bicimi tek tek yazmak yerine tek
    # degisken -- yeni bicim eklenirse kendiliginden dogru.
    for _kisa, _tr2, _en2, _tur2, _olc2, _bs2, _es2 in BEN10_TABAN:
        _uyeler = ["variable.ben_%s%s" % (_kisa, _son)
                   for _son, _a1, _a2 in BEN10_BICIM[:_bs2]]
        d["scripts"]["pre_animation"].append(
            "variable.ben_%s_ailesi = %s;" % (_kisa, " || ".join(_uyeler)))

    for _ad, _anim, _kosul in BEN10_ANIM_BAGLI:
        d["animations"][_ad] = _anim
        d["scripts"]["animate"].append({_ad: _kosul})

    # v4.97: matkap donusu. Modda `animation_trigger: "drilling"`
    # ile calisiyor; Bedrock'ta tetik yok, o yuzden CEKIRDEK
    # ELDEYKEN surekli donuyor. Modda da matkaplar takimin
    # gorunur bir parcasi ve "drills" yetenegi acikken
    # donuyorlar -- surekli donmek yanlis bir sey gostermiyor.
    for _em, _ek, _egeo, _eanim, _eoz in ZIRH_EK:
        if not _eanim:
            continue
        _anim_adi = ZIRH_EK_ANIM.get(_eanim)
        if not _anim_adi:
            continue
        d["animations"][_ek] = _anim_adi
        _akosul = "variable.zirh_mod_" + _em
        if _eoz:
            _akosul += " && q.property('%s')" % _eoz
        d["scripts"]["animate"].append({_ek: _akosul})

    yaz_json(os.path.join(OMP, "entity/player.entity.json"), v)

    # Denetleyici: referans paketteki sp_m_bobby_gun'in BIREBIR
    # ayni bicimi.
    denetleyiciler = {
        "controller.render.o_sey": {
            "geometry": "Geometry.o_sey",
            "textures": ["Texture.o_sey"],
            "materials": [{"*": "Material.default"}],
        }
    }
    for _ba, _btr, _ben, _bdos, _btur in BEN10 + ZIRH_MOD:
        denetleyiciler["controller.render." + _ba] = {
            "geometry": "Geometry." + _ba,
            "textures": ["Texture." + _ba],
            "materials": [{"*": "Material.default"}],
        }
    for _em, _ek, _egeo, _eanim, _eoz in ZIRH_EK:
        denetleyiciler["controller.render." + _ek] = {
            "geometry": "Geometry." + _ek,
            "textures": ["Texture." + _ek],
            "materials": [{"*": "Material.default"}],
        }
    # Duruşun dokusu OYUNCUNUN KENDISI: `Texture.default` taban
    # dosyada zaten oyuncunun derisine bagli. Kendi dokumuzu
    # yazsaydik herkes ayni gorunurdu -- duruşun butun anlami
    # kendi skininle poz vermek.
    for _dv in _durus_degiskenleri + _takas_degiskenleri:
        denetleyiciler["controller.render." + _dv] = {
            "geometry": "Geometry." + _dv,
            "textures": ["Texture.default"],
            "materials": [{"*": "Material.default"}],
        }
    yaz_json(os.path.join(OMP, "render_controllers/o_sey.render_controllers.json"), {
        "format_version": "1.8.0",
        "render_controllers": denetleyiciler,
    })

    # Paket KENDI KENDINE YETSIN: geometri, doku ve animasyon
    # burada da duruyor. Ana kaynak paketi kapatilsa bile
    # donusum calisir; ustelik iki kopya da URETILDIGI icin
    # ayrisma ihtimali yok.
    yaz_json(os.path.join(OMP, "models/entity/o_sey.geo.json"), o_sey_geometrisi())
    for _dk, _dad, _dr, _dp in (DURUSLAR if DURUS_ACIK else []):
        yaz_json(os.path.join(OMP, "models/entity/%s%s.geo.json"
                              % (DURUS_ONEK, _dk)),
                 durus_geometrisi(_dk, _dp))
    if KOL_TAKAS_ACIK:
        yaz_json(os.path.join(OMP, "models/entity/%s.geo.json" % TAKAS_GOVDE),
                 kolsuz_geometrisi())
    yaz_json(os.path.join(OMP, "animations/o_sey.animation.json"), SEY_ANIM)
    kaynak_doku = os.path.join(RP, "textures/entity/%s.png" % SEY_DOKU)
    hedef_doku = os.path.join(OMP, "textures/entity/%s.png" % SEY_DOKU)
    if os.path.exists(kaynak_doku):
        os.makedirs(os.path.dirname(hedef_doku), exist_ok=True)
        shutil.copyfile(kaynak_doku, hedef_doku)
    # Ben 10 yaratiklari (v4.92). Paket kendi kendine yetsin:
    # geometri ve doku burada da duruyor, ikisi de URETILDIGI
    # icin ayrisamazlar.
    for _em, _ek, _egeo, _eanim, _eoz in ZIRH_EK:
        # Ayni donusturucu: kemik adlari vanillaya cevriliyor,
        # kupler/uv/donusler HIC ellenmiyor.
        yaz_json(os.path.join(OMP, "models/entity/%s.geo.json" % _ek),
                 ben10_geometrisi(_ek, [_egeo]))
        _ekd = os.path.join(DOKU_KAYNAK, _ek + ".png")
        if os.path.exists(_ekd):
            _ekh = os.path.join(OMP, "textures/entity/%s.png" % _ek)
            os.makedirs(os.path.dirname(_ekh), exist_ok=True)
            shutil.copyfile(_ekd, _ekh)
        else:
            print("UYARI: %s dokusu yok (%s)" % (_ek, _ekd))
        # Animasyon: modun kendi dosyasi OLDUGU GIBI kopyalaniyor.
        if _eanim:
            _eak = os.path.join(BEN10_ANIM_KAYNAK, _eanim + ".animation.json")
            if os.path.exists(_eak):
                with open(_eak, encoding="utf-8") as _f:
                    _av = json.load(_f)
                # Anahtari Bedrock kimligine cevir (gerekcesi
                # ZIRH_EK_ANIM basliginda). Icerige dokunma.
                _hedef_ad = ZIRH_EK_ANIM.get(_eanim)
                if _hedef_ad and len(_av.get("animations", {})) == 1:
                    _eski_ad = list(_av["animations"])[0]
                    if _eski_ad != _hedef_ad:
                        _av["animations"] = {_hedef_ad: _av["animations"][_eski_ad]}
                        print("   %s: animasyon anahtari %s -> %s"
                              % (_eanim, _eski_ad, _hedef_ad))
                yaz_json(os.path.join(
                    OMP, "animations/%s.animation.json" % _eanim), _av)
            else:
                print("UYARI: %s animasyonu yok" % _eanim)

    for _ba, _btr, _ben, _bdos, _btur in BEN10 + ZIRH_MOD:
        yaz_json(os.path.join(OMP, "models/entity/%s.geo.json" % _ba),
                 ben10_geometrisi(_ba, _bdos))
        _bk = os.path.join(DOKU_KAYNAK, _ba + ".png")
        if os.path.exists(_bk):
            _bh = os.path.join(OMP, "textures/entity/%s.png" % _ba)
            os.makedirs(os.path.dirname(_bh), exist_ok=True)
            shutil.copyfile(_bk, _bh)
        else:
            print("UYARI: %s dokusu yok (%s)" % (_ba, _bk))

    yaz_json(os.path.join(OMP, "manifest.json"), {
        "format_version": 2,
        "header": {
            "name": PAKETLER["omp"][0],
            "description": PAKETLER["omp"][1],
            "uuid": OMP_UUID_BAS,
            "version": surum,
            "min_engine_version": [1, 20, 0],
        },
        "modules": [{
            "type": "resources",
            "uuid": OMP_UUID_MOD,
            "version": surum,
        }],
    })
    png_yaz(os.path.join(OMP, "pack_icon.png"), 64, 64, paket_ikonu((10, 10, 13)))
    return True


def maske_esyasi():
    """Donusumu tetikleyen esya.

    Bir SILAH degil, bir ANAHTAR: hasari yok, dayanikliligi yok.
    Yan ele de konabiliyor (allow_off_hand) -- boylece ana elin
    bos kalir ve kilic/kazma kullanmaya devam edersin.          """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + MASKE_ESYA,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": MASKE_ESYA},
                "minecraft:display_name": {"value": MASKE_TR},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                # Yan el: ana el bos kalsin diye. Molang tetigi
                # iki yuvayi da sinliyor.
                "minecraft:allow_off_hand": True,
            },
        },
    }


def maske_ikonu():
    """Esya ikonu: O Sey dokusunun KENDI YUZU.

    Uydurma bir cizim degil -- modelin kafasinin on yuzu
    (uv 8,8 - 15,15) buyutulup ikon yapiliyor. Skin degisirse
    ikon da kendiliginden degisir.                              """
    try:
        from PIL import Image
    except ImportError:
        return None
    kaynak = os.path.join(RP, "textures/entity/%s.png" % SEY_DOKU)
    if not os.path.exists(kaynak):
        return None
    im = Image.open(kaynak).convert("RGBA")
    yuz = im.crop((8, 8, 16, 16)).resize((16, 16), Image.NEAREST)
    return yuz


def o_sey_kilik_istemci_varligi():
    """Kilik ile O Sey AYNI geometriyi ve AYNI dokuyu kullaniyor:
    ikisinin ayrisma ihtimali yok, cunku iki dosya degil ayni
    iki satir.                                                   """
    t = o_sey_istemci_varligi()
    d = t["minecraft:client_entity"]["description"]
    d["identifier"] = SEY_KILIK_KIMLIK
    # Yumurtasi yok -> yumurta rengi de anlamsiz
    d.pop("spawn_egg", None)
    return t


def o_sey_istemci_varligi():
    """Ozel render controller YOK -- v4.28'de bot tam o yuzden
    gorunmez olmustu. controller.render.default + tek doku.     """
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": SEY_KIMLIK,
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/entity/" + SEY_DOKU},
                "geometry": {"default": "geometry.o_sey"},
                "render_controllers": ["controller.render.default"],
                "spawn_egg": {
                    "base_color": "#0a0a0d",     # skinin govde siyahi
                    "overlay_color": "#4aedd9",  # skinin damar turkuazi
                },
                "scripts": {"animate": ["yuru"]},
                "animations": {"yuru": "animation.o_sey.yuru"},
            }
        },
    }


def bot_dokusu(cesit):
    """64x64, vanilla skin duzeni. Gercek bir Minecraft skini ile
    degistirmek istersen aynen uzerine yaz -- UV birebir ayni.

    v4.28: yer tutucu duz renklerden GERCEK bir yuze gecildi.
    Kafanin on yuzu (x=8..15, y=8..15) elle cizildi:

        y= 8..10   sac (perce one dusuyor)
        y=11       alin / kas cizgisi
        y=12       GOZ  -- ak + bebek, v4.19'da olculen satir
        y=13       burun golgesi
        y=14       agiz
        y=15       cene

    Govdede yaka, kemer, kol agzi ve bot var; duz renk yerine
    hafif golge ile hacim veriliyor. Ust katman (hat/jacket)
    kullanilmiyor -- 20 bot ekranda oldugunda fazladan katman
    tablette bosuna cizim.
    """
    sac, gomlek, pantolon = BOT_RENKLER[cesit % len(BOT_RENKLER)]
    ten = BOT_TEN
    p = {}

    def kutu(x0, y0, en, boy, renk, kenar=True):
        for y in range(y0, y0 + boy):
            for x in range(x0, x0 + en):
                k = 1.0
                if kenar:
                    if x == x0 or y == y0: k = 0.88
                    elif x == x0 + en - 1 or y == y0 + boy - 1: k = 1.08
                p[(x, y)] = golge(renk, k) + (255,)

    # ---- KAFA ----
    kutu(0, 8, 32, 8, ten)          # dort yan yuz
    kutu(0, 0, 32, 8, sac)          # ust + alt kapak

    # Sac: yanlardan ve arkadan asagi iniyor, on tarafta perce
    for x in range(0, 32):
        for y in range(8, 11):
            p[(x, y)] = golge(sac, 1.0 if (x + y) % 4 else 0.9) + (255,)
    # On yuzde perce y=11'de sadece kenarlarda kalsin (alin acik)
    for x in (8, 9, 14, 15):
        p[(x, 11)] = golge(sac, 0.95) + (255,)

    # Kaslar
    for x in (9, 10, 13, 14):
        p[(x, 11)] = golge(sac, 0.7) + (255,)

    # ---- GOZ (v4.19'da OLCULEN satir/sutunlar) ----
    for x in (9, 14):
        p[(x, 12)] = (246, 246, 250, 255)      # goz aki
    for x in (10, 13):
        p[(x, 12)] = (40, 58, 92, 255)         # goz bebegi (lacivert)

    # Burun golgesi ve agiz
    p[(11, 13)] = golge(ten, 0.86) + (255,)
    p[(12, 13)] = golge(ten, 0.86) + (255,)
    for x in (11, 12):
        p[(x, 14)] = (108, 62, 52, 255)        # agiz

    # ---- GOVDE ----
    kutu(16, 16, 24, 16, gomlek)
    kutu(40, 16, 16, 16, gomlek)               # sag kol
    kutu(32, 48, 16, 16, gomlek)               # sol kol
    kutu(0, 16, 16, 16, pantolon)              # sag bacak
    kutu(16, 48, 16, 16, pantolon)             # sol bacak

    # Yaka: govdenin ust seridi koyu
    for x in range(16, 40):
        p[(x, 16)] = golge(gomlek, 0.72) + (255,)
        p[(x, 17)] = golge(gomlek, 0.82) + (255,)

    # Kemer: govdenin alt ucu
    for x in range(16, 40):
        for y in (27, 28):
            p[(x, y)] = golge(pantolon, 0.6) + (255,)

    # Kol agzi + eller
    for x0 in (40, 32):
        y0 = 16 if x0 == 40 else 48
        for x in range(x0, x0 + 16):
            p[(x, y0 + 11)] = golge(gomlek, 0.7) + (255,)
            for y in range(y0 + 12, y0 + 16):
                p[(x, y)] = golge(ten, 1.0 if (x + y) % 5 else 0.93) + (255,)

    # Botlar: bacaklarin alt ucu koyu
    for x0, y0 in ((0, 16), (16, 48)):
        for x in range(x0, x0 + 16):
            for y in range(y0 + 12, y0 + 16):
                p[(x, y)] = golge((52, 46, 44), 1.0 if (x + y) % 4 else 0.85) + (255,)

    return p

    return p


# ------------------------------------------------------------- geometri
GEOMETRI = {
    "format_version": "1.12.0",
    "minecraft:geometry": [
        {
            "description": {
                "identifier": "geometry.simsek_kol",
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 4,
                "visible_bounds_height": 4,
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": [
                # Kok kemigin adi OYUNCU ISKELETINDEKI kemikle ayni olmali.
                # Bedrock ayni isimli kemikleri eslestirip modeli oraya
                # bagliyor. Baska bir ad (orn. "kol_kok") verilirse model
                # kola hic oturmaz -- eski surumdeki hata buydu.
                {"name": "RightArm", "pivot": [-5, 22, 0]},
                {
                    "name": "kol",
                    "parent": "RightArm",
                    "pivot": [-6, 22, 0],
                    "cubes": [
                        {
                            # Vanilla sag kol kupunun tam yeri. inflate 0.15
                            # ile skin'in kolunun uzerini kapatiyor.
                            "origin": [-8, 10, -2],
                            "size": [4, 12, 4],
                            "uv": [40, 16],
                            "inflate": 0.15,
                        }
                    ],
                },
            ],
        }
    ],
}

# ---- KANLI KOL GEOMETRISI  (v6.7) ----
#
# ---- ONCE YANLIS YAPTIM, KULLANICI EKRAN GORUNTUSU GONDERDI ----
# Ilk denemede Kanli Kol'u depodaki diger alti kol gibi bir KOL
# KAPLAMASI yaptim: kirmizi bir kol, uzerinde dikenler. Kaynagin
# modelini "tutulan bir prop, oyuncunun koluyla hareket etmez"
# diye eledim. YANLISTI.
#
# Kaynagin modelinin kok kemikleri OLCULDU:
#     rightArm  pivot [-5, 22, 0]
#     leftArm   pivot [ 5, 22, 0]
# Bunlar oyuncu iskeletindeki kol kemiklerinin TAM pivotlari.
# Bedrock ayni adli kemikleri esliyor, yani model oyuncunun IKI
# koluna birden baglaniyor ve iki kol da normal sekilde hareket
# ediyor. Cocuk kemiklerin adlari (leftArm3, head2, bone...)
# karmakarisik ama onemli degil -- baglanmayi yalniz kok
# kemikler yapiyor.
#
# Kanli Kol boylece kaynaktaki gibi: iki uzun ince kirmizi kol,
# uclarinda 7x7x7 turuncu-kanli yumruklar. Elle cizdigim kol
# kaplamasi ATILDI; model ve doku kaynaktan OLDUGU GIBI geliyor.
KANLI_GEO_KAYNAK = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "kaynak_geo", "konsey")

# ---- MODEL BOBBY'DEN CHRIS'E GECTI  (v7.3) ----
#
# Kullanici gercek Kanli Kol'un ekran goruntusunu gonderdi:
# parlak kirmizi, BOGUMLU zincir kollar, uclarinda DISLI pence.
# v6.7'de kullandigimiz `blood_arm` (Bobby1545 Mod V3) o degil --
# o duz kirmizi kollarin ucunda turuncu yumruk.
#
# Aranan model depoda ZATEN vardi: `kns_kolluk_chris_kanli`
# (Code-Man paketi, chris1545s_red_bloody_arms), v6.2'den beri
# ama yalnizca gogus yuvasina takilan bir SUS esyasi olarak.
# Yetenekler Kanli Kol'da, gorunum orada duruyordu.
#
# Kullanici "2 kol birbirine gecmis gibi" dedi. OLCTUM: model
# dogru, benim cizicimin donus isareti tersti (bkz. ciz_kemik.py
# docstring'i). Dort duzen olculdu:
#     XYZ isaret-1 -> kollar 7.2 birim CAKISIYOR   (cizicinin eski hali)
#     XYZ isaret+1 -> sag x -13.1..-1.9, sol +1.9..+13.1, CAKISMA YOK
# Bedrock pozitif acilarla XYZ sirasinda donduruyor. Model
# duzeltilmedi cunku BOZUK DEGILDI.
KANLI_GEO_DOSYA = "kns_kolluk_chris_kanli.geo.json"

# Kaynagin hiyerarsisi:  waist -> body -> rightArm -> bone (33 kup)
#                                     -> leftArm  -> bone3 (33 kup)
# Zirh olarak calisiyor ama biz bunu ELDE TUTULAN bir esya
# olarak takiyoruz. Bedrock attachable kemiklerini ADINA gore
# oyuncu iskeletine esliyor: `body` de bir oyuncu kemigi. Kol
# kemikleri `body`nin ALTINDA kalirsa govde donusu bir kez
# `body`den bir kez de kolun kendisinden gelir -- iki kat.
#
# Bu yuzden kupsuz/donussuz ust kemikler ATILIYOR ve
# rightArm/leftArm KOK kemik yapiliyor: v6.7'de baglandigi
# kanitlanmis duzen bu. Pivotlar Bedrock'ta MUTLAK oldugu icin
# ve atilan kemiklerde donus OLMADIGI icin durus hic degismiyor.
KANLI_ATILAN = ("waist", "body")

# ---- BOBBY1545'IN KANLI KOLU  (v7.12) ----
# Kullanici: "sadece chris1545'in kanli kolu var, Bobby1545'in
# de kanli kolu vardi, hatirlarsan, onu da ekle."
#
# Hakli ve dosya bunu dogruluyor: `kns_kolluk_bobby_kanli`
# v6.2'den beri depoda duruyor (Code-Man paketi,
# `bobby1545s_red_bloody_arms`) ama yalnizca gogus yuvasina
# takilan bir SUS esyasi olarak. v6.7'de Kanli Kol'un modeli
# oydu; v7.3'te model chris'e gecti ve Bobby'nin kolu
# gorunumden ibaret kaldi.
#
# ---- BUGUNKU DURUMUN OLCUMU ----
# Su anki "Kanli Kol" aslinda bir MELEZ: yetenekleri
# Bobby1545 Mod V3'ten (kollar.js'te yaziyor), modeli ve dokusu
# chris1545'ten. Yani Bobby'nin kolu eksik degildi -- ikiye
# bolunmustu. Bu surum onu geri topluyor: kendi modeli, kendi
# dokusu, kendi yetenek seti.
#
# Iki modelin ISKELETI AYNI (olculdu):
#   bobby : waist -> body -> rightArm -> bone  (16 kup) 64x64
#   chris : waist -> body -> rightArm -> bone  (33 kup) 32x32
# Yani ayni donusturucu ikisinde de calisiyor.
KANLI_BOBBY_GEO_DOSYA = "kns_kolluk_bobby_kanli.geo.json"
KANLI_BOBBY_DOKU_DOSYA = "kns_kolluk_bobby_kanli.png"
KANLI_BOBBY_IKON_DOSYA = os.path.join("konsey_ikon",
                                      "kns_kolluk_bobby_kanli.png")
# Bobby'nin kolu UZATILMIYOR. Omurga uzatmasi (KANLI_UZATMA ve
# arkadaslari) chris'in ZINCIR BAKLALI omurgasi olculerek
# hesaplandi; Bobby'ninki duz kollarin ucunda yumruk. Ayni
# sayilari ona uygulamak, olculmemis bir seyi olculmus gibi
# gostermek olurdu.
KANLI_BOBBY_UZAT = False

# ---- OMURGA UZATMA  (v7.5) ----
# Kullanici: "chris kolunu birazcik daha uzat, omurgasini
# birazcik daha uzat, bir tik kisa oldu gibi."
#
# OLCULDU (kemik `bone`/`bone3`in yerel y ekseni):
#     19,57 .. 31,90   OMURGA -- 3,25x1,30x2,60 zincir baklalari
#                      ve aralarindaki 0,65'lik baglantilar
#     31,90 .. 38,43   PENCE  -- 5,85x1,30x7,80 avuc,
#                      5,85x5,20x5,85 yumruk, 0,65'lik disler
#
# Omuz ucu yerel y=19,575; donusten sonra dunyada (-3,0, 25,4),
# yani omuz eklemi. Uzatma O UCTAN yapiliyor -- pivotun oteki
# yanindan yapilsaydi kol govdenin ICINE dogru buyurdu.
#
# PENCE OLCEKLENMIYOR, sadece oteleniyor. Olcekleseydik disler
# ve yumruk da uzardi; kullanicinin dedigi "omurga kisa",
# pence degil. Pencenin oranlari kaynaktaki gibi kaliyor.
KANLI_UZATMA = 1.20        # 1.0 = kaynaktaki hali
KANLI_OMUZ_UC = 19.575     # uzatmanin sabit ucu (yerel y)
KANLI_PENCE_SINIR = 31.9   # bunun ustu pence, alti omurga


def kanli_omurgayi_uzat(kemikler, k=None):
    """Omurgayi gerdirir, penceyi oldugu gibi oteler."""
    k = KANLI_UZATMA if k is None else k
    if abs(k - 1.0) < 1e-9:
        return kemikler
    kayma = (KANLI_PENCE_SINIR - KANLI_OMUZ_UC) * (k - 1.0)
    for b in kemikler:
        for c in b.get("cubes", []):
            y = c["origin"][1]
            if y < KANLI_PENCE_SINIR:
                c["origin"][1] = KANLI_OMUZ_UC + (y - KANLI_OMUZ_UC) * k
                c["size"][1] = c["size"][1] * k
                if c.get("pivot"):
                    c["pivot"][1] = (KANLI_OMUZ_UC
                                     + (c["pivot"][1] - KANLI_OMUZ_UC) * k)
            else:
                c["origin"][1] = y + kayma
                if c.get("pivot"):
                    c["pivot"][1] = c["pivot"][1] + kayma
    return kemikler


def kanli_geometrisi(dosya=None, kimlik="geometry.simsek_kol_kanli",
                    uzat=True, ad="Kanli Kol"):
    """Kanli kol modelini oyuncu koluna baglanacak hale getirir.

    Kupsuz ve donussuz ust kemikler (waist/body) atilir, kol
    kemikleri koke cikar. Atilacak kemikte KUP ya da DONUS
    varsa is iptal: sessizce geometri kaybetmektense kol
    hic uretilmesin, temizlik adimi eksigi zaten bagirir.

    v7.12'de PARAMETRELESTI: iki kanli kol var (chris ve
    bobby) ve iskeletleri ayni. Ikinci bir kopya yazilsaydi
    biri duzelip oteki bozulurdu.
      dosya  : kaynak .geo.json (varsayilan chris)
      kimlik : uretilen geometri adi
      uzat   : omurga uzatmasi uygulansin mi -- YALNIZ chris
               icin olculdu, bkz. KANLI_BOBBY_UZAT              """
    kaynak = os.path.join(KANLI_GEO_KAYNAK, dosya or KANLI_GEO_DOSYA)
    if not os.path.exists(kaynak):
        print("UYARI: %s modeli yok (%s)" % (ad, kaynak))
        return None
    with open(kaynak, encoding="utf-8") as f:
        ham = json.load(f)
    govde = (ham.get("minecraft:geometry") or [None])[0]
    if not isinstance(govde, dict):
        print("UYARI: %s modelinde geometri govdesi yok" % ad)
        return None
    kemikler = [dict(k) for k in govde.get("bones", [])]
    atilacak = set()
    for k in kemikler:
        if k.get("name") not in KANLI_ATILAN:
            continue
        if k.get("cubes") or k.get("rotation"):
            print("UYARI: %s'da '%s' kemigi bos degil, model "
                  "atlandi" % (ad, k.get("name")))
            return None
        atilacak.add(k["name"])
    kalan = []
    for k in kemikler:
        if k.get("name") in atilacak:
            continue
        if k.get("parent") in atilacak:
            k.pop("parent", None)          # kok kemik: oyuncu koluna esler
        kalan.append(k)
    if not any(k.get("name") in ("rightArm", "leftArm") for k in kalan):
        print("UYARI: %s'da kol kok kemigi yok, model atlandi" % ad)
        return None
    kalan = kanli_omurgayi_uzat(kalan, None if uzat else 1.0)
    tanim = govde.get("description", {})
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": kimlik,
                    # Doku 256x256 ama uv uzayi 32x32: kaynak
                    # sekiz kat cozunurlukte cizmis. Bu ikisi
                    # kaynaktan OLDUGU GIBI gelmeli, yoksa
                    # uv'ler kayar.
                    "texture_width": tanim.get("texture_width", 32),
                    "texture_height": tanim.get("texture_height", 32),
                    # Kollar x ekseninde +-13.1 birime kadar
                    # uzaniyor (OLCULDU). 6 blok = +-48 birim,
                    # uzaktan bakinca pence kirpilmaz.
                    "visible_bounds_width": 6,
                    "visible_bounds_height": 5,
                    "visible_bounds_offset": [0, 1.5, 0],
                },
                "bones": kalan,
            }
        ],
    }


# ---- TUTUS ANIMASYONU KALDIRILDI  (v5.3) ----
#
# Kullanici: "gene animasyon tarafinda tum animasyonlar icin
# genel bir tarama yapmani istiyorum, bozukluk cikarsa haber et."
#
# TARAMA BUNU BULDU. `animation.simsek_kol.*` `rightitem` adli
# bir kemige yaziyordu; `geometry.simsek_kol`de oyle bir kemik
# YOK (kemikler: RightArm, kol). Yani animasyon hicbir zaman
# CALISMADI -- alti kolun tamaminda, dort surumdur.
#
# Eski yorum "referans mod da aynen boyle gonderiyor ve
# calisiyor" diyordu; referans modda da calismiyormus, sadece
# kimse bakmamis.
#
# NEDEN SILINDI, NEDEN KEMIK EKLENMEDI:
# Kemigi eklemek animasyonu CANLANDIRIR ve kolun durusu
# degisir. Bu gorsel bir degisiklik ve bu depoda gorsel
# degisiklikler GORULMEDEN yapilmiyor. Olu kodu silmek hicbir
# seyi degistirmiyor; canlandirmak degistirir ve once tablette
# bakilmasi gerek.
#
# Olculmus degerler kaybolmasin diye burada duruyor:
#   ucuncu_sahis  position [0, 22, 5]     rotation [90, 0, 90]
#   birinci_sahis position [-5, 35, -5.5] rotation [0, 0, 180]

# ------------------------------------------------------------------ png
# ============================================================
# DISMONT TASI ve MEZAR TASI  (v4.50) -- paketin ILK bloklari
#
# Bugune kadar bu pakette hic ozel BLOK yoktu, sadece esya ve
# varlik vardi. Blok baska bir kayit yolu: blocks/ (BP),
# terrain_texture.json + blocks.json (RP) ve cevher icin
# ganimet tablosu. Dordu birden olmadan blok ya gorunmez ya
# mor-siyah cikar ya da kirinca hicbir sey dusurmez.
#
# format_version 1.21.0 secildi: kararli blok bicimi. v3.6'da
# esyalarda 1.16.100 kullanilmis ve "Holiday Creator Features"
# deneysel ayarina bagimli cikmisti; o hata tekrarlanmiyor.
# ---- ADI DEGISTI: DISMONT -> FREEDOM STONE (v4.86) ----
# Kullanici: "Freedom Stone bir yerden tanidik geldi degil mi?
# Iste o bizim dismont tasi. Adini degistirecegim, Freedom
# Stone olsun."
#
# Hakli: referans modun (Zabri Studios BoraLo Mod) kendi tasi
# da tam olarak bu isi yapiyor -- tutsagi serbest birakiyor.
# Dokusu da oradan alindi (kaynak_doku/freedom_stone.png).
#
# DIKKAT -- KIMLIK DEGISIYOR: eski dunyalarda yerlestirilmis
# pa:dismont_cevheri bloklari ve envanterdeki pa:dismont
# esyalari BILINMEYEN olur. Test dunyasi icin sorun degil;
# gercek bir dunyada oynaniyorsa once cevherleri kirip
# tasi almak gerekir.
#
# Kullanici "bizde sadece Freedom Stone olacak" dedi. Cevher
# DURUYOR cunku tasin oyundaki TEK kaynagi o -- silinirse
# mezardan kimse kurtulamaz. Ama artik ayri bir isim degil,
# ayni ailenin parcasi: "Freedom Stone Cevheri".
DISMONT_ESYA = "freedom_stone"
DISMONT_ESYA_TR = "Freedom Stone"
DISMONT_CEVHER = "freedom_stone_cevheri"
DISMONT_CEVHER_TR = "Freedom Stone Cevheri"
# ---- YENI ESYALAR (v4.86) ----
# Ikisi de Zabri Studios BoraLo Mod'dan geldi; dokulari
# kaynak_doku/ altinda duruyor (bkz. NEREDEN.md).
# ---- WILL1545 KILICI  (v7.8) ----
# Kullanicinin komut listesinden. "Gorunum altin kilic ile
# ayni fakat dayaniklilik netherite kilicin 5,5 kati olsun."
#
# GORUNUM: kendi ikonumuz CIZILMEDI. Cizilen sey "benzer"
# olurdu, "ayni" degil. Esya dogrudan VANILLA `golden_sword`
# doku anahtarini gosteriyor. Sarti: o anahtari kendi
# item_texture.json'umuzda TANIMLAMAYACAGIZ, yoksa vanilla
# dokusunu ezeriz -- bu yuzden asagida `dokular` sozlugune
# EKLENMIYOR ve test bunu kilitliyor.
#
# DAYANIKLILIK: netherite kilic 2031; 2031 x 5,5 = 11170,5.
# Yukari yuvarlandi.
# HASAR: 4, yani altin kilicin kendisi. Kullanici yalniz
# dayanikliligi istedi.
WILL_ESYA = "will_kilic"
WILL_ESYA_TR = "Will1545 Kılıcı"
WILL_ESYA_EN = "Will1545's Sword"
WILL_DOKU = "golden_sword"      # VANILLA anahtari, bizim degil
WILL_HASAR = 4
WILL_NETHERITE = 2031           # netherite kilicin dayanikliligi
WILL_KAT = 5.5                  # kullanicinin istedigi kat
WILL_DAYANIKLILIK = 11171       # 2031 * 5,5


def will_kilici():
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + WILL_ESYA,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                # Vanilla dokusu -- kendi anahtarimizi yazmiyoruz.
                "minecraft:icon": {"texture": WILL_DOKU},
                "minecraft:display_name": {"value": WILL_ESYA_TR},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                "minecraft:allow_off_hand": False,
                "minecraft:damage": WILL_HASAR,
                "minecraft:durability": {"max_durability": WILL_DAYANIKLILIK},
                # Onarilabilsin: 11171 vurus sonunda kirilan bir
                # kilicin tamir yolu olmali.
                "minecraft:repairable": {
                    "repair_items": [{
                        "items": ["minecraft:gold_ingot"],
                        "repair_amount": "context.other->query.remaining_durability + 0.05 * context.other->query.max_durability"
                    }]
                },
                "minecraft:glint": True,
            },
        },
    }


KILIC_ESYA = "resetting_sword"
KILIC_ESYA_TR = "Resetting Sword"
KILIC_HASAR = 12                 # 6 kalp -- ayarlar.js ikizi
TAS_ESYA = "tas_donusturucu"
TAS_ESYA_TR = "Taş Dönüştürücü"
TAS_HASAR = 6                    # 3 kalp -- ayarlar.js ikizi
TAS_BLOK = "tas_heykel"
TAS_BLOK_TR = "Taş Heykel"
TAS_KIRILMA = 8.0                # saniye; Freedom Stone'suz kirilmasin

# ---- SILAHLAR ve MERMILER (v4.87) ----
# Kullanici: "silahla alakali olan tum seyleri al."
# Referans: Zabri Studios BoraLo Mod (11 atesli silah).
# Ayarlar tarafindaki ikizi ayarlar.js:SILAHLAR -- kimlikler
# birebir ayni olmali, test esitligi kilitliyor.
#
# (esya kimligi, gorunen ad, hasar, kaynak doku)
# hasar None ise minecraft:damage yazilmiyor: mermiler ve
# tasima araclari silah degil.
SILAHLAR = [
    ("bazuka",          "Bazuka",             8, "silah_bazuka.png"),
    ("pdw",             "PDW",                6, "silah_pdw.png"),
    ("revolver",        "Revolver",           7, "silah_revolver.png"),
    ("altin_revolver",  "Altın Revolver",     9, "silah_altin_revolver.png"),
    ("sersem_silahi",   "Sersemletici",       3, "silah_sersem.png"),
    ("cekim_silahi",    "Yerçekimi Silahı",   1, "silah_sersem.png"),
]

# Mermiler: yigilabilir, elde tutulmuyor, hasarsiz.
MERMILER = [
    ("roket",         "Roket",              "mermi_roket.png"),
    ("sarjor",        "Şarjör",             "mermi_sarjor.png"),
    ("kursun",        "Kurşun",             "mermi_kursun.png"),
    ("altin_kursun",  "Altın Kurşun",       "mermi_altin.png"),
]

MEZAR_BLOK = "mezar_tasi"
MEZAR_BLOK_TR = "Mezar Taşı"

# ---- DENGE SAYILARI: KULLANICININ SECIMI (v4.51) ----
# Ikisi de tek tek soruldu ve secildi. TAHMIN DEGIL, KARAR --
# "dengeleyeyim" diye degistirme; degisecekse kullaniciya
# sorulur. Testler ikisini de kilitliyor.
#
#   kirilma  15 sn  = elmas cevherinin BES KATI  (v4.53)
#   siklik   %8, damar 1 blok  = "efsanevi"
#
# Kirilma once 6 sn secilmisti; kullanici oynayip 15 istedi.
# Yani bu sayi iki kez KARARLASTIRILDI, bir kez de gozden
# gecirildi -- degistirilecekse yine sorulur.
#
# %8 ve tek blok ne demek: parca basina 0.08 blok. Mezari bir
# kez acmak icin gereken 10 tas ~125 parca (yaklasik 2000x2000
# blokluk alan) demek. Kendin kazarak bulmak neredeyse
# imkansiz; botun derin taramasi bu yuzden hedef listesine
# eklendi (ayarlar.js:DERIN_HEDEFLER, zorluk 14).
DISMONT_Y_ALT = -64
DISMONT_Y_UST = -48
DISMONT_OBEK = 1          # bir damarda kac blok (elmas 4-8)
DISMONT_DENEME = 1        # parca basina kac damar denenir
DISMONT_SANS = 8          # yuzde: parcalarin kacinda cikacak
DISMONT_KIRILMA = 15.0    # saniye (elmas cevheri 3)


def dismont_cevher_blogu():
    """Tastaki cevher. Sadece demir kazma ve ustu kirabiliyor --
    elmas seviyesinde bir maden hissi icin."""
    return {
        "format_version": "1.21.0",
        "minecraft:block": {
            "description": {
                "identifier": "pa:" + DISMONT_CEVHER,
                "menu_category": {"category": "nature"},
            },
            "components": {
                "minecraft:material_instances": {
                    "*": {"texture": DISMONT_CEVHER, "render_method": "opaque"}
                },
                "minecraft:destructible_by_mining": {
                    "seconds_to_destroy": DISMONT_KIRILMA
                },
                "minecraft:destructible_by_explosion": {"explosion_resistance": 15},
                "minecraft:map_color": "#2b1b3a",
                "minecraft:light_emission": 2,
                "minecraft:loot": "loot_tables/blocks/%s.json" % DISMONT_CEVHER,
            },
        },
    }


def mezar_tasi_blogu():
    """El-Harkos'un mezarinin duvari.

    KIRILABILIR olmasi SART: kurtarma yolu "10 dismont ile
    mezara kazmak" ve o yol playerBreakBlock ile calisiyor.
    Kirilmaz bir blok tutsagi sonsuza kadar iceride birakirdi --
    referans modlarin caresiz kalici etkisinin ta kendisi.

    Ama kolay da degil: tasi olmayan biri kirdiginda script
    blogu geri koyuyor (asa.js), yani sure kaybi yasiyor."""
    return {
        "format_version": "1.21.0",
        "minecraft:block": {
            "description": {
                "identifier": "pa:" + MEZAR_BLOK,
                "menu_category": {"category": "construction"},
            },
            "components": {
                "minecraft:material_instances": {
                    "*": {"texture": MEZAR_BLOK, "render_method": "opaque"}
                },
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 3},
                # Patlamaya dayanikli: TNT ile mezar acilmasin,
                # anahtar dismont tasi olsun.
                "minecraft:destructible_by_explosion": {"explosion_resistance": 1200},
                "minecraft:map_color": "#141018",
            },
        },
    }


def tas_heykel_blogu():
    """Tasa cevrilen kurbanin yerine konan blok (v4.86).

    Mezar tasiyla AYNI KURALLAR: kirilabilir ama kolay degil,
    patlamaya dayanikli. Kurtarma yolu Freedom Stone.

    Neden patlamaya dayanikli: TNT ile heykeli kirip tutsagi
    kurtarmak Freedom Stone mekanigini bosa cikarirdi -- mezar
    tasinda ayni sebep yaziyor.                                """
    return {
        "format_version": "1.21.0",
        "minecraft:block": {
            "description": {
                "identifier": "pa:" + TAS_BLOK,
                "menu_category": {"category": "construction"},
            },
            "components": {
                "minecraft:material_instances": {
                    "*": {"texture": TAS_BLOK, "render_method": "opaque"}
                },
                "minecraft:destructible_by_mining": {
                    "seconds_to_destroy": TAS_KIRILMA
                },
                "minecraft:destructible_by_explosion": {"explosion_resistance": 1200},
                "minecraft:map_color": "#7a7a7a",
            },
        },
    }


def basit_esya(kimlik, ad, hasar=None, kategori="equipment"):
    """Tek dokulu, elde tutulan bir esya (v4.86).

    hasar verilirse minecraft:damage yaziliyor. Dayaniklilik
    BILEREK yok: ikisi de patron esyasi, kullanildikca
    kirilmamali (ilkel_silah_esyasi'nda ayni karar).         """
    bilesenler = {
        "minecraft:icon": {"texture": kimlik},
        "minecraft:display_name": {"value": ad},
        "minecraft:max_stack_size": 1,
        "minecraft:hand_equipped": True,
        "minecraft:allow_off_hand": False,
    }
    if hasar is not None:
        bilesenler["minecraft:damage"] = hasar
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + kimlik,
                "menu_category": {"category": kategori},
            },
            "components": bilesenler,
        },
    }


def dismont_esyasi():
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + DISMONT_ESYA,
                "menu_category": {"category": "items"},
            },
            "components": {
                "minecraft:icon": {"texture": DISMONT_ESYA},
                "minecraft:display_name": {"value": DISMONT_ESYA_TR},
                "minecraft:max_stack_size": 64,
            },
        },
    }


def dismont_ganimeti():
    """Cevher kirilinca 1 dismont tasi dusuyor.

    Ganimet tablosu OLMADAN blok kendini dusuruyor (yani
    cevheri) -- o zaman "10 tane topla" mekanigi anlamsizlasir
    cunku blok yeniden koyulup kirilabilirdi."""
    return {
        "pools": [{
            "rolls": 1,
            "entries": [{
                "type": "item",
                "name": "pa:" + DISMONT_ESYA,
                "weight": 1,
            }],
        }]
    }


def dismont_ozelligi():
    """Dunyada cevher olusumu (feature)."""
    return {
        "format_version": "1.21.0",
        "minecraft:ore_feature": {
            "description": {"identifier": "pa:freedom_stone_ore_feature"},
            "count": DISMONT_OBEK,
            "replace_rules": [{
                "places_block": "pa:" + DISMONT_CEVHER,
                "may_replace": [
                    {"name": "minecraft:stone"},
                    {"name": "minecraft:deepslate"},
                    {"name": "minecraft:tuff"},
                ],
            }],
        },
    }


def dismont_kurali():
    """Ozelligi dunya uretimine BAGLAYAN kural.

    DIKKAT -- bu sadece YENI URETILEN parcalarda calisiyor.
    Zaten gezdigin bolgede dismont cikmaz; uzaga gitmek ya da
    yeni dunya acmak gerekiyor. Bedrock'ta bunun caresi yok,
    komutla da sonradan eklenemiyor."""
    return {
        "format_version": "1.21.0",
        "minecraft:feature_rules": {
            "description": {
                "identifier": "pa:freedom_stone_ore_rule",
                "places_feature": "pa:freedom_stone_ore_feature",
            },
            "conditions": {
                "placement_pass": "underground_pass",
                "minecraft:biome_filter": [
                    {"test": "has_biome_tag", "operator": "==", "value": "overworld"}
                ],
            },
            "distribution": {
                "iterations": DISMONT_DENEME,
                "scatter_chance": DISMONT_SANS,
                "x": {"distribution": "uniform",
                      "extent": [0, 16]},
                "z": {"distribution": "uniform",
                      "extent": [0, 16]},
                "y": {"distribution": "uniform",
                      "extent": [DISMONT_Y_ALT, DISMONT_Y_UST]},
            },
        },
    }


# ============================================================
#  IKSIR AURASI -- OZEL PARCACIK SISTEMI              v7.15
#
#  Kullanici: "parcacikla baslayalim, en detaylisini yap."
#
#  ---- NEDEN PARCACIK, NEDEN DOKU DEGIL ----
#  Goz kaplamasi v7.14'te 832x832'ye cikti ama oyunda kafa
#  ekranda 20-30 piksel: birkac blok oteden o detayin TAMAMI
#  tek bir parlak lekeye donuyor. Uzaktan okunan uc sey var --
#  siluet, renk, HAREKET. Eksik olan ucuncusuydu.
#
#  ---- NEDEN VANILLA PARCACIK DEGIL ----
#  Depo bugune kadar yalniz vanilla parcacik kimlikleri
#  kullandi (parcacikAt -> spawnParticle). Vanillada renk, boy,
#  omur, hareket, doku -- hicbiri ayarlanamiyor. Sekiz iksirin
#  sekiz ayri rengi var ve hicbiri vanilla paletinde yok.
#
#  Bedrock'un KENDI parcacik sistemi bunlarin hepsini veriyor
#  (resmi belge: bedrock.dev/docs/stable/Particles). Kullanilan
#  bilesenler ve neden:
#    emitter_shape_sphere        kafanin etrafindan cikis
#    particle_initial_speed      molang -> her zerre farkli hizda
#    particle_initial_spin       zerreler TAKLA atiyor
#    particle_motion_dynamic     yukari kaldirma + surtunme:
#                                korlar yukselirken YAVASLIYOR
#    billboard.uv.flipbook       her zerre KENDI 4 karelik
#                                animasyonunu oynatiyor
#    appearance_tinting.gradient omur boyunca renk gecisi:
#                                sicak beyaz -> iksir rengi -> sonme
#    particle_lifetime_expression her zerre farkli omurde
#
#  ---- DOKU GRI, RENK TINTING'DEN ----
#  Sprite'lar gri tonlu; renk `particle_appearance_tinting` ile
#  CARPILARAK geliyor. Tek doku sekiz iksire de hizmet ediyor.
#  Renkler UYDURULMADI: IKSIRLER tablosundaki goz renkleri --
#  yani gozunde yanan renk ne ise etrafinda ucusan da o.
#
#  ---- ELEMENT IKSIRI ----
#  Onun iki goz rengi var (buz + ates, v4.63'te referanstan
#  olculdu). Gradyan IKISINI de tasiyor: beyaz -> buz -> ates ->
#  sonme. Yani en guzel aura kendiliginden onun oluyor.
# ============================================================
AURA_DOKU = "iksir_aura"
AURA_HUCRE = 32
# v7.18: 4 kare -> 8 kare. Kullanici: "alev canli olsun, bir
# buyusun bir kuculsun". Dort kare bir alevin OLUM egrisiydi
# (tazeden sonmeye); sekiz kare bir DONGU -- alev yasarken
# defalarca kirpisiyor.  Depolama sorun degil (acik kural),
# ekran karti icin 256x128 = 128 KB, onemsiz.
AURA_KARE = 8
AURA_DOKU_EN = AURA_HUCRE * AURA_KARE          # 256
# AURA_DOKU_BOY asagida, URETILEN satir sayisindan hesaplaniyor.
# Satirlar: 0 kor, 1 hale, 2 kivilcim, 3 alev. Her satir 4
# karelik bir animasyon (flipbook step_UV [32,0]).
# v7.17: 3. satir "kul"du ama OLU idi -- hicbir parcacik
# _aura_uv("kul") cagirmiyordu. Yerini goz alevi aldi; doku
# 128x128 (ikinin kuvveti) kaldi, dort satirin dordu de
# kullaniliyor.
# ---- HANGI TURLER URETILIYOR ----
#
# v7.21: BOS. Yani parcacik sistemi tamamen kapali.
#
# Kullanicinin karari, kendi sozleriyle: "en iyisi biz bu
# sorunu duzeltmek icin tum seyleri silelim, yeni goz ayni
# sekilde kalsin, kipirdamasin, alev falan oyle yerinde
# dursun... yeni gozler kalsin o sekilde ama hicbir animasyon
# eklemeyelim."
#
# Uc surum boyunca (v7.15 aura, v7.17-v7.20 goz alevi) hareket
# eklenmeye calisildi; hicbiri kullanicinin gormek istedigi
# seyi vermedi. En son sorun oyle ozetlendi: "yuzun biraz
# onunde IIIIII gibi IIIIII". Buyutuldu, sayisi bire indirildi,
# yine cizgi gorundu.
#
# GOZ KAPLAMASI DOKUNULMADI. 832x832 gozler, uzerlerine cizili
# alevleriyle, oldugu gibi duruyor -- istenen buydu.
#
# Kod da silinmedi: aura_kor / aura_hale / aura_patlama /
# aura_gozalev / aura_gozkor ve butun sprite cizimi asagida
# duruyor. Bu demete bir tur adi yazmak hepsini geri getirir.
# Ama simdi hicbiri uretilmiyor: ne parcacik dosyasi, ne doku.
#
# ---- ESKI NOT (v7.19) ----
#
# Kullanici v7.18'i oyunda gordu ve auranin kaldirilmasini
# istedi:  "bu ne, aura parcaciklari ekleyecegim diye ne
# yaptin... en iyisi aura parcaciklarini kaldir ve sadece
# gozun ustundeki o alev efektini ekle, sadece onun icin
# ugras."
#
# Ekran goruntusunde kafanin etrafi bir tarla gibiydi: kor +
# hale zerreleri kucuk olcekte ince dikey cizgilere donusuyor
# ve toplamali harmanda birbirine binip beyaz bir cali
# olusturuyorlardi. Asil istenen sey -- gozdeki alev -- o
# calinin icinde kayboluyordu.
#
# Kod SILINMEDI. aura_kor / aura_hale / aura_patlama /
# aura_gozkor oldugu gibi duruyor; buraya adlarini yazmak
# geri getirmeye yetiyor. Ama URETILMIYORLAR: dosyalari
# yazilmiyor ve kullanmadiklari sprite satirlari dokuya bile
# konmuyor. "Kapali ama yine de gonderilen" bir sey
# birakmiyoruz.
AURA_URETILEN = ()

# Her tur hangi sprite satirini kullaniyor. Iki tur ayni
# satiri paylasabilir (patlama ve gozkor'un ikisi de dikey bir
# cizgi -- ikinci bir doku cizmenin anlami yok).
AURA_TUR_SATIR = {
    "kor": "kor", "hale": "hale", "patlama": "kivilcim",
    "gozalev": "alev", "gozkor": "kivilcim",
}

# Satirlar URETILEN turlerden cikariliyor: kullanilmayan satir
# dokuya girmiyor. v7.17'de "kul" diye olu bir satir vardi ve
# hicbir sey onu yakalamamisti; bir daha olmasin diye satir
# listesi artik elle yazilmiyor.
_aura_satirlar = []
for _t in AURA_URETILEN:
    if AURA_TUR_SATIR[_t] not in _aura_satirlar:
        _aura_satirlar.append(AURA_TUR_SATIR[_t])
AURA_SATIR = dict((_ad, _i) for _i, _ad in enumerate(_aura_satirlar))
AURA_DOKU_BOY = AURA_HUCRE * len(AURA_SATIR)

# ---- HANGI SATIR DONGULU, KAC KARE/SN (v7.18) ----
#
# Bu ayrim bu surumun cekirdegi. Iki ayri oynatma bicimi var:
#
#  stretch_to_lifetime  Animasyon zerrenin OMRUNE yayiliyor ve
#                       BIR KEZ oynuyor. Kareler bir SUREC
#                       anlatmali (taze -> sonuk). Kivilcim ve
#                       hale boyle: kivilcim uzayip kopuyor,
#                       hale acilip dagiliyor.
#
#  loop + fps           Animasyon zerrenin omrunden BAGIMSIZ,
#                       saniyede N kare, ve basa SARIYOR. Kareler
#                       bir DONGU olmali; "sonuk" bir kare
#                       olamaz, cunku ondan sonra yine 0. kare
#                       geliyor ve alev birden dirilmis gorunur.
#                       Alev ve kor boyle.
#
# v7.17'de dordu de stretch'ti: yani her alev dili omru boyunca
# BIR KEZ kisaliyordu. Kullanicinin gordugu "canli degil" tam
# buydu. Sonme isi artik yalniz iki yerde: renk gradyani ve boy
# egrisi. Sekil ise DURMADAN kirpisiyor.
#
# Hiz neden farkli: goz alevi kucuk ve yakin, hizli kirpismasi
# gerekiyor (32/8 = saniyede 4 tur). Kafa aurasi buyuk ve uzak,
# ayni hizda kirpisirsa titrek bir gurultu gibi duruyor
# (20/8 = saniyede 2.5 tur).
AURA_DONGU = {"alev": 32, "kor": 20}


def _aura_zar(x, y, tuz):
    """Sprite'lar icin sabit sozde-rastgele. Lineer ifade
    KAFES uretiyor (bkz. _agac_zar notu -- ayni ders)."""
    h = (x * 374761393 + y * 668265263 + tuz * 2246822519) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return (h ^ (h >> 16)) & 0xFF


def _alev_dili(p, hx, hy, kare, uc_ust, karin_en, egim, tuz,
               parlak=1.0, kare_sayi=None, dongu=True, uc_keskin=1.25):
    """ALEV DILI. Bir hucreye tek bir alev dili cizer.

    ---- NEDEN YUVARLAK DEGIL (v7.17) ----
    Kullanicinin oyundaki sozu: "etrafinda boyle kucuk
    baloncuklar olusuyor... alev gibi degil". v7.15'te kor
    sprite'i MERKEZDEN UZAKLIGA gore ciziliyordu (d = sqrt(...)),
    yani tanim geregi bir DAIRE. Daire ne kadar yumusatilirsa
    yumusatilsin baloncuktur; alevi alev yapan sey yuvarlaklik
    degil, ASIMETRI:
      - ucu yukarida ve SIVRI, karni asagida ve GENIS
      - kenari duz degil TITREK
      - uc bir yana YATIK, ve o yatiklik karelerde degisiyor
    Ucu de sondurmek gerekiyor: alevin ucu saydamdir, orasi
    doldurulursa sivrilik kayboluyor ve sekil damlaya donuyor.

    ---- NEDEN DONGU, NEDEN OLUM EGRISI DEGIL (v7.18) ----
    Kullanici: "alev canli olsun -- bir buyusun bir kuculsun".
    v7.17'de kareler bir OLUM egrisiydi: kare 0 taze, kare 3
    sonmus, ve stretch_to_lifetime ile bu dortlu zerrenin
    omrune yayiliyordu. Yani her alev dili omru boyunca BIR KEZ
    kisaliyordu -- kirpismiyordu.

    Simdi kareler bir DONGU. Boy ve karin, kare sayisina TAM
    oturan bir sinus ile gidip geliyor:
        aci = 2*pi*kare / kare_sayi
    Bu sart: son kare ilk kareye PURUZSUZ baglanmali, yoksa
    flipbook basa sardiginda alev bir zipliyor. Sinus periyodik
    oldugu icin bu kendiliginden saglaniyor.

    Sonme isi artik buradan CIKTI; iki yere devredildi:
      - renk gradyani (sicak beyaz -> renk -> sonme)
      - billboard boy egrisi (buyuyup kuculme)
    Boylece alev sonerken bile KIRPISMAYA devam ediyor.
    """
    if kare_sayi is None:
        kare_sayi = AURA_KARE
    O = AURA_HUCRE
    m = (O - 1) / 2.0
    aci = 2 * math.pi * kare / float(kare_sayi)

    if dongu:
        # Boy ve karin GIDIP GELIYOR, sonmuyor. Ikisi ayri
        # fazda: alev uzarken incelip kisalirken sismali,
        # yoksa butun sekil nefes alan bir balon gibi duruyor.
        yt = O * (uc_ust + 0.075 * (1 + math.sin(aci + tuz * 0.21)))
        R = O * karin_en * (1.0 + 0.12 * math.sin(aci + 1.9))
        solma = 1.0
    else:
        o = kare / float(kare_sayi - 1)   # 0 taze .. 1 sonuyor
        yt = O * (uc_ust + 0.34 * o)
        R = O * karin_en * (1.0 - 0.36 * o)
        solma = 1.0 - 0.48 * o
    # Karnin yeri. Sinir SART: karin cemberinin ALTI hucrenin
    # disina tasarsa taban duz kesiliyor ve alev bir elmasa
    # donuyor -- v7.19'da karin %52 genisleyince tam bu oldu.
    yc = min(O * 0.72, O - R - 1.0)
    if yc - yt < 2.0 or R < 1.0:
        return
    # Ucun hangi yana yattigi: kareden kareye degisiyor, yani
    # tek bir zerre bile omru boyunca SALINIYOR.
    yon = math.sin(aci + tuz * 0.37)
    # Ikinci, daha DAR bir yatiklik: yalniz en uc kisma etki
    # ediyor ve ters yone gidebiliyor. Tek yatiklikla dilin
    # bir kenari DUZ bir diyagonal cikiyordu -- kagit kulahi
    # gibi. Iki yatiklik ust uste gelince uc KIVRILIYOR.
    # Iki kat frekans: yine periyodik, yani dongu bozulmuyor.
    kivrim = math.sin(2 * aci + tuz * 0.91 + 1.3)

    for y in range(O):
        if y < yt:
            continue
        if y >= yc:
            k = (y - yc) / R
            if k > 1.0:
                break
            w = R * (1.0 - k * k) ** 0.5     # yuvarlak taban
        else:
            u = (y - yt) / (yc - yt)
            w = R * u ** uc_keskin           # SIVRI uc
        # Kenar titremesi SATIR SATIR, piksel piksel degil:
        # piksel bazinda yapilsaydi kenar kirik/gurultulu
        # cikardi, satir bazinda TITREK cikiyor.
        # Gurultu INCE satirlarda kisiliyor: 1 piksel genisligindeki
        # bir satira %20 gurultu vurunca satir tamamen kayboluyor
        # ve ucta birbirine degmeyen tek pikseller kaliyor.
        w *= 1.0 + 0.20 * min(1.0, w / 2.5) * \
            (_aura_zar(y, kare, tuz) / 255.0 - 0.5)
        if w < 0.34:
            continue
        # Yatiklik yalniz UCTA: taban yerinde duruyor.
        yatik = max(0.0, (yc - y) / max(1.0, yc - yt))
        cx = (m
              + egim * O * (yatik ** 1.8) * yon
              + egim * O * 0.32 * (yatik ** 3.4) * kivrim)
        # Orta cizginin kendisi de titriyor -- ve yalniz ust
        # tarafta. Genislik gurultusu iki kenari BIRLIKTE
        # oynatiyor (dil sismanlayip zayifliyor); bu ise
        # kenarlari AYRI oynatiyor, alevin savrulmasi bu.
        # Titremenin en YUKSEK oldugu yer ucun biraz ALTI, ucun
        # kendisi degil: (1 - yatik) carpani ucta sifira
        # gidiyor. Aksi halde en dar satirlar en cok kayiyor ve
        # ucta birbirine degmeyen tek pikseller kaliyor -- v7.19
        # oncesi tam bunu yapiyordu, oyunda alevin tepesinde
        # kopuk bir nokta gorunuyordu.
        sallanma = (_aura_zar(y, kare + 8, tuz + 3) / 255.0 - 0.5) * \
            O * 0.10 * yatik * (1.0 - yatik * 0.75)
        # SINIR: kayma satirin kendi yarim genisligini gecerse
        # ust uste gelen iki satir birbirinden KOPUYOR ve uc
        # birbirine degmeyen tek piksellere donusuyor (ilk
        # cizimde tam bu oldu -- merdiven gibi noktalar).
        sallanma = max(-w * 0.6, min(w * 0.6, sallanma))
        cx += sallanma

        for x in range(max(0, int(cx - w)), min(O, int(cx + w) + 2)):
            q = abs(x - cx) / w
            if q > 1.0:
                continue
            # Cekirdek DAR, sonme GENIS. Genis bir cekirdek
            # (v7.17'nin ilk cizimi 0.42 idi) beyaz bir leke
            # gibi duruyordu; alevin parlak yeri incedir.
            if q <= 0.30:                    # sicak cekirdek
                a, g = 255.0, 255
            else:
                t = (q - 0.30) / 0.70
                a = 255.0 * (1.0 - t) ** 1.05
                g = int(255 - 96 * t)
            # Uca dogru sonme -- alevin ucu saydamdir.
            a *= min(1.0, 0.28 + (y - yt) / max(1.0, O * 0.22))
            a = int(a * solma * parlak)
            if a <= 0:
                continue
            p[(hx + x, hy + y)] = (g, g, g, min(255, a))


def _aura_sprite(p, hx, hy, tur, kare):
    """Tek bir 32x32 hucreyi cizer. GRI TONLU: renk oyunda
    tinting ile geliyor, doku yalniz SEKLI ve YUMUSAKLIGI
    tasiyor.  kare 0..3 -- omur boyunca oynayan animasyon."""
    O = AURA_HUCRE
    m = (O - 1) / 2.0
    o = kare / float(AURA_KARE - 1)     # 0 taze, 1 sonmus
    aci = 2 * math.pi * kare / float(AURA_KARE)

    if tur == "kor":
        # Auranin ana parcasi: kafadan yukselen alev dilleri.
        # v7.15'te daireydi -> baloncuk gorunuyordu.
        _alev_dili(p, hx, hy, kare, uc_ust=0.10, karin_en=0.28,
                   egim=0.16, tuz=7)

    elif tur == "alev":
        # GOZ ALEVI.
        #
        # v7.19'da SISMANLADI. v7.18'de karin_en 0.21 ve uc
        # keskinligi 1.25 idi; oyunda gozdeki alevler ince
        # dikey CIZGILER gibi cikti -- kullanicinin ekran
        # goruntusunde ot gibi duruyorlardi. Sebep olcek:
        # ekranda alev 5-6 piksel yuksekliginde ciziliyor ve o
        # boyutta dar bir ucgen "alev" degil "cizgi" okunuyor.
        #
        # Karin %52 genisledi, uc keskinligi 1.05'e indi (yani
        # dil taa tepeye kadar etli kaliyor). Kucuk olcekte
        # okunan sey ucun inceligi degil GOVDENIN genisligi.
        _alev_dili(p, hx, hy, kare, uc_ust=0.07, karin_en=0.32,
                   egim=0.15, tuz=53, parlak=1.0, uc_keskin=1.05)

    elif tur == "hale":
        # Puslu bir TUTAM -- kure degil. Kure de baloncuk
        # gorunuyordu; bu yukari dogru inceliyor ve kenari
        # duzensiz.
        yari_x = O * (0.19 + 0.03 * math.sin(aci))
        yari_y = yari_x * 1.75
        cy = m + O * 0.06
        for y in range(O):
            for x in range(O):
                # Yukari dogru daralma: ust yariya dogru x
                # olcegi buyuyor, yani sekil inceliyor.
                daral = 1.0 + max(0.0, (cy - y) / yari_y) * 1.10
                dx = (x - m) * daral / yari_x
                dy = (y - cy) / yari_y
                d = (dx * dx + dy * dy) ** 0.5
                if d > 1.0:
                    continue
                gurultu = (_aura_zar(x // 2, y // 2, 91 + kare) / 255.0
                           - 0.5) * 0.16
                a = int(175 * max(0.0, 1.0 - d - gurultu) ** 2.0)
                if a <= 0:
                    continue
                p[(hx + x, hy + y)] = (255, 255, 255, a)

    else:  # kivilcim
        # Dikey cizgi. Karelerde UZUYOR, sonra ortasindan
        # kopuyor -- ates kivilcimi boyle davraniyor.
        uzun = O * (0.18 + 0.24 * o)
        kalin = max(0.6, O * (0.055 - 0.028 * o))
        kopuk = o > 0.62
        for y in range(O):
            for x in range(O):
                dy, dx = abs(y - m), abs(x - m)
                if dy > uzun or dx > kalin:
                    continue
                if kopuk and dy < uzun * 0.30:
                    continue                       # ortasi koptu
                a = int(255 * (1 - dy / max(0.001, uzun)) ** 1.3
                        * (1 - dx / max(0.001, kalin)) ** 0.8)
                if a <= 0:
                    continue
                p[(hx + x, hy + y)] = (255, 255, 255, a)


def aura_dokusu():
    """256x128, 4 satir x 8 kare. Gri tonlu -- renk tinting'den."""
    p = {}
    for tur, satir in AURA_SATIR.items():
        for kare in range(AURA_KARE):
            _aura_sprite(p, kare * AURA_HUCRE, satir * AURA_HUCRE, tur, kare)
    return p


def _aura_renk(renk, alfa):
    return [round(renk[0] / 255.0, 4), round(renk[1] / 255.0, 4),
            round(renk[2] / 255.0, 4), round(alfa, 4)]


def _aura_gradyan(renkler, koyulma=0.32, beyazlik=0.75):
    """Omur boyunca renk. Sicak beyaz -> iksir rengi -> (varsa
    ikinci renk) -> sonme. Zerre dogdugu anda en sicak, sonra
    rengini aliyor, sonra sonuyor. Alev boyle davranir.

    koyulma: olurken rengin ne kadar KARARDIGI. Kafa aurasinda
    0.32 (kul gibi kararip sonuyor). Goz alevinde 0.85 -- o
    zerreler kucuk ve kisa omurlu, kararirlarsa gozun oldugu
    yerde bir an kirli bir leke birakiyorlar; onlar RENGINI
    KORUYARAK saydamlasiyor."""
    ilk = tuple(renkler[0])
    # beyazlik: dogum aninda renge ne kadar beyaz katiliyor.
    # 0.75 patlama icin dogru (bir an icin gozu alan bir
    # parlama) ama goz alevinde YANLIS: alev surekli yandigi
    # icin o beyaz hep ekranda kaliyor ve iksirin rengi
    # kayboluyor -- oyunda yesil iksirde alevler BEYAZ cikti.
    beyaz = tuple(min(255, int(c + (255 - c) * beyazlik)) for c in ilk)
    g = {"0.0": _aura_renk(beyaz, 1.0), "0.18": _aura_renk(ilk, 1.0)}
    if len(renkler) > 1 and tuple(renkler[1]) != ilk:
        g["0.55"] = _aura_renk(tuple(renkler[1]), 0.92)
        koyu = tuple(int(c * koyulma) for c in renkler[1])
    else:
        g["0.55"] = _aura_renk(ilk, 0.92)
        koyu = tuple(int(c * koyulma) for c in ilk)
    g["0.82"] = _aura_renk(koyu, 0.5)
    g["1.0"] = _aura_renk(koyu, 0.0)
    return g


def _aura_uv(tur):
    """Her zerre kendi karelerini oynatiyor. IKI AYRI BICIM var
    ve hangisinin secildigi AURA_DONGU'ye bagli (oradaki uzun
    notu oku -- bu surumun cekirdegi orasi).

    DONGULU (alev, kor): saniyede N kare, basa sararak. Zerre
    yasadigi surece kirpisiyor.

    SURECLI (hale, kivilcim): animasyon zerrenin OMRUNE
    yayiliyor ve bir kez oynuyor -- kareler bir sureci
    anlatiyor, dongu degil."""
    fb = {
        "base_UV": [0, AURA_SATIR[tur] * AURA_HUCRE],
        "size_UV": [AURA_HUCRE, AURA_HUCRE],
        "step_UV": [AURA_HUCRE, 0],
        "max_frame": AURA_KARE,
    }
    if tur in AURA_DONGU:
        fb["frames_per_second"] = AURA_DONGU[tur]
        fb["loop"] = True
        # stretch_to_lifetime fps'i EZIYOR (belge: "overrides the
        # base frames_per_second"). Acik birakilirsa dongu
        # ayarinin hicbir etkisi olmaz -- sessizce.
        fb["stretch_to_lifetime"] = False
    else:
        fb["frames_per_second"] = 8
        fb["stretch_to_lifetime"] = True
        fb["loop"] = False
    return {
        "texturewidth": AURA_DOKU_EN,
        "textureheight": AURA_DOKU_BOY,
        "flipbook": fb,
    }


def _aura_govde(kimlik, tur, bilesenler):
    return {
        "format_version": "1.10.0",
        "particle_effect": {
            "description": {
                "identifier": "pa:aura_%s_%s" % (tur, kimlik),
                "basic_render_parameters": {
                    # particles_add = TOPLAMALI harman: zerreler
                    # ust uste gelince parliyor ve dunya
                    # isigindan bagimsiz cikiyor.
                    "material": "particles_add",
                    "texture": "textures/particle/" + AURA_DOKU,
                },
            },
            "components": bilesenler,
        },
    }


_AURA_OMUR = "variable.particle_age / variable.particle_lifetime"


def _aura_nefes(hiz, tuz):
    """YUKSEK FREKANSLI boy titremesi (v7.18).

    Boy egrisindeki math.sin(omur * 180) zerrenin omru boyunca
    BIR KEZ tepe yapiyor -- yavas bir zarf. Alevin canli
    gorunmesi icin bunun UZERINE hizli bir titreme gerekiyor.

    Faz her zerrede farkli (particle_random_2 * 360): yoksa
    butun alevler AYNI ANDA buyuyup kuculur ve tek bir nabiz
    gibi durur. Ayri fazda olunca kumesin icinde surekli
    birileri buyuyup birileri kuculuyor -- yanan bir sey boyle
    gorunuyor.

    hiz: derece/saniye. 1150 ~ saniyede 3.2 kez."""
    return ("(1 + %.2f * math.sin(variable.particle_age * %d"
            " + variable.particle_random_%d * 360))" % (0.14, hiz, tuz))


# Her YAYIMIN kendi olcegi. emitter_random_1 bir yayimdaki
# butun zerrelerde AYNI: yani bir "puf" toptan buyuk, sonraki
# toptan kucuk cikiyor. Alev boyle KABARIP SONUYOR; zerre
# bazinda rastgelelik bunu vermiyor, cunku ortalamasi hep ayni.
_AURA_PUF = "(0.85 + variable.emitter_random_1 * 0.3)"


def _aura_suruklen(surtunme, yukari):
    """Zerre OYUNCUYLA BIRLIKTE gitsin diye ivme.

    ---- SORUN ----
    spawnParticle zerreyi dunyaya birakiyor; zerre oyuncunun
    hizini MIRAS ALMIYOR. Kosarken her yeni alev bir onceki
    yerine degil daha ileriye doguyor, eskiler geride
    kaliyordu: yani alev yuzde degil ARKADA bir kuyruk gibi
    duruyordu.

    ---- COZUM ----
    particle_motion_dynamic'in denklemi:  dv/dt = a - d*v
    Denge hizi  v = a/d.  Yani ivmeyi  a = d * v_oyuncu  yazarsak
    zerrenin hizi oyuncunun hizina YAKINSIYOR. Yakinsama suresi
    1/d (goz alevinde 1/3.4 = 0.29 sn) -- yani alev once biraz
    geri kaliyor, sonra yetisiyor. Gercek atesin yaptigi da tam
    bu.

    variable.hiz script tarafindan MolangVariableMap ile
    veriliyor. Verilmezse Molang tanimsiz degiskeni 0 sayar ve
    davranis v7.17'deki gibi olur -- yani bu ekleme hicbir
    kosulda zerreleri kaybettirmiyor.

    getVelocity BLOK/TICK veriyor, parcacik hizlari BLOK/SANIYE:
    aradaki 20 kati burada carpiliyor.

    ---- DENENMEYEN YOL ----
    particle_initial_speed'in VEKTOR bicimi de var ama belge
    "emitter sekli ile nasil birlestigini" soylemiyor. Bilmedigim
    bir sema yazip zerreleri tamamen kaybetmektense, tipini
    zaten kullandigim ve calistigini gordugum alani kullandim."""
    kat = 20.0 * surtunme
    return ["variable.hiz.x * %.1f" % kat,
            "variable.hiz.y * %.1f + %s" % (kat, yukari),
            "variable.hiz.z * %.1f" % kat]


def aura_kor(kimlik, renkler):
    """KOR -- kafadan yukselen, yukselirken YAVASLAYAN zerreler.
    Auranin ana parcasi; uzaktan gorunen sey bu."""
    return _aura_govde(kimlik, "kor", {
        "minecraft:emitter_rate_instant": {"num_particles": 7},
        "minecraft:emitter_lifetime_once": {"active_time": 0.25},
        "minecraft:emitter_shape_sphere": {
            # 0.30'du: zerreler kafanin YANINDAN da cikiyordu
            # ve onizlemede aura kafayi degil etrafindaki havayi
            # doldurmus gibi duruyordu.
            "offset": [0, 0, 0], "radius": 0.22,
            "surface_only": False, "direction": "outwards"},
        "minecraft:particle_initial_speed":
            "0.25 + variable.particle_random_1 * 0.45",
        # v7.17: TAKLA YOK. Eskiden rotation 0-360 ve saniyede
        # 260 derece donus vardi; donen bir sekil ne olursa
        # olsun yuvarlak okunuyor -- kullanicinin gordugu
        # "baloncuk" buydu. Alev dilinin YUKARI bakmasi sart,
        # o yuzden yalniz hafif bir yalpa kaldi.
        # Yalpa KUCUK. Ilk denemede +-13 derece baslangic ve
        # saniyede +-17 derece donus vardi; 1.75 saniyelik bir
        # zerre 43 dereceye kadar yatiyordu ve onizlemede
        # alevler yagmur gibi EGIK CIZGILER halinde cikti.
        # Ates yatmaz, salinir.
        "minecraft:particle_initial_spin": {
            "rotation": "(variable.particle_random_2 - 0.5) * 16",
            "rotation_rate": "(variable.particle_random_3 - 0.5) * 14"},
        "minecraft:particle_lifetime_expression": {
            "max_lifetime": "0.85 + variable.particle_random_4 * 0.9"},
        "minecraft:particle_motion_dynamic": {
            # Yukari kaldirma + yuksek surtunme: zerre firlayip
            # yavasliyor, sonra suzuluyor. v7.18: ustune
            # oyuncunun hizi (bkz. _aura_suruklen).
            "linear_acceleration": _aura_suruklen(2.2, "1.55"),
            "linear_drag_coefficient": 2.2,
            "rotation_drag_coefficient": 0.9},
        "minecraft:particle_appearance_billboard": {
            # v7.17 -- iki degisiklik, ikisi de kullanicinin
            # "kucuk baloncuklar" sikayetinden:
            #  1. BOYUT. Eskisi 0.035-0.08 BLOK genislikti; bir
            #     blok 16 MC pikseli, yani zerreler 0.6-1.3
            #     piksel genisligindeydi. Kafa 0.5 blok. Simdi
            #     0.11-0.18 -- hala kafanin ucte birinden kucuk.
            #  2. KARE DEGIL DIKDORTGEN. Alev dili enine degil
            #     boyuna uzar; yukseklik genisligin ~1.9 kati.
            #     Kare bir tuvale cizilen alev, dili
            #     kisaltmadan sigmaz.
            #  ORAN. Dis olcu 1.9 kat uzundu ama dokudaki dil
            #  zaten hucrenin ~%56 eninde ve ~%90 boyunda; ikisi
            #  carpilinca gorunen alev 3 kat uzun cikiyordu --
            #  alev degil KIVILCIM IZI. Dis oran 1.38'e indi,
            #  gorunen oran ~2.2 oldu.
            "size": [
                "(0.13 + variable.particle_random_1 * 0.08) * (1 - " + _AURA_OMUR + " * 0.62) * " + _aura_nefes(760, 2),
                "(0.18 + variable.particle_random_1 * 0.11) * (1 - " + _AURA_OMUR + " * 0.62) * " + _aura_nefes(760, 2)],
            # lookat_y: kameraya bakiyor ama YALNIZ Y ekseninde
            # doniyor -- yani yukarisi her zaman yukarisi.
            # lookat_xyz olsaydi yukaridan bakildiginda alev
            # yan yatardi.
            "face_camera_mode": "lookat_y",
            "uv": _aura_uv("kor")},
        "minecraft:particle_appearance_tinting": {
            "color": {"gradient": _aura_gradyan(renkler),
                      "interpolant": _AURA_OMUR}},
    })


def aura_hale(kimlik, renkler):
    """HALE -- kafanin etrafinda yavas suzulen puslu zerreler.
    "Bu adamin etrafinda bir sey var" hissini veren katman."""
    return _aura_govde(kimlik, "hale", {
        "minecraft:emitter_rate_instant": {"num_particles": 4},
        "minecraft:emitter_lifetime_once": {"active_time": 0.25},
        "minecraft:emitter_shape_sphere": {
            "offset": [0, 0, 0], "radius": 0.55,
            # Yalniz YUZEYDEN: kafanin etrafinda bir kabuk gibi
            # dursun, icini doldurmasin.
            "surface_only": True, "direction": "outwards"},
        "minecraft:particle_initial_speed":
            "0.04 + variable.particle_random_1 * 0.10",
        "minecraft:particle_lifetime_expression": {
            "max_lifetime": "1.6 + variable.particle_random_2 * 1.2"},
        "minecraft:particle_motion_dynamic": {
            "linear_acceleration": [0, 0.32, 0],
            "linear_drag_coefficient": 1.1},
        "minecraft:particle_appearance_billboard": {
            # v7.17: kor ile ayni iki duzeltme -- buyudu ve
            # boyuna uzadi. Hale bir TUTAM, top degil.
            "size": [
                "(0.13 + variable.particle_random_3 * 0.07) * (1 - " + _AURA_OMUR + " * 0.55)",
                "(0.20 + variable.particle_random_3 * 0.11) * (1 - " + _AURA_OMUR + " * 0.55)"],
            "face_camera_mode": "lookat_y",
            "uv": _aura_uv("hale")},
        "minecraft:particle_appearance_tinting": {
            "color": {"gradient": _aura_gradyan(renkler),
                      "interpolant": _AURA_OMUR}},
    })


def aura_patlama(kimlik, renkler):
    """PATLAMA -- iksir ICILDIGI an bir kez. Kivilcimlar disari
    firliyor, yercekimiyle dusuyor, yere carpinca sonuyor."""
    return _aura_govde(kimlik, "patlama", {
        "minecraft:emitter_rate_instant": {"num_particles": 46},
        "minecraft:emitter_lifetime_once": {"active_time": 0.4},
        "minecraft:emitter_shape_sphere": {
            "offset": [0, 0, 0], "radius": 0.12,
            "surface_only": False, "direction": "outwards"},
        "minecraft:particle_initial_speed":
            "1.7 + variable.particle_random_1 * 2.3",
        "minecraft:particle_initial_spin": {
            "rotation": "variable.particle_random_2 * 360",
            "rotation_rate": "(variable.particle_random_3 - 0.5) * 420"},
        "minecraft:particle_lifetime_expression": {
            "max_lifetime": "0.45 + variable.particle_random_4 * 0.55"},
        "minecraft:particle_motion_dynamic": {
            # Yercekimi: kivilcimlar yukselip DUSUYOR.
            "linear_acceleration": [0, -3.4, 0],
            "linear_drag_coefficient": 0.9},
        # Yere carpinca sonsun -- havada asili kalmasin.
        "minecraft:particle_motion_collision": {
            "enabled": True, "collision_radius": 0.02,
            "expire_on_contact": True},
        "minecraft:particle_appearance_billboard": {
            "size": [
                "0.02 + variable.particle_random_1 * 0.02",
                "(0.07 + variable.particle_random_1 * 0.09) * (1 - " + _AURA_OMUR + " * 0.6)"],
            # Kivilcim GITTIGI YONE bakiyor: cizgi halinde
            # uzuyor, disk gibi durmuyor.
            "face_camera_mode": "direction_y",
            "direction": {"mode": "derive_from_velocity",
                          "min_speed_threshold": 0.02},
            "uv": _aura_uv("kivilcim")},
        "minecraft:particle_appearance_tinting": {
            "color": {"gradient": _aura_gradyan(renkler),
                      "interpolant": _AURA_OMUR}},
    })


def aura_gozalev(kimlik, renkler):
    """GOZ ALEVI -- gozun TAM ONUNDE yanan kucuk diller. v7.17

    ---- NEDEN BU VAR ----
    Kullanicinin sozu: "gozun ustundeki o ates vari seyler var
    ya... alev de bir buyuyor bir kuculuyor, biraz animasyonu
    var ya, onun gibi bir animasyona sahip olsun".

    Goz KAPLAMASI (832x832 doku) o alevleri cizebiliyor ama
    KIMILDATAMIYOR. Iki mekanizma denendi ve ikisi de bu
    depoda OLCULEREK elendi:
      v5.3  attachable animasyonu          -> calismiyor
      v7.16 render denetleyici + doku dizisi -> calismiyor
    Ucuncusu -- parcacik -- kullanicinin OYUNDA gordugu tek
    calisan yol ("etrafinda kucuk baloncuklar olusuyor").
    O yuzden hareket dokudan degil, parcaciktan geliyor.

    ---- BUYUYUP KUCULME NEREDEN ----
    Iki kaynaktan, ust uste:
      1. Boy egrisi math.sin(t*180): zerre yoktan doguyor,
         omrunun ORTASINDA en buyuk, sonra yoktan kayboluyor.
         Molang'in math.sin'i DERECE aliyor, radyan degil.
      2. Doku 4 karesi (satir "alev"): dil kisaliyor ve ucu
         her karede baska yana yatiyor.
    Tek basina 1. olsaydi buyuyup kuculen bir LEKE olurdu;
    tek basina 2. olsaydi boyu sabit titreyen bir dil. Ikisi
    birlikte alev oluyor.

    ---- NEDEN BU KADAR KUCUK ----
    Goz skinde 2 MC pikseli, yani 0.125 blok. Alevin dis
    olcusu 0.07-0.11 blok genisligi; dokudaki dil bunun ~%42'si
    kadar oldugundan gorunen dil ~0.03-0.046 blok. Daha
    buyugu yuzu kapatiyor -- bu bir aura degil, GOZUN kendisi.

    ---- YERCEKIMI DEGIL, SURTUNME ----
    linear_drag 3.4 cok yuksek: zerre firliyor ve neredeyse
    aninda duruyor. Boylece alev gozden KOPUP gitmiyor,
    gozun onunde asili kaliyor. Kafa aurasinda (kor) surtunme
    2.2, cunku orada zerrelerin yukselmesi isteniyor.
    """
    # Uc egri UST USTE (v7.18):
    #   zarf   omur boyunca bir kez: yoktan dogup yoga gitme
    #   nefes  saniyede ~3.2 kez: alevin kendi kirpismasi
    #   puf    her yayimda bir kez: alevin kabarip sonmesi
    # Ucu de kullanicinin "bir buyusun bir kuculsun"unun ayri
    # bir olcegi. Yalniz zarf olsaydi alev bir kez sisip inen
    # bir balon olurdu.
    # Zarf artik SIFIRA INMIYOR (0.55..1.0). v7.19'da 0.25..1.0
    # idi ve zerre doguuunda/olumunde neredeyse yok oluyordu.
    # Tek bir alev istendiginde bu POPLAMA yapiyor: alev bir
    # kayboluyor bir beliriyor. 0.55 tabani, biten alevle yeni
    # alevin uSt uSte bindigi anda ikisinin de yariya yakin
    # buyuklukte olmasini sagliyor -- yani gecis GORUNMUYOR.
    ol = ("(0.55 + 0.45 * math.sin(" + _AURA_OMUR + " * 180)) * "
          + _aura_nefes(1150, 2) + " * " + _AURA_PUF)
    return _aura_govde(kimlik, "gozalev", {
        # v7.19: yayim basina IKI degil BIR zerre. Ikiser
        # zerre x 4 tick'te bir x 0.45 sn omur = goz basina
        # ayni anda ~5 dil; oyunda ust uste binip bir TARAK
        # gibi gorunuyorlardi. Simdi ~2.5 dil: mum alevi gibi
        # tek bir sey, sayica degil boyca var.
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        "minecraft:emitter_lifetime_once": {"active_time": 0.15},
        "minecraft:emitter_shape_sphere": {
            "offset": [0, 0, 0], "radius": 0.03,
            "surface_only": False, "direction": "outwards"},
        "minecraft:particle_initial_speed":
            "0.05 + variable.particle_random_1 * 0.11",
        "minecraft:particle_initial_spin": {
            # Yalpa kucuk: alev dilinin yukari bakmasi sart.
            "rotation": "(variable.particle_random_2 - 0.5) * 20",
            "rotation_rate": "(variable.particle_random_3 - 0.5) * 40"},
        "minecraft:particle_lifetime_expression": {
            # Kisa: gozun onunde birikmesinler.
            # Omur, yayim araligindan (GOZ_ALEV_ARALIK tick)
            # BIRAZ UZUN. Amac: her an yaklasik BIR alev olsun,
            # ama gecis aninda kisa bir ust uste binme olsun ki
            # aradan bosluk gorunmesin. Kullanicinin istegi:
            # "bir tanelik, cok fazla yok".
            "max_lifetime": "0.34 + variable.particle_random_4 * 0.10"},
        "minecraft:particle_motion_dynamic": {
            "linear_acceleration": _aura_suruklen(3.4, "1.05"),
            "linear_drag_coefficient": 3.4,
            "rotation_drag_coefficient": 1.2},
        # Duvara burnunu dayayinca alev duvarin ICINDE yanmasin.
        # collision_radius kucuk: alevin GORUNEN dili zaten
        # zerrenin yarisi kadar.
        "minecraft:particle_motion_collision": {
            "enabled": True, "collision_radius": 0.02,
            "expire_on_contact": True},
        "minecraft:particle_appearance_billboard": {
            # Onizlemede ilk olcu (0.07-0.11 x 0.13-0.21) yuzu
            # KAPATTI: alevin boyu kafanin yarisi kadar cikti ve
            # iki goz iki mese sopasi gibi yandi. Goz 2 MC
            # pikseli = 0.125 blok; alevin gorunen dili disin
            # ~%42'si kadar, yani asagidaki olculerde gorunen
            # dil ~0.02x0.09 blok -- gozun uzerinde duruyor,
            # yerine gecmiyor.
            # ---- OLCEK: EN ONEMLI SAYI (v7.20) ----
            # Kullanici oyunda gorup soyle tarif etti: "yuzun
            # biraz onunde IIIIII gibi IIIIII" -- yani dikey
            # cizgiler. Sebep olcekti, sekil degil.
            #
            # v7.19'da dis olcu 0.088-0.134 blok yuksekligindeydi.
            # Bir blok 16 MC pikseli; dokudaki dil de tuvalin
            # ~%56'si kadar. Yani ekranda gorunen alev
            #     0.13 blok x 16 = 2 piksel
            # geniskliginde bir seydi. 2 piksellik bir sey alev
            # degil CIZGI okunuyor -- kullanicinin gordugu "I"
            # tam olarak buydu.
            #
            # Kafa 0.5 blok (8 MC pikseli). Alev artik 0.28
            # blok, yani kafanin yarisindan biraz fazla --
            # gonderdigim render'daki oranin ta kendisi.
            # Gorunen dil ~0.16 x 0.25 blok = 2.5 x 4 piksel.
            "size": [
                "(0.185 + variable.particle_random_1 * 0.055) * " + ol,
                "(0.255 + variable.particle_random_1 * 0.075) * " + ol],
            "face_camera_mode": "lookat_y",
            "uv": _aura_uv("alev")},
        "minecraft:particle_appearance_tinting": {
            # koyulma 0.85: rengini koruyarak saydamlasiyor.
            # beyazlik: alev iksirin RENGINDE yansin ama
            # cekirdegi sicak olsun. v7.19'da bes alev ust uste
            # biniyordu ve 0.75 beyaza doyuruyordu; simdi TEK
            # alev var, doyma yok, o yuzden 0.42'ye cikti --
            # gercek atesin ortasi da beyaza calar.
            "color": {"gradient": _aura_gradyan(renkler, koyulma=0.85,
                                                beyazlik=0.42),
                      "interpolant": _AURA_OMUR}},
    })


def aura_gozkor(kimlik, renkler):
    """GOZDEN DUSEN KOZ -- seyrek, tek tek, asagi. v7.18

    ---- NEDEN ----
    Alev yukari gider; yanan bir sey ayrica ASAGI da birakir.
    Gozden ara sira kopan bir koz iki sey yapiyor:
      1. Yukari akisi kiriyor. Her sey ayni yone giderse goz
         bir cesme gibi duruyor, ates gibi degil.
      2. Yuze DIKEY bir cizgi ekliyor. Uzaktan alevlerin
         hepsi tek bir lekeye donusuyor (v7.15'in dersi);
         asagi dusen bir iz o lekeden AYRI okunuyor.

    Seyrek olmasi sart -- surekli aksaydi gozyasi gibi olurdu.
    ayarlar.js'te GOZ_KOR_ARALIK bunu tutuyor.

    Kivilcim satirini kullaniyor (patlamayla ayni sprite): koz
    dikey bir cizgi, kendi dokusuna gerek yok. direction_y +
    derive_from_velocity ile GITTIGI YONE bakiyor, yani
    duserken uzuyor."""
    return _aura_govde(kimlik, "gozkor", {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_sphere": {
            "offset": [0, 0, 0], "radius": 0.02,
            "surface_only": False, "direction": "outwards"},
        "minecraft:particle_initial_speed":
            "0.02 + variable.particle_random_1 * 0.06",
        "minecraft:particle_lifetime_expression": {
            "max_lifetime": "0.55 + variable.particle_random_2 * 0.5"},
        "minecraft:particle_motion_dynamic": {
            # Yercekimi ama ZAYIF: gercek yercekimi (-3.4,
            # patlamada oyle) kozu bir kursun gibi indiriyordu.
            # Koz agir degil, SUZULEREK dusuyor.
            "linear_acceleration": _aura_suruklen(1.4, "-1.15"),
            "linear_drag_coefficient": 1.4},
        "minecraft:particle_motion_collision": {
            "enabled": True, "collision_radius": 0.015,
            "expire_on_contact": True},
        "minecraft:particle_appearance_billboard": {
            "size": [
                "0.012 + variable.particle_random_3 * 0.010",
                "(0.05 + variable.particle_random_3 * 0.05) * (1 - "
                + _AURA_OMUR + " * 0.55)"],
            "face_camera_mode": "direction_y",
            "direction": {"mode": "derive_from_velocity",
                          "min_speed_threshold": 0.01},
            "uv": _aura_uv("kivilcim")},
        "minecraft:particle_appearance_tinting": {
            "color": {"gradient": _aura_gradyan(renkler, koyulma=0.6),
                      "interpolant": _AURA_OMUR}},
    })


_AURA_HEPSI = {"kor": aura_kor, "hale": aura_hale,
               "patlama": aura_patlama, "gozalev": aura_gozalev,
               "gozkor": aura_gozkor}
# Yalniz AURA_URETILEN'dekiler. Kalanlarin kodu yukarida duruyor
# ama dosyalari yazilmiyor.
AURA_TURLERI = tuple((_t, _AURA_HEPSI[_t]) for _t in AURA_URETILEN)


# ============================================================
#  KUPALAR -- ASILI/KAZIKLI GANIMETLER              v7.25
#
#  Kullanici: "hani ölmüş Steve'ler, kafası asılmış şeyler var
#  ya -- ben skinler göndersem onları onlarla değiştirebilir
#  misin? Mesela ben Herobrine asıyorum, havalılık. Ben tek
#  başıma Null'u öldürdüm, bir nevi racon gibi."
#
#  ---- FIKIR NEREDEN, DOKU NEREDEN ----
#  Fikir Horror Element Mod 1.6.2'den (REFERANS_HORROR.md).
#  Ondan alinan tek sey OLCU ve DURUS: kazigin kalinligi,
#  kafanin kazikta ne kadar yukarida durdugu, carmihin kollari
#  ne kadar actigi. Modun KENDI DOKULARI ALINMADI -- gerek de
#  yok: kupanin dokusu kullanicinin gonderdigi SKIN.
#
#  ---- NEDEN DOKU ISLEMEYE HIC GEREK YOK ----
#  Kaynak mod her kafa icin alti ayri 16x16 yuz dokusu
#  tutuyor (face_, derriere_, droite_, gauche_, dessus_,
#  coup_). Biz o yola girmiyoruz.
#
#  Bedrock'un KUTU UV'si (box uv) bir kupun alti yuzunu tek
#  bir baslangic noktasindan kendisi diziyor. 8x8x8 bir kup
#  icin uv [0,0] ve 64x64 bir dokuda dizilim su:
#      ust [8,0] · alt [16,0] · sag [0,8] · on [8,8]
#      sol [16,8] · arka [24,8]
#  Bu, oyuncu skininin KAFA duzeninin ta kendisi. Yani skini
#  hic kesmeden, hic donusturmeden, oldugu gibi dokuya
#  koyuyoruz ve kafa dogru ciziliyor. Govde, kollar ve bacaklar
#  icin de ayni sey gecerli (asagidaki SKIN_KUTULARI).
#
#  Kaynak modun yaptigindan daha az is, daha az dosya.
#
#  ---- SEMA DOGRULANDI, TAHMIN EDILMEDI ----
#  Depoda bugune kadar OZEL GEOMETRILI blok hic yapilmadi
#  (alti blogun altisi da tam kup). O yuzden sema resmi
#  belgeden okundu:
#    - minecraft:geometry, RP'deki bir geometri kimligini
#      isaret ediyor
#    - 1.21.80'den itibaren minecraft:geometry ve
#      minecraft:material_instances IKISI BIRDEN yazilmak
#      zorunda
#    - material_instances "geometri dosyasindaki yuz ya da
#      material_instance ADLARINI" esliyor; yani kupun bir
#      yuzune "material_instance": "odun" yazip burada "odun"
#      diye bir doku tanimlayabiliyoruz
#    - blok modeli 16x16x16'yi ASABILIYOR: sinir 30x30x30 ve
#      her eksende en az 1 piksel taban kupun icinde kalmali
#  Kaynak: learn.microsoft.com minecraft creator, block
#  components (geometry + material_instances) ve
#  "Advanced Block Visuals: Sizing and Culling".
# ============================================================
KUPA_ONEK = "kupa_"
KUPA_SKIN_KLASOR = "kupa_skinleri"

# Kupanin bicimleri.
KUPA_KAZIK = "kazik"        # kafa, kazigin ucunda
KUPA_CARMIH = "carmih"      # tam govde, carmihta
KUPA_ASILI = "asili"        # tam govde, daragacinda ipte
KUPA_SIS = "sis"            # tam govde, kazik icinden gecmis
KUPA_ZINCIRLI = "zincirli"  # tam govde, bileklerinden zincirli

# (kimlik, ad, racon, bicim, skin dosyasi)
#
# YENI KUPA EKLEMEK = BU LISTEYE BIR SATIR. Geometri, blok,
# doku, dil kaydi ve yaratici menu girisi hepsi buradan
# tureniyor. Kullanici skinleri tek tek gonderdigi icin
# (arama cubugunda tek tek buluyor) bu liste bilerek boyle:
# her yeni skin tek satir.
KUPALAR = [
    ("earl", "Earl",
     "Seni bulmak kolay oldu, öldürmek de.",
     KUPA_KAZIK, "earl.png"),
    ("entity303", "Entity303",
     "Kendisini hacker sanan biri. Bana karşı hiçbir şey "
     "yapamadı. Sonu da bu.",
     KUPA_CARMIH, "entity303.png"),
    # Bicimi kullanici bana birakti. Raconu tuzak uzerine
    # kurulu oldugu icin kendi kazigina gecmis govde secildi.
    ("ferguson", "Ferguson",
     "Beni tuzağına çekti, ama bir tuzağa düşen o oldu.",
     KUPA_SIS, "ferguson.png"),
    # Bicimi kullanici bana birakti. "Saklanamadi" + kotu
    # gulus -> daragaci.
    ("wyne", "Wyne",
     "Benden saklanamadı, sonu da hiç iyi bitmedi. HAHAHAHAHA",
     KUPA_ASILI, "wyne.png"),
    # Bicimi kullanici bana birakti. Dream kacmakla taninir,
    # racon da "kacamadin" diyor -> bileklerinden zincirli.
    ("dream", "Dream",
     "Ben Türk birisi olarak, tabii ki eskilerin yeri "
     "tutulmaz — ama elimden kaçamadın.",
     KUPA_ZINCIRLI, "dream.png"),
]

# 64x64 skin duzeni: kutu UV baslangici ve kutu olcusu.
# Elle yazilan tek sayi burasi ve vanilla oyuncu modelinden
# geliyor -- degistirilecek bir sey degil, oyunun kendi duzeni.
SKIN_KUTULARI = {
    "kafa":     ((0, 0),   (8, 8, 8)),
    "govde":    ((16, 16), (8, 12, 4)),
    "sag_kol":  ((40, 16), (4, 12, 4)),
    "sol_kol":  ((32, 48), (4, 12, 4)),
    "sag_bacak": ((0, 16),  (4, 12, 4)),
    "sol_bacak": ((16, 48), (4, 12, 4)),
}

# 64x64 skinin IKINCI KATMANI (sapka/ceket/kolluk/pacha).
# ---- BUNU KULLANICI YAKALADI ----
# Ilk surumde sadece birinci katman ciziliyordu. Kullanici
# "entity303 pek olmamis, cubbeli olmasi lazim arkasi" dedi.
# Olculdu: entity303.png'nin SAPKA bolgesinde 339 dolu piksel
# var -- cubbenin kukuletasi tam orada. Birinci katman tek
# basina cizilince o katman yok sayiliyordu.
#
# Sisme (inflate) degerleri vanilla oyuncu modelinden:
# sapka 0.5, geri kalan 0.25. Olcek uygulanan modelde bu
# degerler de olceklenmeli, yoksa kucuk govdede kalin bir
# kabuk gibi durur.
SKIN_UST_KUTULARI = {
    "kafa":      ((32, 0),  0.5),
    "govde":     ((16, 32), 0.25),
    "sag_kol":   ((40, 32), 0.25),
    "sol_kol":   ((48, 48), 0.25),
    "sag_bacak": ((0, 32),  0.25),
    "sol_bacak": ((0, 48),  0.25),
}

# Kazik/carmih odunu ve daragaci ipi icin ayri dokular.
KUPA_ODUN_DOKU = "kupa_odun"
KUPA_IP_DOKU = "kupa_ip"
KUPA_ZINCIR_DOKU = "kupa_zincir"


def _kupa_yuz_uv(uv, olcu):
    """KUTU UV'yi YUZ YUZ UV'ye ceviriyor.

    ---- NEDEN GEREKLI: OLCULDU ----
    Kutu UV'de bir yuzun doku dikdortgeni KUPUN OLCUSUNDEN
    tureniyor. Yani kupu kucultursen doku da kayiyor. Carmih
    tam olarak bunu gerektiriyor: tam boy bir oyuncu 32 birim,
    blok geometrisinin ust siniri 30 birim (belge: "30x30x30"),
    ustune bir de kafanin ustunde direk gorunmesi lazim.
    Olculdu: 1.0 olcekte carmih 36 birim genis ve 30 birim
    yuksek cikiyordu -- oyun bunu yuklemezdi. Render de
    gosterdi: hac govdenin arkasinda tamamen kayboluyordu.

    Yuz yuz UV'de dikdortgen ELLE yaziliyor, kup olcusuyle
    bagi kalmiyor. Boylece kupu 0.8'e kuculturken doku
    VANILLA SKIN DUZENINDE kaliyor.

    Alt/ust yuzun V'si NEGATIF: kutu UV'de o iki yuz dikey
    ters duruyor, Blockbench'in cevirisi de boyle. Yan dort
    yuz (yuzun kendisi dahil) bundan etkilenmiyor."""
    u, v = uv
    W, H, D = olcu
    return {
        "north": {"uv": [u + D,         v + D], "uv_size": [W,  H]},
        "south": {"uv": [u + 2*D + W,   v + D], "uv_size": [W,  H]},
        "west":  {"uv": [u,             v + D], "uv_size": [D,  H]},
        "east":  {"uv": [u + D + W,     v + D], "uv_size": [D,  H]},
        "up":    {"uv": [u + D,         v + D], "uv_size": [W, -D]},
        "down":  {"uv": [u + D + W,     v + D], "uv_size": [W, -D]},
    }


def _kupa_kup(kutu_adi, kok, dondur=None, olcek=1.0, uv_ust=None):
    """SKIN_KUTULARI'ndan bir parcayi kup olarak kuruyor.

    kok = (x merkezi, y TABANI, z merkezi).

    UV elle yazilmiyor, kutu adindan geliyor. olcek 1.0 ise
    kutu UV kullaniliyor -- vanilla oyuncu modelinin ta
    kendisi, kanitlanmis yol. olcek 1.0 DEGILSE kutu UV
    kayardi, o yuzden yuz yuz UV'ye geciliyor."""
    (u, v), olcu = SKIN_KUTULARI[kutu_adi]
    if uv_ust is not None:
        u, v = uv_ust
    en, boy, derin = olcu
    e, b, d = en * olcek, boy * olcek, derin * olcek
    kup = {
        "origin": [kok[0] - e / 2.0, kok[1], kok[2] - d / 2.0],
        "size": [e, b, d],
    }
    if olcek == 1.0:
        kup["uv"] = [u, v]
    else:
        kup["uv"] = _kupa_yuz_uv((u, v), olcu)
    if dondur:
        kup["pivot"] = list(dondur[0])
        kup["rotation"] = list(dondur[1])
    return kup


def _kupa_parca(kutu_adi, kok, dondur=None, olcek=1.0):
    """Bir govde parcasinin IKI kupu: taban katman + ikinci
    katman. Liste donduruyor cunku her parca iki kup.

    Ikinci katman HER ZAMAN yaziliyor, skinde dolu olup
    olmadigina bakilmadan: render_method alpha_test, yani
    saydam piksel zaten cizilmiyor. Ayni sey vanilla oyuncu
    modelinde de boyle."""
    kupler = [_kupa_kup(kutu_adi, kok, dondur, olcek)]
    if kutu_adi in SKIN_UST_KUTULARI:
        uv2, sis = SKIN_UST_KUTULARI[kutu_adi]
        ust = _kupa_kup(kutu_adi, kok, dondur, olcek, uv_ust=uv2)
        ust["inflate"] = sis * olcek
        kupler.append(ust)
    return kupler


def _kupa_odun(kok, olcu, ad="odun"):
    """Kazik/carmih kirisi. Skinden DEGIL, kendi dokusundan:
    material_instance adi geometride yaziyor."""
    return {
        "origin": [kok[0], kok[1], kok[2]],
        "size": list(olcu),
        "uv": [0, 0],
        "material_instance": ad,
    }


def kupa_kazik_geometrisi(kimlik):
    """KAZIKLI KAFA -- 16 birimlik taban kupa TAM oturuyor.

    Kazik kafanin icinden GECIYOR ve ustunden 2 birim
    cikiyor: "kaziga oturtulmus" degil "kaziga gecirilmis"
    okunsun diye. Kaynak moddaki impaled_head de boyle.

    Olcek 1.0: 8x8x8 kafa + 18 birim kazik = 8x18x8, sinirin
    (30x30x30) cok altinda. Kuculmeye gerek yok, o yuzden
    kutu UV -- vanilla kafanin birebir aynisi."""
    return {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + KUPA_ONEK + kimlik,
                "texture_width": 64, "texture_height": 64,
                # Gorunurluk kutusu: model 18 birime cikiyor.
                "visible_bounds_width": 2,
                "visible_bounds_height": 2.5,
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": [{
                "name": "kupa",
                "pivot": [0, 0, 0],
                "cubes": [
                    # Kazik: yerden yukari, kafanin icinden gecip
                    # 2 birim disari cikiyor.
                    _kupa_odun([7, 0, 7], [2, 18, 2]),
                # Kafa: 8..16 arasi, yani taban kupun ust yarisi.
                # Ikinci katman (sapka/kukuleta) da geliyor.
                ] + _kupa_parca("kafa", (8, 8, 8)),
            }],
        }],
    }


# Carmihtaki govdenin olcegi. 1.0 OLAMAZ, sebebi olculdu:
#   tam boy oyuncu            32 birim
#   + kafanin ustunde direk  + 3 birim
#   = 35 > 30 (blok sinirı)
# 0.8'de 25.6 + 3.4 = 29 birim, siniri gecmiyor. Kollar da
# 1.0'da 36 birim aciliyordu, 0.8'de 22.4.
KUPA_CARMIH_OLCEK = 0.8


def kupa_carmih_geometrisi(kimlik):
    """CARMIH -- tam govde, kollar iki yana ACIK.

    ---- BU BICIM RENDER EDILEREK KURULDU ----
    Ilk deneme (v7.25 taslagi) render'da su uc hatayi verdi:
      1. X genisligi 36 birim -- oyun sinirini asiyordu
      2. Kollar TERS donmustu: el omuzda, omuz disarida.
         Sebep: kol kupu pivotun USTUNDE duruyordu, oysa
         oyuncu modelinde kol omuzdan ASAGI iner; kutu UV'de
         kupun ust yuzu omuz, alt yuzu el.
      3. Hac govdenin ARKASINDA tamamen kayboluyordu -- ne
         kiris ne direk goruluyordu, "carmih" hic okunmuyordu.
    Uçu de burada duzeltildi.

    Kollar YATAY: kol kupu omuzdan asagi iner (dy -12..0),
    Z ekseninde ±90 donunce el DISARI gidiyor.

    Kirisin uclari ellerin 3 birim otesine tasiyor ve direk
    kafanin 3 birim ustune cikiyor -- hac ancak boyle
    okunuyor (render'la bakildi)."""
    s = KUPA_CARMIH_OLCEK
    ORTA_X, ORTA_Z = 8.0, 8.0
    # Dikey yerlesim: bacak 12s, govde 12s, kafa 8s.
    BACAK_UST = 12 * s
    GOVDE_UST = BACAK_UST + 12 * s
    KAFA_UST = GOVDE_UST + 8 * s
    OMUZ_Y = GOVDE_UST - 1.5 * s          # kol donus ekseni
    DIREK_UST = KAFA_UST + 3.0            # kafanin ustunde gorunen pay
    # Hac govdenin ARKASINDA: govde z ORTA_Z±2s, hac ondan geride.
    HAC_Z = ORTA_Z + 2 * s
    HAC_DERIN = 3 * s
    KIRIS_YARI = 14 * s + 3.0             # el ucu + 3 birim tasma
    # Kiris kollarin TAM ALTINDA duruyor, arkasinda degil.
    # Render'la olculdu: arkasindayken kollar onu tamamen
    # ortuyordu, geriye 0.4 birimlik bir cizgi kaliyordu ve
    # hac okunmuyordu. Altina alininca butun genisligi
    # gorunuyor ve kollar kirisin uzerine yatiyor.
    KIRIS_BOY = 3 * s
    KIRIS_ALT = OMUZ_Y - 2 * s - KIRIS_BOY
    return {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + KUPA_ONEK + kimlik,
                "texture_width": 64, "texture_height": 64,
                "visible_bounds_width": 2.5,
                "visible_bounds_height": 2.5,
                "visible_bounds_offset": [0, 0.9, 0],
            },
            "bones": [{
                "name": "kupa",
                "pivot": [0, 0, 0],
                "cubes": [
                    # ---- HAC ----
                    # Dikey direk: yerden kafanin ustune.
                    _kupa_odun([ORTA_X - 1.5 * s, 0, HAC_Z],
                               [3 * s, DIREK_UST, HAC_DERIN]),
                    # Yatay kiris: uclari ellerin otesine tasiyor.
                    _kupa_odun([ORTA_X - KIRIS_YARI, KIRIS_ALT, HAC_Z],
                               [2 * KIRIS_YARI, KIRIS_BOY, HAC_DERIN]),

                # ---- GOVDE ----
                # Her parca IKI kup: taban + ikinci katman
                # (cubbe/kukuleta orada duruyor).
                ]
                + _kupa_parca("kafa", (ORTA_X, GOVDE_UST, ORTA_Z),
                              olcek=s)
                + _kupa_parca("govde", (ORTA_X, BACAK_UST, ORTA_Z),
                              olcek=s)
                # Kollar: kup omuzdan ASAGI iniyor (kok_y =
                # OMUZ_Y - 12s), pivot omuzda, Z'de ±90.
                + _kupa_parca("sag_kol",
                              (ORTA_X - 2 * s, OMUZ_Y - 12 * s, ORTA_Z),
                              dondur=((ORTA_X - 2 * s, OMUZ_Y, ORTA_Z),
                                      (0, 0, -90)),
                              olcek=s)
                + _kupa_parca("sol_kol",
                              (ORTA_X + 2 * s, OMUZ_Y - 12 * s, ORTA_Z),
                              dondur=((ORTA_X + 2 * s, OMUZ_Y, ORTA_Z),
                                      (0, 0, 90)),
                              olcek=s)
                # Bacaklar bitisik, duz asagi.
                + _kupa_parca("sag_bacak", (ORTA_X - 2 * s, 0, ORTA_Z),
                              olcek=s)
                + _kupa_parca("sol_bacak", (ORTA_X + 2 * s, 0, ORTA_Z),
                              olcek=s),
            }],
        }],
    }


def _kupa_govde(s, taban_y, orta_x=8.0, orta_z=8.0, dondur=None,
                kol_aci=None):
    """KOLLARI ASAGI SARKAN tam govde: bacak + govde + kafa +
    iki kol, hepsi ikinci katmanlariyla.

    Carmih bunu KULLANMIYOR, bilerek: orada kollar dondugu
    icin omuz ekseni ve kupun pivota gore yeri bambaska
    hesaplaniyor. Ikisini tek fonksiyonda birlestirmek
    hesabi ikisi icin de okunmaz hale getirirdi; ikisi de
    ayri ayri render edilip goz ile dogrulandi.

    taban_y = ayak tabaninin y'si.

    kol_aci verilirse kollar omuzdan DONUYOR (yukari
    kaldirilmis kol). Aci VANILLA KOLUN SARKTIGI yerden
    olculuyor: kol kupu omuzdan asagi iner, yani kolu yukari
    kaldirmak icin 180'e yakin bir aci gerekiyor -- 140
    derece "yukari ve disari" demek.

    kol_aci ile dondur AYNI ANDA verilemez: bir kupun tek
    donusu olur, ikisi birbirini ezerdi.

    dondur BUTUN parcalara ayni pivot/aciyla uygulaniyor:
    govdeyi tek parca gibi egmek icin. Ayri bir kemik
    yapilmadi, cunku o zaman 30 birim denetimi eksik kalirdi
    -- olcum kup donusune bakiyor, kemik donusune degil."""
    bacak_ust = taban_y + 12 * s
    govde_ust = bacak_ust + 12 * s
    kup = []
    kup += _kupa_parca("kafa", (orta_x, govde_ust, orta_z), dondur=dondur, olcek=s)
    kup += _kupa_parca("govde", (orta_x, bacak_ust, orta_z), dondur=dondur, olcek=s)
    # Kollar govdenin yaninda, ust hizasi govde ustu (vanilla).
    if kol_aci is None:
        sag_d = sol_d = dondur
    else:
        assert dondur is None, "kol_aci ile dondur birlikte olmaz"
        omuz_y = govde_ust - 1.5 * s
        sag_d = ((orta_x - 6 * s, omuz_y, orta_z), (0, 0, -kol_aci))
        sol_d = ((orta_x + 6 * s, omuz_y, orta_z), (0, 0, kol_aci))
    kup += _kupa_parca("sag_kol", (orta_x - 6 * s, govde_ust - 12 * s,
                                   orta_z), dondur=sag_d, olcek=s)
    kup += _kupa_parca("sol_kol", (orta_x + 6 * s, govde_ust - 12 * s,
                                   orta_z), dondur=sol_d, olcek=s)
    kup += _kupa_parca("sag_bacak", (orta_x - 2 * s, taban_y, orta_z),
                       dondur=dondur, olcek=s)
    kup += _kupa_parca("sol_bacak", (orta_x + 2 * s, taban_y, orta_z),
                       dondur=dondur, olcek=s)
    return kup, govde_ust + 8 * s      # ikinci deger: kafanin tepesi


# Daragacindaki govdenin olcegi. Yukaridan asagi hesap:
#   direk tepesi         29.0  (sinir 30)
#   daragaci kolu         3.0
#   ip                    3.0
#   ayaklar yerden        2.5   (sallaniyor, yere degmiyor)
#   -> govdeye kalan     20.5 birim, tam boy 32 -> olcek 0.64
KUPA_ASILI_OLCEK = 0.64


def kupa_asili_geometrisi(kimlik):
    """DARAGACI -- govde boynundan ipte sallaniyor.

    Ayaklar YERE DEGMIYOR (2.5 birim bosluk): degseydi
    "asilmis" degil "duruyor" okunurdu.

    Direk arkada, daragaci kolu tepeden ONE uzaniyor, ip o
    kolun ucundan kafanin tepesine iniyor.

    Govde ipin baglandigi noktadan YANA EGIK. Render'la
    bakildi: dik duran govde "asilmis" degil "diregin
    yaninda duruyor" gibi okunuyordu. Egiklik ipin ucundan
    donuyor -- goz govdeyi tasiyan seyin ip oldugunu boyle
    anliyor."""
    s = KUPA_ASILI_OLCEK
    ORTA_X, ORTA_Z = 8.0, 8.0
    TABAN_Y = 2.5
    # Once EGIK OLMAYAN hali kuruluyor: kafanin tepesi
    # boylece bulunuyor, egim de tam o noktadan -- ipin
    # baglandigi yerden -- donuyor.
    _duz, KAFA_UST = _kupa_govde(s, TABAN_Y, ORTA_X, ORTA_Z)
    EGIM = 7.0                             # derece
    kupler = _kupa_govde(s, TABAN_Y, ORTA_X, ORTA_Z,
                         dondur=((ORTA_X, KAFA_UST, ORTA_Z),
                                 (0, 0, EGIM)))[0]
    DIREK_UST = 29.0
    KOL_ALT = DIREK_UST - 3.0             # daragaci kolunun alti
    DIREK_Z = 13.0                        # direk govdenin arkasinda
    hac = [
        # Dikey direk.
        _kupa_odun([ORTA_X - 1.5, 0, DIREK_Z], [3, DIREK_UST, 3]),
        # Daragaci kolu: tepeden govdenin uzerine uzaniyor.
        _kupa_odun([ORTA_X - 1.5, KOL_ALT, ORTA_Z - 0.5],
                   [3, 3, DIREK_Z + 3 - (ORTA_Z - 0.5)]),
        # Ip: kolun ucundan kafanin tepesine. Kalinligi 2
        # birim -- 1 birimde render'da neredeyse gorunmuyordu.
        _kupa_odun([ORTA_X - 1, KAFA_UST, ORTA_Z - 1],
                   [2, KOL_ALT - KAFA_UST, 2], ad="ip"),
    ]
    return {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + KUPA_ONEK + kimlik,
                "texture_width": 64, "texture_height": 64,
                "visible_bounds_width": 2,
                "visible_bounds_height": 2.5,
                "visible_bounds_offset": [0, 0.9, 0],
            },
            "bones": [{"name": "kupa", "pivot": [0, 0, 0],
                       "cubes": hac + kupler}],
        }],
    }


# Kaziga gecmis govdenin olcegi. Kazik kafanin ustunden
# cikacagi icin tepede pay lazim:
#   kazik tepesi 29.0, kafanin ustunde 2 birim gorunsun,
#   govde yerden 4 birim yukarida (kaziga surunmus) ->
#   32*olcek = 29 - 2 - 4 = 23 -> olcek 0.71
KUPA_SIS_OLCEK = 0.71


def kupa_sis_geometrisi(kimlik):
    """KAZIGA GECMIS TAM GOVDE -- Earl'un kazigi kafaya, bu
    butun govdeye geciyor.

    Kazik yerden baslayip govdenin ICINDEN gecip kafanin 2
    birim ustunden cikiyor. Govde yerden 4 birim yukarida:
    kaziga surunup kalmis, ayaklari bosta."""
    s = KUPA_SIS_OLCEK
    ORTA_X, ORTA_Z = 8.0, 8.0
    TABAN_Y = 4.0
    kupler, KAFA_UST = _kupa_govde(s, TABAN_Y, ORTA_X, ORTA_Z)
    KAZIK_UST = KAFA_UST + 2.0
    kazik = [_kupa_odun([ORTA_X - 1, 0, ORTA_Z - 1],
                        [2, KAZIK_UST, 2])]
    return {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + KUPA_ONEK + kimlik,
                "texture_width": 64, "texture_height": 64,
                "visible_bounds_width": 2,
                "visible_bounds_height": 2.5,
                "visible_bounds_offset": [0, 0.9, 0],
            },
            "bones": [{"name": "kupa", "pivot": [0, 0, 0],
                       "cubes": kazik + kupler}],
        }],
    }


# Ikinci katmanin doku uzerindeki yerleri (temizlik icin).
KUPA_UST_BOLGE = {
    "kafa":      (32, 0, 32, 16),
    "govde":     (16, 32, 24, 16),
    "sag_kol":   (40, 32, 16, 16),
    "sol_kol":   (48, 48, 16, 16),
    "sag_bacak": (0, 32, 16, 16),
    "sol_bacak": (0, 48, 16, 16),
}

# Bir yuzun "gurultu" sayilmasi icin IKI KOSUL BIRDEN.
#
# ---- IKI OLCUM DE TEK BASINA YANLIS SONUC VERDI ----
# 1. Once "ayri renk / dolu piksel" orani denendi. O olcum
#    earl.png'nin govde altini gurultu sandi: 32 pikselde 28
#    ayri renk var, ama orasi gurultu degil YUMUSAK BIR
#    GECIS. Renk sayisi gecisle gurultuyu ayiramiyor.
# 2. Sonra "komsu piksel farki" denendi. O da dream.png'yi
#    gurultu sandi (78.3): o skin uc-dort SAF renkten olusuyor
#    (parlak yesil, beyaz, siyah) ve kenarlari serttir, yani
#    komsu farki dogal olarak yuksek. Komsu farki tek basina
#    yuksek karsitli duz renkli cizimi gurultuden ayiramiyor.
#
# Ikisi BIRLIKTE ayiriyor, cunku gurultunun iki ozelligi de
# ayni anda var: komsular birbirine hic benzemiyor VE hemen
# her piksel ayri renk.
#
#   skin        en komsu farki   en renk orani   ikisi birden
#   ferguson         96.2            1.00        13 yuz -> BOZUK
#   dream            78.3            0.12        yok   -> temiz
#   earl             25.5            0.88        yok   -> temiz
#   entity303        55.9            0.28        yok   -> temiz
#   wyne             40.2            0.50        yok   -> temiz
KUPA_GURULTU_ESIGI = 70.0        # komsu piksel farki
KUPA_PALET_ESIGI = 0.5           # ayri renk / dolu piksel


def _kupa_gurultulu_mu(px, x, y, en, boy):
    """Bir doku dikdortgeni gurultu mu?

    (gurultu_mu, komsu_farki, renk_orani, dolu_piksel)
    donduruyor -- sayilari da veriyor ki UYARI'da gorunsun,
    "neden reddedildi" sorusu cevapsiz kalmasin."""
    toplam = 0.0
    sayi = 0
    dolu = 0
    renkler = set()
    for j in range(boy):
        for i in range(en):
            a = px[x + i, y + j]
            if a[3] < 40:
                continue
            dolu += 1
            renkler.add(a[:3])
            for di, dj in ((1, 0), (0, 1)):
                if i + di >= en or j + dj >= boy:
                    continue
                b = px[x + i + di, y + j + dj]
                if b[3] < 40:
                    continue
                toplam += sum(abs(a[k] - b[k]) for k in range(3)) / 3.0
                sayi += 1
    fark = toplam / sayi if sayi else 0.0
    oran = len(renkler) / float(dolu) if dolu else 0.0
    gurultu = (dolu >= 16 and fark > KUPA_GURULTU_ESIGI
               and oran > KUPA_PALET_ESIGI)
    return gurultu, fark, oran, dolu


def _kupa_yuz_dikdortgenleri(uv, olcu):
    """Kutu UV'nin alti yuzunun doku dikdortgenleri."""
    u, v = uv
    W, H, D = olcu
    return {"ust": (u + D, v, W, D), "alt": (u + D + W, v, W, D),
            "on": (u + D, v + D, W, H),
            "arka": (u + 2 * D + W, v + D, W, H),
            "bati": (u, v + D, D, H),
            "dogu": (u + D + W, v + D, D, H)}


def kupa_skin_denetle(kaynak, hedef, bicim):
    """Skini kopyalarken IKI is yapiyor:
      1. ikinci katmandaki gurultuyu siliyor
      2. TABAN katmanda bicimin gercekten cizdigi yuzlerde
         gurultu varsa BILDIRIYOR -- o skin kullanilmaz

    ---- NEDEN VAR: OLCULDU ----
    ferguson.png render edildiginde govdenin uzerinde
    gokkusagi gibi rastgele renkli kutular cikti. Olculdu:
    o skinin sol kolu ve sol bacagi tamamen gurultu (komsu
    piksel farki 89-96), kafasinin ve govdesinin bir kismi
    da oyle. Yani dosya bozuk gelmis. Karsilastirma icin
    entity303.png'nin en "hareketli" yuzu 55.9.

    Bozuk skin SESSIZCE GECMIYOR: cagiran taraf bunu
    kullaniciya bildiriyor ve o kupa uretilmiyor. Yarim
    yamalak bir kupa uretmek, eksik oldugunu soylemekten
    kotudur.

    PIL yoksa skin oldugu gibi kopyalaniyor ve uyari
    basiliyor -- depodaki oteki doku isleri de boyle."""
    import shutil
    try:
        from PIL import Image
    except ImportError:
        print("UYARI: PIL yok, kupa skini denetlenmeden kopyalandi")
        shutil.copyfile(kaynak, hedef)
        return [], []
    im = Image.open(kaynak).convert("RGBA")
    px = im.load()

    # 1) ikinci katman: gurultulu bolgeyi sil
    silinen = []
    for ad, (x0, y0, en, boy) in sorted(KUPA_UST_BOLGE.items()):
        if _kupa_gurultulu_mu(px, x0, y0, en, boy)[0]:
            for j in range(boy):
                for i in range(en):
                    px[x0 + i, y0 + j] = (0, 0, 0, 0)
            silinen.append(ad)

    # 2) taban katman: bicimin CIZDIGI kutulari denetle
    kullanilan = (["kafa"] if bicim == KUPA_KAZIK
                  else list(SKIN_KUTULARI.keys()))
    bozuk = []
    for kutu in kullanilan:
        uv, olcu = SKIN_KUTULARI[kutu]
        for yon, (x, y, en, boy) in _kupa_yuz_dikdortgenleri(uv, olcu).items():
            gurultu, f, oran, _d = _kupa_gurultulu_mu(px, x, y, en, boy)
            if gurultu:
                bozuk.append("%s.%s(fark %.0f, renk orani %.2f)"
                             % (kutu, yon, f, oran))
    if not bozuk:
        im.save(hedef)
    return silinen, bozuk


# Zincirli govdenin olcegi. Yukaridan asagi hesap:
#   ust kiris tepesi     29.0
#   kiris                 3.0
#   zincir              ~5.8   (elden kirise)
#   ayaklar yerden        1.5   (sallaniyor)
# 32*olcek = 19.2 -> olcek 0.6
KUPA_ZINCIRLI_OLCEK = 0.6

# Kollarin omuzdan donus acisi. 140 derece: kol sarktigi
# yerden yukari-disari kalkiyor, eller basin hizasinin
# uzerinde ve iki yana acik -- zincire baglanacak yer orasi.
KUPA_ZINCIR_KOL_ACI = 140.0


def kupa_zincirli_geometrisi(kimlik):
    """ZINCIRLI -- govde bileklerinden zincirle asili.

    Carmihtan farki: ne hac var ne civi. Kollar V bicimde
    yukari, iki zincir yukaridaki kirise gidiyor, ayaklar
    bosta. "Kacamadi, yakalandi" bicimi.

    El konumu HESAPLANIYOR, elle yazilmiyor: kol omuzdan
    kol_aci kadar donunce elin nereye gittigi acidan
    cikiyor. Zincir tam oraya iniyor; aci degisirse zincir
    de kendiliginden kayiyor."""
    s = KUPA_ZINCIRLI_OLCEK
    ORTA_X, ORTA_Z = 8.0, 8.0
    TABAN_Y = 1.5
    kupler, _kafa_ust = _kupa_govde(s, TABAN_Y, ORTA_X, ORTA_Z,
                                    kol_aci=KUPA_ZINCIR_KOL_ACI)
    # Elin yeri: omuz + 12s uzunlugundaki kolun donmus ucu.
    govde_ust = TABAN_Y + 24 * s
    omuz_y = govde_ust - 1.5 * s
    t = math.radians(KUPA_ZINCIR_KOL_ACI)
    el_dx = 12 * s * math.sin(t)          # disari
    el_dy = 12 * s * math.cos(t)          # yukari (cos negatif -> +)
    EL_X_SAG = ORTA_X - 6 * s - el_dx
    EL_X_SOL = ORTA_X + 6 * s + el_dx
    EL_Y = omuz_y - el_dy
    KIRIS_UST = 29.0
    KIRIS_BOY = 3.0
    KIRIS_ALT = KIRIS_UST - KIRIS_BOY
    # Kiris iki elin de disina tasiyor.
    KIRIS_SOL = min(EL_X_SAG, EL_X_SOL) - 2.0
    KIRIS_SAG = max(EL_X_SAG, EL_X_SOL) + 2.0
    demir = [
        _kupa_odun([KIRIS_SOL, KIRIS_ALT, ORTA_Z - 1.5],
                   [KIRIS_SAG - KIRIS_SOL, KIRIS_BOY, 3]),
    ]
    for ex in (EL_X_SAG, EL_X_SOL):
        demir.append(_kupa_odun([ex - 1, EL_Y, ORTA_Z - 1],
                                [2, KIRIS_ALT - EL_Y, 2], ad="zincir"))
    return {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry." + KUPA_ONEK + kimlik,
                "texture_width": 64, "texture_height": 64,
                "visible_bounds_width": 2.5,
                "visible_bounds_height": 2.5,
                "visible_bounds_offset": [0, 0.9, 0],
            },
            "bones": [{"name": "kupa", "pivot": [0, 0, 0],
                       "cubes": demir + kupler}],
        }],
    }


def kupa_zincir_dokusu():
    """Zincir: 16x16 koyu demir, halkali.
    Lineer ifade kafes uretir -- karistirici hash."""
    p = {}
    for y in range(16):
        for x in range(16):
            h = (x * 1103515245 + y * 12345) & 0xFFFFFFFF
            h = (h ^ (h >> 12)) * 2654435761 & 0xFFFFFFFF
            z = (h ^ (h >> 17)) & 0xFF
            # Halka: her dort satirda bir koyu bant.
            halka = (y % 4) == 0 or (y % 4) == 3
            t = 96 + (z % 24) + (-34 if halka else 22)
            t = max(0, min(255, t))
            p[(x, y)] = (t, t, int(t * 1.06) if t < 240 else t, 255)
    return p


def kupa_ip_dokusu():
    """Daragaci ipi: 16x16 kendir rengi, burgulu.
    Lineer ifade kafes uretir -- karistirici hash."""
    p = {}
    for y in range(16):
        for x in range(16):
            h = (x * 2654435761 + y * 40503) & 0xFFFFFFFF
            h = (h ^ (h >> 15)) * 2246822519 & 0xFFFFFFFF
            z = (h ^ (h >> 13)) & 0xFF
            # Burgu: capraz seritler ipi ip yapan sey.
            burgu = ((x + y) % 4) < 2
            t = 150 + (z % 26) + (18 if burgu else -18)
            t = max(0, min(255, t))
            p[(x, y)] = (t, int(t * 0.82), int(t * 0.52), 255)
    return p


def kupa_odun_dokusu():
    """Kazik ve carmih odunu: 16x16 koyu, catlakli ahsap.
    Lineer ifade KAFES uretiyor (bu depoda uc kez yasandi),
    o yuzden karistirici hash."""
    p = {}
    for y in range(16):
        for x in range(16):
            h = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
            h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
            z = (h ^ (h >> 16)) & 0xFF
            # Dikey damar: odun lifi yukari gider.
            damar = (x * 7 + (z >> 5)) % 5 == 0
            t = 58 + (z % 22) - (12 if damar else 0)
            p[(x, y)] = (t, int(t * 0.72), int(t * 0.48), 255)
    return p


def kupa_blogu(kimlik, ad, bicim):
    """Kupanin blok tanimi.

    minecraft:geometry ve minecraft:material_instances IKISI
    BIRDEN yaziliyor -- 1.21.80'den beri zorunlu (belge).

    "*" skinin kendisi, "odun" ise kazik/kiris. Geometride o
    kuplerin material_instance alani "odun" diyor; belgedeki
    "Tuna Roll" ornegindeki kalibin aynisi."""
    return {
        "format_version": "1.21.0",
        "minecraft:block": {
            "description": {
                "identifier": "pa:" + KUPA_ONEK + kimlik,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:geometry": {
                    "identifier": "geometry." + KUPA_ONEK + kimlik,
                },
                "minecraft:material_instances": {
                    "*": {
                        "texture": KUPA_ONEK + kimlik,
                        # alpha_test: skinin ikinci katmani
                        # (sapka/ceket) saydam pikseller
                        # tasiyor; opaque olsaydi onlar SIYAH
                        # cikardi.
                        "render_method": "alpha_test",
                    },
                    "odun": {
                        "texture": KUPA_ODUN_DOKU,
                        "render_method": "opaque",
                    },
                    # "ip" YALNIZ daragacinda var. Kullanmayan
                    # bicimlere yazilmiyor: tanimli ama hicbir
                    # yuzun istemedigi bir malzeme, ileride
                    # "bu neden burada" sorusu doguruyor.
                    **({"ip": {"texture": KUPA_IP_DOKU,
                               "render_method": "opaque"}}
                       if bicim == KUPA_ASILI else {}),
                    **({"zincir": {"texture": KUPA_ZINCIR_DOKU,
                                   "render_method": "opaque"}}
                       if bicim == KUPA_ZINCIRLI else {}),
                },
                # Kupa DEKOR: carpisma kutusu yok, icinden
                # gecilebiliyor. Carpisma olsaydi carmih iki
                # blokluk gorunmez bir duvar olurdu.
                "minecraft:collision_box": False,
                "minecraft:selection_box": {
                    "origin": [-8, 0, -8], "size": [16, 16, 16],
                },
                "minecraft:destructible_by_mining": {
                    "seconds_to_destroy": 0.6
                },
                "minecraft:destructible_by_explosion": {
                    "explosion_resistance": 2
                },
                "minecraft:light_dampening": 0,
                "minecraft:map_color": "#6b1414",
            },
        },
    }


# ============================================================
#  KURUYAN AGAC                                        v7.11
#
#  LORE.md'nin MERKEZINDEKI nesne bugune kadar oyunda yoktu.
#  "Unutulan Efsane -- Kuruyan Agac" bolumu, ozetle:
#
#    Upuzun bir agac vardi. Her nesilde Kanli Goz'u tasiyan
#    kisi kendi ismini o agaca YAZDIRIYORDU. Isimler ust uste
#    birikiyor, efsane boylece kusaktan kusaga aktariliyordu.
#    Agac kuruduktan sonra isimler yazilamaz oldu ve efsane
#    tamamen kayboldu.
#
#  Ve nasil kurudugu (vakayiname):
#    1730 -- keresteciler govdeden BAL GIBI bir sivi aktigini
#            gorur, tadarlar: baldan tatli.
#    1735 -- sivi kesilir, ilgi biter, bakimsizliktan agac kurur.
#
#  ---- TEKNIK NEREDEN GELDI ----
#  "BoraLo MOD V5+" paketinde (Bobbykardesler) `codeman_tree`
#  diye CALISAN bir tree_feature var; yapisi olculdu:
#      fancy_trunk  : trunk_height {base, variance, scale},
#                     trunk_width, branches {slope, density,
#                     min_altitude_factor}, width_scale,
#                     foliage_altitude_factor
#      fancy_canopy : height, radius, leaf_block
#      base_block   : uzerinde bitebilecegi bloklar
#  Ayni iskelet, bizim bloklarimiz ve bizim sayilarimizla.
#  (O pakette cevher ozelligi de var ama CALISMIYOR:
#   "places_block": null ve "may_replace": [] -- yani hicbir sey
#   koymuyor, hicbir seyin yerine de gecmiyor. Kopyalanmadi.)
#
#  ---- KANONLA UYUMLU UC KARAR ----
#  1. Agac KURU. Govde uzun, tepe kucuk: fancy_canopy 2 yuksek
#     2 yaricap. Yemyesil bir agac hikayeyi yalanlardi.
#  2. Yaprak KIRILINCA HICBIR SEY DUSMUYOR -- fidan yok.
#     "Agac kuruduktan sonra isimler yazilamaz oldu": yeniden
#     dikilebilseydi efsane kaybolmazdi. Yani fidanin olmamasi
#     eksik degil, kanonun kendisi.
#  3. Govdede KAZINMIS izler ve BAL lekeleri var (bkz. doku).
#
#  RENKLER OLCULDU, secilmedi: KOLLAR tablosundaki Toprak Kol
#  cifti (24,22,20) ve (198,138,90). Kuru odun ikisinin
#  arasindan, bal ise acik tondan turetiliyor.
# ============================================================
AGAC_KUTUK = "kuruyan_kutuk"
AGAC_YAPRAK = "kuruyan_yaprak"
AGAC_KUTUK_TR = "Kuruyan Ağacın Gövdesi"
AGAC_YAPRAK_TR = "Kuruyan Ağacın Yaprağı"

# Govde: uzun. base+variance vanilla "fancy" mesenin uzerinde --
# LORE "upuzun bir agac" diyor.
AGAC_BOY_TABAN = 9
AGAC_BOY_SAPMA = 8
# 0.618 altin oranin eslenigi; vanilla fancy agacinin da,
# olculen codeman_tree'nin de kullandigi deger.
AGAC_BOY_OLCEK = 0.618
AGAC_DAL_EGIM = 0.381
AGAC_DAL_SIKLIK = 1
AGAC_DAL_ALT = 0.2
# Tepe: KUCUK. Kuru bir agacin yapragi az kalir.
AGAC_TEPE_BOY = 2
AGAC_TEPE_YARICAP = 2
# Dunyada ne siklikta. Yuzde; dismont 8 kullaniyor. Bu bir
# EFSANE, o yuzden daha nadir -- ama bulunamayacak kadar degil.
AGAC_DENEME = 1
AGAC_SANS = 2
AGAC_KIRILMA = 4.0        # saniye (vanilla mese kutugu 2)


def _agac_renkleri():
    """Toprak Kol'un OLCULEN iki renginden turetilen kuru odun
    kademesi. Elle secilen tek bir deger yok."""
    koyu, acik = (24, 22, 20), (198, 138, 90)

    def kar(a, b, o):
        return tuple(int(round(a[i] + (b[i] - a[i]) * o)) for i in range(3))

    return {
        "govde":  kar(koyu, acik, 0.34),   # kuru odun
        "oluk":   kar(koyu, acik, 0.18),   # kabuk oluklari
        # Kazik izi cok parlak olunca govde TUGLA duvar gibi
        # gorunuyordu (render). 0.62 -> 0.46.
        "kazik":  kar(koyu, acik, 0.46),   # KAZINMIS iz
        # Bal da parlaktı: govdeye saplanmis altin kulce gibi
        # duruyordu. Once acik tona, sonra govdeye dogru
        # cekildi -- KURUMUS bal, taze degil.
        # OLCULDU: ilk iki denemede bal (166,128,79) cikti, yani
        # govdenin (83,61,44) TAM IKI KATI parlak -- oyunda
        # govdeye saplanmis altin kulce gibi goruluyordu.
        # Kurumus bal govdeden yalnizca biraz acik olmali.
        "bal":    kar(kar(koyu, acik, 0.34),
                      kar(acik, (255, 214, 120), 0.5), 0.30),
        "yaprak": kar(koyu, acik, 0.44),
        "yaprak_koyu": kar(koyu, acik, 0.26),
    }


def _agac_zar(x, y, tuz):
    """Tohumlu, dagilimi duzgun sozde-rastgele (0..255).

    NEDEN LINEER DEGIL: ilk cizimde desen `(x*7 + y*11) % 9`
    gibi lineer bir ifadeyle uretilmisti. Render'a bakinca
    goruldu -- lineer ifade kafes uretiyor: yaprak CAPRAZ
    CIZGILI bir kumas, govde de duzgun raflar gibi cikti.
    Ayni ders goz.js'te de yazili (mulberry32 notu).
    Burada karistirma yapan bir hash var; sonuc yine SABIT
    (tohum ayni) ama kafes yok."""
    h = (x * 374761393 + y * 668265263 + tuz * 2246822519) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return (h ^ (h >> 16)) & 0xFF


def kuruyan_kutuk_dokusu():
    """Kuru kabuk + KAZINMIS isimler + govdeden inen bal izi.

    Isimler harf harf cizilmiyor: 16x16'da okunakli harf zaten
    cikmaz. Yerine KISA, kirik, duzensiz kazik izleri var --
    uzaktan "bir seyler yazilmis" hissi veriyor, yakindan da
    yalan soylemiyor.

    Ilk denemede izler 10-12 piksel uzunluktaydi ve govde
    RAFLI bir dolap gibi goruldu (render). Iz uzunlugu 2-4'e
    indirildi, satirlar kaydirildi, altlarina golge kondu."""
    r = _agac_renkleri()
    p = {}
    # ---- Kabuk: duzensiz genislikte dikey oluklar ----
    for x in range(16):
        derin = _agac_zar(x, 0, 11) % 5          # sutun basina sabit
        for y in range(16):
            n = _agac_zar(x, y // 2, 3) % 9
            if derin < 2 and n < 5:
                p[(x, y)] = r["oluk"] + (255,)
            elif n == 8:
                p[(x, y)] = r["kazik"] + (255,)   # tek tek acik lif
            else:
                p[(x, y)] = r["govde"] + (255,)

    # ---- Kazinmis isimler: kisa, kirik, ust uste ----
    # Uc "satir", her satirda birkac kisa cizik. Nesiller ust
    # uste yazmis -- duzenli degil, birikmis.
    for satir, (y, tuz) in enumerate(((2, 41), (7, 97), (12, 173))):
        x = _agac_zar(satir, 0, 5) % 3
        while x < 15:
            boy = 2 + _agac_zar(x, y, tuz) % 3       # 2-4 piksel
            # Y'yi bir piksel oynat: izler DUZ CIZGI uzerinde
            # dizilince govde tugla duvari gibi goruluyordu.
            yy = min(15, y + _agac_zar(x, satir, tuz) % 2)
            for i in range(boy):
                if x + i > 15:
                    break
                p[(x + i, yy)] = r["kazik"] + (255,)
                if yy + 1 < 16:
                    p[(x + i, yy + 1)] = r["oluk"] + (255,)  # cukur golgesi
            x += boy + 1 + _agac_zar(x + 1, y, tuz) % 3      # duzensiz bosluk

    # ---- Bal: catlaktan ASAGI inen iz ----
    # Nokta nokta degil, akmis. LORE: govdeden bal gibi bir sivi
    # akiyordu, 1735'te kesildi -- yani kurumus bir iz.
    # TEK iz, TEK piksel genis. Iki tane ve iki piksel genisken
    # govdeye saplanmis altin kulceler gibi goruluyordu; ustelik
    # bloklar yan yana gelince desen izgara yapiyordu.
    x0, y0, boy = 12, 4, 5
    for k in range(boy):
        y = y0 + k
        if y > 15:
            break
        p[(x0, y)] = r["bal"] + (255,)
    return p


def kuruyan_yaprak_dokusu():
    """Seyrek, kurumus yaprak. Bosluklar SAYDAM birakiliyor --
    doku alpha_test ile ciziliyor, yani kuru bir tepe delik
    delik gorunuyor.

    Ilk denemede bosluklar lineer bir ifadeyle secilmisti ve
    CAPRAZ CIZGILI bir kumas gibi goruldu (render). Artik
    hash'le seciliyor ve bosluklar OBEK halinde: tek tek delik
    degil, dokulmus yaprak kumeleri."""
    r = _agac_renkleri()
    p = {}
    for x in range(16):
        for y in range(16):
            # Iki olcekli gurultu: kaba obek + ince doku.
            kaba = _agac_zar(x // 3, y // 3, 61)
            ince = _agac_zar(x, y, 137)
            if kaba < 70 or ince < 45:
                continue                      # saydam bosluk
            p[(x, y)] = (r["yaprak_koyu"] if ince > 190
                         else r["yaprak"]) + (255,)
    return p


def kuruyan_kutuk_blogu():
    return {
        "format_version": "1.21.0",
        "minecraft:block": {
            "description": {
                "identifier": "pa:" + AGAC_KUTUK,
                "menu_category": {"category": "nature"},
            },
            "components": {
                "minecraft:material_instances": {
                    "*": {"texture": AGAC_KUTUK, "render_method": "opaque"}
                },
                "minecraft:destructible_by_mining": {
                    "seconds_to_destroy": AGAC_KIRILMA
                },
                "minecraft:destructible_by_explosion": {
                    "explosion_resistance": 6
                },
                "minecraft:map_color": "#5a4a3a",
                "minecraft:flammable": {
                    "catch_chance_modifier": 5,
                    "destroy_chance_modifier": 20,
                },
                "minecraft:loot": "loot_tables/blocks/%s.json" % AGAC_KUTUK,
            },
        },
    }


def kuruyan_yaprak_blogu():
    """alpha_test: dokudaki saydam pikseller delik olarak
    ciziliyor. opaque yazilsaydi saydam yerler SIYAH cikardi."""
    return {
        "format_version": "1.21.0",
        "minecraft:block": {
            "description": {
                "identifier": "pa:" + AGAC_YAPRAK,
                "menu_category": {"category": "nature"},
            },
            "components": {
                "minecraft:material_instances": {
                    "*": {"texture": AGAC_YAPRAK,
                          "render_method": "alpha_test"}
                },
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.2},
                "minecraft:destructible_by_explosion": {
                    "explosion_resistance": 0.2
                },
                "minecraft:map_color": "#6b5638",
                "minecraft:flammable": {
                    "catch_chance_modifier": 30,
                    "destroy_chance_modifier": 60,
                },
                "minecraft:light_dampening": 1,
                "minecraft:loot": "loot_tables/blocks/%s.json" % AGAC_YAPRAK,
            },
        },
    }


def kuruyan_kutuk_ganimeti():
    return {
        "pools": [{
            "rolls": 1,
            "entries": [{"type": "item", "name": "pa:" + AGAC_KUTUK,
                         "weight": 1}],
        }]
    }


def kuruyan_yaprak_ganimeti():
    """BOS havuz -- yaprak kirilinca HICBIR SEY dusmuyor.

    Fidan yok. LORE: "Agac kuruduktan sonra isimler yazilamaz
    oldu ... efsane tamamen kayboldu." Yeniden dikilebilen bir
    agac o cumleyi yalanlardi. Yani bu eksik degil, kanon."""
    return {"pools": []}


def kuruyan_agac_ozelligi():
    return {
        "format_version": "1.21.0",
        "minecraft:tree_feature": {
            "description": {"identifier": "pa:kuruyan_agac_feature"},
            "fancy_trunk": {
                "trunk_height": {
                    "base": AGAC_BOY_TABAN,
                    "variance": AGAC_BOY_SAPMA,
                    "scale": AGAC_BOY_OLCEK,
                },
                "trunk_width": 1,
                "trunk_block": "pa:" + AGAC_KUTUK,
                "branches": {
                    "slope": AGAC_DAL_EGIM,
                    "density": AGAC_DAL_SIKLIK,
                    "min_altitude_factor": AGAC_DAL_ALT,
                },
                "width_scale": 1,
                "foliage_altitude_factor": 0.3,
            },
            "fancy_canopy": {
                "height": AGAC_TEPE_BOY,
                "radius": AGAC_TEPE_YARICAP,
                "leaf_block": "pa:" + AGAC_YAPRAK,
            },
            "base_block": [
                "minecraft:dirt",
                "minecraft:grass_block",
                "minecraft:podzol",
                "minecraft:coarse_dirt",
            ],
            "may_grow_on": [
                "minecraft:dirt",
                "minecraft:grass_block",
                "minecraft:podzol",
                "minecraft:coarse_dirt",
            ],
            "may_replace": [
                "minecraft:air",
                "minecraft:leaves",
                "minecraft:leaves2",
                "minecraft:short_grass",
                "minecraft:tallgrass",
            ],
            "may_grow_through": [
                "minecraft:dirt",
                "minecraft:grass_block",
                "minecraft:short_grass",
                "minecraft:tallgrass",
            ],
        },
    }


def kuruyan_agac_kurali():
    """DIKKAT -- dismont cevherindeki uyarinin aynisi: bu yalniz
    YENI URETILEN parcalarda calisiyor. Zaten gezdigin bolgede
    agac cikmaz; uzaga gitmek ya da yeni dunya acmak gerekiyor.
    Bedrock'ta bunun caresi yok."""
    return {
        "format_version": "1.21.0",
        "minecraft:feature_rules": {
            "description": {
                "identifier": "pa:kuruyan_agac_rule",
                "places_feature": "pa:kuruyan_agac_feature",
            },
            "conditions": {
                # Agac YUZEYE cikiyor, cevher gibi yeraltina degil.
                "placement_pass": "surface_pass",
                "minecraft:biome_filter": [
                    {"test": "has_biome_tag", "operator": "==",
                     "value": "overworld"}
                ],
            },
            "distribution": {
                "iterations": AGAC_DENEME,
                "scatter_chance": AGAC_SANS,
                "x": {"distribution": "uniform", "extent": [0, 16]},
                "z": {"distribution": "uniform", "extent": [0, 16]},
                "y": "q.heightmap(v.worldx, v.worldz)",
            },
        },
    }


def dismont_cevher_dokusu():
    """Dismont cevheri (v4.52 -- ikinci deneme).

    ---- ILK DENEME NEDEN KOTUYDU ----
    v4.51'de elmas rengini HAFIZADAN yazdim: (94,219,214).
    Kullanici begenmedi ve hakliydi -- oyle bir renk oyunda
    yok. Vanilla dokular indirilip piksel piksel okundu, artik
    her deger OLCULMUS:

      elmas esyasi (Diamond_JE3_BE3.png)
        #4aedd9  (74,237,217)   ana elmas
        #20c5b5  (32,197,181)   ara ton
        #a1fbe8  (161,251,232)  parlak
        #145e53  (20,94,83)     elmasin EN KOYU tonu
        #11727a  (17,114,122)   koyu teal

      deepslate elmas cevheri
        #313136 #252529 #3c3c42  taban grileri
        #3d5455 #506e70          orada elmasin soldurulmus hali

    ---- TARIF NASIL KARSILANDI ----
    "siyaha yakin ama tam siyah degil"
        taban artik UYDURMA degil: deepslate'in kendi grileri
        (#252529 - #3c3c42). Oyunda derinde bu tasin yaninda
        duracagi icin ayni aileden olmasi dogru.

    "elmas renklerinden SINIRLARI isiklar"
        kristalin ICI #145e53 -- elmasin kendi en koyu tonu.
        KENARI #20c5b5, isik alan kenar #4aedd9, tepe noktasi
        #a1fbe8. Yani elmas orada ama ici sonmus, sadece
        sinirlari isiyor.

    "bozulmus, ele gecirilmis maden havasi"
        curuk lekeleri yesile calan koyu benekler.

    ---- ILK DENEMEDEN FARKI ----
    Onceki doku SOLUKTU: hem taban hem kristal birbirine yakin
    tonlardaydi, 16 pikselde ayirt edilmiyor ve camur gibi
    duruyordu. Simdi kontrast gercek elmasin kontrasti; koyu
    taban ustunde parlak kenar 16 pikselde de okunuyor.
    Isik ust-sol'dan: kenarlarin ust ve sol tarafi parlak, alt
    ve sag tarafi ara ton -- vanilla dokularin kurali bu."""
    sekil = [
        "................",
        "...lll..........",
        "..lddddm...lll..",
        "..lddddm..lddlm.",
        "...lddm...ldddm.",
        "....mm.....lddm.",
        "............mm..",
        "................",
        "....llll........",
        "...lddddLm......",
        "...ldddddm......",
        "....lddddm......",
        ".....mmm........",
        "..lll...........",
        "..lddm..........",
        "...mm...........",
    ]
    # Tepe noktalari: kristalin en cok isik alan tek pikseli.
    parlak = [(3, 2), (12, 3), (5, 9)]
    # Curuk lekeleri: "bozulmus maden" hissi.
    curuk = [(9, 1), (14, 7), (1, 7), (13, 10), (2, 11), (8, 13),
             (10, 14), (7, 15), (0, 4), (15, 12), (6, 6), (11, 8)]

    TABAN     = (49, 49, 54)     # #313136  deepslate ana gri
    TABAN_KOY = (37, 37, 41)     # #252529  koyu benek
    TABAN_ACK = (60, 60, 66)     # #3c3c42  acik benek
    CURUK     = (33, 38, 33)     # yesile calan bozulma
    ICI       = (20, 94, 83)     # #145e53  elmasin en koyu tonu
    KENAR     = (32, 197, 181)   # #20c5b5
    ISIK      = (74, 237, 217)   # #4aedd9  ANA ELMAS RENGI
    TEPE      = (161, 251, 232)  # #a1fbe8

    px = {}
    for x in range(16):
        for y in range(16):
            n = (x * 7 + y * 13) % 6
            px[(x, y)] = (TABAN_KOY if n < 2 else
                          TABAN_ACK if n > 4 else TABAN) + (255,)
    for (cx, cy) in curuk:
        px[(cx, cy)] = CURUK + (255,)
    for y, satir in enumerate(sekil):
        for x, c in enumerate(satir):
            if c == "d":
                px[(x, y)] = ICI + (255,)
            elif c == "m":
                px[(x, y)] = KENAR + (255,)
            elif c == "l":
                px[(x, y)] = ISIK + (255,)
            elif c == "L":
                px[(x, y)] = TEPE + (255,)
    for (bx, by) in parlak:
        px[(bx, by)] = TEPE + (255,)
    return px


def mezar_tasi_dokusu():
    """Neredeyse siyah, catlakli tas. Asa dokusunun rengiyle
    ayni aileden (kullanicinin cizdigi asa (8,10,15))."""
    ana = (26, 24, 32)
    px = {}
    for x in range(16):
        for y in range(16):
            k = 0.85 + ((x * 5 + y * 11) % 4) * 0.05
            px[(x, y)] = golge(ana, k) + (255,)
    for (cx, cy) in [(2, 1), (2, 2), (3, 3), (3, 4), (4, 5), (9, 2), (9, 3),
                     (10, 4), (10, 5), (11, 6), (5, 10), (6, 11), (6, 12),
                     (13, 9), (13, 10), (12, 11)]:
        px[(cx, cy)] = (10, 9, 14, 255)
    return px


def dismont_esya_dokusu():
    """Kesilmis kristal: mor, ortasi parlak."""
    px = {}
    sekil = [
        "......xx........",
        ".....xoox.......",
        "....xoooox......",
        "...xooOOoox.....",
        "..xooOOOOoox....",
        "..xoOOOOOOox....",
        "...xoOOOOox.....",
        "....xoOOox......",
        "....xooOox......",
        ".....xoox.......",
        ".....xoox.......",
        "......xx........",
        "................",
        "................",
        "................",
        "................",
    ]
    renk = {"x": (58, 26, 92, 255), "o": (128, 62, 194, 255),
            "O": (196, 148, 255, 255)}
    for y, satir in enumerate(sekil):
        for x, c in enumerate(satir):
            if c in renk:
                px[(x, y)] = renk[c]
    return px


def png_yaz(yol, en, boy, pikseller):
    """pikseller: (x, y) -> (r, g, b, a) sozlugu. Yoksa saydam."""
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    ham = bytearray()
    for y in range(boy):
        ham.append(0)
        for x in range(en):
            r, g, b, a = pikseller.get((x, y), (0, 0, 0, 0))
            ham += bytes((r, g, b, a))

    def parca(tip, veri):
        g = tip + veri
        return struct.pack(">I", len(veri)) + g + struct.pack(">I", zlib.crc32(g))

    with open(yol, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(parca(b"IHDR", struct.pack(">IIBBBBB", en, boy, 8, 6, 0, 0, 0)))
        f.write(parca(b"IDAT", zlib.compress(bytes(ham), 9)))
        f.write(parca(b"IEND", b""))


def golge(renk, k):
    return tuple(max(0, min(255, int(c * k))) for c in renk)


def toprak_dokusu():
    """Toprak Kol -- gonderilen gorsele gore.

    Koyu, neredeyse siyah bir zemin uzerinde duzensiz TOPRAK
    lekeleri ve birkac koyu kirmizi vurgu. Diger kollarin duz
    renginden bilerek ayri: bu kolun bes yetenegi var, envanterde
    ilk bakista ayirt edilmesi lazim.

    Desen sabit bir tohumla uretiliyor (random degil) -- her
    calistirmada ayni doku ciksin, git'te gereksiz degisiklik
    gorunmesin.
    """
    # Gonderilen gorsele gore: kirmizi vurgular KALDIRILDI.
    # Sadece toprak tonlari -- koyu kahve zemin uzerinde acik
    # ve orta kahve lekeler, arada tek tuk gri tas parcasi.   
    KOYU   = (74, 50, 32)      # koyu kahve zemin
    TOPRAK = (134, 96, 62)     # toprak
    ACIK   = (176, 126, 84)    # acik toprak
    ENACIK = (198, 150, 104)   # en acik leke
    TAS    = (128, 128, 132)   # tek tuk gri tas

    p = {}
    for y in range(16, 32):
        for x in range(40, 56):
            # Yuz kenarlarini koyulastir: kup kenarlari belli olsun
            kenar = x in (40, 44, 48, 52) or x in (43, 47, 51, 55)

            # Tohumlu sozde-rastgele: ayni (x,y) hep ayni sonucu verir
            h = (x * 73856093) ^ (y * 19349663)
            h = (h >> 4) & 0xFF

            if h < 70:
                renk = TOPRAK
            elif h < 110:
                renk = ACIK
            elif h < 128:
                renk = ENACIK
            elif h < 132:
                renk = TAS
            else:
                renk = KOYU

            if kenar:
                renk = golge(renk, 0.6)
            if y < 18:                      # omuz tarafi daha koyu
                renk = golge(renk, 0.75)

            p[(x, y)] = renk + (255,)
    return p


def buz_dokusu():
    """Buz Kol -- gonderilen gorsele gore: buzul mavisi, duz olmayan
    lekeli desen. Toprak koluyla ayni mantik, farkli palet."""
    KOYU  = (86, 142, 152)
    ORTA  = (126, 190, 200)
    ACIK  = (164, 214, 222)
    ENACK = (196, 232, 238)

    p = {}
    for y in range(16, 32):
        for x in range(40, 56):
            kenar = x in (40, 44, 48, 52) or x in (43, 47, 51, 55)
            h = ((x * 73856093) ^ (y * 19349663))
            h = (h >> 4) & 0xFF

            if h < 72:
                renk = ORTA
            elif h < 118:
                renk = ACIK
            elif h < 140:
                renk = ENACK
            else:
                renk = KOYU

            if kenar:
                renk = golge(renk, 0.72)
            if y < 18:
                renk = golge(renk, 0.85)
            p[(x, y)] = renk + (255,)
    return p


# Kaynagin (Bobby1545 Mod V3) kendi paleti. OLCULDU, secilmedi:
#   yumruk  #E58D3F / #E59947   (turuncu et)
#   kan     #FF0303            (taze kan)
#   diken   #390808 / #210003 / #45080C  (pihtilasmis kan)
# Kaynagin (Bobby1545 Mod V3) OLCULEN paleti. Doku artik
# kaynaktan oldugu gibi geliyor; bu sabitler yalnizca esya
# ikonunun yer tutucusu ve KOLLAR tablosu icin duruyor.
#   yumruk  #E58D3F / #E59947   turuncu et
#   kan     #FF0303             taze kan
#   diken   #390808 / #210003   pihtilasmis kan
# ---- v7.3: DOKU DA CHRIS'IN ----
# Model chris'e gecti; uv'ler chris'in dokusunu bekliyor.
# Bobby'nin `blood_arm.png`i (64x64, turuncu yumruk) burada
# kullanilsaydi pencelerin disleri dokunun bos kosesinden
# ornekleneceginden kollar duz renk cikardi.
KANLI_DOKU_DOSYA = "kns_kolluk_chris_kanli.png"
KANLI_IKON_DOSYA = os.path.join("konsey_ikon", "kns_kolluk_chris_kanli.png")

KANLI_ET   = (229, 141, 63)
KANLI_KAN  = (255, 3, 3)
KANLI_KOYU = (57, 8, 8)


def kanli_dokusu_kopyala(hedef):
    """Kaynagin doku dosyasini oldugu gibi pakete kopyalar.

    Ilk denemede kolu ELLE ciziyordum (olculen paletle). Model
    kaynagin kendi modeli olunca elle cizim anlamsizlasti:
    kaynagin uv'leri kaynagin dokusunu bekliyor, baska bir doku
    yumruklari ve kollari yanlis yerden ornekler.             """
    kaynak = os.path.join(DOKU_KAYNAK, "konsey", KANLI_DOKU_DOSYA)
    if not os.path.exists(kaynak):
        print("UYARI: Kanli Kol dokusu yok (%s)" % kaynak)
        return False
    import shutil
    shutil.copyfile(kaynak, hedef)
    return True


def varlik_dokusu(ana, vurgu):
    """64x64. Vanilla sag kol UV bolgesi (40,16)-(55,31) doldurulur.

    Kup 4x12x4, uv [40,16] -> Bedrock su seride acar:
      x 40..43 : ust/alt kapaklar
      x 44..47 : arka, 48..51 : sag, 52..55 : on... (yuz sirasi motorda)
    Hepsini ayni desenle doldurmak en guvenlisi: hangi yuz nereye
    duserse dussun tutarli gorunuyor.
    """
    p = {}
    for y in range(16, 32):
        for x in range(40, 56):
            k = 1.0
            if x in (40, 44, 48, 52):      # her yuzun sol kenari koyu
                k = 0.72
            elif x in (43, 47, 51, 55):    # sag kenari acik
                k = 1.18
            if y in (16, 17):              # omuz tarafi koyu
                k *= 0.82
            if (x + y) % 7 == 0:           # hafif damar deseni
                p[(x, y)] = vurgu + (255,)
                continue
            p[(x, y)] = golge(ana, k) + (255,)
    return p


def paket_ikonu(renk):
    """64x64 paket ikonu: renkli zemin uzerinde bir simsek."""
    p = {}
    for y in range(64):
        for x in range(64):
            k = 1.0 - (y / 64) * 0.45          # yukaridan asagi koyulasan zemin
            p[(x, y)] = golge(renk, k) + (255,)
    # Kaba bir simsek sekli
    for y in range(10, 32):
        genis = 4
        kayma = 22 - (y - 10) // 2
        for x in range(kayma, kayma + genis):
            p[(x, y)] = (255, 236, 140, 255)
    for y in range(32, 54):
        genis = 4
        kayma = 30 - (y - 32) // 2
        for x in range(kayma, kayma + genis):
            p[(x, y)] = (255, 236, 140, 255)
    for x in range(18, 34):
        p[(x, 31)] = (255, 236, 140, 255)
        p[(x, 32)] = (255, 236, 140, 255)
    return p


def iksir_ikonu(renk):
    """16x16 sise: cam govde + renkli sivi + tipa."""
    p = {}
    CAM = (196, 214, 222)
    TIPA = (128, 96, 62)
    for y in range(2, 5):                       # boyun
        for x in range(7, 9):
            p[(x, y)] = CAM + (255,)
    for x in range(6, 10):                      # tipa
        p[(x, 2)] = TIPA + (255,)
    for y in range(5, 15):                      # govde
        genis = 3 if y < 7 else 5
        for x in range(8 - genis, 8 + genis - 1):
            if x < 3 or x > 12:
                continue
            kenar = (x == 8 - genis or x == 8 + genis - 2 or y == 14)
            if kenar:
                p[(x, y)] = golge(CAM, 0.7) + (255,)
            elif y >= 7:                        # sivi seviyesi
                p[(x, y)] = (renk if (x + y) % 5 else golge(renk, 1.3)) + (255,)
            else:
                p[(x, y)] = golge(CAM, 1.05) + (255,)
    return p


# ---- Goz kaplamasinin yeri ----
# 64x64 skin'de kafanin ON YUZU x=8..15, y=8..15 karesidir.
# Kaplama o karenin TEK bir satirini boyar; gerisi saydam kalir,
# yani skin'in kendi yuzu ve goz bebegi altta gorunmeye devam eder.
#
# v4.18'e kadar burada 14 yaziyordu ve OYUNDA AGZIN YANINA
# dusuyordu. Sebep: sayi BoraLo'nun skin'inden alinmisti, oysa
# kaplama BIZIM skin'imizin gozune oturmali. Iki skin farkli:
#
#            BoraLo'nun skini      bizim skin
#   y=11     ten                   sac
#   y=12     koyu (sac/kas)        GOZ  <- goz aki + bebek
#   y=13     koyu (sac/kas)        ten
#   y=14     GOZ                   AGIZ
#
# Bizim skin'in oyun ici goruntusu piksel piksel cozulerek
# olculdu (kafa 8 satir = 138 ekran pikseli, satir basina 17.25):
#
#   y=12  ->  ekran y 121..137   goz bebegi (11,13,21)
#   y=13  ->  ekran y 139..154   duz ten    (142,87,64)
#   y=14  ->  ekran y 157..174   AGIZ       (70,39,19)  <- kaplama buradaydi
#
# Sutunlar zaten dogruydu: x=9,10 (sag goz) ve x=13,14 (sol goz).
# Sadece satir iki asagidaydi.
#
# NOT: v4.63'e kadar attachable kutusu inflate 0.52 ile
# buyutulmustu ve doku hafifce geriliyordu. v4.64'te inflate
# kaldirildi (bkz. GOZ_GEOMETRI), gerilme diye bir sey kalmadi.
#
# SKIN DEGISTIRIRSEN: gozun hangi satirda oldugunu say (kafanin
# ust kenari y=8) ve asagidaki tek sayiyi degistir. Baska hicbir
# yere dokunma.
GOZ_SATIR   = 12
GOZ_SUTUNLAR = ((9, 10), (13, 14))


# ============================================================
# GOZ KAPLAMASI -- v4.64, REFERANS TEKNIGI
#
# Kullanici: "bu modda yapilan gozler gibi, yani kullanilan
# kodlar gibi gozler yapmani istiyorum ayni sekilde ki eksik
# kalmasin."
#
# Iki referans modun gozleri de acilip olculdu. Ikisi de AYNI
# fikri kuruyor, sadece farkli yollardan:
#
#   best StarOxine mod
#     doku 1920x1920 (64'un 30 kati), geometri texture_width 64
#     -> yani duzen 64'lukken DOSYA 30 kat cozunurluklu.
#     Cizim: gozun yerinde DOLU bir dikdortgen, ustunden ALEV
#     GIBI SACAKLAR yukseliyor, cevresinde yumusak bir HALE.
#     malzeme: entity_alphablend (halenin ara tonlari icin sart)
#     kutu:    kafayla ayni boy, z=-4.2 (inflate YOK)
#
#   Element Iksiri modu V2
#     6x4'luk DUZ bir levha, texture_width 6 / height 5,
#     inflate 1. Cizim ayni fikir: dolu dikdortgen + ustunden
#     yukselen buz kristali (sol goz) ve alev (sag goz).
#
# Ortak nokta ve asil fikir su:
#   GOZ = dolu cekirdek + ustunden yukselen sacak + hale
# Bizde v4.63'e kadar sadece "dolu cekirdek" vardi: goz basina
# iki piksel, hale yok, sacak yok. Eksik olan buydu.
#
# BIZIM UYARLAMAMIZ (neden birebir kopya degil):
#   - Cekirdegin YERI degismedi. GOZ_SATIR/GOZ_SUTUNLAR bizim
#     skinimize gore olculmustu; referansin gozu kendi skinine
#     gore 3 satir asagida. Yeri kopyalasak goz yanaga kayardi
#     (v4.18'de tam bu hata yasandi).
#   - Referansin dokusu 30 kat (1920x1920 = 15 MB ekran karti
#     bellegi, TEK doku icin). Bizde 16 goz dokusu var; 30 kat
#     240 MB eder, tablette kabul edilemez. 8 kat secildi.
#   - Referansin duzeni "levha" degil "kafa kutusu" olani
#     alindi: levha yandan bakinca kayboluyor.
#
# GOZ_OLCEK tek sayi: buyutmek/kucultmek icin sadece burayi
# degistir. Bellek maliyeti: 16 doku x (64*OLCEK)^2 x 4 bayt.
#   OLCEK 4  ->  4 MB    kaba sacak
#   OLCEK 8  -> 16 MB    su anki secim
#   OLCEK 16 -> 67 MB    tablette riskli
# ============================================================
# v7.13: 8 -> 12, sonra kullanici istegiyle 13.
# Once 8'den 12'ye cikildi: deneme render'larinda alev
# dillerinin 8'de KOSELI kaldigi goruldu -- bir dilin tabani
# ancak 1-2 alt piksel oluyordu, incelme kademesi yoktu.
#
#   OLCEK  8 ->  512x512, 16 doku =  16 MB
#   OLCEK 12 ->  768x768           =  36 MB
#   OLCEK 13 ->  832x832           =  42 MB   <- su anki
#   OLCEK 16 -> 1024x1024          =  67 MB   (tablette riskli)
#
# Depolama sorun degil (kullanicinin kurali: grafik detayindan
# odun verme) ama EKRAN KARTI BELLEGI oyle degil.
#
# ---- NEDEN 13, NEDEN 780 DEGIL ----
# Kullanici "768 yerine 780x780 yapabilir misin" dedi. Yapilmadi
# ve sebebi bayt degil, HIZALAMA:
#     780 / 64 = 12.1875   ondalik
# Goz cekirdegi x 109.6875..134.0625'e dusuyor, yani kenar bir
# dokunun ORTASINDA bitiyor. Oyun orayi orneklerken kenarda
# yarim yanan bulanik bir sutun cikiyor -- v4.2'de iki surum
# suren hatanin ayni sinifi. Ustelik mipmap: 768 ikiye 8 kez
# tam bolunuyor, 780 yalnizca 2 kez; uzaktan goz bozuluyor.
#
# 780'in ustundeki ilk TAM BOLUNEN sayi 832 (13x64). Istegin
# ruhu -- daha buyuk bir goz -- boylece bozmadan karsilandi.
GOZ_OLCEK = 13
GOZ_DOKU  = 64 * GOZ_OLCEK          # 832x832

# Asagidakiler ALT PIKSEL cinsinden (1 Minecraft pikseli =
# GOZ_OLCEK alt piksel). Oranlar referanstan olculdu:
# cekirdegin ustunde ~1 MC piksel sacak, ~0.4 MC piksel hale.
# Hale ve sacak OLCEK'e ORANTILI. Sabit sayi olsalardi
# cozunurluk artinca goze gore KUCULURLERDI -- yani daha
# detayli ama daha sonuk bir goz cikardi, tam tersi istendigi
# halde.
GOZ_HALE   = max(3, int(GOZ_OLCEK * 0.62))   # halenin yaricapi
# 1.9 -> 2.6: OLCEK 12'de hale buyudu ve iki gozun arasini
# doldurdu. Yatay daralma da onunla birlikte artmali.
GOZ_HALE_YATAY = 2.6                # hale yatayda bu kat DAHA DAR
GOZ_SACAK  = GOZ_OLCEK + 1          # en uzun sacagin boyu
GOZ_SACAK_ADET = 5                  # goz basina sacak sayisi
GOZ_KIVILCIM = 2                    # sacaklarin ustundeki kopuk zerre


def goz_renkleri(gozRenk):
    """IKSIRLER'deki goz rengini HER ZAMAN iki renge cevirir.

    (r,g,b)            -> ayni renk iki kez
    ((r,g,b),(r,g,b))  -> oldugu gibi

    Neden: Element iksirinin bir gozu buz, obur gozu ates (v4.63,
    referans moddan olculdu). Tek renk varsayimi tabloya gomulu
    olsaydi bunun icin her cagri yerini elle degistirmek gerekirdi.
    """
    return tuple(gozRenk) if isinstance(gozRenk[0], (tuple, list)) \
        else (tuple(gozRenk), tuple(gozRenk))


def _uretec(tohum):
    """Kucuk, DETERMINIST sozde-rastgele uretec.

    Neden random modulu degil: sacaklarin yeri her uretimde ayni
    cikmali. Aksi halde `python3 kol_uret.py` her kosuda 16
    dokuyu degistirir, git farki surekli kirlenir ve testin bayt
    karsilastirmasi anlamsizlasir. Python'un hash()'i de surec
    basina rastgeleleniyor -- crc32 oyle degil, sabit.        """
    durum = zlib.crc32(tohum.encode("utf-8")) & 0x7FFFFFFF

    def sonraki(n):
        nonlocal durum
        durum = (durum * 1103515245 + 12345) & 0x7FFFFFFF
        return durum % n if n > 0 else 0

    return sonraki


def _kat(p, x, y, renk, alfa):
    """Bir alt pikseli boyar; ustuste gelenlerde EN PARLAK olan
    kazanir. Toplama yapilmiyor: sacak halenin ustunden gecerken
    alfa 255'i asip tasmasin, kenarlar kirlenmesin."""
    if alfa <= 0:
        return
    alfa = min(255, int(alfa))
    eski = p.get((x, y))
    if eski and eski[3] >= alfa:
        return
    p[(x, y)] = tuple(renk) + (alfa,)


def _karis(a, b, o):
    """Iki renk arasinda dogrusal gecis (o: 0..1)."""
    o = 0.0 if o < 0 else (1.0 if o > 1 else o)
    return tuple(int(round(a[i] + (b[i] - a[i]) * o)) for i in range(3))


def _goz_govdesi(p, x0, x1, y0, y1, renk, tohum, guc=1.0):
    """TEK bir gozu cizer.

    ---- v7.13: BASTAN CIZILDI ----
    Kullanici: "iksirleri ictikten sonra gozlerde alev gibi bir
    sey yaniyordu ya, onu daha detayli yap; diger guclere gore
    biraz sonuk kaliyor gorsel olarak."

    Hakliydi ve render'a bakinca sebebi tek tek goruldu:
      1. Cekirdek DUZ bir levhaydi -- tek renk, ic yapi yok.
         Yanan bir goz degil, renkli bir cikartma gibi duruyordu.
      2. Sacaklar cekirdegin ustunde 1-2 alt piksellik CIKINTI
         kadardi ve ayni renkte oldugu icin ust kenara
         karisiyordu. Alev degil, tirtikli kenar.
      3. Hale cok zayifti, altta skinin koyu pikselleri yiyordu.
      4. Kivilcimlar KOPUK iki noktaydi -- alevle bagi yok,
         toz gibi duruyordu.
      5. Sicak merkez yoktu. Gercek bir alevde ic beyaza yakin,
         renk KENARDA olur; burada her yer ayni tondaydi.

    Simdiki katmanlar (asagidan yukari cizilme sirasi):
        0 dis hale -> 1 cekirdek (radyal + dikey gecisli)
        2 ic turbulans -> 3 alev dilleri (savrulan, sivri)
        4 kor izi -> 5 alta sizan isik

    x0..x1 / y0..y1 ALT PIKSEL cinsinden cekirdegin siniri
    (x1, y1 disarida).
    guc: lazer varyantinda 1'den buyuk -- diller uzuyor, hale
    genisliyor, merkez daha cok beyazliyor. Sekil ayni kaliyor
    ki iki varyant ayni goz gibi dursun.                      """
    rast = _uretec(tohum)
    genis = x1 - x0
    boy_c = y1 - y0
    mx = (x0 + x1 - 1) / 2.0
    my = (y0 + y1 - 1) / 2.0

    # Uc tonlu kademe: soguk kenar -> renk -> sicak merkez.
    # Beyaza gitme orani GUCE bagli: lazer varyantinda merkez
    # daha cok beyazlıyor, "sesi acilmis" hissi oradan geliyor.
    # 0.52 fazlaydi: goz_ates ve lazer varyanti KREM RENGI
    # cikiyordu, ates olduklari okunmuyordu (render, deneme 1).
    # Renk kimligi cekirdekte kalmali, beyaz yalniz merkezde.
    sicak = _karis(renk, (255, 255, 255), min(0.62, 0.34 * guc))
    soguk = _karis(renk, (0, 0, 0), 0.30)

    # ---- 0. DIS HALE ----
    # Once ciziliyor ki ustune gelen her sey onu ezsin.
    # YATAYDA DAHA DAR (GOZ_HALE_YATAY). Sebep: iki goz arasinda
    # 2 MC pikseli var; daire hale o araligi doldurunca iki goz
    # TEK BIR VIZOR gibi goruluyor -- v4.18'de "gozluk gibi
    # durdu" diye kaldirilan seyin aynisi.
    yari = GOZ_HALE * guc
    tara = int(yari) + 2
    for y in range(y0 - tara, y1 + tara):
        for x in range(x0 - tara, x1 + tara):
            if x0 <= x < x1 and y0 <= y < y1:
                continue
            dx = 0 if x0 <= x < x1 else (x0 - x if x < x0 else x - x1 + 1)
            dy = 0 if y0 <= y < y1 else (y0 - y if y < y0 else y - y1 + 1)
            uzak = ((dx * GOZ_HALE_YATAY) ** 2 + dy * dy) ** 0.5
            if uzak > yari:
                continue
            o = uzak / (yari + 1.0)
            # Hale de renk kaymali: dibinde sicak, ucunda soguk.
            # Tepe alfa 235 iken iki goz ARASI (x=11,12) 154'e
            # cikiyordu ve doku.mjs'in "iki gozu birlestirmiyor"
            # satiri dustu -- sinir 150. Bu, v4.18'de "gozluk
            # gibi durdu" diye kaldirilan seyin ta kendisi.
            # Tepe alfa dusuruldu; yayilim yukari-asagi devam
            # ediyor cunku daralma yalniz YATAYDA.
            _kat(p, x, y, _karis(sicak, soguk, o ** 0.7),
                 200 * (1 - o) ** 1.7)

    # ---- 1. CEKIRDEK: kimlik bandi + sicak tepe ----
    #
    # ---- BURADA BIR GERILEME YASANDI, TEST YAKALADI ----
    # Ilk yazimda cekirdegin TAMAMI merkezden kenara beyaza
    # giden bir gecisti. doku.mjs dustu:
    #   "goz_element sol goz cekirdegi olculen renkte
    #    -> 92,230,255 != 56,225,255"
    # Yani gozun rengi artik ictigin iksirin rengi DEGILDI.
    # O renkler referans modlardan olculmustu; gozun kimligi o.
    # Ayrica lazer varyanti da beyaza kaciyordu ("lazeri
    # rengini koruyor" satiri, beyazlik 0.54 / 0.18).
    #
    # Cozum kural haline getirildi: cekirdegin ORTA BANDI
    # iksirin rengidir, DOKUNULMAZ. Isi ve doku yalniz ust ve
    # alt kenarda -- ki alev zaten tepeden cikiyor, orasi
    # fiziksel olarak da daha sicak.
    bant_ust = y0 + boy_c * 0.32
    bant_alt = y1 - boy_c * 0.32
    for y in range(y0, y1):
        kimlik = bant_ust <= y < bant_alt
        yukari = 1.0 - (y - y0) / max(1.0, boy_c - 1.0)   # 1 ust, 0 alt
        # Banda uzaklik: gecis ani olmasin, kenara dogru acilsin.
        d_bant = 0.0 if kimlik else (
            (bant_ust - y) / max(1.0, boy_c * 0.32) if y < bant_ust
            else (y - bant_alt + 1) / max(1.0, boy_c * 0.32))
        for x in range(x0, x1):
            if kimlik:
                _kat(p, x, y, renk, 255)
                continue
            dxn = abs(x - mx) / max(1.0, genis / 2.0)
            # Kenarlarda daha az isi: alev ORTADAN yukselir.
            o = min(1.0, d_bant) * (1.0 - 0.45 * dxn)
            hedef = sicak if yukari > 0.5 else soguk
            _kat(p, x, y, _karis(renk, hedef, 0.55 * o), 255)

    # ---- 2. IC TURBULANS ----
    # Cekirdekte birkac koyu/parlak hucre: alev ic ice
    # kivriliyor gibi dursun. Az sayida ve KUCUK -- fazlasi
    # gozu kirli gosteriyor.
    hucre = max(2, genis // 3)
    for _ in range(hucre):
        hx = x0 + rast(max(1, genis))
        hy = y0 + rast(max(1, boy_c))
        # Yaricap kucuk ve karisim zayif: deneme 1'de hucreler
        # YUVARLAK NOKTA olarak goruluyordu (goz_element'te
        # acikca). Doku olmali, benek degil.
        r = 1 + rast(max(1, GOZ_OLCEK // 6))
        koyu = rast(2) == 0
        for yy in range(hy - r, hy + r + 1):
            for xx in range(hx - r, hx + r + 1):
                if not (x0 <= xx < x1 and y0 <= yy < y1):
                    continue
                # Kimlik bandi dokunulmaz (yukaridaki nota bak).
                if bant_ust <= yy < bant_alt:
                    continue
                d = ((xx - hx) ** 2 + (yy - hy) ** 2) ** 0.5
                if d > r:
                    continue
                o = 1.0 - d / (r + 0.001)
                eski = p.get((xx, yy))
                taban = eski[:3] if eski else renk
                c = _karis(taban, soguk if koyu else sicak, 0.22 * o)
                p[(xx, yy)] = tuple(c) + (255,)

    # ---- 3. ALEV DILLERI ----
    # Eski hali: esit arali, duz yukari, cekirdek renginde,
    # GOZ_OLCEK+1 boyunda -- yani cekirdegin ustunde bir tirtik.
    # Yenisi: daha uzun, SAVRULAN (her adimda yana kayiyor),
    # sivrilen ve UCU BEYAZLASAN diller. Ortadakiler en uzun:
    # alev ortadan yukselir, kenarlardan degil.
    for i in range(GOZ_SACAK_ADET):
        sx = x0 + int((i + 0.5) * genis / GOZ_SACAK_ADET) + rast(3) - 1
        sx = max(x0, min(x1 - 1, sx))
        # Ortadan uzakliga gore kisalma: kenardaki diller kisa.
        orta = 1.0 - abs(sx - mx) / max(1.0, genis / 2.0)
        boy = int(GOZ_SACAK * guc * (0.55 + 1.05 * orta)
                  * (0.75 + rast(50) / 100.0))
        # ONDALIK birakiliyor: int() ile kirpilinca hem OLCEK 8
        # hem 12 ayni "1" degerini veriyordu, yani cozunurluk
        # artmasina ragmen diller INCELMIS gibi goruluyordu --
        # deneme 3'te sac teli gibi ciktilar. Cizim zaten
        # ondalik kalinlikla calisiyor (kalin/gk).
        taban = GOZ_OLCEK * (0.15 + 0.11 * orta)
        # 0.45 -> 0.28: fazla savrulan dil alev degil SAC TELI
        # gibi okunuyordu (render, deneme 3).
        savrul = (rast(3) - 1) * 0.28      # dilin egilme yonu
        x_kay = 0.0
        for k in range(boy):
            y = y0 - 1 - k
            o = k / float(max(1, boy))
            x_kay += savrul * (0.25 + o)    # yukari ciktikca daha cok savrul
            kalin = taban * (1.0 - o) ** 0.8
            # Uc beyazlasiyor: alevin sicak ucu.
            c = _karis(renk, sicak, o ** 1.4)
            alfa = 255 * (1 - o) ** 1.15
            gk = int(round(kalin))
            for dx in range(-gk, gk + 1):
                kenar = abs(dx) / (kalin + 0.001)
                _kat(p, int(round(sx + x_kay)) + dx, y,
                     _karis(c, soguk, 0.35 * kenar),
                     alfa * (1 - 0.45 * kenar))

    # ---- 4. KOR IZI ----
    # Eski hali iki kopuk noktaydi ve toz gibi duruyordu.
    # Yenisi: dillerin devami gibi yukari suzulen, kuculerek
    # sonen zerreler. Ayni sutunda basliyorlar ki alevden
    # KOPMUS olduklari okunsun.
    # Deneme 1'de zerreler GOZ_OLCEK//10 yaricapli DOLU
    # dairelerdi ve patlamis misir gibi duruyordu. Kivilcim
    # tek alt piksel olmali; cokluk sayida gelir, buyuklukten
    # degil. Sayi artti, boyut 1'e indi, alfa dustu.
    # *4 fazlaydi: korlar gozun ustunde KAR TANESI gibi bir
    # tabaka olusturuyordu (render, deneme 2). Kivilcim seyrek
    # olur; cokluk hissi yukselerek SONMEKTEN gelir.
    for _ in range(GOZ_KIVILCIM * 2):
        kx = x0 + rast(max(1, genis))
        ky = y0 - int(GOZ_SACAK * guc * 0.75) - rast(max(1, GOZ_OLCEK))
        n = 2 + rast(4)
        for j in range(n):
            yy = ky - j * max(1, GOZ_OLCEK // 3) - rast(2)
            xx = kx + (rast(3) - 1)
            _kat(p, xx, yy, _karis(sicak, renk, j / float(n)),
                 150 * (1 - j / float(n + 0.6)) ** 2.2)

    # ---- 5. ALTA SIZAN ISIK ----
    # Neden asagi: goz satirinin USTU bizim skinimizde sac
    # (y=11), isik orada kayboluyor; ALTI duz ten (y=13).
    # v7.13'te derinlesti ve KENARLARI daralan bir huzme oldu --
    # eskisi duz bir serit halinde "lekelenmis" duruyordu.
    derin = max(2, int(GOZ_OLCEK * 0.85 * guc))
    for y in range(y1, y1 + derin):
        o = (y - y1) / float(derin)
        daralt = int(round(o * genis * 0.28))
        for x in range(x0 + daralt, x1 - daralt):
            kenar = abs(x - mx) / max(1.0, genis / 2.0)
            _kat(p, x, y, _karis(renk, soguk, 0.25 + 0.35 * o),
                 170 * (1 - o) ** 1.35 * (1 - 0.4 * kenar))


def _goz_ciz(gozRenk, tohum, guc=1.0):
    """Iki gozu de cizip alt piksel sozlugunu dondurur.

    GOZ_SUTUNLAR sirasiyla renkler eslesir: ilk renk x=9,10
    (doku uzayinda SOL goz), ikincisi x=13,14. Element iksirinin
    bir gozu buz, obur gozu ates -- bu yuzden goz basina ayri.
    """
    p = {}
    for i, ((sol, sag), renk) in enumerate(
            zip(GOZ_SUTUNLAR, goz_renkleri(gozRenk))):
        _goz_govdesi(
            p,
            sol * GOZ_OLCEK, (sag + 1) * GOZ_OLCEK,
            GOZ_SATIR * GOZ_OLCEK, (GOZ_SATIR + 1) * GOZ_OLCEK,
            renk, tohum + ":" + str(i), guc,
        )
    return p


def goz_dokusu(gozRenk, tohum):
    """Kafa dokusu (GOZ_DOKU x GOZ_DOKU). Yalnizca gozun cevresi
    boyanir, gerisi TAMAMEN SAYDAM kalir -- skin'in yuzu altta
    gorunmeye devam eder."""
    return _goz_ciz(gozRenk, tohum, 1.0)


def lazer_goz_dokusu(gozRenk, tohum, kimlik=None):
    """Lazer atarken kisa sureligine gecilen parlak varyant.

    kimlik: gozun adi ("goz_kan" gibi). Yalnizca LAZER_ISIN_RENK
    aramasinda kullaniliyor -- iki kirmizinin ayrilmasi icin.
    Verilmezse tohum kullaniliyor (cagiran taraf ikisine de ayni
    degeri veriyor).

    AYNI goz, "sesi acilmis" hali: renk beyaza cekilmis,
    sacaklar uzamis, hale genislemis. Tohum ayni -- sacaklar
    ayni yerde duruyor, yoksa lazer aninda goz bambaska bir
    goze donusmus gibi zipliyordu.                             """
    # Beyaza cekme 0.6 iken butun gozler ayni krem rengine
    # dusuyordu -- lazer aninda hangi iksiri ictigin
    # anlasilmiyordu. 0.32 rengi koruyor, guc (sacak boyu ve
    # hale genisligi) farki zaten "acildi" hissini veriyor.
    parlaklar = tuple(
        tuple(min(255, int(c + (255 - c) * 0.32)) for c in renk)
        for renk in goz_renkleri(gozRenk)
    )
    p = _goz_ciz(parlaklar, tohum, 1.8)

    # ---- ISIN RENK YAMASI (v4.73) ----
    # Isin kutularinin her yuzu LAZER_ISIN_UV noktasindaki
    # 2x2'lik duz renge bakiyor. Doku 512x512 ama UV uzayi
    # 64'luk, yani yama GOZ_OLCEK katinda cizilmeli.
    #
    # Renk gozun parlak hali: isin hangi iksirse onun renginde
    # cikiyor. Element'in iki modu icin sol/sag isin ayri renk
    # oluyor -- iki goz zaten ayri renkte.
    #
    # ---- v4.75: YAMA ARTIK "parlaklar"DAN GELMIYOR ----
    # Beyaza cekilmis renk gozde dogru, isinda soluk. Isin
    # gozun DOYGUN halini kullaniyor (bkz. isin_rengi ve
    # ustundeki olcum notu). Kaynak da parlaklar degil,
    # gozun HAM rengi -- yoksa beyazlatma iki kez binerdi.
    #
    # ALFA: entity_emissive dokunun alfasini parlaklik
    # maskesi sayiyor, saydamlik degil. Dusuk alfa = cok
    # parlama. Yama gozun UV alanindan UZAKTA (0,20), yani
    # bu alfa gozun kendisini etkilemiyor.
    #
    # ELLE VERILEN RENK (v4.76): iki kirmizinin tonu birebir
    # ayni oldugu icin doygunlastirma onlari ayni renge
    # dusuruyordu. LAZER_ISIN_RENK'te karsiligi olan gozler
    # hesaplanmis rengi degil o degeri kullaniyor.
    # Tek gozluk override iki isini da boyar; iki gozu ayri
    # renk olan tek iksir Element ve onun bir karsiligi yok.
    ux, uy = LAZER_ISIN_UV
    isin_alfa = LAZER_ISIN_ALFA if LAZER_ISIN_PARLAK else 255
    elle = LAZER_ISIN_RENK.get(kimlik if kimlik is not None else tohum)
    for i, ham in enumerate(goz_renkleri(gozRenk)):
        # Iki goz iki ayri 2x2 yama: sol goz UV'de solda.
        gx = (ux + i * 2) * GOZ_OLCEK
        gy = uy * GOZ_OLCEK
        yama = (elle if elle is not None else isin_rengi(ham)) + (isin_alfa,)
        for yy in range(gy, gy + 2 * GOZ_OLCEK):
            for xx in range(gx, gx + 2 * GOZ_OLCEK):
                p[(xx, yy)] = yama
    return p


def goz_ikonu(gozRenk):
    """Gozun ENVANTER ikonu: 16x16, iki goz.

    v4.63'e kadar burada esya_ikonu() cagriliyordu, yani 16
    gozun hepsi envanterde RENKLI BIR KOL olarak goruluyordu --
    hangisi hangi iksirin gozu, ancak adindan anlasiliyordu.

    Referansin ikonu (dy_staroxine_goz.png) piksel piksel
    cozuldu, iki 3x2 blok:
        y= 9  ....###..###....
        y=10  ....###..###....
    Ayni duzen alindi; ustune bizim gozumuzun kimligi olan
    yumusak hale bir piksellik halka olarak eklendi.          """
    p = {}
    renkler = goz_renkleri(gozRenk)
    for bx, renk in zip((4, 9), renkler):
        # Cekirdek: referanstaki 3x2 blogun aynisi
        for y in (9, 10):
            for x in range(bx, bx + 3):
                p[(x, y)] = tuple(renk) + (255,)
        # Ustunde iki sacak, altinda bir sizinti.
        # HALE YOK ve YANLARA HICBIR SEY YOK: 16x16'da bir
        # piksellik yan hale bile iki gozu birlestirip tek bir
        # vizor cubugu haline getiriyor (dokuda da ayni tuzak
        # vardi, GOZ_HALE_YATAY notuna bak).
        p[(bx, 8)] = tuple(renk) + (210,)
        p[(bx + 2, 8)] = tuple(renk) + (150,)
        for x in range(bx, bx + 3):
            p[(x, 11)] = tuple(renk) + (95,)
    return p


def esya_ikonu(ana, vurgu):
    """16x16 envanter ikonu: dikey duran basit bir kol silueti."""
    p = {}
    for y in range(2, 15):
        for x in range(5, 11):
            kenar = (x == 5 or x == 10 or y == 2 or y == 14)
            if kenar:
                p[(x, y)] = golge(ana, 0.55) + (255,)
            elif x == 6:
                p[(x, y)] = golge(ana, 1.2) + (255,)
            else:
                p[(x, y)] = ana + (255,)
    # bilek bandi -- kollar birbirinden ayirt edilsin
    for x in range(5, 11):
        p[(x, 5)] = vurgu + (255,)
        p[(x, 6)] = golge(vurgu, 0.8) + (255,)
    return p


# ------------------------------------------------------------------ ana
def manifestleri_yaz():
    """BP ve RP manifestlerini SURUM_NO'dan yazar.

    Bu ikisi eskiden ELLE tutuluyordu ve tam bu yuzden kacti:
    v7.9'da [7,9,0] yazildi, yedi surum boyunca guncellenmedi
    ve kullanici oyunda dordunu de ayni gordu.

    UUID'ler ve modul yapisi AYNEN korunuyor -- degisen yalnizca
    ad, aciklama ve surum. UUID degisseydi oyun paketi YENI bir
    paket sayar ve kullanicinin dunyasindaki kurulum kopardi.  """
    for kok, anahtar in ((BP, "bp"), (RP, "rp")):
        yol = os.path.join(kok, "manifest.json")
        d = json.load(open(yol, encoding="utf-8"))
        d["header"]["name"] = PAKETLER[anahtar][0]
        d["header"]["description"] = PAKETLER[anahtar][1]
        d["header"]["version"] = list(SURUM_NO)
        for m in d.get("modules", []):
            m["version"] = list(SURUM_NO)
        yaz_json(yol, d)


def surumu_scripte_yaz():
    """ayarlar.js'teki SURUM satirini SURUM_NO'ya esitler.

    Oyun ici surum yazisi ile paket surumu ayrisamasin diye:
    ikisi de buradan geliyor.                                 """
    yol = os.path.join(BP, "scripts/ayarlar.js")
    metin = open(yol, encoding="utf-8").read()
    yeni, n = re.subn(r'export const SURUM = "[^"]*";',
                      'export const SURUM = "%s";' % SURUM_ETIKET,
                      metin, count=1)
    if n != 1:
        print("UYARI: ayarlar.js'te SURUM satiri bulunamadi.")
        return
    if yeni != metin:
        open(yol, "w", encoding="utf-8").write(yeni)


def main():
    manifestleri_yaz()
    surumu_scripte_yaz()
    dokular = {}
    en_us, tr_tr = [], []

    for kimlik, _yetenek, ad, ana, vurgu in KOLLAR:
        yaz_json(os.path.join(BP, "items", kimlik + ".json"), esya(kimlik, ad))
        # Kanli Kol'un kendi geometrisi var (dikenler); digerleri
        # geometry.simsek_kol'u paylasiyor.
        # Iki kanli kolun da KENDI geometrisi var (dikenler /
        # yumruklar); digerleri geometry.simsek_kol'u paylasiyor.
        _geo = {"kol_kanli": "geometry.simsek_kol_kanli",
                "kol_kanli_bobby": "geometry.simsek_kol_kanli_bobby"}.get(
                    kimlik, "geometry.simsek_kol")
        yaz_json(os.path.join(RP, "attachables", kimlik + ".json"),
                 attachable(kimlik, _geo))

        if kimlik == "kol_toprak":
            doku = toprak_dokusu()
        elif kimlik == "kol_buz":
            doku = buz_dokusu()
        elif kimlik == "kol_kanli":
            # Yer tutucu: kaynak doku yoksa kol yine gorunsun.
            doku = varlik_dokusu(ana, vurgu)
        else:
            doku = varlik_dokusu(ana, vurgu)
        png_yaz(os.path.join(RP, "textures/entity", kimlik + ".png"), 64, 64, doku)
        png_yaz(os.path.join(RP, "textures/item", kimlik + ".png"), 16, 16,
                esya_ikonu(ana, vurgu))
        # Kanli Kol'un dokusu kaynagin KENDI dokusu: model de
        # kaynagin modeli, uv'ler o dokuyu bekliyor.
        if kimlik == "kol_kanli":
            kanli_dokusu_kopyala(os.path.join(RP, "textures/entity",
                                              kimlik + ".png"))
        elif kimlik == "kol_kanli_bobby":
            # Bobby'nin dokusu da KAYNAGIN kendi dokusu: model
            # onun modeli, uv'ler o dokuyu bekliyor. Chris'in
            # dokusu buraya konsaydi yumruklar dokunun bos
            # kosesinden ornekleneceginden duz renk cikardi.
            kaynak_doku_kopyala(
                os.path.join("konsey", KANLI_BOBBY_DOKU_DOSYA),
                os.path.join(RP, "textures/entity", kimlik + ".png"))
        # Kanli Kol'un ikonu kaynagin KENDI ikonu (kirmizi capraz
        # diken). Uretilen ikon kolun on yuzunden turuyor ve
        # cizdirilince siyah bir zeminde tek kirmizi cizgi
        # cikiyordu -- envanterde neye baktigini anlamak zordu.
        if kimlik == "kol_kanli":
            kaynak_doku_kopyala(KANLI_IKON_DOSYA,
                                os.path.join(RP, "textures/item",
                                             kimlik + ".png"))
        elif kimlik == "kol_kanli_bobby":
            kaynak_doku_kopyala(KANLI_BOBBY_IKON_DOSYA,
                                os.path.join(RP, "textures/item",
                                             kimlik + ".png"))

        # ---- Elle cizilmis kol dokusu varsa uretileni EZ ----
        # Uretilen dokular yer tutucu (renk var, cizim yok).
        # Kullanici gercek bir doku gonderirse o kullaniliyor;
        # gondermediklerinde uretilen hali duruyor, yani hicbir
        # kol mor-siyah kalmiyor.
        kol_skin_uygula(kimlik)

        dokular[kimlik] = {"textures": "textures/item/" + kimlik}

        tam = "pa:" + kimlik
        en_us.append("item.%s.name=%s" % (tam, ad))
        en_us.append("item.%s=%s" % (tam, ad))
        tr_tr.append("item.%s.name=%s" % (tam, TR_AD[kimlik]))
        tr_tr.append("item.%s=%s" % (tam, TR_AD[kimlik]))

    # ---- Iksirler ve gozler ----
    for kimlik, ad, sivi, goz, gozRenk in IKSIRLER:
        yaz_json(os.path.join(BP, "items", "iksir_" + kimlik + ".json"),
                 iksir_esyasi(kimlik, ad))
        # Referans moddan gelen gercek ikon varsa onu kopyala,
        # yoksa uretilen siseye dus. Kopyalama sessiz olmasin:
        # dosyayi silen biri bunu paketi acmadan gormeli.
        iksir_png = os.path.join(RP, "textures/item", "iksir_" + kimlik + ".png")
        if not iksir_dokusu_kopyala(kimlik, iksir_png):
            png_yaz(iksir_png, 16, 16, iksir_ikonu(sivi))
        dokular["iksir_" + kimlik] = {"textures": "textures/item/iksir_" + kimlik}

        # Normal goz + lazer varyanti.
        # Tohum IKI VARYANTTA DA ayni (goz kimligi): sacaklar ayni
        # yerde dursun, lazer aninda goz baska bir goze donusmesin.
        for ad2, doku in ((goz, goz_dokusu(gozRenk, goz)),
                          (goz + "_lazer", lazer_goz_dokusu(gozRenk, goz, goz))):
            yaz_json(os.path.join(BP, "items", ad2 + ".json"),
                     goz_esyasi(ad2, GOZ_TR[ad2]))
            yaz_json(os.path.join(RP, "attachables", ad2 + ".json"), goz_attachable(ad2))
            png_yaz(os.path.join(RP, "textures/entity", ad2 + ".png"),
                    GOZ_DOKU, GOZ_DOKU, doku)
            # ---- ANIMASYON DENEMESI (v7.16) ----
            # Yalniz denenen goz, yalniz normal varyanti.
            # Kare 0 yukarida zaten yazildi ve tohumu
            # degismedigi icin dosya BUGUNKUYLE BIREBIR AYNI.
            if GOZ_ANIM_DENEME and ad2 == GOZ_ANIM_DENEME:
                for _k in range(1, GOZ_ANIM_KARE):
                    png_yaz(
                        os.path.join(RP, "textures/entity",
                                     "%s_k%d.png" % (ad2, _k)),
                        GOZ_DOKU, GOZ_DOKU,
                        goz_dokusu(gozRenk, goz_anim_tohumu(goz, _k)))
            png_yaz(os.path.join(RP, "textures/item", ad2 + ".png"), 16, 16,
                    goz_ikonu(gozRenk))
            dokular[ad2] = {"textures": "textures/item/" + ad2}

            for liste in (en_us, tr_tr):
                liste.append("item.pa:%s.name=%s" % (ad2, GOZ_TR[ad2]))
                liste.append("item.pa:%s=%s" % (ad2, GOZ_TR[ad2]))

        for liste, tr in ((en_us, ad), (tr_tr, IKSIR_TR[kimlik])):
            liste.append("item.pa:iksir_%s.name=%s" % (kimlik, tr))
            liste.append("item.pa:iksir_%s=%s" % (kimlik, tr))
    # ---- Bot (v4.22) ----
    yaz_json(os.path.join(BP, "entities/bot.json"), bot_sunucu_varligi())
    yaz_json(os.path.join(RP, "entity/bot.entity.json"), bot_istemci_varligi())

    # ---- Ilkel Besli: bes ayri varlik, bes ayri skin (v4.35) ----
    import shutil
    for anahtar, veri in ilkel_varliklari().items():
        yaz_json(os.path.join(BP, "entities/ilkel_%s.json" % anahtar), veri)
    for anahtar, veri in ilkel_istemci_varliklari().items():
        yaz_json(os.path.join(RP, "entity/ilkel_%s.entity.json" % anahtar), veri)
    for anahtar, dosya in ILKEL_SKIN.items():
        kaynak = os.path.join(ILKEL_SKIN_KAYNAK, dosya)
        hedef = os.path.join(RP, "textures/entity/ilkel_%s.png" % anahtar)
        if os.path.exists(kaynak):
            os.makedirs(os.path.dirname(hedef), exist_ok=True)
            shutil.copyfile(kaynak, hedef)
        elif not os.path.exists(hedef):
            # Skin bulunamadi: sessiz kalma, yoksa uye mor-siyah cizilir
            print("UYARI: %s skini bulunamadi (%s)" % (anahtar, kaynak))

    # ---- O Sey: 6 kol + cift beden (v4.88) ----
    yaz_json(os.path.join(BP, "entities/o_sey.json"), o_sey_varligi())
    yaz_json(os.path.join(RP, "entity/o_sey.entity.json"), o_sey_istemci_varligi())
    # ---- ZAMAN SAATI (v7.2) ----
    yaz_json(os.path.join(BP, "items/%s.json" % SAAT_ESYA), saat_esyasi())
    _saat_ikon = os.path.join(RP, "textures/item/%s.png" % SAAT_ESYA)
    os.makedirs(os.path.dirname(_saat_ikon), exist_ok=True)
    if not kaynak_doku_kopyala("pa_zaman_saati.png", _saat_ikon):
        print("UYARI: Zaman Saati ikonu yok -- esya mor-siyah cikar")
    dokular[SAAT_ESYA] = {"textures": "textures/item/" + SAAT_ESYA}
    for _l, _ad in ((en_us, SAAT_EN), (tr_tr, SAAT_TR)):
        _l.append("item.pa:%s.name=%s" % (SAAT_ESYA, _ad))
        _l.append("item.pa:%s=%s" % (SAAT_ESYA, _ad))

    # ---- MUTANT HALIM (v7.2) ----
    yaz_json(os.path.join(BP, "entities/o_sey_mutant.json"), mutant_varligi())
    yaz_json(os.path.join(RP, "entity/o_sey_mutant.entity.json"),
             mutant_istemci_varligi())
    # Kilik (v4.89): donusumun bedeni. Ayni geometri, ayni doku.
    yaz_json(os.path.join(BP, "entities/o_sey_kilik.json"), o_sey_kilik_varligi())
    yaz_json(os.path.join(RP, "entity/o_sey_kilik.entity.json"),
             o_sey_kilik_istemci_varligi())

    # ---- KOL TAKASI SAHNESI (v7.9) ----
    # Uc sahte varlik: iki dusen toprak kol + gelen kanli kol.
    # Geometriler ELLE YAZILMIYOR, var olan modellerden
    # turetiliyor -- Toprak Kol ya da Kanli Kol degisirse sahne
    # de kendiliginden degisir.
    #
    # `kol_gelen` KANLI GEOMETRIYE bagli: kaynak dosya yoksa
    # kanli_geometrisi() None doner. O durumda varligi yine de
    # yazmak, oyunda mor-siyah bir kup demekti; onun yerine
    # EKSIK OLDUGU RAPOR EDILIYOR (uydurma icerik yasak).
    if KOL_TAKAS_ACIK:
        _kol_kimlikleri = set(_k[0] for _k in KOLLAR)
        for _tgerek in (TAKAS_KAYNAK_KOL, TAKAS_HEDEF_KOL):
            if _tgerek not in _kol_kimlikleri:
                raise SystemExit(
                    "kol takasi: '%s' KOLLAR tablosunda yok. Kol yeniden "
                    "adlandirildiysa TAKAS_KAYNAK_KOL/TAKAS_HEDEF_KOL da "
                    "guncellenmeli -- yoksa sahne oyunda mor-siyah cikar."
                    % _tgerek)
        for _tk, _tayna, _tdoku, _tanim in (
                (TAKAS_DUSEN_SAG, False, TAKAS_KAYNAK_KOL, "dusus_sag"),
                (TAKAS_DUSEN_SOL, True, TAKAS_KAYNAK_KOL, "dusus_sol")):
            _tg = takas_dusen_geometrisi(_tk, _tayna)
            yaz_json(os.path.join(BP, "entities/%s.json" % _tk),
                     takas_varligi(_tk, True))
            yaz_json(os.path.join(RP, "models/entity/%s.geo.json" % _tk), _tg)
            yaz_json(os.path.join(RP, "entity/%s.entity.json" % _tk),
                     takas_istemci_varligi(_tk, _tdoku,
                                           "animation.kol_dusen." + _tanim))
        _tgelen = takas_gelen_geometrisi()
        if _tgelen is None:
            print("UYARI: kanli geometri yok, %s uretilmedi "
                  "(sahnenin son evresi eksik kalir)." % TAKAS_GELEN)
        else:
            yaz_json(os.path.join(BP, "entities/%s.json" % TAKAS_GELEN),
                     takas_varligi(TAKAS_GELEN, False))
            yaz_json(os.path.join(RP, "models/entity/%s.geo.json" % TAKAS_GELEN),
                     _tgelen)
            yaz_json(os.path.join(RP, "entity/%s.entity.json" % TAKAS_GELEN),
                     takas_istemci_varligi(TAKAS_GELEN, TAKAS_HEDEF_KOL,
                                           "animation.kol_gelen.suzul"))
        yaz_json(os.path.join(RP, "animations/kol_takas.animation.json"),
                 TAKAS_ANIMASYON)

    # ---- ZIRH YUKSELTMESI (v4.91) ----
    # Ionstrike/Max Steel takimi: 4 giyilebilir parca + modun
    # dokusu. Sayilar modun powers/*.json dosyalarindan.
    _zs = os.path.join(DOKU_KAYNAK, ZIRH_DOKU + ".png")
    if os.path.exists(_zs):
        _zh = os.path.join(RP, "textures/entity/%s.png" % ZIRH_DOKU)
        os.makedirs(os.path.dirname(_zh), exist_ok=True)
        shutil.copyfile(_zs, _zh)
    else:
        print("UYARI: zirh dokusu yok (%s)" % _zs)
    for _za, _zy, _zk, _ztr, _zen, _zb in ZIRH:
        yaz_json(os.path.join(BP, "items/%s.json" % _za),
                 zirh_esyasi(_za, _zy, _zk, _ztr))
        yaz_json(os.path.join(RP, "attachables/%s.json" % _za),
                 zirh_attachable(_za))
        yaz_json(os.path.join(RP, "models/entity/%s.geo.json" % _za),
                 zirh_geometrisi(_za))
        _zi = zirh_ikonu(_zb)
        if _zi is not None:
            _ziy = os.path.join(RP, "textures/item/%s.png" % _za)
            os.makedirs(os.path.dirname(_ziy), exist_ok=True)
            _zi.save(_ziy)
        dokular[_za] = {"textures": "textures/item/" + _za}
        for liste, ad in ((en_us, _zen), (tr_tr, _ztr)):
            liste.append("item.pa:%s.name=%s" % (_za, ad))
            liste.append("item.pa:%s=%s" % (_za, ad))

    # ---- TEKNOLOJI ZIRHLARI (v5.1) ----
    # ProjectE / Mekanism / Draconic. Uc ayri gorunus yolu var
    # ve sebepleri TEKNOLOJI_TAKIM tablosunun basinda yazili.
    _meka_geo = meka_geometrileri()
    for _ta, _ttr, _ten, _tparcalar, _tgorunus in TEKNOLOJI_TAKIM:
        # Giyilen dokunun kopyasi (takim basina bir kez).
        if _tgorunus == "pe":
            for _kat in (1, 2):
                _pk = os.path.join(DOKU_KAYNAK, "%s_k%d.png" % (_ta, _kat))
                if os.path.exists(_pk):
                    _ph = os.path.join(RP, "textures/entity/%s_k%d.png"
                                       % (_ta, _kat))
                    os.makedirs(os.path.dirname(_ph), exist_ok=True)
                    shutil.copyfile(_pk, _ph)
                else:
                    print("UYARI: %s katman %d yok (%s)" % (_ta, _kat, _pk))
        elif _tgorunus == "meka":
            _mk = os.path.join(DOKU_KAYNAK, MEKA_DOKU + ".png")
            if os.path.exists(_mk):
                _mh = os.path.join(RP, "textures/entity/%s.png" % MEKA_DOKU)
                os.makedirs(os.path.dirname(_mh), exist_ok=True)
                shutil.copyfile(_mk, _mh)
            else:
                print("UYARI: MekaSuit dokusu yok (%s)" % _mk)

        for _tp, _tyuva, _tkoruma, _tptr, _tpen in TEKNOLOJI_PARCA:
            if _tp not in _tparcalar:
                continue
            _tad = _ta + "_" + _tp
            # Tek parcali takimda (Draconic) parca adi eklenmiyor:
            # "Wyvern Goguslugu Gogusluk" olurdu.
            _adtr = _ttr if len(_tparcalar) == 1 else _ttr + " " + _tptr
            _aden = _ten if len(_tparcalar) == 1 else _ten + " " + _tpen
            yaz_json(os.path.join(BP, "items/%s.json" % _tad),
                     teknoloji_esyasi(_ta, _tp, _tyuva, _tkoruma, _adtr))

            if _tgorunus == "pe":
                yaz_json(os.path.join(RP, "models/entity/%s.geo.json" % _tad),
                         teknoloji_pe_geometrisi(_ta, _tp))
                yaz_json(os.path.join(RP, "attachables/%s.json" % _tad),
                         teknoloji_attachable(
                             _ta, _tp, "%s_k%d" % (_ta, PE_KATMAN[_tp])))
            elif _tgorunus == "meka":
                _g = _meka_geo.get(_tp)
                if _g is not None:
                    yaz_json(os.path.join(RP,
                             "models/entity/%s.geo.json" % _tad), _g)
                    yaz_json(os.path.join(RP, "attachables/%s.json" % _tad),
                             teknoloji_attachable(_ta, _tp, MEKA_DOKU))
                else:
                    print("UYARI: %s geometrisi cevrilemedi" % _tad)
            # _tgorunus None ise ATTACHABLE YOK: Draconic'in
            # giyilen modeli serbest ucgen agi, Bedrock kutu
            # istiyor. Uydurma model cizilmedi.

            # Ikon: modun KENDI esya pikselleri, uretilmiyor.
            _tik = os.path.join(DOKU_KAYNAK, _tad + ".png") \
                if len(_tparcalar) > 1 else \
                os.path.join(DOKU_KAYNAK, _ta + ".png")
            if os.path.exists(_tik):
                _tiy = os.path.join(RP, "textures/item/%s.png" % _tad)
                os.makedirs(os.path.dirname(_tiy), exist_ok=True)
                shutil.copyfile(_tik, _tiy)
            else:
                print("UYARI: %s ikonu yok (%s)" % (_tad, _tik))
            dokular[_tad] = {"textures": "textures/item/" + _tad}
            for liste, ad in ((en_us, _aden), (tr_tr, _adtr)):
                liste.append("item.pa:%s.name=%s" % (_tad, ad))
                liste.append("item.pa:%s=%s" % (_tad, ad))

    # ---- MAHOU TSUKAI (v5.4) ----
    # 16 esya + 20 parsomen. Ikonlar modun kendi pikselleri;
    # parsomenlerin hepsi tek ikonu paylasiyor (kaynakta da).
    for _ma, _mtr, _men, _mh, _md in MAHOU_ESYA:
        _mad = MAHOU_ONEK + _ma
        yaz_json(os.path.join(BP, "items/%s.json" % _mad),
                 mahou_esyasi(_ma, _mtr, _mh, _md))
        _mk = os.path.join(MAHOU_DOKU_KAYNAK, _ma + ".png")
        if os.path.exists(_mk):
            _my = os.path.join(RP, "textures/item/%s.png" % _mad)
            os.makedirs(os.path.dirname(_my), exist_ok=True)
            shutil.copyfile(_mk, _my)
        else:
            print("UYARI: %s ikonu yok (%s)" % (_mad, _mk))
        dokular[_mad] = {"textures": "textures/item/" + _mad}
        for liste, ad in ((en_us, _men), (tr_tr, _mtr)):
            liste.append("item.pa:%s.name=%s" % (_mad, ad))
            liste.append("item.pa:%s=%s" % (_mad, ad))

    _mps = os.path.join(MAHOU_DOKU_KAYNAK, MAHOU_PARSOMEN_DOKU + ".png")
    for _ba, _btr, _ben in MAHOU_BUYU:
        _bad = MAHOU_ONEK + _ba
        yaz_json(os.path.join(BP, "items/%s.json" % _bad),
                 mahou_parsomeni(_ba, _btr))
        if os.path.exists(_mps):
            _by = os.path.join(RP, "textures/item/%s.png" % _bad)
            os.makedirs(os.path.dirname(_by), exist_ok=True)
            shutil.copyfile(_mps, _by)
        else:
            print("UYARI: parsomen ikonu yok (%s)" % _mps)
        dokular[_bad] = {"textures": "textures/item/" + _bad}
        for liste, ad in ((en_us, _ben), (tr_tr, _btr)):
            liste.append("item.pa:%s.name=%s" % (_bad, ad))
            liste.append("item.pa:%s=%s" % (_bad, ad))

    # ---- OYUNCU VARLIGI (v5.3) ----
    # Depoda ILK KEZ bir BP oyuncu varligi var; tek sebebi
    # Ant-Man'in boy degistirmesi (Bedrock'ta olcek yalniz
    # bilesen grubuyla degisiyor). Gerekcesi tanimin basinda.
    yaz_json(os.path.join(BP, "entities/player.json"),
             marvel_oyuncu_varligi())

    # ---- MARVEL PROJECT (v5.2) ----
    # 268 parca: 142 kostum, 85 maske, 41 guc. Geometri ve doku
    # modun kendisinden; hicbiri yeniden cizilmedi.
    _mrv_geo_yazildi = set()
    for _mp in MARVEL_PARCA:
        _mad = MARVEL_ONEK + _mp["kahraman"] + MARVEL_AYIRAC + _mp["anahtar"]
        yaz_json(os.path.join(BP, "items/%s.json" % _mad), marvel_esyasi(_mp))

        # Guc esyasinin GORUNUSU yok (bacak yuvasinda duruyor,
        # oyuncuya bir sey cizmiyor) -- kaynakta da oyle.
        if _mp["tur"] != "guc" and _mp["geo"]:
            if _mp["geo"] not in _mrv_geo_yazildi:
                _mgk = os.path.join(MARVEL_GEO_KAYNAK,
                                    _mp["geo"] + ".geo.json")
                if os.path.exists(_mgk):
                    _mgh = os.path.join(RP, "models/entity/%s.geo.json"
                                        % _mp["geo"])
                    os.makedirs(os.path.dirname(_mgh), exist_ok=True)
                    shutil.copyfile(_mgk, _mgh)
                    _mrv_geo_yazildi.add(_mp["geo"])
                else:
                    print("UYARI: %s geometrisi yok (%s)" % (_mad, _mgk))
            if _mp["geo"] in _mrv_geo_yazildi:
                yaz_json(os.path.join(RP, "attachables/%s.json" % _mad),
                         marvel_attachable(_mp))
            _mdk = os.path.join(MARVEL_DOKU_KAYNAK,
                                _mp["anahtar"] + ".png")
            if os.path.exists(_mdk):
                _mdh = os.path.join(RP, "textures/entity/%s.png" % _mad)
                os.makedirs(os.path.dirname(_mdh), exist_ok=True)
                shutil.copyfile(_mdk, _mdh)
            else:
                print("UYARI: %s dokusu yok (%s)" % (_mad, _mdk))

        # Ikon: modun KENDI esya pikselleri.
        _mik = os.path.join(MARVEL_DOKU_KAYNAK,
                            "ikon_" + _mp["anahtar"] + ".png")
        if os.path.exists(_mik):
            _miy = os.path.join(RP, "textures/item/%s.png" % _mad)
            os.makedirs(os.path.dirname(_miy), exist_ok=True)
            shutil.copyfile(_mik, _miy)
        else:
            print("UYARI: %s ikonu yok (%s)" % (_mad, _mik))
        dokular[_mad] = {"textures": "textures/item/" + _mad}
        # Ad tek: modun kendi ingilizce adi. TURKCEYE CEVRILMEDI
        # -- "Iron Man Armor: Mark L" bir OZEL AD, cevirmek onu
        # taninmaz yapardi. Arayuz metinleri Turkce, esya adlari
        # kaynagin kendi adi.
        for liste in (en_us, tr_tr):
            liste.append("item.pa:%s.name=%s" % (_mad, _mp["ad"]))
            liste.append("item.pa:%s=%s" % (_mad, _mp["ad"]))

    # ---- KONSEY (v6.2) ----
    # 54 parca: 6 Konsey kostumu, 4 deri, 4 maske, 14 kol,
    # 7 asa, 5 Earl aleti, 8 zirh, 2 silah, 4 Dusmus asamasi.
    # Geometri, doku ve ikon kaynak eklentilerin kendisinden;
    # hicbiri yeniden cizilmedi.
    for _kt in KONSEY:
        _kad = KONSEY_ONEK + _kt[0]
        yaz_json(os.path.join(BP, "items/%s.json" % _kad), konsey_esyasi(_kt))

        _kgk = os.path.join(KONSEY_GEO_KAYNAK, _kad + ".geo.json")
        if _kt[0] in KONSEY_DUZ:
            # Duz esya: 3B modeli yok, olmamasi dogru. Uyari
            # yazilmiyor ki gercek eksikler gurultude kaybolmasin.
            pass
        elif os.path.exists(_kgk):
            # KOPYALANMIYOR, yaz_json ile YAZILIYOR: o yol
            # insan_hiyerarsisi()'nden geciyor. Kaynak paketler
            # zirh kaligini kullaniyor (`waist` ebeveynsiz,
            # bacaklar `body`nin cocugu); bizim 48 Marvel
            # kostumumuz ise root -> waist -> body kaligini
            # kullaniyor ve anim_tara.py onu bekliyor. v5.4'te
            # "uzuvlar govdeden kopmus" hatasinin yarisi tam
            # buydu -- duz kopyalasaydik on bir modelde geri
            # gelirdi (tarayici yakaladi).
            with open(_kgk, encoding="utf-8") as _kgf:
                _kgd = json.load(_kgf)
            yaz_json(os.path.join(RP, "models/entity/%s.geo.json" % _kad),
                     _kgd)
            yaz_json(os.path.join(RP, "attachables/%s.json" % _kad),
                     konsey_attachable(_kt))
        else:
            print("UYARI: %s geometrisi yok (%s)" % (_kad, _kgk))

        _kdk = os.path.join(KONSEY_DOKU_KAYNAK, _kad + ".png")
        if _kt[0] in KONSEY_DUZ:
            pass
        elif os.path.exists(_kdk):
            _kdh = os.path.join(RP, "textures/entity/%s.png" % _kad)
            os.makedirs(os.path.dirname(_kdh), exist_ok=True)
            shutil.copyfile(_kdk, _kdh)
        else:
            print("UYARI: %s dokusu yok (%s)" % (_kad, _kdk))

        _kik = os.path.join(KONSEY_IKON_KAYNAK, _kad + ".png")
        if os.path.exists(_kik):
            _kiy = os.path.join(RP, "textures/item/%s.png" % _kad)
            os.makedirs(os.path.dirname(_kiy), exist_ok=True)
            shutil.copyfile(_kik, _kiy)
        else:
            print("UYARI: %s ikonu yok (%s)" % (_kad, _kik))
        dokular[_kad] = {"textures": "textures/item/" + _kad}
        for liste in (en_us, tr_tr):
            liste.append("item.pa:%s.name=%s" % (_kad, _kt[1]))
            liste.append("item.pa:%s=%s" % (_kad, _kt[1]))

    # ---- DUSMUS BLOGU (v6.4) ----
    # Virusun kaynagi. Blok dokusu kaynak paketten; blok
    # tanimi kaynagin kendi JSON'undan (yalniz ad alani ve
    # doku adi degisti).
    yaz_json(os.path.join(BP, "blocks/%s.json" % DUSMUS_BLOK_DOKU),
             dusmus_blogu())
    _dbk = os.path.join(KONSEY_DOKU_KAYNAK, DUSMUS_BLOK_DOKU + ".png")
    if os.path.exists(_dbk):
        _dbh = os.path.join(RP, "textures/blocks/%s.png" % DUSMUS_BLOK_DOKU)
        os.makedirs(os.path.dirname(_dbh), exist_ok=True)
        shutil.copyfile(_dbk, _dbh)
        # Bloklarin dokusu ESYA atlasindan degil TERRAIN
        # atlasindan geliyor -- ayri iki dosya (blocks.json ve
        # terrain_texture.json) ve ikisi de yazilmazsa blok
        # mor-siyah cikar.
        #
        # DIKKAT -- BU IKI DOSYA ASAGIDA TEK YERDE YAZILIYOR.
        # Ilk yazdigimda burada AYRICA yaziyordum ve asagidaki
        # yazim benimkini eziyordu. Ters sirada olsaydi BEN
        # onlari ezerdim ve Freedom Stone cevheri, mezar tasi
        # ve tas heykel mor-siyah kalirdi. Test yakaladi.
        # Simdi yalnizca kumeye ekleniyor.
        _dusmus_blok_var = True
    else:
        _dusmus_blok_var = False
        print("UYARI: Dusmus Blogu dokusu yok (%s)" % _dbk)
    for _l in (en_us, tr_tr):
        _l.append("tile.%s.name=Düşmüş Bloğu" % DUSMUS_BLOK)
        _l.append("tile.%s=Düşmüş Bloğu" % DUSMUS_BLOK)

    # ---- KONSEY SESLERI (v6.3) ----
    # Kaynak paketin kendi `.ogg` dosyalari. Uc tanesinden
    # ikisi silahlarin atis sesi, biri Ay Isigi Asasi'nin
    # sarkisi.
    #
    # DIKKAT: kaynagin `sound_definitions.json` dosyasi BOS --
    # yani mod bu sesleri hic CALMIYOR, dosyalar oylece
    # duruyordu. Tanimlari biz yaziyoruz.
    _sesler = {}
    for _sk, _sad in (("kns_silah_biyo", "kns.silah_biyo"),
                      ("kns_silah_bobby", "kns.silah_bobby"),
                      ("kns_asa_ayisigi", "kns.asa_ayisigi")):
        _sy = os.path.join(KONSEY_SES_KAYNAK, _sk + ".ogg")
        if not os.path.exists(_sy):
            print("UYARI: %s sesi yok (%s)" % (_sk, _sy))
            continue
        _sh = os.path.join(RP, "sounds/konsey/%s.ogg" % _sk)
        os.makedirs(os.path.dirname(_sh), exist_ok=True)
        shutil.copyfile(_sy, _sh)
        _sesler[_sad] = {
            "category": "player",
            "sounds": [{"name": "sounds/konsey/" + _sk,
                        "stream": True, "volume": 1.0}],
        }
    # ---- EFSANE MUZIGI (v6.6) ----
    # Kullanicinin yukledigi 7:34'luk parcanin 4:10-5:10 arasi.
    # Kesit ELLE secilmedi: parca saniye saniye olculdu, 4:10'da
    # bir sessizlesme ve hemen ardindan parcanin en yuksek
    # enerjili dakikasi var. Basta 0.4 sn acilma, sonda 2.5 sn
    # kapanma -- kesim duyulmasin diye.
    #
    # category "music": oyunun kendi muzigini susturuyor,
    # yoksa iki parca ust uste calardi.
    _my = os.path.join(SES_KAYNAK, "efsane_muzik.ogg")
    if os.path.exists(_my):
        _mh = os.path.join(RP, "sounds/efsane/efsane_muzik.ogg")
        os.makedirs(os.path.dirname(_mh), exist_ok=True)
        shutil.copyfile(_my, _mh)
        _sesler["simsek.efsane_muzik"] = {
            "category": "music",
            "sounds": [{"name": "sounds/efsane/efsane_muzik",
                        "stream": True, "volume": 1.0}],
        }
    else:
        print("UYARI: efsane muzigi yok (%s)" % _my)

    if _sesler:
        yaz_json(os.path.join(RP, "sounds/sound_definitions.json"),
                 {"format_version": "1.20.20",
                  "sound_definitions": _sesler})

    # ---- OZEL SIS: SKININ RENGI (v6.6) ----
    # Kullanici: "/fog @a push minecraft:fog_hell 12 havayi
    # kirmiziya cevirmeye yariyormus, biz bunu benim skinimin
    # rengine cevirelim -- mavi mi bilmiyorum ama."
    #
    # RENK OLCULDU, tahmin edilmedi. Simsek_Skin/uzak_akraba.png
    # 64x64, 1632 dolu piksel sayildi:
    #   %95,6  siyaha yakin (#0A0A0D / #060608 / #16181B)
    #   %1,8   #145E53   koyu turkuaz
    #   %1,6   #20C5B5   ana vurgu  <-- skinin RENGI bu
    #   %0,9   #4AEDD9   acik turkuaz
    #   %0,2   #8CD2FF   acik mavi
    # Yani mavi degil TURKUAZ (H=174). Siyah bir sisi kimse
    # goremez; sisin rengi vurgu tonu oldu.
    #
    # Iki yogunluk yaziliyor: fog_hell kadar bogucu olan ve
    # yalnizca havayi boyayan hafif olani. Tek bir yogunluk
    # yazip "ya tutmazsa" demek yerine ikisi de duruyor.
    for _sk, _sad, _bas, _bit in (
            ("sis_simsek",       "Simsek Sisi",        2.0, 30.0),
            ("sis_simsek_hafif", "Simsek Sisi (hafif)", 8.0, 90.0)):
        yaz_json(os.path.join(RP, "fogs/%s.json" % _sk),
                 sis_tanimi("pa:" + _sk, _bas, _bit))

    # ---- MASKE + OYUNCU MODELI PAKETI (v4.90) ----
    # Asil donusum: oyuncunun KENDI modeli degisiyor.
    yaz_json(os.path.join(BP, "items/%s.json" % MASKE_ESYA), maske_esyasi())
    _mk = maske_ikonu()
    if _mk is not None:
        _my = os.path.join(RP, "textures/item/%s.png" % MASKE_ESYA)
        os.makedirs(os.path.dirname(_my), exist_ok=True)
        _mk.save(_my)
    dokular[MASKE_ESYA] = {"textures": "textures/item/" + MASKE_ESYA}
    for liste, ad in ((en_us, MASKE_EN), (tr_tr, MASKE_TR)):
        liste.append("item.pa:%s.name=%s" % (MASKE_ESYA, ad))
        liste.append("item.pa:%s=%s" % (MASKE_ESYA, ad))
    # ---- DURUŞ TASLARI (v7.4) ----
    # Blockbuster'in poz sistemi. Esya + ikon burada; geometri ve
    # denetleyici oyuncu modeli paketinde (asagida) -- cunku duruş
    # oyuncunun KENDI modelini degistiriyor, elde tutulan bir
    # gorunum degil.
    if DURUS_ACIK:
        for _dk, _dad, _drenk, _dpoz in DURUSLAR:
            _dtam = DURUS_ONEK + _dk
            yaz_json(os.path.join(BP, "items/%s.json" % _dtam),
                     durus_esyasi(_dk, _dad))
            png_yaz(os.path.join(RP, "textures/item/%s.png" % _dtam),
                    16, 16, durus_ikonu(_drenk))
            dokular[_dtam] = {"textures": "textures/item/" + _dtam}
            en_us.append("item.pa:%s.name=Pose · %s" % (_dtam, _dk))
            en_us.append("item.pa:%s=Pose · %s" % (_dtam, _dk))
            tr_tr.append("item.pa:%s.name=Duruş · %s" % (_dtam, _dad))
            tr_tr.append("item.pa:%s=Duruş · %s" % (_dtam, _dad))

    # ---- KOL TAKASI ISARETI (v7.9) ----
    # Sahne suresince ana elde duran gecici tas. Elde OLMASI,
    # istemcinin oyuncuyu kolsuz cizmesinin TEK sebebi.
    if KOL_TAKAS_ACIK:
        yaz_json(os.path.join(BP, "items/%s.json" % TAKAS_ISARET),
                 takas_isaret_esyasi())
        png_yaz(os.path.join(RP, "textures/item/%s.png" % TAKAS_ISARET),
                16, 16, takas_isaret_ikonu())
        dokular[TAKAS_ISARET] = {"textures": "textures/item/" + TAKAS_ISARET}
        en_us.append("item.pa:%s.name=Arm Swap (temporary)" % TAKAS_ISARET)
        en_us.append("item.pa:%s=Arm Swap (temporary)" % TAKAS_ISARET)
        tr_tr.append("item.pa:%s.name=Kol Takası (geçici)" % TAKAS_ISARET)
        tr_tr.append("item.pa:%s=Kol Takası (geçici)" % TAKAS_ISARET)

    # ---- BEN 10 (v4.92) ----
    # Dort yaratik: esya + ikon. Modeller ve dokular oyuncu
    # modeli paketine giriyor (asagida).
    for _ba, _btr, _ben, _bdos, _btur in BEN10 + ZIRH_MOD:
        yaz_json(os.path.join(BP, "items/%s.json" % _ba),
                 ben10_esyasi(_ba, _btr))
        _bi = ben10_ikonu(_ba, ben10_geometrisi(_ba, _bdos))
        if _bi is not None:
            _biy = os.path.join(RP, "textures/item/%s.png" % _ba)
            os.makedirs(os.path.dirname(_biy), exist_ok=True)
            _bi.save(_biy)
        else:
            print("UYARI: %s ikonu uretilemedi" % _ba)
        dokular[_ba] = {"textures": "textures/item/" + _ba}
        for liste, ad in ((en_us, _ben), (tr_tr, _btr)):
            liste.append("item.pa:%s.name=%s" % (_ba, ad))
            liste.append("item.pa:%s=%s" % (_ba, ad))

    # ---- OMNITRIX SAATLERI (v4.93) ----
    for _oa, _otr, _oen in OMNITRIX:
        yaz_json(os.path.join(BP, "items/%s.json" % _oa),
                 ben10_esyasi(_oa, _otr))
        _og = ben10_geometrisi(_oa, [_oa])
        yaz_json(os.path.join(RP, "models/entity/%s.geo.json" % _oa), _og)
        yaz_json(os.path.join(RP, "attachables/%s.json" % _oa),
                 omnitrix_attachable(_oa))
        _ok = os.path.join(DOKU_KAYNAK, _oa + ".png")
        if os.path.exists(_ok):
            _oh = os.path.join(RP, "textures/entity/%s.png" % _oa)
            os.makedirs(os.path.dirname(_oh), exist_ok=True)
            shutil.copyfile(_ok, _oh)
            # Ikon: dokunun kendisi, 16x16'ya kucultulmus.
            try:
                from PIL import Image
                _oi = Image.open(_ok).convert("RGBA").resize((16, 16), Image.NEAREST)
                _oiy = os.path.join(RP, "textures/item/%s.png" % _oa)
                os.makedirs(os.path.dirname(_oiy), exist_ok=True)
                _oi.save(_oiy)
            except ImportError:
                pass
        else:
            print("UYARI: %s dokusu yok (%s)" % (_oa, _ok))
        dokular[_oa] = {"textures": "textures/item/" + _oa}
        for liste, ad in ((en_us, _oen), (tr_tr, _otr)):
            liste.append("item.pa:%s.name=%s" % (_oa, ad))
            liste.append("item.pa:%s=%s" % (_oa, ad))

    _surum = json.load(open(os.path.join(BP, "manifest.json"),
                            encoding="utf-8"))["header"]["version"]
    # ---- SIRA ONEMLI  (v7.10'da duzeltildi) ----
    # oyuncu_modeli_paketi() O Sey dokusunu RP'den OMP'ye
    # KOPYALIYOR. Doku asagida uretiliyordu, yani kopya her
    # zaman BIR ONCEKI uretimin dokusuydu ve iki paket sessizce
    # ayrisiyordu. Doku degismedigi surece kimse fark etmiyordu;
    # skin degisince oyuncu_modeli.mjs'in "doku ana paketle
    # BIREBIR ayni" satiri dustu ve sebep buymus.
    # Doku ARTIK KOPYADAN ONCE uretiliyor.
    _sey_doku = o_sey_dokusu(SEY_SKIN_KAYNAK)
    _sey_hedef = os.path.join(RP, "textures/entity/%s.png" % SEY_DOKU)
    if _sey_doku is not None:
        os.makedirs(os.path.dirname(_sey_hedef), exist_ok=True)
        _sey_doku.save(_sey_hedef)
    elif not os.path.exists(_sey_hedef):
        print("UYARI: O Sey dokusu uretilemedi -- varlik mor-siyah cizilir")

    oyuncu_modeli_paketi(_surum)
    yaz_json(os.path.join(RP, "models/entity/o_sey.geo.json"), o_sey_geometrisi())
    yaz_json(os.path.join(RP, "models/entity/o_sey_mutant.geo.json"),
             mutant_geometrisi())
    yaz_json(os.path.join(RP, "animations/o_sey.animation.json"), SEY_ANIM)
    # ---- MUTANT HALIM DOKUSU (v7.2) ----
    # O Sey'in dokusundan TURETILIYOR; kaynak dosya orada
    # duruyor, ayri bir doku dosyasi tutulmuyor.
    _mut_doku = mutant_dokusu(_sey_hedef)
    _mut_hedef = os.path.join(RP, "textures/entity/%s.png" % MUTANT_DOKU)
    if _mut_doku is not None:
        os.makedirs(os.path.dirname(_mut_hedef), exist_ok=True)
        _mut_doku.save(_mut_hedef)
    elif not os.path.exists(_mut_hedef):
        print("UYARI: Mutant dokusu uretilemedi -- varlik mor-siyah cizilir")

    for liste, ad in ((en_us, SEY_AD), (tr_tr, SEY_TR)):
        liste.append("entity.%s.name=%s" % (SEY_KIMLIK, ad))
        liste.append("item.spawn_egg.entity.%s.name=%s Yumurtası" % (SEY_KIMLIK, ad))
    for liste, ad in ((en_us, MUTANT_AD), (tr_tr, MUTANT_TR)):
        liste.append("entity.%s.name=%s" % (MUTANT_KIMLIK, ad))
        liste.append("item.spawn_egg.entity.%s.name=%s Yumurtası"
                     % (MUTANT_KIMLIK, ad))
    # Her uyenin DONANIM ganimet tablosu (v4.59). Vanilla
    # zombinin kilic almasiyla ayni yol; dogusta calisiyor.
    for _anahtar, _ad, _c, _h, _sec in ILKEL:
        yaz_json(os.path.join(BP, "loot_tables/equipment",
                              "ilkel_%s.json" % _anahtar),
                 {"pools": [{
                     "rolls": 1,
                     "entries": [{
                         "type": "item",
                         "name": "pa:" + ilkel_silahi(_anahtar)[0],
                         "weight": 1,
                     }],
                 }]})

    # ---- Ilkel Besli'nin silahlari (v4.48, v4.49) ----
    # Dokular kullanicinin elle cizdigi dosyalar. Uretilen yedek
    # YOK: yer tutucu bir silah cizmek "sahte icerik" olurdu,
    # eksigi rapor etmek dogrusu (deponun kurali).
    for _sanahtar, (skimlik, sad, skaynak) in ILKEL_SILAHLAR.items():
        yaz_json(os.path.join(BP, "items", skimlik + ".json"),
                 ilkel_silah_esyasi(skimlik, sad))
        s_kaynak = os.path.join(ILKEL_SKIN_KAYNAK, skaynak)
        s_hedef = os.path.join(RP, "textures/item", skimlik + ".png")
        if os.path.exists(s_kaynak):
            os.makedirs(os.path.dirname(s_hedef), exist_ok=True)
            shutil.copyfile(s_kaynak, s_hedef)
        elif not os.path.exists(s_hedef):
            print("UYARI: %s dokusu bulunamadi (%s)" % (skimlik, s_kaynak))
        dokular[skimlik] = {"textures": "textures/item/" + skimlik}
        for liste in (en_us, tr_tr):
            liste.append("item.pa:%s.name=%s" % (skimlik, sad))
            liste.append("item.pa:%s=%s" % (skimlik, sad))

    # ---- Dismont tasi ve mezar tasi (v4.50) ----
    # Paketin ILK bloklari. Dort ayri kayit gerekiyor ve biri
    # eksikse blok ya gorunmez ya mor-siyah cikar:
    #   1) blocks/*.json           (BP) -- blogun kendisi
    #   2) blocks.json             (RP) -- hangi dokuyu kullanacagi
    #   3) terrain_texture.json    (RP) -- doku adi -> dosya yolu
    #   4) loot_tables/            (BP) -- kirinca ne dusecegi
    yaz_json(os.path.join(BP, "blocks", DISMONT_CEVHER + ".json"),
             dismont_cevher_blogu())
    yaz_json(os.path.join(BP, "blocks", MEZAR_BLOK + ".json"),
             mezar_tasi_blogu())
    yaz_json(os.path.join(BP, "items", DISMONT_ESYA + ".json"), dismont_esyasi())
    yaz_json(os.path.join(BP, "loot_tables/blocks", DISMONT_CEVHER + ".json"),
             dismont_ganimeti())
    # ---- Kuruyan Agac (v7.11) ----
    # Ayni dort kayit: blok, ganimet, doku (asagida) ve
    # blocks.json/terrain_texture (asagida). Yaprak ganimeti
    # BILEREK bos -- fidan yok, bkz. kuruyan_yaprak_ganimeti().
    yaz_json(os.path.join(BP, "blocks", AGAC_KUTUK + ".json"),
             kuruyan_kutuk_blogu())
    yaz_json(os.path.join(BP, "blocks", AGAC_YAPRAK + ".json"),
             kuruyan_yaprak_blogu())
    yaz_json(os.path.join(BP, "loot_tables/blocks", AGAC_KUTUK + ".json"),
             kuruyan_kutuk_ganimeti())
    yaz_json(os.path.join(BP, "loot_tables/blocks", AGAC_YAPRAK + ".json"),
             kuruyan_yaprak_ganimeti())
    # ---- KUPALAR (v7.25) ----
    # Her kupa DORT dosya: blok (BP), geometri (RP), doku (RP,
    # kullanicinin skini) ve dil kaydi. Besincisi ortak: kazik
    # odunu dokusu, hepsi onu paylasiyor.
    #
    # Skin dosyasi yoksa o kupa SESSIZCE ATLANMIYOR -- uyari
    # basiliyor. "Sahte icerik uretme, eksigi rapor et" kurali.
    _kupa_uretilen = []
    _kupa_geo = {KUPA_KAZIK: kupa_kazik_geometrisi,
                 KUPA_CARMIH: kupa_carmih_geometrisi,
                 KUPA_ASILI: kupa_asili_geometrisi,
                 KUPA_SIS: kupa_sis_geometrisi,
                 KUPA_ZINCIRLI: kupa_zincirli_geometrisi}
    for _kk, _kad, _krac, _kbic, _kskin in KUPALAR:
        _ky = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           KUPA_SKIN_KLASOR, _kskin)
        if not os.path.exists(_ky):
            print("UYARI: kupa skini yok, atlandi: %s (%s)" % (_kad, _ky))
            continue
        if _kbic not in _kupa_geo:
            print("UYARI: bilinmeyen kupa bicimi '%s' (%s)" % (_kbic, _kad))
            continue
        _kim = KUPA_ONEK + _kk
        yaz_json(os.path.join(BP, "blocks", _kim + ".json"),
                 kupa_blogu(_kk, _kad, _kbic))
        yaz_json(os.path.join(RP, "models/blocks", _kim + ".geo.json"),
                 _kupa_geo[_kbic](_kk))
        # Skin OLCUSU/DUZENI degismeden kopyalaniyor: kutu UV
        # zaten oyuncu skin duzenine oturuyor. Tek dokunulan
        # sey ikinci katmandaki gurultu (bkz kupa_skin_temizle).
        _kh = os.path.join(RP, "textures/blocks", _kim + ".png")
        os.makedirs(os.path.dirname(_kh), exist_ok=True)
        _silinen, _bozuk = kupa_skin_denetle(_ky, _kh, _kbic)
        if _silinen:
            print("   %s: ikinci katman gurultusu silindi -> %s"
                  % (_kad, ", ".join(_silinen)))
        if _bozuk:
            # Skin bozuk: dosya yolda bozulmus ya da eksik
            # gelmis. Kupa URETILMIYOR -- bozuk bir kupa
            # gondermektense eksigi soylemek dogru.
            print("UYARI: %s kupasi URETILMEDI, skin bozuk. "
                  "Gurultulu yuzler: %s" % (_kad, ", ".join(_bozuk)))
            if os.path.exists(_kh):
                os.remove(_kh)
            for _artik in (os.path.join(BP, "blocks", _kim + ".json"),
                           os.path.join(RP, "models/blocks",
                                        _kim + ".geo.json")):
                if os.path.exists(_artik):
                    os.remove(_artik)
            continue
        _kupa_uretilen.append((_kk, _kad, _krac, _kbic))
    if _kupa_uretilen:
        png_yaz(os.path.join(RP, "textures/blocks", KUPA_ODUN_DOKU + ".png"),
                16, 16, kupa_odun_dokusu())
    if any(_b == KUPA_ASILI for _, _, _, _b in _kupa_uretilen):
        png_yaz(os.path.join(RP, "textures/blocks", KUPA_IP_DOKU + ".png"),
                16, 16, kupa_ip_dokusu())
    if any(_b == KUPA_ZINCIRLI for _, _, _, _b in _kupa_uretilen):
        png_yaz(os.path.join(RP, "textures/blocks",
                             KUPA_ZINCIR_DOKU + ".png"),
                16, 16, kupa_zincir_dokusu())
    print("uretildi: %d kupa" % len(_kupa_uretilen))

    # ---- SILAHLAR ve MERMILER (v4.87) ----
    # Silah ELDE TUTULUYOR ve hasar tasiyor; mermi YIGILIYOR ve
    # hasarsiz. Ikisini ayni fonksiyondan uretmek, "mermiyi
    # eline alip vurmak" gibi sacma bir seye yol acmasin diye
    # ayri parametrelerle yapiliyor.
    for _kim, _ad, _hasar, _dosya in SILAHLAR:
        yaz_json(os.path.join(BP, "items", _kim + ".json"),
                 basit_esya(_kim, _ad, _hasar))
        _h = os.path.join(RP, "textures/item", _kim + ".png")
        if not kaynak_doku_kopyala(_dosya, _h):
            png_yaz(_h, 16, 16, {(x, y): (120, 124, 130, 255)
                                 for x in range(16) for y in range(16)})
        dokular[_kim] = {"textures": "textures/item/" + _kim}

    for _kim, _ad, _dosya in MERMILER:
        yaz_json(os.path.join(BP, "items", _kim + ".json"), {
            "format_version": "1.21.0",
            "minecraft:item": {
                "description": {
                    "identifier": "pa:" + _kim,
                    "menu_category": {"category": "items"},
                },
                "components": {
                    "minecraft:icon": {"texture": _kim},
                    "minecraft:display_name": {"value": _ad},
                    "minecraft:max_stack_size": 64,
                },
            },
        })
        _h = os.path.join(RP, "textures/item", _kim + ".png")
        if not kaynak_doku_kopyala(_dosya, _h):
            png_yaz(_h, 16, 16, {(x, y): (180, 160, 90, 255)
                                 for x in range(16) for y in range(16)})
        dokular[_kim] = {"textures": "textures/item/" + _kim}

    # ---- YENI ESYALAR ve HEYKEL BLOGU (v4.86) ----
    yaz_json(os.path.join(BP, "blocks", TAS_BLOK + ".json"), tas_heykel_blogu())
    # Will1545 Kilici (v7.8). DOKU KAYDI YOK: vanilla
    # `golden_sword` anahtarini kullaniyor, kendi anahtarimizi
    # yazsak vanilla dokusunu ezerdik.
    yaz_json(os.path.join(BP, "items", WILL_ESYA + ".json"), will_kilici())
    for _l, _a in ((en_us, WILL_ESYA_EN), (tr_tr, WILL_ESYA_TR)):
        _l.append("item.pa:%s.name=%s" % (WILL_ESYA, _a))
        _l.append("item.pa:%s=%s" % (WILL_ESYA, _a))

    yaz_json(os.path.join(BP, "items", KILIC_ESYA + ".json"),
             basit_esya(KILIC_ESYA, KILIC_ESYA_TR, KILIC_HASAR))
    yaz_json(os.path.join(BP, "items", TAS_ESYA + ".json"),
             basit_esya(TAS_ESYA, TAS_ESYA_TR, TAS_HASAR))

    # Dokular referanstan; yoksa duz bir yer tutucu ciziliyor.
    for _kim, _dosya in ((KILIC_ESYA, "resetting_sword.png"),
                         (TAS_ESYA, "tas_donusturucu.png")):
        _hedef = os.path.join(RP, "textures/item", _kim + ".png")
        if not kaynak_doku_kopyala(_dosya, _hedef):
            png_yaz(_hedef, 16, 16,
                    {(x, y): (150, 150, 150, 255)
                     for x in range(16) for y in range(16)})
        dokular[_kim] = {"textures": "textures/item/" + _kim}

    _tas_hedef = os.path.join(RP, "textures/blocks", TAS_BLOK + ".png")
    if not kaynak_doku_kopyala("tas_heykel.png", _tas_hedef):
        png_yaz(_tas_hedef, 16, 16,
                {(x, y): (122, 122, 122, 255)
                 for x in range(16) for y in range(16)})

    yaz_json(os.path.join(BP, "features/freedom_stone_ore_feature.json"),
             dismont_ozelligi())
    yaz_json(os.path.join(BP, "feature_rules/freedom_stone_ore_rule.json"),
             dismont_kurali())
    # ---- IKSIR AURASI (v7.15) ----
    # Her iksir icin uc parcacik: kor (yukselen), hale (puslu
    # kabuk), patlama (icildigi an). Renkler IKSIRLER
    # tablosundaki GOZ renkleri -- gozunde yanan renk ne ise
    # etrafinda ucusan da o. Element'in iki rengi de gradyana
    # giriyor.
    _aura_yol = os.path.join(RP, "particles")
    os.makedirs(_aura_yol, exist_ok=True)
    _aura_sayi = 0
    _aura_beklenen = set()
    for _ik, _iad, _irenk, _igoz, _igozrenk in IKSIRLER:
        _renkler = goz_renkleri(_igozrenk)
        for _tur, _uret in AURA_TURLERI:
            _ad = "aura_%s_%s.particle.json" % (_tur, _ik)
            yaz_json(os.path.join(_aura_yol, _ad), _uret(_ik, _renkler))
            _aura_beklenen.add(_ad)
            _aura_sayi += 1
    # ---- ARTIK PARCACIKLARI SIL (v7.19) ----
    # AURA_URETILEN'den bir tur cikarilinca dosyalari diskte
    # KALIYORDU. Kapali ama yine de pakete giren bir sey
    # birakmiyoruz; dokularda ayni temizligi yapiyoruz, burada
    # yapmamak icin de bir sebep yok. Yalniz "aura_" ile
    # baslayanlara dokunuluyor -- baska bir sistemin parcacigi
    # buraya girerse silinmesin.
    for _eski in sorted(os.listdir(_aura_yol)):
        if _eski.startswith("aura_") and _eski not in _aura_beklenen:
            os.remove(os.path.join(_aura_yol, _eski))
            print("   silindi (aura turu kapali): %s" % _eski)
    # Hic tur uretilmiyorsa satir da yok: doku yazilmaz ve
    # varsa SILINIR. "Kapali ama yine de pakete giren" bir sey
    # birakmiyoruz -- parcacik dosyalarinda da ayni kural.
    _aura_doku_yol = os.path.join(RP, "textures/particle",
                                  AURA_DOKU + ".png")
    if AURA_SATIR:
        png_yaz(_aura_doku_yol, AURA_DOKU_EN, AURA_DOKU_BOY, aura_dokusu())
    elif os.path.exists(_aura_doku_yol):
        os.remove(_aura_doku_yol)
        print("   silindi (parcacik sistemi kapali): %s.png" % AURA_DOKU)
    print("uretildi: %d aura parcacigi (%d iksir x %d tur)"
          % (_aura_sayi, len(IKSIRLER), len(AURA_TURLERI)))

    yaz_json(os.path.join(BP, "features/kuruyan_agac_feature.json"),
             kuruyan_agac_ozelligi())
    yaz_json(os.path.join(BP, "feature_rules/kuruyan_agac_rule.json"),
             kuruyan_agac_kurali())

    png_yaz(os.path.join(RP, "textures/blocks", DISMONT_CEVHER + ".png"),
            16, 16, dismont_cevher_dokusu())
    png_yaz(os.path.join(RP, "textures/blocks", MEZAR_BLOK + ".png"),
            16, 16, mezar_tasi_dokusu())
    png_yaz(os.path.join(RP, "textures/blocks", AGAC_KUTUK + ".png"),
            16, 16, kuruyan_kutuk_dokusu())
    png_yaz(os.path.join(RP, "textures/blocks", AGAC_YAPRAK + ".png"),
            16, 16, kuruyan_yaprak_dokusu())
    # ---- IKON ARTIK REFERANSTAN (v4.86) ----
    # Zabri Studios BoraLo Mod'un kendi freedomstone.png'si.
    # Uretilen cizim yedekte duruyor: kaynak_doku/ silinse
    # bile paket calisir.
    _fs_hedef = os.path.join(RP, "textures/item", DISMONT_ESYA + ".png")
    if not kaynak_doku_kopyala("freedom_stone.png", _fs_hedef):
        png_yaz(_fs_hedef, 16, 16, dismont_esya_dokusu())
    dokular[DISMONT_ESYA] = {"textures": "textures/item/" + DISMONT_ESYA}

    # ---- BLOK KAYITLARI TEK YERDE ----
    # Uc vanilla blogumuz + (varsa) Dusmus Blogu. Iki ayri
    # yerde yazilirsa biri otekini eziyor; bir kez oldu.
    _terrain = {
        DISMONT_CEVHER: {"textures": "textures/blocks/" + DISMONT_CEVHER},
        MEZAR_BLOK: {"textures": "textures/blocks/" + MEZAR_BLOK},
        TAS_BLOK: {"textures": "textures/blocks/" + TAS_BLOK},
        AGAC_KUTUK: {"textures": "textures/blocks/" + AGAC_KUTUK},
        AGAC_YAPRAK: {"textures": "textures/blocks/" + AGAC_YAPRAK},
    }
    _bloklar = {
        "format_version": [1, 1, 0],
        "pa:" + DISMONT_CEVHER: {"textures": DISMONT_CEVHER, "sound": "stone"},
        "pa:" + MEZAR_BLOK: {"textures": MEZAR_BLOK, "sound": "stone"},
        "pa:" + TAS_BLOK: {"textures": TAS_BLOK, "sound": "stone"},
        # Kuruyan Agac (v7.11). Sesler odun/yaprak: tas sesi
        # cikan bir agac govdesi yanlis olurdu.
        "pa:" + AGAC_KUTUK: {"textures": AGAC_KUTUK, "sound": "wood"},
        "pa:" + AGAC_YAPRAK: {"textures": AGAC_YAPRAK, "sound": "grass"},
    }
    # Kupalar: her birinin dokusu KENDI skini, hepsi ayni odun
    # dokusunu paylasiyor.
    for _kk, _kad, _krac, _kbic in _kupa_uretilen:
        _kim = KUPA_ONEK + _kk
        _terrain[_kim] = {"textures": "textures/blocks/" + _kim}
        # Ses: kazik ve carmih ahsap.
        _bloklar["pa:" + _kim] = {"textures": _kim, "sound": "wood"}
    if _kupa_uretilen:
        _terrain[KUPA_ODUN_DOKU] = {
            "textures": "textures/blocks/" + KUPA_ODUN_DOKU}
    if any(_b == KUPA_ASILI for _, _, _, _b in _kupa_uretilen):
        _terrain[KUPA_IP_DOKU] = {
            "textures": "textures/blocks/" + KUPA_IP_DOKU}
    if any(_b == KUPA_ZINCIRLI for _, _, _, _b in _kupa_uretilen):
        _terrain[KUPA_ZINCIR_DOKU] = {
            "textures": "textures/blocks/" + KUPA_ZINCIR_DOKU}

    if _dusmus_blok_var:
        _terrain[DUSMUS_BLOK_DOKU] = {
            "textures": "textures/blocks/" + DUSMUS_BLOK_DOKU}
        _bloklar[DUSMUS_BLOK] = {"textures": DUSMUS_BLOK_DOKU,
                                 "sound": "wood"}

    yaz_json(os.path.join(RP, "textures/terrain_texture.json"), {
        "resource_pack_name": "simsek_kol",
        "texture_name": "atlas.terrain",
        "padding": 8,
        "num_mip_levels": 4,
        "texture_data": _terrain,
    })
    # blocks.json: blogun hangi terrain dokusunu kullandigi.
    # material_instances zaten doku adini soyluyor ama bu dosya
    # olmadan bazi surumlerde blok mor-siyah cikiyor -- ikisi
    # birlikte yazilinca iki yolda da dogru.
    yaz_json(os.path.join(RP, "blocks.json"), _bloklar)

    for liste, adlar in ((en_us, (DISMONT_ESYA_TR, DISMONT_CEVHER_TR, MEZAR_BLOK_TR)),
                         (tr_tr, (DISMONT_ESYA_TR, DISMONT_CEVHER_TR, MEZAR_BLOK_TR))):
        liste.append("item.pa:%s.name=%s" % (DISMONT_ESYA, adlar[0]))
        liste.append("item.pa:%s=%s" % (DISMONT_ESYA, adlar[0]))
        liste.append("tile.pa:%s.name=%s" % (DISMONT_CEVHER, adlar[1]))
        liste.append("tile.pa:%s.name=%s" % (MEZAR_BLOK, adlar[2]))
        # v4.86'nin uc yeni adi
        liste.append("tile.pa:%s.name=%s" % (TAS_BLOK, TAS_BLOK_TR))
        liste.append("tile.pa:%s.name=%s" % (AGAC_KUTUK, AGAC_KUTUK_TR))
        liste.append("tile.pa:%s.name=%s" % (AGAC_YAPRAK, AGAC_YAPRAK_TR))
        # ---- KUPALAR ----
        # Ad ve RACON TEK SATIRDA.
        #
        # ---- ILK YAZILISI YANLISTI, TEST YAKALADI ----
        # Once "%s§r\n§7§o%s" yaziliyordu, yani racon alt
        # satira. .lang bicimi bunu KALDIRMIYOR: her satir bir
        # "anahtar=deger" cifti, satir sonu degeri bitiriyor.
        # Uretilen dosyada racon anahtarsiz oksuz bir satir
        # olarak kaliyordu -- oyun onu okumaz, yani racon
        # kaybolurdu. Depoda baska hicbir yerde .lang'da \n
        # yok; olan tek yer buydu ve yanlisti.
        #
        # Ayirac §8· ; racon §7 gri §o italik. Ad §r ile
        # kapaniyor ki adin rengi raconu boyamasin.
        for _kk, _kad, _krac, _kbic in _kupa_uretilen:
            liste.append("tile.pa:%s%s.name=%s§r §8· §7§o%s"
                         % (KUPA_ONEK, _kk, _kad, _krac))
        for _k, _a in ([(KILIC_ESYA, KILIC_ESYA_TR), (TAS_ESYA, TAS_ESYA_TR)] +
                       [(k2, a2) for k2, a2, _h2, _d2 in SILAHLAR] +
                       [(k3, a3) for k3, a3, _d3 in MERMILER]):
            liste.append("item.pa:%s.name=%s" % (_k, _a))
            liste.append("item.pa:%s=%s" % (_k, _a))

    yaz_json(os.path.join(RP, "models/entity/simsek_bot.geo.json"), BOT_GEOMETRI)
    yaz_json(os.path.join(RP, "animations/simsek_bot.animation.json"), BOT_ANIM)
    # Normal botun skini de kullanicidan geliyor (v4.43).
    # Uretilen doku (bot_dokusu) YEDEK olarak duruyor: dosya
    # yoksa eski gorunum ciziliyor, bot mor-siyah kalmiyor.
    bot_skin = os.path.join(ILKEL_SKIN_KAYNAK, BOT_SKIN)
    bot_hedef = os.path.join(RP, "textures/entity/bot.png")
    if os.path.exists(bot_skin):
        os.makedirs(os.path.dirname(bot_hedef), exist_ok=True)
        shutil.copyfile(bot_skin, bot_hedef)
    else:
        print("UYARI: bot skini bulunamadi (%s), uretilen doku kullaniliyor"
              % bot_skin)
        png_yaz(bot_hedef, 64, 64, bot_dokusu(0))
    for liste, ad in ((en_us, BOT_AD), (tr_tr, BOT_TR)):
        liste.append("entity.%s.name=%s" % (BOT_KIMLIK, ad))
        liste.append("item.spawn_egg.entity.%s.name=%s Yumurtasi" % (BOT_KIMLIK, ad))

    # Ilkel Besli: rutbe sirasinda, adinda rutbesiyle (v4.35)
    for anahtar, ad, _can, _hasar, sec in sorted(ILKEL, key=lambda u: u[4]["rutbe"]):
        etiket = "[%d] %s" % (sec["rutbe"], ILKEL_TR.get(anahtar, ad))
        for liste in (en_us, tr_tr):
            liste.append("entity.pa:%s.name=%s" % (anahtar, etiket))
            liste.append("item.spawn_egg.entity.pa:%s.name=%s Yumurtasi"
                         % (anahtar, ILKEL_TR.get(anahtar, ad)))

    yaz_json(os.path.join(RP, "models/entity/simsek_goz.geo.json"), GOZ_GEOMETRI)
    yaz_json(os.path.join(RP, "models/entity/simsek_goz_lazer.geo.json"),
             goz_lazer_geometrisi())
    yaz_json(os.path.join(RP, "models/entity/simsek_kol.geo.json"), GEOMETRI)
    _kanli_geo = kanli_geometrisi()
    if _kanli_geo is not None:
        yaz_json(os.path.join(RP, "models/entity/simsek_kol_kanli.geo.json"),
                 _kanli_geo)
    # Bobby'nin kolu: ayni donusturucu, baska kaynak, UZATMA YOK.
    _bobby_geo = kanli_geometrisi(KANLI_BOBBY_GEO_DOSYA,
                                  "geometry.simsek_kol_kanli_bobby",
                                  uzat=KANLI_BOBBY_UZAT,
                                  ad="Bobby Kanli Kol")
    if _bobby_geo is not None:
        yaz_json(os.path.join(RP,
                              "models/entity/simsek_kol_kanli_bobby.geo.json"),
                 _bobby_geo)
    if GOZ_ANIM_DENEME:
        yaz_json(os.path.join(RP, "render_controllers",
                              "goz_anim.render_controllers.json"),
                 goz_anim_denetleyicisi())
    yaz_json(os.path.join(RP, "animations/goz_lazeri.animation.json"),
             lazer_animasyonu())
    if LAZER_ISIN_PARLAK:
        yaz_json(os.path.join(RP, "render_controllers",
                              "goz_lazer.render_controllers.json"),
                 goz_lazer_denetleyicisi())

    # SGA harfleri script tarafina (efsane yaziti icin)
    _sga_yol = os.path.join(BP, "scripts/yetenekler/_sga.js")
    os.makedirs(os.path.dirname(_sga_yol), exist_ok=True)
    with open(_sga_yol, "w", encoding="utf-8") as f:
        f.write(sga_modulu())
    # DIKKAT -- BURAYA DOKUNMA.

    #    v4.3'te bu baslik referansa uydurulmustu (resource_pack_name
    #    "vanilla", textures dizi, klasor textures/items). AMA v4.2
    #    oyunda CALISTI: ikonlar goruldu, kollar cizildi. Yani bu
    #    bicim dogru; v4.3 calisan bir seyi "duzeltmeye" calisiyordu.
    #    Geri alindi.                                                
    yaz_json(os.path.join(RP, "textures/item_texture.json"), {
        "resource_pack_name": "simsek_kol",
        "texture_name": "atlas.items",
        "texture_data": dokular,
    })

    # Paket ikonu: paket listesinde taninabilsin diye. Yoksa bos
    # gri kare cikiyor ve hangi paket oldugunu ayirt etmek zor.
    for kok, renk in ((BP, (198, 62, 54)), (RP, (134, 96, 62))):
        png_yaz(os.path.join(kok, "pack_icon.png"), 64, 64, paket_ikonu(renk))

    # ---- SKIN PAKETI (v4.88) ----
    # Skin dosyasi skin_uret.py'nin urettigi UzakAkraba_skin.png.
    # Burada kopyalaniyor, yeniden cizilmiyor: tek kaynak orasi.
    surum = json.load(open(os.path.join(BP, "manifest.json"),
                           encoding="utf-8"))["header"]["version"]
    yaz_json(os.path.join(SKP, "manifest.json"), {
        "format_version": 2,
        "header": {
            "name": PAKETLER["skin"][0],
            "description": PAKETLER["skin"][1],
            "uuid": SKIN_UUID_BAS,
            "version": surum,
        },
        "modules": [{
            "type": "skin_pack",
            "uuid": SKIN_UUID_MOD,
            "version": surum,
        }],
    })
    yaz_json(os.path.join(SKP, "skins.json"), {
        "serialize_name": SKIN_SERI,
        "localization_name": SKIN_SERI,
        "skins": [{
            "localization_name": _anahtar,
            # Klasik (Steve) model: skinimizin kollari 4 piksel.
            # OZEL GEOMETRI YAZILAMIYOR -- bkz. SKIN_LISTE notu.
            "geometry": "geometry.humanoid.custom",
            "texture": _dosya,
            # "paid" yazilirsa skin KILITLI gorunur -- sadece
            # Marketplace ortaklari icin.
            "type": "free",
        } for _anahtar, _dosya, _tr, _en, _kaynak in SKIN_LISTE],
    })
    os.makedirs(os.path.join(SKP, "texts"), exist_ok=True)
    yaz_json(os.path.join(SKP, "texts/languages.json"), ["en_US", "tr_TR"])
    for dosya in ("en_US.lang", "tr_TR.lang"):
        with open(os.path.join(SKP, "texts", dosya), "w", encoding="utf-8") as f:
            # Anahtar bicimi belgeden:
            #   skinpack.<serialize_name>
            #   skin.<serialize_name>.<localization_name>
            f.write("skinpack.%s=%s\n" % (SKIN_SERI, SKIN_PAKET_AD))
            f.write("skinpack.%s.by=Simsek TNT\n" % SKIN_SERI)
            for _anahtar, _dosya, _tr, _en, _kaynak in SKIN_LISTE:
                f.write("skin.%s.%s=%s\n" % (
                    SKIN_SERI, _anahtar, _tr if dosya == "tr_TR.lang" else _en))
    # Iki skinin de dokusu KOPYALANIYOR, yeniden cizilmiyor:
    #   "skin"  -> skin_uret.py'nin urettigi oyuncu skini
    #   "o_sey" -> varligin kullandigi doku (o_sey_dokusu)
    # Ikincisi kasten AYNI dosya: donusup cikinca ayni karakter
    # gorunsun. Iki yerde cizilse sessizce ayrisirlardi.
    for _anahtar, _dosya, _tr, _en, _kaynak in SKIN_LISTE:
        if _kaynak == "skin":
            kaynak_yol = SEY_SKIN_KAYNAK
        elif _kaynak == "kolsuz":
            kaynak_yol = SEY_SKIN_KAYNAK.replace(".png", "_kolsuz.png")
        else:
            kaynak_yol = os.path.join(RP, "textures/entity/%s.png" % SEY_DOKU)
        if os.path.exists(kaynak_yol):
            shutil.copyfile(kaynak_yol, os.path.join(SKP, _dosya))
        else:
            print("UYARI: skin dokusu bulunamadi (%s)" % kaynak_yol)
    png_yaz(os.path.join(SKP, "pack_icon.png"), 64, 64, paket_ikonu((32, 197, 181)))

    os.makedirs(os.path.join(RP, "texts"), exist_ok=True)
    yaz_json(os.path.join(RP, "texts/languages.json"), ["en_US", "tr_TR"])
    for dosya, satirlar in (("en_US.lang", en_us), ("tr_TR.lang", tr_tr)):
        with open(os.path.join(RP, "texts", dosya), "w", encoding="utf-8") as f:
            f.write("\n".join(satirlar) + "\n")

    # ---- ARTIK OLMAYAN dosyalari sil ----
    # Ureteci sadece "yaz" olarak birakmak sinsi bir hataya yol
    # aciyordu: listeden bir kol cikarilinca eski items/,
    # attachables/ ve doku dosyalari diskte kaliyor, pakete giriyor
    # ve oyunda hala gorunuyordu. Artik uretecin urettigi kume
    # neyse disk de o.
    beklenen = set()
    # Bot dokusu KOLLAR/IKSIRLER listelerinde degil; elle ekleniyor
    # yoksa temizlik adimi her uretimde siler.
    beklenen.add("bot")
    # Ilkel Besli dokulari da listelerde degil (v4.35)
    for _anahtar, _ad, _can, _hasar, _sec in ILKEL:
        beklenen.add("ilkel_" + _anahtar)
    # O Sey'in dokusu de hicbir listede degil (v4.88). Unutulursa
    # temizlik adimi her uretimde siliyor ve varlik mor-siyah
    # ciziliyor -- ayni tuzak dorduncu kez.
    beklenen.add(SEY_DOKU)
    # v7.2: Mutant Halim. Bu satir olmadan temizlik adimi
    # dokuyu HER uretimde siliyordu -- varlik yaziliyor,
    # doku gidiyor, mutant mor-siyah cikiyordu.
    beklenen.add(MUTANT_DOKU)
    # v7.2: Zaman Saati ikonu. Bu satir olmadan temizlik
    # adimi ikonu her uretimde siliyor.
    beklenen.add(SAAT_ESYA)
    # v4.90: maskenin ikonu da hicbir listede degil
    beklenen.add(MASKE_ESYA)
    # Duruş taslari: eklenmezse temizlik adimi her calismada
    # ikonlarini siler (v7.2'de mutant dokusunda tam bunu yasadik).
    if DURUS_ACIK:
        for _dk4, _dad4, _dr4, _dp4 in DURUSLAR:
            beklenen.add(DURUS_ONEK + _dk4)
    # v7.9: kol takasi isaretinin ikonu da hicbir listede degil
    if KOL_TAKAS_ACIK:
        beklenen.add(TAKAS_ISARET)
    # v7.16: goz animasyonu kareleri. Bu satir olmadan temizlik
    # adimi UCUNU DE her uretimde siliyor -- ve tam oyle oldu,
    # "temizlendi: 3 artik dosya" yazdi. Ayni tuzak ALTINCI kez:
    # SEY_DOKU, MUTANT_DOKU, SAAT_ESYA, ZIRH_DOKU, konsey
    # parcalari ve simdi bu.
    if GOZ_ANIM_DENEME:
        for _ak in range(1, GOZ_ANIM_KARE):
            beklenen.add("%s_k%d" % (GOZ_ANIM_DENEME, _ak))
    # v4.91: zirh parcalarinin ikonlari da listede degil
    for _zk2, _zy2, _zp2, _zt2, _ze2, _zb2 in ZIRH:
        beklenen.add(_zk2)
    # ZIRHIN VARLIK DOKUSU da listede degil. Bir kez yasandi:
    # doku kopyalandi, ayni kosuda temizlik adimi sildi ve zirh
    # oyunda mor-siyah cikardi. Ayni tuzak besinci kez.
    beklenen.add(ZIRH_DOKU)
    # v4.92: Ben 10 ikonlari
    for _bk3, _bt3, _be3, _bd3, _btr3 in BEN10 + ZIRH_MOD:
        beklenen.add(_bk3)
    # v5.2: Marvel ikonlari VE kostum dokulari. Ikisi de
    # hicbir listede degil; temizlik adimi listede olmayani
    # siliyor ve bu tuzaga daha once bes kez dusuldu.
    for _mp3 in MARVEL_PARCA:
        beklenen.add(MARVEL_ONEK + _mp3["kahraman"] + MARVEL_AYIRAC
                     + _mp3["anahtar"])
    # v6.2: Konsey parcalari da hicbir listede degil -- bu satir
    # unutulsaydi temizlik adimi 54 dosyayi HER uretimde
    # silerdi (silahlarda bir kez yasandi).
    for _kt3 in KONSEY:
        beklenen.add(KONSEY_ONEK + _kt3[0])
    # v4.93: Omnitrix saatleri (hem ikon hem varlik dokusu)
    for _ok3, _ot3, _oe3 in OMNITRIX:
        beklenen.add(_ok3)
    # Silahlar da hicbir listede degil (v4.48). Bu satir
    # unutuldugunda temizlik adimi baltayi HER uretimde
    # siliyordu: esya yaziliyor, atlas kaydi kaliyor, dosya
    # gidiyor -- yani oyunda "bilinmeyen esya". Bir kez yasandi,
    # testi 5e bolumunde. Dongu: yeni silah eklenince kendi
    # kendine giriyor, elle eklemek gerekmiyor.
    for _skimlik, _sad, _skaynak in ILKEL_SILAHLAR.values():
        beklenen.add(_skimlik)
    # Freedom Stone da hicbir listede degil (v4.50, v4.86'da
    # adi degisti)
    beklenen.add(DISMONT_ESYA)
    # v4.86'nin iki yeni esyasi. BU SATIR UNUTULDUGUNDA tam da
    # yukarida anlatilan sey oldu: esya yazildi, atlas kaydi
    # kaldi, dosya silindi -- yani oyunda "bilinmeyen esya".
    # Ikinci kez yasandi; bu yuzden burada duruyor.
    beklenen.add(KILIC_ESYA)
    beklenen.add(WILL_ESYA)
    beklenen.add(TAS_ESYA)
    # v4.87'nin silahlari ve mermileri. Ayni tuzak ucuncu kez:
    # listeye yazilmayan her esya temizlik adiminda siliniyor.
    for _sk, _sa, _sh, _sd in SILAHLAR:
        beklenen.add(_sk)
    for _mk, _ma, _md in MERMILER:
        beklenen.add(_mk)
    # v5.1: teknoloji zirhlarinin esyalari, ikonlari VE giyilen
    # dokulari. Ayni tuzak altinci kez -- bu satir olmasa
    # zirhlar her uretimde silinir, oyunda "bilinmeyen esya"
    # olarak gorunurdu.
    for _tk3, _tt3, _te3, _tp3, _tg3 in TEKNOLOJI_TAKIM:
        for _tpp in _tp3:
            beklenen.add(_tk3 + "_" + _tpp)
        if _tg3 == "pe":
            beklenen.add(_tk3 + "_k1")
            beklenen.add(_tk3 + "_k2")
    beklenen.add(MEKA_DOKU)
    # v5.4: Mahou esyalari ve parsomenleri. Ayni tuzak
    # yedinci kez -- listede olmayan her sey siliniyor.
    for _mk4, _mt4, _me4, _mh4, _md4 in MAHOU_ESYA:
        beklenen.add(MAHOU_ONEK + _mk4)
    for _bk4, _bt4, _be4 in MAHOU_BUYU:
        beklenen.add(MAHOU_ONEK + _bk4)
    for satir in KOLLAR:
        beklenen.add(satir[0])
    for kimlik, _ad, _sivi, goz, _gozRenk in IKSIRLER:
        beklenen.add("iksir_" + kimlik)
        beklenen.add(goz)
        beklenen.add(goz + "_lazer")

    # v5.2: attachable'i olmayan artik GEOMETRILER de silinsin.
    # Fisk kaldirilinca kahraman_kostum.geo.json diskte kaldi ve
    # pakete girdi -- testte yakalandi. Geometriler esya adiyla
    # eslesmedigi icin (bir geometri birden cok esyaya hizmet
    # edebiliyor) ayri bir kume tutuluyor: SADECE bir
    # attachable'in gosterdigi geometri kaliyor.
    gecerliGeo = set()
    _attDizin = os.path.join(RP, "attachables")
    if os.path.isdir(_attDizin):
        for _af in os.listdir(_attDizin):
            if not _af.endswith(".json"):
                continue
            try:
                _ad = json.load(open(os.path.join(_attDizin, _af),
                                     encoding="utf-8"))
            except Exception:
                continue
            _g = ((_ad.get("minecraft:attachable") or {}).get("description")
                  or {}).get("geometry") or {}
            for _gv in _g.values():
                gecerliGeo.add(str(_gv).replace("geometry.", ""))
    # Varliklarin (bot, O Sey, ilkel...) geometrileri attachable
    # listesinde YOK ve silinmemeli: onlar entity JSON'larindan
    # geliyor. Bu yuzden temizlik yalniz esya adiyla eslesen
    # oneklere bakiyor.
    _geoDizin = os.path.join(RP, "models/entity")
    if os.path.isdir(_geoDizin):
        for _gf in os.listdir(_geoDizin):
            if not _gf.endswith(".geo.json"):
                continue
            _gad = _gf[:-len(".geo.json")]
            # v6.2: `kns_` de listeye girdi. Girmeseydi Konsey
            # geometrileri temizlikten MUAF kalirdi -- ve tam
            # oyle oldu: parcalar `kol_*`ten `kolluk_*`e yeniden
            # adlandirilinca 14 eski `.geo.json` pakette KALDI.
            # Atlasta ve dil dosyasinda yoklardi (o yuzden oyunda
            # gorunmezlerdi) ama pakete giriyorlardi.
            if not (_gad.startswith("mrv_") or _gad.startswith("kahraman")
                    or _gad.startswith("pe_") or _gad.startswith("meka_")
                    or _gad.startswith("kns_")):
                continue
            if _gad in gecerliGeo:
                continue
            os.remove(os.path.join(_geoDizin, _gf))
            print("temizlendi (geometri): %s" % _gf)

    # ---- ANIMASYONLAR NEDEN OTOMATIK SILINMIYOR  (v5.8) ----
    # WoM kaldirilinca wom_dovus.animation.json diskte kalmisti
    # -- v5.2'deki kahraman_kostum.geo.json tuzaginin aynisi.
    # Ilk cozumum "beklenen animasyon listesi disindakini sil"
    # oldu ve ONU YAZAR YAZMAZ simsek_kol.animation.json'i
    # sildi: o dosya URETILMIYOR, elle yazilmis ve depoda
    # commit'li. Yani kural, korumasi gereken seyi yok etti.
    #
    # Uretecin bilmedigi bir dosyayi silmesi yanlis. Artik
    # animasyon TARAYICISI bakiyor (test/anim_tara.py): bir
    # animasyon dosyasi ne kaynakta var ne de kimse ona
    # basvuruyorsa HATA veriyor. Silme karari insanin.
    silinen = 0
    for klasor, uzanti in ((os.path.join(BP, "items"), ".json"),
                           (os.path.join(RP, "attachables"), ".json"),
                           (os.path.join(RP, "textures/item"), ".png"),
                           (os.path.join(RP, "textures/entity"), ".png")):
        if not os.path.isdir(klasor):
            continue
        for f in os.listdir(klasor):
            if not f.endswith(uzanti):
                continue
            if f[:-len(uzanti)] not in beklenen:
                os.remove(os.path.join(klasor, f))
                silinen += 1
    if silinen:
        print("temizlendi: %d artik dosya" % silinen)

    print("uretildi: %d kol, %d iksir, %d goz (lazer varyantiyla) -> %d esya + bot"
          % (len(KOLLAR), len(IKSIRLER), len(IKSIRLER) * 2,
             len(KOLLAR) + len(IKSIRLER) * 3))


if __name__ == "__main__":
    main()
