#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Halka ablasyonu
===============================================================
"Bu halkayı kaldırsam biri fark eder mi?"

## Boşluk neydi

Sistemde otuzdan fazla halka var ve **hiçbirinin hak ettiğini kanıtlayan
bir ölçüm yok.** Her halka başka bir şeyi ölçüyor; hiçbiri kendisinin
ölçüldüğünü göstermiyor. Evrim döngüsü EKSİK yeteneği arıyor, FAZLA
olanı değil.

Büyüyen bir sistemde küçültme mekanizması olmaması, tören biriktirmenin
garantisidir: bir halka eklenir, kimse silmez, kimse ölçmez, ve on halka
sonra sistemin ne kadarının gerçekten çalıştığı bilinmez.

## Yöntem

Mutasyon sınavının kardeşi, ama tersten:

    mutasyon  → aracı BOZ, sınav yakalamalı  (test canlı mı?)
    ablasyon  → aracı KALDIR, sınav düşmeli  (araç ölçülüyor mu?)

Bir araç geçici kopyada boş bir kabukla değiştirilir, sonra sınavlar
koşulur. Hiçbir vaka düşmüyorsa o aracı **hiçbir şey sınamıyor** demektir.
Kötü olduğu anlamına gelmez — ölçülmediği anlamına gelir, ve ölçülmeyen
şeyin çalıştığı da bilinmez.

Bir aracı içe aktaran başka bir araç varsa o da düşer. Bu gürültü değil:
bağımlılık da bir tür kapsam, ve "kimse fark etmiyor" sorusunun cevabı
yine hayır olur.

## Hiçbir şeyi silmez

Çıkış kodu 3 — insan kapısı. Kanıtsız çıkan bir halka **otomatik
kaldırılmaz.** Sebebi reddettiğimiz kategoriyle aynı: ölçülen şeyin,
ölçen kuralı değiştirme yetkisi olursa kural kural olmaktan çıkar.
Burada araç kendi kendini budayabilseydi, en zayıf ölçülen halka değil
en az sınanmış halka silinirdi — ki bu tam tersi bir seçim olurdu.

Ayrıca kanıtsızlık aracın değil SINAVIN kusuru olabilir: sınav o hata
türünü hiç içermiyorsa halka yararsız görünür. Karar okuyanın.

    python3 .claude/ablasyon.py --halka ders
    python3 .claude/ablasyon.py tara          (yavaş — mutasyon gibi)

Çıkış kodu: 0 halka kanıtlı · 1 zemin kirli, ölçüm yapılamadı ·
            3 kanıtsız halka var — insan kararı
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile

KAYNAK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KLASOR = os.path.join(KAYNAK, ".claude")

# Ablasyona girmeyenler.
#
# Sınavların kendisi kaldırılırsa "vaka düşmedi" anlamsızlaşır — ölçen
# aleti kaldırıp ölçüm yapılmaz. Bunlar ayrı bir soruyla (mutasyon)
# ölçülüyor.
HARIC = {
    "arac-sinavi.py", "sinav.py", "ablasyon.py",
    "mutasyon.py", "degerlendir.py",
}

# Kabuk, İÇE AKTARILINCA patlamaz.
#
# İlk hâli modül düzeyinde `sys.exit(0)` çağırıyordu. Bir sınav vakası o
# aracı fikstür kurmak için içe aktarınca `SystemExit` bütün sınavı
# süpürdü ve süreç **çıkış kodu 0** ile öldü — ablasyon da bunu "sıfır
# vaka düştü" diye okudu. İki halka kanıtsız göründü; kanıtsız değildi,
# ölçüm yalan söylüyordu.
#
# Artık kabuk yalnız DOĞRUDAN ÇALIŞTIRILINCA hiçbir şey yapmıyor. İçe
# aktaran bir vaka, aradığı adı bulamayıp düşüyor — ölçülmek istenen şey
# de zaten bu.
KABUK = '''#!/usr/bin/env python3
# ablasyon: bu araç kasten boşaltıldı
import sys

if __name__ == "__main__":
    sys.exit(0)
'''

# Sınavın GERÇEKTEN koştuğunun kanıtı: özet satırı.
#
# Çıkış kodu tek başına yetmiyor — yukarıdaki kaza tam olarak bunu
# gösterdi: kod 0'dı ve sınav hiç koşmamıştı. Defterdeki "0/1/3 dışı
# geçti sayılmaz" dersi bir adım eksikmiş; bir araç kodu 0 verip işini
# yapmamış da olabilir.
OZET = re.compile(r"(\d+)\s*/\s*(\d+)\s+(?:araç\s+)?vaka")


def halkalar():
    return sorted(a for a in os.listdir(KLASOR)
                  if a.endswith(".py") and a not in HARIC)


def kopya():
    gecici = tempfile.mkdtemp()
    kok = os.path.join(gecici, "depo")
    shutil.copytree(KAYNAK, kok)
    return gecici, kok


# Özyineleme kırıcı.
#
# `arac-sinavi.py` ablasyonun kendi vakalarını taşıyor ve o vakalar
# `ablasyon.py` çağırıyor — ablasyon sınav koşturunca sınav ablasyon
# koşturuyor, o da yine sınav. Ölçüldü: sınav 60 sn'den 1 dk 44 sn'ye
# çıktı ve 30 halkalık tarama zaman aşımına girdi.
#
# Bu bayrak açıkken o iki vaka atlanıyor. Atlama SESSİZ değil, raporda
# yazılı — sessizce atlanan vaka, geçen vaka gibi görünür.
BAYRAK = "ECHO_ABLASYON"
ATLANAN = 2


def kos(kok, betik, *arg):
    yol = os.path.join(kok, ".claude", betik)
    cevre = dict(os.environ, **{BAYRAK: "1"})
    try:
        return subprocess.run([sys.executable, yol, *arg], cwd=kok,
                              capture_output=True, text=True, timeout=1200,
                              env=cevre)
    except subprocess.TimeoutExpired:
        return None


def dusenler(kok):
    """Sınavlarda düşen vaka sayısı. None = sınav koşmadı.

    Düşen sayısı FAIL satırı sayarak değil, ÖZETTEN türetiliyor: sınav
    "N/M vaka beklendiği gibi davrandı" diyorsa düşen M-N'dir. FAIL
    saymak, hiç satır basmayan bir sınavı sıfır düşen gösteriyordu.
    """
    toplam = 0
    for betik in ("sinav.py", "arac-sinavi.py"):
        s = kos(kok, betik)
        if s is None:
            return None
        if s.returncode not in (0, 1):
            # 0/1 dışı: sınav çalışmadı. Bunu "düşmedi" saymak, ablasyonu
            # sessizce yalancı yapardı.
            return None
        e = OZET.search(s.stdout or "")
        if not e:
            # Kod 0 ama özet yok → sınav yarıda öldü. Ölçülen şey
            # "hiçbir vaka düşmedi" değil, "ölçüm yapılmadı".
            return None
        gecen, hepsi = int(e.group(1)), int(e.group(2))
        toplam += hepsi - gecen
    return toplam


def zemin_temiz(kok):
    n = dusenler(kok)
    return n == 0, n


def olc(halka, taban_kok):
    gecici, kok = kopya()
    try:
        yol = os.path.join(kok, ".claude", halka)
        with open(yol, "w", encoding="utf-8") as f:
            f.write(KABUK)
        n = dusenler(kok)
        return n
    finally:
        shutil.rmtree(gecici, ignore_errors=True)


def rapor(sonuclar):
    kanitsiz = [(h, n) for h, n in sonuclar if n == 0]
    kosmayan = [(h, n) for h, n in sonuclar if n is None]
    kanitli = [(h, n) for h, n in sonuclar if isinstance(n, int) and n > 0]

    if kanitli:
        print(f"KANITLI ({len(kanitli)}) — kaldırılınca vaka düşüyor:\n")
        for h, n in sorted(kanitli, key=lambda x: -x[1]):
            print(f"  {h:<22} {n} vaka düşüyor")
        print()
    if kosmayan:
        print(f"ÖLÇÜLEMEDİ ({len(kosmayan)}) — sınav koşmadı:\n")
        for h, _ in kosmayan:
            print(f"  {h}")
        print("Çalışmayan sınav, geçen sınav gibi görünür. Bu satırları")
        print("'kanıtlı' saymak ablasyonu yalancı yapardı.")
        print()
    if kanitsiz:
        print(f"KANITSIZ ({len(kanitsiz)}) — kaldırılınca HİÇBİR vaka düşmüyor:\n")
        for h, _ in kanitsiz:
            print(f"  {h}")
        print()
        print("Bu, o halkaların kötü olduğu anlamına GELMEZ. Ölçülmediği")
        print("anlamına gelir — ve ölçülmeyen şeyin çalıştığı da bilinmez.")
        print()
        print("İki ihtimal var, ayırmak insanın işi:")
        print("  · halka gereksiz          → kaldırılabilir")
        print("  · SINAV eksik             → vaka yazılmalı (daha olası)")
        print()
        print("Hiçbiri otomatik kaldırılmadı ve kaldırılmayacak.")
        return 3
    return 0


def main(argv=None):
    a = argparse.ArgumentParser(description="Halka ablasyonu — kaldır, kimse fark ediyor mu.")
    a.add_argument("komut", nargs="?", default="tara", choices=["tara"])
    a.add_argument("--halka", help="yalnız bu aracı ablasyona sok")
    ayr = a.parse_args(argv)

    hepsi = halkalar()
    if ayr.halka:
        ad = ayr.halka if ayr.halka.endswith(".py") else f"{ayr.halka}.py"
        if ad not in hepsi:
            print(f"'{ad}' ablasyona girmiyor ya da yok.")
            print(f"Girenler: {', '.join(hepsi)}")
            return 1
        secili = [ad]
    else:
        secili = hepsi
        print(f"{len(secili)} halka ablasyona girecek. Her biri iki sınav")
        print("koşturuyor — mutasyon sınavı kadar yavaş, sabırlı ol.\n")

    # Zemin kirliyse ölçüm anlamsız: düşen vakayı ablasyon mu yoksa zaten
    # kırık bir şey mi düşürdü, ayırt edilemez.
    gecici, kok = kopya()
    try:
        temiz, n = zemin_temiz(kok)
    finally:
        shutil.rmtree(gecici, ignore_errors=True)
    if n is None:
        # Kirli zeminden AYRI bir hâl. Karıştırmak, ablasyonun bir kez
        # düştüğü tuzağın ta kendisi: sınav çıkış 0 ile yarıda ölmüştü ve
        # "sıfır vaka düştü" diye okunmuştu.
        print("ZEMİN ÖLÇÜLEMEDİ — SINAV KOŞMADI.")
        print("Sınav çıkış kodu 0 verip özetini basmamış olabilir; bu")
        print("'hiçbir vaka düşmedi' değil, 'ölçüm yapılmadı' demektir.")
        print("İkisini karıştırmak ablasyonu yalancı yapar.")
        return 1
    if not temiz:
        print("ZEMİN KİRLİ — ablasyon yapılamaz.")
        print(f"Ablasyonsuz koşuda {n} vaka düşüyor.")
        print("Önce zemini yeşile getir; kirli zeminde 'vaka düştü' hiçbir")
        print("şey söylemez.")
        return 1

    print(f"(Ablasyonun kendi {ATLANAN} vakası atlanıyor — {BAYRAK} açık. "
          "Yoksa sınav ablasyonu, ablasyon sınavı koşturur.)\n")

    sonuclar = []
    for h in secili:
        n = olc(h, kok)
        isaret = "?" if n is None else ("!" if n == 0 else "·")
        print(f"  {isaret} {h:<22} {'ölçülemedi' if n is None else f'{n} vaka düşüyor'}")
        sonuclar.append((h, n))
    print()
    return rapor(sonuclar)


if __name__ == "__main__":
    sys.exit(main())
