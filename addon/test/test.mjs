import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { eskiToprakTopu } from "./eski.mjs";
import { tickIlerlet, itemUseTetikle, _durum } from "@minecraft/server";

// Yeni kodu yukle (abonelikleri kurar)
const kayitlar = [];
const eskiWarn = console.warn;
console.warn = (...a) => kayitlar.push(a.join(" "));
await import("./pack/main.js");

const senaryolar = [
  ["duz yatay",        { x: 1, y: 0, z: 0 },                       { x: 0.5, y: 100.6, z: 0.5 }],
  ["capraz yatay",     { x: 0.7071, y: 0, z: 0.7071 },             { x: 0.5, y: 100.6, z: 0.5 }],
  ["hafif yukari",     { x: 0.8, y: 0.6, z: 0 },                   { x: 0.5, y: 100.6, z: 0.5 }],
  ["asagi egik",       { x: 0.6, y: -0.8, z: 0 },                  { x: 0.5, y: 100.6, z: 0.5 }],
  ["3B capraz",        { x: 0.5345, y: 0.2673, z: 0.8018 },        { x: 8.3, y: 90.2, z: -4.7 }],
  ["dik yukari",       { x: 0, y: 1, z: 0 },                       { x: 0.5, y: 100.6, z: 0.5 }],
  ["yere dogru (carpma)", { x: 0.1, y: -0.995, z: 0 },             { x: 0.5, y: 70.6, z: 0.5 }],
  ["tavan sinirina",   { x: 0.1, y: 0.995, z: 0 },                 { x: 0.5, y: 300.6, z: 0.5 }]
];

let hataVar = false;
console.warn = eskiWarn;
console.log("senaryo               | eski blok islemi | yeni blok islemi | kazanc | eski istisna | yeni istisna | durum");
console.log("-".repeat(118));

let sira = 0;
for (const [ad, bakis, bas] of senaryolar) {
  sira++;
  // --- ESKI ---
  const A = dunyaKur();
  const oyA = oyuncuKur(A.boyut, bakis, bas);
  eskiToprakTopu(A.boyut, oyA);

  // --- YENI (gercek dosya) ---
  const B = dunyaKur();
  const oyB = oyuncuKur(B.boyut, bakis, bas);
  oyB.id = "oyuncu-" + sira;
  kayitlar.length = 0;
  console.warn = (...a) => kayitlar.push(a.join(" "));
  itemUseTetikle({ source: oyB, itemStack: { typeId: "minecraft:clay_ball" } });
  tickIlerlet(600);
  console.warn = eskiWarn;

  const imzaA = A.imza(), imzaB = B.imza();
  const ayni = imzaA.length === imzaB.length && imzaA.every((v, i) => v === imzaB[i]);

  const patA = A.sayac.patlama[0], patB = B.sayac.patlama[0];
  const patAyni = !!patA && !!patB &&
    Math.abs(patA.x - patB.x) < 1e-9 && Math.abs(patA.y - patB.y) < 1e-9 && Math.abs(patA.z - patB.z) < 1e-9;

  const durum = (ayni ? "" : "BLOK FARKI ") + (patAyni ? "" : "PATLAMA FARKI ") || "ayni";
  if (!ayni || !patAyni) hataVar = true;

  const eskiIs = A.sayac.setType, yeniIs = B.sayac.setType;
  const kazanc = eskiIs > 0 ? ((1 - yeniIs / eskiIs) * 100).toFixed(0) + "%" : "-";

  console.log(
    ad.padEnd(21) + " | " + String(eskiIs).padStart(16) + " | " + String(yeniIs).padStart(16) +
    " | " + kazanc.padStart(6) + " | " + String(A.sayac.istisna).padStart(12) +
    " | " + String(B.sayac.istisna).padStart(12) + " | " + durum
  );

  if (!ayni) {
    const sadeceA = imzaA.filter(v => !imzaB.includes(v));
    const sadeceB = imzaB.filter(v => !imzaA.includes(v));
    console.log("    sadece ESKI'de (" + sadeceA.length + "): " + sadeceA.slice(0, 6).join(" "));
    console.log("    sadece YENI'de (" + sadeceB.length + "): " + sadeceB.slice(0, 6).join(" "));
  }
  if (!patAyni) console.log("    patlama eski=" + JSON.stringify(patA) + " yeni=" + JSON.stringify(patB));
}

console.log("");
console.log(hataVar ? ">>> ESITLIK BOZUK" : ">>> TUM SENARYOLARDA ESKI VE YENI SONUC AYNI");

/* GENEL TARAMA (v7.9.3) -- CIKIS KODU EKLENDI.
   Bu dosya hukmunu METIN olarak yaziyordu ve HER ZAMAN 0 ile
   cikiyordu. kos.sh cikis koduna bakiyor; yani bu test
   ">>> ESITLIK BOZUK" yazsa bile takim YESIL yanardi.
   Sessizce gecen bir test, olmayan bir testten daha kotudur --
   var oldugu icin kimse yerine yenisini yazmaz.               */
process.exit(hataVar ? 1 : 0);
