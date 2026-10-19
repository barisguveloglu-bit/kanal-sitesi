#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Denetleyicinin sınavı: tek tek fay enjekte et, yakalıyor mu ölç.

Her vaka deponun temiz bir kopyasına uygulanır. İki tür vaka var:
  TUZAK  — bozuk, yakalanmalı  (beklenen denetim başlığı verilir)
  MASUM  — düzgün, yakalanmamalı (yanlış alarm avı)
"""
import os, re, shutil, subprocess, sys, tempfile

import os.path
KAYNAK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def duzenle(kok, yol, eski, yeni, sayi=1):
    p = os.path.join(kok, yol)
    with open(p, encoding="utf-8") as f:
        s = f.read()
    if eski not in s:
        raise AssertionError(f"vaka hazırlanamadı: {yol} içinde bulunamadı → {eski[:60]!r}")
    with open(p, "w", encoding="utf-8") as f:
        f.write(s.replace(eski, yeni, sayi))


# ---------------------------------------------------------------- vakalar

def v_menu_eksik_link(k):
    duzenle(k, "karakterler.html", '<a href="irade.html">İrade Sistemi</a>', "")

def v_menu_nav_yok(k):
    p = os.path.join(k, "mafya.html")
    s = open(p, encoding="utf-8").read()
    open(p, "w", encoding="utf-8").write(re.sub(r'<nav class="menu".*?</nav>', "", s, flags=re.S))

def v_menu_yanlis_hedef(k):
    duzenle(k, "efsane.html", 'href="icraatler.html"', 'href="icraatlar.html"')

def v_harita_eksik(k):
    duzenle(k, "sitemap.xml",
            "<url><loc>https://barisguveloglu-bit.github.io/kanal-sitesi/soru-cevap.html</loc><priority>0.6</priority></url>", "")

def v_harita_gizli_sizdi(k):
    duzenle(k, "sitemap.xml", "</urlset>",
            "  <url><loc>https://barisguveloglu-bit.github.io/kanal-sitesi/gizli.html</loc></url>\n</urlset>")

def v_gizleme_kural_silindi(k):
    duzenle(k, "assets/css/style.css", "[hidden] { display: none !important; }", "")

def v_gizleme_opacity_js(k):
    duzenle(k, "assets/js/app.js", "function kacir(s) {",
            'function gizle(e) { e.style.opacity = "0"; }\nfunction kacir(s) {')

def v_odak_none(k):
    duzenle(k, "assets/css/style.css", ".kart:hover {", ".kart:focus { outline: none; }\n.kart:hover {")

def v_odak_sifir_bosluklu(k):
    duzenle(k, "assets/css/style.css", ".kart:hover {", ".kart:focus { outline : 0; }\n.kart:hover {")

def v_defer_yok(k):
    duzenle(k, "irade.html", '<script defer src="assets/js/app.js">', '<script src="assets/js/app.js">')

def v_defer_async(k):
    duzenle(k, "mafya.html", '<script defer src="assets/js/data.js">', '<script async src="assets/js/data.js">')

def v_sahte_bozuk_kimlik(k):
    duzenle(k, "assets/js/data.js", 'baslangic: { kimlik: "", baglanti: "", baslik: "" }',
            'baslangic: { kimlik: "cokyakinda", baglanti: "", baslik: "" }')

def v_sahte_gecerli_gorunumlu_kimlik(k):
    """En sinsi vaka: 11 karakter, biçimi doğru, ama uydurma."""
    duzenle(k, "assets/js/data.js", 'baslangic: { kimlik: "", baglanti: "", baslik: "" }',
            'baslangic: { kimlik: "aB3dEf7hK9m", baglanti: "", baslik: "" }')

def v_sahte_yakinda_basligi(k):
    duzenle(k, "assets/js/data.js",
            'oneCikan: { kimlik: "", baglanti: "", baslik: "", aciklama: "", sure: "" }',
            'oneCikan: { kimlik: "", baglanti: "", baslik: "Yakında geliyor!", aciklama: "", sure: "" }')

def v_sahte_yanlis_site(k):
    duzenle(k, "assets/js/data.js", 'baslangic: { kimlik: "", baglanti: "", baslik: "" }',
            'baslangic: { kimlik: "", baglanti: "https://vimeo.com/12345", baslik: "" }')

def v_kontrast_metin(k):
    duzenle(k, "assets/css/style.css", "--text-3: #7f7f8b;", "--text-3: #55555e;")

def v_kontrast_bolge(k):
    duzenle(k, "assets/css/style.css", '[data-bolge="bati"] { --bolge-renk: #d98324; }',
            '[data-bolge="bati"] { --bolge-renk: #6b4212; }')

def v_belge_vaka_sayisi(k):
    """DONGULER.md'deki sınav vaka sayısı gerçekten kayarsa yakalanmalı."""
    import re as _re
    p = os.path.join(k, ".claude", "DONGULER.md")
    s = open(p, encoding="utf-8").read()
    yeni, adet = _re.subn(r"\*\*(\d+) vaka", lambda m: f"**{int(m.group(1)) + 7} vaka", s, count=1)
    if not adet:
        raise AssertionError("DONGULER.md'de '**N vaka' kalıbı bulunamadı")
    open(p, "w", encoding="utf-8").write(yeni)

def v_belge_altin_sayisi(k):
    import re as _re
    p = os.path.join(k, ".claude", "DONGULER.md")
    s = open(p, encoding="utf-8").read()
    yeni, adet = _re.subn(r"\*\*(\d+) altın soru\*\*",
                          lambda m: f"**{int(m.group(1)) + 5} altın soru**", s, count=1)
    if not adet:
        raise AssertionError("DONGULER.md'de '**N altın soru**' kalıbı bulunamadı")
    open(p, "w", encoding="utf-8").write(yeni)

def v_belge_olmayan_bolum(k):
    """CLAUDE.md var olmayan bir LORE.md bölümüne yollarsa yakalanmalı."""
    duzenle(k, "LORE.md", "## 10. Açık Uçlar", "## 10. Bir Zamanlar Açıktı")

def v_lore_uydurma_karakter(k):
    duzenle(k, "assets/js/data.js", '    ad: "Sarı Gülücük",',
            '    ad: "Çelik Pençeli Kasap",')

# --- kör noktalar: elle yazılmış dosya listesinin dışında kalanlar ----------

def v_gizleme_opacity_yeni_dosya(k):
    """goz.js eskiden hiç taranmıyordu — dosya listesi elle yazılmıştı."""
    duzenle(k, "assets/js/goz.js", "function ",
            'function gizle(e) { e.style.opacity = "0"; }\nfunction ', 1)

def v_odak_ikinci_stil_dosyasi(k):
    with open(os.path.join(k, "assets/css/animasyon.css"), "a", encoding="utf-8") as f:
        f.write("\n.kart:focus { outline: none; }\n")

def v_lore_derebeyi_yer_degisti(k):
    """İki ad da LORE'da geçiyor — sadece satır eşleşmesi yakalayabilir."""
    duzenle(k, "assets/js/data.js", 'il: "Konya", komutan: "orta", ad: "Telipinu"',
            'il: "Konya", komutan: "orta", ad: "Anahita"')
    duzenle(k, "assets/js/data.js", 'il: "Van", komutan: "dogu", ad: "Anahita"',
            'il: "Van", komutan: "dogu", ad: "Telipinu"')

def v_lore_uydurma_komutan(k):
    duzenle(k, "assets/js/data.js", '    ad: "Nemesis",', '    ad: "Kara Fırtına",')

def v_veri_derebeyi_bos(k):
    duzenle(k, "assets/js/data.js", 'ad: "Telipinu", kim:', 'ad: null, kim:')

def v_veri_yinelenen_kimlik(k):
    duzenle(k, "assets/js/data.js", 'id: "sari-gulucuk",', 'id: "cips-yiyen-adam",')

def v_gizlilik_analitik(k):
    duzenle(k, "index.html", "</head>",
            '  <script defer src="https://www.googletagmanager.com/gtag/js?id=G-X"></script>\n</head>')

def v_gizlilik_fetch(k):
    duzenle(k, "assets/js/app.js", "function kacir(s) {",
            'fetch("https://ornek.com/topla", { method: "POST" });\nfunction kacir(s) {')

def v_gizlilik_form(k):
    duzenle(k, "soru-cevap.html", "</main>",
            '<form action="https://ornek.com/soru"><input name="eposta"></form>\n</main>')

def v_gizlilik_cerez(k):
    duzenle(k, "assets/js/animasyon.js", "  function goster(el) {",
            '  document.cookie = "ziyaret=1";\n  function goster(el) {')

def v_gizlilik_paket(k):
    with open(os.path.join(k, "package.json"), "w", encoding="utf-8") as f:
        f.write('{ "name": "kanli-goz", "scripts": { "build": "vite build" } }\n')

def v_baglanti_kimlik_degisti(k):
    """Karakterin kimliği değişti; efsane.html ve mafya.html'deki derin bağlantı koptu."""
    duzenle(k, "assets/js/data.js", 'id: "kameraci-baris",', 'id: "kameraci",')

def v_baglanti_paylasim_gorseli(k):
    duzenle(k, "index.html", "og-kanli-goz.png", "og-kanli-goz.jpg")

def v_baglanti_data_yolu(k):
    duzenle(k, "assets/js/data.js", 'yol: "irade.html",', 'yol: "irada.html",')

def v_capa_satir_kaydi(k):
    """LORE.md'nin başına iki satır girdi: altın setin bütün satırları kaydı."""
    duzenle(k, "LORE.md", "# Kanlı Göz — Evren Kaynağı (Canon)\n",
            "# Kanlı Göz — Evren Kaynağı (Canon)\n\nYeni bir giriş paragrafı.\n")

def v_capa_gercek_silindi(k):
    """Altın gerçek canon'dan tamamen çıktı — düzeltme değil, karar."""
    duzenle(k, "LORE.md", "1735", "1736", sayi=-1)

def v_kanca_sozdizimi(k):
    with open(os.path.join(k, ".claude", "kanca.py"), "a", encoding="utf-8") as f:
        f.write("\ndef bozuk( sozdizimi\n")

def v_kanca_olmayan_betik(k):
    duzenle(k, ".claude/settings.json", "kanca-gorev.py", "kanca-gorevi.py")

def v_mandal_esik_dustu(k):
    duzenle(k, ".claude/degerlendir.py", "ESIK_ISABET3 = 0.90", "ESIK_ISABET3 = 0.80")

def v_mandal_vaka_silindi_belge_de(k):
    """Vaka silindi VE belge buna göre düzeltildi — `belge` bunu tutarlı görür.

    Tutarlı bir gerileme yine de gerilemedir; sadece mandal yakalayabilir.
    """
    duzenle(k, ".claude/sinav.py",
            '    ("MASUM: belgeye alakasız cümle",     m_belge_alakasiz_duzenleme,     None),\n', "")
    p = os.path.join(k, ".claude", "DONGULER.md")
    s = open(p, encoding="utf-8").read()
    yeni, adet = re.subn(
        r"\*\*(\d+) vaka(\s*)\((\d+) yakalanmalı, (\d+) masum\)\*\*",
        lambda m: f"**{int(m.group(1)) - 1} vaka{m.group(2)}({m.group(3)} yakalanmalı, "
                  f"{int(m.group(4)) - 1} masum)**", s, count=1)
    if not adet:
        raise AssertionError("DONGULER.md'de vaka sayısı cümlesi bulunamadı")
    open(p, "w", encoding="utf-8").write(yeni)

def v_mandal_kesici_sinir_buyudu(k):
    duzenle(k, ".claude/kanca.py", '"--sinir", "3"', '"--sinir", "30"')

def v_belge_tanimsiz_atif(k):
    """Kaynakçada olmayan bir kaynağa atıf. (Atıf burada parça parça yazılıyor:
    düz yazılsa bu dosyanın kendisi tanımsız atıf taşırdı.)"""
    with open(os.path.join(k, ".claude", "DONGULER.md"), "a", encoding="utf-8") as f:
        f.write("\nBu cümle bir kaynağa dayanıyor [K" + "99].\n")

def v_belge_adressiz_kaynak(k):
    p = os.path.join(k, ".claude", "DONGULER.md")
    s = open(p, encoding="utf-8").read()
    yeni, adet = re.subn(r"(?m)^- \*\*\[K12\]\*\*.*$", "- **[K12]** Wilson (1927).", s, count=1)
    if not adet:
        raise AssertionError("DONGULER.md'de [K12] tanımı yok")
    open(p, "w", encoding="utf-8").write(yeni)

def v_belge_atifsiz_kaynak(k):
    with open(os.path.join(k, ".claude", "DONGULER.md"), "a", encoding="utf-8") as f:
        f.write("\n- **[K" + "98]** Hiçbir yerde kullanılmayan kaynak. https://ornek.org\n")

def v_erisim_dil_silindi(k):
    duzenle(k, "index.html", '<html lang="tr">', "<html>")

def v_erisim_altsiz_gorsel(k):
    duzenle(k, "index.html", "</main>", '<img src="assets/favicon.svg">\n</main>')

def v_erisim_sablonda_altsiz_gorsel(k):
    """JS ile basılan kapak görseli — HTML'de görünmez, şablonda durur."""
    duzenle(k, "assets/js/app.js", 'alt="" width="480"', 'width="480"')

def v_erisim_metinsiz_baglanti(k):
    duzenle(k, "soru-cevap.html", "</main>",
            '<a href="index.html"><span aria-hidden="true">→</span></a>\n</main>')

def v_erisim_yakinlastirma_kapali(k):
    duzenle(k, "irade.html", 'content="width=device-width, initial-scale=1"',
            'content="width=device-width, initial-scale=1, user-scalable=no"')

def v_erisim_bos_baslik(k):
    """Başlık etiketi duruyor ama boş: sekme ve ekran okuyucu adsız kalır."""
    duzenle(k, "404.html", "<title>Kayıt bulunamadı — Kanlı Göz</title>", "<title> </title>")

def v_erisim_baslik_atliyor(k):
    duzenle(k, "404.html", "<h1>Bu sayfa arşivde yok</h1>",
            "<h1>Bu sayfa arşivde yok</h1>\n    <h4>Atlanan düzey</h4>")

def v_mandal_araci_silindi(k):
    """Mandalın kendisini silmek bütün ölçüleri tek hamlede gevşetir."""
    os.remove(os.path.join(k, ".claude", "mandal.py"))

def v_belge_mutasyon_sayisi(k):
    p = os.path.join(k, ".claude", "DONGULER.md")
    s = open(p, encoding="utf-8").read()
    yeni, adet = re.subn(r"\*\*(\d+) mutasyon\*\*",
                         lambda m: f"**{int(m.group(1)) + 3} mutasyon**", s, count=1)
    if not adet:
        raise AssertionError("DONGULER.md'de '**N mutasyon**' kalıbı bulunamadı")
    open(p, "w", encoding="utf-8").write(yeni)

def v_belge_belgesiz_arac(k):
    with open(os.path.join(k, ".claude", "yeni-arac.py"), "w", encoding="utf-8") as f:
        f.write("print('kimse beni bilmiyor')\n")

def v_belge_denetim_tablosu(k):
    p = os.path.join(k, ".claude", "DONGULER.md")
    s = open(p, encoding="utf-8").read()
    yeni, adet = re.subn(r"(?m)^\| `gizlilik` \|.*\n", "", s, count=1)
    if not adet:
        raise AssertionError("DONGULER.md denetim tablosunda `gizlilik` satırı yok")
    open(p, "w", encoding="utf-8").write(yeni)

# --- otomatik mutantların bulduğu boşluklar ------------------------------
# `mutasyon.py --otomatik 0` denetleyiciyi operatörlerle bozdu; aşağıdaki her
# vaka, sınavın hiç denemediği bir dalı deniyor. O dal silinse ya da
# tersine çevrilse sınav yeşil kalıyordu.

def _belge_kalibi_boz(k, desen, ne):
    """Belgedeki sayı cümlesinin kalın işaretini sil: sayı yerinde, biçim yok."""
    p = os.path.join(k, ".claude", "DONGULER.md")
    s = open(p, encoding="utf-8").read()
    yeni, adet = re.subn(desen, lambda m: m.group(0).replace("**", ""), s, count=1)
    if not adet:
        raise AssertionError(f"DONGULER.md'de {ne} cümlesi bulunamadı")
    open(p, "w", encoding="utf-8").write(yeni)

def v_video_gecerli_baglanti(k):
    """Kısa YouTube adresi (youtu.be) biçimce geçerli — yine de insan onayı ister."""
    duzenle(k, "assets/js/data.js", 'baslangic: { kimlik: "", baglanti: "", baslik: "" }',
            'baslangic: { kimlik: "", baglanti: "https://youtu.be/dQw4w9WgXcQ", baslik: "" }')

def v_kontrast_zemin_yok(k):
    """Zemin rengi yoksa ölçüm yapılamaz — sessizce geçmek ölçülmüş gibi görünür."""
    duzenle(k, "assets/css/style.css", "  --bg: #0a0a0c;\n", "")

def v_kontrast_kotu_metin(k):
    """Kötü taraf metnine kan rengi geri döndü: 3.35:1. Sadece --bg'ye karşı ölçülür."""
    duzenle(k, "assets/css/style.css", "--kotu-metin: #e04d44;", "--kotu-metin: #c0271f;")

def v_kontrast_kart_zemini(k):
    """Kart zemini açıldı: --text-3 ana zeminde 5.0:1 geçer, kartta 4.13:1 kalır."""
    duzenle(k, "assets/css/style.css", "--bg-3: #17171e;", "--bg-3: #1f1f28;")

def v_lore_tabloda_satir_yok(k):
    duzenle(k, "LORE.md", "| 42 | Konya | **Telipinu** |", "| 420 | Konya | **Telipinu** |")

def v_veri_gecersiz_taraf(k):
    duzenle(k, "assets/js/data.js", "unvan: \"Kanlı Göz'ün Taşıyıcısı\",\n    taraf: \"iyi\",",
            "unvan: \"Kanlı Göz'ün Taşıyıcısı\",\n    taraf: \"kahraman\",")

def v_veri_il_eksik(k):
    duzenle(k, "assets/js/data.js",
            '  { plaka: 42, il: "Konya", komutan: "orta", ad: "Telipinu", '
            'kim: "öfkelenip kaybolan bereket tanrısı" },\n', "")

def v_veri_olmayan_komutan(k):
    duzenle(k, "assets/js/data.js", 'il: "Konya", komutan: "orta"', 'il: "Konya", komutan: "kuzey"')

def v_gizlilik_parola(k):
    """Form olmadan da giriş alanı eklenebilir — form denetimi bunu görmez."""
    duzenle(k, "soru-cevap.html", "</main>",
            '<label>Şifre <input type="password" name="sifre"></label>\n</main>')

def v_gizlilik_dis_stil(k):
    duzenle(k, "index.html", '  <link rel="stylesheet" href="assets/css/style.css">',
            '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">\n'
            '  <link rel="stylesheet" href="assets/css/style.css">')

def v_gizlilik_css_import(k):
    """Yazı tipi CSS içinden de çekilebilir — HTML'de hiçbir iz kalmaz."""
    p = os.path.join(k, "assets", "css", "animasyon.css")
    s = open(p, encoding="utf-8").read()
    open(p, "w", encoding="utf-8").write(
        '@import url("https://fonts.googleapis.com/css2?family=Inter");\n' + s)

def v_kanca_bozuk_ayar(k):
    """Bozuk JSON bütün kancaları birden kapatır."""
    duzenle(k, ".claude/settings.json", "{", "{ bozuk,", 1)

def v_mandal_arac_ve_taban_silindi(k):
    """İkisi birden silinse de taban HEAD'de duruyor: silme yine görünür."""
    os.remove(os.path.join(k, ".claude", "mandal.py"))
    os.remove(os.path.join(k, ".claude", "mandal.json"))

def v_mandal_bozuk_arac(k):
    with open(os.path.join(k, ".claude", "mandal.py"), "a", encoding="utf-8") as f:
        f.write("\ndef bozuk( sozdizimi\n")

def v_mandal_esik_ifadeyle(k):
    """Eşik sabit yerine ifadeyle yazıldı: değer aynı, ama mandal artık okuyamıyor.
    Okunamayan ölçü korunmayan ölçüdür — sessizce geçilmemeli."""
    duzenle(k, ".claude/degerlendir.py", "ESIK_ISABET3 = 0.90", 'ESIK_ISABET3 = float("0.90")')

def v_belge_sinav_bozuk(k):
    """Ölçülen araç bozulunca denetleyici çökmemeli, bozukluğu söylemeli."""
    with open(os.path.join(k, ".claude", "sinav.py"), "a", encoding="utf-8") as f:
        f.write("\ndef bozuk( sozdizimi\n")

def v_belge_vaka_cumlesi_yok(k):
    _belge_kalibi_boz(k, r"\*\*\d+ vaka\s*\n?\s*\(\d+ yakalanmalı, \d+ masum\)\*\*", "vaka sayısı")

def v_belge_altin_cumlesi_yok(k):
    _belge_kalibi_boz(k, r"\*\*\d+ altın soru\*\*", "altın soru")

def v_belge_mutasyon_cumlesi_yok(k):
    _belge_kalibi_boz(k, r"\*\*\d+ mutasyon\*\*", "mutasyon sayısı")

def v_belge_belgesiz_komut(k):
    with open(os.path.join(k, ".claude", "commands", "yeni.md"), "w", encoding="utf-8") as f:
        f.write("# Yeni\n\nKimsenin bilmediği bir komut.\n")

# --- masum vakalar: bunlar yakalanmamalı --------------------------------

def m_degisiklik_yok(k):
    pass

def m_yorumda_outline(k):
    duzenle(k, "assets/css/style.css", ".kart:hover {",
            "/* Not: burada outline: none yazmıyoruz, odak halkası kalsın */\n.kart:hover {")

def m_focus_visible_outline(k):
    duzenle(k, "assets/css/style.css", ".kart:hover {",
            ".yeni-dugme:focus-visible { outline: 2px solid var(--kan-parlak); }\n.kart:hover {")

def m_svg_opacity(k):
    duzenle(k, "assets/js/goz.js", "function ", 'const p = `<circle opacity="0"/>`;\nfunction ', 1)

def m_gercek_video(k):
    duzenle(k, "assets/js/data.js", 'baslangic: { kimlik: "", baglanti: "", baslik: "" }',
            'baslangic: { kimlik: "dQw4w9WgXcQ", baglanti: "", baslik: "İlk bölüm" }')

def m_belge_alakasiz_duzenleme(k):
    """Belgeye sayı içermeyen bir cümle eklemek yanlış alarm üretmemeli."""
    with open(os.path.join(k, ".claude", "DONGULER.md"), "a", encoding="utf-8") as f:
        f.write("\n\nEk not: bu satırın hiçbir sayıyla ilgisi yok.\n")

def m_yorumda_fetch(k):
    """Yorum içindeki fetch() bir ağ isteği değildir."""
    duzenle(k, "assets/js/app.js", "function kacir(s) {",
            "// Not: fetch() kullanmıyoruz, site hiçbir yere istek atmaz.\nfunction kacir(s) {")

def m_dis_baglanti_gitmek(k):
    """Dışarıya BAĞLANTI vermek serbest; dışarıdan bir şey YÜKLEMEK değil."""
    duzenle(k, "soru-cevap.html", "</main>",
            '<p><a href="https://www.youtube.com/@mahmutguveloglu473" target="_blank" '
            'rel="noopener">Kanal</a></p>\n</main>')

def m_esik_sikilasti(k):
    """Mandal tek yönlüdür: sıkılaşma kapı açmaz."""
    duzenle(k, ".claude/degerlendir.py", "ESIK_KAPSAMA = 0.90", "ESIK_KAPSAMA = 0.95")

def m_susleme_gorseli_bos_alt(k):
    """Süs görseli alt="" taşır — bu bir eksik değil, doğru işaretleme."""
    duzenle(k, "index.html", "</main>", '<img src="assets/favicon.svg" alt="">\n</main>')

def m_etiketli_ikon_baglanti(k):
    """Metni olmayan ama aria-label taşıyan bağlantının bir adı vardır."""
    duzenle(k, "soru-cevap.html", "</main>",
            '<a href="index.html" aria-label="Ana sayfa"><span aria-hidden="true">←</span></a>\n</main>')

def m_lisans_baglantisi(k):
    """<link rel="license"> bir şey yüklemez — dışarıya işaret eder, o kadar."""
    duzenle(k, "index.html", '  <link rel="icon"',
            '  <link rel="license" href="https://creativecommons.org/licenses/by/4.0/">\n'
            '  <link rel="icon"')

def m_css_kendi_adresi(k):
    """Sitenin kendi mutlak adresi dış sunucu değildir."""
    with open(os.path.join(k, "assets", "css", "style.css"), "a", encoding="utf-8") as f:
        f.write('\n.kendi-adres { background: url("https://barisguveloglu-bit.github.io/'
                'kanal-sitesi/assets/favicon.svg"); }\n')

def m_yeni_karakter_lore_ile(k):
    """data.js'e karakter eklendi ve LORE.md'ye de eklendi — senkron."""
    duzenle(k, "assets/js/data.js", '    ad: "Sarı Gülücük",',
            '    ad: "Demirci Usta",')
    duzenle(k, "LORE.md", "# ", "# ", 1)
    with open(os.path.join(k, "LORE.md"), "a", encoding="utf-8") as f:
        f.write("\n\n## Demirci Usta\n\nYeni karakter.\n")


VAKALAR = [
    # (ad, islev, beklenen_denetim | None)
    ("menü: bağlantı silindi",            v_menu_eksik_link,              "menu"),
    ("menü: nav tamamen yok",             v_menu_nav_yok,                 "menu"),
    ("menü: bağlantı yanlış dosyaya",     v_menu_yanlis_hedef,            "menu"),
    ("harita: sayfa listelenmemiş",       v_harita_eksik,                 "harita"),
    ("harita: gizli.html sızdı",          v_harita_gizli_sizdi,           "harita"),
    ("gizleme: [hidden] kuralı silindi",  v_gizleme_kural_silindi,        "gizleme"),
    ("gizleme: JS'te opacity=0",          v_gizleme_opacity_js,           "gizleme"),
    ("odak: outline none",                v_odak_none,                    "odak"),
    ("odak: outline : 0 (boşluklu)",      v_odak_sifir_bosluklu,          "odak"),
    ("defer: kaldırıldı",                 v_defer_yok,                    "defer"),
    ("defer: async ile değiştirildi",     v_defer_async,                  "defer"),
    ("sahte: bozuk video kimliği",        v_sahte_bozuk_kimlik,           "sahte"),
    ("sahte: biçimi DOĞRU uydurma kimlik", v_sahte_gecerli_gorunumlu_kimlik, "video"),
    ("sahte: 'Yakında' başlığı",          v_sahte_yakinda_basligi,        "sahte"),
    ("sahte: YouTube olmayan bağlantı",   v_sahte_yanlis_site,            "sahte"),
    ("kontrast: --text-3 düşürüldü",      v_kontrast_metin,               "kontrast"),
    ("kontrast: --bolge-renk koyulaştı",  v_kontrast_bolge,               "kontrast"),
    ("lore: data.js'te uydurma karakter", v_lore_uydurma_karakter,        "lore"),
    ("belge: vaka sayısı kaydı",          v_belge_vaka_sayisi,            "belge"),
    ("belge: altın soru sayısı kaydı",    v_belge_altin_sayisi,           "belge"),
    ("belge: olmayan bölüme atıf",        v_belge_olmayan_bolum,          "belge"),
    ("belge: mutasyon sayısı kaydı",      v_belge_mutasyon_sayisi,        "belge"),
    ("belge: belgelenmemiş araç",         v_belge_belgesiz_arac,          "belge"),
    ("belge: denetim tablodan düştü",     v_belge_denetim_tablosu,        "belge"),

    ("gizleme: yeni dosyada opacity=0",   v_gizleme_opacity_yeni_dosya,   "gizleme"),
    ("odak: ikinci stil dosyası",         v_odak_ikinci_stil_dosyasi,     "odak"),
    ("lore: derebeyleri yer değiştirdi",  v_lore_derebeyi_yer_degisti,    "lore"),
    ("lore: uydurma komutan",             v_lore_uydurma_komutan,         "lore"),
    ("veri: derebeyi adı boş",            v_veri_derebeyi_bos,            "veri"),
    ("veri: yinelenen karakter kimliği",  v_veri_yinelenen_kimlik,        "veri"),
    ("gizlilik: analitik betiği",         v_gizlilik_analitik,            "gizlilik"),
    ("gizlilik: fetch ile veri gönderme", v_gizlilik_fetch,               "gizlilik"),
    ("gizlilik: form eklendi",            v_gizlilik_form,                "gizlilik"),
    ("gizlilik: çerez yazılıyor",         v_gizlilik_cerez,               "gizlilik"),
    ("gizlilik: paket yöneticisi",        v_gizlilik_paket,               "gizlilik"),
    ("bağlantı: karakter kimliği değişti", v_baglanti_kimlik_degisti,     "baglanti"),
    ("bağlantı: paylaşım görseli yok",    v_baglanti_paylasim_gorseli,    "baglanti"),
    ("bağlantı: data.js yolu kırık",      v_baglanti_data_yolu,           "baglanti"),
    ("çapa: LORE satırları kaydı",        v_capa_satir_kaydi,             "capa"),
    ("KAPI: altın gerçek canon'dan çıktı", v_capa_gercek_silindi,         "capa"),
    ("kanca: betikte sözdizimi hatası",   v_kanca_sozdizimi,              "kanca"),
    ("kanca: olmayan betiğe bağlı",       v_kanca_olmayan_betik,          "kanca"),
    ("KAPI: eşik düşürüldü",              v_mandal_esik_dustu,            "mandal"),
    ("KAPI: vaka silindi, belge uyduruldu", v_mandal_vaka_silindi_belge_de, "mandal"),
    ("KAPI: kesici sınırı büyütüldü",     v_mandal_kesici_sinir_buyudu,   "mandal"),
    ("KAPI: mandal aracı silindi",        v_mandal_araci_silindi,         "mandal"),
    ("belge: tanımsız atıf",              v_belge_tanimsiz_atif,          "belge"),
    ("belge: adressiz kaynak",            v_belge_adressiz_kaynak,        "belge"),
    ("belge: atıfsız kaynak",             v_belge_atifsiz_kaynak,         "belge"),
    ("erişim: sayfa dili silindi",        v_erisim_dil_silindi,           "erisim"),
    ("erişim: alt'sız görsel",            v_erisim_altsiz_gorsel,         "erisim"),
    ("erişim: şablonda alt'sız görsel",   v_erisim_sablonda_altsiz_gorsel, "erisim"),
    ("erişim: metinsiz bağlantı",         v_erisim_metinsiz_baglanti,     "erisim"),
    ("erişim: yakınlaştırma kapalı",      v_erisim_yakinlastirma_kapali,  "erisim"),
    ("erişim: başlık düzeyi atlıyor",     v_erisim_baslik_atliyor,        "erisim"),
    ("erişim: boş sayfa başlığı",         v_erisim_bos_baslik,            "erisim"),
    ("KAPI: geçerli youtu.be bağlantısı", v_video_gecerli_baglanti,       "video"),
    ("kontrast: --bg tanımı silindi",     v_kontrast_zemin_yok,           "kontrast"),
    ("kontrast: --kotu-metin kan rengi",  v_kontrast_kotu_metin,          "kontrast"),
    ("kontrast: kart zemini açıldı",      v_kontrast_kart_zemini,         "kontrast"),
    ("lore: il LORE tablosunda yok",      v_lore_tabloda_satir_yok,       "lore"),
    ("veri: geçersiz taraf",              v_veri_gecersiz_taraf,          "veri"),
    ("veri: il eksik (80/81)",            v_veri_il_eksik,                "veri"),
    ("veri: olmayan komutana bağlı",      v_veri_olmayan_komutan,         "veri"),
    ("gizlilik: parola alanı (formsuz)",  v_gizlilik_parola,              "gizlilik"),
    ("gizlilik: dış stil dosyası",        v_gizlilik_dis_stil,            "gizlilik"),
    ("gizlilik: CSS içinden @import",     v_gizlilik_css_import,          "gizlilik"),
    ("kanca: settings.json bozuk",        v_kanca_bozuk_ayar,             "kanca"),
    ("KAPI: mandal ve tabanı silindi",    v_mandal_arac_ve_taban_silindi, "mandal"),
    ("mandal: araçta sözdizimi hatası",   v_mandal_bozuk_arac,            "mandal"),
    ("mandal: eşik ifadeyle yazıldı",     v_mandal_esik_ifadeyle,         "mandal"),
    ("belge: sinav.py bozuk",             v_belge_sinav_bozuk,            "belge"),
    ("belge: vaka cümlesi biçimsiz",      v_belge_vaka_cumlesi_yok,       "belge"),
    ("belge: altın soru cümlesi biçimsiz", v_belge_altin_cumlesi_yok,     "belge"),
    ("belge: mutasyon cümlesi biçimsiz",  v_belge_mutasyon_cumlesi_yok,   "belge"),
    ("belge: belgelenmemiş komut",        v_belge_belgesiz_komut,         "belge"),

    ("MASUM: hiç değişiklik yok",         m_degisiklik_yok,               None),
    ("MASUM: yorumda fetch()",            m_yorumda_fetch,                None),
    ("MASUM: dışarıya bağlantı vermek",   m_dis_baglanti_gitmek,          None),
    ("MASUM: eşik sıkılaştı",             m_esik_sikilasti,               None),
    ("MASUM: süs görseli alt=\"\"",        m_susleme_gorseli_bos_alt,      None),
    ("MASUM: aria-label'lı ikon bağlantı", m_etiketli_ikon_baglanti,      None),
    ("MASUM: yorumda 'outline: none'",    m_yorumda_outline,              None),
    ("MASUM: :focus-visible outline",     m_focus_visible_outline,        None),
    ("MASUM: SVG dizesinde opacity=0",    m_svg_opacity,                  None),
    ("KAPI: gerçek video eklendi",        m_gercek_video,                 "video"),
    ("MASUM: karakter + LORE birlikte",   m_yeni_karakter_lore_ile,       None),
    ("MASUM: belgeye alakasız cümle",     m_belge_alakasiz_duzenleme,     None),
    ("MASUM: <link rel=license> dışarıya", m_lisans_baglantisi,           None),
    ("MASUM: CSS'te sitenin kendi adresi", m_css_kendi_adresi,            None),
]


def kopyala(hedef):
    shutil.copytree(KAYNAK, hedef)


def kos(kok):
    s = subprocess.run([sys.executable, os.path.join(kok, ".claude", "dogrula.py")],
                       cwd=kok, capture_output=True, text=True)
    return s.returncode, s.stdout + s.stderr


def main():
    gecti = basarisiz = 0
    satirlar = []
    for ad, islev, beklenen in VAKALAR:
        with tempfile.TemporaryDirectory() as gecici:
            kok = os.path.join(gecici, "depo")
            kopyala(kok)
            try:
                islev(kok)
            except AssertionError as e:
                satirlar.append(f"  ??  {ad}\n      {e}")
                basarisiz += 1
                continue
            kod, cikti = kos(kok)

            if beklenen is None:
                ok = kod == 0
                not_ = "temiz kaldı" if ok else f"YANLIŞ ALARM → {cikti.strip().splitlines()[1:2]}"
            else:
                yakalandi = kod != 0 and f"[{beklenen}]" in cikti
                ok = yakalandi
                if yakalandi:
                    ilk = [l.strip() for l in cikti.splitlines() if f"[{beklenen}]" in l][0]
                    not_ = ilk[:100]
                else:
                    not_ = "KAÇIRDI — denetleyici temiz dedi" if kod == 0 else \
                           f"yanlış başlıkta yakalandı: {cikti.strip().splitlines()[1:2]}"
                # KAPI vakası "hata" diye bildirilirse anlamı değişir: model
                # soru sormak yerine düzeltmeye girişir. Çıkış kodu da ölçülür.
                if ok and ad.startswith("KAPI") and kod != 3:
                    ok = False
                    not_ = f"kapı yerine hata olarak bildirildi (çıkış {kod}): {not_}"

            isaret = "OK " if ok else "FAIL"
            satirlar.append(f"  {isaret} {ad}\n       → {not_}")
            gecti += ok
            basarisiz += not ok

    print("\n".join(satirlar))
    print(f"\n{gecti}/{gecti + basarisiz} vaka beklendiği gibi davrandı.")
    return 1 if basarisiz else 0


if __name__ == "__main__":
    sys.exit(main())
