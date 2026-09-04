/* GUNES MODU -- isin topu, gunes yumrugu, menu.

   Referanstaki kusurlarin her biri icin bir sinama:
     - mermi merkezi is listesinde mi (referans kendi interval'ini aciyordu)
     - oyuncu cikinca duruyor mu (referansta interval devam ediyordu)
     - hedef TEK kez mi vuruluyor (referans getEntities+getPlayers ile iki kat)
     - duvara carpinca duruyor mu (referansta suzulup gidiyordu)
     - yumruk SURELI mi (referansta kaliciydi)
     - yumruk sonsuz donguye girmiyor mu (referansta koruma yoktu)
     - server-ui yoksa paket olmuyor mu                                   */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum, system } from "@minecraft/server";

esyaKaydet("pa:kol_gunes");

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
  o.id = id;
  o.typeId = "minecraft:player";
  o.isSneaking = true;
  o.getComponent = (ad) => (ad === "minecraft:equippable")
    ? { getEquipment: (s) => (s === "Mainhand") ? { typeId: "pa:kol_gunes" } : undefined,
        setEquipment: () => true }
    : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

function mob(id, x, y, z) {
  return {
    id, typeId: "minecraft:zombie", isValid: true,
    location: { x, y, z },
    _hasar: [],
    applyDamage(n) { this._hasar.push(n); return true; },
    addEffect: () => {}, applyImpulse: () => true, applyKnockback: () => true,
    remove() { this.isValid = false; }
  };
}

function zipla(o, tick = 70) {
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
}

console.log("=== 1. ISIN TOPU: UCUYOR VE VURUYOR ===");
{
  const { D, o } = kur("gn1");
  const z = mob("z1", 14.5, 90.5, 0.5);
  D.boyut._varliklar = [o, z];
  zipla(o, 120);

  kontrol("hedef vuruldu", z._hasar.length > 0, z._hasar.length + " vurus");
  kontrol("hasar ayardan geldi",
          z._hasar.length > 0 && z._hasar[0] === ayar.ISINTOP_HASAR,
          String(z._hasar[0]));

  /* Referans hem getEntities hem getPlayers tariyordu, yani her
     hedef iki kez vuruluyordu. Burada TEK kez olmali.          */
  kontrol("hedef sadece BIR kez vuruldu (referans iki kat vuruyordu)",
          z._hasar.length === 1, z._hasar.length + " kez");

  const parcacik = (D.sayac.parcacik || []).length;
  kontrol("yol boyunca parcacik cizildi", parcacik > 0, parcacik + " parcacik");
}

console.log("");
console.log("=== 2. ISIN TOPU: HAZIRLIK ASAMASI ===");
{
  const { D, o } = kur("gn2");
  const z = mob("z2", 14.5, 90.5, 0.5);
  D.boyut._varliklar = [o, z];

  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;

  // Hazirlik bitmeden hedef vurulmamali
  sus(); tickIlerlet(ayar.ISINTOP_HAZIRLIK - 5); ac();
  kontrol("hazirlik surerken hedef vurulmadi", z._hasar.length === 0,
          z._hasar.length + " vurus");

  sus(); tickIlerlet(200); ac();
  kontrol("hazirlik bitince firladi ve vurdu", z._hasar.length > 0,
          z._hasar.length + " vurus");
}

console.log("");
console.log("=== 3. ISIN TOPU: DUVARA CARPINCA DURUYOR ===");
{
  const { D, o } = kur("gn3");
  D.bloklar.hepsiDolu = true;            // her yer tas
  const z = mob("z3", 30.5, 90.5, 0.5);  // cok uzakta
  D.boyut._varliklar = [o, z];
  zipla(o, 200);
  kontrol("duvarin arkasindaki hedef vurulmadi", z._hasar.length === 0,
          z._hasar.length + " vurus");
}

console.log("");
console.log("=== 4. ISIN TOPU: OYUNCU CIKINCA DURUYOR ===");
{
  const { D, o } = kur("gn4");
  const z = mob("z4", 30.5, 90.5, 0.5);
  D.boyut._varliklar = [o, z];

  o.isJumping = true;
  sus(); tickIlerlet(8); ac();
  o.isJumping = false;
  sus(); tickIlerlet(10); ac();

  const oncekiParcacik = (D.sayac.parcacik || []).length;
  sus();
  for (const cb of _durum.playerLeaveCb) cb({ playerId: "gn4" });
  tickIlerlet(300);
  ac();

  kontrol("ayrildiktan sonra mermi ilerlemedi",
          (D.sayac.parcacik || []).length === oncekiParcacik,
          oncekiParcacik + " -> " + (D.sayac.parcacik || []).length);
  kontrol("ayrildiktan sonra hedef vurulmadi", z._hasar.length === 0,
          z._hasar.length + " vurus");
}

console.log("");
console.log("=== 4b. ISIN TOPU PATLIYOR (v4.15) ===");
{
  const { D, o } = kur("gnp1");
  const z = mob("zp", 14.5, 90.5, 0.5);
  D.boyut._varliklar = [o, z];
  zipla(o, 200);

  kontrol("vardigi yerde patladi", D.sayac.patlama.length > 0,
          D.sayac.patlama.length + " patlama");
  kontrol("guc TNT ile ayni",
          D.sayac.patlama.length > 0 && D.sayac.patlama[0].guc === ayar.ISINTOP_PATLAMA,
          D.sayac.patlama.length ? String(D.sayac.patlama[0].guc) : "-");
  kontrol("guc gercekten 4 (TNT)", ayar.ISINTOP_PATLAMA === 4,
          String(ayar.ISINTOP_PATLAMA));

  // Patlama HEDEFIN yaninda olmali, oyuncunun dibinde degil
  const p = D.sayac.patlama[0];
  kontrol("patlama hedefin yaninda, atanin dibinde degil",
          p && Math.abs(p.x - 14.5) < 4,
          p ? "x = " + p.x.toFixed(1) + " (hedef 14.5, atan 0.5)" : "-");
}
{
  /* Duvara carpinca da patlamali */
  const { D, o } = kur("gnp2");
  D.bloklar.hepsiDolu = true;
  D.boyut._varliklar = [o];
  zipla(o, 200);
  kontrol("duvara carpinca da patladi", D.sayac.patlama.length > 0,
          D.sayac.patlama.length + " patlama");
}
{
  /* Bosluga atinca menzil sonunda patlamali */
  const { D, o } = kur("gnp3");
  D.boyut._varliklar = [o];
  zipla(o, 200);
  kontrol("bosa gidince menzil sonunda patladi", D.sayac.patlama.length > 0,
          D.sayac.patlama.length + " patlama");
}
{
  /* Patlama butcesi asilmamali: tick basina 1 */
  const { D, o } = kur("gnp4");
  D.boyut._varliklar = [o];
  zipla(o, 200);
  kontrol("tek atista tek patlama", D.sayac.patlama.length === 1,
          D.sayac.patlama.length + " patlama");
}

console.log("");
console.log("=== 5. GUNES YUMRUGU ===");
{
  const { D, o } = kur("gn5");
  D.boyut._varliklar = [o];
  yetenekDegistir(o);
  kontrol("yetenek Yumruk'a gecti",
          /Yumru/.test(o.onScreenDisplay._son || ""), o.onScreenDisplay._son);

  zipla(o, 30);

  const kurban = mob("k1", 2.5, 90, 0.5);
  sus();
  for (const cb of _durum.entityHurtCb || []) {
    cb({ damageSource: { damagingEntity: o }, hurtEntity: kurban, damage: 1 });
  }
  ac();

  kontrol("yumruk acikken ek hasar verildi", kurban._hasar.length > 0,
          kurban._hasar.join(", ") || "hasar yok");
  kontrol("ek hasar ayardan geldi",
          kurban._hasar.length > 0 && kurban._hasar[0] === ayar.YUMRUK_HASAR,
          String(kurban._hasar[0]));

  /* Referansta koruma yoktu: verilen hasar yeni bir entityHurt
     uretir, o da yine ek hasar eklerse sonsuz donguye girer.
     Bizim applyDamage'imiz de olayi tetiklerse tek kez islenmeli. */
  kontrol("sonsuz donguye girmedi (tek ek hasar)",
          kurban._hasar.length === 1, kurban._hasar.length + " kez");
}
{
  /* SURELI mi: referansta kaliciydi, kapatmayi unutursan
     oyunun sonuna kadar acik kaliyordu.                       */
  const { D, o } = kur("gn6");
  D.boyut._varliklar = [o];
  yetenekDegistir(o);
  zipla(o, ayar.YUMRUK_SURE + 60);

  const kurban = mob("k2", 2.5, 90, 0.5);
  sus();
  for (const cb of _durum.entityHurtCb || []) {
    cb({ damageSource: { damagingEntity: o }, hurtEntity: kurban, damage: 1 });
  }
  ac();
  kontrol("sure dolunca ek hasar bitti (referansta kaliciydi)",
          kurban._hasar.length === 0, kurban._hasar.length + " ek hasar");
}

console.log("");
console.log("=== 6. MENU: server-ui YOKKEN PAKET OLMUYOR ===");
{
  /* En riskli kisim: @minecraft/server-ui ayri bir modul. Statik
     import edilseydi ve modul yoksa PAKETIN TAMAMI olurdu.
     Buraya kadar gelebildiysek zaten olmemis demektir.        */
  const kayit = await import("./pack/yetenekler/kayit.js");
  kontrol("server-ui yokken paket calismaya devam etti",
          kayit.yetenekAl("isin_topu") !== undefined);

  const menu = await import("./pack/menu.js");
  kontrol("menu kendini devre disi birakti",
          menu.menuKullanilabilir() === false,
          String(menu.menuKullanilabilir()));

  const { D, o } = kur("gn7");
  D.boyut._varliklar = [o, mob("z7", 14.5, 90.5, 0.5)];
  o.isSneaking = true;
  sus(); tickIlerlet(5); ac();
  kontrol("menu yokken jestle secim hala calisiyor",
          /Yumru|Isin/.test((() => { yetenekDegistir(o); return o.onScreenDisplay._son || ""; })()),
          o.onScreenDisplay._son);
}

console.log("");
console.log("=== 7. KAYIT ===");
{
  const kayit = await import("./pack/yetenekler/kayit.js");
  for (const y of ["isin_topu", "yumruk"]) {
    kontrol(y + " kayitli", kayit.yetenekAl(y) !== undefined);
  }
  const liste = kayit.esyaninYetenekleri("pa:kol_gunes");
  kontrol("Gunes Kolu 2 yetenege bagli", liste && liste.length === 2,
          liste ? liste.map((t) => t.kimlik).join(", ") : "bagli degil");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> tum Gunes modu testleri gecti");
process.exit(hata ? 1 : 0);
