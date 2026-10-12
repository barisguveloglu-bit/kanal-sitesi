"""Zemin denetimi: aktor bastigi zeminde mi, yatan beden yerde mi.   v7.99.14

Kullanici Part 2'yi izleyince (2026-10-12): "yerde yatarken havada
yatiyormus gibi gordum" ve "yavas yavas yuruyup yere yatiyor ya, o zaman
ucuyormus gibi oluyor; azicik daha yurusun, orada oyle yatsin".
Olculdu, UC ayri sebep cikti:
  1. POZ: yuzustu'da kafa 30 derece yana donuktu, 8 px kafa kupunun
     kosesi govdeyi 3,46 px kaldiriyordu; bayil'da govde sol kolun
     ustundeydi, duz zeminde bile 4,2 px havada (film_poz.py).
  2. ZEMIN: aktorler hep z = 0'da duruyordu; cukurun ustunden zemin
     hizasinda yurudu (Part 2'de Baris 314 kare, 0,16-0,35 blok havada)
     (blender_film.zemin_yuksekligi).
  3. YER: Baris cukurun halkasina bayiliyordu (bacaklarin alt yuzunun
     yarisi bosta), El-Harkos'un kafasi Baris'in ayaklarinin 0,165 blok
     icine dusuyordu (senaryo).
Bu modul ucunu de Blender'siz olcer; test/zemin.mjs kilitler.

    python3 arac/zemin_denetim.py film/bolum1_orman.json
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bedrock_onizleme as B  # noqa: E402
import blender_film as F  # noqa: E402
import film_poz as FP  # noqa: E402

YATIS = ("yuzustu", "bayil")      # yere yatan pozlar (son hali yere oturur)
ANA = ("head", "body", "rightLeg", "leftLeg")
DESTEK_ESIK = 0.9                 # ana parcanin alt yuzunun en az %90'i zeminde
ARA_ESIK = 0.45                   # yatan beden ile ayaktaki aktorun koku arasi (blok)
KOPUK_ESIK = 0.01                 # zeminden kopukluk toleransi (blok)
INIS_KARE = 4                     # basamaktan inis yumusamasi bu kadar kare surer

_geo = None
_poz = None


def _hazir():
    global _geo, _poz
    if _geo is None:
        _geo = FP._geo()
        _poz = F.film_pozlari()
    return _geo, _poz


def _kutu_noktalari(m, ad, n=2):
    """Kemigin (ust katman haric) kup noktalari, model uzayi px. n: kenar basina."""
    g = [k / (n - 1) for k in range(n)]
    out = []
    for c in m.kemik[ad].get("cubes", []):
        if c.get("inflate", 0) > 0:
            continue
        o, z = c["origin"], c["size"]
        out += [m.nokta(ad, [-(o[0] + z[0] * u), o[1] + z[1] * v, o[2] + z[2] * w]) for u in g for v in g for w in g]
    return out


def poz_bosluklari(poz, t):
    """Duz zeminde, pozun t anindaki her kemiginin en alt noktasinin yerden yuksekligi (px)."""
    geo, P = _hazir()
    m = B.Model(geo, P[FP.ONEK + poz], t)
    alt = {ad: min(p[1] for p in _kutu_noktalari(m, ad)) for ad in m.kemik if _kutu_noktalari(m, ad)}
    taban = min(alt.values())
    return {ad: round(v - taban, 3) for ad, v in alt.items()}


def _ileri(m):
    """Yatan pozda kafanin model uzayindaki yonu: +1 ya da -1 (model -Z'ye bakar)."""
    bas = _kutu_noktalari(m, "head")
    return 1.0 if sum(p[2] for p in bas) / len(bas) > 0 else -1.0


def _dunya(kok, aci, s, yanal, p):
    on, sg = F.on_yon(aci), F.sag_yon(aci)
    return (kok[0] + sg[0] * yanal * p[0] / 16 + on[0] * s * p[2] / 16,
            kok[1] + sg[1] * yanal * p[0] / 16 + on[1] * s * p[2] / 16)


def iz(poz, t, kok, aci, yanal=1.0):
    """Yatan bedenin dunya (x, y) noktalari. yanal: model x isareti, iki
    yonu de olcmek icin (+1/-1) -- ayna sorusu bu denetimi etkilemesin."""
    geo, P = _hazir()
    m = B.Model(geo, P[FP.ONEK + poz], t)
    s = _ileri(m)
    return [_dunya(kok, aci, s, yanal, p) for ad in m.kemik for p in _kutu_noktalari(m, ad)]


def destek_orani(sen, poz, t, kok, aci, z_taban, yanal=1.0, n=6):
    """Ana parcalarin ALT YUZUNUN (en alt noktanin 0,3 px icindeki
    ornekler) altinda tabanla ayni yukseklikte zemin olan orani."""
    geo, P = _hazir()
    ck = sen.get("zemin", {}).get("cukur")
    m = B.Model(geo, P[FP.ONEK + poz], t)
    s = _ileri(m)
    out = {}
    for ad in ANA:
        pts = _kutu_noktalari(m, ad, n)
        alt = min(p[1] for p in pts)
        taban = [p for p in pts if p[1] <= alt + 0.3]
        iyi = 0
        for p in taban:
            x, y = _dunya(kok, aci, s, yanal, p)
            iyi += abs(-F.cukur_derinligi(ck, math.floor(x) + 0.5, math.floor(y) + 0.5) - z_taban) < 0.01
        out[ad] = round(iyi / len(taban), 3)
    return out


def cizelge(sen):
    setler = B.oku(F.HAREKET)["setler"]
    anims = {}
    anims.update(B.oku(F.ANIM_WOM)["animations"])
    anims.update(B.oku(F.ANIM_AKTOR)["animations"])
    anims.update(F.film_pozlari())
    return F.zaman_cizelgesi(sen, setler, anims)[0]


def denetle(sen, aralik=None, ak=None):
    """{"kopuk": [...], "yatis": [...], "aralik": [a, b]} -- kare numaralari Blender'daki gibi 1'den.
    ak: hazir zaman cizelgesi (yoksa kurulur; ~45 sn)."""
    ak = ak or cizelge(sen)
    harita = F.zaman_haritasi(sen)
    a0, a1 = aralik or [1, len(harita)]
    P = _hazir()[1]
    kopuk = []
    for ad, a in ak.items():
        inis = -99
        onceki_g = None
        for i, r in enumerate(a.kayit):
            g = F.zemin_yuksekligi(sen, r["x"], r["y"], r["t"])
            if onceki_g is not None and g < onceki_g - 1e-9:
                inis = i
            onceki_g = g
            f = i + 1
            if not (a0 <= f <= a1) or not r.get("gorunur", True):
                continue
            if r.get("eylem") and r["eylem"].get("dikey"):
                continue                        # havada vurus: yerden yuksek olmasi dogru
            fark = r["z"] - g
            if fark < -1e-6 or (fark > KOPUK_ESIK and i - inis > INIS_KARE):
                kopuk.append([ad, f, round(fark, 3)])
    yatis = []
    for o in sorted(sen.get("olaylar", []), key=lambda o: o["t"]):
        if o.get("poz") not in YATIS or "aktor" not in o:
            continue
        uz = P[FP.ONEK + o["poz"]]["animation_length"]
        t_son = o["t"] + uz / float(o.get("hiz", 1.0))
        f = F.kare_bul(harita, t_son)
        if not (a0 <= f + 1 <= a1):
            continue
        ad = o["aktor"]
        r = ak[ad].kayit[f]
        taban = r["z"]
        destek = min(min(destek_orani(sen, o["poz"], uz, (r["x"], r["y"]), r["aci"], taban, y).values())
                     for y in (1.0, -1.0))
        noktalar = iz(o["poz"], uz, (r["x"], r["y"]), r["aci"], 1.0) + iz(o["poz"], uz, (r["x"], r["y"]), r["aci"], -1.0)
        en_yakin, kim = 99.0, None
        for ad2, a2 in ak.items():
            if ad2 == ad:
                continue
            for j in range(f, min(len(a2.kayit), f + int(1.5 * sen.get("fps", 24)))):
                r2 = a2.kayit[j]
                if not r2.get("gorunur", True) or any(rr.get("ad") in YATIS + ("dus",) for rr in r2["tepki"]):
                    continue
                d = min(math.hypot(x - r2["x"], y - r2["y"]) for x, y in noktalar)
                if d < en_yakin:
                    en_yakin, kim = d, ad2
        yatis.append({"aktor": ad, "poz": o["poz"], "t": o["t"], "kare": f + 1, "konum": [round(r["x"], 3), round(r["y"], 3)],
                      "destek": destek, "en_yakin": round(en_yakin, 3), "kim": kim})
    return {"kopuk": kopuk, "yatis": yatis, "aralik": [a0, a1]}


if __name__ == "__main__":
    sen = B.oku(os.path.abspath(sys.argv[1]))
    ar = None
    if len(sys.argv) > 2:
        ar = sen["parcalar"][sys.argv[2]] if sys.argv[2] in sen.get("parcalar", {}) else [int(x) for x in sys.argv[2].split("-")]
    print(json.dumps(denetle(sen, ar), ensure_ascii=False))
