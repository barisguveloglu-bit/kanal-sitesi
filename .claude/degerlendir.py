#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Geri getirme değerlendirmesi (eval)
===============================================================
`sinav.py` denetleyiciyi ölçer, bu betik **geri getirmeyi** ölçer.

Neden gerekli: `ara.py` her soruya bir cevap döndürür. Döndürdüğü şeyin
doğru yer olup olmadığını gözle bakmadan bilemezsin — ve gözle bakmak
ölçüm değildir. Altın set bunu sayıya çevirir.

Üç şey ölçülür:

  isabet@1 / isabet@3   Doğru satır ilk / ilk üç sonuçta mı?
  MRR                   Doğru sonuç ortalama kaçıncı sırada?
  gerçek kapsama        Getirilen metin cevabın kendisini içeriyor mu?
                        (Doğru bölümü bulup cevabı kaçırmak da hatadır.)

Cevaplanamayan sorular iki ayrı sınıfta ölçülür, çünkü doğru davranışları
farklı:

  konu dışı   Evrenle ilgisi yok → hiçbir şey döndürmemeli.
  cevapsız    Konu içinde ama canon susuyor → dayanak dönebilir, ama
              sorulan uydurma şeyi İÇERMEMELİ. Güvenlik özelliği
              "her zaman bul" değil, "asla sahte delil üretme".

    python3 .claude/degerlendir.py
    python3 .claude/degerlendir.py --ayrinti     # her soruyu tek tek yaz

Çıkış kodu: 0 eşikleri geçti, 1 geçemedi.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ara  # noqa: E402

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALTIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "altin-sorular.json")

# Eşikler ölçülerek konuldu, hedef olarak değil. Bunları düşürerek testi
# geçirmek testi anlamsızlaştırır — düşen sayı, düzeltilecek bir gerileme.
ESIK_ISABET3 = 0.90
ESIK_KAPSAMA = 0.90
ESIK_KONU_DISI = 1.00
ESIK_CEVAPSIZ = 1.00

SAYI = 3


def kapsiyor(parca, satir):
    return parca.kaynak == "LORE.md" and parca.ilk <= satir <= parca.son


def main(argv):
    a = argparse.ArgumentParser(description="Geri getirmeyi altın sete karşı ölç.")
    a.add_argument("--ayrinti", action="store_true")
    a.add_argument("--json", action="store_true")
    secim = a.parse_args(argv)

    with open(ALTIN, encoding="utf-8") as f:
        altin = json.load(f)

    dizin = ara.dizin_kur()

    isabet1 = isabet3 = kapsama = 0
    mrr_toplam = 0.0
    satirlar = []
    kacaklar = []

    for vaka in altin["sorular"]:
        soru, satir = vaka["soru"], vaka["satir"]
        sonuc = dizin.ara(soru, SAYI)
        parcalar = [p for _, p in sonuc]

        sira = next((i for i, p in enumerate(parcalar, 1) if kapsiyor(p, satir)), 0)
        isabet1 += sira == 1
        isabet3 += sira > 0
        mrr_toplam += 1.0 / sira if sira else 0.0

        # Büyük/küçük harfe duyarsız ara: canon'da "Gövdeye" diye başlayan bir
        # cümle, "gövde" gerçeğini karşılar. Türkçe küçültme ara.py'den geliyor
        # çünkü Python'un lower()'ı "İ" harfini bozar.
        govde = ara.turkce_kucult("\n".join(p.metin for p in parcalar))
        eksik = [g for g in vaka["gercekler"]
                 if ara.turkce_kucult(g) not in govde]
        kapsama += not eksik

        if sira and not eksik:
            durum = f"OK  (sıra {sira})"
        elif sira:
            durum = f"EKSİK (sıra {sira}, metinde yok: {', '.join(eksik)})"
            kacaklar.append((soru, durum))
        else:
            bulunan = parcalar[0].adres if parcalar else "hiçbir şey"
            durum = f"KAÇAK (beklenen LORE.md:{satir}, gelen {bulunan})"
            kacaklar.append((soru, durum))
        satirlar.append(f"  {durum:52} {soru}")

    n = len(altin["sorular"]) or 1

    # Konu dışı sorular: hiçbir şey dönmemeli.
    konu_disi_gecen = 0
    for soru in altin["konu_disi"]:
        sonuc = dizin.ara(soru, SAYI)
        if sonuc:
            kacaklar.append((soru, "KONU DIŞI SIZINTI"))
            satirlar.append(f"  {'KONU DIŞI SIZINTI (' + sonuc[0][1].adres + ')':52} {soru}")
        else:
            konu_disi_gecen += 1
            satirlar.append(f"  {'OK  (dayanak yok dedi)':52} {soru}")

    # Konu içi ama cevapsız: dayanak dönebilir, ama SAHTE DELİL dönemez.
    cevapsiz_gecen = 0
    for vaka in altin["cevapsiz"]:
        sonuc = dizin.ara(vaka["soru"], SAYI)
        govde = ara.turkce_kucult("\n".join(p.metin for _, p in sonuc))
        sizan = [o for o in vaka["olmamali"] if ara.turkce_kucult(o) in govde]
        if sizan:
            kacaklar.append((vaka["soru"], "SAHTE DELİL"))
            satirlar.append(f"  {'SAHTE DELİL (' + ', '.join(sizan) + ')':52} {vaka['soru']}")
        else:
            cevapsiz_gecen += 1
            nasil = "dayanak verdi, cevap yok" if sonuc else "hiç dayanak yok"
            satirlar.append(f"  {'OK  (' + nasil + ')':52} {vaka['soru']}")

    m = len(altin["konu_disi"]) or 1
    c = len(altin["cevapsiz"]) or 1
    olcum = {
        "isabet@1": isabet1 / n,
        "isabet@3": isabet3 / n,
        "MRR": mrr_toplam / n,
        "gercek_kapsama": kapsama / n,
        "konu_disi_dogru": konu_disi_gecen / m,
        "cevapsiz_dogru": cevapsiz_gecen / c,
    }

    if secim.json:
        print(json.dumps(olcum, ensure_ascii=False, indent=2))
    else:
        if secim.ayrinti or kacaklar:
            print("\n".join(satirlar) + "\n")
        print(f"soru sayısı        {n} (+{m} konu dışı, +{c} cevapsız)")
        print(f"isabet@1           {olcum['isabet@1']:.0%}")
        print(f"isabet@3           {olcum['isabet@3']:.0%}   (eşik {ESIK_ISABET3:.0%})")
        print(f"MRR                {olcum['MRR']:.3f}")
        print(f"gerçek kapsama     {olcum['gercek_kapsama']:.0%}   (eşik {ESIK_KAPSAMA:.0%})")
        print(f"konu dışı doğru    {olcum['konu_disi_dogru']:.0%}   (eşik {ESIK_KONU_DISI:.0%})")
        print(f"sahte delil yok    {olcum['cevapsiz_dogru']:.0%}   (eşik {ESIK_CEVAPSIZ:.0%})")

    dustu = []
    if olcum["isabet@3"] < ESIK_ISABET3:
        dustu.append("isabet@3")
    if olcum["gercek_kapsama"] < ESIK_KAPSAMA:
        dustu.append("gerçek kapsama")
    if olcum["konu_disi_dogru"] < ESIK_KONU_DISI:
        dustu.append("konu dışı reddi")
    if olcum["cevapsiz_dogru"] < ESIK_CEVAPSIZ:
        dustu.append("sahte delil sızıntısı")

    if dustu:
        print(f"\nEŞİK ALTINDA: {', '.join(dustu)}.")
        print("Ya geri getirme geriledi ya LORE.md değişip satır numaraları kaydı. "
              "İkisi de sessizce geçilmemeli.")
        return 1

    print("\nGeri getirme eşikleri geçti.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
