"""Dagitik film cizimi -- ortak parcalar (isci, dagit, topla ayni kurallari kullanir).

Uc betik bunu kullaniyor:
    cizim_isci.py   bir bulut oturumunun calistirdigi isci (cizer, paketler, iter)
    cizim_dagit.py  koordinator (bolme, istem metni, ilerleme, eksik listesi)
    cizim_topla.py  gizli depodan kareleri geri acar (film_birlestir.py'ye hazir)

GIZLI DEPO (barisguveloglu-bit/already-exists, dal main) duzeni:
    film/<senaryo>/<aaaa>-<bbbb>.mkv    aaaa..bbbb karelerinin KAYIPSIZ paketi
    film/<senaryo>/<aaaa>-<bbbb>.json   kunye: kodek, piksel md5'leri, sure, isci
    film/<senaryo>/yazilar.json         blender_film.py'nin altyazi dosyasi
<senaryo> = senaryo dosyasinin adi (.json'suz), orn. bolum1_orman.
Film yayindan once herkese acik depoda (kanal-sitesi) GORUNMEMELI: kare ve
video yalniz gizli depoya gider.

PAKET BICIMI (olculdu, bkz. CLAUDE.md "Animasyon serisi"): iki KAYIPSIZ aday,
blok basina ikisi de denenir, dogrulanan EN KUCUGU kalir:
    libx264rgb -crf 0 -preset veryslow  (kayipsiz H.264, RGB; kareler arasi
       tahmin: 30 ardisik onizleme karesinde FFV1'in yarisi). Alfa tasimaz;
       Blender karesinde alfa her yerde 255, geri acarken 255 yazilir --
       alfa 255 degilse dogrulamadan GECEMEZ, FFV1 kalir.
    FFV1 (level 3, bgra, range coder, slicecrc)  (tek 1080p karede daha kucuk)
    Her aday geri acilip her karenin RGBA piksel md5'i kaynak PNG'ninkiyle
    karsilastirilir; hicbiri tutmazsa isci DURUR. Kayipli paket depoya giremez.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # kanal-sitesi
ADDON = os.path.join(KOK, "addon")
DEPO_UZAK = "https://github.com/barisguveloglu-bit/already-exists"
DAL = "main"
UZAK_REF = "refs/remotes/origin/main"
DEPO_KLASOR = "film"
# Cizim sirasi: Part 1 once (senaryonun "parcalar" sirasi), sonra Part 2,
# sonra karanlik oda (Part 2'nin sonuna eklenir).
FILM = ["film/bolum1_orman.json", "film/bolum1_oda.json"]
BLOK = 3             # paket = en cok 3 kare (6-28 dk/kare -> en cok ~1,5 saatlik is)
# 10'du. v7.99.10'da hesap limiti doldu, isci oturumlarinin bekleme dongusu
# yenilenemedi, makineler geri alindi: 10 karelik genis plan blogu (~4,7 saat)
# bitmeden 20 isci durdu ve TEK paket itilmedi. Blok, bir bekleme dongusunden
# (100-110 dk) kisa olmali ki her dongude en az bir paket guvene girsin.
# Cizimi etkileyen girdiler: degisirlerse ayni senaryonun kareleri farkli
# goruntu verebilir. Kunyeye agac ozeti yazilir, durum raporu karisimi soyler.
GIRDI_KLASORLER = ["addon/arac", "addon/film", "addon/kaynak_anim", "addon/kaynak_doku",
                   "addon/Simsek_Kol_Kaynak", "addon/Simsek_Skin"]
PAKET_AD = re.compile(r"^" + DEPO_KLASOR + r"/([^/]+)/(\d{4,})-(\d{4,})\.(mkv|json)$")


# ============================================================
# 1. ARALIKLAR VE BOLME
# ============================================================
def senaryo_bilgi(yol):
    """Senaryodan cizim icin gereken her sey -- Blender'siz.
    toplam: blender_film.py'nin cizdigi kare sayisi (zaman haritasi boyu)."""
    import blender_film as F
    yol = os.path.abspath(yol if os.path.isabs(yol) or os.path.exists(yol) else os.path.join(ADDON, yol))
    with open(yol, "rb") as fh:
        ham = fh.read()
    sen = json.loads(ham.decode("utf-8"))
    toplam = len(F.zaman_haritasi(sen))
    parcalar = sen.get("parcalar") or {}
    if parcalar:
        bolumler = sorted(((ad, a, b) for ad, (a, b) in parcalar.items()), key=lambda x: x[1])
        beklenen = 1
        for ad, a, b in bolumler:
            if a != beklenen or b < a:
                raise SystemExit("HATA: %s parcalar bitisik degil (%s %d-%d)" % (yol, ad, a, b))
            beklenen = b + 1
        if beklenen != toplam + 1:
            raise SystemExit("HATA: %s parcalar %d'de bitiyor, film %d kare" % (yol, beklenen - 1, toplam))
    else:
        bolumler = [("tum", 1, toplam)]
    return {"kok": os.path.splitext(os.path.basename(yol))[0], "yol": yol, "toplam": toplam,
            "fps": sen.get("fps", 24), "cozunurluk": list(sen.get("cozunurluk", [1920, 1080])),
            "bolumler": bolumler, "sha256": hashlib.sha256(ham).hexdigest()}


def senaryolar(liste=None):
    return [senaryo_bilgi(y) for y in (liste or FILM)]


def bloklar(bilgiler, blok=BLOK):
    """Butun filmin bloklari, CIZIM SIRASIYLA: [(kok, a, b, bolum), ...].
    Bloklar bolum sinirini asmaz (Part 1 bloku Part 2'ye tasmaz)."""
    cikti = []
    for s in bilgiler:
        for ad, a, b in s["bolumler"]:
            for x in range(a, b + 1, blok):
                cikti.append((s["kok"], x, min(b, x + blok - 1), ad))
    return cikti


def dagit(bloklar_, n):
    """Serpistirilmis dagitim: k. blok -> k mod n. iscisi.
    Agir sahneler (ardisik kareler) boylece n isciye yayilir; her iscinin
    listesi cizim sirasinda kaldigi icin hepsi once Part 1'i bitirir."""
    if n < 1:
        raise SystemExit("HATA: isci sayisi en az 1")
    liste = [[] for _ in range(n)]
    for i, b in enumerate(bloklar_):
        liste[i % n].append(b)
    return liste


def sikistir(kareler):
    """[1,2,3,7,8] -> [(1,3),(7,8)]"""
    cikti = []
    for f in sorted(set(kareler)):
        if cikti and f == cikti[-1][1] + 1:
            cikti[-1][1] = f
        else:
            cikti.append([f, f])
    return [tuple(x) for x in cikti]


def aralik_metin(araliklar):
    return ",".join("%d-%d" % (a, b) if a != b else "%d" % a for a, b in araliklar)


def aralik_coz(metin):
    """"1-10,21-30,40" -> [(1,10),(21,30),(40,40)]"""
    cikti = []
    for p in metin.split(","):
        p = p.strip()
        if not p:
            continue
        a, _, b = p.partition("-")
        a, b = int(a), int(b or a)
        if b < a:
            raise SystemExit("HATA: ters aralik %s" % p)
        cikti.append((a, b))
    return cikti


def bolum_bul(bilgi, f):
    for ad, a, b in bilgi["bolumler"]:
        if a <= f <= b:
            return ad
    return None


def paket_yolu(kok, a, b, uzanti):
    return "%s/%s/%04d-%04d.%s" % (DEPO_KLASOR, kok, a, b, uzanti)


# ============================================================
# 2. PAKETLEME (kayipsiz, dogrulamali)
# ============================================================
KODEKLER = {
    "x264rgb-crf0": ["-c:v", "libx264rgb", "-preset", "veryslow", "-crf", "0", "-pix_fmt", "rgb24"],
    "ffv1-bgra": ["-c:v", "ffv1", "-level", "3", "-coder", "1", "-context", "1", "-slicecrc", "1",
                  "-g", "1", "-pix_fmt", "bgra"],
}
KODEK_SIRA = ["x264rgb-crf0", "ffv1-bgra"]


def png_rgba(yol):
    """(genislik, yukseklik, RGBA baytlari) -- PIL ile, bozuk dosyada hata."""
    from PIL import Image
    with Image.open(yol) as im:
        im.load()
        return im.size[0], im.size[1], im.convert("RGBA").tobytes()


def md5(b):
    return hashlib.md5(b).hexdigest()


def kare_gecerli(yol, cozunurluk=None):
    """Bos (Blender yer tutucusu), yarim yazilmis ya da yanlis boyutlu kare gecersiz."""
    try:
        if os.path.getsize(yol) == 0:
            return False
        w, h, _ = png_rgba(yol)
        return cozunurluk is None or [w, h] == list(cozunurluk)
    except Exception:
        return False


def paket_kareleri(paket, w, h):
    """Paketi ffmpeg ile RGBA'ya acar, kare kare RGBA baytlari verir."""
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", paket, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    boy = w * h * 4
    try:
        while True:
            b = p.stdout.read(boy)
            if not b:
                break
            if len(b) != boy:
                raise RuntimeError("yarim kare: %d/%d bayt" % (len(b), boy))
            yield b
    finally:
        p.stdout.close()
        hata = p.stderr.read().decode("utf-8", "replace")
        p.stderr.close()
        if p.wait() != 0:
            raise RuntimeError("ffmpeg acamadi: %s" % hata.strip()[-300:])


def paket_md5(paket, w, h):
    return [md5(b) for b in paket_kareleri(paket, w, h)]


def paketle(kare_klasor, a, b, fps, cikti, kodekler=None):
    """kare_klasor/aaaa.png .. bbbb.png -> cikti (.mkv). Kunye sozlugu doner.
    Her kodek denenir, paket GERI ACILIP her kare piksel piksel karsilastirilir;
    tutanlarin EN KUCUGU kalir (tek 1080p karede FFV1, ardisik karelerde
    x264rgb kucuk cikiyor -- blok basina olculur). Hicbiri tutmazsa hata."""
    md5ler, boyut = [], None
    for f in range(a, b + 1):
        w, h, rgba = png_rgba(os.path.join(kare_klasor, "%04d.png" % f))
        if boyut and boyut != [w, h]:
            raise RuntimeError("kare %d boyutu farkli: %s / %s" % (f, [w, h], boyut))
        boyut = [w, h]
        md5ler.append(md5(rgba))
    tutan, tutmayan = [], []
    for kodek in kodekler or KODEK_SIRA:
        gecici = "%s.%s.mkv" % (cikti, kodek)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-start_number", str(a),
                        "-i", os.path.join(kare_klasor, "%04d.png"), "-frames:v", str(b - a + 1)]
                       + KODEKLER[kodek] + [gecici], check=True)
        try:
            acilan = paket_md5(gecici, *boyut)
        except RuntimeError as e:
            acilan = ["hata: %s" % e]
        if acilan == md5ler:
            tutan.append((os.path.getsize(gecici), kodek, gecici))
        else:
            tutmayan.append(kodek)
            os.remove(gecici)
    if not tutan:
        raise RuntimeError("hicbir kodek kayipsiz acilmadi (%s); paket ITILMEDI" % ", ".join(tutmayan))
    tutan.sort()
    for _, _, g in tutan[1:]:
        os.remove(g)
    bayt, kodek, g = tutan[0]
    os.replace(g, cikti)
    return {"surum": 1, "kareler": [a, b], "kodek": kodek, "boyut": boyut, "fps": fps,
            "piksel_md5": md5ler, "bayt": bayt, "kayipli_cikan": tutmayan}


def paket_ac(paket, kunye, hedef_klasor):
    """Paketi hedef_klasor/aaaa.png olarak acar; her kare kunyedeki md5 ile
    karsilastirilir (PNG'ye yazilip GERI OKUNARAK). Yazilan kare listesi."""
    a, b = kunye["kareler"]
    w, h = kunye["boyut"]
    os.makedirs(hedef_klasor, exist_ok=True)
    gecici = os.path.join(hedef_klasor, ".acilis_%d_%d" % (a, os.getpid()))
    os.makedirs(gecici, exist_ok=True)
    try:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", paket, "-pix_fmt", "rgba",
                        "-start_number", str(a), os.path.join(gecici, "%04d.png")], check=True)
        yazilan = []
        for i, f in enumerate(range(a, b + 1)):
            g = os.path.join(gecici, "%04d.png" % f)
            if not os.path.exists(g):
                raise RuntimeError("paket %d-%d: kare %d cikmadi" % (a, b, f))
            gw, gh, rgba = png_rgba(g)
            if [gw, gh] != [w, h] or md5(rgba) != kunye["piksel_md5"][i]:
                raise RuntimeError("paket %d-%d: kare %d kunyeyle AYNI DEGIL" % (a, b, f))
            yazilan.append(f)
        fazla = [x for x in os.listdir(gecici) if x not in {"%04d.png" % f for f in range(a, b + 1)}]
        if fazla:
            raise RuntimeError("paket %d-%d: fazladan kare %s" % (a, b, fazla[:3]))
        for f in yazilan:
            os.replace(os.path.join(gecici, "%04d.png" % f), os.path.join(hedef_klasor, "%04d.png" % f))
        return yazilan
    finally:
        for x in os.listdir(gecici):
            os.remove(os.path.join(gecici, x))
        os.rmdir(gecici)


# ============================================================
# 3. GIZLI DEPO (git, calisma agaci GEREKMEZ)
# ============================================================
def git(depo, *arg, girdi=None, ortam=None, kontrol=True):
    e = dict(os.environ)
    e.update(ortam or {})
    o = subprocess.run(["git", "-C", depo] + list(arg), input=girdi, capture_output=True, env=e)
    if kontrol and o.returncode != 0:
        raise RuntimeError("git %s: %s" % (" ".join(arg[:3]), o.stderr.decode("utf-8", "replace").strip()[-400:]))
    return o


def depo_hazirla(depo, uzak=DEPO_UZAK):
    """Klon yoksa KISMI ve CIPLAK klon (--bare --filter=blob:none): paketlerin
    hicbiri indirilmez, yalniz agaclar gelir. Depo GB'larca buyuse de isci
    yeniden basladiginda saniyeler surer. Varsa dokunmaz (normal klon da olur)."""
    if os.path.isdir(os.path.join(depo, ".git")) or os.path.exists(os.path.join(depo, "HEAD")):
        return depo
    os.makedirs(os.path.dirname(os.path.abspath(depo)) or ".", exist_ok=True)
    o = subprocess.run(["git", "clone", "-q", "--bare", "--filter=blob:none", uzak, depo], capture_output=True)
    if o.returncode != 0:            # sunucu kismi klonu desteklemiyorsa tam klon
        subprocess.run(["git", "clone", "-q", "--bare", uzak, depo], check=True)
    return depo


def uzak_guncelle(depo):
    """origin/main'i ceker; uc commit (depo bossa None)."""
    git(depo, "fetch", "-q", "origin", "+refs/heads/%s:%s" % (DAL, UZAK_REF))
    o = git(depo, "rev-parse", "-q", "--verify", UZAK_REF + "^{commit}", kontrol=False)
    return o.stdout.decode().strip() or None


def depodaki_paketler(depo, uc):
    """{kok: {(a, b): {"mkv": oid, "json": oid}}} -- yalniz IKISI DE olan paketler."""
    if not uc:
        return {}, {}
    o = git(depo, "ls-tree", "-r", uc, "--", DEPO_KLASOR + "/").stdout.decode()
    ham, yazilar = {}, {}
    for satir in o.splitlines():
        bas, _, yol = satir.partition("\t")
        oid = bas.split()[2]
        m = PAKET_AD.match(yol)
        if m:
            ham.setdefault(m.group(1), {}).setdefault((int(m.group(2)), int(m.group(3))), {})[m.group(4)] = oid
        elif yol.endswith("/yazilar.json"):
            yazilar[yol.split("/")[1]] = oid
    paket = {k: {ab: d for ab, d in v.items() if "mkv" in d and "json" in d} for k, v in ham.items()}
    return paket, yazilar


def biten_kareler(paketler, kok):
    s = set()
    for (a, b) in paketler.get(kok, {}):
        s.update(range(a, b + 1))
    return s


def bloblari_getir(depo, oidler):
    """Kismi klonda eksik bloblari TOPLU ceker (tek tek tembel cekim yuzlerce
    ag gidis-donusu demek)."""
    oidler = list(dict.fromkeys(oidler))
    if not oidler:
        return
    var = set(git(depo, "cat-file", "--batch-all-objects", "--batch-check=%(objectname)").stdout.decode().split())
    eksik = [o for o in oidler if o not in var]
    for i in range(0, len(eksik), 200):
        git(depo, "fetch", "-q", "--no-write-fetch-head", "origin", *eksik[i:i + 200])


def blob_oku(depo, oid):
    return git(depo, "cat-file", "blob", oid).stdout


def blob_yaz(depo, oid, hedef):
    with open(hedef, "wb") as fh:
        p = subprocess.run(["git", "-C", depo, "cat-file", "blob", oid], stdout=fh, stderr=subprocess.PIPE)
    if p.returncode != 0:
        raise RuntimeError("blob %s okunamadi: %s" % (oid, p.stderr.decode()[-200:]))


def kunyeler(depo, paketler):
    """{(kok, a, b): kunye sozlugu}"""
    oidler = [(k, ab, d["json"]) for k, v in paketler.items() for ab, d in v.items()]
    bloblari_getir(depo, [o for _, _, o in oidler])
    if not oidler:
        return {}
    girdi = "".join(o + "\n" for _, _, o in oidler).encode()
    cikti = git(depo, "cat-file", "--batch", girdi=girdi).stdout
    sonuc, i = {}, 0
    for k, (a, b), oid in oidler:
        bas_son = cikti.index(b"\n", i)
        boy = int(cikti[i:bas_son].split()[2])
        govde = cikti[bas_son + 1:bas_son + 1 + boy]
        i = bas_son + 1 + boy + 1
        sonuc[(k, a, b)] = json.loads(govde.decode("utf-8"))
    return sonuc


ITME_BEKLE = [2, 4, 8, 16, 32, 60, 60, 60, 60, 60]


def gonder(depo, dosyalar, mesaj, gerekli_mi=None, kimlik=("cizim-isci", "cizim-isci@localhost")):
    """dosyalar {depodaki_yol: yerel_dosya} -> origin/main'e TEK commit.
    Calisma agaci kullanmaz: gecici index + commit-tree. Itme reddedilirse
    (baska isci once itti) fetch edip YENI UCUN USTUNE yeniden kurar ve
    dener (rebase ile ayni sonuc, catisma cikamaz: her isci farkli dosya
    yaziyor). gerekli_mi(paketler, yazilar) -> {yol: dosya} ya da {} (bu
    arada baskasi ayni kareleri ittiyse bos doner, hic itilmez).
    Donus: itilen commit (ya da None)."""
    ortam = {"GIT_AUTHOR_NAME": kimlik[0], "GIT_AUTHOR_EMAIL": kimlik[1],
             "GIT_COMMITTER_NAME": kimlik[0], "GIT_COMMITTER_EMAIL": kimlik[1]}
    for deneme, bekle in enumerate(ITME_BEKLE + [None]):
        uc = uzak_guncelle(depo)
        istenen = dosyalar
        if gerekli_mi:
            istenen = gerekli_mi(*depodaki_paketler(depo, uc))
            if not istenen:
                return None
        index = os.path.join(git(depo, "rev-parse", "--absolute-git-dir").stdout.decode().strip(),
                             "cizim_index_%d" % os.getpid())
        oi = dict(ortam, GIT_INDEX_FILE=index)
        try:
            if uc:
                git(depo, "read-tree", uc, ortam=oi)
            else:
                git(depo, "read-tree", "--empty", ortam=oi)
            for yol, yerel in sorted(istenen.items()):
                oid = git(depo, "hash-object", "-w", yerel).stdout.decode().strip()
                git(depo, "update-index", "--add", "--cacheinfo", "100644,%s,%s" % (oid, yol), ortam=oi)
            # --missing-ok: kismi klonda paket bloblari yerelde yok; onlari
            # indirmeye kalkmasin
            agac = git(depo, "write-tree", "--missing-ok", ortam=oi).stdout.decode().strip()
        finally:
            if os.path.exists(index):
                os.remove(index)
        ebeveyn = ["-p", uc] if uc else []
        commit = git(depo, "commit-tree", agac, *ebeveyn, "-m", mesaj, ortam=ortam).stdout.decode().strip()
        kanca = os.environ.get("CIZIM_ITME_KANCASI")      # yalniz test: itmeden once yarisi kurar
        if kanca:
            subprocess.run(kanca, shell=True, check=False)
        o = git(depo, "push", "-q", "origin", "%s:refs/heads/%s" % (commit, DAL), kontrol=False)
        if o.returncode == 0:
            git(depo, "update-ref", UZAK_REF, commit)
            return commit
        if bekle is None:
            raise RuntimeError("itme %d kez reddedildi: %s" % (deneme + 1, o.stderr.decode()[-300:]))
        log("itme reddedildi (deneme %d), %d sn sonra fetch + yeniden: %s"
            % (deneme + 1, bekle, o.stderr.decode().strip().splitlines()[-1:] or ""))
        time.sleep(bekle + (os.getpid() % 7) * 0.3)


def girdi_ozeti():
    """Cizimi etkileyen klasorlerin git agac ozeti + kirli mi."""
    parca = []
    for k in GIRDI_KLASORLER:
        o = subprocess.run(["git", "-C", KOK, "rev-parse", "HEAD:" + k], capture_output=True)
        parca.append(k + "=" + o.stdout.decode().strip())
    kirli = subprocess.run(["git", "-C", KOK, "status", "--porcelain", "--"] + GIRDI_KLASORLER,
                           capture_output=True).stdout.decode().strip() != ""
    commit = subprocess.run(["git", "-C", KOK, "rev-parse", "HEAD"], capture_output=True).stdout.decode().strip()
    girdi = os.environ.get("CIZIM_GIRDI") or hashlib.sha256("\n".join(parca).encode()).hexdigest()[:16]  # ortam: yalniz test
    return {"girdi": girdi, "kirli": kirli, "kanal_commit": commit}


def log(*parca):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *parca, flush=True)
