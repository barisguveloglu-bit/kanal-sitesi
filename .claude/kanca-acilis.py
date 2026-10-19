#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Oturum açılış kancası (SessionStart)
===============================================================
Hafıza vardı; okunması modelin insafına kalmıştı.

`seyir.py` kararları ve çözülmemişleri, `hedef.py` değişmez hedefi,
`devre.py` açık halkaları, `geri-bildirim.jsonl` bekleyen kayıtları
tutuyor. Hepsi dosyada, hepsi git'te — ama yeni bir oturum (ya da bağlam
sıkıştırması sonrası aynı oturum) onları ancak model `ozet` çalıştırmayı
HATIRLARSA görüyordu. Hatırlamazsa, önceki koşunun "bunu deneme, işe
yaramadı" notu orada dururken aynı yol yeniden deneniyordu.

Nitekim dört canon kaydı iki aydır `acik` durumda bekliyordu ve hiçbir
döngü onları kimseye göstermiyordu.

Bu kanca o adımı modelden alır: oturum açılırken, sürdürülürken ve bağlam
sıkıştırıldıktan sonra kısa bir durum özeti bağlama girer. Ham iz değil,
seçilmiş bağlam — seyir.py'deki "Select" işleminin otomatiği.

Kural: kısa kalır. Uzun bir açılış özeti, önlemeye çalıştığı bağlam
şişmesinin kendisidir. Her bölüm sadece söyleyecek bir şeyi varsa basılır.

Kanca sözleşmesi (SessionStart):
  stdout JSON → hookSpecificOutput.additionalContext bağlama eklenir
  çıkış 0 her zaman — açılış kancası hiçbir koşulda oturumu durdurmaz
"""

import json
import os
import subprocess
import sys
from datetime import datetime

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KLASOR = os.path.join(KOK, ".claude")
EN_FAZLA_SATIR = 40
TAM_OLCUM_ARALIGI_GUN = 7


def kos(betik, *arg):
    yol = os.path.join(KLASOR, betik)
    if not os.path.exists(yol):
        return None
    try:
        return subprocess.run([sys.executable, yol, *arg], cwd=KOK,
                              capture_output=True, text=True, timeout=40)
    except (OSError, subprocess.SubprocessError):
        return None


def kirp(metin, satir):
    satirlar = [s for s in (metin or "").strip().splitlines() if s.strip()]
    return satirlar[:satir] + (["  …"] if len(satirlar) > satir else [])


def jsonl(yol):
    kayitlar = []
    if os.path.exists(yol):
        with open(yol, encoding="utf-8") as f:
            for satir in f:
                try:
                    kayitlar.append(json.loads(satir))
                except ValueError:
                    pass
    return kayitlar


def bolumler():
    # 1. Denetim — ağacın şu anki hâli.
    d = kos("dogrula.py", "--kisa")
    if d is not None:
        if d.returncode == 0:
            yield ["Denetim: TEMİZ."]
        elif d.returncode == 3:
            yield ["Denetim: İNSAN KAPISI AÇIK — kendi başına karar verme, Barış'a sor."] + \
                  kirp(d.stdout, 6)
        else:
            yield ["Denetim: KIRMIZI — önce bunu düzelt."] + kirp(d.stdout + d.stderr, 8)

    # 2. Değişmez hedef — açıksa ve kaymışsa en önemli bilgi budur.
    if os.path.exists(os.path.join(KLASOR, "hedef.json")):
        h = kos("hedef.py", "kontrol")
        if h is not None:
            yield ["Açık hedef (hedef.py kontrol):"] + kirp(h.stdout, 8)

    # 3. Seyir — kararlar ve çözülmemişler, ham iz değil.
    s = kos("seyir.py", "ozet")
    if s is not None and s.stdout.strip() and not s.stdout.startswith("Açık iş yok"):
        yield ["Açık iş (seyir.py ozet):"] + kirp(s.stdout, 14)

    # 4. Devre — kesilmiş ya da açık halka.
    v = kos("devre.py", "durum")
    if v is not None and "Açık halka yok" not in v.stdout:
        yield ["Açık devre (devre.py durum):"] + kirp(v.stdout, 6)

    # 5. Geri bildirim — bekleyen insan kararları.
    acik = [k for k in jsonl(os.path.join(KLASOR, "geri-bildirim.jsonl"))
            if k.get("durum") == "acik"]
    if acik:
        satirlar = [f"Bekleyen geri bildirim: {len(acik)} kayıt `acik` "
                    "(canon/kural kararı Barış'ta, sen kapatma):"]
        for k in acik[:3]:
            satirlar.append(f"  - [{k.get('tur')}] {k.get('soru')} ({k.get('tarih')})")
        if len(acik) > 3:
            satirlar.append(f"  … ve {len(acik) - 3} kayıt daha: .claude/geri-bildirim.jsonl")
        yield satirlar

    # 6. Dış halka ne zaman koştu — ölçülmeyen sistem çalışıyor sanılır.
    gecmis = [k for k in jsonl(os.path.join(KLASOR, "saglik-gecmisi.jsonl")) if k.get("tam")]
    if not gecmis:
        yield ["Tam ölçüm (saglik.py) hiç kaydedilmemiş: python3 .claude/saglik.py --kaydet"]
    else:
        son = gecmis[-1]
        try:
            gun = (datetime.now() - datetime.fromisoformat(son["tarih"])).days
        except (KeyError, ValueError):
            gun = None
        if son.get("durum") != "yesil":
            kirmizi = ", ".join(son.get("kirmizi") or []) or "ayrıntı yok"
            yield [f"Son tam ölçüm ({son.get('tarih')}) YEŞİL DEĞİLDİ: {kirmizi}"]
        elif gun is not None and gun >= TAM_OLCUM_ARALIGI_GUN:
            yield [f"Son tam ölçüm {gun} gün önce. Değişiklikten önce: "
                   "python3 .claude/saglik.py --kaydet"]


def main():
    try:
        json.load(sys.stdin)
    except (ValueError, json.JSONDecodeError):
        pass

    satirlar = ["KANLI GÖZ — oturum durumu (kanca-acilis.py, otomatik)"]
    for bolum in bolumler():
        satirlar.extend(bolum)
    satirlar = satirlar[:EN_FAZLA_SATIR]

    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": "\n".join(satirlar),
    }}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)
