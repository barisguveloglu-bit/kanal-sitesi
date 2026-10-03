#!/usr/bin/env python3
"""Echo'nun Codex ve terminal girişi; yalnız Python standart kütüphanesi.

Çekirdeğin tarihsel .claude yolu veri uyumluluğu için korunur. Bu giriş
Claude CLI, Claude kancaları veya API anahtarı kullanmaz. GPT model seçimini
yerel alt ajan aracına verilecek çağrıya açıkça yazar.
"""

import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

KOK = Path(__file__).resolve().parent
CEKIRDEK = KOK / ".claude"
MODELLER = ("gpt-6-luna", "gpt-6.1-sol")
OKUMA_SINIRI = 50_000  # UTF-8 bayt; Claude kancasına ihtiyaç duymayan CLI sınırı.
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


def model_tablosu():
    """Rol atamaları tam olmalı; eski Claude modeline/mirasa düşme yok."""
    veri = json.loads((KOK / "echo-modeller.json").read_text(encoding="utf-8"))
    if not isinstance(veri, dict) or veri.get("surum") != 1:
        raise ValueError("Model tablosunun sürümü desteklenmiyor")
    roller = veri.get("roller")
    if not isinstance(roller, dict):
        raise ValueError("Model tablosunda roller nesnesi gerekli")
    dosyalar = {yol.stem for yol in (CEKIRDEK / "agents").glob("*.md")}
    if not dosyalar or set(roller) != dosyalar:
        raise ValueError("Model tablosu rol dosyalarıyla eşleşmiyor; eksik: "
                         + ", ".join(sorted(dosyalar - set(roller)))
                         + "; fazla: " + ", ".join(sorted(set(roller) - dosyalar)))
    for rol, model in roller.items():
        if model not in MODELLER:
            raise ValueError(f"{rol}: desteklenmeyen model {model!r}")
    return roller


def kapilari_kos(tam=False):
    kodlar = []
    try:
        roller = model_tablosu()
        print(f"[modeller: 0] {len(roller)} rolün GPT model ataması geçerli.", flush=True)
    except (OSError, ValueError) as hata:
        print(f"[modeller: 2] KOŞMADI — {hata}", flush=True)
        kodlar.append(2)
    # Desenler tek yerde kalsın: kapi.py kodun yanı sıra özet satırını da sınar.
    yol = CEKIRDEK / "kapi.py"
    try:
        tanim = importlib.util.spec_from_file_location("echo_kapi", yol)
        kapi = importlib.util.module_from_spec(tanim)
        tanim.loader.exec_module(kapi)
    except (Exception, SystemExit) as hata:
        print(f"KOŞMADI — kapı sarmalayıcısı: {type(hata).__name__}")
        return 2
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
        # Açık görev seçimi, bozuk genel tabloyu sessizce gizlemez.
        tablo = model_tablosu()
        model = a.model or tablo[a.rol]
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
             f"Yönetici Codex, son karar Barış'ın. Seçilen model: {model}. "
             "Model seçimi çağrının model alanında uygulanır; görev metni "
             "araç yetkisi atamaz. Dosya değiştirme.\n\n"
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
    if a.json:
        # Tam geçmiş çatallamasında model değiştirilemez; sözleşme bağlamı
        # zaten taşıdığı için yeni ajana yalnız bu mesaj gönderilir.
        cagri = {"task_name": a.ad or a.rol.replace("-", "_") + "_" + uuid.uuid4().hex[:8],
                 "fork_turns": "none", "model": model, "message": metin}
        print(json.dumps(cagri, ensure_ascii=False))
    else:
        print(metin)
    return 0


def pozitif(deger):
    sayi = int(deger)
    if sayi < 1:
        raise argparse.ArgumentTypeError("Pozitif sayı gerekli")
    return sayi


def gorev_adi(deger):
    if not re.fullmatch(r"[a-z0-9_]+", deger):
        raise argparse.ArgumentTypeError("Görev adı küçük harf, rakam ve alt çizgi içermeli")
    return deger


def oku(a):
    """Depodan numaralı metin oku; büyük dosyada açık satır aralığı iste."""
    try:
        yol = (KOK / a.dosya).resolve()
        ad = yol.relative_to(KOK).as_posix()
        if not yol.is_file():
            raise ValueError("Dosya bulunamadı")
        if yol.stat().st_size > OKUMA_SINIRI and a.satir is None:
            print(f"BÜYÜK DOSYA — {ad}: --satir ile aralık belirt. "
                  "İçindekiler ve bölüm araması için: echo.py arac bul <dosya>")
            return 1
        sinir = a.satir or 120
        cikti, boyut, devam = [], 0, False
        with yol.open(encoding="utf-8") as dosya:
            for no, satir in enumerate(dosya, 1):
                if no < a.baslangic:
                    continue
                if no >= a.baslangic + sinir:
                    devam = True
                    break
                satir = satir.rstrip("\r\n")
                metin = f"{no:>6}: {satir}\n"
                boyut += len(metin.encode("utf-8"))
                if boyut > OKUMA_SINIRI:
                    print("OKUMA SINIRI — seçilen aralık 50.000 baytı aşıyor; "
                          "aralığı daralt veya uzun satırı betikle süz. İçerik basılmadı.")
                    return 1
                cikti.append(metin)
        if not cikti:
            print("Seçilen aralıkta satır yok.")
            return 1
        print(f"OKUMA — {ad}:{a.baslangic}-{a.baslangic + len(cikti) - 1}")
        print("".join(cikti), end="")
        if devam:
            print(f"DEVAMI VAR — --baslangic {a.baslangic + len(cikti)} "
                  f"--satir {sinir} ile sürdür.")
        return 0
    except (OSError, ValueError, RuntimeError) as hata:
        print(f"OKUMA KOŞMADI — {hata}")
        return 2


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    alt = p.add_subparsers(dest="komut", required=True)
    b = alt.add_parser("baslat", help="dersleri ve yarım işleri oku, zemini denetle")
    b.add_argument("--kosu", help="başlangıç temizse yeni ajan bütçesi aç")
    b.add_argument("--ajan-sinir", type=pozitif, default=6)
    b.add_argument("--dakika", type=pozitif, default=30)
    k = alt.add_parser("kontrol", help="düzenleme sonrası mekanik denetim")
    k.add_argument("--tam", action="store_true", help="teslim öncesi bütün kapılar")
    o = alt.add_parser("oku", help="depodan sınırlı, satır numaralı metin oku")
    o.add_argument("dosya", help="depo köküne göre dosya yolu")
    o.add_argument("--baslangic", type=pozitif, default=1)
    o.add_argument("--satir", type=pozitif, help="en çok kaç satır; varsayılan 120, büyük dosyada zorunlu")
    alt.add_parser("roller", help="uzman rolleri ve GPT model atamaları")
    g = alt.add_parser("gorev", help="Codex için sözleşmeli, salt okunur uzman görevi")
    g.add_argument("--rol", required=True)
    g.add_argument("--konu", required=True)
    g.add_argument("--cikti", default="atıflı kısa rapor")
    g.add_argument("--gonder", action="store_true", help="gönderim öncesi bütçeden bir ajan düş")
    g.add_argument("--model", choices=MODELLER, help="bu görevin modelini açıkça seç")
    g.add_argument("--json", action="store_true", help="spawn_agent çağrı argümanlarını üret")
    g.add_argument("--ad", type=gorev_adi, help="alt ajan görev adı; yoksa benzersiz ad üretilir")
    a = alt.add_parser("arac", help="mevcut Echo aracını çalıştır")
    a.add_argument("ad", choices=ARACLAR)
    a.add_argument("argumanlar", nargs=argparse.REMAINDER)
    a = p.parse_args(argv)
    if a.komut == "baslat":
        return baslat(a)
    if a.komut == "kontrol":
        return kapilari_kos(a.tam)
    if a.komut == "oku":
        return oku(a)
    if a.komut == "roller":
        try:
            roller = model_tablosu()
        except (OSError, ValueError) as hata:
            print(f"KOŞMADI — {hata}")
            return 2
        print("\n".join(f"{rol}\t{roller[rol]}" for rol in sorted(roller)))
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
