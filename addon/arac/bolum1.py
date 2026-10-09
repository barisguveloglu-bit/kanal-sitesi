"""1. bolumun senaryosunu kurar (SERI_SEZON1.md'den).          v7.99.10

    python3 addon/arac/bolum1.py            -> addon/film/bolum1_orman.json
                                               addon/film/bolum1_oda.json

Hikaye, replikler ve kamera dili SERI_SEZON1.md'deki kararlar; burasi
onlari zamanli olaylara ceviriyor. Konum gerektiren her sey (cukurun
yeri, kameranin nereye konacagi) zaman cizelgesi KOSULARAK bulunuyor:
Baris'in dustugu nokta tahmin edilmiyor, olculuyor.
Uydurma YOK: replikler dosyadakiler; sahnede olmayan bir sey eklenmedi.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_film as F  # noqa: E402
import bedrock_onizleme as B  # noqa: E402

ADDON = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKTI = os.path.join(ADDON, "film")
SKIN_BARIS = "Simsek_Kol_Kaynak/textures/entity/aktor/uzak_akraba.png"
SKIN_HARKOS = "Simsek_Kol_Kaynak/textures/entity/ilkel_harkos.png"
SKIN_ASKER = "Simsek_Kol_Kaynak/textures/entity/ilkel_okazor.png"
FPS = 30
CUKUR_DERIN = 0.35
# Baris'in vuruslari: Antitheus kombosunun 1, 2 ve 4. adimlari. 3. adim
# filmde KULLANILMIYOR: tirpanin sapi 0.1-0.2 sn basin icinden geciyor
# (test/silah_govde.mjs "bilinen kalinti"; kol duzeltmesi 15 derecede
# kapatamiyor). Sira bilerek 1-2-4.
# KALITE: Blender'in kendi Cycles varsayilanlari -- 4096 ornek (uyarlamali,
# esik 0.01), gurultu giderici, varsayilan isik sekmeleri. Kullanici:
# "kaliteden hicbir sey eksiltme", "hizlandirilmis Cycles kullanmayacagiz".
# Sekme sinirlari (3/2/1/4) ve 16 ornek v7.99.10'da kaldirildi.
TAM_ORNEK = 4096
# Baris'in dovus disi tutusu (film_poz.tirpan_bekle): kullanici "mizragi
# tutusu bir garip" dedi -- Antitheus durusu tirpani bicagin dibinden tutuyordu.
TIRPAN_BEKLE = "animation.film.tirpan_bekle"
KAGIT_YAN = 1             # +1/-1: okuma cekiminde kameranin yani (sol el kameraya)
BARIS_VURUS = ["antitheus_auto_1", "antitheus_auto_2", "antitheus_auto_4"]
_sira = [0]


def bv():
    ad = BARIS_VURUS[_sira[0] % len(BARIS_VURUS)]
    _sira[0] += 1
    return ad


def kos(sen, t):
    """Senaryoyu t'ye kadar oynat; {aktor: kayit} (t anindaki durum)."""
    s = dict(sen, sure=t)
    ak, _, _, _ = F.zaman_cizelgesi(s, B.oku(F.HAREKET)["setler"], {})
    return {ad: a.kayit[-1] for ad, a in ak.items()}


def ileri(aci, d):
    o = F.on_yon(aci)
    return (o[0] * d, o[1] * d)


def orman():
    # 2: acilistaki iki vurus (Baris'in yenilisi) filmden cikti; dovusun
    # vurus sirasi denetlenmis haliyle ayni kalsin diye sira oradan basliyor
    _sira[0] = 2
    sen = {
        "fps": FPS, "sure": 0, "cozunurluk": [1920, 1080], "ornek": TAM_ORNEK, "uyarlamali": 0.01,
        "zemin": {"boyut": 64, "agac": 34, "tohum": 7, "aciklik": 12},
        "aktorler": {
            "b": {"skin": SKIN_BARIS, "isim": "Barış", "silah": "karanlik_tirpan", "set": "antitheus", "durus": TIRPAN_BEKLE,
                  "konum": [-1.6, 0], "bak": "h"},
            # El-Harkos yatan Baris'in basinda (dovus filmde yok)
            "h": {"skin": SKIN_HARKOS, "isim": "El-Harkos", "set": "yumruk", "konum": [-0.25, 0.15], "bak": "b"},
            "k1": {"skin": SKIN_BARIS, "silah": "karanlik_tirpan", "set": "antitheus", "durus": TIRPAN_BEKLE, "konum": [0, 0], "gizli": True},
            "k2": {"skin": SKIN_BARIS, "silah": "karanlik_tirpan", "set": "antitheus", "durus": TIRPAN_BEKLE, "konum": [0, 0], "gizli": True},
            "k3": {"skin": SKIN_BARIS, "silah": "karanlik_tirpan", "set": "antitheus", "durus": TIRPAN_BEKLE, "konum": [0, 0], "gizli": True},
        },
        "olaylar": [], "kamera": [], "zaman": [],
    }
    O, K = sen["olaylar"], sen["kamera"]

    # ---- 1. SAHNE: Baris zaten cukurda yatiyor ----
    # Kullanici: "barisin yenilmesi gosterilmeyecek, yani yerde yatacak ama
    # onun oncesi gosterilmeyecek." Dovus ve dusus filmde YOK; film Baris
    # cukurda yatarken, El-Harkos basinda dururken acilir.
    O += [{"t": 0.3, "baslik": "1. BÖLÜM", "sure": 2.6},
          {"t": 0.0, "aktor": "b", "poz": "dus", "tut": True, "atla": 5.0},
          {"t": 0.0, "aktor": "b", "z": -CUKUR_DERIN}]
    s = kos(dict(sen, sure=1.0), 0.5)
    b11 = s["b"]
    geri = ileri(b11["aci"], -0.95)
    cx, cy = b11["x"] + geri[0], b11["y"] + geri[1]
    sen["zemin"]["cukur"] = {"x": cx, "y": cy, "r": 1.25, "derin": CUKUR_DERIN, "t": 0.0}
    t_temas = 0.0
    K += [{"t": 0.0, "aci": "genis", "a": "b", "b": "h", "lens": 28}]
    # El-Harkos kagidina bakar
    t_k = 4.4
    O += [{"t": t_k, "aktor": "h", "bak": "b"},
          {"t": t_k + 0.3, "aktor": "h", "poz": "kagit", "tut": True},
          {"t": t_k + 0.3, "aktor": "h", "esya": "kagit"},
          {"t": t_k + 1.0, "aktor": "h", "soyle": "Canlı ya da ölü yazıyor. Fiyat aynı."},
          {"t": t_k + 4.0, "aktor": "h", "poz_bitir": "kagit"},
          {"t": t_k + 4.0, "aktor": "h", "esya": None}]
    s = kos(dict(sen, sure=t_k), t_k - 0.01)
    hx, hy = s["h"]["x"], s["h"]["y"]
    on_k = (cx - hx, cy - hy)
    n_k = math.hypot(*on_k) or 1
    on_k = (on_k[0] / n_k, on_k[1] / n_k)
    yan_k = (-on_k[1] * KAGIT_YAN, on_k[0] * KAGIT_YAN)   # kagit tutan SOL elin tarafi
    # yukaridan, cukurda yatan Baris (ust aci: caresizlik)
    K += [{"t": 3.0, "aci": "elle", "kam": [cx + 1.2, cy - 1.6, 4.2], "bak": [cx, cy, 0.0], "lens": 30},
          # okuma: yandan 3/4 -- yuzune konan kamera (yakin_on) yerde yatan
          # Baris'in 1.26 blok yanina dusuyordu ve kagit kadraj disindaydi
          {"t": t_k + 0.2, "aci": "elle", "kam": [hx + yan_k[0] * 2.9 + on_k[0] * 1.2,
                                                  hy + yan_k[1] * 2.9 + on_k[1] * 1.2, 1.75],
           "bak": "h", "bak_yuks": 1.62, "lens": 35},
          {"t": t_k + 2.6, "aci": "omuz", "a": "h", "b": "b", "lens": 30}]

    # ---- 2. SAHNE: sirtini donup gidiyor (Baris arkada, bulanik ama gorunur) ----
    t2 = t_k + 4.6
    yon = (hx - cx, hy - cy)
    n = math.hypot(*yon) or 1
    yon = (yon[0] / n, yon[1] / n)
    hedef2 = [hx + yon[0] * 6.5, hy + yon[1] * 6.5]
    O += [{"t": t2, "aktor": "h", "git": hedef2, "adim": 2.2},
          {"t": t2 + 3.0, "aktor": "h", "soyle": "Kırk iki."}]
    # kamera El-Harkos'un yolunun onunde, ona odakli; Baris arkada bulanik
    K += [{"t": t2, "aci": "elle", "kam": [hedef2[0] + yon[0] * 5.0 + yon[1] * 1.0, hedef2[1] + yon[1] * 5.0 - yon[0] * 1.0, 1.5],
           "bak": "h", "bak_yuks": 1.2, "lens": 35, "odak": "h"}]
    sen["fstop"] = 2.0
    t3 = t2 + 7.5

    # ---- 3. SAHNE: geri bakar -- cukur bos ----
    O += [{"t": t3 - 0.1, "aktor": "b", "gizle": True},          # kesme aninda yok (izleyici gormuyor)
          # yatma pozu GORUNMEZKEN biter: belirdigi an (4. sahne sonu) ayakta.
          # Eskiden belirme aninda bitiyordu; izleyici Baris'in cukurda yatip
          # kalktigini, tirpanin savruldugunu goruyordu ("mizrak isinlandiktan
          # sonra geliyor").
          {"t": t3 - 0.05, "aktor": "b", "z": 0.0},
          {"t": t3 - 0.05, "aktor": "b", "poz_bitir": True},
          {"t": t3, "aktor": "h", "bak": [cx, cy]}]
    K += [{"t": t3, "aci": "yakin_on", "a": "h", "lens": 35},
          {"t": t3 + 1.4, "aci": "goz", "a": "h", "hedef": [cx, cy, 0.0], "lens": 35}]
    t3b = t3 + 3.2
    O += [{"t": t3b, "aktor": "h", "git": [cx + yon[0] * 1.6, cy + yon[1] * 1.6], "adim": 3.0}]
    # cukurun yaninda sabit kamera: El-Harkos geri doner, cukura yaklasir
    K += [{"t": t3b, "aci": "elle", "kam": [cx - yon[1] * 3.2 - yon[0] * 1.5, cy + yon[0] * 3.2 - yon[1] * 1.5, 1.3],
           "bak": "h", "bak_yuks": 1.2, "lens": 30}]
    t3c = t3b + 3.2
    O += [{"t": t3c, "aktor": "h", "bak": [cx, cy]},
          {"t": t3c + 0.2, "aktor": "h", "poz": "comel_dokun"},
          {"t": t3c + 1.2, "aktor": "h", "soyle": "Hâlâ sıcak."}]
    # 2.2 blok / lens 40'ta diz cokmus El-Harkos'un basi kesiliyordu
    K += [{"t": t3c, "aci": "elle", "kam": [cx - yon[1] * 3.0, cy + yon[0] * 3.0, 1.1],
           "bak": [cx + yon[0] * 1.2, cy + yon[1] * 1.2, 0.75], "lens": 32}]
    t3d = t3c + 2.4
    O += [{"t": t3d, "aktor": "h", "poz": "etrafa_bak"}]
    K += [{"t": t3d, "aci": "yakin_on", "a": "h", "lens": 32, "yatik": 6},
          {"t": t3d + 1.2, "aci": "dusuk", "a": "h", "lens": 26, "yatik": -7}]

    # ---- 4. SAHNE: uc Baris isinlanir (dovusmuyorlar) -- muziksiz ----
    t4 = t3d + 2.8
    s = kos(dict(sen, sure=t4), t4 - 0.01)
    hx, hy, ha = s["h"]["x"], s["h"]["y"], s["h"]["aci"]
    yer = []
    for i, d in enumerate((-60, 180, 60)):
        a = math.radians(ha + d)
        yer.append([hx - math.sin(a) * 3.2, hy + math.cos(a) * 3.2])
    for i, (ad, tt) in enumerate((("k1", t4), ("k2", t4 + 1.7), ("k3", t4 + 3.2))):
        O += [{"t": tt, "aktor": ad, "goster": True},
              {"t": tt, "aktor": ad, "isinlan": yer[i], "yuz": "h"},
              {"t": tt + 0.55, "aktor": ad, "gizle": True},
              {"t": tt + 0.15, "aktor": "h", "bak": yer[i]}]
    K += [{"t": t4, "aci": "omuz", "a": "h", "b": "k1", "lens": 30},
          {"t": t4 + 1.7, "aci": "yakin_on", "a": "h", "lens": 35},
          {"t": t4 + 3.2, "aci": "omuz", "a": "h", "b": "k3", "lens": 30}]
    t4b = t4 + 4.6
    for i, ad in enumerate(("k1", "k2", "k3")):
        O += [{"t": t4b, "aktor": ad, "goster": True},
              {"t": t4b, "aktor": ad, "isinlan": yer[i], "yuz": "h"},
              {"t": t4b + 1.6, "aktor": ad, "gizle": True}]
    K += [{"t": t4b, "aci": "ust", "a": "h", "lens": 24}]          # tepeden: uc Baris, El-Harkos kucuk
    # gercek Baris onunde belirir
    t5 = t4b + 1.8
    onu = ileri(ha, 2.4)
    O += [{"t": t5 - 0.2, "aktor": "b", "goster": True},
          {"t": t5 - 0.2, "aktor": "b", "isinlan": [hx + onu[0], hy + onu[1]], "yuz": "h"},
          {"t": t5, "aktor": "h", "bak": "b"}]
    K += [{"t": t5 - 0.2, "aci": "genis", "a": "b", "b": "h", "lens": 28}]

    # ---- 5. SAHNE: dovus (Baris ilk dovusu: once zorlaniyor) ----
    t = t5 + 1.2
    # dovuse girerken Antitheus durusuna (0.35 sn harman: el sapta asagi kayar)
    O += [{"t": t - 0.3, "aktor": "b", "durus": "_set"}]
    O += [{"t": t, "aktor": "b", "vur": bv(), "hedef": "h"},                  # kivilcim
          {"t": t + 1.3, "aktor": "h", "soyle": "Bunu daha önce de denediler."},
          {"t": t + 2.0, "aktor": "h", "vur": "oto", "hedef": "b"},
          {"t": t + 3.0, "aktor": "b", "kacin": "geri"},
          {"t": t + 3.4, "aktor": "b", "vur": bv(), "hedef": "h", "hamle": 0.6},
          {"t": t + 4.9, "aktor": "h", "vur": "oto", "hedef": "b"},
          {"t": t + 5.6, "aktor": "b", "savun": 1.0},
          {"t": t + 6.8, "aktor": "b", "vur": bv(), "hedef": "h"},
          {"t": t + 8.0, "aktor": "h", "savun": 1.2},
          {"t": t + 8.2, "aktor": "b", "vur": bv(), "hedef": "h"},
          {"t": t + 9.8, "aktor": "h", "vur": "kosu", "hedef": "b"},
          {"t": t + 10.0, "aktor": "b", "kacin": "sag"},
          {"t": t + 10.8, "aktor": "b", "vur": bv(), "hedef": "h"},
          {"t": t + 12.4, "aktor": "b", "vur": bv(), "hedef": "h"}]
    K += [{"t": t, "aci": "yan", "a": "b", "b": "h"},
          {"t": t + 1.25, "aci": "omuz", "a": "b", "b": "h", "lens": 45, "odak": "h"},
          {"t": t + 2.0, "aci": "yan", "a": "b", "b": "h"},
          {"t": t + 3.4, "aci": "omuz", "a": "b", "b": "h"},
          {"t": t + 4.9, "aci": "yan", "a": "h", "b": "b"},
          {"t": t + 6.8, "aci": "yorunge", "a": "b", "b": "h", "sure": 18.0},
          {"t": t + 9.8, "aci": "genis", "a": "b", "b": "h", "lens": 30},
          {"t": t + 10.8, "aci": "yan", "a": "b", "b": "h"},
          {"t": t + 12.4, "aci": "dusuk", "a": "b", "b": "h", "lens": 30}]
    # 5a: ILK DELEN DARBE -- agir cekim + iki aci + yakin plan + sessizlik
    t5a = t + 15.0
    O += [{"t": t5a, "aktor": "b", "vur": bv(), "hedef": "h", "kan": True}]
    e5 = [e for e in F.zaman_cizelgesi(dict(sen, sure=t5a + 3), B.oku(F.HAREKET)["setler"], {})[1]
          if e["t"] > t5a and e["tur"] == "kan"]
    t_del = e5[0]["t"] if e5 else t5a + 0.6
    sen["zaman"] += [{"t": t_del - 0.35, "sure": 0.3, "hiz": 0.3},
                     {"t": t_del - 0.05, "sure": 0.12, "hiz": 0.03},
                     {"t": t_del + 0.07, "sure": 0.6, "hiz": 0.3}]
    K += [{"t": t5a, "aci": "yan", "a": "b", "b": "h", "lens": 35},
          # ayni darbe ikinci aci: Baris tarafindan alcak -- tirpan, kan ve
          # iki aktor birlikte (a=h iken El-Harkos tek basina profilde kaliyordu)
          {"t": t_del + 0.05, "aci": "dusuk", "a": "b", "b": "h", "lens": 28},
          {"t": t_del + 0.7, "aci": "omuz", "a": "b", "b": "h", "lens": 45, "odak": "h"}]
    O += [{"t": t_del + 1.4, "aktor": "h", "poz": "kagit", "tut": True},        # eline bakar
          {"t": t_del + 2.0, "aktor": "h", "soyle": "Bu… benim mi?"},
          {"t": t_del + 4.4, "aktor": "h", "poz_bitir": "kagit"}]
    # son alisveris: El-Harkos saldirir, Baris kacar, ikinci delen darbe
    t5b = t_del + 4.8
    O += [{"t": t5b, "aktor": "h", "vur": "kosu", "hedef": "b"},
          {"t": t5b + 0.25, "aktor": "b", "kacin": "sol"},
          {"t": t5b + 1.2, "aktor": "b", "vur": "hava", "hedef": "h", "kan": True, "dusur": "diz_cok"}]
    K += [{"t": t5b, "aci": "genis", "a": "b", "b": "h", "lens": 30},
          {"t": t5b + 1.2, "aci": "yan", "a": "b", "b": "h"}]
    e6 = [e for e in F.zaman_cizelgesi(dict(sen, sure=t5b + 5), B.oku(F.HAREKET)["setler"], {})[1]
          if e["t"] > t5b + 1.2 and e["tur"] == "kan"]
    t_son2 = e6[-1]["t"] if e6 else t5b + 2.0
    sen["zaman"].append({"t": t_son2 - 0.02, "sure": 0.1, "hiz": 0.04})
    O += [{"t": t_son2 + 1.4, "aktor": "h", "soyle": "Seni ucuza yazmışlar."},
          {"t": t_son2 + 4.4, "aktor": "h", "poz": "yuzustu", "tut": True}]
    # El-Harkos diz cokmus: kalip ayakta bas hizasina (1.62) bakiyor, konu
    # kadrajin dibinde kaliyordu -- kamera ve bakis asagi
    K += [{"t": t_son2 + 0.9, "aci": "omuz", "a": "b", "b": "h", "lens": 45, "odak": "h",
           "kam_dz": -0.5, "bak_dz": -0.55},
          {"t": t_son2 + 4.2, "aci": "genis", "a": "b", "b": "h", "lens": 30}]

    # ---- 6. SAHNE: govdesini tutarak birkac adim, sonra bayilir (2. sahnenin aynasi) ----
    t6 = t_son2 + 6.2
    s = kos(dict(sen, sure=t6), t6 - 0.01)
    bx, by, hx, hy = s["b"]["x"], s["b"]["y"], s["h"]["x"], s["h"]["y"]
    yon = (bx - hx, by - hy)
    n = math.hypot(*yon) or 1
    yon = (yon[0] / n, yon[1] / n)
    hedef6 = [bx + yon[0] * 3.0, by + yon[1] * 3.0]
    O += [{"t": t6 - 0.6, "aktor": "b", "durus": TIRPAN_BEKLE},          # dovus bitti: tirpan yine dik
          {"t": t6, "aktor": "b", "poz": "govde_tut", "tut": True},
          {"t": t6 + 0.4, "aktor": "b", "git": hedef6, "adim": 0.9},
          {"t": t6 + 4.4, "aktor": "b", "poz_bitir": "govde_tut"},
          {"t": t6 + 4.4, "aktor": "b", "poz": "bayil", "tut": True, "giris": 0.05}]
    K += [{"t": t6, "aci": "elle", "kam": [hedef6[0] + yon[0] * 5.0 + yon[1] * 1.0, hedef6[1] + yon[1] * 5.0 - yon[0] * 1.0, 1.5],
           "bak": "b", "bak_yuks": 1.1, "lens": 35, "odak": "b"},
          {"t": t6 + 5.6, "aci": "elle", "kam": [hedef6[0] + 3.5, hedef6[1] - 3.0, 3.0],
           "bak": [hedef6[0], hedef6[1], 0.3], "lens": 28, "kaydir": [0.15, -0.1, 0.12]}]
    sen["sure"] = round(t6 + 9.5, 2)
    # 4. sahne: kopyalar -- 180 derece kurali BILEREK bozuluyor (yon kaybi)
    sen["kural180_serbest"] = [[t4 - 0.1, t5 + 0.5]]
    # Yayin IKI parca (kullanici). Kesme: gercek Baris El-Harkos'un onunde
    # belirdikten hemen sonra, dovus baslamadan (Part 1 merakta biter).
    h_ = F.zaman_haritasi(sen)
    kesme = F.kare_bul(h_, t5 + 1.0) + 1
    sen["parcalar"] = {"part1": [1, kesme], "part2": [kesme + 1, len(h_)]}
    # ses: 3-4 muziksiz (sessizlik korkuyu buyutur), muzik dovusle girer,
    # ilk delen darbede bir an susar, 6. sahnede soner
    # isik anahtarlari SAHNELERE bagli (mutlak saniye degil): acilistaki
    # dovus cikarilinca butun olaylar ~6 sn one kaydi, gece yerinde kalmali.
    # 1-4 sabah; gece dovus boyunca coker (ikinci delis alacakaranlik); 6 gece.
    sen["isik"] = [{"t": 0, "gunes": 1.7, "gok": 0.18, "yukseklik": 38, "ay": 0.0},
                   {"t": t5 + 2.1, "gunes": 1.5, "gok": 0.16, "yukseklik": 28, "ay": 0.0},
                   {"t": t_del + 5.3, "gunes": 0.5, "gok": 0.06, "yukseklik": 4, "ay": 0.4},
                   # gece OKUNUR kalmali: ay 0.32 / gok 0.012'de final simsiyahti
                   {"t": t6, "gunes": 0.0, "gok": 0.045, "yukseklik": -6, "ay": 1.3},
                   {"t": t6 + 6.0, "gunes": 0.0, "gok": 0.045, "yukseklik": -6, "ay": 1.3}]
    sen["ses"] = {"ortam": "orman", "gece": [t_del + 3.3, t6 + 6.0],
                  "muzik": [{"bas": t5 - 0.2, "bit": t6 + 3.0, "sus": [[t_del - 0.05, t_del + 1.8]]}]}
    return sen


def oda():
    D, kx = 12, 0.0
    goz, genis_kam = (-3.8, -3.6, 1.75), (4.4, -4.6, 2.6)
    d = (genis_kam[0] - goz[0], genis_kam[1] - goz[1])
    n = math.hypot(*d)
    # gozler genis kameraya dondu; yakin kamera tam o bakisin uzerinde
    YAKIN = [goz[0] + d[0] / n * 0.75, goz[1] + d[1] / n * 0.75, goz[2]]
    return {
        "fps": FPS, "sure": 21.0, "cozunurluk": [1920, 1080], "ornek": TAM_ORNEK, "uyarlamali": 0.01,
        "mekan": "oda", "pozlama": 0.0,
        "ses": {"ortam": "oda", "son_vurgu": 19.3},
        "oda": {"genis": 12, "derin": D, "yuks": 5, "kapi_x": kx, "goz": [-3.8, -3.6, 1.75],
                "goz_aci": 30, "sis": 0.05, "toz": 180, "huzme_aci": 34, "huzme_egim": 64},
        "aktorler": {
            "a": {"skin": SKIN_ASKER, "isim": "Asker", "konum": [kx + 0.5, D / 2 + 1.2], "bak": 180},
            "g": {"skin": SKIN_ASKER, "isim": "", "konum": [-3.8, -3.6], "gizli": True},
        },
        "olaylar": [
            {"t": 0.0, "goz_bak": "kapi", "sure": 0.1},
            {"t": 3.0, "kapi": "ac", "sure": 0.9},
            {"t": 3.8, "aktor": "a", "git": [kx + 0.5, D / 2 - 3.2], "adim": 2.0},
            {"t": 6.2, "aktor": "a", "soyle": "Efendim, El-Harkos görevinde başarısız oldu."},
            {"t": 9.8, "aktor": "g", "soyle": "Tamam o zaman. Deney 081'i getirin."},
            {"t": 13.4, "aktor": "a", "bak": 0},
            {"t": 13.6, "aktor": "a", "git": [kx + 0.5, D / 2 + 1.6], "adim": 2.2},
            {"t": 16.0, "kapi": "kapat", "sure": 0.7},
            {"t": 18.0, "goz_bak": "kamera", "sure": 0.45},
        ],
        "kamera": [
            {"t": 0.0, "aci": "elle", "kam": [4.4, -4.6, 2.6], "bak": [-1.2, 1.0, 1.2], "lens": 24},
            {"t": 6.0, "aci": "elle", "kam": [2.2, 2.0, 1.7], "bak": "a", "bak_yuks": 1.5, "lens": 35},
            {"t": 9.6, "aci": "elle", "kam": [-1.4, -1.2, 1.9], "bak": [-3.8, -3.6, 1.75], "lens": 40},
            {"t": 13.2, "aci": "elle", "kam": [4.4, -4.6, 2.6], "bak": [-1.2, 1.0, 1.2], "lens": 24},
            # dorduncu duvar: gozler kameraya doner, kamera ona ISINLANIR (sert kesme)
            {"t": 19.3, "aci": "elle", "kam": YAKIN, "bak": [-3.8, -3.6, 1.75], "lens": 50},
        ],
    }


def main():
    os.makedirs(CIKTI, exist_ok=True)
    o = orman()
    with open(os.path.join(CIKTI, "bolum1_orman.json"), "w", encoding="utf-8") as f:
        json.dump(o, f, ensure_ascii=False, indent=1)
    with open(os.path.join(CIKTI, "bolum1_oda.json"), "w", encoding="utf-8") as f:
        json.dump(oda(), f, ensure_ascii=False, indent=1)
    print("orman: %.1f sn hikaye, %d film karesi; oda: 21 sn" % (o["sure"], len(F.zaman_haritasi(o))))


if __name__ == "__main__":
    main()
