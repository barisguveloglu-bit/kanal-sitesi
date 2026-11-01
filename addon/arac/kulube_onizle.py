# -*- coding: utf-8 -*-
"""Bataklik ve cadinin kulubesi: onizleme kareleri (Blender, ekransiz).   v7.99.16

    $BLENDER -b -P addon/arac/kulube_onizle.py -- --cikti <depo disi klasor>
        [--ornek 24] [--en 1280] [--boy 720] [--gorus kus,dis,on,ic,gece]

Isik ve renk duzeni blender_film.py'ninki (gok dokusu, Standard gorunum,
pozlama -0.45, ay acik maviden gelen ikinci bir gunes). Saatler kullanicinin
onayladigi gibi (SERI_SEZON1.md, "Part 1 kararlari"): cadi ve Satanachia
GECE, kulubede uyanis SABAH. "gece" gorusu gecidi, "ic" yatak ve
kitapligi gosterir.
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
import kulube  # noqa: E402

DOKU = os.environ.get("MCPREP_DOKU", "")

# film aracinin "isik" anahtarlariyla ayni anlam (blender_film.py)
ISIK = {
    # sabah: gunes doguda (kulubenin dogu pencerelerinden yataga vurur)
    "sabah": {"gunes": 1.5, "gok": 0.16, "yukseklik": 14, "ay": 0.0, "yon": 90},
    # 1. bolumun son anahtariyla ayni gece (bolum1_orman.json, t 70,9)
    "gece": {"gunes": 0.0, "gok": 0.045, "yukseklik": -6, "ay": 1.3, "yon": 90},
}


def mc(x, y, z):
    """Minecraft noktasi (x dogu, y yukari, z guney) -> Blender."""
    return Vector((x, -z, y))


def secenekler():
    arg = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    s = {"cikti": None, "ornek": 24, "en": 1280, "boy": 720, "gorus": "kus,dis,on,ic,gece"}
    i = 0
    while i < len(arg):
        s[arg[i].lstrip("-")] = arg[i + 1]
        i += 2
    return s


def boyali(dosya, renk, klasor):
    """Dokunun boyali kopyasi (Minecraft gibi sRGB'de carpim)."""
    hedef_k = os.path.join(klasor, "_doku")
    os.makedirs(hedef_k, exist_ok=True)
    hedef = os.path.join(hedef_k, "%s_%d_%d_%d.png" % (os.path.splitext(os.path.basename(dosya))[0],
                                                       *[int(round(c * 1000)) for c in renk]))
    if not os.path.exists(hedef):
        im = bpy.data.images.load(dosya)
        px = list(im.pixels[:])
        for k in range(0, len(px), 4):
            px[k] *= renk[0]
            px[k + 1] *= renk[1]
            px[k + 2] *= renk[2]
        yeni = bpy.data.images.new("boya", im.size[0], im.size[1], alpha=True)
        yeni.pixels = px
        yeni.filepath_raw = hedef
        yeni.file_format = "PNG"
        yeni.save()
    return hedef


def isik_kur(sc, ad):
    i = ISIK[ad]
    w = bpy.data.worlds.new("gok_" + ad)
    w.use_nodes = True
    nt = w.node_tree
    gok = nt.nodes.new("ShaderNodeTexSky")
    # Blender 5.2'de "NISHITA" yok (SINGLE_/MULTIPLE_SCATTERING, PREETHAM,
    # HOSEK_WILKIE; olculdu). Turu ayarlamaya calisan satir hata verip ayni
    # bloktaki yuksekligi de atliyordu: gece gok gunduz gibi cikti. Tur
    # varsayilan (MULTIPLE_SCATTERING) kalir, film araci da fiilen onu
    # kullaniyor; yukseklik ayri yazilir. Donus film aracindaki gibi
    # ayarlanmaz.
    gok.sun_elevation = math.radians(i["yukseklik"])
    nt.links.new(gok.outputs["Color"], nt.nodes["Background"].inputs["Color"])
    nt.nodes["Background"].inputs["Strength"].default_value = i["gok"]
    sc.world = w
    for ob in [o for o in sc.collection.objects if o.name.startswith(("gunes", "ay"))]:
        bpy.data.objects.remove(ob)
    gunes = bpy.data.objects.new("gunes", bpy.data.lights.new("gunes", "SUN"))
    gunes.data.energy = i["gunes"]
    gunes.data.angle = math.radians(2)
    gunes.rotation_euler = (math.radians(90 - max(-10, i["yukseklik"])), 0, math.radians(i["yon"]))
    sc.collection.objects.link(gunes)
    ay = bpy.data.objects.new("ay", bpy.data.lights.new("ay", "SUN"))
    ay.data.color = (0.55, 0.66, 1.0)
    ay.data.energy = i["ay"]
    ay.data.angle = math.radians(1)
    ay.rotation_euler = (math.radians(40), 0, math.radians(i["yon"] + 160))
    sc.collection.objects.link(ay)


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
    sc.view_settings.view_transform = "Standard"

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
        tex.image = bpy.data.images.load(boyali(yol, renk, klasor) if renk else yol)
        tex.interpolation = "Closest"
        n.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        n.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
        bsdf.inputs["Roughness"].default_value = 0.95
        if isik:
            n.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = isik
        malz[anahtar] = m
        return m

    bloklar, bilgi = kulube.bataklik()
    var = {f[:-4] for f in os.listdir(DOKU) if f.endswith(".png")}
    dk = blok_kur.Dokular(var, renkler=kulube.BATAKLIK_RENK)
    orguler = blok_kur.orgu(bloklar, dk)
    blok_kur.blender_ekle(bpy, "bataklik", orguler, doku_malzemesi, DOKU)
    print("bloklar:", len(bloklar), "yuz:", sum(len(c["f"]) for c in orguler.values()),
          "eksik doku:", sorted(dk.eksik), "agac:", len(bilgi["agaclar"]), "su orani: %.2f" % bilgi["oranlar"]["su"])
    # ufuk: bataklik karesinin DISINDA duz zemin. Ortasi bos bir cerceve:
    # tam bir disk havuzlarin suyunu (ustu y -0,125) ortuyordu (ilk deneme).
    ufuk = bpy.data.materials.new("ufuk")
    ufuk.use_nodes = True
    # cimenin ortalama tonu (sRGB); Blender renk kutusu DOGRUSAL ister,
    # cevrilmeden yazilinca ufuk bej cikiyordu (ikinci deneme)
    r, g, b = kulube.BATAKLIK_RENK["cimen"]
    dogrusal = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    ufuk.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (
        dogrusal(r * 0.55), dogrusal(g * 0.62), dogrusal(b * 0.5), 1)
    a, u, h = -kulube.YARICAP, kulube.YARICAP + 1, -0.02     # bloklar [a, u) araliginda
    U = 400.0
    kv = [(-U, -U, h), (U, -U, h), (U, U, h), (-U, U, h), (a, -u, h), (u, -u, h), (u, -a, h), (a, -a, h)]
    me = bpy.data.meshes.new("ufuk")
    me.from_pydata(kv, [], [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    me.materials.append(ufuk)
    sc.collection.objects.link(bpy.data.objects.new("ufuk", me))

    k = bilgi["kulube"]
    g = bilgi["gecit"]
    yb, ya = Vector(k["yatak"]["bas"]), Vector(k["yatak"]["ayak"])
    yatak_orta = (yb + ya) / 2 + Vector((0.5, 0.5, 0.5))
    gm = g["merkez"]
    goruslar = {
        # (kamera, hedef, lens, isik, pozlama)
        "kus": (mc(30, 34, -30), mc(-2, 0, 0), 28, "sabah", -0.45),
        "dis": (mc(12.5, 6.0, -15.5), mc(0.5, 4.2, 0.0), 22, "sabah", -0.45),
        # kapinin onu, goz hizasi: Baris'in cikacagi yer
        "on": (mc(1.5, 1.7, -13.5), mc(1.0, 3.6, -3.0), 26, "sabah", -0.45),
        # kapi agzindan iceri: yatak ve kitaplik (ic karanlik; onizlemede pozlama acik)
        "ic": (mc(1.6, 5.7, -0.45), mc(yatak_orta.x - 0.3, 4.6, yatak_orta.z - 0.7), 10, "sabah", 0.0),
        # gece: gecit, kulubeye bakan yuzunden
        "gece": (mc(gm[0] + 9.5, 2.4, gm[2] - 6.5), mc(gm[0], 2.1, gm[2]), 26, "gece", -0.45),
    }
    for ad in s["gorus"].split(","):
        kam_k, bak, lens, isik_ad, pozlama = goruslar[ad]
        isik_kur(sc, isik_ad)
        sc.view_settings.exposure = pozlama
        sc.render.resolution_x, sc.render.resolution_y = int(s["en"]), int(s["boy"])
        kam = bpy.data.objects.new("kam_" + ad, bpy.data.cameras.new("kam_" + ad))
        kam.data.lens = lens
        kam.data.clip_start = 0.05
        kam.data.clip_end = 1000
        kam.location = kam_k
        kam.rotation_euler = (bak - kam_k).to_track_quat("-Z", "Y").to_euler()
        sc.collection.objects.link(kam)
        sc.camera = kam
        sc.render.filepath = os.path.join(klasor, "kulube_%s.png" % ad)
        bpy.ops.render.render(write_still=True)
        print("cizildi:", sc.render.filepath)


if __name__ == "__main__":
    main()
