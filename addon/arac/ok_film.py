# -*- coding: utf-8 -*-
"""Buz oklari filmde: iskeletin atisi, okun ucusu, isabet, yere saplanma ve
geri savusturma. Blender gerektirmez (blender_film.zaman_cizelgesi cagirir).
2026-11-25

Kullanici (2026-11-25): "Siradaki 2. madde: iskeletlerin buz oklari ve
Pipos'un oklari iskeletlere geri savusturmasi, ikisini de yap."
SERI_SEZON1.md: Pipos koyluleri kurtariyor, buz iskeletlerinin oklarini
onlara geri savusturuyor; iskeletler moloz tepesinde "cek-dayan" okcular.

FIZIK UYDURULMADI. Java 26.3 istemci JAR'indan javap ile okundu
(REFERANS_MOJANG_KILAVUZ.md "Buz oklari"):
  cikis   AbstractArrow(EntityType, LivingEntity): atanin goz yuksekliginin
          0.1 blok alti
  atis    AbstractSkeleton.performRangedAttack: hedef noktasi hedefin
          boyunun 1/3'u; dusey farka yatay uzakligin 0.2'si eklenir;
          hiz 1.6 blok/tik (yayin gucunden bagimsiz)
  germe   RangedBowAttackGoal.tick: iskelet yayi 20 tik gerip birakir;
          BowItem.getPowerForTime: f = tik/20, guc = (f*f + 2f)/3, 20 tikte 1
  ucus    AbstractArrow.tick: konum += hiz; havada hiz *= 0.99
          (getAirDrag); hiz.y -= 0.05 (getDefaultGravity)
  boylar  EntityTypes: oyuncu 0.6 x 1.8 (goz 1.62), iskelet 0.6 x 1.99
          (goz 1.74), zombi 0.6 x 1.95 (goz 1.74), ok 0.5 x 0.5
Oyundaki sapma (rangedAttackUncertainty) filmde yok: ok nisan alindigi yere
gider; iska icin olay "sapma" tasir.

SAVUSTURMA OYUNDA YOK, filmin kurali: "savustur" araliginda savusturanin
govdesine SAVUSTURMA_MENZIL'den yakin gelen ok, ayni hizla atanina doner
(nisan oyunun kuraliyla: boyunun 1/3'u + 0.2 yay payi). Savusturan oka
SAVUSTURMA_ONCE kala savunma durusuna gecer.

TIKLER ARASI: oyun okun yerini tik basina hesaplar, istemci iki tik arasini
ara degerle cizer. Filmde de ok tikin icinde dogrusal gider, tik sinirinda
surtunme ve yercekimi islenir; temas, savusturma ve saplanma tikin icindeki
gercek aninda olur. Her okun tikleri kendi birakisindan sayilir.

Senaryo:
  {"t": 3.0, "aktor": "i1", "ok": "pipos"}        3.0'da birakir (2.0'dan gerer)
  {"t": 3.0, "aktor": "i1", "ok": [x, y, z], "ad": "ok1", "sapma": [0, 0.5, 0]}
  {"t": 2.0, "aktor": "pipos", "savustur": 3.0, "dusur": "dus"}
"""
import math

TIK = 20.0
OK_HIZ = 1.6               # blok/tik, iskelet (performRangedAttack)
YAY_PAYI = 0.2             # dusey farka yatay uzakligin bu kadari
HEDEF_BOY = 1.0 / 3.0      # hedef noktasi: boyunun 1/3'u (getY(0.3333))
CIKIS_ALTI = 0.1           # goz yuksekliginin altindan cikar
SURTUNME = 0.99            # havada, tik basina
YERCEKIMI = 0.05           # blok/tik^2
OK_YARI = 0.25             # ok kutusu 0.5 x 0.5
GERME_SURE = 1.0           # 20 tik: iskelet birakir, yay tam gerili (guc 1.0)
# tur -> (en, boy, goz) blok (EntityTypes); None: insan aktor (oyuncu)
BOYUT = {None: (0.6, 1.8, 1.62), "iskelet": (0.6, 1.99, 1.74), "zombi": (0.6, 1.95, 1.74)}
SAVUSTURMA_MENZIL = 1.1    # blok, savusturanin govde ekseninden
SAVUSTURMA_ONCE = 0.12     # sn: ok gelmeden savunma durusu
SAVUSTURMA_SURE = 0.35     # sn: savunma durusunun boyu
KALAN_OK = True            # yere saplanan ok sahne boyunca kalir


def boyut(a):
    """aktorun (en, boy, goz) blok, olcegiyle"""
    tur = (getattr(a, "yaratik", None) or {}).get("tur")
    en, boy, goz = BOYUT.get(tur, BOYUT[None])
    s = getattr(a, "olcek", 1.0)
    return en * s, boy * s, goz * s


def hedef_noktasi(a):
    """oyunun nisan noktasi: ayaklar + boyunun 1/3'u"""
    return [a.poz[0], a.poz[1], a.z + boyut(a)[1] * HEDEF_BOY]


def cikis_noktasi(a):
    """okun ciktigi yer: goz yuksekliginin 0.1 alti, atanin ekseninde"""
    return [a.poz[0], a.poz[1], a.z + boyut(a)[2] - CIKIS_ALTI]


def atis_hizi(bas, hedef, hiz=None):
    """performRangedAttack: dusey farka yatay uzakligin 0.2'si eklenir,
    birim vektor * hiz (blok/tik; verilmezse OK_HIZ, cagri aninda okunur)."""
    hiz = OK_HIZ if hiz is None else hiz
    dx, dy, dz = (hedef[i] - bas[i] for i in range(3))
    yatay = math.hypot(dx, dy)
    v = [dx, dy, dz + yatay * YAY_PAYI]
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n * hiz for x in v]


def hiz_adimi(hiz):
    """tik sonunda hiz: havada * 0.99 (getAirDrag), dusey -0.05 (getDefaultGravity)"""
    v = [x * SURTUNME for x in hiz]
    v[2] -= YERCEKIMI
    return v


def tik_adimi(konum, hiz):
    """AbstractArrow.tick: konum += hiz; hiz *= 0.99; hiz.y -= 0.05"""
    return [konum[i] + hiz[i] for i in range(3)], hiz_adimi(hiz)


def yon(hiz):
    """(yaw, pitch) derece: yaw filmin kurali (0 = +y), pitch yukari +"""
    yaw = math.degrees(math.atan2(-hiz[0], hiz[1]))
    pitch = math.degrees(math.atan2(hiz[2], math.hypot(hiz[0], hiz[1])))
    return yaw, pitch


def _kesisim(p0, p1, a, pay=OK_YARI):
    """p0 -> p1 dogru parcasi aktorun silindirini (yaricap en/2 + pay, boy)
    kesiyorsa parcadaki ilk oran (0..1), kesmiyorsa None."""
    en, boy, _ = boyut(a)
    r = en / 2 + pay
    cx, cy = a.poz
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    fx, fy = p0[0] - cx, p0[1] - cy
    A = dx * dx + dy * dy
    B = 2 * (fx * dx + fy * dy)
    C = fx * fx + fy * fy - r * r
    adaylar = []
    if C <= 0:
        adaylar.append(0.0)
    if A > 1e-12:
        D = B * B - 4 * A * C
        if D >= 0:
            s = math.sqrt(D)
            adaylar += [u for u in ((-B - s) / (2 * A), (-B + s) / (2 * A)) if 0.0 <= u <= 1.0]
    for u in sorted(adaylar):
        z = p0[2] + (p1[2] - p0[2]) * u
        if a.z - pay <= z <= a.z + boy + pay:
            return u
    return None


def _savusturma_payi(s):
    """_kesisim payi: savusturma menzili savusturanin govde ekseninden olculur"""
    return SAVUSTURMA_MENZIL - boyut(s)[0] / 2


class Ok:
    def __init__(self, ad, atan, konum, hiz, t0, olay):
        self.ad = ad
        self.atan = atan            # su an sahibi (savusturulunca savusturan)
        self.ilk_atan = atan
        self.konum = list(konum)
        self.hiz = list(hiz)
        self.t0 = t0                # birakis ani (hikaye zamani); tikler buradan sayilir
        self.tau = 0.0              # birakistan beri gelinen tik zamani (kesirli)
        self.isabet_kare = None     # isabet karesi: ok o karede temas noktasinda gorunur
        self.savusturanlar = set()  # oku savusturmus olanlar
        self.olay = olay
        self.durum = "ucuyor"       # ucuyor | saplandi | isabet
        self.savusturuldu = False
        self.hazir = set()          # savunma durusu baslatilmis savusturanlar
        self.cikti = False          # atanin kutusundan cikti mi (oyunda leftOwner)
        self.dusur = None           # savusturanin "dusur"u (savusturulunca)
        self.son_yon = yon(hiz)


class OkDunyasi:
    """Senaryonun ok olaylari; zaman_cizelgesi her karede adim() cagirir.
    isabet(h, ok, nokta, yon, t, dusur) ve savustu(s, ok, nokta, t)
    zaman_cizelgesi'nin kapamalari: tepki, itme, irkilme ve efekt orada."""

    def __init__(self, olaylar, aktorler, zemin):
        self.aktorler = aktorler
        self.zemin = zemin
        self.bekleyen = sorted([dict(o) for o in olaylar if o.get("ok") is not None and o.get("aktor")],
                               key=lambda o: o["t"])
        self.savusturma = [dict(o) for o in olaylar if o.get("savustur") is not None and o.get("aktor")]
        for o in self.bekleyen + self.savusturma:
            if o["aktor"] not in aktorler:
                raise ValueError("ok: aktor yok: %s" % o["aktor"])
        for o in self.bekleyen:
            if isinstance(o["ok"], str) and o["ok"] not in aktorler:
                raise ValueError("ok: hedef aktor yok: %s" % o["ok"])
        self.oklar = []
        self.kareler = {}           # ok adi -> [(x, y, z, yaw, pitch, gorunur)]

    # -- nisan: atan, birakmadan GERME_SURE once hedefe doner
    def nisan_et(self, t):
        for o in self.bekleyen:
            if o["t"] - GERME_SURE <= t < o["t"] and isinstance(o["ok"], str):
                a, h = self.aktorler[o["aktor"]], self.aktorler[o["ok"]]
                a.hedef_aci = math.degrees(math.atan2(-(h.poz[0] - a.poz[0]), h.poz[1] - a.poz[1]))
                a.bak_kim = h.ad

    def _savusturan(self, ok, t):
        """penceresi su an acik savusturanlar: (aktor, olay); okun sahibi atlanir"""
        for o in self.savusturma:
            if not (o["t"] <= t <= o["t"] + float(o["savustur"])):
                continue
            s = self.aktorler[o["aktor"]]
            if s.ad == ok.atan:
                continue
            yield s, o

    def adim(self, f, t, isabet, savustu, hazirlan):
        # yeni oklar
        while self.bekleyen and self.bekleyen[0]["t"] <= t + 1e-9:
            o = self.bekleyen.pop(0)
            a = self.aktorler[o["aktor"]]
            hedef = hedef_noktasi(self.aktorler[o["ok"]]) if isinstance(o["ok"], str) else list(o["ok"])
            sap = o.get("sapma", [0, 0, 0])
            hedef = [hedef[i] + sap[i] for i in range(3)]
            bas = cikis_noktasi(a)
            ad = o.get("ad") or "ok%d" % (len(self.oklar) + 1)
            if ad in self.kareler:
                raise ValueError("ok: ayni ad iki kez: %s" % ad)
            ok = Ok(ad, a.ad, bas, atis_hizi(bas, hedef), o["t"], o)
            self.oklar.append(ok)
            self.kareler[ad] = [None] * f
        # ilerle: her ok kendi birakisindan sayilan tik zamaninda (hikaye
        # zamani: agir cekimde ve vurus donmasinda ok da yavaslar, durur).
        # Tikin icinde ok dogrusal gider (oyunda istemci de iki tik arasini ara
        # degerle cizer); tik sinirinda surtunme ve yercekimi islenir. Temas,
        # savusturma ve saplanma tikin icindeki gercek aninda olur. Ok yalniz
        # tik sinirinda ilerleseydi 30 fps'de her ucuncu karede, agir cekimde
        # daha sik yerinde kalirdi ve savusturma noktasinda beklerdi.
        for ok in self.oklar:
            if ok.durum != "ucuyor":
                continue
            for s, o in self._savusturan(ok, t):
                # savunma durusu oka SAVUSTURMA_ONCE kala
                if s.ad not in ok.hazir:
                    p = ok.konum
                    adim_ = SAVUSTURMA_ONCE * TIK
                    ileri = [p[i] + ok.hiz[i] * adim_ for i in range(3)]
                    if _kesisim(p, ileri, s, SAVUSTURMA_MENZIL) is not None:
                        ok.hazir.add(s.ad)
                        hazirlan(s, t)
            hedef = (t - ok.t0) * TIK
            while ok.durum == "ucuyor" and hedef - ok.tau > 1e-9:
                sinir = math.floor(ok.tau + 1e-9) + 1.0
                son = min(sinir, hedef)
                yeni = [ok.konum[i] + ok.hiz[i] * (son - ok.tau) for i in range(3)]
                u, tur, kim, o = self._ilk_temas(ok, ok.konum, yeni, t)
                if tur is None:
                    if not ok.cikti and _kesisim(ok.konum, yeni, self.aktorler[ok.atan]) is None:
                        ok.cikti = True             # atanin kutusundan cikti (oyunda leftOwner)
                    ok.konum, ok.tau = yeni, son
                    if son >= sinir - 1e-9:         # tik siniri
                        ok.hiz = hiz_adimi(ok.hiz)
                        ok.son_yon = yon(ok.hiz)
                    continue
                nokta = [ok.konum[i] + (yeni[i] - ok.konum[i]) * u for i in range(3)]
                ok.konum, ok.tau = nokta, ok.tau + (son - ok.tau) * u
                if tur == "savustur":
                    # ayni hizla atanina, oyunun nisan kuraliyla; tikin kalani yeni yonde
                    geri = self.aktorler[ok.ilk_atan]
                    sur = math.sqrt(sum(x * x for x in ok.hiz))
                    ok.hiz = atis_hizi(nokta, hedef_noktasi(geri), sur)
                    ok.atan, ok.savusturuldu, ok.cikti = kim.ad, True, False
                    ok.savusturanlar.add(kim.ad)
                    ok.dusur = o.get("dusur")
                    ok.son_yon = yon(ok.hiz)
                    if kim.ad not in ok.hazir:
                        hazirlan(kim, t)
                    savustu(kim, ok, nokta, t)
                elif tur == "isabet":
                    ok.durum, ok.isabet_kare = "isabet", f
                    isabet(kim, ok, nokta, ok.hiz, t, ok.dusur or ok.olay.get("dusur"))
                else:
                    ok.durum = "saplandi"
        # kayit: isabet eden ok, isabet karesinde temas noktasinda gorunur
        for ok in self.oklar:
            gor = (ok.durum == "ucuyor" or (ok.durum == "saplandi" and KALAN_OK)
                   or (ok.durum == "isabet" and ok.isabet_kare == f))
            yaw, pitch = ok.son_yon
            self.kareler[ok.ad].append((ok.konum[0], ok.konum[1], ok.konum[2], yaw, pitch, gor))

    def _ilk_temas(self, ok, p0, p1, t):
        """p0 -> p1 yolunda okun ilk temasi: (oran, tur, aktor, olay); tur
        "savustur" (savusturma menzili), "isabet" (aktor), "zemin" ya da None.
        Bir savusturan ayni oku bir kez savusturur (iki savusturan arasinda
        sonsuz donus olmasin)."""
        en = (None, None, None, None)
        for s, o in self._savusturan(ok, t):
            if s.ad in ok.savusturanlar:
                continue
            u = _kesisim(p0, p1, s, _savusturma_payi(s))
            if u is not None and (en[0] is None or u < en[0]):
                en = (u, "savustur", s, o)
        for h in self.aktorler.values():
            if not h.gorunur or (h.ad == ok.atan and not ok.cikti):
                continue
            u = _kesisim(p0, p1, h)
            if u is not None and (en[0] is None or u < en[0]):
                en = (u, "isabet", h, None)
        zx = self.zemin(p1[0], p1[1], t)
        if p1[2] <= zx:
            u = min(1.0, max(0.0, (p0[2] - zx) / max(1e-9, p0[2] - p1[2])))
            if en[0] is None or u < en[0]:
                en = (u, "zemin", None, None)
        return en

    def kayit(self):
        """[{"ad", "atan", "kareler": [(x, y, z, yaw, pitch, gorunur) | None]}]"""
        return [{"ad": ok.ad, "atan": ok.ilk_atan, "savusturuldu": ok.savusturuldu, "durum": ok.durum,
                 "kareler": self.kareler[ok.ad]} for ok in self.oklar]


def nisan_araliklari(olaylar, ad):
    """iskeletin 'ok' olaylarindan yay durusu araliklari [(bas, son)]:
    birakmadan GERME_SURE once gerer, birakinca 0.15 sn daha tutar."""
    return [(o["t"] - GERME_SURE, o["t"] + 0.15) for o in olaylar
            if o.get("aktor") == ad and o.get("ok") is not None]
