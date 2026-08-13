#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Test odaklı geliştirme (Kırmızı → Yeşil → Yeniden Düzenle)
===============================================================
Önce başarısız olan test yazılır (kırmızı), sonra onu geçiren en basit kod
yazılır (yeşil), sonra testler yeşil kalırken kod düzeltilir (yeniden
düzenle).

## Bu depoda neden zorlanması gerekiyor

Bu deponun en pahalı dersi şuydu: **bir test yazılmış olması canlı olduğunu
göstermez.** `mutasyon.py` tam olarak bunun için var ve ilk koşusunda ölü
bir koruma buldu; bu oturumda bir tane daha buldu (altın set kayma denetimi
eklenmişti, vakası yazılmamıştı).

TDD'nin kırmızı adımı bu sorunun ön cephesi. Bir test **hiç kırmızı
yanmadıysa** ne koruduğu bilinmiyor demektir: belki gerçekten koruyor,
belki zaten doğru olan bir şeyi tekrarlıyor, belki gövdesi boş. Üçü de
yeşil görünür.

Bu yüzden `kirmizi` adımı sadece bir hatırlatma değil, **kapı**: adı
verilen vaka şu anda geçiyorsa komut reddeder. Geçen bir testle TDD
başlatılamaz.

## Neyi zorlar, neyi zorlamaz

Zorlar: testin önce kırmızı yandığını, sonra yeşile döndüğünü ve yeniden
düzenleme sırasında hiçbir vakanın kaybolmadığını.

Zorlamaz: kodun güzel olduğunu. O `elestirmen.py`'nin ve insanın işi.

    python3 .claude/tdd.py kirmizi --vaka "olay: bozuk girdi kilitlemiyor"
    python3 .claude/tdd.py yesil   --vaka "olay: bozuk girdi kilitlemiyor"
    python3 .claude/tdd.py duzenle
    python3 .claude/tdd.py durum
"""

import argparse
import importlib.util
import json
import os
import sys
from datetime import datetime

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
DURUM = os.path.join(KLASOR, "tdd-durumu.json")

# İç içe koşuyu durduran bayrak. Gerekçesi somut bir kazadan geliyor:
# `yesil` adımı "başka bir şey kırıldı mı" diye BÜTÜN vakaları koşuyor;
# vakaların arasında TDD'nin kendisini sınayanlar var ve onlar `tdd.py`
# çağırıyor. Koruma olmadan bu, kendini besleyen bir özyineleme —
# sınav bitmiyor. Atlama SESSİZ DEĞİL: çıktıda açıkça yazılıyor, yoksa
# koşulmamış bir denetim koşulmuş sanılır.
DERINLIK = "ECHO_TDD_DERINLIK"

# Sadece **kendi kendini yargılayan** sınavlar. Sözleşme: vaka işlevi
# `None` döndürürse geçti, metin döndürürse düştü.
#
# `sinav.py` bilerek dışarıda: onun vakaları fay enjekte eder, kararı
# dışarıdaki koşucu `dogrula.py`'yi çalıştırıp verir. Tek vakayı buradan
# koşturmak o kararı taklit etmek olurdu ve taklit yanlış olduğunda
# **yanlış bir yeşil** üretirdi. Yarım destek, desteksizlikten kötüdür.
SINAVLAR = {
    "arac-sinavi.py": lambda k: (k[0], k[1]),      # (ad, islev)
    "butunluk.py": lambda k: (k[1], k[2]),         # (bolum, ad, islev)
}


def modul(dosya):
    yol = os.path.join(KLASOR, dosya)
    if not os.path.exists(yol):
        return None
    tanim = importlib.util.spec_from_file_location("_s_" + dosya.replace(".", "_"), yol)
    m = importlib.util.module_from_spec(tanim)
    tanim.loader.exec_module(m)
    return m


def vakalari_topla():
    """Bütün sınavlardaki vaka adları → (sınav dosyası, çalıştırıcı)."""
    tablo = {}
    for dosya, ayikla in SINAVLAR.items():
        m = modul(dosya)
        if m is None or not hasattr(m, "VAKALAR"):
            continue
        for kayit in m.VAKALAR:
            ad, islev = ayikla(kayit)
            tablo[ad] = (dosya, m, islev)
    return tablo


def vakayi_kos(dosya, m, islev):
    """Tek bir vakayı çalıştır. None → geçti, metin → düştü."""
    if dosya == "butunluk.py":
        if getattr(m, "K", None) is None:
            m.K = m.Kaynak()
        return islev()
    gecici, kok = m.kopya()
    try:
        return islev(kok)
    finally:
        import shutil
        shutil.rmtree(gecici, ignore_errors=True)


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


def _bul(ad):
    tablo = vakalari_topla()
    if ad not in tablo:
        yakin = [k for k in tablo if ad.lower() in k.lower()]
        print(f"Böyle bir vaka yok: {ad!r}", file=sys.stderr)
        if yakin:
            print("Bunlar mı: " + ", ".join(repr(k) for k in yakin[:5]), file=sys.stderr)
        else:
            print(f"({len(tablo)} vaka arasında bulunamadı — önce testi yaz.)",
                  file=sys.stderr)
        return None
    return tablo[ad]


def kirmizi(a):
    kayit = _bul(a.vaka)
    if kayit is None:
        return 1
    dosya, m, vaka = kayit
    sonuc = vakayi_kos(dosya, m, vaka)

    if sonuc is None:
        # KAPI. Geçen bir testle TDD başlatılamaz: o test ya zaten doğru
        # olan bir şeyi tekrarlıyor ya da hiçbir şeyi ölçmüyor. İkisi de
        # yeşil görünür ve ikisi de koruma sağlamaz.
        print(f"REDDEDİLDİ — '{a.vaka}' ŞU AN GEÇİYOR.\n")
        print("Kırmızı adımı geçen bir testle başlatılamaz. Hiç kırmızı "
              "yanmamış bir test ne koruduğunu göstermez: belki gerçekten "
              "koruyor, belki zaten doğru olanı tekrarlıyor, belki gövdesi "
              "boş — üçü de yeşil görünür.\n")
        print("Ya test yanlış yazılmış (henüz olmayan davranışı ölçmüyor), "
              "ya da davranış zaten var ve yeni bir şey eklemiyorsun.")
        return 1

    d = durumu_oku()
    d[a.vaka] = {"asama": "kirmizi", "sinav": dosya,
                 "kirmizi_zaman": datetime.now().isoformat(timespec="seconds"),
                 "kirmizi_sebep": str(sonuc)[:200]}
    durumu_yaz(d)
    print(f"KIRMIZI — '{a.vaka}' düşüyor, beklendiği gibi.")
    print(f"  sınav : {dosya}")
    print(f"  sebep : {sonuc}\n")
    print("Şimdi bu testi geçiren EN BASİT kodu yaz. Fazlasını yazma; "
          "fazlası bir sonraki kırmızının işi.")
    return 0


def yesil(a):
    kayit = _bul(a.vaka)
    if kayit is None:
        return 1
    dosya, m, vaka = kayit
    d = durumu_oku()

    if a.vaka not in d or d[a.vaka].get("asama") != "kirmizi":
        print(f"REDDEDİLDİ — '{a.vaka}' için kayıtlı bir kırmızı adım yok.\n")
        print("Önce `kirmizi` çalıştır. Kırmızı yanmadan yeşile geçmek, "
              "testin gerçekten bir şey koruduğunu kanıtlamadan ilerlemektir.")
        return 1

    sonuc = vakayi_kos(dosya, m, vaka)
    if sonuc is not None:
        print(f"HÂLÂ KIRMIZI — '{a.vaka}'\n  {sonuc}\n")
        print("Kod henüz testi geçirmiyor. Devam et.")
        return 1

    # Yeşil sadece bu vaka için değil: başka bir şeyi kırdıysan yeşil değilsin.
    if os.environ.get(DERINLIK):
        print("(iç içe TDD koşusu — bütün vakalar taranmadı, "
              "sadece bu vaka ölçüldü)")
        dusenler = []
    else:
        os.environ[DERINLIK] = "1"
        try:
            dusenler = [ad for ad, (df, mm, vv) in vakalari_topla().items()
                        if ad != a.vaka and vakayi_kos(df, mm, vv) is not None]
        finally:
            os.environ.pop(DERINLIK, None)
    if dusenler:
        print(f"YEŞİL DEĞİL — '{a.vaka}' geçti ama {len(dusenler)} vaka düştü:")
        for x in dusenler[:6]:
            print(f"  · {x}")
        print("\nBir testi geçirmek için başka bir korumayı kırmak ilerleme değildir.")
        return 1

    d[a.vaka]["asama"] = "yesil"
    d[a.vaka]["yesil_zaman"] = datetime.now().isoformat(timespec="seconds")
    durumu_yaz(d)
    print(f"YEŞİL — '{a.vaka}' geçiyor, başka hiçbir vaka düşmedi.\n")
    print("Şimdi `duzenle` adımı: testler yeşil kalırken kodu topla.")
    return 0


def duzenle(a):
    """Yeniden düzenleme: davranış aynı kalmalı, koruma azalmamalı."""
    d = durumu_oku()
    tablo = vakalari_topla()
    sayi = len(tablo)
    onceki = d.get("_kapsam", {}).get("vaka_sayisi")

    if os.environ.get(DERINLIK):
        print("(iç içe TDD koşusu — vaka taraması atlandı)")
        dusenler = []
    else:
        os.environ[DERINLIK] = "1"
        try:
            dusenler = [ad for ad, (df, mm, vv) in tablo.items()
                        if vakayi_kos(df, mm, vv) is not None]
        finally:
            os.environ.pop(DERINLIK, None)

    print(f"YENİDEN DÜZENLEME DENETİMİ\n  vaka sayısı  {sayi}"
          + (f"  (önceki {onceki})" if onceki else ""))
    print(f"  düşen        {len(dusenler)}\n")

    if dusenler:
        for x in dusenler[:6]:
            print(f"  DÜŞTÜ: {x}")
        print("\nYeniden düzenleme davranışı değiştirdi. Geri al ya da düzelt.")
        return 1

    if onceki is not None and sayi < onceki:
        # Testleri silerek yeşil kalmak, yeşil kalmak değildir.
        print(f"REDDEDİLDİ — vaka sayısı {onceki} → {sayi} düştü.\n")
        print("Yeniden düzenleme testleri silmez. Yeşil kalmanın en kolay "
              "yolu korumayı kaldırmaktır ve bu yol kapalı.")
        return 1

    d["_kapsam"] = {"vaka_sayisi": sayi,
                    "zaman": datetime.now().isoformat(timespec="seconds")}
    durumu_yaz(d)
    print("TEMİZ — bütün vakalar yeşil, koruma azalmadı.")
    return 0


def durum(a):
    d = durumu_oku()
    tablo = vakalari_topla()
    print(f"TDD durumu — {len(tablo)} vaka, {len(SINAVLAR)} sınav\n")
    acik = {k: v for k, v in d.items() if not k.startswith("_")}
    if not acik:
        print("  Açık TDD döngüsü yok.")
    for ad, v in acik.items():
        isaret = {"kirmizi": "KIRMIZI", "yesil": "YEŞİL"}.get(v["asama"], v["asama"])
        print(f"  {isaret:8} {ad}")
        if v["asama"] == "kirmizi":
            print(f"           sebep: {v.get('kirmizi_sebep', '')[:80]}")
    if d.get("_kapsam"):
        print(f"\n  son düzenleme denetimi: {d['_kapsam']['vaka_sayisi']} vaka "
              f"({d['_kapsam']['zaman']})")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Kırmızı → Yeşil → Yeniden Düzenle.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("kirmizi", help="testin ŞU AN düştüğünü doğrula")
    p.add_argument("--vaka", required=True)
    p.set_defaults(islev=kirmizi)

    p = alt.add_parser("yesil", help="test geçti mi, başkası kırıldı mı")
    p.add_argument("--vaka", required=True)
    p.set_defaults(islev=yesil)

    p = alt.add_parser("duzenle", help="yeniden düzenleme sonrası denetim")
    p.set_defaults(islev=duzenle)

    p = alt.add_parser("durum", help="açık TDD döngüleri")
    p.set_defaults(islev=durum)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
