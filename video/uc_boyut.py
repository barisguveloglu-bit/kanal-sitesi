"""3D countryball denemesi: bayrak dokusunu üretir, Blender'ı arka planda
(ekransız) çalıştırıp Cycles ile tek kare render eder.

Kullanım:
    python3 uc_boyut.py                  # cikti/3d_turkiye.png
    python3 uc_boyut.py --ornek 128      # daha temiz (daha yavaş)

Blender yolu: BLENDER ortam değişkeni ya da PATH'teki 'blender'.
"""
import argparse
import math
import os
import subprocess
from pathlib import Path

import cairo

import cizim as z

KLASOR = Path(__file__).parent


def doku_uret(yol, genislik=2048):
    """Eşdikdörtgen (equirectangular) bayrak dokusu. Görüntü merkezi topun
    kameraya bakan noktasına gelir; ekvatorda 1 radyan = genislik/2π piksel."""
    yukseklik = genislik // 2
    yuzey = cairo.ImageSurface(cairo.FORMAT_ARGB32, genislik, yukseklik)
    c = cairo.Context(yuzey)
    c.translate(genislik / 2, yukseklik / 2)
    # 3D'de kenarlar küre üzerinde sıkıştığı için amblem 2D'ye göre merkeze yakın.
    z.bayrak_turkiye(c, genislik / (2 * math.pi), ay_x=-0.30, ay_y=0.30)
    yuzey.write_to_png(str(yol))


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--cikti", default=str(KLASOR / "cikti"))
    p.add_argument("--ornek", type=int, default=64, help="Cycles örnek sayısı")
    a = p.parse_args()
    cikti = Path(a.cikti)
    cikti.mkdir(parents=True, exist_ok=True)
    doku = cikti / "doku_turkiye.png"
    doku_uret(doku)
    blender = os.environ.get("BLENDER", "blender")
    subprocess.run([blender, "-b", "--factory-startup", "-P", str(KLASOR / "blender_sahne.py"),
                    "--", str(doku), str(cikti / "3d_turkiye.png"), str(a.ornek)], check=True)
    print(cikti / "3d_turkiye.png")


if __name__ == "__main__":
    main()
