/* Toprak topunun ucus SURESI degismedi mi? v4.5'te butce sayimi
   duzeltildi (blok basina 1 -> 2 birim) ve sabit 28 -> 56 yapildi.
   Ikisi birbirini goturmeli: ucus tick sayisi AYNI kalmali.      */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum, system } from "@minecraft/server";
esyaKaydet("pa:kol_top");
const w = console.warn; console.warn = () => {};
await import("./pack/main.js");
const D = dunyaKur();
const o = oyuncuKur(D.boyut, {x:1,y:-0.05,z:0}, {x:0.5,y:90.6,z:0.5});
o.id="u1"; o.typeId="minecraft:player"; o.isSneaking=true;
o.getComponent = (ad) => ad==="minecraft:equippable"
  ? { getEquipment:(s)=> s==="Mainhand"?{typeId:"pa:kol_top"}:undefined, setEquipment:()=>true } : undefined;
_durum.oyuncular=[o];
o.isJumping=true; tickIlerlet(8); o.isJumping=false;
const bas = system.currentTick;
let bitis = null;
for (let i=0;i<800 && bitis===null;i++){ tickIlerlet(1); if (D.sayac.patlama.length) bitis = system.currentTick; }
console.warn = w;
console.log("ucus:", bitis===null ? "BITMEDI" : (bitis - bas) + " tick",
            "| tepe yuk:", Math.max(0,...Object.values(D.sayac.tickBlok)), "islem/tick",
            "| yazilan blok:", D.sayac.setType);
