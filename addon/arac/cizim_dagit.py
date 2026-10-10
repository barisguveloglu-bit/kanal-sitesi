"""Dagitik film cizimi -- koordinator.

    python3 addon/arac/cizim_dagit.py plan  --isci 12 [--blok 10]
    python3 addon/arac/cizim_dagit.py istem --isci 12 [--no 3] [--commit HASH]
    python3 addon/arac/cizim_dagit.py durum --depo ~/cizim_depo [--isci 12]
    python3 addon/arac/cizim_dagit.py eksik --depo ~/cizim_depo --yeni 4 [--isci 12 --sadece 3,7]

plan   Bloklari N isciye boler (cizim_ortak.dagit): 10 karelik bloklar,
       k. blok -> k mod N. isci. Agir sahneler ardisik kareler oldugu
       icin boylece N isciye yayilir; her iscinin listesi cizim sirasinda
       (Part 1 -> Part 2 -> oda), yani hepsi once Part 1'i bitirir.
istem  Her isci icin bulut oturumuna verilecek TAM metin.
durum  Gizli depodaki paketlerden ilerleme: bolum bolum biten/eksik,
       isci isci son paket, sn/kare, tahmini bitis; senaryo ya da girdi
       karisimi varsa UYARI. (--isci N verilirse eksik bloklar plandaki
       sahibine baglanir: "isci 7 sessiz" -> o oturum olmus olabilir.)
eksik  Depoda olmayan kareleri --yeni M isciye yeniden dagitir (yine
       serpistirilmis); her biri icin cizim_isci.py --is ... komutu ve
       istem metni. --sadece k1,k2 (+ --isci N): yalniz o iscilerin
       bloklari (calisan iscilerin isini ikilememek icin).
--json: makine okunur cikti (test bunu kullaniyor).
"""
import argparse
import calendar
import json
import os
import statistics
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cizim_ortak as O  # noqa: E402

KANAL_DAL = "claude/v7-94-0-system-scan-fixes-7xc4ex"


# ------------------------------------------------------------
def plan_kur(bilgiler, n, blok):
    return O.dagit(O.bloklar(bilgiler, blok), n)


def isci_ozet(liste):
    toplam = sum(b - a + 1 for _, a, b, _ in liste)
    p1 = sum(b - a + 1 for _, a, b, bol in liste if bol == "part1")
    return toplam, p1


def plan_cmd(arg, bilgiler):
    plan = plan_kur(bilgiler, arg.isci, arg.blok)
    if arg.json:
        print(json.dumps([[list(x) for x in liste] for liste in plan]))
        return
    tum = sum(s["toplam"] for s in bilgiler)
    print("film: %s  = %d kare, blok %d, %d isci" % (
        " + ".join("%s %d" % (s["kok"], s["toplam"]) for s in bilgiler), tum, arg.blok, arg.isci))
    for k, liste in enumerate(plan, 1):
        toplam, p1 = isci_ozet(liste)
        ilk = ", ".join("%s:%d-%d" % (kok, a, b) for kok, a, b, _ in liste[:3])
        print("  isci %2d/%d: %3d blok, %4d kare (Part 1: %3d)  ilk: %s ..." % (k, arg.isci, len(liste), toplam, p1, ilk))


# ------------------------------------------------------------
ISTEM = """Bu oturum, Minecraft animasyon serisi 1. bolum filminin TAM KALITE cizim iscisi ({kimlik}).
Gorevin: asagidaki betigi calistirip bitene kadar ayakta tutmak. Kod yazma, dosya duzenleme, commit yok.

1. Gizli cikti deposunu oturuma ekle: add_repo araci, owner "barisguveloglu-bit", repo "already-exists", access "push".
   Klonlama: betik kendisi KISMI klon yapar (~/cizim_depo). add_repo'nun verdigi adres
   https://github.com/barisguveloglu-bit/already-exists degilse betige --uzak <adres> ekle.
2. kanal-sitesi deposunun kokunde (genelde /home/user/kanal-sitesi) dogru surume gec:
   git fetch origin {dal} && git checkout --detach {commit}
3. Isciyi arka planda baslat (Blender + MCprep'i arac_kur.sh ile kendisi kurar, ilk seferde birkac dakika):
   python3 addon/arac/cizim_isci.py {isler} --arka
4. Bekleme dongusu: Bash aracini run_in_background=true ve timeout=7200000 ile calistir:
   python3 addon/arac/cizim_isci.py --bekle --dakika 100
   Komut bitince ciktinin SON satirina bak:
   - "DURUM: CALISIYOR" -> ayni bekleme komutunu yeniden baslat (son 2-3 satiri tek cumleyle ozetle).
   - "DURUM: DURDU" -> ustteki hatayi oku. Gecici bir hataysa (ag, itme, makine yeniden basladi) 3. adimi
     AYNEN tekrarla: depoda olan bloklar atlanir, kaldigi yerden devam eder. Ayni hata iki kez ust uste
     gelirse dur ve hatayi aynen raporla.
   - "DURUM: BITTI" -> "isci {kimlik} bitti" + BITTI satirini raporla ve bitir.
   Turunu isci bitmeden BITIRME: oturum bosta kalirsa makine geri alinir ve cizilmekte olan blok kaybolur
   (itilmis bloklar gizli depoda guvende).
5. Yeni bir makinede/oturumda devam ediyorsan 1-3. adimlari aynen tekrarla; ayni komut kaldigi yerden surer.

YASAKLAR (kullanicinin kesin kurallari):
- blender_film.py'ye --ayar verme; ornek, cozunurluk, isik sekmesi DUSURME; "hizlandirilmis Cycles" deneme.
  Kaliteden hicbir odun yok: 1920x1080, 4096 ornek uyarlamali, senaryonun kendi ayari.
- kanal-sitesi deposuna HICBIR SEY commit/push etme. Kareler ve paketler yalniz gizli depoya gider (betik yapar);
  film yayindan once herkese acik depoda gorunmemeli.
- pkill -f / pgrep -f kullanma (kendi komut satirini eslestirip kendini oldurur); gerekirse /tmp/cizim/isci.pid'deki PID ile.
- Baska iscilerin oturumlarina ve gizli depodaki dosyalarina dokunma.
"""


def kanal_commit(istenen=None):
    c = istenen or subprocess.run(["git", "-C", O.KOK, "rev-parse", "HEAD"], capture_output=True,
                                  text=True).stdout.strip()
    uzak = subprocess.run(["git", "-C", O.KOK, "branch", "-r", "--contains", c], capture_output=True,
                          text=True).stdout
    if "origin/" not in uzak:
        print("UYARI: commit %s henuz itilmemis gorunuyor; isciler onu cekemez." % c[:10], file=sys.stderr)
    return c


def istem_metni(kimlik, isler, commit):
    return ISTEM.format(kimlik=kimlik, isler=isler, commit=commit, dal=KANAL_DAL)


def istem_cmd(arg, bilgiler):
    commit = kanal_commit(arg.commit)
    nolar = [arg.no] if arg.no else range(1, arg.isci + 1)
    for k in nolar:
        if len(nolar) > 1:
            print("=" * 20, "isci %d/%d" % (k, arg.isci), "=" * 20)
        ek = "" if arg.blok == O.BLOK else " --blok %d" % arg.blok
        print(istem_metni("isci %d/%d" % (k, arg.isci), "--isci %d/%d%s" % (k, arg.isci, ek), commit))


# ------------------------------------------------------------
def durum_topla(arg, bilgiler):
    O.depo_hazirla(arg.depo, arg.uzak)
    uc = O.uzak_guncelle(arg.depo)
    paketler, yazilar = O.depodaki_paketler(arg.depo, uc)
    kunye = O.kunyeler(arg.depo, paketler)
    simdi = time.time()
    sonuc = {"uc": uc, "senaryolar": [], "isciler": {}, "uyarilar": []}
    for s in bilgiler:
        biten = O.biten_kareler(paketler, s["kok"])
        bol = []
        for ad, a, b in s["bolumler"]:
            eksik = [f for f in range(a, b + 1) if f not in biten]
            bol.append({"ad": ad, "aralik": [a, b], "biten": (b - a + 1) - len(eksik),
                        "eksik": [list(x) for x in O.sikistir(eksik)]})
        shalar = sorted({k.get("senaryo_sha256") for (kk, _, _), k in kunye.items() if kk == s["kok"]})
        if shalar and shalar != [s["sha256"]]:
            sonuc["uyarilar"].append("%s: paketler senaryonun %d farkli surumuyle cizilmis (simdiki %s)"
                                     % (s["kok"], len(shalar), s["sha256"][:10]))
        if biten and s["kok"] not in yazilar:
            sonuc["uyarilar"].append("%s: yazilar.json depoda yok" % s["kok"])
        sonuc["senaryolar"].append({"kok": s["kok"], "toplam": s["toplam"], "bolumler": bol})
    girdiler = sorted({(k.get("girdi"), k.get("kirli")) for k in kunye.values()})
    if len(girdiler) > 1:
        sonuc["uyarilar"].append("paketler %d farkli girdi durumuyla cizilmis (%s) -- kareler arasinda gorsel fark olabilir"
                                 % (len(girdiler), ", ".join("%s%s" % (g, "+kirli" if kr else "") for g, kr in girdiler)))
    elif girdiler and girdiler[0][1]:
        sonuc["uyarilar"].append("paketler KIRLI (commit'lenmemis degisiklikli) bir calisma agaciyla cizilmis")
    hiz = [k["cizim_sn"] / k["cizilen"] for k in kunye.values() if k.get("cizilen")]
    sn_kare = statistics.median(hiz) if hiz else None
    for (kok, a, b), k in kunye.items():
        i = sonuc["isciler"].setdefault(k.get("isci", "?"), {"paket": 0, "kare": 0, "son": 0})
        i["paket"] += 1
        i["kare"] += b - a + 1
        t = calendar.timegm(time.strptime(k["bitis"], "%Y-%m-%dT%H:%M:%SZ")) if k.get("bitis") else 0
        i["son"] = max(i["son"], t)
    # aktif: son paketi, tipik bir blok suresinin 3 katindan (en az 1 saat) yeni
    esik = max(3600, 3 * O.BLOK * (sn_kare or 900))
    for i in sonuc["isciler"].values():
        i["sessiz_sn"] = round(simdi - i["son"])
        i["aktif"] = i["sessiz_sn"] < esik
    aktif = sum(1 for i in sonuc["isciler"].values() if i["aktif"])
    kalan = sum(len(range(a, b + 1)) for s in sonuc["senaryolar"] for bo in s["bolumler"] for a, b in bo["eksik"])
    kalan_p1 = sum(b - a + 1 for s in sonuc["senaryolar"] for bo in s["bolumler"] if bo["ad"] == "part1"
                   for a, b in bo["eksik"])
    sonuc.update({"sn_kare": sn_kare, "aktif_isci": aktif, "kalan": kalan, "kalan_part1": kalan_p1})
    if sn_kare and (aktif or arg.isci):
        n = aktif or arg.isci
        sonuc["tahmin_sn"] = kalan * sn_kare / n
        sonuc["tahmin_part1_sn"] = kalan_p1 * sn_kare / n
    if arg.isci:                      # eksik bloklari plandaki sahibine bagla
        plan = plan_kur(bilgiler, arg.isci, arg.blok)
        sahip = {}
        for k, liste in enumerate(plan, 1):
            for kok, a, b, _ in liste:
                biten = O.biten_kareler(paketler, kok)
                if any(f not in biten for f in range(a, b + 1)):
                    sahip.setdefault(k, []).append([kok, a, b])
        sonuc["eksik_sahip"] = sahip
    return sonuc


def sure_yaz(sn):
    if sn is None:
        return "?"
    s = int(sn)
    return "%d sa %02d dk" % (s // 3600, s % 3600 // 60) if s >= 3600 else "%d dk" % (s // 60)


def durum_cmd(arg, bilgiler):
    d = durum_topla(arg, bilgiler)
    if arg.json:
        print(json.dumps(d, ensure_ascii=False))
        return
    print("gizli depo ucu: %s" % (d["uc"] or "(bos)")[:10])
    for s in d["senaryolar"]:
        for bo in s["bolumler"]:
            a, b = bo["aralik"]
            n = b - a + 1
            print("  %-14s %-5s %4d-%4d: %4d/%4d kare (%%%5.1f)  eksik: %s" % (
                s["kok"], bo["ad"], a, b, bo["biten"], n, 100.0 * bo["biten"] / n,
                O.aralik_metin([tuple(x) for x in bo["eksik"]])[:120] or "-"))
    print("isciler:")
    for ad, i in sorted(d["isciler"].items()):
        print("  %-10s %3d paket %4d kare, son paket %s once%s" % (
            ad, i["paket"], i["kare"], sure_yaz(i["sessiz_sn"]), "" if i["aktif"] else "  <- SESSIZ (oturum olmus olabilir)"))
    print("hiz: %s sn/kare (medyan), aktif isci %d" % ("%.0f" % d["sn_kare"] if d["sn_kare"] else "?", d["aktif_isci"]))
    print("kalan: %d kare (Part 1: %d); tahmini bitis: hepsi %s, Part 1 %s" % (
        d["kalan"], d["kalan_part1"], sure_yaz(d.get("tahmin_sn")), sure_yaz(d.get("tahmin_part1_sn"))))
    for k, liste in sorted(d.get("eksik_sahip", {}).items()):
        print("  plan isci %d/%d: %d blok eksik (ilk %s)" % (k, arg.isci, len(liste), "%s:%d-%d" % tuple(liste[0])))
    for u in d["uyarilar"]:
        print("UYARI:", u)


# ------------------------------------------------------------
def eksik_cmd(arg, bilgiler):
    O.depo_hazirla(arg.depo, arg.uzak)
    uc = O.uzak_guncelle(arg.depo)
    paketler, _ = O.depodaki_paketler(arg.depo, uc)
    if arg.sadece:
        if not arg.isci:
            raise SystemExit("HATA: --sadece icin --isci N (eski plan) gerekli")
        plan = plan_kur(bilgiler, arg.isci, arg.blok)
        hedef = [blk for k in O.aralik_coz(arg.sadece) for kk in range(k[0], k[1] + 1) for blk in plan[kk - 1]]
        hedef_kare = {(kok, f) for kok, a, b, _ in hedef for f in range(a, b + 1)}
    else:
        hedef_kare = None
    # eksik kareleri cizim sirasiyla bloklara bol, yeni iscilere serpistir
    yeni_bloklar = []
    for s in bilgiler:
        biten = O.biten_kareler(paketler, s["kok"])
        for ad, a, b in s["bolumler"]:
            eksik = [f for f in range(a, b + 1) if f not in biten
                     and (hedef_kare is None or (s["kok"], f) in hedef_kare)]
            for x, y in O.sikistir(eksik):
                for z in range(x, y + 1, arg.blok):
                    yeni_bloklar.append((s["kok"], z, min(y, z + arg.blok - 1), ad))
    dagilim = O.dagit(yeni_bloklar, arg.yeni) if yeni_bloklar else [[] for _ in range(arg.yeni)]
    isler = []
    for liste in dagilim:
        sira, grup = [], {}
        for kok, a, b, _ in liste:
            if kok not in grup:
                sira.append(kok)
                grup[kok] = []
            grup[kok].append((a, b))
        ek = "" if arg.blok == O.BLOK else " --blok %d" % arg.blok
        isler.append(" ".join("--is %s:%s" % (kok, O.aralik_metin(grup[kok])) for kok in sira) + ek)
    if arg.json:
        print(json.dumps({"bloklar": [[list(b) for b in liste] for liste in dagilim], "isler": isler}))
        return
    if not yeni_bloklar:
        print("eksik kare yok")
        return
    commit = kanal_commit(arg.commit)
    for k, (liste, komut) in enumerate(zip(dagilim, isler), 1):
        if not liste:
            continue
        print("=" * 20, "ek isci %d/%d: %d blok, %d kare" % (k, arg.yeni, len(liste), sum(b - a + 1 for _, a, b, _ in liste)), "=" * 20)
        print(istem_metni("ek isci %d/%d" % (k, arg.yeni), komut, commit))


def main(argv):
    p = argparse.ArgumentParser(description="film cizimi koordinatoru")
    p.add_argument("komut", choices=["plan", "istem", "durum", "eksik"])
    p.add_argument("--isci", type=int, help="plandaki isci sayisi N")
    p.add_argument("--no", type=int, help="istem: yalniz bu isci")
    p.add_argument("--yeni", type=int, default=1, help="eksik: kac yeni isciye dagitilsin")
    p.add_argument("--sadece", help="eksik: yalniz bu plan iscilerinin bloklari (orn. 3,7-9)")
    p.add_argument("--blok", type=int, default=O.BLOK)
    p.add_argument("--senaryolar")
    p.add_argument("--depo", default=os.path.expanduser("~/cizim_depo"))
    p.add_argument("--uzak", default=O.DEPO_UZAK)
    p.add_argument("--commit", help="iscilerin cekecegi kanal-sitesi commit'i (varsayilan HEAD)")
    p.add_argument("--json", action="store_true")
    arg = p.parse_args(argv)
    if arg.komut in ("plan", "istem") and not arg.isci:
        p.error("--isci N gerekli")
    arg.depo = os.path.abspath(arg.depo)
    bilgiler = O.senaryolar(arg.senaryolar.split(",") if arg.senaryolar else None)
    {"plan": plan_cmd, "istem": istem_cmd, "durum": durum_cmd, "eksik": eksik_cmd}[arg.komut](arg, bilgiler)


if __name__ == "__main__":
    main(sys.argv[1:])
