# -*- coding: utf-8 -*-
"""FiskHeroes kahraman dokularini 64x64 tek kaplamaya birlestirir.

TARIF UYDURULMUYOR: modun kendi models/heroes/<ad>.json dosyasi
  texture.renderLayer -> hangi render katmani hangi dokuyu kullanir
  showModel           -> hangi kemigi hangi katmanlar cizer
diyor. Biz de her KEMIGE dusen dokuyu o iki tablodan turetiyoruz.

Vanilla zirh cizim sirasi: LEGGINGS once, sonra HELMET/CHESTPLATE,
en uste BOOTS (bacaklarda). Kemik basina kural:
  head/headwear -> HELMET varsa onun dokusu, yoksa CHESTPLATE, yoksa default
  body/arms     -> CHESTPLATE, yoksa default
  legs          -> LEGGINGS (alt) + BOOTS (ust)
"""
import json, os, sys
from PIL import Image

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "jar/assets/fiskheroes")
DOKU = os.path.join(KOK, "textures/heroes")

# 64x64 deri duzeninde kemik -> kutular (ic katman + dis katman)
KEMIK_BOLGE = {
    "head":      [(0, 0, 32, 16)],
    "headwear":  [(32, 0, 64, 16)],
    "body":      [(16, 16, 40, 32), (16, 32, 40, 48)],
    "rightArm":  [(40, 16, 56, 32), (40, 32, 56, 48)],
    "leftArm":   [(32, 48, 48, 64), (48, 48, 64, 64)],
    "rightLeg":  [(0, 16, 16, 32), (0, 32, 16, 48)],
    "leftLeg":   [(16, 48, 32, 64), (0, 48, 16, 64)],
}
KATMANLAR = ["HELMET", "CHESTPLATE", "LEGGINGS", "BOOTS"]


def _dokuAdi(deger):
    """texture agacindaki bir dugumden doku ANAHTARINI cikarir.

    Dugum ya duz bir string, ya da kosullu bir agac
    ("wornChestplate", "vars:MASK_OPEN" gibi). Kosullu olanlarda
    VARSAYILAN dal aliniyor: oyuncu hicbir ozel kosulu saglamadan
    baktiginda ne goruyorsa o."""
    if isinstance(deger, str):
        return deger
    if isinstance(deger, dict):
        if "default" in deger:
            return _dokuAdi(deger["default"])
        # kosullu: ilk dali al (hepsi ayni katmani boyuyor)
        for v in deger.values():
            a = _dokuAdi(v)
            if a:
                return a
    return None


def katmanDokulari(model):
    """renderLayer -> doku anahtari (+ default)."""
    t = model.get("texture", {})
    varsayilan = _dokuAdi(t.get("default"))
    harita = {}
    rl = t.get("renderLayer", {})
    for k in KATMANLAR:
        if k in rl:
            harita[k] = _dokuAdi(rl[k])
    # "wornHelmet"/"wornChestplate" gibi ust dugumler: varsayilan
    # dalin disindakiler bir SART istiyor, atlaniyor.
    return harita, varsayilan


def kemikKatmanlari(model):
    """kemik -> [renderLayer, ...]. Yoksa hepsi cizer."""
    sm = model.get("showModel")
    if not sm:
        return {k: list(KATMANLAR) for k in KEMIK_BOLGE}
    out = {}
    for kemik in KEMIK_BOLGE:
        out[kemik] = sm.get(kemik, list(KATMANLAR))
    return out


def dokuAc(anahtar, cache):
    """fiskheroes:xxx -> textures/heroes/xxx.png"""
    if anahtar is None:
        return None
    if anahtar in cache:
        return cache[anahtar]
    ad = anahtar.split(":")[-1]
    if ad.endswith(".tx.json"):
        # dinamik doku (Palladium uretir) -- PNG'si yok
        cache[anahtar] = None
        return None
    yol = os.path.join(DOKU, ad + ".png")
    im = Image.open(yol).convert("RGBA") if os.path.exists(yol) else None
    cache[anahtar] = im
    return im


def kes(im, kutu):
    return im.crop(kutu)


def modelOku(ad):
    """Kahramanin modelini EBEVEYNIYLE BIRLIKTE okur.

    Kahramanlarin cogunda texture ve showModel BOS: ikisi de
    "parent": "fiskheroes:hero_basic" uzerinden geliyor. Ebeveyni
    cozmeden birlestirince dokular BOMBOS cikiyordu (olculdu:
    dort kahraman 0 piksel).

    Cocuk alanlari ebeveyni EZIYOR, bos olanlar ebeveynden
    aliniyor -- Fisk'in kendi kalitim kurali bu.               */"""
    yol = os.path.join(KOK, "models/heroes/%s.json" % ad)
    model = json.load(open(yol))
    ebeveyn = model.get("parent")
    if not ebeveyn:
        return model
    ust = modelOku(ebeveyn.split(":")[-1])
    birlesik = dict(ust)
    for k, v in model.items():
        if k == "parent":
            continue
        if isinstance(v, dict) and not v:
            continue          # bos sozluk = "ebeveyni kullan"
        if isinstance(v, dict) and isinstance(birlesik.get(k), dict):
            yeni = dict(birlesik[k])
            yeni.update(v)
            birlesik[k] = yeni
        else:
            birlesik[k] = v
    return birlesik


def birlestir(kahraman, ekIsik=True):
    model = modelOku(kahraman)
    kaynaklar = model.get("resources", {})
    katman, varsayilan = katmanDokulari(model)
    kemikler = kemikKatmanlari(model)
    cache = {}

    def doku(anahtar):
        if anahtar is None:
            return None
        # resources'taki takma addan gercek dokuya
        return dokuAc(kaynaklar.get(anahtar, anahtar), cache)

    sonuc = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    rapor = {}
    for kemik, kutular in KEMIK_BOLGE.items():
        cizen = kemikler.get(kemik, [])
        if kemik in ("head", "headwear"):
            sira = [k for k in ("CHESTPLATE", "HELMET") if k in cizen]
        elif kemik in ("body", "rightArm", "leftArm"):
            sira = [k for k in ("LEGGINGS", "CHESTPLATE") if k in cizen]
        else:                                   # bacaklar
            sira = [k for k in ("CHESTPLATE", "LEGGINGS", "BOOTS") if k in cizen]
        if not sira:
            sira = ["CHESTPLATE"]
        kullanilan = []
        for k in sira:
            anahtar = katman.get(k, varsayilan)
            im = doku(anahtar)
            if im is None:
                continue
            kullanilan.append("%s=%s" % (k, anahtar))
            for kutu in kutular:
                sonuc.alpha_composite(kes(im, kutu), (kutu[0], kutu[1]))
        rapor[kemik] = " ".join(kullanilan) or "YOK"

    # Isik katmani (emissive): Bedrock oyuncu modelinde parlama yok,
    # ama RENGI dogru olsun diye uste bindiriliyor. Parlamadigi
    # NOTLAR'da yaziyor -- uydurma degil, eksik.
    if ekIsik:
        for ad in ("lights",):
            im = doku(ad)
            if im is not None:
                sonuc.alpha_composite(im, (0, 0))
                rapor["lights"] = "bindirildi"
    return sonuc, rapor


if __name__ == "__main__":
    for ad in sys.argv[1:]:
        im, rapor = birlestir(ad)
        hedef = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "cikti", ad + ".png")
        im.save(hedef)
        dolu = sum(1 for p in im.getdata() if p[3] > 8)
        print("== %-22s %5d piksel -> %s" % (ad, dolu, hedef))
        for k, v in rapor.items():
            print("     %-10s %s" % (k, v))
