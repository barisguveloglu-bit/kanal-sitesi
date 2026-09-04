/* KOMUT LISTESINDEN GELEN UC ISIN                          v6.8

   Kullanici bir komut listesi gonderdi (Ice-Man / Ust Konsey /
   Kirmizi Guc) ve "hangilerini ekleyelim" diye sordu. Listenin
   cogu bizde ZATEN vardi; uc isin yeniydi.

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY ----
   Listede su satir vardi:
       execute at @a[hasitem={...}] run effect @p clear
   Kaynak bunu koymus cunku kendi isini KENDINE de deger. Bizde
   atici zaten haric -- ve o satir oyuncunun ictigi iksiri de
   silerdi. Ayni tuzagi ucurma.js'te bir kez reddetmistik.
   Buraya bir daha girmesin diye olculuyor.                  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BP = KOK + "/Simsek_TNT_ToprakTopu";

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();
const ayar = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");
const kollar = await import("./pack/yetenekler/kollar.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

console.log("=== 1. BUZ ISINI: TABLO VE KAPI ===");
{
  const t = ayar.KOL_ISIN.get("buz_isini");
  kontrol("buz_isini tabloda", !!t);
  if (t) {
    /* Kaynak: `damage @e[r=10,c=1] 3`, particle ^^^2..^^^10 */
    kontrol("  hasar kaynaktaki gibi 3", t.hasar === 3, String(t.hasar));
    kontrol("  menzil kaynaktaki gibi 10", t.menzil === 10, String(t.menzil));
    kontrol("  parcacik kaynagin parcacigi",
            t.parcacik === "minecraft:cauldron_explosion_emitter", t.parcacik);
    /* Kaynak `slowness 255 255` diyor: seviye 255 ve GERI ALAN
       HICBIR SEY yok. Yamultmada ayni sayiyla ayni karari
       vermistik -- sure sinirli.                             */
    kontrol("  yavaslik var (kaynagin 'doldurma'si)",
            t.yavaslik !== undefined, String(t.yavaslik));
    kontrol("  yavaslik SURESI sinirli (kaynak 255 diyordu)",
            t.yavaslikSure > 0 && t.yavaslikSure <= 1200,
            t.yavaslikSure + " tick");
    kontrol("  seviye motor sinirinda",
            t.yavaslik >= 0 && t.yavaslik <= 255, String(t.yavaslik));
    /* v6.9: alan adi `kol` degil `elde` -- Simsek Kilici
       vanilla bir DEMIR KILIC istiyor, kol degil.          */
    kontrol("  kapi BUZ KOL", t.elde === "pa:kol_buz", String(t.elde));
  }
  kontrol("yetenek kayitli", !!kayit.yetenekAl("buz_isini"));
  const satir = kollar.KOL_ESYALARI.find((s) => s[0] === "pa:kol_buz");
  kontrol("Buz Kol'a bagli", !!satir && satir.includes("buz_isini"),
          satir ? satir.slice(1).join(", ") : "-");
}

console.log("");
console.log("=== 2. BUZ ISINI CALISIYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  o.id = "b1"; o.typeId = "minecraft:player";
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o.getHeadLocation = () => ({ x: 0.5, y: 71, z: 0.5 });
  o.getViewDirection = () => ({ x: 0, y: 0, z: 1 });
  let elde = "pa:kol_buz";
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return { getEquipment: () => (elde ? { typeId: elde } : undefined) };
    }
    return undefined;
  };
  _durum.oyuncular = [o];

  const vurulan = [];
  const efektler = [];
  const kurban = {
    id: "z1", typeId: "minecraft:zombie", isValid: true,
    location: { x: 0.5, y: 70, z: 6.5 }, dimension: D.boyut,
    applyDamage: (n) => { vurulan.push(n); return true; },
    addEffect: (a, s, sec) => { efektler.push([a, s, sec.amplifier]); return true; }
  };
  D.boyut._varliklar = [o, kurban];

  const tanim = kayit.yetenekAl("buz_isini");
  sus();
  let is = tanim.olustur(o);
  if (is) { for (let t = 0; t < 40; t++) { if (is.calis()) break; tickIlerlet(1); } if (is && is.bitir) is.bitir(); }
  ac();
  kontrol("hedefe hasar bindi", vurulan.length === 1 && vurulan[0] === 3,
          JSON.stringify(vurulan));
  kontrol("yavaslik da bindi",
          efektler.some((e) => e[0] === "slowness"), JSON.stringify(efektler));
  const yav = efektler.find((e) => e[0] === "slowness");
  kontrol("  seviye ayardaki seviye",
          yav && yav[2] === ayar.KOL_ISIN.get("buz_isini").yavaslik,
          yav ? String(yav[2]) : "-");
  const parcacik = (D.sayac.parcacik || []).filter(
    (p) => p.tip === "minecraft:cauldron_explosion_emitter");
  kontrol("isin CIZILDI (kaynakta dokuz ayri satirdi)",
          parcacik.length >= 5, parcacik.length + " parcacik");

  /* Kapi: yanlis kol elindeyken atis OLMAMALI. Kaynak kapiyi
     kaldiraca bagliyordu; bizde kolun kendisi.

     DIKKAT -- BU TEST BIR KEZ YANLIS SEBEPTEN GECTI. Kapiyi
     kasten acik biraktim ve test yine gecti: cunku ilk
     atisin BEKLEMESI hala doluydu, yani "atmadi" sonucunu
     kapi degil bekleme veriyordu. Once beklemeyi gecirmek
     sart; yoksa bu satir hicbir sey sinamiyor.             */
  tickIlerlet(ayar.ZIRH_ISIN_BEKLEME + 5);
  elde = "pa:kol_toprak";
  vurulan.length = 0;
  sus();
  is = tanim.olustur(o);
  if (is) { for (let t = 0; t < 40; t++) { if (is.calis()) break; tickIlerlet(1); } }
  ac();
  kontrol("BASKA kol elindeyken atmiyor", vurulan.length === 0,
          JSON.stringify(vurulan));

  /* Ve dogru kol elindeyken YINE atmali -- yoksa yukaridaki
     satir "hicbir zaman atmiyor" ile de gecerdi.           */
  tickIlerlet(ayar.ZIRH_ISIN_BEKLEME + 5);
  elde = "pa:kol_buz";
  vurulan.length = 0;
  sus();
  is = tanim.olustur(o);
  if (is) { for (let t = 0; t < 40; t++) { if (is.calis()) break; tickIlerlet(1); } }
  ac();
  kontrol("DOGRU kol elindeyken yine atiyor", vurulan.length === 1,
          JSON.stringify(vurulan));
}

console.log("");
console.log("=== 3. ILKEL BESLI: IKI ISIN ===");
{
  const okazor = ayar.ILKEL_BESLI.get("okazor");
  const kajaros = ayar.ILKEL_BESLI.get("kajaros");
  kontrol("Okazor'da Kirmizi Guc var", !!(okazor && okazor.isin),
          okazor && okazor.isin && okazor.isin.ad);
  kontrol("Kajaros'ta Ates Gucu var", !!(kajaros && kajaros.isin),
          kajaros && kajaros.isin && kajaros.isin.ad);

  for (const [ad, t] of [["Okazor", okazor], ["Kajaros", kajaros]]) {
    if (!t || !t.isin) continue;
    /* Kaynak: `damage @e[r=10,c=1] 2`, `^^^10` */
    kontrol("  " + ad + ": hasar kaynaktaki gibi 2", t.isin.hasar === 2,
            String(t.isin.hasar));
    kontrol("  " + ad + ": menzil kaynaktaki gibi 10", t.isin.menzil === 10,
            String(t.isin.menzil));
    /* Kaynak bunlari HER TICK calisan komut bloklariyla
       yapiyordu. Bekleme olmasa iki uye yaninda duran hicbir
       sey hayatta kalmazdi.                                 */
    kontrol("  " + ad + ": bekleme var (kaynakta yoktu)",
            t.isin.bekleme > 0, t.isin.bekleme + " tick");
  }
  kontrol("parcacikar kaynagin parcacikleri",
          okazor.isin.parcacik === "minecraft:redstone_ore_dust_particle" &&
          kajaros.isin.parcacik === "minecraft:mobflame_single",
          okazor.isin.parcacik + " / " + kajaros.isin.parcacik);

  /* Ucuncu bir uyeye SESSIZCE isin eklenmesin: liste bilincli. */
  const isinli = [...ayar.ILKEL_BESLI].filter(([, t]) => t.isin).map(([k]) => k);
  kontrol("yalniz iki uyede isin var", isinli.length === 2, isinli.join(", "));

  const kaynak = readFileSync(BP + "/scripts/yetenekler/bot_ilkel.js", "utf8");
  kontrol("bot_ilkel.js isini ATIYOR (yazilip baglanmamis degil)",
          /if \(ILKEL_ISIN_ACIK && t\.isin\)/.test(kaynak));
  kontrol("ayar kapisi var", typeof ayar.ILKEL_ISIN_ACIK === "boolean",
          String(ayar.ILKEL_ISIN_ACIK));
  /* Ekip arkadasina ates edilmemeli. */
  kontrol("hedef suzgecinden dusmanMi geciyor",
          /if \(!dusmanMi\(v, oyuncuId\)\) continue;/.test(kaynak));
}

console.log("");
console.log("=== 4. 'effect @p clear' ALINMADI (en onemli bolum) ===");
{
  /* Kaynagin satiri:
       execute at @a[hasitem={...}] run effect @p clear
     Kendi isinindan kurtulmak icin BUTUN efektlerini siliyor --
     ictigi iksir dahil. ucurma.js'te ayni tuzagi (orada
     `effect @s clear`) bir kez reddetmistik.

     Yorumdaki ANLATIM serbest; aranan KODUN kendisi.        */
  const yorumsuz = (k) => k
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
  const dosyalar = [
    "yetenekler/isinlar.js", "yetenekler/bot_ilkel.js",
    "yetenekler/kollar.js", "ayarlar.js"
  ];
  for (const d of dosyalar) {
    const k = yorumsuz(readFileSync(BP + "/scripts/" + d, "utf8"));
    const kotu = k.split("\n").filter(
      (s) => /effect\s+@[psae]\s+clear|removeAllEffects|clearEffects/.test(s));
    kontrol(d + ": efekt silen kod YOK", kotu.length === 0,
            kotu.map((s) => s.trim()).join(" | "));
  }
  /* Atici zaten haric oldugu icin o satira gerek de yok. */
  kontrol("isin motoru aticiyi HARIC tutuyor",
          /if \(varlik\.id === oyuncu\.id\) continue;/.test(
            readFileSync(BP + "/scripts/yetenekler/isinlar.js", "utf8")));
}

console.log("");
console.log("=== 5. LISTENIN GERISI ZATEN VARDI ===");
{
  /* Kullanicinin listesindeki digerlerinin bizdeki karsiligi.
     Biri silinirse "zaten var" cevabi yalan olur.           */
  const zaten = [
    ["Uçma (levitation @p)", "ucus"],
    ["Uçurma (levitation hedefe)", "ucurma"],
    ["Yamutma (fox.sleep)", "yamult"],
    ["Dondurma (slowness 255)", "dondur"],
    ["Buz alanı", "buz_adam"]
  ];
  for (const [komut, kimlik] of zaten) {
    kontrol(komut + " -> " + kimlik, !!kayit.yetenekAl(kimlik));
  }
  /* Tek el kaldirma: playanimation holding_spyglass */
  kontrol("Tek el kaldırma -> ANIM_KALDIR ayari",
          typeof ayar.ANIM_KALDIR === "string" && ayar.ANIM_KALDIR.length > 0,
          ayar.ANIM_KALDIR);
}

console.log("");
console.log("=== 6. CODE-MAN LISTESI  (v6.9) ===");
{
  /* Kullanicinin ikinci listesi (Code-Man). Yine cogu vardi;
     ikisi yeniydi.                                          */
  const siyah = ayar.KOL_ISIN.get("codeman_isini");
  kontrol("Siyah Guc tabloda", !!siyah);
  if (siyah) {
    /* Listede IKI ayri isim altinda ama AYNI sey:
         "Siyah Guc Saldirisi"   evoker_spell ^^^20
         "Ahtapot Kol Saldirisi" evoker_spell ^^^5/10/15/20
       ikisinin de hasari `damage @e[r=10,c=1] 2`, menzili 20. */
    kontrol("  hasar kaynaktaki gibi 2", siyah.hasar === 2, String(siyah.hasar));
    kontrol("  menzil kaynaktaki gibi 20", siyah.menzil === 20,
            String(siyah.menzil));
    kontrol("  parcacik kaynagin parcacigi",
            siyah.parcacik === "minecraft:evoker_spell", String(siyah.parcacik));
    /* Kapi: Code-Man KOSTUMU. Kaynak kapiyi kaldiraca
       bagliyordu; o kostum bizde v6.2'den beri var.        */
    kontrol("  kapi Code-Man kostumu (kafada)",
            siyah.kafa === "pa:kns_codeman", String(siyah.kafa));
    /* "tahta dugme alinca ekran siyah olsun" satiri buraya
       baglandi: karanlik saldirinin kendi flasi.            */
    kontrol("  ekran karartmasi var", Array.isArray(siyah.karart),
            JSON.stringify(siyah.karart));
    kontrol("  karartma rengi SIYAH (kaynak: color 0 0 0)",
            siyah.karart.join(",") === "0,0,0", siyah.karart.join(","));
    /* camera fade 0.0-1.0 bekliyor. Referansta bazi yerlerde
       0-255 yaziliydi ve ekran kendi rengi yerine BEYAZ
       parliyordu -- iksirlerde bir kez yakalanmisti.        */
    kontrol("  renk 0.0-1.0 araliginda (0-255 degil)",
            siyah.karart.every((n) => n >= 0 && n <= 1),
            JSON.stringify(siyah.karart));
  }
  kontrol("Siyah Guc yetenek olarak kayitli",
          !!kayit.yetenekAl("codeman_isini"));

  const kilic = ayar.KOL_ISIN.get("simsek_kilici");
  kontrol("Simsek Kilici tabloda", !!kilic);
  if (kilic) {
    /* Kullanici: "sadece bu Demir kilicla calisir digerleri
       salterle". Kapi VANILLA bir esya -- alan adi bu yuzden
       `kol` degil `elde`.                                   */
    kontrol("  kapi DEMIR KILIC (vanilla esya)",
            kilic.elde === "minecraft:iron_sword", String(kilic.elde));
    /* Kaynak "8 kere tekrarla" diyor. */
    kontrol("  sekiz yildirim (kaynak: 8 kere tekrarla)",
            kilic.simsek === 8, String(kilic.simsek));
    kontrol("  menzil kaynaktaki gibi 10", kilic.menzil === 10,
            String(kilic.menzil));
    /* Tablodaki TEK hasarsiz satir: isi yildirimlar yapiyor,
       kaynakta da oyle. applyDamage(0) bos bir cagri olurdu. */
    kontrol("  KENDI hasari yok (isi yildirim yapiyor)",
            kilic.hasar === 0, String(kilic.hasar));
    kontrol("  parcacigi da yok (kaynakta yok)",
            kilic.parcacik === undefined, String(kilic.parcacik));
  }
  kontrol("Simsek Kilici yetenek olarak kayitli",
          !!kayit.yetenekAl("simsek_kilici"));

  /* Ucus aurasi: listedeki "Ucma + Particle". */
  kontrol("ucus aurasi ayari var",
          ayar.UCUS_PARCACIK === "minecraft:raid_omen_ambient",
          String(ayar.UCUS_PARCACIK));
  /* STATIK degil CALISTIRARAK olculuyor: ilk halinde
     `includes("UCUS_PARCACIK")` diyordu ve aurayi kasten
     kapattigimda TEST YINE GECTI -- sabit hala import
     ediliyordu. Sayilan sey artik cikan parcacik.          */
  {
    const D2 = dunyaKur();
    const u = oyuncuKur(D2.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
    u.id = "u9"; u.typeId = "minecraft:player";
    u.sendMessage = () => {};
    u.onScreenDisplay = { setActionBar: () => {} };
    u.addEffect = () => true;
    _durum.oyuncular = [u];
    const once = (D2.sayac.parcacik || []).length;
    sus();
    kayit.yetenekAl("ucus").olustur(u);
    ac();
    const aura = (D2.sayac.parcacik || []).slice(once)
      .filter((p) => p.tip === ayar.UCUS_PARCACIK);
    kontrol("ucus GERCEKTEN aura cikariyor",
            aura.length === ayar.UCUS_PARCACIK_YUKSEK.length,
            aura.length + " parcacik");
    /* Kaynak `~~1~` ve `~~2~` diyor: oyuncunun BIR ve IKI blok
       ustunde. `~` varligin konumu, yani AYAK hizasi --
       ilk yazdigimda kafa hizasiyla karsilastirip yanlis
       olcmustum (sahte dunyada location = kafa - 1.62).    */
    const ayak = u.location.y;
    const beklenen = ayar.UCUS_PARCACIK_YUKSEK.map((d) => ayak + d);
    kontrol("  aura ayaktan 1 ve 2 blok yukarida",
            aura.map((p) => p.y).sort().join(",") ===
            beklenen.sort().join(","),
            aura.map((p) => (p.y - ayak).toFixed(1)).join(" / ") + " blok yukarida");
  }
}

console.log("");
console.log("=== 7. SIMSEK KILICI GERCEKTEN YILDIRIM DUSURUYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  o.id = "k9"; o.typeId = "minecraft:player";
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o.getHeadLocation = () => ({ x: 0.5, y: 71, z: 0.5 });
  o.getViewDirection = () => ({ x: 0, y: 0, z: 1 });
  let elde = "minecraft:iron_sword";
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return { getEquipment: (yuva) =>
        ((yuva || "Mainhand") === "Mainhand" && elde) ? { typeId: elde } : undefined };
    }
    return undefined;
  };
  o.runCommand = () => true;
  D.boyut._varliklar = [o];
  _durum.oyuncular = [o];

  const { butceSifirla } = await import("./pack/butce.js");
  const tanim = kayit.yetenekAl("simsek_kilici");
  const once = D.sayac.dogan.length;
  sus();
  const is = tanim.olustur(o);
  if (is) {
    for (let t = 0; t < 80; t++) {
      butceSifirla();
      if (is.calis()) { if (is.bitir) is.bitir(); break; }
      tickIlerlet(1);
    }
  }
  ac();
  const simsekler = D.sayac.dogan.slice(once)
    .filter((v) => v.tip === "minecraft:lightning_bolt");
  kontrol("sekiz yildirim dustu", simsekler.length === 8,
          simsekler.length + " yildirim");
  /* Kaynak sekizini de AYNI noktaya doguruyor; tek noktaya
     dusen sekiz yildirim bir yildirimdan farksiz gorunur. */
  const ayriNokta = new Set(simsekler.map((v) => v.x.toFixed(2))).size;
  kontrol("  hepsi ayni noktaya dusmuyor (kaynakta oyleydi)",
          ayriNokta > 1, ayriNokta + " ayri x");
  /* Menzilin UCUNA dusmeli, oyuncunun dibine degil. */
  kontrol("  isinin UCUNA dustu (~10 blok ileri)",
          simsekler.every((v) => v.z > 8 && v.z < 13),
          simsekler.map((v) => v.z.toFixed(1)).join(","));

  /* Demir kilic ELDE DEGILKEN atmamali. Beklemeyi gecir --
     yoksa bu satir kapi yuzunden degil BEKLEME yuzunden
     gecer (2. bolumde tam bu tuzaga dusmustum).           */
  tickIlerlet(ayar.ZIRH_ISIN_BEKLEME + 5);
  elde = "minecraft:diamond_sword";
  const once2 = D.sayac.dogan.length;
  sus();
  const is2 = tanim.olustur(o);
  if (is2) { for (let t = 0; t < 40; t++) { butceSifirla(); if (is2.calis()) break; tickIlerlet(1); } }
  ac();
  kontrol("BASKA kilicla atmiyor (kullanici: 'sadece demir kilic')",
          D.sayac.dogan.length === once2,
          (D.sayac.dogan.length - once2) + " yildirim");
}

console.log("");
console.log("=== 8. SIYAH GUC KOSTUME BAGLI ===");
{
  /* Kapiyi kasten acik biraktigimda hicbir test dusmedi:
     Siyah Guc'u CALISTIRAN bir bolum yoktu. Tablodaki
     `kafa` alanina bakmak, kodun ona BAKTIGINI olcmuyor. */
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  o.id = "c9"; o.typeId = "minecraft:player";
  o.sendMessage = () => {};
  o.onScreenDisplay = { setActionBar: () => {} };
  o.getHeadLocation = () => ({ x: 0.5, y: 71, z: 0.5 });
  o.getViewDirection = () => ({ x: 0, y: 0, z: 1 });
  const komutlar = [];
  o.runCommand = (k) => { komutlar.push(k); return true; };
  let kafa = "pa:kns_codeman";
  o.getComponent = (ad) => {
    if (ad === "minecraft:equippable") {
      return { getEquipment: (yuva) =>
        (yuva === "Head" && kafa) ? { typeId: kafa } : undefined };
    }
    return undefined;
  };
  _durum.oyuncular = [o];

  const vurulan = [];
  D.boyut._varliklar = [o, {
    id: "z9", typeId: "minecraft:zombie", isValid: true,
    location: { x: 0.5, y: 70, z: 15.5 }, dimension: D.boyut,
    applyDamage: (n) => { vurulan.push(n); return true; },
    addEffect: () => true
  }];

  const tanim = kayit.yetenekAl("codeman_isini");
  sus();
  let is = tanim.olustur(o);
  if (is) { for (let t = 0; t < 40; t++) { if (is.calis()) break; tickIlerlet(1); } }
  ac();
  kontrol("kostum KAFADAYKEN vuruyor", vurulan.length === 1 && vurulan[0] === 2,
          JSON.stringify(vurulan));
  /* 15 blok otedekini vurmasi menzilin 20 oldugunu da
     gosteriyor: 10 olsaydi yetismezdi.                     */
  kontrol("  menzil 20'ye kadar uzaniyor (hedef 15 blok otede)",
          vurulan.length === 1);
  const parcacik = (D.sayac.parcacik || []).filter(
    (p) => p.tip === "minecraft:evoker_spell");
  kontrol("  isin cizildi", parcacik.length >= 10,
          parcacik.length + " parcacik");
  kontrol("  ekran karartildi (camera fade)",
          komutlar.some((k) => /camera @s fade .* color 0 0 0/.test(k)),
          komutlar.join(" | ") || "hic komut yok");

  /* Kostum YOKKEN atmamali. Beklemeyi gecir -- yoksa bu satir
     kapi yuzunden degil BEKLEME yuzunden gecer.            */
  tickIlerlet(ayar.ZIRH_ISIN_BEKLEME + 5);
  kafa = undefined;
  vurulan.length = 0;
  sus();
  is = tanim.olustur(o);
  if (is) { for (let t = 0; t < 40; t++) { if (is.calis()) break; tickIlerlet(1); } }
  ac();
  kontrol("kostum YOKKEN atmiyor", vurulan.length === 0, JSON.stringify(vurulan));

  /* Ve kostum geri takilinca YINE atmali -- yoksa yukaridaki
     satir "hic atmiyor" ile de gecerdi.                    */
  tickIlerlet(ayar.ZIRH_ISIN_BEKLEME + 5);
  kafa = "pa:kns_codeman";
  vurulan.length = 0;
  sus();
  is = tanim.olustur(o);
  if (is) { for (let t = 0; t < 40; t++) { if (is.calis()) break; tickIlerlet(1); } }
  ac();
  kontrol("kostum geri takilinca yine atiyor", vurulan.length === 1,
          JSON.stringify(vurulan));
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> komut listelerinden gelen isinlar calisiyor");
process.exit(hata ? 1 : 0);
