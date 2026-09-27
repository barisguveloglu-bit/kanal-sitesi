# -*- coding: utf-8 -*-
"""WoM dovus animasyonlarini JAR'lardan yeniden uret.        v7.98.0

Kullanim:
    python3 addon/arac/wom_anim_uret.py <epic-fight.jar> <WeaponsOfMiracles.jar>

Yaptigi:
  1. Iki JAR'i gecici klasore acar (depoya hicbir ham dosya girmez).
  2. Hangi animasyonlarin gerektigini ayarlar.js'teki WOM_SERI'den
     OKUR -- liste elle tutulmuyor, seri degisirse cikti da degisir.
  3. arac/ef_anim_cevir.py ile cevirir -> kaynak_anim/wom/wom_dovus.animation.json
  4. arac/ef_anim_dogrula.py ile Epic Fight'in kendi pozuna karsi
     olcer ve parmak izini yazar -> kaynak_anim/wom/olcu.json
     Esik asilirsa cikis kodu 1: bozuk cikti sessizce kalmasin.

Ardindan `python3 addon/kol_uret.py` ciktiyi pakete kopyalar.
"""
import os
import re
import subprocess
import sys
import tempfile
import zipfile

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AYAR = os.path.join(KOK, "Simsek_TNT_ToprakTopu", "scripts", "ayarlar.js")
HEDEF = os.path.join(KOK, "kaynak_anim", "wom")
ONEK = "animation.wom."
BIPED = "assets/epicfight/animmodels/entity/biped.json"
ESIK = "12"


def seri_adlari():
    s = open(AYAR, encoding="utf-8").read()
    b = s.index("export const WOM_SERI = new Map(")
    blok = s[b:s.index("]);", b)]
    adlar = []
    for ad in re.findall(r'"([a-z0-9_]+)"', blok):
        if re.search(r"\d$", ad) and ad not in adlar:
            adlar.append(ad)
    return sorted(adlar)


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    gecici = tempfile.mkdtemp(prefix="wom_")
    for jar in argv:
        with zipfile.ZipFile(jar) as z:
            for ad in z.namelist():
                if ad.startswith("assets/") and "/animmodels/" in ad and ad.endswith(".json"):
                    z.extract(ad, gecici)
    yer = {}
    for d, _, fs in os.walk(gecici):
        if "/animations/biped/" not in d.replace("\\", "/") or d.endswith("data"):
            continue
        for f in fs:
            if f.endswith(".json"):
                yer.setdefault(f[:-5], os.path.join(d, f))
    adlar = seri_adlari()
    eksik = [a for a in adlar if a not in yer]
    if eksik:
        print("JAR'da YOK: " + ", ".join(eksik))
        return 1
    biped = os.path.join(gecici, BIPED)
    os.makedirs(HEDEF, exist_ok=True)
    cikti = os.path.join(HEDEF, "wom_dovus.animation.json")
    kalemler = ["%s=%s" % (a, yer[a]) for a in adlar]
    arac = os.path.dirname(os.path.abspath(__file__))
    r = subprocess.run([sys.executable, os.path.join(arac, "ef_anim_cevir.py"),
                        biped, cikti, ONEK] + kalemler)
    if r.returncode:
        return r.returncode
    r = subprocess.run([sys.executable, os.path.join(arac, "ef_anim_dogrula.py"),
                        biped, cikti, ONEK] + kalemler +
                       ["--esik", ESIK, "--sessiz", "--iz", os.path.join(HEDEF, "olcu.json")])
    return r.returncode


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
