#!/usr/bin/env python3
"""Java 1.12 ModelBase sinifindan Bedrock geometrisi cikarir.  (v4.88)

Referans modlarin varlik modelleri derlenmis sinifin KURUCUSUNDA
gomulu duruyor. Bu betik `javap -c -p` ciktisini okuyup kemikleri,
kutulari, uv'leri ve donuslerı BYTECODE'dan cozuyor -- yani model
elle olculmuyor, hafizadan yazilmiyor.

Kullanici kurali: "hafizandan yaparsan belki yanlis cikabilir,
bunu daha onceden yasadik."

Kullanim (v7.94.3'te genisletildi -- eski bicim CALISMAYA DEVAM EDIYOR):

    python3 jar_model_coz.py mod.jar --liste           ModelBase siniflarini listeler
    python3 jar_model_coz.py mod.jar <SinifAdi>        dogrudan cozer
    python3 jar_model_coz.py mod.jar <SinifAdi> --geo <kimlik> > x.geo.json
    python3 jar_model_coz.py model.txt                 ESKI YOL, elle javap ciktisi

v7.94.3 ONCESI SINIRI: betik kurucuyu "Modelthatthingturkishmcl();"
diye SABIT BIR ADLA ariyordu, yani yalnizca o tek sinifi cozebiliyordu.
Baska bir model verildiginde `bas` None kaliyor ve betik istisna
atiyordu. Artik kurucu sinif adindan turetiliyor ve govde bir sonraki
metot bildirimine kadar okunuyor -- hangi sinif olursa olsun.

NarutoMod 1.12.2 uzerinde denendi: 223 ModelBase sinifi.

Cozulen cagrilar:
    func_78793_a(FFF)             setRotationPoint(x, y, z)
    ModelBox.<init>(...IIFFFIIIFZ) addBox(u, v, x, y, z, w, h, d, olcek, ayna)
    func_78792_a                  addChild
    setRotationAngle(...FFF)      kemik acisi (radyan)

JAVA -> BEDROCK (olculdu, bkz. NOTLAR.md v4.88):
    konum : x ayni · z ayni · uv ayni · y = 24 - y
    donme : bedrock_dosya = [-rx_java, +ry_java, +rz_java]

KUTU KOSESI icin tam formul (v7.94.3'te eklendi):
    pivot_bedrock  = [ px,            24 - py,                pz            ]
    origin_bedrock = [ px + jx,       24 - (py + jy + h),     pz + jz       ]
burada (px,py,pz) Java setRotationPoint, (jx,jy,jz,w,h,d) Java addBox.
Java'da +Y ASAGI, Bedrock'ta +Y YUKARI; kutunun ALT kosesi bu yuzden
(py+jy+h) uzerinden hesaplaniyor.

Bu formul TAHMIN EDILMEDI, deponun kendi olculmus verisine karsi
dogrulandi. kol_uret.py'deki zirh geometrileri vanilla biped
olculerinden alinmisti; ucu de birebir yeniden uretiliyor:
    head      java pivot(0,0,0)     addBox(-4,-8,-4, 8,8,8)
              -> pivot [0,24,0]     origin [-4,24,-4]
    body      java pivot(0,0,0)     addBox(-4,0,-2, 8,12,4)
              -> pivot [0,24,0]     origin [-4,12,-2]
    rightLeg  java pivot(-1.9,12,0) addBox(-2,0,-2, 4,12,4)
              -> pivot [-1.9,12,0]  origin [-3.9,0,-2]
Bu uc durum `test/model_cevrim.mjs` ile kilitlendi.
"""
import re, sys, json, os

import shutil, subprocess, tempfile, zipfile

ARG = sys.argv[1:]
GEO_KIMLIK = None
if "--geo" in ARG:
    i = ARG.index("--geo")
    GEO_KIMLIK = ARG[i + 1] if len(ARG) > i + 1 else "geometry.cozulen"
    del ARG[i:i + 2]


# ---- JAVA -> BEDROCK CEVRIMI  (tek yer) ----------------------------
# Hem --geo cikisi hem --kendini-sina ayni iki fonksiyonu kullaniyor.
# Ayri iki kopya olsaydi biri duzeltilip oteki unutulabilirdi.
def cevir_pivot(ap):
    """Mutlak Java pivotu -> Bedrock pivotu."""
    return [ap[0], 24 - ap[1], ap[2]]


def cevir_origin(ap, jx, jy, jz, h):
    """Mutlak Java pivotu + Java addBox kosesi -> Bedrock origin.

       Java'da +Y ASAGI, Bedrock'ta +Y YUKARI. Kutunun Bedrock'taki
       ALT kosesi bu yuzden (py + jy + h) uzerinden hesaplaniyor.  """
    return [ap[0] + jx, 24 - (ap[1] + jy + h), ap[2] + jz]


# Olculmus capa: kol_uret.py'deki zirh geometrileri vanilla biped
# olculerinden alinmisti. Cevrim onlari birebir yeniden uretmeli.
# (java_pivot, java_addBox(x,y,z,w,h,d), beklenen bedrock pivot, origin)
CEVRIM_CAPALARI = [
    ("head",     [0.0, 0.0, 0.0],     (-4, -8, -4, 8, 8, 8),
     [0.0, 24.0, 0.0],  [-4.0, 24.0, -4.0]),
    ("body",     [0.0, 0.0, 0.0],     (-4, 0, -2, 8, 12, 4),
     [0.0, 24.0, 0.0],  [-4.0, 12.0, -2.0]),
    ("rightLeg", [-1.9, 12.0, 0.0],   (-2, 0, -2, 4, 12, 4),
     [-1.9, 12.0, 0.0], [-3.9, 0.0, -2.0]),
]


def kendini_sina():
    kalan = 0
    print("=== JAVA -> BEDROCK CEVRIM CAPALARI ===")
    print("(beklenen degerler kol_uret.py'deki olculmus zirh geometrilerinden)")
    for ad, ap, kutu, bek_p, bek_o in CEVRIM_CAPALARI:
        jx, jy, jz, w, h, d = kutu
        p = cevir_pivot(ap)
        o = cevir_origin(ap, jx, jy, jz, h)
        p_ok, o_ok = p == bek_p, o == bek_o
        if not (p_ok and o_ok):
            kalan += 1
        print("  %s %-9s pivot %-16s origin %s"
              % ("✓" if p_ok and o_ok else "✗", ad, p, o))
        if not p_ok:
            print("      pivot BEKLENEN %s" % (bek_p,))
        if not o_ok:
            print("      origin BEKLENEN %s" % (bek_o,))
    print("HATA : %d" % kalan)
    return 1 if kalan else 0


if "--kendini-sina" in ARG:
    sys.exit(kendini_sina())


def _javap(jar, sinif):
    """JAR'i gecici bir klasore acip sinifi cozer."""
    gecici = tempfile.mkdtemp(prefix="jarmodel_")
    try:
        with zipfile.ZipFile(jar) as z:
            z.extractall(gecici)
        r = subprocess.run(["javap", "-c", "-p", "-classpath", gecici, sinif],
                           capture_output=True, text=True)
        if not r.stdout.strip():
            sys.exit("javap bos dondu: %s\n%s" % (sinif, r.stderr.strip()[:400]))
        return r.stdout
    finally:
        shutil.rmtree(gecici, ignore_errors=True)


def _modelleri_listele(jar):
    """JAR icindeki ModelBase turevi siniflari bulur."""
    with zipfile.ZipFile(jar) as z:
        adlar = [a for a in z.namelist() if a.endswith(".class")]
        bulunan = []
        for a in adlar:
            try:
                ham = z.read(a)
            except Exception:
                continue
            if b"client/model/ModelBase" in ham:
                bulunan.append(a[:-6].replace("/", "."))
    return sorted(bulunan)


if ARG and ARG[0].endswith(".jar"):
    JAR = ARG[0]
    if len(ARG) < 2:
        sys.exit("Kullanim: jar_model_coz.py <jar> (--liste | <SinifAdi>)")
    if ARG[1] == "--liste":
        for a in _modelleri_listele(JAR):
            print(a)
        sys.exit(0)
    SINIF = ARG[1]
    ham_cikti = _javap(JAR, SINIF)
    YOL = os.path.join(tempfile.gettempdir(), SINIF.split(".")[-1] + ".txt")
    with open(YOL, "w", encoding="utf-8") as f:
        f.write(ham_cikti)
else:
    YOL = ARG[0] if ARG else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "model.txt")
    ham_cikti = open(YOL, encoding="utf-8", errors="replace").read()

satirlar = ham_cikti.split("\n")

# ---- KURUCU GOVDESINI BUL  (v7.94.3: artik sabit ad yok) --------
# Eskiden kurucu "Modelthatthingturkishmcl();" diye SABIT bir adla
# araniyordu; yalniz o tek sinif cozulebiliyordu. Artik sinif adi
# bildirimden okunuyor ve kurucu ondan turetiliyor. Govde de
# "setRotationAngles" yerine BIR SONRAKI METOT BILDIRIMINE kadar
# aliniyor -- metot adlari surume gore degisiyor (bu modda
# `setRotationAngle`, tekil).
_sinif_adi = None
for s in satirlar:
    m = re.match(r"^(?:public |final |abstract )*class ([\w.$]+)", s)
    if m:
        _sinif_adi = m.group(1)
        break
if _sinif_adi is None:
    sys.exit("Sinif bildirimi bulunamadi: %s" % YOL)

bas = None
son = len(satirlar)
for i, s in enumerate(satirlar):
    if bas is None:
        # Kurucu: "  public <tam.sinif.adi>(" -- argumanli da olabilir
        # (ic sinif kurucusu dis ornegi aliyor).
        if re.match(r"^  (?:public|protected|private)?\s*%s\("
                    % re.escape(_sinif_adi), s):
            bas = i
    elif re.match(r"^  (?:public|protected|private)\s", s):
        son = i
        break
if bas is None:
    sys.exit("Kurucu bulunamadi: %s" % _sinif_adi)
govde = satirlar[bas:son]

SAYI = re.compile(r"^\s*\d+:\s+(\S+)(.*)$")

yigin = []      # itilen sabitler (sayi)
son_alan = None # en son getfield ile alinan kemik adi
kemikler = {}   # ad -> {"pivot":..., "cubes":[...], "rot":..., "parent":...}
sira = []

def kemik(ad):
    if ad not in kemikler:
        kemikler[ad] = {"pivot": None, "cubes": [], "rot": None, "parent": None}
        sira.append(ad)
    return kemikler[ad]

alan_yigini = []   # getfield ile yuklenen kemik adlari (sirali)
atlanan_kutu = []  # yigini eksik kaldigi icin cozulemeyen kutular

for s in govde:
    m = SAYI.match(s)
    if not m:
        continue
    op = m.group(1); kalan = m.group(2) or ""; yorum = kalan.split("//",1)[1].strip() if "//" in kalan else ""

    # ---- sabit itmeleri ----
    if op in ("fconst_0",): yigin.append(0.0); continue
    if op in ("fconst_1",): yigin.append(1.0); continue
    if op in ("fconst_2",): yigin.append(2.0); continue
    if op.startswith("iconst_"):
        yigin.append(int(op.split("_")[1].replace("m1", "-1"))); continue
    if op in ("bipush", "sipush"):
        yigin.append(int(re.search(r"(-?\d+)\s*$", s.split("//")[0]).group(1))); continue
    if op == "ldc" or op == "ldc_w":
        mm = re.search(r"(?:float|int|double)\s+(-?[\d.]+)", yorum)
        if mm:
            yigin.append(float(mm.group(1)))
        continue

    # ---- alan erisimi ----
    if op == "getfield":
        mm = re.search(r"Field (\w+):Lnet/minecraft/client/model/ModelRenderer;", yorum)
        if mm:
            alan_yigini.append(mm.group(1))
        continue
    if op == "putfield":
        mm = re.search(r"Field (\w+):Lnet/minecraft/client/model/ModelRenderer;", yorum)
        if mm:
            kemik(mm.group(1))
        continue

    # ---- cagrilar ----
    if op in ("invokevirtual", "invokespecial", "invokeinterface"):
        if "func_78793_a:(FFF)V" in yorum:            # setRotationPoint
            if len(yigin) < 3 or not alan_yigini:
                yigin = []; alan_yigini = []; continue
            x, y, z = yigin[-3:]
            kemik(alan_yigini[-1])["pivot"] = [x, y, z]
            yigin = []; alan_yigini = []
        elif 'ModelBox."<init>"' in yorum:            # addBox
            # (renderer, u, v, x, y, z, w, h, d, scale, mirror)
            #
            # v7.94.3: EKSIK YIGIN ARTIK COKERTMIYOR. Bu ayristirici
            # yalniz SABIT itmelerini sayiyor; argumanlardan biri
            # hesaplanmissa (fneg, fmul, getstatic...) yigina 10 deger
            # birikmiyordu ve `unpack` istisna atip MODELIN TAMAMINI
            # yakiyordu. NarutoMod'un 223 modelinin 43'u tam bu yuzden
            # hic cozulemiyordu. Artik yalniz O KUTU atlaniyor, geri
            # kalan model cikiyor ve atlanan sayisi raporlaniyor --
            # eksik model, hic model olmamasindan iyi. Sessiz de degil.
            if len(yigin) < 10 or not alan_yigini:
                atlanan_kutu.append(len(yigin))
                yigin = []; alan_yigini = []
                continue
            u, v, x, y, z, w, h, d, olcek, ayna = yigin[-10:]
            hedef = alan_yigini[-1]                   # ModelBox'in ilk argumani
            kemik(hedef)["cubes"].append(dict(
                uv=[int(u), int(v)], org=[x, y, z],
                boyut=[int(w), int(h), int(d)],
                sisir=olcek, ayna=bool(ayna)))
            yigin = []; alan_yigini = []
        elif "func_78792_a:(Lnet/minecraft/client/model/ModelRenderer;)V" in yorum:
            if len(alan_yigini) < 2:
                yigin = []; alan_yigini = []; continue
            ebeveyn, cocuk = alan_yigini[-2], alan_yigini[-1]
            kemik(cocuk)["parent"] = ebeveyn
            yigin = []; alan_yigini = []
        elif "setRotationAngle:" in yorum:
            if len(yigin) < 3 or not alan_yigini:
                yigin = []; alan_yigini = []; continue
            rx, ry, rz = yigin[-3:]
            kemik(alan_yigini[-1])["rot"] = [rx, ry, rz]
            yigin = []; alan_yigini = []
        else:
            yigin = []; alan_yigini = []
        continue

    if op in ("aload_0", "dup", "pop", "new", "return"):
        continue

import math

# --geo verildiginde stdout SADECE JSON olmali: insan tablosu
# stderr'e gidiyor. Ilk yazilista ikisi de stdout'a basiliyordu ve
# uretilen dosya gecersiz JSON oluyordu (basinda tablo duruyordu).
_yaz = (lambda x: sys.stderr.write(x + "\n")) if GEO_KIMLIK else print

_yaz("%-16s %-6s %-22s %-24s %-10s %-8s %s" %
     ("KEMIK", "ebev.", "pivot(java)", "kutu org + boyut", "uv", "sisir", "rot(derece)"))
for ad in sira:
    k = kemikler[ad]
    rot = k["rot"]
    rotd = [round(math.degrees(a), 2) for a in rot] if rot else None
    if not k["cubes"]:
        _yaz("%-16s %-6s %-22s %-24s %-10s %-8s %s" %
             (ad, k["parent"] or "-", k["pivot"], "-", "-", "-", rotd))
    for c in k["cubes"]:
        _yaz("%-16s %-6s %-22s %-24s %-10s %-8s %s" %
             (ad, k["parent"] or "-", k["pivot"],
              "%s + %s" % (c["org"], c["boyut"]), c["uv"], c["sisir"], rotd))

json.dump({"sira": sira, "kemikler": kemikler},
          open(os.path.splitext(YOL)[0] + ".json", "w"), indent=1)


# ---- BEDROCK .geo.json CIKISI  (v7.94.3) ---------------------------
# Eskiden bu betik tabloyu basip birakiyordu; Java -> Bedrock cevirisi
# dosyanin BASINDA yaziliydi ama UYGULANMIYORDU, yani her model icin
# elle yapiliyordu. Artik uygulaniyor.
#
# ---- ALT KEMIK PIVOTLARI EBEVEYNE GORELI ----
# Java'da ModelRenderer.render() once kendi rotationPoint'i kadar
# oteliyor, sonra cocuklarini ciziyor; cocuk da kendi noktasi kadar
# otleniyor. Yani cocugun noktasi ebeveyninkinin USTUNE biniyor.
# Bedrock'ta ise kemik pivotlari MUTLAK. Bu yuzden asagida zincir
# boyunca toplaniyor.
#
# Bunun dogrulugu su sayilarla desteklendi (EntityEarthGolem):
#   ironGolemRightArm pivot (-8, -10, 0), cocugu right_arm (0, 1, 0)
# right_arm mutlak sayilsaydi kolun ucu oyuncunun ayagi hizasinda
# olurdu; goreli sayilinca (-8, -9, 0) cikiyor ve govdeye oturuyor.
# ONEMLI: bu adim, kutu formulunun aksine, olculmus depo verisine
# karsi DOGRULANAMADI -- dayanagi Java'nin cizim sirasi ve yukaridaki
# buyukluk kontrolu. Yeni bir model tasinirken oyunda GOZLE bakilsin.
def _mutlak_pivot(ad, onbellek={}):
    if ad in onbellek:
        return onbellek[ad]
    k = kemikler.get(ad)
    if k is None:                    # adi gecen ama hic tanimlanmamis kemik
        return [0.0, 0.0, 0.0]
    p = k["pivot"] or [0.0, 0.0, 0.0]
    if k["parent"]:
        up = _mutlak_pivot(k["parent"])
        p = [p[0] + up[0], p[1] + up[1], p[2] + up[2]]
    onbellek[ad] = p
    return p


def _yuvarla(v):
    return [round(x, 4) + 0.0 for x in v]


if GEO_KIMLIK:
    kemik_listesi = []
    for ad in sira:
        k = kemikler[ad]
        ap = _mutlak_pivot(ad)
        girdi = {"name": ad, "pivot": _yuvarla(cevir_pivot(ap))}
        if k["parent"]:
            girdi["parent"] = k["parent"]
        if k["rot"]:
            rx, ry, rz = [math.degrees(a) for a in k["rot"]]
            girdi["rotation"] = _yuvarla([-rx, ry, rz])
        kutular = []
        for c in k["cubes"]:
            jx, jy, jz = c["org"]
            w, h, d = c["boyut"]
            kutu = {
                "origin": _yuvarla(cevir_origin(ap, jx, jy, jz, h)),
                "size": [w, h, d],
                "uv": [int(c["uv"][0]), int(c["uv"][1])],
            }
            if c["sisir"]:
                kutu["inflate"] = round(c["sisir"], 4)
            if c["ayna"]:
                kutu["mirror"] = True
            kutular.append(kutu)
        if kutular:
            girdi["cubes"] = kutular
        kemik_listesi.append(girdi)

    geo = {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": GEO_KIMLIK,
                # Doku olcusu sinifta YAZMIYOR (Java'da render sirasinda
                # ayri veriliyor). 64x64 varsayiliyor; yanlissa uv'ler
                # kayar, dosyada elle duzeltilir.
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 4,
                "visible_bounds_height": 4,
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": kemik_listesi,
        }],
    }
    sys.stderr.write("geo yazildi: %d kemik, %d kutu\n"
                     % (len(kemik_listesi),
                        sum(len(b.get("cubes", [])) for b in kemik_listesi)))
    sys.stderr.write("DIKKAT: texture_width/height 64x64 varsayildi.\n")
    if atlanan_kutu:
        sys.stderr.write("ATLANAN KUTU: %d (argumani sabit degil, "
                         "hesaplanmis). Model EKSIK.\n" % len(atlanan_kutu))
    print(json.dumps(geo, indent=2, ensure_ascii=False))
