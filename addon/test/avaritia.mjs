/* AVARITIA ULTIMATE'TEN UC MEKANIK              v7.91

   Kullanici: "moddaki her seyi alalim gitsin vallahi zirhi da
   alalim." Zirh v7.90'da alindi; bu uc tanesi bizde karsiligi
   HIC olmayanlar.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Diken vurana yansitiyor, KENDIMIZE ve BOTUMUZA asla.
   2. Yansima TAVANLI -- vuran kendi vurusundan olmesin.
   3. Vuran yoksa (dusme, aclik) yansima yok.
   4. Diken SURELI; kapaninca yansima duruyor.
   5. Agac devirme kutuk/yaprak AYRIMI yapiyor ve yapraklari
      yalniz kutuge yakinsa aliyor (komsu agaci kesmesin).
   6. Agac devirme BUTCEYE uyuyor -- tick basina parti.
   7. Bedrock kirici EN ALT KATMANI kirmiyor: kullanicinin
      tek katli dunyasinda zemini delerdi.                   */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, hasarTetikle, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const A     = await import("./pack/yetenekler/avaritia.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id, ek = {}) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o._hasar = []; o._yazi = [];
  o.applyDamage = (m) => { o._hasar.push(m); return true; };
  o.onScreenDisplay = { setActionBar(t) { o._yazi.push(String(t)); }, setTitle() {} };
  Object.assign(o, ek);
  _durum.oyuncular = [o];
  D.boyut._varliklar = [o];
  return { D, o };
}
function varlik(id, tip, x, y, z) {
  return {
    id, typeId: tip, isValid: true, name: id, location: { x, y, z },
    _hasar: [],
    applyDamage(m) { this._hasar.push(m); return true; },
    addEffect() {}, applyKnockback() { return true; }
  };
}
function calistir(kimlik, o, tick = 0) {
  const t = kayit.yetenekAl(kimlik);
  if (!t) return undefined;
  sus();
  const is = t.olustur(o);
  if (is && tick > 0) {
    for (let i = 0; i < tick; i++) { tickIlerlet(1); if (is.calis()) break; }
    is.bitir();
  }
  ac();
  return is;
}
const yaz = (o) => o._yazi.join(" | ");

console.log("=== 0. UC MEKANIK KAYITLI ===");
{
  for (const k of ["diken_zirhi", "agac_devir", "bedrock_kir"]) {
    kontrol(k + " kayitli", !!kayit.yetenekAl(k));
  }
  kontrol("sira carpismasi yok", kayit.siraDenetimi().length === 0,
          kayit.siraDenetimi().join(" | ") || "temiz");
}

console.log("");
console.log("=== 1. DIKEN: VURANA YANSITIYOR ===");
{
  const { o } = kur("d1");
  const v = varlik("vuran", "minecraft:zombie", 0.5, 90, 2.5);
  const is = calistir("diken_zirhi", o);
  kontrol("diken acildi", A.dikenAcikMi(o.id) === true);
  sus();
  hasarTetikle({ hurtEntity: o, damage: 10,
                 damageSource: { cause: "entityAttack", damagingEntity: v } });
  ac();
  kontrol("vurana hasar yansidi", v._hasar.length === 1, v._hasar.join(","));
  kontrol("oran ayardan",
          Math.abs(v._hasar[0] - 10 * ayar.AVA_DIKEN_ORAN) < 0.001,
          v._hasar[0] + " (10 x " + ayar.AVA_DIKEN_ORAN + ")");
  if (is) { sus(); is.bitir(); ac(); }
}

console.log("");
console.log("=== 2. DIKEN: TAVAN (vuran kendi vurusundan olmesin) ===");
{
  const { o } = kur("d2");
  const v = varlik("v2", "minecraft:zombie", 0.5, 90, 2.5);
  const is = calistir("diken_zirhi", o);
  sus();
  hasarTetikle({ hurtEntity: o, damage: 100000,
                 damageSource: { cause: "entityAttack", damagingEntity: v } });
  ac();
  kontrol("yansima TAVANDA kesildi", v._hasar[0] === ayar.AVA_DIKEN_TAVAN,
          v._hasar[0] + " (tavan " + ayar.AVA_DIKEN_TAVAN + ")");
  kontrol("  tavan gelen hasardan kucuk", ayar.AVA_DIKEN_TAVAN < 100000);
  if (is) { sus(); is.bitir(); ac(); }
}

console.log("");
console.log("=== 3. DIKEN: KENDIMIZE ve BOTA YANSIMIYOR ===");
{
  const bottipi = [...ayar.KILIT_ATLA_TIPLER][0];
  const { o } = kur("d3");
  const bot = varlik("bot", bottipi, 0.5, 90, 2.5);
  const is = calistir("diken_zirhi", o);
  sus();
  /* Kendimiz vurmusuz. */
  hasarTetikle({ hurtEntity: o, damage: 9,
                 damageSource: { cause: "entityAttack", damagingEntity: o } });
  /* Botumuz vurmus. */
  hasarTetikle({ hurtEntity: o, damage: 9,
                 damageSource: { cause: "entityAttack", damagingEntity: bot } });
  /* Vuran YOK (dusme). */
  hasarTetikle({ hurtEntity: o, damage: 9, damageSource: { cause: "fall" } });
  ac();
  kontrol("KENDIMIZE yansimadi", o._hasar.length === 0, o._hasar.join(",") || "0");
  kontrol("BOTUMUZA yansimadi", bot._hasar.length === 0,
          bottipi + " :: " + (bot._hasar.join(",") || "0"));
  kontrol("vuran yoksa yansima yok (dusme)", true, "istisna atmadi");
  if (is) { sus(); is.bitir(); ac(); }
}

console.log("");
console.log("=== 4. DIKEN KAPALIYKEN YANSIMA YOK ===");
{
  const { o } = kur("d4");
  const v = varlik("v4", "minecraft:zombie", 0.5, 90, 2.5);
  kontrol("basta kapali", A.dikenAcikMi(o.id) === false);
  sus();
  hasarTetikle({ hurtEntity: o, damage: 10,
                 damageSource: { cause: "entityAttack", damagingEntity: v } });
  ac();
  kontrol("kapaliyken yansima yok", v._hasar.length === 0,
          v._hasar.join(",") || "0");

  /* Acilip SURESI DOLUNCA yine kapanmali. */
  calistir("diken_zirhi", o, ayar.AVA_DIKEN_SURE + 30);
  kontrol("sure dolunca kapandi", A.dikenAcikMi(o.id) === false);
  sus();
  hasarTetikle({ hurtEntity: o, damage: 10,
                 damageSource: { cause: "entityAttack", damagingEntity: v } });
  ac();
  kontrol("  ve yansima durdu", v._hasar.length === 0, v._hasar.join(",") || "0");
}

console.log("");
console.log("=== 5. AGAC TARAMASI: KUTUK/YAPRAK AYRIMI ===");
{
  /* Sahte dunyada kucuk bir agac kuruluyor: 4 kutuk, uzerinde
     yapraklar, ve UZAKTA komsu bir agacin yapragi.         */
  const D = dunyaKur();
  const yaz2 = (x, y, z, t) => D.boyut.getBlock({ x, y, z }).setType(t);
  sus();
  for (let y = 70; y < 74; y++) yaz2(0, y, 0, "minecraft:oak_log");
  yaz2(1, 74, 0, "minecraft:oak_leaves");
  yaz2(0, 74, 0, "minecraft:oak_leaves");
  yaz2(-1, 74, 0, "minecraft:oak_leaves");
  ac();
  const kok = D.boyut.getBlock({ x: 0, y: 70, z: 0 });
  const liste = A.agaciTara(D.boyut, kok);
  kontrol("agac bulundu", liste.length >= 6, liste.length + " blok");
  const kutuk = liste.filter((p) => p.x === 0 && p.z === 0 && p.y < 74).length;
  kontrol("dort kutuk de bulundu", kutuk === 4, kutuk + " kutuk");
  kontrol("yapraklar da alindi", liste.length > kutuk,
          (liste.length - kutuk) + " yaprak");
  kontrol("tavan asilmadi", liste.length <= ayar.AVA_AGAC_TAVAN,
          liste.length + " <= " + ayar.AVA_AGAC_TAVAN);

  /* ---- YAPRAK UZAKLIK SINIRI  (mutasyon bulunca eklendi) ----
     Ustteki agac cok kucuk: butun yapraklar zaten sinirin
     icinde, yani sinir kaldirilsa bile sonuc degismiyordu ve
     mutasyon KACTI.

     Burada kutugun tepesinden UZUN bir yaprak zinciri
     uzatiliyor. Sinir varken zincir AVA_AGAC_YAPRAK_UZAK
     adimda kesilmeli; olmasaydi zincirin tamami gelirdi --
     yani komsu agacin yapraklari da.                      */
  const D2 = dunyaKur();
  sus();
  for (let y = 70; y < 74; y++) D2.boyut.getBlock({ x: 0, y, z: 0 }).setType("minecraft:oak_log");
  const ZINCIR = ayar.AVA_AGAC_YAPRAK_UZAK + 8;
  for (let x = 1; x <= ZINCIR; x++) {
    D2.boyut.getBlock({ x, y: 73, z: 0 }).setType("minecraft:oak_leaves");
  }
  ac();
  const l2 = A.agaciTara(D2.boyut, D2.boyut.getBlock({ x: 0, y: 70, z: 0 }));
  const enUzak = l2.filter((p) => p.y === 73 && p.z === 0)
                   .reduce((a, p) => Math.max(a, p.x), 0);
  /* SAYIM: kutuge KOMSU yaprak d=0 ile geliyor (kutuk kendi
     komsularina d'yi sifirliyor), sonraki her yaprak +1.
     Yani "d <= 6" sinirinin karsiligi zincirde 7. blok.
     Ilk yazilista `<= 6` bekleniyordu ve madde dustu; kodda
     hata yoktu, SAYIM yanlis okunmustu.                    */
  kontrol("yaprak zinciri sinirda kesildi",
          enUzak === ayar.AVA_AGAC_YAPRAK_UZAK + 1,
          "en uzak x=" + enUzak + " (d<=" + ayar.AVA_AGAC_YAPRAK_UZAK +
          " -> zincirde " + (ayar.AVA_AGAC_YAPRAK_UZAK + 1) + ". blok)");
  kontrol("  ama zincirin bir kismi alindi", enUzak >= 1, "x=" + enUzak);
  kontrol("  zincirin tamami ALINMADI", enUzak < ZINCIR,
          enUzak + " < " + ZINCIR);
}

console.log("");
console.log("=== 6. AGAC: KUTUGE BAKMADAN CALISMIYOR ===");
{
  const { o } = kur("a1", {
    getBlockFromViewDirection: () => ({
      block: { typeId: "minecraft:stone", location: { x: 0, y: 70, z: 0 } }
    })
  });
  calistir("agac_devir", o);
  kontrol("tasa bakinca calismiyor", yaz(o).indexOf("kütüğe bak") !== -1, yaz(o));
}

console.log("");
console.log("=== 7. AGAC: BUTCEYE UYUYOR ===");
{
  /* Tick basina blok kotasi bu depoda kural. Tek karede
     yuzlerce blok yazilmamali.                             */
  const D = dunyaKur();
  sus();
  for (let y = 70; y < 80; y++) D.boyut.getBlock({ x: 0, y, z: 0 }).setType("minecraft:oak_log");
  ac();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = "a2"; o.typeId = "minecraft:player";
  o._yazi = [];
  o.onScreenDisplay = { setActionBar(t) { o._yazi.push(String(t)); }, setTitle() {} };
  o.getBlockFromViewDirection = () => ({ block: D.boyut.getBlock({ x: 0, y: 70, z: 0 }) });
  _durum.oyuncular = [o]; D.boyut._varliklar = [o];

  const t = kayit.yetenekAl("agac_devir");
  sus();
  const is = t.olustur(o);
  const oncesi = (D.sayac.boyutKomut || []).length;
  tickIlerlet(1); is.calis();
  const birTick = (D.sayac.boyutKomut || []).length - oncesi;
  ac();
  kontrol("tek tickte parti kadar blok", birTick <= ayar.AVA_AGAC_PARTI,
          birTick + " <= " + ayar.AVA_AGAC_PARTI);
  kontrol("  ve sifirdan buyuk", birTick > 0, String(birTick));
  sus();
  for (let i = 0; i < ayar.AVA_AGAC_SURE; i++) { tickIlerlet(1); if (is.calis()) break; }
  is.bitir(); ac();
  kontrol("is sonunda bitiyor",
          yaz(o).indexOf("blok devrildi") !== -1, o._yazi[o._yazi.length - 1] || "");
  /* Dusursun diye `destroy` kullaniliyor: agac devirmenin
     anlami odunu almak.                                    */
  /* Komutlar sahte dunyada `sayac.boyutKomut`ta tutuluyor
     (dunya.mjs, v7.85). Ilk yazilista `boyut._komutlar`a
     bakiliyordu ve orasi bos -- madde kodu degil TESTIN
     kendi yanlisini gosteriyordu.                          */
  kontrol("komut 'destroy' ile (odun dusuyor)",
          (D.sayac.boyutKomut || []).some((k) => k.indexOf("destroy") !== -1),
          (D.sayac.boyutKomut || [])[0] || "komut yok");
}

console.log("");
console.log("=== 8. BEDROCK: EN ALT KATMAN KIRILMIYOR (asil madde) ===");
{
  /* Kaynakta boyle bir sinir YOK. Kullanicinin "Efsanenin
     Dunyasi" dunyasi TEK KAT bedrock -- orada bu yetenek
     zemini delip dunyayi kullanilamaz yapardi.            */
  const D = dunyaKur();
  const taban = D.boyut.heightRange.min;
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = "b1"; o.typeId = "minecraft:player"; o._yazi = [];
  o.onScreenDisplay = { setActionBar(t) { o._yazi.push(String(t)); }, setTitle() {} };
  o.getBlockFromViewDirection = () => ({
    block: { typeId: "minecraft:bedrock", location: { x: 0, y: taban, z: 0 } }
  });
  _durum.oyuncular = [o]; D.boyut._varliklar = [o];
  calistir("bedrock_kir", o);
  kontrol("en alt katman REDDEDILDI",
          yaz(o).indexOf("En alt katman") !== -1, yaz(o));

  /* Ustteki bir bedrock kirilmali. */
  o._yazi.length = 0;
  o.getBlockFromViewDirection = () => ({
    block: { typeId: "minecraft:bedrock", location: { x: 0, y: taban + 5, z: 0 } }
  });
  const is = calistir("bedrock_kir", o);
  kontrol("ustteki bedrock kabul edildi", !!is && yaz(o).indexOf("kırılıyor") !== -1,
          yaz(o));
  if (is) { sus(); is.bitir(); ac(); }
}

console.log("");
console.log("=== 9. BEDROCK: SURE DOLMADAN KIRILMIYOR ===");
{
  const D = dunyaKur();
  const taban = D.boyut.heightRange.min;
  const yer = { x: 0, y: taban + 5, z: 0 };
  sus(); D.boyut.getBlock(yer).setType("minecraft:bedrock"); ac();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = "b2"; o.typeId = "minecraft:player"; o._yazi = [];
  o.onScreenDisplay = { setActionBar(t) { o._yazi.push(String(t)); }, setTitle() {} };
  o.getBlockFromViewDirection = () => ({ block: D.boyut.getBlock(yer) });
  _durum.oyuncular = [o]; D.boyut._varliklar = [o];

  const t = kayit.yetenekAl("bedrock_kir");
  sus();
  const is = t.olustur(o);
  for (let i = 0; i < ayar.AVA_BEDROCK_SURE - 20; i++) { tickIlerlet(1); if (is.calis()) break; }
  ac();
  kontrol("sure dolmadan blok duruyor",
          D.boyut.getBlock(yer).typeId === "minecraft:bedrock",
          D.boyut.getBlock(yer).typeId);
  sus();
  for (let i = 0; i < 60; i++) { tickIlerlet(1); if (is.calis()) break; }
  is.bitir(); ac();
  kontrol("sure dolunca kirildi",
          D.boyut.getBlock(yer).typeId === "minecraft:air",
          D.boyut.getBlock(yer).typeId);
  kontrol("  sure kaynaktaki sayi (188 tick)",
          ayar.AVA_BEDROCK_SURE === 188, String(ayar.AVA_BEDROCK_SURE));
}

console.log(hata ? ">>> SORUN VAR" : ">>> avaritia yerinde");
process.exit(hata ? 1 : 0);
