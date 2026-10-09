"""Film icin kendi poz animasyonlarimiz (Bedrock bicimi).        v7.99.10

1. bolumun hikayesi Epic Fight'ta olmayan hareketler istiyor: yere dusup
yatmak, comelip topraga dokunmak, etrafa bakmak, kagida bakmak, sendelemek,
diz cokmek, yuzustu dusmek, govdeyi tutarak yurumek, bayilmak.
Bunlar burada YAZILIYOR (uydurulmus bir dis dosya yok) ve
blender_film.py "poz" olayiyla oynatiyor.

Kurallar (bedrock_onizleme.Model ile olculdu, v7.99.10):
  * kol X -90  -> one kalkar          * kok X -90 -> sirtustu
  * kok X +90  -> yuzustu             * kafa Y +45 -> karakterin sagina
  * kafa X +30 -> asagi bakar
Yere degen pozlar ZEMINE OTURTULUR: her anahtar karede modelin en alt
noktasi olculup kok o kadar kaldirilir/indirilir (dizsiz bacak + tek
kutu govde; elle yazilan yukseklik hep yanlis cikiyordu).
Bir eli bir noktaya goturen pozlar (govdeyi tutmak) kol acisini
ARAYARAK buluyor: hedef nokta + aci izgarasi, en yakin cozum.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bedrock_onizleme as B  # noqa: E402

GEO = "Simsek_Kol_Kaynak/models/entity/aktor.geo.json"
ONEK = "animation.film."
SAG_YUMRUK = [6.0, 13.3, 0.5]      # ic uzay
SOL_YUMRUK = [-6.0, 13.3, 0.5]


def _geo():
    return B.oku(GEO)


def en_alt(geo, anim, t):
    """Modelin (ust katman haric) en alt noktasi, px."""
    m = B.Model(geo, anim, t)
    y = 1e9
    for ad, b in m.kemik.items():
        for c in b.get("cubes", []):
            if c.get("inflate", 0) > 0:
                continue
            o, z = c["origin"], c["size"]
            for a in (0, 1):
                for bb in (0, 1):
                    for d in (0, 1):
                        p = m.nokta(ad, [-(o[0] + z[0] * a), o[1] + z[1] * bb, o[2] + z[2] * d])
                        y = min(y, p[1])
    return y


def zemine_oturt(geo, anim, zamanlar):
    """Verilen anlarda kok Y'sini, en alt nokta tam zemine degecek sekilde yazar."""
    kok = anim["bones"].setdefault("root", {})
    eski = kok.get("position", {"0.0": [0, 0, 0]})
    yeni = {}
    for t in zamanlar:
        p = B.deger(eski, t)
        dene = {"bones": dict(anim["bones"], root=dict(kok, position={"0.0": [p[0], 0.0, p[2]]}))}
        yeni["%.3f" % t] = [p[0], round(-en_alt(geo, dene, t), 3), p[2]]
    kok["position"] = yeni


def kol_ara(geo, kemik, yumruk, hedef, taban=None):
    """Yumrugu `hedef` noktasina (ic uzay, px) en yakin goturen kol acisi.
    Kaba izgara (15 derece), sonra iki kez inceltme (5, 1.5 derece)."""
    bones0 = dict((taban or {}).get("bones", {}))

    def uzak(r):
        b = dict(bones0)
        b[kemik] = {"rotation": list(r)}
        return math.dist(B.Model(geo, {"bones": b}, 0).nokta(kemik, yumruk[:]), hedef)
    en = min(((uzak((x, y, z)), (x, y, z)) for x in range(-180, 181, 15)
              for y in range(-90, 91, 15) for z in range(-90, 91, 15)))
    for adim in (5.0, 1.5):
        x0, y0, z0 = en[1]
        en = min(((uzak((x0 + i * adim, y0 + j * adim, z0 + k * adim)),
                   (x0 + i * adim, y0 + j * adim, z0 + k * adim))
                  for i in range(-3, 4) for j in range(-3, 4) for k in range(-3, 4)))
    return [round(v, 1) for v in en[1]], en[0]


def _a(uzun, kemikler, dongu=False):
    return {"animation_length": uzun, "loop": True if dongu else "hold_on_last_frame",
            "bones": kemikler}


def pozlar():
    geo = _geo()
    P = {}

    # ---- dus: arkaya devrilip sirtustu yere yatar (1. sahne son darbe) ----
    P["dus"] = _a(0.7, {
        "root": {"rotation": {"0.0": [0, 0, 0], "0.25": [-35, 0, 0], "0.55": [-90, 0, 0], "0.7": [-90, 0, 0]}},
        "rightArm": {"rotation": {"0.0": [0, 0, 0], "0.3": [-150, 0, 20], "0.55": [-170, 0, 25], "0.7": [-175, 0, 30]}},
        "leftArm": {"rotation": {"0.0": [0, 0, 0], "0.3": [-140, 0, -20], "0.55": [-165, 0, -25], "0.7": [-170, 0, -30]}},
        "head": {"rotation": {"0.0": [0, 0, 0], "0.3": [-25, 0, 0], "0.55": [10, 0, 0], "0.7": [0, 12, 0]}},
        "rightLeg": {"rotation": {"0.0": [0, 0, 0], "0.55": [-8, 0, 6], "0.7": [-5, 0, 8]}},
        "leftLeg": {"rotation": {"0.0": [0, 0, 0], "0.55": [6, 0, -6], "0.7": [4, 0, -8]}},
    })
    zemine_oturt(geo, P["dus"], [0.0, 0.1, 0.25, 0.4, 0.55, 0.7])

    # ---- comel_dokun: diz coker, one egilir, sag eliyle topraga dokunur ----
    # (Dizsiz bacakla ayakta comelmek yere yetismiyordu: el 5 px havada.)
    comel = {"rightLeg": {"rotation": {"0.0": [0, 0, 0], "0.5": [90, 0, 3], "1.6": [90, 0, 3]}},
             "leftLeg": {"rotation": {"0.0": [0, 0, 0], "0.5": [90, 0, -3], "1.6": [90, 0, -3]}},
             "waist": {"rotation": {"0.0": [0, 0, 0], "0.5": [38, 0, 0], "1.6": [38, 0, 0]}},
             "head": {"rotation": {"0.0": [0, 0, 0], "0.5": [20, 0, 0], "1.6": [20, 0, 0]}},
             "leftArm": {"rotation": {"0.0": [0, 0, 0], "0.5": [-25, 0, -12], "1.6": [-25, 0, -12]}}}
    P["comel_dokun"] = _a(1.6, comel)
    zemine_oturt(geo, P["comel_dokun"], [0.0, 0.15, 0.3, 0.5, 1.6])
    durus = {"bones": {k: {kk: B.deger(vv, 0.5) if isinstance(vv, dict) else vv for kk, vv in v.items()}
                       for k, v in P["comel_dokun"]["bones"].items()}}
    m = B.Model(geo, durus, 0)
    omz = m.nokta("rightArm", [5.0, 22.0, 0.0])
    hedef = [omz[0] + 0.5, 2.0, omz[2] - 5.0]          # omzun onunde, yerden 2 px (yumruk yarisi)
    kol, hata = kol_ara(geo, "rightArm", SAG_YUMRUK, hedef, durus)
    P["comel_dokun"]["bones"]["rightArm"] = {"rotation": {"0.0": [0, 0, 0], "0.5": [-40, 0, 0],
                                                          "0.9": kol, "1.6": kol}}
    P["comel_dokun"]["_cozum"] = {"sag_el_yer_hatasi_px": round(hata, 2)}

    # ---- etrafa_bak: kafa ve gövde saga-sola ----
    P["etrafa_bak"] = _a(2.4, {
        "head": {"rotation": {"0.0": [0, 0, 0], "0.5": [0, -55, 0], "1.0": [-5, -55, 0],
                              "1.5": [0, 50, 0], "2.0": [-5, 55, 0], "2.4": [0, 10, 0]}},
        "waist": {"rotation": {"0.0": [0, 0, 0], "0.5": [0, -20, 0], "1.5": [0, 18, 0], "2.4": [0, 0, 0]}},
    })

    # ---- kagit: sol elde kagit yuzune kaldirir, kafa egik bakar ----
    P["kagit"] = _a(2.0, {
        "leftArm": {"rotation": {"0.0": [0, 0, 0], "0.4": [-80, 28, 0], "1.6": [-80, 28, 0], "2.0": [-60, 20, 0]}},
        "head": {"rotation": {"0.0": [0, 0, 0], "0.4": [18, -8, 0], "1.6": [18, -8, 0], "2.0": [10, 0, 0]}},
    })

    # ---- sendele: geri sendeler, kollar dengeye acilir ----
    P["sendele"] = _a(0.6, {
        "waist": {"rotation": {"0.0": [0, 0, 0], "0.2": [-18, 0, 4], "0.6": [0, 0, 0]}},
        "rightArm": {"rotation": {"0.0": [0, 0, 0], "0.2": [-20, 0, 45], "0.6": [0, 0, 0]}},
        "leftArm": {"rotation": {"0.0": [0, 0, 0], "0.2": [-20, 0, -45], "0.6": [0, 0, 0]}},
        "head": {"rotation": {"0.0": [0, 0, 0], "0.2": [-15, 0, 0], "0.6": [0, 0, 0]}},
    })

    # ---- diz_cok: iki dizinin ustune coker (El-Harkos'un sonu) ----
    P["diz_cok"] = _a(0.6, {
        "rightLeg": {"rotation": {"0.0": [0, 0, 0], "0.6": [90, 0, 0]}},
        "leftLeg": {"rotation": {"0.0": [0, 0, 0], "0.6": [90, 0, 0]}},
        "waist": {"rotation": {"0.0": [0, 0, 0], "0.6": [12, 0, 0]}},
        "head": {"rotation": {"0.0": [0, 0, 0], "0.6": [10, 0, 0]}},
        "rightArm": {"rotation": {"0.0": [0, 0, 0], "0.6": [-10, 0, 8]}},
        "leftArm": {"rotation": {"0.0": [0, 0, 0], "0.6": [-10, 0, -8]}},
    })
    zemine_oturt(geo, P["diz_cok"], [0.0, 0.2, 0.4, 0.6])

    # ---- yuzustu: diz cokmusken one devrilir ----
    P["yuzustu"] = _a(0.8, {
        "root": {"rotation": {"0.0": [0, 0, 0], "0.5": [60, 0, 0], "0.8": [90, 0, 0]}},
        "rightLeg": {"rotation": {"0.0": [90, 0, 0], "0.8": [0, 0, 4]}},
        "leftLeg": {"rotation": {"0.0": [90, 0, 0], "0.8": [0, 0, -4]}},
        "waist": {"rotation": {"0.0": [12, 0, 0], "0.8": [0, 0, 0]}},
        "head": {"rotation": {"0.0": [10, 0, 0], "0.8": [0, 30, 0]}},
        "rightArm": {"rotation": {"0.0": [-10, 0, 8], "0.8": [0, 0, 15]}},
        "leftArm": {"rotation": {"0.0": [-10, 0, -8], "0.8": [0, 0, -15]}},
    })
    zemine_oturt(geo, P["yuzustu"], [0.0, 0.2, 0.35, 0.5, 0.65, 0.8])

    # ---- govde_tut: sol el karnin sagini tutar, hafif kambur (yaralı yuruyus katmani) ----
    tut = {"bones": {"waist": {"rotation": [14, 0, 0]}, "head": {"rotation": [8, 0, 0]}}}
    m = B.Model(geo, tut, 0)
    hedef = m.nokta("body", [1.5, 15.0, -2.6])            # karnin sag-on yuzu
    kol, hata = kol_ara(geo, "leftArm", SOL_YUMRUK, hedef, tut)
    P["govde_tut"] = _a(1.0, {"waist": {"rotation": [14, 0, 0]}, "head": {"rotation": [8, 0, 0]},
                              "leftArm": {"rotation": kol}}, dongu=True)
    P["govde_tut"]["_cozum"] = {"sol_el_karin_hatasi_px": round(hata, 2)}

    # ---- bayil: yurumeden dizleri bosalip one-yana yigilir ----
    P["bayil"] = _a(1.0, {
        "root": {"rotation": {"0.0": [0, 0, 0], "0.35": [15, 0, 0], "0.75": [80, 0, 18], "1.0": [90, 0, 22]}},
        "waist": {"rotation": {"0.0": [14, 0, 0], "0.35": [25, 0, 0], "1.0": [0, 0, 0]}},
        "rightLeg": {"rotation": {"0.0": [0, 0, 0], "0.35": [-25, 0, 0], "1.0": [-6, 0, 6]}},
        "leftLeg": {"rotation": {"0.0": [0, 0, 0], "0.35": [20, 0, 0], "1.0": [5, 0, -4]}},
        "rightArm": {"rotation": {"0.0": [0, 0, 0], "0.5": [-40, 0, 20], "1.0": [-160, 0, 20]}},
        "leftArm": {"rotation": {"0.0": kol, "0.5": [-30, 0, -10], "1.0": [-10, 0, -20]}},
        "head": {"rotation": {"0.0": [8, 0, 0], "1.0": [0, -40, 0]}},
    })
    zemine_oturt(geo, P["bayil"], [0.0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0])

    return {ONEK + k: v for k, v in P.items()}


if __name__ == "__main__":
    print(json.dumps(pozlar(), indent=1)[:3000])
