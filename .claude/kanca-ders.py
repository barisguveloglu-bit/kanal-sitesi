#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Oturum açılış kancası
===============================================================
Bellek geliştirme döngüsünün kapanan halkası.

`ders.py` oturumlar arası kalıcı bir defter tutuyor. Ama defter
**okunmazsa yok gibidir**, ve okunmasını "hatırlama"ya bırakmak kuralı
yazıya bırakmaktır — bu sistemin en çok uğraştığı hata türü tam olarak
budur.

Bu kanca oturum açılışında defteri yüzeye çıkarır. Kimse hatırlamak
zorunda değil.

Kanca sözleşmesi:
  stdin  → JSON (hook_event_name, source ...)
  çıkış 0 → stdout bağlama eklenir
  Hiçbir koşulda akışı bozmaz: defter yoksa, bozuksa, betik patlarsa
  sessizce geçer. Açılışı engelleyen bir hafıza, hafıza değil engeldir.
"""

import os
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))


def main():
    # stdin'i tüket — okumazsak dağıtıcı tarafında boru tıkanabilir.
    try:
        sys.stdin.read()
    except Exception:
        pass

    ders = os.path.join(KLASOR, "ders.py")
    if not os.path.exists(ders):
        return 0

    try:
        s = subprocess.run([sys.executable, ders, "oku"],
                           capture_output=True, text=True, timeout=20)
    except Exception:
        # Ders okunamadı diye oturum açılmasın, olmaz.
        return 0

    cikti = (s.stdout or "").strip()
    if not cikti or "boş" in cikti:
        return 0

    print("Echo Orkestra — önceki koşulardan kalan dersler:\n")
    print(cikti)
    print()
    print("Bu dersler daha önce gerçekten yapılmış hatalardan çıkarıldı.")
    print("`!` işaretli olanların mekanik koruması yok — sadece okunarak")
    print("hatırlanıyorlar. `python3 .claude/ders.py ara \"<konu>\"` ile")
    print("işe girmeden önce ilgili olanları arayabilirsin.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Son savunma: hiçbir hata oturumu engellemesin.
        sys.exit(0)
