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

GELEN (rapor):  Ajanın her atıfı makine tarafından denetlenir:
                satır var mı, aralık geçerli mi, ve o satır cümleyi
                GERÇEKTEN destekliyor mu. Desteklemiyorsa kusurdur.

Kusurlar geri bildirim defterine yazılır — halka böyle kapanır.

## Kullanım

    python3 .claude/gorev.py brief --konu "Teşup'un zaafını doğrula" \\
        --cikti "tek paragraf + atıflar"
    python3 .claude/gorev.py dogrula --rapor /tmp/rapor.md
    python3 .claude/gorev.py dogrula --rapor /tmp/rapor.md --deftere-yaz

Çıkış kodu: 0 temiz, 1 rapor kusurlu.
"""

import argparse
import os
import re
import subprocess
import sys

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
}

BRIEF = """## Bu görevin sözleşmesi

Sen "Kanlı Göz" adlı Türkçe kurgu evreni arşivinde çalışıyorsun.
Depo: {kok}

**Konu:** {konu}

**İstenen çıktı:** {cikti}

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
- Arama hiçbir dayanak döndürmedi → konu bu evrenle ilgili değil.
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
denetlenecek: her atıf gerçekten o satırı gösteriyor mu diye bakılacak.
Uydurma atıf, atıfsız iddiadan daha kötüdür.
"""


def brief(a):
    print(BRIEF.format(kok=KOK, konu=a.konu, cikti=a.cikti or "kısa rapor"))
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
    return open(os.path.join(KOK, "LORE.md"), encoding="utf-8").read().split("\n")


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


def dogrula_rapor(a):
    rapor = open(a.rapor, encoding="utf-8").read()
    satirlar = lore_satirlari()
    kusurlar = []
    gecen = 0

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
                                 f"atıf cümleyi desteklemiyor (örtüşme %{oran*100:.0f}, "
                                 f"eşik %{a.esik*100:.0f})",
                                 cumle))
            else:
                gecen += 1

    if not kusurlar and not gecen:
        print("Raporda hiç atıf yok.")
        print("Canon iddiası içeriyorsa bu bir kusurdur — adressiz iddia "
              "doğrulanamaz. Sadece gözlem/özet ise sorun değil.")
        return 0

    for adres, sebep, cumle in kusurlar:
        print(f"  KUSUR {adres}: {sebep}")
        print(f"        \"{cumle[:120]}\"")

    print(f"\n{gecen} atıf doğrulandı, {len(kusurlar)} kusurlu.")

    if kusurlar and a.deftere_yaz:
        defter = os.path.join(KLASOR, "geri-bildirim.py")
        for adres, sebep, cumle in kusurlar:
            subprocess.run(
                [sys.executable, defter, "ekle", "--tur", "davranis",
                 "--yanlis", f"uzman ajan raporu: {adres} — {sebep}",
                 "--dogru", "atıf, iddianın geçtiği satırı göstermeli"],
                cwd=KOK, capture_output=True, text=True, timeout=30)
        print(f"{len(kusurlar)} kusur geri bildirim defterine yazıldı.")

    return 1 if kusurlar else 0


def main(argv):
    a = argparse.ArgumentParser(description="Uzman ajan sözleşmesi ve rapor denetimi.")
    alt = a.add_subparsers(dest="komut", required=True)

    b = alt.add_parser("brief", help="alt ajana verilecek sözleşmeli görev metni üret")
    b.add_argument("--konu", required=True)
    b.add_argument("--cikti", default="")
    b.set_defaults(islev=brief)

    g = alt.add_parser("denetle", help="bir görev metni sözleşmeli mi")
    g.add_argument("--metin", default="-", help="metin ya da '-' (stdin)")
    g.set_defaults(islev=denetle_gorev)

    d = alt.add_parser("dogrula", help="ajan raporundaki atıfları denetle")
    d.add_argument("--rapor", required=True)
    d.add_argument("--esik", type=float, default=0.25,
                   help="cümle ile kaynak arasında beklenen en az örtüşme")
    d.add_argument("--deftere-yaz", action="store_true",
                   help="kusurları geri bildirim defterine kaydet")
    d.set_defaults(islev=dogrula_rapor)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
