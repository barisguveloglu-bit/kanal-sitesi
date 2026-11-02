# -*- coding: utf-8 -*-
"""HAREKET DENETIMI -- senaryodaki hareket robotik mi?            v7.99.16

Kullanici (2026-11-02): "Yuruyusler her sey falan robotik olmayacak degil
mi, bunlari ayrica denetle." Akici katman (arac/hareket.py, "akici": true)
ayarlari dogru kullanilmazsa ya da yeni bir olay onu atlarsa hareket yine
robotik olur; ayar acik diye guvenilmez, OLCULUR.

Blender gerekmiyor: blender_film.zaman_cizelgesi her oyuncunun kare kare
kok kaydini verir (x, y, z, aci). Olculenler (yalniz iki kare ust uste
GORUNUR iken; gizle/goster ile oyuncu degisimi sayilmaz):

  ani_kalkis   yatay ivme > IVME_SINIR (blok/sn^2). Akici yurume 9 ile
               kalkar, 7 ile durur; eskisi tek karede 0 -> 4,3 (129).
  ani_donus    acisal ivme > DONUS_IVME_SINIR (derece/sn^2) ya da hiz >
               DONUS_HIZ_SINIR. Akici donus en cok 2600 ve 720.
  isinlanma    tek karede > ISIN_SINIR blok yatay kayma.
  kayma        yatayda hareket var ama yurume (mesafe) ilerlemiyor: ayak
               yerinde, govde kayiyor (havada -- zipla -- sayilmaz).

Kullanim:
    python3 arac/hareket_denetim.py film/bolum2_p1_*.json
Cikis kodu: bulgu varsa 1.
"""
import json
import math
import os
import sys

sys.dont_write_bytecode = True
BURASI = os.path.dirname(os.path.abspath(__file__))
if BURASI not in sys.path:
    sys.path.insert(0, BURASI)

import blender_film as F  # noqa: E402
import bedrock_onizleme as B  # noqa: E402
import hareket as H  # noqa: E402

# sinirlar akici katmanin kendi sabitlerinden: biraz pay (kare olcumu,
# yay tasmasi), ama eskisi gibi tek karelik sicramayi kesin yakalar
IVME_SINIR = max(H.YURU_IVME, H.YURU_FREN) * 2.0          # 18 blok/sn^2
DONUS_IVME_SINIR = H.DONUS_IVME * 1.6                     # ~4160 derece/sn^2
DONUS_HIZ_SINIR = H.DONUS_AZAMI * 1.1                     # ~790 derece/sn
ISIN_SINIR = 0.5                                          # blok / kare
# Zipladiktan sonra inis: yatay hiz surtunmeyle soner (~0,5 blok kayma,
# hareket.INIS_KAYMA_TAU). 4,5 blok/sn'yi yarim blokta durdurmak ortalama
# 20 blok/sn^2 ister; iniste bu kadari fiziktir. Sinir yalniz inisten sonraki
# INIS_SURE icinde gevser; tek karede durma (eskisi 97) yine yakalanir.
INIS_IVME_SINIR = 1.25 * (4.5 / H.INIS_KAYMA_TAU)          # ~47 blok/sn^2
INIS_SURE = 0.5
KAYMA_ORAN = 0.35          # yatay yolun en az bu kadari adimla karsilanmali


def _aci_fark(a, b):
    return (b - a + 180.0) % 360.0 - 180.0


def oyuncu_olc(kayit, fps, havada=None):
    """Bir oyuncunun kaydindan bulgular: {tur: [(t, deger), ...]}, ozet."""
    dt = 1.0 / fps
    bulgu = {"ani_kalkis": [], "ani_donus": [], "isinlanma": [], "kayma": []}
    ozet = {"azami_ivme": 0.0, "azami_donus_ivme": 0.0, "azami_donus_hiz": 0.0, "yol": 0.0}
    gor = [k.get("gorunur", True) for k in kayit]
    v_onceki = None
    w_onceki = None
    inis_t = -99.0
    kay_yol, kay_adim, kay_bas = 0.0, 0.0, None
    for i in range(1, len(kayit)):
        a, b = kayit[i - 1], kayit[i]
        if not (gor[i - 1] and gor[i]):
            v_onceki = w_onceki = None
            continue
        dx, dy = b["x"] - a["x"], b["y"] - a["y"]
        d = math.hypot(dx, dy)
        ozet["yol"] += d
        if d > ISIN_SINIR:
            bulgu["isinlanma"].append((round(b["t"], 3), round(d, 3)))
            v_onceki = w_onceki = None
            continue
        v = (dx / dt, dy / dt)
        w = _aci_fark(a["aci"], b["aci"]) / dt
        hava = havada is not None and (havada(a) or havada(b))
        if havada is not None and havada(a) and not havada(b):
            inis_t = b["t"]
        sinir = INIS_IVME_SINIR if b["t"] - inis_t <= INIS_SURE else IVME_SINIR
        # kalkis: yerden havaya gecen karede yatay hiz sicramamali (durdugu
        # yerden firlamak robotik; yururken atlamak surekli)
        kalkis = havada is not None and not havada(a) and havada(b)
        if kalkis:
            sinir = INIS_IVME_SINIR
        if v_onceki is not None and (not hava or kalkis):
            acc = math.hypot(v[0] - v_onceki[0], v[1] - v_onceki[1]) / dt
            ozet["azami_ivme"] = max(ozet["azami_ivme"], acc)
            if acc > sinir:
                bulgu["ani_kalkis"].append((round(b["t"], 3), round(acc, 1)))
        if w_onceki is not None:
            al = abs(w - w_onceki) / dt
            ozet["azami_donus_ivme"] = max(ozet["azami_donus_ivme"], al)
            if al > DONUS_IVME_SINIR:
                bulgu["ani_donus"].append((round(b["t"], 3), round(al)))
        ozet["azami_donus_hiz"] = max(ozet["azami_donus_hiz"], abs(w))
        if abs(w) > DONUS_HIZ_SINIR:
            bulgu["ani_donus"].append((round(b["t"], 3), round(abs(w))))
        # kayma: hareketli araliklarda adim (mesafe) yatay yolu karsilamali
        adim = abs(b.get("mesafe", 0.0) - a.get("mesafe", 0.0))
        if d > 0.004 and not hava:
            if kay_bas is None:
                kay_bas = b["t"]
            kay_yol += d
            kay_adim += adim
        else:
            if kay_bas is not None and kay_yol > 0.3 and kay_adim < KAYMA_ORAN * kay_yol:
                bulgu["kayma"].append((round(kay_bas, 3), round(kay_yol, 2)))
            kay_yol, kay_adim, kay_bas = 0.0, 0.0, None
        v_onceki, w_onceki = v, w
    if kay_bas is not None and kay_yol > 0.3 and kay_adim < KAYMA_ORAN * kay_yol:
        bulgu["kayma"].append((round(kay_bas, 3), round(kay_yol, 2)))
    for k in ozet:
        ozet[k] = round(ozet[k], 2)
    return bulgu, ozet


def senaryo_denetle(yol):
    sen = json.load(open(yol))
    fps = sen.get("fps", 24)
    aktorler, _kam, _harita, _ef = F.zaman_cizelgesi(sen, B.oku(F.HAREKET)["setler"],
                                                    F.film_pozlari(bool(sen.get("akici"))))
    sonuc = {"senaryo": os.path.basename(yol), "akici": bool(sen.get("akici")), "oyuncular": {}}
    for ad, a in aktorler.items():
        # zipla ucusu: kok z'si zeminden belirgin yuksekte (yercekimi egrisi
        # yatay hizi sabit tutar, ivme olcumu disarida)
        zemin = min(k["z"] for k in a.kayit) if a.kayit else 0.0
        zs = sorted(k["z"] for k in a.kayit)
        zemin = zs[len(zs) // 2] if zs else 0.0

        def havada(k, zemin=zemin):
            return k["z"] - zemin > 0.15 and abs(k["z"] - zemin) < 6.0
        bulgu, ozet = oyuncu_olc(a.kayit, fps, havada)
        sonuc["oyuncular"][ad] = {"bulgu": bulgu, "ozet": ozet}
    return sonuc


def main(argv):
    toplam = 0
    for yol in argv:
        s = senaryo_denetle(yol)
        print("== %s (akici: %s)" % (s["senaryo"], "evet" if s["akici"] else "HAYIR"))
        if not s["akici"]:
            toplam += 1
        for ad, o in s["oyuncular"].items():
            n = sum(len(v) for v in o["bulgu"].values())
            toplam += n
            oz = o["ozet"]
            print("   %-4s yol %5.1f blok | azami ivme %5.1f | donus hizi %5.0f, ivmesi %6.0f | %s" % (
                ad, oz["yol"], oz["azami_ivme"], oz["azami_donus_hiz"], oz["azami_donus_ivme"],
                "temiz" if n == 0 else "BULGU %d" % n))
            for tur, lst in o["bulgu"].items():
                for t, deger in lst[:6]:
                    print("        %-11s t=%6.2f  %s" % (tur, t, deger))
    print("TOPLAM BULGU:", toplam)
    return 1 if toplam else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
