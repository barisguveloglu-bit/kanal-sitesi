#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Değerlendirici-Optimize Edici döngüsü
===============================================================
Desen şu: bir taraf üretir, başka bir taraf **eleştirir**, geri bildirim
üreticiye döner, kalite eşiğe ulaşana kadar tekrarlanır.

Bu depoda zaten bir "yansıt-iyileştir" halkası vardı (KAT 4) ama iki
eksiği vardı ve ikisi de bu deseni sakat bırakıyordu:

1. **Değerlendirme ikiliydi.** `dogrula.py` ya "temiz" ya "hata" diyordu.
   İkili çıktı ilerlemeyi göstermez: 74 vakanın 60'ı temizken 70'i temiz
   olmak açık bir iyileşmedir, ama ikili ölçüm ikisine de "hata" der.
   Model kendi ilerlemesini göremediği için ya erken pes eder ya da
   kötüleştiğini fark etmeden döner.
2. **Durma koşulu sadece tur sayısıydı.** Asıl durma koşulu "puan artmıyor"
   olmalı. Üç tur boyunca aynı yerde sayan bir döngünün dördüncü turda
   çözmesi için hiçbir sebep yok — orada eksik olan şey kod değil karardır.

Bu betik ikisini de kapatıyor: **puan verir** ve **puan artmayınca durur.**

## Neden değerlendirici model değil

Bu deseni anlatan çoğu kaynak "ikinci bir model eleştirsin" der. Burada
değerlendirici bir model değil, **dış kural setinin kendisi** —
`dogrula.py` ve `butunluk.py`. Sebebi bu deponun baştan beri tek cümlesi:
yapay zekanın kendi işini beğenmesi denetim değildir. Üreten ile
değerlendireni aynı yerden çıkarırsan ikisi de aynı kör noktayı taşır;
puan yükselir, iş düzelmez.

    python3 .claude/eniyile.py tur --halka icerik
    python3 .claude/eniyile.py tur --halka icerik --aday rapor.md
    python3 .claude/eniyile.py gecmis --halka icerik
    python3 .claude/eniyile.py kapat --halka icerik

Çıkış kodu: `0` KABUL (eşik geçildi), `1` İYİLEŞTİR ya da DUR,
`3` insan kapısı (denetleyici "bilemiyorum" dedi).
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
DURUM = os.path.join(KLASOR, "eniyile-durumu.json")

VARSAYILAN_ESIK = 1.0
VARSAYILAN_TUR = 5

# Puan artmadığı kaç turdan sonra durulur. 1 fazla acımasız (bir tur
# yerinde saymak normaldir), 3 fazla cömert (iki boş tur zaten yeterli
# kanıt). Bu sayı ölçülerek değil kararla kondu ve öyle olduğu yazıyor.
KISIR_TUR_SINIRI = 2

AGIRLIK = {"kural": 0.5, "butunluk": 0.3, "dayanak": 0.2}


# ------------------------------------------------------------ değerlendiriciler

def _kos(betik, *arg, **kw):
    return subprocess.run([sys.executable, os.path.join(KLASOR, betik), *arg],
                          cwd=KOK, capture_output=True, text=True, timeout=180,
                          **kw)


def olc_kural():
    """`dogrula.py` — kural ihlali ikili kalır, çünkü kural ihlali ikilidir.

    Kısmi puan vermek yanlış olurdu: "odak halkası yarı silinmiş" diye bir
    şey yok. Ama insan kapısı (çıkış 3) hata değil, o yüzden ayrı taşınır.
    """
    s = _kos("dogrula.py", "--kisa")
    if s.returncode == 3:
        return None, ["insan kapısı: " + (s.stdout or "").strip()[:200]], True
    if s.returncode == 0:
        return 1.0, [], False
    eksik = [x.strip() for x in (s.stdout or "").splitlines()
             if x.strip().startswith("[")]
    return 0.0, eksik or ["denetim düştü"], False


def olc_butunluk():
    """`butunluk.py` — burada kısmi puan ANLAMLI: 74 vakanın kaçı tutarlı.

    İlerlemeyi görünür kılan ölçü bu. 4 bulgudan 2'sini kapatmak ikili
    ölçümde hiçbir şey değiştirmez, burada puanı 0.946'dan 0.973'e taşır.
    """
    s = _kos("butunluk.py", "--sessiz")
    if s.returncode == 0:
        return 1.0, [], False
    bulgular, son = [], (s.stdout or "").strip().splitlines()
    toplam = temiz = None
    for satir in son:
        if "vaka)" in satir and "temiz" in satir:
            try:
                parca = satir.replace("(", " ").replace(")", " ").split()
                temiz = int(parca[parca.index("temiz") - 1])
                toplam = int(parca[parca.index("vaka") - 1])
            except (ValueError, IndexError):
                pass
        if satir.strip().startswith("BULGU"):
            bulgular.append(satir.strip()[6:].strip())
    if toplam:
        return temiz / toplam, bulgular, False
    return 0.0, bulgular or ["bütünlük sınavı düştü"], False


def olc_dayanak(aday):
    """Aday metindeki iddialar canon'la gerçekten destekleniyor mu."""
    if not aday or not os.path.exists(aday):
        return None, [], False
    s = _kos("gorev.py", "dogrula", "--rapor", aday)
    if s.returncode == 0:
        return 1.0, [], False
    kusur = [x.strip() for x in (s.stdout or "").splitlines()
             if x.strip().startswith("KUSUR")]
    return 0.0, kusur or ["atıf denetimi düştü"], False


def degerlendir(olcutler, aday):
    """Seçili ölçütleri koş, ağırlıklı puanı ve eksik listesini döndür."""
    sonuc, kapi = {}, False
    for ad in olcutler:
        if ad == "kural":
            puan, eksik, k = olc_kural()
        elif ad == "butunluk":
            puan, eksik, k = olc_butunluk()
        elif ad == "dayanak":
            puan, eksik, k = olc_dayanak(aday)
        else:
            continue
        kapi = kapi or k
        if puan is not None:
            sonuc[ad] = (puan, eksik)
        elif k:
            sonuc[ad] = (0.0, eksik)

    if not sonuc:
        return 0.0, {}, kapi
    toplam_agirlik = sum(AGIRLIK[a] for a in sonuc)
    puan = sum(AGIRLIK[a] * p for a, (p, _) in sonuc.items()) / toplam_agirlik
    return puan, sonuc, kapi


# ------------------------------------------------------------------- durum

def durumu_oku():
    if not os.path.exists(DURUM):
        return {}
    try:
        with open(DURUM, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError):
        return {}


def durumu_yaz(d):
    with open(DURUM, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ------------------------------------------------------------------ komutlar

def tur(a):
    olcutler = [x.strip() for x in a.olcut.split(",") if x.strip()]
    puan, ayrinti, kapi = degerlendir(olcutler, a.aday)

    d = durumu_oku()
    halka = d.setdefault(a.halka, {"turlar": []})
    gecmis = halka["turlar"]
    onceki = gecmis[-1]["puan"] if gecmis else None

    gecmis.append({
        "puan": round(puan, 4),
        "zaman": datetime.now().isoformat(timespec="seconds"),
        "eksik": sum(len(e) for _, e in ayrinti.values()),
    })

    print(f"DEĞERLENDİRME — halka {a.halka}, tur {len(gecmis)}")
    for ad, (p, eksik) in sorted(ayrinti.items()):
        print(f"  {ad:10} {p:.3f}   ({len(eksik)} eksik)")
    ok = "—"
    if onceki is not None:
        fark = puan - onceki
        ok = f"{fark:+.3f}" if abs(fark) > 1e-9 else "değişmedi"
    print(f"  {'PUAN':10} {puan:.3f}   (önceki {onceki if onceki is None else f'{onceki:.3f}'}, {ok})")
    print(f"  {'EŞİK':10} {a.esik:.3f}\n")

    if kapi:
        # İnsan kapısı puanla çözülmez: "yanlış" değil, "doğruluğunu
        # bilemiyorum" demek. Optimize etmeye çalışmak uydurmayı ödüllendirir.
        for ad, (_, eksik) in sorted(ayrinti.items()):
            for e in eksik:
                if e.startswith("insan kapısı"):
                    print("KAPI —", e)
        print("\nBu döngüyle çözülmez. `AskUserQuestion` ile Barış'a sor.")
        durumu_yaz(d)
        return 3

    if puan >= a.esik:
        halka["sonuc"] = "kabul"
        durumu_yaz(d)
        print("KABUL — eşik geçildi. Döngü kapandı.")
        return 0

    # Kısır tur: puan artmıyorsa dördüncü turun üçüncüden farkı yok.
    kisir = 0
    for i in range(len(gecmis) - 1, 0, -1):
        if gecmis[i]["puan"] <= gecmis[i - 1]["puan"]:
            kisir += 1
        else:
            break

    print("EKSİKLER (üreticiye geri gidecek):")
    for ad, (_, eksik) in sorted(ayrinti.items()):
        for e in eksik[:6]:
            print(f"  · [{ad}] {e}")
    print()

    if len(gecmis) >= a.tur:
        halka["sonuc"] = "tur-doldu"
        durumu_yaz(d)
        print(f"DUR — {a.tur} tur doldu, eşiğe ulaşılmadı.\n"
              "Kendi başına devam etme; eksikleri Barış'a taşı.")
        return 1

    if kisir >= KISIR_TUR_SINIRI:
        halka["sonuc"] = "kisir"
        durumu_yaz(d)
        print(f"DUR — puan {kisir} turdur artmıyor.\n"
              "Burada eksik olan kod değil karardır: aynı şeyi bir daha "
              "denemek yerine neyi çözemediğini söyle.")
        return 1

    durumu_yaz(d)
    print("İYİLEŞTİR — yukarıdaki eksikleri gider ve bu komutu tekrar çalıştır.")
    return 1


def gecmis(a):
    d = durumu_oku().get(a.halka)
    if not d or not d["turlar"]:
        print(f"'{a.halka}' halkasında kayıtlı tur yok.")
        return 0
    print(f"halka {a.halka} — {len(d['turlar'])} tur")
    onceki = None
    for i, t in enumerate(d["turlar"], 1):
        ok = "" if onceki is None else f"  ({t['puan'] - onceki:+.3f})"
        print(f"  {i:2}. {t['puan']:.3f}{ok:12} {t['eksik']:>3} eksik   {t['zaman']}")
        onceki = t["puan"]
    if d.get("sonuc"):
        print(f"\nsonuç: {d['sonuc']}")
    return 0


def kapat(a):
    d = durumu_oku()
    if a.halka in d:
        del d[a.halka]
        durumu_yaz(d)
    print(f"'{a.halka}' halkası kapatıldı.")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Değerlendirici-optimize edici döngü.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("tur", help="bir değerlendirme turu koş")
    p.add_argument("--halka", required=True, help="döngünün adı")
    p.add_argument("--olcut", default="kural,butunluk",
                   help="virgülle: kural, butunluk, dayanak")
    p.add_argument("--aday", help="dayanak ölçütü için değerlendirilecek metin")
    p.add_argument("--esik", type=float, default=VARSAYILAN_ESIK)
    p.add_argument("--tur", type=int, default=VARSAYILAN_TUR)
    p.set_defaults(islev=tur)

    p = alt.add_parser("gecmis", help="halkanın puan geçmişi")
    p.add_argument("--halka", required=True)
    p.set_defaults(islev=gecmis)

    p = alt.add_parser("kapat", help="halkayı sıfırla")
    p.add_argument("--halka", required=True)
    p.set_defaults(islev=kapat)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
