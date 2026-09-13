/* ENVANTER YEDEGI -- "/clear" ile silinen esyanin karsiligi.
                                                       v7.30

   Tehdit modelindeki DUNYA ailesinden. Karsi taraf operatorse
   envanterini tek komutta siliyor; ONLENEMEZ, cunku komut
   sunucuda calisiyor ve biz olayi sonradan goruyoruz.
   Onlenemeyen seyin karsiligi geri almak.

   ---- BU DOSYANIN TUTTUGU UC SEY ----
   1. Geri yukleme DEGISTIRIYOR, EKLEMIYOR. Ekleseydi iki kez
      geri yukleyen esyasini ikiye katlardi -- savunma hilenin
      kendisi olurdu.
   2. BOS YEDEKLE ENVANTER SILINMEZ. Yedek yokken "temizle ve
      yaz" yapsaydik savunma korudugu seyi yok ederdi.
   3. Savunma Kipi acilinca OTOMATIK yedek. Dovus baslarken
      elle yazmayi unutmak, savunmanin en olasi kaybedilme
      bicimi.                                                */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
/* v7.62: BUTCE SIFIRLA. Bu dosyanin sinadigi yetenekler artik
   varlik dogururken butceden kota istiyor (dis inceleme dort
   yerde bunun atlandigini bulmustu). Oyunda kotayi tick'in
   basi veriyor (main.js:453); test tick dongusunu isletmedigi
   icin kotayi kendisi acmali, yoksa hicbir varlik dogmaz.  */
const { butceSifirla } = await import("./pack/butce.js");
import { _durum, tickIlerlet } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const yedek = await import("./pack/yetenekler/envanter_yedek.js");
const sohbet = await import("./pack/sohbet.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Sahte envanter kabi. */
function kap(boyut = 36) {
  const yuva = new Array(boyut).fill(undefined);
  return {
    size: boyut,
    getItem(i) { return yuva[i]; },
    setItem(i, e) { yuva[i] = e; },
    _yuva: yuva
  };
}
function kur(id, esyalar = {}) {
  const D = (butceSifirla(), dunyaKur());
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o._kap = kap();
  for (const [i, ad] of Object.entries(esyalar)) {
    o._kap.setItem(Number(i), { typeId: ad, amount: 1 });
  }
  o.getComponent = (ad) =>
    ad === "minecraft:inventory" ? { container: o._kap } : undefined;
  o._komutlar = [];
  o.runCommand = function (k) { this._komutlar.push(k); return { successCount: 1 }; };
  o.sendMessage = () => {};
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];
  return { D, o };
}
const dolu = (o) => o._kap._yuva.filter(Boolean).length;

console.log("=== 1. YEDEK ALINIYOR VE GERI YUKLENIYOR ===");
{
  yedek.yedekUnut();
  const { o } = kur("y1", { 0: "minecraft:netherite_sword",
                            3: "minecraft:golden_apple",
                            17: "minecraft:elytra" });
  kontrol("baslangicta 3 esya", dolu(o) === 3, dolu(o) + " esya");
  const m = yedek.yedekAl(o);
  kontrol("yedek alindi", yedek.yedekVarMi(o.id), String(m));
  kontrol("uc yuva yedeklendi", yedek.yedekSayisi(o.id) === 3,
          yedek.yedekSayisi(o.id) + " yuva");

  /* Saldirgan "/clear" cekti. */
  for (let i = 0; i < o._kap.size; i++) o._kap.setItem(i, undefined);
  kontrol("envanter silindi", dolu(o) === 0);

  const m2 = yedek.yedekYukle(o);
  kontrol("geri yuklendi", dolu(o) === 3, String(m2));
  kontrol("kilic ESKI YUVASINDA", o._kap.getItem(0)
          && o._kap.getItem(0).typeId === "minecraft:netherite_sword");
  kontrol("elytra 17. yuvada", o._kap.getItem(17)
          && o._kap.getItem(17).typeId === "minecraft:elytra");
}

console.log("");
console.log("=== 2. DEGISTIRIYOR, EKLEMIYOR (esya cogaltmiyor) ===");
{
  yedek.yedekUnut();
  const { o } = kur("y2", { 0: "minecraft:diamond", 1: "minecraft:diamond" });
  yedek.yedekAl(o);

  /* ---- YEDEK ARTIK TEK KULLANIMLIK  (v7.62) ----
     Dis inceleme bir DISARI AKTARMA acigi buldu:
       yedek al -> esyalari sandiga koy -> geri yukle
     Envanter geri geliyor, sandiktakiler de duruyor; yedek
     silinmedigi icin dongu sinirsiz tekrarlanabiliyordu.
     "Degistirme, ekleme degil" korumasi bunu KAPATMIYORDU --
     o yalniz ust uste iki geri yuklemeyi engelliyordu.     */
  yedek.yedekYukle(o);
  const ikinci = yedek.yedekYukle(o);
  kontrol("ikinci geri yukleme YEDEK YOK diyor",
          typeof ikinci === "string" && ikinci.indexOf("Yedeğin yok") >= 0,
          ikinci);
  kontrol("iki kez yukleyince esya KATLANMIYOR", dolu(o) === 2,
          dolu(o) + " esya (2 olmali)");

  /* ---- ASIL DUPE SENARYOSU ----
     Yukaridaki madde tek basina YETMIYOR: yedek ayni yuvalara
     yazdigi icin, temizleme adimi silinse bile sayi degismiyor.
     Mutasyon testi bunu gostermisti -- "temizlemeyi kaldir"
     mutasyonu KACMISTI.

     Gercek risk YEDEKTEN SONRA alinan esyalar: temizleme
     olmasaydi geri yukleme eskiyi geri koyup yenileri de
     birakirdi, yani envanter buyurdu. Geri yukleme
     DEGISTIRME'dir: yedekten sonrasi gider.

     Yedek tek kullanimlik oldugu icin burada YENIDEN
     aliniyor -- olculen sey degismedi, yolu degisti.

     v7.79: araya `yedekUnut` girdi. Yedek almanin artik
     BEKLEMESI var (cogaltma dongusunun freni) ve bu senaryo
     ust uste iki yedek istiyor. Beklemeyi sifirlamak testin
     olctugu seyi degistirmiyor: burada olculen "geri yukleme
     yedekten sonrasini birakir mi", bekleme degil. Beklemenin
     kendisi asagida ayri bir bolumde sinaniyor.            */
  yedek.yedekUnut(o.id);
  yedek.yedekAl(o);
  o._kap.setItem(9, { typeId: "minecraft:emerald", amount: 64 });
  o._kap.setItem(10, { typeId: "minecraft:emerald", amount: 64 });
  kontrol("yedekten sonra iki esya daha alindi", dolu(o) === 4,
          dolu(o) + " esya");
  yedek.yedekYukle(o);
  kontrol("geri yukleme YEDEKTEN SONRASINI birakmiyor", dolu(o) === 2,
          dolu(o) + " esya (2 olmali)");
  kontrol("sonradan alinan yuva bosaldi", !o._kap.getItem(9));

  /* DISARI AKTARMA DONGUSU KAPALI: yedek harcandi. */
  kontrol("geri yukleme sonrasi yedek KALMADI",
          !yedek.yedekVarMi(o.id));
}

console.log("");
console.log("=== 3. BOS YEDEKLE ENVANTER SILINMIYOR ===");
{
  yedek.yedekUnut();
  const { o } = kur("y3", { 0: "minecraft:totem_of_undying" });
  const m = yedek.yedekYukle(o);      // hic yedek alinmadi
  kontrol("yedek yokken uyari veriyor", /Yedeğin yok/.test(String(m)),
          String(m));
  kontrol("ENVANTER SILINMEDI", dolu(o) === 1, dolu(o) + " esya");
}

console.log("");
console.log("=== 4. SOHBETTEN CALISIYOR ===");
{
  yedek.yedekUnut();
  const { o } = kur("y4", { 0: "minecraft:shield" });
  const r1 = sohbet.komutCozumle(o, "yedek");
  kontrol("'yedek' komutu taniniyor", !!r1 && !!r1.cevap,
          r1 ? String(r1.cevap).slice(0, 40) : "tanimadi");
  kontrol("gercekten yedekledi", yedek.yedekVarMi(o.id));
  for (let i = 0; i < o._kap.size; i++) o._kap.setItem(i, undefined);
  const r2 = sohbet.komutCozumle(o, "geriyukle");
  kontrol("'geriyukle' komutu taniniyor", !!r2 && !!r2.cevap,
          r2 ? String(r2.cevap).slice(0, 40) : "tanimadi");
  kontrol("sohbetten geri yukledi", dolu(o) === 1, dolu(o) + " esya");
}

console.log("");
console.log("=== 5. SAVUNMA KIPI ACILINCA OTOMATIK YEDEK ===");
{
  yedek.yedekUnut();
  const { o } = kur("y5", { 0: "minecraft:netherite_axe" });
  kontrol("YEDEK_OTOMATIK acik", ayar.YEDEK_OTOMATIK === true);
  sohbet.komutCozumle(o, "savunma");
  kontrol("kip acilinca yedek alindi", yedek.yedekVarMi(o.id),
          yedek.yedekSayisi(o.id) + " yuva");
}

console.log("");
console.log("=== 6. TEMIZLIK VE KAPSAM ===");
{
  const { o } = kur("y6", { 0: "minecraft:stick" });
  yedek.yedekAl(o);
  kontrol("defterde var", yedek.yedekVarMi(o.id));
  yedek.yedekUnut(o.id);
  kontrol("yedekUnut siliyor", !yedek.yedekVarMi(o.id));

  const { readFileSync } = await import("node:fs");
  const ana = readFileSync(new URL("./pack/main.js", import.meta.url), "utf8");
  kontrol("playerLeave yedekUnut cagiriyor",
          /playerLeave[\s\S]{0,4000}?yedekUnut\(olay\.playerId\)/.test(ana));
  const kod = readFileSync(
    new URL("./pack/yetenekler/envanter_yedek.js", import.meta.url), "utf8");
  kontrol("YEDEK_ACIK denetleniyor",
          (kod.match(/if \(!YEDEK_ACIK\)/g) || []).length >= 2);
  /* Kapsam durustlugu: bellekte tutuldugu yazili olmali ki
     kimse kalici sanmasin.                                 */
  kontrol("bellekte tutuldugu belgede yazili",
          /BELLEKTE|dunya kapaninca/i.test(kod));
}

console.log("\n=== BEKLEME: ÇOĞALTMA DÖNGÜSÜNÜN FRENİ (v7.79) ===");
{
  /* Dis inceleme v7.62'nin dongyu kapatmadigini gosterdi:
       yedek -> esyalari sandiga bosalt -> yukle -> YENIDEN
       yedek -> tekrar
     Her tur envanteri ikiye katliyordu. Yedegi harcamak ise
     yaramiyor cunku yenisini almak bedavaydi.              */
  const { o } = kur("bek");
  yedek.yedekUnut(o.id);
  o._kap.setItem(0, { typeId: "minecraft:diamond", amount: 64 });

  const ilk = yedek.yedekAl(o);
  kontrol("ilk yedek alindi", /yedeklendi/.test(ilk), ilk);
  kontrol("bekleme basladi", yedek.yedekKalanBekleme(o.id) > 0,
          yedek.yedekKalanBekleme(o.id) + " tik");

  /* DONGUNUN IKINCI TURU: esyayi "sandiga bosalt", geri yukle,
     sonra yeniden yedek almaya calis.                      */
  o._kap.setItem(0, undefined);
  yedek.yedekYukle(o);
  const ikinci = yedek.yedekAl(o);
  kontrol("dongunun ikinci turu ENGELLENDI",
          /beklemede/i.test(ikinci), ikinci);

  /* Bekleme dolunca yine alinabilmeli -- savunma tarafi
     bozulmamali.                                           */
  tickIlerlet(ayar.YEDEK_BEKLEME + 1);
  const ucuncu = yedek.yedekAl(o);
  kontrol("bekleme dolunca yeniden alinabiliyor",
          /yedeklendi/.test(ucuncu), ucuncu);

  kontrol("bekleme ayari anlamli (>= 1 dakika)",
          ayar.YEDEK_BEKLEME >= 1200, ayar.YEDEK_BEKLEME + " tik");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> envanter yedegi yerinde");
process.exit(hata ? 1 : 0);
