/* Esyasiz jest semasi (guncel):
     egil + yukari bak, tut  -> yetenek DEGISTIR (tetiklemez)
     egil + zipla            -> secili yetenegi CALISTIR
     egil + asagi bak, tut   -> kollari envantere koy (kol2.mjs'te)

   Bu dosya eskiden "yukari bak = tetikle" semasini sinıyordu; sema
   degisince beklentiler guncellendi.                                */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

function kur(bakis, egilik) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, bakis, { x: 0.5, y: 65.6, z: 0.5 });
  o.id = "es-" + Math.random();
  o.isSneaking = egilik;
  _durum.oyuncular = [o];
  return { D, o };
}

const say = (D) => D.sayac.dogan.filter((d) => d.tip === "minecraft:lightning_bolt").length;

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== YUKARI BAKMAK TETIKLEMEZ, SADECE SECIM DEGISTIRIR ===");
for (const [ad, bakis, egilik] of [
  ["yukari bak + egil", { x: 0, y: 1, z: 0 }, true],
  ["yukari bak, egilme yok", { x: 0, y: 1, z: 0 }, false],
  ["duz bak + egil", { x: 1, y: 0, z: 0 }, true],
  ["cok yukari(.95) + egil", { x: 0.312, y: 0.95, z: 0 }, true]
]) {
  const { D } = kur(bakis, egilik);
  sus(); tickIlerlet(120); ac();
  kontrol(ad.padEnd(24) + " -> tetiklenmedi", say(D) === 0, say(D) + " yildirim");
}

{
  const { D, o } = kur({ x: 0, y: 1, z: 0 }, true);
  sus(); tickIlerlet(120); ac();
  kontrol("yukari bakmak actionbar'da secimi gosterdi",
          /»/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);
  kontrol("secim degistirirken yildirim dusmedi", say(D) === 0);
}

console.log("");
console.log("=== ZIPLAMAK CALISTIRIR ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, true);
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(200); ac();
  kontrol("egil + zipla -> varsayilan yetenek (yildirim halkasi) calisti",
          say(D) === 20, say(D) + " yildirim");
}
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, false);   // egilme yok
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(200); ac();
  kontrol("egilmeden ziplamak tetiklemiyor", say(D) === 0, say(D) + " yildirim");
}

console.log("");
console.log("=== YILDIRIM GUVENLIK HALKASI (oyuncuya uzaklik) ===");
{
  const { D, o } = kur({ x: 1, y: 0, z: 0 }, true);
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(200); ac();

  const m = D.sayac.dogan
    .filter((d) => d.tip === "minecraft:lightning_bolt")
    .map((d) => Math.hypot(d.x - o.location.x, d.z - o.location.z));

  const enYakin = Math.min(...m);
  const enUzak = Math.max(...m);
  console.log("  yildirim sayisi: " + m.length);
  kontrol("en yakin >= 6 blok (kendi yildiriminla olmeyesin)",
          enYakin >= 6, enYakin.toFixed(2) + " blok");
  kontrol("en uzak <= 14 blok", enUzak <= 14, enUzak.toFixed(2) + " blok");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum esyasiz jest testleri gecti");
process.exit(hata ? 1 : 0);
