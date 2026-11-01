# -*- coding: utf-8 -*-
"""Olculen koyden EVLERI ayikla -> arac/yapilar/koy_evleri.json.   v7.99.16

    python3 addon/arac/koy_evleri.py <yapi_olc ciktisi.json> [--cikti ...]

yapi_olc.py bir koyun butun yapi bloklarini okur (yollar, tarlalar,
agaclar dahil). Burada evler birbirinden ayrilir:
  * yapi bloklari 26 komsulukla birlesik parcalara bolunur; yol, tarla,
    ekin, su ve kutuk bu birlesmeye katilmaz (yol evleri birbirine
    baglardi, kutuk agaclari eve yapistirirdi);
  * kapisi olan ve en az EN_AZ blok tutan parca bir evdir; kutukler
    yalniz o evin kutusunun icindeyse eve eklenir;
  * evin kapisinin disari baktigi yon (kapi_yonu) evin merkezinden
    kapiya giden yonden bulunur -- hanedan.py evi kapisi meydana bakacak
    sekilde dondurur.
Bloklar oldugu gibi kalir (tur ve durum); yalniz koordinatlar evin kendi
kosesine tasinir.
"""
import argparse
import collections
import json
import os
import sys

BURASI = os.path.dirname(os.path.abspath(__file__))
EN_AZ = 40
BAGLAMAZ = {"dirt_path", "grass_path", "farmland", "wheat", "carrots", "potatoes", "beetroot", "water",
            "flowing_water", "oak_log", "spruce_log", "birch_log", "hay_block", "pumpkin", "melon_block",
            "composter", "short_grass", "tall_grass", "dandelion", "poppy"}
KAPILAR = ("_door",)


def ayikla(veri):
    yapi = veri["yapilar"][0]
    bloklar = {}
    for b in yapi["bloklar"]:
        t = b["t"].replace("minecraft:", "")
        bloklar[(b["x"], b["y"], b["z"])] = {"t": t, "s": {k.replace("minecraft:", "") if k.startswith(
            "minecraft:connection") or k == "minecraft:vertical_half" else k: v
            for k, v in b["s"].items() if k not in ("update_bit",)}}
    cekirdek = {p for p, b in bloklar.items() if b["t"] not in BAGLAMAZ}
    gorulen, parcalar = set(), []
    for p in cekirdek:
        if p in gorulen:
            continue
        yigin, parca = [p], []
        gorulen.add(p)
        while yigin:
            q = yigin.pop()
            parca.append(q)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for dz in (-1, 0, 1):
                        r = (q[0] + dx, q[1] + dy, q[2] + dz)
                        if r in cekirdek and r not in gorulen:
                            gorulen.add(r)
                            yigin.append(r)
        parcalar.append(parca)
    evler = []
    for parca in parcalar:
        kapilar = [p for p in parca if bloklar[p]["t"].endswith(KAPILAR)]
        if len(parca) < EN_AZ or not kapilar:
            continue
        xs, ys, zs = [p[0] for p in parca], [p[1] for p in parca], [p[2] for p in parca]
        kutu = (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))
        uyeler = set(parca)
        for p, b in bloklar.items():          # evin icindeki kutukler (direk, kiris)
            if b["t"].endswith("_log") and kutu[0] <= p[0] <= kutu[3] and kutu[1] <= p[1] <= kutu[4] \
                    and kutu[2] <= p[2] <= kutu[5]:
                uyeler.add(p)
        cx, cz = (kutu[0] + kutu[3]) / 2.0, (kutu[2] + kutu[5]) / 2.0
        kx = sum(p[0] for p in kapilar) / len(kapilar) - cx
        kz = sum(p[2] for p in kapilar) / len(kapilar) - cz
        yon = (1 if kx > 0 else -1, 0) if abs(kx) >= abs(kz) else (0, 1 if kz > 0 else -1)
        ev = []
        for p in sorted(uyeler, key=lambda q: (q[1], q[2], q[0])):
            b = bloklar[p]
            e = {"p": [p[0] - kutu[0], p[1] - kutu[1], p[2] - kutu[2]], "t": b["t"]}
            if b["s"]:
                e["s"] = b["s"]
            ev.append(e)
        sayim = collections.Counter(b["t"] for b in ev)
        evler.append({"ad": "ev_%dx%dx%d_%d" % (kutu[3] - kutu[0] + 1, kutu[4] - kutu[1] + 1,
                                                kutu[5] - kutu[2] + 1, len(ev)),
                      "kapi_yonu": list(yon), "kaynak_kutu": list(kutu), "blok_sayisi": len(ev),
                      "turler": dict(sayim.most_common(12)), "bloklar": ev})
    evler.sort(key=lambda e: -e["blok_sayisi"])
    return evler


def main():
    p = argparse.ArgumentParser()
    p.add_argument("olcum")
    p.add_argument("--cikti", default=os.path.join(BURASI, "yapilar", "koy_evleri.json"))
    a = p.parse_args()
    veri = json.load(open(a.olcum))
    evler = ayikla(veri)
    json.dump({"kaynak": "arac/yapi_olc.py ile olculen ova koyu (%s, %s); arac/koy_evleri.py ayikladi"
                         % (veri.get("biyom"), veri["yapilar"][0]["konum"]),
               "evler": evler}, open(a.cikti, "w"), indent=0, ensure_ascii=False)
    for e in evler:
        print("%-24s kapi %-8s %s" % (e["ad"], e["kapi_yonu"], list(e["turler"].items())[:5]))
    print("%d ev -> %s" % (len(evler), a.cikti))
    return 0 if evler else 1


if __name__ == "__main__":
    sys.exit(main())
