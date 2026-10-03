#!/usr/bin/env python3
"""Echo'nun Codex ve terminal girişi; yalnız Python standart kütüphanesi.

Çekirdeğin tarihsel .claude yolu veri uyumluluğu için korunur. Bu giriş
Claude CLI, Claude kancaları, model adı veya API anahtarı kullanmaz.
"""

import argparse
import importlib.util
import os
from pathlib import Path
import re
import subprocess
import sys

KOK = Path(__file__).resolve().parent
CEKIRDEK = KOK / ".claude"
HIZLI = ("dogrula", "butunluk", "degerlendir")
TAM = HIZLI + ("sinav", "arac-sinavi", "ders-bayat", "iz-coken", "golge")
ARACLAR = (
    "ablasyon", "ara", "bekci", "bul", "butce", "butunluk", "defter",
    "degerlendir", "ders", "devre", "dogrula", "duman", "elestirmen",
    "eniyile", "etki", "evrim", "geri-bildirim", "golge", "gorev",
    "havuz", "hedef", "iz", "kapi", "logo", "mutasyon", "ozellik",
    "pano", "rapor", "seyir", "sinav", "surum", "tdd", "tirmanma", "yargi",
)

# Normal sys.exit(1/3/4) sözleşmesini koru; beklenmeyen Python hatasını
# kural ihlali (1) yerine araç arızası (2) olarak taşı.
KOSUCU = """import os, runpy, sys, traceback
yol = sys.argv[1]
sys.argv = sys.argv[1:]
sys.path[0] = os.path.dirname(yol)
try:
    runpy.run_path(yol, run_name='__main__')
except Exception:
    traceback.print_exc()
    sys.exit(2)
"""


def calistir(ad, *argumanlar, girdi=None):
    """Kabuk açmadan çekirdeği çağır; eksik/çöken araç başarı sayılmaz."""
    yol = CEKIRDEK / (ad + ".py")
    if not yol.is_file():
        return 2, f"KOŞMADI — {yol.relative_to(KOK)} yok.\n"
    try:
        sonuc = subprocess.run(
            [sys.executable, "-c", KOSUCU, str(yol), *argumanlar], cwd=KOK,
            input=girdi, capture_output=True, text=True, timeout=1500,
        )
    except (OSError, subprocess.TimeoutExpired) as hata:
        return 2, f"KOŞMADI — {ad}: {type(hata).__name__}\n"
    kod = sonuc.returncode if sonuc.returncode in (0, 1, 2, 3, 4) else 2
    cikti = sonuc.stdout + sonuc.stderr
    if kod == 2:
        cikti += f"\nKOŞMADI — {ad}, çıkış {sonuc.returncode}.\n"
    return kod, cikti


def yaz(sonuc):
    kod, cikti = sonuc
    print(cikti, end="" if cikti.endswith("\n") else "\n", flush=True)
    return kod


def birlestir(kodlar):
    # Hepsi ayrı ayrı basılır; toplu sonuçta araç arızası önceliklidir.
    return next((kod for kod in (2, 4, 1, 3) if kod in kodlar), 0)


def kapilari_kos(tam=False):
    # Desenler tek yerde kalsın: kapi.py kodun yanı sıra özet satırını da sınar.
    yol = CEKIRDEK / "kapi.py"
    try:
        tanim = importlib.util.spec_from_file_location("echo_kapi", yol)
        kapi = importlib.util.module_from_spec(tanim)
        tanim.loader.exec_module(kapi)
    except (OSError, ImportError, SyntaxError, SystemExit, AttributeError) as hata:
        print(f"KOŞMADI — kapı sarmalayıcısı: {type(hata).__name__}")
        return 2
    kodlar = []
    for ad in TAM if tam else HIZLI:
        try:
            kod, cikti = kapi.kos(ad)
            ozet = kapi.ozet_satiri(ad, cikti) if kod == 0 else cikti.rstrip()
        except (Exception, SystemExit) as hata:
            kod, ozet = 2, f"KOŞMADI — {type(hata).__name__}"
        if kod not in (0, 1, 2, 3):
            kod = 2
        print(f"[{ad}: {kod}] {ozet}", flush=True)
        kodlar.append(kod)
    return birlestir(kodlar)


def baslat(a):
    print("ECHO / CODEX — hafıza ve başlangıç denetimi", flush=True)
    if os.environ.get("ECHO_KAPALI", "").strip() not in ("", "0"):
        print("ECHO_KAPALI açık: Claude kancaları kapalı. Bu açıkça istenen "
              "terminal denetimi yine çalışır; kontroller sessizce atlanmaz.")
    kodlar = []
    for arac, komut, baslik in (("ders", "oku", "DERS DEFTERİ"),
                               ("defter", "ozet", "İŞ DEFTERİ")):
        kod, cikti = calistir(arac, komut)
        if kod == 0 and baslik not in cikti:
            kod, cikti = 2, cikti + f"\nKOŞMADI — {arac} beklenen özeti üretmedi.\n"
        kodlar.append(yaz((kod, cikti)))
    kodlar.append(kapilari_kos())
    kod = birlestir(kodlar)
    if kod == 0 and a.kosu:
        kod = yaz(calistir("butce", "ac", "--kosu", a.kosu,
                          "--ajan-sinir", str(a.ajan_sinir), "--dakika", str(a.dakika)))
    return kod


def rol_metni(ad):
    # Ajan tanımları kod değildir. Claude'a ait YAML izinleri/model seçimi
    # Codex'e taşınmaz; yalnız görev metni kullanılır.
    if not re.fullmatch(r"[a-z0-9-]+", ad):
        raise ValueError("Geçersiz rol adı")
    metin = (CEKIRDEK / "agents" / (ad + ".md")).read_text(encoding="utf-8")
    eslesme = re.match(r"\A---\n.*?\n---\n", metin, re.S)
    if not eslesme:
        raise ValueError("Rol başlığı okunamadı")
    metin = metin[eslesme.end():].strip()
    degisimler = {
        "CLAUDE.md": "AGENTS.md",
        "uzman ajanlar  →  Codex  →  Opus 5  →  Barış": "uzman ajanlar → Codex → Barış",
        "Sonnet ve Opus kadrosunun": "diğer uzmanların",
        "`Read`": "dosya okuma aracı",
        "`Grep`": "`rg`",
    }
    for eski, yeni in degisimler.items():
        metin = metin.replace(eski, yeni)
    return metin


def gorev(a):
    try:
        rol = rol_metni(a.rol)
    except (OSError, ValueError) as hata:
        print(f"Görev hazırlanamadı: {hata}")
        return 2
    kod, sozlesme = calistir("gorev", "brief", "--konu", a.konu,
                            "--cikti", a.cikti, "--mod", "okuma")
    if kod:
        return yaz((kod, sozlesme))
    sozlesme = sozlesme.replace("CLAUDE.md", "AGENTS.md").replace(
        "`.claude/DONGULER.md` — çalışma döngüsü", "`ECHO.md` — Codex çalışma döngüsü")
    metin = ("# Codex uzman görevi\n\n"
             "Yönetici Codex, son karar Barış'ın. Ana oturumun modelini kullan; "
             "bu rol model veya araç yetkisi atamaz. Dosya değiştirme.\n\n"
             + sozlesme + "\n## Uzmanlık\n\n" + rol + "\n")
    kod, cikti = calistir("gorev", "denetle", "--metin", "-", girdi=metin)
    if kod:
        return yaz((kod, cikti))
    # Önizleme bütçe tüketmez. Gönderim için açık bütçe zorunludur.
    if a.gonder:
        if not (CEKIRDEK / "butce-durumu.json").is_file():
            print('Açık bütçe yok. Önce: python3 echo.py arac butce ac --kosu "<iş>"')
            return 1
        kod, cikti = calistir("butce", "ajan", "--ad", a.rol)
        print(cikti, end="", file=sys.stderr)
        if kod:
            return kod
    print(metin)
    return 0


def pozitif(deger):
    sayi = int(deger)
    if sayi < 1:
        raise argparse.ArgumentTypeError("Pozitif sayı gerekli")
    return sayi


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    alt = p.add_subparsers(dest="komut", required=True)
    b = alt.add_parser("baslat", help="dersleri ve yarım işleri oku, zemini denetle")
    b.add_argument("--kosu", help="başlangıç temizse yeni ajan bütçesi aç")
    b.add_argument("--ajan-sinir", type=pozitif, default=6)
    b.add_argument("--dakika", type=pozitif, default=30)
    k = alt.add_parser("kontrol", help="düzenleme sonrası mekanik denetim")
    k.add_argument("--tam", action="store_true", help="teslim öncesi bütün kapılar")
    alt.add_parser("roller", help="kullanılabilir uzman rolleri")
    g = alt.add_parser("gorev", help="Codex için sözleşmeli, salt okunur uzman görevi")
    g.add_argument("--rol", required=True)
    g.add_argument("--konu", required=True)
    g.add_argument("--cikti", default="atıflı kısa rapor")
    g.add_argument("--gonder", action="store_true", help="gönderim öncesi bütçeden bir ajan düş")
    a = alt.add_parser("arac", help="mevcut Echo aracını çalıştır")
    a.add_argument("ad", choices=ARACLAR)
    a.add_argument("argumanlar", nargs=argparse.REMAINDER)
    a = p.parse_args(argv)
    if a.komut == "baslat":
        return baslat(a)
    if a.komut == "kontrol":
        return kapilari_kos(a.tam)
    if a.komut == "roller":
        roller = sorted((CEKIRDEK / "agents").glob("*.md"))
        if not roller:
            print("KOŞMADI — uzman rolleri bulunamadı.")
            return 2
        print("\n".join(yol.stem for yol in roller))
        return 0
    if a.komut == "gorev":
        return gorev(a)
    argumanlar = a.argumanlar
    if argumanlar[:1] == ["--"]:
        argumanlar = argumanlar[1:]
    sahip_verildi = any(x == "--sahip" or x.startswith("--sahip=") for x in argumanlar)
    if a.ad == "devre" and argumanlar[:1] == ["dene"] and not sahip_verildi:
        sahip = os.environ.get("ECHO_SESSION_ID") or os.environ.get("CODEX_THREAD_ID")
        if sahip:
            argumanlar += ["--sahip", sahip]
        else:
            print("Oturum kimliği yok; --sahip veya ECHO_SESSION_ID gerekli.")
            return 2
    return yaz(calistir(a.ad, *argumanlar))


if __name__ == "__main__":
    sys.exit(main())
