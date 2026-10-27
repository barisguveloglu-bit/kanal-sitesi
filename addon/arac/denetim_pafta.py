"""DENETIM PAFTASI -- kare numarali temas sayfalari              v7.99.15

Gemini (GEMINI_ISCI.md) videoyu saniyede bir kare goruyor; tek karelik
hatayi kacirir ve kare numarasi bilmez. Bu arac bir cizimin karelerinden
ya da videodan cekim cekim pafta cizer: her kucuk resmin altinda cekim,
kare numarasi, film zamani ve o an ekrandaki altyazi. Denetim raporu bu numaralarla yazilir (kare 412-418).

    python3 addon/arac/denetim_pafta.py <cizim> --cikti <depo disi> [--senaryo addon/film/x.json]
        [--baslik "2-1 taslak s1"] [--her 0.5] [--sutun 3] [--satir 3] [--en 640]
        [--aralik 1-1066 | --parca part1]
    python3 addon/arac/denetim_pafta.py --video film.mp4 --cikti ... [--ilk 1067] [--atla 2.5] [--adim 1]

<cizim>: blender_film ciktisi (kare/0001.png ... + yazilar.json). Cikti:
pafta_01.png ..., pafta.md (dizin: cekim -> pafta, altyazilar, supheler) ve
pafta.json.

* Cekimler senaryonun kamera listesinden, kamera_denetim'in kuraliyla: kare,
  hikaye zamaninda t'si gecmis son atisa ait. Her cekim yeni bir satirdan
  baslar, bir satirda iki cekim olmaz. Senaryo yoksa butun aralik tek cekim.
* Ornekleme: cekimin ilk ve son karesi + her `her` saniyede (film zamani)
  bir kare. --adim ile cizilmis taslakta yalniz var olan kareler.
* TEK KARE SUPHESI: ornekleme tek karelik hatayi kacirir. Her kare iki
  komsusuyla olculur ve BUTUN KAREYI bozan tek karelik hata aranir: siyah ya
  da bos kare, isik titremesi, baska bir yerden gelmis kare. Yerel hata (bir
  aktorun tek karelik pozu, kucuk yama) dovusun hizli hareketinden
  ayrilamadi (olcum asagida); onlari zaman cizelgesi yakaliyor
  (tek_kare_donus_suz, kamera_denetim). Cekim basina en guclu SUPHE_PAFTADA
  tanesi komsulariyla paftaya girer (kirmizi cerceve); hepsi pafta.md'de.
* Video: kare numarasi = ilk + j * adim (j: --atla'dan sonraki video karesi).
  film_birlestir'in ciktisinda baslik karti varsa --atla ile gecilir.
* Kareler herkese acik depoya girmez: cikti kanal-sitesi icindeyse HATA.
"""
import argparse
import bisect
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_film as F  # noqa: E402
import cizim_ortak as O  # noqa: E402

OLCU_EN = 192                # tek kare olcusu bu genislikte (gurultu azalir, hizli)
BLOK = (16, 9)               # olcu bolgeleri: her biri kare genisliginin 1/16'si
BOLGE_ESIK = 8.0             # 0-255: bolgede ortalama min(d(f-1,f), d(f,f+1)) - d(f-1,f+1)
# Esikler gercek bir dovus onizlemesinde olculdu (1. bolum 1140-1330, 181
# kare; tirpan bir karede ekranin yarisini geciyor, yer yumrugunda sarsinti):
# dogal en cok isik 2,05, kapsam 0,25. Ayni sahnede uc yere eklenen
# bozulmalar: siyah kare isik 103-127; parlaklik +-%8 isik 5,8-10,5; baska
# cekimden kare kapsam 0,83-0,99 -- hepsi yakalandi. 4 px kamera kaymasi
# (kapsam en cok 0,37) ve sirasi karismis kare (0,09) dovusun hizli
# hareketinden ayrilmadi -- bilerek aranmiyor; yerel bozulma (bir aktorun
# tek karelik pozu) da. Ilk surum bolge bolge bakiyor, hizli cismi hareket
# aramasiyla ayiriyordu: sentetik veride temizdi, gercek dovuste 50 karede
# 12 yanlis suphe verdi.
ISIK_ESIK = 4.0              # 0-255: bir karelik parlaklik sicramasi (titreme, siyah kare, flas)
KAPSAM_ESIK = 0.5            # bolgelerin yarisi yalniz bu karede farkli (bozuk ya da baska kare)
SUPHE_PAFTADA = 4            # cekim basina paftaya giren en guclu suphe
YAZI_INCE = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
ARKA, METIN, SOLUK, SARI = (24, 24, 28), (235, 235, 235), (150, 150, 158), (255, 214, 90)
KIRMIZI, KOMSU = (230, 60, 60), (130, 130, 130)
BOSLUK, BASLIK_Y, ETIKET_Y = 8, 66, 54


def sn(t):
    """13.7 -> '13,70'"""
    return ("%.2f" % t).replace(".", ",")


def dk_sn(t):
    """75.5 -> '1:15,50'"""
    return "%d:%s" % (int(t // 60), sn(t % 60).zfill(5))


# ============================================================
# 1. CEKIM VE ALTYAZI -- saf Python (test Blender'siz calistiriyor)
# ============================================================
def cekimler(senaryo, a, b):
    """[{"no", "bas", "son", "aci", "a", "b"}] -- a..b film karelerinde (1 tabanli).
    Kare f'nin hikaye zamani harita[f-1]; atis, t'si gecmis son atis
    (kamera_denetim.atis_no ile ayni kural)."""
    if not senaryo or not senaryo.get("kamera"):
        return [{"no": 1, "bas": a, "son": b, "aci": None, "a": None, "b": None}]
    harita = F.zaman_haritasi(senaryo)
    atislar = sorted(senaryo["kamera"], key=lambda c: c["t"])
    out = []
    for f in range(a, b + 1):
        t = harita[min(f - 1, len(harita) - 1)]
        n = max([i for i, c in enumerate(atislar) if c["t"] <= t + 1e-9] or [0])
        if out and out[-1]["no"] == n + 1:
            out[-1]["son"] = f
        else:
            c = atislar[n]
            out.append({"no": n + 1, "bas": f, "son": f, "aci": c["aci"],
                        "a": c.get("a"), "b": c.get("b")})
    return out


def yazi_metni(y):
    if y["tur"] == "soyle" and y.get("isim"):
        return "%s: %s" % (y["isim"], y["metin"])
    return y["metin"]


def ekrandaki_yazi(yazilar, t):
    """Film zamani t'de ekrandaki altyazi (blender_film.altyazi_bas'in kurali);
    ust uste binenler " / " ile. Baslik sahnede degil, ayri kartta
    (BASLIK_SAHNEDE)."""
    ekranda = [yazi_metni(y) for y in yazilar if y["t"] <= t < y["t"] + y["sure"]
               and (y["tur"] != "baslik" or F.BASLIK_SAHNEDE)]
    return " / ".join(ekranda) or None


def senaryo_yazilari(senaryo):
    """yazilar.json yoksa: blender_film'in zaman cizelgesinden (film zamaninda)."""
    import bedrock_onizleme as B
    setler = B.oku(F.HAREKET)["setler"]
    return F.zaman_cizelgesi(senaryo, setler, {})[2]


# ============================================================
# 2. TEK KARE SUPHESI
# ============================================================
def kucuk(im):
    """Olcu icin kucuk RGB kopya (OLCU_EN genisliginde, kutu ortalamasi)."""
    im = im.convert("RGB")
    return np.asarray(im.resize((OLCU_EN, max(1, round(OLCU_EN * im.height / im.width))), Image.BOX))


def _fark(a, b):
    """Piksel basina renk farki (0-255, uc kanalin ortalamasi)."""
    return np.abs(a - b).mean(axis=2)


def tek_kare_olcusu(onceki, bu, sonraki):
    """(isik, kapsam). isik: karenin ortalama parlakligi komsularinin
    ortasindan sapmasi, komsularin kendi farkinin yarisi dusulur (duzgun
    degisim 0'in altinda kalir). kapsam: bolgelerin ne kadari "yalniz bu
    karede farkli" (bolge ortalamasi min(d(f-1,f), d(f,f+1)) - d(f-1,f+1)
    BOLGE_ESIK'i asiyor). Diziler int16 (h, w, 3)."""
    p0, p1, p2 = (float(x.mean()) for x in (onceki, bu, sonraki))
    isik = abs(p1 - (p0 + p2) / 2) - abs(p2 - p0) / 2
    harita = np.minimum(_fark(bu, onceki), _fark(sonraki, bu)) - _fark(sonraki, onceki)
    by, bx = bu.shape[0] // BLOK[1], bu.shape[1] // BLOK[0]
    bloklar = harita[:by * BLOK[1], :bx * BLOK[0]].reshape(BLOK[1], by, BLOK[0], bx).mean(axis=(1, 3))
    return isik, float((bloklar >= BOLGE_ESIK).mean())


def tek_kare_supheleri(kucukler, cekim_listesi):
    """kucukler: sirayla (kare, kucuk dizi). [{"kare", "cekim", "isik", "kapsam"}];
    komsular ayni cekimde ve var olan kareler (bellekte hep uc kare)."""
    baslar = [c["bas"] for c in cekim_listesi]
    out, pencere = [], []
    for f, dizi in kucukler:
        c = cekim_listesi[bisect.bisect_right(baslar, f) - 1]["no"]
        if pencere and pencere[-1][2] != c:
            pencere = []
        pencere = (pencere + [(f, dizi.astype(np.int16), c)])[-3:]
        if len(pencere) == 3:
            (_, a, _), (f1, b, _), (_, d, _) = pencere
            isik, kapsam = tek_kare_olcusu(a, b, d)
            if isik >= ISIK_ESIK or kapsam >= KAPSAM_ESIK:
                out.append({"kare": f1, "cekim": c, "isik": round(isik, 1), "kapsam": round(kapsam, 2)})
    return out


# ============================================================
# 3. ORNEKLEME VE YERLESIM
# ============================================================
def ornekle(var, c, fps, her, supheler):
    """Cekimin paftaya giren kareleri: ilk, son, her `her` sn'de bir ve en
    guclu supheler komsulariyla. {kare: "suphe" | "komsu" | None}"""
    kareler = sorted(f for f in var if c["bas"] <= f <= c["son"])
    if not kareler:
        return {}
    secim = {kareler[0]: None, kareler[-1]: None}
    if her > 0:
        t0, t1 = (kareler[0] - 1) / fps, (kareler[-1] - 1) / fps
        k = 1
        while t0 + k * her < t1 - 0.5 / fps:
            hedef = t0 + k * her
            secim.setdefault(min(kareler, key=lambda f: abs((f - 1) / fps - hedef)), None)
            k += 1
    else:
        secim.update({f: None for f in kareler})
    guclu = sorted((s for s in supheler if s["cekim"] == c["no"]),
                   key=lambda s: -max(s["isik"] / ISIK_ESIK, s["kapsam"] / KAPSAM_ESIK))[:SUPHE_PAFTADA]
    for s in guclu:
        i = kareler.index(s["kare"])
        for f in kareler[max(0, i - 1):i + 2]:
            if secim.get(f) != "suphe":
                secim[f] = "komsu"
        secim[s["kare"]] = "suphe"
    return dict(sorted(secim.items()))


def satirlara_bol(cekim_kareleri, sutun):
    """[(cekim, [kare...])] -> satirlar; bir satirda iki cekim olmaz."""
    satirlar = []
    for c, kareler in cekim_kareleri:
        for i in range(0, len(kareler), sutun):
            satirlar.append((c, kareler[i:i + sutun]))
    return satirlar


# ============================================================
# 4. KAYNAK: cizim klasoru ya da video
# ============================================================
class Klasor:
    def __init__(self, yol):
        self.kok = yol
        k = os.path.join(yol, "kare")
        self.dizin = k if os.path.isdir(k) else yol
        self.yollar = {}
        for ad in os.listdir(self.dizin):
            govde, uz = os.path.splitext(ad)
            p = os.path.join(self.dizin, ad)
            # 0 baytlik dosya Blender'in yer tutucusu: kare yok
            if uz.lower() == ".png" and govde.isdigit() and os.path.getsize(p) > 0:
                self.yollar[int(govde)] = p

    def kareler(self, a, b):
        return sorted(f for f in self.yollar if a <= f <= b)

    def kucukler(self, kareler):
        for f in kareler:
            with Image.open(self.yollar[f]) as im:
                yield f, kucuk(im)

    def resimler(self, kareler, en):
        out = {}
        for f in kareler:
            with Image.open(self.yollar[f]) as im:
                im = im.convert("RGB")
                out[f] = im.resize((en, round(en * im.height / im.width)), Image.LANCZOS)
        return out

    def video_zamani(self, f):
        return None


class Video:
    def __init__(self, yol, ilk=1, atla=0.0, adim=1):
        self.yol, self.ilk, self.atla, self.adim = yol, ilk, atla, max(1, adim)
        o = json.loads(subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
             "-show_entries", "stream=width,height,r_frame_rate,nb_read_frames", "-of", "json", yol],
            capture_output=True, text=True, check=True).stdout)["streams"][0]
        pay, payda = o["r_frame_rate"].split("/")
        self.vfps = float(pay) / float(payda)
        self.boyut = (o["width"], o["height"])
        self.sayi = int(o["nb_read_frames"]) - round(self.atla * self.vfps)

    def _akis(self, w, h, bicim, kanal):
        """ffmpeg'den kare kare ham piksel; j: atla'dan sonraki video karesi."""
        komut = ["ffmpeg", "-v", "error"] + (["-ss", "%.6f" % self.atla] if self.atla else []) + \
                ["-i", self.yol, "-vf", "scale=%d:%d:flags=area,format=%s" % (w, h, bicim),
                 "-f", "rawvideo", "-"]
        p = subprocess.Popen(komut, stdout=subprocess.PIPE)
        boy = w * h * kanal
        j = 0
        try:
            while True:
                b = p.stdout.read(boy)
                if len(b) < boy:
                    break
                yield j, b
                j += 1
        finally:
            p.stdout.close()
            p.wait()

    def kare_no(self, j):
        return self.ilk + j * self.adim

    def kareler(self, a, b):
        return [f for f in (self.kare_no(j) for j in range(self.sayi)) if a <= f <= b]

    def kucukler(self, kareler):
        w, h = OLCU_EN, max(1, round(OLCU_EN * self.boyut[1] / self.boyut[0]))
        istenen = set(kareler)
        for j, b in self._akis(w, h, "rgb24", 3):
            if self.kare_no(j) in istenen:
                yield self.kare_no(j), np.frombuffer(b, np.uint8).reshape(h, w, 3)

    def resimler(self, kareler, en):
        w, h = en, round(en * self.boyut[1] / self.boyut[0])
        istenen, out = set(kareler), {}
        for j, b in self._akis(w, h, "rgb24", 3):
            if self.kare_no(j) in istenen:
                out[self.kare_no(j)] = Image.frombytes("RGB", (w, h), b)
        return out

    def video_zamani(self, f):
        return self.atla + (f - self.ilk) / self.adim / self.vfps


# ============================================================
# 5. CIZIM
# ============================================================
def kirp(d, metin, font, en):
    if d.textlength(metin, font=font) <= en:
        return metin
    while metin and d.textlength(metin + "…", font=font) > en:
        metin = metin[:-1]
    return metin + "…"


def pafta_ciz(satirlar, resim, bilgi, baslik, sutun, en, yol):
    """satirlar: [(cekim, [kare...])]; bilgi[kare] = {"t", "cekim", "yazi", "isaret", "video"}"""
    yuk = next(iter(resim.values())).height
    W = sutun * en + (sutun + 1) * BOSLUK
    H = BASLIK_Y + len(satirlar) * (yuk + ETIKET_Y + BOSLUK) + BOSLUK
    im = Image.new("RGB", (W, H), ARKA)
    d = ImageDraw.Draw(im)
    f_bas = ImageFont.truetype(F.YAZI_TIPI, 24)
    f_alt = ImageFont.truetype(YAZI_INCE, 18)
    f_etk = ImageFont.truetype(F.YAZI_TIPI, 18)
    f_yazi = ImageFont.truetype(YAZI_INCE, 17)
    d.text((BOSLUK + 4, 8), kirp(d, baslik[0], f_bas, W - 24), font=f_bas, fill=METIN)
    d.text((BOSLUK + 4, 38), kirp(d, baslik[1], f_alt, W - 24), font=f_alt, fill=SOLUK)
    y = BASLIK_Y
    onceki_c = None
    for c, kareler in satirlar:
        if onceki_c is not None and c != onceki_c:
            d.line([(BOSLUK, y - BOSLUK // 2), (W - BOSLUK, y - BOSLUK // 2)], fill=SARI, width=2)
        onceki_c = c
        for i, f in enumerate(kareler):
            x = BOSLUK + i * (en + BOSLUK)
            im.paste(resim[f], (x, y))
            b = bilgi[f]
            if b["isaret"]:
                renk, kal = (KIRMIZI, 5) if b["isaret"] == "suphe" else (KOMSU, 2)
                d.rectangle([x - 1, y - 1, x + en, y + yuk], outline=renk, width=kal)
            etiket = "Ç%d · K %d · %s sn" % (b["cekim"], f, sn(b["t"]))
            if b.get("video") is not None:
                etiket += " · video %s" % dk_sn(b["video"])
            if b["isaret"] == "suphe":
                etiket += " · TEK KARE"
            d.text((x + 2, y + yuk + 4), kirp(d, etiket, f_etk, en - 4), font=f_etk,
                   fill=KIRMIZI if b["isaret"] == "suphe" else METIN)
            if b["yazi"]:
                d.text((x + 2, y + yuk + 28), kirp(d, b["yazi"], f_yazi, en - 4), font=f_yazi, fill=SARI)
        y += yuk + ETIKET_Y + BOSLUK
    im.save(yol)


# ============================================================
# 6. ANA AKIS
# ============================================================
def pafta_uret(kaynak, cikti, senaryo=None, yazilar=None, baslik="", her=0.5,
               sutun=3, satir=3, en=640, aralik=None, fps=None, kaynak_adi=""):
    cikti = os.path.abspath(cikti)
    if (cikti + os.sep).startswith(O.KOK + os.sep):
        raise SystemExit("HATA: cikti kanal-sitesi deposunun icinde (%s). "
                         "Kareler herkese acik depoya giremez." % cikti)
    fps = fps or (senaryo or {}).get("fps") or 30
    hepsi = kaynak.kareler(1, 10 ** 9)
    if not hepsi:
        raise SystemExit("HATA: kare yok: %s" % kaynak_adi)
    a, b = aralik or (hepsi[0], hepsi[-1])
    var = [f for f in hepsi if a <= f <= b]
    if not var:
        raise SystemExit("HATA: %d-%d araliginda kare yok" % (a, b))
    cekim_listesi = cekimler(senaryo, var[0], var[-1])
    yazilar = yazilar or []

    print("tek kare olcusu: %d kare" % len(var), file=sys.stderr, flush=True)
    supheler = tek_kare_supheleri(kaynak.kucukler(var), cekim_listesi)

    secim, bilgi = [], {}
    for c in cekim_listesi:
        s = ornekle(var, c, fps, her, supheler)
        if not s:
            continue
        secim.append((c["no"], list(s)))
        for f, isaret in s.items():
            t = (f - 1) / fps
            bilgi[f] = {"t": t, "cekim": c["no"], "yazi": ekrandaki_yazi(yazilar, t),
                        "isaret": isaret, "video": kaynak.video_zamani(f)}
    satirlar = satirlara_bol(secim, sutun)
    resim = kaynak.resimler(sorted(bilgi), en)

    os.makedirs(cikti, exist_ok=True)
    for ad in os.listdir(cikti):
        if ad.startswith("pafta_") and ad.endswith(".png"):
            os.remove(os.path.join(cikti, ad))
    sayfalar = [satirlar[i:i + satir] for i in range(0, len(satirlar), satir)]
    hane = max(2, len(str(len(sayfalar))))
    paftalar = []
    for i, sayfa in enumerate(sayfalar):
        dosya = "pafta_%0*d.png" % (hane, i + 1)
        kareler = [f for _, ks in sayfa for f in ks]
        cs = sorted({c for c, _ in sayfa})
        ust = "%s · pafta %d/%d · çekim %s" % (baslik or kaynak_adi, i + 1, len(sayfalar),
                                               ", ".join(map(str, cs)))
        alt = "kare %d–%d · %s–%s sn · her %s sn · kırmızı: tek kare şüphesi" % (
            kareler[0], kareler[-1], sn(bilgi[kareler[0]]["t"]), sn(bilgi[kareler[-1]]["t"]), sn(her))
        pafta_ciz(sayfa, resim, bilgi, (ust, alt), sutun, en, os.path.join(cikti, dosya))
        paftalar.append({"dosya": dosya, "cekimler": cs,
                         "satirlar": [{"cekim": c, "kareler": ks} for c, ks in sayfa]})
        for f in kareler:
            bilgi[f]["pafta"] = dosya
    for c in cekim_listesi:
        c["paftalar"] = [p["dosya"] for p in paftalar if c["no"] in p["cekimler"]]
        c["yazilar"] = [{"kare": round(y["t"] * fps) + 1, "t": y["t"], "sure": y["sure"], "metin": yazi_metni(y)}
                        for y in yazilar if y["tur"] != "baslik" and c["bas"] <= round(y["t"] * fps) + 1 <= c["son"]]
    for s in supheler:
        s["pafta"] = bilgi[s["kare"]]["pafta"] if s["kare"] in bilgi else None
    dizin = {"baslik": baslik, "kaynak": kaynak_adi, "fps": fps, "her": her, "aralik": [var[0], var[-1]],
             "kare_sayisi": len(var), "cekimler": cekim_listesi, "paftalar": paftalar,
             "kareler": {str(f): {"t": round(b_["t"], 4), "cekim": b_["cekim"], "yazi": b_["yazi"],
                                  "isaret": b_["isaret"], "pafta": b_["pafta"]} for f, b_ in sorted(bilgi.items())},
             "tek_kare": supheler}
    with open(os.path.join(cikti, "pafta.json"), "w", encoding="utf-8") as fh:
        json.dump(dizin, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(cikti, "pafta.md"), "w", encoding="utf-8") as fh:
        fh.write(dizin_md(dizin))
    return dizin


def dizin_md(d):
    fps = d["fps"]
    s = ["# Denetim paftası — %s" % (d["baslik"] or d["kaynak"]), "",
         "Kaynak: `%s` · kare %d–%d (%d kare var) · %g fps · her %s sn · %d pafta" % (
             d["kaynak"], d["aralik"][0], d["aralik"][1], d["kare_sayisi"], fps, sn(d["her"]), len(d["paftalar"])),
         "",
         "Rapor `GEMINI_ISCI.md`'deki Film denetçisi tablosuyla yazılır; çekim ve kare numaraları buradaki.",
         "Zaman film zamanı: kare k = (k − 1) / fps sn.", "",
         "| çekim | açı | kare | süre (sn) | pafta | altyazı (başladığı kare) |", "|---|---|---|---|---|---|"]
    for c in d["cekimler"]:
        aci = c["aci"] or "—"
        kim = ", ".join(x for x in (c["a"], c["b"]) if x)
        if kim:
            aci += " (%s)" % kim
        yz = "<br>".join("K %d: %s" % (y["kare"], y["metin"].replace("|", "/")) for y in c["yazilar"]) or "—"
        pf = ", ".join(p.replace("pafta_", "").replace(".png", "") for p in c["paftalar"]) or "—"
        s.append("| %d | %s | %d–%d | %s–%s | %s | %s |" % (
            c["no"], aci, c["bas"], c["son"], sn((c["bas"] - 1) / fps), sn((c["son"] - 1) / fps), pf, yz))
    s += ["", "## Tek kare şüphesi", "",
          "Bütün kareyi bozan tek karelik hata aranır: parlaklık sıçraması (ışık ≥ %s: titreme, siyah kare,"
          " flaş) ya da karenin yarısından çoğunun yalnız o karede farklı olması (kapsam ≥ %s: bozuk ya da"
          " başka yerden gelmiş kare). Flaş ve kıvılcım da sayılabilir. Bir aktörün tek karelik poz hatası"
          " gibi yerel hatalar burada aranmaz." % (sn(ISIK_ESIK), sn(KAPSAM_ESIK)), ""]
    if d["tek_kare"]:
        s += ["Paftada kırmızı çerçeveli olanlar çekim başına en güçlü %d." % SUPHE_PAFTADA, "",
              "| kare | çekim | ışık | kapsam | pafta |", "|---|---|---|---|---|"]
        s += ["| %d | %d | %s | %s | %s |" % (x["kare"], x["cekim"], sn(x["isik"]), sn(x["kapsam"]),
                                              x["pafta"] or "yalnız burada") for x in d["tek_kare"]]
    else:
        s.append("Yok.")
    return "\n".join(s) + "\n"


def main():
    p = argparse.ArgumentParser(description="Kare numarali denetim paftasi")
    p.add_argument("cizim", nargs="?", help="blender_film ciktisi (kare/ + yazilar.json)")
    p.add_argument("--video")
    p.add_argument("--ilk", type=int, default=1, help="videonun ilk karesinin film karesi numarasi")
    p.add_argument("--atla", type=float, default=0.0, help="videonun basindan gecilecek sn (baslik karti)")
    p.add_argument("--adim", type=int, default=1, help="video --adim ile cizilmis taslaksa N")
    p.add_argument("--cikti", required=True)
    p.add_argument("--senaryo")
    p.add_argument("--yazilar", help="yazilar.json (cizim klasorundekinden baska)")
    p.add_argument("--baslik", default="")
    p.add_argument("--her", type=float, default=0.5)
    p.add_argument("--sutun", type=int, default=3)
    p.add_argument("--satir", type=int, default=3)
    p.add_argument("--en", type=int, default=640)
    p.add_argument("--aralik")
    p.add_argument("--parca")
    arg = p.parse_args()
    if bool(arg.cizim) == bool(arg.video):
        p.error("ya cizim klasoru ya --video")
    senaryo = json.load(open(arg.senaryo, encoding="utf-8")) if arg.senaryo else None
    aralik = None
    if arg.aralik:
        aralik = [int(x) for x in arg.aralik.split("-")]
    elif arg.parca:
        if not senaryo or arg.parca not in senaryo.get("parcalar", {}):
            p.error("--parca senaryonun 'parcalar' alaninda yok: %s" % arg.parca)
        aralik = senaryo["parcalar"][arg.parca]
    if arg.video:
        kaynak, adi = Video(arg.video, arg.ilk, arg.atla, arg.adim), arg.video
    else:
        kaynak, adi = Klasor(arg.cizim), arg.cizim
    yazi_yolu = arg.yazilar or (os.path.join(arg.cizim, "yazilar.json") if arg.cizim else None)
    fps = None
    if yazi_yolu and os.path.exists(yazi_yolu):
        bilgi = json.load(open(yazi_yolu, encoding="utf-8"))
        yazilar, fps = bilgi["yazilar"], bilgi.get("fps")
    elif senaryo:
        print("yazilar.json yok: altyazilar senaryodan hesaplaniyor", file=sys.stderr, flush=True)
        yazilar = senaryo_yazilari(senaryo)
    else:
        yazilar = []
    d = pafta_uret(kaynak, arg.cikti, senaryo, yazilar, arg.baslik, arg.her, arg.sutun, arg.satir,
                   arg.en, aralik, fps, adi)
    print("%d pafta, %d cekim, %d tek kare suphesi -> %s" % (
        len(d["paftalar"]), len(d["cekimler"]), len(d["tek_kare"]), os.path.abspath(arg.cikti)))


if __name__ == "__main__":
    main()
