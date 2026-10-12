"""BARIS'IN FORMU -- 1,5 kat boy + iki ek kol                      v7.99.14

Kullanicinin karari (2026-10-12 sabah; SERI_SEZON1.md "Barış'ın yeni
formu"): eller NORMAL, iki kol daha, boy Baris'in 1,5 kati ("oranlar
ayni, butun beden"), gozler kirmizi Thomas gozleri (bir goz kirmizi:
beden forma tam alismadi; sonraki bolumlerde iki goz).

* Geometri aktor.geo.json'dan TURETILIR, ayri .geo.json yazilmaz: govde
  degisirse form da degisir. Ana kemikler AYNEN kalir, yalniz ek kollar
  eklenir (normal aktorun modeli hic degismez).
* Ek kol ana kolun DOKUSUNU kullanir (uv [40,16] / [32,48], kilif
  [40,32] / [48,48]); boyu ana kolla ayni (4x12x4). Eklentideki o_sey
  modeli de ek kollarinda ayni yolu tutuyor. Skin degismez.
* Dinlenme acisi KUP donusu olarak yazilir: film araci (kemik_kupleri)
  kemigin geometri donusunu okumuyor, kupun donusunu kupe isliyor.
* Ek kol ANA KOLA bagli (alt kemigi): ana kol nasil donerse o da oyle
  doner. Depodaki Ben 10 Dort Kol modeli de (ben_dortkol.geo.json,
  l_r2 -> rightArm) boyle kurulu. Neden: govde 8 px genis ve ana kol
  govdenin yan yuzunu y 12..24 boyunca kapliyor; kendi omzu etrafinda
  donen bir ek kol, yuruyuste geriye sallanan ana kolun ucuyla carpisti
  (olculdu: 22-63 px^3). Bagli kolda ana kol ile ek kol hic carpismaz.
* Bagli kol buyuk vuruslarda ana kolla ucup gitmesin: TAKIP_SINIR'dan
  buyuk acilarda film araci ek kolu o acida tutar (blender_film).
  Ek kolun kendi hareketi yalniz SALLANMA: kendi omzu etrafinda z
  ekseninde (z korunur -> ana kolun arka yuzune hic girmez).
* 1,5 kat kok nesnesine YAZILMAZ -- kok olcegi gorunurluk icin 0/1
  anahtarlaniyor. blender_film kok ile kemikler arasina bir bos koyar.
* Kol yerlesimi kullanici tarafindan SOYLENMEDI -> YERLESIM'de iki secenek,
  varsayilan "alt"; karar kullanicinin. Ikisi de carpisma() ile OLCULDU:
  dinlenmede ve yuruyus uclarinda (kollar +-30, bacaklar +-40, sallanma
  +-2.5) ana kolun, basin, bacaklarin, obur ek kolun icine girmez
  (test/form_model.mjs). Sirttan kanat gibi cikan ucuncu secenek
  denendi, sifira inmedi (ek kollar sirtta birbirine ya da ana kola
  giriyordu) -- bilerek konmadi.
"""
import copy
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bedrock_onizleme as B  # noqa: E402

OLCEK = 1.5                    # kullanici: "barış'ın boyutu ne ise onun bir buçuk katı"
VARSAYILAN = "alt"

# SAG ek kol, DOSYA uzayi (x eksi = karakterin sagi). Sol kol aynalanir.
#   kup: (origin, size)   pivot: ek kolun kendi omzu (kup donusu + sallanma)
#   aci: [x, y, z] derece, kup donusu (z + = el disa acilir)
# Ikisi de ana kolun 4 px ARKASINDA (z 2..6), ust ucu ana kolun donme
# eksenine (y 22, z 0) yakin: ana kolla donerken govdeden az kayar.
YERLESIM = {
    "alt": {"kup": ([-7, 7, 2], [4, 12, 4]), "pivot": [-5, 18, 4], "aci": [0, 0, 22],
            "ad": "ana kolun hemen altından ve arkasından, hafif dışa açık"},
    "omuz": {"kup": ([-7, 10, 2], [4, 12, 4]), "pivot": [-5, 21, 4], "aci": [0, 0, 45],
             "ad": "omuz hizasından, ana kolun arkasından yelpaze gibi"},
}

# ek kemik -> bagli oldugu ana kemik
EK_KOL = {"rightArm2": "rightArm", "leftArm2": "leftArm"}
_DOKU = {"rightArm2": ([40, 16], [40, 32]), "leftArm2": ([32, 48], [48, 48])}

TAKIP_SINIR = 40.0      # derece: ana kol bundan cok donerse ek kol bu acida kalir
SALLANMA = 2.5          # derece: ek kolun kendi z sallanmasi (nefes gibi)
SALLANMA_SURE = 3.6     # sn (blender_film NEFES_SURE ile ayni)


def form_ayari(v):
    """Senaryodaki "form" alanini cozer: True / "alt" / {"kol": "alt", "olcek": 1.5}.
    Bilinmeyen yerlesim ya da anahtar HATA (sessiz varsayilan yok)."""
    if not v:
        return None
    if v is True:
        v = {}
    elif isinstance(v, str):
        v = {"kol": v}
    if not isinstance(v, dict):
        raise ValueError("form ayari: %r" % (v,))
    fazla = set(v) - {"kol", "olcek"}
    if fazla:
        raise ValueError("form ayarinda bilinmeyen anahtar: %s" % sorted(fazla))
    kol = v.get("kol", VARSAYILAN)
    if kol not in YERLESIM:
        raise ValueError("kol yerlesimi yok: %s (var: %s)" % (kol, ", ".join(YERLESIM)))
    return {"kol": kol, "olcek": float(v.get("olcek", OLCEK))}


def olcek(aktor_v):
    """Aktorun boy carpani: formda OLCEK, degilse tam 1.0."""
    f = form_ayari(aktor_v.get("form"))
    return f["olcek"] if f else 1.0


def _aynala(kup, pivot, aci):
    (o, s) = kup
    return ([-(o[0] + s[0]), o[1], o[2]], list(s)), [-pivot[0], pivot[1], pivot[2]], [aci[0], -aci[1], -aci[2]]


def ek_kemikler(kol=VARSAYILAN):
    """Ek kol + kilif kemikleri (dosya uzayi). Kol ana kola, kilif kola bagli."""
    y = YERLESIM[kol]
    sag = (y["kup"], y["pivot"], y["aci"])
    cikti = []
    for ad, (kup, pivot, aci) in (("rightArm2", sag), ("leftArm2", _aynala(*sag))):
        (o, s) = kup
        uv_kol, uv_kilif = _DOKU[ad]
        kup_k = {"origin": list(o), "size": list(s), "uv": uv_kol,
                 "rotation": list(aci), "pivot": list(pivot)}
        cikti.append({"name": ad, "parent": EK_KOL[ad], "pivot": list(pivot), "cubes": [kup_k]})
        cikti.append({"name": ad.replace("Arm", "Sleeve"), "parent": ad, "pivot": list(pivot),
                      "cubes": [dict(kup_k, uv=uv_kilif, inflate=0.25)]})
    return cikti


def form_geo(geo, kol=VARSAYILAN):
    """Ana aktor geometrisi + ek kollar. Girdi DEGISMEZ (derin kopya)."""
    g = copy.deepcopy(geo)
    gg = g["minecraft:geometry"][0]
    adlar = {b["name"] for b in gg["bones"]}
    for b in ek_kemikler(kol):
        if b["name"] in adlar:
            raise ValueError("geometride zaten var: %s" % b["name"])
        gg["bones"].append(b)
    d = gg["description"]
    d["identifier"] = d["identifier"] + "_form_" + kol
    return g


def sinir_orani(aci):
    """Ana kolun donus acisi (derece) -> ek kolun izleyecegi oran: TAKIP_SINIR'a
    kadar 1 (birlikte doner), ustunde TAKIP_SINIR / aci (o acida kalir)."""
    a = abs(aci)
    return 1.0 if a <= TAKIP_SINIR else TAKIP_SINIR / a


def sallanma(t, kemik, faz=0.0):
    """Ek kolun kendi z acisi (derece): iki taraf ayni anda acilip kapanir
    (sol kolda isaret ters), nefesten ceyrek tur geride."""
    s = SALLANMA * math.sin(2 * math.pi * t / SALLANMA_SURE + faz - math.pi / 2)
    return s if kemik == "rightArm2" else -s


# ---------------- olcum: kutular ve carpisma (Blender'siz) ----------------
def _kutular(model, kemikler=None):
    """{kemik: [(c0, ex, ey, ez)]} -- kupun model uzayinda (ic) bir kosesi
    ve uc kenar vektoru, pozla (kupler() ile ayni zincir)."""
    out = {}
    for ad, b in model.kemik.items():
        if kemikler is not None and ad not in kemikler:
            continue
        for c in b.get("cubes", []):
            o, s = c["origin"], c["size"]
            sis = c.get("inflate", 0)
            mn = [-(o[0] + s[0]) - sis, o[1] - sis, o[2] - sis]
            mx = [-o[0] + sis, o[1] + s[1] + sis, o[2] + s[2] + sis]
            Rk = B.bb_mat(c["rotation"]) if "rotation" in c else None
            pk = B.ic(c.get("pivot", b["pivot"])) if Rk is not None else None

            def nk(k, mn=mn, mx=mx, Rk=Rk, pk=pk, ad=ad):
                p = [mx[i] if k[i] else mn[i] for i in range(3)]
                if Rk is not None:
                    p = [a + cc for a, cc in zip(B.mv(Rk, [p[i] - pk[i] for i in range(3)]), pk)]
                return model.nokta(ad, p)
            c0 = nk((0, 0, 0))
            kenar = [[q - r for q, r in zip(nk(k), c0)] for k in ((1, 0, 0), (0, 1, 0), (0, 0, 1))]
            out.setdefault(ad, []).append((c0, kenar[0], kenar[1], kenar[2]))
    return out


def _icinde(p, kutu, pay=1e-6):
    c0, ex, ey, ez = kutu
    d = [p[i] - c0[i] for i in range(3)]
    for e in (ex, ey, ez):
        n2 = sum(x * x for x in e)
        u = sum(d[i] * e[i] for i in range(3)) / n2
        if u <= pay or u >= 1 - pay:
            return False
    return True


def poz_modeli(geo, poz):
    """poz: {kemik: [x, y, z] derece} -> B.Model (sabit animasyon)."""
    return B.Model(geo, {"bones": {k: {"rotation": list(v)} for k, v in poz.items()}}, 0.0)


HEDEFLER = ("rightArm", "leftArm", "head", "rightLeg", "leftLeg")


def carpisma(geo, poz=None, adim=0.5, kemikler=("rightArm2", "leftArm2"), hedefler=HEDEFLER):
    """Ek kollarin hedef kutularin ICINE giren hacmi (px^3), kemik basina.
    Ek kolun ust ucu govdeye dayanir -- govde bilerek sayilmaz; kilif
    (inflate) katmanlari da sayilmaz, kol kutusu yeter. Obur ek kol hedef
    olarak verilebilir ("leftArm2")."""
    m = poz_modeli(geo, poz or {})
    kut = _kutular(m)
    sonuc = {}
    for ad in kemikler:
        top = 0.0
        hed = [k for h in hedefler if h != ad for k in kut.get(h, [])]
        for kutu in kut.get(ad, []):
            c0, ex, ey, ez = kutu
            boy = [math.sqrt(sum(x * x for x in e)) for e in (ex, ey, ez)]
            n = [max(1, int(round(b / adim))) for b in boy]
            hac = boy[0] * boy[1] * boy[2] / (n[0] * n[1] * n[2])
            for i in range(n[0]):
                for j in range(n[1]):
                    for kk in range(n[2]):
                        u, v, w = (i + 0.5) / n[0], (j + 0.5) / n[1], (kk + 0.5) / n[2]
                        p = [c0[q] + u * ex[q] + v * ey[q] + w * ez[q] for q in range(3)]
                        if any(_icinde(p, h) for h in hed):
                            top += hac
        sonuc[ad] = round(top, 3)
    return sonuc


def yuruyus_pozlari():
    """Olcumde kullanilan uc pozlar: blender_film'in yuruyus formulunun
    uclari (kol 30, bacak 40 derece, iki yon) + sallanma uclari."""
    out = [{}]
    for a in (30, -30, 15, -15):
        for s in (SALLANMA, -SALLANMA, 0.0):
            out.append({"rightArm": [a, 0, 0], "leftArm": [-a, 0, 0],
                        "rightLeg": [-a * 4 / 3, 0, 0], "leftLeg": [a * 4 / 3, 0, 0],
                        "rightArm2": [0, 0, s], "leftArm2": [0, 0, -s]})
    return out


def el_noktasi(geo, kemik, poz=None):
    """Kol kutusunun alt yuzunun ortasi (yumruk), model uzayinda (ic)."""
    m = poz_modeli(geo, poz or {})
    c0, ex, ey, ez = _kutular(m, {kemik})[kemik][0]
    return [c0[q] + 0.5 * ex[q] + 0.5 * ez[q] for q in range(3)]
