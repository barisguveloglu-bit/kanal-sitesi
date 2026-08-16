#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Geri bildirim döngüsü
===============================================================
Bir çıktının doğruluğunu değerlendirip sonucu sisteme geri veren halka.

Burada dürüst olmak gerekiyor: model ağırlıklarını eğitemeyiz. Elimizde
GPU yok, veri yok, backend yok — ve zaten olmasına da gerek yok. Bir
ajan sisteminde geri bildirim döngüsünün gerçek karşılığı şudur:

    **Her gerçek hata, kalıcı bir teste dönüşür.**

Aynı hatayı iki kez yapmak imkânsız hâle gelir. Model öğrenmez, SİSTEM
öğrenir — ve sistemin hafızası git'te durduğu için yeni bir sohbet
açtığında da orada olur. Unutmayan taraf burasıdır.

Halka:

    çıktı → yargı (yanlıştı) → kayıt → altın sete vaka → ölçüm → düzeltme
      ↑                                                              │
      └──────────────────────────────────────────────────────────────┘

Kullanım:

    python3 .claude/geri-bildirim.py ekle \\
        --tur geri-getirme \\
        --soru "Teşup'un zaafı ne" \\
        --yanlis "Ordu derebeyi Taşmişu'yu gösterdi" \\
        --dogru "Kapalı ve dar alanda gücü kırılır" \\
        --kaynak LORE.md:201

    python3 .claude/geri-bildirim.py listele          # açık kayıtlar
    python3 .claude/geri-bildirim.py isle             # vakaya çevir
"""

import argparse
import json
import os
import re
import sys
from datetime import date

KLASOR = os.path.dirname(os.path.abspath(__file__))
DEFTER = os.path.join(KLASOR, "geri-bildirim.jsonl")
ALTIN = os.path.join(KLASOR, "altin-sorular.json")

TURLER = {
    "geri-getirme": "Arama yanlış yeri getirdi → altın sete vaka olur (otomatik).",
    "canon": "Cevap canon'a aykırıydı → LORE.md/data.js düzeltmesi gerek (insan).",
    "kural": "Kural ihlali denetimden kaçtı → dogrula.py'ye denetim gerek (insan).",
    "davranis": "Döngü yanlış davrandı → komut dosyası düzeltmesi gerek (insan).",
}


def defteri_oku():
    if not os.path.exists(DEFTER):
        return []
    kayitlar = []
    with open(DEFTER, encoding="utf-8") as f:
        for satir in f:
            satir = satir.strip()
            if satir:
                kayitlar.append(json.loads(satir))
    return kayitlar


def defteri_yaz(kayitlar):
    with open(DEFTER, "w", encoding="utf-8") as f:
        for k in kayitlar:
            f.write(json.dumps(k, ensure_ascii=False) + "\n")


def ekle(a):
    if a.tur not in TURLER:
        print(f"Bilinmeyen tür: {a.tur}\nGeçerli: {', '.join(TURLER)}")
        return 2

    kayit = {
        "tarih": date.today().isoformat(),
        "tur": a.tur,
        "soru": a.soru or "",
        "yanlis": a.yanlis,
        "dogru": a.dogru,
        "kaynak": a.kaynak or "",
        "durum": "acik",
    }
    with open(DEFTER, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")

    print(f"Kaydedildi ({a.tur}).")
    print(TURLER[a.tur])
    if a.tur == "geri-getirme":
        print("Vakaya çevirmek için: python3 .claude/geri-bildirim.py isle")
    return 0



def bilinen_vakalar():
    """Sınavlardaki bütün vaka adları — bir kaydın işaret edebileceği testler."""
    import importlib.util
    adlar = set()
    for dosya, indis in (("arac-sinavi.py", 0), ("butunluk.py", 1), ("sinav.py", 0)):
        yol = os.path.join(KLASOR, dosya)
        if not os.path.exists(yol):
            continue
        try:
            t = importlib.util.spec_from_file_location("_gb_" + dosya, yol)
            m = importlib.util.module_from_spec(t)
            t.loader.exec_module(m)
        except Exception:
            continue
        for kayit in getattr(m, "VAKALAR", []):
            adlar.add(kayit[indis])
    return adlar


def kapat(a):
    """Bir kaydı kapat — ama koruyan testi ADIYLA söylemeden değil.

    Bu komutun sebebi somut bir boşluk: `geri-getirme` dışındaki türler
    "(insan)" diyordu ve sonra hiçbir şey insanın gerçekten test yazdığını
    doğrulamıyordu. Kayıt kapanıyor, hata düzeliyor, koruma yazılmıyor ve
    aynı hata bir sonraki değişiklikte sessizce geri geliyor.

    Nitekim geldi: altın set kayma denetimi eklendi, elle negatif test
    edildi, vakası yazılmadı — ve bunu ancak mutasyon sınavı buldu.
    """
    kayitlar = defteri_oku()
    if not (1 <= a.no <= len(kayitlar)):
        print(f"Böyle bir kayıt yok: {a.no} (defterde {len(kayitlar)} kayıt)")
        return 2
    kayit = kayitlar[a.no - 1]

    vakalar = bilinen_vakalar()
    if a.vaka not in vakalar:
        yakin = [v for v in vakalar if a.vaka.lower() in v.lower()]
        print(f"REDDEDİLDİ — '{a.vaka}' diye bir sınav vakası yok.\n")
        if yakin:
            print("Bunlar mı: " + ", ".join(repr(v) for v in yakin[:5]))
        else:
            print("Kaydı kapatmadan önce bu hatayı yakalayan vakayı yaz.\n"
                  "Testsiz kapatılan hata, düzeltilmiş değil ertelenmiş hatadır: "
                  "bir sonraki değişiklikte sessizce geri gelir.")
        return 1

    kayit["durum"] = "kapali"
    kayit["vaka"] = a.vaka
    kayit["kapanis"] = date.today().isoformat()
    if a.cozum:
        kayit["cozum"] = a.cozum
    defteri_yaz(kayitlar)
    print(f"Kapatıldı — '{kayit['soru'] or kayit['yanlis'][:50]}'")
    print(f"  koruyan vaka: {a.vaka}")
    return 0


def korumasiz(a):
    """Testi olmadan kapatılmış kayıtlar — halkanın kapanmadığı yerler."""
    kayitlar = defteri_oku()
    vakalar = bilinen_vakalar()
    sorunlu = []
    for i, k in enumerate(kayitlar, 1):
        if k.get("durum") not in ("kapali", "islendi"):
            continue
        if k["tur"] == "geri-getirme":
            continue          # altın sete girdi, koruması orada
        v = k.get("vaka")
        if not v:
            sorunlu.append((i, k, "koruyan vaka belirtilmemiş"))
        elif v not in vakalar:
            sorunlu.append((i, k, f"belirtilen vaka artık yok: {v}"))

    if not sorunlu:
        print("Kapatılan her kaydın koruyan bir vakası var.")
        return 0
    print(f"{len(sorunlu)} kayıt korumasız kapatılmış:\n")
    for i, k, sebep in sorunlu:
        print(f"  [{i}] {k['tur']} — {k['soru'] or k['yanlis'][:60]}")
        print(f"      {sebep}")
    print("\nTestsiz kapatılan hata, düzeltilmiş değil ertelenmiş hatadır.")
    return 1


def listele(a):
    kayitlar = defteri_oku()
    acik = [k for k in kayitlar if k["durum"] == "acik"]
    if not kayitlar:
        print("Defter boş. Henüz kayıtlı bir hata yok.")
        return 0

    for k in kayitlar if a.hepsi else acik:
        isaret = "•" if k["durum"] == "acik" else "✓"
        print(f"{isaret} [{k['tarih']}] {k['tur']}"
              + (f" — {k['soru']}" if k["soru"] else ""))
        print(f"    yanlış: {k['yanlis']}")
        print(f"    doğru : {k['dogru']}" + (f"  ({k['kaynak']})" if k["kaynak"] else ""))

    print(f"\n{len(acik)} açık / {len(kayitlar)} toplam kayıt.")
    return 0


def isle(a):
    """Açık geri-getirme kayıtlarını altın sete kalıcı vaka olarak ekler."""
    kayitlar = defteri_oku()
    with open(ALTIN, encoding="utf-8") as f:
        altin = json.load(f)

    mevcut = {v["soru"] for v in altin["sorular"]}
    eklenen, elde = 0, []
    defter_degisti = False

    for k in kayitlar:
        if k["durum"] != "acik":
            continue

        if k["tur"] != "geri-getirme":
            elde.append((k, TURLER[k["tur"]]))
            continue

        eslesme = re.match(r"LORE\.md:(\d+)", k.get("kaynak", ""))
        if not k["soru"]:
            elde.append((k, "Soru metni yok — hangi sorunun vakası olacağı belirsiz."))
            continue
        if not eslesme:
            elde.append((k, "Kaynak yok ya da biçimi hatalı; `LORE.md:<satır>` olmalı. "
                            "Doğru satırı `ara.py` ile bul, kaydı yeniden ekle."))
            continue

        if k["soru"] in mevcut:
            # Vaka zaten altın sette. Kaydı kapatmak da bir değişikliktir —
            # yazılmazsa bu kayıt sonsuza kadar "açık" görünüp listeyi kirletir.
            k["durum"] = "islendi"
            defter_degisti = True
            continue

        altin["sorular"].append({
            "soru": k["soru"],
            "satir": int(eslesme.group(1)),
            "gercekler": [k["dogru"]],
            "_kaynak": f"geri bildirim {k['tarih']}",
        })
        k["durum"] = "islendi"
        defter_degisti = True
        eklenen += 1

    if eklenen:
        with open(ALTIN, "w", encoding="utf-8") as f:
            json.dump(altin, f, ensure_ascii=False, indent=2)
            f.write("\n")
    if defter_degisti:
        defteri_yaz(kayitlar)

    print(f"{eklenen} kayıt altın sete vaka olarak eklendi.")
    if eklenen:
        print("Şimdi ölç: python3 .claude/degerlendir.py")
        print("Yeni vaka DÜŞÜK çıkarsa doğru — henüz düzeltilmedi. "
              "Düzelt, tekrar ölç, yeşile döndür.")

    if elde:
        print(f"\n{len(elde)} kayıt otomatiğe çevrilemedi, insan işi:")
        for k, sebep in elde:
            print(f"  • [{k['tur']}] {k['yanlis'][:70]}")
            print(f"    → {sebep}")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Hataları kalıcı teste çevir.")
    alt = a.add_subparsers(dest="komut", required=True)

    e = alt.add_parser("ekle", help="yeni bir hata kaydet")
    e.add_argument("--tur", required=True, choices=list(TURLER))
    e.add_argument("--soru", default="")
    e.add_argument("--yanlis", required=True, help="sistem ne üretti")
    e.add_argument("--dogru", required=True, help="ne üretmeliydi")
    e.add_argument("--kaynak", default="", help="örn. LORE.md:201")
    e.set_defaults(islev=ekle)

    l = alt.add_parser("listele", help="kayıtları göster")
    l.add_argument("--hepsi", action="store_true", help="işlenmişleri de göster")
    l.set_defaults(islev=listele)

    i = alt.add_parser("isle", help="açık kayıtları vakaya çevir")
    i.set_defaults(islev=isle)

    k = alt.add_parser("kapat", help="kaydı kapat — koruyan testi adıyla ver")
    k.add_argument("--no", type=int, required=True, help="listele'deki sıra")
    k.add_argument("--vaka", required=True, help="bu hatayı yakalayan sınav vakası")
    k.add_argument("--cozum", default="", help="ne yapıldı")
    k.set_defaults(islev=kapat)

    ko = alt.add_parser("korumasiz", help="testsiz kapatılmış kayıtlar")
    ko.set_defaults(islev=korumasiz)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
