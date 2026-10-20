#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Tepe tırmanma döngüsü
===============================================================
Mevcut çözümün komşularını dener, sadece **daha iyi** olanı kabul eder,
gelişme durana kadar tekrarlar.

## Neden bu depoda ayrı bir yeri var

Burada bir kez elle tepe tırmanma yapıldı ve sonucu **reddedildi.**
`ara.py` parametreleri taranmış, tarama tek hücrelik bir tepe göstermişti:
komşularının hepsi belirgin biçimde daha kötüydü. Kabul edilmedi, çünkü tek
hücrelik tepe iyileşme değil **ezberdir** — 20 soruluk bir sete uydurulmuş
bir sayıdır ve 21. soruda çöker.

O karar doğruydu ama **elle** verilmişti; yani bir dahaki sefere aynı
kararın verileceğinin garantisi yoktu. Bu betik o kararı mekanik hâle
getiriyor: tırmanır, ama tepenin gerçek mi ezber mi olduğunu **ölçer** ve
ezberse kabul etmez.

## Tuzaklar ve burada ne yapıldığı

| Tuzak | Ne demek | Burada ne yapılıyor |
|---|---|---|
| Yerel zirve | Küçük bir tepeye çıkıp durmak | Rastgele sıçrama: farklı başlangıçlardan tırmanılır, tepeler karşılaştırılır |
| Plato | Bütün komşular eşit, yön yok | Tespit edilir ve **raporlanır** — körleşmeyi gizlemek yerine söyler |
| Sırt | İyileşme çapraz yönde, eksen adımları ıskalar | Eksen adımları tıkanınca çapraz (iki parametre birden) adım denenir |
| **Ezber tepe** | Tepe var ama sadece bu sete özgü | Komşu düşüşü ölçülür; tepe yalıtıksa **reddedilir** |

Sonuncusu klasik anlatımlarda yoktur ve burada en önemlisidir. Diğer üçü
"daha iyi tepeyi bulamama" sorunudur; bu, "bulduğun tepenin sahte olması"
sorunudur — ve ölçüm setine bakarak kendini haklı çıkarır.

## Amaç fonksiyonu

Tek sayıya indirgemek tehlikeli: sadece isabet@3'ü optimize etmek konu dışı
reddini bozabilir. Bu yüzden kapılar **sert kısıt**: konu dışı reddi ya da
sahte delil ölçüsü düşen aday, isabeti ne olursa olsun elenir.

    python3 .claude/tirmanma.py tirman
    python3 .claude/tirmanma.py tirman --siçrama 5
    python3 .claude/tirmanma.py komsular
"""

import argparse
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

# Aranacak uzay. Her parametre: (ad, ara.py'deki desen, değerler).
# Değerler makul aralıkta tutuldu — tırmanma sonsuz uzayda anlamlı değil,
# ve bu aralıkların dışı zaten kırılıyor.
UZAY = [
    ("KOK_UZUNLUK", r"^KOK_UZUNLUK = (\d+)$", [3, 4, 5, 6, 7, 8]),
    ("SOZ_DAGARI_ESIK", r"^    SOZ_DAGARI_ESIK = ([\d.]+)$",
     [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65]),
    ("PUAN_TABANI", r"^    PUAN_TABANI = ([\d.]+)$",
     [0.0, 0.5, 1.0, 1.5, 2.0, 2.5]),
    ("TABAN_UZUNLUK", r"^    TABAN_UZUNLUK = (\d+)$", [6, 8, 10, 12, 14, 16, 20]),
]

# Tepe yalıtıksa kabul edilmez. "Yalıtık" = komşularının ortalaması bu
# eşikten fazla düşüyor. Sayı kararla kondu, ölçümle değil — ve öyle
# olduğu burada yazıyor.
YALITIK_DUSUS = 0.04
PLATO_EPSILON = 1e-9


class Puan:
    """Bir adayın ölçüsü. Kapılar sert kısıt, isabet sıralama ölçüsü."""

    def __init__(self, isabet3, isabet1, mrr, kapsama, konu_disi, sahte):
        self.isabet3, self.isabet1, self.mrr = isabet3, isabet1, mrr
        self.kapsama, self.konu_disi, self.sahte = kapsama, konu_disi, sahte

    @property
    def gecerli(self):
        """Kapı düşen aday elenir — isabeti ne olursa olsun."""
        return self.konu_disi >= 100 and self.sahte >= 100 and self.kapsama >= 90

    @property
    def deger(self):
        if not self.gecerli:
            return -1.0
        # isabet@3 birincil, MRR ince ayrım için. MRR'ın ağırlığı küçük:
        # sıralamayı biraz iyileştiren ama isabeti düşüren aday kazanmasın.
        return self.isabet3 / 100.0 + 0.05 * self.mrr

    def __repr__(self):
        if not self.gecerli:
            return "GEÇERSİZ (kapı düştü)"
        return (f"isabet@3 {self.isabet3:.0f}%  isabet@1 {self.isabet1:.0f}%  "
                f"MRR {self.mrr:.3f}")


def yaz_ve_olc(kok, ayar):
    """Parametreleri kopyaya yaz, değerlendirmeyi koş, puanı çıkar."""
    yol = os.path.join(kok, ".claude", "ara.py")
    with open(yol, encoding="utf-8") as f:
        metin = f.read()
    for ad, desen, _ in UZAY:
        # "Değişiklik olmadı" ile "bulunamadı" AYNI ŞEY DEĞİL: değer zaten
        # aynıysa da metin değişmez. İlk hâlim ikisini karıştırıyordu ve
        # mevcut ayarı ölçmeye çalışınca "parametre bulunamadı" diyordu.
        if not re.search(desen, metin, re.M):
            raise SystemExit(f"parametre bulunamadı: {ad} — ara.py değişmiş olabilir")
        deger = ayar[ad]
        metin = re.sub(desen,
                       lambda e, d=deger: e.group(0).replace(e.group(1), str(d)),
                       metin, count=1, flags=re.M)
    with open(yol, "w", encoding="utf-8") as f:
        f.write(metin)

    # ÖNBELLEĞİ GEÇERSİZ KIL. Bu satır olmadan tırmanış hiçbir şey ölçmez:
    # yazılan yeni değer dosyada durur, Python eski `.pyc`'yi yükler ve her
    # komşu "eşit" çıkar. Tırmanıcı bunu gerçek bir plato sanar — ölçmediğini
    # ölçtüğünü sanmak, bu sistemde en pahalı hata sınıfı. Nitekim oldu ve
    # sınav yakaladı ("tırmanma: yazma gerçekten etkiliyor").
    shutil.rmtree(os.path.join(kok, ".claude", "__pycache__"), ignore_errors=True)
    ortam = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    s = subprocess.run([sys.executable, os.path.join(kok, ".claude", "degerlendir.py")],
                       cwd=kok, capture_output=True, text=True, timeout=120,
                       env=ortam)

    def cek(etiket, varsayilan=0.0):
        e = re.search(rf"{etiket}\s+([\d.]+)", s.stdout)
        return float(e.group(1)) if e else varsayilan

    return Puan(cek("isabet@3"), cek("isabet@1"), cek("MRR"),
                cek("gerçek kapsama"), cek("konu dışı doğru"), cek("sahte delil yok"))


def mevcut_ayar():
    yol = os.path.join(KLASOR, "ara.py")
    metin = open(yol, encoding="utf-8").read()
    ayar = {}
    for ad, desen, _ in UZAY:
        e = re.search(desen, metin, re.M)
        if not e:
            raise SystemExit(f"parametre okunamadı: {ad}")
        ayar[ad] = float(e.group(1)) if "." in e.group(1) else int(e.group(1))
    return ayar


def komsulari_uret(ayar, capraz=False):
    """Eksen komşuları: her parametrede bir kademe ileri/geri.

    `capraz` açıkken iki parametre birden oynatılır — sırt tuzağı için.
    Sırt, iyileşmenin çapraz yönde olduğu ve eksen adımlarının ıskaladığı
    durumdur; tek eksen bakan bir tırmanıcı orada takılı kalır.
    """
    tekil = []
    for ad, _, degerler in UZAY:
        i = degerler.index(ayar[ad]) if ayar[ad] in degerler else None
        if i is None:
            continue
        for j in (i - 1, i + 1):
            if 0 <= j < len(degerler):
                yeni = dict(ayar)
                yeni[ad] = degerler[j]
                tekil.append(yeni)
    if not capraz:
        return tekil
    ciftli = []
    for a in tekil:
        for b in tekil:
            fark_a = [k for k in a if a[k] != ayar[k]]
            fark_b = [k for k in b if b[k] != ayar[k]]
            if fark_a and fark_b and fark_a[0] < fark_b[0]:
                yeni = dict(ayar)
                yeni[fark_a[0]] = a[fark_a[0]]
                yeni[fark_b[0]] = b[fark_b[0]]
                ciftli.append(yeni)
    return ciftli


class Tirmanici:
    def __init__(self, sessiz=False):
        self.gecici = tempfile.mkdtemp()
        self.kok = os.path.join(self.gecici, "depo")
        shutil.copytree(KOK, self.kok)
        # Bayat `.pyc` tehlikesi burada teorik değil: `KOK_UZUNLUK = 5` →
        # `= 3` yazımı dosya BOYUTUNU değiştirmez ve Python'un önbellek
        # doğrulaması kaynak mtime'ını saniye çözünürlüğünde tutar. Aynı
        # saniye içinde aynı boyutta bir değişiklik, eski derlemenin
        # yüklenmesine yol açabilir — ve bu sessizce sahte bir plato üretir:
        # bütün komşular "eşit" çıkar, çünkü hiçbiri gerçekten koşmamıştır.
        shutil.rmtree(os.path.join(self.kok, ".claude", "__pycache__"),
                      ignore_errors=True)
        self.bellek = {}
        self.sayac = 0
        self.sessiz = sessiz

    def temizle(self):
        shutil.rmtree(self.gecici, ignore_errors=True)

    def olc(self, ayar):
        anahtar = tuple(sorted(ayar.items()))
        if anahtar not in self.bellek:
            self.bellek[anahtar] = yaz_ve_olc(self.kok, ayar)
            self.sayac += 1
        return self.bellek[anahtar]

    def tirman(self, baslangic, en_fazla=40):
        """Tek bir tırmanış. Plato ve sırt burada tespit edilir."""
        ayar, puan = dict(baslangic), self.olc(baslangic)
        plato = False
        for _ in range(en_fazla):
            komsular = komsulari_uret(ayar)
            if not komsular:
                break
            puanlar = [(self.olc(k), k) for k in komsular]
            en_iyi, en_iyi_ayar = max(puanlar, key=lambda x: x[0].deger)

            if en_iyi.deger > puan.deger + PLATO_EPSILON:
                ayar, puan = en_iyi_ayar, en_iyi
                continue

            # Eksen adımları tıkandı. Sırt olabilir: çapraz dene.
            capraz = komsulari_uret(ayar, capraz=True)
            if capraz:
                cp = [(self.olc(k), k) for k in capraz]
                c_iyi, c_ayar = max(cp, key=lambda x: x[0].deger)
                if c_iyi.deger > puan.deger + PLATO_EPSILON:
                    if not self.sessiz:
                        print("    sırt aşıldı: çapraz adım eksen adımlarından iyi")
                    ayar, puan = c_ayar, c_iyi
                    continue

            # Bütün komşular eşitse yön yok — plato.
            gecerli = [p.deger for p, _ in puanlar if p.deger >= 0]
            if gecerli and max(gecerli) - min(gecerli) < PLATO_EPSILON:
                plato = True
            break
        return ayar, puan, plato

    def yalitik_mi(self, ayar, puan):
        """Tepe gerçek mi ezber mi.

        Gerçek bir tepenin etrafı yavaş alçalır. Tek hücrelik tepenin
        etrafı uçurumdur: o sayı bir şeyi çözmüyor, sete uyuyor.
        """
        komsular = komsulari_uret(ayar)
        gecerli = [self.olc(k).deger for k in komsular]
        gecerli = [d for d in gecerli if d >= 0]
        if not gecerli:
            return True, 1.0
        dusus = puan.deger - (sum(gecerli) / len(gecerli))
        return dusus > YALITIK_DUSUS, dusus


def tirman_komut(a):
    random.seed(a.tohum)
    t = Tirmanici(sessiz=a.sessiz)
    try:
        mevcut = mevcut_ayar()
        mevcut_puan = t.olc(mevcut)
        print(f"MEVCUT AYAR  {mevcut}")
        print(f"             {mevcut_puan}\n")

        baslangiclar = [mevcut]
        for _ in range(a.sicrama):
            baslangiclar.append({ad: random.choice(degerler)
                                 for ad, _, degerler in UZAY})

        tepeler = []
        for i, bas in enumerate(baslangiclar):
            etiket = "mevcut ayardan" if i == 0 else f"rastgele sıçrama {i}"
            ayar, puan, plato = t.tirman(bas)
            yalitik, dusus = t.yalitik_mi(ayar, puan)
            tepeler.append((puan, ayar, plato, yalitik, dusus))
            if not a.sessiz:
                bayrak = []
                if plato:
                    bayrak.append("PLATO")
                if yalitik:
                    bayrak.append("YALITIK")
                print(f"  {etiket:22} → {puan}   "
                      f"komşu düşüşü {dusus:+.3f}  {' '.join(bayrak)}")

        print(f"\n{t.sayac} ayrı ayar ölçüldü.\n")

        en_iyi = max(tepeler, key=lambda x: x[0].deger)
        puan, ayar, plato, yalitik, dusus = en_iyi

        if ayar == mevcut:
            print("SONUÇ — mevcut ayar zaten tepede. Dokunma.")
            return 0

        if puan.deger <= mevcut_puan.deger + PLATO_EPSILON:
            print("SONUÇ — hiçbir komşu mevcut ayardan iyi değil. Dokunma.")
            return 0

        print(f"En iyi tepe: {ayar}")
        print(f"             {puan}")
        print(f"             mevcut ayara göre {puan.deger - mevcut_puan.deger:+.4f}")

        if yalitik:
            print(f"\nREDDEDİLDİ — tepe yalıtık (komşu düşüşü {dusus:.3f} > "
                  f"{YALITIK_DUSUS}).")
            print("Gerçek bir tepenin etrafı yavaş alçalır; bunun etrafı uçurum. "
                  "Bu sayı bir şeyi çözmüyor, 20 soruluk sete uyuyor — 21.'de "
                  "çöker. Ölçüm seti büyümeden bu ayar kabul edilmemeli.")
            return 1

        farkli = {k: (mevcut[k], ayar[k]) for k in ayar if ayar[k] != mevcut[k]}
        print(f"\nADAY — değişecek parametreler: {farkli}")
        print("Tepe yalıtık değil, yani iyileşme komşulukta da sürüyor.")
        print("Yine de otomatik uygulanmıyor: bu ayar 20 soruluk bir sete göre "
              "ölçüldü. Uygulamadan önce altın seti büyütmek doğrusu.")
        return 1
    finally:
        t.temizle()


def komsular_komut(a):
    """Mevcut ayarın komşuluğu — tepe manzarası."""
    t = Tirmanici()
    try:
        mevcut = mevcut_ayar()
        temel = t.olc(mevcut)
        print(f"MEVCUT  {temel}   ({mevcut})\n")
        satirlar = []
        for k in komsulari_uret(mevcut):
            p = t.olc(k)
            fark = [(ad, mevcut[ad], k[ad]) for ad in k if k[ad] != mevcut[ad]][0]
            satirlar.append((p.deger - temel.deger, fark, p))
        for d, (ad, eski, yeni), p in sorted(satirlar, reverse=True):
            print(f"  {d:+.4f}   {ad:18} {eski} → {yeni:<6}  {p}")
        gecerli = [d for d, _, p in satirlar if p.gecerli]
        if gecerli and max(gecerli) - min(gecerli) < PLATO_EPSILON:
            print("\nPLATO — bütün komşular eşit. Tırmanıcı burada yön bulamaz.")
        return 0
    finally:
        t.temizle()


def main(argv):
    a = argparse.ArgumentParser(description="Tepe tırmanma döngüsü.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("tirman", help="tırmanış + rastgele sıçrama")
    p.add_argument("--sicrama", type=int, default=4, help="rastgele başlangıç sayısı")
    p.add_argument("--tohum", type=int, default=1, help="tekrarlanabilirlik için")
    p.add_argument("--sessiz", action="store_true")
    p.set_defaults(islev=tirman_komut)

    p = alt.add_parser("komsular", help="mevcut ayarın komşuluğunu göster")
    p.set_defaults(islev=komsular_komut)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
