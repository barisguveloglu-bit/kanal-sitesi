# -*- coding: utf-8 -*-
"""HAZIR DUNYA DOSYASINI GERCEK MOTORDA AC, ZEMINI YOKLA.       v7.99.18

    python3 addon/sunucu/dunya_dene.py --hedef KLASOR

`Simsek_v*_Efsane_Dunyasi.mctemplate` v7.85'ten beri uretiliyor ve
"oyunda denenemiyor" diye yalniz yazilip geri okunarak dogrulaniyordu.
Ilk gercek acilista (2026-11-11) dunya ZEMINSIZ cikti: yeni dunya
biciminde tek katli duz katman listesi hic blok uretmiyor. level.dat
gecerliydi, geri okunuyordu, testler yesildi -- yalniz dunya yoktu.

Ne yapiyor:
  1. Sablonu deneme sunucusunda GECICI bir dunya klasorune acar
     (worlds/_dunya_deneme), server.properties'te yalniz level-name'i
     degistirir. Var olan dunyalara dokunmaz.
  2. Sunucuyu acar, dogum noktasinin oldugu bolgeyi yukler ve sorar:
     dogum noktasinin ALTI bedrock mu, dogum noktasi ve ustu hava mi,
     zeminin alti bos mu, uzak bir noktada da ayni mi.
  3. Kapatir; server.properties'i geri yazar, gecici dunyayi siler.

Cikis kodu: 0 dunya tasarlandigi gibi; 1 acilmadi ya da zemin yanlis.
"""
import argparse
import glob
import os
import re
import shutil
import sys
import time
import zipfile

BURASI = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.dirname(BURASI)
sys.dont_write_bytecode = True
sys.path.insert(0, BURASI)
sys.path.insert(0, os.path.join(ADDON, "arac"))
from konsol import Konsol, sade, calisiyor_mu  # noqa: E402
import nbt  # noqa: E402

GECICI = "_dunya_deneme"


def sablon_bul():
    liste = sorted(glob.glob(os.path.join(ADDON, "Simsek_v*_Efsane_Dunyasi.mctemplate")))
    if len(liste) != 1:
        raise SystemExit("HATA: tam bir sablon bekleniyordu, %d bulundu. Once paketle.sh." % len(liste))
    return liste[0]


def yoklamalar(dogum):
    """(komut, aciklama) listesi. Dogum noktasi level.dat'tan okunur."""
    x, y, z = dogum
    uzak = (x + 12, z + 12)          # ayni yuklu bolgenin obur ucu
    return [
        ("testforblock %d %d %d bedrock" % (x, y - 1, z), "dogum noktasinin alti bedrock"),
        ("testforblock %d %d %d air" % (x, y, z), "dogum noktasi hava"),
        ("testforblock %d %d %d air" % (x, y + 1, z), "dogum noktasinin ustu hava"),
        ("testforblock %d %d %d air" % (x, y - 2, z), "zeminin alti bos (tek kat)"),
        ("testforblock %d %d %d bedrock" % (uzak[0], y - 1, uzak[1]), "uzakta da zemin bedrock"),
        ("testforblock %d %d %d air" % (uzak[0], y, uzak[1]), "uzakta da ustu hava"),
    ]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--hedef", default=os.environ.get("SUNUCU_KOK",
                                                     os.path.expanduser("~/simsek_sunucu")))
    a = p.parse_args()
    kok = os.path.abspath(a.hedef)
    if calisiyor_mu(kok):
        print("HATA: sunucu su an calisiyor; once konsolda stop.")
        return 1
    sablon = sablon_bul()
    dunya = os.path.join(kok, "worlds", GECICI)
    ayar = os.path.join(kok, "server.properties")
    eski_ayar = open(ayar, encoding="utf-8").read()
    if not re.search(r"(?m)^level-name=", eski_ayar):
        print("HATA: server.properties'te level-name yok.")
        return 1

    hatalar, satirlar = [], []
    shutil.rmtree(dunya, ignore_errors=True)
    os.makedirs(dunya)
    try:
        zipfile.ZipFile(sablon).extractall(dunya)
        d = nbt.level_dat_oku(open(os.path.join(dunya, "level.dat"), "rb").read())[1]
        dogum = (d["SpawnX"].deger, d["SpawnY"].deger, d["SpawnZ"].deger)
        open(ayar, "w", encoding="utf-8").write(
            re.sub(r"(?m)^level-name=.*$", "level-name=" + GECICI, eski_ayar))
        with Konsol(kok) as k:
            if not k.bekle("Server started.", 240):
                hatalar.append("sunucu acilmadi")
            else:
                time.sleep(3)
                x, _, z = dogum
                k.komut("tickingarea add %d 0 %d %d 0 %d dunya_deneme true"
                        % (x, z, x + 15, z + 15), sure=8)
                for komut, ne in yoklamalar(dogum):
                    cevap = []
                    for _ in range(40):          # bolge yuklenene kadar
                        cevap = k.komut(komut, sure=5)
                        if any("Successfully found" in s or "expected" in s for s in cevap):
                            break
                        time.sleep(0.5)
                    tamam = any("Successfully found the block" in s for s in cevap)
                    print("  %s %s" % ("+" if tamam else "x", ne))
                    if not tamam:
                        hatalar.append("%s: %s" % (ne, " | ".join(sade(s) for s in cevap)[:140]))
            satirlar = list(k.satirlar)
    finally:
        open(ayar, "w", encoding="utf-8").write(eski_ayar)
        shutil.rmtree(dunya, ignore_errors=True)

    print("sablon: %s" % os.path.basename(sablon))
    print("dogum noktasi: %d %d %d" % dogum)
    if not any("Level Name: " + GECICI in s for s in satirlar):
        hatalar.append("sunucu gecici dunyayi acmadi")
    for h in hatalar:
        print("HATA: " + h)
    print("dunya: %s" % ("TASARLANDIGI GIBI" if not hatalar else "BOZUK"))
    return 1 if hatalar else 0


if __name__ == "__main__":
    sys.exit(main())
