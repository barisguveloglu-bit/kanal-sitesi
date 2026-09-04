/* MUTANT HALIM VE ZAMAN SAATI                              v7.2

   Kullanici: "that thing Halim vardi ya, bir de MUTANT Halim
   olsun" + "zaman saati diye bir sey de ekleyelim".

   ---- BU DOSYANIN TUTTUGU EN ONEMLI SEY: 4. BOLUM ----
   Kaynagin Zaman Saati'nde KALICI BIR KILITLENME var: saate
   alinan oyuncunun eski konumu yalniz BELLEKTE tutuluyor.
   Dunya yeniden yuklenince kurban y=-500'de, korlukle,
   hareketi kapali ve geri donus bilgisi olmadan kaliyor.
   Kaydin dunya ozelliginde durdugu ve surenin dolunca
   kurbani geri getirdigi olculuyor.                        */

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
const st = await import("./pack/yetenekler/zaman_saati.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};
const oku = (y) => JSON.parse(readFileSync(y, "utf8"));

console.log("=== 1. MUTANT HALIM: DOSYALAR ===");
{
  for (const [ne, y] of [
    ["sunucu varligi", BP + "/entities/o_sey_mutant.json"],
    ["istemci varligi", RP + "/entity/o_sey_mutant.entity.json"],
    ["geometri", RP + "/models/entity/o_sey_mutant.geo.json"],
    ["doku", RP + "/textures/entity/o_sey_mutant.png"]
  ]) {
    kontrol(ne + " var", existsSync(y), y);
  }
}

console.log("");
console.log("=== 2. MUTANT: HALIM'IN KIMLIGI DURUYOR ===");
{
  const g = oku(RP + "/models/entity/o_sey_mutant.geo.json")
    ["minecraft:geometry"][0];
  const adlar = g.bones.map((b) => b.name);

  /* ALTI KOL Halim'in imzasi: iki uzun + dort yatay. Biri
     eksik kalirsa yaratik Halim olmaz.                     */
  const kollar = adlar.filter((a) => /Arm/.test(a) && !/_r\d$/.test(a));
  kontrol("alti kol tasiyicisi var", kollar.length === 6,
          kollar.join(", "));
  for (const a of ["rightArm", "leftArm", "rightMiddleArm",
                   "leftMiddleArm", "rightUpperArm", "leftUpperArm"]) {
    kontrol("  " + a + " var", adlar.includes(a));
  }
  /* Koca yumruklar: kullanicinin gonderdigi gorselde
     mutantin en belirgin ikinci ozelligi.                  */
  kontrol("koca yumruklar var",
          adlar.includes("rightFist") && adlar.includes("leftFist"));

  /* ---- KULLANICI DUZELTTI: KAMBUR DEGIL ----
     Ilk denemede kafayi omuzlarin arasina gomup govdeyi one
     egmistim. Kullanici Mutant Boralo'nun gorselini gonderdi:
     yaratik DIK duruyor, kafa TEPEDE.                      */
  const kafa = g.bones.find((b) => b.name === "head");
  const govde = g.bones.find((b) => b.name === "body");
  const kafaAlt = Math.min(...kafa.cubes.map((c) => c.origin[1]));
  const govdeUst = Math.max(...govde.cubes.map((c) => c.origin[1] + c.size[1]));
  kontrol("kafa govdenin TEPESINDE (gomulu degil)",
          kafaAlt >= govdeUst, "kafa alt " + kafaAlt + " · govde ust " + govdeUst);

  /* Kollar dizin ALTINA inmeli -- gorseldeki asil ozellik. */
  const kol = g.bones.find((b) => b.name === "rightArm");
  const bacak = g.bones.find((b) => b.name === "rightLeg");
  const kolDip = Math.min(...kol.cubes.map((c) => c.origin[1]));
  const bacakOrta = Math.max(...bacak.cubes.map((c) => c.origin[1]));
  kontrol("kollar diz hizasinin ALTINA iniyor",
          kolDip <= bacakOrta, "kol dibi " + kolDip + " · diz " + bacakOrta);

  /* Kemik adlari VANILLA duzeninde olmali: yuruyus
     animasyonu (animation.o_sey.yuru) onlari oynatiyor.
     Kaynagin Anchor/Torso/BodyUpper adlari alinsaydi model
     HAREKETSIZ kalirdi ve hicbir hata gorunmezdi.          */
  for (const a of ["body", "head", "rightLeg", "leftLeg"]) {
    kontrol("  vanilla kemik '" + a + "'", adlar.includes(a));
  }
  const istemci = oku(RP + "/entity/o_sey_mutant.entity.json")
    ["minecraft:client_entity"].description;
  kontrol("yuruyus animasyonu O SEY ile ayni",
          istemci.animations.yuru === "animation.o_sey.yuru",
          istemci.animations.yuru);
  kontrol("kendi geometrisini gosteriyor",
          istemci.geometry.default === "geometry.o_sey_mutant");
  kontrol("kendi dokusunu gosteriyor",
          istemci.textures.default === "textures/entity/o_sey_mutant");
}

console.log("");
console.log("=== 3. MUTANT: O SEY'DEN GUCLU AMA AYRI ===");
{
  const m = oku(BP + "/entities/o_sey_mutant.json")["minecraft:entity"];
  const o = oku(BP + "/entities/o_sey.json")["minecraft:entity"];
  kontrol("AYRI kimlik", m.description.identifier === "pa:o_sey_mutant",
          m.description.identifier);
  const can = (e) => e.components["minecraft:health"].value;
  const has = (e) => e.components["minecraft:attack"].damage;
  kontrol("cani O SEY'den fazla", can(m) > can(o),
          can(m) + " vs " + can(o));
  kontrol("hasari O SEY'den fazla", has(m) > has(o),
          has(m) + " vs " + has(o));
  /* Daha agir: dev bir yaratik hizli olmamali. */
  kontrol("O SEY'den YAVAS",
          m.components["minecraft:movement"].value <
          o.components["minecraft:movement"].value);

  /* Carpisma kutusu modelin gercek boyuna yakin olmali:
     yanlis birakilirsa duvarin icinde kaliyor (O Sey'de bir
     kez yasanmis).                                          */
  const g = oku(RP + "/models/entity/o_sey_mutant.geo.json")
    ["minecraft:geometry"][0];
  let enAlt = Infinity, enUst = -Infinity;
  for (const b of g.bones) {
    for (const c of (b.cubes || [])) {
      enAlt = Math.min(enAlt, c.origin[1]);
      enUst = Math.max(enUst, c.origin[1] + c.size[1]);
    }
  }
  const boy = (enUst - enAlt) / 16;
  const kutu = m.components["minecraft:collision_box"].height;
  kontrol("carpisma kutusu modelin boyuyla uyumlu",
          Math.abs(kutu - boy) < 0.35,
          "kutu " + kutu + " · model " + boy.toFixed(2));

  /* v4.66 dersi: bilesen gruplari temel bilesenleri EZIYOR. */
  let ezen = [];
  for (const [grup, ic] of Object.entries(m.component_groups || {})) {
    if (grup === "pa:bekle") continue;
    for (const b of ["minecraft:attack", "minecraft:health",
                     "minecraft:movement"]) {
      if (ic[b]) ezen.push(grup + "/" + b);
    }
  }
  kontrol("hicbir grup temel sayilari EZMIYOR", ezen.length === 0,
          ezen.join(", ") || "temiz");
}

console.log("");
console.log("=== 4. ZAMAN SAATI: KILITLENME YOK (en onemli bolum) ===");
{
  /* Kaynak `saatteOlanlar` Map'i yalniz bellekte tutuyor:
     dunya yeniden yuklenince kurban y=-500'de kaliyor ve
     geri donus bilgisi YOK.                                */
  const D = dunyaKur();
  const saatci = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  saatci.id = "s1"; saatci.typeId = "minecraft:player";
  const kurban = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 5.5, y: 70, z: 5.5 });
  kurban.id = "s2"; kurban.typeId = "minecraft:player";
  for (const p of [saatci, kurban]) {
    p.sendMessage = () => {};
    p.onScreenDisplay = { setActionBar: () => {} };
    p.runCommand = () => true;
    p._efekt = new Map();
    p.addEffect = (a, s, sec) => { p._efekt.set(a, s); return true; };
    p.removeEffect = (a) => { p._efekt.delete(a); return true; };
    p._isin = null;
    p.teleport = (k) => { p._isin = { x: k.x, y: k.y, z: k.z }; p.location = k; return true; };
  }
  saatci.getEntitiesFromViewDirection = () => [{ entity: kurban }];
  _durum.oyuncular = [saatci, kurban];
  _durum.ozellikler.delete(ayar.SAAT_KAYIT_ANAHTAR);
  st.saatUnut();

  const eskiKonum = { x: kurban.location.x, y: kurban.location.y, z: kurban.location.z };
  st.saatCalistir(saatci, 4);
  kontrol("kurban saate alindi", st.saatHapisteMi(kurban.id) === true);
  kontrol("  yerin altina isinlandi",
          kurban._isin && kurban._isin.y === ayar.SAAT_HAPIS_Y,
          JSON.stringify(kurban._isin));
  /* Kaynagin verdigi koruyucu efektler: kurban olmesin. */
  kontrol("  direnc ve doygunluk verildi (kaynaktaki gibi)",
          kurban._efekt.has("resistance") && kurban._efekt.has("saturation"));

  /* ---- ASIL SINAMA: KAYIT DUNYADA MI ---- */
  const kayit = _durum.ozellikler.get(ayar.SAAT_KAYIT_ANAHTAR);
  kontrol("eski konum DUNYA OZELLIGINDE (kaynakta yalniz bellekteydi)",
          typeof kayit === "string" && kayit.includes(String(Math.round(eskiKonum.x))),
          String(kayit));

  /* Dunya yeniden yuklendi: bellek bosaldi, kayit geri okundu. */
  st.saatUnut();
  _durum.ozellikler.set(ayar.SAAT_KAYIT_ANAHTAR, kayit);
  kurban._isin = null;
  const tur = Math.ceil(ayar.SAAT_HAPIS_SURE / ayar.SAAT_HAPIS_TARAMA) + 3;
  for (let i = 0; i < tur; i++) {
    tickIlerlet(ayar.SAAT_HAPIS_TARAMA);
    st.saatTara([saatci, kurban]);
  }
  kontrol("sure dolunca kurban KENDILIGINDEN geri geldi",
          st.saatHapisteMi(kurban.id) === false);
  kontrol("  ESKI konumuna donduruldu",
          kurban._isin && Math.abs(kurban._isin.x - eskiKonum.x) < 0.01 &&
          Math.abs(kurban._isin.y - eskiKonum.y) < 0.01,
          JSON.stringify(kurban._isin) + " beklenen " + JSON.stringify(eskiKonum));
  kontrol("  verdigimiz efektler kaldirildi",
          !kurban._efekt.has("blindness") && !kurban._efekt.has("resistance"));
}

console.log("");
console.log("=== 5. 'effect @s clear' ALINMADI ===");
{
  /* Kaynak kurbani birakirken BUTUN efektlerini siliyor --
     ictigi iksir dahil. Bu kalibi ucuncu kez reddediyoruz. */
  const yorumsuz = (k) => k
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
  for (const d of ["yetenekler/zaman_saati.js", "main.js"]) {
    const k = yorumsuz(readFileSync(BP + "/scripts/" + d, "utf8"));
    const kotu = k.split("\n").filter(
      (s) => /effect\s+@\w+\s+clear|removeAllEffects/.test(s));
    kontrol(d + ": efekt silen kod YOK", kotu.length === 0,
            kotu.map((s) => s.trim()).join(" | "));
  }
  const sk = readFileSync(BP + "/scripts/yetenekler/zaman_saati.js", "utf8");
  kontrol("yalniz BIZIM verdiklerimiz kaldiriliyor",
          /removeEffect\(ad\)/.test(sk));
}

console.log("");
console.log("=== 6. SAAT: MODLAR VE ULASILABILIRLIK ===");
{
  kontrol("bes mod var", st.MOD_ADLARI.length === 5,
          st.MOD_ADLARI.join(" · "));
  const y = BP + "/items/zaman_saati.json";
  kontrol("esya var", existsSync(y));
  if (existsSync(y)) {
    const d = oku(y)["minecraft:item"];
    kontrol("  kimlik ayarlarla ayni",
            d.description.identifier === ayar.SAAT_ESYA,
            d.description.identifier);
    kontrol("  yaratici menusunde", !!d.description.menu_category);
  }
  kontrol("ikon pakette",
          existsSync(RP + "/textures/item/zaman_saati.png"));

  const kaynak = readFileSync(BP + "/scripts/main.js", "utf8");
  kontrol("main.js zaman_saati.js'i import ediyor",
          kaynak.includes('from "./yetenekler/zaman_saati.js"'));
  kontrol("tarama merkezi tick'ten cagriliyor",
          /saatTara\(oyuncular\)/.test(kaynak));
  kontrol("oyuncu cikinca defter temizleniyor",
          /saatUnut\(olay\.playerId\)/.test(kaynak));
  /* Kaynak: egilerek menu, normal basisla calistir. */
  kontrol("egilerek MENU aciliyor",
          /isSneaking[\s\S]{0,80}saatMenusuAc\(oyuncu\)/.test(kaynak));
  kontrol("normal basisla SECILI mod calisiyor",
          /saatCalistir\(oyuncu, mod\)/.test(kaynak));
  /* Menu modulu yoksa saat yine kullanilabilmeli:
     "kilit hep cift".                                      */
  kontrol("menu yoksa modlar sirayla donuyor",
          /menü yok, sırayla/.test(kaynak));
}

console.log("");
console.log("=== 7. SAAT: DEFTER BOSKEN HIC DONMUYOR ===");
{
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, { x: 0.5, y: 70, z: 0.5 });
  o.id = "s9"; o.typeId = "minecraft:player";
  o.sendMessage = () => {}; o.onScreenDisplay = { setActionBar: () => {} };
  _durum.oyuncular = [o];
  _durum.ozellikler.delete(ayar.SAAT_KAYIT_ANAHTAR);
  st.saatUnut();
  const once = D.sayac.getBlock;
  for (let i = 0; i < 20; i++) { tickIlerlet(20); st.saatTara([o]); }
  kontrol("kurban yokken hicbir sey olmuyor", st.saatHapisSayisi() === 0);
  kontrol("hic blok okunmuyor", D.sayac.getBlock === once,
          (D.sayac.getBlock - once) + " okuma");
}

console.log("");
console.log("=== TELEKINEZ GUCLENDIRMESI (v7.6) ===");
{
  /* Kullanici: "telekinezisini daha da guclendirebilir misin."
     Kaynakta tutmak ve firlatmak hedefe HICBIR SEY yapmiyordu,
     yalniz yerini degistiriyordu.

     Bu bolum sayilara degil ISE bakiyor: kod GERCEKTEN
     calistiriliyor ve hasarin uygulanip uygulanmadigi
     olculuyor. "ayarlar.js'te sayi buyudu" demek yeterli
     olsaydi v4.78'in dersini hic ogrenmemis olurduk.       */
  const D = dunyaKur();
  const saatci = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 70, z: 0.5 });
  const kurban = oyuncuKur(D.boyut, { x: 1, y: 0, z: 0 }, { x: 6.5, y: 70, z: 0.5 });
  saatci.id = "tk_saatci"; kurban.id = "tk_kurban";
  for (const p of [saatci, kurban]) {
    p.onScreenDisplay = { setActionBar: () => {} };
    p.runCommand = () => true;
    p._efekt = new Map();
    p.addEffect = (a, s, o) => { p._efekt.set(a, s); return true; };
    p.removeEffect = (a) => { p._efekt.delete(a); return true; };
    p.teleport = (k) => { p.location = k; return true; };
    /* Alinan hasarlarin DEFTERI. */
    p._hasar = [];
    p.applyDamage = (n, o) => {
      p._hasar.push({ n, sebep: o && o.cause, vuran: o && o.damagingEntity
                      ? o.damagingEntity.id : undefined });
      return true;
    };
  }
  saatci.getEntitiesFromViewDirection = () => [{ entity: kurban }];
  saatci.getViewDirection = () => ({ x: 1, y: 0, z: 0 });
  _durum.oyuncular = [saatci, kurban];
  /* world.getEntity(id) bunlarin uzerinden calisiyor -- kurban
     burada olmazsa telekinez hedefi HER TARAMADA kaybeder ve
     test "hasar yok" der, sebebini soylemez. */
  _durum.varliklar = [saatci, kurban];
  st.saatUnut();

  /* ---- 1. YAKALAMA ---- */
  st.saatCalistir(saatci, 3);            // 3 = telekinez
  kontrol("hedef yakalandi", st.saatTutulan(saatci.id) === kurban.id);
  kontrol("  menzil ayarlardan geliyor", ayar.SAAT_TELEKINEZ_MENZIL >= 15,
          ayar.SAAT_TELEKINEZ_MENZIL + " blok");

  /* ---- 2. EZME: tutmak artik zararsiz degil ---- */
  kurban._hasar = [];
  const tur = 5;
  for (let i = 0; i < tur; i++) {
    tickIlerlet(ayar.SAAT_TELEKINEZ_ARALIK);
    st.saatTara([saatci, kurban]);
  }
  const ezme = kurban._hasar.filter((h) => h.n === ayar.SAAT_TELEKINEZ_EZME);
  kontrol("tutarken EZME hasari uygulandi", ezme.length > 0,
          ezme.length + " vurus x " + ayar.SAAT_TELEKINEZ_EZME);
  kontrol("  hasar SAATCIYE yaziliyor (XP ve olum mesaji dogru gitsin)",
          ezme.length > 0 && ezme[0].vuran === saatci.id, String(ezme[0] && ezme[0].vuran));
  kontrol("  hedef hala onde tutuluyor", st.saatTutulan(saatci.id) === kurban.id);

  /* ---- 3. FIRLATMA: carpma hasari ---- */
  kurban._hasar = [];
  st.saatCalistir(saatci, 3);            // ikinci basis = firlat
  kontrol("firlatildi (artik tutulmuyor)", st.saatTutulan(saatci.id) === undefined);
  const carpma = kurban._hasar.filter((h) => h.n === ayar.SAAT_TELEKINEZ_HASAR);
  kontrol("firlatinca CARPMA hasari uygulandi", carpma.length === 1,
          carpma.length + " vurus x " + ayar.SAAT_TELEKINEZ_HASAR);
  /* Belgelenmis karar: firlatma bir saldiri, INFAZ DEGIL. */
  kontrol("  yumusak dusus HALA veriliyor (infaz degil)",
          kurban._efekt.has("slow_falling"));
  kontrol("  carpma ezmeden agir", ayar.SAAT_TELEKINEZ_HASAR > ayar.SAAT_TELEKINEZ_EZME,
          ayar.SAAT_TELEKINEZ_HASAR + " > " + ayar.SAAT_TELEKINEZ_EZME);
}

console.log("");
console.log(hata ? ">>> SORUN VAR" : ">>> Mutant Halim ve Zaman Saati calisiyor");
process.exit(hata ? 1 : 0);
