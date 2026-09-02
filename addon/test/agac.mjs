/* KURUYAN AGAC                                          v7.11

   LORE.md'nin MERKEZINDEKI nesne bugune kadar oyunda yoktu.
   "Unutulan Efsane -- Kuruyan Agac": her nesilde Kanli Goz'u
   tasiyan kisi ismini o agaca yazdiriyordu; agac kuruyunca
   isimler yazilamaz oldu ve efsane kayboldu.

   Teknik "BoraLo MOD V5+" paketindeki CALISAN `codeman_tree`
   feature'indan olculdu (bkz. REFERANS_BORALO_V5.md). Ayni
   paketteki CEVHER ozelligi ise BOZUK: "places_block": null ve
   "may_replace": [] -- yani hicbir sey koymuyor. Bu dosyanin
   yarisi tam olarak o hatanin bize gecmedigini tutuyor.

   Bir blok icin DORT kayit gerekiyor ve biri eksikse blok ya
   gorunmez ya mor-siyah cikar ya da kirinca hicbir sey
   dusurmez:
     1) blocks/*.json        (BP)
     2) blocks.json          (RP)
     3) terrain_texture.json (RP)
     4) loot_tables/         (BP)                             */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

const KUTUK = "kuruyan_kutuk";
const YAPRAK = "kuruyan_yaprak";

console.log("=== 1. DORT KAYIT DA VAR ===");
{
  for (const b of [KUTUK, YAPRAK]) {
    kontrol(b + ": blocks/*.json", existsSync(BP + "/blocks/" + b + ".json"));
    kontrol(b + ": loot_tables/", existsSync(BP + "/loot_tables/blocks/" + b + ".json"));
    kontrol(b + ": dokusu diskte",
            existsSync(RP + "/textures/blocks/" + b + ".png"));
  }
  const terrain = oku(RP + "/textures/terrain_texture.json").texture_data;
  const bloklar = oku(RP + "/blocks.json");
  for (const b of [KUTUK, YAPRAK]) {
    kontrol(b + ": terrain_texture.json'da", !!terrain[b], terrain[b] &&
            terrain[b].textures);
    kontrol(b + ": blocks.json'da", !!bloklar["pa:" + b],
            bloklar["pa:" + b] && bloklar["pa:" + b].sound);
  }
  /* Ses de yanlis olmamali: tas sesi cikan bir agac govdesi. */
  kontrol("govde sesi wood", bloklar["pa:" + KUTUK].sound === "wood");
  kontrol("yaprak sesi grass", bloklar["pa:" + YAPRAK].sound === "grass");
}

console.log("");
console.log("=== 2. CIZIM YONTEMI: alpha_test / opaque ===");
{
  const k = oku(BP + "/blocks/" + KUTUK + ".json")["minecraft:block"];
  const y = oku(BP + "/blocks/" + YAPRAK + ".json")["minecraft:block"];
  kontrol("kimlikler pa: onekli",
          k.description.identifier === "pa:" + KUTUK &&
          y.description.identifier === "pa:" + YAPRAK);
  const km = k.components["minecraft:material_instances"]["*"];
  const ym = y.components["minecraft:material_instances"]["*"];
  kontrol("govde opaque", km.render_method === "opaque", km.render_method);
  /* opaque yazilsaydi dokudaki saydam pikseller SIYAH cikardi
     ve kuru tepe kapkara bir kup olurdu.                     */
  kontrol("yaprak alpha_test", ym.render_method === "alpha_test",
          ym.render_method);

  const p = JSON.parse(execFileSync("python3", ["-c", `
from PIL import Image
import json
def say(y):
    im = Image.open(y).convert("RGBA")
    saydam = sum(1 for x in range(16) for j in range(16)
                 if im.getpixel((x, j))[3] == 0)
    renk = set(im.getpixel((x, j))[:3] for x in range(16) for j in range(16)
               if im.getpixel((x, j))[3])
    # Satir ve sutun basina saydam sayilari: KAFES tespiti icin
    sat = [sum(1 for x in range(16) if im.getpixel((x, j))[3] == 0)
           for j in range(16)]
    sut = [sum(1 for j in range(16) if im.getpixel((x, j))[3] == 0)
           for x in range(16)]
    return {"saydam": saydam, "renk": len(renk), "satir": sat, "sutun": sut}
print(json.dumps({"kutuk": say(${JSON.stringify(RP + "/textures/blocks/" + KUTUK + ".png")}),
                  "yaprak": say(${JSON.stringify(RP + "/textures/blocks/" + YAPRAK + ".png")})}))
`], { encoding: "utf8" }));

  kontrol("govde dokusunda saydam piksel YOK", p.kutuk.saydam === 0,
          p.kutuk.saydam + " piksel");
  /* alpha_test'in bir anlami olmali: yaprak gercekten delikli. */
  kontrol("yaprak dokusunda saydam piksel VAR",
          p.yaprak.saydam > 20, p.yaprak.saydam + " / 256");
  kontrol("yaprak tamamen bosalmamis", p.yaprak.saydam < 180,
          p.yaprak.saydam + " / 256");
  /* Renkler turetiliyor, elle yazilmiyor: govdede dort ton var
     (govde, oluk, kazik, bal), yaprakta iki.                  */
  kontrol("govde dort tonlu", p.kutuk.renk <= 5, p.kutuk.renk + " renk");
  kontrol("yaprak iki tonlu", p.yaprak.renk <= 3, p.yaprak.renk + " renk");

  /* ---- KAFES DENETIMI ----
     Ilk cizimde desen `(x*7 + y*11) % 9` gibi LINEER bir
     ifadeyle uretilmisti ve render'a bakinca goruldu: yaprak
     capraz cizgili bir KUMAS gibi cikiyordu. Lineer ifadenin
     imzasi su -- her satirda ayni sayida saydam piksel olur.
     Ayni ders goz.js'te de yazili (mulberry32 notu).        */
  const fark = (a) => Math.max(...a) - Math.min(...a);
  kontrol("yaprak deseni KAFES degil (satirlar farkli)",
          fark(p.yaprak.satir) >= 3,
          "satir farki " + fark(p.yaprak.satir));
  kontrol("yaprak deseni KAFES degil (sutunlar farkli)",
          fark(p.yaprak.sutun) >= 3,
          "sutun farki " + fark(p.yaprak.sutun));
}

console.log("");
console.log("=== 3. GANIMET: FIDAN YOK (kanon) ===");
{
  const k = oku(BP + "/loot_tables/blocks/" + KUTUK + ".json");
  const y = oku(BP + "/loot_tables/blocks/" + YAPRAK + ".json");
  kontrol("govde kirilinca govde dusuyor",
          k.pools[0].entries[0].name === "pa:" + KUTUK);
  /* LORE: "Agac kuruduktan sonra isimler yazilamaz oldu ...
     efsane tamamen kayboldu." Yeniden dikilebilen bir agac o
     cumleyi yalanlardi. Bos havuz EKSIK DEGIL, kanon.        */
  kontrol("yaprak HICBIR SEY dusurmuyor (fidan yok)",
          Array.isArray(y.pools) && y.pools.length === 0,
          JSON.stringify(y.pools));
}

console.log("");
console.log("=== 4. AGAC OZELLIGI ===");
{
  const f = oku(BP + "/features/kuruyan_agac_feature.json")["minecraft:tree_feature"];
  kontrol("govde blogu BIZIM blogumuz",
          f.fancy_trunk.trunk_block === "pa:" + KUTUK,
          String(f.fancy_trunk.trunk_block));
  kontrol("yaprak blogu BIZIM blogumuz",
          f.fancy_canopy.leaf_block === "pa:" + YAPRAK,
          String(f.fancy_canopy.leaf_block));
  /* Kaynagin cevher ozelligi "places_block": null yaziyordu --
     hicbir sey koymayan bir ozellik. Buradaki karsiligi:
     blok adlarinin BOS olmamasi.                            */
  kontrol("blok adlari bos degil",
          !!f.fancy_trunk.trunk_block && !!f.fancy_canopy.leaf_block);
  kontrol("uzerinde bitebilecegi blok listesi dolu",
          Array.isArray(f.base_block) && f.base_block.length > 0,
          String((f.base_block || []).length));

  /* LORE: "upuzun bir agac" ve KURUMUS. Govde uzun, tepe
     kucuk olmali; tersi hikayeyi yalanlar.                  */
  const boy = f.fancy_trunk.trunk_height;
  kontrol("govde uzun (taban >= 8)", boy.base >= 8, String(boy.base));
  kontrol("tepe KUCUK (yaricap <= 3)", f.fancy_canopy.radius <= 3,
          String(f.fancy_canopy.radius));
  kontrol("tepe govdeden alcak", f.fancy_canopy.height < boy.base,
          f.fancy_canopy.height + " < " + boy.base);
}

console.log("");
console.log("=== 5. URETIM KURALI ===");
{
  const r = oku(BP + "/feature_rules/kuruyan_agac_rule.json")["minecraft:feature_rules"];
  kontrol("dogru ozelligi yerlestiriyor",
          r.description.places_feature === "pa:kuruyan_agac_feature",
          r.description.places_feature);
  /* Agac YUZEYE cikiyor. underground_pass yazilsaydi agac
     tasin icinde uretilirdi.                                */
  kontrol("surface_pass", r.conditions.placement_pass === "surface_pass",
          r.conditions.placement_pass);
  /* Kaynakta biome_filter [{"any_of": []}] yaziyordu -- BOS
     any_of hicbir biyomla eslesmez, yani ozellik hic
     calismaz. Bizimkinin gercek bir testi olmali.           */
  const bf = r.conditions["minecraft:biome_filter"];
  kontrol("biyom suzgeci BOS DEGIL",
          Array.isArray(bf) && bf.length > 0 && !!bf[0].test,
          JSON.stringify(bf));
  kontrol("overworld biyomlari", bf[0].value === "overworld", bf[0].value);
  /* Efsane: nadir ama bulunamayacak kadar degil.            */
  kontrol("nadir (scatter_chance <= 5)", r.distribution.scatter_chance <= 5,
          String(r.distribution.scatter_chance));
  kontrol("ama sifir degil", r.distribution.scatter_chance > 0);
  kontrol("y yukseklik haritasindan",
          typeof r.distribution.y === "string" &&
          r.distribution.y.includes("heightmap"), String(r.distribution.y));
}

console.log("");
console.log("=== 6. ADLAR IKI DILDE ===");
{
  for (const d of ["en_US.lang", "tr_TR.lang"]) {
    const m = readFileSync(RP + "/texts/" + d, "utf8");
    for (const b of [KUTUK, YAPRAK]) {
      const satir = m.split("\n").find((r) => r.startsWith("tile.pa:" + b + ".name="));
      /* Anahtar eksikse ya da degeri bossa oyunda blogun ADI
         yerine ANAHTARI gorunur ve sebebi tabletten anlasilmaz. */
      kontrol(d + ": " + b + " adi dolu",
              !!satir && satir.split("=")[1].trim().length > 0, satir);
    }
  }
}

console.log("");
console.log("=== 7. BIZIM CEVHERIMIZ HALA SAGLAM ===");
{
  /* Kaynaktaki iki hatanin bizde OLMADIGINI da tutuyoruz --
     ayni dosyaya bakiliyor, ayni tuzak.                     */
  const o = oku(BP + "/features/freedom_stone_ore_feature.json")["minecraft:ore_feature"];
  const kural = o.replace_rules[0];
  kontrol("cevher gercekten bir blok koyuyor",
          !!kural.places_block, String(kural.places_block));
  kontrol("yerine gececegi bloklar tanimli",
          Array.isArray(kural.may_replace) && kural.may_replace.length > 0,
          String((kural.may_replace || []).length));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Kuruyan Agac yerinde");
process.exit(hata ? 1 : 0);
