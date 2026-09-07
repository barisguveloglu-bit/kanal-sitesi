/* SIMBIYOT · APEX FORM                                v7.61

   Kaynak: symbiote 1.1.2 (Scout) sinif sabit havuzlari
   OKUNARAK (jar calistirilmadi):

     SymbioteStrain    -> GUARDIAN·PREDATOR·SHADOW·SCULK·ROYAL
     BondStage         -> UNBONDED..DOMINANT
     Carapace          -> DAMAGE_REDUCTION 0.65
     Frenzy            -> STRIKE_INTERVAL 8 · RANGE 6 · DAMAGE 7
     CrownedOnslaught  -> CROWN (yalniz ROYAL)
     ApexForm          -> tus adi "Apex Form (Dominant)"

   ---- BU DOSYANIN TUTTUGU UC SEY ----
   1. DUGME EN GUCLUSUNU VERIYOR. Kullanicinin tek istegi
      buydu; "en guclu" LISTEDEN okunuyor, elle yazilmiyor.
   2. FORMUN CIKISI VAR. Sureli, tekrar dokununca kapaniyor,
      ruh yetmezse hic acilmiyor. Depo kurali: kalici hicbir
      etki cikissiz olmaz.
   3. DIRENC V DEGIL. Carapace 0.65 -> Direnc III. Direnc V
      dokunulmazlik demek ve bu depoda yasak.               */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";

const w = console.warn;
console.warn = () => {};
await import("./pack/main.js");
console.warn = w;

const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const sim = await import("./pack/yetenekler/simbiyot.js");
const ruh = await import("./pack/yetenekler/ruh.js");
const butce = await import("./pack/butce.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const bul = (k) => [...kayit.tumYetenekler()].find((y) => y.kimlik === k);

let n = 0;
function kur(kademe = 0) {
  ruh.ruhUnut(); sim.simbiyotUnut(); butce.butceSifirla();
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "s" + (++n); o.typeId = "minecraft:player";
  o._can = 20; o._maks = 20; o._mesaj = []; o._efekt = [];
  o._ozellik = new Map();
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
  ruh.ruhYaz(o, ayar.RUH_TAVAN);
  if (kademe > 0) ruh.kademeAyarla(o, kademe);
  return { D, o };
}
function kurban(id, konum) {
  return {
    id, typeId: "minecraft:zombie", isValid: true, location: konum,
    _hasar: 0, _kez: 0,
    applyDamage(h) { this._hasar += h; this._kez++; return true; },
    addEffect() { return true; }, setOnFire() { return true; },
    hasTag: () => false
  };
}
const yurut = (is, kere = 900) => {
  for (let i = 0; i < kere; i++) { if (is.calis()) return i; tickIlerlet(1); }
  return -1;
};

console.log("=== 0. KAYIT VE SIRA ===");
kontrol("simbiyot kayitli", !!bul("simbiyot"), bul("simbiyot") && bul("simbiyot").ad);
kontrol("550 sirada (onceki aileler bozulmadi)",
        bul("simbiyot").sira >= 550, "" + bul("simbiyot").sira);

console.log("=== 1. EN GUCLUSU LISTEDEN OKUNUYOR ===");
{
  /* Kullanicinin istegi "butona basinca en guclusunu versin".
     Elle "royal" yazilsaydi listeye yeni bir sus eklenince
     burasi geride kalirdi -- olcut LISTENIN SONU.          */
  kontrol("bes sus var (kaynaktaki SymbioteStrain)",
          ayar.SIMBIYOT_SUSLAR.length === 5,
          ayar.SIMBIYOT_SUSLAR.map((s) => s.ad).join("·"));
  kontrol("bes kademe var (kaynaktaki BondStage)",
          ayar.SIMBIYOT_KADEMELER.length === 5,
          ayar.SIMBIYOT_KADEMELER.join("·"));
  kontrol("en guclu sus listenin SONU",
          sim.enGucluSus().kimlik ===
          ayar.SIMBIYOT_SUSLAR[ayar.SIMBIYOT_SUSLAR.length - 1].kimlik,
          sim.enGucluSus().ad);
  kontrol("en guclu kademe listenin SONU",
          sim.enGucluKademe() ===
          ayar.SIMBIYOT_KADEMELER[ayar.SIMBIYOT_KADEMELER.length - 1],
          sim.enGucluKademe());
  kontrol("kaynaktaki en ust sus ROYAL",
          sim.enGucluSus().kimlik === ayar.SIMBIYOT_EN_GUCLU_SUS,
          sim.enGucluSus().kimlik);
  kontrol("kaynaktaki en ust kademe DOMINANT",
          sim.enGucluKademe() === ayar.SIMBIYOT_EN_GUCLU_KADEME,
          sim.enGucluKademe());
}

console.log("=== 2. BEN 10 MENUSUNUN ALTINDA ===");
{
  const fs = await import("node:fs");
  const m = fs.readFileSync("./pack/main.js", "utf8");
  const i = m.indexOf("function ben10Menusu");
  const j = m.indexOf("const acildi = menuAc", i);
  const govde = m.slice(i, j);
  kontrol("dugme ben10Menusu icinde", govde.indexOf("Simbiyot") >= 0);
  /* Olcut: Simbiyot'tan ONCE gelen EN YAKIN push cagrisi.
     Ilk yazimda /ekler\.push[\s\S]*Simbiyot/ vardi ve bir
     mutasyonu KACIRDI -- aradaki Beceriler dugmesinin
     ekler.push'u kalibi tek basina dogruluyordu, yani
     Simbiyot dugmesi listeye tasinsa bile test yesildi. */
  {
    const k = govde.indexOf("Simbiyot");
    const once = govde.slice(0, k);
    const a = once.lastIndexOf("ekler.push");
    const b = once.lastIndexOf("dugmeler.push");
    kontrol("dugme EKLER'e giriyor (listeye degil, alta)",
            a >= 0 && a > b, "ekler@" + a + " dugmeler@" + b);
  }
  kontrol("dugme yetenegi TETIKLIYOR (sadece bilgi degil)",
          /yetenekTetikle\(oyuncu, "simbiyot"\)/.test(govde));
  kontrol("dugme sus/kademe adini simbiyot.js'ten okuyor",
          /enGucluSus\(\)\.ad/.test(govde) && /enGucluKademe\(\)/.test(govde));
  kontrol("main.js simbiyotUnut cagiriyor",
          /simbiyotUnut\(olay\.playerId\)/.test(m));
}

console.log("=== 3. FORM ACILIYOR VE ETKI VERIYOR ===");
{
  const { D, o } = kur(0);
  D.boyut.getEntities = () => [];
  const onceRuh = ruh.ruhOku(o);
  const is = bul("simbiyot").olustur(o);
  kontrol("is acildi", !!is);
  /* Bedelin ALINDIGI da olculmeli. "Yetmezse acilmiyor"
     kontrolu tek basina, bedeli hic almayan bir kodu
     yakalamiyordu -- mutasyon tam oradan kacti.          */
  kontrol("acilinca bedel alindi",
          onceRuh - ruh.ruhOku(o) === ayar.SIMBIYOT_BEDEL,
          onceRuh + " -> " + ruh.ruhOku(o));
  kontrol("Carapace karsiligi direnc verildi",
          o._efekt.some((e) => e.ad === "resistance"));
  kontrol("direnc V DEGIL (dokunulmazlik yasak)",
          o._efekt.filter((e) => e.ad === "resistance").every((e) => e.a < 4),
          "sev " + o._efekt.filter((e) => e.ad === "resistance")
            .map((e) => e.a).join(","));
  for (const [ad] of ayar.SIMBIYOT_ETKILER) {
    kontrol("etki " + ad + " verildi", o._efekt.some((e) => e.ad === ad));
  }
}

console.log("=== 4. FRENZY: KENDILIGINDEN VURUYOR ===");
{
  const { D, o } = kur(0);
  const yakin = kurban("v1", { x: 3, y: 90.6, z: 0.5 });
  const arka = kurban("v2", { x: -3, y: 90.6, z: 0.5 });   // ARKADA
  const uzak = kurban("v3", { x: 40, y: 90.6, z: 0.5 });
  D.boyut.getEntities = (s) => [yakin, arka, uzak].filter((v) => {
    const dx = v.location.x - s.location.x, dz = v.location.z - s.location.z;
    return Math.sqrt(dx * dx + dz * dz) <= s.maxDistance;
  });
  const is = bul("simbiyot").olustur(o);
  for (let i = 0; i < ayar.SIMBIYOT_VURUS_ADIM * 2 + 2; i++) { is.calis(); tickIlerlet(1); }
  kontrol("ondekini vurdu", yakin._hasar > 0, "hasar " + yakin._hasar.toFixed(1));
  kontrol("ARKADAKINI de vurdu (koni degil, cevre)", arka._hasar > 0,
          "hasar " + arka._hasar.toFixed(1));
  kontrol("menzil disindakine dokunmadi", uzak._hasar === 0);
  /* VURUS SAYISI da olculmeli. Aralik silinse her tick
     vururdu; vurus BASINA hasar dogru kalirdi ama toplam
     sekiz katina cikardi -- mutasyon oradan kacti.       */
  {
    const tick = ayar.SIMBIYOT_VURUS_ADIM * 2 + 2;
    const bekMax = Math.ceil(tick / ayar.SIMBIYOT_VURUS_ADIM) + 1;
    kontrol("vurus SAYISI araliga uyuyor (her tick degil)",
            yakin._kez > 0 && yakin._kez <= bekMax,
            yakin._kez + " vurus / " + tick + " tick · tavan " + bekMax);
  }
  kontrol("hasar Royal carpaniyla olcekli",
          Math.abs(yakin._hasar / yakin._kez -
                   ayar.SIMBIYOT_VURUS_HASAR * ayar.SIMBIYOT_ROYAL_CARPAN) < 0.01,
          (yakin._hasar / yakin._kez).toFixed(2));
}
{
  const { D, o } = kur(2);
  const h = kurban("v4", { x: 3, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  const is = bul("simbiyot").olustur(o);
  for (let i = 0; i < ayar.SIMBIYOT_VURUS_ADIM + 2; i++) { is.calis(); tickIlerlet(1); }
  const bek = ayar.SIMBIYOT_VURUS_HASAR * ayar.SIMBIYOT_ROYAL_CARPAN *
              ayar.RUH_KADEMELER[2].carpan;
  kontrol("kademe 2'de RUH CARPANI da giriyor",
          Math.abs(h._hasar / h._kez - bek) < 0.01,
          (h._hasar / h._kez).toFixed(2) + " ~ " + bek.toFixed(2));
}

console.log("=== 5. CIKISI VAR ===");
{
  const { D, o } = kur(0);
  D.boyut.getEntities = () => [];
  const is = bul("simbiyot").olustur(o);
  const bitti = yurut(is, ayar.SIMBIYOT_SURE + 120);
  kontrol("suresi dolunca kapandi", bitti >= 0, bitti + " tick");
  kontrol("sureye gore kapandi (~" + ayar.SIMBIYOT_SURE + ")",
          bitti >= 0 && bitti <= ayar.SIMBIYOT_SURE + 30, bitti + " tick");
}
{
  const { D, o } = kur(0);
  D.boyut.getEntities = () => [];
  const is = bul("simbiyot").olustur(o);
  kontrol("acikken simbiyotAcikMi true", sim.simbiyotAcikMi(o.id));
  const once = ruh.ruhOku(o);
  kontrol("ikinci dokunus yeni is ACMIYOR",
          bul("simbiyot").olustur(o) === undefined);
  kontrol("ikinci dokunus ruh HARCAMIYOR", ruh.ruhOku(o) === once);
  kontrol("ikinci dokunus KAPATIYOR", is.calis() === true);
  is.bitir();
  kontrol("kapaninca defter temiz", !sim.simbiyotAcikMi(o.id));
  kontrol("kapaninca yeniden acilabiliyor", !!bul("simbiyot").olustur(o));
}
{
  const { D, o } = kur(0);
  const h = kurban("v5", { x: 3, y: 90.6, z: 0.5 });
  D.boyut.getEntities = () => [h];
  ruh.ruhYaz(o, ayar.SIMBIYOT_BEDEL - 1);
  const is = bul("simbiyot").olustur(o);
  kontrol("ruh yetmezse HIC acilmiyor", is === undefined);
  kontrol("ruh yetmezse ruh da harcanmadi",
          ruh.ruhOku(o) >= ayar.SIMBIYOT_BEDEL - 1, "" + ruh.ruhOku(o));
  kontrol("ruh yetmezse etki de verilmedi", o._efekt.length === 0);
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
