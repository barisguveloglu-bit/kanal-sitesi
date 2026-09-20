// VAAT DENETIMI (v7.95.4)
//
// Kullanici: "o ozellige tikladigimda istenilen ozellik veriliyor
// mu?" Bu test tam onu soruyor -- ama menuden degil, VERIDEN:
// her formun `ozet` alani NE VAAT EDIYOR, `efektler` dizisi NE
// VERIYOR?
//
// Neden gerekli: Simbiyot'ta (v7.95.3) tam bu sinif yakalandi --
// yetenek vaat ettiginden baska bir sey yapiyordu. Ozet metni
// kullanicinin menude OKUDUGU sey; tutmazsa yetenek "bozuk"
// hissettiriyor, kod patlamasa bile.
//
// OLCULEN GELENEK: bu bloklarda ozet KADEME yaziyor, bonus degil.
// Kanit: jet "direnç I · güç II" -> amp 0 ve amp 1 (kademe =
// amp+1). Ilk surum bunu bilmeden "can artisi 20"yi "+20 can"
// sandi ve atomik'i yanlislikla sucladi; gercekte health_boost
// KADEME 20 (yani +80 can) ve kayit kendi icinde tutarli.
// Kaynagin kendi yazimi olan "max_health +N" ise GERCEK bonus;
// o ayri ele aliniyor ve bir kademelik sapmaya izin var (Bedrock
// kademe basina 4 can veriyor, her sayi tam tutmuyor).
let hata=false;
const kontrol=(ad,gecti,detay="")=>{
  if(!gecti) hata=true;
  console.log("  "+(gecti?"\u2713":"\u2717")+" "+ad+(detay?"  ::  "+detay:""));
};
let denetlenen=0;

// "ozet" ALANI NE VAAT EDIYOR, KOD NE VERIYOR?
const w=console.warn; console.warn=()=>{};
await import("./pack/main.js"); console.warn=w;
const a=await import("./pack/ayarlar.js");

const ROMEN={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
// efekt adlari TR -> minecraft
const AD={ "direnç":"resistance","direnc":"resistance","güç":"strength","guc":"strength",
  "hız":"speed","hiz":"speed","acele":"haste","yenilenme":"regeneration",
  "can artışı":"health_boost","can artisi":"health_boost","zıplama":"jump_boost",
  "ziplama":"jump_boost","ateş direnci":"fire_resistance" };

function efektSeviye(efektler, ad){
  for (const e of (efektler||[])){
    const [n,,s]=e;
    if(n===ad) return (s||0)+1;         // kademe = amplifier+1
  }
  return undefined;
}

const sorunlar=[];
console.log("=== OZET VAADI vs GERCEK EFEKT ===");
function denetle(kaynak, anahtar, t){
  const ozet=t && t.ozet;
  if(typeof ozet!=="string") return;
  denetlenen++;
  // "direnç IV" / "güç X" / "yenilenme III" kaliplari
  const re=/([a-zçğıöşü ]+?)\s+(I{1,3}|IV|V?I{0,3}|IX|X)\b/gi;
  let m;
  while((m=re.exec(ozet))!==null){
    const ham=m[1].trim().toLocaleLowerCase("tr");
    const rom=m[2].toUpperCase();
    if(!ROMEN[rom]) continue;
    const mc=AD[ham];
    if(!mc) continue;
    const vaat=ROMEN[rom];
    const gercek=efektSeviye(t.efektler, mc);
    if(gercek===undefined){
      sorunlar.push([kaynak,anahtar,`"${ham} ${rom}" vaat ediliyor ama ${mc} efekti YOK`]);
    } else if(gercek!==vaat){
      sorunlar.push([kaynak,anahtar,`"${ham} ${rom}" vaat (${vaat}) ama gercek ${mc}=${gercek}`]);
    }
  }
  /* Bu blogun gelenegi: ozet KADEME yaziyor, bonus degil.
     Kanit: jet "direnç I · güç II" -> amp 0 ve amp 1.
     Yani "can artisi 20" = health_boost KADEME 20.        */
  const m2=/can art[iı][sş][iı]\s+(\d+)/i.exec(ozet);
  if(m2){
    const vaat=parseInt(m2[1],10);
    const g=efektSeviye(t.efektler,"health_boost");
    if(g===undefined) sorunlar.push([kaynak,anahtar,`"can artisi ${vaat}" vaat ama health_boost YOK`]);
    else if(g!==vaat) sorunlar.push([kaynak,anahtar,`"can artisi ${vaat}" vaat ama kademe ${g}`]);
  }
  /* Kaynagin kendi yazimi: "max_health +N" = GERCEK can bonusu.
     Bedrock'ta health_boost kademe basina 4 can veriyor, yani
     en yakin kademe round(N/4). Bir kademeden fazla sapma
     vaadin tutmadigi anlamina gelir.                        */
  const m3=/max_health \+(\d+)/i.exec(ozet);
  if(m3){
    const vaat=parseInt(m3[1],10);
    const g=efektSeviye(t.efektler,"health_boost");
    if(g===undefined) sorunlar.push([kaynak,anahtar,`"max_health +${vaat}" vaat ama health_boost YOK`]);
    else { const verilen=g*4;
      if(Math.abs(verilen-vaat)>4) sorunlar.push([kaynak,anahtar,
        `"max_health +${vaat}" vaat ama gercek +${verilen} (kademe ${g})`]); }
  }
  /* "ateş bağışıklığı" / "su solunumu" gibi sozlu vaatler */
  const SOZ=[["ateş bağışıklığı","fire_resistance"],["ateş direnci","fire_resistance"],
             ["su solunumu","water_breathing"],["gece görüşü","night_vision"],
             ["yavaş düşüş","slow_falling"],["görünmezlik","invisibility"]];
  for (const [soz,mc] of SOZ){
    if(ozet.toLocaleLowerCase("tr").includes(soz) &&
       efektSeviye(t.efektler,mc)===undefined)
      sorunlar.push([kaynak,anahtar,`"${soz}" vaat ediliyor ama ${mc} efekti YOK`]);
  }
  // "uçuş" vaadi
  if(/uçuş|ucus/i.test(ozet)){
    const varUcus = (t.yetenek==="ucus") || (t.yetenekler||[]).includes("ucus") ||
                    efektSeviye(t.efektler,"levitation")!==undefined;
    if(!varUcus) sorunlar.push([kaynak,anahtar,`"UCUS" vaat ediliyor ama ne yetenek ne levitation var`]);
  }
}

for (const [k,t] of a.ZIRH_MODLAR) denetle("ZIRH_MODLAR",k,t);
for (const [k,t] of a.MARVEL_GUCLER) denetle("MARVEL_GUCLER",k,t);
for (const [k,t] of a.BEN10) denetle("BEN10",k,t);
for (const [k,t] of a.BEN10_EVRIM) denetle("BEN10_EVRIM",k,t);

const gor=new Set();
const benzersiz=[];
for (const [kay,an,mes] of sorunlar){
  const im=kay+"|"+an+"|"+mes;
  if(gor.has(im))continue; gor.add(im);
  benzersiz.push(kay+"/"+an+": "+mes);
}
kontrol("her ozet vaadi gercek efektle ortusuyor",
        benzersiz.length===0, benzersiz.slice(0,6).join(" | ") || "temiz");
kontrol("olcum gercekten calisti", denetlenen>20, denetlenen+" form denetlendi");

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Vaat denetimi: temiz");
process.exit(hata ? 1 : 0);
