/* BUZ ORDUSU -- arac/buz_ordu.py                                      2026-11-24

   Kullanici: "Part 2'de siradaki is buz yaratiklari: zombi, iskelet, creeper
   ve orumcek. Olculerini oyunun kendi model kodundan okuyup skinlerini kodla
   cizeceksin." Yalniz film icin; kutular Java 26.3 JAR'indan javap ile okundu.

   1. bicim: uretilen her geometri bicim_dogrula'dan bulgusuz geciyor
   2. olcu: zombinin kutulari ve pivotlari aktorunkiyle (insan modeli) bire
      bir ayni; dordu de zemine basiyor; orumcegin 8 bacagi (film araciyla ayni
      zincirden) disa ve asagi uzaniyor, uclari zeminde, sag-sol simetrik
   3. doku: kutu UV'leri dokuda, birbirine ve palete binmiyor (yalniz ortak
      bacaklar), govde kutularinin her pikseli opak (yalniz ust katmanlar ve
      iskeletin bos kaburga aralari saydam); kristal yuzleri paletteki opak
      hucrelere dusuyor
   4. isima: en parlak pikseller kafanin on yuzunde (gozler); creeper
      tislarken agzi da isiyor ve normal haritanin her isiyani tislamada da
      isiyor; zombinin damari isiriktan basliyor
   5. asama: buz, kabuk, damar ve kristal asamayla artiyor; zombinin 3.
      asamasi bile zombi olarak okunuyor (buz < %75)
   5b. kabuk ve kalp (kullanici: "Zombi ve iskeleti daha iyi yapmaya calis"):
      zombinin kabugu 1. asamada yok, sonra buyuyor; uzanan kolun altindaki
      sarkitlar zombi durusunda asagi sarkiyor; iskeletin kaburga aralari bos,
      icindeki buz kalbi gogusun icinde ve isiyor; bilek ve incik kabuklari
      yari saydam, kemigin ekseninde
   6. yay: iskeletin eline (rightItem) oturuyor; yay durusunda (sag kol -90)
      dikiliyor, dinlenmede yatay
   7. uretim: ayni cikti iki kez ayni; uret() 35 dosya yaziyor (buz oku
      2026-11-25'te eklendi: model + iki doku); uretec dosya
      okumuyor (Mojang dokusu kullanilmiyor)
   8. mutasyon: kol genisligi, bacak donusu, goz isimasi, tislama agzi,
      kalbin isimasi ve kabuk bozulunca ilgili kontrol dusuyor            */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const gecici = mkdtempSync(join(tmpdir(), "buz-ordu-"));
const py = `
import json, sys, os, copy, importlib, hashlib, glob, math
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
os.chdir(${JSON.stringify(KOK)})
import buz_ordu as BO
import bicim_dogrula as BD
import bedrock_onizleme as B
gec = sys.argv[1]

def kemikler(g):
    return {b["name"]: b for b in g["minecraft:geometry"][0]["bones"]}

def ust(ad):
    return ad == "hat" or ad.startswith("buz_")

def taban_kupler(g):
    t = json.loads(json.dumps(g))
    for b in t["minecraft:geometry"][0]["bones"]:
        b["cubes"] = [c for c in b.get("cubes", []) if isinstance(c.get("uv"), list) and not ust(b["name"])]
    return t

def palet_alani(ad):
    x0, y0, en = BO.PALET_YERI[ad]
    return (x0, y0, x0 + en, y0 + 128 // en)

def aktor_esit(bo):
    akt = kemikler(json.load(open("Simsek_Kol_Kaynak/models/entity/aktor.geo.json")))
    z = kemikler(bo.geometri("zombi", 1))
    farkli = []
    for ad in ("body", "head", "rightArm", "leftArm", "rightLeg", "leftLeg", "waist", "rightItem", "leftItem"):
        a, b = akt[ad], z[ad]
        if a["pivot"] != b["pivot"] or [(c["origin"], c["size"]) for c in a.get("cubes", [])] != \\
           [(c["origin"], c["size"]) for c in b.get("cubes", [])]:
            farkli.append(ad)
    return farkli

def orumcek_bacak(bo):
    g = bo.geometri("orumcek", 1)
    m = B.Model(g)
    uclar = {}
    for b in g["minecraft:geometry"][0]["bones"]:
        if "Leg" not in b["name"]:
            continue
        c = b["cubes"][0]; o, s = c["origin"], c["size"]
        dis = o[0] if o[0] < b["pivot"][0] - 1 else o[0] + s[0]
        w = m.nokta(b["name"], B.ic([dis, o[1] + 1, o[2] + 1]))
        uclar[b["name"]] = [-w[0], w[1], w[2]]
    yerde = all(0.5 <= u[1] <= 2.5 for u in uclar.values())
    disa = all(abs(u[0]) > 10 for u in uclar.values())
    simetrik = all(abs(uclar[a][0] + uclar["left" + a[5:]][0]) < 1e-6 and abs(uclar[a][1] - uclar["left" + a[5:]][1]) < 1e-6
                   and abs(uclar[a][2] - uclar["left" + a[5:]][2]) < 1e-6 for a in uclar if a.startswith("right"))
    arka = uclar["rightHindLeg"][2] > 8 and uclar["rightFrontLeg"][2] < -8
    return {"yerde": yerde, "disa": disa, "simetrik": simetrik, "arka_on": arka, "sayi": len(uclar)}

def min_y(g):
    return min(p[1] for pts, _ in B.kupler(B.Model(taban_kupler(g))) for p in pts)

def isik_olc(ad, y):
    """en parlak isiyan piksellerin kafanin on yuzunde olup olmadigi"""
    g = y["geo"]["minecraft:geometry"][0]
    kafa = kemikler(y["geo"])["head"]["cubes"][0]
    u, v = kafa["uv"]; s = kafa["size"]
    on = (u + s[2], v + s[2], u + s[2] + s[0], v + s[2] + s[1])
    tepe = max(max(q[:3]) for s_ in y["isik"] for q in s_)
    parlak = [(x, yy) for yy, sat in enumerate(y["isik"]) for x, p in enumerate(sat)
              if tepe > 0 and max(p[:3]) >= 0.9 * tepe]
    palet = palet_alani(ad)
    icinde = lambda r, x, yy: r[0] <= x < r[2] and r[1] <= yy < r[3]
    return all(icinde(on, x, yy) or icinde(palet, x, yy) for x, yy in parlak) and any(icinde(on, x, yy) for x, yy in parlak)

def doku_olc(ad, a, y):
    g = y["geo"]; tw = g["minecraft:geometry"][0]["description"]["texture_width"]
    pa = palet_alani(ad)
    alanlar, sorun = [], []
    for b in g["minecraft:geometry"][0]["bones"]:
        for c in b.get("cubes", []):
            if isinstance(c.get("uv"), list):
                u, v = c["uv"]; w, h, d = c["size"]
                for f, (uu, vv, ww, hh) in B.kutu_uv(u, v, w, h, d).items():
                    alanlar.append(((b["name"], tuple(c["uv"]), tuple(c["size"])), (uu, vv, uu + ww, vv + hh)))
            else:
                for f, x in c["uv"].items():
                    px, pyy = x["uv"]
                    if not (pa[0] <= px < pa[2] and pa[1] <= pyy < pa[3]) or y["renk"][pyy][px][3] != 255:
                        sorun.append(("kristal", b["name"], f))
    binme = 0
    for i, (ka, ra) in enumerate(alanlar):
        if not (0 <= ra[0] and ra[2] <= tw and 0 <= ra[1] and ra[3] <= tw):
            sorun.append(("disarda", ka[0]))
        for kb, rb in alanlar[i + 1:]:
            if ka[1:] == kb[1:]:
                continue                                    # ortak bacak (ayni uv, ayni boyut)
            if ra[0] < rb[2] and rb[0] < ra[2] and ra[1] < rb[3] and rb[1] < ra[3]:
                binme += 1
        if ra[0] < pa[2] and pa[0] < ra[2] and ra[1] < pa[3] and pa[1] < ra[3]:
            sorun.append(("palete_biniyor", ka[0]))
    saydam = sum(1 for (k, r) in alanlar if not ust(k[0]) and not (ad == "iskelet" and k[0] == "body")
                 for yy in range(int(r[1]), int(r[3])) for x in range(int(r[0]), int(r[2]))
                 if y["renk"][yy][x][3] != 255)
    return {"binme": binme, "sorun": sorun[:5], "saydam": saydam}

def buz_orani(y):
    """govde piksellerinden buzlu olanlarin orani: ustunu kabuk ortuyor ya da
    kendisi soluk kiragi rengi"""
    yz = BO.Yuzey(y["geo"])
    esi = yz.taban_esi(lambda P: not ust(P.kemik))
    ortulu = {b for k, b in esi.items() if b is not None and y["renk"][yz.liste[k].py][yz.liste[k].px][3] > 0}
    taban = [k for k, P in enumerate(yz.liste) if not ust(P.kemik)]
    def buzlu(k):
        c = y["renk"][yz.liste[k].py][yz.liste[k].px]
        return k in ortulu or (c[0] > 150 and c[2] > 200)
    return sum(1 for k in taban if buzlu(k)) / len(taban)

AGIZ_PIKSEL = ((4, 3), (5, 2), (6, 5), (7, 2))          # kafa on yuzu (8, 8)'den (j, i)

def agiz(y):
    """creeper'in agzi koyu; tislarken isiyor, normalde isimiyor"""
    return all(max(y["renk"][8 + j][8 + i][:3]) < 60 and max(y["tislama"][8 + j][8 + i][:3]) > 0
               and max(y["isik"][8 + j][8 + i][:3]) == 0 for j, i in AGIZ_PIKSEL)

def kabuk_sayisi(y):
    yz = BO.Yuzey(y["geo"])
    return sum(1 for P in yz.liste if ust(P.kemik) and y["renk"][P.py][P.px][3] > 0)

def kup_merkezi(g, kemik, sira, anim=None):
    """kemigin sira'inci kupunun (kup donusu dahil) dunyadaki merkezi"""
    t = json.loads(json.dumps(g))
    for b in t["minecraft:geometry"][0]["bones"]:
        b["cubes"] = [b["cubes"][sira]] if b["name"] == kemik else []
    pts = [p for ps, _ in B.kupler(B.Model(t, anim, 0)) for p in ps]
    return [sum(p[i] for p in pts) / len(pts) for i in range(3)]

ZOMBI_KOL = {"bones": {"rightArm": {"rotation": [-80, -5.73, 0]}, "leftArm": {"rotation": [-80, 5.73, 0]}}}

def sarkitlar(y, asama):
    """kollarin altindaki sarkitlar: dinlenmede geriye (+z), zombi durusunda asagi"""
    g = y["geo"]
    sonuc = []
    for kol in ("leftArm", "rightArm"):
        liste = [x for x in BO.kristaller("zombi", asama) if x[0] == kol]
        for i, (_, taban, yon, *_r) in enumerate(liste):
            if yon[2] > 0.9 and yon[1] < 0:
                kok = kup_merkezi(g, "kristal_" + kol, 3 * i)
                uc = kup_merkezi(g, "kristal_" + kol, 3 * i + 2)
                kok2 = kup_merkezi(g, "kristal_" + kol, 3 * i, ZOMBI_KOL)
                uc2 = kup_merkezi(g, "kristal_" + kol, 3 * i + 2, ZOMBI_KOL)
                sonuc.append({"dinlenmede_geri": uc[2] - kok[2] > 0.8, "durusta_asagi": uc2[1] - kok2[1] < -0.8})
    return sonuc

def kalp(y):
    """iskeletin buz kalbi: gogsun icinde, isiyor; kaburga aralari bos"""
    g = y["geo"]; kem = kemikler(g)
    kupler = kem.get("kristal_body", {}).get("cubes", [])
    ic = [c for c in kupler if c["uv"]["north"]["uv"] and max(y["isik"][c["uv"]["north"]["uv"][1]][c["uv"]["north"]["uv"][0]][:3]) >= 150]
    icerde = [c for c in ic if abs(c["pivot"][0]) < 3 and 12 < c["pivot"][1] < 24 and abs(c["pivot"][2]) < 1.5]
    govde = kem["body"]["cubes"][0]
    u, v = govde["uv"]; w, h_, d = govde["size"]
    bos = sum(1 for j in range(h_) for i in range(w) if y["renk"][v + d + j][u + d + i][3] == 0)
    return {"isiyan_kalp": len(icerde), "bos_aralik": bos}

def kabuklar(y):
    """iskeletin bilek ve incik kabuklari: yari saydam, kemigin ekseninde"""
    g = y["geo"]; kem = kemikler(g)
    sonuc = {}
    for ad in ("rightArm", "leftArm", "rightLeg", "leftLeg"):
        b = kem.get("buz_" + ad)
        if not b or not b.get("cubes"):
            sonuc[ad] = None
            continue
        c, k = b["cubes"][0], kem[ad]["cubes"][0]
        eksen = all(abs((c["origin"][i] + c["size"][i] / 2) - (k["origin"][i] + k["size"][i] / 2)) < 0.1 for i in (0, 2))
        yz = BO.Yuzey(g)
        alfa = [y["renk"][P.py][P.px][3] for P in yz.liste if P.kemik == "buz_" + ad and y["renk"][P.py][P.px][3] > 0]
        sonuc[ad] = {"eksen": eksen, "yari_saydam": sum(1 for a in alfa if a < 250) / max(1, len(alfa)), "piksel": len(alfa)}
    return sonuc

def isiyan_sayi(sat):
    return sum(1 for s in sat for p in s if max(p[:3]) > 0)

def yay_durus():
    """iskeletin eline takili yayin dinlenme ve atis durusundaki boyu"""
    sonuc = {}
    g_isk = BO.geometri("iskelet", 1)
    yay = BO.yay_geometri()
    for ad, anim in (("dinlenme", None), ("atis", {"bones": {"rightArm": {"rotation": [-90, -5.73, 0]}}})):
        govde = B.Model(g_isk, anim, 0)
        pts = [p for ps, _ in B.kupler(B.Model(yay), govde) for p in ps]
        aralik = [max(p[i] for p in pts) - min(p[i] for p in pts) for i in range(3)]
        sonuc[ad] = [round(v, 2) for v in aralik]
    return sonuc

out = {"bulgu": [], "olcu": {}, "doku": {}, "isik": {}, "asama": {}}
yollar = BO.uret(os.path.join(gec, "a"))
BD.BULGU.clear()
for p in sorted(glob.glob(os.path.join(gec, "a", "*.geo.json"))):
    BD.geometri_dogrula(p)
out["bulgu"] = [n for _, n in BD.BULGU]
out["dosya_sayisi"] = len(yollar)
out["kimlikler"] = sorted(json.load(open(p))["minecraft:geometry"][0]["description"]["identifier"]
                          for p in glob.glob(os.path.join(gec, "a", "*.geo.json")))

out["olcu"]["aktor_farkli"] = aktor_esit(BO)
out["olcu"]["orumcek"] = orumcek_bacak(BO)
out["olcu"]["min_y"] = {ad: round(min_y(BO.geometri(ad, 1)), 3) for ad in BO.ASAMALAR}
isk = kemikler(BO.geometri("iskelet", 1))
out["olcu"]["iskelet_kol"] = [isk[k]["cubes"][0]["size"] for k in ("rightArm", "leftArm", "rightLeg", "leftLeg")]
out["olcu"]["iskelet_esya"] = isk["rightItem"]["pivot"]

veri = {}
for ad, n in BO.ASAMALAR.items():
    for a in range(1, n + 1):
        y = BO.yaratik(ad, a)
        veri[(ad, a)] = y
        out["doku"]["%s_%d" % (ad, a)] = doku_olc(ad, a, y)
        out["isik"]["%s_%d" % (ad, a)] = isik_olc(ad, y)
cr = veri[("creeper", 2)]
out["tislama"] = {
    "kapsar": all(max(cr["tislama"][yy][x][:3]) > 0 for yy, s in enumerate(cr["isik"]) for x, p in enumerate(s)
                  if max(p[:3]) > 0),
    "agiz": agiz(cr),
}
z1 = veri[("zombi", 1)]
yz = BO.Yuzey(z1["geo"])
halka = [P for P in yz.liste if 1.0 <= BO.uzak(P.p, BO.ISIRIK) <= 2.0]
out["damar_isirikta"] = sum(1 for P in halka if max(z1["isik"][P.py][P.px][:3]) > 0) >= 4
out["asama"]["zombi_buz"] = [round(buz_orani(veri[("zombi", a)]), 3) for a in (1, 2, 3)]
out["asama"]["zombi_damar"] = [isiyan_sayi(veri[("zombi", a)]["isik"]) for a in (1, 2, 3)]
out["asama"]["zombi_kabuk"] = [kabuk_sayisi(veri[("zombi", a)]) for a in (1, 2, 3)]
out["sarkit"] = sarkitlar(veri[("zombi", 3)], 3)
out["kalp"] = [kalp(veri[("iskelet", a)]) for a in (1, 2)]
out["kabuk"] = kabuklar(veri[("iskelet", 2)])
out["asama"]["kristal"] = {ad: [sum(len(b.get("cubes", [])) for b in kemikler(veri[(ad, a)]["geo"]).values()
                                    if b["name"].startswith("kristal_")) for a in range(1, n + 1)]
                           for ad, n in BO.ASAMALAR.items()}
out["yay"] = yay_durus()
out["yay_pivot"] = kemikler(BO.yay_geometri())["rightItem"]["pivot"]

ikinci = BO.uret(os.path.join(gec, "b"))
out["ayni"] = all(open(p1, "rb").read() == open(p2, "rb").read() for p1, p2 in zip(sorted(yollar), sorted(ikinci)))
import re
kaynak = open("arac/buz_ordu.py", encoding="utf-8").read()
acilislar = re.findall(r"open\\(([^\\n]*)", kaynak)
out["okumuyor"] = (all(re.search(r"[\\x22\\x27]wb?[\\x22\\x27]", a) for a in acilislar) and len(acilislar) >= 2
                   and not re.search(r"^\\s*(import|from)\\s+(PIL|zipfile)", kaynak, re.M)
                   and "KOYLU_DOKU" not in kaynak and "client.jar" not in kaynak)

# 8. mutasyon
mut = {}
bo = importlib.reload(BO)
bo.JAVA["zombi"][3] = ("right_arm", (-5, 2, 0), None, [((-3, -2, -2, 3, 12, 4), (40, 16), 0.0, False)])
mut["kol"] = aktor_esit(bo)
bo = importlib.reload(BO)
bo.JAVA["orumcek"][3] = ("right_hind_leg", (-4, 15, 2), (0, bo.PI4, bo.PI4), [bo._OB_SAG])
mut["bacak"] = orumcek_bacak(bo)["yerde"]
bo = importlib.reload(BO)
bo.CAMGOBEGI = (1, 1, 1)
y = bo.yaratik("iskelet", 1)
mut["goz"] = isik_olc("iskelet", y)
bo = importlib.reload(BO)
bo.KYUZ = bo.KYUZ[:4] + ["........"] * 4
y = bo.yaratik("creeper", 2)
mut["agiz"] = agiz(y)
bo = importlib.reload(BO)
bo.ACIK_CAM = bo.TURKUAZ = (0, 0, 0)                  # kristal isimasi sonuk
mut["kalp"] = kalp(bo.yaratik("iskelet", 1))["isiyan_kalp"]
bo = importlib.reload(BO)
bo.ZOMBI_ASAMA[2] = bo.ZOMBI_ASAMA[2][:4] + (0.0, 0.0, 0.0) + bo.ZOMBI_ASAMA[2][7:]
mut["kabuk"] = kabuk_sayisi(bo.yaratik("zombi", 2))
importlib.reload(BO)
out["mut"] = mut
print(json.dumps(out))
`;
try {
  const r = JSON.parse(execFileSync("python3", ["-B", "-c", py, gecici], { encoding: "utf8", maxBuffer: 1 << 26 }));

  console.log("1. bicim");
  kontrol("uretilen her geometri bicim_dogrula'dan bulgusuz geciyor", r.bulgu.length === 0, r.bulgu.slice(0, 3).join(" | "));
  kontrol("dokuz yaratik + yay + ok: kimlikler ayri", r.kimlikler.length === 11 && new Set(r.kimlikler).size === 11,
          r.kimlikler.join(","));

  console.log("2. olcu: oyunun model kodundan");
  kontrol("zombinin kutulari ve pivotlari aktorunkiyle (insan modeli) bire bir ayni",
          r.olcu.aktor_farkli.length === 0, JSON.stringify(r.olcu.aktor_farkli));
  kontrol("dordu de zemine basiyor (orumcek bacaklari 0.3 px havada, oyundaki gibi; zombinin sol bacagi 0.01 sisik)",
          Object.values(r.olcu.min_y).every((v) => v > -0.02 && v < 0.5), JSON.stringify(r.olcu.min_y));
  kontrol("iskeletin kol ve bacaklari 2x12x2, esya noktasi 1 px iceride",
          r.olcu.iskelet_kol.every((s) => JSON.stringify(s) === "[2,12,2]") &&
          JSON.stringify(r.olcu.iskelet_esya) === "[-5,13.3,0.5]", JSON.stringify(r.olcu.iskelet_esya));
  const o = r.olcu.orumcek;
  kontrol("orumcegin 8 bacagi disa uzaniyor, uclari zeminde", o.sayi === 8 && o.yerde && o.disa, JSON.stringify(o));
  kontrol("arka bacaklar geriye, on bacaklar one; sag-sol simetrik", o.arka_on && o.simetrik);

  console.log("3. doku");
  const d = Object.entries(r.doku);
  kontrol("kutu UV'leri dokuda, birbirine ve palete binmiyor", d.every(([, v]) => v.binme === 0 && v.sorun.length === 0),
          JSON.stringify(d.filter(([, v]) => v.binme || v.sorun.length)));
  kontrol("govde kutularinin her pikseli opak (ust katman ve kaburga aralari haric)", d.every(([, v]) => v.saydam === 0),
          JSON.stringify(d.map(([k, v]) => k + ":" + v.saydam)));

  console.log("4. isima");
  kontrol("en parlak pikseller kafanin on yuzunde (camgobegi gozler)", Object.values(r.isik).every(Boolean),
          JSON.stringify(r.isik));
  kontrol("creeper tislarken normal haritanin her isiyani da isiyor", r.tislama.kapsar);
  kontrol("creeper'in agzi koyu; tislarken isiyor, normalde isimiyor", r.tislama.agiz);
  kontrol("zombinin damari isiriktan basliyor", r.damar_isirikta);

  console.log("5. asama");
  const zb = r.asama.zombi_buz, zd = r.asama.zombi_damar;
  kontrol("zombide buz asamayla artiyor, 3. asama bile zombi olarak okunuyor (< %75)",
          zb[0] < zb[1] && zb[1] < zb[2] && zb[0] < 0.2 && zb[2] < 0.75, JSON.stringify(zb));
  kontrol("zombide isiyan damar asamayla artiyor", zd[0] < zd[1] && zd[1] < zd[2], JSON.stringify(zd));
  const zk = r.asama.zombi_kabuk;
  kontrol("zombinin buz kabugu 1. asamada yok, sonra buyuyor", zk[0] === 0 && zk[1] > 0 && zk[2] > zk[1], JSON.stringify(zk));
  kontrol("her yaratikta kristal asamayla artiyor",
          Object.values(r.asama.kristal).every((k) => k.every((v, i) => i === 0 || v > k[i - 1])),
          JSON.stringify(r.asama.kristal));

  console.log("5b. kabuk, sarkit ve kalp");
  kontrol("zombinin kol sarkitlari dinlenmede geriye, zombi durusunda asagi sarkiyor",
          r.sarkit.length >= 4 && r.sarkit.every((s) => s.dinlenmede_geri && s.durusta_asagi), JSON.stringify(r.sarkit));
  kontrol("iskeletin kaburga aralari bos (gogus kafesi)", r.kalp.every((k) => k.bos_aralik >= 12),
          JSON.stringify(r.kalp.map((k) => k.bos_aralik)));
  kontrol("buz kalbi gogsun icinde ve isiyor (2. asamada daha buyuk)",
          r.kalp[0].isiyan_kalp >= 3 && r.kalp[1].isiyan_kalp > r.kalp[0].isiyan_kalp,
          JSON.stringify(r.kalp.map((k) => k.isiyan_kalp)));
  const kb = Object.values(r.kabuk);
  kontrol("iskeletin dort kabugu kemigin ekseninde ve yari saydam",
          kb.every((k) => k && k.eksen && k.piksel > 20 && k.yari_saydam > 0.8), JSON.stringify(r.kabuk));

  console.log("6. buz yayi");
  kontrol("yay iskeletin eline (rightItem) oturuyor", JSON.stringify(r.yay_pivot) === "[-5,13.3,0.5]");
  kontrol("dinlenmede yatay (boyu z'de), atis durusunda dik (boyu y'de)",
          r.yay.dinlenme[2] > 18 && r.yay.dinlenme[1] < 6 && r.yay.atis[1] > 18 && r.yay.atis[2] < 6,
          JSON.stringify(r.yay));

  console.log("7. uretim");
  kontrol("ayni cikti iki kez bire bir ayni", r.ayni);
  kontrol("uret() 35 dosya yaziyor", r.dosya_sayisi === 35, String(r.dosya_sayisi));
  kontrol("uretec dosya okumuyor (Mojang dokusu yok, her piksel kodla)", r.okumuyor);

  console.log("8. mutasyon: test isiriyor");
  kontrol("kol genisligi bozulunca aktor esitligi dusuyor", JSON.stringify(r.mut.kol) === '["rightArm"]', JSON.stringify(r.mut.kol));
  kontrol("bacak donusunun isareti bozulunca zemin kontrolu dusuyor", r.mut.bacak === false);
  kontrol("goz isimasi bozulunca isima kontrolu dusuyor", r.mut.goz === false);
  kontrol("creeper'in agzi silinince tislama kontrolu dusuyor", r.mut.agiz === false);
  kontrol("kalbin isimasi sonunce kalp kontrolu dusuyor", r.mut.kalp < 3, String(r.mut.kalp));
  kontrol("2. asamanin kabugu kalkinca kabuk kontrolu dusuyor", r.mut.kabuk === 0, String(r.mut.kabuk));
} finally {
  rmSync(gecici, { recursive: true, force: true });
}
console.log(hata ? "\n>>> SORUN VAR" : "\n>>> Buz ordusu: olculer oyundan, deriler kodla, asamalar ve isima yerinde");
process.exit(hata ? 1 : 0);
