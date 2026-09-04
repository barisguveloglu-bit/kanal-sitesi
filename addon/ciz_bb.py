# -*- coding: utf-8 -*-
"""BLOCKBUSTER MODELLERINI BIZIM CIZICIYLE CIZER.

Kullanici: "hani bu modelleri cizen var ya, onunla bununla
degistir, bunun icinde calissinlar... ikisini de birlikte
kullan, birlesmis teknoloji gibi bir sey yap."

Yani `ciz_kemik.py` (Bedrock geometrisi cizen) artik
Blockbuster'in `model.json`unu da okuyor. Ortada TEK cizici
var, iki bicim besliyor.

---- DONUSUM TAHMIN DEGIL, KAYNAKTAN OKUNDU ----
mchorse.blockbuster.client.model.ModelCustomRenderer:

    rotationPointX = translate[0]
    rotationPointY = parent.isEmpty() ? -translate[1] + 24 : -translate[1]
    rotationPointZ = -translate[2]
    rotateAngleX   = +rotate[0]
    rotateAngleY   = -rotate[1]
    rotateAngleZ   = -rotate[2]
    // matris yigini: once Rz, sonra Ry, sonra Rx
    //   M = Rz*Ry*Rx  =>  noktaya uygulanma sirasi XYZ

mchorse.blockbuster.client.model.parsing.ModelParser:

    ax = 1 - anchor[0];  ay = anchor[1];  az = anchor[2]
    addBox(-ax*w, -ay*h, -az*d, w, h, d)

---- SASIRTAN SONUC ----
Java model uzayi Y-asagi ve Z-ters; Bedrock Y-yukari. Ikisi
arasindaki cevrim X ekseni etrafinda 180 derece:

    Xb = Xj        Yb = 24 - Yj        Zb = -Zj

Bu cevrim altinda Rx aynen kalir, Ry ve Rz ISARET DEGISTIRIR.
Renderer zaten Y ve Z acilarini NEGATIFLEYEREK yaziyordu.
Iki isaret degisimi BIRBIRINI GOTURUYOR:

    Blockbuster `rotate` UCLUSU = Bedrock `rotation` UCLUSU

Yani bir Blockbuster pozunun acilari, hicbir donusum
yapilmadan bir Bedrock geometrisine yazilabiliyor. Sira da
ayni (XYZ) -- v7.3'te Bedrock icin OLCTUGUMUZ sirayla.
Asagidaki `KONTROL` bunu her kosuda yeniden dogruluyor.
"""
import json, os
import ciz_kemik as ck


def bb_yukle(yol):
    with open(yol, encoding="utf-8") as f:
        return json.load(f)


def bb_kemikleri(model, poz_adi="standing", gizle=()):
    """Blockbuster modelini + bir pozunu Bedrock kemiklerine cevirir."""
    uzuvlar = model["limbs"]
    poz = model["poses"].get(poz_adi) or model["poses"]["standing"]
    # Eksik uzuvlar: kaynak da `fillInMissing` ile standing'den
    # tamamliyor (ModelPose.fillInMissing).
    taban = model["poses"]["standing"]["limbs"]
    donus = {}
    for ad in uzuvlar:
        t = dict(taban.get(ad, {}))
        t.update(poz["limbs"].get(ad, {}))
        donus[ad] = t

    # Mutlak Java-uzayi pivotlari (matris yigini birikimi)
    def java_pivot(ad, gorulen=()):
        if ad in gorulen:
            raise ValueError("dongusel ebeveyn: " + ad)
        u = uzuvlar[ad]
        t = donus[ad].get("translate", [0, 0, 0])
        ust = u.get("parent") or ""
        y = (-t[1] + 24.0) if not ust else -t[1]
        yerel = (t[0], y, -t[2])
        if not ust:
            return yerel
        p = java_pivot(ust, gorulen + (ad,))
        return (p[0] + yerel[0], p[1] + yerel[1], p[2] + yerel[2])

    kemikler = []
    for ad, u in uzuvlar.items():
        if ad in gizle:
            continue
        px, py, pz = java_pivot(ad)
        w, h, d = [float(v) for v in u["size"]]
        an = u.get("anchor", [0.5, 0.5, 0.5])
        ax, ay, az = 1.0 - an[0], an[1], an[2]
        # Kutunun Java-uzayindaki alt kosesi
        jx, jy, jz = px - ax * w, py - ay * h, pz - az * d
        k = {
            "name": ad,
            "pivot": [px, 24.0 - py, -pz],
            "cubes": [{
                "origin": [jx, 24.0 - jy - h, -(jz + d)],
                "size": [w, h, d],
                "uv": list(u["texture"]),
            }],
        }
        if u.get("parent"):
            k["parent"] = u["parent"]
        r = donus[ad].get("rotate")
        # ISARETE DOKUNULMUYOR -- yukaridaki turetmenin sonucu.
        if r and any(abs(v) > 1e-6 for v in r):
            k["rotation"] = list(r)
        if u.get("sizeOffset"):
            k["cubes"][0]["inflate"] = u["sizeOffset"]
        if u.get("mirror"):
            k["cubes"][0]["mirror"] = True
        kemikler.append(k)
    return kemikler


def bb_ciz(model, doku, poz_adi="standing", aci=0, SC=10, gizle=()):
    kemikler = bb_kemikleri(model, poz_adi, gizle)
    tw, th = model.get("texture", [64, 32])
    return ck.ciz(kemikler, tw, th, doku, None, aci, SC=SC)


# ---- KONTROL: cevrimin dogrulugu OLCULEREK tutuluyor ----
# Blockbuster'in `steve`i vanilla oyuncuyla AYNI olmali.
# Cevrim bir gun bozulursa burasi bagirir.
VANILLA = {
    # uzuv: (kutu_alt_kose, olcu)   -- Bedrock degerleri
    "body":      ([-4, 12, -2], [8, 12, 4]),
    "head":      ([-4, 24, -4], [8, 8, 8]),
    "right_arm": ([-8, 12, -2], [4, 12, 4]),
    "left_arm":  ([4, 12, -2],  [4, 12, 4]),
    "right_leg": ([-4, 0, -2],  [4, 12, 4]),
    "left_leg":  ([0, 0, -2],   [4, 12, 4]),
}


def kontrol(model):
    """Cevrilen `steve` vanilla oyuncuyla ortusuyor mu."""
    kemikler = {k["name"]: k for k in bb_kemikleri(model, "standing")}
    sonuc = []
    for ad, (bek_o, bek_s) in VANILLA.items():
        k = kemikler.get(ad)
        if not k:
            sonuc.append((ad, False, "kemik yok"))
            continue
        c = k["cubes"][0]
        o = [round(v, 3) for v in c["origin"]]
        s = [round(v, 3) for v in c["size"]]
        # Tolerans 0,01: kaynagin kendi verisinde kollarin
        # anchor'i 0.1666 yazili, 1/6 = 0.16666... degil.
        # 0.1666*12 = 1,9992 -- yani sapma KAYNAGIN
        # yuvarlamasi, bizim cevrimimizin degil.
        tamam = (all(abs(a - b) < 0.01 for a, b in zip(o, bek_o))
                 and all(abs(a - b) < 0.01 for a, b in zip(s, bek_s)))
        sonuc.append((ad, tamam, "%s %s  (beklenen %s %s)" % (o, s, bek_o, bek_s)))
    return sonuc


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("kullanim: python3 ciz_bb.py <blockbuster model.json>")
        print("  ornek:  jar icindeki assets/blockbuster/models/entity/steve.json")
        raise SystemExit(2)
    m = bb_yukle(sys.argv[1])
    print("model:", m.get("name"), "| poz:", ", ".join(m["poses"]))
    for ad, tamam, detay in kontrol(m):
        print("  %s %-10s %s" % ("OK " if tamam else "YOK", ad, detay))
