/* ================================================================
   GERCEK MOTORUN REDDETTIGI BICIMLER                      v7.99.17

   Bu takimdaki her sey @minecraft/server'in SAHTESINE karsi
   kosuyor; sahte motor JSON okumuyor. Paket gercek motorda (BDS
   1.26.52.3, `sunucu/acilis_dene.py`) acilinca 958 hata/uyari
   satiri cikti. Hicbirini bu takim goremezdi.

   Bu dosya o bulgulari DOSYA duzeyinde kilitliyor ki bir daha
   sizarlarsa motoru acmadan gorulsun:

     371 hata   minecraft:armor 1.21.0 biciminde yok
     558 uyari  minecraft:icon {"texture"} semada yok
      13 hata   tarifte unlock yok -> tarif YUKLENMIYOR
       7 hata   must_see_forget_ticks diye bir alan yok
     4+4        bir blokta opak ve saydam malzeme karisik

   Bu dosya motorun YERINE gecmiyor: yalniz bilinen bes bicimi
   tutuyor. Yeni bir bicim hatasini yine ancak motor soyler --
   buyuk bir degisiklikten sonra `acilis_dene.py` kosulmali.
   ================================================================ */
import { readFileSync, readdirSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const kisalt = (l) => l.slice(0, 4).join(", ") + (l.length > 4 ? " … (+" + (l.length - 4) + ")" : "");

function jsonlar(dizin) {
  const c = [];
  if (!existsSync(dizin)) return c;
  for (const g of readdirSync(dizin, { withFileTypes: true })) {
    const yol = dizin + "/" + g.name;
    if (g.isDirectory()) c.push(...jsonlar(yol));
    else if (g.name.endsWith(".json")) c.push(yol);
  }
  return c.sort();
}
const oku = (yol) => JSON.parse(readFileSync(yol, "utf8"));
const ad = (yol) => yol.slice(BP.length + 1);
const surum = (s) => String(s).split(".").map(Number);
const buyukEsit = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
};

console.log("=== 1. ESYA: IKON VE ZIRH BICIMI ===");
{
  const esyalar = jsonlar(BP + "/items");
  const eskiIkon = [], zirhBileseni = [], korumasiz = [], ikonsuz = [];
  let yeniBicim = 0, eskiBicim = 0, giyilen = 0;
  for (const yol of esyalar) {
    const d = oku(yol);
    const c = d["minecraft:item"].components || {};
    const yeni = buyukEsit(surum(d.format_version), [1, 20, 60]);
    const ik = c["minecraft:icon"];
    if (yeni) {
      yeniBicim++;
      /* 1.20.60+ : {"textures": {"default": X}} ya da duz dize. */
      const gecerli = typeof ik === "string" ||
        (ik && ik.textures && typeof ik.textures.default === "string" && !("texture" in ik));
      if (ik !== undefined && !gecerli) eskiIkon.push(ad(yol));
      if ("minecraft:armor" in c) zirhBileseni.push(ad(yol));
    } else {
      eskiBicim++;
      /* Eski bicimde {"texture": X} DOGRU olan; motor uyarmiyor. */
      if (ik !== undefined && !(typeof ik === "string" || typeof ik.texture === "string")) {
        eskiIkon.push(ad(yol));
      }
    }
    if (ik === undefined) ikonsuz.push(ad(yol));
    /* Koruma artik YALNIZ wearable'da. armor bileseni silinirken
       koruma da onunla gitmis olmasin.                          */
    const w = c["minecraft:wearable"];
    if (w) {
      giyilen++;
      if (typeof w.protection !== "number" || w.protection < 0) korumasiz.push(ad(yol));
    }
  }
  kontrol("esyalar okundu", esyalar.length >= 500,
          esyalar.length + " esya · " + yeniBicim + " yeni bicim · " + eskiBicim + " eski bicim");
  kontrol("ikon bicimi esyanin format_version'ina uyuyor", eskiIkon.length === 0, kisalt(eskiIkon));
  kontrol("her esyanin ikonu var", ikonsuz.length === 0, kisalt(ikonsuz));
  kontrol("yeni bicimde minecraft:armor yok", zirhBileseni.length === 0, kisalt(zirhBileseni));
  kontrol("giyilen her esya korumasini wearable'da tasiyor",
          giyilen > 300 && korumasiz.length === 0,
          giyilen + " giyilen" + (korumasiz.length ? " · " + kisalt(korumasiz) : ""));
}

console.log("");
console.log("=== 2. TARIF: UNLOCK ===");
{
  const tarifler = jsonlar(BP + "/recipes");
  const kilitsiz = [];
  for (const yol of tarifler) {
    const d = oku(yol);
    for (const [anahtar, govde] of Object.entries(d)) {
      if (!anahtar.startsWith("minecraft:recipe_")) continue;
      const u = govde.unlock;
      const gecerli = (Array.isArray(u) && u.length > 0) ||
                      (u && typeof u === "object" && typeof u.context === "string");
      /* 1.20.0'dan beri tezgah tarifleri unlock tasimak zorunda;
         tasimayan tarif motor tarafindan YUKLENMIYOR.          */
      if (!gecerli && buyukEsit(surum(d.format_version), [1, 20, 0])) kilitsiz.push(ad(yol));
    }
  }
  kontrol("tarifler okundu", tarifler.length >= 13, tarifler.length + " tarif");
  kontrol("her tarifin unlock verisi var", kilitsiz.length === 0, kisalt(kilitsiz));
}

console.log("");
console.log("=== 3. VARLIK: HEDEF UNUTMA SURESI ===");
{
  const varliklar = jsonlar(BP + "/entities");
  const eskiAlan = [], sureler = [];
  const gez = (dugum, yol) => {
    if (!dugum || typeof dugum !== "object") return;
    if ("must_see_forget_ticks" in dugum) eskiAlan.push(ad(yol));
    if (typeof dugum.must_see_forget_duration === "number" && ad(yol).includes("ilkel_")) {
      sureler.push(dugum.must_see_forget_duration);
    }
    for (const v of Object.values(dugum)) gez(v, yol);
  };
  for (const yol of varliklar) gez(oku(yol), yol);
  kontrol("must_see_forget_ticks hicbir varlikta yok", eskiAlan.length === 0, kisalt(eskiAlan));
  /* Uretecteki 200 tick = 10 saniye. Alan adi degisirken birim de
     degisti (tick -> saniye); 200 yazilsaydi 200 SANIYE olurdu.  */
  kontrol("Ilkel Besli'nin unutma suresi 10 saniye",
          sureler.length >= 5 && sureler.every((s) => s === 10),
          sureler.join(","));
}

console.log("");
console.log("=== 4. BLOK: MALZEME YONTEMI TEK ===");
{
  const bloklar = jsonlar(BP + "/blocks");
  const karisik = [];
  const bak = (bilesenler, yol) => {
    const m = bilesenler && bilesenler["minecraft:material_instances"];
    if (!m) return;
    /* Yazilmayan render_method motorun varsayilani: opaque. */
    const yontemler = new Set(Object.values(m).map((v) => v.render_method || "opaque"));
    if (yontemler.size > 1) karisik.push(ad(yol) + " [" + [...yontemler].join("+") + "]");
  };
  for (const yol of bloklar) {
    const b = oku(yol)["minecraft:block"];
    bak(b.components, yol);
    for (const p of b.permutations || []) bak(p.components, yol);
  }
  kontrol("bloklar okundu", bloklar.length >= 10, bloklar.length + " blok");
  kontrol("hicbir blok malzeme yontemlerini karistirmiyor", karisik.length === 0, kisalt(karisik));
}

console.log(hata ? ">>> SORUN VAR" : ">>> motor bicimi temiz");
process.exit(hata ? 1 : 0);
