#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Düzenleme sonrası kanca
===============================================================
"Yansıt-İyileştir" döngüsünü otomatik hâle getirir.

Claude site dosyalarından birini her düzenlediğinde bu betik çalışır,
dogrula.py'yi çağırır ve hata varsa sonucu Claude'a geri besler.
Böylece düzeltme, insan fark etmeden aynı tur içinde olur.

Kanca sözleşmesi:
  stdin  → JSON (tool_name, tool_input, cwd ...)
  çıkış 0 → sessiz geç
  çıkış 2 → stderr içeriği Claude'a geri beslenir
"""

import json
import os
import subprocess
import sys

# Sadece sitenin kendi dosyaları döngüyü tetikler.
# .claude/ altındaki düzenlemeler ve dokümanlar denetime girmez.
IZLENEN_UZANTILAR = (".html", ".css", ".js", ".xml")
IZLENEN_DOSYALAR = ("LORE.md",)


def izleniyor_mu(yol, kok):
    if not yol:
        return False
    yol = os.path.abspath(yol)
    if not yol.startswith(os.path.abspath(kok) + os.sep):
        return False
    if os.sep + ".claude" + os.sep in yol:
        return False
    return yol.endswith(IZLENEN_UZANTILAR) or os.path.basename(yol) in IZLENEN_DOSYALAR


def main():
    try:
        olay = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0  # okunamayan olay yüzünden akışı kesme

    kok = os.environ.get("CLAUDE_PROJECT_DIR") or olay.get("cwd") or os.getcwd()
    girdi = olay.get("tool_input") or {}

    yollar = [girdi.get("file_path") or girdi.get("notebook_path")]
    for duzenleme in girdi.get("edits") or []:
        yollar.append(duzenleme.get("file_path"))

    if not any(izleniyor_mu(y, kok) for y in yollar):
        return 0

    betik = os.path.join(kok, ".claude", "dogrula.py")
    if not os.path.exists(betik):
        return 0

    sonuc = subprocess.run(
        [sys.executable, betik, "--kisa"],
        cwd=kok, capture_output=True, text=True, timeout=60,
    )
    if sonuc.returncode == 0:
        return 0

    print(
        "Denetleyici bu düzenlemeden sonra hata buldu. Turu bitirmeden önce "
        "düzelt, sonra `python3 .claude/dogrula.py` ile tekrar doğrula.\n\n"
        + (sonuc.stdout or "") + (sonuc.stderr or ""),
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Kanca hiçbir koşulda oturumu kilitlememeli.
        sys.exit(0)
