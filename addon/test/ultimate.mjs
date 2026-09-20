// ULTIMATE FORM (v7.95) -- dort formun birlesimi.
//
// Bu testin asil isi SAYIYI DEGIL, TURETMEYI korumak. Ultimate'in
// efektleri ayarlar.js'te yazili DEGIL; dort kaynak formdan
// hesaplaniyor. Birisi ileride "kolaylik olsun" diye efektleri
// elle yazarsa iki liste ayrisir -- 5. bolum bunu yakalar.
import { readFileSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const ult = await import("./pack/yetenekler/ultimate_form.js");
const kollar = await import("./pack/yetenekler/kollar.js");
const yetenek = (k) => kayit.tumYetenekler().find((y) => y.kimlik === k);

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== 1. YETENEK KAYITLI VE TOPRAK KOL'DA ===");
{
  const y = yetenek("ultimate_form");
  kontrol("yetenek kayitli", !!y);
  kontrol("adi gorunur", !!y && y.ad.includes("ULTIMATE"), y && y.ad);
  const satir = kollar.KOL_ESYALARI.find((s) => s[0] === "pa:kol_toprak");
  kontrol("Toprak Kol satiri var", !!satir);
  kontrol("Toprak Kol menusunde", !!satir && satir.includes("ultimate_form"));
  // Baska bir kola SIZMAMALI -- sekme Toprak Kol'a acildi.
  const digerler = kollar.KOL_ESYALARI
    .filter((s) => s[0] !== "pa:kol_toprak" && s.includes("ultimate_form"));
  kontrol("baska kola sizmamis", digerler.length === 0,
          digerler.map((s) => s[0]).join(",") || "temiz");
}

console.log("");
console.log("=== 2. DORT KAYNAK COZULUYOR ===");
{
  kontrol("dort kaynak tanimli", ayar.ULTIMATE_KAYNAKLAR.length === 4,
          String(ayar.ULTIMATE_KAYNAKLAR.length));
  const adlar = ult.kaynakAdlari();
  kontrol("dordunun de adi cozuldu",
          adlar.length === 4 && adlar.every((a) => a && !a.includes("_")),
          adlar.join(" + "));
  // Kullanicinin sarti: Ben 10'dan da olsun.
  const tablolar = ayar.ULTIMATE_KAYNAKLAR.map(([t]) => t);
  kontrol("Ben 10 temsil ediliyor", tablolar.includes("ben10"));
  kontrol("en az iki ayri tablodan", new Set(tablolar).size >= 2,
          [...new Set(tablolar)].join(","));
}

console.log("");
console.log("=== 3. EFEKTLER BIRLESIYOR: EN YUKSEK ALINIYOR ===");
{
  const e = new Map(ult.birlesikEfektler());
  kontrol("efekt uretildi", e.size > 0, e.size + " efekt");

  // Her efekt icin kaynaklardaki EN YUKSEK seviye alinmali.
  const kaynak = (t, a) => {
    if (t === "zirh") return ayar.ZIRH_MODLAR.get(a);
    if (t === "marvel") return ayar.MARVEL_GUCLER.get(a);
    for (const [, x] of ayar.BEN10) if (x.taban === a) return x;
    return undefined;
  };
  const beklenen = new Map();
  for (const [t, a] of ayar.ULTIMATE_KAYNAKLAR) {
    const f = kaynak(t, a);
    for (const [ad, , sv] of (f.efektler || [])) {
      const s = sv || 0;
      if (!beklenen.has(ad) || beklenen.get(ad) < s) beklenen.set(ad, s);
    }
  }
  let sapan = [];
  for (const [ad, s] of beklenen) if (e.get(ad) !== s) sapan.push(ad);
  kontrol("her efekt kaynaklarin EN YUKSEGI", sapan.length === 0,
          sapan.join(",") || "hepsi dogru");
  kontrol("fazladan efekt uydurulmamis", e.size === beklenen.size,
          e.size + " vs " + beklenen.size);

  // TOPLAMA degil MAKSIMUM: Minecraft ayni efekti iki kez vermiyor.
  const titanGuc = (ayar.ZIRH_MODLAR.get("titan").efektler
    .find(([a]) => a === "strength") || [])[2];
  kontrol("guc = Titan'in gucu (toplanmamis)", e.get("strength") === titanGuc,
          "birlesik=" + e.get("strength") + " titan=" + titanGuc);
}

console.log("");
console.log("=== 4. ISIN KAPISI: SADECE O ISIN ACILIYOR ===");
{
  const kaynak = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/isinlar.js", "utf8");
  kontrol("kapi Ultimate'i soruyor", kaynak.includes("ultimateAcikMi"));
  kontrol("yalniz ULTIMATE_ISIN acilıyor",
          kaynak.includes("ZIRH_ISIN.get(ULTIMATE_ISIN)"));
  kontrol("ULTIMATE_ISIN gercek bir isin",
          ayar.ZIRH_ISIN.has(ayar.ULTIMATE_ISIN), ayar.ULTIMATE_ISIN);
  // Kapi kapaliyken acik DEMEMELI.
  kontrol("kapali oyuncuda acik demiyor",
          ult.ultimateAcikMi("hic_boyle_bir_oyuncu_yok") === false);
}

console.log("");
console.log("=== 5. EFEKTLER ELLE YAZILMAMIS (turetme korunuyor) ===");
{
  const a = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/ayarlar.js", "utf8");
  const blok = a.slice(a.indexOf("export const ULTIMATE_ACIK"));
  const kesit = blok.slice(0, blok.indexOf("ULTIMATE_PARCACIK"));
  // ayarlar.js'te Ultimate'in KENDI efekt listesi OLMAMALI.
  kontrol("ayarlar.js'te elle efekt listesi yok",
          !/ULTIMATE_EFEKTLER\s*=/.test(kesit) &&
          !/"strength"/.test(kesit) && !/"resistance"/.test(kesit));
  const u = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/ultimate_form.js", "utf8");
  kontrol("yetenek kaynaklardan turetiyor",
          u.includes("ULTIMATE_KAYNAKLAR") && u.includes("birlesikEfektler"));
}

console.log("");
console.log("=== 6. SURE/BEKLEME TUTARLI ===");
{
  kontrol("efekt suresi tazelemenin kati",
          ayar.ULTIMATE_EFEKT_SURE % ayar.ULTIMATE_TAZELEME === 0,
          ayar.ULTIMATE_EFEKT_SURE + " / " + ayar.ULTIMATE_TAZELEME);
  kontrol("efekt suresi tazelemeden UZUN (bosluk olmasin)",
          ayar.ULTIMATE_EFEKT_SURE > ayar.ULTIMATE_TAZELEME);
  kontrol("bekleme sureden uzun", ayar.ULTIMATE_BEKLEME > ayar.ULTIMATE_SURE,
          ayar.ULTIMATE_BEKLEME + " > " + ayar.ULTIMATE_SURE);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Ultimate: her sey yerinde");
process.exit(hata ? 1 : 0);
