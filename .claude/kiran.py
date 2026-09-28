#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Kıran commit'i bul (anlamsal bisect)
===============================================================
Bir sınav vakası kırıldığında **hangi commit'in** kırdığını ikili aramayla
bulur. Aramayı yürüten şey bir yorum değil, o vakanın kararı.

## Neden

`iz.py` koşular arası hatayı kümeler: "hangi tür hata" sorusunu cevaplar.
"Hangi değişiklik" sorusunu cevaplayan halka yoktu; elle `git log` okunup
tahmin ediliyordu. Sınavlar deterministik (aynı kod iki koşuda birebir aynı
çıktı), dolayısıyla `git bisect run`'ın sözleşmesi bizimkine oturuyor:
0 iyi, 1 kötü, 125 atla.

## Nasıl

    python3 .claude/kiran.py --vaka "<vaka adı>" --iyi <ref> [--kotu HEAD]

1. Depo, çalışma ağacına dokunulmadan **ayrı bir klona** alınır
   (`git clone --shared`). Worktree değil: sınavın kopya depoları git
   komutu koşturuyor ve worktree'nin ortak git dizinini kirletiyordu —
   ölçüldü, 2026-09-27.
2. Her adımda **bugünkü** sınav dosyası eski kodun üstüne konur. Vaka eski
   commit'te hiç yazılmamış olabilir; soru "bugünkü iddia o günkü kodda
   tutuyor muydu".
3. Önce iki uç koşulur: `--iyi` geçmeli, `--kotu` düşmeli. Tutmuyorsa
   arama başlamaz — yanlış uçla yapılan ikili arama, yanlış commit'i
   kesinlikle suçlar.
4. Her adım `--tekrar` kez koşulur (varsayılan 2). Sonuçlar ayrışırsa adım
   **atlanır** (125): kararsız vaka aramayı zehirler.
5. Sınav dosyası eski kodda yüklenemiyorsa (yardımcı modül yok, şema
   farklı) adım atlanır — "koşamadı" "kötü" sayılmaz.

`sinav.py` bilerek dışarıda; gerekçe `tdd.py`'deki ile aynı: onun kararını
dışarıdaki koşucu veriyor, tek vakayı buradan taklit etmek yanlış yeşil
üretir.

## Çıkış kodu

    0  kıran commit bulundu (tek commit)
    3  insan bakmalı: uçlar tutarsız, ya da atlanan adımlar yüzünden
       arama tek commit'e inmedi (adaylar basılır)
    2  koşmadı: kullanım hatası, vaka yok, ref yok
"""

import argparse
import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

# Adımın bisect'e dönen kodları (git'in sözleşmesi).
IYI, KOTU, ATLA = 0, 1, 125

# Kıran commit bu kadar satırdan büyükse "bulundu" yine doğrudur ama az
# şey söyler; çıktıda açıkça yazılır.
IRI_COMMIT = 200

SINAVLAR = ("arac-sinavi.py", "butunluk.py")


def git(dizin, *arg, sessiz=True):
    return subprocess.run(["git", "-C", dizin, *arg], capture_output=True,
                          text=True, timeout=600)


def vakayi_bul(ad):
    """Vakanın hangi (bugünkü) sınav dosyasında olduğunu bul.

    Metin aramasıyla değil, VAKALAR listesiyle: "böyle bir vaka yok" gibi
    bir dize sınav dosyasının İÇİNDE geçiyor ve metin araması onu vaka
    sanıyordu (ilk sınavda öyle düştü).
    """
    for dosya in SINAVLAR:
        m = _yukle(os.path.join(KLASOR, dosya))
        adlar = [k[1] if dosya == "butunluk.py" else k[0] for k in m.VAKALAR]
        if ad in adlar:
            return dosya
    return None


# ------------------------------------------------------------ tek adım

def _yukle(yol):
    tanim = importlib.util.spec_from_file_location("_kiran_sinav", yol)
    m = importlib.util.module_from_spec(tanim)
    tanim.loader.exec_module(m)
    return m


def _bir_kez(m, dosya, ad):
    """None → geçti, metin → düştü."""
    if dosya == "butunluk.py":
        m.K = m.Kaynak()
        islev = next(k[2] for k in m.VAKALAR if k[1] == ad)
        return islev()
    islev = next(k[1] for k in m.VAKALAR if k[0] == ad)
    gecici, kok = m.kopya()
    try:
        return islev(kok)
    finally:
        shutil.rmtree(gecici, ignore_errors=True)


def adim(klon, dosya, ad, tekrar, sinav_kaynagi):
    """Klonun o anki commit'inde vakayı koş; git bisect koduyla dön."""
    hedef = os.path.join(klon, ".claude", dosya)
    try:
        os.makedirs(os.path.dirname(hedef), exist_ok=True)
        shutil.copyfile(sinav_kaynagi, hedef)
        try:
            m = _yukle(hedef)
        except Exception as e:
            print(f"  atla: sınav bu commit'te yüklenemedi ({type(e).__name__})")
            return ATLA
        kararlar = []
        for _ in range(tekrar):
            try:
                kusur = _bir_kez(m, dosya, ad)
            except Exception as e:
                kusur = f"vaka çöktü: {type(e).__name__}: {e}"
            kararlar.append(kusur is None)
        if len(set(kararlar)) > 1:
            print(f"  atla: kararsız ({kararlar.count(True)}/{tekrar} geçti)")
            return ATLA
        return IYI if kararlar[0] else KOTU
    finally:
        # Klonu bir sonraki checkout için temiz bırak.
        git(klon, "checkout", "-q", "--", ".")
        git(klon, "clean", "-fdq")


# ------------------------------------------------------------ arama

def klonla():
    gecici = tempfile.mkdtemp(prefix="kiran-")
    klon = os.path.join(gecici, "depo")
    s = subprocess.run(["git", "clone", "-q", "--shared", "--no-checkout", KOK, klon],
                       capture_output=True, text=True)
    if s.returncode != 0:
        raise RuntimeError(s.stderr.strip())
    return gecici, klon


def uc_kos(klon, ref, dosya, ad, tekrar, kaynak):
    git(klon, "checkout", "-q", "--detach", ref)
    return adim(klon, dosya, ad, tekrar, kaynak)


def ara(args):
    dosya = vakayi_bul(args.vaka)
    if dosya is None:
        print(f"Böyle bir vaka yok: {args.vaka!r} "
              f"({', '.join(SINAVLAR)} içinde aranıyor).", file=sys.stderr)
        return 2
    # Ref'ler burada SHA'ya çevrilir: klonun kendi HEAD'i ilk checkout'tan
    # sonra iyi ucu gösterir ve "--kotu HEAD" sessizce iyi uca dönerdi —
    # ilk koşuda tam bu oldu, iki uç da "geçti" dedi.
    for alan in ("iyi", "kotu"):
        ref = getattr(args, alan)
        s = git(KOK, "rev-parse", "--verify", "-q", ref + "^{commit}")
        if s.returncode != 0:
            print(f"Böyle bir ref yok: {ref}", file=sys.stderr)
            return 2
        setattr(args, alan, s.stdout.strip())

    gecici, klon = klonla()
    # Sınav dosyasını klona değil, bir kenara al: bisect checkout'ları
    # klondaki kopyayı ezer.
    kaynak = os.path.join(gecici, dosya)
    shutil.copyfile(os.path.join(KLASOR, dosya), kaynak)
    try:
        print(f"Vaka: {args.vaka}  ({dosya})")
        iyi = uc_kos(klon, args.iyi, dosya, args.vaka, args.tekrar, kaynak)
        kotu = uc_kos(klon, args.kotu, dosya, args.vaka, args.tekrar, kaynak)
        if iyi != IYI or kotu != KOTU:
            ad = {IYI: "geçti", KOTU: "düştü", ATLA: "koşamadı/kararsız"}
            print(f"UÇLAR TUTARSIZ — iyi uç ({args.iyi}) {ad[iyi]}, "
                  f"kötü uç ({args.kotu}) {ad[kotu]}. Arama başlamadı: "
                  "yanlış uçla ikili arama yanlış commit'i kesinlikle suçlar.")
            return 3

        git(klon, "bisect", "start", args.kotu, args.iyi)
        s = subprocess.run(
            ["git", "-C", klon, "bisect", "run", sys.executable,
             os.path.abspath(__file__), "_adim", "--klon", klon, "--dosya", dosya,
             "--vaka", args.vaka, "--tekrar", str(args.tekrar), "--kaynak", kaynak],
            capture_output=True, text=True, timeout=args.zaman)
        cikti = s.stdout + s.stderr
        return sonucu_yorumla(klon, cikti)
    finally:
        shutil.rmtree(gecici, ignore_errors=True)


def sonucu_yorumla(klon, cikti):
    satirlar = cikti.splitlines()
    ilk = [x for x in satirlar if x.endswith("is the first bad commit")]
    if ilk:
        sha = ilk[0].split()[0]
        ozet = git(klon, "show", "-s", "--format=%h %s (%an, %ad)", "--date=short", sha).stdout.strip()
        stat = git(klon, "show", "--shortstat", "--format=", sha).stdout.strip()
        print(f"KIRAN COMMIT: {ozet}")
        print(f"  {stat}")
        degisen = sum(int(p.split()[0]) for p in stat.split(",")[1:] if p.strip())
        if degisen > IRI_COMMIT:
            print(f"  not: {degisen} satırlık commit — bulundu, ama yeri daralmadı; "
                  "commit'in içinde elle aranacak.")
        return 0
    adaylar = [x for x in satirlar if len(x) >= 40 and all(c in "0123456789abcdef" for c in x[:40])]
    if "skip" in cikti.lower() or adaylar:
        print("TEK COMMIT'E İNMEDİ — atlanan adımlar yüzünden kıran commit şunlardan biri:")
        for x in adaylar:
            print("  " + git(klon, "show", "-s", "--format=%h %s", x[:40]).stdout.strip())
        return 3
    print("ARAMA SONUÇ VERMEDİ — git bisect çıktısı:\n" + cikti[-1500:])
    return 3


def main(argv=None):
    p = argparse.ArgumentParser(description="Bir sınav vakasını kıran commit'i bul.")
    alt = p.add_subparsers(dest="komut")
    p.add_argument("--vaka")
    p.add_argument("--iyi", help="vakanın geçtiği bilinen ref")
    p.add_argument("--kotu", default="HEAD")
    p.add_argument("--tekrar", type=int, default=2,
                   help="her adımda kaç kez koşulsun (ayrışırsa adım atlanır)")
    p.add_argument("--zaman", type=int, default=3600, help="toplam süre sınırı (sn)")

    a = alt.add_parser("_adim")   # git bisect run'ın çağırdığı iç komut
    for ad in ("--klon", "--dosya", "--vaka", "--kaynak"):
        a.add_argument(ad, required=True)
    a.add_argument("--tekrar", type=int, default=2)

    args = p.parse_args(argv)
    if args.komut == "_adim":
        return adim(args.klon, args.dosya, args.vaka, args.tekrar, args.kaynak)
    if not args.vaka or not args.iyi:
        p.print_usage(sys.stderr)
        print("--vaka ve --iyi gerekli.", file=sys.stderr)
        return 2
    return ara(args)


if __name__ == "__main__":
    sys.exit(main())
