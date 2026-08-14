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
import re
import shutil
import subprocess
import sys
import tempfile

KAYNAK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def kos(kok, betik, *arg, ortam=None):
    cevre = dict(os.environ, **(ortam or {}))
    return subprocess.run([sys.executable, os.path.join(kok, ".claude", betik), *arg],
                          cwd=kok, capture_output=True, text=True, timeout=300,
                          env=cevre)


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
            # Bir sorunun canon'da birden çok doğru adresi olabilir; gerçek
            # bir cevap bunlardan BİRİNİ gösterir, hepsini değil.
            _s = v["satir"][0] if isinstance(v["satir"], list) else v["satir"]
            cikti.append({"no": v["no"], "cevap": f"Cevap: {v['gercekler'][0]}.",
                          "atiflar": [f"LORE.md:{_s}"], "reddetti": False})
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


def t_yargi_yanlis_satir_atfini_yakalar(kok):
    """Atıf GEÇERLİ ama YANLIŞ satırı gösteriyor.

    Bu boşluğu mutasyon sınavı buldu: sınır dışı atıf ve atıfsız iddia
    için vaka vardı, ama "satır gerçek, cevabın geçtiği yer değil" hâli
    için yoktu. Üretimdeki en yaygın hata da tam bu — cevap dayanaklı
    GÖRÜNÜYOR, atıfa tıklayınca ilgisiz çıkıyor.
    """
    def boz(c, v):
        for cevap, vaka in zip(c, v):
            if vaka["tur"] == "cevaplanabilir":
                _k = vaka["satir"] if isinstance(vaka["satir"], list) else [vaka["satir"]]
                baska = next(n for n in range(1, 50) if n not in _k)
                cevap["atiflar"] = [f"LORE.md:{baska}"]
                return
    s = kos(kok, "yargi.py", "puanla", "--dosya", _cevaplar(kok, boz))
    if s.returncode != 1:
        return "yanlış satıra atıf geçti"
    if "geçtiği satırı göstermiyor" not in s.stdout:
        return f"kusur yanlış teşhis edildi: {s.stdout.strip()[:120]}"
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
    if f"/{len(hepsi)}" not in s.stdout:
        return f"payda gönderilen sayıya göre hesaplandı: {s.stdout.strip()[-120:]}"

    # Sayıyı da doğrula, sadece "düştü mü" değil. Gönderilmeyen 23 cevabın
    # KAÇ tane olduğu raporlanmazsa, ihmal sessizce geçer: puan yine düşük
    # çıkar ama sebebi görünmez. Bu boşluğu mutasyon sınavı buldu.
    beklenen_eksik = len(hepsi) - 3
    if f"cevaplanmamış     {beklenen_eksik}" not in s.stdout:
        return (f"eksik cevap sayısı yanlış raporlandı; {beklenen_eksik} "
                f"bekleniyordu: {s.stdout.strip()[-160:]}")
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


def t_kanca_ayni_hatada_kesiyor(kok):
    """Aynı hata üst üste düşerse kesilmeli — hem de tur sınırı dolmadan.

    Kanca nota gerçek hata imzasını yazıyor; aynı imza üç kez görülünce
    ilerleme denetimi ateşliyor. Bu tur sınırından ÖNCE gelir ve doğrusu
    budur: aynı hatada üçüncü kez saplanmak, dördüncüyü beklemeye değmez.
    """
    yol = os.path.join(kok, "assets/css/style.css")
    s = open(yol, encoding="utf-8").read()
    open(yol, "w", encoding="utf-8").write(
        s.replace("[hidden] { display: none !important; }", ""))
    for tur in range(1, 4):
        sonuc = _kanca(kok, "assets/css/style.css")
        if tur < 3 and "DEVRE KESİLDİ" in sonuc.stderr:
            return f"{tur}. turda erken kesti"
        if tur == 3 and "DEVRE KESİLDİ" not in sonuc.stderr:
            return "aynı hata 3 kez düştüğü hâlde kesmedi"
    return None


def t_kanca_hata_imzasini_yaziyor(kok):
    """Genel cümle değil, gerçek hata deftere geçmeli — yoksa ilerleme
    denetimi 'aynı hata' ile 'farklı hata' arasını ayıramaz."""
    yol = os.path.join(kok, "assets/css/style.css")
    s = open(yol, encoding="utf-8").read()
    open(yol, "w", encoding="utf-8").write(
        s.replace("[hidden] { display: none !important; }", ""))
    _kanca(kok, "assets/css/style.css")
    d = kos(kok, "devre.py", "durum")
    if "gizleme" not in d.stdout:
        return f"defterde hata imzası yok: {d.stdout.strip()[:90]}"
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


# --------------------------------------------------- alt ajan sözleşmesi

def t_gorev_sozlesmesiz_engelleniyor(kok):
    olay = json.dumps({"tool_name": "Agent", "cwd": kok,
                       "tool_input": {"prompt": "Karakterleri listele ve özet çıkar.",
                                      "description": "özet"}})
    s = subprocess.run([sys.executable, os.path.join(kok, ".claude", "kanca-gorev.py")],
                       cwd=kok, input=olay, capture_output=True, text=True, timeout=60)
    if s.returncode != 2:
        return f"sözleşmesiz görev engellenmedi (çıkış {s.returncode})"
    for kavram in ("uydurma", "canon", "atıf"):
        if kavram not in s.stderr:
            return f"eksik kavram bildirilmedi: {kavram}"
    return None


def t_gorev_sozlesmeli_geciyor(kok):
    b = kos(kok, "gorev.py", "brief", "--konu", "deneme")
    if b.returncode != 0 or len(b.stdout) < 200:
        return "brief üretilemedi"
    olay = json.dumps({"tool_name": "Agent", "cwd": kok,
                       "tool_input": {"prompt": b.stdout, "description": "deneme"}})
    s = subprocess.run([sys.executable, os.path.join(kok, ".claude", "kanca-gorev.py")],
                       cwd=kok, input=olay, capture_output=True, text=True, timeout=60)
    if s.returncode != 0:
        return f"sözleşmeli görev engellendi (çıkış {s.returncode})"
    return None


def t_gorev_baglam_enjekte_ediyor(kok):
    """Brief, konuyla ilgili canon'u satır numarasıyla içermeli."""
    s = kos(kok, "gorev.py", "brief", "--konu", "Teşup'un zaafı nedir")
    if s.returncode != 0:
        return "brief üretilemedi"
    if "Hazır dayanak" not in s.stdout:
        return "bağlam bloğu yok"
    if "LORE.md:201" not in s.stdout:
        return f"ilgili canon satırı enjekte edilmedi"
    if "Kapalı ve dar alanda" not in s.stdout:
        return "dayanak metni gelmemiş, sadece adres var"
    return None


def t_gorev_baglamsiz_secenegi_calisiyor(kok):
    s = kos(kok, "gorev.py", "brief", "--konu", "Teşup'un zaafı", "--baglamsiz")
    if "Hazır dayanak" in s.stdout:
        return "--baglamsiz verildiği hâlde bağlam enjekte edildi"
    if "YETKİ" not in s.stdout:
        return "sözleşme bozuldu"
    return None


def t_gorev_konu_disinda_uydurmuyor(kok):
    """Canon'da karşılığı yoksa uydurma dayanak enjekte edilmemeli."""
    s = kos(kok, "gorev.py", "brief", "--konu", "kuantum dolanıklık deneyi")
    if "LORE.md:" in s.stdout.split("Hazır dayanak")[-1]:
        return "konu dışı başlığa canon dayanağı uyduruldu"
    if "karşılık bulmadı" not in s.stdout:
        return "dayanak yokluğu bildirilmedi"
    return None


def t_gorev_dogru_atifi_geciriyor(kok):
    """Satır numarası GÖMÜLMÜYOR, aranıyor.

    İlk hâli `LORE.md:428` yazıyordu. Canon'a üç satır eklendiği gün test
    kırıldı — hem de doğru sebeple değil: araçta bir sorun yoktu, testin
    kendisi bayatlamıştı. Mutlak satır numarası gömen test, ölçtüğü şeyden
    hızlı çürür.
    """
    satirlar = open(os.path.join(kok, "LORE.md"), encoding="utf-8").read().splitlines()
    no = next((i + 1 for i, x in enumerate(satirlar) if "Teşup'un elinde" in x), None)
    if no is None:
        return "canon'da \"Teşup'un elinde\" geçen satır yok"
    yol = os.path.join(kok, "rapor-iyi.md")
    open(yol, "w", encoding="utf-8").write(
        f"Barış Teşup'un elinde Orta Cephe'de tutuluyor. LORE.md:{no}\n")
    s = kos(kok, "gorev.py", "dogrula", "--rapor", yol)
    if s.returncode != 0:
        return f"doğru atıf kusurlu sayıldı: {s.stdout.strip()[:100]}"
    return None


def t_gorev_uydurma_atifi_yakaliyor(kok):
    yol = os.path.join(kok, "rapor-kotu.md")
    open(yol, "w", encoding="utf-8").write(
        "Nemesis'in gizli bir kardeşi var ve İstanbul'da saklanıyor. LORE.md:201\n"
        "Ağaç 1899 yılında yeniden dikildi. LORE.md:99999\n")
    s = kos(kok, "gorev.py", "dogrula", "--rapor", yol)
    if s.returncode != 1:
        return "uydurma atıflar geçti"
    if "desteklemiyor" not in s.stdout or "geçersiz aralık" not in s.stdout:
        return "iki kusur türünden biri bildirilmedi"
    return None


def t_gorev_kusuru_deftere_yaziyor(kok):
    yol = os.path.join(kok, "rapor-kotu2.md")
    open(yol, "w", encoding="utf-8").write(
        "Samara Kadın otuz yaşında ve Ankara doğumlu. LORE.md:142\n")
    kos(kok, "gorev.py", "dogrula", "--rapor", yol, "--deftere-yaz")
    defter = os.path.join(kok, ".claude", "geri-bildirim.jsonl")
    if not os.path.exists(defter):
        return "defter hiç oluşmadı"
    kayitlar = [json.loads(x) for x in open(defter, encoding="utf-8") if x.strip()]
    if not any("uzman ajan raporu" in k.get("yanlis", "") for k in kayitlar):
        return "kusur deftere düşmedi — halka kapanmıyor"
    return None


# ------------------------------------------------------------- seyir defteri

def t_seyir_ozet_ham_izi_dislar(kok):
    """Sıkıştırmanın özü: karar kalır, ham tur izi özete girmez."""
    kos(kok, "seyir.py", "baslat", "--is", "t", "--hedef", "sınav")
    kos(kok, "seyir.py", "yaz", "--tur", "karar", "--ne", "KARAR_IMI",
        "--neden", "gerekçe")
    kos(kok, "seyir.py", "yaz", "--tur", "adim", "--ne", "HAM_IZ_IMI")
    kos(kok, "seyir.py", "yaz", "--tur", "cozulmemis", "--ne", "BOSLUK_IMI")
    s = kos(kok, "seyir.py", "ozet")
    if "KARAR_IMI" not in s.stdout:
        return "karar özete girmedi"
    if "BOSLUK_IMI" not in s.stdout:
        return "çözülmemiş kayıt özete girmedi"
    if "HAM_IZ_IMI" in s.stdout:
        return "ham tur izi özete SIZDI — sıkıştırma çalışmıyor"
    iz = kos(kok, "seyir.py", "iz")
    if "HAM_IZ_IMI" not in iz.stdout:
        return "ham iz `iz` komutunda da yok — gözlemlenebilirlik kayıp"
    return None


def t_seyir_gerekcesiz_karari_reddeder(kok):
    kos(kok, "seyir.py", "baslat", "--is", "t")
    s = kos(kok, "seyir.py", "yaz", "--tur", "karar", "--ne", "gerekçesiz")
    if s.returncode == 0:
        return "gerekçesiz karar kabul edildi"
    return None


def t_seyir_cozulmemisi_kapanista_hatirlatir(kok):
    kos(kok, "seyir.py", "baslat", "--is", "t")
    kos(kok, "seyir.py", "yaz", "--tur", "cozulmemis", "--ne", "KALAN_IS")
    s = kos(kok, "seyir.py", "kapat", "--sonuc", "bitti")
    if "KALAN_IS" not in s.stdout:
        return "kapanışta çözülmemiş kayıt hatırlatılmadı"
    return None


# --------------------------------------------------------------- sürüm

def t_surum_dokuzda_minore_gecer(kok):
    """Kural: yama 9'u doldurunca minör artar, yama sıfırlanır."""
    yol = os.path.join(kok, ".claude", "surum.json")
    json.dump({"majör": 1, "minör": 1, "yama": 9, "gecmis": []},
              open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "surum.py", "yukselt", "--ne", "sınav")
    if "v1.2" not in s.stdout:
        return f"v1.1.9 sonrası v1.2 olmadı: {s.stdout.strip()[:80]}"
    d = json.load(open(yol, encoding="utf-8"))
    if d["yama"] != 0 or d["minör"] != 2:
        return f"sayaçlar yanlış: {d['majör']}.{d['minör']}.{d['yama']}"
    return None


def t_surum_dokuz_dokuzda_majore_gecer(kok):
    yol = os.path.join(kok, ".claude", "surum.json")
    json.dump({"majör": 1, "minör": 9, "yama": 9, "gecmis": []},
              open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "surum.py", "yukselt", "--ne", "sınav")
    if "v2.0" not in s.stdout:
        return f"v1.9.9 sonrası v2.0 olmadı: {s.stdout.strip()[:80]}"
    return None


def t_surum_normal_yama_artiyor(kok):
    yol = os.path.join(kok, ".claude", "surum.json")
    json.dump({"majör": 1, "minör": 1, "yama": 3, "gecmis": []},
              open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "surum.py", "yukselt", "--ne", "sınav")
    if "v1.1.4" not in s.stdout:
        return f"yama artmadı: {s.stdout.strip()[:80]}"
    return None


def t_surum_belge_kaymasi_yakalaniyor(kok):
    """Sürüm yükseltilip belge güncellenmezse denetim düşmeli."""
    yol = os.path.join(kok, ".claude", "surum.json")
    d = json.load(open(yol, encoding="utf-8"))
    d["yama"] = 7
    json.dump(d, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "dogrula.py", "belge")
    if s.returncode != 1 or "sürüm uyuşmuyor" not in s.stdout:
        return "sürüm kayması yakalanmadı"
    return None


# ------------------------------------------------------------------- logo

def _logo_yolu(kok):
    return os.path.join(kok, ".claude", "marka", "echo-logo.svg")


def t_logo_uretim_kararli(kok):
    """İki kez üretmek aynı baytı vermeli — yoksa denetim gürültü üretir."""
    once = open(_logo_yolu(kok), encoding="utf-8").read()
    if kos(kok, "logo.py", "yaz").returncode != 0:
        return "logo.py yaz çalışmadı"
    if open(_logo_yolu(kok), encoding="utf-8").read() != once:
        return "aynı girdiyle iki farklı çıktı üretildi"
    return None


def t_logo_simge_sade_kaliyor(kok):
    """Sade simgenin tek varlık sebebi az öğe. Kesik halka ya da ok geri
    eklenirse 32 pikselde yine dağılır — ve bunu kimse gözle fark etmez."""
    s = kos(kok, "logo.py", "goster", "--ne", "simge").stdout
    if "stroke-dasharray" in s:
        return "sade simgeye kesik halka geri gelmiş"
    if s.count("<path") > len(("yay", "yay")):
        return f"sade simgede fazla öğe var: {s.count('<path')} yol"
    tam = kos(kok, "logo.py", "goster", "--ne", "isaret").stdout
    if s.count("<path") >= tam.count("<path"):
        return "sade simge işaretten sade değil"
    return None


def t_logo_elle_duzenleme_yakalaniyor(kok):
    """Üretilmiş dosyayı elle düzenlemek sessiz kalmamalı: ilk `yaz` siler."""
    yol = _logo_yolu(kok)
    s = open(yol, encoding="utf-8").read().replace("ECHO", "EHCO")
    open(yol, "w", encoding="utf-8").write(s)
    c = kos(kok, "dogrula.py", "belge")
    if c.returncode != 1 or "üreteçle uyuşmuyor" not in c.stdout:
        return f"elle düzenleme yakalanmadı (çıkış {c.returncode})"
    return None


def t_logo_surum_kaymasi_yakalaniyor(kok):
    """Asıl tehlike bu: sürüm yükselir, logo v1.1'de kalır ve kimse görmez."""
    yol = os.path.join(kok, ".claude", "surum.json")
    d = json.load(open(yol, encoding="utf-8"))
    d["yama"] = 4
    json.dump(d, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    # Belge başlığını da güncelle ki tek başına logo hatası kalsın.
    # Başlık GÖMÜLMÜYOR, aranıyor. Sürüm v1.1.1'e çıktığı gün gömülü hâli
    # kırıldı — araçta sorun yoktu, testin kendisi bayatlamıştı. Aynı
    # kırılganlık `LORE.md` satır numarasında da yaşandı.
    bel = os.path.join(kok, ".claude", "DONGULER.md")
    m = open(bel, encoding="utf-8").read()
    yeni_baslik = re.sub(r"^# Echo v\d+\.\d+(?:\.\d+)?", "# Echo v1.1.4", m,
                         count=1, flags=re.M)
    if yeni_baslik == m:
        return "DONGULER.md başlığı '# Echo vX.Y' biçiminde değil"
    open(bel, "w", encoding="utf-8").write(yeni_baslik)
    c = kos(kok, "dogrula.py", "belge")
    if c.returncode != 1 or "üreteçle uyuşmuyor" not in c.stdout:
        return f"sürüm kayması logoda yakalanmadı (çıkış {c.returncode})"
    if "sürüm uyuşmuyor" in c.stdout:
        return "belge başlığı güncellendiği hâlde hâlâ şikayet ediyor"
    return None


def t_logo_eksik_dosya_yakalaniyor(kok):
    yol = _logo_yolu(kok)
    os.remove(yol)
    c = kos(kok, "dogrula.py", "belge")
    if c.returncode != 1 or "yok" not in c.stdout:
        return f"silinen logo dosyası yakalanmadı (çıkış {c.returncode})"
    return None


def t_logo_surumu_govdeden_aliyor(kok):
    """Numara SVG'ye elle yazılmamalı: surum.json değişince çıktı değişmeli."""
    yol = os.path.join(kok, ".claude", "surum.json")
    json.dump({"majör": 3, "minör": 7, "yama": 2, "gecmis": []},
              open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "logo.py", "goster", "--ne", "logo")
    if "v3.7.2" not in s.stdout:
        return "logo sürümü surum.json'dan almıyor"
    if "v1.1" in s.stdout:
        return "eski sürüm numarası SVG içine gömülü kalmış"
    return None


# ------------------------------------------------------------ hedef ağacı

def _hedef_ac(kok):
    return kos(kok, "hedef.py", "ac", "--hedef", "deneme hedefi",
               "--teslim", "çıktı", "--basari", "dogrula temiz",
               "--degismez", "canon bozulmayacak")


def t_hedef_kaymasini_yakaliyor(kok):
    """Uzun ufuklu işin asıl tehlikesi: hedefin sessizce değişmesi."""
    _hedef_ac(kok)
    yol = os.path.join(kok, ".claude", "hedef.json")
    d = json.load(open(yol, encoding="utf-8"))
    d["hedef"] = "tamamen başka bir iş"
    json.dump(d, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "hedef.py", "kontrol")
    if s.returncode != 1 or "HEDEF DEĞİŞMİŞ" not in s.stdout:
        return "hedef kayması yakalanmadı"
    return None


def t_hedef_saglamken_gecer(kok):
    """Yanlış alarm avı: dokunulmamış hedef temiz geçmeli."""
    _hedef_ac(kok)
    kos(kok, "hedef.py", "dal", "--ne", "iş")
    kos(kok, "hedef.py", "tamam", "--id", "1")
    s = kos(kok, "hedef.py", "kontrol")
    if s.returncode != 0:
        return f"sağlam hedef kusurlu sayıldı: {s.stdout.strip()[:100]}"
    return None


def t_hedef_ustu_erken_kapatmiyor(kok):
    """Üst görev, alt görevleri açıkken kapatılamamalı."""
    _hedef_ac(kok)
    kos(kok, "hedef.py", "dal", "--ne", "büyük aşama")
    kos(kok, "hedef.py", "dal", "--ust", "1", "--ne", "alt iş")
    s = kos(kok, "hedef.py", "tamam", "--id", "1")
    if s.returncode != 1 or "alt görevi" not in s.stdout:
        return "üst görev alt görevi açıkken kapandı"
    return None


def t_hedef_kaymisken_sapma_yazilmiyor(kok):
    _hedef_ac(kok)
    yol = os.path.join(kok, ".claude", "hedef.json")
    d = json.load(open(yol, encoding="utf-8"))
    d["basari"] = ["bambaşka ölçüt"]
    json.dump(d, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "hedef.py", "sapma", "--ne", "x", "--neden", "y")
    if s.returncode != 1:
        return "hedef kaymışken sapma kaydedildi"
    return None


def t_hedef_acik_gorevle_kapanmiyor(kok):
    _hedef_ac(kok)
    kos(kok, "hedef.py", "dal", "--ne", "yarım kalan iş")
    s = kos(kok, "hedef.py", "kapat")
    if s.returncode != 1 or "hâlâ açık" not in s.stdout:
        return "açık görev varken hedef kapandı"
    return None


# --------------------------------------------------------------- bütçe

def t_devre_sure_butcesi_kesiyor(kok):
    """Tur sınırı dolmasa bile duvar saati dolarsa kesmeli."""
    import json as _json
    from datetime import datetime, timedelta
    kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "99", "--sure", "60")
    yol = os.path.join(kok, ".claude", "devre-durumu.json")
    d = _json.load(open(yol, encoding="utf-8"))
    d["t"]["baslangic"] = (datetime.now() - timedelta(seconds=600)).isoformat(timespec="seconds")
    _json.dump(d, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "99", "--sure", "60")
    if s.returncode != 1:
        return f"süre aşıldığı hâlde kesmedi (çıkış {s.returncode})"
    if "süreyi aştı" not in s.stdout:
        return "kesme sebebi süre olarak bildirilmedi"
    return None


def t_devre_sure_kapaliyken_kesmiyor(kok):
    s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "5", "--sure", "0")
    if s.returncode != 0:
        return "süre kapalıyken bile kesti"
    return None


def t_devre_salinimi_yakaliyor(kok):
    """Sayaç ilerliyor ama iş ilerlemiyor: A → B → A → B."""
    for n in ("kontrastı düşürdüm", "kontrastı geri aldım",
              "kontrastı düşürdüm", "kontrastı geri aldım"):
        s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "20", "--not", n)
    if s.returncode != 1:
        return f"salınım yakalanmadı (çıkış {s.returncode})"
    if "salınım" not in s.stdout:
        return "kesme sebebi salınım olarak bildirilmedi"
    return None


def t_devre_tekrari_yakaliyor(kok):
    for _ in range(3):
        s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "20",
                "--not", "eşiği ayarladım")
    if s.returncode != 1 or "tekrar" not in s.stdout:
        return "aynı işin tekrarı yakalanmadı"
    return None


def t_devre_farkli_isleri_kesmiyor(kok):
    """Yanlış alarm avı: gerçekten ilerleyen döngü kesilmemeli."""
    for n in ("menüyü düzelttim", "kontrastı ölçtüm", "belgeyi güncelledim",
              "testi ekledim", "raporu yazdım"):
        s = kos(kok, "devre.py", "dene", "--halka", "t", "--sinir", "20", "--not", n)
        if s.returncode != 0:
            return f"ilerleyen döngü kesildi: {n!r}"
    return None


# --------------------------------------------------------- ajan yetkisi

def t_gorev_yetkisiz_brief_engelleniyor(kok):
    """Yetki beyanı olmayan görev gönderilememeli."""
    metin = ("Canon'da ara, LORE.md oku, atıf ver, uydurma yapma.")
    olay = json.dumps({"tool_name": "Agent", "cwd": kok,
                       "tool_input": {"prompt": metin, "description": "x"}})
    s = subprocess.run([sys.executable, os.path.join(kok, ".claude", "kanca-gorev.py")],
                       cwd=kok, input=olay, capture_output=True, text=True, timeout=60)
    if s.returncode != 2 or "yetki" not in s.stderr.lower():
        return "yetki beyanı olmayan görev engellenmedi"
    return None


def t_gorev_iki_mod_da_uretiliyor(kok):
    o = kos(kok, "gorev.py", "brief", "--konu", "x", "--mod", "okuma")
    y = kos(kok, "gorev.py", "brief", "--konu", "x", "--mod", "yazma")
    if "YETKİ: okuma" not in o.stdout:
        return "okuma modu yetki bloğu üretmedi"
    if "YETKİ: yazma" not in y.stdout:
        return "yazma modu yetki bloğu üretmedi"
    if "git push" not in y.stdout:
        return "yazma modunda commit/push yasağı yok"
    return None


def t_gorev_yetki_ihlali_yakalaniyor(kok):
    """Salt okunur beyan edilen görev depoya dokunduysa kusur sayılmalı."""
    yol = os.path.join(kok, "rapor.md")
    open(yol, "w", encoding="utf-8").write(
        "Barış Teşup'un elinde tutuluyor. LORE.md:428\n")
    open(os.path.join(kok, "LORE.md"), "a", encoding="utf-8").write("\nkirlilik\n")
    s = kos(kok, "gorev.py", "dogrula", "--rapor", yol, "--mod", "okuma")
    if "YETKİ İHLALİ" not in s.stdout:
        return "salt okunur görevin dosya değişikliği yakalanmadı"
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


# --------------------------------------------------------- bütünlük sınavı
# `butunluk.py` içeriği ölçüyor; peki onu kim ölçüyor? Aşağıdakiler depoyu
# kasten bozup sınavın yakaladığını doğruluyor — `sinav.py`'nin denetleyiciye
# yaptığının aynısı. Bu vakalar elle bir kez çalıştırılmıştı; elle yapılan
# deneme buharlaşır, bu yüzden kalıcı hâle getirildi.

def _butunluk(kok):
    return kos(kok, "butunluk.py", "--sessiz")


def _boz(kok, yol, eski, yeni):
    p = os.path.join(kok, yol)
    with open(p, encoding="utf-8") as f:
        icerik = f.read()
    if eski not in icerik:
        return f"bozma uygulanamadı: {yol} içinde yok"
    with open(p, "w", encoding="utf-8") as f:
        f.write(icerik.replace(eski, yeni, 1))
    return None


def t_butunluk_temiz_baslangic(kok):
    """Bozmadan önce yeşil olmalı — yoksa aşağıdaki vakalar yanlış sebeple geçer."""
    s = _butunluk(kok)
    if s.returncode != 0:
        return f"depo zaten kırmızı: {s.stdout.strip().splitlines()[-1]}"
    return None


def t_butunluk_plaka_hatasi_yakalaniyor(kok):
    hata = _boz(kok, "assets/js/data.js",
                'plaka: 6, il: "Ankara"', 'plaka: 6, il: "Ankaraa"')
    if hata:
        return hata
    s = _butunluk(kok)
    if s.returncode != 1 or "plaka-il eşleşmesi" not in s.stdout:
        return "resmî plaka listesine uymayan il adı yakalanmadı"
    return None


def t_butunluk_canon_disi_isim_yakalaniyor(kok):
    hata = _boz(kok, "assets/js/data.js", 'ad: "Şanta"', 'ad: "Zubizarreta"')
    if hata:
        return hata
    s = _butunluk(kok)
    if s.returncode != 1 or "canon'da geçmeyen" not in s.stdout:
        return "canon'da olmayan derebeyi adı yakalanmadı"
    return None


def t_butunluk_siralama_iddiasi_yakalaniyor(kok):
    """Canon'da dayanağı olmayan sıralama — yasağın asıl hedefi bu."""
    hata = _boz(kok, "assets/js/data.js", "Fiziksel gücü yok;",
                "Masadaki en tehlikeli beyin;")
    if hata:
        return hata
    s = _butunluk(kok)
    if s.returncode != 1 or "sıralama iddiası" not in s.stdout:
        return "canon dışı sıralama iddiası yakalanmadı"
    return None


def t_butunluk_canon_siralamasi_yanlis_alarm_vermiyor(kok):
    """Canon'un KENDİ sıralama cümlesi hata sayılmamalı.

    İlk hâli tam olarak burada yanılmıştı: `LORE.md:210`'da birebir geçen
    "üçü arasında iradesi en zayıf olan da o" cümlesi hata olarak
    raporlanıyordu. Masum vaka olmadan bu tür bir aşırı duyarlılık geri gelir.
    """
    s = _butunluk(kok)
    if s.returncode == 1 and "sıralama iddiası" in s.stdout:
        return "canon'da geçen sıralama cümlesi yanlış alarm üretti"
    return None


def t_butunluk_kirik_baglanti_yakalaniyor(kok):
    hata = _boz(kok, "index.html", 'href="karakterler.html"', 'href="yok-boyle.html"')
    if hata:
        return hata
    s = _butunluk(kok)
    if s.returncode != 1 or "kırık iç bağlantı" not in s.stdout:
        return "kırık iç bağlantı yakalanmadı"
    return None


def t_butunluk_olu_veri_yakalaniyor(kok):
    hata = _boz(kok, "assets/js/data.js", "const KANAL = ",
                'const HIC_KULLANILMAYAN = "x";\nconst KANAL = ')
    if hata:
        return hata
    s = _butunluk(kok)
    if s.returncode != 1 or "kullanılmayan veri sabiti" not in s.stdout:
        return "hiç kullanılmayan veri sabiti yakalanmadı"
    return None


def t_butunluk_okuyucu_data_js_i_cozuyor(kok):
    """Ayrıştırıcı sessizce boş dönerse 74 vakanın çoğu anlamsız geçer."""
    import importlib.util
    t = importlib.util.spec_from_file_location(
        "o_" + str(abs(hash(kok))), os.path.join(kok, ".claude", "okuyucu.py"))
    m = importlib.util.module_from_spec(t)
    t.loader.exec_module(m)
    metin = open(os.path.join(kok, "assets/js/data.js"), encoding="utf-8").read()
    iller = m.sabit(metin, "IL_DEREBEYLERI")
    if len(iller) != 81:
        return f"okuyucu 81 il yerine {len(iller)} kayıt çözdü"
    k = m.sabit(metin, "KARAKTERLER")
    if not any("+" not in x["ozet"] and len(x["ozet"]) > 100 for x in k):
        return "dizgi zinciri (\"a\" + \"b\") birleştirilmemiş"
    return None


def t_belge_altin_set_kaymasini_yakaliyor(kok):
    """`LORE.md`'ye satır eklemek altın setteki atıfları kaydırır.

    Bu vakayı mutasyon sınavı istedi: denetim eklenmişti, elle negatif test
    edilmişti, ama vakası yazılmamıştı — yani korumasızdı. Elle yapılan
    deneme buharlaşır.

    Asıl tehlike şu: kayma hiçbir yerde kırmızı yanmaz. `degerlendir.py`
    isabeti yanlış satıra karşı ölçer, `yargi.py` doğru cevaba haksız kusur
    yazar. Ölçüm zemini altından kayar ve her şey yolunda görünür.
    """
    yol = os.path.join(kok, "LORE.md")
    with open(yol, encoding="utf-8") as f:
        lore = f.read()
    imza = "| Cips Yiyen Adam | 2 tır | Normal form |"
    if imza not in lore:
        return "canon'da beklenen tır satırı yok — vaka bayatlamış"
    with open(yol, "w", encoding="utf-8") as f:
        f.write(lore.replace(imza, imza + "\n| Deneme | 1 tır | sınav |", 1))
    s = kos(kok, "dogrula.py", "belge")
    if s.returncode != 1 or "altın set kaymış" not in s.stdout:
        return f"altın set kayması yakalanmadı (çıkış {s.returncode})"
    return None


def t_belge_kaymamis_altin_set_masum(kok):
    """Kaymamış set yanlış alarm üretmemeli — aşırı duyarlılık da hatadır."""
    s = kos(kok, "dogrula.py", "belge")
    if "altın set kaymış" in s.stdout:
        return "kaymamış altın set için yanlış alarm"
    return None


# ------------------------------------------------- olay döngüsü (dağıtıcı)
# Buradaki risk diğerlerinden farklı: dağıtıcı bozulursa hiçbir şey
# BAĞIRMAZ. Kancalar sessizce çalışmaz, denetim hiç koşmaz, sınavlar yeşil
# kalır — çünkü sınavlar betikleri doğrudan çağırıyor, kancadan geçmiyor.
# Bu yüzden dağıtımın kendisi ölçülüyor.

def _olay(kok, govde):
    yol = os.path.join(kok, ".claude", "olay.py")
    return subprocess.run([sys.executable, yol, "dagit"], input=govde, cwd=kok,
                          capture_output=True, text=True, timeout=120)


def _duzenleme_olayi(kok, dosya):
    return json.dumps({"hook_event_name": "PostToolUse", "tool_name": "Edit",
                       "tool_input": {"file_path": os.path.join(kok, dosya)},
                       "cwd": kok}, ensure_ascii=False)


def t_olay_temiz_duzenlemeyi_geciriyor(kok):
    s = _olay(kok, _duzenleme_olayi(kok, "index.html"))
    if s.returncode != 0:
        return f"temiz düzenleme geri beslendi (çıkış {s.returncode})"
    return None


def t_olay_bozuk_duzenlemeyi_geri_besliyor(kok):
    """Dağıtıcı işleyicinin çıkış kodunu TAŞIMALI, yutmamalı."""
    hata = _boz(kok, "assets/css/style.css",
                "[hidden] { display: none !important; }", "")
    if hata:
        return hata
    s = _olay(kok, _duzenleme_olayi(kok, "assets/css/style.css"))
    if s.returncode != 2:
        return f"kural ihlali geri beslenmedi (çıkış {s.returncode})"
    if "denetleyici" not in s.stderr.lower():
        return "geri besleme gerekçesi taşınmadı"
    return None


def t_olay_sozlesmesiz_gorevi_engelliyor(kok):
    govde = json.dumps({"hook_event_name": "PreToolUse", "tool_name": "Task",
                        "tool_input": {"prompt": "şunu yap"}, "cwd": kok})
    s = _olay(kok, govde)
    if s.returncode != 2:
        return f"sözleşmesiz görev engellenmedi (çıkış {s.returncode})"
    return None


def t_olay_bilinmeyen_olay_deftere_dusuyor(kok):
    """Dinleyicisi olmayan olay sessizce kaybolursa 'kanca çalışmıyor mu,
    yoksa bu olay dinlenmiyor mu' sorusu cevaplanamaz hâle gelir."""
    govde = json.dumps({"hook_event_name": "SessionStart", "tool_name": "",
                        "cwd": kok})
    s = _olay(kok, govde)
    if s.returncode != 0:
        return f"bilinmeyen olay akışı kesti (çıkış {s.returncode})"
    d = kos(kok, "olay.py", "defter", "--son", "5")
    if "dinleyicisi yok" not in d.stdout:
        return "dinleyicisi olmayan olay deftere yazılmadı"
    return None


def t_olay_bozuk_girdi_kilitlemiyor(kok):
    s = _olay(kok, "bu json değil")
    if s.returncode != 0:
        return f"okunamayan olay oturumu kilitledi (çıkış {s.returncode})"
    return None


def t_olay_tablosu_isleyicileri_gosteriyor(kok):
    """Tablo gerçek dosyalara işaret etmeli; 'DOSYA YOK' sessiz kopukluktur."""
    s = kos(kok, "olay.py", "tablo")
    if "DOSYA YOK" in s.stdout:
        return "olay tablosu var olmayan işleyiciye işaret ediyor"
    for beklenen in ("PostToolUse", "PreToolUse", "kanca.py", "kanca-gorev.py"):
        if beklenen not in s.stdout:
            return f"tabloda eksik: {beklenen}"
    return None


def t_olay_ayar_dagiticiya_yonlendiriyor(kok):
    """`settings.json` işleyiciye DOĞRUDAN giderse defter boş kalır ve
    gözlemlenebilirlik sessizce kaybolur — kancalar yine çalıştığı için."""
    with open(os.path.join(kok, ".claude", "settings.json"), encoding="utf-8") as f:
        ayar = json.load(f)
    komutlar = [k["command"] for grup in ayar["hooks"].values()
                for e in grup for k in e["hooks"]]
    if not komutlar:
        return "settings.json'da hiç kanca yok"
    for k in komutlar:
        if "olay.py" not in k:
            return f"kanca dağıtıcıdan geçmiyor: {k}"
    return None


# ------------------------------------------- değerlendirici-optimize edici

def t_eniyile_temizde_kabul_ediyor(kok):
    s = kos(kok, "eniyile.py", "tur", "--halka", "t", "--olcut", "kural,butunluk")
    if s.returncode != 0 or "KABUL" not in s.stdout:
        return f"temiz depoda kabul edilmedi (çıkış {s.returncode})"
    return None


def t_eniyile_kismi_puan_veriyor(kok):
    """İkili ölçüm ilerlemeyi göstermez; bu döngünün varlık sebebi bu."""
    hata = _boz(kok, "assets/js/data.js",
                'plaka: 6, il: "Ankara"', 'plaka: 6, il: "Ankaraa"')
    if hata:
        return hata
    s = kos(kok, "eniyile.py", "tur", "--halka", "t", "--olcut", "butunluk")
    if s.returncode != 1 or "İYİLEŞTİR" not in s.stdout:
        return f"eksik varken iyileştirme istenmedi (çıkış {s.returncode})"
    import re as _re
    e = _re.search(r"PUAN\s+([\d.]+)", s.stdout)
    if not e:
        return "puan basılmadı"
    puan = float(e.group(1))
    if not 0.0 < puan < 1.0:
        return f"tek bulguda puan kısmi değil: {puan}"
    return None


def t_eniyile_ilerlemeyi_goruyor(kok):
    """Bir bulgu kapanınca puan ARTMALI — yoksa geri bildirim işe yaramaz."""
    _boz(kok, "assets/js/data.js", 'plaka: 6, il: "Ankara"', 'plaka: 6, il: "Ankaraa"')
    _boz(kok, "assets/js/data.js", "Fiziksel gücü yok;", "Masadaki en tehlikeli beyin;")
    kos(kok, "eniyile.py", "tur", "--halka", "t", "--olcut", "butunluk")
    _boz(kok, "assets/js/data.js", 'plaka: 6, il: "Ankaraa"', 'plaka: 6, il: "Ankara"')
    s = kos(kok, "eniyile.py", "tur", "--halka", "t", "--olcut", "butunluk")
    if "+0." not in s.stdout:
        return "bir eksik kapandığı hâlde puan artışı raporlanmadı"
    return None


def t_eniyile_kisir_turda_duruyor(kok):
    """Asıl katkı: puan artmıyorsa dördüncü turun üçüncüden farkı yoktur."""
    _boz(kok, "assets/js/data.js", 'plaka: 6, il: "Ankara"', 'plaka: 6, il: "Ankaraa"')
    for _ in range(4):
        s = kos(kok, "eniyile.py", "tur", "--halka", "t", "--olcut", "butunluk")
        if "DUR" in s.stdout:
            if "artmıyor" not in s.stdout:
                return "durdu ama sebebi kısırlık değil"
            return None
    return "puan hiç artmadığı hâlde döngü durmadı"


def t_eniyile_insan_kapisini_optimize_etmiyor(kok):
    """Kapı puanla çözülmez: 'yanlış' değil, 'doğruluğunu bilemiyorum' demek.
    Optimize etmeye çalışmak uydurmayı ödüllendirirdi."""
    hata = _boz(kok, "assets/js/data.js",
                'oneCikan: { kimlik: ""', 'oneCikan: { kimlik: "aB3dEf7hK9m"')
    if hata:
        return hata
    s = kos(kok, "eniyile.py", "tur", "--halka", "t", "--olcut", "kural")
    if s.returncode != 3:
        return f"insan kapısı çıkış kodu 3 değil ({s.returncode})"
    if "AskUserQuestion" not in s.stdout:
        return "kapıda insana çıkma talimatı yok"
    return None


# ------------------------------------------------------------ tepe tırmanma

def t_tirmanma_yazma_gercekten_etkiliyor(kok):
    """Bu sınavın en kritik vakası: parametre yazımı etkisizse BÜTÜN
    tırmanış sahte olur — her komşu "eşit" çıkar ve tırmanıcı gerçek bir
    plato bulduğunu sanır. Sessiz başarısızlığın ders kitabı örneği."""
    import importlib.util
    t = importlib.util.spec_from_file_location(
        "tir_" + str(abs(hash(kok))), os.path.join(kok, ".claude", "tirmanma.py"))
    m = importlib.util.module_from_spec(t)
    t.loader.exec_module(m)
    mevcut = dict(m.mevcut_ayar())
    sert = dict(mevcut)
    sert["SOZ_DAGARI_ESIK"] = 0.30
    a = m.yaz_ve_olc(kok, mevcut)
    b = m.yaz_ve_olc(kok, sert)
    if a.deger == b.deger:
        return ("parametre değişimi ölçüyü hiç etkilemedi — yazma çalışmıyor "
                "ya da değerlendirme parametreyi görmüyor")
    return None


def t_tirmanma_kapi_dusen_adayi_eliyor(kok):
    """Sadece isabeti optimize etmek konu dışı reddini bozabilir."""
    import importlib.util
    t = importlib.util.spec_from_file_location(
        "tir2_" + str(abs(hash(kok))), os.path.join(kok, ".claude", "tirmanma.py"))
    m = importlib.util.module_from_spec(t)
    t.loader.exec_module(m)
    p = m.Puan(isabet3=100, isabet1=100, mrr=1.0, kapsama=100, konu_disi=75, sahte=100)
    if p.gecerli or p.deger >= 0:
        return "konu dışı reddi düşen aday geçerli sayıldı"
    return None


def t_tirmanma_yalitik_tepeyi_reddediyor(kok):
    """Tek hücrelik tepe iyileşme değil ezberdir — bu depoda bir kez elle
    reddedildi, artık mekanik."""
    import importlib.util
    t = importlib.util.spec_from_file_location(
        "tir3_" + str(abs(hash(kok))), os.path.join(kok, ".claude", "tirmanma.py"))
    m = importlib.util.module_from_spec(t)
    t.loader.exec_module(m)
    if m.YALITIK_DUSUS <= 0:
        return "yalıtık tepe eşiği kapalı"
    s = kos(kok, "tirmanma.py", "komsular")
    if s.returncode != 0:
        return f"komşuluk taraması çalışmadı (çıkış {s.returncode})"
    if "MEVCUT" not in s.stdout:
        return "komşuluk çıktısı mevcut ayarı göstermiyor"
    return None


# ------------------------------------------------------------- eleştirmen

def t_elestirmen_lastik_damgayi_yakaliyor(kok):
    """'İyi görünüyor' diyen eleştirmen, eleştirmen olmayan eleştirmendir —
    ve hiç eleştirmen olmamasından kötüdür, çünkü 'denetlendi' damgası kalır."""
    hata = _boz(kok, "assets/js/data.js",
                'plaka: 6, il: "Ankara"', 'plaka: 6, il: "Ankaraa"')
    if hata:
        return hata
    yol = os.path.join(kok, "elestiri.md")
    open(yol, "w", encoding="utf-8").write("KUSUR YOK\n")
    s = kos(kok, "elestirmen.py", "denetle", "--rapor", yol)
    if s.returncode != 1 or "LASTİK DAMGA" not in s.stdout:
        return f"lastik damga yakalanmadı (çıkış {s.returncode})"
    return None


def t_elestirmen_temiz_onayi_kabul_ediyor(kok):
    """Aşırı duyarlılık da hatadır: gerçekten temizken 'KUSUR YOK' geçmeli."""
    yol = os.path.join(kok, "elestiri.md")
    open(yol, "w", encoding="utf-8").write("KUSUR YOK\n")
    s = kos(kok, "elestirmen.py", "denetle", "--rapor", yol)
    if s.returncode != 0:
        return f"temiz depoda açık onay reddedildi (çıkış {s.returncode})"
    return None


def t_elestirmen_uydurma_atifi_yakaliyor(kok):
    yol = os.path.join(kok, "elestiri.md")
    open(yol, "w", encoding="utf-8").write(
        "- assets/js/data.js:207 — sıralama iddiası (LORE.md:99999)\n")
    s = kos(kok, "elestirmen.py", "denetle", "--rapor", yol)
    if s.returncode != 1 or "geçersiz canon atfı" not in s.stdout:
        return "var olmayan satıra atıf yakalanmadı"
    return None


def t_elestirmen_sessiz_onayi_reddediyor(kok):
    """Sessizlik 'okudum, temiz' ile 'okumadım' arasında ayrım bırakmaz."""
    yol = os.path.join(kok, "elestiri.md")
    open(yol, "w", encoding="utf-8").write("Dosyayı inceledim, genel olarak iyi.\n")
    s = kos(kok, "elestirmen.py", "denetle", "--rapor", yol)
    if s.returncode != 1 or "sessiz onay yok" not in s.stdout:
        return "adressiz, kararsız rapor kabul edildi"
    return None


def t_elestirmen_brief_yetki_beyani_tasiyor(kok):
    s = kos(kok, "elestirmen.py", "brief", "--hedef", "assets/js/data.js")
    if s.returncode != 0:
        return f"brief üretilemedi (çıkış {s.returncode})"
    for beklenen in ("YETKİ: okuma", "KUSUR YOK", "LORE.md"):
        if beklenen not in s.stdout:
            return f"brief'te eksik: {beklenen}"
    return None


# --------------------------------------------------------------------- TDD

def t_tdd_gecen_testle_kirmizi_baslatmiyor(kok):
    """Hiç kırmızı yanmamış test ne koruduğunu göstermez."""
    s = kos(kok, "tdd.py", "kirmizi", "--vaka", "olay: bozuk girdi kilitlemiyor")
    if s.returncode != 1 or "ŞU AN GEÇİYOR" not in s.stdout:
        return f"geçen testle kırmızı adımı başlatıldı (çıkış {s.returncode})"
    return None


def t_tdd_kirmizisiz_yesile_gecmiyor(kok):
    s = kos(kok, "tdd.py", "yesil", "--vaka", "olay: bozuk girdi kilitlemiyor")
    if s.returncode != 1 or "kayıtlı bir kırmızı adım yok" not in s.stdout:
        return "kırmızı adım olmadan yeşile geçildi"
    return None


def t_tdd_olmayan_vakada_cokmuyor(kok):
    s = kos(kok, "tdd.py", "kirmizi", "--vaka", "böyle bir vaka yok")
    if s.returncode != 1:
        return f"olmayan vaka için çıkış 1 değil ({s.returncode})"
    if "Traceback" in s.stderr:
        return "olmayan vakada çöktü"
    return None


def t_tdd_gercek_kirmizi_yesil_donusu(kok):
    """Tam döngü: bozulmuş depoda vaka kırmızı, düzeltilince yeşil."""
    hata = _boz(kok, "assets/js/data.js",
                'plaka: 6, il: "Ankara"', 'plaka: 6, il: "Ankaraa"')
    if hata:
        return hata
    vaka = "il: plaka-il eşleşmesi gerçek"
    ic = {"ECHO_TDD_DERINLIK": "1"}   # iç içe tam tarama bu vakanın konusu değil
    s = kos(kok, "tdd.py", "kirmizi", "--vaka", vaka, ortam=ic)
    if s.returncode != 0 or "KIRMIZI" not in s.stdout:
        return f"bozuk depoda kırmızı alınamadı (çıkış {s.returncode}): {s.stderr[:80]}"
    _boz(kok, "assets/js/data.js", 'plaka: 6, il: "Ankaraa"', 'plaka: 6, il: "Ankara"')
    s = kos(kok, "tdd.py", "yesil", "--vaka", vaka, ortam=ic)
    if s.returncode != 0 or "YEŞİL" not in s.stdout:
        return f"düzeltilince yeşile dönmedi (çıkış {s.returncode})"
    return None


def t_tdd_duzenleme_test_silmeyi_reddediyor(kok):
    """Yeşil kalmanın en kolay yolu korumayı kaldırmaktır; o yol kapalı."""
    import json as _j
    d = {"_kapsam": {"vaka_sayisi": 9999, "zaman": "2026-01-01T00:00:00"}}
    yol = os.path.join(kok, ".claude", "tdd-durumu.json")
    _j.dump(d, open(yol, "w", encoding="utf-8"), ensure_ascii=False)
    s = kos(kok, "tdd.py", "duzenle")
    # İddia REDDİN KENDİSİNE bakmalı. İlk hâli "vaka sayısı" arıyordu ama o
    # ifade başlık satırında her koşuda basılıyor; denetim kapatıldığında
    # bile test geçiyordu — yanlış sebeple. Mutasyon sınavı yakaladı.
    if "REDDEDİLDİ" not in s.stdout or "9999" not in s.stdout:
        return f"vaka sayısı düşmesi reddedilmedi: {s.stdout.strip()[:120]}"
    if s.returncode != 1:
        return f"reddedildi ama çıkış kodu 1 değil ({s.returncode})"
    return None


def t_geri_bildirim_testsiz_kapatmayi_reddediyor(kok):
    """Testsiz kapatılan hata, düzeltilmiş değil ERTELENMİŞ hatadır.

    Bu boşluk gerçekti: `geri-getirme` dışındaki türler "(insan)" diyordu
    ve sonra hiçbir şey insanın test yazdığını doğrulamıyordu. Kayıt
    kapanıyor, hata düzeliyor, koruma yazılmıyor, hata geri geliyor.
    """
    kos(kok, "geri-bildirim.py", "ekle", "--tur", "davranis",
        "--soru", "sınav kaydı", "--yanlis", "x", "--dogru", "y")
    s = kos(kok, "geri-bildirim.py", "listele")
    sira = s.stdout.count("•")
    r = kos(kok, "geri-bildirim.py", "kapat", "--no", str(sira),
            "--vaka", "böyle bir vaka asla yok")
    if r.returncode != 1 or "REDDEDİLDİ" not in r.stdout:
        return f"var olmayan vakayla kapatma geçti (çıkış {r.returncode})"
    return None


def t_geri_bildirim_gercek_vakayla_kapatiyor(kok):
    kos(kok, "geri-bildirim.py", "ekle", "--tur", "davranis",
        "--soru", "sınav kaydı 2", "--yanlis", "x", "--dogru", "y")
    s = kos(kok, "geri-bildirim.py", "listele")
    sira = s.stdout.count("•")
    r = kos(kok, "geri-bildirim.py", "kapat", "--no", str(sira),
            "--vaka", "devre: sınırda kesiyor")
    if r.returncode != 0:
        return f"gerçek vakayla kapatma reddedildi (çıkış {r.returncode})"
    return None


def t_geri_bildirim_korumasizi_raporluyor(kok):
    """Elle kapatılan kayıt görünmez kalmamalı — nitekim üç tanesi kalmıştı."""
    import json as _j
    yol = os.path.join(kok, ".claude", "geri-bildirim.jsonl")
    kayitlar = [_j.loads(x) for x in open(yol, encoding="utf-8") if x.strip()]
    kayitlar.append({"tarih": "2026-01-01", "tur": "canon", "soru": "elle kapatılmış",
                     "yanlis": "x", "dogru": "y", "kaynak": "", "durum": "kapali"})
    with open(yol, "w", encoding="utf-8") as f:
        for k in kayitlar:
            f.write(_j.dumps(k, ensure_ascii=False) + "\n")
    r = kos(kok, "geri-bildirim.py", "korumasiz")
    if r.returncode != 1 or "korumasız kapatılmış" not in r.stdout:
        return f"testsiz kapatılmış kayıt raporlanmadı (çıkış {r.returncode})"
    return None


# --------------------------------------------------------- dış ajan köprüsü

def _dal_kur(kok, ad, degistir, yol):
    """Kopyada sahte bir Codex dalı üret.

    SADECE `yol` commit'lenir. `-am` kullanmak yanlıştı: kopya, ana ağacın
    commit'lenmemiş değişikliklerini de taşıyor ve onlar dalın içine
    giriyordu — dal `.claude/` dosyalarına dokunmuş gibi görünüp haksız
    yere reddediliyordu.
    """
    subprocess.run(["git", "checkout", "-q", "-B", ad], cwd=kok,
                   capture_output=True, text=True, timeout=60)
    degistir()
    subprocess.run(["git", "add", "--", yol], cwd=kok,
                   capture_output=True, text=True, timeout=60)
    subprocess.run(["git", "commit", "-q", "-m", f"sınav: {ad}", "--", yol],
                   cwd=kok, capture_output=True, text=True, timeout=60)


def t_disajan_brief_pr_akisini_tasiyor(kok):
    s = kos(kok, "disajan.py", "brief", "--konu", "deneme", "--dal", "codex/x")
    if s.returncode != 0:
        return f"brief üretilemedi (çıkış {s.returncode})"
    for beklenen in ("codex/x", "Merge YASAK", "YETKİ: yazma", ".claude/"):
        if beklenen not in s.stdout:
            return f"brief'te eksik: {beklenen}"
    if "git commit` ve `git push` **YASAK" in s.stdout:
        return "alt ajan kuralı Codex brief'ine sızmış (PR akışıyla çelişir)"
    return None


def t_disajan_claude_klasorune_dokunmayi_reddediyor(kok):
    """Dış ajanın sınavı gevşetmesi en sinsi senaryo."""
    taban = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=kok,
                           capture_output=True, text=True, timeout=60).stdout.strip()

    def boz():
        yol = os.path.join(kok, ".claude", "dogrula.py")
        with open(yol, "a", encoding="utf-8") as f:
            f.write("\n# sınav\n")
    _dal_kur(kok, "codex/sinav-gevsetme", boz, ".claude/dogrula.py")
    s = kos(kok, "disajan.py", "kapi", "--dal", "codex/sinav-gevsetme",
            "--taban", taban)
    if s.returncode != 1 or "ölçüm katmanına dokunulmuş" not in s.stdout:
        return f"ölçüm katmanına dokunan dal geçti (çıkış {s.returncode})"
    return None


def t_disajan_kural_ihlalini_reddediyor(kok):
    taban = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=kok,
                           capture_output=True, text=True, timeout=60).stdout.strip()

    def boz():
        yol = os.path.join(kok, "assets", "css", "style.css")
        with open(yol, encoding="utf-8") as f:
            icerik = f.read()
        with open(yol, "w", encoding="utf-8") as f:
            f.write(icerik.replace("[hidden] { display: none !important; }", "", 1))
    _dal_kur(kok, "codex/kural-ihlali", boz, "assets/css/style.css")
    s = kos(kok, "disajan.py", "kapi", "--dal", "codex/kural-ihlali", "--taban", taban)
    if s.returncode != 1:
        return f"kural ihlalli dal geçti (çıkış {s.returncode})"
    if "gizleme" not in s.stdout:
        return "bulgu Codex'e geri gidecek biçimde raporlanmadı"
    return None


def t_disajan_temiz_dali_kabul_ediyor(kok):
    """Aşırı duyarlılık da hatadır: temiz iş geçmeli."""
    taban = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=kok,
                           capture_output=True, text=True, timeout=60).stdout.strip()

    def duzelt():
        yol = os.path.join(kok, "assets", "js", "data.js")
        with open(yol, encoding="utf-8") as f:
            icerik = f.read()
        with open(yol, "w", encoding="utf-8") as f:
            f.write(icerik.replace('"Olağanüstü zekâ"', '"Olağanüstü zekâsı"', 1))
    _dal_kur(kok, "codex/temiz", duzelt, "assets/js/data.js")
    s = kos(kok, "disajan.py", "kapi", "--dal", "codex/temiz", "--taban", taban)
    if s.returncode != 0:
        return f"temiz dal reddedildi (çıkış {s.returncode}): {s.stdout.strip()[-200:]}"
    return None


def t_disajan_kosmayan_kapiyi_gecmis_saymiyor(kok):
    """Koşmayan denetim, geçen denetim değildir.

    İlk hâlim tam bunu yapıyordu: dalda `butunluk.py` bulunmayınca çıkış 2
    geliyor ve kapı "dördü de geçti" diyordu.
    """
    taban = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=kok,
                           capture_output=True, text=True, timeout=60).stdout.strip()

    def sil():
        os.remove(os.path.join(kok, ".claude", "butunluk.py"))
    _dal_kur(kok, "codex/kapi-yok", sil, ".claude/butunluk.py")
    s = kos(kok, "disajan.py", "kapi", "--dal", "codex/kapi-yok", "--taban", taban)
    if s.returncode == 0:
        return "koşmayan kapı geçmiş sayıldı"
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
    ("yargı: yanlış satır atfı yakalanıyor", t_yargi_yanlis_satir_atfini_yakalar),
    ("yargı: hazirla cevabı sızdırmıyor",   t_yargi_hazirla_sizdirmiyor),
    ("yargı: eksik gönderim yakalanıyor",   t_yargi_eksik_gonderim_yakalar),
    ("yargı: yinelenen numara yakalanıyor", t_yargi_yinelenen_yakalar),

    ("görev: sözleşmesiz engelleniyor",     t_gorev_sozlesmesiz_engelleniyor),
    ("görev: sözleşmeli geçiyor",           t_gorev_sozlesmeli_geciyor),
    ("görev: bağlam enjekte ediliyor",      t_gorev_baglam_enjekte_ediyor),
    ("görev: --baglamsiz çalışıyor",        t_gorev_baglamsiz_secenegi_calisiyor),
    ("görev: konu dışında dayanak uydurmuyor", t_gorev_konu_disinda_uydurmuyor),
    ("görev: doğru atıf geçiyor",           t_gorev_dogru_atifi_geciriyor),
    ("görev: uydurma atıf yakalanıyor",     t_gorev_uydurma_atifi_yakaliyor),
    ("görev: kusur deftere yazılıyor",      t_gorev_kusuru_deftere_yaziyor),

    ("seyir: ham iz özete girmiyor",        t_seyir_ozet_ham_izi_dislar),
    ("seyir: gerekçesiz karar reddediliyor", t_seyir_gerekcesiz_karari_reddeder),
    ("seyir: kapanışta boşluk hatırlatılıyor", t_seyir_cozulmemisi_kapanista_hatirlatir),

    ("sürüm: 9'dan sonra minör artıyor",    t_surum_dokuzda_minore_gecer),
    ("sürüm: 9.9'dan sonra majör artıyor",  t_surum_dokuz_dokuzda_majore_gecer),
    ("sürüm: normal yama artışı",           t_surum_normal_yama_artiyor),
    ("sürüm: belge kayması yakalanıyor",    t_surum_belge_kaymasi_yakalaniyor),

    ("logo: üretim kararlı",                t_logo_uretim_kararli),
    ("logo: sade simge sade kalıyor",       t_logo_simge_sade_kaliyor),
    ("logo: elle düzenleme yakalanıyor",    t_logo_elle_duzenleme_yakalaniyor),
    ("logo: sürüm kayması yakalanıyor",     t_logo_surum_kaymasi_yakalaniyor),
    ("logo: eksik dosya yakalanıyor",       t_logo_eksik_dosya_yakalaniyor),
    ("logo: sürüm gövdeden geliyor",        t_logo_surumu_govdeden_aliyor),

    ("hedef: kayma yakalanıyor",            t_hedef_kaymasini_yakaliyor),
    ("hedef: sağlam hedef geçiyor",         t_hedef_saglamken_gecer),
    ("hedef: üst görev erken kapanmıyor",   t_hedef_ustu_erken_kapatmiyor),
    ("hedef: kaymışken sapma yazılmıyor",   t_hedef_kaymisken_sapma_yazilmiyor),
    ("hedef: açık görevle kapanmıyor",      t_hedef_acik_gorevle_kapanmiyor),

    ("bütçe: duvar saati kesiyor",          t_devre_sure_butcesi_kesiyor),
    ("bütçe: süre kapalıyken kesmiyor",     t_devre_sure_kapaliyken_kesmiyor),
    ("ilerleme: salınım yakalanıyor",       t_devre_salinimi_yakaliyor),
    ("ilerleme: tekrar yakalanıyor",        t_devre_tekrari_yakaliyor),
    ("ilerleme: ilerleyen döngü kesilmiyor", t_devre_farkli_isleri_kesmiyor),

    ("yetki: beyansız görev engelleniyor",  t_gorev_yetkisiz_brief_engelleniyor),
    ("yetki: iki mod da üretiliyor",        t_gorev_iki_mod_da_uretiliyor),
    ("yetki: ihlal yakalanıyor",            t_gorev_yetki_ihlali_yakalaniyor),

    ("kanca: kapı sayacı artırmıyor",       t_kanca_kapi_sayaci_artirmiyor),
    ("kanca: aynı hatada kesiyor",          t_kanca_ayni_hatada_kesiyor),
    ("kanca: hata imzasını deftere yazıyor", t_kanca_hata_imzasini_yaziyor),
    ("denetleyici: bozuk araca dayanıyor",  t_dogrula_bozuk_araca_dayaniyor),

    ("belge: altın set kayması yakalanıyor", t_belge_altin_set_kaymasini_yakaliyor),
    ("belge: kaymamış set masum",           t_belge_kaymamis_altin_set_masum),

    ("bütünlük: temiz başlangıç",           t_butunluk_temiz_baslangic),
    ("bütünlük: plaka hatası yakalanıyor",  t_butunluk_plaka_hatasi_yakalaniyor),
    ("bütünlük: canon dışı isim yakalanıyor", t_butunluk_canon_disi_isim_yakalaniyor),
    ("bütünlük: sıralama iddiası yakalanıyor", t_butunluk_siralama_iddiasi_yakalaniyor),
    ("bütünlük: canon sıralaması masum",     t_butunluk_canon_siralamasi_yanlis_alarm_vermiyor),
    ("bütünlük: kırık bağlantı yakalanıyor", t_butunluk_kirik_baglanti_yakalaniyor),
    ("bütünlük: ölü veri yakalanıyor",       t_butunluk_olu_veri_yakalaniyor),
    ("bütünlük: okuyucu data.js'i çözüyor",  t_butunluk_okuyucu_data_js_i_cozuyor),

    ("olay: temiz düzenleme geçiyor",       t_olay_temiz_duzenlemeyi_geciriyor),
    ("olay: bozuk düzenleme geri besleniyor", t_olay_bozuk_duzenlemeyi_geri_besliyor),
    ("olay: sözleşmesiz görev engelleniyor", t_olay_sozlesmesiz_gorevi_engelliyor),
    ("olay: bilinmeyen olay deftere düşüyor", t_olay_bilinmeyen_olay_deftere_dusuyor),
    ("olay: bozuk girdi kilitlemiyor",       t_olay_bozuk_girdi_kilitlemiyor),
    ("olay: tablo işleyicileri gösteriyor",  t_olay_tablosu_isleyicileri_gosteriyor),
    ("olay: ayar dağıtıcıya yönlendiriyor",  t_olay_ayar_dagiticiya_yonlendiriyor),

    ("eniyile: temizde kabul ediyor",        t_eniyile_temizde_kabul_ediyor),
    ("eniyile: kısmi puan veriyor",          t_eniyile_kismi_puan_veriyor),
    ("eniyile: ilerlemeyi görüyor",          t_eniyile_ilerlemeyi_goruyor),
    ("eniyile: kısır turda duruyor",         t_eniyile_kisir_turda_duruyor),
    ("eniyile: insan kapısını optimize etmiyor", t_eniyile_insan_kapisini_optimize_etmiyor),

    ("tırmanma: yazma gerçekten etkiliyor", t_tirmanma_yazma_gercekten_etkiliyor),
    ("tırmanma: kapı düşen aday eleniyor",  t_tirmanma_kapi_dusen_adayi_eliyor),
    ("tırmanma: yalıtık tepe reddediliyor", t_tirmanma_yalitik_tepeyi_reddediyor),

    ("eleştirmen: lastik damga yakalanıyor", t_elestirmen_lastik_damgayi_yakaliyor),
    ("eleştirmen: temiz onay kabul ediliyor", t_elestirmen_temiz_onayi_kabul_ediyor),
    ("eleştirmen: uydurma atıf yakalanıyor", t_elestirmen_uydurma_atifi_yakaliyor),
    ("eleştirmen: sessiz onay reddediliyor", t_elestirmen_sessiz_onayi_reddediyor),
    ("eleştirmen: brief yetki beyanı taşıyor", t_elestirmen_brief_yetki_beyani_tasiyor),

    ("tdd: geçen testle kırmızı başlamıyor", t_tdd_gecen_testle_kirmizi_baslatmiyor),
    ("tdd: kırmızısız yeşile geçmiyor",      t_tdd_kirmizisiz_yesile_gecmiyor),
    ("tdd: olmayan vakada çökmüyor",         t_tdd_olmayan_vakada_cokmuyor),
    ("tdd: gerçek kırmızı-yeşil dönüşü",     t_tdd_gercek_kirmizi_yesil_donusu),
    ("tdd: düzenleme test silmeyi reddediyor", t_tdd_duzenleme_test_silmeyi_reddediyor),

    ("geri bildirim: testsiz kapatma reddediliyor", t_geri_bildirim_testsiz_kapatmayi_reddediyor),
    ("geri bildirim: gerçek vakayla kapanıyor", t_geri_bildirim_gercek_vakayla_kapatiyor),
    ("geri bildirim: korumasız kayıt raporlanıyor", t_geri_bildirim_korumasizi_raporluyor),

    ("dış ajan: brief PR akışını taşıyor",  t_disajan_brief_pr_akisini_tasiyor),
    ("dış ajan: .claude'a dokunma reddediliyor", t_disajan_claude_klasorune_dokunmayi_reddediyor),
    ("dış ajan: kural ihlali reddediliyor", t_disajan_kural_ihlalini_reddediyor),
    ("dış ajan: temiz dal kabul ediliyor",  t_disajan_temiz_dali_kabul_ediyor),
    ("dış ajan: koşmayan kapı geçmiş sayılmıyor", t_disajan_kosmayan_kapiyi_gecmis_saymiyor),

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
