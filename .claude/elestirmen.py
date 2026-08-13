#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Eleştirmen-Üretici döngüsü
===============================================================
Bir ajan üretir, **ikinci bir ajan** çıktıyı kurallara göre eleştirir,
hata bulunursa üreticiye döner, onaylanırsa süreç biter.

## Bu döngünün asıl açığı

Eleştirmen deseninin tek gerçek tehlikesi şu: **"iyi görünüyor" diyen bir
eleştirmen, eleştirmen olmayan bir eleştirmendir.** Ve bu, hiç eleştirmen
olmamasından daha kötüdür — çünkü artık ortada "denetlendi" damgası vardır.

Bu depoda `eniyile.py` zaten puanlı bir değerlendirici. Fark şu: orada
değerlendiren bir betik, burada değerlendiren bir **ajan** — yani prozayı,
tutarlılığı, tonu, canon'a sadakati okuyabilen bir taraf. Betik "menü
eksik" der, ajan "bu cümle canon'da olmayan bir sıralama kuruyor" der.

Ajan okuyabildiği için kandırabilir de. O yüzden burada eleştirmen serbest
bırakılmıyor: **raporu mekanik olarak denetleniyor.**

## Lastik damga nasıl yakalanıyor

Mekanik denetleyiciler zaten kaç kusur bulduğunu biliyor. Eleştirmen
"kusur yok" derken `dogrula.py` ve `butunluk.py` kusur buluyorsa,
eleştirmen okumamış demektir. Bu ikili karşılaştırma tamamen mekanik ve
pazarlığa kapalı.

Buna ek üç kural:

- Her bulgu **adreslenebilir** olmalı (`dosya:satır`). "Genel olarak zayıf"
  bir bulgu değildir, izlenimdir.
- Canon iddiası içeren her bulgu `LORE.md:<satır>` ile dayanaklanmalı ve o
  satır gerçekten var olmalı.
- "Kusur yok" kararı **açıkça** yazılmalı. Sessiz onay yoktur; sessizlik
  "okudum ve temiz buldum" ile "okumadım" arasında ayrım bırakmaz.

    python3 .claude/elestirmen.py brief --hedef assets/js/data.js
    python3 .claude/elestirmen.py denetle --rapor elestiri.md
"""

import argparse
import os
import re
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

ONAY_KALIBI = re.compile(r"^\s*KUSUR YOK\s*$", re.M | re.I)
BULGU_KALIBI = re.compile(r"^\s*[-*]\s*(?P<yer>[\w./-]+:\d+(?:-\d+)?)\s*[—:-]\s*"
                          r"(?P<ne>.+)$", re.M)
ATIF_KALIBI = re.compile(r"LORE\.md:(\d+)")


def _kos(betik, *arg):
    return subprocess.run([sys.executable, os.path.join(KLASOR, betik), *arg],
                          cwd=KOK, capture_output=True, text=True, timeout=180)


def mekanik_kusurlar():
    """Betiklerin gördüğü kusurlar — eleştirmenin en azından bulması gerekenler."""
    kusurlar = []
    s = _kos("dogrula.py", "--kisa")
    if s.returncode == 1:
        kusurlar += [x.strip() for x in s.stdout.splitlines() if x.strip().startswith("[")]
    s = _kos("butunluk.py", "--sessiz")
    if s.returncode == 1:
        kusurlar += [x.strip()[6:].strip() for x in s.stdout.splitlines()
                     if x.strip().startswith("BULGU")]
    return kusurlar


def brief(a):
    hedef = a.hedef
    yol = os.path.join(KOK, hedef)
    if not os.path.exists(yol):
        print(f"Hedef bulunamadı: {hedef}", file=sys.stderr)
        return 1

    print(f"""# ELEŞTİRMEN GÖREVİ — {hedef}

YETKİ: okuma. Hiçbir dosyayı DEĞİŞTİRME. İşin bulmak, düzeltmek değil.

## Ne yapacaksın

`{hedef}` dosyasını oku ve **kusur ara.** Beğenilecek yanını arama —
üretici zaten kendi işini beğeniyor, senin işin onun göremediğini görmek.

## Neye karşı okuyacaksın

1. `LORE.md` — canon. Sitedeki her iddia buraya dayanmalı. Canon'da
   olmayan bir şey sitede kesin dille duruyorsa bu bir kusurdur.
2. `CLAUDE.md` "Denetim sonrası eklenen kurallar" — oradakiler bilinçli
   karar, "düzeltilecek eksik" değil. Onları kusur sayma.
3. `LORE.md:344` — sitede sıralı güç tablosu YOK. Canon'da karşılığı
   olmayan sıralama iddiası kusurdur.

## Rapor biçimi — zorunlu

Her bulgu tek satır, şu biçimde:

    - dosya.js:207 — ne yanlış, neden yanlış (LORE.md:221)

Kurallar:

- **Adres zorunlu.** "Genel olarak zayıf" bulgu değil izlenimdir.
- **Canon iddiası varsa dayanak zorunlu.** `LORE.md:<satır>` yaz; o satır
  gerçekten var olmalı ve söylediğin şeyi söylemeli.
- Hiç kusur bulamadıysan tek başına şu satırı yaz:

    KUSUR YOK

  Sessiz kalma. Sessizlik "okudum, temiz" ile "okumadım" arasında ayrım
  bırakmaz ve raporun mekanik denetimden geçemez.

## Bilmen gereken

Raporun denetleniyor. Mekanik denetleyiciler bu depoda kaç kusur olduğunu
zaten biliyor. "KUSUR YOK" dediğin hâlde onlar kusur buluyorsa raporun
**lastik damga** sayılır ve reddedilir. Uydurmak da işe yaramaz: verdiğin
her satır numarası kontrol ediliyor.
""")
    return 0


def denetle(a):
    if not os.path.exists(a.rapor):
        print(f"Rapor bulunamadı: {a.rapor}", file=sys.stderr)
        return 1
    with open(a.rapor, encoding="utf-8") as f:
        rapor = f.read()

    kusurlar = []
    bulgular = BULGU_KALIBI.findall(rapor)
    onay = bool(ONAY_KALIBI.search(rapor))

    if not bulgular and not onay:
        kusurlar.append("rapor ne bulgu ne 'KUSUR YOK' içeriyor — sessiz onay yok")

    if onay and bulgular:
        kusurlar.append("hem 'KUSUR YOK' hem bulgu var — karar belirsiz")

    # LASTİK DAMGA: mekanik denetleyiciler kusur görürken eleştirmen görmemiş.
    mekanik = mekanik_kusurlar()
    if onay and mekanik:
        kusurlar.append(
            f"LASTİK DAMGA — eleştirmen 'KUSUR YOK' dedi ama mekanik denetim "
            f"{len(mekanik)} kusur buluyor. İlki: {mekanik[0][:90]}")

    # Atıflar gerçek mi
    lore = os.path.join(KOK, "LORE.md")
    satir_sayisi = len(open(lore, encoding="utf-8").read().splitlines()) \
        if os.path.exists(lore) else 0
    for yer, ne in bulgular:
        dosya = yer.split(":")[0]
        if not os.path.exists(os.path.join(KOK, dosya)):
            kusurlar.append(f"var olmayan dosyaya bulgu: {yer}")
        for no in ATIF_KALIBI.findall(ne):
            if not (1 <= int(no) <= satir_sayisi):
                kusurlar.append(f"geçersiz canon atfı: LORE.md:{no} ({yer})")

    print(f"ELEŞTİRİ DENETİMİ — {a.rapor}")
    print(f"  bulgu           {len(bulgular)}")
    print(f"  açık onay       {'evet' if onay else 'hayır'}")
    print(f"  mekanik kusur   {len(mekanik)}\n")

    if kusurlar:
        for k in kusurlar:
            print(f"  RED: {k}")
        print("\nBu eleştiri kabul edilmiyor. Eleştirmene geri gönder.")
        return 1

    if onay:
        print("KABUL — eleştirmen açıkça temiz dedi ve mekanik denetim de temiz.")
    else:
        print(f"KABUL — {len(bulgular)} bulgu adreslenebilir ve atıfları geçerli.")
        print("Bulgular üreticiye geri gidiyor; düzeltilince tekrar eleştir.")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Eleştirmen-üretici döngüsü.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("brief", help="eleştirmen ajana verilecek görev metni")
    p.add_argument("--hedef", required=True, help="eleştirilecek dosya")
    p.set_defaults(islev=brief)

    p = alt.add_parser("denetle", help="eleştiri raporunu denetle")
    p.add_argument("--rapor", required=True)
    p.set_defaults(islev=denetle)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
