#!/usr/bin/env python3
"""Kaydedilmiş Luna yanıtlarını puanlar; model çağırmaz."""

import argparse
import json
from pathlib import Path
import sys


KOK = Path(__file__).resolve().parent


def oku(yol):
    return json.loads(yol.read_text(encoding="utf-8"))


def degerlendir(raporlar):
    beklenen = oku(KOK / "beklenen.json")
    toplam = dogru = kacan = yanlis_alarm = 0
    hatalar = []
    for rol, kusurlar in beklenen.items():
        vakalar = oku(KOK / f"{rol}.json")["vakalar"]
        kaynak = {v["id"]: v["metin"] for v in vakalar}
        if len(kaynak) != len(vakalar) or not set(kusurlar) <= kaynak.keys():
            raise ValueError(f"{rol}: cevap anahtarı/vaka kimlikleri geçersiz")
        rapor = oku(raporlar / f"{rol}.json")
        if not isinstance(rapor, list):
            raise ValueError(f"{rol}: rapor JSON dizisi olmalı")
        gorulen = set()
        rol_dogru = 0
        for kayit in rapor:
            kimlik = kayit["id"]
            if kimlik not in kaynak or kimlik in gorulen:
                hatalar.append(f"{rol}/{kimlik}: bilinmeyen veya tekrarlanan kimlik")
                continue
            gorulen.add(kimlik)
            sonuc = kayit["sonuc"]
            if sonuc not in ("kusur", "temiz"):
                hatalar.append(f"{rol}/{kimlik}: geçersiz sonuç")
                continue
            hedef = "kusur" if kimlik in kusurlar else "temiz"
            if sonuc == hedef:
                rol_dogru += 1
            else:
                kacan += hedef == "kusur"
                yanlis_alarm += hedef == "temiz"
                hatalar.append(f"{rol}/{kimlik}: {hedef} beklenirken {sonuc}")
            alinti = kayit.get("alinti")
            if not isinstance(alinti, str) or not alinti.strip() or alinti not in kaynak[kimlik]:
                hatalar.append(f"{rol}/{kimlik}: alıntı vaka metninde bulunamadı")
            aciklama = kayit.get("aciklama")
            if not isinstance(aciklama, str) or not aciklama.strip():
                hatalar.append(f"{rol}/{kimlik}: açıklama eksik")
        for kimlik in sorted(kaynak.keys() - gorulen):
            hatalar.append(f"{rol}/{kimlik}: yanıt eksik")
        toplam += len(kaynak)
        dogru += rol_dogru
        print(f"{rol}: {rol_dogru}/{len(kaynak)} doğru sınıflandırma")
    print(f"ÖZET: {dogru}/{toplam} doğru; kaçan {kacan}; yanlış alarm {yanlis_alarm}")
    for hata in hatalar:
        print(f"HATA: {hata}")
    return 1 if hatalar else 0


def main():
    ayr = argparse.ArgumentParser(description=__doc__)
    ayr.add_argument("--raporlar", type=Path, default=KOK / "raporlar")
    args = ayr.parse_args()
    try:
        return degerlendir(args.raporlar)
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as hata:
        print(f"Değerlendirme çalışmadı: {hata}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
