"""Kurulu her araca küçük ama gerçek bir iş yaptırır ve çıktısını ölçer.

Sürüm numarası basmak "çalışıyor" demek değil; burada her araç bir dosya
üretir ve dosyanın içeriği denetlenir (boyut, hareket, kare sayısı).

Kullanım:
    python3 araclari_sina.py          # hepsi
    python3 araclari_sina.py inkscape synfig
Çıkış kodu: 0 hepsi geçti, 1 en az biri kaldı.
"""
import math
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

import cairo
import numpy as np

import cizim as z


def kos(komut, sure=300):
    s = subprocess.run(komut, capture_output=True, text=True, timeout=sure)
    return s.returncode, (s.stdout + s.stderr)


def surum(komut, desen):
    _, cikti = kos(komut, 120)
    for satir in cikti.splitlines():
        if desen.lower() in satir.lower():
            return satir.strip()[:60]
    return "?"


def png_boyut(yol):
    s = cairo.ImageSurface.create_from_png(str(yol))
    return s.get_width(), s.get_height()


def kirmizi_merkez(yol):
    """Görüntüdeki kırmızı (top) piksellerin ağırlık merkezi."""
    s = cairo.ImageSurface.create_from_png(str(yol))
    a = np.frombuffer(bytes(s.get_data()), np.uint8).reshape(s.get_height(), s.get_stride() // 4, 4)
    b, g, r = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    maske = (r > 150) & (g < 80) & (b < 80)
    if maske.sum() < 50:
        return None
    ys, xs = np.nonzero(maske)
    return float(xs.mean()), float(ys.mean())


def ornek_dosyalar(k):
    """Sınama girdileri: Türkiye topu (SVG + PNG) ve arka plan."""
    def top(c):
        z.top_ciz(c, z.TURKIYE, 256, 480, 200, golge_ciz=False)
    svg = cairo.SVGSurface(str(k / "top.svg"), 512, 512)
    top(cairo.Context(svg))
    svg.finish()
    png = cairo.ImageSurface(cairo.FORMAT_ARGB32, 512, 512)
    top(cairo.Context(png))
    png.write_to_png(str(k / "top.png"))
    arka = cairo.ImageSurface(cairo.FORMAT_ARGB32, 1920, 1080)
    c = cairo.Context(arka)
    c.set_source_rgb(0.55, 0.8, 1.0)
    c.paint()
    arka.write_to_png(str(k / "arka.png"))


# ------------------------------------------------------------------ sınamalar

def sina_ffmpeg(k):
    kod, _ = kos(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", str(k / "arka.png"),
                  "-t", "1", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(k / "f.mp4")])
    _, sure = kos(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                   str(k / "f.mp4")])
    ok = kod == 0 and abs(float(sure or 0) - 1.0) < 0.1
    return ok, f"PNG → 1 sn H.264 ({sure.strip()} sn)"


def sina_blender(k):
    betik = ("import bpy; bpy.ops.mesh.primitive_uv_sphere_add(); "
             "print('KURE', len(bpy.context.active_object.data.vertices))")
    _, cikti = kos(["blender", "-b", "--factory-startup", "--python-expr", betik])
    ok = "KURE 482" in cikti
    return ok, "ekransız Python ile küre oluşturma (482 köşe)"


def sina_krita(k):
    kra, geri = k / "top.kra", k / "top_krita.png"
    kos(["krita", "--nosplash", str(k / "top.png"), "--export", "--export-filename", str(kra)])
    kos(["krita", "--nosplash", str(kra), "--export", "--export-filename", str(geri)])
    ok = kra.exists() and zipfile.is_zipfile(kra) and geri.exists() and png_boyut(geri) == (512, 512)
    return ok, "PNG → .kra → PNG gidiş-dönüş"


def sina_inkscape(k):
    cikis = k / "top_4k.png"
    kos(["inkscape", str(k / "top.svg"), "--export-type=png", "--export-width=4096",
         f"--export-filename={cikis}"])
    ok = cikis.exists() and png_boyut(cikis) == (4096, 4096)
    return ok, "512 px SVG → 4096 px PNG (vektör, pikselleşmeden)"


SIF = """<?xml version="1.0" encoding="UTF-8"?>
<canvas version="1.2" width="480" height="270" xres="2834.645669" yres="2834.645669"
 gamma-r="1" gamma-g="1" gamma-b="1" view-box="-4 2.25 4 -2.25" antialias="1"
 fps="24" begin-time="0f" end-time="1s" bgcolor="0.55 0.8 1 1">
 <layer type="rectangle" active="true" version="0.2" desc="zemin">
  <param name="color"><color><r>0.3</r><g>0.62</g><b>0.2</b><a>1</a></color></param>
  <param name="point1"><vector><x>-4</x><y>-1.6</y></vector></param>
  <param name="point2"><vector><x>4</x><y>-2.25</y></vector></param>
 </layer>
 <layer type="circle" active="true" version="0.2" desc="top">
  <param name="color"><color><r>0.89</r><g>0.04</g><b>0.09</b><a>1</a></color></param>
  <param name="radius"><real value="0.6"/></param>
  <param name="origin">
   <animated type="vector">
    <waypoint time="0s" before="clamped" after="clamped"><vector><x>-2.5</x><y>-1.0</y></vector></waypoint>
    <waypoint time="0.5s" before="clamped" after="clamped"><vector><x>0</x><y>1.2</y></vector></waypoint>
    <waypoint time="1s" before="clamped" after="clamped"><vector><x>2.5</x><y>-1.0</y></vector></waypoint>
   </animated>
  </param>
 </layer>
</canvas>
"""


def sina_synfig(k):
    (k / "zipla.sif").write_text(SIF, encoding="utf-8")
    merkezler = []
    for t in ("0", "0.5s", "1s"):
        cikis = k / f"synfig_{t}.png"
        kos(["synfig", str(k / "zipla.sif"), "-t", "png", "--time", t, "-o", str(cikis)])
        merkezler.append(kirmizi_merkez(cikis) if cikis.exists() else None)
    if None in merkezler:
        return False, "kare üretilemedi"
    (x0, y0), (x1, y1), (x2, y2) = merkezler
    ok = x0 < x1 < x2 and y1 < y0 - 40 and abs(y0 - y2) < 3
    return ok, f"anahtar kare arası ara hareket: top x {x0:.0f}→{x1:.0f}→{x2:.0f}, tepe {y0 - y1:.0f} px"


def sina_gimp(k):
    cikis = k / "kucuk_resim.jpg"
    betik = ("import gi; gi.require_version('Gimp', '3.0'); "
             "from gi.repository import Gimp, Gio; "
             f"img = Gimp.file_load(Gimp.RunMode.NONINTERACTIVE, Gio.File.new_for_path('{k / 'arka.png'}')); "
             "img.scale(1280, 720); "
             f"Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, img, Gio.File.new_for_path('{cikis}'), None)")
    kos(["gimp-console", "-i", "--batch-interpreter=python-fu-eval", "-b", betik, "--quit"])
    if not cikis.exists():
        return False, "toplu iş çıktı üretmedi"
    _, olcu = kos(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0",
                   str(cikis)])
    return olcu.strip() == "1280,720", f"Python-Fu toplu iş: 1920x1080 → küçük resim {olcu.strip()}"


def sina_melt(k):
    cikis = k / "melt.mp4"
    anahtar = ";".join(f"{i * 10}=760 {560 if i % 2 == 0 else 330} 400 400 1" for i in range(7))
    kos(["melt", str(k / "arka.png"), "out=59", "-track", str(k / "top.png"), "out=59",
         "-transition", "affine", "a_track=0", "b_track=1", "in=0", "out=59", f"rect={anahtar}",
         "-profile", "atsc_1080p_30", "-consumer", f"avformat:{cikis}", "vcodec=libx264", "an=1"])
    if not cikis.exists():
        return False, "render üretilmedi"
    merkez = []
    for t in ("0", "0.33"):
        kare = k / f"melt_{t}.png"
        kos(["ffmpeg", "-v", "error", "-y", "-ss", t, "-i", str(cikis), "-frames:v", "1", str(kare)])
        merkez.append(kirmizi_merkez(kare))
    if None in merkez:
        return False, "karelerde top bulunamadı"
    fark = merkez[0][1] - merkez[1][1]
    return fark > 150, f"zaman çizelgesi + anahtar kare render: top {fark:.0f} px zıpladı"


SINAMALAR = {
    "ffmpeg": (["ffmpeg", "-version"], "ffmpeg version", sina_ffmpeg),
    "blender": (["blender", "--version"], "Blender", sina_blender),
    "krita": (["krita", "--version"], "krita", sina_krita),
    "inkscape": (["inkscape", "--version"], "Inkscape", sina_inkscape),
    "synfig": (["synfig", "--version"], "synfig", sina_synfig),
    "gimp": (["gimp-console", "--version"], "version", sina_gimp),
    "melt": (["melt", "--version"], "melt", sina_melt),
}


def main():
    secilen = sys.argv[1:] or list(SINAMALAR)
    kalan = 0
    with tempfile.TemporaryDirectory(prefix="arac_sinama_") as gecici:
        k = Path(gecici)
        ornek_dosyalar(k)
        for ad in secilen:
            komut, desen, sina = SINAMALAR[ad]
            if not shutil.which(komut[0]):
                print(f"KALDI  {ad:9s} kurulu değil")
                kalan += 1
                continue
            try:
                ok, ayrinti = sina(k)
            except Exception as hata:  # noqa: BLE001 — araç ne atarsa atsın raporlanır
                ok, ayrinti = False, f"hata: {hata}"
            kalan += not ok
            print(f"{'GEÇTİ ' if ok else 'KALDI '} {ad:9s} {surum(komut, desen):40s} {ayrinti}")
    print(f"\n{len(secilen) - kalan}/{len(secilen)} araç gerçek işi yaptı.")
    sys.exit(1 if kalan else 0)


if __name__ == "__main__":
    main()
