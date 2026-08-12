#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Denetleyici
===============================================================
Döngü mimarisinin "Yansıtma (Reflect)" katmanı budur.

Yapay zekanın kendi çıktısını kendi gözüyle beğenmesi bir kontrol
değildir. Bu betik harici kural setidir: CLAUDE.md'de yazılı olan
kararları makine tarafından ölçülebilir hâle getirir.

Dışa bağımlılığı yoktur — sadece Python 3 standart kütüphanesi.
Siteye hiçbir şey eklemez, sadece okur.

    python3 .claude/dogrula.py          # hepsini denetle
    python3 .claude/dogrula.py --kisa   # sadece hataları yaz
    python3 .claude/dogrula.py menu kontrast   # seçili denetimler

Çıkış kodu: 0 = temiz, 1 = kural ihlali, 3 = insan onayı gerekiyor.
"""

import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Menüde ve site haritasında bulunması beklenen sayfalar.
SAYFALAR = [
    "index.html",
    "karakterler.html",
    "irade.html",
    "efsane.html",
    "mafya.html",
    "icraatler.html",
    "soru-cevap.html",
]

# Bilinçli istisnalar — bunlar eksik değil, öyle olmaları gerekiyor.
MENUSUZ = {"404.html"}          # hata sayfasının kendi sade düzeni var
HARITA_DISI = {"404.html", "gizli.html"}  # gizli.html noindex, haritaya girmez

AA_SINIR = 4.5  # WCAG AA — normal boyut metin


# ----------------------------------------------------------------- yardımcılar

class Rapor:
    def __init__(self):
        self.hatalar = []
        self.uyarilar = []
        self.kapilar = []
        self.gecen = 0

    def hata(self, denetim, mesaj):
        self.hatalar.append((denetim, mesaj))

    def uyari(self, denetim, mesaj):
        self.uyarilar.append((denetim, mesaj))

    def kapi(self, denetim, mesaj):
        """İnsan kapısı: kural ihlali değil, ama insanın görmesi gereken şey.

        Denetleyici doğruyu yanlıştan ayıramadığı yerlerde kullanılır —
        biçimi geçerli ama uydurulmuş olabilecek içerik gibi.
        """
        self.kapilar.append((denetim, mesaj))

    def tamam(self):
        self.gecen += 1


def oku(yol):
    with open(os.path.join(KOK, yol), encoding="utf-8") as f:
        return f.read()


def git_goster(yol):
    """Dosyanın HEAD'deki hâli. Git yoksa ya da dosya yeniyse None."""
    import subprocess
    try:
        sonuc = subprocess.run(["git", "show", f"HEAD:{yol}"], cwd=KOK,
                               capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return None
    return sonuc.stdout if sonuc.returncode == 0 else None


def html_dosyalari():
    return sorted(a for a in os.listdir(KOK) if a.endswith(".html"))


def yorumlari_at(css):
    """CSS yorumlarını siler — yorum içindeki örnekler denetimi yanıltmasın."""
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def js_yorumlari_at(js):
    js = re.sub(r"/\*.*?\*/", "", js, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$", "", js)


def blok_al(metin, baslangic):
    """`const AD = [` gibi bir yerden başlayıp parantezi sayarak bloğu keser."""
    i = metin.find(baslangic)
    if i < 0:
        return ""
    i += len(baslangic) - 1
    acik, j = 0, i
    acilis, kapanis = metin[i], {"[": "]", "{": "}"}[metin[i]]
    while j < len(metin):
        if metin[j] == acilis:
            acik += 1
        elif metin[j] == kapanis:
            acik -= 1
            if acik == 0:
                return metin[i:j + 1]
        j += 1
    return metin[i:]


# ------------------------------------------------------------------- kontrast

def hex_rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[k:k + 2], 16) for k in (0, 2, 4))


def isik(kanal):
    o = kanal / 255.0
    return o / 12.92 if o <= 0.04045 else ((o + 0.055) / 1.055) ** 2.4


def bagil_parlaklik(renk):
    r, g, b = (isik(k) for k in hex_rgb(renk))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def kontrast(on, arka):
    a, b = bagil_parlaklik(on), bagil_parlaklik(arka)
    if a < b:
        a, b = b, a
    return (a + 0.05) / (b + 0.05)


def css_degiskenleri(css):
    """:root ve [data-bolge] bloklarındaki --degisken: #renk çiftleri."""
    d = {}
    for ad, deger in re.findall(r"(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;", css):
        d.setdefault(ad, deger)
    return d


def bolge_renkleri(css):
    out = {}
    for bolge, renk in re.findall(
        r'\[data-bolge="([a-z]+)"\]\s*\{\s*--bolge-renk\s*:\s*(#[0-9a-fA-F]{3,6})', css
    ):
        out[bolge] = renk
    return out


# -------------------------------------------------------------------- denetimler

def d_menu(r):
    """Her sayfada elle yazılmış menü duruyor mu, bağlantılar eksiksiz mi."""
    for dosya in html_dosyalari():
        if dosya in MENUSUZ:
            continue
        icerik = oku(dosya)
        nav = re.search(r'<nav class="menu".*?</nav>', icerik, re.S)
        if not nav:
            r.hata("menu", f"{dosya}: <nav class=\"menu\"> yok. "
                            "Menü HTML'de yazılı olmalı (JS üretmiyor).")
            continue
        baglantilar = re.findall(r'href="([^"]+)"', nav.group(0))
        eksik = [s for s in SAYFALAR if s not in baglantilar]
        if eksik:
            r.hata("menu", f"{dosya}: menüde eksik bağlantı → {', '.join(eksik)}")
        else:
            r.tamam()


def d_harita(r):
    """sitemap.xml her yayına açık sayfayı içeriyor mu."""
    harita = oku("sitemap.xml")
    for dosya in html_dosyalari():
        if dosya in HARITA_DISI:
            continue
        aranan = "/" if dosya == "index.html" else dosya
        if aranan not in harita:
            r.hata("harita", f"sitemap.xml: {dosya} listelenmemiş.")
        else:
            r.tamam()
    for dosya in HARITA_DISI:
        if dosya in harita:
            r.hata("harita", f"sitemap.xml: {dosya} listelenmemeli.")


def d_gizleme(r):
    """[hidden] kuralı yerinde mi — hareket azaltmada opacity tuzağına karşı."""
    css = oku("assets/css/style.css")
    if not re.search(r"\[hidden\]\s*\{\s*display\s*:\s*none\s*!important", css):
        r.hata("gizleme",
               "style.css: `[hidden] { display: none !important; }` kuralı yok. "
               "Bu kural silinemez — CLAUDE.md'ye bak.")
    else:
        r.tamam()

    # Gizleme opacity ile yapılmamalı. Bu bir uyarı değil hatadır: hareket
    # azaltma açıkken opacity ile gizlenen şey bir daha ASLA görünmez.
    for dosya in ("assets/js/app.js", "assets/js/animasyon.js", "assets/js/gizli.js"):
        js = js_yorumlari_at(oku(dosya))
        for eslesme in re.finditer(r"style\.opacity\s*=\s*['\"]?0(\.0+)?['\"]?", js):
            satir = js[:eslesme.start()].count("\n") + 1
            r.hata("gizleme",
                   f"{dosya}:{satir} opacity=0 ile gizleme. Hareket azaltma "
                   "açıkken bir daha görünmez; `hidden` özniteliğini kullan.")
        r.tamam()


def d_odak(r):
    """Odak halkası silinmiş mi."""
    css = yorumlari_at(oku("assets/css/style.css"))
    bulundu = False
    for eslesme in re.finditer(r"outline\s*:\s*(none|0)\b", css):
        onceki = css.rfind("{", 0, eslesme.start())
        secici = css[max(0, css.rfind("}", 0, onceki)) + 1:onceki]
        if ":focus-visible" in secici:
            continue  # tasarımın kendi kuralı
        satir = css[:eslesme.start()].count("\n") + 1
        r.hata("odak", f"style.css:{satir} `outline: none` — odak halkası silinemez.")
        bulundu = True
    if not bulundu:
        r.tamam()


def d_defer(r):
    """Betikler defer ile yükleniyor mu, sıra korunuyor mu."""
    for dosya in html_dosyalari():
        icerik = oku(dosya)
        for eslesme in re.finditer(r"<script\b([^>]*)\bsrc=", icerik):
            oznitelik = eslesme.group(1)
            if "defer" not in oznitelik and "async" not in oznitelik:
                satir = icerik[:eslesme.start()].count("\n") + 1
                r.hata("defer", f"{dosya}:{satir} dış betikte `defer` yok. "
                                "İlk boyama yavaşlar, sıra bozulur.")
            elif "async" in oznitelik:
                satir = icerik[:eslesme.start()].count("\n") + 1
                r.hata("defer", f"{dosya}:{satir} `async` sırayı bozar — `defer` kullan.")
            else:
                r.tamam()


def d_sahte(r):
    """Boş VIDEOLAR'a uydurma içerik girmiş mi."""
    js = oku("assets/js/data.js")
    blok = blok_al(js, "const VIDEOLAR = {")
    blok = js_yorumlari_at(blok)

    kimlikler = [d for d in re.findall(r'kimlik\s*:\s*"([^"]*)"', blok) if d]
    baglantilar = [d for d in re.findall(r'baglanti\s*:\s*"([^"]*)"', blok) if d]

    # Barış gerçek video eklerse burası dolar; o zaman sadece biçim denetlenir.
    for k in kimlikler:
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", k):
            r.hata("sahte", f"data.js: `kimlik: \"{k}\"` geçerli bir YouTube "
                            "kimliği değil (11 karakter olmalı). Uydurma kimlik yazma.")
    for b in baglantilar:
        if "youtube.com" not in b and "youtu.be" not in b:
            r.hata("sahte", f"data.js: `baglanti: \"{b}\"` YouTube adresi değil.")

    if not kimlikler and not baglantilar:
        # Hepsi boşken hiçbir başlık/açıklama yazılı olmamalı.
        for alan in ("baslik", "aciklama"):
            for deger in re.findall(alan + r'\s*:\s*"([^"]+)"', blok):
                r.hata("sahte",
                       f"data.js: video yokken `{alan}: \"{deger}\"` yazılmış. "
                       "Sahte içerik yasak — boş bırak, eksik olduğunu raporla.")
    r.tamam()


def d_video(r):
    """Yeni eklenen video kimliği insan onayına takılır.

    Denetleyici bir kimliğin biçimini doğrulayabilir ama GERÇEK olduğunu
    doğrulayamaz: "aB3dEf7hK9m" kurallara uygun ve tamamen uydurma olabilir.
    Çevrimdışı bir betik bunu asla ayıramaz.

    Bu yüzden doğruluk iddiası yerine değişim izleniyor: VIDEOLAR bloğuna
    HEAD'de olmayan bir kimlik/bağlantı girdiyse bu bir insan kapısıdır.
    Barış kendi videosunu eklediyse onaylar; Claude uydurduysa yakalanır.
    """
    eski = git_goster("assets/js/data.js")
    if eski is None:
        # Kıyas tabanı yoksa bu kapı çalışamaz. Sessizce atlamak en kötüsü:
        # kapı yokken de varmış gibi görünür. Açıkça söyle.
        r.uyari("video",
                "HEAD'deki data.js okunamadı (git yok ya da dosya yeni). "
                "Yeni video kimliği kapısı BU KOŞUDA DEVRE DIŞI — "
                "VIDEOLAR'a eklenen kimlikleri elle doğrula.")
        return

    def kimlikleri_al(kaynak):
        blok = js_yorumlari_at(blok_al(kaynak, "const VIDEOLAR = {"))
        bulunan = set()
        for alan in ("kimlik", "baglanti"):
            bulunan |= {d for d in re.findall(alan + r'\s*:\s*"([^"]*)"', blok) if d}
        return bulunan

    yeni = kimlikleri_al(oku("assets/js/data.js")) - kimlikleri_al(eski)
    for deger in sorted(yeni):
        r.kapi("video",
               f"data.js: VIDEOLAR'a yeni video eklendi → \"{deger}\"\n"
               "        Bu kimliğin gerçekten var olduğunu betik doğrulayamaz. "
               "Barış onaylamadıysa EKLEME.")
    if not yeni:
        r.tamam()


def d_kontrast(r):
    """Renklerin WCAG AA (4.5:1) sınırında kaldığını ölç."""
    css = oku("assets/css/style.css")
    d = css_degiskenleri(yorumlari_at(css))

    zemin = d.get("--bg")
    if not zemin:
        r.hata("kontrast", "style.css: --bg bulunamadı, ölçüm yapılamadı.")
        return

    olcumler = []
    for ad in ("--text", "--text-2", "--text-3", "--kotu-metin", "--iyi",
               "--belirsiz", "--altin", "--kan-parlak", "--elektrik"):
        if ad in d:
            olcumler.append((ad, d[ad], "--bg", zemin))

    # En açık kart zemini de kontrol edilmeli — metin orada da okunuyor mu.
    if "--bg-3" in d and "--text-3" in d:
        olcumler.append(("--text-3", d["--text-3"], "--bg-3", d["--bg-3"]))

    for bolge, renk in bolge_renkleri(yorumlari_at(css)).items():
        olcumler.append((f"--bolge-renk[{bolge}]", renk, "--bg", zemin))

    for ad, on, zemin_ad, arka in olcumler:
        oran = kontrast(on, arka)
        if oran < AA_SINIR:
            r.hata("kontrast",
                   f"{ad} ({on}) / {zemin_ad} ({arka}) = {oran:.2f}:1 — "
                   f"AA sınırı {AA_SINIR}:1 altında.")
        else:
            r.tamam()


def d_lore(r):
    """LORE.md ile data.js senkron mu — karakter adları iki yerde de geçmeli."""
    lore = oku("LORE.md")
    js = oku("assets/js/data.js")

    for blok_adi in ("const KARAKTERLER = [", "const IRADE_KADEMELERI = ["):
        blok = js_yorumlari_at(blok_al(js, blok_adi))
        if not blok:
            continue
        for ad in re.findall(r'\bad\s*:\s*"([^"]+)"', blok):
            if ad not in lore:
                r.hata("lore", f"data.js'te \"{ad}\" var, LORE.md'de yok. "
                               "İçerik değişince ikisi senkron kalmalı.")
            else:
                r.tamam()


def d_belge(r):
    """DONGULER.md'deki sayılar betiklerin gerçeğiyle uyuşuyor mu.

    Belgeye yazılan sayı, koda bakmadan güncellenmediği için sessizce çürür —
    nitekim çürüdü: sınav 19/5 iken belge 18/6 yazıyordu. LORE ↔ data
    senkronuyla aynı sınıftan bir hata, aynı şekilde denetlenmeli.
    """
    import importlib.util

    belge_yolu = os.path.join(KOK, ".claude", "DONGULER.md")
    if not os.path.exists(belge_yolu):
        return
    belge = open(belge_yolu, encoding="utf-8").read()

    sinav_yolu = os.path.join(KOK, ".claude", "sinav.py")
    if os.path.exists(sinav_yolu):
        tanim = importlib.util.spec_from_file_location("_sinav", sinav_yolu)
        modul = importlib.util.module_from_spec(tanim)
        tanim.loader.exec_module(modul)
        toplam = len(modul.VAKALAR)
        tuzak = sum(1 for v in modul.VAKALAR if v[2])
        masum = toplam - tuzak

        eslesme = re.search(r"\*\*(\d+) vaka\s*\n?\s*\((\d+) yakalanmalı, (\d+) masum\)\*\*",
                            belge)
        if not eslesme:
            r.hata("belge", "DONGULER.md: sınav vaka sayısı cümlesi bulunamadı. "
                            "Biçim: **N vaka (T yakalanmalı, M masum)**")
        elif [int(g) for g in eslesme.groups()] != [toplam, tuzak, masum]:
            r.hata("belge",
                   f"DONGULER.md: sınav {toplam} vaka ({tuzak} yakalanmalı, "
                   f"{masum} masum) diyor, belge {eslesme.group(0)} yazıyor.")
        else:
            r.tamam()

    altin_yolu = os.path.join(KOK, ".claude", "altin-sorular.json")
    if os.path.exists(altin_yolu):
        import json as _json
        with open(altin_yolu, encoding="utf-8") as f:
            sayi = len(_json.load(f)["sorular"])
        eslesme = re.search(r"\*\*(\d+) altın soru\*\*", belge)
        if not eslesme:
            r.hata("belge", "DONGULER.md: altın soru sayısı cümlesi bulunamadı. "
                            "Biçim: **N altın soru**")
        elif int(eslesme.group(1)) != sayi:
            r.hata("belge", f"DONGULER.md: altın sette {sayi} soru var, "
                            f"belge {eslesme.group(1)} yazıyor.")
        else:
            r.tamam()


DENETIMLER = {
    "menu": ("Menü bütünlüğü", d_menu),
    "harita": ("Site haritası", d_harita),
    "gizleme": ("Gizleme yöntemi", d_gizleme),
    "odak": ("Odak halkası", d_odak),
    "defer": ("Betik yüklemesi", d_defer),
    "sahte": ("Sahte içerik", d_sahte),
    "video": ("Yeni video (insan kapısı)", d_video),
    "kontrast": ("Renk kontrastı", d_kontrast),
    "lore": ("LORE ↔ data senkronu", d_lore),
    "belge": ("Belge ↔ betik senkronu", d_belge),
}


def main(argv):
    kisa = "--kisa" in argv
    secilen = [a for a in argv if not a.startswith("-")] or list(DENETIMLER)

    bilinmeyen = [a for a in secilen if a not in DENETIMLER]
    if bilinmeyen:
        print(f"Bilinmeyen denetim: {', '.join(bilinmeyen)}")
        print(f"Geçerli olanlar: {', '.join(DENETIMLER)}")
        return 2

    r = Rapor()
    for anahtar in secilen:
        _, islev = DENETIMLER[anahtar]
        try:
            islev(r)
        except FileNotFoundError as e:
            r.hata(anahtar, f"dosya bulunamadı: {e.filename}")

    if r.hatalar:
        print("HATA")
        for denetim, mesaj in r.hatalar:
            print(f"  [{denetim}] {mesaj}")
    if r.kapilar:
        print("İNSAN KAPISI")
        for denetim, mesaj in r.kapilar:
            print(f"  [{denetim}] {mesaj}")
    if r.uyarilar and not kisa:
        print("UYARI")
        for denetim, mesaj in r.uyarilar:
            print(f"  [{denetim}] {mesaj}")

    if r.hatalar:
        print(f"\n{len(r.hatalar)} hata, {r.gecen} geçen denetim. "
              "Düzelt ve tekrar çalıştır.")
        return 1

    if r.kapilar:
        print(f"\nKural ihlali yok ama {len(r.kapilar)} nokta insan onayı "
              "istiyor. Kendi başına karar verme — Barış'a sor.")
        return 3

    if not kisa:
        print(f"TEMİZ — {r.gecen} denetim geçti "
              f"({len(secilen)} başlık: {', '.join(secilen)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
