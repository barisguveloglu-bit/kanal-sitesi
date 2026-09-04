/* MAHOU TSUKAI  (Buyucu)                                 v5.4

   Kullanici: "bir tane daha mod buldum, bunu da ekle aynı
   şekilde... kalıcı olarak aktar."

   ---- EN ONEMLI BOLUM: 5. ----
   Butun mana bedelleri ve sayilar modun KENDI yapilandirmasindan
   (MTConfig$Server, 448 ayar). mahou_config.json diskteyse her
   sayi geri okunup ayarlar.js ile karsilastiriliyor.

   ---- IKINCI: 3. ----
   Mana modun kalbi. "Manan yoksa buyu calismaz" kurali
   olculuyor -- yoksa yirmi buyu yirmi bedava dugmeye donerdi. */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const RP = KOK + "/Simsek_Kol_Kaynak";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar = await import("./pack/ayarlar.js");
const mahou = await import("./pack/yetenekler/mahou.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

function kur(elde) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 },
                      { x: 0.5, y: 90.6, z: 0.5 });
  o.id = "mh1"; o.typeId = "minecraft:player";
  o._elde = elde;
  o._ozellik = new Map();
  o.getDynamicProperty = (k) => o._ozellik.get(k);
  o.setDynamicProperty = (k, v) => { o._ozellik.set(k, v); };
  const eskiGet = o.getComponent.bind(o);
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) => (y === "Mainhand" && o._elde
          ? { typeId: o._elde } : undefined),
        setEquipment: () => true
      };
    }
    return eskiGet(ad);
  };
  o._efektler = [];
  o.addEffect = (a, s2, sec) => {
    o._efektler.push({ ad: a, sure: s2, amp: sec ? sec.amplifier : 0 });
    return true;
  };
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o.getViewDirection = () => ({ x: 0, y: 0, z: 1 });
  o.getEntitiesFromViewDirection = () => [];
  _durum.oyuncular = [o];
  _durum.boyut = D.boyut;
  mahou.mahouUnut();
  return { D, o };
}
const yetenek = (k) => kayit.tumYetenekler().find((y) => y.kimlik === k);

console.log("=== 1. ON ALTI ESYA, YIRMI BUYU ===");
{
  kontrol("16 esya tanimli", ayar.MAHOU_ESYALAR.size === 16,
          ayar.MAHOU_ESYALAR.size + " esya");
  kontrol("20 buyu tanimli", ayar.MAHOU_BUYULER.size === 20,
          ayar.MAHOU_BUYULER.size + " buyu");

  const esyalar = [...ayar.MAHOU_ESYALAR.keys()]
    .concat([...ayar.MAHOU_BUYULER.keys()]);
  const eksik = [];
  const atlas = oku(RP + "/textures/item_texture.json").texture_data;
  const tr = readFileSync(RP + "/texts/tr_TR.lang", "utf8");
  for (const a of esyalar) {
    const ad = "mahou_" + a;
    if (!existsSync(BP + "/items/" + ad + ".json")) eksik.push("esya " + ad);
    if (!existsSync(RP + "/textures/item/" + ad + ".png")) eksik.push("ikon " + ad);
    if (!atlas[ad]) eksik.push("atlas " + ad);
    if (!tr.includes("item.pa:" + ad + "=")) eksik.push("dil " + ad);
  }
  kontrol("36 esyanin hepsinin dosyasi/ikonu/atlasi/dili var",
          eksik.length === 0, eksik.slice(0, 5).join(" | "));

  /* William ALINMADI: modda 2B ikonu yok. Sabitleniyor ki
     biri "eksik" sanip uydurma ikonla eklemesin.           */
  kontrol("William aktarilmadi (modda ikonu yok)",
          !ayar.MAHOU_ESYALAR.has("william") &&
          !existsSync(BP + "/items/mahou_william.json"));
}

/* ESITLIK ASAGI YUVARLANIR -- v4.96'da konan kural
   (kaynaktan FAZLASINI asla verme). JS'in Math.round'u 2.5'i
   3 yapiyor, Python'un round'u 2. The Ripper'in hasari tam
   2.5 ve ilk yazdigimda test JS kuralini kullanip uretecle
   catisti: hata KODDA degil TESTTEYDI, ayni tuzak Iron Man
   Mk85'te de yasanmisti.                                    */
const yuvarla = (x) => Math.ceil(x - 0.5);

console.log("=== 2. ESYA BILESENLERI ===");
{
  const yanlis = [];
  for (const [a, t] of ayar.MAHOU_ESYALAR) {
    const c = oku(BP + "/items/mahou_" + a + ".json")["minecraft:item"].components;
    if (t.hasar === null) {
      if (c["minecraft:damage"] !== undefined) {
        yanlis.push(a + ": alet ama hasari var");
      }
    } else if (c["minecraft:damage"] !== yuvarla(t.hasar) + 1) {
      /* Java hasar DEGISTIRICI, Bedrock TOPLAM -> +1 (WoM'da
         olculmus kural).                                    */
      yanlis.push(a + ": hasar " + c["minecraft:damage"] +
                  " != " + (yuvarla(t.hasar) + 1));
    }
    if (t.dayaniklilik &&
        (c["minecraft:durability"] || {}).max_durability !== t.dayaniklilik) {
      yanlis.push(a + ": dayaniklilik");
    }
  }
  kontrol("hasar ve dayaniklilik tabloyla ayni", yanlis.length === 0,
          yanlis.slice(0, 4).join(" | "));

  /* Parsomen SILAH DEGIL: hasar da dayaniklilik da olmamali. */
  const kotu = [];
  for (const a of ayar.MAHOU_BUYULER.keys()) {
    const c = oku(BP + "/items/mahou_" + a + ".json")["minecraft:item"].components;
    if (c["minecraft:damage"] !== undefined ||
        c["minecraft:durability"] !== undefined) kotu.push(a);
  }
  kontrol("parsomenlerin hasari/dayanikliligi yok", kotu.length === 0,
          kotu.slice(0, 4).join(", "));
}

console.log("=== 3. MANA: BEDELI OLMAYAN BUYU YOK ===");
{
  const { o } = kur();
  kontrol("baslangic manasi", mahou.manaOku(o) === ayar.MAHOU_BASLANGIC_MANA,
          String(mahou.manaOku(o)));

  /* Bedeli ode -> mana dussun.                             */
  mahou.manaYaz(o, 1000);
  kontrol("100 bedel odendi", mahou.manaHarca(o, 100) === true &&
          mahou.manaOku(o) === 900, String(mahou.manaOku(o)));
  /* Yetmiyorsa ODEMEZ -- yarim odeme yok.                  */
  kontrol("yetmeyince odemiyor", mahou.manaHarca(o, 5000) === false &&
          mahou.manaOku(o) === 900, String(mahou.manaOku(o)));
  /* Tavan asilmiyor.                                       */
  mahou.manaYaz(o, ayar.MAHOU_MANA_TAVAN + 999);
  kontrol("tavan asilmiyor", mahou.manaOku(o) === ayar.MAHOU_MANA_TAVAN);

  /* Tazeleme: MANA_REGEN_PER_TICK 1                        */
  mahou.manaYaz(o, 0);
  mahou.mahouTara([o]);
  const ilk = mahou.manaOku(o);
  tickIlerlet(ayar.MAHOU_TARAMA + 1);
  mahou.mahouTara([o]);
  kontrol("mana tazeleniyor", mahou.manaOku(o) > ilk,
          ilk + " -> " + mahou.manaOku(o));

  /* Manasiz buyu CALISMAMALI.                              */
  const { o: o2 } = kur(ayar.MAHOU_ONEK + "dusus");
  mahou.manaYaz(o2, 10);
  o2._efektler.length = 0;
  yetenek("mahou_buyu_dusus").olustur(o2);
  kontrol("manasiz Düşüş calismiyor", mahou.manaOku(o2) === 10);

  /* Manali buyu CALISMALI ve bedeli inmeli.                */
  const { o: o3 } = kur(ayar.MAHOU_ONEK + "fay_gorusu");
  mahou.manaYaz(o3, 500);
  yetenek("mahou_buyu_fay_gorusu").olustur(o3);
  kontrol("Fay Gorusu 100 mana aldi", mahou.manaOku(o3) === 400,
          String(mahou.manaOku(o3)));
  kontrol("Fay Gorusu 600 tik gece gorusu verdi",
          o3._efektler.some((e) => e.ad === "night_vision" && e.sure === 600),
          JSON.stringify(o3._efektler));
}

console.log("=== 4. KAPI: PARSOMEN ELINDE OLMALI ===");
{
  /* Eli bos: buyu calismamali, mana da inmemeli.           */
  const { o } = kur();
  mahou.manaYaz(o, 5000);
  yetenek("mahou_buyu_fay_gorusu").olustur(o);
  kontrol("parsomen elde degilken calismiyor",
          mahou.manaOku(o) === 5000 && o._efektler.length === 0);

  /* BASKA parsomen elinde: yine calismamali.               */
  const { o: o2 } = kur(ayar.MAHOU_ONEK + "gandr");
  mahou.manaYaz(o2, 5000);
  yetenek("mahou_buyu_fay_gorusu").olustur(o2);
  kontrol("baska parsomenle calismiyor", mahou.manaOku(o2) === 5000);

  kontrol("elindekiBuyu dogru okuyor",
          mahou.elindekiBuyu(o2) === "gandr", String(mahou.elindekiBuyu(o2)));
  const { o: o3 } = kur(ayar.MAHOU_ONEK + "caliburn");
  kontrol("elindekiMahouEsya dogru okuyor",
          mahou.elindekiMahouEsya(o3) === "caliburn");
  kontrol("Caliburn buyu DEGIL", mahou.elindekiBuyu(o3) === undefined);

  /* Esya yetenegi de ayni kapiya bagli.                    */
  const { o: o4 } = kur(ayar.MAHOU_ONEK + "clarent");
  mahou.manaYaz(o4, 5000);
  yetenek("mahou_kutsal_mizrak").olustur(o4);   // Rhongomyniad'in
  kontrol("baska silahla mizrak yetenegi calismiyor",
          mahou.manaOku(o4) === 5000);
}

console.log("=== 5. SAYILAR MODUN YAPILANDIRMASINDAN ===");
{
  const cfgY = KOK + "/mahou_config.json";
  if (!existsSync(cfgY)) {
    console.log("  · mahou_config.json yok, karsilastirma atlandi");
  } else {
    const cfg = oku(cfgY);
    const d = (ad) => {
      const v = cfg[ad];
      return v && v.varsayilan !== null ? parseFloat(v.varsayilan) : undefined;
    };
    kontrol("448 ayar cikarilmis", Object.keys(cfg).length === 448,
            Object.keys(cfg).length + " ayar");

    /* Mana sistemi */
    kontrol("MAX_MANA_CAP 200000", d("MAX_MANA_CAP") === ayar.MAHOU_MANA_TAVAN,
            "jar=" + d("MAX_MANA_CAP"));
    kontrol("MANA_REGEN_PER_TICK 1",
            d("MANA_REGEN_PER_TICK") === ayar.MAHOU_MANA_TICK);

    /* Buyu bedelleri -- her biri kaynaktaki ayar adiyla.    */
    const bedel = [
      ["fay_gorusu", "FAY_SIGHT_MANA_COST"],
      ["icgoru", "INSIGHT_MANA_COST"],
      ["kehanet", "CLAIRVOYANCE_MANA_COST"],
      ["baglama", "MYSTIC_EYES_MANA_COST"],
      ["guclendirme", "STRENGTHENING_MANA_COST"],
      ["bagisiklik_takasi", "IMMUNITY_EXCHANGE_MANA_COST"],
      ["kara_alev", "BLACK_FLAME_MANA_COST"],
      ["dusus", "FALLEN_DOWN_MANA_COST"],
      ["rho_aias", "RHO_AIAS_MANA_COST"],
      ["can_emme_siniri", "DRAIN_LIFE_BARRIER_MANA_COST"],
      ["yercekimi_siniri", "GRAVITY_BARRIER_MANA_COST"],
      ["alarm_siniri", "ALARM_BARRIER_MANA_COST"],
      ["yer_degistirme", "MENTAL_DISPLACEMENT_MANA_COST"],
      ["uzamsal_karisiklik", "SPATIAL_DISORIENTATION_MANA_COST"],
      ["yukselis", "ASCENSION_SCROLL_MANA_COST"],
      ["olum_toplama", "DEATH_COLLECTION_MANA_COST"],
      ["kelebek_etkisi", "BUTTERFLY_EFFECT_MANA_COST"],
      ["hasar_takasi", "DAMAGE_EXCHANGE_MANA_COST"]
    ];
    const uyumsuz = bedel
      .filter(([a, k]) => ayar.MAHOU_BUYULER.get(a).mana !== d(k))
      .map(([a, k]) => a + " ayar=" + ayar.MAHOU_BUYULER.get(a).mana +
                       " jar=" + d(k));
    kontrol("on sekiz buyu bedeli jar ile birebir",
            uyumsuz.length === 0, uyumsuz.join(" | "));

    /* Gizlenme'nin bedeli TAHMINI ve boyle isaretli olmali. */
    kontrol("Gizlenme'nin bedeli tahmini oldugu yazili",
            /tahmini/.test(ayar.MAHOU_BUYULER.get("gizlenme").ozet),
            ayar.MAHOU_BUYULER.get("gizlenme").ozet);

    /* Esya bedelleri ve dayanikliliklari */
    const esyaBedel = [
      ["rhongomyniad", "RHONGOMYNIAD_MANA_COST"],
      ["theripper", "RIPPER_FOG_MANA_COST"],
      ["staff_emrys", "EMRYS_MANA_COST_FOCUSED"],
      ["mystic_staff", "MYSTIC_STAFF_SUMMON_MANA_COST"],
      ["spatial_staff", "SPATIAL_DISORIENTATION_MANA_COST"],
      ["treasury_projection_gauntlet", "TREASURY_PROJECTION_SCROLL_MANA_COST"]
    ];
    const eu = esyaBedel
      .filter(([a, k]) => ayar.MAHOU_ESYALAR.get(a).mana !== d(k))
      .map(([a, k]) => a + " ayar=" + ayar.MAHOU_ESYALAR.get(a).mana +
                       " jar=" + d(k));
    kontrol("alti esya bedeli jar ile birebir", eu.length === 0, eu.join(" | "));

    const day = [
      ["clarent", "CLARENT_DURABILITY"],
      ["nobu", "NOBU_DURABILITY"],
      ["theripper", "RIPPER_DURABILITY"],
      ["caliburn", "POWER_CONSOLIDATION_DURABILITY"]
    ];
    const du = day
      .filter(([a, k]) => ayar.MAHOU_ESYALAR.get(a).dayaniklilik !== d(k))
      .map(([a, k]) => a + " ayar=" + ayar.MAHOU_ESYALAR.get(a).dayaniklilik +
                       " jar=" + d(k));
    kontrol("dayaniklilikar jar ile birebir", du.length === 0, du.join(" | "));

    /* The Ripper'in hasari RIPPER_DAMAGE 2.5               */
    kontrol("The Ripper hasari 2.5",
            ayar.MAHOU_ESYALAR.get("theripper").hasar === d("RIPPER_DAMAGE"));
    kontrol("Nobu hasari 8.0 (NOBU_BULLET_DAMAGE)",
            ayar.MAHOU_ESYALAR.get("nobu").hasar === d("NOBU_BULLET_DAMAGE"));
  }
}

console.log("=== 6. YETENEK DEFTERI ===");
{
  const hepsi = new Set(kayit.tumYetenekler().map((y) => y.kimlik));
  const eksik = [...ayar.MAHOU_BUYULER.keys()]
    .filter((a) => !hepsi.has("mahou_buyu_" + a));
  kontrol("yirmi buyu defterde", eksik.length === 0, eksik.join(", "));

  const esyaYet = [...ayar.MAHOU_ESYALAR.values()]
    .filter((t) => t.yetenek).map((t) => t.yetenek);
  const eksik2 = esyaYet.filter((y) => !hepsi.has(y));
  kontrol("esya yetenekleri defterde", eksik2.length === 0, eksik2.join(", "));

  /* Jest siralari benzersiz olmali (siraDenetimi de bakar). */
  const mahouYet = kayit.tumYetenekler()
    .filter((y) => y.kimlik.startsWith("mahou"));
  const siralar = mahouYet.map((y) => y.sira);
  kontrol("mahou jest siralari benzersiz",
          new Set(siralar).size === siralar.length,
          mahouYet.length + " yetenek");
}

console.log("=== 7. MANA YAZILAMAZSA PAKET OLMUYOR ===");
{
  /* Dinamik ozellik YOKSA mana bellege dusmeli ve Content
     Log dolmamali. Ilk yazimda her taramada hataYaz
     cagriliyordu ve tarama testi yakaladi.                */
  const { o } = kur(ayar.MAHOU_ONEK + "fay_gorusu");
  delete o.setDynamicProperty;
  delete o.getDynamicProperty;
  mahou.mahouUnut();
  let patladi = false;
  try {
    mahou.manaYaz(o, 1234);
    kontrol("ozellik yokken mana bellege yaziliyor",
            mahou.manaOku(o) === 1234, String(mahou.manaOku(o)));
    for (let i = 0; i < 5; i++) { mahou.mahouTara([o]); tickIlerlet(21); }
  } catch (e) { patladi = true; }
  kontrol("ozellik yokken tarama patlamiyor", !patladi);
}

console.log(hata ? "\nKALDI" : "\nhepsi gecti");
process.exit(hata ? 1 : 0);
