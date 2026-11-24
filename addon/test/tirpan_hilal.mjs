/* KARANLIK TIRPAN 2.0 "HILAL AY" -- arac/tirpan_hilal.py          2026-11-24

   Kullanici: 2026-11-22 "Hilal Ay olsun", 2026-11-24 "Hilal ay depoya
   alabilirsin". Yalniz film icin; oyundaki Karanlik Tirpan degismez.
   Depoya giren uretec, onaylanan taslagin (2026-11-21) 220 kupunu ayni
   olcu, ayni renk ve ayni isimayla veriyor (ilk alista olculdu).

   1. bicim: uretilen geometri bicim_dogrula'dan bulgusuz geciyor
   2. tutus: pivot ve sap ekseni oyundaki tirpanla (kol_uret.py TIRPAN_*)
      ve aktorun rightItem'iyla ayni; Antitheus setinin tutusu aynen gecerli
   3. palet: her yuz tanimli bir renge dusuyor, kullanilmayan renk yok;
      isima haritasi yalniz isiyan renklerde
   4. uretim: ayni cikti iki kez ayni; uret() uc dosya yaziyor
   5. mutasyon: pivot kayinca, sap kisalinca ve kullanilmayan bir renk
      eklenince ilgili kontrol dusuyor                                   */
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
const gecici = mkdtempSync(join(tmpdir(), "tirpan-hilal-"));
const py = `
import json, sys, os, copy, importlib
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(KOK)})
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
os.chdir(${JSON.stringify(KOK)})
from PIL import Image
import tirpan_hilal as TH
import bicim_dogrula as BD
import kol_uret as KU
gec = sys.argv[1]

def tutus(th):
    g = th.geometri()["minecraft:geometry"][0]["bones"]
    sap = g[1]["cubes"][0]
    akt = json.load(open("Simsek_Kol_Kaynak/models/entity/aktor.geo.json"))["minecraft:geometry"][0]["bones"]
    sag = [b for b in akt if b["name"] == "rightItem"][0]["pivot"]
    return {"pivot": g[0]["pivot"] == list(KU.TIRPAN_PIVOT) == g[1]["pivot"] and list(KU.TIRPAN_PIVOT) == sag,
            "sap": abs(sap["origin"][2] - (KU.TIRPAN_PIVOT[2] - KU.TIRPAN_ON)) < 1e-6
                   and abs(sap["size"][2] - (KU.TIRPAN_ON + KU.TIRPAN_ARKA)) < 1e-6}

def palet(th):
    g = th.geometri()["minecraft:geometry"][0]["bones"][1]["cubes"]
    renk = {th.HUCRE[ad]: ad for ad, _, _ in th.RENKLER}
    tanimsiz, kullanilan = 0, set()
    for k in g:
        for f, y in k["uv"].items():
            h = tuple(y["uv"])
            if h in renk and y["uv_size"] == [1, 1]:
                kullanilan.add(renk[h])
            else:
                tanimsiz += 1
    d, i = th.doku(), th.isik()
    opak = all(d[y][x][3] == 255 for (x, y) in th.HUCRE.values())
    isiyan = sorted(ad for ad, _, s in th.RENKLER if s)
    isik_dogru = all((i[y][x][:3] != (0, 0, 0)) == s for ad, _, s in th.RENKLER for (x, y) in [th.HUCRE[ad]])
    return {"tanimsiz": tanimsiz, "kullanilmayan": sorted(set(th.HUCRE) - kullanilan), "opak": opak,
            "isiyan": isiyan, "isik_dogru": isik_dogru, "kup": len(g)}

out = {}
# 1. bicim
yol, png, isik_png = TH.uret(os.path.join(gec, "cikti"))
BD.BULGU.clear()
BD.geometri_dogrula(yol)
out["bulgu"] = [n for _, n in BD.BULGU]
# 2-3
out["tutus"] = tutus(TH)
out["palet"] = palet(TH)
# 4. uretim
out["ayni"] = json.dumps(TH.geometri(), sort_keys=True) == json.dumps(TH.geometri(), sort_keys=True)
out["dosyalar"] = [os.path.getsize(p) > 0 for p in (yol, png, isik_png)]
out["png_boyut"] = [Image.open(p).size for p in (png, isik_png)]
out["kimlik"] = TH.geometri()["minecraft:geometry"][0]["description"]["identifier"]
# 5. mutasyon
mut = {}
th = importlib.reload(TH); th.PIV = [-6, 13.3, 1.5]; th.X0, th.YC, th.ZC = th.PIV
mut["pivot"] = tutus(th)["pivot"]
th = importlib.reload(TH); th.ON = 18; th.ZB = th.ZC - th.ON - 1
mut["sap"] = tutus(th)["sap"]
th = importlib.reload(TH); th.RENKLER = th.RENKLER + [("fazla", (1, 2, 3), False)]
th.HUCRE = {ad: (i % th.DOKU, i // th.DOKU) for i, (ad, _, _) in enumerate(th.RENKLER)}
mut["fazla_renk"] = palet(th)["kullanilmayan"]
importlib.reload(TH)
out["mut"] = mut
print(json.dumps(out))
`;
try {
  const r = JSON.parse(execFileSync("python3", ["-B", "-c", py, gecici], { encoding: "utf8", maxBuffer: 1 << 24 }));

  console.log("1. bicim");
  kontrol("uretilen geometri bicim_dogrula'dan bulgusuz geciyor", r.bulgu.length === 0, r.bulgu.slice(0, 3).join(" | "));
  kontrol("kimlik oyundaki tirpandan ayri (geometry.karanlik_tirpan_hilal)", r.kimlik === "geometry.karanlik_tirpan_hilal", r.kimlik);

  console.log("2. tutus: oyundaki tirpanla ayni el yeri");
  kontrol("pivot = kol_uret.TIRPAN_PIVOT = aktorun rightItem'i", r.tutus.pivot);
  kontrol("sap elden TIRPAN_ON one, TIRPAN_ARKA arkaya uzaniyor", r.tutus.sap);

  console.log("3. palet");
  const p = r.palet;
  kontrol("onaylanan taslaktaki gibi 220 kup", p.kup === 220, String(p.kup));
  kontrol("her yuz tanimli bir renk hucresine dusuyor", p.tanimsiz === 0, String(p.tanimsiz));
  kontrol("kullanilmayan renk yok", p.kullanilmayan.length === 0, JSON.stringify(p.kullanilmayan));
  kontrol("palet hucreleri opak", p.opak);
  kontrol("isima haritasi yalniz isiyan renklerde (kenar, kenar2, mtas)",
          p.isik_dogru && JSON.stringify(p.isiyan) === JSON.stringify(["kenar", "kenar2", "mtas"]), JSON.stringify(p.isiyan));

  console.log("4. uretim");
  kontrol("ayni cikti iki kez ayni", r.ayni);
  kontrol("uret() geometri, palet ve isima haritasini yaziyor (16x16)",
          r.dosyalar.every(Boolean) && r.png_boyut.every((b) => b[0] === 16 && b[1] === 16), JSON.stringify(r.png_boyut));

  console.log("5. mutasyon: test isiriyor");
  kontrol("pivot kayinca tutus kontrolu dusuyor", r.mut.pivot === false);
  kontrol("sap kisalinca sap kontrolu dusuyor", r.mut.sap === false);
  kontrol("kullanilmayan renk eklenince palet kontrolu yakaliyor", JSON.stringify(r.mut.fazla_renk) === JSON.stringify(["fazla"]),
          JSON.stringify(r.mut.fazla_renk));
} finally {
  rmSync(gecici, { recursive: true, force: true });
}
console.log(hata ? "\n>>> SORUN VAR" : "\n>>> Hilal Ay: onaylanan model, oyundaki tirpanla ayni el yeri");
process.exit(hata ? 1 : 0);
