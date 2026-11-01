# -*- coding: utf-8 -*-
"""BLOK LISTESINDEN ORGU -- film sahnelerinin yapi kurucusu.   v7.99.16

Girdi: [{"p": [x, y, z], "t": "spruce_stairs", "s": {...}}, ...]
       (arac/yapi_olc.py'nin olctugu bicim; Minecraft yonleri: x dogu,
       y yukari, z guney; t Bedrock adi, "minecraft:" oneksiz; s blok
       durumu, Bedrock adlariyla).
Cikti: doku basina tek bir orgu -- {anahtar: {"v": [...], "f": [...],
       "uv": [...]}}. Anahtar (doku_dosyasi, renk, isik, saydam).

Neden tek orgu: blok basina bir Blender nesnesi binlerce blokta
dakikalar surer; doku basina tek orgu saniyeler. Birbirine degen iki
tam ve opak blogun arasindaki yuz cizilmez.

Saf Python: Blender'siz sinanabilir (test/blok_kur.mjs). Blender tarafi
yalniz `blender_ekle()`.

Sekiller (olculen Bedrock durumlariyla):
  kup, basamak (weirdo_direction 0 dogu 1 bati 2 guney 3 kuzey = yuksek
  tarafin yonu; corner none/inner_*/outer_*; upside_down_bit), yarim
  (vertical_half), cit (connection_*), cit kapisi, duvar
  (wall_connection_type_*), cam bolme, kapi, tuzak kapi, carpraz bitki,
  hali, mesale, fener, yatak, saksi, kazan, merdiven, su, Nether gecidi.
Biyom: `Dokular(var, renkler={...})` cimen/yaprak/su boyasini degistirir
(bataklik: kulube.py); bir blokta "renk" varsa o blogun boyasi odur.
Bilinmeyen sekil tam kup cizilir; dokusu bulunmayan blok mor-siyah
degil, gri cizilir ve `eksik` listesine yazilir (uydurma doku yok).
"""
import math

PX = 1.0 / 16.0
YONLER = {"d": (1, 0, 0), "b": (-1, 0, 0), "u": (0, 1, 0), "a": (0, -1, 0), "g": (0, 0, 1), "k": (0, 0, -1)}
CIMEN = (0.49, 0.73, 0.30)
YAPRAK = (0.42, 0.62, 0.24)
HUS_YAPRAK = (0.50, 0.65, 0.33)     # Minecraft FoliageColor.BIRCH  #80A755
LADIN_YAPRAK = (0.38, 0.60, 0.38)   # Minecraft FoliageColor.EVERGREEN  #619961
SU = (0.25, 0.44, 0.85)
NILUFER = (0.13, 0.50, 0.19)
# basamak / kapi yonu: Bedrock weirdo_direction ve direction -> birim vektor
BASAMAK_YON = {0: (1, 0), 1: (-1, 0), 2: (0, 1), 3: (0, -1)}   # (x, z)
KAPI_YON = {0: (1, 0), 1: (0, 1), 2: (-1, 0), 3: (0, -1)}       # dogu, guney, bati, kuzey
KARDINAL = {"east": (1, 0), "south": (0, 1), "west": (-1, 0), "north": (0, -1)}

# Bedrock adi -> MCprep (Java) doku adi. Ayni adlilar burada yok.
AD = {
    "wooden_door": "oak_door", "trapdoor": "oak_trapdoor", "fence_gate": "oak_planks",
    "reeds": "sugar_cane", "deadbush": "dead_bush", "waterlily": "lily_pad",
    "yellow_flower": "dandelion", "tallgrass": "short_grass", "grass_path": "dirt_path",
    "stonebrick": "stone_bricks", "brick_block": "bricks", "hardened_clay": "terracotta",
    "stone_stairs": "cobblestone", "normal_stone_stairs": "stone", "wooden_pressure_plate": "oak_planks",
    "lit_pumpkin": "jack_o_lantern", "snow_layer": "snow", "web": "cobweb", "frame": "item_frame",
    "smooth_stone_slab": "smooth_stone", "carpet": "white_wool", "wool": "white_wool",
    "standing_banner": "white_wool", "wall_banner": "white_wool",
    "glass_pane": "glass", "iron_bars": "iron_bars", "portal": "nether_portal",
}
CIMEN_ORTU = "grass_block_side_overlay"
GECIT_ISIK = 3.0        # Nether gecidinin isigi (fener ve mesale 4.0)
TAHTA = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "cherry", "pale_oak", "bamboo",
         "crimson", "warped"]
OPAK_DEGIL = ("glass", "leaves", "ice", "water", "lava", "slime", "honey", "barrier", "light_block")


def taban_doku(ad):
    """Basamak / yarim / cit / duvar adindan govde dokusu: oak_stairs -> oak_planks."""
    for ek in ("_double_slab", "_slab", "_stairs", "_fence_gate", "_fence", "_wall", "_pressure_plate",
               "_button"):
        if ad.endswith(ek):
            kok = ad[: -len(ek)]
            if kok in TAHTA:
                return kok + "_planks"
            return {"stone_brick": "stone_bricks", "mossy_stone_brick": "mossy_stone_bricks",
                    "brick": "bricks", "nether_brick": "nether_bricks", "cobblestone": "cobblestone",
                    "mossy_cobblestone": "mossy_cobblestone", "smooth_stone": "smooth_stone",
                    "sandstone": "sandstone", "stone": "stone", "polished_andesite": "polished_andesite",
                    "andesite": "andesite", "deepslate_brick": "deepslate_bricks",
                    "purpur": "purpur_block", "quartz": "quartz_block_side", "smooth_quartz": "quartz_block_bottom",
                    "prismarine": "prismarine", "blackstone": "blackstone", "end_stone_brick": "end_stone_bricks",
                    "mud_brick": "mud_bricks", "tuff_brick": "tuff_bricks"}.get(kok, kok)
    return AD.get(ad, ad)


class Dokular:
    """Doku dosyasi bulucu. `var`: MCprep blok klasorundeki ad kumesi
    (uzantisiz). Bulunamayan blok `eksik`e yazilir.

    `renkler`: biyom boyasi ({"cimen", "yaprak", "su"}); verilmezse ova.
    Hus ve ladin yapragi ile nilufer Minecraft'ta biyomdan bagimsiz,
    onlar degismez."""

    def __init__(self, var, renkler=None):
        self.var = set(var)
        self.eksik = set()
        self.renk = {"cimen": CIMEN, "yaprak": YAPRAK, "su": SU}
        self.renk.update(renkler or {})

    def bul(self, *adaylar):
        for a in adaylar:
            if a and a in self.var:
                return a
        return None

    def yuz(self, t, yuz, s=None):
        """t: Bedrock adi; yuz: ust/alt/yan/on. -> (doku, renk) ya da (None, None)."""
        s = s or {}
        ad = AD.get(t, t)
        if t == "grass_block":
            # Yan yuz: grass_block_side. Ova disinda ustune boyali ortu biner
            # (orgu(), CIMEN_ORTU).
            return {"ust": ("grass_block_top", self.renk["cimen"]), "alt": ("dirt", None)}.get(yuz, ("grass_block_side", None))
        if t in ("wheat", "carrots", "potatoes", "beetroot"):
            # ekinin dokusu buyume evresinden (Bedrock growth 0-7; bugday 8,
            # digerleri 4 doku); duz adla aranirsa "eksik" sayiliyordu
            evre = s.get("growth", 7)
            kok = {"wheat": "wheat_stage", "carrots": "carrots_stage", "potatoes": "potatoes_stage",
                   "beetroot": "beetroots_stage"}[t]
            en = 7 if t == "wheat" else 3
            return (self.bul("%s%d" % (kok, min(en, evre if t == "wheat" else evre // 2)), "%s%d" % (kok, en)),
                    None)
        if t.endswith("_log") or t.endswith("_wood") or t in ("hay_block", "bone_block", "basalt",
                                                              "quartz_pillar", "purpur_pillar"):
            kok = ad
            if yuz in ("ust", "alt"):
                return (self.bul(kok + "_top", kok), None)
            return (self.bul(kok + "_side", kok), None)
        if t == "crafting_table":
            return ({"ust": "crafting_table_top", "alt": "oak_planks", "on": "crafting_table_front"}
                    .get(yuz, "crafting_table_side"), None)
        if t == "bookshelf":
            return ("oak_planks" if yuz in ("ust", "alt") else "bookshelf", None)
        if t in ("dirt_path", "grass_path"):
            return ("dirt_path_top" if yuz == "ust" else ("dirt" if yuz == "alt" else "dirt_path_side"), None)
        if t == "farmland":
            return ("farmland_moist" if yuz == "ust" and s.get("moisturized_amount", 0) else
                    ("farmland" if yuz == "ust" else "dirt"), None)
        if t.endswith("_leaves") or t == "leaves":
            # Minecraft'ta hus ve ladin yapragi biyomdan bagimsiz sabit renk
            renk = {"birch_leaves": HUS_YAPRAK, "spruce_leaves": LADIN_YAPRAK}.get(t, self.renk["yaprak"])
            return (self.bul(ad, "oak_leaves"), renk)
        if t in ("water", "flowing_water"):
            return ("water_still", self.renk["su"])
        if t == "waterlily":
            return ("lily_pad", NILUFER)
        if t in ("vine",):
            return ("vine", self.renk["yaprak"])
        if t in ("short_grass", "tallgrass", "fern", "tall_grass", "large_fern"):
            kok = {"tallgrass": "short_grass"}.get(t, t)
            if t in ("tall_grass", "large_fern"):
                kok = t + ("_top" if s.get("upper_block_bit") else "_bottom")
            return (self.bul(kok, "short_grass"), self.renk["cimen"])
        if t in ("furnace", "lit_furnace", "smoker", "lit_smoker", "blast_furnace", "lit_blast_furnace"):
            kok = t.replace("lit_", "")
            return ({"ust": self.bul(kok + "_top", "furnace_top"), "alt": self.bul(kok + "_top", "furnace_top"),
                     "on": self.bul(kok + "_front", kok + "_front_on")}.get(yuz, self.bul(kok + "_side")), None)
        if t in ("barrel",):
            return ("barrel_top" if yuz in ("ust",) else ("barrel_bottom" if yuz == "alt" else "barrel_side"), None)
        if t in ("pumpkin", "carved_pumpkin", "lit_pumpkin", "melon_block"):
            kok = "melon" if t == "melon_block" else "pumpkin"
            if yuz in ("ust", "alt"):
                return (kok + "_top", None)
            if yuz == "on" and t != "pumpkin" and t != "melon_block":
                return ("jack_o_lantern" if t == "lit_pumpkin" else "carved_pumpkin", None)
            return (kok + "_side", None)
        if t in ("smithing_table", "fletching_table", "cartography_table", "loom", "composter", "lectern",
                 "stonecutter_block", "tnt", "cauldron"):
            kok = {"stonecutter_block": "stonecutter"}.get(t, t)
            if yuz == "ust":
                return (self.bul(kok + "_top", kok), None)
            if yuz == "alt":
                return (self.bul(kok + "_bottom", kok + "_top", "oak_planks"), None)
            if yuz == "on":
                return (self.bul(kok + "_front", kok + "_side", kok + "_side1", kok + "_sides", kok), None)
            return (self.bul(kok + "_side", kok + "_side1", kok + "_sides", kok), None)
        if t.endswith("_terracotta") or t.endswith("_wool") or t.endswith("_concrete"):
            return (self.bul(ad), None)
        if t.endswith("_carpet"):
            return (self.bul(t.replace("_carpet", "_wool")), None)
        if t.endswith("_bed") or t == "bed":
            renk = s.get("renk", "red")      # olculen yatakta renk blok varliginda, okunamiyor
            bas = "head" if s.get("head_piece_bit") else "foot"
            if yuz == "ust":
                return (self.bul("%s_bed_%s_up" % (renk, bas)), None)
            if yuz == "alt":
                return (self.bul("bed_down", "oak_planks"), None)
            return (self.bul("%s_bed_%s_east" % (renk, bas), "%s_bed_%s_west" % (renk, bas)), None)
        govde = taban_doku(t)
        if t.endswith("_stained_glass_pane"):
            govde = t[: -len("_pane")]
        if yuz == "ust":
            d = self.bul(govde + "_top", govde)
        elif yuz == "alt":
            d = self.bul(govde + "_bottom", govde + "_top", govde)
        else:
            d = self.bul(govde, govde + "_side", govde + "_front")
        if d is None:
            self.eksik.add(t)
        return (d, None)


def sekil(t):
    if t.endswith("_stairs"):
        return "basamak"
    if t.endswith("_slab") and "double" not in t:
        return "yarim"
    if t.endswith("_fence") and not t.endswith("_gate"):
        return "cit"
    if t.endswith("fence_gate"):
        return "cit_kapisi"
    if t.endswith("_wall") and t != "cobblestone_wall_" and "wall_" not in t and "banner" not in t and "sign" not in t:
        return "duvar"
    if t in ("glass_pane", "iron_bars") or t.endswith("_glass_pane"):
        return "bolme"
    if t.endswith("_door") or t in ("wooden_door",):
        return "kapi"
    if t.endswith("trapdoor"):
        return "kapak"
    if t in ("short_grass", "tallgrass", "fern", "tall_grass", "large_fern", "dandelion", "poppy", "yellow_flower",
             "red_flower", "azure_bluet", "oxeye_daisy", "cornflower", "lily_of_the_valley", "allium",
             "blue_orchid", "red_tulip", "orange_tulip", "white_tulip", "pink_tulip", "deadbush", "dead_bush",
             "red_mushroom", "brown_mushroom", "reeds", "sugar_cane", "sweet_berry_bush", "oak_sapling",
             "wheat", "carrots", "potatoes", "beetroot", "sunflower", "lilac", "rose_bush", "peony"):
        return "carpraz"
    if t.endswith("_carpet") or t == "carpet":
        return "hali"
    if t in ("torch", "wall_torch", "soul_torch", "redstone_torch"):
        return "mesale"
    if t in ("lantern", "soul_lantern"):
        return "fener"
    if t.endswith("_bed") or t == "bed":
        return "yatak"
    if t == "flower_pot":
        return "saksi"
    if t == "cauldron":
        return "kazan"
    if t == "ladder":
        return "merdiven"
    if t in ("water", "flowing_water"):
        return "su"
    if t in ("portal",):
        return "gecit"
    if t in ("waterlily",):
        return "nilufer"
    if t in ("dirt_path", "grass_path", "farmland"):
        return "yol"
    if t in ("vine",):
        return "sarmasik"
    if t in ("bell",):
        return "can"
    if t in ("chest", "trapped_chest", "ender_chest"):
        return "sandik"
    if t in ("lectern",):
        return "kursu"
    return "kup"


def opak_tam(t):
    return sekil(t) == "kup" and not any(k in t for k in OPAK_DEGIL)


def _sol(f):
    """Bakis yonu f (x, z) iken sol (ustten bakista): guney->dogu, dogu->kuzey."""
    return (f[1], -f[0])


def _yarim_kutu(f, alt, ust):
    """f yonundeki yarim (x, z)."""
    x0, x1, z0, z1 = 0.0, 1.0, 0.0, 1.0
    if f == (1, 0):
        x0 = 0.5
    elif f == (-1, 0):
        x1 = 0.5
    elif f == (0, 1):
        z0 = 0.5
    else:
        z1 = 0.5
    return (x0, alt, z0, x1, ust, z1)


def _kesisim(a, b):
    return (max(a[0], b[0]), max(a[1], b[1]), max(a[2], b[2]), min(a[3], b[3]), min(a[4], b[4]), min(a[5], b[5]))


def kutular(t, s, komsu=None):
    """Blok-ici kutular: [(x0, y0, z0, x1, y1, z1), ...] (0..1)."""
    sk = sekil(t)
    s = s or {}
    if sk == "yarim":
        ust = s.get("vertical_half", s.get("minecraft:vertical_half")) == "top" or s.get("top_slot_bit")
        return [(0, 0.5, 0, 1, 1, 1)] if ust else [(0, 0, 0, 1, 0.5, 1)]
    if sk == "basamak":
        ters = bool(s.get("upside_down_bit"))
        f = BASAMAK_YON.get(s.get("weirdo_direction", 0), (1, 0))
        taban = (0, 0.5, 0, 1, 1, 1) if ters else (0, 0, 0, 1, 0.5, 1)
        alt, ust = (0.0, 0.5) if ters else (0.5, 1.0)
        kose = s.get("corner", s.get("minecraft:corner", "none"))
        yari = _yarim_kutu(f, alt, ust)
        if kose in ("outer_left", "outer_right"):
            yan = _sol(f) if kose == "outer_left" else (-_sol(f)[0], -_sol(f)[1])
            return [taban, _kesisim(yari, _yarim_kutu(yan, alt, ust))]
        if kose in ("inner_left", "inner_right"):
            yan = _sol(f) if kose == "inner_left" else (-_sol(f)[0], -_sol(f)[1])
            ters_yari = _yarim_kutu((-f[0], -f[1]), alt, ust)
            return [taban, yari, _kesisim(ters_yari, _yarim_kutu(yan, alt, ust))]
        return [taban, yari]
    if sk == "cit":
        k = [(6 * PX, 0, 6 * PX, 10 * PX, 1, 10 * PX)]
        for ad, (dx, dz) in (("east", (1, 0)), ("west", (-1, 0)), ("south", (0, 1)), ("north", (0, -1))):
            if s.get("connection_" + ad) or s.get("minecraft:connection_" + ad):
                for y0, y1 in ((6 * PX, 9 * PX), (12 * PX, 15 * PX)):
                    if dx:
                        k.append((10 * PX if dx > 0 else 0, y0, 7 * PX, 1 if dx > 0 else 6 * PX, y1, 9 * PX))
                    else:
                        k.append((7 * PX, y0, 10 * PX if dz > 0 else 0, 9 * PX, y1, 1 if dz > 0 else 6 * PX))
        return k
    if sk == "cit_kapisi":
        f = KAPI_YON.get(s.get("direction", 0), (1, 0))
        boyuna_x = f[1] != 0          # guney/kuzey bakarsa dogu-bati uzanir
        if s.get("open_bit"):
            boyuna_x = not boyuna_x
        k = []
        for y0, y1 in ((6 * PX, 9 * PX), (12 * PX, 15 * PX)):
            k.append((0, y0, 7 * PX, 1, y1, 9 * PX) if boyuna_x else (7 * PX, y0, 0, 9 * PX, y1, 1))
        k.append((0, 5 * PX, 7 * PX, 2 * PX, 1, 9 * PX) if boyuna_x else (7 * PX, 5 * PX, 0, 9 * PX, 1, 2 * PX))
        k.append((14 * PX, 5 * PX, 7 * PX, 1, 1, 9 * PX) if boyuna_x else (7 * PX, 5 * PX, 14 * PX, 9 * PX, 1, 1))
        return k
    if sk == "duvar":
        k = []
        if s.get("wall_post_bit", True):
            k.append((4 * PX, 0, 4 * PX, 12 * PX, 1, 12 * PX))
        for ad, (dx, dz) in (("east", (1, 0)), ("west", (-1, 0)), ("south", (0, 1)), ("north", (0, -1))):
            tip = s.get("wall_connection_type_" + ad, "none")
            if tip == "none":
                continue
            y1 = 1.0 if tip == "tall" else 14 * PX
            if dx:
                k.append((8 * PX if dx > 0 else 0, 0, 5 * PX, 1 if dx > 0 else 8 * PX, y1, 11 * PX))
            else:
                k.append((5 * PX, 0, 8 * PX if dz > 0 else 0, 11 * PX, y1, 1 if dz > 0 else 8 * PX))
        return k or [(4 * PX, 0, 4 * PX, 12 * PX, 1, 12 * PX)]
    if sk == "bolme":
        k = [(7 * PX, 0, 7 * PX, 9 * PX, 1, 9 * PX)]
        kom = komsu or {}
        bag = [d for d in ("d", "b", "g", "k") if kom.get(d)]
        if not bag:
            bag = ["d", "b"]
        for d in bag:
            if d == "d":
                k.append((9 * PX, 0, 7 * PX, 1, 1, 9 * PX))
            elif d == "b":
                k.append((0, 0, 7 * PX, 7 * PX, 1, 9 * PX))
            elif d == "g":
                k.append((7 * PX, 0, 9 * PX, 9 * PX, 1, 1))
            else:
                k.append((7 * PX, 0, 0, 9 * PX, 1, 7 * PX))
        return k
    if sk == "kapi":
        f = KAPI_YON.get(s.get("direction", 0), (1, 0))
        if s.get("open_bit"):
            f = _sol(f) if not s.get("door_hinge_bit") else (-_sol(f)[0], -_sol(f)[1])
        # Kapali panel bakis yonunun TERSINDEKI kenarda (Java ile ayni duzen).
        x0, x1, z0, z1 = 0, 1, 0, 1
        if f == (1, 0):
            x1 = 3 * PX
        elif f == (-1, 0):
            x0 = 13 * PX
        elif f == (0, 1):
            z1 = 3 * PX
        else:
            z0 = 13 * PX
        return [(x0, 0, z0, x1, 1, z1)]
    if sk == "kapak":
        if s.get("open_bit"):
            f = BASAMAK_YON.get(s.get("direction", 0), (1, 0))
            x0, x1, z0, z1 = 0, 1, 0, 1
            if f == (1, 0):
                x1 = 3 * PX
            elif f == (-1, 0):
                x0 = 13 * PX
            elif f == (0, 1):
                z1 = 3 * PX
            else:
                z0 = 13 * PX
            return [(x0, 0, z0, x1, 1, z1)]
        return [(0, 13 * PX, 0, 1, 1, 1)] if s.get("upside_down_bit") else [(0, 0, 0, 1, 3 * PX, 1)]
    if sk == "hali":
        return [(0, 0, 0, 1, PX, 1)]
    if sk == "mesale":
        yon = s.get("torch_facing_direction", "top")
        if yon in ("top", "unknown"):
            return [(7 * PX, 0, 7 * PX, 9 * PX, 10 * PX, 9 * PX)]
        dx, dz = {"east": (-1, 0), "west": (1, 0), "south": (0, -1), "north": (0, 1)}.get(yon, (0, 0))
        cx, cz = 0.5 + dx * 5 * PX, 0.5 + dz * 5 * PX
        return [(cx - PX, 3 * PX, cz - PX, cx + PX, 13 * PX, cz + PX)]
    if sk == "fener":
        if s.get("hanging"):
            return [(5 * PX, 1 * PX, 5 * PX, 11 * PX, 8 * PX, 11 * PX), (6 * PX, 8 * PX, 6 * PX, 10 * PX, 10 * PX, 10 * PX)]
        return [(5 * PX, 0, 5 * PX, 11 * PX, 7 * PX, 11 * PX), (6 * PX, 7 * PX, 6 * PX, 10 * PX, 9 * PX, 10 * PX)]
    if sk == "yatak":
        return [(0, 3 * PX, 0, 1, 9 * PX, 1)]
    if sk == "saksi":
        return [(5 * PX, 0, 5 * PX, 11 * PX, 6 * PX, 11 * PX)]
    if sk == "kazan":
        t2 = 2 * PX
        return [(0, 3 * PX, 0, 1, 1, t2), (0, 3 * PX, 1 - t2, 1, 1, 1), (0, 3 * PX, t2, t2, 1, 1 - t2),
                (1 - t2, 3 * PX, t2, 1, 1, 1 - t2), (t2, 3 * PX, t2, 1 - t2, 4 * PX, 1 - t2),
                (0, 0, 0, 4 * PX, 3 * PX, t2), (1 - 4 * PX, 0, 0, 1, 3 * PX, t2),
                (0, 0, 1 - t2, 4 * PX, 3 * PX, 1), (1 - 4 * PX, 0, 1 - t2, 1, 3 * PX, 1)]
    if sk == "merdiven":
        yon = s.get("facing_direction", 2)
        return [{2: (0, 0, 15 * PX, 1, 1, 1), 3: (0, 0, 0, 1, 1, PX), 4: (15 * PX, 0, 0, 1, 1, 1),
                 5: (0, 0, 0, PX, 1, 1)}.get(yon, (0, 0, 15 * PX, 1, 1, 1))]
    if sk == "yol":
        return [(0, 0, 0, 1, 15 * PX, 1)]
    if sk == "can":
        return [(4 * PX, 3 * PX, 4 * PX, 12 * PX, 13 * PX, 12 * PX)]
    if sk == "sandik":
        return [(PX, 0, PX, 15 * PX, 14 * PX, 15 * PX)]
    if sk == "kursu":
        return [(4 * PX, 0, 4 * PX, 12 * PX, 13 * PX, 12 * PX), (0, 13 * PX, 0, 1, 15 * PX, 1)]
    return [(0, 0, 0, 1, 1, 1)]


def _uv(yuz, x, y, z):
    """Blok-ici nokta -> doku koordinati (dokunun ustu yukari)."""
    if yuz in ("u", "a"):
        return (x, 1 - z)
    if yuz in ("d",):
        return (1 - z, y)
    if yuz in ("b",):
        return (z, y)
    if yuz in ("g",):
        return (x, y)
    return (1 - x, y)


# Fener dokusu (lantern.png) tam yuz degil, kucuk bir atlas: govdenin yani
# (0,2)-(6,9), ustu (0,9)-(6,15), kapagin yani (1,0)-(5,2), ustu
# (1,10)-(5,14) piksel (Java'nin template_lantern modeli). Dosya 16x48, uc
# kareli canlandirma (MCprep paketinde olculdu); yalniz ilk kare kullanilir.
# Genel UV ile cizilince dokunun bos ortasina dusuyor, fener gorunmuyordu.
FENER_KARE = 3
# Ayni sorun su ve gecitte: dokulari 16 px genis, 32 kare uzun serit (MCprep
# paketinde olculdu: water_still 16x512, nether_portal 16x512). Butun yuze
# serildiginde 32 kare bir bloga sikisiyor, cizgili gorunuyordu. Yalniz ilk
# kare (seridin ustu) kullanilir.
KARELI = {"water_still": 32, "nether_portal": 32}
FENER_BOLGE = {(0, "yan"): (0, 2, 6, 9), (0, "ust"): (0, 9, 6, 15),
               (1, "yan"): (1, 0, 5, 2), (1, "ust"): (1, 10, 5, 14)}


def _bolge_uv(uvler, bolge, kare=1):
    """Yuzun genel UV'lerini dokunun bir piksel bolgesine sigdirir."""
    x0, y0, x1, y1 = bolge
    us, vs = [u for u, v in uvler], [v for u, v in uvler]
    umin, umax, vmin, vmax = min(us), max(us), min(vs), max(vs)
    ust, alt = 1 - y0 / (16.0 * kare), 1 - y1 / (16.0 * kare)
    return [(x0 / 16.0 + (u - umin) / ((umax - umin) or 1) * (x1 - x0) / 16.0,
             alt + (v - vmin) / ((vmax - vmin) or 1) * (ust - alt)) for u, v in uvler]


def _kutu_yuzleri(k):
    x0, y0, z0, x1, y1, z1 = k
    return {
        "u": [(x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)],
        "a": [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)],
        "d": [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)],
        "b": [(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)],
        "g": [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
        "k": [(x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (x1, y0, z0)],
    }


def _on_yon(t, s):
    """Yuzu 'on' olan yatay yon (furnace, masa, oymali kabak...)."""
    cd = s.get("minecraft:cardinal_direction") or s.get("cardinal_direction")
    if cd in KARDINAL:
        return KARDINAL[cd]
    if "direction" in s and t not in ("crafting_table",):
        return {0: (0, 1), 1: (-1, 0), 2: (0, -1), 3: (1, 0)}.get(s.get("direction"), (0, 1))
    if "facing_direction" in s:
        return {2: (0, -1), 3: (0, 1), 4: (-1, 0), 5: (1, 0)}.get(s.get("facing_direction"), (0, 1))
    return (0, -1)


YUZ_YON = {"d": (1, 0), "b": (-1, 0), "g": (0, 1), "k": (0, -1)}


def orgu(bloklar, dokular, koken=(0, 0, 0), isikli=()):
    """Blok listesi -> {(doku, renk, isik, saydam): {"v", "f", "uv"}}.
    Koordinatlar Blender eksenlerinde: X = x, Y = -z, Z = y (+ koken)."""
    harita = {}
    for b in bloklar:
        harita[tuple(b["p"])] = b
    cikti = {}

    def ekle(anahtar, dortlu, uvler):
        if anahtar[0] in KARELI:
            n = float(KARELI[anahtar[0]])
            uvler = [(u, 1 - (1 - v) / n) for u, v in uvler]
        c = cikti.setdefault(anahtar, {"v": [], "f": [], "uv": []})
        i = len(c["v"])
        for (x, y, z) in dortlu:
            c["v"].append((x + koken[0], -z - koken[2], y + koken[1]))
        c["f"].append((i, i + 1, i + 2, i + 3))
        c["uv"].extend(uvler)

    def komsu_tip(p, d):
        dx, dy, dz = YONLER[d]
        q = harita.get((p[0] + dx, p[1] + dy, p[2] + dz))
        return q["t"] if q else None

    for p, b in harita.items():
        t, s = b["t"], b.get("s", {})
        sk = sekil(t)
        isik = 4.0 if (t in isikli or sk in ("mesale", "fener")) else 0.0
        if sk == "gecit":
            # Nether gecidi: Java'nin portal modeli 4 px kalin bir kutunun
            # yalniz iki genis yuzu (portal_ns / portal_ew); isik saciyor
            doku = dokular.bul("nether_portal")
            if doku is None:
                dokular.eksik.add(t)
                continue
            anahtar = (doku, None, GECIT_ISIK, True)
            for d in (6 * PX, 10 * PX):
                if s.get("portal_axis", "x") == "z":
                    q = [(d, 0, 1), (d, 1, 1), (d, 1, 0), (d, 0, 0)]
                    uvq = [(1 - e, c) for a, c, e in q]
                else:
                    q = [(0, 0, d), (0, 1, d), (1, 1, d), (1, 0, d)]
                    uvq = [(a, c) for a, c, e in q]
                ekle(anahtar, [(p[0] + a, p[1] + c, p[2] + e) for a, c, e in q], uvq)
            continue
        if sk in ("carpraz", "nilufer", "sarmasik"):
            doku, renk = dokular.yuz(t, "yan", s)
            if renk is not None and "renk" in b:
                renk = tuple(b["renk"])
            if t in ("wheat", "carrots", "potatoes", "beetroot"):
                evre = s.get("growth", 7)
                kok = {"wheat": "wheat_stage", "carrots": "carrots_stage", "potatoes": "potatoes_stage",
                       "beetroot": "beetroots_stage"}[t]
                en = 7 if t == "wheat" else 3
                doku = dokular.bul("%s%d" % (kok, min(en, evre if t == "wheat" else evre // 2)),
                                   "%s%d" % (kok, en)) or doku
            if t in ("red_flower",):
                doku = dokular.bul("poppy")
            if doku is None:
                continue
            anahtar = (doku, renk, 0.0, True)
            if sk == "nilufer":
                q = [(0, PX / 4, 0), (0, PX / 4, 1), (1, PX / 4, 1), (1, PX / 4, 0)]
                ekle(anahtar, [(p[0] + a, p[1] + c, p[2] + e) for a, c, e in q],
                     [_uv("u", a, c, e) for a, c, e in q])
                continue
            if sk == "sarmasik":
                for ad, (dx, dz) in (("east", (1, 0)), ("west", (-1, 0)), ("south", (0, 1)), ("north", (0, -1))):
                    bit = s.get("vine_direction_bits", 0)
                    i = {"south": 1, "west": 2, "north": 4, "east": 8}[ad]
                    if bit & i:
                        if dx:
                            xx = 1 - PX / 2 if dx > 0 else PX / 2
                            q = [(xx, 0, 0), (xx, 1, 0), (xx, 1, 1), (xx, 0, 1)]
                        else:
                            zz = 1 - PX / 2 if dz > 0 else PX / 2
                            q = [(0, 0, zz), (1, 0, zz), (1, 1, zz), (0, 1, zz)]
                        ekle(anahtar, [(p[0] + a, p[1] + c, p[2] + e) for a, c, e in q],
                             [(a if not dx else e, c) for a, c, e in q])
                continue
            for q in ([(0.15, 0, 0.15), (0.85, 0, 0.85), (0.85, 1, 0.85), (0.15, 1, 0.15)],
                      [(0.15, 0, 0.85), (0.85, 0, 0.15), (0.85, 1, 0.15), (0.15, 1, 0.85)]):
                ekle(anahtar, [(p[0] + a, p[1] + c, p[2] + e) for a, c, e in q],
                     [(0, 0), (1, 0), (1, 1), (0, 1)])
            continue
        if sk == "su":
            ust = komsu_tip(p, "u")
            if ust not in ("water", "flowing_water"):
                doku, renk = dokular.yuz(t, "ust", s)
                h = 14 * PX
                q = [(0, h, 0), (0, h, 1), (1, h, 1), (1, h, 0)]
                ekle((doku, renk, 0.0, True), [(p[0] + a, p[1] + c, p[2] + e) for a, c, e in q],
                     [_uv("u", a, c, e) for a, c, e in q])
            continue
        komsu = {}
        if sk == "bolme":
            for d in ("d", "b", "g", "k"):
                kt = komsu_tip(p, d)
                komsu[d] = bool(kt) and (sekil(kt) == "bolme" or opak_tam(kt))
        kutu_listesi = kutular(t, s, komsu)
        on = _on_yon(t, s)
        tam = opak_tam(t) and len(kutu_listesi) == 1
        saydam = any(k in t for k in OPAK_DEGIL) or sk in ("bolme", "kapi", "kapak", "merdiven", "mesale")
        for ki, kutu in enumerate(kutu_listesi):
            for yon, dortlu in _kutu_yuzleri(kutu).items():
                if tam:
                    kt = komsu_tip(p, yon)
                    if kt and (opak_tam(kt) or (kt == t and saydam)):
                        continue
                if yon == "u":
                    yuz = "ust"
                elif yon == "a":
                    yuz = "alt"
                elif YUZ_YON[yon] == on and t not in ("bookshelf",):
                    yuz = "on"
                else:
                    yuz = "yan"
                eksen = s.get("pillar_axis", "y") if (t.endswith("_log") or t.endswith("_wood")
                                                     or t == "hay_block") else "y"
                if eksen != "y":
                    # yatik kutuk: halkalar eksenin iki ucunda, kabuk geri kalan
                    # dort yuzde (eskiden eksen sorulmuyor, tarla cercevesinin
                    # ve kat kirislerinin ustunde halka gorunuyordu)
                    yuz = "ust" if yon in ({"x": ("d", "b"), "z": ("g", "k")}[eksen]) else "yan"
                if sk == "kapi":
                    kok = AD.get(t, t)
                    doku = dokular.bul(kok + ("_top" if s.get("upper_block_bit") else "_bottom"), kok)
                    renk = None
                    if doku is None:
                        dokular.eksik.add(t)
                elif sk == "kazan":
                    doku, renk = dokular.bul("cauldron_side"), None
                    if yon == "u":
                        doku = dokular.bul("cauldron_top")
                elif sk == "saksi":
                    doku, renk = dokular.bul("flower_pot"), None
                elif sk in ("fener", "mesale"):
                    doku, renk = dokular.bul(AD.get(t, t)), None
                elif sk == "merdiven":
                    doku, renk = dokular.bul("ladder"), None
                elif sk == "can":
                    doku, renk = dokular.bul("bell_top", "gold_block"), None
                elif sk == "sandik":
                    doku, renk = dokular.bul("barrel_side", "oak_planks"), None
                else:
                    doku, renk = dokular.yuz(t, yuz, s)
                    if renk is not None and "renk" in b:
                        renk = tuple(b["renk"])
                anahtar = (doku or "_eksik", renk, isik, saydam)
                uvler = [_uv(yon, a, c, e) for a, c, e in dortlu]
                if (eksen == "x" and yon in ("u", "a", "g", "k")) or (eksen == "z" and yon in ("d", "b")):
                    uvler = [(v, u) for u, v in uvler]        # kabuk lifi eksen boyunca
                if sk == "fener":
                    uvler = _bolge_uv(uvler, FENER_BOLGE[(min(ki, 1), "ust" if yon in ("u", "a") else "yan")],
                                      FENER_KARE)
                ekle(anahtar, [(p[0] + a, p[1] + c, p[2] + e) for a, c, e in dortlu], uvler)
                # kosul yonla soruluyor, yuzun adiyla degil: kuzey yuzu "on"
                # sayiliyor ve ilk yazista ortusuz kaliyordu
                if (t == "grass_block" and yon not in ("u", "a") and dokular.renk["cimen"] != CIMEN
                        and dokular.bul(CIMEN_ORTU)):
                    # Java'nin grass_block modeli iki kat: yan doku + ustune
                    # biyomla boyanan ortu. grass_block_side'in kendi saciagi
                    # OVA yesiliyle hazir boyali; bataklikta havuz kenarlarinda
                    # parlak cizgi oluyordu (onizlemede goruldu). Ortu ayni
                    # yuzun 0,003 blok onunde (ust uste binen yuzler Cycles'ta
                    # titrer). Ovada ortu yok: hanedanin orgusu degismedi.
                    dx, dy, dz = YONLER[yon]
                    o = 0.003
                    ortu_renk = tuple(b["renk"]) if "renk" in b else dokular.renk["cimen"]
                    ekle((CIMEN_ORTU, ortu_renk, 0.0, True),
                         [(p[0] + a + dx * o, p[1] + c + dy * o, p[2] + e + dz * o) for a, c, e in dortlu], uvler)
        if sk == "kazan":
            seviye = s.get("fill_level", 0)
            if seviye:
                h = (4 + 11 * seviye / 6.0) * PX
                q = [(2 * PX, h, 2 * PX), (2 * PX, h, 14 * PX), (14 * PX, h, 14 * PX), (14 * PX, h, 2 * PX)]
                ekle(("water_still", dokular.renk["su"], 0.0, True), [(p[0] + a, p[1] + c, p[2] + e) for a, c, e in q],
                     [_uv("u", a, c, e) for a, c, e in q])
        if sk == "saksi" and b.get("bitki"):
            doku = dokular.bul(b["bitki"])
            if doku:
                for q in ([(0.3, 4 * PX, 0.3), (0.7, 4 * PX, 0.7), (0.7, 0.75, 0.7), (0.3, 0.75, 0.3)],
                          [(0.3, 4 * PX, 0.7), (0.7, 4 * PX, 0.3), (0.7, 0.75, 0.3), (0.3, 0.75, 0.7)]):
                    ekle((doku, None, 0.0, True), [(p[0] + a, p[1] + c, p[2] + e) for a, c, e in q],
                         [(0, 0), (1, 0), (1, 1), (0, 1)])
    return cikti


def dondur(bloklar, ceyrek):
    """Yapiyi y ekseni etrafinda ceyrek x 90 derece cevir (ustten bakista
    saat yonunde: kuzey -> dogu). Yon durumlari da donuyor."""
    ceyrek %= 4
    if not ceyrek:
        return [dict(b) for b in bloklar]
    def nokta(x, z):
        for _ in range(ceyrek):
            x, z = -z, x
        return x, z
    def vek(v):
        x, z = v
        for _ in range(ceyrek):
            x, z = -z, x
        return (x, z)
    ters_b = {v: k for k, v in BASAMAK_YON.items()}
    ters_k = {v: k for k, v in KAPI_YON.items()}
    ters_c = {v: k for k, v in KARDINAL.items()}
    yeni = []
    for b in bloklar:
        x, y, z = b["p"]
        nx, nz = nokta(x, z)
        s = dict(b.get("s", {}))
        t = b["t"]
        if "weirdo_direction" in s:
            s["weirdo_direction"] = ters_b[vek(BASAMAK_YON[s["weirdo_direction"]])]
        if "direction" in s and (sekil(t) in ("kapi", "cit_kapisi", "yatak") or t.endswith("door")):
            s["direction"] = ters_k[vek(KAPI_YON[s["direction"] % 4])]
        elif "direction" in s and sekil(t) == "kapak":
            s["direction"] = ters_b[vek(BASAMAK_YON[s["direction"] % 4])]
        for anahtar in ("minecraft:cardinal_direction", "cardinal_direction"):
            if s.get(anahtar) in KARDINAL:
                s[anahtar] = ters_c[vek(KARDINAL[s[anahtar]])]
        baglar = {}
        for ad, v in KARDINAL.items():
            for on in ("connection_", "minecraft:connection_", "wall_connection_type_"):
                if on + ad in s:
                    baglar.setdefault(on, {})[ad] = s.pop(on + ad)
        for on, d in baglar.items():
            for ad, deger in d.items():
                s[on + ters_c[vek(KARDINAL[ad])]] = deger
        for eksen_ad in ("pillar_axis", "portal_axis"):
            if eksen_ad in s and ceyrek % 2 and s[eksen_ad] in ("x", "z"):
                s[eksen_ad] = "z" if s[eksen_ad] == "x" else "x"
        if "torch_facing_direction" in s and s["torch_facing_direction"] in KARDINAL:
            s["torch_facing_direction"] = ters_c[vek(KARDINAL[s["torch_facing_direction"]])]
        if "facing_direction" in s and s["facing_direction"] in (2, 3, 4, 5):
            v = {2: (0, -1), 3: (0, 1), 4: (-1, 0), 5: (1, 0)}[s["facing_direction"]]
            s["facing_direction"] = {(0, -1): 2, (0, 1): 3, (-1, 0): 4, (1, 0): 5}[vek(v)]
        if "vine_direction_bits" in s:
            bit = s["vine_direction_bits"]
            yb = 0
            for ad, i in (("south", 1), ("west", 2), ("north", 4), ("east", 8)):
                if bit & i:
                    yb |= {"south": 1, "west": 2, "north": 4, "east": 8}[ters_c[vek(KARDINAL[ad])]]
            s["vine_direction_bits"] = yb
        e = {"p": [nx, y, nz], "t": t}
        if s:
            e["s"] = s
        for anahtar in ("bitki", "renk"):
            if anahtar in b:
                e[anahtar] = b[anahtar]
        yeni.append(e)
    return yeni


def blender_ekle(bpy, ad, orguler, doku_malzemesi, doku_yolu):
    """orgu() ciktisini Blender'a doku basina bir nesne olarak koyar."""
    import os
    nesneler = []
    for (doku, renk, isik, saydam), c in orguler.items():
        if not c["f"]:
            continue
        me = bpy.data.meshes.new("%s_%s" % (ad, doku))
        me.from_pydata(c["v"], [], c["f"])
        lay = me.uv_layers.new()
        for j, d in enumerate(lay.data):
            d.uv = c["uv"][j]
        if doku == "_eksik":
            m = bpy.data.materials.get("_eksik_gri") or bpy.data.materials.new("_eksik_gri")
            m.use_nodes = True
            m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.5, 0.5, 0.5, 1)
        else:
            m = doku_malzemesi(os.path.join(doku_yolu, doku + ".png"), renk=renk, isik=isik)
        me.materials.append(m)
        ob = bpy.data.objects.new("%s_%s" % (ad, doku), me)
        bpy.context.scene.collection.objects.link(ob)
        nesneler.append(ob)
    return nesneler
