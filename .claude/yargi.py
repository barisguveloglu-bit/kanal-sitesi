#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Cevap yargılama (LLM-as-judge'ın oynanamayan yarısı)
===============================================================
`degerlendir.py` ARAMAYI ölçer: doğru parça geldi mi?
Bu betik CEVABI ölçer: doğru parça geldiğinde doğru cevap verildi mi?

Aradaki fark küçük değil. Doğru bölümü getirip yine de yanlış okumak,
fazla iddia etmek ya da olmayan bir şeyi "var" diye söylemek mümkün —
ve bunu şu ana kadar hiçbir şey yakalamıyordu.

## Neden yarısı mekanik

Bir modelin kendi cevabını beğenmesi, bu sistemin en baştan kaçtığı tuzak.
"LLM yargılasın" demek tek başına bunu çözmez; yargıç da aynı modeldir.

Bu yüzden yargı ikiye bölündü:

  MEKANİK (bu betik)   Oynanamaz. Ölçtüğü şeyler ikili ve tartışmasız:
                       · Atıf gerçekten cevabın geçtiği satırı gösteriyor mu
                       · Altın gerçek cevapta geçiyor mu
                       · Canon'un sustuğu soruda reddedildi mi
                       · Reddedilmesi gereken yerde UYDURMA yapıldı mı

  NİTEL (LLM, komut)   Mekaniğin göremediği: cevap soruyu gerçekten
                       karşılıyor mu, fazla iddia var mı, spoiler kaçmış mı.

Mekanik kısım geçmeden nitel kısma bakılmaz. Sıra önemli: güzel yazılmış
ama uydurma bir cevap, kötü yazılmış doğru cevaptan beterdir.

## Kullanım

    python3 .claude/yargi.py hazirla > /tmp/sorular.json
    #   ...cevaplar üretilir (tercihen ayrı bir ajanda, altın gerçekleri
    #      görmeden), /tmp/cevaplar.json olarak yazılır...
    python3 .claude/yargi.py puanla --dosya /tmp/cevaplar.json
    python3 .claude/yargi.py gecmis

Cevap dosyası biçimi:

    [{"no": 1, "cevap": "...", "atiflar": ["LORE.md:201"], "reddetti": false}]

Çıkış kodu: 0 tam puan, 1 en az bir mekanik hata.
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
ALTIN = os.path.join(KLASOR, "altin-sorular.json")
GECMIS = os.path.join(KLASOR, "yargi-gecmisi.jsonl")


def altin_oku():
    with open(ALTIN, encoding="utf-8") as f:
        return json.load(f)


def vakalari_diz(altin):
    """Cevaplanabilir ve cevapsız soruları tek sıraya dizer.

    Karışık sırada verilir ki cevaplayan taraf "bu blok cevapsızdır" diye
    bir kalıba oturamasın. Sıra sabittir — ölçüm koşular arası karşılaştırılabilsin.
    """
    vakalar = []
    for v in altin["sorular"]:
        vakalar.append({"tur": "cevaplanabilir", "soru": v["soru"],
                        "satir": v["satir"], "gercekler": v["gercekler"]})
    for v in altin["cevapsiz"]:
        vakalar.append({"tur": "cevapsiz", "soru": v["soru"],
                        "olmamali": v["olmamali"]})
    vakalar.sort(key=lambda v: v["soru"])
    for i, v in enumerate(vakalar, 1):
        v["no"] = i
    return vakalar


def hazirla(a):
    """Cevaplanacak soruları yazar — altın gerçekleri SIZDIRMADAN."""
    vakalar = vakalari_diz(altin_oku())
    disari = [{"no": v["no"], "soru": v["soru"]} for v in vakalar]
    print(json.dumps(disari, ensure_ascii=False, indent=2))
    return 0


def atif_araliklari(atiflar):
    """['LORE.md:201', 'LORE.md:192-212'] → [(201,201), (192,212)]"""
    araliklar = []
    for atif in atiflar or []:
        e = re.match(r"LORE\.md:(\d+)(?:-(\d+))?$", str(atif).strip())
        if e:
            bas = int(e.group(1))
            son = int(e.group(2)) if e.group(2) else bas
            araliklar.append((bas, son))
    return araliklar


def puanla(a):
    altin = altin_oku()
    vakalar = {v["no"]: v for v in vakalari_diz(altin)}

    with open(a.dosya, encoding="utf-8") as f:
        cevaplar = json.load(f)

    lore_satir_sayisi = len(open(os.path.join(KOK, "LORE.md"),
                                encoding="utf-8").read().split("\n"))

    # Puanlama, GÖNDERİLEN cevaplar üzerinden değil ALTIN SETİN TAMAMI
    # üzerinden yapılır. Aksi hâlde ölçüm ihmalle kandırılabilir: zor
    # soruları — özellikle uydurmanın ölçüldüğü cevapsız olanları — hiç
    # göndermeyip üç kolay cevapla 3/3 almak mümkündü. Cevaplamamak,
    # yanlış cevaplamaktan iyi değildir.
    gelen = {}
    yinelenen = set()
    for cevap in cevaplar:
        no = cevap.get("no")
        if no in gelen:
            yinelenen.add(no)
        gelen[no] = cevap

    fazlalik = sorted(n for n in gelen if n not in vakalar)

    sonuclar = []
    for no in sorted(vakalar):
        vaka = vakalar[no]
        cevap = gelen.get(no)
        if cevap is None:
            sonuclar.append({"no": no, "soru": vaka["soru"], "tur": vaka["tur"],
                             "gecti": False, "kusur": ["cevap gönderilmedi"]})
            continue
        if no in yinelenen:
            sonuclar.append({"no": no, "soru": vaka["soru"], "tur": vaka["tur"],
                             "gecti": False, "kusur": ["aynı numara birden çok kez gönderildi"]})
            continue

        kusur = []
        metin = cevap.get("cevap", "") or ""
        reddetti = bool(cevap.get("reddetti"))
        araliklar = atif_araliklari(cevap.get("atiflar"))

        # Atıflar dosya sınırları içinde mi — uydurma satır numarası da uydurmadır.
        for bas, son in araliklar:
            if bas < 1 or son > lore_satir_sayisi or bas > son:
                kusur.append(f"geçersiz atıf aralığı LORE.md:{bas}-{son}")

        if vaka["tur"] == "cevaplanabilir":
            if reddetti:
                kusur.append("cevabı canon'da olan soruyu reddetti")
            eksik = [g for g in vaka["gercekler"] if g.lower() not in metin.lower()]
            if eksik:
                kusur.append(f"cevapta geçmeyen gerçek: {', '.join(eksik)}")
            if not araliklar:
                kusur.append("atıf yok — canon iddiası adressiz")
            elif not any(b <= vaka["satir"] <= s for b, s in araliklar):
                kusur.append(f"atıf cevabın geçtiği satırı göstermiyor "
                             f"(beklenen LORE.md:{vaka['satir']})")
        else:
            # Asıl sınav burada: canon susuyorken model konuşuyor mu?
            uyduran = [o for o in vaka["olmamali"] if o.lower() in metin.lower()]
            if uyduran:
                kusur.append(f"UYDURMA: canon'da olmayan şeyi söyledi "
                             f"({', '.join(uyduran)})")
            if not reddetti:
                kusur.append("canon'un sustuğu soruda reddetmedi")

        sonuclar.append({"no": no, "soru": vaka["soru"], "tur": vaka["tur"],
                         "gecti": not kusur, "kusur": kusur})

    gecen = sum(1 for s in sonuclar if s["gecti"])
    toplam = len(vakalar) or 1
    eksik = sum(1 for s in sonuclar if "cevap gönderilmedi" in s["kusur"])
    uydurma = sum(1 for s in sonuclar
                  if any(k.startswith("UYDURMA") for k in s["kusur"]))

    for s in sonuclar:
        if s["gecti"]:
            continue
        print(f"  BAŞARISIZ [{s.get('tur','?')}] {s.get('soru','?')}")
        for k in s["kusur"]:
            print(f"      · {k}")

    if fazlalik:
        print(f"  UYARI: altın sette olmayan numaralar gönderildi: {fazlalik}")

    print(f"\nmekanik geçen     {gecen}/{toplam}  ({gecen/toplam:.0%})")
    print(f"cevaplanmamış     {eksik}   (her biri başarısız sayıldı)")
    print(f"uydurma vakası    {uydurma}   (0 olmalı — pazarlık yok)")

    kayit = {
        "tarih": datetime.now().isoformat(timespec="seconds"),
        "toplam": toplam, "gecen": gecen, "uydurma": uydurma, "eksik": eksik,
        "not": a.not_ or "",
    }
    with open(GECMIS, "a", encoding="utf-8") as f:
        f.write(json.dumps(kayit, ensure_ascii=False) + "\n")

    if uydurma:
        print("\nUYDURMA VAR. Nitel değerlendirmeye geçme — önce bu.")
        return 1
    if gecen < toplam:
        print("\nMekanik kusurlar var. Nitel yargıya geçmeden bunları düzelt.")
        return 1
    print("\nMekanik yargı temiz. Nitel değerlendirmeye geçilebilir.")
    return 0


def gecmis(a):
    if not os.path.exists(GECMIS):
        print("Henüz yargı koşusu yok.")
        return 0
    kayitlar = [json.loads(s) for s in open(GECMIS, encoding="utf-8") if s.strip()]
    print(f"{'tarih':20} {'geçen':>10} {'uydurma':>9}  not")
    for k in kayitlar[-a.son:]:
        oran = f"{k['gecen']}/{k['toplam']}"
        print(f"{k['tarih'][:19]:20} {oran:>10} {k['uydurma']:>9}  {k.get('not','')}")

    if len(kayitlar) >= 2:
        onceki, simdi = kayitlar[-2], kayitlar[-1]
        fark = (simdi["gecen"] / (simdi["toplam"] or 1)
                - onceki["gecen"] / (onceki["toplam"] or 1))
        if fark < 0:
            print(f"\nGERİLEME: son koşu öncekinden {abs(fark):.0%} düşük.")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Cevapları altın sete karşı yargıla.")
    alt = a.add_subparsers(dest="komut", required=True)

    h = alt.add_parser("hazirla", help="cevaplanacak soruları yaz (gerçekleri sızdırmadan)")
    h.set_defaults(islev=hazirla)

    p = alt.add_parser("puanla", help="cevap dosyasını mekanik olarak puanla")
    p.add_argument("--dosya", required=True)
    p.add_argument("--not", dest="not_", default="", help="koşuya kısa not")
    p.set_defaults(islev=puanla)

    g = alt.add_parser("gecmis", help="koşu geçmişi ve gerileme")
    g.add_argument("--son", type=int, default=10)
    g.set_defaults(islev=gecmis)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
