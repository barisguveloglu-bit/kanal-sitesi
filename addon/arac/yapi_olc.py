# -*- coding: utf-8 -*-
"""OYUNDAKI BIR YAPIYI BLOK BLOK OLC (Bedrock Dedicated Server ile).   v7.99.16

    python3 addon/arac/yapi_olc.py --bds <BDS klasoru> --calisma <depo disi klasor>
        --biyom minecraft:swampland --yapi temple
        --isaret spruce_planks,cauldron --cikti olcum.json [--adet 2]

Neden: film sahnelerinde oyundaki yapilarin "aynisi" isteniyor (cadi
kulubesi, koy evleri). Yapiyi gozle ya da hafizadan kurmak tahmin olur;
burada oyunun KENDISI uretiyor, bir betik her blogun turunu ve durumunu
okuyor. Mojang'in hicbir dosyasi depoya girmez: cikti bizim olcum
tablomuz (konum, blok adi, durum).

Nasil:
  1. BDS klasoru (sunucu/sunucu_kur.sh'in kurdugu ya da ham zip) depo
     disindaki --calisma klasorune kopyalanir; ona kucuk bir olcum
     davranis paketi ve bos bir dunya konur.
  2. Birkac baslangic noktasindan "locate biome" ile biyom, onun
     yakininda "locate structure" ile yapi aranir (konsolda konum icin
     "execute positioned"; konsolun kendi kokeni 0 0 0).
  3. Yapinin bolgesi tickingarea ile yukletilir (oyuncu yokken bolge
     yuklu degil), betik --isaret bloklarinin kutusunu bulur, kutuyu
     genisletip her blogu okur.
  4. --adet yapi olculur; hepsi ciktiya yazilir. Birden fazla yapi
     KARSILASTIRMA icindir: hepsinde ayni olan yapidir, farkli olan
     rastgele (cadi kulubesinde zemindeki mantar boyle ayiklandi).

Olculen cevaplar (BDS 1.26.52.3): cadi kulubesi "temple" adiyla
bulunuyor (col tapinagi da ayni ad); biyom adi "minecraft:" onekli
("minecraft:swampland"); ayni adli ikinci tickingarea eklenmiyor, o
yuzden her yapidan once "remove_all".
"""
import argparse
import functools
import json
import math
import os
import re
import shutil
import sys
import time
import uuid

BURASI = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True
print = functools.partial(print, flush=True)  # noqa: A001 -- ilerleme anlik gorunsun
sys.path.insert(0, os.path.join(BURASI, "..", "sunucu"))
from konsol import Konsol, sade  # noqa: E402

BETIK = r'''
import { system, world } from "@minecraft/server";
let ATLA = new Set();
function oku(boyut, x, y, z) {
  try { return boyut.getBlock({ x, y, z }); } catch (h) { return undefined; }
}
system.afterEvents.scriptEventReceive.subscribe((e) => {
  const p = e.message.trim().split(/\s+/);
  const [x, y, z, dx, dy, dz] = p.slice(0, 6).map(Number);
  const boyut = world.getDimension("overworld");
  if (e.id === "olc:atla") {
    ATLA = new Set(e.message.trim().split(/\s+/));
    console.warn("ATLA " + ATLA.size);
  } else if (e.id === "olc:yuklu") {
    let yok = 0;
    for (let i = 0; i < dx; i++) for (let k = 0; k < dz; k++) if (!oku(boyut, x + i, y, z + k)) yok++;
    console.warn("YUKLU " + (yok === 0 ? "evet" : "hayir"));
  } else if (e.id === "olc:bul") {
    const tipler = new Set(p.slice(6));
    const kutu = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    let n = 0;
    for (let j = 0; j < dy; j++) for (let i = 0; i < dx; i++) for (let k = 0; k < dz; k++) {
      const b = oku(boyut, x + i, y + j, z + k);
      if (!b || !tipler.has(b.typeId)) continue;
      n++;
      const q = [x + i, y + j, z + k];
      for (let a = 0; a < 3; a++) { kutu[a] = Math.min(kutu[a], q[a]); kutu[a + 3] = Math.max(kutu[a + 3], q[a]); }
    }
    console.warn("BUL " + n + " " + JSON.stringify(kutu));
  } else if (e.id === "olc:tara") {
    let n = 0;
    for (let j = 0; j < dy; j++) for (let i = 0; i < dx; i++) for (let k = 0; k < dz; k++) {
      const b = oku(boyut, x + i, y + j, z + k);
      if (!b || b.typeId === "minecraft:air" || ATLA.has(b.typeId)) continue;
      n++;
      console.warn("OLC " + JSON.stringify({ x: x + i, y: y + j, z: z + k, t: b.typeId,
                                            s: b.permutation.getAllStates() }));
    }
    console.warn("OLC BITTI " + n);
  }
});
'''


def calisma_kur(bds, kok):
    if not os.path.exists(os.path.join(kok, "bedrock_server")):
        shutil.copytree(bds, kok, ignore=shutil.ignore_patterns("worlds", "yedek", "*.tar.gz"))
    s = open(os.path.join(kok, "server.properties"), encoding="utf-8").read()
    for k, v in (("level-name", "yapi_olcum"), ("allow-list", "false"),
                 ("enable-lan-visibility", "false"), ("level-seed", "")):
        s = re.sub(r"(?m)^%s=.*$" % re.escape(k), "%s=%s" % (k, v), s)
    open(os.path.join(kok, "server.properties"), "w", encoding="utf-8").write(s)
    bp = os.path.join(kok, "behavior_packs", "yapi_olcum")
    os.makedirs(os.path.join(bp, "scripts"), exist_ok=True)
    kimlik = str(uuid.uuid5(uuid.NAMESPACE_URL, "simsek/yapi_olcum"))
    json.dump({"format_version": 2,
               "header": {"name": "yapi_olcum", "description": "blok olcumu", "uuid": kimlik,
                          "version": [1, 0, 0], "min_engine_version": [1, 21, 0]},
               "modules": [{"type": "script", "language": "javascript", "entry": "scripts/main.js",
                            "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, "simsek/yapi_olcum/betik")),
                            "version": [1, 0, 0]}],
               "dependencies": [{"module_name": "@minecraft/server", "version": "2.0.0"}]},
              open(os.path.join(bp, "manifest.json"), "w"))
    open(os.path.join(bp, "scripts", "main.js"), "w").write(BETIK)
    dunya = os.path.join(kok, "worlds", "yapi_olcum")
    os.makedirs(dunya, exist_ok=True)
    json.dump([{"pack_id": kimlik, "version": [1, 0, 0]}],
              open(os.path.join(dunya, "world_behavior_packs.json"), "w"))


def konum(satirlar, kalip):
    for s in satirlar:
        m = re.search(kalip, s)
        if m:
            return int(m.group(1)), int(m.group(2))
    return None


def bekle_satir(k, komut, aranan, sure):
    bas = len(k.satirlar)
    k.yaz(komut)
    k.bekle(aranan, sure, bas)
    return k.satirlar[bas:]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--bds", required=True)
    p.add_argument("--calisma", required=True)
    p.add_argument("--biyom", required=True)
    p.add_argument("--yapi", required=True)
    p.add_argument("--isaret", required=True, help="virgulle blok adlari (minecraft: oneksiz)")
    p.add_argument("--cikti", required=True)
    p.add_argument("--adet", type=int, default=2)
    p.add_argument("--en_az", type=int, default=50, help="isaret blogu bundan azsa yapi sayilmaz")
    p.add_argument("--yaricap", type=int, default=24, help="yapinin aranacagi yari genislik (koy icin ~64)")
    p.add_argument("--atla", default="", help="taramada yazilmayacak dogal bloklar (virgulle)")
    a = p.parse_args()
    # Oyun bir tickingarea'ya en fazla 100 chunk veriyor; 2R+1 blok en kotu
    # hizalamada ceil((2R+1)/16)+1 chunk tutar. R = 72 bu siniri asti ve
    # bolge HIC yuklenmedi (olculdu, 2026-11-01) -- sessizce beklemek yerine dur.
    if (math.ceil((2 * a.yaricap + 1) / 16.0) + 1) ** 2 > 100:
        print("HATA: --yaricap %d tickingarea siniri (100 chunk) asiyor; en fazla 64" % a.yaricap)
        return 2
    depo = os.path.realpath(os.path.join(BURASI, "..", ".."))
    kok = os.path.realpath(a.calisma)
    if (kok + os.sep).startswith(depo + os.sep):
        print("HATA: calisma klasoru depo icinde; BDS depoya girmez")
        return 1
    calisma_kur(os.path.realpath(a.bds), kok)
    isaret = " ".join("minecraft:" + t.strip() for t in a.isaret.split(","))
    olculen = []
    with Konsol(kok) as k:
        if not k.bekle("Server started.", 120):
            print("HATA: sunucu acilmadi")
            return 1
        kokenler = [(0, 0), (3000, 3000), (-3000, 3000), (3000, -3000), (-3000, -3000),
                    (6000, 0), (0, 6000), (-6000, 0), (0, -6000)]
        for ox, oz in kokenler:
            if len(olculen) >= a.adet:
                break
            r = k.komut("execute positioned %d 64 %d run locate biome %s" % (ox, oz, a.biyom),
                        sure=30, sessizlik=1.5)
            b = konum(r, r"is at block (-?\d+), -?\d+, (-?\d+)")
            if not b:
                continue
            r = k.komut("execute positioned %d 64 %d run locate structure %s" % (b[0], b[1], a.yapi),
                        sure=30, sessizlik=1.5)
            t = konum(r, r"is at block (-?\d+), \(y\?\), (-?\d+)")
            print("  koken %d %d: biyom %s, yapi %s" % (ox, oz, b, t))
            if not t or any(abs(t[0] - o["konum"][0]) < 64 and abs(t[1] - o["konum"][1]) < 64
                            for o in olculen):
                continue
            X, Z = t
            k.komut("tickingarea remove_all", sure=5)
            R = a.yaricap
            k.komut("tickingarea add %d 0 %d %d 0 %d olcum true" % (X - R, Z - R, X + R, Z + R), sure=5)
            if a.atla:
                bekle_satir(k, "scriptevent olc:atla " + " ".join("minecraft:" + t.strip() for t in a.atla.split(",")),
                            "ATLA", 10)
            for _ in range(60):
                if any("YUKLU evet" in s for s in
                       bekle_satir(k, "scriptevent olc:yuklu %d 64 %d %d 1 %d" % (X - R, Z - R, 2 * R, 2 * R),
                                   "YUKLU", 10)):
                    break
                time.sleep(2)
            # Dikeyde 20'lik dilimler: tek seferde 48x300x48 blok okumak
            # betik bekcisinin (watchdog) sinirina dayanir.
            n, kutu = 0, [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]
            # Dilimler kucuk: tek cagrida ~290 bin blok okumak betik bekcisine
            # takildi, betik sustu ve olcum 12 dakika ilerlemedi (2026-11-01).
            for yy in range(40, 160, 10):
                satir = bekle_satir(k, "scriptevent olc:bul %d %d %d %d 10 %d %s" % (X - R, yy, Z - R, 2 * R, 2 * R, isaret),
                                    "BUL ", 60)
                m = next((re.search(r"BUL (\d+) (\[.*\])", s) for s in satir if "BUL " in s), None)
                if m and int(m.group(1)):
                    n += int(m.group(1))
                    q = json.loads(m.group(2))
                    kutu = [min(kutu[i], q[i]) for i in range(3)] + [max(kutu[i], q[i]) for i in range(3, 6)]
            if n < a.en_az:
                print("  %d ~ %d: yapi degil (%d isaret)" % (X, Z, n))
                continue
            x0, y0, z0, x1, y1, z1 = kutu
            alan = (x0 - 2, y0 - 8, z0 - 2, x1 + 2, y1 + 2, z1 + 2)
            # Dikeyde dilim dilim: buyuk alanda (koy) tek taramada bekci siniri.
            bloklar = []
            for yy in range(alan[1], alan[4] + 1, 3):
                ust = min(alan[4], yy + 2)
                satir = bekle_satir(k, "scriptevent olc:tara %d %d %d %d %d %d" % (
                    alan[0], yy, alan[2], alan[3] - alan[0] + 1, ust - yy + 1,
                    alan[5] - alan[2] + 1), "OLC BITTI", 180)
                bloklar += [json.loads(s[s.find("OLC {") + 4:]) for s in satir if "OLC {" in s]
            olculen.append({"konum": [X, Z], "kutu": kutu, "alan": list(alan), "bloklar": bloklar})
            print("  %d ~ %d: %d isaret, kutu %s, %d blok okundu" % (X, Z, n, kutu, len(bloklar)))
    json.dump({"biyom": a.biyom, "yapi": a.yapi, "isaret": a.isaret, "yapilar": olculen},
              open(a.cikti, "w"), indent=0)
    print("%d yapi -> %s" % (len(olculen), a.cikti))
    return 0 if olculen else 1


if __name__ == "__main__":
    sys.exit(main())
