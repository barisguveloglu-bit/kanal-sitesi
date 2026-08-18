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

# kimlik, yetenek, gorunen ad, ana renk (r,g,b), vurgu rengi
# NOT: "yetenek" sutunu sadece belge amacli; gercek eslesme
# scripts/yetenekler/kollar.js icinde. Cok yetenekli kollarda
# buraya kolun ana yetenegi yaziliyor.
KOLLAR = [
    ("kol_toprak", "cok",                "Toprak Kol",            (24, 22, 20),    (198, 138, 90)),
    ("kol_halka",  "yildirim_halkasi", "Yildirim Halkasi Kolu", (86, 148, 232),  (214, 236, 255)),
    ("kol_simsek", "yon_simsegi",      "Simsek Kolu",           (233, 196, 66),  (255, 246, 190)),
    ("kol_alan",   "alan_simsegi",     "Alan Simsegi Kolu",     (72, 196, 190),  (198, 248, 244)),
    ("kol_top",    "toprak_topu",      "Toprak Topu Kolu",      (134, 96, 62),   (186, 152, 112)),
    ("kol_savur",  "savur",            "Savurma Kolu",          (140, 96, 200),  (214, 190, 250)),
    ("kol_ucus",   "ucus",             "Ucus Kolu",             (120, 190, 236), (226, 246, 255)),
    ("kol_can",    "can_verme",        "Can Verme Kolu",        (214, 96, 148),  (255, 200, 226)),
    ("kol_ors",    "ors",              "Ors Kolu",              (118, 118, 128), (206, 210, 222)),
    ("kol_buz",    "buz_adam",         "Buz Kol",               (126, 190, 200), (196, 232, 238)),
    ("kol_dave",   "kasirga",          "Dave Kolu",             (96, 108, 76),   (176, 200, 140)),
    ("kol_kevin",  "hapis",            "Kevin Kolu",            (108, 112, 120), (188, 194, 204)),
    ("kol_gunes",  "isin_topu",        "Gunes Kolu",            (232, 168, 40),  (255, 232, 150)),
    ("kol_boralo", "yakala",           "Boralo Kolu",           (74, 60, 96),    (168, 142, 210)),
    ("kol_golge",  "ok_yagmuru",       "Golge Kolu",            (38, 36, 48),    (120, 116, 140)),
]

# Turkce gorunen adlar (dil dosyasi icin; JSON'da ASCII tutuluyor)
TR_AD = {
    "kol_toprak": "Toprak Kol",
    "kol_halka":  "Yıldırım Halkası Kolu",
    "kol_simsek": "Şimşek Kolu",
    "kol_alan":   "Alan Şimşeği Kolu",
    "kol_top":    "Toprak Topu Kolu",
    "kol_savur":  "Savurma Kolu",
    "kol_ucus":   "Uçuş Kolu",
    "kol_can":    "Can Verme Kolu",
    "kol_ors":    "Örs Kolu",
    "kol_buz":    "Buz Kol",
    "kol_dave":   "Dave Kolu",
    "kol_kevin":  "Kevin Kolu",
    "kol_gunes":  "Güneş Kolu",
    "kol_boralo": "Boralo Kolu",
    "kol_golge":  "Gölge Kolu",
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
IKSIRLER = [
    ("nitroksin",   "Nitroksin",   (236, 240, 248), "goz_beyaz",    (245, 248, 255)),
    ("grinoksin",   "Grinoksin",   (96, 214, 110),  "goz_yesil",    (150, 255, 160)),
    ("redoksin",    "Redoksin",    (206, 44, 44),   "goz_kirmizi",  (255, 96, 96)),
    ("firenoksin",  "Firenoksin",  (240, 130, 40),  "goz_ates",     (255, 190, 90)),
    ("kan_iksiri",  "Kan Iksiri",  (140, 20, 28),   "goz_kan",      (220, 50, 50)),
    ("hiperoksin",  "Hiperoksin",  (70, 150, 240),  "goz_mavi",     (140, 210, 255)),
]

# Her gozun bir de LAZER varyanti var: lazer atarken kisa sureligine
# ona geciliyor. Referansta da boyleydi (pa:beyaz_goz -> beyaz_goz_lazer),
# tek farki bizde kilit olmamasi.

IKSIR_TR = {
    "nitroksin": "Nitroksin", "grinoksin": "Grinoksin",
    "redoksin": "Redoksin", "firenoksin": "Firenoksin",
    "kan_iksiri": "Kan İksiri", "hiperoksin": "Hiperoksin",
}
GOZ_TR = {
    "goz_beyaz": "Beyaz Göz", "goz_yesil": "Yeşil Göz",
    "goz_kirmizi": "Kırmızı Göz", "goz_ates": "Ateş Gözü",
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
                "menu_category": {"category": "equipment"},
            },
            "components": {
                "minecraft:icon": {"texture": kimlik},
                "minecraft:display_name": {"value": ad},
                "minecraft:max_stack_size": 1,
                "minecraft:wearable": {"slot": "slot.armor.head"},
                "minecraft:armor": {"protection": 0},
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
                {
                    "name": "Head",
                    "pivot": [0, 24, 0],
                    "cubes": [
                        {
                            "origin": [-4, 24, -4],
                            "size": [8, 8, 8],
                            "uv": [0, 0],
                            "inflate": 0.52,
                        }
                    ],
                }
            ],
        }
    ],
}


def goz_attachable(kimlik):
    """Referanstan alinan kritik satir: parent_setup ile
    helmet_layer_visible = 0 -- yoksa kaskin kendisi de cizilir ve
    goz kaskin altinda kalir."""
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": "pa:" + kimlik,
                "materials": {"default": "armor", "enchanted": "armor_enchanted"},
                "textures": {
                    "default": "textures/entity/" + kimlik,
                    "enchanted": "textures/misc/enchanted_item_glint",
                },
                "geometry": {"default": "geometry.simsek_goz"},
                "scripts": {"parent_setup": "variable.helmet_layer_visible = 0.0;"},
                "render_controllers": ["controller.render.armor"],
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
                "animations": {
                    "tutus_birinci": "animation.simsek_kol.birinci_sahis",
                    "tutus_ucuncu": "animation.simsek_kol.ucuncu_sahis",
                },
                "scripts": {
                    "animate": [
                        {"tutus_birinci": "c.is_first_person"},
                        {"tutus_ucuncu": "!c.is_first_person"},
                    ]
                },
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
# v4.29'da kullanici istegiyle guclendirildi: 5 -> 7 hasar,
# 24 -> 25 can. Karsilastirma: vanilla kurt 4 hasar / 8 can,
# demir golem 21 hasar / 100 can. Bot ikisinin arasinda ve
# yirmi tane olabildigi icin bilerek golemin cok altinda.
BOT_HASAR = 7
BOT_CAN = 25


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

# rightitem kemigi bu modelde yok; animasyon etkisiz kaliyor. Referans
# mod da aynen boyle gonderiyor ve calisiyor, o yuzden birebir korundu.
TUTUS_ANIM = {
    "format_version": "1.10.0",
    "animations": {
        "animation.simsek_kol.ucuncu_sahis": {
            "loop": True,
            "bones": {"rightitem": {"position": [0, 22, 5], "rotation": [90, 0, 90]}},
        },
        "animation.simsek_kol.birinci_sahis": {
            "loop": True,
            "bones": {"rightitem": {"position": [-5, 35, -5.5], "rotation": [0, 0, 180]}},
        },
    },
}


# ------------------------------------------------------------------ png
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
# NOT (kaplama neden tam oturuyor): attachable kutusu inflate 0.52
# ile buyutulmus, bu da dokuyu kutu MERKEZINDEN disari doguru
# geriyor. Kayma merkeze olan uzakligla artiyor: y=14 icin 0.33
# satir (gorunur), y=12 icin 0.07 satir (gorunmez). Yani dogru
# satira gecince esneme sorunu da kendiliginden kayboluyor.
#
# SKIN DEGISTIRIRSEN: gozun hangi satirda oldugunu say (kafanin
# ust kenari y=8) ve asagidaki tek sayiyi degistir. Baska hicbir
# yere dokunma.
GOZ_SATIR   = 12
GOZ_SUTUNLAR = ((9, 10), (13, 14))


def _goz_ciz(renk, alfa=255):
    """Goz kaplamasi: sadece goz satiri, her gozde iki piksel.

    Dis hat YOK, hale YOK -- ikisi de yuzu bant gibi kaplayip
    gozluk gorunumu yaratiyordu.
    """
    p = {}
    for sol, sag in GOZ_SUTUNLAR:
        for x in (sol, sag):
            p[(x, GOZ_SATIR)] = renk + (alfa,)
    return p


def goz_dokusu(renk):
    """64x64 kafa dokusu. Yalnizca goz satiri boyanir, gerisi
    TAMAMEN SAYDAM kalir -- skin'in yuzu ve goz bebegi gorunur."""
    return _goz_ciz(renk)


def lazer_goz_dokusu(renk):
    """Lazer atarken kullanilan parlak varyant.

    Ayni iki piksellik goz, ama beyaza cekilmis; ustelik bir
    satir ASAGI da tasiyor, yani isik yanaga vurmus gibi duruyor.
    Yuzun geri kalanina yine dokunmuyor -- bant olusmuyor.

    Neden asagi, yukari degil: goz satirinin USTU cogu skin'de
    sac/kas oluyor (bizimkinde y=11 sac), parlama orada kaybolur.
    ALTI ise duz ten (y=13), isik orada gorunur.
    """
    parlak = tuple(min(255, int(c + (255 - c) * 0.65)) for c in renk)
    p = _goz_ciz(parlak)
    # Bir satir asagi: yanaga vuran isik
    for sol, sag in GOZ_SUTUNLAR:
        for x in (sol, sag):
            p[(x, GOZ_SATIR + 1)] = parlak + (255,)
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
        png_yaz(os.path.join(RP, "textures/item", "iksir_" + kimlik + ".png"),
                16, 16, iksir_ikonu(sivi))
        dokular["iksir_" + kimlik] = {"textures": "textures/item/iksir_" + kimlik}

        # Normal goz + lazer varyanti
        for ad2, doku in ((goz, goz_dokusu(gozRenk)),
                          (goz + "_lazer", lazer_goz_dokusu(gozRenk))):
            yaz_json(os.path.join(BP, "items", ad2 + ".json"),
                     goz_esyasi(ad2, GOZ_TR[ad2]))
            yaz_json(os.path.join(RP, "attachables", ad2 + ".json"), goz_attachable(ad2))
            png_yaz(os.path.join(RP, "textures/entity", ad2 + ".png"), 64, 64, doku)
            png_yaz(os.path.join(RP, "textures/item", ad2 + ".png"), 16, 16,
                    esya_ikonu(gozRenk, (255, 255, 255)))
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
    yaz_json(os.path.join(RP, "models/entity/simsek_bot.geo.json"), BOT_GEOMETRI)
    yaz_json(os.path.join(RP, "animations/simsek_bot.animation.json"), BOT_ANIM)
    png_yaz(os.path.join(RP, "textures/entity/bot.png"), 64, 64, bot_dokusu(0))
    for liste, ad in ((en_us, BOT_AD), (tr_tr, BOT_TR)):
        liste.append("entity.%s.name=%s" % (BOT_KIMLIK, ad))
        liste.append("item.spawn_egg.entity.%s.name=%s Yumurtasi" % (BOT_KIMLIK, ad))

    yaz_json(os.path.join(RP, "models/entity/simsek_goz.geo.json"), GOZ_GEOMETRI)
    yaz_json(os.path.join(RP, "models/entity/simsek_kol.geo.json"), GEOMETRI)
    yaz_json(os.path.join(RP, "animations/simsek_kol_tutus.animation.json"), TUTUS_ANIM)
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
    for satir in KOLLAR:
        beklenen.add(satir[0])
    for kimlik, _ad, _sivi, goz, _gozRenk in IKSIRLER:
        beklenen.add("iksir_" + kimlik)
        beklenen.add(goz)
        beklenen.add(goz + "_lazer")

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
