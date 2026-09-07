/* SEYTAN MEYVELERI · Gura · Yami · Ope            v7.64

   Kaynak: Mine Mine no Mi 1.20.10 (11.5) sinif sabit havuzlari
   OKUNARAK (jar calistirilmadi):

     GekishinAbility      -> Gekishin (mermi)
     TenchiMeidoAbility   -> Tenchi Meido (RANGE 26)
     KabutowariAbility    -> Kabutowari
     KurouzuAbility       -> Kurouzu (DAMAGE 30, ceker)
     BlackHoleAbility     -> Kara Delik
     DarkMatterAbility    -> Kara Madde
     RoomAbility          -> ROOM (MIN 8 / MAX 45)
     ShamblesAbility      -> yer degistirme (RANGE 64)
     GammaKnifeAbility    -> DAMAGE 70
     CounterShockAbility  -> ODA sart

   ---- BU DOSYANIN TUTTUGU DORT SEY ----
   1. MEYVE AYRIMI. Her yetenek yalniz kendi meyvesinde.
   2. ODA BAGIMLILIGI. Kaynakta Shambles/Gamma/CounterShock
      hepsi hasRoomActive'den geciyor; bizde de oyle.
   3. KARANLIGIN IPTALI. Yami'yi eserde ustun kilan sey hasar
      degil, hedefin gucunu SOKMESI.
   4. KOL TAKILIYKEN KAPALI -- hem acilmiyor hem suren is
      kesiliyor.                                            */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const mey = await import("./pack/yetenekler/meyve.js");
const ruh = await import("./pack/yetenekler/ruh.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const bul = (k) => [...kayit.tumYetenekler()].find((y) => y.kimlik === k);

let n = 0;
function kur(meyve = "gura", kademe = 0) {
  ruh.ruhUnut(); mey.meyveUnut(); butce.butceSifirla();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "m" + (++n); o.typeId = "minecraft:player";
  o._can = 20; o._maks = 20; o._mesaj = []; o._efekt = [];
  o._ozellik = new Map();
  /* dunya.mjs'in equippable taklidi KORUNUYOR (v7.58 dersi):
     getComponent bastan yazilsaydi kol denetimi kolu goremezdi. */
  const asilGet = o.getComponent.bind(o);
  o.getComponent = (a) => a === "minecraft:health"
    ? { currentValue: o._can, effectiveMax: o._maks, defaultValue: 20 }
    : asilGet(a);
  o.addEffect = (ad, s, x) => { o._efekt.push({ ad, s, a: x && x.amplifier }); return true; };
  o.sendMessage = (m) => o._mesaj.push(m);
  o.runCommand = () => ({ successCount: 1 });
  o.getDynamicProperty = (k) => o._ozellik.get(k);
  o.setDynamicProperty = (k, v) => { o._ozellik.set(k, v); };
  _durum.oyuncular = [o];
  mey.meyveYaz(o, meyve);
  ruh.ruhYaz(o, ayar.RUH_TAVAN);
  if (kademe > 0) ruh.kademeAyarla(o, kademe);
  return { D, o };
}
function kurban(id, konum, efektler = []) {
  const ef = new Set(efektler);
  return {
    id, typeId: "minecraft:zombie", isValid: true, location: konum,
    _hasar: 0, _kez: 0, _itmeYon: 0, _itme: 0, _efekt: [], _isinma: [],
    _kalan: ef,
    applyDamage(h) { this._hasar += h; this._kez++; return true; },
    addEffect(a, s) { this._efekt.push({ a, s }); return true; },
    removeEffect(a) { return this._kalan.delete(a); },
    applyKnockback(x, z, g) { this._itmeYon = x; this._itme = g; return true; },
    teleport(k) { this._isinma.push({ x: k.x, y: k.y, z: k.z }); this.location = k; return true; },
    setOnFire() { return true; }, hasTag: () => false
  };
}
function koluTak(o, esya) { o._elde = esya; }
const yurut = (is, kere = 900) => {
  for (let i = 0; i < kere; i++) { if (is.calis()) return i; tickIlerlet(1); }
  return -1;
};

const GURA = ["gura_gekishin", "gura_tenchi", "gura_kabuto"];
const YAMI = ["yami_kurouzu", "yami_delik", "yami_madde"];
const OPE  = ["ope_oda", "ope_shambles", "ope_gamma", "ope_sok"];

console.log("=== 0. ON YETENEK + SECIM KAYITLI ===");
for (const k of [...GURA, ...YAMI, ...OPE, "meyve_sec"]) {
  kontrol(k + " kayitli", !!bul(k), bul(k) ? bul(k).ad : "yok");
}
kontrol("hepsi 560+ sirada (onceki aileler bozulmadi)",
        [...GURA, ...YAMI, ...OPE, "meyve_sec"].every((k) => bul(k).sira >= 560),
        [...GURA, ...YAMI, ...OPE, "meyve_sec"].map((k) => bul(k).sira).join(","));

console.log("=== 1. UC MEYVE, ESERIN KENDI METNINDEN ===");
{
  kontrol("uc meyve tanimli", ayar.MEYVE_LISTESI.length === 3,
          ayar.MEYVE_LISTESI.map((m) => m.ad).join(" · "));
  const kimlikler = ayar.MEYVE_LISTESI.map((m) => m.kimlik).sort().join(",");
  kontrol("gura · ope · yami", kimlikler === "gura,ope,yami", kimlikler);
  /* Sahipler kaynak eserden; yanlis sahip yanlis meyve demek. */
  const sahip = {};
  for (const m of ayar.MEYVE_LISTESI) sahip[m.kimlik] = m.sahip;
  kontrol("Gura -> Edward Newgate", sahip.gura === "Edward Newgate", sahip.gura);
  kontrol("Yami -> Marshall D. Teach", sahip.yami === "Marshall D. Teach", sahip.yami);
  kontrol("Ope -> Trafalgar D. Water Law",
          sahip.ope === "Trafalgar D. Water Law", sahip.ope);
}

console.log("=== 2. MEYVE AYRIMI ===");
{
  const esles = {};
  for (const k of GURA) esles[k] = "gura";
  for (const k of YAMI) esles[k] = "yami";
  for (const k of OPE)  esles[k] = "ope";
  for (const [kimlik, dogru] of Object.entries(esles)) {
    let iyi = true, not = "";
    for (const mv of ["gura", "yami", "ope"]) {
      const { D, o } = kur(mv, 0);
      D.boyut.getEntities = () => [];
      /* Oda gerektirenler icin once ODA aciliyor, yoksa
         "yanlis meyve" ile "oda yok" birbirine karisir.    */
      if (dogru === "ope" && kimlik !== "ope_oda" && mv === "ope") {
        const odaIs = bul("ope_oda").olustur(o);
        if (odaIs) odaIs.calis();
      }
      const once = ruh.ruhOku(o);
      bul(kimlik).olustur(o);
      const harcandi = once - ruh.ruhOku(o);
      if (mv === dogru ? harcandi <= 0 : harcandi !== 0) {
        iyi = false; not += mv + ":" + harcandi + " ";
      }
    }
    kontrol(kimlik + " yalniz " + dogru, iyi, not);
  }
}

console.log("=== 3. ADLA SECIM ===");
{
  const { o } = kur("gura", 0);
  for (const [yaz, bek] of [["yami", "yami"], ["karanlik", "yami"],
                            ["ope", "ope"], ["oda", "ope"],
                            ["gura", "gura"], ["titrek", "gura"],
                            ["QUAKE", "gura"], ["room", "ope"]]) {
    mey.meyveSec(o, yaz);
    kontrol('"' + yaz + '" -> ' + bek, mey.meyveOku(o) === bek, mey.meyveOku(o));
  }
  const once = mey.meyveOku(o);
  const cevap = mey.meyveSec(o, "mera");
  kontrol("taninmayan ad meyveyi DEGISTIRMIYOR", mey.meyveOku(o) === once);
  kontrol("taninmayan ad uc secenegi de yaziyor",
          ["gura", "yami", "ope"].every((x) => cevap.indexOf(x) >= 0), cevap);
  const sb = readFileSync("./pack/sohbet.js", "utf8");
  kontrol("sohbet.js MEYVE_LISTESI'nden okuyor (liste kopyalanmamis)",
          /MEYVE_LISTESI/.test(sb));
  kontrol("sohbet.js meyveSec kancasini cagiriyor", /cagir\("meyveSec"/.test(sb));
  /* jest sirasindan da secilebilmeli. */
  const { o: o2 } = kur("gura", 0);
  const gorulen = [];
  for (let i = 0; i < 4; i++) { bul("meyve_sec").olustur(o2); gorulen.push(mey.meyveOku(o2)); }
  kontrol("jestle uc meyveyi de dolasti", new Set(gorulen).size === 3,
          gorulen.join(" -> "));
  kontrol("basa donuyor", gorulen[3] === gorulen[0]);
}

console.log("=== 4. ODA BAGIMLILIGI (kaynaktaki hasRoomActive) ===");
{
  /* Kaynakta Shambles · Gamma Knife · Counter Shock ucu de
     RoomAbility.hasRoomActive denetiminden geciyor.        */
  for (const k of ["ope_shambles", "ope_gamma", "ope_sok"]) {
    const { D, o } = kur("ope", 0);
    const h = kurban("o_" + k, { x: 3, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    const once = ruh.ruhOku(o);
    bul(k).olustur(o);
    kontrol(k + ": ODA YOKKEN calismiyor",
            h._hasar === 0 && h._isinma.length === 0 && ruh.ruhOku(o) === once,
            "hasar " + h._hasar + " ruh " + ruh.ruhOku(o));
  }
  /* Oda acikken calisiyor. */
  const { D, o } = kur("ope", 0);
  const h = kurban("o_var", { x: 3, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  const odaIs = bul("ope_oda").olustur(o);
  kontrol("ODA acildi", !!odaIs && mey.odaAcikMi(o.id));
  bul("ope_gamma").olustur(o);
  kontrol("oda acikken Gamma Knife VURUYOR", h._hasar > 0,
          "hasar " + h._hasar.toFixed(1));
  kontrol("Gamma Knife zayiflik da veriyor",
          h._efekt.some((e) => e.a === "weakness"));
  /* ---- SURESI DOLAN ODA  (davranis) ----
     odaAcikMi'nin sure denetimi ikinci bir kapi: is henuz
     tiklamamisken sure dolmus olabilir. Mutasyon o satiri
     silince hicbir test kirilmiyordu, cunku her bolum odayi
     bitir() ile kapatiyordu.                               */
  {
    const { D: D3, o: o3 } = kur("ope", 0);
    const h3 = kurban("o_sure", { x: 3, y: 90.6, z: 0.5 });
    D3.boyut.getEntities = () => [h3];
    const is3 = bul("ope_oda").olustur(o3);
    is3.calis();
    kontrol("acilinca oda ACIK", mey.odaAcikMi(o3.id));
    /* Is CALISTIRILMADAN sure ilerletiliyor. */
    tickIlerlet(ayar.OPE_ODA_SURE + 5);
    kontrol("suresi dolunca oda KAPALI sayiliyor", !mey.odaAcikMi(o3.id));
    bul("ope_gamma").olustur(o3);
    kontrol("suresi dolmus odada Gamma Knife calismiyor", h3._hasar === 0,
            "hasar " + h3._hasar);
  }

  /* Oda kapaninca yine kapaniyor. */
  odaIs.bitir();
  kontrol("oda kapaninca defter temiz", !mey.odaAcikMi(o.id));
  const h2 = kurban("o_son", { x: 3, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h2];
  bul("ope_sok").olustur(o);
  kontrol("oda kapandiktan sonra Counter Shock calismiyor", h2._hasar === 0);
}

console.log("=== 5. KARANLIGIN IPTALI (Yami'nin imzasi) ===");
{
  /* Yami'yi eserde ustun kilan sey hasar degil, hedefin
     gucunu SOKMESI. Sadece hasar veren bir cekme bu meyveyi
     meyve yapan seyi disarida birakirdi.                   */
  const { D, o } = kur("yami", 0);
  const h = kurban("y1", { x: 4, y: 90.6, z: 0.5 },
                   ["strength", "speed", "resistance", "wither", "poison"]);
  D.boyut.getEntities = () => [h];
  bul("yami_kurouzu").olustur(o);
  kontrol("hasar verdi", h._hasar > 0, "hasar " + h._hasar.toFixed(1));
  kontrol("KENDINE cekti (itme degil)", h._itmeYon < 0, "yon " + h._itmeYon.toFixed(1));
  kontrol("faydali efektler SOKULDU",
          !h._kalan.has("strength") && !h._kalan.has("speed") &&
          !h._kalan.has("resistance"), [...h._kalan].join(","));
  /* Zararlilara DOKUNULMUYOR: iptal bir yardim degil. */
  kontrol("zararli efektlere DOKUNULMADI",
          h._kalan.has("wither") && h._kalan.has("poison"),
          [...h._kalan].join(","));
  /* Gura'nin hamlesi iptal etmiyor: imza yalniz Yami'nin. */
  const { D: D2, o: o2 } = kur("gura", 0);
  const h2 = kurban("g1", { x: 4, y: 90.6, z: 0.5 }, ["strength", "speed"]);
  D2.boyut.getEntities = () => [h2];
  bul("gura_tenchi").olustur(o2);
  kontrol("Gura iptal ETMIYOR (imza yalniz Yami'nin)",
          h2._kalan.has("strength") && h2._hasar > 0,
          [...h2._kalan].join(",") + " hasar " + h2._hasar.toFixed(0));
}

console.log("=== 6. GURA: ITER, YAMI: CEKER ===");
{
  const { D, o } = kur("gura", 0);
  const h = kurban("i1", { x: 6, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  bul("gura_tenchi").olustur(o);
  kontrol("Tenchi Meido UZAGA itti", h._itmeYon > 0, "yon " + h._itmeYon.toFixed(1));
  kontrol("Tenchi menzili kaynaktaki gibi 26",
          ayar.GURA_TENCHI_YARICAP === 26, "" + ayar.GURA_TENCHI_YARICAP);
  /* ARKADAKINI de tutmali: alan, koni degil. */
  const { D: D2, o: o2 } = kur("gura", 0);
  const arka = kurban("i2", { x: -8, y: 90.6, z: 0.5 });
  D2.boyut.getEntities = () => [arka];
  bul("gura_tenchi").olustur(o2);
  kontrol("Tenchi ARKADAKINI de tuttu (alan)", arka._hasar > 0);
}

console.log("=== 7. MERMILER VE CARPAN ===");
{
  for (const [k, mv, ayarHasar] of [["gura_gekishin", "gura", ayar.GURA_GEKISHIN_HASAR],
                                    ["yami_madde", "yami", ayar.YAMI_MADDE_HASAR]]) {
    const { D, o } = kur(mv, 2);
    const h = kurban("p_" + k, { x: 10, y: 90.6, z: 0.5 });
    D.boyut.getEntities = (s) => {
      const dx = h.location.x - s.location.x, dz = h.location.z - s.location.z;
      return Math.sqrt(dx * dx + dz * dz) <= s.maxDistance ? [h] : [];
    };
    const is = bul(k).olustur(o);
    kontrol(k + " is acildi", !!is);
    yurut(is);
    const bek = ayarHasar * ayar.RUH_KADEMELER[2].carpan;
    kontrol(k + " hasar CARPANLA olcekli",
            Math.abs(h._hasar - bek) < 0.01,
            h._hasar.toFixed(1) + " ~ " + bek.toFixed(1));
    kontrol(k + " ayni hedefe TEK kez", h._kez === 1, h._kez + " kez");
  }
}

console.log("=== 8. SHAMBLES: TAKAS VE HAVA DENETIMI ===");
{
  /* Isinlanma iki denetimden geciyor (v7.57 Berserk dersi):
     varis yeri VE ustu hava olacak. Burada TAKAS oldugu icin
     iki taraf da denetleniyor.                             */
  const { D, o } = kur("ope", 0);
  const h = kurban("s1", { x: 6, y: 90, z: 0.5 });
  D.boyut.getEntities = () => [h];
  const odaIs = bul("ope_oda").olustur(o);
  odaIs.calis();
  bul("ope_shambles").olustur(o);
  kontrol("hedef yer degistirdi", h._isinma.length > 0,
          h._isinma.length + " isinma");
  kontrol("oyuncu da yer degistirdi", (o._isinlanma || []).length > 0,
          ((o._isinlanma || []).length) + " isinma");
}
{
  /* Varis yeri DOLU: takas OLMAMALI. */
  const { D, o } = kur("ope", 0);
  const h = kurban("s2", { x: 6, y: 90, z: 0.5 });
  D.boyut.getEntities = () => [h];
  for (let x = 4; x <= 8; x++)
    for (let y = 89; y <= 93; y++)
      D.boyut.getBlock({ x, y, z: 0 }).setType("minecraft:stone");
  const odaIs = bul("ope_oda").olustur(o);
  odaIs.calis();
  bul("ope_shambles").olustur(o);
  kontrol("DUVARA takas yapilmadi", h._isinma.length === 0,
          h._isinma.length + " isinma");
}

console.log("=== 9. KOL TAKILIYKEN KAPALI ===");
{
  const esya = "pa:kol_toprak";
  {
    const { D, o } = kur("gura", 0);
    const h = kurban("k1", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    koluTak(o, esya);
    const once = ruh.ruhOku(o);
    bul("gura_tenchi").olustur(o);
    kontrol("kol takiliyken vurmuyor", h._hasar === 0);
    kontrol("kol takiliyken ruh da harcanmiyor", ruh.ruhOku(o) === once);
  }
  {
    /* SOL el de kesmeli (v7.58'de mutasyon yakalamisti). */
    const { D, o } = kur("ope", 0);
    D.boyut.getEntities = () => [];
    const asilGet = o.getComponent.bind(o);
    o.getComponent = (a) => a === "minecraft:equippable"
      ? { getEquipment: (s) => (s === "Offhand" ? { typeId: esya } : undefined) }
      : asilGet(a);
    kontrol("SOL eldeki kol da engelliyor",
            bul("ope_oda").olustur(o) === undefined);
  }
  {
    /* SUREN IS de kesilmeli. */
    const { D, o } = kur("yami", 0);
    const h = kurban("k2", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    const is = bul("yami_delik").olustur(o);
    for (let i = 0; i < ayar.YAMI_DELIK_ADIM * 2 + 2; i++) { is.calis(); tickIlerlet(1); }
    const once = h._kez;
    kontrol("kol takilmadan once vurdu", once > 0, once + " vurus");
    koluTak(o, esya);
    kontrol("kol takilinca alan BITTI", is.calis() === true);
    for (let i = 0; i < 40; i++) { is.calis(); tickIlerlet(1); }
    kontrol("kol takildiktan sonra HIC vurmadi", h._kez === once);
  }
  {
    /* Kol OLMAYAN esya engellememeli. */
    const { D, o } = kur("gura", 0);
    const h = kurban("k3", { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    koluTak(o, "minecraft:diamond_sword");
    bul("gura_tenchi").olustur(o);
    kontrol("elmas kilic engellemiyor (kol degil)", h._hasar > 0);
  }
}

console.log("=== 10. ALANLAR KAPANIYOR, GUC YETMEZSE ACILMIYOR ===");
{
  for (const [k, mv, sure] of [["yami_delik", "yami", ayar.YAMI_DELIK_SURE],
                               ["ope_oda", "ope", ayar.OPE_ODA_SURE]]) {
    const { D, o } = kur(mv, 0);
    D.boyut.getEntities = () => [];
    const is = bul(k).olustur(o);
    const bitti = yurut(is, sure + 120);
    kontrol(k + " kendiliginden kapandi", bitti >= 0, bitti + " tick");
    kontrol(k + " sureye gore kapandi (~" + sure + ")",
            bitti >= 0 && bitti <= sure + 40, bitti + " tick");
  }
  const pahali = [["gura_tenchi", "gura", ayar.GURA_TENCHI_BEDEL],
                  ["yami_kurouzu", "yami", ayar.YAMI_KUROUZU_BEDEL],
                  ["ope_oda", "ope", ayar.OPE_ODA_BEDEL]];
  for (const [k, mv, bedel] of pahali) {
    const { D, o } = kur(mv, 0);
    const h = kurban("r_" + k, { x: 4, y: 90.6, z: 0.5 });
    D.boyut.getEntities = () => [h];
    ruh.ruhYaz(o, bedel - 1);
    const is = bul(k).olustur(o);
    if (is) yurut(is, 60);
    kontrol(k + ": guc yetmezse HIC calismiyor",
            is === undefined && h._hasar === 0,
            (is ? "is acildi " : "") + "hasar " + h._hasar);
    kontrol(k + ": guc yetmezse harcanmadi", ruh.ruhOku(o) >= bedel - 1);
  }
}

console.log("=== 11. DEFTER TEMIZ ===");
{
  const m = readFileSync("./pack/main.js", "utf8");
  for (const f of ["meyveUnut", "odaUnut"]) {
    kontrol("main.js " + f + " cagiriyor",
            new RegExp(f + "\\(olay\\.playerId\\)").test(m));
  }
  kontrol("main.js meyve.js'i yukluyor", /yetenekler\/meyve\.js/.test(m));
}
{
  /* Dinamik ozellik yokken de meyve ayri kalmali. EN SONA. */
  const { o } = kur("gura", 0);
  o.setDynamicProperty = () => { throw new Error("yok"); };
  o.getDynamicProperty = () => { throw new Error("yok"); };
  mey.meyveYaz(o, "ope");
  kontrol("bellek yolunda meyve yazildi", mey.meyveOku(o) === "ope",
          mey.meyveOku(o));
  /* BIR oyuncunun arizasi HERKESI etkilememeli (v7.62 dersi). */
  const saglam = { id: "saglam", _o: new Map(),
    setDynamicProperty(k, v) { this._o.set(k, v); },
    getDynamicProperty(k) { return this._o.get(k); } };
  mey.meyveYaz(saglam, "yami");
  kontrol("SAGLAM oyuncu dinamik ozellikte kaldi",
          saglam._o.size > 0 && mey.meyveOku(saglam) === "yami");
  mey.meyveUnut(o.id);
  kontrol("cikinca bellekteki meyve unutuldu",
          mey.meyveOku(o) === ayar.MEYVE_VARSAYILAN, mey.meyveOku(o));
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
