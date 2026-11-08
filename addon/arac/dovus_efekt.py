"""Dovus efektleri -- Blender'siz hesap kismi.                       2026-11-08

Kullanici (2026-11-08): "dovus entegrasyonlarini ekledik ... daha fazla
arastirma yap hepsini de ekle." DOVUS_KIMLIKLERI.md bolum 12'nin kalan
maddeleri; yontem REFERANS_DOVUS_KOREOGRAFI.md §54, §64, §66, §72-74.

Burada yalniz SAYILAR uretilir (zaman, konum, guc); Blender'a donusturen
yer blender_film.kivilcim_kur / kompozitor_kur. Hepsi tohumlu: ayni
senaryo ayni efekti verir (tekrar cizim, dagitik cizimde kare kare ayni).

  isaret      : bir noktada buyuyen parilti (kurenin parlamasi, alin
                sembolu, avuc) + istege bagli yerde hedefe ilerleyen cizgi
                (buz cizgisi). Birakista tepe, sonra hizla soner (§72).
  cam_kir     : dikey cam levha 1/4 blokluk kare parcalara ayrilir, darbe
                yonunde balistik ucar, yere iner ve kalir (§74; fizik
                benzetimi degil, toprak parcalarinin yontemi).
  patlama     : kisa guclu isik + buyuyup sonen gri-beyaz kup duman +
                ucan bloklar + kamera sarsintisi (§74, creeper).
  darbe_karesi: 1-2 kare yuksek kontrast siyah-beyaz (§64; yalniz adi
                konmus doruk vuruslarina -- karar sahne yazilirken).
  suru        : saldiri jetonu (§73): hedef basina tek etkin saldiran,
                bir hazirlanan; otekiler halka uzerinde kendi faz ve
                hiziyla dolasir, hedefe bakarak bekler.
  atmosfer    : sis perdesi senaryo degeri (§54: planlar arasinda
                degismez); kompozitorde mist gecisiyle.
"""
import math
import random

# ---- isaret (§72) ----
ISARET_SURE = 0.35        # sn: varsayilan hazirlik (tek kaynak 300-500 ms)
ISARET_SON = 0.12         # sn: birakistan sonra sonme
ISARET_ISIK = 80.0        # W: tepe isik
ISARET_BOY = 0.22         # blok: tepe parilti kupu
CIZGI_ARALIK = 0.25       # blok: yerdeki cizginin parca araligi
CIZGI_PAY = 0.7           # cizgi hedefe isaretin bu oraninda ulasir

# ---- cam (§74) ----
CAM_HUCRE = 0.25          # blok: parca kenari (16 px'lik levhada 4 px)
CAM_KALINLIK = 0.04
CAM_HIZ = 2.6             # blok/sn: darbe yonunde ortalama
CAM_YERCEKIMI = 9.8       # blok/sn^2 (toprak parcalariyla ayni: 4.9 * 2)

# ---- patlama (§74) ----
PATLAMA_ISIK = 2600.0     # W tepe
PATLAMA_DUMAN = 16        # kup duman (guc 1)
PATLAMA_PARCA = 12        # ucan blok (guc 1)
PATLAMA_YARICAP = 1.7     # blok: dumanin ulastigi en uzak yer (guc 1)

# ---- darbe karesi (§64) ----
DARBE_KARESI_EN_COK = 3   # kare: kaynaklar 1-3 diyor; fazlasi rahatsiz eder

# ---- suru (§73) ----
SURU_YARICAP = 3.2        # blok: halka (VARIS 1,6'nin iki kati: etkin kosarak gelir)
SURU_TEMPO = 1.5          # sn: iki saldiri arasi
SURU_ADIM = (1.0, 1.7)    # blok/sn: halkada dolasma hizi (yurume 4,3'ten yavas, sinsi)
SURU_YAY = (25.0, 50.0)   # derece: halkada bir hamlede yer degistirme
SURU_BEKLE = (0.35, 0.9)  # sn: yer degistirdikten sonra hedefe bakip bekleme
SURU_HAZIR = 0.85         # hazirlanan halkanin bu oranina iner (itilen hedefe degmesin)
SURU_ARA = 22.0           # derece: iki uyenin halkadaki hedefleri en az bu kadar ayrik
                          # (ayni yere giden ikisi carpisip takiliyordu, olculdu)
SURU_KOS = 5.6            # blok/sn (blender_film.KOS)
SURU_VARIS = 1.6          # blok (blender_film.VARIS)

# ---- atmosfer (§54) ----
ATMOSFER_VARSAYILAN = {"yogunluk": 0.55, "renk": [0.78, 0.82, 0.88], "baslangic": 4.0,
                       "derinlik": 28.0, "egri": "LINEAR"}


def _yumusak(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3.0 - 2.0 * u)


# ============================================================
# isaret
# ============================================================
def isaret_gucu(t, t0, sure=ISARET_SURE, son=ISARET_SON):
    """0..1: t0'dan birakisa (t0 + sure) yumusakca buyur, birakista 1,
    `son` icinde dogrusal soner; oncesi ve sonrasi 0."""
    t1 = t0 + sure
    if t < t0:
        return 0.0
    if t <= t1:
        return _yumusak((t - t0) / sure) if sure > 0 else 1.0
    if t <= t1 + son:
        return 1.0 - (t - t1) / son
    return 0.0


def isaret_ornekleri(t0, sure=ISARET_SURE, son=ISARET_SON, adim=1.0 / 30.0):
    """[(t, guc)]: isaretten bir adim once 0'dan sonrasinda 0'a kadar."""
    out = []
    n = int(math.ceil((sure + son) / adim)) + 2
    for k in range(-1, n + 1):
        t = t0 + k * adim
        out.append((t, isaret_gucu(t, t0, sure, son)))
    return out


def yer_cizgisi(bas, hedef, t0, sure=ISARET_SURE, aralik=CIZGI_ARALIK):
    """[(x, y, t_belir, aci_derece)]: bas'tan hedefe yerde ilerleyen cizgi.
    Parcalar sirayla belirir, cizgi hedefe isaretin %70'inde ulasir;
    hepsi isaretle birlikte soner (Blender tarafi)."""
    dx, dy = hedef[0] - bas[0], hedef[1] - bas[1]
    uz = math.hypot(dx, dy)
    if uz < 1e-6:
        return []
    n = max(1, int(round(uz / aralik)))
    aci = math.degrees(math.atan2(dy, dx))
    return [(bas[0] + dx * k / n, bas[1] + dy * k / n, t0 + CIZGI_PAY * sure * k / n, aci)
            for k in range(n + 1)]


# ============================================================
# cam kirilmasi
# ============================================================
def cam_parcalari(merkez, genislik, yukseklik, normal, t0, tohum=1, hiz=CAM_HIZ,
                  zemin_z=0.0, hucre=CAM_HUCRE, adim=1.0 / 30.0):
    """Dikey cam levha: merkez (x, y, z), genislik x yukseklik blok, yuzey
    normali `normal` (XY, darbenin gittigi yon). Her hucre bir parca:
    {"bas": (x, y, z), "boy": (en, kal, boy), "aci": derece (levhanin yonu),
     "iz": [(t, x, y, z, don)], "yere": t}
    Darbe noktasina (merkez) yakin parca daha hizli; hepsi darbe yonunde
    savrulur, yere iner ve orada kalir."""
    rnd = random.Random(int(tohum) * 104729 + 17)
    nx, ny = normal[0], normal[1]
    nu = math.hypot(nx, ny) or 1.0
    nx, ny = nx / nu, ny / nu
    yx, yy = -ny, nx                       # levhanin yatay ekseni
    sut = max(1, int(round(genislik / hucre)))
    sat = max(1, int(round(yukseklik / hucre)))
    w, h = genislik / sut, yukseklik / sat
    yari = math.hypot(genislik, yukseklik) / 2.0
    aci = math.degrees(math.atan2(yy, yx))
    out = []
    for i in range(sut):
        for j in range(sat):
            u = -genislik / 2.0 + (i + 0.5) * w
            v = -yukseklik / 2.0 + (j + 0.5) * h
            x0 = merkez[0] + yx * u
            y0 = merkez[1] + yy * u
            z0 = merkez[2] + v
            yakin = 1.0 - min(1.0, math.hypot(u, v) / yari)
            s = hiz * rnd.uniform(0.6, 1.15) * (0.7 + 0.8 * yakin)
            yan = rnd.uniform(-0.9, 0.9) + u * 0.8   # kenardaki parca disa acilir
            vx = nx * s + yx * yan
            vy = ny * s + yy * yan
            vz = rnd.uniform(-0.2, 1.4) + v * 0.6
            don_hiz = rnd.uniform(-540.0, 540.0)
            iz, yere = [(t0, x0, y0, z0, 0.0)], None
            for k in range(1, 400):
                tt = k * adim
                x = x0 + vx * tt
                y = y0 + vy * tt
                z = z0 + vz * tt - 0.5 * CAM_YERCEKIMI * tt * tt
                if z <= zemin_z + CAM_KALINLIK / 2:
                    yere = t0 + tt
                    iz.append((yere, x, y, zemin_z + CAM_KALINLIK / 2, don_hiz * tt))
                    break
                iz.append((t0 + tt, x, y, z, don_hiz * tt))
            out.append({"bas": (x0, y0, z0), "boy": (w * 0.92, CAM_KALINLIK, h * 0.92), "aci": aci,
                        "iz": iz, "yere": yere})
    return out


# ============================================================
# patlama (creeper)
# ============================================================
def patlama(merkez, t0, tohum=1, guc=1.0, zemin_z=0.0, adim=1.0 / 30.0):
    """{"isik": [(t, W)], "duman": [...], "parca": [...], "sarsinti": t0}
    duman: {"t0", "t1", "iz": [(t, x, y, z, boy)]} -- buyur, yukselir, soner
    parca: {"boy", "iz": [(t, x, y, z, don)], "yere"} -- balistik ucan blok"""
    rnd = random.Random(int(tohum) * 7919 + 3)
    mx, my, mz = merkez
    isik = [(t0 - adim, 0.0), (t0, PATLAMA_ISIK * guc), (t0 + 0.1, PATLAMA_ISIK * 0.3 * guc),
            (t0 + 0.4, 0.0)]
    duman = []
    for k in range(int(round(PATLAMA_DUMAN * guc))):
        a = rnd.uniform(0.0, 2.0 * math.pi)
        e = rnd.uniform(-0.25, 1.0)
        yon = (math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), abs(math.sin(e)) + 0.15)
        r1 = PATLAMA_YARICAP * guc * rnd.uniform(0.45, 1.0)
        b0 = t0 + rnd.uniform(0.0, 0.08)
        b1 = b0 + rnd.uniform(0.45, 0.9)
        boy_tepe = rnd.uniform(0.35, 0.75) * (0.6 + 0.4 * guc)
        iz = []
        n = int(math.ceil((b1 - b0) / adim))
        for i in range(n + 1):
            u = i / n
            yay = 1.0 - (1.0 - u) ** 2            # hizla acilir, yavaslar
            boy = boy_tepe * (u / 0.25 if u < 0.25 else 1.0 - (u - 0.25) / 0.75)
            iz.append((b0 + i * adim, mx + yon[0] * r1 * yay, my + yon[1] * r1 * yay,
                       mz + yon[2] * r1 * yay + 0.35 * u, max(0.0, boy)))
        duman.append({"t0": b0, "t1": b1, "iz": iz, "gri": rnd.uniform(0.55, 0.95)})
    parca = []
    for k in range(int(round(PATLAMA_PARCA * guc))):
        a = rnd.uniform(0.0, 2.0 * math.pi)
        s = rnd.uniform(2.5, 5.0) * guc
        v = (math.cos(a) * s, math.sin(a) * s, rnd.uniform(2.5, 5.5) * (0.6 + 0.4 * guc))
        don_hiz = rnd.uniform(-720.0, 720.0)
        iz, yere = [(t0, mx, my, mz, 0.0)], None
        boy = rnd.uniform(0.12, 0.28)
        for i in range(1, 400):
            tt = i * adim
            z = mz + v[2] * tt - 0.5 * CAM_YERCEKIMI * tt * tt
            x, y = mx + v[0] * tt, my + v[1] * tt
            if z <= zemin_z + boy / 2 and i > 2:
                yere = t0 + tt
                iz.append((yere, x, y, zemin_z + boy / 2, don_hiz * tt))
                break
            iz.append((t0 + tt, x, y, z, don_hiz * tt))
        parca.append({"boy": boy, "iz": iz, "yere": yere})
    return {"isik": isik, "duman": duman, "parca": parca, "sarsinti": t0}


# ============================================================
# darbe karesi
# ============================================================
def darbe_kareleri(efektler, kare_bul, harita):
    """{film_karesi (1 tabanli): ters (bool)} -- "darbe_karesi" efektleri.
    Kare sayisi DARBE_KARESI_EN_COK'ta kirpilir."""
    out = {}
    for e in efektler:
        if e["tur"] != "darbe_karesi":
            continue
        f0 = kare_bul(harita, e["t"]) + 1
        n = max(1, min(DARBE_KARESI_EN_COK, int(e.get("kare", 2))))
        for k in range(n):
            out[f0 + k] = bool(e.get("ters", False))
    return out


# ============================================================
# suru duzeni (saldiri jetonu)
# ============================================================
def suru_olaylari(senaryo):
    """senaryo["suru"] (tek ya da liste):
      {"hedef": "b", "uyeler": ["z1", "z2", ...], "t": [t0, t1],
       "tohum": 1, "yaricap": 3.2, "tempo": 1.5, "vur": "oto"}
    -> uretilen olaylar (senaryonun kendi olaylarina eklenir).
    Hedef basina tek etkin saldiran (kosar, vurur, halkaya geri cekilir);
    siradaki "hazirlanan" halkadan iceri adim atar ve hedefe bakar;
    otekiler halkada kendi faz/hizla dolasir, durunca hedefe bakar.
    SINIR: halka hedefin BASLANGIC konumuna kurulur -- suru araliginda
    hedef yerinde kalmali (kusatilan kahraman)."""
    suru = senaryo.get("suru")
    if not suru:
        return []
    out = []
    for s in (suru if isinstance(suru, list) else [suru]):
        out += _suru_tek(s, senaryo["aktorler"])
    return out


def _halka(m, a, r):
    return [round(m[0] + r * math.cos(math.radians(a)), 4), round(m[1] + r * math.sin(math.radians(a)), 4)]


def _aci_fark(a, b):
    return abs((a - b + 180.0) % 360.0 - 180.0)


def _bos_aci(u, a2, yon, aci):
    """a2'yi oteki uyelerin halka hedeflerinden SURU_ARA uzaga kaydir."""
    for _ in range(16):
        if all(_aci_fark(a2, aci[v]) >= SURU_ARA for v in aci if v != u):
            return a2 % 360.0
        a2 += yon * SURU_ARA / 2.0
    return a2 % 360.0


def _yol_suresi(p, q, hiz):
    """Akici yurumenin ivmeli kalkis ve yavaslayan varisi icin pay."""
    return math.hypot(q[0] - p[0], q[1] - p[1]) / hiz + 0.45


def _suru_tek(s, aktorler):
    """Zaman sirasiyla tek geciste: her an her uyenin halkadaki hedef acisi
    bilinir, yeni hedef o ANKI otekilerden SURU_ARA uzak secilir (sonradan
    bakilan aci dongusu iki uyeyi ayni yere yolluyordu, olculdu)."""
    hedef = s["hedef"]
    uyeler = list(s["uyeler"])
    t0, t1 = float(s["t"][0]), float(s["t"][1])
    R = float(s.get("yaricap", SURU_YARICAP))
    tempo = float(s.get("tempo", SURU_TEMPO))
    rnd = random.Random(int(s.get("tohum", 1)) * 6007 + 11)
    m = aktorler[hedef]["konum"]
    aci, yon_isaret, hiz = {}, {}, {}
    for i, u in enumerate(uyeler):
        k = aktorler[u].get("konum")
        aci[u] = (math.degrees(math.atan2(k[1] - m[1], k[0] - m[0])) if k
                  else 360.0 * i / len(uyeler))
        yon_isaret[u] = rnd.choice((-1.0, 1.0))
        hiz[u] = rnd.uniform(*SURU_ADIM)
    sira = uyeler[:]
    rnd.shuffle(sira)
    kosu = max(0.0, R - SURU_VARIS) / SURU_KOS + 0.25    # ivmeli kalkis payi
    yuva, ts, k = [], t0 + 0.4, 0
    while ts + 0.9 <= t1:
        u = sira[k % len(sira)]
        sure_h = _yol_suresi(_halka(m, 0, R), _halka(m, 0, R * SURU_HAZIR), hiz[u])
        yuva.append({"ts": ts, "u": u, "th": ts - sure_h - 0.25 if k else None})
        k += 1
        ts += tempo
    olay = []
    serbest = {u: t0 + rnd.uniform(0.0, 0.5) for u in uyeler}   # bu andan once yeni is yok
    geri_bekleyen = []                                           # [(t, u, yakin)]
    dt = 0.02
    adim_sayi = int(math.ceil((t1 - t0) / dt))
    for i in range(adim_sayi + 1):
        t = t0 + i * dt
        for y in yuva:
            # hazirlanan: halkadan iceri adim atar, hedefe doner
            if y["th"] is not None and t <= y["th"] < t + dt and serbest[y["u"]] <= y["th"]:
                v = y["u"]
                olay.append({"t": round(y["th"], 4), "aktor": v, "git": _halka(m, aci[v], R * SURU_HAZIR),
                             "adim": round(hiz[v], 3), "varinca_bak": hedef, "_suru": "hazir"})
                serbest[v] = 1e9
            # etkin: kosar, vurur; geri cekilmesi vurustan sonra planlanir
            if t <= y["ts"] < t + dt:
                u = y["u"]
                olay.append({"t": round(y["ts"], 4), "aktor": u, "git": hedef, "kos": True, "_suru": "etkin"})
                olay.append({"t": round(y["ts"] + kosu, 4), "aktor": u, "vur": s.get("vur", "oto"),
                             "hedef": hedef, "_suru": "etkin"})
                a_ = math.radians(aci[u])
                geri_bekleyen.append((y["ts"] + kosu + 0.75, u,
                                      [m[0] + SURU_VARIS * math.cos(a_), m[1] + SURU_VARIS * math.sin(a_)]))
                serbest[u] = 1e9
        for g in [g for g in geri_bekleyen if t <= g[0] < t + dt]:
            geri_bekleyen.remove(g)
            tg, u, yakin = g
            # dik geri: kendi acisinda halkaya (yanlamasina cekilen, kosarak
            # gelen siradakinin yoluna giriyor, ikisi carpisip donuyordu)
            q = _halka(m, aci[u], R)
            olay.append({"t": round(tg, 4), "aktor": u, "git": q, "adim": round(hiz[u] * 1.4, 3),
                         "varinca_bak": hedef, "_suru": "geri"})
            serbest[u] = tg + _yol_suresi(yakin, q, hiz[u] * 1.4) + rnd.uniform(*SURU_BEKLE)
        # otekiler: bos zamanlarinda halkada dolasir, durunca hedefe bakar
        for u in uyeler:
            if serbest[u] > t or t > t1 - 0.5:
                continue
            # siradaki isi: hazirlik (henuz gelmediyse) ya da kosu
            gelecek = [(y["th"] if y["th"] is not None and y["th"] > t else y["ts"]) for y in yuva
                       if y["u"] == u and y["ts"] > t]
            sonraki = min(gelecek + [t1])
            yay = rnd.uniform(*SURU_YAY)
            a2 = _bos_aci(u, aci[u] + yon_isaret[u] * yay, yon_isaret[u], aci)
            q = _halka(m, a2, R)
            sure = _yol_suresi(_halka(m, aci[u], R), q, hiz[u])
            if t + sure + 0.1 > sonraki:
                serbest[u] = sonraki
                continue
            aci[u] = a2
            if rnd.random() < 0.25:
                yon_isaret[u] = -yon_isaret[u]   # ara sira yon degistirir (canli)
            olay.append({"t": round(t, 4), "aktor": u, "git": q, "adim": round(hiz[u], 3),
                         "varinca_bak": hedef, "_suru": "dolas"})
            serbest[u] = t + sure + rnd.uniform(*SURU_BEKLE)
    return sorted(olay, key=lambda o: o["t"])


def tum_olaylar(senaryo):
    """Senaryonun yazili olaylari + suru yardimcisinin urettikleri."""
    return list(senaryo.get("olaylar", [])) + suru_olaylari(senaryo)


# ============================================================
# atmosfer (sis perdesi)
# ============================================================
def atmosfer_ayari(senaryo):
    """Senaryo duzeyinde tek deger (planlar arasinda degismez, §54) ya da None.
    Kamera kaydinda "atmosfer" yazilmasi HATA: sureklilik bozulur."""
    a = senaryo.get("atmosfer")
    for c in senaryo.get("kamera", []):
        if "atmosfer" in c:
            raise ValueError("atmosfer plan basina yazilmaz (t=%s): senaryo degeri, planlar arasinda sabit" % c.get("t"))
    if not a:
        return None
    out = dict(ATMOSFER_VARSAYILAN)
    out.update(a)
    if not (0.0 <= float(out["yogunluk"]) <= 1.0):
        raise ValueError("atmosfer yogunlugu 0..1 olmali")
    if out["egri"] not in ("LINEAR", "QUADRATIC", "INVERSE_QUADRATIC"):
        raise ValueError("atmosfer egrisi: LINEAR / QUADRATIC / INVERSE_QUADRATIC")
    return out


def atmosfer_payi(mesafe, ayar):
    """Kameradan `mesafe` blok uzaktaki yuzeyin sis rengine karisma payi
    (Blender mist gecisi x yogunluk). Kompozitorle ayni formul."""
    u = max(0.0, min(1.0, (mesafe - float(ayar["baslangic"])) / float(ayar["derinlik"])))
    if ayar["egri"] == "QUADRATIC":
        u = u * u
    elif ayar["egri"] == "INVERSE_QUADRATIC":
        u = math.sqrt(u)
    return float(ayar["yogunluk"]) * u
