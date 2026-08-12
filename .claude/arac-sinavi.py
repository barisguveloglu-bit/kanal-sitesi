#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Araç sınavı
===============================================================
`sinav.py` denetleyiciyi ölçer, `degerlendir.py` aramayı ölçer.
Bu betik geri kalan üç aracı ölçer: **devre kesici, yargıç ve geri bildirim.**

Neden gerekli: bu üçü elle denenmişti ve çalışıyordu. Ama elle yapılan
deneme buharlaşır — bir sonraki değişiklikte kimse tekrar denemez ve
bozulduğu gün kimse fark etmez. Ölçülmeyen bir güvenlik mekanizması,
çalıştığı sanılan bir güvenlik mekanizmasıdır.

Her vaka gerçek depoyu değil geçici bir kopyayı kullanır; kalıcı durum
dosyalarına (devre-durumu, geri-bildirim defteri) dokunmaz.

    python3 .claude/arac-sinavi.py

Çıkış kodu: 0 hepsi beklendiği gibi, 1 en az bir sapma.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

KAYNAK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def kos(kok, betik, *arg):
    return subprocess.run([sys.executable, os.path.join(kok, ".claude", betik), *arg],
                          cwd=kok, capture_output=True, text=True, timeout=120)


def kopya():
    gecici = tempfile.mkdtemp()
    kok = os.path.join(gecici, "depo")
    shutil.copytree(KAYNAK, kok)
    # Kalıcı durum kopyaya taşınmasın; her vaka temiz başlasın.
    for artik in (".claude/devre-durumu.json",):
        yol = os.path.join(kok, artik)
        if os.path.exists(yol):
            os.remove(yol)
    return gecici, kok


# ------------------------------------------------------------- devre kesici

def t_devre_sinirda_kesiyor(kok):
    for _ in range(3):
        s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "3")
        if s.returncode != 0:
            return f"sınır dolmadan kesti (çıkış {s.returncode})"
    s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "3")
    if s.returncode != 1:
        return f"sınır aşıldığı hâlde kesmedi (çıkış {s.returncode})"
    if "DEVRE KESİLDİ" not in s.stdout:
        return "kesildi ama mesaj yok"
    return None


def t_devre_basari_sifirliyor(kok):
    kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "2")
    kos(kok, "devre.py", "basari", "--halka", "t")
    s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "2")
    if "1/2" not in s.stdout:
        return f"başarıdan sonra sayaç sıfırlanmadı: {s.stdout.strip()[:60]}"
    return None


def t_devre_bayat_sifirliyor(kok):
    from datetime import datetime, timedelta
    kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "2")
    yol = os.path.join(kok, ".claude", "devre-durumu.json")
    d = json.load(open(yol, encoding="utf-8"))
    d["t"]["son"] = (datetime.now() - timedelta(hours=99)).isoformat(timespec="seconds")
    d["t"]["sayac"] = 500
    json.dump(d, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "2")
    if "1/2" not in s.stdout:
        return f"bayat sayaç sıfırlanmadı: {s.stdout.strip()[:60]}"
    return None


def t_devre_bozuk_durum_kilitlemiyor(kok):
    yol = os.path.join(kok, ".claude", "devre-durumu.json")
    open(yol, "w", encoding="utf-8").write("{bu gecerli json degil")
    s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "3")
    if s.returncode != 0:
        return f"bozuk durum dosyası akışı kilitledi (çıkış {s.returncode})"
    return None


def t_devre_defter_tutuyor(kok):
    kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "3", "--not", "birinci deneme")
    s = kos(kok, "devre.py", "durum")
    if "birinci deneme" not in s.stdout:
        return "deftere yazılan not durum çıktısında yok"
    return None


# ------------------------------------------------------------------ yargıç

def _cevaplar(kok, bozma=None):
    """Altın setten kusursuz bir cevap seti üretir; istenirse tek yerini bozar."""
    sys.path.insert(0, os.path.join(kok, ".claude"))
    import importlib.util
    t = importlib.util.spec_from_file_location("y_" + str(abs(hash(kok))),
                                               os.path.join(kok, ".claude", "yargi.py"))
    m = importlib.util.module_from_spec(t)
    t.loader.exec_module(m)
    altin = json.load(open(os.path.join(kok, ".claude", "altin-sorular.json"),
                           encoding="utf-8"))
    cikti = []
    for v in m.vakalari_diz(altin):
        if v["tur"] == "cevaplanabilir":
            cikti.append({"no": v["no"], "cevap": f"Cevap: {v['gercekler'][0]}.",
                          "atiflar": [f"LORE.md:{v['satir']}"], "reddetti": False})
        else:
            cikti.append({"no": v["no"], "cevap": "Canon bunu söylemiyor.",
                          "atiflar": [], "reddetti": True})
    if bozma:
        bozma(cikti, m.vakalari_diz(altin))
    yol = os.path.join(kok, "cevaplar.json")
    json.dump(cikti, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    return yol


def t_yargi_temiz_gecer(kok):
    s = kos(kok, "yargi.py", "puanla", "--dosya", _cevaplar(kok))
    if s.returncode != 0:
        return f"kusursuz set geçmedi: {s.stdout.strip()[-200:]}"
    return None


def t_yargi_uydurma_yakalar(kok):
    def boz(c, v):
        for cevap, vaka in zip(c, v):
            if vaka["tur"] == "cevapsiz":
                cevap["cevap"] = f"Evet, {vaka['olmamali'][0]} var."
                cevap["reddetti"] = False
                return
    s = kos(kok, "yargi.py", "puanla", "--dosya", _cevaplar(kok, boz))
    if s.returncode != 1 or "UYDURMA" not in s.stdout:
        return "canon'un sustuğu soruda uydurma yakalanmadı"
    return None


def t_yargi_sinirdisi_atif_yakalar(kok):
    def boz(c, v):
        c[0]["atiflar"] = ["LORE.md:999999"]
    s = kos(kok, "yargi.py", "puanla", "--dosya", _cevaplar(kok, boz))
    if s.returncode != 1 or "geçersiz atıf" not in s.stdout:
        return "dosya sınırı dışındaki atıf yakalanmadı"
    return None


def t_yargi_atifsiz_iddia_yakalar(kok):
    def boz(c, v):
        for cevap, vaka in zip(c, v):
            if vaka["tur"] == "cevaplanabilir":
                cevap["atiflar"] = []
                return
    s = kos(kok, "yargi.py", "puanla", "--dosya", _cevaplar(kok, boz))
    if s.returncode != 1 or "atıf yok" not in s.stdout:
        return "atıfsız canon iddiası yakalanmadı"
    return None


def t_yargi_gereksiz_ret_yakalar(kok):
    def boz(c, v):
        for cevap, vaka in zip(c, v):
            if vaka["tur"] == "cevaplanabilir":
                cevap["reddetti"] = True
                return
    s = kos(kok, "yargi.py", "puanla", "--dosya", _cevaplar(kok, boz))
    if s.returncode != 1 or "reddetti" not in s.stdout:
        return "cevabı olan soruyu reddetme yakalanmadı"
    return None


def t_yargi_hazirla_sizdirmiyor(kok):
    """En kritik test: cevaplayana verilen dosya cevabı içermemeli."""
    s = kos(kok, "yargi.py", "hazirla")
    if s.returncode != 0:
        return "hazirla çalışmadı"
    veri = json.loads(s.stdout)
    for kayit in veri:
        if set(kayit) != {"no", "soru"}:
            return f"hazirla fazla alan sızdırıyor: {sorted(set(kayit))}"

    # Sızıntı, bir gerçeğin çıktıda GEÇMESİ değil, KENDİ sorusunda geçmesidir.
    # "Sarı Gülücük" başka bir sorunun metninde geçebilir; bu ipucu değildir.
    # Ama bir sorunun cevabı kendi metninde duruyorsa cevaplayan hiç
    # aramadan bilir ve ölçüm anlamını yitirir.
    altin = json.load(open(os.path.join(kok, ".claude", "altin-sorular.json"),
                           encoding="utf-8"))
    metinler = {k["soru"] for k in veri}
    for v in altin["sorular"]:
        if v["soru"] not in metinler:
            return f"altın sette olan soru hazirla çıktısında yok: {v['soru']!r}"
        for g in v["gercekler"]:
            if g.lower() in v["soru"].lower():
                return (f"soru kendi cevabını içeriyor: {v['soru']!r} → {g!r}. "
                        "Bu soru ölçüm değeri taşımaz, altın setten çıkar ya da değiştir.")

    # Cevapsız sorular da eksiksiz aktarılmalı; biri düşerse uydurma
    # sınavının o kadarı hiç yapılmamış olur.
    for v in altin["cevapsiz"]:
        if v["soru"] not in metinler:
            return f"cevapsız soru hazirla çıktısında yok: {v['soru']!r}"
    return None


def t_yargi_eksik_gonderim_yakalar(kok):
    """Bir kez düzeltilen açık: zor soruları hiç göndermeyip tam puan almak.

    Puanlama gönderilen cevaplar üzerinden yapılıyordu; 26 sorudan 3'ünü
    gönderen 3/3 alıyordu. Uydurmanın ölçüldüğü sorular atlanabiliyordu.
    """
    yol = _cevaplar(kok)
    hepsi = json.load(open(yol, encoding="utf-8"))
    json.dump(hepsi[:3], open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "yargi.py", "puanla", "--dosya", yol)
    if s.returncode != 1:
        return f"eksik gönderim tam puan aldı (çıkış {s.returncode})"
    if "cevaplanmamış" not in s.stdout:
        return "eksik cevaplar raporlanmadı"
    if f"/{len(hepsi)}" not in s.stdout:
        return f"payda gönderilen sayıya göre hesaplandı: {s.stdout.strip()[-120:]}"
    return None


def t_yargi_yinelenen_yakalar(kok):
    yol = _cevaplar(kok)
    hepsi = json.load(open(yol, encoding="utf-8"))
    hepsi.append(dict(hepsi[0]))
    json.dump(hepsi, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "yargi.py", "puanla", "--dosya", yol)
    if s.returncode != 1 or "birden çok kez" not in s.stdout:
        return "aynı numaranın tekrar gönderilmesi yakalanmadı"
    return None


# ------------------------------------------------------------------- kanca

def _kanca(kok, dosya):
    olay = json.dumps({"tool_name": "Edit", "cwd": kok,
                       "tool_input": {"file_path": os.path.join(kok, dosya)}})
    return subprocess.run([sys.executable, os.path.join(kok, ".claude", "kanca.py")],
                          cwd=kok, input=olay, capture_output=True,
                          text=True, timeout=120)


def t_kanca_kapi_sayaci_artirmiyor(kok):
    """İnsan kapısı başarısızlık değildir; sayacı artırmamalı, sıfırlamalı."""
    kos(kok, "devre.py", "dene", "--halka", "denetim", "--sinir", "3", "--not", "önceki")
    yol = os.path.join(kok, "assets/js/data.js")
    s = open(yol, encoding="utf-8").read()
    open(yol, "w", encoding="utf-8").write(
        s.replace('baslangic: { kimlik: ""', 'baslangic: { kimlik: "Kj8mN2pQ4rT"', 1))
    sonuc = _kanca(kok, "assets/js/data.js")
    if sonuc.returncode != 2 or "insan onayı" not in sonuc.stderr:
        return f"kapı olayı geri beslenmedi (çıkış {sonuc.returncode})"
    d = kos(kok, "devre.py", "durum")
    if "Açık halka yok" not in d.stdout:
        return f"kapı olayı sayacı sıfırlamadı: {d.stdout.strip()[:70]}"
    return None


def t_kanca_ustuste_hatada_kesiyor(kok):
    yol = os.path.join(kok, "assets/css/style.css")
    s = open(yol, encoding="utf-8").read()
    open(yol, "w", encoding="utf-8").write(
        s.replace("[hidden] { display: none !important; }", ""))
    for tur in range(1, 5):
        sonuc = _kanca(kok, "assets/css/style.css")
        if tur < 4 and "DEVRE KESİLDİ" in sonuc.stderr:
            return f"{tur}. turda erken kesti"
        if tur == 4 and "DEVRE KESİLDİ" not in sonuc.stderr:
            return "4. turda kesmesi gerekirken kesmedi"
    return None


def t_dogrula_bozuk_araca_dayaniyor(kok):
    """Bir araç bozulursa denetimin tamamı çökmemeli."""
    with open(os.path.join(kok, ".claude", "sinav.py"), "a", encoding="utf-8") as f:
        f.write("\ndef bozuk( sozdizimi hatasi\n")
    s = kos(kok, "dogrula.py")
    if s.returncode not in (1, 3):
        return f"denetleyici çöktü (çıkış {s.returncode})"
    if "Traceback" in s.stderr:
        return "denetleyici izleme yığınıyla çöktü"
    if "sinav.py okunamadı" not in s.stdout:
        return "bozuk araç bildirilmedi"
    return None


# ------------------------------------------------------------- geri bildirim

def t_geribildirim_vakaya_ceviriyor(kok):
    kos(kok, "geri-bildirim.py", "ekle", "--tur", "geri-getirme",
        "--soru", "sınav sorusu benzersiz", "--yanlis", "x", "--dogru", "1728",
        "--kaynak", "LORE.md:57")
    s = kos(kok, "geri-bildirim.py", "isle")
    if "1 kayıt" not in s.stdout:
        return f"kayıt altın sete eklenmedi: {s.stdout.strip()[:80]}"
    altin = json.load(open(os.path.join(kok, ".claude", "altin-sorular.json"),
                           encoding="utf-8"))
    if not any(v["soru"] == "sınav sorusu benzersiz" for v in altin["sorular"]):
        return "altın sette yeni vaka görünmüyor"
    return None


def t_geribildirim_yineleneni_kapatiyor(kok):
    """Bir kez düzeltilen hata: yinelenen kayıt kapanıyor ama deftere yazılmıyordu."""
    for _ in range(2):
        kos(kok, "geri-bildirim.py", "ekle", "--tur", "geri-getirme",
            "--soru", "yinelenen sınav sorusu", "--yanlis", "x", "--dogru", "1728",
            "--kaynak", "LORE.md:57")
        kos(kok, "geri-bildirim.py", "isle")
    defter = os.path.join(kok, ".claude", "geri-bildirim.jsonl")
    acik = [json.loads(s) for s in open(defter, encoding="utf-8") if s.strip()]
    kalan = [k for k in acik
             if k["soru"] == "yinelenen sınav sorusu" and k["durum"] == "acik"]
    if kalan:
        return f"{len(kalan)} yinelenen kayıt 'açık' kaldı — defter yazılmıyor"
    return None


def t_geribildirim_kaynaksizi_insana_biraktiyor(kok):
    kos(kok, "geri-bildirim.py", "ekle", "--tur", "geri-getirme",
        "--soru", "kaynaksız sınav sorusu", "--yanlis", "x", "--dogru", "y",
        "--kaynak", "bozuk-kaynak")
    s = kos(kok, "geri-bildirim.py", "isle")
    if "insan işi" not in s.stdout or "biçimi hatalı" not in s.stdout:
        return "bozuk kaynaklı kayıt için doğru sebep bildirilmedi"
    return None


VAKALAR = [
    ("devre: sınırda kesiyor",              t_devre_sinirda_kesiyor),
    ("devre: başarı sayacı sıfırlıyor",     t_devre_basari_sifirliyor),
    ("devre: bayat sayaç sıfırlanıyor",     t_devre_bayat_sifirliyor),
    ("devre: bozuk durum kilitlemiyor",     t_devre_bozuk_durum_kilitlemiyor),
    ("devre: defter not tutuyor",           t_devre_defter_tutuyor),

    ("yargı: kusursuz set geçiyor",         t_yargi_temiz_gecer),
    ("yargı: UYDURMA yakalanıyor",          t_yargi_uydurma_yakalar),
    ("yargı: sınır dışı atıf yakalanıyor",  t_yargi_sinirdisi_atif_yakalar),
    ("yargı: atıfsız iddia yakalanıyor",    t_yargi_atifsiz_iddia_yakalar),
    ("yargı: gereksiz ret yakalanıyor",     t_yargi_gereksiz_ret_yakalar),
    ("yargı: hazirla cevabı sızdırmıyor",   t_yargi_hazirla_sizdirmiyor),
    ("yargı: eksik gönderim yakalanıyor",   t_yargi_eksik_gonderim_yakalar),
    ("yargı: yinelenen numara yakalanıyor", t_yargi_yinelenen_yakalar),

    ("kanca: kapı sayacı artırmıyor",       t_kanca_kapi_sayaci_artirmiyor),
    ("kanca: üst üste hatada kesiyor",      t_kanca_ustuste_hatada_kesiyor),
    ("denetleyici: bozuk araca dayanıyor",  t_dogrula_bozuk_araca_dayaniyor),

    ("geri bildirim: vakaya çeviriyor",     t_geribildirim_vakaya_ceviriyor),
    ("geri bildirim: yineleneni kapatıyor", t_geribildirim_yineleneni_kapatiyor),
    ("geri bildirim: kaynaksızı insana bırakıyor", t_geribildirim_kaynaksizi_insana_biraktiyor),
]


def main():
    gecti = basarisiz = 0
    for ad, islev in VAKALAR:
        gecici, kok = kopya()
        try:
            kusur = islev(kok)
        except Exception as e:
            kusur = f"vaka çöktü: {type(e).__name__}: {e}"
        finally:
            shutil.rmtree(gecici, ignore_errors=True)

        if kusur:
            print(f"  FAIL {ad}\n       → {kusur}")
            basarisiz += 1
        else:
            print(f"  OK   {ad}")
            gecti += 1

    print(f"\n{gecti}/{gecti + basarisiz} araç vakası beklendiği gibi davrandı.")
    return 1 if basarisiz else 0


if __name__ == "__main__":
    sys.exit(main())
