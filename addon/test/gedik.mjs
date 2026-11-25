/* CREEPER PATLAMASI VE SUR GEDIGI -- arac/gedik.py + mekan.ZamanliMekan   2026-11-25

   Kullanici: "Sirada 3. madden devam et" (surda creeper patlamasi ve gedik).
   Blender gerekmez.

   1. oyunun sabitleri: 1352 isin, 0,3 blok adim, adim basina 0,225 kayip,
      guc yaricap * (0,7..1,3); direncler (tas 6, cimen 0,6, toprak 0,5,
      ahsap basamak = tahta 3, tas duvar = tas tugla 6, kutuk 2, yaprak 0,2);
      olculmemis blok HATA
   2. tek patlama: direncsiz cicek katmaninda menzil 4,5 bloktan kisa;
      toprakta derin cukur; 3 kat tas surun en arkasina tek creeper
      ulasmiyor
   3. hanedanin dogu suru: 4 creeper 3 katlik surda en az 2 genis, 2 yuksek
      gecit aciyor; ilk ikisi acmiyor
   4. zaman: patlamadan once sur yerinde, sonra yok; moloz 0,3 sn sonra,
      havada asili ya da blogun icinde moloz yok; zeminin alti dolu; ufuk
      zemin kenarina cekildi; ortak Mekan degismedi; gorus gedikten geciyor
   5. zaman cizelgesi: creeper tisladiktan sonra patlar ve kaybolur, patlama
      + toz efekti, yakindaki creeper itilir; patlayanin inis sesi yok
   6. hata: tislamadan patlama, noktada olmayan creeper, creeper olmayan,
      blogun icindeki nokta cizimden once HATA
   7. mutasyon: adim kaybi, tasin direnci ve bas yuksekligi denetimi
      bozulunca ilgili kontrol dusuyor */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, sys, os, math, copy
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
os.chdir(${JSON.stringify(KOK)})
import gedik as G
import mekan as MK
import blender_film as BF
import bedrock_onizleme as B
import blok_kur
out = {}

# 1. sabitler
out["sabit"] = {"isin": len(G.ISINLAR), "adim": G.ADIM, "kayip": G.ADIM_KAYIP, "taban": G.GUC_TABAN,
                "sacilim": G.GUC_SACILIM, "sisme": G.SISME_TIK, "yaricap": G.CREEPER_YARICAP}
out["direnc"] = {t: G.direnc(t) for t in ("stone_bricks", "cobblestone", "grass_block", "dirt", "gravel",
                                           "oak_stairs", "stone_brick_wall", "oak_log", "oak_leaves", "poppy",
                                           "water", "spruce_slab")}
try:
    G.direnc("obsidian")
    out["olculmemis"] = False
except ValueError:
    out["olculmemis"] = True

# 2. tek patlama (yapay dunya)
def toprak(p):
    return "dirt" if p[1] < 0 else None
def cicek(p):
    return "poppy" if p[1] == 0 else None       # direnc 0: menzili adim kaybi belirler
def sur_dunya(p):
    if p[1] < 0:
        return "dirt"
    if 1 <= p[0] <= 3 and 0 <= p[1] <= 4 and -4 <= p[2] <= 4:
        return "stone_bricks"
    return None
def tek(dunya=toprak, merkez=(0.5, 0.0, 0.5), tohumlar=(1, 2, 3, 4, 5)):
    k = set()
    for s in tohumlar:
        k |= G.kirilan_bloklar(dunya, merkez, 3.0, s)
    return k
def menzil(tohumlar=(1, 2, 3, 4, 5)):
    k = tek(cicek, (0.5, 0.5, 0.5), tohumlar)
    return round(max(math.hypot(p[0] + 0.5 - 0.5, p[2] + 0.5 - 0.5) for p in k), 2)
k = tek()
out["tek"] = {"menzil": menzil(), "derin": -min(p[1] for p in k),
              "sayi": len(G.kirilan_bloklar(toprak, (0.5, 0.0, 0.5), 3.0, 1))}
k = tek(sur_dunya, (0.4, 0.0, 0.5))
out["sur"] = {"dis": sum(1 for p in k if p[0] == 1), "arka": sum(1 for p in k if p[0] == 3)}

# 3. hanedanin dogu suru
DORT = [(86.4, -0.5), (86.4, -2.5), (84.5, -1.5), (83.5, -1.5)]
def sen(noktalar):
    return {"mekan": "hanedan", "olaylar": [{"t": 2.0 + 2.0 * i, "aktor": "c%d" % i, "patla": list(n)}
                                           for i, n in enumerate(noktalar)]}
def acik(Z, t, p):
    q = Z._blok(p, t)
    return q is None or blok_kur.sekil(q["t"]) in MK.GECIRGEN
def gecit(Z, t):
    zz = [z for z in range(-6, 7) if all(acik(Z, t, (x, y, z)) for x in (83, 84, 85) for y in (1, 2))]
    en = cur = 0
    for i, z in enumerate(zz):
        cur = cur + 1 if i and z == zz[i - 1] + 1 else 1
        en = max(en, cur)
    return en
Z4 = MK.yukle(sen(DORT))
Z2 = MK.yukle(sen(DORT[:2]))
out["gedik"] = {"dort": gecit(Z4, 12.0), "iki": gecit(Z2, 12.0), "once": gecit(Z4, 1.0),
                "kirilan": [len(e["kirilan"]) for e in Z4.patlamalar], "moloz": [len(e["moloz"]) for e in Z4.patlamalar]}

# 4. zaman
e0 = Z4.patlamalar[0]
p0 = [p for p in e0["kirilan"] if e0["turler"][p] == "stone_bricks"][0]
mz = Z4.patlamalar[0]["moloz"][0]
asili = [p for e in Z4.patlamalar for p in e["moloz"] if not (Z4._dolu((p[0], p[1] - 1, p[2]), 12.0))]
ic_ice = [p for p, ivs in Z4.gelis.items() for a, b, q in ivs
          if Z4.harita.get(p) is not None and Z4.kalkis.get(p, math.inf) > a]
taban = MK.yukle({"mekan": "hanedan"})
out["zaman"] = {"once": Z4._blok(p0, 1.9) is not None, "sonra": Z4._blok(p0, 2.1) is None,
                "moloz_once": Z4._blok(mz, 2.25) is None, "moloz_sonra": Z4._blok(mz, 2.35) is not None,
                "asili": len(asili), "ic_ice": len(ic_ice), "yer_alti": len(Z4.yer_alti),
                "ufuk": [taban.ufuk["r"], Z4.ufuk["r"]], "taban_sabit": len(taban.harita) == len(Z4.harita) and not hasattr(taban, "kalkis"),
                "gorus": [Z4.gorus_acik((90.0, -1.5, 2.0), (78.0, -1.5, 2.0), t=1.0),
                          Z4.gorus_acik((90.0, -1.5, 2.0), (78.0, -1.5, 2.0), t=12.0)],
                "gruplar": len(Z4.cizim_gruplari()[1])}

# 5. zaman cizelgesi
setler = B.oku(BF.HAREKET)["setler"]
anims = {}
anims.update(B.oku(BF.ANIM_WOM)["animations"]); anims.update(B.oku(BF.ANIM_AKTOR)["animations"])
anims.update(BF.film_pozlari(True))
SEN = {"fps": 24, "sure": 7.0, "akici": True, "mekan": "hanedan",
       "aktorler": {"c0": {"yaratik": "creeper", "asama": 2, "konum": [95.0, -0.5], "bak": 90, "kat": 1.0},
                    "c1": {"yaratik": "creeper", "asama": 1, "konum": [97.0, -2.5], "bak": 90, "kat": 1.0}},
       "olaylar": [{"t": 0.3, "aktor": "c0", "git": [86.4, -0.5]}, {"t": 2.6, "aktor": "c0", "tisla": 1.5},
                   {"t": 4.1, "aktor": "c0", "patla": [86.4, -0.5]},
                   {"t": 1.6, "aktor": "c1", "git": [86.4, -2.5]}, {"t": 4.6, "aktor": "c1", "tisla": 1.5},
                   {"t": 6.1, "aktor": "c1", "patla": [86.4, -2.5]}],
       "kamera": [{"t": 0.0, "aci": "elle", "kam": [97.0, -11.0, 5.0], "bak": [85.0, -1.0, 1.5], "lens": 26}]}
def kos(s):
    return BF.zaman_cizelgesi(s, setler, anims)
akt, ef, _y, sar = kos(SEN)
def an(a, t):
    return [k for k in a.kayit if abs(k["t"] - t) < 0.021][0]
c1_once, c1_sonra = an(akt["c1"], 4.05), an(akt["c1"], 4.25)
patlayan_inis = [e for e in ef if e["tur"] == "dusus" and e.get("ses") == "inis"
                 and any(abs(e["nokta"][0] - akt[c].kayit[-1]["x"]) < 0.3 and abs(e["nokta"][1] - akt[c].kayit[-1]["y"]) < 0.3
                         for c in ("c0",)) and e["t"] > 4.1]
out["cizelge"] = {"gorunur": [an(akt["c0"], 4.05)["gorunur"], an(akt["c0"], 4.2)["gorunur"]],
                  "efekt": sorted({(e["tur"], e.get("kim")) for e in ef if e["tur"] in ("patlama", "toz")}),
                  "doku": sorted({e["doku"] for e in ef if e["tur"] == "patlama"}),
                  "itildi": round(math.hypot(c1_sonra["x"] - c1_once["x"], c1_sonra["y"] - c1_once["y"]), 2),
                  "sarsinti": len(sar), "patlayan_inis": len(patlayan_inis)}

# 6. hata
def hata_mi(degis):
    s = copy.deepcopy(SEN)
    degis(s)
    try:
        kos(s)
        return False
    except ValueError:
        return True
def tislasiz(s):
    s["olaylar"] = [o for o in s["olaylar"] if not (o.get("aktor") == "c0" and "tisla" in o)]
def yanlis_yer(s):
    for o in s["olaylar"]:
        if o.get("aktor") == "c0" and "patla" in o:
            o["patla"] = [88.4, -0.5]
def zombi(s):
    s["aktorler"]["c0"] = {"yaratik": "zombi", "asama": 1, "konum": [95.0, -0.5], "bak": 90, "kat": 1.0}
def blok_ici():
    """yalniz bas yuksekligi denetimi: surun icinde (84.5, -0.5) ayaklar 1.0'da"""
    try:
        MK.yukle({"mekan": "hanedan", "olaylar": [{"t": 2.0, "aktor": "c0", "patla": [84.5, -0.5, 1.0]}]})
        return False
    except ValueError:
        return True
out["hata"] = [hata_mi(tislasiz), hata_mi(yanlis_yer), hata_mi(zombi), blok_ici()]

# 7. mutasyon
mut = {}
eski = G.ADIM_KAYIP
G.ADIM_KAYIP = 0.1
try:
    mut["kayip"] = menzil()
finally:
    G.ADIM_KAYIP = eski
eski = G.DIRENC["stone_bricks"]
G.DIRENC["stone_bricks"] = 0.0
try:
    mut["direnc"] = sum(1 for p in tek(sur_dunya, (0.4, 0.0, 0.5)) if p[0] == 3)
finally:
    G.DIRENC["stone_bricks"] = eski
eski = MK.ZamanliMekan._bas_dolu
MK.ZamanliMekan._bas_dolu = lambda self, *a: None
MK._onbellek = {k: v for k, v in MK._onbellek.items() if isinstance(k, str)}
MK._hizli.clear()
try:
    mut["bas"] = blok_ici()
finally:
    MK.ZamanliMekan._bas_dolu = eski
    MK._onbellek = {k: v for k, v in MK._onbellek.items() if isinstance(k, str)}
    MK._hizli.clear()
out["mut"] = mut
print(json.dumps(out))
`;
const r = JSON.parse(execFileSync("python3", ["-B", "-c", py], { encoding: "utf8", maxBuffer: 1 << 24 }));

console.log("1. oyunun sabitleri");
const s = r.sabit;
kontrol("1352 isin, adim 0,3, kayip 0,225, guc yaricap * (0,7..1,3), sisme 30 tik, yaricap 3",
        s.isin === 1352 && Math.abs(s.adim - 0.3) < 1e-6 && Math.abs(s.kayip - 0.225) < 1e-6 && s.taban === 0.7 &&
        s.sacilim === 0.6 && s.sisme === 30 && s.yaricap === 3, JSON.stringify(s));
const d = r.direnc;
kontrol("direnc: tas 6, cimen 0,6, toprak 0,5, cakil 0,6, ahsap basamak 3, tas duvar 6, kutuk 2, yaprak 0,2, cicek 0, su 100",
        d.stone_bricks === 6 && d.cobblestone === 6 && d.grass_block === 0.6 && d.dirt === 0.5 && d.gravel === 0.6 &&
        d.oak_stairs === 3 && d.stone_brick_wall === 6 && d.oak_log === 2 && d.oak_leaves === 0.2 && d.poppy === 0 &&
        d.water === 100 && d.spruce_slab === 3, JSON.stringify(d));
kontrol("olculmemis blok tahmin edilmiyor, HATA", r.olculmemis);

console.log("2. tek patlama");
kontrol("direncsiz cicek katmaninda menzil 4,5 bloktan kisa (3,9 / (0,225 + 0,09) * 0,3 = 3,7)", r.tek.menzil < 4.5,
        JSON.stringify(r.tek));
kontrol("toprakta derin cukur (en az 2 blok)", r.tek.derin >= 2, JSON.stringify(r.tek));
kontrol("3 kat tas surun dis kati kiriliyor, arka kata tek creeper ulasmiyor (5 tohum)",
        r.sur.dis > 0 && r.sur.arka === 0, JSON.stringify(r.sur));

console.log("3. hanedanin dogu suru");
const g = r.gedik;
kontrol("4 creeper 3 katlik surda en az 2 genis, 2 yuksek gecit aciyor", g.dort >= 2, JSON.stringify(g));
kontrol("ilk iki creeper gecit acmiyor, patlamadan once sur kapali", g.iki === 0 && g.once === 0,
        JSON.stringify([g.iki, g.once]));

console.log("4. zaman");
const z = r.zaman;
kontrol("patlamadan once sur blogu yerinde, sonra yok", z.once && z.sonra, JSON.stringify([z.once, z.sonra]));
kontrol("moloz patlamadan 0,3 sn sonra beliriyor", z.moloz_once && z.moloz_sonra,
        JSON.stringify([z.moloz_once, z.moloz_sonra]));
kontrol("havada asili ya da blogun icinde moloz yok", z.asili === 0 && z.ic_ice === 0,
        JSON.stringify([z.asili, z.ic_ice]));
kontrol("cukur bosluga acilmiyor (zeminin alti dolu), ufuk zemin kenarina cekildi",
        z.yer_alti > 0 && z.ufuk[0] === 84 && z.ufuk[1] > 105, JSON.stringify([z.yer_alti, z.ufuk]));
kontrol("ortak Mekan degismedi (onbellekteki taban)", z.taban_sabit);
kontrol("gorus surdan gecmiyor, gedik acilinca geciyor (kamera denetimi o ani biliyor)",
        z.gorus[0] === false && z.gorus[1] === true, JSON.stringify(z.gorus));
kontrol("cizim gruplari var (kalkan bloklar ve moloz ayri nesne)", z.gruplar >= 4, String(z.gruplar));

console.log("5. zaman cizelgesi");
const c = r.cizelge;
kontrol("creeper tisladiktan sonra patlayinca kayboluyor", c.gorunur[0] === true && c.gorunur[1] === false,
        JSON.stringify(c.gorunur));
kontrol("her patlamada patlama + toz efekti ve sarsinti; ucan parca surun dokusu",
        c.efekt.length === 4 && c.sarsinti === 2 && JSON.stringify(c.doku) === '["stone_bricks.png"]',
        JSON.stringify([c.efekt, c.sarsinti, c.doku]));
kontrol("yakindaki creeper patlamayla itiliyor", c.itildi > 0.2, String(c.itildi));
kontrol("patlayan creeperin gorunmez govdesi cukura dusunce inis sesi yok", c.patlayan_inis === 0,
        String(c.patlayan_inis));

console.log("6. hata");
kontrol("tislamadan patlama, noktada olmayan creeper, zombi, blogun icinde nokta: cizimden once HATA",
        r.hata.every(Boolean), JSON.stringify(r.hata));

console.log("7. mutasyon: test isiriyor");
kontrol("adim kaybi 0,1 olunca menzil kontrolu dusuyor", r.mut.kayip >= 4.5, String(r.mut.kayip));
kontrol("tasin direnci 0 olunca arka kat kiriliyor", r.mut.direnc > 0, String(r.mut.direnc));
kontrol("bas yuksekligi denetimi kalkinca blogun icindeki nokta HATA vermiyor", r.mut.bas === false,
        String(r.mut.bas));

console.log(hata ? "\n>>> SORUN VAR" : "\n>>> Gedik: oyunun patlamasiyla kiriliyor, moloz ve toz yerinde, creeper patlayip kayboluyor");
process.exit(hata ? 1 : 0);
