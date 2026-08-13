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
                baska = 1 if vaka["satir"] != 1 else 2
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
    bel = os.path.join(kok, ".claude", "DONGULER.md")
    m = open(bel, encoding="utf-8").read()
    open(bel, "w", encoding="utf-8").write(
        m.replace("# Echo v1.1\n", "# Echo v1.1.4\n", 1))
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

    ("bütünlük: temiz başlangıç",           t_butunluk_temiz_baslangic),
    ("bütünlük: plaka hatası yakalanıyor",  t_butunluk_plaka_hatasi_yakalaniyor),
    ("bütünlük: canon dışı isim yakalanıyor", t_butunluk_canon_disi_isim_yakalaniyor),
    ("bütünlük: sıralama iddiası yakalanıyor", t_butunluk_siralama_iddiasi_yakalaniyor),
    ("bütünlük: canon sıralaması masum",     t_butunluk_canon_siralamasi_yanlis_alarm_vermiyor),
    ("bütünlük: kırık bağlantı yakalanıyor", t_butunluk_kirik_baglanti_yakalaniyor),
    ("bütünlük: ölü veri yakalanıyor",       t_butunluk_olu_veri_yakalaniyor),
    ("bütünlük: okuyucu data.js'i çözüyor",  t_butunluk_okuyucu_data_js_i_cozuyor),

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
