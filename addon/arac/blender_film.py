"""Senaryodan Blender filmi: aktorler, dovus, kamera, altyazi.   v7.99.9

Kullanim (Blender'in kendi Python'uyla, ekransiz):
    blender -b -P addon/arac/blender_film.py -- senaryo.json cikti_klasoru [--onizleme]

Cikti: <klasor>/kare/0001.png ... ve <klasor>/film.mp4 (altyazili).
--onizleme: dusuk cozunurluk + az ornek (hizli bakmak icin).

Kullanicinin "B yolu" istegi: oyun ici cekimin (cekim.js) Blender
karsiligi. AYNI kurallar:
  * poz: bedrock_onizleme.py (Epic Fight'a karsi olculmus donus kurali)
  * vurus secimi, hamle izi, temas anlari: _wom_hareket verisi
    (kaynak_anim/wom/wom_kilic.hareket.json) -- oyunla bire bir
  * kamera acilari: cekim.js kameraNoktasi'nin Python'u
Yani sahne once oyunda denenip sonra Blender'da "kaliteli" cekilebilir.

---- SENARYO (JSON) ----
{
  "fps": 24, "sure": 8.0, "cozunurluk": [1280, 720], "ornek": 16,
  "zemin": {"boyut": 40, "agac": 6, "tohum": 3},
  "aktorler": {
    "a": {"skin": "Simsek_Kol_Kaynak/textures/entity/aktor/uzak_akraba.png",
          "isim": "Barış", "silah": "karanlik_tirpan", "set": "antitheus",
          "konum": [-3, 0], "bak": "b"}
  },
  "olaylar": [
    {"t": 0.5, "aktor": "a", "git": "b", "kos": true},
    {"t": 1.5, "aktor": "a", "vur": "oto", "hedef": "b"},
    {"t": 1.6, "aktor": "b", "savun": 0.8},
    {"t": 2.5, "aktor": "b", "kacin": "sol"},
    {"t": 3.0, "aktor": "a", "soyle": "Kaçamazsın!"},
    {"t": 0.0, "anlat": "Yıllar sonra..."},
    {"t": 0.0, "baslik": "DÜELLO"}
  ],
  "kamera": [
    {"t": 0.0, "aci": "genis", "a": "a", "b": "b"},
    {"t": 2.0, "aci": "omuz", "a": "a", "b": "b", "gecis": 0.5}
  ]
}
Koordinatlar Blender'in: x, y zemin (blok), z yukari. `bak`: 0 = +y.

---- OYUNDAN FARKI ----
Oyunda saniyede 20 tick; burada kare basina hesap (fps). Hamle izi
tick basina oldugu icin zamana gore aradegerleniyor. Blender
agir cekimi de yapabiliyor: olayda "hiz": 0.5 animasyonu yarim
hizda oynatir (oyunda yapilamayan sey).
"""
import json
import math
import os
import random
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bedrock_onizleme as B  # noqa: E402

KOK = B.KOK
ANIM_WOM = "Simsek_Kol_Kaynak/animations/wom_kilic.animation.json"
ANIM_AKTOR = "Simsek_Kol_Kaynak/animations/aktor.animation.json"
HAREKET = "kaynak_anim/wom/wom_kilic.hareket.json"
GEO_AKTOR = "Simsek_Kol_Kaynak/models/entity/aktor.geo.json"
SILAH = {"karanlik_tirpan": ("Simsek_Kol_Kaynak/models/entity/karanlik_tirpan.geo.json",
                             "Simsek_Kol_Kaynak/textures/entity/karanlik_tirpan.png")}
MCPREP_DOKU = os.environ.get("MCPREP_DOKU", "")      # .../mcprep_default/assets/minecraft/textures/block
YAZI_TIPI = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TICK = 20.0
YURU, KOS = 4.3, 5.6          # blok/sn (vanilla)
VARIS = 1.6
MENZIL = 3.5
KACIN, KACIN_SN = 2.4, 0.3
ITME = 0.55
GECIS = 0.12                  # animasyon gecisi (sn)


# ============================================================
# 1. ZAMAN CIZELGESI -- saf Python (test Blender'siz calistiriyor)
# ============================================================
def yon_aci(p, q):
    """p'den q'ya bakis acisi (derece, 0 = +y, saat yonu tersine)."""
    return math.degrees(math.atan2(-(q[0] - p[0]), q[1] - p[1]))


def on_yon(aci):
    a = math.radians(aci)
    return (-math.sin(a), math.cos(a))


def sag_yon(aci):
    a = math.radians(aci)
    return (math.cos(a), math.sin(a))


class Aktor:
    def __init__(self, ad, v, setler):
        self.ad = ad
        self.v = v
        self.set = v.get("set") or ("yumruk" if not v.get("silah") else None)
        self.poz = [float(v.get("konum", [0, 0])[0]), float(v.get("konum", [0, 0])[1])]
        self.z = 0.0
        self.aci = float(v.get("aci", 0))
        self.eylem = None        # {"anim", "bas", "sure", "hiz", "iz", "cikis", "aci"}
        self.tepki = []          # [{"anim", "bas", "sure"}]
        self.savun_bitis = -1
        self.yuru = None         # {"hedef" | "nokta", "hiz"}
        self.itme = [0.0, 0.0]
        self.mesafe = 0.0        # yuruyus animasyonu icin toplam yol
        self.hizli = 0.0         # 0..1 hareket orani (yuruyus agirligi)
        self.seri = {"sira": -1, "son": -99}
        self.kayit = []          # kare basina durum


def vurus_sec(setler, set_ad, tur, a, t):
    s = setler.get(set_ad)
    if not s:
        raise ValueError("dovus seti yok: %s" % set_ad)
    if tur not in ("oto", "kosu", "hava"):
        x = next((x for x in s["saldirilar"] if x["ad"] == tur), None)
        if not x:
            raise ValueError("%s setinde vurus yok: %s" % (set_ad, tur))
        return x
    if tur != "oto":
        return next(x for x in s["saldirilar"] if x["tur"] == tur)
    oto = [x for x in s["saldirilar"] if x["tur"] == "oto"]
    if t - a.seri["son"] > 2.0:
        a.seri["sira"] = -1
    a.seri["sira"] = (a.seri["sira"] + 1) % len(oto)
    return oto[a.seri["sira"]]


def zaman_cizelgesi(senaryo, setler, anims):
    """Her aktor icin kare basina (x, y, z, aci, katmanlar) + efekt ve
    altyazi listeleri. Oyun mantiginin (cekim.js) kare-zamanli karsiligi."""
    fps = senaryo.get("fps", 24)
    kare = int(round(senaryo["sure"] * fps))
    aktorler = {ad: Aktor(ad, v, setler) for ad, v in senaryo["aktorler"].items()}
    for a in aktorler.values():
        hedef = a.v.get("bak")
        if isinstance(hedef, str) and hedef in aktorler:
            a.aci = yon_aci(a.poz, aktorler[hedef].poz)
        elif isinstance(hedef, (int, float)):
            a.aci = float(hedef)
    olaylar = sorted(senaryo.get("olaylar", []), key=lambda o: o["t"])
    efektler, yazilar, sarsinti = [], [], []
    i = 0
    for f in range(kare + 1):
        t = f / fps
        dt = 1.0 / fps
        while i < len(olaylar) and olaylar[i]["t"] <= t + 1e-9:
            o = olaylar[i]
            i += 1
            if "anlat" in o:
                yazilar.append({"t": o["t"], "sure": o.get("sure", yazi_suresi(o["anlat"])),
                                "metin": o["anlat"], "tur": "anlat"})
                continue
            if "baslik" in o:
                yazilar.append({"t": o["t"], "sure": o.get("sure", 2.5), "metin": o["baslik"],
                                "tur": "baslik"})
                continue
            a = aktorler[o["aktor"]]
            if "bak" in o:
                h = o["bak"]
                a.aci = yon_aci(a.poz, aktorler[h].poz) if isinstance(h, str) else float(h)
            if "git" in o:
                g = o["git"]
                a.yuru = ({"hedef": g} if isinstance(g, str) else {"nokta": [float(g[0]), float(g[1])]})
                a.yuru["hiz"] = KOS if o.get("kos") else YURU
            if "vur" in o:
                hedef = aktorler.get(o.get("hedef")) if o.get("hedef") else None
                if hedef:
                    a.aci = yon_aci(a.poz, hedef.poz)
                s = vurus_sec(setler, o.get("set") or a.set, o["vur"], a, t)
                hiz = float(o.get("hiz", 1.0))
                a.eylem = {"anim": s["anim"], "bas": t, "sure": s["sure"] / hiz, "hiz": hiz,
                           "iz": s["iz"], "cikis": list(a.poz), "cz": a.z, "aci": a.aci,
                           "dikey": o["vur"] == "hava" or s.get("dikey", False),
                           "fazlar": s["fazlar"], "hedef": hedef, "vuruldu": set()}
                a.seri["son"] = t + s["sure"] / hiz
                a.yuru = None
                a.savun_bitis = -1
            if "savun" in o:
                sure = float(o["savun"]) if not isinstance(o["savun"], bool) else 1.1
                a.savun_bitis = t + sure
                a.tepki.append({"anim": "animation.aktor.savun", "bas": t, "sure": sure, "tut": True})
            if "kacin" in o:
                yon = o["kacin"]
                on = on_yon(a.aci)
                sg = sag_yon(a.aci)
                d = {"geri": (-on[0], -on[1]), "sag": sg, "sol": (-sg[0], -sg[1])}[yon]
                a.eylem = {"kacin": d, "bas": t, "sure": KACIN_SN, "cikis": list(a.poz)}
                a.tepki.append({"anim": "animation.aktor.kacin_" + yon, "bas": t, "sure": 0.35})
            if "soyle" in o:
                sure = o.get("sure", yazi_suresi(o["soyle"]))
                yazilar.append({"t": o["t"], "sure": sure, "metin": o["soyle"], "tur": "soyle",
                                "isim": a.v.get("isim", a.ad.capitalize())})
                a.tepki.append({"anim": "animation.aktor.konus", "bas": t, "sure": sure})
        # ---- hareket ----
        for a in aktorler.values():
            onceki = list(a.poz)
            e = a.eylem
            if e and "kacin" in e:
                u = min(1.0, (t - e["bas"]) / e["sure"])
                y = 1 - (1 - u) * (1 - u)
                a.poz = [e["cikis"][0] + e["kacin"][0] * KACIN * y, e["cikis"][1] + e["kacin"][1] * KACIN * y]
                if u >= 1:
                    a.eylem = None
            elif e:
                yerel = (t - e["bas"]) * e["hiz"]          # animasyonun kendi zamani
                n = yerel * TICK
                iz = e["iz"]
                k = min(len(iz) - 1, int(n))
                k2 = min(len(iz) - 1, k + 1)
                w = n - int(n)
                p = [iz[k][j] + (iz[k2][j] - iz[k][j]) * w for j in range(3)]
                on, sg = on_yon(e["aci"]), sag_yon(e["aci"])
                a.poz = [e["cikis"][0] + on[0] * p[1] + sg[0] * p[0],
                         e["cikis"][1] + on[1] * p[1] + sg[1] * p[0]]
                a.z = e["cz"] + (max(0.0, p[2]) if e["dikey"] else 0.0)
                for fi, faz in enumerate(e["fazlar"]):
                    if fi in e["vuruldu"] or yerel < faz["contact"]:
                        continue
                    e["vuruldu"].add(fi)
                    h = e["hedef"]
                    if not h:
                        continue
                    if math.hypot(h.poz[0] - a.poz[0], h.poz[1] - a.poz[1]) > MENZIL:
                        continue
                    hon = on_yon(h.aci)
                    gel = (a.poz[0] - h.poz[0], a.poz[1] - h.poz[1])
                    gb = math.hypot(*gel) or 1
                    savundu = t <= h.savun_bitis and (hon[0] * gel[0] + hon[1] * gel[1]) / gb > 0.3
                    carp = 0.35 if savundu else 1.0
                    guc = ITME * faz.get("hasar", 1) * carp
                    h.itme = [h.itme[0] + on[0] * guc * 6, h.itme[1] + on[1] * guc * 6]
                    efektler.append({"t": t, "tur": "savun" if savundu else "vurus",
                                     "nokta": [h.poz[0], h.poz[1], h.z + 1.2]})
                    if not savundu:
                        h.tepki.append({"anim": "animation.aktor.darbe", "bas": t, "sure": 0.4})
                        if fi == len(e["fazlar"]) - 1:
                            sarsinti.append(t)
                if yerel >= e["sure"] * e["hiz"]:
                    a.eylem = None
                    a.z = 0.0
            elif a.yuru:
                hedef = aktorler[a.yuru["hedef"]].poz if "hedef" in a.yuru else a.yuru["nokta"]
                dur = VARIS if "hedef" in a.yuru else 0.05
                dx, dy = hedef[0] - a.poz[0], hedef[1] - a.poz[1]
                uz = math.hypot(dx, dy)
                if uz <= dur:
                    a.yuru = None
                else:
                    adim = min(a.yuru["hiz"] * dt, uz - dur)
                    a.poz = [a.poz[0] + dx / uz * adim, a.poz[1] + dy / uz * adim]
                    a.aci = yon_aci((0, 0), (dx, dy))
            # geri itilme: sonumlenen hiz
            if abs(a.itme[0]) + abs(a.itme[1]) > 1e-4:
                a.poz = [a.poz[0] + a.itme[0] * dt, a.poz[1] + a.itme[1] * dt]
                a.itme = [a.itme[0] * 0.8, a.itme[1] * 0.8]
            yol = math.hypot(a.poz[0] - onceki[0], a.poz[1] - onceki[1])
            yuruyor = a.eylem is None and yol > 1e-4
            a.mesafe += yol if yuruyor else 0.0
            hedef_h = min(1.3, (yol / dt) / YURU) if yuruyor else 0.0
            a.hizli += (hedef_h - a.hizli) * 0.35
            a.tepki = [r for r in a.tepki if t - r["bas"] <= r["sure"] + GECIS]
            a.kayit.append({"t": t, "x": a.poz[0], "y": a.poz[1], "z": a.z, "aci": a.aci,
                            "eylem": dict(a.eylem) if a.eylem and "anim" in a.eylem else None,
                            "tepki": [dict(r) for r in a.tepki], "mesafe": a.mesafe,
                            "hizli": a.hizli})
    return aktorler, efektler, yazilar, sarsinti


def yazi_suresi(metin):
    return max(2.5, len(metin) * 0.065)


# ============================================================
# 2. POZ -- kemik basina (donus matrisi, konum) katmanlari
# ============================================================
def kanal_pozu(anim, kemik, t):
    b = anim.get("bones", {}).get(kemik)
    if not b:
        return None
    r = B.deger(b["rotation"], t) if "rotation" in b else [0, 0, 0]
    p = B.deger(b["position"], t) if "position" in b else [0, 0, 0]
    o = B.deger(b["scale"], t) if "scale" in b else [1, 1, 1]
    return r, p, o


def durus_animi(a, setler):
    s = setler.get(a.set or "")
    return s.get("durus") if s else None


def kare_pozu(a, k, kemikler, anims, setler):
    """{kemik: (euler_derece, konum_dosya)} ve karisim agirliklari."""
    t = k["t"]
    poz = {}
    temel = durus_animi(a, setler)
    for kem in kemikler:
        v = None
        if temel and temel in anims:
            an = anims[temel]
            uzun = an.get("animation_length", 1.0) or 1.0
            v = kanal_pozu(an, kem, t % uzun)
        poz[kem] = [(v or ([0, 0, 0], [0, 0, 0], [1, 1, 1])), 1.0]
    # yuruyus (oyundaki animation.simsek_bot.yuru formulu)
    h = k["hizli"]
    if h > 0.01:
        # MoLang math.cos derece aliyor: cos(modified_distance_moved * 38.17)
        aci = k["mesafe"] * 38.17
        for kem, isaret, genlik in (("rightLeg", 1, 40), ("leftLeg", -1, 40),
                                     ("rightArm", -1, 30), ("leftArm", 1, 30)):
            if kem in poz:
                r, p, o = poz[kem][0]
                poz[kem][0] = ([r[0] + isaret * math.cos(math.radians(aci)) * genlik * h, r[1], r[2]], p, o)
    katman = []
    e = k["eylem"]
    if e:
        yerel = (t - e["bas"]) * e["hiz"]
        sure = e["sure"] * e["hiz"]
        w = min(1.0, yerel / GECIS, max(0.0, (sure - yerel) / GECIS)) if sure > 0 else 1.0
        katman.append((e["anim"], yerel, max(0.0, w)))
    for r in k["tepki"]:
        yerel = t - r["bas"]
        if r.get("tut"):
            w = min(1.0, yerel / 0.08, max(0.0, (r["sure"] - yerel) / GECIS))
        else:
            w = min(1.0, max(0.0, (r["sure"] + GECIS - yerel) / GECIS))
        katman.append((r["anim"], yerel, max(0.0, min(1.0, w))))
    return poz, katman


# ============================================================
# 3. KAMERA -- cekim.js kameraNoktasi'nin karsiligi
# ============================================================
def kamera_noktasi(aci, A, Bp, ilerleme=0.0):
    """A, Bp: (x, y, z, bakis_acisi). Doner (kamera, bakilan) Blender koordinati."""
    ax, ay, az, aaci = A
    bas = (ax, ay, az + 1.62)
    if Bp:
        bx, by, bz, _ = Bp
        orta = ((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)
        dx, dy = bx - ax, by - ay
        ara = math.hypot(dx, dy) or 1e-6
        eksen = (dx / ara, dy / ara)
    else:
        orta = (ax, ay, az)
        ara = 0.0
        eksen = on_yon(aaci)
    dik = (eksen[1], -eksen[0])
    if aci == "genis":
        u = max(6, ara * 1.6)
        return (orta[0] + dik[0] * u, orta[1] + dik[1] * u, orta[2] + 2.8), (orta[0], orta[1], orta[2] + 1.0)
    if aci == "yan":
        u = max(3.5, ara * 1.1)
        return (orta[0] + dik[0] * u, orta[1] + dik[1] * u, orta[2] + 1.5), (orta[0], orta[1], orta[2] + 1.2)
    if aci == "omuz":
        kam = (ax - eksen[0] * 2.2 + dik[0] * 0.9, ay - eksen[1] * 2.2 + dik[1] * 0.9, az + 2.0)
        bak = (Bp[0], Bp[1], Bp[2] + 1.62) if Bp else (ax + eksen[0] * 5, ay + eksen[1] * 5, az + 1.62)
        return kam, bak
    if aci == "yakin":
        on = eksen if Bp else on_yon(aaci)
        return (bas[0] + on[0] * 1.7, bas[1] + on[1] * 1.7, bas[2] + 0.1), bas
    if aci == "ust":
        return (orta[0] + 0.01, orta[1], orta[2] + 9), orta
    if aci == "dusuk":
        on = eksen if Bp else on_yon(aaci)
        return (ax + on[0] * 2.6 + dik[0] * 0.8, ay + on[1] * 2.6 + dik[1] * 0.8, az + 0.3), (bas[0], bas[1], bas[2] + 0.2)
    if aci == "yorunge":
        r = max(4.5, ara * 1.3)
        a0 = math.atan2(dik[0], dik[1]) + ilerleme * math.pi * 2
        return (orta[0] + math.sin(a0) * r, orta[1] + math.cos(a0) * r, orta[2] + 2.2), (orta[0], orta[1], orta[2] + 1.1)
    if aci == "takip":
        on = on_yon(aaci)
        return (ax - on[0] * 4 + dik[0] * 0.6, ay - on[1] * 4 + dik[1] * 0.6, az + 2.4), (bas[0] + on[0] * 2, bas[1] + on[1] * 2, bas[2])
    raise ValueError("kamera acisi yok: %s" % aci)


def kamera_izi(senaryo, aktorler):
    """Kare basina (kamera, bakilan, lens)."""
    fps = senaryo.get("fps", 24)
    atislar = sorted(senaryo.get("kamera", []), key=lambda c: c["t"])
    kare = len(next(iter(aktorler.values())).kayit)
    cikti = []

    def nokta(c, f):
        k = lambda ad: (lambda r: (r["x"], r["y"], r["z"], r["aci"]))(aktorler[ad].kayit[f]) if ad else None
        sure = c.get("sure", 4.0)
        u = (f / fps - c["t"]) / sure if c["aci"] == "yorunge" else 0.0
        return kamera_noktasi(c["aci"], k(c["a"]), k(c.get("b")), u)

    for f in range(kare):
        t = f / fps
        suan = [c for c in atislar if c["t"] <= t + 1e-9]
        c = suan[-1] if suan else atislar[0]
        kam, bak = nokta(c, f)
        g = c.get("gecis", 0.0)
        if len(suan) >= 2 and g > 0 and t - c["t"] < g:
            eski_k, eski_b = nokta(suan[-2], f)
            u = (t - c["t"]) / g
            u = u * u * (3 - 2 * u)
            kam = tuple(e + (n - e) * u for e, n in zip(eski_k, kam))
            bak = tuple(e + (n - e) * u for e, n in zip(eski_b, bak))
        cikti.append((kam, bak, c.get("lens", 35)))
    return cikti


# ============================================================
# 4. BLENDER
# ============================================================
def blender_filmi(senaryo, klasor, onizleme=False, tek_kare=None):
    import bpy
    from mathutils import Matrix, Quaternion, Vector, Euler

    setler = B.oku(HAREKET)["setler"]
    anims = {}
    anims.update(B.oku(ANIM_WOM)["animations"])
    anims.update(B.oku(ANIM_AKTOR)["animations"])
    aktorler, efektler, yazilar, sarsinti = zaman_cizelgesi(senaryo, setler, anims)
    kam_iz = kamera_izi(senaryo, aktorler)
    fps = senaryo.get("fps", 24)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 6 if onizleme else senaryo.get("ornek", 16)
    sc.cycles.use_denoising = True
    en, boy = senaryo.get("cozunurluk", [1280, 720])
    if onizleme:
        en, boy = en // 2, boy // 2
    sc.render.resolution_x, sc.render.resolution_y = en, boy
    sc.render.fps = fps
    sc.frame_start, sc.frame_end = 1, len(kam_iz)
    sc.render.image_settings.file_format = "PNG"
    # Minecraft'in canli renkleri: AgX/Filmic soldurur, Standard birebir
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = senaryo.get("pozlama", -0.45)
    sc.render.filepath = os.path.join(klasor, "kare", "")

    # ---- gokyuzu + gunes ----
    w = bpy.data.worlds.new("gok")
    w.use_nodes = True
    nt = w.node_tree
    gok = nt.nodes.new("ShaderNodeTexSky")
    try:
        gok.sky_type = "NISHITA"
        gok.sun_elevation = math.radians(senaryo.get("gunes_yukseklik", 35))
    except Exception:
        pass
    nt.links.new(gok.outputs["Color"], nt.nodes["Background"].inputs["Color"])
    nt.nodes["Background"].inputs["Strength"].default_value = senaryo.get("gok_parlaklik", 0.18)
    sc.world = w
    gunes = bpy.data.objects.new("gunes", bpy.data.lights.new("gunes", "SUN"))
    gunes.data.energy = senaryo.get("gunes_guc", 1.7)
    gunes.data.angle = math.radians(2)
    gunes.rotation_euler = (math.radians(55), 0, math.radians(senaryo.get("gunes_yon", 40)))
    sc.collection.objects.link(gunes)

    malz = {}

    def doku_malzemesi(yol, renk=None, isik=0.0):
        anahtar = (yol, renk, isik)
        if anahtar in malz:
            return malz[anahtar]
        m = bpy.data.materials.new(os.path.basename(yol))
        m.use_nodes = True
        n = m.node_tree
        bsdf = n.nodes["Principled BSDF"]
        tex = n.nodes.new("ShaderNodeTexImage")
        dosya = B.yol(yol)
        if renk:
            # Biyom rengi (cimen, yaprak) dokuya ONCEDEN basiliyor: gri tonlu
            # doku + karisim dugumu Blender surumleri arasinda farkli
            # davraniyordu (5.2'de renk tutmadi, cimen sari cikti).
            dosya = boyali_doku(dosya, renk, klasor)
        tex.image = bpy.data.images.load(dosya)
        tex.interpolation = "Closest"
        cikis = tex.outputs["Color"]
        n.links.new(cikis, bsdf.inputs["Base Color"])
        n.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
        bsdf.inputs["Roughness"].default_value = 0.95
        if isik:
            bsdf.inputs["Emission Color"].default_value = (0.78, 0.49, 1.0, 1)
            bsdf.inputs["Emission Strength"].default_value = isik
        malz[anahtar] = m
        return m

    P = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))

    def blender_nokta(p):
        return Vector((p[0] / 16.0, -p[2] / 16.0, p[1] / 16.0))

    # ---- zemin ----
    zemin_kur(bpy, senaryo, doku_malzemesi)
    # ufuk: oyun alaninin otesinde duz, ayni renkte genis zemin
    ufuk = bpy.data.materials.new("ufuk")
    ufuk.use_nodes = True
    ufuk.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.24, 0.42, 0.13, 1)
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, -0.01))
    bpy.context.object.data.materials.append(ufuk)

    # ---- aktorler: kemik bos nesneleri + kup parcalari ----
    geo = B.oku(GEO_AKTOR)
    govde_model = B.Model(geo)
    kok_nesne = {}
    kemik_nesne = {}
    for ad, a in aktorler.items():
        kok = bpy.data.objects.new("aktor_" + ad, None)
        sc.collection.objects.link(kok)
        kok_nesne[ad] = kok
        kn = {}
        for kem, b in govde_model.kemik.items():
            o = bpy.data.objects.new("%s_%s" % (ad, kem), None)
            o.rotation_mode = "QUATERNION"
            sc.collection.objects.link(o)
            kn[kem] = o
        for kem, b in govde_model.kemik.items():
            ana = b.get("parent")
            kn[kem].parent = kn[ana] if ana else kok
        kemik_nesne[ad] = kn
        parcalar = [(govde_model, a.v["skin"], 0.0)]
        if a.v.get("silah") in SILAH:
            g, d = SILAH[a.v["silah"]]
            parcalar.append((B.Model(B.oku(g)), d, 0.0))
        for model, doku, isik in parcalar:
            for kem, b in model.kemik.items():
                yuzler = kemik_kupleri(model, kem)
                if not yuzler:
                    continue
                hedef = kem if kem in kn else (b.get("parent") or "rightItem")
                while hedef not in kn:
                    hedef = model.kemik[hedef].get("parent") or "rightItem"
                me = bpy.data.meshes.new("m")
                ks, ps, uv = [], [], []
                for pts, u in yuzler:
                    i0 = len(ks)
                    ks.extend(blender_nokta(p) for p in pts)
                    ps.append((i0, i0 + 1, i0 + 2, i0 + 3))
                    uv.extend(u)
                me.from_pydata(ks, [], ps)
                lay = me.uv_layers.new()
                for j, dd in enumerate(lay.data):
                    dd.uv = uv[j]
                me.materials.append(doku_malzemesi(doku, isik=isik))
                ob = bpy.data.objects.new("%s_%s_m" % (ad, kem), me)
                sc.collection.objects.link(ob)
                ob.parent = kn[hedef]

    # ---- kareler: kok + kemik anahtarlari ----
    kemikler = list(govde_model.kemik.keys())
    pivot = {k: B.ic(govde_model.kemik[k]["pivot"]) for k in kemikler}

    def yerel(kem, euler, poz_d, olc=(1, 1, 1)):
        R = Matrix(B.bb_mat(euler))
        pv = Vector(pivot[kem])
        pos = Vector((-poz_d[0], poz_d[1], poz_d[2]))
        # Bedrock: olcek pivot etrafinda, donusten once (bedrock_onizleme ile ayni)
        L = (Matrix.Translation(pos) @ Matrix.Translation(pv) @ R.to_4x4()
             @ Matrix.Diagonal((olc[0], olc[1], olc[2], 1)) @ Matrix.Translation(-pv))
        # ic uzay (px) -> Blender (blok)
        P4 = P.to_4x4()
        S = Matrix.Diagonal((1 / 16, 1 / 16, 1 / 16, 1))
        return S @ P4 @ L @ P4.inverted() @ S.inverted()

    for ad, a in aktorler.items():
        kok = kok_nesne[ad]
        kn = kemik_nesne[ad]
        for f, k in enumerate(a.kayit[:len(kam_iz)]):
            kok.location = (k["x"], k["y"], k["z"])
            kok.rotation_euler = (0, 0, math.radians(k["aci"]))
            kok.keyframe_insert("location", frame=f + 1)
            kok.keyframe_insert("rotation_euler", frame=f + 1)
            poz, katman = kare_pozu(a, k, kemikler, anims, setler)
            for kem in kemikler:
                (eu, ps, ol), _ = poz[kem]
                l, q, o3 = yerel(kem, eu, ps, ol).decompose()
                for an, t_an, wgt in katman:
                    if an not in anims or wgt <= 0:
                        continue
                    v = kanal_pozu(anims[an], kem, t_an)
                    if not v:
                        continue
                    l2, q2, o2 = yerel(kem, v[0], v[1], v[2]).decompose()
                    q = q.slerp(q2, wgt)
                    l = l.lerp(l2, wgt)
                    o3 = o3.lerp(o2, wgt)
                o = kn[kem]
                o.rotation_quaternion = q
                o.location = l
                o.scale = o3
                o.keyframe_insert("rotation_quaternion", frame=f + 1)
                o.keyframe_insert("location", frame=f + 1)
                o.keyframe_insert("scale", frame=f + 1)

    # ---- kivilcimlar ----
    kivilcim_kur(bpy, efektler, fps, doku_malzemesi)

    # ---- kamera ----
    kam = bpy.data.objects.new("kamera", bpy.data.cameras.new("kamera"))
    sc.collection.objects.link(kam)
    sc.camera = kam
    kam.data.clip_start = 0.05
    rnd = random.Random(7)
    for f, (kp, bk, lens) in enumerate(kam_iz):
        t = f / fps
        sars = sum(max(0.0, 1 - (t - s) / 0.3) for s in sarsinti if 0 <= t - s < 0.3)
        titre = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.06 * sars
        kam.location = Vector(kp) + titre
        kam.rotation_euler = (Vector(bk) - Vector(kp)).to_track_quat("-Z", "Y").to_euler()
        kam.data.lens = lens
        kam.keyframe_insert("location", frame=f + 1)
        kam.keyframe_insert("rotation_euler", frame=f + 1)
        kam.data.keyframe_insert("lens", frame=f + 1)

    os.makedirs(os.path.join(klasor, "kare"), exist_ok=True)
    if tek_kare:
        sc.frame_start = sc.frame_end = tek_kare
    bpy.ops.render.render(animation=True)
    with open(os.path.join(klasor, "yazilar.json"), "w", encoding="utf-8") as fh:
        json.dump({"fps": fps, "yazilar": yazilar, "kare": len(kam_iz)}, fh, ensure_ascii=False)


def boyali_doku(dosya, renk, klasor):
    """Dokunun biyom rengiyle carpilmis kopyasi (Blender'in kendi resim
    islemleriyle -- Blender'in Python'unda PIL yok)."""
    import bpy
    hedef_k = os.path.join(klasor, "_doku")
    os.makedirs(hedef_k, exist_ok=True)
    hedef = os.path.join(hedef_k, "%s_%d%d%d.png" % (os.path.splitext(os.path.basename(dosya))[0],
                                                     *[int(c * 100) for c in renk]))
    if not os.path.exists(hedef):
        im = bpy.data.images.load(dosya)
        px = list(im.pixels[:])
        for k in range(0, len(px), 4):
            px[k] *= renk[0]; px[k + 1] *= renk[1]; px[k + 2] *= renk[2]
        yeni = bpy.data.images.new("boya", im.size[0], im.size[1], alpha=True)
        yeni.pixels = px
        yeni.filepath_raw = hedef
        yeni.file_format = "PNG"
        yeni.save()
    return hedef


def kemik_kupleri(model, kem):
    """Tek kemigin kupleri, DINLENME pozunda, ic uzayda (kemik zinciri yok)."""
    b = model.kemik[kem]
    tek = B.Model({"minecraft:geometry": [{"description": {"texture_width": model.tw,
                                                            "texture_height": model.th},
                                           "bones": [dict(b, parent=None, rotation=[0, 0, 0])]}]})
    return B.kupler(tek)


def zemin_kur(bpy, senaryo, doku_malzemesi):
    z = senaryo.get("zemin", {})
    n = int(z.get("boyut", 40))
    yol = MCPREP_DOKU
    if not yol or not os.path.isdir(yol):
        m = bpy.data.materials.new("zemin")
        m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.3, 0.45, 0.22, 1)
        bpy.ops.mesh.primitive_plane_add(size=n)
        bpy.context.object.data.materials.append(m)
        return
    cimen = (0.49, 0.73, 0.30)
    ks, ps, uv, mi = [], [], [], []
    h = n // 2
    for x in range(-h, h):
        for y in range(-h, h):
            i0 = len(ks)
            ks += [(x, y, 0), (x + 1, y, 0), (x + 1, y + 1, 0), (x, y + 1, 0)]
            ps.append((i0, i0 + 1, i0 + 2, i0 + 3))
            uv += [(0, 0), (1, 0), (1, 1), (0, 1)]
    me = bpy.data.meshes.new("zemin")
    me.from_pydata(ks, [], ps)
    lay = me.uv_layers.new()
    for j, d in enumerate(lay.data):
        d.uv = uv[j]
    me.materials.append(doku_malzemesi(os.path.join(yol, "grass_block_top.png"), renk=cimen))
    ob = bpy.data.objects.new("zemin", me)
    bpy.context.scene.collection.objects.link(ob)
    # agaclar: govde + yaprak kupleri, oyun alaninin disinda
    rnd = random.Random(z.get("tohum", 3))
    for _ in range(int(z.get("agac", 6))):
        while True:
            ax, ay = rnd.randint(-h + 2, h - 3), rnd.randint(-h + 2, h - 3)
            if math.hypot(ax, ay) > 9:
                break
        boy = rnd.randint(4, 6)
        for k in range(boy):
            kup(bpy, (ax, ay, k), doku_malzemesi(os.path.join(yol, "oak_log.png")))
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                for dz in (boy - 1, boy):
                    if abs(dx) == 2 and abs(dy) == 2:
                        continue
                    kup(bpy, (ax + dx, ay + dy, dz),
                        doku_malzemesi(os.path.join(yol, "oak_leaves.png"), renk=(0.35, 0.62, 0.22)))
        kup(bpy, (ax, ay, boy + 1), doku_malzemesi(os.path.join(yol, "oak_leaves.png"), renk=(0.35, 0.62, 0.22)))


def kup(bpy, p, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(p[0] + 0.5, p[1] + 0.5, p[2] + 0.5))
    ob = bpy.context.object
    ob.data.materials.append(m)
    ob.data.uv_layers.active.data.foreach_set(
        "uv", [c for i in range(6) for c in (0, 0, 1, 0, 1, 1, 0, 1)])


def kivilcim_kur(bpy, efektler, fps, doku_malzemesi):
    if not efektler:
        return
    m = bpy.data.materials.new("kivilcim")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Emission Strength"].default_value = 12.0
    m2 = m.copy()
    b.inputs["Emission Color"].default_value = (1.0, 0.85, 0.5, 1)
    m2.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (0.6, 0.8, 1.0, 1)
    rnd = random.Random(11)
    for e in efektler:
        for _ in range(10):
            bpy.ops.mesh.primitive_cube_add(size=0.07, location=e["nokta"])
            ob = bpy.context.object
            ob.data.materials.append(m2 if e["tur"] == "savun" else m)
            f0 = int(e["t"] * fps) + 1
            yon = (rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0, 1.2))
            ob.scale = (0, 0, 0)
            ob.keyframe_insert("scale", frame=f0 - 1)
            ob.scale = (1, 1, 1)
            ob.keyframe_insert("scale", frame=f0)
            ob.keyframe_insert("location", frame=f0)
            ob.location = tuple(e["nokta"][i] + yon[i] * 0.6 for i in range(3))
            ob.scale = (0, 0, 0)
            ob.keyframe_insert("location", frame=f0 + int(0.3 * fps))
            ob.keyframe_insert("scale", frame=f0 + int(0.3 * fps))


# ============================================================
# 5. ALTYAZI + VIDEO (Blender disinda da calisir)
# ============================================================
def altyazi_bas(klasor):
    from PIL import Image, ImageDraw, ImageFont
    bilgi = json.load(open(os.path.join(klasor, "yazilar.json"), encoding="utf-8"))
    fps = bilgi["fps"]
    kareler = sorted(f for f in os.listdir(os.path.join(klasor, "kare")) if f.endswith(".png"))
    os.makedirs(os.path.join(klasor, "altyazili"), exist_ok=True)
    for i, ad in enumerate(kareler):
        t = i / fps
        im = Image.open(os.path.join(klasor, "kare", ad)).convert("RGB")
        W, H = im.size
        d = ImageDraw.Draw(im, "RGBA")
        for y in bilgi["yazilar"]:
            if not (y["t"] <= t < y["t"] + y["sure"]):
                continue
            yerel = t - y["t"]
            alfa = int(255 * min(1.0, yerel / 0.25, (y["sure"] - yerel) / 0.25))
            if y["tur"] == "baslik":
                f = ImageFont.truetype(YAZI_TIPI, int(H * 0.12))
                g = d.textlength(y["metin"], font=f)
                d.text(((W - g) / 2 + 3, H * 0.38 + 3), y["metin"], font=f, fill=(0, 0, 0, alfa // 2))
                d.text(((W - g) / 2, H * 0.38), y["metin"], font=f, fill=(255, 255, 255, alfa))
                continue
            f = ImageFont.truetype(YAZI_TIPI, int(H * 0.045))
            parcalar = ([(y["isim"] + ": ", (255, 214, 90, alfa))] if y["tur"] == "soyle" else []) + \
                       [(y["metin"], (255, 255, 255, alfa) if y["tur"] == "soyle" else (220, 220, 220, alfa))]
            toplam = sum(d.textlength(p, font=f) for p, _ in parcalar)
            x0 = (W - toplam) / 2
            yy = H * 0.86
            pad = H * 0.012
            d.rectangle([x0 - pad * 2, yy - pad, x0 + toplam + pad * 2, yy + H * 0.045 + pad * 1.6],
                        fill=(0, 0, 0, int(alfa * 0.55)))
            for p, renk in parcalar:
                d.text((x0, yy), p, font=f, fill=renk)
                x0 += d.textlength(p, font=f)
        im.save(os.path.join(klasor, "altyazili", ad))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps),
                    "-i", os.path.join(klasor, "altyazili", "%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                    os.path.join(klasor, "film.mp4")], check=True)


if __name__ == "__main__":
    arg = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    klasor = os.path.abspath(arg[1])
    if "--yazi" in arg:                     # yalniz altyazi + video (Blender'siz)
        altyazi_bas(klasor)
    else:
        tek = int(arg[arg.index("--kare") + 1]) if "--kare" in arg else None
        blender_filmi(B.oku(os.path.abspath(arg[0])), klasor, "--onizleme" in arg, tek)
