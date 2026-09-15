#!/usr/bin/env python3
"""GeckoLib JAR'indan Bedrock animasyon/geometri KURALLARINI cikarir.

   ---- NEDEN VAR ----
   Bu depodaki .animation.json ve .geo.json dosyalarinin bicimi
   hicbir yerde resmi olarak belgelenmemis (bkz. REFERANS_BLOCKBENCH.md:
   Blockbench wiki'si "tam bir sartname yok, kaynak koda bakin" diyor).
   Ayni sorun animasyon tarafinda da var: hangi `easing` adlari
   gecerli, MoLang'de hangi fonksiyonlar var ve kac argument aliyor --
   bunlarin hicbiri yazili degil.

   GeckoLib bu dosyalari GERCEKTEN okuyan, bagimsiz ve calisan bir
   uygulama. Yani sorunun cevabi onun icinde duruyor. Bu betik cevabi
   ORADAN aliyor: JAR'i aciyor, javap ile bytecode'u okuyor ve kural
   tablosunu uretiyor.

   Kullanici kurali (jar_model_coz.py'de de yazili):
     "hafizandan yaparsan belki yanlis cikabilir,
      bunu daha onceden yasadik."
   Bu yuzden listeler elle yazilmiyor, cikariliyor.

   ---- NE URETIYOR ----
   arac/gecko_kurallari.json -- bicim_dogrula.py bunu okuyor.
   JAR olmadan da dogrulama calissin diye JSON depoda duruyor;
   JAR da duruyor ki kural tablosu her zaman yeniden uretilebilsin.

   ---- KULLANIM ----
       python3 addon/arac/gecko_coz.py                 # depodaki JAR
       python3 addon/arac/gecko_coz.py baska.jar       # baska surum

   GeckoLib MIT lisansli (arac/geckolib/LICENSE.txt).
"""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile

ARAC = os.path.dirname(os.path.abspath(__file__))
CIKTI = os.path.join(ARAC, "gecko_kurallari.json")


def varsayilan_jar():
    kok = os.path.join(ARAC, "geckolib")
    if os.path.isdir(kok):
        for ad in sorted(os.listdir(kok)):
            if ad.endswith(".jar"):
                return os.path.join(kok, ad)
    return None


def javap(kok, sinif, bytecode=True):
    """Tek bir .class dosyasini cozer. Yoksa None doner."""
    yol = os.path.join(kok, sinif)
    if not os.path.exists(yol):
        return None
    komut = ["javap", "-p", "-constants"]
    if bytecode:
        komut.append("-c")
    komut.append(yol)
    try:
        return subprocess.run(komut, capture_output=True, text=True,
                              check=False).stdout
    except FileNotFoundError:
        sys.exit("javap bulunamadi. JDK gerekiyor (apt install default-jdk).")


# ---- 1. EASING ADLARI ----------------------------------------------
# EasingType icindeki ldc String sabitleri. Bedrock/Blockbench
# `easing` alanina yazilabilecek adlarin TAMAMI bu.
def easing_adlari(kok):
    c = javap(kok, "com/geckolib/animation/object/EasingType.class")
    if not c:
        return [], None
    adlar = set(re.findall(r'// String ([A-Za-z][A-Za-z0-9_]*)\s*$',
                           c, re.M))
    # Yalniz easing adlari: enum sabit adlari (EASE_IN_BACK) ve
    # ayristirma yardimcilari (steps, stepLength...) elenir.
    adlar = {a for a in adlar
             if a.islower() and (a.startswith("ease") or
                                 a in ("linear", "step", "none",
                                       "catmullrom"))}
    # Adim sayisi siniri da sinifin icinde yazili, ama javap onu
    # GOSTERMIYOR: mesaj `makeConcatWithConstants` ile kuruluyor ve
    # metin, javap'in basmadigi bir onyukleme argumaninda duruyor.
    # O yuzden .class dosyasinin ham baytlarinda araniyor -- sabit
    # havuzu duz metin tuttugu icin bu guvenli.
    en_az_adim = None
    ham = os.path.join(kok, "com/geckolib/animation/object/EasingType.class")
    if os.path.exists(ham):
        with open(ham, "rb") as f:
            m = re.search(rb'Steps must be >= (\d+)', f.read())
        if m:
            en_az_adim = int(m.group(1))
    return sorted(adlar), en_az_adim


# ---- 2. MoLANG FONKSIYONLARI ---------------------------------------
# Her fonksiyon MathFunction'dan tureyor ve iki sey soyluyor:
#   getName()     -> "math.clamp" gibi MoLang adi
#   getMinArgs()  -> en az kac argument istedigi
# Ikisi de sabit dondurdugu icin bytecode'dan dogrudan okunuyor.
def molang_fonksiyonlari(kok):
    taban = os.path.join(kok, "com/geckolib/loading/math/function")
    bulunan = {}
    for dizin, _alt, dosyalar in os.walk(taban):
        for ad in sorted(dosyalar):
            if not ad.endswith(".class") or "$" in ad:
                continue
            bagil = os.path.relpath(os.path.join(dizin, ad), kok)
            c = javap(kok, bagil)
            if not c or "getName()" not in c:
                continue
            isim = _govdeden_string(c, "getName()")
            if not isim or "." not in isim:
                continue
            bulunan[isim] = {
                "en_az_arguman": _govdeden_sayi(c, "getMinArgs()"),
                "sinif": bagil[:-6].replace("/", "."),
            }
    return bulunan


def _govde(cozum, imza):
    """javap ciktisindan tek bir metodun Code govdesini keser."""
    i = cozum.find(imza)
    if i < 0:
        return ""
    j = cozum.find("\n\n", i)
    return cozum[i:j if j > 0 else len(cozum)]


def _govdeden_string(cozum, imza):
    m = re.search(r'// String (.+?)\s*$', _govde(cozum, imza), re.M)
    return m.group(1) if m else None


def _govdeden_sayi(cozum, imza):
    g = _govde(cozum, imza)
    m = re.search(r'\b(?:iconst_(\d)|bipush\s+(\d+)|sipush\s+(\d+))\b', g)
    if not m:
        return None
    return int(next(x for x in m.groups() if x is not None))


# ---- 3. JSON ALAN ADLARI -------------------------------------------
# GSON ayristiriyor, yani SINIF ALANI = JSON ANAHTARI. Alan adi
# JSON'dakinden farkliysa @SerializedName ile yaziliyor ve o da
# bytecode'da string sabiti olarak duruyor.
ALAN = re.compile(r'^\s+(?:private|public|protected)?\s*'
                  r'(?:final\s+)?(?:static\s+)?'
                  r'([\w.$<>\[\], ]+?)\s+(\w+);\s*$', re.M)


def alanlar(kok, sinif):
    c = javap(kok, sinif, bytecode=False)
    if not c:
        return None
    cikan = []
    for tip, ad in ALAN.findall(c):
        tip = tip.strip()
        if ad.isupper() or tip.endswith("[]") and ad == "$VALUES":
            continue
        cikan.append({"ad": ad, "tip": _sadelestir(tip)})
    return cikan


def _sadelestir(tip):
    tip = re.sub(r'\bjava\.lang\.', '', tip)
    tip = re.sub(r'\bjava\.util\.', '', tip)
    tip = re.sub(r'\bcom\.geckolib\.[\w.]*\.', '', tip)
    return tip


# Sinif listesi ELLE TUTULMUYOR: definition/ altindaki her sinif
# aliniyor. Liste tutmak bu depoda defalarca ayristi (bkz.
# paketle.sh v4.75 notu) -- GeckoLib yeni bir alan sinifi
# eklerse burasi kendiliginden gorur.
def semalar(kok):
    taban = os.path.join(kok, "com/geckolib/loading/definition")
    cikan = {}
    for dizin, _alt, dosyalar in os.walk(taban):
        bolum = "geometri" if "geometry" in dizin else "animasyon"
        for ad in sorted(dosyalar):
            if (not ad.endswith(".class") or "$" in ad
                    or ad == "package-info.class"):
                continue
            bagil = os.path.relpath(os.path.join(dizin, ad), kok)
            a = alanlar(kok, bagil)
            if not a:
                continue
            cikan.setdefault(bolum, {})[ad[:-6]] = a
    return cikan


# ---- 2b. MoLANG AYRISTIRMA DESENLERI --------------------------------
# MathParser ifadeyi uc duzenli ifadeyle suzuyor ve ucu de sinifin
# icinde duz metin olarak duruyor:
#   izinli karakter kumesi -- disinda bir karakter varsa ifade
#                             tumuyle gecersiz
#   sayi bicimi            -- BILIMSEL GOSTERIM YOK: 1e-5 sayi
#                             sayilmaz, degisken adi sanilir
#   degisken adi bicimi    -- query.x / v.y gibi
# Desenler buradan aliniyor ki dogrulayici ile ayristirici ayni
# kurali kullansin. Elle kopyalanmiyor.
def molang_desenleri(kok):
    ham = os.path.join(kok, "com/geckolib/loading/math/MathParser.class")
    if not os.path.exists(ham):
        return {}
    with open(ham, "rb") as f:
        metin = f.read().decode("latin-1")
    bulunan = {}
    for d in re.findall(r'\^[^\x00-\x1f]{3,80}?\$', metin):
        if "Lcom/" in d or "Ljava/" in d:
            continue                        # JVM imzasi, desen degil
        if "\\d" in d:
            bulunan["sayi"] = d
        elif d.startswith("^[a-z_]"):
            bulunan["degisken"] = d
        elif "\\s" in d or "+-" in d:
            bulunan["izinli_karakter"] = d
    return bulunan


# ---- 3b. GECERLI loop DEGERLERI ------------------------------------
# LoopType bir kayit defteri: adlar statik kurucuda string olarak
# yaziliyor. ONEMLI -- EasingType.fromString kucuk harfe cevirir,
# LoopType.fromString CEVIRMEZ. Yani "Loop" taninmaz ve sessizce
# play_once'a duser. Liste bu yuzden oldugu gibi aliniyor.
def loop_degerleri(kok):
    c = javap(kok, "com/geckolib/animation/object/LoopType.class")
    if not c:
        return []
    adlar = set(re.findall(r'// String ([a-z_]+)\s*$', c, re.M))
    return sorted(a for a in adlar if " " not in a)


# ---- 4. KABUL EDILEN format_version DEGERLERI ----------------------
# ModelFormatVersion bir enum: her sabit icin once JAVA adi
# (V_1_12_0), hemen ardindan JSON'daki karsiligi (1.12.0) yaziliyor.
# Ikincisini aliyoruz.
def bicim_surumleri(kok):
    c = javap(kok,
              "com/geckolib/loading/definition/geometry/object/"
              "ModelFormatVersion.class")
    if not c:
        return []
    return sorted(set(re.findall(r'// String (\d+\.\d+(?:\.\d+)?)\s*$',
                                 c, re.M)))


# ---- ANA AKIS ------------------------------------------------------
def main():
    jar = sys.argv[1] if len(sys.argv) > 1 else varsayilan_jar()
    if not jar or not os.path.exists(jar):
        sys.exit("JAR bulunamadi. Yol ver: python3 gecko_coz.py <yol.jar>")

    gecici = tempfile.mkdtemp(prefix="gecko_")
    try:
        with zipfile.ZipFile(jar) as z:
            z.extractall(gecici)

        surum = "bilinmiyor"
        mf = os.path.join(gecici, "META-INF", "MANIFEST.MF")
        if os.path.exists(mf):
            m = re.search(r'Implementation-Version:\s*(\S+)',
                          open(mf, encoding="utf-8", errors="replace").read())
            if m:
                surum = m.group(1)

        eas, en_az_adim = easing_adlari(gecici)
        fonk = molang_fonksiyonlari(gecici)
        sema = semalar(gecici)
        surumler = bicim_surumleri(gecici)
        looplar = loop_degerleri(gecici)
        desenler = molang_desenleri(gecici)

        kurallar = {
            "_kaynak": "GeckoLib %s -- %s" % (surum, os.path.basename(jar)),
            "_uretim": "addon/arac/gecko_coz.py ile uretildi, ELLE DUZENLEME",
            "_lisans": "MIT (arac/geckolib/LICENSE.txt)",
            "easing": eas,
            "easing_en_az_adim": en_az_adim,
            "geo_format_version": surumler,
            "loop": looplar,
            "molang_desenleri": desenler,
            "molang_fonksiyonlari": fonk,
            "sema": sema,
        }
        with open(CIKTI, "w", encoding="utf-8") as f:
            json.dump(kurallar, f, ensure_ascii=False, indent=2,
                      sort_keys=True)
            f.write("\n")

        print("GeckoLib %s cozuldu" % surum)
        print("  easing adi        : %d" % len(eas))
        print("  en az adim (step) : %s" % en_az_adim)
        print("  MoLang fonksiyonu : %d" % len(fonk))
        print("  geo format_version: %s" % ", ".join(surumler))
        print("  loop degeri       : %s" % ", ".join(looplar))
        for ad, d in sorted(desenler.items()):
            print("  desen/%-11s: %s" % (ad, d))
        for bolum, siniflar in sema.items():
            print("  %-17s : %d sinif" % ("sema/" + bolum, len(siniflar)))
        print("yazildi: %s" % os.path.relpath(CIKTI, os.path.dirname(ARAC)))
    finally:
        shutil.rmtree(gecici, ignore_errors=True)


if __name__ == "__main__":
    main()
