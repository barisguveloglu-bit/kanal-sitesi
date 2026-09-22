#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Oturum açılışı duman kancası
===============================================================
`duman.py`'yi oturum başında koşturur.

Neden kanca, neden talimat değil: Cowork'ün bu fikir için yazdığı
risklerden biri aynen şuydu — **"kanca yerine talimat olarak kalırsa
ajan testi atlayıp işe başlar."** Bu deponun en çok uğraştığı hata türü
tam olarak bu. Bir yerde yazı olarak duran kural, uygulanacağı an
uygulamak istemeyen tarafın elindedir.

Kanca sözleşmesi:
  stdin  → JSON (hook_event_name, source ...)
  çıkış 0 → stdout bağlama eklenir
  Hiçbir koşulda akışı bozmaz. Zemin kırmızıysa SÖYLER, durdurmaz —
  durdurma kararı okuyanın. Açılışı engelleyen bir uyarı, uyarı değil
  engeldir.
"""

import os
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)


def main():
    try:
        sys.stdin.read()
    except Exception:
        pass

    duman = os.path.join(KLASOR, "duman.py")
    if not os.path.exists(duman):
        return 0

    try:
        s = subprocess.run([sys.executable, duman], cwd=KOK,
                           capture_output=True, text=True, timeout=120)
    except Exception:
        # Duman testi koşamadı diye oturum açılmasın, olmaz.
        return 0

    if s.returncode == 0:
        # Temizken sessiz kalmak doğru olurdu ama bir bedeli var: koşup
        # koşmadığı görünmez olur ve sessiz başarısızlık sessiz başarıdan
        # ayırt edilemez. Tek satır yeter.
        print("Zemin denetimi: temiz (duman testi).")
        return 0

    print("ZEMİN DENETİMİ — dikkat\n")
    print((s.stdout or "").strip())
    print()
    print("Bu oturum engellenmedi. Ama yukarıdaki kırmızı, bu oturumda")
    print("yapılacak işin ALTINDA duruyor — sebebi bu oturum olmayabilir,")
    print("iki oturum arası dışarıdan gelen bir düzenleme de olabilir.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)
