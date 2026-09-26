#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Kapı sarmalayıcısı
===============================================================
"Bu kapı gerçekten KOŞTU mu?"

## Boşluk neydi

23. ders: çıkış kodu 0, aracın işini yaptığı anlamına gelmez; bir araç
sessizce ölüp 0 dönebilir. Ders `ablasyon.py`'ye uygulandı, ama dersin
geçebileceği diğer yerler taranmadı. Sonradan ölçüldü: hiçbir iş
yapmadan 0 ile ölen bir bütünlük sınavına

  · duman testi   "temiz — canon ↔ veri ↔ site" dedi
  · GitHub CI     "Canon ↔ veri ↔ site tutarlı" yazdı

İkisi de yalnız çıkış koduna bakıyordu.

## Ne yapar

Kapıyı koşturur, çıktısını aynen geçirir, ve kapının ÖZET satırını arar.
Özet yoksa kod ne olursa olsun `2` döner: "koştu ama geçti" değil
"koşmadı". Desenler kapının hem başarılı hem başarısız özetini kapsar —
yalnız başarıyı tanıyan bir desen, dürüst bir kırmızıyı "koşmadı" diye
yanlış okurdu.

Desen tablosu TEK yerde: duman testi de CI da buradan okur. İki yerde
tutulsa biri çürür.

    python3 .claude/kapi.py dogrula
    python3 .claude/kapi.py arac-sinavi

Çıkış: kapının kendi kodu (0/1/3) · 2 kapı koşmadı ya da özetsiz öldü
"""

import os
import re
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

# ad → (betik ve argümanlar, özet deseni: başarı VE başarısızlık)
KAPILAR = {
    "dogrula": (["dogrula.py"],
                r"\d+ denetim geçti|\d+ hata, \d+ geçen denetim|İNSAN KAPISI"),
    "butunluk": (["butunluk.py"],
                 r"BÜTÜN — \d+ vakanın|\d+ tutarsızlık, \d+ temiz"),
    "sinav": (["sinav.py"], r"\d+/\d+ vaka beklendiği gibi"),
    "arac-sinavi": (["arac-sinavi.py"], r"\d+/\d+ araç vakası"),
    "degerlendir": (["degerlendir.py"], r"Geri getirme eşikleri geçti|EŞİK ALTINDA"),
    "ders-bayat": (["ders.py", "bayat"],
                   r"Bütün korumalar yerinde|KIRIK KORUMA|KAYMIŞ KORUMA"),
    "iz-coken": (["iz.py", "coken"],
                 r"Kapatılan her izin karşılığı|ÇÖKEN KAPANIŞ|KAYMIŞ KARŞILIK"),
    "golge": (["golge.py", "kos"],
              r"Gölgeler çıkış kodunu etkilemez|Kayıtlı kapı yok"),
}


def kos(ad, sessiz=False):
    """(kod, çıktı). Kod 2 = koşmadı."""
    arg, desen = KAPILAR[ad]
    yol = os.path.join(KLASOR, arg[0])
    if not os.path.exists(yol):
        return 2, f"{arg[0]} yok"
    try:
        s = subprocess.run([sys.executable, yol, *arg[1:]], cwd=KOK,
                           capture_output=True, text=True, timeout=1500)
    except subprocess.TimeoutExpired:
        return 2, "zaman aşımı"
    cikti = (s.stdout or "") + (s.stderr or "")
    if s.returncode not in (0, 1, 3):
        return 2, cikti + f"\nKOŞMADI — çıkış {s.returncode}"
    if not re.search(desen, s.stdout or ""):
        return 2, cikti + (f"\nKOŞMADI — çıkış {s.returncode} ama özet satırı yok. "
                           "Kod 0 olsa bile bu 'temiz' değil: araç yarıda ölmüş "
                           "olabilir.")
    return s.returncode, cikti


def main(argv):
    if not argv or argv[0] not in KAPILAR:
        print(f"Kullanım: kapi.py <{'|'.join(KAPILAR)}>")
        return 2
    kod, cikti = kos(argv[0])
    sys.stdout.write(cikti)
    return kod


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
