# -*- coding: utf-8 -*-
"""BIRLESMIS TEKNOLOJI: Blockbuster pozu + bizim Bedrock uzvumuz.

Kullanici: "ikisini de birlikte kullan, yani birlesmis
teknoloji gibi bir sey yap."

Burada olan sey:
  - iskelet ve POZ  -> Blockbuster'in kendi model.json'undan
  - kollar          -> BIZIM `geometry.simsek_kol_kanli`imiz
  - deri            -> oyuncunun kendi skini
  - kanli kol dokusu-> kaynagin kendi 256x256 dokusu
Hepsi TEK sahnede, TEK cizicide, dogru derinlik siralamasiyla.

Bunun calismasi bir sey KANITLIYOR: Blockbuster'in poz verisi
ile Bedrock'in kemik verisi ayni uzayda bulusabiliyor. Yani
kaynaktan bir poz alip bizim modele takmak bir cevrim
meselesi, yeniden cizim meselesi degil.
"""
import json
import ciz_bb, ciz_kemik as ck
from PIL import Image, ImageEnhance, ImageDraw

import os, sys
KOK = os.path.dirname(os.path.abspath(__file__)) + "/"
# Blockbuster modelinin yolu ARGUMAN: jar depoda durmuyor
# (20 MB ve GPL-3.0 baska bir eserin ikilisi). Kullanici
# jar'i actigi yeri veriyor.
BB = sys.argv[1] if len(sys.argv) > 1 else None


def kanli_kemikleri(sag_ebeveyn, sol_ebeveyn, sag_pivot, sol_pivot):
    """Bizim kanli kolu, verilen kemiklerin COCUGU yapar.

    Kaynagin kok kemikleri `rightArm`/`leftArm` pivot
    [-5,22,0]/[5,22,0]. Blockbuster'in steve'inde kol pivotu
    x=-6/+6 -- bir birim disarida (kaynagin kendi tercihi,
    hata degil). Kok kemikleri ATMIYORUZ, sadece ebeveyn
    veriyoruz: pivot farki bir birim ve kolu koparmiyor,
    kupleri kaydirmak ise modeli DEGISTIRMEK olurdu.        """
    g = json.load(open(KOK + "Simsek_Kol_Kaynak/models/entity/"
                       "simsek_kol_kanli.geo.json"))
    kemikler = [dict(b) for b in g["minecraft:geometry"][0]["bones"]]
    for b in kemikler:
        if b["name"] == "rightArm":
            b["name"] = "kanli_sag"; b["parent"] = sag_ebeveyn
        elif b["name"] == "leftArm":
            b["name"] = "kanli_sol"; b["parent"] = sol_ebeveyn
        elif b.get("parent") == "rightArm":
            b["parent"] = "kanli_sag"
        elif b.get("parent") == "leftArm":
            b["parent"] = "kanli_sol"
    return kemikler


def sahne(poz, aci=35, SC=8):
    m = ciz_bb.bb_yukle(BB)
    m["texture"] = [64, 64]                 # bizim deri modern duzen
    kemikler = ciz_bb.bb_kemikleri(m, poz, gizle=("anchor",))
    kemikler += kanli_kemikleri("right_arm", "left_arm",
                                [-5, 22, 0], [5, 22, 0])
    deri = ImageEnhance.Brightness(
        Image.open(KOK + "Simsek_Skin/uzak_akraba.png").convert("RGBA")
    ).enhance(3.0)
    kan = Image.open(KOK + "Simsek_Kol_Kaynak/textures/entity/"
                     "kol_kanli.png").convert("RGBA")
    return ck.ciz(kemikler, 64, 64, deri, None, aci, SC=SC,
                  dokular={"kanli_sag": (kan, 32, 32),
                           "kanli_sol": (kan, 32, 32)})


if __name__ == "__main__":
    if not BB:
        print("kullanim: python3 birlestir.py <blockbuster model.json>")
        raise SystemExit(2)
    POZ = ["standing", "sneaking", "t_pose", "dabbing", "riding"]
    kutu = []
    for p in POZ:
        im = sahne(p)
        o = Image.new("RGB", (im.width, im.height + 16), (46, 44, 52))
        o.paste(im, (0, 16))
        ImageDraw.Draw(o).text((5, 3), "Blockbuster poz: " + p,
                               fill=(235, 225, 225))
        kutu.append(o)
    W = sum(i.width + 8 for i in kutu); H = max(i.height for i in kutu)
    o = Image.new("RGB", (W, H), (16, 16, 22)); x = 0
    for i in kutu:
        o.paste(i, (x, H - i.height)); x += i.width + 8
    o.save("birlesik.png")
    print("birlesik.png", o.size)
