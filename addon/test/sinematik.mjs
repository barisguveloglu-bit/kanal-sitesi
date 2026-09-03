/* SINEMATIK KAMERA -- v7.27, kullanicinin komut listesindeki
   iki kamera satirindan.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   CIKIS GARANTISI. Serbest kamera kendiliginden bitmez;
   temizlenmezse oyuncu kendi bedenini goremeyen bir kamerada
   kilitli kalir ve dunyayi kapatmaktan baska caresi olmaz.
   Kaynak listede kamerayi birakan hicbir satir YOK.

   Yetenek GERCEKTEN calistiriliyor, tick tick.               */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 100.5, y: 64, z: 200.5 });
  o.id = id; o.typeId = "minecraft:player";
  o._komutlar = [];
  o.runCommand = function (k) { this._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = () => {};
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  return { D, o };
}

function calistir(o, tick = 1000, bitirsin = true) {
  const tanim = kayit.yetenekAl("sinematik");
  sus();
  const is = tanim.olustur(o);
  let bittiTick = -1;
  if (is) {
    for (let i = 0; i < tick; i++) {
      tickIlerlet(1);
      if (is.calis()) { bittiTick = i; break; }
    }
    if (bitirsin) is.bitir();
  }
  ac();
  return { is, bittiTick };
}

const kameraKur = (o) => o._komutlar.filter((k) => /^camera @s set /.test(k));
const kameraTemiz = (o) => o._komutlar.filter((k) => k === "camera @s clear");

console.log("=== 1. KAMERA KURULUYOR VE OYUNCUYU TAKIP EDIYOR ===");
{
  const { o } = kur("s1");
  calistir(o);
  const kur1 = kameraKur(o);
  kontrol("serbest kamera kuruldu", kur1.length > 0, kur1[0] || "komut yok");
  kontrol("minecraft:free kullanildi",
          kur1.every((k) => k.indexOf("minecraft:free") !== -1));
  kontrol("birden fazla adim var (donuyor)", kur1.length > 2,
          kur1.length + " adim");
  /* Aci SABIT olmamali: kaynak "rot 30 90" diye sabit yaziyordu,
     bizde her adimda hesaplaniyor.                            */
  const acilar = new Set(kur1.map((k) => (/rot (\S+) (\S+)/.exec(k) || [])[2]));
  kontrol("aci her adimda degisiyor (sabit degil)", acilar.size > 2,
          acilar.size + " ayri yaw");
}

console.log("");
console.log("=== 2. KAMERA HER KOSULDA BIRAKILIYOR ===");
{
  const { o } = kur("s2");
  const { bittiTick } = calistir(o);
  kontrol("is kendiliginden bitti", bittiTick >= 0, "tick " + bittiTick);
  kontrol("is SINEMATIK_SURE kadar surdu",
          bittiTick >= ayar.SINEMATIK_SURE - 2 && bittiTick <= ayar.SINEMATIK_SURE + 2,
          bittiTick + " vs " + ayar.SINEMATIK_SURE);
  kontrol("kamera birakildi", kameraTemiz(o).length >= 1,
          kameraTemiz(o).length + " clear");
}
{
  const { o } = kur("s3");
  const tanim = kayit.yetenekAl("sinematik");
  sus();
  const is = tanim.olustur(o);
  tickIlerlet(1); is.calis();
  is.bitir();                       // YARIDA kesildi
  ac();
  kontrol("yarida kesilse de kamera birakildi",
          kameraTemiz(o).length >= 1, kameraTemiz(o).length + " clear");
}
{
  const { o } = kur("s4");
  const tanim = kayit.yetenekAl("sinematik");
  sus();
  const is = tanim.olustur(o);
  is.bitir(); is.bitir(); is.bitir();   // uc kez
  ac();
  kontrol("bitir() birden fazla cagrilsa da tek clear",
          kameraTemiz(o).length === 1, kameraTemiz(o).length + " clear");
}

console.log("");
console.log("=== 3. TAVAN VAR (is takilirsa bile birakilir) ===");
{
  kontrol("SINEMATIK_TAVAN suresinden buyuk",
          ayar.SINEMATIK_TAVAN > ayar.SINEMATIK_SURE,
          ayar.SINEMATIK_TAVAN + " > " + ayar.SINEMATIK_SURE);
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(
    new URL("./pack/yetenekler/sinematik.js", import.meta.url), "utf8");
  kontrol("clear bitir() icinde", /bitir\(\)\s*\{\s*birak\(\);/.test(kod));

  /* SAAT DONMESE BILE is bitmeli. Tavan ilk yazilista
     system.currentTick'e bakiyordu; o da sure denetimiyle AYNI
     saati okudugu icin hicbir zaman tetiklenemezdi -- yani
     tavan degil olu koddu. Mutasyon testi bunu gosterdi.
     Burada saat BILEREK ilerletilmiyor.                     */
  const { o } = kur("s6");
  const tanim = kayit.yetenekAl("sinematik");
  sus();
  const is = tanim.olustur(o);
  let bitti = -1;
  for (let i = 0; i < ayar.SINEMATIK_TAVAN * 2; i++) {
    if (is.calis()) { bitti = i; break; }     // tickIlerlet YOK
  }
  is.bitir();
  ac();
  kontrol("saat donmese bile is tavanda bitiyor", bitti >= 0,
          bitti < 0 ? "hic bitmedi" : "calis() " + (bitti + 1) + " kez");
  kontrol("tavan asilmadi", bitti >= 0 && bitti + 1 <= ayar.SINEMATIK_TAVAN,
          String(bitti + 1) + " <= " + ayar.SINEMATIK_TAVAN);
  kontrol("saat donmese de kamera birakildi",
          kameraTemiz(o).length >= 1, kameraTemiz(o).length + " clear");
}

console.log("");
console.log("=== 4. BEYAZ FLAS (camera fade ZATEN vardi) ===");
{
  const { o } = kur("s5");
  calistir(o, 5);
  kontrol("fade komutu gitti",
          o._komutlar.some((k) => k.indexOf("camera @s fade") !== -1),
          o._komutlar.find((k) => k.indexOf("fade") !== -1) || "yok");
  kontrol("fade sureleri ayardan geliyor",
          o._komutlar.some((k) => k.indexOf("time " + ayar.SINEMATIK_FADE[0]) !== -1));
}

console.log("");
console.log("=== 5. KAPALIYKEN CALISMIYOR ===");
{
  kontrol("SINEMATIK_ACIK ayari var", typeof ayar.SINEMATIK_ACIK === "boolean");
  const { readFileSync } = await import("node:fs");
  const kod = readFileSync(
    new URL("./pack/yetenekler/sinematik.js", import.meta.url), "utf8");
  kontrol("SINEMATIK_ACIK denetleniyor", /if \(!SINEMATIK_ACIK\) return/.test(kod));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> sinematik yerinde");
process.exit(hata ? 1 : 0);
