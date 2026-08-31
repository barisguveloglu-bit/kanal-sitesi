#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CodeMan (Astra Studios), BoraLo (Dragon Studios) ve Falen
(Trb1545) BEDROCK eklentilerinden model, doku, animasyon ve ses
cikarir.

---- NEDEN "kns_" ONEKI FALEN PARCALARINDA DA VAR ----
Onek basta "Konsey" demekti ama artik uc ayri modun GIYILEBILIR
PARCALARININ ortak ad alani: kostumler, deriler, kolluklar,
maskeler ve zirhlar hepsi orada. Ayri bir onek acmak temizlik
adiminda ikinci bir izin listesi, temizlik.mjs'te ikinci bir
sayac ve kol_uret.py'de ikinci bir tablo demekti -- ucu de ayni
seyi yapan iki kopya.

Kullanici: "yeni boralo notlari buldum, bunlardan alabildigimizi
alalim, esya dahil her sey."

---- NEDEN BU IKISI KOLAY ----
Onceki BoraLo bir JAVA moduydu (ZabriStudios 2.21, bkz.
REFERANS_BORALO.md) ve kodu Bedrock'ta calismiyordu; modelleri
bytecode'dan cozmek gerekmisti. BUNLAR ZATEN BEDROCK EKLENTISI:
`.geo.json` 1.12.0 bicimi, dokular PNG, animasyonlar 1.8.0.
Donusturme YOK, sadece tasima ve yeniden adlandirma.

---- NE DEGISIYOR ----
1. GEOMETRI KIMLIGI. Kaynakta `geometry.klezy_okazor_kullanma`.
   Bizde `geometry.kns_okazor` oluyor -- `klezy` ad alani bizim
   degil ve iki paket ayni anda kuruluysa carpisirdi.
2. DOKU YOLU. Kaynakta `textures/entity/pamobile/...` (o klasor
   adi baska bir eklentiden kalma bir artik). Bizde
   `textures/entity/kns_<ad>.png`.
3. BOS KOK KEMIK. Blockbench'in `bb_main`i atiliyor.

---- ALINMAYAN SEY: DIL DOSYASI ----
Iki paketin `en_US.lang` dosyasinda BASKA bir eklentiden kalma
yuzlerce `pa:` satiri var (PA-Fridge, PA-Shark, PA-Pizza...).
`pa:` BIZIM ad alanimiz; o satirlari almak kendi esya
adlarimizi ezerdi. Adlar bu betikteki tablodan geliyor.
"""
import json
import os
import shutil
import sys

BURASI = os.path.dirname(os.path.abspath(__file__))
GEO_HEDEF = os.path.join(BURASI, "kaynak_geo", "konsey")
DOKU_HEDEF = os.path.join(BURASI, "kaynak_doku", "konsey")
IKON_HEDEF = os.path.join(BURASI, "kaynak_doku", "konsey_ikon")
SES_HEDEF = os.path.join(BURASI, "kaynak_ses", "konsey")
ANIM_HEDEF = os.path.join(BURASI, "kaynak_anim", "konsey")

CM = "cm"        # CodeMan  (klezy)
BL = "bl"        # BoraLo   (dragon)
FL = "fl"        # Falen    (sp)

# Her paket: (acilmis klasoru bulan joker, dosya adi oneki)
# "{tur}" yerine "resource" ya da "behavior" geliyor.
# Joker sart: klasor adlarinda bosluk ve renk kodu (§) var.
PAKETLER = {
    CM: ("cm/*mod_{tur}_pack",                        "klezy_"),
    BL: ("bl/ac_BoraLoModV1Beta/*BETA_{tur}_pack",    "dragon_"),
    FL: ("fl/*Falen*_{tur}_pack",                     "sp_"),
}

# ---- ALINAN PARCALAR ----
# (bizim kisa ad, paket, kaynak dosya adi)
# Model, varlik dokusu ve esya ikonu AYNI adi kullaniyor;
# ayrildiklari yerler asagida ayrica yaziyor.
PARCALAR = [
    # -- Konsey kostumleri: bizim LORE.md'deki karakterler --
    ("okazor",    CM, "okazor_kullanma"),
    ("miskel",    CM, "miskel_kullanma"),
    ("kajaros",   CM, "kajaros_kullanma"),
    ("harkos",    CM, "harkos_kullanma"),
    ("raxxan",    CM, "raxxan_kullanma"),
    ("codeman",   CM, "codeman_kullanma"),
    # -- Deriler --
    ("deri_toprak", CM, "dirt_skin"),
    ("deri_dusmus", CM, "fallen_skin"),
    ("deri_tas",    CM, "stone_skin"),
    ("deri_zehir",  CM, "toxic_skin"),
    # -- Maskeler --
    ("maske_kemik",     CM, "bone_mask"),
    ("maske_deadmau5",  CM, "deadmau5"),
    ("maske_redmau5",   CM, "redmau5"),
    ("maske_kanli",     CM, "bloody_deadmau5"),
    # -- Kollar --
    ("kolluk_toprak_ince",   CM, "dirt_arms_ince"),
    ("kolluk_toprak_kalin",  CM, "dirt_arms_kalin"),
    ("kolluk_guclu_ince",    CM, "reinforced_dirt_arms_ince"),
    ("kolluk_guclu_kalin",   CM, "reinforced_dirt_arms_kalin"),
    ("kolluk_dusmus_ince",   CM, "fallen_arms_ince"),
    ("kolluk_dusmus_kalin",  CM, "fallen_arms_kalin"),
    ("kolluk_bobby",         CM, "bobby1545s_arms"),
    ("kolluk_bobby_buz",     CM, "bobby1545s_ice_dirt_arms"),
    ("kolluk_bobby_kanli",   CM, "bobby1545s_red_bloody_arms"),
    ("kolluk_bobby_kum",     CM, "bobby1545s_yellow_sand_arms"),
    ("kolluk_boralo_anna",   CM, "boralos_anna_dirt_arms"),
    ("kolluk_boralo_kanli",  CM, "boralos_red_bloody_arms"),
    ("kolluk_boralo_kum",    CM, "boralos_reinforced_yellow_sand_arms"),
    ("kolluk_chris_kanli",   CM, "chris1545s_red_bloody_arms"),
    # -- Asalar --
    ("asa_kemikcagiran", CM, "bonescaller_staff"),
    ("asa_ayisigi",      CM, "moonlight_staff"),
    ("asa_vurucu",       CM, "striker_staff"),
    ("asa_golge",        CM, "the_shadow_staff"),
    ("asa_yeralti",      CM, "underworld_staff"),
    ("asa_harkos",       CM, "staff_of_harkos"),
    ("asa_sihirli_ok",   CM, "staff_of_magic_arrows"),
    # -- Earl aletleri --
    ("earl_kilic",  CM, "earl_sword"),
    ("earl_balta",  CM, "earl_axe"),
    ("earl_kazma",  CM, "earl_pickaxe"),
    ("earl_kurek",  CM, "earl_shovel"),
    ("earl_capa",   CM, "earl_hoe"),
    # -- Zirh takimlari --
    ("olubuyucu_baslik", CM, "necromancer_battlemage_helmet"),
    ("olubuyucu_govde",  CM, "necromancer_battlemage_chestplate"),
    ("olubuyucu_bacak",  CM, "necromancer_battlemage_leggings"),
    ("olubuyucu_bot",    CM, "necromancer_battlemage_boots"),
    ("guczirhi_baslik",  CM, "power_armour_helmet"),
    ("guczirhi_govde",   CM, "power_armour_chestplate"),
    ("guczirhi_bacak",   CM, "power_armour_leggings"),
    ("guczirhi_bot",     CM, "power_armour_boots"),
    # -- Silahlar --
    ("silah_biyo",  CM, "bio_gun"),
    ("silah_bobby", CM, "bobby_gun"),
    # -- BoraLo: dort asamali Dusmus donusumu --
    ("dusmus_1", BL, "fallen_1"),
    ("dusmus_2", BL, "fallen_2"),
    ("dusmus_3", BL, "fallen_3"),
    ("dusmus_4", BL, "fallen_4"),
]

# Modelin kimligindeki sonek bazen dosya adiyla tutmuyor
# (`klezy_el_hareketi_default` gibi). Kimlik dosyadan OKUNUYOR,
# tahmin edilmiyor.

# Dusmus Blogu'nun dokusu: esya degil BLOK dokusu, o yuzden
# PARCALAR listesinde degil (orada model+ikon da araniyor).
# -- Falen (Trb1545): Kurban zirhi --
# Dort parca, hepsi protection 7 ve knockback_resistance 0.75.
# UC PARCA AYNI DOKUYU PAYLASIYOR (zirh/pantolon/bot; olculdu,
# md5 ayni); yalniz kaskin kendi dokusu var. Kaynakta dort ayri
# dosya olarak duruyor, bizde de dort ayri kopya kaliyor --
# tek dosyaya indirmek uv'leri ayni oldugu icin mumkun ama
# ilerde biri degistirilirse digerleri sessizce degisirdi.
PARCALAR += [
    ("kurban_kask",     FL, "kurban_kask"),
    ("kurban_zirh",     FL, "kurban_zirh"),
    ("kurban_pantolon", FL, "kurban_patalon"),   # kaynakta "patalon"
    ("kurban_bot",      FL, "kurbanlar_botu"),
]

BLOK_DOKULARI = [
    ("dusmus_blok", BL, "textures/blocks/dragon_fallen_block.png"),
]

SESLER = [
    ("silah_biyo",  CM, "sounds/klezy_bio_gun_shot.ogg"),
    ("silah_bobby", CM, "sounds/klezy_bobby_gun_shot.ogg"),
    ("asa_ayisigi", CM, "sounds/custom_sound/moonlight_staff_song.ogg"),
]


def kok(paket, tur):
    """Acilmis paketin ilgili klasoru. Klasor adlarinda bosluk
    ve renk kodu (§) var, o yuzden joker ile bulunuyor."""
    import glob
    kalip, _ = PAKETLER[paket]
    bulunan = [d for d in glob.glob(
        os.path.join(TABAN, kalip.format(tur=tur))) if os.path.isdir(d)]
    return bulunan[0] if bulunan else None


def onek(paket):
    return PAKETLER[paket][1]


def geo_tasi(paket, kaynak, hedefAd):
    """Modeli kopyalar, kimligini `geometry.kns_<ad>` yapar ve
    Blockbench'in bos kok kemigini atar."""
    rp = kok(paket, "resource")
    if rp is None:
        return "paket yok"
    yol = os.path.join(rp, "models", "entity", onek(paket) + kaynak + ".json")
    if not os.path.exists(yol):
        return "model yok: " + yol
    with open(yol, encoding="utf-8") as f:
        d = json.load(f)
    if "minecraft:geometry" in d:
        g = d["minecraft:geometry"][0]
    else:
        # ---- ESKI (1.10.0) BICIM ----
        # Falen'in modelleri {"geometry.X": {...}} seklinde ve
        # olculer `texturewidth`/`textureheight` diye yazili.
        # Kabuk cevriliyor, KEMIKLERE DOKUNULMUYOR: zirh
        # kemikleri (head/body/rightArm...) oyuncu iskeletiyle
        # ADIYLA eslesiyor, degistirilirse parca vucuda hic
        # oturmaz.
        govde = None
        for anahtar, deger in d.items():
            if anahtar.startswith("geometry.") and isinstance(deger, dict):
                govde = deger
                break
        if govde is None:
            return "geometri govdesi yok"
        g = {
            "description": {
                "identifier": "geometry.gecici",
                "texture_width": govde.get("texturewidth", 64),
                "texture_height": govde.get("textureheight", 64),
            },
            "bones": govde.get("bones", []),
        }
        for a, b in (("visible_bounds_width", "visible_bounds_width"),
                     ("visible_bounds_height", "visible_bounds_height"),
                     ("visible_bounds_offset", "visible_bounds_offset")):
            if a in govde:
                g["description"][b] = govde[a]
        d = {"format_version": "1.12.0"}
    g["description"]["identifier"] = "geometry.kns_" + hedefAd
    # Doku olculeri bazi dosyalarda ondalik (64.0) yazili.
    for a in ("texture_width", "texture_height"):
        if a in g["description"]:
            g["description"][a] = int(g["description"][a])
    # Bos kok kemik: cocugu ve kupu yoksa atiliyor.
    adlar = {b["name"] for b in g["bones"]}
    ebeveyn = {b.get("parent") for b in g["bones"]}
    g["bones"] = [b for b in g["bones"]
                  if not (b["name"] == "bb_main" and not b.get("cubes")
                          and b["name"] not in ebeveyn)]
    with open(os.path.join(GEO_HEDEF, "kns_" + hedefAd + ".geo.json"),
              "w", encoding="utf-8") as f:
        json.dump({"format_version": d.get("format_version", "1.12.0"),
                   "minecraft:geometry": [g]}, f, indent=1)
    return None


def doku_tasi(paket, kaynak, hedefAd):
    rp = kok(paket, "resource")
    if rp is None:
        return "paket yok"
    p = onek(paket)
    denenen = []
    for alt in (os.path.join("textures", "entity", "pamobile", p + kaynak + ".png"),
                os.path.join("textures", "entity", p + kaynak + ".png"),
                os.path.join("textures", "items", "pamobile", p + kaynak + ".png"),
                os.path.join("textures", "items", p + kaynak + ".png")):
        y = os.path.join(rp, alt)
        denenen.append(y)
        if os.path.exists(y):
            shutil.copyfile(y, os.path.join(DOKU_HEDEF,
                                            "kns_" + hedefAd + ".png"))
            return None
    return "doku yok: " + denenen[0]


def ikon_tasi(paket, kaynak, hedefAd):
    """Esya ikonu. Bulunamazsa varlik dokusu ikon olarak
    kullanilamaz (olculeri farkli) -- eksik diye raporlaniyor."""
    rp = kok(paket, "resource")
    if rp is None:
        return "paket yok"
    p = onek(paket)
    for alt in (os.path.join("textures", "items", "pamobile", p + kaynak + ".png"),
                os.path.join("textures", "items", p + kaynak + ".png")):
        y = os.path.join(rp, alt)
        if os.path.exists(y):
            shutil.copyfile(y, os.path.join(IKON_HEDEF,
                                            "kns_" + hedefAd + ".png"))
            return None
    return "ikon yok"


def cikar(taban):
    global TABAN
    TABAN = taban
    for d in (GEO_HEDEF, DOKU_HEDEF, IKON_HEDEF, SES_HEDEF):
        os.makedirs(d, exist_ok=True)

    sayac = {"geo": 0, "doku": 0, "ikon": 0, "ses": 0}
    eksik = []
    for ad, paket, kaynak in PARCALAR:
        for is_ad, islev in (("geo", geo_tasi), ("doku", doku_tasi),
                             ("ikon", ikon_tasi)):
            h = islev(paket, kaynak, ad)
            if h:
                eksik.append("%s (%s): %s" % (ad, is_ad, h))
            else:
                sayac[is_ad] += 1
    for ad, paket, yol in BLOK_DOKULARI:
        rp = kok(paket, "resource")
        y = os.path.join(rp, yol) if rp else ""
        if os.path.exists(y):
            shutil.copyfile(y, os.path.join(DOKU_HEDEF, "kns_" + ad + ".png"))
            sayac["doku"] += 1
        else:
            eksik.append("%s (blok dokusu): %s" % (ad, yol))
    for ad, paket, yol in SESLER:
        rp = kok(paket, "resource")
        y = os.path.join(rp, yol) if rp else ""
        if os.path.exists(y):
            shutil.copyfile(y, os.path.join(SES_HEDEF, "kns_" + ad + ".ogg"))
            sayac["ses"] += 1
        else:
            eksik.append("%s (ses): %s" % (ad, yol))

    print("geo: %(geo)d   doku: %(doku)d   ikon: %(ikon)d   ses: %(ses)d"
          % sayac)
    if eksik:
        print("EKSIK (%d):" % len(eksik))
        for e in eksik:
            print("   " + e)
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("kullanim: konsey_al.py <acilmis-paketlerin-ust-klasoru>")
        sys.exit(2)
    sys.exit(cikar(sys.argv[1]))
