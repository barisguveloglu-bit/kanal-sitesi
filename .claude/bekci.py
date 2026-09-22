#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Ölçüm katmanı bekçisi
===============================================================
"Ölçen aleti, ölçülen taraf değiştirdi mi?"

## Boşluk neydi

Fay enjeksiyonu denetleyicinin dikkatini ölçüyor, mutasyon testi testlerin
canlılığını ölçüyor, TDD kapısı kırmızıyı zorunlu kılıyor. Üçü de şunu
engellemiyor: **ajanın testi ya da denetleyiciyi kendisi değiştirerek
geçmesi.**

Bu teorik bir risk değil. Bu depoda bir oturum boyunca `arac-sinavi.py`
onlarca kez düzenlendi ve bazıları **kırmızı yanan bir testi düzeltmek**
içindi. Her biri, ölçen aletin ölçülen tarafından değiştirilmesiydi. Çoğu
meşruydu — ama meşru olanı olmayandan ayıran bir şey yoktu.

Emsali zaten vardı: `disajan.py`, dış ajanın `.claude/` altına dokunan
dalını reddediyor. Dışarıdakine uygulanan disiplinin içerideki için
geçerli olmaması tuhaftı.

## Neden kilit dosyası DEĞİL

Akla ilk gelen çözüm `tests.lock` + SHA-256. Çalışmaz: kilidi yazabilen
kilidi de güncelleyebilir. Kilidin kapsamını ikinci bir kilitli dosyada
tutmak da sonsuz döngü — kilidi kilitleyen kilidi kim kilitler?

Gerçek çapa başka yerde: **dalı ajan yazar, tabanı insan merge eder.**
Bu yüzden karşılaştırma bir dosyaya değil, **taban commit'ine** bakıyor.
Ajan dalda ne yaparsa yapsın, taban onun yazamadığı yerde duruyor.

## Sözleşme

Ölçüm dosyalarına dokunmak yasak değil — **beyansız** dokunmak yasak.
Bir commit mesajı şu satırı taşıyorsa değişiklik beyan edilmiş sayılır:

    ÖLÇÜM-DEĞİŞTİ: <gerekçe>

    python3 .claude/bekci.py --taban origin/ana-dal
    python3 .claude/bekci.py --taban HEAD~3 --ayrinti

Çıkış kodu:
  0  ölçüm katmanına dokunulmamış
  1  dokunulmuş ve BEYAN EDİLMEMİŞ — gerekçe yaz
  3  dokunulmuş ve beyan edilmiş — insan kapısı, merge kararı Barış'ın
"""

import argparse
import os
import re
import subprocess
import sys

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

# Ölçen taraf. Bu listedeki bir dosya değişirse, sistemin kendi hakkında
# söylediği şeyin ne kadar doğru olduğu değişmiş demektir.
#
# `bekci.py` kendisi de listede: bekçiyi listeden çıkaran bir commit,
# bekçiyi sessizce etkisizleştirir ve bunu bekçinin kendisi görmelidir.
OLCUM = (
    ".claude/dogrula.py",
    ".claude/butunluk.py",
    ".claude/sinav.py",
    ".claude/arac-sinavi.py",
    ".claude/degerlendir.py",
    ".claude/yargi.py",
    ".claude/mutasyon.py",
    ".claude/okuyucu.py",
    ".claude/bekci.py",
    ".claude/altin-sorular.json",
    ".github/workflows/denetim.yml",
)

BEYAN = re.compile(r"^\s*ÖLÇÜM-DEĞİŞTİ\s*:\s*(\S.*)$", re.MULTILINE)


def git(*arg):
    s = subprocess.run(["git", *arg], cwd=KOK, capture_output=True,
                       text=True, timeout=120)
    return s.returncode, s.stdout.strip(), s.stderr.strip()


def coz(ref):
    """Bir başvuruyu COMMIT KİMLİĞİNE çevir.

    Dal adına bağlanmak bu depoda bir kez kırmızıyı yeşil gösterdi:
    GitHub'ın PR koşusunda HEAD ayrık olduğu için `--abbrev-ref HEAD`
    düz `HEAD` döndürüyordu ve karşılaştırma kendi kendine yapılıyordu.
    Ad çürür, commit çürümez.
    """
    kod, cikti, _ = git("rev-parse", "--verify", f"{ref}^{{commit}}")
    return cikti if kod == 0 else None


LISTE = re.compile(r'^\s*"([^"]+)",\s*$', re.MULTILINE)


def olcum_listesi(taban):
    """Ölçüm listesi — dalın değil, TABANIN sürümünden.

    Bekçinin kendi açığı buydu ve bir vaka onu yakaladı: dal, `bekci.py`
    içindeki listeden `bekci.py` satırını silince bekçi kendini görmez
    oldu ve "temiz" dedi. Kilidi yazabilen kilidi de açar.

    Çözüm listeyi kilitlemek değil, KAYNAĞINI değiştirmek: taban commit'i
    ajanın yazamadığı yerde duruyor. İki liste BİRLEŞTİRİLİYOR — yeni
    dosya eklemek hemen etkili olsun, çıkarmak olmasın. Asimetri kasten:
    korumayı genişletmek serbest, daraltmak insan kararı.
    """
    kod, cikti, _ = git("show", f"{taban}:.claude/bekci.py")
    if kod != 0:
        # Tabanda bekçi yok (ilk ekleniş). Yalnız yerel liste geçerli.
        return set(OLCUM), False
    govde = cikti.split("OLCUM = (", 1)
    if len(govde) < 2:
        return set(OLCUM), False
    taban_liste = set(LISTE.findall(govde[1].split(")", 1)[0]))
    return set(OLCUM) | taban_liste, True


def degisenler(taban, ucu):
    kod, cikti, hata = git("diff", "--name-only", f"{taban}..{ucu}")
    if kod != 0:
        return None, hata
    return [s for s in cikti.splitlines() if s.strip()], None


def beyanlar(taban, ucu):
    """Aralıktaki commit mesajlarında geçen beyanlar."""
    kod, cikti, _ = git("log", "--format=%B%x00", f"{taban}..{ucu}")
    if kod != 0:
        return []
    return [e.strip() for govde in cikti.split("\0")
            for e in BEYAN.findall(govde)]


def main(argv=None):
    a = argparse.ArgumentParser(
        description="Ölçüm katmanına beyansız dokunulmuş mu.")
    a.add_argument("--taban", required=True,
                   help="karşılaştırma tabanı (dal, etiket ya da commit)")
    a.add_argument("--ucu", default="HEAD", help="karşılaştırılan uç")
    a.add_argument("--ayrinti", action="store_true")
    ayr = a.parse_args(argv)

    taban = coz(ayr.taban)
    ucu = coz(ayr.ucu)
    if taban is None:
        print(f"Taban çözülemedi: {ayr.taban}")
        print("Denetim KOŞMADI — bu 'geçti' sayılmaz.")
        return 2
    if ucu is None:
        print(f"Uç çözülemedi: {ayr.ucu}")
        print("Denetim KOŞMADI — bu 'geçti' sayılmaz.")
        return 2
    if taban == ucu:
        print("Taban ile uç aynı commit — karşılaştırılacak bir şey yok.")
        print("Bu 'temiz' demek değil; ölçüm hiç yapılmadı.")
        return 2

    dosyalar, hata = degisenler(taban, ucu)
    if dosyalar is None:
        print(f"Fark alınamadı: {hata}")
        return 2

    liste, tabandan = olcum_listesi(taban)
    dokunulan = [d for d in dosyalar if d in liste]
    if ayr.ayrinti:
        print(f"taban {taban[:8]} → uç {ucu[:8]}, {len(dosyalar)} dosya değişti")
        print(f"ölçüm listesi {len(liste)} dosya"
              + (" (taban + dal birleşimi)" if tabandan else " (yalnız dal)"))

    if not dokunulan:
        print(f"Ölçüm katmanına dokunulmamış ({len(dosyalar)} dosya değişti).")
        return 0

    beyan = beyanlar(taban, ucu)
    print(f"ÖLÇÜM KATMANI DEĞİŞTİ — {len(dokunulan)} dosya:\n")
    for d in dokunulan:
        print(f"  {d}")
    print()

    if not beyan:
        print("BEYAN YOK.")
        print()
        print("Ölçen aleti değiştirmek yasak değil — beyansız değiştirmek")
        print("yasak. Sistemin kendi hakkında söylediği şeyin ne kadar")
        print("doğru olduğu değişti ve bunu commit geçmişi söylemiyor.")
        print()
        print("Commit mesajına şu satırı ekle:")
        print("  ÖLÇÜM-DEĞİŞTİ: <neden değişti, neyi zayıflatıyor ya da güçlendiriyor>")
        return 1

    print(f"BEYAN VAR ({len(beyan)}):\n")
    for b in beyan:
        print(f"  · {b}")
    print()
    print("İNSAN KAPISI — beyan, onay değildir. Ölçen aletin değişmesine")
    print("karar vermek ajanın işi değil; merge kararı Barış'ın.")
    return 3


if __name__ == "__main__":
    sys.exit(main())
