/* BARIS'IN FORMU -- form_model.py + blender_film baglantisi        v7.99.14

   Kullanicinin karari (2026-10-12 sabah, SERI_SEZON1.md): eller normal,
   iki kol daha, boy Baris'in 1,5 kati. Kol yerlesimi soylenmedi: iki
   secenek ("alt" varsayilan, "omuz"), karar kullanicinin.
   Blender'siz olculenler:
   1. olcek 1,5 ve karar SERI_SEZON1.md'de kullanicinin sozuyle yazili
   2. form_geo: ana kemikler AYNEN (normal aktor degismez), yalniz dort ek
      kemik; ek kol ana kolun alt kemigi, kilif ek kolun; girdi bozulmuyor
   3. "eller normal": ek kol ana kolla ayni boy ve ayni doku (uv)
   4. sol ek kol sagin tam aynasi (iki yerlesimde)
   5. CARPISMA YOK: dinlenme + yuruyus uclari (kol +-30, bacak +-40,
      sallanma +-2.5) -- ek kol ana kola, basa, bacaga, obur ek kola girmez
   6. ek el ana elden ayri ve disarida (iki el ust uste binmiyor)
   7. form ayari: bilinmeyen yerlesim/anahtar HATA; sinir orani ve sallanma
   8. blender_film: olcek AYRI bostta (kok olcegi gorunurlugun), adim
      olcekle bolunuyor, ek kol anahtarlaniyor
   9. kamera: olcek 1 iken sonuc BIREBIR eskisi (4'lu ve 5'li girdi ayni),
      1,5'te bas yuksekligi 1,5 kat
  10. turetilen geometri bicim_dogrula'dan geciyor
  11. dovus mesafesi boyla buyur: form ile normal aktor arasi en az
      CARPISMA_ARA x (1,5 + 1) / 2; iki normal aktor yine CARPISMA_ARA
      (hareket onizlemesinde form tirpanla vururken rakibin icine giriyordu)
   Mutasyonla isirdigi gosterildi (PYTHONDONTWRITEBYTECODE=1): OLCEK 1.4 ->
   1 ve 7 dustu; ek kolun parent'i "body" -> 2 ve 5; "alt" z acisi 0 -> 5
   ve 6; sol aynada z isareti ters -> 4 ve 5; adim bolmesi silinince 8;
   kamerada bas yuksekligi olceksiz ("az + 1.62") -> 9. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("../", import.meta.url).pathname;
const ARAC = KOK + "arac/";
const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, json, copy, random, tempfile, os
sys.path.insert(0, ${JSON.stringify(ARAC)})
import form_model as F, bedrock_onizleme as B, bicim_dogrula as BD
geo = B.oku("Simsek_Kol_Kaynak/models/entity/aktor.geo.json")
yedek = json.dumps(geo, sort_keys=True)
s = {"olcek": F.OLCEK, "varsayilan": F.VARSAYILAN, "yerlesim": sorted(F.YERLESIM)}
taban = {b["name"]: b for b in geo["minecraft:geometry"][0]["bones"]}
s["kol"] = {}
for kol in F.YERLESIM:
    g = F.form_geo(geo, kol)
    kem = {b["name"]: b for b in g["minecraft:geometry"][0]["bones"]}
    ek = sorted(set(kem) - set(taban))
    ayni = all(json.dumps(kem[k], sort_keys=True) == json.dumps(taban[k], sort_keys=True) for k in taban)
    ebeveyn = {k: kem[k]["parent"] for k in ek}
    doku = all(kem[a]["cubes"][0]["uv"] == taban[F.EK_KOL[a]]["cubes"][0]["uv"]
               and kem[a]["cubes"][0]["size"] == taban[F.EK_KOL[a]]["cubes"][0]["size"]
               and kem[a.replace("Arm", "Sleeve")]["cubes"][0]["uv"] == taban[F.EK_KOL[a].replace("Arm", "Sleeve")]["cubes"][0]["uv"]
               for a in F.EK_KOL)
    es = F.el_noktasi(g, "rightArm2"); es_ = F.el_noktasi(g, "leftArm2")
    ea = F.el_noktasi(g, "rightArm")
    ayna = max(abs(es[0] + es_[0]), abs(es[1] - es_[1]), abs(es[2] - es_[2]))
    hedef = F.HEDEFLER + ("rightArm2", "leftArm2")
    carp = max(max(F.carpisma(g, p, hedefler=hedef).values()) for p in F.yuruyus_pozlari())
    uzak = sum((a - b) ** 2 for a, b in zip(es, ea)) ** 0.5
    fd, yol = tempfile.mkstemp(suffix=".geo.json"); os.close(fd)
    json.dump(g, open(yol, "w")); BD.BULGU.clear(); BD.geometri_dogrula(yol); os.remove(yol)
    s["kol"][kol] = {"ek": ek, "ayni": ayni, "ebeveyn": ebeveyn, "doku": doku, "ayna": ayna,
                     "carp": carp, "uzak": uzak, "disarida": es[0] > ea[0] + 1.0, "bicim": list(BD.BULGU)}
s["girdi_ayni"] = json.dumps(geo, sort_keys=True) == yedek
hatalar = []
for kotu in ({"kol": "yok"}, {"renk": 1}, 3):
    try:
        F.form_ayari(kotu); hatalar.append(False)
    except ValueError:
        hatalar.append(True)
s["ayar"] = {"true": F.form_ayari(True), "omuz": F.form_ayari("omuz"), "yok": F.form_ayari(None),
             "hatalar": hatalar, "olcek_bos": F.olcek({}), "olcek_form": F.olcek({"form": True})}
s["sinir"] = [F.sinir_orani(x) for x in (0, 20, 40, 80, -80)]
sal = [(F.sallanma(t / 10, "rightArm2"), F.sallanma(t / 10, "leftArm2")) for t in range(0, 40)]
s["sallanma"] = {"enk": max(abs(a) for a, b in sal), "ters": all(abs(a + b) < 1e-12 for a, b in sal)}
import blender_film as Fm
rnd = random.Random(11); fark = 0; n = 0
for _ in range(1500):
    A = (rnd.uniform(-20, 20), rnd.uniform(-20, 20), rnd.uniform(-1, 2), rnd.uniform(0, 360))
    Bp = None if rnd.random() < 0.3 else (rnd.uniform(-20, 20), rnd.uniform(-20, 20), rnd.uniform(-1, 2), rnd.uniform(0, 360))
    for aci in ("genis", "yan", "omuz", "yakin", "ust", "dusuk", "yorunge", "takip", "goz", "yakin_on"):
        if aci == "omuz" and Bp is None:
            continue
        a4 = Fm.kamera_noktasi(aci, A, Bp, 0.3, 1)
        a5 = Fm.kamera_noktasi(aci, A + (1.0,), None if Bp is None else Bp + (1.0,), 0.3, 1)
        n += 1; fark += a4 != a5
s["kamera"] = {"n": n, "fark": fark,
               "bas1": Fm.kamera_noktasi("yakin_on", (0, 0, 0, 0), None)[1][2],
               "bas15": Fm.kamera_noktasi("yakin_on", (0, 0, 0, 0, 1.5), None)[1][2],
               "goz15": Fm.kamera_noktasi("goz", (0, 0, 0, 0, 1.5), None)[0][2]}
import math
setler = B.oku(Fm.HAREKET)["setler"]
def en_yakin(form):
    sen = {"fps": 30, "sure": 6.0,
           "aktorler": {"f": dict({"skin": "Simsek_Kol_Kaynak/textures/entity/aktor/uzak_akraba.png", "silah": "karanlik_tirpan",
                                   "set": "antitheus", "konum": [-4.0, 0], "bak": "h"}, **({"form": "alt"} if form else {})),
                         "h": {"skin": "Simsek_Kol_Kaynak/textures/entity/ilkel_harkos.png", "konum": [3.0, 0], "bak": "f"}},
           "olaylar": [{"t": 0.3, "aktor": "f", "git": [0.6, 0.0], "adim": 2.2},
                       {"t": 2.9, "aktor": "f", "durus": "_set"},
                       {"t": 3.2, "aktor": "f", "vur": "antitheus_auto_1", "hedef": "h"},
                       {"t": 4.5, "aktor": "f", "vur": "antitheus_auto_4", "hedef": "h"}],
           "kamera": [{"t": 0, "aci": "yan", "a": "f", "b": "h"}]}
    ak, ef, _, _ = Fm.zaman_cizelgesi(sen, setler, {})
    d = min(math.hypot(a["x"] - b["x"], a["y"] - b["y"]) for a, b in zip(ak["f"].kayit, ak["h"].kayit))
    return d, sum(1 for e in ef if e.get("tur") in ("vurus", "kan", "savun"))
s["mesafe"] = {"form": en_yakin(True), "normal": en_yakin(False), "ara": Fm.CARPISMA_ARA}
print(json.dumps(s))`], { encoding: "utf8", cwd: KOK }).trim().split("\n").pop());

const seri = readFileSync(KOK + "SERI_SEZON1.md", "utf8");
kontrol("1. olcek 1,5; karar SERI_SEZON1.md'de kullanicinin sozuyle",
        r.olcek === 1.5 && seri.includes("onun bir buçuk katı") && seri.includes("Barış'ın 1,5 katı"), "olcek " + r.olcek);
const K = r.kol;
const ekBek = "leftArm2,leftSleeve2,rightArm2,rightSleeve2";
kontrol("2. ana kemikler aynen, yalniz 4 ek kemik; ek kol ana kolun, kilif ek kolun alt kemigi; girdi bozulmuyor",
        Object.values(K).every(k => k.ayni && k.ek.join() === ekBek && k.ebeveyn.rightArm2 === "rightArm" &&
          k.ebeveyn.leftArm2 === "leftArm" && k.ebeveyn.rightSleeve2 === "rightArm2" && k.ebeveyn.leftSleeve2 === "leftArm2") &&
        r.girdi_ayni && r.yerlesim.join() === "alt,omuz" && r.varsayilan === "alt",
        JSON.stringify(Object.fromEntries(Object.entries(K).map(([a, k]) => [a, k.ebeveyn]))));
kontrol("3. eller normal: ek kol ana kolla ayni boy, ayni doku (kol + kilif uv)",
        Object.values(K).every(k => k.doku), "");
kontrol("4. sol ek kol sagin aynasi (iki yerlesimde)",
        Object.values(K).every(k => k.ayna < 1e-9), Object.entries(K).map(([a, k]) => a + " " + k.ayna).join(", "));
kontrol("5. CARPISMA YOK: dinlenme + yuruyus uclari + sallanma, ana kol/bas/bacak/obur ek kol",
        Object.values(K).every(k => k.carp === 0), Object.entries(K).map(([a, k]) => a + " " + k.carp + " px3").join(", "));
kontrol("6. ek el ana elden en az 4 px uzak ve disarida",
        Object.values(K).every(k => k.uzak >= 4 && k.disarida), Object.entries(K).map(([a, k]) => a + " " + k.uzak.toFixed(1)).join(", "));
const ay = r.ayar;
kontrol("7. form ayari (bilinmeyen HATA), sinir orani 40 dereceden sonra, sallanma +-2.5 iki yanda ters",
        ay.true.kol === "alt" && ay.true.olcek === 1.5 && ay.omuz.kol === "omuz" && ay.yok === null &&
        ay.hatalar.every(Boolean) && ay.olcek_bos === 1 && ay.olcek_form === 1.5 &&
        JSON.stringify(r.sinir) === "[1,1,1,0.5,0.5]" && Math.abs(r.sallanma.enk - 2.5) < 0.01 && r.sallanma.ters,
        JSON.stringify(r.sinir) + " sallanma " + r.sallanma.enk.toFixed(3));

const film = readFileSync(ARAC + "blender_film.py", "utf8");
kontrol("8. film: olcek ayri bosta (kok olcegi gorunurlugun), adim olcekle bolunuyor, ek kol anahtarlaniyor",
        /ust = bpy\.data\.objects\.new\("aktor_%s_olcek" % ad, None\)/.test(film) &&
        /ust\.scale = \(a\.olcek, a\.olcek, a\.olcek\)/.test(film) &&
        /kn\[kem\]\.parent = kn\[ana\] if ana else ust/.test(film) &&
        /aci = k\["mesafe"\] \* 38\.17 \/ a\.olcek/.test(film) &&
        /for ek, ana in form_model\.EK_KOL\.items\(\):/.test(film) &&
        /form_model\.sinir_orani\(/.test(film) && /form_model\.sallanma\(/.test(film) &&
        !/kok\.scale = \(a\.olcek/.test(film), "");
const km = r.kamera;
kontrol("9. kamera: olcek 1 iken birebir eski (4'lu = 5'li), 1,5'te bas ve goz yuksekligi 1,5 kat",
        km.fark === 0 && km.n > 10000 && Math.abs(km.bas15 - km.bas1 * 1.5) < 1e-9 && Math.abs(km.goz15 - 1.55 * 1.5) < 1e-9,
        `${km.n} cekim, ${km.fark} fark; bas ${km.bas1.toFixed(3)} -> ${km.bas15.toFixed(3)}`);
kontrol("10. turetilen geometri bicim_dogrula'dan geciyor (iki yerlesim)",
        Object.values(K).every(k => k.bicim.length === 0), Object.values(K).map(k => k.bicim.length).join(","));

const ms = r.mesafe;
kontrol("11. dovus mesafesi boyla buyur: form-normal >= ara x 1,25; normal-normal >= ara; vuruslar yine isabet ediyor",
        ms.form[0] >= ms.ara * 1.25 - 1e-6 && ms.normal[0] >= ms.ara - 1e-6 && ms.normal[0] < ms.ara * 1.25 - 0.05 &&
        ms.form[1] > 0 && ms.normal[1] > 0,
        `form ${ms.form[0].toFixed(3)} (${ms.form[1]} vurus), normal ${ms.normal[0].toFixed(3)} (${ms.normal[1]} vurus), ara ${ms.ara}`);

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Baris'in formu: 1,5 kat, dort kol, carpismasiz, eski filmler degismedi");
process.exit(hata ? 1 : 0);
