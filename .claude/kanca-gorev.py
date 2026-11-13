#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Alt ajan öncesi kanca
===============================================================
Sözleşmesiz görev gönderilmesini engeller.

`/orkestra` "ajana şunları söyle" diye yazıyordu. Yazı, uygulanmayan
kuraldır — hele ki uygulaması gereken taraf, acelesi olan taraf.
Devre kesicide olduğu gibi burada da kural süreç dışına taşındı:
brief eksikse görev hiç gönderilmiyor.

Engellenen üç eksik:

  uydurma yasağı      Ajan bilgi eksikse doldurmamalı, eksik olduğunu
                      söylemeli. Bu sistemin en büyük riski.
  canon kaynağı       Ajan sıfırdan başlar; LORE.md'yi ve ara.py'yi
                      okuması söylenmezse okumaz.
  atıf zorunluluğu    Kaynaksız gelen rapor doğrulanamaz; doğrulanamayan
                      rapor delil değildir.

Kanca sözleşmesi (PreToolUse):
  çıkış 0 → görev gönderilsin
  çıkış 2 → gönderilmesin, stderr Claude'a geri beslensin
"""

import json
import os
import subprocess
import sys

# Ana ajanla AYNI konteynerde, aynı çalışma ağacında koşan araçlar.
# create_session zaten ayrı bir bulut bilgisayarı açar, ona yalıtım sorulmaz.
AYNI_KONTEYNER = ("Agent", "Task")
YALITIMLI = ("worktree", "remote")


def kirli_agac(kok):
    """Commit edilmemiş değişiklik var mı. Bilemiyorsak engelleme."""
    try:
        s = subprocess.run(["git", "status", "--porcelain"], cwd=kok,
                           capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return False
    return s.returncode == 0 and bool(s.stdout.strip())


def yalitim_denetle(olay, girdi, metin, gorev, kok):
    """Yazma yetkili alt ajan ayrı bir çalışma ağacında koşmalı.

    Ayrıcalık ayrımı yapılamıyor: harness alt ajanın araçlarını
    kısıtlamaya izin vermiyor (DONGULER.md). Ama YALITIM yapılabiliyor.
    Aynı ağaçta koşan bir yazma ajanının hatası doğrudan ana ağaca düşer;
    ayrı ağaçta koşanınki doğrulanıp birleştirilene kadar orada kalır.
    """
    if olay.get("tool_name") not in AYNI_KONTEYNER or gorev.yetki_modu(metin) != "yazma":
        return 0
    yalitim = str(girdi.get("isolation") or "").strip()
    if yalitim not in YALITIMLI:
        print(
            "YALITIMSIZ YAZMA GÖREVİ — gönderilmedi.\n\n"
            "Bu görev `YETKİ: yazma` beyan ediyor ama ana çalışma ağacında "
            "koşacak: ajanın her hatası doğrudan Barış'ın ağacına düşer.\n\n"
            "Agent çağrısına `isolation: \"worktree\"` ekle — ajan ayrı bir "
            "çalışma ağacında çalışır, değişikliği sen doğrulayıp "
            "birleştirene kadar ana ağaca geçmez. İş uzun ya da birden çok "
            "yazma ajanı aynı anda çalışacaksa ayrı bulut oturumu "
            "(create_session) kullan. Salt okunur görevse brief'i "
            "`--mod okuma` ile üret.",
            file=sys.stderr)
        return 2
    if kirli_agac(kok):
        print(
            "YAZMA AJANI ESKİ KOD ÜZERİNDE ÇALIŞACAKTI — gönderilmedi.\n\n"
            "Ayrı çalışma ağacı son commit'ten (HEAD) açılır; commit "
            "edilmemiş değişiklikleri görmez. Ajan eski hâli düzenler, "
            "birleştirirken çakışma ya da sessiz geri alma çıkar.\n\n"
            "Önce çalışma ağacını commit et (`git status` temiz olsun), "
            "sonra görevi tekrar gönder. Uzak ortam (`remote`) kullanıyorsan "
            "dalı ayrıca push et.",
            file=sys.stderr)
        return 2
    return 0


def main():
    try:
        olay = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    girdi = olay.get("tool_input") or {}
    ham = girdi.get("prompt") or ""
    if not ham.strip():
        return 0

    kok = os.environ.get("CLAUDE_PROJECT_DIR") or olay.get("cwd") or os.getcwd()
    klasor = os.path.join(kok, ".claude")
    if not os.path.exists(os.path.join(klasor, "gorev.py")):
        return 0

    sys.path.insert(0, klasor)
    try:
        import gorev
    except Exception:
        return 0   # araç bozuksa akışı kilitleme

    metin = "\n".join(str(girdi.get(alan, "")) for alan in ("prompt", "description"))
    eksik = gorev.sozlesme_eksikleri(metin)
    if not eksik:
        return yalitim_denetle(olay, girdi, metin, gorev, kok)

    print(
        "SÖZLEŞMESİZ ALT AJAN GÖREVİ — gönderilmedi.\n\n"
        "Alt ajan sıfırdan başlar: senin bildiğin hiçbir şeyi bilmez, "
        "raporu düzgün Türkçeyle gelir ve doğru GÖRÜNÜR. Bu yüzden görev "
        "metninde şunlar açıkça yazmalı.\n\n"
        "Eksik olanlar: " + ", ".join(eksik) + "\n\n"
        "Hazır sözleşmeli brief üret:\n"
        '  python3 .claude/gorev.py brief --konu "<ne isteniyor>" '
        '--cikti "<beklenen çıktı>"\n\n'
        "Çıkan metni görevin başına koy, sonra tekrar dene. Ajanın raporu "
        "geldiğinde de doğrula:\n"
        "  python3 .claude/gorev.py dogrula --rapor <dosya> --deftere-yaz",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)   # kanca hiçbir koşulda oturumu kilitlemez
