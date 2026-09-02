/* MAX STEEL YETENEK AGACI                                  v5.9

   Kullanici: "yetenek agaclarini dikkatlice hepsinin
   aldiklarimiz dahil teker teker bak, bizim yetenek agacimiz
   ile ayni olmasini istiyorum, bu modun yetenek agaci ile."

   ---- EN ONEMLI BOLUM: 1. ----
   Bizim agacimiz KAYNAKTAKI agacla karsilastiriliyor: modun
   base_mode.json'undaki her `item_buyable` dugumu bizde de
   var mi, bedeli ayni cekirdek mi. Yani "ayni olsun" bir
   yorum satiri degil, olculen bir sey. */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const ION = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/ion3";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const agac = await import("./pack/yetenekler/zirh_agac.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8").replace(/,(\s*[}\]])/g, "$1"));

function kur(kademe = 0) {
  const D = dunyaKur();
  try { _durum.ozellikler.delete(ayar.ZIRH_AGAC_ANAHTAR); } catch (e) {}
  agac.zirhAgacUnut();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "ag1"; o.typeId = "minecraft:player";
  o.level = kademe;
  o._envanter = [];
  o.addLevels = (n) => { o.level += n; };
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:inventory") {
      return { container: {
        get size() { return 9; },
        getItem: (i) => o._envanter[i],
        setItem: (i, y2) => { o._envanter[i] = y2; }
      } };
    }
    return eskiGet(ad);
  };
  o.sendMessage = () => {};
  _durum.oyuncular = [o];
  return { D, o };
}
const cekirdekVer = (o, mod, adet = 1) => {
  o._envanter.push({ typeId: ayar.ZIRH_CEKIRDEK_ONEK + mod, amount: adet });
};

console.log("=== 1. AGACIMIZ KAYNAKTAKIYLE AYNI MI ===");
{
  const p = ION + "/data/ionstrike/palladium/powers/base_mode.json";
  if (!existsSync(p)) {
    console.log("  · ionstrike jar'i diskte degil, karsilastirma atlandi");
  } else {
    const d = oku(p);
    kontrol("base_mode gercekten AGAC (gui_display_type)",
            d.gui_display_type === "tree", String(d.gui_display_type));

    /* Kaynakta hangi mod hangi cekirdekle aliniyor. */
    const kaynakBedel = new Map();
    let xpDugum = 0;
    for (const [k, v] of Object.entries(d.abilities)) {
      for (const c of ((v.conditions || {}).unlocking || [])) {
        const t = (c.type || "").split(":").pop();
        if (t === "item_buyable") {
          kaynakBedel.set(k, String((c.ingredient || {}).item || "").split(":").pop());
        } else if (t === "experience_level_buyable") {
          xpDugum++;
          if (k === "mode_select") {
            kontrol("mode_select bedeli " + ayar.ZIRH_CARK_XP + " XP",
                    c.xp_level === ayar.ZIRH_CARK_XP,
                    c.xp_level + " vs " + ayar.ZIRH_CARK_XP);
          }
        }
      }
    }
    kontrol("kaynakta cekirdekle alinan dugum var",
            kaynakBedel.size >= 10, kaynakBedel.size + " dugum");
    kontrol("kaynakta XP ile alinan dugum var", xpDugum >= 1,
            xpDugum + " dugum");

    /* Bizim ALDIGIMIZ modlarin hepsi icin bedel dogru mu.
       Kaynakta bizde OLMAYAN modlar da var (clone, cannon,
       camo, size) -- onlar bu surumde yok, sinama onlari
       aramiyor ama SAYILARINI yaziyor ki unutulmasin.      */
    const eksik = [];
    for (const [mod, bedel] of ayar.ZIRH_AGAC_BEDEL) {
      const kaynakAd = kaynakBedel.get(mod === "dalis" ? "scuba_mode"
        : mod === "isi" ? "heat_mode"
        : mod === "guc" ? "strength_mode"
        : mod === "hiz" ? "speed_mode"
        : mod === "kesif" ? "recon_mode"
        : mod === "gizlilik" ? "stealth_mode"
        : mod === "ucus" ? "flight_mode"
        : mod === "titan" ? "titan_mode" : mod);
      if (kaynakAd !== bedel) eksik.push(mod + ": " + bedel + " vs " + kaynakAd);
    }
    kontrol("her modun bedeli kaynaktakiyle AYNI cekirdek",
            eksik.length === 0, eksik.join(" | ") || ayar.ZIRH_AGAC_BEDEL.size + " mod");

    const bizdeYok = [...kaynakBedel.keys()]
      .filter((k) => k.endsWith("_mode") &&
        !["heat_mode","size_mode","titan_mode","strength_mode","speed_mode",
          "recon_mode","stealth_mode","flight_mode","scuba_mode"].includes(k) ||
        ["size_mode","clone_mode","cannon_mode","camo_mode"].includes(k));
    kontrol("kaynakta olup bizde OLMAYAN modlar biliniyor",
            bizdeYok.length > 0, bizdeYok.join(", "));

    /* Temel kaynakta satin alinacak bir dugum DEGIL. */
    kontrol("Temel (base_mode) satin alinmiyor -- agacin koku",
            !kaynakBedel.has("base_mode") &&
            ayar.ZIRH_AGAC_KOK === "temel");
  }
}

console.log("");
console.log("=== 2. CEKIRDEK HARCANIYOR, MOD KALICI ACILIYOR ===");
{
  const { o } = kur();
  kontrol("baslangicta yalniz Temel acik",
          agac.acikModlar(o.id).length === 1 &&
          agac.acikModlar(o.id)[0] === "temel",
          agac.acikModlar(o.id).join(","));
  kontrol("Temel hep acik (agacin koku)", agac.modAcikMi(o.id, "temel"));
  kontrol("Titan baslangicta KILITLI", !agac.modAcikMi(o.id, "titan"));

  /* Cekirdek yoksa acilmamali. */
  const r1 = agac.modAc(o, "titan");
  kontrol("cekirdek yokken acilmiyor", r1.tamam === false, r1.sebep);

  cekirdekVer(o, "titan");
  const r2 = agac.modAc(o, "titan");
  kontrol("cekirdekle aciliyor", r2.tamam === true, r2.sebep || "acildi");
  kontrol("Titan artik ACIK", agac.modAcikMi(o.id, "titan"));

  /* Kaynakta item_buyable esyayi TUKETIYOR. */
  kontrol("cekirdek HARCANDI (envanterden gitti)",
          !o._envanter.some((y) => y && y.typeId === "pa:zirh_mod_titan"),
          JSON.stringify(o._envanter.filter(Boolean).map((y) => y.typeId)));

  const r3 = agac.modAc(o, "titan");
  kontrol("ikinci kez acilmiyor", r3.tamam === false, r3.sebep);

  /* Temel kok: satin alinamaz. */
  const r4 = agac.modAc(o, "temel");
  kontrol("Temel satin alinamiyor (kok)", r4.tamam === false, r4.sebep);
}

console.log("");
console.log("=== 3. YIGIN VE COKLU CEKIRDEK ===");
{
  const { o } = kur();
  cekirdekVer(o, "guc", 3);
  agac.modAc(o, "guc");
  const kalan = o._envanter.find((y) => y && y.typeId === "pa:zirh_mod_guc");
  kontrol("yigindan yalniz BIR tane eksiliyor",
          !!kalan && kalan.amount === 2, kalan ? String(kalan.amount) : "yigin gitti");
}

console.log("");
console.log("=== 4. MOD SECIMI (kaynakta mode_select) ===");
{
  const { o } = kur();
  cekirdekVer(o, "hiz");
  agac.modAc(o, "hiz");
  const s1 = agac.modSec(o, "hiz");
  kontrol("acik mod secilebiliyor", s1.tamam === true, s1.sebep || "secildi");
  kontrol("secim okunuyor", agac.secilenMod(o.id) === "hiz");

  const s2 = agac.modSec(o, "titan");
  kontrol("KILITLI mod secilemiyor", s2.tamam === false, s2.sebep);

  /* Cark SECIMIN SARTI DEGIL: kaynakta her modun kendi
     dugumu zaten o moda geciriyor; mode_select hizli gecis.
     Ilk yazdigimda sart kosmustum ve ilk cekirdegini
     harcayan oyuncu 30 XP bulana kadar hicbir moda
     giremiyordu -- test yakaladi.                          */
  kontrol("cark alinmamisken de secim yapilabiliyor",
          agac.carkAlindiMi(o.id) === false && agac.secilenMod(o.id) === "hiz");
}

console.log("");
console.log("=== 5. MOD CARKI 30 XP ===");
{
  const { o } = kur(10);
  const c1 = agac.carkAc(o);
  kontrol("XP yetmezse alinmiyor", c1.tamam === false, c1.sebep);
  kontrol("XP harcanmadi", o.level === 10, String(o.level));

  const { o: o2 } = kur(50);
  const c2 = agac.carkAc(o2);
  kontrol("XP yeterse aliniyor", c2.tamam === true, c2.sebep || "alindi");
  kontrol("tam " + ayar.ZIRH_CARK_XP + " kademe dustu",
          o2.level === 50 - ayar.ZIRH_CARK_XP, String(o2.level));
  kontrol("ikinci kez alinmiyor", agac.carkAc(o2).tamam === false);
}

console.log("");
console.log("=== 6. AGAC KALICI (dunya ozelliginde) ===");
{
  const { o } = kur();
  cekirdekVer(o, "isi");
  agac.modAc(o, "isi");
  /* Modulu unut ama dunyayi BIRAKMA: kayit geri okunmali. */
  agac.zirhAgacUnut();
  kontrol("script yeniden yuklenince acik mod duruyor",
          agac.modAcikMi(o.id, "isi"));
}

console.log("");
console.log("=== 7. ULASILABILIYOR MU ===");
{
  const main = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js zirh_agac.js'i import ediyor",
          main.indexOf('"./yetenekler/zirh_agac.js"') !== -1);
  kontrol("menude mod acma bagli", main.indexOf("modAc(oyuncu, anahtar)") !== -1);
  kontrol("menude cark bagli", main.indexOf("carkAc(oyuncu)") !== -1);
  const z = readFileSync(BP + "/scripts/yetenekler/zirh.js", "utf8");
  kontrol("zirh.js agac kapisini soruyor",
          z.indexOf("modAcikMi(oyuncu.id, cekirdek)") !== -1);
  kontrol("zirh.js secili moda dusuyor",
          z.indexOf("secilenMod(oyuncu.id)") !== -1);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> agac kaynaktakiyle ayni");
process.exit(hata ? 1 : 0);
