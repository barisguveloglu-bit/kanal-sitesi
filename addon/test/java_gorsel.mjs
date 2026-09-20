/* JAVA GORSEL BICIMI -> BEDROCK GEOMETRISI              v7.94.5

   Kullanici: "java görsel formatını bedrock görsel formatına
   çevirebilecek bir ajan istiyorum ... araç olarak da
   kullanabilirsin".  Arac secildi: ajan her seferinde sifirdan
   basliyor, arac depoda kaliyor ve testle kilitleniyor.

   ---- NE COZUYOR ----
   Java tarafinda model IKI bicimde duruyor:
     1. ModelBase alt sinifi  -> bytecode  -> jar_model_coz.py (v7.94.3)
     2. Kaynak paketi JSON'u  -> `elements` -> BU (v7.94.5)
   Ikincisini hicbir sey cozmuyordu. Modern modlarda varlik
   disindaki her sey (esya, blok, silah) bu bicimde.

   ---- CAPA NEREDEN ----
   Kaydirma tahmin edilmedi: deponun kendi blok geometrilerinin
   (`Simsek_Kol_Kaynak/models/blocks/`) kemiklerinin HEPSI
   `pivot [-8, 0, -8]` tasiyor. Java 0-16 kutusunda blogun KOSESI
   sifir, Bedrock ise blogu ORTALIYOR -- fark tam olarak X ve Z'de
   -8. Y KAYMIYOR.

   DIKKAT -- jar_model_coz.py'nin cevrimi BASKA: orada Java +Y
   ASAGI oldugu icin `24 - y` var. Iki bicim iki ayri kural.
   Birini digerine uygulamak sessiz bir hata olurdu; 3. bolum
   ikisinin ayri kaldigini tutuyor.                            */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const ARAC = "../arac/java_gorsel_coz.py";
/* stdout VE stderr birlikte: arac uyarilari (dejenere duzlem,
   olcek asimi) stderr'e yaziyor ve ilk yazilista bu sinama
   onlari hic goremedi -- yanlislikla kirmizi yandi.          */
const kos = (args) => {
  try {
    const r = execFileSync("python3", [ARAC, ...args], {
      encoding: "utf8", cwd: import.meta.dirname,
      stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024
    });
    return r;
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
};
/* execFileSync YALNIZ stdout donduruyor; uyarilar stderr'de.
   Ikisini birden isteyen yerler spawnSync kullaniyor.        */
const kosTam = (args) => {
  const r = spawnSync("python3", [ARAC, ...args], {
    encoding: "utf8", cwd: import.meta.dirname,
    maxBuffer: 32 * 1024 * 1024
  });
  return { cikti: r.stdout || "", uyari: r.stderr || "" };
};

console.log("=== 1. CEVRIM CAPALARI ===");
{
  const cikti = kos(["--kendini-sina"]);
  const s = cikti.split("\n").find((x) => x.startsWith("HATA :"));
  const n = s ? parseInt(s.split(":")[1].trim(), 10) : -1;
  kontrol("kendini-sina calisti", n >= 0, n >= 0 ? "" : cikti.slice(0, 250));
  /* Capa SAYISI da olculuyor: liste bosaltilirsa HATA 0 cikar ve
     sinama hicbir sey olcmeden yesil yanardi.                  */
  const capa = cikti.split("\n").filter((x) => x.includes("origin ")).length;
  kontrol("uc gecimetrik capa olculdu", capa === 3, String(capa));
  for (const x of cikti.split("\n").filter((y) => y.includes("✗") || y.includes("BEKLENEN")))
    console.log("      " + x.trim());
  kontrol("capalar tutuyor", n === 0, "HATA " + n);
}

console.log("");
console.log("=== 2. GERCEK MODEL CEVRILIYOR ===");
{
  const d = mkdtempSync(join(tmpdir(), "jgorsel_"));
  const girdi = join(d, "m.json");
  writeFileSync(girdi, JSON.stringify({
    elements: [
      { from: [0, 0, 0], to: [16, 16, 16],
        faces: { up: { uv: [0, 0, 16, 16] } } },
      { from: [6, 0, 6], to: [10, 16, 10],
        rotation: { origin: [8, 3, 8], axis: "y", angle: 45 },
        faces: { north: { uv: [0, 0, 4, 16] } } }
    ]
  }));

  const geo = JSON.parse(kos([girdi, "--kimlik", "geometry.sinama"]));
  const g = geo["minecraft:geometry"][0];
  const kemik = g.bones[0];

  kontrol("format_version 1.12.0", geo.format_version === "1.12.0");
  kontrol("kimlik gecti", g.description.identifier === "geometry.sinama");
  kontrol("kemik pivotu [-8,0,-8]",
          JSON.stringify(kemik.pivot) === JSON.stringify([-8, 0, -8]),
          JSON.stringify(kemik.pivot));
  kontrol("iki eleman iki kutu oldu", kemik.cubes.length === 2,
          String(kemik.cubes.length));

  const tam = kemik.cubes[0];
  kontrol("tam blok origin [-8,0,-8]",
          JSON.stringify(tam.origin) === JSON.stringify([-8, 0, -8]),
          JSON.stringify(tam.origin));
  kontrol("tam blok size [16,16,16]",
          JSON.stringify(tam.size) === JSON.stringify([16, 16, 16]),
          JSON.stringify(tam.size));
  kontrol("yuz uv'si tasindi", !!(tam.uv && tam.uv.up), JSON.stringify(tam.uv || {}));

  const donuk = kemik.cubes[1];
  kontrol("donus tasindi", Array.isArray(donuk.rotation),
          JSON.stringify(donuk.rotation || null));
  /* Bedrock donusu matematiksel donusun TERSI; Y ekseninde
     isaret korunuyor (bkz. REFERANS_BORALO.md olcumu).        */
  kontrol("Y donusu 45 derece", donuk.rotation && donuk.rotation[1] === 45,
          JSON.stringify(donuk.rotation));
  kontrol("donus pivotu da kaydirildi",
          donuk.pivot && donuk.pivot[0] === 0 && donuk.pivot[2] === 0,
          JSON.stringify(donuk.pivot));
}

console.log("");
console.log("=== 3. IKI CEVRIM BIRBIRINE KARISMIYOR ===");
{
  /* jar_model_coz.py ModelBase icin `24 - y` uyguluyor (Java'da
     +Y asagi). Bu arac `elements` icin Y'ye HIC dokunmuyor.
     Biri otekine sizarsa modeller sessizce ters/kayik cikar. */
  const kaynak = readFileSync(new URL("../arac/java_gorsel_coz.py", import.meta.url), "utf8");
  /* Dosyanin BASLIGINDA iki cevrimin farki anlatiliyor, yani
     "24 -" metni aciklama olarak geciyor. Olculmesi gereken
     ACIKLAMA degil, CEVRIM FONKSIYONU. Ilk yazilista butun
     dosyaya bakildi ve kendi belgesine takildi.              */
  const govde = (kaynak.match(/def cevir_origin[\s\S]*?\n\n/) || [""])[0];
  kontrol("cevir_origin Y'ye dokunmuyor",
          govde.includes("frm[1]") && !govde.includes("24"),
          govde.trim().split("\n").pop());
  kontrol("blok kaydirmasi tanimli", kaynak.includes("BLOK_KAYDIRMA"));

  const oteki = readFileSync(new URL("../jar_model_coz.py", import.meta.url), "utf8");
  kontrol("jar_model_coz hâlâ '24 -' kullaniyor", oteki.includes("24 -"),
          "ModelBase cevrimi ayri kalmali");
}

console.log("");
console.log("=== 4. RAPOR KIPI KULLANILAMAZ MODELI YAKALIYOR ===");
{
  /* NarutoMod'un Shukaku modeli 82.558 elemandi ve %100'u sifir
     kalinlikli duzlemdi: cevrilebilirdi ama Bedrock'ta
     cizilemezdi. Rapor kipi bu hükmü ONCEDEN vermeli.        */
  const d = mkdtempSync(join(tmpdir(), "jgorsel2_"));
  const girdi = join(d, "duzlem.json");
  const elemanlar = [];
  for (let i = 0; i < 400; i++)
    elemanlar.push({ from: [i % 16, 0, 0], to: [i % 16, 1, 1],
                     faces: { west: { uv: [0, 0, 1, 1] } } });
  writeFileSync(girdi, JSON.stringify({ elements: elemanlar }));

  const { cikti, uyari } = kosTam([girdi, "--rapor"]);
  const r = JSON.parse(cikti.slice(cikti.indexOf("{")));
  kontrol("eleman sayisi dogru", r.eleman === 400, String(r.eleman));
  kontrol("dejenere duzlemler sayildi", r.dejenere === 400, String(r.dejenere));
  kontrol("makul DEGIL diyor", r.makul === false, String(r.makul));
  kontrol("uyari yazildi", uyari.includes("cizilmez") && uyari.includes("duzlem yigini"),
          uyari.trim().split("\n")[0] || "uyari yok");
}

// --------------------------------------------------------------
// v7.94.8: Java'da TERS yazilmis element (from > to).
// Java bunu tolere edip AYNI kutuyu ciziyor; cevirici eskiden
// bunu negatif `size`a ceviriyordu ve Bedrock kutuyu ciziyorsa
// bile ters/aynalanmis ciziyordu. Artik normallestiriliyor.
// Gercek ornek: Craftformers'in block/energon_tank modeli.
console.log("");
console.log("=== 5. TERS ELEMAN NORMALLESTIRILIYOR ===");
{
  const d = mkdtempSync(join(tmpdir(), "jgorsel5_"));
  const girdi = join(d, "ters.json");
  writeFileSync(girdi, JSON.stringify({
    elements: [
      // X ekseni ters yazilmis -- energon_tank ile ayni kalip
      { from: [15.998, 0.002, 0.002], to: [0.002, 15.998, 15.998],
        faces: { north: { uv: [0, 0, 16, 16] } } },
    ],
  }));

  const { cikti, uyari } = kosTam([girdi, "--kimlik", "geometry.ters"]);
  const geo = JSON.parse(cikti);
  const kup = geo["minecraft:geometry"][0].bones[0].cubes[0];

  kontrol("hicbir boyut bileseni negatif degil",
          kup.size.every((x) => x >= 0), JSON.stringify(kup.size));
  kontrol("boyut mutlak degeri korundu",
          kup.size.every((x) => Math.abs(x - 15.996) < 1e-6),
          JSON.stringify(kup.size));
  kontrol("origin kucuk koseden turetildi (X/Z -8)",
          Math.abs(kup.origin[0] - (0.002 - 8)) < 1e-6 &&
          Math.abs(kup.origin[2] - (0.002 - 8)) < 1e-6,
          JSON.stringify(kup.origin));
  kontrol("Y kaymadi (elements kuralı)",
          Math.abs(kup.origin[1] - 0.002) < 1e-6, String(kup.origin[1]));

  // --rapor bunu SOYLEMELI: sessizce duzeltmek kaynagin bozuk
  // oldugunu gizler.
  const r = kosTam([girdi, "--rapor"]);
  const o = JSON.parse(r.cikti.slice(r.cikti.indexOf("{")));
  kontrol("rapor ters kutuyu sayiyor", o.ters === 1, String(o.ters));
  kontrol("rapor ters kutuyu yaziyor", r.uyari.includes("ters yazilmis"),
          r.uyari.trim().split("\n")[0] || "uyari yok");

  // Duz (normal) bir eleman ters sayilmamali.
  const girdi2 = join(d, "duz.json");
  writeFileSync(girdi2, JSON.stringify({
    elements: [{ from: [0, 0, 0], to: [16, 16, 16],
                 faces: { north: { uv: [0, 0, 16, 16] } } }],
  }));
  const r2 = kosTam([girdi2, "--rapor"]);
  const o2 = JSON.parse(r2.cikti.slice(r2.cikti.indexOf("{")));
  kontrol("duz eleman ters SAYILMIYOR", o2.ters === 0, String(o2.ters));
}

console.log("");
console.log(hata ? "SORUN VAR" : "temiz");
process.exit(hata ? 1 : 0);
