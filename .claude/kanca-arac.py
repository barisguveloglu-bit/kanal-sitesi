#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Araç çağrı sayacı (PostToolUse → Bash)
===============================================================
`olay.py dagit` bunu her Bash komutundan sonra çağırır. Komutta
`.claude/<araç>.py` geçiyorsa aracın çağrı sayısını, argparse kullanım
hatası döndüyse "yanlış çağrı" sayısını artırır. `arac-yuzeyi.py` bu
sayaçtan okur.

Neden: araç sınavı çağrıların DOĞRULUĞUNU ölçüyordu; araç sayısının
kendi maliyetini — hiç kullanılmayan ya da sürekli karıştırılan aracı —
ölçen veri yoktu. `olay-defteri.jsonl` yalnız kanca olaylarını tutuyor ve
Echo araçlarının asıl çağrıldığı yol olan Bash'i görmüyordu.

Sayaç DEPODA (`arac-sayac.json`), `.gitignore`'da değil: bulut
oturumunun kapsayıcısı her seferinde sıfırdan kuruluyor; yerel defter
hiçbir zaman birikmezdi. Satır satır kayıt değil, araç başına toplam —
diff küçük kalsın. Oturum kimliği ham tutulmaz, kısa özeti tutulur.

Asla akışı bozmaz: her hata yutulur, çıkış her zaman 0, çıktı yok.
"""

import hashlib
import json
import os
import re
import sys
from datetime import date

KLASOR = os.path.dirname(os.path.abspath(__file__))
SAYAC = os.path.join(KLASOR, "arac-sayac.json")

ARAC = re.compile(r"\.claude/([\w-]+)\.py\b")
# argparse'ın kullanım hatası (çıkış 2) ve elle yazılmış "Kullanım:" satırları.
YANLIS = re.compile(r"(^usage: |: error: (the following arguments|argument|unrecognized|invalid choice)"
                    r"|^Kullanım: )", re.M)


def _metin(yanit):
    if isinstance(yanit, dict):
        return "\n".join(str(yanit.get(k) or "") for k in ("stderr", "stdout"))
    return str(yanit or "")


def say(olay, yol=SAYAC):
    komut = (olay.get("tool_input") or {}).get("command") or ""
    araclar = sorted(set(ARAC.findall(komut)))
    if not araclar:
        return
    yanlis = bool(YANLIS.search(_metin(olay.get("tool_response"))))
    oturum = hashlib.sha1((olay.get("session_id") or "?").encode()).hexdigest()[:8]

    try:
        import fcntl
        kilit = open(yol + ".kilit", "w")
        fcntl.flock(kilit, fcntl.LOCK_EX)
    except (ImportError, OSError):
        kilit = None
    try:
        try:
            d = json.load(open(yol, encoding="utf-8"))
        except (OSError, ValueError):
            d = {}
        d.setdefault("_aciklama", "kanca-arac.py yazar, arac-yuzeyi.py okur; elle düzenleme.")
        genel = d.setdefault("oturum", {"sayi": 0, "son": ""})
        if genel.get("son") != oturum:
            genel["sayi"] = genel.get("sayi", 0) + 1
            genel["son"] = oturum
        tablo = d.setdefault("araclar", {})
        for ad in araclar:
            k = tablo.setdefault(ad, {"cagri": 0, "yanlis": 0, "oturum": 0, "son_oturum": ""})
            k["cagri"] += 1
            # Birden çok araç zincirlenmişse hatayı hangisinin verdiği
            # bilinemez; yalnız tek araçlı komutta yanlış sayılır.
            if yanlis and len(araclar) == 1:
                k["yanlis"] += 1
            if k.get("son_oturum") != oturum:
                k["oturum"] += 1
                k["son_oturum"] = oturum
            k["son"] = date.today().isoformat()
        d["araclar"] = dict(sorted(tablo.items()))
        with open(yol, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
            f.write("\n")
    finally:
        if kilit:
            kilit.close()


def main():
    try:
        say(json.loads(sys.stdin.read()))
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
