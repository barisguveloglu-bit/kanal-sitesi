#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KANLI GÖZ — Değişmez hedef ve görev ağacı
===============================================================
Uzun ufuklu (long-horizon) koşuların omurgası.

## Sorun — sessiz hedef kayması

Elli adımlık bir işte asıl tehlike, adımların yanlış olması değil.
Adımlar tek tek doğru olur; yirminci adımda başka bir işi yapıyor
olursunuz. Kimse yanlış bir şey yapmamıştır — hedef, adım adım,
kimsenin fark etmediği bir yere kaymıştır.

Plan değişebilir; **hedef değişemez.** Aradaki farkı tutan bir şey
yoksa ikisi birbirine karışır ve "planı güncelledim" demek "hedefi
değiştirdim" demenin kibar hâli olur.

## Çözüm

Hedef açılışta yazılır ve **parmak izi alınır**. Sonradan metni
değişirse betik bunu yakalar: hedef değişikliği bir plan güncellemesi
değil, insana çıkılacak bir olaydır.

Plan ise serbesttir ama **izlenir**: her değişiklik `sapma` olarak
kaydedilir — eski hâli, yeni hâli, gerekçesi ve insan onayı gerekip
gerekmediği.

Görevler düz liste değil **ağaç**: büyük aşama → alt görev. Elli adımlık
bir işi düz listede takip etmek, yirminci adımda nerede olduğunu
bilmemek demektir.

## Kullanım

    python3 .claude/hedef.py ac --hedef "..." --teslim "..." \\
        --degismez "canon bozulmayacak" --basari "dogrula.py temiz"
    python3 .claude/hedef.py dal --ne "büyük aşama"
    python3 .claude/hedef.py dal --ust 1 --ne "alt görev"
    python3 .claude/hedef.py basla --id 2
    python3 .claude/hedef.py tamam --id 2
    python3 .claude/hedef.py takildi --id 3 --neden "canon kararı gerekiyor"
    python3 .claude/hedef.py sapma --ne "..." --neden "..."
    python3 .claude/hedef.py durum
    python3 .claude/hedef.py kontrol          # hedef kaydı mı, ne durumdayız
    python3 .claude/hedef.py kapat

Çıkış kodu: 0 sağlam, 1 hedef kaymış ya da tutarsızlık var.
"""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime

KLASOR = os.path.dirname(os.path.abspath(__file__))
DOSYA = os.path.join(KLASOR, "hedef.json")

DURUMLAR = ("bekliyor", "calisiyor", "tamam", "takildi")
ISARET = {"bekliyor": "·", "calisiyor": "▸", "tamam": "✓", "takildi": "✗"}


def parmak_izi(h):
    """Hedefin değişmez kısmının özeti. Plan değil, HEDEF izlenir."""
    govde = "\x1f".join([
        h["hedef"], h["teslim"],
        "".join(h["degismezler"]),
        "".join(h["basari"]),
        "".join(h["yasak"]),
    ])
    return hashlib.sha256(govde.encode("utf-8")).hexdigest()[:16]


def oku():
    if not os.path.exists(DOSYA):
        return None
    try:
        with open(DOSYA, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError):
        return None


def yaz(h):
    with open(DOSYA, "w", encoding="utf-8") as f:
        json.dump(h, f, ensure_ascii=False, indent=2)
        f.write("\n")


def gerekli(h):
    if h is None:
        print("Açık hedef yok. Önce: python3 .claude/hedef.py ac --hedef \"...\"")
        return False
    return True


def ac(a):
    varolan = oku()
    if varolan and not a.ustune:
        print(f"'{varolan['hedef']}' hâlâ açık.")
        print("Kapatmadan yeni hedef açmak, ilk hedefi sessizce terk etmektir.")
        print("Bilerek yapıyorsan --ustune ver.")
        return 1

    h = {
        "hedef": a.hedef,
        "teslim": a.teslim or "",
        "degismezler": a.degismez or [],
        "basari": a.basari or [],
        "yasak": a.yasak or [],
        "risk": a.risk,
        "acilis": datetime.now().isoformat(timespec="seconds"),
        "gorevler": [],
        "sapmalar": [],
    }
    h["parmak_izi"] = parmak_izi(h)
    yaz(h)

    print(f"Hedef açıldı (parmak izi {h['parmak_izi']}, risk {a.risk}).")
    print(f"  {a.hedef}")
    if not h["basari"]:
        print("\nUYARI: başarı ölçütü verilmedi. Ölçütü olmayan hedef, "
              "bittiğini\nkimsenin söyleyemeyeceği hedeftir. --basari ekle.")
    return 0


def dal(a):
    h = oku()
    if not gerekli(h):
        return 1
    if a.ust is not None and not any(g["id"] == a.ust for g in h["gorevler"]):
        print(f"Üst görev {a.ust} yok.")
        return 1

    yeni = {"id": max([g["id"] for g in h["gorevler"]], default=0) + 1,
            "ust": a.ust, "ne": a.ne, "durum": "bekliyor", "neden": ""}
    h["gorevler"].append(yeni)
    yaz(h)
    yer = f"{a.ust} altına" if a.ust is not None else "kök seviyeye"
    print(f"[{yeni['id']}] {yer} eklendi: {a.ne}")
    return 0


def _gorev(h, kimlik):
    return next((g for g in h["gorevler"] if g["id"] == kimlik), None)


def durum_degistir(a, yeni_durum):
    h = oku()
    if not gerekli(h):
        return 1
    g = _gorev(h, a.id)
    if not g:
        print(f"Görev {a.id} yok.")
        return 1

    if yeni_durum == "tamam":
        cocuk = [c for c in h["gorevler"] if c["ust"] == a.id]
        acik = [c for c in cocuk if c["durum"] not in ("tamam", "takildi")]
        if acik:
            print(f"Görev {a.id} kapatılamaz: {len(acik)} alt görevi hâlâ açık.")
            for c in acik:
                print(f"  [{c['id']}] {c['ne']}")
            print("\nÜst görevi alt görevlerinden önce kapatmak, işi bitirmek "
                  "değil\ngörmezden gelmektir.")
            return 1

    g["durum"] = yeni_durum
    g["neden"] = getattr(a, "neden", "") or ""
    yaz(h)
    print(f"[{a.id}] {yeni_durum}: {g['ne']}"
          + (f"  ({g['neden']})" if g["neden"] else ""))
    return 0


def sapma(a):
    """Plan değişti — hedef DEĞİL. Fark burada tutuluyor."""
    h = oku()
    if not gerekli(h):
        return 1
    if parmak_izi(h) != h["parmak_izi"]:
        print("HEDEF DEĞİŞMİŞ. Sapma kaydedilemez — önce `kontrol` çalıştır.")
        return 1

    h["sapmalar"].append({
        "an": datetime.now().isoformat(timespec="seconds"),
        "ne": a.ne, "neden": a.neden,
        "onay_gerekli": bool(a.onay_gerekli),
    })
    yaz(h)
    print(f"Sapma kaydedildi: {a.ne}")
    print(f"  gerekçe: {a.neden}")
    if a.onay_gerekli:
        print("\nBu sapma İNSAN ONAYI istiyor. Uygulamadan önce Barış'a sor.")
    return 0


def agac(h):
    satirlar = []

    def yaz_dal(ust, derinlik):
        for g in [x for x in h["gorevler"] if x["ust"] == ust]:
            girinti = "   " * derinlik
            not_ = f"  ({g['neden']})" if g["neden"] else ""
            satirlar.append(f"  {girinti}{ISARET[g['durum']]} [{g['id']}] "
                            f"{g['ne']}{not_}")
            yaz_dal(g["id"], derinlik + 1)

    yaz_dal(None, 0)
    return satirlar


def durum(a):
    h = oku()
    if not gerekli(h):
        return 1

    print(f"HEDEF: {h['hedef']}")
    if h["teslim"]:
        print(f"Teslim: {h['teslim']}")
    print(f"Risk: {h['risk']}   ·   parmak izi {h['parmak_izi']}")

    for baslik, alan in (("Değişmezler", "degismezler"),
                         ("Başarı ölçütü", "basari"),
                         ("Yasak", "yasak")):
        if h[alan]:
            print(f"\n{baslik}:")
            for x in h[alan]:
                print(f"  - {x}")

    if h["gorevler"]:
        print("\nGörev ağacı:")
        print("\n".join(agac(h)))
        say = {d: sum(1 for g in h["gorevler"] if g["durum"] == d) for d in DURUMLAR}
        toplam = len(h["gorevler"])
        print(f"\n  {say['tamam']}/{toplam} tamam"
              + (f", {say['calisiyor']} çalışıyor" if say["calisiyor"] else "")
              + (f", {say['takildi']} TAKILDI" if say["takildi"] else ""))
    else:
        print("\nHenüz görev ağacı yok. `dal` ile büyük aşamaları ekle.")

    if h["sapmalar"]:
        print(f"\nPlan sapmaları ({len(h['sapmalar'])}):")
        for s in h["sapmalar"]:
            im = " [ONAY GEREKLİ]" if s["onay_gerekli"] else ""
            print(f"  · {s['ne']}{im}\n    ↳ {s['neden']}")
    return 0


def kontrol(a):
    """Hedef hâlâ aynı mı, iş hâlâ hedefe mi hizmet ediyor."""
    h = oku()
    if not gerekli(h):
        return 1

    sorun = []
    simdiki = parmak_izi(h)
    if simdiki != h["parmak_izi"]:
        sorun.append(
            "HEDEF DEĞİŞMİŞ — açılıştaki metin artık farklı.\n"
            f"    açılış: {h['parmak_izi']}   şimdi: {simdiki}\n"
            "    Bu bir plan güncellemesi değil. Hedef değişikliği insan\n"
            "    kararıdır: ya eski hedefe dön ya Barış'a çık.")

    takilan = [g for g in h["gorevler"] if g["durum"] == "takildi"]
    if takilan:
        sorun.append(f"{len(takilan)} görev takılı — ilerleme bunlara bağlı:\n"
                     + "\n".join(f"    [{g['id']}] {g['ne']} ({g['neden']})"
                                 for g in takilan))

    onaysiz = [s for s in h["sapmalar"] if s["onay_gerekli"]]
    if onaysiz:
        sorun.append(f"{len(onaysiz)} plan sapması insan onayı bekliyor.")

    if not h["basari"]:
        sorun.append("Başarı ölçütü yok — bu hedefin bittiğini kimse "
                     "söyleyemez.")

    calisan = [g for g in h["gorevler"] if g["durum"] == "calisiyor"]
    if len(calisan) > 1:
        sorun.append(f"{len(calisan)} görev aynı anda 'çalışıyor'. Uzun "
                     "ufuklu işte\n    tek odak tutulur; ikisi de yarım kalır.")

    if not sorun:
        toplam = len(h["gorevler"])
        biten = sum(1 for g in h["gorevler"] if g["durum"] == "tamam")
        print(f"Hedef sağlam. {biten}/{toplam} görev tamam.")
        if toplam and biten == toplam:
            print("Bütün görevler bitti — başarı ölçütlerini doğrula, "
                  "sonra `kapat`.")
        return 0

    print("HEDEF KONTROLÜ — dikkat gereken noktalar:\n")
    for s in sorun:
        print(f"  · {s}\n")
    return 1


def kapat(a):
    h = oku()
    if not gerekli(h):
        return 1
    acik = [g for g in h["gorevler"] if g["durum"] not in ("tamam", "takildi")]
    if acik and not a.zorla:
        print(f"{len(acik)} görev hâlâ açık:")
        for g in acik:
            print(f"  [{g['id']}] {g['ne']}")
        print("\nAçık görevle kapatmak, hedefi terk etmektir. Gerçekten "
              "bitirdiysen\nönce onları `tamam` ya da `takildi` yap. "
              "Bilerek terk ediyorsan --zorla.")
        return 1

    arsiv = os.path.join(KLASOR, "hedef-gecmisi.jsonl")
    h["kapanis"] = datetime.now().isoformat(timespec="seconds")
    with open(arsiv, "a", encoding="utf-8") as f:
        f.write(json.dumps(h, ensure_ascii=False) + "\n")
    os.remove(DOSYA)

    biten = sum(1 for g in h["gorevler"] if g["durum"] == "tamam")
    print(f"Hedef kapandı: {biten}/{len(h['gorevler'])} görev tamam.")
    takilan = [g for g in h["gorevler"] if g["durum"] == "takildi"]
    if takilan:
        print(f"\n{len(takilan)} görev takılı kapandı — geçmişte duruyor:")
        for g in takilan:
            print(f"  · {g['ne']} ({g['neden']})")
    return 0


def main(argv):
    a = argparse.ArgumentParser(description="Değişmez hedef ve görev ağacı.")
    alt = a.add_subparsers(dest="komut", required=True)

    p = alt.add_parser("ac", help="hedef sözleşmesi aç")
    p.add_argument("--hedef", required=True)
    p.add_argument("--teslim", default="", help="ne teslim edilecek")
    p.add_argument("--degismez", action="append", help="bozulmayacak kural")
    p.add_argument("--basari", action="append", help="bittiğini gösteren ölçüt")
    p.add_argument("--yasak", action="append", help="yapılmayacak değişiklik")
    p.add_argument("--risk", choices=("dusuk", "orta", "yuksek"), default="orta")
    p.add_argument("--ustune", action="store_true", help="açık hedefin üstüne aç")
    p.set_defaults(islev=ac)

    p = alt.add_parser("dal", help="görev ağacına düğüm ekle")
    p.add_argument("--ne", required=True)
    p.add_argument("--ust", type=int, help="üst görev kimliği (yoksa kök)")
    p.set_defaults(islev=dal)

    for ad, d, yardim in (("basla", "calisiyor", "göreve başla"),
                          ("tamam", "tamam", "görevi bitir"),
                          ("takildi", "takildi", "görev takıldı")):
        p = alt.add_parser(ad, help=yardim)
        p.add_argument("--id", type=int, required=True)
        p.add_argument("--neden", default="")
        p.set_defaults(islev=lambda x, _d=d: durum_degistir(x, _d))

    p = alt.add_parser("sapma", help="plan değişti (hedef değil) — kaydet")
    p.add_argument("--ne", required=True)
    p.add_argument("--neden", required=True)
    p.add_argument("--onay-gerekli", action="store_true")
    p.set_defaults(islev=sapma)

    p = alt.add_parser("durum", help="hedef ve görev ağacı")
    p.set_defaults(islev=durum)

    p = alt.add_parser("kontrol", help="hedef kaydı mı, tutarsızlık var mı")
    p.set_defaults(islev=kontrol)

    p = alt.add_parser("kapat", help="hedefi kapat ve arşivle")
    p.add_argument("--zorla", action="store_true")
    p.set_defaults(islev=kapat)

    secim = a.parse_args(argv)
    return secim.islev(secim)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
