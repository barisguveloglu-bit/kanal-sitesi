# -*- coding: utf-8 -*-
"""BATAKLIK VE CADININ KULUBESI -- 2. bolum Part 1'in mekani.   v7.99.16

    bloklar, bilgi = kulube.bataklik()

Kulube: `yapilar/cadi_kulubesi.json` (oyundan blok blok olculdu, 147 blok)
ve kullanicinin iki eklemesi (SERI_SEZON1.md, "Cevaplananlar"): asil
kulubede olmayan KIRMIZI YATAK ve KITAPLIK. Baris yatakta uyanir, ates
kitabi kitapliktan. Kapi agzinda kapi yok: Minecraft'in kulubesinde de yok.

Bataklik: Minecraft 26.3 Java JAR'indan okunanlar (Mojang dosyasi depoya
girmedi, yalniz sayilar):
  - worldgen/biome/swamp.json: yaprak #6A7039, su #617B64, cimen
    "swamp" boyasi;
  - BiomeSpecialEffects$GrassColorModifier$3 (javap): gurultu < -0,1 ise
    cimen #4C763C, degilse #6A7039 (iki tonlu lekeler);
  - worldgen/feature/swamp_oak.json: duz govde 5 + [0, 3] blok, "blob"
    yaprak yaricap 3 yukseklik 3 (katmanlar ustten 2, 2, 3, 3; tam kose
    ustte hep, altta yari yariya bos), yaprak kenarina %25 sarmasik, en
    fazla 5 blok sarkar.
Gurultu BIZIM (deterministik deger gurultusu), Mojang'in gurultusu degil:
lekelerin yeri oyundakiyle ayni olmaz, bicimi ayni olur.

CLAUDE'UN ONERISI (kullanici onaylamadi): havuzlarin yeri, agaclarin yeri,
kapinin onundeki kuru serit ve gecidin yeri. Gecidin bicimi kullanicinin
(2026-11-01: obsidyen cerceveli mor gecit, Minecraft'taki gibi); yeri
soyleyene kadar burada kulubenin batisinda, kulubeye bakiyor.

Eksenler Minecraft'in: x dogu, y yukari, z guney. Zeminin ustu y = 0
(cimen bloklari y = -1). Kulubenin kapisi ve verandasi kuzeyde.
"""
import json
import math
import os
import random

BURASI = os.path.dirname(os.path.abspath(__file__))

YARICAP = 30                        # bataklik karesi: x, z in [-30, 30]
KULUBE_KOKEN = (-3, 3, -4)          # kulubenin (0, 0, 0)'i dunyada; taban y = 3
TOHUM = 1728                        # efsanenin yili; her kosu ayni bataklik

# Minecraft 26.3 JAR'indan (yukarida). 0-1 araliginda RGB.
def _hex(h):
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


BATAKLIK_RENK = {"yaprak": _hex("6A7039"), "su": _hex("617B64"), "cimen": _hex("6A7039")}
CIMEN_KOYU = _hex("4C763C")         # gurultu < -0,1
CIMEN_ESIK = -0.1

# Havuzlar: gurultu SU_ESIK'ten kucukse su (bir blok derin), DERIN_ESIK'ten
# kucukse iki blok. Oranlar olculdu (asagida `oranlar`).
SU_ESIK = -0.08
DERIN_ESIK = -0.42
AGAC_SAYISI = 16
AGAC_ARALIK = 6.5
GECIT = {"x": -15, "z": 0, "eksen": "z"}     # cercevenin bati kenari; kulubeye (doguya) bakar


def _ozet(ix, iz, tohum):
    """Izgara noktasina [-1, 1] arasinda sabit deger (tamsayi karmasi)."""
    h = (ix * 374761393 + iz * 668265263 + tohum * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h ^= h >> 16
    return (h / 4294967295.0) * 2.0 - 1.0


def gurultu(x, z, olcek, tohum):
    """Deger gurultusu: izgara noktalari arasi yumusak (smoothstep)."""
    fx, fz = x / olcek, z / olcek
    ix, iz = math.floor(fx), math.floor(fz)
    ux, uz = fx - ix, fz - iz
    ux, uz = ux * ux * (3 - 2 * ux), uz * uz * (3 - 2 * uz)
    a = _ozet(ix, iz, tohum)
    b = _ozet(ix + 1, iz, tohum)
    c = _ozet(ix, iz + 1, tohum)
    d = _ozet(ix + 1, iz + 1, tohum)
    return (a * (1 - ux) + b * ux) * (1 - uz) + (c * (1 - ux) + d * ux) * uz


def havuz_gurultusu(x, z):
    return 0.7 * gurultu(x, z, 9.0, TOHUM) + 0.3 * gurultu(x, z, 4.0, TOHUM + 1)


def kulube_yukle():
    with open(os.path.join(BURASI, "yapilar", "cadi_kulubesi.json"), encoding="utf-8") as f:
        return json.load(f)


def _kuru_mu(x, z):
    """Kuru kalmasi gereken yerler (Claude'un onerisi): kapinin onunden
    kuzeye uzanan serit (Baris kulubeden cikip yurur), gecidin onu ve
    cevresi, kazik diplerinin hemen yani."""
    kx, _, kz = KULUBE_KOKEN
    if -4 <= x - kx - 3 <= 4 and -16 <= z - kz <= -1:      # veranda onu, kuzeye
        return True
    gx, gz = GECIT["x"], GECIT["z"] + 0.5
    if math.hypot(x - gx - 2, z - gz) <= 4.5:                # gecidin onu
        return True
    return False


class Dunya:
    def __init__(self):
        self.b = {}

    def koy(self, p, t, s=None, **ek):
        q = {"p": list(p), "t": t}
        if s:
            q["s"] = s
        q.update(ek)
        self.b[tuple(p)] = q

    def var(self, p):
        return tuple(p) in self.b

    def tip(self, p):
        q = self.b.get(tuple(p))
        return q["t"] if q else None


def _zemin(D):
    """Cimen, havuzlar, havuz dibi. Donus: {(x, z): su derinligi}."""
    derinlik = {}
    for x in range(-YARICAP, YARICAP + 1):
        for z in range(-YARICAP, YARICAP + 1):
            n = havuz_gurultusu(x, z)
            d = 0
            if not _kuru_mu(x, z):
                d = 2 if n < DERIN_ESIK else (1 if n < SU_ESIK else 0)
            derinlik[(x, z)] = d
            if d == 0:
                ton = CIMEN_KOYU if gurultu(x, z, 22.0, TOHUM + 7) < CIMEN_ESIK else BATAKLIK_RENK["cimen"]
                D.koy((x, -1, z), "grass_block", renk=list(ton))
                D.koy((x, -2, z), "dirt")
            else:
                for y in range(-d, 0):
                    D.koy((x, y, z), "water")
                dip = "clay" if gurultu(x, z, 3.0, TOHUM + 3) > 0.35 else "dirt"
                D.koy((x, -d - 1, z), dip)
                if d == 1:
                    D.koy((x, -3, z), "dirt")
    return derinlik


def _kulube(D, derinlik):
    """Olculen kulube + kaziklar zemine kadar + yatak ve kitaplik."""
    kx, ky, kz = KULUBE_KOKEN
    k = kulube_yukle()
    for q in k["bloklar"]:
        x, y, z = q["p"]
        D.koy((x + kx, y + ky, z + kz), q["t"], q.get("s"))
        if q["t"] == "flower_pot" and k.get("saksi_ici"):
            D.b[(x + kx, y + ky, z + kz)]["bitki"] = k["saksi_ici"]   # olculdu: kirmizi mantar
    # kaziklar: kulubenin tabanindan zemine (suyun icinde dibe) kadar
    kaziklar = []
    for sx, sz in k["kaziklar"]["sutunlar"]:
        x, z = sx + kx, sz + kz
        alt = -derinlik.get((x, z), 0)        # suda dibe, kuruda zeminin ustune
        for y in range(alt, ky):
            D.koy((x, y, z), k["kaziklar"]["t"])
        kaziklar.append((x, z, ky - alt))
    # Kullanicinin eklemeleri. Ic: x 2..4, z 3..6 (yerel); kapi agzi (4, 1, 2).
    # Yatak bati duvarinin dibinde, BASI KUZEYDE (yastik dokusu kuzeye
    # cizildigi icin, blok_kur), basi kitapligin dibinde. Kapidan icerisi
    # (x 3-4) bos kalir.
    yatak_bas = (2 + kx, 1 + ky, 4 + kz)
    yatak_ayak = (2 + kx, 1 + ky, 5 + kz)
    D.koy(yatak_bas, "bed", {"direction": 2, "head_piece_bit": 1, "renk": "red"})
    D.koy(yatak_ayak, "bed", {"direction": 2, "head_piece_bit": 0, "renk": "red"})
    kitaplik = [(2 + kx, 1 + ky, 3 + kz), (2 + kx, 2 + ky, 3 + kz)]
    for p in kitaplik:
        D.koy(p, "bookshelf")
    return {"koken": [kx, ky, kz], "taban_ustu": ky + 1, "kapi_agzi": [4 + kx, 1 + ky, 2 + kz],
            "veranda": [[2 + kx, ky, 0 + kz], [4 + kx, ky, 1 + kz]],
            "yatak": {"bas": list(yatak_bas), "ayak": list(yatak_ayak)},
            "kitaplik": [list(p) for p in kitaplik], "kaziklar": kaziklar,
            "ic": [[2 + kx, 1 + ky, 3 + kz], [4 + kx, 3 + ky, 6 + kz]]}


def _gecit(D):
    """Obsidyen cerceve 4 genis x 5 yuksek (koseler dahil), ici 2 x 3 gecit."""
    x, z0 = GECIT["x"], GECIT["z"] - 1
    for dz in range(4):
        for y in range(5):
            kenar = dz in (0, 3) or y in (0, 4)
            if kenar:
                D.koy((x, y, z0 + dz), "obsidian")
            else:
                D.koy((x, y, z0 + dz), "portal", {"portal_axis": GECIT["eksen"]})
    return {"cerceve": [[x, 0, z0], [x, 4, z0 + 3]], "ic": [[x, 1, z0 + 1], [x, 3, z0 + 2]],
            "merkez": [x + 0.5, 2.5, z0 + 2.0], "bakis": [1, 0]}


def _yaprak_katmani(r, i, rnd):
    """BlobFoliagePlacer: |dx| = |dz| = r kosesi ustte (i = 0) hep, altta
    yari yariya bos."""
    for dx in range(-r, r + 1):
        for dz in range(-r, r + 1):
            if abs(dx) == r and abs(dz) == r and (rnd.random() < 0.5 or i == 0):
                continue
            yield dx, dz


def _mese(D, x, z, taban, rnd):
    """Bataklik mesesi (swamp_oak.json). taban: govdenin ilk blogunun y'si."""
    h = 5 + rnd.randint(0, 3)
    for y in range(taban, taban + h):
        D.koy((x, y, z), "oak_log", {"pillar_axis": "y"})
    yapraklar = []
    tepe = taban + h
    for i, r in ((0, 2), (-1, 2), (-2, 3), (-3, 3)):
        for dx, dz in _yaprak_katmani(r, i, rnd):
            p = (x + dx, tepe + i, z + dz)
            if not D.var(p):
                D.koy(p, "oak_leaves")
                yapraklar.append(p)
    # LeaveVineDecorator: her yapragin dort yaninda %25; sarmasik yapraga
    # bakan yuzune yapisir, bos oldukca en fazla 5 blok sarkar
    for p in yapraklar:
        for (dx, dz), bit in (((-1, 0), 8), ((1, 0), 2), ((0, -1), 1), ((0, 1), 4)):
            if rnd.random() >= 0.25:
                continue
            q = [p[0] + dx, p[1], p[2] + dz]
            n = 0
            while n < 5 and not D.var(q):
                D.koy(tuple(q), "vine", {"vine_direction_bits": bit})
                q[1] -= 1
                n += 1
    return {"p": [x, taban, z], "boy": h}


def _agaclar(D, derinlik, rnd):
    kx, _, kz = KULUBE_KOKEN
    agaclar = []
    deneme = 0
    while len(agaclar) < AGAC_SAYISI and deneme < 4000:
        deneme += 1
        x = rnd.randint(-YARICAP + 4, YARICAP - 4)
        z = rnd.randint(-YARICAP + 4, YARICAP - 4)
        if derinlik[(x, z)] > 1:
            continue
        # yapraklar (yaricap 3) ve sarkan sarmasiklar kuru seridin ustune
        # gelmesin: Baris orada yuruyor (ilk onizlemede kapinin onune
        # sarmasik sarkiyordu)
        if any(_kuru_mu(x + dx, z + dz) for dx in range(-4, 5) for dz in range(-4, 5)):
            continue
        if kx - 5 <= x <= kx + 11 and kz - 5 <= z <= kz + 13:   # kulube + yapraklarin payi
            continue
        if math.hypot(x - GECIT["x"], z - GECIT["z"]) < 7:
            continue
        if any(math.hypot(x - a["p"][0], z - a["p"][2]) < AGAC_ARALIK for a in agaclar):
            continue
        taban = -derinlik[(x, z)]
        if taban < 0:
            D.koy((x, taban, z), "oak_log", {"pillar_axis": "y"})   # suyun yerine
        agaclar.append(_mese(D, x, z, taban, rnd))
    return agaclar


def _susler(D, derinlik, rnd):
    """Cimen, mavi orkide (bataklik cicegi), mantarlar, nilufer. Kapinin
    onundeki serit ve gecidin onu bos: aktorler orada yurur."""
    say = {}
    for x in range(-YARICAP, YARICAP + 1):
        for z in range(-YARICAP, YARICAP + 1):
            p = (x, 0, z)
            if D.var(p):
                continue
            r = rnd.random()
            if derinlik[(x, z)]:
                t = "waterlily" if r < 0.09 else None
            elif _kuru_mu(x, z):
                t = None
            else:
                t = ("short_grass" if r < 0.10 else "blue_orchid" if r < 0.125 else
                     "red_mushroom" if r < 0.135 else "brown_mushroom" if r < 0.15 else None)
            if t:
                D.koy(p, t)
                say[t] = say.get(t, 0) + 1
    return say


def oranlar(derinlik):
    n = float(len(derinlik))
    return {"su": sum(1 for d in derinlik.values() if d) / n,
            "derin": sum(1 for d in derinlik.values() if d == 2) / n}


def bataklik():
    """-> (bloklar, bilgi). Her kosu ayni (TOHUM)."""
    rnd = random.Random(TOHUM)
    D = Dunya()
    derinlik = _zemin(D)
    kulube = _kulube(D, derinlik)
    gecit = _gecit(D)
    agaclar = _agaclar(D, derinlik, rnd)
    susler = _susler(D, derinlik, rnd)
    bilgi = {"kulube": kulube, "gecit": gecit, "agaclar": agaclar, "susler": susler,
             "oranlar": oranlar(derinlik), "renkler": BATAKLIK_RENK, "yaricap": YARICAP}
    return list(D.b.values()), bilgi


if __name__ == "__main__":
    b, bilgi = bataklik()
    print("blok:", len(b))
    print(json.dumps({k: v for k, v in bilgi.items() if k != "agaclar"}, ensure_ascii=False))
    print("agac:", len(bilgi["agaclar"]), [a["boy"] for a in bilgi["agaclar"]])
