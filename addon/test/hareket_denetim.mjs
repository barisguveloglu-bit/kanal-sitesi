/* HAREKET DENETIMI -- arac/hareket_denetim.py                    v7.99.16

   Kullanici (2026-11-02): "Yuruyusler her sey falan robotik olmayacak
   degil mi, bunlari ayrica denetle." "akici": true acik diye guvenilmez;
   kok hareketi kare kare olculur (Blender gerekmiyor).

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. 1. bolum disindaki her film senaryosu denetimden TEMIZ: tek karede
      hiz sicramasi, ani donus, isinlanma, yurumeden kayma yok.
   2. Denetim isiriyor: ayni senaryo akici KAPALI (eski hareket) bulgu
      verir; duran yerden firlayan ziplayis bulgu verir.
   3. Denetimin buldugu dort kusur film aracinda kapali:
      a. varista son kare: hiz ~0'a iner (eskisi 0,6 -> 0 tek karede);
      b. yururken verilen yeni "git": yol kavisli (eskisi tek karede kirik);
      c. kalkis olayin karesinde: yururken atlayista hiz kesilmiyor;
      d. inis: yatay hiz surtunmeyle soner (eskisi 4,5 -> 0 tek karede). */
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BURADA = dirname(fileURLToPath(import.meta.url));
const ARAC = join(BURADA, "..", "arac");
const FILM = join(BURADA, "..", "film");
const ORTAM = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const py = (kod) => JSON.parse(execFileSync("python3", ["-c",
  "import sys, json, math\nsys.dont_write_bytecode = True\nsys.path.insert(0, sys.argv[1])\n" + kod, ARAC],
  { encoding: "utf8", env: ORTAM, maxBuffer: 1 << 26 }));

const ADLAR = readdirSync(FILM).filter((a) => a.endsWith(".json") && !a.startsWith("bolum1_")).sort();

console.log("=== 1. 1. BOLUM DISI SENARYOLAR TEMIZ ===");
{
  const r = py(`
import hareket_denetim as D
out = {}
for ad in ${JSON.stringify(ADLAR)}:
    s = D.senaryo_denetle(${JSON.stringify(FILM)} + "/" + ad)
    out[ad] = {"akici": s["akici"], "bulgu": {k: sum(len(v) for v in o["bulgu"].values()) for k, o in s["oyuncular"].items()},
               "ivme": max([o["ozet"]["azami_ivme"] for o in s["oyuncular"].values()] + [0])}
print(json.dumps(out))`);
  for (const ad of ADLAR) {
    const o = r[ad];
    const n = Object.values(o.bulgu).reduce((a, b) => a + b, 0);
    kontrol(ad + ": akici ve temiz", o.akici && n === 0, "bulgu " + n + ", azami ivme " + o.ivme.toFixed(1));
  }
}

console.log("\n=== 2. DENETIM ISIRIYOR ===");
{
  const r = py(`
import hareket_denetim as D, json as J, tempfile, os
yol = ${JSON.stringify(join(FILM, "bolum2_p1_4_savas.json"))}
s = J.load(open(yol)); s["akici"] = False
d = tempfile.mkdtemp()
p = os.path.join(d, "eski.json"); J.dump(s, open(p, "w"))
eski = D.senaryo_denetle(p)
n_eski = sum(len(v) for o in eski["oyuncular"].values() for v in o["bulgu"].values())
# duran yerden firlayan ziplayis (kulubenin verandasi: yurumeden, durunca atla)
k = J.load(open(${JSON.stringify(join(FILM, "bolum2_p1_3_kulube.json"))}))
ol = [o for o in k["olaylar"] if not (o.get("aktor") == "b2" and "zipla" in o)]
ol.append({"t": 15.9, "aktor": "b2", "zipla": [1.5, 7.5]})
k["olaylar"] = sorted(ol, key=lambda o: o["t"])
p2 = os.path.join(d, "firla.json"); J.dump(k, open(p2, "w"))
fi = D.senaryo_denetle(p2)["oyuncular"]["b2"]["bulgu"]
print(json.dumps({"eski": n_eski, "firla": len(fi["ani_kalkis"])}))`);
  kontrol("akici kapali (eski hareket): bulgu var", r.eski > 0, String(r.eski));
  kontrol("duran yerden firlayan ziplayis: ani kalkis bulunuyor", r.firla > 0, String(r.firla));
}

console.log("\n=== 3. FILM ARACINDAKI DUZELTMELER ===");
{
  const r = py(`
import hareket as H
# a. varis: son karenin hizi
son = []
for fps in (24, 30):
    v = 0.0; yol = 0.0; vs = []
    while yol < 6.0 - H.VARIS_ESIK and len(vs) < 3000:
        v = H.yuru_hizi(v, 4.3, 6.0 - yol, 1.0 / fps); yol += max(v, 0.05) / fps; vs.append(v)
    son.append([vs[-1], max(abs(b - a) for a, b in zip([0.0] + vs, vs)) * fps])
# b. kavis: 90 derece istekte tek karede donus siniri
y = H.yon_dondur((1.0, 0.0), (0.0, 1.0), 2.6, 1.0 / 30)
kavis = math.degrees(math.atan2(y[1], y[0]))
print(json.dumps({"son": son, "kavis": kavis, "tau": H.INIS_KAYMA_TAU}))`);
  kontrol("a. varista son kare hizi kucuk (< 0,4 blok/sn), fren 9'u asmiyor",
          r.son.every(([v, a]) => v < 0.4 && a <= 9.0 + 1e-6), JSON.stringify(r.son.map(([v, a]) => [+v.toFixed(3), +a.toFixed(2)])));
  kontrol("b. yururken 90 derecelik yeni yon: tek karede en cok ~7 derece (kavis)", r.kavis > 0 && r.kavis < 7.5, r.kavis.toFixed(2) + " derece");
  kontrol("d. inis kaymasi Minecraft surtunmesine yakin (~0,5 blok: tau 0,1-0,15 sn)", r.tau >= 0.1 && r.tau <= 0.15, String(r.tau));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> hareket denetimi: senaryolar temiz, denetim isiriyor");
process.exit(hata ? 1 : 0);
