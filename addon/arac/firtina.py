# -*- coding: utf-8 -*-
"""Kar firtinasi: yogun ruzgarli kar, sis, dogudan gelen firtina duvari,
gogun yarisinin kararmasi, yildirim. Blender gerektirmeyen hesap kismi;
cizim blender_film.firtina_kur, ses film_ses.                  2026-11-25

Kullanici (2026-11-25): "Sirada 3. madden devam et" -- 3. madde: "sis
duvariyla yogun kar firtinasi ve simsek" (+ surda creeper patlamasi ve
gedik, gedik.py). SERI_SEZON1.md Part 2: "Pencereden: dogudan gelen
firtina gogun yarisini karartmis"; "Ice-man firtinayi koyulastiriyor,
karin icinde saklanan creeper'lar sura variyor"; hazir paket plani "bulutta
ara ara yildirim".

OYUNDAN OKUNAN (Java 26.3 istemci JAR'i, javap; REFERANS_MOJANG_KILAVUZ.md
"Yildirim"):
  LightningBolt   yaratilinca life 2, flashes = rastgele(3) + 1. Her tik:
                  life 2 ise gok gurultusu (perde 0,8 + rastgele * 0,2) ve
                  carpma sesi; life--; life < 0 iken flashes 0 ise biter,
                  degilse life < -rastgele(10) olunca flashes--, life = 1 ve
                  yeni tohum (yeni bicim). life >= 0 olan tiklerde gok
                  aydinlanir (setSkyFlashTime(2)). Cizgi yok olana dek
                  gorunur, her yeniden cakista bicimi degisir.
  LightningBoltRenderer
                  8 parca x 16 blok (128 blok). Ana cizgi tepeden asagi her
                  parcada yatayda rastgele(11) - 5 blok kayar ve carpma
                  noktasinda biter; 2 dal: 7 - dal'inci parcadan baslar, 3
                  parca, rastgele(31) - 15. 4 ic ice katman, yari genislik
                  0,1 + katman * 0,2 (ana cizgide parca * 0,1 + 1 kat);
                  renk (0,45, 0,45, 0,5), saydamlik 0,3, toplanarak cizilir.
FILMIN KURALI (oyunda yok): gok gurultusu isiktan uzaklik / 343 sn sonra
(oyunda aninda calar); firtina duvari, gogun kararmasi, sis, yogun kar ve
ruzgar sesi. Kamera bakmadigi yerde de kar yagar: kar kutusu kamerayla
gider, taneler dunyaya baglidir.

Senaryo (senaryo duzeyinde, plan basina degil):
  "firtina": {
    "yogunluk": [[0.0, 0.35], [6.0, 1.0]],   (t, 0..1) Ice-man koyulastirir
    "gelis": "dogu" | [x, y],                 firtinanin geldigi yon
    "kar": {"sayi": 12000, "kutu": [40, 40, 24], "dusus": 4.0, "ruzgar": 8.0},
    "duvar": {"uzaklik": [[0.0, 260.0], [8.0, 170.0]], "aci": 150, "yukseklik": 150},
    "gok": {"renk": [0.20, 0.22, 0.26], "en_cok": 0.92},
    "sis": {"yogunluk": 0.55, "baslangic": 6.0, "derinlik": 70.0},
    "yildirim": [{"t": 2.4, "nokta": [190.0, 12.0], "tohum": 3}]  ya da
                {"sayi": 4, "tohum": 3}
  }
"""
import math
import random

TIK = 20.0
SES_HIZI = 343.0                # m/sn = blok/sn (filmin kurali)

# ---- LightningBolt / LightningBoltRenderer ----
YILDIRIM_LIFE = 2
YILDIRIM_FLAS = 3               # flashes = rastgele(3) + 1
YILDIRIM_BEKLE = 10             # life < -rastgele(10)
PARCA, PARCA_BOY = 8, 16        # 8 parca x 16 blok
ANA_KAYMA, DAL_KAYMA = 11, 31   # rastgele(11) - 5, rastgele(31) - 15
DAL_SAYI, DAL_PARCA = 2, 3
KATMAN = 4
GEN_TABAN, GEN_ADIM = 0.1, 0.2  # yari genislik 0.1 + katman * 0.2
RENK = (0.45, 0.45, 0.5)
SAYDAM = 0.3

YONLER = {"dogu": (1.0, 0.0), "bati": (-1.0, 0.0), "kuzey": (0.0, 1.0), "guney": (0.0, -1.0)}
VARSAYILAN = {
    "yogunluk": [[0.0, 1.0]],
    "gelis": "dogu",
    # yakin 3: firtinada tane cok, kameranin 1,5-3 blok onundeki taneler buyuk
    # beyaz kup gibi duruyordu (ilk onizleme; seyrek kar_kur 1,5)
    "kar": {"sayi": 12000, "kutu": [40.0, 40.0, 24.0], "dusus": 4.0, "ruzgar": 8.0, "boy": 0.07,
            "yakin": 3.0, "parlaklik": 0.35},
    "duvar": {"uzaklik": [[0.0, 220.0]], "aci": 150.0, "yukseklik": 150.0, "merkez": [0.0, 0.0],
              "renk": [0.62, 0.65, 0.70]},
    "gok": {"renk": [0.20, 0.22, 0.26], "en_cok": 0.92},
    # sis firtina grisi: acik sis (0,80) karartilan gogu yeniden aciyordu (ilk onizleme)
    "sis": {"yogunluk": 0.55, "baslangic": 6.0, "derinlik": 70.0, "renk": [0.56, 0.59, 0.64]},
    "yildirim": [],
    "tohum": 1,
}


def ayar(senaryo):
    """Senaryonun firtinasi (varsayilanlarla) ya da None. Kamera kaydinda
    "firtina" HATA: senaryo degeri (sureklilik, atmosfer gibi)."""
    f = senaryo.get("firtina")
    for c in senaryo.get("kamera", []):
        if "firtina" in c:
            raise ValueError("firtina plan basina yazilmaz (t=%s): senaryo degeri" % c.get("t"))
    if not f:
        return None
    if senaryo.get("atmosfer"):
        raise ValueError("firtina ve atmosfer birlikte yazilmaz: firtinanin kendi sisi var (firtina.sis)")
    out = {}
    for k, v in VARSAYILAN.items():
        if isinstance(v, dict):
            out[k] = dict(v)
            out[k].update(f.get(k, {}))
        else:
            out[k] = f.get(k, v)
    g = out["gelis"]
    if isinstance(g, str):
        if g not in YONLER:
            raise ValueError("firtina gelis: %s (dogu/bati/kuzey/guney ya da [x, y])" % g)
        g = YONLER[g]
    n = math.hypot(g[0], g[1])
    if n < 1e-9:
        raise ValueError("firtina gelis sifir vektor")
    out["gelis"] = [g[0] / n, g[1] / n]
    for t, v in out["yogunluk"]:
        if not (0.0 <= float(v) <= 1.0):
            raise ValueError("firtina yogunlugu 0..1 olmali (t=%s)" % t)
    return out


def egri(anahtar, t):
    """[(t, deger)] parca parca dogrusal; uclarda sabit."""
    a = sorted((float(x), float(y)) for x, y in anahtar)
    if t <= a[0][0]:
        return a[0][1]
    for (t0, v0), (t1, v1) in zip(a, a[1:]):
        if t <= t1:
            return v0 + (v1 - v0) * (t - t0) / max(1e-9, t1 - t0)
    return a[-1][1]


def yogunluk(f, t):
    return egri(f["yogunluk"], t)


def ruzgar(f):
    """Karin yatay hizi (blok/sn): firtinanin geldigi yonun tersine."""
    h = float(f["kar"]["ruzgar"])
    return [-f["gelis"][0] * h, -f["gelis"][1] * h]


def kar_sayisi(f, t):
    """t aninda gorunen kar tanesi (taneler sira numarasiyla: yogunluk
    artinca yenileri eklenir, eskiler yerinde kalir)."""
    return int(round(int(f["kar"]["sayi"]) * yogunluk(f, t)))


def duvar_uzakligi(f, t):
    return egri(f["duvar"]["uzaklik"], t)


def gok_payi(f, t):
    """Gogun firtina tarafindaki kararmanin gucu (0..en_cok)."""
    return float(f["gok"]["en_cok"]) * yogunluk(f, t)


# ---------------------------------------------------------------- yildirim
def yildirim_omru(tohum):
    """LightningBolt.tick: [{"tik", "bicim", "parlama", "ses"}] -- cizginin
    var oldugu her tik. bicim: kacinci tohum (her yeniden cakista yeni)."""
    rnd = random.Random(int(tohum) * 6151 + 17)
    life, flas, bicim = YILDIRIM_LIFE, rnd.randrange(YILDIRIM_FLAS) + 1, 0
    out, tik = [], 0
    while tik < 400:
        ses = life == YILDIRIM_LIFE
        life -= 1
        if life < 0:
            if flas == 0:
                break
            if life < -rnd.randrange(YILDIRIM_BEKLE):
                flas -= 1
                life = 1
                bicim += 1
        out.append({"tik": tik, "bicim": bicim, "parlama": life >= 0, "ses": ses})
        tik += 1
    return out


def yildirim_bicimi(tohum):
    """LightningBoltRenderer: katmandan bagimsiz parcalar (her katman ayni
    tohumla ayni yolu cizer, yalniz genisligi farkli). Carpma noktasi
    (0, 0, 0); eksenler oyunun (x, y yukari, z).
    -> [{"dal", "alt": (x, y, z), "ust": (x, y, z), "k_alt", "k_ust"}]"""
    rnd = random.Random(int(tohum))
    xs, zs = [0.0] * PARCA, [0.0] * PARCA
    x = z = 0.0
    for i in range(PARCA - 1, -1, -1):
        xs[i], zs[i] = x, z
        x += rnd.randrange(ANA_KAYMA) - ANA_KAYMA // 2
        z += rnd.randrange(ANA_KAYMA) - ANA_KAYMA // 2
    x_son, z_son = x, z
    rnd = random.Random(int(tohum))         # her katmanda ayni tohum (oyunda da)
    out = []
    for dal in range(DAL_SAYI + 1):
        ana = dal == 0
        ust = PARCA - 1 - dal
        alt = 0 if ana else ust - (DAL_PARCA - 1)
        x, z = xs[ust] - x_son, zs[ust] - z_son
        for p in range(ust, alt - 1, -1):
            x0, z0 = x, z
            k = ANA_KAYMA if ana else DAL_KAYMA
            x += rnd.randrange(k) - k // 2
            z += rnd.randrange(k) - k // 2
            out.append({"dal": dal, "alt": (x, p * PARCA_BOY, z), "ust": (x0, (p + 1) * PARCA_BOY, z0),
                        "k_alt": (p - 1) * 0.1 + 1.0 if ana else 1.0,
                        "k_ust": p * 0.1 + 1.0 if ana else 1.0})
    return out


def yari_genislik(katman):
    return GEN_TABAN + katman * GEN_ADIM


def yildirimlar(f, sure):
    """Senaryonun yildirimlari: [{"t", "nokta": [x, y], "tohum", "omur"}].
    Liste yazilmissa o; {"sayi", "tohum"} ise firtina duvarinin icinde,
    yogunlukla agirlikli rastgele anlarda (tohumlu)."""
    y = f["yildirim"]
    if isinstance(y, dict):
        rnd = random.Random(int(y.get("tohum", 1)) * 977 + 3)
        liste = []
        for i in range(int(y.get("sayi", 3))):
            for _deneme in range(200):
                t = rnd.uniform(0.0, sure)
                if rnd.random() <= yogunluk(f, t):
                    break
            a = math.atan2(f["gelis"][1], f["gelis"][0]) + math.radians(rnd.uniform(-0.4, 0.4) * f["duvar"]["aci"])
            r = duvar_uzakligi(f, t) * rnd.uniform(0.85, 1.25)
            m = f["duvar"]["merkez"]
            liste.append({"t": t, "nokta": [m[0] + math.cos(a) * r, m[1] + math.sin(a) * r],
                          "tohum": rnd.randrange(1, 10 ** 6)})
    else:
        liste = [dict(v) for v in y]
    out = []
    for i, v in enumerate(sorted(liste, key=lambda v: v["t"])):
        tohum = int(v.get("tohum", i + 1))
        out.append({"t": float(v["t"]), "nokta": [float(v["nokta"][0]), float(v["nokta"][1])],
                    "tohum": tohum, "omur": yildirim_omru(tohum)})
    return out


def gurultu_gecikmesi(nokta, dinleyen):
    """Gok gurultusu isiktan bu kadar sonra (sn): uzaklik / ses hizi."""
    return math.hypot(nokta[0] - dinleyen[0], nokta[1] - dinleyen[1]) / SES_HIZI


def gurultu_sesleri(f, sure, film_t, dinleyen=(0.0, 0.0)):
    """Her yildirimin gok gurultusu: [(dosya, film zamani, duzey, perde)].
    Dinleyen hanedanin ortasi (kamera her cekimde baska yerde; 40 blokluk fark
    ~0,1 sn). Duzey uzaklikla azalir (160 blokta 1)."""
    out = []
    for y in yildirimlar(f, sure):
        d = max(1.0, math.hypot(y["nokta"][0] - dinleyen[0], y["nokta"][1] - dinleyen[1]))
        tg = film_t(y["t"]) + gurultu_gecikmesi(y["nokta"], dinleyen)
        duzey = min(1.2, max(0.35, 160.0 / d))
        out.append(("lowFrequency_explosion_000.ogg", tg, duzey, 0.5))
        out.append(("lowFrequency_explosion_001.ogg", tg + 0.12, duzey * 0.8, 0.42))
    return out
