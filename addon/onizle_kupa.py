# -*- coding: utf-8 -*-
"""KUPALARI CIZER -- her malzeme KENDI DOKUSUYLA.  v7.37

---- NEDEN YAZILDI ----
v7.36'ya kadar kupalarin odunu, ipi ve zinciri OYUNDA kupanin
skiniyle ciziliyordu (bkz. _kupa_odun, malzeme adi kupteydi).
Depodaki cizici bunu gosteremezdi: `ciz_kemik.ciz` dokuyu
KEMIK basina secer, kupanin ise tek kemigi var. Yani hata
ancak tablette, kullanicinin gozuyle goruldu.

Burasi o boslugu kapatiyor: kupleri malzemeye gore AYRI
KEMIKLERE bolup her kemige kendi dokusunu veriyor. Boylece
cizim oyundaki dizilimin aynisini yapiyor -- odun odun,
ip ip, skin skin.

---- BU CIZICININ NE OLDUGUNU BILEREK SOYLEMEK ----
`ciz_kemik` bir yuzu TEK RENGE indirger (o yuzun doku
dikdortgeninin ortalamasi). Yani buradan cikan resim
DOKUNUN DESENINI gostermez; oran, durus ve MALZEME AYRIMI
gosterir. Uc soruyu cevaplamak icin var:
   - kupa oyuncuya gore ne kadar buyuk,
   - kollar govdeden dogru yerden cikiyor mu,
   - onu tutan sey skin rengiyle mi ciziliyor.
Desen icin oyuna bakmak gerekiyor, bu araca degil.

Kullanim:  python3 addon/onizle_kupa.py [cikti_klasoru]
"""
import json, os, sys
from PIL import Image
import ciz_kemik

KOK = os.path.dirname(os.path.abspath(__file__))
RP = os.path.join(KOK, "Simsek_Kol_Kaynak")
BP = os.path.join(KOK, "Simsek_TNT_ToprakTopu")


def _malzeme(kup):
    """Kupun malzeme adi -- YUZDEN okunuyor.

    Kup duzeyinde okumak v7.36'daki hatanin ta kendisiydi;
    bu arac da oradan okusaydi hatayi yine goremezdi."""
    uv = kup.get("uv")
    if not isinstance(uv, dict):
        return None
    for yuz in ("north", "south", "east", "west", "up", "down"):
        y = uv.get(yuz)
        if y and y.get("material_instance"):
            return y["material_instance"]
    return None


def kupa_ciz(kimlik, cikti, ac=0.6):
    geo_yol = os.path.join(RP, "models", "blocks", "kupa_%s.geo.json" % kimlik)
    blok_yol = os.path.join(BP, "blocks", "kupa_%s.json" % kimlik)
    if not (os.path.exists(geo_yol) and os.path.exists(blok_yol)):
        return None
    g = json.load(open(geo_yol))["minecraft:geometry"][0]
    mi = (json.load(open(blok_yol))["minecraft:block"]
          ["components"]["minecraft:material_instances"])

    # Kupleri malzemeye gore kemiklere bol. "*" = skin.
    bolum = {}
    for kemik in g["bones"]:
        for kup in kemik.get("cubes", []):
            bolum.setdefault(_malzeme(kup) or "*", []).append(kup)

    bones, dokular = [], {}
    for ad, kupler in bolum.items():
        kemik_ad = "m_" + ad.replace("*", "skin")
        bones.append({"name": kemik_ad, "pivot": [0, 0, 0], "cubes": kupler})
        if ad == "*":
            continue                      # skin: varsayilan dokuyu kullansin
        doku = os.path.join(RP, "textures", "blocks", mi[ad]["texture"] + ".png")
        im = Image.open(doku).convert("RGBA")
        dokular[kemik_ad] = (im, im.width, im.height)

    skin = Image.open(os.path.join(RP, "textures", "blocks",
                                   "kupa_%s.png" % kimlik)).convert("RGBA")
    return ciz_kemik.ciz(bones, 64, 64, skin, cikti, ac, SC=10,
                         dokular=dokular)


def olcu(kimlik):
    """Modelin sinirlari -- oyuncunun 32 birimiyle karsilastirmak
    icin. Sayilar resimden degil GEOMETRIDEN okunuyor."""
    yol = os.path.join(RP, "models", "blocks", "kupa_%s.geo.json" % kimlik)
    g = json.load(open(yol))["minecraft:geometry"][0]
    mn = [1e9] * 3
    mx = [-1e9] * 3
    for kemik in g["bones"]:
        for c in kemik.get("cubes", []):
            inf = c.get("inflate", 0)
            o = [v - inf for v in c["origin"]]
            s = [v + 2 * inf for v in c["size"]]
            for dx in (0, s[0]):
                for dy in (0, s[1]):
                    for dz in (0, s[2]):
                        p = [o[0] + dx, o[1] + dy, o[2] + dz]
                        if c.get("rotation"):
                            p = ciz_kemik.don(p, c["rotation"], c["pivot"])
                        for i in range(3):
                            mn[i] = min(mn[i], p[i])
                            mx[i] = max(mx[i], p[i])
    return [mx[i] - mn[i] for i in range(3)], mx[1]


if __name__ == "__main__":
    hedef = sys.argv[1] if len(sys.argv) > 1 else os.path.join(KOK, "onizleme")
    os.makedirs(hedef, exist_ok=True)
    for kimlik in ("earl", "entity303", "wyne", "dream"):
        yol = os.path.join(hedef, "kupa_%s.png" % kimlik)
        if kupa_ciz(kimlik, yol) is None:
            print("  - %s: uretilmemis, atlandi" % kimlik)
            continue
        o, tepe = olcu(kimlik)
        print("  %-10s %s  ->  en %.1f  boy %.1f  derin %.1f  (tepe %.1f / sinir 30)"
              % (kimlik, os.path.basename(yol), o[0], o[1], o[2], tepe))
    print("Oyuncu karsilastirmasi: tam boy oyuncu 32 birim = 2 blok.")
