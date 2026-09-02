/* SITE DENETIMI                                          v7.9.3

   ---- NEDEN VAR ----
   Bu depoda addon'un 84 test dosyasi var ama SITENIN hicbir
   testi yoktu. v7.9.3 genel taramasinda site elle denetlendi ve
   uc sey cikti; ucu de duzeltildi. Bu dosya onlarin geri
   gelmemesi icin.

   ---- DENETIM BETIGIMIN KENDISI YEDI KEZ YANILDI ----
   Elle denetlerken bulduğum 7 "sorunun" 7'si de kendi
   olcumumun hatasiydi: SVG'deki `stop-opacity`'yi gizleme
   sandim, `[hidden]` kuralini yorum satirinda aradim,
   `:focus:not(:focus-visible) { outline:none }`'i ihlal
   sandim, `data-metin`i sadece app.js'te aradim (CSS'te
   `content: attr(data-metin)` ile kullaniliyor).

   O yuzden buradaki her sinama DAR ve KESIN: neyin ihlal
   sayilmadigi da yaziliyor.                                  */

import { readFileSync, readdirSync, existsSync } from "node:fs";
const KOK = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (p) => readFileSync(KOK + "/" + p, "utf8");
const sayfalar = readdirSync(KOK).filter((f) => f.endsWith(".html"));

console.log("=== 1. MENU HER SAYFADA VE HER YERDE AYNI ===");
{
  /* CLAUDE.md kurali: menu app.js uretmiyor, her HTML'de ELLE
     yazili -- JavaScript yuklenmezse navigasyon kaybolmasin.
     Yani yeni sayfa eklenince BUTUN dosyalar guncellenmeli ve
     bu sinama onu yakalar.                                   */
  /* YORUMLAR VE <style> AYIKLANIYOR.
     Bu sinamayi ilk yazdigimda 404.html "2 farkli menu" verdi.
     Sebep kod degildi: 404'un CSS yorumuna aciklama olsun diye
     `<nav class="menu">` yazmistim ve regex ORAYA takilmisti --
     yani kendi yorumumu kod sandim. Ayni tuzaga bu oturumda
     will.mjs, anna.mjs ve kol_takas.mjs'te de dusuldu. Duz metin
     aramasi yorumla kodu ayirt etmez; ayikla, sonra ara.      */
  const govde = (s) => s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "");
  const menuler = new Map();
  for (const h of sayfalar) {
    const s = govde(oku(h));
    const m = s.match(/<nav[^>]*class="menu"[^>]*>([\s\S]*?)<\/nav>/);
    if (!m) { menuler.set(h, null); continue; }
    /* Yollari karsilastirirken kok onekini atiyoruz: 404.html
       KOK-MUTLAK yol kullanmak ZORUNDA (asagida sebebi),
       digerleri goreli. Onemli olan HANGI sayfalar oldugu.  */
    const hedefler = [...m[1].matchAll(/href="([^"]+)"/g)]
      .map((x) => x[1].replace(/^\/kanal-sitesi\//, "").replace(/^$/, "index.html"))
      .map((x) => (x === "" ? "index.html" : x));
    menuler.set(h, [...new Set(hedefler)].sort().join(","));
  }
  const menusuz = [...menuler].filter(([, v]) => v === null).map(([k]) => k);
  kontrol(sayfalar.length + " sayfanin hepsinde menu var", menusuz.length === 0,
          menusuz.join(", ") || "");
  const kumeler = new Set([...menuler.values()].filter(Boolean));
  kontrol("butun menuler AYNI sayfalari gosteriyor", kumeler.size === 1,
          kumeler.size === 1 ? [...kumeler][0].split(",").length + " baglanti"
                             : kumeler.size + " farkli menu");
}

console.log("");
console.log("=== 2. 404 SAYFASI: HER ADRESTEN KACIS VAR MI ===");
{
  /* 404 sitede olmayan HERHANGI bir adreste aciliyor. Bagalantilar
     GORELI olsaydi, /kanal-sitesi/eski/yok.html adresinde acilan
     404'teki "index.html" o klasorde aranir ve o da 404 verirdi --
     yani kacis yolu olmazdi. v7.9.3'te tam bu durumdaydi.      */
  const s = oku("404.html");
  const goreli = [...s.matchAll(/(?:href|src)="(?!\/|https?:|#|data:)([^"]+)"/g)]
    .map((m) => m[1]);
  kontrol("404'te GORELI yol kalmadi", goreli.length === 0,
          goreli.join(", ") || "hepsi kok-mutlak");
  const hedefler = [...s.matchAll(/href="\/kanal-sitesi\/([^"]*)"/g)].map((m) => m[1]);
  kontrol("  hedeflerin hepsi gercekten var",
          hedefler.every((h) => h === "" || existsSync(KOK + "/" + h)),
          hedefler.filter((h) => h !== "" && !existsSync(KOK + "/" + h)).join(", ") || "");
  /* 404 kendi stilini ICINDE tasiyor, ayni sebeple: dis stilin
     yolu o adreste tutmayabilir.                              */
  kontrol("  stil hala dosyanin ICINDE (dis stile bagli degil)",
          s.includes("<style>") && !/<link[^>]+stylesheet/.test(s));
}

console.log("");
console.log("=== 3. GIZLEME: hidden, opacity DEGIL ===");
{
  /* Hareket azaltma acikken style.css butun gecisleri
     kapatiyor; opacity ile gizlenen bir sey bir daha ASLA
     gorunmez. [hidden] kurali bu yuzden var.

     SVG'deki stop-opacity/opacity BUNA GIRMIYOR -- onlar goz
     ciziyor, bir sey gizlemiyor. Ilk denetimde bunu ihlal
     sanmistim.                                               */
  const css = oku("assets/css/style.css");
  kontrol("[hidden] { display:none !important } duruyor",
          /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css));
  const js = readdirSync(KOK + "/assets/js")
    .filter((f) => f.endsWith(".js"))
    .map((f) => [f, readFileSync(KOK + "/assets/js/" + f, "utf8")]);
  const kotu = [];
  for (const [ad, s] of js) {
    /* Yalniz DOM ustunde gizleme: element.style.opacity = 0 */
    if (/\.style\.opacity\s*=\s*["']?0["']?/.test(s)) kotu.push(ad);
  }
  kontrol("JS'te .style.opacity ile gizleme yok", kotu.length === 0, kotu.join(", "));
}

console.log("");
console.log("=== 4. ODAK HALKASI SILINMEMIS ===");
{
  const css = oku("assets/css/style.css");
  kontrol(":focus-visible tasarimi duruyor", css.includes(":focus-visible"));
  /* `:focus:not(:focus-visible) { outline: none }` IHLAL DEGIL:
     fareyle tiklayinca halka cikmasin, klavyede ciksin demek --
     yani kuralin ISTEDIGI sey. Yasak olan, halkayi TAMAMEN
     oldurmek.                                                */
  /* CSS yorumlari da ayiklaniyor: ayiklanmasa hem mesajda
     secici yerine yorum gorunuyor, hem de asagidaki
     ":focus:not(:focus-visible)" filtresi bir YORUMDA gecen
     ayni metne takilip gercek bir ihlali affedebilirdi.     */
  const cssKod = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const oldurenler = [...cssKod.matchAll(/([^{}]+)\{[^}]*outline:\s*none/g)]
    .map((m) => m[1].trim())
    .filter((sec) => !sec.includes(":focus:not(:focus-visible)"));
  kontrol("odak halkasini OLDUREN kural yok", oldurenler.length === 0,
          oldurenler.join(" | ") || "yalniz fare istisnasi var");
}

console.log("");
console.log("=== 5. BETIKLER defer VE SIRA KORUNMUS ===");
{
  const bozuk = [], sira = [];
  for (const h of sayfalar) {
    const s = oku(h);
    const betikler = [...s.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
    for (const b of betikler) {
      if (b.includes("src=") && !b.includes("defer")) bozuk.push(h);
    }
    const kaynak = betikler.filter((b) => b.includes("src="))
      .map((b) => b.match(/src="([^"]+)"/)[1]);
    const v = kaynak.findIndex((k) => k.includes("data.js"));
    const u = kaynak.findIndex((k) => k.includes("app.js"));
    if (v >= 0 && u >= 0 && v > u) sira.push(h);
  }
  kontrol("her <script src> defer'li", bozuk.length === 0, [...new Set(bozuk)].join(", "));
  kontrol("data.js her zaman app.js'ten ONCE", sira.length === 0, sira.join(", "));
}

console.log("");
console.log("=== 6. VERI TOPLAMA YOK (tek istisna: spoiler tercihi) ===");
{
  /* CLAUDE.md: form yok, giris yok, cerez yok, sunucu yok.
     TEK ISTISNA app.js'in spoiler kapagi tercihi: ziyaretcinin
     KENDI tarayicisinda kalan bir tercih, toplanan bir bilgi
     degil. Sinir bu ve CLAUDE.md'de yazili.                  */
  const ihlal = [];
  for (const h of sayfalar) {
    const s = oku(h);
    for (const k of ["<form", "<input", "document.cookie"]) {
      if (s.includes(k)) ihlal.push(h + ": " + k);
    }
  }
  const uygulama = oku("assets/js/app.js");
  for (const k of ["document.cookie", "fetch(", "XMLHttpRequest", "navigator.sendBeacon"]) {
    if (uygulama.includes(k)) ihlal.push("app.js: " + k);
  }
  kontrol("form / giris / cerez / dis istek YOK", ihlal.length === 0, ihlal.join(" · "));
  kontrol("spoiler tercihi try/catch icinde (gizli sekme patlamasin)",
          /try\s*\{\s*return localStorage\.getItem/.test(uygulama) &&
          /try\s*\{\s*localStorage\.setItem/.test(uygulama));
  const rehber = oku("CLAUDE.md");
  kontrol("  ve bu istisna CLAUDE.md'de yazili",
          rehber.includes("localStorage") && rehber.includes("Tek istisna"));
}

console.log("");
console.log("=== 7. SITEMAP VE IC BAGLANTILAR ===");
{
  const sm = oku("sitemap.xml");
  /* gizli.html ve 404.html BILEREK disarida: biri gizli sayfa,
     oteki hata sayfasi (robots: noindex).                     */
  const beklenen = sayfalar.filter((h) => !["gizli.html", "404.html"].includes(h));
  const eksik = beklenen.filter((h) => !sm.includes(h) && h !== "index.html");
  kontrol("sitemap butun ACIK sayfalari sayiyor", eksik.length === 0, eksik.join(", "));
  kontrol("  index kok adres olarak var (/ ile bitiyor)",
          /<loc>[^<]*kanal-sitesi\/<\/loc>/.test(sm));
  kontrol("  gizli.html sitemap'te DEGIL (bilerek)", !sm.includes("gizli.html"));
  const kirik = [];
  for (const h of sayfalar) {
    for (const m of oku(h).matchAll(/href="(?:\/kanal-sitesi\/)?([^"#:]*\.html)[^"]*"/g)) {
      if (!existsSync(KOK + "/" + m[1])) kirik.push(h + " -> " + m[1]);
    }
  }
  kontrol("kirik ic baglanti yok", kirik.length === 0, kirik.slice(0, 5).join(", "));
}

console.log("");
console.log("=== 8. LORE.md <-> data.js SENKRON ===");
{
  /* CLAUDE.md: "Icerik degisince LORE.md ile data.js senkron
     kalmali." Bu bolum onu olcuyor.                          */
  const lore = oku("LORE.md");
  const veri = oku("assets/js/data.js");

  const kademeBlok = veri.slice(veri.indexOf("IRADE_KADEMELERI"),
                                veri.indexOf("Mafya hiyerarşisi"));
  const kademeler = [...kademeBlok.matchAll(/ad:\s*"([^"]+)"/g)].map((m) => m[1]);
  kontrol("5 irade kademesi tanimli", kademeler.length === 5, kademeler.join(" · "));
  const kayip = kademeler.filter((a) => !lore.includes(a));
  kontrol("  hepsi LORE.md'de de geciyor", kayip.length === 0, kayip.join(", "));

  const komutanlar = ["Nemesis", "Teşup", "Ahriman"];
  kontrol("uc komutan iki tarafta da var",
          komutanlar.every((a) => lore.includes(a) && veri.includes(a)),
          komutanlar.filter((a) => !(lore.includes(a) && veri.includes(a))).join(", ") || "");

  const ilBlok = veri.slice(veri.indexOf("const IL_DEREBEYLERI = ["));
  const iller = [...ilBlok.slice(0, ilBlok.indexOf("\n];")).matchAll(/ad:\s*"([^"]+)"/g)];
  kontrol("81 il derebeyinin 81'i de adlandirilmis", iller.length === 81,
          iller.length + " kayit");
}

console.log("");
console.log(hata ? "BAZI SINAMALAR KALDI" : "hepsi gecti");
process.exit(hata ? 1 : 0);
