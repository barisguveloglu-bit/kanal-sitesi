# -*- coding: utf-8 -*-
"""HER ESYA GORUNUYOR MU: ENVANTERDE VE ELDE.                  v7.99.22

    python3 -B addon/arac/gorunum_denetle.py [--kok ADDON_KLASORU]

Kullanici: "elime aldigim zaman da almadigim zaman da envanterimde
gorunuyor mu, her esyaya bak." Ilk kosuda uc Ates (Heatblast) esyasinin
ikonu TAMAMEN SAYDAM cikti: envanterde de elde de gorunmuyorlardi ve
hicbir test bunu sormuyordu. test/ikon_atlas.mjs ikonun atlasta ve
diskte oldugunu, olcusunu soruyor; ICINDE bir sey olup olmadigini
sormuyordu.

Ne olcuyor:
  ENVANTER  her esyanin ikon anahtari atlasta, dosyasi diskte ve
            dosyada GORUNUR piksel var (alfa > 7).
  ELDE      attachable'i olan esya elde onunla cizilir: esyasi var,
            geometrisi, dokusu, render controller'i ve animasyonu
            tanimli, malzemesi bilinen bir malzeme, ve geometrinin
            en az bir kupu dokunun GORUNUR bir bolgesine dusuyor
            (yoksa model elde gorunmez). Attachable'i olmayan esya
            elde ikonuyla cizilir; onu ENVANTER maddesi kapsiyor.
  BLOK      malzeme dokusu terrain atlasinda ve diskte, saydam degil.
  YUMURTA   varligin yumurta ikonu atlasta.

Oyunun kendi dokulari (textures/items/..., textures/misc/...) bu
makinede yok; onlar sayilir ama dogrulanamaz, HATA sayilmaz.

Cikti: "HATA : <n>" satiri (test/esya_gorunum.mjs okuyor), cikis kodu
n > 0 ise 1.
"""
import argparse
import collections
import glob
import json
import math
import os
import re
import sys

sys.dont_write_bytecode = True

try:
    from PIL import Image
except ImportError:
    print("HATA : -1  (PIL yok: dokular olculemez)")
    sys.exit(2)

OYUN_RC = {
    "controller.render.item_default", "controller.render.armor", "controller.render.default",
    "controller.render.bow", "controller.render.trident", "controller.render.shield",
    "controller.render.crossbow", "controller.render.spyglass",
}
OYUN_MALZEME = {
    "entity", "entity_alphatest", "entity_alphablend", "entity_emissive", "entity_emissive_alpha",
    "entity_emissive_alpha_one_sided", "entity_alphatest_one_sided", "entity_nocull",
    "entity_change_color", "entity_alphatest_change_color", "entity_alphatest_glint",
    "entity_alphatest_glint_item", "entity_glint", "armor", "armor_enchanted", "armor_leather",
    "armor_leather_enchanted", "entity_beam", "entity_beam_additive", "entity_custom",
    "item_in_hand", "item_in_hand_glint", "charged_creeper", "entity_change_color_glint",
    "entity_alphatest_change_color_glint", "banner",
}
OYUN_GEO_ONEK = ("geometry.humanoid", "geometry.player.armor", "geometry.item_sprite")
OYUN_ANIM_ONEK = ("animation.player.", "animation.humanoid.", "controller.animation.player",
                  "animation.item.")
OYUN_DOKU_ONEK = ("textures/items/", "textures/blocks/", "textures/misc/", "textures/entity/")
GORUNUR_ALFA = 8          # alfa >= 8: oyunda cizilen piksel


def oku(yol):
    metin = open(yol, encoding="utf-8").read()
    return json.loads(re.sub(r"^\s*//.*$", "", metin, flags=re.M))


class Denetim:
    def __init__(self, kok):
        self.bp = os.path.join(kok, "Simsek_TNT_ToprakTopu")
        self.rp = os.path.join(kok, "Simsek_Kol_Kaynak")
        self.hata = collections.defaultdict(list)
        self.bilgi = collections.defaultdict(list)
        self.sayac = collections.Counter()
        self._oran = {}

    # ---- yardimcilar ----
    def dosya(self, yol_kok):
        for uz in (".png", ".tga"):
            p = os.path.join(self.rp, yol_kok + uz)
            if os.path.exists(p):
                return p
        return None

    def gorunur(self, p, kutu=None):
        """Gorunur piksel orani; kutu disari tasiyorsa kirpilir."""
        anahtar = (p, kutu)
        if anahtar not in self._oran:
            im = Image.open(p).convert("RGBA")
            if kutu:
                x0, y0, x1, y1 = (max(0, min(d, b)) for d, b in
                                  zip(kutu, (im.width, im.height, im.width, im.height)))
                im = im.crop((x0, y0, x1, y1)) if x1 > x0 and y1 > y0 else None
            if im is None:
                self._oran[anahtar] = 0.0
            else:
                h = im.getchannel("A").histogram()
                self._oran[anahtar] = sum(h[GORUNUR_ALFA:]) / max(1, sum(h))
        return self._oran[anahtar]

    @staticmethod
    def doku_yolu(kayit):
        t = kayit["textures"]
        t = t[0] if isinstance(t, list) else t
        return t["path"] if isinstance(t, dict) else t

    # ---- 1. envanter ikonlari ----
    def ikonlar(self):
        self.itex = oku(os.path.join(self.rp, "textures", "item_texture.json"))["texture_data"]
        self.esyalar = {}
        for y in sorted(glob.glob(os.path.join(self.bp, "items", "*.json"))):
            d = oku(y)["minecraft:item"]
            kim = d["description"]["identifier"]
            ik = d.get("components", {}).get("minecraft:icon")
            if isinstance(ik, dict):
                ik = (ik.get("textures") or {}).get("default") or ik.get("texture")
            self.esyalar[kim] = ik
            self.sayac["esya"] += 1
            if not ik:
                self.hata["ikon yok"].append(kim)
            elif ik not in self.itex:
                self.hata["ikon anahtari atlasta yok"].append("%s -> %s" % (kim, ik))
            else:
                yol = self.doku_yolu(self.itex[ik])
                p = self.dosya(yol)
                if p is None:
                    if yol.startswith(OYUN_DOKU_ONEK):
                        self.bilgi["ikon oyunun kendi dokusu"].append("%s -> %s" % (kim, yol))
                    else:
                        self.hata["ikon dosyasi yok"].append("%s -> %s" % (kim, yol))
                elif self.gorunur(p) == 0:
                    self.hata["ikon TAMAMEN SAYDAM (envanterde ve elde gorunmez)"].append(
                        "%s -> %s" % (kim, os.path.relpath(p, self.rp)))
                else:
                    self.sayac["ikon gorunur"] += 1

    # ---- 2. elde: attachable'lar ----
    def kaynaklar(self):
        self.geolar = {}
        for y in glob.glob(os.path.join(self.rp, "models", "**", "*.json"), recursive=True):
            d = oku(y)
            for g in d.get("minecraft:geometry", []):
                ds = g.get("description", {})
                self.geolar[ds.get("identifier")] = (g, ds.get("texture_width", 64),
                                                     ds.get("texture_height", 64))
            for k, v in d.items():
                if k.startswith("geometry."):
                    self.geolar[k.split(":")[0]] = (v, v.get("texturewidth", 64),
                                                    v.get("textureheight", 64))
        self.rcler = {}
        for y in glob.glob(os.path.join(self.rp, "render_controllers", "*.json")):
            self.rcler.update(oku(y).get("render_controllers", {}))
        self.animler = set()
        for y in (glob.glob(os.path.join(self.rp, "animations", "*.json")) +
                  glob.glob(os.path.join(self.rp, "animation_controllers", "*.json"))):
            d = oku(y)
            self.animler.update(d.get("animations", {}))
            self.animler.update(d.get("animation_controllers", {}))

    @staticmethod
    def kup_bolgeleri(kup):
        """Kupun dokuda kapladigi dikdortgenler (geometri pikseliyle)."""
        uv = kup.get("uv")
        if isinstance(uv, list):
            w, h, d = (math.floor(abs(x)) for x in kup.get("size", [0, 0, 0]))
            return [(uv[0], uv[1], uv[0] + 2 * (d + w), uv[1] + d + h)] if w + d > 0 else []
        bolgeler = []
        for yuz in (uv or {}).values():
            if isinstance(yuz, dict) and "uv" in yuz:
                (u, v), (us, vs) = yuz["uv"], yuz.get("uv_size", [0, 0])
                bolgeler.append((min(u, u + us), min(v, v + vs), max(u, u + us), max(v, v + vs)))
        return bolgeler

    def geometri_gorunur_mu(self, gid, doku):
        g, tw, th = self.geolar[gid]
        kupler = [c for b in g.get("bones", []) for c in (b.get("cubes") or [])]
        if not kupler:
            return "hic kup yok"
        im = Image.open(doku)
        sx, sy = im.width / tw, im.height / th
        for c in kupler:
            for (u0, v0, u1, v1) in self.kup_bolgeleri(c):
                x0, y0 = int(u0 * sx), int(v0 * sy)
                kutu = (x0, y0, max(x0 + 1, int(round(u1 * sx))), max(y0 + 1, int(round(v1 * sy))))
                if self.gorunur(doku, kutu) > 0:
                    return None
        return "butun kuplerin doku bolgesi saydam"

    def attachablelar(self):
        sahip = collections.defaultdict(list)
        for y in sorted(glob.glob(os.path.join(self.rp, "attachables", "**", "*.json"), recursive=True)):
            ad = os.path.relpath(y, self.rp)
            try:
                d = oku(y)["minecraft:attachable"]["description"]
            except (KeyError, ValueError) as e:
                self.hata["attachable okunamadi"].append("%s: %s" % (ad, str(e)[:80]))
                continue
            self.sayac["attachable"] += 1
            kim = d.get("identifier", "?")
            sahip[kim].append(ad)
            if kim not in self.esyalar and not kim.startswith("minecraft:"):
                self.hata["attachable'in esyasi yok"].append("%s -> %s" % (ad, kim))
            dokular = {}
            for k, p in (d.get("textures") or {}).items():
                f = self.dosya(p)
                if f:
                    dokular[k] = f
                elif p.startswith(OYUN_DOKU_ONEK) and not os.path.isdir(os.path.join(self.rp, os.path.dirname(p))):
                    self.sayac["oyunun dokusu (dogrulanamaz)"] += 1
                else:
                    self.hata["attachable dokusu yok"].append("%s -> %s=%s" % (ad, k, p))
            for k, gid in (d.get("geometry") or {}).items():
                if gid not in self.geolar and not gid.startswith(OYUN_GEO_ONEK):
                    self.hata["attachable geometrisi yok"].append("%s -> %s=%s" % (ad, k, gid))
            for k, m in (d.get("materials") or {}).items():
                if m not in OYUN_MALZEME:
                    self.hata["bilinmeyen malzeme (oyunda yoksa model cizilmez)"].append(
                        "%s -> %s=%s" % (ad, k, m))
            rcs = [next(iter(r)) if isinstance(r, dict) else r for r in d.get("render_controllers", [])]
            if not rcs:
                self.hata["render controller yok"].append(ad)
            for r in rcs:
                if r in self.rcler:
                    self.rc_anahtarlari(ad, r, d)
                elif r not in OYUN_RC:
                    self.hata["render controller tanimsiz"].append("%s -> %s" % (ad, r))
            for k, an in (d.get("animations") or {}).items():
                if an not in self.animler and not an.startswith(OYUN_ANIM_ONEK):
                    self.hata["attachable animasyonu yok"].append("%s -> %s=%s" % (ad, k, an))
            if dokular:
                ilk = dokular.get("default") or next(iter(dokular.values()))
                for k, gid in (d.get("geometry") or {}).items():
                    if gid in self.geolar:
                        sebep = self.geometri_gorunur_mu(gid, dokular.get(k, ilk))
                        if sebep:
                            self.hata["ELDE GORUNMEZ"].append("%s -> %s: %s" % (ad, gid, sebep))
                        else:
                            self.sayac["elde gorunur olculen"] += 1
        for kim, liste in sahip.items():
            if len(liste) > 1:
                self.hata["ayni esyaya birden cok attachable"].append("%s: %s" % (kim, ", ".join(liste)))
        self.sahip = sahip

    def rc_anahtarlari(self, ad, r, d):
        rc = self.rcler[r]
        bolum = {"Geometry": "geometry", "Texture": "textures", "Material": "materials"}
        diziler = set()
        for tur in ("textures", "geometries", "materials"):
            for dizi, liste in ((rc.get("arrays") or {}).get(tur) or {}).items():
                diziler.add(dizi)
                for x in liste:
                    on, kk = x.split(".", 1)
                    if kk not in (d.get(bolum.get(on, "")) or {}):
                        self.hata["render controller tanimsiz anahtar istiyor"].append(
                            "%s -> %s: %s" % (ad, r, x))
        metin = json.dumps({k: v for k, v in rc.items() if k != "arrays"})
        for on, b in bolum.items():
            for kk in re.findall(on + r"\.(\w+)", metin):
                if kk not in (d.get(b) or {}):
                    self.hata["render controller tanimsiz anahtar istiyor"].append(
                        "%s -> %s: %s.%s" % (ad, r, on, kk))

    # ---- 3. bloklar ve yumurtalar ----
    def bloklar(self):
        ttex = oku(os.path.join(self.rp, "textures", "terrain_texture.json"))["texture_data"]
        for y in sorted(glob.glob(os.path.join(self.bp, "blocks", "*.json"))):
            b = oku(y)["minecraft:block"]
            kim = b["description"]["identifier"]
            self.sayac["blok"] += 1
            for c in [b.get("components", {})] + [p.get("components", {}) for p in b.get("permutations", [])]:
                for yuz, m in (c.get("minecraft:material_instances") or {}).items():
                    t = m.get("texture")
                    if not t:
                        continue
                    if t not in ttex:
                        self.hata["blok dokusu terrain atlasinda yok"].append("%s %s -> %s" % (kim, yuz, t))
                        continue
                    p = self.dosya(self.doku_yolu(ttex[t]))
                    if p is None:
                        self.hata["blok doku dosyasi yok"].append("%s -> %s" % (kim, self.doku_yolu(ttex[t])))
                    elif self.gorunur(p) == 0:
                        self.hata["blok dokusu TAMAMEN SAYDAM"].append("%s -> %s" % (kim, t))
                g = c.get("minecraft:geometry")
                gid = g if isinstance(g, str) else (g or {}).get("identifier")
                if gid and gid not in self.geolar and not gid.startswith("minecraft:geometry"):
                    self.hata["blok geometrisi yok"].append("%s -> %s" % (kim, gid))
        for y in glob.glob(os.path.join(self.rp, "entity", "*.json")):
            ds = oku(y).get("minecraft:client_entity", {}).get("description", {})
            se = ds.get("spawn_egg") or {}
            if "texture" in se and se["texture"] not in self.itex:
                self.hata["yumurta ikonu atlasta yok"].append("%s -> %s" % (ds.get("identifier"), se["texture"]))

    def rapor(self):
        n = sum(len(v) for v in self.hata.values())
        a = self.sayac
        print("esya: %d · ikonu gorunur: %d" % (a["esya"], a["ikon gorunur"]))
        print("attachable: %d · elde gorunurlugu olculen: %d · attachable'siz (elde ikonuyla): %d"
              % (a["attachable"], a["elde gorunur olculen"],
                 sum(1 for k in self.esyalar if k not in self.sahip)))
        print("blok: %d · oyunun kendi dokusu (dogrulanamaz): %d"
              % (a["blok"], a["oyunun dokusu (dogrulanamaz)"] + sum(len(v) for v in self.bilgi.values())))
        for tur in sorted(self.hata):
            print("\n## %s (%d)" % (tur, len(self.hata[tur])))
            for m in self.hata[tur][:20]:
                print("  " + m)
            if len(self.hata[tur]) > 20:
                print("  ... +%d" % (len(self.hata[tur]) - 20))
        print("HATA : %d" % n)
        return n


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--kok", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    a = p.parse_args()
    d = Denetim(os.path.abspath(a.kok))
    d.ikonlar()
    d.kaynaklar()
    d.attachablelar()
    d.bloklar()
    return 1 if d.rapor() else 0


if __name__ == "__main__":
    sys.exit(main())
