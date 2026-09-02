import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { eskiToprakTopu } from "./eski.mjs";
import { tickIlerlet, itemUseTetikle } from "@minecraft/server";
const eskiWarn = console.warn; console.warn = () => {};
await import("./pack/main.js");
console.warn = eskiWarn;

// Sinira TEGET gecen yonler: carpmaVarMi tripwire'i tetiklenmeden
// kurenin bir dilimi dunya disinda kaliyor mu?
const senaryolar = [
  ["tavanda tam yatay",    { x: 1, y: 0, z: 0 },            { x: 0.5, y: 318.5, z: 0.5 }],
  ["tavana cok hafif egik",{ x: 0.995, y: 0.0998, z: 0 },   { x: 0.5, y: 315.5, z: 0.5 }],
  ["tavanin 1 alti yatay", { x: 1, y: 0, z: 0 },            { x: 0.5, y: 317.5, z: 0.5 }],
  ["tabanda tam yatay",    { x: 1, y: 0, z: 0 },            { x: 0.5, y: -62.5, z: 0.5 }],
  ["tabana cok hafif egik",{ x: 0.995, y: -0.0998, z: 0 },  { x: 0.5, y: -59.5, z: 0.5 }],
];

console.log("senaryo                | eski istisna | yeni istisna | eski setType | yeni setType | esitlik");
console.log("-".repeat(100));
let sira = 100, hata = false;
for (const [ad, bakis, bas] of senaryolar) {
  sira++;
  const A = dunyaKur(); const oyA = oyuncuKur(A.boyut, bakis, bas);
  eskiToprakTopu(A.boyut, oyA);

  const B = dunyaKur(); const oyB = oyuncuKur(B.boyut, bakis, bas); oyB.id = "o" + sira;
  console.warn = () => {};
  itemUseTetikle({ source: oyB, itemStack: { typeId: "minecraft:clay_ball" } });
  tickIlerlet(600);
  console.warn = eskiWarn;

  const a = A.imza(), b = B.imza();
  const ayni = a.length === b.length && a.every((v, i) => v === b[i]);
  if (!ayni) hata = true;
  console.log(ad.padEnd(22) + " | " + String(A.sayac.istisna).padStart(12) + " | " + String(B.sayac.istisna).padStart(12) +
    " | " + String(A.sayac.setType).padStart(12) + " | " + String(B.sayac.setType).padStart(12) + " | " + (ayni ? "ayni" : "FARKLI"));
  if (!ayni) {
    const sa = a.filter(v => !b.includes(v)), sb = b.filter(v => !a.includes(v));
    console.log("   sadece eski (" + sa.length + "): " + sa.slice(0,8).join(" "));
    console.log("   sadece yeni (" + sb.length + "): " + sb.slice(0,8).join(" "));
  }
}
console.log("");
console.log(hata ? ">>> SINIR SENARYOLARINDA FARK VAR" : ">>> sinir senaryolarinda da esit");

/* GENEL TARAMA (v7.9.3) -- CIKIS KODU EKLENDI.
   Bu dosya hukmunu METIN olarak yaziyordu ve HER ZAMAN 0 ile
   cikiyordu. kos.sh cikis koduna bakiyor; yani bu test
   ">>> SINIR SENARYOLARINDA FARK VAR" yazsa bile takim YESIL yanardi.
   Sessizce gecen bir test, olmayan bir testten daha kotudur --
   var oldugu icin kimse yerine yenisini yazmaz.               */
process.exit(hata ? 1 : 0);
