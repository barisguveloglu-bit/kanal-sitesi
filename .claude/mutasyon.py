#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Mutasyon sınavı (testlerin sınavı)
===============================================================
Bütün ölçüm katmanının dayandığı son soru: **testler gerçekten canlı mı?**

## Neden gerekli

Bir test sessizce öldürülebilir. Gövdesinin başına `return None` koymak
yeter — vaka sayısı değişmez, `belge` denetimi bir şey görmez, sınav
yeşil kalır. Denendi ve oldu: `arac-sinavi.py`'deki uydurma testi devre
dışı bırakıldığında **üç ölçüm de yeşil** kaldı.

Bu, sistemin en derin açığı. Diğer bütün denetimler bu testlere
dayanıyor; test ölürse geriye "her şey yolunda" diyen bir kabuk kalır.

## Nasıl çalışır

Klasik mutasyon testi: ölçülen şeyi **kasten boz**, testin bunu
yakalayıp yakalamadığına bak.

    1. Deponun geçici kopyasını al
    2. Bir aracın kritik davranışını boz (mutasyon)
    3. İlgili sınavı koş
    4. Sınav DÜŞMELİ. Düşmüyorsa o test ölüdür.

Yani burada başarısızlık iyi haberdir: mutasyon yakalandı demektir.
Yeşil kalan bir mutasyon, "o davranışı hiçbir şey korumuyor" demektir.

    python3 .claude/mutasyon.py
    python3 .claude/mutasyon.py --ayrinti

Çıkış kodu: 0 bütün mutasyonlar yakalandı, 1 en az biri kaçtı.
"""

import argparse
import ast
import os
import random
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

KAYNAK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def duzenle(kok, yol, eski, yeni):
    p = os.path.join(kok, yol)
    with open(p, encoding="utf-8") as f:
        s = f.read()
    if eski not in s:
        raise AssertionError(f"mutasyon uygulanamadı: {yol} içinde yok → {eski[:70]!r}")
    with open(p, "w", encoding="utf-8") as f:
        f.write(s.replace(eski, yeni, 1))


# ------------------------------------------------------------------ mutasyonlar
# Her biri gerçek bir güvenlik davranışını bozar. Karşısındaki sınav
# BUNU YAKALAMALI; yakalamıyorsa o davranışı hiçbir şey korumuyordur.

def m_devre_kesmesin(kok):
    duzenle(kok, ".claude/devre.py",
            "kesildi = tur_doldu or sure_doldu or ilerleme is not None",
            "kesildi = False")


def m_devre_sure_saymasin(kok):
    duzenle(kok, ".claude/devre.py",
            "sure_doldu = a.sure > 0 and gecen > a.sure",
            "sure_doldu = False")


def m_devre_ilerleme_kor(kok):
    duzenle(kok, ".claude/devre.py",
            "    imzalar = [i for i in imzalar if i]",
            "    return None\n    imzalar = [i for i in imzalar if i]")


def m_yargi_uydurmayi_gormesin(kok):
    duzenle(kok, ".claude/yargi.py",
            "uyduran = [o for o in vaka[\"olmamali\"] if o.lower() in metin.lower()]",
            "uyduran = []")


def m_yargi_eksigi_saymasin(kok):
    """Gönderilmeyen cevabı başarısız saymasın — ihmalle kandırma kapısı.

    Önceki hâli `toplam` hesabını bozuyordu ama döngü artık altın setin
    tamamı üzerinden döndüğü için mutasyon ETKİSİZ kalmıştı. Ölü mutasyon,
    ölü test kadar yanıltıcıdır: ikisi de yeşil görünür.
    """
    duzenle(kok, ".claude/yargi.py",
            '            sonuclar.append({"no": no, "soru": vaka["soru"], "tur": vaka["tur"],\n'
            '                             "gecti": False, "kusur": ["cevap gönderilmedi"]})\n'
            "            continue",
            "            continue")


def m_yargi_atif_isabetini_gormesin(kok):
    duzenle(kok, ".claude/yargi.py",
            "elif not any(b <= vaka[\"satir\"] <= s for b, s in araliklar):",
            "elif False:")


def m_gorev_sozlesme_kapisi_acilsin(kok):
    duzenle(kok, ".claude/gorev.py",
            "    return [ad for ad, anahtarlar in ZORUNLU.items()",
            "    return []\n    return [ad for ad, anahtarlar in ZORUNLU.items()")


def m_gorev_atif_desteklemesini_gormesin(kok):
    duzenle(kok, ".claude/gorev.py",
            "            if oran < a.esik:",
            "            if False:")


def m_gorev_yetki_ihlalini_gormesin(kok):
    duzenle(kok, ".claude/gorev.py",
            "        elif degisiklik:",
            "        elif False:")


def m_seyir_ham_izi_ozete_soksun(kok):
    """Ham tur izi özete sızsın — bağlam şişmesinin ana kaynağı.

    Sadece KALICI'ya "adim" eklemek yetmiyordu: BASLIK sözlüğünde karşılığı
    olmadığı için `ozet` KeyError ile çöküyor, sızıntı hiç olmuyordu. Test de
    "ham iz görünmüyor" diye geçiyordu — DOĞRU SEBEPLE DEĞİL. Mutasyon
    gerçek sızıntıyı taklit etmeli, çökmeyi değil.
    """
    duzenle(kok, ".claude/seyir.py",
            'KALICI = ("karar", "cozulmemis", "denendi", "olculdu")',
            'KALICI = ("karar", "cozulmemis", "denendi", "olculdu", "adim")')
    duzenle(kok, ".claude/seyir.py",
            '    "olculdu": "ÖLÇÜLENLER",',
            '    "olculdu": "ÖLÇÜLENLER",\n    "adim": "ADIMLAR",')


def m_seyir_gerekcesiz_karari_kabul_etsin(kok):
    duzenle(kok, ".claude/seyir.py",
            '    if a.tur == "karar" and not a.neden:',
            '    if False:')


def m_dogrula_kontrasti_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            "        if oran < AA_SINIR:",
            "        if False:")


def m_dogrula_odagi_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            '            if ":focus-visible" in secici:\n                continue',
            '            if True:\n                continue')


def m_dogrula_yeni_dosyaya_kor(kok):
    """Elle yazılmış dosya listesine geri dön — goz.js yine kör noktada."""
    duzenle(kok, ".claude/dogrula.py",
            '    for dosya in varlik_dosyalari("js", ".js"):\n        js = js_yorumlari_at(oku(dosya))',
            '    for dosya in ("assets/js/app.js", "assets/js/animasyon.js", "assets/js/gizli.js"):\n'
            '        js = js_yorumlari_at(oku(dosya))')


def m_dogrula_veri_kanallarina_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            "        for desen, ne in VERI_KANALLARI:",
            "        for desen, ne in ():")


def m_dogrula_dis_kaynaga_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            "                if sunucu and sunucu not in IZINLI_DIS_SUNUCU:\n"
            "                    satir = html[:etiket.start()]",
            "                if False:\n"
            "                    satir = html[:etiket.start()]")


def m_dogrula_bagliyi_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            "        if not os.path.exists(os.path.join(KOK, yol)):\n            r.hata(\"baglanti\"",
            "        if False:\n            r.hata(\"baglanti\"")


def m_dogrula_derin_bagliyi_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            'elif parca and yol.endswith(".html") and parca not in sayfa_kimlikleri(yol):',
            "elif False:")


def m_dogrula_capaya_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            "        if any(g.lower() in metin for g in gercekler):",
            "        if True:")


def m_dogrula_derebeyi_satirina_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            "        elif beklenen != (il, ad):",
            "        elif False:")


def m_dogrula_bos_derebeyine_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            "        if not re.search(r'\\bad\\s*:\\s*\"[^\"]+\"', satir):",
            "        if False:")


def m_dogrula_sozdizimine_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            '                            compile(f.read(), yol, "exec")',
            "                            f.read()")


def m_dogrula_belgesiz_araca_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            '        if dosya.endswith(".py") and dosya not in belge:',
            "        if False:")


def m_mandal_gevsemeyi_gormesin(kok):
    duzenle(kok, ".claude/mandal.py",
            '        (sonuc["gevsedi"] if gevsedi else sonuc["siki"]).append((ad, eski, yeni, yon))',
            '        sonuc["siki"].append((ad, eski, yeni, yon))')


def m_mandal_head_tabanini_yok_saysin(kok):
    duzenle(kok, ".claude/mandal.py",
            "    head = _git_goster(kok, TABAN_YOLU)",
            "    head = None")


def m_mandal_gerekcesiz_kaydetsin(kok):
    duzenle(kok, ".claude/mandal.py",
            '    if s["gevsedi"] and not a.gerekce.strip():',
            "    if False:")


def m_kapi_tur_sonu_bloklamasin(kok):
    duzenle(kok, ".claude/kanca-kapi.py",
            '          file=sys.stderr)\n    return 2',
            '          file=sys.stderr)\n    return 0')


def m_kapi_sonsuz_donguye_girsin(kok):
    duzenle(kok, ".claude/kanca-kapi.py",
            '    if olay.get("stop_hook_active"):',
            "    if False:")


def m_kapi_commiti_sormasin(kok):
    duzenle(kok, ".claude/kanca-kapi.py",
            '"permissionDecision": "ask",',
            '"permissionDecision": "allow",')


def m_acilis_bekleyeni_gostermesin(kok):
    duzenle(kok, ".claude/kanca-acilis.py",
            '            if k.get("durum") == "acik"]',
            "            if False]")


def m_acilis_bolumu_kirpmasin(kok):
    duzenle(kok, ".claude/kanca-acilis.py",
            "kirp(s.stdout, 14)",
            "kirp(s.stdout, 10 ** 6)")


def m_dogrula_silinen_mandali_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            '            r.kapi("mandal", "mandal.py yok ama',
            '            print("mandal", "mandal.py yok ama')


def m_kapi_her_git_komutunu_gonderim_saysin(kok):
    """Eski geniş kalıp: `git stash push` da commit kapısına takılıyordu."""
    duzenle(kok, ".claude/kanca-kapi.py",
            r'GONDERIM = re.compile(r"\bgit(?:\s+-{1,2}[\w-]+(?:[= ](?!commit\b|push\b)\S+)?)*\s+(commit|push)\b")',
            r'GONDERIM = re.compile(r"\bgit\b[^\n;&|]*\b(commit|push)\b")')


def m_gorev_yazmayi_yalitimsiz_gondersin(kok):
    duzenle(kok, ".claude/kanca-gorev.py",
            "    if yalitim not in YALITIMLI:",
            "    if False:")


def m_gorev_kirli_agaci_gormesin(kok):
    duzenle(kok, ".claude/kanca-gorev.py",
            "    if kirli_agac(kok):",
            "    if False:")


def m_gorev_brief_ana_depoyu_versin(kok):
    duzenle(kok, ".claude/gorev.py",
            '    depo = KOK if a.mod != "yazma" else (',
            "    depo = KOK if True else (")


def m_ayar_agaci_mainden_acsin(kok):
    duzenle(kok, ".claude/settings.json",
            '"baseRef": "head"',
            '"baseRef": "fresh"')


def m_ara_aksani_katlamasin(kok):
    """Aksan katlaması yokken aksansız yazılan soruların %40'ı kayboluyordu."""
    duzenle(kok, ".claude/ara.py",
            '    kelimeler = re.findall(r"[0-9a-z]+", katla(metin))',
            '    kelimeler = re.findall(r"[0-9a-zçğıöşü]+", turkce_kucult(metin))')


def m_degerlendir_wald_aralik(kok):
    """Wilson merkezi yerine p: küçük n'de güvenilmez Wald aralığına döner."""
    duzenle(kok, ".claude/degerlendir.py",
            "    return max(0.0, merkez - yari), min(1.0, merkez + yari)",
            "    return max(0.0, p - yari), min(1.0, p + yari)")


def m_acilis_veriyi_ayirmasin(kok):
    """Defter metni yine özetin arasına, talimat gibi karışsın."""
    duzenle(kok, ".claude/kanca-acilis.py",
            "        ozet += [VERI_BASI] + veri[:yer] + [VERI_SONU]",
            "        ozet += veri[:yer]")


def m_acilis_satiri_kirpmasin(kok):
    duzenle(kok, ".claude/kanca-acilis.py", "SATIR_SINIRI = 160", "SATIR_SINIRI = 10 ** 6")


def m_acilis_kapanisi_etkisizlestirmesin(kok):
    duzenle(kok, ".claude/kanca-acilis.py",
            '    satir = satir.replace("---", "—")',
            "    satir = satir")


def m_dogrula_dile_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            """        if not re.search(r'<html\\b[^>]*\\blang\\s*=\\s*"tr"', html):""",
            "        if False:")


def m_dogrula_baslik_sirasina_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            "            if onceki and duzey > onceki + 1:",
            "            if False:")


def m_dogrula_sablon_gorseline_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            '            if not re.search(r"\\balt\\s*=", etiket.group(0)):\n'
            "                satir = js[:etiket.start()]",
            "            if False:\n"
            "                satir = js[:etiket.start()]")


def m_dogrula_adsiz_ogeye_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            "                if not metin.strip() and not re.search(",
            "                if False and not re.search(")


def m_dogrula_tanimsiz_atifa_kor(kok):
    duzenle(kok, ".claude/dogrula.py",
            "    for no in sorted(kullanilan - set(tanimli)):",
            "    for no in []:")


def m_gorev_uzak_oturumu_gormesin(kok):
    """Sözleşme kancası yine sadece yerel alt ajanı dinlesin."""
    duzenle(kok, ".claude/settings.json",
            '"matcher": "Agent|Task|mcp__claude-code-remote__create_session"',
            '"matcher": "Agent|Task"')


def m_saglik_gerilemeyi_gormesin(kok):
    duzenle(kok, ".claude/saglik.py",
            "        if a is not None and b is not None and b < a - 1e-9:",
            "        if False:")


def m_dogrula_belgeyi_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            "        elif [int(g) for g in eslesme.groups()] != [toplam, tuzak, masum]:",
            "        elif False:")


def m_ara_bilmiyorum_diyemesin(kok):
    duzenle(kok, ".claude/ara.py",
            "        if self.soz_dagari_kapsamasi(sorgu) < self.SOZ_DAGARI_ESIK:",
            "        if False:")


def m_hedef_kaymayi_gormesin(kok):
    duzenle(kok, ".claude/hedef.py",
            "    if simdiki != h[\"parmak_izi\"]:",
            "    if False:")


def m_hedef_ustu_erken_kapatsin(kok):
    duzenle(kok, ".claude/hedef.py",
            "        if acik:",
            "        if False:")


def m_hedef_parmak_izi_sabit(kok):
    duzenle(kok, ".claude/hedef.py",
            "    return hashlib.sha256(govde.encode(\"utf-8\")).hexdigest()[:16]",
            "    return \"sabit\"")


def m_gorev_baglam_enjekte_etmesin(kok):
    duzenle(kok, ".claude/gorev.py",
            "    if not a.baglamsiz:",
            "    if False:")


MUTASYONLAR = [
    ("görev: bağlam enjekte etmiyor",    m_gorev_baglam_enjekte_etmesin,     "arac-sinavi.py"),

    ("hedef: kaymayı görmüyor",          m_hedef_kaymayi_gormesin,           "arac-sinavi.py"),
    ("hedef: üstü erken kapatıyor",      m_hedef_ustu_erken_kapatsin,        "arac-sinavi.py"),
    ("hedef: parmak izi sabit",          m_hedef_parmak_izi_sabit,           "arac-sinavi.py"),

    # (ad, mutasyon, bunu yakalaması gereken sınav)
    ("devre: hiç kesmiyor",              m_devre_kesmesin,                   "arac-sinavi.py"),
    ("devre: süre bütçesi kör",          m_devre_sure_saymasin,              "arac-sinavi.py"),
    ("devre: ilerleme denetimi kör",     m_devre_ilerleme_kor,               "arac-sinavi.py"),

    ("yargı: uydurmayı görmüyor",        m_yargi_uydurmayi_gormesin,         "arac-sinavi.py"),
    ("yargı: eksik gönderimi saymıyor",  m_yargi_eksigi_saymasin,            "arac-sinavi.py"),
    ("yargı: atıf isabetini görmüyor",   m_yargi_atif_isabetini_gormesin,    "arac-sinavi.py"),

    ("görev: sözleşme kapısı açık",      m_gorev_sozlesme_kapisi_acilsin,    "arac-sinavi.py"),
    ("görev: atıf desteğini görmüyor",   m_gorev_atif_desteklemesini_gormesin, "arac-sinavi.py"),
    ("görev: yetki ihlalini görmüyor",   m_gorev_yetki_ihlalini_gormesin,    "arac-sinavi.py"),

    ("seyir: ham iz özete giriyor",      m_seyir_ham_izi_ozete_soksun,       "arac-sinavi.py"),
    ("seyir: gerekçesiz karar geçiyor",  m_seyir_gerekcesiz_karari_kabul_etsin, "arac-sinavi.py"),

    ("denetleyici: kontrast kör",        m_dogrula_kontrasti_gormesin,       "sinav.py"),
    ("denetleyici: odak kör",            m_dogrula_odagi_gormesin,           "sinav.py"),
    ("denetleyici: belge kör",           m_dogrula_belgeyi_gormesin,         "sinav.py"),

    ("arama: bilmiyorum diyemiyor",      m_ara_bilmiyorum_diyemesin,         "degerlendir.py"),

    ("denetleyici: yeni dosyaya kör",    m_dogrula_yeni_dosyaya_kor,         "sinav.py"),
    ("denetleyici: veri kanalına kör",   m_dogrula_veri_kanallarina_kor,     "sinav.py"),
    ("denetleyici: dış kaynağa kör",     m_dogrula_dis_kaynaga_kor,          "sinav.py"),
    ("denetleyici: kırık bağlantıya kör", m_dogrula_bagliyi_gormesin,        "sinav.py"),
    ("denetleyici: derin bağlantıya kör", m_dogrula_derin_bagliyi_gormesin,  "sinav.py"),
    ("denetleyici: çapaya kör",          m_dogrula_capaya_kor,               "sinav.py"),
    ("denetleyici: derebeyi satırına kör", m_dogrula_derebeyi_satirina_kor,  "sinav.py"),
    ("denetleyici: boş derebeyine kör",  m_dogrula_bos_derebeyine_kor,       "sinav.py"),
    ("denetleyici: sözdizimine kör",     m_dogrula_sozdizimine_kor,          "sinav.py"),
    ("denetleyici: belgesiz araca kör",  m_dogrula_belgesiz_araca_kor,       "sinav.py"),

    ("mandal: gevşemeyi görmüyor",       m_mandal_gevsemeyi_gormesin,        "arac-sinavi.py"),
    ("mandal: HEAD tabanını yok sayıyor", m_mandal_head_tabanini_yok_saysin, "arac-sinavi.py"),
    ("mandal: gerekçesiz kaydediyor",    m_mandal_gerekcesiz_kaydetsin,      "arac-sinavi.py"),

    ("kapı: tur sonu bloklamıyor",       m_kapi_tur_sonu_bloklamasin,        "arac-sinavi.py"),
    ("kapı: sonsuz döngü koruması yok",  m_kapi_sonsuz_donguye_girsin,       "arac-sinavi.py"),
    ("kapı: kırmızı commit'i sormuyor",  m_kapi_commiti_sormasin,            "arac-sinavi.py"),

    ("açılış: bekleyeni göstermiyor",    m_acilis_bekleyeni_gostermesin,     "arac-sinavi.py"),
    ("açılış: bölüm kırpılmıyor",        m_acilis_bolumu_kirpmasin,          "arac-sinavi.py"),

    ("sağlık: gerilemeyi görmüyor",      m_saglik_gerilemeyi_gormesin,       "arac-sinavi.py"),

    ("görev: uzak oturumu görmüyor",     m_gorev_uzak_oturumu_gormesin,      "arac-sinavi.py"),
    ("denetleyici: silinen mandala kör", m_dogrula_silinen_mandali_gormesin, "sinav.py"),
    ("kapı: her git komutu gönderim",    m_kapi_her_git_komutunu_gonderim_saysin, "arac-sinavi.py"),

    ("yalıtım: yazma ajanı ana ağaçta",  m_gorev_yazmayi_yalitimsiz_gondersin, "arac-sinavi.py"),
    ("yalıtım: kirli ağacı görmüyor",    m_gorev_kirli_agaci_gormesin,       "arac-sinavi.py"),
    ("yalıtım: brief ana depoyu veriyor", m_gorev_brief_ana_depoyu_versin,   "arac-sinavi.py"),
    ("yalıtım: ağaç main'den açılıyor",  m_ayar_agaci_mainden_acsin,         "arac-sinavi.py"),

    ("arama: aksanı katlamıyor",         m_ara_aksani_katlamasin,            "degerlendir.py"),
    ("istatistik: Wald aralığına döndü", m_degerlendir_wald_aralik,          "arac-sinavi.py"),

    ("açılış: veri ayrılmıyor",          m_acilis_veriyi_ayirmasin,          "arac-sinavi.py"),
    ("açılış: satır kırpılmıyor",        m_acilis_satiri_kirpmasin,          "arac-sinavi.py"),
    ("açılış: blok içeriden kapanıyor",  m_acilis_kapanisi_etkisizlestirmesin, "arac-sinavi.py"),

    ("erişim: sayfa diline kör",         m_dogrula_dile_kor,                 "sinav.py"),
    ("erişim: başlık sırasına kör",      m_dogrula_baslik_sirasina_kor,      "sinav.py"),
    ("erişim: şablon görseline kör",     m_dogrula_sablon_gorseline_kor,     "sinav.py"),
    ("erişim: adsız öğeye kör",          m_dogrula_adsiz_ogeye_kor,          "sinav.py"),

    ("kaynakça: tanımsız atıfa kör",     m_dogrula_tanimsiz_atifa_kor,       "sinav.py"),
]


def kos(kok, betik):
    return subprocess.run([sys.executable, os.path.join(kok, ".claude", betik)],
                          cwd=kok, capture_output=True, text=True, timeout=300)


def kopyada_dene(degistir, sinav):
    """Deponun kopyasında değişikliği uygula, sınavı koş, sonucu döndür.

    Dönüş: ("yakalandi" | "kacti" | "hata", ayrıntı)
    """
    gecici = tempfile.mkdtemp()
    kok = os.path.join(gecici, "depo")
    try:
        shutil.copytree(KAYNAK, kok)
        durum = os.path.join(kok, ".claude", "devre-durumu.json")
        if os.path.exists(durum):
            os.remove(durum)
        degistir(kok)
        sonuc = kos(kok, sinav)
        return ("yakalandi" if sonuc.returncode != 0 else "kacti"), ""
    except AssertionError as e:
        return "hata", str(e)
    except Exception as e:
        return "hata", f"{type(e).__name__}: {e}"
    finally:
        shutil.rmtree(gecici, ignore_errors=True)


def paralel(isler, is_sayisi):
    """Bağımsız kopyalarda koşan işleri aynı anda yürütür, SIRAYI korur.

    Mutasyon testinin bilinen temel sorunu maliyettir [K6]: her mutant bir
    sınav koşusu demek. Her mutant kendi geçici kopyasında koştuğu için
    birbirinden bağımsız — aynı anda koşturmak sonucu değiştirmez, süreyi
    kısaltır.
    """
    with ThreadPoolExecutor(max_workers=max(1, is_sayisi)) as havuz:
        return list(havuz.map(lambda f: f(), isler))


# ------------------------------------------------------- otomatik mutantlar
# Elle yazılan mutasyonlar, yazanın aklına gelen davranışları korur. Aklına
# GELMEYENİ bulmanın yolu, mutantı bir operatör kümesiyle makineye
# ürettirmek [K5][K6]: her karşılaştırmayı ters çevir, her "ve"yi "veya"
# yap, her "değil"i kaldır, her hata bildirimini sil — ve sınavın her birini
# yakalayıp yakalamadığına bak.
#
# Hayatta kalan bir mutant iki şeyden biridir: ya hiçbir testin korumadığı
# bir davranış, ya da programın davranışını hiç değiştirmeyen "eşdeğer" bir
# mutant. Eşdeğer mutant sorunu mutasyon testinin bilinen temel
# sorunlarından biri [K6]; ikisini ayırmak insan işi. Bu yüzden hayatta
# kalan mutant hata değil, insan kapısıdır (çıkış 3).

KARSILASTIRMA = {
    ast.Eq: ast.NotEq, ast.NotEq: ast.Eq, ast.Lt: ast.GtE, ast.GtE: ast.Lt,
    ast.Gt: ast.LtE, ast.LtE: ast.Gt, ast.In: ast.NotIn, ast.NotIn: ast.In,
    ast.Is: ast.IsNot, ast.IsNot: ast.Is,
}
OTOMATIK_DOSYA = ".claude/dogrula.py"
OTOMATIK_ONEK = "d_"          # sadece denetim fonksiyonları
OTOMATIK_SINAV = "sinav.py"


class _Mutator(ast.NodeTransformer):
    """Hedef fonksiyonlardaki mutasyon noktalarını sırayla sayar.

    hedef=None: sadece sayar ve listeler. hedef=k: k numaralı noktayı değiştirir.
    Sayma sırası her ayrıştırmada aynıdır; numara iki koşu arasında aynı
    noktayı gösterir (kod değişmedikçe).
    """

    def __init__(self, onek, hedef=None):
        self.onek, self.hedef, self.sayac = onek, hedef, 0
        self.noktalar = []   # (fonksiyon, satır, açıklama)
        self._fonksiyon = None

    def visit_FunctionDef(self, dugum):
        if not dugum.name.startswith(self.onek):
            return dugum
        onceki, self._fonksiyon = self._fonksiyon, dugum.name
        self.generic_visit(dugum)
        self._fonksiyon = onceki
        return dugum

    def _nokta(self, dugum, aciklama):
        if self._fonksiyon is None:
            return False
        no, self.sayac = self.sayac, self.sayac + 1
        self.noktalar.append((self._fonksiyon, getattr(dugum, "lineno", 0), aciklama))
        return no == self.hedef

    def visit_Compare(self, dugum):
        self.generic_visit(dugum)
        if len(dugum.ops) == 1 and type(dugum.ops[0]) in KARSILASTIRMA:
            yeni = KARSILASTIRMA[type(dugum.ops[0])]
            if self._nokta(dugum, f"{type(dugum.ops[0]).__name__} → {yeni.__name__}"):
                dugum.ops = [yeni()]
        return dugum

    def visit_BoolOp(self, dugum):
        self.generic_visit(dugum)
        yeni = ast.Or if isinstance(dugum.op, ast.And) else ast.And
        if self._nokta(dugum, f"{type(dugum.op).__name__} → {yeni.__name__}"):
            dugum.op = yeni()
        return dugum

    def visit_UnaryOp(self, dugum):
        self.generic_visit(dugum)
        if isinstance(dugum.op, ast.Not) and self._nokta(dugum, "not kaldırıldı"):
            return dugum.operand
        return dugum

    def visit_Expr(self, dugum):
        self.generic_visit(dugum)
        c = dugum.value
        if (isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute)
                and c.func.attr in ("hata", "kapi")
                and isinstance(c.func.value, ast.Name) and c.func.value.id == "r"
                and self._nokta(dugum, f"r.{c.func.attr}(...) silindi")):
            return ast.Pass()
        return dugum


def otomatik_noktalar(metin):
    m = _Mutator(OTOMATIK_ONEK)
    m.visit(ast.parse(metin))
    return m.noktalar


def otomatik_mutant(metin, no):
    """no numaralı noktası değiştirilmiş kaynak. no=None: değiştirilmemiş
    ama aynı yoldan (ayrıştır → yeniden yaz) geçmiş kaynak — kontrol koşusu."""
    agac = _Mutator(OTOMATIK_ONEK, hedef=no).visit(ast.parse(metin))
    return ast.unparse(ast.fix_missing_locations(agac))


def otomatik(secim):
    with open(os.path.join(KAYNAK, OTOMATIK_DOSYA), encoding="utf-8") as f:
        metin = f.read()
    noktalar = otomatik_noktalar(metin)
    sira = list(range(len(noktalar)))
    if secim.otomatik and secim.otomatik < len(sira):
        sira = sorted(random.Random(secim.tohum).sample(sira, secim.otomatik))

    def yazici(icerik):
        def degistir(kok):
            with open(os.path.join(kok, OTOMATIK_DOSYA), "w", encoding="utf-8") as f:
                f.write(icerik)
        return degistir

    # Kontrol: yeniden yazma yolu tek başına sınavı düşürüyorsa her mutant
    # "yakalandı" görünür — ölçü anlamsızlaşır. Önce yolun temiz olduğunu gör.
    kontrol, ayrinti = kopyada_dene(yazici(otomatik_mutant(metin, None)), OTOMATIK_SINAV)
    if kontrol != "kacti":
        print(f"KONTROL DÜŞTÜ: değiştirilmemiş kaynak yeniden yazılınca "
              f"{OTOMATIK_SINAV} geçmedi ({kontrol} {ayrinti}). Ölçüm yapılamaz.")
        return 1

    isler = []
    for no in sira:
        icerik = otomatik_mutant(metin, no)
        try:
            compile(icerik, OTOMATIK_DOSYA, "exec")
        except SyntaxError:
            isler.append(lambda: ("hata", "geçersiz mutant"))
            continue
        isler.append(lambda d=yazici(icerik): kopyada_dene(d, OTOMATIK_SINAV))
    sonuclar = paralel(isler, secim.is_sayisi)

    olen = sum(1 for d, _ in sonuclar if d == "yakalandi")
    hayatta = [(noktalar[no], ayr) for no, (d, ayr) in zip(sira, sonuclar) if d == "kacti"]
    gecersiz = sum(1 for d, _ in sonuclar if d == "hata")
    print(f"Otomatik mutantlar — {OTOMATIK_DOSYA}, {OTOMATIK_ONEK}* fonksiyonları: "
          f"{len(noktalar)} nokta, {len(sira)} denendi (tohum {secim.tohum}).")
    for (fonk, satir, aciklama), _ in hayatta:
        print(f"  HAYATTA  {fonk}:{satir:<5} {aciklama}")
    gecerli = len(sira) - gecersiz
    print(f"\nSkor: {olen}/{gecerli} mutant öldürüldü"
          + (f" (%{100 * olen / gecerli:.0f})" if gecerli else "")
          + (f", {gecersiz} geçersiz mutant atlandı" if gecersiz else "") + ".")
    if hayatta:
        print(f"{len(hayatta)} mutant hayatta. Her biri ya eksik bir test ya da "
              "davranışı değiştirmeyen\n(eşdeğer) bir mutant — ayırmak insan işi. "
              "Eksik testse sinav.py'ye vaka ekle.")
        return 3
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Testler gerçekten canlı mı.")
    a.add_argument("--ayrinti", action="store_true")
    a.add_argument("--is", dest="is_sayisi", type=int,
                   default=min(4, os.cpu_count() or 1),
                   help="aynı anda koşacak kopya sayısı")
    a.add_argument("--otomatik", type=int, default=None, metavar="N",
                   help="elle yazılanlar yerine N otomatik mutant dene (0 = hepsi)")
    a.add_argument("--tohum", type=int, default=0)
    secim = a.parse_args(argv)

    if secim.otomatik is not None:
        return otomatik(secim)

    sonuclar = paralel([lambda m=m, s=s: kopyada_dene(m, s) for _, m, s in MUTASYONLAR],
                       secim.is_sayisi)
    yakalandi = kacti = hata = 0
    for (ad, _, sinav), (durum, ayrinti) in zip(MUTASYONLAR, sonuclar):
        if durum == "yakalandi":
            yakalandi += 1
            if secim.ayrinti:
                print(f"  OK   {ad:36} → {sinav} düştü")
        elif durum == "kacti":
            kacti += 1
            print(f"  KAÇTI {ad:35} → {sinav} YEŞİL KALDI")
            print(f"        Bu davranışı hiçbir test korumuyor. "
                  f"{sinav} dosyasına vaka ekle.")
        else:
            hata += 1
            print(f"  ??   {ad:36} → {ayrinti}")

    toplam = len(MUTASYONLAR)
    print(f"\n{yakalandi}/{toplam} mutasyon yakalandı.")
    if hata:
        print(f"{hata} mutasyon uygulanamadı — hedef kod değişmiş olabilir, "
              "mutasyonu güncelle.")
    if kacti:
        print(f"\n{kacti} MUTASYON KAÇTI. Kaçan her mutasyon, hiçbir testin "
              "korumadığı\nbir davranış demektir — testin var olması yetmez, "
              "canlı olması gerekir.")
        return 1
    if hata:
        return 1
    print("Bütün mutasyonlar yakalandı: testler canlı.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
