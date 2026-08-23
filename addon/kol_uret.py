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
BOT_HASAR = 14   # =  7 kalp / vurus
BOT_CAN = 50     # = 25 kalp

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
ILKEL = [
    ("kajaros", "Ilkel Muhafiz Kajaros",      3500, 46,
     dict(ittirilmez=True, olcek=1.15, hiz=0.30, rutbe=3)),
    ("miskel",  "Ilkel Sihirbaz Miskel",      2600, 28,
     dict(menzilli=True, olcek=1.0, hiz=0.30, rutbe=2)),
    ("harkos",  "Ilkel Suikastci El-Harkos",  2600, 26,
     dict(sicrar=True, olcek=0.95, hiz=0.42, rutbe=5)),
    # v4.55: 1,5 kat guclendirildi (2000/30 -> 3000/45).
    # Sebep kullanicinin tespiti: en alt rutbedeki El-Harkos
    # 2600 can tasirken Golge Ajani 2000'de kaliyordu.
    ("raxxan",  "Ilkel Zihin Bukucu Raxxan",  3000, 45,
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


def ilkel_gruplari():
    """Bes uyenin bilesen gruplari. Her biri cani, hasari ve
    dovus stilini degistiriyor; geri kalan her sey (takip, canta,
    is yapma) normal bottan geliyor."""
    gruplar = {}
    for anahtar, _ad, can, hasar, sec in ILKEL:
        g = {
            "minecraft:health": {"value": can, "max": can},
            "minecraft:attack": {"damage": hasar},
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
        # ---- BALTA TASIYABILSIN (v4.48) ----
        # minecraft:equippable olmadan script tarafinda
        # EquippableComponent bulunmuyor, yani balta ele
        # konulamiyor. Sadece ana el tanimli: bes uyenin zirh
        # giymesi istenmiyor, kendi skinleri var.
        g["minecraft:equippable"] = {
            "slots": [{
                "slot": "slot.weapon.mainhand",
                "accepted_items": ["pa:" + ilkel_silahi(anahtar)[0]],
            }]
        }
        gruplar["pa:ilkel_" + anahtar] = g
    return gruplar


def ilkel_silah_esyasi(kimlik, ad):
    """Bir uyenin elindeki silah.

    Envanterde de gorunuyor (menu_category equipment) cunku
    yumurtayla elle deneme yapabilmek isteniyor -- ayni sebeple
    varliklar da is_spawnable.                                  """
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
                "minecraft:hand_equipped": True,
                "minecraft:allow_off_hand": False,
                # DIKKAT: minecraft:damage YOK. Bkz. ILKEL_SILAHLAR notu.
            },
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
DISMONT_ESYA = "dismont"
DISMONT_ESYA_TR = "Dismont Taşı"
DISMONT_CEVHER = "dismont_cevheri"
DISMONT_CEVHER_TR = "Dismont Cevheri"
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
                "minecraft:display_name": {"value": "Dismont Tasi"},
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
            "description": {"identifier": "pa:dismont_ore_feature"},
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
                "identifier": "pa:dismont_ore_rule",
                "places_feature": "pa:dismont_ore_feature",
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
    yaz_json(os.path.join(BP, "features/dismont_ore_feature.json"),
             dismont_ozelligi())
    yaz_json(os.path.join(BP, "feature_rules/dismont_ore_rule.json"),
             dismont_kurali())

    png_yaz(os.path.join(RP, "textures/blocks", DISMONT_CEVHER + ".png"),
            16, 16, dismont_cevher_dokusu())
    png_yaz(os.path.join(RP, "textures/blocks", MEZAR_BLOK + ".png"),
            16, 16, mezar_tasi_dokusu())
    png_yaz(os.path.join(RP, "textures/item", DISMONT_ESYA + ".png"),
            16, 16, dismont_esya_dokusu())
    dokular[DISMONT_ESYA] = {"textures": "textures/item/" + DISMONT_ESYA}

    yaz_json(os.path.join(RP, "textures/terrain_texture.json"), {
        "resource_pack_name": "simsek_kol",
        "texture_name": "atlas.terrain",
        "padding": 8,
        "num_mip_levels": 4,
        "texture_data": {
            DISMONT_CEVHER: {"textures": "textures/blocks/" + DISMONT_CEVHER},
            MEZAR_BLOK: {"textures": "textures/blocks/" + MEZAR_BLOK},
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
    })

    for liste, adlar in ((en_us, (DISMONT_ESYA_TR, DISMONT_CEVHER_TR, MEZAR_BLOK_TR)),
                         (tr_tr, (DISMONT_ESYA_TR, DISMONT_CEVHER_TR, MEZAR_BLOK_TR))):
        liste.append("item.pa:%s.name=%s" % (DISMONT_ESYA, adlar[0]))
        liste.append("item.pa:%s=%s" % (DISMONT_ESYA, adlar[0]))
        liste.append("tile.pa:%s.name=%s" % (DISMONT_CEVHER, adlar[1]))
        liste.append("tile.pa:%s.name=%s" % (MEZAR_BLOK, adlar[2]))

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
    # Ilkel Besli dokulari da listelerde degil (v4.35)
    for _anahtar, _ad, _can, _hasar, _sec in ILKEL:
        beklenen.add("ilkel_" + _anahtar)
    # Silahlar da hicbir listede degil (v4.48). Bu satir
    # unutuldugunda temizlik adimi baltayi HER uretimde
    # siliyordu: esya yaziliyor, atlas kaydi kaliyor, dosya
    # gidiyor -- yani oyunda "bilinmeyen esya". Bir kez yasandi,
    # testi 5e bolumunde. Dongu: yeni silah eklenince kendi
    # kendine giriyor, elle eklemek gerekmiyor.
    for _skimlik, _sad, _skaynak in ILKEL_SILAHLAR.values():
        beklenen.add(_skimlik)
    # Dismont tasi da hicbir listede degil (v4.50)
    beklenen.add(DISMONT_ESYA)
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
