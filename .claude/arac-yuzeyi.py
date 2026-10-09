#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Araç yüzeyi: hangi araç hiç çağrılmıyor, hangisi karıştırılıyor
===============================================================
`.claude/` altında 40'tan fazla betik ve 27 ajan var. Araç sınavı her
aracın DOĞRU çalıştığını ölçüyor; araç SAYISININ maliyetini ölçen yoktu.
Kaynak: Anthropic, "Writing effective tools for agents" (2025-09-11) —
daha çok araç her zaman daha iyi sonuç vermez; benzer araçlar birbirine
karıştırılır.

Veri `kanca-arac.py`'nin tuttuğu `arac-sayac.json`'dan gelir.

## Ne söyler, ne söylemez

· **Hiç çağrılmayan** araç: birleştirme ya da belge adayı. SİLME
  önerilmez — az kullanılan ama kritik bir araç (devre kesici, bekçi)
  tam da nadiren çağrıldığı için değerlidir. Kullanıma bakarak budamak,
  ajanın zaten sevdiği araçları ödüllendirir.
· **Dolaylı** araç sayılmaz: kancaların, CI iş akışının, kapıların, slash
  komutlarının ya da başka bir aracın çağırdığı araç Bash'te hiç
  görünmeyebilir; bu kullanılmadığı anlamına gelmez.
· **Sık yanlış çağrılan** araç: argparse kullanım hatası oranı yüksek —
  adı ya da arayüzü karışıyor olabilir.
· Veri azken HİÇBİR karar vermez: eşikten az oturum birikmişse yalnız
  tabloyu basar ve "erken" der.

## Çıkış kodu

    0  aday yok, ya da veri yetersiz (karar için erken)
    3  insan bakmalı: hiç çağrılmayan ya da sık karıştırılan araç var
"""

import argparse
import glob
import json
import os
import re
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
SAYAC = os.path.join(KLASOR, "arac-sayac.json")

EN_AZ_OTURUM = 10       # bundan az oturumla "hiç çağrılmadı" gürültüdür
YANLIS_ORAN = 0.3       # çağrıların en az %30'u kullanım hatasıysa
YANLIS_EN_AZ = 5        # ...ve en az 5 çağrı varsa

# Sınav dosyaları her aracı adıyla anar; onları "çağıran" saymak her aracı
# dolaylı yapardı.
SINAVLAR = {"arac-sinavi.py", "sinav.py", "mutasyon.py", "ablasyon.py"}


def araclar():
    return sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(KLASOR, "*.py")))


def dolayli_cagiranlar(ad):
    """Aracı Bash dışında çağıran yerler."""
    kaynaklar = [os.path.join(KLASOR, "settings.json"), os.path.join(KLASOR, "olay.py"),
                 os.path.join(KLASOR, "kapi.py")]
    kaynaklar += glob.glob(os.path.join(KOK, ".github", "workflows", "*.yml"))
    kaynaklar += glob.glob(os.path.join(KLASOR, "commands", "*.md"))
    kaynaklar += [p for p in glob.glob(os.path.join(KLASOR, "*.py"))
                  if os.path.basename(p) not in SINAVLAR | {ad + ".py"}]
    desen = re.compile(rf'(["/\s]{re.escape(ad)}\.py\b|^\s*import {re.escape(ad)}\b)', re.M)
    bulunan = []
    for yol in dict.fromkeys(kaynaklar):
        try:
            if desen.search(open(yol, encoding="utf-8").read()):
                bulunan.append(os.path.relpath(yol, KOK))
        except OSError:
            pass
    return bulunan


def main(argv=None):
    p = argparse.ArgumentParser(description="Araç yüzeyi raporu.")
    p.add_argument("--sayac", default=SAYAC)
    a = p.parse_args(argv)

    try:
        d = json.load(open(a.sayac, encoding="utf-8"))
    except (OSError, ValueError):
        d = {}
    oturum = (d.get("oturum") or {}).get("sayi", 0)
    tablo = d.get("araclar") or {}

    print(f"ARAÇ YÜZEYİ — {oturum} oturum kayıtlı, {len(tablo)} araç çağrılmış\n")
    for ad, k in sorted(tablo.items(), key=lambda x: -x[1].get("cagri", 0)):
        print(f"  {ad:<16} {k.get('cagri', 0):>5} çağrı  {k.get('yanlis', 0):>3} yanlış  "
              f"{k.get('oturum', 0):>3} oturum")

    if oturum < EN_AZ_OTURUM:
        print(f"\nVERİ YETERSİZ — {oturum} oturum (eşik {EN_AZ_OTURUM}). Karar için erken; "
              "hiçbir araç aday gösterilmedi.")
        return 0

    cagrilmayan = []
    for ad in araclar():
        if ad in tablo or ad.startswith("kanca"):
            continue
        if not dolayli_cagiranlar(ad):
            cagrilmayan.append(ad)
    karisan = [(ad, k) for ad, k in tablo.items()
               if k.get("cagri", 0) >= YANLIS_EN_AZ
               and k.get("yanlis", 0) / k["cagri"] >= YANLIS_ORAN]

    for ad in cagrilmayan:
        print(f"ÇAĞRILMADI  {ad}.py — {oturum} oturumda hiç, dolaylı çağıranı da yok. "
              "Birleştirme ya da belge adayı; silme önerilmez.")
    for ad, k in karisan:
        print(f"KARIŞIYOR   {ad}.py — {k['yanlis']}/{k['cagri']} çağrı kullanım hatası. "
              "Adı ya da arayüzü karışıyor olabilir.")
    if cagrilmayan or karisan:
        return 3
    print("\nAday yok.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
