#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Sınav kopyası (yalıtılmış depo)
===============================================================
Sınavlar (`sinav.py`, `arac-sinavi.py`, `mutasyon.py`, `ablasyon.py`,
`tirmanma.py`) depoyu geçici bir klasöre kopyalayıp bozarak ölçüyor.
Kopya `shutil.copytree` ile alınıyordu; depo sıradan bir klonsa `.git`
bir KLASÖRDÜR ve kopyayla birlikte çoğalır — yalıtım tamdır.

Depo bir `git worktree` ise `.git` bir DOSYADIR: tek satır, paylaşılan
yönetim dizinini gösterir. Kopya o satırı da kopyalar; kopyada açılan dal,
yazılan commit, silinen başvuru ASIL deponun başvurularına yazılır.
Güvenlik taramasında ölçüldü: araç sınavı bir worktree'de koşunca
`codex/kapi-yok` ve `sinav/beyanli` dalları asıl depoda belirdi, yetim bir
worktree kaydı kaldı. Gönderilmediler — ama bir sonraki `git push --all`
gönderirdi, ve yazma yetkili alt ajanlar tam olarak worktree'de koşuyor.

Burada kopya her durumda KENDİ git dizinini alır: `.git` dosyaysa
paylaşılan dizin (worktree kayıtları hariç) kopyalanır, worktree'nin
kendi HEAD'i ve index'i üstüne konur. Kopyada yapılan hiçbir git işlemi
kaynağa ulaşamaz.
"""

import os
import shutil
import subprocess


def _git_dizini(kaynak, secenek):
    s = subprocess.run(["git", "rev-parse", secenek], cwd=kaynak,
                       capture_output=True, text=True, timeout=30)
    if s.returncode != 0 or not s.stdout.strip():
        raise RuntimeError(f"git rev-parse {secenek} çalışmadı: {s.stderr.strip()}")
    return os.path.abspath(os.path.join(kaynak, s.stdout.strip()))


def depoyu_kopyala(kaynak, hedef):
    """`kaynak` deposunu `hedef`e kopyalar; kopyanın git dizini bağımsızdır."""
    git_yolu = os.path.join(kaynak, ".git")
    if not os.path.isfile(git_yolu):
        # Sıradan klon: .git klasörü kopyayla çoğalır. Worktree kayıtları
        # kopyada anlamsız; kopyadaki bir `worktree prune` bile gerçek
        # dizinlere bakmasın.
        shutil.copytree(kaynak, hedef,
                        ignore=lambda d, _: ["worktrees"] if d == git_yolu else [])
        return hedef

    ortak = _git_dizini(kaynak, "--git-common-dir")
    ozel = _git_dizini(kaynak, "--git-dir")
    shutil.copytree(kaynak, hedef,
                    ignore=lambda d, adlar: [".git"] if d == kaynak else [])
    yeni_git = os.path.join(hedef, ".git")
    shutil.copytree(ortak, yeni_git,
                    ignore=lambda d, _: ["worktrees"] if d == ortak else [])
    if ozel != ortak:
        for ad in ("HEAD", "index", "ORIG_HEAD", "config.worktree"):
            yol = os.path.join(ozel, ad)
            if os.path.exists(yol):
                shutil.copy2(yol, os.path.join(yeni_git, ad))
    # Worktree'ler çıplak (bare) bir depodan da açılabilir; kopya çalışma
    # ağacı olan sıradan bir depo olmalı.
    subprocess.run(["git", "config", "core.bare", "false"], cwd=hedef,
                   capture_output=True, timeout=30)
    subprocess.run(["git", "config", "--unset", "core.worktree"], cwd=hedef,
                   capture_output=True, timeout=30)
    return hedef
