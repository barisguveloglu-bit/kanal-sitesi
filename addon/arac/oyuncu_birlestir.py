#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Iki `player.entity.json`'u TEK dosyada birlestirir.

NEDEN GEREKLI
-------------
Bedrock'ta `minecraft:player`'i ezen iki paket ayni anda calisamaz.
Dosyalar BIRLESMEZ: paket sirasinda ustte olan, alttakini butunuyle
degistirir. Depomuz (`Simsek_Oyuncu_Modeli`) ve Iron Man add-on'u
ikisi de ayni anahtari ayni `format_version` (1.10.0) ile taniyor,
yani biri digerinin oyuncu katmanini tamamen siliyor.

Bu arac ikisini tek dosyada topluyor.

CIKTI NEREYE GIDER
------------------
`addon/yerel/` altina -- ASLA depoya degil. Birlesik dosya dis bir
modun geometrilerine atif yapar; kullanicinin yapimcilardan aldigi
iznin sarti "dosyayi kimseye vermemek" ve bu depo herkese acik.
Bkz. CLAUDE.md "Yerel varlik kolu".

BIRLESTIRME KURALLARI
---------------------
1. `animations` / `geometry` / `textures` / `materials` / `particle_effects`
   -> sozluk BIRLESIMI. Ayni anahtar farkli deger tasiyorsa DUR ve
   soyle; sessizce birini secmek, kaybolan seyi gizler.
2. `scripts.initialize` / `pre_animation` -> sirali birlesim.
   Tabanin satirlari once, ekin YENI satirlari kendi sirasiyla sonra.
   Sira onemli: bu satirlar degisken hesapliyor.
3. `scripts.animate` -> anahtara gore birlesim.
4. `render_controllers` -> anahtara gore birlesim. Ayni denetleyiciyi
   IKI taraf da kosullandirmissa kosullar `&&` ile BIRLESTIRILIR.
   Gerekce: her iki taraf da "benim seyim aktifken normal oyuncuyu
   cizme" diyor. Birini atmak o tarafin gorunumunu bozar. Ornek:
   bizim `!variable.donusuk` (Ben 10 donusumu) ile Iron Man'in
   `!variable.off_skin` ayni anda gecerli olmali.
5. `q.` ve `query.` ayni sey -- kosul karsilastirirken esitlenir,
   yoksa ayni kosul iki kez yazilir.
"""
import json
import os
import re
import sys


def yukle(yol):
    s = open(yol, encoding="utf-8-sig").read()
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    s = re.sub(r"(?m)//.*$", "", s)
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    return json.loads(s)


def anahtar(x):
    """Liste ogesi ya duz metin ya tek anahtarli sozluk."""
    return x if isinstance(x, str) else list(x.keys())[0]


def kosul(x):
    return None if isinstance(x, str) else list(x.values())[0]


def esitle(ifade):
    """`q.` kisaltmasini `query.` yapar -- ayni sey."""
    return re.sub(r"\bq\.", "query.", ifade or "")


def kosul_birlestir(a, b):
    """Iki kosulu `&&` ile birlestirir, ayni sarti iki kez yazmaz."""
    if a is None:
        return b
    if b is None:
        return a
    parcalar, gorulen = [], set()
    for kaynak in (a, b):
        for p in kaynak.split("&&"):
            p = p.strip()
            if not p:
                continue
            n = esitle(p)
            if n in gorulen:
                continue
            gorulen.add(n)
            parcalar.append(n)
    return " && ".join(parcalar)


def sozluk_birlestir(taban, ek, alan, catisma):
    a = dict(taban.get(alan) or {})
    b = ek.get(alan) or {}
    for k, v in b.items():
        if k in a and a[k] != v:
            catisma.append("%s.%s :: taban=%r  ek=%r" % (alan, k, a[k], v))
            continue                      # taban KAZANIR, ama sessiz degil
        a[k] = v
    return a


def sirali_birlestir(a, b):
    """Tabanin satirlari once; ekin YENI satirlari kendi sirasiyla."""
    cikti = list(a or [])
    gorulen = {json.dumps(x, sort_keys=True) for x in cikti}
    for x in (b or []):
        im = json.dumps(x, sort_keys=True)
        if im not in gorulen:
            gorulen.add(im)
            cikti.append(x)
    return cikti


def liste_birlestir(a, b, birlesen):
    """Anahtara gore birlesim; ayni anahtarin kosullari `&&` ile."""
    sira, harita = [], {}
    for x in (a or []):
        k = anahtar(x)
        if k not in harita:
            sira.append(k)
        harita[k] = x
    for x in (b or []):
        k = anahtar(x)
        if k not in harita:
            sira.append(k)
            harita[k] = x
            continue
        eski, yeni = harita[k], x
        if eski == yeni:
            continue
        ke, ky = kosul(eski), kosul(yeni)
        if ke is None and ky is None:
            continue
        b_kosul = kosul_birlestir(ke, ky)
        harita[k] = {k: b_kosul}
        birlesen.append("%s\n      taban : %s\n      ek    : %s\n      sonuc : %s"
                        % (k, ke, ky, b_kosul))
    return [harita[k] for k in sira]


def birlestir(taban_yol, ek_yol):
    t = yukle(taban_yol)
    e = yukle(ek_yol)
    kok = "minecraft:client_entity"
    td = t[kok]["description"]
    ed = e[kok]["description"]

    if td.get("identifier") != ed.get("identifier"):
        raise SystemExit("HATA: identifier ayni degil (%r / %r)"
                         % (td.get("identifier"), ed.get("identifier")))

    catisma, birlesen = [], []
    yeni = dict(td)
    for alan in ("animations", "geometry", "textures",
                 "materials", "particle_effects"):
        if alan in td or alan in ed:
            yeni[alan] = sozluk_birlestir(td, ed, alan, catisma)

    ts, es = td.get("scripts") or {}, ed.get("scripts") or {}
    ys = dict(ts)
    ys["variables"] = sozluk_birlestir(ts, es, "variables", catisma)
    for alan in ("initialize", "pre_animation"):
        ys[alan] = sirali_birlestir(ts.get(alan), es.get(alan))
    ys["animate"] = liste_birlestir(ts.get("animate"), es.get("animate"), [])
    yeni["scripts"] = ys

    yeni["render_controllers"] = liste_birlestir(
        td.get("render_controllers"), ed.get("render_controllers"), birlesen)

    t[kok]["description"] = yeni
    return t, catisma, birlesen, td, ed


def derin_birlestir(taban, ek, alan, catisma, birlesen):
    """component_groups icin BIR kademe derin birlesim.

    Bir grup, bileşen ADLARINDAN olusan bir sozluk. Iki taraf ayni
    grubu tanimliyorsa dogru davranis birini secmek DEGIL, gruptaki
    bilesenleri birlestirmek. Olculmus ornek: `minecraft:raid_trigger`
    grubunu ikimiz de tanimliyoruz; Iron Man icine fazladan
    `minecraft:spell_effects` koymus. Grubu ezersek o kaybolur.
    """
    a = dict(taban.get(alan) or {})
    b = ek.get(alan) or {}
    for grup, icerik in b.items():
        if grup not in a:
            a[grup] = icerik
            continue
        if a[grup] == icerik:
            continue
        if not (isinstance(a[grup], dict) and isinstance(icerik, dict)):
            catisma.append("%s.%s :: sozluk degil, taban korundu" % (alan, grup))
            continue
        yeni = dict(a[grup])
        eklenen = []
        for bad, bdeger in icerik.items():
            if bad not in yeni:
                yeni[bad] = bdeger
                eklenen.append(bad)
            elif yeni[bad] != bdeger:
                catisma.append("%s.%s.%s :: taban=%r ek=%r"
                               % (alan, grup, bad, yeni[bad], bdeger))
        a[grup] = yeni
        if eklenen:
            birlesen.append("%s.%s <- ek'ten gelen: %s"
                            % (alan, grup, ", ".join(eklenen)))
    return a


def davranis_birlestir(taban_yol, ek_yol):
    """Davranis paketi tarafi (`entities/player.json`)."""
    t = yukle(taban_yol)
    e = yukle(ek_yol)
    kok = "minecraft:entity"
    td, ed = t[kok], e[kok]
    if (td.get("description") or {}).get("identifier") != \
       (ed.get("description") or {}).get("identifier"):
        raise SystemExit("HATA: identifier ayni degil")

    catisma, birlesen = [], []
    yeni = dict(td)

    # description: identifier vb. tabandan; properties/animations/scripts birlesir
    tdesc = dict(td.get("description") or {})
    edesc = ed.get("description") or {}
    for alan in ("properties", "animations", "scripts"):
        if alan in tdesc or alan in edesc:
            tdesc[alan] = sozluk_birlestir(tdesc, edesc, alan, catisma)
    yeni["description"] = tdesc

    # components: taban KAZANIR, catisma raporlanir
    yeni["components"] = sozluk_birlestir(td, ed, "components", catisma)
    # component_groups: bir kademe derin
    yeni["component_groups"] = derin_birlestir(td, ed, "component_groups",
                                               catisma, birlesen)
    # events: duz birlesim
    yeni["events"] = sozluk_birlestir(td, ed, "events", catisma)

    t[kok] = yeni
    return t, catisma, birlesen, td, ed


def main():
    a = sys.argv[1:]
    if len(a) < 3:
        print(__doc__)
        print("Kullanim:\n  oyuncu_birlestir.py <taban.json> <ek.json> <cikti.json>")
        return 2
    davranis = "--davranis" in a
    a = [x for x in a if x != "--davranis"]
    taban_yol, ek_yol, cikti_yol = a[0], a[1], a[2]

    if davranis:
        birlesik, catisma, birlesen, td, ed = davranis_birlestir(taban_yol, ek_yol)
        print("=== OYUNCU BIRLESTIRME (davranis paketi) ===")
        print("taban : %s" % taban_yol)
        print("ek    : %s" % ek_yol)
        print()
        yd = birlesik["minecraft:entity"]
        for alan in ("components", "component_groups", "events"):
            print("  %-18s taban=%-4d ek=%-4d -> %d"
                  % (alan, len(td.get(alan) or {}), len(ed.get(alan) or {}),
                     len(yd.get(alan) or {})))
        for alan in ("properties", "animations", "scripts"):
            print("  description.%-7s taban=%-4d ek=%-4d -> %d"
                  % (alan, len((td.get("description") or {}).get(alan) or {}),
                     len((ed.get("description") or {}).get(alan) or {}),
                     len((yd.get("description") or {}).get(alan) or {})))
        if birlesen:
            print("\n--- DERIN BIRLESEN GRUPLAR (%d) ---" % len(birlesen))
            for x in birlesen:
                print("   " + x)
        if catisma:
            print("\n--- CATISMA: ayni anahtar farkli deger (%d) ---" % len(catisma))
            print("    TABAN kazandi. Asagidakiler ELLE bakilmali:")
            for x in catisma:
                print("      " + x)
        os.makedirs(os.path.dirname(os.path.abspath(cikti_yol)), exist_ok=True)
        with open(cikti_yol, "w", encoding="utf-8") as f:
            json.dump(birlesik, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print("\nyazildi: %s" % cikti_yol)
        return 0

    birlesik, catisma, birlesen, td, ed = birlestir(taban_yol, ek_yol)
    d = birlesik["minecraft:client_entity"]["description"]

    print("=== OYUNCU BIRLESTIRME ===")
    print("taban : %s" % taban_yol)
    print("ek    : %s" % ek_yol)
    print()
    for alan in ("animations", "geometry", "textures", "materials",
                 "particle_effects", "render_controllers"):
        tv, ev, yv = td.get(alan), ed.get(alan), d.get(alan)
        if yv is None:
            continue
        print("  %-19s taban=%-5d ek=%-5d -> %d"
              % (alan, len(tv or []), len(ev or []), len(yv)))
    for alan in ("initialize", "pre_animation", "animate"):
        tv = (td.get("scripts") or {}).get(alan) or []
        ev = (ed.get("scripts") or {}).get(alan) or []
        yv = (d.get("scripts") or {}).get(alan) or []
        print("  scripts.%-11s taban=%-5d ek=%-5d -> %d"
              % (alan, len(tv), len(ev), len(yv)))

    if birlesen:
        print("\n--- KOSULU BIRLESTIRILEN DENETLEYICILER (%d) ---" % len(birlesen))
        for s in birlesen:
            print("   " + s)

    if catisma:
        print("\n--- CATISMA: ayni anahtar farkli deger (%d) ---" % len(catisma))
        print("    TABAN kazandi. Asagidakiler ELLE bakilmali:")
        for s in catisma:
            print("      " + s)

    os.makedirs(os.path.dirname(os.path.abspath(cikti_yol)), exist_ok=True)
    with open(cikti_yol, "w", encoding="utf-8") as f:
        json.dump(birlesik, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("\nyazildi: %s" % cikti_yol)
    return 1 if catisma else 0


if __name__ == "__main__":
    sys.exit(main())
