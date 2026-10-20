#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Oturum açılışı iş defteri kancası
===============================================================
`defter.py ozet`'i oturum başında basar: yarım iş, askıdaki karar ve
reddedilmiş fikir sayısı. Yarım iş dosyada durup okunmazsa, yeni oturum
onu bilmeden baştan başlar — dışarıda üç ayrı kaynakta gözlenen hata.

Hiçbir koşulda akışı bozmaz; defter boşsa susar.
"""

import os
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))


def main():
    try:
        sys.stdin.read()
    except Exception:
        pass
    defter = os.path.join(KLASOR, "defter.py")
    if not os.path.exists(defter):
        return 0
    try:
        s = subprocess.run([sys.executable, defter, "ozet"],
                           capture_output=True, text=True, timeout=20)
    except Exception:
        return 0
    cikti = (s.stdout or "").strip()
    # Boş defteri cümlenin TAMAMIYLA tanı (kanca-ders.py'deki ders).
    if s.returncode != 0 or not cikti or cikti == "İş defteri boş.":
        return 0
    print(cikti)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)
