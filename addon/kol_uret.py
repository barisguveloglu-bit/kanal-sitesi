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

import json, os, struct, zlib

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
SKIN_PAKET_AD = "Şimşek Skinleri"

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
]

# Turkce gorunen adlar (dil dosyasi icin; JSON'da ASCII tutuluyor)
TR_AD = {
    "kol_toprak": "Toprak Kol",
    "kol_ucus":   "Uçuş Kolu",
    "kol_buz":    "Buz Kol",
    "kol_dave":   "Dave Kolu",
    "kol_kevin":  "Kevin Kolu",
    "kol_gunes":  "Güneş Kolu",
}

# BEKLEME = 60 tick = 3 sn. Esya beklemesi bununla ayni tutuluyor ki
# oyuncu ekranda donen bekleme gostergesini gorsun.
BEKLEME_SN = 3.0

def yaz_json(yol, veri):
    os.makedirs(os.path.dirname(yol), exist_ok=True)
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
LAZER_ISIN_MENZIL = 21      # blok
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
                "textures": {
                    "default": "textures/entity/" + kimlik,
                    "enchanted": "textures/misc/enchanted_actor_glint",
                },
                # Lazer varyanti ISINLI geometriyi kullaniyor:
                # ayni goz kaplamasi + kafadan cikan iki uzun
                # kutu. Normal goz sade geometride kaliyor,
                # yoksa iksir icer icmez isin cikardi.
                "geometry": {
                    "default": ("geometry.simsek_goz_lazer"
                                if lazerli else "geometry.simsek_goz")
                },
                "scripts": {"parent_setup": "variable.helmet_layer_visible = 0.0;"},
                "render_controllers": [
                    LAZER_ISIN_DENETIM
                    if (lazerli and LAZER_ISIN_PARLAK)
                    else "controller.render.armor"
                ],
            }
        },
    }


# ---------------------------------------------------------- attachable
def attachable(kimlik):
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
                "geometry": {"default": "geometry.simsek_kol"},
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
# (mod anahtari, ek katman anahtari, geo dosyasi, animasyon)
ZIRH_EK = [
    ("guc",   "zirh_mod_guc_matkap",  "zirh_mod_guc_matkap",  "drill_spin"),
    ("titan", "zirh_mod_titan_hale",  "zirh_mod_titan_hale",  None),
]

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


# ================================================================
#  WEAPONS OF MIRACLES  (Epic Fight eklentisi)             v5.0
# ================================================================
# Kaynak: WeaponsOfMiracles 2.0.176 (Reascer), Epic Fight uzerine
# kurulu bir NeoForge modu.
#
# ---- SAYILAR NEREDEN ----
# Bu modun sayilari JSON'da DEGIL, derlenmis Java icinde. Ama
# okunabilir: `javap` ile bytecode ayristirildi.
#
#   reascer/wom/world/item/WOMItems.class
#     static{} blogu:  "agony" -> InvokeDynamic -> lambda$static$N
#     BootstrapMethods tablosu o lambda'yi cozuyor
#     lambda govdesi:  Rarity.RARE, durability(2135),
#                      AgonySpearItem.createWeaponAttributes()
#   reascer/wom/world/item/AgonySpearItem.class
#     createWeaponAttributes():  ldc 5.0f (hasar), ldc -2.0f (hiz)
#
# Yani hicbir sayi tahmin edilmedi; hepsi jar'dan cikarildi ve
# test jar diskteyken YENIDEN cikarip karsilastiriyor.
#
# Balta ve asalar kademe formuluyle:
#   Greataxe: hasar = 7.0 + kademe bonusu
#   Staff:    hasar = 1.0 + kademe bonusu
#   (vanilla bonus: tahta 0, tas 1, demir 2, elmas 3, altin 0,
#    netherite 4 -- GreataxeItem/StaffItem.class icinde okundu)
#
# ---- JAVA HASARI -> BEDROCK HASARI ----
# Java'da esyanin sayisi bir DEGISTIRICI: oyuncunun taban
# yumruk hasari 1 ve esya onun ustune biniyor. Bedrock'ta
# minecraft:damage TOPLAM hasar. O yuzden
#     bedrock = java + 1
# (elmas kilic: Java +6, Bedrock 7 -- olculdu, birebir uyuyor.)
#
# ---- AKTARILAMAYAN ----
# SALDIRI HIZI. Java'da her silahin bir attack_speed
# degistiricisi var (-2.0'dan -2.9'a). Bedrock'ta esya basina
# saldiri hizi bileseni YOK; oyunun kendi vurus temposu
# sabit. Sayilar tabloda DURUYOR (kaynak belgesi olsun ve bir
# gun karsiligi cikarsa hazir olsun) ama oyunda karsiligi yok.
# Ozet metinleri saldiri hizi VAAT ETMIYOR.
#
# 3B modeller de aktarilamiyor: .obj/.mtl ucgen agi, Bedrock
# ise kutu tabanli .geo.json istiyor. Ikonlar (32x32) modun
# kendi pikselleri, oldugu gibi.
#
# (anahtar, TR ad, EN ad, java hasar, java hiz, dayaniklilik, nadirlik)
WOM_ONEK = "wom_"
WOM = [
    ("agony",              "Izdırap",            "Agony",              5.0, -2.0,  2135, "RARE"),
    ("antitheus",          "Antitheus",          "Antitheus",          7.0, -2.1,  6666, "EPIC"),
    ("blackstar",          "Kara Yıldız",        "Blackstar",          8.0, -2.7,  2135, "RARE"),
    ("ender_blaster",      "Ender Tabancası",    "Ender Blaster",      6.0, -0.55, 4735, "EPIC"),
    ("evil_tachi",         "Kötü Ôdachi",        "Evil Ôdachi",        7.0, -2.8,  1635, "RARE"),
    ("gesetz",             "Gesetz",             "Gesetz",             3.0, -2.5,  4157, "RARE"),
    ("herrscher",          "Herrscher",          "Herrscher",          5.0, -2.25, 1582, "RARE"),
    ("hollow_longsword",   "Kof Uzun Kılıç",     "Hollow Longsword",   6.0, -2.6,   875, "RARE"),
    ("jabberwocky",        "Pençeli Eldiven",    "Clawed Gauntlet",    5.0, -0.25,  782, "RARE"),
    ("moonless",           "Aysız",              "Moonless",           6.0, -2.3,  2135, "EPIC"),
    ("napoleon",           "Napoleon",           "Napoleon",           6.0, -2.5,  2135, "EPIC"),
    ("nova",               "Nova",               "Nova",               4.0, -2.4,  2135, "RARE"),
    ("orbit",              "Yörünge",            "Orbit",              7.0, -2.3,  2135, "RARE"),
    ("ruine",              "Ruine",              "Ruine",              6.2, -2.45, 2135, "RARE"),
    ("satsujin",           "Satsujin",           "Satsujin",           6.0, -1.8,  2135, "EPIC"),
    ("solar",              "Güneş",              "Solar",              8.0, -2.9,  2135, "EPIC"),
    ("tormented_mind",     "Azap",               "Torment",            8.0, -2.7,  2135, "RARE"),
    # ---- kademe silahlari (formul yukarida) ----
    ("wooden_staff",       "Tahta Asa",          "Wooden Staff",       1.0, -2.5,    59, "COMMON"),
    ("stone_staff",        "Taş Asa",            "Stone Staff",        2.0, -2.5,   131, "COMMON"),
    ("iron_staff",         "Demir Asa",          "Iron Staff",         3.0, -2.5,   250, "COMMON"),
    ("golden_staff",       "Altın Asa",          "Golden Staff",       1.0, -2.5,    32, "COMMON"),
    ("diamond_staff",      "Elmas Asa",          "Diamond Staff",      4.0, -2.5,  1561, "COMMON"),
    ("netherite_staff",    "Netherite Asa",      "Netherite Staff",    5.0, -2.5,  2031, "COMMON"),
    ("iron_greataxe",      "Demir Balyoz Balta", "Iron Greataxe",      9.0, -2.5,   250, "COMMON"),
    ("golden_greataxe",    "Altın Balyoz Balta", "Golden Greataxe",    7.0, -2.5,    32, "COMMON"),
    ("diamond_greataxe",   "Elmas Balyoz Balta", "Diamond Greataxe",  10.0, -2.5,  1561, "COMMON"),
    ("netherite_greataxe", "Netherite Balyoz",   "Netherite Greataxe",11.0, -2.5,  2031, "COMMON"),
]

# Nadirlik -> Bedrock'ta gorunen ad rengi. Bedrock'ta esya
# nadirligi diye bir bilesen yok; ADIN RENGIYLE anlatiyoruz.
WOM_RENK = {"COMMON": "§f", "UNCOMMON": "§a", "RARE": "§b", "EPIC": "§d"}


def wom_esyasi(anahtar, tr_ad, java_hasar, dayaniklilik, nadirlik):
    """WoM silahi.

    ---- HASAR ----
    Java'da esyanin sayisi bir DEGISTIRICI (taban yumruk 1
    ustune biner); Bedrock'ta minecraft:damage TOPLAM hasar.
    O yuzden +1. Elmas kilicta olculdu: Java +6, Bedrock 7.

    ---- DAYANIKLILIK ----
    Modun kendi sayisi, oldugu gibi. Bizim patron silahlarinda
    dayaniklilik YOK (kirilmasinlar diye) ama bunlar patron
    silahi degil, kazanilan silahlar -- modda da kiriliyorlar.

    ---- SALDIRI HIZI YOK ----
    Bedrock'ta esya basina saldiri hizi bileseni yok. Sayi
    tabloda duruyor ama oyunda karsiligi yok; ozet de vaat
    etmiyor.                                                   """
    return {
        "format_version": "1.21.0",
        "minecraft:item": {
            "description": {
                "identifier": "pa:" + WOM_ONEK + anahtar,
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": WOM_ONEK + anahtar},
                "minecraft:display_name": {
                    "value": WOM_RENK.get(nadirlik, "§f") + tr_ad},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                "minecraft:allow_off_hand": False,
                "minecraft:damage": int(round(java_hasar)) + 1,
                "minecraft:durability": {"max_durability": dayaniklilik},
            },
        },
    }


# ---- DOVUS ANIMASYONLARI  (Epic Fight / WoM)             v5.0
#
# Kullanici (once): "bir tane dovus modu buldum, ek animasyonlar
# ekliyor, bunu da kullanabiliriz sanirim."
#
# ---- CEVRILDILER, KOPYALANMADILAR ----
# Epic Fight ve WoM animasyonlari Bedrock bicimi DEGIL:
#   Epic Fight : eklem basina kare zamanlari + her karede 4x4
#                DONUSUM MATRISI, kendi iskeletinde
#                (Root/Torso/Chest/Shoulder_R/Arm_R/Elbow_R...)
#   Bedrock    : kemik basina euler DERECE, vanilla oyuncu
#                kemiklerinde (head/body/rightArm/...)
#
# Cevirici: kaynak_anim/ef_cevir.py. Yaptigi is:
#   1. Baglama pozunu (armature) cikarip DELTA aliyor
#        D(t) = bind^-1 · L(t)
#      Delta olmadan her kemik dinlenme pozu kadar kayiyordu.
#   2. Bedrock'un kolu TEK kemik, Epic Fight'inki zincir
#      (Shoulder->Arm->Elbow->Hand). Zincirin deltalari
#      carpiliyor: rightArm = D(Shoulder_R)·D(Arm_R).
#      DIRSEK BUKULMESI KAYBOLUYOR -- Bedrock'ta onu tasiyacak
#      kemik yok. Aktarilan sey kolun GENEL YONU.
#   3. Matris -> euler XYZ derece.
#   4. Bedrock kurali: dosyadaki deger matematiksel donusun
#      TERSI (bu depoda v4.88'de olculdu).
#
# ---- YAKALANAN HATA ----
# Ilk cevrimde bacaklar kilic sallamada ~50 derece donuyordu.
# Sebep: Epic Fight'ta Thigh_R, Root'un cocugu (Torso'nun
# KARDESI); Bedrock'ta rightLeg, body'nin COCUGU. Yani govde
# donusu bacaklara mirasla gecip IKI KEZ uygulaniyordu.
# Duzeltme: bacagin deltasindan govdeninki cikariliyor.
#
# ---- DOGRULAMA ----
# Sayilarin makul gorunmesi yetmedi; cevrilen pozlar
# scratchpad/onizle_poz.py ile ciziLdi ve gercek bir kilic
# savurusu / mizrak hamlesi olduklari GORULDU. Ben 10
# dokularindaki dersin aynisi.
#
# ---- SILAH -> VURUS SERISI ----
# WoM'un kendi animasyonlari ZATEN silah adiyla:
# solar_auto_1..4, katana_auto_1..3, torment_auto_1..4...
# Yani eslesme uydurma degil, modun kendi adlandirmasi.
# WoM'da kendi serisi olmayan silahlar (balyoz baltalar,
# pencelieldiven, kof uzun kilic) Epic Fight'in TUR serisine
# baglandi (axe_auto, fist_auto, longsword_auto).
WOM_ANIM_DOSYA = "wom_dovus"
WOM_ANIM_ONEK = "animation.wom."
WOM_SERI = {
    "agony": ["agony_auto_1", "agony_auto_2", "agony_auto_3", "agony_auto_4"],
    "antitheus": ["antitheus_auto_1", "antitheus_auto_2", "antitheus_auto_3", "antitheus_auto_4"],
    "blackstar": ["blackstar_basic_attack_1", "blackstar_basic_attack_2", "blackstar_basic_attack_3", "blackstar_basic_attack_4"],
    "diamond_greataxe": ["axe_auto1", "axe_auto2"],
    "diamond_staff": ["staff_auto_1", "staff_auto_2", "staff_auto_3"],
    "ender_blaster": ["enderblaster_onehand_auto_1", "enderblaster_onehand_auto_2", "enderblaster_onehand_auto_3", "enderblaster_onehand_auto_4"],
    "evil_tachi": ["katana_auto_1", "katana_auto_2", "katana_auto_3"],
    "gesetz": ["gezets_auto_1", "gezets_auto_2", "gezets_auto_3"],
    "golden_greataxe": ["axe_auto1", "axe_auto2"],
    "golden_staff": ["staff_auto_1", "staff_auto_2", "staff_auto_3"],
    "herrscher": ["herrscher_auto_1", "herrscher_auto_2", "herrscher_auto_3"],
    "hollow_longsword": ["longsword_auto1", "longsword_auto2", "longsword_auto3"],
    "iron_greataxe": ["axe_auto1", "axe_auto2"],
    "iron_staff": ["staff_auto_1", "staff_auto_2", "staff_auto_3"],
    "jabberwocky": ["fist_auto1", "fist_auto2", "fist_auto3"],
    "moonless": ["moonless_auto_1", "moonless_auto_2", "moonless_auto_3"],
    "napoleon": ["napoleon_auto_1", "napoleon_auto_2", "napoleon_auto_3", "napoleon_auto_4"],
    "netherite_greataxe": ["axe_auto1", "axe_auto2"],
    "netherite_staff": ["staff_auto_1", "staff_auto_2", "staff_auto_3"],
    "nova": ["nova_attack_1", "nova_attack_2", "nova_attack_3", "nova_attack_4"],
    "orbit": ["orbit_attack_1", "orbit_attack_2", "orbit_attack_3", "orbit_attack_4"],
    "ruine": ["ruine_auto_1", "ruine_auto_2", "ruine_auto_3", "ruine_auto_4"],
    "satsujin": ["katana_auto_1", "katana_auto_2", "katana_auto_3"],
    "solar": ["solar_auto_1", "solar_auto_2", "solar_auto_3", "solar_auto_4"],
    "stone_staff": ["staff_auto_1", "staff_auto_2", "staff_auto_3"],
    "tormented_mind": ["torment_auto_1", "torment_auto_2", "torment_auto_3", "torment_auto_4"],
    "wooden_staff": ["staff_auto_1", "staff_auto_2", "staff_auto_3"],
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
# tek doku kullanilabildigi icin:
#   skin katmani ana doku olarak aliniyor (uniform ve glow
#   neredeyse bos -- olculdu: 0/16384 ve 2/16384)
#   Ates Topu haric: onun ALEVI glow katmaninda, o yuzden taban +
#   alev birlestirildi (kaynak_doku/ben_ates.png).
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
BEN10_ATILAN = {"bb_main", "group"}

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
# (kisa ad, TR ad, EN ad, tur, olcek)
BEN10_TABAN = [
    ("elmas",   "Elmas Kafa", "Diamondhead", "Petrosapien",     1.35),
    ("dortkol", "Dört Kol",   "Four Arms",   "Tetramand",       2.0),
    ("cene",    "Yüzen Çene", "Ripjaws",     "Piscciss Volann", 1.17),
    ("ates",    "Ateş Topu",  "Heatblast",   "Pyronite",        1.1),
]

# tur adi -> modun kendi power dosyasi (test karsilastiriyor)
BEN10_GUC_DOSYA = {
    "Petrosapien":     "petrosapien",
    "Tetramand":       "tetramand",
    "Piscciss Volann": "piscciss_volann",
    "Pyronite":        "pyronite",
}

# (anahtar, TR ad, EN ad, geo dosyalari, tur adi)
BEN10 = []
# anahtar -> olcek (v4.97). Ayri bir sozluk cunku BEN10 demeti
# bes elemanli ve onu genisletmek ALTI yerde dongu imzasi
# degistirmek demekti.
BEN10_OLCEK = {}
for _kisa, _tr, _en, _tur, _olcek in BEN10_TABAN:
    for _son, _btr, _ben in BEN10_BICIM:
        _a = "ben_" + _kisa + _son
        _dosyalar = [_a]
        # Dort Kol'un FAZLADAN IKI KOLU her bicimde ayri dosyada
        if _kisa == "dortkol":
            _dosyalar.append(_a + "_kollar")
        BEN10.append((_a, "%s · %s" % (_tr, _btr), "%s (%s)" % (_en, _ben),
                      _dosyalar, _tur))
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
    sira, agac = ["head"], []
    while sira:
        ad = sira.pop(0)
        for b in cocuk.get(ad, []):
            agac.append(b)
            sira.append(b["name"])
    agac = [b for b in kemikler if b["name"] == "head"] + agac

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
    for _em, _ek, _egeo, _eanim in ZIRH_EK:
        d["geometry"][_ek] = "geometry." + _ek
        d["textures"][_ek] = "textures/entity/" + _ek
    # v4.92: Ben 10 yaratiklari + v4.94: Max Steel mod
    # cekirdekleri. Ayni kalibin tekrari -- her biri kendi
    # geometrisi, kendi dokusu, kendi tetigi.
    for _ba, _btr, _ben, _bdos, _btur in BEN10 + ZIRH_MOD:
        d["geometry"][_ba] = "geometry." + _ba
        d["textures"][_ba] = "textures/entity/" + _ba

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
    # "Herhangi bir donusum acik mi": vanilla govdeyi kapatan
    # kosul. Tek tek yazmak yerine TEK degisken -- yeni bir
    # yaratik eklenince burasi kendiliginden dogru kaliyor.
    d["scripts"]["pre_animation"].append(
        "variable.donusuk = variable.o_sey" +
        "".join(" || variable." + _b[0] for _b in BEN10 + ZIRH_MOD) + ";")

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
    # Ek katmanin TETIGI ana modun degiskeni: cekirdek elde
    # oldugunda ikisi birden ciziliyor. Kendi degiskeni
    # OLMAMALI -- ayri bir tetik iki katmanin ayrisabilecegi
    # anlamina gelirdi (matkaplar var, takim yok gibi).
    for _em, _ek, _egeo, _eanim in ZIRH_EK:
        yeni_rc.append({
            "controller.render." + _ek:
                "variable.zirh_mod_%s && !variable.is_first_person"
                " && !variable.map_face_icon" % _em
        })
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
    for _kisa, _tr2, _en2, _tur2, _olc2 in BEN10_TABAN:
        _uyeler = ["variable.ben_%s%s" % (_kisa, _son)
                   for _son, _a1, _a2 in BEN10_BICIM]
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
    for _em, _ek, _egeo, _eanim in ZIRH_EK:
        if not _eanim:
            continue
        _anim_adi = ZIRH_EK_ANIM.get(_eanim)
        if not _anim_adi:
            continue
        d["animations"][_ek] = _anim_adi
        d["scripts"]["animate"].append({_ek: "variable.zirh_mod_" + _em})

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
    for _em, _ek, _egeo, _eanim in ZIRH_EK:
        denetleyiciler["controller.render." + _ek] = {
            "geometry": "Geometry." + _ek,
            "textures": ["Texture." + _ek],
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
    yaz_json(os.path.join(OMP, "animations/o_sey.animation.json"), SEY_ANIM)
    kaynak_doku = os.path.join(RP, "textures/entity/%s.png" % SEY_DOKU)
    hedef_doku = os.path.join(OMP, "textures/entity/%s.png" % SEY_DOKU)
    if os.path.exists(kaynak_doku):
        os.makedirs(os.path.dirname(hedef_doku), exist_ok=True)
        shutil.copyfile(kaynak_doku, hedef_doku)
    # Ben 10 yaratiklari (v4.92). Paket kendi kendine yetsin:
    # geometri ve doku burada da duruyor, ikisi de URETILDIGI
    # icin ayrisamazlar.
    for _em, _ek, _egeo, _eanim in ZIRH_EK:
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
            "name": "Şimşek Oyuncu Modeli (O Şey)",
            "description": ("Maskeyi eline al, O Şey ol. AYRI paket: "
                            "player.entity.json'u ezen baska bir paketle "
                            "birlikte calismaz, sorun cikarsa yalniz bunu kapat."),
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
GOZ_OLCEK = 8
GOZ_DOKU  = 64 * GOZ_OLCEK          # 512x512

# Asagidakiler ALT PIKSEL cinsinden (1 Minecraft pikseli =
# GOZ_OLCEK alt piksel). Oranlar referanstan olculdu:
# cekirdegin ustunde ~1 MC piksel sacak, ~0.4 MC piksel hale.
GOZ_HALE   = 5                      # halenin yariCapi
GOZ_HALE_YATAY = 1.9                # hale yatayda bu kat DAHA DAR
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


def _goz_govdesi(p, x0, x1, y0, y1, renk, tohum, guc=1.0):
    """TEK bir gozu cizer: cekirdek + hale + yukselen sacaklar.

    x0..x1 / y0..y1 ALT PIKSEL cinsinden cekirdegin siniri
    (x1, y1 disarida). Referansin (best StarOxine mod) gozunun
    piksel piksel cozulmus hali:

        .##..##.     <- kopuk kivilcimlar
        ###.###.     <- sacaklar
        ###.####     <- CEKIRDEK
        .#...#..     <- alta sizan isik

    guc: lazer varyantinda 1'den buyuk -- sacaklar uzuyor,
    hale genisliyor. Sekil ayni kaliyor ki iki varyant ayni
    goz gibi dursun, farkli bir goz gibi degil.               """
    rast = _uretec(tohum)
    # Ust kenar parlatmasi 0.45 iken KOYU renklerde (Kan
    # Iksiri) gozun ortasindan gecen beyaz bir cizgi gibi
    # duruyordu -- acik renklerde sorun yoktu, o yuzden
    # once fark edilmedi. 0.26 her renkte "isik yukari
    # tasiyor" hissini veriyor, cizgi olusturmuyor.
    parlak = tuple(min(255, int(c + (255 - c) * 0.26)) for c in renk)

    # ---- 1. Cekirdek: tam opak, UST KENARI biraz daha parlak ----
    # Isik yukari dogru tasiyor gibi dursun diye ust kenar
    # parlatildi. Once ORTA sutun parlatilmisti; o, gozun tam
    # ortasindan gecen dikey bir cizgi olarak goruluyordu.
    for y in range(y0, y1):
        ust = (y - y0) < max(1, (y1 - y0) // 8)
        for x in range(x0, x1):
            _kat(p, x, y, parlak if ust else renk, 255)

    # ---- 2. Hale: cekirdege uzakligiyla sonen yumusak isik ----
    # entity_alphablend olmadan bu tamamen kayboluyor (alpha
    # test ara tonlari kesiyor) -- malzeme notuna bak.
    #
    # YATAYDA DAHA DAR (dx * GOZ_HALE_YATAY). Sebep: iki goz
    # arasinda sadece 2 MC pikseli var (x=11,12). Daire seklinde
    # bir hale o araligi dolduruyor ve iki goz TEK BIR VIZOR
    # gibi gorunuyordu -- v4.18'de "gozluk gibi durdu" diye
    # kaldirilan seyin aynisi. Yatayi kisaltinca aradaki bosluk
    # aciliyor, isik yukari-asagi yayilmaya devam ediyor.
    yari = GOZ_HALE * guc
    tara = int(yari) + 1
    for y in range(y0 - tara, y1 + tara):
        for x in range(x0 - tara, x1 + tara):
            if x0 <= x < x1 and y0 <= y < y1:
                continue
            dx = 0 if x0 <= x < x1 else (x0 - x if x < x0 else x - x1 + 1)
            dy = 0 if y0 <= y < y1 else (y0 - y if y < y0 else y - y1 + 1)
            uzak = ((dx * GOZ_HALE_YATAY) ** 2 + dy * dy) ** 0.5
            if uzak > yari:
                continue
            _kat(p, x, y, renk, 200 * (1 - uzak / (yari + 1.0)) ** 1.7)

    # ---- 3. Sacaklar: cekirdegin USTUNDEN yukselen diller ----
    # Referansta gozun kimligini tasiyan kisim bu.
    #
    # Ilk denemede hepsi ayni kalinlikta ve esit arali cikti,
    # CIT KAZIGI gibi duruyordu. Referansin sacaklari hem boyca
    # hem kalinlikca farkli, bazilari dibinde birlesiyor. Uc sey
    # degisken: yer, boy, taban kalinligi.
    genis = x1 - x0
    for i in range(GOZ_SACAK_ADET):
        # Esit dagit, sonra kaydir -- tamamen rastgele yer
        # secmek bir yana kumelenip obur yani bos birakiyordu.
        sx = x0 + int((i + 0.5) * genis / GOZ_SACAK_ADET) + rast(3) - 1
        sx = max(x0, min(x1 - 1, sx))
        boy = int(GOZ_SACAK * (0.35 + rast(70) / 100.0) * guc)
        taban = 1 + (1 if rast(3) == 0 else 0)     # cogu ince, bazisi kalin
        for k in range(boy):
            y = y0 - 1 - k
            oran = k / float(max(1, boy))
            kalin = int(round(taban * (1 - oran)))
            alfa = 255 * (1 - oran) ** 1.25
            for dx in range(-kalin, kalin + 1):
                # Sacaklar CEKIRDEGIN RENGINDE. Once uclari
                # parlatilmisti ve hepsi beyazimsi cikiyordu --
                # referansta sacaklar cekirdekle ayni renkte,
                # sadece incelip saydamlasiyorlar.
                _kat(p, sx + dx, y, renk, alfa)

    # ---- 4. Kivilcimlar: sacaklardan kopmus zerreler ----
    for _ in range(GOZ_KIVILCIM):
        kx = x0 + rast(max(1, genis))
        ky = y0 - int(GOZ_SACAK * guc) - rast(max(1, GOZ_OLCEK // 2))
        _kat(p, kx, ky, renk, 200)
        if GOZ_OLCEK >= 8:
            _kat(p, kx + 1, ky, renk, 130)

    # ---- 5. Alta sizan isik ----
    # Referansta da var. Neden asagi: goz satirinin USTU bizim
    # skinimizde sac (y=11), isik orada kayboluyor; ALTI duz
    # ten (y=13), isik orada gorunuyor.
    derin = max(1, int(GOZ_OLCEK * 0.4 * guc))
    for y in range(y1, y1 + derin):
        oran = (y - y1) / float(derin)
        for x in range(x0 + 1, x1 - 1):
            _kat(p, x, y, renk, 150 * (1 - oran) ** 1.5)


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
def main():
    dokular = {}
    en_us, tr_tr = [], []

    for kimlik, _yetenek, ad, ana, vurgu in KOLLAR:
        yaz_json(os.path.join(BP, "items", kimlik + ".json"), esya(kimlik, ad))
        yaz_json(os.path.join(RP, "attachables", kimlik + ".json"), attachable(kimlik))

        if kimlik == "kol_toprak":
            doku = toprak_dokusu()
        elif kimlik == "kol_buz":
            doku = buz_dokusu()
        else:
            doku = varlik_dokusu(ana, vurgu)
        png_yaz(os.path.join(RP, "textures/entity", kimlik + ".png"), 64, 64, doku)
        png_yaz(os.path.join(RP, "textures/item", kimlik + ".png"), 16, 16,
                esya_ikonu(ana, vurgu))

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
    # Kilik (v4.89): donusumun bedeni. Ayni geometri, ayni doku.
    yaz_json(os.path.join(BP, "entities/o_sey_kilik.json"), o_sey_kilik_varligi())
    yaz_json(os.path.join(RP, "entity/o_sey_kilik.entity.json"),
             o_sey_kilik_istemci_varligi())

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

    # ---- DOVUS ANIMASYONLARI (v5.0) ----
    # Cevrilmis dosya oldugu gibi kopyalaniyor; cevrimi
    # kaynak_anim/ef_cevir.py yapti (gerekcesi WOM_SERI
    # basliginda).
    _wanim = os.path.join(BEN10_ANIM_KAYNAK, WOM_ANIM_DOSYA + ".animation.json")
    if os.path.exists(_wanim):
        _wh = os.path.join(RP, "animations/%s.animation.json" % WOM_ANIM_DOSYA)
        os.makedirs(os.path.dirname(_wh), exist_ok=True)
        shutil.copyfile(_wanim, _wh)
    else:
        print("UYARI: dovus animasyonlari yok (%s)" % _wanim)

    # ---- WEAPONS OF MIRACLES (v5.0) ----
    # 27 silah. Sayilar jar'in bytecode'undan cikarildi
    # (gerekcesi WOM tablosunun basinda); ikonlar modun kendi
    # pikselleri, 32x32'ye indirildi.
    for _wa, _wtr, _wen, _wh, _whz, _wd, _wn in WOM:
        _wad = WOM_ONEK + _wa
        yaz_json(os.path.join(BP, "items/%s.json" % _wad),
                 wom_esyasi(_wa, _wtr, _wh, _wd, _wn))
        _wk = os.path.join(DOKU_KAYNAK, _wad + ".png")
        if os.path.exists(_wk):
            _wy = os.path.join(RP, "textures/item/%s.png" % _wad)
            os.makedirs(os.path.dirname(_wy), exist_ok=True)
            shutil.copyfile(_wk, _wy)
        else:
            print("UYARI: %s ikonu yok (%s)" % (_wad, _wk))
        dokular[_wad] = {"textures": "textures/item/" + _wad}
        for liste, ad in ((en_us, _wen), (tr_tr, _wtr)):
            liste.append("item.pa:%s.name=%s" % (_wad, ad))
            liste.append("item.pa:%s=%s" % (_wad, ad))

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
    oyuncu_modeli_paketi(_surum)
    yaz_json(os.path.join(RP, "models/entity/o_sey.geo.json"), o_sey_geometrisi())
    yaz_json(os.path.join(RP, "animations/o_sey.animation.json"), SEY_ANIM)
    _sey_doku = o_sey_dokusu(SEY_SKIN_KAYNAK)
    _sey_hedef = os.path.join(RP, "textures/entity/%s.png" % SEY_DOKU)
    if _sey_doku is not None:
        os.makedirs(os.path.dirname(_sey_hedef), exist_ok=True)
        _sey_doku.save(_sey_hedef)
    elif not os.path.exists(_sey_hedef):
        print("UYARI: O Sey dokusu uretilemedi -- varlik mor-siyah cizilir")
    for liste, ad in ((en_us, SEY_AD), (tr_tr, SEY_TR)):
        liste.append("entity.%s.name=%s" % (SEY_KIMLIK, ad))
        liste.append("item.spawn_egg.entity.%s.name=%s Yumurtası" % (SEY_KIMLIK, ad))
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

    png_yaz(os.path.join(RP, "textures/blocks", DISMONT_CEVHER + ".png"),
            16, 16, dismont_cevher_dokusu())
    png_yaz(os.path.join(RP, "textures/blocks", MEZAR_BLOK + ".png"),
            16, 16, mezar_tasi_dokusu())
    # ---- IKON ARTIK REFERANSTAN (v4.86) ----
    # Zabri Studios BoraLo Mod'un kendi freedomstone.png'si.
    # Uretilen cizim yedekte duruyor: kaynak_doku/ silinse
    # bile paket calisir.
    _fs_hedef = os.path.join(RP, "textures/item", DISMONT_ESYA + ".png")
    if not kaynak_doku_kopyala("freedom_stone.png", _fs_hedef):
        png_yaz(_fs_hedef, 16, 16, dismont_esya_dokusu())
    dokular[DISMONT_ESYA] = {"textures": "textures/item/" + DISMONT_ESYA}

    yaz_json(os.path.join(RP, "textures/terrain_texture.json"), {
        "resource_pack_name": "simsek_kol",
        "texture_name": "atlas.terrain",
        "padding": 8,
        "num_mip_levels": 4,
        "texture_data": {
            DISMONT_CEVHER: {"textures": "textures/blocks/" + DISMONT_CEVHER},
            MEZAR_BLOK: {"textures": "textures/blocks/" + MEZAR_BLOK},
            TAS_BLOK: {"textures": "textures/blocks/" + TAS_BLOK},
        },
    })
    # blocks.json: blogun hangi terrain dokusunu kullandigi.
    # material_instances zaten doku adini soyluyor ama bu dosya
    # olmadan bazi surumlerde blok mor-siyah cikiyor -- ikisi
    # birlikte yazilinca iki yolda da dogru.
    yaz_json(os.path.join(RP, "blocks.json"), {
        "format_version": [1, 1, 0],
        "pa:" + DISMONT_CEVHER: {
            "textures": DISMONT_CEVHER, "sound": "stone"
        },
        "pa:" + MEZAR_BLOK: {
            "textures": MEZAR_BLOK, "sound": "stone"
        },
        "pa:" + TAS_BLOK: {
            "textures": TAS_BLOK, "sound": "stone"
        },
    })

    for liste, adlar in ((en_us, (DISMONT_ESYA_TR, DISMONT_CEVHER_TR, MEZAR_BLOK_TR)),
                         (tr_tr, (DISMONT_ESYA_TR, DISMONT_CEVHER_TR, MEZAR_BLOK_TR))):
        liste.append("item.pa:%s.name=%s" % (DISMONT_ESYA, adlar[0]))
        liste.append("item.pa:%s=%s" % (DISMONT_ESYA, adlar[0]))
        liste.append("tile.pa:%s.name=%s" % (DISMONT_CEVHER, adlar[1]))
        liste.append("tile.pa:%s.name=%s" % (MEZAR_BLOK, adlar[2]))
        # v4.86'nin uc yeni adi
        liste.append("tile.pa:%s.name=%s" % (TAS_BLOK, TAS_BLOK_TR))
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
            "name": SKIN_PAKET_AD,
            "description": "Uzak Akraba -- Simsek TNT modunun oyuncu skini",
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
        kaynak_yol = (SEY_SKIN_KAYNAK if _kaynak == "skin"
                      else os.path.join(RP, "textures/entity/%s.png" % SEY_DOKU))
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
    # v4.90: maskenin ikonu da hicbir listede degil
    beklenen.add(MASKE_ESYA)
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
    # v5.0: WoM silah ikonlari da hicbir listede degil.
    for _wk3, _wt3, _we3, _wh3, _whz3, _wd3, _wn3 in WOM:
        beklenen.add(WOM_ONEK + _wk3)
    # v5.2: Marvel ikonlari VE kostum dokulari. Ikisi de
    # hicbir listede degil; temizlik adimi listede olmayani
    # siliyor ve bu tuzaga daha once bes kez dusuldu.
    for _mp3 in MARVEL_PARCA:
        beklenen.add(MARVEL_ONEK + _mp3["kahraman"] + MARVEL_AYIRAC
                     + _mp3["anahtar"])
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
            if not (_gad.startswith("mrv_") or _gad.startswith("kahraman")
                    or _gad.startswith("pe_") or _gad.startswith("meka_")):
                continue
            if _gad in gecerliGeo:
                continue
            os.remove(os.path.join(_geoDizin, _gf))
            print("temizlendi (geometri): %s" % _gf)

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
