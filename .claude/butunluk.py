#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Bütünlük sınavı (74 vaka)
===============================================================
Üçüncü sınav. Diğer ikisiyle **kasten örtüşmüyor:**

    sinav.py         denetleyiciyi ölçer      — fay enjeksiyonu, 28 vaka
    arac-sinavi.py   araçları ölçer           — devre, yargıç, görev, 55 vaka
    butunluk.py      İÇERİĞİ ölçer            — canon ↔ veri ↔ site, 74 vaka

Neden ayrı bir sınav: `CLAUDE.md` bu boşluğu zaten yazıyor — *"Denetleyici
kural ihlalini yakalar ama canon'un anlamca tutarlı olduğunu göremez"* ve
*"`lore` denetimi adların iki dosyada da geçtiğini görür, aynı şeyi
söylediklerini göremez."* Bu sınav tam olarak o kör noktaya bakıyor.

Fark şurada: `dogrula.py` **kuralları** denetler (odak halkası duruyor mu,
betikler `defer` mi). Bu sınav **gerçekleri** denetler (81 ilin plakası
eksiksiz mi, `data.js`'teki her karakter canon'da var mı, aynı derebeyi iki
ile atanmış mı). İkisi farklı hata sınıfları: biri "kural bozuldu", diğeri
"veri kendi kendisiyle çelişiyor". İkincisi gözle asla bulunmaz — 81 satırı
kimse tek tek karşılaştırmaz.

Dış bağımlılığı yok. `data.js` `okuyucu.py` ile okunuyor.

    python3 .claude/butunluk.py
    python3 .claude/butunluk.py --bolum veri

Çıkış kodu: 0 hepsi temiz, 1 en az bir tutarsızlık.
"""

import argparse
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(KOK, ".claude"))
import okuyucu  # noqa: E402

# 81 il, resmî plaka kodlarıyla. Bu liste kurgu değil, gerçek — derebeyi
# tablosundaki bir yazım hatası ancak buna karşı ölçülünce görünür.
PLAKALAR = {
    1: "Adana", 2: "Adıyaman", 3: "Afyonkarahisar", 4: "Ağrı", 5: "Amasya",
    6: "Ankara", 7: "Antalya", 8: "Artvin", 9: "Aydın", 10: "Balıkesir",
    11: "Bilecik", 12: "Bingöl", 13: "Bitlis", 14: "Bolu", 15: "Burdur",
    16: "Bursa", 17: "Çanakkale", 18: "Çankırı", 19: "Çorum", 20: "Denizli",
    21: "Diyarbakır", 22: "Edirne", 23: "Elazığ", 24: "Erzincan", 25: "Erzurum",
    26: "Eskişehir", 27: "Gaziantep", 28: "Giresun", 29: "Gümüşhane",
    30: "Hakkari", 31: "Hatay", 32: "Isparta", 33: "Mersin", 34: "İstanbul",
    35: "İzmir", 36: "Kars", 37: "Kastamonu", 38: "Kayseri", 39: "Kırklareli",
    40: "Kırşehir", 41: "Kocaeli", 42: "Konya", 43: "Kütahya", 44: "Malatya",
    45: "Manisa", 46: "Kahramanmaraş", 47: "Mardin", 48: "Muğla", 49: "Muş",
    50: "Nevşehir", 51: "Niğde", 52: "Ordu", 53: "Rize", 54: "Sakarya",
    55: "Samsun", 56: "Siirt", 57: "Sinop", 58: "Sivas", 59: "Tekirdağ",
    60: "Tokat", 61: "Trabzon", 62: "Tunceli", 63: "Şanlıurfa", 64: "Uşak",
    65: "Van", 66: "Yozgat", 67: "Zonguldak", 68: "Aksaray", 69: "Bayburt",
    70: "Karaman", 71: "Kırıkkale", 72: "Batman", 73: "Şırnak", 74: "Bartın",
    75: "Ardahan", 76: "Iğdır", 77: "Yalova", 78: "Karabük", 79: "Kilis",
    80: "Osmaniye", 81: "Düzce",
}


# ------------------------------------------------------------------ kaynaklar

class Kaynak:
    """Dosyalar bir kez okunur; 74 vaka aynı metni tekrar tekrar açmasın."""

    def __init__(self):
        self.data_metin = self._oku("assets/js/data.js")
        self.app = self._oku("assets/js/app.js")
        self.css = self._oku("assets/css/style.css")
        self.lore = self._oku("LORE.md")
        self.lore_satir = self.lore.splitlines()
        self.harita = self._oku("sitemap.xml")
        self.html = {}
        for ad in sorted(os.listdir(KOK)):
            if ad.endswith(".html"):
                self.html[ad] = self._oku(ad)
        self.d = {}
        for ad in okuyucu.sabit_adlari(self.data_metin):
            self.d[ad] = okuyucu.sabit(self.data_metin, ad)

    def _oku(self, yol):
        with open(os.path.join(KOK, yol), encoding="utf-8") as f:
            return f.read()

    @property
    def iller(self):
        return self.d["IL_DEREBEYLERI"]

    @property
    def sayfalar(self):
        """404 dışındaki gezilebilir sayfalar."""
        return {a: m for a, m in self.html.items() if a != "404.html"}


K = None  # ilk çalıştırmada dolar


def lore_gecer(ad):
    return ad.lower() in K.lore.lower()


# =========================================================== A. il derebeyleri

def a01_seksen_bir_kayit():
    n = len(K.iller)
    return None if n == 81 else f"81 il beklenirken {n} kayıt var"


def a02_plakalar_eksiksiz():
    var = {i["plaka"] for i in K.iller}
    eksik = sorted(set(range(1, 82)) - var)
    return None if not eksik else f"eksik plaka: {eksik[:10]}"


def a03_plaka_tekrari_yok():
    gorulen, tekrar = set(), []
    for i in K.iller:
        (tekrar.append(i["plaka"]) if i["plaka"] in gorulen
         else gorulen.add(i["plaka"]))
    return None if not tekrar else f"tekrarlanan plaka: {tekrar}"


def a04_derebeyi_adi_bos_degil():
    bos = [i["plaka"] for i in K.iller if not i.get("ad")]
    return None if not bos else f"adı boş il: {bos}"



def a06_plaka_il_eslesmesi_gercek():
    yanlis = [f"{i['plaka']}={i['il']} (gerçekte {PLAKALAR[i['plaka']]})"
              for i in K.iller
              if i["plaka"] in PLAKALAR and i["il"] != PLAKALAR[i["plaka"]]]
    return None if not yanlis else "plaka-il eşleşmesi yanlış: " + "; ".join(yanlis[:5])


def a07_komutan_alani_gecerli():
    idler = {k["id"] for k in K.d["KOMUTANLAR"]}
    kotu = [f"{i['il']}→{i['komutan']}" for i in K.iller if i["komutan"] not in idler]
    return None if not kotu else f"var olmayan komutana bağlı: {kotu[:5]}"


def a08_her_komutanin_ili_var():
    idler = {k["id"] for k in K.d["KOMUTANLAR"]}
    bagli = {i["komutan"] for i in K.iller}
    bos = sorted(idler - bagli)
    return None if not bos else f"hiç ili olmayan komutan: {bos}"


def a09_derebeyi_adi_tekrarsiz():
    """Aynı mitolojik figür iki ile atanırsa hikayede iki yerde olur."""
    adlar = [i["ad"] for i in K.iller if i.get("ad")]
    tekrar = {a for a in adlar if adlar.count(a) > 1}
    return None if not tekrar else f"aynı derebeyi birden çok ilde: {sorted(tekrar)}"


def a10_kim_aciklamasi_dolu():
    bos = [i["il"] for i in K.iller if not (i.get("kim") or "").strip()]
    return None if not bos else f"açıklaması boş: {bos[:5]}"



def a12_derebeyleri_canonda_gecer():
    """Sitede olup canon'da olmayan isim, canon'un tek doğru olmadığı demektir."""
    yok = [i["ad"] for i in K.iller if i.get("ad") and not lore_gecer(i["ad"])]
    return None if not yok else f"canon'da geçmeyen derebeyi: {yok[:8]}"



def b01_karakter_id_tekrarsiz():
    idler = [k["id"] for k in K.d["KARAKTERLER"]]
    tekrar = {i for i in idler if idler.count(i) > 1}
    return None if not tekrar else f"tekrarlanan karakter id: {sorted(tekrar)}"


def b02_karakter_zorunlu_alanlar():
    eksik = []
    for k in K.d["KARAKTERLER"]:
        for alan in ("ad", "unvan", "ozet", "taraf", "gucEtiketi"):
            if not (k.get(alan) or "").strip():
                eksik.append(f"{k['id']}.{alan}")
    return None if not eksik else f"boş alan: {eksik[:6]}"


def b03_taraf_degerleri_tanimli():
    gecerli = set(K.d["TARAF_ETIKET"])
    kotu = [f"{k['id']}={k['taraf']}" for k in K.d["KARAKTERLER"]
            if k["taraf"] not in gecerli]
    return None if not kotu else f"tanımsız taraf: {kotu}"


def b04_tir_ya_sayi_ya_bos():
    kotu = [k["id"] for k in K.d["KARAKTERLER"]
            if k["tir"] is not None and not isinstance(k["tir"], (int, float))]
    return None if not kotu else f"tır değeri sayı değil: {kotu}"



def b06_en_az_bir_oynanan_karakter():
    if not any(k.get("oynanan") for k in K.d["KARAKTERLER"]):
        return "hiçbir karakter 'oynanan' değil — hikayenin öznesi yok"
    return None


def b07_karakterler_canonda_gecer():
    yok = [k["ad"] for k in K.d["KARAKTERLER"] if not lore_gecer(k["ad"])]
    return None if not yok else f"canon'da geçmeyen karakter: {yok}"


def b08_ozetler_bos_yer_tutucu_degil():
    """"Yakında", "TODO", "..." gibi doldurmalar sahte içeriktir."""
    kalip = re.compile(r"\b(yakında|todo|lorem|placeholder|xxx)\b", re.I)
    kotu = [k["id"] for k in K.d["KARAKTERLER"] if kalip.search(k["ozet"])]
    return None if not kotu else f"yer tutucu metin: {kotu}"



def b10_ayni_id_ayni_ad():
    """Karakter iki listede birden geçiyorsa aynı adı taşımalı."""
    tepe = {m["id"]: m["ad"] for m in K.d["MAFYA_TEPE"]}
    kotu = [f"{k['id']}: {k['ad']} ≠ {tepe[k['id']]}"
            for k in K.d["KARAKTERLER"]
            if k["id"] in tepe and k["ad"] != tepe[k["id"]]]
    return None if not kotu else f"aynı id farklı ad: {kotu}"


def b11_icraat_karakterleri_tanimli():
    adlar = {k["ad"] for k in K.d["KARAKTERLER"]}
    adlar |= {m["ad"] for m in K.d["MAFYA_TEPE"]}
    adlar |= {k["ad"] for k in K.d["KOMUTANLAR"]}
    kotu = [i["karakter"] for i in K.d["ICRAATLER"] if i["karakter"] not in adlar]
    return None if not kotu else f"tanımsız karaktere icraat: {kotu}"


def b12_icraat_listeleri_dolu():
    bos = [i["karakter"] for i in K.d["ICRAATLER"] if not i.get("liste")]
    return None if not bos else f"icraat listesi boş: {bos}"


# ============================================================= C. irade kademe

def c01_kademeler_ardisik():
    n = [k["kademe"] for k in K.d["IRADE_KADEMELERI"]]
    return None if n == list(range(1, len(n) + 1)) else f"kademe sırası bozuk: {n}"


def c02_kademe_alanlari_dolu():
    eksik = [k["kademe"] for k in K.d["IRADE_KADEMELERI"]
             if not (k.get("ad") or "").strip() or not (k.get("etki") or "").strip()]
    return None if not eksik else f"eksik kademe: {eksik}"




def c04_kademe_sayisi_canonla_ayni():
    """Canon'daki tabloyu say — metindeki "Kademe 4" atıflarını değil."""
    e = re.search(r"\|\s*Kademe\s*\|.*?(?=\n\s*\n)", K.lore, re.S)
    if not e:
        return "canon'da irade kademesi tablosu bulunamadı"
    satir = [x for x in e.group(0).splitlines()
             if re.match(r"\|\s*\d+\s*\|", x)]
    if len(satir) != len(K.d["IRADE_KADEMELERI"]):
        return (f"canon tablosunda {len(satir)} kademe var, "
                f"data.js'te {len(K.d['IRADE_KADEMELERI'])} tane")
    return None

def c05_kademe_adlari_canonda_gecer():
    yok = [k["ad"] for k in K.d["IRADE_KADEMELERI"] if not lore_gecer(k["ad"])]
    return None if not yok else f"canon'da geçmeyen kademe adı: {yok}"


def c06_kademe_referanslari_gecerli():
    """Karakter ve komutanların `iradeKademe` değeri var olan kademeyi göstermeli."""
    gecerli = {k["kademe"] for k in K.d["IRADE_KADEMELERI"]}
    kotu = []
    for liste in ("KARAKTERLER", "KOMUTANLAR"):
        for k in K.d[liste]:
            d = k.get("iradeKademe")
            if isinstance(d, (int, float)) and d not in gecerli:
                kotu.append(f"{k['id']}={d}")
    return None if not kotu else f"var olmayan kademeye referans: {kotu}"


# ================================================================= D. komutanlar

def d01_komutan_id_tekrarsiz():
    idler = [k["id"] for k in K.d["KOMUTANLAR"]]
    return None if len(set(idler)) == len(idler) else f"tekrarlanan komutan id: {idler}"


def d02_komutan_tir_sayisal():
    kotu = [k["id"] for k in K.d["KOMUTANLAR"]
            if not isinstance(k.get("tir"), (int, float))]
    return None if not kotu else f"tır değeri sayı değil: {kotu}"


def d03_komutan_zaafi_tanimli():
    """Zaafı olmayan komutan, yenilemeyen komutandır — canon buna karşı."""
    bos = [k["id"] for k in K.d["KOMUTANLAR"] if not (k.get("zaaf") or "").strip()]
    return None if not bos else f"zaafı yazılmamış komutan: {bos}"


def d04_komutan_gucu_tanimli():
    eksik = [f"{k['id']}.{a}" for k in K.d["KOMUTANLAR"]
             for a in ("gucAdi", "gucAciklama", "mitoloji", "kaynak")
             if not (k.get(a) or "").strip()]
    return None if not eksik else f"eksik alan: {eksik}"


def d05_komutanlar_canonda_gecer():
    yok = [k["ad"] for k in K.d["KOMUTANLAR"] if not lore_gecer(k["ad"])]
    return None if not yok else f"canon'da geçmeyen komutan: {yok}"


def d06_bolge_adlari_tekrarsiz():
    b = [k["bolge"] for k in K.d["KOMUTANLAR"]]
    return None if len(set(b)) == len(b) else f"aynı bölgede iki komutan: {b}"


def d07_mafya_tepesi_dolu():
    eksik = [f"{m.get('id')}.{a}" for m in K.d["MAFYA_TEPE"]
             for a in ("id", "ad", "unvan", "not")
             if not (m.get(a) or "").strip()]
    return None if not eksik else f"eksik alan: {eksik}"


def d08_tir_degerleri_canonla_ayni():
    """`data.js`'teki tır sayısı canon'daki tabloda da aynı olmalı."""
    kotu = []
    for k in K.d["KOMUTANLAR"]:
        e = re.search(rf"{re.escape(k['ad'])}[^\n]*?(\d+)\s*tır", K.lore, re.I)
        if e and int(e.group(1)) != k["tir"]:
            kotu.append(f"{k['ad']}: data {k['tir']}, canon {e.group(1)}")
    return None if not kotu else "tır değeri canon'la çelişiyor: " + "; ".join(kotu)



def e01_her_sayfada_lang_tr():
    kotu = [a for a, m in K.html.items() if 'lang="tr"' not in m]
    return None if not kotu else f"lang='tr' yok: {kotu}"


def e02_her_sayfada_charset():
    kotu = [a for a, m in K.html.items()
            if not re.search(r'charset=["\']?utf-8', m, re.I)]
    return None if not kotu else f"charset yok: {kotu}"


def e03_her_sayfada_viewport():
    kotu = [a for a, m in K.html.items() if 'name="viewport"' not in m]
    return None if not kotu else f"viewport yok: {kotu}"



def e04_her_sayfanin_basligi_var():
    kotu = [a for a, m in K.html.items()
            if not re.search(r"<title>\s*\S.*?</title>", m, re.S)]
    return None if not kotu else f"başlığı boş: {kotu}"

def e05_basliklar_benzersiz():
    b = {}
    for a, m in K.html.items():
        e = re.search(r"<title>(.*?)</title>", m, re.S)
        if e:
            b.setdefault(e.group(1).strip(), []).append(a)
    tekrar = {k: v for k, v in b.items() if len(v) > 1}
    return None if not tekrar else f"aynı başlık birden çok sayfada: {tekrar}"



def e06_her_sayfada_aciklama():
    """404 ve gizli sayfa dışarıda: ikisi de arama sonucuna çıkmak istemiyor."""
    kotu = [a for a, m in K.html.items()
            if a not in ("404.html", "gizli.html")
            and 'name="description"' not in m]
    return None if not kotu else f"meta description yok: {kotu}"

def e07_tek_h1():
    kotu = [a for a, m in K.html.items() if len(re.findall(r"<h1[\s>]", m)) != 1]
    return None if not kotu else f"h1 sayısı 1 değil: {kotu}"


def e08_baslik_hiyerarsisi_atlamiyor():
    kotu = []
    for a, m in K.html.items():
        d = [int(x) for x in re.findall(r"<h([1-6])[\s>]", m)]
        for onceki, simdi in zip(d, d[1:]):
            if simdi > onceki + 1:
                kotu.append(f"{a}: h{onceki}→h{simdi}")
                break
    return None if not kotu else f"başlık seviyesi atlanmış: {kotu}"


def e09_id_tekrari_yok():
    kotu = []
    for a, m in K.html.items():
        idler = re.findall(r'\sid="([^"]+)"', m)
        tekrar = {i for i in idler if idler.count(i) > 1}
        if tekrar:
            kotu.append(f"{a}: {sorted(tekrar)}")
    return None if not kotu else f"aynı id iki kez: {kotu}"


def e10_ic_baglantilar_var():
    kotu = []
    for a, m in K.html.items():
        for hedef in re.findall(r'href="(?!https?:|mailto:|#)([^"]+)"', m):
            yol = hedef.split("#")[0].split("?")[0]
            if yol and not os.path.exists(os.path.join(KOK, yol)):
                kotu.append(f"{a} → {yol}")
    return None if not kotu else f"kırık iç bağlantı: {kotu[:6]}"


def e11_menu_her_sayfada_ayni():
    menuler = {}
    for a, m in K.sayfalar.items():
        e = re.search(r"<nav.*?</nav>", m, re.S)
        if not e:
            return f"{a} içinde <nav> yok"
        menuler[a] = tuple(re.findall(r'href="([^"]+)"', e.group(0)))
    farkli = {a: v for a, v in menuler.items() if v != next(iter(menuler.values()))}
    return None if not farkli else f"menü sayfadan sayfaya değişiyor: {list(farkli)}"



def e13_haritadaki_adresler_gercek():
    kotu = []
    for u in re.findall(r"<loc>(.*?)</loc>", K.harita):
        yol = u.rstrip("/").split("/")[-1]
        if yol and "." in yol and not os.path.exists(os.path.join(KOK, yol)):
            kotu.append(yol)
    return None if not kotu else f"site haritası olmayan dosyaya işaret ediyor: {kotu}"



def e14_her_sayfa_haritada():
    """`gizli.html` bilinçli olarak haritada değil — bulunması gereken sayfa."""
    kotu = [a for a in K.sayfalar
            if a != "gizli.html" and a not in K.harita
            and not (a == "index.html" and "<loc>" in K.harita)]
    return None if not kotu else f"site haritasında olmayan sayfa: {kotu}"

def f01_kullanilan_degiskenler_tanimli():
    tanimli = set(re.findall(r"(--[\w-]+)\s*:", K.css))
    kullanilan = set(re.findall(r"var\((--[\w-]+)", K.css))
    eksik = sorted(kullanilan - tanimli)
    return None if not eksik else f"tanımsız CSS değişkeni: {eksik}"


def f02_tanimli_degiskenler_kullaniliyor():
    tanimli = set(re.findall(r"(--[\w-]+)\s*:", K.css))
    kullanilan = set(re.findall(r"var\((--[\w-]+)", K.css))
    olu = sorted(tanimli - kullanilan)
    return None if not olu else f"hiç kullanılmayan değişken: {olu}"


def f03_html_de_tanimsiz_degisken_yok():
    tanimli = set(re.findall(r"(--[\w-]+)\s*:", K.css))
    eksik = set()
    for m in K.html.values():
        eksik |= set(re.findall(r"var\((--[\w-]+)", m)) - tanimli
    return None if not eksik else f"HTML'de tanımsız değişken: {sorted(eksik)}"



def f04_olculmus_renk_anahtarlari_duruyor():
    """`CLAUDE.md` üç rengin **ölçülerek** belirlendiğini yazıyor.

    İlk hâlim bütün ham renkleri hata saymıştı. Yanlıştı: `eski-kayit` ve
    `kilit` blokları kendi kapalı görsel setleri, ana paletin parçası
    değiller — ve `dogrula.py`'nin `kontrast` başlığı zaten ölçülen değerleri
    denetliyor. Aynı yere iki sınav bakarsa biri gürültü üretir.

    Geriye gerçek risk kalıyor: belgede adı geçen anahtarın sessizce
    silinmesi ya da yeniden adlandırılması. O zaman `CLAUDE.md` var olmayan
    bir şeyi anlatır ve ölçüm kaydı sahipsiz kalır.
    """
    talimat = open(os.path.join(KOK, "CLAUDE.md"), encoding="utf-8").read()
    anilan = set(re.findall(r"`(--[\w-]+)`", talimat))
    tanimli = set(re.findall(r"(--[\w-]+)\s*:", K.css))
    yok = sorted(anilan - tanimli)
    return None if not yok else (f"CLAUDE.md ölçüldüğünü söylüyor ama CSS'te "
                                 f"yok: {yok}")


def g01_data_dom_a_dokunmuyor():
    """`data.js` saf veri olmalı; DOM'a dokunursa veri ile görünüm ayrışmaz."""
    kacak = [s for s in ("document.", "window.", "addEventListener", "querySelector")
             if s in K.data_metin]
    return None if not kacak else f"data.js görünüme karışıyor: {kacak}"



def g02_app_teki_sabitler_tanimli():
    """Yorum ve dizgiler ayıklanır — Türkçe yorumdaki BÜYÜK harfli kelime
    sabit değildir; ayıklamazsan sınav gürültü üretir."""
    kod = re.sub(r"/\*.*?\*/", " ", K.app, flags=re.S)
    kod = re.sub(r"//[^\n]*", " ", kod)
    kod = re.sub(r"`[^`]*`|\"[^\"]*\"|'[^']*'", " ", kod)
    tanimli = set(okuyucu.sabit_adlari(K.data_metin))
    kullanilan = set(re.findall(r"\b([A-Z][A-Z0-9_]{3,})\b", kod))
    bilinen = {"JSON", "URL", "NaN", "Math", "Object", "Array"}
    eksik = sorted(kullanilan - tanimli - bilinen)
    return None if not eksik else f"app.js tanımsız sabit kullanıyor: {eksik}"

def g03_tanimli_sabitler_kullaniliyor():
    tanimli = set(okuyucu.sabit_adlari(K.data_metin))
    metin = K.app + " ".join(K.html.values())
    olu = sorted(a for a in tanimli if a not in metin)
    return None if not olu else f"hiç kullanılmayan veri sabiti: {olu}"


def g04_console_kalmamis():
    kotu = [a for a, m in (("data.js", K.data_metin), ("app.js", K.app))
            if re.search(r"\bconsole\.(log|debug|info)\b", m)]
    return None if not kotu else f"console çıktısı kalmış: {kotu}"



def g06_isimler_turkce():
    """Kod içi adlar da Türkçe — mevcut düzen bu, İngilizce sızıntı bozar."""
    ingilizce = re.compile(
        r"\bfunction\s+(get|set|render|create|update|handle|init|build)[A-Z]\w*")
    kotu = ingilizce.findall(K.app) + ingilizce.findall(K.data_metin)
    return None if not kotu else f"İngilizce fonksiyon adı: {kotu[:5]}"


# ======================================================= H. canon ↔ veri anlamı

def h01_canon_ana_karakterleri_sitede():
    """Canon'da kalın yazılmış ve birden çok kez geçen isim sitede olmalı."""
    sitede = {k["ad"] for k in K.d["KARAKTERLER"]}
    sitede |= {m["ad"] for m in K.d["MAFYA_TEPE"]}
    sitede |= {k["ad"] for k in K.d["KOMUTANLAR"]}
    sitede |= {i["ad"] for i in K.iller if i.get("ad")}
    yok = []
    for ad in set(re.findall(r"\*\*([A-ZÇĞİÖŞÜ][\w'’ ]{2,30})\*\*", K.lore)):
        ad = ad.strip()
        if K.lore.count(f"**{ad}**") >= 3 and ad not in sitede:
            yok.append(ad)
    return None if not yok else f"canon'da öne çıkıp sitede olmayan: {sorted(yok)[:6]}"


def h02_siralama_yasagi_canonda_yaziyor():
    if "Sitede sıralı güç tablosu YOK" not in K.lore:
        return "canon'daki sıralama yasağı cümlesi kaybolmuş"
    return None


def h03_tir_tablosu_komutanlari_kapsiyor():
    e = re.search(r"##\s*\d*\.?\s*Tır Değerleri.*?(?=\n## |\Z)", K.lore, re.S)
    if not e:
        return "canon'da tır değerleri bölümü yok"
    bolum = e.group(0)
    yok = [k["ad"] for k in K.d["KOMUTANLAR"] if k["ad"] not in bolum]
    return None if not yok else f"tır tablosunda eksik komutan: {yok}"


def h04_video_bos_ve_bolumler_gizli():
    """Sahte içerik yasağı: kimlik yokken bölüm görünür olmamalı."""
    dolu = bool((K.d["VIDEOLAR"].get("oneCikan") or {}).get("kimlik"))
    if dolu:
        return None
    ana = K.html.get("index.html", "")
    for e in re.findall(r"<section\b[^>]*>", ana):
        if "video" in e.lower() and "hidden" not in e:
            return "VIDEOLAR boşken video bölümü gizli değil"
    return None


def h05_uydurma_video_kimligi_yok():
    kimlikler = []
    v = K.d["VIDEOLAR"]
    for k in (v.get("baslangic"), v.get("oneCikan"), *v.get("rota", [])):
        if isinstance(k, dict) and k.get("kimlik"):
            kimlikler.append(k["kimlik"])
    kotu = [k for k in kimlikler if not re.fullmatch(r"[\w-]{11}", k)]
    return None if not kotu else f"biçimi geçersiz video kimliği: {kotu}"


def h06_kanal_adresi_tutarli():
    kanal = K.d["KANAL"]
    kotu = [a for a, m in K.sayfalar.items()
            if "youtube.com" in m and kanal not in m and "youtu.be" not in m]
    return None if not kotu else f"farklı YouTube adresi geçen sayfa: {kotu}"


def h07_site_adresi_haritayla_ayni():
    """Site haritası ile sayfaların `canonical` adresi aynı temeli göstermeli.

    Önceki hâli `data.js`'teki `SITE_ADRESI` sabitini haritayla karşılaştırıyordu.
    O sabit ölü çıktı — yorumu "paylaşım önizlemeleri ve site haritası için"
    diyordu ama ikisi de onu kullanmıyordu; silindi. Sabiti ölçmek zaten
    yanlış hedefti: asıl kırılma noktası haritanın ve `canonical` etiketlerin
    ayrışması, çünkü ikisi de elle yazılıyor.
    """
    e = re.search(r"<loc>(https?://[^<]+?)/?</loc>", K.harita)
    if not e:
        return "site haritasında <loc> adresi yok"
    temel = e.group(1).rsplit("/", 1)[0] if e.group(1).endswith(".html") else e.group(1)
    kotu = []
    for a, m in K.sayfalar.items():
        c = re.search(r'rel="canonical"\s+href="(https?://[^"]+)"', m)
        if c and not c.group(1).startswith(temel):
            kotu.append(f"{a} → {c.group(1)}")
    return None if not kotu else (f"canonical adresi harita temeliyle ({temel}) "
                                  f"uyuşmuyor: {kotu[:3]}")


def h09_acik_uclar_kesin_sunulmuyor():
    """Canon TASLAK diyorsa site de öyle demeli.

    `LORE.md` açıkça yazıyor: *"Aşağıdakiler netleşmeden ilgili yerlerde
    kesin dille yazmayın."* İrade kademeleri o listede. Site tabloyu
    uyarısız basarsa ziyaretçi kesinleşmiş sanır — canon'un tek doğru
    olduğu bir arşivde bu, arşivi yanlış yapar.
    """
    if "DURUM: TASLAK" not in K.lore:
        return None
    sayfa = K.html.get("irade.html", "")
    if not sayfa:
        return None
    if not re.search(r"taslak|öneri|kesinleş|netleş|değişebilir", sayfa, re.I):
        return ("canon irade kademelerini TASLAK sayıyor, irade.html "
                "hiçbir uyarı taşımıyor — kesinleşmiş gibi duruyor")
    return None

def i01_form_yok():
    kotu = [a for a, m in K.html.items() if re.search(r"<form\b", m, re.I)]
    return None if not kotu else f"form var — kullanıcı verisi toplanıyor: {kotu}"


def i02_giris_alani_yok():
    kotu = [a for a, m in K.html.items()
            if re.search(r"<(input|textarea|select)\b", m, re.I)]
    return None if not kotu else f"giriş alanı var: {kotu}"


def i03_cerez_kullanilmiyor():
    kotu = [a for a, m in (("app.js", K.app), ("data.js", K.data_metin))
            if "document.cookie" in m]
    return None if not kotu else f"çerez kullanımı: {kotu}"



def i04_depolama_korumali():
    """Depolama yasak değil; **korumasız** kullanımı yasak.

    Site tercih saklamak için `localStorage` kullanıyor ve bu veri cihazdan
    çıkmıyor — sözleşme "kullanıcı verisi toplanmıyor" diyor, "hiç durum
    tutulmuyor" demiyor. Asıl risk başka: gizli sekmede `localStorage`
    erişimi istisna fırlatır ve sarmalanmamış tek çağrı sayfayı öldürür.
    """
    satirlar = [(i + 1, x) for i, x in enumerate(K.app.splitlines())
                if re.search(r"\b(localStorage|sessionStorage)\b", x)]
    korumasiz = [n for n, x in satirlar if "try" not in x]
    if korumasiz:
        return f"korumasız depolama erişimi — app.js satır {korumasiz}"
    kacak = [a for a, m in K.html.items() if "localStorage" in m]
    return None if not kacak else f"HTML içinde doğrudan depolama: {kacak}"

def i05_ag_istegi_yok():
    metin = K.app + K.data_metin
    kotu = [s for s in ("fetch(", "XMLHttpRequest", "WebSocket", "navigator.sendBeacon")
            if s in metin]
    return None if not kotu else f"ağ isteği kodu: {kotu}"



def i06_dis_kaynak_yok():
    """Dışarıdan YÜKLENEN kaynak yok. `canonical` bir yükleme değil, adres
    bildirimidir — onu saymak sınavı gürültüye boğar."""
    kotu = []
    for a, m in K.html.items():
        for etiket in re.findall(r"<(?:script|img)\b[^>]*>", m):
            e = re.search(r'src="(https?://[^"]+)"', etiket)
            if e:
                kotu.append(f"{a} → {e.group(1)}")
        for etiket in re.findall(r"<link\b[^>]*>", m):
            if re.search(r'rel="(canonical|alternate)"', etiket):
                continue
            e = re.search(r'href="(https?://[^"]+)"', etiket)
            if e:
                kotu.append(f"{a} → {e.group(1)}")
    return None if not kotu else f"dış kaynak yükleniyor: {kotu[:4]}"

def i07_izleme_kodu_yok():
    metin = K.app + K.data_metin + " ".join(K.html.values())
    kotu = [s for s in ("gtag", "analytics", "googletagmanager", "facebook.net",
                        "hotjar", "mixpanel") if s.lower() in metin.lower()]
    return None if not kotu else f"izleme kodu izi: {kotu}"


def i08_yayina_giden_yerde_echo_yok():
    """`.claude/` yayına çıkmıyor — hiçbir sayfa oraya işaret etmemeli."""
    kotu = [a for a, m in K.html.items() if ".claude/" in m]
    kotu += [a for a, m in (("app.js", K.app), ("style.css", K.css))
             if ".claude/" in m]
    return None if not kotu else f"yayındaki dosya .claude'a işaret ediyor: {kotu}"


def i09_arayuz_metni_turkce():
    """Menü ve düğmelerde İngilizce sızıntısı."""
    ingilizce = re.compile(r">\s*(Home|About|Contact|Read more|Search|Menu)\s*<", re.I)
    kotu = [a for a, m in K.html.items() if ingilizce.search(m)]
    return None if not kotu else f"İngilizce arayüz metni: {kotu}"


def i10_soru_cevap_youtube_ya_yonlendiriyor():
    m = K.html.get("soru-cevap.html", "")
    if m and "youtube.com" not in m and "youtu.be" not in m:
        return "soru-cevap sayfası YouTube'a yönlendirmiyor — soru nereye sorulacak"
    return None


def h11_sitede_canon_disi_siralama_yok():
    """Site, canon'un yapmadığı bir sıralama iddiası kuramaz.

    `LORE.md:344` sebebini de yazıyor: *"Sıralı tablo 'en üstteki yenilmez'
    sözü verir; video ile çakışınca site yalancı çıkar."*

    İlk hâlim bütün "en güçlü / en tehlikeli" kalıplarını hata saymıştı ve
    canon'un KENDİ cümlesini de yakaladı — `orta.not` içindeki "üçü arasında
    iradesi en zayıf olan da o" `LORE.md:210`'da birebir yazıyor. Yasak
    sıralama sözcüğü değil, **canon'da karşılığı olmayan** sıralama. Ölçüt
    bu yüzden dayanak: iddia canon'da geçmiyorsa hatadır.
    """
    kalip = re.compile(r"en (güçlü|tehlikeli|zayıf|kuvvetli)(\s+\w+)?", re.I)
    kanon = K.lore.lower()
    kotu = []
    for liste, alanlar in (("KARAKTERLER", ("ozet", "detay")),
                           ("KOMUTANLAR", ("gucAciklama", "kaynak", "zaaf", "not")),
                           ("MAFYA_TEPE", ("not",))):
        for k in K.d[liste]:
            for alan in alanlar:
                metin = k.get(alan)
                if not isinstance(metin, str):
                    continue
                for e in kalip.finditer(metin):
                    if e.group(0).lower() not in kanon:
                        kotu.append(f"{k['id']}.{alan}: \"{e.group(0)}\"")
    return None if not kotu else ("canon'da dayanağı olmayan sıralama iddiası: "
                                  + "; ".join(kotu[:4]))


VAKALAR = [
    ("veri", "il: 81 kayıt var", a01_seksen_bir_kayit),
    ("veri", "il: plakalar eksiksiz", a02_plakalar_eksiksiz),
    ("veri", "il: plaka tekrarı yok", a03_plaka_tekrari_yok),
    ("veri", "il: derebeyi adı boş değil", a04_derebeyi_adi_bos_degil),
    ("veri", "il: plaka-il eşleşmesi gerçek", a06_plaka_il_eslesmesi_gercek),
    ("veri", "il: komutan alanı geçerli", a07_komutan_alani_gecerli),
    ("veri", "il: her komutanın ili var", a08_her_komutanin_ili_var),
    ("veri", "il: derebeyi adı tekrarsız", a09_derebeyi_adi_tekrarsiz),
    ("veri", "il: açıklama dolu", a10_kim_aciklamasi_dolu),
    ("veri", "il: derebeyleri canon'da geçiyor", a12_derebeyleri_canonda_gecer),

    ("veri", "karakter: id tekrarsız", b01_karakter_id_tekrarsiz),
    ("veri", "karakter: zorunlu alanlar dolu", b02_karakter_zorunlu_alanlar),
    ("veri", "karakter: taraf değerleri tanımlı", b03_taraf_degerleri_tanimli),
    ("veri", "karakter: tır ya sayı ya boş", b04_tir_ya_sayi_ya_bos),
    ("veri", "karakter: en az bir oynanan var", b06_en_az_bir_oynanan_karakter),
    ("veri", "karakter: canon'da geçiyor", b07_karakterler_canonda_gecer),
    ("veri", "karakter: yer tutucu metin yok", b08_ozetler_bos_yer_tutucu_degil),
    ("veri", "karakter: aynı id aynı ad", b10_ayni_id_ayni_ad),
    ("veri", "icraat: karakterleri tanımlı", b11_icraat_karakterleri_tanimli),
    ("veri", "icraat: listeleri dolu", b12_icraat_listeleri_dolu),

    ("veri", "irade: kademeler ardışık", c01_kademeler_ardisik),
    ("veri", "irade: alanlar dolu", c02_kademe_alanlari_dolu),
    ("veri", "irade: sayı canon'la aynı", c04_kademe_sayisi_canonla_ayni),
    ("veri", "irade: adlar canon'da geçiyor", c05_kademe_adlari_canonda_gecer),
    ("veri", "irade: referanslar geçerli", c06_kademe_referanslari_gecerli),

    ("veri", "komutan: id tekrarsız", d01_komutan_id_tekrarsiz),
    ("veri", "komutan: tır sayısal", d02_komutan_tir_sayisal),
    ("veri", "komutan: zaafı tanımlı", d03_komutan_zaafi_tanimli),
    ("veri", "komutan: güç alanları dolu", d04_komutan_gucu_tanimli),
    ("veri", "komutan: canon'da geçiyor", d05_komutanlar_canonda_gecer),
    ("veri", "komutan: bölgeler tekrarsız", d06_bolge_adlari_tekrarsiz),
    ("veri", "mafya: tepe kayıtları dolu", d07_mafya_tepesi_dolu),
    ("veri", "komutan: tır canon'la aynı", d08_tir_degerleri_canonla_ayni),

    ("site", "html: lang='tr'", e01_her_sayfada_lang_tr),
    ("site", "html: charset utf-8", e02_her_sayfada_charset),
    ("site", "html: viewport", e03_her_sayfada_viewport),
    ("site", "html: başlık dolu", e04_her_sayfanin_basligi_var),
    ("site", "html: başlıklar benzersiz", e05_basliklar_benzersiz),
    ("site", "html: meta description", e06_her_sayfada_aciklama),
    ("site", "html: tek h1", e07_tek_h1),
    ("site", "html: başlık hiyerarşisi", e08_baslik_hiyerarsisi_atlamiyor),
    ("site", "html: id tekrarı yok", e09_id_tekrari_yok),
    ("site", "html: iç bağlantılar var", e10_ic_baglantilar_var),
    ("site", "html: menü her sayfada aynı", e11_menu_her_sayfada_ayni),
    ("site", "harita: adresler gerçek", e13_haritadaki_adresler_gercek),
    ("site", "harita: her sayfa var", e14_her_sayfa_haritada),

    ("bicim", "css: kullanılan değişken tanımlı", f01_kullanilan_degiskenler_tanimli),
    ("bicim", "css: ölü değişken yok", f02_tanimli_degiskenler_kullaniliyor),
    ("bicim", "css: html'de tanımsız değişken yok", f03_html_de_tanimsiz_degisken_yok),
    ("bicim", "css: ölçülen anahtarlar duruyor", f04_olculmus_renk_anahtarlari_duruyor),

    ("bicim", "js: data DOM'a dokunmuyor", g01_data_dom_a_dokunmuyor),
    ("bicim", "js: app'teki sabitler tanımlı", g02_app_teki_sabitler_tanimli),
    ("bicim", "js: ölü veri sabiti yok", g03_tanimli_sabitler_kullaniliyor),
    ("bicim", "js: console kalmamış", g04_console_kalmamis),
    ("bicim", "js: adlar Türkçe", g06_isimler_turkce),

    ("canon", "canon: ana karakterler sitede", h01_canon_ana_karakterleri_sitede),
    ("canon", "canon: sıralama yasağı duruyor", h02_siralama_yasagi_canonda_yaziyor),
    ("canon", "canon: tır tablosu kapsıyor", h03_tir_tablosu_komutanlari_kapsiyor),
    ("canon", "canon: video boşken bölüm gizli", h04_video_bos_ve_bolumler_gizli),
    ("canon", "canon: uydurma video kimliği yok", h05_uydurma_video_kimligi_yok),
    ("canon", "canon: kanal adresi tutarlı", h06_kanal_adresi_tutarli),
    ("canon", "canon: site adresi haritayla aynı", h07_site_adresi_haritayla_ayni),
    ("canon", "canon: taslak kesin sunulmuyor", h09_acik_uclar_kesin_sunulmuyor),

    ("canon", "canon: dış sıralama iddiası yok", h11_sitede_canon_disi_siralama_yok),

    ("sade", "sadelik: form yok", i01_form_yok),
    ("sade", "sadelik: giriş alanı yok", i02_giris_alani_yok),
    ("sade", "sadelik: çerez yok", i03_cerez_kullanilmiyor),
    ("sade", "sadelik: depolama korumalı", i04_depolama_korumali),
    ("sade", "sadelik: ağ isteği yok", i05_ag_istegi_yok),
    ("sade", "sadelik: dış kaynak yok", i06_dis_kaynak_yok),
    ("sade", "sadelik: izleme kodu yok", i07_izleme_kodu_yok),
    ("sade", "sadelik: yayın .claude'a bakmıyor", i08_yayina_giden_yerde_echo_yok),
    ("sade", "sadelik: arayüz Türkçe", i09_arayuz_metni_turkce),
    ("sade", "sadelik: soru-cevap yönlendiriyor", i10_soru_cevap_youtube_ya_yonlendiriyor),
]


def main(argv):
    global K
    a = argparse.ArgumentParser(description="Canon ↔ veri ↔ site bütünlük sınavı.")
    a.add_argument("--bolum", choices=("veri", "site", "bicim", "canon", "sade"),
                   help="sadece bir bölümü çalıştır")
    a.add_argument("--sessiz", action="store_true", help="sadece bulguları yaz")
    secim = a.parse_args(argv)

    K = Kaynak()
    vakalar = [v for v in VAKALAR if not secim.bolum or v[0] == secim.bolum]

    bulgular = []
    for bolum, ad, islev in vakalar:
        try:
            sonuc = islev()
        except Exception as e:
            sonuc = f"vaka çöktü — {type(e).__name__}: {e}"
        if sonuc:
            bulgular.append((bolum, ad, sonuc))
            print(f"  BULGU  {ad}\n         {sonuc}")
        elif not secim.sessiz:
            print(f"  temiz  {ad}")

    print()
    if bulgular:
        print(f"{len(bulgular)} tutarsızlık, {len(vakalar) - len(bulgular)} temiz "
              f"({len(vakalar)} vaka).")
        return 1
    print(f"BÜTÜN — {len(vakalar)} vakanın hepsi tutarlı.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
