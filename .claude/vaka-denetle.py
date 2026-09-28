#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Vaka geçerliliği: sınav vakası adının iddiasını mı ölçüyor?
===============================================================
Mutasyon sınavı testlerin GÜCÜNÜ ölçer (aracı bozunca düşüyor mu), fay
enjeksiyonu denetleyicinin dikkatini. Vakanın kendisinin DÜRÜST olup
olmadığını — adında söylediğini mi sınadığını — ölçen halka yoktu.

Kaynak: OpenAI'nin SWE-bench Verified denetimi (2026-02-23) — zorlanılan
problemlerin %59,4'ünde tanım ile test arasında tasarım hatası çıktı.
Oradaki "tanım" burada vakanın ADI: `arac-sinavi.py`'de her vaka
`"<araç>: <iddia>"` biçiminde ve öneki hangi aracı sınadığını söylüyor.

## İki denetim (yalnız `arac-sinavi.py`)

1. **Ad ↔ gövde.** Öneki `bul:` olan vaka `bul.py`'yi hiç çağırmıyorsa,
   adındaki aracı değil başka bir şeyi ölçüyordur. Gövdeyle birlikte
   gövdenin çağırdığı yardımcılar da okunur (`_kanca`, `_butunluk`:
   `kanca:` ve `bütünlük:` vakaları aracı bunlar üzerinden çağırıyor).
   Önek bir betik adına denk gelmiyorsa `ESLEME`'ye bakılır; orada da
   yoksa önek eşlemesizdir — tabloyu güncellemek gerekir.
2. **Düşebilir mi.** Sözleşme: vaka `None` döndürürse geçti, metin
   döndürürse düştü. Gövdesinde metin döndüren tek bir `return` yoksa
   vaka ancak çökerek düşebilir — iddiası sınanmıyordur.

`sinav.py` (fay enjeksiyonu, karar `dogrula.py`'de) ve `butunluk.py`
(vakaları araç değil veri bölümü adlı) dışarıda.

## Bu denetim sınavı yumuşatma aracı DEĞİLDİR

Bulgunun karşılığı vakayı silmek değil, adını ya da gövdesini
düzeltmektir. Hiçbir vakayı değiştirmez; şüpheli olan insana çıkar.

## Çıkış kodu

    0  temiz
    1  düşemeyen vaka var (iddia sınanmıyor — kesin kusur)
    3  insan bakmalı: adındaki aracı çağırmayan vaka ya da eşlemesiz önek
"""

import importlib.util
import inspect
import os
import re
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
SINAV = os.path.join(KLASOR, "arac-sinavi.py")

# Gövdede en az biri geçmesi gereken DİZGELER. Varsayılan: önekin betik
# karşılığı (`"bul.py"`). Tablo, aracı başka bir kapıdan sınayan grupların
# o kapısını AÇIKÇA yazar — ilk koşuda 15 vaka şüpheli çıktı, hepsi
# incelendi ve hepsi meşru dolaylı giriş çıktı (aşağıda gerekçeleriyle).
# Her satır bir insan kararıdır; genişletirken gerekçesini yaz.
# `None`: bilerek çok araçlı grup, denetimden muaf.
ESLEME = {
    "dış ajan": {'"disajan.py"'},
    "ilerleme": {'"devre.py"'},
    "yetki": {'"gorev.py"', '"kanca-gorev.py"'},
    "kanca": {'"kanca.py"', '"devre.py"'},      # kanca kararı devre sayacına beslenir
    "fren": {'"kanca-buyuk.py"', '"olay.py"'},  # olay.py dagit → kanca-buyuk.py
    "belge": {'"dogrula.py"'},
    "acil": {'"olay.py"', '"dogrula.py"'},      # kalıcı ECHO_KAPALI'yı dogrula yakalar
    "denetleyici": {'"sinav.py"', '"dogrula.py"'},
    "arama": {'"ara.py"'},
    "vaka denetimi": {'"vaka-denetle.py"'},
    # Oturum açılışı: olay.py → kanca-duman.py / kanca-ders.py → araç.
    "duman": {'"duman.py"', '"olay.py"'},
    "ders": {'"ders.py"', '"olay.py"'},
    "görev": {'"gorev.py"', '"kanca-gorev.py"'},  # sözleşmesiz görevi kanca engeller
    # Üretilmiş dosyanın tazeliğini dogrula.py denetler; vaka o kapıyı sınar.
    "logo": {'"logo.py"', '"dogrula.py"'},
    "sürüm": {'"surum.py"', '"dogrula.py"'},
    "bütçe": {'"butce.py"', '"devre.py"'},        # süre sınırı devre kesicide
    "bütünlük": {'"butunluk.py"', '"okuyucu.py"'},  # okuyucu bütünlüğün veri okuyucusu
    "rapor": {'"rapor.py"', '".gitignore"'},       # deponun koşuya özel olması
    "ajan": {'"dogrula.py"', "agents"},            # ajan tanımları veridir, doğrudan okunur
    "kızıl takım": None,
}


def _ascii(s):
    return s.translate(str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")).lower().replace(" ", "-")


def _yukle():
    t = importlib.util.spec_from_file_location("_vaka_sinav", SINAV)
    m = importlib.util.module_from_spec(t)
    t.loader.exec_module(m)
    return m


def kaynak_ve_yardimcilar(m, islev, derinlik=3):
    """Vaka gövdesi + çağırdığı modül içi yardımcıların kaynağı."""
    goruldu, parcalar, sira = set(), [], [(islev, 0)]
    while sira:
        f, d = sira.pop()
        if f.__name__ in goruldu:
            continue
        goruldu.add(f.__name__)
        src = inspect.getsource(f)
        parcalar.append(src)
        if d >= derinlik:
            continue
        for ad in set(re.findall(r"\b(_\w+)\s*\(", src)):
            y = getattr(m, ad, None)
            if inspect.isfunction(y) and y.__module__ == m.__name__:
                sira.append((y, d + 1))
    return "\n".join(parcalar)


def dusebilir(islev):
    """Gövdede metin döndüren en az bir return var mı?"""
    src = inspect.getsource(islev)
    for satir in re.findall(r"^\s*return\b(.*)$", src, re.M):
        deger = satir.strip()
        if deger and deger != "None":
            return True
    return False


def denetle():
    m = _yukle()
    betikler = {f[:-3] for f in os.listdir(KLASOR) if f.endswith(".py")}
    dusemez, supheli, eslemesiz = [], [], {}
    for ad, islev in m.VAKALAR:
        if not dusebilir(islev):
            dusemez.append(ad)
        onek = ad.split(":")[0]
        if onek in ESLEME:
            beklenen = ESLEME[onek]
        elif _ascii(onek) in betikler:
            beklenen = {f'"{_ascii(onek)}.py"'}
        else:
            eslemesiz.setdefault(onek, []).append(ad)
            continue
        if beklenen is None:
            continue
        src = kaynak_ve_yardimcilar(m, islev)
        if not any(b in src for b in beklenen):
            supheli.append((ad, sorted(beklenen)))
    return len(m.VAKALAR), dusemez, supheli, eslemesiz


def main():
    toplam, dusemez, supheli, eslemesiz = denetle()
    for ad in dusemez:
        print(f"DÜŞEMEZ   {ad} — metin döndüren return yok; iddia sınanmıyor")
    for ad, beklenen in supheli:
        print(f"ŞÜPHELİ   {ad} — adındaki aracı çağırmıyor (beklenen: {', '.join(beklenen)})")
    for onek, adlar in sorted(eslemesiz.items()):
        print(f"EŞLEMESİZ '{onek}:' öneki ({len(adlar)} vaka) bir betiğe denk gelmiyor — "
              "vaka-denetle.py ESLEME tablosuna ekle")
    if dusemez:
        print(f"\n{len(dusemez)}/{toplam} vaka düşemiyor.")
        return 1
    if supheli or eslemesiz:
        print(f"\n{len(supheli)} şüpheli, {len(eslemesiz)} eşlemesiz önek — insan bakmalı; "
              "karşılığı silmek değil, adı ya da gövdeyi düzeltmek.")
        return 3
    print(f"{toplam} vakanın hepsi adındaki aracı çağırıyor ve düşebiliyor.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
