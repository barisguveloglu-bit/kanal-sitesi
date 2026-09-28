/* TOPRAK TOPU YARIDA KESILINCE IZ KALMIYOR              v7.98.2

   Oyuncu cikinca is listeden dogrudan siliniyor ve yalniz bitir()
   calisiyor. Kure yalniz calis() icinde siliniyordu: havada kalici
   bir toprak topu kaliyordu. Mod taramasi buldu.              */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");
let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const D = dunyaKur();
const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 120.6, z: 0.5 });
o.id = "tt1"; o.typeId = "minecraft:player";
_durum.oyuncular = [o];
const toprakSay = () => [...D.bloklar].filter(([k, v]) => v === ayar.TOP_BLOK && Number(k.split(",")[1]) > 100).length;
console.warn = () => {};
const is = kayit.yetenekAl("toprak_topu").olustur(o);
for (let i = 0; i < 12; i++) { butceSifirla(); tickIlerlet(1); is.calis(); }
console.warn = w;
const once = toprakSay();
kontrol("top havada ucuyor (on kosul)", once > 0, once + " toprak blogu");
console.warn = () => {};
is.bitir();                     // playerLeave -> isSil -> bitir
console.warn = w;
kontrol("kesilince havada toprak kalmadi", toprakSay() === 0, toprakSay() + " blok kaldi");
console.log(hata ? ">>> SORUN VAR" : ">>> toprak topu iz birakmiyor");
process.exit(hata ? 1 : 0);
