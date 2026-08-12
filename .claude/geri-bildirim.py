#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Geri bildirim döngüsü
===============================================================
Bir çıktının doğruluğunu değerlendirip sonucu sisteme geri veren halka.

Burada dürüst olmak gerekiyor: model ağırlıklarını eğitemeyiz. Elimizde
GPU yok, veri yok, backend yok — ve zaten olmasına da gerek yok. Bir
ajan sisteminde geri bildirim döngüsünün gerçek karşılığı şudur:

    **Her gerçek hata, kalıcı bir teste dönüşür.**

Aynı hatayı iki kez yapmak imkânsız hâle gelir. Model öğrenmez, SİSTEM
öğrenir — ve sistemin hafızası git'te durduğu için yeni bir sohbet
açtığında da orada olur. Unutmayan taraf burasıdır.

Halka:

    çıktı → yargı (yanlıştı) → kayıt → altın sete vaka → ölçüm → düzeltme
      ↑                                                              │
      └──────────────────────────────────────────────────────────────┘

Kullanım:

    python3 .claude/geri-bildirim.py ekle \\
        --tur geri-getirme \\
        --soru "Teşup'un zaafı ne" \\
        --yanlis "Ordu derebeyi Taşmişu'yu gösterdi" \\
        --dogru "Kapalı ve dar alanda gücü kırılır" \\
        --kaynak LORE.md:201

    python3 .claude/geri-bildirim.py listele          # açık kayıtlar
    python3 .claude/geri-bildirim.py isle             # vakaya çevir
"""

import argparse
import json
import os
import re
import sys
from datetime import date

KLASOR = os.path.dirname(os.path.abspath(__file__))
DEFTER = os.path.join(KLASOR, "geri-bildirim.jsonl")
ALTIN = os.path.join(KLASOR, "altin-sorular.json")

TURLER = {
    "geri-getirme": "Arama yanlış yeri getirdi → altın sete vaka olur (otomatik).",
    "canon": "Cevap canon'a aykırıydı → LORE.md/data.js düzeltmesi gerek (insan).",
    "kural": "Kural ihlali denetimden kaçtı → dogrula.py'ye denetim gerek (insan).",
    "davranis": "Döngü yanlış davrandı → komut dosyası düzeltmesi gerek (insan).",
}


def defteri_oku():
    if not os.path.exists(DEFTER):
        return []
    kayitlar = []
    with open(DEFTER, encoding="utf-8") as f:
        for satir in f:
            satir = satir.strip()
            if satir:
                kayitlar.append(json.loads(satir))
    return kayitlar


def defteri_yaz(kayitlar):
    with open(DEFTER, "w", encoding="utf-8") as f:
        for k in kayitlar:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")


def ekle(a):
    if a.tur not in TURLER:
        print(f"Bilinmeyen tür: {a.tur}\nGeçerli: {', '.join(TURLER)}")
        return 2

    kayit = {
        "tarih": date.today().isoformat(),
        "tur": a.tur,
        "soru": a.soru or "",
        "yanlis": a.yanlis,
        "dogru": a.dogru,
        "kaynak": a.kaynak or "",
        "durum": "acik",
    }
    with open(DEFTER, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")

    print(f"Kaydedildi ({a.tur}).")
    print(TURLER[a.tur])
    if a.tur == "geri-getirme":
        print("Vakaya çevirmek için: python3 .claude/geri-bildirim.py isle")
    return 0


def listele(a):
    kayitlar = defteri_oku()
    acik = [k for k in kayitlar if k["durum"] == "acik"]
    if not kayitlar:
        print("Defter boş. Henüz kayıtlı bir hata yok.")
        return 0

    for k in kayitlar if a.hepsi else acik:
        isaret = "•" if k["durum"] == "acik" else "✓"
        print(f"{isaret} [{k['tarih']}] {k['tur']}"
              + (f" — {k['soru']}" if k["soru"] else ""))
        print(f"    yanlış: {k['yanlis']}")
        print(f"    doğru : {k['dogru']}" + (f"  ({k['kaynak']})" if k["kaynak"] else ""))

    print(f"\n{len(acik)} açık / {len(kayitlar)} toplam kayıt.")
    return 0


def isle(a):
    """Açık geri-getirme kayıtlarını altın sete kalıcı vaka olarak ekler."""
    kayitlar = defteri_oku()
    with open(ALTIN, encoding="utf-8") as f:
        altin = json.load(f)

    mevcut = {v["soru"] for v in altin["sorular"]}
    eklenen, elde = 0, []

    for k in kayitlar:
        if k["durum"] != "acik":
            continue

        if k["tur"] != "geri-getirme":
            elde.append(k)
            continue

        eslesme = re.match(r"LORE\.md:(\d+)", k.get("kaynak", ""))
        if not eslesme or not k["soru"]:
            elde.append(k)
            continue

        if k["soru"] in mevcut:
            k["durum"] = "islendi"
            continue

        altin["sorular"].append({
            "soru": k["soru"],
            "satir": int(eslesme.group(1)),
            "gercekler": [k["dogru"]],
            "_kaynak": f"geri bildirim {k['tarih']}",
        })
        k["durum"] = "islendi"
        eklenen += 1

    if eklenen:
        with open(ALTIN, "w", encoding="utf-8") as f:
            json.dump(altin, f, ensure_ascii=False, indent=2)
            f.write("\n")
        defteri_yaz(kayitlar)

    print(f"{eklenen} kayıt altın sete vaka olarak eklendi.")
    if eklenen:
        print("Şimdi ölç: python3 .claude/degerlendir.py")
        print("Yeni vaka DÜŞÜK çıkarsa doğru — henüz düzeltilmedi. "
              "Düzelt, tekrar ölç, yeşile döndür.")

    if elde:
        print(f"\n{len(elde)} kayıt otomatiğe çevrilemedi, insan işi:")
        for k in elde:
            print(f"  • [{k['tur']}] {k['yanlis'][:70]}")
            print(f"    → {TURLER.get(k['tur'], '')}")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Hataları kalıcı teste çevir.")
    alt = a.add_subparsers(dest="komut", required=True)

    e = alt.add_parser("ekle", help="yeni bir hata kaydet")
    e.add_argument("--tur", required=True, choices=list(TURLER))
    e.add_argument("--soru", default="")
    e.add_argument("--yanlis", required=True, help="sistem ne üretti")
    e.add_argument("--dogru", required=True, help="ne üretmeliydi")
    e.add_argument("--kaynak", default="", help="örn. LORE.md:201")
    e.set_defaults(islev=ekle)

    l = alt.add_parser("listele", help="kayıtları göster")
    l.add_argument("--hepsi", action="store_true", help="işlenmişleri de göster")
    l.set_defaults(islev=listele)

    i = alt.add_parser("isle", help="açık kayıtları vakaya çevir")
    i.set_defaults(islev=isle)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
