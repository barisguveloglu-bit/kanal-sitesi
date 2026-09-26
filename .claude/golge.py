#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Gölge modu (yeni kapıların deneme süresi)
===============================================================
"Bu kapı daha kimseyi durdurmadan önce, durdurursa DOĞRU mu durdururdu?"

## Boşluk neydi

Yeni bir kapı eklendiği an bağlayıcı oluyordu. Bu depoda bir günde eklenen
üç araç ilk gerçek kullanımda kendi kusurunu gösterdi:

  · `iz.py`       tekrarı kaydetmeyi reddetti — varlık sebebini
  · `ablasyon.py` önce özyinelemeye girdi, sonra çıkış kodu 0 ile ölen
                  bir sınavı "sıfır vaka düştü" diye okuyup iki halkayı
                  yanlışlıkla KANITSIZ ilan etti
  · `bekci.py`    kendini listeden çıkaran dalı göremedi

Üçü de o an kapı olsaydı ya yanlış yere kırmızı yakacak ya da yanlış
yere yeşil geçirecekti. İkincisi daha kötü — yanlış kırmızı fark edilir,
yanlış yeşil edilmez.

## Fikir

Beyin V3'ün `jev shadow` → `jev on` sırası. Yeni kapı önce **gölgede**
koşar: kararını hesaplar ve kaydeder, ama kimseyi durdurmaz. Yeterince
koştuğu ve bir kez bile "koşmadı" olmadığı görülünce **kapıya terfi**
edebilir.

## Terfi insan kararı

`terfi` komutu kanıtı denetler, ama durumu değiştiren şey `golge.json` —
ve o dosya `bekci.py`'nin ölçüm listesinde. Yani terfi bir ÖLÇÜM-DEĞİŞTİ
beyanı ister ve merge kararı insanındır. Gölgeden kapıya geçmek bir
kapıyı SERTLEŞTİRMEK, kapıdan gölgeye inmek YUMUŞATMAK; ikisi de ölçen
aleti değiştirir.

Bir kapı gölgeye hiç girmeden kapı olarak eklenemez: `ekle` her zaman
gölge olarak ekler. Deneme süresi atlanabilir olsaydı, atlanırdı.

## "Koşmadı" ayrı bir hâl

Bugünkü 23. dersten: çıkış kodu 0, aracın işini yaptığı anlamına gelmez.
Her kapının bir **özet deseni** olabilir; kod 0 dönüp özeti basmayan kapı
"temiz" değil **koşmadı** sayılır. Tek bir "koşmadı" terfiyi engeller.

    python3 .claude/golge.py kos              (CI bunu koşar — kaydetmez)
    python3 .claude/golge.py kos --kaydet     (kanıt biriktirir)
    python3 .claude/golge.py durum
    python3 .claude/golge.py ekle --ad X --komut "python3 .claude/x.py" --ozet "\\d+ vaka"
    python3 .claude/golge.py terfi --ad X
    python3 .claude/golge.py indir --ad X

Çıkış kodu (`kos`): 0 hiçbir KAPI düşmedi · 1 bir kapı düştü ya da
koşmadı · 3 bir kapı insan kararı istiyor. Gölgeler çıkış kodunu
etkilemez — gölgenin tanımı bu.
"""

import argparse
import datetime
import json
import os
import re
import shlex
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
KAYIT = os.path.join(KLASOR, "golge.json")

# Terfi için gereken en az koşu. Beş seçildi çünkü bu depodaki üç kusurun
# üçü de İLK gerçek koşuda göründü; beş, "ilk koşuda patlayan"ı elemek
# için yeter, bir haftalık iş ritminde de birikir. Ölçülerek seçilmedi —
# seçilemezdi, henüz terfi etmiş bir kapı yok.
ESIK = 5

GOLGE, KAPI = "gölge", "kapı"


def oku():
    if not os.path.exists(KAYIT):
        return {"kapilar": {}}
    with open(KAYIT, encoding="utf-8") as f:
        return json.load(f)


def yaz(d):
    with open(KAYIT, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def bos_sayac():
    return {"kosu": 0, "temiz": 0, "engellerdi": 0, "insan": 0, "kosmadi": 0}


def kos_bir(kapi):
    """Bir kapıyı koştur, kararı sınıflandır."""
    komut = list(kapi["komut"])
    if komut and komut[0] in ("python3", "python"):
        komut[0] = sys.executable
    try:
        s = subprocess.run(komut, cwd=KOK, capture_output=True, text=True,
                           timeout=900)
    except (OSError, subprocess.SubprocessError) as e:
        return "kosmadi", f"{type(e).__name__}"

    if s.returncode not in (0, 1, 3):
        return "kosmadi", f"çıkış {s.returncode}"
    desen = kapi.get("ozet")
    if desen and not re.search(desen, s.stdout or ""):
        # Kod geçerli ama özet yok: araç yarıda ölmüş olabilir. Ablasyon
        # tam olarak bunu "sıfır vaka düştü" diye okumuştu.
        return "kosmadi", f"çıkış {s.returncode} ama özet yok"
    return ({0: "temiz", 1: "engellerdi", 3: "insan"}[s.returncode],
            (s.stdout or "").strip().splitlines()[-1:][0]
            if (s.stdout or "").strip() else "")


def k_kos(a):
    d = oku()
    kapilar = d.get("kapilar", {})
    if not kapilar:
        print("Kayıtlı kapı yok.")
        return 0

    kod = 0
    for ad, k in sorted(kapilar.items()):
        karar, ayrinti = kos_bir(k)
        durum = k.get("durum", GOLGE)

        if durum == GOLGE:
            etiket = {"temiz": "gölge · temiz",
                      "engellerdi": "gölge · ENGELLERDİ",
                      "insan": "gölge · insana çıkardı",
                      "kosmadi": "gölge · KOŞMADI"}[karar]
        else:
            etiket = {"temiz": "KAPI  · temiz",
                      "engellerdi": "KAPI  · DÜŞTÜ",
                      "insan": "KAPI  · insan kapısı",
                      "kosmadi": "KAPI  · KOŞMADI"}[karar]
            if karar in ("engellerdi", "kosmadi"):
                kod = 1
            elif karar == "insan" and kod == 0:
                kod = 3

        print(f"  {etiket:<24} {ad}" + (f" — {ayrinti[:90]}" if ayrinti else ""))

        if a.kaydet:
            sayac = k.setdefault("kayit", bos_sayac())
            sayac["kosu"] += 1
            sayac[karar] += 1

    if a.kaydet:
        yaz(d)
        print("\nKararlar kaydedildi.")
    print()
    print("Gölgeler çıkış kodunu etkilemez: kararlarını hesaplar, kimseyi "
          "durdurmaz.")
    return kod


def k_durum(a):
    d = oku()
    kapilar = d.get("kapilar", {})
    if not kapilar:
        print("Kayıtlı kapı yok.")
        return 0
    print(f"{'kapı':<16} {'durum':<7} {'koşu':>5} {'temiz':>6} {'engel':>6} "
          f"{'insan':>6} {'koşmadı':>8}   terfi")
    for ad, k in sorted(kapilar.items()):
        s = k.get("kayit", bos_sayac())
        if k.get("durum") == KAPI:
            hazir = f"kapı ({k.get('terfi', '?')})"
        elif s["kosmadi"]:
            hazir = "ENGELLİ — koşmadığı görüldü"
        elif s["kosu"] < ESIK:
            hazir = f"{ESIK - s['kosu']} koşu daha"
        else:
            hazir = "hazır — karar insanın"
        print(f"{ad:<16} {k.get('durum', GOLGE):<7} {s['kosu']:>5} {s['temiz']:>6} "
              f"{s['engellerdi']:>6} {s['insan']:>6} {s['kosmadi']:>8}   {hazir}")
    return 0


def k_ekle(a):
    d = oku()
    kapilar = d.setdefault("kapilar", {})
    if a.ad in kapilar:
        print(f"'{a.ad}' zaten kayıtlı ({kapilar[a.ad].get('durum')}).")
        return 1
    if a.ozet:
        try:
            re.compile(a.ozet)
        except re.error as e:
            print(f"özet deseni geçersiz: {e}")
            return 1
    kapilar[a.ad] = {
        "komut": shlex.split(a.komut),
        "ozet": a.ozet or None,
        # Her zaman gölge. Deneme süresi atlanabilir olsaydı, atlanırdı.
        "durum": GOLGE,
        "eklendi": datetime.date.today().isoformat(),
        "kayit": bos_sayac(),
    }
    yaz(d)
    print(f"'{a.ad}' GÖLGE olarak eklendi. Kapı olması için en az {ESIK} "
          "kayıtlı koşu ve sıfır 'koşmadı' gerekiyor.")
    if not a.ozet:
        print("UYARI: özet deseni yok — kod 0 dönüp işini yapmayan bir araç "
              "'temiz' sayılır. Mümkünse --ozet ver.")
    return 0


def k_terfi(a):
    d = oku()
    k = d.get("kapilar", {}).get(a.ad)
    if k is None:
        print(f"'{a.ad}' diye bir kapı yok.")
        return 1
    if k.get("durum") == KAPI:
        print(f"'{a.ad}' zaten kapı.")
        return 0
    s = k.get("kayit", bos_sayac())
    if s["kosmadi"]:
        print(f"TERFİ REDDEDİLDİ — '{a.ad}' {s['kosmadi']} kez KOŞMADI.")
        print("Koşmadığı görülmüş bir kapıyı bağlayıcı yapmak, çalışmayan bir")
        print("denetimi geçen denetim gibi göstermektir.")
        return 1
    if s["kosu"] < ESIK:
        print(f"TERFİ REDDEDİLDİ — '{a.ad}' {s['kosu']} kez koştu, en az {ESIK} gerekiyor.")
        print("Bu depodaki üç araç ilk gerçek koşuda kendi kusurunu gösterdi.")
        return 1

    k["durum"] = KAPI
    k["terfi"] = datetime.date.today().isoformat()
    yaz(d)
    print(f"'{a.ad}' KAPI oldu. Kanıt: {s['kosu']} koşu, {s['engellerdi']} "
          f"'engellerdi', {s['insan']} insan kapısı, 0 'koşmadı'.")
    print()
    print("Bu bir ölçüm değişikliği: `golge.json` bekçinin listesinde.")
    print("Commit mesajına ÖLÇÜM-DEĞİŞTİ satırı yaz; merge kararı Barış'ın.")
    print("'Engellerdi' kararları doğru muydu — onu makine bilemez, bak.")
    return 0


def k_indir(a):
    d = oku()
    k = d.get("kapilar", {}).get(a.ad)
    if k is None:
        print(f"'{a.ad}' diye bir kapı yok.")
        return 1
    if k.get("durum") == GOLGE:
        print(f"'{a.ad}' zaten gölge.")
        return 0
    k["durum"] = GOLGE
    k["indirildi"] = datetime.date.today().isoformat()
    # Sayaç sıfırlanır: gölgeye inen kapı yeniden deneme süresine girer.
    k["kayit"] = bos_sayac()
    yaz(d)
    print(f"'{a.ad}' GÖLGEYE indi, sayacı sıfırlandı.")
    print("Bu bir kapıyı YUMUŞATMAK — ÖLÇÜM-DEĞİŞTİ beyanı gerekir.")
    return 0


def main(argv=None):
    a = argparse.ArgumentParser(description="Gölge modu — yeni kapıların deneme süresi.")
    alt = a.add_subparsers(dest="komut", required=True)

    k = alt.add_parser("kos", help="kayıtlı kapıları koştur")
    k.add_argument("--kaydet", action="store_true",
                   help="kararları sayaca yaz (CI yazmaz — depo temiz kalmalı)")
    k.set_defaults(islev=k_kos)

    alt.add_parser("durum", help="kapıların kanıtı").set_defaults(islev=k_durum)

    e = alt.add_parser("ekle", help="yeni kapıyı GÖLGE olarak ekle")
    e.add_argument("--ad", required=True)
    e.add_argument("--komut", required=True)
    e.add_argument("--ozet", help="koştuğunun kanıtı olan çıktı deseni")
    e.set_defaults(islev=k_ekle)

    t = alt.add_parser("terfi", help="gölgeyi kapıya terfi ettir")
    t.add_argument("--ad", required=True)
    t.set_defaults(islev=k_terfi)

    i = alt.add_parser("indir", help="kapıyı gölgeye indir")
    i.add_argument("--ad", required=True)
    i.set_defaults(islev=k_indir)

    ayr = a.parse_args(argv)
    return ayr.islev(ayr)


if __name__ == "__main__":
    sys.exit(main())
