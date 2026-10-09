# -*- coding: utf-8 -*-
"""wom_cevir.py ciktisini Epic Fight'in KENDISINE karsi olcer.   v7.99

Kullanim:
    python3 addon/arac/wom_dogrula.py <wom_kok> <epicfight_kok> [--esik 12]

---- NEDEN AYRI ----
v5.5'te onizleme cevirinin kabulunu paylastigi icin yanlisi dogruluyordu.
Bu dosya wom_cevir.py'den DONUSUM ALMIYOR (yalniz set tablosunu ve
kaynak okuyucuyu -- veri, kabul degil):

  GERCEK   Epic Fight yerel matrisleri zincirle carpiliyor, uzuvlarin
           DUNYADAKI yonu olculuyor: omuz->silah, kalca->ayak, kafa ve
           gogsun baktigi yon, bicagin yonu (Tool yerel -Z).
  TAHMIN   Yazilan Bedrock dosyasi okunuyor: kareler arasi eksen eksen
           duz, Blockbench kurali (ic = -x,-y,+z; M = Rz.Ry.Rx), vanilla
           hiyerarsisi.

Iki ek olcu (v7.98.2'nin dersi -- yon dogrulugu yetmiyor):
  KALCA    govdenin alt ortasi ile bacaklarin ust ortasi arasindaki
           mesafe (px), Bedrock ileri kinematigiyle.
  MERKEZ   kalca noktasinin yatay kaymasi (px): Epic Fight modelde
           kok kaymasini siliyor, bizde de yerinde durmali.

Cikti: kaynak_anim/wom/wom_kilic.iz.json -- Epic Fight'in gercek
yonleri, seyrek. JAR depoda yok; test/wom_kilic.mjs bu ize karsi
kendi Bedrock kinematigiyle olcuyor.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wom_cevir import (KILIC, Kaynak, ANIM_ONEK, CIKTI_ANIM, CIKTI_HAREKET, SOL_EL_DUZELT,  # noqa: E402
                       SILAH_GEO, CARPISMA_EN)

CIKTI_IZ = os.path.join(os.path.dirname(CIKTI_ANIM), "wom_kilic.iz.json")

C = [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]]
ATA = {"root": None, "waist": "root", "body": "waist", "head": "body",
       "rightArm": "body", "leftArm": "body", "rightItem": "rightArm", "leftItem": "leftArm",
       "rightLeg": "root", "leftLeg": "root"}
# Vanilla geometry.humanoid.custom pivotlari, Blockbench IC uzayinda
# (dosyanin x'i ters): sag kol dosyada -5, icte +5.
PIVOT = {"root": [0, 0, 0], "waist": [0, 12, 0], "body": [0, 24, 0], "head": [0, 24, 0],
         "rightArm": [5, 22, 0], "leftArm": [-5, 22, 0], "rightItem": [6, 15, 1],
         "leftItem": [-6, 15, 1], "rightLeg": [1.9, 12, 0], "leftLeg": [-1.9, 12, 0]}
OLCUM = {
    # v7.99.10: kol YUMRUGA bakar (Tool_R'nin kaymasiz hali). Epic Fight
    # silahi elde sap boyunca 20 px'e kadar kaydiriyor; omuz->Tool_R o
    # karelerde yumrugun yonu degil (108 dereceye kadar sapiyordu).
    "sag kol": ("rightArm", ("kol", "Arm_R", "Tool_R")),
    "sol kol": ("leftArm", ("uzuv", "Arm_L", "Tool_L")),
    "sag bacak": ("rightLeg", ("bacak", "Thigh_R", "Leg_R")),
    "sol bacak": ("leftLeg", ("bacak", "Thigh_L", "Leg_L")),
    "kafa": ("head", ("yon", "Head")),
    # v7.99.10: tek kutu govde omurga KIRISINE (Torso -> Head) bakiyor
    # (wom_cevir.py KEMIK["waist"]); Chest'in kendi yonu iki parcali
    # omurgada fazla egik.
    "gogus": ("body", ("uzuv", "Torso", "Head")),
    "bicak": ("rightItem", ("bicak", "Tool_R")),
}


def mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))]
            for i in range(len(a))]


def mv(a, v):
    return [sum(a[i][k] * v[k] for k in range(3)) for i in range(3)]


def tr(a):
    return [[a[j][i] for j in range(3)] for i in range(3)]


def nrm(v):
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v] if n > 1e-12 else [0.0, 0.0, 0.0]


def aci(a, b):
    a, b = nrm(a), nrm(b)
    return math.degrees(math.acos(max(-1.0, min(1.0, sum(a[i] * b[i] for i in range(3))))))


def det(r):
    return (r[0][0] * (r[1][1] * r[2][2] - r[1][2] * r[2][1])
            - r[0][1] * (r[1][0] * r[2][2] - r[1][2] * r[2][0])
            + r[0][2] * (r[1][0] * r[2][1] - r[1][1] * r[2][0]))


def dik(r):
    x = nrm([r[0][0], r[1][0], r[2][0]])
    y = [r[0][1], r[1][1], r[2][1]]
    d = sum(x[i] * y[i] for i in range(3))
    y = nrm([y[i] - d * x[i] for i in range(3)])
    z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]
    return [[x[i], y[i], z[i]] for i in range(3)]


def q_of(m):
    t = m[0][0] + m[1][1] + m[2][2]
    if t > 0:
        s = 2 * math.sqrt(t + 1)
        q = [s / 4, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s]
    else:
        i = max(range(3), key=lambda k: m[k][k])
        j, k = (i + 1) % 3, (i + 2) % 3
        s = 2 * math.sqrt(1 + m[i][i] - m[j][j] - m[k][k])
        q = [0.0] * 4
        q[0] = (m[k][j] - m[j][k]) / s
        q[1 + i] = s / 4
        q[1 + j] = (m[j][i] + m[i][j]) / s
        q[1 + k] = (m[k][i] + m[i][k]) / s
    n = math.sqrt(sum(x * x for x in q))
    return [x / n for x in q]


def m_of(q):
    w, x, y, z = q
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
            [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
            [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]]


def ara(qa, qb, u):
    d = sum(qa[i] * qb[i] for i in range(4))
    if d < 0:
        qb, d = [-x for x in qb], -d
    if d > 0.9995:
        q = [qa[i] + (qb[i] - qa[i]) * u for i in range(4)]
    else:
        th = math.acos(d)
        q = [(math.sin((1 - u) * th) * qa[i] + math.sin(u * th) * qb[i]) / math.sin(th)
             for i in range(4)]
    n = math.sqrt(sum(x * x for x in q))
    return [x / n for x in q]


class EF:
    def __init__(self, veri, taban):
        kaynak = veri if "armature" in veri else taban
        self.bind, self.ata = {}, {}

        def gez(n, p):
            v = n["transform"]
            self.bind[n["name"]] = [v[0:4], v[4:8], v[8:12], v[12:16]]
            self.ata[n["name"]] = p
            for c in n.get("children") or []:
                gez(c, n["name"])
        h = kaynak["armature"]["hierarchy"]
        for n in (h if isinstance(h, list) else [h]):
            gez(n, None)
        if any(e["name"] == "Coord" and e["time"] for e in veri["animation"]):
            self.bind["Coord"] = [[1.0 if a == b else 0.0 for b in range(4)] for a in range(4)]
            self.ata["Coord"] = None
            self.ata["Root"] = "Coord"
        self.k, self.s = {}, {}
        for e in veri["animation"]:
            if e["name"] in self.bind and e["time"]:
                ms = [[v[0:4], v[4:8], v[8:12], v[12:16]] for v in e["transform"]]
                ol = [abs(det([r[:3] for r in m[:3]])) ** (1 / 3) for m in ms]
                self.s[e["name"]] = (e["time"], ol)
                qs = [q_of(dik([r[:3] for r in m[:3]])) if o > 0.1 else None
                      for m, o in zip(ms, ol)]
                self.k[e["name"]] = (e["time"], qs, [[m[0][3], m[1][3], m[2][3]] for m in ms])
        self.sure = max((ts[-1] for ts, _, _ in self.k.values()), default=0.0)

    def tanimsiz(self, t):
        for ts, qs, _ in self.k.values():
            for i in range(len(ts)):
                if qs[i] is None:
                    a = ts[i - 1] if i > 0 else ts[i]
                    b = ts[i + 1] if i + 1 < len(ts) else ts[i]
                    if a - 1e-6 <= t <= b + 1e-6:
                        return True
        return False

    def yerel(self, j, t):
        if t is None or j not in self.k:
            return self.bind[j]
        ts, qs, ps = self.k[j]
        a, b = 0, len(ts) - 1
        while b - a > 1:
            m = a + (b - a) // 2
            if ts[m] <= t < ts[m + 1]:
                a, b = m, m + 1
                break
            if ts[m] > t:
                b = m
            elif ts[m + 1] <= t:
                a = m
        bol = ts[b] - ts[a]
        u = 1.0 if bol == 0 else max(0.0, min(1.0, (t - ts[a]) / bol))
        q = ara(qs[a], qs[b], u)
        p = [ps[a][n] + (ps[b][n] - ps[a][n]) * u for n in range(3)]
        R = m_of(q)
        return [R[0] + [p[0]], R[1] + [p[1]], R[2] + [p[2]], [0, 0, 0, 1]]

    def dunya(self, j, t):
        yol = []
        while j is not None:
            yol.append(j)
            j = self.ata[j]
        m = [[1.0 if a == b else 0.0 for b in range(4)] for a in range(4)]
        for x in reversed(yol):
            m = mm(m, self.yerel(x, t))
        return m


def konum(m):
    return [m[0][3], m[1][3], m[2][3]]


def rot(m):
    return [r[:3] for r in m[:3]]


def gercek_yon(ef, olcum, t):
    tur = olcum[0]
    if tur == "kol":
        el = mm(ef.dunya(ef.ata[olcum[2]], t), ef.bind[olcum[2]])
        return [a - b for a, b in zip(konum(el), konum(ef.dunya(olcum[1], t)))]
    if tur == "uzuv":
        return [a - b for a, b in zip(konum(ef.dunya(olcum[2], t)), konum(ef.dunya(olcum[1], t)))]
    if tur == "bacak":
        Wd = ef.dunya(olcum[2], None)
        p = konum(Wd)
        ofs = mv(tr(rot(Wd)), [0, 0, -p[2]])
        Ad = ef.dunya(olcum[2], t)
        ayak = [a + b for a, b in zip(konum(Ad), mv(rot(Ad), ofs))]
        return [a - b for a, b in zip(ayak, konum(ef.dunya(olcum[1], t)))]
    if tur == "bicak":
        return mv(rot(ef.dunya(olcum[1], t)), [0.0, 0.0, -1.0])
    W = rot(ef.dunya(olcum[1], None))
    yerel_on = mv(tr(W), [0.0, 1.0, 0.0])
    return mv(rot(ef.dunya(olcum[1], t)), yerel_on)


# ---------------- Bedrock ----------------
def bb_mat(f):
    x, y, z = [math.radians(v) for v in (-f[0], -f[1], f[2])]
    Rx = [[1, 0, 0], [0, math.cos(x), -math.sin(x)], [0, math.sin(x), math.cos(x)]]
    Ry = [[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]]
    Rz = [[math.cos(z), -math.sin(z), 0], [math.sin(z), math.cos(z), 0], [0, 0, 1]]
    return mm(mm(Rz, Ry), Rx)


def sayi(v):
    if isinstance(v, str):      # molang: sabit kismi (query.* disarida)
        return float(v.split(" + ")[0])
    return float(v)


def deger(kanal, t, boyut=3):
    if not isinstance(kanal, dict):
        kanal = {"0": kanal}
    ks = sorted((float(k), [sayi(x) for x in (v if isinstance(v, list) else [v] * boyut)])
                for k, v in kanal.items())
    if t <= ks[0][0]:
        return ks[0][1]
    if t >= ks[-1][0]:
        return ks[-1][1]
    for i in range(1, len(ks)):
        if ks[i][0] >= t:
            (t0, a), (t1, b) = ks[i - 1], ks[i]
            u = (t - t0) / (t1 - t0) if t1 > t0 else 0.0
            return [a[n] + (b[n] - a[n]) * u for n in range(len(a))]


def br_donus(anim, kemik, t):
    b = anim["bones"].get(kemik, {})
    return bb_mat(deger(b["rotation"], t)) if "rotation" in b else [[1, 0, 0], [0, 1, 0], [0, 0, 1]]


def br_dunya_rot(anim, kemik, t):
    m = [[1.0, 0, 0], [0, 1.0, 0], [0, 0, 1.0]]
    yol = []
    while kemik is not None:
        yol.append(kemik)
        kemik = ATA[kemik]
    for k in reversed(yol):
        m = mm(m, br_donus(anim, k, t))
    return m


def br_nokta(anim, kemik, p, t):
    """Kemigin uzayindaki nokta -> dunya (ic uzay, px)."""
    while kemik is not None:
        b = anim["bones"].get(kemik, {})
        R = br_donus(anim, kemik, t)
        pv = PIVOT[kemik]
        p = [a + c for a, c in zip(mv(R, [p[i] - pv[i] for i in range(3)]), pv)]
        if "position" in b:
            f = deger(b["position"], t)
            p = [p[0] - f[0], p[1] + f[1], p[2] + f[2]]    # dosya x'i ters
        kemik = ATA[kemik]
    return p


def olc(ef, anim, olcek, sol_atla=False):
    ornek = sorted({round(i / 60.0, 4) for i in range(int(ef.sure * 60) + 1)})
    sonuc = {}
    for ad, (kemik, olcum) in OLCUM.items():
        if olcum[1] not in ef.bind or kemik not in anim["bones"]:
            continue
        if sol_atla and ad == "sol kol":
            # SOL_EL_DUZELT setinde sol kol bilerek Epic Fight'tan ayrilip
            # Bedrock'taki SAPA yoneliyor; olcusu "sol el sapta" (test).
            continue
        dinlenme = mv(C, gercek_yon(ef, olcum, None))
        h = []
        for t in ornek:
            if ef.tanimsiz(t):
                continue
            gercek = mv(C, gercek_yon(ef, olcum, t))
            tahmin = mv(br_dunya_rot(anim, kemik, t * olcek), dinlenme)
            h.append((aci(gercek, tahmin), t))
        sonuc[ad] = h
    kalca, merkez = [], []
    for t in ornek:
        tb = t * olcek
        alt = br_nokta(anim, "body", [0, 12, 0], tb)
        sag = br_nokta(anim, "rightLeg", [1.9, 12, 0], tb)
        sol = br_nokta(anim, "leftLeg", [-1.9, 12, 0], tb)
        orta = [(sag[i] + sol[i]) / 2 for i in range(3)]
        kalca.append((math.dist(alt, orta), t))
        pel = br_nokta(anim, "waist", [0, 12.2, 0], tb)
        merkez.append((math.hypot(pel[0], pel[2]), t))
    sonuc["kalca px"] = kalca
    sonuc["merkez px"] = merkez
    return sonuc


def iki_el_anlari(ef, olcek, adim=0.05, esik=3.0 / 16):
    """Epic Fight'in sol eli sapa koydugu anlar: Tool_L, Tool_R'nin yerel
    Z ekseninden (sap) `esik` blok yakin. test/tutus.mjs bu anlarda sol
    yumrugun Bedrock'taki sapa degdigini olcuyor."""
    out = []
    if "Tool_L" not in ef.bind or "Tool_R" not in ef.bind:
        return out
    for i in range(int(ef.sure / adim + 1e-9) + 1):
        t = round(i * adim, 4)
        if ef.tanimsiz(t):
            continue
        W = ef.dunya("Tool_R", t)
        o = konum(W)
        e = [W[0][2], W[1][2], W[2][2]]
        v = [a - b for a, b in zip(konum(ef.dunya("Tool_L", t)), o)]
        u = sum(v[k] * e[k] for k in range(3))
        if math.sqrt(max(0.0, sum(x * x for x in v) - u * u)) < esik:
            out.append(round(t * olcek, 4))
    return out


def iz(ef, olcek, adim=0.05, sol_atla=False, silah_pay=0.0):
    out = {}
    if sol_atla:
        out["iki el"] = iki_el_anlari(ef, olcek, adim)
    for ad, (kemik, olcum) in OLCUM.items():
        if olcum[1] not in ef.bind:
            continue
        if sol_atla and ad == "sol kol":
            continue
        seri = []
        for i in range(int(ef.sure / adim + 1e-9) + 1):
            t = round(i * adim, 4)
            if ef.tanimsiz(t):
                continue
            g = nrm(mv(C, gercek_yon(ef, olcum, t)))
            seri.append([round(t * olcek, 4)] + [round(v, 4) for v in g])
        out[ad] = {"kemik": kemik,
                   "dinlenme": [round(v, 5) for v in nrm(mv(C, gercek_yon(ef, olcum, None)))],
                   "yon": seri}
        if silah_pay and ad in ("sag kol", "bicak"):
            out[ad]["pay"] = silah_pay      # carpisma duzeltmesinin izinli sapmasi (derece)
    return out


def main(argv):
    esik = 12.0
    if "--esik" in argv:
        esik = float(argv[argv.index("--esik") + 1])
    wom, efk = Kaynak(argv[0]), Kaynak(argv[1])
    taban = efk.json("assets/epicfight/animmodels/entity/biped.json")
    kaynaklar = {"wom": (wom, "assets/wom/animmodels/animations/"),
                 "ef": (efk, "assets/epicfight/animmodels/animations/")}
    bedrock = json.load(open(CIKTI_ANIM, encoding="utf-8"))["animations"]
    hareket = json.load(open(CIKTI_HAREKET, encoding="utf-8"))["setler"]
    tum, asan, en_kotu, izler = [], 0, (0.0, "", ""), {}
    kalca_en, merkez_en = (0.0, ""), (0.0, "")
    for set_ad, s in KILIC.items():
        k, onek = kaynaklar[s["kaynak"]]
        isler = [(s["durus"], ANIM_ONEK + set_ad + ".durus", 1.0)] if s["durus"] else []
        for sal in hareket[set_ad]["saldirilar"]:
            yol = next(y for y in s["oto"] + [s["kosu"], s["hava"]] if y.endswith("/" + sal["ad"]))
            isler.append((yol, sal["anim"], None))
        for yol, anim_ad, olcek in isler:
            ef = EF(json.loads(k.oku(onek + yol + ".json").decode("utf-8")), taban)
            anim = bedrock.get(anim_ad)
            if anim is None:
                print("YOK: " + anim_ad)
                asan += 1
                continue
            if olcek is None:
                olcek = anim["animation_length"] / ef.sure if ef.sure else 1.0
            izler[anim_ad] = iz(ef, olcek, sol_atla=set_ad in SOL_EL_DUZELT,
                                silah_pay=CARPISMA_EN if set_ad in SILAH_GEO else 0.0)
            for olcum, hatalar in olc(ef, anim, olcek, set_ad in SOL_EL_DUZELT).items():
                m = max((h for h, _ in hatalar), default=0.0)
                if olcum == "kalca px":
                    kalca_en = max(kalca_en, (m, anim_ad))
                    asan += m > 0.5
                    continue
                if olcum == "merkez px":
                    # Kareler arasi: donus ve konum ayri ayri duz geciyor,
                    # ara karede kalca 1 px'ten az kayabiliyor.
                    merkez_en = max(merkez_en, (m, anim_ad))
                    asan += m > 1.0
                    continue
                # Silah-govde carpisma duzeltmesi (wom_cevir.silah_carpisma_duzelt)
                # bu setlerde sag kolu BILEREK en cok CARPISMA_EN derece ceviriyor;
                # kol ve bicak yonunun Epic Fight'tan sapmasi o kadar serbest.
                sinir = esik + (CARPISMA_EN if set_ad in SILAH_GEO and olcum in ("sag kol", "bicak") else 0.0)
                for h, t in hatalar:
                    tum.append(h)
                    asan += h > sinir
                    if h > en_kotu[0]:
                        en_kotu = (h, anim_ad, olcum)
    tum.sort()
    p = lambda q: tum[min(len(tum) - 1, int(q * len(tum)))]
    print("yon: ornek %d  medyan %.2f  p99 %.2f  en kotu %.1f derece (%s, %s)"
          % (len(tum), p(0.5), p(0.99), en_kotu[0], en_kotu[1], en_kotu[2]))
    print("kalca en kotu %.3f px (%s)" % kalca_en)
    print("merkez en kotu %.3f px (%s)" % merkez_en)
    with open(CIKTI_IZ, "w", encoding="utf-8") as f:
        json.dump({"aciklama": "Epic Fight'in gercek uzuv yonleri (Blockbench ic uzayi), "
                   "zaman OYUN zamani. Ureten: arac/wom_dogrula.py. Elle duzenleme.",
                   "animasyonlar": izler}, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print("HATA: %d" % asan)
    return 1 if asan else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
