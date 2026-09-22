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
import sys


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
        return 0

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
