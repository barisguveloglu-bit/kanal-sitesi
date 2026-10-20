#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — İz analizi (tepe tırmanma döngüsünün eksik ayağı)
===============================================================
Koşular arası hata analizi. "Bu aynı hata daha önce de oldu mu?"

## Boşluk neydi

Sistemde her halka **kendi turuna** bakıyordu. `elestirmen.py` aynı
turun tekrarını görüyor, `devre.py` aynı koşunun salınımını görüyor,
`eniyile.py` aynı halkanın puanını görüyor. Hiçbiri şunu göremiyordu:

    "Bu aynı şekildeki hata üç ayrı koşuda dört kez oldu."

Ham malzeme de kalıcı değildi: `seyir.jsonl` ve `olay-defteri.jsonl`
ikisi de `.gitignore`'da, oturum bitince yok oluyor. Ertesi gün "nerede
hata yapıldı" sorusunu soracak bir şey kalmıyordu.

Bu defter **kalıcı ve depoda.** Ham iz değil — ham iz bağlamı çürütür ve
zaten `seyir.py`'nin kasten dışarıda bıraktığı şey. Burada duran **hata
şekli**: ne oldu, nerede, hangi kapı yakaladı (ya da yakalayamadı),
kanıtı ne.

## Kimlik neye bağlı

Ders defterinden alınan disiplin: kimliği **doğrulanabilir olana** bağla.

  · YER kümesi   aynı yerde tekrarlayan hata — kimlik adres, sağlam
  · ŞEKİL kümesi aynı şekil farklı yerlerde — kimlik kelime, TAHMİN

İkincisi insan kapısına çıkar (çıkış 3). Kelime örtüşmesiyle "bunlar
aynı hata" demek bir ölçüm değil bir tahmindir; sistem tahminini ölçüm
diye sunmaz.

## Ne uygular, ne uygulamaz

Hiçbir kuralı, ayarı ya da prompt'u kendiliğinden değiştirmez.

Sebebi `tirmanma.py`'deki ile aynı: ölçülen şeyin, ölçen kuralı yazma
yetkisi olursa kural kural olmaktan çıkar. Kızıl takım testinde bunu
gördük — bir testin ADI yerinde bırakılıp GÖVDESİ boşaltıldı ve hiçbir
kapı fark etmedi. Kural yazma yetkisi olan bir ajan bunu kötü niyetle
değil, iyi niyetle yapar: "bu test gereksiz katı" der, gevşetir, sistem
yeşil kalır, ölçüm ölür.

Otomatik önerilebilecek şey kural değil **TEST**: yanlış bir test
gürültülü biçimde kırmızı yanar, yanlış bir kural sessizce yanlış şeyi
savunmaya başlar.

    python3 .claude/iz.py yaz --sekil "..." --nerede "..." --kapi "..." --kanit "..."
    python3 .claude/iz.py kume
    python3 .claude/iz.py oner
    python3 .claude/iz.py kuyruk
    python3 .claude/iz.py kapat --no 3 --karsilik "vaka:<sınav vakası adı>"
    python3 .claude/iz.py durum

Çıkış kodu: 0 temiz · 1 açık öneri var · 3 insan kararı gerekiyor.
"""

import argparse
import datetime
import importlib.util
import json
import os
import re
import sys
import unicodedata

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
DEFTER = os.path.join(KLASOR, "iz-defteri.jsonl")

# Bir şekil kaç kez tekrarlarsa öneri doğurur.
#
# İki, üç değil: bu depoda ölçülen hata sınıflarının çoğu ikinci
# tekrarında zaten belliydi ve üçüncüyü beklemek bir koşu daha kaybetmek
# demekti. Yanlış pozitifin bedeli bir insan bakışı; yanlış negatifin
# bedeli tekrarlanan bir hata.
ESIK = 2

# Kapı adı bu ise hiçbir mekanik denetim yakalamamış demektir.
# Defterin en değerli kaydı bu: yakalanmamış hata, yazılmamış test.
YOK = "yok"


def _sade(metin):
    """Karşılaştırma için sadeleştir — aksan, büyük harf, fazla boşluk.

    `elestirmen.py`'de ölçülen tuzak: `elestirmen` ile `eleştirmen` aynı
    şeyi gösteriyordu ama eşleşmiyordu. NFKD ile ayrıştırıp birleştirici
    işaretleri atmak bunu kapatıyor.
    """
    metin = unicodedata.normalize("NFKD", metin.strip().lower())
    metin = "".join(k for k in metin if not unicodedata.combining(k))
    return re.sub(r"\s+", " ", metin)


def _kelimeler(metin):
    return {k for k in re.split(r"[^a-z0-9]+", _sade(metin)) if len(k) > 3}


def oku():
    if not os.path.exists(DEFTER):
        return []
    kayitlar = []
    with open(DEFTER, encoding="utf-8") as f:
        for no, satir in enumerate(f, 1):
            satir = satir.strip()
            if not satir:
                continue
            try:
                kayitlar.append(json.loads(satir))
            except ValueError:
                kayitlar.append({"_bozuk": no})
    return kayitlar


def kayitlar():
    return [k for k in oku() if "_bozuk" not in k]


def yaz_kayit(kayit):
    with open(DEFTER, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")


def guncelle(kayit):
    hepsi = kayitlar()
    yeni = [kayit if k.get("no") == kayit["no"] else k for k in hepsi]
    with open(DEFTER, "w", encoding="utf-8") as f:
        for k in yeni:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")


def _ders_modulu():
    """`ders.py`'nin koruma çözücüsünü ödünç al.

    Aynı doğrulamayı ikinci kez yazmak, ikisinin ayrışması demektir:
    biri düzeltilir, öbürü eski kalır ve hangisinin doğru olduğu
    bilinmez. Tek çözücü, iki kullanıcı.
    """
    yol = os.path.join(KLASOR, "ders.py")
    if not os.path.exists(yol):
        return None
    tanim = importlib.util.spec_from_file_location("_ders_iz", yol)
    mod = importlib.util.module_from_spec(tanim)
    tanim.loader.exec_module(mod)
    return mod


# --------------------------------------------------------------- kümeleme

def yer_kumeleri(hepsi):
    """Aynı YERDE tekrarlayan hatalar — kimlik adres, doğrulanabilir."""
    kume = {}
    for k in hepsi:
        kume.setdefault(_sade(k.get("nerede", "")), []).append(k)
    return {y: g for y, g in kume.items() if len(g) >= ESIK}


def sekil_kumeleri(hepsi):
    """Aynı ŞEKİL farklı yerlerde — kimlik kelime, TAHMİN.

    Kelime örtüşmesi kimlik değildir; burada yalnızca insana gösterilecek
    bir aday üretilir ve emin olma derecesi açıkça yazılır.
    """
    gruplar = []
    for k in hepsi:
        kelime = _kelimeler(k.get("sekil", ""))
        if not kelime:
            continue
        for g in gruplar:
            ortak = kelime & g["kelime"]
            # Jaccard değil kesişim oranı: kısa bir şekil uzun bir şeklin
            # içinde geçebilir ve bu gerçek bir akrabalıktır.
            oran = len(ortak) / min(len(kelime), len(g["kelime"]))
            if oran >= 0.6:
                g["uyeler"].append(k)
                g["kelime"] |= kelime
                g["oran"] = min(g.get("oran", 1.0), oran)
                break
        else:
            gruplar.append({"kelime": set(kelime), "uyeler": [k], "oran": 1.0})

    cikan = []
    for g in gruplar:
        yerler = {_sade(u.get("nerede", "")) for u in g["uyeler"]}
        # Tek yerde toplananı yer kümesi zaten gösteriyor.
        if len(g["uyeler"]) >= ESIK and len(yerler) > 1:
            cikan.append(g)
    return cikan


# ----------------------------------------------------------------- komutlar

def k_yaz(a):
    hepsi = kayitlar()
    # Tekillik KANITA bağlı, şekle değil.
    #
    # İlk hâlinde şekil+yer aynıysa reddediyordu ve defter, var olma
    # sebebini reddediyordu: "aynı şekildeki hata aynı yerde tekrar oldu"
    # tam olarak yakalanmak istenen şey. Kaydetmeye çalışınca çıktı —
    # araç kendi kusurunu ilk gerçek kullanımında gösterdi.
    #
    # Ayrım şu: aynı OLAYIN iki kez yazılması gürültüdür, aynı ŞEKLİN
    # ikinci kez OLMASI sinyaldir. İkisini ayıran şey kanıt adresi.
    for k in hepsi:
        if (_sade(k.get("sekil", "")) == _sade(a.sekil)
                and _sade(k.get("nerede", "")) == _sade(a.nerede)
                and _sade(k.get("kanit", "")) == _sade(a.kanit)):
            print(f"Bu iz zaten var [{k['no']}] — aynı şekil, aynı yer, aynı kanıt.")
            print("Aynı olayı iki kez yazmak kümelemeyi yanıltır.")
            print("Hata TEKRAR olduysa kanıtı ayrı ver: yeni commit,")
            print("yeni satır — tekrarın kanıtı da tekrardan farklıdır.")
            return 1

    no = max([k.get("no", 0) for k in hepsi], default=0) + 1
    kayit = {
        "no": no,
        "tarih": datetime.date.today().isoformat(),
        "sekil": a.sekil,
        "nerede": a.nerede,
        "kapi": a.kapi,
        "yakalandi": _sade(a.kapi) != YOK,
        "kanit": a.kanit,
        "nasil": a.nasil or "",
    }
    yaz_kayit(kayit)
    print(f"İz [{no}] kaydedildi.")
    if not kayit["yakalandi"]:
        print()
        print("YAKALANMAMIŞ — bunu gören mekanik bir kapı yok.")
        print("Defterin en değerli kaydı bu. `oner` bunu teste çevirmeyi")
        print("önerecek; öneriyi kapatmak senin kararın.")
    return 0


def k_kume(a):
    hepsi = kayitlar()
    if not hepsi:
        print("İz defteri boş — kümelenecek bir şey yok.")
        return 0

    yer = yer_kumeleri(hepsi)
    sekil = sekil_kumeleri(hepsi)

    if not yer and not sekil:
        print(f"Tekrar eden hata yok ({len(hepsi)} iz, eşik {ESIK}).")
        print("Bu, sistemin temiz olduğu anlamına gelmez — sadece aynı")
        print("hatanın iki kez kaydedilmediği anlamına gelir.")
        return 0

    if yer:
        print(f"YER KÜMESİ ({len(yer)}) — aynı yerde tekrarlıyor, kimlik adres:\n")
        for y, g in sorted(yer.items(), key=lambda x: -len(x[1])):
            kacan = [u for u in g if not u.get("yakalandi")]
            print(f"  {g[0]['nerede']}  ×{len(g)}"
                  + (f"  ({len(kacan)} tanesini hiçbir kapı yakalamadı)" if kacan else ""))
            for u in g:
                isaret = "·" if u.get("yakalandi") else "!"
                print(f"    {isaret} [{u['no']}] {u['sekil']}")
        print()

    if sekil:
        print(f"ŞEKİL KÜMESİ ({len(sekil)}) — farklı yerlerde benzer şekil:\n")
        for g in sorted(sekil, key=lambda x: -len(x["uyeler"])):
            print(f"  ×{len(g['uyeler'])}  (kelime örtüşmesi %{int(g['oran'] * 100)})")
            for u in g["uyeler"]:
                isaret = "·" if u.get("yakalandi") else "!"
                print(f"    {isaret} [{u['no']}] {u['nerede']} — {u['sekil']}")
        print()
        print("Bu kümelerin kimliği KELİME örtüşmesi, yani bir tahmin.")
        print("Aynı hata mı, benzer cümleyle yazılmış iki ayrı hata mı —")
        print("makine ayıramaz. Bakman gerekiyor.")
        return 3
    return 0


def k_oner(a):
    """Kümelerden somut öneri üret — ve hiçbirini uygulama."""
    hepsi = kayitlar()
    yer = yer_kumeleri(hepsi)

    oneriler = []
    for y, g in sorted(yer.items(), key=lambda x: -len(x[1])):
        # Karşılığı doğrulanmış iz artık açık öneri değildir. Bunu
        # atlamak, kapatılan işi her koşuda yeniden önermek demekti:
        # kuyruk boşken `oner` hâlâ iş gösteriyordu ve iki sayaç
        # birbirini tutmuyordu.
        kacan = [u for u in g
                 if not u.get("yakalandi") and not u.get("karsilik")]
        if not kacan:
            # Tekrarlıyor ama yakalanıyor ya da karşılığı yazılmış:
            # kapı çalışıyor. Öneri üretmek gürültü olurdu.
            continue
        oneriler.append({
            "yer": g[0]["nerede"],
            "kez": len(g),
            "kacan": [u["no"] for u in kacan],
            "sekil": kacan[0]["sekil"],
            "kanit": [u["kanit"] for u in kacan],
        })

    if not oneriler:
        print("Öneri yok: tekrarlayan her hatayı bir kapı yakalıyor.")
        return 0

    print(f"{len(oneriler)} ÖNERİ — hiçbiri uygulanmadı:\n")
    for o in oneriler:
        print(f"  {o['yer']}  ×{o['kez']}")
        print(f"    şekil : {o['sekil']}")
        print(f"    kaçan : iz {o['kacan']}")
        print(f"    kanıt : {', '.join(o['kanit'][:3])}")
        print(f"    öneri : bu şekli yakalayan bir SINAV VAKASI yaz")
        print()

    print("Kural, ayar ya da prompt değiştirilmedi ve değiştirilmeyecek.")
    print("Önerilebilecek şey test: yanlış bir test kırmızı yanar,")
    print("yanlış bir kural sessizce yanlış şeyi savunmaya başlar.")
    print()
    print("Bir öneriyi kapatmak için onu kapatan vakanın ADINI söyle:")
    print("  python3 .claude/iz.py kapat --no <iz no> --karsilik \"vaka:<ad>\"")
    return 1


def k_kuyruk(a):
    acik = [k for k in kayitlar() if not k.get("yakalandi") and not k.get("karsilik")]
    if not acik:
        print("Kuyruk boş — yakalanmamış her izin bir karşılığı var.")
        return 0
    print(f"{len(acik)} yakalanmamış iz, karşılığı yok:\n")
    for k in acik:
        print(f"  [{k['no']}] {k['nerede']}")
        print(f"       {k['sekil']}")
        print(f"       kanıt: {k['kanit']}")
    return 1


def k_kapat(a):
    """Bir izi, onu yakalayan vakanın ADIYLA kapat — ve ad gerçek olmalı."""
    son = {k["no"]: k for k in kayitlar()}
    hedef = son.get(a.no)
    if hedef is None:
        print(f"[{a.no}] numaralı iz yok.")
        return 1

    drs = _ders_modulu()
    if drs is None:
        print("ders.py bulunamadı — karşılık doğrulanamıyor.")
        print("Doğrulanamayan karşılık, karşılık değildir.")
        return 1
    try:
        tur, yer, ozet = drs.koruma_coz(a.karsilik)
    except drs.KorumaHatasi as e:
        print("KARŞILIK REDDEDİLDİ")
        print(f"  {e}")
        print()
        print("'Hallettim' bir karşılık değil. Kapatan şeyin adı söylenmeli")
        print("ve o ad gerçekten var olmalı.")
        return 1

    hedef["karsilik"] = a.karsilik
    hedef["karsilik_tur"] = tur
    hedef["karsilik_yer"] = yer
    hedef["karsilik_ozet"] = ozet
    hedef["kapandi"] = datetime.date.today().isoformat()
    guncelle(hedef)
    print(f"  karşılık doğrulandı ({tur}) → {yer}  [özet {ozet}]")
    print(f"[{a.no}] kapandı.")
    return 0


def k_coken(a):
    """Karşılığı sonradan silinmiş ya da içi boşaltılmış izler.

    `evrim.py`'deki çöken kapanış denetiminin aynısı: bir boşluk kapandı
    diye işaretlenip karşılığı silinirse, kapalı görünür ve kimse aramaz.
    """
    drs = _ders_modulu()
    if drs is None:
        print("ders.py bulunamadı — çöken kapanış denetlenemiyor.")
        return 1
    kirik, kaymis = [], []
    for k in kayitlar():
        if not k.get("karsilik"):
            continue
        try:
            _, yer, ozet = drs.koruma_coz(k["karsilik"])
        except drs.KorumaHatasi as e:
            kirik.append((k["no"], k["karsilik"], str(e).splitlines()[0]))
            continue
        if k.get("karsilik_ozet") and k["karsilik_ozet"] != ozet:
            kaymis.append((k["no"], yer, k["karsilik_ozet"], ozet))

    if not kirik and not kaymis:
        print("Kapatılan her izin karşılığı yerinde ve içeriği değişmemiş.")
        return 0
    if kirik:
        print(f"ÇÖKEN KAPANIŞ ({len(kirik)}) — karşılığı artık yok:\n")
        for no, kar, hata in kirik:
            print(f"  [{no}] {kar}")
            print(f"       {hata}")
        print()
    if kaymis:
        print(f"KAYMIŞ KARŞILIK ({len(kaymis)}) — adı duruyor, içeriği değişti:\n")
        for no, yer, eski, yeni in kaymis:
            print(f"  [{no}] {yer}")
            print(f"       özet {eski} → {yeni}")
    return 1


def k_durum(a):
    hepsi = kayitlar()
    bozuk = [k for k in oku() if "_bozuk" in k]
    yakalanan = [k for k in hepsi if k.get("yakalandi")]
    kapali = [k for k in hepsi if k.get("karsilik")]
    print("İZ DEFTERİ")
    print(f"  iz              : {len(hepsi)}")
    print(f"  kapı yakaladı   : {len(yakalanan)}")
    print(f"  kapı kaçırdı    : {len(hepsi) - len(yakalanan)}")
    print(f"  karşılığı var   : {len(kapali)}")
    print(f"  yer kümesi      : {len(yer_kumeleri(hepsi))}")
    print(f"  şekil kümesi    : {len(sekil_kumeleri(hepsi))}")
    if bozuk:
        print(f"  BOZUK SATIR     : {len(bozuk)}")
        return 1
    return 0


def main(argv=None):
    a = argparse.ArgumentParser(description="İz analizi — koşular arası hata döngüsü.")
    alt = a.add_subparsers(dest="komut", required=True)

    y = alt.add_parser("yaz", help="bir hatayı deftere geçir")
    y.add_argument("--sekil", required=True, help="hatanın şekli, tek cümle")
    y.add_argument("--nerede", required=True, help="dosya, araç ya da halka")
    y.add_argument("--kapi", required=True,
                   help=f"yakalayan kapı, yakalayan yoksa '{YOK}'")
    y.add_argument("--kanit", required=True, help="somut adres: dosya:satır ya da commit")
    y.add_argument("--nasil", help="nasıl çözüldü")
    y.set_defaults(islev=k_yaz)

    for ad, islev, yardim in (
            ("kume", k_kume, "tekrar eden hataları kümele"),
            ("oner", k_oner, "kümelerden öneri üret — uygulamaz"),
            ("kuyruk", k_kuyruk, "karşılığı olmayan yakalanmamış izler"),
            ("coken", k_coken, "karşılığı silinmiş ya da boşaltılmış izler"),
            ("durum", k_durum, "defterin özeti")):
        p = alt.add_parser(ad, help=yardim)
        p.set_defaults(islev=islev)

    k = alt.add_parser("kapat", help="bir izi, onu yakalayan vakanın adıyla kapat")
    k.add_argument("--no", type=int, required=True)
    k.add_argument("--karsilik", required=True,
                   help="vaka:<sınav vakası adı> ya da dosya:<yol>#<çapa>")
    k.set_defaults(islev=k_kapat)

    ayr = a.parse_args(argv)
    return ayr.islev(ayr)


if __name__ == "__main__":
    sys.exit(main())
