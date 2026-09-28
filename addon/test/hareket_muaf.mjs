/* HAREKET MUAFIYETI -- AC-KAPA VE WoM ACIGI                     v7.99.4

   Savunma taramasi buldu: hareket denetimi "kendi isi var" diyen
   oyuncuyu hiz, sicrama, yukselme ve kati blok olcumlerinin HEPSINDEN
   muaf tutuyor. Ac-kapa yetenekler (Toprak Izi, Savunma Kipi...)
   isini kapatilana kadar acik tutuyor: Toprak Izi'ni acan biri ucma
   ya da duvardan gecme hilesiyle gozcunun disinda kaliyordu. WoM
   kilici da aktif vurus suresince (yerinde vursa bile) muaf
   tutuyordu.

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Ac-kapa bir is muafiyet VERMIYOR; suren (ac-kapa olmayan) is
      veriyor; is yoksa yok.
   2. Uctan uca: Toprak Izi acikken ucma hilesi YAKALANIYOR.
   3. WoM: yerinde vuran vurus muaf tutmuyor; tasiyan vurus yalniz
      izi suresince tutuyor.                                       */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, sohbetTetikle, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
const M = await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const gozcu = await import("./pack/yetenekler/gozcu.js");
const W = await import("./pack/yetenekler/wom_kilic.js");
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const HAREKET = JSON.parse(readFileSync(KOK + "/kaynak_anim/wom/wom_kilic.hareket.json", "utf8")).setler;

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 64, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar() {}, setTitle() {} };
  o.hasTag = () => true;
  o.getTags = () => [];
  _durum.oyuncular = [o];
  D.boyut._varliklar = [o];
  return o;
}
const tetikle = (o, k) => { sus(); sohbetTetikle(o, "yetenek " + k); tickIlerlet(ayar.KOL_GECIKME + 2); ac(); };

console.log("=== 1. AC-KAPA IS MUAF TUTMUYOR, SUREN IS TUTUYOR ===");
{
  kayit.yetenekKaydet({ kimlik: "t_suren_is", ad: "Test Suren", esyasiz: true, sira: 99997,
                        olustur: (o) => ({ ad: "t_suren_is", oyuncuId: o.id, calis() { return false; } }) });
  const o = kur("hm1");
  kontrol("is yokken muaf degil", M.hareketMuafIsVarMi("hm1") === false);
  tetikle(o, "toprak_izi");
  kontrol("  Toprak Izi (ac-kapa) acik", kayit.yetenekAl("toprak_izi").acKapa === true);
  kontrol("ac-kapa is acikken MUAF DEGIL", M.hareketMuafIsVarMi("hm1") === false);
  tetikle(o, "t_suren_is");
  kontrol("suren (ac-kapa olmayan) is acikken muaf", M.hareketMuafIsVarMi("hm1") === true);
  tetikle(o, "toprak_izi");
}

console.log("\n=== 2. UCTAN UCA: TOPRAK IZI ACIKKEN HIZ HILESI YAKALANIYOR ===");
{
  const o = kur("hm2");
  tetikle(o, "toprak_izi");
  /* Gozcu testindeki temiz oyuncu: binme, efekt, suzulme yok. */
  Object.assign(o, { isGliding: false, isFlying: false, isInWater: false, isClimbing: false,
                     isFalling: false, getEffect: () => undefined, getComponent: () => undefined,
                     location: { x: 0, y: 64, z: 0 } });
  const olc = (muaf) => {
    gozcu.gozcuUnut(); gozcu.hareketUnut(); _durum.sohbet.length = 0;
    o.location = { x: 0, y: 64, z: 0 };
    for (let i = 0; i < ayar.GOZCU_ESIK + 2; i++) {
      gozcu.hareketTara([o], muaf);
      tickIlerlet(ayar.HAREKET_ORNEK);
      o.location = { x: 0, y: 64, z: o.location.z + 10 };   // 20 blok/sn
    }
    const d = gozcu.gozcuDurum(o.id);
    return d ? d.isaret : 0;
  };
  const yeni = olc((k) => M.hareketMuafIsVarMi(k));
  kontrol("Toprak Izi acikken hiz hilesi YAKALANDI", yeni >= ayar.GOZCU_ESIK, yeni + " isaret");
  /* Eski muafiyet (is SAYISI) ayni durumda hic olcmuyordu. */
  const eski = olc(() => true);
  kontrol("  karsilastirma: eski toptan muafiyet yakalamiyordu", eski === 0, eski + " isaret");
  tetikle(o, "toprak_izi");
}

console.log("\n=== 2b. OYUN KIPI VE BLOK HIZI AYNI KURALDA ===");
{
  const ana = readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");
  kontrol("blok hizi denetimi ayni muafiyeti kullaniyor",
          /blokHizKur\(\(kimlik\) => hareketMuafIsVarMi\(kimlik\)\)/.test(ana));
  /* Oyun kipi muafiyetini hareketTara'dan aliyor: izleyici kipi. */
  const o = kur("hm4");
  tetikle(o, "toprak_izi");
  o._kip = "spectator";
  Object.assign(o, { getGameMode: () => o._kip, setGameMode: (k) => { o._kip = k; },
                     runCommand: () => ({ successCount: 1 }) });
  gozcu.kipUnut("hm4");
  const sonuc = gozcu.kipDenetle(o, (k) => M.hareketMuafIsVarMi(k));
  kontrol("Toprak Izi acikken izleyici kipi YAKALANDI", sonuc !== null, JSON.stringify(sonuc));
  gozcu.kipUnut("hm4");
  kontrol("  karsilastirma: eski muafiyet (is var) dokunmuyordu", gozcu.kipDenetle(o, () => true) === null);
  tetikle(o, "toprak_izi");
}

console.log("\n=== 3. WoM: YERINDE VURUS MUAF DEGIL, TASIYAN YALNIZ IZ BOYUNCA ===");
{
  const hepsi = Object.values(HAREKET).flatMap((s) => s.saldirilar.map((x) => x));
  const tasimaz = hepsi.find((x) => x.iz.every((p) => Math.hypot(p[0], p[1]) <= 0.3 && p[2] <= 0.3));
  kontrol("yerinde vuran bir vurus var (olcum anlamli)", !!tasimaz, tasimaz && tasimaz.anim);
  const o = { id: "hm3", typeId: "minecraft:player", isOnGround: true, isSprinting: false,
              getViewDirection: () => ({ x: 0, y: 0, z: 1 }), playAnimation() {} };
  const setiBul = (anim) => Object.entries(HAREKET).find(([, s]) => s.saldirilar.some((x) => x.anim === anim));
  /* Kayit: vurusu dogrudan kurmak icin setin esyasi. */
  const [set1] = setiBul(tasimaz.anim);
  const esya1 = HAREKET[set1].esyalar[0] ? "pa:wom_" + HAREKET[set1].esyalar[0] : "bos_el";
  /* Serinin dogru adimina gelene kadar salla (hava/kosu degilse). */
  const t0 = 50000;
  let t = t0, bulundu = false;
  for (let i = 0; i < 8 && !bulundu; i++) {
    o.isOnGround = tasimaz.tur !== "hava";
    o.isSprinting = tasimaz.tur === "kosu";
    W.womKilicUnut("hm3");
    for (let j = 0; j <= i; j++) { t += 400; W.womKilicSalla(o, esya1, t); W.womKilicDurum("hm3").sonBitis = t; }
    bulundu = W.womKilicDurum("hm3").aktif && W.womKilicDurum("hm3").aktif.s.anim === tasimaz.anim;
  }
  kontrol("  yerinde vurus kuruldu", bulundu, W.womKilicDurum("hm3").aktif && W.womKilicDurum("hm3").aktif.s.anim);
  kontrol("yerinde vurus suresince MUAF DEGIL", W.womHareketteMi("hm3", t + 2) === false);
  W.womKilicUnut("hm3");
  o.isOnGround = true; o.isSprinting = false;
  W.womKilicSalla(o, "pa:wom_ruine", 90000);
  const iz = W.womKilicDurum("hm3").aktif.s.iz.length;
  kontrol("tasiyan vurus (ruine oto 1) iz boyunca muaf", W.womHareketteMi("hm3", 90000 + 2) === true);
  kontrol("  iz bittikten sonra muaf degil", W.womHareketteMi("hm3", 90000 + iz + 6) === false, "iz " + iz + " tick");
  W.womKilicUnut("hm3");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> hareket muafiyeti dar: ac-kapa ve yerinde vurus hileyi ortmuyor");
process.exit(hata ? 1 : 0);
