// ORIJINAL algoritma - yuklenen main.js'ten birebir port (karsilastirma icin)
const TOP_YARICAP = 2, TOP_HIZ = 2, TOP_MENZIL = 60, PATLAMA_GUCU = 4;
const TOP_BLOK = "minecraft:dirt";
const KORUNAN = ["minecraft:bedrock","minecraft:barrier","minecraft:end_portal","minecraft:end_portal_frame","minecraft:end_gateway","minecraft:command_block","minecraft:repeating_command_block","minecraft:chain_command_block","minecraft:structure_block","minecraft:jigsaw","minecraft:light_block"];

function kureNoktalari(r){const n=[];const t=Math.ceil(r);
for(let x=-t;x<=t;x++)for(let y=-t;y<=t;y++)for(let z=-t;z<=t;z++)
 if(x*x+y*y+z*z<=r*r+0.5)n.push({x,y,z});return n;}
const KURE = kureNoktalari(TOP_YARICAP);

function kureCiz(boyut, merkez, tip) {
  const mx = Math.floor(merkez.x), my = Math.floor(merkez.y), mz = Math.floor(merkez.z);
  for (const n of KURE) {
    try {
      const blok = boyut.getBlock({ x: mx + n.x, y: my + n.y, z: mz + n.z });
      if (!blok) continue;
      if (KORUNAN.indexOf(blok.typeId) !== -1) continue;
      blok.setType(tip);
    } catch (e) {}
  }
}

function carpmaVarMi(boyut, poz, yon) {
  try {
    const on = {
      x: Math.floor(poz.x + yon.x * (TOP_YARICAP + 1)),
      y: Math.floor(poz.y + yon.y * (TOP_YARICAP + 1)),
      z: Math.floor(poz.z + yon.z * (TOP_YARICAP + 1))
    };
    const blok = boyut.getBlock(on);
    if (!blok) return true;
    if (KORUNAN.indexOf(blok.typeId) !== -1) return true;
    return false;
  } catch (e) { return true; }
}

export function eskiToprakTopu(boyut, oyuncu) {
  const yon = oyuncu.getViewDirection();
  const bas = oyuncu.getHeadLocation();
  let poz = {
    x: bas.x + yon.x * (TOP_YARICAP + 2),
    y: bas.y + yon.y * (TOP_YARICAP + 2),
    z: bas.z + yon.z * (TOP_YARICAP + 2)
  };
  let gidilen = 0, cizildi = false, adim = 0;
  for (let g = 0; g < 10000; g++) {
    if (cizildi) kureCiz(boyut, poz, "minecraft:air");
    if (gidilen >= TOP_MENZIL) { boyut.createExplosion(poz, PATLAMA_GUCU, {}); return adim; }
    poz = { x: poz.x + yon.x * TOP_HIZ, y: poz.y + yon.y * TOP_HIZ, z: poz.z + yon.z * TOP_HIZ };
    gidilen += TOP_HIZ;
    if (carpmaVarMi(boyut, poz, yon)) { boyut.createExplosion(poz, PATLAMA_GUCU, {}); return adim; }
    kureCiz(boyut, poz, TOP_BLOK);
    cizildi = true; adim++;
  }
  return adim;
}
