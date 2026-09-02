#!/usr/bin/env python3
"""AURA ONIZLEYICI -- uzaktan nasil gorunuyorsun.

    python3 onizle_aura.py [iksir_kimligi]      (varsayilan: element)

---- NEDEN VAR ----
Oyunu buradan calistiramiyoruz. Ama parcacik dosyasindaki
sayilar (baslangic hizi, ivme, surtunme, omur, boy egrisi,
renk gradyani) belirli bir hareketi TARIF EDIYOR ve o hareket
aynen benzetilebiliyor. Amac "guzel mi" degil OLCU:
  - zerreler kafanin etrafinda mi kaliyor, yoksa on blok
    oteye mi firliyor
  - uzaktan hala gorunuyor mu

Uc sey AYNI olcekte birlestiriliyor:
  1. Uzak Akraba skini, onden
  2. goz kaplamasi (kafanin on yuzune)
  3. aura parcaciklari, dosyadan benzetilerek

Sonra kucultuluyor. Uzaklik tam olarak budur: ekranda daha az
piksel. "AURA VAR" ve "AURA YOK" alt alta ciziliyor ki auranin
uzaktan NE KATTIGI goze gorunsun.

---- IKI OLCUM HATASI, IKISI DE BURADA YASANDI ----
1. Billboard `size` zerrenin BLOK cinsinden GENISLIGI, yaricapi
   degil. Ilk cizimde yaricap sandim, zerreler iki kat buyuk
   cikti -- plaj topu gibi duruyorlardi.
2. Ondan da onceki denemede yaricapi ayrica 3 ile carpmistim;
   hale kafadan buyuk gorunuyordu.
Ikisi de kodda degil OLCUMDEYDI. Bu depoda dorduncu kez.
"""
import json, math, os, random, sys
from PIL import Image, ImageDraw, ImageChops

RP = "Simsek_Kol_Kaynak"
SKIN = "Simsek_Skin/uzak_akraba.png"
O = 13                      # goz kaplamasinin olcegi (v7.14)
BLOK = 16 * O               # 1 blok = 16 MC pikseli = 208 alt piksel

# (kaynak_x, kaynak_y, en, boy, hedef_x, hedef_y) -- MC pikseli
IKSIR = (sys.argv[1] if len(sys.argv) > 1 else "element")
GOZ = "goz_element"          # asagida iksire gore duzeltiliyor

ON = [(8, 8, 8, 8, 4, 0), (20, 20, 8, 12, 4, 8), (44, 20, 4, 12, 0, 8),
      (36, 52, 4, 12, 12, 8), (4, 20, 4, 12, 4, 20), (20, 52, 4, 12, 8, 20)]


def goz_bul():
    """Iksirin goz kaplamasini uretecin IKSIRLER tablosundan
    buluyor -- tek kaynak orasi, elle liste tutulmuyor."""
    import re
    kaynak = open("kol_uret.py", encoding="utf-8").read()
    blok = re.search(r"IKSIRLER = \[(.*?)\n\]", kaynak, re.S).group(1)
    for m in re.finditer(r'^\s*\("(\w+)",[^\n]*?"(goz_\w+)"', blok, re.M):
        if m.group(1) == IKSIR:
            return m.group(2)
    raise SystemExit("iksir bulunamadi: " + IKSIR)


def karakter():
    """Onden 16x32 MC pikseli, O katinda."""
    skin = Image.open(SKIN).convert("RGBA")
    t = Image.new("RGBA", (16, 32), (0, 0, 0, 0))
    for (sx, sy, w, h, dx, dy) in ON:
        t.alpha_composite(skin.crop((sx, sy, sx + w, sy + h)), (dx, dy))
    b = t.resize((16 * O, 32 * O), Image.NEAREST)
    # Goz kaplamasi: kafanin on yuzu skinde (8,8)-(15,15),
    # kaplamada O katinda ayni yer. Tuvalde kafa (4,0).
    goz = Image.open(RP + "/textures/entity/goz_element.png").convert("RGBA")
    kesit = goz.crop((8 * O, 8 * O, 16 * O, 16 * O))
    b.alpha_composite(kesit, (4 * O, 0))
    return b


def molang(ifade, r, yas, omur):
    if isinstance(ifade, (int, float)):
        return float(ifade)
    s = str(ifade)
    for i in range(1, 5):
        s = s.replace("variable.particle_random_%d" % i, repr(r[i - 1]))
    s = s.replace("variable.particle_age / variable.particle_lifetime",
                  repr(yas / omur if omur else 0))
    return float(eval(s, {"__builtins__": {}}, {}))


def gradyan(g, t):
    d = sorted((float(k), v) for k, v in g.items())
    if t <= d[0][0]:
        return d[0][1]
    for (a, ca), (b, cb) in zip(d, d[1:]):
        if t <= b:
            o = (t - a) / max(1e-9, b - a)
            return [ca[i] + (cb[i] - ca[i]) * o for i in range(4)]
    return d[-1][1]


def zerreler(ad, tick_araligi, toplam_tick=90, tohum=11):
    """Oyundaki gibi SUREKLI yayim: her tick_araligi tick'te bir
    yeni yayim. Son karedeki canli zerreler donuyor."""
    c = json.load(open(RP + "/particles/%s.particle.json" % ad))["particle_effect"]["components"]
    n = int(c["minecraft:emitter_rate_instant"]["num_particles"])
    ks = c["minecraft:emitter_shape_sphere"]
    yari, yuzey = float(ks["radius"]), bool(ks.get("surface_only"))
    hiz_i = c["minecraft:particle_initial_speed"]
    omur_i = c["minecraft:particle_lifetime_expression"]["max_lifetime"]
    mot = c["minecraft:particle_motion_dynamic"]
    ivme = [float(v) for v in mot["linear_acceleration"]]
    surt = float(mot.get("linear_drag_coefficient", 0))
    bb = c["minecraft:particle_appearance_billboard"]
    grad = c["minecraft:particle_appearance_tinting"]["color"]["gradient"]

    rnd = random.Random(tohum)
    dt = 1 / 20.0
    canli = []
    for t in range(toplam_tick):
        if t % tick_araligi == 0:
            for _ in range(n):
                r = [rnd.random() for _ in range(4)]
                u, v = rnd.random(), rnd.random()
                th, ph = 2 * math.pi * u, math.acos(2 * v - 1)
                yon = (math.sin(ph) * math.cos(th), math.cos(ph),
                       math.sin(ph) * math.sin(th))
                rr = yari if yuzey else yari * rnd.random() ** (1 / 3.0)
                h = molang(hiz_i, r, 0, 1)
                canli.append({"p": [yon[0] * rr, yon[1] * rr, yon[2] * rr],
                              "v": [yon[0] * h, yon[1] * h, yon[2] * h],
                              "r": r, "yas": 0.0,
                              "omur": molang(omur_i, r, 0, 1)})
        yeni = []
        for z in canli:
            z["yas"] += dt
            if z["yas"] > z["omur"]:
                continue
            for i in range(3):
                z["v"][i] += (ivme[i] - surt * z["v"][i]) * dt
                z["p"][i] += z["v"][i] * dt
            yeni.append(z)
        canli = yeni
    return canli, bb, grad


def sahne(aura=True):
    kar = karakter()
    W, H = kar.width + 8 * O, kar.height + 10 * O
    im = Image.new("RGB", (W, H), (9, 10, 14))
    kx, ky = 4 * O, 8 * O
    taban = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    taban.alpha_composite(kar, (kx, ky))
    im = Image.alpha_composite(im.convert("RGBA"), taban).convert("RGB")
    if not aura:
        return im
    # Kafanin ORTASI: tuvalde kafa (4,0)-(11,7) MC pikseli
    hx = kx + int(8 * O)
    hy = ky + int(4 * O)
    kat = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    kd = ImageDraw.Draw(kat, "RGBA")
    for ad, aralik in (("aura_hale_" + IKSIR, 14), ("aura_kor_" + IKSIR, 6)):
        canli, bb, grad = zerreler(ad, aralik)
        for z in canli:
            o = z["yas"] / z["omur"]
            renk = gradyan(grad, o)
            boy = molang(bb["size"][0], z["r"], z["yas"], z["omur"])
            # AURA_KAFA_Y = 0.32 blok yukaridan cikiyor
            px = hx + z["p"][0] * BLOK
            py = hy - (z["p"][1] + 0.32) * BLOK
            # size = zerrenin BLOK cinsinden GENISLIGI, yaricapi
            # degil. Ilk cizimde yaricap olarak kullandim ve
            # zerreler iki kat buyuk cikti (plaj topu gibi).
            rad = max(0.6, boy * BLOK / 2.0)
            a = int(255 * max(0.0, min(1.0, renk[3])))
            kd.ellipse([px - rad, py - rad, px + rad, py + rad],
                       fill=(int(renk[0] * 255), int(renk[1] * 255),
                             int(renk[2] * 255), a))
    kat_rgb = Image.new("RGB", (W, H), (0, 0, 0))
    kat_rgb.paste(kat.convert("RGB"), (0, 0), kat)
    return ImageChops.add(im, kat_rgb)          # particles_add


def main():
    global GOZ
    GOZ = goz_bul()
    S = os.environ.get("S", ".")
    tam = sahne(True)
    tamsiz = sahne(False)
    # Uzakliklar: ekranda kac piksel yuksek gorunuyor
    UZAK = [(280, "yakin (~2 blok)"), (150, "~6 blok"),
            (70, "~15 blok"), (34, "~30 blok"), (18, "~60 blok")]
    KUTU = 300
    satirlar = []
    for etiket_ust, kaynaklar in (("AURA VAR", tam), ("AURA YOK", tamsiz)):
        kutu = []
        for yuk, ad in UZAK:
            k = max(1, int(kaynaklar.width * yuk / kaynaklar.height))
            kucuk = kaynaklar.resize((k, yuk), Image.LANCZOS)
            # ayni kutuda goster (buyutmeden, ORTALAYARAK)
            c = Image.new("RGB", (KUTU, KUTU), (9, 10, 14))
            c.paste(kucuk, ((KUTU - k) // 2, (KUTU - yuk) // 2))
            d = ImageDraw.Draw(c)
            d.text((6, 6), ad, fill=(190, 190, 205))
            kutu.append(c)
        satir = Image.new("RGB", (KUTU * len(kutu) + 20, KUTU + 26), (7, 7, 10))
        for j, c in enumerate(kutu):
            satir.paste(c, (j * KUTU + 10, 24))
        ImageDraw.Draw(satir).text((10, 6), etiket_ust, fill=(245, 240, 232))
        satirlar.append(satir)
    W = max(s.width for s in satirlar)
    o = Image.new("RGB", (W, sum(s.height for s in satirlar) + 34), (7, 7, 10))
    ImageDraw.Draw(o).text(
        (10, 10), IKSIR.upper() + " IKSIRI - uzaktan nasil gorunuyorsun "
                  "(karakter + goz kaplamasi + aura, ayni olcekte)",
        fill=(248, 244, 238))
    y = 30
    for s in satirlar:
        o.paste(s, (0, y)); y += s.height
    ad = os.path.join(S, "uzaktan_%s.png" % IKSIR)
    o.save(ad)
    print(ad, o.size)


main()
