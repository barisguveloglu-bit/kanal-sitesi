# -*- coding: utf-8 -*-
"""Epic Fight animasyonu -> Bedrock oyuncu animasyonu.       v7.98.0

Kullanim:
    python3 addon/arac/ef_anim_cevir.py <biped.json> <cikti.json> \\
        <onek> <ad=animasyon.json> [<ad=animasyon.json> ...]

---- NEDEN YENIDEN YAZILDI ----
v5.0-v5.5'teki cevirici (kaynak_anim/ef_cevir.py, v5.8'de silindi)
farki eklemin KENDI dinlenme cercevesinde aliyordu:

    D = bind_yerel^-1 . L        ->  euler(D) dogrudan Bedrock'a

Bedrock'ta vanilla oyuncu kemiklerinin dinlenme donusu SIFIR, yani
eksenleri DUNYAYA hizali. Epic Fight'inkiler degil -- olculdu
(biped.json, v7.98.0):

    Root/Torso/Chest/Head   yerel Y dunyada YUKARI  -> Bedrock'la ortusuyor
    Arm_R/Thigh_R/Leg_R     yerel Y dunyada ASAGI   -> X etrafinda 180 derece TERS

Govde zincirinde cerceveler ortustugu icin eski yontem oradan
dogru calisiyordu. Kol ve bacakta dönusun Y ve Z bilesenlerinin
ISARETI tersine donuyordu: one-arkaya sallanma (X) dogru, yana
acilma ve burulma TERS yone. "Sayilar temiz ama oyunda bozuk"
tablosu buydu -- sicrama olcusu eksenin dogru olup olmadigini
sormuyordu, onizleme de ayni kabulle ciziyordu.

---- YENI YONTEM: DUNYADA FARK ----
    G_j(t)  = rot(A_j(t)) . rot(W_j)^T     # dunyadaki poz degisimi
    G'_j    = C . G_j . C^T                # Blockbench ic uzayina
    R_k     = G'_ata(k)^T . G'_k           # Bedrock yerel donusu

A_j: animasyonun dunya matrisi (yerel matrislerin zincir carpimi),
W_j: dinlenme pozunun dunya matrisi. Cerceve nereye bakarsa baksin
dunyadaki degisim aynidir -- sorunun kendisi ortadan kalkiyor.

---- KURALLAR NEREDEN (tahmin degil) ----
C (Epic Fight -> Blockbench ic uzayi) = (x, z, -y):
  Epic Fight Z-yukari; yuz dokusunun tam bir dortgeni +Y'ye
  bakiyor, sag omuz +X'te (biped.json'dan olculdu). Blockbench
  ic uzayinda karakter -Z'ye bakiyor, sag kol +X'te.
  Proper donus (det = +1), aynalama yok.

Bedrock dosyasi = Blockbench ic donusunun (-x, -y, +z)'si,
euler sirasi ZYX (M = Rz.Ry.Rx):
  Blockbench kaynagi, keyframe.js compileBedrockKeyframe() ve
  format.ts euler_order varsayilani. Vanilla'yla capraz
  dogrulandi: zombi kollari x=-90 -> ONE, yuzme x=-180 ->
  YUKARI, nefes sallanmasi sag kol z>0 -> DISA.

---- KOL VE BACAK: KEMIK UCA BAKIYOR ----
Bedrock'ta kol tek kemik, Epic Fight'ta zincir. Eskiden yalniz
ust kolun yonu aliniyordu; dirsek bukulunce el -- yani SILAH --
yanlis yerde kaliyordu. Artik kemik omuzdan Tool_R'ye (silahin
tutuldugu nokta) bakiyor; burulma ust koldan, en kucuk duzeltmeyle.
Bacak ayni sekilde kalcadan ayaga.

---- ARA DEGER ----
Epic Fight kareler arasini kuaterniyonla, Bedrock her ekseni ayri
ve duz geciyor. Cikti kareleri UYARLAMALI: bir araligin ortasinda
Bedrock'un duz ara degeri gercek pozdan ARA_ESIK dereceden fazla
sapiyorsa aralik ikiye bolunuyor.
"""
import json
import math
import sys

C = [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]]
CT = [[C[j][i] for j in range(3)] for i in range(3)]

# Bedrock kemigi -> (Epic Fight eklemi, uc noktasi)
#   uc noktasi None: kemigin kendi donusu
#   ("eklem", ad): o eklemin konumu
#   ("ayak", ad):  o eklemin ucundaki ayak (asagida hesaplaniyor)
KEMIK = {
    "root":     ("Root", None),
    "waist":    ("Torso", None),
    "body":     ("Chest", None),
    "head":     ("Head", None),
    "rightArm": ("Arm_R", ("eklem", "Tool_R")),
    "leftArm":  ("Arm_L", ("eklem", "Tool_L")),
    "rightLeg": ("Thigh_R", ("ayak", "Leg_R")),
    "leftLeg":  ("Thigh_L", ("ayak", "Leg_L")),
}
# Vanilla geometry.humanoid.custom hiyerarsisi (bedrock-samples
# mobs.json'dan okundu): bacaklar root'un cocugu, kollar body'nin.
ATA = {"root": None, "waist": "root", "body": "waist", "head": "body",
       "rightArm": "body", "leftArm": "body",
       "rightLeg": "root", "leftLeg": "root"}
SIRA = ["root", "waist", "body", "head", "rightArm", "leftArm",
        "rightLeg", "leftLeg"]

ARA_ESIK = 3.0          # derece -- ara deger hatasi tavani
EN_KISA = 1.0 / 240     # saniye -- bolmenin alt siniri
SIFIR_ESIK = 0.05       # derece -- bundan kucuk kemik yazilmaz


# ---------------- dogrusal cebir ----------------
def m4(v):
    return [v[0:4], v[4:8], v[8:12], v[12:16]]


def carp4(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)]
            for i in range(4)]


def carp3(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)]
            for i in range(3)]


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


def normal(v):
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v] if n > 1e-12 else [0.0, 0.0, 0.0]


def dik_yap(m):
    """Donus kismini Gram-Schmidt ile ortonormal yap.

    Dosyadaki matrisler 6 hanelik; carpim zincirinde birikir.
    Euler ayristirmasi ortonormal bekliyor.                   """
    x = normal([m[0][0], m[1][0], m[2][0]])
    y = [m[0][1], m[1][1], m[2][1]]
    d = sum(x[i] * y[i] for i in range(3))
    y = normal([y[i] - d * x[i] for i in range(3)])
    z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2],
         x[0] * y[1] - x[1] * y[0]]
    return [[x[i], y[i], z[i]] for i in range(3)]


def en_kucuk_donus(a, b):
    """a yonunu b'ye goturen en kucuk donus (Rodrigues)."""
    a, b = normal(a), normal(b)
    v = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
         a[0] * b[1] - a[1] * b[0]]
    c = sum(a[i] * b[i] for i in range(3))
    s = math.sqrt(sum(x * x for x in v))
    if s < 1e-9:
        if c > 0:
            return [[1.0, 0, 0], [0, 1.0, 0], [0, 0, 1.0]]
        # 180 derece: a'ya dik herhangi bir eksen
        dik = [1.0, 0, 0] if abs(a[0]) < 0.9 else [0, 1.0, 0]
        e = normal([a[1] * dik[2] - a[2] * dik[1],
                    a[2] * dik[0] - a[0] * dik[2],
                    a[0] * dik[1] - a[1] * dik[0]])
        return [[2 * e[i] * e[j] - (1.0 if i == j else 0.0)
                 for j in range(3)] for i in range(3)]
    k = [x / s for x in v]
    K = [[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]]
    K2 = carp3(K, K)
    return [[(1.0 if i == j else 0.0) + s * K[i][j] + (1 - c) * K2[i][j]
             for j in range(3)] for i in range(3)]


# ---------------- kuaterniyon (Epic Fight'in ara degeri) ----------------
def kuat(m):
    t = m[0][0] + m[1][1] + m[2][2]
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        q = [0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s,
             (m[1][0] - m[0][1]) / s]
    elif m[0][0] > m[1][1] and m[0][0] > m[2][2]:
        s = math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2
        q = [(m[2][1] - m[1][2]) / s, 0.25 * s, (m[0][1] + m[1][0]) / s,
             (m[0][2] + m[2][0]) / s]
    elif m[1][1] > m[2][2]:
        s = math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2
        q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, 0.25 * s,
             (m[1][2] + m[2][1]) / s]
    else:
        s = math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2
        q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s,
             (m[1][2] + m[2][1]) / s, 0.25 * s]
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


# ---------------- Epic Fight verisi ----------------
def armatur(d):
    """armature -> (yerel dinlenme matrisleri, ata haritasi)."""
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
    """Epic Fight'in kare aramasi, BIREBIR.

    TransformSheet.getInterpolationInfo(float) bytecode'undan
    (Epic Fight 21.17.3.1). Ikili arama: dizinin SIRALI oldugunu
    varsayiyor ama JsonAssetLoader siralamiyor -- kaynakta 33
    eklemin zaman dizisi sirasiz (orn. agony_auto_4 Tool_R:
    ..., 2.3, 2.3833, 2.2167). Sirali kabul edip kendimiz
    aramak, Epic Fight'in GOSTERDIGINDEN baska bir poz verirdi.
    """
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
        u = 1.0 if pay == 0 else (1.0 if pay > 0 else 0.0)
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
    """Bir Epic Fight animasyonu: her eklemin t anindaki yerel matrisi."""

    def __init__(self, veri, taban):
        # Dosya kendi armature'unu tasiyorsa o gecerli --
        # Epic Fight'in JsonAssetLoader'i da boyle yapiyor.
        self.bind, self.ata = armatur(veri if "armature" in veri else taban)
        self.eklem = {}
        self.olcek = {}
        for e in veri["animation"]:
            if e["name"] not in self.bind or not e["time"]:
                continue
            mats = [m4(k) for k in e["transform"]]
            # ---- SIFIR OLCEKLI KARE = KAYBOLMA ----
            # Kaynakta 384 kare donus degil (det ~ 0): isinlanma
            # hareketlerinde (shadow_step, enderstep, blink...)
            # Root o an SIFIR matris, karakter gorunmez. Donusu
            # tanimsiz; kuaterniyona cevirmek anlamsiz bir yon
            # uretiyordu (moonless_auto_3'te butun beden 180
            # derece). O karenin donus+konumu en yakin GECERLI
            # kareden aliniyor, olcek ayrica tutuluyor.
            olc = [abs(det3(rot(m))) ** (1.0 / 3.0) for m in mats]
            gecerli = [i for i, o in enumerate(olc) if o > 0.1]
            if not gecerli:
                continue
            for i in range(len(mats)):
                if olc[i] <= 0.1:
                    j = min(gecerli, key=lambda g: (abs(g - i), -g))
                    mats[i] = mats[j]
            self.olcek[e["name"]] = (e["time"], olc)
            self.eklem[e["name"]] = (e["time"],
                                     [kuat(dik_yap(rot(m))) for m in mats],
                                     [konum(m) for m in mats])
        zamanlar = [t for (ts, _, _) in self.eklem.values() for t in ts]
        self.sure = max(zamanlar) if zamanlar else 0.0
        self.anahtar = sorted({round(t, 4) for t in zamanlar})

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


def ayak_ofseti(anim, bacak):
    """Bacak ekleminin yerelinde, dinlenme pozunda yere dusen nokta."""
    W = anim.dunya(bacak)
    p = konum(W)
    ayak = [p[0], p[1], 0.0]              # Epic Fight'ta zemin z = 0
    return uygula(devrik(rot(W)), fark(ayak, p))


def uc_konum(anim, uc, t):
    tur, ad = uc
    if tur == "eklem":
        return konum(anim.dunya(ad, t))
    return uygula4(anim.dunya(ad, t), ayak_ofseti(anim, ad))


def dunya_farki(anim, bkemik, t):
    """Bedrock kemiginin dunyadaki poz degisimi, Blockbench ic uzayinda."""
    ek, uc = KEMIK[bkemik]
    G = carp3(rot(anim.dunya(ek, t)), devrik(rot(anim.dunya(ek))))
    if uc is not None:
        # Kemik uca baksin: dinlenme yonunu (G ile tasinmis) gercek
        # yone goturen en kucuk donusle duzelt. Burulma G'den kalir.
        k0 = konum(anim.dunya(ek))
        c0 = fark(uc_konum(anim, uc, None), k0)
        c = fark(uc_konum(anim, uc, t), konum(anim.dunya(ek, t)))
        G = carp3(en_kucuk_donus(uygula(G, c0), c), G)
    return carp3(carp3(C, dik_yap(G)), CT)


# ---------------- euler ----------------
def euler_zyx(m):
    """M = Rz.Ry.Rx -> (x, y, z) derece."""
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
    cx, sx, cy, sy, cz, sz = (math.cos(x), math.sin(x), math.cos(y),
                              math.sin(y), math.cos(z), math.sin(z))
    Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]]
    Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]
    Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]]
    return carp3(carp3(Rz, Ry), Rx)


def en_yakin(a, onceki):
    return a + 360.0 * round((onceki - a) / 360.0)


def euler_surekli(m, onceki):
    """Iki esdeger cozumden oncekine YAKIN olani, 360'la kaydirarak."""
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


# ---------------- cevirme ----------------
def yerel_donus(anim, bkemik, t, sifir):
    G = dunya_farki(anim, bkemik, t)
    a = ATA[bkemik]
    if a is None:
        # root: animasyonun ilk karesine gore sifirla. Kombo devami
        # (auto_2, auto_1'in bittigi acidan basliyor) ve dosyadan
        # dosyaya degisen eksen duzeni boylece gidiyor -- v5.5'in
        # olcumu, NOTLAR.md gecmisi. Oyuncunun yonunu oyun belirliyor.
        return carp3(devrik(sifir), G)
    return carp3(devrik(dunya_farki(anim, a, t)), G)


def kemik_cevir(anim, bkemik, sifir):
    ornek = {}

    def poz(t):
        if t not in ornek:
            ornek[t] = yerel_donus(anim, bkemik, t, sifir)
        return ornek[t]

    zamanlar = sorted(set(anim.anahtar) | {0.0, round(anim.sure, 4)})
    euler = {}
    onceki = None
    for t in zamanlar:
        onceki = euler_surekli(poz(t), onceki)
        euler[t] = onceki

    # Uyarlamali bolme: Bedrock'un duz ara degeri ortada ne kadar
    # sapiyor? ARA_ESIK'i asiyorsa araya gercek kare ekle.
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
        # Yeni kare sonraki komsusuyla da surekli olsun
        sirali = sorted(euler)
        for i in range(1, len(sirali)):
            a, b = euler[sirali[i - 1]], euler[sirali[i]]
            euler[sirali[i]] = [en_yakin(b[k], a[k]) for k in range(3)]
    return euler


def cevir(veri, taban):
    anim = Animasyon(veri, taban)
    if anim.sure <= 0:
        return None
    sifir = dunya_farki(anim, "root", 0.0)
    kemikler = {}
    for b in SIRA:
        if KEMIK[b][0] not in anim.bind:
            continue
        euler = kemik_cevir(anim, b, sifir)
        # Bedrock dosyasi = ic donusun (-x, -y, +z)'si (Blockbench)
        dosya = {}
        for t in sorted(euler):
            x, y, z = euler[t]
            dosya["%.4f" % t] = [round(-x, 2), round(-y, 2), round(z, 2)]
        if all(max(abs(v) for v in d) < SIFIR_ESIK for d in dosya.values()):
            continue
        kemikler[b] = {"rotation": dosya}
    # Root olcegi: kaybolma anlari. Epic Fight olcegi kareler
    # arasinda duz geciyor, Bedrock da -- birebir yaziliyor.
    if "Root" in anim.olcek:
        ts, olc = anim.olcek["Root"]
        if any(abs(o - 1.0) > 0.01 for o in olc):
            kemikler.setdefault("root", {"rotation": {"0.0000": [0, 0, 0]}})
            kemikler["root"]["scale"] = {
                "%.4f" % t: round(o, 3) for t, o in zip(ts, olc)}
    return {
        "loop": False,
        "animation_length": round(anim.sure, 4),
        # Vanilla move.arms / attack.rotations USTUNE eklenmesin:
        # yazdigi kemikleri degistirir, yazmadiklarina dokunmaz.
        "override_previous_animation": True,
        "bones": kemikler,
    }


def main(argv):
    if len(argv) < 4:
        print(__doc__)
        return 2
    taban = json.load(open(argv[0], encoding="utf-8"))
    cikti, onek = argv[1], argv[2]
    animler = {}
    for kalem in argv[3:]:
        ad, yol = kalem.split("=", 1)
        a = cevir(json.load(open(yol, encoding="utf-8")), taban)
        if a is None:
            print("ATLANDI (bos): " + ad)
            continue
        animler[onek + ad] = a
    with open(cikti, "w", encoding="utf-8") as f:
        json.dump({"format_version": "1.8.0", "animations": animler}, f,
                  ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print("yazildi: %d animasyon -> %s" % (len(animler), cikti))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
