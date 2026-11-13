#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Ortak pano (paralel ajanların koordinasyonu)
===============================================================
"Şu an kim neye bakıyor?"

## Boşluk neydi

`havuz.py` işi BAŞTA bölüyor: aynı dosyaya dokunan görevleri aynı ajana
veriyor. Ama iş başladıktan sonra paralel ajanlar birbirini göremiyordu.
Bir ajan kendi alanının dışına taşarsa ya da iki ajan aynı dosyaya
kendiliğinden yönelirse, bunu birleştirmede — yani çok geç — fark
ediyorduk.

Bir videodan alınan fikir: her ajan baktığı alanı ortak bir yere yazar,
başkası o alanı tutuyorsa üstüne gitmez.

## Kimlik adresten

Çakışma KELİMEYLE değil ADRESLE ölçülüyor: iki alan aynı yolsa ya da biri
diğerinin altındaysa (`assets/` ile `assets/js/data.js`) çakışır. Ders
defterindeki ders: kelime seçerek kimlik üretmek tahmindir, adres
doğrulanabilir.

## Nerede duruyor

Pano koşuya özel, `.claude/pano.jsonl` — `.gitignore`'da. Salt okunur
ajanlar da yazabiliyor: depoyu değiştirmiyor, `git status` temiz kalıyor.
Kalıcı bilgi buraya değil, ders ve iz defterine yazılır.

    python3 .claude/pano.py al --ajan A --alan assets/js/data.js
    python3 .claude/pano.py not --ajan A --metin "satır 120-240 bitti"
    python3 .claude/pano.py oku
    python3 .claude/pano.py bitir --ajan A
    python3 .claude/pano.py temizle

Çıkış kodu: 0 tamam · 1 alan başka ajanda (üstüne gitme)
"""

import argparse
import datetime
import json
import os
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
PANO = os.path.join(KLASOR, "pano.jsonl")


def oku():
    if not os.path.exists(PANO):
        return []
    with open(PANO, encoding="utf-8") as f:
        return [json.loads(s) for s in f if s.strip()]


def ekle(kayit):
    kayit["zaman"] = datetime.datetime.now().isoformat(timespec="seconds")
    with open(PANO, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")


def sade(yol):
    return os.path.normpath(yol.strip()).replace("\\", "/").lstrip("./") or "."


def cakisir(a, b):
    a, b = sade(a), sade(b)
    return a == b or a.startswith(b + "/") or b.startswith(a + "/") or "." in (a, b)


def acik_alanlar():
    """Tutulan ve henüz bırakılmamış alanlar: ajan → [alan]."""
    acik = {}
    for k in oku():
        if k["tur"] == "al":
            acik.setdefault(k["ajan"], []).append(k["alan"])
        elif k["tur"] == "bitir":
            acik.pop(k["ajan"], None)
    return acik


def k_al(a):
    for ajan, alanlar in acik_alanlar().items():
        if ajan == a.ajan:
            continue
        for alan in alanlar:
            if cakisir(alan, a.alan):
                print(f"ÇAKIŞMA — '{a.alan}' alanını {ajan} tutuyor ({alan}).")
                print("Üstüne gitme: aynı yerde çalışan iki ajan birbirinin")
                print("işini ezer. Raporunda söyle, karar şefin.")
                return 1
    ekle({"tur": "al", "ajan": a.ajan, "alan": sade(a.alan)})
    print(f"{a.ajan} → {sade(a.alan)}")
    return 0


def k_not(a):
    ekle({"tur": "not", "ajan": a.ajan, "metin": a.metin})
    print("not düşüldü")
    return 0


def k_bitir(a):
    ekle({"tur": "bitir", "ajan": a.ajan})
    print(f"{a.ajan} alanlarını bıraktı")
    return 0


def k_oku(a):
    kayitlar = oku()
    if not kayitlar:
        print("Pano boş.")
        return 0
    acik = acik_alanlar()
    if acik:
        print("TUTULAN ALANLAR")
        for ajan, alanlar in sorted(acik.items()):
            print(f"  {ajan:<22} {', '.join(alanlar)}")
    notlar = [k for k in kayitlar if k["tur"] == "not"]
    if notlar:
        print("\nNOTLAR")
        for k in notlar[-20:]:
            print(f"  {k['zaman'][11:]}  {k['ajan']:<20} {k['metin']}")
    return 0


def k_temizle(a):
    if os.path.exists(PANO):
        os.remove(PANO)
    print("Pano temizlendi.")
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(description="Paralel ajanlar için ortak pano.")
    alt = p.add_subparsers(dest="komut", required=True)
    x = alt.add_parser("al"); x.add_argument("--ajan", required=True)
    x.add_argument("--alan", required=True); x.set_defaults(f=k_al)
    x = alt.add_parser("not"); x.add_argument("--ajan", required=True)
    x.add_argument("--metin", required=True); x.set_defaults(f=k_not)
    x = alt.add_parser("bitir"); x.add_argument("--ajan", required=True)
    x.set_defaults(f=k_bitir)
    alt.add_parser("oku").set_defaults(f=k_oku)
    alt.add_parser("temizle").set_defaults(f=k_temizle)
    a = p.parse_args(argv)
    return a.f(a)


if __name__ == "__main__":
    sys.exit(main())
