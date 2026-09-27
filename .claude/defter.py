#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — İş ve karar defteri
===============================================================
"Neyi yarım bıraktık, neyi neden reddettik?"

## Boşluk neydi

Yarım kalan iş `butce.py kilometre` ve `hedef.py` ile tutuluyordu; ikisinin
dosyası da `.gitignore`'da, oturum bitince siliniyordu. Ders defteri
HATAYI tutuyor, KARARI tutmuyor. Dört ayrı dış kaynak aynı boşluğu
gösterdi: yarım iş listesi (Backlog.md), reddedileni gerekçesiyle tutan
hafıza, "ilgili geçmiş karar geri çağrılmıyor". Bu oturumda da yaşandı:
kararı verilmemiş öneriler yeni oturumda bilinmeden yeniden gelirdi.

## Sözleşme

`is-defteri.jsonl` **kalıcı ve depoda.** Her kayıt bir durum taşır:

    acik        yapılacak
    yarim       başlandı, bitmedi — `--devam` (nereden sürecek) zorunlu
    askida      insan kararı bekliyor
    reddedildi  `--gerekce` zorunlu: gerekçesiz ret, yeniden önerilmeyi
                engelleyemez — neden reddedildiği bilinmezse tekrar denenir
    bitti       kapandı

`oner "<fikir>"` reddedilmiş bir kayda benziyorsa **çıkış 3** verir
(insan kapısı): ret bir kez gerekçelendi, yeniden açmak insan kararı.
Benzerlik kelime örtüşmesiyle ölçülür — tahmindir, o yüzden kapı değil
insana soru.

    python3 .claude/defter.py ekle --baslik "..." --durum yarim --devam "..."
    python3 .claude/defter.py guncelle --no 3 --durum reddedildi --gerekce "..."
    python3 .claude/defter.py oner "yeni fikir"
    python3 .claude/defter.py liste [--hepsi]
    python3 .claude/defter.py ozet          (oturum açılışı)

Çıkış kodu: 0 tamam · 1 geçersiz istek · 3 reddedilmiş fikre benziyor
"""

import argparse
import json
import os
import re
import sys
from datetime import date

KLASOR = os.path.dirname(os.path.abspath(__file__))
DEFTER = os.path.join(KLASOR, "is-defteri.jsonl")
DURUMLAR = ("acik", "yarim", "askida", "reddedildi", "bitti")
ACIK = ("yarim", "askida", "acik")
BENZERLIK_ESIGI = 0.5


def oku():
    if not os.path.exists(DEFTER):
        return []
    kayit = []
    with open(DEFTER, encoding="utf-8") as f:
        for s in f:
            try:
                kayit.append(json.loads(s))
            except json.JSONDecodeError:
                continue
    return kayit


def yaz(kayitlar):
    # Yerinde güncelleme: geçerli hâli TEK dosya tutar (ders 25 —
    # ekleme günlüğünü ham okuyan her yer kaydı iki kez sayar).
    with open(DEFTER, "w", encoding="utf-8") as f:
        for k in kayitlar:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")


def kokler(metin):
    metin = metin.replace("İ", "i").replace("I", "ı").lower()
    return {k[:5] for k in re.findall(r"[a-zçğıöşü0-9]+", metin) if len(k) > 2}


def benzerlik(a, b):
    ka, kb = kokler(a), kokler(b)
    return len(ka & kb) / len(ka) if ka else 0.0


def dogrula(durum, gerekce, devam):
    if durum not in DURUMLAR:
        return f"bilinmeyen durum: {durum} ({', '.join(DURUMLAR)})"
    if durum == "reddedildi" and not (gerekce or "").strip():
        return ("reddedildi: --gerekce zorunlu. Gerekçesiz ret, fikrin "
                "yeniden önerilmesini engelleyemez.")
    if durum == "yarim" and not (devam or "").strip():
        return "yarim: --devam zorunlu (sonraki oturum nereden sürecek?)"
    return None


def ekle(a):
    hata = dogrula(a.durum, a.gerekce, a.devam)
    if hata:
        print(hata)
        return 1
    kayitlar = oku()
    no = max((k["no"] for k in kayitlar), default=0) + 1
    k = {"no": no, "baslik": a.baslik, "durum": a.durum,
         "tarih": date.today().isoformat()}
    if a.gerekce:
        k["gerekce"] = a.gerekce
    if a.devam:
        k["devam"] = a.devam
    kayitlar.append(k)
    yaz(kayitlar)
    print(f"[{no}] {a.durum}: {a.baslik}")
    return 0


def guncelle(a):
    kayitlar = oku()
    hedef = next((k for k in kayitlar if k["no"] == a.no), None)
    if hedef is None:
        print(f"[{a.no}] diye bir kayıt yok.")
        return 1
    hata = dogrula(a.durum, a.gerekce or hedef.get("gerekce"),
                   a.devam or hedef.get("devam"))
    if hata:
        print(hata)
        return 1
    hedef["durum"] = a.durum
    hedef["tarih"] = date.today().isoformat()
    for alan in ("gerekce", "devam"):
        if getattr(a, alan):
            hedef[alan] = getattr(a, alan)
    yaz(kayitlar)
    print(f"[{a.no}] → {a.durum}")
    return 0


def oner(a):
    eslesen = [(benzerlik(a.fikir, k["baslik"]), k) for k in oku()
               if k["durum"] == "reddedildi"]
    eslesen = sorted([e for e in eslesen if e[0] >= BENZERLIK_ESIGI],
                     key=lambda e: -e[0])
    if not eslesen:
        print("Reddedilmiş bir kayda benzemiyor.")
        return 0
    print("REDDEDİLMİŞ FİKRE BENZİYOR — yeniden açmak insan kararı:\n")
    for oran, k in eslesen[:3]:
        print(f"  [{k['no']}] %{oran * 100:.0f} · {k['baslik']}")
        print(f"       gerekçe: {k['gerekce']}")
    return 3


def liste(a):
    kayitlar = [k for k in oku() if a.hepsi or k["durum"] != "bitti"]
    if not kayitlar:
        print("İş defteri boş.")
        return 0
    for k in kayitlar:
        ek = k.get("devam") or k.get("gerekce") or ""
        print(f"[{k['no']}] {k['durum']:10} {k['baslik']}"
              + (f"\n      → {ek}" if ek else ""))
    return 0


def ozet(a):
    kayitlar = oku()
    gruplar = {d: [k for k in kayitlar if k["durum"] == d] for d in DURUMLAR}
    if not any(gruplar[d] for d in ACIK) and not gruplar["reddedildi"]:
        print("İş defteri boş.")
        return 0
    print("İŞ DEFTERİ — " + " · ".join(
        f"{len(gruplar[d])} {d}" for d in DURUMLAR if gruplar[d]))
    for d in ACIK:
        for k in gruplar[d]:
            ek = k.get("devam", "")
            print(f"  [{k['no']}] {d}: {k['baslik']}"
                  + (f" → {ek}" if ek else ""))
    if gruplar["reddedildi"]:
        print(f"  ({len(gruplar['reddedildi'])} reddedilmiş fikir var — yeniden "
              "önermeden önce: defter.py oner \"<fikir>\")")
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(description="İş ve karar defteri.")
    alt = p.add_subparsers(dest="komut", required=True)

    e = alt.add_parser("ekle")
    e.add_argument("--baslik", required=True)
    e.add_argument("--durum", default="acik")
    e.add_argument("--gerekce")
    e.add_argument("--devam")
    e.set_defaults(islev=ekle)

    g = alt.add_parser("guncelle")
    g.add_argument("--no", type=int, required=True)
    g.add_argument("--durum", required=True)
    g.add_argument("--gerekce")
    g.add_argument("--devam")
    g.set_defaults(islev=guncelle)

    o = alt.add_parser("oner")
    o.add_argument("fikir")
    o.set_defaults(islev=oner)

    l = alt.add_parser("liste")
    l.add_argument("--hepsi", action="store_true")
    l.set_defaults(islev=liste)

    alt.add_parser("ozet").set_defaults(islev=ozet)

    a = p.parse_args(argv)
    return a.islev(a)


if __name__ == "__main__":
    sys.exit(main())
