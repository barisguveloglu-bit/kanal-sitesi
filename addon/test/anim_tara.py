#!/usr/bin/env python3
"""Butun animasyonlari tarar ve bozukluk arar."""
import json, os, glob, collections, re

KOK = "/home/user/kanal-sitesi/addon"
PAKETLER = ["Simsek_Kol_Kaynak", "Simsek_Oyuncu_Modeli"]
BULGU = []
def bul(agirlik, nerede, ne):
    BULGU.append((agirlik, nerede, ne))

def oku(y):
    try: return json.load(open(y, encoding="utf-8"))
    except Exception as e: bul("HATA", y, "JSON okunamadi: %s" % e); return None

# ---------- 1. animasyon dosyalari ----------
anim = {}          # kimlik -> (dosya, govde)
for p in PAKETLER:
    for y in glob.glob(os.path.join(KOK, p, "animations", "*.json")):
        d = oku(y)
        if not d: continue
        if "animations" not in d:
            bul("HATA", y, "'animations' anahtari yok"); continue
        for k, v in d["animations"].items():
            if k in anim:
                onceki_y, onceki_v = anim[k]
                ayni_paket = (onceki_y.split("/addon/")[1].split("/")[0] ==
                              y.split("/addon/")[1].split("/")[0])
                farkli = (json.dumps(onceki_v, sort_keys=True) !=
                          json.dumps(v, sort_keys=True))
                # AYRI PAKETLERDE ayni kimlik NORMAL: her paket tek
                # basina kurulabilmeli, yani kendi kopyasini
                # tasimali. Tehlike ikisinin AYRISMASI -- uretec
                # ikisini de tek kaynaktan (SEY_ANIM) yaziyor ve
                # burada esitlikleri siniyor.
                if ayni_paket:
                    bul("HATA", y, "AYNI PAKETTE cift kimlik: %s" % k)
                elif farkli:
                    bul("HATA", y, "iki pakette AYRISMIS kimlik: %s (%s)"
                        % (k, onceki_y))
            anim[k] = (y, v)
            # Bedrock kurali: kimlik "animation." ile baslamali
            if not k.startswith("animation."):
                bul("HATA", y, "kimlik 'animation.' ile baslamiyor: %s" % k)

# ---------- 2. denetleyiciler ----------
ctrl = {}
for p in PAKETLER:
    for y in glob.glob(os.path.join(KOK, p, "animation_controllers", "*.json")):
        d = oku(y)
        if not d: continue
        for k, v in (d.get("animation_controllers") or {}).items():
            ctrl[k] = (y, v)
            if not k.startswith("controller.animation."):
                bul("HATA", y, "denetleyici kimligi yanlis: %s" % k)

# ---------- 3. animasyonlari KIM kullaniyor ----------
kullanan = collections.defaultdict(list)
def tara_varlik(y, kok):
    d = oku(y)
    if not d: return
    a = (d.get(kok) or {}).get("description") or {}
    haritalar = a.get("animations") or {}
    for kisa, kimlik in haritalar.items():
        kullanan[kimlik].append((y, kisa))
    # scripts.animate'te gecen kisa adlar tanimli mi
    tanimli = set(haritalar)
    for e in ((a.get("scripts") or {}).get("animate") or []):
        ad = e if isinstance(e, str) else list(e)[0]
        if ad not in tanimli:
            bul("HATA", y, "scripts.animate'te TANIMSIZ ad: %s" % ad)

for p in PAKETLER:
    for y in glob.glob(os.path.join(KOK, p, "entity", "*.json")):
        tara_varlik(y, "minecraft:client_entity")
    for y in glob.glob(os.path.join(KOK, p, "attachables", "*.json")):
        tara_varlik(y, "minecraft:attachable")

# ---------- 4. eksik / oksuz ----------
VANILLA = re.compile(r"^(animation|controller\.animation)\.("
                     r"player|humanoid|persona|skeleton|common)\b")
for kimlik, yerler in kullanan.items():
    if kimlik in anim or kimlik in ctrl: continue
    if VANILLA.match(kimlik): continue
    bul("HATA", yerler[0][0], "animasyon YOK: %s" % kimlik)

# script'ten playAnimation ile oynatilanlar
#
# ---- KOR NOKTA DUZELTILDI (v7.27) ----
# Onceki bicim r'"(animation\.[a-z0-9_.]+)"' idi, yani kimlik
# metnin TAMAMI olmak zorundaydi. Oysa depodaki kalicilarin
# hepsi argumanli yaziliyor:
#     YAMULT_ANIM  = "animation.fox.sleep a 9999"
#     DONDUR_ANIM  = "animation.evoker.general a 999"
#     BEDEN_ANIM   = "animation.villager.get_in_bed a 9999"
# Kapanis tirnagi hemen kimligin ardindan gelmedigi icin
# bunlarin HICBIRI taranmiyordu. Yani tarayici, modun
# gercekten oynattigi pozlari yillardir hic gormemis.
# Artik kimligin ardindan bosluk da gelebiliyor.
ANIM_METIN = re.compile(r'"(animation\.[a-z0-9_.]+)(?:[ "])')
script_oynatilan = set()
for y in glob.glob(os.path.join(KOK, "Simsek_TNT_ToprakTopu/scripts/**/*.js"),
                   recursive=True):
    m = open(y, encoding="utf-8").read()
    for x in re.findall(ANIM_METIN, m):
        script_oynatilan.add(x)
ayar = open(os.path.join(KOK, "Simsek_TNT_ToprakTopu/scripts/ayarlar.js"),
            encoding="utf-8").read()
for x in re.findall(ANIM_METIN, ayar):
    script_oynatilan.add(x)
# v5.8: WOM_SERI ozel cozumlemesi buradaydi, mod kaldirilinca
# olu kod oldu. (Cikardigi ders duruyor: seri adlarini kaba bir
# regex'le okumak 27 silah adini animasyon sanip 69 sahte uyari
# uretmisti -- tarayici da koddur, o da sinanmali.)

# ---- DIS (oyunun kendi) ANIMASYONLARI ----
# Bunlar bizim paketimizde OLMAMALI -- oyunun icinde
# duruyorlar. Onceki surumde bunlar da SUPHE sayiliyordu ve
# v7.27'de 39 poz eklenince sayi 35 tavanindan 77'ye firladi.
# Yanlis olan sayi degil, ETIKETTI: bir vanilla animasyonun
# "dosyada olmamasi" eksiklik degil, beklenen hal.
#
# Ayrim BIZIM ad uzaylarimiza gore yapiliyor (paketlerden
# okundu). Bunlardan biriyle baslayip da dosyada bulunmayan
# bir kimlik GERCEK eksiktir -> SUPHE. Geri kalani disaridan
# -> DIS.
#
# DIS sayisi da SABITLENIYOR (animasyon.mjs): sessizce
# artmasin. "Vanilla" etiketi bagisiklik degil, AYRI DEFTER.
BIZIM_ONEK = re.compile(r"^animation\.(simsek|simsek_bot|o_sey|kol_dusen|"
                        r"kol_gelen|recal|recal_omnitrix|drill_spin|"
                        r"Diamondhead|prototype|ripjaws|sp_m_|pa_)")
for x in sorted(script_oynatilan):
    if x.endswith("."):
        continue          # WOM_ANIM_ONEK gibi ONEK, animasyon degil
    if x in anim or VANILLA.match(x):
        continue
    if BIZIM_ONEK.match(x):
        bul("SUPHE", "script", "script'te gecen animasyon dosyada YOK: %s" % x)
    else:
        bul("DIS", "script", "oyunun kendi animasyonu: %s" % x)

kullanilan = set(kullanan) | script_oynatilan
for kimlik, (y, _) in sorted(anim.items()):
    if kimlik not in kullanilan:
        bul("SUPHE", y, "hicbir yerde kullanilmiyor: %s" % kimlik)

# ---------- 5. animasyonun ICI ----------
for kimlik, (y, v) in sorted(anim.items()):
    if not isinstance(v, dict):
        bul("HATA", y, "%s: govde sozluk degil" % kimlik); continue
    kemikler = v.get("bones") or {}
    if not kemikler and not v.get("particle_effects") and \
       not v.get("sound_effects") and not v.get("timeline"):
        bul("SUPHE", y, "%s: bos animasyon" % kimlik)
    uzunluk = v.get("animation_length")
    for kemik, k in kemikler.items():
        if not isinstance(k, dict): continue
        for alan in ("rotation", "position", "scale"):
            deger = k.get(alan)
            if deger is None: continue
            if isinstance(deger, (int, float, str)):
                continue          # tek sayi ya da Molang: gecerli
            if isinstance(deger, list):
                if len(deger) != 3:
                    bul("HATA", y, "%s/%s/%s: 3 deger degil (%d)"
                        % (kimlik, kemik, alan, len(deger)))
                continue
            if isinstance(deger, dict) and (
                    set(deger) & {"vector", "pre", "post", "easing",
                                  "lerp_mode", "easingArgs"}):
                # ZAMAN HARITASI DEGIL, tek kare: {"vector": [...]}
                v2 = deger.get("vector") or deger.get("post") or deger.get("pre")
                if isinstance(v2, list) and len(v2) != 3:
                    bul("HATA", y, "%s/%s/%s: 3 deger degil (%d)"
                        % (kimlik, kemik, alan, len(v2)))
                continue
            if isinstance(deger, dict):
                zamanlar = []
                for z, kare in deger.items():
                    try: zamanlar.append(float(z))
                    except ValueError:
                        bul("HATA", y, "%s/%s/%s: zaman sayi degil: %s"
                            % (kimlik, kemik, alan, z)); continue
                    # Bedrock kare bicimleri: [x,y,z] · tek sayi ·
                    # Molang dizesi · {vector|pre|post|lerp_mode|easing}
                    vek = kare
                    if isinstance(kare, dict):
                        vek = (kare.get("vector") or kare.get("post")
                               or kare.get("pre"))
                    if isinstance(vek, list) and len(vek) != 3:
                        bul("HATA", y, "%s/%s/%s@%s: 3 deger degil (%d)"
                            % (kimlik, kemik, alan, z, len(vek)))
                    elif vek is None:
                        bul("HATA", y, "%s/%s/%s@%s: kare degeri yok"
                            % (kimlik, kemik, alan, z))
                if uzunluk is not None and zamanlar:
                    if max(zamanlar) > float(uzunluk) + 1e-6:
                        bul("HATA", y,
                            "%s/%s/%s: kare (%.3f) animation_length'i (%.3f) asiyor"
                            % (kimlik, kemik, alan, max(zamanlar), float(uzunluk)))
                if len(zamanlar) != len(set(zamanlar)):
                    bul("HATA", y, "%s/%s/%s: ayni zamanda iki kare"
                        % (kimlik, kemik, alan))

# ---------- 5b. ARDISIK KARELER ARASINDA SICRAMA ----------
# Bedrock kareler arasini her EKSEN icin AYRI ve DUZ geciyor.
# Euler ayristirmasi sureksiz: ayni donus [179.7,...] da
# yazilabilir [-179.9,...] de -- gercek fark 0.4 derece, ama
# Bedrock 359.6 derece savuruyor.
#
# v5.4'te wom_dovus dosyasinda 7470 gecisin 147'si 180
# dereceden buyuk sicriyordu; kullanicinin gordugu
# "karakter bildigin dans ediyor" buydu. Gercek bir vurusta
# bile bir kemik iki kare arasinda 180 dereceden fazla
# DEGISMEZ -- degistiyse ayristirma dal atlamistir.
# TAM TUR ISTISNASI: drill_spin bilerek 0 -> -360 doner
# (loop, 0.25 sn'de bir tur). Yani buyuk sicrama tek basina
# hata degil. Ayrimi olcen kural: gercek tam tur TEK eksende
# ve TAM 360'in kati, oteki iki eksen SABIT. Dal atlamasinda
# oteki eksenler de oynuyor ve tur tam degil (v5.4'te
# 359.56 gibi). Kural v5.4 dosyasinda olculdu: 147 bozuk
# gecisin 147'sini yakaliyor, drill_spin'in 2 gercek turuna
# dokunmuyor.
def _tam_tur(v0, v1):
    farklar = [b - a for a, b in zip(v0, v1)]
    buyuk = [i for i, f in enumerate(farklar) if abs(f) > 180]
    if len(buyuk) != 1:
        return False
    i = buyuk[0]
    kalan = abs(farklar[i]) % 360
    if min(kalan, 360 - kalan) > 1.0:
        return False
    return all(abs(farklar[j]) < 1.0 for j in range(3) if j != i)


def _vek(kare):
    if isinstance(kare, dict):
        return kare.get("vector") or kare.get("post") or kare.get("pre")
    return kare

for kimlik, (y, v) in sorted(anim.items()):
    if not isinstance(v, dict): continue
    for kemik, k in (v.get("bones") or {}).items():
        if not isinstance(k, dict): continue
        d = k.get("rotation")
        if not isinstance(d, dict) or (set(d) & {"vector", "pre", "post",
                                                 "easing", "lerp_mode",
                                                 "easingArgs"}):
            continue
        kareler = []
        for z, kare in d.items():
            try: t = float(z)
            except ValueError: continue
            vek = _vek(kare)
            if isinstance(vek, list) and len(vek) == 3 and \
               all(isinstance(x, (int, float)) for x in vek):
                kareler.append((t, vek))
        kareler.sort()
        for i in range(1, len(kareler)):
            en = max(abs(b - a2) for a2, b in zip(kareler[i - 1][1],
                                                 kareler[i][1]))
            if en > 180 and not _tam_tur(kareler[i - 1][1], kareler[i][1]):
                bul("HATA", y, "%s/%s: %.4f -> %.4f arasinda %.0f derecelik "
                    "sicrama (euler dal atlamasi)"
                    % (kimlik, kemik, kareler[i - 1][0], kareler[i][0], en))


# ---------- 6. animasyon kemikleri modelde var mi ----------
geo = {}
for p in PAKETLER:
    for y in glob.glob(os.path.join(KOK, p, "models/entity", "*.json")):
        d = oku(y)
        if not d: continue
        for g in (d.get("minecraft:geometry") or []):
            geo[g["description"]["identifier"]] = {b["name"] for b in g.get("bones", [])}

OYUNCU = {"head","hat","body","jacket","rightArm","rightSleeve","leftArm",
          "leftSleeve","rightLeg","rightPants","leftLeg","leftPants","cape",
          "rightItem","leftItem","root"}
def geo_kemikleri(y, kok):
    """Varligin BUTUN geometrilerindeki kemikler.

    Yalniz `default`a bakmak YANLIS: oyuncu varliginda 20'den
    fazla geometri var (Ben 10, Max Steel modlari, O Sey) ve
    her animasyon kendi geometrisinin kemiklerine yaziyor.
    Ilk yazdigimda default'a bakiyordum ve dort DOGRU
    animasyonu hatali gostermisti.                            """
    d = oku(y)
    if not d: return None
    a = (d.get(kok) or {}).get("description") or {}
    hepsi = set()
    for g in (a.get("geometry") or {}).values():
        hepsi |= (geo.get(g) or set())
    return hepsi

for p in PAKETLER:
    for kok, desen in (("minecraft:attachable", "attachables/*.json"),
                       ("minecraft:client_entity", "entity/*.json")):
        for y in glob.glob(os.path.join(KOK, p, desen)):
            d = oku(y)
            if not d: continue
            a = (d.get(kok) or {}).get("description") or {}
            kendi = geo_kemikleri(y, kok)
            for kisa, kimlik in (a.get("animations") or {}).items():
                if kimlik not in anim: continue
                kemikler = set((anim[kimlik][1].get("bones") or {}))
                if not kemikler: continue
                hedef = (kendi or set()) | OYUNCU
                yok = sorted(kemikler - hedef)
                if yok:
                    bul("HATA", y, "%s: modelde OLMAYAN kemige yaziyor: %s"
                        % (kimlik, ", ".join(yok)))

# ---------- 7. INSANSI ISKELET DUZENI ----------
# Bedrock oyuncusunun gercek kemik agaci OLCULDU (Marvel
# Project'in 46 oyuncu modeli, hepsinde ayni):
#     root -> waist -> body -> head / rightArm / leftArm
#     root -> rightLeg / leftLeg
#
# v5.4'te kendi modellerimizin 23'unde HIC ebeveyn yoktu ve
# 11'inde bacaklar body'nin cocuguydu. Govde donunce kafa ve
# kollar yerinde kaliyordu -- "uzuvlar govdeden kopmus"
# hatasinin oteki yarisi. kol_uret.py:insan_hiyerarsisi()
# onariyor; burasi bir daha kacmasin diye bekliyor.
#
# Kaynak modlarin bilerek kurdugu ozel baglar (Marvel'in
# "rotation" kemigi) serbest: yalniz None ya da yanlis
# STANDART kemik hata sayiliyor.
INSAN_EBEVEYN = {"waist": "root", "body": "waist", "head": "body",
                 "rightArm": "body", "leftArm": "body",
                 "rightLeg": "root", "leftLeg": "root"}
INSAN_GEREK = ("body", "head", "rightArm", "leftArm",
               "rightLeg", "leftLeg")
STANDART = set(INSAN_EBEVEYN) | {"root"}

for p in PAKETLER:
    for y in glob.glob(os.path.join(KOK, p, "models/entity", "*.json")):
        d = oku(y)
        if not d: continue
        for g in (d.get("minecraft:geometry") or []):
            kemikler = {b["name"]: b for b in g.get("bones", [])}
            if not all(k in kemikler for k in INSAN_GEREK):
                continue
            kimlik = g["description"]["identifier"]
            for ad, dogru in INSAN_EBEVEYN.items():
                b = kemikler.get(ad)
                if b is None:
                    bul("HATA", y, "%s: insansi modelde %s kemigi yok"
                        % (kimlik, ad)); continue
                simdi = b.get("parent")
                if simdi is None:
                    bul("HATA", y, "%s: %s ebeveynsiz (olmali: %s)"
                        % (kimlik, ad, dogru))
                elif simdi in STANDART and simdi != dogru:
                    bul("HATA", y, "%s: %s -> %s (olmali: %s)"
                        % (kimlik, ad, simdi, dogru))
            # Dongu var mi
            for ad in kemikler:
                gor, p2 = set(), kemikler[ad].get("parent")
                while p2:
                    if p2 in gor:
                        bul("HATA", y, "%s: %s ata zincirinde DONGU"
                            % (kimlik, ad)); break
                    gor.add(p2)
                    p2 = (kemikler.get(p2) or {}).get("parent")


# ---------- 8. ARTIK ANIMASYON DOSYASI  (v5.8) ----------
# WoM kaldirilinca wom_dovus.animation.json pakette kalmisti --
# v5.2'deki kahraman_kostum.geo.json tuzaginin aynisi.
#
# Uretece "beklenen liste disindakini sil" dedirtmeyi denedim ve
# o kural, yazar yazmaz elle yazilmis simsek_kol.animation.json'i
# sildi -- o dosya URETILMIYOR, depoda commit'li. Uretecin
# bilmedigi bir dosyayi silmesi yanlis; karari insan versin ama
# dosya SESSIZCE yasamasin.
#
# Olcut: dosyadaki animasyonlarin HICBIRI kullanilmiyorsa dosya
# artiktir. Tek tek "kullanilmiyor" zaten SUPHE; burasi
# DOSYANIN TAMAMI olunce HATA'ya cikariyor.
#
# ---- BILINEN UC DOSYA ----
# Bu denetimi yazar yazmaz Ben 10'dan kalma uc dosya cikti:
# petrosapien (10), prototype (13), recal_omnitrix (8) -- 31
# animasyon, hicbiri oyuncu varligina kayitli degil ve
# script'ten oynatilmiyor. v4.x'te kaynaktan kopyalanmislar
# ama hic baglanmamislar.
#
# SILINMEDILER: kullanicinin istegi WoM'du, bunlar Ben 10
# icerigi ve ileride baglanabilir. Ama listede DURUYORLAR --
# yeni bir artik dosya eklenirse denetim yine kirmizi yanar,
# bunlar sessizce buyuyen bir yigina donmez.
BILINEN_ARTIK = {
    "petrosapien.animation.json",
    "prototype.animation.json",
    "recal_omnitrix.animation.json",
}
dosyaAnim = {}
for kimlik, (y2, v) in anim.items():
    dosyaAnim.setdefault(y2, []).append(kimlik)
for y2, kimlikler in sorted(dosyaAnim.items()):
    if any(k in kullanilan for k in kimlikler):
        continue
    if os.path.basename(y2) in BILINEN_ARTIK:
        bul("SUPHE", y2, "bilinen artik dosya (%d animasyon, Ben 10'dan "
            "kalma, hic baglanmamis)" % len(kimlikler))
        continue
    bul("HATA", y2, "dosyadaki %d animasyonun HICBIRI kullanilmiyor "
        "-- artik dosya mi?" % len(kimlikler))


# ---------- rapor ----------
print("=== ANIMASYON TARAMASI ===")
print("animasyon: %d   denetleyici: %d   kullanan yer: %d"
      % (len(anim), len(ctrl), len(kullanan)))
print()
hata = [b for b in BULGU if b[0] == "HATA"]
supheli = [b for b in BULGU if b[0] == "SUPHE"]
disari = [b for b in BULGU if b[0] == "DIS"]
print("HATA : %d" % len(hata))
for a, n, x in hata:
    print("   %s\n      %s" % (x, n.replace(KOK + "/", "")))
print()
print("SUPHE: %d" % len(supheli))
for a, n, x in supheli[:40]:
    print("   %s  (%s)" % (x, n.replace(KOK + "/", "")))
if len(supheli) > 40: print("   ... +%d" % (len(supheli) - 40))
print()
# DIS: oyunun kendi animasyonlari. Eksiklik DEGIL -- bizim
# paketimizde olmamalari beklenen hal. Ayri sayiliyor ki
# SUPHE tavanini sisirmesinler ama yine de sessizce
# artamasinlar (animasyon.mjs sayiyi sabitliyor).
print("DIS  : %d" % len(disari))
for a2, n2, x2 in disari[:60]:
    print("   %s" % x2)
if len(disari) > 60: print("   ... +%d" % (len(disari) - 60))
