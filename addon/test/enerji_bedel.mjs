/* ENERJI BEDELLERI                                            v7.99.3

   Dis inceleme (7.98.1 analizi): "enerji kapisi var ama hicbir
   yetenek bedel yazmiyor". Dogruydu -- bilincli opt-in'di. Kullanici
   baglanmasini istedi; bedeller dort grupta, tek tabloda
   (ayarlar.js ENERJI_SINIF, gerekce ENERJI_BAGLI'nin ustunde).

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Calisan her yetenek tabloda ACIKCA yer aliyor: yeni eklenen
      bir yetenek sessizce bedelsiz kalmasin.
   2. Kendi kaynagi olanlar (ruh, mana, Fuzyon) ve kacis/savunma
      yetenekleri bedelsiz -- cift ceza yok, kilitli oyuncunun cikisi
      kapanmiyor.
   3. Gruplar sirali: agir > orta > hafif > 0.
   4. Uctan uca: sohbetten tetikleme bedeli dusuyor; yetmeyince
      yetenek CALISMIYOR ve enerji dusmuyor.
   5. Ac-kapa: acmak bedelli, kapatmak bedava.
   6. Kayitta `enerji: N` tabloyu eziyor.                          */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, sohbetTetikle, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const enerji = await import("./pack/enerji.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const bedel = (k) => enerji.enerjiBedeli(kayit.yetenekAl(k));

console.log("=== 1. HER YETENEK SINIFLANDIRILMIS ===");
{
  const hep = kayit.tumYetenekler();
  const bos = hep.filter((t) => enerji.enerjiGrubu(t.kimlik) === undefined && typeof t.enerji !== "number");
  kontrol("yetenek sayisi anlamli (> 300)", hep.length > 300, String(hep.length));
  kontrol("tabloda yeri olmayan yetenek YOK", bos.length === 0, bos.map((t) => t.kimlik).slice(0, 6).join(", "));
  const say = {};
  for (const t of hep) { const g = enerji.enerjiGrubu(t.kimlik) || "kayit"; say[g] = (say[g] || 0) + 1; }
  kontrol("dort grubun dordu de kullaniliyor",
          ["bedelsiz", "hafif", "orta", "agir"].every((g) => say[g] > 0), JSON.stringify(say));
}

console.log("\n=== 2. KENDI KAYNAGI VE KACIS BEDELSIZ ===");
{
  const kaynak = ["jjk_mor", "getsuga", "cero", "simbiyot", "gura_tenchi", "yami_delik",
                  "ope_gamma", "berserk", "fuzyon"];
  const mahou = kayit.tumYetenekler().filter((t) => t.kimlik.startsWith("mahou_")).map((t) => t.kimlik);
  const kotu = [...kaynak, ...mahou].filter((k) => bedel(k) !== 0);
  kontrol("ruh/mana/fuzyon yetenekleri bedelsiz (" + (kaynak.length + mahou.length) + ")", kotu.length === 0, kotu.join(","));
  const kacis = ["arinma", "savunma", "kafes", "guc_kapat"];
  kontrol("kacis ve savunma bedelsiz", kacis.every((k) => bedel(k) === 0),
          kacis.map((k) => k + "=" + bedel(k)).join(" "));
}

console.log("\n=== 3. GRUPLAR SIRALI ===");
{
  const G = ayar.ENERJI_GRUP_BEDEL;
  kontrol("agir > orta > hafif > bedelsiz = 0", G.agir > G.orta && G.orta > G.hafif && G.hafif > 0 && G.bedelsiz === 0,
          JSON.stringify(G));
  kontrol("agir tavani asmiyor (iki kez arka arkaya olabilmeli)", 2 * G.agir <= ayar.ENERJI_TAVAN);
  kontrol("ornekler: meteor agir, alan_simsegi orta, tek_simsek hafif",
          bedel("meteor") === G.agir && bedel("alan_simsegi") === G.orta && bedel("tek_simsek") === G.hafif,
          [bedel("meteor"), bedel("alan_simsegi"), bedel("tek_simsek")].join("/"));
}

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o._yazi = [];
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar(t) { o._yazi.push(String(t)); }, setTitle() {} };
  o.hasTag = () => true;
  o.getTags = () => [];
  _durum.oyuncular = [o];
  D.boyut._varliklar = [o];
  return o;
}
const tetikle = (o, k) => { sus(); sohbetTetikle(o, "yetenek " + k); tickIlerlet(ayar.KOL_GECIKME + 2); ac(); };

console.log("\n=== 4. UCTAN UCA: BEDEL DUSUYOR, YETMEYINCE DURUYOR ===");
{
  const o = kur("eb1");
  const t = kayit.yetenekAl("tek_simsek");
  const gercek = t.olustur;
  let cagri = 0;
  t.olustur = (x) => { cagri++; return undefined; };     // anlik: is acmasin
  const once = enerji.enerjiOku("eb1");
  tetikle(o, "tek_simsek");
  const sonra = enerji.enerjiOku("eb1");
  kontrol("tetikleme hafif bedeli dustu", cagri === 1 && Math.abs(once - sonra - ayar.ENERJI_GRUP_BEDEL.hafif) < 1e-9,
          once.toFixed(1) + " -> " + sonra.toFixed(1) + ", " + cagri + " cagri");
  /* Enerjiyi bedelin altina indir: yetenek calismamali. */
  enerji.enerjiIste(o, sonra - 3, "test");
  const dip = enerji.enerjiOku("eb1");
  cagri = 0; o._yazi.length = 0;
  sus(); sohbetTetikle(o, "yetenek tek_simsek"); tickIlerlet(ayar.KOL_GECIKME + 2); ac();
  kontrol("yetmeyince yetenek CALISMADI", cagri === 0, cagri + " cagri");
  kontrol("  enerji dusmedi", enerji.enerjiOku("eb1") >= dip, dip.toFixed(1) + " -> " + enerji.enerjiOku("eb1").toFixed(1));
  kontrol("  sebebi yazildi", o._yazi.some((y) => y.indexOf("Enerji yetmiyor") >= 0), o._yazi.slice(-1)[0] || "yazi yok");
  t.olustur = gercek;
  enerji.enerjiUnut("eb1");
}

console.log("\n=== 5. AC-KAPA: ACMAK BEDELLI, KAPATMAK BEDAVA ===");
{
  const o = kur("eb2");
  tetikle(o, "toprak_izi");
  const acik = enerji.enerjiOku("eb2");
  kontrol("acmak hafif bedel", Math.abs(100 - acik - ayar.ENERJI_GRUP_BEDEL.hafif) < 1e-9, acik.toFixed(1));
  tetikle(o, "toprak_izi");
  tickIlerlet(2);
  kontrol("kapatmak bedava", enerji.enerjiOku("eb2") >= acik - 1e-9, enerji.enerjiOku("eb2").toFixed(1));
  enerji.enerjiUnut("eb2");
}

console.log("\n=== 6. KAYITTAKI enerji: N TABLOYU EZIYOR ===");
{
  kayit.yetenekKaydet({ kimlik: "meteor_test_ozel", ad: "Test", esyasiz: true, sira: 99998,
                        enerji: 7, olustur() { return undefined; } });
  kontrol("kayittaki 7, tablonun 'meteor*' olmayan eslesmesini eziyor", bedel("meteor_test_ozel") === 7,
          String(bedel("meteor_test_ozel")));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> enerji bedelleri bagli: tablo eksiksiz, kapi calisiyor");
process.exit(hata ? 1 : 0);
