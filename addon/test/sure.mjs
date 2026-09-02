import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, itemUseTetikle, _durum } from "@minecraft/server";
const w = console.warn; console.warn = () => {};
await import("./yeni.js");
console.warn = w;

// Yeni kodda ucusun kac tick surdugunu, ilk ve son blok yaziminin
// tick farkindan olcuyoruz. Orijinal: 30 adim x 2 tick + son temizlik = 62 tick.
function olc(butceEtiketi, bakis) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, bakis, { x: 0.5, y: 100.6, z: 0.5 });
  o.id = "sure-" + butceEtiketi + "-" + Math.random();
  console.warn = () => {};
  itemUseTetikle({ source: o, itemStack: { typeId: "minecraft:clay_ball" } });
  let ilk = -1, son = -1, onceki = 0, maksTick = 0;
  for (let t = 0; t < 900; t++) {
    tickIlerlet(1);
    const d = D.sayac.setType - onceki; onceki = D.sayac.setType;
    if (d > 0) { if (ilk < 0) ilk = _durum.tick; son = _durum.tick; if (d > maksTick) maksTick = d; }
    if (D.sayac.patlama.length > 0 && son > 0 && _durum.tick > son + 5) break;
  }
  console.warn = w;
  return { sure: son - ilk + 1, maksTick, toplam: D.sayac.setType };
}

console.log("ORIJINAL ucus suresi: 62 tick (30 adim x 2 tick + son temizlik)");
console.log("");
console.log("yon              | yeni ucus suresi | fark      | maks blok/tick");
for (const [ad, b] of [
  ["duz yatay", { x: 1, y: 0, z: 0 }],
  ["capraz yatay", { x: 0.707, y: 0, z: 0.707 }],
  ["3B capraz", { x: 0.5345, y: 0.2673, z: 0.8018 }],
]) {
  const r = olc("a", b);
  const fark = r.sure - 62;
  console.log(ad.padEnd(16) + " | " + String(r.sure).padStart(16) + " | " +
    (fark >= 0 ? "+" : "") + String(fark).padStart(3) + " tick" + (fark > 0 ? " (%" + ((fark/62)*100).toFixed(0) + " yavas)" : "") +
    " | " + String(r.maksTick).padStart(14));
}
