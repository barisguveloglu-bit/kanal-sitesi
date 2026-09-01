# -*- coding: utf-8 -*-
"""BLOCKBENCH .bbmodel <-> BEDROCK .geo.json KOPRUSU.

Kullanici Blockbench ogreniyor: "dosyasini bulmak icin
arastirma yapman gerekiyor... mantigini anladiktan sonra da
cizici ile birlestir."

---- DOSYA NEREDEN BULUNDU ----
Blockbench wiki'si acikca soyluyor: "There is no complete
specification of the JSON format at this point in time. To
understand it, it is recommended to look at example .bbmodel
files and to examine the Blockbench source code."

O yuzden spec degil KAYNAK okundu (JannisX11/blockbench,
master):
    js/formats/bbmodel.js          -> FORMATV = '5.0', compile()
    js/formats/bedrock/bedrock.js  -> compileCube/compileGroup,
                                      parseCube  (asil sozlesme)
    js/outliner/outliner.js        -> Outliner.toJSON/loadJSON

---- SOZLESME (bedrock.js'ten OLDUGU GIBI) ----
compileGroup (Blockbench grubu -> Bedrock kemigi):
    bone.pivot     = g.origin;    pivot[0]   *= -1
    bone.rotation  = g.rotation;  rotation[0] *= -1
                                  rotation[1] *= -1   (Z aynen)

compileCube (Blockbench kupu -> Bedrock kupu):
    origin = cube.from ; size = to - from
    origin[0] = -(origin[0] + size[0])
    (donus varsa) pivot = cube.origin; pivot[0] *= -1
                  rotation[axis] *= -1  for axis != 2
    box_uv ise   uv = cube.uv_offset
    degilse      yuz basina {uv, uv_size}; up/down icin
                 uv += uv_size ve uv_size negatiflenir

---- SASIRTAN SEY ----
Cevrim KENDI TERSI. Yalniz X negatifleniyor (bir de X/Y
donusleri); iki kez uygulayinca basa donuyorsun. parseCube
kaynakta compileCube ile AYNI formulleri kullaniyor, ters
cevrilmis halini degil. Yani tek fonksiyon iki yone de
calisiyor -- asagida `cevir()` bir kere yazilmis, iki yerde
cagriliyor. Bunu `gidis_donus()` her kosuda kanitliyor.

Blockbuster'da (v7.4.1) iki isaret degisimi birbirini
goturuyordu; burada da cevrim kendi tersi. Ikisi de ayni
sebepten: Java ile Bedrock arasindaki fark tek bir ayna.
"""
import base64
import json
import os
import uuid as _uuid


# ---------------------------------------------------------------- ortak
def cevir_pivot(p):
    """Pivot/origin noktasi: yalniz X aynalaniyor. Kendi tersi."""
    return [-p[0], p[1], p[2]]


def cevir_donus(r):
    """Donus: X ve Y isaret degistirir, Z aynen. Kendi tersi."""
    return [-r[0], -r[1], r[2]]


def _yeni_uuid():
    return str(_uuid.uuid4())


# ------------------------------------------------- Bedrock -> Blockbench
def yaz(geo_yol, doku_yol=None, ad=None, kimlik=None):
    """Bedrock .geo.json -> .bbmodel sozlugu.

    Doku verilirse `data:` URI olarak GOMULUYOR: Blockbench'te
    dosya acilinca model dokulu geliyor, ayrica png aramak
    gerekmiyor.                                                """
    with open(geo_yol, encoding="utf-8") as f:
        ham = json.load(f)
    g = None
    for aday in ham.get("minecraft:geometry", []):
        if kimlik is None or aday["description"]["identifier"] == kimlik:
            g = aday
            break
    if g is None:
        raise ValueError("geometri bulunamadi: %s" % geo_yol)
    tanim = g["description"]
    tw = tanim.get("texture_width", 64)
    th = tanim.get("texture_height", 64)

    elemanlar = []
    gruplar = {}          # kemik adi -> outliner sozlugu
    for kemik in g["bones"]:
        grup = {
            "name": kemik["name"],
            "origin": cevir_pivot(kemik.get("pivot", [0, 0, 0])),
            "rotation": cevir_donus(kemik.get("rotation", [0, 0, 0])),
            "uuid": _yeni_uuid(),
            "export": True,
            "isOpen": True,
            "visibility": True,
            "children": [],
        }
        if not any(grup["rotation"]):
            grup.pop("rotation")
        gruplar[kemik["name"]] = grup

        for kup in kemik.get("cubes", []):
            o = list(kup["origin"])
            s = list(kup["size"])
            bas = [-(o[0] + s[0]), o[1], o[2]]
            e = {
                "name": kemik["name"],
                "from": bas,
                "to": [bas[0] + s[0], bas[1] + s[1], bas[2] + s[2]],
                "autouv": 0,
                "color": 0,
                "locked": False,
                "rescale": False,
                "origin": cevir_pivot(kup.get("pivot", kemik.get(
                    "pivot", [0, 0, 0]))),
                "uuid": _yeni_uuid(),
            }
            if kup.get("rotation"):
                e["rotation"] = cevir_donus(kup["rotation"])
            if kup.get("inflate"):
                e["inflate"] = kup["inflate"]
            uv = kup.get("uv", [0, 0])
            if isinstance(uv, list):
                e["box_uv"] = True
                e["uv_offset"] = list(uv)
                if kup.get("mirror"):
                    e["mirror_uv"] = True
            else:
                # Yuz basina uv. up/down'da kaynak uv'yi
                # uv_size kadar kaydirip uv_size'i negatifliyor;
                # geri alirken AYNI islem yapiliyor.
                e["box_uv"] = False
                yuzler = {}
                for yuz, v in uv.items():
                    u0 = list(v["uv"])
                    us = list(v.get("uv_size", [0, 0]))
                    if yuz in ("up", "down"):
                        u0 = [u0[0] + us[0], u0[1] + us[1]]
                        us = [-us[0], -us[1]]
                    yz = {"uv": [u0[0], u0[1],
                                 u0[0] + us[0], u0[1] + us[1]],
                          "texture": 0}
                    # uv_rotation ve material_instance ILK
                    # YAZIMDA UNUTULMUSTU. 344 geometrilik
                    # gidis-donus taramasi 13 modelde farki
                    # gosterdi: kaynagin `uv_rotation: 180`
                    # dedigi yuzler sessizce duz donuyordu.
                    # Test olmasa hicbir sey bagirmazdi --
                    # dokular sadece yanlis dururdu.
                    if v.get("uv_rotation"):
                        yz["rotation"] = v["uv_rotation"]
                    if v.get("material_instance"):
                        yz["material_name"] = v["material_instance"]
                    yuzler[yuz] = yz
                for yuz in ("north", "east", "south", "west", "up", "down"):
                    yuzler.setdefault(yuz, {"uv": [0, 0, 0, 0],
                                            "texture": None})
                e["faces"] = yuzler
            elemanlar.append(e)
            gruplar[kemik["name"]]["children"].append(e["uuid"])

    # Hiyerarsi: 5.0 oncesi "ic ice grup" bicimi. Guncel
    # Blockbench bunu HALA okuyor (outliner.js loadJSON:
    # "Legacy group support" -- item.name varsa yeni Group).
    # 5.0'in ayri `groups` dizisini yazmak, eski surumlerde
    # modeli acilmaz yapardi.
    kok = []
    for kemik in g["bones"]:
        ust = kemik.get("parent")
        if ust and ust in gruplar:
            gruplar[ust]["children"].append(gruplar[kemik["name"]])
        else:
            kok.append(gruplar[kemik["name"]])

    model = {
        "meta": {"format_version": "4.5", "model_format": "bedrock",
                 "box_uv": True},
        "name": ad or os.path.basename(geo_yol).split(".")[0],
        "geometry_name": tanim["identifier"].replace("geometry.", ""),
        "resolution": {"width": tw, "height": th},
        "elements": elemanlar,
        "outliner": kok,
        "textures": [],
    }
    if doku_yol and os.path.exists(doku_yol):
        with open(doku_yol, "rb") as f:
            veri = base64.b64encode(f.read()).decode("ascii")
        model["textures"].append({
            "path": "", "name": os.path.basename(doku_yol),
            "folder": "", "namespace": "", "id": "0",
            "particle": True, "render_mode": "normal", "visible": True,
            "mode": "bitmap", "saved": False, "uuid": _yeni_uuid(),
            "source": "data:image/png;base64," + veri,
        })
    return model


# ------------------------------------------------- Blockbench -> Bedrock
def oku(yol):
    """.bbmodel -> (kemikler, TW, TH, doku_bytes|None).

    Kemikler bizim cizicinin (ciz_kemik.py) yedigi bicimde:
    Bedrock geometrisiyle ayni sozluk duzeni.                 """
    with open(yol, encoding="utf-8") as f:
        m = json.load(f)
    coz = {e["uuid"]: e for e in m.get("elements", [])}
    tw = m.get("resolution", {}).get("width", 64)
    th = m.get("resolution", {}).get("height", 64)

    kemikler = []

    def kup_cevir(e, kemik_pivot):
        bas = list(e["from"])
        son = list(e["to"])
        s = [son[i] - bas[i] for i in range(3)]
        kup = {"origin": [-(bas[0] + s[0]), bas[1], bas[2]], "size": s}
        if e.get("rotation") and any(e["rotation"]):
            kup["pivot"] = cevir_pivot(e.get("origin", kemik_pivot))
            kup["rotation"] = cevir_donus(e["rotation"])
        if e.get("inflate"):
            kup["inflate"] = e["inflate"]
        if e.get("box_uv", True):
            kup["uv"] = list(e.get("uv_offset", [0, 0]))
            if e.get("mirror_uv"):
                kup["mirror"] = True
        else:
            uv = {}
            for yuz, v in (e.get("faces") or {}).items():
                if v.get("texture") is None:
                    continue
                a = v["uv"]
                u0, us = [a[0], a[1]], [a[2] - a[0], a[3] - a[1]]
                if yuz in ("up", "down"):
                    u0 = [u0[0] + us[0], u0[1] + us[1]]
                    us = [-us[0], -us[1]]
                yz = {"uv": u0, "uv_size": us}
                if v.get("rotation"):
                    yz["uv_rotation"] = v["rotation"]
                if v.get("material_name"):
                    yz["material_instance"] = v["material_name"]
                uv[yuz] = yz
            kup["uv"] = uv
        return kup

    def gez(dugum, ust):
        if isinstance(dugum, str):
            return                      # koke dogrudan asili kup: kemiksiz
        pivot = cevir_pivot(dugum.get("origin", [0, 0, 0]))
        k = {"name": dugum["name"], "pivot": pivot}
        if ust:
            k["parent"] = ust
        if dugum.get("rotation") and any(dugum["rotation"]):
            k["rotation"] = cevir_donus(dugum["rotation"])
        kupler = []
        for c in dugum.get("children", []):
            if isinstance(c, str):
                e = coz.get(c)
                if e and e.get("visibility", True) is not False:
                    kupler.append(kup_cevir(e, dugum.get("origin", [0, 0, 0])))
            else:
                gez(c, dugum["name"])
        if kupler:
            k["cubes"] = kupler
        kemikler.append(k)

    for d in m.get("outliner", []):
        gez(d, None)

    doku = None
    for t in m.get("textures", []):
        kaynak = t.get("source", "")
        if kaynak.startswith("data:image"):
            doku = base64.b64decode(kaynak.split(",", 1)[1])
            break
    return kemikler, tw, th, doku


# ------------------------------------------------------------ denetim
def gidis_donus(geo_yol, kimlik=None):
    """Bedrock -> .bbmodel -> Bedrock ayni sonucu veriyor mu.

    Cevrim kendi tersi oldugu icin bu SIFIR farkla tutmali.
    Tutmuyorsa cevrimde bir yon eksik demektir.               """
    import tempfile
    m = yaz(geo_yol, kimlik=kimlik)
    with tempfile.NamedTemporaryFile("w", suffix=".bbmodel",
                                     delete=False, encoding="utf-8") as f:
        json.dump(m, f)
        gecici = f.name
    try:
        geri, _tw, _th, _d = oku(gecici)
    finally:
        os.unlink(gecici)

    with open(geo_yol, encoding="utf-8") as f:
        ham = json.load(f)
    ilk = None
    for aday in ham["minecraft:geometry"]:
        if kimlik is None or aday["description"]["identifier"] == kimlik:
            ilk = aday
            break

    # ---- KARSILASTIRMA: YUVARLAMA DEGIL TOLERANS ----
    # Ilk yazimda 4 haneye yuvarlayip karsilastiriyordum.
    # 344 geometrilik taramada 9 model "farkli" cikti; hepsi
    # kayan nokta gurultusuydu (3.0000000000000018 vs 3.0,
    # 0.006249999999999978 vs 0.00625) ve 0,00625 tam
    # yuvarlama sinirina dustugu icin yuvarlama IKI FARKLI
    # sonuc veriyordu. Yani kusur cevrimde degil TESTTEYDI.
    # Simdi sayilar toleransla, geri kalan aynen esleniyor.
    def esit(a, b, tol=1e-6):
        if isinstance(a, bool) or isinstance(b, bool):
            return a == b
        if isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return abs(a - b) <= tol
        if isinstance(a, dict) and isinstance(b, dict):
            return (set(a) == set(b)
                    and all(esit(a[k], b[k], tol) for k in a))
        if isinstance(a, list) and isinstance(b, list):
            return (len(a) == len(b)
                    and all(esit(x, y, tol) for x, y in zip(a, b)))
        return a == b

    def sadelestir(kemikler):
        d = {}
        for b in kemikler:
            d[b["name"]] = {
                "parent": b.get("parent"),
                "pivot": b.get("pivot", [0, 0, 0]),
                "rotation": b.get("rotation", [0, 0, 0]),
                "cubes": [{
                    "origin": c["origin"],
                    "size": c["size"],
                    "uv": c.get("uv"),
                    "inflate": c.get("inflate", 0),
                    "rotation": c.get("rotation", [0, 0, 0]),
                } for c in b.get("cubes", [])],
            }
        return d

    a, b = sadelestir(ilk["bones"]), sadelestir(geri)
    farklar = []
    for ad in sorted(set(a) | set(b)):
        if not esit(a.get(ad), b.get(ad)):
            farklar.append(ad)
    return farklar


# ---- MUTLAK DENETIM ----
# GIDIS-DONUS TEK BASINA YETMEZ. Cevrim kendi tersi oldugu
# icin X negatiflemesini IKI YERDEN birden silsem gidis-donus
# YINE tutardi -- test yesil yanar, modeller aynalanmis olur.
# O yuzden kaynagin formulune KARSI tek bir sabit olcut:
#
#   bedrock.js / parseCube:
#       base_cube.from[0] = -(base_cube.from[0] + s.size[0])
#
# Bedrock kupu origin[-8,12,-2] size[4,12,4] ->
#       from[0] = -(-8 + 4) = 4
MUTLAK_ORNEK = {
    "kup": {"origin": [-8, 12, -2], "size": [4, 12, 4], "uv": [40, 16]},
    "kemik_pivot": [-5, 22, 0],
    "bekle_from": [4, 12, -2],
    "bekle_to": [8, 24, 2],
    "bekle_origin": [5, 22, 0],          # pivot X aynalandi
}


def mutlak_denetim():
    """Cevrim kaynagin formuluyle ayni yone mi bakiyor."""
    import tempfile
    ornek = {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {"identifier": "geometry.denetim",
                            "texture_width": 64, "texture_height": 64},
            "bones": [{"name": "sagKol",
                       "pivot": MUTLAK_ORNEK["kemik_pivot"],
                       "cubes": [MUTLAK_ORNEK["kup"]]}],
        }],
    }
    with tempfile.NamedTemporaryFile("w", suffix=".geo.json",
                                     delete=False, encoding="utf-8") as f:
        json.dump(ornek, f)
        gecici = f.name
    try:
        m = yaz(gecici)
    finally:
        os.unlink(gecici)
    e = m["elements"][0]
    grup = m["outliner"][0]
    sonuc = []
    for ad, olculen, beklenen in (
            ("kup from", e["from"], MUTLAK_ORNEK["bekle_from"]),
            ("kup to", e["to"], MUTLAK_ORNEK["bekle_to"]),
            ("kemik origin", grup["origin"], MUTLAK_ORNEK["bekle_origin"])):
        tamam = all(abs(a - b) < 1e-6 for a, b in zip(olculen, beklenen))
        sonuc.append((ad, tamam, olculen, beklenen))
    return sonuc


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("kullanim:")
        print("  python3 bbmodel.py <geo.json> [doku.png] [cikti.bbmodel]")
        print("  python3 bbmodel.py --denetim <geo.json>")
        raise SystemExit(2)
    if sys.argv[1] == "--denetim":
        kotu = False
        for ad, tamam, olc, bek in mutlak_denetim():
            print(("  OK  " if tamam else "  YOK ") + ad,
                  olc, "beklenen", bek)
            kotu = kotu or not tamam
        f = gidis_donus(sys.argv[2]) if len(sys.argv) > 2 else []
        if len(sys.argv) > 2:
            print("gidis-donus farki:", f if f else "YOK (tam ayni)")
        raise SystemExit(1 if (f or kotu) else 0)
    geo = sys.argv[1]
    doku = sys.argv[2] if len(sys.argv) > 2 else None
    cik = sys.argv[3] if len(sys.argv) > 3 else \
        os.path.basename(geo).split(".")[0] + ".bbmodel"
    m = yaz(geo, doku)
    with open(cik, "w", encoding="utf-8") as f:
        json.dump(m, f, indent=2)
    print("yazildi:", cik, "| kemik", len(m["outliner"]),
          "kok,", len(m["elements"]), "kup,",
          "doku " + ("var" if m["textures"] else "yok"))
