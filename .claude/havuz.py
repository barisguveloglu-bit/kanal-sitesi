#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Görev havuzu ve değişken kadro
===============================================================
Orkestranın eksik parçası: **kaç ajan?** ve **hangi görevler aynı ajana?**

    [ CEO / Barış ] ──▶ [ Görev Havuzu ]
                              │  zorluk + paylaşılan kaynak
                    ┌─────────┴─────────┐
                    ▼                   ▼
              [ 1-9 ajan ]   ya da  [ 10 ajan ]
                    └─────────┬─────────┘
                              ▼  çıktılar birleşir
                       [ Codex — sunum ]
                              ▼
                      [ Opus 5 kontrolü ]
                       │hata│        │temiz│
                       ▼    │        ▼
                   revizyon─┘    [ Barış ]

## İki karar, ikisi de mekanik

**1. Hangi görevler aynı ajana gider.** Aynı dosyaya dokunan iki görev ayrı
ajanlara verilirse çakışırlar: ikisi de aynı satırı değiştirir, biri
diğerini ezer, ve bunu ancak birleştirmede fark edersin. Bu yüzden
**paylaşılan kaynak = aynı ajan**. Görev tipi bunu belirler, kadro değil.

Bağımsız görevler ise bölünebilir — birbirini beklemezler.

**2. Kaç ajan.** Zorluk toplamı kadro büyüklüğünü belirler. Sınır 10:
daha fazlası ne bu deponun işine yeter ne de birleştirmesi mümkün olur.
Alt sınır 1 — tek dosyalık küçük iş için orkestra kurmak, orkestranın
kendi belgesindeki uyarıya düşmek olur.

Sayı **keyfî değil ama ölçülmüş de değil**; bir kapasite kararı ve öyle
olduğu burada yazıyor. Kapasite: bir ajan en fazla `AJAN_KAPASITESI`
zorluk puanı taşır.

    python3 .claude/havuz.py ekle --is "<görev>" --zorluk 3 --kaynak assets/js/data.js
    python3 .claude/havuz.py kadro
    python3 .claude/havuz.py dagit
    python3 .claude/havuz.py birlestir --rapor r1.md r2.md
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
HAVUZ = os.path.join(KLASOR, "havuz.json")

EN_FAZLA_AJAN = 10
AJAN_KAPASITESI = 5     # bir ajanın taşıyabileceği toplam zorluk puanı
ZORLUK = {1: "önemsiz", 2: "kolay", 3: "orta", 4: "zor", 5: "çok zor"}


def oku():
    if not os.path.exists(HAVUZ):
        return {"gorevler": []}
    try:
        with open(HAVUZ, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError):
        return {"gorevler": []}


def yaz(d):
    with open(HAVUZ, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def ekle(a):
    if a.zorluk not in ZORLUK:
        print(f"Zorluk 1-5 arası olmalı. ({', '.join(f'{k}={v}' for k, v in ZORLUK.items())})")
        return 2
    d = oku()
    d["gorevler"].append({
        "is": a.is_,
        "zorluk": a.zorluk,
        "kaynak": sorted(set(a.kaynak or [])),
        "mod": a.mod,
        "eklendi": datetime.now().isoformat(timespec="seconds"),
    })
    yaz(d)
    print(f"Havuza eklendi ({ZORLUK[a.zorluk]}, {len(d['gorevler'])} görev).")
    if not a.kaynak:
        print("  UYARI: kaynak verilmedi. Kaynaksız görev hiçbir görevle "
              "gruplanamaz — çakışma riski varsa `--kaynak` ver.")
    return 0


def kumeler(gorevler):
    """Paylaşılan kaynağa göre grupla — birleşik bulma (union-find).

    Aynı dosyaya dokunan görevler AYNI ajana gitmeli. İki ajan aynı satırı
    değiştirirse biri diğerini ezer ve bu ancak birleştirmede görünür.
    Zincirleme de sayılır: A ve B `data.js`'i, B ve C `app.js`'i
    paylaşıyorsa üçü de aynı kümededir.
    """
    ata = list(range(len(gorevler)))

    def kok(i):
        while ata[i] != i:
            ata[i] = ata[ata[i]]
            i = ata[i]
        return i

    for i in range(len(gorevler)):
        for j in range(i + 1, len(gorevler)):
            ortak = set(gorevler[i]["kaynak"]) & set(gorevler[j]["kaynak"])
            if ortak:
                ata[kok(i)] = kok(j)

    grup = {}
    for i in range(len(gorevler)):
        grup.setdefault(kok(i), []).append(i)
    return list(grup.values())


def kadro_kur(gorevler):
    """Kümeleri ajanlara dağıt. Küme BÖLÜNMEZ; ajan sayısı zorluğa göre."""
    kume_listesi = kumeler(gorevler)
    # Ağırdan hafife: büyük kümeler önce yerleşsin (ilk-uyan-azalan).
    kume_listesi.sort(key=lambda k: -sum(gorevler[i]["zorluk"] for i in k))

    ajanlar = []
    for kume in kume_listesi:
        agirlik = sum(gorevler[i]["zorluk"] for i in kume)
        yerlesti = False
        for ajan in ajanlar:
            if ajan["agirlik"] + agirlik <= AJAN_KAPASITESI:
                ajan["gorevler"] += kume
                ajan["agirlik"] += agirlik
                yerlesti = True
                break
        if not yerlesti:
            if len(ajanlar) >= EN_FAZLA_AJAN:
                # Kadro doldu: en hafif ajana ekle. Kapasiteyi aşmak,
                # kümeyi bölmekten iyidir — bölmek çakışma üretir.
                en_hafif = min(ajanlar, key=lambda x: x["agirlik"])
                en_hafif["gorevler"] += kume
                en_hafif["agirlik"] += agirlik
            else:
                ajanlar.append({"gorevler": list(kume), "agirlik": agirlik})
    return ajanlar


def kadro(a):
    d = oku()
    g = d["gorevler"]
    if not g:
        print("Havuz boş. `ekle` ile görev koy.")
        return 0

    ajanlar = kadro_kur(g)
    toplam = sum(x["zorluk"] for x in g)
    print(f"HAVUZ — {len(g)} görev, toplam zorluk {toplam}")
    print(f"KADRO — {len(ajanlar)} ajan "
          f"(kapasite {AJAN_KAPASITESI}/ajan, tavan {EN_FAZLA_AJAN})\n")

    for n, ajan in enumerate(ajanlar, 1):
        birlesme = " [aynı kaynağı paylaşıyor]" if len(ajan["gorevler"]) > 1 else ""
        print(f"  Ajan {n}  (zorluk {ajan['agirlik']}){birlesme}")
        for i in ajan["gorevler"]:
            gorev = g[i]
            kaynak = ", ".join(gorev["kaynak"]) or "—"
            print(f"    · [{ZORLUK[gorev['zorluk']]}] {gorev['is'][:64]}")
            print(f"      kaynak: {kaynak}   yetki: {gorev['mod']}")
        print()

    # Kapasiteyi aşan küme SESSİZ KALMAMALI. Küme bölünemez (aynı kaynağa
    # dokunuyorlar) ama "bu ajan iki katı yük taşıyor" bilgisi kararı
    # değiştirir: ya görev daha küçük parçalara ayrılır ya da beklenti
    # düşürülür. Sessizce yüklemek, birleştirmede sürpriz üretir.
    asanlar = [(n, x) for n, x in enumerate(ajanlar, 1)
               if x["agirlik"] > AJAN_KAPASITESI]
    if asanlar:
        print("KAPASİTE AŞIMI — bölünemeyen küme:")
        for n, x in asanlar:
            print(f"  Ajan {n}: zorluk {x['agirlik']} > kapasite {AJAN_KAPASITESI} "
                  f"({len(x['gorevler'])} görev, aynı kaynağı paylaşıyorlar)")
        print("  Küme bölünemez; bölmek çakışma üretir. Görevleri daha küçük "
              "tanımlamak ya da beklentiyi düşürmek gerekir.\n")

    tekil = [x for x in ajanlar if len(x["gorevler"]) == 1]
    print(f"{len(ajanlar) - len(tekil)} ajan birden çok görev taşıyor "
          f"(paylaşılan kaynak yüzünden), {len(tekil)} ajan tek görev.")
    if len(ajanlar) == 1:
        print("\nTek ajan çıktı — orkestraya gerek yok, `/dongu` yeter.")
    return 0


def dagit(a):
    """Her ajan için sözleşmeli brief üret. Elle yazılmaz, üretilir."""
    d = oku()
    g = d["gorevler"]
    if not g:
        print("Havuz boş.", file=sys.stderr)
        return 1
    ajanlar = kadro_kur(g)

    for n, ajan in enumerate(ajanlar, 1):
        gorevler = [g[i] for i in ajan["gorevler"]]
        konu = " / ".join(x["is"] for x in gorevler)
        mod = "yazma" if any(x["mod"] == "yazma" for x in gorevler) else "okuma"
        s = subprocess.run(
            [sys.executable, os.path.join(KLASOR, "gorev.py"), "brief",
             "--konu", konu[:300], "--mod", mod],
            cwd=KOK, capture_output=True, text=True, timeout=120)

        print(f"\n{'=' * 70}\nAJAN {n} / {len(ajanlar)}   (zorluk {ajan['agirlik']}, "
              f"{len(gorevler)} görev)\n{'=' * 70}\n")
        print(s.stdout.strip())
        print("\n## Bu ajanın görevleri\n")
        for k, gorev in enumerate(gorevler, 1):
            print(f"{k}. {gorev['is']}")
            print(f"   Dosyalar: {', '.join(gorev['kaynak']) or 'belirtilmedi'}")
        if len(gorevler) > 1:
            print("\nBu görevler **aynı ajana** verildi çünkü aynı dosyalara "
                  "dokunuyorlar. Ayrı ajanlara verilseydi biri diğerinin "
                  "değişikliğini ezerdi ve bu ancak birleştirmede görünürdü.")
    return 0


def birlestir(a):
    """Raporları mekanik denetle: atıflar geçerli mi, boşluk var mı."""
    if not a.rapor:
        print("Rapor dosyası verilmedi.", file=sys.stderr)
        return 1

    kusurlu, okunan = [], 0
    for yol in a.rapor:
        if not os.path.exists(yol):
            kusurlu.append(f"{yol}: dosya yok")
            continue
        okunan += 1
        s = subprocess.run(
            [sys.executable, os.path.join(KLASOR, "gorev.py"), "dogrula",
             "--rapor", yol],
            cwd=KOK, capture_output=True, text=True, timeout=180)
        if s.returncode != 0:
            for satir in (s.stdout or "").splitlines():
                if satir.strip().startswith("KUSUR"):
                    kusurlu.append(f"{os.path.basename(yol)}: {satir.strip()[:110]}")

    print(f"BİRLEŞTİRME — {okunan}/{len(a.rapor)} rapor okundu\n")
    if kusurlu:
        print(f"{len(kusurlu)} kusur — bu raporlar Codex'e SUNUMA GİTMEZ:\n")
        for k in kusurlu[:12]:
            print(f"  · {k}")
        print("\nDayanağı denetlenmemiş rapor delil değildir. İlgili ajana "
              "geri gönder; devre kesiciyi unutma:")
        print("  python3 .claude/devre.py dene --halka orkestra --sinir 2")
        return 1

    print("Bütün raporların atıfları geçerli.")
    print("\nSıradaki adım — Codex sunumu:")
    print("  python3 .claude/disajan.py sohbet --konu \"<derleme>\" ...")
    print("Sunum geldikten sonra kontrol: `disajan.py kapi` ya da `dogrula.py`.")
    return 0


def temizle(a):
    yaz({"gorevler": []})
    print("Havuz boşaltıldı.")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Görev havuzu ve değişken kadro.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("ekle", help="havuza görev koy")
    p.add_argument("--is", dest="is_", required=True)
    p.add_argument("--zorluk", type=int, required=True, help="1-5")
    p.add_argument("--kaynak", nargs="*", help="dokunacağı dosyalar")
    p.add_argument("--mod", choices=("okuma", "yazma"), default="okuma")
    p.set_defaults(islev=ekle)

    p = alt.add_parser("kadro", help="kaç ajan, hangi görev kimde")
    p.set_defaults(islev=kadro)

    p = alt.add_parser("dagit", help="her ajan için sözleşmeli brief üret")
    p.set_defaults(islev=dagit)

    p = alt.add_parser("birlestir", help="raporları mekanik denetle")
    p.add_argument("--rapor", nargs="*", required=True)
    p.set_defaults(islev=birlestir)

    p = alt.add_parser("temizle", help="havuzu boşalt")
    p.set_defaults(islev=temizle)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
