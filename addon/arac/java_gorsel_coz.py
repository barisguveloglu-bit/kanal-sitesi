#!/usr/bin/env python3
"""Java kaynak paketi model biçimini BEDROCK geometrisine çevirir.

   ---- NEDEN VAR, jar_model_coz.py'den FARKI NE ----
   Java tarafında model İKİ ayrı biçimde duruyor ve ikisi de bize
   lazım oluyor:

     1. `ModelBase` alt sinifi           -> bytecode'da gomulu
        Bunu `jar_model_coz.py` cozuyor (v7.94.3).
     2. Kaynak paketi model JSON'u       -> `elements` listesi
        BUNU HICBIR SEY COZMUYORDU. Bu dosya o bosluk.

   Ikincisi Blockbench'in Java biciminde kaydettigi seydir ve
   modern modlarda (1.14+) varliklarin disindaki her sey boyle:
   esya modelleri, blok modelleri, silahlar, zirh parcalari.

   ---- CEVRIM ----
   Java `elements` 0-16 kutusunda calisiyor ve blogun KOSESI
   sifir noktasi. Bedrock ise blogu ORTALIYOR:

       origin_bedrock = [ from.x - 8,  from.y,  from.z - 8 ]
       size           = to - from

   Y KAYMIYOR: iki tarafta da +Y yukari. Kayan yalniz X ve Z.

   Bu tahmin degil, depodan olculdu: `Simsek_Kol_Kaynak/models/
   blocks/` altindaki blok geometrilerinin kemiklerinin HEPSI
   `pivot [-8, 0, -8]` tasiyor. Ayni kaydirma.
   (Karsilastir: jar_model_coz.py'nin ModelBase cevrimi BASKA --
   orada +Y asagi oldugu icin `24 - y` var. Iki bicim iki ayri
   kural; karistirmak sessiz bir hata olurdu.)

   ---- UV ----
   Java yuz uv'si [u1, v1, u2, v2] ve HER ZAMAN 0-16 olceginde,
   dokunun gercek cozunurlugu ne olursa olsun. Bedrock ise gercek
   piksel istiyor. Olcek `--doku` ile veriliyor (varsayilan 16,
   yani birebir).

   ---- KULLANIM ----
       python3 addon/arac/java_gorsel_coz.py model.json --kimlik geometry.x
       python3 addon/arac/java_gorsel_coz.py model.json --rapor
       python3 addon/arac/java_gorsel_coz.py --kendini-sina

   `--rapor` cevirmeden OLCER: kac eleman var, kaci dejenere
   (sifir kalinlikli duzlem), Bedrock'ta makul mu. Bu mod bir
   modelin ALINMAYA DEGER olup olmadigini once sormak icin --
   NarutoMod'un Shukaku modeli 82.558 elemandi ve %100'u
   dejenere duzlemdi, yani cevrilebilirdi ama kullanilamazdi.
"""
import json, os, sys

ARAC = os.path.dirname(os.path.abspath(__file__))

# Deponun kendi blok geometrilerinden olculdu: bütün kemikler
# pivot [-8, 0, -8] tasiyor.
BLOK_KAYDIRMA = 8.0

# Deponun 379 geometrisinde kutu sayisi ortanca 17, en buyuk 285.
# Bunun cok ustu Bedrock'ta cizilmez; --rapor bunu soyluyor.
MAKUL_KUTU = 285


def kosleri_duzelt(frm, to):
    """from > to olan ekseni takas eder.

    Java bunu TOLERE EDIYOR: ters yazilmis bir kutu ayni kutuyu
    ciziyor. Bedrock etmiyor -- ters eksen negatif `size` uretir ve
    kutu cizilmez. v7.94.8'e kadar cevirici bunu sessizce geciriyordu:
    Craftformers'in `energon_tank` modeli `size: [-15.996, ...]`
    olarak cikiyor, `bicim_dogrula.py` de onu geciriyordu.
    Dogru cevrim kutuyu normallestirmek -- niyet korunur, cikti
    gecerli olur.
    """
    a = [min(frm[i], to[i]) for i in range(3)]
    b = [max(frm[i], to[i]) for i in range(3)]
    return a, b


def cevir_origin(frm, to):
    """Java element kosesi -> Bedrock cube origin."""
    frm, to = kosleri_duzelt(frm, to)
    return [frm[0] - BLOK_KAYDIRMA, frm[1], frm[2] - BLOK_KAYDIRMA]


def cevir_boyut(frm, to):
    frm, to = kosleri_duzelt(frm, to)
    return [to[0] - frm[0], to[1] - frm[1], to[2] - frm[2]]


def cevir_uv(yuz_uv, doku_olcek):
    """Java [u1,v1,u2,v2] (0-16) -> Bedrock uv + uv_size (piksel)."""
    k = doku_olcek / 16.0
    u1, v1, u2, v2 = [x * k for x in yuz_uv]
    return [u1, v1], [u2 - u1, v2 - v1]


JAVA_YUZ = {"north": "north", "south": "south", "east": "east",
            "west": "west", "up": "up", "down": "down"}


def _yuvarla(v, n=4):
    return [round(float(x), n) + 0.0 for x in v]


def elemani_cevir(e, doku_olcek):
    frm, to = e.get("from"), e.get("to")
    if not (isinstance(frm, list) and isinstance(to, list)
            and len(frm) == 3 and len(to) == 3):
        return None
    kutu = {
        "origin": _yuvarla(cevir_origin(frm, to)),
        "size": _yuvarla(cevir_boyut(frm, to)),
    }
    # Yuz uv'leri: Bedrock per-face uv destekliyor.
    yuzler = e.get("faces") or {}
    uv = {}
    for ad, y in yuzler.items():
        if ad not in JAVA_YUZ or not isinstance(y, dict):
            continue
        yu = y.get("uv")
        if not (isinstance(yu, list) and len(yu) == 4):
            continue
        k, b = cevir_uv(yu, doku_olcek)
        uv[JAVA_YUZ[ad]] = {"uv": _yuvarla(k), "uv_size": _yuvarla(b)}
    if uv:
        kutu["uv"] = uv

    # Java element donusu: tek eksen, sabit acilar. Bedrock'ta
    # kutu pivot + rotation ile ayni sey yapiliyor.
    d = e.get("rotation")
    if isinstance(d, dict) and "axis" in d and "angle" in d:
        org = d.get("origin") or [8, 8, 8]
        kutu["pivot"] = _yuvarla([org[0] - BLOK_KAYDIRMA, org[1],
                                  org[2] - BLOK_KAYDIRMA])
        aci = float(d["angle"])
        eksen = d["axis"]
        # Bedrock donusu matematiksel donusun TERSI (bkz.
        # REFERANS_BORALO.md: 1184 kup uzerinde olculdu).
        kutu["rotation"] = _yuvarla([
            -aci if eksen == "x" else 0,
            aci if eksen == "y" else 0,
            aci if eksen == "z" else 0,
        ])
    return kutu


def olc(model):
    """Cevirmeden olcer: eleman sayisi, dejenere oran, hüküm."""
    e = model.get("elements") or []
    dej = 0
    tekyuz = 0
    ters = 0
    for x in e:
        frm, to = x.get("from"), x.get("to")
        if isinstance(frm, list) and isinstance(to, list) and len(frm) == 3:
            if any(abs(to[i] - frm[i]) < 1e-9 for i in range(3)):
                dej += 1
            # from > to: Java tolere eder, Bedrock etmez. Cevirici
            # bunu duzeltiyor (kosleri_duzelt), ama raporun bunu
            # SOYLEMESI gerekiyor -- sessizce duzeltilen bir sey,
            # kaynagin bozuk oldugunu gizler.
            if any(frm[i] > to[i] for i in range(3)):
                ters += 1
        if len(x.get("faces") or {}) == 1:
            tekyuz += 1
    return {
        "eleman": len(e),
        "dejenere": dej,
        "tek_yuzlu": tekyuz,
        "ters": ters,
        "makul": len(e) <= MAKUL_KUTU,
    }


def cevir(model, kimlik, doku_olcek):
    kutular = []
    atlanan = 0
    for e in (model.get("elements") or []):
        k = elemani_cevir(e, doku_olcek)
        if k is None:
            atlanan += 1
            continue
        kutular.append(k)
    geo = {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": kimlik,
                "texture_width": int(doku_olcek),
                "texture_height": int(doku_olcek),
                "visible_bounds_width": 3,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1, 0],
            },
            # Java model biciminde kemik YOK -- duz eleman listesi.
            # Hepsi tek kemige konuyor; pivot deponun blok
            # geometrileriyle ayni.
            "bones": [{
                "name": "govde",
                "pivot": [-BLOK_KAYDIRMA, 0, -BLOK_KAYDIRMA],
                "cubes": kutular,
            }],
        }],
    }
    return geo, atlanan


# ---- KENDINI SINAMA ----------------------------------------------
# Capa: TAM BLOK. Java'da from [0,0,0] to [16,16,16] bir blogun
# tamami demek. Bedrock'ta ayni sey origin [-8,0,-8] size [16,16,16].
# Kaydirma deponun kendi blok geometrilerinden olculdu (hepsinin
# kemik pivotu [-8, 0, -8]).
CAPALAR = [
    ("tam blok", [0, 0, 0], [16, 16, 16], [-8.0, 0.0, -8.0], [16.0, 16.0, 16.0]),
    ("alt yarim", [0, 0, 0], [16, 8, 16], [-8.0, 0.0, -8.0], [16.0, 8.0, 16.0]),
    ("orta sutun", [6, 0, 6], [10, 16, 10], [-2.0, 0.0, -2.0], [4.0, 16.0, 4.0]),
]


def kendini_sina():
    kalan = 0
    print("=== JAVA -> BEDROCK GORSEL CEVRIM CAPALARI ===")
    print("(kaydirma deponun blok geometrilerinden olculdu: pivot [-8,0,-8])")
    for ad, frm, to, bek_o, bek_b in CAPALAR:
        o = _yuvarla(cevir_origin(frm, to))
        b = _yuvarla(cevir_boyut(frm, to))
        ok = (o == bek_o and b == bek_b)
        if not ok:
            kalan += 1
        print("  %s %-11s origin %-18s size %s" % ("✓" if ok else "✗", ad, o, b))
        if not ok:
            print("      BEKLENEN origin %s size %s" % (bek_o, bek_b))

    # UV capasi: 16'lik dokuda Java uv'si birebir gecmeli.
    k, b = cevir_uv([0, 0, 16, 16], 16)
    uv_ok = (k == [0.0, 0.0] and b == [16.0, 16.0])
    if not uv_ok:
        kalan += 1
    print("  %s uv 16'lik dokuda birebir  %s %s"
          % ("✓" if uv_ok else "✗", k, b))
    # 64'luk dokuda dort katina cikmali
    k2, b2 = cevir_uv([0, 0, 16, 16], 64)
    uv2_ok = (b2 == [64.0, 64.0])
    if not uv2_ok:
        kalan += 1
    print("  %s uv 64'luk dokuda olcekleniyor  %s" % ("✓" if uv2_ok else "✗", b2))

    print("HATA : %d" % kalan)
    return 1 if kalan else 0


# ---- ANA AKIS ----------------------------------------------------
def main():
    arg = sys.argv[1:]
    if "--kendini-sina" in arg:
        return kendini_sina()
    if not arg:
        sys.exit(__doc__.strip().split("\n\n")[-1])

    yol = arg[0]
    kimlik = "geometry.cozulen"
    rapor = "--rapor" in arg
    if "--kimlik" in arg:
        kimlik = arg[arg.index("--kimlik") + 1]

    with open(yol, encoding="utf-8") as f:
        model = json.load(f)

    # ---- DOKU OLCEGI MODELDEN OKUNUYOR (v7.96.4) ----
    # Java modeli kendi doku olcegini `texture_size` ile YAZIYOR
    # ve 16 disinda bir deger sik: F-Tech'in matkabi ve yaprak
    # temizleyicisi ikisi de [32, 32].
    #
    # Eskiden bu alan HIC okunmuyordu; olcek yalniz `--doku` ile
    # veriliyordu ve verilmezse 16 varsayiliyordu. 32'lik bir
    # modeli bayrak vermeden cevirmek UV'leri yariya indiriyor:
    # cikti gecerli JSON, oyun kabul ediyor, doku KAYIK duruyor --
    # yani sessiz hata. Java `elements` cevriminin Y kuralini
    # ModelBase'e uygulamakla ayni sinifta bir hata.
    #
    # Artik sira su: `--doku` > modelin `texture_size` > 16.
    doku = 16.0
    model_olcek = model.get("texture_size")
    if isinstance(model_olcek, list) and len(model_olcek) == 2:
        try:
            en, boy = float(model_olcek[0]), float(model_olcek[1])
        except (TypeError, ValueError):
            en = boy = 0.0
        if en > 0 and boy > 0:
            if en != boy:
                sys.stderr.write("DIKKAT: texture_size kare degil (%g x %g). "
                                 "Bedrock kare olcek istiyor; en buyuk kenar "
                                 "kullanildi.\n" % (en, boy))
            doku = max(en, boy)
    if "--doku" in arg:
        doku = float(arg[arg.index("--doku") + 1])

    o = olc(model)
    o["doku_olcek"] = doku
    sys.stderr.write("doku olcegi: %g (%s)\n"
                     % (doku, "--doku" if "--doku" in arg
                        else ("texture_size" if model.get("texture_size")
                              else "varsayilan")))
    sys.stderr.write("eleman: %d · dejenere (sifir kalinlikli): %d · tek yuzlu: %d"
                     " · ters kutu: %d\n"
                     % (o["eleman"], o["dejenere"], o["tek_yuzlu"], o["ters"]))
    if o["ters"]:
        sys.stderr.write("NOT: %d eleman ters yazilmis (from > to). Java bunu "
                         "tolere ediyor, Bedrock etmiyor; cevirici duzeltiyor "
                         "ama kaynak bozuk.\n" % o["ters"])
    if not o["makul"]:
        sys.stderr.write("DIKKAT: %d eleman, deponun en buyuk geometrisi %d kutu. "
                         "Bedrock'ta bu olcek cizilmez.\n" % (o["eleman"], MAKUL_KUTU))
    if o["eleman"] and o["dejenere"] == o["eleman"]:
        sys.stderr.write("DIKKAT: elemanlarin HEPSI sifir kalinlikli duzlem. "
                         "Bu bir kup modeli degil, duzlem yigini.\n")
    if rapor:
        print(json.dumps(o, indent=2, ensure_ascii=False))
        return 0

    geo, atlanan = cevir(model, kimlik, doku)
    if atlanan:
        sys.stderr.write("ATLANAN ELEMAN: %d (from/to okunamadi)\n" % atlanan)
    print(json.dumps(geo, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
