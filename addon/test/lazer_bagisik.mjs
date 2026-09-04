/* v4.95 -- LAZER ATESE BAGISIK HEDEFI OLDURUYOR MU

   Kullanici: "goz lazerini bayagi denedim 359 vurus yaziyordu
   bekci yani warden olmedi bile."

   Hata OLCULDU: hasar turu "fire" idi, bekci Bedrock'ta
   minecraft:fire_immune tasiyor, yani 500 hasar SIFIRA
   dusuyordu. Sayac vurusu sayiyordu cunku isin gercekten
   deger; sadece hasar hic inmiyordu.

   Bu dosya o hatayi YENIDEN URETIYOR: sahte hedef, tipki
   bekci gibi, cause == "fire" olan her vurusu yutuyor. Eski
   kodla bu test kirmizi yanar.

   Uc sey siniyor:
     1. Hasar turu artik "fire" DEGIL           (kok sebep)
     2. Vurus oldurme sahibine yaziliyor        (tecrube)
     3. Bagisik hedef yine de oluyor            (sonuc)                 */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

esyaKaydet("pa:iksir_nitroksin", "pa:goz_beyaz", "pa:goz_beyaz_lazer");
const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac  = () => { console.warn = w; };

sus();
const mc    = await import("@minecraft/server");
await import("./pack/main.js");
const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");
ac();

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* ---- Sahte BEKCI ----
   Gercek bekcinin tek onemli ozelligi: ates bagisikligi.
   Bedrock'ta bu bir indirim degil, TAM SIFIR. Sahte hedef de
   aynen oyle davraniyor -- cause "fire" ise cana dokunmuyor.

   Cani 500: LAZER_HASAR ile ayni. Yani "hasar indi mi"
   sorusunun cevabi tek vurusta belli oluyor.                */
function bekci(id, x, z, can0 = 500) {
  let can = can0;
  let olduruldu = false;
  return {
    id, typeId: "minecraft:warden", isValid: true,
    location: { x, y: 90, z },
    _hasar: [], _silinenEfekt: [],
    get _can() { return can; },
    get _olduruldu() { return olduruldu; },
    applyDamage(m, s) {
      this._hasar.push({ m, s });
      /* ATES BAGISIKLIGI: gercek bekcinin yaptigi. */
      if (s && s.cause === "fire") return false;
      can = Math.max(0, can - m);
      return true;
    },
    kill() { olduruldu = true; can = 0; return true; },
    addEffect() {}, setOnFire() {},
    removeEffect(ad) { this._silinenEfekt.push(ad); return true; },
    applyKnockback: () => true, applyImpulse: () => true,
    dimension: { playSound() {} },
    getComponent(a) {
      if (a === "minecraft:health") {
        return {
          get currentValue() { return can; },
          effectiveMax: can0, defaultValue: can0,
          setCurrentValue(v) { can = v; }
        };
      }
      return undefined;
    }
  };
}

/* Hicbir seye bagisik OLMAYAN hedef: ayni kodun saglam
   hedefte "kill()" yoluna SAPMADIGINI dogrulamak icin.     */
function normal(id, x, z, can0 = 500) {
  const v = bekci(id, x, z, can0);
  v.typeId = "minecraft:zombie";
  v.applyDamage = function (m, s) {
    this._hasar.push({ m, s });
    const c = this.getComponent("minecraft:health");
    c.setCurrentValue(Math.max(0, c.currentValue - m));
    return true;
  };
  return v;
}

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o._kafa = undefined;
  o.addEffect = () => {}; o.removeEffect = () => {};
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: (s) => (s === "Head" && o._kafa) ? { typeId: o._kafa } : undefined,
    setEquipment: (s, e) => { if (s === "Head") o._kafa = e ? e.typeId : undefined; return true; }
  } : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

/* Lazer iksir icmis olmayi SART kosuyor: goz iksirden geliyor.
   Sahte oyuncu da once icsin.                                */
function iksirIc(o) {
  sus();
  mc.itemCompleteUseTetikle({ source: o, itemStack: { typeId: "pa:iksir_nitroksin" } });
  ac();
}

function lazerBasla(o) {
  iksirIc(o);
  const tanim = kayit.yetenekAl("goz_lazeri");
  sus();
  const is = tanim.olustur(o);
  ac();
  return is;
}

/* Isini n tick cevirir; bitmezse bitir() cagirmaz. */
function cevir(is, tur) {
  sus();
  for (let t = 0; t < tur; t++) {
    butceSifirla();
    if (is.calis()) { if (is.bitir) is.bitir(); ac(); return true; }
    tickIlerlet(1);
  }
  ac();
  return false;
}

console.log("\n=== 1. Hasar turu artik 'fire' degil ===");
kontrol("LAZER_HASAR_SEBEP tanimli", typeof ayar.LAZER_HASAR_SEBEP === "string",
        String(ayar.LAZER_HASAR_SEBEP));
kontrol("'fire' DEGIL  (bekci hatasinin koku)",
        ayar.LAZER_HASAR_SEBEP !== "fire", ayar.LAZER_HASAR_SEBEP);
kontrol("LAZER_BAGISIKLIK_SINIR >= 2  (dokunulmazlik penceresi 1 vurusu yutabilir)",
        ayar.LAZER_BAGISIKLIK_SINIR >= 2, String(ayar.LAZER_BAGISIKLIK_SINIR));

console.log("\n=== 2. Bekci: 500 hasar tek vuruste iniyor mu ===");
{
  const { D, o } = kur("p_bagisik");
  const b = bekci("warden1", 0.5, 6);
  D.boyut._varliklar = [o, b];
  o._kafa = "pa:goz_beyaz_lazer";

  const is = lazerBasla(o);
  kontrol("lazer basladi", !!is);
  cevir(is, 2);

  kontrol("vurus atildi", b._hasar.length > 0, b._hasar.length + " vurus");
  const s = b._hasar[0] && b._hasar[0].s;
  kontrol("sebep 'fire' DEGIL", !!s && s.cause !== "fire",
          s ? String(s.cause) : "sebepsiz");
  kontrol("damagingEntity = atan oyuncu  (tecrube/ganimet icin)",
          !!s && s.damagingEntity === o,
          s && s.damagingEntity ? s.damagingEntity.id : "yok");
  kontrol("BEKCI OLDU  (359 vurus hatasi)", b._can === 0,
          b._can + " can kaldi");
}

console.log("\n=== 3. Yine de bagisik kalirsa isin onu bitiriyor ===");
{
  /* Bu hedef HER TURU yutuyor -- yani tur degistirmek yetmiyor.
     Sinirdan sonra lazer kill() ile bitirmeli.               */
  const { D, o } = kur("p_tam_bagisik");
  const b = bekci("warden2", 0.5, 6);
  b.applyDamage = function (m, s) { this._hasar.push({ m, s }); return false; };
  D.boyut._varliklar = [o, b];
  o._kafa = "pa:goz_beyaz_lazer";

  const is = lazerBasla(o);
  /* Sinira ulasmak icin yeterli vurus: her vurus
     LAZER_VURUS_ARALIK tickte bir.                          */
  const gerek = ayar.LAZER_VURUS_ARALIK * (ayar.LAZER_BAGISIKLIK_SINIR + 1);
  cevir(is, gerek);

  kontrol("sinira kadar vurdu",
          b._hasar.length >= ayar.LAZER_BAGISIKLIK_SINIR,
          b._hasar.length + " vurus");
  kontrol("TAM bagisik hedef yine de olduruldu", b._olduruldu === true);
}

console.log("\n=== 4. Saglam hedefte kill() yoluna SAPMIYOR ===");
{
  /* Onemli: bagisiklik kacamagi, normal hasarin yerini
     ALMAMALI. Canli hedef normal hasarla olmeli, kill() ile
     degil -- yoksa her sey aninda olur ve zirh anlamsizlasir. */
  const { D, o } = kur("p_normal");
  const z = normal("zombi1", 0.5, 6, 5000);   // tek vurusla olmeyecek kadar canli
  D.boyut._varliklar = [o, z];
  o._kafa = "pa:goz_beyaz_lazer";

  const is = lazerBasla(o);
  cevir(is, ayar.LAZER_VURUS_ARALIK * (ayar.LAZER_BAGISIKLIK_SINIR + 1));

  kontrol("hasar indi", z._can < 5000, z._can + " can");
  kontrol("kill() CAGRILMADI  (hasar iniyorsa kacamak kapali)",
          z._olduruldu === false);
}

console.log("\n=== 5. Sayac isinlar arasinda tasinmiyor ===");
{
  /* Sayac isinin OMRUNE ait. Bir isin bagisik hedefe iki kez
     vurup bitse, sonraki isin sifirdan baslamali -- yoksa
     ikinci isin ilk vurusta oldururdu.                       */
  const { D, o } = kur("p_sayac");
  const b = bekci("warden3", 0.5, 6);
  b.applyDamage = function (m, s) { this._hasar.push({ m, s }); return false; };
  D.boyut._varliklar = [o, b];
  o._kafa = "pa:goz_beyaz_lazer";

  const is1 = lazerBasla(o);
  /* Sinirin ALTINDA kalacak kadar vur, sonra isini bitir. */
  cevir(is1, ayar.LAZER_VURUS_ARALIK * (ayar.LAZER_BAGISIKLIK_SINIR - 1));
  if (is1.bitir) { sus(); is1.bitir(); ac(); }
  kontrol("ilk isin oldurmedi (sinira ulasmadi)", b._olduruldu === false,
          b._hasar.length + " vurus");

  const oncekiVurus = b._hasar.length;
  const is2 = lazerBasla(o);
  cevir(is2, 2);   // yeni isinin ILK vurusu
  kontrol("ikinci isinin ilk vurusu oldurmedi  (sayac sifirlanmis)",
          b._olduruldu === false,
          "toplam " + b._hasar.length + " vurus (onceki " + oncekiVurus + ")");
}

console.log(hata ? "\nKALDI: hatalar var\n" : "\ngecti: hepsi\n");
process.exit(hata ? 1 : 0);
