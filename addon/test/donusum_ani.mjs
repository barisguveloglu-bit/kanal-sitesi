// BEN 10 · DONUSUM ANI (v7.96)
//
// Kullanici sordu: "donusum yaparken bir sey oluyor mu?"
// Kaynakta (alienevo + shout) uc katman vardi, bizde HIC yoktu:
// donusum sessiz ve gorselsizdi.
//
// Bu test iki seyi tutuyor:
//   1. Donusum ANINDA gercekten parcacik + ses cikiyor mu
//   2. Kaynaktan OLCULEN renkler uydurulmamis mi -- 13 turun
//      hex'i alienevo'nun guc JSON'larindan okundu; kalan 11
//      turde kaynakta renk YOK ve onlara renk uydurulmadi.
import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet } from "@minecraft/server";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;
const ayar = await import("./pack/ayarlar.js");
const ben10 = await import("./pack/yetenekler/ben10.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const D = dunyaKur();
function kur(elde) {
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "d_" + Math.random(); o.typeId = "minecraft:player";
  o._elde = elde; o._can = 20; o._maks = 20;
  o.addEffect = () => true; o.removeEffect = () => true;
  o.runCommand = () => ({ successCount: 1 }); o.sendMessage = () => {};
  o.playAnimation = () => true; o.teleport = () => true;
  const g = o.getComponent.bind(o);
  o.getComponent = (a) => a === "minecraft:equippable"
    ? { getEquipment: (s) => (s === "Mainhand" && o._elde ? { typeId: o._elde } : undefined),
        setEquipment: () => true }
    : g(a);
  o.onScreenDisplay = { setActionBar: () => {} };
  // Cizilen parcacigi ve calan sesi YAKALA
  const cizilen = [], calan = [];
  o.dimension = Object.create(D.boyut);
  o.dimension.spawnParticle = (tip) => cizilen.push(tip);
  o.dimension.playSound = (ses) => calan.push(ses);
  return { o, cizilen, calan };
}

console.log("=== 1. DONUSUM ANINDA PARCACIK VE SES VAR ===");
{
  const { o, cizilen, calan } = kur("pa:ben_ates");
  console.warn = () => {};
  try { ben10.ben10Tara([o]); } catch (e) { /* olculuyor */ }
  console.warn = w;
  kontrol("donusumde parcacik cizildi", cizilen.length > 0,
          cizilen.length + " parcacik · " + (cizilen[0] || "-"));
  kontrol("donusumde ses caldi", calan.length > 0, calan[0] || "-");
}

console.log("");
console.log("=== 2. AYNI YARATIKTA TEKRAR TETIKLENMIYOR ===");
{
  // Sahne yalnizca DEGISIMDE oynamali; her taramada oynarsa
  // oyuncu surekli parcacik bulutunda kalirdi.
  const { o, cizilen } = kur("pa:ben_ates");
  console.warn = () => {};
  try { ben10.ben10Tara([o]); } catch (e) {}
  const ilk = cizilen.length;
  for (let i = 0; i < 4; i++) { tickIlerlet(1); try { ben10.ben10Tara([o]); } catch (e) {} }
  console.warn = w;
  kontrol("ilk donusumde cizdi", ilk > 0, ilk + " parcacik");
  kontrol("sonraki taramalarda TEKRAR cizmedi", cizilen.length === ilk,
          ilk + " -> " + cizilen.length);
}

console.log("");
console.log("=== 3. RENKLER KAYNAKTAN, UYDURMA DEGIL ===");
{
  // Kaynaktan okunan 13 hex. Bir tanesi bile degisirse ya
  // olcum yanlis ya da biri renk uydurmus demektir.
  const beklenen = {
    petrosapien: "#86d698", tetramand: "#cbcbcb", pyronite: "#f3b661",
    vulpimancer: "#FF0000", lepidopterran: "#cee442", ectonurite: "#ca7de8",
    arburian_pelarota: "#FFAD35", aerophibian: "#56ff00", nucleonix: "#39ff33",
    dragonoid: "#ec692a", methanosian: "#fca103", sonorosian: "#ffffff",
    crystalsapien: "#D646D6"
  };
  const r = ayar.BEN10_DONUSUM_RENK;
  kontrol("olculen renk sayisi 13", r.size === 13, String(r.size));
  const sapan = Object.keys(beklenen).filter((k) => r.get(k) !== beklenen[k]);
  kontrol("her hex kaynaktakiyle ayni", sapan.length === 0, sapan.join(",") || "temiz");

  // Kaynakta rengi OLMAYAN turlere renk UYDURULMAMIS olmali.
  const kaynaklar = new Set();
  for (const [, t] of ayar.BEN10) if (t.kaynak) kaynaklar.add(t.kaynak);
  const uydurma = [...r.keys()].filter((k) => !(k in beklenen));
  kontrol("olculmemis ture renk uydurulmamis", uydurma.length === 0,
          uydurma.join(",") || "temiz");
  kontrol("renksiz turler var ve varsayilana dusuyor",
          kaynaklar.size > r.size &&
          typeof ayar.BEN10_DONUSUM_VARSAYILAN === "string",
          (kaynaklar.size - r.size) + " tur varsayilanda");
}

console.log("");
console.log("=== 4. NIDALAR DEPODA VE BAGLI ===");
{
  // v7.96.1: 11 nida DEPOYA girdi (yapimcidan paylasilabilir
  // izin alindi). Harita artik dolu ve her kaydin ses dosyasi
  // gercekten pakette olmali -- tanimsiz bir ses cagirmak
  // sessizce hicbir sey yapar, yani "calisiyor" sanilir.
  const { readFileSync, existsSync } = await import("node:fs");
  const RP = KOK + "/Simsek_Kol_Kaynak";
  kontrol("BEN10_NIDA dolu", ayar.BEN10_NIDA.size === 11,
          ayar.BEN10_NIDA.size + " kayit");

  const sd = JSON.parse(readFileSync(RP + "/sounds/sound_definitions.json", "utf8"))
    .sound_definitions;
  const eksikTanim = [], eksikDosya = [];
  for (const [tur, ses] of ayar.BEN10_NIDA) {
    if (!sd[ses]) { eksikTanim.push(tur + "->" + ses); continue; }
    const yol = RP + "/" + sd[ses].sounds[0].name + ".ogg";
    if (!existsSync(yol)) eksikDosya.push(ses);
  }
  kontrol("her nidanin ses TANIMI var", eksikTanim.length === 0,
          eksikTanim.join(",") || "temiz");
  kontrol("her nidanin ogg DOSYASI var", eksikDosya.length === 0,
          eksikDosya.join(",") || "temiz");

  // Nidasi OLMAYAN tur vanilla sese dusmeli.
  kontrol("varsayilan donusum sesi hâlâ vanilla",
          typeof ayar.BEN10_DONUSUM_SES === "string" &&
          !ayar.BEN10_DONUSUM_SES.startsWith("pa.nida_"),
          ayar.BEN10_DONUSUM_SES);

  // Gercekten O ses mi caliyor?
  const { o, calan } = kur("pa:ben_ates");   // pyronite
  console.warn = () => {};
  try { ben10.ben10Tara([o]); } catch (e) {}
  console.warn = w;
  kontrol("Ates Topu donusumunde heatblast nidasi caliyor",
          calan.includes("pa.nida_heatblast"), calan.join(",") || "-");

  // Nidasi olmayan bir tur (necrofriggian = buz) vanillaya dusmeli.
  const b = kur("pa:ben_buz");
  console.warn = () => {};
  try { ben10.ben10Tara([b.o]); } catch (e) {}
  console.warn = w;
  kontrol("nidasi olmayan tur vanillaya dusuyor",
          b.calan.includes(ayar.BEN10_DONUSUM_SES), b.calan.join(",") || "-");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Donusum ani: temiz");
process.exit(hata ? 1 : 0);
