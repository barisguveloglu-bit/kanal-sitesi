/* TEK KARELIK DONUS -- blender_film.tek_kare_donus_suz           v7.99.12

   Part 1 denetiminde kare 900'de El-Harkos bir kare 18 derece donup geri
   geliyordu (849 ve 945'te de). Sebep: 592'de baslayan yuruyusu carpisma
   yuzunden bitmiyor, yuruyus yonu her karede "bak"i eziyor.
   1. iki senaryoda da hicbir aktorde tek karelik aci sivrisi yok
   2. suzgec YALNIZ 849, 900, 945'i degistiriyor (baska aktor, baska kare,
      kamera degismiyor -- cizilmis kareler gecerli kaliyor)
   3. o karelerde aci komsusuyla ayni
   4. kok neden (takilan yuruyus) bu bolumde bilerek duruyor: kayitli
   Mutasyonla isirdigi gosterildi: suzgec cagrisi kaldirilinca 1-2-3 dustu. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const ADDON = new URL("../", import.meta.url).pathname;
const r = JSON.parse(execFileSync("python3", ["-c", `
import sys, json; sys.path.insert(0, "arac")
import blender_film as F, bedrock_onizleme as B
setler = B.oku(F.HAREKET)["setler"]
n = lambda d: (d + 180) % 360 - 180
cikti = {}
for ad in ("bolum1_orman", "bolum1_oda"):
    sen = B.oku("film/%s.json" % ad)
    ham, *_ = F.zaman_cizelgesi(sen, setler, {}, suz=False)
    duz, *_ = F.zaman_cizelgesi(sen, setler, {})
    kh, kd = F.kamera_izi(sen, ham), F.kamera_izi(sen, duz)
    sivri = {a: [f + 1 for f in range(1, len(k.kayit) - 1)
                 if abs(n(k.kayit[f]["aci"] - k.kayit[f - 1]["aci"])) > 0.5
                 and abs(n(k.kayit[f + 1]["aci"] - k.kayit[f - 1]["aci"])) < 0.5] for a, k in duz.items()}
    fark = sorted({"%s:%d" % (a, f + 1) for a in ham for f in range(len(ham[a].kayit))
                   if any(ham[a].kayit[f][x] != duz[a].kayit[f][x] for x in ("x", "y", "z", "aci"))})
    kam = [f + 1 for f in range(len(kh)) if kh[f][:3] != kd[f][:3]]
    komsu = {str(f): abs(n(duz["h"].kayit[f - 1]["aci"] - duz["h"].kayit[f - 2]["aci"])) < 1e-9
             for f in (849, 900, 945)} if ad == "bolum1_orman" else {}
    cikti[ad] = {"sivri": {a: v for a, v in sivri.items() if v}, "fark": fark, "kam": kam, "komsu": komsu}
print(json.dumps(cikti))`], { encoding: "utf8", cwd: ADDON }).trim());

const o = r.bolum1_orman, d = r.bolum1_oda;
kontrol("orman: hicbir aktorde tek karelik donus yok", Object.keys(o.sivri).length === 0, JSON.stringify(o.sivri));
kontrol("oda: hicbir aktorde tek karelik donus yok", Object.keys(d.sivri).length === 0, JSON.stringify(d.sivri));
kontrol("suzgec yalniz h:849, h:900, h:945'i degistiriyor", JSON.stringify(o.fark) === JSON.stringify(["h:849", "h:900", "h:945"]),
        JSON.stringify(o.fark));
kontrol("oda sahnesinde hicbir kare degismiyor", d.fark.length === 0, JSON.stringify(d.fark));
kontrol("kamera hicbir karede degismiyor", o.kam.length === 0 && d.kam.length === 0, JSON.stringify([o.kam, d.kam]));
kontrol("849/900/945'te aci onceki kareyle ayni", Object.values(o.komsu).length === 3 && Object.values(o.komsu).every(Boolean),
        JSON.stringify(o.komsu));
const kayit = readFileSync(ADDON + "SERI_SEZON1.md", "utf8");
kontrol("kok neden (takilan yuruyus) SERI_SEZON1.md'de bilinen hata olarak kayitli",
        kayit.includes("Bilinen hata") && kayit.includes("takılan yürüyüş"));

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tek karelik donus: yok; yalniz 849/900/945 duzeldi");
process.exit(hata ? 1 : 0);
