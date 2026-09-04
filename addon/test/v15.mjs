/* EN IYI BORALO MODU V15 -- ok yagmuru + sarsinti.

   Referanstaki kusurlarin her biri icin bir sinama:
     - ok yagmuru hedefin ETRAFINA ortaliyor mu (referans tek yana)
     - oklarin HIZI var mi (referansta yoktu, oldugu yerde dusuyordu)
     - butceye uyuyor mu (referans 25 oku tek tick'te doguruyordu)
     - sarsinti KENDIMIZI sarsmiyor mu (referansin @e[c=1] hatasi)
     - sarsinti moba bosa gitmiyor mu (camerashake mobda calismaz)  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

/* v4.33: Golge Kolu KALDIRILDI, iki yetenegi de Boralo Kolu'na
   gecti (kullanici istegi: "golge kolunun yeteneklerini boralo
   koluna ekle"). Yetenekler aynen duruyor, tasiyan esya degisti. */
esyaKaydet("pa:kol_toprak");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: -0.05, z: 0 }, BAS);
  o.id = id; o.typeId = "minecraft:player"; o.isSneaking = true;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: (s) => (s === "Mainhand") ? { typeId: "pa:kol_toprak" } : undefined,
        setEquipment: () => true }
    : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

function varlik(id, x, y, z, tip) {
  return {
    id, typeId: tip, isValid: true,
    location: { x, y, z },
    _komutlar: [],
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    applyDamage: () => true, addEffect: () => {},
    applyImpulse: () => true, applyKnockback: () => true
  };
}

function zipla(o, tick = 90) {
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(tick); ac();
}

function yetenekDegistir(o) {
  const eski = o.getViewDirection;
  o.getViewDirection = () => ({ x: 0, y: 1, z: 0 });
  sus(); tickIlerlet(40); ac();
  o.getViewDirection = eski;

  /* Jest bir kez islenince "durus bozulana kadar tekrarlama"
     kilidi biniyor (main.js:ESYASIZ_TAMAM). Kilit ancak tarama
     durusun bozuldugunu GORUNCE kalkiyor -- yani birkac tick
     daha gecmeli. Bu satir olmadan arka arkaya cagrilar tek bir
     gecis yapiyor; ust uste ikinci yetenege gecilemiyordu.    */
  sus(); tickIlerlet(12); ac();
}

/* Yetenegi ADIYLA sec.

   v4.33'e kadar bu dosya "secim 0 = ok yagmuru, bir kez
   degistir = sarsinti" varsayiyordu. Golge Kolu Boralo'ya
   katilinca sira dorde cikti ve butun bolumler patladi.
   Kac kez degistirilecegi artik kollar.js'ten HESAPLANIYOR.  */
const KOL = (await import("./pack/yetenekler/kollar.js")).KOL_ESYALARI
  .find((r) => r[0] === "pa:kol_toprak").slice(1);

function yetenegiSec(o, kimlik) {
  const kac = KOL.indexOf(kimlik);
  if (kac < 0) throw new Error("kol_toprak'ta yok: " + kimlik);
  for (let i = 0; i < kac; i++) yetenekDegistir(o);
  return kac;
}

console.log("=== 1. OK YAGMURU: OKLAR DOGUYOR ===");
{
  const { D, o } = kur("v1");
  yetenegiSec(o, "ok_yagmuru");
  D.boyut._varliklar = [o];
  zipla(o);

  const oklar = D.sayac.dogan.filter((d) => d.tip === "minecraft:arrow");
  kontrol("ok yagdi", oklar.length > 0, oklar.length + " ok");
  kontrol("ayardaki sayiya ulasti", oklar.length === ayar.OK_SAYISI,
          oklar.length + " / " + ayar.OK_SAYISI);
}

console.log("");
console.log("=== 2. HEDEFIN ETRAFINA ORTALI (referans TEK YANA) ===");
{
  const { D, o } = kur("v2");
  yetenegiSec(o, "ok_yagmuru");
  D.boyut._varliklar = [o];
  zipla(o);

  const oklar = D.sayac.dogan.filter((d) => d.tip === "minecraft:arrow");
  const merkezZ = oklar.reduce((t, k) => t + k.z, 0) / oklar.length;

  /* Referansta izgara ^0..^4 arasiydi, yani hepsi tek yana
     kayiyordu. Bizde merkez, hedefin z'sine yakin olmali.     */
  kontrol("oklar hedefin etrafina ortalandi", Math.abs(merkezZ - BAS.z) < 1.5,
          "ortalama z = " + merkezZ.toFixed(2) + " (hedef z = " + BAS.z + ")");

  const solda = oklar.filter((k) => k.z < BAS.z).length;
  const sagda = oklar.filter((k) => k.z > BAS.z).length;
  kontrol("iki yana da dagildi (tek yana yigilmadi)",
          solda > 0 && sagda > 0, "sol " + solda + " / sag " + sagda);
}

console.log("");
console.log("=== 3. OKLARIN HIZI VAR (referansta YOKTU) ===");
{
  const { D, o } = kur("v3");
  yetenegiSec(o, "ok_yagmuru");
  D.boyut._varliklar = [o];
  zipla(o);

  const itilen = (D.sayac.varliklar || []).filter(
    (v) => v.typeId === "minecraft:arrow" && v._itildi);
  kontrol("oklara asagi hiz verildi", itilen.length > 0,
          itilen.length + " ok itildi");
  kontrol("hiz ASAGI dogru",
          itilen.length > 0 && itilen[0]._itildi.y < 0,
          itilen.length ? "y = " + itilen[0]._itildi.y : "-");
  kontrol("hiz ayardan geldi",
          itilen.length > 0 && Math.abs(itilen[0]._itildi.y + ayar.OK_HIZ) < 0.001,
          itilen.length ? String(itilen[0]._itildi.y) : "-");
}

console.log("");
console.log("=== 4. TEK TICK'TE HEPSI DOGMUYOR (butce) ===");
{
  const { D, o } = kur("v4");
  yetenegiSec(o, "ok_yagmuru");
  D.boyut._varliklar = [o];
  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(3); ac();

  const ilkOklar = D.sayac.dogan.filter((d) => d.tip === "minecraft:arrow").length;
  kontrol("ilk birkac tickte hepsi dogmadi", ilkOklar < ayar.OK_SAYISI,
          ilkOklar + " / " + ayar.OK_SAYISI);

  sus(); tickIlerlet(200); ac();
  const hepsi = D.sayac.dogan.filter((d) => d.tip === "minecraft:arrow").length;
  kontrol("zamanla hepsi dogdu", hepsi === ayar.OK_SAYISI,
          hepsi + " / " + ayar.OK_SAYISI);
}

console.log("");
console.log("=== 5. SARSINTI: OYUNCUYU SARSAR ===");
{
  const { D, o } = kur("v5");
  const rakip = varlik("r1", 8.5, 90, 0.5, "minecraft:player");
  D.boyut._varliklar = [o, rakip];

  yetenegiSec(o, "sarsinti");
  kontrol("yetenek Sarsinti'ya gecti",
          /Sarsinti/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);

  zipla(o, 30);

  const sars = rakip._komutlar.filter((k) => k.indexOf("camerashake") !== -1);
  kontrol("rakibin ekrani sarsildi", sars.length > 0,
          sars[0] || "komut yok");
  kontrol("siddet ve SURE verildi (referansta sure yoktu)",
          sars.length > 0 && /camerashake add @s [\d.]+ [\d.]+/.test(sars[0]),
          sars[0] || "-");
}

console.log("");
console.log("=== 6. KENDIMIZI SARSMIYORUZ (referansin @e hatasi) ===");
{
  const { D, o } = kur("v6");
  o._komutlar = [];
  const rakip = varlik("r2", 8.5, 90, 0.5, "minecraft:player");
  D.boyut._varliklar = [o, rakip];
  yetenegiSec(o, "sarsinti");
  zipla(o, 30);

  const kendi = (o._komutlar || []).filter((k) => k.indexOf("camerashake") !== -1);
  kontrol("oyuncu KENDI ekranini sarsmadi", kendi.length === 0,
          kendi.length + " kendi komutu");
}

console.log("");
console.log("=== 7. MOBA BOSA GITMIYOR ===");
{
  const { D, o } = kur("v7");
  const zombi = varlik("z1", 8.5, 90, 0.5, "minecraft:zombie");
  D.boyut._varliklar = [o, zombi];
  yetenegiSec(o, "sarsinti");
  zipla(o, 30);

  const sars = zombi._komutlar.filter((k) => k.indexOf("camerashake") !== -1);
  kontrol("moba camerashake gonderilmedi", sars.length === 0,
          sars.length + " komut");
  kontrol("sebebi soylendi",
          /sadece mob|yalnizca oyunculara/.test(o.onScreenDisplay._son || ""),
          o.onScreenDisplay._son);
}

console.log("");
console.log("=== 8. KAYIT ===");
{
  const kayit = await import("./pack/yetenekler/kayit.js");
  for (const y of ["ok_yagmuru", "sarsinti"]) {
    kontrol(y + " kayitli", kayit.yetenekAl(y) !== undefined);
  }
  const kollar = await import("./pack/yetenekler/kollar.js");
  /* Golge Kolu v4.33'te Boralo'ya katilmisti; v4.54'te Boralo
     da Toprak Kol'a katildi. Yani iki kol da artik yok, ama
     YETENEKLERI duruyor -- zincirin her halkasi sinaniyor.    */
  kontrol("pa:kol_golge artik YOK", 
          !kollar.KOL_ESYALARI.some((r) => r[0] === "pa:kol_golge"));
  kontrol("pa:kol_boralo da artik YOK (Toprak Kol'a katildi)",
          !kollar.KOL_ESYALARI.some((r) => r[0] === "pa:kol_boralo"));

  const bagli = (kayit.esyaninYetenekleri("pa:kol_toprak") || [])
    .map((t) => t.kimlik);
  for (const y of ["ok_yagmuru", "sarsinti"]) {
    kontrol(y + " Toprak Kol'da", bagli.includes(y), bagli.join(", "));
  }
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum V15 testleri gecti");
process.exit(hata ? 1 : 0);
