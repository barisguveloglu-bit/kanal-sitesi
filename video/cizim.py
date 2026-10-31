"""Country Balls çizim kütüphanesi (pycairo).

Her şey vektör çiziliyor: aynı fonksiyonlar hem video karesi (PNG) hem
düzenlenebilir kit (SVG) üretir. Ölçüler topun yarıçapı R'ye oranlıdır,
böylece karakter her boyutta aynı görünür.

Stil kuralları (Wikipedia "Rules of Countryballs"): göz bebeği, ağız,
kol/bacak yok; nesneler topun yanında süzülür. İngiltere'nin aksesuarı
silindir şapka ve monokl.
"""
import math
import random

import cairo

SIYAH = (0.07, 0.07, 0.09, 1.0)
BEYAZ = (1.0, 1.0, 1.0, 1.0)
YAZI_TIPI = "Baloo 2"


def hex_renk(kod, alfa=1.0):
    kod = kod.lstrip("#")
    return (int(kod[0:2], 16) / 255, int(kod[2:4], 16) / 255,
            int(kod[4:6], 16) / 255, alfa)


def karistir(a, b, k):
    return a + (b - a) * k


# ------------------------------------------------------------ yardımcılar

def boya(c, dolgu=None, cizgi=None, kalinlik=0.0, matris=None):
    """Hazır yolu doldurur ve/veya çizer, sonra yolu temizler.

    Çizgi kalınlığı 'matris' (dünya) uzayında ölçülür; böylece top basılıp
    uzadığında dış çizgi incelip kalınlaşmaz."""
    if dolgu is not None:
        c.set_source_rgba(*dolgu)
        c.fill_preserve()
    if cizgi is not None and kalinlik > 0:
        c.save()
        if matris is not None:
            c.set_matrix(matris)
        c.set_line_width(kalinlik)
        c.set_line_join(cairo.LINE_JOIN_ROUND)
        c.set_line_cap(cairo.LINE_CAP_ROUND)
        c.set_source_rgba(*cizgi)
        c.stroke_preserve()
        c.restore()
    c.new_path()


def yazi_ayarla(c, boyut, agirlik=700):
    c.select_font_face(YAZI_TIPI, cairo.FONT_SLANT_NORMAL,
                       cairo.FONT_WEIGHT_NORMAL)
    secenek = cairo.FontOptions()
    secenek.set_variations(f"wght={agirlik}")
    secenek.set_antialias(cairo.ANTIALIAS_GRAY)
    c.set_font_options(secenek)
    c.set_font_size(boyut)


def catmull(noktalar, adim=12):
    """(x, y) kontrol noktalarından yumuşak eğri örnekleri üretir."""
    p = [noktalar[0]] + list(noktalar) + [noktalar[-1]]
    cikti = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for j in range(adim):
            t = j / adim
            t2, t3 = t * t, t * t * t
            cikti.append(tuple(
                0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t
                       + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
                for k in range(2)))
    cikti.append(noktalar[-1])
    return cikti


def elle_daire(c, R, tohum=0, genlik=0.010, adim=180):
    """Hafif yamuk daire. Polandball geleneği daire aracını kullanmaz;
    bu küçük düzensizlik elle çizilmiş hissini verir."""
    rnd = random.Random(tohum)
    dalgalar = [(k, rnd.uniform(0, 2 * math.pi), genlik / (0.6 * k))
                for k in (2, 3, 5)]
    for i in range(adim):
        a = 2 * math.pi * i / adim
        r = R * (1 + sum(g * math.sin(k * a + f) for k, f, g in dalgalar))
        x, y = r * math.cos(a), r * math.sin(a)
        if i == 0:
            c.move_to(x, y)
        else:
            c.line_to(x, y)
    c.close_path()


# ---------------------------------------------------------------- bayraklar

def bayrak_turkiye(c, R, olcek=0.86, ay_x=-0.47, ay_y=0.25):
    """Kırmızı zemin + resmi oranlı ay-yıldız.

    G = bayrak yüksekliği. Oranlar Türk Bayrağı Kanunu'ndaki ölçüler:
    dış daire çapı G/2, iç daire çapı 2G/5, merkezler arası G/16,
    yıldız dairesi çapı G/4; yıldızın bir ucu hilale bakar. Zemin düz
    kırmızı olduğu için amblem top üzerinde serbestçe konumlanabilir."""
    c.set_source_rgba(*hex_renk("#E30A17"))
    c.paint()
    G = olcek * 2 * R
    ox, oy = ay_x * R, ay_y * R
    r1, r2, d = G / 4, G / 5, G / 16
    xk = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    yk = math.sqrt(r1 * r1 - xk * xk)
    a1 = math.atan2(yk, xk)
    c.new_path()
    c.arc(ox, oy, r1, a1, 2 * math.pi - a1)
    a2 = math.atan2(-yk, xk - d)
    c.arc_negative(ox + d, oy, r2, a2, -a2)
    c.close_path()
    # Yıldız: merkez, dış daire merkezinden 0.32083·G sağda (resmi SVG).
    sx, sy, rs = ox + 0.320833 * G, oy, G / 8
    ic = rs * math.sin(math.radians(18)) / math.sin(math.radians(54))
    for i in range(10):
        a = math.pi + i * math.pi / 5
        r = rs if i % 2 == 0 else ic
        c.line_to(sx + r * math.cos(a), sy + r * math.sin(a))
    c.close_path()
    c.set_source_rgba(*BEYAZ)
    c.fill()


def bayrak_ingiltere(c, R, olcek=1.06):
    """Union Jack; kare pencereye yerleştirilmiş, şerit genişlikleri resmi
    oranda (yükseklik 30 birim: beyaz çapraz 6, kırmızı çapraz 2 kaydırmalı,
    beyaz haç 10, kırmızı haç 6)."""
    H = olcek * 2 * R
    W = H
    u = H / 30
    c.save()
    c.translate(-W / 2, -H / 2)
    c.rectangle(0, 0, W, H)
    c.set_source_rgba(*hex_renk("#012169"))
    c.fill()
    capraz = [((0, 0), (W, H)), ((W, 0), (0, H))]
    c.set_line_cap(cairo.LINE_CAP_BUTT)
    c.set_source_rgba(*BEYAZ)
    c.set_line_width(6 * u)
    for (a, b) in capraz:
        c.move_to(*a)
        c.line_to(*b)
    c.stroke()
    # Kırmızı çapraz kaydırmalı: dört üçgenle kırpılır (resmi SVG yöntemi).
    mx, my = W / 2, H / 2
    c.save()
    for ucgen in (((mx, my), (W, my), (W, H)), ((mx, my), (mx, H), (0, H)),
                  ((mx, my), (0, my), (0, 0)), ((mx, my), (mx, 0), (W, 0))):
        c.move_to(*ucgen[0])
        c.line_to(*ucgen[1])
        c.line_to(*ucgen[2])
        c.close_path()
    c.clip()
    c.set_source_rgba(*hex_renk("#C8102E"))
    c.set_line_width(4 * u)
    for (a, b) in capraz:
        c.move_to(*a)
        c.line_to(*b)
    c.stroke()
    c.restore()
    for renk, gen in ((BEYAZ, 10 * u), (hex_renk("#C8102E"), 6 * u)):
        c.set_source_rgba(*renk)
        c.set_line_width(gen)
        c.move_to(mx, 0)
        c.line_to(mx, H)
        c.move_to(0, my)
        c.line_to(W, my)
        c.stroke()
    c.restore()


# -------------------------------------------------------------------- gözler

def _goz_yolu(c, ex, ey, rx, ry):
    c.save()
    c.translate(ex, ey)
    c.scale(rx, ry)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()


def tek_goz(c, ex, ey, rx, ry, durum, ic_yon, acik, matris, kal):
    """Tek göz. ic_yon: öbür göze doğru yön (+1 sağ, -1 sol)."""
    if durum == "mutlu":
        c.save()
        c.translate(ex, ey + ry * 0.25)
        c.scale(rx, ry * 0.8)
        c.arc(0, 0, 1, math.pi * 1.08, math.pi * 1.92)
        c.restore()
        boya(c, cizgi=SIYAH, kalinlik=kal * 1.5, matris=matris)
        return
    ry = ry * acik
    if acik < 0.18:
        c.move_to(ex - rx, ey)
        c.line_to(ex + rx, ey)
        boya(c, cizgi=SIYAH, kalinlik=kal * 1.2, matris=matris)
        return
    kapak = None
    if durum == "gururlu":
        kapak = ((ex - rx * 1.4, ey - ry * 0.12), (ex + rx * 1.4, ey - ry * 0.12))
    elif durum == "kizgin":
        dis, ic = ex - ic_yon * rx * 1.4, ex + ic_yon * rx * 1.4
        kapak = ((dis, ey - ry * 0.85), (ic, ey - ry * 0.05))
    elif durum in ("uzgun", "endiseli"):
        derin = 0.75 if durum == "uzgun" else 0.55
        dis, ic = ex - ic_yon * rx * 1.4, ex + ic_yon * rx * 1.4
        kapak = ((dis, ey - ry * (1 - derin)), (ic, ey - ry * 1.05))
    if kapak is None:
        _goz_yolu(c, ex, ey, rx, ry)
        boya(c, dolgu=BEYAZ, cizgi=SIYAH, kalinlik=kal, matris=matris)
        return
    (x1, y1), (x2, y2) = sorted(kapak)
    c.save()
    c.move_to(x1, y1)
    c.line_to(x2, y2)
    c.line_to(x2, y2 + ry * 4)
    c.line_to(x1, y1 + ry * 4)
    c.close_path()
    c.clip()
    _goz_yolu(c, ex, ey, rx, ry)
    boya(c, dolgu=BEYAZ, cizgi=SIYAH, kalinlik=kal, matris=matris)
    c.restore()
    c.save()
    _goz_yolu(c, ex, ey, rx * 1.12, ry * 1.12)
    c.clip()
    c.move_to(x1, y1)
    c.line_to(x2, y2)
    boya(c, cizgi=SIYAH, kalinlik=kal * 1.1, matris=matris)
    c.restore()


def goz_konumlari(R, yon):
    """yon: +1 sağa bakıyor, -1 sola, 0 kameraya. Bebek yok; bakış yönü
    gözlerin top üzerindeki yeriyle anlatılır."""
    m = 0.41 * R * yon
    s = R * (0.42 + 0.18 * (1 - abs(yon)))
    rx, ry = 0.17 * R, 0.22 * R
    rx_a = rx * (1 - 0.15 * max(0.0, -yon))
    rx_b = rx * (1 - 0.15 * max(0.0, yon))
    y = -0.21 * R
    return (m - s / 2, y, rx_a, ry), (m + s / 2, y, rx_b, ry)


def gozler(c, R, yon, durum, acik, matris, kal):
    a, b = goz_konumlari(R, yon)
    olcek = 1.0
    if durum == "sasirmis":
        olcek = 1.3
    durum_a = durum_b = durum
    if durum == "kuskulu":
        durum_a, durum_b = ("normal", "gururlu") if yon >= 0 else ("gururlu", "normal")
    for (ex, ey, rx, ry), d, ic in ((a, durum_a, 1), (b, durum_b, -1)):
        if durum == "sasirmis":
            ex += -ic * rx * 0.12
        tek_goz(c, ex, ey, rx * olcek, ry * olcek,
                "normal" if d == "sasirmis" else d, ic, acik, matris, kal)
    return a, b


# --------------------------------------------------------------- aksesuarlar

def silindir_sapka(c, R, yon, matris, kal):
    c.save()
    c.translate(0.08 * R * yon, -0.86 * R)
    c.rotate(-0.10 * yon)
    gen, yuk = 0.74 * R, 0.80 * R
    c.move_to(-gen / 2, 0)
    c.line_to(-gen / 2 * 0.94, -yuk)
    c.line_to(gen / 2 * 0.94, -yuk)
    c.line_to(gen / 2, 0)
    c.close_path()
    boya(c, dolgu=hex_renk("#1d1d24"), cizgi=SIYAH, kalinlik=kal, matris=matris)
    c.rectangle(-gen / 2 * 0.985, -0.20 * R, gen * 0.985, 0.13 * R)
    boya(c, dolgu=hex_renk("#6b1424"), cizgi=SIYAH, kalinlik=kal * 0.6, matris=matris)
    c.move_to(-gen * 0.30, -yuk * 0.92)
    c.line_to(-gen * 0.32, -yuk * 0.32)
    boya(c, cizgi=(1, 1, 1, 0.18), kalinlik=kal * 1.4, matris=matris)
    c.save()
    c.scale(0.64 * R, 0.11 * R)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, dolgu=hex_renk("#1d1d24"), cizgi=SIYAH, kalinlik=kal, matris=matris)
    c.restore()


def monokl(c, R, goz, matris, kal):
    ex, ey, rx, ry = goz
    r = max(rx, ry) * 1.18
    c.arc(ex, ey, r, 0, 2 * math.pi)
    boya(c, cizgi=SIYAH, kalinlik=kal * 1.9, matris=matris)
    c.arc(ex, ey, r, 0, 2 * math.pi)
    boya(c, cizgi=hex_renk("#e0b12a"), kalinlik=kal * 0.9, matris=matris)
    c.move_to(ex, ey + r)
    c.curve_to(ex + r * 0.2, ey + r * 2.2, ex - r * 0.9, ey + r * 2.0, ex - r * 0.6, ey + r * 3.0)
    boya(c, cizgi=hex_renk("#e0b12a"), kalinlik=kal * 0.45, matris=matris)


def ingiltere_aksesuar(c, R, yon, gozler_, matris, kal):
    a, b = gozler_
    monokl(c, R, b if yon >= 0 else a, matris, kal)
    silindir_sapka(c, R, yon, matris, kal)


TURKIYE = {"ad": "turkiye", "bayrak": bayrak_turkiye, "tohum": 7, "aksesuar": None}
INGILTERE = {"ad": "ingiltere", "bayrak": bayrak_ingiltere, "tohum": 3,
             "aksesuar": ingiltere_aksesuar}


# ---------------------------------------------------------------------- top

def golge(c, x, zemin, R, yukseklik):
    k = max(0.35, 1 - yukseklik / (2.6 * R))
    c.save()
    c.translate(x, zemin)
    c.scale(R * 0.95 * k, R * 0.17 * k)
    g = cairo.RadialGradient(0, 0, 0, 0, 0, 1)
    g.add_color_stop_rgba(0, 0, 0, 0, 0.32 * k)
    g.add_color_stop_rgba(1, 0, 0, 0, 0)
    c.set_source(g)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.fill()
    c.restore()


def top_ciz(c, kim, x, zemin, R, *, yukseklik=0.0, ezilme=0.0, egim=0.0,
            yon=1.0, goz="normal", acik=1.0, matris=None, golge_ciz=True,
            kal=None):
    """Bir countryball çizer. (x, zemin) topun yere değdiği nokta.

    ezilme > 0 basılma (yere iniş), < 0 uzama (havada). Basılma alt
    noktaya göre yapılır, top yere gömülmez."""
    if matris is None:
        matris = c.get_matrix()
    if kal is None:
        kal = 0.045 * R
    if golge_ciz:
        golge(c, x, zemin, R, yukseklik)
    sy = 1 - ezilme
    sx = 1 + ezilme * 0.8
    c.save()
    c.translate(x, zemin - yukseklik)
    c.rotate(egim)
    c.scale(sx, sy)
    c.translate(0, -R)
    c.save()
    elle_daire(c, R, kim["tohum"])
    c.clip()
    kim["bayrak"](c, R)
    isik = cairo.RadialGradient(-0.38 * R, -0.48 * R, 0, -0.38 * R, -0.48 * R, 1.2 * R)
    isik.add_color_stop_rgba(0, 1, 1, 1, 0.30)
    isik.add_color_stop_rgba(0.6, 1, 1, 1, 0.0)
    c.set_source(isik)
    c.paint()
    golgelik = cairo.RadialGradient(0, -0.25 * R, 0.75 * R, 0, -0.25 * R, 1.3 * R)
    golgelik.add_color_stop_rgba(0, 0, 0, 0, 0)
    golgelik.add_color_stop_rgba(1, 0, 0, 0, 0.26)
    c.set_source(golgelik)
    c.paint()
    c.restore()
    elle_daire(c, R, kim["tohum"])
    boya(c, cizgi=SIYAH, kalinlik=kal, matris=matris)
    goz_ciftleri = gozler(c, R, yon, goz, acik, matris, kal * 0.8)
    if kim.get("aksesuar"):
        kim["aksesuar"](c, R, yon, goz_ciftleri, matris, kal * 0.8)
    c.restore()


# ------------------------------------------------------------------ nesneler

def cay_bardagi(c, x, y, s, t=0.0, matris=None, buhar=True, doluluk=0.84):
    """İnce belli Türk çay bardağı + tabak. (x, y): tabağın merkezi."""
    if matris is None:
        matris = c.get_matrix()
    kal = 3.6 * s
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    yuk = 120
    profil = catmull([(20, 0), (25, -0.12 * yuk), (26, -0.27 * yuk),
                      (16.5, -0.55 * yuk), (22, -0.80 * yuk), (28, -yuk)])
    alt = -7

    def bardak_yolu():
        c.move_to(-profil[0][0], alt)
        for px, py in profil:
            c.line_to(-px, alt + py)
        for px, py in reversed(profil):
            c.line_to(px, alt + py)
        c.close_path()

    # Tabak
    c.save()
    c.scale(64, 15)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, dolgu=BEYAZ, cizgi=SIYAH, kalinlik=kal, matris=matris)
    c.save()
    c.scale(50, 10.5)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, cizgi=hex_renk("#d32f2f"), kalinlik=kal * 0.9, matris=matris)
    # Cam + çay
    bardak_yolu()
    boya(c, dolgu=(0.86, 0.95, 1.0, 0.45))
    c.save()
    bardak_yolu()
    c.clip()
    seviye = alt - yuk * doluluk
    g = cairo.LinearGradient(0, seviye, 0, alt)
    g.add_color_stop_rgba(0, 0.80, 0.27, 0.10, 0.97)
    g.add_color_stop_rgba(1, 0.50, 0.10, 0.04, 0.97)
    c.set_source(g)
    c.rectangle(-40, seviye, 80, -seviye + 2)
    c.fill()
    c.restore()
    yuzey_r = next(px for px, py in profil if py <= -yuk * doluluk)
    c.save()
    c.translate(0, alt - yuk * doluluk)
    c.scale(yuzey_r, 3.5)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, dolgu=(0.92, 0.45, 0.2, 1.0))
    bardak_yolu()
    boya(c, cizgi=(0.14, 0.14, 0.2, 1), kalinlik=kal, matris=matris)
    c.save()
    c.translate(0, alt - yuk)
    c.scale(28, 4.5)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, dolgu=(0.9, 0.97, 1, 0.5), cizgi=(0.14, 0.14, 0.2, 1),
         kalinlik=kal * 0.8, matris=matris)
    c.move_to(-17, alt - 0.18 * yuk)
    c.curve_to(-21, alt - 0.32 * yuk, -12, alt - 0.5 * yuk, -15, alt - 0.75 * yuk)
    boya(c, cizgi=(1, 1, 1, 0.75), kalinlik=kal * 0.9, matris=matris)
    c.restore()
    if buhar:
        buhar_ciz(c, x, y - (yuk + 14) * s, s, t, matris)


def buhar_ciz(c, x, y, s, t, matris):
    for i, faz in enumerate((0.0, 0.5)):
        k = (t * 0.6 + faz) % 1.0
        alfa = math.sin(math.pi * k) * 0.55
        c.save()
        c.translate(x + (i * 22 - 11) * s, y - k * 30 * s)
        for j in range(16):
            v = j / 15
            px = math.sin(v * 5 + t * 3 + i * 2) * 7 * s
            py = -v * 50 * s
            (c.move_to if j == 0 else c.line_to)(px, py)
        c.restore()
        boya(c, cizgi=(1, 1, 1, alfa), kalinlik=4.5 * s, matris=matris)


def fincan(c, x, y, s, matris=None, kulp=1):
    """İngiliz porselen fincanı (sütlü çay). kulp: +1 sağda, -1 solda."""
    if matris is None:
        matris = c.get_matrix()
    kal = 3.6 * s
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    c.save()
    c.scale(70, 16)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, dolgu=BEYAZ, cizgi=SIYAH, kalinlik=kal, matris=matris)
    c.save()
    c.scale(54, 11)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, cizgi=hex_renk("#2a5db0"), kalinlik=kal * 0.9, matris=matris)
    c.save()
    c.translate(kulp * 46, -44)
    c.scale(16, 18)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, cizgi=SIYAH, kalinlik=kal * 3.2, matris=matris)
    c.save()
    c.translate(kulp * 46, -44)
    c.scale(16, 18)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, cizgi=BEYAZ, kalinlik=kal * 1.6, matris=matris)

    def govde():
        c.move_to(-48, -72)
        c.curve_to(-48, -30, -36, -8, -20, -6)
        c.line_to(20, -6)
        c.curve_to(36, -8, 48, -30, 48, -72)
        c.close_path()

    govde()
    boya(c, dolgu=BEYAZ)
    c.save()
    govde()
    c.clip()
    c.rectangle(-60, -58, 120, 9)
    c.set_source_rgba(*hex_renk("#2a5db0"))
    c.fill()
    c.restore()
    govde()
    boya(c, cizgi=SIYAH, kalinlik=kal, matris=matris)
    c.save()
    c.translate(0, -72)
    c.scale(48, 10)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, dolgu=BEYAZ, cizgi=SIYAH, kalinlik=kal, matris=matris)
    c.save()
    c.translate(0, -71)
    c.scale(41, 7)
    c.arc(0, 0, 1, 0, 2 * math.pi)
    c.restore()
    boya(c, dolgu=hex_renk("#c49a6c"))
    c.restore()


def sut_sisesi(c, x, y, s, matris=None):
    """Cam süt şişesi. (x, y): taban ortası."""
    if matris is None:
        matris = c.get_matrix()
    kal = 3.6 * s
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    profil = catmull([(30, 0), (31, -60), (29, -88), (17, -118), (15, -142), (16, -150)])

    def yol():
        c.move_to(-profil[0][0], 0)
        for px, py in profil:
            c.line_to(-px, py)
        for px, py in reversed(profil):
            c.line_to(px, py)
        c.close_path()

    yol()
    boya(c, dolgu=(0.9, 0.96, 1, 0.5))
    c.save()
    yol()
    c.clip()
    c.rectangle(-40, -128, 80, 130)
    c.set_source_rgba(0.99, 0.99, 0.97, 1)
    c.fill()
    c.restore()
    c.rectangle(-31, -76, 62, 34)
    boya(c, dolgu=hex_renk("#d32f2f"), cizgi=SIYAH, kalinlik=kal * 0.6, matris=matris)
    yazi_ayarla(c, 26, 800)
    uz = c.text_extents("SÜT")
    c.move_to(-uz.width / 2 - uz.x_bearing, -59 - uz.height / 2 - uz.y_bearing)
    c.set_source_rgba(*BEYAZ)
    c.show_text("SÜT")
    yol()
    boya(c, cizgi=SIYAH, kalinlik=kal, matris=matris)
    c.rectangle(-18, -160, 36, 14)
    boya(c, dolgu=hex_renk("#b8c4d6"), cizgi=SIYAH, kalinlik=kal * 0.8, matris=matris)
    c.move_to(-22, -100)
    c.line_to(-24, -20)
    boya(c, cizgi=(1, 1, 1, 0.8), kalinlik=kal, matris=matris)
    c.restore()


def ter_damlasi(c, x, y, s, matris=None):
    if matris is None:
        matris = c.get_matrix()
    c.save()
    c.translate(x, y)
    c.scale(s, s)
    c.move_to(0, -26)
    c.curve_to(6, -10, 16, 2, 16, 10)
    c.curve_to(16, 20, 8, 26, 0, 26)
    c.curve_to(-8, 26, -16, 20, -16, 10)
    c.curve_to(-16, 2, -6, -10, 0, -26)
    c.close_path()
    boya(c, dolgu=hex_renk("#8fd3ff"), cizgi=SIYAH, kalinlik=3.2 * s, matris=matris)
    c.arc(-6, 10, 4, 0, 2 * math.pi)
    boya(c, dolgu=(1, 1, 1, 0.9))
    c.restore()


def yildiz_parilti(c, x, y, boyut, aci=0.0, alfa=1.0):
    """Dört kollu parıltı."""
    c.save()
    c.translate(x, y)
    c.rotate(aci)
    ince = boyut * 0.16
    nokt = []
    for k in range(4):
        a = k * math.pi / 2
        nokt.append((boyut * math.cos(a), boyut * math.sin(a)))
        a2 = a + math.pi / 4
        nokt.append((ince * math.cos(a2), ince * math.sin(a2)))
    c.move_to(*nokt[0])
    for p in nokt[1:]:
        c.line_to(*p)
    c.close_path()
    c.set_source_rgba(1, 0.96, 0.6, alfa)
    c.fill_preserve()
    c.set_source_rgba(1, 1, 1, alfa)
    c.set_line_width(boyut * 0.05)
    c.stroke()
    c.restore()


def unlem(c, x, y, boyut, matris=None):
    if matris is None:
        matris = c.get_matrix()
    yazi_ayarla(c, boyut, 800)
    uz = c.text_extents("!")
    c.move_to(x - uz.width / 2 - uz.x_bearing, y - uz.y_bearing - uz.height)
    c.text_path("!")
    yol = c.copy_path()
    boya(c, cizgi=SIYAH, kalinlik=boyut * 0.12, matris=matris)
    c.append_path(yol)
    boya(c, dolgu=hex_renk("#ff3b30"))


# ------------------------------------------------------------ konuşma balonu

def _yuvarlak_kutu(c, x, y, w, h, r):
    c.new_sub_path()
    c.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    c.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    c.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    c.close_path()


def balon(c, metin, x, y, kuyruk, *, boyut=46, gorunen=None, olcek=1.0,
          tip="normal", matris=None, metin_rengi=SIYAH):
    """Konuşma balonu. (x, y): balon merkezi; kuyruk: konuşanın üstündeki
    uç nokta. gorunen: daktilo efekti için görünen harf sayısı."""
    if olcek <= 0.01:
        return
    if matris is None:
        matris = c.get_matrix()
    satirlar = metin.split("\n")
    agirlik = 800 if tip == "bagir" else 700
    c.save()
    yazi_ayarla(c, boyut, agirlik)
    olcu = c.text_extents("ÇĞİgy")
    satir_h = boyut * 1.12
    genislik = max(c.text_extents(s).x_advance for s in satirlar)
    pad_x, pad_y = boyut * 0.75, boyut * 0.42
    w = genislik + 2 * pad_x
    h = satir_h * len(satirlar) + 2 * pad_y
    kx, ky = kuyruk
    c.translate(kx, ky)
    c.scale(olcek, olcek)
    c.translate(-kx, -ky)
    sol, ust = x - w / 2, y - h / 2
    kal = boyut * 0.13

    def govde():
        if tip == "bagir":
            n = 26
            for i in range(n):
                a = 2 * math.pi * i / n
                r = 1.0 if i % 2 == 0 else 1.22
                px = x + (w / 2 + boyut * 0.5) * r * math.cos(a)
                py = y + (h / 2 + boyut * 0.5) * r * math.sin(a)
                (c.move_to if i == 0 else c.line_to)(px, py)
            c.close_path()
        else:
            _yuvarlak_kutu(c, sol, ust, w, h, min(boyut * 0.9, h / 2))

    def kuyruk_yolu():
        tx = min(max(kx, sol + boyut), sol + w - boyut)
        taban = boyut * 0.42
        alt = ust + h - kal
        c.move_to(tx - taban, alt)
        c.curve_to(tx - taban * 0.4, alt + (ky - alt) * 0.5, kx, ky - 4, kx, ky)
        c.curve_to(kx, ky - 4, tx + taban * 0.2, alt + (ky - alt) * 0.4, tx + taban, alt)
        c.close_path()

    govde()
    kuyruk_yolu()
    boya(c, cizgi=SIYAH, kalinlik=kal * 2, matris=matris)
    govde()
    kuyruk_yolu()
    boya(c, dolgu=BEYAZ)
    toplam = sum(len(s) for s in satirlar)
    kalan = toplam if gorunen is None else int(gorunen)
    taban_y = y - h / 2 + pad_y - olcu.y_bearing * 0.82
    for i, s in enumerate(satirlar):
        parca = s[:max(0, kalan)]
        kalan -= len(s)
        sx = x - c.text_extents(s).x_advance / 2
        c.move_to(sx, taban_y + i * satir_h)
        c.set_source_rgba(*metin_rengi)
        c.show_text(parca)
    c.restore()


# --------------------------------------------------------------- arka plan

class ArkaPlan:
    """Gök + bulut + tepeler + çimen. Durağan katmanlar önbelleğe alınır;
    kenar payı kamera sarsıntısında boşluk görünmesin diye."""

    PAY = 160

    def __init__(self, W, H, ufuk=650):
        self.W, self.H, self.ufuk = W, H, ufuk
        P = self.PAY
        self.gok = cairo.ImageSurface(cairo.FORMAT_ARGB32, W + 2 * P, H + 2 * P)
        self.on = cairo.ImageSurface(cairo.FORMAT_ARGB32, W + 2 * P, H + 2 * P)
        self._gok_ciz(cairo.Context(self.gok))
        self._on_ciz(cairo.Context(self.on))
        rnd = random.Random(11)
        self.bulutlar = [(rnd.uniform(0, W), rnd.uniform(70, 330),
                          rnd.uniform(0.7, 1.25), rnd.uniform(6, 14), rnd.randint(0, 999))
                         for _ in range(5)]

    def _gok_ciz(self, c):
        P = self.PAY
        c.translate(P, P)
        g = cairo.LinearGradient(0, -P, 0, self.ufuk)
        g.add_color_stop_rgb(0, 0.36, 0.71, 0.96)
        g.add_color_stop_rgb(1, 0.82, 0.94, 1.0)
        c.set_source(g)
        c.rectangle(-P, -P, self.W + 2 * P, self.H + 2 * P)
        c.fill()
        gx, gy = self.W - 260, 170
        isik = cairo.RadialGradient(gx, gy, 40, gx, gy, 260)
        isik.add_color_stop_rgba(0, 1, 0.95, 0.6, 0.55)
        isik.add_color_stop_rgba(1, 1, 0.95, 0.6, 0)
        c.set_source(isik)
        c.paint()
        c.arc(gx, gy, 78, 0, 2 * math.pi)
        c.set_source_rgb(1, 0.92, 0.45)
        c.fill()

    def _on_ciz(self, c):
        P = self.PAY
        W, ufuk = self.W, self.ufuk
        c.translate(P, P)

        def tepe(renk, taban, dalgalar, tohum):
            rnd = random.Random(tohum)
            fazlar = [rnd.uniform(0, 6.28) for _ in dalgalar]
            c.move_to(-P, self.H + P)
            for i in range(0, W + 2 * P + 1, 8):
                xx = i - P
                yy = taban + sum(g * math.sin(xx / d + f) for (g, d), f in zip(dalgalar, fazlar))
                c.line_to(xx, yy)
            c.line_to(W + P, self.H + P)
            c.close_path()
            c.set_source_rgba(*renk)
            c.fill()

        tepe(hex_renk("#a9dc8a"), ufuk - 40, [(38, 210), (18, 90)], 1)
        tepe(hex_renk("#86cd62"), ufuk + 10, [(30, 260), (12, 70)], 2)
        g = cairo.LinearGradient(0, ufuk + 60, 0, self.H + P)
        g.add_color_stop_rgb(0, 0.47, 0.78, 0.31)
        g.add_color_stop_rgb(1, 0.33, 0.62, 0.21)
        c.set_source(g)
        c.move_to(-P, ufuk + 70)
        for i in range(0, W + 2 * P + 1, 10):
            c.line_to(i - P, ufuk + 70 + 6 * math.sin(i / 130))
        c.line_to(W + P, self.H + P)
        c.line_to(-P, self.H + P)
        c.close_path()
        c.fill()
        rnd = random.Random(5)
        c.set_line_cap(cairo.LINE_CAP_ROUND)
        for _ in range(240):
            gx = rnd.uniform(-P, W + P)
            gy = rnd.uniform(ufuk + 90, self.H + P)
            boy = rnd.uniform(8, 18) * (0.6 + (gy - ufuk) / 600)
            c.set_source_rgba(0.24, 0.5, 0.16, 0.55)
            c.set_line_width(2.6)
            for d in (-0.35, 0, 0.35):
                c.move_to(gx, gy)
                c.line_to(gx + d * boy, gy - boy)
            c.stroke()

    def _bulut(self, c, x, y, s, tohum):
        rnd = random.Random(tohum)
        daireler = [(0, 0, 46), (-50, 12, 34), (52, 10, 36), (-22, -24, 36), (26, -20, 40)]
        c.save()
        c.translate(x, y)
        c.scale(s, s)
        for dx, dy, r in daireler:
            c.arc(dx, dy + 6, r, 0, 2 * math.pi)
            c.close_path()
        c.set_source_rgba(0.62, 0.78, 0.92, 0.6)
        c.fill()
        for dx, dy, r in daireler:
            c.arc(dx + rnd.uniform(-2, 2), dy, r, 0, 2 * math.pi)
            c.close_path()
        c.set_source_rgba(1, 1, 1, 0.97)
        c.fill()
        c.restore()

    def ciz(self, c, t):
        P = self.PAY
        c.set_source_surface(self.gok, -P, -P)
        c.paint()
        for x, y, s, hiz, tohum in self.bulutlar:
            bx = (x + hiz * t) % (self.W + 400) - 200
            self._bulut(c, bx, y, s, tohum)
        c.set_source_surface(self.on, -P, -P)
        c.paint()
