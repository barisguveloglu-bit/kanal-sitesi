#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECHO — Dış ajan köprüsü (Codex ve benzerleri)
===============================================================
Orkestra şefi Claude, uzman Codex. Bu betik ikisinin arasındaki **sözleşme
ve kapı**.

## Neden ayrı bir betik

`gorev.py` alt ajan sözleşmesini üretiyor ama o ajan Claude Code'un içinde,
aynı oturumda, aynı bağlamda çalışıyor. Codex başka bir yerde çalışıyor:
benim bağlamımı görmüyor, bu oturumu bilmiyor, işini **PR olarak** teslim
ediyor. İki fark var ve ikisi de sözleşmeyi değiştiriyor:

1. `gorev.py` "commit ve push YASAK" der — Codex için tam tersi: işini
   commit'leyip PR açması gerekiyor. Yasak olan şey **merge**.
2. Alt ajan raporunu bana metin olarak verir; Codex'in raporu **diff'in
   kendisi**. Yani denetim rapora değil koda bakmalı.

## Kapının mantığı

Codex'in çıktısına "başka bir yapay zeka yazdı" diye güvenilmiyor. Aynı
duvardan geçiyor: `dogrula.py`, `butunluk.py`, `sinav.py`, `arac-sinavi.py`.
Bu deponun baştan beri tek cümlesi burada da geçerli — **yapay zekanın
kendi işini beğenmesi denetim değildir**, ve bu, işi yapan yapay zekanın
hangisi olduğundan bağımsız.

Kapı dalı kendi çalışma ağacına alır; ana ağaca dokunmaz. Yani Codex'in
işi denetlenirken buradaki iş bozulmaz.

    python3 .claude/disajan.py brief --konu "<iş>" --dal codex/<ad>
    python3 .claude/disajan.py kapi --dal codex/<ad>
    python3 .claude/disajan.py kapi --dal codex/<ad> --yorum
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

# Kapının koştuğu ölçümler. Sıra ucuzdan pahalıya: bir kural ihlali varsa
# 90 vakalık araç sınavını beklemeye gerek yok.
KAPILAR = [
    ("kural", ["dogrula.py"], "kural ihlali (menü, gizleme, odak, kontrast, belge…)"),
    ("bütünlük", ["butunluk.py", "--sessiz"], "canon ↔ veri ↔ site tutarlılığı"),
    ("denetleyici", ["sinav.py"], "denetleyicinin kendi sınavı (fay enjeksiyonu)"),
    ("araçlar", ["arac-sinavi.py"], "döngü araçlarının sınavı"),
]


def kos(kok, betik, *arg):
    return subprocess.run([sys.executable, os.path.join(kok, ".claude", betik), *arg],
                          cwd=kok, capture_output=True, text=True, timeout=600)


def git(*arg, kok=KOK):
    return subprocess.run(["git", *arg], cwd=kok, capture_output=True,
                          text=True, timeout=180)


def brief(a):
    """Codex'e verilecek sözleşme. `gorev.py`'nin üstüne PR akışını koyar."""
    ic = kos(KOK, "gorev.py", "brief", "--konu", a.konu, "--mod", "yazma",
             "--baglam-sayi", str(a.baglam_sayi))
    if ic.returncode != 0:
        print(ic.stderr or ic.stdout, file=sys.stderr)
        return 1

    govde = ic.stdout
    # Alt ajan kuralı Codex için yanlış: onun teslim biçimi PR.
    govde = govde.replace(
        "- `git commit` ve `git push` **YASAK.** Commit kararı insanındır;\n"
        "  sen değişikliği bırak, raporunda ne değiştirdiğini yaz.",
        f"- Çalışacağın dal: `{a.dal}`. Başka dala dokunma.\n"
        "- Commit ve push **serbest** — teslim biçimin PR.\n"
        "- **Merge YASAK.** PR'ı sen kapatma; kabul kararı insanın ve kapının.")

    print(f"""# CODEX GÖREVİ — {a.konu}

> Bu görev bir orkestra döngüsünün parçası. Şef Claude, uzman sensin.
> İşin bittiğinde çıktın **mekanik bir kapıdan** geçecek: `dogrula.py`,
> `butunluk.py`, `sinav.py`, `arac-sinavi.py`. Kapı düşerse iş geri gelir.
> Bu bir güvensizlik değil — aynı kapıdan Claude'un işi de geçiyor.

## Dal ve teslim

    git checkout -b {a.dal}
    …çalış…
    git push -u origin {a.dal}     → PR aç, merge ETME

{govde.strip()}

## Bitirmeden önce kendin koş

Bu dördü yeşil değilse iş bitmemiştir. Kapı zaten koşacak; sen önce koş ki
tur boşa gitmesin:

```
python3 .claude/dogrula.py          # 0 temiz · 1 ihlal · 3 insan kapısı
python3 .claude/butunluk.py         # canon ↔ veri ↔ site
python3 .claude/sinav.py            # denetleyicinin sınavı
python3 .claude/arac-sinavi.py      # araçların sınavı
```

Çıkış kodu **3** alırsan durup PR açıklamasına yaz — o "yanlış" demek
değil, "doğruluğunu betik bilemiyor" demek. Kendi başına karara bağlama.

## PR açıklamasında zorunlu üç başlık

    ### Ne değişti
    - dosya:satır — ne yaptın, neden

    ### Dayanak
    - her canon iddiası için LORE.md:<satır>

    ### Kapı
    - dört betiğin çıkış kodu

Dayanağı olmayan canon iddiası ve boş bırakılmış kapı bölümü, PR'ı
otomatik reddettirir.

## Dokunma

- `.claude/` altındaki hiçbir şeyi **değiştirme** (okuyabilirsin).
  Orası iş akışı katmanı, senin görev alanın değil.
- `LORE.md` canon kaynağıdır: **içerik değiştirmek insan kararıdır.**
  Gerekiyorsa PR açıklamasında öner, kendin yapma.
- Menü ve `sitemap.xml` elle tutuluyor; yeni sayfa eklemiyorsan dokunma.
""")
    return 0


def _agac_kur(dal):
    """Dalı ayrı bir çalışma ağacına al — ana ağaç bozulmasın."""
    gecici = tempfile.mkdtemp(prefix="echo-disajan-")
    agac = os.path.join(gecici, "agac")

    # Önce uzak dal — Codex'in teslim biçimi bu. Uzakta yoksa yerel dala
    # düş: iş henüz push edilmemişken de kapıdan geçirilebilmeli, yoksa
    # "önce push et sonra öğren" gibi ters bir sıra doğar.
    getir = git("fetch", "origin", dal)
    if getir.returncode == 0:
        hedef = "FETCH_HEAD"
    elif git("rev-parse", "--verify", dal).returncode == 0:
        hedef = dal
    else:
        shutil.rmtree(gecici, ignore_errors=True)
        return None, None, (f"dal ne uzakta ne yerelde bulundu: {dal}\n"
                            f"{getir.stderr.strip()}")

    ekle = git("worktree", "add", "--detach", agac, hedef)
    if ekle.returncode != 0:
        shutil.rmtree(gecici, ignore_errors=True)
        return None, None, f"çalışma ağacı kurulamadı:\n{ekle.stderr.strip()}"
    return gecici, agac, None


def _agac_kaldir(gecici, agac):
    git("worktree", "remove", "--force", agac)
    shutil.rmtree(gecici, ignore_errors=True)


def kapi(a):
    gecici, agac, hata = _agac_kur(a.dal)
    hedef_ref = a.dal if git("rev-parse", "--verify", a.dal).returncode == 0 else "FETCH_HEAD"
    # Taban, PR'ın HEDEF dalı. Sabitlemek yanlış sonuç verir: dal başka
    # bir dalın üstüne kurulmuşsa o dalın bütün işi de "bu PR'ın değişikliği"
    # gibi görünür ve `.claude/` denetimi haksız yere kırmızı yanar.
    taban = a.taban
    if git("rev-parse", "--verify", taban).returncode != 0:
        taban = "main"
    if hata:
        print(hata, file=sys.stderr)
        return 2

    try:
        # Ölçüm katmanı dalın KENDİ hâliyle koşuluyor.
        #
        # İlk hâlim buraya ana daldaki betikleri kopyalıyordu — "dış ajan
        # sınavı gevşetmesin" diye. Yanlıştı ve ölçtü: dal eski bir `main`
        # üstüne kuruluysa yeni betikler eski belgelerle karşılaşıyor ve
        # dört kapı da düşüyor. Yani kapı, dalın işiyle hiç ilgisi olmayan
        # bir sebeple kırmızı yanıyordu — en kötü denetim türü.
        #
        # Gevşetme riski zaten başka yerden kapalı: `.claude/` altında tek
        # satır değişmişse dal doğrudan reddediliyor. Sınava dokunulmadığı
        # kanıtlandıktan sonra dalın kendi sınavını koşmak doğrusu.
        degisen = git("diff", "--name-only", f"{taban}...{hedef_ref}")
        dokunulan = [x for x in degisen.stdout.splitlines() if x.strip()]
        yasak = [x for x in dokunulan if x.startswith(".claude/")]
        if yasak:
            print(f"KAPI — {a.dal}\n")
            print("REDDEDİLDİ — ölçüm katmanına dokunulmuş:")
            for y in yasak[:10]:
                print(f"  · {y}")
            print("\nSınavı değiştirerek geçmek geçmek değildir. `.claude/` "
                  "dış ajanın görev alanı değil.")
            return 1

        sonuclar, bulgular = [], []
        for ad, komut, ne in KAPILAR:
            s = kos(agac, *komut)
            sonuclar.append((ad, s.returncode, ne))
            if s.returncode not in (0,):
                govde = (s.stdout or "").strip().splitlines()
                bulgular += [f"[{ad}] {x.strip()}" for x in govde
                             if x.strip().startswith(("[", "BULGU", "FAIL", "??"))][:8]

        print(f"KAPI — {a.dal}\n")
        print(f"  değişen dosya  {len(dokunulan)}")
        for ad, kod, ne in sonuclar:
            isaret = {0: "GEÇTİ", 1: "DÜŞTÜ", 3: "İNSAN KAPISI"}.get(kod, f"çıkış {kod}")
            print(f"  {ad:12} {isaret:14} {ne}")
        print()

        kapi_dusen = [ad for ad, kod, _ in sonuclar if kod == 1]
        insan = [ad for ad, kod, _ in sonuclar if kod == 3]
        # 0/1/3 dışındaki her şey "kapı KOŞULAMADI" demek: betik yok,
        # çöktü, bağımlılığı eksik. Bunu geçmiş saymak en tehlikeli hata —
        # nitekim ilk hâlim tam olarak bunu yaptı: dalda `butunluk.py`
        # bulunmayınca çıkış 2 geldi ve kapı "dördü de geçti" dedi.
        # Koşmayan denetim, geçen denetim değildir.
        kosmayan = [(ad, kod) for ad, kod, _ in sonuclar if kod not in (0, 1, 3)]

        if bulgular:
            print("BULGULAR")
            for b in bulgular[:12]:
                print(f"  · {b}")
            print()

        if kosmayan:
            print("REDDEDİLDİ — bazı kapılar hiç koşmadı:")
            for ad, kod in kosmayan:
                print(f"  · {ad} (çıkış {kod}) — betik dalda yok ya da çöktü")
            print("\nKoşmayan denetim geçen denetim değildir. Dal büyük "
                  "ihtimalle eski bir tabandan türemiş; `main` üstüne "
                  "rebase edilmeli.")
            return 1

        if kapi_dusen:
            print(f"REDDEDİLDİ — {', '.join(kapi_dusen)} düştü. "
                  "Bulgular Codex'e geri gidiyor.")
            if a.yorum:
                print("\n" + _yorum_metni(a.dal, sonuclar, bulgular, dokunulan))
            return 1

        if insan:
            print(f"İNSAN KAPISI — {', '.join(insan)} çıkış kodu 3 verdi.")
            print("Kural ihlali yok ama doğruluğu betikle bilinemiyor. "
                  "Barış'a sor, kendi başına kabul etme.")
            return 3

        print(f"KABUL — {len(sonuclar)} kapının hepsi geçti, "
              "ölçüm katmanına dokunulmamış.")
        if a.yorum:
            print("\n" + _yorum_metni(a.dal, sonuclar, bulgular, dokunulan))
        return 0
    finally:
        _agac_kaldir(gecici, agac)


def _yorum_metni(dal, sonuclar, bulgular, dokunulan):
    satir = ["## Echo kapısı", "", f"Dal: `{dal}` — {len(dokunulan)} dosya değişti", "",
             "| Kapı | Sonuç |", "|---|---|"]
    for ad, kod, _ in sonuclar:
        satir.append(f"| {ad} | {{0: 'geçti', 1: 'düştü', 3: 'insan kapısı'}}"
                     .replace("{0: 'geçti', 1: 'düştü', 3: 'insan kapısı'}",
                              {0: "geçti", 1: "**düştü**", 3: "insan kapısı"}
                              .get(kod, f"çıkış {kod}")) + " |")
    if bulgular:
        satir += ["", "### Bulgular", ""]
        satir += [f"- {b}" for b in bulgular[:12]]
    return "\n".join(satir)


def main(argv):
    a = argparse.ArgumentParser(description="Dış ajan (Codex) köprüsü.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("brief", help="Codex'e verilecek sözleşme")
    p.add_argument("--konu", required=True)
    p.add_argument("--dal", default="codex/is", help="Codex'in çalışacağı dal")
    p.add_argument("--baglam-sayi", type=int, default=4)
    p.set_defaults(islev=brief)

    p = alt.add_parser("kapi", help="dalı Echo ölçümlerinden geçir")
    p.add_argument("--dal", required=True)
    p.add_argument("--taban", default="origin/main",
                   help="PR'ın hedef dalı — fark buna göre alınır")
    p.add_argument("--yorum", action="store_true", help="PR yorumu biçiminde de yaz")
    p.set_defaults(islev=kapi)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
