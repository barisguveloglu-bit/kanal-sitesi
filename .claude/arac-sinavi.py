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
    for artik in (".claude/devre-durumu.json", ".claude/saglik-gecmisi.jsonl"):
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
    yol = os.path.join(kok, "rapor-iyi.md")
    open(yol, "w", encoding="utf-8").write(
        "Barış Teşup'un elinde Orta Cephe'de tutuluyor. LORE.md:428\n")
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


# ------------------------------------------- alt ajanın başka kapıdan çıkışı

def t_gorev_uzak_oturum_da_sozlesmeye_tabi(kok):
    """Ajana kendi bulut bilgisayarını vermenin yolu ayrı bir oturum açmak
    (create_session). Sözleşme kancası sadece Agent/Task'ı dinlerse, o yoldan
    giden görev sözleşmesiz çıkar — kural bir kapıda durur, öbüründen geçilir."""
    import re as _re
    ayar = json.load(open(os.path.join(kok, ".claude", "settings.json"), encoding="utf-8"))
    eslesenler = [g.get("matcher", "") for g in ayar["hooks"].get("PreToolUse", [])
                  if any("kanca-gorev.py" in k.get("command", "") for k in g.get("hooks", []))]
    for arac in ("Agent", "Task", "mcp__claude-code-remote__create_session"):
        if not any(_re.fullmatch(m, arac) for m in eslesenler):
            return f"sözleşme kancası {arac} ile açılan görevi görmüyor"
    olay = json.dumps({"tool_name": "mcp__claude-code-remote__create_session",
                       "tool_input": {"prompt": "Siteye yeni karakter ekle ve pushla."}})
    s = subprocess.run([sys.executable, os.path.join(kok, ".claude", "kanca-gorev.py")],
                       cwd=kok, input=olay, capture_output=True, text=True, timeout=60)
    if s.returncode != 2:
        return f"sözleşmesiz uzak oturum gönderildi (çıkış {s.returncode})"
    return None


# --------------------------------------------- kapı kancası (tur sonu, commit)

def _degistir(kok, yol, eski, yeni):
    p = os.path.join(kok, yol)
    s = open(p, encoding="utf-8").read()
    if eski not in s:
        raise AssertionError(f"{yol} içinde yok: {eski[:60]!r}")
    open(p, "w", encoding="utf-8").write(s.replace(eski, yeni, 1))


def _boz(kok):
    """Bash'in yapacağı gibi doğrudan yaz — hiçbir düzenleme kancası tetiklenmez."""
    _degistir(kok, "assets/css/style.css", "[hidden] { display: none !important; }", "")


def _kapi(kok, olay):
    return subprocess.run([sys.executable, os.path.join(kok, ".claude", "kanca-kapi.py")],
                          cwd=kok, input=json.dumps(olay), capture_output=True,
                          text=True, timeout=120)


def _bash(komut):
    return {"hook_event_name": "PreToolUse", "tool_name": "Bash",
            "tool_input": {"command": komut}}


def t_kapi_tur_sonu_kirmiziyi_durduruyor(kok):
    """Bash ile bozulan dosya: düzenleme kancası görmedi, tur sonu görmeli."""
    _boz(kok)
    s = _kapi(kok, {"hook_event_name": "Stop", "stop_hook_active": False})
    if s.returncode != 2:
        return f"kırmızı ağaçta tur bitti (çıkış {s.returncode})"
    if "gizleme" not in s.stderr:
        return "engellendi ama hata Claude'a geri beslenmedi"
    return None


def t_kapi_tur_sonu_ikinci_kez_bloklamiyor(kok):
    """stop_hook_active iken yeniden bloklamak sonsuz döngüdür."""
    _boz(kok)
    s = _kapi(kok, {"hook_event_name": "Stop", "stop_hook_active": True})
    if s.returncode != 0:
        return f"ikinci denemede yine blokladı (çıkış {s.returncode}) — sonsuz döngü"
    if "systemMessage" not in s.stdout:
        return "bıraktı ama kırmızıyı kullanıcıya göstermedi"
    return None


def t_kapi_insan_kapisinda_tur_bitebilir(kok):
    """Kapı olayı hata değil: model tam da soru sormak için duruyor olabilir."""
    _degistir(kok, "assets/js/data.js", 'baslangic: { kimlik: ""',
              'baslangic: { kimlik: "Kj8mN2pQ4rT"')
    s = _kapi(kok, {"hook_event_name": "Stop", "stop_hook_active": False})
    if s.returncode != 0:
        return f"insan kapısında turu bitirtmedi (çıkış {s.returncode})"
    if "insan kapısı" not in s.stdout:
        return "kapı olayı kullanıcıya gösterilmedi"
    return None


def t_kapi_temiz_turda_sessiz(kok):
    s = _kapi(kok, {"hook_event_name": "Stop", "stop_hook_active": False})
    if s.returncode != 0 or s.stdout.strip() or s.stderr.strip():
        return f"temiz ağaçta tura karıştı (çıkış {s.returncode})"
    return None


def t_kapi_kirmizi_commit_insana_soruluyor(kok):
    _boz(kok)
    s = _kapi(kok, _bash("git add -A && git commit -m 'yarım iş'"))
    try:
        karar = json.loads(s.stdout)["hookSpecificOutput"]["permissionDecision"]
    except (ValueError, KeyError, TypeError):
        return f"kırmızı commit için karar üretilmedi: {s.stdout.strip()[:80]!r}"
    if karar != "ask":
        return f"kırmızı commit insana sorulmadı (karar: {karar})"
    return None


def t_kapi_temiz_commite_karismiyor(kok):
    s = _kapi(kok, _bash("git commit -m 'temiz iş'"))
    if s.returncode != 0 or s.stdout.strip():
        return f"temiz ağaçta commit'e karıştı: {s.stdout.strip()[:80]!r}"
    return None


def t_kapi_baska_komuta_karismiyor(kok):
    """Gönderim olmayan komut — `git stash push` dahil — kırmızı ağaçta da serbest."""
    _boz(kok)
    for komut in ("ls -la assets", "git stash push", "git log --grep commit"):
        s = _kapi(kok, _bash(komut))
        if s.returncode != 0 or s.stdout.strip():
            return f"gönderim olmayan bir komuta karıştı: {komut}"
    return None


# ------------------------------------------------------- oturum açılış kancası

def _acilis(kok):
    s = subprocess.run([sys.executable, os.path.join(kok, ".claude", "kanca-acilis.py")],
                       cwd=kok, input=json.dumps({"hook_event_name": "SessionStart",
                                                  "source": "startup"}),
                       capture_output=True, text=True, timeout=120)
    try:
        return s.returncode, json.loads(s.stdout)["hookSpecificOutput"]["additionalContext"]
    except (ValueError, KeyError, TypeError):
        return s.returncode, None


def _acik_kayit(kok, soru="açılış sınavı kaydı"):
    with open(os.path.join(kok, ".claude", "geri-bildirim.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps({"tarih": "2026-01-01", "tur": "canon", "soru": soru,
                            "yanlis": "x", "dogru": "y", "kaynak": "LORE.md:1",
                            "durum": "acik"}, ensure_ascii=False) + "\n")


def t_acilis_bekleyen_kaydi_gosteriyor(kok):
    _acik_kayit(kok)
    kod, baglam = _acilis(kok)
    if baglam is None:
        return f"açılış bağlamı üretilmedi (çıkış {kod})"
    if "Bekleyen geri bildirim" not in baglam:
        return "açık geri bildirim kaydı açılışta gösterilmedi"
    return None


def t_acilis_kirmiziyi_soyluyor(kok):
    _boz(kok)
    _, baglam = _acilis(kok)
    if baglam is None or "KIRMIZI" not in baglam:
        return "kırmızı ağaç açılışta söylenmedi"
    return None


def t_acilis_uzun_bolum_digerlerini_itmiyor(kok):
    """Uzun bir seyir defteri, bekleyen insan kararlarını bağlamdan itmemeli."""
    _acik_kayit(kok)
    with open(os.path.join(kok, ".claude", "seyir.jsonl"), "w", encoding="utf-8") as f:
        f.write(json.dumps({"tur": "baslangic", "is": "uzun iş", "hedef": ""}) + "\n")
        for i in range(60):
            f.write(json.dumps({"tur": "karar", "is": "uzun iş", "ne": f"karar {i}",
                                "neden": "sınav"}, ensure_ascii=False) + "\n")
    _, baglam = _acilis(kok)
    if baglam is None:
        return "açılış bağlamı üretilmedi"
    if len(baglam.splitlines()) > 40:
        return f"açılış bağlamı {len(baglam.splitlines())} satır — sınır yok"
    if "Bekleyen geri bildirim" not in baglam:
        return "uzun seyir bölümü bekleyen kararları bağlamdan itti"
    return None


def t_acilis_bozuk_defterde_cokmuyor(kok):
    with open(os.path.join(kok, ".claude", "geri-bildirim.jsonl"), "a", encoding="utf-8") as f:
        f.write("{bozuk json satırı\n")
    kod, baglam = _acilis(kok)
    if kod != 0 or baglam is None:
        return f"bozuk defter açılışı düşürdü (çıkış {kod})"
    return None


# ------------------------------------------------------------------ mandal

def _mandal_taban(kok):
    """Kopyada tabanı al ve commit et — HEAD'deki taban gerçekten var olsun."""
    s = kos(kok, "mandal.py", "kaydet")
    if s.returncode != 0:
        raise AssertionError(f"taban alınamadı: {s.stdout.strip()[:80]}")
    git = ["git", "-c", "user.name=sinav", "-c", "user.email=sinav@yerel",
           "-c", "commit.gpgsign=false"]
    subprocess.run(git + ["add", "-A"], cwd=kok, capture_output=True, timeout=60)
    c = subprocess.run(git + ["commit", "-qm", "sinav tabani", "--no-verify"],
                       cwd=kok, capture_output=True, text=True, timeout=60)
    if c.returncode != 0:
        raise AssertionError(f"kopyada commit olmadı: {c.stderr.strip()[:80]}")


def t_mandal_gevsemeyi_yakaliyor(kok):
    _mandal_taban(kok)
    _degistir(kok, ".claude/degerlendir.py", "ESIK_ISABET3 = 0.90", "ESIK_ISABET3 = 0.80")
    s = kos(kok, "mandal.py", "kontrol")
    if s.returncode != 3:
        return f"düşen eşik kapıya çıkmadı (çıkış {s.returncode})"
    return None


def t_mandal_sikilasmayi_geciriyor(kok):
    _mandal_taban(kok)
    _degistir(kok, ".claude/degerlendir.py", "ESIK_KAPSAMA = 0.90", "ESIK_KAPSAMA = 0.95")
    s = kos(kok, "mandal.py", "kontrol")
    if s.returncode != 0:
        return f"sıkılaşma kapı açtı (çıkış {s.returncode}) — mandal iki yönlü olmamalı"
    return None


def t_mandal_gerekcesiz_kaydetmiyor(kok):
    _mandal_taban(kok)
    _degistir(kok, ".claude/degerlendir.py", "ESIK_ISABET3 = 0.90", "ESIK_ISABET3 = 0.80")
    s = kos(kok, "mandal.py", "kaydet")
    if s.returncode != 1:
        return f"gerekçesiz gevşeme reddedilmedi (çıkış {s.returncode})"
    taban = json.load(open(os.path.join(kok, ".claude", "mandal.json"), encoding="utf-8"))
    if taban["olculer"].get("degerlendir.isabet3") != 0.9:
        return "gerekçesiz gevşeme tabana yazıldı"
    return None


def t_mandal_tabani_gevsetmek_ise_yaramiyor(kok):
    """Ölçüyü ve tabanı aynı anda gevşetmek: HEAD'deki taban hâlâ geçerli."""
    _mandal_taban(kok)
    _degistir(kok, ".claude/degerlendir.py", "ESIK_ISABET3 = 0.90", "ESIK_ISABET3 = 0.80")
    kos(kok, "mandal.py", "kaydet", "--gerekce", "model kendi kendine izin verdi")
    s = kos(kok, "mandal.py", "kontrol")
    if s.returncode != 3:
        return "çalışma ağacındaki taban gevşetilince kapı kapandı — HEAD yok sayılıyor"
    return None


def t_mandal_olcu_kaybini_yakaliyor(kok):
    """Ölçünün kendisini listeden çıkarmak en sessiz gevşetmedir."""
    _mandal_taban(kok)
    _degistir(kok, ".claude/mandal.py",
              '    ("kanca.devre_sinir",       "asagi",  "düzenleme kancasının tur sınırı"),\n', "")
    s = kos(kok, "mandal.py", "kontrol")
    if s.returncode != 3:
        return f"ölçülmeyen ölçü kapıya çıkmadı (çıkış {s.returncode})"
    return None


# ------------------------------------------------------------------ sağlık

def t_saglik_gerilemeyi_yakaliyor(kok):
    """Eşiği geçen ama önceki koşudan düşen ölçü yeşil sayılmamalı."""
    with open(os.path.join(kok, ".claude", "saglik-gecmisi.jsonl"), "w", encoding="utf-8") as f:
        f.write(json.dumps({"tarih": "2026-01-01T00:00:00", "durum": "yesil", "tam": True,
                            "olcum": {"degerlendir.isabet1": 0.99, "degerlendir.isabet3": 1.0,
                                      "degerlendir.mrr": 0.99,
                                      "degerlendir.kapsama": 1.0}}) + "\n")
    s = kos(kok, "saglik.py", "--sadece", "arama")
    if s.returncode != 3:
        return f"eşiğin üstündeki gerileme kapıya çıkmadı (çıkış {s.returncode})"
    if "gerileme" not in s.stdout.lower():
        return "gerileme raporlanmadı"
    return None


def t_saglik_kirmiziyi_soyluyor(kok):
    _boz(kok)
    s = kos(kok, "saglik.py", "--sadece", "denetim")
    if s.returncode != 1:
        return f"kırmızı denetim sağlıkta yeşil göründü (çıkış {s.returncode})"
    return None


def t_saglik_kismi_kosu_tam_sayilmiyor(kok):
    """Tek adımlık koşu 'son tam ölçüm' yerine geçmemeli."""
    kos(kok, "saglik.py", "--sadece", "denetim", "--kaydet")
    yol = os.path.join(kok, ".claude", "saglik-gecmisi.jsonl")
    if not os.path.exists(yol):
        return "--kaydet geçmişe yazmadı"
    son = [json.loads(s) for s in open(yol, encoding="utf-8") if s.strip()][-1]
    if son.get("tam") is not False:
        return "kısmi koşu tam ölçüm diye kaydedildi"
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

    ("geri bildirim: vakaya çeviriyor",     t_geribildirim_vakaya_ceviriyor),
    ("geri bildirim: yineleneni kapatıyor", t_geribildirim_yineleneni_kapatiyor),
    ("geri bildirim: kaynaksızı insana bırakıyor", t_geribildirim_kaynaksizi_insana_biraktiyor),

    ("görev: uzak oturum da sözleşmeye tabi", t_gorev_uzak_oturum_da_sozlesmeye_tabi),

    ("kapı: Bash'le bozulan tur bitmiyor",  t_kapi_tur_sonu_kirmiziyi_durduruyor),
    ("kapı: ikinci kez bloklamıyor",        t_kapi_tur_sonu_ikinci_kez_bloklamiyor),
    ("kapı: insan kapısında tur bitebilir", t_kapi_insan_kapisinda_tur_bitebilir),
    ("kapı: temiz turda sessiz",            t_kapi_temiz_turda_sessiz),
    ("kapı: kırmızı commit insana soruluyor", t_kapi_kirmizi_commit_insana_soruluyor),
    ("kapı: temiz commit'e karışmıyor",     t_kapi_temiz_commite_karismiyor),
    ("kapı: başka komuta karışmıyor",       t_kapi_baska_komuta_karismiyor),

    ("açılış: bekleyen kaydı gösteriyor",   t_acilis_bekleyen_kaydi_gosteriyor),
    ("açılış: kırmızıyı söylüyor",          t_acilis_kirmiziyi_soyluyor),
    ("açılış: uzun bölüm ötekini itmiyor",  t_acilis_uzun_bolum_digerlerini_itmiyor),
    ("açılış: bozuk defterde çökmüyor",     t_acilis_bozuk_defterde_cokmuyor),

    ("mandal: gevşeme yakalanıyor",         t_mandal_gevsemeyi_yakaliyor),
    ("mandal: sıkılaşma geçiyor",           t_mandal_sikilasmayi_geciriyor),
    ("mandal: gerekçesiz kaydetmiyor",      t_mandal_gerekcesiz_kaydetmiyor),
    ("mandal: taban gevşetmek işe yaramıyor", t_mandal_tabani_gevsetmek_ise_yaramiyor),
    ("mandal: ölçü kaybı yakalanıyor",      t_mandal_olcu_kaybini_yakaliyor),

    ("sağlık: eşik üstü gerileme yakalanıyor", t_saglik_gerilemeyi_yakaliyor),
    ("sağlık: kırmızı yeşil görünmüyor",    t_saglik_kirmiziyi_soyluyor),
    ("sağlık: kısmi koşu tam sayılmıyor",   t_saglik_kismi_kosu_tam_sayilmiyor),
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
