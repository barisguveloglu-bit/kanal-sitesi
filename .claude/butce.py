#!/usr/bin/env python3
"""Koşu bütçesi ve kilometre taşları — yarıda ölen koşuyu kurtarmak.

Bu araç bir varsayımdan değil, iki kez yaşanmış bir olaydan doğdu.

Bir koşuda on ajan aynı anda gönderildi ve **onu da** oturum limitine
çarpıp düştü. Saatler sonra üç ajan daha gönderildi, ikisi yine düştü.
Her iki seferde de:

  · iş yarıda kaldı ve nerede kaldığı hiçbir yere yazılmamıştı
  · gönderim anında bütçenin biteceğini söyleyen bir şey yoktu
  · kalan bütçeye göre daha ucuz bir çalışma biçimine geçilmedi

`devre.py` tur ve duvar saati sayıyor — ama bir koşunun asıl pahalı
birimi **ajan gönderimi.** Bu araç onu sayar.

## Ne ölçebilir, ne ölçemez

**Ölçemez:** gerçek token sayısı. Buradan görünmüyor, uydurmuyoruz.
**Ölçer:** gönderim için ayrılan hak, geçen süre, tamamlanan aşama.
Hazırlık kaydı gerçek ajan başlangıcını kanıtlamaz; ortam çağrısı başarısız
olursa hak kendiliğinden geri verilmez.

Bunlar vekil ölçütler ama işe yarayan cinsten: on ajanı birden
göndermeden önce "kaç tane kaldı" sorusu cevaplanabilir hâle geliyor.

## Üç işi birden yapıyor çünkü üçü aynı arıza

  bütçe       kaç ajan kaldı, ne kadar süre kaldı
  vites       bütçe azalınca daha ucuz biçime geç (uyarı, kapı değil)
  kilometre   koşu ölürse nereden devam edileceği

Ayrı araçlar olsalardı üçü de aynı anda unutulurdu.

Çıkış kodları: 0 devam · 1 bütçe yok/bitti · 2 okunamadı · 3 insan kararı.
"""
import argparse
import datetime
import json
import math
import os
import sys
import tempfile
import time

KLASOR = os.path.dirname(os.path.abspath(__file__))
DOSYA = os.path.join(KLASOR, "butce-durumu.json")
KILIT = os.path.join(KLASOR, "butce-durumu.lock")

# Bütçenin bu oranı kaldığında vites küçültme uyarısı çıkar. Kapı değil
# uyarı: koşuyu durdurmak bütçeyi bitirmekten daha pahalı olabilir,
# kararı insan verir.
VITES_ESIGI = 0.30

# Varsayılanlar. Onar onar ajan gönderip limite çarpmak bu depoda iki kez
# oldu; varsayılan bunu bir daha sessizce yapmaya izin vermeyecek kadar
# dar tutuldu.
VARSAYILAN_AJAN = 15
VARSAYILAN_DAKIKA = 90


def oku():
    try:
        with open(DOSYA, encoding="utf-8") as f:
            d = json.load(f)
    except FileNotFoundError:
        return None
    # Eksik dosya ile bozuk kayıt ayrı durumlardır. Bozuk kayıt hiçbir
    # komutta bütçesiz çalışma iznine veya sessiz sıfırlamaya dönüşmez.
    if not isinstance(d, dict):
        raise ValueError("Bütçe bir nesne olmalı")
    for ad in ("baslangic", "ajan_sinir", "sure_sinir"):
        deger = d.get(ad)
        if (type(deger) not in (int, float) or not math.isfinite(deger)
                or deger <= 0):
            raise ValueError(f"Geçersiz bütçe alanı: {ad}")
    if type(d["ajan_sinir"]) is not int:
        raise ValueError("ajan_sinir tam sayı olmalı")
    if not isinstance(d.get("kosu"), str) or not d["kosu"].strip():
        raise ValueError("Koşu adı eksik")
    if d.get("vites") not in ("tam", "tasarruf"):
        raise ValueError("Geçersiz vites")
    for alan in ("ajanlar", "kilometreler"):
        if not isinstance(d.get(alan), list):
            raise ValueError(f"Geçersiz bütçe alanı: {alan}")
        for kayit in d[alan]:
            if (not isinstance(kayit, dict)
                    or not all(isinstance(kayit.get(k), str) for k in ("ad", "saat"))):
                raise ValueError(f"Bozuk {alan} kaydı")
            if alan == "kilometreler" and (
                    kayit.get("durum") not in ("tamam", "yarim")
                    or not isinstance(kayit.get("not"), str)
                    or type(kayit.get("ajan_sayisi")) is not int):
                raise ValueError("Bozuk kilometre kaydı")
    return d


def yaz(d):
    # Aynı dizinde atomik değiştirme: yarım yazılmış JSON görünmez.
    gecici = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8",
                dir=KLASOR, prefix="butce-", suffix=".tmp", delete=False) as f:
            gecici = f.name
            json.dump(d, f, ensure_ascii=False, indent=2, allow_nan=False)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(gecici, DOSYA)
    finally:
        if gecici and os.path.exists(gecici):
            os.unlink(gecici)


def _kalan(d):
    ajan_kalan = d["ajan_sinir"] - len(d["ajanlar"])
    gecen = time.time() - d["baslangic"]
    sure_kalan = d["sure_sinir"] - gecen
    return ajan_kalan, sure_kalan, gecen


def _oran(d):
    """Bütçenin kalan oranı — iki ölçütün DARBOĞAZI, ortalaması değil.

    Ortalama alsaydık, süresi bol ama ajanı bitmiş bir koşu 'yarı dolu'
    görünürdü. Bir koşuyu hangi kaynak bitiriyorsa o belirler.
    """
    ajan_kalan, sure_kalan, _ = _kalan(d)
    return min(ajan_kalan / max(d["ajan_sinir"], 1),
               sure_kalan / max(d["sure_sinir"], 1))


def k_ac(a):
    if a.ajan_sinir < 1 or a.dakika < 1 or not a.kosu.strip():
        raise ValueError("Koşu adı ve pozitif bütçe sınırları gerekli")
    try:
        eski = oku()
    except (ValueError, OverflowError):
        if not a.zorla:
            raise
        eski = None
        print("Bozuk bütçe --zorla ile sıfırlanıyor.")
    if eski and not a.zorla:
        print(f"Zaten açık koşu var: {eski['kosu']}")
        print("Kapatmadan yenisi açılmaz — iki bütçe aynı anda sayılamaz.")
        print("  python3 .claude/butce.py kapat")
        return 1
    yaz({
        "kosu": a.kosu,
        "baslangic": time.time(),
        "ajan_sinir": a.ajan_sinir,
        "sure_sinir": a.dakika * 60,
        "ajanlar": [],
        "kilometreler": [],
        "vites": "tam",
    })
    print(f"Bütçe açıldı: {a.kosu}")
    print(f"  ajan   {a.ajan_sinir}")
    print(f"  süre   {a.dakika} dakika")
    return 0


def k_ajan(a):
    """Bir ajan gönderiminden ÖNCE çağrılır. Bütçe bittiyse reddeder."""
    d = oku()
    if d is None:
        print("REDDEDİLDİ — açık bütçe yok.")
        print("Açmak için: butce.py ac --kosu \"<ad>\"")
        return 1

    ajan_kalan, sure_kalan, gecen = _kalan(d)

    if ajan_kalan <= 0:
        print(f"REDDEDİLDİ — ajan bütçesi bitti ({d['ajan_sinir']}/{d['ajan_sinir']}).")
        print()
        print("Bu kapı, koşunun ortasında oturum limitine çarpıp ajanların")
        print("düşmesini engellemek için var. İki kez yaşandı: iş yarıda")
        print("kaldı ve nerede kaldığı hiçbir yere yazılmamıştı.")
        print()
        print("Yapılacak: elindekiyle bitir, kilometre taşı bırak, sonra")
        print("gerekirse yeni bütçe aç.")
        return 1

    if sure_kalan <= 0:
        print(f"REDDEDİLDİ — süre bütçesi bitti ({gecen / 60:.0f} dk).")
        return 1

    d["ajanlar"].append({"ad": a.ad, "saat": datetime.datetime.now().isoformat(timespec="seconds")})
    oran = _oran(d)
    if oran <= VITES_ESIGI and d["vites"] == "tam":
        d["vites"] = "tasarruf"
    yaz(d)

    print(f"HAK AYRILDI {len(d['ajanlar'])}/{d['ajan_sinir']} — {a.ad}")
    print(f"  kalan ajan  {ajan_kalan - 1}")
    print(f"  kalan süre  {sure_kalan / 60:.0f} dk")

    if d["vites"] == "tasarruf":
        print()
        print(f"VİTES KÜÇÜLT — bütçenin %{oran * 100:.0f}'i kaldı.")
        print("Daha ucuz biçime geç: paralel yerine sırayla, uzun rapor")
        print("yerine kısa, yeni ajan yerine elindeki bulguyla devam.")
        print("Bu bir kapı değil uyarı — durmak da pahalı olabilir.")
    return 0


def k_kilometre(a):
    """Bir aşamayı işaretle — koşu ölürse buradan devam edilir."""
    d = oku()
    if d is None:
        print("Açık bütçe yok.")
        return 1
    d["kilometreler"].append({
        "ad": a.ad,
        "durum": a.durum,
        "not": a.not_ or "",
        "ajan_sayisi": len(d["ajanlar"]),
        "saat": datetime.datetime.now().isoformat(timespec="seconds"),
    })
    yaz(d)
    print(f"KİLOMETRE — {a.ad} [{a.durum}]")
    if a.durum == "yarim":
        print("Yarım işaretlendi. `butce.py devam` bunu ilk sırada gösterir.")
    return 0


def k_devam(a):
    """Koşu öldüyse nereden devam edileceğini söyler."""
    d = oku()
    if d is None:
        print("Açık koşu yok — devam edilecek bir şey yok.")
        return 0

    ajan_kalan, sure_kalan, gecen = _kalan(d)
    print(f"KOŞU: {d['kosu']}")
    print(f"  {len(d['ajanlar'])} gönderim hakkı ayrıldı, {gecen / 60:.0f} dk geçti")
    print(f"  kalan: {max(ajan_kalan, 0)} ajan, {max(sure_kalan / 60, 0):.0f} dk")
    print()

    if not d["kilometreler"]:
        print("Hiç kilometre taşı yok. Koşu ölürse nereden devam edileceği")
        print("bilinmiyor — bu, kilometre taşının var olma sebebi.")
        return 1

    yarim = [k for k in d["kilometreler"] if k["durum"] == "yarim"]
    tamam = [k for k in d["kilometreler"] if k["durum"] == "tamam"]

    print(f"TAMAMLANAN ({len(tamam)}):")
    for k in tamam:
        print(f"  ✓ {k['ad']}")
    if yarim:
        print(f"\nYARIM KALAN ({len(yarim)}) — buradan devam:")
        for k in yarim:
            print(f"  ⟳ {k['ad']}")
            if k["not"]:
                print(f"      {k['not']}")
        return 1
    print("\nYarım kalan yok.")
    return 0


def k_durum(a):
    d = oku()
    if d is None:
        print("Açık bütçe yok.")
        return 0
    ajan_kalan, sure_kalan, gecen = _kalan(d)
    oran = _oran(d)
    print(f"BÜTÇE — {d['kosu']}   ·   vites: {d['vites']}")
    print(f"  ajan        {len(d['ajanlar'])}/{d['ajan_sinir']}  (kalan {max(ajan_kalan, 0)})")
    print(f"  süre        {gecen / 60:.0f}/{d['sure_sinir'] / 60:.0f} dk")
    print(f"  kilometre   {len(d['kilometreler'])}")
    print(f"  kalan oran  %{max(oran, 0) * 100:.0f}  (darboğaz ölçütü)")
    if ajan_kalan <= 0 or sure_kalan <= 0:
        print("\nBÜTÇE BİTTİ — yeni ajan gönderilmemeli.")
        return 1
    if oran <= VITES_ESIGI:
        print("\nVİTES KÜÇÜLT — tasarruflu biçime geç.")
    return 0


def k_kapat(a):
    d = oku()
    if d is None:
        print("Açık bütçe yok.")
        return 0
    yarim = [k for k in d["kilometreler"] if k["durum"] == "yarim"]
    if yarim and not a.zorla:
        print(f"{len(yarim)} kilometre taşı YARIM:")
        for k in yarim:
            print(f"  ⟳ {k['ad']}")
        print()
        print("Yarım işi kapatmak, bitmiş saymaktır. Ya tamamla, ya")
        print("`--zorla` ile kapat ve neyin yarım kaldığını raporunda söyle.")
        return 3
    _, _, gecen = _kalan(d)
    print(f"Koşu kapandı: {d['kosu']}")
    print(f"  {len(d['ajanlar'])} ajan, {gecen / 60:.0f} dk, "
          f"{len(d['kilometreler'])} kilometre")
    os.remove(DOSYA)
    return 0


def main(argv=None):
    a = argparse.ArgumentParser(
        description="Koşu bütçesi, vites ve kilometre taşları.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("ac", help="koşu bütçesi aç")
    p.add_argument("--kosu", required=True)
    p.add_argument("--ajan-sinir", type=int, default=VARSAYILAN_AJAN)
    p.add_argument("--dakika", type=int, default=VARSAYILAN_DAKIKA)
    p.add_argument("--zorla", action="store_true")
    p.set_defaults(fn=k_ac)

    p = alt.add_parser("ajan", help="ajan gönderiminden ÖNCE çağır")
    p.add_argument("--ad", required=True)
    p.set_defaults(fn=k_ajan)

    p = alt.add_parser("kilometre", help="aşama işaretle (devam noktası)")
    p.add_argument("--ad", required=True)
    p.add_argument("--durum", choices=("tamam", "yarim"), required=True)
    p.add_argument("--not", dest="not_", default="")
    p.set_defaults(fn=k_kilometre)

    p = alt.add_parser("devam", help="koşu öldüyse nereden devam edilecek")
    p.set_defaults(fn=k_devam)

    p = alt.add_parser("durum", help="bütçe özeti")
    p.set_defaults(fn=k_durum)

    p = alt.add_parser("kapat", help="koşuyu kapat")
    p.add_argument("--zorla", action="store_true")
    p.set_defaults(fn=k_kapat)

    n = a.parse_args(argv)
    try:
        # CLI işleminin tamamı kilit altında: okuma/değiştirme/yazma tek
        # işlem olur. Kilit dosyasını silme; bekleyenler aynı inode'u tutar.
        import fcntl
        with open(KILIT, "a", encoding="utf-8") as kilit:
            fcntl.flock(kilit.fileno(), fcntl.LOCK_EX)
            return n.fn(n)
    except (OSError, ValueError, OverflowError, ImportError) as hata:
        print(f"BÜTÇE DOĞRULANAMADI — {hata}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
