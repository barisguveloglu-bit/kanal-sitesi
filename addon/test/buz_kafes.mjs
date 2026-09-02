/* v4.67 -- ELEMENT LAZERININ BUZ MODU

   Kullanici: "buz haline cevirirsek karsidaki kisi yavaslik
   aliyor ve etrafi buz blogu ile kaplaniyor."

   Bu dosya kafesin GERCEKTEN kurulup GERCEKTEN kalktigini
   siniyor. Kalici blok birakmak bu depoda en pahali hata
   bicimi: oyuncunun dunyasinda buz yigini kalir.            */
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

esyaKaydet("pa:iksir_element", "pa:goz_element", "pa:goz_element_lazer");
const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const mc = await import("@minecraft/server");
await import("./pack/main.js");
const ayar = await import("./pack/ayarlar.js");
const lz = await import("./pack/yetenekler/goz_lazeri.js");
const { butceSifirla } = await import("./pack/butce.js");
ac();

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const element = ayar.KADEMELER.find((k) => k.kimlik === "element");

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player";
  o._efekt = []; o._kafa = undefined;
  o.addEffect = (a, s2, s3) => { o._efekt.push({ ad: a, sure: s2, s: s3 }); };
  o.removeEffect = () => {};
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: (s2) => (s2 === "Head" && o._kafa) ? { typeId: o._kafa } : undefined,
    setEquipment: (s2, e) => { if (s2 === "Head") o._kafa = e ? e.typeId : undefined; return true; }
  } : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

function kurban(id, x, z) {
  return {
    id, typeId: "minecraft:zombie", isValid: true,
    location: { x, y: 90, z },
    _efektler: [], _hasarlar: [],
    addEffect(a, s2, s3) { this._efektler.push({ ad: a, sure: s2, s: s3 }); },
    applyDamage(m) { this._hasarlar.push(m); return true; },
    applyKnockback: () => true, applyImpulse: () => true
  };
}

console.log("=== 1. VARSAYILAN MOD BUZ ===");
{
  const { D, o } = kur("b1");
  const mod = lz.lazerModuAl(o.id, element);
  kontrol("varsayilan mod buz", mod && mod.kimlik === "buz", mod && mod.kimlik);
}

console.log("\n=== 2. BUZ MODU: YAVASLIK + BUZ BLOKLARI ===");
{
  const { D, o } = kur("b2");
  const z = kurban("z1", 0.5, 6);
  D.boyut._varliklar = [z];
  D.boyut.getEntities = () => [z, o];

  sus();
  mc.itemCompleteUseTetikle({ source: o, itemStack: { typeId: "pa:iksir_element" } });
  tickIlerlet(2);
  ac();

  const oncekiBlok = D.sayac.konan;
  sus(); mc.yetenekCalistir ? 0 : 0; ac();

  // lazeri dogrudan tetikle
  const kayit = await import("./pack/yetenekler/kayit.js");
  const lazer = kayit.tumYetenekler().find((t) => t.kimlik === "goz_lazeri");
  /* DIKKAT: butceSifirla() her turda cagrilmali. Merkezi tick
     yoneticisi bunu normalde kendi yapiyor ama is kayitli
     olmadan elle cevrilince butce hic dolmuyor ve blok koyan
     her sey sessizce hicbir sey yapmiyor -- bu tuzaga bu
     dosyayi yazarken dusuldu.                                */
  sus();
  var is = lazer.olustur(o);
  if (is) {
    for (let i = 0; i < 40; i++) {
      butceSifirla();
      if (is.calis()) break;
      tickIlerlet(1);
    }
  }
  ac();

  kontrol("zombi hasar aldi", z._hasarlar.length > 0, z._hasarlar.join(","));
  kontrol("zombi YAVASLIK aldi",
          z._efektler.some((e) => e.ad === "slowness"),
          z._efektler.map((e) => e.ad).join(", ") || "yok");
  /* Sahte dunya her setType'i sayac.yazilan'a yaziyor --
     gercek sayim buradan. Once "konuldu mu", sonra "kalkti mi". */
  const konan = D.sayac.yazilan.filter((b) => b.tip === ayar.LAZER_BUZ_BLOK);
  kontrol("buz blogu KONULDU", konan.length > 0, konan.length + " blok");
  kontrol("kabuk ici BOS (hedefin durdugu yere blok konmadi)",
          !konan.some((b) => b.x === 0 && b.z === 6 && b.y === 91),
          "hedefin bulundugu hucreye blok konmus -- bogulurdu");

  /* Sure dolana kadar cevir: kafes kalkmali */
  sus();
  for (let i = 0; i < ayar.LAZER_BUZ_SURE + 120; i++) {
    butceSifirla();
    if (is && is.calis()) break;
    tickIlerlet(1);
  }
  ac();
  const silinen = D.sayac.yazilan.filter(
    (b) => b.tip === "minecraft:air" &&
           konan.some((k) => k.x === b.x && k.y === b.y && k.z === b.z));
  kontrol("sure dolunca buz KALKTI", silinen.length === konan.length,
          silinen.length + "/" + konan.length + " blok kaldirildi");
}

console.log("\n=== 3. MOD DEGISTIRINCE ATESE GECIYOR ===");
{
  const { o } = kur("b3");
  const yeni = lz.lazerModuDegistir(o.id, element);
  kontrol("mod atese gecti", yeni && yeni.kimlik === "ates", yeni && yeni.kimlik);
  const tekrar = lz.lazerModuDegistir(o.id, element);
  kontrol("bir daha basinca buza doner", tekrar.kimlik === "buz", tekrar.kimlik);
}

console.log("\n=== 4. MODU OLMAYAN IKSIRDE MOD YOK ===");
{
  const ates = ayar.KADEMELER.find((k) => k.kimlik === "firenoksin");
  kontrol("Firenoksin'in modu yok", lz.lazerModlari(ates) === undefined);
  kontrol("Element'in modu var", lz.lazerModlari(element) !== undefined);
}

console.log("\n=== 5. KAFES KALICI BLOK BIRAKMIYOR ===");
{
  kontrol("buz suresi tanimli ve kisa",
          ayar.LAZER_BUZ_SURE > 0 && ayar.LAZER_BUZ_SURE <= 400,
          ayar.LAZER_BUZ_SURE + " tick");
  const src = (await import("node:fs")).readFileSync("./pack/yetenekler/goz_lazeri.js", "utf8");
  kontrol("sadece HAVAYA konuyor", /!b\.isAir\) continue/.test(src));
  kontrol("sadece BIZIM buzumuz siliniyor",
          /b\.typeId === LAZER_BUZ_BLOK\) b\.setType\("minecraft:air"\)/.test(src));
  kontrol("kafes kalkmadan is bitmiyor",
          /system\.currentTick < buzKalkmaTick\) return false/.test(src));
  kontrol("blok butcesinden geciyor", /blokIste\(2\) < 2\) return false;[\s\S]{0,200}buzNoktalari/.test(src));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> buz kafesi calisiyor");
process.exit(hata ? 1 : 0);
