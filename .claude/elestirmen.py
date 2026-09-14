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
import json
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

# Döngü durumu koşuya özel — sürüme girmez, .gitignore'da.
TUR_DOSYA = os.path.join(KLASOR, "elestirmen-turu.json")


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


def _kelimeler(ne):
    sade = re.sub(r"[^\wçğıöşü]+", " ", ne.lower())
    return {k for k in sade.split() if len(k) > 3}


def _parmak_izi(yer, ne):
    """Bir bulgunun kimliği: YERİ.

    İlk hâlim tarifin ilk altı kelimesini de kimliğe katıyordu. Denedim
    ve kaçtı: aktör aynı kusuru bir sonraki turda başka kelimelerle
    yazınca parmak izi değişti, döngü "tekrar yok" dedi. Kelime seçmek
    bir TAHMİNDİ.

    Yer tek başına daha sağlam bir kimlik: aynı `dosya:satır` iki turda
    arka arkaya geliyorsa orada düzelmeyen bir şey var. Aynı yerde
    farklı bir kusur da olabilir — o yüzden kelime örtüşmesi ayrıca
    ölçülüp raporlanıyor, ama kimliği o belirlemiyor.
    """
    return yer


def _tur_oku():
    if not os.path.exists(TUR_DOSYA):
        return None
    try:
        with open(TUR_DOSYA, encoding="utf-8") as f:
            return json.load(f)
    except (ValueError, OSError):
        return None


def _tur_yaz(d):
    with open(TUR_DOSYA, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


def tur(a):
    """Eleştirmen-aktör döngüsünün sürücüsü.

    `denetle` tek bir eleştiriyi ölçer ama döngüyü görmez: "düzeltilince
    tekrar eleştir" der ve orada biter. Döngünün gerçek kusuru ise
    ancak turlar arasında görünür — **aynı bulgu tekrar geliyorsa aktör
    düzeltmiyor demektir.** Nazikçe sonsuza kadar dönen bir döngü,
    hiç dönmeyenden kötüdür: çalışıyormuş gibi görünür.

    Bu komut turları sayar, bulguları parmak iziyle izler ve
    yakınsamayı ölçer.
    """
    if a.alt == "basla":
        _tur_yaz({"konu": a.konu, "tur": 0, "gecmis": []})
        print(f"Eleştirmen-aktör döngüsü başladı: {a.konu}")
        print("Sıra: eleştir → düzelt → eleştir …")
        print("`tur elestir --rapor <dosya>` ile her turu kaydet.")
        return 0

    d = _tur_oku()
    if d is None:
        print("Açık döngü yok. Önce: elestirmen.py tur basla --konu \"<konu>\"")
        return 1

    if a.alt == "durum":
        print(f"KONU: {d['konu']}   ·   {d['tur']} tur")
        for i, t in enumerate(d["gecmis"], 1):
            print(f"  tur {i}: {t['sayi']} bulgu"
                  + (f", {t['tekrar']} tekrar" if t.get("tekrar") else ""))
        return 0

    if a.alt == "kapat":
        os.remove(TUR_DOSYA)
        print(f"Döngü kapandı: {d['konu']} ({d['tur']} tur)")
        return 0

    # alt == "elestir"
    if not os.path.exists(a.rapor):
        print(f"Rapor bulunamadı: {a.rapor}", file=sys.stderr)
        return 1
    rapor = open(a.rapor, encoding="utf-8").read()
    bulgular = BULGU_KALIBI.findall(rapor)
    onay = bool(ONAY_KALIBI.search(rapor))
    izler = [_parmak_izi(y, n) for y, n in bulgular]
    tarifler = {_parmak_izi(y, n): _kelimeler(n) for y, n in bulgular}

    onceki = set(d["gecmis"][-1]["izler"]) if d["gecmis"] else set()
    onceki_tarif = d["gecmis"][-1].get("tarifler", {}) if d["gecmis"] else {}
    tekrar = [i for i in izler if i in onceki]

    d["tur"] += 1
    d["gecmis"].append({"sayi": len(bulgular), "izler": izler,
                        "tarifler": {k: sorted(v) for k, v in tarifler.items()},
                        "tekrar": len(tekrar), "onay": onay})
    _tur_yaz(d)

    print(f"TUR {d['tur']} — {d['konu']}")
    print(f"  bulgu    {len(bulgular)}")
    if d["tur"] > 1:
        onceki_sayi = d["gecmis"][-2]["sayi"]
        yon = "azaldı" if len(bulgular) < onceki_sayi else (
            "arttı" if len(bulgular) > onceki_sayi else "değişmedi")
        print(f"  önceki   {onceki_sayi} ({yon})")
        print(f"  tekrar   {len(tekrar)}")

    if onay and not bulgular:
        print("\nYAKINSADI — eleştirmen temiz dedi. Döngü kapatılabilir.")
        return 0

    if tekrar:
        print(f"\nDURDU — {len(tekrar)} yer bir önceki turdan aynen geldi:")
        for i in tekrar[:4]:
            # Aynı yerde farklı bir kusur da olabilir. Kelime örtüşmesi
            # bunu ayırt etmeye yarıyor — kimliği belirlemiyor, sadece
            # ne kadar emin olunabileceğini söylüyor.
            eski = set(onceki_tarif.get(i, []))
            yeni = tarifler.get(i, set())
            ortak = len(eski & yeni)
            toplam = len(eski | yeni) or 1
            oran = ortak / toplam
            ek = ("aynı kusur" if oran >= 0.4
                  else "aynı yer, tarif değişmiş — başka bir kusur olabilir")
            print(f"  · {i}  ({ek}, örtüşme %{oran * 100:.0f})")
        print("\nAktör bu yerleri düzeltmiyor. Nazikçe dönen döngü,")
        print("dönmeyen döngüden kötüdür: çalışıyormuş gibi görünür.")
        print("Ya bulgu yanlış (eleştirmene sor), ya düzeltme aktörün")
        print("yetkisi dışında (insana çıkar). Tur eklemek çözmez.")
        return 3

    # Devre kesiciye sor — sonsuz tur pahalıdır.
    s = _kos("devre.py", "dene", "--halka", "elestirmen",
             "--sinir", str(a.sinir), "--not", f"tur {d['tur']}")
    if s.returncode == 1:
        print(f"\nSINIR — {a.sinir} tur doldu. Elindekiyle devam et ve")
        print("neyin çözülemediğini açıkça söyle.")
        return 1

    print("\nBulgular aktöre gidiyor. Düzeltilince tekrar `tur elestir`.")
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

    p = alt.add_parser("tur", help="eleştirmen-aktör döngüsünü sür")
    p.add_argument("alt", choices=("basla", "elestir", "durum", "kapat"))
    p.add_argument("--konu", default="")
    p.add_argument("--rapor", default="")
    p.add_argument("--sinir", type=int, default=3)
    p.set_defaults(islev=tur)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
