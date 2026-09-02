import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";
esyaKaydet("pa:kol_top");
const w = console.warn; console.warn = () => {};
await import("./pack/main.js");
const D = dunyaKur();
const o = oyuncuKur(D.boyut, {x:1,y:-0.05,z:0}, {x:0.5,y:90.6,z:0.5});
o.id="t1"; o.typeId="minecraft:player"; o.isSneaking=true;
o.getComponent = (ad) => ad==="minecraft:equippable"
  ? { getEquipment:(s)=> s==="Mainhand"?{typeId:"pa:kol_top"}:undefined, setEquipment:()=>true } : undefined;
_durum.oyuncular=[o];
o.isJumping=true; tickIlerlet(8); o.isJumping=false;
tickIlerlet(600);
console.warn = w;
console.log("TEK EL toprak_topu, tick basina en fazla mock blok islemi:",
  Math.max(0, ...Object.values(D.sayac.tickBlok)));
