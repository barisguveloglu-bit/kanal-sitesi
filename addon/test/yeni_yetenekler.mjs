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

function mobKur(D, n, merkez) {
  const m = [];
  for (let i = 0; i < n; i++) m.push({
    id: "mob" + i, typeId: "minecraft:zombie", isValid: true,
    location: { x: merkez.x + 2 + i * 2, y: merkez.y, z: merkez.z },
    applyDamage: () => true,
    applyImpulse(v) { this._itildi = v; },
    applyKnockback() { this._itildi = "knockback"; }
  });
  D.boyut.getEntities = () => m;
  return m;
}

console.log("=== SAVUR (baktigini ucur) ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "sav"; o.isSneaking = true;
  const moblar = mobKur(D, 4, { x: 0.5, y: 89, z: 0.5 });
  _durum.oyuncular = [o];
  sus(); itemUseYok(); ac();
  function itemUseYok(){}
  // dogrudan jestle: egil + zipla, secim savur olana kadar degistir
  let secim = "";
  for (let k = 0; k < 5; k++) {   // savur sirada 6. (indeks 5)
    o.getViewDirection = () => ({x:0,y:1,z:0});
    sus(); tickIlerlet(16); ac();
    o.getViewDirection = () => ({x:1,y:0,z:0});
    sus(); tickIlerlet(8); ac();
    secim = (o.onScreenDisplay._son||"").replace(/§./g,"");
  }
  console.log("  secili: " + secim.replace("» ","").split(" (")[0]);
  o.isJumping = true; sus(); tickIlerlet(8); ac(); o.isJumping = false;
  sus(); tickIlerlet(40); ac();
  const itilen = moblar.filter(m => m._itildi).length;
  console.log("  onundeki 4 mobdan itilen: " + itilen + (itilen > 0 ? " ✓" : " ✗"));
  if (moblar[0]._itildi) console.log("  itme vektoru: x=" + moblar[0]._itildi.x.toFixed(2) + " y=" + moblar[0]._itildi.y.toFixed(2) + " z=" + moblar[0]._itildi.z.toFixed(2));
}

console.log("");
console.log("=== SAVUR: arkadakiler etkilenmemeli ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "sav2"; o.isSneaking = true;
  const arka = [{
    id: "arka", typeId: "minecraft:zombie", isValid: true,
    location: { x: -8, y: 89, z: 0.5 },     // TAM ARKADA
    applyDamage: () => true, applyImpulse(v){ this._itildi = v; }
  }];
  D.boyut.getEntities = () => arka;
  _durum.oyuncular = [o];
  for (let k = 0; k < 5; k++) {
    o.getViewDirection = () => ({x:0,y:1,z:0});
    sus(); tickIlerlet(16); ac();
    o.getViewDirection = () => ({x:1,y:0,z:0});
    sus(); tickIlerlet(8); ac();
  }
  o.isJumping = true; sus(); tickIlerlet(8); ac(); o.isJumping = false;
  sus(); tickIlerlet(40); ac();
  console.log("  arkadaki mob itildi mi: " + (arka[0]._itildi ? "EVET ✗" : "hayir ✓"));
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
