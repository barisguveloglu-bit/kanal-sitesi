"""Blender içinde çalışır (bpy). uc_boyut.py tarafından çağrılır:
    blender -b --factory-startup -P blender_sahne.py -- doku.png cikti.png ornek

Sahne: bayrak dokulu küre + düzleştirilmiş göz küreleri + ters kabuk
yöntemiyle siyah dış çizgi + çimen zemin. Cycles CPU ile render; GPU gerekmez.
Doku, Nesne koordinatından hesaplanan eşdikdörtgen eşlemeyle sarılır
(UV açılımına bağımlı değil): -Y yönü (kameraya bakan yüz) dokunun merkezi.
"""
import math
import sys

import bpy
from mathutils import Vector

doku_yolu, cikti_yolu, ornek = sys.argv[sys.argv.index("--") + 1:][:3]

bpy.ops.wm.read_factory_settings(use_empty=True)
sahne = bpy.context.scene


def malzeme(ad):
    m = bpy.data.materials.new(ad)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links


def duz_renk(ad, renk, puruz=0.5, isima=False):
    m, n, l = malzeme(ad)
    bsdf = n["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*renk, 1)
    bsdf.inputs["Roughness"].default_value = puruz
    if isima:
        n.remove(bsdf)
        e = n.new("ShaderNodeEmission")
        e.inputs["Color"].default_value = (*renk, 1)
        l.new(e.outputs[0], n["Material Output"].inputs["Surface"])
    return m


def top_malzemesi():
    m, n, l = malzeme("bayrak")
    bsdf = n["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.42
    koor = n.new("ShaderNodeTexCoord")
    birim = n.new("ShaderNodeVectorMath")
    birim.operation = "NORMALIZE"
    l.new(koor.outputs["Object"], birim.inputs[0])
    ayir = n.new("ShaderNodeSeparateXYZ")
    l.new(birim.outputs["Vector"], ayir.inputs[0])
    eksi_y = n.new("ShaderNodeMath")
    eksi_y.operation = "MULTIPLY"
    eksi_y.inputs[1].default_value = -1
    l.new(ayir.outputs["Y"], eksi_y.inputs[0])
    boylam = n.new("ShaderNodeMath")
    boylam.operation = "ARCTAN2"
    l.new(ayir.outputs["X"], boylam.inputs[0])
    l.new(eksi_y.outputs[0], boylam.inputs[1])
    u = n.new("ShaderNodeMath")
    u.operation = "MULTIPLY_ADD"
    u.inputs[1].default_value = 1 / (2 * math.pi)
    u.inputs[2].default_value = 0.5
    l.new(boylam.outputs[0], u.inputs[0])
    enlem = n.new("ShaderNodeMath")
    enlem.operation = "ARCSINE"
    l.new(ayir.outputs["Z"], enlem.inputs[0])
    v = n.new("ShaderNodeMath")
    v.operation = "MULTIPLY_ADD"
    v.inputs[1].default_value = 1 / math.pi
    v.inputs[2].default_value = 0.5
    l.new(enlem.outputs[0], v.inputs[0])
    birles = n.new("ShaderNodeCombineXYZ")
    l.new(u.outputs[0], birles.inputs["X"])
    l.new(v.outputs[0], birles.inputs["Y"])
    resim = n.new("ShaderNodeTexImage")
    resim.image = bpy.data.images.load(doku_yolu)
    resim.interpolation = "Cubic"
    l.new(birles.outputs[0], resim.inputs["Vector"])
    l.new(resim.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def kabuk_malzemesi():
    """Ters kabuk: kameraya bakan yüzler saydam, arkadakiler siyah."""
    m, n, l = malzeme("dis_cizgi")
    n.remove(n["Principled BSDF"])
    geo = n.new("ShaderNodeNewGeometry")
    siyah = n.new("ShaderNodeEmission")
    siyah.inputs["Color"].default_value = (0.01, 0.01, 0.012, 1)
    saydam = n.new("ShaderNodeBsdfTransparent")
    karis = n.new("ShaderNodeMixShader")
    l.new(geo.outputs["Backfacing"], karis.inputs["Fac"])
    l.new(siyah.outputs[0], karis.inputs[1])
    l.new(saydam.outputs[0], karis.inputs[2])
    l.new(karis.outputs[0], n["Material Output"].inputs["Surface"])
    return m


def kure(ad, konum, olcek, malz, bolum=96, halka=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=bolum, ring_count=halka, location=konum)
    o = bpy.context.active_object
    o.name = ad
    o.scale = olcek
    bpy.ops.object.shade_smooth()
    o.data.materials.append(malz)
    return o


def kabuk_ekle(nesne, kalinlik):
    bpy.ops.object.select_all(action="DESELECT")
    nesne.select_set(True)
    bpy.context.view_layer.objects.active = nesne
    bpy.ops.object.duplicate()
    k = bpy.context.active_object
    k.name = nesne.name + "_cizgi"
    k.data = k.data.copy()
    k.data.materials.clear()
    k.data.materials.append(kabuk_malzemesi())
    k.scale = [s * (1 + kalinlik / min(nesne.scale)) for s in nesne.scale]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.flip_normals()
    bpy.ops.object.mode_set(mode="OBJECT")
    k.visible_shadow = False
    return k


R = 1.0
merkez = Vector((0, 0, R))
top = kure("turkiye", merkez, (R, R, R), top_malzemesi())
kabuk_ekle(top, 0.035)

beyaz = duz_renk("goz_beyaz", (0.95, 0.95, 0.95), 0.3)
siyah = duz_renk("goz_siyah", (0.01, 0.01, 0.012), isima=True)
# 2D'deki göz yerleşimi (yon=+1): x = 0.20R ve 0.62R, y = 0.21R yukarıda.
for i, (gx, genis) in enumerate(((0.20, 1.0), (0.62, 0.85))):
    boylam, enlem = math.asin(gx), math.asin(0.21)
    yon = Vector((math.sin(boylam) * math.cos(enlem), -math.cos(boylam) * math.cos(enlem),
                  math.sin(enlem)))
    donus = yon.to_track_quat("Z", "Y")
    for ad, malz, buyut, cik in (("beyaz", beyaz, 1.0, 0.0), ("siyah", siyah, 1.17, -0.012)):
        g = kure(f"goz{i}_{ad}", merkez + yon * (R + cik), (0.17 * genis * buyut, 0.22 * buyut, 0.05),
                 malz, 48, 24)
        g.rotation_mode = "QUATERNION"
        g.rotation_quaternion = donus

bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
zemin = bpy.context.active_object
zemin.data.materials.append(duz_renk("cimen", (0.30, 0.62, 0.18), 1.0))

dunya = bpy.data.worlds.new("gok")
dunya.use_nodes = True
dunya.node_tree.nodes["Background"].inputs["Color"].default_value = (0.45, 0.68, 0.95, 1)
dunya.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.1
sahne.world = dunya

bpy.ops.object.light_add(type="SUN", rotation=(math.radians(50), math.radians(-12), math.radians(-35)))
gunes = bpy.context.active_object
gunes.data.energy = 3.2
gunes.data.angle = math.radians(12)

bpy.ops.object.camera_add(location=(0.6, -8.5, 2.1))
kamera = bpy.context.active_object
yon = (merkez + Vector((0.1, 0, -0.05))) - kamera.location
kamera.rotation_euler = yon.to_track_quat("-Z", "Y").to_euler()
kamera.data.lens = 50
sahne.camera = kamera

sahne.render.engine = "CYCLES"
sahne.cycles.device = "CPU"
sahne.cycles.samples = int(ornek)
sahne.cycles.use_denoising = True
sahne.render.resolution_x, sahne.render.resolution_y = 1280, 720
sahne.view_settings.view_transform = "Standard"
sahne.render.filepath = cikti_yolu
bpy.ops.render.render(write_still=True)
