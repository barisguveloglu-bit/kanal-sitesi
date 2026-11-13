/* ================================================================
   HER ESYA GORUNUYOR MU: ENVANTERDE VE ELDE              v7.99.22

   Kullanici: "elime aldigim zaman da almadigim zaman da envanterimde
   gorunuyor mu, her esyaya bak." Ilk olcumde uc Ates (Heatblast)
   esyasinin ikonu TAMAMEN SAYDAMDI: envanterde de elde de
   gorunmuyorlardi. ikon_atlas.mjs ikonun atlasta ve diskte oldugunu
   soruyordu, icinde bir sey olup olmadigini sormuyordu.

   Sebep uretecteydi: kol_uret.py ben10_ikonu kafa agacindaki ilk
   kupun on yuzunu kesiyor. Ates'te o kup `head_ic`, on yuzu dokunun
   saydam bolgesine dusuyor; asil kafa `flames`, genisligi 0 olan bir
   duzlem. Artik secilen bolge bossa butun yuzlere bakiliyor.

   1. depodaki 600 esya: ikon gorunur, attachable'lar tam ve elde
      gorunur (arac/gorunum_denetle.py)
   2. denetim isiriyor: bilerek bozulmus kucuk bir eklentide her
      bozuklugu ayri ayri buluyor, saglam esyayi sucamiyor
   ================================================================ */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ARAC = new URL("../arac/gorunum_denetle.py", import.meta.url).pathname;
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const kos = (arg) => {
  try {
    return execFileSync("python3", ["-B", ARAC, ...arg], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
};
const sayi = (cikti, desen) => {
  const m = cikti.match(desen);
  return m ? parseInt(m[1], 10) : -1;
};

console.log("=== 1. DEPODAKI ESYALAR ===");
{
  const c = kos([]);
  const n = sayi(c, /^HATA : (-?\d+)/m);
  const esya = sayi(c, /^esya: (\d+)/m), gorunur = sayi(c, /ikonu gorunur: (\d+)/);
  const ek = sayi(c, /^attachable: (\d+)/m), elde = sayi(c, /elde gorunurlugu olculen: (\d+)/);
  kontrol("denetim calisti", n >= 0, n >= 0 ? "" : c.slice(0, 300));
  kontrol("esyalar bulundu", esya >= 500, String(esya));
  kontrol("ikonu gorunur esya (oyunun kendi dokusu disinda hepsi)", gorunur >= esya - 5, gorunur + "/" + esya);
  kontrol("attachable'larin hepsi elde olculdu", ek >= 300 && elde === ek, elde + "/" + ek);
  kontrol("gorunmeyen ya da eksik parca yok", n === 0,
          "HATA " + n + (n > 0 ? "\n" + c.split("\n").filter((s) => s.startsWith("##") || s.startsWith("  ")).slice(0, 12).join("\n") : ""));
}

console.log("");
console.log("=== 2. DENETIM ISIRIYOR (bilerek bozulmus eklenti) ===");
{
  const kok = mkdtempSync(join(tmpdir(), "gorunum-"));
  try {
    execFileSync("python3", ["-B", "-c", `
import json, os, sys
from PIL import Image
k = sys.argv[1]
bp, rp = os.path.join(k, "Simsek_TNT_ToprakTopu"), os.path.join(k, "Simsek_Kol_Kaynak")
for d in ("items",): os.makedirs(os.path.join(bp, d))
for d in ("textures/item", "attachables", "models/entity", "render_controllers", "animations", "entity"):
    os.makedirs(os.path.join(rp, d))
def yaz(y, v): json.dump(v, open(y, "w"))
def esya(ad, ikon):
    yaz(os.path.join(bp, "items", ad + ".json"), {"format_version": "1.21.0", "minecraft:item": {
        "description": {"identifier": "pa:" + ad}, "components": {"minecraft:icon": {"textures": {"default": ikon}}}}})
esya("iyi", "iyi"); esya("saydam", "saydam"); esya("anahtarsiz", "boyle_bir_anahtar_yok")
esya("elde_gorunmez", "iyi"); esya("geosuz", "iyi"); esya("elde_iyi", "iyi")
yaz(os.path.join(rp, "textures", "item_texture.json"), {"texture_data": {
    "iyi": {"textures": "textures/item/iyi"}, "saydam": {"textures": "textures/item/saydam"}}})
yaz(os.path.join(rp, "textures", "terrain_texture.json"), {"texture_data": {}})
Image.new("RGBA", (16, 16), (200, 50, 50, 255)).save(os.path.join(rp, "textures/item/iyi.png"))
Image.new("RGBA", (16, 16), (0, 0, 0, 0)).save(os.path.join(rp, "textures/item/saydam.png"))
yari = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
for x in range(8):
    for y in range(16): yari.putpixel((x, y), (30, 200, 30, 255))
yari.save(os.path.join(rp, "textures/item/yari.png"))
yaz(os.path.join(rp, "models/entity/k.geo.json"), {"format_version": "1.12.0", "minecraft:geometry": [
    {"description": {"identifier": "geometry.sag_yari", "texture_width": 16, "texture_height": 16},
     "bones": [{"name": "b", "cubes": [{"origin": [0, 0, 0], "size": [2, 2, 2], "uv": [8, 0]}]}]},
    {"description": {"identifier": "geometry.sol_yari", "texture_width": 16, "texture_height": 16},
     "bones": [{"name": "b", "cubes": [{"origin": [0, 0, 0], "size": [2, 2, 2], "uv": [0, 0]}]}]}]})
def ek(ad, geo):
    yaz(os.path.join(rp, "attachables", ad + ".json"), {"format_version": "1.10.0", "minecraft:attachable": {"description": {
        "identifier": "pa:" + ad, "materials": {"default": "entity_alphatest"},
        "textures": {"default": "textures/item/yari"}, "geometry": {"default": geo},
        "render_controllers": ["controller.render.item_default"]}}})
ek("elde_gorunmez", "geometry.sag_yari"); ek("geosuz", "geometry.boyle_yok"); ek("elde_iyi", "geometry.sol_yari")
`, kok]);
    const c = kos(["--kok", kok]);
    const bolum = (baslik) => {
      const i = c.indexOf("## " + baslik);
      if (i === -1) return "";
      const j = c.indexOf("\n##", i + 3);
      return c.slice(i, j === -1 ? undefined : j);
    };
    kontrol("saydam ikon bulundu", bolum("ikon TAMAMEN SAYDAM").includes("pa:saydam"));
    kontrol("atlasta olmayan ikon anahtari bulundu", bolum("ikon anahtari atlasta yok").includes("pa:anahtarsiz"));
    kontrol("kuplerin hepsi saydam bolgede: ELDE GORUNMEZ", bolum("ELDE GORUNMEZ").includes("elde_gorunmez"));
    kontrol("olmayan geometri bulundu", bolum("attachable geometrisi yok").includes("geosuz"));
    kontrol("saglam esyalar suclanmadi", !/pa:iyi\b|elde_iyi/.test(c), c.split("\n").filter((s) => /iyi/.test(s)).join(" | "));
    kontrol("hata sayisi tam dort", sayi(c, /^HATA : (-?\d+)/m) === 4, String(sayi(c, /^HATA : (-?\d+)/m)));
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> her esya envanterde ve elde gorunuyor");
process.exit(hata ? 1 : 0);
