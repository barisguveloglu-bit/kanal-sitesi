#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Epic Fight animasyonlarini Bedrock bicimine cevirir.

---- IKI BICIM ARASINDAKI FARK ----
Epic Fight: her eklem icin kare zamanlari + her karede 4x4
            DONUSUM MATRISI (mutlak yerel poz, baglama pozu
            dahil).
Bedrock:    kemik basina euler DERECE (+ konum/olcek), vanilla
            oyuncu kemiklerinde.

---- ISKELETLER (ikisi de dosyadan olculdu, v5.5) ----
Epic Fight  (assets/epicfight/animmodels/entity/biped.json,
             armature.hierarchy):

    Root
      |- Thigh_R -> Leg_R, Knee_R
      |- Thigh_L -> Leg_L, Knee_L
      \- Torso -> Chest -> Head
                        -> Shoulder_R -> Arm_R -> Hand_R -> Tool_R
                        -> Shoulder_L -> Arm_L -> Hand_L -> Tool_L

Bedrock oyuncusu (geometry.humanoid.custom; Marvel Project
paketinin oyuncu modelleri birebir bunu yansitiyor, 48
modelde ayni cikti):

    root
      |- waist -> body -> head
      |                -> rightArm
      |                \- leftArm
      |- rightLeg
      \- leftLeg

IKISI AYNI YAPIDA:
    Root  = root          (her seyin atasi)
    Torso = waist         (govde, bacaklarin KARDESI)
    Chest = body          (kafa ve kollarin ATASI)
    Thigh = rightLeg/leftLeg (root'un cocugu)

---- v5.4'TE NEDEN BOZUKTU ----
Iki hata vardi, ikisi de "uzuvlar govdeden kopmus" gorunumu
uretiyordu (kullanicinin ekran goruntuleri):

1. ROOT ATILIYORDU. 63 animasyonun 60'inda Root ekseninde
   20 dereceden fazla, en cok 88.8 derecelik bir GOVDE DONUSU
   var (savurma vuruslarinda karakter kendi ekseninde
   donuyor). Cevirici Root'u hic okumuyordu. Ama kafa ve
   bacaklar Root'un cocugu olduklari icin ONU DENGELEYEN
   ters donuslar tasiyorlar -- olculdu: axe_auto1'de Root
   Y=-60.3 iken Head Y=+58.6. Root atilinca dengeleme
   ortada kaliyor ve kafa 113 derece savruluyordu.

2. GOVDE_CIKAR YANLISTI. Eski yorum "Bedrock'ta rightLeg,
   body'nin cocugu" diyordu. Degil: bacaklar root'un cocugu,
   body'nin KARDESI -- tipki Epic Fight'taki gibi. Yani
   cikarilacak bir sey yoktu; cikarma bacaklara govdenin
   TERSINI ekliyordu.

---- ROOT NEREYE YAZILIYOR ----
Kendi bone'una: `root`. Once Root'u body'ye KATLAMAYI
denedim -- sayilar dogruydu ama onizleme yalanladi: body'nin
donme merkezi BOYUN (pivot 0,24,0), root'unki AYAK (0,0,0).
Govdeyi boyundan dondurunce torso kafanin altindan kayiyor,
yani duzeltmeye calistigimiz "kopma" gorunumunun aynisi
cikiyordu. Olculen pivotlar (Marvel Project'in 46 oyuncu
modeli, hepsi ayni):
    root (0,0,0)  waist (0,12,0)  body (0,24,0)
    head (0,24,0) kol (+-5,22,0)  bacak (+-2,12,0)

Bu yuzden esleme bire bir. `root` ve `waist` bulunmayan
modellerde (kendi Ben 10 modellerimiz oyleydi) Bedrock o
kemikleri sessizce atlar; onlarin hiyerarsisi v5.5'te
vanilla ile ayni hale getirildi.

Root'un OTELEMESI alinmiyor (en cok 15 blok -- blackstar_
basic_attack_4 bir atilis). Bedrock'ta oyuncunun yerini oyun
belirliyor; modelin kayması karakteri gövdesinden ayirirdi.

---- KOL ZINCIRI ----
Bedrock'un kolu TEK kemik, Epic Fight'inki zincir
(Shoulder -> Arm -> Elbow -> Hand). Zincirin deltalari
carpiliyor. DIRSEK BUKULMESI KAYBOLUYOR -- Bedrock'ta onu
tasiyacak kemik yok. Aktarilan sey kolun GENEL YONU.

---- EULER SUREKLILIGI (asil "dans" sebebi) ----
Bedrock kareler arasini DUZ (linear) ara degerle geciyor ve
bunu her eksen icin AYRI yapiyor. Euler ayristirmasi ise
sureksiz: ayni donus [179.7, 72.7, 179.9] da yazilabilir
[-179.9, 66.0, 177.8] de. Aradaki gercek fark 0.4 derece,
ama Bedrock 179.7'den -179.9'a DUZ gidiyor: 359.6 derecelik
bir savrulma.

v5.4 dosyasinda olculdu: 7470 kare gecisinin 363'u 90
dereceden, 147'si 180 dereceden, 90'i 270 dereceden buyuk
sicriyordu -- en kotusu saniyede 7049 derece. Kullanicinin
"karakter bildigin dans ediyor" dedigi sey bu.

Cozum euler_surekli(): her karede iki esdeger cozumden
    (x, y, z)  ve  (x+180, 180-y, z+180)
onceki kareye YAKIN olani secilip 360'in katlariyla
kaydiriliyor. Ilk kare sifira en yakin dala oturtuluyor
(Bedrock animasyona girerken mevcut pozdan harmanliyor;
540 derecelik bir ilk kare girise bir bucuk tur atardi).

Iki cozumun ayni matrisi verdigi ve ayristirmanin
Rz·Ry·Rx sirasinda oldugu sayisal olarak dogrulandi
(3000 rastgele donus, hata 0.0).

---- BEDROCK ISARETI ----
Dosyadaki deger matematiksel donusun TERSI (bu depoda
v4.88'de olculdu). O yuzden isaret cevriliyor. Isaret
cevirmek eksenler arasi FARKLARI degistirmedigi icin
sureklilik islemi once, cevirme sonra yapiliyor.
"""
import json, math, os, sys

BEDROCK_TERS = True          # v4.88'de olculdu

# Bedrock kemigi -> Epic Fight eklemi. Iki iskelet ayni
# yapida oldugu icin esleme BIRE BIR; katlama, cikarma yok.
# Tek istisna kol: Bedrock'ta tek kemik, Epic Fight'ta zincir.
ZINCIR = {
    "root":     ["Root"],
    "waist":    ["Torso"],
    "body":     ["Chest"],
    "head":     ["Head"],
    "rightArm": ["Shoulder_R", "Arm_R"],
    "leftArm":  ["Shoulder_L", "Arm_L"],
    "rightLeg": ["Thigh_R", "Leg_R"],
    "leftLeg":  ["Thigh_L", "Leg_L"],
}


def mat(v):
    """16 float -> 4x4 (satir oncelikli)."""
    return [v[0:4], v[4:8], v[8:12], v[12:16]]


def carp(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)]
            for i in range(4)]


def birim():
    return [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]


def ters_donus(m):
    """Sadece DONUS+OTELEME iceren bir matrisin tersi.

    Donus kismi ortonormal kabul ediliyor (baglama pozunda
    olcek yok -- kontrol edildi), o yuzden tersi devrigi.   """
    r = [[m[j][i] for j in range(3)] for i in range(3)]
    t = [m[0][3], m[1][3], m[2][3]]
    tt = [-sum(r[i][k] * t[k] for k in range(3)) for i in range(3)]
    return [r[0] + [tt[0]], r[1] + [tt[1]], r[2] + [tt[2]], [0, 0, 0, 1]]


def euler_xyz(m):
    """Donus matrisi -> (x, y, z) derece.

    Ayristirma sirasi Rz·Ry·Rx (sayisal olarak dogrulandi).  """
    sy = -m[2][0]
    sy = max(-1.0, min(1.0, sy))
    y = math.asin(sy)
    if abs(sy) < 0.99999:
        x = math.atan2(m[2][1], m[2][2])
        z = math.atan2(m[1][0], m[0][0])
    else:                       # gimbal kilidi
        x = math.atan2(-m[1][2], m[1][1])
        z = 0.0
    return [math.degrees(a) for a in (x, y, z)]


def sar(d):
    """Aciyi (-180, 180] araligina indirger."""
    d = math.fmod(d + 180.0, 360.0)
    if d <= 0:
        d += 360.0
    return d - 180.0


def euler_surekli(m, onceki):
    """Onceki kareye SUREKLI baglanan euler acilari.

    Iki esdeger cozumden (ikisi de ayni matrisi verir --
    dogrulandi) onceki kareye yakin olani secilir, sonra
    360'in katlariyla kaydirilir. Boylece Bedrock'un duz ara
    degeri kisa yoldan gider; dosyadaki 359 derecelik
    sicramalar kalmaz.

    onceki None ise (ilk kare) sifira en yakin dal secilir.  """
    x, y, z = euler_xyz(m)
    adaylar = ((x, y, z), (x + 180.0, 180.0 - y, z + 180.0))
    en_iyi = None
    for a in adaylar:
        if onceki is None:
            b = [sar(v) for v in a]
            maliyet = max(abs(v) for v in b)
        else:
            b = [onceki[i] + sar(a[i] - onceki[i]) for i in range(3)]
            maliyet = max(abs(b[i] - onceki[i]) for i in range(3))
        if en_iyi is None or maliyet < en_iyi[0]:
            en_iyi = (maliyet, b)
    return en_iyi[1]


# ---------------------------------------------------------------
#  ROOT'U ILK KAREYE GORE SIFIRLA (v5.5)
#
#  Iki ayri sorunu ayni islem cozuyor, cunku ikisi de root'un
#  SOLDAN carpilan SABIT bir carpani:
#
#  1) KOMBO DEVAMI. Kaynak animasyonlar bir seri: auto_1'in
#     bitirdigi yerden auto_2 basliyor. Olculdu: 63
#     animasyonun yalniz 12'si root'u sifira yakin
#     basliyor, 15'i 90 DERECEDEN fazla donmus basliyor
#     (orbit_attack_1: 173 derece). Epic Fight'ta bu sorun
#     degil -- varlik zaten oraya donmus durumda. Bedrock'ta
#     her animasyon tek basina, oyuncunun yonu kameranin,
#     yani 173 derece BIR ANDA donmek demek.
#
#  2) EKSEN DUZENI. Uc dosya (longsword_auto1/2/3) Root'u
#     Y-yukari duzeninde tasiyor, baglama pozu Z-yukari.
#     Olculdu: o uc dosyada D(Root)·e_y = (0, -0.1, -1.0) --
#     SABIT ve 95 derece yatmis; diger 60 dosyada e_y'ye
#     yakin. Root katlaninca karakter YATIYORDU.
#
#  D(Root,t0)^-1 ile soldan carpmak ikisini de goturuyor:
#  sabit carpan neyse (kombo acisi, eksen farki, ikisi
#  birden) sadelesiyor, animasyonun KENDI donusu duruyor.
#  Esik yok, tahmin yok. Buyuk bir sabit atildiginda
#  ekrana yaziliyor, sessizce olmuyor.
#
#  Yalniz ROOT sifirlaniyor. Kollarin/govdenin ilk kare
#  pozu GERCEK poz (kalkmis kol, burulmus govde); onlara
#  dokunmak vurusun hazirlik duruşunu silerdi.
# ---------------------------------------------------------------


def baglama(yol):
    """Dosyadan armature oku."""
    return baglama_veri(json.load(open(yol, encoding="utf-8")))


def baglama_veri(d):
    """armature -> eklem adi -> yerel dinlenme matrisi."""
    out = {}

    def gez(n):
        out[n["name"]] = mat(n["transform"])
        for c in (n.get("children") or []):
            gez(c)
    kok = d["armature"]["hierarchy"]
    for n in (kok if isinstance(kok, list) else [kok]):
        gez(n)
    return out


def kare_bul(zaman, kareler, t):
    """t aninda eklemin matrisi (en yakin ONCEKI kare).

    Ara deger yok. Ara degerli surumu icin poz_bul().       """
    en = 0
    for i, z in enumerate(zaman):
        if z <= t + 1e-6:
            en = i
    return kareler[en]


# ---------------------------------------------------------------
#  KAYNAKTAN ARA DEGER (v5.5)
#
#  Kaynak kareler arasinda 100 dereceyi gecen donusler var
#  (olculdu: agony_auto_4'te Root 0.083 saniyede 118 derece --
#  savurarak donen bir vurus). Epic Fight bunlarin arasini
#  KUATERNIYON ile geciyor; Bedrock ise euler eksenlerini tek
#  tek DUZ birlestiriyor. 170 derecelik bir yayda bu iki yol
#  cok ayriliyor: uzuv dogru yere variyor ama YANLIS YOLDAN.
#
#  O yuzden ara degeri BIZ hesapliyoruz (kaynagin kendi
#  yontemiyle, slerp) ve cikti karelerini yay 45 dereceyi
#  gecmeyecek kadar sikliyoruz. Bedrock'un duz birlestirmesi
#  45 derecelik parcalarda gercek yaydan ayirt edilemiyor.
#  Depolama sorun degil (kullanicinin acik kurali).
# ---------------------------------------------------------------
YAY_ESIK = 45.0          # derece
BOLME_DERINLIGI = 4      # en cok 16 parca


def kuaterniyon(m):
    """Donus matrisi -> (w, x, y, z)."""
    iz = m[0][0] + m[1][1] + m[2][2]
    if iz > 0:
        s = math.sqrt(iz + 1.0) * 2
        return (0.25 * s, (m[2][1] - m[1][2]) / s,
                (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s)
    if m[0][0] > m[1][1] and m[0][0] > m[2][2]:
        s = math.sqrt(1.0 + m[0][0] - m[1][1] - m[2][2]) * 2
        return ((m[2][1] - m[1][2]) / s, 0.25 * s,
                (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s)
    if m[1][1] > m[2][2]:
        s = math.sqrt(1.0 + m[1][1] - m[0][0] - m[2][2]) * 2
        return ((m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s,
                0.25 * s, (m[1][2] + m[2][1]) / s)
    s = math.sqrt(1.0 + m[2][2] - m[0][0] - m[1][1]) * 2
    return ((m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s,
            (m[1][2] + m[2][1]) / s, 0.25 * s)


def kuaterniyon_mat(q):
    """(w, x, y, z) -> 4x4 donus matrisi."""
    n = math.sqrt(sum(a * a for a in q)) or 1.0
    w, x, y, z = (a / n for a in q)
    return [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
        [0, 0, 0, 1]]


def slerp(a, b, u):
    nokta = sum(p * q for p, q in zip(a, b))
    if nokta < 0:                 # kisa yol
        b = tuple(-q for q in b)
        nokta = -nokta
    if nokta > 0.9995:            # neredeyse ayni: duz gecis yeter
        return tuple(p + (q - p) * u for p, q in zip(a, b))
    aci = math.acos(max(-1.0, min(1.0, nokta)))
    s = math.sin(aci)
    k1 = math.sin((1 - u) * aci) / s
    k2 = math.sin(u * aci) / s
    return tuple(p * k1 + q * k2 for p, q in zip(a, b))


def poz_bul(zaman, kuatlar, t):
    """t aninda eklemin DONUSU (kareler arasi slerp)."""
    if t <= zaman[0]:
        return kuaterniyon_mat(kuatlar[0])
    if t >= zaman[-1]:
        return kuaterniyon_mat(kuatlar[-1])
    i = 0
    for k, z in enumerate(zaman):
        if z <= t + 1e-9:
            i = k
    if i >= len(zaman) - 1:
        return kuaterniyon_mat(kuatlar[-1])
    aralik = zaman[i + 1] - zaman[i]
    u = 0.0 if aralik <= 0 else (t - zaman[i]) / aralik
    return kuaterniyon_mat(slerp(kuatlar[i], kuatlar[i + 1], u))


def donus_acisi(a, b):
    """Iki donus matrisi arasindaki aci (derece)."""
    iz = sum(sum(a[i][k] * b[i][k] for k in range(3)) for i in range(3))
    return math.degrees(math.acos(max(-1.0, min(1.0, (iz - 1) / 2))))


def cevir(anim_yol, bind, ad):
    d = json.load(open(anim_yol, encoding="utf-8"))
    eklem = {e["name"]: e for e in d["animation"]}

    # Dosya KENDI baglama pozunu tasiyorsa onu kullan.
    # 63 kaynagin 55'i tasiyor; Epic Fight'in biped'inden
    # kucuk ama gercek farklari var (en cok 0.108, Hand_R).
    # Epic Fight de boyle yapiyor: JsonAssetLoader animasyonun
    # kendi armature'unu okuyor.
    if "armature" in d:
        bind = baglama_veri(d)

    # Butun kare zamanlarinin birlesimi
    zamanlar = sorted({round(t, 4) for e in d["animation"] for t in e["time"]})
    if not zamanlar:
        return None

    # Her eklemin karelerini KUATERNIYONA cevir (bir kez).
    # Oteleme atiliyor: cikti sadece donus yaziyor ve bir
    # carpimin donus kismi yalniz donus kisimlarina bagli.
    kuat = {}
    for j, e in eklem.items():
        if j not in bind:
            continue
        ters = ters_donus(bind[j])
        deltalar = [carp(ters, mat(k)) for k in e["transform"]]
        if j == "Root" and deltalar:
            # Ilk kareye gore sifirla (yukaridaki basliga bak)
            sifir = ters_donus(deltalar[0])
            sapma = donus_acisi(deltalar[0], birim())
            if sapma > 30.0:
                print("    root ilk kare sifirlandi: %-24s (%.0f derece)"
                      % (ad, sapma))
            deltalar = [carp(sifir, D) for D in deltalar]
        kuat[j] = [kuaterniyon(D) for D in deltalar]

    def zincirMat(zincir, t):
        m = birim()
        for j in zincir:
            e = eklem.get(j)
            if not e or j not in kuat:
                continue
            m = carp(m, poz_bul(e["time"], kuat[j], t))
        return m

    kemikler = {}
    for bkemik, zincir in ZINCIR.items():
        if not any(j in eklem for j in zincir):
            continue
        # Bu kemigin KENDI kare zamanlari: birlesim kullanmak
        # merdiven basamagi yapiyordu (her kemik digerlerinin
        # zamanlarinda ayni degeri tekrarliyordu).
        kendiZaman = sorted({round(t, 4) for j in zincir
                             if j in eklem for t in eklem[j]["time"]})

        # ---- YAYI SIKLASTIR ----
        # Iki kare arasi gercek donus YAY_ESIK'i geciyorsa
        # araya kaynaktan ornek ekleniyor (yukaridaki
        # "KAYNAKTAN ARA DEGER" basligi).
        poz = {t: zincirMat(zincir, t) for t in kendiZaman}
        for _ in range(BOLME_DERINLIGI):
            ekle = []
            sirali = sorted(poz)
            for i in range(1, len(sirali)):
                t0, t1 = sirali[i - 1], sirali[i]
                if t1 - t0 < 1e-4:
                    continue
                if donus_acisi(poz[t0], poz[t1]) > YAY_ESIK:
                    ekle.append(round((t0 + t1) / 2, 4))
            if not ekle:
                break
            for t in ekle:
                if t not in poz:
                    poz[t] = zincirMat(zincir, t)

        donusler = {}
        onceki = None
        for t in sorted(poz):
            r = euler_surekli(poz[t], onceki)
            onceki = r
            if BEDROCK_TERS:
                r = [-a for a in r]
            donusler[("%.4f" % t)] = [round(a, 2) for a in r]

        # ---- TEKRAR EDEN KARELERI AT ----
        # Ust uste ayni degeri yazmak dosyayi bosuna sisiriyor.
        # Ilk ve SON kare her zaman kaliyor (sonu atmak
        # animasyonu yarida keserdi).
        anahtarlar = list(donusler)
        suzulmus = {}
        oncekiV = None
        for i, k in enumerate(anahtarlar):
            v = donusler[k]
            son = (i == len(anahtarlar) - 1)
            if oncekiV is None or son or any(
                    abs(a - b) > 0.05 for a, b in zip(v, oncekiV)):
                suzulmus[k] = v
                oncekiV = v
        donusler = suzulmus
        # Hicbir sey donmuyorsa kemigi hic yazma
        if all(all(abs(a) < 0.05 for a in v) for v in donusler.values()):
            continue
        kemikler[bkemik] = {"rotation": donusler}

    if not kemikler:
        return None
    return {
        "loop": False,
        # ---- KATMAN CAKISMASI (v5.5) ----
        # Bedrock playAnimation ciktisini vanilla
        # animasyonlarin USTUNE EKLIYOR: move.arms (yururken
        # kol sallama), attack.rotations (vanilla vurus),
        # bob, holding, sneaking. Vurus animasyonu tam da
        # vanilla vurusla ayni anda oynadigi icin iki hareket
        # toplaniyordu.
        #
        # override_previous_animation bu animasyonun
        # YAZDIGI kemikleri toplamak yerine DEGISTIRIYOR;
        # yazmadigi kemiklere dokunmuyor. Referans
        # paketlerde 87 animasyon boyle yapiyor -- aralarinda
        # bu depoya zaten aktardigimiz Ben 10 modunun tam
        # govde pozlari (greymatter.pose, cannonbolt.ball_in).
        "override_previous_animation": True,
        "animation_length": max(zamanlar),
        "bones": kemikler,
    }


# Cikti kimlik oneki. WoM dovus dosyasi "animation.wom."
# kullaniyor (ayarlar.js:WOM_ANIM_ONEK ile ayni olmak
# ZORUNDA -- yoksa playAnimation bulamaz).
ONEK_VARSAYILAN = "animation.ef."


if __name__ == "__main__":
    argv = sys.argv[1:]
    onek = ONEK_VARSAYILAN
    if argv and argv[0].startswith("--onek="):
        onek = argv.pop(0).split("=", 1)[1]
    bind = baglama(argv[0])
    out = {"format_version": "1.8.0", "animations": {}}
    for yol in argv[2:]:
        ad = os.path.splitext(os.path.basename(yol))[0]
        a = cevir(yol, bind, ad)
        if a:
            out["animations"][onek + ad] = a
            print("  %-28s %d kemik, %.2f sn" %
                  (ad, len(a["bones"]), a["animation_length"]))
        else:
            print("  %-28s ATLANDI (hareket yok)" % ad)
    json.dump(out, open(argv[1], "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("yazildi:", argv[1], len(out["animations"]), "animasyon")
