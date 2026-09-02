/* v4.68 -- LAZERIN SERTLIGI

   Kullanici: "goz lazerini guclendir, full elmas setli birinin
   elmas zirhinin tumunu yari canina indirsin... ayrica elmas
   setli o kisinin yarim kalplik cani kalsin... kalkan tuttugu
   zaman da o da 1-2 saniye icinde parcalansin."

   Uc sey sinaniyor, ucu de SONUC uzerinden -- "kod boyle
   yaziyor" degil, "elmas setli sahte oyuncuya ne oldu".     */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, esyaKaydet, _durum } from "@minecraft/server";

esyaKaydet("pa:iksir_nitroksin", "pa:goz_beyaz", "pa:goz_beyaz_lazer");
const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
const mc = await import("@minecraft/server");
await import("./pack/main.js");
const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const { butceSifirla } = await import("./pack/butce.js");
ac();

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

/* ---- Sahte esya: gercek ItemStack gibi durability bileseni ---- */
function esya(tip, maks, hasar = 0) {
  const d = { maxDurability: maks, damage: hasar };
  return {
    typeId: tip,
    getComponent: (a) => (a === "minecraft:durability") ? d : undefined,
    _day: d
  };
}

/* ---- Full elmas setli, kalkanli, 20 canli hedef ---- */
function elmasli(id, x, z) {
  const yuvalar = {
    Head:  esya("minecraft:diamond_helmet", 363),
    Chest: esya("minecraft:diamond_chestplate", 528),
    Legs:  esya("minecraft:diamond_leggings", 495),
    Feet:  esya("minecraft:diamond_boots", 429),
    Offhand: esya("minecraft:shield", 336)
  };
  let can = 20;
  const v = {
    id, typeId: "minecraft:player", isValid: true,
    location: { x, y: 90, z },
    _hasar: [], _yuvalar: yuvalar, _silinenEfekt: [],
    get _can() { return can; },
    applyDamage(m) { this._hasar.push(m); can = Math.max(0, can - m * 0.2); return true; },
    addEffect() {}, setOnFire() {},
    /* v4.81: lazer emilimi siliyor -- o kalpler health'in
       disinda ve hasar indiriminden sonra bir vurusu
       emebiliyor. Sahte hedef de bunu kaydetsin.        */
    removeEffect(ad) { this._silinenEfekt.push(ad); return true; },
    applyKnockback: () => true, applyImpulse: () => true,
    dimension: { playSound() {} },
    getComponent(a) {
      if (a === "minecraft:equippable") {
        return {
          getEquipment: (y) => yuvalar[y],
          setEquipment: (y, e) => { yuvalar[y] = e; return true; }
        };
      }
      if (a === "minecraft:health") {
        return {
          get currentValue() { return can; },
          effectiveMax: 20, defaultValue: 20,
          setCurrentValue(x2) { can = x2; }
        };
      }
      return undefined;
    }
  };
  return v;
}

function kur(id) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = id; o.typeId = "minecraft:player"; o._kafa = undefined;
  o.addEffect = () => {}; o.removeEffect = () => {};
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: (s2) => (s2 === "Head" && o._kafa) ? { typeId: o._kafa } : undefined,
    setEquipment: (s2, e) => { if (s2 === "Head") o._kafa = e ? e.typeId : undefined; return true; }
  } : undefined;
  _durum.oyuncular = [o];
  return { D, o };
}

function lazerBasla(o) {
  const tanim = kayit.yetenekAl("goz_lazeri");
  sus();
  const is = tanim.olustur(o);
  ac();
  return is;
}

function cevir(is, tur) {
  sus();
  for (let t = 0; t < tur; t++) {
    butceSifirla();
    if (is.calis()) { if (is.bitir) is.bitir(); return true; }
    tickIlerlet(1);
  }
  ac();
  return false;
}

/* Tek VURUS araligi kadar cevir: ilk vurus olsun, ikincisi
   olmasin. Sureli isinda "ne oldu" sorusunun cevabi kac vurus
   attigina bagli.                                            */
function tekVurus(o) {
  const is = lazerBasla(o);
  if (is) cevir(is, Math.max(1, ayar.LAZER_VURUS_ARALIK - 2));
  return is;
}

console.log("=== 1. FULL ELMAS SETLI HEDEF ===");
const { D, o } = kur("g1");
const kurban = elmasli("k1", 0.5, 6);
D.boyut._varliklar = [kurban];

const oncekiDay = {};
for (const y of ["Head", "Chest", "Legs", "Feet"]) {
  oncekiDay[y] = kurban._yuvalar[y]._day.maxDurability;
}

sus();
mc.itemCompleteUseTetikle({ source: o, itemStack: { typeId: "pa:iksir_nitroksin" } });
tickIlerlet(2);
ac();
const is1 = tekVurus(o);

console.log("\n=== 2. TEK VURUS: OLDURUYOR MU (v4.81) ===");
/* ---- BU BOLUM TERSINE DONDU ----
   v4.68 - v4.80 arasi burada "yarim kalpte KALDI mi" sinaniyordu:
   lazer zirhli bir hedefi oldurmuyor, canini 1 puana cekiyordu.

   Kullanici kaldirdi: "lazerin cani yarim kalpte birakmasi
   olayini tamamen kaldiriyoruz... tamamen oldursun."

   Sebep saglam: isin yarim saniyede bir vuruyor ve suresi 30
   saniye. Yani hedef 60 kez sabitleniyor ve HICBIR ZAMAN
   olmuyordu. Kural kisa atista anlamliydi, sureli isinda
   tersine calisiyordu.                                       */
kontrol("hedef hasar aldi", kurban._hasar.length > 0, kurban._hasar.join(","));
kontrol("ILK vurus tam hasar (tepki hasari yok)",
        kurban._hasar[0] === ayar.LAZER_HASAR,
        "ilk hasar " + kurban._hasar[0]);
kontrol("full elmas setli hedef TEK VURUSTA oldu",
        kurban._can === 0, kurban._can + " can kaldi");
/* Sabitleme kodu geri sizmasin: ayarlarin ikisi de gitmis
   olmali, yoksa eski dal sessizce yeniden acilir.          */
kontrol("can tavani ayarlari kaldirildi",
        ayar.LAZER_BIRAKILAN_CAN === undefined &&
        ayar.LAZER_TEPKI_HASARI === undefined,
        "birakilan=" + ayar.LAZER_BIRAKILAN_CAN +
        " tepki=" + ayar.LAZER_TEPKI_HASARI);
/* Emilim kalpleri ayri havuz: silinmezse ilk vurusu onlar
   yer ve iksirlerimizin HEPSINDE emilim var.                */
kontrol("emilim silindi (o kalpler health'in disinda)",
        kurban._silinenEfekt.includes("absorption"),
        kurban._silinenEfekt.join(",") || "hicbiri");

console.log("\n=== 3. ZIRH: BITME NOKTASINA INDI MI ===");
/* v4.69: kullanici "neredeyse tum canina goturSun, elmas bir
   kilic ile bir defa vurdugunda tum hepsi ayni anda kirilsin"
   dedi. Yani yarilama degil, BITME NOKTASINA cekme.        */
for (const y of ["Head", "Chest", "Legs", "Feet"]) {
  const e = kurban._yuvalar[y];
  const maks = oncekiDay[y];
  const kalan = maks - e._day.damage;
  kontrol(y.padEnd(6) + " bitme noktasina indi",
          kalan === ayar.LAZER_ZIRH_KALAN,
          "kalan " + kalan + "/" + maks);
}
kontrol("dort parcanin da kalani AYNI (hepsi birlikte kirilir)",
        new Set(["Head", "Chest", "Legs", "Feet"].map(
          (y) => kurban._yuvalar[y]._day.maxDurability -
                 kurban._yuvalar[y]._day.damage)).size === 1);
kontrol("kalan, tek elmas kilic vurusunun altinda",
        ayar.LAZER_ZIRH_KALAN <= 2, String(ayar.LAZER_ZIRH_KALAN));

console.log("\n=== 4. ZATEN YIPRANMIS ZIRH ONARILMIYOR ===");
{
  const { D: D2, o: o2 } = kur("g2");
  const k2 = elmasli("k2", 0.5, 6);
  k2._yuvalar.Head._day.damage = 350;      // 363'te 13 can kalmis
  D2.boyut._varliklar = [k2];
  sus();
  mc.itemCompleteUseTetikle({ source: o2, itemStack: { typeId: "pa:iksir_nitroksin" } });
  tickIlerlet(2);
  ac();
  tekVurus(o2);
  kontrol("cok yipranmis kask ONARILMADI",
          k2._yuvalar.Head._day.damage >= 350,
          "hasar " + k2._yuvalar.Head._day.damage + " (350 idi)");
}

console.log("\n=== 5. KALKAN 1-2 SANIYEDE PARCALANDI MI ===");
{
  const { D: D3, o: o3 } = kur("g3");
  const k3 = elmasli("k3", 0.5, 6);
  D3.boyut._varliklar = [k3];
  sus();
  mc.itemCompleteUseTetikle({ source: o3, itemStack: { typeId: "pa:iksir_nitroksin" } });
  tickIlerlet(2);
  ac();

  const is = lazerBasla(o3);
  /* Once KISA cevir: kalkan HENUZ durmali */
  cevir(is, 5);
  kontrol("kalkan hemen yok OLMADI (once kirmiziya doner)",
          k3._yuvalar.Offhand !== undefined,
          "kalkan aninda silinmis");
  const day = k3._yuvalar.Offhand && k3._yuvalar.Offhand._day;
  kontrol("kalkanin dayanikligi bitme noktasina cekildi",
          day && day.maxDurability - day.damage <= 1,
          day ? (day.maxDurability - day.damage) + " kalmis" : "yok");

  /* Sure dolana kadar cevir */
  cevir(is, ayar.LAZER_KALKAN_SURESI + 20);
  kontrol("sure dolunca kalkan PARCALANDI",
          k3._yuvalar.Offhand === undefined,
          "kalkan hala duruyor");
  kontrol("kirilma suresi 1-2 saniye arasi",
          ayar.LAZER_KALKAN_SURESI >= 20 && ayar.LAZER_KALKAN_SURESI <= 40,
          ayar.LAZER_KALKAN_SURESI + " tick = " +
          (ayar.LAZER_KALKAN_SURESI / 20) + " sn");
}

console.log("\n=== 6. ISIN SURESI (v4.69) ===");
{
  /* Kullanici: "en azindan bir 25 saniye daha ekleyelim."
     Onceki deger 10 tick = 0,5 sn idi ve o bile SADECE
     gorunurluk suresiydi (lazer tek atisti).              */
  kontrol("isin en az 25 saniye suruyor",
          ayar.LAZER_SURE >= 25 * 20,
          ayar.LAZER_SURE + " tick = " + (ayar.LAZER_SURE / 20) + " sn");
  kontrol("acikken tekrar tekrar vuruyor",
          ayar.LAZER_VURUS_ARALIK > 0 && ayar.LAZER_VURUS_ARALIK <= 20,
          "her " + ayar.LAZER_VURUS_ARALIK + " tick");
  const vurusSayisi = Math.floor(ayar.LAZER_SURE / ayar.LAZER_VURUS_ARALIK);
  kontrol("tek tutusta cok vurus atiyor", vurusSayisi >= 25,
          vurusSayisi + " vurus");
  /* Her tick taramak tablette pahali olurdu */
  kontrol("her tick TARAMIYOR (tablet yuku)",
          ayar.LAZER_VURUS_ARALIK > 1);
  kontrol("her tick CIZMIYOR", ayar.LAZER_CIZIM_ARALIK > 1);
  kontrol("ham hasar zirhsiz oyuncuyu (20 can) asiyor",
          ayar.LAZER_HASAR > 20, ayar.LAZER_HASAR + " > 20");
}

/* ============================================================
   MENZIL SINIRI  (v4.77: 14 -> 17 blok)

   Menzil IKI YERDE yaziyor: ayarlar.js LAZER_MENZIL (hasar) ve
   kol_uret.py LAZER_ISIN_MENZIL (isin modelinin boyu). doku.mjs
   ikisinin ESIT oldugunu kilitliyor; burasi hasar tarafinin
   gercekten o mesafeye ULASTIGINI sinar.

   Ikisi ayrisirsa oyunda su gorunur: isin 17 blok uzuyor ama
   16 bloktaki seye vurmuyor (ya da tersi, gorunmeyen yerden
   vuruyor). Ikisi de sessiz, ikisi de sinir bozucu.
   ============================================================ */
console.log("");
console.log("=== 4. MENZIL SINIRI (" + ayar.LAZER_MENZIL + " blok) ===");
{
  const M = ayar.LAZER_MENZIL;
  /* Oyuncu +z yonune bakiyor, kafasi z = 0,5'te.
     ileri = hedefin z'si - 0,5.                              */
  const dene = (id, ileri) => {
    const { D, o } = kur(id);
    const kurban = elmasli("h_" + id, 0.5, 0.5 + ileri);
    D.boyut._varliklar = [kurban];
    sus();
    mc.itemCompleteUseTetikle({ source: o, itemStack: { typeId: "pa:iksir_nitroksin" } });
    tickIlerlet(2);
    ac();
    tekVurus(o);
    return kurban._hasar.length > 0;
  };

  kontrol("menzilin ICINDEKI hedef vuruldu (" + (M - 1) + " blok)",
          dene("m1", M - 1) === true);
  kontrol("tam sinirdaki hedef vuruldu (" + M + " blok)",
          dene("m2", M) === true);
  kontrol("menzil DISINDAKI hedef vurulmadi (" + (M + 2) + " blok)",
          dene("m3", M + 2) === false);
  /* Eski menzil 14'tu; 15-17 arasi ARTIK vurulmali. Bu satir
     "sayiyi degistirdim ama bir yer 14'te kaldi" hatasini
     yakalar.                                                 */
  kontrol("eski menzilin (14) otesi artik vuruluyor",
          M <= 14 || dene("m4", 15) === true, M + " blok");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> lazer yeterince sert");
process.exit(hata ? 1 : 0);
