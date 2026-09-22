#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Seyir defteri (bağlam yönetimi + epizodik bellek)
===============================================================
Uzun koşuların hafızası. Üç eksiği aynı anda kapatır: bağlam mühendisliği,
gözlemlenebilirlik ve epizodik bellek.

## Sorun — bağlam çürümesi

Uzun bir döngüde bağlam sessizce bozulur: alakasız araç çıktıları,
tekrar okumalar ve çözülmüş turların ayrıntısı birikir. Model hata
vermez, sadece sinyale daha az dikkat eder. Yirminci turda hâlâ
çalışıyor gibi görünür ama ne yaptığını bilmez.

`devre.py`'nin defteri bunun ilk adımıydı ama inceydi: halkaya özel,
altı saatte bayatlıyor, git'e girmiyor ve sadece "ne denendi" tutuyordu.

## Neden hazır özetleme yetmiyor

Serbest özetleme uzun görevlerde kilit kararları güvenilir biçimde
korumaz — özetleyici neyin önemli olduğunu bilmez ve tam da sonradan
lazım olacak şeyi atar. Bu yüzden burada özetleme yok, **saklama şeması**
var: ne saklanacağı önceden yazılı.

    karar        Hangi mimari karar verildi ve NEDEN
    cozulmemis   Neyin çözülemediği — bir sonraki koşu buradan başlar
    denendi      Denenip işe yaramayan yol (tekrar denenmesin)
    olculdu      Ne test edildi, sonucu neydi
    adim         Ham tur izi — GÖZLEM için tutulur, özete GİRMEZ

İlk dördü kalıcı bellektir. `adim` sadece "neden takıldı" sorusunu
cevaplamak için var ve `ozet` komutu onu kasten dışarıda bırakır:
sıkıştırma budur — silmek değil, **ayırmak**.

## Dört işlem

    Write     `yaz` — bağlamı pencere dışına, dosyaya alır
    Select    `ozet` — yeni tura sadece gerekli olanı geri verir
    Compress  şema — ham iz özete girmez, karar ve boşluk girer
    Isolate   alt ajanlar (gorev.py) ayrı pencerelerde çalışır

## Kullanım

    python3 .claude/seyir.py baslat --is "irade kademeleri"
    python3 .claude/seyir.py yaz --tur karar \\
        --ne "Kademe adları değişmeyecek" --neden "site metinleri buna bağlı"
    python3 .claude/seyir.py yaz --tur adim --ne "ara.py ile LORE:93 getirildi"
    python3 .claude/seyir.py ozet                  # yeni tura verilecek bağlam
    python3 .claude/seyir.py iz --son 20           # neden takıldı sorusu
    python3 .claude/seyir.py kapat --sonuc "..."
"""

import argparse
import json
import os
import sys
from datetime import datetime

KLASOR = os.path.dirname(os.path.abspath(__file__))
DEFTER = os.path.join(KLASOR, "seyir.jsonl")

# Özete giren türler ve sırası. `adim` KASTEN yok — sıkıştırma buradan geliyor.
KALICI = ("karar", "cozulmemis", "denendi", "olculdu")
TURLER = KALICI + ("adim", "baslangic", "kapanis")

BASLIK = {
    "karar": "VERİLEN KARARLAR (ve gerekçeleri)",
    "cozulmemis": "ÇÖZÜLEMEYENLER — bir sonraki koşu buradan başlar",
    "denendi": "DENENİP İŞE YARAMAYANLAR — tekrar deneme",
    "olculdu": "ÖLÇÜLENLER",
}


def oku():
    if not os.path.exists(DEFTER):
        return []
    kayitlar = []
    with open(DEFTER, encoding="utf-8") as f:
        for satir in f:
            satir = satir.strip()
            if satir:
                try:
                    kayitlar.append(json.loads(satir))
                except (json.JSONDecodeError, ValueError):
                    continue      # bozuk satır defteri kilitlemesin
    return kayitlar


def ekle(kayit):
    kayit["an"] = datetime.now().isoformat(timespec="seconds")
    with open(DEFTER, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")


def acik_is(kayitlar):
    """En son başlatılıp kapatılmamış iş."""
    acik = None
    for k in kayitlar:
        if k["tur"] == "baslangic":
            acik = k["is"]
        elif k["tur"] == "kapanis" and k.get("is") == acik:
            acik = None
    return acik


def baslat(a):
    kayitlar = oku()
    onceki = acik_is(kayitlar)
    if onceki and onceki != a.is_:
        print(f"UYARI: '{onceki}' hâlâ açık. Önce kapat ya da bilerek üstüne başla.")
    ekle({"tur": "baslangic", "is": a.is_, "hedef": a.hedef or ""})
    print(f"'{a.is_}' başladı.")

    gecmis = [k for k in kayitlar if k.get("is") == a.is_ and k["tur"] in KALICI]
    if gecmis:
        print(f"\nBu işin {len(gecmis)} önceki kaydı var — körlemesine başlama:")
        print("  python3 .claude/seyir.py ozet")
    return 0


def yaz(a):
    kayitlar = oku()
    hedef_is = a.is_ or acik_is(kayitlar)
    if not hedef_is:
        print("Açık iş yok. Önce: python3 .claude/seyir.py baslat --is \"<ad>\"")
        return 2

    if a.tur == "karar" and not a.neden:
        print("Karar kaydı GEREKÇESİZ olmaz. --neden ver.")
        print("Gerekçesiz karar, altı ay sonra kimsenin anlamadığı kısıttır.")
        return 2

    ekle({"tur": a.tur, "is": hedef_is, "ne": a.ne, "neden": a.neden or ""})
    print(f"[{a.tur}] kaydedildi → {hedef_is}")
    return 0


def ozet(a):
    """Yeni tura verilecek bağlam. Ham iz KASTEN dışarıda."""
    kayitlar = oku()
    hedef_is = a.is_ or acik_is(kayitlar)
    if not hedef_is:
        acik = sorted({k.get("is", "") for k in kayitlar if k.get("is")})
        print("Açık iş yok." + (f" Defterdeki işler: {', '.join(acik)}" if acik else ""))
        return 0

    ilgili = [k for k in kayitlar if k.get("is") == hedef_is]
    print(f"# {hedef_is}\n")

    baslangic = next((k for k in ilgili if k["tur"] == "baslangic"), None)
    if baslangic and baslangic.get("hedef"):
        print(f"Hedef: {baslangic['hedef']}\n")

    bos = True
    for tur in KALICI:
        kayit = [k for k in ilgili if k["tur"] == tur]
        if not kayit:
            continue
        bos = False
        print(f"## {BASLIK[tur]}")
        for k in kayit:
            satir = f"- {k['ne']}"
            if k.get("neden"):
                satir += f"\n  ↳ neden: {k['neden']}"
            print(satir)
        print()

    adim_sayisi = sum(1 for k in ilgili if k["tur"] == "adim")
    if adim_sayisi:
        print(f"({adim_sayisi} ham tur izi özete alınmadı — gerekirse: "
              f"seyir.py iz)")
    if bos and not adim_sayisi:
        print("Henüz kayıt yok.")
    return 0


def iz(a):
    """Ham tur izi — 'neden takıldı' sorusunun cevabı."""
    kayitlar = [k for k in oku() if k["tur"] == "adim"]
    if a.is_:
        kayitlar = [k for k in kayitlar if k.get("is") == a.is_]
    if not kayitlar:
        print("Ham iz yok.")
        return 0
    for k in kayitlar[-a.son:]:
        print(f"{k['an'][11:19]}  [{k.get('is','?')}]  {k['ne']}")
    print(f"\n{len(kayitlar)} adımdan son {min(a.son, len(kayitlar))} tanesi.")
    return 0


def kapat(a):
    kayitlar = oku()
    hedef_is = a.is_ or acik_is(kayitlar)
    if not hedef_is:
        print("Kapatılacak açık iş yok.")
        return 0
    ekle({"tur": "kapanis", "is": hedef_is, "ne": a.sonuc or ""})

    ilgili = [k for k in kayitlar if k.get("is") == hedef_is]
    kalan = [k for k in ilgili if k["tur"] == "cozulmemis"]
    print(f"'{hedef_is}' kapandı.")
    if kalan:
        print(f"\nDİKKAT: {len(kalan)} çözülmemiş kayıt kalıyor. "
              "Bunlar defterde duruyor ve bir sonraki koşu bunları görecek:")
        for k in kalan:
            print(f"  · {k['ne']}")
    return 0


def isler(a):
    kayitlar = oku()
    adlar = []
    for k in kayitlar:
        if k.get("is") and k["is"] not in adlar:
            adlar.append(k["is"])
    if not adlar:
        print("Defter boş.")
        return 0
    su_an = acik_is(kayitlar)
    for ad in adlar:
        ilgili = [k for k in kayitlar if k.get("is") == ad]
        kalan = sum(1 for k in ilgili if k["tur"] == "cozulmemis")
        durum = "AÇIK" if ad == su_an else "kapalı"
        ek = f", {kalan} çözülmemiş" if kalan else ""
        print(f"[{durum:6}] {ad}  ({len(ilgili)} kayıt{ek})")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Uzun koşuların hafızası.")
    alt = a.add_subparsers(dest="komut", required=True)

    b = alt.add_parser("baslat", help="yeni iş aç")
    b.add_argument("--is", dest="is_", required=True)
    b.add_argument("--hedef", default="")
    b.set_defaults(islev=baslat)

    y = alt.add_parser("yaz", help="deftere kayıt düş")
    y.add_argument("--tur", required=True, choices=list(TURLER[:5]))
    y.add_argument("--ne", required=True)
    y.add_argument("--neden", default="", help="karar türünde ZORUNLU")
    y.add_argument("--is", dest="is_", default="")
    y.set_defaults(islev=yaz)

    o = alt.add_parser("ozet", help="yeni tura verilecek bağlam (ham iz hariç)")
    o.add_argument("--is", dest="is_", default="")
    o.set_defaults(islev=ozet)

    i = alt.add_parser("iz", help="ham tur izi — neden takıldı")
    i.add_argument("--son", type=int, default=20)
    i.add_argument("--is", dest="is_", default="")
    i.set_defaults(islev=iz)

    k = alt.add_parser("kapat", help="işi kapat")
    k.add_argument("--sonuc", default="")
    k.add_argument("--is", dest="is_", default="")
    k.set_defaults(islev=kapat)

    l = alt.add_parser("isler", help="defterdeki işleri listele")
    l.set_defaults(islev=isler)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
