"""Parcalari tek filme baglar: altyazi + ses + ardarda + siyah son.   v7.99.10

    python3 addon/arac/film_birlestir.py cikti.mp4 klasor1:senaryo1.json klasor2:senaryo2.json ... [--adim 3]
    python3 addon/arac/film_birlestir.py part1.mp4 orman:bolum1_orman.json:part1
    python3 addon/arac/film_birlestir.py part2.mp4 orman:bolum1_orman.json:part2 oda:bolum1_oda.json

--cagri 35,95: begen/abone animasyonu (cagri_animasyon.py) bu saniyelerde;
yazilmazsa filmin %15, %50, %85'inde 3 kez (kullanici, 2026-11-08: her
videoda 3 kez, farkli yerlerde); --cagri yok: hic. Animasyon gelince FILM
DURUR (kullanici, 2026-11-22: "abone ol begen geldigi an animasyon dursun,
bittikten sonra baslasin"): son kare animasyon boyunca donar, film sesi
susar, sonra film kaldigi yerden surer (durdurma_filtre). Saniyeler
DURDURMASIZ filmin saniyeleri; her cagri videoyu cagri_animasyon.SURE uzatir.

--adim N: onizleme (blender_film --adim N ile cizilmis); video fps/N'de
akar, ses ve altyazi yine film zamaninda. Eksik kare varsa durur.

Her klasor blender_film.py ciktisi (kare/0001.png ... + yazilar.json).
Adimlar: altyazi (blender_film.altyazi_bas) -> ses (film_ses.py, ayni
senaryodan) -> parca.mkv (ses KAYIPSIZ); sonra parcalar ardarda, en sona
0.6 sn siyah (dorduncu duvar: "ondan sonra bitsin"). YouTube icin H.264
(BT.709 matris + etiket) + AAC 384k, +faststart (yukleme yarim kalsa da oynar).
"""
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_film as F  # noqa: E402
import bedrock_onizleme as B  # noqa: E402
import film_ses  # noqa: E402

SIYAH_SON = 0.6
# loudnorm tek geciste hedefi tutturmuyor: 38 sn'lik Part 1 denemesinde
# -14 yerine -11.3 LUFS olculdu (v7.99.12). Bu yuzden film once kayipsiz
# sesle (FLAC) ara dosyaya yazilir, butunlesik yukseklik OLCULUR, fark
# dogrusal kazancla kapatilir (video kopyalanir, AAC yalniz bir kez).
HEDEF_LUFS = -14.0
SON_SES = "volume=%.2fdB,alimiter=limit=0.84:attack=2:release=60:level=false"
# Son ses zinciri (kullanicinin arastirmasi: "dovus videosunda muzik, vurus
# ve efekt ust uste biniyor, limiter sart"): yumusak kompresor -> YouTube
# hedefi -14 LUFS / -1 dBTP -> tepe sinirlayici. Hepsi ffmpeg, ucretsiz.
# loudnorm BURADA YOK (v7.99.12 uzun denetim): tek geciste dinamik kipte
# calisiyor, yani otomatik kazanc gibi -- muziksiz Part 1'de yalniz ruzgarin
# oldugu anlari ~+20 dB yukseltti (tasarlanan -37 LUFS esinti -14'e cikti,
# adim sesleri ruzgarin altinda kaldi). Hedef -14 LUFS ses_ayarla'da OLCULEREK
# ve DOGRUSAL kazancla tutturuluyor; miksajin kendi dengesi korunuyor.
SES_ZINCIR = ("acompressor=threshold=-18dB:ratio=3:attack=5:release=120:makeup=2,"
              "alimiter=limit=0.89:attack=2:release=60:level=false")
# Video: kareler sRGB (BT.709 primerleri). ffmpeg RGB->YUV'de varsayilan
# BT.601 matrisini kullanip etiket koymuyordu; oynaticilar ve YouTube HD'yi
# BT.709 sayiyor -> yesiller ~6.7 seviye koyu gorunuyordu (olculdu).
RENK_ETIKET = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
RENK_SUZGEC = "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
# YouTube onerisi: 1080p30 SDR icin yuksek bit hizli H.264, kapali GOP,
# GOP = kare hizinin yarisi; stereo AAC 384 kbps.
VIDEO_CIKIS = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-g", "15", "-bf", "2"] + RENK_ETIKET
SES_BIT = "384k"
# Parcanin ses kenarlari: dilim muzigin/efektin ortasindan kesiyor ve tek
# ornekte sifira inen ses tik yapiyordu (v7.99.12 uzun denetim: Part 1'in
# sonunda, siyaha geciste ses -14 dBFS'ten tek ornekte sifira iniyordu;
# sicrama filmdeki normal sicramalarin ~22 kati). Iki uca KENAR_MS'lik
# dogrusal gecis: kesim yine sert duyulur, tik gider. Stem'lere de ayni
# gecis uygulanir (miksajla ornek ornek hizali kalsinlar).
KENAR_MS = 10


def kenar_yumusat(ses, ms=KENAR_MS):
    """(n, 2) sesin ilk ve son `ms` milisaniyesi: 0'dan ve 0'a dogrusal gecis.
    Ortadaki ornekler degismez; kisa seste gecis sesin yarisini asmaz."""
    ses = np.array(ses, dtype=np.float32, copy=True)
    k = min(int(film_ses.ORAN * ms / 1000), len(ses) // 2)
    if k > 0:
        r = np.linspace(0.0, 1.0, k, endpoint=False, dtype=np.float32)[:, None]
        ses[:k] *= r
        ses[len(ses) - k:] *= r[::-1]
    return ses


def ses_dilimi(aralik, fps0, oran=None):
    """Kare araligi [a, b] (1'den, b dahil) -> sesin ornek dilimi. TAM SAYI
    aritmetigi: eskiden int(b / fps * ORAN) idi ve 2456/30*48000 kayan
    noktada 3929599.9999999995 cikiyordu -> ses goruntuden 1 ornek kisa ->
    "-shortest" parcanin SON KARESINI atiyordu (Part 2'de orman 2456
    filme girmedi, oda'ya geciste 1 karelik bosluk; v7.99.14'te olculdu).
    Part 1'in siniri (1066) tam sayiya denk geldigi icin orada gorunmedi."""
    if not aralik:
        return slice(None)
    oran = oran or film_ses.ORAN
    return slice(int(round((aralik[0] - 1) * oran / fps0)), int(round(aralik[1] * oran / fps0)))


def parca(klasor, senaryo_yolu, adim=1, parca_adi=None):
    """parca_adi ("part1"/"part2"): senaryonun "parcalar" araligi; ses ve
    goruntu ayni araliktan kesilir (ses tam filmden uretilip dilimlenir,
    boylece kesme noktasindaki muzik/efekt dogal devam eder)."""
    sen = B.oku(os.path.abspath(senaryo_yolu))
    fps0 = sen.get("fps", 24)
    aralik = sen["parcalar"][parca_adi] if parca_adi else None
    ek = yazi_ekleri(senaryo_yolu)              # cizimden sonra eklenen yazilar (film/yazi_ekleri/)
    if ek:
        bilgi = json.load(open(os.path.join(klasor, "yazilar.json"), encoding="utf-8"))
        yazi_ekleri_sigiyor(bilgi["yazilar"], ek, bilgi["kare"] / bilgi["fps"], os.path.basename(senaryo_yolu))
        print("%s: %d yazi eki" % (os.path.basename(senaryo_yolu), len(ek)))
    F.altyazi_bas(klasor, adim, aralik, ek=ek)  # -> klasor/film.mp4 (sessiz)
    dilim = ses_dilimi(aralik, fps0)
    ek = "_" + parca_adi if parca_adi else ""
    wav = os.path.join(klasor, "ses%s.wav" % ek)
    film_ses.yaz(kenar_yumusat(film_ses.ses_kur(sen)[dilim]), wav)
    # stem'ler: muzik / efekt / ortam ayri (Resolve Fairlight'ta son miksaj icin)
    for ad, k in film_ses.ses_kur(sen, katmanlar=True).items():
        film_ses.yaz(kenar_yumusat(k[dilim]), os.path.join(klasor, "stem%s_%s.wav" % (ek, ad)))
    # ses KAYIPSIZ kalir (FLAC): AAC'ye yalniz son adimda, bir kez cevrilir
    cikti = os.path.join(klasor, "parca%s.mkv" % ek)
    parca_kaydet(os.path.join(klasor, "film.mp4"), wav, sen.get("fps", 24) / adim, cikti)
    return cikti, sen.get("fps", 24) / adim


# Cizimden SONRA eklenen yazilar (kullanici, 2026-11-22: Part 1'e "ic ses /
# anlatim"; satirlari Claude taslak yazar, kullanici onaylar -- onaylanmayan
# satir buraya girmez). film/yazi_ekleri/*.json: {"<senaryo adi>": [{"t",
# "metin", "tur": "anlat"|"soyle", "isim" (soyle), "sure" (yoksa
# F.yazi_suresi), "neden" (soyle: agiz neden oynamak zorunda degil)}]}.
# Kareler ve senaryo DEGISMEZ: "soyle" olayi konusma hareketi ve agiz
# cizdirir (yeniden cizim), yazi eki yalniz altyaziya girer. Bu yuzden ek
# "soyle" yalniz agzi gorunmeyen biri icin (Pipos'un maskesi, kadraj disi).
YAZI_EKLERI = "yazi_ekleri"


def yazi_ekleri(senaryo_yolu):
    """Senaryonun yazi ekleri (zamana gore sirali, dogrulanmis); yoksa []."""
    ad = os.path.splitext(os.path.basename(senaryo_yolu))[0]
    kl = os.path.join(os.path.dirname(os.path.abspath(senaryo_yolu)), YAZI_EKLERI)
    out = []
    for dosya in sorted(os.listdir(kl)) if os.path.isdir(kl) else []:
        if dosya.endswith(".json"):
            for y in json.load(open(os.path.join(kl, dosya), encoding="utf-8")).get(ad, []):
                out.append(yazi_eki(y, "%s/%s" % (dosya, ad)))
    return sorted(out, key=lambda y: y["t"])


def yazi_eki(y, yer):
    """Bir yazi ekini dogrular -> altyazi_bas'in bekledigi sozluk."""
    t, metin, tur = y.get("t"), y.get("metin"), y.get("tur")
    if not isinstance(t, (int, float)) or t < 0 or not isinstance(metin, str) or not metin.strip():
        raise ValueError("%s: yazi ekinde t/metin bozuk: %r" % (yer, y))
    if tur not in ("anlat", "soyle"):
        raise ValueError("%s: yazi ekinin turu anlat ya da soyle olmali: %r" % (yer, y))
    if tur == "soyle" and not (y.get("isim") and y.get("neden")):
        raise ValueError("%s: ek konusma isim ve neden ister (agiz oynamiyor, neden sorun degil?): %r" % (yer, y))
    sure = float(y.get("sure", F.yazi_suresi(metin)))
    if sure <= 0:
        raise ValueError("%s: yazi ekinin suresi pozitif olmali: %r" % (yer, y))
    out = {"t": float(t), "sure": sure, "metin": metin, "tur": tur}
    if tur == "soyle":
        out["isim"] = y["isim"]
    return out


def yazi_ekleri_sigiyor(yazilar, ek, son, ad):
    """Ek satirlar sahnenin icinde mi, birbiriyle ve cizimin satirlariyla
    cakisiyor mu: altyazi_bas bir satiri sonraki baslayinca keser, sahne
    sonunda da kesilir -- sessizce yarim kalmasin diye HATA."""
    for y in ek:
        if y["t"] + y["sure"] > son + 1e-6:
            raise ValueError("%s: yazi eki sahne bitince kesilir (%.2f + %.2f > %.2f sn): %s"
                             % (ad, y["t"], y["sure"], son, y["metin"]))
    hepsi = sorted([y for y in yazilar if y.get("tur") != "baslik"] + list(ek), key=lambda y: y["t"])
    for a, b in zip(hepsi, hepsi[1:]):
        if a["t"] + a["sure"] > b["t"] + 1e-6:
            raise ValueError("%s: yazilar cakisiyor (%.2f sn '%s' bitmeden %.2f sn '%s' basliyor)"
                             % (ad, a["t"], a["metin"], b["t"], b["metin"]))


def kare_say(video):
    """Video akisindaki kare (paket) sayisi -- kodu cozmeden, hizli."""
    c = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                        "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", video],
                       capture_output=True, text=True, check=True)
    return int(c.stdout.strip().split(",")[0])


def parca_kaydet(film, wav, fps, cikti):
    """Goruntu (kopya) + ses (FLAC) -> parca. "-shortest" KULLANILMAZ:
    ses ile goruntu esit ya da ses 1 ornek kisa oldugunda son video karesini
    atiyordu (Part 2'de orman 2456; v7.99.14). Goruntunun BUTUN kareleri
    alinir, ses tam o sureye doldurulup kesilir (apad + atrim)."""
    n = kare_say(film)
    ornek = int(round(n * film_ses.ORAN / fps))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", film, "-i", wav, "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-frames:v", str(n), "-af", "apad,atrim=end_sample=%d" % ornek,
                    "-c:a", "flac", cikti], check=True)


KART_SURE = 2.5


def baslik_karti(klasor, senaryo_yolu, parca_adi, cikti_png, wh):
    """Parcanin araligina dusen "baslik" yazilarindan siyah kart (PNG).
    Mojang kilavuzu: baslik karti oyun iceriginin DISINDA olmali. Yoksa None."""
    from PIL import Image, ImageDraw, ImageFont
    sen = B.oku(os.path.abspath(senaryo_yolu))
    fps0 = sen.get("fps", 24)
    a, b = sen["parcalar"][parca_adi] if parca_adi else (1, 10 ** 9)
    yol = os.path.join(klasor, "yazilar.json")
    if not os.path.exists(yol):
        return None
    import json
    metin = [y["metin"] for y in json.load(open(yol, encoding="utf-8"))["yazilar"]
             if y.get("tur") == "baslik" and (a - 1) / fps0 <= y["t"] < b / fps0]
    if not metin:
        return None
    W, H = wh
    im = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(F.YAZI_TIPI, int(H * 0.12))
    yazi = "  ".join(metin)
    g = d.textlength(yazi, font=f)
    d.text(((W - g) / 2, H * 0.44), yazi, font=f, fill=(255, 255, 255))
    im.save(cikti_png)
    return cikti_png


def boyut(video):
    o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height", "-of", "csv=p=0", video], capture_output=True, text=True, check=True)
    return o.stdout.strip().replace(",", "x")


# Kullanici (2026-11-08): "bundan sonraki her videoda bunu ekleyelim, 3 tane
# olsun, farkli yerlerde." --cagri verilmezse filmin bu oranlarina ortalanir.
CAGRI_ORAN = (0.15, 0.50, 0.85)


def video_suresi(video):
    c = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
                       capture_output=True, text=True, check=True)
    return float(c.stdout.strip())


def cagri_zamanlari(toplam, bas=0.0, son=0.0, sure=6.0, oran=CAGRI_ORAN):
    """Varsayilan cagri anlari (bitmis filmin saniyeleri): her biri filmin
    `oran`ina ortalanir; baslik kartindan (bas) sonra, siyah sondan (son)
    once kalir, birbirine binmez (arada en az 1 sn). Sigmayan atlanir:
    kisa filmde (onizleme) daha az ya da hic."""
    a, b = bas + 0.5, toplam - son - sure - 0.5
    out = []
    for o in oran:
        t = min(b, max(a, toplam * o - sure / 2))
        if out:
            t = max(t, out[-1] + sure + 1.0)
        if a <= t <= b:
            out.append(round(t, 2))
    return out


def cagri_filtre(zamanlar, mov, ilk_girdi, v="v", a="a0", boyut=None):
    """Begen/abone animasyonu (cagri_animasyon.py) filmin `zamanlar` saniyelerine
    (BITMIS filmin zamani, baslik karti dahil). -> (girdi, filtre, v_cikis, a_cikis).
    Katman basina saydam karelerle doldurulur (overlay ikinci girdinin ilk
    karesini beklemesin), ses gecikmeyle karisima eklenir (normalize=0:
    filmin sesi kisilmez)."""
    girdi, f, sesler = [], [], []
    for k, tk in enumerate(zamanlar):
        m = ilk_girdi + k
        girdi += ["-i", mov]
        olcek = (",scale=%s:flags=neighbor" % boyut.replace("x", ":")) if boyut and boyut != "1920x1080" else ""
        f.append("[%d:v]format=rgba%s,tpad=start_duration=%g:color=0x00000000[cg%d];" % (m, olcek, tk, k))
        f.append("[%s][cg%d]overlay=eof_action=pass:format=auto[cv%d];" % (v, k, k))
        v = "cv%d" % k
        ms = int(round(tk * 1000))
        f.append("[%d:a]adelay=%d|%d[ca%d];" % (m, ms, ms, k))
        sesler.append("[ca%d]" % k)
    if zamanlar:
        f.append("[%s]%samix=inputs=%d:normalize=0:duration=first[cmix];" % (a, "".join(sesler), len(zamanlar) + 1))
        a = "cmix"
    return girdi, "".join(f), v, a


def durdurma_filtre(zamanlar, sure, fps, v="v", a="a0"):
    """Cagri sirasinda film DURUR (kullanici, 2026-11-22: "abone ol begen
    geldigi an animasyon dursun, bu abone ol begen seyi sonlandiktan sonra
    baslasin"). `zamanlar`: DURDURMASIZ filmin saniyeleri, kareye yuvarlanir.
    Goruntu: o andan onceki son kare `sure` boyunca tutulur (loop, tek kare
    bellekte); kare atlanmaz, araya baska kare girmez. Ses: o anda kesilir,
    `sure` sessizlik, sonra kaldigi yerden; kesim ve donus KENAR_MS'lik
    gecisle (tik yapmasin -- ses_kenar.mjs'deki ders). Cagrinin kendi sesi
    bu sessizligin ustune cagri_filtre'de eklenir.
    -> (filtre, v_cikis, a_cikis, anlar): `anlar` cagrinin DURDURULMUS
    filmdeki baslangici (k. cagri, onceki k duraklama kadar kayar)."""
    kare = sorted({int(round(t * fps)) for t in zamanlar if t * fps >= 1})
    if not kare:
        return "", v, a, []
    tut = int(round(sure * fps))
    sure = tut / fps                          # ses ve goruntu ayni uzunlukta dursun
    e = KENAR_MS / 1000.0
    f = []
    for k, n in enumerate(reversed(kare)):   # sondan basa: duraklama sonrakilerin kare sirasini kaydirmasin
        # start=n -> n-1. kare (andan onceki son kare) donar: ffmpeg 6.1'de
        # OLCULDU, start=n-1 bir kare erken (n-2) donduruyordu, ses ise tam
        # n/fps'de kesiliyordu. test/cagri.mjs kare dizisini bire bir olcuyor.
        f.append("[%s]loop=loop=%d:size=1:start=%d[dz%d];" % (v, tut, n, k))
        v = "dz%d" % k
    f.append("[%s]setpts=N/(%g*TB)[dv];" % (v, fps))
    sinir = [n / fps for n in kare]
    m = len(sinir)
    f.append("[%s]asplit=%d%s;" % (a, m + 1, "".join("[ds%d]" % i for i in range(m + 1))))
    for i in range(m + 1):
        bas = sinir[i - 1] if i else None
        son = sinir[i] if i < m else None
        kes = ([("start=%.6f" % bas)] if bas is not None else []) + ([("end=%.6f" % son)] if son is not None else [])
        z = ["atrim=" + ":".join(kes), "asetpts=PTS-STARTPTS"]
        if bas is not None:
            z.append("afade=t=in:d=%g" % e)
        if son is not None:
            z.append("afade=t=out:st=%.6f:d=%g" % (son - (bas or 0.0) - e, e))
            z.append("apad=pad_dur=%.6f" % sure)
        f.append("[ds%d]%s[dp%d];" % (i, ",".join(z), i))
    f.append("%sconcat=n=%d:v=0:a=1[da];" % ("".join("[dp%d]" % i for i in range(m + 1)), m + 1))
    return "".join(f), "dv", "da", [round(s + k * sure, 6) for k, s in enumerate(sinir)]


def main(argv):
    adim = 1
    if "--adim" in argv:
        i = argv.index("--adim")
        adim = int(argv[i + 1])
        argv = argv[:i] + argv[i + 2:]
    cagri = None                              # yazilmazsa: varsayilan 3 an (CAGRI_ORAN)
    if "--cagri" in argv:                     # --cagri 35,95 : o saniyelerde; --cagri yok : hic
        i = argv.index("--cagri")
        cagri = [] if argv[i + 1] == "yok" else [float(x) for x in argv[i + 1].split(",") if x]
        argv = argv[:i] + argv[i + 2:]
    cikti = os.path.abspath(argv[0])
    parcalar, kartlar = [], []
    fps = 30
    for a in argv[1:]:
        k, s, *pa = a.split(":")              # klasor:senaryo[:part1]
        p, fps = parca(os.path.abspath(k), s, adim, pa[0] if pa else None)
        kart = baslik_karti(os.path.abspath(k), s, pa[0] if pa else None,
                            os.path.join(os.path.abspath(k), "baslik_karti.png"),
                            [int(x) for x in boyut(p).split("x")])
        if kart and not kartlar and not parcalar:
            kartlar.append(kart)              # yalniz filmin basinda
        parcalar.append(p)
    girdi, filtre = [], []
    j = 0
    for kart in kartlar:
        # kart: sessiz, yumusak giris/cikis; sahnenin ustune degil ONUNE
        girdi += ["-loop", "1", "-framerate", "%g" % fps, "-t", str(KART_SURE), "-i", kart,
                  "-f", "lavfi", "-t", str(KART_SURE), "-i", "anullsrc=r=48000:cl=stereo"]
        filtre.append("[%d:v]%s,fade=t=in:st=0:d=0.3,fade=t=out:st=%g:d=0.3[k%d];[k%d][%d:a]"
                      % (j, RENK_SUZGEC, KART_SURE - 0.3, j, j, j + 1))
        j += 2
    for p in parcalar:
        girdi += ["-i", p]
        filtre.append("[%d:v][%d:a]" % (j, j))
        j += 1
    n = len(parcalar) + len(kartlar)
    girdi += ["-f", "lavfi", "-t", str(SIYAH_SON), "-i", "color=c=black:s=%s:r=%g" % (boyut(parcalar[0]), fps),
              "-f", "lavfi", "-t", str(SIYAH_SON), "-i", "anullsrc=r=48000:cl=stereo"]
    filtre.append("[%d:v][%d:a]" % (j, j + 1))
    # ses zinciri filtre grafiginin ICINDE: ffmpeg -af ile -filter_complex'i
    # birlikte kabul etmiyor (cikis 234)
    vc, ac, ek = "v", "a0", ""
    if cagri is None:
        import cagri_animasyon as CA
        bas = KART_SURE if kartlar else 0.0
        cagri = cagri_zamanlari(bas + sum(video_suresi(p) for p in parcalar) + SIYAH_SON, bas, SIYAH_SON, CA.SURE)
    if cagri:
        print("begen/abone animasyonu:", ", ".join("%.1f sn" % x for x in cagri), "(film bu anlarda durur)")
        import cagri_animasyon as CA
        kl = cikti + ".cagri"
        if not os.path.exists(os.path.join(kl, "cagri.mov")):
            CA.uret(kl)
        # once film durur (son kare donar, ses susar), cagri donmus karenin ustune biner
        dz, v_d, a_d, anlar = durdurma_filtre(sorted(cagri), CA.SURE, fps)
        g_, ek, vc, ac = cagri_filtre(anlar, os.path.join(kl, "cagri.mov"), j + 2, v=v_d, a=a_d,
                                      boyut=boyut(parcalar[0]))
        ek = dz + ek
        girdi += g_
    fc = ("".join(filtre) + "concat=n=%d:v=1:a=1[v][a0];" % (n + 1) + ek
          + "[%s]%s[a]" % (ac, SES_ZINCIR))
    ara = cikti + ".ara.mkv"
    subprocess.run(["ffmpeg", "-y", "-v", "error"] + girdi +
                   ["-filter_complex", fc, "-map", "[%s]" % vc, "-map", "[a]"] + VIDEO_CIKIS +
                   ["-pix_fmt", "yuv420p", "-c:a", "flac", "-ar", "48000", ara], check=True)
    olcu, kazanc, sonra = ses_ayarla(ara, cikti)
    os.remove(ara)
    print("ses: once %.1f LUFS, kazanc %+.2f dB, sonra %.1f LUFS, tepe %.1f dBTP"
          % (olcu["I"], kazanc, sonra["I"], sonra["TP"]))
    print("film:", cikti)


def ses_ayarla(ara, cikti):
    """ara (video + kayipsiz ses) -> cikti (.mp4): video KOPYA, ses HEDEF_LUFS'a
    olculerek getirilir, AAC'ye bir kez cevrilir. (once, kazanc, sonra) doner."""
    olcu = yukseklik(ara)
    kazanc = 0.0
    if olcu["I"] > -50:                       # sessiz parcayi (test, bos ses) yukseltme
        # butunlesik yukseklik kazanca dogrusal degil (mutlak -70 LUFS kapisi
        # sessiz bloklari kazancla birlikte disari atiyor: -2.7 dB -> -13.5,
        # -14 degil). Kazanc yalniz sesle (hizli) olculerek yaklastirilir.
        kazanc = HEDEF_LUFS - olcu["I"]
        for _ in range(4):
            kazanc = max(-12.0, min(12.0, kazanc))
            dene = ara + ".flac"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", ara, "-map", "0:a", "-af", SON_SES % kazanc,
                            "-c:a", "flac", dene], check=True)
            fark = HEDEF_LUFS - yukseklik(dene)["I"]
            os.remove(dene)
            if abs(fark) < 0.15:
                break
            kazanc += fark
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", ara, "-map", "0:v", "-map", "0:a", "-c:v", "copy",
                    "-af", SON_SES % kazanc,
                    "-c:a", "aac", "-b:a", SES_BIT, "-ar", "48000", "-movflags", "+faststart", cikti], check=True)
    return olcu, kazanc, yukseklik(cikti)


def yukseklik(dosya):
    """EBU R128 butunlesik yukseklik (LUFS) ve gercek tepe (dBTP)."""
    c = subprocess.run(["ffmpeg", "-nostats", "-v", "info", "-i", dosya, "-map", "0:a",
                        "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    ozet = c[c.rindex("Summary:"):]
    i = float(ozet.split("I:")[1].split("LUFS")[0])
    tp = float(ozet.split("Peak:")[-1].split("dBFS")[0])
    return {"I": i, "TP": tp}


if __name__ == "__main__":
    main(sys.argv[1:])
