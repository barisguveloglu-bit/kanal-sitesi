#!/usr/bin/env python3
"""Evrim döngüsü — Echo'nun girilen işe göre kendini yenilemesi.

Barış'ın tarifi: "girdiğim işe göre kendisini düzeltebilecek, yeni şeyler
ekleyebilecek bir yapı."

Sorun şu: bu kadro bir site arşivi için kuruldu. Barış yarın başka bir işe
girerse (yeni bir bölüm, başka bir tür içerik, farklı bir mecra) kadro o işi
denetleyecek ajana sahip olmayabilir — ve **sahip olmadığını fark etmez.**
Eksik denetim, kötü denetimden tehlikelidir: kimse bakmadığı için her şey
temiz görünür.

Bu döngü o boşluğu mekanikleştiriyor:

    baslat  →  yeni bir iş alanı bildir, eksikleri hesapla
    eksik   →  açık boşlukları listele
    kapat   →  bir boşluğu, onu KAPATAN ŞEYİN ADIYLA kapat

Son adım geri bildirim döngüsünden alınan disiplin: bir kayıt, koruyan
testin adı söylenmeden kapatılamıyor. Burada da bir boşluk, onu kapatan
ajanın/aracın adı söylenmeden kapatılamaz — ve o ad **gerçekten var
olmalı.** "Hallettim" demek yetmiyor; dosya diskte olacak.

Çıkış kodları: 0 temiz · 1 açık boşluk var · 3 insan kararı gerekiyor.
"""
import argparse
import datetime
import json
import os
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
DEFTER = os.path.join(KLASOR, "evrim-defteri.jsonl")


# İş alanı → o işi yapabilmek için GEREKEN yetenekler.
#
# Bu tablo Echo'nun kendini tanıma biçimi. Bir alana girildiğinde burada
# yazan her yetenek aranır; olmayan her biri bir boşluktur.
#
# Tablo sabit değil — büyümesi bu döngünün asıl amacı. Bilinmeyen bir alan
# geldiğinde `baslat` onu "tanımsız alan" olarak kaydeder ve insan kapısına
# çıkar: hangi yeteneklerin gerektiğini makine bilemez.
ALANLAR = {
    "canon": [
        "agents/canon-denetci.md", "agents/mitoloji-denetci.md",
        "agents/kurgu-denetci.md", "agents/zaman-denetci.md",
        "ara.py", "butunluk.py",
    ],
    "hikaye": [
        "agents/hikaye-yazari.md", "agents/anlati-denetci.md",
        "agents/kurgu-denetci.md", "agents/duzenleyici.md",
        "agents/tarih-arastirmaci.md", "agents/zaman-denetci.md",
    ],
    "site": [
        "agents/erisim-denetci.md", "agents/mobil-denetci.md",
        "agents/gorsel-denetci.md", "agents/deneyim-denetci.md",
        "agents/performans-denetci.md", "agents/kesif-denetci.md",
        "agents/dil-denetci.md", "dogrula.py",
    ],
    "veri": [
        "agents/veri-denetci.md", "agents/olukod-denetci.md",
        "okuyucu.py", "butunluk.py",
    ],
    "karakter": [
        "agents/karakter-yazari.md", "agents/mitoloji-denetci.md",
        "agents/kurgu-denetci.md", "butunluk.py",
    ],
    "arastirma": [
        "agents/tarih-arastirmaci.md", "agents/kaynak-denetci.md",
    ],
    "olcum": [
        "agents/test-denetci.md", "sinav.py", "mutasyon.py",
        "arac-sinavi.py", "degerlendir.py",
    ],
    "otomasyon": [
        "agents/akis-denetci.md", "olay.py", "devre.py", "kanca.py",
    ],
    "kadro": [
        "agents/celiski-denetci.md", "agents/ozetleyici.md",
        "havuz.py", "gorev.py", "disajan.py",
    ],
    "gizlilik": [
        "agents/gizlilik-denetci.md", "agents/kesif-denetci.md",
    ],
    "belge": [
        "agents/belge-denetci.md", "agents/surum-denetci.md", "surum.py",
    ],
}


# İş şekli → o iş için anlamlı döngüler.
#
# "Uyarlanabilir döngü" buradan çıkıyor: her işe her döngüyü koşmak
# israf, hiçbirini koşmamak körlük. Tablo hangisinin ne zaman işe
# yaradığını söylüyor.
#
# Eşleştirme anahtar kelimeyle yapılıyor ve bu KABA bir yöntem. Zayıf
# eşleşmede araç tahmin yürütmüyor, "kendin seç" diyor — yanlış döngü
# önermek, döngü önermemekten kötüdür.
IS_SEKILLERI = {
    "üretim": {
        "anahtar": ("yaz", "üret", "taslak", "hikaye", "karakter", "içerik",
                    "oluştur", "tasarla"),
        "donguler": [
            ("elestirmen.py tur", "eleştirmen-aktör: üretici kendi kusurunu görmez"),
            ("gorev.py dogrula", "doğrulayıcı: atıflar gerçekten o satırı gösteriyor mu"),
            ("hedef.py", "değişmez sözleşme: neyin DEĞİŞMEYECEĞİNİ baştan yaz"),
        ],
    },
    "denetim": {
        "anahtar": ("denetle", "kontrol", "incele", "ara", "bul", "tara",
                    "audit", "gözden geçir"),
        "donguler": [
            ("havuz.py + /orkestra", "çok parçalı iş: kadroyu hesapla, elle sayma"),
            ("celiski-denetci", "raporları birbirine karşı denetle — kapsanmayanı bul"),
            ("ozetleyici ya da Codex", "derleme: hiçbir bulgu sessizce düşmesin"),
        ],
    },
    "ölçüm": {
        "anahtar": ("test", "sınav", "ölç", "denetleyici", "kapı", "vaka",
                    "mutasyon"),
        "donguler": [
            ("tdd.py", "kırmızı-yeşil-düzenle: geçen vakayla TDD başlatılamaz"),
            ("mutasyon.py", "testin kendisini ölç — ölü test buradan çıkar"),
            ("sinav.py", "denetleyiciyi kasten boz, yakalıyor mu bak"),
        ],
    },
    "ayar": {
        "anahtar": ("parametre", "ayar", "eşik", "iyileştir", "hızlandır",
                    "optimize"),
        "donguler": [
            ("tirmanma.py", "tepe tırmanma: plato, sırt ve ezber tepeyi raporlar"),
            ("eniyile.py", "puanlı değerlendirici, kısır turda durur"),
            ("degerlendir.py", "önce ölç — ölçmeden ayar, tahmindir"),
        ],
    },
    "canon": {
        "anahtar": ("canon", "lore", "evren", "kural koy", "efsane", "kademe"),
        "donguler": [
            ("hedef.py + insan kapısı", "canon kararı ajanın değil Barış'ın"),
            ("butunluk.py", "canon ↔ veri ↔ site gerçekleri"),
            ("zaman-denetci", "tarih aritmetiği ve çağ tutarlılığı"),
        ],
    },
    "hata": {
        "anahtar": ("hata", "bozuk", "çalışmıyor", "kırık", "düzelt", "onar"),
        "donguler": [
            ("geri-bildirim.py", "hatayı KALICI teste çevir — yoksa geri gelir"),
            ("ders.py", "aynı sınıftan bir ders çıktı mı, yaz"),
            ("tdd.py kirmizi", "önce düşen vaka, sonra düzeltme"),
        ],
    },
    "uzun": {
        "anahtar": ("büyük", "uzun", "çok", "kapsamlı", "tüm", "hepsi",
                    "tam kadro", "dalga"),
        "donguler": [
            ("butce.py", "ajan bütçesi: koşunun ortasında limite çarpma"),
            ("butce.py kilometre", "devam noktası: koşu ölürse baştan başlama"),
            ("devre.py", "tur, duvar saati ve ilerleme sınırı"),
            ("seyir.py ozet", "bağlam sıkıştırma: ham iz değil karar taşınır"),
        ],
    },
}


def k_dongu(a):
    """Uyarlanabilir döngü seçimi: bu iş için hangi halka?"""
    metin = a.is_.lower()
    puanlar = []
    for ad, tanim in IS_SEKILLERI.items():
        vurus = [k for k in tanim["anahtar"] if k in metin]
        if vurus:
            puanlar.append((len(vurus), ad, vurus))
    puanlar.sort(reverse=True)

    print(f"İŞ: {a.is_}\n")

    if not puanlar:
        print("Bu iş bilinen şekillerden hiçbirine benzemedi.")
        print()
        print("Bu bir cevap değil, cevap verememe. Anahtar kelime eşleşmesi")
        print("kaba bir yöntem — zayıf eşleşmede tahmin yürütmek, yanlış")
        print("döngü önermektir. Şekiller:")
        print("  " + ", ".join(sorted(IS_SEKILLERI)))
        print()
        print("Bu iş yeni bir şekilse IS_SEKILLERI tablosuna ekle.")
        return 3

    # Her zaman geçerli olanlar. Bunlar işin şekline bağlı değil.
    print("HER İŞTE:")
    print("  · dogrula.py        kapı — 0/1/3 dışında kod 'geçti' sayılmaz")
    print("  · ders.py ara       bu konuda daha önce ders çıktı mı")
    print()

    for _, ad, vurus in puanlar:
        print(f"{ad.upper()}  (eşleşen: {', '.join(vurus)})")
        for arac, neden in IS_SEKILLERI[ad]["donguler"]:
            print(f"  · {arac:<24} {neden}")
        print()

    if len(puanlar) > 1:
        print("Birden fazla şekle uydu — iş bölünebilir demektir.")
        print("havuz.py ile parçalara ayır, her parçaya kendi döngüsünü ver.")
    return 0


def _yol(karsilik):
    """Yetenek adını gerçek dosya yoluna çevirir."""
    return os.path.join(KLASOR, karsilik)


def var_mi(karsilik):
    """Yetenek gerçekten diskte var mı.

    Bu fonksiyon bu döngünün belkemiği. "Eklendi" demek yetmiyor —
    dosya olacak. İddia ile gerçeğin ayrılabildiği her yerde ayrılır.
    """
    return os.path.exists(_yol(karsilik))


def defter_oku():
    if not os.path.exists(DEFTER):
        return []
    kayitlar = []
    with open(DEFTER, encoding="utf-8") as f:
        for satir in f:
            satir = satir.strip()
            if not satir:
                continue
            try:
                kayitlar.append(json.loads(satir))
            except ValueError:
                # Bozuk satır atlanır ama sessizce değil — sayılır.
                kayitlar.append({"_bozuk": satir})
    return kayitlar


def defter_yaz(kayit):
    with open(DEFTER, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")


def sonraki_no(kayitlar):
    nolar = [k.get("no", 0) for k in kayitlar if isinstance(k.get("no"), int)]
    return max(nolar, default=0) + 1


def k_baslat(a):
    """Yeni bir iş alanı bildir, eksikleri hesapla."""
    kayitlar = defter_oku()
    alan = a.alan.strip().lower()
    bilinen = alan in ALANLAR

    print(f"İŞ: {a.is_}")
    print(f"ALAN: {alan}" + ("" if bilinen else "  ← TANIMSIZ"))
    print()

    if not bilinen:
        # Bilinmeyen alan, bu döngünün var olma sebebi. Makine hangi
        # yeteneklerin gerektiğini bilemez — insan söyleyecek.
        no = sonraki_no(kayitlar)
        defter_yaz({
            "no": no, "tur": "tanimsiz-alan", "alan": alan, "is": a.is_,
            "durum": "acik", "tarih": datetime.date.today().isoformat(),
        })
        print(f"Bu alan tabloda yok. Boşluk [{no}] olarak kaydedildi.")
        print()
        print("Echo bu işi neyle denetleyeceğini bilmiyor. Bilinen alanlar:")
        print("  " + ", ".join(sorted(ALANLAR)))
        print()
        print("Yapılacak: bu alan için gereken yetenekleri belirle, üret,")
        print(f"sonra `evrim.py kapat --no {no} --karsilik <ad>` ile kapat.")
        print()
        print("INSAN KAPISI — hangi yeteneklerin gerektiği bir karardır.")
        return 3

    gerekli = ALANLAR[alan]
    eksikler = [g for g in gerekli if not var_mi(g)]
    varlar = [g for g in gerekli if var_mi(g)]

    print(f"Gereken {len(gerekli)} yetenek:")
    for g in gerekli:
        print(f"  {'✓' if g in varlar else '✗'} {g}")
    print()

    if not eksikler:
        print(f"Echo bu iş için hazır. {len(varlar)}/{len(gerekli)} yetenek yerinde.")
        return 0

    for e in eksikler:
        no = sonraki_no(kayitlar)
        kayitlar.append({"no": no})  # numara çakışmasın
        defter_yaz({
            "no": no, "tur": "eksik-yetenek", "alan": alan, "is": a.is_,
            "yetenek": e, "durum": "acik",
            "tarih": datetime.date.today().isoformat(),
        })
        print(f"BOŞLUK [{no}] — {e} yok")
    print()
    print(f"{len(eksikler)} boşluk açıldı. Üretmeden bu işe girme:")
    print("eksik denetim, kötü denetimden tehlikelidir — kimse bakmadığı")
    print("için her şey temiz görünür.")
    return 1


def k_alanlar(a):
    """Bilinen alanları ve hazırlık durumunu göster."""
    print("ALANLAR — her biri için gereken yetenekler ve durum\n")
    eksik_toplam = 0
    for alan in sorted(ALANLAR):
        gerekli = ALANLAR[alan]
        eksik = [g for g in gerekli if not var_mi(g)]
        eksik_toplam += len(eksik)
        durum = "hazır" if not eksik else f"{len(eksik)} eksik"
        print(f"  {alan:<12} {len(gerekli) - len(eksik)}/{len(gerekli)}  {durum}")
        for e in eksik:
            print(f"               ✗ {e}")
    print()
    return 1 if eksik_toplam else 0


def k_eksik(a):
    """Açık boşlukları listele."""
    kayitlar = defter_oku()
    acik = [k for k in kayitlar
            if k.get("durum") == "acik" and "no" in k and "tur" in k]
    if not acik:
        print("Açık evrim boşluğu yok.")
        return 0
    print(f"{len(acik)} açık boşluk:\n")
    for k in acik:
        if k["tur"] == "tanimsiz-alan":
            print(f"  [{k['no']}] TANIMSIZ ALAN: {k['alan']}")
            print(f"       iş: {k.get('is', '')}")
        else:
            print(f"  [{k['no']}] {k.get('yetenek')} — alan: {k.get('alan')}")
    print()
    print("Kapatmak için: evrim.py kapat --no <n> --karsilik <ad>")
    print("Karşılık gerçekten var olmalı — 'hallettim' kabul edilmiyor.")
    return 1


def k_kapat(a):
    """Bir boşluğu, onu kapatan şeyin adıyla kapat."""
    kayitlar = defter_oku()
    hedef = next((k for k in kayitlar if k.get("no") == a.no
                  and k.get("durum") == "acik"), None)
    if hedef is None:
        print(f"[{a.no}] numaralı açık boşluk yok.")
        return 1

    # Bu kontrol bu aracın tek gerçek işi: iddia ile gerçeği ayırmak.
    if not var_mi(a.karsilik):
        print(f"REDDEDİLDİ — '{a.karsilik}' diskte yok.")
        print(f"Aranan yer: {_yol(a.karsilik)}")
        print()
        print("Bir boşluk, onu kapatan şeyin ADIYLA kapatılır ve o ad")
        print("gerçekten var olmalı. Kapatılmış ama karşılığı olmayan")
        print("boşluk, kapatılmamış boşluktan kötüdür: artık kimse")
        print("aramıyor.")
        return 1

    defter_yaz({
        "no": a.no, "tur": "kapanis", "durum": "kapali",
        "karsilik": a.karsilik, "not": a.not_ or "",
        "tarih": datetime.date.today().isoformat(),
    })
    print(f"[{a.no}] kapatıldı → {a.karsilik}")
    if hedef["tur"] == "tanimsiz-alan":
        print()
        print("Bu bir tanımsız alandı. Alan kalıcı olacaksa ALANLAR")
        print("tablosuna da ekle — yoksa bir dahaki sefere yine sorulur.")
    return 0


def k_durum(a):
    """Defterin özeti."""
    kayitlar = defter_oku()
    bozuk = [k for k in kayitlar if "_bozuk" in k]
    acilan = [k for k in kayitlar if k.get("tur") in
              ("eksik-yetenek", "tanimsiz-alan")]
    kapanis = [k for k in kayitlar if k.get("tur") == "kapanis"]
    kapali_nolar = {k["no"] for k in kapanis}
    acik = [k for k in acilan if k["no"] not in kapali_nolar]

    print("EVRİM DEFTERİ")
    print(f"  açılan boşluk : {len(acilan)}")
    print(f"  kapatılan     : {len(kapanis)}")
    print(f"  açık          : {len(acik)}")
    if bozuk:
        print(f"  BOZUK SATIR   : {len(bozuk)}")

    # Kapanışların karşılıkları hâlâ duruyor mu? Evrim de çürür:
    # bir boşluk bir ajanla kapatılır, sonra o ajan silinir ve boşluk
    # kapalı görünmeye devam eder.
    coken = [k for k in kapanis if not var_mi(k.get("karsilik", ""))]
    if coken:
        print()
        print("ÇÖKEN KAPANIŞ — karşılığı artık yok:")
        for k in coken:
            print(f"  [{k['no']}] {k.get('karsilik')}")
        print("Bu boşluklar yeniden açık sayılmalı.")
        return 1

    alan_eksik = sum(len([g for g in v if not var_mi(g)])
                     for v in ALANLAR.values())
    print(f"  alan tablosunda eksik yetenek : {alan_eksik}")
    return 1 if (acik or alan_eksik) else 0


def main(argv=None):
    a = argparse.ArgumentParser(description="Echo Orkestra evrim döngüsü.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("baslat", help="yeni iş alanı bildir, eksikleri hesapla")
    p.add_argument("--is", dest="is_", required=True)
    p.add_argument("--alan", required=True)
    p.set_defaults(fn=k_baslat)

    p = alt.add_parser("alanlar", help="bilinen alanlar ve hazırlık durumu")
    p.set_defaults(fn=k_alanlar)

    p = alt.add_parser("eksik", help="açık boşlukları listele")
    p.set_defaults(fn=k_eksik)

    p = alt.add_parser("kapat", help="boşluğu karşılığının adıyla kapat")
    p.add_argument("--no", type=int, required=True)
    p.add_argument("--karsilik", required=True,
                   help="boşluğu kapatan ajan/araç (gerçekten var olmalı)")
    p.add_argument("--not", dest="not_", default="")
    p.set_defaults(fn=k_kapat)

    p = alt.add_parser("dongu", help="bu iş için hangi döngü (uyarlanabilir)")
    p.add_argument("--is", dest="is_", required=True)
    p.set_defaults(fn=k_dongu)

    p = alt.add_parser("durum", help="defterin özeti")
    p.set_defaults(fn=k_durum)

    n = a.parse_args(argv)
    return n.fn(n)


if __name__ == "__main__":
    sys.exit(main())
