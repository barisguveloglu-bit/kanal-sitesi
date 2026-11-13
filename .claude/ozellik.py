#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Özellik sınavı (property-based testing)
===============================================================
"Bu kural, ben yazmadığım girdilerde de doğru mu?"

## Boşluk neydi

`arac-sinavi.py`'nin 151 vakası ve `butunluk.py`'nin 77 vakası **elle
yazılmış örnekler.** Her biri birinin aklına gelmiş bir durumu koruyor —
ve tam olarak o kadarını koruyor. Aklıma gelmeyen durum, korunmuyor.

Burada tersi var: örnek değil **kural** yazılır ("okunan şey yazılanın
aynısı olmalı"), sonra o kural üretilen yüzlerce girdide denenir. Benim
seçmediğim girdiler, benim kör noktamı taşımaz.

## Küçültme neden var

Rastgele bir karşı-örnek genelde büyük ve okunmaz olur: 40 alanlı bir
nesne, hangi alanın kırdığı belli değil. Bulunan her karşı-örnek
**küçültülüyor** — kural hâlâ ihlal ediliyorken parça atılabiliyorsa
atılır. Kalan şey en küçük karşı-örnek, yani okunabilir olanı.

## Tohum sabit

`--tohum` verilmezse tohum basılır. Kırmızı bir koşuyu aynı tohumla
tekrar üretemiyorsan, düzelttiğini de doğrulayamazsın.

## Sınırı

Kaynak makale (arXiv 2510.09907) ölçmüş: bu yöntemin ürettiği raporların
yalnızca **%56'sı gerçek hataydı.** Yani yanlış alarm oranı yüksek ve
çıkan her şey doğrudan kusur sayılmaz — bakılır. Bu yüzden özellik
sınavı CI'de **kapı değil uyarı**: yanlış alarmla kapı kapatmak, kapıyı
görmezden gelmeyi öğretir.

Bir de ters tuzağı var: kural, ölçtüğü fonksiyonun kopyası olarak
yazılırsa hiçbir şeyi sınamaz (`len(x) == len(x)`). Mutasyon sınavı bunu
gösterir.

    python3 .claude/ozellik.py
    python3 .claude/ozellik.py --kez 500 --tohum 12345
    python3 .claude/ozellik.py --ozellik okuyucu

Çıkış kodu: 0 bütün kurallar tuttu · 1 karşı-örnek bulundu
"""

import argparse
import importlib.util
import json
import os
import random
import string
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)


def modul(ad):
    yol = os.path.join(KLASOR, f"{ad}.py")
    tanim = importlib.util.spec_from_file_location(f"_oz_{ad}", yol)
    m = importlib.util.module_from_spec(tanim)
    tanim.loader.exec_module(m)
    return m


# ------------------------------------------------------------------ üretici

GUVENLI = string.ascii_letters + string.digits + " çğıöşüÇĞİÖŞÜ-_.,"


def uret_deger(r, derinlik=0):
    """`data.js` içinde geçen alt kümeyi üretir — okuyucu bunu okumalı."""
    secenek = ["dizgi", "sayi", "bool", "bos"]
    if derinlik < 2:
        secenek += ["dizi", "nesne"]
    tur = r.choice(secenek)
    if tur == "dizgi":
        return "".join(r.choice(GUVENLI) for _ in range(r.randint(0, 12)))
    if tur == "sayi":
        return r.randint(-999, 999)
    if tur == "bool":
        return r.choice([True, False])
    if tur == "bos":
        return None
    if tur == "dizi":
        return [uret_deger(r, derinlik + 1) for _ in range(r.randint(0, 4))]
    return {f"a{i}": uret_deger(r, derinlik + 1) for i in range(r.randint(0, 4))}


def yaz_js(d):
    """Python değerini `data.js` biçiminde yaz."""
    if d is None:
        return "null"
    if d is True:
        return "true"
    if d is False:
        return "false"
    if isinstance(d, int):
        return str(d)
    if isinstance(d, str):
        return json.dumps(d, ensure_ascii=False)
    if isinstance(d, list):
        return "[" + ", ".join(yaz_js(x) for x in d) + "]"
    return "{" + ", ".join(f"{k}: {yaz_js(v)}" for k, v in d.items()) + "}"


def kucult(deger, hala_kiriyor):
    """Kural hâlâ ihlal ediliyorken atılabilen parçayı at.

    Basit ve kasten yavaş değil: tek geçiş, en dıştan içe. Amaç en küçük
    karşı-örneği bulmak değil, OKUNABİLİR olanı bulmak.
    """
    for _ in range(6):
        kuculdu = False
        if isinstance(deger, list) and deger:
            for i in range(len(deger)):
                aday = deger[:i] + deger[i + 1:]
                if hala_kiriyor(aday):
                    deger, kuculdu = aday, True
                    break
        elif isinstance(deger, dict) and deger:
            for k in list(deger):
                aday = {x: y for x, y in deger.items() if x != k}
                if hala_kiriyor(aday):
                    deger, kuculdu = aday, True
                    break
        elif isinstance(deger, str) and len(deger) > 1:
            aday = deger[:len(deger) // 2]
            if hala_kiriyor(aday):
                deger, kuculdu = aday, True
        if not kuculdu:
            break
    return deger


# ----------------------------------------------------------------- kurallar

def o_okuyucu(r):
    """KURAL: okuyucunun okuduğu şey, yazdığımızın aynısı olmalı.

    `okuyucu.py` dış bağımlılık olmasın diye elle yazılmış bir
    ayrıştırıcı. Elle yazılmış ayrıştırıcı, elle yazılmış vakalarla
    sınandığı sürece yalnız akla gelen girdilerde doğrudur.
    """
    ok = modul("okuyucu")

    def kiriyor(d):
        metin = f"const DENEME = {yaz_js(d)};\n"
        try:
            return ok.sabit(metin, "DENEME") != d
        except Exception:
            return True

    d = uret_deger(r)
    if not kiriyor(d):
        return None
    return kucult(d, kiriyor)


def o_koruma_serbest_metni_reddediyor(r):
    """KURAL: `vaka:` ya da `dosya:` ile başlamayan hiçbir dize koruma olamaz.

    Ölçüldü: 11 korumanın 5'i var olmayan bir şeyi gösteriyordu ve defter
    hepsini korumalı sayıyordu. Kural artık var; bu onu üretilen girdide
    sınıyor — elle yazılan vaka yalnızca aklıma gelen üç biçimi denemişti.
    """
    ders = modul("ders")

    def kiriyor(s):
        if s.startswith("vaka:") or s.startswith("dosya:"):
            return False          # bu biçimler kuralın konusu değil
        try:
            ders.koruma_coz(s)
            return True           # reddetmesi gerekirken kabul etti
        except ders.KorumaHatasi:
            return False
        except Exception:
            return True           # KorumaHatasi dışında bir şeyle patlamamalı

    s = "".join(r.choice(GUVENLI + ":#/") for _ in range(r.randint(0, 30)))
    if not kiriyor(s):
        return None
    return kucult(s, kiriyor)


def o_arama_gercek_satir_donduruyor(r):
    """KURAL: arama hangi sorguya ne döndürürse döndürsün, verdiği satır
    numarası kaynakta GERÇEKTEN var olmalı.

    Geri getirme evali isabeti ölçüyor — doğru yeri buluyor mu. Bu ondan
    farklı ve daha temel bir şey soruyor: gösterdiği yer var mı? Uydurma
    atıf, yanlış atıftan farklı bir kusur.
    """
    ara = modul("ara")
    if not hasattr(o_arama_gercek_satir_donduruyor, "_dizin"):
        o_arama_gercek_satir_donduruyor._dizin = ara.dizin_kur()
        o_arama_gercek_satir_donduruyor._satir = {}
    dizin = o_arama_gercek_satir_donduruyor._dizin
    onbellek = o_arama_gercek_satir_donduruyor._satir

    def kaynak_satiri(kaynak):
        if kaynak not in onbellek:
            yol = os.path.join(KOK, kaynak)
            if not os.path.exists(yol):
                onbellek[kaynak] = 0
            else:
                onbellek[kaynak] = len(
                    open(yol, encoding="utf-8").read().splitlines())
        return onbellek[kaynak]

    def kiriyor(sorgu):
        if not sorgu.strip():
            return False
        try:
            sonuc = dizin.ara(sorgu, 3)
        except Exception:
            return True
        for _, p in sonuc:
            toplam = kaynak_satiri(p.kaynak)
            # Uydurma atıf, yanlış atıftan başka bir kusur: yanlış atıf
            # var olan bir yeri yanlış gösterir, uydurma atıf olmayan bir
            # yeri gösterir. İkincisini geri getirme evali ölçmüyor.
            if toplam == 0:
                return True
            if not (1 <= p.ilk <= toplam and p.ilk <= p.son <= toplam):
                return True
        return False

    # Sorgu kaynaktaki gerçek kelimelerden kuruluyor: rastgele harf yığını
    # hiçbir şey getirmez ve kuralı hiç sınamaz.
    havuz = getattr(o_arama_gercek_satir_donduruyor, "_havuz", None)
    if havuz is None:
        havuz = [k for p in dizin.parcalar for k in p.metin.split() if len(k) > 3]
        o_arama_gercek_satir_donduruyor._havuz = havuz
    if not havuz:
        return None

    sorgu = " ".join(r.choice(havuz) for _ in range(r.randint(1, 4)))
    if not kiriyor(sorgu):
        return None
    return sorgu


OZELLIKLER = (
    ("okuyucu", "okunan, yazılanın aynısı", o_okuyucu),
    ("koruma", "serbest metin koruma olamaz", o_koruma_serbest_metni_reddediyor),
    ("arama", "verilen satır kaynakta var", o_arama_gercek_satir_donduruyor),
)


def main(argv=None):
    a = argparse.ArgumentParser(description="Özellik sınavı — kural yaz, girdi üret.")
    a.add_argument("--kez", type=int, default=200)
    a.add_argument("--tohum", type=int)
    a.add_argument("--ozellik", help="yalnız bu özelliği koştur")
    ayr = a.parse_args(argv)

    tohum = ayr.tohum if ayr.tohum is not None else random.randrange(10 ** 9)
    print(f"tohum {tohum} — aynı tohum aynı girdileri üretir\n")

    secili = [o for o in OZELLIKLER if not ayr.ozellik or o[0] == ayr.ozellik]
    if not secili:
        print(f"'{ayr.ozellik}' diye bir özellik yok. "
              f"Olanlar: {', '.join(o[0] for o in OZELLIKLER)}")
        return 1

    kirik = []
    for ad, aciklama, islev in secili:
        r = random.Random(tohum)
        karsi = None
        for _ in range(ayr.kez):
            try:
                karsi = islev(r)
            except Exception as e:
                karsi = f"<özellik patladı: {type(e).__name__}: {e}>"
            if karsi is not None:
                break
        if karsi is None:
            print(f"  tuttu   {ad}: {aciklama}  ({ayr.kez} girdi)")
        else:
            print(f"  KIRILDI {ad}: {aciklama}")
            print(f"          en küçük karşı-örnek: {karsi!r}")
            kirik.append((ad, karsi))

    print()
    if not kirik:
        print(f"{len(secili)} kural, {ayr.kez} girdide tuttu.")
        print("Bu, kuralların doğru olduğunu değil, bu girdilerde")
        print("kırılmadığını gösterir. Üretici ulaşmadığı yeri sınamaz.")
        return 0

    print(f"{len(kirik)} kural kırıldı.")
    print(f"Tekrar üretmek için: --tohum {tohum}")
    print()
    print("Karşı-örneği doğrudan kusur sayma — bu yöntemin ölçülmüş yanlış")
    print("alarm oranı yüksek (%44). Önce bak, gerçekse kalıcı vakaya çevir:")
    print("  python3 .claude/geri-bildirim.py ...")
    return 1


if __name__ == "__main__":
    sys.exit(main())
