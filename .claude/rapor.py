#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Rapor okuyucu (özyinelemeli okuma)
===============================================================
Ajan raporlarını **modelin penceresine yüklemeden** sorgulamak.

## Boşluk neydi

26 ajan koşturulduğunda ortaya 26 rapor çıkıyor. Bunları kabuktan
okumak yasaklandı çünkü bağlamı taşırıyordu — ve taşan bağlam sessizce
kötüleşir: model hata vermez, sadece sinyale daha az dikkat eder.

Yasak doğruydu ama yerine bir şey konmamıştı. Raporlar okunmadığı için
`ozetleyici` ajanına devrediliyordu; o da aynı pencere sınırına
çarpıyordu, sadece başka bir yerde.

## Fikir

Veriyi modele yükleme — **dış ortamda değişken olarak tut, programlı
sorgula.** Bu depoda zaten iki yerde uygulanıyor:

  · `okuyucu.py`  `data.js`'i modele okutmaz, Python'da ayrıştırır
  · `ara.py`      LORE'u yüklemez, BM25 ile sorgular, satır döndürür

Bu araç aynı ilkeyi ajan raporlarına uyguluyor ve bir adım ekliyor:
**özyineleme.** Büyük bir rapor parçalara ayrılır, her parça ayrı ayrı
sorgulanır, sonuç birleşir. Model hiçbir zaman tamamını görmez.

## Ne DÖNDÜRMEZ

Serbest özet döndürmez. `seyir.py`'deki ile aynı gerekçe: serbest
özetleyici neyin önemli olduğunu bilmez ve tam da sonradan lazım olacak
şeyi atar. Burada dönen şey **adresli parça**: hangi rapor, hangi satır.
Okuyan gider bakar.

    python3 .claude/rapor.py al --dosya /tmp/canon.md /tmp/kurgu.md
    python3 .claude/rapor.py liste
    python3 .claude/rapor.py ara "kademe"
    python3 .claude/rapor.py bulgular
    python3 .claude/rapor.py ortak
    python3 .claude/rapor.py parca --rapor canon --no 2
    python3 .claude/rapor.py unut

Çıkış kodu: 0 temiz · 1 sorun var.
"""

import argparse
import json
import math
import os
import re
import shutil
import sys
import unicodedata

KLASOR = os.path.dirname(os.path.abspath(__file__))
DEPO = os.path.join(KLASOR, "rapor-deposu")

# Bir parçanın satır sayısı.
#
# 120 ölçülerek seçilmedi, seçilemezdi: doğru değer modelin penceresine
# ve raporun yoğunluğuna bağlı. Seçim ilkesi şu — bir parça tek başına
# anlamlı olacak kadar büyük, birkaç parça yan yana konunca pencereyi
# doldurmayacak kadar küçük. Değiştirmek serbest, `--satir` ile.
PARCA = 120

# Bulgu sayılan satır biçimleri. Ajan raporları serbest metin ama
# sözleşme gereği her iddia bir adres taşıyor (`gorev.py`), ve adres
# taşıyan satır bulgudur.
ADRES = re.compile(r"\b([\w./-]+\.(?:md|js|css|html|py|json|xml)):(\d+)\b")


def _sade(metin):
    metin = unicodedata.normalize("NFKD", metin.lower())
    return "".join(k for k in metin if not unicodedata.combining(k))


def _kokler(metin):
    """Türkçe ekleri kabaca budayan parçalama — `ara.py` ile aynı yaklaşım."""
    kelimeler = [k for k in re.split(r"[^a-z0-9]+", _sade(metin)) if len(k) > 2]
    return [k[:6] if len(k) > 6 else k for k in kelimeler]


def depo_var():
    return os.path.isdir(DEPO)


def raporlar():
    if not depo_var():
        return {}
    cikan = {}
    for ad in sorted(os.listdir(DEPO)):
        if not ad.endswith(".txt"):
            continue
        yol = os.path.join(DEPO, ad)
        cikan[ad[:-4]] = yol
    return cikan


def satirlar(yol):
    with open(yol, encoding="utf-8") as f:
        return f.read().splitlines()


# ----------------------------------------------------------------- komutlar

def k_al(a):
    """Raporları depoya al — ve İÇERİĞİNİ BASMA.

    Buranın bütün amacı içeriği pencereye sokmamak. `al` yalnızca ölçü
    basar: kaç satır, kaç parça, kaç bulgu. İçerik depoda kalır.
    """
    os.makedirs(DEPO, exist_ok=True)
    toplam_satir = 0
    for yol in a.dosya:
        if not os.path.exists(yol):
            print(f"yok: {yol}")
            return 1
        ad = a.ad or os.path.splitext(os.path.basename(yol))[0]
        if len(a.dosya) > 1:
            ad = os.path.splitext(os.path.basename(yol))[0]
        ad = re.sub(r"[^\w.-]", "-", ad)
        hedef = os.path.join(DEPO, f"{ad}.txt")
        shutil.copyfile(yol, hedef)
        s = satirlar(hedef)
        toplam_satir += len(s)
        bulgu = sum(1 for x in s if ADRES.search(x))
        parca = max(1, math.ceil(len(s) / a.satir))
        print(f"  {ad}: {len(s)} satır, {parca} parça, {bulgu} adresli satır")

    print()
    print(f"{len(a.dosya)} rapor depoda, toplam {toplam_satir} satır.")
    print("İçerik pencereye girmedi. Sorgula:")
    print("  rapor.py ara \"<terim>\" · bulgular · ortak · parca --rapor <ad> --no <n>")
    return 0


def k_liste(a):
    r = raporlar()
    if not r:
        print("Depo boş. `rapor.py al --dosya <yol>` ile doldur.")
        return 0
    print(f"{len(r)} rapor:\n")
    for ad, yol in r.items():
        s = satirlar(yol)
        bulgu = sum(1 for x in s if ADRES.search(x))
        print(f"  {ad:<24} {len(s):>5} satır  {bulgu:>3} adresli  "
              f"{max(1, math.ceil(len(s) / PARCA))} parça")
    return 0


def k_ara(a):
    """Bütün raporlarda ara — adresli parça döndür, metin yığını değil."""
    r = raporlar()
    if not r:
        print("Depo boş.")
        return 1
    terim = set(_kokler(a.terim))
    if not terim:
        print("Aranacak terim çok kısa.")
        return 1

    vurus = []
    for ad, yol in r.items():
        for no, satir in enumerate(satirlar(yol), 1):
            ortak = terim & set(_kokler(satir))
            if ortak:
                vurus.append((len(ortak), ad, no, satir.strip()))
    if not vurus:
        print(f"'{a.terim}' hiçbir raporda geçmiyor.")
        print("Bu, konunun raporlarda yok olduğu anlamına gelir —")
        print("doğru olduğu anlamına gelmez.")
        return 0

    vurus.sort(key=lambda x: (-x[0], x[1], x[2]))
    print(f"'{a.terim}' → {len(vurus)} satır, en güçlü {min(a.kac, len(vurus))}:\n")
    for skor, ad, no, satir in vurus[:a.kac]:
        print(f"  {ad}:{no}  {satir[:150]}")
    if len(vurus) > a.kac:
        print(f"\n  … {len(vurus) - a.kac} satır daha. --kac ile artır.")
    return 0


def k_bulgular(a):
    """Adres taşıyan satırlar — sözleşme gereği bulgu olanlar."""
    r = raporlar()
    if not r:
        print("Depo boş.")
        return 1
    toplam = 0
    for ad, yol in r.items():
        bulgu = [(no, s.strip()) for no, s in enumerate(satirlar(yol), 1)
                 if ADRES.search(s)]
        if not bulgu:
            continue
        toplam += len(bulgu)
        print(f"[{ad}] {len(bulgu)} bulgu")
        for no, s in bulgu[:a.kac]:
            print(f"  {ad}:{no}  {s[:150]}")
        if len(bulgu) > a.kac:
            print(f"  … {len(bulgu) - a.kac} bulgu daha")
        print()
    if not toplam:
        print("Hiçbir raporda adresli satır yok.")
        print("Sözleşme gereği her iddia adres taşımalıydı — raporlar")
        print("sözleşmeye uymamış olabilir. `gorev.py dogrula` ile bak.")
        return 1
    print(f"Toplam {toplam} adresli satır.")
    return 0


def k_ortak(a):
    """Birden fazla raporun İŞARET ETTİĞİ adresler.

    İki ajanın aynı yeri göstermesi, o yerin gerçekten sorunlu olma
    ihtimalini artırır — ama kanıt değildir: aynı modelin iki kopyası
    aynı kör noktayı paylaşır. Burada dönen şey öncelik sırası, doğruluk
    değil.
    """
    r = raporlar()
    if not r:
        print("Depo boş.")
        return 1
    adresler = {}
    for ad, yol in r.items():
        for no, satir in enumerate(satirlar(yol), 1):
            for dosya, hedef in ADRES.findall(satir):
                anahtar = f"{dosya}:{hedef}"
                adresler.setdefault(anahtar, {}).setdefault(ad, []).append(no)

    cok = {k: v for k, v in adresler.items() if len(v) >= 2}
    if not cok:
        print("Hiçbir adresi iki rapor birden göstermiyor.")
        return 0
    print(f"{len(cok)} adres birden fazla raporda geçiyor:\n")
    for anahtar, kim in sorted(cok.items(), key=lambda x: -len(x[1])):
        print(f"  {anahtar}  ({len(kim)} rapor)")
        for ad, satir_no in kim.items():
            print(f"      {ad}:{satir_no[0]}")
    print()
    print("Uyarı: aynı modelin N kopyası N bağımsız göz değildir — aynı")
    print("kör noktayı paylaşırlar. Bu liste öncelik sırasıdır, kanıt değil.")
    return 0


def k_parca(a):
    """Bir raporun N'inci parçası — özyinelemeli okumanın adımı.

    Model tamamını görmez: parçayı ister, işler, bir sonrakini ister.
    Parça numarası kararlı olduğu için nerede kalındığı kaybolmaz.
    """
    r = raporlar()
    yol = r.get(a.rapor)
    if yol is None:
        print(f"'{a.rapor}' diye bir rapor yok. Olanlar: {', '.join(r) or '—'}")
        return 1
    s = satirlar(yol)
    toplam = max(1, math.ceil(len(s) / a.satir))
    if not 1 <= a.no <= toplam:
        print(f"parça {a.no} yok — {a.rapor} {toplam} parça.")
        return 1
    bas = (a.no - 1) * a.satir
    son = min(bas + a.satir, len(s))
    print(f"[{a.rapor}] parça {a.no}/{toplam} — satır {bas + 1}-{son}\n")
    for no in range(bas, son):
        print(f"{no + 1:>5}  {s[no]}")
    print()
    if a.no < toplam:
        print(f"sonraki: rapor.py parca --rapor {a.rapor} --no {a.no + 1}")
    else:
        print("son parça.")
    return 0


def k_unut(a):
    if not depo_var():
        print("Depo zaten yok.")
        return 0
    n = len(raporlar())
    shutil.rmtree(DEPO)
    print(f"{n} rapor silindi. Depo koşuya özel — kalıcı bilgi ders")
    print("defterine ya da iz defterine yazılır, buraya değil.")
    return 0


def main(argv=None):
    a = argparse.ArgumentParser(
        description="Rapor okuyucu — raporları pencereye yüklemeden sorgula.")
    alt = a.add_subparsers(dest="komut", required=True)

    al = alt.add_parser("al", help="raporları depoya al")
    al.add_argument("--dosya", nargs="+", required=True)
    al.add_argument("--ad", help="tek dosya için depo adı")
    al.add_argument("--satir", type=int, default=PARCA)
    al.set_defaults(islev=k_al)

    alt.add_parser("liste", help="depodaki raporlar").set_defaults(islev=k_liste)

    ar = alt.add_parser("ara", help="bütün raporlarda ara")
    ar.add_argument("terim")
    ar.add_argument("--kac", type=int, default=15)
    ar.set_defaults(islev=k_ara)

    bl = alt.add_parser("bulgular", help="adres taşıyan satırlar")
    bl.add_argument("--kac", type=int, default=10)
    bl.set_defaults(islev=k_bulgular)

    alt.add_parser("ortak", help="birden fazla raporun gösterdiği adresler"
                   ).set_defaults(islev=k_ortak)

    pr = alt.add_parser("parca", help="bir raporun N'inci parçası")
    pr.add_argument("--rapor", required=True)
    pr.add_argument("--no", type=int, required=True)
    pr.add_argument("--satir", type=int, default=PARCA)
    pr.set_defaults(islev=k_parca)

    alt.add_parser("unut", help="depoyu boşalt").set_defaults(islev=k_unut)

    ayr = a.parse_args(argv)
    return ayr.islev(ayr)


if __name__ == "__main__":
    sys.exit(main())
