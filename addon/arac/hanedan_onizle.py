# -*- coding: utf-8 -*-
"""Hanedanin onizleme kareleri (Blender, ekransiz).   v7.99.16

    $BLENDER -b -P addon/arac/hanedan_onizle.py -- --cikti <depo disi klasor>
        [--ornek 24] [--en 1280] [--boy 720] [--gorus kus,kapi,meydan,sokak,...]

Koyluler $KOYLU_DOKU'daki Mojang dokulariyla cizilir (arac/arac_kur.sh kurar).

Isik ve renk duzeni blender_film.py'ninkiyle ayni (gok dokusu, gunes 1.7,
gok 0.18, Standard gorunum, pozlama -0.45): onizlemede gorulen, filmde
gorulecek olanla ayni tonda olsun. Ogle: 2. bolumun baskini oglen.
"""
import math
import os
import sys

BURASI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BURASI)
sys.dont_write_bytecode = True

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import blok_kur  # noqa: E402
import hanedan  # noqa: E402
import koylu  # noqa: E402

DOKU = os.environ.get("MCPREP_DOKU", "")
# koylu dokulari Mojang'in; arac_kur.sh resmi JAR'dan kurar, depoya girmez
KOYLU_DOKU = os.environ.get("KOYLU_DOKU", "/opt/araclar/paketler/koylu")
# koylu dizilerinin yeri: yerlesimin kuzeyinde, ufuk zemininde. Diziler
# kuzeye bakar, kamera onlarin kuzeyinde: gunes kameranin arkasinda kalir
# (guneyde dizilince koyluler ters isikta kaliyordu).
DIZI_Z, DIZI_X = -140.0, -40.0


def secenekler():
    arg = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    s = {"cikti": None, "ornek": 24, "en": 1280, "boy": 720,
         "gorus": "kus,kapi,meydan,sokak,sokak_dis,sokak_en_dis,zisa_on,zisa_yan,zisa_ic,dogu_sur,koylu,tarla"}
    i = 0
    while i < len(arg):
        k = arg[i].lstrip("-")
        s[k] = arg[i + 1]
        i += 2
    return s


def boyali(dosya, renk, klasor):
    hedef_k = os.path.join(klasor, "_doku")
    os.makedirs(hedef_k, exist_ok=True)
    hedef = os.path.join(hedef_k, "%s_%d%d%d.png" % (os.path.splitext(os.path.basename(dosya))[0],
                                                     *[int(c * 100) for c in renk]))
    if not os.path.exists(hedef):
        im = bpy.data.images.load(dosya)
        px = list(im.pixels[:])
        for k in range(0, len(px), 4):
            px[k] *= renk[0]; px[k + 1] *= renk[1]; px[k + 2] *= renk[2]
        yeni = bpy.data.images.new("boya", im.size[0], im.size[1], alpha=True)
        yeni.pixels = px
        yeni.filepath_raw = hedef
        yeni.file_format = "PNG"
        yeni.save()
    return hedef


def koylu_dokusu(tip, meslek, seviye, klasor):
    """Koylunun katmanlarini (cipla, biyom, meslek, rutbe) Minecraft'in
    kurallariyla tek dokuya birlestirir (koylu.birlestir)."""
    import json
    hedef = os.path.join(klasor, "_doku", "koylu_%s_%s_%s.png" % (tip, meslek, seviye))
    if os.path.exists(hedef):
        return hedef
    sapka = {}
    for alt in ("type", "profession"):
        for f in os.listdir(os.path.join(KOYLU_DOKU, alt)):
            if f.endswith(".png.mcmeta"):
                veri = json.load(open(os.path.join(KOYLU_DOKU, alt, f)))
                sapka[alt + "/" + f[:-len(".png.mcmeta")]] = veri.get("villager", {}).get("hat", "none")
    katmanlar = []
    for yol, gizli in koylu.katman_listesi(tip, meslek, seviye, sapka):
        im = bpy.data.images.load(os.path.join(KOYLU_DOKU, yol))
        w, h = im.size
        px = list(im.pixels[:])
        satirlar = [[tuple(px[((h - 1 - v) * w + u) * 4:((h - 1 - v) * w + u) * 4 + 4]) for u in range(w)]
                    for v in range(h)]
        katmanlar.append((satirlar, gizli))
    cikti = koylu.birlestir(katmanlar)
    yeni = bpy.data.images.new("koylu", koylu.DOKU, koylu.DOKU, alpha=True)
    duz = []
    for v in range(koylu.DOKU - 1, -1, -1):
        for u in range(koylu.DOKU):
            duz.extend(cikti[v][u])
    yeni.pixels = duz
    os.makedirs(os.path.dirname(hedef), exist_ok=True)
    yeni.filepath_raw = hedef
    yeni.file_format = "PNG"
    yeni.save()
    return hedef


def koylu_ekle(koyluler, doku_malzemesi, klasor):
    """Koyluleri ayni dokuyu paylasanlar bir nesnede olacak sekilde koyar."""
    gruplar = {}
    taban = koylu.kutular()
    for k in koyluler:
        anahtar = (k["tip"], k["meslek"], k["seviye"])
        gruplar.setdefault(anahtar, []).extend(koylu.yerlestir(taban, k["p"], k["yon"]))
    for (tip, meslek, seviye), yuzler in gruplar.items():
        v, f, uv = [], [], []
        for _, _, koseler, uvler in yuzler:
            i = len(v)
            v.extend((x, -z, y) for x, y, z in koseler)
            f.append((i, i + 1, i + 2, i + 3))
            uv.extend(uvler)
        me = bpy.data.meshes.new("koylu_" + meslek)
        me.from_pydata(v, [], f)
        lay = me.uv_layers.new()
        for j, d in enumerate(lay.data):
            d.uv = uv[j]
        me.materials.append(doku_malzemesi(koylu_dokusu(tip, meslek, seviye, klasor)))
        ob = bpy.data.objects.new("koylu_" + meslek, me)
        bpy.context.scene.collection.objects.link(ob)


def main():
    s = secenekler()
    klasor = os.path.abspath(s["cikti"])
    os.makedirs(klasor, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = int(s["ornek"])
    sc.cycles.use_denoising = True
    sc.cycles.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    sc.render.resolution_x, sc.render.resolution_y = int(s["en"]), int(s["boy"])
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.exposure = -0.45
    w = bpy.data.worlds.new("gok")
    w.use_nodes = True
    nt = w.node_tree
    gok = nt.nodes.new("ShaderNodeTexSky")
    # Blender 5.2'de "NISHITA" yok; turu ayarlayan satir hata verip
    # yuksekligi de atliyordu (kulube_onizle.py'de olculdu). Tur varsayilan
    # kalir (film araci da fiilen onu kullaniyor), yukseklik ayri yazilir.
    gok.sun_elevation = math.radians(55)
    nt.links.new(gok.outputs["Color"], nt.nodes["Background"].inputs["Color"])
    nt.nodes["Background"].inputs["Strength"].default_value = 0.18
    sc.world = w
    gunes = bpy.data.objects.new("gunes", bpy.data.lights.new("gunes", "SUN"))
    gunes.data.energy = 1.7
    gunes.data.angle = math.radians(2)
    gunes.rotation_euler = (math.radians(35), 0, math.radians(150))
    sc.collection.objects.link(gunes)

    malz = {}

    def doku_malzemesi(yol, renk=None, isik=0.0):
        anahtar = (yol, renk, isik)
        if anahtar in malz:
            return malz[anahtar]
        m = bpy.data.materials.new(os.path.basename(yol))
        m.use_nodes = True
        n = m.node_tree
        bsdf = n.nodes["Principled BSDF"]
        tex = n.nodes.new("ShaderNodeTexImage")
        dosya = boyali(yol, renk, klasor) if renk else yol
        tex.image = bpy.data.images.load(dosya)
        tex.interpolation = "Closest"
        n.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        n.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
        bsdf.inputs["Roughness"].default_value = 0.95
        if isik:
            n.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = isik
        malz[anahtar] = m
        return m

    bloklar, bilgi = hanedan.hanedan()
    var = {f[:-4] for f in os.listdir(DOKU) if f.endswith(".png")}
    dk = blok_kur.Dokular(var)
    orguler = blok_kur.orgu(bloklar, dk)
    blok_kur.blender_ekle(bpy, "hanedan", orguler, doku_malzemesi, DOKU)
    print("bloklar:", len(bloklar), "yuz:", sum(len(c["f"]) for c in orguler.values()),
          "eksik doku:", sorted(dk.eksik), "evler:", len(bilgi["evler"]))
    if os.path.isdir(KOYLU_DOKU):
        koylu_ekle(bilgi["koyluler"], doku_malzemesi, klasor)
        print("koylu:", len(bilgi["koyluler"]))
    else:
        print("UYARI: koylu dokulari yok (%s); once arac/arac_kur.sh" % KOYLU_DOKU)
    # ufuk: yerlesimin otesinde ayni renkte duz zemin
    ufuk = bpy.data.materials.new("ufuk")
    ufuk.use_nodes = True
    ufuk.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.24, 0.42, 0.13, 1)
    # Toprak yolun ustu 15/16 blok (z 0.9375): ufuk ondan ALCAKTA olmali,
    # 0.98'deyken yollari ortup soluk yesile boyuyordu. Ama 0.90 da tarla
    # sularinin ustunde (0.875): tam disk onlari ortuyordu. Ufuk artik
    # surun disinda baslayan bir halka; tarlalar surun icinde.
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=400, fill_type="NGON", location=(0, 0, 0.90))
    halka = bpy.context.object
    halka.data.materials.append(ufuk)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=hanedan.SUR_YARICAP, depth=1.0, location=(0, 0, 0.90))
    delik = bpy.context.object
    mod = halka.modifiers.new("delik", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.object = delik
    bpy.context.view_layer.objects.active = halka
    bpy.ops.object.modifier_apply(modifier="delik")
    bpy.data.objects.remove(delik)

    # Zisa'nin evi: kutusu (Blender eksenleri) gorusler icin
    z = bilgi["zisa"]
    zx = math.cos(math.radians(z["aci"])) * z["yaricap"]
    zz = math.sin(math.radians(z["aci"])) * z["yaricap"]
    zb = Vector((zx, -zz, 0))
    merkez_yon = Vector((-zx, zz, 0)).normalized()
    def halka(aci, r, y):
        """Minecraft acisi (x dogu, z guney) + yaricap -> Blender noktasi."""
        a = math.radians(aci)
        return (math.cos(a) * r, -math.sin(a) * r, y)

    def koylu_bak(meslek, uzak, yan, boy=1.6, lens=35):
        """O meslekteki ilk koyluye yuzunden bakan kamera."""
        k = next(q for q in bilgi["koyluler"] if q["meslek"] == meslek)
        p = Vector((k["p"][0], -k["p"][2], k["p"][1]))
        on = Vector((k["yon"][0], -k["yon"][1], 0)).normalized()
        yan_v = Vector((-on.y, on.x, 0))
        return (tuple(p + on * uzak + yan_v * yan + Vector((0, 0, boy))), tuple(p + Vector((0, 0, 1.1))), lens)

    def meydandaki_koylu(uzak=4.6, boy=1.45, lens=35):
        """Meydandaki koylulerden yuzu en cok DISARI bakana onunden bakan
        kamera: arkasinda tepe, merdiven ve kale kalir (rastgele yone
        bakan koylunun arkasi duvar cikabiliyordu)."""
        m = [q for q in bilgi["koyluler"]
             if hanedan.MEYDAN_YARICAP - 7 <= math.hypot(q["p"][0], q["p"][2]) <= hanedan.MEYDAN_YARICAP]
        k = max(m, key=lambda q: (q["yon"][0] * q["p"][0] + q["yon"][1] * q["p"][2]) / math.hypot(q["p"][0], q["p"][2]))
        p = Vector((k["p"][0], -k["p"][2], k["p"][1]))
        on = Vector((k["yon"][0], -k["yon"][1], 0)).normalized()
        return (tuple(p + on * uzak + Vector((0, 0, boy))), tuple(p + Vector((0, 0, 1.0))), lens)

    kati = {tuple(q["p"]) for q in bloklar if blok_kur.sekil(q["t"]) not in ("carpraz", "hali", "yol")}

    def acik_mi(kam, hedef):
        """Kameradan hedefe dogru cizgi bir bloga carpmiyor mu (Blender
        ekseni: x, -z, y). Cicek ve ot engel sayilmaz."""
        for i in range(1, 60):
            q = kam + (hedef - kam) * (i / 60.0)
            if (int(math.floor(q.x)), int(math.floor(q.z)), int(math.floor(-q.y))) in kati:
                return False
        return True

    def merkezden_bak(meslek, uzak, boy, lens):
        """O meslekteki koylulere yerlesimin icinden (merkez tarafindan)
        bakan kamera: dis halkada koylunun arkasi sur, kamera oraya
        dusunce kare karariyordu. Gorusu agac ya da ev kesmeyen ilk
        koylu ve aci secilir (ilk denemede kareyi bir agac govdesi kesti)."""
        aday = []
        for k in [q for q in bilgi["koyluler"] if q["meslek"] == meslek]:
            p = Vector((k["p"][0], -k["p"][2], k["p"][1]))
            ice = Vector((-p.x, -p.y, 0)).normalized()
            yan = Vector((-ice.y, ice.x, 0))
            for kay in (0.0, 2.5, -2.5, 5.0, -5.0, 7.5, -7.5):
                kam = p + ice * uzak + yan * kay + Vector((0, 0, boy))
                hedef = p + Vector((0, 0, 1.2))
                aday.append((kam, hedef))
                # yalniz koyluye giden cizgi degil, kadrajin iki yani da acik
                # olmali (ikinci denemede bir ev kosesi karenin ucte birini kapladi)
                if all(acik_mi(kam, hedef + yan * y) for y in (0.0, 3.0, -3.0)):
                    return (tuple(kam), tuple(p + Vector((0, 0, 0.8))), lens)
        kam, hedef = aday[0]
        return (tuple(kam), tuple(hedef), lens)

    dizi_kondu = False

    def dizi():
        """15 meslek (ova) bir sirada, 7 biyom (meslegi yok) ayri sirada;
        kuzeye bakarlar, soldan saga listedeki sirayla (guneye bakan
        kamerada sol = dogu = +x)."""
        sira = []
        for i, m in enumerate(koylu.MESLEKLER):
            sira.append({"p": [(7 - i) * 1.25, 0.9, DIZI_Z], "yon": [0, -1], "tip": "plains", "meslek": m,
                         "seviye": "stone"})
        for i, t in enumerate(koylu.TIPLER):
            sira.append({"p": [DIZI_X + (3 - i) * 1.25, 0.9, DIZI_Z], "yon": [0, -1], "tip": t,
                         "meslek": "none", "seviye": "stone"})
        return sira

    H = hanedan
    goruslar = {
        "kus": ((122, -132, 100), (0, 0, 6), 28),
        "kapi": ((0, -(H.SUR_YARICAP + 22), 3.0), (0, -H.SUR_YARICAP, 7.5), 24),
        "meydan": ((0, -(H.IC_YOL[0] + 1.5), 2.4), (0, -10, H.TEPE_YUKSEKLIK - 2), 22),
        "sokak": (halka(4, (H.IC_YOL[0] + H.IC_YOL[1]) / 2.0, 2.4), halka(44, H.IC_EV_HALKASI, 4.2), 20),
        "sokak_dis": (halka(292, (H.ORTA_YOL[0] + H.ORTA_YOL[1]) / 2.0, 2.4), halka(250, H.ORTA_EV_HALKASI, 4.4), 20),
        "sokak_en_dis": (halka(338, (H.DIS_YOL[0] + H.DIS_YOL[1]) / 2.0, 2.4), halka(305, H.DIS_EV_HALKASI, 4.6), 20),
        "zisa_on": (tuple(zb + merkez_yon * 10.5 + Vector((0, -7.5, 2.8))), tuple(zb + Vector((0, 0, 5.5))), 18),
        "zisa_yan": (tuple(zb + merkez_yon * 11 + Vector((0, 7, 3.0))), tuple(zb + Vector((0, 0, 5.0))), 20),
        "zisa_ic": (tuple(zb + merkez_yon * 3.6 + Vector((-0.5, 1.2, 6.9))),
                    tuple(zb - merkez_yon * 3 + Vector((0, -0.6, 5.6))), 14),
        "dogu_sur": (((H.DIS_YOL[0] + H.DIS_YOL[1]) / 2.0 - 4, 1.5, 2.6), (H.SUR_YARICAP, 0, 7), 22),
        "koylu": meydandaki_koylu(),
        # indirilen butun koylu dokulari yan yana (yerlesimin cok disinda, ufuk zemininde)
        # hedef koylunun beli (ayak 0.9 + 0.95): ayak hizasina bakinca dizi karenin ustune kaciyordu
        "dizi_meslek": ((0, -(DIZI_Z - 17.5), 2.1), (0, -DIZI_Z, 1.85), 30, (1600, 520)),
        "dizi_biyom": ((DIZI_X, -(DIZI_Z - 11.0), 2.1), (DIZI_X, -DIZI_Z, 1.85), 36),
        "tarla": merkezden_bak("farmer", 7.0, 3.5, 24),
    }
    for ad in s["gorus"].split(","):
        if ad in ("dizi_meslek", "dizi_biyom") and not dizi_kondu and os.path.isdir(KOYLU_DOKU):
            koylu_ekle(dizi(), doku_malzemesi, klasor)
            dizi_kondu = True
        kam_k, bak, lens = goruslar[ad][:3]
        # gorusun kendi en/boyu varsa (15 koyluluk uzun dizi) onu kullan
        en, boy = goruslar[ad][3] if len(goruslar[ad]) > 3 else (int(s["en"]), int(s["boy"]))
        oran = int(s["en"]) / 1280.0
        sc.render.resolution_x, sc.render.resolution_y = int(en * oran), int(boy * oran)
        kam = bpy.data.objects.new("kam_" + ad, bpy.data.cameras.new("kam_" + ad))
        kam.data.lens = lens
        kam.data.clip_end = 1000
        kam.location = Vector(kam_k)
        yon = Vector(bak) - Vector(kam_k)
        kam.rotation_euler = yon.to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(kam)
        sc.camera = kam
        sc.render.filepath = os.path.join(klasor, "hanedan_%s.png" % ad)
        bpy.ops.render.render(write_still=True)
        print("cizildi:", sc.render.filepath)


if __name__ == "__main__":
    main()
