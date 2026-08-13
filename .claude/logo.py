#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Logo üreteci
===============================================================
Logo elle çizilmiş bir dosya değil, **üretilmiş** bir dosya. Sebebi bu
katmanın baştan beri tek alışkanlığı: bir yerde iki kez yazılan şey er ya
da geç ayrışır. Sürüm numarası hem `surum.json` içinde hem SVG'nin içinde
elle dursaydı, `v1.2`'ye geçtiğimiz gün logo `v1.1` kalırdı — ve kimse
fark etmezdi.

Bu yüzden numara tek yerde duruyor, logo oradan üretiliyor, `dogrula.py`
de dosyanın üreteçle hâlâ birebir aynı olduğunu denetliyor. Dosyayı elle
düzenlersen denetim kırmızı yanar; doğrusu üreteci düzenlemek.

## Biçim

İki dosya üretilir:

    .claude/marka/echo-logo.svg     tam kilit  — işaret + yazı + sürüm
    .claude/marka/echo-isaret.svg   kare işaret — 48 piksel ve üstü
    .claude/marka/echo-simge.svg    sade simge  — 32 piksel ve altı, favicon

Üç dosya var çünkü **aynı çizim her boyda okunmuyor.** İşareti 32 piksele
indirdiğimde kesik halka gri bir bulanıklığa, üç yayın soluk olanı hiçliğe,
ok da bir lekeye dönüştü. Bunu ölçmeden bilemezdim — küçülme sınavını
çalıştırıp baktım. Sade simge o yüzden var: kesik halka yok, yay iki tane,
ok yok, çizgiler kalın. Detayı atmak boya teslim olmak değil, boyun neyi
taşıyabildiğini kabul etmek.

## Ne anlatıyor

    ┌ dış halka (kesik)  →  ölçüm: sistemin kendisini denetleyen halka
    │  ┌ üç yay          →  KAT 2-3-4, merkeze doğru güçlenir
    │  │  ┌ çekirdek     →  yapılan iş
    │  │  │
    │  │  │   ◄──┤       →  dönüş oku: çıktı denetimden geri gelir
                              adın sebebi bu — yankı

Yaylar sağa doğru açık; boşluk tesadüf değil, dönüş oku oradan giriyor.

    python3 .claude/logo.py yaz
    python3 .claude/logo.py goster --ne isaret
"""

import argparse
import math
import os
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
MARKA = os.path.join(KLASOR, "marka")

sys.path.insert(0, KLASOR)
import surum  # noqa: E402  (yol yukarıda kuruluyor)

# Renkler siteden alındı (assets/css/style.css). Aydınlık/karanlık ikisi de
# tanımlı: SVG bir <img> içinde bile kendi ortam sorgusunu çalıştırır.
MUREKKEP_AYDINLIK = "#17171e"   # --bg-3
MUREKKEP_KARANLIK = "#e8e6e3"   # --text
SIS = "#7f7f8b"                 # --text-3, iki temada da okunur
VURGU_AYDINLIK = "#c0271f"      # --kan
VURGU_KARANLIK = "#ff4438"      # --kan-parlak

MERKEZ = 48.0
DIS_HALKA = 42.0
YAYLAR = ((33.0, 2.5, 0.32), (24.0, 3.0, 0.60), (15.0, 4.0, 1.0))
CEKIRDEK = 5.5
AGIZ = 55.0  # yayın açık kaldığı yarı açı (derece)

# Sade simge: küçük boyda ayakta kalan asgari çizim. Kesik halka ve dönüş
# oku burada yok — 32 pikselde ikisi de lekeye dönüşüyor.
SIMGE_YAYLAR = ((37.0, 5.0, 0.50), (22.0, 7.5, 1.0))
SIMGE_CEKIRDEK = 9.0
SIMGE_AGIZ = 62.0  # ağız daha açık: kalın çizgide dar ağız kapalı görünüyor


def nokta(yaricap, aci):
    """Merkezden `aci` derece, `yaricap` uzaklıktaki nokta."""
    r = math.radians(aci)
    return (MERKEZ + yaricap * math.cos(r), MERKEZ + yaricap * math.sin(r))


def yay(yaricap, agiz=AGIZ):
    """Sağı açık yay: +agiz°'den saat yönünün tersine -agiz°'ye, uzun yoldan."""
    x1, y1 = nokta(yaricap, agiz)
    x2, y2 = nokta(yaricap, -agiz)
    return (f"M {x1:.2f} {y1:.2f} "
            f"A {yaricap:.2f} {yaricap:.2f} 0 1 0 {x2:.2f} {y2:.2f}")


def bicem(kapsam=""):
    """Sınıf tanımları. var() kullanılmıyor — düz bildirim her yerde çalışır."""
    o = kapsam
    return f"""
    {o}.murekkep {{ fill: {MUREKKEP_AYDINLIK}; }}
    {o}.sis {{ stroke: {SIS}; fill: none; }}
    {o}.vurgu {{ fill: {VURGU_AYDINLIK}; }}
    {o}.vurgu-c {{ stroke: {VURGU_AYDINLIK}; fill: none; }}
    {o}.soluk {{ fill: {SIS}; }}
    @media (prefers-color-scheme: dark) {{
      {o}.murekkep {{ fill: {MUREKKEP_KARANLIK}; }}
      {o}.vurgu {{ fill: {VURGU_KARANLIK}; }}
      {o}.vurgu-c {{ stroke: {VURGU_KARANLIK}; }}
    }}"""


def isaret_govdesi():
    """İşaretin çizim öğeleri — hem tek başına hem kilitte aynısı kullanılır."""
    p = []
    p.append(f'    <circle class="sis" cx="{MERKEZ}" cy="{MERKEZ}" '
             f'r="{DIS_HALKA}" stroke-width="1" stroke-dasharray="2 5" '
             f'opacity="0.55"/>')
    for yaricap, kalinlik, saydam in YAYLAR:
        p.append(f'    <path class="vurgu-c" d="{yay(yaricap)}" '
                 f'stroke-width="{kalinlik}" stroke-linecap="round" '
                 f'opacity="{saydam}"/>')

    # Dönüş oku: dış halkadan çekirdeğe doğru, yayların ağzından geçerek.
    # Yaylar ±55°'de bittiği için yatay eksende sağa doğru koridor boş —
    # ok oraya oturuyor, hiçbir yayı kesmiyor.
    kuyruk_bas = MERKEZ + DIS_HALKA - 2.0
    uc_taban = MERKEZ + 21.0
    uc = MERKEZ + 10.5
    p.append(f'    <path class="vurgu-c" d="M {kuyruk_bas:.2f} {MERKEZ} '
             f'L {uc_taban:.2f} {MERKEZ}" stroke-width="2.2" '
             f'stroke-linecap="round"/>')
    p.append(f'    <path class="vurgu" d="M {uc:.2f} {MERKEZ} '
             f'L {uc_taban:.2f} {MERKEZ - 5.2:.2f} '
             f'L {uc_taban:.2f} {MERKEZ + 5.2:.2f} Z"/>')

    p.append(f'    <circle class="murekkep" cx="{MERKEZ}" cy="{MERKEZ}" '
             f'r="{CEKIRDEK}"/>')
    return "\n".join(p)


def svg_isaret():
    """Kare işaret — avatar, favicon, köşe damgası."""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"
     width="96" height="96" role="img" aria-label="Echo işareti">
  <title>Echo</title>
  <style>{bicem()}
  </style>
  <g>
{isaret_govdesi()}
  </g>
</svg>
"""


def svg_simge():
    """32 piksel ve altı. Az öğe, kalın çizgi, boş alan yok."""
    p = []
    for yaricap, kalinlik, saydam in SIMGE_YAYLAR:
        p.append(f'    <path class="vurgu-c" d="{yay(yaricap, SIMGE_AGIZ)}" '
                 f'stroke-width="{kalinlik}" stroke-linecap="round" '
                 f'opacity="{saydam}"/>')
    p.append(f'    <circle class="murekkep" cx="{MERKEZ}" cy="{MERKEZ}" '
             f'r="{SIMGE_CEKIRDEK}"/>')
    govde = "\n".join(p)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"
     width="96" height="96" role="img" aria-label="Echo simgesi">
  <title>Echo</title>
  <style>{bicem()}
  </style>
  <g>
{govde}
  </g>
</svg>
"""


def svg_kilit(surum_metni):
    """İşaret + yazı + sürüm. Sürüm numarası surum.json'dan geliyor."""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 96"
     width="320" height="96" role="img"
     aria-label="Echo {surum_metni}">
  <title>Echo {surum_metni}</title>
  <style>{bicem()}
    .ad {{ font-family: Georgia, "Times New Roman", serif; font-size: 42px;
          letter-spacing: 10px; }}
    .alt {{ font-family: system-ui, -apple-system, "Segoe UI", Roboto,
           sans-serif; font-size: 11px; letter-spacing: 3px; }}
  </style>
  <g>
{isaret_govdesi()}
  </g>
  <text class="ad murekkep" x="124" y="54">ECHO</text>
  <path class="sis" d="M 126 66 L 302 66" stroke-width="1" opacity="0.5"/>
  <text class="alt soluk" x="126" y="82">YANKI KATMANI</text>
  <text class="alt vurgu" x="302" y="82" text-anchor="end">{surum_metni}</text>
</svg>
"""


def dosyalar():
    """Üretilecek her dosya için (yol, içerik). Denetim de bunu kullanıyor."""
    s = surum.metin(surum.oku())
    return [
        (os.path.join(MARKA, "echo-logo.svg"), svg_kilit(s)),
        (os.path.join(MARKA, "echo-isaret.svg"), svg_isaret()),
        (os.path.join(MARKA, "echo-simge.svg"), svg_simge()),
    ]


def bayat():
    """Diskteki dosya üreteçle aynı mı. Farklıysa sebebini döndürür."""
    sorunlar = []
    for yol, icerik in dosyalar():
        ad = os.path.relpath(yol, os.path.dirname(KLASOR))
        if not os.path.exists(yol):
            sorunlar.append(f"{ad} yok — `python3 .claude/logo.py yaz` çalıştır.")
            continue
        with open(yol, encoding="utf-8") as f:
            if f.read() != icerik:
                sorunlar.append(
                    f"{ad} üreteçle uyuşmuyor. Bu dosya üretilmiş; elle "
                    "düzenlenmişse değişiklik ilk `yaz`da silinir, sürüm "
                    "değiştiyse bayat kalmış. Üreteci düzelt, sonra `yaz`.")
    return sorunlar


def yaz(a):
    os.makedirs(MARKA, exist_ok=True)
    for yol, icerik in dosyalar():
        with open(yol, "w", encoding="utf-8") as f:
            f.write(icerik)
        print(f"yazıldı: {os.path.relpath(yol, os.path.dirname(KLASOR))}")
    print(f"\n{surum.AD} {surum.metin(surum.oku())} — sürüm surum.json'dan geldi.")
    return 0


def goster(a):
    cizim = {"isaret": svg_isaret,
             "simge": svg_simge,
             "logo": lambda: svg_kilit(surum.metin(surum.oku()))}
    sys.stdout.write(cizim[a.ne]())
    return 0


def denetle(a):
    sorunlar = bayat()
    if not sorunlar:
        print("Logo dosyaları üreteçle birebir aynı.")
        return 0
    for s in sorunlar:
        print(f"BAYAT: {s}")
    return 1


def main(argv):
    a = argparse.ArgumentParser(description="Echo logo üreteci.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("yaz", help="SVG dosyalarını üret")
    p.set_defaults(islev=yaz)

    p = alt.add_parser("goster", help="SVG'yi ekrana bas")
    p.add_argument("--ne", choices=("logo", "isaret", "simge"), default="logo")
    p.set_defaults(islev=goster)

    p = alt.add_parser("denetle", help="diskteki dosya üreteçle aynı mı")
    p.set_defaults(islev=denetle)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
