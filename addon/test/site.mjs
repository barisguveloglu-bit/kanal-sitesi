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
console.log("=== 9. SITE_ADRESI GERCEKTEN TEK KAYNAK MI ===");
{
  /* data.js'teki SITE_ADRESI'ni tarayici okumuyor: canonical,
     og:url, og:image ve sitemap.xml JavaScript'ten uretilemez
     (arama motoru ve paylasim botu betigi calistirmaz), o
     yuzden adres HTML'e ELLE yazili. Sabit o kopyalarin BEYAN
     EDILDIGI yer; burasi kopyalarin beyandan ayrismadigini
     olcuyor.

     v7.9.3'te sabit HIC okunmuyordu -- ne kod, ne test. Alan
     adi degisse 37 satiri elle bulmak gerekirdi ve biri
     unutulsa hicbir sey soylemezdi: yanlis canonical, arama
     motoruna yanlis sayfa demektir.

     ---- ILK YAZILISTA BU SINAMA KENDI KOR NOKTASINI TASIYORDU ----
     Once "SITE_ADRESI'ndeki ALAN ADINI iceren her baglanti"
     sekilinde yazilmisti. Mutasyon denendi: bir canonical
     `barisguveloglu-bit.github.io` yerine
     `barisguveloglu.github.io` yapildi -- test YESIL YANDI.
     Cunku bozuk adres artik alan adi suzgecinden gecmiyordu;
     yani sinama tam da yakalamasi gereken hatayi goremiyordu.
     NOTLAR.md'deki tuzagin aynisi: beklentiyi olctugun seyden
     turetme.

     Simdiki bicim suzgec kullanmiyor. Olculen etiketler
     TANIMI GEREGI sitenin kendisini gosteriyor (canonical,
     og:url, og:image, twitter:image, sitemap <loc>), yani
     hepsi istisnasiz SITE_ADRESI ile baslamak zorunda.       */
  const veri = oku("assets/js/data.js");
  const m = veri.match(/const SITE_ADRESI = "([^"]+)"/);
  kontrol("data.js SITE_ADRESI tanimliyor", !!m, m ? m[1] : "yok");
  if (m) {
    const adres = m[1];
    kontrol("  adres / ile bitiyor (birlestirirken cift egik cizgi olmasin)",
            adres.endsWith("/"), adres);

    const kendini = [];           /* [dosya, adres] */
    for (const h of sayfalar) {
      const s = oku(h);
      for (const x of s.matchAll(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/g))
        kendini.push([h + " canonical", x[1]]);
      for (const x of s.matchAll(/<meta[^>]+(?:property|name)="(og:url|og:image|twitter:image)"[^>]+content="([^"]+)"/g))
        kendini.push([h + " " + x[1], x[2]]);
    }
    for (const x of oku("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g))
      kendini.push(["sitemap.xml loc", x[1]]);
    for (const x of oku("robots.txt").matchAll(/Sitemap:\s*(\S+)/g))
      kendini.push(["robots.txt Sitemap", x[1]]);

    const sapan = kendini.filter(([, u]) => !u.startsWith(adres));
    kontrol("  siteyi gosteren " + kendini.length +
            " etiketin hepsi SITE_ADRESI ile basliyor",
            sapan.length === 0,
            sapan.slice(0, 5).map(([f, u]) => f + " -> " + u).join(" | "));

    /* Sayi sifir/az olursa yukarisi bos yere yesil yanar.
       404 ve gizli disindaki 7 sayfanin her birinde 4 etiket,
       sitemap'te 7 loc, robots'ta 1 = 36.                    */
    kontrol("  ve gercekten olculecek bir sey var", kendini.length >= 30,
            kendini.length + " etiket");

    /* Her ACIK sayfanin canonical'i KENDINI gostermeli:
       hepsi ana sayfayi gosterseydi ustteki sinama yine yesil
       yanardi ama arama motoru butun sayfalari ayni sayfa
       sanardi.                                               */
    const yanlisCanonical = [];
    for (const h of sayfalar) {
      if (h === "404.html" || h === "gizli.html") continue;
      const x = oku(h).match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
      if (!x) { yanlisCanonical.push(h + " -> canonical YOK"); continue; }
      const beklenen = adres + (h === "index.html" ? "" : h);
      if (x[1] !== beklenen) yanlisCanonical.push(h + " -> " + x[1]);
    }
    kontrol("  her sayfanin canonical'i KENDI adresi",
            yanlisCanonical.length === 0, yanlisCanonical.join(" | "));
  }
}

console.log("=== 10. OLU CSS GERI SIZMASIN ===");
{
  /* Kaldirilan soru-cevap ozelliginin bicimlendirmesi (giris
     kutusu, soru formu, yonetim paneli, yasakli listesi) 126
     satir olarak style.css'te kalmisti. Ozellik CLAUDE.md'de
     "form yok, giris yok, sunucu yok" diye yaziliyken sitede
     onun iskeleti duruyordu.

     Burada tek tek o sinif adlarini aramak yerine SINIFIN
     TAMAMI olculuyor: CSS'te tanimli her sinif HTML veya JS'te
     gercekten geciyor mu.                                    */
  const cssler = ["assets/css/style.css", "assets/css/animasyon.css"];
  const kullanilan = new Set();

  /* class="..." degerini ${...} icindeki tirnaklara TAKILMADAN
     okuyor. Duz regex bunu yapamiyor: app.js'te

         class="komutan ${k.ad ? "" : "bos"}"

     yaziyor ve /class="([^"]*)"/ ilk ic tirnakta duruyor --
     yani "bos" sinifini hic gormuyor, olu saniyor. Ilk yazilista
     tam olarak bu oldu: uc yasayan sinif (.bos, .olur, .olmaz)
     olu diye raporlandi.                                      */
  const sinifAttr = (s) => {
    const cikti = [];
    let i = 0;
    while ((i = s.indexOf('class="', i)) !== -1) {
      i += 7;
      let derinlik = 0, parca = "";
      for (; i < s.length; i++) {
        const c = s[i];
        if (c === "$" && s[i + 1] === "{") { derinlik++; i++; parca += " "; continue; }
        if (derinlik > 0) {
          if (c === "{") derinlik++;
          else if (c === "}") derinlik--;
          else parca += c;           /* ic ifadedeki tirnaklar da gelsin */
          continue;
        }
        if (c === '"') break;        /* attribute burada bitti */
        parca += c;
      }
      cikti.push(parca);
    }
    return cikti;
  };

  const topla = (s) => {
    for (const p of sinifAttr(s))
      p.split(/[\s'"`?:+()]+/).forEach((c) => c && kullanilan.add(c));
    /* el.className = "kilit-durum " + (x ? "olur" : "olmaz");
       Ifadenin TAMAMINDAKI tirnakli parcalar aliniyor, yoksa
       ternary'nin iki dali da olu gorunur (gizli.js boyle).  */
    for (const m of s.matchAll(/\.className\s*=\s*([^;\n]+)/g))
      for (const q of m[1].matchAll(/["'`]([^"'`]*)["'`]/g))
        q[1].split(/\s+/).forEach((c) => c && kullanilan.add(c));
    for (const m of s.matchAll(/classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g))
      for (const q of m[1].matchAll(/["'`]([\w-]+)["'`]/g)) kullanilan.add(q[1]);
    for (const m of s.matchAll(/querySelector(?:All)?\(\s*["'`]([^"'`]+)["'`]/g))
      for (const q of m[1].matchAll(/\.([\w-]+)/g)) kullanilan.add(q[1]);
    /* kapakHtml(v, "one-cikan-kapak", ...) gibi: sinif adi
       cagriya degisken olarak giriyor, class=" icinde degil.  */
    for (const m of s.matchAll(/["']([a-z][a-z0-9]*(?:-[a-z0-9]+)+)["']/g)) kullanilan.add(m[1]);
  };
  for (const h of sayfalar) topla(oku(h));
  for (const j of readdirSync(KOK + "/assets/js").filter((f) => f.endsWith(".js")))
    topla(oku("assets/js/" + j));

  const olu = [];
  for (const f of cssler) {
    const kod = oku(f).replace(/\/\*[\s\S]*?\*\//g, "");
    const gorulen = new Set();
    for (const m of kod.matchAll(/([^{}]+)\{/g)) {
      if (/^\s*@/.test(m[1])) continue;
      for (const c of m[1].matchAll(/\.([a-zA-Z_][\w-]*)/g)) gorulen.add(c[1]);
    }
    for (const c of gorulen) if (!kullanilan.has(c)) olu.push(f.split("/").pop() + " -> ." + c);
  }
  kontrol("CSS'te tanimli her sinif HTML/JS'te geciyor", olu.length === 0,
          olu.join(", ") || "olu sinif yok");
}

console.log("");
console.log("=== 11. MAFYA_TEPE ID'LERI BIR KARAKTERE DENK GELIYOR ===");
{
  /* MAFYA_TEPE'deki iki kisinin id'si uzun sure HIC OKUNMUYORDU.
     Artik mafya.html'deki kutu ondan karakterler.html#<id>
     baglantisini uretiyor -- yani yanlis yazilmis bir id artik
     KIRIK BAGLANTI demek, sessiz bir fazlalik degil.          */
  const veri = oku("assets/js/data.js");
  const kes = (bas, son) => veri.slice(veri.indexOf(bas), veri.indexOf(son));
  const karakterId = new Set(
    [...kes("const KARAKTERLER = [", "const ICRAATLER = [")
        .matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]));
  const tepeId = [...kes("const MAFYA_TEPE = [", "const KOMUTANLAR = [")
        .matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
  kontrol("MAFYA_TEPE'de id var", tepeId.length > 0, tepeId.join(", "));
  const kayip = tepeId.filter((i) => !karakterId.has(i));
  kontrol("  hepsinin KARAKTERLER'de karsiligi var", kayip.length === 0, kayip.join(", "));
  kontrol("  app.js bu id'yi gercekten baglantiya ceviriyor",
          oku("assets/js/app.js").includes('karakterler.html#${kacir(o.id)}'));
}

console.log("");
console.log(hata ? "BAZI SINAMALAR KALDI" : "hepsi gecti");
process.exit(hata ? 1 : 0);
