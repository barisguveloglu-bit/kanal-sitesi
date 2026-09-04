/* v4.70 -- GOZ LAZERI POZU

   Kullanici: "goz lazeri attiginda ellerim one dogru, yukariya
   dogru degil, gorseldeki gibi degil, birazcik one dogru
   yapsin. Ayrica birazcik beden tarafim birazcik egilsin.
   Her goz lazeri attigimda bu sekilde olsun."

   Kullanici bir GORSEL gonderdi (kollar havada, yukari bakan
   Alex) ve "gorseldeki gibi DEGIL" dedi -- gorsel ornek olsun
   diyeydi. Referans mod tam o gorseldeki pozu yapiyor
   (leftArm -136 derece = yataydan 46 derece geriye/yukari);
   bizimki ONE uzatilmis olmali. Bu dosya farki kilitliyor. */

import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RP = KOK + "/Simsek_Kol_Kaynak";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
const ayar = await import("./pack/ayarlar.js");
ac();

let gecti = 0;
const hatalar = [];
function ol(ad, kosul, ek) {
  if (kosul) { gecti++; return; }
  hatalar.push(ad + (ek ? "  -> " + ek : ""));
}

const YOL = RP + "/animations/goz_lazeri.animation.json";
ol("poz dosyasi uretildi", existsSync(YOL), YOL);
const d = JSON.parse(readFileSync(YOL, "utf8"));
const ad = ayar.LAZER_POZ_ADI;
ol("ayarlardaki ad dosyada var", d.animations[ad] !== undefined,
   Object.keys(d.animations).join(", ") + " != " + ad);

const a = d.animations[ad];
const kemik = a.bones;

/* ---- 1. SURE: iki yerde yazili sayi ayrismasin ----
   Animasyon uzunlugu (kol_uret.py LAZER_ANIM_TICK) ile isin
   suresi (ayarlar.js LAZER_SURE) ayni olmali. Ayrisirsa ya
   poz isin bitmeden duser ya da isin bittikten sonra oyuncu
   kollari havada donmus kalir.                              */
ol("poz uzunlugu isin suresiyle ayni",
   Math.abs(a.animation_length - ayar.LAZER_SURE / 20) < 0.01,
   a.animation_length + " sn vs " + (ayar.LAZER_SURE / 20) + " sn");
ol("poz DONGU degil (bir kez oynar)", a.loop === false, String(a.loop));

/* ---- 2. KOLLAR ONE, YUKARI DEGIL ----
   Kol X ekseninde -90 tam yatay one. Referans -136 (yukari/
   geriye) kullaniyor; kullanici "gorseldeki gibi degil" dedi.
   -95 ile -60 arasi "one uzatilmis" sayiliyor.              */
for (const k of ["rightArm", "leftArm"]) {
  ol(k + " poz kanali var", kemik[k] !== undefined);
  const poz = kemik[k].rotation["0.2"];
  ol(k + " ONE uzatiliyor (yukari degil)",
     poz[0] <= -60 && poz[0] >= -95, "X = " + poz[0]);
  ol(k + " referansin YUKARI pozunda DEGIL",
     poz[0] > -120, "X = " + poz[0] + " (referans -136)");
}
{
  const sag = kemik.rightArm.rotation["0.2"];
  const sol = kemik.leftArm.rotation["0.2"];
  ol("iki kol da ayni yukseklikte", sag[0] === sol[0],
     sag[0] + " vs " + sol[0]);
  ol("kollar govdeden ayrik (simetrik Z)", sag[2] === -sol[2],
     sag[2] + " / " + sol[2]);
}

/* ---- 3. GOVDE BIRAZCIK EGILIYOR ----
   Referans 20 derece kullaniyor; kullanici "birazcik" dedi. */
{
  const g = kemik.body.rotation["0.2"];
  ol("govde ONE egiliyor", g[0] > 0, "X = " + g[0]);
  ol("egilme 'birazcik' (referansin 20'sinden az)",
     g[0] > 0 && g[0] < 20, g[0] + " derece");
}

/* ---- 4. BAS GOVDENIN TERSI ----
   Govde one egilince kafa da onunla gelir ve oyuncu yere
   bakiyormus gibi durur; oysa lazer getViewDirection()'i
   takip ediyor, nisan degismiyor. Bas ters donduruluyor. */
{
  const g = kemik.body.rotation["0.2"];
  const b = kemik.head.rotation["0.2"];
  ol("bas govdenin TERSI kadar donuyor", b[0] === -g[0],
     "bas " + b[0] + " / govde " + g[0]);
}

/* ---- 5. POZ NOTR'A DONUYOR ----
   Donmezse isin bitince oyuncu kollari one uzanmis donar. */
for (const k of ["body", "head", "rightArm", "leftArm"]) {
  const r = kemik[k].rotation;
  /* Son kareyi ANAHTAR METNIYLE arama: uretec 25,5 saniyeyken
     "25.5" yaziyordu, 30 saniyede "30.0" yazdi ve String(30)
     "30" oldugu icin arama tutmadi. Anahtarlar SAYI olarak
     karsilastiriliyor -- gosterim ne olursa olsun calisir.   */
  const sonAnahtar = Object.keys(r)
    .reduce((en, k2) => (Number(k2) > Number(en) ? k2 : en));
  ol(k + " son kare animasyon sonunda",
     Number(sonAnahtar) === Number(a.animation_length),
     sonAnahtar + " / " + a.animation_length);
  const son = r[sonAnahtar];
  ol(k + " sonunda notr'a donuyor",
     son && son[0] === 0 && son[1] === 0 && son[2] === 0,
     JSON.stringify(son));
  ol(k + " notr BASLIYOR", JSON.stringify(r["0.0"]) === "[0,0,0]",
     JSON.stringify(r["0.0"]));
}

/* ---- 6. KOD POZU GERCEKTEN OYNATIYOR ---- */
{
  const src = readFileSync("./pack/yetenekler/goz_lazeri.js", "utf8");
  ol("lazer atarken poz cagriliyor", /lazerPozu\(oyuncu\)/.test(src));
  ol("once API deneniyor", /playAnimation\(LAZER_POZ_ADI\)/.test(src));
  ol("API yoksa komuta dusuluyor",
     /playanimation @s " \+ LAZER_POZ_ADI/.test(src));
  ol("ikisi de yoksa paket OLMUYOR (sessiz gecis)",
     /pozUyarisi/.test(src));
  ol("kapatma anahtari var", /if \(!LAZER_POZ_ACIK\) return/.test(src));
}

if (hatalar.length) {
  console.error("KALDI:");
  for (const h of hatalar) console.error("  - " + h);
  process.exit(1);
}
console.log("lazer_poz.mjs  gecti: " + gecti + "  kaldi: yok");
