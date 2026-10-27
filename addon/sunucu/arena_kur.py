# -*- coding: utf-8 -*-
"""DUELLO ARENASINI KUR: arena.komut'u sunucu konsoluna gonder.  v7.99.16

    python3 addon/sunucu/arena_kur.py [--hedef KLASOR] [--yeniden]

sunucu_kur.sh bunu kendiliginden cagiriyor. Sunucuyu oyuncusuz acar,
arena.komut'taki komutlari SIRAYLA gonderir, HER BIRININ cevabini
denetler, sonra kapatir. Biri tutmazsa durur ve isaret yazmaz.

Olculen cevaplar (BDS 1.26.52.3, 2026-10-27):
  * bolge yuklu degilken fill:  "Cannot place blocks outside of the world"
    -- yeniden acilistan hemen sonra preload'lu bolge de bir an yuklu
    degil, o yuzden bu cevap BEKLE VE TEKRAR DENE demek.
  * fill basarili:              "<n> blocks filled"
  * testforblock basarili:      "Successfully found the block at ..."
  * ayni tickingarea ikinci kez: "already exists" -- listeye bakilip
    zaten varsa eklenmiyor.

Arena kurulunca dunyaya isaret yaziliyor (simsek_arena.json, icinde
arena.komut'un SHA-256'si). arena.komut degismedikce tekrar kurulmuyor;
degisirse ya da --yeniden verilirse yeniden kuruluyor (fill'ler ayni
yere ayni blogu yazar, zarari yok).
"""
import argparse
import hashlib
import json
import os
import sys
import time

BURASI = os.path.dirname(os.path.abspath(__file__))
# Depoda __pycache__ birakilmasin (kullanicinin klonunda izlenmeyen
# dosya olur; mutasyon denemesinde bayat bayt kodu da kosturdu).
sys.dont_write_bytecode = True
sys.path.insert(0, BURASI)
from konsol import Konsol, sade, calisiyor_mu  # noqa: E402
from sunucu_ayar import ayar_oku  # noqa: E402

KOMUT_DOSYASI = os.path.join(BURASI, "arena.komut")
ISARET = "simsek_arena.json"
YUKLU_DEGIL = "outside of the world"


def komutlar(yol=KOMUT_DOSYASI):
    with open(yol, encoding="utf-8") as f:
        return [s.strip() for s in f if s.strip() and not s.strip().startswith("#")]


def komut_ozeti(yol=KOMUT_DOSYASI):
    with open(yol, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def cevap_tamam(komut, cevap):
    """(tamam, tekrar_dene, aciklama)"""
    metin = " | ".join(sade(s) for s in cevap)
    if any(YUKLU_DEGIL in s for s in cevap):
        return False, True, metin
    if not cevap:
        return False, False, "cevap yok"
    hata = any(sade(s).startswith("ERROR") for s in cevap)
    ad = komut.split()[0]
    if ad == "fill":
        return ("blocks filled" in metin) and not hata, False, metin
    if ad == "testforblock":
        return "Successfully found the block" in metin, False, metin
    return not hata, False, metin


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--hedef", default=os.environ.get("SUNUCU_KOK",
                                                     os.path.expanduser("~/simsek_sunucu")))
    p.add_argument("--yeniden", action="store_true")
    a = p.parse_args()
    kok = os.path.abspath(a.hedef)
    dunya = dict(ayar_oku(os.path.join(kok, "server.properties"))).get("level-name", "Bedrock level")
    isaret = os.path.join(kok, "worlds", dunya, ISARET)
    ozet = komut_ozeti()

    if not a.yeniden and os.path.exists(isaret):
        try:
            with open(isaret, encoding="utf-8") as f:
                if json.load(f).get("komut_sha256") == ozet:
                    print("arena: zaten kurulu (arena.komut degismedi)")
                    return 0
        except (ValueError, OSError):
            pass
    if calisiyor_mu(kok):
        print("HATA: sunucu su an calisiyor; once konsolda stop. (Ayni klasorde ikinci sunucu acilamaz.)")
        return 1

    liste = komutlar()
    with Konsol(kok) as k:
        if not k.bekle("Server started.", 120):
            print("HATA: sunucu 120 sn icinde acilmadi")
            return 1
        var_olan = " ".join(k.komut("tickingarea list", sure=5))
        for komut in liste:
            parca = komut.split()
            if parca[:2] == ["tickingarea", "add"] and len(parca) >= 9 and parca[8] in var_olan:
                print("  = %s (zaten var)" % komut)
                continue
            for deneme in range(40):
                tamam, tekrar, aciklama = cevap_tamam(komut, k.komut(komut, sure=8))
                if tamam or not tekrar:
                    break
                time.sleep(0.5)
            if not tamam:
                print("  X %s\n      %s" % (komut, aciklama[:200]))
                print("HATA: arena kurulamadi, isaret yazilmadi.")
                return 1
            print("  + %s%s" % (komut, "" if deneme == 0 else "  (%d. denemede)" % (deneme + 1)))

    os.makedirs(os.path.dirname(isaret), exist_ok=True)
    with open(isaret, "w", encoding="utf-8") as f:
        json.dump({"komut_sha256": ozet, "komut_sayisi": len(liste),
                   "tarih": time.strftime("%Y-%m-%d %H:%M:%S")}, f, indent=2)
    print("arena: kuruldu (%d komut, hepsi dogrulandi)" % len(liste))
    return 0


if __name__ == "__main__":
    sys.exit(main())
