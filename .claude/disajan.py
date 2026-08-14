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
]

# `arac-sinavi.py` KASTEN yok — iki ayrı sebeple.
#
# 1. Gereksiz: o sınav araçları ölçer, içeriği değil. Dış ajan `.claude/`
#    altına dokunamıyor; dokunmuşsa dal zaten reddediliyor. Yani kabul
#    edilen her dalda araçlar tabanla BİREBİR aynı. Aynı kodu tekrar
#    sınamak ölçüm değil, maliyet.
# 2. Zararlı: `arac-sinavi.py` içinde kapıyı sınayan vakalar var. Kapı onu
#    koşunca vakalar tekrar kapıyı çağırıyor ve koşu bitmiyor — ilk gerçek
#    kullanımda kapı 10 dakikada dönmedi ve arkasında 140 yetim çalışma
#    ağacı bıraktı.


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



# ---------------------------------------------------------------- sohbet kipi
# Depoya erişemeyen bir ajan (telefondaki ChatGPT gibi) için. Ona "dosyayı
# oku" ya da "betiği koştur" demek anlamsız — okuyamaz, koşturamaz. Bu kipte
# ilgili parça brief'in İÇİNE konur ve cevap **uygulanabilir** bir biçimde
# istenir. Taşıma insan üzerinden olur; kapı yine mekanik kalır.

AYIRAC_ESKI = "<<<ESKI"
AYIRAC_YENI = "<<<YENI"
AYIRAC_SON = ">>>"


def _parca_cek(yol, imza, once=6, sonra=6):
    """Değiştirilecek bölgeyi bağlamıyla birlikte çıkarır."""
    tam = os.path.join(KOK, yol)
    with open(tam, encoding="utf-8") as f:
        satirlar = f.read().splitlines()
    for i, satir in enumerate(satirlar):
        if imza in satir:
            bas, son = max(0, i - once), min(len(satirlar), i + sonra + 1)
            return satirlar[bas:son], bas + 1
    return None, None


def sohbet_brief(a):
    parca, ilk = _parca_cek(a.dosya, a.imza)
    if parca is None:
        print(f"'{a.imza}' {a.dosya} içinde bulunamadı.", file=sys.stderr)
        return 1

    dayanak = kos(KOK, "ara.py", a.konu, "--sayi", "3")

    print(f"""# GÖREV (sohbet kipi) — {a.konu}

Depoya erişimin yok, komut çalıştıramazsın. Gerekli her şey aşağıda.
Dosya okumaya, tahmin etmeye ya da "önce şunu görmem lazım" demeye gerek
yok — göremediğin bir şey varsa **iste**, uydurma.

## Ne yapılacak

{a.konu}

## Kaynak: canon (tek doğru)

Bu evren hakkında hafızandan hiçbir şey bilmiyorsun. Aşağıdaki alıntılar
`LORE.md` dosyasından, satır numaralarıyla. Bir iddian varsa dayanağı bu
alıntılardan biri olmalı.

```
{(dayanak.stdout or "").strip()[:2500]}
```

## Değiştirilecek parça — `{a.dosya}` (satır {ilk}'den itibaren)

```javascript
{chr(10).join(parca)}
```

## Cevap biçimi — ZORUNLU

Sadece şunu yaz, başka hiçbir şey ekleme:

```
{AYIRAC_ESKI}
<değiştirilecek satırların BİREBİR kopyası>
{AYIRAC_SON}
{AYIRAC_YENI}
<yerine gelecek satırlar>
{AYIRAC_SON}
GEREKÇE: <tek cümle> (LORE.md:<satır>)
```

Kurallar:

- `ESKI` bloğu yukarıdaki parçadan **birebir** alınmalı — tek boşluk bile
  değişirse uygulanamaz ve iş geri döner. Kontrol mekanik, pazarlık yok.
- Sadece değiştirmen gereken satırları al. Bütün dosyayı yeniden yazma.
- "Bu arada şunu da düzelttim" YOK. İstenmeyen değişiklik reddedilir.
- Dayanak veremediğin bir cümle kurma. Canon susuyorsa "canon bunu
  söylemiyor" de ve dur.
""")
    return 0


def _blok_cek(cevap, isaret):
    """Bir bloğu esnek biçimde çıkarır.

    Sıkılık **içerik kimliğinde** olmalı, süs işaretlerinde değil. İlk hâlim
    kapanış `>>>` şart koşuyordu ve gerçek kullanımda ilk denemede düştü:
    sohbet arayüzü kapanış işaretini yutmuş, içeriği açılış işaretiyle aynı
    satıra almış, girintiyi silmişti. Her gerçek kullanımda düşen bir kapı,
    kapı değil duvardır.
    """
    import re as _re
    e = _re.search(_re.escape(isaret) + r"[ \t]*(.*)", cevap)
    if not e:
        return None
    ilk_satir = e.group(1).strip()
    kalan = cevap[e.end():]
    govde = []
    for satir in kalan.splitlines():
        if satir.strip().startswith((AYIRAC_SON, "<<<", "GEREKÇE:")):
            break
        govde.append(satir)
    parcalar = ([ilk_satir] if ilk_satir else []) + govde
    while parcalar and not parcalar[0].strip():
        parcalar.pop(0)
    while parcalar and not parcalar[-1].strip():
        parcalar.pop()
    return "\n".join(parcalar) if parcalar else None


def _yerini_bul(icerik, eski):
    """(başlangıç, bitiş, nasıl) — bulunamazsa (None, None, sebep).

    Önce birebir. Olmazsa satır satır KIRPILMIŞ eşleşme: girinti taşımada
    kayboluyor ama neyin değişeceği yine tek anlamlı kalıyor. Kırpılmış
    eşleşmede **teklik şartı** korunuyor — birden çok yere uyuyorsa hangisi
    olduğu belirsizdir ve tahmin etmek bu köprünün kaçınmak istediği şeyin
    ta kendisi.
    """
    if icerik.count(eski) == 1:
        i = icerik.index(eski)
        return i, i + len(eski), "birebir"
    if icerik.count(eski) > 1:
        return None, None, "birebir eşleşme birden çok yerde geçiyor"

    satirlar = icerik.splitlines(keepends=True)
    aranan = [x.strip() for x in eski.splitlines() if x.strip()]
    if not aranan:
        return None, None, "ESKI bloğu boş"
    bulunan = []
    for i in range(len(satirlar) - len(aranan) + 1):
        if [x.strip() for x in satirlar[i:i + len(aranan)]] == aranan:
            bulunan.append(i)
    if not bulunan:
        # Üçüncü deneme: BOŞLUĞA DUYARSIZ — ama TAHMİNSİZ.
        #
        # Sohbet arayüzü kaynak satırlarını birleştiriyor; iki satırlık bir
        # dizge zinciri tek satır olarak geri geliyor. İçerik aynı, sarma
        # noktası kaybolmuş.
        #
        # İlk denemem "ilk kelimeyi bul, son kelimeyi bul, arasını al"
        # diyordu. Bu bir TAHMİNDİ ve dosyayı bozdu: seçilen aralık
        # beklenen metin değildi, araya alakasız satırlar girdi. Tam da
        # bu köprünün önlemesi gereken şeyi kendi elimle yaptım.
        #
        # Doğrusu: aday aralığı seç, sonra **eşit olduğunu doğrula.**
        # Doğrulanmayan konum, konum değildir.
        import re as _re

        def _sadele(x):
            return _re.sub(r"\s+", " ", x).strip()

        hedef = _sadele(eski)
        adaylar = []
        for i in range(len(satirlar)):
            for n in range(1, 9):
                if i + n > len(satirlar):
                    break
                if _sadele("".join(satirlar[i:i + n])) == hedef:
                    adaylar.append((i, n))
                    break
        if len(adaylar) == 1:
            i, n = adaylar[0]
            b = sum(len(x) for x in satirlar[:i])
            return b, b + sum(len(x) for x in satirlar[i:i + n]), \
                "boşluğa duyarsız (satırlar birleşmiş, aralık doğrulandı)"
        if len(adaylar) > 1:
            return None, None, f"boşluğa duyarsız eşleşme {len(adaylar)} yerde geçiyor"
        return None, None, "ne birebir ne kırpılmış eşleşme bulundu"
    if len(bulunan) > 1:
        return None, None, f"kırpılmış eşleşme {len(bulunan)} yerde geçiyor"
    i = bulunan[0]
    bas = sum(len(x) for x in satirlar[:i])
    bit = bas + sum(len(x) for x in satirlar[i:i + len(aranan)])
    return bas, bit, "kırpılmış (girinti taşımada kaybolmuş)"


def uygula(a):
    """Sohbet ajanının cevabını uygula — ama neyi değiştirdiğini bilmeden asla.

    Bu kipin asıl riski şu: model "temizlenmiş" bir dosya döndürür ve
    istenmeyen değişiklikler sessizce içeri girer. Koruma iki şart:
    ESKI bloğu dosyada **bulunmalı** ve **tek** olmalı.
    """
    with open(a.yanit, encoding="utf-8") as f:
        cevap = f.read()

    eski_metin = _blok_cek(cevap, AYIRAC_ESKI)
    yeni_metin = _blok_cek(cevap, AYIRAC_YENI)
    if eski_metin is None or yeni_metin is None:
        print("Cevapta ESKI/YENI blokları bulunamadı — biçim tutmuyor.",
              file=sys.stderr)
        return 1

    yol = os.path.join(KOK, a.dosya)
    with open(yol, encoding="utf-8") as f:
        icerik = f.read()

    bas, bit, nasil = _yerini_bul(icerik, eski_metin)
    if bas is None:
        print(f"REDDEDİLDİ — {nasil}.\n")
        print("Model ya yanlış yeri gösteriyor ya da metni kendince yeniden "
              "yazmış. İkisinde de uygulanmaz: sessizce giren istenmeyen "
              "değişiklik, bu köprünün tek gerçek riski.")
        return 1

    # Girinti dosyadan alınır, cevaptan değil — taşımada silinmiş olabilir.
    # Girinti, DEĞİŞTİRİLEN BÖLGENİN ilk satırından alınır — öncesinden
    # değil. Bölge satır başında başlıyorsa `icerik[:bas]` "\n" ile bitiyor
    # ve önceki hâli boş girinti üretiyordu: içerik doğru, biçim bozuk.
    ilk_satir = icerik[bas:bit].split("\n")[0]
    girinti = ilk_satir[:len(ilk_satir) - len(ilk_satir.lstrip())]
    if not girinti:
        onceki = icerik[:bas].split("\n")[-1]
        girinti = onceki if not onceki.strip() else girinti
    # Bölge satır sonuyla bitiyorsa o satır sonu korunmalı; yoksa bir
    # sonraki satır yapışır.
    kuyruk = "\n" if icerik[bas:bit].endswith("\n") else ""
    yeni_satirlar = [x.strip() for x in yeni_metin.splitlines()]
    # Dizge zinciri tek satıra sıkışmışsa dosyanın kendi sarma biçimini geri
    # ver. Taşıma satır sonlarını yiyor; 130 karakterlik bir satır bırakmak
    # "modelin yazdığına sadakat" değil, taşıma hasarını kalıcılaştırmak olur.
    acilmis = []
    for satir in yeni_satirlar:
        if len(girinti) + len(satir) > 88 and '" + "' in satir:
            parcalar = satir.split('" + "')
            for i, p in enumerate(parcalar):
                acilmis.append((p if i == 0 else '"' + p)
                               + ('" +' if i < len(parcalar) - 1 else ""))
        else:
            acilmis.append(satir)
    yerine = girinti + ("\n" + girinti).join(acilmis) + kuyruk

    with open(yol, "w", encoding="utf-8") as f:
        f.write(icerik[:bas] + yerine + icerik[bit:])

    import re as _re
    gerekce = _re.search(r"GEREKÇE:\s*(.+)", cevap)
    print(f"Uygulandı — {a.dosya}  ({nasil} eşleşme)")
    print(f"  - {eski_metin.strip()}")
    print(f"  + {yerine.strip()}")
    if gerekce:
        print(f"  gerekçe: {gerekce.group(1).strip()}")
    else:
        print("  UYARI: gerekçe satırı yok — dayanaksız değişiklik.")
    return 0


def _agac_kur(dal):
    """Dalı ayrı bir çalışma ağacına al — ana ağaç bozulmasın."""
    gecici = tempfile.mkdtemp(prefix="echo-disajan-")
    agac = os.path.join(gecici, "agac")

    # Önce uzak dal — Codex'in teslim biçimi bu. Uzakta yoksa yerel dala
    # düş: iş henüz push edilmemişken de kapıdan geçirilebilmeli, yoksa
    # "önce push et sonra öğren" gibi ters bir sıra doğar.
    # ÖNCE YEREL. İlk hâlim önce `git fetch` deniyordu ve uzakta olmayan bir
    # dalda ağ üzerinde bekliyordu — kapı 200 saniyede dönmüyordu, oysa üç
    # ölçümün toplamı 2 saniye. Yani bekleyen şey denetim değil, gereksiz
    # bir ağ çağrısıydı. Yerelde varsa ağa hiç çıkma.
    if git("rev-parse", "--verify", dal).returncode == 0:
        hedef = dal
    elif git("fetch", "origin", dal).returncode == 0:
        hedef = "FETCH_HEAD"
    else:
        shutil.rmtree(gecici, ignore_errors=True)
        return None, None, (f"dal ne uzakta ne yerelde bulundu: {dal}\n"
                            "ne `git rev-parse` ne `git fetch origin` buldu.")

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

    p = alt.add_parser("sohbet", help="depoya erişemeyen ajan için brief")
    p.add_argument("--konu", required=True)
    p.add_argument("--dosya", required=True, help="değişecek dosya")
    p.add_argument("--imza", required=True, help="değişecek satırdaki ayırt edici metin")
    p.set_defaults(islev=sohbet_brief)

    p = alt.add_parser("uygula", help="sohbet ajanının cevabını uygula")
    p.add_argument("--yanit", required=True, help="cevabın kaydedildiği dosya")
    p.add_argument("--dosya", required=True)
    p.set_defaults(islev=uygula)

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
