"""Gizli depodaki cizim paketlerini kare kare geri acar.

    python3 addon/arac/cizim_topla.py --hedef ~/film_kareleri [--depo ~/cizim_depo] [--senaryo bolum1_orman] [--aralik 1-1066]

Sonuc film_birlestir.py'nin bekledigi duzen:
    <hedef>/<senaryo>/kare/0001.png ...   (paketten acilip kunyedeki piksel
                                           md5'iyle KARSILASTIRILMIS)
    <hedef>/<senaryo>/yazilar.json
Eksik kare varsa listeler ve 1 ile cikar; tamsa birlestirme komutlarini yazar:
    python3 addon/arac/film_birlestir.py part1.mp4 <hedef>/bolum1_orman:addon/film/bolum1_orman.json:part1
    python3 addon/arac/film_birlestir.py part2.mp4 <hedef>/bolum1_orman:addon/film/bolum1_orman.json:part2 <hedef>/bolum1_oda:addon/film/bolum1_oda.json

Tekrar calistirilabilir: hedefte zaten olan ve md5'i tutan kare yeniden
acilmaz (--hizli: yalniz var mi diye bakar, md5 okumaz). Ayni kare iki
pakette varsa (yeniden dagitimda olabilir) ikisinin md5'i de karsilastirilir;
farkliysa UYARI (iki cizim ayni degil -- senaryo ya da arac degismis olabilir).
HEDEF HERKESE ACIK DEPONUN ICINDE OLAMAZ (film yayindan once gorunmemeli).
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cizim_ortak as O  # noqa: E402


def topla(arg):
    hedef = os.path.abspath(arg.hedef)
    if (hedef + os.sep).startswith(O.KOK + os.sep):
        raise SystemExit("HATA: hedef kanal-sitesi deposunun icinde (%s). Kareler herkese acik depoya giremez." % hedef)
    bilgiler = O.senaryolar(arg.senaryolar.split(",") if arg.senaryolar else None)
    if arg.senaryo:
        bilgiler = [b for b in bilgiler if b["kok"] == arg.senaryo]
        if not bilgiler:
            raise SystemExit("HATA: senaryo yok: %s" % arg.senaryo)
    O.depo_hazirla(arg.depo, arg.uzak)
    uc = O.uzak_guncelle(arg.depo)
    paketler, yazilar = O.depodaki_paketler(arg.depo, uc)
    kunye = O.kunyeler(arg.depo, paketler)
    eksik_toplam, uyarilar, sonuc = 0, [], {}
    for s in bilgiler:
        kok = s["kok"]
        a0, b0 = O.aralik_coz(arg.aralik)[0] if arg.aralik else (1, s["toplam"])
        klasor = os.path.join(hedef, kok)
        kare = os.path.join(klasor, "kare")
        os.makedirs(kare, exist_ok=True)
        if kok in yazilar:
            O.blob_yaz(arg.depo, yazilar[kok], os.path.join(klasor, "yazilar.json"))
        # kare -> (paket, kunye) ; cakisan karelerde md5 karsilastir
        sahip = {}
        for (a, b), d in sorted(paketler.get(kok, {}).items()):
            k = kunye[(kok, a, b)]
            if k["boyut"] != s["cozunurluk"]:
                uyarilar.append("%s %d-%d: boyut %s, senaryo %s -- ALINMADI" % (kok, a, b, k["boyut"], s["cozunurluk"]))
                continue
            if k.get("senaryo_sha256") != s["sha256"]:
                uyarilar.append("%s %d-%d: senaryonun baska bir surumuyle cizilmis" % (kok, a, b))
            for i, f in enumerate(range(a, b + 1)):
                if f in sahip and sahip[f][1] != k["piksel_md5"][i]:
                    uyarilar.append("%s kare %d: iki pakette FARKLI (%d-%d / %d-%d)" % (kok, f, *sahip[f][0], a, b))
                sahip.setdefault(f, ((a, b), k["piksel_md5"][i]))
        # hangi paketler acilacak: istenen aralikta, hedefte olmayan ya da md5'i tutmayan karesi olanlar
        gerekli = {}
        for f in range(a0, b0 + 1):
            if f not in sahip:
                continue
            p = os.path.join(kare, "%04d.png" % f)
            if os.path.exists(p) and os.path.getsize(p) > 0:
                if arg.hizli:
                    continue
                try:
                    if O.md5(O.png_rgba(p)[2]) == sahip[f][1]:
                        continue
                except Exception:
                    pass
            gerekli.setdefault(sahip[f][0], []).append(f)
        O.bloblari_getir(arg.depo, [paketler[kok][ab]["mkv"] for ab in gerekli])
        acilan = 0
        for (a, b) in sorted(gerekli):
            mkv = os.path.join(klasor, ".paket_%04d-%04d.mkv" % (a, b))
            O.blob_yaz(arg.depo, paketler[kok][(a, b)]["mkv"], mkv)
            try:
                gecici = os.path.join(klasor, ".ac")
                for f in O.paket_ac(mkv, kunye[(kok, a, b)], gecici):
                    if f in gerekli[(a, b)] or not os.path.exists(os.path.join(kare, "%04d.png" % f)):
                        os.replace(os.path.join(gecici, "%04d.png" % f), os.path.join(kare, "%04d.png" % f))
                        acilan += 1
                for x in os.listdir(gecici):
                    os.remove(os.path.join(gecici, x))
                os.rmdir(gecici)
            finally:
                os.remove(mkv)
        eksik = [f for f in range(a0, b0 + 1)
                 if not (os.path.exists(os.path.join(kare, "%04d.png" % f)) and f in sahip)]
        eksik_toplam += len(eksik)
        bolum_eksik = {}
        for f in eksik:
            bolum_eksik.setdefault(O.bolum_bul(s, f), []).append(f)
        sonuc[kok] = {"acilan": acilan, "eksik": [list(x) for x in O.sikistir(eksik)],
                      "bolum_eksik": {k: len(v) for k, v in bolum_eksik.items()}}
        print("%s %d-%d: %d kare acildi, %d eksik%s" % (
            kok, a0, b0, acilan, len(eksik), (": " + O.aralik_metin(O.sikistir(eksik))[:200]) if eksik else ""))
        if kok not in yazilar:
            uyarilar.append("%s: yazilar.json depoda yok (film_birlestir altyazi icin ister)" % kok)
    for u in uyarilar:
        print("UYARI:", u)
    if arg.json:
        print(json.dumps({"sonuc": sonuc, "uyarilar": uyarilar}, ensure_ascii=False))
    if eksik_toplam:
        print("EKSIK: %d kare. Yeniden dagitim: python3 addon/arac/cizim_dagit.py eksik --yeni N" % eksik_toplam)
        return 1
    print("TAMAM: istenen butun kareler acildi ve dogrulandi")
    kokler = {b["kok"]: b for b in bilgiler}
    if not arg.aralik and "bolum1_orman" in kokler:
        y = os.path.relpath(kokler["bolum1_orman"]["yol"], O.KOK)
        print("Birlestirme:")
        print("  python3 addon/arac/film_birlestir.py part1.mp4 %s:%s:part1" % (os.path.join(hedef, "bolum1_orman"), y))
        if "bolum1_oda" in kokler:
            print("  python3 addon/arac/film_birlestir.py part2.mp4 %s:%s:part2 %s:%s" % (
                os.path.join(hedef, "bolum1_orman"), y, os.path.join(hedef, "bolum1_oda"),
                os.path.relpath(kokler["bolum1_oda"]["yol"], O.KOK)))
    return 0


def main(argv):
    p = argparse.ArgumentParser(description="gizli depodaki paketleri kareye ac")
    p.add_argument("--hedef", required=True)
    p.add_argument("--depo", default=os.path.expanduser("~/cizim_depo"))
    p.add_argument("--uzak", default=O.DEPO_UZAK)
    p.add_argument("--senaryo", help="yalniz bu senaryo (orn. bolum1_orman)")
    p.add_argument("--senaryolar")
    p.add_argument("--aralik", help="yalniz bu kareler (orn. 1-1066: Part 1)")
    p.add_argument("--hizli", action="store_true")
    p.add_argument("--json", action="store_true")
    arg = p.parse_args(argv)
    arg.depo = os.path.abspath(arg.depo)
    return topla(arg)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
