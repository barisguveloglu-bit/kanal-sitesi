#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Devre kesici (Circuit Breaker)
===============================================================
Döngünün sonsuza girmesini engelleyen mekanik sınır.

## Neden yazı yetmiyor

Komut dosyalarında "en fazla 3 tur" yazıyordu. Bu bir sınır değil, bir
ricadır: sınırı uygulayacak olan, sınırı aşmak isteyen tarafın kendisi.
Model üçüncü turda "bu sefer gerçekten çözeceğim" diyip dördüncüye
geçebilir ve bunu fark eden kimse olmaz.

Sayaç dosyada tutulunca durum değişir. Model kendi sayacını unutabilir,
bağlamı sıfırlanabilir, kendini ikna edebilir — dosya bunların hiçbirinden
etkilenmez. Kesici tam olarak bu yüzden süreç dışında yaşıyor.

## Ne zaman kesilir

Bir halka sınırına ulaştığında `dene` komutu 1 ile çıkar. Doğru davranış
başka bir şey denemek değil, **durup insana çıkmaktır** — üçüncü turda
çözülemeyen şey genelde kodda değil, kararda eksiktir.

## Defter — bağlam şişmesine karşı

Her turda ne yapıldığı tek satır olarak deftere yazılır. Amaç kayıt değil
**unutabilmek**: model geçmiş turların ayrıntısını bağlamında taşımak
yerine `durum` komutuyla özeti okur. Uzun soluklu döngülerin bağlam
şişmesinden ölmesini bu engeller.

## Kullanım

    python3 .claude/devre.py dene --halka duzeltme --sinir 3 --not "kontrast düzeltildi"
    python3 .claude/devre.py basari --halka duzeltme      # iş bitti, sayacı sıfırla
    python3 .claude/devre.py durum
    python3 .claude/devre.py sifirla --hepsi

İki ayrı bütçe var, ikisi ayrı riski karşılar:

    tur sayısı    "kaç kez denedin" — sonsuz döngüye karşı
    duvar saati   "ne kadar harcadın" — tek uzun turda patlamaya karşı

Tur sınırı dolmadan saat dolabilir; tersi de olur.

Çıkış kodu: 0 devam edebilirsin, 1 DEVRE KESİLDİ (dur, insana çık).
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta

KLASOR = os.path.dirname(os.path.abspath(__file__))
DURUM = os.path.join(KLASOR, "devre-durumu.json")

# Bayat sayaç yeni bir oturumu sonsuza kadar kilitlemesin. Bu süre geçtiyse
# halka kendiliğinden sıfırlanır — kesici bir ceza değil, bir fren.
TAZELIK_SAAT = 6

# Defterde tutulan en fazla satır. Amaç arşiv değil, hatırlatma.
DEFTER_SINIR = 20

VARSAYILAN_SINIR = 3

# Duvar saati bütçesi (saniye). Tur saymak tek başına yetmiyor: tek bir uzun
# turda sınır hiç dolmadan saatler ve token gidebilir. Sayaç "kaç kez
# denedin", saat "ne kadar harcadın" sorusunu cevaplar; ikisi ayrı risk.
VARSAYILAN_SURE = 1800


def durum_oku():
    if not os.path.exists(DURUM):
        return {}
    try:
        with open(DURUM, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError):
        return {}   # bozuk durum dosyası yüzünden akış kilitlenmesin


def durum_yaz(d):
    with open(DURUM, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def gecen_sure(halka):
    """Halka açıldığından beri geçen saniye."""
    try:
        return (datetime.now()
                - datetime.fromisoformat(halka["baslangic"])).total_seconds()
    except (KeyError, ValueError):
        return 0.0


def bayat_mi(halka):
    son = halka.get("son")
    if not son:
        return True
    try:
        return datetime.now() - datetime.fromisoformat(son) > timedelta(hours=TAZELIK_SAAT)
    except ValueError:
        return True


def dene(a):
    d = durum_oku()
    halka = d.get(a.halka)

    if halka is None or bayat_mi(halka):
        halka = {"sayac": 0, "sinir": a.sinir,
                 "baslangic": datetime.now().isoformat(timespec="seconds"),
                 "defter": []}

    halka["sinir"] = a.sinir
    halka["sure_siniri"] = a.sure
    halka["sayac"] += 1
    halka["son"] = datetime.now().isoformat(timespec="seconds")

    gecen = gecen_sure(halka)
    sure_doldu = a.sure > 0 and gecen > a.sure
    if a.not_:
        halka["defter"].append(f"{halka['sayac']}. {a.not_}")
        halka["defter"] = halka["defter"][-DEFTER_SINIR:]

    tur_doldu = halka["sayac"] > halka["sinir"]
    kesildi = tur_doldu or sure_doldu
    halka["durum"] = "kesildi" if kesildi else "acik"
    d[a.halka] = halka
    durum_yaz(d)

    if kesildi:
        if tur_doldu:
            print(f"DEVRE KESİLDİ — '{a.halka}' halkası {halka['sinir']} turluk "
                  f"sınırı aştı ({halka['sayac']}. deneme).")
        else:
            print(f"DEVRE KESİLDİ — '{a.halka}' halkası {a.sure} saniyelik "
                  f"süreyi aştı ({gecen:.0f} sn, {halka['sayac']}. turda).")
            print("Tur sınırı dolmadı ama saat doldu: tek bir uzun tur da "
                  "bütçe yakar.")
        if halka["defter"]:
            print("\nBu halkada neler denendi:")
            for satir in halka["defter"]:
                print(f"  · {satir}")
        print("\nBaşka bir şey deneme. Dur ve Barış'a çık: neyi çözemediğini,"
              "\nne denediğini ve hangi kararın eksik olduğunu söyle.")
        return 1

    kalan = halka["sinir"] - halka["sayac"]
    kalan_sure = a.sure - gecen if a.sure > 0 else 0
    ek = f", {kalan_sure:.0f} sn" if a.sure > 0 else ""
    print(f"'{a.halka}' turu {halka['sayac']}/{halka['sinir']} "
          f"({kalan} tur{ek} kaldı).")
    return 0


def basari(a):
    """İş bitti — sayacı sıfırla ki bir sonraki iş temiz başlasın."""
    d = durum_oku()
    if a.halka in d:
        turlar = d[a.halka]["sayac"]
        del d[a.halka]
        durum_yaz(d)
        print(f"'{a.halka}' başarıyla kapandı ({turlar} tur). Sayaç sıfırlandı.")
    else:
        print(f"'{a.halka}' zaten açık değil.")
    return 0


def durum_goster(a):
    d = durum_oku()
    if not d:
        print("Açık halka yok. Bütün devreler kapalı.")
        return 0

    for ad, halka in sorted(d.items()):
        bayat = " (bayat, sonraki denemede sıfırlanır)" if bayat_mi(halka) else ""
        isaret = "KESİLDİ" if halka.get("durum") == "kesildi" else "açık"
        gecen = gecen_sure(halka)
        print(f"[{isaret}] {ad}: {halka['sayac']}/{halka['sinir']} tur, "
              f"{gecen:.0f} sn{bayat}")
        for satir in halka.get("defter", []):
            print(f"    · {satir}")
    return 0


def sifirla(a):
    if a.hepsi:
        if os.path.exists(DURUM):
            os.remove(DURUM)
        print("Bütün halkalar sıfırlandı.")
        return 0
    if not a.halka:
        print("--halka <ad> ya da --hepsi ver.")
        return 2
    d = durum_oku()
    d.pop(a.halka, None)
    durum_yaz(d)
    print(f"'{a.halka}' sıfırlandı.")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Döngüye mekanik sınır koy.")
    alt = a.add_subparsers(dest="komut", required=True)

    d = alt.add_parser("dene", help="bir tur harca")
    d.add_argument("--halka", required=True)
    d.add_argument("--sinir", type=int, default=VARSAYILAN_SINIR)
    d.add_argument("--sure", type=int, default=VARSAYILAN_SURE,
                   help="duvar saati bütçesi, saniye (0 = kapalı)")
    d.add_argument("--not", dest="not_", default="", help="bu turda ne yapıldı")
    d.set_defaults(islev=dene)

    b = alt.add_parser("basari", help="iş bitti, sayacı sıfırla")
    b.add_argument("--halka", required=True)
    b.set_defaults(islev=basari)

    g = alt.add_parser("durum", help="açık halkaları ve defteri göster")
    g.set_defaults(islev=durum_goster)

    s = alt.add_parser("sifirla", help="halkayı elle sıfırla")
    s.add_argument("--halka")
    s.add_argument("--hepsi", action="store_true")
    s.set_defaults(islev=sifirla)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
