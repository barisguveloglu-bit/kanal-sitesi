/* OPTIMIZASYON OLCUMU
   Her yetenegi tek tek calistirip olcuyor:
     tepe yuk  -- en yogun tick'te kac blok islemi
     toplam    -- atis basina blok / varlik / patlama
     sure      -- yetenek kac tick surdu
     ms        -- gercek islemci suresi (Node uzerinde)

   Amac: yeni yeteneklerin (v4.5 sonrasi) eskilerle ayni butce
   disiplinine uyup uymadigini gormek.                          */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum, system } from "@minecraft/server";
import { butceSifirla } from "./pack/butce.js";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const iks   = await import("./pack/yetenekler/iksirler.js");

const BAS = { x: 0.5, y: 90.6, z: 0.5 };
const TAVAN = ayar.TICK_BLOK_BUTCESI;

function sahne(kimlik) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, BAS);
  o.id = "olc"; o.typeId = "minecraft:player"; o.isSneaking = true;
  o._kafa = undefined;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: () => undefined,
        setEquipment: (s, e) => { o._kafa = e ? e.typeId : undefined; return true; } }
    : undefined;
  _durum.oyuncular = [o];

  // Hedef gerektiren yetenekler icin birkac kurban
  const kurbanlar = [];
  for (let i = 0; i < 6; i++) {
    kurbanlar.push({
      id: "k" + i, typeId: "minecraft:zombie", isValid: true, nameTag: "",
      location: { x: 5 + i * 2.5, y: 90, z: (i % 2 ? 1.2 : -1.2) },
      applyDamage: () => true, addEffect: () => {}, removeEffect: () => {},
      applyImpulse: () => true, applyKnockback: () => true,
      runCommand: () => ({ successCount: 1 }),
      remove() { this.isValid = false; }
    });
  }
  D.boyut._varliklar = [o, ...kurbanlar];

  // Lazer iksir ister
  if (kimlik === "goz_lazeri") { sus(); iks.iksirIc(o, ayar.KADEMELER[6]); ac(); }
  return { D, o };
}

function olc(kimlik) {
  const tanim = kayit.yetenekAl(kimlik);
  if (!tanim) return null;
  const { D, o } = sahne(kimlik);

  const bas = process.hrtime.bigint();
  let is, tick = 0;
  sus();
  try { is = tanim.olustur(o); } catch (e) { ac(); return { kimlik, hata: e.message }; }
  if (is) {
    for (tick = 0; tick < 900; tick++) {
      butceSifirla();
      let bitti;
      try { bitti = is.calis(); } catch (e) { ac(); return { kimlik, hata: e.message }; }
      if (bitti) { try { is.bitir(); } catch (e) {} break; }
      tickIlerlet(1);
    }
  }
  ac();
  const ms = Number(process.hrtime.bigint() - bas) / 1e6;

  const tepe = Math.max(0, ...Object.values(D.sayac.tickBlok || {}));
  return {
    kimlik,
    ad: tanim.ad,
    anlik: !is,
    tick,
    tepe,
    blok: D.sayac.setType,
    varlik: D.sayac.dogan.length,
    patlama: D.sayac.patlama.length,
    parcacik: (D.sayac.parcacik || []).length,
    ms
  };
}

const SIRA = kayit.tumYetenekler().map((t) => t.kimlik).sort();
const sonuclar = [];
for (const k of SIRA) {
  const r = olc(k);
  if (r) sonuclar.push(r);
}

console.log("");
console.log("╔══ OPTIMIZASYON OLCUMU " + "═".repeat(56));
console.log("║  butce tavani: " + TAVAN + " blok islemi/tick   ·   " +
            sonuclar.length + " yetenek olculdu");
console.log("╚" + "═".repeat(78));
console.log("");
console.log("  " + "yetenek".padEnd(20) + "tick".padStart(6) + "tepe".padStart(7) +
            "blok".padStart(8) + "varlık".padStart(8) + "patla".padStart(7) +
            "parçac".padStart(8) + "ms".padStart(8));
console.log("  " + "─".repeat(72));

let asan = [];
for (const r of sonuclar) {
  if (r.hata) { console.log("  " + r.kimlik.padEnd(20) + "  HATA: " + r.hata); continue; }
  const bayrak = r.tepe > TAVAN ? " ‼" : "";
  if (r.tepe > TAVAN) asan.push(r);
  console.log("  " + r.kimlik.padEnd(20) +
    String(r.anlik ? "-" : r.tick).padStart(6) +
    String(r.tepe).padStart(7) +
    String(r.blok).padStart(8) +
    String(r.varlik).padStart(8) +
    String(r.patlama).padStart(7) +
    String(r.parcacik).padStart(8) +
    r.ms.toFixed(2).padStart(8) + bayrak);
}

console.log("");
console.log("  ── ÖZET " + "─".repeat(64));

const anlik = sonuclar.filter((r) => r.anlik).length;
const sureli = sonuclar.length - anlik;
const enTepe = sonuclar.reduce((a, b) => (b.tepe > a.tepe ? b : a));
const enUzun = sonuclar.reduce((a, b) => ((b.tick || 0) > (a.tick || 0) ? b : a));
const enYavas = sonuclar.reduce((a, b) => (b.ms > a.ms ? b : a));
const toplamMs = sonuclar.reduce((t, r) => t + r.ms, 0);

console.log("  anlık yetenek (tick tutmaz)   : " + anlik);
console.log("  süreli yetenek                : " + sureli);
console.log("  en yüksek tepe yük            : " + enTepe.kimlik +
            "  " + enTepe.tepe + " / " + TAVAN);
console.log("  en uzun süren                 : " + enUzun.kimlik +
            "  " + enUzun.tick + " tick (" + (enUzun.tick / 20).toFixed(1) + " sn)");
console.log("  en çok işlemci yiyen          : " + enYavas.kimlik +
            "  " + enYavas.ms.toFixed(2) + " ms");
console.log("  32 yeteneğin toplam süresi    : " + toplamMs.toFixed(1) + " ms");
console.log("  bütçeyi AŞAN yetenek          : " +
            (asan.length === 0 ? "yok ✓" : asan.map((r) => r.kimlik).join(", ")));

console.log("");
console.log("  ── ÇİFT EL: iki ağır yetenek aynı anda " + "─".repeat(33));
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, BAS);
  o.id = "ce"; o.typeId = "minecraft:player"; o.isSneaking = true;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: (s) => ({ typeId: s === "Offhand" ? "pa:kol_top" : "pa:kol_toprak" }),
        setEquipment: () => true }
    : undefined;
  _durum.oyuncular = [o];
  esyaKaydet("pa:kol_toprak", "pa:kol_top");

  const bas = process.hrtime.bigint();
  o.isJumping = true; sus(); tickIlerlet(8); ac(); o.isJumping = false;
  sus(); tickIlerlet(600); ac();
  const ms = Number(process.hrtime.bigint() - bas) / 1e6;

  const tepe = Math.max(0, ...Object.values(D.sayac.tickBlok || {}));
  console.log("  iki iş birden çalışırken tepe : " + tepe + " / " + TAVAN +
              (tepe <= TAVAN ? "  ✓" : "  ‼ AŞTI"));
  console.log("  toplam blok / süre            : " + D.sayac.setType +
              " blok · " + ms.toFixed(1) + " ms");
}

console.log("");
process.exit(asan.length === 0 ? 0 : 1);
