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

SITE_ADRESI = "https://barisguveloglu-bit.github.io/kanal-sitesi/"

# CLAUDE.md: "Sitede hiç kullanıcı verisi toplanmıyor. Form yok, giriş yok,
# çerez yok." ve "hiçbir dış servise bağlı değil". Veri dışarı ancak bu
# kanallardan çıkabilir. localStorage burada YOK: cihazdan çıkmaz, tercih
# hatırlamak için bilerek kullanılıyor.
VERI_KANALLARI = (
    (r"document\.cookie", "çerez (document.cookie)"),
    (r"\bfetch\s*\(", "ağ isteği (fetch)"),
    (r"\bXMLHttpRequest\b", "ağ isteği (XMLHttpRequest)"),
    (r"\bsendBeacon\b", "izleme isteği (sendBeacon)"),
    (r"\bnew\s+WebSocket\b", "kalıcı bağlantı (WebSocket)"),
    (r"\bnew\s+EventSource\b", "sunucu akışı (EventSource)"),
)
# Dış kaynaktan bir şey YÜKLEMEK ziyaretçinin adresini o servise verir.
# Tek istisna YouTube: kanalın kendisi, video kapakları oradan geliyor.
IZINLI_DIS_SUNUCU = ("i.ytimg.com", "img.youtube.com",
                     "www.youtube.com", "www.youtube-nocookie.com")
YUKLEYEN_REL = {"stylesheet", "preload", "modulepreload", "prefetch",
                "preconnect", "dns-prefetch", "icon"}
PAKET_IZLERI = ("package.json", "package-lock.json", "yarn.lock",
                "pnpm-lock.yaml", "node_modules")


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


def varlik_dosyalari(klasor, uzanti):
    """assets/<klasor> altındaki bütün dosyalar — elle yazılmış liste değil.

    Elle yazılan liste yeni dosyayı kör noktaya düşürüyordu: goz.js hiçbir
    gizleme denetimine, animasyon.css hiçbir odak denetimine girmiyordu.
    Kural dosya eklenince kendiliğinden genişlemeli.
    """
    yol = os.path.join(KOK, "assets", klasor)
    if not os.path.isdir(yol):
        return []
    return sorted(f"assets/{klasor}/{a}" for a in os.listdir(yol) if a.endswith(uzanti))


def html_yorumlari_at(html):
    return re.sub(r"<!--.*?-->", "", html, flags=re.S)


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
    for dosya in varlik_dosyalari("js", ".js"):
        js = js_yorumlari_at(oku(dosya))
        for eslesme in re.finditer(r"style\.opacity\s*=\s*['\"]?0(\.0+)?['\"]?", js):
            satir = js[:eslesme.start()].count("\n") + 1
            r.hata("gizleme",
                   f"{dosya}:{satir} opacity=0 ile gizleme. Hareket azaltma "
                   "açıkken bir daha görünmez; `hidden` özniteliğini kullan.")
        r.tamam()


def d_odak(r):
    """Odak halkası silinmiş mi — bütün stil dosyalarında."""
    for dosya in varlik_dosyalari("css", ".css"):
        css = yorumlari_at(oku(dosya))
        bulundu = False
        for eslesme in re.finditer(r"outline\s*:\s*(none|0)\b", css):
            onceki = css.rfind("{", 0, eslesme.start())
            secici = css[max(0, css.rfind("}", 0, onceki)) + 1:onceki]
            if ":focus-visible" in secici:
                continue  # tasarımın kendi kuralı
            satir = css[:eslesme.start()].count("\n") + 1
            r.hata("odak", f"{os.path.basename(dosya)}:{satir} `outline: none` — "
                           "odak halkası silinemez.")
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

    # Eskiden sadece karakterler ve kademeler bakılıyordu; komutanlar, mafya
    # tepesi ve icraat sahipleri hiçbir denetime girmiyordu.
    for blok_adi, alan in (("const KARAKTERLER = [", "ad"),
                           ("const IRADE_KADEMELERI = [", "ad"),
                           ("const MAFYA_TEPE = [", "ad"),
                           ("const KOMUTANLAR = [", "ad"),
                           ("const ICRAATLER = [", "karakter")):
        blok = js_yorumlari_at(blok_al(js, blok_adi))
        if not blok:
            continue
        for ad in re.findall(r'\b' + alan + r'\s*:\s*"([^"]+)"', blok):
            if ad not in lore:
                r.hata("lore", f"data.js'te \"{ad}\" var, LORE.md'de yok. "
                               "İçerik değişince ikisi senkron kalmalı.")
            else:
                r.tamam()

    # 81 derebeyi iki dosyada da TABLO olarak duruyor. Adın LORE'da bir yerde
    # geçmesi yetmez: iki ilin derebeyi yer değiştirse ikisi de "geçiyor" olur.
    # Satır satır eşleşmeli — plaka, il ve ad birlikte.
    canon = {int(p): (il.strip(), ad.strip()) for p, il, ad in re.findall(
        r"(?m)^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*\*\*([^*]+)\*\*\s*\|", lore)}
    blok = js_yorumlari_at(blok_al(js, "const IL_DEREBEYLERI = ["))
    for plaka, il, ad in re.findall(
            r'plaka\s*:\s*(\d+)\s*,\s*il\s*:\s*"([^"]+)"[^}]*?\bad\s*:\s*"([^"]+)"', blok):
        beklenen = canon.get(int(plaka))
        if beklenen is None:
            r.hata("lore", f"data.js: {plaka} plakalı il ({il}) LORE.md derebeyi "
                           "tablosunda yok.")
        elif beklenen != (il, ad):
            r.hata("lore", f"data.js: {plaka} → {il} / {ad}, ama LORE.md "
                           f"{beklenen[0]} / {beklenen[1]} diyor.")
        else:
            r.tamam()


def d_veri(r):
    """data.js kendi içinde tutarlı mı — CLAUDE.md'deki iddialar ölçülsün.

    "81 ilin 81'i de dolu, ad: null kalmadı" CLAUDE.md'de yazılı bir
    iddiaydı, hiçbir denetim ona bakmıyordu. Yazı olarak duran iddia,
    bir sonraki düzenlemede sessizce yalana dönüşür.
    """
    js = js_yorumlari_at(oku("assets/js/data.js"))

    # Kimlikler tekil olmalı — derin bağlantı (karakterler.html#kimlik) buna dayanıyor.
    kimlikler = re.findall(r'\bid\s*:\s*"([^"]+)"', blok_al(js, "const KARAKTERLER = ["))
    for k in sorted({k for k in kimlikler if kimlikler.count(k) > 1}):
        r.hata("veri", f"data.js: KARAKTERLER içinde `id: \"{k}\"` birden fazla.")
    if kimlikler:
        r.tamam()

    gecerli_taraf = {"iyi", "kotu", "belirsiz"}
    for blok_adi in ("const KARAKTERLER = [", "const ICRAATLER = ["):
        for taraf in re.findall(r'\btaraf\s*:\s*"([^"]*)"', blok_al(js, blok_adi)):
            if taraf not in gecerli_taraf:
                r.hata("veri", f"data.js: {blok_adi.split()[1]} içinde geçersiz "
                               f"`taraf: \"{taraf}\"` (iyi / kotu / belirsiz).")

    blok = blok_al(js, "const IL_DEREBEYLERI = [")
    satirlar = re.findall(r"\{[^{}]*\bplaka\s*:[^{}]*\}", blok)
    plakalar = [int(p) for p in re.findall(r"\bplaka\s*:\s*(\d+)", blok)]
    if sorted(plakalar) != list(range(1, 82)):
        eksik = sorted(set(range(1, 82)) - set(plakalar))
        fazla = sorted({p for p in plakalar if plakalar.count(p) > 1})
        r.hata("veri", f"data.js: IL_DEREBEYLERI 81 ili tam kapsamıyor "
                       f"({len(plakalar)} kayıt; eksik {eksik[:5]}, yinelenen {fazla[:5]}).")
    else:
        r.tamam()

    komutanlar = set(re.findall(r'\bid\s*:\s*"([^"]+)"', blok_al(js, "const KOMUTANLAR = [")))
    for satir in satirlar:
        plaka = re.search(r"\bplaka\s*:\s*(\d+)", satir).group(1)
        if not re.search(r'\bad\s*:\s*"[^"]+"', satir):
            r.hata("veri", f"data.js: {plaka} plakalı ilin derebeyi adı boş "
                           "(ad: null). CLAUDE.md 81/81 dolu diyor.")
        komutan = re.search(r'\bkomutan\s*:\s*"([^"]*)"', satir)
        if komutanlar and (not komutan or komutan.group(1) not in komutanlar):
            r.hata("veri", f"data.js: {plaka} plakalı il var olmayan bir komutana "
                           f"bağlı ({komutan.group(1) if komutan else 'yok'}).")
    if satirlar:
        r.tamam()


def d_gizlilik(r):
    """Veri toplamama ve dış servise bağlanmama kuralı.

    CLAUDE.md'nin en temel kuralı buydu ve hiçbir denetim ona bakmıyordu.
    Bir analitik betiği, bir yazı tipi CDN'i ya da tek bir fetch() sitenin
    ziyaretçi hakkında bir yere bilgi göndermesi demektir.
    """
    site_sunucusu = re.match(r"https?://([^/]+)", SITE_ADRESI).group(1)

    def dis_sunucu(adres):
        m = re.match(r"(?:https?:)?//([^/\"'?#]+)", adres.strip())
        if not m or m.group(1) == site_sunucusu:
            return None
        return m.group(1)

    for dosya in html_dosyalari():
        html = html_yorumlari_at(oku(dosya))
        if re.search(r"<form\b", html, re.I):
            r.hata("gizlilik", f"{dosya}: <form> var. Sitede form yok — soru-cevap "
                               "YouTube yorumlarında.")
        if re.search(r'type\s*=\s*"password"', html, re.I):
            r.hata("gizlilik", f"{dosya}: parola alanı var. Sitede giriş yok.")
        for etiket in re.finditer(r"<(script|link|iframe|img|audio|video|source|embed|object)\b[^>]*>",
                                  html, re.I):
            govde = etiket.group(0)
            if etiket.group(1).lower() == "link":
                rel = re.search(r'rel\s*=\s*"([^"]*)"', govde)
                if not rel or not (set(rel.group(1).lower().split()) & YUKLEYEN_REL):
                    continue  # canonical gibi — bir şey yüklemiyor
            for adres in re.findall(r'\b(?:src|href|data)\s*=\s*"([^"]*)"', govde):
                sunucu = dis_sunucu(adres)
                if sunucu and sunucu not in IZINLI_DIS_SUNUCU:
                    satir = html[:etiket.start()].count("\n") + 1
                    r.hata("gizlilik", f"{dosya}:{satir} dış kaynak yükleniyor → {sunucu}. "
                                       "Site hiçbir dış servise bağlı değil.")
        r.tamam()

    kaynaklar = [(d, js_yorumlari_at(oku(d))) for d in varlik_dosyalari("js", ".js")]
    kaynaklar += [(d, html_yorumlari_at(oku(d))) for d in html_dosyalari()]
    for dosya, metin in kaynaklar:
        for desen, ne in VERI_KANALLARI:
            for eslesme in re.finditer(desen, metin):
                satir = metin[:eslesme.start()].count("\n") + 1
                r.hata("gizlilik", f"{dosya}:{satir} {ne}. Sitede veri toplanmıyor, "
                                   "backend yok — önce Barış'a sor.")
    r.tamam()

    for dosya in varlik_dosyalari("css", ".css"):
        css = yorumlari_at(oku(dosya))
        for eslesme in re.finditer(r"(?:@import\s+|url\(\s*)['\"]?((?:https?:)?//[^'\")\s]+)", css):
            sunucu = dis_sunucu(eslesme.group(1))
            if sunucu and sunucu not in IZINLI_DIS_SUNUCU:
                satir = css[:eslesme.start()].count("\n") + 1
                r.hata("gizlilik", f"{os.path.basename(dosya)}:{satir} dış kaynak "
                                   f"yükleniyor → {sunucu}.")
        r.tamam()

    for iz in PAKET_IZLERI:
        if os.path.exists(os.path.join(KOK, iz)):
            r.hata("gizlilik", f"kökte {iz} var. Derleme adımı ve paket yöneticisi "
                               "yok — sadelik bilinçli bir tercih.")
    r.tamam()


def sayfa_kimlikleri(dosya, _onbellek={}):
    """Bir sayfada #parca olarak hedeflenebilecek kimlikler.

    Statik `id="..."` yetmez: karakter kartları JS ile basılıyor ve
    kimliklerini data.js'ten alıyor (karakterler.html#kameraci-baris).
    """
    if dosya not in _onbellek:
        html = html_yorumlari_at(oku(dosya))
        kimlik = set(re.findall(r'\b(?:id|name)\s*=\s*"([^"$]+)"', html))
        kimlik |= set(re.findall(r'\bid\s*:\s*"([^"]+)"', js_yorumlari_at(oku("assets/js/data.js"))))
        _onbellek[dosya] = kimlik
    return _onbellek[dosya]


def d_baglanti(r):
    """İç bağlantılar ve kaynaklar gerçekten var olan bir yere mi gidiyor.

    Statik sitenin en tipik çürümesi: bir dosya yeniden adlandırılır, bir
    karakterin kimliği değişir, bağlantı sessizce 404'e döner. Menü denetimi
    sadece menüye bakıyordu; sayfa içi bağlantılara, paylaşım görseline,
    canonical adreslere ve data.js'teki `yol` alanlarına hiçbir şey bakmıyordu.
    """
    def coz(adres, kaynak):
        adres = adres.strip()
        if not adres or adres.startswith(("mailto:", "tel:", "data:", "javascript:")) \
                or "${" in adres:
            return None
        if adres.startswith(SITE_ADRESI):
            adres = adres[len(SITE_ADRESI):] or "index.html"
        elif re.match(r"(?:[a-z]+:)?//", adres):
            return None  # dış bağlantıya gitmek (yüklemek değil) serbest
        yol, _, parca = adres.partition("#")
        yol = yol.split("?")[0]
        if not yol:
            yol = kaynak
        elif yol.endswith("/"):
            yol += "index.html"
        return yol, parca

    def denetle(adres, kaynak, nerede):
        cozulen = coz(adres, kaynak)
        if cozulen is None:
            return
        yol, parca = cozulen
        if not os.path.exists(os.path.join(KOK, yol)):
            r.hata("baglanti", f"{nerede}: `{adres}` → {yol} yok.")
        elif parca and yol.endswith(".html") and parca not in sayfa_kimlikleri(yol):
            r.hata("baglanti", f"{nerede}: `{adres}` → {yol} içinde #{parca} yok.")
        else:
            r.tamam()

    for dosya in html_dosyalari():
        html = html_yorumlari_at(oku(dosya))
        for eslesme in re.finditer(r'\b(?:href|src)\s*=\s*"([^"]*)"', html):
            satir = html[:eslesme.start()].count("\n") + 1
            denetle(eslesme.group(1), dosya, f"{dosya}:{satir}")
        for eslesme in re.finditer(r'\bcontent\s*=\s*"(' + re.escape(SITE_ADRESI) + r'[^"]*)"', html):
            satir = html[:eslesme.start()].count("\n") + 1
            denetle(eslesme.group(1), dosya, f"{dosya}:{satir}")

    for adres in re.findall(r"<loc>([^<]+)</loc>", oku("sitemap.xml")):
        denetle(adres, "index.html", "sitemap.xml")

    js = js_yorumlari_at(oku("assets/js/data.js"))
    for eslesme in re.finditer(r'\byol\s*:\s*"([^"]+)"', js):
        satir = js[:eslesme.start()].count("\n") + 1
        denetle(eslesme.group(1), "index.html", f"data.js:{satir}")


def d_capa(r):
    """Altın setin satır numaraları hâlâ doğru satırı mı gösteriyor.

    Altın set LORE.md'ye satır numarasıyla bağlı. LORE.md düzenlenince
    satırlar kayar — ama bunu sadece degerlendir.py görüyordu, o da elle
    çalıştırılınca. Kanca LORE.md düzenlemesinde sadece bu betiği çağırıyor;
    kayma ancak bir sonraki ölçümde, çoğu zaman günler sonra fark ediliyordu.

    Her altın sorunun satırı, kendi gerçeklerinden en az birini içermek
    zorunda. İçermiyorsa iki ihtimal var ve ayrı ele alınıyor:
      - gerçek başka satıra kaymış  → hata, yeni satır numarası söylenir
      - gerçek LORE.md'den silinmiş → insan kapısı: canon değişmiş olabilir,
        ölçümü kimin uyduracağına Barış karar verir
    """
    import json as _json
    yol = os.path.join(KOK, ".claude", "altin-sorular.json")
    if not os.path.exists(yol):
        return
    with open(yol, encoding="utf-8") as f:
        sorular = _json.load(f).get("sorular", [])
    lore = oku("LORE.md").splitlines()

    for soru in sorular:
        satir, gercekler = soru.get("satir"), soru.get("gercekler") or []
        if not satir or not gercekler:
            continue
        metin = lore[satir - 1].lower() if 0 < satir <= len(lore) else ""
        if any(g.lower() in metin for g in gercekler):
            r.tamam()
            continue
        yeni = [i + 1 for i, s in enumerate(lore)
                if any(g.lower() in s.lower() for g in gercekler)]
        if yeni:
            r.hata("capa", f"altin-sorular.json: \"{soru['soru']}\" → LORE.md:{satir} "
                           f"artık \"{gercekler[0]}\" içermiyor; satır kaymış → "
                           f"LORE.md:{', '.join(map(str, yeni[:3]))}. Altın seti güncelle.")
        else:
            r.kapi("capa", f"altin-sorular.json: \"{soru['soru']}\" için gerçek "
                           f"\"{gercekler[0]}\" LORE.md'de HİÇ yok.\n"
                           "        Canon değişmiş olabilir. Altın seti kendi başına "
                           "uydurma — Barış'a sor.")


def d_kanca(r):
    """Kancalar gerçekten çalışabilir durumda mı.

    Kancanın bozulması sessizdir: settings.json'da yanlış bir yol ya da
    betikte bir sözdizimi hatası, Claude Code'da sadece küçük bir uyarı
    üretir ve döngü kendiliğinden KAPANIR. Kimse "kanca çalışmadı" demez;
    denetim yapılmamıştır, o kadar.
    """
    import json as _json
    ayar_yolu = os.path.join(KOK, ".claude", "settings.json")
    if not os.path.exists(ayar_yolu):
        r.uyari("kanca", ".claude/settings.json yok — hiçbir kanca çalışmıyor.")
        return
    try:
        with open(ayar_yolu, encoding="utf-8") as f:
            ayar = _json.load(f)
    except ValueError as e:
        r.hata("kanca", f".claude/settings.json okunamıyor ({e}). Bozuk ayar "
                        "dosyası, içindeki BÜTÜN kancaları kapatır.")
        return

    for olay, gruplar in (ayar.get("hooks") or {}).items():
        for grup in gruplar:
            for kanca in grup.get("hooks", []):
                for betik in re.findall(r"\.claude/([\w.-]+\.py)", kanca.get("command", "")):
                    yol = os.path.join(KOK, ".claude", betik)
                    if not os.path.exists(yol):
                        r.hata("kanca", f"{olay} kancası .claude/{betik} çağırıyor, "
                                        "dosya yok.")
                        continue
                    try:
                        with open(yol, encoding="utf-8") as f:
                            compile(f.read(), yol, "exec")
                    except SyntaxError as e:
                        r.hata("kanca", f".claude/{betik}:{e.lineno} sözdizimi hatası — "
                                        f"{olay} kancası sessizce devre dışı kalır.")
                    else:
                        r.tamam()


def d_mandal(r):
    """Ölçü gevşetildi mi — eşik düştü, vaka silindi, sınır büyüdü mü.

    "Eşik indirerek, vaka silerek yeşile ulaşmak yasak" /surekli içinde
    yazıyordu, ama sadece yazıyordu. Asıl kontrol mandal.py'de.
    """
    import importlib.util
    yol = os.path.join(KOK, ".claude", "mandal.py")
    if not os.path.exists(yol):
        # Mandalın kendisini silmek, bütün ölçüleri tek hamlede gevşetmektir.
        # Taban duruyorsa (yerelde ya da HEAD'de) araç bilinçli olarak vardı.
        if os.path.exists(os.path.join(KOK, ".claude", "mandal.json")) or \
                git_goster(".claude/mandal.json") is not None:
            r.kapi("mandal", "mandal.py yok ama ölçü tabanı duruyor — mandal "
                             "silinmiş. Ölçü korumasız kaldı; Barış onaylamadıysa geri getir.")
        return
    try:
        tanim = importlib.util.spec_from_file_location("_mandal", yol)
        mandal = importlib.util.module_from_spec(tanim)
        tanim.loader.exec_module(mandal)
        sonuc = mandal.karsilastir(KOK)
    except Exception as e:
        r.hata("mandal", f"mandal.py çalışmadı ({type(e).__name__}: {e}).")
        return
    for ad, mesaj in sonuc["olcum_hatasi"]:
        r.hata("mandal", f"{ad} ölçülemedi: {mesaj}")
    kural = {"yukari": "düşmemeli", "asagi": "büyümemeli", "esit": "onaysız değişmemeli"}
    for ad, taban, simdi, yon in sonuc["gevsedi"]:
        r.kapi("mandal", f"{ad}: taban {taban}, şimdi {simdi} — ölçü gevşedi "
                         f"({kural.get(yon, 'değişmemeli')}).\n"
                         "        Bilinçli bir karar değilse geri al. Barış onaylarsa: "
                         "python3 .claude/mandal.py kaydet --gerekce \"...\"")
    for ad, taban, simdi, _ in sonuc["siki"]:
        r.uyari("mandal", f"{ad}: taban {taban} → {simdi}. Mandalı ilerlet: "
                          "python3 .claude/mandal.py kaydet")
    if not sonuc["gevsedi"] and not sonuc["olcum_hatasi"]:
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
        # sinav.py'yi içe aktarmak onun kodunu çalıştırır. Orada bir sorun
        # varsa DENETİMİN TAMAMI çökmemeli: denetleyici, ölçtüğü araçtan
        # daha sağlam olmak zorunda. Yoksa bir aracın bozulması bütün
        # kuralları görünmez kılar — en kötü hata türü.
        try:
            tanim = importlib.util.spec_from_file_location("_sinav", sinav_yolu)
            modul = importlib.util.module_from_spec(tanim)
            tanim.loader.exec_module(modul)
        except Exception as e:
            r.hata("belge", f"sinav.py okunamadı ({type(e).__name__}: {e}). "
                            "Vaka sayısı doğrulanamadı — önce onu düzelt.")
            modul = None
    else:
        modul = None

    if modul is not None:
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

    # CLAUDE.md, LORE.md'de var olmayan bir bölüme yollarsa okuyan kişi
    # aradığını bulamaz. Nitekim bulamadı: "Açık Uçlar" bölümüne yollanıyordu
    # ama dosyada öyle bir bölüm yoktu — son bölüm "Kapatılan Diğer Uçlar",
    # yani tam tersi anlamda. Aynı sınıftan bir çürüme, aynı şekilde denetlenir.
    talimat_yolu = os.path.join(KOK, "CLAUDE.md")
    lore_yolu = os.path.join(KOK, "LORE.md")
    if os.path.exists(talimat_yolu) and os.path.exists(lore_yolu):
        talimat = open(talimat_yolu, encoding="utf-8").read()
        lore = open(lore_yolu, encoding="utf-8").read()
        basliklar = {b.strip().lower()
                     for b in re.findall(r"(?m)^#{1,6}\s+(.+?)\s*$", lore)}
        # `LORE.md` ... "Bölüm Adı" bölümü  kalıbındaki atıflar
        for atif in re.findall(r'LORE\.md[^\n]{0,60}?"([^"]+)"\s*bölüm', talimat):
            if not any(atif.lower() in b for b in basliklar):
                r.hata("belge",
                       f'CLAUDE.md, LORE.md\'de "{atif}" bölümüne yolluyor '
                       "ama öyle bir başlık yok.")
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

    # Mutasyon sayısı da aynı biçimde çürüdü: belge "15 mutasyon" yazarken
    # betikte 19 vardı. Dosyayı içe aktarmak yerine girdileri sayıyoruz —
    # mutasyon.py çalıştırılmadan da ölçülebilsin.
    mutasyon_yolu = os.path.join(KOK, ".claude", "mutasyon.py")
    if os.path.exists(mutasyon_yolu):
        kaynak = open(mutasyon_yolu, encoding="utf-8").read()
        liste = blok_al(kaynak, "MUTASYONLAR = [")
        sayi = len(re.findall(r'(?m)^\s*\("[^"]+",\s*m_\w+,', liste))
        eslesme = re.search(r"\*\*(\d+) mutasyon\*\*", belge)
        if not eslesme:
            r.hata("belge", "DONGULER.md: mutasyon sayısı cümlesi bulunamadı. "
                            "Biçim: **N mutasyon**")
        elif int(eslesme.group(1)) != sayi:
            r.hata("belge", f"DONGULER.md: mutasyon sınavında {sayi} mutasyon var, "
                            f"belge {eslesme.group(1)} yazıyor.")
        else:
            r.tamam()

    # Belgelenmemiş denetim, komut ya da araç: var ama kimse bilmiyor.
    for anahtar in DENETIMLER:
        if f"| `{anahtar}` |" not in belge:
            r.hata("belge", f"DONGULER.md: `{anahtar}` denetimi denetim tablosunda yok.")
        else:
            r.tamam()
    komut_klasoru = os.path.join(KOK, ".claude", "commands")
    if os.path.isdir(komut_klasoru):
        for dosya in sorted(os.listdir(komut_klasoru)):
            if dosya.endswith(".md") and f"`/{dosya[:-3]}" not in belge:
                r.hata("belge", f"DONGULER.md: /{dosya[:-3]} komutu komut tablosunda yok.")
    for dosya in sorted(os.listdir(os.path.join(KOK, ".claude"))):
        if dosya.endswith(".py") and dosya not in belge:
            r.hata("belge", f"DONGULER.md: .claude/{dosya} hiç anılmıyor — "
                            "belgelenmemiş araç.")
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
    "veri": ("data.js iç tutarlılığı", d_veri),
    "gizlilik": ("Veri toplamama / dış servis yok", d_gizlilik),
    "baglanti": ("İç bağlantı bütünlüğü", d_baglanti),
    "capa": ("Altın set satır çapası", d_capa),
    "kanca": ("Kanca sağlığı", d_kanca),
    "mandal": ("Ölçü mandalı (insan kapısı)", d_mandal),
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
        except Exception as e:
            # Bir denetimin çökmesi diğerlerini görünmez kılmamalı.
            r.hata(anahtar, f"denetim çöktü ({type(e).__name__}: {e}).")

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
