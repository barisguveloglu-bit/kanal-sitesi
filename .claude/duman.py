#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Oturum başı duman testi
===============================================================
"Bu oturuma temiz bir zeminde mi başlıyorum?"

## Boşluk neydi

CI kapısı işin SONUNDA çalışıyor, kanca dosya düzenlendiğinde çalışıyor.
İkisi de **bu oturumda yapılanı** denetliyor.

Ama iki oturum arasında depoya dışarıdan bir şey girebiliyor: telefondan
GitHub web arayüzünde yapılan elle düzenleme, başka bir oturumun yarım
bıraktığı iş, merge sonrası kalan bir tutarsızlık. Bunların hiçbiri bu
oturumun kancasını tetiklemiyor ve ilk işin zeminine denetlenmeden
giriyor. Kırmızı bir zeminde yapılan yeşil iş, yeşil değildir.

## Neden ayrı bir araç

`arac-sinavi.py` 40 saniye sürüyor — oturum açılışında kabul edilemez.
Duman testi **hızlı olanları** koşuyor: kural denetimi, bütünlük, ve iki
defterin çürümemişliği. Tamamlık değil, uyarı amacı var.

Cowork'ün bu fikir için yazdığı risk aynen geçerli ve burada yazılı
duruyor: **"Test seti incelirse her şey hep yeşil görünür."** Bu yüzden
duman testi yeni denetim icat etmiyor, var olan kapıları çağırıyor —
kapılar güçlendikçe duman da güçleniyor, ayrı bakım istemiyor.

## Oturumu engellemez

`kanca-ders.py` ile aynı disiplin: açılışı engelleyen bir uyarı, uyarı
değil engeldir. Kırmızıysa söyler, işi durdurmaz — durdurma kararı
okuyanın.

    python3 .claude/duman.py
    python3 .claude/duman.py --sessiz     (yalnız çıkış kodu)

Çıkış kodu: 0 temiz · 1 en az bir kapı kırmızı · 2 bir kapı KOŞMADI

## Sahipsiz worktree

Ders defterinde "git worktree sızdırır" dersi yıllarca korumasız durdu:
yalnızca okunarak hatırlanıyordu. Dışarıda 23 worktree biriktiği
gözlendi. Oturum açılışında ana kopya dışındaki her worktree bir önceki
oturumdan kalmıştır — sayılır ve söylenir. **Silinmez**: içinde merge
edilmemiş iş olabilir, silme kararı okuyanın. Kapı değil uyarı; çıkış
kodunu değiştirmez.
"""

import argparse
import os
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

# (ad, betik, argümanlar, kabul edilen çıkış kodları)
#
# `sinav.py` ve `arac-sinavi.py` burada YOK: yavaşlar. Onlar CI'nin işi.
# Duman testinin işi hız; kapsamı CI'den küçük olması bir eksiklik değil
# tasarım — ama bunu yazmak zorundayım, yoksa bir sonraki okuyan onu
# tam kapsam sanar.
#
# Kapılar `kapi.py` üzerinden koşuyor, doğrudan değil. İlk hâli yalnız
# çıkış koduna bakıyordu ve ölçüldü: hiçbir iş yapmadan 0 ile ölen bir
# bütünlük sınavına "temiz" dedi. 23. ders ablasyona uygulanmış, buraya
# uygulanmamıştı. Özet deseni kapi.py'de, TEK yerde.
KAPILAR = (
    ("kural denetimi", "dogrula"),
    ("canon ↔ veri ↔ site", "butunluk"),
    ("ders korumaları", "ders-bayat"),
    ("iz karşılıkları", "iz-coken"),
)


def kos(ad):
    """(kod, çıktı) — kod 2 koşmadı demek. kapi.py yoksa koşmadı sayılır."""
    import importlib.util
    yol = os.path.join(KLASOR, "kapi.py")
    if not os.path.exists(yol):
        return 2, "kapi.py yok"
    try:
        t = importlib.util.spec_from_file_location("_kapi_duman", yol)
        kapi = importlib.util.module_from_spec(t)
        t.loader.exec_module(kapi)
        return kapi.kos(ad)
    except Exception as e:
        return 2, f"{type(e).__name__}: {e}"


def sahipsiz_worktreeler():
    """Ana kopya dışındaki worktree'ler: [(yol, not)]. Git yoksa boş."""
    try:
        s = subprocess.run(["git", "worktree", "list", "--porcelain"],
                           cwd=KOK, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return []
    if s.returncode != 0:
        return []
    bloklar = [b for b in s.stdout.strip().split("\n\n") if b.strip()]
    sonuc = []
    for blok in bloklar[1:]:          # ilki ana kopya
        yol, notlar = "", []
        for satir in blok.splitlines():
            if satir.startswith("worktree "):
                yol = satir[len("worktree "):]
            elif satir.startswith("branch "):
                notlar.append(satir[len("branch refs/heads/"):])
            elif satir.startswith("prunable"):
                notlar.append("dizini yok — prune edilebilir")
            elif satir == "detached":
                notlar.append("ayrık HEAD")
        sonuc.append((yol, ", ".join(notlar)))
    return sonuc


def worktree_uyarisi():
    yetim = sahipsiz_worktreeler()
    if not yetim:
        return []
    satir = [f"UYARI — {len(yetim)} sahipsiz worktree (önceki oturumdan kalmış):"]
    for yol, notlar in yetim[:10]:
        satir.append(f"  · {yol}" + (f"  ({notlar})" if notlar else ""))
    if len(yetim) > 10:
        satir.append(f"  · … ve {len(yetim) - 10} tane daha")
    satir.append("Yetim kayıt bütün git işlemlerini yavaşlatır. İçinde merge "
                 "edilmemiş iş yoksa:")
    satir.append("  git worktree remove --force <yol>   ·   git worktree prune")
    return satir


def main(argv=None):
    a = argparse.ArgumentParser(description="Oturum başı hızlı sağlık testi.")
    a.add_argument("--sessiz", action="store_true")
    ayr = a.parse_args(argv)

    kirmizi, kosmayan, satir = [], [], []
    for ad, kapi_adi in KAPILAR:
        kod, cikti = kos(kapi_adi)
        if kod == 2:
            son = (cikti or "").strip().splitlines()
            kosmayan.append((ad, son[-1][:100] if son else "bilinmiyor"))
            satir.append(f"  KOŞMADI  {ad}")
        elif kod == 0:
            satir.append(f"  temiz    {ad}")
        else:
            ilk = (cikti or "").strip().splitlines()
            kirmizi.append((ad, ilk[0] if ilk else f"çıkış {kod}"))
            satir.append(f"  KIRMIZI  {ad}")

    if ayr.sessiz:
        return 2 if kosmayan else (1 if kirmizi else 0)

    uyari = worktree_uyarisi()
    if not kirmizi and not kosmayan:
        print("Duman testi temiz — zemin sağlam, işe başlanabilir.")
        print("(Kapsam CI'den dar: fay enjeksiyonu ve araç sınavı burada koşmaz.)")
        if uyari:
            print()
            print("\n".join(uyari))
        return 0

    print("DUMAN TESTİ — oturum açılışında zemin denetimi\n")
    print("\n".join(satir))
    print()
    if uyari:
        print("\n".join(uyari))
        print()

    if kosmayan:
        print("Bir kapı KOŞMADI. Çalışmayan denetim, geçen denetim gibi")
        print("görünür — bu en tehlikeli hâl:")
        for ad, hata in kosmayan:
            print(f"  · {ad}: {hata}")
        print()
        return 2

    print("Zemin kırmızı. Bu oturumda yapılacak yeşil iş, kırmızı bir")
    print("zeminin üstüne konacak. Önce şunlara bak:")
    for ad, ilk in kirmizi:
        print(f"  · {ad}: {ilk[:110]}")
    print()
    print("Sebebi bu oturum olmayabilir: iki oturum arası dışarıdan gelen")
    print("bir düzenleme de olabilir. Oturum engellenmiyor, kararı sen ver.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
