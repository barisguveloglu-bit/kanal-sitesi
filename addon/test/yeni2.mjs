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
import { tickIlerlet, _durum } from "@minecraft/server";
const w = console.warn; console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

// sira: 10 halka, 20 yon, 30 alan, 40 tnt, 50 top, 60 savur, 70 ucus, 80 gtnt, 90 meteor
function kosJest(D, o, kacKere, tick = 400) {
  _durum.oyuncular = [o];
  o.isSneaking = true;
  const bakis = o.getViewDirection();
  for (let k = 0; k < kacKere; k++) {
    o.getViewDirection = () => ({x:0,y:1,z:0});
    sus(); tickIlerlet(16); ac();
    o.getViewDirection = () => bakis;
    sus(); tickIlerlet(8); ac();
  }
  const secim = (o.onScreenDisplay._son||"").replace(/§./g,"").replace("» ","").split(" (")[0];
  o.isJumping = true; sus(); tickIlerlet(8); ac(); o.isJumping = false;
  sus(); tickIlerlet(tick); ac();
  return secim;
}

console.log("=== UCUS ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "uc";
  const secim = kosJest(D, o, 6, 60);
  const ef = D.boyut._efektler || [];
  console.log("  secili: " + secim);
  for (const e of ef) console.log("  efekt: " + e.ad + " sure=" + e.sure + " tick (" + (e.sure/20).toFixed(1) + " sn)");
  console.log("  levitation var mi: " + (ef.some(e=>e.ad==="levitation") ? "✓" : "✗"));
  console.log("  slow_falling var mi: " + (ef.some(e=>e.ad==="slow_falling") ? "✓ (dusup olmeyesin diye)" : "✗"));
}

console.log("");
console.log("=== GUCLU TNT ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0.8, y: 0.2, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "gt";
  const secim = kosJest(D, o, 7, 200);
  const tnt = D.sayac.dogan.filter(d=>d.tip==="minecraft:tnt");
  console.log("  secili: " + secim);
  console.log("  dogan TNT: " + tnt.length + " (1 olmali)");
  console.log("  firlatildi mi: " + (D.sayac.varliklar[0] && D.sayac.varliklar[0]._itildi ? "✓ impulse verildi" : "✗"));
  console.log("  vanilla TNT kaldirildi mi: " + (D.sayac.kaldirilan === 1 ? "✓ (cift patlama olmasin diye)" : "✗ " + D.sayac.kaldirilan));
  console.log("  patlama: " + D.sayac.patlama.length + " adet, guc " + (D.sayac.patlama[0]||{}).guc + " (vanilla TNT = 4)");
}

console.log("");
console.log("=== METEOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0.8, y: -0.3, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "mt";
  const secim = kosJest(D, o, 8, 300);
  const sim = D.sayac.dogan.filter(d=>d.tip==="minecraft:lightning_bolt").length;
  console.log("  secili: " + secim);
  console.log("  yildirim: " + sim + " | patlama: " + D.sayac.patlama.length + " (6/6 olmali)");
  console.log("  patlama gucu: " + (D.sayac.patlama[0]||{}).guc);
}

console.log("");
console.log("=== PATLAMA BUTCESI TAVANI (tick basina 1) ===");
{
  const D = dunyaKur();
  const oyuncular = [];
  for (let i = 0; i < 4; i++) {
    const p = oyuncuKur(D.boyut, { x: 0.8, y: -0.3, z: 0 }, { x: 0.5 + i*30, y: 90.6, z: 0.5 });
    p.id = "pat" + i; p.isSneaking = true;
    oyuncular.push(p);
  }
  _durum.oyuncular = oyuncular;
  // hepsini meteora getir
  for (const p of oyuncular) {
    for (let k = 0; k < 8; k++) {
      p.getViewDirection = () => ({x:0,y:1,z:0});
      sus(); tickIlerlet(16); ac();
      p.getViewDirection = () => ({x:0.8,y:-0.3,z:0});
      sus(); tickIlerlet(8); ac();
    }
  }
  for (const p of oyuncular) p.isJumping = true;
  sus(); tickIlerlet(8); ac();
  for (const p of oyuncular) p.isJumping = false;
  let maksTick = 0, onceki = 0;
  for (let t = 0; t < 600; t++) {
    sus(); tickIlerlet(1); ac();
    const d = D.sayac.patlama.length - onceki; onceki = D.sayac.patlama.length;
    if (d > maksTick) maksTick = d;
  }
  console.log("  4 oyuncu ayni anda meteor: toplam " + D.sayac.patlama.length + " patlama");
  console.log("  tick basina EN FAZLA: " + maksTick + " (tavan 1) " + (maksTick <= 1 ? "✓" : "✗"));
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
