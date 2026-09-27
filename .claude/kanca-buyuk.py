#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Büyük dosya freni (PreToolUse → Read)
===============================================================
Oturum limitini asıl tüketen, pencereye bir kez giren metnin oturum
bitene kadar HER mesajla yeniden gönderilmesidir. Bu depoda
`arac-sinavi.py` ~156 KB, `DONGULER.md` ~98 KB: tamamını okumak
oturumun geri kalanına onlarca bin token ekler, ve çoğu zaman gereken
tek bir fonksiyon ya da bölümdür.

Sınırın üstündeki bir dosya `offset`/`limit` VERİLMEDEN okunmak
istenirse okuma durdurulur (çıkış 2) ve `bul.py`'ye yönlendirilir.
Aralık verilen okuma serbest: bilerek istenen parça pahalı değildir.

Kanca sözleşmesi: stdin JSON; çıkış 0 geçir, 2 durdur (stderr Claude'a
gider). Kendi hatası akışı kilitlemez.
"""

import json
import os
import sys

SINIR = 50_000   # bayt; LORE.md (~21 KB) ve data.js (~26 KB) altında kalır


def main():
    try:
        olay = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    girdi = olay.get("tool_input") or {}
    yol = girdi.get("file_path") or ""
    if not yol or girdi.get("limit") or girdi.get("offset"):
        return 0
    try:
        boyut = os.path.getsize(yol)
    except OSError:
        return 0
    if boyut <= SINIR:
        return 0
    ad = os.path.relpath(yol, os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
    print(f"BÜYÜK DOSYA — {ad} {boyut // 1000} KB (~{boyut // 3300} bin token). "
          "Tamamı okunmadı: okunan metin oturum bitene kadar her mesajla "
          "yeniden gönderilir.\n"
          f"  içindekiler : python3 .claude/bul.py {ad}\n"
          f"  tek bölüm   : python3 .claude/bul.py {ad} <ad>\n"
          f"  arama       : python3 .claude/bul.py {ad} --ara <söz>\n"
          "  ya da Read'e offset/limit ver.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)
