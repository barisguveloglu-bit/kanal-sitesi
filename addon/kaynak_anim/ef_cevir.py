#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Epic Fight animasyonlarini Bedrock bicimine cevirir.

---- IKI BICIM ARASINDAKI FARK ----
Epic Fight: her eklem icin kare zamanlari + her karede 4x4
            DONUSUM MATRISI (mutlak yerel poz, baglama pozu
            dahil). Kendi iskeleti: Root/Torso/Chest/Head/
            Shoulder_R/Arm_R/Elbow_R/Hand_R/Thigh_R/Leg_R...
Bedrock:    kemik basina euler DERECE (+ konum/olcek), vanilla
            oyuncu kemikleri: head/body/rightArm/leftArm/
            rightLeg/leftLeg.

---- CEVRIM ----
1. Baglama pozu (armature) her eklemin YEREL dinlenme
   matrisini veriyor. Animasyondaki matris de yerel ve
   dinlenme pozunu ICERIYOR, o yuzden DELTA aliniyor:
       D(t) = bind^-1 · L(t)
   Delta olmadan her kemik dinlenme pozu kadar kayardi.

2. Bedrock'un oyuncu iskeletinde KOL TEK KEMIK, Epic Fight'ta
   zincir (Shoulder -> Arm -> Elbow -> Hand). Zincirin
   deltalari CARPILIYOR:
       rightArm = D(Shoulder_R) · D(Arm_R)
   Dirsek bukulmesi KAYBOLUYOR -- Bedrock'ta onu tasiyacak
   kemik yok. Aktarilan sey kolun GENEL YONU.

3. Matris -> euler XYZ derece (standart ayristirma).

4. Bedrock kurali: dosyadaki deger matematiksel donusun
   TERSI (bu depoda v4.88'de olculdu). O yuzden isaret
   cevriliyor.
"""
import json, math, os, sys

BEDROCK_TERS = True          # v4.88'de olculdu

# Bedrock kemigi -> Epic Fight zinciri (sirayla carpilir)
ZINCIR = {
    "head":     ["Head"],
    "body":     ["Torso", "Chest"],
    "rightArm": ["Shoulder_R", "Arm_R"],
    "leftArm":  ["Shoulder_L", "Arm_L"],
    "rightLeg": ["Thigh_R", "Leg_R"],
    "leftLeg":  ["Thigh_L", "Leg_L"],
}

# ---- HIYERARSI FARKI: BACAKLAR ----
# Epic Fight'ta Thigh_R, Root'un cocugu -- Torso'nun KARDESI.
# Bedrock'ta rightLeg, body'nin COCUGU. Yani body'ye verdigimiz
# donus bacaklara da mirasla geciyor ve govde donusu IKI KEZ
# uygulanmis oluyor.
#
# Olculdu: bu duzeltme olmadan kilic sallamada bacaklar ~50
# derece donuyordu -- bir kilic vurusunda olmayacak bir sey.
#
# Duzeltme: bacagin deltasindan govdenin deltasi cikariliyor.
#     rightLeg = (D(Torso)·D(Chest))^-1 · D(Thigh_R) · D(Leg_R)
#
# Kol ve kafa icin GEREKMIYOR: Epic Fight'ta ikisi de Chest'in
# altinda, Bedrock'ta ikisi de body'nin altinda -- hiyerarsi
# ayni.
GOVDE_CIKAR = {"rightLeg", "leftLeg"}


def mat(v):
    """16 float -> 4x4 (satir oncelikli)."""
    return [v[0:4], v[4:8], v[8:12], v[12:16]]


def carp(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)]
            for i in range(4)]


def birim():
    return [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]


def ters_donus(m):
    """Sadece DONUS+OTELEME iceren bir matrisin tersi.

    Donus kismi ortonormal kabul ediliyor (baglama pozunda
    olcek yok -- kontrol edildi), o yuzden tersi devrigi.   """
    r = [[m[j][i] for j in range(3)] for i in range(3)]
    t = [m[0][3], m[1][3], m[2][3]]
    tt = [-sum(r[i][k] * t[k] for k in range(3)) for i in range(3)]
    return [r[0] + [tt[0]], r[1] + [tt[1]], r[2] + [tt[2]], [0, 0, 0, 1]]


def euler_xyz(m):
    """Donus matrisi -> (x, y, z) derece, XYZ sirasi."""
    sy = -m[2][0]
    sy = max(-1.0, min(1.0, sy))
    y = math.asin(sy)
    if abs(sy) < 0.99999:
        x = math.atan2(m[2][1], m[2][2])
        z = math.atan2(m[1][0], m[0][0])
    else:                       # gimbal kilidi
        x = math.atan2(-m[1][2], m[1][1])
        z = 0.0
    return [math.degrees(a) for a in (x, y, z)]


def baglama(yol):
    """armature -> eklem adi -> yerel dinlenme matrisi."""
    d = json.load(open(yol, encoding="utf-8"))
    out = {}

    def gez(n):
        out[n["name"]] = mat(n["transform"])
        for c in (n.get("children") or []):
            gez(c)
    kok = d["armature"]["hierarchy"]
    for n in (kok if isinstance(kok, list) else [kok]):
        gez(n)
    return out


def kare_bul(zaman, kareler, t):
    """t aninda eklemin matrisi (en yakin kare; ara deger yok).

    Ara deger HESAPLANMIYOR: Bedrock zaten kareler arasini
    kendisi yumusatiyor ve biz ORIJINAL kare zamanlarini
    kullaniyoruz. Sadece bir eklemin karesi baska bir eklemin
    zamaninda yoksa en yakini aliniyor.                     """
    en = 0
    for i, z in enumerate(zaman):
        if z <= t + 1e-6:
            en = i
    return kareler[en]


def cevir(anim_yol, bind, ad):
    d = json.load(open(anim_yol, encoding="utf-8"))
    eklem = {e["name"]: e for e in d["animation"]}

    # Butun kare zamanlarinin birlesimi
    zamanlar = sorted({round(t, 4) for e in d["animation"] for t in e["time"]})
    if not zamanlar:
        return None

    def zincirMat(zincir, t):
        m = birim()
        for j in zincir:
            e = eklem.get(j)
            if not e:
                continue
            L = mat(kare_bul(e["time"], e["transform"], t))
            m = carp(m, carp(ters_donus(bind[j]), L))
        return m

    kemikler = {}
    for bkemik, zincir in ZINCIR.items():
        if not any(j in eklem for j in zincir):
            continue
        # Bu kemigin KENDI kare zamanlari: birlesim kullanmak
        # merdiven basamagi yapiyordu (her kemik digerlerinin
        # zamanlarinda ayni degeri tekrarliyordu). Bedrock
        # kareler arasini zaten kendisi yumusatiyor.
        kendiZaman = sorted({round(t, 4) for j in zincir
                             if j in eklem for t in eklem[j]["time"]})
        donusler = {}
        for t in kendiZaman:
            m = zincirMat(zincir, t)
            if bkemik in GOVDE_CIKAR:
                m = carp(ters_donus(zincirMat(ZINCIR["body"], t)), m)
            r = euler_xyz(m)
            if BEDROCK_TERS:
                r = [-a for a in r]
            donusler[("%.4f" % t)] = [round(a, 2) for a in r]
        # ---- TEKRAR EDEN KARELERI AT ----
        # Bedrock kareler arasini kendisi yumusatiyor; ust uste
        # ayni degeri yazmak dosyayi bosuna sisiriyor. Ilk ve
        # SON kare her zaman kaliyor (sonu atmak animasyonu
        # yarida keserdi).
        anahtarlar = list(donusler)
        suzulmus = {}
        onceki = None
        for i, k in enumerate(anahtarlar):
            v = donusler[k]
            son = (i == len(anahtarlar) - 1)
            if onceki is None or son or any(
                    abs(a - b) > 0.05 for a, b in zip(v, onceki)):
                suzulmus[k] = v
                onceki = v
        donusler = suzulmus
        # Hicbir sey donmuyorsa kemigi hic yazma
        if all(all(abs(a) < 0.05 for a in v) for v in donusler.values()):
            continue
        kemikler[bkemik] = {"rotation": donusler}

    if not kemikler:
        return None
    return {
        "loop": False,
        "animation_length": max(zamanlar),
        "bones": kemikler,
    }


if __name__ == "__main__":
    bind = baglama(sys.argv[1])
    out = {"format_version": "1.8.0", "animations": {}}
    for yol in sys.argv[3:]:
        ad = os.path.splitext(os.path.basename(yol))[0]
        a = cevir(yol, bind, ad)
        if a:
            out["animations"]["animation.ef." + ad] = a
            print("  %-28s %d kemik, %.2f sn" %
                  (ad, len(a["bones"]), a["animation_length"]))
        else:
            print("  %-28s ATLANDI (hareket yok)" % ad)
    json.dump(out, open(sys.argv[2], "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("yazildi:", sys.argv[2], len(out["animations"]), "animasyon")
