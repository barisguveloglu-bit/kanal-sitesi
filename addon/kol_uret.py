#!/usr/bin/env python3
"""Kol esyalarini, attachable'larini, dil dosyalarini ve yer tutucu
dokularini uretir. Tek kaynak burasi; sekiz dosyayi elle senkron
tutmaya calismak hataya davetiye.

Referans: add-ons.zip icindeki "En Iyi BoraLo Kol Modu V2".
Oradan alinan TEKNIK kararlar:
  - kok kemik adi "RightArm" (oyuncu iskeletindeki kemikle ayni ad;
    model boylece oyuncunun koluna oturuyor)
  - attachable format_version 1.10.0, entity_alphatest materyali
  - render_offsets olcekleri (~0.0044 / ~0.00167)
Model, doku ve yetenek mantigi bize ait.
"""

import json, os, struct, zlib

BP = "/home/user/kanal-sitesi/addon/Simsek_TNT_ToprakTopu"
RP = "/home/user/kanal-sitesi/addon/Simsek_Kol_Kaynak"

# kimlik, yetenek, gorunen ad, ana renk (r,g,b), vurgu rengi
KOLLAR = [
    ("kol_halka",  "yildirim_halkasi", "Yildirim Halkasi Kolu", (86, 148, 232),  (214, 236, 255)),
    ("kol_simsek", "yon_simsegi",      "Simsek Kolu",           (233, 196, 66),  (255, 246, 190)),
    ("kol_alan",   "alan_simsegi",     "Alan Simsegi Kolu",     (72, 196, 190),  (198, 248, 244)),
    ("kol_tnt",    "guclu_tnt",        "Guclu TNT Kolu",        (198, 62, 54),   (255, 176, 120)),
    ("kol_top",    "toprak_topu",      "Toprak Topu Kolu",      (134, 96, 62),   (186, 152, 112)),
    ("kol_savur",  "savur",            "Savurma Kolu",          (140, 96, 200),  (214, 190, 250)),
    ("kol_ucus",   "ucus",             "Ucus Kolu",             (120, 190, 236), (226, 246, 255)),
    ("kol_meteor", "meteor",           "Meteor Kolu",           (226, 122, 48),  (255, 206, 140)),
]

# Turkce gorunen adlar (dil dosyasi icin; JSON'da ASCII tutuluyor)
TR_AD = {
    "kol_halka":  "Yıldırım Halkası Kolu",
    "kol_simsek": "Şimşek Kolu",
    "kol_alan":   "Alan Şimşeği Kolu",
    "kol_tnt":    "Güçlü TNT Kolu",
    "kol_top":    "Toprak Topu Kolu",
    "kol_savur":  "Savurma Kolu",
    "kol_ucus":   "Uçuş Kolu",
    "kol_meteor": "Meteor Kolu",
}

# BEKLEME = 60 tick = 3 sn. Esya beklemesi bununla ayni tutuluyor ki
# oyuncu ekranda donen bekleme gostergesini gorsun.
BEKLEME_SN = 3.0

# Referanstaki dirt_arm degerleri; bizim kup boyutumuz da ayni (4x12x4).
OLCEK_UCUNCU = 0.00440771349862259
OLCEK_BIRINCI = 0.0016749311294755793


def yaz_json(yol, veri):
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, indent=2, ensure_ascii=False)
        f.write("\n")


# ---------------------------------------------------------------- esya
def esya(kimlik, ad):
    tam = "pa:" + kimlik
    return {
        "format_version": "1.16.100",
        "minecraft:item": {
            "description": {"identifier": tam, "category": "equipment"},
            "components": {
                "minecraft:icon": {"texture": kimlik},
                "minecraft:display_name": {"value": ad},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                "minecraft:allow_off_hand": False,
                "minecraft:foil": False,
                "minecraft:damage": 0,
                "minecraft:can_destroy_in_creative": False,
                "minecraft:creative_category": {"parent": "itemGroup.name.sword"},
                "minecraft:cooldown": {
                    "category": kimlik + "_bekleme",
                    "duration": BEKLEME_SN,
                },
                # itemUse olayinin ozel esyalarda tetiklenmedigi surumler
                # var. on_use -> scriptevent koprusu ikinci bir yol acar;
                # ikisi de tetiklenirse main.js'teki bekleme kontrolu
                # ikincisini zaten yutuyor.
                "minecraft:on_use": {"on_use": {"event": "kol_kullanildi"}},
                "minecraft:render_offsets": {
                    "main_hand": {
                        "third_person": {"scale": [OLCEK_UCUNCU] * 3},
                        "first_person": {"scale": [OLCEK_BIRINCI] * 3},
                    },
                    "off_hand": {
                        "third_person": {"scale": [OLCEK_UCUNCU] * 3},
                        "first_person": {"scale": [OLCEK_BIRINCI] * 3},
                    },
                },
            },
            "events": {
                "kol_kullanildi": {
                    "run_command": {
                        "command": ["scriptevent simsek:kol " + kimlik],
                        "target": "self",
                    }
                }
            },
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

        png_yaz(os.path.join(RP, "textures/entity", kimlik + ".png"), 64, 64,
                varlik_dokusu(ana, vurgu))
        png_yaz(os.path.join(RP, "textures/item", kimlik + ".png"), 16, 16,
                esya_ikonu(ana, vurgu))

        dokular[kimlik] = {"textures": "textures/item/" + kimlik}

        tam = "pa:" + kimlik
        en_us.append("item.%s.name=%s" % (tam, ad))
        en_us.append("item.%s=%s" % (tam, ad))
        tr_tr.append("item.%s.name=%s" % (tam, TR_AD[kimlik]))
        tr_tr.append("item.%s=%s" % (tam, TR_AD[kimlik]))

    yaz_json(os.path.join(RP, "models/entity/simsek_kol.geo.json"), GEOMETRI)
    yaz_json(os.path.join(RP, "animations/simsek_kol_tutus.animation.json"), TUTUS_ANIM)
    yaz_json(os.path.join(RP, "textures/item_texture.json"), {
        "resource_pack_name": "simsek_kol",
        "texture_name": "atlas.items",
        "texture_data": dokular,
    })

    os.makedirs(os.path.join(RP, "texts"), exist_ok=True)
    yaz_json(os.path.join(RP, "texts/languages.json"), ["en_US", "tr_TR"])
    for dosya, satirlar in (("en_US.lang", en_us), ("tr_TR.lang", tr_tr)):
        with open(os.path.join(RP, "texts", dosya), "w", encoding="utf-8") as f:
            f.write("\n".join(satirlar) + "\n")

    print("uretildi: %d esya, %d attachable, %d doku, 2 dil dosyasi"
          % (len(KOLLAR), len(KOLLAR), len(KOLLAR) * 2))


if __name__ == "__main__":
    main()
