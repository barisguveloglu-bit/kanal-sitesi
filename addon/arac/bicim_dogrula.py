#!/usr/bin/env python3
"""Bedrock .animation.json ve .geo.json dosyalarini DOGRULAR.

   ---- NE ISE YARIYOR, anim_tara.py'den FARKI NE ----
   `test/anim_tara.py` animasyonlarin BIRBIRIYLE tutarliligina bakiyor:
   cift kimlik, ayrisan kopya, modelde olmayan kemik, animation_length
   asimi. Yani "bu dosyalar birbiriyle uyumlu mu" sorusu.

   Bu betik baska bir soru soruyor: "bu dosya BICIM OLARAK gecerli mi --
   oyun/oynatici bunu gercekten okuyabilir mi". Ikisi ayri sorular ve
   bugune kadar ikincisi hic sorulmuyordu. 379 geo dosyasinin hicbiri
   hicbir sekilde dogrulanmiyordu.

   ---- KURALLAR NEREDEN GELIYOR ----
   arac/gecko_kurallari.json -- GeckoLib 5.5.5'ten `gecko_coz.py` ile
   CIKARILDI, elle yazilmadi. GeckoLib bu dosyalari gercekten okuyan
   bagimsiz bir uygulama; hangi easing adlarinin gecerli oldugunu,
   MoLang'de hangi fonksiyonlarin bulundugunu ve kac argument
   aldiklarini oradan biliyoruz.

   Kullanici kurali: "hafizandan yaparsan belki yanlis cikabilir."

   ---- NE ARIYOR ----
   Animasyon:
     · format_version var mi
     · loop degeri gecerli mi (true/false/"hold_on_last_frame")
     · `easing` adi GERCEKTEN var mi (34 adin disindaki sessizce
       dogrusalla degistirilir -- yani yazim hatasi HIC belli olmaz)
     · easing "step" ise easingArgs >= 2 mi (altindaki deger
       oynaticida istisna atiyor)
     · MoLang ifadeleri: fonksiyon var mi, yeterli argument var mi,
       parantezler kapaniyor mu
   Geometri:
     · format_version kabul edilen surumlerden biri mi
     · her tanimin description.identifier'i var mi
     · kemigin `parent`i AYNI dosyada tanimli mi (degilse kemik
       koke yapisir ve model sessizce yanlis durur)
     · ayni geometride cift kemik adi var mi
     · origin/size/pivot/rotation uc bilesenli sayi dizisi mi

   Cikti bicimi anim_tara.py ile AYNI: son satirda "HATA : <n>".
   Boylece test tarafi tek bir kalipla ikisini de okuyabiliyor.

   ---- KULLANIM ----
       python3 addon/arac/bicim_dogrula.py
"""
import json, os, re, sys

ARAC = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.dirname(ARAC)
KURAL_YOLU = os.path.join(ARAC, "gecko_kurallari.json")

BULGU = []


def bul(nerede, ne):
    BULGU.append((nerede, ne))


def kurallari_oku():
    if not os.path.exists(KURAL_YOLU):
        sys.exit("gecko_kurallari.json yok. Once: python3 arac/gecko_coz.py")
    return json.load(open(KURAL_YOLU, encoding="utf-8"))


K = kurallari_oku()
EASING = set(K["easing"])
EN_AZ_ADIM = K["easing_en_az_adim"]
FONKSIYONLAR = K["molang_fonksiyonlari"]
GEO_SURUMLER = set(K["geo_format_version"])

# GeckoLib easing adlarini kucuk harfe indirip karsilastiriyor;
# dosyalarda "easeInOutBack" yaziyor, tabloda "easeinoutback".
#
# loop DEGERLERI: JSON boolean'i ya da LoopType defterindeki bir ad.
# DIKKAT -- EasingType.fromString kucuk harfe cevirir ama
# LoopType.fromString CEVIRMEZ. Yani "Loop" taninmaz ve sessizce
# play_once olur. O yuzden buyuk/kucuk harf AYNEN karsilastiriliyor.
LOOP_ADLARI = set(K.get("loop") or [])
DESEN = K.get("molang_desenleri") or {}
IZINLI = re.compile(DESEN["izinli_karakter"]) if "izinli_karakter" in DESEN else None
SAYI = re.compile(DESEN["sayi"]) if "sayi" in DESEN else None


# ---- MoLANG -------------------------------------------------------
# Tam bir ayristirici degil, KASITLI olarak: amac ifadeyi hesaplamak
# degil, yanlis yazilmis fonksiyon adini ve eksik argumani yakalamak.
# Fonksiyon cagrisini ve argument sayisini cikarmak icin parantez
# derinligi sayiliyor -- ic ice cagri ve virgul bu yuzden dogru
# bolunuyor.
FONK_CAGRI = re.compile(r'\b((?:math|query|q|variable|v|temp|t)\.[a-z_0-9]+)\s*\(')


def molang_dogrula(ifade, nerede):
    if ifade.count("(") != ifade.count(")"):
        bul(nerede, "MoLang parantezleri kapanmiyor: %r" % ifade)
        return

    # MathParser once karakter kumesini suzuyor: disinda tek bir
    # karakter varsa ifade TUMUYLE reddediliyor. Tirnak ve koseli
    # parantez bu kumede YOK -- Bedrock'tan kopyalanan ifadelerde
    # en sik goruleni budur.
    if IZINLI is not None and not IZINLI.match(ifade):
        disarda = sorted({c for c in ifade if not IZINLI.match(c)})
        bul(nerede, "MoLang izinsiz karakter iceriyor (%s): %r"
            % (" ".join(repr(c) for c in disarda), ifade))
        return

    # Bilimsel gosterim SAYI SAYILMIYOR: 1e-5 sayi deseni ile
    # eslesmedigi icin degisken adi sanilir ve sessizce 0 olur.
    if SAYI is not None:
        for parca in re.findall(r'\d+\.?\d*[eE][-+]?\d+', ifade):
            bul(nerede, "MoLang bilimsel gosterimi tanimiyor: %r "
                        "(%r icinde; sessizce 0 olur)" % (parca, ifade))

    for m in FONK_CAGRI.finditer(ifade):
        ad = m.group(1)
        if not ad.startswith("math."):
            continue                      # query./variable. cagrilari degisken
        if ad not in FONKSIYONLAR:
            yakin = [f for f in FONKSIYONLAR if f.split(".")[1][:3] == ad.split(".")[1][:3]]
            bul(nerede, "MoLang fonksiyonu YOK: %s%s"
                % (ad, ("  (benzer: %s)" % ", ".join(sorted(yakin)[:3])) if yakin else ""))
            continue
        n = _arguman_say(ifade, m.end())
        en_az = FONKSIYONLAR[ad]["en_az_arguman"]
        if en_az is not None and n is not None and n < en_az:
            bul(nerede, "%s en az %d argument ister, %d verilmis: %r"
                % (ad, en_az, n, ifade))


def _arguman_say(ifade, bas):
    """`bas` acilis parantezinin HEMEN sonrasi. Argument sayisini verir."""
    derinlik, sayac, govde_var = 1, 1, False
    for ch in ifade[bas:]:
        if ch == "(":
            derinlik += 1
        elif ch == ")":
            derinlik -= 1
            if derinlik == 0:
                return sayac if govde_var else 0
        elif ch == "," and derinlik == 1:
            sayac += 1
        elif not ch.isspace():
            govde_var = True
    return None                            # kapanmamis; ustte yakalandi


def deger_dogrula(d, nerede):
    """Keyframe bileseni: sayi ya da MoLang metni."""
    if isinstance(d, str):
        molang_dogrula(d, nerede)
    elif not isinstance(d, (int, float)):
        bul(nerede, "keyframe bileseni sayi ya da metin olmali: %r" % (d,))


# ---- ANIMASYON ----------------------------------------------------
def animasyon_dogrula(yol):
    try:
        d = json.load(open(yol, encoding="utf-8"))
    except Exception as e:
        bul(yol, "JSON okunamadi: %s" % e)
        return
    kisa = os.path.relpath(yol, ADDON)

    if "format_version" not in d:
        bul(kisa, "format_version yok")

    for ad, a in (d.get("animations") or {}).items():
        yer = "%s :: %s" % (kisa, ad)
        if not isinstance(a, dict):
            bul(yer, "animasyon govdesi nesne degil")
            continue

        if "loop" in a:
            lv = a["loop"]
            gecerli = isinstance(lv, bool) or (isinstance(lv, str)
                                               and lv in LOOP_ADLARI)
            if not gecerli:
                bul(yer, "loop degeri gecersiz: %r  (gecerli: true/false ya "
                         "da %s -- buyuk/kucuk harf AYNEN, taninmayan deger "
                         "sessizce play_once olur)"
                    % (lv, ", ".join(sorted(LOOP_ADLARI))))

        for kemik, kd in (a.get("bones") or {}).items():
            if not isinstance(kd, dict):
                bul("%s :: %s" % (yer, kemik), "kemik govdesi nesne degil")
                continue
            for kanal, icerik in kd.items():
                _kanal_dogrula(icerik, "%s :: %s.%s" % (yer, kemik, kanal))


def _kanal_dogrula(icerik, yer):
    if isinstance(icerik, list):           # tek, zamansiz deger
        for e in icerik:
            deger_dogrula(e, yer)
        return
    if isinstance(icerik, (int, float, str)):
        deger_dogrula(icerik, yer)
        return
    if not isinstance(icerik, dict):
        bul(yer, "kanal govdesi taninmadi: %r" % type(icerik).__name__)
        return

    for zaman, kare in icerik.items():
        _kare_dogrula(kare, "%s @ %s" % (yer, zaman))


def _kare_dogrula(kare, yer):
    if isinstance(kare, list):
        for e in kare:
            deger_dogrula(e, yer)
        return
    if isinstance(kare, (int, float, str)):
        deger_dogrula(kare, yer)
        return
    if not isinstance(kare, dict):
        bul(yer, "keyframe taninmadi: %r" % type(kare).__name__)
        return

    e = kare.get("easing")
    if e is not None:
        if not isinstance(e, str):
            bul(yer, "easing metin olmali: %r" % (e,))
        elif e.lower() not in EASING:
            bul(yer, "easing adi YOK: %r  (GeckoLib bunu tanimiyor; "
                     "tanimayan oynatici sessizce dogrusala duser)" % e)
        elif e.lower() == "step":
            _adim_dogrula(kare.get("easingArgs"), yer)

    # easingArgs ANIMASYON JSON'UNDAKI TEK camelCase ANAHTAR.
    # Depodaki oteki her sey snake_case oldugu icin refleksle
    # "easing_args" yazmak cok kolay -- ve o anahtar sessizce yok
    # sayilir, hicbir uyari cikmaz.
    if "easing_args" in kare:
        bul(yer, "easing_args yazilmis ama dogru anahtar easingArgs "
                 "(camelCase). Bu hali sessizce yok sayilir.")

    ea = kare.get("easingArgs")
    if ea is not None and not isinstance(ea, list):
        bul(yer, "easingArgs dizi olmali: %r" % (ea,))

    # lerp_mode varsa easing HIC okunmuyor -- ikisi birlikte
    # yazilmissa easing olu demektir.
    if "lerp_mode" in kare and kare.get("easing") is not None:
        bul(yer, "hem lerp_mode hem easing var; lerp_mode varken "
                 "easing hic okunmuyor, easing olu")

    for anahtar in ("vector", "pre", "post"):
        v = kare.get(anahtar)
        if v is None:
            continue
        if isinstance(v, dict):
            _kare_dogrula(v, "%s/%s" % (yer, anahtar))
        elif isinstance(v, list):
            for x in v:
                deger_dogrula(x, "%s/%s" % (yer, anahtar))
        else:
            deger_dogrula(v, "%s/%s" % (yer, anahtar))


def _adim_dogrula(ea, yer):
    """easing "step" icin adim sayisi.

       DIKKAT -- easingArgs'in OLMAMASI hata DEGIL. Bu ilk yazilista
       hata sayildi ve depodaki dort kareyi yanlislikla suclu cikardi.
       GeckoLib'in bytecode'u kesin konusuyor (EasingType.step):

           aload_0 / ifnonnull -> arguman yoksa 2.0 kullan
           deger < 2.0 ise IllegalArgumentException

       Yani varsayilan 2 ve gecerli. Istisna YALNIZCA acikca 2'nin
       altinda bir deger yazilirsa atiliyor. Kural buradan okundu,
       tahmin edilmedi.                                            """
    if EN_AZ_ADIM is None or ea is None:
        return
    if not isinstance(ea, list) or not ea:
        return
    ilk = ea[0]
    if isinstance(ilk, (int, float)) and ilk < EN_AZ_ADIM:
        bul(yer, "step adim sayisi %s -- GeckoLib en az %d istiyor, "
                 "altinda istisna atiyor" % (ilk, EN_AZ_ADIM))


# ---- GEOMETRI -----------------------------------------------------
def geometri_dogrula(yol):
    try:
        d = json.load(open(yol, encoding="utf-8"))
    except Exception as e:
        bul(yol, "JSON okunamadi: %s" % e)
        return
    kisa = os.path.relpath(yol, ADDON)

    fv = d.get("format_version")
    if fv is None:
        bul(kisa, "format_version yok")
    elif fv not in GEO_SURUMLER:
        bul(kisa, "format_version %r kabul edilmiyor (gecerli: %s)"
            % (fv, ", ".join(sorted(GEO_SURUMLER))))

    tanimlar = d.get("minecraft:geometry")
    if tanimlar is None:
        return                              # eski tekil bicim; kapsam disi
    if not isinstance(tanimlar, list):
        bul(kisa, "minecraft:geometry dizi olmali")
        return

    for i, g in enumerate(tanimlar):
        _tanim_dogrula(g, "%s [%d]" % (kisa, i))


def _tanim_dogrula(g, yer):
    if not isinstance(g, dict):
        bul(yer, "geometri tanimi nesne degil")
        return
    kimlik = (g.get("description") or {}).get("identifier")
    if not kimlik:
        bul(yer, "description.identifier yok")
    else:
        yer = "%s %s" % (yer, kimlik)

    kemikler = g.get("bones") or []
    if not isinstance(kemikler, list):
        bul(yer, "bones dizi olmali")
        return

    adlar, gorulen = set(), set()
    for k in kemikler:
        if not isinstance(k, dict):
            continue
        ad = k.get("name")
        if not ad:
            bul(yer, "adsiz kemik var")
            continue
        if ad in gorulen:
            bul(yer, "CIFT kemik adi: %s" % ad)
        gorulen.add(ad)
        adlar.add(ad)

    for k in kemikler:
        if not isinstance(k, dict):
            continue
        ad = k.get("name", "?")
        ust = k.get("parent")
        if ust is not None and ust not in adlar:
            bul(yer, "kemik %s: parent %r AYNI dosyada tanimli degil "
                     "(kemik koke yapisir, model sessizce yanlis durur)"
                % (ad, ust))
        for alan in ("pivot", "rotation"):
            _vektor_dogrula(k.get(alan), "%s :: %s.%s" % (yer, ad, alan))
        for j, kup in enumerate(k.get("cubes") or []):
            if not isinstance(kup, dict):
                bul("%s :: %s" % (yer, ad), "cubes[%d] nesne degil" % j)
                continue
            for alan in ("origin", "size", "pivot", "rotation"):
                _vektor_dogrula(kup.get(alan),
                                "%s :: %s.cubes[%d].%s" % (yer, ad, j, alan))


def _vektor_dogrula(v, yer):
    if v is None:
        return
    if not isinstance(v, list) or len(v) != 3:
        bul(yer, "uc bilesenli dizi olmali: %r" % (v,))
        return
    for e in v:
        if not isinstance(e, (int, float)):
            bul(yer, "bilesen sayi olmali: %r" % (e,))


# ---- ANA AKIS -----------------------------------------------------
def dosyalari_bul():
    anim, geo = [], []
    for paket in sorted(os.listdir(ADDON)):
        p = os.path.join(ADDON, paket)
        if not os.path.isdir(p):
            continue
        a = os.path.join(p, "animations")
        if os.path.isdir(a):
            for kok, _alt, ds in os.walk(a):
                anim += [os.path.join(kok, x) for x in sorted(ds)
                         if x.endswith(".json")]
        m = os.path.join(p, "models")
        if os.path.isdir(m):
            for kok, _alt, ds in os.walk(m):
                geo += [os.path.join(kok, x) for x in sorted(ds)
                        if x.endswith(".json")]
    return anim, geo


def main():
    # Isteyen baska bir kok verebilir. Bu SUS DEGIL: mutasyon
    # sinamalari gecici bir agac kurup dogrulayiciyi ona
    # dogrultuyor, boylece "bu kontrol gercekten isiriyor mu"
    # sorusu depoyu bozmadan cevaplanabiliyor.
    global ADDON
    if len(sys.argv) > 1:
        ADDON = os.path.abspath(sys.argv[1])

    anim, geo = dosyalari_bul()
    for y in anim:
        animasyon_dogrula(y)
    for y in geo:
        geometri_dogrula(y)

    print("=== BICIM DOGRULAMA ===")
    print("kaynak: %s" % K["_kaynak"])
    print("animasyon dosyasi: %d" % len(anim))
    print("geometri dosyasi: %d" % len(geo))
    print("easing adi: %d   MoLang fonksiyonu: %d"
          % (len(EASING), len(FONKSIYONLAR)))
    for nerede, ne in BULGU:
        print("  - %s :: %s" % (nerede, ne))
    print("HATA : %d" % len(BULGU))
    return 1 if BULGU else 0


if __name__ == "__main__":
    sys.exit(main())
