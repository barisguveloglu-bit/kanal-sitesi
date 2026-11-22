/* DIS KATMAN -- komsu uzuvlarin yuzleri ayni duzlemde olmasin   2026-11-22

   2. bolum Part 1'in kare incelemesinde yakin planda iki yanip sonme
   bulundu: savas 391-445'te omzun altindaki bant 55 karede 22 kez
   uzayip kisaliyordu, giris 310-317'de Pipos'un bacaklarinin ortasinda
   koyu bir serit karede bir beliriyordu. Sebep modelin olcusu: ceket,
   kollar ve pantolonlar 0,25 sisirilmis; ceket-kol 0,5, iki pantolon
   0,7, iki bacak 0,2 birim AYNI DUZLEMDE ust uste biniyor. Oyun
   katmanlari sirayla cizdigi icin bunu gostermez; Cycles'ta hangi yuzun
   onde cikacagi uzvun en kucuk hareketiyle degisiyordu.
   Duzeltme yalniz filmde: blender_film.dis_katman_ayir komsulara az
   farkli sisirme veriyor (DIS_KATMAN_PAY). Oyunun dosyasi degismez.
   Kullanicinin karari (2026-11-22): yalniz kod; cizilmis kareler
   yeniden cizilmez.

   1. ham geometri (oyunun dosyasi): sorun orada, bilinen ciftler var
   2. film geometrisi: alti model cesidinde ayni yone bakan, ayni
      duzlemde, alani kesisen iki yuz yok. Tek istisna dizin eklem
      duzlemi (y = DIZ_Y): yarilar orada bulusuyor, yuzler iceride
   3. film araci bu geometriyi gercekten kullaniyor
   4. degisiklik kucuk: yalniz sisirme, yalniz tablodaki kemikler,
      en cok 0,03 birim (~2 mm); girdi degismiyor
   5. mutasyon: tablo bosalinca, kol payi silinince ve iki pantolon
      esitlenince bindirme geri geliyor (test isiriyor)             */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, sys, itertools
sys.path.insert(0, ${JSON.stringify(KOK)})
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import bedrock_onizleme as B
import blender_film as F
import diz_model as DM
import form_model as FM

def yuzler(geo):
    """Donmemis kuplerin alti yuzu: (eksen, yon, duzlem, aralik1, aralik2, kemik)."""
    out, atla = [], 0
    for b in geo["minecraft:geometry"][0]["bones"]:
        if any(abs(x) > 1e-9 for x in b.get("rotation", [0, 0, 0])):
            atla += len(b.get("cubes", []))
            continue
        for c in b.get("cubes", []):
            if any(abs(x) > 1e-9 for x in c.get("rotation", [0, 0, 0])):
                atla += 1
                continue
            s = c.get("inflate", 0.0)
            lo = [c["origin"][i] - s for i in range(3)]
            hi = [c["origin"][i] + c["size"][i] + s for i in range(3)]
            for e in range(3):
                d = [i for i in range(3) if i != e]
                for yon, duz in ((-1, lo[e]), (1, hi[e])):
                    out.append((e, yon, duz, (lo[d[0]], hi[d[0]]), (lo[d[1]], hi[d[1]]), b["name"]))
    return out, atla

def bindirmeler(geo, tol=1e-6):
    yz, atla = yuzler(geo)
    bul = []
    for p, q in itertools.combinations(yz, 2):
        if p[5] == q[5] or p[0] != q[0] or p[1] != q[1] or abs(p[2] - q[2]) > tol:
            continue
        a = min(p[3][1], q[3][1]) - max(p[3][0], q[3][0])
        b = min(p[4][1], q[4][1]) - max(p[4][0], q[4][0])
        if a > tol and b > tol:
            bul.append({"a": p[5], "b": q[5], "yuz": "xyz"[p[0]] + ("+" if p[1] > 0 else "-"),
                        "duzlem": round(p[2], 4)})
    return bul, atla

def cift(x):
    return "-".join(sorted((x["a"], x["b"])))

geo, gi = B.oku(F.GEO_AKTOR), B.oku(F.GEO_AKTOR_INCE)
CESIT = {"genis": (False, None, False), "ince": (True, None, False),
         "genis_diz": (False, None, True), "ince_diz": (True, None, True),
         "form": (False, {"kol": FM.VARSAYILAN}, False),
         "form_diz": (False, {"kol": FM.VARSAYILAN}, True)}

def film_bindirmeleri():
    fg, fi = F.dis_katman_ayir(geo), F.dis_katman_ayir(gi)
    r = {}
    for ad, (ince, form, diz) in CESIT.items():
        bul, atla = bindirmeler(F.aktor_geosu(fg, fi, ince, form, diz))
        r[ad] = {"diz": diz, "atla": atla, "bul": bul}
    return r

out = {}
# ---- 1. ham geometri ----
ham, _ = bindirmeler(geo)
out["ham_ciftler"] = sorted({cift(x) for x in ham})
# ---- 2. film geometrisi ----
out["film"] = film_bindirmeleri()
out["diz_y"] = DM.DIZ_Y
# ---- 4. degisiklik kucuk ----
once = json.dumps(geo, sort_keys=True)
fg = F.dis_katman_ayir(geo)
out["girdi_ayni"] = json.dumps(geo, sort_keys=True) == once
farklar, en_cok = [], 0.0
for b0, b1 in zip(geo["minecraft:geometry"][0]["bones"], fg["minecraft:geometry"][0]["bones"]):
    k0 = {k: v for k, v in b0.items() if k != "cubes"}
    k1 = {k: v for k, v in b1.items() if k != "cubes"}
    if k0 != k1:
        farklar.append(b0["name"] + ":kemik")
    for c0, c1 in zip(b0.get("cubes", []), b1.get("cubes", [])):
        d0 = {k: v for k, v in c0.items() if k != "inflate"}
        d1 = {k: v for k, v in c1.items() if k != "inflate"}
        if d0 != d1:
            farklar.append(b0["name"] + ":kup")
        fark = c1.get("inflate", 0) - c0.get("inflate", 0)
        if abs(fark) > 1e-12:
            en_cok = max(en_cok, fark)
            if b0["name"] not in F.DIS_KATMAN_PAY:
                farklar.append(b0["name"] + ":tablo_disi")
        if fark < -1e-12:
            farklar.append(b0["name"] + ":kuculdu")
out["farklar"] = farklar
out["en_cok"] = en_cok
# ---- 5. mutasyon ----
asil = dict(F.DIS_KATMAN_PAY)
mut = {}
for ad, tablo in (("bos", {}),
                  ("kol_payi_yok", {k: v for k, v in asil.items() if "Sleeve" not in k}),
                  ("pantolon_esit", dict(asil, leftPants=asil["rightPants"]))):
    F.DIS_KATMAN_PAY = tablo
    r = film_bindirmeleri()
    mut[ad] = sorted({cift(x) for x in r["genis"]["bul"]})
F.DIS_KATMAN_PAY = asil
out["mut"] = mut
print(json.dumps(out))
`;
const r = JSON.parse(execFileSync("python3", ["-B", "-c", py], { encoding: "utf8" }));

console.log("1. ham geometri (oyunun dosyasi)");
for (const c of ["jacket-rightSleeve", "jacket-leftSleeve", "leftPants-rightPants", "leftLeg-rightLeg"])
  kontrol("bilinen bindirme var: " + c, r.ham_ciftler.includes(c), r.ham_ciftler.join(", "));

console.log("2. film geometrisi: ayni duzlemde ust uste binen yuz yok");
for (const [ad, v] of Object.entries(r.film)) {
  const disari = v.bul.filter((x) => !(v.diz && x.yuz[0] === "y" && Math.abs(x.duzlem - r.diz_y) < 1e-6));
  kontrol(ad + ": bindirme yok" + (v.diz ? " (diz eklem duzlemi haric: " + (v.bul.length - disari.length) + ")" : ""),
          disari.length === 0, disari.slice(0, 4).map((x) => `${x.a}/${x.b} ${x.yuz} ${x.duzlem}`).join(", "));
}
kontrol("form: donuk ek kol kupleri sayildi (4)", r.film.form.atla === 4, String(r.film.form.atla));

console.log("3. film araci bu geometriyi kullaniyor");
const kaynak = readFileSync(KOK + "arac/blender_film.py", "utf8");
kontrol("genis model dis_katman_ayir'dan", /geo = dis_katman_ayir\(B\.oku\(GEO_AKTOR\)\)/.test(kaynak));
kontrol("ince model dis_katman_ayir'dan", /geo_ince = dis_katman_ayir\(B\.oku\(GEO_AKTOR_INCE\)\)/.test(kaynak));

console.log("4. degisiklik kucuk");
kontrol("girdi degismiyor", r.girdi_ayni);
kontrol("yalniz tablodaki kemiklerin sisirmesi artiyor", r.farklar.length === 0, r.farklar.join(", "));
kontrol("en buyuk pay 0,03 birim", r.en_cok > 0 && r.en_cok <= 0.03 + 1e-9, String(r.en_cok));

console.log("5. mutasyon: test isiriyor");
kontrol("tablo bos: bindirme geri geliyor", r.mut.bos.includes("jacket-rightSleeve")
        && r.mut.bos.includes("leftPants-rightPants") && r.mut.bos.includes("leftLeg-rightLeg"), r.mut.bos.join(", "));
kontrol("kol payi yok: ceket-kol geri geliyor", r.mut.kol_payi_yok.includes("jacket-rightSleeve"),
        r.mut.kol_payi_yok.join(", "));
kontrol("pantolonlar esit: pantolon-pantolon geri geliyor", r.mut.pantolon_esit.includes("leftPants-rightPants"),
        r.mut.pantolon_esit.join(", "));

process.exit(hata ? 1 : 0);
