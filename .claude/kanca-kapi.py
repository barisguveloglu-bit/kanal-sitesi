#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Kapı kancası (tur sonu + commit öncesi)
===============================================================
Yansıt-İyileştir döngüsünün iki deliğini kapatır.

## 1. Bash ile yapılan düzenleme denetimsiz geçiyordu

`kanca.py` sadece Edit / Write / MultiEdit / NotebookEdit araçlarını
dinliyor. `sed -i`, heredoc ya da küçük bir Python betiğiyle yapılan
değişiklik hiçbir denetime takılmadan turun sonuna kadar gidebiliyordu —
ve otomatik modda model dosyaları sık sık tam da böyle düzenliyor.

Kanca bir ARACI değil, bir SONUCU denetlemeli. Tur biterken çalışma ağacı
neyse o denetlenir; nasıl değiştiği önemli değil.

## 2. Kırmızı durum commit edilebiliyordu

Hiçbir şey kural ihlali taşıyan bir ağacın commit edilmesini ya da
gönderilmesini durdurmuyordu. Gönderilen şey yayına çıkan şeydir.

Burada REDDETMİYORUZ, insana SORUYORUZ (permissionDecision: ask). Sebebi:
reddetmek kilitler. Konteyner geçici; kırmızı da olsa yarım işi kurtarmak
için commit gerekebilir. O kararı model değil Barış verir — ama artık
kararsız geçemez.

## Olaylar

    Stop                 çalışma ağacında değişiklik yoksa sessiz geç.
                         Varsa denetle; kural ihlali varsa turu bitirtme
                         (çıkış 2). İnsan kapısında bitirt — model zaten
                         soru sormak için duruyor olabilir — ama kullanıcıya
                         göster.
                         stop_hook_active ise İKİNCİ KEZ bloklama: sonsuz
                         döngü olmasın. Düzeltemeyen model durur ve neyin
                         kırmızı kaldığını söyler; kullanıcı da görür.

    PreToolUse (Bash)    komut git commit / git push değilse sessiz geç.
                         Öyleyse denetle; temiz değilse izni insana sor.

    PreToolUse (GitHub   push_files, create_or_update_file, delete_file,
      MCP yazma aracı)   merge_pull_request, enable_pr_auto_merge — HER
                         ZAMAN insana sor. Bu araçlar çalışma ağacından
                         değil araç girdisinden yazar: yerel denetim neyin
                         gittiğini görmez, commit kapısı hiç tetiklenmez
                         (güvenlik taraması). Merge kararı zaten insanın.

Kanca sözleşmesi:
  çıkış 0 → geç (stdout'ta JSON varsa Claude Code onu okur)
  çıkış 2 → engelle, stderr Claude'a geri beslenir
"""

import json
import os
import re
import subprocess
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Alt komutu commit ya da push olan her git çağrısı — `cd x && git commit`,
# `git -C . push`, `git -c a=b commit` dahil; `git stash push` ve
# `git log --grep commit` hariç (onlar gönderim değil).
GONDERIM = re.compile(r"\bgit(?:\s+-{1,2}[\w-]+(?:[= ](?!commit\b|push\b)\S+)?)*\s+(commit|push)\b")


# GitHub'a yerel git'i atlayarak yazan MCP araçları. Ad öneki bağlayıcıya
# göre değişebiliyor (mcp__github__, mcp__plugin_github__ ...).
UZAK_YAZMA = re.compile(r"^mcp__[\w-]*github[\w-]*__(push_files|create_or_update_file|"
                        r"delete_file|merge_pull_request|enable_pr_auto_merge)$")


def denetle():
    betik = os.path.join(KOK, ".claude", "dogrula.py")
    if not os.path.exists(betik):
        return None
    return subprocess.run([sys.executable, betik, "--kisa"], cwd=KOK,
                          capture_output=True, text=True, timeout=50)


def cikti(sonuc, satir=12):
    metin = ((sonuc.stdout or "") + (sonuc.stderr or "")).strip().splitlines()
    return "\n".join(metin[:satir]) + ("\n  …" if len(metin) > satir else "")


def degisiklik_var():
    try:
        s = subprocess.run(["git", "status", "--porcelain"], cwd=KOK,
                           capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return True   # bilemiyorsak denetle — sessiz geçmek en kötüsü
    if s.returncode != 0:
        return True
    return bool(s.stdout.strip())


def json_bas(veri):
    print(json.dumps(veri, ensure_ascii=False))


def tur_sonu(olay):
    if not degisiklik_var():
        return 0
    sonuc = denetle()
    if sonuc is None or sonuc.returncode == 0:
        return 0

    if sonuc.returncode == 3:
        json_bas({"systemMessage":
                  "Kanlı Göz: insan kapısı açık — denetleyicinin doğrulayamadığı "
                  "bir değişiklik onay bekliyor.\n" + cikti(sonuc, 8)})
        return 0

    if olay.get("stop_hook_active"):
        # İkinci deneme: bloklamak sonsuz döngü olurdu. Bırak, ama sakla değil.
        json_bas({"systemMessage":
                  "Kanlı Göz: tur KIRMIZI bitti — denetim hâlâ kural ihlali "
                  "buluyor.\n" + cikti(sonuc, 8)})
        return 0

    print("TUR KIRMIZI BİTİYOR — çalışma ağacında kural ihlali var.\n\n"
          "Bu kapı nasıl düzenlendiğine bakmaz: Bash ile yapılan değişiklikler "
          "düzenleme kancasını tetiklemez, burada yakalanır.\n\n"
          + cikti(sonuc) + "\n\n"
          "Düzelt ve `python3 .claude/dogrula.py` ile doğrula. Düzeltemiyorsan "
          "dur ve Barış'a neyin kırmızı kaldığını, ne denediğini söyle.",
          file=sys.stderr)
    return 2


def gonderim_oncesi(olay):
    komut = (olay.get("tool_input") or {}).get("command") or ""
    if not GONDERIM.search(komut):
        return 0
    sonuc = denetle()
    if sonuc is not None and sonuc.returncode == 0:
        return 0

    if sonuc is None:
        neden = "Denetleyici bulunamadı — bu commit denetlenemedi."
    elif sonuc.returncode == 3:
        neden = ("İnsan kapısı açık: denetleyicinin doğrulayamadığı bir değişiklik "
                 "commit edilmek üzere.\n" + cikti(sonuc, 8))
    elif sonuc.returncode == 1:
        neden = ("Denetim KIRMIZI: kural ihlali taşıyan bir ağaç commit / push "
                 "edilmek üzere.\n" + cikti(sonuc, 8))
    else:
        neden = f"Denetleyici çalışmadı (çıkış {sonuc.returncode}).\n" + cikti(sonuc, 6)

    json_bas({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "ask",
        "permissionDecisionReason": "Kanlı Göz kapısı — " + neden,
    }})
    return 0


def uzak_yazma_oncesi(olay):
    arac = olay.get("tool_name") or ""
    girdi = olay.get("tool_input") or {}
    hedef = "/".join(str(girdi[k]) for k in ("owner", "repo") if girdi.get(k))
    for anahtar, etiket in (("branch", "dal"), ("pullNumber", "PR")):
        if girdi.get(anahtar):
            hedef += f" {etiket} {girdi[anahtar]}"
    json_bas({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "ask",
        "permissionDecisionReason":
            f"Kanlı Göz kapısı — {arac.rsplit('__', 1)[-1]} GitHub'a yerel git'i "
            f"atlayarak yazıyor ({hedef.strip() or 'hedef belirtilmemiş'}). Yerel "
            "denetim bu içeriği görmedi; merge ve doğrudan yazma kararı Barış'ın.",
    }})
    return 0


def main():
    try:
        olay = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    ad = olay.get("hook_event_name") or ""
    if ad == "Stop":
        return tur_sonu(olay)
    if ad == "PreToolUse" and olay.get("tool_name") == "Bash":
        return gonderim_oncesi(olay)
    if ad == "PreToolUse" and UZAK_YAZMA.match(olay.get("tool_name") or ""):
        return uzak_yazma_oncesi(olay)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)   # kanca hiçbir koşulda oturumu kilitlemez
