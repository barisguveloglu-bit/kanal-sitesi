# -*- coding: utf-8 -*-
"""Buz ordusu ve uretecli silahlar filmde: ayar, varlik uretimi ve oyunun
hareket formulleri. Blender gerektirmez (blender_film.py cagirir).  2026-11-24

Kullanici (2026-11-24): "1. maddeyle baslayalim" -- yaratiklari (arac/buz_ordu.py)
ve Hilal Ay'i (arac/tirpan_hilal.py) film aracina baglamak: piksel piksel
isima, creeper'in tislarken isimasi, creeper ve orumcegin yurumesi.

HAREKET UYDURULMADI. Sabitler Mojang'in Java 26.3 istemci JAR'indan javap ile
okundu (REFERANS_MOJANG_KILAVUZ.md "Buz ordusu modelleri"):
  yurume sayaci  LivingEntity.calculateEntityAnimation + updateWalkAnimation:
                 tik basina yatay yol d (blok) -> hedef min(4 d, 1);
                 WalkAnimationState.update: hiz += (hedef - hiz) * 0.4,
                 konum += hiz
  zombi kollari  AnimationUtils.animateZombieArms
  yay durusu     HumanoidModel.poseRightArm / poseLeftArm (BOW_AND_ARROW)
  creeper        CreeperModel.setupAnim (bacaklar), CreeperRenderer.scale
                 (sisme), getWhiteOverlayProgress (yanip sonme)
  orumcek        SpiderModel.setupAnim (bacaklar)
Acilar Bedrock dosya kuralinda (derece); Java'nin y ve z isareti aynen gecer.
Kollarin x'i: oyunun yay durusu xRot -pi/2 ve film araci (bedrock_onizleme)
kolu -90 ile one kaldiriyor; ikisi ayni yone bakiyor (test olcuyor).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

TURLER = {"zombi": 3, "iskelet": 2, "creeper": 2, "orumcek": 2}
INSANSI = ("zombi", "iskelet")            # aktorun kemiklerini tasiyanlar
TIK = 20.0
VARSAYILAN_SILAH = {"iskelet": "buz_yay"}
URETECLI_SILAH = ("karanlik_tirpan_hilal", "buz_yay")
ISIK_GUC = 4.0                             # isima haritasinin varsayilan gucu
TISLA_SURE = 1.5                           # Creeper: maxSwell 30 tik


def derece(r):
    return math.degrees(r)


# ---------------------------------------------------------------- ayar
def yaratik_ayari(v):
    """Aktor ayarindan {"tur", "asama"} ya da None. Yanlis yazim cizim
    baslamadan HATA verir (form_ayari gibi)."""
    tur = v.get("yaratik")
    if tur is None:
        return None
    if tur not in TURLER:
        raise ValueError("yaratik: bilinmeyen tur %r (%s)" % (tur, ", ".join(TURLER)))
    asama = v.get("asama", 1)
    if not isinstance(asama, int) or not 1 <= asama <= TURLER[tur]:
        raise ValueError("yaratik %s: asama 1..%d olmali (%r)" % (tur, TURLER[tur], asama))
    for anahtar in ("form", "diz", "ince", "skin"):
        if v.get(anahtar):
            raise ValueError("yaratik %s: %r insan aktorun ayari, yaratikta yazilmaz" % (tur, anahtar))
    return {"tur": tur, "asama": asama, "insansi": tur in INSANSI}


def silah_adi(v, ayar):
    """yaratigin silahi: yazilmissa o, yazilmamissa turun varsayilani"""
    if v.get("silah"):
        return v["silah"]
    return VARSAYILAN_SILAH.get(ayar["tur"]) if ayar else None


# ---------------------------------------------------------------- varliklar
def _yaz(yol, veri):
    import buz_ordu
    if yol.endswith(".json"):
        with open(yol, "w", encoding="utf-8") as f:
            json.dump(veri, f, indent=1)
    else:
        buz_ordu.png_yaz(yol, veri)
    return yol


def yaratik_varliklari(tur, asama, klasor):
    """buz_ordu ile cizim klasorune geo + doku + isima (+ creeper'da tislama).
    Ayni tur ve asama bir kez uretilir. -> {"geo", "doku", "isik", "tislama"}"""
    import buz_ordu
    os.makedirs(klasor, exist_ok=True)
    kok = os.path.join(klasor, "buz_%s_%d" % (tur, asama))
    yollar = {"geo": kok + ".geo.json", "doku": kok + ".png", "isik": kok + "_isik.png",
              "tislama": kok + "_tislama.png" if tur == "creeper" else None}
    if not all(os.path.isfile(p) for p in yollar.values() if p):
        y = buz_ordu.yaratik(tur, asama)
        _yaz(yollar["geo"], y["geo"])
        _yaz(yollar["doku"], y["renk"])
        _yaz(yollar["isik"], y["isik"])
        if yollar["tislama"]:
            _yaz(yollar["tislama"], y["tislama"])
    return yollar


def silah_varliklari(ad, klasor):
    """uretecli silah -> (geo, doku, isik) cizim klasorunde; degilse None"""
    if ad not in URETECLI_SILAH:
        return None
    os.makedirs(klasor, exist_ok=True)
    if ad == "karanlik_tirpan_hilal":
        import tirpan_hilal
        return tirpan_hilal.uret(klasor)
    import buz_ordu
    yollar = tuple(os.path.join(klasor, "buz_yay" + e) for e in (".geo.json", ".png", "_isik.png"))
    if not all(os.path.isfile(p) for p in yollar):
        _yaz(yollar[0], buz_ordu.yay_geometri())
        _yaz(yollar[1], buz_ordu.yay_paleti(False))
        _yaz(yollar[2], buz_ordu.yay_paleti(True))
    return yollar


# ---------------------------------------------------------------- yurume
def yurume_sayaci(noktalar, fps):
    """Kare basina (konum, hiz): oyunun yurume sayaci, tik yerine kare
    adimiyla. noktalar: [(x, y)] blok (kok). Kare tikten kisaysa sonum
    tik kuralinin karedeki karsiligi: 1 - (1 - 0.4) ** (tik/kare)."""
    n = TIK / fps
    hiz, konum, onceki, cikti = 0.0, 0.0, None, []
    sonum = 1.0 - (1.0 - 0.4) ** n
    for p in noktalar:
        d = 0.0 if onceki is None else math.hypot(p[0] - onceki[0], p[1] - onceki[1]) / n
        hiz += (min(4.0 * d, 1.0) - hiz) * sonum
        konum += hiz * n
        cikti.append((konum, hiz))
        onceki = p
    return cikti


# ---------------------------------------------------------------- insansi kollar
def zombi_kollari(saldirgan=False, vurus=0.0):
    """AnimationUtils.animateZombieArms, yetiskin zombi (kollar hep kalkik).
    vurus 0..1 vurusun ilerleyisi (swingAnimation). -> {kemik: [x, y, z]}"""
    f6 = -math.pi / (1.5 if saldirgan else 2.25)
    f7 = math.sin(vurus * math.pi)
    f8 = math.sin((1.0 - (1.0 - vurus) * (1.0 - vurus)) * math.pi)
    x = f6 + f7 * 1.2 - f8 * 0.4
    y = 0.1 - f7 * 0.6
    return {"rightArm": [derece(x), derece(-y), 0.0], "leftArm": [derece(x), derece(y), 0.0]}


def yay_durusu(bas_yaw=0.0, bas_pitch=0.0):
    """HumanoidModel BOW_AND_ARROW: sag kol yRot -0.1 + bas, sol kol 0.1 + bas + 0.4,
    ikisi de xRot -pi/2 + bas. bas_* derece. -> {kemik: [x, y, z]}"""
    x = derece(-math.pi / 2) + bas_pitch
    return {"rightArm": [x, derece(-0.1) + bas_yaw, 0.0],
            "leftArm": [x, derece(0.1 + 0.4) + bas_yaw, 0.0]}


def kol_ezmesi(ayar, t, olaylar, ad, bas=(0.0, 0.0)):
    """insansi yaratigin o andaki kol durusu (tum kanallari ezer) ya da {}.
    Zombi: kollar hep kalkik; 'saldirgan' olayindan sonra daha yuksek,
    'saldir' olayinda kol savrulur (0.3 sn). Iskelet: 'nisan' suresince yay
    durusu; kollar basin baktigi yere doner (bas: [yaw, pitch] derece)."""
    if not ayar or not ayar["insansi"]:
        return {}
    kendi = [o for o in olaylar if o.get("aktor") == ad and o.get("t", 0) <= t]
    if ayar["tur"] == "zombi":
        saldirgan = any(o.get("saldirgan") for o in kendi)
        vurus = 0.0
        for o in kendi:
            if o.get("saldir") and 0 <= t - o["t"] <= 0.3:
                vurus = (t - o["t"]) / 0.3
        return zombi_kollari(saldirgan, vurus)
    for o in kendi:
        if o.get("nisan") is not None and t - o["t"] <= float(o["nisan"]):
            return yay_durusu(bas[0], bas[1])
    return {}


# ---------------------------------------------------------------- creeper, orumcek
CREEPER_BACAK = {"rightHindLeg": 0.0, "leftHindLeg": math.pi, "rightFrontLeg": math.pi, "leftFrontLeg": 0.0}
# (sag, sol) bacak: SpiderModel.setupAnim'deki faz sirasi
ORUMCEK_CIFT = [("rightHindLeg", "leftHindLeg", 0.0), ("rightMiddleHindLeg", "leftMiddleHindLeg", math.pi),
                ("rightMiddleFrontLeg", "leftMiddleFrontLeg", math.pi / 2),
                ("rightFrontLeg", "leftFrontLeg", 3 * math.pi / 2)]


def creeper_pozu(konum, hiz, bas=(0.0, 0.0)):
    """CreeperModel.setupAnim: capraz bacak ciftleri xRot = cos(konum*0.6662 + faz) * 1.4 * hiz.
    -> {kemik: [x, y, z]} (dinlenme donusu yok)"""
    poz = {k: [derece(math.cos(konum * 0.6662 + faz) * 1.4 * hiz), 0.0, 0.0] for k, faz in CREEPER_BACAK.items()}
    poz["head"] = [bas[1], bas[0], 0.0]
    return poz


def orumcek_pozu(dinlenme, konum, hiz, bas=(0.0, 0.0)):
    """SpiderModel.setupAnim: bacaklarin dinlenme donusune y ve z eklenir.
    dinlenme: {kemik: [x, y, z]} (geometriden). -> {kemik: [x, y, z]}"""
    f = konum * 0.6662
    poz = {"head": [bas[1], bas[0], 0.0]}
    for sag, sol, faz in ORUMCEK_CIFT:
        dy = -(math.cos(f * 2.0 + faz) * 0.4) * hiz
        dz = abs(math.sin(f + faz) * 0.4) * hiz
        for kem, isaret in ((sag, 1.0), (sol, -1.0)):
            r = list(dinlenme.get(kem, [0.0, 0.0, 0.0]))
            poz[kem] = [r[0], r[1] + derece(isaret * dy), r[2] + derece(isaret * dz)]
    return poz


def sisme(t, olaylar, ad):
    """creeper'in sismesi 0..1: 'tisla' olayinin suresince dogrusal artar
    (oyunda swell her tik 1 artar, maxSwell 30 tik = 1,5 sn), sonra 1'de kalir."""
    s = 0.0
    for o in olaylar:
        if o.get("aktor") == ad and o.get("tisla") is not None and t >= o["t"]:
            sure = float(o["tisla"]) or TISLA_SURE
            s = max(s, min(1.0, (t - o["t"]) / sure))
    return s


def sisme_olcegi(s):
    """CreeperRenderer.scale -> (x ve z olcegi, y olcegi)"""
    f1 = 1.0 + math.sin(s * 100.0) * s * 0.01
    f = max(0.0, min(1.0, s)) ** 4
    return ((1.0 + f * 0.4) * f1, (1.0 + f * 0.1) / f1)


def yanip_sonme(s):
    """CreeperRenderer.getWhiteOverlayProgress: oyunda beyaz yanip sonme.
    Burada tislama isimasinin gucu (0 ya da 0.5..1)."""
    if int(s * 10.0) % 2 == 0:
        return 0.0
    return max(0.5, min(1.0, s))
