"""Thomas Rig Legacy gozleri -- film aracina baglanti.               v7.99.13

Kullanicinin karari (2026-10-11): goz sahneleri Thomas Rig Legacy'nin
gozleriyle cizilir, YALNIZ GOZ -- yanak kizarikligi, kirpik, kas, agiz,
kan lekesi yok. Sahneye gore secilir ("bir o bir o"): bazi planlar bizim
kafamiz, bazilari Thomas gozleri. Olcumler: REFERANS_THOMAS_RIG.md.

Senaryo:
  aktorler.<ad>.goz = {"kalip": "kirmizi", ...}
      Bu aktore Thomas kafasi kurulur. Anahtarlar (hepsi istege bagli):
      iris, iris2, bebek, sc, yansima ([r, g, b], 0-1), isima, bebek_boyu,
      yayilma (iki gozde ortak); "sol" / "sag": yalniz o goze ozel ayni
      anahtarlar (karakterin kendi solu/sagi).
  kamera[i].goz = "thomas"
      O planda goz ayarli aktorlerin Thomas kafasi gorunur, bizim kafa
      gizlenir. Diger planlar bizim sistemimiz.
  olay {"t", "aktor", "goz_kapak": x | {"sol": x, "sag": y}, "sure"}
      x: -1 tam kapali, 0 normal, 1 iyice acik.
  olay {"t", "aktor", "goz_bakis": [yatay, dikey], "sure"}
      -1..1; yatay +1 ekranin sagi (karaktere dogru bakan kamerada),
      dikey +1 yukari. Olculen sinirlarda kirpilir.
  aktorler.<ad>.goz.satir = n
      Skinin kendi gozlerinin yuzdeki satiri (0 = ust). Iskeletin gozleri
      Steve'in satirinda (4); skinin gozu baska satirdaysa Thomas gozleri
      oraya kaydirilir (Eyes_UP_DOWN), yoksa skine boyali gozler yuvalarin
      altinda/ustunde ikinci bir cift goz olarak gorunur (2026-11-07,
      Omer: gozleri 5. satirda, 4. satirda kaslari -- dort goz cizildi).

Iskelet dosyasi DEPODA YOK: arac_kur.sh resmi siteden (extensions.blender.org)
indirir, SHA-256 ile dogrular, yalniz iskelet .blend'ini acar (paketteki
Mojang dokulari alinmaz). Yolu THOMAS_RIG ortam degiskeni verir.
Dosya betik CALISTIRILMADAN eklenir (libraries.load); suruculer basit
ifade, betik izni gerektirmiyor. Skin her zaman bizim PNG'miz.

Bu dosyanin ust yarisi saf Python (test Blender'siz kosuyor); Blender'a
dokunan kisim kur() ve yardimcilari.
"""
import math
import os

# Kullanicinin onayladigi kirmizi isiyan goz: karsilastirma 83_kirmizi_30_bo12,
# secim "30 + Blow Out 12" (2026-10-11). Isima 30'da irisin pembe-beyaza
# kaymasi bilinerek secildi -- duzeltilecek renk degil.
KALIPLAR = {
    "kirmizi": {"iris": [1.0, 0.0, 0.0], "iris2": [0.55, 0.0, 0.0], "sc": [1.0, 0.15, 0.1],
                "bebek": [0.04, 0.0, 0.0], "isima": 30.0, "yayilma": 12},
    # Baris'in KENDI gozu (kullanici, 2026-10-12: gonderdigi on fotograftaki
    # goz; sRGB 140, 209, 255 -> dogrusal). Formda kirmizi olmayan goz bu
    # (beden forma tam alismadi). Isima yok. iris2 ayni rengin koyusu (x0.45),
    # bebek koyu: fotograftaki goz duz bir piksel, gercekci gozun (Eye type 1)
    # bebegi oradan cikmiyor -- olculen yalniz iris rengi.
    "mavi": {"iris": [0.262, 0.638, 1.0], "iris2": [0.118, 0.287, 0.45], "sc": [0.262, 0.638, 1.0],
             "bebek": [0.02, 0.02, 0.03], "isima": 0.0},
}
# ayar anahtari -> dugum grubu girisinin soneki (onek 1_ = sag goz, 2_ = sol goz)
GIRIS = {"iris": "Color1", "iris2": "Color2", "bebek": "Pupil", "sc": "EyeSC",
         "yansima": "Reflection", "isima": "Emission", "bebek_boyu": "RimSize"}
ORTAK_GIRIS = {"yayilma": "Blow_Out"}

KAPAK_SINIR = 0.052        # iUI_Blink yerel Y: -0.052 tam kapali, +0.052 iyice acik (LIMIT_LOCATION)
BAKIS_ADIM = 0.1           # tam bakista Eye.L / Eye.R'nin kaymasi
# olculen hareket sinirlari; Z iki gozde TERS isaretli (L z -, R z + -> ekranin sagi)
BAKIS_SINIR = {"L": {"y": (-0.1, 0.1), "z": (-0.15, 0.05)},
               "R": {"y": (-0.1, 0.1), "z": (-0.05, 0.15)}}
BAKIS_ISARET = {"L": -1.0, "R": 1.0}
# goz yuksekligi (REFERANS_THOMAS_RIG.md "goz yuksekligi"): Eyes_UP_DOWN yerel Y,
# iki goz birlikte kayar, -0,184 (asagi) .. +0,11. Olculdu (2026-11-07, Blender'da
# Eyes nesnesinin z'si): kemik -0,06 -> goz 0,036 iner (oran 0,6); kafa 8 px =
# 0,48 birim, 1 px = 0,06 birim -> 1 satir = kemikte 0,1. Ilk deneme 0,06 ile
# yapildi, goz 0,6 px indi ve boyali gozlerin alt yarisi gorundu.
# Iskeletin gozleri skinin 4. satirindaki goze oturur (Steve).
YUKSEKLIK_KEMIK = "Eyes_UP_DOWN"
YUKSEKLIK_SINIR = (-0.184, 0.11)
RIG_GOZ_SATIRI = 4
PIKSEL = 0.1
KAPAK_KEMIK = {"sol": "iUI_Blink.L", "sag": "iUI_Blink.r"}     # .r kucuk harf: iskeletteki ad
BAKIS_KEMIK = {"L": "Eye.L", "R": "Eye.R"}
# Cizilen nesneler; gerisi (govde, kol, bacak, kas, dis, dil, katman cikintilari,
# kontrol paneli, kemik sekilleri) gizlenir. Head_Deform / Head_NoDeform arasindaki
# secimi iskeletin kendi surucusu yapar ("Full rigged face").
CIZILEN = {"Head_Deform", "Head_NoDeform", "Eyes"}
# agiz acikken (aktorde "agiz") iskeletin disleri ve dili de cizilir
# (kullanici, 2026-11-02: "Thomas Rig Legacy kullan, onda agiz da var")
AGIZ_CIZILEN = {"Top_teeth", "Bottom_teeth", "Tongue"}
SURUCULU = {"Head_Deform", "Head_NoDeform"}
YUZ_UV = (8 / 64, 16 / 64, 1 - 16 / 64, 1 - 8 / 64)    # skinde yuz: x 8-16, y 8-16 (u0, u1, v0, v1)
RIG_YUZ = (0.0, -1.0)      # olculdu: iskeletin yuzu -Y'ye bakiyor
UZAK = (0.0, 0.0, -500.0)  # plan disinda iskelet buraya cekilir (gizleme surucuyle cakismasin)


def taban_ad(ad):
    """'Eyes.001' -> 'Eyes' (ikinci eklemede Blender sonek koyar)."""
    b, _, s = ad.rpartition(".")
    return b if b and s.isdigit() else ad


def goz_ayari(v):
    """Aktorun "goz" ayari -> {"sol": {...}, "sag": {...}, "ortak": {...}, "ayri": bool}."""
    if not v:
        return None
    if not isinstance(v, dict):
        raise ValueError("goz ayari sozluk olmali: %r" % (v,))
    kalip = v.get("kalip")
    if kalip is not None and kalip not in KALIPLAR:
        raise ValueError("bilinmeyen goz kalibi: %s (bilinenler: %s)" % (kalip, ", ".join(KALIPLAR)))
    bilinen = set(GIRIS) | set(ORTAK_GIRIS) | {"kalip", "sol", "sag", "satir"}
    for k in v:
        if k not in bilinen:
            raise ValueError("bilinmeyen goz anahtari: %s" % k)
    ortak = dict(KALIPLAR.get(kalip, {}))
    ortak.update({k: x for k, x in v.items() if k not in ("kalip", "sol", "sag", "satir")})
    gozler = {}
    for taraf in ("sol", "sag"):
        ozel = dict(v.get(taraf) or {})
        # tek goze ayri kalip: {"kalip": "kirmizi", "sag": {"kalip": "mavi"}}
        # (formda bir goz kirmizi, obur goz Baris'in kendi gozu)
        k_t = ozel.pop("kalip", None)
        if k_t is not None and k_t not in KALIPLAR:
            raise ValueError("%s gozde bilinmeyen kalip: %s (bilinenler: %s)" % (taraf, k_t, ", ".join(KALIPLAR)))
        for k in ozel:
            if k not in GIRIS:
                raise ValueError("%s gozde bilinmeyen anahtar: %s" % (taraf, k))
        taban = {k: x for k, x in ortak.items() if k in GIRIS}
        if k_t is not None:
            taban.update({k: x for k, x in KALIPLAR[k_t].items() if k in GIRIS})
        gozler[taraf] = dict(taban, **ozel)
    return {"sol": gozler["sol"], "sag": gozler["sag"],
            "ortak": {k: x for k, x in ortak.items() if k in ORTAK_GIRIS},
            "ayri": bool(v.get("sol") or v.get("sag")),
            "satir": int(v.get("satir", RIG_GOZ_SATIRI)),
            "yukseklik": goz_yuksekligi(v.get("satir", RIG_GOZ_SATIRI))}


def boyali_gozler(yuz, satir=RIG_GOZ_SATIRI, esik=60):
    """Skine boyali gozleri bulur (Thomas kafasinda silinecekler).
    yuz: 8x8 [(r, g, b, a)] (skindeki on yuz, ustten). Ten = goz satirindan
    asagisinin en sik rengi; goz satirinda tenden belirgin farkli (RGB fark
    toplami > esik) pikseller boyali gozdur (beyaz + iris).
    Donus: (ten (r, g, b), [(sutun, satir), ...]).
    Neden (kullanici, 2026-11-07, Omer): Thomas gozu ~0,9 px boyunda; gozu
    skinin satirina indirmek yetmedi, boyali gozun alt kenari ince bir cizgi
    olarak kaldi. REFERANS_THOMAS_RIG: "skin gozsuzse temiz"."""
    say = {}
    for r in range(satir, 8):
        for c in range(8):
            p = tuple(yuz[r][c][:3])
            say[p] = say.get(p, 0) + 1
    ten = max(sorted(say.items()), key=lambda kv: kv[1])[0]
    fark = lambda p: sum(abs(a - b) for a, b in zip(p[:3], ten))
    return ten, [(c, satir) for c in range(8) if fark(yuz[satir][c]) > esik]


def goz_yuksekligi(satir):
    """Skinin goz satiri -> Eyes_UP_DOWN yerel Y (asagi eksi). Olculen sinirin
    disi HATA: iskelet gozu oraya indiremiyor, sessizce kirpmak dort goz demek."""
    if int(satir) != satir:
        raise ValueError("goz satiri tamsayi olmali: %r" % (satir,))
    y = -(int(satir) - RIG_GOZ_SATIRI) * PIKSEL
    if not (YUKSEKLIK_SINIR[0] - 1e-9 <= y <= YUKSEKLIK_SINIR[1] + 1e-9):
        raise ValueError("goz satiri %s iskeletin goz yuksekligi sinirinin disinda (%.3f)" % (satir, y))
    return round(y, 6)


def giris_degerleri(ayar):
    """Goz dugum grubuna yazilacaklar: {"1_Color1": (r, g, b, 1), "Blow_Out": 12, ...}.
    1_ = karakterin SAG gozu, 2_ = SOL gozu (REFERANS: 2_* sol goze, iUI_Blink.L)."""
    cikti = {}
    for onek, taraf in (("1_", "sag"), ("2_", "sol")):
        for k, x in ayar[taraf].items():
            cikti[onek + GIRIS[k]] = tuple(list(x)[:3]) + (1.0,) if isinstance(x, (list, tuple)) else float(x)
    for k, x in ayar["ortak"].items():
        cikti[ORTAK_GIRIS[k]] = int(x) if k == "yayilma" else float(x)
    return cikti


def kapak(x):
    """-1 (kapali) .. 1 (iyice acik) -> iUI_Blink Y."""
    return max(-1.0, min(1.0, float(x))) * KAPAK_SINIR


def bakis(yatay, dikey):
    """-> {"L": (0, y, z), "R": (0, y, z)}: Eye.L / Eye.R konumlari, olculen sinirlarda."""
    cikti = {}
    for g in ("L", "R"):
        s = BAKIS_SINIR[g]
        y = min(max(float(dikey) * BAKIS_ADIM, s["y"][0]), s["y"][1])
        z = min(max(BAKIS_ISARET[g] * float(yatay) * BAKIS_ADIM, s["z"][0]), s["z"][1])
        cikti[g] = (0.0, y, z)
    return cikti


def thomas_kareleri(senaryo, harita):
    """goz="thomas" planlarin Blender kareleri (1 tabanli, kucukten buyuge).
    Plan secimi kamera_izi ile AYNI kural: t'de gecerli plan, t'den once ya da
    t'de baslayan son plan."""
    atislar = sorted(senaryo.get("kamera", []), key=lambda c: c["t"])
    if not atislar:
        return []
    cikti = []
    for f, t in enumerate(harita):
        suan = [i for i, c in enumerate(atislar) if c["t"] <= t + 1e-9]
        if atislar[suan[-1] if suan else 0].get("goz") == "thomas":
            cikti.append(f + 1)
    return cikti


def araliklar(kareler):
    """[3, 4, 5, 9] -> [(3, 5), (9, 9)]"""
    cikti = []
    for f in kareler:
        if cikti and f == cikti[-1][1] + 1:
            cikti[-1] = (cikti[-1][0], f)
        else:
            cikti.append((f, f))
    return cikti


def goz_olaylari(senaryo, harita, ad, kare_bul):
    """Aktorun kapak ve bakis anahtarlari.
    -> {"kapak": [(kare, {"sol": y, "sag": y})...], "bakis": [(kare, {"L": v, "R": v})...]}
    Her olay iki anahtar: baslangicta ONCEKI deger, sure sonunda yeni deger
    (oda gozlerinin goz_bak'i ile ayni kural)."""
    kap = {"sol": 0.0, "sag": 0.0}
    bak = bakis(0, 0)
    cikti = {"kapak": [(1, dict(kap))], "bakis": [(1, dict(bak))]}
    for ol in sorted(senaryo.get("olaylar", []), key=lambda x: x["t"]):
        if ol.get("aktor") != ad:
            continue
        f0 = kare_bul(harita, ol["t"]) + 1
        f1 = max(kare_bul(harita, ol["t"] + ol.get("sure", 0.15)) + 1, f0 + 1)
        if "goz_kapak" in ol:
            k = ol["goz_kapak"]
            yeni = dict(kap)
            if isinstance(k, dict):
                for taraf, x in k.items():
                    if taraf not in kap:
                        raise ValueError("goz_kapak: sol/sag olmali, gelen %s" % taraf)
                    yeni[taraf] = kapak(x)
            else:
                yeni = {"sol": kapak(k), "sag": kapak(k)}
            cikti["kapak"] += [(f0, dict(kap)), (f1, dict(yeni))]
            kap = yeni
        if "goz_bakis" in ol:
            yatay, dikey = ol["goz_bakis"]
            yeni = bakis(yatay, dikey)
            cikti["bakis"] += [(f0, dict(bak)), (f1, dict(yeni))]
            bak = yeni
    return cikti


def plan(senaryo, harita, aktorler_v):
    """Hangi aktore Thomas kafasi kurulacak, hangi karelerde gorunecek.
    aktorler_v: {ad: senaryodaki aktor sozlugu}. Bos dict: iskelet hic yuklenmez."""
    kareler = thomas_kareleri(senaryo, harita)
    ayarli = {ad: goz_ayari(v["goz"]) for ad, v in aktorler_v.items() if v.get("goz")}
    if kareler and not ayarli:
        raise ValueError('kamera planinda goz="thomas" var ama hicbir aktorde "goz" ayari yok')
    if not kareler:
        return {}
    return {ad: {"ayar": a, "araliklar": araliklar(kareler)} for ad, a in ayarli.items()}


# ============================================================
# Blender tarafi
# ============================================================
def _iskelet_ekle(bpy, yol):
    """'Rig [only append this]' koleksiyonunu ekler -- betik calistirilmadan."""
    if not yol or not os.path.exists(yol):
        raise SystemExit("HATA: Thomas Rig dosyasi yok (THOMAS_RIG=%r) -- arac_kur.sh calisti mi?" % yol)
    once_n, once_i, once_m = set(bpy.data.objects), set(bpy.data.images), set(bpy.data.materials)
    with bpy.data.libraries.load(yol, link=False) as (kaynak, hedef):
        if "Rig [only append this]" not in kaynak.collections:
            raise SystemExit("HATA: iskelet dosyasinda 'Rig [only append this]' koleksiyonu yok: %s" % yol)
        hedef.collections = ["Rig [only append this]"]
    kol = hedef.collections[0]
    bpy.context.scene.collection.children.link(kol)
    yeni = [o for o in bpy.data.objects if o not in once_n]
    rig = [o for o in yeni if o.type == "ARMATURE" and taban_ad(o.name) == "Thomas_rig"]
    if len(rig) != 1:
        raise SystemExit("HATA: eklenen iskelette tek Thomas_rig bekleniyordu, %d bulundu" % len(rig))
    return (kol, rig[0], yeni, [i for i in bpy.data.images if i not in once_i],
            [m for m in bpy.data.materials if m not in once_m])


def _kafa_olc(bpy, nesne, degerlendir=True):
    """Kafa orgusunun dunya uzayinda merkezi ve X genisligi."""
    from mathutils import Vector
    if degerlendir:
        dg = bpy.context.evaluated_depsgraph_get()
        ev = nesne.evaluated_get(dg)
        me = ev.to_mesh()
        nk = [ev.matrix_world @ v.co for v in me.vertices]
        ev.to_mesh_clear()
    else:
        nk = [Vector(v.co) for v in nesne.data.vertices]      # model uzayi (ebeveyn birim)
    lo = Vector([min(p[i] for p in nk) for i in range(3)])
    hi = Vector([max(p[i] for p in nk) for i in range(3)])
    return (lo + hi) / 2, hi.x - lo.x


def _yuz_yonu(me, merkez):
    """Bizim kafada yuzun baktigi yon (model uzayi): kafa merkezinden yuz
    dokusunu tasiyan dortgenin ortasina. Yuzey normali KULLANILMAZ: kupler
    ters sarili (Bedrock -> Blender), normal ice bakiyor -- ilk denemede
    Thomas kafasi 180 derece ters oturdu, kameraya ensesi geldi."""
    u0, u1, v0, v1 = YUZ_UV
    uv = me.uv_layers.active.data
    for p in me.polygons:
        us = [uv[i].uv for i in p.loop_indices]
        cu = sum(x[0] for x in us) / len(us)
        cv = sum(x[1] for x in us) / len(us)
        if u0 < cu < u1 and v0 < cv < v1:
            d = p.center - merkez
            d.z = 0.0
            return d.normalized()
    raise SystemExit("HATA: kafa orgusunde yuz dokusu bulunamadi (UV %r)" % (YUZ_UV,))


def kur(bpy, senaryo, harita, aktorler, kemik_nesne, kare_bul, skin_yolu, rig_yolu=None, agiz_cizelgesi=None):
    """Goz ayarli aktorlere Thomas kafasi kurar, thomas planlarinda gosterir.
    aktorler: {ad: a} (a.v senaryodaki sozluk). Dondurur: {ad: iskelet nesnesi}.
    agiz_cizelgesi(ad) -> [(t, sekil)] ya da None: verilirse iskeletin 3B
    agzi o cizelgeyle konusur (arac/agiz.py THOMAS_AGIZ)."""
    from mathutils import Matrix, Vector
    p = plan(senaryo, harita, {ad: a.v for ad, a in aktorler.items()})
    if not p:
        return {}
    rig_yolu = rig_yolu or os.environ.get("THOMAS_RIG")
    kurulan = {}
    for ad, bilgi in sorted(p.items()):
        kol, rig, yeni, resimler, malzemeler = _iskelet_ekle(bpy, rig_yolu)
        kol.name = "thomas_%s" % ad
        # -- skin: her zaman bizim PNG (paketteki Steve dokusu cizilmez)
        skin = [i for i in resimler if taban_ad(i.name) == "Steve"]
        if len(skin) != 1:
            raise SystemExit("HATA: iskeletin skin resmi (Steve) bulunamadi: %s" % [i.name for i in resimler])
        skin[0].filepath = skin_yolu(aktorler[ad].v["skin"])
        skin[0].reload()
        # -- skine boyali gozler silinir (yalniz bu kafanin kopyasinda; bizim
        # kafa kendi resmini kullaniyor): Thomas gozu boyali gozu tam ortmuyor
        G, Y = skin[0].size
        px = list(skin[0].pixels)
        def _p(x, y):                       # skin koordinati (ustten) -> dizin
            return ((Y - 1 - y) * G + x) * 4
        yuz = [[tuple(int(round(px[_p(8 + c, 8 + r) + k] * 255)) for k in range(4)) for c in range(8)]
               for r in range(8)]
        ten, silinen = boyali_gozler(yuz, bilgi["ayar"]["satir"])
        for c, r in silinen:
            i = _p(8 + c, 8 + r)
            px[i:i + 3] = [x / 255.0 for x in ten]
        skin[0].pixels = px
        skin[0].update()
        skin[0].pack()
        print("THOMAS %s: boyali goz silindi %s (ten %s)" % (ad, silinen, ten), flush=True)
        # -- gercek goz yuvasi, gercekci goz, iki goz ayri renk istendiyse
        mp = rig.pose.bones["Main_Properties"]
        mp["Full rigged face"] = 1
        mp["Eye type"] = 1
        mp["Different eyes colour"] = 1 if bilgi["ayar"]["ayri"] else 0
        # -- goz malzemesi
        gozm = [m for m in malzemeler if taban_ad(m.name) == "Eyes"]
        if len(gozm) != 1:
            raise SystemExit("HATA: iskeletin goz malzemesi (Eyes) bulunamadi")
        grup = [n for n in gozm[0].node_tree.nodes if n.type == "GROUP"]
        if len(grup) != 1:
            raise SystemExit("HATA: goz malzemesinde tek dugum grubu bekleniyordu")
        for giris, deger in giris_degerleri(bilgi["ayar"]).items():
            if giris not in grup[0].inputs:
                raise SystemExit("HATA: goz dugumunde giris yok: %s" % giris)
            grup[0].inputs[giris].default_value = deger
        # -- yalniz kafa ve gozler cizilir (agiz acikken disler ve dil de)
        agiz_c = agiz_cizelgesi(ad) if agiz_cizelgesi else None
        cizilen = CIZILEN | (AGIZ_CIZILEN if agiz_c else set())
        for o in yeni:
            if o.type in ("ARMATURE", "LATTICE", "EMPTY"):
                continue
            t = taban_ad(o.name)
            if t in cizilen:
                continue
            if o.animation_data and any(d.data_path == "hide_render" for d in o.animation_data.drivers):
                o.driver_remove("hide_render")
            o.hide_render = True
        # -- ebeveyni olmayan yardimcilar (kafes, cikinti) iskeletle birlikte tasinsin
        for o in yeni:
            if o is not rig and o.parent is None:
                o.parent = rig
                o.matrix_parent_inverse = rig.matrix_world.inverted()
        bpy.context.view_layer.update()
        # -- hizalama: iskeletin dinlenme kafasi -> bizim kafa (model uzayi)
        rig_kafa = [o for o in yeni if taban_ad(o.name) == "Head_NoDeform"]
        c_rig, boy_rig = _kafa_olc(bpy, rig_kafa[0])
        bas_m = bpy.data.objects["%s_head_m" % ad]
        c_biz, boy_biz = _kafa_olc(bpy, bas_m, degerlendir=False)
        n = _yuz_yonu(bas_m.data, c_biz)
        aci = math.atan2(n.y, n.x) - math.atan2(RIG_YUZ[1], RIG_YUZ[0])
        print("THOMAS %s: iskelet kafa %s boy %.3f -> bizim %s boy %.3f, yuz %s, donus %.1f derece"
              % (ad, tuple(round(x, 3) for x in c_rig), boy_rig, tuple(round(x, 3) for x in c_biz), boy_biz,
                 tuple(round(x, 2) for x in n), math.degrees(aci)), flush=True)
        A = (Matrix.Translation(c_biz) @ Matrix.Rotation(aci, 4, "Z")
             @ Matrix.Scale(boy_biz / boy_rig, 4) @ Matrix.Translation(-c_rig))
        tasiyici = bpy.data.objects.new("thomas_%s_tasiyici" % ad, None)
        bpy.context.scene.collection.objects.link(tasiyici)
        tasiyici.parent = kemik_nesne[ad]["head"]
        w0 = rig.matrix_world.copy()
        rig.parent = tasiyici
        rig.matrix_parent_inverse = Matrix.Identity(4)
        rig.matrix_basis = A @ w0
        # -- planlar: thomas karelerinde iskelet yerinde + bizim kafa gizli; digerlerinde tersi
        def _konum(f, yerinde):
            tasiyici.location = (0, 0, 0) if yerinde else UZAK
            tasiyici.keyframe_insert("location", frame=f)
        def _bizim(f, gorunur):
            bas_m.hide_render = not gorunur
            bas_m.keyframe_insert("hide_render", frame=f)
        _konum(0, False)
        _bizim(0, True)
        for a, b in bilgi["araliklar"]:
            _konum(a, True)
            _bizim(a, False)
            _konum(b + 1, False)
            _bizim(b + 1, True)
        _sabit_yap(tasiyici)
        # -- kapak ve bakis anahtarlari
        pb = rig.pose.bones
        # -- goz yuksekligi: skinin kendi goz satirina (sabit, butun film)
        pb[YUKSEKLIK_KEMIK].location = (0.0, bilgi["ayar"]["yukseklik"], 0.0)
        pb[YUKSEKLIK_KEMIK].keyframe_insert("location", frame=1)
        ol = goz_olaylari(senaryo, harita, ad, kare_bul)
        for f, deger in ol["kapak"]:
            for taraf, kem in KAPAK_KEMIK.items():
                pb[kem].location = (0.0, deger[taraf], 0.0)
                pb[kem].keyframe_insert("location", frame=f)
        for f, deger in ol["bakis"]:
            for g, kem in BAKIS_KEMIK.items():
                pb[kem].location = deger[g]
                pb[kem].keyframe_insert("location", frame=f)
        # -- agiz: sekil degisince kontroller ANINDA (CONSTANT) degisir
        if agiz_c:
            import agiz as AGZ
            onceki = None
            for f in range(len(harita)):
                s_ = AGZ.sekil_karede(agiz_c, harita[f])
                if s_ == onceki:
                    continue
                for kem, d in AGZ.thomas_degerleri(s_).items():
                    pb[kem].rotation_mode = "XYZ"
                    pb[kem].location = d["location"]
                    pb[kem].keyframe_insert("location", frame=f + 1)
                    if "rotation_euler" in d:
                        pb[kem].rotation_euler = d["rotation_euler"]
                        pb[kem].keyframe_insert("rotation_euler", frame=f + 1)
                onceki = s_
            agiz_kemik = {AGZ.THOMAS_KONTROL} | set(AGZ.THOMAS_SURGU.values())
            _sabit_yap(rig, lambda yol: any('"%s"' % k in yol for k in agiz_kemik))
        kurulan[ad] = rig
    return kurulan


def _sabit_yap(nesne, suzgec=None):
    """Nesnenin butun anahtarlari CONSTANT (plan kesmesinde ara kare olmasin).
    Blender 5'te eylemler katmanli; iki yapiyi da dolasir. suzgec(data_path)
    verilirse yalniz onun kabul ettigi egriler (agiz: goz anahtarlari yumusak kalsin)."""
    ad = nesne.animation_data
    if not ad or not ad.action:
        return
    egriler = []
    if hasattr(ad.action, "fcurves"):
        egriler = list(ad.action.fcurves)
    if not egriler and hasattr(ad.action, "layers"):
        for katman in ad.action.layers:
            for serit in katman.strips:
                for kanal in serit.channelbags:
                    egriler += list(kanal.fcurves)
    for fc in egriler:
        if suzgec is not None and not suzgec(fc.data_path):
            continue
        for k in fc.keyframe_points:
            k.interpolation = "CONSTANT"
