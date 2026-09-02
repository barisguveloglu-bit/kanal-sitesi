/* YAMULTMA -- v4.10'da Boralo Mod V2'den alinan poz + kazma yorgunlugu.

   Referansla karsilastirma sinamalari:
     - hedef POZ aliyor mu (referansin bizden tek ustunlugu)
     - mining_fatigue veriliyor mu (kelepce silahindan)
     - MOBA da isliyor mu (referans sadece @p, yani oyuncu)
     - SURELI mi (referans suresizdi)
     - tekrar kullaninca cozuluyor mu ve poz geri aliniyor mu   */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, BAS);
  o.id = id; o.typeId = "minecraft:player";
  _durum.oyuncular = [o];
  return { D, o };
}

function mob(id, x, y, z, tip = "minecraft:zombie") {
  return {
    id, typeId: tip, isValid: true,
    location: { x, y, z },
    _efektler: [], _silinen: [], _komutlar: [],
    addEffect(ad, sure, se) { this._efektler.push({ ad, sure, se }); },
    removeEffect(ad) { this._silinen.push(ad); },
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    applyDamage: () => true, applyImpulse: () => true, applyKnockback: () => true
  };
}

function calistir(o) {
  const tanim = kayit.yetenekAl("yamult");
  sus();
  const is = tanim.olustur(o);
  if (is) { for (let i = 0; i < 300; i++) if (is.calis()) break; is.bitir(); }
  ac();
}

console.log("=== 1. MOBA ISLIYOR (referans sadece @p = oyuncu) ===");
{
  const { D, o } = kur("ym1");
  const z = mob("z1", 8.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  calistir(o);

  const adlar = z._efektler.map((e) => e.ad);
  kontrol("mob yamuldu", adlar.length > 0, adlar.join(", ") || "efekt yok");
  kontrol("yavaslik verildi", adlar.indexOf("slowness") !== -1);
  kontrol("guçsuzluk verildi", adlar.indexOf("weakness") !== -1);
  kontrol("KAZMA YORGUNLUGU verildi (kelepce silahindan)",
          adlar.indexOf("mining_fatigue") !== -1, adlar.join(", "));
  kontrol("kazma seviyesi ayardan",
          z._efektler.some((e) => e.ad === "mining_fatigue" &&
                                  e.se.amplifier === ayar.YAMULT_KAZMA));
}

console.log("");
console.log("=== 2. POZ (referansin bizden TEK ustunlugu) ===");
{
  const { D, o } = kur("ym2");
  const z = mob("z2", 8.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  calistir(o);

  kontrol("hedefe poz oynatildi",
          z._komutlar.some((k) => k.indexOf("playanimation") !== -1),
          z._komutlar[0] || "komut yok");
  kontrol("poz ayardan geldi",
          z._komutlar.some((k) => k.indexOf(ayar.YAMULT_ANIM) !== -1),
          z._komutlar.join(" | "));
}

console.log("");
console.log("=== 3. SURELI (referans suresizdi) ===");
{
  const { D, o } = kur("ym3");
  const z = mob("z3", 8.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  calistir(o);

  const uzun = z._efektler.filter((e) => e.sure > ayar.YAMULT_SURE);
  kontrol("hicbir efekt YAMULT_SURE'yi asmiyor", uzun.length === 0,
          "en uzun " + Math.max(...z._efektler.map((e) => e.sure)) +
          " / " + ayar.YAMULT_SURE);
}

console.log("");
console.log("=== 4. TEKRAR KULLANINCA COZULUYOR ===");
{
  const { D, o } = kur("ym4");
  const z = mob("z4", 8.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  calistir(o);
  const ilkEfekt = z._efektler.length;

  calistir(o);   // ayni hedefe tekrar

  kontrol("ikinci kullanimda yeni efekt EKLENMEDI",
          z._efektler.length === ilkEfekt,
          ilkEfekt + " -> " + z._efektler.length);
  kontrol("efektler silindi", z._silinen.length > 0, z._silinen.join(", "));
  kontrol("kazma yorgunlugu da silindi",
          z._silinen.indexOf("mining_fatigue") !== -1, z._silinen.join(", "));
  kontrol("poz geri alindi",
          z._komutlar.some((k) => k.indexOf(ayar.YAMULT_ANIM_BITIS) !== -1),
          z._komutlar.join(" | "));
}

console.log("");
console.log("=== 5. ARKADAKI YAMULMUYOR ===");
{
  const { D, o } = kur("ym5");
  const arka = mob("arka", -8.5, 90, 0.5);
  D.boyut._varliklar = [o, arka];
  calistir(o);
  kontrol("arkadaki hedefe dokunulmadi", arka._efektler.length === 0,
          arka._efektler.length + " efekt");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum yamultma testleri gecti");
process.exit(hata ? 1 : 0);
