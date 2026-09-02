/* MARVEL PROJECT KAHRAMANLARI                            v5.2

   Kullanici: "eski kahramanlari tamamen atiyoruz, Fisk modunu
   bos veriyoruz artik. Onun yerine bunu ekle, bunun tum
   kahramanlarini."

   ---- BU DOSYANIN IKI ONEMLI BOLUMU ----
   1.  FISK GERCEKTEN GITTI MI. "Yerine yenisini koydum" demek
       yetmiyor; eski esyalar, dokular, ikonlar ve ayarlar
       diskte kalmis olabilir. Kalinti ARANIYOR.
   6.  SAYILAR MODUN KENDI PAKETINDEN. Mod diskteyse zirh
       puani, yuva, dayaniklilik ve ad tek tek karsilastiriliyor
       -- "hafizadan yazdim" ihtimali sinanabilir kalsin.      */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const MOD = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad/marvel";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const mrv = await import("./pack/yetenekler/marvel.js");
const kollar = await import("./pack/yetenekler/kollar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* Uretilen esyalardan tabloyu geri kur: testin kendi kopyasi
   olmasin, DISKTEKI gercege baksin.                          */
const parcalar = readdirSync(BP + "/items")
  .filter((f) => f.startsWith("mrv_") && f.endsWith(".json"))
  .map((f) => oku(BP + "/items/" + f)["minecraft:item"]);

console.log("=== 1. FISK GERCEKTEN GITTI MI ===");
{
  const kalinti = [];
  for (const [dizin, uzanti] of [
    [BP + "/items", ".json"], [RP + "/attachables", ".json"],
    [RP + "/textures/item", ".png"], [RP + "/textures/entity", ".png"],
    [RP + "/models/entity", ".geo.json"]]) {
    if (!existsSync(dizin)) continue;
    for (const f of readdirSync(dizin)) {
      if (/kahraman/i.test(f)) kalinti.push(dizin.split("/").pop() + "/" + f);
    }
  }
  kontrol("uretilen dosyalarda kahraman kalintisi yok",
          kalinti.length === 0, kalinti.slice(0, 5).join(" | "));

  kontrol("kahraman.js silindi",
          !existsSync(BP + "/scripts/yetenekler/kahraman.js"));
  kontrol("REFERANS_FISK.md silindi", !existsSync(KOK + "/REFERANS_FISK.md"));
  kontrol("kaynak_doku/kahraman_coz.py silindi",
          !existsSync(KOK + "/kaynak_doku/kahraman_coz.py"));

  for (const ad of ["KAHRAMANLAR", "KAHRAMAN_ISIN", "KAHRAMAN_ACIK",
                    "KAHRAMAN_ONEK"]) {
    kontrol("ayarlar.js'te " + ad + " yok", ayar[ad] === undefined);
  }
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js kahraman.js'i import etmiyor",
          !kaynak.includes("yetenekler/kahraman.js"));
  kontrol("main.js marvel.js'i import ediyor",
          kaynak.includes('from "./yetenekler/marvel.js"'));

  /* Dil dosyasinda da kalinti olmamali: esya silinip satiri
     kalsa oyun "bilinmeyen esya" gosterirdi.                 */
  const tr = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  kontrol("dil dosyasinda kahraman satiri yok",
          !/item\.pa:kahraman_/.test(tr));
}

console.log("=== 2. 268 PARCA, 54 KAHRAMAN ===");
{
  kontrol("268 esya uretildi", parcalar.length === 268,
          parcalar.length + " esya");
  const tur = { kostum: 0, maske: 0, guc: 0 };
  for (const p of parcalar) {
    for (const t of p.components["minecraft:tags"].tags) {
      const m = t.match(/^pa:marvel_(\w+)$/);
      if (m && tur[m[1]] !== undefined) tur[m[1]]++;
    }
  }
  kontrol("142 kostum · 85 maske · 41 guc",
          tur.kostum === 142 && tur.maske === 85 && tur.guc === 41,
          JSON.stringify(tur));

  const kahramanlar = new Set();
  for (const p of parcalar) {
    const c = mrv.kimligiCoz(p.description.identifier);
    if (c) kahramanlar.add(c.kahraman);
  }
  kontrol("54 kahraman", kahramanlar.size === 54, kahramanlar.size + " kahraman");
  const gucsuz = [...kahramanlar].filter((k) => !mrv.gucKumesi(k));
  kontrol("her kahramanin guc kumesi var", gucsuz.length === 0,
          gucsuz.join(", "));
}

console.log("=== 3. KIMLIK COZUMU ===");
{
  /* Cift alt cizgi bilerek: kahraman adinda da anahtarda da
     tek alt cizgi var. Tek ayirac olsaydi "black_panther"
     "black" olarak okunurdu.                                */
  const a = mrv.kimligiCoz("pa:mrv_ironman__ironman_mark50");
  kontrol("basit kimlik", a && a.kahraman === "ironman" &&
          a.anahtar === "ironman_mark50", JSON.stringify(a));
  const b = mrv.kimligiCoz("pa:mrv_black_panther__black_panther_shuri_suit");
  kontrol("kahraman adinda alt cizgi varken de dogru",
          b && b.kahraman === "black_panther" &&
          b.anahtar === "black_panther_shuri_suit", JSON.stringify(b));
  kontrol("yabanci kimlik cozulmuyor",
          mrv.kimligiCoz("pa:kol_toprak") === undefined);
  kontrol("ayiracsiz kimlik cozulmuyor",
          mrv.kimligiCoz("pa:mrv_ironman") === undefined);

  /* Uretilen HER kimlik cozulebilmeli.                       */
  const cozulmeyen = parcalar
    .map((p) => p.description.identifier)
    .filter((k) => !mrv.kimligiCoz(k));
  kontrol("268 kimligin hepsi cozuluyor", cozulmeyen.length === 0,
          cozulmeyen.slice(0, 3).join(" | "));
}

/* ---------------- sahte oyuncu ---------------- */
function kur() {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "m1"; o.typeId = "minecraft:player";
  const yuvalar = {};
  const efektler = [];
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => (yuvalar[y] ? { typeId: yuvalar[y] } : undefined),
        setEquipment: () => true
      };
    }
    return eskiGet(ad);
  };
  o.addEffect = (ad, sure, sec) => {
    efektler.push({ ad, sure, amp: sec ? sec.amplifier : 0 });
    return true;
  };
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o._yuvalar = yuvalar; o._efektler = efektler;
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  mrv.marvelUnut();
  return { D, o };
}
const tak = (o, yuva, kahraman, anahtar) => {
  o._yuvalar[yuva] = ayar.MARVEL_ONEK + kahraman + ayar.MARVEL_AYIRAC + anahtar;
};
const amp = (o, ad) => {
  let son;
  for (const e of o._efektler) if (e.ad === ad) son = e.amp;
  return son;
};

console.log("=== 4. GUC BACAKTA, KOSTUM AYAKTA ===");
{
  /* Guc esyasi OLAN bir kahraman secildi (Thor). Iron Man
     olmaz: onun modda guc esyasi yok ve gucu kostumde --
     ilk yazdigimda Iron Man kullanmistim ve test hakli
     olarak dustu.                                           */
  const { o } = kur();
  tak(o, "Feet", "thor", "thor_suit");
  mrv.marvelTara([o]);
  kontrol("YALNIZ kostum -> guc YOK", o._efektler.length === 0,
          o._efektler.length + " efekt");
  kontrol("kostum okunuyor",
          (mrv.takilanMarvel(o) || {}).ayak.kahraman === "thor");

  const { o: o2 } = kur();
  tak(o2, "Legs", "ironman", "ironman_powers");
  mrv.marvelTara([o2]);
  kontrol("guc takilinca ates bagisikligi geliyor",
          amp(o2, "fire_resistance") === 0);
  kontrol("guc takilinca dusme hasari yok",
          amp(o2, "slow_falling") === 0);
  kontrol("guctekiKahraman ironman",
          mrv.guctekiKahraman(o2) === "ironman");

  const { o: o3 } = kur();
  tak(o3, "Legs", "hulk", "hulk_powers");
  mrv.marvelTara([o3]);
  kontrol("Hulk gucu X (amp 9)", amp(o3, "strength") === 9,
          "amp " + amp(o3, "strength"));
  kontrol("Hulk direnc IV (amp 3)", amp(o3, "resistance") === 3);

  /* Takma ad: Kaptan Amerika'nin gucu kaynakta
     `super_soldier_powers`.                                  */
  const { o: o4 } = kur();
  tak(o4, "Legs", "super_soldier", "super_soldier_powers");
  mrv.marvelTara([o4]);
  kontrol("super_soldier gucu Kaptan Amerika'nin efektlerini veriyor",
          amp(o4, "strength") === 2 && amp(o4, "saturation") === 0);
  kontrol("takma ad cozuluyor",
          mrv.gucKumesi("captain_america") === mrv.gucKumesi("super_soldier"));

  /* Zirh yokken hicbir sey yapmamali.                        */
  const { o: o5 } = kur();
  mrv.marvelTara([o5]);
  kontrol("bos oyuncuya efekt verilmiyor", o5._efektler.length === 0);
  kontrol("bos oyuncuda takilanMarvel undefined",
          mrv.takilanMarvel(o5) === undefined);
}

console.log("=== 5. ISINLAR VE YETENEKLER ===");
{
  kontrol("alti Marvel isini", ayar.MARVEL_ISIN.size === 6,
          ayar.MARVEL_ISIN.size + " isin");
  /* Her isinin kahramani MARVEL_GUCLER'de olmali ve o
     kahramanin "isin" alani bu isini gostermeli -- yoksa
     menude gorunur ama hicbir esyaya baglanmaz.             */
  const kopuk = [];
  for (const [kimlik, t] of ayar.MARVEL_ISIN) {
    const g = mrv.gucKumesi(t.kahraman);
    if (!g) kopuk.push(kimlik + ": kahraman yok (" + t.kahraman + ")");
    else if (g.isin !== kimlik) kopuk.push(kimlik + ": guc kumesi baska isin gosteriyor");
  }
  kontrol("her isin kendi kahramanina bagli", kopuk.length === 0,
          kopuk.join(" | "));

  /* Yetenek defterine gercekten girmisler mi.                */
  const kayit = await import("./pack/yetenekler/kayit.js");
  const hepsi = new Set(kayit.tumYetenekler().map((y) => y.kimlik));
  const eksik = [...ayar.MARVEL_ISIN.keys()].filter((k) => !hepsi.has(k));
  kontrol("isinlar yetenek defterinde", eksik.length === 0, eksik.join(", "));

  /* Esya baglanmasi: guc esyasi -> yetenek.                  */
  const bagli = new Map(kollar.MARVEL_YETENEKLERI);
  kontrol("guc esyalari yeteneklere bagli",
          kollar.MARVEL_YETENEKLERI.length > 0,
          kollar.MARVEL_YETENEKLERI.length + " baglama");
  /* Thor'un guc esyasi VAR -> baglanmis olmali.             */
  const thor = kollar.MARVEL_YETENEKLERI.filter(([e]) => e.includes("thor"));
  kontrol("Thor'un ucusu guc esyasina bagli",
          thor.some(([, y]) => y === "ucus"), JSON.stringify(thor));

  /* Iron Man'in guc esyasi YOK (modda oyle). Baglanmamali --
     olmayan bir esyaya baglamak menude hayalet satir demek.  */
  const ironman = kollar.MARVEL_YETENEKLERI.filter(([e]) => e.includes("ironman"));
  kontrol("Iron Man olmayan esyaya BAGLANMAMIS", ironman.length === 0,
          JSON.stringify(ironman));

  /* Ama yetenegi yine de calismali: kostum ayaginda olunca
     isinin kapisi ACILMALI. Vaat edilen sey veriliyor mu --
     v4.95'teki sikayetin sinamasi.                          */
  {
    const { o } = kur();
    tak(o, "Feet", "ironman", "ironman_mark50");
    kontrol("Iron Man kostumu takiliyken guc kahramani ironman",
            mrv.guctekiKahraman(o) === "ironman",
            String(mrv.guctekiKahraman(o)));
    mrv.marvelTara([o]);
    kontrol("Iron Man kostumu tek basina gucleri veriyor",
            amp(o, "fire_resistance") === 0);
    /* Guc esyasi OLAN bir kahramanda ayni sey OLMAMALI:
       Thor'un kostumu tek basina guc vermemeli.             */
    const { o: o2 } = kur();
    tak(o2, "Feet", "thor", "thor_suit");
    mrv.marvelTara([o2]);
    kontrol("Thor kostumu tek basina guc VERMIYOR (guc esyasi ayri)",
            o2._efektler.length === 0, o2._efektler.length + " efekt");
  }

  /* Baglanan her esya GERCEKTEN uretilmis olmali. Bu satir
     olmasa "menude var, envanterde yok" olurdu.             */
  const kimlikler = new Set(parcalar.map((p) => p.description.identifier));
  const hayalet = kollar.MARVEL_YETENEKLERI
    .map(([e]) => e).filter((e) => !kimlikler.has(e));
  kontrol("baglanan guc esyalarinin hepsi uretildi",
          hayalet.length === 0, [...new Set(hayalet)].slice(0, 4).join(" | "));
}

console.log("=== 6. SAYILAR MODUN KENDI PAKETINDEN ===");
{
  if (!existsSync(MOD + "/bp/items")) {
    console.log("  · mod diskte degil, karsilastirma atlandi");
  } else {
    /* Modun butun giyilebilir esyalarini topla.             */
    const kaynak = new Map();
    const gez = (d) => {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        const y = d + "/" + f.name;
        if (f.isDirectory()) { gez(y); continue; }
        if (!f.name.endsWith(".json")) continue;
        let j;
        try { j = oku(y); } catch (e) { continue; }
        const it = j["minecraft:item"];
        if (!it) continue;
        const c = it.components || {};
        if (!c["minecraft:wearable"]) continue;
        kaynak.set(it.description.identifier.split(":").pop(), {
          yuva: c["minecraft:wearable"].slot,
          koruma: c["minecraft:wearable"].protection || 0,
          dayaniklilik: (c["minecraft:durability"] || {}).max_durability
        });
      }
    };
    gez(MOD + "/bp/items");

    /* Modun dil dosyasi.                                     */
    const adlar = new Map();
    for (const satir of readFileSync(MOD + "/rp/texts/en_US.lang", "utf8")
                        .split("\n")) {
      const m = satir.match(/^item\.([^=]+)=(.*)$/);
      if (m) adlar.set(m[1].split(":").pop(), m[2].trim());
    }

    const uyumsuz = [];
    let karsilastirilan = 0;
    for (const p of parcalar) {
      const c = mrv.kimligiCoz(p.description.identifier);
      const k = kaynak.get(c.anahtar);
      if (!k) continue;      // varyantlar (F4 reed/sue/johnny)
      karsilastirilan++;
      const bz = p.components;
      if (bz["minecraft:wearable"].slot !== k.yuva) {
        uyumsuz.push(c.anahtar + " yuva");
      }
      if (bz["minecraft:wearable"].protection !== k.koruma) {
        uyumsuz.push(c.anahtar + " zirh " +
                     bz["minecraft:wearable"].protection + "!=" + k.koruma);
      }
      const bd = (bz["minecraft:durability"] || {}).max_durability;
      if ((bd || 0) !== (k.dayaniklilik || 0)) {
        uyumsuz.push(c.anahtar + " dayaniklilik " + bd + "!=" + k.dayaniklilik);
      }
      const ad = adlar.get(c.anahtar);
      if (ad && bz["minecraft:display_name"].value !== ad) {
        uyumsuz.push(c.anahtar + " ad");
      }
    }
    kontrol("yuva/zirh/dayaniklilik/ad modun esyasiyla birebir",
            uyumsuz.length === 0, uyumsuz.slice(0, 5).join(" | "));
    kontrol("karsilastirilan parca 250'den fazla",
            karsilastirilan > 250, karsilastirilan + " parca");

    /* Guc esyalari kaynakta bacak yuvasinda ve 5 zirh
       (Galactus 10) -- kalibi bozmadigimizi sabitliyor.     */
    const gucler = parcalar.filter((p) =>
      p.components["minecraft:tags"].tags.includes("pa:marvel_guc"));
    const kotu = gucler.filter((p) =>
      p.components["minecraft:wearable"].slot !== "slot.armor.legs");
    kontrol("41 guc esyasinin hepsi bacak yuvasinda",
            kotu.length === 0, kotu.length + " tanesi degil");
  }
}

console.log("=== 7. GORUNUS ZINCIRI ===");
{
  /* attachable -> geometri -> doku. Kopuk halka oyunda
     mor-siyah kup demek ve oyun sebebini soylemiyor.       */
  const kopuk = [];
  let attSayisi = 0;
  for (const f of readdirSync(RP + "/attachables")) {
    if (!f.startsWith("mrv_")) continue;
    attSayisi++;
    const a = oku(RP + "/attachables/" + f)["minecraft:attachable"].description;
    const geoAd = a.geometry.default.replace("geometry.", "");
    if (!existsSync(RP + "/models/entity/" + geoAd + ".geo.json")) {
      kopuk.push(f + " geometri dosyasi yok: " + geoAd);
      continue;
    }
    const g = oku(RP + "/models/entity/" + geoAd + ".geo.json");
    if (g["minecraft:geometry"][0].description.identifier !== a.geometry.default) {
      kopuk.push(f + " geometri kimligi tutmuyor");
    }
    if (!existsSync(RP + "/" + a.textures.default + ".png")) {
      kopuk.push(f + " doku yok: " + a.textures.default);
    }
    if (a.render_controllers[0] !== "controller.render.armor") {
      kopuk.push(f + " ozel render controller (v4.28: gorunmez olur)");
    }
  }
  kontrol("227 kostum/maske attachable'i var", attSayisi === 227,
          attSayisi + " attachable");
  kontrol("attachable -> geometri -> doku zinciri saglam",
          kopuk.length === 0, kopuk.slice(0, 4).join(" | "));

  /* GUC esyasinin attachable'i OLMAMALI: bacak yuvasinda
     duruyor ve oyuncuya bir sey cizmiyor (kaynakta da oyle). */
  const gucAtt = parcalar
    .filter((p) => p.components["minecraft:tags"].tags.includes("pa:marvel_guc"))
    .map((p) => p.description.identifier.replace("pa:", ""))
    .filter((a) => existsSync(RP + "/attachables/" + a + ".json"));
  kontrol("guc esyalarinin attachable'i yok (gorunusu yok)",
          gucAtt.length === 0, gucAtt.slice(0, 3).join(" | "));

  /* Her esyanin ikonu ve atlas kaydi.                       */
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  const ikonsuz = parcalar
    .map((p) => p.description.identifier.replace("pa:", ""))
    .filter((a) => !atlas[a] || !existsSync(RP + "/textures/item/" + a + ".png"));
  kontrol("268 esyanin hepsinin ikonu ve atlas kaydi var",
          ikonsuz.length === 0, ikonsuz.slice(0, 4).join(" | "));

  /* Kemik adlari: attachable oyuncunun kemiklerine BAGLANIR.
     Vanilla adlar olmazsa kostum havada durur.              */
  const VANILLA = new Set(["root", "head", "body", "rightArm", "leftArm",
                           "rightLeg", "leftLeg", "hat", "jacket",
                           "rightSleeve", "leftSleeve", "rightPants",
                           "leftPants", "cape", "rightItem", "leftItem"]);
  const yabanci = new Map();
  for (const f of readdirSync(RP + "/models/entity")) {
    if (!f.startsWith("mrv_")) continue;
    const g = oku(RP + "/models/entity/" + f)["minecraft:geometry"][0];
    for (const b of g.bones) {
      if (b.parent) continue;                 // cocuk kemik serbest
      if (!VANILLA.has(b.name)) {
        yabanci.set(b.name, (yabanci.get(b.name) || 0) + 1);
      }
    }
  }
  /* "maletin" (Ant-Man'in cantasi) MODUN KENDI kok kemigi:
     iki Iron Man Mark 2 modelinde geciyor ve oyuncunun bir
     kemigine baglanmiyor, varligin merkezine gore ciziliyor.
     Kaynakta da oyle -- duzeltilecek bir sey degil, bilinmesi
     gereken bir sey. Onun disinda yabanci kok kemik OLMAMALI. */
  const BEKLENEN_YABANCI = new Set(["maletin"]);
  const gercektenYabanci = [...yabanci].filter(([a]) => !BEKLENEN_YABANCI.has(a));
  kontrol("kok kemikler vanilla oyuncu kemikleri (maletin haric)",
          gercektenYabanci.length === 0,
          gercektenYabanci.map((x) => x.join("x")).join(", "));
}

console.log("=== 8. DEFTER TEMIZLIGI ===");
{
  const { o } = kur();
  tak(o, "Legs", "thor", "thor_powers");
  mrv.marvelTara([o]);
  kontrol("Thor gucu IV", amp(o, "strength") === 3);
  o._efektler.length = 0;
  tickIlerlet(1);
  mrv.marvelTara([o]);
  kontrol("tarama araligi icinde tekrar efekt verilmiyor",
          o._efektler.length === 0);
  tickIlerlet(ayar.MARVEL_TARAMA + 1);
  mrv.marvelTara([o]);
  kontrol("aralik dolunca tazeleniyor", o._efektler.length > 0);

  mrv.marvelUnut(o.id);
  o._efektler.length = 0;
  mrv.marvelTara([o]);
  kontrol("unut sonrasi hemen tazeleniyor", o._efektler.length > 0);
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
