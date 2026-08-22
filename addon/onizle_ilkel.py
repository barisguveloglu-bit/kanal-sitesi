"""Ilkel Besli eslestirme tablosu.

Her uyenin ATANMIS skinini oyuncu skin duzeninden on gorunume
cevirip, adi ve rutbesiyle birlikte tek bir tabloda ciziyor.
Amac: kullanicinin oyuna girmeden "3. yanlis" diyebilmesi.

Skin duzeni (64x64, vanilla):
  kafa on   (8,8)   8x8      sapka on  (40,8)   8x8
  govde on  (20,20) 8x12     ceket on  (20,36)  8x12
  sag kol   (44,20) 4x12     ust katman (44,36) 4x12
  sol kol   (36,52) 4x12     ust katman (52,52) 4x12
  sag bacak (4,20)  4x12     ust katman (4,36)  4x12
  sol bacak (20,52) 4x12     ust katman (4,52)  4x12
"""
from PIL import Image, ImageDraw, ImageFont
import os, json, re

RP = "/home/user/kanal-sitesi/addon/Simsek_Kol_Kaynak"
AYAR = "/home/user/kanal-sitesi/addon/Simsek_TNT_ToprakTopu/scripts/ayarlar.js"

def uyeler():
    """ayarlar.js'ten rutbe + ad oku. Elle yazmak, kodla
    ayrismaya davetiye cikarirdi."""
    metin = open(AYAR, encoding="utf-8").read()
    blok = metin[metin.index("export const ILKEL_BESLI"):]
    blok = blok[:blok.index("\n]);")]
    bulunan = {}
    for parca in re.finditer(
            r'\["(\w+)",\s*\{\s*ad:\s*"([^"]+)".*?rutbe:\s*(\d+),\s*unvan:\s*"([^"]+)"',
            blok, re.S):
        anahtar, ad, rutbe, unvan = parca.groups()
        bulunan[anahtar] = (int(rutbe), ad, unvan)
    return bulunan

def on_gorunum(skin):
    """64x64 skinden 16x32 on gorunum."""
    tuval = Image.new("RGBA", (16, 32), (0, 0, 0, 0))
    def koy(kaynak, hedef, katman=None):
        tuval.alpha_composite(skin.crop(kaynak), hedef)
        if katman:
            tuval.alpha_composite(skin.crop(katman), hedef)
    koy((8, 8, 16, 16),   (4, 0),  (40, 8, 48, 16))     # kafa
    koy((20, 20, 28, 32), (4, 8),  (20, 36, 28, 48))    # govde
    koy((44, 20, 48, 32), (0, 8),  (44, 36, 48, 48))    # sag kol
    koy((36, 52, 40, 64), (12, 8), (52, 52, 56, 64))    # sol kol
    koy((4, 20, 8, 32),   (4, 20), (4, 36, 8, 48))      # sag bacak
    koy((20, 52, 24, 64), (8, 20), (4, 52, 8, 64))      # sol bacak
    return tuval

def yaz(cizim, xy, metin, font, renk):
    cizim.text(xy, metin, font=font, fill=renk)

def main():
    liste = sorted(uyeler().items(), key=lambda x: x[1][0])
    OLCEK, GENIS, YUKSEK = 7, 150, 400
    tuval = Image.new("RGB", (GENIS * len(liste), YUKSEK), (26, 26, 32))
    cizim = ImageDraw.Draw(tuval)
    F = "/usr/share/fonts/truetype/dejavu/DejaVuSans"
    baslik = ImageFont.truetype(F + "-Bold.ttf", 19)
    kucuk = ImageFont.truetype(F + ".ttf", 13)
    mini = ImageFont.truetype(F + ".ttf", 11)

    ONAYLI = {"harkos"}

    for i, (anahtar, (rutbe, ad, unvan)) in enumerate(liste):
        x0 = i * GENIS
        if i % 2:
            cizim.rectangle([x0, 0, x0 + GENIS, YUKSEK], fill=(32, 32, 40))

        skin = Image.open(os.path.join(
            RP, "textures/entity/ilkel_%s.png" % anahtar)).convert("RGBA")
        figur = on_gorunum(skin).resize(
            (16 * OLCEK, 32 * OLCEK), Image.NEAREST)
        tuval.paste(figur, (x0 + (GENIS - 16 * OLCEK) // 2, 90), figur)

        yaz(cizim, (x0 + 12, 18), "%d" % rutbe, baslik, (232, 176, 64))
        yaz(cizim, (x0 + 34, 22), unvan, mini, (150, 150, 160))
        # Ad iki satira sigsin
        kisa = ad.replace("İlkel ", "")
        yaz(cizim, (x0 + 12, 44), kisa, kucuk, (240, 240, 245))

        onay = anahtar in ONAYLI
        yaz(cizim, (x0 + 12, 340),
            "ONAYLI" if onay else "? tahmin",
            kucuk, (120, 220, 120) if onay else (230, 170, 70))
        yaz(cizim, (x0 + 12, 362), "dosya: %s" % anahtar, mini, (110, 110, 120))

    yol = "/tmp/claude-0/-home-user-kanal-sitesi/e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/ilkel_eslestirme.png"
    tuval.save(yol)
    print("yazildi:", yol, tuval.size)

main()
