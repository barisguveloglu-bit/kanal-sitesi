# -*- coding: utf-8 -*-
"""Cevrilmis dovus animasyonunu Epic Fight'in KENDISINE karsi olcer.  v7.98.0

Kullanim:
    python3 addon/arac/ef_anim_dogrula.py <biped.json> <bedrock.json> \\
        <onek> <ad=animasyon.json> [...] [--esik 12] [--sessiz]

---- NEDEN AYRI BIR DOSYA ----
v5.5'te olculebilen her sey duzelmisti ama oyunda hala bozuktu.
Sebebi: onizleme cevirinin KABULUNU paylasiyordu -- ayni yanlisi
ayni sekilde ciziyor, dolayisiyla dogruluyordu.

Bu dosya ef_anim_cevir.py'den HICBIR SEY almiyor:
  GERCEK   Epic Fight'in yerel matrisleri zincirle carpiliyor
           (eklemlerin anlami bu, cevirme kabulu yok) ve uzuvlarin
           DUNYADAKI yonu olculuyor: omuz->silah, kalca->ayak,
           kafa ve gogsun baktigi yon.
  TAHMIN   Yazilan Bedrock dosyasi okunuyor, kareler arasi Bedrock
           gibi EKSEN EKSEN DUZ geciliyor, Blockbench kurali
           (ic = (-x, -y, +z), M = Rz.Ry.Rx) ve vanilla hiyerarsi
           ile kemiklerin dunya donusu kuruluyor.
  ORTAK    Yalniz iki sabit: Epic Fight -> Blockbench eksen
           donusumu (x, z, -y) -- yuz normalinden olculdu -- ve
           root'un ilk kareye sifirlanmasi (cikti bunu vaat ediyor,
           oyuncunun yonunu oyun belirliyor).

Cikis kodu: esigi asan ornek varsa 1.
"""
import json
import math
import sys

C = [[1.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, -1.0, 0.0]]
ATA = {"root": None, "waist": "root", "body": "waist", "head": "body",
       "rightArm": "body", "leftArm": "body",
       "rightLeg": "root", "leftLeg": "root"}
# olcum -> (Bedrock kemigi, olculen sey)
OLCUM = {
    "sag kol":  ("rightArm", ("uzuv", "Arm_R", "Tool_R")),
    "sol kol":  ("leftArm",  ("uzuv", "Arm_L", "Tool_L")),
    "sag bacak": ("rightLeg", ("bacak", "Thigh_R", "Leg_R")),
    "sol bacak": ("leftLeg",  ("bacak", "Thigh_L", "Leg_L")),
    "kafa yonu": ("head", ("yon", "Head")),
    "gogus yonu": ("body", ("yon", "Chest")),
}


def mm(a, b):
    n = len(b[0])
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(n)]
            for i in range(len(a))]


def mv(a, v):
    return [sum(a[i][k] * v[k] for k in range(3)) for i in range(3)]


def tr(a):
    return [[a[j][i] for j in range(3)] for i in range(3)]


def nrm(v):
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v]


def aci(a, b):
    a, b = nrm(a), nrm(b)
    return math.degrees(math.acos(max(-1.0, min(1.0, sum(a[i] * b[i] for i in range(3))))))


# ---------------- GERCEK: Epic Fight ----------------
def q_of(m):
    # Shepperd
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
        self.k = {}
        self.s = {}     # eklem -> (zaman, olcek): gorunurluk
        for e in veri["animation"]:
            if e["name"] in self.bind and e["time"]:
                ms = [[v[0:4], v[4:8], v[8:12], v[12:16]] for v in e["transform"]]
                # Olcek = donus kisminin determinantinin kup koku.
                # Olcegi ~0 olan kare GORUNMEZ: yonu olculmez, o kareyi
                # icine alan ornekler atlanir (asagida).
                ol = [abs(det([r[:3] for r in m[:3]])) ** (1 / 3) for m in ms]
                self.s[e["name"]] = (e["time"], ol)
                qs = [q_of(dik([r[:3] for r in m[:3]])) if o > 0.1 else None
                      for m, o in zip(ms, ol)]
                self.k[e["name"]] = (e["time"], qs, [[m[0][3], m[1][3], m[2][3]] for m in ms])
        self.sure = max((ts[-1] for ts, _, _ in self.k.values()), default=0.0)

    def gorunur(self, t):
        """t aninda Root olcegi (Epic Fight: kareler arasi duz)."""
        if "Root" not in self.s:
            return 1.0
        ts, ol = self.s["Root"]
        if t <= ts[0]:
            return ol[0]
        if t >= ts[-1]:
            return ol[-1]
        i = 0
        while ts[i + 1] < t:
            i += 1
        u = (t - ts[i]) / (ts[i + 1] - ts[i])
        return ol[i] + (ol[i + 1] - ol[i]) * u

    def tanimsiz(self, t):
        """t, gecersiz (sifir olcekli) bir kareye dayaniyor mu."""
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
        # Epic Fight TransformSheet.getInterpolationInfo: ikili arama,
        # dizi siralanmadan (kaynakta 33 sirasiz dizi var).
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


def det(r):
    return (r[0][0] * (r[1][1] * r[2][2] - r[1][2] * r[2][1])
            - r[0][1] * (r[1][0] * r[2][2] - r[1][2] * r[2][0])
            + r[0][2] * (r[1][0] * r[2][1] - r[1][1] * r[2][0]))


def dik(r):
    """Kayan noktadan gelen kucuk olcek/kaymayi ayikla (yon degismez)."""
    x = nrm([r[0][0], r[1][0], r[2][0]])
    y = [r[0][1], r[1][1], r[2][1]]
    d = sum(x[i] * y[i] for i in range(3))
    y = nrm([y[i] - d * x[i] for i in range(3)])
    z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]]
    return [[x[i], y[i], z[i]] for i in range(3)]


def rot(m):
    return [r[:3] for r in m[:3]]


def gercek_yon(ef, olcum, t):
    """Olculen seyin DUNYADAKI yonu (Epic Fight uzayinda)."""
    tur = olcum[0]
    if tur == "uzuv":
        return [a - b for a, b in zip(konum(ef.dunya(olcum[2], t)), konum(ef.dunya(olcum[1], t)))]
    if tur == "bacak":
        # Diz ekleminin yerelinde, dinlenmede yere dusen nokta
        Wd = ef.dunya(olcum[2], None)
        p = konum(Wd)
        ofs = mv(tr(rot(Wd)), [0 - 0, 0, -p[2]])
        Ad = ef.dunya(olcum[2], t)
        ayak = [a + b for a, b in zip(konum(Ad), mv(rot(Ad), ofs))]
        return [a - b for a, b in zip(ayak, konum(ef.dunya(olcum[1], t)))]
    # yon: eklemin dinlenmedeki "on"u (+Y, Epic Fight'ta on) tasiniyor
    W = rot(ef.dunya(olcum[1], None))
    yerel_on = mv(tr(W), [0.0, 1.0, 0.0])
    return mv(rot(ef.dunya(olcum[1], t)), yerel_on)


# ---------------- TAHMIN: Bedrock dosyasi ----------------
def bb_mat(f):
    # Blockbench: ic = (-x, -y, +z); M = Rz . Ry . Rx
    x, y, z = [math.radians(v) for v in (-f[0], -f[1], f[2])]
    Rx = [[1, 0, 0], [0, math.cos(x), -math.sin(x)], [0, math.sin(x), math.cos(x)]]
    Ry = [[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]]
    Rz = [[math.cos(z), -math.sin(z), 0], [math.sin(z), math.cos(z), 0], [0, 0, 1]]
    return mm(mm(Rz, Ry), Rx)


def bedrock_deger(kanal, t):
    """Bedrock: kareler arasi her eksen AYRI ve DUZ."""
    ks = sorted((float(k), v) for k, v in kanal.items())
    if t <= ks[0][0]:
        return ks[0][1]
    if t >= ks[-1][0]:
        return ks[-1][1]
    for i in range(1, len(ks)):
        if ks[i][0] >= t:
            (t0, a), (t1, b) = ks[i - 1], ks[i]
            u = (t - t0) / (t1 - t0) if t1 > t0 else 0.0
            return [a[n] + (b[n] - a[n]) * u for n in range(3)]


def bedrock_dunya(anim, kemik, t):
    m = [[1.0, 0, 0], [0, 1.0, 0], [0, 0, 1.0]]
    yol = []
    while kemik is not None:
        yol.append(kemik)
        kemik = ATA[kemik]
    for k in reversed(yol):
        b = anim["bones"].get(k)
        if b and "rotation" in b:
            m = mm(m, bb_mat(bedrock_deger(b["rotation"], t)))
    return m


# ---------------- olcum ----------------
def olc(ef, anim):
    # Root sifirlamasi: ilk karedeki root yonelimi (ic uzayda).
    # Ilk kare gorunmezse ilk GECERLI an -- cikti da bunu vaat ediyor.
    t0 = 0.0
    while ef.tanimsiz(t0) and t0 < ef.sure:
        t0 += 1 / 240.0
    G0 = mm(rot(ef.dunya("Root", t0)), tr(rot(ef.dunya("Root", None))))
    S = mm(mm(C, G0), tr(C))
    zamanlar = set()
    for ts, _, _ in ef.k.values():
        zamanlar.update(ts)
    zamanlar = sorted(zamanlar)
    ornek = set(zamanlar)
    for i in range(1, len(zamanlar)):
        ornek.add((zamanlar[i - 1] + zamanlar[i]) / 2)
    n = int(ef.sure * 60)
    ornek.update(i / 60.0 for i in range(n + 1))
    sonuc = {}
    for ad, (kemik, olcum) in OLCUM.items():
        if olcum[1] not in ef.bind:
            continue
        # dinlenmedeki yon, Bedrock kemiginin dinlenme yonu kabul ediliyor
        dinlenme = mv(C, gercek_yon(ef, olcum, None))
        hatalar = []
        for t in sorted(ornek):
            if t > ef.sure + 1e-6 or ef.tanimsiz(t):
                continue
            gercek = mv(tr(S), mv(C, gercek_yon(ef, olcum, t)))
            tahmin = mv(bedrock_dunya(anim, kemik, t), dinlenme)
            hatalar.append((aci(gercek, tahmin), t))
        sonuc[ad] = hatalar
    # Gorunurluk: dosyadaki root olcegi Epic Fight'inkiyle ayni mi.
    # Hata "derece" degil ama ayni esikle sayilsin diye x100.
    kok = anim["bones"].get("root", {})
    hatalar = []
    for t in sorted(ornek):
        if t > ef.sure + 1e-6:
            continue
        beklenen = ef.gorunur(t)
        if "scale" in kok:
            ks = sorted((float(k), v) for k, v in kok["scale"].items())
            dosya = bedrock_deger({str(a): [v, v, v] for a, v in ks}, t)[0]
        else:
            dosya = 1.0
        hatalar.append((abs(dosya - beklenen) * 100, t))
    sonuc["gorunurluk x100"] = hatalar
    return sonuc


def parmak_izi(ef, anim, adim=0.05):
    """Depodaki test icin: Epic Fight'in GERCEK yonleri, seyrek.

    JAR depoda durmuyor; test bu dosyaya karsi olcuyor. Icerik
    Epic Fight'in pozu (ic uzayda, root sifirlanmis), Bedrock
    tahmini DEGIL -- tahmini test kendisi yapiyor.            """
    t0 = 0.0
    while ef.tanimsiz(t0) and t0 < ef.sure:
        t0 += 1 / 240.0
    G0 = mm(rot(ef.dunya("Root", t0)), tr(rot(ef.dunya("Root", None))))
    S = mm(mm(C, G0), tr(C))
    iz = {}
    for ad, (kemik, olcum) in OLCUM.items():
        if olcum[1] not in ef.bind:
            continue
        dinlenme = [round(v, 5) for v in nrm(mv(C, gercek_yon(ef, olcum, None)))]
        seri = []
        n = int(ef.sure / adim + 1e-9)
        for i in range(n + 1):
            t = round(i * adim, 4)
            if ef.tanimsiz(t):
                continue
            g = nrm(mv(tr(S), mv(C, gercek_yon(ef, olcum, t))))
            seri.append([t] + [round(v, 4) for v in g])
        iz[ad] = {"kemik": kemik, "dinlenme": dinlenme, "yon": seri}
    return iz


def main(argv):
    esik, sessiz, arg, iz_yolu = 12.0, False, [], None
    i = 0
    while i < len(argv):
        if argv[i] == "--iz":
            iz_yolu = argv[i + 1]; i += 2; continue
        if argv[i] == "--esik":
            esik = float(argv[i + 1]); i += 2; continue
        if argv[i] == "--sessiz":
            sessiz = True; i += 1; continue
        arg.append(argv[i]); i += 1
    taban = json.load(open(arg[0], encoding="utf-8"))
    bedrock = json.load(open(arg[1], encoding="utf-8"))["animations"]
    onek = arg[2]
    tum, asan, en_kotu = [], 0, (0.0, "", "", 0.0)
    izler = {}
    for kalem in arg[3:]:
        ad, yol = kalem.split("=", 1)
        anim = bedrock.get(onek + ad)
        if anim is None:
            print("YOK: " + onek + ad)
            asan += 1
            continue
        ef = EF(json.load(open(yol, encoding="utf-8")), taban)
        if iz_yolu:
            izler[onek + ad] = parmak_izi(ef, anim)
        for olcum, hatalar in olc(ef, anim).items():
            for h, t in hatalar:
                tum.append(h)
                if h > esik:
                    asan += 1
                if h > en_kotu[0]:
                    en_kotu = (h, ad, olcum, t)
            if not sessiz:
                m = max(h for h, _ in hatalar)
                print("  %-34s %-10s en kotu %6.1f derece" % (ad, olcum, m))
    tum.sort()
    if tum:
        p = lambda q: tum[min(len(tum) - 1, int(q * len(tum)))]
        print("ornek: %d   medyan %.2f   p99 %.2f   en kotu %.1f derece (%s, %s, t=%.3f)"
              % (len(tum), p(0.5), p(0.99), en_kotu[0], en_kotu[1], en_kotu[2], en_kotu[3]))
    print("esik %.0f dereceyi asan ornek: %d" % (esik, asan))
    if iz_yolu:
        with open(iz_yolu, "w", encoding="utf-8") as f:
            json.dump({"aciklama": "Epic Fight'in gercek uzuv yonleri "
                       "(Blockbench ic uzayi, root ilk gecerli ana sifirli). "
                       "Ureten: arac/ef_anim_dogrula.py --iz. Elle duzenleme.",
                       "animasyonlar": izler}, f, ensure_ascii=False,
                      separators=(",", ":"))
            f.write("\n")
        print("parmak izi: %s" % iz_yolu)
    print("HATA : %d" % asan)
    return 1 if asan else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
