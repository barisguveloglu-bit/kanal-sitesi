"""Kamera denetimi: her film karesinde kamera bozuk mu?            v7.99.10

    python3 addon/arac/kamera_denetim.py senaryo.json [--sessiz]

Kullanici: "kamera duruslari bozuk degil degil mi, sinematografi icin
onemli." Blender'siz, zaman cizelgesi + kamera izi uzerinden olcer:

 1. ZEMIN    kamera zeminin (ya da cukurun) ustunde; odada tavanin altinda
 2. AGAC     kamera bir agacin govdesinin/yapraginin icinde degil
 3. AKTOR    kamera bir aktorun govdesinin icinde degil (POV'da kendisi haric)
 4. KADRAJ   cekimin konusu (a, varsa b) kadrajda; agac onunu kapatmiyor
 5. KESME    kesmede aci ya da yer yeterince degisiyor (30 derece kurali;
             yoksa "atlama kesme" hatasi gibi gorunur)
 6. 180      iki kisilik cekimlerde kamera eksenin ayni tarafinda; senaryo
             "kural180_serbest" araliginda bilerek bozulabilir
 7. SICRAMA  ayni cekim icinde kamera bir karede 0.6 bloktan fazla
             sicramiyor (orn. "takip" isinlanan aktoru izlerse)
 8. ORTME    kameradan konuya giden gorus cizgisi baska bir aktorun
             govdesinden (r 0.35, boy 2.05 -- bas dahil) gecmiyor
 9. ONPLAN   konu olmayan bir aktor kadrajda ve kameraya 1.3 bloktan yakin
             degil, kadraj genisliginin %40'indan fazlasini kaplamiyor
             (POV'da aktorun kendisi: kamera basinin disinda)
 8-9 v7.99.10 onizlemesinden sonra eklendi: denetim "0 sorun" diyordu ama
 alcak aci kamerayi B'nin arkasina, omuz ustu B'yi A'nin omzunun arkasina
 koyuyordu; ikisi de kadrajin yarisini kapatti.
Cikti: sorunlu cekimlerin listesi (hikaye zamani + kural + ayrinti).
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_film as F  # noqa: E402
import bedrock_onizleme as B  # noqa: E402

SENSOR = 36.0                 # Blender kamerasinin varsayilan sensor genisligi (mm)
EN_BOY = 16 / 9


def _kutu_icinde(p, mn, mx, pay=0.0):
    return all(mn[i] - pay <= p[i] <= mx[i] + pay for i in range(3))


def _isin_kutu(o, d, mn, mx):
    """Isin o + s.d (0<s<1) kutuya giriyor mu (slab yontemi)."""
    t0, t1 = 0.0, 1.0
    for i in range(3):
        if abs(d[i]) < 1e-12:
            if o[i] < mn[i] or o[i] > mx[i]:
                return False
            continue
        a, b = (mn[i] - o[i]) / d[i], (mx[i] - o[i]) / d[i]
        if a > b:
            a, b = b, a
        t0, t1 = max(t0, a), min(t1, b)
        if t0 > t1:
            return False
    return True


def agac_kutulari(sen):
    out = []
    if sen.get("mekan") == "oda":
        return out
    for ax, ay, _tur, boy in F.agac_yerleri(sen):
        out.append(("govde", (ax, ay, 0), (ax + 1, ay + 1, boy)))
        out.append(("yaprak", (ax - 2, ay - 2, boy - 1), (ax + 3, ay + 3, boy + 2)))
    return out


YATIK = {"dus", "yuzustu", "bayil"}       # film_poz: yerde yatan pozlar
DIZ = {"diz_cok", "comel_dokun"}


def govde(r):
    """Aktorun kaba hacmi (cx, cy, z0, z1, yaricap): ayakta silindir
    (r 0.35, boy 2.05 -- bas dahil), diz cokmus alcak, yatan yere serili
    genis disk. Yatani dik silindir saymak yanlis ORTME/ONPLAN veriyordu."""
    poz = None
    for e in r.get("tepki") or []:
        if e["bas"] <= r["t"] and (e.get("tut") or r["t"] <= e["bas"] + e.get("sure", 0)):
            poz = e.get("ad")
    if poz in YATIK:
        return r["x"], r["y"], r["z"] - 0.1, r["z"] + 0.6, 1.0
    if poz in DIZ:
        return r["x"], r["y"], r["z"], r["z"] + 1.5, 0.35
    return r["x"], r["y"], r["z"], r["z"] + 2.05, 0.35


def konular(c):
    """[(aktor, hedef_yuksekligi)]: cekimin kadrajda olmasi gereken konusu.
    Yakin planda bas (1.62), digerlerinde govde ortasi (1.2). Alcak aci ve
    takip tek kisilik: yalniz a. Omuz ustu: konu b."""
    aci = c["aci"]
    if aci == "elle":
        return [(c["bak"], c.get("bak_yuks", 1.3))] if isinstance(c.get("bak"), str) else []
    if aci == "goz":
        return []
    if aci in ("yakin", "yakin_on"):
        return [(c["a"], 1.55)]
    if aci in ("dusuk", "takip"):
        return [(c["a"], 1.2)]
    if aci == "omuz":
        return [(c["b"], 1.2)] if c.get("b") else []
    return [(x, 1.0) for x in (c.get("a"), c.get("b")) if x]


def denetle(sen):
    setler = B.oku(F.HAREKET)["setler"]
    harita = F.zaman_haritasi(sen)
    ak, _, _, _ = F.zaman_cizelgesi(sen, setler, {})
    kam = F.kamera_izi(sen, ak)
    atislar = sorted(sen.get("kamera", []), key=lambda c: c["t"])
    agac = agac_kutulari(sen)
    oda = sen.get("oda") if sen.get("mekan") == "oda" else None
    ck = sen.get("zemin", {}).get("cukur")
    serbest = sen.get("kural180_serbest", [])
    sorun = []

    def atis_no(f):
        t = harita[f]
        n = 0
        for i, c in enumerate(atislar):
            if c["t"] <= t + 1e-9:
                n = i
        return n

    def ekle(f, kural, ayrinti):
        c = atislar[atis_no(f)]
        sorun.append({"t": round(harita[f], 2), "atis_t": c["t"], "aci": c["aci"], "kural": kural,
                      "ayrinti": ayrinti})

    onceki_atis, onceki_kp, onceki_yon, onceki_taraf = None, None, None, {}
    for f, (kp, bk, lens, yatik, odak) in enumerate(kam):
        no = atis_no(f)
        c = atislar[no]
        t = harita[f]
        yon = [bk[i] - kp[i] for i in range(3)]
        n = math.sqrt(sum(x * x for x in yon)) or 1e-9
        yon = [x / n for x in yon]
        # 1. zemin / tavan
        taban = 0.0
        if ck and t >= ck.get("t", 0) and math.hypot(kp[0] - ck["x"], kp[1] - ck["y"]) <= ck["r"]:
            taban = -ck["derin"]
        if kp[2] < taban + 0.12:
            ekle(f, "ZEMIN", "kamera z=%.2f" % kp[2])
        if oda and not (-oda["genis"] / 2 < kp[0] < oda["genis"] / 2 and -oda["derin"] / 2 < kp[1] < oda["derin"] / 2
                        and kp[2] < oda["yuks"] - 0.1):
            ekle(f, "ZEMIN", "kamera odanin disinda/tavanda %s" % [round(x, 2) for x in kp])
        # 2. agac
        for tur, mn, mx in agac:
            if _kutu_icinde(kp, mn, mx, 0.15):
                ekle(f, "AGAC", "kamera agac %s icinde (%s)" % (tur, [round(x, 1) for x in kp]))
                break
        # 3. aktor
        for ad, a in ak.items():
            r = a.kayit[min(f, len(a.kayit) - 1)]
            if not r["gorunur"] or (c["aci"] == "goz" and ad == c.get("a")):
                continue
            if math.hypot(kp[0] - r["x"], kp[1] - r["y"]) < 0.4 and r["z"] - 0.1 < kp[2] < r["z"] + 2.0:
                ekle(f, "AKTOR", "kamera %s'in icinde" % ad)
        # 4. kadraj + agac ortmesi
        yf = 2 * math.atan(SENSOR / 2 / lens)
        dfv = 2 * math.atan(math.tan(yf / 2) / EN_BOY)
        konu_adlari = {ad for ad, _ in konular(c)}
        # 9. on plan: kadrajda, kameraya cok yakin, konu olmayan aktor
        for ad, a in ak.items():
            r = a.kayit[min(f, len(a.kayit) - 1)]
            if not r["gorunur"] or ad in konu_adlari:
                continue
            if c["aci"] == "goz" and ad == c.get("a"):
                if math.hypot(kp[0] - r["x"], kp[1] - r["y"]) < 0.32:
                    ekle(f, "ONPLAN", "POV kamerasi %s'in basinin icinde" % ad)
                continue
            gx, gy, z0, z1, gr = govde(r)
            en_yakin = max(0.0, min(math.dist(kp, (gx, gy, z0 + (z1 - z0) * u)) for u in (0.15, 0.5, 0.85)) - (gr - 0.35))
            v = [r["x"] - kp[0], r["y"] - kp[1], r["z"] + 1.0 - kp[2]]
            ileri_ = sum(v[i] * yon[i] for i in range(3))
            if ileri_ <= 0:
                continue
            kapla = 2 * math.atan(0.3 / max(ileri_, 1e-3)) / yf
            yanal = math.atan2(abs(v[0] * yon[1] - v[1] * yon[0]), ileri_)
            if en_yakin < 1.3:
                ekle(f, "ONPLAN", "%s kameraya %.2f blok (kadraji kapatir)" % (ad, en_yakin))
            elif kapla > 0.4 and yanal < yf / 2:
                ekle(f, "ONPLAN", "%s kadrajin %%%d'ini kapliyor" % (ad, 100 * kapla))
        for ad, yuks in konular(c):
            r = ak[ad].kayit[min(f, len(ak[ad].kayit) - 1)]
            if not r["gorunur"]:
                continue
            hedef = (r["x"], r["y"], r["z"] + yuks)
            uzak = math.dist(hedef, kp)
            # cok yakin: bas (0.5 blok) kadraj yuksekliginin %80'ini asiyorsa yuz tasar
            if c["aci"] in ("yakin", "yakin_on") and 0.5 / (2 * uzak * math.tan(dfv / 2)) > 0.8:
                ekle(f, "KADRAJ", "%s cok yakin: bas kadrajin %%%d'i" % (ad, 100 * 0.5 / (2 * uzak * math.tan(dfv / 2))))
            v = [hedef[i] - kp[i] for i in range(3)]
            uz = math.sqrt(sum(x * x for x in v)) or 1e-9
            # kamera uzayi: ileri=yon, sag=yon x z, yukari
            sag = [yon[1], -yon[0], 0]
            sn = math.hypot(sag[0], sag[1]) or 1e-9
            sag = [sag[0] / sn, sag[1] / sn, 0]
            yuk = [sag[1] * yon[2] - 0, -sag[0] * yon[2], sag[0] * yon[1] - sag[1] * yon[0]]
            ileri = sum(v[i] * yon[i] for i in range(3))
            if ileri <= 0:
                ekle(f, "KADRAJ", "%s kameranin arkasinda" % ad)
                continue
            yat = math.atan2(sum(v[i] * sag[i] for i in range(3)), ileri)
            dik = math.atan2(sum(v[i] * yuk[i] for i in range(3)), ileri)
            if abs(yat) > yf / 2 * 1.02 or abs(dik) > dfv / 2 * 1.15:
                ekle(f, "KADRAJ", "%s kadraj disinda (yatay %.0f, dikey %.0f derece)" % (ad, math.degrees(yat), math.degrees(dik)))
            for tur, mn, mx in agac:
                if _isin_kutu(kp, v, mn, mx):
                    ekle(f, "KADRAJ", "%s'i agac %s kapatiyor" % (ad, tur))
                    break
            # 8. ortme: gorus cizgisi baska aktorun govdesinden geciyor mu
            for ad2, a2 in ak.items():
                r2 = a2.kayit[min(f, len(a2.kayit) - 1)]
                if ad2 == ad or not r2["gorunur"] or (c["aci"] == "goz" and ad2 == c.get("a")):
                    continue
                for k in range(1, 20):
                    q = [kp[i] + v[i] * k / 20 for i in range(3)]
                    gx, gy, z0, z1, gr = govde(r2)
                    if math.hypot(q[0] - gx, q[1] - gy) < gr and z0 < q[2] < z1:
                        ekle(f, "ORTME", "%s'i %s ortuyor" % (ad, ad2))
                        break
        # 5. kesme + 7. sicrama
        if onceki_atis is not None:
            adim = math.dist(kp, onceki_kp)
            aci = math.degrees(math.acos(max(-1, min(1, sum(yon[i] * onceki_yon[i] for i in range(3))))))
            if no != onceki_atis and not c.get("gecis"):
                if aci < 30 and adim < 1.0 and atislar[onceki_atis]["aci"] == c["aci"]:
                    ekle(f, "KESME", "ayni aci tipiyle %.0f derece / %.2f blok degisim (30 derece kurali)" % (aci, adim))
            elif no == onceki_atis and adim > 0.6:
                ekle(f, "SICRAMA", "cekim icinde %.2f blok" % adim)
        # 6. 180 derece
        if c.get("a") and c.get("b") and c["aci"] not in ("ust", "goz"):
            ra = ak[c["a"]].kayit[min(f, len(ak[c["a"]].kayit) - 1)]
            rb = ak[c["b"]].kayit[min(f, len(ak[c["b"]].kayit) - 1)]
            ciftler = tuple(sorted((c["a"], c["b"])))
            x0, x1 = (ra, rb) if c["a"] == ciftler[0] else (rb, ra)
            ex, ey = x1["x"] - x0["x"], x1["y"] - x0["y"]
            taraf = 1 if ex * (kp[1] - x0["y"]) - ey * (kp[0] - x0["x"]) > 0 else -1
            if no != onceki_atis and ciftler in onceki_taraf and onceki_taraf[ciftler] != taraf \
                    and not any(s0 <= t <= s1 for s0, s1 in serbest):
                ekle(f, "180", "%s-%s ekseninin obur tarafina gecti" % ciftler)
            onceki_taraf[ciftler] = taraf
        onceki_atis, onceki_kp, onceki_yon = no, kp, yon
    return sorun, len(kam), len(atislar)


def ozet(sorun):
    """Ardisik ayni sorunlari tek satira indir."""
    out, son = [], {}
    for s in sorun:
        k = (s["kural"], s["atis_t"])
        if k in son and s["t"] - son[k]["bit"] < 0.1:
            son[k]["bit"] = s["t"]
            son[k]["kare"] += 1
            continue
        son[k] = dict(s, bit=s["t"], kare=1)
        out.append(son[k])
    return out


if __name__ == "__main__":
    sen = B.oku(os.path.abspath(sys.argv[1]))
    sorun, kare, atis = denetle(sen)
    oz = ozet(sorun)
    print("%d kare, %d cekim, %d sorunlu kare, %d sorun grubu" % (kare, atis, len(sorun), len(oz)))
    for s in oz:
        print("  t=%6.2f-%6.2f  [%s] cekim t=%s (%s) %d kare: %s" % (s["t"], s["bit"], s["kural"], s["atis_t"], s["aci"],
                                                                 s["kare"], s["ayrinti"]))
    sys.exit(1 if sorun else 0)
