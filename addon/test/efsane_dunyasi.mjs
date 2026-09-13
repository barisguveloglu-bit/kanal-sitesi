/* EFSANENIN DUNYASI -- gokyuzu paketi + hazir dunya    v7.85

   Kullanici: "bana ait bir ozel tohum olacak ... her yeri
   bedrock ama her yeri hava ... ben hani havayi yapmak
   istedim ama etraf oluyor yani gokyuzu olmuyor, gokyuzunu de
   ayarla ... bana ozel bir dunya olacak."

   ---- BU DOSYA NEDEN VAR ----
   Uretilen iki sey de OYUNDA DENENEMIYOR. Ne level.dat'i
   yukleyebiliyorum ne gokyuzunun rengini gorebiliyorum. O
   yuzden sinanabilen her sey burada siniyor:

     - yazdigim level.dat geri okununca ayni mi (tur dahil)
     - arazi gercekten tek kat bedrock mu
     - gokyuzu rengi sisten AYIRT EDILEBILIR mi (olculen sey:
       kontrast orani -- kullanicinin sikayeti "bildigin sis
       oluyor" idi, yani ayirt edilemiyordu)
     - renk kaynagi tek mi (sis.js ile ayni deger)
     - paket AYRI mi kalmis (.mcaddon'a sizmamis)

   Son madde en onemlisi: gokyuzu paketi .mcaddon'a girerse
   modu kuran herkesin butun dunyasi degisir.                */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const GK  = join(KOK, "Simsek_Efsane_Gokyuzu");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* Uretilen dosyalarin surumu paket adinda geciyor; adi
   manifestten okuyoruz ki test surum bumpinda kirilmasin. */
const SURUM = oku(join(KOK, "Simsek_TNT_ToprakTopu/manifest.json"))
                .header.version.join(".");
const SABLON = join(KOK, "Simsek_v" + SURUM + "_Efsane_Dunyasi.mctemplate");

console.log("=== 1. URETILDI MI ===");
kontrol("gokyuzu paketi klasoru var", existsSync(GK));
kontrol("manifest var", existsSync(join(GK, "manifest.json")));
kontrol("dunya dosyasi uretilmis", existsSync(SABLON),
        "Simsek_v" + SURUM + "_Efsane_Dunyasi.mctemplate");

console.log("");
console.log("=== 2. RENK: TEK KAYNAK ve AYIRT EDILEBILIR ===");
{
  const biyomlar = existsSync(join(GK, "biomes"))
    ? readdirSync(join(GK, "biomes")).filter((f) => f.endsWith(".json")) : [];
  kontrol("biyom dosyalari var", biyomlar.length > 20,
          biyomlar.length + " biyom");

  /* Duz dunyanin biyomu plains (FlatWorldLayers biome_id 1).
     Hazir dunyada rengin tutmasi BUNA bagli -- listede plains
     yoksa kullanicinin dunyasinda gokyuzu vanilla kalir.   */
  kontrol("plains tanimli (hazir dunyanin biyomu)",
          biyomlar.indexOf("plains.json") !== -1);

  const p = oku(join(GK, "biomes/plains.json"));
  const bil = p["minecraft:client_biome"].components;
  const gok = bil["minecraft:sky_color"].sky_color;
  kontrol("gokyuzu rengi yazili", /^#[0-9A-F]{6}$/.test(gok), gok);

  /* Sis rengi ANA PAKETTEN okunuyor: iki yerde duran bir renk
     bir gun ayrisir. sis.js'in kullandigi dosyanin ta kendisi. */
  const sisDosya = oku(join(KOK, "Simsek_Kol_Kaynak/fogs/sis_simsek.json"));
  const sis = sisDosya["minecraft:fog_settings"].distance.air.fog_color;
  kontrol("sis rengi ana paketle ayni",
          oku(join(GK, "fogs/efsane_dunyasi.json"))
            ["minecraft:fog_settings"].distance.air.fog_color === sis, sis);

  /* ASIL OLCUM: kullanicinin sikayeti "bildigin sis oluyor,
     gokyuzu olmuyor" idi. Gokyuzu sisten ayirt edilemezse
     duzeltme hicbir sey duzeltmemis olur. Esik 3:1 --
     WCAG'in grafik nesneler icin ayirt edilebilirlik siniri. */
  const oran = Number(execFileSync("python3", ["-c", `
def h2(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i+2],16)/255 for i in (0,2,4))
def lum(c):
    def f(v): return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    r,g,b = h2(c); return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
a,b = lum("${gok}"), lum("${sis}")
hi,lo = max(a,b), min(a,b)
print("%.4f" % ((hi+0.05)/(lo+0.05)))
`], { encoding: "utf8" }).trim());
  kontrol("gokyuzu sisten AYIRT EDILEBILIR (>= 3:1)", oran >= 3.0,
          oran.toFixed(2) + ":1  (gok " + gok + " / sis " + sis + ")");
  /* Ust sinir da var: cok koyu gokyuzu bu sefer geceye benzer
     ve "bizim rengimiz" olmaktan cikar.                     */
  kontrol("ama siyaha kacmamis (<= 6:1)", oran <= 6.0, oran.toFixed(2) + ":1");

  kontrol("biyom sisi de bizim sisimize baglanmis",
          bil["minecraft:fog_appearance"].fog_identifier ===
          oku(join(GK, "fogs/efsane_dunyasi.json"))
            ["minecraft:fog_settings"].description.identifier,
          bil["minecraft:fog_appearance"].fog_identifier);
}

console.log("");
console.log("=== 3. DUNYA: ARAZI ve TOHUM ===");
{
  const d = JSON.parse(execFileSync("python3", ["-c", `
import sys, json, zipfile
sys.path.insert(0, ${JSON.stringify(join(KOK, "arac"))})
from nbt import level_dat_oku
z = zipfile.ZipFile(${JSON.stringify(SABLON)})
s, d = level_dat_oku(z.read("level.dat"))
tur = {1:"BAYT",3:"TAM",4:"UZUN",6:"CIFT",8:"YAZI",9:"LISTE"}
cikti = {k: [tur.get(v.tur, v.tur),
             (v.deger if not isinstance(v.deger, list)
              else [x.deger for x in v.deger])]
         for k, v in d.items()}
print(json.dumps({"basliksurum": s, "alanlar": cikti,
                  "girdiler": z.namelist()[:0] or [],
                  "var": sorted(set(x.split("/")[0] for x in z.namelist()))}))
`], { encoding: "utf8", maxBuffer: 40 * 1024 * 1024 }));

  const a = d.alanlar;
  kontrol("level.dat geri okunabiliyor", !!a && Object.keys(a).length > 10,
          Object.keys(a || {}).length + " alan");
  kontrol("baslik surumu 10", d.basliksurum === 10, String(d.basliksurum));
  kontrol("uretici DUZ (Generator=2)", a.Generator && a.Generator[1] === 2,
          String(a.Generator && a.Generator[1]));

  const kat = JSON.parse(a.FlatWorldLayers[1]);
  kontrol("arazi TEK katman", kat.block_layers.length === 1,
          JSON.stringify(kat.block_layers));
  kontrol("o katman BEDROCK",
          kat.block_layers[0].block_name === "minecraft:bedrock",
          kat.block_layers[0].block_name);
  kontrol("katman kalinligi 1 (ustu bos)",
          kat.block_layers[0].count === 1, String(kat.block_layers[0].count));
  kontrol("biyom plains (gokyuzu paketiyle ayni)", kat.biome_id === 1,
          String(kat.biome_id));

  kontrol("ozel tohum yazili",
          a.RandomSeed && a.RandomSeed[0] === "UZUN" && a.RandomSeed[1] !== 0,
          String(a.RandomSeed && a.RandomSeed[1]));

  /* TUR DENETIMI. Bu bicimde en sinsi hata yanlis tur: oyun
     alani sessizce atliyor, hicbir sey soylemiyor. Ilk
     yazilista rainLevel CIFT yazilmisti (Bedrock KESIR
     bekliyor) ve fark edilmesi bu maddeyle oldu.           */
  kontrol("commandsEnabled BAYT (TAM degil)",
          a.commandsEnabled && a.commandsEnabled[0] === "BAYT",
          a.commandsEnabled && a.commandsEnabled[0]);
  kontrol("showcoordinates BAYT",
          a.showcoordinates && a.showcoordinates[0] === "BAYT",
          a.showcoordinates && a.showcoordinates[0]);
  kontrol("Generator TAM", a.Generator[0] === "TAM", a.Generator[0]);
  kontrol("RandomSeed UZUN", a.RandomSeed[0] === "UZUN", a.RandomSeed[0]);

  /* Dogum y=1: bedrock y=0'da. y=4 yazilsaydi her giriste
     uc blok dusurdu.                                       */
  kontrol("dogum noktasi zeminin USTUNDE (y=1)",
          a.SpawnY && a.SpawnY[1] === 1, String(a.SpawnY && a.SpawnY[1]));

  kontrol("sablonda db/ klasoru var", d.var.indexOf("db") !== -1,
          d.var.join(" "));
  kontrol("paketler sablonun icinde",
          d.var.indexOf("behavior_packs") !== -1 &&
          d.var.indexOf("resource_packs") !== -1, d.var.join(" "));
}

console.log("");
console.log("=== 4. DUNYAYA BAGLI PAKETLER GERCEKTEN VAR MI ===");
{
  const listele = (yol) => execFileSync("python3", ["-c", `
import zipfile, json, sys
z = zipfile.ZipFile(${JSON.stringify(SABLON)})
print(z.read(sys.argv[1]).decode("utf-8"))
`, yol], { encoding: "utf8" });

  const dp = JSON.parse(listele("world_behavior_packs.json"));
  const kp = JSON.parse(listele("world_resource_packs.json"));

  const bpId = oku(join(KOK, "Simsek_TNT_ToprakTopu/manifest.json")).header.uuid;
  const rpId = oku(join(KOK, "Simsek_Kol_Kaynak/manifest.json")).header.uuid;
  const gkId = oku(join(GK, "manifest.json")).header.uuid;

  kontrol("davranis paketi bagli", dp.some((x) => x.pack_id === bpId));
  kontrol("gorunum paketi bagli", kp.some((x) => x.pack_id === rpId));
  /* Bu madde olmadan kullanici dunyayi aciyor ve gokyuzu
     vanilla mavi kaliyor -- yani istedigi tek sey eksik. */
  kontrol("GOKYUZU paketi bagli", kp.some((x) => x.pack_id === gkId), gkId);

  kontrol("bagli surumler paketin surumuyle ayni",
          dp.concat(kp).every((x) => x.version.join(".") === SURUM),
          dp.concat(kp).map((x) => x.version.join(".")).join(" "));
}

console.log("");
console.log("=== 5. GOKYUZU PAKETI AYRI KALMIS MI (asil madde) ===");
{
  /* Gokyuzu paketi .mcaddon'a girerse modu kuran HERKESIN
     butun dunyasi degisir. Bu depoda oyuncunun dunyasini
     geri alinamaz bicimde degistiren sey alinmiyor
     (REFERANS_BORALO_V5.md, biyom ezmesi maddesi).

     Madde metne degil DOSYAYA bakiyor: niyet beyani degil,
     paketin gercek icerigi.                                */
  const mcaddon = join(KOK, "Simsek_v" + SURUM + ".mcaddon");
  kontrol("mcaddon uretilmis", existsSync(mcaddon));
  if (existsSync(mcaddon)) {
    const ic = execFileSync("unzip", ["-Z1", mcaddon], { encoding: "utf8" });
    kontrol("mcaddon gokyuzu paketini ICERMIYOR",
            ic.indexOf("Simsek_Efsane_Gokyuzu") === -1,
            ic.indexOf("Simsek_Efsane_Gokyuzu") === -1 ? "temiz" : "SIZMIS");
    kontrol("  ama ana paketleri iceriyor",
            ic.indexOf("Simsek_TNT_ToprakTopu") !== -1 &&
            ic.indexOf("Simsek_Kol_Kaynak") !== -1);
  }
  const tekBasina = join(KOK, "Simsek_v" + SURUM + "_Gokyuzu.mcpack");
  kontrol("gokyuzu TEK BASINA .mcpack olarak var", existsSync(tekBasina),
          "Simsek_v" + SURUM + "_Gokyuzu.mcpack");
}

console.log("");
console.log("=== 6. SURUM TEK KAYNAKTAN ===");
{
  const bp = oku(join(KOK, "Simsek_TNT_ToprakTopu/manifest.json")).header.version;
  const gk = oku(join(GK, "manifest.json")).header.version;
  kontrol("gokyuzu paketi ana paketle ayni surumde",
          gk.join(".") === bp.join("."), gk.join(".") + " / " + bp.join("."));
  const sb = JSON.parse(execFileSync("python3", ["-c", `
import zipfile
z = zipfile.ZipFile(${JSON.stringify(SABLON)})
print(z.read("manifest.json").decode("utf-8"))
`], { encoding: "utf8" }));
  kontrol("dunya dosyasi da ayni surumde",
          sb.header.version.join(".") === bp.join("."),
          sb.header.version.join("."));
  kontrol("dunya dosyasinin modul turu world_template",
          sb.modules[0].type === "world_template", sb.modules[0].type);
  kontrol("dunya secenekleri KILITLI DEGIL",
          sb.header.lock_template_options === false,
          String(sb.header.lock_template_options));
}

console.log(hata ? ">>> SORUN VAR" : ">>> efsanenin dunyasi yerinde");
process.exit(hata ? 1 : 0);
