# -*- coding: utf-8 -*-
"""SUNUCUYU BIR KEZ AC, SOYLEDIKLERINI SAY, KAPAT.            v7.99.16

    python3 addon/sunucu/acilis_dene.py [--hedef KLASOR] [--sure 120]

sunucu_kur.sh'ten sonra calistirilir. Oyuncu beklemeden:
  1. bedrock_server'i baslatir, "Server started." satirini bekler
  2. bizim davranis paketinin Pack Stack'te oldugunu, paket hiz
     sinirinin acildigini ve baglanti kabul edildigini denetler
  3. konsoldan yoklar: kayitli bir esya ve kayitli bir varlik
     "taninmiyor" (soz dizimi hatasi) demiyor mu
  4. arena kuruluysa: zemin, duvar, tavan ve ic hava yerinde mi; dovus
     kurallari (gamerule) istenen degerde mi
  5. "stop" ile duzgun kapatir
  6. icerik kaydini kategoriye gore sayar, tekrar edenleri tek satira
     indirir (pa:<ad> -> pa:*) ve hepsini acilis_kaydi.txt'ye yazar

Bu, eklentinin GERCEK MOTORDA acilisi: test/ altindaki her sey
@minecraft/server'in sahtesine karsi calisiyor. Motorun reddettigi
bir JSON alani ya da erken calistirmada cagrilan bir fonksiyon orada
gorunmez, burada gorunur (2026-10-27'de ilk kosuda boyle bulundu).

Cikis kodu: 0 her sey yerinde; 1 sunucu acilmadi, paket yok, yoklama
esyayi/varligi tanimadi ya da arena/kurallar bozuk.
"""
import argparse
import collections
import os
import re
import sys
import time

BURASI = os.path.dirname(os.path.abspath(__file__))
# Depoda __pycache__ birakilmasin (kullanicinin klonunda izlenmeyen
# dosya olur; mutasyon denemesinde bayat bayt kodu da kosturdu).
sys.dont_write_bytecode = True
sys.path.insert(0, BURASI)
from konsol import Konsol, sade, calisiyor_mu  # noqa: E402
from sunucu_ayar import ayar_oku  # noqa: E402
import arena_kur  # noqa: E402

BIZIM_BP = "43a967b7-88e7-4607-a7b1-4ed1394cecb9"
# Yoklama DUNYAYI DEGISTIRMEMELI: oyuncu yok (give kimseye gitmez) ve
# varlik yuklu olmayan uzak bir noktaya isteniyor -- motor adi taniyorsa
# "Unable to summon", tanimiyorsa "Syntax error" diyor. Ilk yazilista
# 0 100 0'di; arena tickingarea'si o chunk'i yuklu tuttugu icin bot
# gercekten dogardi ve dunyada kalirdi.
YOKLAMA = [
    ("give @a pa:kol_toprak", "pa:kol_toprak"),
    ("summon pa:bot 100000 100 100000", "pa:bot"),
]


def kural_listesi(satirlar):
    """'gamerule' komutunun tek satirlik cevabi -> {ad: deger} (kucuk harf)."""
    kurallar = {}
    for s in satirlar:
        for ad, deger in re.findall(r"([A-Za-z]+) = ([^,]+)", s):
            kurallar[ad.lower()] = deger.strip().lower()
    return kurallar


def istenen_kurallar():
    """arena.komut'taki 'gamerule ad deger' satirlari."""
    c = {}
    for k in arena_kur.komutlar():
        p = k.split()
        if len(p) == 3 and p[0] == "gamerule":
            c[p[1].lower()] = p[2].lower()
    return c


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--hedef", default=os.environ.get("SUNUCU_KOK",
                                                     os.path.expanduser("~/simsek_sunucu")))
    p.add_argument("--sure", type=int, default=120)
    a = p.parse_args()
    kok = os.path.abspath(a.hedef)
    if calisiyor_mu(kok):
        print("HATA: sunucu su an calisiyor; once konsolda stop.")
        return 1
    dunya = dict(ayar_oku(os.path.join(kok, "server.properties"))).get("level-name", "Bedrock level")
    arena_var = os.path.exists(os.path.join(kok, "worlds", dunya, arena_kur.ISARET))

    hatalar = []
    t0 = time.time()
    with Konsol(kok) as k:
        acildi = bool(k.bekle("Server started.", a.sure))
        sure = time.time() - t0
        if not acildi:
            hatalar.append("sunucu %d sn icinde acilmadi" % a.sure)
        else:
            for komut, ad in YOKLAMA:
                cevap = " ".join(k.komut(komut, sure=5))
                if ('Unexpected "%s"' % ad) in cevap:
                    hatalar.append("%s motor tarafindan TANINMIYOR (%s)" % (ad, komut))
            if arena_var:
                for komut in arena_kur.komutlar():
                    if not komut.startswith("testforblock"):
                        continue
                    for _ in range(40):
                        cevap = k.komut(komut, sure=5)
                        if not any(arena_kur.YUKLU_DEGIL in s for s in cevap):
                            break
                        time.sleep(0.5)
                    if not any("Successfully found the block" in s for s in cevap):
                        hatalar.append("arena bozuk: %s -> %s" %
                                       (komut, " | ".join(sade(s) for s in cevap)[:120]))
                kurallar = kural_listesi(k.komut("gamerule", sure=5))
                for ad, deger in istenen_kurallar().items():
                    if kurallar.get(ad) != deger:
                        hatalar.append("kural %s = %s (istenen %s)" % (ad, kurallar.get(ad), deger))
        satirlar = list(k.satirlar)

    with open(os.path.join(kok, "acilis_kaydi.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(satirlar) + "\n")

    tum = "\n".join(satirlar)
    if BIZIM_BP not in tum:
        hatalar.append("bizim davranis paketi Pack Stack'te yok")
    if "Packet rate limiting enabled" not in tum:
        hatalar.append("paket hiz siniri acilmadi")
    if "IPv4 supported, port:" not in tum and "Accepting clients" not in tum:
        hatalar.append("baglanti kabul edilmiyor")

    sayac = collections.Counter()
    for satir in satirlar:
        m = re.search(r"(ERROR|WARN)\] \[([A-Za-z]+)\]", satir)
        if not m:
            continue
        metin = re.sub(r"pa:[a-z0-9_]+", "pa:*", satir.split("] ", 1)[-1]).strip()
        sayac[(m.group(1), m.group(2), metin)] += 1

    print("acilis: %s (%.1f sn)" % ("TAMAM" if acildi else "ACILMADI", sure))
    print("arena: %s" % ("var, denetlendi" if arena_var else "kurulmamis (denetlenmedi)"))
    print("kayit: %s (%d satir)" % (os.path.join(kok, "acilis_kaydi.txt"), len(satirlar)))
    toplam = collections.Counter()
    for (seviye, kat, _), n in sayac.items():
        toplam[(seviye, kat)] += n
    for (seviye, kat), n in sorted(toplam.items(), key=lambda x: -x[1]):
        print("  %-5s %-11s %4d" % (seviye, kat, n))
    print("benzersiz icerik mesaji: %d (tam liste kayitta)" % len(sayac))
    for h in hatalar:
        print("HATA: " + h)
    return 1 if hatalar else 0


if __name__ == "__main__":
    sys.exit(main())
