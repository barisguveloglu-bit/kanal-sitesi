#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Canon geri getirme (RAG'in "R"si)
===============================================================
`LORE.md` 437 satır ve büyüyor. Bir soruya cevap vermek için dosyanın
tamamını okumak hem pahalı hem de asıl sorunu çözmüyor: sorun hız değil,
**dayanak.**

Bu betik canon'u parçalara ayırıp soruya en yakın parçaları
**satır numarasıyla** döndürür. Böylece her canon iddiası
`LORE.md:125` gibi kontrol edilebilir bir adrese bağlanır.
Uydurma ile alıntı arasındaki fark budur.

Dışa bağımlılığı yok. Gömme (embedding) yok, vektör veritabanı yok —
437 satırlık Türkçe bir metin için BM25 fazlasıyla yeterli ve
her koşuda aynı sonucu verir (test edilebilir olmasının şartı bu).

    python3 .claude/ara.py "Teşup'un zaafı ne"
    python3 .claude/ara.py --sayi 5 "Konya derebeyi"
    python3 .claude/ara.py --json "güçler nereden geliyor"
"""

import argparse
import json
import math
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

KAYNAKLAR = ("LORE.md", "assets/js/data.js")

# Türkçede çok geçen, ayırt ediciliği olmayan kelimeler.
DURAK = {
    "ve", "ile", "bir", "bu", "şu", "o", "da", "de", "ki", "mi", "mı", "mu",
    "ne", "için", "gibi", "ama", "çok", "daha", "en", "her", "kim", "nedir",
    "nasıl", "neden", "hangi", "kaç", "var", "yok", "olan", "olarak", "ise",
}

# Ön ek uzunluğu: Türkçe sondan eklemeli, "iradesi/iradeye/irade" aynı köke
# inmeli. Tam kök çözümleme yerine ön ek eşleştirmesi kullanılıyor —
# bağımlılıksız, öngörülebilir ve bu metin boyutunda yeterli.
KOK_UZUNLUK = 5

# "dördüncü irade kademesi" ile "| 4 | Güçlü İrade |" aynı şeyi söylüyor ama
# tek ortak harfleri yok. Sayı adlarını rakama indirgemezsek tablo satırları
# yazıyla sorulan sorulara asla cevap veremez.
SAYILAR = {
    "iki": "2", "ikinci": "2", "üç": "3", "üçüncü": "3",
    "dört": "4", "dördüncü": "4", "beş": "5", "beşinci": "5",
    "altı": "6", "altıncı": "6", "yedi": "7", "yedinci": "7",
    "sekiz": "8", "sekizinci": "8", "dokuz": "9", "dokuzuncu": "9",
    "birinci": "1", "ilk": "1",
}


def turkce_kucult(s):
    """Python'un lower()'ı 'İ' harfini bozar; önce elle düzelt."""
    return (s.replace("İ", "i").replace("I", "ı")
             .replace("Ş", "ş").replace("Ğ", "ğ").replace("Ü", "ü")
             .replace("Ö", "ö").replace("Ç", "ç")).lower()


def parcala(metin):
    """Metni köklerine indirgenmiş belirteçlere ayırır."""
    kelimeler = re.findall(r"[0-9a-zçğıöşü]+", turkce_kucult(metin))
    cikti = []
    for k in kelimeler:
        k = SAYILAR.get(k, k)
        if k in DURAK or len(k) < 2 and not k.isdigit():
            continue
        cikti.append(k[:KOK_UZUNLUK])
    return cikti


# ------------------------------------------------------------------ parçalama

class Parca:
    """Bir canon parçası.

    Gövde ile bağlam AYRI tutulur. Sebebi ölçülerek bulundu: tablo satırına
    sütun başlığını gövdeye katıştırınca 8 kelimelik bir satır, başlıktaki
    terim yüzünden koca bir bölümü geçiyordu — BM25 kısa belgeyi ödüllendirir.
    Bağlam artık eşleşmeye katkı veriyor ama uzunluk hesabına girmiyor.
    """

    def __init__(self, kaynak, baslik, ilk, son, metin, baglam="", govde=None):
        self.kaynak = kaynak
        self.baslik = baslik          # bağlam: hangi bölümün altında
        self.ilk = ilk                # 1 tabanlı satır
        self.son = son
        self.metin = metin            # GÖSTERİLEN metin (sütun başlığı dahil)
        # PUANLANAN metin ayrı: tablo satırının başlığı okurken gerekli ama
        # gövdeye sayılırsa 10 kelimelik satır, başlıktaki "Kaldırma" yüzünden
        # asıl cevabı geçer. Gösterilen ile ölçülen aynı şey olmak zorunda değil.
        self.belirtecler = parcala(govde if govde is not None else metin)
        self.baglam_belirtecler = set(parcala(baslik + " " + baglam))

    @property
    def adres(self):
        if self.ilk == self.son:
            return f"{self.kaynak}:{self.ilk}"
        return f"{self.kaynak}:{self.ilk}-{self.son}"


def lore_parcala(yol):
    """LORE.md'yi başlıklara göre böler; tablo satırlarını ayrıca indeksler."""
    satirlar = open(os.path.join(KOK, yol), encoding="utf-8").read().split("\n")
    parcalar = []
    yigin = {}          # seviye -> başlık
    bas, baslik = 0, "(giriş)"

    def kapat(bitis):
        govde = "\n".join(satirlar[bas:bitis]).strip()
        if govde:
            parcalar.append(Parca(yol, baslik, bas + 1, bitis, govde))

    for i, satir in enumerate(satirlar):
        eslesme = re.match(r"^(#{1,6})\s+(.*)$", satir)
        if not eslesme:
            continue
        kapat(i)
        seviye = len(eslesme.group(1))
        yigin[seviye] = eslesme.group(2).strip()
        for derin in list(yigin):
            if derin > seviye:
                del yigin[derin]
        baslik = " › ".join(yigin[k] for k in sorted(yigin))
        bas = i
    kapat(len(satirlar))

    # Tablo satırları kendi başlarına da aranabilir olmalı: "Konya derebeyi"
    # sorusu 27 satırlık tabloyu değil, tek satırı göstermeli.
    baslik_haritasi = {}
    for p in parcalar:
        for n in range(p.ilk, p.son + 1):
            baslik_haritasi[n] = p.baslik

    def ayirici_mi(s):
        return s.startswith("|") and set(s) <= set("|-: ")

    sutunlar = ""       # yürürlükteki tablonun başlık satırı
    for i, satir in enumerate(satirlar, start=1):
        s = satir.strip()
        if not s.startswith("|"):
            sutunlar = ""
            continue
        if ayirici_mi(s):
            # Ayırıcıdan bir önceki satır sütun başlığıdır.
            onceki = satirlar[i - 2].strip() if i >= 2 else ""
            sutunlar = onceki if onceki.startswith("|") else ""
            continue
        if s == sutunlar:
            continue
        hucreler = [h.strip() for h in s.strip("|").split("|")]
        if len(hucreler) < 2 or all(h == "" for h in hucreler):
            continue

        # Veri satırı sütun adlarını içermez: "Zaafı" başlıkta, satırda değil.
        # Başlığı bağlama ekleyerek satırı kendi sütunlarıyla aranabilir yap.
        bolum = baslik_haritasi.get(i, "")
        bag = f"{bolum} › {sutunlar}" if sutunlar else bolum

        # Hücreyi kendi sütun adıyla eşle: "Zaafı: Kapalı ve dar alanda…".
        # Sütun adını düz bağlam olarak eklemek yetmiyordu — "zaafı" kelimesi
        # satırın hiçbir yerinde geçmediği için soru satıra bağlanamıyordu.
        # Eşleştirince sütun adı gövdenin parçası oluyor ve satır gerçek
        # uzunluğuna kavuşuyor; kısalıktan haksız puan almıyor.
        basliklar = ([h.strip() for h in sutunlar.strip("|").split("|")]
                     if sutunlar else [])
        if basliklar and len(basliklar) == len(hucreler):
            govde = " ".join(f"{b}: {h}" for b, h in zip(basliklar, hucreler) if h)
        else:
            govde = s

        parcalar.append(Parca(yol, bag, i, i,
                              metin=(sutunlar + "\n" + s) if sutunlar else s,
                              baglam=bolum, govde=govde))

    return parcalar


def data_parcala(yol):
    """data.js'i girdi nesnelerine böler — canon'un siteye yansımış hâli."""
    ham = open(os.path.join(KOK, yol), encoding="utf-8").read()
    satirlar = ham.split("\n")
    parcalar = []

    sinirlar = [i for i, s in enumerate(satirlar) if re.match(r"\s*(id|plaka):\s", s)]
    for k, bas in enumerate(sinirlar):
        son = sinirlar[k + 1] if k + 1 < len(sinirlar) else min(bas + 40, len(satirlar))
        govde = "\n".join(satirlar[bas:son]).strip()
        ad = re.search(r'ad:\s*"([^"]+)"', govde)
        parcalar.append(Parca(yol, ad.group(1) if ad else "data.js girdisi",
                              bas + 1, son, govde))
    return parcalar


# ------------------------------------------------------------------- BM25

class Dizin:
    K1, B = 1.5, 0.75

    # "Bilmiyorum" diyebilmenin ölçütü. Puana bakmak yerine SÖZ DAĞARINA
    # bakılıyor: sorgudaki kelimelerin kaçı canon'da hiç geçiyor?
    #
    # Puan oranıyla denendi ve bırakıldı: gerçek sorular 0.38'e kadar
    # inerken konu dışı sorular 0.31'e çıkıyordu — iki parmaklık bir aralığa
    # eşik koymak, puanlamada yapılan her değişiklikte sessizce bozulur.
    # Söz dağarı kapsaması aynı sette 0.67'ye karşı 0.33 veriyor: iki kat
    # boşluk ve puanlamadan bağımsız.
    #
    # "kuantum dolanıklık" hiçbir kelimesi canon'da geçmediği için elenir;
    # "Ahriman kimi kilitliyor" hepsi geçtiği için geçer. Konu içinde olup
    # cevabı olmayan sorular da geçer — onları eleme işi aramanın değil,
    # okumanın işi (bkz. degerlendir.py, "cevapsız" sınıfı).
    SOZ_DAGARI_ESIK = 0.50

    # Söz dağarını geçse bile anlamsız derecede zayıf eşleşmeler elenir.
    PUAN_TABANI = 1.0

    def __init__(self, parcalar):
        self.parcalar = parcalar
        self.n = len(parcalar) or 1
        self.ortalama = sum(len(p.belirtecler) for p in parcalar) / self.n
        self.df = {}
        for p in parcalar:
            for t in set(p.belirtecler):
                self.df[t] = self.df.get(t, 0) + 1

    def idf(self, t):
        n_t = self.df.get(t, 0)
        return math.log(1 + (self.n - n_t + 0.5) / (n_t + 0.5))

    # Çok kısa parçaların uzunluk ödülünü sınırlar: 8 kelimelik bir tablo
    # satırı, aynı terimi içeren dolu bir bölümü sırf kısa olduğu için geçmesin.
    TABAN_UZUNLUK = 12

    def puan(self, parca, sorgu):
        toplam = 0.0
        uzunluk = max(len(parca.belirtecler), self.TABAN_UZUNLUK)
        sayimlar = {}
        for t in parca.belirtecler:
            sayimlar[t] = sayimlar.get(t, 0) + 1
        for t in sorgu:
            f = sayimlar.get(t, 0)
            if not f:
                continue
            pay = f * (self.K1 + 1)
            payda = f + self.K1 * (1 - self.B + self.B * uzunluk / self.ortalama)
            toplam += self.idf(t) * pay / payda
        # Başlık ve sütun adı konuyu söyler ama metnin kendisi değildir:
        # eşleşmeye katkı verir, uzunluk normalizasyonuna girmez.
        toplam += 0.5 * sum(self.idf(t)
                            for t in set(sorgu) & parca.baglam_belirtecler)
        return toplam

    def soz_dagari_kapsamasi(self, sorgu):
        """Sorgu kelimelerinin kaçı canon'da hiç geçiyor?"""
        benzersiz = set(sorgu)
        if not benzersiz:
            return 0.0
        return sum(1 for t in benzersiz if self.df.get(t, 0) > 0) / len(benzersiz)

    def ara(self, soru, sayi=3):
        """'Bilmiyorum' bir cevaptır — sorgu canon'un dünyasında değilse boş döner."""
        sorgu = parcala(soru)
        if not sorgu:
            return []
        if self.soz_dagari_kapsamasi(sorgu) < self.SOZ_DAGARI_ESIK:
            return []

        puanli = ((self.puan(p, sorgu), p) for p in self.parcalar)
        bulunan = sorted((x for x in puanli if x[0] >= self.PUAN_TABANI),
                         key=lambda x: (-x[0], x[1].ilk))
        return bulunan[:sayi]


def dizin_kur():
    parcalar = []
    for yol in KAYNAKLAR:
        tam = os.path.join(KOK, yol)
        if not os.path.exists(tam):
            continue
        parcalar += lore_parcala(yol) if yol.endswith(".md") else data_parcala(yol)
    return Dizin(parcalar)


def kisalt(metin, sinir=700):
    metin = metin.strip()
    return metin if len(metin) <= sinir else metin[:sinir].rstrip() + " […]"


def main(argv):
    ayrıştırıcı = argparse.ArgumentParser(
        description="Canon içinde ara, kaynak satırıyla döndür.")
    ayrıştırıcı.add_argument("soru", nargs="+")
    ayrıştırıcı.add_argument("--sayi", type=int, default=3)
    ayrıştırıcı.add_argument("--json", action="store_true")
    ayrıştırıcı.add_argument("--tam", action="store_true",
                             help="parçayı kısaltmadan yaz")
    a = ayrıştırıcı.parse_args(argv)

    soru = " ".join(a.soru)
    sonuc = dizin_kur().ara(soru, a.sayi)

    if not sonuc:
        print(f"Canon'da \"{soru}\" için dayanak bulunamadı.\n"
              "Bu bir cevap vermeme sebebidir — uydurma.")
        return 1

    if a.json:
        print(json.dumps([{"adres": p.adres, "baslik": p.baslik,
                           "puan": round(s, 3), "metin": p.metin}
                          for s, p in sonuc], ensure_ascii=False, indent=2))
        return 0

    for sira, (puan, p) in enumerate(sonuc, 1):
        print(f"\n[{sira}] {p.adres}  ·  {p.baslik}  ·  puan {puan:.2f}")
        print("-" * 68)
        print(p.metin if a.tam else kisalt(p.metin))
    print(f"\n{len(sonuc)} dayanak. Cevabında bu adresleri kaynak göster.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
