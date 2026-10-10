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
import film_poz  # noqa: E402

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
POZ_GIRIS = 0.15              # poz katmaninin yumusak girisi (sn)
CARPISMA_ARA = 1.05           # iki aktorun merkezleri arasi en az (blok)
DONUS_HIZI = 540.0            # derece/sn -- "bak" ve yon degisimi tek karede olmuyordu
_POZLAR = None


def film_pozlari():
    """arac/film_poz.py'nin pozlari (bir kez hesaplanir)."""
    global _POZLAR
    if _POZLAR is None:
        _POZLAR = film_poz.pozlar()
    return _POZLAR


def zaman_haritasi(senaryo):
    """Film karesi -> hikaye zamani. "zaman": [{"t", "sure", "hiz"}] parcalari
    hikayenin o araligini yavaslatir (hiz 0.25 = dort kat agir cekim, 0.02 =
    vurusta donma). Olaylar, kamera kesmeleri ve fizik HIKAYE zamaninda;
    altyazi ve ses FILM zamaninda (kare / fps)."""
    fps = senaryo.get("fps", 24)
    parca = senaryo.get("zaman", [])
    sure = senaryo["sure"]

    def hiz(t):
        h = 1.0
        for z in parca:
            if z["t"] <= t < z["t"] + z["sure"]:
                h = min(h, max(0.01, float(z["hiz"])))
        return h
    harita, t = [0.0], 0.0
    while t < sure - 1e-9:
        t = min(sure, t + hiz(t) / fps)
        harita.append(t)
    return harita


def esya_anahtarlari(kayit, esya="kagit"):
    """Eldeki esyanin gorunurluk anahtarlari: [(film_karesi, acik)].
    Ilk karede HER ZAMAN anahtar var. Eskiden yalniz degisimde yaziliyordu;
    ilk karede esya yokken anahtar yazilmiyor, ilk anahtar "acik" oluyor ve
    Blender onu geriye uzatip kagidi 1. kareden gosteriyordu (v1 tam
    kalite cizimi: El-Harkos'un elinde acilistan itibaren beyaz tahta)."""
    cikti, onceki = [], object()
    for f, k in enumerate(kayit):
        e = k.get("esya")
        if e != onceki:
            cikti.append((f + 1, e == esya))
            onceki = e
    return cikti


def kare_bul(harita, t):
    """Hikaye zamani t'nin ilk gorundugu film karesi."""
    import bisect
    return min(len(harita) - 1, bisect.bisect_left(harita, t - 1e-9))


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
        self.taban_z = float(v.get("z", 0.0))   # cukurda yatan aktor: zemin altinda
        self.z = self.taban_z
        self.gorunur = not v.get("gizli", False)
        self.esya = None         # sol eldeki esya ("kagit")
        # bekleme animasyonu: None -> setin kendi durusu; "durus" olayiyla
        # degisir (Baris dovus disinda olum melegi tutusu, dovuste Antitheus)
        self.durus = v.get("durus")
        # silah gorunur mu: "silah_gizli" ile baslar, "silah_goster" olayiyla
        # degisir (Baris'in tirpani guc uyaninca gelir -- kullanici)
        self.silah_gorunur = not v.get("silah_gizli", False)
        self.durus_onceki, self.durus_t = None, -99.0
        self.hedef_aci = None    # donus: aci buna DONUS_HIZI ile yaklasir


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
    harita = zaman_haritasi(senaryo)
    pozlar = film_pozlari()
    aktorler = {ad: Aktor(ad, v, setler) for ad, v in senaryo["aktorler"].items()}

    def carpisma_coz(a, onceki):
        _carpisma(a, onceki, aktorler)
    for a in aktorler.values():
        hedef = a.v.get("bak")
        if isinstance(hedef, str) and hedef in aktorler:
            a.aci = yon_aci(a.poz, aktorler[hedef].poz)
        elif isinstance(hedef, (int, float)):
            a.aci = float(hedef)
    olaylar = sorted(senaryo.get("olaylar", []), key=lambda o: o["t"])
    efektler, yazilar, sarsinti = [], [], []
    i = 0
    for f, t in enumerate(harita):
        dt = t - harita[f - 1] if f else 1.0 / fps
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
            if "efekt" in o:
                efektler.append({"t": o["t"], "tur": o["efekt"], "nokta": list(o["nokta"])})
            if "aktor" not in o:
                continue                      # sahne olayi (kapi, goz): Blender kurucusu okur
            a = aktorler[o["aktor"]]
            if "bak" in o:
                h = o["bak"]
                if isinstance(h, str):
                    a.hedef_aci = yon_aci(a.poz, aktorler[h].poz)
                elif isinstance(h, (list, tuple)):
                    a.hedef_aci = yon_aci(a.poz, h)    # bir noktaya bak (cukur)
                else:
                    a.hedef_aci = float(h)
            if "gizle" in o:
                a.gorunur = False
            if "goster" in o:
                a.gorunur = True
            if "isinlan" in o:
                # mor flas eski yerde, yeni yerde belirme (gucun gostergesi)
                efektler.append({"t": t, "tur": "isik", "nokta": [a.poz[0], a.poz[1], a.z + 1.0]})
                a.poz = [float(o["isinlan"][0]), float(o["isinlan"][1])]
                a.itme = [0.0, 0.0]
                efektler.append({"t": t, "tur": "isik", "nokta": [a.poz[0], a.poz[1], a.z + 1.0]})
                if isinstance(o.get("yuz"), str):
                    a.aci = yon_aci(a.poz, aktorler[o["yuz"]].poz)   # belirdigi an yuzu donuk
                    a.hedef_aci = None
            if "esya" in o:
                a.esya = o["esya"]
            if "silah_goster" in o:
                a.silah_gorunur = bool(o["silah_goster"])
            if "durus" in o:
                a.durus_onceki, a.durus_t = a.durus or "_set", t
                a.durus = o["durus"]
            if "z" in o:
                a.taban_z = a.z = float(o["z"])   # cukura dustu
            if "poz" in o:
                ad_p = film_poz.ONEK + o["poz"]
                if ad_p not in pozlar:
                    raise ValueError("film pozu yok: %s" % o["poz"])
                hz = float(o.get("hiz", 1.0))
                uz = pozlar[ad_p]["animation_length"] / hz
                # "atla": poz bu kadar saniye ONCE baslamis gibi (film Baris
                # zaten yerde yatarken acilir -- dususu gorunmez)
                a.tepki.append({"anim": ad_p, "bas": t - float(o.get("atla", 0.0)), "hiz": hz, "ad": o["poz"],
                                "sure": 1e6 if o.get("tut") else uz,
                                "tut": True, "giris": float(o.get("giris", POZ_GIRIS))})
            if "poz_bitir" in o:
                for rr in a.tepki:
                    if rr.get("ad") and (o["poz_bitir"] is True or rr["ad"] == o["poz_bitir"]):
                        rr["sure"] = min(rr["sure"], t - rr["bas"] + GECIS)
            if "git" in o:
                g = o["git"]
                a.yuru = ({"hedef": g} if isinstance(g, str) else {"nokta": [float(g[0]), float(g[1])]})
                a.yuru["hiz"] = float(o["adim"]) if "adim" in o else (KOS if o.get("kos") else YURU)
            if "vur" in o:
                hedef = aktorler.get(o.get("hedef")) if o.get("hedef") else None
                vur_aci = yon_aci(a.poz, hedef.poz) if hedef else (a.hedef_aci if a.hedef_aci is not None else a.aci)
                a.hedef_aci = vur_aci
                s = vurus_sec(setler, o.get("set") or a.set, o["vur"], a, t)
                hiz = float(o.get("hiz", 1.0))
                a.eylem = {"anim": s["anim"], "bas": t, "sure": s["sure"] / hiz, "hiz": hiz,
                           "iz": s["iz"], "cikis": list(a.poz), "cz": a.z, "aci": vur_aci,
                           "dikey": o["vur"] == "hava" or s.get("dikey", False),
                           "fazlar": s["fazlar"], "hedef": hedef, "vuruldu": set(),
                           "kan": bool(o.get("kan")), "dusur": o.get("dusur"),
                           "iz_carpan": float(o.get("hamle", 1.0))}
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
                                "isim": a.v.get("isim", a.ad.capitalize())})   # "" -> isimsiz (ana kotu)
                a.tepki.append({"anim": "animation.aktor.konus", "bas": t, "sure": sure})
        # ---- donus: ani degil, en kisa yoldan DONUS_HIZI ile ----
        for a in aktorler.values():
            if a.hedef_aci is None:
                continue
            fark_ = (a.hedef_aci - a.aci + 180.0) % 360.0 - 180.0
            adim_ = DONUS_HIZI * dt
            if abs(fark_) <= adim_:
                a.aci, a.hedef_aci = a.aci + fark_, None
            else:
                a.aci += math.copysign(adim_, fark_)
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
                ic_ = e.get("iz_carpan", 1.0)
                ham = [e["cikis"][0] + (on[0] * p[1] + sg[0] * p[0]) * ic_,
                       e["cikis"][1] + (on[1] * p[1] + sg[1] * p[0]) * ic_]
                # ARTISLA: engelde duran aktorde hamlenin kalani birikmesin
                # (mutlak konum rakibin otesinde birikip bir karede 1.7 blok
                # yana isinlaniyordu -- kamera denetimi yakaladi)
                eski = e.get("ham", e["cikis"])
                a.poz = [a.poz[0] + ham[0] - eski[0], a.poz[1] + ham[1] - eski[1]]
                e["ham"] = ham
                a.z = e["cz"] + (max(0.0, p[2]) if e["dikey"] else 0.0)
                # temas yonu GERCEK konumdan: hamle rakibin otesine gecemez
                carpisma_coz(a, onceki)
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
                    tur = "savun" if savundu else ("kan" if e.get("kan") else "vurus")
                    efektler.append({"t": t, "tur": tur, "yon": list(on), "kim": a.ad, "hedef": h.ad,
                                     "nokta": [h.poz[0] - on[0] * 0.3, h.poz[1] - on[1] * 0.3, h.z + 1.15]})
                    if not savundu:
                        son = fi == len(e["fazlar"]) - 1
                        if son and e.get("dusur"):
                            ad_p = film_poz.ONEK + e["dusur"]
                            h.tepki.append({"anim": ad_p, "bas": t, "hiz": 1.0, "ad": e["dusur"],
                                            "sure": 1e6, "tut": True, "giris": 0.06})
                        else:
                            h.tepki.append({"anim": "animation.aktor.darbe", "bas": t, "sure": 0.4})
                        if son:
                            sarsinti.append(t)
                if yerel >= e["sure"] * e["hiz"]:
                    a.eylem = None
                    a.z = a.taban_z
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
                    a.hedef_aci = yon_aci((0, 0), (dx, dy))
            # geri itilme: sonumlenen hiz
            if abs(a.itme[0]) + abs(a.itme[1]) > 1e-4:
                a.poz = [a.poz[0] + a.itme[0] * dt, a.poz[1] + a.itme[1] * dt]
                a.itme = [a.itme[0] * 0.8, a.itme[1] * 0.8]
            carpisma_coz(a, onceki)
            yol = math.hypot(a.poz[0] - onceki[0], a.poz[1] - onceki[1])
            yuruyor = a.eylem is None and yol > 1e-4
            a.mesafe += yol if yuruyor else 0.0
            hedef_h = min(1.3, (yol / dt) / YURU) if yuruyor else 0.0
            a.hizli += (hedef_h - a.hizli) * 0.35
            a.tepki = [r for r in a.tepki if t - r["bas"] <= r["sure"] + GECIS]
            a.kayit.append({"t": t, "x": a.poz[0], "y": a.poz[1], "z": a.z, "aci": a.aci,
                            "eylem": dict(a.eylem) if a.eylem and "anim" in a.eylem else None,
                            "tepki": [dict(r) for r in a.tepki], "mesafe": a.mesafe,
                            "hizli": a.hizli, "gorunur": a.gorunur, "esya": a.esya, "durus": a.durus,
                            "durus_onceki": a.durus_onceki, "durus_t": a.durus_t,
                            "silah": a.silah_gorunur})
    # altyazi FILM zamaninda: agir cekimde yazi da uzun kalir
    for y in yazilar:
        y["t"] = kare_bul(harita, y["t"]) / fps
    return aktorler, efektler, yazilar, sarsinti


def _parca_kesiyor(p0, p1, c, r):
    """p0->p1 dogru parcasi c merkezli r yaricapli daireye giriyor mu."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    L = dx * dx + dy * dy
    if L < 1e-12:
        return False
    u = ((c[0] - p0[0]) * dx + (c[1] - p0[1]) * dy) / L
    if u <= 0.0 or u >= 1.0:
        return False                      # en yakin nokta uclarda: ici gecmedi
    return math.hypot(p0[0] + dx * u - c[0], p0[1] + dy * u - c[1]) < r


def _carpisma(a, onceki, aktorler):
    # carpisma: gorunur iki aktor 0.75 bloktan yakin olamaz (hamle izi
    # Baris'i El-Harkos'un ICINDEN geciriyordu -- onizlemede goruldu;
    # oyunda varlik carpismasi zaten bunu engelliyor)
    if a.gorunur:
        for b2 in aktorler.values():
            if b2 is a or not b2.gorunur:
                continue
            d_eski = math.hypot(onceki[0] - b2.poz[0], onceki[1] - b2.poz[1])
            d_yeni = math.hypot(a.poz[0] - b2.poz[0], a.poz[1] - b2.poz[1])
            gecti = d_eski >= CARPISMA_ARA * 0.999 and _parca_kesiyor(onceki, a.poz, b2.poz, CARPISMA_ARA)
            if (d_yeni < CARPISMA_ARA and d_yeni < d_eski) or gecti:
                # GELDIGI taraftan temas noktasinda durur: hamle tek karede
                # rakibin otesine gecebiliyor; yeni konuma gore cozmek onu
                # arkaya isinliyordu (kamera denetimi yakaladi)
                dx, dy = onceki[0] - b2.poz[0], onceki[1] - b2.poz[1]
                d = math.hypot(dx, dy) or 1.0
                a.poz = [b2.poz[0] + dx / d * CARPISMA_ARA, b2.poz[1] + dy / d * CARPISMA_ARA]


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


def durus_animi(a, setler, k=None, ad=None):
    """Bekleme animasyonu: kayittaki "durus" (ya da verilen ad); yoksa ya
    da "_set" ise setin kendi durusu."""
    ad = ad if ad is not None else (k.get("durus") if k else None)
    if ad and ad != "_set":
        return ad
    s = setler.get(a.set or "")
    return s.get("durus") if s else None


DURUS_GECIS = 0.35      # sn -- bekleme durusu degisince yumusak gecis (silah sicramasin)


NEFES_SURE = 3.6        # sn -- duran karakterin nefes dongusu
NEFES_BAS, NEFES_GOVDE, NEFES_KOL = 1.4, 0.7, 1.2   # derece


def kare_pozu(a, k, kemikler, anims, setler):
    """{kemik: (euler_derece, konum_dosya)} ve karisim agirliklari."""
    t = k["t"]
    poz = {}
    temel = durus_animi(a, setler, k)
    eski, w_eski = None, 0.0
    if k.get("durus_onceki") and t - k.get("durus_t", -99) < DURUS_GECIS:
        eski = durus_animi(a, setler, ad=k["durus_onceki"])
        u = (t - k["durus_t"]) / DURUS_GECIS
        w_eski = 1.0 - u * u * (3 - 2 * u)
    for kem in kemikler:
        v = None
        if temel and temel in anims:
            an = anims[temel]
            uzun = an.get("animation_length", 1.0) or 1.0
            v = kanal_pozu(an, kem, t % uzun)
        if eski and eski in anims and w_eski > 0:
            an = anims[eski]
            ve = kanal_pozu(an, kem, t % (an.get("animation_length", 1.0) or 1.0)) or ([0, 0, 0], [0, 0, 0], [1, 1, 1])
            vy = v or ([0, 0, 0], [0, 0, 0], [1, 1, 1])
            v = tuple([vy[j][i] * (1 - w_eski) + ve[j][i] * w_eski for i in range(3)] for j in range(3))
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
    # nefes: duran karakter heykel gibi durmasin (kullanici: "hareketler
    # donuk gibi"). Bas ve govde; kollar yalniz silahsizda (iki elle tutus
    # bozulmasin). Yururken soner. Faz aktore gore: herkes ayni anda solumaz.
    nef = max(0.0, 1.0 - min(1.0, h))
    if nef > 0:
        faz = (sum(map(ord, str(a.v.get("skin", "")) + str(a.v.get("isim", "")))) % 97) / 97 * 2 * math.pi
        sn = math.sin(2 * math.pi * t / NEFES_SURE + faz)
        ekler = [("head", NEFES_BAS, 0), ("body", NEFES_GOVDE, 0)]
        if not a.v.get("silah"):
            ekler += [("rightArm", NEFES_KOL, 2), ("leftArm", -NEFES_KOL, 2)]
        for kem, gen, eks in ekler:
            if kem in poz:
                r, p, o = poz[kem][0]
                r = list(r)
                r[eks] += gen * sn * nef
                poz[kem][0] = (r, p, o)
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
            w = min(1.0, yerel / r.get("giris", 0.08), max(0.0, (r["sure"] - yerel) / GECIS))
        else:
            w = min(1.0, max(0.0, (r["sure"] + GECIS - yerel) / GECIS))
        katman.append((r["anim"], yerel * r.get("hiz", 1.0), max(0.0, min(1.0, w))))
    return poz, katman


# ============================================================
# 3. KAMERA -- cekim.js kameraNoktasi'nin karsiligi
# ============================================================
def kamera_noktasi(aci, A, Bp, ilerleme=0.0, taraf=1, a0=None):
    """A, Bp: (x, y, z, bakis_acisi). Doner (kamera, bakilan) Blender koordinati.
    taraf: -1 kamerayi a->b ekseninin obur yanina alir (180 derece kilidi
    kamera_izi'de). a0: yorungenin baslangic acisi (cekim basinda sabit)."""
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
    dik = (eksen[1] * taraf, -eksen[0] * taraf)
    if aci == "genis":
        u = max(6, ara * 1.6)
        return (orta[0] + dik[0] * u, orta[1] + dik[1] * u, orta[2] + 2.8), (orta[0], orta[1], orta[2] + 1.0)
    if aci == "yan":
        # 1.5: kacan/hamle yapan aktor yumusak takipte de kadrajda kalsin
        u = max(3.8, ara * 1.6)
        return (orta[0] + dik[0] * u, orta[1] + dik[1] * u, orta[2] + 1.5), (orta[0], orta[1], orta[2] + 1.2)
    if aci == "omuz":
        # yanal 1.6 / geri 2.0: B'ye bakis cizgisi A'nin yanindan en az
        # 0.55 blok gecer (gövde yari genisligi 0.25 + kol). 0.9 / 2.2'de
        # 0.29'du: B, A'nin omzunun ARKASINDA kaliyordu (onizleme).
        # aktorler yakinken (1 blok) 1.6 yetmiyordu: yanal kayma B'ye bakis
        # cizgisini A'dan en az 0.75 blok uzak tutacak kadar (1.6-2.4)
        yanal = min(2.4, max(1.6, 0.75 * (2.0 + ara) / max(ara, 0.5)))
        kam = (ax - eksen[0] * 2.0 + dik[0] * yanal, ay - eksen[1] * 2.0 + dik[1] * yanal, az + 2.0)
        bak = (Bp[0], Bp[1], Bp[2] + 1.62) if Bp else (ax + eksen[0] * 5, ay + eksen[1] * 5, az + 1.62)
        return kam, bak
    if aci == "yakin":
        on = eksen if Bp else on_yon(aaci)
        return (bas[0] + on[0] * 2.0, bas[1] + on[1] * 2.0, bas[2] + 0.1), (bas[0], bas[1], bas[2] - 0.15)
    if aci == "ust":
        return (orta[0] + 0.01, orta[1], orta[2] + 9), orta
    if aci == "dusuk":
        if Bp:
            # YANDAN alcak: A'nin onune 2.6 blok koymak, dovus mesafesinde
            # (1-2 blok) kamerayi B'nin ARKASINA atiyordu -- B kadraji kapatti.
            # bakis A'nin basi ile B arasina (A'ya yakin): yalniz A'nin basina
            # bakinca B kadraj kenarina kaciyordu (ilk delisin ikinci acisi)
            return ((ax + eksen[0] * 0.5 + dik[0] * 2.5, ay + eksen[1] * 0.5 + dik[1] * 2.5, az + 0.3),
                    (ax * 0.6 + bx * 0.4, ay * 0.6 + by * 0.4, bas[2] + 0.1))
        on = on_yon(aaci)
        return (ax + on[0] * 2.6 + dik[0] * 0.8, ay + on[1] * 2.6 + dik[1] * 0.8, az + 0.3), (bas[0], bas[1], bas[2] + 0.2)
    if aci == "yorunge":
        r = max(4.5, ara * 1.3)
        a0 = (math.atan2(dik[0], dik[1]) if a0 is None else a0) + ilerleme * math.pi * 2
        return (orta[0] + math.sin(a0) * r, orta[1] + math.cos(a0) * r, orta[2] + 2.2), (orta[0], orta[1], orta[2] + 1.1)
    if aci == "takip":
        on = on_yon(aaci)
        return (ax - on[0] * 4 + dik[0] * 0.6, ay - on[1] * 4 + dik[1] * 0.6, az + 2.4), (bas[0] + on[0] * 2, bas[1] + on[1] * 2, bas[2])
    if aci == "goz":
        # aktorun gozunden (POV): bakilan B ya da baktigi yon. Kamera BAKIS
        # yonunde basin disina konur: aktor hedefe donerken (540 derece/sn)
        # yuzunun yonuyle konmus kamera kendi kafasinin icinde kaliyordu.
        bak = (Bp[0], Bp[1], Bp[2] + 0.3) if Bp else (ax + on_yon(aaci)[0] * 5, ay + on_yon(aaci)[1] * 5, az + 1.0)
        bx_, by_ = bak[0] - ax, bak[1] - ay
        n_ = math.hypot(bx_, by_) or 1e-6
        on = (bx_ / n_, by_ / n_)
        kam = (ax + on[0] * 0.4, ay + on[1] * 0.4, az + 1.55)
        return kam, bak
    if aci == "yakin_on":
        # aktorun yuzune, kendi baktigi yonden (B'siz yakin plan)
        on = on_yon(aaci)
        # 2 blok: bas + omuzlar (1.4'te yuz kadraji tasiyordu -- onizleme)
        return (bas[0] + on[0] * 2.2, bas[1] + on[1] * 2.2, bas[2] + 0.05), (bas[0], bas[1], bas[2] - 0.15)
    raise ValueError("kamera acisi yok: %s" % aci)


KAMERA_TAKIP = 0.12           # s -- hareketli cekimde kameranin yumusak takip suresi
KAMERA_SABIT = {"elle", "goz", "ust"}


def kamera_izi(senaryo, aktorler):
    """Kare basina (kamera, bakilan, lens, yatik_derece, odak_aktor|None).
    Kesme zamanlari HIKAYE zamaninda (agir cekimle uyumlu).
    Atis alanlari: aci, a, b, gecis, lens, yatik (derece, ufku egik),
    odak (aktor adi: alan derinligi o aktore), kam/bak (aci "elle":
    mutlak Blender noktalari; bak aktor adi da olabilir), kaydir
    ([dx, dy, dz] /sn: elle atista yavas kayma), hedef ([x, y, z]:
    "goz" acisinda bakilan nokta), taraf (+1/-1: 180 derece kilidini ez).

    v7.99.10 (kamera denetimi + onizleme):
      * 180 KILIDI: iki kisilik cekimde kamera, o cift icin ilk kurulan
        tarafta kalir (senaryo "kural180_serbest" araliginda serbest).
        Ilk surumde a/b sirasi degisen her cekim eksenin obur yanina
        geciyordu.
      * YORUNGE acisi cekim basinda sabitlenir (aktorler hareket edince
        ziplamasin).
      * YUMUSAK TAKIP: hareketli cekimlerde kamera ve bakis noktasi
        KAMERA_TAKIP surede yetisir (hamlede kamera bir karede metrelerce
        sicriyordu); her kesmede sifirlanir."""
    fps = senaryo.get("fps", 24)
    atislar = sorted(senaryo.get("kamera", []), key=lambda c: c["t"])
    kare = len(next(iter(aktorler.values())).kayit)
    harita = zaman_haritasi(senaryo)
    serbest = senaryo.get("kural180_serbest", [])
    cikti = []
    taraflar, atis_ayar = {}, {}

    def kayit(ad, f):
        r = aktorler[ad].kayit[min(f, len(aktorler[ad].kayit) - 1)]
        return (r["x"], r["y"], r["z"], r["aci"])

    def taraf_isareti(a, b, kp):
        ex, ey = b[0] - a[0], b[1] - a[1]
        return 1 if ex * (kp[1] - a[1]) - ey * (kp[0] - a[0]) > 0 else -1

    def nokta(c, f, no):
        tt = harita[min(f, len(harita) - 1)]
        if c["aci"] == "elle":
            ge = tt - c["t"]
            kd = c.get("kaydir", [0, 0, 0])
            kam = tuple(c["kam"][i] + kd[i] * ge for i in range(3))
            b = c["bak"]
            if isinstance(b, str):
                r = aktorler[b].kayit[f]
                b = (r["x"], r["y"], r["z"] + c.get("bak_yuks", 1.3))
            return kam, tuple(b)
        A = kayit(c["a"], f) if c.get("a") else None
        B_ = kayit(c["b"], f) if c.get("b") else None
        if c["aci"] == "goz" and c.get("hedef"):
            h = c["hedef"]
            B_ = (h[0], h[1], h[2] - 0.3, 0)
        ay = atis_ay(c, f, no, A, B_)
        u = (tt - c["t"]) / c.get("sure", 4.0) if c["aci"] == "yorunge" else 0.0
        kam, bak = kamera_noktasi(c["aci"], A, B_, u, ay["taraf"], ay.get("a0"))
        # kam_dz / bak_dz: kalibin yuksekligini ez (orn. diz cokmus konu)
        if c.get("kam_dz") or c.get("bak_dz"):
            kam = (kam[0], kam[1], kam[2] + c.get("kam_dz", 0.0))
            bak = (bak[0], bak[1], bak[2] + c.get("bak_dz", 0.0))
        if c["aci"] in ("yakin", "yakin_on"):
            # yakin plan: kamera ilk karedeki yerinde durur, yalniz basi izler
            # (aktor donunce kamera yuzun onunde savrulmasin)
            ay.setdefault("kam", kam)
            kam = ay["kam"]
        return kam, bak

    def atis_ay(c, f, no, A, B_):
        """Cekimin ilk karesinde taraf ve yorunge acisini sabitle."""
        if no in atis_ay_onbellek:
            return atis_ay_onbellek[no]
        ay = {"taraf": c.get("taraf", 1)}
        if A and B_ and c.get("b") and "taraf" not in c and c["aci"] not in ("ust", "goz"):
            cift = tuple(sorted((c["a"], c["b"])))
            a_, b_ = (A, B_) if c["a"] == cift[0] else (B_, A)
            t0 = harita[min(f, len(harita) - 1)]
            sec = None
            for tr in (1, -1):
                kp, _ = kamera_noktasi(c["aci"], A, B_, 0.0, tr)
                if cift not in taraflar or taraf_isareti(a_, b_, kp) == taraflar[cift]:
                    sec = tr
                    break
            ay["taraf"] = sec if sec is not None else 1
            kp, _ = kamera_noktasi(c["aci"], A, B_, 0.0, ay["taraf"])
            if not any(s0 <= t0 <= s1 for s0, s1 in serbest):
                taraflar.setdefault(cift, taraf_isareti(a_, b_, kp))
        if c["aci"] == "yorunge" and A and B_:
            ex, ey = B_[0] - A[0], B_[1] - A[1]
            n = math.hypot(ex, ey) or 1e-6
            dk = (ey / n * ay["taraf"], -ex / n * ay["taraf"])
            ay["a0"] = math.atan2(dk[0], dk[1])
        atis_ay_onbellek[no] = ay
        return ay
    atis_ay_onbellek = {}

    ham, atis_no = [], []
    for f in range(kare):
        t = harita[min(f, len(harita) - 1)]
        suan = [i for i, c in enumerate(atislar) if c["t"] <= t + 1e-9]
        no = suan[-1] if suan else 0
        c = atislar[no]
        kam, bak = nokta(c, f, no)
        g = c.get("gecis", 0.0)
        if len(suan) >= 2 and g > 0 and t - c["t"] < g:
            eski_k, eski_b = nokta(atislar[suan[-2]], f, suan[-2])
            u = (t - c["t"]) / g
            u = u * u * (3 - 2 * u)
            kam = tuple(e + (n - e) * u for e, n in zip(eski_k, kam))
            bak = tuple(e + (n - e) * u for e, n in zip(eski_b, bak))
        ham.append((kam, bak, c))
        atis_no.append(no)
    durum = None
    for f, (kam, bak, c) in enumerate(ham):
        # takip: aktor donerken arkadaki kamera daha yavas yetissin (savrulmasin)
        alfa = 1.0 - math.exp(-1.0 / (fps * (0.4 if c["aci"] == "takip" else KAMERA_TAKIP)))
        if f == 0 or atis_no[f] != atis_no[f - 1] or c["aci"] in KAMERA_SABIT:
            durum = [list(kam), list(bak)]
        else:
            durum = [[d + (n - d) * alfa for d, n in zip(durum[0], kam)],
                     [d + (n - d) * alfa for d, n in zip(durum[1], bak)]]
        cikti.append((tuple(durum[0]), tuple(durum[1]), c.get("lens", 35), c.get("yatik", 0.0), c.get("odak")))
    return cikti


# ============================================================
# 4. BLENDER
# ============================================================
def blender_filmi(senaryo, klasor, onizleme=False, tek_kare=None, adim=1, aralik=None):
    import bpy
    from mathutils import Matrix, Quaternion, Vector, Euler

    setler = B.oku(HAREKET)["setler"]
    anims = {}
    anims.update(B.oku(ANIM_WOM)["animations"])
    anims.update(B.oku(ANIM_AKTOR)["animations"])
    anims.update(film_pozlari())
    aktorler, efektler, yazilar, sarsinti = zaman_cizelgesi(senaryo, setler, anims)
    kam_iz = kamera_izi(senaryo, aktorler)
    fps = senaryo.get("fps", 24)
    harita = zaman_haritasi(senaryo)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 6 if onizleme else senaryo.get("ornek", 16)
    sc.cycles.use_denoising = True
    # Kareler arasi sahne verisini koru (BVH yeniden kurulmaz). Goruntuye
    # etkisi yok -- yalniz her karedeki hazirlik suresini kisaltir.
    sc.render.use_persistent_data = True
    # Hiz ayarlari (v7.99.10, olculdu): senaryo vermezse Blender varsayilani.
    # Gurultu giderici albedo+normal ile dokuyu korur (az ornekte camur olmasin).
    sc.cycles.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    for anahtar, ozellik in (("sekme", "max_bounces"), ("yayilma_sekme", "diffuse_bounces"),
                             ("parlak_sekme", "glossy_bounces"), ("seffaf_sekme", "transparent_max_bounces")):
        if anahtar in senaryo:
            setattr(sc.cycles, ozellik, int(senaryo[anahtar]))
    if senaryo.get("motor") == "workbench":
        # Hizli motor: dokulu duz isik + golge + girinti karartmasi.
        sc.render.engine = "BLENDER_WORKBENCH"
        sh = sc.display.shading
        sh.light = "STUDIO"
        sh.color_type = "TEXTURE"
        sh.show_shadows = True
        sh.shadow_intensity = 0.55
        sh.show_cavity = True
        sh.cavity_type = "WORLD"
        sh.show_specular_highlight = False
        sc.display.render_aa = senaryo.get("kenar", "8")
    if "uyarlamali" in senaryo:
        sc.cycles.use_adaptive_sampling = True
        sc.cycles.adaptive_threshold = float(senaryo["uyarlamali"])
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
    ay = bpy.data.objects.new("ay", bpy.data.lights.new("ay", "SUN"))
    ay.data.color = (0.55, 0.66, 1.0)
    ay.data.energy = 0.0
    ay.data.angle = math.radians(1)
    ay.rotation_euler = (math.radians(40), 0, math.radians(senaryo.get("gunes_yon", 40) + 160))
    sc.collection.objects.link(ay)
    isik_anahtar = sorted(senaryo.get("isik", []), key=lambda x: x["t"])
    if isik_anahtar:
        # "isik": [{"t", "gunes", "gok", "yukseklik", "ay"}] -- hikaye zamaninda,
        # aradegerli; sabahtan geceye gecis (kullanici: "ilk basta sabah sonradan gece")
        def isik_deger(tt, ad, vars_):
            on = [x for x in isik_anahtar if x["t"] <= tt and ad in x]
            son = [x for x in isik_anahtar if x["t"] > tt and ad in x]
            if not on:
                return son[0][ad] if son else vars_
            if not son:
                return on[-1][ad]
            a0, a1 = on[-1], son[0]
            u = (tt - a0["t"]) / (a1["t"] - a0["t"])
            u = u * u * (3 - 2 * u)
            return a0[ad] + (a1[ad] - a0[ad]) * u
        bg = nt.nodes["Background"]
        # ADI "adim" OLMASIN: fonksiyonun --adim parametresini ezer ve
        # cizim 30 fps'de 7 karede bir atlar (v7.99.10'da yasandi)
        isik_adim = max(1, int(fps / 4))
        for f in list(range(0, len(harita), isik_adim)) + [len(harita) - 1]:
            tt = harita[f]
            gunes.data.energy = isik_deger(tt, "gunes", 1.7)
            gunes.data.keyframe_insert("energy", frame=f + 1)
            ay.data.energy = isik_deger(tt, "ay", 0.0)
            ay.data.keyframe_insert("energy", frame=f + 1)
            bg.inputs["Strength"].default_value = isik_deger(tt, "gok", 0.18)
            bg.inputs["Strength"].keyframe_insert("default_value", frame=f + 1)
            try:
                gok.sun_elevation = math.radians(isik_deger(tt, "yukseklik", 35))
                gok.keyframe_insert("sun_elevation", frame=f + 1)
            except Exception:
                pass
            gunes.rotation_euler = (math.radians(90 - max(-10, isik_deger(tt, "yukseklik", 35))), 0,
                                    math.radians(senaryo.get("gunes_yon", 40)))
            gunes.keyframe_insert("rotation_euler", frame=f + 1)

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

    if senaryo.get("mekan") == "oda":
        gok_kapat(bpy, sc, gunes, ay)
    else:
        # ---- zemin ----
        zemin_kur(bpy, senaryo, doku_malzemesi,
                  kare_bul(harita, senaryo.get("zemin", {}).get("cukur", {}).get("t", 0.0)) + 1)
        # ufuk: oyun alaninin otesinde duz, ayni renkte genis zemin
        ufuk = bpy.data.materials.new("ufuk")
        ufuk.use_nodes = True
        ufuk.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.24, 0.42, 0.13, 1)
        ufuk.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0
        # ORTASI BOS: oyun alanini dokulu zemin zaten ortuyor. Eskiden tam
        # duzlemdi ve cukurun deligini kapatiyordu -- cukur tabani (z<0)
        # altinda kaliyor, yerine parlayan duz bir yuzey gorunuyordu.
        ic, dis = int(senaryo.get("zemin", {}).get("boyut", 40)) // 2, 300.0
        me = bpy.data.meshes.new("ufuk")
        me.from_pydata([(-dis, -dis, -0.01), (dis, -dis, -0.01), (dis, dis, -0.01), (-dis, dis, -0.01),
                        (-ic, -ic, -0.01), (ic, -ic, -0.01), (ic, ic, -0.01), (-ic, ic, -0.01)], [],
                       [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
        me.materials.append(ufuk)
        sc.collection.objects.link(bpy.data.objects.new("ufuk", me))

    # ---- aktorler: kemik bos nesneleri + kup parcalari ----
    geo = B.oku(GEO_AKTOR)
    govde_model = B.Model(geo)
    kok_nesne = {}
    kemik_nesne = {}
    silah_nesneleri = {}
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
        silah_nesneleri[ad] = []
        for sira, (model, doku, isik) in enumerate(parcalar):
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
                if sira > 0:
                    silah_nesneleri[ad].append(ob)

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

    kagit_m = bpy.data.materials.new("kagit")
    kagit_m.use_nodes = True
    kagit_m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.86, 0.8, 0.66, 1)
    kagitlar = {}
    for ad, a in aktorler.items():
        if any(k.get("esya") == "kagit" for k in a.kayit):
            # sol yumrugun onunde 5x7 px ince kagit (leftItem'e bagli)
            bpy.ops.mesh.primitive_cube_add(size=1)
            kg = bpy.context.object
            kg.data.materials.append(kagit_m)
            # dinlenmede YATAY: "kagit" pozunda kol -80 derece one kalkinca
            # dikilir ve yuzu El-Harkos'a doner. Dik kurulunca kalkan kolla
            # yatiyor, yandan bakan kamerada ince bir cizgi kaliyordu.
            kg.scale = (5 / 16, 7 / 16, 0.2 / 16)
            # MUTLAK model koordinati (govde parcalari gibi): kemik nesneleri
            # model kokunde duruyor, donus pivot etrafinda matrisin icinde.
            # Eskiden pivot cikariliyordu -> kagit yumruktan 6 px yana kayik
            # havada duruyordu (kullanici: "kagitla arasinda ucurum farki").
            # Yer: sol kol kutusunun (ic x -8..-4, y 12.., z -2..2) alt ucu;
            # kagit yumrugun onunden 7 px ileri uzanir, alt kenari yumrukta.
            kg.location = blender_nokta([-6.0, 11.6, -5.5])
            kg.parent = kemik_nesne[ad]["leftArm"]
            kagitlar[ad] = kg

    def sabit_anahtar(ob, yol):
        if ob.animation_data and ob.animation_data.action:
            for fc in ob.animation_data.action.fcurves if hasattr(ob.animation_data.action, "fcurves") else []:
                if fc.data_path == yol:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "CONSTANT"

    # Anahtarlar TOPLU yaziliyor: keyframe_insert 2666 kare x 5 aktor x 10 kemik
    # icin sahne kurulumu 12 dakika suruyordu (olculdu).
    tampon = {}

    def tampona(ob, yol, f, deger):
        tampon.setdefault((ob, yol), []).append((f, tuple(deger)))
    unwrap_euler = {}
    for ad, a in aktorler.items():
        kok = kok_nesne[ad]
        kn = kemik_nesne[ad]
        onceki_g, onceki_s = None, None
        if ad in kagitlar:                 # ilk karede de anahtar (bkz. esya_anahtarlari)
            for f_, acik in esya_anahtarlari(a.kayit[:len(kam_iz)]):
                kagitlar[ad].hide_render = not acik
                kagitlar[ad].keyframe_insert("hide_render", frame=f_)
        for f, k in enumerate(a.kayit[:len(kam_iz)]):
            tampona(kok, "location", f + 1, (k["x"], k["y"], k["z"]))
            # aci surekli kalsin (359 -> 1 derece gecisinde ters tur atmasin)
            z_ = math.radians(k["aci"])
            if kok in unwrap_euler:
                z_ = unwrap_euler[kok] + ((z_ - unwrap_euler[kok] + math.pi) % (2 * math.pi) - math.pi)
            unwrap_euler[kok] = z_
            tampona(kok, "rotation_euler", f + 1, (0, 0, z_))
            if k["gorunur"] != onceki_g:
                # gizle/goster: kok olcegi 0/1, iki ardisik karede (ara olcek yok)
                kok.scale = (1, 1, 1) if onceki_g in (None, True) else (0, 0, 0)
                if f:
                    kok.keyframe_insert("scale", frame=f)
                kok.scale = (1, 1, 1) if k["gorunur"] else (0, 0, 0)
                kok.keyframe_insert("scale", frame=f + 1)
                onceki_g = k["gorunur"]
            if silah_nesneleri.get(ad) and k.get("silah", True) != onceki_s:
                for ob_ in silah_nesneleri[ad]:
                    ob_.hide_render = not k.get("silah", True)
                    ob_.keyframe_insert("hide_render", frame=f + 1)
                onceki_s = k.get("silah", True)
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
                onq = tampon.get((o, "rotation_quaternion"))
                if onq and sum(x * y for x, y in zip(onq[-1][1], q)) < 0:
                    q = -q                          # kuaterniyon isaret surekliligi
                tampona(o, "rotation_quaternion", f + 1, q)
                tampona(o, "location", f + 1, l)
                tampona(o, "scale", f + 1, o3)

    # ---- kivilcimlar ----
    kivilcim_kur(bpy, efektler, fps, doku_malzemesi, harita)

    # ---- kamera ----
    kam = bpy.data.objects.new("kamera", bpy.data.cameras.new("kamera"))
    sc.collection.objects.link(kam)
    sc.camera = kam
    kam.data.clip_start = 0.05
    rnd = random.Random(7)
    sars_kare = [kare_bul(harita, s) for s in sarsinti]
    if any(c[4] for c in kam_iz):
        kam.data.dof.use_dof = True
        kam.data.dof.aperture_fstop = senaryo.get("fstop", 2.2)
    kam.rotation_mode = "QUATERNION"
    for f, (kp, bk, lens, yatik, odak) in enumerate(kam_iz):
        sars = sum(max(0.0, 1 - (f - s) / (0.3 * fps)) for s in sars_kare if 0 <= f - s < 0.3 * fps)
        titre = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.06 * sars
        q = (Vector(bk) - Vector(kp)).to_track_quat("-Z", "Y")
        if yatik:
            q = q @ Quaternion((0, 0, 1), math.radians(yatik))
        onq = tampon.get((kam, "rotation_quaternion"))
        if onq and sum(x * y for x, y in zip(onq[-1][1], q)) < 0:
            q = -q
        tampona(kam, "location", f + 1, Vector(kp) + titre)
        tampona(kam, "rotation_quaternion", f + 1, q)
        tampona(kam.data, "lens", f + 1, (lens,))
        if kam.data.dof.use_dof:
            if odak:
                r_ = aktorler[odak].kayit[min(f, len(aktorler[odak].kayit) - 1)]
                d = (Vector((r_["x"], r_["y"], r_["z"] + 1.3)) - Vector(kp)).length
            else:
                d = (Vector(bk) - Vector(kp)).length
            tampona(kam.data.dof, "focus_distance", f + 1, (d,))
    toplu_anahtar(bpy, tampon, kam)

    if senaryo.get("mekan") == "oda":
        oda_kur(bpy, senaryo, doku_malzemesi, harita, fps, kam_iz)

    os.makedirs(os.path.join(klasor, "kare"), exist_ok=True)
    if isinstance(tek_kare, list):           # denetim: secili kareler, tek kurulumla
        for f in tek_kare:
            sc.frame_set(f)
            sc.render.filepath = os.path.join(klasor, "kare", "%04d.png" % f)
            bpy.ops.render.render(write_still=True)
        return
    if tek_kare:
        sc.frame_start = sc.frame_end = tek_kare
    if aralik:
        sc.frame_start, sc.frame_end = max(1, aralik[0]), min(sc.frame_end, aralik[1])
    sc.frame_step = max(1, adim)
    # kaldigi yerden devam: var olan kareyi yeniden cizme (uzun cizimler parca parca)
    sc.render.use_overwrite = False
    sc.render.use_placeholder = True
    bpy.ops.render.render(animation=True)
    with open(os.path.join(klasor, "yazilar.json"), "w", encoding="utf-8") as fh:
        json.dump({"fps": fps, "yazilar": yazilar, "kare": len(kam_iz)}, fh, ensure_ascii=False)


def toplu_anahtar(bpy, tampon, kam=None):
    """{(nesne, yol): [(kare, deger...)]} -> fcurve'lere tek seferde (DOGRUSAL).
    kamera.data.dof gibi ic yapilarin yolu kamera verisine gore yazilir.
    Kesme anlari: kamera iki ardisik karede farkli atisa gecince dogrusal
    ara deger zaten kare basina anahtar oldugu icin olusmuyor."""
    for (ob, yol), seri in tampon.items():
        hedef, tam_yol = ob, yol
        if kam is not None and ob == kam.data.dof:
            hedef, tam_yol = kam.data, "dof." + yol
        ad = hedef.animation_data_create()
        if ad.action is None:
            ad.action = bpy.data.actions.new((getattr(hedef, "name", "x")) + "_hareket")
        k = len(seri[0][1])
        for i in range(k):
            fc = ad.action.fcurve_ensure_for_datablock(hedef, tam_yol, index=i if k > 1 else 0)
            fc.keyframe_points.add(len(seri))
            co = []
            for f, d in seri:
                co += (f, d[i])
            fc.keyframe_points.foreach_set("co", co)
            fc.keyframe_points.foreach_set("interpolation", [1] * len(seri))   # LINEAR
            fc.update()


def gok_kapat(bpy, sc, gunes, ay):
    """Kapali oda: dis isik yok, dunya simsiyah."""
    sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    gunes.data.energy = 0.0
    ay.data.energy = 0.0


def _kup_ekle(bpy, merkez, boyut, malz, ad="kup"):
    bpy.ops.mesh.primitive_cube_add(size=1, location=merkez)
    ob = bpy.context.object
    ob.name = ad
    ob.scale = boyut
    ob.data.materials.append(malz)
    # UV: her yuz tek blok dokusu, boyutla tekrarlanir
    uvs = []
    for poly in ob.data.polygons:
        n = poly.normal
        if abs(n.z) > 0.5:
            sx, sy = boyut[0], boyut[1]
        elif abs(n.x) > 0.5:
            sx, sy = boyut[1], boyut[2]
        else:
            sx, sy = boyut[0], boyut[2]
        uvs.extend((0, 0, sx, 0, sx, sy, 0, sy))
    ob.data.uv_layers.active.data.foreach_set("uv", uvs)
    return ob


def oda_kur(bpy, senaryo, doku_malzemesi, harita, fps, kam_iz):
    """7. sahne: karanlik oda (SERI_SEZON1.md).

    Tam karanlik; yalniz iki beyaz goz. Kapi acildigi an BEMBEYAZ, hüzmede
    yogun toz (yillardir acilmamis oda). Kural: kapidan giren isik kotuye
    ULASMAZ -- isik seridi yerde onun onunde biter; gozler kendi isigiyla
    parlar, bedenden hicbir yuzey aydinlanmaz (bedeni zaten yok).
    "oda": {"genis", "derin", "yuks", "kapi_x", "goz": [x, y, z], "goz_aci"}
    Sahne olaylari: {"t", "kapi": "ac"|"kapat", "sure"},
                    {"t", "goz_bak": "kapi"|"kamera"|[x, y], "sure"}."""
    from mathutils import Vector
    o = senaryo.get("oda", {})
    G, D, Y = o.get("genis", 12), o.get("derin", 12), o.get("yuks", 5)
    kx = o.get("kapi_x", 0.0)
    yol = MCPREP_DOKU
    duvar = doku_malzemesi(os.path.join(yol, "deepslate_bricks.png"))
    zemin = doku_malzemesi(os.path.join(yol, "deepslate_tiles.png"))
    _kup_ekle(bpy, (0, 0, -0.5), (G, D, 1), zemin, "oda_zemin")
    _kup_ekle(bpy, (0, 0, Y + 0.5), (G, D, 1), duvar, "oda_tavan")
    _kup_ekle(bpy, (-G / 2 - 0.5, 0, Y / 2), (1, D, Y), duvar, "oda_sol")
    _kup_ekle(bpy, (G / 2 + 0.5, 0, Y / 2), (1, D, Y), duvar, "oda_sag")
    _kup_ekle(bpy, (0, -D / 2 - 0.5, Y / 2), (G, 1, Y), duvar, "oda_arka")
    # kapili on duvar (y = +D/2): kapi boslugu kx..kx+1, yukseklik 2
    yd = D / 2 + 0.5
    sol_g = (kx + G / 2)
    _kup_ekle(bpy, (-G / 2 + sol_g / 2, yd, Y / 2), (sol_g, 1, Y), duvar, "oda_on_sol")
    sag_g = G / 2 - (kx + 1)
    _kup_ekle(bpy, (kx + 1 + sag_g / 2, yd, Y / 2), (sag_g, 1, Y), duvar, "oda_on_sag")
    _kup_ekle(bpy, (kx + 0.5, yd, 2 + (Y - 2) / 2), (1, 1, Y - 2), duvar, "oda_kapi_ust")
    # disaridaki bembeyaz: kapinin ardinda isik saçan duz yuzey
    beyaz = bpy.data.materials.new("kapi_beyaz")
    beyaz.use_nodes = True
    bb = beyaz.node_tree.nodes["Principled BSDF"]
    bb.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bb.inputs["Emission Color"].default_value = (1, 0.98, 0.94, 1)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(kx + 0.5, D / 2 + 1.6, 1.0))
    dis = bpy.context.object
    dis.rotation_euler = (math.radians(90), 0, 0)
    dis.scale = (6, 4, 1)
    dis.data.materials.append(beyaz)
    # kapi kanadi: mentese kx'te, 0 -> 100 derece disari acilir
    mentese = bpy.data.objects.new("kapi_mentese", None)
    mentese.location = (kx, D / 2 + 0.5, 0)
    bpy.context.scene.collection.objects.link(mentese)
    kanat = _kup_ekle(bpy, (0.5, 0, 1.0), (1, 0.18, 2), doku_malzemesi(os.path.join(yol, "dark_oak_planks.png")), "kapi")
    kanat.parent = mentese
    # hüzme: kapidan iceri bakan spot + odayi dolduran ince sis
    spot = bpy.data.objects.new("kapi_spot", bpy.data.lights.new("kapi_spot", "SPOT"))
    spot.data.spot_size = math.radians(o.get("huzme_aci", 38))
    spot.data.spot_blend = 0.25
    spot.data.shadow_soft_size = 0.4
    spot.location = (kx + 0.5, D / 2 + 1.4, 1.6)
    spot.rotation_euler = (math.radians(o.get("huzme_egim", 62)), 0, math.radians(180))
    bpy.context.scene.collection.objects.link(spot)
    sis = bpy.data.materials.new("sis")
    sis.use_nodes = True
    nt = sis.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.inputs["Density"].default_value = o.get("sis", 0.06)
    nt.links.new(vol.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, Y / 2))
    sk = bpy.context.object
    sk.scale = (G, D, Y)
    sk.data.materials.append(sis)
    # toz: hüzmenin icinde yavas suzulen zerreler (yalniz isikta gorunur)
    toz_m = bpy.data.materials.new("toz")
    toz_m.use_nodes = True
    toz_m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.9, 0.88, 0.82, 1)
    rnd = random.Random(23)
    son = len(harita)
    for _ in range(int(o.get("toz", 160))):
        u = rnd.uniform(0.05, 1.0)
        merkez = (kx + 0.5 + rnd.uniform(-0.8, 0.8) * u * 2, D / 2 - u * D * 0.6, rnd.uniform(0.1, 2.4) * (1 - u * 0.5))
        tz = _kup_nesne(bpy, toz_m, rnd.uniform(0.012, 0.03), merkez, "toz")
        p = Vector(merkez)
        for f in range(1, son + 1, int(fps)):
            tz.location = p
            tz.keyframe_insert("location", frame=f)
            p = p + Vector((rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), rnd.uniform(-0.03, 0.02)))
    # gozler: tek karakter, iki cift (ust kucuk, alt buyuk); bedeni YOK
    gz = o.get("goz", [kx - 3.5, -D / 2 + 2.0, 1.75])
    goz_k = bpy.data.objects.new("gozler", None)
    goz_k.location = gz
    goz_k.rotation_euler = (0, 0, math.radians(o.get("goz_aci", 0)))
    bpy.context.scene.collection.objects.link(goz_k)
    gm = bpy.data.materials.new("goz")
    gm.use_nodes = True
    gb = gm.node_tree.nodes["Principled BSDF"]
    gb.inputs["Base Color"].default_value = (1, 1, 1, 1)
    gb.inputs["Emission Color"].default_value = (1, 1, 1, 1)
    gb.inputs["Emission Strength"].default_value = o.get("goz_parlaklik", 6.0)
    # IKI goz (kullanici: "ben 2 tane goz istemistim"). Ilk surum "iki cift
    # goz" sozunu dort goz diye okumustu.
    for (dx, dz, w, h) in ((-0.15, 0.0, 0.11, 0.055), (0.15, 0.0, 0.11, 0.055)):
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
        g = bpy.context.object
        g.rotation_euler = (math.radians(90), 0, 0)
        g.scale = (w, h, 1)
        g.location = (dx, 0, dz)
        g.data.materials.append(gm)
        g.parent = goz_k
    # sahne olaylari
    acik, goz_aci = 0.0, o.get("goz_aci", 0)
    dis_guc, spot_guc = o.get("kapi_parlaklik", 30.0), o.get("huzme_guc", 2500.0)

    def anahtar_kapi(f, a):
        mentese.rotation_euler = (0, 0, math.radians(100 * a))
        mentese.keyframe_insert("rotation_euler", frame=f)
        bb.inputs["Emission Strength"].default_value = dis_guc * a
        bb.inputs["Emission Strength"].keyframe_insert("default_value", frame=f)
        spot.data.energy = spot_guc * a
        spot.data.keyframe_insert("energy", frame=f)
    anahtar_kapi(1, 0.0)
    goz_k.keyframe_insert("rotation_euler", frame=1)
    for ol in sorted(senaryo.get("olaylar", []), key=lambda x: x["t"]):
        f0 = kare_bul(harita, ol["t"]) + 1
        f1 = kare_bul(harita, ol["t"] + ol.get("sure", 0.6)) + 1
        if "kapi" in ol:
            hedef = 1.0 if ol["kapi"] == "ac" else 0.0
            anahtar_kapi(f0, acik)
            anahtar_kapi(max(f1, f0 + 1), hedef)
            acik = hedef
        if "goz_bak" in ol:
            h = ol["goz_bak"]
            if h == "kapi":
                hp = (kx + 0.5, D / 2)
            elif h == "kamera":
                kp = kam_iz[min(len(kam_iz) - 1, f1)][0]
                hp = (kp[0], kp[1])
            else:
                hp = (h[0], h[1])
            yeni = yon_aci((gz[0], gz[1]), hp)
            yeni = goz_aci + ((yeni - goz_aci + 180) % 360 - 180)
            goz_k.rotation_euler = (0, 0, math.radians(goz_aci))
            goz_k.keyframe_insert("rotation_euler", frame=f0)
            goz_k.rotation_euler = (0, 0, math.radians(yeni))
            goz_k.keyframe_insert("rotation_euler", frame=max(f1, f0 + 1))
            goz_aci = yeni


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


def _gorun_kare(ob, f, gorunur_sonra):
    """f karesinden itibaren gorunur (True) ya da gizli (False)."""
    ob.hide_render = gorunur_sonra
    ob.keyframe_insert("hide_render", frame=max(0, f - 1))
    ob.hide_render = not gorunur_sonra
    ob.keyframe_insert("hide_render", frame=f)


def agac_yerleri(senaryo):
    """[(x, y, tur, boy)] -- Blender'siz (kamera denetimi agaclari bilsin)."""
    z = senaryo.get("zemin", {})
    h = int(z.get("boyut", 40)) // 2
    rnd = random.Random(z.get("tohum", 3))
    bos_r = float(z.get("aciklik", 9))          # dovus alani: agacsiz aciklik yaricapi
    dikili, out = [], []
    for _ in range(int(z.get("agac", 6))):
        for _deneme in range(200):
            ax, ay = rnd.randint(-h + 2, h - 3), rnd.randint(-h + 2, h - 3)
            if math.hypot(ax, ay) > bos_r and all(math.hypot(ax - bx, ay - by) >= 4 for bx, by in dikili):
                break
        dikili.append((ax, ay))
        tur = rnd.choice(("oak", "oak", "birch", "dark_oak"))
        boy = rnd.randint(4, 7)
        out.append((ax, ay, tur, boy))
    return out


def zemin_kur(bpy, senaryo, doku_malzemesi, cukur_kare=1):
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
    # "cukur": Baris'in dustugu yer zeminden ezik (kullanici: "hirpalanmis
    # o havayi verebilelim"). Merkeze yakin bloklar `derin` kadar asagida,
    # halka yarim derinlikte; kenarlarda toprak yuzeyi gorunur.
    ck = z.get("cukur")

    def cukur_derin(cx, cy):
        if not ck:
            return 0.0
        d = math.hypot(cx - ck["x"], cy - ck["y"])
        if d <= ck["r"]:
            return ck["derin"]
        if d <= ck["r"] + 0.75:
            return ck["derin"] * 0.45
        return 0.0
    cukur_ust, kenar = [], []
    for x in range(-h, h):
        for y in range(-h, h):
            dz = cukur_derin(x + 0.5, y + 0.5)
            if dz > 0:
                cukur_ust.append((x, y, -dz))
                for nx, ny, kose in ((x - 1, y, ((x, y), (x, y + 1))), (x + 1, y, ((x + 1, y + 1), (x + 1, y))),
                                     (x, y - 1, ((x + 1, y), (x, y))), (x, y + 1, ((x, y + 1), (x + 1, y + 1)))):
                    dn = cukur_derin(nx + 0.5, ny + 0.5)
                    if dn < dz:
                        kenar.append((kose, -dz, -dn))
                continue
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
    if ck:
        ks, ps, uv = [], [], []
        for x, y, zz in cukur_ust:
            i0 = len(ks)
            ks += [(x, y, zz), (x + 1, y, zz), (x + 1, y + 1, zz), (x, y + 1, zz)]
            ps.append((i0, i0 + 1, i0 + 2, i0 + 3))
            uv += [(0, 0), (1, 0), (1, 1), (0, 1)]
        me = bpy.data.meshes.new("cukur")
        me.from_pydata(ks, [], ps)
        lay = me.uv_layers.new()
        for j, d in enumerate(lay.data):
            d.uv = uv[j]
        me.materials.append(doku_malzemesi(os.path.join(yol, "coarse_dirt.png")))
        cob = bpy.data.objects.new("cukur", me)
        bpy.context.scene.collection.objects.link(cob)
        # kapak: darbe anina kadar cukurun ustunu duz cimen ortuyor
        ks2, ps2, uv2 = [], [], []
        for x, y, _zz in cukur_ust:
            i0 = len(ks2)
            ks2 += [(x, y, 0), (x + 1, y, 0), (x + 1, y + 1, 0), (x, y + 1, 0)]
            ps2.append((i0, i0 + 1, i0 + 2, i0 + 3))
            uv2 += [(0, 0), (1, 0), (1, 1), (0, 1)]
        me2 = bpy.data.meshes.new("cukur_kapak")
        me2.from_pydata(ks2, [], ps2)
        l2 = me2.uv_layers.new()
        for j, d in enumerate(l2.data):
            d.uv = uv2[j]
        me2.materials.append(doku_malzemesi(os.path.join(yol, "grass_block_top.png"), renk=cimen))
        kap = bpy.data.objects.new("cukur_kapak", me2)
        bpy.context.scene.collection.objects.link(kap)
        cukur_nesneleri = [cob]
        if cukur_kare > 1:
            _gorun_kare(kap, cukur_kare, False)
        else:
            kap.hide_render = True          # cukur filmin basindan beri acik
        ks, ps, uv = [], [], []
        for (p0, p1), alt, ust in kenar:
            i0 = len(ks)
            ks += [(p0[0], p0[1], alt), (p1[0], p1[1], alt), (p1[0], p1[1], ust), (p0[0], p0[1], ust)]
            ps.append((i0, i0 + 1, i0 + 2, i0 + 3))
            uv += [(0, 0), (1, 0), (1, ust - alt), (0, ust - alt)]
        me = bpy.data.meshes.new("cukur_kenar")
        me.from_pydata(ks, [], ps)
        lay = me.uv_layers.new()
        for j, d in enumerate(lay.data):
            d.uv = uv[j]
        me.materials.append(doku_malzemesi(os.path.join(yol, "dirt.png")))
        kob = bpy.data.objects.new("cukur_kenar", me)
        bpy.context.scene.collection.objects.link(kob)
        cukur_nesneleri.append(kob)
        # sacilmis toprak: halkanin disina dusmus kucuk parcalar
        rnd_c = random.Random(z.get("tohum", 3) + 17)
        for _ in range(int(ck.get("parca", 12))):
            a_ = rnd_c.uniform(0, math.tau)
            rr = ck["r"] + rnd_c.uniform(0.3, 1.4)
            boy = rnd_c.uniform(0.08, 0.18)
            pob = _kup_nesne(bpy, doku_malzemesi(os.path.join(yol, rnd_c.choice(("dirt.png", "coarse_dirt.png")))),
                             boy, (ck["x"] + math.cos(a_) * rr, ck["y"] + math.sin(a_) * rr, boy / 2), "cukur_parca")
            pob.rotation_euler = (0, 0, rnd_c.uniform(0, math.tau))
            cukur_nesneleri.append(pob)
        if cukur_kare > 1:
            for ob_ in cukur_nesneleri:
                _gorun_kare(ob_, cukur_kare, True)
    # agaclar: govde + yaprak kupleri, oyun alaninin disinda
    gruplar = {}
    for ax, ay, tur, boy in agac_yerleri(senaryo):
        govde = doku_malzemesi(os.path.join(yol, tur + "_log.png"))
        yaprak = doku_malzemesi(os.path.join(yol, tur + "_leaves.png"),
                                renk=(0.42, 0.62, 0.30) if tur == "birch" else (0.35, 0.62, 0.22))
        g, y_ = gruplar.setdefault(govde.name, (govde, []))[1], gruplar.setdefault(yaprak.name, (yaprak, []))[1]
        for k in range(boy):
            g.append((ax, ay, k))
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                for dz in (boy - 1, boy):
                    if abs(dx) == 2 and abs(dy) == 2:
                        continue
                    if dx == 0 and dy == 0 and dz == boy - 1:
                        continue
                    y_.append((ax + dx, ay + dy, dz))
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            y_.append((ax + dx, ay + dy, boy + 1))
    for ad_, (m_, kup_l) in gruplar.items():
        _kup_ormesi(bpy, "agac_" + ad_, kup_l, m_)


_KUP_YUZ = (((0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)), ((1, 1, 0), (0, 1, 0), (0, 1, 1), (1, 1, 1)),
            ((0, 1, 0), (0, 0, 0), (0, 0, 1), (0, 1, 1)), ((1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)),
            ((0, 1, 1), (0, 0, 1), (1, 0, 1), (1, 1, 1)), ((0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)))
_KUP_ME = {}


def _kup_ormesi(bpy, ad, kupler, malz):
    """Bircok blok kupunu TEK ormede birlestirir (agaclar): her kup ayri nesne
    olunca sahne kurulumu dakikalar suruyordu. kupler: [(x, y, z)] blok koseleri."""
    ks, ps, uv = [], [], []
    for x, y, z in kupler:
        for yuz in _KUP_YUZ:
            i0 = len(ks)
            ks += [(x + a, y + b, z + c) for a, b, c in yuz]
            ps.append((i0, i0 + 1, i0 + 2, i0 + 3))
            uv += [(0, 0), (1, 0), (1, 1), (0, 1)]
    me = bpy.data.meshes.new(ad)
    me.from_pydata(ks, [], ps)
    lay = me.uv_layers.new()
    lay.data.foreach_set("uv", [c for p in uv for c in p])
    me.materials.append(malz)
    ob = bpy.data.objects.new(ad, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def _kup_nesne(bpy, malz, boy, konum, ad="parca"):
    """Ortak birim kup verisini paylasan kucuk nesne (parcacik, toz, leke)."""
    me = _KUP_ME.get(malz.name)
    if me is None or me.name not in bpy.data.meshes:
        me = bpy.data.meshes.new("kup_" + malz.name)
        ks, ps = [], []
        for yuz in _KUP_YUZ:
            i0 = len(ks)
            ks += [(a - 0.5, b - 0.5, c - 0.5) for a, b, c in yuz]
            ps.append((i0, i0 + 1, i0 + 2, i0 + 3))
        me.from_pydata(ks, [], ps)
        me.uv_layers.new().data.foreach_set("uv", [0, 0, 1, 0, 1, 1, 0, 1] * 6)
        me.materials.append(malz)
        _KUP_ME[malz.name] = me
    ob = bpy.data.objects.new(ad, me)
    ob.location = konum
    ob.scale = (boy, boy, boy) if not isinstance(boy, tuple) else boy
    bpy.context.scene.collection.objects.link(ob)
    return ob


def _isik_malz(bpy, ad, renk, guc):
    m = bpy.data.materials.new(ad)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*renk, 1)
    b.inputs["Emission Color"].default_value = (*renk, 1)
    b.inputs["Emission Strength"].default_value = guc
    return m


def _parca(bpy, nokta, boy, malz, f0, f1, son_nokta, ara=None, kalici=False):
    """f0'da `nokta`da belirip f1'de `son_nokta`da sonen kucuk kup.
    ara: [(kare, nokta)] -- yay (yercekimi) icin ara anahtarlar.
    kalici: f1'den sonra yerinde kalir (yere dusen toprak); degilse KAYBOLUR
    (v7.99.10 onizlemesi: sonmeyen kivilcimlar sahnede birikip goruntuyu
    beyaz kuplerle kapatiyordu)."""
    ob = _kup_nesne(bpy, malz, boy, nokta)
    ob.scale = (0, 0, 0)
    ob.keyframe_insert("scale", frame=max(0, f0 - 1))
    ob.scale = (boy, boy, boy)
    ob.keyframe_insert("scale", frame=f0)
    ob.keyframe_insert("location", frame=f0)
    for fk, nk in (ara or []):
        ob.location = nk
        ob.keyframe_insert("location", frame=fk)
    ob.location = son_nokta
    ob.keyframe_insert("location", frame=f1)
    if not kalici:
        ob.keyframe_insert("scale", frame=f1)
        ob.scale = (0, 0, 0)
        ob.keyframe_insert("scale", frame=f1 + 1)
    return ob


def kivilcim_kur(bpy, efektler, fps, doku_malzemesi, harita=None):
    """Temas efektleri. Zamanlar hikaye zamaninda; kareye `harita` cevirir.
      vurus: sari kivilcim (tirpan El-Harkos'tan sekiyor -- "silah islemiyor")
      savun: mavi kivilcim
      isik : isinlanma -- mor flas, kisa nokta isigi, disa sacilan parcalar
             (renk: Karanlik Tirpan'in mor isigi, SERI_SEZON1 varsayilani)
      kan  : ilk delen darbe -- vurus yonunde kisa sicrama, yercekimiyle
             yay cizen damlalar, yere dustugu yerde kalan koyu leke"""
    if not efektler:
        return
    kare = (lambda t: kare_bul(harita, t) + 1) if harita else (lambda t: int(t * fps) + 1)
    sari = _isik_malz(bpy, "kivilcim", (1.0, 0.85, 0.5), 12.0)
    mavi = _isik_malz(bpy, "kivilcim_mavi", (0.6, 0.8, 1.0), 12.0)
    mor = _isik_malz(bpy, "isinlanma", (0.78, 0.49, 1.0), 25.0)
    kan_m = bpy.data.materials.new("kan")
    kan_m.use_nodes = True
    kb = kan_m.node_tree.nodes["Principled BSDF"]
    kb.inputs["Base Color"].default_value = (0.32, 0.01, 0.01, 1)
    kb.inputs["Roughness"].default_value = 0.25
    leke_m = bpy.data.materials.new("kan_leke")
    leke_m.use_nodes = True
    leke_m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.18, 0.0, 0.0, 1)
    toprak_m = bpy.data.materials.new("toprak")
    toprak_m.use_nodes = True
    toprak_m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.12, 0.075, 0.04, 1)
    toprak_m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 1.0
    rnd = random.Random(11)
    for e in efektler:
        f0 = kare(e["t"])
        n = e["nokta"]
        if e["tur"] in ("vurus", "savun"):
            for _ in range(10):
                yon = (rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0, 1.2))
                _parca(bpy, n, 0.07, mavi if e["tur"] == "savun" else sari, f0, f0 + int(0.3 * fps),
                       tuple(n[i] + yon[i] * 0.6 for i in range(3)))
        elif e["tur"] == "isik":
            nl = bpy.data.objects.new("flas", bpy.data.lights.new("flas", "POINT"))
            nl.data.color = (0.78, 0.49, 1.0)
            nl.location = n
            bpy.context.scene.collection.objects.link(nl)
            for fk, g in ((f0 - 1, 0), (f0, 900), (f0 + int(0.12 * fps), 250), (f0 + int(0.35 * fps), 0)):
                nl.data.energy = g
                nl.data.keyframe_insert("energy", frame=max(0, fk))
            for _ in range(24):
                yon = (rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 1.0))
                bas = tuple(n[i] + yon[i] * 0.15 for i in range(3))
                _parca(bpy, bas, rnd.uniform(0.05, 0.11), mor, f0, f0 + int(rnd.uniform(0.3, 0.55) * fps),
                       tuple(n[i] + yon[i] * rnd.uniform(0.8, 1.4) for i in range(3)))
        elif e["tur"] == "toprak":
            # cukurun acildigi an: disari ve yukari sacilan toprak parcalari
            for j in range(22):
                v = [rnd.uniform(-2.6, 2.6), rnd.uniform(-2.6, 2.6), rnd.uniform(1.5, 3.6)]
                ara, yere = [], None
                for k in range(1, 50):
                    tt = k / fps
                    p = (n[0] + v[0] * tt, n[1] + v[1] * tt, n[2] + v[2] * tt - 4.9 * tt * tt)
                    if p[2] <= 0.03 and k > 2:
                        yere = (f0 + k, (p[0], p[1], 0.03))
                        break
                    ara.append((f0 + k, p))
                if yere:
                    # yarisi yerde kalir (ezik zeminin cevresi), gerisi toz olup kaybolur
                    _parca(bpy, n, rnd.uniform(0.06, 0.13), toprak_m, f0, yere[0], yere[1], ara[:-1], kalici=j % 2 == 0)
        elif e["tur"] == "kan":
            yon = e.get("yon", [0, 1])
            for j in range(18):
                v = [yon[0] * rnd.uniform(1.0, 2.6) + rnd.uniform(-0.6, 0.6),
                     yon[1] * rnd.uniform(1.0, 2.6) + rnd.uniform(-0.6, 0.6),
                     rnd.uniform(0.4, 2.0)]
                ara, yere = [], None
                for k in range(1, 40):
                    tt = k / fps
                    p = (n[0] + v[0] * tt, n[1] + v[1] * tt, n[2] + v[2] * tt - 4.9 * tt * tt)
                    if p[2] <= 0.02:
                        yere = (f0 + k, (p[0], p[1], 0.01))
                        break
                    ara.append((f0 + k, p))
                if yere is None:
                    continue
                _parca(bpy, n, rnd.uniform(0.04, 0.08), kan_m, f0, yere[0], yere[1], ara[:-1])
                if j % 2 == 0:
                    # yerde kalan leke: duz kare, dusus aninda belirir
                    bl = rnd.uniform(0.06, 0.14)
                    lk = _kup_nesne(bpy, leke_m, (bl, bl, 0.004), yere[1])
                    lk.scale = (0, 0, 0)
                    lk.keyframe_insert("scale", frame=yere[0] - 1)
                    lk.scale = (bl, bl, 0.004)
                    lk.keyframe_insert("scale", frame=yere[0])


# ============================================================
# 5. ALTYAZI + VIDEO (Blender disinda da calisir)
# ============================================================
def secili_kareler(klasor, adim=1, toplam=None, bas=1):
    """Videoya girecek kareler: [(film_karesi_no, dosya)], 1'den adim adim.
    Kare ZAMANI dosya numarasindan gelir, sirasindan degil: 3'te bir
    cizilen onizlemede ya da yarim kalmis cizimde i/fps altyaziyi kaydirir.
    Eksik ya da bos (yer tutucu) kare varsa HATA -- yarim film birlestirilmez."""
    d = os.path.join(klasor, "kare")
    var = {int(f[:-4]): f for f in os.listdir(d) if f.endswith(".png") and f[:-4].isdigit()}
    son = toplam or max(var)
    istenen = list(range(bas, son + 1, adim))
    eksik = [n for n in istenen if n not in var or os.path.getsize(os.path.join(d, var[n])) == 0]
    if eksik:
        raise SystemExit("eksik/bos kare: %d tane (ilk %s)" % (len(eksik), eksik[:5]))
    return [(n, var[n]) for n in istenen]


def altyazi_bas(klasor, adim=1, aralik=None):
    """aralik [a, b]: yalniz o film kareleri (parca: Part 1 / Part 2).
    Altyazi zamani FILM zamaninda kalir; video a karesinden baslar."""
    from PIL import Image, ImageDraw, ImageFont
    bilgi = json.load(open(os.path.join(klasor, "yazilar.json"), encoding="utf-8"))
    fps = bilgi["fps"]
    a, b = aralik or (1, bilgi.get("kare"))
    kareler = secili_kareler(klasor, adim, b, a)
    cikti = os.path.join(klasor, "altyazili")
    os.makedirs(cikti, exist_ok=True)
    for f in os.listdir(cikti):
        os.remove(os.path.join(cikti, f))
    for i, (no, ad) in enumerate(kareler):
        t = (no - 1) / fps
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
            parcalar = ([(y["isim"] + ": ", (255, 214, 90, alfa))] if y["tur"] == "soyle" and y.get("isim") else []) + \
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
        im.save(os.path.join(cikti, "%04d.png" % (i + 1)))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "%g" % (fps / adim),
                    "-i", os.path.join(klasor, "altyazili", "%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                    os.path.join(klasor, "film.mp4")], check=True)


if __name__ == "__main__":
    arg = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    klasor = os.path.abspath(arg[1])
    if "--yazi" in arg:                     # yalniz altyazi + video (Blender'siz)
        altyazi_bas(klasor)
    else:
        tek = None
        if "--kare" in arg:                 # --kare 323  ya da  --kare 323,771,1450
            tek = [int(x) for x in arg[arg.index("--kare") + 1].split(",")]
            tek = tek[0] if len(tek) == 1 else tek
        adim = int(arg[arg.index("--adim") + 1]) if "--adim" in arg else 1
        aralik = [int(x) for x in arg[arg.index("--aralik") + 1].split("-")] if "--aralik" in arg else None
        sen = B.oku(os.path.abspath(arg[0]))
        if "--ayar" in arg:                 # ornek: --ayar '{"ornek": 4, "cozunurluk": [640, 360]}'
            sen.update(json.loads(arg[arg.index("--ayar") + 1]))
        blender_filmi(sen, klasor, "--onizleme" in arg, tek, adim, aralik)
