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
import os
import shutil
import subprocess
import sys
import tempfile

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
    """Atıf geçerli ama YANLIŞ satırı gösteriyor — üretimdeki en yaygın hata.

    Mutasyon bir kez bayatladı: altın set şeması tek satırdan listeye
    geçince hedef satır değişti ve mutasyon "uygulanamadı" dedi. Bayat
    mutasyon, ölü test kadar yanıltıcı değil ama aynı yönde bir körlük —
    o davranış o koşuda hiç sınanmamış olur.
    """
    duzenle(kok, ".claude/yargi.py",
            "            elif not any(b <= no <= s for b, s in araliklar",
            "            elif False and any(b <= no <= s for b, s in araliklar")


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
            '        if ":focus-visible" in secici:\n            continue',
            '        if True:\n            continue')


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


def m_surum_dokuzu_asabilsin(kok):
    duzenle(kok, ".claude/surum.py",
            '    if y["yama"] < EN_FAZLA:',
            "    if True:")


def m_dogrula_surumu_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            "            elif eslesme.group(1) != beklenen:",
            "            elif False:")


def m_logo_surumu_gomsun(kok):
    """Numarayı gövdeye çakmak: bugün doğru, v1.2'de sessizce yanlış."""
    duzenle(kok, ".claude/logo.py",
            '    """İşaret + yazı + sürüm. Sürüm numarası surum.json\'dan geliyor."""',
            '    surum_metni = "v1.1"')


def m_dogrula_logoyu_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            "            sorunlar = logo.bayat()",
            "            sorunlar = []")


def m_butunluk_plaka_gormesin(kok):
    duzenle(kok, ".claude/butunluk.py",
            "              if i[\"plaka\"] in PLAKALAR and i[\"il\"] != PLAKALAR[i[\"plaka\"]]]",
            "              if False]")


def m_butunluk_siralamayi_gormesin(kok):
    duzenle(kok, ".claude/butunluk.py",
            "                    if e.group(0).lower() not in kanon:",
            "                    if False:")


def m_okuyucu_zinciri_kirsin(kok):
    """Dizgi zinciri birleşmezse uzun metinler yarım okunur — sessizce."""
    duzenle(kok, ".claude/okuyucu.py",
            "        parcalar = [self.dizgi()]",
            "        return self.dizgi()\n        parcalar = [self.dizgi()]")


def m_dogrula_altin_kaymasini_gormesin(kok):
    duzenle(kok, ".claude/dogrula.py",
            "            if not any(g.lower() in metin for g in gercekler):",
            "            if False:")


def m_olay_kodu_yutsun(kok):
    """Dağıtıcı işleyicinin çıkış kodunu yutarsa zorlama katmanı ölür —
    ve hiçbir yerde bağırmaz, çünkü sınavlar betikleri doğrudan çağırıyor."""
    duzenle(kok, ".claude/olay.py",
            "        if s.returncode == 2:\n            kod = 2",
            "        if False:\n            kod = 2")


def m_olay_bilinmeyeni_sessizce_dussun(kok):
    duzenle(kok, ".claude/olay.py",
            '                    "olay": olay_adi, "arac": arac, "karar": "dinleyicisi yok"})',
            '                    "olay": olay_adi, "arac": arac, "karar": "gecti"})')


def m_eniyile_kisiri_gormesin(kok):
    duzenle(kok, ".claude/eniyile.py",
            "    if kisir >= KISIR_TUR_SINIRI:",
            "    if False:")


def m_eniyile_puani_ikilesin(kok):
    """Kısmi puanı ikiliye indirmek bu döngünün varlık sebebini siler."""
    duzenle(kok, ".claude/eniyile.py",
            "        return temiz / toplam, bulgular, False",
            "        return 0.0, bulgular, False")


def m_eniyile_kapiyi_optimize_etsin(kok):
    duzenle(kok, ".claude/eniyile.py",
            "    if kapi:",
            "    if False:")


def m_tirmanma_onbellegi_temizlemesin(kok):
    """Önbellek geçersizleşmezse tırmanış hiçbir şey ölçmez ve her komşu
    'eşit' çıkar — sahte plato. Ölçmediğini ölçtüğünü sanmak."""
    duzenle(kok, ".claude/tirmanma.py",
            '    shutil.rmtree(os.path.join(kok, ".claude", "__pycache__"), ignore_errors=True)\n    ortam = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")',
            "    ortam = dict(os.environ)")


def m_tirmanma_kapiyi_gormesin(kok):
    duzenle(kok, ".claude/tirmanma.py",
            "        return self.konu_disi >= 100 and self.sahte >= 100 and self.kapsama >= 90",
            "        return True")


def m_elestirmen_lastik_damgayi_gormesin(kok):
    duzenle(kok, ".claude/elestirmen.py",
            "    if onay and mekanik:",
            "    if False:")


def m_elestirmen_sessiz_onayi_kabul_etsin(kok):
    duzenle(kok, ".claude/elestirmen.py",
            "    if not bulgular and not onay:",
            "    if False:")


def m_elestirmen_uydurma_atifi_gormesin(kok):
    duzenle(kok, ".claude/elestirmen.py",
            "            if not (1 <= int(no) <= satir_sayisi):",
            "            if False:")


def m_tdd_gecen_testle_baslasin(kok):
    """Kırmızı kapısı kapanırsa TDD bir hatırlatmaya dönüşür."""
    duzenle(kok, ".claude/tdd.py",
            "    if sonuc is None:\n        # KAPI.",
            "    if False:\n        # KAPI.")


def m_tdd_kirmizisiz_yesile_izin_versin(kok):
    duzenle(kok, ".claude/tdd.py",
            '    if a.vaka not in d or d[a.vaka].get("asama") != "kirmizi":',
            "    if False:")


def m_tdd_test_silmeye_izin_versin(kok):
    duzenle(kok, ".claude/tdd.py",
            "    if onceki is not None and sayi < onceki:",
            "    if False:")


MUTASYONLAR = [
    ("tırmanma: önbellek temizlenmiyor", m_tirmanma_onbellegi_temizlemesin,  "arac-sinavi.py"),
    ("tırmanma: kapıyı görmüyor",        m_tirmanma_kapiyi_gormesin,         "arac-sinavi.py"),

    ("eleştirmen: lastik damgayı görmüyor", m_elestirmen_lastik_damgayi_gormesin, "arac-sinavi.py"),
    ("eleştirmen: sessiz onayı kabul ediyor", m_elestirmen_sessiz_onayi_kabul_etsin, "arac-sinavi.py"),
    ("eleştirmen: uydurma atıfı görmüyor", m_elestirmen_uydurma_atifi_gormesin, "arac-sinavi.py"),

    ("tdd: geçen testle başlıyor",       m_tdd_gecen_testle_baslasin,        "arac-sinavi.py"),
    ("tdd: kırmızısız yeşile geçiyor",   m_tdd_kirmizisiz_yesile_izin_versin, "arac-sinavi.py"),
    ("tdd: test silmeye izin veriyor",   m_tdd_test_silmeye_izin_versin,     "arac-sinavi.py"),

    ("olay: çıkış kodunu yutuyor",       m_olay_kodu_yutsun,                 "arac-sinavi.py"),
    ("olay: bilinmeyeni sessizce düşürüyor", m_olay_bilinmeyeni_sessizce_dussun, "arac-sinavi.py"),
    ("eniyile: kısırlığı görmüyor",      m_eniyile_kisiri_gormesin,          "arac-sinavi.py"),
    ("eniyile: puanı ikili yapıyor",     m_eniyile_puani_ikilesin,           "arac-sinavi.py"),
    ("eniyile: kapıyı optimize ediyor",  m_eniyile_kapiyi_optimize_etsin,    "arac-sinavi.py"),

    ("bütünlük: plaka hatasını görmüyor", m_butunluk_plaka_gormesin,          "arac-sinavi.py"),
    ("bütünlük: sıralamayı görmüyor",     m_butunluk_siralamayi_gormesin,     "arac-sinavi.py"),
    ("okuyucu: dizgi zinciri kırık",      m_okuyucu_zinciri_kirsin,           "arac-sinavi.py"),
    ("belge: altın set kaymasını görmüyor", m_dogrula_altin_kaymasini_gormesin, "arac-sinavi.py"),

    ("sürüm: yama 9'u aşabiliyor",       m_surum_dokuzu_asabilsin,           "arac-sinavi.py"),
    ("sürüm: belge kaymasını görmüyor",  m_dogrula_surumu_gormesin,          "arac-sinavi.py"),

    ("logo: sürüm gövdeye çakılı",       m_logo_surumu_gomsun,               "arac-sinavi.py"),
    ("logo: bayatlığı görmüyor",         m_dogrula_logoyu_gormesin,          "arac-sinavi.py"),

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
]


def kos(kok, betik):
    return subprocess.run([sys.executable, os.path.join(kok, ".claude", betik)],
                          cwd=kok, capture_output=True, text=True, timeout=300)


def main(argv):
    a = argparse.ArgumentParser(description="Testler gerçekten canlı mı.")
    a.add_argument("--ayrinti", action="store_true")
    secim = a.parse_args(argv)

    yakalandi = kacti = hata = 0
    for ad, mutasyon, sinav in MUTASYONLAR:
        gecici = tempfile.mkdtemp()
        kok = os.path.join(gecici, "depo")
        try:
            shutil.copytree(KAYNAK, kok)
            durum = os.path.join(kok, ".claude", "devre-durumu.json")
            if os.path.exists(durum):
                os.remove(durum)
            mutasyon(kok)
            sonuc = kos(kok, sinav)

            if sonuc.returncode != 0:
                yakalandi += 1
                if secim.ayrinti:
                    print(f"  OK   {ad:36} → {sinav} düştü")
            else:
                kacti += 1
                print(f"  KAÇTI {ad:35} → {sinav} YEŞİL KALDI")
                print(f"        Bu davranışı hiçbir test korumuyor. "
                      f"{sinav} dosyasına vaka ekle.")
        except AssertionError as e:
            hata += 1
            print(f"  ??   {ad:36} → {e}")
        except Exception as e:
            hata += 1
            print(f"  ??   {ad:36} → {type(e).__name__}: {e}")
        finally:
            shutil.rmtree(gecici, ignore_errors=True)

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
