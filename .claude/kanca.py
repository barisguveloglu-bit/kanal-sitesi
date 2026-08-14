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

# Kör araçlar: dosyayı BAŞKA bir ajanın süreci içinde değiştirenler.
# Codex MCP üzerinden çağrıldığında tool_input yalnızca istem metnini taşır,
# dosya yolu taşımaz — "hangi dosyaya dokunuldu" sorusu buradan cevaplanamaz.
# Bilinmeyeni "dokunulmadı" saymak denetimi delegasyonla atlatılabilir hâle
# getirirdi: Claude'un kendi eli bağlıyken Codex'e yaptırmak serbest kalırdı.
# Bu yüzden kör bir araçtan sonra denetim koşulsuz çalışır.
KOR_ARACLAR = ("mcp__codex__",)


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

    kor = (olay.get("tool_name") or "").startswith(KOR_ARACLAR)
    if not kor and not any(izleniyor_mu(y, kok) for y in yollar):
        return 0

    betik = os.path.join(kok, ".claude", "dogrula.py")
    if not os.path.exists(betik):
        return 0

    sonuc = subprocess.run(
        [sys.executable, betik, "--kisa"],
        cwd=kok, capture_output=True, text=True, timeout=60,
    )

    devre = os.path.join(kok, ".claude", "devre.py")

    def sayaci_sifirla():
        if os.path.exists(devre):
            subprocess.run([sys.executable, devre, "basari", "--halka", "denetim"],
                           cwd=kok, capture_output=True, text=True, timeout=30)

    if sonuc.returncode == 0:
        # Temiz çıktı: düzeltme halkası kapandı, sayaç sıfırlansın.
        sayaci_sifirla()
        return 0

    if sonuc.returncode == 3:
        # İnsan kapısı BAŞARISIZLIK DEĞİLDİR: kural ihlali yok, sadece
        # doğruluğu betikle bilinemeyen bir şey var. Sayacı artırmak,
        # soru sormayı cezalandırmak olurdu — üst üste birkaç kapı olayı
        # devreyi kesip modeli susturabilirdi. Tam tersi: düzeltme halkası
        # kapandı demektir, sayaç sıfırlanır.
        sayaci_sifirla()
        print(
            "Bu düzenleme insan onayı isteyen bir noktaya dokundu. Kural "
            "ihlali yok — ama denetleyici bunun doğru olduğunu DOĞRULAYAMIYOR. "
            "Kendi başına devam etme: `AskUserQuestion` ile Barış'a sor."
            "\n\n" + (sonuc.stdout or "") + (sonuc.stderr or ""),
            file=sys.stderr)
        return 2

    # Denetim düştü. Kaçıncı kez düştüğünü sayan taraf model değil, dosya —
    # yoksa "bu sefer çözerim" diyerek sonsuza kadar dönebilir.
    # Nota GERÇEK hata imzası yazılır, genel bir cümle değil. Sebebi:
    # devre kesicinin ilerleme denetimi bu notlara bakıyor. Her tur aynı
    # genel cümle yazılırsa "aynı hatada saplandım" ile "her turda başka
    # bir hata düzeltiyorum" ayırt edilemez — birincisi durmalı, ikincisi
    # devam etmeli.
    ilk_hata = "denetim düştü"
    for satir in (sonuc.stdout or "").splitlines():
        if satir.strip().startswith("["):
            ilk_hata = satir.strip()[:90]
            break

    if os.path.exists(devre):
        kesici = subprocess.run(
            [sys.executable, devre, "dene", "--halka", "denetim", "--sinir", "3",
             "--not", ilk_hata],
            cwd=kok, capture_output=True, text=True, timeout=30)
        if kesici.returncode == 1:
            print("DEVRE KESİLDİ — bu düzenleme turunda denetim üst üste "
                  "çok kez düştü.\n\nDÜZELTMEYE DEVAM ETME. Dur ve Barış'a çık: "
                  "neyi çözemediğini, ne denediğini ve hangi kararın eksik "
                  "olduğunu söyle.\n\n"
                  + (kesici.stdout or "") + "\n" + (sonuc.stdout or ""),
                  file=sys.stderr)
            return 2

    basli = (
        "Denetleyici bu düzenlemeden sonra hata buldu. Turu bitirmeden "
        "önce düzelt, sonra `python3 .claude/dogrula.py` ile tekrar doğrula."
    )

    print(basli + "\n\n" + (sonuc.stdout or "") + (sonuc.stderr or ""),
          file=sys.stderr)
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Kanca hiçbir koşulda oturumu kilitlememeli.
        sys.exit(0)
