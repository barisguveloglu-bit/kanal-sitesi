/* VOID TAKIMI                                              v7.1

   Kaynak: Falen Mod V2 (Trb1545). Kullanici dosyayi TEKRAR
   gonderdi: "canli olarak bakmani istedim ki referanstan
   bakarak birazcik riskli oluyor." Dogruydu -- asagidaki uc
   sey ancak dosyalarin kendisinde goruluyor.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY: 3. BOLUM ----
   Kaynagin `Void.mcfunction`u tek satir:
     replaceitem entity @a slot.armor.head 1 sp:voidol 1 0
       {"item_lock":{"mode":"lock_in_slot"}}
   `@a` = DUNYADAKI HERKES, `replaceitem` kafadaki migferi YOK
   EDIYOR ve `lock_in_slot` cikarilmasini engelliyor. Bu depoda
   esya kaybettiren hicbir sey yok; migferin deftere yazilip
   AYNEN geri verildigi olculuyor.                          */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import {
  tickIlerlet, esyaKaydet, hasarTetikle, _durum
} from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";
const FL = "/tmp/fl/Falen_behavior_pack";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const vd = await import("./pack/yetenekler/void.js");

esyaKaydet(ayar.VOID_MIGFER, "minecraft:diamond_helmet",
           "minecraft:netherite_helmet");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

function kur(migfer) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  o.id = "v1"; o.typeId = "minecraft:player";
  o._kafa = migfer;
  o._efekt = [];
  o._isinlandi = null;
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return {
        getEquipment: (y) =>
          (y === "Head" && o._kafa) ? { typeId: o._kafa } : undefined,
        setEquipment: (y, e) => {
          if (y === "Head") o._kafa = e ? e.typeId : undefined;
          return true;
        }
      };
    }
    return undefined;
  };
  o.addEffect = (a, s, sec) => { o._efekt.push([a, s, sec && sec.amplifier]); return true; };
  o.teleport = (k) => { o._isinlandi = { x: k.x, y: k.y, z: k.z }; o.location = k; return true; };
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  _durum.oyuncular = [o];
  vd.voidUnut();
  return { D, o };
}

const ilerlet = (o, n) => {
  for (let i = 0; i < n; i++) { tickIlerlet(ayar.VOID_TARAMA); vd.voidTara([o]); }
};

console.log("=== 1. ON ESYA DA YERINDE ===");
{
  const esyalar = [
    ["void_kilic", 255], ["void_balta", 5], ["void_kazma", 5],
    ["void_kurek", 4], ["void_alet", 5],
    ["ender_kilic", 1], ["evren_kilic", 15], ["trb_kilic", 12]
  ];
  for (const [a, h] of esyalar) {
    const y = BP + "/items/kns_" + a + ".json";
    kontrol(a + " esyasi var", existsSync(y));
    if (!existsSync(y)) continue;
    const c = oku(y)["minecraft:item"].components;
    kontrol("  hasari kaynaktaki gibi " + h,
            (c["minecraft:damage"] || 0) === h,
            String(c["minecraft:damage"]));
    /* Kaynakta hepsinin dayanikligi 600. */
    kontrol("  dayaniklilik 600",
            (c["minecraft:durability"] || {}).max_durability === 600,
            JSON.stringify(c["minecraft:durability"]));
  }
  for (const a of ["void_migfer", "enigma"]) {
    const c = oku(BP + "/items/kns_" + a + ".json")["minecraft:item"].components;
    kontrol(a + " KAFAYA takiliyor",
            (c["minecraft:wearable"] || {}).slot === "slot.armor.head",
            JSON.stringify(c["minecraft:wearable"]));
  }
}

console.log("");
console.log("=== 2. SAYILAR KAYNAKLA BIREBIR (canli dosyadan) ===");
{
  if (!existsSync(FL)) {
    console.log("  · kaynak paket diskte degil, atlandi");
  } else {
    const esleme = {
      void_kilic: "sp_void_sword", void_balta: "sp_void_axe",
      void_kazma: "sp_void_pickaxe", void_kurek: "sp_void_shovel",
      void_alet: "sp_voidmultitool", ender_kilic: "sp_ender_sword",
      evren_kilic: "sp_univers_sword", trb_kilic: "sp_trb1545_sword",
      void_migfer: "sp_voidol", enigma: "sp_enigma"
    };
    let sapan = 0;
    for (const [bizim, kaynak] of Object.entries(esleme)) {
      const k = oku(FL + "/items/" + kaynak + ".json")["minecraft:item"].components;
      const b = oku(BP + "/items/kns_" + bizim + ".json")["minecraft:item"].components;
      const kh = k["minecraft:damage"] || 0, bh = b["minecraft:damage"] || 0;
      if (kh !== bh) { sapan++; kontrol(bizim + ": hasar birebir", false, kh + " vs " + bh); }
      const kd = (k["minecraft:durability"] || {}).max_durability || 0;
      const bd = (b["minecraft:durability"] || {}).max_durability || 0;
      if (kd !== bd) { sapan++; kontrol(bizim + ": dayaniklilik birebir", false, kd + " vs " + bd); }
    }
    kontrol("on esyanin sayilari kaynaktan SAPMIYOR", sapan === 0, sapan + " sapma");
    /* Void Kilici'nin 255'i BILEREK korundu: netherite kilic 8,
       bu depodaki en guclu esya 62. Sayi burada kayit altinda
       ki "kazara boyle kalmis" denmesin.                    */
    const vk = oku(BP + "/items/kns_void_kilic.json")["minecraft:item"].components;
    kontrol("Void Kilici 255 (kaynaktaki gibi, bilerek)",
            vk["minecraft:damage"] === 255, String(vk["minecraft:damage"]));
  }
}

console.log("");
console.log("=== 3. MIGFER KAYBOLMUYOR (en onemli bolum) ===");
{
  /* Kaynak: `replaceitem entity @a slot.armor.head` -- kafadaki
     migferi YOK EDIYOR ve `@a` ile herkese yapiyor.        */
  const { o } = kur("minecraft:netherite_helmet");
  kontrol("baslangicta netherite migfer var",
          o._kafa === "minecraft:netherite_helmet");

  kontrol("bulasti", vd.voidBulastir(o) === true);
  kontrol("  Void migferi takildi", o._kafa === ayar.VOID_MIGFER, String(o._kafa));
  kontrol("  durum defterde", vd.voidDurum(o.id) === true);

  /* Cikarmaya calis: geri giydirilmeli (kaynagin
     `lock_in_slot`unun karsiligi -- ama SURELI).           */
  o._kafa = undefined;
  ilerlet(o, 1);
  kontrol("elle cikarilan Void migferi GERI takiliyor",
          o._kafa === ayar.VOID_MIGFER, String(o._kafa));

  /* Sure dolunca ESKI migfer geri gelmeli. */
  ilerlet(o, Math.ceil(ayar.VOID_SURE / ayar.VOID_TARAMA) + 2);
  kontrol("sure doldu, Void gecti", vd.voidDurum(o.id) === false);
  kontrol("  NETHERITE MIGFER geri geldi",
          o._kafa === "minecraft:netherite_helmet", String(o._kafa));

  /* Kafasi BOSKEN bulasan BOS kalmali -- uydurma migfer
     verilmemeli.                                           */
  const b = kur(undefined);
  vd.voidBulastir(b.o);
  ilerlet(b.o, Math.ceil(ayar.VOID_SURE / ayar.VOID_TARAMA) + 2);
  kontrol("bos kafa bos kaldi (uydurma migfer yok)",
          b.o._kafa === undefined, String(b.o._kafa));

  /* Zaten Void takan birine tekrar bulasmak, eskisi diye
     VOID'i yazmamali -- arinca kendini geri takardi.       */
  const c = kur(ayar.VOID_MIGFER);
  vd.voidBulastir(c.o);
  ilerlet(c.o, Math.ceil(ayar.VOID_SURE / ayar.VOID_TARAMA) + 2);
  kontrol("Void takana bulasinca Void geri TAKILMIYOR",
          c.o._kafa === undefined, String(c.o._kafa));
}

console.log("");
console.log("=== 4. KAYNAGIN ESYA SILEN SATIRLARI ALINMADI ===");
{
  /* Yorumdaki ANLATIM serbest; aranan KODUN kendisi. */
  const yorumsuz = (k) => k
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
  for (const d of ["yetenekler/void.js", "main.js", "ayarlar.js"]) {
    const k = yorumsuz(readFileSync(BP + "/scripts/" + d, "utf8"));
    const kotu = k.split("\n").filter(
      (s) => /replaceitem|clear\s+@|item_lock|lock_in_slot/.test(s));
    kontrol(d + ": esya silen/kilitleyen kod YOK", kotu.length === 0,
            kotu.map((s) => s.trim()).join(" | "));
  }
  /* Ve bulasma YALNIZ vurulana: kaynak `@a` diyordu. */
  const vk = readFileSync(BP + "/scripts/yetenekler/void.js", "utf8");
  kontrol("bulasma tek hedefe (kaynak @a diyordu)",
          /voidBulastir\(kurban\)/.test(vk));
  kontrol("sure sinirli (kaynakta kaliciydi)",
          typeof ayar.VOID_SURE === "number" && ayar.VOID_SURE > 0,
          ayar.VOID_SURE + " tick");
}

console.log("");
console.log("=== 5. ENDER KILICI: FIRLATIR, INFAZ ETMEZ ===");
{
  /* Kaynak: `tp @e[r=10,c=1] ~~400~` -- 400 blok dusus kesin
     olum, ustelik `@e` aticiyi ve evcil hayvani da kapsiyor. */
  const { o } = kur(undefined);
  const kurban = kur(undefined);
  kurban.o.id = "v2";
  const oncekiY = kurban.o.location.y;
  kontrol("firlatti", vd.enderFirlat(kurban.o, o) === true);
  kontrol("  yukari gitti",
          kurban.o._isinlandi && kurban.o._isinlandi.y > oncekiY,
          JSON.stringify(kurban.o._isinlandi));
  const fark = kurban.o._isinlandi.y - oncekiY;
  kontrol("  yukseklik ayardaki kadar", fark === ayar.ENDER_FIRLATMA,
          fark + " blok");
  /* 400 kesin olum; bizimki oldurmemeli.                   */
  kontrol("  kaynagin 400 blogundan COK daha alcak",
          ayar.ENDER_FIRLATMA < 100, ayar.ENDER_FIRLATMA + " vs 400");
  kontrol("  yumusak dusus verildi",
          kurban.o._efekt.some((e) => e[0] === "slow_falling"),
          JSON.stringify(kurban.o._efekt));
  /* Kaynak `@e` diyor: atici da menzilde olabilir. */
  kontrol("KENDINI firlatmiyor (kaynak @e diyordu)",
          vd.enderFirlat(o, o) === false);
}

console.log("");
console.log("=== 6. ULASILABILIYOR MU ===");
{
  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js void.js'i import ediyor",
          kaynak.includes('from "./yetenekler/void.js"'));
  kontrol("tarama merkezi tick'ten cagriliyor",
          /voidTara\(oyuncular\)/.test(kaynak));
  kontrol("oyuncu cikinca defter temizleniyor",
          /voidUnut\(olay\.playerId\)/.test(kaynak));
  /* ---- KANCA GERCEK VURUSTAN GECIRILIYOR ----
     Ilk halinde yalnizca `olayaAbone("entityHurt"` var mi diye
     BAKIYORDU. Kancayi kasten kirdigimda (bulastirma satirini
     kapattim) TEST YINE GECTI -- abone hala oradaydi, yaptigi
     is yoktu. Artik sahte dunyada gercek bir vurus
     tetikleniyor.                                          */
  {
    const a = kur(undefined);           // vuran
    const b = kur("minecraft:diamond_helmet");
    b.o.id = "v9";
    let elde = ayar.VOID_ALET;
    a.o.getComponent = (ad) => {
      if (ad === "minecraft:equippable") {
        return { getEquipment: (y) =>
          (y === "Mainhand" && elde) ? { typeId: elde } : undefined };
      }
      return undefined;
    };
    hasarTetikle({ hurtEntity: b.o,
                   damageSource: { damagingEntity: a.o } });
    kontrol("Void Coklu Alet ile VURUNCA bulasiyor",
            vd.voidDurum(b.o.id) === true);
    kontrol("  elmas migferi deftere yazildi (yok edilmedi)",
            b.o._kafa === ayar.VOID_MIGFER, String(b.o._kafa));

    /* Ender Kilici de ayni kancadan geciyor. */
    const c = kur(undefined);
    c.o.id = "v10";
    elde = ayar.ENDER_KILIC;
    const oncekiY = c.o.location.y;
    hasarTetikle({ hurtEntity: c.o,
                   damageSource: { damagingEntity: a.o } });
    kontrol("Ender Kilici ile VURUNCA firliyor",
            !!c.o._isinlandi && c.o._isinlandi.y > oncekiY,
            JSON.stringify(c.o._isinlandi));

    /* BASKA bir esya elindeyken hicbir sey olmamali. */
    const d = kur(undefined);
    d.o.id = "v11";
    elde = "minecraft:diamond_sword";
    hasarTetikle({ hurtEntity: d.o,
                   damageSource: { damagingEntity: a.o } });
    kontrol("baska silahla vurunca HICBIR SEY olmuyor",
            vd.voidDurum(d.o.id) === false && d.o._isinlandi === null);
  }
  kontrol("ayar kapisi var", typeof ayar.VOID_ACIK === "boolean",
          String(ayar.VOID_ACIK));
}

console.log("");
console.log("=== 7. DEFTER BOSKEN HIC DONMUYOR ===");
{
  const { D, o } = kur(undefined);
  const once = D.sayac.getBlock;
  ilerlet(o, 20);
  kontrol("kurban yokken hicbir sey olmuyor", vd.voidSayisi() === 0);
  kontrol("hic blok okunmuyor", D.sayac.getBlock === once,
          (D.sayac.getBlock - once) + " okuma");
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Void takimi calisiyor");
process.exit(hata ? 1 : 0);
