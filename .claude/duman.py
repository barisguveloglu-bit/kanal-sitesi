#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Oturum başı duman testi
===============================================================
"Bu oturuma temiz bir zeminde mi başlıyorum?"

## Boşluk neydi

CI kapısı işin SONUNDA çalışıyor, kanca dosya düzenlendiğinde çalışıyor.
İkisi de **bu oturumda yapılanı** denetliyor.

Ama iki oturum arasında depoya dışarıdan bir şey girebiliyor: telefondan
GitHub web arayüzünde yapılan elle düzenleme, başka bir oturumun yarım
bıraktığı iş, merge sonrası kalan bir tutarsızlık. Bunların hiçbiri bu
oturumun kancasını tetiklemiyor ve ilk işin zeminine denetlenmeden
giriyor. Kırmızı bir zeminde yapılan yeşil iş, yeşil değildir.

## Neden ayrı bir araç

`arac-sinavi.py` 40 saniye sürüyor — oturum açılışında kabul edilemez.
Duman testi **hızlı olanları** koşuyor: kural denetimi, bütünlük, ve iki
defterin çürümemişliği. Tamamlık değil, uyarı amacı var.

Cowork'ün bu fikir için yazdığı risk aynen geçerli ve burada yazılı
duruyor: **"Test seti incelirse her şey hep yeşil görünür."** Bu yüzden
duman testi yeni denetim icat etmiyor, var olan kapıları çağırıyor —
kapılar güçlendikçe duman da güçleniyor, ayrı bakım istemiyor.

## Oturumu engellemez

`kanca-ders.py` ile aynı disiplin: açılışı engelleyen bir uyarı, uyarı
değil engeldir. Kırmızıysa söyler, işi durdurmaz — durdurma kararı
okuyanın.

    python3 .claude/duman.py
    python3 .claude/duman.py --sessiz     (yalnız çıkış kodu)

Çıkış kodu: 0 temiz · 1 en az bir kapı kırmızı · 2 bir kapı KOŞMADI
"""

import argparse
import os
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

# (ad, betik, argümanlar, kabul edilen çıkış kodları)
#
# `sinav.py` ve `arac-sinavi.py` burada YOK: yavaşlar. Onlar CI'nin işi.
# Duman testinin işi hız; kapsamı CI'den küçük olması bir eksiklik değil
# tasarım — ama bunu yazmak zorundayım, yoksa bir sonraki okuyan onu
# tam kapsam sanar.
KAPILAR = (
    ("kural denetimi", "dogrula.py", (), (0,)),
    ("canon ↔ veri ↔ site", "butunluk.py", (), (0,)),
    ("ders korumaları", "ders.py", ("bayat",), (0,)),
    ("iz karşılıkları", "iz.py", ("coken",), (0,)),
)


def kos(betik, arg):
    yol = os.path.join(KLASOR, betik)
    if not os.path.exists(yol):
        return None, f"{betik} yok"
    try:
        s = subprocess.run([sys.executable, yol, *arg], cwd=KOK,
                           capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        return None, "zaman aşımı"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"
    return s, None


def main(argv=None):
    a = argparse.ArgumentParser(description="Oturum başı hızlı sağlık testi.")
    a.add_argument("--sessiz", action="store_true")
    ayr = a.parse_args(argv)

    kirmizi, kosmayan, satir = [], [], []
    for ad, betik, arg, kabul in KAPILAR:
        s, hata = kos(betik, arg)
        if s is None:
            kosmayan.append((ad, hata))
            satir.append(f"  KOŞMADI  {ad} — {hata}")
            continue
        if s.returncode in kabul:
            satir.append(f"  temiz    {ad}")
        else:
            # Çıkış kodu sözleşmesi: 0/1/3 dışı "araç çalışmadı" demek,
            # "geçti" değil. Bu ayrımı silmek bu depoda bir kez yaşandı.
            if s.returncode not in (0, 1, 3):
                kosmayan.append((ad, f"çıkış {s.returncode}"))
                satir.append(f"  KOŞMADI  {ad} — çıkış {s.returncode}")
            else:
                ilk = (s.stdout or "").strip().splitlines()
                kirmizi.append((ad, ilk[0] if ilk else f"çıkış {s.returncode}"))
                satir.append(f"  KIRMIZI  {ad}")

    if ayr.sessiz:
        return 2 if kosmayan else (1 if kirmizi else 0)

    if not kirmizi and not kosmayan:
        print("Duman testi temiz — zemin sağlam, işe başlanabilir.")
        print("(Kapsam CI'den dar: fay enjeksiyonu ve araç sınavı burada koşmaz.)")
        return 0

    print("DUMAN TESTİ — oturum açılışında zemin denetimi\n")
    print("\n".join(satir))
    print()

    if kosmayan:
        print("Bir kapı KOŞMADI. Çalışmayan denetim, geçen denetim gibi")
        print("görünür — bu en tehlikeli hâl:")
        for ad, hata in kosmayan:
            print(f"  · {ad}: {hata}")
        print()
        return 2

    print("Zemin kırmızı. Bu oturumda yapılacak yeşil iş, kırmızı bir")
    print("zeminin üstüne konacak. Önce şunlara bak:")
    for ad, ilk in kirmizi:
        print(f"  · {ad}: {ilk[:110]}")
    print()
    print("Sebebi bu oturum olmayabilir: iki oturum arası dışarıdan gelen")
    print("bir düzenleme de olabilir. Oturum engellenmiyor, kararı sen ver.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
