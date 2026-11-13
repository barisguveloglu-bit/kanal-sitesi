#!/usr/bin/env python3
"""3D Türkiye haritasının veri dosyalarını üretir.

Sitenin çalışmasının parçası DEĞİL: bir kez koşturulur, çıktısı depoya
girer. Sitede derleme adımı yok; bu betik yalnızca veriyi hazırlamak için.

Kullanım:
    python3 uret_harita.py <kaynak_klasörü> <çıktı_klasörü>

Kaynak klasöründe beklenenler (hepsi kamu malı):
    etopo/N45E015.tif, etopo/N45E030.tif
        NOAA ETOPO 2022, 15 açısaniye, yüzey yüksekliği
    ne/ne_10m_admin_1_states_provinces.geojson   81 il sınırı
    ne/ne_10m_land.geojson                       kara/deniz
    ne/ne_10m_lakes.geojson                      göller
    ne/ne_10m_rivers_lake_centerlines.geojson    büyük nehirler
    ne/ne_10m_rivers_europe.geojson              ek nehirler
        Natural Earth 1:10m

Çıktılar:
    renk.jpg         2048x1024 fiziki harita dokusu (gölgeli kabartma)
    harita-veri.js   yükseklik ızgarası, il kimlik haritası, il merkezleri

Gereken paketler: numpy, pillow, scipy.
"""
import base64
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None

KAYNAK, CIKTI = sys.argv[1], sys.argv[2]

# Haritanın kapsadığı alan. Türkiye: boylam 25.66-44.81, enlem 35.82-42.10.
# Güney sınırı 35.72: Kıbrıs dışarıda kalsın, Hatay'ın ucu içeride.
BATI, DOGU, GUNEY, KUZEY = 25.40, 45.00, 35.72, 42.25
ORTA_ENLEM = 39.0
KM_BOYLAM = 111.32 * math.cos(math.radians(ORTA_ENLEM))
KM_ENLEM = 110.95
GENISLIK_KM = (DOGU - BATI) * KM_BOYLAM
YUKSEKLIK_KM = (KUZEY - GUNEY) * KM_ENLEM

DOKU = (2048, 1024)          # renk dokusu (uv uzayı, 2'nin kuvveti)
IL_IZGARA = (1024, 512)      # il kimlik haritası
AG_X = 512                   # yükseklik ızgarası genişliği
AG_Z = round(AG_X * YUKSEKLIK_KM / GENISLIK_KM)
HMAX_M = 5200.0              # kök kodlamanın tavanı (Ağrı 5137 m)


def oku_json(ad):
    with open(f"{KAYNAK}/ne/{ad}.geojson", encoding="utf-8") as f:
        return json.load(f)


def piksel(boylam, enlem, gen, yuk):
    return ((boylam - BATI) / (DOGU - BATI) * gen,
            (KUZEY - enlem) / (KUZEY - GUNEY) * yuk)


def halkalar(geometri):
    """Bir (Multi)Polygon'un [dış, delik, delik...] halka gruplarını verir."""
    if geometri["type"] == "Polygon":
        return [geometri["coordinates"]]
    if geometri["type"] == "MultiPolygon":
        return geometri["coordinates"]
    return []


def cizgiler(geometri):
    if geometri["type"] == "LineString":
        return [geometri["coordinates"]]
    if geometri["type"] == "MultiLineString":
        return geometri["coordinates"]
    return []


def kutuda(halka, pay=1.0):
    return any(BATI - pay <= x <= DOGU + pay and GUNEY - pay <= y <= KUZEY + pay
               for x, y in halka)


def doldur(cizim, gruplar, deger, gen, yuk, delik=0):
    for grup in gruplar:
        if not grup or not kutuda(grup[0], pay=8.0):
            continue
        cizim.polygon([piksel(x, y, gen, yuk) for x, y in grup[0]], fill=deger)
        for ic in grup[1:]:
            cizim.polygon([piksel(x, y, gen, yuk) for x, y in ic], fill=delik)


def maske(ozellikler, gen, yuk, kat=2):
    """Yumuşak kenarlı (0..1) maske: kat kat büyük çiz, kutu filtresiyle küçült."""
    im = Image.new("L", (gen * kat, yuk * kat), 0)
    c = ImageDraw.Draw(im)
    for f in ozellikler:
        if f.get("geometry"):
            doldur(c, halkalar(f["geometry"]), 255, gen * kat, yuk * kat)
    return np.asarray(im.resize((gen, yuk), Image.BOX), np.float32) / 255.0


# ------------------------------------------------------------ yükseklik
def etopo():
    parca = [np.asarray(Image.open(f"{KAYNAK}/etopo/{t}.tif"), np.float32)
             for t in ("N45E015", "N45E030")]
    m = np.concatenate(parca, axis=1)        # boylam 15..45, enlem 45..30
    c0, c1 = round((BATI - 15) * 240), round((DOGU - 15) * 240)
    r0, r1 = round((45 - KUZEY) * 240), round((45 - GUNEY) * 240)
    return m[r0:r1, c0:c1]


def boyutla(dizi, boyut):
    return np.asarray(Image.fromarray(dizi, "F").resize(boyut, Image.BOX), np.float32)


# ------------------------------------------------------------ renk
# Yüksekliğe göre renk (m → RGB). Sitenin karanlık temasına uysun diye
# klasik atlas renklerinin koyulaştırılmış hali.
HIPSO = [
    (0, (58, 92, 60)), (150, (70, 104, 64)), (400, (98, 116, 70)),
    (800, (128, 124, 78)), (1200, (136, 114, 76)), (1700, (122, 94, 66)),
    (2300, (108, 84, 66)), (3000, (128, 118, 110)), (3800, (178, 176, 172)),
    (4600, (226, 228, 232)),
]
DENIZ_SIG = np.array([26, 52, 76], np.float32)
DENIZ_DERIN = np.array([10, 22, 36], np.float32)
GOL = np.array([34, 74, 104], np.float32)
NEHIR = np.array([60, 112, 150], np.float32)


def hipso(e):
    yuks = np.array([h for h, _ in HIPSO], np.float32)
    renk = np.array([c for _, c in HIPSO], np.float32)
    return np.stack([np.interp(e, yuks, renk[:, i]) for i in range(3)], axis=-1)


def golgele(e, abarti=4.0):
    """Kuzeybatıdan 45 derece ışıkla gölgeli kabartma (1 = düz zemin)."""
    dx = GENISLIK_KM * 1000 / e.shape[1]
    dy = YUKSEKLIK_KM * 1000 / e.shape[0]
    gy, gx = np.gradient(e, dy, dx)          # satır güneye doğru artar
    nx, ny, nz = -abarti * gx, abarti * gy, np.ones_like(e)
    boy = np.sqrt(nx * nx + ny * ny + nz * nz)
    az, yuk = math.radians(315), math.radians(45)
    lx, ly, lz = math.cos(yuk) * math.sin(az), math.cos(yuk) * math.cos(az), math.sin(yuk)
    isik = np.clip((nx * lx + ny * ly + nz * lz) / boy, 0, 1)
    return (0.35 + 0.85 * isik) / (0.35 + 0.85 * math.sin(yuk))


def main():
    gen, yuk = DOKU
    ham = etopo()
    print("ETOPO kırpıntısı:", ham.shape)

    iller = [f for f in oku_json("ne_10m_admin_1_states_provinces")["features"]
             if f["properties"].get("adm0_a3") == "TUR"]
    plaka = {f["properties"]["adm1_code"]: int(f["properties"]["iso_3166_2"][3:]) for f in iller}
    assert sorted(plaka.values()) == list(range(1, 82)), "81 il eksiksiz değil"

    kara = maske([f for f in oku_json("ne_10m_land")["features"]], gen, yuk, kat=2)
    turkiye = maske(iller, gen, yuk, kat=2)
    goller = maske(oku_json("ne_10m_lakes")["features"], gen, yuk, kat=2)

    e = boyutla(ham, DOKU)
    kara_e = np.maximum(e, 0)
    renk = hipso(kara_e) * golgele(kara_e)[..., None]

    derinlik = np.clip(-e / 2500.0, 0, 1) ** 0.5
    deniz = DENIZ_SIG * (1 - derinlik[..., None]) + DENIZ_DERIN * derinlik[..., None]

    # Komşu ülkeler: soluk ve koyu, Türkiye öne çıksın.
    parlaklik = (renk * np.array([0.3, 0.59, 0.11], np.float32)).sum(-1, keepdims=True)
    komsu = (renk * 0.25 + parlaklik * 0.75) * 0.5
    kara_renk = komsu * (1 - turkiye[..., None]) + renk * turkiye[..., None]
    sonuc = deniz * (1 - kara[..., None]) + kara_renk * kara[..., None]

    gol_renk = GOL * (0.55 + 0.45 * turkiye[..., None])
    sonuc = sonuc * (1 - goller[..., None]) + gol_renk * goller[..., None]

    # Nehirler (yalnız karada): ölçek sırasına göre kalınlık.
    kat = 2
    nim = Image.new("L", (gen * kat, yuk * kat), 0)
    nc = ImageDraw.Draw(nim)
    for ad in ("ne_10m_rivers_lake_centerlines", "ne_10m_rivers_europe"):
        for f in oku_json(ad)["features"]:
            if not f.get("geometry"):
                continue
            sr = f["properties"].get("scalerank") or 10
            kalin = 4 if sr <= 4 else 3 if sr <= 8 else 2
            for cz in cizgiler(f["geometry"]):
                if len(cz) > 1 and kutuda(cz):
                    nc.line([piksel(x, y, gen * kat, yuk * kat) for x, y in cz],
                            fill=255, width=kalin, joint="curve")
    nehir = np.asarray(nim.resize(DOKU, Image.BOX), np.float32) / 255.0
    nehir *= kara * (1 - goller) * (0.45 + 0.4 * turkiye)
    sonuc = sonuc * (1 - nehir[..., None]) + NEHIR * nehir[..., None]

    # İl sınırları ve Türkiye'nin dış çizgisi.
    kat = 4
    sim = Image.new("L", (gen * kat, yuk * kat), 0)
    sc = ImageDraw.Draw(sim)
    for f in iller:
        for grup in halkalar(f["geometry"]):
            noktalar = [piksel(x, y, gen * kat, yuk * kat) for x, y in grup[0]]
            sc.line(noktalar + noktalar[:1], fill=255, width=3, joint="curve")
    sinir = np.asarray(sim.resize(DOKU, Image.BOX), np.float32) / 255.0
    tm = np.asarray(Image.fromarray((turkiye * 255).astype(np.uint8)).resize(
        (gen * 2, yuk * 2), Image.BILINEAR), np.float32) > 127
    dis = tm ^ ndimage.binary_erosion(tm, iterations=2)
    dis = np.asarray(Image.fromarray((dis * 255).astype(np.uint8)).resize(DOKU, Image.BOX),
                     np.float32) / 255.0
    acik = np.array([236, 228, 214], np.float32)
    sonuc = sonuc * (1 - 0.55 * sinir[..., None]) + acik * 0.55 * sinir[..., None]
    sonuc = sonuc * (1 - 0.62 * dis[..., None]) + acik * 0.62 * dis[..., None]

    Image.fromarray(np.clip(sonuc, 0, 255).astype(np.uint8), "RGB").save(
        f"{CIKTI}/renk.jpg", quality=80, optimize=True, progressive=True)

    # ---------------------------------------------------- yükseklik ızgarası
    h = boyutla(np.maximum(ham, 0), (AG_X, AG_Z))
    kara_ag = maske(oku_json("ne_10m_land")["features"], AG_X, AG_Z, kat=4)
    h = np.where(kara_ag > 0.5, np.maximum(h, 0), 0.0)
    bayt = np.round(np.sqrt(np.clip(h / HMAX_M, 0, 1)) * 255).astype(np.uint8)
    print("ızgara:", AG_X, "x", AG_Z, "en yüksek:", float(h.max()), "m")

    # ---------------------------------------------------- il kimlik haritası
    ig, iy = IL_IZGARA
    im = Image.new("L", IL_IZGARA, 0)
    c = ImageDraw.Draw(im)
    for f in iller:
        doldur(c, halkalar(f["geometry"]), plaka[f["properties"]["adm1_code"]], ig, iy)
    kimlik = np.asarray(im)
    gorunen = sorted(set(np.unique(kimlik)) - {0})
    assert gorunen == list(range(1, 82)), f"ızgarada görünmeyen il var: {set(range(1, 82)) - set(gorunen)}"

    rle = bytearray()
    for satir in kimlik:
        i = 0
        while i < len(satir):
            j = i
            while j < len(satir) and satir[j] == satir[i]:
                j += 1
            rle += bytes([satir[i]]) + (j - i).to_bytes(2, "little")
            i = j

    # İl başına etiket noktası (Natural Earth'ün kendi etiket konumu) ve kapsam.
    il_bilgi = [None] * 82
    for f in iller:
        p = f["properties"]
        no = plaka[p["adm1_code"]]
        u, v = piksel(p["longitude"], p["latitude"], 1, 1)
        ys, xs = np.nonzero(kimlik == no)
        il_bilgi[no] = [round(u, 4), round(v, 4),
                        round((xs.max() - xs.min() + 1) / ig, 4),
                        round((ys.max() - ys.min() + 1) / iy, 4)]
        if kimlik[min(iy - 1, int(v * iy)), min(ig - 1, int(u * ig))] != no:
            print("uyarı: etiket noktası il dışında:", no, p["name"])

    veri = {
        "sinir": {"bati": BATI, "dogu": DOGU, "guney": GUNEY, "kuzey": KUZEY},
        "boyutKm": [round(GENISLIK_KM, 1), round(YUKSEKLIK_KM, 1)],
        "yukselti": {"gx": AG_X, "gz": AG_Z, "hmaxKm": HMAX_M / 1000,
                     "veri": base64.b64encode(bayt.tobytes()).decode()},
        "il": {"genislik": ig, "yukseklik": iy, "rle": base64.b64encode(bytes(rle)).decode()},
        "iller": il_bilgi,
        "kaynak": "Sınırlar, göller ve nehirler: Natural Earth (kamu malı). "
                  "Yükseklik: NOAA ETOPO 2022 (kamu malı).",
    }
    with open(f"{CIKTI}/harita-veri.js", "w", encoding="utf-8") as f:
        f.write("/* 3D Türkiye haritasının verisi. assets/harita/uret_harita.py üretir;\n"
                "   elle düzenlenmez. Kaynaklar ve lisanslar: assets/harita/KAYNAK.md */\n")
        f.write("const HARITA_VERI = ")
        json.dump(veri, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("RLE:", len(rle), "bayt; veri dosyası yazıldı")


if __name__ == "__main__":
    main()
