# -*- coding: utf-8 -*-
"""Akici hareket: yay, yumusatma, ayak temasi, bas takibi, irkilme.   v7.99.16

Kullanici (2026-11-01): "robotik dovuslerden ya da hareketlerden memnun
degilim; izleyicilerimiz de memnun olmayacaktir." Film aracinda olculen
sebepler ve buradaki karsiliklari:

  sebep (blender_film.py, eski)                    karsilik (bu modul)
  -----------------------------------------------  ------------------------------
  donus sabit 540 derece/sn, aninda basla/dur       aci_yayi: kritik sonumlu yay
  yurume ilk karede tam hiz, varista aninda durus   yuru_hizi: ivme + varis freni
  sert bacak sallaninca IKI ayak da havada          adim_cokmesi: govde ayak
    (40 derecede 1,5 px, kosuda 3 px)                 temasina iner
  bas hicbir yere kendiliginden bakmiyor            bas_takibi: hedefe donuk bas,
                                                     yayla gecikerek (bas donuse
                                                     govdeden once baslar)
  katman gecisi 0,12 sn DOGRUSAL                    yumusak: smoothstep
  film pozlari anahtarlar arasi DOGRUSAL            akici_kanal: Blender'in
                                                     "auto clamped" egrisi
  darbe tepkisi hep ayni                            irkilme: vurusun yonune ve
                                                     gucune gore bas ve govde
  itme sonumu karede 0,8 (kare hizina bagli)        itme_sonumu: zamana bagli

Hepsi saf Python ve deterministik (ayni senaryo ayni film; tekrar cekim).
Blender gerekmez; test/hareket.mjs dogrudan olcer.
"""
import math

# ---- ayarlar (olculup secildi; test/hareket.mjs sinirlarini tutuyor) ----
DONUS_W = 15.0          # donus yayinin dogal frekansi (rad/sn): 90 derece ~0,3 sn
DONUS_AZAMI = 720.0     # derece/sn ust sinir (180 derece donuste bile ani degil)
DONUS_IVME = 2600.0     # derece/sn^2: ilk karede ~2 derece, 180 derece ~0,55 sn
YURU_IVME = 9.0         # blok/sn^2: yurume hizina ~0,5 sn, kosuya ~0,6 sn
YURU_FREN = 7.0         # blok/sn^2: varisa yaklasirken yavaslama
ITME_TAU = 0.1867       # sn: eski "karede x0,8" 24 kare/sn'de buna esit
BAS_W = 18.0            # bas yayi: govdeden hizli (once bas doner)
BAS_YAW, BAS_PITCH = 55.0, 25.0   # bas donus sinirlari (derece)
BACAK_PX = 12.0         # Minecraft bacak boyu (piksel)
BACAK_DERIN = 2.0       # bacak kutusunun yari derinligi (4 px / 2)
# ---- yer cekimi ve zipla (blok mekan, v7.99.16): Minecraft'in sayilari ----
# Oyun her tikte (20/sn) once konumu hiz kadar ilerletir, sonra hizi
# (v - 0,08) x 0,98 yapar; ekran tikler arasini dogrusal ara degerle cizer.
# Bu sira ziplamanin tepesini 1,2522 blok yapiyor; surekli zamanli yaklasim
# (ilk yazis) 0,89 veriyordu, o yuzden hesap tik tik.
TIK = 20                # tik/sn
YERCEKIMI_TIK = 0.08    # blok/tik^2
SURTUNME_TIK = 0.98     # dusey hiz carpani, tik basina
ZIPLA_TIK = 0.42        # blok/tik: ziplamanin ilk dusey hizi
INIS_ESIK = 4.0         # blok/sn: bundan hizli inen diz cokertir (yarim bloktan dusus ~5,5)
INIS_DIZ = 38.0         # derece: en sert iniste uylugun one donusu


def yumusak(u):
    """0..1 -> 0..1, baslangicta ve sonda hizsiz (smoothstep)."""
    u = 0.0 if u <= 0 else (1.0 if u >= 1 else u)
    return u * u * (3.0 - 2.0 * u)


def yay(x, v, hedef, dt, w):
    """Kritik sonumlu yay, KESIN cozum (her dt'de kararli). -> (x, v).
    Hedefe tasmadan, hiz surekli yaklasir: robotik "aninda basla/dur"un
    tersi."""
    c1 = x - hedef
    c2 = v + w * c1
    e = math.exp(-w * dt)
    return hedef + (c1 + c2 * dt) * e, (c2 - w * (c1 + c2 * dt)) * e


def aci_farki(hedef, aci):
    return (hedef - aci + 180.0) % 360.0 - 180.0


def aci_yayi(aci, hiz, hedef, dt, w=DONUS_W, azami=DONUS_AZAMI, ivme=DONUS_IVME):
    """Aciyi en kisa yoldan hedefe goturur. -> (aci, hiz, vardi_mi).
    Yayin istedigi hiz, IVME ve hiz sinirindan gecer: buyuk donuste yay tek
    basina ilk karede 23 derece atliyordu (yayin ilk ivmesi w^2 x aci).
    Simdi donus hizlanarak baslar, yayla yavaslayip oturur. Aci surekli
    kalir (vardiginda hedefin baska yazilisina -180/180 atlamaz)."""
    fark = aci_farki(hedef, aci)
    _, v_yay = yay(-fark, hiz, 0.0, dt, w)
    v = max(hiz - ivme * dt, min(hiz + ivme * dt, v_yay))
    v = max(-azami, min(azami, v))
    adim = (hiz + v) * 0.5 * dt
    if abs(adim) > abs(fark) and adim * fark > 0:
        adim = fark
    yeni = aci + adim
    kalan = aci_farki(hedef, yeni)
    vardi = abs(kalan) < 0.25 and abs(v) < 6.0
    return (yeni + kalan if vardi else yeni), (0.0 if vardi else v), vardi


def yuru_hizi(v, hedef_hiz, kalan, dt, ivme=YURU_IVME, fren=YURU_FREN):
    """Yurume hizi: ivmeyle kalkar, varisa yaklasirken yavaslar.
    kalan: hedefe kalan yol (blok)."""
    tavan = math.sqrt(2.0 * fren * max(0.0, kalan))
    if v < hedef_hiz:
        v = min(hedef_hiz, v + ivme * dt)
    else:
        v = max(hedef_hiz, v - fren * dt)
    return min(v, tavan)


def itme_sonumu(dt, tau=ITME_TAU):
    """Itme hizinin dt sonundaki carpani (kare hizindan bagimsiz)."""
    return math.exp(-dt / tau)


def bacak_acisi(mesafe, hizli, olcek=1.0, genlik=40.0):
    """Oyundaki yuruyus formulu: sag bacak acisi (derece); sol = -bu."""
    return math.cos(math.radians(mesafe * 38.17 / olcek)) * genlik * hizli


def adim_cokmesi(mesafe, hizli, olcek=1.0):
    """Sert bacak acilinca ayak yerden kalkar. Bacak 4 px derin bir kutu:
    yere ilk degen, kalcadan donen alt KOSE (ortasi degil): yuksekligi
    12(1 - cos t) - 2 sin|t| px; 40 derecede +1,5 px (havada), 15 derecede
    -0,1 px (topuk yere giriyor). Govde o kadar iner/kalkar, iki ayak da
    tam zemine basar (blok). Dogal yurume inip kalkmasi buradan gelir:
    adim acikken alcak, bacaklar alt alta iken yuksek."""
    th = math.radians(abs(bacak_acisi(mesafe, hizli, olcek)))
    kose = BACAK_PX * (1.0 - math.cos(th)) - BACAK_DERIN * math.sin(th)
    return -(kose / 16.0) * olcek


def _tikler(z0, v0, n):
    """n tik sonra (konum, hiz) -- blok, blok/tik."""
    p, v = z0, v0
    for _ in range(n):
        p += v
        v = (v - YERCEKIMI_TIK) * SURTUNME_TIK
    return p, v


def yorunge(z0, v0, u):
    """Havaya kalkistan (ziplama v0 = ZIPLA_TIK, kenardan dusme v0 = 0)
    u saniye sonra (z, dusey hiz blok/sn). Tikler arasi dogrusal."""
    n = int(max(0.0, u) * TIK)
    kesir = max(0.0, u) * TIK - n
    p, v = _tikler(z0, v0, n)
    return p + v * kesir, v * TIK


def ucus_suresi(z0, zh, v0):
    """z0'dan v0 ile kalkan aktor inerken zh'ye kac saniyede deger
    (yorunge ile ayni hesap). Zipla hedefe inecek yatay hizi buradan."""
    p, v = z0, v0
    for k in range(400):
        q = p + v
        if v < 0 and q <= zh:
            return (k + (p - zh) / (p - q)) / TIK
        p, v = q, (v - YERCEKIMI_TIK) * SURTUNME_TIK
    return 400.0 / TIK


def inis_cokmesi(u, guc=1.0, olcek=1.0, diz=True):
    """Iniste diz cokmesi. u: inisten beri sn; guc 0..1 (inis hizindan).
    Hizli cokus (0,07 sn), yumusak kalkis (~0,45 sn). Uyluk one theta,
    baldir geri 2 theta doner: ayak kalcanin tam altinda kalir, kalca
    12(1 - cos theta) px iner -- govde o kadar alcalir, ayak zeminde kalir.
    Dizsiz modelde bacak bukulemez: yalniz bel ve kollar (alcalma yok,
    yoksa ayak zemine girerdi). Donus: (alcalma blok, {kemik: [x, y, z]})."""
    if u < 0 or u > 0.6:
        return 0.0, {}
    a = (u / 0.07) if u < 0.07 else math.exp(-(u - 0.07) / 0.13)
    th = INIS_DIZ * guc * a
    ek = {"waist": [0.55 * th, 0.0, 0.0], "rightArm": [-0.45 * th, 0.0, 0.0], "leftArm": [-0.45 * th, 0.0, 0.0]}
    if not diz:
        return 0.0, ek
    for b in ("rightLeg", "leftLeg"):
        ek[b] = [-th, 0.0, 0.0]
        ek[b + "Alt"] = [2.0 * th, 0.0, 0.0]
    return -(BACAK_PX * (1.0 - math.cos(math.radians(th))) / 16.0) * olcek, ek


def bas_takibi(poz, aci, z, hedef, hedef_z):
    """Gozun hedefe donuk acilari (derece): (yaw, pitch). yaw + karakterin
    sagi (film_poz kurali: kafa Y +45 -> sag), pitch + asagi. Sinirli."""
    on = (-math.sin(math.radians(aci)), math.cos(math.radians(aci)))
    sag = (math.cos(math.radians(aci)), math.sin(math.radians(aci)))
    d = (hedef[0] - poz[0], hedef[1] - poz[1])
    uz = math.hypot(*d)
    if uz < 1e-6:
        return 0.0, 0.0
    yaw = math.degrees(math.atan2(d[0] * sag[0] + d[1] * sag[1], d[0] * on[0] + d[1] * on[1]))
    pitch = -math.degrees(math.atan2(hedef_z - z, uz))
    # arkada kalan hedefe bas zorlanmaz: siniri asan aci yumusakca sinira iner
    yaw = max(-BAS_YAW, min(BAS_YAW, yaw))
    return yaw, max(-BAS_PITCH, min(BAS_PITCH, pitch))


def irkilme(u, guc=1.0, yan=0.0):
    """Darbe aninin eklenen pozu. u: darbeden beri sn. Hizli yukselis
    (0,05 sn), yavas donus (~0,45 sn). yan: -1 soldan, +1 sagdan gelen
    vurus. Donus: {kemik: [x, y, z]} derece."""
    if u < 0 or u > 0.6:
        return {}
    a = (u / 0.05) if u < 0.05 else math.exp(-(u - 0.05) / 0.14)
    a *= guc
    return {"head": [-14.0 * a, -18.0 * yan * a, 6.0 * yan * a],
            "body": [-7.0 * a, -9.0 * yan * a, 0.0],
            "rightArm": [-10.0 * a, 0.0, 9.0 * a],
            "leftArm": [-10.0 * a, 0.0, -9.0 * a]}


# ---- film pozlari: anahtarlar arasi egri ----
def _kanal_anahtarlari(kanal):
    ks = []
    for k, v in kanal.items():
        if isinstance(v, dict):
            v = v.get("post", v.get("pre", [0, 0, 0]))
        if not isinstance(v, list) or any(isinstance(x, str) for x in v):
            return None                 # MoLang ifadesi: dokunulmaz
        ks.append((float(k), [float(x) for x in v]))
    ks.sort()
    return ks


def akici_kanal(kanal, adim=1.0 / 30.0, gecikme=0.0, uzunluk=None):
    """Blender'in "auto clamped" Bezier egrisi gibi: anahtarlardan gecer,
    tutmalarda ve uclarda HIZSIZ, ara anahtarlardan akarak gecer, iki
    anahtar arasinda tasma yapmaz (yerel tepe/cukurda teget sifir). Sonuc
    sik anahtarli (adim) dogrusal kanal; doğrusal okuyucu (bedrock_onizleme.deger)
    egriyi aynen izler. gecikme: ilk anahtar disindakileri kaydirir
    (ortusme: kol ve bas govdeden biraz sonra)."""
    ks = _kanal_anahtarlari(kanal)
    if not ks or len(ks) < 2:
        return kanal
    if gecikme:
        ks = [ks[0]] + [(t + gecikme, v) for t, v in ks[1:]]
    n = len(ks)
    boyut = len(ks[0][1])
    teg = []
    for i in range(n):
        tg = []
        for d in range(boyut):
            if i == 0 or i == n - 1:
                tg.append(0.0)
                continue
            (t0, a), (t1, b), (t2, c) = ks[i - 1], ks[i], ks[i + 1]
            # yerel tepe ya da tutma: teget sifir (tasma yok)
            if (b[d] - a[d]) * (c[d] - b[d]) <= 0:
                tg.append(0.0)
            else:
                tg.append((c[d] - a[d]) / (t2 - t0))
        teg.append(tg)
    son = ks[-1][0] if uzunluk is None else max(ks[-1][0], uzunluk)
    cikti = {}
    t = ks[0][0]
    zamanlar = []
    while t < son - 1e-9:
        zamanlar.append(t)
        t += adim
    zamanlar += [tt for tt, _ in ks]
    zamanlar.append(son)
    for t in sorted(set(round(x, 4) for x in zamanlar)):
        if t <= ks[0][0]:
            v = ks[0][1]
        elif t >= ks[-1][0]:
            v = ks[-1][1]
        else:
            i = max(j for j in range(n - 1) if ks[j][0] <= t)
            (t0, a), (t1, b) = ks[i], ks[i + 1]
            h = t1 - t0
            u = (t - t0) / h
            h00, h10 = 2 * u ** 3 - 3 * u ** 2 + 1, u ** 3 - 2 * u ** 2 + u
            h01, h11 = -2 * u ** 3 + 3 * u ** 2, u ** 3 - u ** 2
            v = [h00 * a[d] + h10 * h * teg[i][d] + h01 * b[d] + h11 * h * teg[i + 1][d] for d in range(boyut)]
            # ara anahtarlar arasinda bile iki ucun disina cikma
            v = [min(max(v[d], min(a[d], b[d])), max(a[d], b[d])) for d in range(boyut)]
        cikti["%.4f" % t] = [round(x, 4) for x in v]
    return cikti


def takip_tasmasi(kanal, oran=0.08, sure=0.18):
    """Hareketin sonunda hafif tasip geri oturma (follow-through). Yalniz
    buyuk (>20 derece) bir donusten sonra tutmaya giren anahtara eklenir."""
    ks = _kanal_anahtarlari(kanal)
    if not ks or len(ks) < 2:
        return kanal
    yeni = list(ks)
    for i in range(1, len(ks)):
        (t0, a), (t1, b) = ks[i - 1], ks[i]
        fark = [b[d] - a[d] for d in range(len(b))]
        if max(abs(x) for x in fark) < 20:
            continue
        sonraki = ks[i + 1] if i + 1 < len(ks) else None
        tutma = sonraki is None or max(abs(sonraki[1][d] - b[d]) for d in range(len(b))) < 1e-6
        if not tutma:
            continue
        bitis = sonraki[0] if sonraki else t1 + sure
        if bitis - t1 < sure:
            continue
        yeni.append((t1 + sure * 0.4, [b[d] + fark[d] * oran for d in range(len(b))]))
        yeni.append((t1 + sure, list(b)))
    yeni.sort()
    return {"%.4f" % t: v for t, v in yeni}
