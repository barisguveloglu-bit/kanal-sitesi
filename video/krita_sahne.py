"""Krita için katmanlı başlangıç sahnesi üretir ve Krita'nın okuduğunu doğrular.

Akış:
  1. Deneme bölümünün bir karesini katmanlarına ayırıp OpenRaster (.ora)
     dosyası yazar. ORA, katmanları PNG olarak tutan açık bir ZIP biçimi;
     Krita, GIMP ve MyPaint açar.
  2. Krita'yı ekransız çalıştırıp .ora'yı Krita'nın kendi biçimine (.kra)
     çevirir.
  3. Krita'ya .kra'yı tekrar düz PNG'ye çevirtir ve beklenen birleşik
     görüntüyle piksel piksel karşılaştırır. Fark eşiği aşılırsa hata verir.

Kullanım:
    python3 krita_sahne.py              # cikti/krita/sahne01.kra
    python3 krita_sahne.py --zaman 13.2 # başka bir anın katmanları

Krita yolu: KRITA ortam değişkeni ya da PATH'teki 'krita'.
"""
import argparse
import io
import os
import subprocess
import zipfile
from pathlib import Path

import cairo
import numpy as np

import bolum01 as b
import cizim as z

KLASOR = Path(__file__).parent
W, H = b.W, b.H


def _katman(ciz):
    yuzey = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ciz(cairo.Context(yuzey))
    return yuzey


def katmanlar(t):
    """(ad, yüzey, görünür) listesi; alttan üste sırayla."""
    arka = z.ArkaPlan(W, H)
    P = arka.PAY
    tr, ing = b.turkiye_durumu(t), b.ingiltere_durumu(t)
    R, ZEMIN = b.R, b.ZEMIN

    def gok(c):
        c.set_source_surface(arka.gok, -P, -P)
        c.paint()

    def bulutlar(c):
        for x, y, s, hiz, tohum in arka.bulutlar:
            arka._bulut(c, (x + hiz * t) % (W + 400) - 200, y, s, tohum)

    def on(c):
        c.set_source_surface(arka.on, -P, -P)
        c.paint()

    def golgeler(c):
        for d in (tr, ing):
            z.golge(c, d["x"], ZEMIN, R, d["yukseklik"])

    def top(kim, d):
        def ciz(c):
            z.top_ciz(c, kim, d["x"], ZEMIN, R, yukseklik=d["yukseklik"],
                      ezilme=d["ezilme"], egim=d["egim"], yon=d["yon"], goz=d["goz"],
                      acik=d["acik"], golge_ciz=False, kal=0.045 * R)
        return ciz

    def bardak(c):
        z.cay_bardagi(c, tr["x"] + 1.3 * R, ZEMIN - 0.30 * R, 1.05, t)

    def fincan(c):
        z.fincan(c, ing["x"] - 1.3 * R, ZEMIN - 0.30 * R, 0.9, kulp=-1)

    def balon(c):
        bl = b.BALONLAR[0]
        z.balon(c, bl["metin"], bl["x"], bl["y"],
                (ing["x"] - 0.25 * R, ZEMIN - 2 * R - 110))

    return [
        ("Gök", _katman(gok), True),
        ("Bulutlar", _katman(bulutlar), True),
        ("Ön plan (tepeler, çimen)", _katman(on), True),
        ("Gölgeler", _katman(golgeler), True),
        ("Türkiye", _katman(top(z.TURKIYE, tr)), True),
        ("Çay bardağı", _katman(bardak), True),
        ("İngiltere", _katman(top(z.INGILTERE, ing)), True),
        ("Fincan", _katman(fincan), True),
        ("Balon (örnek, gizli)", _katman(balon), False),
        ("Çizim — buraya elle çiz", _katman(lambda c: None), True),
    ]


def _png(yuzey):
    tampon = io.BytesIO()
    yuzey.write_to_png(tampon)
    return tampon.getvalue()


def birlesik(liste):
    yuzey = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    c = cairo.Context(yuzey)
    for _, k, gorunur in liste:
        if gorunur:
            c.set_source_surface(k, 0, 0)
            c.paint()
    return yuzey


def ora_yaz(yol, liste):
    """OpenRaster 0.0.5: 'mimetype' ilk ve sıkıştırmasız; stack.xml'de ilk
    katman en üstteki."""
    from xml.sax.saxutils import quoteattr
    satirlar = []
    for i, (ad, _, gorunur) in reversed(list(enumerate(liste))):
        satirlar.append(f'    <layer name={quoteattr(ad)} src="data/katman{i:02d}.png" x="0" y="0" '
                        f'opacity="1.0" visibility="{"visible" if gorunur else "hidden"}"/>')
    yigin = (f'<?xml version="1.0" encoding="UTF-8"?>\n<image version="0.0.5" w="{W}" h="{H}">\n'
             f'  <stack>\n' + "\n".join(satirlar) + '\n  </stack>\n</image>\n')
    tam = birlesik(liste)
    kucuk = cairo.ImageSurface(cairo.FORMAT_ARGB32, 256, 144)
    c = cairo.Context(kucuk)
    c.scale(256 / W, 144 / H)
    c.set_source_surface(tam, 0, 0)
    c.paint()
    with zipfile.ZipFile(yol, "w") as zf:
        zf.writestr(zipfile.ZipInfo("mimetype"), "image/openraster", zipfile.ZIP_STORED)
        zf.writestr("stack.xml", yigin, zipfile.ZIP_DEFLATED)
        for i, (_, k, _) in enumerate(liste):
            zf.writestr(f"data/katman{i:02d}.png", _png(k), zipfile.ZIP_DEFLATED)
        zf.writestr("mergedimage.png", _png(tam), zipfile.ZIP_DEFLATED)
        zf.writestr("Thumbnails/thumbnail.png", _png(kucuk), zipfile.ZIP_DEFLATED)
    return tam


def krita_cevir(krita, giris, cikis):
    sonuc = subprocess.run([krita, "--nosplash", str(giris), "--export",
                            "--export-filename", str(cikis)],
                           capture_output=True, text=True, timeout=600)
    if not Path(cikis).exists():
        raise SystemExit(f"Krita dışa aktaramadı: {giris} -> {cikis}\n{sonuc.stderr[-2000:]}")


def piksel_farki(yol, beklenen):
    gelen = cairo.ImageSurface.create_from_png(str(yol))
    if (gelen.get_width(), gelen.get_height()) != (W, H):
        raise SystemExit(f"Boyut tutmuyor: {gelen.get_width()}x{gelen.get_height()}")
    a = np.frombuffer(bytes(gelen.get_data()), np.uint8).reshape(H, W, 4)[..., :3].astype(int)
    e = np.frombuffer(bytes(beklenen.get_data()), np.uint8).reshape(H, W, 4)[..., :3].astype(int)
    fark = np.abs(a - e)
    return float(fark.mean()), int(fark.max()), float((fark.max(axis=2) > 8).mean() * 100)


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--cikti", default=str(KLASOR / "cikti" / "krita"))
    p.add_argument("--zaman", type=float, default=3.2, help="sahnenin hangi saniyesi")
    a = p.parse_args()
    cikti = Path(a.cikti)
    cikti.mkdir(parents=True, exist_ok=True)
    krita = os.environ.get("KRITA", "krita")
    liste = katmanlar(a.zaman)
    ora = cikti / "sahne01.ora"
    kra = cikti / "sahne01.kra"
    kontrol = cikti / "sahne01_krita_kontrol.png"
    for yol in (kra, kontrol):
        yol.unlink(missing_ok=True)
    beklenen = ora_yaz(ora, liste)
    krita_cevir(krita, ora, kra)
    with zipfile.ZipFile(kra) as zf:
        katman_sayisi = zf.read("maindoc.xml").decode("utf-8").count("<layer ")
    krita_cevir(krita, kra, kontrol)
    ort, en_cok, oran = piksel_farki(kontrol, beklenen)
    print(f"{kra}: {katman_sayisi} katman")
    print(f"Krita'nın birleşik çıktısı ile beklenen arasındaki fark: ortalama {ort:.3f}, "
          f"en çok {en_cok}/255, 8'den büyük farklı piksel %{oran:.3f}")
    if katman_sayisi != len(liste) or ort > 1.0 or oran > 1.0:
        raise SystemExit("DOĞRULANAMADI: katman sayısı ya da görüntü tutmuyor")
    print("DOĞRULANDI")


if __name__ == "__main__":
    main()
