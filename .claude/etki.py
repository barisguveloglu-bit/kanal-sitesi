#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Canon etki haritası
===============================================================
"LORE.md'de bu bölüm değişti; başka neye bakmam lazım?"

## Boşluk neydi

`butunluk.py` canon ile verinin ŞU AN tutarlı olup olmadığını ölçüyor —
isim, plaka, tablo. Bir değişikliğin NEYE DOKUNDUĞUNU söyleyen bir şey
yoktu: bir karakterin gücü değişince ona atıf yapan diğer bölümler,
`data.js` alanları ve sayfalar elle hatırlanmak zorundaydı. Bütünlük
sınavı anlam bağlantısını göremez; bu araç da göremez — ama nereye
BAKILACAĞINI söyler.

## Nasıl

Değişen satırların bölümü bulunur (en yakın başlık). Bölümün **varlık
adları** çıkarılır: başlığın kendisi ve bölümdeki **kalın** ifadeler.
Her ad, değişen bölüm dışında LORE.md'de, `assets/js/data.js`'te ve
HTML sayfalarında aranır; bulunan her yer adresiyle listelenir.

Eşleşme metinseldir: ad başka bir anlamda geçerse fazladan satır çıkar,
takma adla anılırsa eksik kalır. Liste kontrol listesidir, kanıt değil.
Hiçbir dosyayı değiştirmez; `--kaydet` bulguları iş defterine
`acik` kayıt olarak yazar ki kontrol edilmeden unutulmasın.

    python3 .claude/etki.py --taban HEAD            (çalışma ağacındaki değişiklik)
    python3 .claude/etki.py --taban origin/ana --kaydet
    python3 .claude/etki.py --bolum "Sarı Gülücük"

Çıkış kodu: 0 değişiklik ya da etki yok · 3 kontrol edilecek yer var
(insan kapısı: anlamca etkilenip etkilenmediğine insan karar verir)
· 2 koşmadı
"""

import argparse
import os
import re
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)
LORE = "LORE.md"
BASLIK = re.compile(r"^(#{2,4})\s+(.*)$")
KALIN = re.compile(r"\*\*([^*\n]{3,40})\*\*")


def bolumler(satirlar):
    """[(başlangıç, bitiş, başlık)] — 1 tabanlı, bitiş dahil."""
    bas = [(i + 1, BASLIK.match(s).group(2)) for i, s in enumerate(satirlar)
           if BASLIK.match(s)]
    sonuc = []
    for j, (no, ad) in enumerate(bas):
        bitis = bas[j + 1][0] - 1 if j + 1 < len(bas) else len(satirlar)
        sonuc.append((no, bitis, ad))
    return sonuc


def ad_temizle(baslik):
    ad = re.split(r"\s+[—·-]\s+", baslik)[0]
    ad = re.sub(r"^\d+\.\s*", "", ad)
    return re.sub(r"[*`]", "", ad).strip()


def varliklar(satirlar, bolum):
    no, bitis, baslik = bolum
    adlar = {ad_temizle(baslik)}
    for s in satirlar[no - 1:bitis]:
        adlar.update(k.strip() for k in KALIN.findall(s))
    # Tek harfli, sayısal ya da genel başlıklar ("Temel Fikir") gürültü
    # üretir; en az bir büyük harfle başlayan ve 3+ harfli adlar kalır.
    # Cümle parçası ("X ile ilgileniyor.") ya da etiket ("Taraf:") ad
    # değildir: noktalama ile biten ve dört kelimeyi aşan kalınlar atılır.
    return sorted(a for a in adlar if len(a) >= 3 and a[0].isupper()
                  and a[-1] not in ".:,;!?" and len(a.split()) <= 4)


def degisen_satirlar(taban):
    s = subprocess.run(["git", "diff", "-U0", taban, "--", LORE], cwd=KOK,
                       capture_output=True, text=True, timeout=60)
    if s.returncode != 0:
        return None
    satir = set()
    for m in re.finditer(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", s.stdout, re.M):
        bas, adet = int(m.group(1)), int(m.group(2) or 1)
        satir.update(range(bas, bas + max(adet, 1)))
    return satir


def ara(ad, haric):
    bulgu = []
    hedefler = [LORE, "assets/js/data.js"] + sorted(
        f for f in os.listdir(KOK) if f.endswith(".html"))
    for yol in hedefler:
        tam = os.path.join(KOK, yol)
        if not os.path.exists(tam):
            continue
        with open(tam, encoding="utf-8") as f:
            for i, s in enumerate(f, 1):
                if yol == LORE and haric[0] <= i <= haric[1]:
                    continue
                if ad in s:
                    bulgu.append(f"{yol}:{i}")
    return bulgu


def main(argv=None):
    p = argparse.ArgumentParser(description="Canon değişikliğinin etkisi.")
    p.add_argument("--taban", help="karşılaştırma tabanı (git ref)")
    p.add_argument("--bolum", help="değişiklik yerine doğrudan bir bölüm başlığı")
    p.add_argument("--kaydet", action="store_true",
                   help="bulguları iş defterine acik kayıt olarak yaz")
    a = p.parse_args(argv)

    with open(os.path.join(KOK, LORE), encoding="utf-8") as f:
        satirlar = f.read().splitlines()
    tum = bolumler(satirlar)

    if a.bolum:
        secilen = [b for b in tum if a.bolum in b[2]]
        if not secilen:
            print(f"'{a.bolum}' başlıklı bölüm yok — koşmadı.")
            return 2
    elif a.taban:
        degisen = degisen_satirlar(a.taban)
        if degisen is None:
            print(f"Fark alınamadı ({a.taban}) — koşmadı, 'etki yok' sayılmaz.")
            return 2
        secilen = [b for b in tum if any(b[0] <= n <= b[1] for n in degisen)]
        if not secilen:
            print("LORE.md'de değişiklik yok.")
            return 0
    else:
        print("--taban ya da --bolum ver.")
        return 2

    kontrol = []
    for bolum in secilen:
        print(f"DEĞİŞEN BÖLÜM — {bolum[2]} (LORE.md:{bolum[0]}-{bolum[1]})")
        for ad in varliklar(satirlar, bolum):
            yerler = ara(ad, bolum[:2])
            if yerler:
                print(f"  {ad}: {', '.join(yerler[:8])}"
                      + (f" … +{len(yerler) - 8}" if len(yerler) > 8 else ""))
                kontrol.append((bolum[2], ad, yerler))
        print()

    if not kontrol:
        print("Değişen bölümün adları başka yerde geçmiyor — etki bulunamadı.")
        return 0

    print(f"{sum(len(k[2]) for k in kontrol)} yer kontrol edilmeli. Metinsel "
          "eşleşme: anlamca etkilenip etkilenmediğine sen karar ver.")
    if a.kaydet:
        defter = os.path.join(KLASOR, "defter.py")
        for bolum, ad, yerler in kontrol:
            subprocess.run([sys.executable, defter, "ekle", "--durum", "acik",
                            "--baslik", f"Canon etkisi: '{bolum}' değişti → "
                            f"{ad} ({', '.join(yerler[:4])}) kontrol et"],
                           cwd=KOK, capture_output=True, text=True, timeout=30)
        print(f"{len(kontrol)} kayıt iş defterine yazıldı (defter.py liste).")
    return 3


if __name__ == "__main__":
    sys.exit(main())
