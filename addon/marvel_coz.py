#!/usr/bin/env python3
"""Marvel Project Addon -> depo kaynagi.                    (v5.2)

Kullanici: "bu sefer ugrasmana gerek kalmayacak cunku bedrock
uzerine kurulu. Eski kahramanlari tamamen atiyoruz, Fisk modunu
bos veriyoruz. Onun yerine bunu ekle, bunun tum kahramanlarini."

HAKLIYDI: mod zaten Bedrock. Ne bytecode var ne Java modeli.
Geometri, doku ve ikon DOGRUDAN kullanilabiliyor -- bu betik
yalniz SECIYOR ve KOPYALIYOR, hicbir sey yeniden cizmiyor.

Kullanim:
    python3 marvel_coz.py <acilmis_mcaddon_klasoru>
        (icinde bp/ ve rp/ olmali)

Uretilenler:
    kaynak_geo/marvel/*.geo.json     secilen geometriler
    kaynak_doku/marvel/*.png         kostum dokulari ve ikonlar
    marvel_tablo.py                  kol_uret.py'nin okudugu tablo

---- NEDEN AYRI BIR BETIK ----
kol_uret.py'ye koymadim: o dosya HER uretimde calisiyor ve
modun kendisi depoda degil. Cikarma BIR KEZ yapilir, sonucu
depoya girer; uretim ondan sonra moda hic bakmaz.
(kaynak_doku/kahraman_coz.py ile ayni gerekce.)

---- NE ALINIYOR ----
Yalniz `suit` ve `mask` etiketli GIYILEBILIR esyalar. Silahlar,
makineler, bloklar, NPC'ler, arac ve efsane esyalari ALINMIYOR.

---- NE ALINAMIYOR (gizlenmedi) ----
Modun attachable'lari kendi varlik ozelliklerine bakiyor
(`q.property('arathnido:SuitTexture0')` gibi) ve bir kostumun
alti dokusu arasinda gecis yapiyor. O ozellikler bizim pakette
yok; render controller'lar `controller.render.armor`a
cevriliyor ve VARSAYILAN doku aliniyor. Kostum dogru gorunuyor,
yalnizca doku VARYANTLARI gelmiyor.
"""
import json
import os
import re
import shutil
import sys

KOK = os.path.dirname(os.path.abspath(__file__))
GEO_HEDEF = os.path.join(KOK, "kaynak_geo", "marvel")
DOKU_HEDEF = os.path.join(KOK, "kaynak_doku", "marvel")
TABLO = os.path.join(KOK, "marvel_tablo.py")

# Klasor adi HER ZAMAN kahramani vermiyor: "NEWS" alti kahramanin
# ortak cop kutusu. Kisa esya adindan cozuluyor -- ad tahmin
# degil, esyanin kendi kimliginden.
NEWS_COZUM = [
    ("iron_fist", "iron_fist"), ("luke_cage", "luke_cage"),
    ("squirrel_girl", "squirrel_girl"), ("mantis", "mantis"),
    ("starlord", "starlord"), ("guardians", "guardians"),
]


def kahraman_bul(klasor, anahtar):
    # Guc esyasinin adi kahramani DOGRUDAN veriyor:
    # "<kahraman>_powers". Klasore guvenmekten daha saglam --
    # mzaddon/caaddon gibi paketler kahramanlari karistirmis.
    if anahtar.endswith("_powers"):
        return anahtar[:-len("_powers")]
    if klasor != "NEWS":
        return klasor
    for onek, ad in NEWS_COZUM:
        if anahtar.startswith(onek):
            return ad
    return "guardians"


def dosya_bul(rp, yol):
    for uz in (".png", ".tga"):
        p = os.path.join(rp, yol + uz)
        if os.path.exists(p):
            return p
    return None


def coz(kaynak):
    bp = os.path.join(kaynak, "bp")
    rp = os.path.join(kaynak, "rp")
    if not os.path.isdir(bp) or not os.path.isdir(rp):
        sys.exit("bp/ ve rp/ bulunamadi: " + kaynak)

    # ---- dil ----
    adlar = {}
    for satir in open(os.path.join(rp, "texts", "en_US.lang"),
                      encoding="utf-8", errors="replace"):
        m = re.match(r"item\.([^=]+)=(.*)", satir.strip())
        if m:
            adlar[m.group(1)] = m.group(2).strip()

    # ---- ikon atlasi ----
    ikonlar = {}
    ia = os.path.join(rp, "textures", "item_texture.json")
    if os.path.exists(ia):
        for k, v in json.load(open(ia, encoding="utf-8")).get(
                "texture_data", {}).items():
            t = v.get("textures")
            ikonlar[k] = t[0] if isinstance(t, list) else t

    # ---- attachable kimlik -> geometri/doku ----
    att = {}
    for kokd, _, dosyalar in os.walk(os.path.join(rp, "attachables")):
        for f in dosyalar:
            if not f.endswith(".json"):
                continue
            try:
                d = json.load(open(os.path.join(kokd, f), encoding="utf-8"))
            except Exception:
                continue
            a = d.get("minecraft:attachable", {}).get("description", {})
            kimlik = a.get("identifier", "")
            hedefler = {kimlik[:-7] if kimlik.endswith(".player") else kimlik}
            for k, v in (a.get("item") or {}).items():
                if "player" in str(v):
                    hedefler.add(k)
            for hd in hedefler:
                onceki = att.get(hd, {})
                geo = a.get("geometry") or {}
                dok = a.get("textures") or {}
                # `default` yoksa ILK adlandirilmis varyant aliniyor;
                # hangisi oldugu tabloya yaziliyor (F4 gibi coklu
                # kostumlerde reed/sue/johnny ayri ayri duruyor).
                onceki.setdefault("geo", geo)
                onceki.setdefault("doku", dok)
                att[hd] = onceki

    # ---- geometri kimlik -> (dosya, govde) ----
    geoKayit = {}
    for kokd, _, dosyalar in os.walk(os.path.join(rp, "models")):
        for f in dosyalar:
            if not f.endswith(".json"):
                continue
            y = os.path.join(kokd, f)
            try:
                d = json.load(open(y, encoding="utf-8"))
            except Exception:
                continue
            for g in d.get("minecraft:geometry", []) or []:
                geoKayit[g["description"]["identifier"]] = g

    # ---- giyilebilir esyalar ----
    parcalar = []
    for kokd, _, dosyalar in os.walk(os.path.join(bp, "items")):
        for f in dosyalar:
            if not f.endswith(".json"):
                continue
            y = os.path.join(kokd, f)
            try:
                d = json.load(open(y, encoding="utf-8"))
            except Exception:
                continue
            it = d.get("minecraft:item")
            if not it:
                continue
            c = it.get("components", {})
            w = c.get("minecraft:wearable")
            if not w:
                continue
            etiket = (c.get("minecraft:tags") or {}).get("tags", [])
            kid0 = it["description"]["identifier"]
            # GUC esyalari: modun kendi kalibi -- kahraman basina
            # bir tane, bacak yuvasinda, adi "<kahraman>_powers".
            # Gorunusu yok (ikon disinda); tasidigi sey YETENEK.
            guc = kid0.endswith("_powers")
            tur = ("guc" if guc
                   else "kostum" if "suit" in etiket
                   else "maske" if "mask" in etiket else None)
            if tur is None:
                continue
            kid = it["description"]["identifier"]
            anahtar = kid.split(":")[-1]
            klasor = os.path.relpath(y, os.path.join(bp, "items")).split(os.sep)[0]
            parcalar.append({
                "anahtar": anahtar,
                "kimlik": kid,
                "tur": tur,
                "kahraman": kahraman_bul(klasor, anahtar),
                "ad": adlar.get(kid, anahtar),
                "yuva": w.get("slot"),
                "koruma": w.get("protection") or 0,
                "dayaniklilik": (c.get("minecraft:durability") or {}).get(
                    "max_durability"),
                "ikon": (c.get("minecraft:icon") or {}).get("texture"),
                "etiket": etiket,
            })

    os.makedirs(GEO_HEDEF, exist_ok=True)
    os.makedirs(DOKU_HEDEF, exist_ok=True)

    cikti = []
    yazilanGeo = set()
    atlanan = []
    for p in sorted(parcalar, key=lambda x: (x["kahraman"], x["tur"], x["anahtar"])):
        if p["tur"] == "guc":
            # Guc esyasinin GORUNUSU yok: bacak yuvasinda duruyor,
            # oyuncuya bir sey cizmiyor. Yalniz ikonu aliniyor.
            ik = ikonlar.get(p["ikon"])
            ikaynak = dosya_bul(rp, ik) if ik else None
            if ikaynak:
                shutil.copyfile(ikaynak, os.path.join(
                    DOKU_HEDEF, "ikon_" + p["anahtar"] + ".png"))
            else:
                atlanan.append((p["anahtar"], "ikon yok: %s" % p["ikon"]))
            cikti.append({
                "anahtar": p["anahtar"], "kimlik": p["kimlik"], "tur": "guc",
                "kahraman": p["kahraman"], "ad": p["ad"], "yuva": p["yuva"],
                "koruma": p["koruma"], "dayaniklilik": p["dayaniklilik"],
                "geo": None, "ikon": bool(ikaynak), "etiket": p["etiket"],
            })
            continue
        a = att.get(p["kimlik"])
        if not a:
            atlanan.append((p["anahtar"], "attachable yok"))
            continue
        geoHar, dokHar = a["geo"], a["doku"]

        # Varyantlar: `default` varsa tek parca; yoksa adlandirilmis
        # her varyant AYRI bir kostum oluyor (F4'te reed/sue/johnny).
        if "default" in geoHar and "default" in dokHar:
            varyantlar = [(None, geoHar["default"], dokHar["default"])]
        else:
            ortak = [k for k in geoHar
                     if k in dokHar and k not in ("armor_skin", "enchanted")]
            varyantlar = [(k, geoHar[k], dokHar[k]) for k in ortak]
            if not varyantlar:
                atlanan.append((p["anahtar"], "geometri/doku eslesmedi"))
                continue

        for vad, gkimlik, dyol in varyantlar:
            anahtar = p["anahtar"] if vad is None else p["anahtar"] + "_" + vad
            if gkimlik not in geoKayit:
                atlanan.append((anahtar, "geometri yok: %s" % gkimlik))
                continue
            dkaynak = dosya_bul(rp, dyol)
            if not dkaynak:
                atlanan.append((anahtar, "doku yok: %s" % dyol))
                continue

            # ---- geometri ----
            yeniGeo = "geometry.mrv_" + gkimlik.replace("geometry.", "")
            gdosya = yeniGeo.replace("geometry.", "") + ".geo.json"
            if gdosya not in yazilanGeo:
                govde = json.loads(json.dumps(geoKayit[gkimlik]))
                govde["description"]["identifier"] = yeniGeo
                json.dump({"format_version": "1.12.0",
                           "minecraft:geometry": [govde]},
                          open(os.path.join(GEO_HEDEF, gdosya), "w",
                               encoding="utf-8"), indent=1)
                yazilanGeo.add(gdosya)

            # ---- doku ----
            shutil.copyfile(dkaynak,
                            os.path.join(DOKU_HEDEF, anahtar + ".png"))

            # ---- ikon ----
            ik = ikonlar.get(p["ikon"])
            ikaynak = dosya_bul(rp, ik) if ik else None
            if ikaynak:
                shutil.copyfile(ikaynak,
                                os.path.join(DOKU_HEDEF, "ikon_" + anahtar + ".png"))
            else:
                atlanan.append((anahtar, "ikon yok: %s" % p["ikon"]))

            ad = p["ad"] if vad is None else p["ad"] + " (" + vad.title() + ")"
            cikti.append({
                "anahtar": anahtar, "kimlik": p["kimlik"], "tur": p["tur"],
                "kahraman": p["kahraman"], "ad": ad, "yuva": p["yuva"],
                "koruma": p["koruma"], "dayaniklilik": p["dayaniklilik"],
                "geo": gdosya[:-len(".geo.json")], "ikon": bool(ikaynak),
                "etiket": [e for e in p["etiket"] if e not in ("suit", "mask")],
            })

    return cikti, atlanan


def tablo_yaz(cikti, atlanan):
    with open(TABLO, "w", encoding="utf-8") as f:
        f.write('"""Marvel Project kostum ve maske tablosu.       (v5.2)\n\n'
                "BU DOSYA ELLE YAZILMADI: marvel_coz.py modun kendi\n"
                "paketinden cikardi. Degistirmek gerekirse betigi\n"
                "yeniden calistir, buraya elle dokunma.\n\n"
                "Alanlar:\n"
                "  anahtar      bizim kisa adimiz (pa:mrv_<anahtar>)\n"
                "  kimlik       modun kendi esya kimligi\n"
                "  tur          kostum | maske\n"
                "  kahraman     hangi kahraman (guc kumesi bununla secilir)\n"
                "  ad           modun kendi ingilizce adi\n"
                "  yuva/koruma  modun kendi degerleri\n"
                "  geo          kaynak_geo/marvel/<geo>.geo.json\n"
                '  etiket       modun guc etiketleri\n"""\n\n')
        f.write("MARVEL_PARCA = [\n")
        for c in cikti:
            # json.dumps DEGIL repr: JSON'un true/null'u Python'da
            # yok, dosya import edilemiyordu.
            f.write("    %r,\n" % (c,))
        f.write("]\n\n")
        f.write("# Cikarma sirasinda ATLANANLAR -- gizlenmedi.\n")
        f.write("MARVEL_ATLANAN = [\n")
        for a in atlanan:
            f.write("    %r,\n" % (list(a),))
        f.write("]\n")


if __name__ == "__main__":
    kaynak = sys.argv[1] if len(sys.argv) > 1 else "."
    c, a = coz(kaynak)
    tablo_yaz(c, a)
    kostum = sum(1 for x in c if x["tur"] == "kostum")
    maske = sum(1 for x in c if x["tur"] == "maske")
    kahramanlar = sorted({x["kahraman"] for x in c})
    print("kostum: %d   maske: %d   kahraman: %d" % (kostum, maske, len(kahramanlar)))
    print("kahramanlar:", ", ".join(kahramanlar))
    print("atlanan:", len(a))
    for x in a:
        print("   ", x)
