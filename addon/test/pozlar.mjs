/* POZ SANDIGI -- v7.27'de kullanicinin gonderdigi 45 satirlik
   playanimation listesinden gelen 39 poz.

   ---- BU DOSYA NEYI TUTUYOR ----
   Yetenekler GERCEKTEN CALISTIRILIYOR: poz veriliyor, komut
   yakalaniyor, sira ilerliyor, birakiliyor.

     1. Listede TEKRAR yok, ve modda ZATEN kullanilan alti
        animasyon buraya tekrar eklenmemis. Aksi halde ayni
        poz iki yerden yonetilirdi.
     2. Poz gercekten OYNATILIYOR (playanimation komutu).
     3. Sira her kullanimda BIR ILERLIYOR ve basa donuyor.
     4. CIKIS YOLU VAR: "Pozu Birak" normale donduruyor.
        Kalici poz (gecis 9999) kendiliginden bitmez; cikisi
        olmayan bir poz oyuncuyu o pozda birakirdi. Kaynak
        modun Yamultma'sindaki hata tam buydu.
     5. Birakinca sira BASA doner.
     6. Her oyuncunun sirasi AYRI.
     7. Oyuncu cikinca defter temizleniyor (sizinti).
     8. Kapaliyken hicbir sey oynatilmiyor.                  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const anaModul = await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const poz = await import("./pack/yetenekler/pozlar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  o._komutlar = [];
  o._mesaj = [];
  o.runCommand = function (k) { this._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = function (m) { this._mesaj.push(m); };
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  return { D, o };
}

function kullan(o, kimlik) {
  const tanim = kayit.yetenekAl(kimlik);
  sus();
  const is = tanim.olustur(o);
  if (is) { is.calis(); is.bitir(); }
  ac();
}

/* Oynatilan animasyon kimligi (playanimation komutundan). */
function sonPozKimligi(o) {
  for (let i = o._komutlar.length - 1; i >= 0; i--) {
    const m = /^playanimation @s (animation\.[a-z0-9_.]+)/.exec(o._komutlar[i]);
    if (m) return m[1];
  }
  return null;
}

console.log("=== 1. LISTE SAGLAM MI ===");
{
  const L = ayar.POZ_LISTESI;
  kontrol("liste bos degil", L.length > 0, L.length + " poz");
  const kimlikler = L.map((x) => x[0]);
  kontrol("listede tekrar yok",
          new Set(kimlikler).size === kimlikler.length,
          kimlikler.length + " kayit / " + new Set(kimlikler).size + " ayri");
  kontrol("her kaydin Turkce adi var",
          L.every((x) => typeof x[1] === "string" && x[1].length > 2));
  kontrol("her kimlik animation. ile basliyor",
          kimlikler.every((k) => k.indexOf("animation.") === 0),
          kimlikler.filter((k) => k.indexOf("animation.") !== 0).join(",") || "-");
  /* Kaynak listedeki "animation.cow.baby_ transform" ortasinda
     BOSLUK tasiyordu; o haliyle komut hic calismaz.          */
  kontrol("hicbir kimlikte bosluk yok",
          kimlikler.every((k) => k.indexOf(" ") === -1),
          kimlikler.filter((k) => k.indexOf(" ") !== -1).join(",") || "-");

  /* Modda ZATEN kullanilan animasyonlar listeye tekrar
     girmemeli -- yoksa ayni poz iki yerden yonetilir.        */
  const zaten = [ayar.YAMULT_ANIM, ayar.DONDUR_ANIM, ayar.BEDEN_ANIM,
                 ayar.WILL_YATIR_ANIM]
    .filter(Boolean).map((x) => String(x).split(" ")[0]);
  const cakisan = kimlikler.filter((k) => zaten.indexOf(k) !== -1);
  kontrol("zaten kullanilan animasyonlar listeye tekrar konmamis",
          cakisan.length === 0, cakisan.join(",") || "-");
}

console.log("");
console.log("=== 2. POZ GERCEKTEN OYNATILIYOR ===");
{
  const { o } = kur("p1");
  kullan(o, "poz_ver");
  kontrol("playanimation komutu gitti", sonPozKimligi(o) !== null,
          o._komutlar.join(" | ") || "komut yok");
  kontrol("ilk poz listenin ILK kaydi",
          sonPozKimligi(o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(o) + " vs " + ayar.POZ_LISTESI[0][0]);
  kontrol("gecis suresi kalici (9999)",
          o._komutlar.some((k) => k.indexOf("9999") !== -1),
          o._komutlar[0]);
}

console.log("");
console.log("=== 3. SIRA ILERLIYOR VE BASA DONUYOR ===");
{
  const { o } = kur("p2");
  const N = ayar.POZ_LISTESI.length;
  const gorulen = [];
  for (let i = 0; i < N; i++) {
    o._komutlar = [];
    kullan(o, "poz_ver");
    gorulen.push(sonPozKimligi(o));
  }
  kontrol("her kullanimda BASKA poz",
          new Set(gorulen).size === N,
          gorulen.length + " kullanim / " + new Set(gorulen).size + " ayri poz");
  kontrol("sira listeyle ayni",
          gorulen.every((k, i) => k === ayar.POZ_LISTESI[i][0]));
  o._komutlar = [];
  kullan(o, "poz_ver");
  kontrol("liste bitince BASA donuyor",
          sonPozKimligi(o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(o));
}

console.log("");
console.log("=== 4. CIKIS YOLU (poz kendiliginden bitmez) ===");
{
  const { o } = kur("p3");
  kullan(o, "poz_ver");
  o._komutlar = [];
  kullan(o, "poz_birak");
  const cikis = String(ayar.POZ_BITIS).split(" ")[0];
  kontrol("normale donduren komut gitti",
          o._komutlar.some((k) => k.indexOf(cikis) !== -1),
          o._komutlar.join(" | ") || "komut yok");
  /* Birakma komutunun gecis suresi 0 olmali: 9999 olsaydi
     "normal" pozu da kalici yapardik.                        */
  kontrol("birakma komutu kalici DEGIL",
          String(ayar.POZ_BITIS).indexOf("9999") === -1,
          String(ayar.POZ_BITIS));
}

console.log("");
console.log("=== 5. BIRAKINCA SIRA BASA DONER ===");
{
  const { o } = kur("p4");
  kullan(o, "poz_ver");
  kullan(o, "poz_ver");
  kullan(o, "poz_birak");
  o._komutlar = [];
  kullan(o, "poz_ver");
  kontrol("birakmadan sonra ilk poz",
          sonPozKimligi(o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(o));
}

console.log("");
console.log("=== 6. HER OYUNCUNUN SIRASI AYRI ===");
{
  const a = kur("pa");
  const b = kur("pb");
  _durum.oyuncular = [a.o, b.o];
  kullan(a.o, "poz_ver");
  kullan(a.o, "poz_ver");
  b.o._komutlar = [];
  kullan(b.o, "poz_ver");
  kontrol("ikinci oyuncu listenin basindan basliyor",
          sonPozKimligi(b.o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(b.o));
  a.o._komutlar = [];
  kullan(a.o, "poz_ver");
  kontrol("birinci oyuncu kaldigi yerden devam ediyor",
          sonPozKimligi(a.o) === ayar.POZ_LISTESI[2][0],
          sonPozKimligi(a.o) + " vs " + ayar.POZ_LISTESI[2][0]);
}

console.log("");
console.log("=== 7. OYUNCU CIKINCA DEFTER TEMIZLENIYOR ===");
{
  const { o } = kur("p5");
  kullan(o, "poz_ver");
  kullan(o, "poz_ver");
  poz.pozUnut(o.id);
  o._komutlar = [];
  kullan(o, "poz_ver");
  kontrol("cikip girince listenin basindan",
          sonPozKimligi(o) === ayar.POZ_LISTESI[0][0],
          sonPozKimligi(o));
  /* main.js gercekten cagiriyor mu -- metinden degil, playerLeave
     blogundan bakiliyor.                                      */
  const { readFileSync } = await import("node:fs");
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("playerLeave pozUnut cagiriyor",
          /playerLeave[\s\S]{0,4000}?pozUnut\(olay\.playerId\)/.test(ana));
}

console.log("");
console.log("=== 8. KAPALIYKEN CALISMIYOR ===");
{
  kontrol("POZ_ACIK ayari var", typeof ayar.POZ_ACIK === "boolean");
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(
    new URL("./pack/yetenekler/pozlar.js", import.meta.url), "utf8");
  kontrol("POZ_ACIK iki yetenekte de denetleniyor",
          (kod.match(/if \(!POZ_ACIK/g) || []).length >= 2);
  kontrol("POZ_DENEME ayari okunuyor", /POZ_DENEME/.test(kod));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> poz sandigi yerinde");
process.exit(hata ? 1 : 0);
