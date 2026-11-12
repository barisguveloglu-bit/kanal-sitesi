# -*- coding: utf-8 -*-
"""BUTUN YETENEKLERI GERCEK MOTORDA, SAHTE OYUNCUYLA CALISTIR.   v7.99.18

    python3 addon/sunucu/tarama_dene.py --hedef KLASOR --deneme [--sure 900]

acilis_dene.py paketin ACILISINI olcuyor; bu, CALISMASINI olcuyor.
test/ altindaki her sey @minecraft/server'in sahtesine karsi kosuyor ve
sahte motor yanlis imzali bir cagriyi, tirnaksiz bir komut argumanini ya da
kucuk harfli bir GameMode adini kabul ediyor. Gercek motor etmiyor.

Ne yapiyor:
  1. Deneme sunucusundaki davranis paketinin betiklerini depodaki guncel
     betiklerle degistirir, main.js'in sonuna tarama_eki.js'i ekler,
     manifest'e @minecraft/server-gametest bagimliligini yazar ve dunyada
     "Beta API'ler" deneyini acar (sahte oyuncu icin gerekli).
  2. Sunucuyu acar. Ek, alti sahte oyuncuyla 325 yetenegi, sohbet
     komutlarini ve 600 esyayi sirayla calistirir ("[TARAMA] BITTI").
  3. Kapatir; manifest, betikler ve level.dat'i ESKI HALINE getirir.
  4. Kaydi tarama_kaydi.txt'ye yazar ve ozetler: kac yetenek calisti,
     hangisi hic calismadi, hangi "HATA @" satirlari kac kez goruldu.

YALNIZ DENEME KURULUMUNDA. Yetenekler blok kirar, varlik dogurur, arenayi
bozar; dunya bu kosudan sonra dovus icin KULLANILMAZ. Bu yuzden:
  * --deneme yazilmadan calismaz;
  * izin listesinde oyuncu varsa (gercek sunucunun isareti) reddeder.
Gercek sunucuyu taramak istersen onu baska bir klasore yeniden kur
(sunucu_kur.sh --hedef /baska/klasor) ve orayi tara.

Ilk kosu (2026-11-11) sahte motorun goremedigi sunlari buldu: tirnaksiz
sayi kimlikli /fog remove (Arinma), kucuk harfli setGameMode (Gozcu, Kilic),
butce doluyken donusumde TypeError, itilemeyen hedefte hasarin atlanmasi.

Cikis kodu: 0 temiz; 1 sunucu acilmadi, tarama bitmedi, bir yetenek hic
calismadi ya da beklenmeyen bir HATA satiri var.
"""
import argparse
import collections
import glob
import json
import os
import re
import shutil
import sys
import time

BURASI = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.dirname(BURASI)
sys.dont_write_bytecode = True
sys.path.insert(0, BURASI)
sys.path.insert(0, os.path.join(ADDON, "arac"))
from konsol import Konsol, calisiyor_mu  # noqa: E402
import nbt  # noqa: E402

PAKET = "Simsek_TNT_ToprakTopu"
OYUN_TESTI = "@minecraft/server-gametest"

# Taramanin KENDISININ urettigi, hata sayilmayan satirlar.
#   * Sahte oyuncular bilerek cikarilip yeniden doguruluyor (playerLeave
#     yolu sinansin diye). Suren bir is cikan oyuncuya yazmaya calisinca
#     motor "Entity being invalid" diyor; oyuncu gercekten gitmis.
#   * ilkel.silah: oyuncu olmayan varlikta minecraft:equippable betikten
#     okunamiyor. Bilinen sinir, kodda yazili; bir kez bildiriliyor.
BEKLENEN = (
    "Entity being invalid",
    "Player quit before responding",
    "HATA @ ilkel.silah: minecraft:equippable script tarafinda yok",
)

# Durust asamanin gercekten oynandigini gosteren alt sinirlar: her oyuncu
# en az bu kadar yol yurumus, biri en az bu hiza (kosarak ziplama ~7 blok/sn)
# ve bu yukseklige (sahanlik 4 blok) cikmis, en az bu kadar vurus isabet etmis.
DURUST_EN_AZ = {"yol": 80.0, "hiz": 6.0, "zirve": 3.5, "vurus": 20}

EK_KOMUTLAR = [
    "can 10", "bot elmas 4", "bot bekle", "bot takip", "bot geri", "jujutsu gojo",
    "meyve gomu", "yetenek gura", "yetenek olmayan", "cekim aktor", "cekim sahne",
    "cekim liste", "cekim yardim", "cekim birak", "savunma", "savunma", "arin",
    "yedek", "yukle", "anlamsiz komut",
]


def hazirla(kok):
    """Deneme kopyasini taramaya hazirlar. Donen: geri alma islevi."""
    bp = os.path.join(kok, "behavior_packs", PAKET)
    if not os.path.isdir(bp):
        raise SystemExit("HATA: %s yok. Once sunucu_kur.sh." % bp)
    dunyalar = [d for d in sorted(os.listdir(os.path.join(kok, "worlds")))
                if os.path.exists(os.path.join(kok, "worlds", d, "level.dat"))]
    if not dunyalar:
        raise SystemExit("HATA: dunya yok. Sunucuyu bir kez ac (acilis_dene.py).")
    seviye = os.path.join(kok, "worlds", dunyalar[0], "level.dat")
    manifest = os.path.join(bp, "manifest.json")
    yedek = {"manifest": open(manifest, "rb").read(), "seviye": open(seviye, "rb").read()}

    def geri_al():
        open(manifest, "wb").write(yedek["manifest"])
        open(seviye, "wb").write(yedek["seviye"])
        shutil.rmtree(os.path.join(bp, "scripts"), ignore_errors=True)
        shutil.copytree(os.path.join(ADDON, PAKET, "scripts"), os.path.join(bp, "scripts"))

    # 1. guncel betikler + ek
    shutil.rmtree(os.path.join(bp, "scripts"), ignore_errors=True)
    shutil.copytree(os.path.join(ADDON, PAKET, "scripts"), os.path.join(bp, "scripts"))
    sohbet = open(os.path.join(bp, "scripts", "sohbet.js"), encoding="utf-8").read()
    komutlar = sorted(set(re.findall(r'ad === "([^"]+)"', sohbet))) + EK_KOMUTLAR
    esyalar = sorted(
        json.load(open(f, encoding="utf-8"))["minecraft:item"]["description"]["identifier"]
        for f in glob.glob(os.path.join(ADDON, PAKET, "items", "*.json")))
    # Gozcu uyarilarini SOHBETE yaziyor; sohbet sunucu kaydina dusmez.
    # Yalniz bu kopyada sohbeteYaz kayda da yaziyor.
    yrd = os.path.join(bp, "scripts", "yardimcilar.js")
    metin = open(yrd, encoding="utf-8").read()
    kanca = "export function sohbeteYaz(metin) {\n"
    if metin.count(kanca) != 1:
        raise SystemExit("HATA: yardimcilar.js'te sohbeteYaz bulunamadi; kanca takilamadi.")
    open(yrd, "w", encoding="utf-8").write(metin.replace(
        kanca, kanca + '  console.warn("[TARAMA-SOHBET] " + metin);\n'))
    ek = open(os.path.join(BURASI, "tarama_eki.js"), encoding="utf-8").read()
    with open(os.path.join(bp, "scripts", "main.js"), "a", encoding="utf-8") as f:
        f.write("\nconst __KOMUTLAR = %s;\nconst __TUM_ESYALAR = %s;\n"
                % (json.dumps(komutlar, ensure_ascii=False), json.dumps(esyalar)))
        f.write(ek)

    # 2. manifest: sahte oyuncu modulu
    m = json.loads(yedek["manifest"].decode("utf-8"))
    m["dependencies"] = [d for d in m["dependencies"] if d.get("module_name") != OYUN_TESTI]
    m["dependencies"].append({"module_name": OYUN_TESTI, "version": "1.0.0-beta"})
    json.dump(m, open(manifest, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    # 3. level.dat: Beta API deneyi (beta modul onsuz yuklenmiyor)
    surum, sozluk = nbt.level_dat_oku(yedek["seviye"])
    eski = sozluk.get("experiments")
    deney = dict(eski.deger) if eski is not None else {}
    for ad in ("gametest", "experiments_ever_used", "saved_with_toggled_experiments"):
        deney[ad] = nbt.B(1)
    sozluk["experiments"] = nbt.Etiket(nbt.BILESIK, deney)
    yeni = nbt.level_dat_yaz(sozluk, surum)
    if set(nbt.level_dat_oku(yeni)[1]) != set(sozluk):
        geri_al()
        raise SystemExit("HATA: level.dat geri okunamadi; dokunulmadi.")
    open(seviye, "wb").write(yeni)
    return geri_al, len(komutlar), len(esyalar)


def gozcu_ozeti(satirlar):
    """Gozcu'nun sohbete yazdiklari, asamaya gore.

    Donen: {asama: Counter(sebep)}. "durust" asamasinda oyuncular hicbir
    yetenek kullanmiyor; orada gorulen her uyari YANLIS ALARM."""
    asama, c = "acilis", collections.defaultdict(collections.Counter)
    for s in satirlar:
        m = re.search(r"\[TARAMA\] ASAMA (\w+)", s)
        if m:
            asama = m.group(1)
            continue
        m = re.search(r"\[TARAMA-SOHBET\] (.*)", s)
        if not m or "Gözcü" not in m.group(1):
            continue
        duz = re.sub(r"§.", "", m.group(1))
        # "⚠ Gözcü: tarama3 · sebep · sayilar" -> oyuncu adi ve sayilar atilir
        sebep = re.sub(r"tarama\d+", "<oyuncu>", duz)
        sebep = re.sub(r"\d+([.,]\d+)?", "N", sebep)
        c[asama][sebep[:160]] += 1
    return c


def ozetle(satirlar):
    """Kayit -> (calisan, hic_calismayan, istisnalar, hatalar, bitti)."""
    calisan, hic, istisna, bitti = set(), None, [], False
    hatalar = collections.Counter()
    for s in satirlar:
        m = re.search(r"\[TARAMA\] (.*)", s)
        if m:
            t = m.group(1)
            if t.startswith("calisti "):
                calisan.add(t.split()[1])
            elif t.startswith("HIC CALISMAYAN:"):
                hic = [x for x in t.split(":", 1)[1].strip().split(",") if x]
            elif t.startswith(("ISTISNA", "TETIK ISTISNA", "KURULAMADI", "esya atti", "komut atti",
                               "durust adim atti", "dokunma atti", "etkilesim atti",
                               "oldurme atti", "yeniden dogus atti")):
                istisna.append(t[:300])
            elif t == "BITTI":
                bitti = True
            continue
        if "HATA @" in s:
            metin = s.split("[SimsekTNT] ", 1)[-1].strip()
            hatalar[re.sub(r"\d+(\.\d+)?", "N", metin)[:240]] += 1
    return calisan, hic, istisna, hatalar, bitti


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--hedef", default=os.environ.get("SUNUCU_KOK",
                                                     os.path.expanduser("~/simsek_sunucu")))
    p.add_argument("--sure", type=int, default=900)
    p.add_argument("--deneme", action="store_true",
                   help="bu klasorun DENEME kurulumu oldugunu onayla (dunya bozulur)")
    a = p.parse_args()
    kok = os.path.abspath(a.hedef)
    if not a.deneme:
        print("HATA: --deneme yazilmadi. Tarama dunyayi bozar; yalniz deneme kurulumunda.")
        return 1
    if calisiyor_mu(kok):
        print("HATA: sunucu su an calisiyor; once konsolda stop.")
        return 1
    try:
        izinli = json.load(open(os.path.join(kok, "allowlist.json"), encoding="utf-8"))
    except (OSError, ValueError):
        izinli = []
    if izinli:
        print("HATA: izin listesinde %d oyuncu var; bu gercek bir sunucuya benziyor." % len(izinli))
        print("  Tarama dunyayi bozar. Baska bir klasore kur ve orayi tara.")
        return 1

    geri_al, n_komut, n_esya = hazirla(kok)
    print("hazir: %d komut, %d esya; sunucu aciliyor" % (n_komut, n_esya))
    t0 = time.time()
    acildi = False
    try:
        with Konsol(kok) as k:
            acildi = bool(k.bekle("Server started.", 240))
            if acildi:
                k.bekle(re.compile(r"\[TARAMA\] (BITTI|KURULAMADI)"), a.sure)
            satirlar = list(k.satirlar)
    finally:
        geri_al()
    with open(os.path.join(kok, "tarama_kaydi.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(satirlar) + "\n")

    calisan, hic, istisna, hatalar, bitti = ozetle(satirlar)
    sorun = []
    if not acildi:
        sorun.append("sunucu acilmadi")
    elif not bitti:
        sorun.append("tarama %d sn icinde bitmedi" % a.sure)
    if hic:
        sorun.append("hic calismayan yetenek: " + ", ".join(hic))
    for t in istisna:
        sorun.append("istisna: " + t)
    beklenmeyen = [(m, n) for m, n in hatalar.items() if not any(b in m for b in BEKLENEN)]
    for m, n in beklenmeyen:
        sorun.append("HATA x%d: %s" % (n, m))

    print("tarama: %s (%.0f sn)" % ("BITTI" if bitti else "BITMEDI", time.time() - t0))
    print("kayit: %s (%d satir)" % (os.path.join(kok, "tarama_kaydi.txt"), len(satirlar)))
    print("yetenek: %d calisti" % len(calisan))
    print("HATA satiri: %d cesit (%d beklenen, %d beklenmeyen)"
          % (len(hatalar), len(hatalar) - len(beklenmeyen), len(beklenmeyen)))
    for m, n in sorted(hatalar.items(), key=lambda x: -x[1]):
        isaret = " " if any(b in m for b in BEKLENEN) else "!"
        print("  %s x%-4d %s" % (isaret, n, m[:150]))
    # Durust asama GERCEKTEN oynandi mi? Oynanmadiysa "0 uyari" bos.
    olcum = None
    for s in satirlar:
        m = re.search(r"\[TARAMA\] DURUST olcum yol=([\d.]+) hiz=([\d.]+) zirve=([\d.]+) vurus=(\d+)", s)
        if m:
            olcum = [float(m.group(1)), float(m.group(2)), float(m.group(3)), int(m.group(4))]
    if olcum is None:
        sorun.append("durust asama olcumu yok")
    else:
        print("durust oyun: her oyuncu en az %.0f blok yurudu, en yuksek hiz %.1f blok/sn, "
              "zirve %.1f blok, %d oyuncu-oyuncu vurusu" % tuple(olcum))
        for ad, deger, esik in (("yol", olcum[0], DURUST_EN_AZ["yol"]),
                                ("hiz", olcum[1], DURUST_EN_AZ["hiz"]),
                                ("zirve", olcum[2], DURUST_EN_AZ["zirve"]),
                                ("vurus", olcum[3], DURUST_EN_AZ["vurus"])):
            if deger < esik:
                sorun.append("durust asama zayif: %s %.1f < %.1f (0 uyari bir sey kanitlamaz)"
                             % (ad, deger, esik))
    gozcu = gozcu_ozeti(satirlar)
    durust = gozcu.get("durust", {})
    print("Gozcu, DURUST oyunda: %d uyari (her biri yanlis alarm)" % sum(durust.values()))
    for m, n in sorted(durust.items(), key=lambda x: -x[1]):
        print("  ! x%-4d %s" % (n, m))
        sorun.append("Gozcu durust oyuncuyu sucladi x%d: %s" % (n, m))
    for asama in sorted(gozcu):
        if asama == "durust":
            continue
        print("Gozcu, %s asamasinda: %d uyari (bilgi)" % (asama, sum(gozcu[asama].values())))
        for m, n in sorted(gozcu[asama].items(), key=lambda x: -x[1])[:8]:
            print("    x%-4d %s" % (n, m))
    for s in sorun:
        print("SORUN: " + s)
    return 1 if sorun else 0


if __name__ == "__main__":
    sys.exit(main())
