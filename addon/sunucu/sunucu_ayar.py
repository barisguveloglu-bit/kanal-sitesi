# -*- coding: utf-8 -*-
"""SUNUCU KURULUMUNUN DOSYA ISLERI.                        v7.99.16

sunucu_kur.sh bu dosyayi cagiriyor. Is kabukta degil burada,
cunku test/sunucu.mjs her adimi agsiz ve BDS'siz sinayabilmeli.

    python3 sunucu_ayar.py birlestir <mojang.properties> <sunucu.properties> <cikti>
    python3 sunucu_ayar.py denetle   <server.properties> <sunucu.properties>
    python3 sunucu_ayar.py paketler  <addon_kok> <bds_kok> <dunya_adi> <paket>...
    python3 sunucu_ayar.py izin      <allowlist.json> <gamertag>...
    python3 sunucu_ayar.py dunya_ac  <dunya.mcworld> <worlds/ad>
    python3 sunucu_ayar.py dunya_adi <server.properties>

Kurallar:
  * Mojang'in dosyasi TABAN. Yalniz bizim anahtarlarimiz degisiyor,
    geri kalan satirlar (yorumlar dahil) oldugu gibi kaliyor.
  * Paket surumu ve kimligi her seferinde manifest'ten okunuyor;
    burada yazili degil, eskiyemez.
  * addon/yerel/ hicbir kosulda okunmuyor: oradaki varliklarin izni
    kisisel kullanim, sunucu ise paketi baglanan herkese gonderir.
"""
import json
import os
import shutil
import sys


def ayar_oku(yol):
    """key=value satirlari -> sirali (anahtar, deger) listesi."""
    cikti = []
    with open(yol, encoding="utf-8") as f:
        for satir in f:
            s = satir.strip()
            if not s or s.startswith("#") or "=" not in s:
                continue
            a, d = s.split("=", 1)
            cikti.append((a.strip(), d.strip()))
    return cikti


def birlestir(mojang, bizim, cikti):
    istenen = ayar_oku(bizim)
    sozluk = dict(istenen)
    yazilan = set()
    satirlar = []
    with open(mojang, encoding="utf-8") as f:
        for satir in f:
            s = satir.strip()
            if s and not s.startswith("#") and "=" in s:
                a = s.split("=", 1)[0].strip()
                if a in sozluk:
                    satirlar.append("%s=%s\n" % (a, sozluk[a]))
                    yazilan.add(a)
                    continue
            satirlar.append(satir if satir.endswith("\n") else satir + "\n")
    eksik = [(a, d) for a, d in istenen if a not in yazilan]
    if eksik:
        satirlar.append("\n# ---- Simsek sunucu kurulumu (addon/sunucu/sunucu.properties) ----\n")
        for a, d in eksik:
            satirlar.append("%s=%s\n" % (a, d))
    with open(cikti, "w", encoding="utf-8") as f:
        f.writelines(satirlar)
    return {"degisen": sorted(yazilan), "eklenen": [a for a, _ in eksik]}


def denetle(sunucu, bizim):
    """Sonuc dosyasinda her anahtar bir kez ve istenen degerde mi."""
    istenen = dict(ayar_oku(bizim))
    sonuc = {}
    for a, d in ayar_oku(sunucu):
        sonuc.setdefault(a, []).append(d)
    hatalar = []
    for a, d in istenen.items():
        g = sonuc.get(a)
        if not g:
            hatalar.append("%s yok" % a)
        elif len(g) > 1:
            hatalar.append("%s %d kez yazili" % (a, len(g)))
        elif g[0] != d:
            hatalar.append("%s=%s (istenen %s)" % (a, g[0], d))
    return hatalar


def manifest(klasor):
    with open(os.path.join(klasor, "manifest.json"), encoding="utf-8") as f:
        m = json.load(f)
    tur = {mod["type"] for mod in m.get("modules", [])}
    return m["header"]["uuid"], m["header"]["version"], tur


def dunya_listesi_yaz(yol, eklenecek):
    """Var olan listeyi KORUYARAK bizim paketleri ekler/gunceller.
    Telefonda kurulup yuklenen bir dunyanin kendi paketleri silinmesin."""
    eski = []
    if os.path.exists(yol):
        try:
            with open(yol, encoding="utf-8") as f:
                eski = json.load(f)
        except (ValueError, OSError):
            eski = []
    bizim = {e["pack_id"] for e in eklenecek}
    yeni = [e for e in eski if e.get("pack_id") not in bizim] + eklenecek
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(yeni, f, indent=2)
    return yeni


def paketler(addon_kok, bds_kok, dunya_adi, adlar):
    if any(os.path.normpath(a).split(os.sep)[0] == "yerel" for a in adlar):
        raise SystemExit("HATA: addon/yerel sunucuya kurulmaz (izin kisisel kullanim)")
    dunya = os.path.join(bds_kok, "worlds", dunya_adi)
    os.makedirs(dunya, exist_ok=True)
    davranis, gorunum = [], []
    for ad in adlar:
        kaynak = os.path.join(addon_kok, ad)
        kimlik, surum, tur = manifest(kaynak)
        if tur & {"data", "script"}:
            hedef_kok, liste = "behavior_packs", davranis
        elif "resources" in tur:
            hedef_kok, liste = "resource_packs", gorunum
        else:
            raise SystemExit("HATA: %s davranis ya da gorunum paketi degil (%s)" % (ad, sorted(tur)))
        hedef = os.path.join(bds_kok, hedef_kok, ad)
        if os.path.exists(hedef):
            shutil.rmtree(hedef)
        # paketle.sh'in disarida biraktiklari burada da disarida: uretim
        # artiklari ve gizli dosyalar baglanan herkese gitmesin.
        shutil.copytree(kaynak, hedef, ignore=shutil.ignore_patterns("__pycache__", ".*"))
        liste.append({"pack_id": kimlik, "version": surum})
    dunya_listesi_yaz(os.path.join(dunya, "world_behavior_packs.json"), davranis)
    dunya_listesi_yaz(os.path.join(dunya, "world_resource_packs.json"), gorunum)
    return {"davranis": davranis, "gorunum": gorunum}


def dunya_ac(mcworld, hedef):
    """.mcworld'u dunya klasorune acar. level.dat kokte olmali; arsiv tek
    bir alt klasore sarilmissa o klasorun ici yukari alinir. level.dat
    hic yoksa acilan her sey geri silinir: BDS bos klasoru YENI dunya
    sanar ve sessizce bastan uretir."""
    import zipfile
    if os.path.exists(os.path.join(hedef, "level.dat")):
        raise SystemExit("HATA: %s zaten bir dunya, ustune yazilmadi. Once yedekle ve "
                         "klasoru kaldir." % hedef)
    vardi = os.path.isdir(hedef)
    os.makedirs(hedef, exist_ok=True)
    onceki = set(os.listdir(hedef))
    zipfile.ZipFile(mcworld).extractall(hedef)   # '..' ve mutlak yollari zipfile ayikliyor
    yeni = [a for a in os.listdir(hedef) if a not in onceki]
    if not os.path.exists(os.path.join(hedef, "level.dat")):
        alt = [a for a in yeni if os.path.isfile(os.path.join(hedef, a, "level.dat"))]
        if len(alt) == 1:
            ic = os.path.join(hedef, alt[0])
            for a in os.listdir(ic):
                shutil.move(os.path.join(ic, a), os.path.join(hedef, a))
            os.rmdir(ic)
    if not os.path.exists(os.path.join(hedef, "level.dat")):
        for a in os.listdir(hedef):
            if a not in onceki:
                yol = os.path.join(hedef, a)
                shutil.rmtree(yol) if os.path.isdir(yol) else os.remove(yol)
        if not vardi:
            os.rmdir(hedef)
        raise SystemExit("HATA: %s icinde level.dat yok; .mcworld degil" % mcworld)
    return sorted(os.listdir(hedef))


def izin(yol, adlar):
    liste = []
    if os.path.exists(yol):
        with open(yol, encoding="utf-8") as f:
            liste = json.load(f)
    var = {e.get("name", "").lower() for e in liste}
    for ad in adlar:
        ad = ad.strip()
        if ad and ad.lower() not in var:
            liste.append({"ignoresPlayerLimit": False, "name": ad})
            var.add(ad.lower())
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(liste, f, indent=2)
    return liste


def main(arg):
    if not arg:
        print(__doc__)
        return 2
    is_ = arg[0]
    if is_ == "birlestir":
        print(json.dumps(birlestir(arg[1], arg[2], arg[3])))
    elif is_ == "denetle":
        hatalar = denetle(arg[1], arg[2])
        for h in hatalar:
            print("  HATA: " + h)
        if hatalar:
            return 1
        print("  ayarlar tamam: %d anahtar istenen degerde" % len(ayar_oku(arg[2])))
    elif is_ == "paketler":
        print(json.dumps(paketler(arg[1], arg[2], arg[3], arg[4:])))
    elif is_ == "dunya_ac":
        print(json.dumps(dunya_ac(arg[1], arg[2])))
    elif is_ == "izin":
        print(json.dumps([e["name"] for e in izin(arg[1], arg[2:])]))
    elif is_ == "dunya_adi":
        print(dict(ayar_oku(arg[1])).get("level-name", "Bedrock level"))
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
