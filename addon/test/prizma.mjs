/* v7.77 -- PRIZMOKSIN: YEDI BANT, GOZ VE LAZER

   Kullanici: "bana ozel bir iksir yapabilir misin, rengarenk
   olsun, ismini de sen belirle, su ana kadar yapabildigin en
   guclu iksiri olsun, lazeri de gokkusaginin ORIJINAL
   renklerinden olussun, goz de ayni sekilde, bunu arastir."

   Gucun kendisi iksir.mjs'te olculuyor (Prizmoksin temel
   sekizin her efektinde en az onlar kadar, yedisinde tek basina
   onde). Bu dosya GORUNUSU tutuyor -- ve gorunus bu istekte
   isin yarisi.

   ---- NEDEN AYRI DOSYA ----
   doku.mjs sekiz gozun renklerini kaynagindan olcuyor ve o
   gozlerin hepsi TEK renkli. Dokuzuncusu bant dizisi tasiyor,
   yani oradaki "cekirdek su renkte" olcusu ona uymuyor.
   Ayri bir dosya, oradaki olcunun bozulmadan kalmasini
   sagliyor.

   ---- SINANAN DORT SEY ----
   1. Palet kaynagindan geldigi gibi duruyor (yedi ROYGBIV).
   2. Goz dokusunda yedi bandin yedisi de HAM haliyle var --
      yani kimlik bandi beyaza cekilmemis.
   3. Isin yedi parcali ve her parca kendi bandinda; civit ile
      mor AYRI renkler (v4.76'daki iki kirmizi tuzagi).
   4. Bant geometrisi yalniz bu goze bagli; oteki sekiz goz
      eski geometride kaldi.                                  */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP = KOK + "/Simsek_Kol_Kaynak";
const BP = KOK + "/Simsek_TNT_ToprakTopu";

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));
const URETEC = readFileSync(KOK + "/kol_uret.py", "utf8");
const ayar = await import("./pack/ayarlar.js");

/* Ureteci tek bir yerden konusturuyoruz: palet, olcek ve UV
   ikinci kez BURAYA yazilsaydi bir gun ayrisirlardi ve test
   gercegi degil kendi kopyasini olcerdi.                    */
const py = (kod) => JSON.parse(execFileSync("python3", ["-c", `
import sys, json
sys.path.insert(0, ${JSON.stringify(KOK)})
import kol_uret as k
${kod}
`], { encoding: "utf8" }));

const veri = py(`
from PIL import Image
goz = Image.open(k.RP + "/textures/entity/goz_prizma.png").convert("RGBA")
lz  = Image.open(k.RP + "/textures/entity/goz_prizma_lazer.png").convert("RGBA")
gp, lp = goz.load(), lz.load()
opak = set()
for y in range(goz.size[1]):
    for x in range(goz.size[0]):
        p = gp[x, y]
        if p[3] == 255:
            opak.add(p[:3])
bx, by = k.GOKKUSAGI_ISIN_UV
yamalar = [[list(lp[(bx + (i * len(k.GOKKUSAGI) + j) * 2) * k.GOZ_OLCEK + 1,
                    by * k.GOZ_OLCEK + 1])[:3]
            for j in range(len(k.GOKKUSAGI))] for i in range(2)]
print(json.dumps({
  "palet": [list(c) for c in k.GOKKUSAGI],
  "taban": list(k.GOKKUSAGI_TABAN),
  "menzil": k.LAZER_ISIN_MENZIL,
  "opak": [list(c) for c in sorted(opak)],
  "yamalar": yamalar,
  "ikon": [list(c[:3]) for c in k.goz_ikonu((k.GOKKUSAGI, k.GOKKUSAGI)).values()],
  "sise": [list(c[:3]) for c in k.iksir_ikonu(k.GOKKUSAGI).values()],
}))
`);

console.log("=== 1. PALET KAYNAGINDAN GELDIGI GIBI ===");
{
  /* Degerler arastirilarak alindi (webnots / itechguides) ve
     kol_uret.py'de kaynak baglantilariyla yaziyor. Burada
     tekrar yazilmalarinin sebebi: birinin "daha guzel olur"
     diye bir tonu degistirmesi SESSIZ bir degisiklik olmasin.
     Mor icin iki deger dolasiyor (#8B00FF / #9400D3); secim ve
     gerekcesi uretecte yazili, burasi secimi kilitliyor.    */
  const ROYGBIV = [[255, 0, 0], [255, 127, 0], [255, 255, 0],
                   [0, 255, 0], [0, 0, 255], [75, 0, 130], [139, 0, 255]];
  kontrol("yedi bant", veri.palet.length === 7, veri.palet.length + " renk");
  kontrol("renkler ROYGBIV ile birebir",
          JSON.stringify(veri.palet) === JSON.stringify(ROYGBIV),
          JSON.stringify(veri.palet));
  /* 178 = 255 x 0,70. Cizicinin soguk tonu da 0,30 siyaha
     gidiyor; ikisi ayni sayi oldugu icin bant rengi BIREBIR
     geri kurulabiliyor (gerekcesi uretecte).                */
  kontrol("notr taban 178 (geri kurma bunun uzerine kurulu)",
          veri.taban[0] === 178 && veri.taban[1] === 178 && veri.taban[2] === 178,
          veri.taban.join(","));
  kontrol("kaynak baglantilari uretecte duruyor",
          /webnots\.com\/vibgyor-rainbow-color-codes/.test(URETEC) &&
          /sciencenotes\.org\/visible-light-spectrum/.test(URETEC));
}

console.log("");
console.log("=== 2. GOZ DOKUSUNDA YEDI BANT HAM HALIYLE ===");
{
  /* Cekirdegin kimlik bandi DOKUNULMAZ -- v7.13'te konan kural.
     Ilk denemede taban beyazdi ve gozun tamami %45 beyaza
     cekiliyordu: kirmizi bant pembe okunuyordu. Bu madde tam
     olarak o gerilemeyi yakaliyor.                          */
  const opak = new Set(veri.opak.map((c) => c.join(",")));
  const eksik = veri.palet.filter((c) => !opak.has(c.join(",")));
  kontrol("yedi bandin yedisi de dokuda HAM haliyle var",
          eksik.length === 0,
          eksik.map((c) => c.join(",")).join(" | ") || "yedisi de yerinde");

  /* ---- SICAK MERKEZ DURUYOR MU (davranis olcusu) ----
     Yukaridaki madde tek basina yetmiyor: taban BEYAZ olsaydi
     kimlik bandi yine ham cikardi ama gozun sicak merkezi
     kaybolurdu (beyazda hem cekirdek hem merkez 255'e dayanir,
     ikisi ayirt edilemez). Olcu mavi bant uzerinden: bandin
     BEYAZA cekilmis bir tonu varsa merkez yaniyor demektir --
     (0,0,255) beyaza giderken r ile g birlikte buyur, b 255'te
     kalir.                                                   */
  const sicak = veri.opak.some((c) => c[2] === 255 && c[0] === c[1] && c[0] > 0);
  const soguk = veri.opak.some((c) => c[0] === 0 && c[1] === 0 &&
                                      c[2] > 0 && c[2] < 255);
  kontrol("mavi bandin sicak (beyaza cekilmis) tonu var", sicak);
  kontrol("mavi bandin soguk (koyulasmis) tonu var", soguk);
}

console.log("");
console.log("=== 3. ISIN YEDI PARCALI VE BANTLAR AYRI ===");
{
  kontrol("iki goz icin de yedi yama",
          veri.yamalar.length === 2 &&
          veri.yamalar.every((g) => g.length === 7));
  for (let i = 0; i < veri.yamalar.length; i++) {
    kontrol("  goz " + i + " yamalari palete esit",
            JSON.stringify(veri.yamalar[i]) === JSON.stringify(veri.palet),
            JSON.stringify(veri.yamalar[i]));
  }
  /* ---- CIVIT ILE MOR AYRI KALMALI ----
     v4.76'da iki kirmizi `isin_rengi` doygunlastirmasi yuzunden
     ayni renge dusmustu. Civit (#4B0082) ile mor (#8B00FF)
     neredeyse ayni TONDA (271 vs 273 derece), farklari yalnizca
     aciklik -- yani ayni tuzak. Bu yuzden isin yamalari
     doygunlastirmadan geciyor. Madde o karari kilitliyor.  */
  const ayri = new Set(veri.yamalar[0].map((c) => c.join(",")));
  kontrol("yedi yamanin yedisi de AYRI renk", ayri.size === 7,
          ayri.size + " ayri renk");
  kontrol("civit ile mor birbirine dusmedi",
          veri.yamalar[0][5].join(",") !== veri.yamalar[0][6].join(","),
          veri.yamalar[0][5].join(",") + " vs " + veri.yamalar[0][6].join(","));
}

console.log("");
console.log("=== 4. GEOMETRI: PARCALAR BITISIK, MENZIL KISALMADI ===");
{
  const yol = RP + "/models/entity/simsek_goz_lazer_gokkusagi.geo.json";
  kontrol("gokkusagi geometrisi diskte", existsSync(yol));
  if (existsSync(yol)) {
    const tanim = oku(yol)["minecraft:geometry"][0];
    const isin = tanim.bones.find((b) => b.name === "isin");
    kontrol("isin kemigi var", !!isin);
    kontrol("14 kutu (2 goz x 7 bant)", isin && isin.cubes.length === 14,
            isin ? isin.cubes.length + " kutu" : "yok");
    if (isin) {
      /* Parcalar bitisik olmali: arada bosluk kalirsa isin
         kesik kesik gorunur. Ve toplam uzunluk isin menzilini
         VERMELI -- ayarlar.js LAZER_MENZIL ile esitligi
         doku.mjs kilitliyor, burada kisalmadigini tutuyoruz. */
      const sol = isin.cubes.slice(0, 7)
        .map((c) => [c.origin[2], c.origin[2] + c.size[2]])
        .sort((a, b) => a[0] - b[0]);
      let bosluk = 0;
      for (let i = 1; i < sol.length; i++) {
        if (Math.abs(sol[i][0] - sol[i - 1][1]) > 0.01) bosluk++;
      }
      kontrol("yedi parca bitisik", bosluk === 0, bosluk + " bosluk");
      const uzun = sol[sol.length - 1][1] - sol[0][0];
      kontrol("toplam uzunluk menzil kadar (" + veri.menzil + " blok)",
              Math.abs(uzun - veri.menzil * 16) < 0.01, uzun + " birim");
      /* Her parca KENDI yamasina bakmali; ikisi ayni UV'ye
         bakarsa o iki bant tek renge duser.                 */
      const uvler = new Set(isin.cubes.map((c) => c.uv.north.uv.join(",")));
      kontrol("14 kutu 14 AYRI yamaya bakiyor", uvler.size === 14,
              uvler.size + " ayri UV");
    }
  }
}

console.log("");
console.log("=== 5. BANT GEOMETRISI YALNIZ BU GOZDE ===");
{
  /* Geometri butun lazerli gozlerde ORTAK olsaydi sekiz gozun
     isini birden GOKKUSAGI_ISIN_UV'ye bakardi -- orasi onlarin
     dokusunda bos, yani isinlari gorunmez olurdu. Bu madde
     ayrimin durdugunu tutuyor.                              */
  const blok = /IKSIRLER = \[([\s\S]*?)\n\]/.exec(URETEC)[1];
  const gozler = [...blok.matchAll(/^\s*\("(\w+)",[^\n]*?"(goz_\w+)"/gm)]
    .map((m) => m[2]);
  const bantli = [], duz = [];
  for (const g of gozler) {
    const geo = oku(RP + "/attachables/" + g + "_lazer.json")
      ["minecraft:attachable"].description.geometry.default;
    (geo.endsWith("_gokkusagi") ? bantli : duz).push(g);
  }
  kontrol("bant geometrisini tek goz kullaniyor", bantli.length === 1,
          bantli.join(", ") || "hic");
  kontrol("o goz goz_prizma", bantli[0] === "goz_prizma", bantli[0]);
  kontrol("kalan gozler duz geometride", duz.length === gozler.length - 1,
          duz.length + " goz");
}

console.log("");
console.log("=== 6. ESYALAR VE IKONLAR ===");
{
  for (const ad of ["iksir_prizmoksin", "goz_prizma", "goz_prizma_lazer"]) {
    kontrol("  " + ad + " esyasi", existsSync(BP + "/items/" + ad + ".json"));
    kontrol("  " + ad + " ikonu", existsSync(RP + "/textures/item/" + ad + ".png"));
  }
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  kontrol("ucu de atlasta",
          ["iksir_prizmoksin", "goz_prizma", "goz_prizma_lazer"]
            .every((a) => atlas[a]));

  /* 16x16 ikonda goz basina UC sutun var, yani alti sutuna
     yedi bant sigmiyor. Disarida kalan bant siliniyor DEGIL,
     sizinti satirina veriliyor -- ikonda yedi rengin yedisi de
     gorunuyor. Madde o dagitimi tutuyor.                    */
  const ikon = new Set(veri.ikon.map((c) => c.join(",")));
  const eksikIkon = veri.palet.filter((c) => !ikon.has(c.join(",")));
  kontrol("goz ikonunda yedi rengin yedisi de var",
          eksikIkon.length === 0,
          eksikIkon.map((c) => c.join(",")).join(" | ") || ikon.size + " renk");

  /* Sisenin sivi satirlari y=7..13, yani TAM yedi satir. */
  const sise = new Set(veri.sise.map((c) => c.join(",")));
  const eksikSise = veri.palet.filter((c) => !sise.has(c.join(",")));
  kontrol("sise ikonunda yedi bant", eksikSise.length === 0,
          eksikSise.map((c) => c.join(",")).join(" | ") || "yedisi de var");
}

console.log("");
console.log("=== 7. AYARLAR: RENGARENK PARLAMA VE UC LAZER MODU ===");
{
  const kd = ayar.KADEMELER.find((k) => k.kimlik === "prizmoksin");
  kontrol("Prizmoksin KADEMELER'de", !!kd);
  kontrol("adi Prizmoksin", kd && kd.ad === "Prizmoksin", kd && kd.ad);
  kontrol("gozu pa:goz_prizma", kd && kd.goz === "pa:goz_prizma");
  kontrol("lazer gozu pa:goz_prizma_lazer",
          kd && kd.lazerGoz === "pa:goz_prizma_lazer");

  /* Parlama renkleri paletin 0-1'e bolunmus hali olmali:
     `camera fade` 0-255 kabul etmiyor ve referans modun tam
     bu hatasi vardi (o iksirler beyaz parliyordu).          */
  kontrol("yedi parlama rengi", kd && kd.renkler && kd.renkler.length === 7,
          kd && kd.renkler ? kd.renkler.length + " renk" : "yok");
  let sapan = [];
  if (kd && kd.renkler) {
    for (let i = 0; i < kd.renkler.length; i++) {
      for (let j = 0; j < 3; j++) {
        const bek = veri.palet[i][j] / 255;
        if (Math.abs(kd.renkler[i][j] - bek) > 0.01) {
          sapan.push(i + ":" + j + " " + kd.renkler[i][j] + " != " + bek.toFixed(2));
        }
        if (kd.renkler[i][j] < 0 || kd.renkler[i][j] > 1) {
          sapan.push(i + ":" + j + " 0-1 disinda");
        }
      }
    }
  }
  kontrol("parlama renkleri palete esit ve 0-1 araliginda",
          sapan.length === 0, sapan.slice(0, 4).join(", ") || "yedisi de dogru");

  const modlar = ayar.LAZER_MODLARI.get("prizma");
  kontrol("prizma lazer modu tanimli", !!modlar);
  kontrol("uc mod (Element'te iki vardi)", modlar && modlar.length === 3,
          modlar ? modlar.length + " mod" : "yok");
  const tayf = modlar && modlar.find((m) => m.kimlik === "tayf");
  kontrol("Tayf modu buz VE atesi birlikte veriyor",
          !!tayf && tayf.ek.dondur === true && tayf.ek.ates === true,
          tayf ? JSON.stringify(tayf.ek) : "yok");

  /* Ayarlarin karsiligi kodda olmali: oksuz ayar bu depoda
     tarama.mjs'e takiliyor, ama supurmenin GERCEKTEN
     cagrildigini gormek ayri bir sey.                      */
  const kod = readFileSync(BP + "/scripts/yetenekler/iksirler.js", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  kontrol("parlat() renkler dizisini kullaniyor",
          /kademe\.renkler/.test(kod));
  kontrol("bant araligi runTimeout ile veriliyor",
          /PARLAMA_BANT_ARALIK/.test(kod) && /runTimeout/.test(kod));
  kontrol("her adimda gecerliMi bakiliyor (oyuncu cikabilir)",
          /gecerliMi\(oyuncu\)/.test(kod));
}

if (hata) {
  console.error(">>> SORUN VAR");
  process.exit(1);
}
console.log("");
console.log("prizma.mjs  gecti");
