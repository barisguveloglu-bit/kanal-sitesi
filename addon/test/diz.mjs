/* DIZ -- filmde bacak iki parca, diz Epic Fight'inki            v7.99.15

   Kullanici (2026-10-18): onizlemede "ayaklari karakterin yerden
   kesiliyor", sonra "Evet, filme diz ekle". Bedrock bacagi dizsiz tek
   kutu; Epic Fight'in bacagi iki parca ve WoM vuruslarinda dizler 20-100
   derece bukuk. arac/wom_cevir.py --diz uylugu dize, baldiri ayaga
   bakacak sekilde ayrica cevirir; film araci "diz": true aktorde bu
   kanallari duz animasyonun ustune bindirir (arac/diz_model.py).

   1. geometri: ana kemikler aynen, bacak ve pantolon ikiye bolunmus,
      dinlenmede dis yuzey ve DOKU bire bir eskisi (yuz yuz, nokta nokta)
   2. veri: her bacakli WoM animasyonunun dizli hali var; diz acisi Epic
      Fight'inkiyle ayni; diz hic geriye bukulmuyor; taban hicbir karede
      zemine girmiyor ve karelerin cogunda yerde
   3. film araci: ayar, bindirme, zaman cizelgesi dizden etkilenmiyor
   4. mutasyon: diz kanali silinince, kok duz bacaginkiyle degisince ve
      doku yarilari yer degisince ilgili olcu dusuyor                 */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, sys, math, copy
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import bedrock_onizleme as B
import diz_model as DM
import blender_film as F
geo0 = B.oku("Simsek_Kol_Kaynak/models/entity/aktor.geo.json")
geo = DM.dizli_geo(geo0)
k0 = {b["name"]: b for b in geo0["minecraft:geometry"][0]["bones"]}
k1 = {b["name"]: b for b in geo["minecraft:geometry"][0]["bones"]}
out = {}

# ---- 1. geometri ----
out["yeni"] = sorted(set(k1) - set(k0))
out["ebeveyn"] = {a: (k1[a].get("parent"), k1[a]["pivot"][1]) for a in out["yeni"]}
ana = [a for a in k0 if a not in ("rightLeg", "leftLeg", "rightPants", "leftPants")]
out["ana_aynen"] = all(k0[a] == k1[a] for a in ana) and all(
    {x: k0[a][x] for x in k0[a] if x != "cubes"} == {x: k1[a][x] for x in k1[a] if x != "cubes"}
    for a in ("rightLeg", "leftLeg", "rightPants", "leftPants"))

def yuzler(geo_, adlar):
    """[(yuz adi, 4 kose (ic uzay, dinlenme), 4 uv)]"""
    m = B.Model(geo_)
    tek = {"minecraft:geometry": [{"description": {"texture_width": m.tw, "texture_height": m.th},
                                   "bones": [dict(m.kemik[a], parent=None) for a in adlar]}]}
    return B.kupler(B.Model(tek))

def uv_bul(quads, p):
    """p noktasinin uzerinde oldugu yuzden UV (bilineer, dortgen eksen hizali)."""
    for pts, uv in quads:
        a, b, c, d = pts
        # yuz duzlemi: a, b, d; p'nin (s, t) koordinati
        e1 = [b[i] - a[i] for i in range(3)]; e2 = [d[i] - a[i] for i in range(3)]
        v = [p[i] - a[i] for i in range(3)]
        n = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]]
        nn = math.sqrt(sum(x*x for x in n))
        if nn < 1e-9 or abs(sum(v[i]*n[i] for i in range(3))) / nn > 1e-6:
            continue
        L1 = sum(x*x for x in e1); L2 = sum(x*x for x in e2)
        s = sum(v[i]*e1[i] for i in range(3)) / L1; t = sum(v[i]*e2[i] for i in range(3)) / L2
        if -1e-9 <= s <= 1 + 1e-9 and -1e-9 <= t <= 1 + 1e-9:
            # uv: a -> uv[0], b -> uv[1], d -> uv[3]
            return [uv[0][j] + s * (uv[1][j] - uv[0][j]) + t * (uv[3][j] - uv[0][j]) for j in range(2)]
    return None

def uv_farki(geo_b):
    en, eksik = 0.0, 0
    for eski, yeni in (("rightLeg", ("rightLeg", "rightLegAlt")), ("leftLeg", ("leftLeg", "leftLegAlt")),
                       ("rightPants", ("rightPants", "rightPantsAlt")), ("leftPants", ("leftPants", "leftPantsAlt"))):
        q0 = yuzler(geo0, [eski]); q1 = yuzler(geo_b, list(yeni))
        for pts, uv in q0:
            a, b, c, d = pts
            for i in range(1, 8):
                for j in range(1, 12):
                    s, t = i / 8.0, j / 12.0
                    p = [a[k] + s * (b[k] - a[k]) + t * (d[k] - a[k]) for k in range(3)]
                    if abs(p[1] - 6.0) < 1e-6:
                        continue
                    u0 = uv_bul([(pts, uv)], p); u1 = uv_bul(q1, p)
                    if u1 is None:
                        eksik += 1; continue
                    en = max(en, abs(u0[0] - u1[0]) * 64, abs(u0[1] - u1[1]) * 64)
    return en, eksik
out["uv_en"], out["uv_eksik"] = uv_farki(geo)
def katman_uc(geo_, ad):
    c = {b["name"]: b for b in geo_["minecraft:geometry"][0]["bones"]}[ad]["cubes"][0]
    i = c.get("inflate", 0)
    return [c["origin"][1] - i, c["origin"][1] + c["size"][1] + i]
out["katman"] = [katman_uc(geo, "rightPants"), katman_uc(geo, "rightPantsAlt")]

# ---- 2. veri ----
std = B.oku("kaynak_anim/wom/wom_kilic.animation.json")["animations"]
setler = B.oku("kaynak_anim/wom/wom_kilic.hareket.json")["setler"]
diz = B.oku("kaynak_anim/wom/wom_kilic_diz.animation.json")["animations"]
iz = B.oku("kaynak_anim/wom/wom_kilic_diz.iz.json")["animasyonlar"]
beklenen = []
for sad, s in setler.items():
    adlar = ([s["durus"]] if s.get("durus") else []) + [x["anim"] for x in s["saldirilar"]]
    beklenen += [a for a in adlar if "rightLeg" in std[a]["bones"]]
out["beklenen"] = len(beklenen); out["eksik"] = [a for a in beklenen if a not in diz]
tur = {v["taban"]: k for k, v in setler.items() if v.get("taban")}
out["turetilmis_esit"] = all(diz["animation.wom.%s.%s" % (k, a.split(".")[-1])] == diz[a]
                             for t, k in tur.items() for a in diz if a.startswith("animation.wom.%s." % t))
taban_kos = lambda m, kem, ad: [m.nokta(ad, [-(c["origin"][0] + c["size"][0] * u), c["origin"][1], c["origin"][2] + c["size"][2] * w])[1]
                               for c in [kem[ad]["cubes"][0]] for u in (0, 1) for w in (0, 1)]
def olc(diz_, adlar=None):
    r = {"kare": 0, "gomulu": 0.0, "yerde": 0, "fark": [], "geri": 0}
    birlesik = DM.bindir(std, diz_)
    for ad in (adlar or sorted(diz_)):
        if ad not in iz: continue
        an = birlesik[ad]
        for t, bR, bL in iz[ad]:
            if t > an["animation_length"] + 1e-6: continue
            m = B.Model(geo, an, t)
            y = [min(taban_kos(m, k1, x)) for x in ("rightLegAlt", "leftLegAlt")]
            r["kare"] += 1; r["gomulu"] = max(r["gomulu"], -min(y)); r["yerde"] += min(y) <= 0.5
            for kb, ef in (("rightLegAlt", bR), ("leftLegAlt", bL)):
                R = B.bb_mat(B.deger(an["bones"][kb]["rotation"], t) if "rotation" in an["bones"].get(kb, {}) else [0, 0, 0])
                b = math.degrees(math.acos(max(-1.0, min(1.0, R[1][1]))))
                r["fark"].append(abs(b - ef))
                r["geri"] += R[2][1] > 0.05
    f = sorted(r["fark"]); r["fark"] = [f[len(f) // 2], f[-1]] if f else [0, 0]
    return r
out["asil"] = olc(diz)

# ---- 4. mutasyon ----
ornek = [a for a in sorted(iz) if a.startswith("animation.wom.longsword.")]
m1 = copy.deepcopy(diz)
for a in ornek:
    for kb in ("rightLegAlt", "leftLegAlt"):
        m1[a]["bones"][kb] = {"rotation": [0, 0, 0]}
out["m_diz"] = olc(m1, ornek)["fark"]
m2 = copy.deepcopy(diz)
for a in ornek:
    m2[a]["bones"]["root"] = copy.deepcopy(std[a]["bones"]["root"])
r2 = olc(m2, ornek); r1 = olc(diz, ornek)
out["m_kok"] = [r1["yerde"] / max(1, r1["kare"]), r2["yerde"] / max(1, r2["kare"])]
g3 = copy.deepcopy(geo)
k3 = {b["name"]: b for b in g3["minecraft:geometry"][0]["bones"]}
k3["rightLeg"]["cubes"][0]["uv"], k3["rightLegAlt"]["cubes"][0]["uv"] = k3["rightLegAlt"]["cubes"][0]["uv"], k3["rightLeg"]["cubes"][0]["uv"]
out["m_uv"] = uv_farki(g3)[0]

# ---- 3. film araci ----
try:
    DM.diz_ayari("evet"); out["ayar_hata"] = False
except ValueError:
    out["ayar_hata"] = True
sen = json.loads(sys.stdin.read())
def cizelge(diz_acik):
    s = copy.deepcopy(sen)
    for a in s["aktorler"].values():
        a["diz"] = diz_acik
    ak = F.zaman_cizelgesi(s, setler, {})[0]
    return {ad: [(round(k["x"], 6), round(k["y"], 6), round(k["z"], 6), round(k["aci"], 4),
                  (k["eylem"] or {}).get("anim")) for k in a.kayit] for ad, a in ak.items()}, ak
c0, _ = cizelge(False); c1, ak1 = cizelge(True)
out["cizelge_ayni"] = c0 == c1
out["aktor_diz"] = [ak1[a].diz for a in sorted(ak1)]
print(json.dumps(out))
`;
const sen = {
  fps: 24, sure: 2.5,
  aktorler: {
    o: { skin: "x.png", isim: "Ömer", silah: "osmanli_topuzu", set: "topuz", konum: [-1.6, 0], bak: "d" },
    d: { skin: "y.png", isim: "Asker", set: "yumruk", konum: [1.6, 0], bak: "o" }
  },
  olaylar: [{ t: 0.3, aktor: "o", vur: "oto", hedef: "d" }, { t: 1.4, aktor: "d", vur: "oto", hedef: "o" }],
  kamera: [{ t: 0, aci: "genis", a: "o", b: "d" }]
};
const r = JSON.parse(execFileSync("python3", ["-c", py], { cwd: KOK, input: JSON.stringify(sen), encoding: "utf8", maxBuffer: 1 << 26 }));

console.log("=== 1. GEOMETRI ===");
kontrol("dort alt kemik: iki baldir + iki pantolon yarisi, pivot dizde (y 6)",
        JSON.stringify(r.yeni) === JSON.stringify(["leftLegAlt", "leftPantsAlt", "rightLegAlt", "rightPantsAlt"]) &&
        r.ebeveyn.rightLegAlt[0] === "rightLeg" && r.ebeveyn.leftLegAlt[0] === "leftLeg" &&
        r.ebeveyn.rightPantsAlt[0] === "rightLegAlt" && r.ebeveyn.leftPantsAlt[0] === "leftLegAlt" &&
        Object.values(r.ebeveyn).every((x) => x[1] === 6), JSON.stringify(r.ebeveyn));
kontrol("ana kemikler aynen (yalniz bacak kupleri bolundu)", r.ana_aynen);
kontrol("dinlenmede dis yuzey ve doku bire bir eskisi", r.uv_eksik === 0 && r.uv_en < 1e-6,
        "en buyuk fark " + r.uv_en.toExponential(1) + " texel, eksik nokta " + r.uv_eksik);
kontrol("pantolon yarilari dizde ust uste binmiyor", Math.abs(r.katman[0][0] - 6) < 1e-9 && Math.abs(r.katman[1][1] - 6) < 1e-9,
        JSON.stringify(r.katman));

console.log("\n=== 2. VERI (Epic Fight'in dizi) ===");
const A = r.asil;
kontrol("her bacakli WoM animasyonunun dizli hali var", r.eksik.length === 0 && r.beklenen > 90,
        r.beklenen + " animasyon" + (r.eksik.length ? ", eksik " + r.eksik.slice(0, 3).join(", ") : ""));
kontrol("  turetilmis setin dizi taban setinki", r.turetilmis_esit);
kontrol("diz acisi Epic Fight'inkiyle ayni", A.fark[0] < 0.1 && A.fark[1] < 1.0,
        "ortanca " + A.fark[0].toFixed(3) + ", en cok " + A.fark[1].toFixed(2) + " derece, " + A.kare + " kare");
kontrol("diz hic geriye bukulmuyor", A.geri === 0, A.geri + " ornek");
kontrol("taban hicbir karede zemine girmiyor", A.gomulu <= 0.1, "en cok " + A.gomulu.toFixed(3) + " px");
kontrol("karelerin %90'inda en alt ayak yerde (0.5 px)", A.yerde / A.kare >= 0.9,
        "%" + (100 * A.yerde / A.kare).toFixed(1));

console.log("\n=== 3. FILM ARACI ===");
kontrol("yanlis yazilmis \"diz\" HATA", r.ayar_hata);
kontrol("aktor diz ayarini aliyor", r.aktor_diz.every((x) => x === true), JSON.stringify(r.aktor_diz));
kontrol("zaman cizelgesi dizden etkilenmiyor (konum, aci, vurus bire bir)", r.cizelge_ayni);

console.log("\n=== 4. MUTASYON ===");
kontrol("diz kanali silinince Epic Fight karsilastirmasi dusuyor", r.m_diz[1] > 10, "en cok " + r.m_diz[1].toFixed(1) + " derece");
kontrol("kok duz bacaginkiyle degisince ayak havada kaliyor", r.m_kok[1] < r.m_kok[0] - 0.2,
        "yerde %" + (100 * r.m_kok[0]).toFixed(0) + " -> %" + (100 * r.m_kok[1]).toFixed(0));
kontrol("doku yarilari yer degisince doku olcusu dusuyor", r.m_uv > 1, r.m_uv.toFixed(1) + " texel");

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> diz: model, veri ve film araci tamam");
process.exit(hata ? 1 : 0);
