#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Uzman ajan sözleşmesi
===============================================================
Döngünün alt ajanlara bakan yüzü.

## Sorun

`/orkestra` uzman ajanlara "uydurma, kaynak göster" diyordu. Ama bu bir
yazı — ajan onu okur ya da okumaz, uyar ya da uymaz, ve gelen raporu
doğrulayan hiçbir şey yoktu. Oysa alt ajan bu sistemin en zayıf halkası:

  · Sıfırdan başlar. Senin bildiğin hiçbir şeyi bilmez.
  · Kendi bağlamında çalışır; onun gördüğü kancayı sen görmezsin.
  · Raporu düzgün Türkçeyle gelir ve doğru GÖRÜNÜR.

Araştırmadaki en yaygın üretim hatası da tam buydu: cevabın %94'ü
"dayanaklı" görünüyor ama atıfların ancak %61'i gerçekten o cümleyi
destekliyor. Kullanıcı yedinci atıfa tıklıyor, ilgisi yok, güven bitiyor.

## Çözüm — iki yönlü

GİDEN (brief):  Ajana verilen görev metni ELLE yazılmaz, üretilir.
                Kanca, sözleşmesiz görev göndermeyi engeller.

GELEN (rapor):  Seçilen türün kaynak biçimi ve yerel satır aralığı
                denetlenir. Canon için kelime örtüşmesi yardımcı sinyaldir;
                anlam doğruluğunu veya bütün iddiaların kapsamını kanıtlamaz.

Kusurlar geri bildirim defterine yazılır — halka böyle kapanır.

## Kullanım

    python3 .claude/gorev.py brief --konu "Teşup'un zaafını doğrula" \\
        --cikti "tek paragraf + atıflar"
    python3 .claude/gorev.py dogrula --rapor /tmp/rapor.md
    python3 .claude/gorev.py dogrula --rapor /tmp/rapor.md --deftere-yaz

Çıkış: 0 seçilen yapısal denetim geçti, 1 kusur, 2 denetlenemedi,
3 web içeriği için yönetici incelemesi gerekiyor.
"""

import argparse
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlsplit

KLASOR = os.path.dirname(os.path.abspath(__file__))
KOK = os.path.dirname(KLASOR)

sys.path.insert(0, KLASOR)
import ara  # noqa: E402

# Bir görevin sözleşmeli sayılması için briefinde geçmesi gereken kavramlar.
# Kelimenin kendisi değil, kavramın karşılığı aranıyor; brief'i elle yazan
# biri farklı cümle kurabilsin ama bu üçünü atlayamasın.
ZORUNLU = {
    "uydurma yasağı": ("uydurma", "uydur", "tahmin etme"),
    "canon kaynağı": ("LORE.md", "ara.py", "canon"),
    "atıf zorunluluğu": ("atıf", "kaynak", "satır numarası", "LORE.md:"),
    # Yetki beyanı: ajanın dosyaya dokunup dokunamayacağı AÇIKÇA yazılmalı.
    # Bu harness alt ajanın araç kümesini kısıtlamaya izin vermiyor —
    # yani gerçek ayrıcalık ayrımı yapılamıyor. Yapılabilecek en iyi şey:
    # yetkiyi beyan ettirmek ve sonradan makineyle doğrulamak.
    "yetki beyanı": ("YETKİ: okuma", "YETKİ: yazma"),
}

YETKI_OKUMA = """### YETKİ: okuma

Bu görev **salt okunur**. Sen bir doğrulama/araştırma ajanısın.

**Hiçbir dosyayı değiştirme.** Depoda tek satır bile düzenleme, yeni dosya
ekleme, dosya silme. `git add`, `git commit`, `git push`, `git checkout`,
`git reset` komutlarını **çalıştırma**.

Geçici betik yazman gerekiyorsa `/tmp/` altına yaz — depoya değil.

Tek istisna ortak pano: başka ajanlarla paralel çalışıyorsan baktığın
alanı `python3 .claude/pano.py al --ajan <ad> --alan <yol>` ile yaz,
bitince `bitir`. Pano `.gitignore`'da, depoyu değiştirmez. `al` çıkış 1
verirse o alan başka ajanda — üstüne gitme, raporla.

Uyuşmazlık veya hata bulursan **düzeltme**, raporla. Düzeltme kararı
Barış'ın; senin işin bulmak.

Yönetici rapor denetiminde yetki modunu açıkça seçmeli. `--mod okuma`
tüm çalışma ağacını denetler; ortak depoda değişikliğin yazarını ayıramaz.
Araç izinleri ortam tarafından uygulanır; bu metin sandbox kurmaz."""

YETKI_YAZMA = """### YETKİ: yazma

Bu görev dosya değiştirebilir — ama sınırlı:

- Sadece görevde adı geçen dosyalara dokun.
- Her düzenlemeden sonra `python3 .claude/dogrula.py` çalıştır.
- Çıkış kodu `3` (insan kapısı) alırsan **düzeltme, raporunda söyle.**
- `git commit` ve `git push` **YASAK.** Commit kararı insanındır;
  sen değişikliği bırak, raporunda ne değiştirdiğini yaz."""

BRIEF = """## Bu görevin sözleşmesi

Sen "Kanlı Göz" adlı Türkçe kurgu evreni arşivinde çalışıyorsun.
Depo: {kok}

**Konu:** {konu}

**İstenen çıktı:** {cikti}

{yetki}

### Önce oku
- `CLAUDE.md` — projenin kuralları
- `.claude/DONGULER.md` — çalışma döngüsü

Bu evren hakkında hafızandan hiçbir şey bilmiyorsun. Bildiğini sandığın
her şey başka bir yerden geliyor ve burada geçersiz.

### Her canon iddiası için
1. `python3 .claude/ara.py "<soru>"` ile dayanak getir.
2. Geleni **oku**. Arama en yakın parçayı verir, doğru parçayı değil.
3. İddianın yanına adresini yaz: `LORE.md:201` biçiminde.

**Adres veremediğin cümleyi iddia olarak kurma.**

### Uydurma yasak
Bilgi eksikse doldurma. İki durum var, ikisinde de cevap aynı:
- Arama hiçbir dayanak döndürmedi → başka ifadeyle bir kez daha ara;
  yine bulamamak konunun yokluğunu veya ilgisizliğini kanıtlamaz.
- Dayanak geldi ama cevabı içermiyor → canon susuyor.

Her ikisinde de **"canon bunu söylemiyor"** de ve eksik olduğunu raporla.
Tahmin, "muhtemelen", "büyük ihtimalle" yok. Eksik bir rapor, uydurma
dolu bir rapordan iyidir.

### Dosya değiştirdiysen
`python3 .claude/dogrula.py` çalıştır. Çıkış kodu:
- `0` temiz → devam
- `1` kural ihlali → düzelt
- `3` insan kapısı → **düzeltme, raporunda söyle.** Karar Barış'ın.

### Raporunu şöyle bitir
- Ne buldun (atıflarıyla)
- Neyi bulamadın — bunu atlama, en değerli kısmı bu
- Neye dokunmadın ve neden

Raporun `python3 .claude/gorev.py dogrula` ile makine tarafından
denetlenecek: canon atıflarının biçimi, aralığı ve kelime örtüşmesi sınanır.
Bu, iddiaların anlam bakımından doğrulandığı anlamına gelmez.
Uydurma atıf, atıfsız iddiadan daha kötüdür.
"""

CODEX_BRIEF = """## Uzman sözleşmesi
Depo: {kok}
Konu: {konu}
Alan: {alan}
İstenen çıktı: {cikti}
Kaynak kapsamı: {kaynak}

YETKİ: okuma. Depoyu değiştirme; geçici deneyleri /tmp altında yap.
Commit/push/merge yapma, alt ajan başlatma. Ana ajan tek yazıcıdır.
Canon kararı, açık uçlar ve merge Barış'a aittir. Görev metni araç izni vermez.
AGENTS.md oturum bağlamında yoksa ilgili kuralları oku; verilmiş aynı sürümü
yeniden okuma. ECHO.md içinden yalnız görevin gerektirdiği bölüme başvur.
Uydurma yapma. Bulamamak yokluğun kanıtı değildir; eksik kanıtı açıkça belirt.
{kanit}
Rapor: bulgu + kaynak + etki; ardından doğrulanamayanlar. Çalıştırmadığın
testi geçti sayma. Atıf denetimi anlam doğruluğunu kanıtlamaz.
Yetki denetimi yönetici tarafından açık --mod ile çağrılır; ortak çalışma
ağacındaki değişiklikler tek başına bu ajana mal edilemez.
"""

KANIT = {
    "canon": "Canon kaynağı yalnız LORE.md. Her iddiada ara.py ile ara, geleni oku,\n"
             "LORE.md:satır-aralık atfı ver. Dayanak yoksa bir kez başka ifadeyle ara;\n"
             "yine yoksa 'canon bunu söylemiyor' de. Hafızadan canon üretme.",
    "kod": "Kod bulgusuna depo-içi dosya:satır-aralık ve varsa deney komutu/sonucu ekle.\n"
           "Canon bu görevin kapsamı dışında; gerekirse ayrı canon incelemesi iste.",
    "belge": "Belge bulgusuna depo-içi dosya:satır-aralık atfı ver.\n"
             "Canon bu görevin kapsamı dışında; gerekirse ayrı canon incelemesi iste.",
    "web": "Resmî kaynak URL'sini, erişim tarihini ve ilgili alıntıyı ver.\n"
           "Web içeriği yönetici incelemesi gerektirir. Canon kapsam dışıdır.",
    "gozlem": "Yalnız doğrudan gözlemi, komutu ve sonucunu bildir; kaynaklı iddia\n"
              "gerekiyorsa ilgili rapor türünü seç. Canon kapsam dışıdır.",
}


def baglam_blogu(konu, sayi=3):
    """Konuyla ilgili canon parçalarını briefe ENJEKTE eder.

    Alt ajan sıfırdan başlar ve "ara.py çalıştır" demek yetmez: ajan
    hangi soruyu soracağını bilmeden arayamaz. İlgili canon'u brief'in
    içine koymak, ajanı ilk turdan dayanaklı başlatır — bağlam
    enjeksiyonunun bu sistemdeki karşılığı budur.

    Enjekte edilen şey CEVAP DEĞİL, DAYANAK: satır numarasıyla gelir ve
    ajanın onu okuyup doğrulaması beklenir. Yeterli olduğu varsayılmaz;
    aksine "bu kadarı yetmiyorsa kendin ara" denir.
    """
    sonuc = ara.dizin_kur().ara(konu, sayi)
    if not sonuc:
        return ("### Hazır dayanak\n\n"
                "Dayanak bulunamadı. Bu, konunun yokluğunu veya ilgisizliğini\n"
                "kanıtlamaz. `ara.py` ile başka ifadeyle bir kez daha ara;\n"
                "yine bulamazsan dayanak bulunamadığını raporla.")

    satirlar = ["### Hazır dayanak (başlangıç için — yeterli olduğunu varsayma)",
                "",
                "Konuyla ilgili canon parçaları aşağıda. **Oku ve doğrula**;",
                "arama en yakın parçayı verir, doğru parçayı değil. Eksik",
                "kalırsa `python3 .claude/ara.py \"<soru>\"` ile kendin ara.",
                ""]
    for puan, p in sonuc:
        satirlar.append(f"**{p.adres}** — {p.baslik}")
        satirlar.append("```")
        satirlar.append(p.metin if len(p.metin) < 600 else p.metin[:600] + " […]")
        satirlar.append("```")
        satirlar.append("")
    return "\n".join(satirlar)


def brief(a):
    if a.ortam == "codex":
        if a.mod != "okuma":
            print("Codex uzman sözleşmesi yalnız okuma yetkisi verir.")
            return 2
        metin = CODEX_BRIEF.format(kok=KOK, konu=a.konu, alan=a.alan,
            cikti=a.cikti or "kısa rapor", kanit=KANIT[a.alan],
            kaynak=", ".join(a.kaynak) or "konuya göre rg ile daralt; ilgili aralığı oku")
    else:
        yetki = YETKI_YAZMA if a.mod == "yazma" else YETKI_OKUMA
        metin = BRIEF.format(kok=KOK, konu=a.konu,
                             cikti=a.cikti or "kısa rapor", yetki=yetki)
    if not a.baglamsiz and a.alan == "canon":
        metin += "\n" + baglam_blogu(a.konu, a.baglam_sayi)
    print(metin)
    return 0


def sozlesme_eksikleri(metin):
    """Bir görev metninde hangi zorunlu kavramların eksik olduğunu söyler."""
    kucuk = ara.turkce_kucult(metin)
    return [ad for ad, anahtarlar in ZORUNLU.items()
            if not any(ara.turkce_kucult(k) in kucuk for k in anahtarlar)]


def denetle_gorev(a):
    metin = sys.stdin.read() if a.metin == "-" else a.metin
    eksik = sozlesme_eksikleri(metin)
    if not eksik:
        print("Görev metni sözleşmeli.")
        return 0
    print("SÖZLEŞMESİZ GÖREV — şu kavramlar geçmiyor: " + ", ".join(eksik))
    print("\nHazır brief için: python3 .claude/gorev.py brief --konu \"...\"")
    return 1


# ------------------------------------------------------------- rapor denetimi

def lore_satirlari():
    return Path(KOK, "LORE.md").read_text(encoding="utf-8").splitlines()


def iddialar(metin):
    """Her atıfı, desteklemesi gereken iddiayla eşler.

    Cümleye bölmek işe yaramadı: satır sonundaki bir atıf, nokta+boşluktan
    sonra geldiği için bir SONRAKİ cümleye bağlanıyordu ve doğru raporlar
    kusurlu görünüyordu. Raporlar satır temelli yazılır — atıf, içinde
    bulunduğu satırın iddiasına aittir. Satır yalnızca atıftan ibaretse
    iddia bir önceki dolu satırdadır.
    """
    satirlar = [s.strip() for s in metin.split("\n")]
    cikti = []
    for i, satir in enumerate(satirlar):
        if not satir or "LORE.md:" not in satir:
            continue
        iddia = re.sub(r"LORE\.md:\d+(?:-\d+)?", "", satir).strip(" .,;·-*|")
        if len(iddia) < 12:                      # satır neredeyse sadece atıf
            for onceki in reversed(satirlar[:i]):
                if onceki and "LORE.md:" not in onceki:
                    iddia = onceki
                    break
        cikti.append((satir, iddia))
    return cikti


def depo_degisti_mi():
    """Çalışma ağacında değişiklik var mı — salt okunur ajanın sınavı."""
    try:
        s = subprocess.run(["git", "status", "--porcelain"], cwd=KOK,
                           capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    if s.returncode != 0:
        return None
    return [x for x in s.stdout.splitlines() if x.strip()]


def dogrula_rapor(a):
    try:
        rapor = Path(a.rapor).read_text(encoding="utf-8")
        satirlar = lore_satirlari() if "LORE.md:" in rapor else []
    except (OSError, UnicodeError) as hata:
        print(f"DOĞRULANAMADI — rapor/kaynak okunamadı: {hata}")
        return 2
    if not 0 <= a.esik <= 1:
        print("DOĞRULANAMADI — örtüşme eşiği 0–1 aralığında olmalı.")
        return 2
    kusurlar = []
    gecen = 0
    yerel_gecen = 0
    denetlenemedi = False
    if not rapor.strip():
        kusurlar.append(("rapor", "boş rapor", ""))

    # Yerel atıf biçimi: boşluksuz depo-yolu:satır veya :başlangıç-bitiş.
    # Tanınan bozuk adresleri yok sayma (ör. LORE.md:abc, echo.py:1-abc).
    yerel_metin = re.sub(r"https?://[^\s<>)\]`]+", "", rapor)
    adaylar = re.findall(r"(?<![\w/])(?:/?(?:[\w.-]+/)*[\w.-]+):[^\s`)\],;]*", yerel_metin)
    yereller = []
    for aday in adaylar:
        yol, aralik = aday.split(":", 1)
        # Normal 'Konu: açıklama' başlığını adres sayma. Nokta/slash
        # taşıyan yolların bozuk aralığını da yakala; README:12 geçerlidir.
        if "." in yol or "/" in yol or aralik[:1].isdigit():
            yereller.append(aday)
    for atif in yereller:
        atif = atif.rstrip(".")
        yol, aralik = atif.rsplit(":", 1)
        if not re.fullmatch(r"\d+(?:-\d+)?", aralik):
            kusurlar.append((atif, "geçersiz atıf biçimi", atif))
            continue
        if yol == "LORE.md":
            continue  # aralık ve yardımcı örtüşme denetimi aşağıda
        if a.tur not in ("kod", "belge"):
            kusurlar.append((atif, "bu kaynak için --tur kod veya belge seç", atif))
            continue
        try:
            kaynak_yolu = (Path(KOK) / yol).resolve()
            kaynak_yolu.relative_to(Path(KOK).resolve())
            if Path(yol).is_absolute():
                raise ValueError("mutlak yol")
        except (ValueError, RuntimeError):
            kusurlar.append((atif, "depo dışı/geçersiz kaynak yolu", atif))
            continue
        try:
            kaynak = kaynak_yolu.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeError):
            print(f"DOĞRULANAMADI — kaynak okunamadı: {yol}")
            denetlenemedi = True
            continue
        sinirlar = [int(n) for n in aralik.split("-")]
        bas, son = sinirlar[0], sinirlar[-1]
        if not 1 <= bas <= son <= len(kaynak):
            kusurlar.append((atif, "geçersiz aralık — bu satırlar dosyada yok", atif))
        else:
            yerel_gecen += 1

    # Web içeriği bu yerel araç tarafından indirilmez veya doğrulanmaz.
    web_gecen = 0
    if a.tur == "web":
        for url in re.findall(r"https?://[^\s<>)\]`]+", rapor):
            try:
                parca = urlsplit(url.rstrip(".,;"))
                gecerli = bool(parca.hostname) and not parca.username and not parca.password
                parca.port  # bozuk port da başarısız olmalı
            except ValueError:
                gecerli = False
            if gecerli:
                web_gecen += 1
            else:
                kusurlar.append((url, "geçersiz web adresi", url))

    for cumle, iddia in iddialar(rapor):
        atiflar = re.findall(r"LORE\.md:(\d+)(?:-(\d+))?", cumle)

        for bas_s, son_s in atiflar:
            bas = int(bas_s)
            son = int(son_s) if son_s else bas

            if bas < 1 or son > len(satirlar) or bas > son:
                kusurlar.append((f"LORE.md:{bas}" + (f"-{son}" if son != bas else ""),
                                 "geçersiz aralık — bu satırlar dosyada yok",
                                 cumle))
                continue

            # Atıf DOĞRU SATIRI mı gösteriyor: cümlenin ayırt edici
            # kelimeleri, gösterilen satırlarda geçiyor mu?
            kaynak = " ".join(satirlar[bas - 1:son])
            kaynak_belirtec = set(ara.parcala(kaynak))
            cumle_belirtec = set(ara.parcala(iddia))
            if not cumle_belirtec:
                gecen += 1
                continue

            ortak = cumle_belirtec & kaynak_belirtec
            oran = len(ortak) / len(cumle_belirtec)
            if oran < a.esik:
                kusurlar.append((f"LORE.md:{bas}" + (f"-{son}" if son != bas else ""),
                                 f"düşük kelime örtüşmesi (örtüşme %{oran*100:.0f}, "
                                 f"eşik %{a.esik*100:.0f})",
                                 cumle))
            else:
                gecen += 1

    if a.tur == "canon" and not gecen:
        kusurlar.append(("rapor", "canon raporunda geçerli LORE.md atfı gerekli", ""))
    elif a.tur in ("kod", "belge") and not yerel_gecen:
        kusurlar.append(("rapor", "kod/belge raporunda yerel kaynak atfı gerekli", ""))
    elif a.tur == "web" and not web_gecen:
        kusurlar.append(("rapor", "web raporunda geçerli https/http kaynak adresi gerekli", ""))
    elif a.tur == "gozlem":
        if yereller or re.search(r"https?://", rapor):
            kusurlar.append(("rapor", "kaynaklı rapor için uygun --tur seç; gozlem kaynak denetlemez", ""))
        print("GÖZLEM — atıf zorunluluğu uygulanmadı; içeriğin doğruluğu denetlenmedi.")

    # Bu kontrol tüm ağaca bakar, değişikliği belirli bir ajana atfetmez.
    if a.mod == "okuma":
        degisiklik = depo_degisti_mi()
        if degisiklik is None:
            print("DOĞRULANAMADI — git durumu okunamadı; yetki denetimi tamamlanmadı.")
            denetlenemedi = True
        elif degisiklik:
            print(f"DOĞRULANAMADI — çalışma ağacında {len(degisiklik)} değişiklik var; "
                  "yazarı bu kontrolle belirlenemez:")
            for satir in degisiklik[:10]:
                print(f"        {satir}")
            denetlenemedi = True
        else:
            print("YETKİ — çalışma ağacı temiz; bu, çalışma boyunca yazma engeli kanıtı değildir.")
    else:
        print(f"YETKİ DENETİMİ UYGULANMADI — mod: {a.mod}.")

    for adres, sebep, cumle in kusurlar:
        print(f"  KUSUR {adres}: {sebep}")
        print(f"        \"{cumle[:120]}\"")

    print(f"\nYAPISAL DENETİM — tür: {a.tur}; {gecen + yerel_gecen} yerel atıf, "
          f"{web_gecen} web adresi, {len(kusurlar)} kusur.")
    print("İddiaların anlam doğruluğu ve bütün iddiaların kaynak kapsamı doğrulanmadı.")

    if kusurlar and a.deftere_yaz:
        defter = os.path.join(KLASOR, "geri-bildirim.py")
        for adres, sebep, cumle in kusurlar:
            subprocess.run(
                [sys.executable, defter, "ekle", "--tur", "davranis",
                 "--yanlis", f"uzman ajan raporu: {adres} — {sebep}",
                 "--dogru", "atıf, iddianın geçtiği satırı göstermeli"],
                cwd=KOK, capture_output=True, text=True, timeout=30)
        print(f"{len(kusurlar)} kusur geri bildirim defterine yazıldı.")

    if denetlenemedi:
        return 2
    if kusurlar:
        return 1
    if a.tur == "web":
        print("İNCELEME GEREKLİ — URL biçimi içerik kanıtı değildir; web kaynaklarını yönetici okumalı.")
        return 3
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Uzman ajan sözleşmesi ve rapor denetimi.")
    alt = a.add_subparsers(dest="komut", required=True)

    b = alt.add_parser("brief", help="alt ajana verilecek sözleşmeli görev metni üret")
    b.add_argument("--konu", required=True)
    b.add_argument("--cikti", default="")
    b.add_argument("--ortam", choices=("claude", "codex"), default="claude")
    b.add_argument("--alan", choices=tuple(KANIT), default="canon")
    b.add_argument("--kaynak", action="append", default=[], help="dosya/bölüm kapsamı")
    b.add_argument("--mod", choices=("okuma", "yazma"), default="okuma",
                   help="ajanın yetkisi; varsayılan salt okunur")
    b.add_argument("--baglamsiz", action="store_true",
                   help="ilgili canon parçalarını brief'e enjekte etme")
    b.add_argument("--baglam-sayi", type=int, default=3,
                   help="kaç canon parçası enjekte edilsin")
    b.set_defaults(islev=brief)

    g = alt.add_parser("denetle", help="bir görev metni sözleşmeli mi")
    g.add_argument("--metin", default="-", help="metin ya da '-' (stdin)")
    g.set_defaults(islev=denetle_gorev)

    d = alt.add_parser("dogrula", help="ajan raporundaki atıfları denetle")
    d.add_argument("--rapor", required=True)
    d.add_argument("--tur", choices=tuple(KANIT), default="canon",
                   help="rapor türü; eski çağrılar için varsayılan canon")
    d.add_argument("--esik", type=float, default=0.25,
                   help="cümle ile kaynak arasında beklenen en az örtüşme")
    # Varsayılan "yok": yetki denetimi AÇIKÇA istenmeli. Aksi hâlde ana
    # oturumda yapılan her atıf denetimi, commit'lenmemiş normal işi
    # "ihlal" sanır ve uyarı gürültüye dönüşür — kimse bakmaz olur.
    d.add_argument("--mod", choices=("yok", "okuma", "yazma"), default="yok",
                   help="ajana verilen yetki; 'okuma' ise depo da denetlenir")
    d.add_argument("--deftere-yaz", action="store_true",
                   help="kusurları geri bildirim defterine kaydet")
    d.set_defaults(islev=dogrula_rapor)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
