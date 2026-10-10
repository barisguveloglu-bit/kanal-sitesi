/* BLENDER FILM ARACI -- zaman cizelgesi                  v7.99.9

   arac/blender_film.py Blender'in icinde cekiyor, ama sahnenin
   KENDISI (kim nerede, hangi vurus, ne zaman degiyor, altyazi,
   kamera) saf Python'da hesaplaniyor. Burada Blender OLMADAN:

   1. vurus secimi oyundakiyle ayni (kombo sirasi, kosu, hava)
   2. hamle izi aktoru hedefe dogru tasiyor
   3. temas aninda hedefe darbe + kivilcim; savunan onden alinca
      savunma kivilcimi, darbe yok
   4. altyazi Turkce harflerle, konusan kisinin adiyla
   5. kamera her kare icin var ve kalip hedefe bakiyor
   6. ayni senaryo iki kez ayni cizelgeyi veriyor (tekrar cekim) */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const senaryo = {
  fps: 24, sure: 4.5,
  aktorler: {
    a: { skin: "x.png", isim: "Barış", silah: "karanlik_tirpan", set: "antitheus", konum: [-2.5, 0], bak: "b" },
    b: { skin: "y.png", isim: "Harkos", set: "yumruk", konum: [2.5, 0], bak: "a" }
  },
  olaylar: [
    { t: 0.0, baslik: "DÜELLO" },
    { t: 0.2, aktor: "a", git: "b" },
    { t: 1.2, aktor: "a", vur: "oto", hedef: "b" },
    { t: 2.9, aktor: "b", savun: 1.5 },
    { t: 3.0, aktor: "a", vur: "oto", hedef: "b" },
    { t: 3.2, aktor: "b", soyle: "Bu kadar mı, Barış?" }
  ],
  kamera: [
    { t: 0, aci: "genis", a: "a", b: "b" },
    { t: 1.0, aci: "yan", a: "a", b: "b", gecis: 0.4 }
  ]
};
const py = `
import json, sys, math
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import blender_film as F
import bedrock_onizleme as B
sen = json.loads(sys.stdin.read())
setler = B.oku(F.HAREKET)["setler"]
def kos():
    ak, ef, yz, sr = F.zaman_cizelgesi(sen, setler, {})
    kam = F.kamera_izi(sen, ak)
    a, b = ak["a"].kayit, ak["b"].kayit
    anim = [k["eylem"]["anim"] for k in a if k["eylem"]]
    return {"kare": len(a), "kam": len(kam),
            "a_basx": a[0]["x"], "a_git": a[int(1.1*24)]["x"],
            "hamle": a[int(2.2*24)]["x"] - a[int(1.2*24)]["x"],
            "hamle_iz": [x for x in setler["antitheus"]["saldirilar"] if x["tur"] == "oto"][0]["iz"][20][1],
            "anim": sorted(set(anim)), "ilk_anim": anim[0] if anim else None,
            "efekt": ef, "yazi": yz, "sarsinti": sr,
            "b_darbe": any(r["anim"] == "animation.aktor.darbe" for k in b for r in k["tepki"]),
            "ara_min": min(((x["x"] - y["x"]) ** 2 + (x["y"] - y["y"]) ** 2) ** 0.5 for x, y in zip(a, b)),
            "kam_bakis": [F.kamera_noktasi("yan", (0,0,0,0), (4,0,0,0))],
            "iz": json.dumps([(round(k["x"],6), round(k["y"],6)) for k in a])}
r1, r2 = kos(), kos()
r1["ayni"] = r1["iz"] == r2["iz"]
del r1["iz"]
print(json.dumps(r1, ensure_ascii=False))
`;
const r = JSON.parse(execFileSync("python3", ["-c", py], { input: JSON.stringify(senaryo), encoding: "utf8" }));
kontrol("her kare icin aktor ve kamera", r.kare === 4.5 * 24 + 1 && r.kam === r.kare, r.kare + " / " + r.kam);
kontrol("yurume: a b'ye dogru ilerledi", r.a_git > r.a_basx + 2, r.a_basx + " -> " + r.a_git.toFixed(2));
// v7.99.10: hamle rakibin ICINDEN gecmiyor (onizlemede Baris El-Harkos'un
// icinden geciyordu). Iz 4.55 blok diyor; aktor one atilir, temas noktasinda durur.
kontrol("hamle: aktor one atiliyor ama rakibin icinden gecmiyor",
        r.hamle > 0.5 && r.hamle < r.hamle_iz && r.ara_min >= 1.049,
        r.hamle.toFixed(2) + " blok (iz " + r.hamle_iz.toFixed(2) + "), en yakin ara " + r.ara_min.toFixed(3));
kontrol("ilk vurus Antitheus kombosunun 1. adimi", r.ilk_anim === "animation.wom.antitheus.antitheus_auto_1", r.ilk_anim);
kontrol("ikinci vurus kombonun 2. adimi", r.anim.includes("animation.wom.antitheus.antitheus_auto_2"), r.anim.join(", "));
const vurus = r.efekt.filter((e) => e.tur === "vurus"), savun = r.efekt.filter((e) => e.tur === "savun");
kontrol("temasta kivilcim + hedefte darbe tepkisi", vurus.length > 0 && r.b_darbe, vurus.length + " vurus kivilcimi");
kontrol("savunurken onden gelen vurus savunma kivilcimi", savun.length > 0, savun.length + " savunma");
kontrol("savunulan temas darbe saymiyor", savun.every((s) => s.t >= 2.9));
const yazi = r.yazi.find((y) => y.tur === "soyle");
kontrol("altyazi: isim + Turkce metin", yazi && yazi.isim === "Harkos" && yazi.metin === "Bu kadar mı, Barış?",
        yazi && (yazi.isim + ": " + yazi.metin));
kontrol("baslik karti", r.yazi.some((y) => y.tur === "baslik" && y.metin === "DÜELLO"));
const [kam, bak] = r.kam_bakis[0];
kontrol("yan kamera iki aktorun eksenine dik, ortaya bakiyor", Math.abs(kam[0] - 2) < 1e-6 && Math.abs(bak[0] - 2) < 1e-6,
        JSON.stringify(kam));
kontrol("ayni senaryo ayni film (tekrar cekim)", r.ayni);

// ---- v7.99.10: 1. bolumun ihtiyaclari ----
const sen2 = {
  fps: 30, sure: 6.0,
  zaman: [{ t: 2.0, sure: 0.5, hiz: 0.25 }],
  aktorler: {
    a: { skin: "x.png", isim: "Barış", silah: "karanlik_tirpan", set: "antitheus", konum: [0, 0], bak: "b" },
    b: { skin: "y.png", isim: "El-Harkos", set: "yumruk", konum: [2.2, 0], bak: "a" },
    k: { skin: "x.png", konum: [5, 5], gizli: true }
  },
  olaylar: [
    { t: 0.2, aktor: "b", poz: "kagit", tut: true },
    { t: 0.2, aktor: "b", esya: "kagit" },
    { t: 1.0, aktor: "b", poz_bitir: "kagit" },
    { t: 1.0, aktor: "b", esya: null },
    { t: 1.2, aktor: "k", goster: true },
    { t: 1.2, aktor: "k", isinlan: [4, 0], yuz: "b" },
    { t: 1.6, aktor: "k", gizle: true },
    { t: 2.0, aktor: "a", vur: "oto", hedef: "b", kan: true, dusur: "diz_cok" },
    { t: 2.1, aktor: "b", soyle: "Bu… benim mi?" },
    { t: 4.0, aktor: "a", git: [0, -3], adim: 1.2 }
  ],
  kamera: [{ t: 0, aci: "genis", a: "a", b: "b" }, { t: 2.0, aci: "goz", a: "b", hedef: [0, 0, 1] }]
};
const py2 = `
import json, sys
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import blender_film as F
import bedrock_onizleme as B
sen = json.loads(sys.stdin.read())
setler = B.oku(F.HAREKET)["setler"]
h = F.zaman_haritasi(sen)
ak, ef, yz, sr = F.zaman_cizelgesi(sen, setler, {})
kam = F.kamera_izi(sen, ak)
a, b, k = ak["a"].kayit, ak["b"].kayit, ak["k"].kayit
def kare(t): return F.kare_bul(h, t)
katman = lambda r, t: sorted({x["ad"] for x in r[kare(t)]["tepki"] if x.get("ad")})
yol = lambda r, t0, t1: ((r[kare(t1)]["x"]-r[kare(t0)]["x"])**2 + (r[kare(t1)]["y"]-r[kare(t0)]["y"])**2) ** 0.5
print(json.dumps({
  "kare": len(h), "beklenen": int(round((6.0 - 0.5) * 30 + 0.5 * 30 / 0.25)),
  "kam": len(kam), "agir_dt": h[kare(2.1)+1] - h[kare(2.1)],
  "kagit_0.5": katman(b, 0.5), "kagit_1.5": katman(b, 1.5),
  "esya": [b[kare(0.5)]["esya"], b[kare(1.5)]["esya"]],
  "k_gorunur": [k[kare(0.5)]["gorunur"], k[kare(1.3)]["gorunur"], k[kare(2.5)]["gorunur"]],
  "k_x": k[kare(1.3)]["x"], "isik": len([e for e in ef if e["tur"] == "isik"]),
  "kan": len([e for e in ef if e["tur"] == "kan"]), "vurus": len([e for e in ef if e["tur"] == "vurus"]),
  "diz": katman(b, 3.8), "yazi_t": [y["t"] for y in yz if y["tur"] == "soyle"],
  "yuru_hiz": yol(a, 5.0, 5.8) / 0.8, "goz_kam": kam[kare(2.6)][0]
}, ensure_ascii=False))
`;
const r2 = JSON.parse(execFileSync("python3", ["-c", py2], { input: JSON.stringify(sen2), encoding: "utf8" }));
kontrol("agir cekim: 0.5 sn x4 yavas -> film uzar", r2.kare === r2.beklenen + 1 || Math.abs(r2.kare - r2.beklenen) <= 2,
        r2.kare + " kare (beklenen ~" + r2.beklenen + ")");
kontrol("agir cekimde hikaye zamani kare basi 1/120 sn ilerliyor", Math.abs(r2.agir_dt - 0.25 / 30) < 1e-6,
        r2.agir_dt.toFixed(5));
kontrol("kamera her film karesi icin", r2.kam === r2.kare);
kontrol("poz katmani: kagit tutuluyor, poz_bitir ile birakiliyor",
        r2["kagit_0.5"].includes("kagit") && !r2["kagit_1.5"].includes("kagit"),
        JSON.stringify([r2["kagit_0.5"], r2["kagit_1.5"]]));
kontrol("kagit sol elde, sonra yok", r2.esya[0] === "kagit" && r2.esya[1] === null, JSON.stringify(r2.esya));
kontrol("kopya: gizli -> goster -> gizle", JSON.stringify(r2.k_gorunur) === "[false,true,false]",
        JSON.stringify(r2.k_gorunur));
kontrol("isinlanma aktoru tasiyor, iki flas (eski + yeni yer)", Math.abs(r2.k_x - 4) < 1e-9 && r2.isik === 2,
        "x " + r2.k_x + ", " + r2.isik + " flas");
kontrol("delen vurus: kivilcim yerine kan", r2.kan >= 1, r2.kan + " kan, " + r2.vurus + " kivilcim");
kontrol("son temasta hedef diz cokuyor (dusur)", r2.diz.includes("diz_cok"), JSON.stringify(r2.diz));
kontrol("altyazi FILM zamaninda (agir cekim sonrasi kayar)", r2.yazi_t[0] > 2.1 + 0.05, String(r2.yazi_t));
kontrol("yarali yuruyus: adim hizi uygulanıyor (1.2 blok/sn)", Math.abs(r2.yuru_hiz - 1.2) < 0.15,
        r2.yuru_hiz.toFixed(2) + " blok/sn");
kontrol("goz kamerasi aktorun bas hizasinda", Math.abs(r2.goz_kam[2] - 1.55) < 1e-6, JSON.stringify(r2.goz_kam));

// Kagit yalniz okurken gorunur. v1 tam kalite ciziminde ilk karede anahtar
// yazilmadigi icin kagit ACILISTAN itibaren El-Harkos'un elindeydi (kol
// asagida, yatay beyaz tahta gibi). Gercek 1. bolum senaryosuyla olculur.
{
  const r = JSON.parse(execFileSync("python3", ["-c", `
import json, sys
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import blender_film as F
import bedrock_onizleme as B
sen = json.load(open(${JSON.stringify(KOK + "film/bolum1_orman.json")}))
setler = B.oku(F.HAREKET)["setler"]
h = F.zaman_haritasi(sen)
ak, ef, yz, sr = F.zaman_cizelgesi(sen, setler, {})
kayit = ak["h"].kayit
an = F.esya_anahtarlari(kayit)
# her karede anahtarlardan cikan durum = kayittaki esya
durum, i, uyum = None, 0, True
for f in range(1, len(kayit) + 1):
    while i < len(an) and an[i][0] <= f:
        durum = an[i][1]; i += 1
    uyum = uyum and durum == (kayit[f - 1].get("esya") == "kagit")
acik = [f for f in range(1, len(kayit) + 1) if kayit[f - 1].get("esya") == "kagit"]
print(json.dumps({"ilk": an[0], "uyum": uyum, "bas": h[acik[0] - 1], "son": h[acik[-1] - 1], "say": len(acik),
                  "ozel": F.esya_anahtarlari([{"esya": None}, {"esya": "kagit"}, {"esya": None}])}))
`], { encoding: "utf8" }));
  kontrol("kagit 1. karede KAPALI anahtarla basliyor", JSON.stringify(r.ilk) === "[1,false]", JSON.stringify(r.ilk));
  kontrol("anahtarlar her karede senaryodaki esyayla ayni", r.uyum);
  kontrol("kagit yalniz okuma araliginda (4.7-8.5 sn)", r.bas >= 4.69 && r.son < 8.5 && r.say > 0,
          r.say + " kare, " + r.bas.toFixed(2) + "-" + r.son.toFixed(2) + " sn");
  kontrol("esya None ile baslasa da ilk kare anahtarli", JSON.stringify(r.ozel) === "[[1,false],[2,true],[3,false]]", JSON.stringify(r.ozel));
}

// --adim ezilmesin: blender_filmi icinde "adim" yalniz parametre olarak
// yasar. v7.99.10'da isik dongusu "adim = fps/4" yaziyordu; 30 fps'de
// her cizim 7 karede bir atliyordu (son 1080p dahil).
{
  const kaynak = readFileSync(KOK + "arac/blender_film.py", "utf8");
  const govde = kaynak.slice(kaynak.indexOf("def blender_filmi("), kaynak.indexOf("\ndef ", kaynak.indexOf("def blender_filmi(") + 5));
  const ezen = govde.split("\n").filter((l) => /^\s+adim\s*=/.test(l));
  kontrol("blender_filmi --adim parametresini ezmiyor", govde.length > 1000 && ezen.length === 0,
          ezen.length ? ezen.join(" | ").trim() : "atama yok");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> blender film cizelgesi: oyun kurallariyla ayni");
process.exit(hata ? 1 : 0);
