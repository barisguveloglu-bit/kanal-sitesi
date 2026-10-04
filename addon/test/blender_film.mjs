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
            "kam_bakis": [F.kamera_noktasi("yan", (0,0,0,0), (4,0,0,0))],
            "iz": json.dumps([(round(k["x"],6), round(k["y"],6)) for k in a])}
r1, r2 = kos(), kos()
r1["ayni"] = r1["iz"] == r2["iz"]

# Sayisal hareket sozlesmeleri: zaman cizelgesi sabitleri degismeden kalmali.
def olc_hiz(kos):
    sen2 = {
        "fps": 24, "sure": 1.0,
        "aktorler": {"a": {"skin": "x.png", "set": "yumruk", "konum": [0, 0]}},
        "olaylar": [{"t": 0.0, "aktor": "a", "git": [100, 0], "kos": kos}],
        "kamera": [{"t": 0.0, "aci": "ust", "a": "a"}]
    }
    ak, _, _, _ = F.zaman_cizelgesi(sen2, setler, {})
    return ak["a"].kayit[12]["x"]

def olc_kacin():
    sen2 = {
        "fps": 24, "sure": 1.0,
        "aktorler": {"a": {"skin": "x.png", "set": "yumruk", "konum": [0, 0], "aci": 0}},
        "olaylar": [{"t": 0.0, "aktor": "a", "kacin": "sol"}],
        "kamera": [{"t": 0.0, "aci": "ust", "a": "a"}]
    }
    ak, _, _, _ = F.zaman_cizelgesi(sen2, setler, {})
    return ak["a"].kayit[-1]

r1["olc_yuru"] = olc_hiz(False)
r1["olc_kos"] = olc_hiz(True)
r1["olc_kacin"] = olc_kacin()
del r1["iz"]
print(json.dumps(r1, ensure_ascii=False))
`;
const r = JSON.parse(execFileSync("python3", ["-c", py], { input: JSON.stringify(senaryo), encoding: "utf8" }));
kontrol("her kare icin aktor ve kamera", r.kare === 4.5 * 24 + 1 && r.kam === r.kare, r.kare + " / " + r.kam);
kontrol("yurume: a b'ye dogru ilerledi", r.a_git > r.a_basx + 2, r.a_basx + " -> " + r.a_git.toFixed(2));
kontrol("hamle: vurusun ilk saniyesinde aktor izin dedigi kadar one gidiyor",
        r.hamle > 0.5 && Math.abs(r.hamle - r.hamle_iz) < 0.05, r.hamle.toFixed(2) + " / iz " + r.hamle_iz.toFixed(2));
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
kontrol("olcu: yuru 4.3 blok/sn", Math.abs(r.olc_yuru - 2.15) < 1e-6, r.olc_yuru.toFixed(3) + " / 2.150 @ 0.5 sn");
kontrol("olcu: kos 5.6 blok/sn", Math.abs(r.olc_kos - 2.8) < 1e-6, r.olc_kos.toFixed(3) + " / 2.800 @ 0.5 sn");
kontrol("olcu: kacin toplam 2.4 blok", Math.abs(r.olc_kacin.x + 2.4) < 1e-6, r.olc_kacin.x.toFixed(3) + " / -2.400");
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> blender film cizelgesi: oyun kurallariyla ayni");
process.exit(hata ? 1 : 0);
