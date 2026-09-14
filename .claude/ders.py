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
import json
import os
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
DEFTER = os.path.join(KLASOR, "dersler.jsonl")

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


def k_yaz(a):
    """Yeni ders kaydet."""
    kayitlar = [k for k in oku() if "_bozuk" not in k]

    # Aynı dersi iki kez yazmak defteri şişirir ve okunmaz hâle getirir.
    # Okunmayan defter, olmayan defterdir.
    for k in kayitlar:
        if k.get("ders", "").strip().lower() == a.ders.strip().lower():
            print(f"Bu ders zaten var [{k['no']}]: {k['ders']}")
            print("Aynısını tekrar yazmak defteri okunmaz hâle getirir.")
            return 1

    no = max([k.get("no", 0) for k in kayitlar], default=0) + 1
    kayit = {
        "no": no,
        "tur": a.tur,
        "ders": a.ders,
        "baglam": a.baglam,
        "koruma": a.koruma or "",
        "tarih": datetime.date.today().isoformat(),
    }
    yaz_kayit(kayit)
    print(f"Ders [{no}] kaydedildi ({a.tur}).")
    if not a.koruma:
        print()
        print("KORUMASIZ — bu dersi mekanik olarak engelleyen bir şey yok.")
        print("Mümkünse bir test ya da denetim yaz, sonra:")
        print(f"  python3 .claude/ders.py koru --no {no} --koruma \"<ad>\"")
    return 0


def k_oku(a):
    """Dersleri göster — oturum başında okunacak olan bu."""
    kayitlar = [k for k in oku() if "_bozuk" not in k]
    bozuk = [k for k in oku() if "_bozuk" in k]
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
    """Bir derse mekanik koruma bağla."""
    kayitlar = [k for k in oku() if "_bozuk" not in k]
    hedef = next((k for k in kayitlar if k.get("no") == a.no), None)
    if hedef is None:
        print(f"[{a.no}] numaralı ders yok.")
        return 1
    yaz_kayit({"no": a.no, "tur": hedef["tur"], "ders": hedef["ders"],
               "baglam": hedef.get("baglam", ""), "koruma": a.koruma,
               "tarih": datetime.date.today().isoformat()})
    print(f"[{a.no}] artık korunuyor → {a.koruma}")
    return 0


def k_korumasiz(a):
    """Mekanik koruması olmayan dersler."""
    kayitlar = [k for k in oku() if "_bozuk" not in k]
    # Aynı numaranın son kaydı geçerli (koru üzerine yazar).
    son = {}
    for k in kayitlar:
        son[k.get("no")] = k
    acik = [k for k in son.values() if not k.get("koruma")]
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
    kayitlar = [k for k in oku() if "_bozuk" not in k]
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
    kayitlar = [k for k in oku() if "_bozuk" not in k]
    bozuk = [k for k in oku() if "_bozuk" in k]
    son = {}
    for k in kayitlar:
        son[k.get("no")] = k
    korumali = [k for k in son.values() if k.get("koruma")]
    print("DERS DEFTERİ")
    print(f"  ders        : {len(son)}")
    print(f"  korumalı    : {len(korumali)}")
    print(f"  korumasız   : {len(son) - len(korumali)}")
    for tur in TURLER:
        n = len([k for k in son.values() if k.get("tur") == tur])
        if n:
            print(f"    {tur:<8} {n}")
    if bozuk:
        print(f"  BOZUK SATIR : {len(bozuk)}")
        return 1
    return 0


def main(argv=None):
    a = argparse.ArgumentParser(
        description="Echo Orkestra ders defteri — oturumlar arası hafıza.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("yaz", help="yeni ders kaydet")
    p.add_argument("--ders", required=True, help="tek cümle, genel kural")
    p.add_argument("--tur", required=True, choices=TURLER)
    p.add_argument("--baglam", required=True, help="nerede öğrenildi")
    p.add_argument("--koruma", default="", help="engelleyen test/denetim")
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
    p.add_argument("--koruma", required=True)
    p.set_defaults(fn=k_koru)

    p = alt.add_parser("korumasiz", help="mekanik koruması olmayan dersler")
    p.set_defaults(fn=k_korumasiz)

    p = alt.add_parser("durum", help="defterin özeti")
    p.set_defaults(fn=k_durum)

    n = a.parse_args(argv)
    return n.fn(n)


if __name__ == "__main__":
    sys.exit(main())
