# -*- coding: utf-8 -*-
"""WoM + Epic Fight kilic setleri -> Bedrock oyuncu animasyonu.  v7.99

Kullanim:
    python3 addon/arac/wom_cevir.py <wom_kok> <epicfight_kok> [--rapor]

<wom_kok>, <epicfight_kok>: JAR'in kendisi ya da acilmis klasoru
(Weapons of Miracles 2.0.178, Epic Fight 21.17.3.1). Sinif
dosyalarindan zaman okumak icin `javap` (JDK) gerekiyor.

Yazdiklari (ikisi de depoda, kol_uret.py oradan kopyaliyor):
    kaynak_anim/wom/wom_kilic.animation.json   animasyonlar
    kaynak_anim/wom/wom_kilic.hareket.json     zaman, hasar, hamle

---- NEDEN UCUNCU KEZ, NE DEGISTI ----
v7.98.0'in cevirisi uzuvlarin YONUNU dogru veriyordu ama govdeyi
Chest ekleminden `body`'ye koyuyordu. Bedrock'ta `body` BOYUNDAN
(24 px) doner; tek kutu oldugu icin alt ucu kalcadan kayiyordu
(63 animasyonun 60'inda > 2 px, en kotu 15.3 px). Epic Fight
govdeyi KALCADAN (Torso 13 px) ve gogus ortasindan (Chest 17.8 px,
60 karisik tepe) bukuyor -- REFERANS_WOM.md "gercek Java
istemcisinde gozlem".

Burada:
  1. Govde egilmesi `waist`'e (12 px, kalca hizasi). `body`
     waist'e gore SIFIR. Kalca noktasi tasarim geregi yerinde.
  2. Silah `rightItem`/`leftItem` kemigine: Tool_R/Tool_L'nin
     dunya donusu. Dinlenmede iki tarafta da bicak ileri bakiyor
     (Epic Fight bind: Tool_R yerel -Z dunyada +Y = on).
  3. Donusun merkezi KALCA: Epic Fight Root'u 12.2 px'ten
     donduruyor, Bedrock root'u ayaktan. Fark root konumuna
     yaziliyor (c - R.c), yoksa takla ayak ustunde doner.
  4. Kok KAYMASI animasyonda YOK, hareket verisine gidiyor.
     Epic Fight de oyle yapiyor (ActionAnimation.correctRootJoint):
     yatay kayma modelden silinir, oyuncuyu tasir; dikey kayma
     yalniz MOVE_VERTICAL varsa ve yukariysa oyuncuya gider,
     yoksa gorunumde kalir.
  5. `Coord` eklemi (Epic Fight'in kendi dosyalarinin bir kismi):
     Root'un ebeveyni, armature'de yok. Zincire katiliyor.

---- KURALLAR NEREDEN ----
Epic Fight -> Blockbench ic uzayi C = (x, z, -y); Bedrock dosyasi =
ic donusun (-x, -y, +z)'si, euler ZYX (M = Rz.Ry.Rx); konum
(-x, y, z). Kaynak ve vanilla ile capraz sinama v7.98.0 belgesinde
(REFERANS_WOM.md "Kurallar nereden"). Zaman ve hasar: sinif
dosyalarindaki AttackAnimation / Phase kurucularinin sabitleri.
"""
import io
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import zipfile

BURASI = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.dirname(BURASI)
CIKTI_ANIM = os.path.join(ADDON, "kaynak_anim", "wom", "wom_kilic.animation.json")
CIKTI_HAREKET = os.path.join(ADDON, "kaynak_anim", "wom", "wom_kilic.hareket.json")

ANIM_ONEK = "animation.wom."

# ---------------- KILIC VE ASA SETLERI ----------------
# Kaynak: WOMWeaponCapabilityPresets (setin stili, livingMotionModifier,
# newStyleCombo) ve EpicFightMovesets. Kombo listesinin sonu Epic Fight
# kurali: binek vurusu varsa son uc = kosu, hava, binek; yoksa son iki
# = kosu, hava. Binek vurusu Bedrock'ta kullanilmiyor, alinmadi.
#   sinif: zaman ve hasarin okundugu sinif (yoksa Epic Fight Animations)
#   hiz:   Java saldiri hizi (4 + degistirici). Epic Fight oynatma hizi
#          = hiz / BASIS_ATTACK_SPEED; sure buna gore olcekleniyor.
KILIC = {
    "ruine": {
        "esyalar": ["ruine"], "sinif": "AnimsRuine", "kaynak": "wom", "hiz": 4 - 2.45,
        "durus": "biped/living/ruine_idle",
        "oto": ["biped/combat/ruine_auto_1", "biped/combat/ruine_auto_2",
                "biped/combat/ruine_auto_3", "biped/combat/ruine_auto_4"],
        "kosu": "biped/combat/ruine_chatiment", "hava": "biped/combat/ruine_comet",
    },
    "longsword": {
        "esyalar": ["hollow_longsword"], "sinif": None, "kaynak": "ef", "hiz": 4 - 2.6,
        "durus": "biped/living/hold_longsword",
        "oto": ["biped/combat/longsword_auto1", "biped/combat/longsword_auto2",
                "biped/combat/longsword_auto3"],
        "kosu": "biped/combat/longsword_dash", "hava": "biped/combat/longsword_airslash",
    },
    "satsujin": {
        "esyalar": ["satsujin"], "sinif": "AnimsSatsujin", "kaynak": "wom", "hiz": 4 - 1.8,
        "durus": "biped/living/katana_idle",
        "oto": ["biped/combat/katana_auto_1", "biped/combat/katana_auto_2",
                "biped/combat/katana_auto_3"],
        "kosu": "biped/combat/katana_harusaki", "hava": "biped/combat/katana_tsukuyomi",
    },
    "evil_tachi": {
        "esyalar": ["evil_tachi"], "sinif": None, "kaynak": "ef", "hiz": 4 - 2.8,
        "durus": "biped/living/hold_tachi",
        "oto": ["biped/combat/tachi_auto1", "biped/combat/tachi_auto2",
                "biped/combat/tachi_auto3"],
        "kosu": "biped/combat/tachi_dash", "hava": "biped/combat/spear_twohand_airslash",
    },
    "nova": {
        "esyalar": ["nova"], "sinif": "AnimsNova", "kaynak": "wom", "hiz": 4 - 2.4,
        "durus": "biped/living/nova_idle",
        "oto": ["biped/combat/nova_attack_1", "biped/combat/nova_attack_2",
                "biped/combat/nova_attack_3", "biped/combat/nova_attack_4"],
        "kosu": "biped/combat/nova_attack_dash", "hava": "biped/combat/nova_attack_airslash",
    },
    "herrscher": {
        "esyalar": ["herrscher"], "sinif": "AnimsHerrscher", "kaynak": "wom", "hiz": 4 - 2.25,
        "durus": "biped/living/herrscher_idle",
        "oto": ["biped/combat/herrscher_auto_1", "biped/combat/herrscher_auto_2",
                "biped/combat/herrscher_auto_3"],
        "kosu": "biped/combat/herrscher_verdammnis", "hava": "biped/combat/herrscher_ausrottung",
    },
    "solar": {
        "esyalar": ["solar"], "sinif": "AnimsSolar", "kaynak": "wom", "hiz": 4 - 2.9,
        "durus": "biped/living/solar_idle",
        "oto": ["biped/combat/solar_auto_1", "biped/combat/solar_auto_2",
                "biped/combat/solar_auto_3", "biped/combat/solar_auto_4"],
        "kosu": "biped/combat/solar_quemadura", "hava": "biped/combat/solar_horno",
    },
}
# ---- ASALAR (v7.99.1) ----
# Alti asa ayni seti kullaniyor (data/wom/capabilities/weapons/*_staff.json
# -> "wom:staff"), ama saldiri hizi kademeye bagli (StaffItem typeSwitch:
# WOOD -2.3, STONE -2.5, IRON -2.65, GOLD -2.2, DIAMOND -2.3, NETHERITE
# -2.45). Epic Fight oynatma hizini silahin hizindan aliyor; bu yuzden
# her asa KENDI hiziyla ayri bir set. Kombo: STAFF_AUTO_1..3, kosu
# STAFF_SQUALL, hava STAFF_KINKONG (binek var -> son uc).
ASA_HIZ = {"wooden_staff": -2.3, "stone_staff": -2.5, "iron_staff": -2.65,
           "golden_staff": -2.2, "diamond_staff": -2.3, "netherite_staff": -2.45}
for _asa, _hiz in ASA_HIZ.items():
    KILIC[_asa] = {
        "esyalar": [_asa], "sinif": "reascer/wom/gameasset/WOMAnimations",
        "kaynak": "wom", "hiz": 4 + _hiz,
        "durus": "biped/living/staff_idle",
        "oto": ["biped/combat/staff_auto_1", "biped/combat/staff_auto_2",
                "biped/combat/staff_auto_3"],
        "kosu": "biped/combat/staff_squall", "hava": "biped/combat/staff_kingkong",
    }
WOM_SINIF_KLASOR = "reascer/wom/gameasset/animations/weapons/"
EF_SINIF = "yesman/epicfight/gameasset/Animations"

C = [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]]
CT = [[C[j][i] for j in range(3)] for i in range(3)]

# Bedrock kemigi -> (Epic Fight eklemi, uc noktasi)
KEMIK = {
    "root":      ("Root", None),
    "waist":     ("Chest", None),      # govdenin TAMAMI kalcadan
    "body":      ("Chest", None),      # waist'e gore sifir
    "head":      ("Head", None),
    "rightArm":  ("Arm_R", ("eklem", "Tool_R")),
    "leftArm":   ("Arm_L", ("eklem", "Tool_L")),
    "rightItem": ("Tool_R", None),
    "leftItem":  ("Tool_L", None),
    "rightLeg":  ("Thigh_R", ("ayak", "Leg_R")),
    "leftLeg":   ("Thigh_L", ("ayak", "Leg_L")),
}
ATA = {"root": None, "waist": "root", "body": "waist", "head": "body",
       "rightArm": "body", "leftArm": "body",
       "rightItem": "rightArm", "leftItem": "leftArm",
       "rightLeg": "root", "leftLeg": "root"}
SIRA = ["root", "waist", "body", "head", "rightArm", "leftArm",
        "rightItem", "leftItem", "rightLeg", "leftLeg"]
UST = {"waist", "body", "head", "rightArm", "leftArm", "rightItem", "leftItem"}

KALCA_PX = 12.2          # Epic Fight Root'unun yuksekligi (biped.json)
ARA_ESIK = 3.0           # derece -- ara deger hatasi tavani
EN_KISA = 1.0 / 240
SIFIR_ESIK = 0.05
TICK = 0.05


# ---------------- kaynak okuma ----------------
class Kaynak:
    """JAR ya da acilmis klasor."""

    def __init__(self, yol):
        self.yol = yol
        self.zip = None if os.path.isdir(yol) else zipfile.ZipFile(yol)

    def var(self, ic):
        if self.zip:
            return ic in self.zip.namelist()
        return os.path.exists(os.path.join(self.yol, ic))

    def oku(self, ic):
        if self.zip:
            return self.zip.read(ic)
        with open(os.path.join(self.yol, ic), "rb") as f:
            return f.read()

    def json(self, ic):
        return json.loads(self.oku(ic).decode("utf-8"))


def javap(kaynak, sinif, v=False):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, os.path.basename(sinif) + ".class")
        with open(p, "wb") as f:
            f.write(kaynak.oku(sinif + ".class"))
        arg = ["javap", "-c", "-p"] + (["-v"] if v else []) + [p]
        return subprocess.run(arg, capture_output=True, text=True,
                              env=dict(os.environ, JAVA_TOOL_OPTIONS="")).stdout


FAZ_SINIF = ("AttackAnimation", "BasicMultipleAttackAnimation", "ComboAttackAnimation",
             "DashAttackAnimation", "AirSlashAnimation", "SpecialAttackAnimation",
             "BasicAttackAnimation")


def zamanlar(kaynak, sinif):
    """Sinifin statik blogu: yol -> {tur, sabitler}.

    Animasyonlar AnimationBuilder.nextAccessor(yol, lambda) ile
    kuruluyor; lambda kurucuyu cagiriyor. Lambda'nin govdesindeki
    float sabitleri SIRAYLA kurucu argumanlari.               """
    c = javap(kaynak, sinif).split("\n")
    v = javap(kaynak, sinif, v=True)
    bm = v[v.index("BootstrapMethods:"):]
    bmap = {int(a): b for a, b in re.findall(
        r"\n  (\d+): #\d+ REF_invokeStatic java/lang/invoke/LambdaMetafactory[^\n]*\n"
        r"    Method arguments:\n      [^\n]*\n      #\d+ REF_\w+ [\w/$]+\.(lambda\$\w+\$\d+)", bm)}
    blok, ad = {}, None
    for s in c:
        m = re.match(r"  \S.*? (lambda\$\w+\$\d+)\(", s)
        if m:
            ad = m.group(1)
            blok[ad] = []
            continue
        if re.match(r"  (public|private|static|protected)", s):
            ad = "_"
            blok.setdefault(ad, [])
            continue
        if ad:
            blok[ad].append(s)
    esle, yol = {}, None
    for satirlar in blok.values():
        for s in satirlar:
            m = re.search(r"// String (biped/[\w/]+)", s)
            if m:
                yol = m.group(1)
            m = re.search(r"InvokeDynamic #(\d+):", s)
            if m and yol and int(m.group(1)) in bmap:
                esle.setdefault(yol, bmap[int(m.group(1))])
                yol = None
    sonuc = {}
    for yol, lam in esle.items():
        dizi, tur = [], None
        for s in blok.get(lam, []):
            m = re.search(r"new +#\d+ +// class ([\w/$]+)", s)
            if m:
                k = m.group(1).split("/")[-1]
                if k.endswith("$Phase"):
                    dizi.append("FAZ")
                elif tur is None and "Animation" in k:
                    tur = k
                continue
            m = re.search(r"// float (\S+)", s) or re.search(r"\bfconst_(\d)\b", s)
            if m:
                dizi.append(float(m.group(1).rstrip("f")))
                continue
            m = re.search(r"Field [\w/$]*AnimationProperty\$\w+\.(\w+):", s)
            if m:
                dizi.append(m.group(1))
        sonuc[yol] = {"tur": tur, "dizi": dizi}
    return sonuc


def fazlari_coz(z):
    """(gecis, [faz...], ozellikler).

    Tek fazli kurucu: (gecis, antic, contact, recovery, ...).
    Cok fazli: (gecis, Phase(bas, antic, contact, recovery, son), ...).
    Hasar: DAMAGE_MODIFIER'dan sonraki ilk sayi, fazlarla sirayla.  """
    d = z["dizi"]
    fazlar = []
    if "FAZ" in d:
        gecis = d[0]
        i = 0
        while True:
            try:
                i = d.index("FAZ", i) + 1
            except ValueError:
                break
            s = [x for x in d[i:i + 5]]
            if len(s) == 5 and all(isinstance(x, float) for x in s):
                fazlar.append({"bas": s[0], "antic": s[1], "contact": s[2],
                               "recovery": s[3], "son": s[4]})
    else:
        s = [x for x in d if isinstance(x, float)]
        gecis = s[0]
        if len(s) >= 4:
            fazlar.append({"bas": 0.0, "antic": s[1], "contact": s[2],
                           "recovery": s[3], "son": 3.4e38})
    ozellik = [x for x in d if isinstance(x, str) and x != "FAZ"]
    hasar = []
    for i, x in enumerate(d):
        if x == "DAMAGE_MODIFIER":
            n = next((y for y in d[i + 1:i + 3] if isinstance(y, float)), None)
            hasar.append(n if n is not None else 1.0)
    for i, f in enumerate(fazlar):
        f["hasar"] = hasar[i] if i < len(hasar) else (hasar[-1] if hasar else 1.0)
    temel = 1.0
    for i, x in enumerate(d):
        if x == "BASIS_ATTACK_SPEED":
            n = next((y for y in d[i + 1:i + 2] if isinstance(y, float)), None)
            if n:
                temel = n
    return gecis, fazlar, ozellik, temel


# ---------------- dogrusal cebir ----------------
def m4(v):
    return [v[0:4], v[4:8], v[8:12], v[12:16]]


def carp4(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def carp3(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def devrik(m):
    return [[m[j][i] for j in range(3)] for i in range(3)]


def rot(m):
    return [row[:3] for row in m[:3]]


def det3(r):
    return (r[0][0] * (r[1][1] * r[2][2] - r[1][2] * r[2][1])
            - r[0][1] * (r[1][0] * r[2][2] - r[1][2] * r[2][0])
            + r[0][2] * (r[1][0] * r[2][1] - r[1][1] * r[2][0]))


def konum(m):
    return [m[0][3], m[1][3], m[2][3]]


def uygula(m, v):
    return [sum(m[i][k] * v[k] for k in range(3)) for i in range(3)]


def uygula4(m, v):
    return [sum(m[i][k] * v[k] for k in range(3)) + m[i][3] for i in range(3)]


def fark(a, b):
    return [a[i] - b[i] for i in range(3)]


def birim4():
    return [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]


BIRIM3 = [[1.0, 0, 0], [0, 1.0, 0], [0, 0, 1.0]]


def normal(v):
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v] if n > 1e-12 else [0.0, 0.0, 0.0]


def dik_yap(m):
    x = normal([m[0][0], m[1][0], m[2][0]])
    y = [m[0][1], m[1][1], m[2][1]]
    d = sum(x[i] * y[i] for i in range(3))
    y = normal([y[i] - d * x[i] for i in range(3)])
    z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]
    return [[x[i], y[i], z[i]] for i in range(3)]


def en_kucuk_donus(a, b):
    a, b = normal(a), normal(b)
    v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    c = sum(a[i] * b[i] for i in range(3))
    s = math.sqrt(sum(x * x for x in v))
    if s < 1e-9:
        if c > 0:
            return [r[:] for r in BIRIM3]
        dik = [1.0, 0, 0] if abs(a[0]) < 0.9 else [0, 1.0, 0]
        e = normal([a[1] * dik[2] - a[2] * dik[1], a[2] * dik[0] - a[0] * dik[2],
                    a[0] * dik[1] - a[1] * dik[0]])
        return [[2 * e[i] * e[j] - (1.0 if i == j else 0.0) for j in range(3)] for i in range(3)]
    k = [x / s for x in v]
    K = [[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]]
    K2 = carp3(K, K)
    return [[(1.0 if i == j else 0.0) + s * K[i][j] + (1 - c) * K2[i][j]
             for j in range(3)] for i in range(3)]


def kuat(m):
    t = m[0][0] + m[1][1] + m[2][2]
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        q = [0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s]
    elif m[0][0] > m[1][1] and m[0][0] > m[2][2]:
        s = math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2
        q = [(m[2][1] - m[1][2]) / s, 0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s]
    elif m[1][1] > m[2][2]:
        s = math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2
        q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s]
    else:
        s = math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2
        q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s]
    n = math.sqrt(sum(x * x for x in q))
    return [x / n for x in q]


def kuat_mat(q):
    w, x, y, z = q
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]


def slerp(a, b, u):
    d = sum(a[i] * b[i] for i in range(4))
    if d < 0:
        b, d = [-x for x in b], -d
    if d > 0.9995:
        q = [a[i] + u * (b[i] - a[i]) for i in range(4)]
    else:
        th = math.acos(min(1.0, d))
        s = math.sin(th)
        wa, wb = math.sin((1 - u) * th) / s, math.sin(u * th) / s
        q = [wa * a[i] + wb * b[i] for i in range(4)]
    n = math.sqrt(sum(x * x for x in q))
    return [x / n for x in q]


# ---------------- Epic Fight animasyonu ----------------
def armatur(d):
    yerel, ata = {}, {}

    def gez(n, p):
        yerel[n["name"]] = m4(n["transform"])
        ata[n["name"]] = p
        for c in n.get("children") or []:
            gez(c, n["name"])
    kok = d["armature"]["hierarchy"]
    for n in (kok if isinstance(kok, list) else [kok]):
        gez(n, None)
    return yerel, ata


def ef_ara(ts, t):
    """TransformSheet.getInterpolationInfo, BIREBIR (siralamadan ikili
    arama -- kaynakta sirasiz zaman dizileri var, v7.98.0 notu)."""
    lo, hi = 0, len(ts) - 1
    while hi - lo > 1:
        mid = lo + (hi - lo) // 2
        if ts[mid] <= t and ts[mid + 1] > t:
            lo, hi = mid, mid + 1
            break
        if ts[mid] > t:
            hi = mid
        elif ts[mid + 1] <= t:
            lo = mid
    pay, bol = t - ts[lo], ts[hi] - ts[lo]
    if bol == 0:
        u = 1.0 if pay >= 0 else 0.0
    else:
        u = max(0.0, min(1.0, pay / bol))
    return lo, hi, u


def zincir(ad, ata):
    z = []
    while ad is not None:
        z.append(ad)
        ad = ata[ad]
    return list(reversed(z))


class Animasyon:
    def __init__(self, veri, taban):
        self.bind, self.ata = armatur(veri if "armature" in veri else taban)
        # Coord: Root'un ebeveyni (Epic Fight JsonAssetLoader "Coord").
        # Dinlenmesi birim; dosyada varsa zincirin basi o.
        if any(e["name"] == "Coord" and e["time"] for e in veri["animation"]):
            self.bind["Coord"] = birim4()
            self.ata["Coord"] = None
            self.ata["Root"] = "Coord"
        self.eklem, self.olcek = {}, {}
        for e in veri["animation"]:
            if e["name"] not in self.bind or not e["time"]:
                continue
            mats = [m4(k) for k in e["transform"]]
            olc = [abs(det3(rot(m))) ** (1.0 / 3.0) for m in mats]
            gecerli = [i for i, o in enumerate(olc) if o > 0.1]
            if not gecerli:
                continue
            for i in range(len(mats)):
                if olc[i] <= 0.1:
                    j = min(gecerli, key=lambda g: (abs(g - i), -g))
                    mats[i] = mats[j]
            self.olcek[e["name"]] = (e["time"], olc)
            self.eklem[e["name"]] = (e["time"], [kuat(dik_yap(rot(m))) for m in mats],
                                     [konum(m) for m in mats])
        zs = [t for (ts, _, _) in self.eklem.values() for t in ts]
        self.sure = max(zs) if zs else 0.0
        self.anahtar = sorted({round(t, 4) for t in zs})

    def yerel(self, ad, t):
        if ad not in self.eklem:
            return self.bind[ad]
        ts, qs, ps = self.eklem[ad]
        i, j, u = ef_ara(ts, t)
        R = kuat_mat(slerp(qs[i], qs[j], u))
        p = [ps[i][k] + u * (ps[j][k] - ps[i][k]) for k in range(3)]
        return [R[0] + [p[0]], R[1] + [p[1]], R[2] + [p[2]], [0, 0, 0, 1.0]]

    def dunya(self, ad, t=None):
        m = birim4()
        for j in zincir(ad, self.ata):
            m = carp4(m, self.bind[j] if t is None else self.yerel(j, t))
        return m

    def gorunur(self, t):
        if "Root" not in self.olcek:
            return 1.0
        ts, ol = self.olcek["Root"]
        i, j, u = ef_ara(ts, t)
        return ol[i] + (ol[j] - ol[i]) * u


def ayak_ofseti(anim, bacak):
    W = anim.dunya(bacak)
    p = konum(W)
    return uygula(devrik(rot(W)), fark([p[0], p[1], 0.0], p))


def uc_konum(anim, uc, t):
    tur, ad = uc
    if tur == "eklem":
        return konum(anim.dunya(ad, t))
    return uygula4(anim.dunya(ad, t), ayak_ofseti(anim, ad))


def dunya_farki(anim, bkemik, t):
    """Kemigin dunyadaki poz degisimi (dinlenmeye gore), BB ic uzayinda."""
    ek, uc = KEMIK[bkemik]
    G = carp3(rot(anim.dunya(ek, t)), devrik(rot(anim.dunya(ek))))
    if uc is not None:
        k0 = konum(anim.dunya(ek))
        c0 = fark(uc_konum(anim, uc, None), k0)
        c = fark(uc_konum(anim, uc, t), konum(anim.dunya(ek, t)))
        G = carp3(en_kucuk_donus(uygula(G, c0), c), G)
    return carp3(carp3(C, dik_yap(G)), CT)


def yerel_donus(anim, bkemik, t, kok_yok=False):
    G = dunya_farki(anim, bkemik, t)
    a = ATA[bkemik]
    if a is None or (kok_yok and a == "root"):
        # Kok yazilmiyorsa (ust beden durusu) waist kokun donusunu da
        # tasiyor: dunyadaki farkin tamami.
        return G
    return carp3(devrik(dunya_farki(anim, a, t)), G)


# ---------------- euler ----------------
def euler_zyx(m):
    sy = max(-1.0, min(1.0, -m[2][0]))
    y = math.asin(sy)
    if abs(sy) < 0.99999:
        x = math.atan2(m[2][1], m[2][2])
        z = math.atan2(m[1][0], m[0][0])
    else:
        x = math.atan2(-m[1][2], m[1][1])
        z = 0.0
    return [math.degrees(a) for a in (x, y, z)]


def euler_mat(e):
    x, y, z = [math.radians(a) for a in e]
    cx, sx, cy, sy, cz, sz = math.cos(x), math.sin(x), math.cos(y), math.sin(y), math.cos(z), math.sin(z)
    Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
    Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
    Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]
    return carp3(carp3(Rz, Ry), Rx)


def en_yakin(a, onceki):
    return a + 360.0 * round((onceki - a) / 360.0)


def euler_surekli(m, onceki):
    x, y, z = euler_zyx(m)
    adaylar = ((x, y, z), (x + 180.0, 180.0 - y, z + 180.0))
    if onceki is None:
        onceki = (0.0, 0.0, 0.0)
    en_iyi, maliyet = None, None
    for a in adaylar:
        b = tuple(en_yakin(a[i], onceki[i]) for i in range(3))
        c = max(abs(b[i] - onceki[i]) for i in range(3))
        if maliyet is None or c < maliyet:
            en_iyi, maliyet = b, c
    return list(en_iyi)


def aci_farki(a, b):
    R = carp3(devrik(a), b)
    iz = R[0][0] + R[1][1] + R[2][2]
    return math.degrees(math.acos(max(-1.0, min(1.0, (iz - 1) / 2))))


def kemik_cevir(anim, bkemik, sure, kok_yok=False):
    ornek = {}

    def poz(t):
        if t not in ornek:
            ornek[t] = yerel_donus(anim, bkemik, t, kok_yok)
        return ornek[t]
    zs = sorted({t for t in anim.anahtar if t <= sure + 1e-9} | {0.0, round(sure, 4)})
    euler, onceki = {}, None
    for t in zs:
        onceki = euler_surekli(poz(t), onceki)
        euler[t] = onceki
    degisti = True
    while degisti:
        degisti = False
        sirali = sorted(euler)
        for i in range(1, len(sirali)):
            t0, t1 = sirali[i - 1], sirali[i]
            if t1 - t0 < 2 * EN_KISA:
                continue
            tm = round((t0 + t1) / 2, 5)
            duz = [(euler[t0][k] + euler[t1][k]) / 2 for k in range(3)]
            if aci_farki(euler_mat(duz), poz(tm)) > ARA_ESIK:
                euler[tm] = euler_surekli(poz(tm), euler[t0])
                degisti = True
        sirali = sorted(euler)
        for i in range(1, len(sirali)):
            a, b = euler[sirali[i - 1]], euler[sirali[i]]
            euler[sirali[i]] = [en_yakin(b[k], a[k]) for k in range(3)]
    return euler


def kok_yukseklik(anim, t):
    """Root'un dinlenmeye gore dikey kaymasi (px)."""
    return (konum(anim.dunya("Root", t))[2] - konum(anim.dunya("Root"))[2]) * 16.0


def cevir(anim, sure, olcek_zaman, kemikler_izinli, dikey_oyuncuya, bas_look):
    """Bedrock animasyonu. olcek_zaman: dosya zamani -> oyun zamani carpani."""
    kemikler = {}
    for b in SIRA:
        if b not in kemikler_izinli or KEMIK[b][0] not in anim.bind:
            continue
        euler = kemik_cevir(anim, b, sure, "root" not in kemikler_izinli)
        dosya = {}
        for t in sorted(euler):
            x, y, z = euler[t]
            dosya["%.4f" % (t * olcek_zaman)] = [round(-x, 2), round(-y, 2), round(z, 2)]
        if b == "body":
            # Tasarim geregi sifir: kalca noktasi yerinde. Yine de YAZILIR --
            # override_previous_animation vanilla'nin body egilmesini
            # (saldiri donusu, egilme) ancak yazilan kemikte siler.
            dosya = {"0.0000": [0.0, 0.0, 0.0]}
        if b == "head" and bas_look:
            dosya = {k: ["%s + query.target_x_rotation" % v[0],
                         "%s + query.target_y_rotation" % v[1], v[2]]
                     for k, v in dosya.items()}
        kemikler[b] = {"rotation": dosya}
    if "root" in kemikler_izinli:
        # Kalca merkezli donus + gorunumde kalan dikey kayma.
        # Donus karelerinin zamanlari + her oyun tick'i (dosya zamaninda).
        zs = {float(k) / olcek_zaman for k in kemikler["root"]["rotation"]}
        zs |= {round(i * TICK / olcek_zaman, 5)
               for i in range(int(sure * olcek_zaman / TICK) + 1)}
        zs = sorted(t for t in zs if t <= sure + 1e-9)
        kon = {}
        c = [0.0, KALCA_PX, 0.0]
        for t in zs:
            R = dunya_farki(anim, "root", t)
            Rc = uygula(R, c)
            dy = kok_yukseklik(anim, t)
            if dikey_oyuncuya:
                dy = min(dy, 0.0)
            p = [c[0] - Rc[0], c[1] - Rc[1] + dy, c[2] - Rc[2]]
            kon["%.4f" % (t * olcek_zaman)] = [round(-p[0], 3), round(p[1], 3), round(p[2], 3)]
        kemikler["root"]["position"] = kon
        if "Root" in anim.olcek:
            ts, olc = anim.olcek["Root"]
            if any(abs(o - 1.0) > 0.01 for o in olc):
                kemikler["root"]["scale"] = {"%.4f" % (t * olcek_zaman): round(o, 3)
                                             for t, o in zip(ts, olc) if t <= sure + 1e-9}
    return kemikler


def hareket(anim, sure, olcek_zaman, dikey_oyuncuya):
    """Oyuncuya verilecek kayma: tick basina (sag, on, yukari) blok,
    animasyonun basina ve oyuncunun baktigi yone gore."""
    p0 = konum(anim.dunya("Root", 0.0))
    z0 = kok_yukseklik(anim, 0.0)
    n = int(round(sure * olcek_zaman / TICK))
    iz = []
    for i in range(n + 1):
        t = min(sure, i * TICK / olcek_zaman)
        p = konum(anim.dunya("Root", t))
        dy = (kok_yukseklik(anim, t) - z0) / 16.0 if dikey_oyuncuya else 0.0
        iz.append([round(p[0] - p0[0], 3), round(p[1] - p0[1], 3), round(max(dy, 0.0), 3)])
    return iz


# ---------------- ana ----------------
def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    wom, ef = Kaynak(argv[0]), Kaynak(argv[1])
    rapor = "--rapor" in argv
    taban = ef.json("assets/epicfight/animmodels/entity/biped.json")
    kaynaklar = {"wom": (wom, "assets/wom/animmodels/animations/"),
                 "ef": (ef, "assets/epicfight/animmodels/animations/")}
    ef_zaman = zamanlar(ef, EF_SINIF)
    sinif_onbellek = {}
    animler, veri = {}, {}
    for set_ad, s in KILIC.items():
        k, onek = kaynaklar[s["kaynak"]]
        # Sinif: tam yol ("/" iceriyorsa) ya da silah sinifi klasorunde.
        # Ayni sinif birden cok sette (asalar): bir kez okunuyor.
        if not s["sinif"]:
            z_tablo = ef_zaman
        else:
            _yol = s["sinif"] if "/" in s["sinif"] else WOM_SINIF_KLASOR + s["sinif"]
            if _yol not in sinif_onbellek:
                sinif_onbellek[_yol] = zamanlar(wom, _yol)
            z_tablo = sinif_onbellek[_yol]

        def yukle(yol):
            ic = onek + yol + ".json"
            if not k.var(ic):
                raise SystemExit("YOK: " + ic)
            return Animasyon(k.json(ic), taban)

        # Durus: iki parca. Duruyorken butun beden; yururken yalniz ust
        # beden (bacaklari vanilla yuruyus suruyor).
        d = yukle(s["durus"])
        tum = set(SIRA)
        animler[ANIM_ONEK + set_ad + ".durus"] = {
            "loop": True, "animation_length": round(d.sure, 4),
            "override_previous_animation": True,
            "bones": cevir(d, d.sure, 1.0, tum, False, True)}
        animler[ANIM_ONEK + set_ad + ".durus_ust"] = {
            "loop": True, "animation_length": round(d.sure, 4),
            "override_previous_animation": True,
            "bones": cevir(d, d.sure, 1.0, UST, False, True)}
        saldirilar = []
        for tur, yollar in (("oto", s["oto"]), ("kosu", [s["kosu"]]), ("hava", [s["hava"]])):
            for yol in yollar:
                a = yukle(yol)
                z = z_tablo.get(yol)
                if not z:
                    raise SystemExit("ZAMAN YOK: " + yol)
                gecis, fazlar, ozellik, temel = fazlari_coz(z)
                hiz = max(0.5, min(2.0, s["hiz"] / temel))
                olcek_zaman = 1.0 / hiz
                dikey = "MOVE_VERTICAL" in ozellik
                ad = yol.split("/")[-1]
                tam = ANIM_ONEK + set_ad + "." + ad
                animler[tam] = {
                    "loop": False, "animation_length": round(a.sure * olcek_zaman, 4),
                    "override_previous_animation": True,
                    "bones": cevir(a, a.sure, olcek_zaman, set(SIRA), dikey, False)}
                son_faz = max((f["recovery"] for f in fazlar), default=a.sure)
                saldirilar.append({
                    "ad": ad, "anim": tam, "tur": tur,
                    "sure": round(a.sure * olcek_zaman, 3),
                    "gecis": round(gecis * olcek_zaman, 3),
                    "birakma": round(min(son_faz, a.sure) * olcek_zaman, 3),
                    "fazlar": [{"antic": round(f["antic"] * olcek_zaman, 3),
                                "contact": round(f["contact"] * olcek_zaman, 3),
                                "hasar": f["hasar"]} for f in fazlar],
                    "dikey": dikey,
                    "iz": hareket(a, a.sure, olcek_zaman, dikey)})
                if rapor:
                    iz = saldirilar[-1]["iz"][-1]
                    print("%-10s %-4s %-24s %5.2fs birak %.2fs faz %d hasar %s ileri %.1f dikey %s"
                          % (set_ad, tur, ad, a.sure * olcek_zaman, saldirilar[-1]["birakma"],
                             len(fazlar), [f["hasar"] for f in fazlar], iz[1] * 16, dikey))
        veri[set_ad] = {"esyalar": s["esyalar"],
                        "durus": ANIM_ONEK + set_ad + ".durus",
                        "durus_ust": ANIM_ONEK + set_ad + ".durus_ust",
                        "saldirilar": saldirilar}
    os.makedirs(os.path.dirname(CIKTI_ANIM), exist_ok=True)
    with open(CIKTI_ANIM, "w", encoding="utf-8") as f:
        json.dump({"format_version": "1.8.0", "animations": animler}, f,
                  ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    with open(CIKTI_HAREKET, "w", encoding="utf-8") as f:
        json.dump({"kaynak": {"wom": "2.0.178", "epicfight": "21.17.3.1"}, "setler": veri},
                  f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print("yazildi: %d animasyon, %d set" % (len(animler), len(veri)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
