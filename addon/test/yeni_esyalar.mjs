/* RESETTING SWORD ve TASA CEVIRME -- v4.86

   Ikisi de Zabri Studios BoraLo Mod'dan geldi. Bu dosya
   BEDROCK'A GECERKEN DEGISTIRDIGIMIZ seyleri kilitliyor --
   referansi birebir kopyalamadik, kusurlarini ayikladik:

     kilic  : /fill yerine butceli is, KORUNAN_KUME gecerli,
              izleyici modu SURELI
     heykel : suresiz degil, Freedom Stone ile de kirilabiliyor,
              zirha DOKUNMUYOR
*/

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, varlikKaydet, esyaKaydet, _durum,
  vurusTetikle, blokKirTetikle, itemUseTetikle
} from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";
const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

varlikKaydet("pa:bot");
esyaKaydet("pa:resetting_sword", "pa:tas_donusturucu", "pa:freedom_stone");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const tas = await import("./pack/yetenekler/tas.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

console.log("=== 1. ESYALAR ve BLOK KAYITLI MI ===");
{
  for (const [kimlik, hasarAyar] of [
    [ayar.KILIC_ESYA, ayar.KILIC_HASAR],
    [ayar.TAS_ESYA, ayar.TAS_HASAR]
  ]) {
    const ad = kimlik.replace("pa:", "");
    const yol = BP + "/items/" + ad + ".json";
    kontrol(ad + ": esyasi diskte", existsSync(yol));
    if (!existsSync(yol)) continue;
    const e = oku(yol)["minecraft:item"];
    kontrol(ad + ": kimlik ayardakiyle ayni",
            e.description.identifier === kimlik, e.description.identifier);
    kontrol(ad + ": hasari ayardakiyle ayni",
            e.components["minecraft:damage"] === hasarAyar,
            JSON.stringify(e.components["minecraft:damage"]));
    /* Patron esyasi: kullanildikca kirilmasin. */
    kontrol(ad + ": dayanikligi yok",
            e.components["minecraft:durability"] === undefined);
    kontrol(ad + ": dokusu diskte",
            existsSync(RP + "/textures/item/" + ad + ".png"));
    /* ---- ATLAS KAYDI: bu satir unutulunca esya oyunda
       mor-siyah cikiyor. Balta ile bir kez yasandi (v4.48). */
    const atlas = oku(RP + "/textures/item_texture.json").texture_data;
    kontrol(ad + ": doku atlasa kayitli", atlas[ad] !== undefined);
  }

  const blokAd = ayar.TAS_BLOK.replace("pa:", "");
  kontrol("heykel blogu diskte", existsSync(BP + "/blocks/" + blokAd + ".json"));
  const blok = oku(BP + "/blocks/" + blokAd + ".json")["minecraft:block"];
  kontrol("heykel kimligi ayardakiyle ayni",
          blok.description.identifier === ayar.TAS_BLOK);
  /* KIRILABILIR OLMASI SART: kurtarma yolu Freedom Stone ve
     o yol playerBreakBlock ile calisiyor. Kirilmaz bir blok
     tutsagi sonsuza kadar iceride birakirdi.               */
  kontrol("heykel KIRILABILIR (kurtarma yolu)",
          blok.components["minecraft:destructible_by_mining"] !== undefined);
  /* Ama TNT ile acilmasin: anahtar Freedom Stone olmali. */
  kontrol("heykel patlamaya dayanikli (TNT ile acilmasin)",
          blok.components["minecraft:destructible_by_explosion"]
            .explosion_resistance >= 100);
  const terrain = oku(RP + "/textures/terrain_texture.json").texture_data;
  kontrol("heykel dokusu terrain atlasinda", terrain[blokAd] !== undefined);
  kontrol("heykel blocks.json'da",
          oku(RP + "/blocks.json")[ayar.TAS_BLOK] !== undefined);
}

console.log("\n=== 2. FREEDOM STONE ADLANDIRMASI ===");
{
  kontrol("esya kimligi freedom_stone", ayar.DISMONT_ESYA === "pa:freedom_stone",
          ayar.DISMONT_ESYA);
  kontrol("cevher de ayni ailede",
          ayar.DISMONT_CEVHER.startsWith("pa:freedom_stone"),
          ayar.DISMONT_CEVHER);
  /* Eski kimlikten hicbir sey kalmamali: yarim kalan bir
     yeniden adlandirma "bilinmeyen esya" demek.            */
  const kalinti = [];
  for (const [klasor, uzanti] of [["items", ".json"], ["blocks", ".json"],
                                  ["features", ".json"], ["feature_rules", ".json"],
                                  ["loot_tables/blocks", ".json"]]) {
    const { readdirSync } = await import("node:fs");
    let liste = [];
    try { liste = readdirSync(BP + "/" + klasor); } catch (e) { /* klasor yok */ }
    for (const f of liste) if (f.includes("dismont")) kalinti.push(klasor + "/" + f);
  }
  kontrol("eski 'dismont' dosyasi kalmadi", kalinti.length === 0,
          kalinti.join(", ") || "temiz");
  kontrol("ikonu referansin gercek dokusu (uretilen degil)",
          existsSync(KOK + "/kaynak_doku/freedom_stone.png"));
}

console.log("\n=== 3. KILIC: SIFIRLAMA ===");
{
  const D = dunyaKur();
  D.bloklar.hepsiDolu = true;                    // her yer tas
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90, z: 0.5 });
  o.id = "k1"; o.typeId = "minecraft:player";
  o._mod = "survival";
  o.getGameMode = () => o._mod;
  o.setGameMode = (m) => { o._mod = m; };
  _durum.oyuncular = [o];

  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: ayar.KILIC_ESYA } });
  tickIlerlet(300);                              // is bitene kadar
  ac();

  const silinen = D.sayac.yazilan.filter((b) => b.tip === "minecraft:air");
  kontrol("bloklar silindi", silinen.length > 0, silinen.length + " blok");
  /* GEOMETRIK SINIR: kup yaricapi kadar, bir blok fazlasi
     degil. Referansta /fill 11x11x11 = 1331.               */
  const kenar = 2 * ayar.KILIC_YARICAP + 1;
  kontrol("kup yaricapi asilmadi", silinen.length <= kenar * kenar * kenar,
          silinen.length + " / " + (kenar * kenar * kenar));
  const uzak = silinen.filter((b) =>
    Math.abs(b.x) > ayar.KILIC_YARICAP ||
    Math.abs(b.z) > ayar.KILIC_YARICAP);
  kontrol("kup DISINDA blok silinmedi", uzak.length === 0,
          uzak.length + " tane");
}

console.log("\n=== 4. KILIC: KORUNAN BLOKLARA DOKUNMUYOR ===");
{
  /* Referansta bu koruma YOK -- kilici yanlis yerde kullanan
     sandiklarini kaybediyor. Bizde duruyor.                */
  const D = dunyaKur();
  D.bloklar.hepsiDolu = true;
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90, z: 0.5 });
  o.id = "k2"; o.typeId = "minecraft:player";
  o.getGameMode = () => "survival"; o.setGameMode = () => {};
  _durum.oyuncular = [o];

  /* Yakina bir sandik koy. */
  const sandik = { x: 1, y: 90, z: 0 };
  D.boyut.getBlock(sandik).setType("minecraft:chest");
  const oncekiYazim = D.sayac.yazilan.length;

  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: ayar.KILIC_ESYA } });
  tickIlerlet(300);
  ac();

  const sandikSilindi = D.sayac.yazilan.slice(oncekiYazim).some(
    (b) => b.x === sandik.x && b.y === sandik.y && b.z === sandik.z &&
           b.tip === "minecraft:air");
  kontrol("sandik SILINMEDI", !sandikSilindi);
  kontrol("bedrock KORUNAN kumede", ayar.KORUNAN_KUME.has("minecraft:bedrock"));
  kontrol("sandik da KORUNAN kumede", ayar.KORUNAN_KUME.has("minecraft:chest"));
}

console.log("\n=== 5. KILIC: IZLEYICI MODU SURELI ===");
{
  /* Referansta acan komut ayri, kapatan ayri dosyadaydi;
     unutursan sonsuza kadar izleyici kalirdin. Burada kilit
     hep cift.                                              */
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90, z: 0.5 });
  o.id = "k3"; o.typeId = "minecraft:player";
  o._mod = "creative";                       // yaratici moddaki biri
  o.getGameMode = () => o._mod;
  o.setGameMode = (m) => { o._mod = m; };
  _durum.oyuncular = [o];

  sus();
  itemUseTetikle({ source: o, itemStack: { typeId: ayar.KILIC_ESYA } });
  tickIlerlet(2);
  ac();
  kontrol("izleyiciye alindi", o._mod === "spectator", o._mod);

  sus(); tickIlerlet(ayar.KILIC_IZLEYICI_SURE + 5); ac();
  kontrol("suresi dolunca GERI dondu", o._mod !== "spectator", o._mod);
  /* ONCEKI MODU HATIRLIYOR: yaratici moddaki biri survival'a
     dusmemeli. Referans bunu yapmiyor, hep survival veriyor. */
  kontrol("onceki moduna dondu (survival'a DUSMEDI)",
          o._mod === "creative", o._mod);
}

console.log("\n=== 6. TASA CEVIRME ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90, z: 0.5 });
  o.id = "t1"; o.typeId = "minecraft:player";
  let elde = ayar.TAS_ESYA;
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: (yv) => (yv === "Mainhand" && elde) ? { typeId: elde } : undefined,
    setEquipment: () => true
  } : undefined;
  _durum.oyuncular = [o];
  tas.defteriUnut();

  const kurban = {
    id: "kv1", typeId: "minecraft:zombie", isValid: true,
    dimension: D.boyut, location: { x: 4, y: 90, z: 4 },
    _efektler: [], _komutlar: [],
    addEffect(ad, s2, se) { this._efektler.push({ ad, sure: s2, se }); },
    removeEffect(ad) { this._efektler = this._efektler.filter((e) => e.ad !== ad); },
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    teleport(n) { this.location = { x: n.x, y: n.y, z: n.z }; return true; },
    applyDamage: () => true
  };
  D.boyut._varliklar = [kurban];

  sus(); vurusTetikle({ damagingEntity: o, hitEntity: kurban }); ac();

  kontrol("kurban tasa cevrildi", tas.tasMi(kurban));
  const konan = D.sayac.yazilan.filter((b) => b.tip === ayar.TAS_BLOK);
  kontrol("heykel blogu koyuldu", konan.length === 1, konan.length + " blok");
  kontrol("kurban heykelin icine isinlandi",
          Math.floor(kurban.location.x) === 4 && Math.floor(kurban.location.z) === 4,
          JSON.stringify(kurban.location));
  const adlar = kurban._efektler.map((e) => e.ad);
  kontrol("yavaslik ve gucsuzluk verildi",
          adlar.includes("slowness") && adlar.includes("weakness"),
          adlar.join(","));

  /* ---- BASKA ESYAYLA OLMAMALI ---- */
  const kurban2 = { ...kurban, id: "kv2", _efektler: [] };
  elde = "minecraft:diamond_sword";
  sus(); vurusTetikle({ damagingEntity: o, hitEntity: kurban2 }); ac();
  kontrol("elmas kilicla tasa cevirmiyor", !tas.tasMi(kurban2));

  /* ---- SURESI DOLUNCA COZULUYOR ---- */
  elde = ayar.TAS_ESYA;
  sus(); tickIlerlet(ayar.TAS_SURE + 5); ac();
  kontrol("suresi dolunca cozuldu", !tas.tasMi(kurban));
  const silinen = D.sayac.yazilan.filter(
    (b) => b.tip === "minecraft:air" && b.x === 4 && b.z === 4);
  kontrol("heykel blogu kaldirildi", silinen.length > 0);
}

console.log("\n=== 7. HEYKEL DOLU YERE KURULMUYOR ===");
{
  /* Oyuncunun evini heykele cevirmek geri alinamaz olurdu.
     Mezar ve buz kafesinde ayni kural.                     */
  const D = dunyaKur();
  D.bloklar.hepsiDolu = true;                    // her yer dolu
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90, z: 0.5 });
  o.id = "t2"; o.typeId = "minecraft:player";
  o.getComponent = (a) => (a === "minecraft:equippable") ? {
    getEquipment: () => ({ typeId: ayar.TAS_ESYA }), setEquipment: () => true
  } : undefined;
  _durum.oyuncular = [o];
  tas.defteriUnut();

  const kurban = {
    id: "kv3", typeId: "minecraft:zombie", isValid: true,
    dimension: D.boyut, location: { x: 4, y: 90, z: 4 },
    _efektler: [],
    addEffect() {}, removeEffect() {},
    runCommand() { return { successCount: 1 }; },
    teleport() { return true; }, applyDamage: () => true
  };
  D.boyut._varliklar = [kurban];

  sus(); vurusTetikle({ damagingEntity: o, hitEntity: kurban }); ac();
  kontrol("dolu yerde heykel KURULMADI", !tas.tasMi(kurban));
  kontrol("hicbir blok degistirilmedi",
          D.sayac.yazilan.filter((b) => b.tip === ayar.TAS_BLOK).length === 0);
}

console.log("\n=== 8. FREEDOM STONE ILE KIRMA ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 90, z: 0.5 });
  o.id = "t3"; o.typeId = "minecraft:player";
  o._yuvalar = new Array(36).fill(undefined);
  o._mesajlar = [];
  o.sendMessage = (m) => o._mesajlar.push(m);
  const envanter = {
    container: {
      size: 36,
      getItem: (i) => o._yuvalar[i],
      setItem: (i, e) => { o._yuvalar[i] = e; }
    }
  };
  o.getComponent = (a) => {
    if (a === "minecraft:equippable") {
      return { getEquipment: () => ({ typeId: ayar.TAS_ESYA }),
               setEquipment: () => true };
    }
    if (a === "minecraft:inventory") return envanter;
    return undefined;
  };
  _durum.oyuncular = [o];
  tas.defteriUnut();

  const kurban = {
    id: "kv4", typeId: "minecraft:zombie", isValid: true,
    dimension: D.boyut, location: { x: 4, y: 90, z: 4 },
    _efektler: [], _komutlar: [],
    addEffect() {}, removeEffect(ad) { this._komutlar.push("sil:" + ad); },
    runCommand(k) { this._komutlar.push(k); return { successCount: 1 }; },
    teleport() { return true; }, applyDamage: () => true
  };
  D.boyut._varliklar = [kurban];
  sus(); vurusTetikle({ damagingEntity: o, hitEntity: kurban }); ac();
  kontrol("heykel kuruldu", tas.tasMi(kurban));

  const yer = { x: 4, y: 90, z: 4 };

  /* ---- YETERSIZ TAS: kirilmamali, blok GERI konmali ---- */
  o._yuvalar[0] = { typeId: ayar.DISMONT_ESYA, amount: ayar.TAS_ANAHTAR_ADET - 1 };
  sus();
  blokKirTetikle(o, yer);
  ac();
  kontrol("yetersiz tasla heykel ACILMADI", tas.tasMi(kurban));
  const geri = D.sayac.yazilan.filter(
    (b) => b.x === 4 && b.z === 4 && b.tip === ayar.TAS_BLOK);
  kontrol("kirilan blok GERI KONDU", geri.length >= 2, geri.length + " kez konuldu");
  kontrol("kac tas gerektigi soylendi",
          o._mesajlar.some((m) => m.includes("Freedom Stone")),
          o._mesajlar[o._mesajlar.length - 1] || "-");
  kontrol("taslari HARCANMADI",
          o._yuvalar[0].amount === ayar.TAS_ANAHTAR_ADET - 1,
          o._yuvalar[0].amount + " tas");

  /* ---- YETERLI TAS: kirilmali, tas harcanmali ---- */
  o._yuvalar[0] = { typeId: ayar.DISMONT_ESYA, amount: ayar.TAS_ANAHTAR_ADET + 2 };
  sus();
  blokKirTetikle(o, yer);
  ac();
  kontrol("yeterli tasla heykel ACILDI", !tas.tasMi(kurban));
  kontrol("tam " + ayar.TAS_ANAHTAR_ADET + " tas harcandi",
          o._yuvalar[0] && o._yuvalar[0].amount === 2,
          (o._yuvalar[0] ? o._yuvalar[0].amount : 0) + " tas kaldi");
  kontrol("kurbanin kilidi acildi",
          kurban._komutlar.some((k) => k.includes("enabled")) ||
          kurban._komutlar.some((k) => k.startsWith("sil:")),
          kurban._komutlar.join(" | ").slice(0, 80));
}

console.log("\n=== 9. TAVAN ve MEZARDAN AYRI ===");
{
  kontrol("heykel tavani var", ayar.TAS_TAVAN > 0 && ayar.TAS_TAVAN <= 32,
          String(ayar.TAS_TAVAN));
  /* Heykel mezardan HAFIF bir etki: daha az tas istemeli,
     yoksa iki mekanik ayni sey olur.                       */
  kontrol("heykel mezardan daha az tas istiyor",
          ayar.TAS_ANAHTAR_ADET < ayar.MEZAR_ANAHTAR_ADET,
          ayar.TAS_ANAHTAR_ADET + " < " + ayar.MEZAR_ANAHTAR_ADET);
  kontrol("heykel suresi sonlu (suresiz etki yok)",
          ayar.TAS_SURE > 0 && ayar.TAS_SURE <= 1200,
          ayar.TAS_SURE + " tick = " + (ayar.TAS_SURE / 20) + " sn");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> kilic ve tas calisiyor");
process.exit(hata ? 1 : 0);
