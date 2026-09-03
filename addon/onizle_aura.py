"""Iksir gorselini onizler.  v7.21

PARCACIK KALMADI. v7.15 - v7.20 arasinda bu arac kafanin
etrafindaki aurayi ve gozun onundeki alevi benzetiyordu;
kullanici uc surum denedikten sonra hepsinin kaldirilmasini
istedi ("hicbir animasyon eklemeyelim, goz ayni sekilde
kalsin"). Simdi cizdigi tek sey KARAKTER + GOZ KAPLAMASI --
yani iksir icildiginde gercekten gorunen sey.

Arac silinmedi cunku isi bitmedi: goz kaplamasinda bir
degisiklik yapilirsa (v7.13 yeniden cizim, v7.14 832x832)
oyuna sokmadan once uzaktan nasil okundugunu burada gormek
gerekiyor. Parcacik benzetimi de duruyor; bir parcacik dosyasi
yeniden uretilirse kendiliginden yine cizer.

---- BU DOSYADA BULUNMUS OLCUM HATALARI ----
Hepsi ayni sinifta: kusur kodda degil OLCUMDEYDI.

1. Zerre boyu yaricap sanildi, zerreler iki kat buyuk cikti.
   size = zerrenin BLOK cinsinden TAM olcusu
   (bedrock.dev: "the x/y size of the billboard").
2. Ondan onceki denemede yaricap ayrica 3 ile carpilmisti;
   hale kafadan buyuk gorunuyordu.
3. Zerreler DAIRE ciziliyordu (ImageDraw.ellipse), yani
   sprite'in seklini hic gostermiyordu. Kullanici oyunda
   "baloncuk gibi duruyor" dedi ve onizleme buna itiraz
   edemezdi -- cunku kendisi de daire ciziyordu.
4. karakter() goz kaplamasi olarak goz_element.png'yi ELLE
   aciyordu; GOZ degiskeni hesaplanip hic kullanilmiyordu.
   Hangi iksir istenirse istensin element gozu ciziliyordu.
5. Zerreler DUNYA cercevesinde ciziliyordu; "kosuyor"
   karesinde aura adamdan kopup akiyor gorunuyordu, oysa
   oyuncu da ayni hizla gidiyor. Ekranda gorunen sey FARK.

Kullanim:  S=<cikti klasoru> python3 onizle_aura.py <iksir>
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
    # DORDUNCU OLCUM HATASI (v7.17'de bulundu): burasi
    # goz_element.png'yi ELLE aciyordu. GOZ degiskeni
    # hesaplaniyor ama hic kullanilmiyordu -- yani hangi iksir
    # istenirse istensin onizlemede ELEMENT gozu ciziliyordu.
    goz = Image.open(RP + "/textures/entity/%s.png" % GOZ).convert("RGBA")
    kesit = goz.crop((8 * O, 8 * O, 16 * O, 16 * O))
    b.alpha_composite(kesit, (4 * O, 0))
    return b


class _MolangMath:
    """Molang'in math.* fonksiyonlari DERECE aliyor, radyan
    degil (bedrock.dev/docs/stable/MoLang). Python'unki radyan.
    Bu ayrimi cevirmeden benzetim yanlis sonuc verir -- goz
    alevinin boy egrisi math.sin(t*180) ile yaziliyor."""
    @staticmethod
    def sin(d):
        return math.sin(math.radians(d))

    @staticmethod
    def cos(d):
        return math.cos(math.radians(d))

    @staticmethod
    def floor(v):
        return math.floor(v)

    @staticmethod
    def abs(v):
        return abs(v)


def molang(ifade, r, yas, omur, er=None, hiz=(0.0, 0.0, 0.0)):
    """r  = zerrenin dort rastgelesi
       er = YAYIMIN dort rastgelesi (bir puftaki zerrelerde AYNI)
       hiz = oyuncunun hizi, blok/tick (script MolangVariableMap
             ile veriyor; burada elle konuyor)"""
    if isinstance(ifade, (int, float)):
        return float(ifade)
    s = str(ifade)
    # SIRA ONEMLI: once ORAN, sonra ciplak particle_age. Ters
    # sirada "variable.particle_age / variable.particle_lifetime"
    # once bolunur ve oran ifadesi bir daha eslesmez.
    s = s.replace("variable.particle_age / variable.particle_lifetime",
                  repr(yas / omur if omur else 0))
    s = s.replace("variable.particle_lifetime", repr(omur))
    s = s.replace("variable.particle_age", repr(yas))
    for i in range(1, 5):
        s = s.replace("variable.particle_random_%d" % i, repr(r[i - 1]))
        s = s.replace("variable.emitter_random_%d" % i,
                      repr((er or [0.5] * 4)[i - 1]))
    for eksen, v in zip("xyz", hiz):
        s = s.replace("variable.hiz." + eksen, repr(float(v)))
    return float(eval(s, {"__builtins__": {}}, {"math": _MolangMath}))


def gradyan(g, t):
    d = sorted((float(k), v) for k, v in g.items())
    if t <= d[0][0]:
        return d[0][1]
    for (a, ca), (b, cb) in zip(d, d[1:]):
        if t <= b:
            o = (t - a) / max(1e-9, b - a)
            return [ca[i] + (cb[i] - ca[i]) * o for i in range(4)]
    return d[-1][1]


def zerreler(ad, tick_araligi, toplam_tick=90, tohum=11,
             hiz=(0.0, 0.0, 0.0)):
    """Oyundaki gibi SUREKLI yayim: her tick_araligi tick'te bir
    yeni yayim. Son karedeki canli zerreler donuyor."""
    c = json.load(open(RP + "/particles/%s.particle.json" % ad))["particle_effect"]["components"]
    n = int(c["minecraft:emitter_rate_instant"]["num_particles"])
    ks = c["minecraft:emitter_shape_sphere"]
    yari, yuzey = float(ks["radius"]), bool(ks.get("surface_only"))
    hiz_i = c["minecraft:particle_initial_speed"]
    omur_i = c["minecraft:particle_lifetime_expression"]["max_lifetime"]
    mot = c["minecraft:particle_motion_dynamic"]
    # v7.18: ivme artik Molang ("variable.hiz.x * 68"). Hiz
    # sabit oldugundan bir kez cozuluyor.
    ivme = [molang(v, [0.5] * 4, 0, 1, hiz=hiz)
            for v in mot["linear_acceleration"]]
    surt = float(mot.get("linear_drag_coefficient", 0))
    bb = c["minecraft:particle_appearance_billboard"]
    grad = c["minecraft:particle_appearance_tinting"]["color"]["gradient"]
    spin = c.get("minecraft:particle_initial_spin", {})

    rnd = random.Random(tohum)
    dt = 1 / 20.0
    canli = []
    for t in range(toplam_tick):
        if t % tick_araligi == 0:
            # Yayimin kendi rastgeleleri: o puftaki butun
            # zerrelerde AYNI. Alevin toptan kabarip toptan
            # sonmesi bundan geliyor.
            er = [rnd.random() for _ in range(4)]
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
                              "r": r, "er": er, "yas": 0.0,
                              "omur": molang(omur_i, r, 0, 1),
                              "aci": molang(spin.get("rotation", 0), r, 0, 1),
                              "aciv": molang(spin.get("rotation_rate", 0),
                                             r, 0, 1)})
        yeni = []
        for z in canli:
            z["yas"] += dt
            if z["yas"] > z["omur"]:
                continue
            for i in range(3):
                z["v"][i] += (ivme[i] - surt * z["v"][i]) * dt
                z["p"][i] += z["v"][i] * dt
            z["aci"] += z["aciv"] * dt
            yeni.append(z)
        canli = yeni
    return canli, bb, grad


ATLAS = None


def _ayar(ad, varsayilan):
    """Sayiyi ayarlar.js'ten OKUYOR. Elle yazilirsa onizleme
    ile oyun sessizce ayrisir; bu depoda o hata dort kez oldu
    ve dorttunde de kusur olcumdeydi."""
    import re
    kaynak = open("Simsek_TNT_ToprakTopu/scripts/ayarlar.js",
                  encoding="utf-8").read()
    m = re.search(r"export const %s = ([\d.]+);" % ad, kaynak)
    return float(m.group(1)) if m else varsayilan


def _goz_yerleri():
    """Gozun skindeki satiri ve sutunlari ureteceten okunuyor
    (GOZ_SATIR / GOZ_SUTUNLAR). v4.2 dersi: bu sayilar elle
    kopyalanmaz."""
    import re
    kaynak = open("kol_uret.py", encoding="utf-8").read()
    satir = int(re.search(r"^GOZ_SATIR\s*=\s*(\d+)", kaynak, re.M).group(1))
    sut = re.search(r"^GOZ_SUTUNLAR\s*=\s*(\(.+?\))\s*$", kaynak, re.M).group(1)
    return satir, eval(sut, {"__builtins__": {}}, {})


def kare_sec(fb, yas, omur):
    """Hangi karenin cizilecegi. IKI AYRI BICIM var ve
    karistirilirsa onizleme oyunla ayrisir:

    DONGULU (loop + fps): kare = yas * fps, KARE SAYISINA gore
    mod. Zerrenin omrunden bagimsiz, sararak.

    SURECLI (stretch_to_lifetime): animasyon omre yayiliyor ve
    bir kez oynuyor -- son karede duruyor."""
    n = int(fb["max_frame"])
    if fb.get("loop") and not fb.get("stretch_to_lifetime"):
        return int(yas * float(fb["frames_per_second"])) % n
    return min(n - 1, int((yas / omur if omur else 0) * n))


def sprite(satir_px, kare, renk, en_px, boy_px, aci, hucre):
    """Zerrenin GERCEK gorunusu: atlastan dogru hucre, tinting
    ile renklendirilmis, gercek boya olceklenmis, gercek acida
    dondurulmus.  v7.17 oncesi burasi daire ciziyordu."""
    global ATLAS
    if ATLAS is None:
        ATLAS = Image.open(RP + "/textures/particle/iksir_aura.png").convert("RGBA")
    H = hucre
    h = ATLAS.crop((kare * H, satir_px, kare * H + H, satir_px + H))
    # particle_appearance_tinting: RGB de alfa da CARPILIYOR.
    r, g, b, a = h.split()
    h = Image.merge("RGBA", (
        r.point(lambda v: int(v * max(0.0, min(1.0, renk[0])))),
        g.point(lambda v: int(v * max(0.0, min(1.0, renk[1])))),
        b.point(lambda v: int(v * max(0.0, min(1.0, renk[2])))),
        a.point(lambda v: int(v * max(0.0, min(1.0, renk[3]))))))
    en_px = max(1, int(round(en_px)))
    boy_px = max(1, int(round(boy_px)))
    h = h.resize((en_px, boy_px), Image.BICUBIC)
    if abs(aci) > 0.5:
        h = h.rotate(-aci, resample=Image.BICUBIC, expand=True)
    return h


def _ekle(hedef, s, px, py):
    """particles_add = TOPLAMALI harman. alpha_composite
    kullanilsaydi ust uste gelen zerreler birbirini ORTERDI;
    oyunda toplaniyorlar ve toplanma tam da auranin parladigi
    yer."""
    x0 = int(px - s.width / 2.0)
    y0 = int(py - s.height / 2.0)
    if x0 + s.width <= 0 or y0 + s.height <= 0:
        return
    if x0 >= hedef.width or y0 >= hedef.height:
        return
    tile = Image.new("RGB", s.size, (0, 0, 0))
    tile.paste(s.convert("RGB"), (0, 0), s)
    kutu = (x0, y0, x0 + s.width, y0 + s.height)
    bolge = hedef.crop(kutu)
    hedef.paste(ImageChops.add(bolge, tile), (x0, y0))


def sahne(aura=True, hiz=(0.0, 0.0, 0.0)):
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

    # Gozlerin tuvaldeki yeri. Yuz skinde 8. sutundan basliyor,
    # tuvalde 4. MC pikselinde -- yani kayma 4-8 = -4.
    goz_satir, goz_sutunlar = _goz_yerleri()
    alev_y = _ayar("GOZ_ALEV_Y", 0.10)
    goz_capa = []
    for (s1, s2) in goz_sutunlar:
        gx = kx + ((s1 + s2 + 1) / 2.0 - 4) * O
        gy = ky + (goz_satir - 8 + 0.5) * O - alev_y * BLOK
        goz_capa.append((gx, gy))

    kat = Image.new("RGB", (W, H), (0, 0, 0))
    # v7.19: tek parcacik kaldi -- goz alevi. Kafa aurasi
    # (kor/hale/patlama/gozkor) kullanicinin istegiyle
    # kaldirildi, dosyalari da uretilmiyor.
    # (parcacik, kac tick'te bir, capalar, yukseklik kaymasi)
    for ad, aralik, capalar, kayma in (
            ("aura_gozalev_" + IKSIR,
             int(_ayar("GOZ_ALEV_ARALIK", 3)), goz_capa, 0.0),):
        yol = RP + "/particles/%s.particle.json" % ad
        if not os.path.exists(yol):
            continue
        for i, (cx, cy) in enumerate(capalar):
            # Her capa AYRI tohum: iki goz ayni alevi yakmasin.
            canli, bb, grad = zerreler(ad, aralik, tohum=11 + i * 97,
                                       hiz=hiz)
            # Script zerreyi ILERIDE doguruyor (ayarlar.js
            # ILERI KAYDIRMA); onizleme de aynisini yapmali,
            # yoksa iki taraf ayrisir.
            onden = _ayar("GOZ_ALEV_ONDEN", 0.0)
            fb = bb["uv"]["flipbook"]
            hucre = int(fb["size_UV"][0])
            satir_px = int(fb["base_UV"][1])
            for z in canli:
                o = z["yas"] / z["omur"]
                renk = gradyan(grad, o)
                en = molang(bb["size"][0], z["r"], z["yas"], z["omur"],
                            z["er"], hiz)
                boy = molang(bb["size"][1], z["r"], z["yas"], z["omur"],
                             z["er"], hiz)
                if en <= 0 or boy <= 0:
                    continue
                # size = zerrenin BLOK cinsinden TAM olcusu
                # (bedrock.dev: "the x/y size of the billboard"),
                # yaricapi degil. Ilk cizimde yaricap sandim ve
                # zerreler iki kat buyuk cikti.
                s = sprite(satir_px, kare_sec(fb, z["yas"], z["omur"]),
                           renk, en * BLOK, boy * BLOK, z["aci"], hucre)
                # OYUNCUNUN CERCEVESINDE ciziliyor. Ilk
                # cizimde zerreler dunya cercevesinde konuldu
                # ve "kosuyor" karesinde aura adamdan kopup
                # saga akiyor gorundu -- oysa oyuncu da ayni
                # yone ayni hizla gidiyor. Ekranda gorunen
                # sey FARK: zerre ne kadar GERI kaliyor.
                # Zerre dogdugundan beri oyuncu hiz*20*yas
                # blok yol aldi; o kadar cikariliyor.
                kay = [h * 20.0 * (z["yas"] - onden) for h in hiz]
                _ekle(kat, s,
                      cx + (z["p"][0] - kay[0]) * BLOK,
                      cy - (z["p"][1] - kay[1] + kayma) * BLOK)
    return ImageChops.add(im, kat)          # particles_add


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
