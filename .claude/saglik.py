#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Sağlık (dış halkanın tetikleyicisi ve hafızası)
===============================================================
Dış halka vardı ama kendiliğinden dönmüyordu.

## İki eksik

**Kimse çalıştırmıyordu.** Komut tablosu `/degerlendir` için "değişiklikten
sonra, ayda bir" diyordu. "Ayda bir" bir rica: onu hatırlayacak bir şey
yoktu. Dört ayrı ölçüm dört ayrı komuttu; tam bir sağlık turu için dördünü
de hatırlamak gerekiyordu. Bu betik hepsini tek komutta koşturur — zamanlanmış
bir iş (Routine) ya da telefondan tek satır için uygun hâle getirir.

**Eşiğin üstündeki gerileme görünmüyordu.** Eşikler tabandır: isabet@3
%95'ten %91'e düşerse eşik (%90) hâlâ geçer, her şey yeşil görünür. Ama bir
şey bozulmuştur. Yargı geçmişi (`yargi.py gecmis`) bunu cevaplar için
yapıyordu; arama için kimse yapmıyordu. Bu betik her kayıtlı koşuyu bir
öncekiyle kıyaslar ve düşen ölçüyü söyler — eşiği geçse bile.

Sayıların (vaka, mutasyon, altın soru) düşmesine `mandal.py` bakar; burası
ölçümün KALİTESİNE bakar. İkisi ayrı sorular.

    python3 .claude/saglik.py                 # hepsini koş
    python3 .claude/saglik.py --hizli         # mutasyonu atla (en yavaşı)
    python3 .claude/saglik.py --kaydet        # sonucu geçmişe yaz
    python3 .claude/saglik.py --sadece arama  # tek adım (denetim, mandal,
                                              # sinav, arama, araclar, mutasyon)
    python3 .claude/saglik.py gecmis          # son koşular

Çıkış kodu: 0 yeşil, 1 kırmızı, 3 insan kapısı (onay bekleyen değişiklik,
gevşeyen ölçü ya da eşiğin üstünde gerileme).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GECMIS = os.path.join(KOK, ".claude", "saglik-gecmisi.jsonl")

# Eşiğin üstünde izlenen kalite ölçüleri — hepsi "büyük iyidir".
# Sayımlar (kaç vaka, kaç denetim) burada YOK: içerik değişince doğal olarak
# oynarlar ve gürültü üretirler; düşmelerini mandal.py zaten yakalıyor.
IZLENEN = ("degerlendir.isabet1", "degerlendir.isabet3",
           "degerlendir.mrr", "degerlendir.kapsama")


def _yuzde(metin, etiket):
    m = re.search(re.escape(etiket) + r"\s+(\d+)%", metin)
    return int(m.group(1)) / 100 if m else None


def _oran(metin, desen):
    m = re.search(desen, metin)
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)


def ayristir_dogrula(cikti):
    m = re.search(r"TEMİZ — (\d+) denetim", cikti) or re.search(r"(\d+) geçen denetim", cikti)
    return {"dogrula.gecen": int(m.group(1))} if m else {}


def ayristir_sinav(cikti):
    g, t = _oran(cikti, r"(\d+)/(\d+) vaka beklendiği gibi")
    return {"sinav.gecen": g, "sinav.toplam": t} if t else {}


def ayristir_degerlendir(cikti):
    o = {"degerlendir.isabet1": _yuzde(cikti, "isabet@1"),
         "degerlendir.isabet3": _yuzde(cikti, "isabet@3"),
         "degerlendir.kapsama": _yuzde(cikti, "gerçek kapsama")}
    m = re.search(r"MRR\s+([0-9.]+)", cikti)
    if m:
        o["degerlendir.mrr"] = float(m.group(1))
    return {k: v for k, v in o.items() if v is not None}


def ayristir_arac(cikti):
    g, t = _oran(cikti, r"(\d+)/(\d+) araç vakası")
    return {"arac.gecen": g, "arac.toplam": t} if t else {}


def ayristir_mutasyon(cikti):
    g, t = _oran(cikti, r"(\d+)/(\d+) mutasyon yakalandı")
    return {"mutasyon.yakalanan": g, "mutasyon.toplam": t} if t else {}


ADIMLAR = (
    # (anahtar, betik, argümanlar, ayrıştırıcı, zaman aşımı sn, hızlıda atlanır mı)
    ("denetim",  "dogrula.py",     (),            ayristir_dogrula,     120, False),
    ("mandal",   "mandal.py",      ("kontrol",),  lambda c: {},         60,  False),
    ("sinav",    "sinav.py",       (),            ayristir_sinav,       600, False),
    ("arama",    "degerlendir.py", (),            ayristir_degerlendir, 300, False),
    ("araclar",  "arac-sinavi.py", (),            ayristir_arac,        900, False),
    ("mutasyon", "mutasyon.py",    (),            ayristir_mutasyon,    1800, True),
)
ANAHTARLAR = tuple(adim[0] for adim in ADIMLAR)


def kos_adim(betik, arg, zaman_asimi):
    yol = os.path.join(KOK, ".claude", betik)
    if not os.path.exists(yol):
        return None, f"{betik} yok"
    try:
        s = subprocess.run([sys.executable, yol, *arg], cwd=KOK,
                           capture_output=True, text=True, timeout=zaman_asimi)
    except subprocess.TimeoutExpired:
        return None, f"{zaman_asimi} sn içinde bitmedi"
    return s.returncode, (s.stdout or "") + (s.stderr or "")


def gecmis_oku():
    kayitlar = []
    if os.path.exists(GECMIS):
        with open(GECMIS, encoding="utf-8") as f:
            for satir in f:
                try:
                    kayitlar.append(json.loads(satir))
                except ValueError:
                    pass
    return kayitlar


def gerilemeler(onceki, simdi):
    """Önceki koşuya göre düşen kalite ölçüleri — eşiği geçseler bile."""
    sonuc = []
    for ad in IZLENEN:
        a, b = (onceki or {}).get(ad), simdi.get(ad)
        if a is not None and b is not None and b < a - 1e-9:
            sonuc.append((ad, a, b))
    return sonuc


def k_kos(a):
    baslangic = time.time()
    olcum, kirmizi, kapi, satirlar = {}, [], [], []

    secilen = [s.strip() for s in a.sadece.split(",") if s.strip()] if a.sadece else []
    bilinmeyen = [s for s in secilen if s not in ANAHTARLAR]
    if bilinmeyen:
        print(f"Bilinmeyen adım: {', '.join(bilinmeyen)}. Geçerli: {', '.join(ANAHTARLAR)}")
        return 2

    for ad, betik, arg, ayristir, zaman_asimi, hizlida_atla in ADIMLAR:
        if secilen and ad not in secilen:
            continue
        if a.hizli and hizlida_atla:
            satirlar.append(f"  --    {ad:13} atlandı (--hizli)")
            continue
        kod, cikti = kos_adim(betik, arg, zaman_asimi)
        olcum.update(ayristir(cikti) if kod is not None else {})
        ozet = next((s.strip() for s in reversed(cikti.strip().splitlines()) if s.strip()), "") \
            if kod is not None else cikti
        if kod == 0:
            isaret = "OK  "
        elif kod == 3:
            isaret = "KAPI"
            kapi.append(ad)
        else:
            isaret = "FAIL"
            kirmizi.append(ad)
        satirlar.append(f"  {isaret}  {ad:13} {ozet[:90]}")

    onceki = next((k for k in reversed(gecmis_oku()) if k.get("olcum")), None)
    geri = gerilemeler(onceki and onceki["olcum"], olcum)

    print("\n".join(satirlar))
    if geri:
        print(f"\nEşiğin üstünde gerileme (önceki kayıt: {onceki.get('tarih')}):")
        for ad, eski, yeni in geri:
            print(f"  {ad:22} {eski} → {yeni}")
        print("Eşik geçiyor diye yeşil sayma: bir şey bozuldu. Sebebini bul ya da "
              "Barış'a göster.")

    durum = "kirmizi" if kirmizi else ("kapi" if kapi or geri else "yesil")
    sure = round(time.time() - baslangic)
    print(f"\nSağlık: {durum.upper()} ({sure} sn"
          + (", mutasyon atlandı" if a.hizli else "") + ")")

    if a.kaydet:
        # "tam": bütün adımlar koştu mu. Açılış kancası "son tam ölçüm ne
        # zaman" sorusunu sadece tam kayıtlarla cevaplar — tek adımlık bir
        # koşu, sağlık turu yerine geçmez.
        kayit = {"tarih": datetime.now().isoformat(timespec="seconds"),
                 "durum": durum, "kirmizi": kirmizi + kapi,
                 "gerileme": [ad for ad, _, _ in geri],
                 "tam": not secilen, "hizli": bool(a.hizli), "sure": sure,
                 "olcum": olcum}
        with open(GECMIS, "a", encoding="utf-8") as f:
            f.write(json.dumps(kayit, ensure_ascii=False) + "\n")
        print(f"Kaydedildi → {os.path.relpath(GECMIS, KOK)}")

    return 1 if kirmizi else (3 if kapi or geri else 0)


def k_gecmis(a):
    kayitlar = gecmis_oku()[-a.son:]
    if not kayitlar:
        print("Kayıtlı koşu yok. İlk koşu: python3 .claude/saglik.py --kaydet")
        return 0
    print(f"{'tarih':22} {'durum':8} {'isabet@1':>8} {'isabet@3':>8} {'MRR':>6}  not")
    for k in kayitlar:
        o = k.get("olcum") or {}
        def yuzde(ad):
            return f"{o[ad] * 100:.0f}%" if ad in o else "—"
        mrr = f"{o['degerlendir.mrr']:.3f}" if "degerlendir.mrr" in o else "—"
        notlar = ", ".join(k.get("kirmizi") or []) or ("hızlı" if k.get("hizli") else "")
        print(f"{k.get('tarih', ''):22} {k.get('durum', ''):8} {yuzde('degerlendir.isabet1'):>8} "
              f"{yuzde('degerlendir.isabet3'):>8} {mrr:>6}  {notlar}")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Dış halkanın tek komutu.")
    a.add_argument("komut", nargs="?", default="kos", choices=("kos", "gecmis"))
    a.add_argument("--hizli", action="store_true", help="mutasyon sınavını atla")
    a.add_argument("--kaydet", action="store_true", help="sonucu geçmişe yaz")
    a.add_argument("--sadece", default="",
                   help="virgülle adımlar: " + ", ".join(ANAHTARLAR))
    a.add_argument("--son", type=int, default=10)
    secim = a.parse_args(argv)
    return k_gecmis(secim) if secim.komut == "gecmis" else k_kos(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
