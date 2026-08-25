#!/usr/bin/env python3
"""Java 1.12 ModelBase sinifindan Bedrock geometrisi cikarir.  (v4.88)

Referans modlarin varlik modelleri derlenmis sinifin KURUCUSUNDA
gomulu duruyor. Bu betik `javap -c -p` ciktisini okuyup kemikleri,
kutulari, uv'leri ve donuslerı BYTECODE'dan cozuyor -- yani model
elle olculmuyor, hafizadan yazilmiyor.

Kullanici kurali: "hafizandan yaparsan belki yanlis cikabilir,
bunu daha onceden yasadik."

Kullanim:
    unzip -o mod.jar -d /tmp/jar
    javap -c -p -classpath /tmp/jar '<Paket>$<ModelSinifi>' > model.txt
    python3 jar_model_coz.py model.txt

Cozulen cagrilar:
    func_78793_a(FFF)             setRotationPoint(x, y, z)
    ModelBox.<init>(...IIFFFIIIFZ) addBox(u, v, x, y, z, w, h, d, olcek, ayna)
    func_78792_a                  addChild
    setRotationAngle(...FFF)      kemik acisi (radyan)

JAVA -> BEDROCK (olculdu, bkz. NOTLAR.md v4.88):
    konum : x ayni · z ayni · uv ayni · y = 24 - y
    donme : bedrock_dosya = [-rx_java, +ry_java, +rz_java]
"""
import re, sys, json, os

YOL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "model.txt")

satirlar = open(YOL, encoding="utf-8", errors="replace").read().split("\n")

# Sadece kurucu (<init>) govdesini al.
bas = None
son = len(satirlar)
for i, s in enumerate(satirlar):
    if "Modelthatthingturkishmcl();" in s:
        bas = i
    elif bas is not None and re.match(r"^  public .*setRotationAngles", s):
        son = i
        break
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
            x, y, z = yigin[-3:]
            kemik(alan_yigini[-1])["pivot"] = [x, y, z]
            yigin = []; alan_yigini = []
        elif 'ModelBox."<init>"' in yorum:            # addBox
            # (renderer, u, v, x, y, z, w, h, d, scale, mirror)
            u, v, x, y, z, w, h, d, olcek, ayna = yigin[-10:]
            hedef = alan_yigini[-1]                   # ModelBox'in ilk argumani
            kemik(hedef)["cubes"].append(dict(
                uv=[int(u), int(v)], org=[x, y, z],
                boyut=[int(w), int(h), int(d)],
                sisir=olcek, ayna=bool(ayna)))
            yigin = []; alan_yigini = []
        elif "func_78792_a:(Lnet/minecraft/client/model/ModelRenderer;)V" in yorum:
            ebeveyn, cocuk = alan_yigini[-2], alan_yigini[-1]
            kemik(cocuk)["parent"] = ebeveyn
            yigin = []; alan_yigini = []
        elif "setRotationAngle:" in yorum:
            rx, ry, rz = yigin[-3:]
            kemik(alan_yigini[-1])["rot"] = [rx, ry, rz]
            yigin = []; alan_yigini = []
        else:
            yigin = []; alan_yigini = []
        continue

    if op in ("aload_0", "dup", "pop", "new", "return"):
        continue

import math
print("%-16s %-6s %-22s %-24s %-10s %-8s %s" %
      ("KEMIK", "ebev.", "pivot(java)", "kutu org + boyut", "uv", "sisir", "rot(derece)"))
for ad in sira:
    k = kemikler[ad]
    rot = k["rot"]
    rotd = [round(math.degrees(a), 2) for a in rot] if rot else None
    if not k["cubes"]:
        print("%-16s %-6s %-22s %-24s %-10s %-8s %s" %
              (ad, k["parent"] or "-", k["pivot"], "-", "-", "-", rotd))
    for c in k["cubes"]:
        print("%-16s %-6s %-22s %-24s %-10s %-8s %s" %
              (ad, k["parent"] or "-", k["pivot"],
               "%s + %s" % (c["org"], c["boyut"]), c["uv"], c["sisir"], rotd))

json.dump({"sira": sira, "kemikler": kemikler},
          open(os.path.splitext(YOL)[0] + ".json", "w"), indent=1)
