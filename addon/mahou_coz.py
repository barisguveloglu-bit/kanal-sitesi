#!/usr/bin/env python3
"""Mahou Tsukai -> depo kaynagi.                            (v5.4)

Kullanici: "bir tane daha mod buldum bunu da ekle aynı şekilde."

---- KAYNAK ----
mahoutsukai 1.21.1 v1.36.27 (Forge/NeoForge jar). Sayilarin
tamami modun KENDI YAPILANDIRMASINDAN:
    stepsword/mahoutsukai/config/MTConfig$Server.class
Bu sinif 448 ayari `intconfig/doubleconfig/booleanconfig`
cagrilariyla tanimliyor; bu betik bytecode'u okuyup her ayarin
VARSAYILAN degerini cikariyor.

Kullanim:
    python3 mahou_coz.py <acilmis_jar_klasoru>

Uretilenler:
    kaynak_doku/mahou/*.png     esya ikonlari (modun kendi pikselleri)
    mahou_config.json           448 ayarin varsayilanlari

Ayarlar.js'teki MAHOU_* tablolari bu JSON'a bakarak ELLE
yazildi ve test onlari buradan geri okuyup karsilastiriyor --
"hafizadan yazdim" ihtimali sinanabilir kalsin.
"""
import json
import os
import re
import shutil
import subprocess
import sys

KOK = os.path.dirname(os.path.abspath(__file__))
DOKU_HEDEF = os.path.join(KOK, "kaynak_doku", "mahou")
CONFIG_HEDEF = os.path.join(KOK, "mahou_config.json")

# Alinan ikonlar. Modun 63 doku dosyasi var; bize aktarilan
# esyalarin ikonlari lazim, otekiler (blok, parcacik, rehber
# sayfalari) DEGIL.
IKONLAR = [
    "caliburn", "clarent", "morgan", "nobu", "rule_breaker",
    "rhongomyniad", "theripper", "william", "staff_emrys",
    "mystic_staff", "spatial_staff", "dagger", "hammer",
    "treasury_projection_gauntlet", "spell_scroll", "kodoku",
    "attuned_diamond", "attuned_emerald",
]


def sayi(s):
    """Bytecode satirindan sabit deger."""
    m = re.search(r"//\s+(?:int|float|double|long)\s+(-?[\d.E+-]+)[dfl]?\s*$", s)
    if m:
        return m.group(1)
    m = re.search(r"\biconst_(m?\d)\b", s)
    if m:
        return m.group(1).replace("m", "-")
    m = re.search(r"\b(?:bipush|sipush)\s+(-?\d+)", s)
    if m:
        return m.group(1)
    m = re.search(r"\b[dfl]const_(\d)\b", s)
    if m:
        return m.group(1)
    return None


def config_coz(kaynak):
    """MTConfig$Server bytecode'undan ad -> varsayilan.

    Kalip: ldc "AD" · varsayilan · min · max · invokestatic
    <tur>config. Varsayilan, ADI izleyen ILK sabit.          """
    sinif = os.path.join(kaynak,
                         "stepsword/mahoutsukai/config/MTConfig$Server.class")
    if not os.path.exists(sinif):
        sys.exit("MTConfig$Server.class yok: " + sinif)
    cikti = subprocess.run(["javap", "-p", "-c", sinif],
                           capture_output=True, text=True).stdout
    satirlar = cikti.split("\n")
    kayit = {}
    for i, s in enumerate(satirlar):
        m = re.search(r'ldc\w*\s+#\d+\s+// String ([A-Z][A-Z0-9_]{3,})\s*$', s)
        if not m:
            continue
        ad = m.group(1)
        degerler = []
        for j in range(i + 1, min(i + 8, len(satirlar))):
            if "invokestatic" in satirlar[j] and "config:" in satirlar[j]:
                tur = re.search(r"\.(\w+config):", satirlar[j])
                kayit[ad] = {
                    "varsayilan": degerler[0] if degerler else None,
                    "tur": tur.group(1) if tur else "?",
                }
                break
            d = sayi(satirlar[j])
            if d is not None:
                degerler.append(d)
    return kayit


def dokular(kaynak):
    kok = os.path.join(kaynak, "assets/mahoutsukai/textures/item")
    os.makedirs(DOKU_HEDEF, exist_ok=True)
    alinan, eksik = [], []
    for ad in IKONLAR:
        y = os.path.join(kok, ad + ".png")
        if os.path.exists(y):
            shutil.copyfile(y, os.path.join(DOKU_HEDEF, ad + ".png"))
            alinan.append(ad)
        else:
            eksik.append(ad)
    return alinan, eksik


if __name__ == "__main__":
    kaynak = sys.argv[1] if len(sys.argv) > 1 else "."
    cfg = config_coz(kaynak)
    json.dump(cfg, open(CONFIG_HEDEF, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1, sort_keys=True)
    alinan, eksik = dokular(kaynak)
    print("config ayari : %d" % len(cfg))
    print("ikon alindi  : %d" % len(alinan))
    if eksik:
        print("ikon EKSIK   : %s" % ", ".join(eksik))
