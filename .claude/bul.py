#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Bölüm bulucu
===============================================================
"Büyük dosyanın tamamını değil, lazım olan parçasını ver."

## Neden

Bir kez okunan metin oturum bitene kadar HER mesajla yeniden gönderilir;
oturum limitini asıl tüketen budur. `arac-sinavi.py` ~156 KB, `DONGULER.md`
~98 KB — birinden tek bir vaka için bütün dosyayı okumak, oturumun geri
kalanına onlarca bin token eklemektir. `kanca-buyuk.py` büyük dosyanın
aralıksız okunmasını durdurur ve buraya yönlendirir.

    python3 .claude/bul.py <dosya>              içindekiler: def/class ya da başlık + satır
    python3 .claude/bul.py <dosya> <ad>         o fonksiyon / sınıf / bölümün kendisi
    python3 .claude/bul.py <dosya> --ara <söz>  sözün geçtiği satırlar (±2 satır, en çok 40)

.py dosyasında ad `def`/`class` adıdır; .md dosyasında başlığın içinde geçen
metindir; diğerlerinde yalnız `--ara` çalışır.

Çıkış kodu: 0 bulundu · 1 bulunamadı · 2 dosya yok
"""

import os
import re
import sys

EN_COK = 40


def icindekiler(satirlar, uzanti):
    desen = (re.compile(r"^(def|class)\s+(\w+)") if uzanti == ".py"
             else re.compile(r"^(#{1,4})\s+(.*)"))
    return [(i + 1, m.group(2)) for i, s in enumerate(satirlar)
            if (m := desen.match(s))]


def blok(satirlar, uzanti, ad):
    if uzanti == ".py":
        bas = next((i for i, s in enumerate(satirlar)
                    if re.match(rf"^(def|class)\s+{re.escape(ad)}\b", s)), None)
        if bas is None:
            return None
        son = next((j for j in range(bas + 1, len(satirlar))
                    if re.match(r"^\S", satirlar[j]) and satirlar[j].strip()),
                   len(satirlar))
    else:
        bas = next((i for i, s in enumerate(satirlar)
                    if re.match(r"^#{1,4}\s", s) and ad.lower() in s.lower()), None)
        if bas is None:
            return None
        seviye = len(re.match(r"^(#+)", satirlar[bas]).group(1))
        son = next((j for j in range(bas + 1, len(satirlar))
                    if (m := re.match(r"^(#+)\s", satirlar[j]))
                    and len(m.group(1)) <= seviye), len(satirlar))
    return bas, son


def main(argv):
    if not argv:
        print(__doc__.split("\n\n")[2])
        return 2
    yol = argv[0]
    if not os.path.isfile(yol):
        print(f"{yol} yok.")
        return 2
    satirlar = open(yol, encoding="utf-8", errors="replace").read().splitlines()
    uzanti = os.path.splitext(yol)[1]

    if len(argv) == 1:
        liste = icindekiler(satirlar, uzanti)
        if not liste:
            print(f"{yol}: içindekiler çıkarılamadı — --ara kullan.")
            return 1
        for no, ad in liste:
            print(f"{no:>6}  {ad}")
        return 0

    if argv[1] == "--ara":
        soz = " ".join(argv[2:]).lower()
        goster, basilan = set(), 0
        for i, s in enumerate(satirlar):
            if soz and soz in s.lower():
                goster.update(range(max(0, i - 2), min(len(satirlar), i + 3)))
        if not goster:
            print(f"'{soz}' bulunamadı.")
            return 1
        onceki = None
        for i in sorted(goster):
            if basilan >= EN_COK:
                print(f"… ({len(goster) - basilan} satır daha — sözü daralt)")
                break
            if onceki is not None and i != onceki + 1:
                print("  --")
            print(f"{i + 1:>6}: {satirlar[i]}")
            onceki, basilan = i, basilan + 1
        return 0

    aralik = blok(satirlar, uzanti, " ".join(argv[1:]))
    if aralik is None:
        print(f"'{' '.join(argv[1:])}' bulunamadı. İçindekiler için: bul.py {yol}")
        return 1
    bas, son = aralik
    for i in range(bas, son):
        print(f"{i + 1:>6}: {satirlar[i]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
