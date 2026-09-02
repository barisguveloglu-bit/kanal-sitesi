/* v4.74 -- LAZER YERI DELIYOR, OBSIDYENDE ZORLANIYOR

   Kullanici: "yeri delsin obsidyene kadar, obsidyende birazcik
   zorlansin ama bayagi; odaklandigim yere, baktigim obsidyen
   blogunA gore yavas yavas kirilsin. Bunun tamamini kirabilmek
   icin 10 dusun -- birine odaklandiysan 10 kere lazer atmam
   gerekiyor."

   Ayrica v4.69'da fark edilmeden bir hata girmisti: isin
   sureli/supurulebilir olunca DELME listesi geride kaldi, ilk
   bakis yonunden bir kez hesaplaniyordu. Isini cevirsen bile
   delik hep ilk baktigin yerde aciliyordu. Burasi onu da
   kilitliyor.                                                */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

esyaKaydet("pa:iksir_nitroksin", "pa:goz_beyaz", "pa:goz_beyaz_lazer");
const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const mc = await import("@minecraft/server");
await import("./pack/main.js");
const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");
ac();

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* Sahte dunyayi obsidyenle doldur: getBlock her yerde obsidyen
   dondursun, setType ise silsin.                              */
function obsidyenDunya(tip = "minecraft:obsidian") {
  const D = dunyaKur();
  const bloklar = new Map();
  const anah = (x, y, z) => x + "," + y + "," + z;
  const eskiGet = D.boyut.getBlock.bind(D.boyut);
  D.boyut.getBlock = (loc) => {
    const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
    const k = anah(x, y, z);
    D.sayac.getBlock++;
    return {
      get typeId() { return bloklar.has(k) ? bloklar.get(k) : tip; },
      get isAir() { return this.typeId === "minecraft:air"; },
      setType(t) { D.sayac.setType++; D.sayac.yazilan.push({ x, y, z, tip: t }); bloklar.set(k, t); },
      location: { x, y, z }
    };
  };
  D._bloklar = bloklar;
  return D;
}

function oyuncuyu(D, id, bakis) {
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o._kafa = undefined;
  o.addEffect = () => {}; o.removeEffect = () => {};
  o.getHeadLocation = () => ({ x: 0.5, y: 90.6, z: 0.5 });
  if (bakis) o.getViewDirection = () => bakis;
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: (s2) => (s2 === "Head" && o._kafa) ? { typeId: o._kafa } : undefined,
    setEquipment: (s2, e) => { if (s2 === "Head") o._kafa = e ? e.typeId : undefined; return true; }
  } : undefined;
  _durum.oyuncular = [o];
  return o;
}

const ic = (o) => {
  sus();
  mc.itemCompleteUseTetikle({ source: o, itemStack: { typeId: "pa:iksir_nitroksin" } });
  tickIlerlet(2);
  ac();
};

function isinTut(o, tick) {
  const tanim = kayit.yetenekAl("goz_lazeri");
  sus();
  const is = tanim.olustur(o);
  if (is) {
    for (let t = 0; t < tick; t++) {
      butceSifirla();
      if (is.calis()) { if (is.bitir) is.bitir(); break; }
      tickIlerlet(1);
    }
  }
  ac();
  return is;
}

const GEREKEN = ayar.LAZER_DELME_SERT.get("minecraft:obsidian");
const ARALIK = ayar.LAZER_VURUS_ARALIK;

/* v4.74'te 10 vurustu (kullanicinin kendi sayisi). v4.75'te
   "lazerin gucunu artir" denince 6'ya indi = 3 saniye
   odaklanma. Hala tek vurusta gitmiyor, asil kural bu.      */
console.log("=== 1. AYAR: OBSIDYEN 6 VURUS ===");
kontrol("obsidyen sayisi guncel", GEREKEN === 6, String(GEREKEN));
kontrol("6 vurus = 3 saniye", GEREKEN * ARALIK / 20 === 3,
        (GEREKEN * ARALIK / 20) + " sn");
kontrol("hala tek vurusluk DEGIL", GEREKEN >= 2, String(GEREKEN));
kontrol("obsidyen KORUNAN degil (yoksa hic delinmezdi)",
        !ayar.KORUNAN_KUME.has("minecraft:obsidian"));
kontrol("bedrock hala korunuyor", ayar.KORUNAN_KUME.has("minecraft:bedrock"));

console.log("\n=== 2. TEK VURUSTA KIRILMIYOR ===");
{
  const D = obsidyenDunya();
  const o = oyuncuyu(D, "d1", { x: 0, y: -1, z: 0 });   // asagi bak
  ic(o);
  isinTut(o, ARALIK - 2);          // tek vurus
  const silinen = D.sayac.yazilan.filter((b) => b.tip === "minecraft:air");
  kontrol("tek vuruslta HIC obsidyen kirilmadi", silinen.length === 0,
          silinen.length + " blok kirildi");
}

console.log("\n=== 3. GEREKEN VURUSTA KIRILIYOR ===");
{
  const D = obsidyenDunya();
  const o = oyuncuyu(D, "d2", { x: 0, y: -1, z: 0 });
  ic(o);
  isinTut(o, ARALIK * (GEREKEN + 1));
  const silinen = D.sayac.yazilan.filter((b) => b.tip === "minecraft:air");
  kontrol("on vurusta obsidyen KIRILDI", silinen.length > 0,
          silinen.length + " blok kirildi");
  /* Sadece MERKEZ cizgi kirilmali: 3x3 delikteki dokuz
     obsidyeni birden yontmak "odaklanma" olmazdi.          */
  const merkezDisi = silinen.filter((b) => b.x !== 0 || b.z !== 0);
  kontrol("kenardaki obsidyenler DURUYOR (sadece odak kirildi)",
          merkezDisi.length === 0,
          merkezDisi.length + " kenar blogu da kirilmis");
}

console.log("\n=== 4. YUMUSAK BLOK TEK VURUSTA GIDIYOR ===");
{
  const D = obsidyenDunya("minecraft:stone");
  const o = oyuncuyu(D, "d3", { x: 0, y: -1, z: 0 });
  ic(o);
  isinTut(o, ARALIK - 2);
  const silinen = D.sayac.yazilan.filter((b) => b.tip === "minecraft:air");
  kontrol("tas tek vuruslta delindi", silinen.length > 5,
          silinen.length + " blok");
  kontrol("3x3 delik aciliyor (sert olmayanda yaricap gecerli)",
          silinen.some((b) => b.x !== 0 || b.z !== 0));
}

console.log("\n=== 5. ISIN CEVRILINCE DELIK DE DONUYOR (v4.69 hatasi) ===");
{
  const D = obsidyenDunya("minecraft:stone");
  const o = oyuncuyu(D, "d4");
  let bakis = { x: 0, y: -1, z: 0 };
  o.getViewDirection = () => bakis;
  ic(o);

  const tanim = kayit.yetenekAl("goz_lazeri");
  sus();
  const is = tanim.olustur(o);
  for (let t = 0; t < ARALIK + 2; t++) { butceSifirla(); if (is.calis()) break; tickIlerlet(1); }
  const asagi = D.sayac.yazilan.length;
  bakis = { x: 1, y: 0, z: 0 };                 // simdi yana bak
  for (let t = 0; t < ARALIK * 2; t++) { butceSifirla(); if (is.calis()) break; tickIlerlet(1); }
  ac();

  const yeni = D.sayac.yazilan.slice(asagi);
  kontrol("bakis degisince YENI yon delindi", yeni.length > 0,
          yeni.length + " yeni blok");
  kontrol("yeni delik gercekten YAN tarafta",
          yeni.some((b) => b.x > 2 && b.y >= 89),
          "en uzak x: " + Math.max(...yeni.map((b) => b.x)));
}

/* ============================================================
   7. UZAKTAKI OBSIDYEN  --  v4.75'te bildirilen gercek hata

   Kullanici: "delme olayini daha iyi yap, obsidyen kirilmiyor."

   TESTLERIN KORU NOKTASI BUYDU: yukaridaki butun senaryolarda
   dunya BASTAN ASAGI dolu, yani oyuncunun burnunun dibindeki
   blok zaten obsidyen. Gercek oyunda ise once HAVA var.

   Eski delmeListesi her d adiminda, blogun dolu olup
   olmadigina BAKMADAN 3x3x3 = 27 nokta ekliyordu ve tavan
   60'ti: liste ancak ilk uc bloga yetiyordu. O uc blok hava
   olunca butun butce bosluga gidiyor, dorduncu bloktaki
   obsidyene HIC sira gelmiyordu.

   Burasi o durumu kuruyor: onumuzde 5 blok hava, sonra
   obsidyen duvar.                                            */
console.log("\n=== 7. HAVANIN ARKASINDAKI OBSIDYEN (v4.75 hatasi) ===");
{
  const UZAK = 5;                       // kac blok oteden sonra duvar
  const D = dunyaKur();
  const bloklar = new Map();
  const anah = (x, y, z) => x + "," + y + "," + z;
  D.boyut.getBlock = (loc) => {
    const x = Math.floor(loc.x), y = Math.floor(loc.y), z = Math.floor(loc.z);
    const k = anah(x, y, z);
    D.sayac.getBlock++;
    /* Oyuncu (0, 90, 0) civarinda, +z yonune bakiyor.
       z < UZAK -> hava,  z >= UZAK -> obsidyen duvar.      */
    const varsayilan = z >= UZAK ? "minecraft:obsidian" : "minecraft:air";
    return {
      get typeId() { return bloklar.has(k) ? bloklar.get(k) : varsayilan; },
      get isAir() { return this.typeId === "minecraft:air"; },
      setType(t) {
        D.sayac.setType++;
        D.sayac.yazilan.push({ x, y, z, tip: t });
        bloklar.set(k, t);
      },
      location: { x, y, z }
    };
  };

  const o = oyuncuyu(D, "d7", { x: 0, y: 0, z: 1 });    // duz ileri bak
  ic(o);
  isinTut(o, ARALIK * (GEREKEN + 2));

  const silinen = D.sayac.yazilan.filter((b) => b.tip === "minecraft:air");
  kontrol("uzaktaki obsidyen KIRILDI", silinen.length > 0,
          silinen.length + " blok kirildi");
  kontrol("kirilan blok gercekten duvarda (z >= " + UZAK + ")",
          silinen.length > 0 && silinen.every((b) => b.z >= UZAK),
          silinen.length ? "z: " + silinen.map((b) => b.z).join(",") : "-");
  /* Havaya yazim yapilmamali: eski hatanin bir baska yuzu.  */
  const havaya = D.sayac.yazilan.filter((b) => b.z < UZAK);
  kontrol("onundeki HAVAYA hic yazim yapilmadi", havaya.length === 0,
          havaya.length + " gereksiz yazim");
}

console.log("\n=== 8. AYNI BLOK IKI KEZ SAYILMIYOR ===");
{
  /* Capraz bakista ardisik d adimlari ayni bloga dusebiliyor.
     Liste ayni koordinati iki kez tasirsa obsidyen sayaci TEK
     vurusta iki kere azalir -- 6 vurusluk kural 3'e duserdi. */
  const src = readFileSync("./pack/yetenekler/goz_lazeri.js", "utf8");
  kontrol("delme listesi tekrarlari eliyor",
          /const gorulen = new Map\(\);/.test(src));
  kontrol("merkez kaydi tekrarda kaybolmuyor",
          /if \(merkez\) liste\[eski\]\.merkez = true;/.test(src));
  kontrol("bos merkezler listeye hic girmiyor",
          /if \(!merkezBlok \|\| merkezBlok\.isAir\) continue;/.test(src));
  kontrol("yoklama okumasi da butceden odeniyor",
          /if \(blokIste\(1\) < 1\) break;/.test(src));
}

console.log("\n=== 6. BAKISINI CEKERSEN IYILESIYOR ===");
{
  kontrol("unutma suresi tanimli",
          ayar.LAZER_SERT_UNUTMA > 0 && ayar.LAZER_SERT_UNUTMA <= 600,
          ayar.LAZER_SERT_UNUTMA + " tick = " + (ayar.LAZER_SERT_UNUTMA / 20) + " sn");
  const src = readFileSync("./pack/yetenekler/goz_lazeri.js", "utf8");
  kontrol("eskiyen kayitlar siliniyor", /sertTemizle\(simdi\)/.test(src));
  kontrol("defter MODUL duzeyinde (iki atis ayni blogu yontabilsin)",
          /^const sertHasar = new Map\(\);/m.test(src));
  kontrol("sadece merkez sayiliyor", /if \(!n\.merkez\) continue;/.test(src));
  kontrol("delme listesi vurus tickinde tazeleniyor",
          /delinecek = delmeListesi\(b, y\);/.test(src));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> lazer delmesi calisiyor");
process.exit(hata ? 1 : 0);
