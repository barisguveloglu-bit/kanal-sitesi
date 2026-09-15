#!/usr/bin/env python3
"""bicim_dogrula.py'nin GERCEKTEN isirdigini gosterir.

   ---- NEDEN VAR ----
   NOTLAR.md'deki kural: "Bir testin gercekten is gordugunu nasil
   anlarsin: bilerek boz. Gecmeye devam ediyorsa o sinama bir sey
   olcmuyordur."

   bicim_dogrula.py depoda HATA : 0 veriyor. Bu tek basina iyi haber
   degil -- hicbir sey olcmeyen bir dogrulayici da 0 verir. Bu betik
   farki gosteriyor: her kontrol icin bilerek bozuk bir dosya kurup
   dogrulayicinin onu yakaladigini olcuyor.

   Depo BOZULMUYOR: her mutasyon gecici bir klasorde kendi kucuk
   agacini kuruyor ve dogrulayici oraya dogrultuluyor.

   Cikti bicimi anim_tara.py ile ayni: son satirda "HATA : <n>".
   Buradaki "hata" = SAG KALAN mutasyon, yani yakalanamayan bozukluk.
"""
import copy, json, os, shutil, subprocess, sys, tempfile

ARAC = os.path.dirname(os.path.abspath(__file__))
DOGRULAYICI = os.path.join(ARAC, "bicim_dogrula.py")

TEMIZ_ANIM = {
    "format_version": "1.8.0",
    "animations": {"animation.x": {
        "loop": "hold_on_last_frame",
        "animation_length": 1.0,
        "bones": {"head": {"rotation": {
            "0.0": {"vector": [0, 0, 0], "easing": "easeInOutBack"}}}},
    }},
}
TEMIZ_GEO = {
    "format_version": "1.12.0",
    "minecraft:geometry": [{
        "description": {"identifier": "geometry.x"},
        "bones": [
            {"name": "kok", "pivot": [0, 0, 0]},
            {"name": "cocuk", "parent": "kok", "pivot": [0, 0, 0],
             "cubes": [{"origin": [0, 0, 0], "size": [1, 1, 1]}]},
        ],
    }],
}


def _kare(d):
    return d["animations"]["animation.x"]["bones"]["head"]["rotation"]["0.0"]


def _ayarla(anahtar, deger):
    return lambda d: _kare(d).__setitem__(anahtar, deger)


# (ad, hangi dosya, bozma islemi)
MUTASYONLAR = [
    ("easing adi yanlis",      "anim", _ayarla("easing", "easeInOutBackk")),
    ("loop degeri yanlis",     "anim",
     lambda d: d["animations"]["animation.x"].__setitem__("loop", "Loop")),
    ("olmayan molang fonk",    "anim", _ayarla("vector", ["math.sinn(1)", 0, 0])),
    ("eksik molang arguman",   "anim", _ayarla("vector", ["math.clamp(1,2)", 0, 0])),
    ("easing_args snake_case", "anim", _ayarla("easing_args", [2])),
    ("step adim 1",            "anim",
     lambda d: (_kare(d).__setitem__("easing", "step"),
                _kare(d).__setitem__("easingArgs", [1]))),
    ("bilimsel gosterim",      "anim", _ayarla("vector", ["1e-5*2", 0, 0])),
    ("izinsiz karakter",       "anim", _ayarla("vector", ["math.sin(q.t)*'x'", 0, 0])),
    ("lerp_mode + easing",     "anim", _ayarla("lerp_mode", "catmullrom")),

    ("geo format_version",     "geo",
     lambda d: d.__setitem__("format_version", "1.13.0")),
    ("identifier yok",         "geo",
     lambda d: d["minecraft:geometry"][0]["description"].pop("identifier")),
    ("parent cozulmuyor",      "geo",
     lambda d: d["minecraft:geometry"][0]["bones"][1].__setitem__("parent", "yok")),
    ("cift kemik adi",         "geo",
     lambda d: d["minecraft:geometry"][0]["bones"][1].__setitem__("name", "kok")),
    ("vektor iki bilesen",     "geo",
     lambda d: d["minecraft:geometry"][0]["bones"][0].__setitem__("pivot", [0, 0])),
    ("cube size metin",        "geo",
     lambda d: d["minecraft:geometry"][0]["bones"][1]["cubes"][0]
                .__setitem__("size", [1, "a", 1])),
]


def _agac(anim, geo):
    kok = tempfile.mkdtemp(prefix="bicim_mut_")
    os.makedirs(os.path.join(kok, "P", "animations"))
    os.makedirs(os.path.join(kok, "P", "models"))
    with open(os.path.join(kok, "P", "animations", "a.animation.json"),
              "w", encoding="utf-8") as f:
        json.dump(anim, f)
    with open(os.path.join(kok, "P", "models", "m.geo.json"),
              "w", encoding="utf-8") as f:
        json.dump(geo, f)
    return kok


def _olc(kok):
    r = subprocess.run([sys.executable, DOGRULAYICI, kok],
                       capture_output=True, text=True)
    for satir in r.stdout.splitlines():
        if satir.startswith("HATA :"):
            return int(satir.split(":")[1])
    return -1


def main():
    print("=== BICIM DOGRULAYICI MUTASYON BATARYASI ===")

    # 1. Temiz agac gercekten temiz mi. Degilse butun batarya
    #    anlamsiz: her mutasyon "yakalandi" gorunurdu.
    kok = _agac(TEMIZ_ANIM, TEMIZ_GEO)
    temiz = _olc(kok)
    shutil.rmtree(kok, ignore_errors=True)
    print("  %s temiz agac HATA %d (0 olmali)"
          % ("✓" if temiz == 0 else "✗", temiz))

    sag_kalan = 0 if temiz == 0 else 1
    if temiz != 0:
        print("  temiz agac kirmizi -- batarya anlamsiz, duruldu")
        print("HATA : 1")
        return 1

    for ad, hangi, boz in MUTASYONLAR:
        a, g = copy.deepcopy(TEMIZ_ANIM), copy.deepcopy(TEMIZ_GEO)
        boz(a if hangi == "anim" else g)
        kok = _agac(a, g)
        n = _olc(kok)
        shutil.rmtree(kok, ignore_errors=True)
        if n > 0:
            print("  ✓ yakalandi   %s" % ad)
        else:
            print("  ✗ SAG KALDI   %s  <-- bu kontrol bir sey olcmuyor" % ad)
            sag_kalan += 1

    print("mutasyon: %d   sag kalan: %d" % (len(MUTASYONLAR), sag_kalan))
    print("HATA : %d" % sag_kalan)
    return 1 if sag_kalan else 0


if __name__ == "__main__":
    sys.exit(main())
