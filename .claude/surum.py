#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Sürüm yönetimi
===============================================================
Bu katmanın adı **Echo**. Adın sebebi işleyişinde: her çıktı bir
denetimden geri döner, her hata bir teste geri döner, her ölçüm sistemin
kendisine geri döner. Yankı gibi — söylediğin şey sana geri gelir ve
doğru olup olmadığını orada anlarsın.

## Sürüm kuralı

    v1.1  →  v1.1.1  →  v1.1.2  →  …  →  v1.1.9  →  v1.2
                                                      │
    v1.2  →  v1.2.1  →  …  →  v1.2.9  →  v1.3        │
                                                      ▼
    …  v1.9.9  →  v2.0

Yama numarası 9'a ulaştıktan sonraki güncelleme minör sürümü artırır ve
yamayı sıfırlar. Minör 9'dan sonra da majör artar.

Bu kural yazıyla değil kodla tutuluyor — bu sistemin baştan beri tek
alışkanlığı bu: kural bir yerde yazı olarak durursa, uygulanacağı an
uygulamak istemeyen tarafın elindedir.

    python3 .claude/surum.py goster
    python3 .claude/surum.py yukselt --ne "ilerleme denetçisi eklendi"
    python3 .claude/surum.py gecmis
"""

import argparse
import json
import os
import sys
from datetime import date

KLASOR = os.path.dirname(os.path.abspath(__file__))
DOSYA = os.path.join(KLASOR, "surum.json")

AD = "Echo"
EN_FAZLA = 9


def oku():
    if not os.path.exists(DOSYA):
        return {"majör": 1, "minör": 1, "yama": 0, "gecmis": []}
    try:
        with open(DOSYA, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError):
        return {"majör": 1, "minör": 1, "yama": 0, "gecmis": []}


def yaz(d):
    with open(DOSYA, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def metin(d):
    """v1.1 ya da v1.1.3 — yama sıfırsa yazılmaz."""
    if d["yama"]:
        return f"v{d['majör']}.{d['minör']}.{d['yama']}"
    return f"v{d['majör']}.{d['minör']}"


def sonraki(d):
    """Kuralı uygular: yama 9'u geçemez, taşarsa minör artar."""
    y = dict(d)
    if y["yama"] < EN_FAZLA:
        y["yama"] += 1
        return y, "yama"
    y["yama"] = 0
    if y["minör"] < EN_FAZLA:
        y["minör"] += 1
        return y, "minör"
    y["minör"] = 0
    y["majör"] += 1
    return y, "majör"


def goster(a):
    d = oku()
    print(f"{AD} {metin(d)}")
    if a.sade:
        return 0
    _, tur = sonraki(d)
    y, _ = sonraki(d)
    print(f"sonraki güncelleme → {metin(y)}  ({tur} artışı)")
    if d["gecmis"]:
        son = d["gecmis"][-1]
        print(f"son değişiklik    → {son['surum']}: {son['ne']} ({son['tarih']})")
    return 0


def yukselt(a):
    d = oku()
    onceki = metin(d)
    y, tur = sonraki(d)
    y.setdefault("gecmis", [])
    y["gecmis"].append({
        "surum": metin(y),
        "ne": a.ne,
        "tarih": date.today().isoformat(),
    })
    yaz(y)

    print(f"{AD} {onceki} → {metin(y)}   ({tur} artışı)")
    print(f"  {a.ne}")
    if tur != "yama":
        print(f"\nYama 9'u doldurdu, {tur} artırıldı ve yama sıfırlandı.")
    print("\nBelgelerdeki sürüm numarasını da güncelle — `dogrula.py` "
          "uyuşmazlığı yakalar.")
    return 0


def gecmis(a):
    d = oku()
    if not d.get("gecmis"):
        print(f"{AD} {metin(d)} — henüz kayıtlı değişiklik yok.")
        return 0
    print(f"{AD} sürüm geçmişi (güncelden eskiye)\n")
    for k in reversed(d["gecmis"][-a.son:]):
        print(f"  {k['surum']:10} {k['tarih']}   {k['ne']}")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description=f"{AD} sürüm yönetimi.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("goster", help="şu anki sürüm")
    p.add_argument("--sade", action="store_true", help="sadece ad ve numara")
    p.set_defaults(islev=goster)

    p = alt.add_parser("yukselt", help="sürümü kurala göre artır")
    p.add_argument("--ne", required=True, help="bu sürümde ne değişti")
    p.set_defaults(islev=yukselt)

    p = alt.add_parser("gecmis", help="sürüm geçmişi")
    p.add_argument("--son", type=int, default=15)
    p.set_defaults(islev=gecmis)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
