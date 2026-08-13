#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Olay döngüsü (dağıtıcı)
===============================================================
Olay tabanlı döngü: sistem boşta bekler, bir olay gelince (dosya
düzenlendi, alt ajan gönderiliyor, oturum açıldı) onu ilgili işleyiciye
yönlendirir ve tekrar dinlemeye döner.

Bu depoda döngünün kendisi zaten vardı — Claude Code kancaları tam olarak
budur. Eksik olan iki şeydi:

1. **Dağıtıcı yoktu.** Her olay `settings.json` içinde ayrı bir betiğe
   sabitlenmişti. Yeni bir olay eklemek ayarı ve betiği birlikte
   değiştirmek demekti; hangi olayın hangi işleyiciye gittiği hiçbir yerde
   tek parça hâlde durmuyordu.
2. **Defter yoktu.** Bir kanca sessizce çalışmadığında bunu gösteren
   hiçbir iz kalmıyordu. Çalışmayan bir zorlama katmanı, çalışan bir
   zorlama katmanı gibi görünür — bu deponun tekrar tekrar yakaladığı
   hata sınıfı tam olarak bu.

Şimdi tek giriş var: bütün olaylar buraya düşer, buradan dağıtılır ve
her dağıtım deftere yazılır.

## Sözleşme korunuyor

    stdin  → JSON (hook_event_name, tool_name, tool_input, cwd ...)
    çıkış 0 → sessiz geç
    çıkış 2 → stderr içeriği Claude'a geri beslenir

Dağıtıcı bu sözleşmeyi **değiştirmez**, sadece taşır. Bir işleyici `2`
döndürürse dağıtıcı da `2` döndürür; birden fazla işleyici varsa
gerekçeler birleştirilir. Kendi içinde bir hata olursa **`0` döner** —
dağıtıcının bozulması oturumu kilitlememeli, bu katman zorlama katmanı
olsa da kilit değil.

    python3 .claude/olay.py dagit          # kanca bunu çağırır (stdin JSON)
    python3 .claude/olay.py tablo          # hangi olay hangi işleyiciye
    python3 .claude/olay.py defter --son 20
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime

KLASOR = os.path.dirname(os.path.abspath(__file__))
DEFTER = os.path.join(KLASOR, "olay-defteri.jsonl")
EN_FAZLA_KAYIT = 400  # defter sınırsız büyümesin; eski kayıt bilgi vermiyor

# Olay tablosu. Tek doğru burası — `settings.json` sadece bu dosyaya
# yönlendirir, hangi olayın nereye gittiğini artık ayar dosyası bilmez.
#
#   (olay adı, araç eşleştirici, işleyici betik, ne yapar)
DINLEYICILER = [
    ("PostToolUse", r"^(Edit|Write|MultiEdit|NotebookEdit)$", "kanca.py",
     "site dosyası düzenlendi → denetleyiciyi koştur (yansıt-iyileştir)"),
    ("PreToolUse", r"^(Agent|Task)$", "kanca-gorev.py",
     "alt ajan gönderiliyor → sözleşmesiz görevi engelle"),
]


def defter_yaz(kayit):
    """Defter yazımı asla akışı bozmamalı — hata yutulur, olay geçer."""
    try:
        kayitlar = []
        if os.path.exists(DEFTER):
            with open(DEFTER, encoding="utf-8") as f:
                kayitlar = [x for x in f if x.strip()]
        kayitlar.append(json.dumps(kayit, ensure_ascii=False) + "\n")
        with open(DEFTER, "w", encoding="utf-8") as f:
            f.writelines(kayitlar[-EN_FAZLA_KAYIT:])
    except OSError:
        pass


def dinleyicileri_bul(olay_adi, arac):
    return [d for d in DINLEYICILER
            if d[0] == olay_adi and re.match(d[1], arac or "")]


def dagit(a):
    ham = sys.stdin.read()
    try:
        olay = json.loads(ham)
    except (json.JSONDecodeError, ValueError):
        defter_yaz({"zaman": datetime.now().isoformat(timespec="seconds"),
                    "olay": "?", "arac": "?", "karar": "okunamadı"})
        return 0

    olay_adi = a.olay or olay.get("hook_event_name") or ""
    arac = olay.get("tool_name") or ""
    kok = os.environ.get("CLAUDE_PROJECT_DIR") or olay.get("cwd") or os.getcwd()

    eslesenler = dinleyicileri_bul(olay_adi, arac)
    if not eslesenler:
        # Dinleyicisi olmayan olay SESSİZCE KAYBOLMAZ. Kaybolursa "kanca
        # çalışmıyor mu, yoksa bu olay zaten dinlenmiyor mu" sorusu
        # cevaplanamaz hâle gelir.
        defter_yaz({"zaman": datetime.now().isoformat(timespec="seconds"),
                    "olay": olay_adi, "arac": arac, "karar": "dinleyicisi yok"})
        return 0

    gerekceler, kod = [], 0
    for _, _, betik, _ in eslesenler:
        yol = os.path.join(kok, ".claude", betik)
        if not os.path.exists(yol):
            defter_yaz({"zaman": datetime.now().isoformat(timespec="seconds"),
                        "olay": olay_adi, "arac": arac, "isleyici": betik,
                        "karar": "işleyici dosyası yok"})
            continue
        try:
            s = subprocess.run([sys.executable, yol], input=ham, cwd=kok,
                               capture_output=True, text=True, timeout=90)
        except (OSError, subprocess.SubprocessError) as e:
            defter_yaz({"zaman": datetime.now().isoformat(timespec="seconds"),
                        "olay": olay_adi, "arac": arac, "isleyici": betik,
                        "karar": f"çalıştırılamadı: {type(e).__name__}"})
            continue

        karar = {0: "geçti", 2: "geri besledi"}.get(s.returncode,
                                                    f"çıkış {s.returncode}")
        defter_yaz({"zaman": datetime.now().isoformat(timespec="seconds"),
                    "olay": olay_adi, "arac": arac, "isleyici": betik,
                    "karar": karar})
        if s.stdout:
            sys.stdout.write(s.stdout)
        if s.returncode == 2:
            kod = 2
            if s.stderr:
                gerekceler.append(s.stderr.rstrip())

    if kod == 2:
        print("\n\n".join(gerekceler), file=sys.stderr)
    return kod


def tablo(a):
    print("Olay tablosu — hangi olay hangi işleyiciye gidiyor\n")
    for olay_adi, esles, betik, ne in DINLEYICILER:
        var = "" if os.path.exists(os.path.join(KLASOR, betik)) else "  [DOSYA YOK]"
        print(f"  {olay_adi:14} {esles:36} → {betik}{var}")
        print(f"  {'':14} {ne}\n")
    print("Dinleyicisi olmayan olaylar sessizce düşmez, deftere "
          "'dinleyicisi yok' olarak yazılır.")
    return 0


def defter(a):
    if not os.path.exists(DEFTER):
        print("Defter boş — henüz olay dağıtılmadı.")
        return 0
    with open(DEFTER, encoding="utf-8") as f:
        kayitlar = [json.loads(x) for x in f if x.strip()]
    if a.karar:
        kayitlar = [k for k in kayitlar if k.get("karar") == a.karar]
    print(f"Son {min(a.son, len(kayitlar))} olay ({len(kayitlar)} kayıt)\n")
    for k in kayitlar[-a.son:]:
        isleyici = k.get("isleyici", "—")
        print(f"  {k['zaman']}  {k['olay']:13} {k['arac']:14} "
              f"{isleyici:16} {k['karar']}")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Echo olay döngüsü dağıtıcısı.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("dagit", help="stdin'deki olayı işleyicisine yönlendir")
    p.add_argument("--olay", help="olay adını elle ver (JSON'da yoksa)")
    p.set_defaults(islev=dagit)

    p = alt.add_parser("tablo", help="olay → işleyici tablosu")
    p.set_defaults(islev=tablo)

    p = alt.add_parser("defter", help="dağıtım geçmişi")
    p.add_argument("--son", type=int, default=20)
    p.add_argument("--karar", help="sadece bu kararı süz (örn. 'geri besledi')")
    p.set_defaults(islev=defter)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Exception:
        # Dağıtıcının kendi hatası oturumu kilitlemez.
        sys.exit(0)
