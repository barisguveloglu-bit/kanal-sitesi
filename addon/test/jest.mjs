import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
const w = console.warn; console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

const D = dunyaKur();
const o = oyuncuKur(D.boyut, { x: 0, y: 1, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
o.id = "jest-1";
_durum.oyuncular = [o];

function bakis(x,y,z){ o.getViewDirection = () => ({x,y,z}); }
function degistir() {           // egil + tam yukari bak, tut
  o.isSneaking = true; bakis(0,1,0);
  sus(); tickIlerlet(16); ac();
  bakis(1,0,0);                 // durusu boz (tekrar degistirebilmek icin)
  sus(); tickIlerlet(8); ac();
}
function calistir() {           // egil + zipla
  o.isSneaking = true; o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(8); ac();
}

console.log("=== JEST 1: yetenek degistirme (egil + yukari bak) ===");
console.log("  baslangic secim: " + (o.onScreenDisplay._son || "(henuz yok)"));
for (let i = 0; i < 6; i++) {
  degistir();
  console.log("  " + (i+1) + ". degistirme -> " + (o.onScreenDisplay._son || "").replace(/§./g,""));
}

console.log("");
console.log("=== JEST 2: her yetenegi sirayla calistir (egil + zipla) ===");
const beklenen = ["Yildirim Halkasi","Yon Simsegi","Alan Simsegi","TNT Yagmuru","Toprak Topu"];
// secimi basa al
esyasizSifirla();
function esyasizSifirla(){}
let hata = false;
for (let i = 0; i < 5; i++) {
  const D2 = dunyaKur();
  const p = oyuncuKur(D2.boyut, { x: 0.6, y: -0.3, z: 0.74 }, { x: 0.5, y: 90.6, z: 0.5 });
  p.id = "sec-" + i;
  // Alan simsegi icin ortamda mob olmali, yoksa "vurulacak mob yok" der
  const moblar = [];
  for (let m = 0; m < 5; m++) moblar.push({
    id: "mob" + m, isValid: true, applyDamage: () => true,
    location: { x: 3 + m * 2, y: 89, z: 1 }
  });
  D2.boyut.getEntities = () => moblar;
  p.getViewDirection = () => ({ x: 0.6, y: -0.3, z: 0.74 });
  _durum.oyuncular = [p];
  // i kez degistir (0. secim varsayilan)
  for (let k = 0; k < i; k++) {
    p.isSneaking = true; p.getViewDirection = () => ({x:0,y:1,z:0});
    sus(); tickIlerlet(16); ac();
    p.getViewDirection = () => ({ x: 0.6, y: -0.3, z: 0.74 });
    sus(); tickIlerlet(8); ac();
  }
  const secilen = (p.onScreenDisplay._son || "").replace(/§./g,"").replace("» ","").split(" (")[0] || beklenen[0];
  // calistir
  p.isSneaking = true; p.isJumping = true;
  sus(); tickIlerlet(8); ac();
  p.isJumping = false;
  sus(); tickIlerlet(300); ac();

  const bloklar = D2.sayac.setType, dogan = D2.sayac.dogan.length;
  const tnt = D2.sayac.dogan.filter(d=>d.tip==="minecraft:tnt").length;
  const sim = D2.sayac.dogan.filter(d=>d.tip==="minecraft:lightning_bolt").length;
  let sonuc = "";
  if (bloklar > 500) sonuc = bloklar + " blok (toprak topu)";
  else if (tnt > 0)  sonuc = tnt + " TNT";
  else if (sim > 0)  sonuc = sim + " yildirim";
  else sonuc = "HICBIR SEY OLMADI";
  if (sonuc === "HICBIR SEY OLMADI") hata = true;
  console.log("  secim " + (i+1) + " (" + beklenen[i].padEnd(17) + ") -> " + sonuc);
}

console.log("");
console.log("=== JEST 2b: ziplama basili tutulunca tekrarlamamali ===");
{
  const D3 = dunyaKur();
  const p = oyuncuKur(D3.boyut, { x: 1, y: -0.3, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  p.id = "basili"; _durum.oyuncular = [p];
  p.isSneaking = true; p.isJumping = true;   // BIRAKMADAN 400 tick bekle
  sus(); tickIlerlet(400); ac();
  const n = D3.sayac.dogan.filter(d=>d.tip==="minecraft:lightning_bolt").length;
  console.log("  basili tutuldu, 400 tick -> " + n + " yildirim (20 olmali, 40 degil) " + (n===20?"✓":"✗"));
  if (n !== 20) hata = true;
}

console.log("");
console.log("=== JEST 3: yanlislikla tetiklenme kontrolu ===");
{
  const D4 = dunyaKur();
  const p = oyuncuKur(D4.boyut, { x: 0, y: 1, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  p.id = "kaza"; _durum.oyuncular = [p];
  p.isSneaking = false; p.isJumping = true;   // egilmeden zipla
  sus(); tickIlerlet(100); ac();
  const n1 = D4.sayac.dogan.length + D4.sayac.setType;
  console.log("  egilmeden zipla        -> " + (n1===0 ? "tetiklenmedi ✓" : "TETIKLENDI ✗"));
  if (n1 !== 0) hata = true;

  p.isJumping = false; p.isSneaking = false;
  sus(); tickIlerlet(100); ac();
  const n2 = D4.sayac.dogan.length + D4.sayac.setType;
  console.log("  egilmeden yukari bak   -> " + (n2===0 ? "tetiklenmedi ✓" : "TETIKLENDI ✗"));
  if (n2 !== 0) hata = true;
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum jest testleri gecti");

/* GENEL TARAMA (v7.9.3) -- CIKIS KODU EKLENDI.
   Bu dosya hukmunu METIN olarak yaziyordu ve HER ZAMAN 0 ile
   cikiyordu. kos.sh cikis koduna bakiyor; yani bu test
   ">>> SORUN VAR" yazsa bile takim YESIL yanardi.
   Sessizce gecen bir test, olmayan bir testten daha kotudur --
   var oldugu icin kimse yerine yenisini yazmaz.               */
process.exit(hata ? 1 : 0);
