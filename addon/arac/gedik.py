# -*- coding: utf-8 -*-
"""Creeper patlamasi ve sur gedigi: kirilan bloklar, moloz yigini, toz,
patlamanin itmesi. Blender gerektirmez (mekan.py ve blender_film.py
cagirir).                                                      2026-11-25

Kullanici (2026-11-25): "Sirada 3. madden devam et" -- 3. madde: "surda
creeper patlamasi ve gedik" (+ sis duvariyla kar firtinasi ve simsek).
SERI_SEZON1.md: "sur delinmesi: yaklasma -> tislama -> patlama -> toz ->
gedik -> dumandan gecen zombi"; "Ice-man iskeletleri molozun ustune
cikarip askerlerin ustunden ok yagdiriyor".

OYUNDAN OKUNAN (Java 26.3 istemci JAR'i, javap; REFERANS_MOJANG_KILAVUZ.md
"Creeper patlamasi"):
  Creeper          maxSwell 30 tik; explosionRadius 3 (yuklu creeper 2 kat);
                   patlama ayaklarin hizasinda (getX, getY, getZ); creeper
                   o an yok olur (discard)
  ServerExplosion  calculateExplodedPositions: 16x16x16 izgaranin yuzeyindeki
                   1352 isin; isinin gucu yaricap * (0.7 + rastgele * 0.6);
                   0.3 blokluk adimlar; blok (ya da sivi) varsa
                   guc -= (direnc + 0.3) * 0.3; guc hala > 0 ise o blok
                   kirilir; her adimda guc -= 0.225
                   hurtEntities: 2 * yaricap icindeki varlik, goz hizasindan
                   patlamaya dogru, (1 - uzaklik / (2 * yaricap)) *
                   gorunurluk kadar (blok/tik) itilir. Gorunurluk
                   getSeenPercent: varligin kutusundaki izgara noktalarindan
                   patlamaya cizgi, blok kesmeyenlerin orani.
                   Sira: once isinlar, sonra itme (bloklar henuz yerinde),
                   en son bloklar kalkar.
  ExplosionDamageCalculator  direnc = max(blok, sivi); hava ve sivisiz: yok
  Blocks           direnc tablosu asagida (DIRENC)

FILMIN KURALI (oyunda yok):
  moloz  oyunda kirilan blok esya olarak duser, yigin olusmaz. Filmde kirilan
         tasin MOLOZ_ORAN'i gedigin dibine yigilir; yigin yarim blok yarim
         blok kurulur (komsu sutunlar en cok 0,5 blok farkli), boylece
         ustune yurunur (aktor 0,6 blok cikar). Moloz patlamadan MOLOZ_GECIKME
         sonra belirir: toz ve dumanin icinde.
  toz    patlamanin ustunde birkac saniye kalan toz bulutu (hacim).
  dusme  itmesi PATLAMA_DUSURME'den buyuk olan aktor yere duser (oyunda
         ucar; filmde dikey itme yok).

Senaryo:
  {"t": 6.5, "aktor": "c1", "patla": [x, y]}           x, y: Blender ekseni
  ([x, y, z] de yazilabilir; z yazilmazsa creeper cevrenin zemin
  seviyesinden en cok bir adim yukaridaki yuzeyde: cukurda cukurun dibi)
  {"t": 6.5, "aktor": "c1", "patla": [x, y], "guc": 6.0, "tohum": 2}
Creeper o anda [x, y]'de (0,6 blok icinde) ve tam sismis olmali (once
"tisla", oyunda 30 tik): degilse cizimden once HATA. Gedigin yeri boylece
senaryoda acikca yazili; zaman cizelgesini kosmadan kamera denetimi,
zemin hesabi ve cizim ayni gedigi bilir.
"""
import math
import random

TIK = 20.0
SISME_TIK = 30                  # Creeper.maxSwell
CREEPER_YARICAP = 3.0           # Creeper.explosionRadius (yuklu creeper x2)
CREEPER_BOY = 1.7               # EntityType.CREEPER: 0.6 x 1.7
IZGARA = 16                     # ServerExplosion: 16^3 izgaranin yuzeyi
ADIM = 0.30000001192092896      # isinin adimi (blok)
ADIM_KAYIP = 0.22500001         # her adimda guc kaybi
GUC_TABAN, GUC_SACILIM = 0.7, 0.6
DIRENC_PAY = 0.3                # blokta guc -= (direnc + 0.3) * 0.3

# ---- filmin kurallari ----
MOLOZ_ORAN = 0.5                # kirilan tasin yigina donen payi
MOLOZ_GECIKME = 0.3             # sn: moloz patlamadan bu kadar sonra belirir
MOLOZ_TAS = 2.0                 # bu direncten saglam kirilan blok moloza sayilir
MOLOZ_TURLER = (("cobblestone", 5), ("cracked_stone_bricks", 3), ("andesite", 1), ("gravel", 1))
MOLOZ_YARIM = {"cobblestone": "cobblestone_slab", "cracked_stone_bricks": "stone_brick_slab",
               "andesite": "andesite_slab", "gravel": "cobblestone_slab"}
PATLAMA_DUSURME = 0.4           # blok/tik: bundan guclu itilen aktor yere duser
TOZ_SURE = 5.0                  # sn: toz bulutunun omru (guc 1)
TOZ_BOY = 2.0                   # yaricap basina toz bulutunun kenari (blok)

# ---- direnc (Blocks, javap) ----
TAS_DIRENC = 6.0
DIRENC = {
    "stone": 6.0, "stone_bricks": 6.0, "mossy_stone_bricks": 6.0, "cracked_stone_bricks": 6.0,
    "chiseled_stone_bricks": 6.0, "cobblestone": 6.0, "mossy_cobblestone": 6.0, "andesite": 6.0,
    "polished_andesite": 6.0,
    "grass_block": 0.6, "dirt": 0.5, "dirt_path": 0.65, "farmland": 0.6, "gravel": 0.6,
    "glass": 0.3, "glass_pane": 0.3, "snow_block": 0.2, "snow": 0.1, "ice": 0.5, "packed_ice": 0.5,
    "lantern": 3.5, "water": 100.0, "hay_block": 0.5, "ladder": 0.4, "barrel": 2.5, "chest": 2.5,
    "crafting_table": 2.5, "smithing_table": 2.5, "bookshelf": 1.5, "furnace": 3.5, "smoker": 3.5,
    "terracotta": 4.2,
}
# aninda kirilan (instabreak): direnc 0
ANINDA = ("short_grass", "tall_grass", "fern", "poppy", "dandelion", "allium", "azure_bluet",
          "oxeye_daisy", "cornflower", "lily_of_the_valley", "wheat", "carrots", "potatoes",
          "beetroots", "beetroot", "torch", "wall_torch")
# basamak, yarim ve duvar ana blogun kopyasi (registerLegacyStair/Slab/Wall)
KOPYA_EK = ("_stairs", "_slab", "_wall")
KOPYA_KOK = {"stone_brick": "stone_bricks", "mossy_stone_brick": "mossy_stone_bricks",
             "cobblestone": "cobblestone", "mossy_cobblestone": "mossy_cobblestone",
             "andesite": "andesite", "polished_andesite": "polished_andesite", "stone": "stone"}
TAHTA_DIRENC = 3.0              # planks, ve kopyalari (basamak, yarim), cit, kapi
KUTUK_DIRENC = 2.0              # logProperties: strength(2.0)
YAPRAK_DIRENC = 0.2             # leavesProperties: strength(0.2)


def direnc(t):
    """Blogun patlama direnci (Blocks, javap). Olculmemis blok HATA verir:
    tahmin edilmez, tabloya once olculup yazilir."""
    if t in DIRENC:
        return DIRENC[t]
    if t in ANINDA or t.endswith("_tulip"):
        return 0.0
    for ek in KOPYA_EK:
        if t.endswith(ek):
            kok = t[: -len(ek)]
            if kok in KOPYA_KOK:
                return DIRENC[KOPYA_KOK[kok]]
            return TAHTA_DIRENC                 # oak_stairs, spruce_slab... (planks kopyasi)
    if t.endswith("_planks") or t.endswith("_fence") or t.endswith("_fence_gate") \
            or t.endswith("_door") or t.endswith("_trapdoor"):
        return TAHTA_DIRENC
    if t.endswith("_log") or t.endswith("_wood"):
        return KUTUK_DIRENC
    if t.endswith("_leaves"):
        return YAPRAK_DIRENC
    if t.endswith("_terracotta"):
        return DIRENC["terracotta"]
    raise ValueError("gedik: patlama direnci olculmedi: %s (gedik.DIRENC'e once olcup yaz)" % t)


def isinlar():
    """ServerExplosion: 16^3 izgaranin yuzey noktalarindan birim yonler (1352)."""
    out = []
    for j in range(IZGARA):
        for k in range(IZGARA):
            for l_ in range(IZGARA):
                if j in (0, IZGARA - 1) or k in (0, IZGARA - 1) or l_ in (0, IZGARA - 1):
                    d = [c / (IZGARA - 1.0) * 2.0 - 1.0 for c in (j, k, l_)]
                    n = math.sqrt(sum(x * x for x in d))
                    out.append(tuple(x / n for x in d))
    return out


ISINLAR = isinlar()


def kirilan_bloklar(blok_al, merkez, yaricap, tohum):
    """Oyunun isinlariyla kirilan bloklar. blok_al(p) -> tur ya da None
    (hava); merkez ve p Minecraft ekseninde (x, y, z). -> {p}"""
    rnd = random.Random(int(tohum) * 7919 + 11)
    kirilan = set()
    for d in ISINLAR:
        f = yaricap * (GUC_TABAN + rnd.random() * GUC_SACILIM)
        x, y, z = merkez
        while f > 0.0:
            p = (math.floor(x), math.floor(y), math.floor(z))
            t = blok_al(p)
            if t is not None:
                f -= (direnc(t) + DIRENC_PAY) * DIRENC_PAY
                if f > 0.0:
                    kirilan.add(p)
            x += d[0] * ADIM
            y += d[1] * ADIM
            z += d[2] * ADIM
            f -= ADIM_KAYIP
    return kirilan


# ---------------------------------------------------------------- moloz
def _taban(dolu, sutun, y0, y1):
    """Sutunun (x, z) y0..y1 arasindaki ilk 'ustu bos, alti dolu' yuksekligi
    (blogun ust yuzu). Yoksa None."""
    x, z = sutun
    for y in range(y0, y1 + 1):
        if dolu((x, y - 1, z)) and not dolu((x, y, z)):
            return y
    return None


def moloz(dolu, kirilan, turler, merkez, tohum):
    """Kirilan tasin MOLOZ_ORAN'i gedigin dibine yarim blok yarim blok yigilir.
    dolu(p): p'de katı blok var mi (patlamadan sonra); turler: {p: tur}
    kirilanlarin turu. -> [{"p", "t", "s"}] eklenecek bloklar (Minecraft)."""
    tas = [p for p in kirilan if direnc(turler[p]) >= MOLOZ_TAS]
    birim = int(round(len(tas) * MOLOZ_ORAN * 2))          # yarim blok birimi
    if birim <= 0:
        return []
    rnd = random.Random(int(tohum) * 104729 + 7)
    y_alt = math.floor(merkez[1]) - 3
    y_ust = math.floor(merkez[1]) + 12
    # yigin yalniz gedigin cevresindeki sutunlara (kirilan sutunlar + 3 blok)
    kaynak = {}
    for (x, y, z) in tas:
        kaynak[(x, z)] = kaynak.get((x, z), 0) + 1
    alan = {(x + dx, z + dz) for (x, z) in kaynak for dx in range(-3, 4) for dz in range(-3, 4)}
    taban, tavan = {}, {}
    for s in alan:
        y = _taban(dolu, s, y_alt, y_ust)
        if y is None:
            continue
        taban[s] = float(y)
        # tavan: tabanin ustundeki ilk dolu blok (tunel gibi gedikte moloz
        # kalan duvarin icine tasmasin)
        ust = y
        while ust < y_ust + 4 and not dolu((s[0], ust, s[1])):
            ust += 1
        tavan[s] = float(ust)
    yuk = dict(taban)                                     # yarim blok adimli yukseklik
    sutunlar = sorted(kaynak)
    agirlik = [kaynak[s] for s in sutunlar]
    for _ in range(birim):
        s = rnd.choices(sutunlar, agirlik)[0]
        if s not in yuk:
            continue
        # kayma: komsusu 1 blok (iki yarim) alcaksa oraya akar
        for _adim in range(64):
            komsu = [(s[0] + dx, s[1] + dz) for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            alcak = [k for k in komsu if k in yuk and yuk[k] <= yuk[s] - 1.0 and yuk[k] + 0.5 <= tavan[k]]
            if not alcak:
                break
            en = min(yuk[k] for k in alcak)
            s = rnd.choice([k for k in alcak if yuk[k] == en])
        if yuk[s] + 0.5 <= tavan[s]:
            yuk[s] += 0.5
    out = []
    for s, h in yuk.items():
        h0 = taban[s]
        if h <= h0 + 1e-9:
            continue
        tam = int(math.floor(h - h0 + 1e-9))
        for i in range(tam):
            t = rnd.choices([a for a, _ in MOLOZ_TURLER], [w for _, w in MOLOZ_TURLER])[0]
            out.append({"p": [s[0], int(h0) + i, s[1]], "t": t, "s": {}})
        if h - h0 - tam > 0.25:
            t = rnd.choices([a for a, _ in MOLOZ_TURLER], [w for _, w in MOLOZ_TURLER])[0]
            out.append({"p": [s[0], int(h0) + tam, s[1]], "t": MOLOZ_YARIM[t], "s": {"type": "bottom"}})
    return out


# ---------------------------------------------------------------- itme
def gorunurluk(kati, merkez, kutu, adim=0.1):
    """ServerExplosion.getSeenPercent: kutunun (x0, y0, z0, x1, y1, z1)
    izgara noktalarindan merkeze cizginin blok kesmeyenlerinin orani.
    kati(p): nokta bir blogun icinde mi (Minecraft ekseni)."""
    x0, y0, z0, x1, y1, z1 = kutu
    dx = 1.0 / ((x1 - x0) * 2.0 + 1.0)
    dy = 1.0 / ((y1 - y0) * 2.0 + 1.0)
    dz = 1.0 / ((z1 - z0) * 2.0 + 1.0)
    kx = (1.0 - math.floor(1.0 / dx) * dx) / 2.0
    kz = (1.0 - math.floor(1.0 / dz) * dz) / 2.0
    acik = toplam = 0
    u = 0.0
    while u <= 1.0:
        v = 0.0
        while v <= 1.0:
            w = 0.0
            while w <= 1.0:
                p = (x0 + (x1 - x0) * u + kx, y0 + (y1 - y0) * v, z0 + (z1 - z0) * w + kz)
                d = math.dist(p, merkez)
                n = max(1, int(d / adim))
                if not any(kati(tuple(p[i] + (merkez[i] - p[i]) * k / n for i in range(3)))
                           for k in range(n)):
                    acik += 1
                toplam += 1
                w += dz
            v += dy
        u += dx
    return acik / toplam if toplam else 0.0


def itme(merkez, yaricap, ayak, en, boy, goz, gorunen):
    """hurtEntities: (blok/tik itme vektoru, buyukluk) ya da None.
    merkez, ayak Minecraft ekseni; goz: goz yuksekligi; gorunen 0..1."""
    f = yaricap * 2.0
    d = math.dist((ayak[0], ayak[1], ayak[2]), merkez) / f
    if d > 1.0:
        return None
    gx, gy, gz = ayak[0] - merkez[0], ayak[1] + goz - merkez[1], ayak[2] - merkez[2]
    n = math.sqrt(gx * gx + gy * gy + gz * gz)
    if n < 1e-9:
        return None
    k = (1.0 - d) * gorunen
    return (gx / n * k, gy / n * k, gz / n * k), k


# ---------------------------------------------------------------- toz
def toz_ayari(merkez, t0, guc, tohum, ruzgar=(0.0, 0.0)):
    """Toz bulutu (filmin kurali): Blender ekseninde merkez. Buyur (0,8 sn),
    ruzgarla kayar, yavasca yukselir, yogunlugu TOZ_SURE icinde soner."""
    rnd = random.Random(int(tohum) * 31337 + 5)
    sure = TOZ_SURE * (0.8 + 0.2 * guc) * rnd.uniform(0.9, 1.1)
    boy = TOZ_BOY * CREEPER_YARICAP * guc
    return {"t0": t0, "t1": t0 + sure, "merkez": list(merkez), "boy": boy,
            "ruzgar": [float(ruzgar[0]), float(ruzgar[1])], "yuksel": 0.25, "yogunluk": 1.6,
            "renk": [0.55, 0.52, 0.47], "tohum": int(tohum)}


def toz_anlik(toz, t):
    """(konum, boy, yogunluk) t aninda; omrun disinda yogunluk 0."""
    if t < toz["t0"] or t > toz["t1"]:
        return toz["merkez"], 0.0, 0.0
    u = (t - toz["t0"]) / (toz["t1"] - toz["t0"])
    dt = t - toz["t0"]
    buyu = min(1.0, dt / 0.8)
    buyu = 1.0 - (1.0 - buyu) ** 3
    m = toz["merkez"]
    konum = [m[0] + toz["ruzgar"][0] * dt, m[1] + toz["ruzgar"][1] * dt,
             m[2] + toz["boy"] * 0.3 + toz["yuksel"] * dt]
    yog = toz["yogunluk"] * (1.0 - u) ** 1.6
    return konum, toz["boy"] * (0.35 + 0.65 * buyu), yog


# ---------------------------------------------------------------- senaryo
def patlama_olaylari(senaryo):
    """[{"t", "aktor", "nokta": [x, y], "yaricap", "tohum"}] zamana gore."""
    out = []
    for i, o in enumerate(senaryo.get("olaylar", [])):
        if o.get("patla") is None:
            continue
        p = o["patla"]
        if not (isinstance(p, (list, tuple)) and len(p) in (2, 3)):
            raise ValueError("patla: [x, y] ya da [x, y, z] olmali (t=%s)" % o.get("t"))
        out.append({"t": float(o["t"]), "aktor": o.get("aktor"), "nokta": [float(c) for c in p],
                    "yaricap": float(o.get("guc", CREEPER_YARICAP)), "tohum": int(o.get("tohum", i + 1))})
    out.sort(key=lambda e: e["t"])
    return out
