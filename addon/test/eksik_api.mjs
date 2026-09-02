/* Hukum sayaci: asagidaki satirlar "✗" yazdiginda test
   DUSMELI. Once yalnizca ekrana yaziyordu.                  */
let carpiSayisi = 0;
const eskiLog = console.log;
console.log = (...a) => {
  const metin = a.join(" ");
  if (metin.includes("✗") || metin.includes("HAYIR")) carpiSayisi++;
  eskiLog(...a);
};
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, itemUseTetikle, world, _durum } from "@minecraft/server";

// ESKI API SIMULASYONU: playerSpawn ve playerLeave yok,
// isValid METOT (property degil), Date.now yok.
delete world.afterEvents.playerSpawn;
delete world.afterEvents.playerLeave;
const gercekDate = globalThis.Date;
globalThis.Date = undefined;

const kayit = [];
const w = console.warn;
console.warn = (...a) => kayit.push(a.join(" "));
let yuklendi = true;
try {
  await import("./pack/main.js");
} catch (e) {
  yuklendi = false;
  console.warn = w;
  console.log("SCRIPT YUKLENEMEDI: " + e.message);
}
console.warn = w;
globalThis.Date = gercekDate;

console.log("1) Script yuklendi mi          : " + (yuklendi ? "EVET" : "HAYIR"));
console.log("2) Eksik olay uyarilari:");
for (const k of kayit.filter(x => x.includes("UYARI") || x.includes("KRITIK"))) console.log("     " + k);

if (yuklendi) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0.707, y: 0, z: 0.707 }, { x: 0.5, y: 100.6, z: 0.5 });
  o.id = "eski-api";
  // isValid'i METOT yap (eski API semantigi)
  Object.defineProperty(o, "isValid", { value: () => true, writable: true, configurable: true });
  console.warn = () => {};
  itemUseTetikle({ source: o, itemStack: { typeId: "minecraft:clay_ball" } });
  tickIlerlet(400);
  console.warn = w;
  console.log("3) isValid METOT iken toprak topu calisti mi : " +
    (D.sayac.setType > 1000 ? "EVET (" + D.sayac.setType + " blok, patlama " + D.sayac.patlama.length + ")" : "HAYIR (" + D.sayac.setType + " blok)"));

  // isValid metot ve FALSE dondururse is durmali
  const D2 = dunyaKur();
  const o2 = oyuncuKur(D2.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 100.6, z: 0.5 });
  o2.id = "gecersiz";
  let sayac = 0;
  Object.defineProperty(o2, "isValid", { value: () => (++sayac < 3), writable: true, configurable: true });
  console.warn = () => {};
  itemUseTetikle({ source: o2, itemStack: { typeId: "minecraft:clay_ball" } });
  tickIlerlet(400);
  console.warn = w;
  console.log("4) isValid false donunce is durdu mu         : " +
    (D2.sayac.setType < 300 ? "EVET (" + D2.sayac.setType + " blok yazildi, erken durdu)" : "HAYIR (" + D2.sayac.setType + " blok)"));
}

/* GENEL TARAMA (v7.9.3) -- CIKIS KODU EKLENDI.
   Bu dosya hukmunu METIN olarak yaziyor ve HER ZAMAN 0 ile
   cikiyordu. kos.sh cikis koduna bakiyor, ekrana ne yazildigina
   degil; yani bu test dusse bile takim YESIL yanardi. Ayni
   sessizlik kol.mjs'te gercekten yasandi: silinmis kollari
   sinamaya devam ediyordu, "SORUN VAR" yaziyordu ve kimse
   gormemisti.                                                 */
console.log = eskiLog;
console.log(carpiSayisi > 0
  ? ">>> " + carpiSayisi + " SINAMA KALDI"
  : ">>> hepsi gecti");
process.exit(carpiSayisi > 0 ? 1 : 0);
