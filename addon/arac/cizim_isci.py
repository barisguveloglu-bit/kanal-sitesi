"""Film cizim iscisi: bir bulut oturumunda calisir.

    python3 addon/arac/cizim_isci.py --isci 3/12 [--depo D] [--calisma C] --arka
    python3 addon/arac/cizim_isci.py --bekle [--calisma C] [--dakika 100]

    # yeniden dagitim (cizim_dagit.py eksik ... uretir):
    python3 addon/arac/cizim_isci.py --is bolum1_orman:1-10,121-130 --is bolum1_oda:1-30 --arka

Ne yapar:
  1. arac_kur.sh ile Blender + MCprep'i kurar (kuruluysa hicbir sey indirmez).
  2. Gizli depoyu (barisguveloglu-bit/already-exists) KISMI klonlar
     (--bare --filter=blob:none): baskalarinin paketleri indirilmez.
  3. Kendine dusen bloklari (cizim_ortak.dagit: serpistirilmis, Part 1
     once) sirayla cizer. Her bloktan once depoya bakar: kareleri zaten
     itilmisse ATLAR (kaldigi yerden devam; makine geri alinip yeni
     makinede baslasa da ayni komut yeter).
  4. Her blok bitince kareleri KAYIPSIZ paketler (cizim_ortak.paketle),
     geri acip piksel piksel karsilastirir, gizli depoya iter. Itme
     reddedilirse fetch + yeni ucun ustune yeniden kurar.
  5. Itilen bloğun PNG'lerini siler (disk dolmasin).

KALITE KILIDI: Blender'a --ayar VERILMEZ (senaryonun kendi tam kalite ayari:
1920x1080, 4096 ornek uyarlamali). Ciziken kare boyutu senaryonun
cozunurlugunden farkliysa isci durur -- onizleme karesi depoya giremez.

Blender'in yer tutucusu: use_placeholder cizime baslarken 0 baytlik dosya
yazar. Isci kesilirse o bos dosya kalir ve use_overwrite=False yuzunden
Blender onu bir daha CIZMEZ. Bu yuzden her cizimden once o araliktaki bos /
bozuk / yanlis boyutlu kareler silinir.

--arka: isciyi oturumdan bagimsiz (setsid) baslatir, kaydi <calisma>/isci.log.
--bekle: isci bitene ya da --dakika dolana kadar bekler; son durumu yazar:
   DURUM: BITTI      butun bloklar depoda
   DURUM: CALISIYOR  sure doldu, isci hala ciziyor (yeniden --bekle)
   DURUM: DURDU      isci bitmeden oldu (ayni --arka komutuyla yeniden baslat)
"""
import argparse
import json
import os
import signal
import socket
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cizim_ortak as O  # noqa: E402
from cizim_ortak import log  # noqa: E402

VARSAYILAN_DEPO = os.path.expanduser("~/cizim_depo")
VARSAYILAN_CALISMA = "/tmp/cizim"
CIZIM_DENEME = 3            # ayni araligi en cok kac kez Blender'a ver


def araclari_hazirla(kurma):
    """BLENDER ve MCPREP_DOKU ortam degiskenlerini hazirlar."""
    if not kurma:
        subprocess.run(["bash", os.path.join(O.ADDON, "arac", "arac_kur.sh")], check=True)
        dosya = os.path.join(os.environ.get("ARAC_KOK", "/opt/araclar"), "film_araclari.sh")
        if os.path.exists(dosya):
            for satir in open(dosya, encoding="utf-8"):
                if satir.startswith("export ") and "=" in satir:
                    ad, _, deger = satir[7:].strip().partition("=")
                    os.environ.setdefault(ad, deger.strip('"'))
    if not os.environ.get("BLENDER") or not os.path.exists(os.environ["BLENDER"]):
        raise SystemExit("HATA: BLENDER yok (arac_kur.sh calisti mi?)")


def isleri_kur(arg, bilgiler):
    """[(bilgi, a, b)] -- cizim sirasiyla."""
    adlar = {b["kok"]: b for b in bilgiler}
    if arg.is_:
        isler = []
        for t in arg.is_:
            kok, _, araliklar = t.partition(":")
            kok = os.path.splitext(os.path.basename(kok))[0]
            if kok not in adlar:
                raise SystemExit("HATA: senaryo yok: %s (bilinenler: %s)" % (kok, ", ".join(adlar)))
            for a, b in O.aralik_coz(araliklar):
                if a < 1 or b > adlar[kok]["toplam"]:
                    raise SystemExit("HATA: %s %d-%d film disinda (1-%d)" % (kok, a, b, adlar[kok]["toplam"]))
                for x in range(a, b + 1, arg.blok):
                    isler.append((adlar[kok], x, min(b, x + arg.blok - 1)))
        return isler
    k, _, n = arg.isci.partition("/")
    k, n = int(k), int(n)
    if not 1 <= k <= n:
        raise SystemExit("HATA: --isci k/N, 1 <= k <= N olmali")
    return [(adlar[kok], a, b) for kok, a, b, _ in O.dagit(O.bloklar(bilgiler, arg.blok), n)[k - 1]]


def eski_kareleri_temizle(kare):
    """Yerelde kalan kareler BASKA bir girdiyle (kod/senaryo/doku) cizildiyse
    siler. Yoksa isci yeniden basladiginda eski kodla cizilmis gecerli
    kareleri "zaten var" sayip pakete koyar. (v1 tam kalite ciziminde kagit
    hatasi duzeltilip isci yeniden baslatilacakti; yerelde eski kodla
    cizilmis 1-9. kareler duruyordu -- elle silindi, artik isci siliyor.)"""
    gk = O.girdi_ozeti()
    imza = gk["girdi"] + ("+kirli" if gk["kirli"] else "")
    yol = os.path.join(kare, ".girdi")
    onceki = open(yol, encoding="utf-8").read().strip() if os.path.exists(yol) else None
    if onceki == imza:
        return
    eskiler = [x for x in os.listdir(kare) if x.endswith(".png")]
    if eskiler and onceki is not None:
        log("yereldeki %d kare baska girdiyle cizilmis (%s -> %s): siliniyor" % (len(eskiler), onceki, imza))
    elif eskiler:
        log("yereldeki %d karenin girdisi bilinmiyor: siliniyor" % len(eskiler))
    for x in eskiler:
        os.remove(os.path.join(kare, x))
    with open(yol, "w", encoding="utf-8") as fh:
        fh.write(imza + "\n")


def ciz(bilgi, a, b, calisma):
    """a..b karelerini Blender ile cizer (eksik olanlari). (sure_sn, cizilen)"""
    klasor = os.path.join(calisma, bilgi["kok"])
    kare = os.path.join(klasor, "kare")
    os.makedirs(kare, exist_ok=True)
    eski_kareleri_temizle(kare)
    for deneme in range(CIZIM_DENEME):
        eksik = []
        for f in range(a, b + 1):
            p = os.path.join(kare, "%04d.png" % f)
            if not O.kare_gecerli(p, bilgi["cozunurluk"]):
                if os.path.exists(p):
                    os.remove(p)          # yer tutucu / yarim / yanlis boyut
                eksik.append(f)
        if not eksik:
            return
        komut = [os.environ["BLENDER"], "-b", "-P", os.path.join(O.ADDON, "arac", "blender_film.py"), "--",
                 bilgi["yol"], klasor, "--aralik", "%d-%d" % (min(eksik), max(eksik))]
        kayit = os.path.join(klasor, "blender_%04d-%04d.log" % (a, b))
        log("ciziliyor %s %d-%d (%d kare)%s" % (bilgi["kok"], min(eksik), max(eksik), len(eksik),
                                               "" if deneme == 0 else ", deneme %d" % (deneme + 1)))
        t0 = time.time()
        with open(kayit, "wb") as fh:
            kod = subprocess.run(komut, stdout=fh, stderr=subprocess.STDOUT).returncode
        sure = time.time() - t0
        if kod != 0:
            log("Blender cikis kodu %d; son satirlar:" % kod)
            sys.stdout.write("".join(open(kayit, encoding="utf-8", errors="replace").readlines()[-15:]))
        yeni = [f for f in eksik if O.kare_gecerli(os.path.join(kare, "%04d.png" % f), bilgi["cozunurluk"])]
        ciz.olcum = (ciz.olcum[0] + sure, ciz.olcum[1] + len(yeni))
    kalan = [f for f in range(a, b + 1) if not O.kare_gecerli(os.path.join(kare, "%04d.png" % f), bilgi["cozunurluk"])]
    if kalan:
        raise SystemExit("HATA: %s %d-%d: %d deneme sonra %d kare cizilemedi (ilk %s); bkz. %s"
                         % (bilgi["kok"], a, b, CIZIM_DENEME, len(kalan), kalan[:5], kayit))


ciz.olcum = (0.0, 0)


def blok_isle(bilgi, a, b, arg, ozet):
    kok = bilgi["kok"]
    uc = O.uzak_guncelle(arg.depo)
    paketler, _ = O.depodaki_paketler(arg.depo, uc)
    biten = O.biten_kareler(paketler, kok)
    eksik = [f for f in range(a, b + 1) if f not in biten]
    if not eksik:
        log("atlandi %s %d-%d (depoda var)" % (kok, a, b))
        ozet["atlanan"] += b - a + 1
        return
    for x, y in O.sikistir(eksik):
        ciz.olcum = (0.0, 0)
        ciz(bilgi, x, y, arg.calisma)
        sure, cizilen = ciz.olcum
        paket_klasor = os.path.join(arg.calisma, "paket")
        os.makedirs(paket_klasor, exist_ok=True)
        mkv = os.path.join(paket_klasor, "%s_%04d-%04d.mkv" % (kok, x, y))
        kunye = O.paketle(os.path.join(arg.calisma, kok, "kare"), x, y, bilgi["fps"], mkv)
        if kunye["boyut"] != bilgi["cozunurluk"]:
            raise SystemExit("HATA: kare boyutu %s, senaryo %s -- tam kalite degil, ITILMEDI"
                             % (kunye["boyut"], bilgi["cozunurluk"]))
        kunye.update({"senaryo": kok, "senaryo_sha256": bilgi["sha256"], "isci": arg.kimlik,
                      "makine": socket.gethostname(), "cizim_sn": round(sure, 1), "cizilen": cizilen,
                      "bitis": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
        kunye.update(O.girdi_ozeti())
        kunye_yol = mkv[:-4] + ".json"
        with open(kunye_yol, "w", encoding="utf-8") as fh:
            json.dump(kunye, fh, ensure_ascii=False, indent=1)
        dosyalar = {O.paket_yolu(kok, x, y, "mkv"): mkv, O.paket_yolu(kok, x, y, "json"): kunye_yol}
        yazilar = os.path.join(arg.calisma, kok, "yazilar.json")
        yazilar_yol = "%s/%s/yazilar.json" % (O.DEPO_KLASOR, kok)

        def gerekli_mi(paketler, depo_yazilar):
            if all(f in O.biten_kareler(paketler, kok) for f in range(x, y + 1)):
                return {}                 # bu arada baskasi itti
            d = dict(dosyalar)
            if kok not in depo_yazilar and os.path.exists(yazilar):
                d[yazilar_yol] = yazilar
            return d
        commit = O.gonder(arg.depo, dosyalar, "cizim: %s %04d-%04d (isci %s, %s, %.1f MB)"
                          % (kok, x, y, arg.kimlik, kunye["kodek"], kunye["bayt"] / 1e6), gerekli_mi)
        if commit:
            log("itildi %s %d-%d  %s  %.2f MB/kare  %s  %s"
                % (kok, x, y, kunye["kodek"], kunye["bayt"] / 1e6 / (y - x + 1),
                   "%.0f sn/kare" % (sure / cizilen) if cizilen else "", commit[:10]))
            ozet["itilen"] += y - x + 1
        else:
            log("itilmedi %s %d-%d: baska isci ayni kareleri itmis" % (kok, x, y))
        for f in range(x, y + 1):
            p = os.path.join(arg.calisma, kok, "kare", "%04d.png" % f)
            if os.path.exists(p):
                os.remove(p)
        os.remove(mkv)
        os.remove(kunye_yol)


def calis(arg):
    os.makedirs(arg.calisma, exist_ok=True)
    bitti = os.path.join(arg.calisma, "BITTI")
    if os.path.exists(bitti):
        os.remove(bitti)
    araclari_hazirla(arg.kurma)
    bilgiler = O.senaryolar(arg.senaryolar.split(",") if arg.senaryolar else None)
    isler = isleri_kur(arg, bilgiler)
    O.depo_hazirla(arg.depo, arg.uzak)
    gk = O.girdi_ozeti()
    log("isci %s: %d blok, %d kare; kanal %s%s; depo %s"
        % (arg.kimlik, len(isler), sum(b - a + 1 for _, a, b in isler), gk["kanal_commit"][:10],
           " (KIRLI calisma agaci)" if gk["kirli"] else "", arg.depo))
    ozet = {"itilen": 0, "atlanan": 0}
    for i, (bilgi, a, b) in enumerate(isler):
        log("blok %d/%d: %s %d-%d" % (i + 1, len(isler), bilgi["kok"], a, b))
        blok_isle(bilgi, a, b, arg, ozet)
    with open(bitti, "w", encoding="utf-8") as fh:
        json.dump(dict(ozet, isci=arg.kimlik, bloklar=len(isler)), fh)
    log("BITTI: %d kare itildi, %d kare zaten depodaydi" % (ozet["itilen"], ozet["atlanan"]))


def canli(pid):
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    try:                                   # zombi (olmus ama toplanmamis) canli sayilmaz
        with open("/proc/%d/stat" % pid) as fh:
            return fh.read().split(")")[-1].split()[0] != "Z"
    except OSError:
        return True


def pid_oku(calisma):
    try:
        return int(open(os.path.join(calisma, "isci.pid")).read().strip())
    except (OSError, ValueError):
        return None


def arka(arg, argv):
    os.makedirs(arg.calisma, exist_ok=True)
    pid = pid_oku(arg.calisma)
    if pid and canli(pid):
        print("isci zaten calisiyor (pid %d); --bekle ile izle" % pid)
        return
    komut = [sys.executable, os.path.abspath(__file__)] + [x for x in argv if x != "--arka"]
    kayit = open(os.path.join(arg.calisma, "isci.log"), "ab")
    p = subprocess.Popen(komut, stdout=kayit, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                         start_new_session=True, cwd=O.KOK)
    with open(os.path.join(arg.calisma, "isci.pid"), "w") as fh:
        fh.write(str(p.pid))
    print("isci baslatildi: pid %d, kayit %s" % (p.pid, os.path.join(arg.calisma, "isci.log")))


def bekle(arg):
    son = time.time() + arg.dakika * 60
    pid = pid_oku(arg.calisma)
    while pid and canli(pid) and time.time() < son:
        time.sleep(min(30, max(1, son - time.time())))
    kayit = os.path.join(arg.calisma, "isci.log")
    satirlar = open(kayit, encoding="utf-8", errors="replace").readlines()[-15:] if os.path.exists(kayit) else []
    sys.stdout.write("".join(satirlar))
    if os.path.exists(os.path.join(arg.calisma, "BITTI")):
        print("DURUM: BITTI")
    elif pid and canli(pid):
        print("DURUM: CALISIYOR")
    else:
        print("DURUM: DURDU (ayni --arka komutuyla yeniden baslat; kaldigi yerden devam eder)")


def main(argv):
    p = argparse.ArgumentParser(description="film cizim iscisi")
    p.add_argument("--isci", help="k/N: serpistirilmis plandaki k. isci")
    p.add_argument("--is", dest="is_", action="append", help="senaryo:a-b,c-d (yeniden dagitim)")
    p.add_argument("--blok", type=int, default=O.BLOK)
    p.add_argument("--senaryolar", help="virgullu senaryo listesi (varsayilan: %s)" % ",".join(O.FILM))
    p.add_argument("--depo", default=VARSAYILAN_DEPO, help="gizli deponun yerel klonu (yoksa kismi klonlanir)")
    p.add_argument("--uzak", default=O.DEPO_UZAK)
    p.add_argument("--calisma", default=VARSAYILAN_CALISMA)
    p.add_argument("--kurma", action="store_true", help="arac_kur.sh'i calistirma (BLENDER zaten hazir)")
    p.add_argument("--arka", action="store_true")
    p.add_argument("--bekle", action="store_true")
    p.add_argument("--dakika", type=float, default=100)
    arg = p.parse_args(argv)
    arg.calisma = os.path.abspath(arg.calisma)
    arg.depo = os.path.abspath(arg.depo)
    if arg.bekle:
        return bekle(arg)
    if not arg.isci and not arg.is_:
        p.error("--isci k/N ya da --is gerekli")
    arg.kimlik = arg.isci or "ek-%s" % socket.gethostname()[:12]
    if arg.arka:
        return arka(arg, argv)
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    calis(arg)


if __name__ == "__main__":
    main(sys.argv[1:])
