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
# Referanstan gelen uc yeni iksir: redoksin, firenoksin, orman_atesi.
IKSIRLER = [
    ("nitroksin",   "Nitroksin",   (236, 240, 248), "goz_beyaz",    (245, 248, 255)),
    ("grinoksin",   "Grinoksin",   (96, 214, 110),  "goz_yesil",    (150, 255, 160)),
    ("redoksin",    "Redoksin",    (206, 44, 44),   "goz_kirmizi",  (255, 96, 96)),
    ("firenoksin",  "Firenoksin",  (240, 130, 40),  "goz_ates",     (255, 190, 90)),
    ("orman_atesi", "Orman Atesi", (110, 200, 80),  "goz_orman",    (180, 250, 140)),
    ("kan_iksiri",  "Kan Iksiri",  (140, 20, 28),   "goz_kan",      (220, 50, 50)),
    ("hiperoksin",  "Hiperoksin",  (70, 150, 240),  "goz_mavi",     (140, 210, 255)),
]

# Her gozun bir de LAZER varyanti var: lazer atarken kisa sureligine
# ona geciliyor. Referansta da boyleydi (pa:beyaz_goz -> beyaz_goz_lazer),
# tek farki bizde kilit olmamasi.

IKSIR_TR = {
    "nitroksin": "Nitroksin", "grinoksin": "Grinoksin",
    "redoksin": "Redoksin", "firenoksin": "Firenoksin",
    "orman_atesi": "Orman Ateşi", "kan_iksiri": "Kan İksiri",
    "hiperoksin": "Hiperoksin",
}
GOZ_TR = {
    "goz_beyaz": "Beyaz Göz", "goz_yesil": "Yeşil Göz",
    "goz_kirmizi": "Kırmızı Göz", "goz_ates": "Ateş Gözü",
    "goz_orman": "Orman Gözü", "goz_kan": "Kanlı Göz", "goz_mavi": "Mavi Göz",
    "goz_beyaz_lazer": "Beyaz Göz (Lazer)", "goz_yesil_lazer": "Yeşil Göz (Lazer)",
    "goz_kirmizi_lazer": "Kırmızı Göz (Lazer)", "goz_ates_lazer": "Ateş Gözü (Lazer)",
    "goz_orman_lazer": "Orman Gözü (Lazer)", "goz_kan_lazer": "Kanlı Göz (Lazer)",
    "goz_mavi_lazer": "Mavi Göz (Lazer)",
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


def lazer_goz_dokusu(renk):
    """Lazer atarken kullanilan parlak varyant: gozler daha genis,
    rengi beyaza dogru cekilmis, disinda hale var. Normal gozden
    ilk bakista ayrilmali."""
    parlak = tuple(min(255, int(c + (255 - c) * 0.55)) for c in renk)
    p = {}
    for x in range(8, 16):
        for y in range(11, 15):
            # Burun hizasi bos kalsin ki iki ayri goz gorunsun
            if x == 12:
                continue
            p[(x, y)] = parlak + (255,)
    # Hale
    for x, y in list(p.keys()):
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                k = (x + dx, y + dy)
                if k not in p and 8 <= k[0] < 16 and 8 <= k[1] < 16:
                    p[k] = renk + (170,)
    return p


def goz_dokusu(renk):
    """64x64 kafa dokusu. Yuzun oldugu yere (8..15, 8..15) iki
    parlak goz cizilir, gerisi TAMAMEN SAYDAM kalir -- boylece
    skin'in yuzu gorunur, sadece gozler parliyor."""
    p = {}
    # Sol goz ve sag goz: yuz bolgesinde iki yatay serit
    for x in range(9, 12):
        for y in range(12, 14):
            p[(x, y)] = renk + (255,)
    for x in range(13, 16):
        for y in range(12, 14):
            p[(x, y)] = renk + (255,)
    # Hafif dis hat, gozler zeminden ayrilsin
    for x, y in list(p.keys()):
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            k = (x + dx, y + dy)
            if k not in p and 8 <= k[0] < 16 and 8 <= k[1] < 16:
                p[k] = golge(renk, 0.35) + (200,)
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

    print("uretildi: %d kol, %d iksir, %d goz (lazer varyantiyla) -> %d esya"
          % (len(KOLLAR), len(IKSIRLER), len(IKSIRLER) * 2,
             len(KOLLAR) + len(IKSIRLER) * 3))


if __name__ == "__main__":
    main()
