let hataVar = false;
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, itemUseTetikle, _durum } from "@minecraft/server";
const eskiWarn = console.warn; let kayit = [];
console.warn = (...a) => kayit.push(a.join(" "));
await import("./pack/main.js");
console.warn = eskiWarn;

const BUTCE = 28;

function kos(oyuncuSayisi, esya, etiket) {
  const D = dunyaKur();
  const oyuncular = [];
  for (let i = 0; i < oyuncuSayisi; i++) {
    const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 100.6 + i * 40, z: 0.5 + i * 40 });
    o.id = etiket + "-oyuncu-" + i;
    oyuncular.push(o);
  }
  kayit = []; console.warn = (...a) => kayit.push(a.join(" "));
  for (const o of oyuncular) itemUseTetikle({ source: o, itemStack: { typeId: esya } });

  let maksTick = 0, oncekiSet = 0, maksDogum = 0, oncekiDogum = 0, dolu = 0, toplamTick = 0;
  for (let t = 0; t < 900; t++) {
    tickIlerlet(1);
    const d = D.sayac.setType - oncekiSet; oncekiSet = D.sayac.setType;
    const dd = D.sayac.dogan.length - oncekiDogum; oncekiDogum = D.sayac.dogan.length;
    if (d > maksTick) maksTick = d;
    if (dd > maksDogum) maksDogum = dd;
    if (d > 0 || dd > 0) toplamTick++;
    if (d >= BUTCE) dolu++;
  }
  console.warn = eskiWarn;
  return { maksTick, maksDogum, toplamSet: D.sayac.setType, toplamDogum: D.sayac.dogan.length, aktifTick: toplamTick, dolu };
}

console.log("=== TOPRAK TOPU: tick basina blok tavani (butce=" + BUTCE + ") ===");
console.log("oyuncu | maks blok/tick | toplam blok | aktif tick | tavan tuttu mu");
for (const n of [1, 2, 4, 8]) {
  const r = kos(n, "minecraft:clay_ball", "top" + n);
  console.log(String(n).padStart(6) + " | " + String(r.maksTick).padStart(14) + " | " + String(r.toplamSet).padStart(11) +
    " | " + String(r.aktifTick).padStart(10) + " | " + (r.maksTick <= BUTCE ? "EVET" : "HAYIR (" + r.maksTick + ")"));
  if (r.maksTick > BUTCE) hataVar = true;
}

console.log("");
console.log("=== TNT: tick basina varlik tavani (butce=4) ===");
console.log("oyuncu | maks dogum/tick | toplam dogum | tavan tuttu mu");
for (const n of [1, 2, 4]) {
  const r = kos(n, "minecraft:nether_star", "tnt" + n);
  console.log(String(n).padStart(6) + " | " + String(r.maksDogum).padStart(15) + " | " + String(r.toplamDogum).padStart(12) +
    " | " + (r.maksDogum <= 4 ? "EVET" : "HAYIR (" + r.maksDogum + ")"));
  if (r.maksDogum > 4) hataVar = true;
}

console.log("");
console.log("=== Oyuncu basina tek aktif efekt ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 100.6, z: 0.5 });
  o.id = "tekli";
  console.warn = () => {};
  itemUseTetikle({ source: o, itemStack: { typeId: "minecraft:clay_ball" } });
  tickIlerlet(15);
  // ust uste 5 kez daha tetikle
  for (let i = 0; i < 5; i++) { itemUseTetikle({ source: o, itemStack: { typeId: "minecraft:clay_ball" } }); tickIlerlet(1); }
  tickIlerlet(600);
  console.warn = eskiWarn;
  const beklenen = 1342;
  console.log("6 kez ust uste tetiklendi -> toplam setType: " + D.sayac.setType +
    " (tek atis = " + beklenen + ") -> " + (D.sayac.setType === beklenen ? "TEK EFEKT, dogru" : "BIRDEN FAZLA EFEKT CALISTI"));
  if (D.sayac.setType !== beklenen) hataVar = true;
  console.log("patlama sayisi: " + D.sayac.patlama.length + " (1 olmali)");
}

console.log("");
console.log("=== Oyuncu ayrilinca is iptal ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 100.6, z: 0.5 });
  o.id = "ayrilan";
  console.warn = () => {};
  itemUseTetikle({ source: o, itemStack: { typeId: "minecraft:clay_ball" } });
  tickIlerlet(30);
  const yarida = D.sayac.setType;
  for (const cb of _durum.playerLeaveCb) cb({ playerId: "ayrilan", playerName: "ayrilan" });
  tickIlerlet(400);
  console.warn = eskiWarn;
  console.log("ayrilma anindaki setType: " + yarida + " | 400 tick sonra: " + D.sayac.setType +
    " -> " + (D.sayac.setType === yarida ? "IS DURDU, dogru" : "IS DEVAM ETTI (+" + (D.sayac.setType - yarida) + ")"));
  if (D.sayac.setType !== yarida) hataVar = true;
}

/* GENEL TARAMA (v7.9.3) -- CIKIS KODU EKLENDI.
   Bu dosya hukmunu METIN olarak yaziyor ve HER ZAMAN 0 ile
   cikiyordu. kos.sh cikis koduna bakiyor, ekrana ne yazildigina
   degil; yani bu test dusse bile takim YESIL yanardi. Ayni
   sessizlik kol.mjs'te gercekten yasandi: silinmis kollari
   sinamaya devam ediyordu, "SORUN VAR" yaziyordu ve kimse
   gormemisti.                                                 */
console.log(hataVar ? ">>> BUTCE SORUNU VAR" : ">>> butce sinirlari korunuyor");
process.exit(hataVar ? 1 : 0);
