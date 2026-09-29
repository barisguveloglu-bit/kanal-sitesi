/* BEDROCK ONIZLEME ARACI -- hesap kismi                  v7.99.8

   arac/bedrock_onizleme.py Blender'in icinde calisiyor, ama kupleri
   ve pozu kuran hesap bpy istemiyor. Burada Blender OLMADAN sinaniyor:
   1. dinlenme pozunda bir kupun dunya konumu dosyadakinin x-tersi
   2. attachable kurali: tirpanin kupleri aktorun rightItem'ina
      yapisiyor (aktoru dondurunce tirpan da donuyor)
   3. kutu UV acilimi Bedrock duzeninde                           */
import { execFileSync } from "node:child_process";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const KOK = new URL("..", import.meta.url).pathname;
const py = `
import json, sys
sys.path.insert(0, ${JSON.stringify(KOK + "arac")})
import bedrock_onizleme as b
g = b.oku("Simsek_Kol_Kaynak/models/entity/aktor.geo.json")
t = b.oku("Simsek_Kol_Kaynak/models/entity/karanlik_tirpan.geo.json")
govde = b.Model(g)
k = b.kupler(govde)
# govde kupu dosyada origin [-4,12,-2] size [8,12,4] -> ic x [-4,4]
xs = [p[0] for pts, uv in k for p in pts]
ek = b.kupler(b.Model(t), govde)
ek_z = [p[2] for pts, uv in ek for p in pts]
anim = {"bones": {"rightArm": {"rotation": [-90, 0, 0]}}}
kalkik = b.Model(g, anim, 0)
ek2 = b.kupler(b.Model(t), kalkik)
y1 = max(p[1] for pts, uv in ek for p in pts)
y2 = max(p[1] for pts, uv in ek2 for p in pts)
print(json.dumps({"yuz": len(k), "xmin": min(xs), "xmax": max(xs),
                  "ek_zmin": min(ek_z), "ek_zmax": max(ek_z), "y1": y1, "y2": y2,
                  "uv": b.kutu_uv(16, 16, 8, 12, 4)}))
`;
const r = JSON.parse(execFileSync("python3", ["-c", py], { encoding: "utf8" }));
kontrol("aktor modeli 6 yuzlu kuplerden kuruluyor", r.yuz > 0 && r.yuz % 6 === 0, r.yuz + " yuz");
kontrol("dinlenmede model simetrik (x ters cevrimi dogru)", Math.abs(r.xmin + r.xmax) < 1e-6, r.xmin + " .. " + r.xmax);
kontrol("tirpan dinlenmede ileri (-Z) uzaniyor", r.ek_zmin < -20 && r.ek_zmax > 20, r.ek_zmin + " .. " + r.ek_zmax);
kontrol("attachable kurali: kol kalkinca tirpan da kalkiyor", r.y2 > r.y1 + 10, r.y1.toFixed(1) + " -> " + r.y2.toFixed(1));
kontrol("kutu UV: ust (u+d, v), on (u+d, v+d)",
        JSON.stringify(r.uv.up) === JSON.stringify([20, 16, 8, 4]) && JSON.stringify(r.uv.north) === JSON.stringify([20, 20, 8, 12]));
console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> onizleme araci: poz ve baglanti kurallari tutuyor");
process.exit(hata ? 1 : 0);
