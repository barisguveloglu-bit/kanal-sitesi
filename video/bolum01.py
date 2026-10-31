"""Deneme bölümü 01 — "Çay Diplomasisi" (Country Balls, 2D).

Kullanım:
    python3 bolum01.py                 # video + ses + kit (tam kalite)
    python3 bolum01.py --hizli         # yarım çözünürlük önizleme
    python3 bolum01.py --sadece kit    # yalnız CapCut/Premiere kiti
    python3 bolum01.py --kare 13.6     # tek kare PNG (kontrol için)

Senaryodaki bilgi: kişi başı çay tüketiminde Türkiye dünya birincisi
(2016 verisi: Türkiye 3,16 kg, İngiltere 1,94 kg — Statista; bkz. README).
"""
import argparse
import math
import subprocess
import sys
from pathlib import Path

import cairo
import numpy as np

import cizim as z
import ses

SR = ses.SR
W, H, FPS = 1920, 1080, 30
SURE = 20.0
ZEMIN = 860
R = 165
TX, IX = 640, 1290

KONUMLAR = {"turkiye": TX, "ingiltere": IX}

BALONLAR = [
    dict(kim="ingiltere", metin="Çay saati!\nBenim çayım dünyanın\nen iyisi.",
         bas=2.15, bit=5.0, hiz=26, x=IX - 70, y=255),
    dict(kim="turkiye", metin="Dünyada kişi başı en çok\nçayı kim içiyor, biliyor musun?",
         bas=5.3, bit=8.05, hiz=28, x=TX + 90, y=330),
    dict(kim="turkiye", metin="BEN.", bas=8.2, bit=9.55, hiz=0, x=TX + 30, y=320, boyut=86),
    dict(kim="ingiltere", metin="Peki...\nsenin çayına biraz\nsüt koyabilir miyim?",
         bas=10.25, bit=12.85, hiz=24, x=IX - 70, y=245),
    dict(kim="turkiye", metin="HAYIR!", bas=13.45, bit=15.35, hiz=0, x=TX + 200, y=352,
         boyut=96, tip="bagir"),
    dict(kim="ingiltere", metin="...Tamam.", bas=15.75, bit=17.25, hiz=10, x=IX - 40, y=330,
         boyut=40),
]

GIRIS_ZIPLAMALARI = [(0.30, 2150, 1860), (0.83, 1860, 1570), (1.36, 1570, IX)]
ZIPLAMA_SURESI = 0.45


# ------------------------------------------------------------ zaman yardımcıları

def sinir(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ara(t, t0, t1):
    if t1 <= t0:
        return 1.0 if t >= t1 else 0.0
    return sinir((t - t0) / (t1 - t0))


def yumusak(k):
    return k * k * (3 - 2 * k)


def geri(k, s=1.9):
    """Hedefi biraz aşıp geri oturan geçiş (easeOutBack)."""
    k -= 1
    return k * k * ((s + 1) * k + s) + 1


def kirpma(t, anlar, sure=0.16):
    for a in anlar:
        if a <= t <= a + sure:
            return abs(1 - 2 * (t - a) / sure)
    return 1.0


def ziplama(t, bas, sure, yukseklik):
    """(yükseklik, ezilme): kalkıştan önce basılma, havada uzama, inişte
    sönümlü basılma — klasik squash & stretch."""
    if t < bas - 0.08 or t > bas + sure + 0.3:
        return 0.0, 0.0
    if t < bas:
        return 0.0, 0.12 * math.sin(math.pi / 2 * (t - bas + 0.08) / 0.08)
    if t <= bas + sure:
        k = (t - bas) / sure
        return yukseklik * 4 * k * (1 - k), -0.10 * math.sin(math.pi * k)
    k = (t - bas - sure) / 0.3
    return 0.0, 0.17 * math.exp(-5 * k) * math.cos(2.5 * math.pi * k)


def konusma(t, kim):
    """Konuşurken hafif hece zıplaması."""
    for b in BALONLAR:
        if b["kim"] != kim or not b["hiz"]:
            continue
        bas = b["bas"] + 0.1
        bit = bas + len(b["metin"].replace("\n", "")) / b["hiz"]
        if bas <= t <= bit:
            return 0.035 * abs(math.sin(2 * math.pi * 4.5 * (t - bas)))
    return 0.0


# ---------------------------------------------------------------- karakterler

def turkiye_durumu(t):
    d = dict(x=TX, yukseklik=0.0, ezilme=0.012 * math.sin(2 * math.pi * t / 1.7),
             egim=0.0, yon=1.0, goz="normal",
             acik=kirpma(t, [1.3, 4.0, 6.9, 10.9, 16.3]))
    if 3.6 <= t < 5.25:
        d["goz"] = "kuskulu"
    h, e = ziplama(t, 8.22, 0.34, 70)
    d["yukseklik"] += h
    d["ezilme"] += e
    if 8.2 <= t < 9.6:
        d["goz"] = "mutlu"
    elif 9.6 <= t < 10.25:
        d["goz"] = "gururlu"
    elif 12.85 <= t < 13.45:
        d["goz"] = "sasirmis"
        d["x"] += 3 * math.sin(2 * math.pi * 28 * t)
    elif 13.45 <= t < 15.6:
        d["goz"] = "kizgin"
        ileri = yumusak(ara(t, 13.45, 13.6)) * (1 - yumusak(ara(t, 15.2, 15.6)))
        d["x"] += 70 * ileri
        d["egim"] = 0.13 * ileri
        d["ezilme"] += 0.04 * math.sin(2 * math.pi * 9 * t) * ileri
    elif 15.6 <= t < 17.4:
        d["goz"] = "gururlu"
    d["ezilme"] += konusma(t, "turkiye")
    return d


def ingiltere_durumu(t):
    x = GIRIS_ZIPLAMALARI[0][1]
    d = dict(yukseklik=0.0, ezilme=0.012 * math.sin(2 * math.pi * t / 1.9 + 1),
             egim=0.0, yon=-1.0, goz="normal",
             acik=kirpma(t, [2.0, 5.6, 7.4, 11.8, 17.0]))
    for bas, x0, x1 in GIRIS_ZIPLAMALARI:
        if t >= bas:
            x = x0 + (x1 - x0) * ara(t, bas, bas + ZIPLAMA_SURESI)
        h, e = ziplama(t, bas, ZIPLAMA_SURESI, 110)
        d["yukseklik"] += h
        d["ezilme"] += e
    if 2.15 <= t < 5.0:
        d["goz"] = "gururlu"
    elif 8.2 <= t < 9.6:
        d["goz"] = "sasirmis"
        x += 25 * yumusak(ara(t, 8.2, 8.35))
    elif 9.6 <= t < 12.85:
        d["goz"] = "endiseli"
        x += 25 * (1 - yumusak(ara(t, 9.6, 10.0)))
    elif 12.85 <= t < 13.45:
        d["goz"] = "normal"
    elif 13.45 <= t < 13.9:
        d["goz"] = "sasirmis"
    elif 13.9 <= t < 17.4:
        d["goz"] = "uzgun"
    geri_kacis = yumusak(ara(t, 13.45, 13.65)) * (1 - yumusak(ara(t, 15.3, 15.8)))
    x += 45 * geri_kacis
    d["egim"] = 0.12 * geri_kacis
    d["ezilme"] += 0.06 * geri_kacis + konusma(t, "ingiltere")
    d["x"] = x
    return d


# --------------------------------------------------------------------- kamera

def kamera(t):
    k1 = geri(ara(t, 8.2, 8.45)) * (1 - yumusak(ara(t, 9.45, 9.95)))
    z_ = 1 + 0.12 * k1
    mx = 960 + (700 - 960) * k1
    my = 540 + (600 - 540) * k1
    k2 = yumusak(ara(t, 13.38, 13.5)) * (1 - yumusak(ara(t, 15.35, 15.95)))
    z_ = z_ + (1.32 - z_) * k2
    mx = mx + (720 - mx) * k2
    my = my + (575 - my) * k2
    sar = 16 * math.exp(-(t - 13.45) * 2.5) if 13.45 <= t < 15.2 else 0.0
    return z_, mx, my, sar * math.sin(t * 97), sar * math.cos(t * 83), k2


# ---------------------------------------------------------------- kare çizimi

class Sahne:
    def __init__(self):
        self.arka = z.ArkaPlan(W, H)

    def ciz(self, c, t):
        zoom, mx, my, sx, sy, kizgin = kamera(t)
        c.save()
        c.translate(W / 2 + sx, H / 2 + sy)
        c.scale(zoom, zoom)
        c.translate(-mx, -my)
        m = c.get_matrix()
        self.arka.ciz(c, t)
        tr, ing = turkiye_durumu(t), ingiltere_durumu(t)
        kal = 0.045 * R

        # Bardak Türkiye'yle birlikte hareket eder; "HAYIR!" anında kendine çeker.
        bardak_x = tr["x"] + 1.3 * R - 0.15 * R * yumusak(ara(t, 13.45, 13.6)) * (
            1 - yumusak(ara(t, 15.6, 16.2)))
        bardak_y = ZEMIN - 0.30 * R + 5 * math.sin(t * 2.1) - 34 * (
            geri(ara(t, 8.2, 8.45)) * (1 - yumusak(ara(t, 9.4, 9.8))))
        fincan_x = ing["x"] - 1.3 * R
        fincan_y = ZEMIN - 0.30 * R + 5 * math.sin(t * 2.1 + 1.3)
        if t > 0.3:
            fincan_y -= ing["yukseklik"]

        for kim, d in ((z.TURKIYE, tr), (z.INGILTERE, ing)):
            z.top_ciz(c, kim, d["x"], ZEMIN, R, yukseklik=d["yukseklik"],
                      ezilme=d["ezilme"], egim=d["egim"], yon=d["yon"],
                      goz=d["goz"], acik=d["acik"], matris=m, kal=kal)

        z.cay_bardagi(c, bardak_x, bardak_y, 1.05, t, matris=m)
        z.fincan(c, fincan_x, fincan_y, 0.9, matris=m, kulp=-1)

        if 8.25 <= t < 9.6:
            for i, (dx, dy, faz) in enumerate(((-55, -150, 0), (50, -110, 0.35), (-10, -205, 0.7))):
                k = ((t - 8.25) * 1.6 + faz) % 1.0
                z.yildiz_parilti(c, bardak_x + dx, bardak_y + dy, 26 * math.sin(math.pi * k),
                                 t * 2 + i, alfa=0.95)

        self._sut(c, t, ing, bardak_x, bardak_y, m)
        self._ter(c, t, ing, m)
        if 12.85 <= t < 13.5:
            k = max(0.01, geri(ara(t, 12.85, 13.0)))
            z.unlem(c, tr["x"] + 0.15 * R, ZEMIN - 2 * R - 40, 150 * k, matris=m)

        for b in BALONLAR:
            self._balon(c, t, b, tr if b["kim"] == "turkiye" else ing, m)
        c.restore()

        if kizgin > 0:
            g = cairo.RadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.0)
            g.add_color_stop_rgba(0, 1, 0, 0, 0)
            g.add_color_stop_rgba(1, 0.85, 0, 0, 0.5 * kizgin * (0.8 + 0.2 * math.sin(t * 12)))
            c.set_source(g)
            c.paint()
        self._kapanis(c, t)
        perde = max(1 - ara(t, 0, 0.5), ara(t, SURE - 0.6, SURE))
        if perde > 0:
            c.set_source_rgba(0, 0, 0, perde)
            c.paint()

    def _sut(self, c, t, ing, bardak_x, bardak_y, m):
        if not 11.3 <= t < 16.5:
            return
        s = 0.8 * geri(ara(t, 11.3, 11.55)) * (1 - yumusak(ara(t, 15.95, 16.4)))
        if s <= 0.01:
            return
        bx, by = ing["x"] - 1.25 * R, ZEMIN - 1.45 * R + 6 * math.sin(t * 2.4)
        yaklas = yumusak(ara(t, 12.1, 12.85)) * (1 - yumusak(ara(t, 13.45, 13.6)))
        hx, hy = bardak_x + 95, bardak_y - 150
        bx += (hx - bx) * yaklas
        by += (hy - by) * yaklas
        c.save()
        c.translate(bx, by)
        c.rotate(-0.9 * yaklas)
        z.sut_sisesi(c, 0, 75, s, matris=m)
        c.restore()

    def _ter(self, c, t, ing, m):
        for bas, bit in ((9.6, 12.85), (13.9, 17.4)):
            if bas <= t < bit:
                k = yumusak(ara(t, bas, bas + 1.0))
                olcek = 1.15 * geri(ara(t, bas, bas + 0.2))
                if olcek > 0.01:
                    z.ter_damlasi(c, ing["x"] + 0.62 * R, ZEMIN - 1.75 * R + 0.35 * R * k
                                  - ing["yukseklik"], olcek, matris=m)

    def _balon(self, c, t, b, d, m):
        if not b["bas"] <= t < b["bit"]:
            return
        olcek = geri(ara(t, b["bas"], b["bas"] + 0.22)) * (1 - yumusak(ara(t, b["bit"] - 0.15, b["bit"])))
        gorunen = None
        if b["hiz"]:
            gorunen = max(0, (t - b["bas"] - 0.1) * b["hiz"])
        tepe = ZEMIN - d["yukseklik"] - 2 * R - (110 if b["kim"] == "ingiltere" else 18)
        kuyruk = (d["x"] + 0.25 * R * d["yon"], tepe)
        z.balon(c, b["metin"], b["x"], b["y"], kuyruk, boyut=b.get("boyut", 46),
                gorunen=gorunen, olcek=olcek, tip=b.get("tip", "normal"), matris=m)

    def _kapanis(self, c, t):
        if t < 17.4:
            return
        a = yumusak(ara(t, 17.4, 17.8))
        c.set_source_rgba(0.08, 0.13, 0.24, 0.975 * a)
        c.paint()
        k = geri(ara(t, 17.55, 17.85))
        if k <= 0.01:
            return
        m = c.get_matrix()
        c.save()
        c.translate(W / 2, 300)
        c.scale(k, k)
        z.yazi_ayarla(c, 128, 800)
        baslik = "ÇAY DİPLOMASİSİ"
        uz = c.text_extents(baslik)
        c.move_to(-uz.x_advance / 2, 40)
        c.text_path(baslik)
        yol = c.copy_path()
        z.boya(c, cizgi=z.SIYAH, kalinlik=18, matris=c.get_matrix())
        c.append_path(yol)
        z.boya(c, dolgu=z.BEYAZ)
        c.restore()
        b = yumusak(ara(t, 17.8, 18.2))
        satirlar = [("Kişi başı çay tüketiminde dünya birincisi: Türkiye.", 50, 700, 470),
                    ("2016 verisi — Türkiye 3,16 kg · İngiltere 1,94 kg (kişi başı, yıllık) · Kaynak: Statista",
                     28, 500, 535)]
        for metin, boyut, agirlik, y in satirlar:
            z.yazi_ayarla(c, boyut, agirlik)
            uz = c.text_extents(metin)
            c.move_to(W / 2 - uz.x_advance / 2, y)
            c.set_source_rgba(1, 1, 1, b * (0.95 if boyut > 30 else 0.75))
            c.show_text(metin)
        s = geri(ara(t, 18.0, 18.3))
        if s > 0.01:
            c.save()
            c.translate(W / 2, 960)
            c.scale(s, s)
            c.translate(-W / 2, -960)
            z.top_ciz(c, z.TURKIYE, W / 2 - 230, 960, 105, yon=1, goz="mutlu", matris=m)
            z.top_ciz(c, z.INGILTERE, W / 2 + 230, 960, 105, yon=-1, goz="mutlu", matris=m)
            z.cay_bardagi(c, W / 2 + 85, 960 - 30, 0.75, t, matris=m)
            c.restore()


# ----------------------------------------------------------------------- ses

def ses_uret(klasor):
    n = int(SURE * SR)
    muz = np.zeros((n, 2))
    efe = np.zeros((n, 2))
    parca = ses.muzik(SURE)
    t = np.arange(n) / SR
    # Müzik plak cızırtısıyla (12.82 sn) kesilir, kapanış kartında geri gelir.
    kazanc = np.clip((12.86 - t) / 0.04, 0, 1)
    kazanc = np.where(t >= 17.45, np.clip((t - 17.45) / 0.4, 0, 1), kazanc)
    kazanc *= np.clip((SURE - t) / 0.7, 0, 1)
    muz += parca[:n] * kazanc[:, None] * 0.85

    def e(ad, zaman, pan=0.0, kat=1.0):
        ses.ekle(efe, zaman, ses.EFEKTLER[ad]() * kat, pan)

    for bas, x0, x1 in GIRIS_ZIPLAMALARI:
        pan = sinir((x0 - 960) / 960, -1, 1) * 0.8
        e("boing", bas - 0.05, pan, 0.8)
        e("tok", bas + ZIPLAMA_SURESI, sinir((x1 - 960) / 960, -1, 1) * 0.8, 0.8)
    rnd = np.random.default_rng(7)
    for b in BALONLAR:
        pan = -0.35 if b["kim"] == "turkiye" else 0.35
        e("pop", b["bas"], pan)
        e("kapanis_pop", b["bit"] - 0.12, pan, 0.8)
        if b["hiz"]:
            temel = 400 if b["kim"] == "turkiye" else 560
            harfler = len(b["metin"].replace("\n", ""))
            for i in range(0, harfler, 2):
                if b["metin"].replace("\n", "")[i] in " .,!?":
                    continue
                ses.ekle(efe, b["bas"] + 0.1 + i / b["hiz"],
                         ses.blip(temel * rnd.uniform(0.85, 1.18)), pan)
    e("tada", 8.2, -0.3)
    e("zil", 8.32, -0.3, 0.8)
    ses.ekle(efe, 8.6, ses.zil(2093) * 0.6, -0.3)
    e("boing", 8.17, -0.3, 0.5)
    e("yutkunma", 9.62, 0.35)
    e("pop", 11.3, 0.25)
    e("cizik", 12.80, 0.0, 1.0)
    e("dram", 12.91, 0.0, 1.0)
    e("huu", 13.25, -0.2, 0.9)
    e("uzgun_tuba", 15.9, 0.35)
    e("kapanis_pop", 16.15, 0.3)
    e("zil", 17.5, 0.0, 0.7)
    ses.ekle(efe, 17.62, ses.zil(1318.5) * 0.5, 0.0)
    ses.wav_yaz(klasor / "muzik.wav", muz)
    ses.wav_yaz(klasor / "efektler.wav", efe)
    karisim = muz + efe
    ses.wav_yaz(klasor / "karisim.wav", karisim, tepe=0.89)
    return ses_normallestir(klasor / "karisim.wav", klasor / "karisim_-14LUFS.wav")


def ses_normallestir(giris, cikis, hedef=-14.0, tepe=-1.5):
    """İki geçişli EBU R128 loudnorm. YouTube oynatırken yüksek sesi kısar
    ama sessizi yükseltmez; bu yüzden karışım -14 LUFS'a çekilir."""
    import json
    filtre = f"loudnorm=I={hedef}:TP={tepe}:LRA=11"
    olcum = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(giris), "-af",
                            filtre + ":print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True, check=True).stderr
    o = json.loads(olcum[olcum.rindex("{"):olcum.rindex("}") + 1])
    filtre += (f":measured_I={o['input_i']}:measured_TP={o['input_tp']}"
               f":measured_LRA={o['input_lra']}:measured_thresh={o['input_thresh']}"
               f":offset={o['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(giris), "-af", filtre,
                    "-ar", str(SR), str(cikis)], check=True)
    return cikis



# --------------------------------------------------------------------- video

def video_uret(cikti, ses_yolu, olcek=1.0):
    w, h = int(W * olcek), int(H * olcek)
    yuzey = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h)
    c = cairo.Context(yuzey)
    sahne = Sahne()
    komut = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgra",
             "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-", "-i", str(ses_yolu),
             "-c:v", "libx264", "-preset", "slow" if olcek == 1 else "veryfast",
             "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
             "-movflags", "+faststart", "-shortest", str(cikti)]
    surec = subprocess.Popen(komut, stdin=subprocess.PIPE)
    kare_sayisi = int(SURE * FPS)
    for i in range(kare_sayisi):
        c.save()
        c.scale(olcek, olcek)
        sahne.ciz(c, i / FPS)
        c.restore()
        yuzey.flush()
        surec.stdin.write(bytes(yuzey.get_data()))
        if i % 60 == 0:
            print(f"  kare {i}/{kare_sayisi}", file=sys.stderr)
    surec.stdin.close()
    if surec.wait() != 0:
        raise SystemExit("ffmpeg başarısız")


def kare_png(t, yol):
    yuzey = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    Sahne().ciz(cairo.Context(yuzey), t)
    yuzey.write_to_png(str(yol))


# ----------------------------------------------------------------------- kit

IFADELER = ["normal", "kapali", "mutlu", "sasirmis", "kizgin", "gururlu",
            "kuskulu", "uzgun", "endiseli"]
YONLER = {"saga": 1.0, "on": 0.0, "sola": -1.0}


def _kaydet(boyut, ciz, png_yolu, svg_yolu=None):
    w, h = boyut
    yuzey = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h)
    ciz(cairo.Context(yuzey))
    yuzey.write_to_png(str(png_yolu))
    if svg_yolu:
        svg = cairo.SVGSurface(str(svg_yolu), w, h)
        ciz(cairo.Context(svg))
        svg.finish()


def kit_uret(klasor):
    kar = klasor / "karakterler"
    nes = klasor / "nesneler"
    ses_k = klasor / "ses"
    for k in (kar, nes, ses_k):
        k.mkdir(parents=True, exist_ok=True)
    for kim in (z.TURKIYE, z.INGILTERE):
        for ifade in IFADELER:
            for yon_ad, yon in YONLER.items():
                def ciz(c, kim=kim, ifade=ifade, yon=yon):
                    goz = "normal" if ifade == "kapali" else ifade
                    z.top_ciz(c, kim, 512, 900, 280, yon=yon, goz=goz,
                              acik=0.0 if ifade == "kapali" else 1.0, golge_ciz=False)
                ad = f"{kim['ad']}_{ifade}_{yon_ad}"
                _kaydet((1024, 1024), ciz, kar / f"{ad}.png", kar / f"{ad}.svg")
    nesneler = {
        "cay_bardagi": lambda c: z.cay_bardagi(c, 256, 440, 2.6, buhar=False),
        "fincan_kulp_solda": lambda c: z.fincan(c, 256, 420, 2.6, kulp=-1),
        "fincan_kulp_sagda": lambda c: z.fincan(c, 256, 420, 2.6, kulp=1),
        "sut_sisesi": lambda c: z.sut_sisesi(c, 256, 470, 2.6),
        "ter_damlasi": lambda c: z.ter_damlasi(c, 256, 256, 6),
        "unlem": lambda c: z.unlem(c, 256, 470, 420),
        "parilti": lambda c: z.yildiz_parilti(c, 256, 256, 220),
        "golge": lambda c: z.golge(c, 256, 256, 250, 0),
    }
    for ad, ciz in nesneler.items():
        _kaydet((512, 512), ciz, nes / f"{ad}.png", nes / f"{ad}.svg")
    arka = z.ArkaPlan(W, H)
    _kaydet((W, H), lambda c: arka.ciz(c, 0), klasor / "arka_plan.png")
    P = arka.PAY
    _kaydet((W, H), lambda c: (c.set_source_surface(arka.gok, -P, -P), c.paint()),
            klasor / "arka_plan_1_gok.png")
    _kaydet((W, H), lambda c: (c.set_source_surface(arka.on, -P, -P), c.paint()),
            klasor / "arka_plan_3_on.png")
    _kaydet((W, H), lambda c: [arka._bulut(c, x, y, s, tohum)
                               for x, y, s, _, tohum in arka.bulutlar],
            klasor / "arka_plan_2_bulutlar.png")
    for ad, uret in ses.EFEKTLER.items():
        ses.wav_yaz(ses_k / f"{ad}.wav", uret(), tepe=0.89)
    dongu = ses.muzik(4 * 4 * 60 / 104)
    ses.wav_yaz(ses_k / "muzik_dongu_104bpm.wav", dongu, tepe=0.7)
    ses.wav_yaz(ses_k / "konusma_blip_turkiye.wav", ses.blip(400), tepe=0.89)
    ses.wav_yaz(ses_k / "konusma_blip_ingiltere.wav", ses.blip(560), tepe=0.89)


# ---------------------------------------------------------------------- giriş

def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--cikti", default=str(Path(__file__).parent / "cikti"))
    p.add_argument("--hizli", action="store_true", help="yarım çözünürlük önizleme")
    p.add_argument("--sadece", choices=["video", "kit"])
    p.add_argument("--kare", type=float, help="tek kare PNG üret (saniye)")
    a = p.parse_args()
    cikti = Path(a.cikti)
    cikti.mkdir(parents=True, exist_ok=True)
    if a.kare is not None:
        yol = cikti / f"kare_{a.kare:05.2f}.png"
        kare_png(a.kare, yol)
        print(yol)
        return
    if a.sadece != "kit":
        sesler = cikti / "ses_katmanlari"
        sesler.mkdir(exist_ok=True)
        karisim = ses_uret(sesler)
        ad = "deneme01_cay_diplomasisi" + ("_onizleme" if a.hizli else "") + ".mp4"
        video_uret(cikti / ad, karisim, 0.5 if a.hizli else 1.0)
        print(cikti / ad)
    if a.sadece != "video":
        kit_uret(cikti / "kit")
        print(cikti / "kit")


if __name__ == "__main__":
    main()
