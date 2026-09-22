#!/usr/bin/env python3
"""Ders defteri — oturumlar arasında yaşayan hafıza.

Bellek geliştirme döngüsünün eksik halkası buydu ve kırıktı.

`seyir.py` uzun koşunun hafızası ama `.gitignore`'da: "tur izi koşuya
özel, sürüme girmez." Doğru bir karar — ham tur izi bağlamı çürütür.
Ama yan etkisi şuydu: oturum bitince **ders de gidiyordu.**

Bir koşuda şunlar öğrenildi ve hepsi kayboldu:
  · sabit satır numarası gömen test, ölçtüğü şeyden hızlı çürür
  · kodu düzeltip onu anlatan docstring'i bırakmak
  · çıkış kodunu borudan sonra okumak (`| tail; $?` → tail'in kodu)
  · aracın hiç basmadığı kelimeye bağlanan iddia

Bunlar tekrar öğrenilecek hatalar. Bu defter onları tutar.

İki katman ayrımı:
  seyir.jsonl   koşuya özel, gitignore'da, tur bitince gereksiz
  dersler.jsonl KALICI, depoya girer, her oturumda okunur

Bir ders `koruma` alanı taşır: onu mekanik olarak engelleyen test ya da
denetim. Korumasız ders, unutulmayı bekleyen derstir — `korumasiz`
komutu onları listeler. Zorunlu değil, çünkü her ders mekanikleşemez;
ama sayılır, çünkü sayılmayan şey birikir.

Çıkış kodları: 0 temiz · 1 dikkat gerektiren durum var.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
DEFTER = os.path.join(KLASOR, "dersler.jsonl")

# Sınav vakalarının aranacağı dosyalar.
SINAV_DOSYALARI = ("arac-sinavi.py", "butunluk.py", "sinav.py")


class KorumaHatasi(ValueError):
    """Koruma doğrulanamadı."""


def _vakalar():
    """Kayıtlı sınav vakalarının adı → (dosya, işlev adı)."""
    bulunan = {}
    for ad in SINAV_DOSYALARI:
        yol = os.path.join(KLASOR, ad)
        if not os.path.exists(yol):
            continue
        metin = open(yol, encoding="utf-8").read()
        # ("vaka adı", islev)  ya da  ("bolum", "vaka adı", islev)
        for eslesme in re.finditer(
                r'\(\s*(?:"[a-zçğıöşü]+",\s*)?"([^"]{6,})"\s*,\s*([a-z_][a-z0-9_]*)\s*\)',
                metin):
            bulunan[eslesme.group(1)] = (ad, eslesme.group(2))
    return bulunan


def _islev_govdesi(dosya, islev):
    """Bir sınav işlevinin gövdesi — özet bunun üzerinden alınır.

    Neden gövde, neden sadece ad değil: kızıl takım testinde bir vakanın
    İDDİASI `if False:` yapıldı ve vaka adı yerinde kaldı. Ada bakan bir
    doğrulama o sabotajı göremez. Gövde değişince ders "korumam değişti"
    diyebiliyor.
    """
    metin = open(os.path.join(KLASOR, dosya), encoding="utf-8").read()
    bas = metin.find(f"def {islev}(")
    if bas < 0:
        return None
    son = metin.find("\ndef ", bas + 1)
    return metin[bas:son if son > 0 else len(metin)]


def _capa_paragrafi(yol, capa):
    """Çapa metninin bulunduğu paragraf — boş satıra kadar.

    Dosyanın tamamını özetlemek işe yaramaz: `dogrula.py`'ye ilgisiz bir
    satır eklemek bütün dersleri bayat gösterirdi. Paragraf, ilgili
    bölgeyi kapsayacak kadar dar, tek satırdan fazlasını görecek kadar
    geniş.
    """
    tam = os.path.join(KOK, yol)
    if not os.path.exists(tam):
        return None
    satirlar = open(tam, encoding="utf-8").read().splitlines()
    for i, s in enumerate(satirlar):
        if capa in s:
            j = i
            while j < len(satirlar) and satirlar[j].strip():
                j += 1
            return "\n".join(satirlar[i:j])
    return None


def koruma_coz(koruma):
    """Korumayı doğrular ve özetini üretir.

    İki biçim var, ikisi de DOĞRULANABİLİR:
      vaka:<sınav vakası adı>        kayıtlı bir vaka olmalı
      dosya:<yol>#<çapa metni>       dosya var olmalı, çapa içinde geçmeli

    Serbest metin kabul edilmiyor. Önceki hâlinde `koruma` yalnızca bir
    dizeydi ve hiçbir şey onu denetlemiyordu: "korunuyor" diyen bir ders
    aslında korunmuyor olabilirdi. Ölçtüm — 11 korumanın 5'i var olmayan
    bir şeyi gösteriyordu.

    Döner: (tur, hedef, ozet)
    """
    if koruma.startswith("vaka:"):
        ad = koruma[5:].strip()
        vakalar = _vakalar()
        if ad not in vakalar:
            yakin = [v for v in vakalar if ad.lower()[:18] in v.lower()]
            ek = f" Yakın olanlar: {yakin[:3]}" if yakin else ""
            raise KorumaHatasi(f"'{ad}' diye kayıtlı bir sınav vakası yok.{ek}")
        dosya, islev = vakalar[ad]
        govde = _islev_govdesi(dosya, islev)
        if govde is None:
            raise KorumaHatasi(f"'{ad}' vakası kayıtlı ama işlevi "
                               f"({islev}) {dosya} içinde bulunamadı.")
        return "vaka", f"{dosya}:{islev}", hashlib.sha256(
            govde.encode("utf-8")).hexdigest()[:16]

    if koruma.startswith("dosya:"):
        kalan = koruma[6:]
        if "#" not in kalan:
            raise KorumaHatasi("dosya koruması 'dosya:<yol>#<çapa>' "
                               "biçiminde olmalı — çapa olmadan dosyanın "
                               "neresinin koruduğu belli olmaz.")
        yol, capa = kalan.split("#", 1)
        yol, capa = yol.strip(), capa.strip()
        if not os.path.exists(os.path.join(KOK, yol)):
            raise KorumaHatasi(f"dosya yok: {yol}")
        paragraf = _capa_paragrafi(yol, capa)
        if paragraf is None:
            raise KorumaHatasi(f"çapa metni '{capa}' {yol} içinde geçmiyor.")
        return "dosya", f"{yol}#{capa}", hashlib.sha256(
            paragraf.encode("utf-8")).hexdigest()[:16]

    raise KorumaHatasi(
        "koruma iki biçimden biri olmalı:\n"
        "  vaka:<sınav vakası adı>\n"
        "  dosya:<yol>#<çapa metni>\n"
        "Serbest metin kabul edilmiyor: doğrulanamayan koruma, koruma değil.")


# Bir dersin hangi tür hataya karşı olduğu. Tür, dersin nerede işe
# yarayacağını söyler — "ölçüm" dersi bir canon işinde gereksizdir.
TURLER = ("olcum", "belge", "canon", "surec", "araç", "dil")


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
                # Bozuk satırı sessizce atlamak, defteri sessizce
                # küçültür. Say ve göster.
                kayitlar.append({"_bozuk": no})
    return kayitlar


def yaz_kayit(kayit):
    with open(DEFTER, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")


def guncelle_kayit(kayit):
    """Var olan bir dersin satırını YERİNDE değiştirir.

    İlk hâlinde `koru` da ekliyordu ve defterde aynı ders iki kez
    duruyordu. İki zarar ölçüldü: (1) ham okuyan yerler dersi iki kez
    saydı — `durum` 16 derken `oku` 22 bastı, (2) `dogrula.py`'nin ders
    silme denetimi kör kaldı, çünkü son satırı silmek yalnızca bir
    yinelemeyi siliyordu ve sayı düşmüyordu. Değişikliğin izi zaten
    git'te; defterde bir derse bir satır düşer.
    """
    kayitlar = [k for k in oku() if "_bozuk" not in k]
    satirlar = [kayit if k.get("no") == kayit["no"] else k for k in kayitlar]
    with open(DEFTER, "w", encoding="utf-8") as f:
        for k in satirlar:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")


def son_kayitlar():
    """Defterin geçerli hâli — bozuk satırlar ayıklanmış, numaraya göre.

    Aynı numara iki kez geçerse sonuncusu geçerli sayılır: eski
    defterlerde `koru` üzerine yazmak yerine satır eklerdi. Bu ayrımı
    her okuyucunun ayrı ayrı hatırlamasına bırakmak, bazılarının
    unutması demekti. Tek yerden türet.
    """
    son = {}
    for k in oku():
        if "_bozuk" in k:
            continue
        son[k.get("no")] = k
    return [son[no] for no in sorted(son, key=lambda x: (x is None, x))]


def bozuk_satirlar():
    return [k for k in oku() if "_bozuk" in k]


def _koruma_kaydet(a_koruma):
    """Korumayı doğrular; hata varsa ekrana yazıp None döner."""
    try:
        tur, hedef, ozet = koruma_coz(a_koruma)
    except KorumaHatasi as e:
        print("KORUMA REDDEDİLDİ")
        print(f"  {e}")
        print()
        print("Doğrulanamayan koruma, koruma değildir: 'korunuyor' diyen")
        print("bir ders aslında korunmuyor olabilir.")
        return None
    print(f"  koruma doğrulandı ({tur}) → {hedef}  [özet {ozet}]")
    return {"koruma": a_koruma, "koruma_tur": tur,
            "koruma_hedef": hedef, "koruma_ozet": ozet}


def k_yaz(a):
    """Yeni ders kaydet."""
    kayitlar = son_kayitlar()

    # Aynı dersi iki kez yazmak defteri şişirir ve okunmaz hâle getirir.
    # Okunmayan defter, olmayan defterdir.
    for k in kayitlar:
        if k.get("ders", "").strip().lower() == a.ders.strip().lower():
            print(f"Bu ders zaten var [{k['no']}]: {k['ders']}")
            print("Aynısını tekrar yazmak defteri okunmaz hâle getirir.")
            return 1

    ek = {}
    if a.koruma:
        ek = _koruma_kaydet(a.koruma)
        if ek is None:
            return 1

    no = max([k.get("no", 0) for k in kayitlar], default=0) + 1
    kayit = {
        "no": no,
        "tur": a.tur,
        "ders": a.ders,
        "baglam": a.baglam,
        "koruma": "",
        "tarih": datetime.date.today().isoformat(),
    }
    kayit.update(ek)
    yaz_kayit(kayit)
    print(f"Ders [{no}] kaydedildi ({a.tur}).")
    if not a.koruma:
        print()
        print("KORUMASIZ — bu dersi mekanik olarak engelleyen bir şey yok.")
        print("Mümkünse bir test ya da denetim yaz, sonra:")
        print(f"  python3 .claude/ders.py koru --no {no} --koruma \"vaka:<ad>\"")
    return 0


def k_oku(a):
    """Dersleri göster — oturum başında okunacak olan bu."""
    kayitlar = son_kayitlar()
    bozuk = bozuk_satirlar()
    if not kayitlar:
        print("Ders defteri boş.")
        return 0

    if a.tur:
        kayitlar = [k for k in kayitlar if k.get("tur") == a.tur]
        if not kayitlar:
            print(f"'{a.tur}' türünde ders yok.")
            return 0

    print(f"DERS DEFTERİ — {len(kayitlar)} ders\n")
    for tur in TURLER:
        grup = [k for k in kayitlar if k.get("tur") == tur]
        if not grup:
            continue
        print(f"[{tur}]")
        for k in grup:
            isaret = "·" if k.get("koruma") else "!"
            print(f"  {isaret} {k['ders']}")
            if a.uzun:
                print(f"      nerede: {k.get('baglam', '')}")
                if k.get("koruma"):
                    print(f"      koruma: {k['koruma']}")
        print()

    korumasiz = [k for k in kayitlar if not k.get("koruma")]
    if korumasiz:
        print(f"! işaretli {len(korumasiz)} ders korumasız — "
              "yalnızca okunarak hatırlanıyor.")
    if bozuk:
        print(f"UYARI: {len(bozuk)} bozuk satır var.")
    return 0


def k_koru(a):
    """Bir derse mekanik koruma bağla.

    MAKBUZ TEKİLLİĞİ: aynı ders farklı bir korumayla yeniden yazılamaz.
    Beyin v3'ten alınan kural — aynı kimlik farklı içerikle iki kez
    kaydedilirse hangisinin doğru olduğu bilinemez. Değiştirmek bir
    karardır, `--degistir` ile açıkça söylenir.
    """
    son = {k["no"]: k for k in son_kayitlar()}
    hedef = son.get(a.no)
    if hedef is None:
        print(f"[{a.no}] numaralı ders yok.")
        return 1

    eski = hedef.get("koruma", "")
    if eski and eski != a.koruma and not a.degistir:
        print(f"ÇAKIŞMA — [{a.no}] zaten başka bir korumaya bağlı:")
        print(f"  mevcut: {eski}")
        print(f"  yeni  : {a.koruma}")
        print()
        print("Aynı kayıt farklı içerikle iki kez yazılırsa hangisinin")
        print("doğru olduğu bilinemez. Değiştirmek bir karardır:")
        print(f"  python3 .claude/ders.py koru --no {a.no} --koruma \"...\" --degistir")
        return 1
    if eski == a.koruma:
        print(f"[{a.no}] zaten bu korumaya bağlı — değişiklik yok.")
        return 0

    ek = _koruma_kaydet(a.koruma)
    if ek is None:
        return 1
    kayit = {"no": a.no, "tur": hedef["tur"], "ders": hedef["ders"],
             "baglam": hedef.get("baglam", ""),
             "tarih": datetime.date.today().isoformat()}
    kayit.update(ek)
    guncelle_kayit(kayit)
    print(f"[{a.no}] artık korunuyor → {a.koruma}")
    return 0


def k_bayat(a):
    """Koruması kaymış dersler — Beyin v3'ün source_sha256 fikri.

    Bir koruma adını koruyup İÇERİĞİNİ değiştirebilir: vaka aynı adla
    durur ama iddiası boşaltılmış olur. Kızıl takım testinde tam bu
    yapıldı ve hiçbir kapı görmedi. Özet bunu görünür kılıyor.
    """
    son = {k["no"]: k for k in son_kayitlar()}
    kirik, kaymis = [], []
    for no, k in sorted(son.items()):
        if not k.get("koruma"):
            continue
        try:
            _, hedef, ozet = koruma_coz(k["koruma"])
        except KorumaHatasi as e:
            kirik.append((no, k["koruma"], str(e)))
            continue
        if k.get("koruma_ozet") and k["koruma_ozet"] != ozet:
            kaymis.append((no, hedef, k["koruma_ozet"], ozet))

    if not kirik and not kaymis:
        print("Bütün korumalar yerinde ve içerikleri değişmemiş.")
        return 0
    if kirik:
        print(f"KIRIK KORUMA ({len(kirik)}) — gösterdiği şey artık yok:\n")
        for no, kor, hata in kirik:
            print(f"  [{no}] {kor}")
            print(f"       {hata}")
        print()
    if kaymis:
        print(f"KAYMIŞ KORUMA ({len(kaymis)}) — adı duruyor, içeriği değişti:\n")
        for no, hedef, eski, yeni in kaymis:
            print(f"  [{no}] {hedef}")
            print(f"       özet {eski} → {yeni}")
        print()
        print("Bu ders hâlâ korunuyor mu? Vakayı oku. Hâlâ koruyorsa:")
        print("  python3 .claude/ders.py tazele --no <n>")
    return 1


def k_tazele(a):
    """Koruma içeriği bilerek değiştiyse özeti güncelle."""
    son = {k["no"]: k for k in son_kayitlar()}
    hedef = son.get(a.no)
    if hedef is None or not hedef.get("koruma"):
        print(f"[{a.no}] numaralı korumalı ders yok.")
        return 1
    ek = _koruma_kaydet(hedef["koruma"])
    if ek is None:
        return 1
    kayit = {"no": a.no, "tur": hedef["tur"], "ders": hedef["ders"],
             "baglam": hedef.get("baglam", ""),
             "tarih": datetime.date.today().isoformat()}
    kayit.update(ek)
    guncelle_kayit(kayit)
    print(f"[{a.no}] özeti tazelendi.")
    return 0


def k_korumasiz(a):
    """Mekanik koruması olmayan dersler."""
    acik = [k for k in son_kayitlar() if not k.get("koruma")]
    if not acik:
        print("Bütün derslerin mekanik koruması var.")
        return 0
    print(f"{len(acik)} korumasız ders — sadece okunarak hatırlanıyor:\n")
    for k in acik:
        print(f"  [{k['no']}] ({k['tur']}) {k['ders']}")
    print()
    print("Bunlar unutulmayı bekliyor. Mümkün olanı teste çevir:")
    print("  python3 .claude/ders.py koru --no <n> --koruma \"<test adı>\"")
    return 1


def k_ara(a):
    """Konuya göre ders ara — yeni bir işe girerken."""
    kayitlar = son_kayitlar()
    terim = a.terim.lower()
    bulunan = [k for k in kayitlar
               if terim in k.get("ders", "").lower()
               or terim in k.get("baglam", "").lower()
               or terim in k.get("tur", "").lower()]
    if not bulunan:
        print(f"'{a.terim}' için ders yok.")
        print("Bu, konunun temiz olduğu anlamına gelmez — sadece")
        print("daha önce buradan bir ders çıkarılmadığı anlamına gelir.")
        return 0
    print(f"'{a.terim}' için {len(bulunan)} ders:\n")
    for k in bulunan:
        print(f"  [{k['no']}] ({k['tur']}) {k['ders']}")
        print(f"       nerede: {k.get('baglam', '')}")
        if k.get("koruma"):
            print(f"       koruma: {k['koruma']}")
    return 0


def k_durum(a):
    """Defterin özeti."""
    son = son_kayitlar()
    bozuk = bozuk_satirlar()
    korumali = [k for k in son if k.get("koruma")]
    print("DERS DEFTERİ")
    print(f"  ders        : {len(son)}")
    print(f"  korumalı    : {len(korumali)}")
    print(f"  korumasız   : {len(son) - len(korumali)}")
    for tur in TURLER:
        n = len([k for k in son if k.get("tur") == tur])
        if n:
            print(f"    {tur:<8} {n}")
    if bozuk:
        print(f"  BOZUK SATIR : {len(bozuk)}")
        return 1
    return 0


def k_ozetle(a):
    """Koşu defterinden ders adayları ayıkla — bellek pekiştirme.

    Boşluk şuydu: `ders.py` kalıcı depo, ama ayıklama tamamen elle.
    İş biterken kimse "bundan ne öğrendik" diye sormuyorsa, ders yalnızca
    birinin aklına gelirse yazılıyor.

    Bu komut `seyir.jsonl`'i okur ve aday çıkarır. **Otomatik yazmaz** —
    yazsaydı defter ders değil gürültü biriktirirdi; bir koşu kaydı ile
    genel bir kural aynı şey değildir. Aday sunar, cümleyi insan/ajan
    kurar.

    Aday seçimi kasten dar: `cozulmemis` ve gerekçeli `karar` kayıtları.
    `olculdu` kayıtları ölçümdür, ders değil — bir kere doğru olan şey
    her zaman doğru olmayabilir.
    """
    seyir = os.path.join(KLASOR, "seyir.jsonl")
    if not os.path.exists(seyir):
        print("Koşu defteri (seyir.jsonl) yok — ayıklanacak bir şey yok.")
        print("Bu normal: seyir koşuya özel, oturum bitince silinir.")
        print("Ders çıkarmak için İŞ BİTMEDEN bu komutu çalıştır.")
        return 0

    kayitlar = []
    with open(seyir, encoding="utf-8") as f:
        for satir in f:
            satir = satir.strip()
            if not satir:
                continue
            try:
                kayitlar.append(json.loads(satir))
            except ValueError:
                continue

    adaylar = [k for k in kayitlar
               if k.get("tur") == "cozulmemis"
               or (k.get("tur") == "karar" and k.get("neden"))]
    if not adaylar:
        print("Ders adayı yok.")
        print("Aday olanlar: çözülmemiş kayıtlar ve gerekçeli kararlar.")
        return 0

    # Zaten deftere girmiş olanı tekrar önermek, listeyi okunmaz yapar.
    mevcut = " ".join(k.get("ders", "").lower() for k in son_kayitlar())

    print(f"{len(adaylar)} ders adayı — bunlar KAYIT, henüz ders değil.\n")
    yeni = 0
    for k in adaylar:
        ne = k.get("ne", "")
        # Kaba bir benzerlik: adayın belirgin kelimeleri defterde geçiyorsa
        # muhtemelen zaten yazılmış. Kesin değil, o yüzden gizlemiyoruz —
        # işaretliyoruz.
        anahtar = [w for w in re.findall(r"[\wçğıöşü]{5,}", ne.lower())][:4]
        var_gibi = anahtar and all(w in mevcut for w in anahtar)
        isaret = "~" if var_gibi else "+"
        if not var_gibi:
            yeni += 1
        print(f"  {isaret} [{k.get('tur')}] {ne[:150]}")
        if k.get("neden"):
            print(f"      neden: {k['neden'][:130]}")

    print()
    print(f"+ {yeni} aday muhtemelen yeni, ~ işaretliler defterde var gibi.")
    print()
    print("Bir kayıt ders DEĞİLDİR. Ders, bir koşuya değil gelecekteki")
    print("koşulara ait olan genel kuraldır. Adayı okuyup kuralı sen kur:")
    print('  python3 .claude/ders.py yaz --tur <tür> --ders "<kural>" \\')
    print('      --baglam "<nerede öğrenildi>" --koruma "<engelleyen test>"')
    return 0


def main(argv=None):
    a = argparse.ArgumentParser(
        description="Echo Orkestra ders defteri — oturumlar arası hafıza.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("yaz", help="yeni ders kaydet")
    p.add_argument("--ders", required=True, help="tek cümle, genel kural")
    p.add_argument("--tur", required=True, choices=TURLER)
    p.add_argument("--baglam", required=True, help="nerede öğrenildi")
    p.add_argument("--koruma", default="",
                   help="vaka:<sınav vakası> ya da dosya:<yol>#<çapa>")
    p.set_defaults(fn=k_yaz)

    p = alt.add_parser("oku", help="dersleri göster (oturum başında)")
    p.add_argument("--tur", choices=TURLER)
    p.add_argument("--uzun", action="store_true", help="bağlam ve korumayı da yaz")
    p.set_defaults(fn=k_oku)

    p = alt.add_parser("ara", help="konuya göre ders ara")
    p.add_argument("terim")
    p.set_defaults(fn=k_ara)

    p = alt.add_parser("koru", help="derse mekanik koruma bağla")
    p.add_argument("--no", type=int, required=True)
    p.add_argument("--koruma", required=True,
                   help="vaka:<sınav vakası> ya da dosya:<yol>#<çapa>")
    p.add_argument("--degistir", action="store_true",
                   help="mevcut korumayı DEĞİŞTİR (bilinçli karar)")
    p.set_defaults(fn=k_koru)

    p = alt.add_parser("bayat", help="kırık ya da içeriği kaymış korumalar")
    p.set_defaults(fn=k_bayat)

    p = alt.add_parser("tazele", help="koruma bilerek değiştiyse özeti güncelle")
    p.add_argument("--no", type=int, required=True)
    p.set_defaults(fn=k_tazele)

    p = alt.add_parser("korumasiz", help="mekanik koruması olmayan dersler")
    p.set_defaults(fn=k_korumasiz)

    p = alt.add_parser("ozetle", help="koşu defterinden ders adayı ayıkla")
    p.set_defaults(fn=k_ozetle)

    p = alt.add_parser("durum", help="defterin özeti")
    p.set_defaults(fn=k_durum)

    n = a.parse_args(argv)
    return n.fn(n)


if __name__ == "__main__":
    sys.exit(main())
