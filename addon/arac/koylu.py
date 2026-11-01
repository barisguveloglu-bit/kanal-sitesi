# -*- coding: utf-8 -*-
"""Minecraft koylusu: model (kutular) ve doku katmanlari.   v7.99.16

2. bolumun hanedaninda koyluler var (SERI_SEZON1.md: "golemler, koyluler").
Kullanici: "koyluler de olacak fakat biraz az olsun ... skinler bayagi
fazla hepsini indir."

MODEL UYDURULMADI: kutular, pivotlar, kol acisi ve olcek Mojang'in Java
26.3 istemci JAR'indan (SHA-1 e877b6a0...7b87) javap ile okundu:
  net/minecraft/client/model/npc/VillagerModel.createBodyModel
  net/minecraft/client/model/geom/LayerDefinitions  (MeshTransformer.scaling(0.9375))
  net/minecraft/client/renderer/entity/layers/VillagerProfessionLayer (sapka kurali)
Dokular JAR'dan arac/arac_kur.sh ile $KOYLU_DOKU'ya (/opt/araclar/paketler/koylu)
kurulur; Mojang dosyasidir, DEPOYA GIRMEZ (REFERANS_MOJANG_KILAVUZ.md).

Saf Python, Blender gerekmez: kutu koseleri, yuz UV'leri ve katman
birlestirme burada; hanedan_onizle.py bunlari Blender'a koyar.
Eksenler blok_kur'unkiyle ayni: x dogu, y yukari, z guney (blok birimi).
"""
import math

DOKU = 64                       # doku 64x64
OLCEK = 0.9375                  # LayerDefinitions: MeshTransformer.scaling(0.9375)
KOL_ACISI = -0.75               # arms: PartPose.offsetAndRotation(0, 3, -1, -0.75, 0, 0)

# Java model uzayi: y ASAGI, yuz -z'ye bakar, (0, 24, 0) zemin.
# parca: (ad, ebeveyn, pivot, x_donus, [(kose, boyut, uv, sisirme, ayna)])
PARCALAR = [
    ("head", None, (0, 0, 0), 0.0, [((-4, -10, -4), (8, 10, 8), (0, 0), 0.0, False)]),
    ("hat", "head", (0, 0, 0), 0.0, [((-4, -10, -4), (8, 10, 8), (32, 0), 0.51, False)]),
    ("hat_rim", "hat", (0, 0, 0), -math.pi / 2, [((-8, -8, -6), (16, 16, 1), (30, 47), 0.0, False)]),
    ("nose", "head", (0, -2, 0), 0.0, [((-1, -1, -6), (2, 4, 2), (24, 0), 0.0, False)]),
    ("body", None, (0, 0, 0), 0.0, [((-4, 0, -3), (8, 12, 6), (16, 20), 0.0, False)]),
    ("jacket", "body", (0, 0, 0), 0.0, [((-4, 0, -3), (8, 20, 6), (0, 38), 0.5, False)]),
    ("arms", None, (0, 3, -1), KOL_ACISI, [((-8, -2, -2), (4, 8, 4), (44, 22), 0.0, False),
                                          ((4, -2, -2), (4, 8, 4), (44, 22), 0.0, True),
                                          ((-4, 2, -2), (8, 4, 4), (40, 38), 0.0, False)]),
    ("right_leg", None, (-2, 12, 0), 0.0, [((-2, 0, -2), (4, 12, 4), (0, 22), 0.0, False)]),
    ("left_leg", None, (2, 12, 0), 0.0, [((-2, 0, -2), (4, 12, 4), (0, 22), 0.0, True)]),
]

TIPLER = ("plains", "desert", "jungle", "savanna", "snow", "swamp", "taiga")
MESLEKLER = ("none", "armorer", "butcher", "cartographer", "cleric", "farmer", "fisherman", "fletcher",
             "leatherworker", "librarian", "mason", "nitwit", "shepherd", "toolsmith", "weaponsmith")
SEVIYELER = ("stone", "iron", "gold", "emerald", "diamond")

# sapka parcalarinin doku alanlari (u0, v0, u1, v1): hat kutusu ve kenari
SAPKA_ALANI = [(32, 0, 64, 18), (30, 47, 64, 64)]


def _rx(p, a):
    """Java ModelPart donusu (yalniz x): y' = y cos - z sin, z' = y sin + z cos."""
    c, s = math.cos(a), math.sin(a)
    return (p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c)


def _dunya(p, ad):
    """Parca uzayindaki nokta -> Java model uzayi (ebeveynler boyunca)."""
    tablo = {q[0]: q for q in PARCALAR}
    while ad is not None:
        _, ebeveyn, pivot, xd, _ = tablo[ad]
        p = _rx(p, xd)
        p = (p[0] + pivot[0], p[1] + pivot[1], p[2] + pivot[2])
        ad = ebeveyn
    return p


def _mc(p):
    """Java model uzayi (piksel) -> yerel blok uzayi, guneye bakan koylu.
    Iki eksen birden donuyor (det +1): x ayni, y = 24 - y, z = -z."""
    return (p[0] / 16.0 * OLCEK, (24.0 - p[1]) / 16.0 * OLCEK, -p[2] / 16.0 * OLCEK)


def _uv_alanlari(uv, boyut):
    """Minecraft kutu UV'si: yuz -> (u0, v0, u1, v1) piksel."""
    u, v = uv
    w, h, d = boyut
    return {"ust": (u + d, v, u + d + w, v + d), "alt": (u + d + w, v, u + d + 2 * w, v + d),
            "sag": (u, v + d, u + d, v + d + h), "on": (u + d, v + d, u + d + w, v + d + h),
            "sol": (u + d + w, v + d, u + 2 * d + w, v + d + h),
            "arka": (u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h)}


def kutular():
    """Butun yuzler: [(parca, yuz, [4 kose (yerel blok)], [4 uv (0-1, v yukari)])].
    Kose sirasi disaridan bakinca saat yonunun tersi (normal disari).
    Koylu guneye (+z) bakar, ayaklari y = 0'da."""
    cikti = []
    for ad, _, _, _, liste in PARCALAR:
        for (k, boyut, uv, g, ayna) in liste:
            x0, y0, z0 = k[0] - g, k[1] - g, k[2] - g
            x1, y1, z1 = k[0] + boyut[0] + g, k[1] + boyut[1] + g, k[2] + boyut[2] + g
            alan = _uv_alanlari(uv, boyut)
            if ayna:
                alan["sag"], alan["sol"] = alan["sol"], alan["sag"]
            # her yuz: Java uzayinda 4 kose, (sol-ust, sag-ust, sag-alt, sol-alt)
            # dokunun goruldugu yonden bakinca. y asagi, yuz -z.
            yuzler = {
                "on": [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)],
                "arka": [(x1, y0, z1), (x0, y0, z1), (x0, y1, z1), (x1, y1, z1)],
                "sag": [(x0, y0, z1), (x0, y0, z0), (x0, y1, z0), (x0, y1, z1)],
                "sol": [(x1, y0, z0), (x1, y0, z1), (x1, y1, z1), (x1, y1, z0)],
                "ust": [(x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0)],
                "alt": [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)],
            }
            for yuz, koseler in yuzler.items():
                u0, v0, u1, v1 = alan[yuz]
                if ayna:
                    u0, u1 = u1, u0
                uvler = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
                # (sol-ust, sag-ust, sag-alt, sol-alt) disaridan bakinca saat
                # yonunde; tersi saat yonunun tersi, normal disari bakar
                dunya = [_mc(_dunya(p, ad)) for p in koseler][::-1]
                uvler = uvler[::-1]
                cikti.append((ad, yuz, dunya, [(a / float(DOKU), 1 - b / float(DOKU)) for a, b in uvler]))
    return cikti


def yerlestir(yuzler, konum, yon):
    """Yerel (guneye bakan) koyluyu `konum`a (ayaklar) koyar ve (fx, fz)
    yonune cevirir. Donus: ayni bicimde yuz listesi."""
    t = math.atan2(yon[0], yon[1])
    c, s = math.cos(t), math.sin(t)
    sonuc = []
    for ad, yuz, koseler, uv in yuzler:
        k = [(konum[0] + x * c + z * s, konum[1] + y, konum[2] - x * s + z * c) for x, y, z in koseler]
        sonuc.append((ad, yuz, k, uv))
    return sonuc


def katman_listesi(tip, meslek, seviye, sapka):
    """Java'nin cizim sirasi. `sapka`: {"type/x": "full"|"partial", ...}
    (.mcmeta; yoksa "none"). Donus: [(goreli yol, sapka_gizli)]."""
    if tip not in TIPLER or meslek not in MESLEKLER or seviye not in SEVIYELER:
        raise ValueError("bilinmeyen koylu: %s %s %s" % (tip, meslek, seviye))
    tip_s = sapka.get("type/" + tip, "none")
    mes_s = sapka.get("profession/" + meslek, "none") if meslek != "none" else "none"
    # VillagerProfessionLayer: tip katmaninin sapkasi yalniz meslek sapkasi
    # yoksa ya da yarimsa ve tipinki tam degilse gorunur
    tip_gorunur = mes_s == "none" or (mes_s == "partial" and tip_s != "full")
    katman = [("villager.png", False), ("type/%s.png" % tip, not tip_gorunur)]
    if meslek != "none":
        katman.append(("profession/%s.png" % meslek, False))
        if meslek != "nitwit":
            katman.append(("profession_level/%s.png" % seviye, False))
    return katman


def birlestir(katmanlar):
    """Katmanlari Minecraft'in kesik (cutout) cizimi gibi ust uste koyar.
    katmanlar: [(satirlar, sapka_gizli)]; satirlar 64 satir x 64 (r, g, b, a),
    UST satir ilk. Alfa < 0.1 cizilmez; cizilen piksel opak olur."""
    cikti = [[(0.0, 0.0, 0.0, 0.0)] * DOKU for _ in range(DOKU)]
    for satirlar, gizli in katmanlar:
        for v in range(DOKU):
            for u in range(DOKU):
                if gizli and any(a <= u < c and b <= v < d for a, b, c, d in SAPKA_ALANI):
                    continue
                r, g, b, a = satirlar[v][u]
                if a >= 0.1:
                    cikti[v][u] = (r, g, b, 1.0)
    return cikti
