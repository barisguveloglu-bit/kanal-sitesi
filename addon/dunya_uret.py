#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""EFSANENIN DUNYASI -- ozel gokyuzu paketi + hazir dunya dosyasi.

   Kullanici: "bana ait bir ozel tohum olacak ... her yeri bedrock
   ama her yeri hava ... ben hani havayi yapmak istedim ama etraf
   oluyor yani gokyuzu olmuyor, gokyuzunu de ayarla ... bana ozel
   bir dunya olacak. Bir efsanenin ona ozel bir dunyasi olmasi
   gayet guzel bence."

   Iki sey uretiliyor:

     1. Simsek_Efsane_Gokyuzu/      (kaynak paketi)
        Gokyuzu kubbesini ve sisi boyuyor. AYRI PAKET, bilerek:
        ana pakete konsaydi modu kuran HERKESIN butun dunyasi
        degisirdi. Bu depoda "oyuncunun dunyasini geri
        alinamaz bicimde degistiren sey" alinmiyor
        (REFERANS_BORALO_V5.md, biyom ezmesi maddesi). Ayri
        paket olunca dunya dunya aciliyor.

     2. Simsek_Efsane_Dunyasi.mctemplate
        Acinca kurulu gelen dunya: tek kat bedrock, ustu bos,
        gokyuzu ve sis bizim rengimizde.

   ---- NEDEN GOKYUZU AYRI BIR MEKANIZMA ----
   Kullanici hakliydi: `/fog` yalnizca MESAFE SISINI boyuyor,
   gokyuzu kubbesi vanilla mavi kaliyor. Gokyuzu icin kaynak
   paketinde `biomes/` altinda ISTEMCI BIYOMU tanimi gerekiyor
   (`minecraft:sky_color`). Ikisi ayri dosya, ayri bilesen.
"""
import json, os, struct, subprocess, sys, zipfile, hashlib, colorsys

KOK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(KOK, "arac"))
from nbt import B, T, U, Y, TL, dogrula                      # noqa: E402

# Surum ve motor alt siniri TEK KAYNAKTAN: kol_uret.py.
# Elle yazilsaydi bir gun ayrisirdi -- bu depoda tam o hata
# v7.9'da yasandi (manifest yedi surum boyunca guncellenmedi).
def _kol_uret_sabiti(ad):
    for satir in open(os.path.join(KOK, "kol_uret.py"), encoding="utf-8"):
        if satir.startswith(ad + " = "):
            return eval(satir.split("=", 1)[1].strip())
    raise SystemExit("kol_uret.py'de %s bulunamadi" % ad)

SURUM_NO  = list(_kol_uret_sabiti("SURUM_NO"))
MIN_MOTOR = list(_kol_uret_sabiti("MIN_MOTOR"))
SURUM_METIN = "%d.%d.%d" % tuple(SURUM_NO)

BP_KLASOR = "Simsek_TNT_ToprakTopu"
RP_KLASOR = "Simsek_Kol_Kaynak"
GK_KLASOR = "Simsek_Efsane_Gokyuzu"

# ---------------------------------------------------------------- RENK
# Sis rengi skinden OLCULDU (kol_uret.py, #20C5B5 turkuaz).
# Gokyuzu onun KOYU TUREVI: ayni ton, ayni doygunluk, yalniz
# parlaklik dusuk.
#
# ---- DEGER TAHMIN DEGIL, OLCULDU ----
# Kullanici "gokyuzu biraz koyu olsun" dedi. "Biraz" olculebilir
# bir sey degil; olculebilen sey UFUK CIZGISININ GORUNMESI.
# Ikisinin kontrast orani 3:1'in altina duserse gokyuzu ile sis
# tek bir duz duvar gibi duruyor -- kullanicinin sikayet ettigi
# seyin ta kendisi. L=%22 secildi: kontrast 3.38:1.
SIS_RENK = "#20C5B5"
GOK_PARLAKLIK = 0.22


def _hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def _rgb_hex(r, g, b):
    return "#%02X%02X%02X" % tuple(max(0, min(255, round(c * 255))) for c in (r, g, b))


def _kontrast(a, b):
    def l(c):
        def f(v): return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
        r, g, b = _hex_rgb(c)
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    la, lb = l(a), l(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


_r, _g, _b = _hex_rgb(SIS_RENK)
_h, _l, _s = colorsys.rgb_to_hls(_r, _g, _b)
GOK_RENK = _rgb_hex(*colorsys.hls_to_rgb(_h, GOK_PARLAKLIK, _s))
GOK_KONTRAST = _kontrast(GOK_RENK, SIS_RENK)

FOG_KIMLIK = "pa:efsane_dunyasi"

# ---------------------------------------------------------------- UUID
# SABIT. Her uretimde degisseydi oyun paketi her surumde YENI bir
# paket sayar ve kullanicinin dunyasindaki kurulum koparadi --
# skin paketinde (SKIN_UUID_BAS) ayni karar ayni sebeple alindi.
GK_UUID      = "3f8a1c40-7e21-4b96-9d55-2ac0e7f13b80"
GK_MODUL     = "3f8a1c40-7e21-4b96-9d55-2ac0e7f13b81"
SABLON_UUID  = "3f8a1c40-7e21-4b96-9d55-2ac0e7f13b82"
SABLON_MODUL = "3f8a1c40-7e21-4b96-9d55-2ac0e7f13b83"

DUNYA_ADI = "Efsanenin Dünyası"

# ---------------------------------------------------------------- TOHUM
# "Ozel tohum" istendi. Rastgele bir sayi yazmak yerine ADDAN
# TURETILIYOR: ayni ad her zaman ayni tohumu veriyor, yani
# yeniden uretilebilir ve nereden geldigi belli.
#
# NOT: duz dunyada tohum arazi uretmiyor (arazi FlatWorldLayers'tan
# geliyor). Yine de yaziliyor cunku kullanici "bana ait bir tohum"
# istedi ve dunyanin kimligi orada duruyor.
def tohum_uret(metin):
    ozet = hashlib.sha256(metin.encode("utf-8")).digest()
    return struct.unpack("<q", ozet[:8])[0]

TOHUM = tohum_uret("Efsanenin Dünyası · Şimşek TNT · " + SIS_RENK)

# ---------------------------------------------------------------- BIYOMLAR
# Gokyuzu rengi biyom basina veriliyor; Bedrock'ta "hepsi" diye
# bir joker yok. Liste elle yazildi ve TAM OLMAYABILIR.
#
# Eksik kalan bir biyom vanilla gokyuzunde kalir, HATA VERMEZ --
# yani bu listenin eksikligi paketi bozmuyor, yalnizca o biyomda
# etki gostermiyor. Duz dunyada tek biyom var (plains), yani
# hazir dunya dosyasi icin listenin tamami zaten gereksiz;
# liste paketi BASKA dunyalarda da ise yarasin diye uzun.
BIYOMLAR = [
    "plains", "sunflower_plains", "desert", "desert_hills", "desert_mutated",
    "extreme_hills", "extreme_hills_edge", "extreme_hills_mutated",
    "extreme_hills_plus_trees", "extreme_hills_plus_trees_mutated",
    "forest", "forest_hills", "flower_forest", "birch_forest",
    "birch_forest_hills", "birch_forest_mutated", "birch_forest_hills_mutated",
    "roofed_forest", "roofed_forest_mutated",
    "taiga", "taiga_hills", "taiga_mutated", "cold_taiga", "cold_taiga_hills",
    "cold_taiga_mutated", "mega_taiga", "mega_taiga_hills",
    "mega_spruce_taiga", "mega_spruce_taiga_hills", "redwood_taiga_hills_mutated",
    "swampland", "swampland_mutated", "mangrove_swamp",
    "river", "frozen_river", "beach", "cold_beach", "stone_beach",
    "ocean", "deep_ocean", "frozen_ocean", "deep_frozen_ocean",
    "cold_ocean", "deep_cold_ocean", "lukewarm_ocean", "deep_lukewarm_ocean",
    "warm_ocean", "deep_warm_ocean", "legacy_frozen_ocean",
    "ice_plains", "ice_plains_spikes", "ice_mountains",
    "jungle", "jungle_hills", "jungle_edge", "jungle_mutated",
    "jungle_edge_mutated", "bamboo_jungle", "bamboo_jungle_hills",
    "savanna", "savanna_plateau", "savanna_mutated", "savanna_plateau_mutated",
    "mesa", "mesa_bryce", "mesa_plateau", "mesa_plateau_stone",
    "mesa_plateau_mutated", "mesa_plateau_stone_mutated",
    "mushroom_island", "mushroom_island_shore",
    "meadow", "grove", "snowy_slopes", "jagged_peaks", "frozen_peaks",
    "stony_peaks", "cherry_grove",
    "lush_caves", "dripstone_caves", "deep_dark",
    "hell", "soulsand_valley", "crimson_forest", "warped_forest",
    "basalt_deltas", "the_end",
]


def yaz_json(yol, veri):
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, indent=2, ensure_ascii=False)
        f.write("\n")


# ================================================================ 1. PAKET
def gokyuzu_paketi():
    import shutil
    kok = os.path.join(KOK, GK_KLASOR)

    # ---- ONCE SIL, SONRA YAZ  (temizlik tuzagi) ----
    # Ilk yazilista yalnizca YAZIYORDU. Mutasyon bataryasi
    # yakaladi: BIYOMLAR listesinden "plains" cikarildiginda
    # test yine geciyordu -- cunku onceki uretimden kalan
    # plains.json hala diskteydi. Yani liste ile klasor
    # ayrisabiliyordu ve kimse fark etmiyordu.
    #
    # Bu depoda ayni tuzaga defalarca dusulmus (kol_uret.py'de
    # `beklenen` kumesi tam bunun icin var). Uretilen klasor
    # uretenin ciktisi olmali, birikinti degil.
    for alt in ("biomes", "fogs"):
        yol = os.path.join(kok, alt)
        if os.path.isdir(yol):
            shutil.rmtree(yol)

    yaz_json(os.path.join(kok, "manifest.json"), {
        "format_version": 2,
        "header": {
            "name": "Şimşek %s · Efsanenin Göğü" % SURUM_METIN,
            "description": ("Gökyüzü %s, sis %s. AYRI paket: yalnızca "
                            "açtığın dünyada geçerli, öteki dünyaların "
                            "vanilla kalır." % (GOK_RENK, SIS_RENK)),
            "uuid": GK_UUID,
            "version": SURUM_NO,
            "min_engine_version": MIN_MOTOR,
        },
        "modules": [{
            "description": "Gökyüzü ve sis rengi.",
            "type": "resources",
            "uuid": GK_MODUL,
            "version": SURUM_NO,
        }],
    })

    yaz_json(os.path.join(kok, "fogs", "efsane_dunyasi.json"), {
        "format_version": "1.16.100",
        "minecraft:fog_settings": {
            "description": {"identifier": FOG_KIMLIK},
            "distance": {
                # Sis UZAK baslıyor: yakini yutan bir sis istenmedi,
                # "gokyuzu benim rengimden olsun" istendi. Yakin
                # baslangic (2 blok, sis.js'teki savas sisi) burada
                # dunyayi oynanamaz yapardi.
                "air": {"fog_start": 24.0, "fog_end": 140.0,
                        "fog_color": SIS_RENK, "render_distance_type": "render"},
                "weather": {"fog_start": 16.0, "fog_end": 100.0,
                            "fog_color": SIS_RENK, "render_distance_type": "render"},
            },
        },
    })

    for b in BIYOMLAR:
        yaz_json(os.path.join(kok, "biomes", b + ".json"), {
            "format_version": "1.21.40",
            "minecraft:client_biome": {
                "description": {"identifier": b},
                "components": {
                    "minecraft:sky_color": {"sky_color": GOK_RENK},
                    "minecraft:fog_appearance": {"fog_identifier": FOG_KIMLIK},
                },
            },
        })

    # Paket ikonu: ana paketinkini kullaniyoruz, ayri bir ikon
    # uretmek icin sebep yok.
    kaynak_ikon = os.path.join(KOK, RP_KLASOR, "pack_icon.png")
    if os.path.exists(kaynak_ikon):
        with open(kaynak_ikon, "rb") as g, \
             open(os.path.join(kok, "pack_icon.png"), "wb") as h:
            h.write(g.read())

    return kok


# ================================================================ 2. DUNYA
# Duz dunya katmani. Bedrock bu alani level.dat icinde bir JSON
# DIZESI olarak tutuyor -- NBT degil, dizenin ta kendisi.
#
#   biome_id 1 = plains. Duz dunyada TEK biyom var; gokyuzu
#   paketinde de plains tanimli, yani hazir dunyada renk
#   kesinlikle tutuyor.
DUZ_KATMAN = {
    "biome_id": 1,
    "block_layers": [{"block_name": "minecraft:bedrock", "count": 1}],
    "encoding_version": 6,
    "structure_options": None,
    "world_version": "version.post_1_18",
}


def level_dat_sozlugu():
    """Bedrock level.dat alanlari.

       ---- NEDEN BU KADAR AZ ALAN ----
       Oyun eksik alanlari varsayilanla dolduruyor. Yazilan
       alanlar, varsayilani ISTEDIGIMIZ SEY OLMAYANLAR:
       arazi (Generator + FlatWorldLayers), ad, tohum, dogum
       noktasi ve komutlar.

       Gereksiz alan yazmak burada bedava degil: yanlis TURDE
       yazilan bir alani oyun sessizce atliyor, yani dosyayi
       buyutup guveni azaltiyor.                               """
    return {
        "LevelName": Y(DUNYA_ADI),

        # 2 = duz. Arazinin tamami asagidaki dizeden geliyor.
        "Generator": T(2),
        "FlatWorldLayers": Y(json.dumps(DUZ_KATMAN, separators=(",", ":"))),

        "RandomSeed": U(TOHUM),

        # Dogum: tek kat bedrock y=0'da, oyuncu y=1'de duruyor.
        # y=4 yazilsaydi her giriste 3 blok dusurdu.
        "SpawnX": T(0), "SpawnY": T(1), "SpawnZ": T(0),
        "LimitedWorldOriginX": T(0),
        "LimitedWorldOriginY": T(1),
        "LimitedWorldOriginZ": T(0),

        "GameType": T(0),         # hayatta kalma
        "Difficulty": T(2),       # normal

        # BAYT, TAM DEGIL. Bu bicimde en sinsi hata bu: TAM
        # yazilirsa oyun alani okumuyor ve sebebini soylemiyor.
        "commandsEnabled": B(1),
        "showcoordinates": B(1),  # bos dunyada yon bulmanin tek yolu
        "ForceGameType": B(0),
        "ConfirmedPlatformLockedContent": B(0),

        "StorageVersion": T(10),
        "lastOpenedWithVersion": TL(MIN_MOTOR + [0]),
        "InventoryVersion": Y("%d.%d.%d" % tuple(MIN_MOTOR)),

        "Time": U(6000),          # tam ogle: gokyuzu rengi en belli
    }
    # NOT: rainLevel / lightningLevel YAZILMIYOR. Ilk yazilista
    # vardilar ve TURU YANLISTI -- CIFT yazmistim, Bedrock KESIR
    # bekliyor. Varsayilanlari zaten 0, yani alanin kendisi
    # gereksizdi; yanlis turde gereksiz alan ise en kotusu:
    # oyun onu sessizce atlar ve dosyayi okudugunu sanirsin.


def _paket_kopyala(kaynak, hedef):
    """Paketi sablonun icine kopyalar (uretim artiklari haric)."""
    for dizin, altlar, dosyalar in os.walk(kaynak):
        altlar[:] = [a for a in altlar if a != "__pycache__" and not a.startswith(".")]
        for d in dosyalar:
            if d.startswith("."):
                continue
            tam = os.path.join(dizin, d)
            bag = os.path.relpath(tam, kaynak)
            varis = os.path.join(hedef, bag)
            os.makedirs(os.path.dirname(varis), exist_ok=True)
            with open(tam, "rb") as g, open(varis, "wb") as h:
                h.write(g.read())


def _paket_kimligi(klasor):
    d = json.load(open(os.path.join(klasor, "manifest.json"), encoding="utf-8"))
    return {"pack_id": d["header"]["uuid"], "version": d["header"]["version"]}


def dunya_sablonu(gk_kok):
    import shutil
    kok = os.path.join(KOK, "_sablon")
    if os.path.isdir(kok):
        shutil.rmtree(kok)
    os.makedirs(kok)

    # ---- level.dat: YAZ, GERI OKU, KARSILASTIR ----
    # Bu dosya oyunda denenemiyor. `dogrula` yazdigimi geri
    # okuyup birebir esit oldugunu gosteriyor; gecmezse istisna
    # atiyor ve sablon HIC uretilmiyor. "Herhalde dogrudur"
    # diye dosya birakmiyoruz.
    ham = dogrula(level_dat_sozlugu())
    with open(os.path.join(kok, "level.dat"), "wb") as f:
        f.write(ham)
    # Oyun ikisini de okuyor; ayri dosyada duran ad, dunya
    # listesinde level.dat okunmadan gosteriliyor.
    with open(os.path.join(kok, "levelname.txt"), "w", encoding="utf-8") as f:
        f.write(DUNYA_ADI + "\n")

    yaz_json(os.path.join(kok, "manifest.json"), {
        "format_version": 2,
        "header": {
            "name": DUNYA_ADI,
            "description": ("Tek kat bedrock, üstü boş. Gökyüzü %s, sis %s. "
                            "Şimşek %s paketleri kurulu gelir."
                            % (GOK_RENK, SIS_RENK, SURUM_METIN)),
            "uuid": SABLON_UUID,
            "version": SURUM_NO,
            "base_game_version": MIN_MOTOR,
            # false: dunya secenekleri KILITLENMIYOR. true olsaydi
            # kullanici kendi dunyasinda oyun kipini bile
            # degistiremezdi -- "bana ozel dunya" istegi bunun
            # tersi.
            "lock_template_options": False,
        },
        "modules": [{
            "description": "Efsanenin Dünyası",
            "type": "world_template",
            "uuid": SABLON_MODUL,
            "version": SURUM_NO,
        }],
    })

    # Paketler sablonun ICINE giriyor: kullanici ayrica kurmak
    # zorunda kalmasin. Dunya acildiginda ucu de acik geliyor.
    hedefler = []
    for klasor in (BP_KLASOR, RP_KLASOR):
        kaynak = os.path.join(KOK, klasor)
        tur = "behavior_packs" if klasor == BP_KLASOR else "resource_packs"
        _paket_kopyala(kaynak, os.path.join(kok, tur, klasor))
        hedefler.append((tur, kaynak))
    _paket_kopyala(gk_kok, os.path.join(kok, "resource_packs", GK_KLASOR))
    hedefler.append(("resource_packs", gk_kok))

    dp = [_paket_kimligi(k) for t, k in hedefler if t == "behavior_packs"]
    kp = [_paket_kimligi(k) for t, k in hedefler if t == "resource_packs"]
    yaz_json(os.path.join(kok, "world_behavior_packs.json"), dp)
    yaz_json(os.path.join(kok, "world_resource_packs.json"), kp)

    return kok


# ---- URETIM YENIDEN URETILEBILIR OLSUN  (v7.94.1) ----
# Sorun olculdu: `sh addon/paketle.sh` ardi ardina iki kez
# calistirilinca dort paket BIREBIR AYNI cikiyordu ama
# Gokyuzu.mcpack ile Efsane_Dunyasi.mctemplate her seferinde
# FARKLI bayt veriyordu. Sebep icerik degil, ZAMAN DAMGASI:
# bu ikisinin dosyalari her kosuda yeniden yaziliyor ve zip
# her girdinin mtime'ini iceri koyuyor.
#
# Neden onemli: paketler depoda tutuluyor. Damga kaydigi icin
# hicbir sey degismese bile `git status` 5,5 MB'lik iki ikili
# dosyayi "degisti" diye gosteriyordu. Bu insani her kosudan
# sonra dusunmeden `git checkout --` yapmaya alistirir -- ve
# gercek bir degisiklik tam oyle kaybolur.
#
# Cozum: uretilen her dosyanin damgasi sabitleniyor. Artik
# "paket kaynakla ayni mi" sorusu tek komutla cevaplaniyor:
# paketle.sh'i calistir, git status bos kaliyorsa aynidir.
# Tarih kasitli olarak sabit; surumle degismiyor cunku
# degisseydi surum atlayan her kosu yine butun paketleri
# tazeler ve kazanilan sey giderdi.
SABIT_ZAMAN = (2020, 1, 1, 0, 0, 0)
SABIT_EPOK = 1577836800  # 2020-01-01T00:00:00Z


def damgayi_sabitle(kok):
    """kok altindaki her dosya ve klasorun mtime'ini sabitler."""
    for dizin, altlar, dosyalar in os.walk(kok):
        for ad in dosyalar:
            os.utime(os.path.join(dizin, ad), (SABIT_EPOK, SABIT_EPOK))
        for ad in altlar:
            os.utime(os.path.join(dizin, ad), (SABIT_EPOK, SABIT_EPOK))
    os.utime(kok, (SABIT_EPOK, SABIT_EPOK))


def sablonu_ziple(kok):
    yol = os.path.join(KOK, "Simsek_v%s_Efsane_Dunyasi.mctemplate" % SURUM_METIN)
    if os.path.exists(yol):
        os.remove(yol)
    with zipfile.ZipFile(yol, "w", zipfile.ZIP_DEFLATED) as z:
        # db/ klasoru BOS olarak konuyor: oyun parcalari
        # kendisi uretiyor (duz dunyada uretilecek sey de tek
        # kat bedrock). Klasorun kendisi yine de yaziliyor,
        # cunku bazi surumler yoksa dunyayi listede gostermiyor.
        z.writestr(zipfile.ZipInfo("db/"), b"")
        # altlar SIRALANIYOR: os.walk klasorleri dosya
        # sisteminin verdigi sirayla geziyor ve o sira makineden
        # makineye degisebiliyor. Siralanmazsa ayni icerik baska
        # bir makinede baska bir zip veriyor.
        for dizin, altlar, dosyalar in os.walk(kok):
            altlar.sort()
            for d in sorted(dosyalar):
                tam = os.path.join(dizin, d)
                bilgi = zipfile.ZipInfo(os.path.relpath(tam, kok),
                                        date_time=SABIT_ZAMAN)
                bilgi.compress_type = zipfile.ZIP_DEFLATED
                bilgi.external_attr = 0o644 << 16
                with open(tam, "rb") as g:
                    z.writestr(bilgi, g.read())
    return yol


def main():
    import shutil
    gk = gokyuzu_paketi()
    n = len(BIYOMLAR)
    print("gokyuzu paketi: %s" % os.path.basename(gk))
    print("  sis     %s" % SIS_RENK)
    print("  gokyuzu %s  (kontrast %.2f:1)" % (GOK_RENK, GOK_KONTRAST))
    print("  %d biyom dosyasi" % n)

    # Gokyuzu paketini paketle.sh'teki `zip` zipliyor, yani
    # damgasini burada sabitlemek zorundayiz: o komut disaridan
    # sabit tarih almiyor.
    damgayi_sabitle(gk)

    kok = dunya_sablonu(gk)
    yol = sablonu_ziple(kok)
    print("dunya: %s (%d KB)" % (os.path.basename(yol),
                                 os.path.getsize(yol) // 1024))
    print("  tohum %d" % TOHUM)
    print("  arazi tek kat bedrock, ustu bos")

    # Ara klasor birakilmiyor: 5 MB'lik bir uretim artigi ve
    # icinde paketlerin KOPYASI var -- birakılsa depoda iki
    # ayri kopya durur ve biri gun gelir eskir.
    shutil.rmtree(kok)


if __name__ == "__main__":
    main()
