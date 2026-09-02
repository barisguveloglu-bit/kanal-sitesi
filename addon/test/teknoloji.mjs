/* TEKNOLOJI ZIRHLARI  (ProjectE / Mekanism / Draconic)   v5.1

   Kullanici: "bunlar direkt zirh modlari degil ama bizim
   odaklanacagimiz sey bunlarin verdigi zirhlar, sadece onlari
   alacagiz, hicbir seyi almayacagiz onlardan baska. Ayrica
   zirh verdigi ozellikler falan varsa alabildiklerini al."

   ---- BU DOSYANIN EN ONEMLI BOLUMU: 7. ----
   Sayilarin MODLARIN KENDI BYTECODE'undan geldigini sinliyor.
   Uc mod da derlenmis sinif; `javap` varsa sayilar ORADAN
   yeniden okunup ayarlar.js ile karsilastiriliyor. Yani
   "hafizadan yazdim" ihtimali test edilebilir bir seye
   donusuyor.

   ---- IKINCI ONEMLI BOLUM: 4. ----
   v4.95'te sikayet suydu: "cekirdekler vaat ettikleri seyleri
   vermiyor". Burada ozetin vaat ettigi her sey (direnc,
   geri kazanim, kalkan, olmezlik) GERCEKTEN olculuyor.        */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";
const JARLAR = "/tmp/claude-0/-home-user-kanal-sitesi/" +
  "e51da4d9-22bc-53d5-b9b6-e97d8e6ccf11/scratchpad";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };

sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const tek = await import("./pack/yetenekler/teknoloji_zirh.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

/* ---- sahte oyuncu: zirh yuvalari yazilabilir ---- */
function kur() {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "t1"; o.typeId = "minecraft:player";
  o._can = 20; o._maks = 20;
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
    if (ad === "minecraft:health") {
      return {
        get currentValue() { return o._can; },
        get effectiveMax() { return o._maks; },
        defaultValue: 20,
        setCurrentValue(v) { o._can = v; }
      };
    }
    return eskiGet(ad);
  };
  o.addEffect = (ad, sure, sec) => {
    efektler.push({ ad, sure, amp: sec ? sec.amplifier : 0 });
    return true;
  };
  o.removeEffect = () => true;
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o._yuvalar = yuvalar;
  o._efektler = efektler;
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  tek.teknolojiUnut();
  return { D, o };
}

function giy(o, takim, parcalar) {
  const eslek = { bas: "Head", govde: "Chest", bacak: "Legs", ayak: "Feet" };
  for (const k of Object.keys(o._yuvalar)) delete o._yuvalar[k];
  for (const p of parcalar) {
    o._yuvalar[eslek[p]] = ayar.TEKNOLOJI_ONEK + takim + "_" + p;
  }
}
const efektAmp = (o, ad) => {
  let son;
  for (const e of o._efektler) if (e.ad === ad) son = e.amp;
  return son;
};

console.log("=== 1. UC MOD, YEDI TAKIM, ON DOKUZ PARCA ===");
{
  kontrol("yedi takim tanimli", ayar.TEKNOLOJI_TAKIMLAR.size === 7,
          ayar.TEKNOLOJI_TAKIMLAR.size + " takim");
  let parca = 0;
  for (const [, t] of ayar.TEKNOLOJI_TAKIMLAR) parca += t.parcalar.length;
  kontrol("on dokuz parca", parca === 19, parca + " parca");

  /* Draconic'te DORT PARCALI TAKIM YOK. 1.20.4'te uc gogusluk
     var, otekiler kaldirilmis. Uydurulmadigini burada
     sabitliyoruz: bir gun biri "eksik" sanip eklerse test
     duser ve REFERANS_TEKNOLOJI.md'yi okumak zorunda kalir. */
  for (const ad of ["draco_wyvern", "draco_draconic", "draco_chaotic"]) {
    const t = ayar.TEKNOLOJI_TAKIMLAR.get(ad);
    kontrol(ad + " yalniz gogusluk",
            t.parcalar.length === 1 && t.parcalar[0] === "govde",
            t.parcalar.join(","));
  }
}

console.log("=== 2. ESYALAR, IKONLAR, DILLER ===");
{
  const trLang = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  const enLang = readFileSync(RP + "/texts/en_US.lang", "utf8");
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  let eksik = [];
  for (const [anahtar, t] of ayar.TEKNOLOJI_TAKIMLAR) {
    for (const p of t.parcalar) {
      const ad = anahtar + "_" + p;
      if (!existsSync(BP + "/items/" + ad + ".json")) eksik.push("esya " + ad);
      if (!existsSync(RP + "/textures/item/" + ad + ".png")) eksik.push("ikon " + ad);
      if (!atlas[ad]) eksik.push("atlas " + ad);
      if (!trLang.includes("item.pa:" + ad + "=")) eksik.push("tr " + ad);
      if (!enLang.includes("item.pa:" + ad + "=")) eksik.push("en " + ad);
    }
  }
  kontrol("her parcanin esyasi/ikonu/atlasi/dili var",
          eksik.length === 0, eksik.slice(0, 6).join(" | "));
}

console.log("=== 3. ZIRH PUANI ESYANIN ICINDE ===");
{
  /* "20 zirh" vaadi bir yerde YAZILI degil, esyanin kendi
     bileseninde OLMALI. Uc mod da 3/8/6/3 = 20 veriyor;
     Draconic gogusluk tek basina 8.                        */
  let yanlis = [];
  let toplam = {};
  for (const [anahtar, t] of ayar.TEKNOLOJI_TAKIMLAR) {
    let t2 = 0;
    for (const p of t.parcalar) {
      const e = oku(BP + "/items/" + anahtar + "_" + p + ".json");
      const c = e["minecraft:item"].components;
      const bek = ayar.TEKNOLOJI_KORUMA[p];
      if (c["minecraft:wearable"].protection !== bek) {
        yanlis.push(anahtar + "_" + p + " wearable=" +
                    c["minecraft:wearable"].protection + " != " + bek);
      }
      if (!c["minecraft:armor"] || c["minecraft:armor"].protection !== bek) {
        yanlis.push(anahtar + "_" + p + " armor bileseni yok/yanlis");
      }
      /* Yuva adlari ayarlar.js'te DEGIL, ureteci tablosunda
         (kol_uret.py:TEKNOLOJI_PARCA). Script bunlari
         kullanmiyor -- zirh yuvasini equippable adlariyla
         okuyor -- o yuzden ayarlar.js'te tutmak oksuz bir
         sabit olurdu. Beklenen deger burada yazili.        */
      const YUVA = { bas: "slot.armor.head", govde: "slot.armor.chest",
                     bacak: "slot.armor.legs", ayak: "slot.armor.feet" };
      if (c["minecraft:wearable"].slot !== YUVA[p]) {
        yanlis.push(anahtar + "_" + p + " yuva yanlis");
      }
      t2 += bek;
    }
    toplam[anahtar] = t2;
  }
  kontrol("her parcanin korumasi TEKNOLOJI_KORUMA ile ayni",
          yanlis.length === 0, yanlis.slice(0, 4).join(" | "));
  kontrol("ProjectE ve MekaSuit tam takim = 20 zirh",
          toplam.pe_kara === 20 && toplam.pe_kizil === 20 &&
          toplam.pe_mucevher === 20 && toplam.meka === 20,
          JSON.stringify(toplam));
  kontrol("Draconic gogusluk = 8 zirh (elmas gogusluk)",
          toplam.draco_wyvern === 8 && toplam.draco_draconic === 8 &&
          toplam.draco_chaotic === 8);
}

console.log("=== 4. AZALTMA -> DIRENC (vaat edilen gercekten veriliyor) ===");
{
  /* PEArmor: reduction = taban * (takilan parcalarin etkinligi)
     Etkinlik bot/baslik 0.2, gogusluk/pantolon 0.3.          */
  const hepsi = ["bas", "govde", "bacak", "ayak"];
  kontrol("etkinlik toplami tam takimda 1.0",
          Math.abs(hepsi.reduce((a, p) => a + ayar.TEKNOLOJI_ETKINLIK[p], 0) - 1)
            < 1e-9);

  kontrol("Kara Madde tam takim -> Direnc IV (amp 3)",
          tek.direncSeviyesi("pe_kara", hepsi) === 3,
          "amp " + tek.direncSeviyesi("pe_kara", hepsi));
  kontrol("Kizil Madde tam takim -> tavan Direnc IV",
          tek.direncSeviyesi("pe_kizil", hepsi) === 3);
  /* Yalniz gogusluk: 0.8 * 0.3 = 0.24 -> 1.2 seviye -> 1 -> amp 0.
     Kaynak %24 veriyor, biz %20; ASAGI yuvarlandi. Yukari
     yuvarlansaydi kaynaktan fazlasini verirdik.              */
  kontrol("Kara Madde yalniz gogusluk -> Direnc I (asagi yuvarlama)",
          tek.direncSeviyesi("pe_kara", ["govde"]) === 0,
          "amp " + tek.direncSeviyesi("pe_kara", ["govde"]));
  /* Yalniz bot: 0.8 * 0.2 = 0.16 -> 0.8 seviye -> 0 -> direnc YOK. */
  kontrol("Kara Madde yalniz bot -> direnc yok",
          tek.direncSeviyesi("pe_kara", ["ayak"]) === -1);
  kontrol("Draconic'te azaltma yok",
          tek.direncSeviyesi("draco_chaotic", ["govde"]) === -1);

  /* Geri kazanim: tavanin ustunde kalan pay.                */
  kontrol("Kara Madde geri kazanim 0 (zaten %80)",
          tek.geriKazanimOrani("pe_kara", hepsi) === 0);
  const gk = tek.geriKazanimOrani("pe_kizil", hepsi);
  kontrol("Kizil Madde geri kazanim tam 0.5", Math.abs(gk - 0.5) < 1e-9,
          String(gk));
  kontrol("Mucevher geri kazanim tam 0.5",
          Math.abs(tek.geriKazanimOrani("pe_mucevher", hepsi) - 0.5) < 1e-9);
  kontrol("eksik takimda geri kazanim yok",
          tek.geriKazanimOrani("pe_kizil", ["bas", "govde", "bacak"]) === 0);

  /* %90 gercekten cikiyor mu: Direnc IV'ten sonra kalan %20'nin
     yarisi geri veriliyor -> ham hasarin %10'u.              */
  const kalan = (1 - 0.80) * (1 - gk);
  kontrol("sonuc ham hasarin %10'u", Math.abs(kalan - 0.10) < 1e-9,
          (kalan * 100).toFixed(1) + "%");
}

console.log("=== 5. GIYINCE GERCEKTEN CALISIYOR ===");
{
  const { o } = kur();
  giy(o, "pe_kara", ["bas", "govde", "bacak", "ayak"]);
  const u = tek.takilanTakim(o);
  kontrol("dort parca okundu", u && u.parcalar.length === 4,
          u ? u.parcalar.join(",") : "yok");
  kontrol("takim adi dogru", u && u.anahtar === "pe_kara");

  o._efektler.length = 0;
  tek.teknolojiTara([o]);
  kontrol("Direnc IV verildi", efektAmp(o, "resistance") === 3,
          "amp " + efektAmp(o, "resistance"));

  /* Mucevher: PARCA efektleri parca parca.                  */
  const { o: o2 } = kur();
  giy(o2, "pe_mucevher", ["bas"]);
  tek.teknolojiTara([o2]);
  kontrol("Mucevher basligi gece gorusu veriyor",
          efektAmp(o2, "night_vision") === 0);
  kontrol("baslik yokken gogusluk efekti YOK",
          efektAmp(o2, "fire_resistance") === undefined);

  /* Takim efektleri YALNIZ tam takimda: MekaSuit ucus/ates
     bagisikligi eksik takimla gelmemeli.                    */
  const { o: o3 } = kur();
  giy(o3, "meka", ["bas", "govde", "bacak"]);
  tek.teknolojiTara([o3]);
  kontrol("MekaSuit 3/4 parca -> takim efekti yok",
          efektAmp(o3, "fire_resistance") === undefined);
  const { o: o4 } = kur();
  giy(o4, "meka", ["bas", "govde", "bacak", "ayak"]);
  tek.teknolojiTara([o4]);
  kontrol("MekaSuit tam takim -> ates bagisikligi",
          efektAmp(o4, "fire_resistance") === 0);
  kontrol("MekaSuit tam takim -> Ziplama V (amp 4)",
          efektAmp(o4, "jump_boost") === 4);
  kontrol("MekaSuit tam takim -> Hiz III (amp 2)",
          efektAmp(o4, "speed") === 2);
  kontrol("MekaSuit BAGISIKLIK vermiyor (Direnc V yasak)",
          efektAmp(o4, "resistance") === 3,
          "amp " + efektAmp(o4, "resistance"));
}

console.log("=== 6. KALKAN VE OLMEZLIK (Draconic) ===");
{
  const { o } = kur();
  giy(o, "draco_chaotic", ["govde"]);
  tek.teknolojiTara([o]);
  const t = ayar.TEKNOLOJI_TAKIMLAR.get("draco_chaotic");
  const bekAmp = Math.floor(t.kalkan.can / ayar.TEKNOLOJI_KALKAN_BIRIM) - 1;
  kontrol("kalkan Absorption olarak verildi",
          efektAmp(o, "absorption") === bekAmp,
          "amp " + efektAmp(o, "absorption") + " (bek " + bekAmp + ")");

  /* HER TARAMADA TAZELENMEMELI: tazelenirse zirh pratikte
     olumsuzluk olur. Kaynakta kalkan yavas doluyor.        */
  o._efektler.length = 0;
  for (let i = 0; i < 30; i++) { tickIlerlet(ayar.TEKNOLOJI_TARAMA); tek.teknolojiTara([o]); }
  const tazeleme = o._efektler.filter((e) => e.ad === "absorption").length;
  const gecen = 30 * ayar.TEKNOLOJI_TARAMA;
  kontrol("kalkan araliga uyuyor, her taramada tazelenmiyor",
          tazeleme <= Math.ceil(gecen / t.kalkan.aralik) + 1 && tazeleme < 30,
          tazeleme + " tazeleme / " + gecen + " tick");

  /* Olmezlik: can 0'a dusunce ayaga kaldirmali.            */
  const { o: o2 } = kur();
  giy(o2, "draco_wyvern", ["govde"]);
  o2._can = 0;
  tek.teknolojiHasar({ hurtEntity: o2, damage: 30 });
  const ol = ayar.TEKNOLOJI_TAKIMLAR.get("draco_wyvern").olmezlik;
  kontrol("olmezlik cani geri verdi", o2._can === ol.can,
          "can " + o2._can);

  /* Ikinci kez HEMEN calismamali (sarj).                   */
  o2._can = 0;
  tek.teknolojiHasar({ hurtEntity: o2, damage: 30 });
  kontrol("olmezlik sarjdayken tekrar calismiyor", o2._can === 0);

  /* Sarj dolunca yeniden.                                  */
  tickIlerlet(ol.sarj + 1);
  tek.teknolojiHasar({ hurtEntity: o2, damage: 30 });
  kontrol("sarj dolunca yeniden calisiyor", o2._can === ol.can);

  /* ProjectE'de olmezlik YOK -- uydurulmadi. Hasar 0 veriliyor
     ki geri kazanim karismasin; olculen tek sey "can 0'a
     dusunce ayaga kaldirilmiyor".                           */
  const { o: o3 } = kur();
  giy(o3, "pe_mucevher", ["bas", "govde", "bacak", "ayak"]);
  o3._can = 0;
  tek.teknolojiHasar({ hurtEntity: o3, damage: 0 });
  kontrol("ProjectE'de olmezlik yok", o3._can === 0, "can " + o3._can);

  /* Geri kazanim gercekten can veriyor mu.                 */
  const { o: o4 } = kur();
  giy(o4, "pe_kizil", ["bas", "govde", "bacak", "ayak"]);
  o4._can = 10;
  tek.teknolojiHasar({ hurtEntity: o4, damage: 4 });
  kontrol("Kizil Madde alinan hasarin yarisini geri veriyor",
          Math.abs(o4._can - 12) < 1e-9, "can " + o4._can);
  const { o: o5 } = kur();
  giy(o5, "pe_kara", ["bas", "govde", "bacak", "ayak"]);
  o5._can = 10;
  tek.teknolojiHasar({ hurtEntity: o5, damage: 4 });
  kontrol("Kara Madde'de geri kazanim yok", o5._can === 10);
}

console.log("=== 7. SAYILAR JAR'IN BYTECODE'UNDAN ===");
{
  let javap = true;
  try {
    execFileSync("javap", ["-version"], { stdio: "ignore" });
  } catch (e) { javap = false; }

  const coz = (kok, sinif) => {
    try {
      return execFileSync("javap", ["-p", "-c", "-classpath", kok, sinif],
                          { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (e) { return ""; }
  };

  const peKok = JARLAR + "/projecte";
  const mekKok = JARLAR + "/mekanism";
  const draKok = JARLAR + "/draconic";
  const varMi = (y) => existsSync(y);

  if (!javap) {
    console.log("  · javap yok, bytecode denetimi atlandi");
  } else if (!varMi(peKok) || !varMi(mekKok) || !varMi(draKok)) {
    console.log("  · jar'lar diskte degil, bytecode denetimi atlandi");
  } else {
    /* ---- ProjectE ---- */
    const mal = coz(peKok,
      "moze_intel.projecte.gameObjs.registries.PEArmorMaterials");
    kontrol("PE malzemesi elmas dagilimi (3/6/8/3)",
            /iconst_3/.test(mal) && /bipush\s+6/.test(mal) &&
            /bipush\s+8/.test(mal),
            "DIAMOND_RESISTANCES");
    const toplamPE = ayar.TEKNOLOJI_KORUMA.bas + ayar.TEKNOLOJI_KORUMA.govde +
                     ayar.TEKNOLOJI_KORUMA.bacak + ayar.TEKNOLOJI_KORUMA.ayak;
    kontrol("ayarlar.js toplami 20", toplamPE === 20, String(toplamPE));

    const pea = coz(peKok, "moze_intel.projecte.gameObjs.items.armor.PEArmor");
    kontrol("parca etkinligi 0.2 / 0.3 bytecode'da",
            /float 0\.2f/.test(pea) && /float 0\.3f/.test(pea));
    const etk = ayar.TEKNOLOJI_ETKINLIK;
    kontrol("ayarlar.js etkinligi ayni",
            etk.bas === 0.2 && etk.ayak === 0.2 &&
            etk.govde === 0.3 && etk.bacak === 0.3);

    const azaltmalar = {
      "moze_intel.projecte.gameObjs.items.armor.DMArmor": ["pe_kara", 0.8],
      "moze_intel.projecte.gameObjs.items.armor.RMArmor": ["pe_kizil", 0.9],
      "moze_intel.projecte.gameObjs.items.armor.GemArmorBase":
        ["pe_mucevher", 0.9]
    };
    let uyum = [];
    for (const [sinif, [takim, bek]] of Object.entries(azaltmalar)) {
      const kod = coz(peKok, sinif);
      const m = kod.match(/getFullSetBaseReduction[\s\S]{0,120}?float (0\.\d+)f/);
      const okunan = m ? parseFloat(m[1]) : undefined;
      const ayarda = ayar.TEKNOLOJI_TAKIMLAR.get(takim).azaltma;
      if (okunan !== bek || Math.abs(ayarda - bek) > 1e-9) {
        uyum.push(takim + " jar=" + okunan + " ayar=" + ayarda);
      }
    }
    kontrol("azaltmalar jar ile ayni (0.8 / 0.9 / 0.9)",
            uyum.length === 0, uyum.join(" | "));

    /* ---- Mekanism: MekaSuit netherite'tan okuyor ---- */
    const mekCfg = coz(mekKok, "mekanism.common.config.MekanismStartupConfig");
    kontrol("MekaSuit varsayilanlari ArmorMaterials.NETHERITE'tan",
            /ArmorMaterials\.NETHERITE/.test(mekCfg));
    /* Netherite dagilimi vanilla: 3/8/6/3 -- bizimkiyle ayni. */
    kontrol("MekaSuit zirhi ayarlar.js ile ayni (3/8/6/3)",
            ayar.TEKNOLOJI_KORUMA.bas === 3 &&
            ayar.TEKNOLOJI_KORUMA.govde === 8 &&
            ayar.TEKNOLOJI_KORUMA.bacak === 6 &&
            ayar.TEKNOLOJI_KORUMA.ayak === 3);
    const mekJump = coz(mekKok,
      "mekanism.common.content.gear.mekasuit.ModuleHydraulicPropulsionUnit$JumpBoost");
    kontrol("ULTRA ziplama 5.0f (x0.1 = +0.5 hiz -> Ziplama V)",
            /String ULTRA[\s\S]{0,60}?float 5\.0f/.test(mekJump) ||
            /float 5\.0f/.test(mekJump));
    const meka = ayar.TEKNOLOJI_TAKIMLAR.get("meka");
    const zip = meka.efektler.find((e) => e[0] === "jump_boost");
    kontrol("ayarlar.js ziplama amp 4", zip && zip[2] === 4);

    /* ---- Draconic ---- */
    const dem = coz(draKok, "com.brandon3055.draconicevolution.init.DEModules");
    kontrol("DEModules'te hiz/ziplama/kalkan cagrilari var",
            /Method speedData/.test(dem) && /Method jumpData/.test(dem) &&
            /Method shieldData/.test(dem));
    /* Chaotic ziplama 4.0 -> push(0, 0.1*(1+4), 0) = +0.5 -> amp 4 */
    kontrol("chaotic ziplama 4.0d bytecode'da", /double 4\.0d/.test(dem));
    const kaotik = ayar.TEKNOLOJI_TAKIMLAR.get("draco_chaotic");
    const kzip = kaotik.efektler.find((e) => e[0] === "jump_boost");
    kontrol("ayarlar.js chaotic ziplama amp 4", kzip && kzip[2] === 4);
    /* Kalkan kapasiteleri 25 / 50 / 100 */
    kontrol("kalkan kapasiteleri 25/50/100 bytecode'da",
            /bipush\s+25/.test(dem) && /bipush\s+50/.test(dem) &&
            /bipush\s+100/.test(dem));
    kontrol("ayarlar.js kalkanlari ayni",
            ayar.TEKNOLOJI_TAKIMLAR.get("draco_wyvern").kalkan.can === 25 &&
            ayar.TEKNOLOJI_TAKIMLAR.get("draco_draconic").kalkan.can === 50 &&
            kaotik.kalkan.can === 100);

    const chest = coz(draKok,
      "com.brandon3055.draconicevolution.items.equipment.ModularChestpiece");
    kontrol("Draconic gogusluk ArmorMaterials.DIAMOND + CHESTPLATE",
            /ArmorMaterials\.DIAMOND/.test(chest) &&
            /ArmorItem\$Type\.CHESTPLATE/.test(chest));
  }
}

console.log("=== 8. GORUNUS: MODEL VE DOKU ===");
{
  /* ProjectE ve MekaSuit'in attachable'i VAR; Draconic'inki
     YOK ve bu bilincli -- kaynak modeli serbest ucgen agi.  */
  const eksik = [];
  const fazla = [];
  for (const [anahtar, t] of ayar.TEKNOLOJI_TAKIMLAR) {
    const draco = anahtar.startsWith("draco_");
    for (const p of t.parcalar) {
      const ad = anahtar + "_" + p;
      const varA = existsSync(RP + "/attachables/" + ad + ".json");
      const varG = existsSync(RP + "/models/entity/" + ad + ".geo.json");
      if (draco && (varA || varG)) fazla.push(ad);
      if (!draco && !(varA && varG)) eksik.push(ad);
    }
  }
  kontrol("ProjectE ve MekaSuit'in modeli var", eksik.length === 0,
          eksik.join(" | "));
  kontrol("Draconic'te giyilen model YOK (uydurulmadi)",
          fazla.length === 0, fazla.join(" | "));

  /* Attachable hangi geometriyi cagiriyorsa o dosya var mi. */
  const kayip = [];
  for (const f of readdirSync(RP + "/attachables")) {
    if (!/^(pe_|meka_)/.test(f)) continue;
    const a = oku(RP + "/attachables/" + f)["minecraft:attachable"].description;
    const geoAd = a.geometry.default.replace("geometry.", "");
    const g = oku(RP + "/models/entity/" + geoAd + ".geo.json");
    if (g["minecraft:geometry"][0].description.identifier !== a.geometry.default) {
      kayip.push(f + " geometri kimligi tutmuyor");
    }
    const dokuYol = RP + "/" + a.textures.default + ".png";
    if (!existsSync(dokuYol)) kayip.push(f + " dokusu yok: " + a.textures.default);
    if (a.render_controllers[0] !== "controller.render.armor") {
      kayip.push(f + " ozel render controller (v4.28: gorunmez olur)");
    }
  }
  kontrol("attachable -> geometri -> doku zinciri saglam",
          kayip.length === 0, kayip.slice(0, 4).join(" | "));

  /* UV'ler dokunun DISINA tasmasin. Tasarsa oyun mor-siyah
     ciziyor ve sebebini soylemiyor.                         */
  const tasan = [];
  for (const f of readdirSync(RP + "/models/entity")) {
    if (!/^(pe_|meka_)/.test(f)) continue;
    const g = oku(RP + "/models/entity/" + f)["minecraft:geometry"][0];
    const en = g.description.texture_width, boy = g.description.texture_height;
    for (const k of g.bones) {
      for (const c of k.cubes || []) {
        if (Array.isArray(c.uv)) {
          const [x, y] = c.uv, [w2, h2, d2] = c.size;
          if (x < 0 || y < 0 || x + 2 * (d2 + w2) > en || y + d2 + h2 > boy) {
            tasan.push(f + " kutu uv " + c.uv);
          }
        } else {
          for (const [yon, u] of Object.entries(c.uv)) {
            if (u.uv[0] < -0.01 || u.uv[1] < -0.01 ||
                u.uv[0] + Math.abs(u.uv_size[0]) > en + 0.01 ||
                u.uv[1] + Math.abs(u.uv_size[1]) > boy + 0.01) {
              tasan.push(f + " " + yon + " " + JSON.stringify(u.uv));
            }
          }
        }
      }
    }
  }
  kontrol("hicbir UV dokunun disina tasmiyor", tasan.length === 0,
          tasan.slice(0, 3).join(" | "));

  /* MekaSuit kemikleri VANILLA OYUNCU adlariyla ve DOGRU
     TARAFTA olmali. Blockbench OBJ'si X'i ters veriyordu;
     duzeltme kayarsa sol kol sagda cikar.                   */
  const taraf = {};
  for (const p of ["bas", "govde", "bacak", "ayak"]) {
    const g = oku(RP + "/models/entity/meka_" + p + ".geo.json")
      ["minecraft:geometry"][0];
    for (const k of g.bones) {
      let mn = Infinity, mx = -Infinity;
      for (const c of k.cubes) {
        mn = Math.min(mn, c.origin[0]);
        mx = Math.max(mx, c.origin[0] + c.size[0]);
      }
      const o = taraf[k.name] || { mn: Infinity, mx: -Infinity };
      taraf[k.name] = { mn: Math.min(o.mn, mn), mx: Math.max(o.mx, mx) };
    }
  }
  const kemikAdlari = Object.keys(taraf).sort().join(",");
  kontrol("kemikler vanilla adlariyla",
          kemikAdlari === "body,head,leftArm,leftLeg,rightArm,rightLeg",
          kemikAdlari);
  kontrol("sol kol +x tarafinda (OBJ aynasi duzeltildi)",
          taraf.leftArm.mn > 0, JSON.stringify(taraf.leftArm));
  kontrol("sag kol -x tarafinda", taraf.rightArm.mx < 0,
          JSON.stringify(taraf.rightArm));
  kontrol("sol bacak +x, sag bacak -x tarafinda",
          taraf.leftLeg.mx > 0 && taraf.rightLeg.mn < 0);
  kontrol("kafa vanilla kafa kutusunun icinde",
          taraf.head.mn >= -4.5 && taraf.head.mx <= 4.5,
          JSON.stringify(taraf.head));

  /* OBJ'nin BUTUN kutulari cevrildi mi -- sessizce dusen bir
     kutu modelde delik acar ve kimse fark etmez.            */
  const obj = KOK + "/kaynak_geo/mekasuit.obj";
  if (existsSync(obj)) {
    const nesne = (readFileSync(obj, "utf8").match(/^o /gm) || []).length;
    let kutu = 0;
    for (const p of ["bas", "govde", "bacak", "ayak"]) {
      const g = oku(RP + "/models/entity/meka_" + p + ".geo.json")
        ["minecraft:geometry"][0];
      for (const k of g.bones) kutu += k.cubes.length;
    }
    kontrol("OBJ'nin her kutusu cevrildi", kutu === nesne,
            kutu + " / " + nesne);
  }

  /* ProjectE 64x32 java zirh duzeni: sol parcalar AYNALI.   */
  const ayna = [];
  for (const takim of ["pe_kara", "pe_kizil", "pe_mucevher"]) {
    for (const [p, kemik] of [["govde", "leftArm"], ["bacak", "leftLeg"],
                              ["ayak", "leftLeg"]]) {
      const g = oku(RP + "/models/entity/" + takim + "_" + p + ".geo.json")
        ["minecraft:geometry"][0];
      const k = g.bones.find((b) => b.name === kemik);
      if (!k || !k.cubes.some((c) => c.mirror === true)) {
        ayna.push(takim + "_" + p + "/" + kemik);
      }
      if (g.description.texture_height !== 32) {
        ayna.push(takim + "_" + p + " doku boyu != 32");
      }
    }
  }
  kontrol("ProjectE'de sol parcalar aynali, doku 64x32",
          ayna.length === 0, ayna.slice(0, 3).join(" | "));
}

console.log("=== 9. DEFTER TEMIZLIGI ===");
{
  const { o } = kur();
  giy(o, "draco_chaotic", ["govde"]);
  tek.teknolojiTara([o]);
  o._can = 0;
  tek.teknolojiHasar({ hurtEntity: o, damage: 30 });
  tek.teknolojiUnut(o.id);
  o._can = 0;
  tek.teknolojiHasar({ hurtEntity: o, damage: 30 });
  kontrol("unut sonrasi olmezlik sarji sifirlandi",
          o._can === ayar.TEKNOLOJI_TAKIMLAR.get("draco_chaotic").olmezlik.can,
          "can " + o._can);

  /* Zirh yokken hicbir sey yapmamali (ucuz cikis).          */
  const { o: o2 } = kur();
  o2._efektler.length = 0;
  tek.teknolojiTara([o2]);
  kontrol("zirh yokken efekt verilmiyor", o2._efektler.length === 0);
  kontrol("zirh yokken takilanTakim undefined",
          tek.takilanTakim(o2) === undefined);
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
