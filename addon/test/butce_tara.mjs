import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { eskiToprakTopu } from "./eski.mjs";
import fs from "fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const kaynak = fs.readFileSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/main.js", "utf8");

// Rastgele ama tekrarlanabilir yonler
let tohum = 12345;
const rnd = () => { tohum = (tohum * 1103515245 + 12345) & 0x7fffffff; return tohum / 0x7fffffff; };
const yonler = [];
for (let i = 0; i < 120; i++) {
  const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  yonler.push({ x: s * Math.cos(th), y: u, z: s * Math.sin(th) });
}

console.log("butce | ort ucus | maks ucus | 62 tick'te kalan | ort blok | maks blok/tick | orijinale gore");
console.log("-".repeat(104));

for (const butce of [20, 24, 26, 28, 30, 32, 40]) {
  const yol = "./tara_" + butce + ".js";
  fs.writeFileSync(yol, kaynak
    .replace("const TICK_BLOK_BUTCESI = 24;", "const TICK_BLOK_BUTCESI = " + butce + ";")
    .replace("const OLCUM_SOHBETE = true;", "const OLCUM_SOHBETE = false;")
    .replace("const HATA_SOHBETE  = true;", "const HATA_SOHBETE  = false;"));

  // Her butce icin taze modul + taze sahte motor
  const motorYol = "./node_modules/@minecraft/server/index.js";
  const motor = await import(motorYol + "?b=" + butce);
  const w = console.warn; console.warn = () => {};
  await import(yol + "?b=" + butce);
  console.warn = w;

  let sureTop = 0, sureMaks = 0, zamaninda = 0, blokTop = 0, maksTick = 0;
  for (let i = 0; i < yonler.length; i++) {
    const D = dunyaKur();
    const o = oyuncuKur(D.boyut, yonler[i], { x: 0.5, y: 150.6, z: 0.5 });
    o.id = "b" + butce + "-" + i;
    console.warn = () => {};
    motor.itemUseTetikle({ source: o, itemStack: { typeId: "minecraft:clay_ball" } });
    let ilk = -1, son = -1, onceki = 0;
    for (let t = 0; t < 500; t++) {
      motor.tickIlerlet(1);
      const d = D.sayac.setType - onceki; onceki = D.sayac.setType;
      if (d > 0) { if (ilk < 0) ilk = motor._durum.tick; son = motor._durum.tick; if (d > maksTick) maksTick = d; }
    }
    console.warn = w;
    const sure = son - ilk + 1;
    sureTop += sure; if (sure > sureMaks) sureMaks = sure;
    if (sure <= 62) zamaninda++;
    blokTop += D.sayac.setType;
  }
  const n = yonler.length;
  console.log(
    String(butce).padStart(5) + " | " + (sureTop / n).toFixed(1).padStart(8) + " | " +
    String(sureMaks).padStart(9) + " | " + (zamaninda + "/" + n).padStart(16) + " | " +
    (blokTop / n).toFixed(0).padStart(8) + " | " + String(maksTick).padStart(14) + " | " +
    "blok %" + (100 - (blokTop / n / 1980 * 100)).toFixed(0) + " az, tepe yuk %" + (100 - maksTick / 33 * 100).toFixed(0) + " az"
  );
}
console.log("");
console.log("Orijinal: ucus 62 tick, atis basina 1980 blok, tepe yuk 33 blok/tick");
