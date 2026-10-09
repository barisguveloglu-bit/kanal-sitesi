"""Bedrock modelini Blender'da cizer: oyuna girmeden onizleme.  v7.99.8

Kullanim (Blender'in kendi Python'uyla, ekransiz):
    blender -b -P addon/arac/bedrock_onizleme.py -- sahne.json cikti.png

sahne.json:
    {"cozunurluk": [1200, 700], "ornek": 48,
     "varliklar": [
        {"geo": "Simsek_Kol_Kaynak/models/entity/aktor.geo.json",
         "doku": "Simsek_Kol_Kaynak/textures/entity/ilkel_harkos.png",
         "anim": ["Simsek_Kol_Kaynak/animations/wom_kilic.animation.json",
                  "animation.wom.antitheus.antitheus_auto_1", 0.6],
         "konum": [0, 0, 0], "yaw": 0,
         "ekler": [{"geo": ".../karanlik_tirpan.geo.json",
                    "doku": ".../karanlik_tirpan.png"}]}]}

Yollar addon/ klasorune gore. `anim` yoksa dinlenme pozu. `ekler`
attachable gibi baglaniyor: ekin kemigi varligin AYNI ADLI kemigine
yapisiyor (oyundaki attachable kurali).

---- NEDEN VAR ----
Karanlik Tirpan'in elde durusu tahminle kurulmustu (sap -Z). Oyuna
girmeden bakmanin yolu yoktu. Blender sanal makinede ekransiz
calisiyor; bu arac modeli, dokuyu ve animasyonun o anki pozunu
kuruyor ve Cycles (CPU) ile ciziyor.

---- KURALLAR NEREDEN ----
Konum ve donus kurali wom_dogrula.py'dekiyle AYNI (Epic Fight'a
karsi olculmus): Blockbench ic uzayi = dosyanin x'i ters; donus
bb_mat (x ve y acilari ters, Rz.Ry.Rx); kemik zinciri
p' = R (p - pivot) + pivot + konum. Blender'a (x, -z, y) ile geciliyor
(ic uzay Y yukari, on -Z; Blender Z yukari, on +Y).

Kutu UV'si (uv: [u, v]) Bedrock'un kutu acilimi: ust ve alt ilk
satirda, dort yan ikinci satirda. Yuz basina UV (uv: {north: ...})
de okunuyor. Onizleme: ince yuz yonleri (hangi yan hangi resmi
aliyor) oyundakinden bir ayna kadar sapabilir; POZ ve YON olculmus
kurallardan geliyor.
"""
import json
import math
import os
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def yol(p):
    return p if os.path.isabs(p) else os.path.join(KOK, p)


def oku(p):
    with open(yol(p), encoding="utf-8") as f:
        return json.load(f)


# ---------------- matematik (wom_dogrula.py ile ayni kural) ----------------
def mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def mv(m, v):
    return [sum(m[i][k] * v[k] for k in range(3)) for i in range(3)]


def bb_mat(f):
    x, y, z = [math.radians(v) for v in (-f[0], -f[1], f[2])]
    Rx = [[1, 0, 0], [0, math.cos(x), -math.sin(x)], [0, math.sin(x), math.cos(x)]]
    Ry = [[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]]
    Rz = [[math.cos(z), -math.sin(z), 0], [math.sin(z), math.cos(z), 0], [0, 0, 1]]
    return mm(mm(Rz, Ry), Rx)


def sayi(x, t):
    if isinstance(x, (int, float)):
        return float(x)
    # MoLang: yalniz sabit ve query.anim_time iceren basit ifadeler
    try:
        ifade = str(x).replace("query.anim_time", str(t)).replace("q.anim_time", str(t))
        ifade = ifade.replace("math.sin", "_sin").replace("math.cos", "_cos")
        return float(eval(ifade, {"__builtins__": {}},
                          {"_sin": lambda d: math.sin(math.radians(d)),
                           "_cos": lambda d: math.cos(math.radians(d))}))
    except Exception:
        return 0.0


def deger(kanal, t, boyut=3):
    if not isinstance(kanal, dict):
        v = kanal if isinstance(kanal, list) else [kanal] * boyut
        return [sayi(x, t) for x in v]
    ks = []
    for k, v in kanal.items():
        if isinstance(v, dict):
            v = v.get("post", v.get("pre", [0, 0, 0]))
        ks.append((float(k), [sayi(x, t) for x in (v if isinstance(v, list) else [v] * boyut)]))
    ks.sort()
    if t <= ks[0][0]:
        return ks[0][1]
    if t >= ks[-1][0]:
        return ks[-1][1]
    for i in range(1, len(ks)):
        if ks[i][0] >= t:
            (t0, a), (t1, b) = ks[i - 1], ks[i]
            u = (t - t0) / (t1 - t0) if t1 > t0 else 0.0
            return [a[n] + (b[n] - a[n]) * u for n in range(len(a))]
    return ks[-1][1]


def ic(p):
    """dosya uzayi -> ic uzay (x ters)."""
    return [-p[0], p[1], p[2]]


# ---------------- model ----------------
class Model:
    def __init__(self, geo, anim=None, t=0.0):
        g = geo["minecraft:geometry"][0]
        self.tw = g["description"].get("texture_width", 64)
        self.th = g["description"].get("texture_height", 64)
        self.kemik = {b["name"]: b for b in g["bones"]}
        self.anim = anim or {}
        self.t = t

    def donus(self, ad):
        b = self.kemik[ad]
        r = list(b.get("rotation", [0, 0, 0]))
        a = self.anim.get("bones", {}).get(ad, {})
        if "rotation" in a:
            r = [x + y for x, y in zip(r, deger(a["rotation"], self.t))]
        return bb_mat(r)

    def nokta(self, ad, p, dis=None):
        """kemik uzayindaki (ic) nokta -> dunya. `dis`: ayni adli kemigi
        bu modelin zinciri yerine KULLANILACAK dis model (attachable)."""
        while ad is not None:
            if dis is not None and ad in dis.kemik:
                return dis.nokta(ad, p)
            b = self.kemik[ad]
            pv = ic(b["pivot"])
            a = self.anim.get("bones", {}).get(ad, {})
            yer = [p[i] - pv[i] for i in range(3)]
            if "scale" in a:
                # Bedrock: olcek pivot etrafinda, donusten ONCE (kemik uzayinda)
                sc = deger(a["scale"], self.t)
                yer = [yer[i] * sc[i] for i in range(3)]
            p = [a2 + c for a2, c in zip(mv(self.donus(ad), yer), pv)]
            if "position" in a:
                f = deger(a["position"], self.t)
                p = [p[0] - f[0], p[1] + f[1], p[2] + f[2]]
            ad = b.get("parent")
        return p


YUZLER = {
    # yuz: (kose secimi ic uzayda, normal) -- koseler (x, y, z) 0/1 = min/max
    "north": [(1, 1, 0), (0, 1, 0), (0, 0, 0), (1, 0, 0)],
    "south": [(0, 1, 1), (1, 1, 1), (1, 0, 1), (0, 0, 1)],
    "east":  [(0, 1, 0), (0, 1, 1), (0, 0, 1), (0, 0, 0)],
    "west":  [(1, 1, 1), (1, 1, 0), (1, 0, 0), (1, 0, 1)],
    "up":    [(1, 1, 1), (0, 1, 1), (0, 1, 0), (1, 1, 0)],
    "down":  [(1, 0, 0), (0, 0, 0), (0, 0, 1), (1, 0, 1)],
}


def kutu_uv(u, v, w, h, d):
    return {
        "up": (u + d, v, w, d), "down": (u + d + w, v, w, d),
        "east": (u, v + d, d, h), "north": (u + d, v + d, w, h),
        "west": (u + d + w, v + d, d, h), "south": (u + 2 * d + w, v + d, w, h),
    }


def kupler(model, dis=None):
    """[(yuz koseleri dunya, uv dortgeni (0..1))] -- ic uzay."""
    cikti = []
    for ad, b in model.kemik.items():
        for c in b.get("cubes", []):
            o, s = c["origin"], c["size"]
            sis = c.get("inflate", 0)
            # dosya uzayinda kutu -> ic uzay (x ters: min x = -(o+s))
            mn = [-(o[0] + s[0]) - sis, o[1] - sis, o[2] - sis]
            mx = [-o[0] + sis, o[1] + s[1] + sis, o[2] + s[2] + sis]
            Rk, pk = None, None
            if "rotation" in c:
                Rk = bb_mat(c["rotation"])
                pk = ic(c.get("pivot", b["pivot"]))
            if isinstance(c.get("uv"), dict):
                uvlar = {f: (x["uv"][0], x["uv"][1], x["uv_size"][0], x["uv_size"][1])
                         for f, x in c["uv"].items()}
            else:
                u, v = c.get("uv", [0, 0])
                uvlar = kutu_uv(u, v, s[0], s[1], s[2])
            for f, kose in YUZLER.items():
                if f not in uvlar:
                    continue
                pts = []
                for k in kose:
                    p = [mx[i] if k[i] else mn[i] for i in range(3)]
                    if Rk is not None:
                        p = [a + cc for a, cc in zip(mv(Rk, [p[i] - pk[i] for i in range(3)]), pk)]
                    pts.append(model.nokta(ad, p, dis))
                u, v, w, h = uvlar[f]
                tw, th = model.tw, model.th
                uv = [((u + w) / tw, 1 - v / th), (u / tw, 1 - v / th),
                      (u / tw, 1 - (v + h) / th), ((u + w) / tw, 1 - (v + h) / th)]
                cikti.append((pts, uv))
    return cikti


# ---------------- Blender ----------------
def blender_sahnesi(sahne, cikti_png):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = sahne.get("ornek", 48)
    sc.render.resolution_x, sc.render.resolution_y = sahne.get("cozunurluk", [1200, 700])
    sc.render.film_transparent = False
    dunya = bpy.data.worlds.new("dunya")
    dunya.use_nodes = True
    dunya.node_tree.nodes["Background"].inputs[0].default_value = (0.78, 0.84, 0.92, 1)
    dunya.node_tree.nodes["Background"].inputs[1].default_value = 0.9
    sc.world = dunya

    malzemeler = {}

    def malzeme(doku):
        if doku in malzemeler:
            return malzemeler[doku]
        m = bpy.data.materials.new(os.path.basename(doku))
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes["Principled BSDF"]
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(yol(doku))
        tex.interpolation = "Closest"
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
        bsdf.inputs["Roughness"].default_value = 0.9
        malzemeler[doku] = m
        return m

    tum = []
    for v in sahne["varliklar"]:
        anim, t = None, 0.0
        if v.get("anim"):
            dosya, ad, t = v["anim"]
            anim = oku(dosya)["animations"][ad]
        govde = Model(oku(v["geo"]), anim, t)
        parcalar = [(kupler(govde), v["doku"])]
        for ek in v.get("ekler", []):
            parcalar.append((kupler(Model(oku(ek["geo"])), govde), ek["doku"]))
        kx, ky, kz = v.get("konum", [0, 0, 0])
        yaw = math.radians(v.get("yaw", 0))
        for yuzler, doku in parcalar:
            koseler, poligonlar, uvler = [], [], []
            for pts, uv in yuzler:
                i0 = len(koseler)
                for p in pts:
                    # ic uzay (px) -> Blender (blok): (x, -z, y) / 16, sonra yaw + konum
                    x, y, z = p[0] / 16.0, -p[2] / 16.0, p[1] / 16.0
                    xr = x * math.cos(yaw) - y * math.sin(yaw)
                    yr = x * math.sin(yaw) + y * math.cos(yaw)
                    koseler.append((xr + kx, yr + ky, z + kz))
                poligonlar.append((i0, i0 + 1, i0 + 2, i0 + 3))
                uvler.extend(uv)
            me = bpy.data.meshes.new("m")
            me.from_pydata(koseler, [], poligonlar)
            uvk = me.uv_layers.new()
            for i, d in enumerate(uvk.data):
                d.uv = uvler[i]
            me.materials.append(malzeme(doku))
            ob = bpy.data.objects.new("parca", me)
            sc.collection.objects.link(ob)
            tum.extend(ob.matrix_world @ __import__("mathutils").Vector(k) for k in koseler)

    # zemin
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    zm = bpy.data.materials.new("zemin")
    zm.use_nodes = True
    zm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.35, 0.42, 0.3, 1)
    bpy.context.object.data.materials.append(zm)
    # isik
    gunes = bpy.data.lights.new("gunes", "SUN")
    gunes.energy = 3.5
    go = bpy.data.objects.new("gunes", gunes)
    go.rotation_euler = (math.radians(50), 0, math.radians(35))
    sc.collection.objects.link(go)
    # kamera: kutuyu kadraja al, 3/4 onden
    from mathutils import Vector
    mn = Vector((min(p.x for p in tum), min(p.y for p in tum), min(p.z for p in tum)))
    mx = Vector((max(p.x for p in tum), max(p.y for p in tum), max(p.z for p in tum)))
    orta = (mn + mx) / 2
    boy = (mx - mn).length
    kam = bpy.data.cameras.new("kam")
    kam.lens = 50
    ko = bpy.data.objects.new("kam", kam)
    k = sahne.get("kamera", {})
    yon = Vector(k.get("yon", [0.55, 1.0, 0.35])).normalized()
    ko.location = orta + yon * boy * k.get("uzaklik", 1.25)
    ko.rotation_euler = (orta - ko.location).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(ko)
    sc.camera = ko
    sc.render.filepath = cikti_png
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    arg = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    blender_sahnesi(oku(arg[0]), os.path.abspath(arg[1]))
