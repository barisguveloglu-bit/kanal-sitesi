#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AlienEvo (Ben 10) jar'indan uzayli modelini ve dokusunu cikarir.

Kullanici: "ben 10'den almadigimiz uzaylilari ve formlari
eklemeyi dusunuyorum... uzaylilarin guclerini birebir yapmaya
calisacagiz."

---- NEDEN AYRI BIR BETIK ----
`kol_uret.py` PAKET uretiyor; bu betik KAYNAK uretiyor. Jar bir
kez aciliyor, `kaynak_geo/` ve `kaynak_doku/` dolduruluyor,
sonra jar'a bir daha ihtiyac kalmiyor. marvel_coz.py ve
mahou_coz.py ile ayni bolunme.

---- DOKU KATMANLARI: OLCULEN BIR HATA ----
Mod her uzaylinin dokusunu katmanlara bolmus (skin / uniform /
glow) ve Palladium bunlari ust uste biniyor. v4.92'de sadece
`skin` alinmisti; gerekce "uniform ve glow neredeyse bos --
olculdu: 0/16384" idi.

O olcum SADECE `default` bicimi icin dogruydu. Prototip ve 10K
bicimlerinde uniform katmani DOLU:

    tetramand_uniform_10k        2267/4096  (%55)
    tetramand_skin_10k            960/4096  (%23)
    lepidopterran_uniform_10k    1589/4096  (%39)
    kineceleran_uniform_10k      1222/4096  (%30)
    piscciss_volann_uniform_10k  1275/4096  (%31)
    petrosapien_uniform_10k      1625/16384 (%10)

Yani Dort Kol'un 10K bicimi dokusunun YARIDAN COGUNU
kaybediyordu. Bu betik butun katmanlari modun kendi
sirasiyla birlestiriyor.

Katman sirasi render_layer JSON'undan okundu, tahmin degil:
mesela Sinek Suratli'da uniform ALTTA, skin USTTE.
"""
import json
import os
import sys

from PIL import Image

BURASI = os.path.dirname(os.path.abspath(__file__))
GEO_HEDEF = os.path.join(BURASI, "kaynak_geo")
DOKU_HEDEF = os.path.join(BURASI, "kaynak_doku")

# Modun bicim adi -> bizim dosya sonekimiz
BICIMLER = [("default", ""), ("prototype", "_proto"), ("10k", "_10k")]

# ---- UZAYLI TABLOSU ----
# anahtar: bizim kisa adimiz (dosya adi olur)
#   geo   : jar icindeki .geo.json yolu (#U = bicim)
#   doku  : katmanlar, ALTTAN USTE. render_layer JSON'undaki sira.
#   uc    : uc bicimi var mi (yoksa tek dosya)
AE = "assets/alienevo"
AF = "assets/afomni"


def u(yol):
    return AE + "/" + yol


UZAYLILAR = {
    # ---- UC BICIMLI (alienevo) ----
    "ben_vahsi": dict(uc=True,
        geo=u("geo/aliens/alien_2/vulpimancer_#U.geo.json"),
        doku=[u("textures/models/aliens/alien_2/vulpimancer_skin_#U.png"),
              u("textures/models/aliens/alien_2/vulpimancer_uniform_#U.png")]),
    "ben_xlr": dict(uc=True,
        geo=u("geo/aliens/alien_4/kineceleran_#U.geo.json"),
        doku=[u("textures/models/aliens/alien_4/kineceleran_skin_#U.png"),
              u("textures/models/aliens/alien_4/kineceleran_uniform_#U.png"),
              u("textures/models/aliens/alien_4/kineceleran_glow_#U.png")]),
    "ben_gri": dict(uc=True,
        geo=u("geo/aliens/alien_5/galvan_#U.geo.json"),
        doku=[u("textures/models/aliens/alien_5/galvan_skin_#U.png"),
              u("textures/models/aliens/alien_5/galvan_uniform_#U.png"),
              u("textures/models/aliens/alien_5/galvan_glow_#U.png")]),
    # Sinek Suratli: uniform ALTTA, skin USTTE (render_layer sirasi).
    "ben_sinek": dict(uc=True,
        geo=u("geo/aliens/alien_7/lepidopterran_#U.geo.json"),
        ek_geo=[
            # Arka iki bacak: AYNI dokuyu kullaniyor, dogrudan ekleniyor.
            dict(geo=u("geo/aliens/alien_7/lepidopterran_legs_#U.geo.json")),
            # Kanatlar: KENDI dokusu var (wings_#U.png). Bedrock'ta bir
            # geometri tek doku kullanabildigi icin doku ATLASA
            # aliniyor -- kanat dokusu govdenin SAGINA yapistiriliyor
            # ve kanat UV'leri o kadar kaydiriliyor.
            dict(geo=u("geo/aliens/alien_7/lepidopterran_wings.geo.json"),
                 doku=[u("textures/models/aliens/alien_7/wings_#U.png")]),
        ],
        doku=[u("textures/models/aliens/alien_7/lepidopterran_uniform_#U.png"),
              u("textures/models/aliens/alien_7/lepidopterran_skin_#U.png"),
              u("textures/models/aliens/alien_7/lepidopterran_glow_#U.png")]),
    "ben_yukseltme": dict(uc=True,
        geo=u("geo/aliens/alien_9/galvanic_mechamorph_#U.geo.json"),
        doku=[u("textures/models/aliens/alien_9/galvanic_mechamorph_#U.png"),
              u("textures/models/aliens/alien_9/galvanic_mechamorph_glow_#U.png")]),
    # Hayalet: skin_0 ve skin_1 iki DESEN varyanti (modda
    # donusumlu yanip soner). Bedrock'ta tek doku var: 0 alindi.
    "ben_hayalet": dict(uc=True,
        geo=u("geo/aliens/alien_10/ectonurite_#U.geo.json"),
        doku=[u("textures/models/aliens/alien_10/ectonurite_skin_0_#U.png"),
              u("textures/models/aliens/alien_10/ectonurite_glow_#U.png")]),
    "ben_gulle": dict(uc=True,
        geo=u("geo/aliens/alien_11/arburian_pelarota_#U.geo.json"),
        doku=[u("textures/models/aliens/alien_11/arburian_pelarota_#U.png"),
              u("textures/models/aliens/alien_11/arburian_pelarota_glow_#U.png")]),

    # ---- TEK BICIMLI (alienevo) ----
    # aerophibian_af ALTERNATIF bir deri (Alien Force gorunumu),
    # katman degil -- ust uste binmiyor, ikisi de %49 dolu.
    # Ana deri alindi.
    "ben_jet": dict(uc=False,
        geo=u("geo/aliens/alien_34/aerophibian.geo.json"),
        doku=[u("textures/models/aliens/alien_34/aerophibian.png"),
              u("textures/models/aliens/alien_34/aerophibian_glow.png")]),
    "ben_atomik": dict(uc=False,
        geo=u("geo/aliens/alien_60/atomix.geo.json"),
        doku=[u("textures/models/aliens/alien_60/atomix.png"),
              u("textures/models/aliens/alien_60/atomix_glow_0.png")]),
    "ben_ejder": dict(uc=False,
        geo=u("geo/aliens/alien_100/dragonoid.geo.json"),
        doku=[u("textures/models/aliens/alien_100/dragonoid.png"),
              u("textures/models/aliens/alien_100/dragonoid_glow.png")]),
    "ben_astro": dict(uc=False,
        geo=u("geo/aliens/alien_101/astrobot.geo.json"),
        doku=[u("textures/models/aliens/alien_101/astrobot.png"),
              u("textures/models/aliens/alien_101/astrobot_glow.png")]),

    # ---- TEK BICIMLI (afomni -- ayni jar, ikinci eklenti) ----
    "ben_bataklik": dict(uc=False,
        geo=AF + "/geo/methanosian.geo.json",
        doku=[AF + "/textures/models/methanosian/methanosian.png"]),
    "ben_buz": dict(uc=False,
        geo=AF + "/geo/necrofriggian.geo.json",
        doku=[AF + "/textures/models/necrofriggian/necrofriggian_0.png",
              AF + "/textures/models/necrofriggian/necrofriggian_glow.png"]),
    "ben_yanki": dict(uc=False,
        geo=AF + "/geo/sonorosian.geo.json",
        doku=[AF + "/textures/models/sonorosian/sonorosian.png",
              AF + "/textures/models/sonorosian/sonorosian_glow.png"]),
    "ben_devasa": dict(uc=False,
        geo=AF + "/geo/vaxasaurian.geo.json",
        doku=[AF + "/textures/models/vaxasaurian/vaxasaurian.png"]),
    # ---- EK FORMLAR (v6.1) ----
    # Kullanici: "aldiklarimizin ek formlarina... hepsinin modeli
    # jar'da var."
    #
    # Bunlar AYRI GORUNUS + AYRI GUC. Kaynakta bir tusla geciliyor
    # ve gecince nitelikleri degisiyor (olculdu, powers/galvan.json
    # ve powers/galvanic_rod.json):
    #
    #   Gri Madde ciplak   armor  0 (+5 tokluk) · can -10 · x0.25
    #   Gri Madde zirhli   armor +20 · ucus 1              · x0.25
    #   Gri Madde uzuvlu   armor +10 · saldiri +2          · x5
    #   Gri Madde takimli  armor +24 · saldiri +5 · ates bagisikligi
    #                      · geri tepme 255 · can cezasi YOK · x6.6
    #   Gulle top hali     tokluk +10                      · x1.03
    #   Yukseltme cubuk    armor +16 · saldiri +4          · x0.8
    #
    # Bizde tus yok, her form AYRI ESYA -- zaten butun Ben 10
    # sistemi boyle calisiyor.
    "ben_gri_zirh": dict(uc=True,
        geo=u("geo/aliens/alien_5/galvan_#U.geo.json"),
        ek_geo=[dict(geo=u("geo/aliens/alien_5/galvan_armor_#U.geo.json"),
                     doku=[u("textures/models/aliens/alien_5/armor/galvan_armor_#U.png"),
                           u("textures/models/aliens/alien_5/armor/galvan_armor_glow_#U.png")])],
        doku=[u("textures/models/aliens/alien_5/galvan_skin_#U.png"),
              u("textures/models/aliens/alien_5/galvan_uniform_#U.png"),
              u("textures/models/aliens/alien_5/galvan_glow_#U.png")]),
    "ben_gri_uzuv": dict(uc=True,
        geo=u("geo/aliens/alien_5/galvan_limbs_body_#U.geo.json"),
        ek_geo=[dict(geo=u("geo/aliens/alien_5/galvan_limbs.geo.json"),
                     doku=[u("textures/models/aliens/alien_5/galvan_limbs.png")])],
        doku=[u("textures/models/aliens/alien_5/galvan_skin_#U.png"),
              u("textures/models/aliens/alien_5/galvan_uniform_#U.png"),
              u("textures/models/aliens/alien_5/galvan_glow_#U.png")]),
    # Takim modeli TEK dosya ama dokusu uc bicimde -- geo yolunda
    # `_#U` olmadigi icin ucunde de ayni model, ayri doku.
    "ben_gri_takim": dict(uc=True,
        geo=u("geo/aliens/alien_5/galvan_suit.geo.json"),
        doku=[u("textures/models/aliens/alien_5/suit/galvan_suit_#U.png"),
              u("textures/models/aliens/alien_5/suit/galvan_suit_glow_#U.png")]),
    "ben_gulle_top": dict(uc=True,
        geo=u("geo/aliens/alien_11/arburian_pelarota_ball.geo.json"),
        doku=[u("textures/models/aliens/alien_11/arburian_pelarota_#U.png"),
              u("textures/models/aliens/alien_11/arburian_pelarota_glow_#U.png")]),
    "ben_yukseltme_cubuk": dict(uc=True,
        geo=u("geo/aliens/alien_9/galvanic_rod_#U.geo.json"),
        doku=[u("textures/models/aliens/alien_9/rod/galvanic_rod_#U.png"),
              u("textures/models/aliens/alien_9/rod/galvanic_rod_glow_#U.png")]),
}

# ---- ONCEDEN ALINMIS DORDU: SADECE DOKU TAZELEMESI ----
# Modelleri dogru alinmisti, dokulari EKSIK alinmisti (yukaridaki
# uniform hatasi). Geometrilerine DOKUNULMUYOR.
#
# Ates Topu LISTEDE YOK: onun katmanlari (heatblast_#I_glow /
# heatblast / heatblast_ext) sekiz kareli bir alev animasyonu ve
# v4.92'de elle birlestirilmisti. Onu yeniden uretmek gorunumu
# degistirirdi -- dokunulmadi.
DOKU_TAZELE = {
    "ben_elmas": [u("textures/models/aliens/alien_3/petrosapien_skin_#U.png"),
                  u("textures/models/aliens/alien_3/petrosapien_uniform_#U.png"),
                  u("textures/models/aliens/alien_3/petrosapien_glow_#U.png")],
    "ben_dortkol": [u("textures/models/aliens/alien_6/tetramand_skin_#U.png"),
                    u("textures/models/aliens/alien_6/tetramand_uniform_#U.png"),
                    u("textures/models/aliens/alien_6/tetramand_glow_#U.png")],
    "ben_cene": [u("textures/models/aliens/alien_8/piscciss_volann_skin_#U.png"),
                 u("textures/models/aliens/alien_8/piscciss_volann_uniform_#U.png"),
                 u("textures/models/aliens/alien_8/piscciss_volann_glow_#U.png")],
}


def uv_kaydir(geo, dx):
    """Butun kup UV'lerini x ekseninde dx piksel kaydirir.

    Iki UV bicimi de var: kutu UV (`"uv": [x, y]`) ve yuz basina
    UV (`"uv": {"west": {"uv": [x, y], "uv_size": [w, h]}}`).
    Ikisinde de kaydirilan sey UV'nin BASLANGICI; uv_size'a
    dokunulmuyor (negatif olabiliyor -- aynalanmis yuz).
    """
    for b in geo["bones"]:
        for k in b.get("cubes", []):
            uv = k.get("uv")
            if isinstance(uv, list):
                uv[0] += dx
            elif isinstance(uv, dict):
                for yuz in uv.values():
                    if isinstance(yuz, dict) and isinstance(yuz.get("uv"), list):
                        yuz["uv"][0] += dx
    return geo


def geo_boyu(yol):
    """Geometrinin bildirdigi doku boyutu -- tuval bu."""
    with open(yol, encoding="utf-8") as f:
        d = json.load(f)["minecraft:geometry"][0]["description"]
    return int(d.get("texture_width", 64)), int(d.get("texture_height", 64))


def birlestir(katmanlar, en, boy, kok):
    """Katmanlari ALTTAN USTE bindirir, tuvale olcekler.

    Katmanlar farkli boyutta olabiliyor (Dort Kol'un default
    bicimi 128, 10K bicimi 64). Tuval GEOMETRININ bildirdigi
    boyut; her katman ona NEAREST ile buyutuluyor -- piksel
    sanati bulaniklasmasin diye.
    """
    tuval = Image.new("RGBA", (en, boy), (0, 0, 0, 0))
    bulunan = 0
    for k in katmanlar:
        yol = os.path.join(kok, k)
        if not os.path.exists(yol):
            continue
        im = Image.open(yol).convert("RGBA")
        if im.size != (en, boy):
            im = im.resize((en, boy), Image.NEAREST)
        tuval = Image.alpha_composite(tuval, im)
        bulunan += 1
    return tuval, bulunan


def cikar(kok):
    if not os.path.isdir(kok):
        print("HATA: jar klasoru yok: %s" % kok)
        return 1

    os.makedirs(GEO_HEDEF, exist_ok=True)
    os.makedirs(DOKU_HEDEF, exist_ok=True)
    eksik = []
    sayac = {"geo": 0, "doku": 0, "tazele": 0}

    for anahtar, t in sorted(UZAYLILAR.items()):
        bicimler = BICIMLER if t["uc"] else [("", "")]
        for modun, bizim in bicimler:
            ad = anahtar + bizim

            def coz(yol):
                return os.path.join(
                    kok, yol.replace("_#U", "_" + modun) if modun
                    else yol.replace("_#U", ""))

            gk = coz(t["geo"])
            if not os.path.exists(gk):
                eksik.append(gk)
                continue
            with open(gk, encoding="utf-8") as f:
                ham = json.load(f)
            g0 = ham["minecraft:geometry"][0]["description"]
            en = int(g0.get("texture_width", 64))
            boy0 = int(g0.get("texture_height", 64))   # govdenin KENDI boyu
            boy = boy0                                  # atlas tuvalinin boyu

            # ---- ATLAS ----
            # Kendi dokusu olan ek parcalar (Sinek Suratli'nin
            # kanatlari) govdenin SAGINA yapistiriliyor; UV'leri
            # de o kadar kaydiriliyor. Bedrock bir geometride
            # tek doku kullaniyor, tek yol bu.
            atlas = []          # (x_kaydirma, [katman yollari], en, boy)
            ekler = []          # (dosya adi, geo sozlugu)
            imlec = en
            for i, ek in enumerate(t.get("ek_geo", [])):
                ey = coz(ek["geo"])
                if not os.path.exists(ey):
                    eksik.append(ey)
                    continue
                with open(ey, encoding="utf-8") as f:
                    ekham = json.load(f)
                ekgeo = ekham["minecraft:geometry"][0]
                if ek.get("doku"):
                    ekaç = ekgeo["description"]
                    eken = int(ekaç.get("texture_width", 64))
                    ekboy = int(ekaç.get("texture_height", 64))
                    uv_kaydir(ekgeo, imlec)
                    atlas.append((imlec,
                                  [k.replace("#U", modun) for k in ek["doku"]],
                                  eken, ekboy))
                    imlec += eken
                    boy = max(boy, ekboy)
                ekler.append(("%s_ek%d" % (ad, i), ekham))

            # Atlas govdenin dokusunu genisletiyor; tuval boyutunu
            # ILK dosya bildiriyor cunku kol_uret.py doku olcusunu
            # oradan okuyor.
            g0["texture_width"] = imlec
            g0["texture_height"] = boy
            with open(os.path.join(GEO_HEDEF, ad + ".geo.json"), "w",
                      encoding="utf-8") as f:
                json.dump(ham, f, indent=1)
            sayac["geo"] += 1
            for ekad, ekham in ekler:
                ekham["minecraft:geometry"][0]["description"]["texture_width"] = imlec
                ekham["minecraft:geometry"][0]["description"]["texture_height"] = boy
                with open(os.path.join(GEO_HEDEF, ekad + ".geo.json"), "w",
                          encoding="utf-8") as f:
                    json.dump(ekham, f, indent=1)
                sayac["geo"] += 1

            kats = [k.replace("#U", modun) for k in t["doku"]]
            # ---- GOVDE KENDI BOYUNDA BIRLESTIRILIYOR ----
            # Atlas tuvali ek parcaya gore UZAYABILIYOR (Gri
            # Madde'nin uzuvlari 32 boyunda, govdesi 16). Govde
            # dokusunu tuvalin boyuna gore birlestirseydik
            # 16'lik doku 32'ye GERILIRDI ve model kayardi --
            # ilk denemede tam bu oldu, render'da goruldu.
            # UV'ler mutlak piksel oldugu icin govdenin kendi
            # boyunda kalmasi dogru olan.
            im, n = birlestir(kats, en, boy0, kok)
            if n == 0:
                eksik.append(kats[0])
                continue
            if imlec > en or boy > boy0:
                genis = Image.new("RGBA", (imlec, boy), (0, 0, 0, 0))
                genis.paste(im, (0, 0))
                for dx, ekkats, eken, ekboy in atlas:
                    ekim, ekn = birlestir(ekkats, eken, ekboy, kok)
                    if ekn == 0:
                        eksik.append(ekkats[0])
                        continue
                    genis.paste(ekim, (dx, 0))
                    n += ekn
                im = genis
            im.save(os.path.join(DOKU_HEDEF, ad + ".png"))
            sayac["doku"] += 1
            print("   %-22s %3dx%-3d  %d katman%s"
                  % (ad, imlec, boy, n, "  (atlas)" if imlec > en else ""))

    print("\n-- onceden alinmis dortlunun doku tazelemesi --")
    for anahtar, kats in sorted(DOKU_TAZELE.items()):
        for modun, bizim in BICIMLER:
            ad = anahtar + bizim
            gy = os.path.join(GEO_HEDEF, ad + ".geo.json")
            if not os.path.exists(gy):
                eksik.append(gy)
                continue
            en, boy = geo_boyu(gy)
            im, n = birlestir([k.replace("#U", modun) for k in kats],
                              en, boy, kok)
            if n == 0:
                eksik.append(anahtar + " " + modun)
                continue
            im.save(os.path.join(DOKU_HEDEF, ad + ".png"))
            sayac["tazele"] += 1
            print("   %-22s %3dx%-3d  %d katman" % (ad, en, boy, n))

    print("\ngeo: %d   doku: %d   tazelenen: %d"
          % (sayac["geo"], sayac["doku"], sayac["tazele"]))
    if eksik:
        print("EKSIK (%d):" % len(eksik))
        for e in eksik:
            print("   " + e)
        return 1
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("kullanim: ben10_al.py <acilmis-jar-klasoru>")
        sys.exit(2)
    sys.exit(cikar(sys.argv[1]))
