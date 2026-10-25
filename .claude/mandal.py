#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Ölçü mandalı
===============================================================
Ölçü sadece bir yöne dönebilir: sıkılaşmaya. Gevşemesi insan kararıdır.

## Sorun — testi geçirmenin en kolay yolu testi zayıflatmak

`/surekli` şöyle diyordu: "Eşik indirerek, vaka silerek, denetim atlayarak
yeşile ulaşmak döngüyü tamamlamak değil, ölçüyü yok etmektir." Doğru — ama
bu cümle sadece YAZIYORDU. Bir eşiği 0.90'dan 0.80'e çekmek, bir sınav
vakasını silmek ya da devre kesicinin sınırını 3'ten 30'a çıkarmak hiçbir
denetime takılmıyordu. Belge sayıları senkron tutuluyordu, evet; ama vaka
silinip belge de aynı anda düzeltilirse `belge` denetimi bunu "tutarlı"
diye geçiriyordu. Tutarlı bir gerileme yine de gerilemedir.

Kural yazı olarak durursa, onu uygulayacak olan tam da onu aşmak isteyen
taraf olur. Devre kesicide yapılan şeyin aynısı: kural süreç dışına,
dosyaya taşındı.

## Nasıl çalışır

Mandal, ölçüleri araçları ÇALIŞTIRMADAN okur — kaynak kodu ayrıştırarak
(ast). Ölçtüğü şeyi çalıştırsaydı, bozuk bir araç mandalı da bozardı.

Taban `.claude/mandal.json` içinde durur. Kıyas iki tabanın SIKI olanına
karşı yapılır: HEAD'deki (commit edilmiş) ve çalışma ağacındaki. Böylece:

  - tabanı ve ölçüyü aynı anda gevşetmek işe yaramaz — HEAD'deki taban
    commit edilene kadar geçerli, commit de kapıdan geçer (kanca-kapi.py);
  - tabanı yükseltip sonra ölçüyü düşürmek de yakalanır.

Gevşeme bir HATA değil, İNSAN KAPISIDIR (çıkış kodu 3): bir vakayı silmenin
meşru sebebi olabilir. Ama o karar modelin değil, Barış'ın.

    python3 .claude/mandal.py olc                          # şu anki ölçüler
    python3 .claude/mandal.py kontrol                      # tabana göre durum
    python3 .claude/mandal.py kaydet                       # tabanı ilerlet
    python3 .claude/mandal.py kaydet --gerekce "neden"     # gevşemeyi kayda geçir

Çıkış kodu: 0 sağlam, 1 ölçülemedi ya da gerekçesiz gevşetme, 3 ölçü gevşedi.
"""

import argparse
import ast
import json
import os
import re
import subprocess
import sys
from datetime import datetime

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABAN_YOLU = ".claude/mandal.json"

# Yön ölçünün kendisinde yazılı, taban dosyasında değil — yoksa yönü
# çevirmek de bir gevşetme yolu olurdu.
#   yukari  büyüdükçe sıkılaşır (vaka sayısı, eşik)
#   asagi   küçüldükçe sıkılaşır (tur sınırı, süre bütçesi)
#   esit    iki yönde de karar ister (iki tarafı da riskli ayarlar)
OLCULER = (
    # (ad, yön, açıklama)
    ("sinav.vaka",              "yukari", "denetleyici sınavındaki vaka sayısı"),
    ("sinav.tuzak",             "yukari", "yakalanması gereken bozuk vaka"),
    ("sinav.masum",             "yukari", "yanlış alarm avı yapan masum vaka"),
    ("arac_sinavi.vaka",        "yukari", "araç sınavındaki vaka sayısı"),
    ("mutasyon.sayi",           "yukari", "testlerin canlılığını ölçen mutasyon"),
    ("altin.soru",              "yukari", "altın setteki cevaplı soru"),
    ("altin.konu_disi",         "yukari", "altın setteki konu dışı soru"),
    ("altin.cevapsiz",          "yukari", "altın setteki cevapsız soru"),
    ("dogrula.denetim",         "yukari", "denetleyicideki denetim başlığı"),
    ("dogrula.aa_sinir",        "yukari", "kontrast sınırı (WCAG AA)"),
    ("degerlendir.isabet3",     "yukari", "geri getirme isabet@3 eşiği"),
    ("degerlendir.kapsama",     "yukari", "gerçek kapsama eşiği"),
    ("degerlendir.konu_disi",   "yukari", "konu dışı ret eşiği"),
    ("degerlendir.cevapsiz",    "yukari", "sahte delil üretmeme eşiği"),
    ("degerlendir.degismezlik", "yukari", "yazım değişmezliği eşiği"),
    ("gorev.atif_esik",         "yukari", "atıfın cümleyi destekleme eşiği"),
    ("devre.varsayilan_sinir",  "asagi",  "devre kesicinin varsayılan tur sınırı"),
    ("devre.varsayilan_sure",   "asagi",  "devre kesicinin süre bütçesi (sn)"),
    ("devre.tekrar_sinir",      "asagi",  "aynı işin kaç kez tekrarına izin var"),
    ("kanca.devre_sinir",       "asagi",  "düzenleme kancasının tur sınırı"),
    ("ara.soz_dagari_esik",     "esit",   "aramanın 'bilmiyorum' deme eşiği"),
)
YON = {ad: yon for ad, yon, _ in OLCULER}
ACIKLAMA = {ad: aciklama for ad, _, aciklama in OLCULER}


# ------------------------------------------------------------------ ölçüm

class _Kaynak:
    """Kaynak dosyaları bir kez ayrıştırır; hiçbirini çalıştırmaz."""

    def __init__(self, kok):
        self.kok = kok
        self._agaclar = {}

    def metin(self, yol):
        with open(os.path.join(self.kok, yol), encoding="utf-8") as f:
            return f.read()

    def agac(self, yol):
        if yol not in self._agaclar:
            self._agaclar[yol] = ast.parse(self.metin(yol), yol)
        return self._agaclar[yol]

    def atama(self, yol, ad):
        for dugum in ast.walk(self.agac(yol)):
            if isinstance(dugum, ast.Assign):
                for hedef in dugum.targets:
                    if isinstance(hedef, ast.Name) and hedef.id == ad:
                        return dugum.value
        raise LookupError(f"{yol} içinde `{ad} = ...` bulunamadı")

    def sabit(self, yol, ad):
        return ast.literal_eval(self.atama(yol, ad))

    def elemanlar(self, yol, ad):
        dugum = self.atama(yol, ad)
        if isinstance(dugum, ast.Dict):
            return dugum.keys
        if isinstance(dugum, (ast.List, ast.Tuple)):
            return dugum.elts
        raise LookupError(f"{yol}: `{ad}` bir liste değil")

    def desen(self, yol, desen):
        eslesme = re.search(desen, self.metin(yol))
        if not eslesme:
            raise LookupError(f"{yol} içinde beklenen kalıp yok: {desen}")
        return float(eslesme.group(1))


def _tuzak_mi(eleman):
    """sinav.py vakası: (ad, islev, beklenen) — beklenen None ise masum."""
    beklenen = eleman.elts[2] if isinstance(eleman, ast.Tuple) and len(eleman.elts) > 2 else None
    return not (isinstance(beklenen, ast.Constant) and beklenen.value is None)


def olc(kok=KOK):
    """Her ölçüyü ayrı ayrı oku. Biri okunamazsa diğerleri yine ölçülür.

    Dönüş: ({ad: değer}, [(ad, hata mesajı)])
    """
    k = _Kaynak(kok)

    def altin(anahtar):
        with open(os.path.join(kok, ".claude", "altin-sorular.json"), encoding="utf-8") as f:
            return len(json.load(f)[anahtar])

    okuyucular = {
        "sinav.vaka": lambda: len(k.elemanlar(".claude/sinav.py", "VAKALAR")),
        "sinav.tuzak": lambda: sum(map(_tuzak_mi, k.elemanlar(".claude/sinav.py", "VAKALAR"))),
        "sinav.masum": lambda: sum(not _tuzak_mi(e) for e in k.elemanlar(".claude/sinav.py", "VAKALAR")),
        "arac_sinavi.vaka": lambda: len(k.elemanlar(".claude/arac-sinavi.py", "VAKALAR")),
        "mutasyon.sayi": lambda: len(k.elemanlar(".claude/mutasyon.py", "MUTASYONLAR")),
        "altin.soru": lambda: altin("sorular"),
        "altin.konu_disi": lambda: altin("konu_disi"),
        "altin.cevapsiz": lambda: altin("cevapsiz"),
        "dogrula.denetim": lambda: len(k.elemanlar(".claude/dogrula.py", "DENETIMLER")),
        "dogrula.aa_sinir": lambda: k.sabit(".claude/dogrula.py", "AA_SINIR"),
        "degerlendir.isabet3": lambda: k.sabit(".claude/degerlendir.py", "ESIK_ISABET3"),
        "degerlendir.kapsama": lambda: k.sabit(".claude/degerlendir.py", "ESIK_KAPSAMA"),
        "degerlendir.konu_disi": lambda: k.sabit(".claude/degerlendir.py", "ESIK_KONU_DISI"),
        "degerlendir.cevapsiz": lambda: k.sabit(".claude/degerlendir.py", "ESIK_CEVAPSIZ"),
        "degerlendir.degismezlik": lambda: k.sabit(".claude/degerlendir.py", "ESIK_DEGISMEZLIK"),
        "gorev.atif_esik": lambda: k.desen(".claude/gorev.py",
                                           r'"--esik",[^)]*?default=([0-9.]+)'),
        "devre.varsayilan_sinir": lambda: k.sabit(".claude/devre.py", "VARSAYILAN_SINIR"),
        "devre.varsayilan_sure": lambda: k.sabit(".claude/devre.py", "VARSAYILAN_SURE"),
        "devre.tekrar_sinir": lambda: k.sabit(".claude/devre.py", "TEKRAR_SINIR"),
        "kanca.devre_sinir": lambda: k.desen(".claude/kanca.py", r'"--sinir",\s*"(\d+)"'),
        "ara.soz_dagari_esik": lambda: k.sabit(".claude/ara.py", "SOZ_DAGARI_ESIK"),
    }

    degerler, hatalar = {}, []
    for ad, _, _ in OLCULER:
        try:
            deger = okuyucular[ad]()
            degerler[ad] = int(deger) if float(deger).is_integer() else float(deger)
        except Exception as e:
            hatalar.append((ad, f"{type(e).__name__}: {e}"))
    return degerler, hatalar


# ------------------------------------------------------------------ taban

def _git_goster(kok, yol):
    try:
        sonuc = subprocess.run(["git", "show", f"HEAD:{yol}"], cwd=kok,
                               capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return None
    return sonuc.stdout if sonuc.returncode == 0 else None


def _taban_ayristir(metin):
    try:
        return json.loads(metin).get("olculer") or {}
    except (ValueError, AttributeError):
        return None


def daha_siki(ad, a, b):
    """İki değerden sıkı olanı. Eşit yönde ikisi farklıysa ilki (HEAD) kalır."""
    yon = YON.get(ad, "esit")
    if yon == "yukari":
        return max(a, b)
    if yon == "asagi":
        return min(a, b)
    return a


def taban_oku(kok=KOK):
    """HEAD ve çalışma ağacındaki tabanların sıkı olanı.

    Dönüş: ({ad: değer}, kaynak açıklaması) — taban yoksa ({}, None).
    """
    tabanlar = []
    head = _git_goster(kok, TABAN_YOLU)
    if head is not None:
        t = _taban_ayristir(head)
        if t is not None:
            tabanlar.append(("HEAD", t))
    yerel = os.path.join(kok, TABAN_YOLU)
    if os.path.exists(yerel):
        with open(yerel, encoding="utf-8") as f:
            t = _taban_ayristir(f.read())
        if t is not None:
            tabanlar.append(("çalışma ağacı", t))
    if not tabanlar:
        return {}, None

    birlesik = dict(tabanlar[0][1])
    for _, t in tabanlar[1:]:
        for ad, deger in t.items():
            birlesik[ad] = daha_siki(ad, birlesik[ad], deger) if ad in birlesik else deger
    return birlesik, " + ".join(ad for ad, _ in tabanlar)


def karsilastir(kok=KOK):
    """dogrula.py'nin `mandal` denetimi bunu çağırır."""
    simdi, hatalar = olc(kok)
    taban, kaynak = taban_oku(kok)
    sonuc = {"olcum_hatasi": list(hatalar), "gevsedi": [], "siki": [],
             "simdi": simdi, "taban": taban, "kaynak": kaynak}
    olculemeyen = {ad for ad, _ in hatalar}

    for ad, eski in taban.items():
        if ad in olculemeyen:
            continue
        if ad not in simdi:
            # Ölçünün kendisi listeden çıkarılmış: en sessiz gevşetme.
            sonuc["gevsedi"].append((ad, eski, "ölçülmüyor", YON.get(ad, "esit")))
            continue
        yeni, yon = simdi[ad], YON[ad]
        if yeni == eski:
            continue
        gevsedi = (yon == "yukari" and yeni < eski) or \
                  (yon == "asagi" and yeni > eski) or yon == "esit"
        (sonuc["gevsedi"] if gevsedi else sonuc["siki"]).append((ad, eski, yeni, yon))
    return sonuc


# ------------------------------------------------------------------ komutlar

def k_olc(a):
    simdi, hatalar = olc()
    for ad, _, aciklama in OLCULER:
        deger = simdi.get(ad, "—")
        print(f"  {ad:24} {str(deger):>7}   {aciklama}")
    for ad, mesaj in hatalar:
        print(f"  ÖLÇÜLEMEDİ {ad}: {mesaj}")
    return 1 if hatalar else 0


def k_kontrol(a):
    s = karsilastir()
    if s["kaynak"] is None:
        print("Taban yok. İlk tabanı al: python3 .claude/mandal.py kaydet")
        return 0
    for ad, mesaj in s["olcum_hatasi"]:
        print(f"  ÖLÇÜLEMEDİ {ad}: {mesaj}")
    for ad, eski, yeni, yon in s["gevsedi"]:
        print(f"  GEVŞEDİ  {ad:24} {eski} → {yeni}   ({ACIKLAMA.get(ad, '')})")
    for ad, eski, yeni, _ in s["siki"]:
        print(f"  sıkılaştı {ad:23} {eski} → {yeni}")
    if s["olcum_hatasi"]:
        return 1
    if s["gevsedi"]:
        print("\nÖlçü gevşedi. Bu bir düzeltme işi değil, karar işi: Barış'a sor.\n"
              "Onaylarsa: python3 .claude/mandal.py kaydet --gerekce \"...\"")
        return 3
    print(f"Mandal sağlam ({len(s['simdi'])} ölçü, taban: {s['kaynak']}).")
    return 0


def k_kaydet(a):
    s = karsilastir()
    if s["olcum_hatasi"]:
        for ad, mesaj in s["olcum_hatasi"]:
            print(f"  ÖLÇÜLEMEDİ {ad}: {mesaj}")
        print("Ölçülemeyen bir şey varken taban kaydedilmez.")
        return 1
    if s["gevsedi"] and not a.gerekce.strip():
        for ad, eski, yeni, _ in s["gevsedi"]:
            print(f"  GEVŞEDİ  {ad:24} {eski} → {yeni}")
        print("\nGevşeyen ölçü gerekçesiz kaydedilmez: --gerekce \"...\" ver.\n"
              "Gerekçe Barış'ın onayını anlatmalı — model kendi kendine "
              "gevşetme izni veremez.")
        return 1

    yol = os.path.join(KOK, TABAN_YOLU)
    eski_dosya = {}
    if os.path.exists(yol):
        with open(yol, encoding="utf-8") as f:
            try:
                eski_dosya = json.load(f)
            except ValueError:
                eski_dosya = {}
    gecmis = list(eski_dosya.get("gecmis") or [])
    if s["gevsedi"]:
        gecmis.append({
            "tarih": datetime.now().isoformat(timespec="seconds"),
            "gerekce": a.gerekce.strip(),
            "gevseyen": {ad: [eski, yeni] for ad, eski, yeni, _ in s["gevsedi"]},
        })

    veri = {
        "_aciklama": [
            "Ölçü mandalı tabanı — mandal.py yazar, elle düzenlenmez.",
            "Değerler sadece sıkılaşma yönünde ilerler. Gevşeme insan kararıdır:",
            "'gecmis' her gevşemeyi gerekçesiyle tutar.",
        ],
        "olculer": s["simdi"],
        "gecmis": gecmis,
    }
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Taban kaydedildi: {len(s['simdi'])} ölçü"
          + (f", {len(s['gevsedi'])} gevşeme gerekçesiyle geçmişe yazıldı." if s["gevsedi"] else "."))
    if s["gevsedi"]:
        print("HEAD'deki taban commit edilene kadar geçerli; commit insan "
              "kapısından geçecek.")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Ölçü sadece sıkılaşır.")
    alt = a.add_subparsers(dest="komut", required=True)
    alt.add_parser("olc")
    alt.add_parser("kontrol")
    k = alt.add_parser("kaydet")
    k.add_argument("--gerekce", default="")
    secim = a.parse_args(argv)
    return {"olc": k_olc, "kontrol": k_kontrol, "kaydet": k_kaydet}[secim.komut](secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
