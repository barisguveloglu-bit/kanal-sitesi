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

    ("MASUM: hiç değişiklik yok",         m_degisiklik_yok,               None),
    ("MASUM: yorumda 'outline: none'",    m_yorumda_outline,              None),
    ("MASUM: :focus-visible outline",     m_focus_visible_outline,        None),
    ("MASUM: SVG dizesinde opacity=0",    m_svg_opacity,                  None),
    ("KAPI: gerçek video eklendi",        m_gercek_video,                 "video"),
    ("MASUM: karakter + LORE birlikte",   m_yeni_karakter_lore_ile,       None),
    ("MASUM: belgeye alakasız cümle",     m_belge_alakasiz_duzenleme,     None),
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

            isaret = "OK " if ok else "FAIL"
            satirlar.append(f"  {isaret} {ad}\n       → {not_}")
            gecti += ok
            basarisiz += not ok

    print("\n".join(satirlar))
    print(f"\n{gecti}/{gecti + basarisiz} vaka beklendiği gibi davrandı.")
    return 1 if basarisiz else 0


if __name__ == "__main__":
    sys.exit(main())
