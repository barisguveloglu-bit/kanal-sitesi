/* POWERBORNE HEROES -- eksik onbir mekanik          v7.87

   Kullanici: "Frisk's heroes'un tum karakterlerini sil onun
   yerine bu powerborne'yi koy ... Marvel Project Addon v3.0.1
   cikarma, powerborne yaninda birlikte dursun."

   ---- BU DOSYANIN TUTTUGU SEY ----
   1. Marvel Project HALA DURUYOR -- "yerine koy" istegi
      FiskHeroes icindi, Marvel Project icin degil. Bu madde
      olmadan biri gun gelir 54 kahramani siler.
   2. Onbir mekanigin her biri GERCEKTEN calisiyor.
   3. Kaynaktan AYRILDIGIMIZ yerler:
      - ag HASAR VERMIYOR (tutuyor)
      - donduran nefes BLOK KOYMUYOR (kafes yasagi)
      - cekic cagirma esyayi SILMIYOR, cekiyor
      - elde pisirme adedi KORUYOR
      - dalis vurusu YERDEYKEN calismiyor
      - madde tablosu zayif (tasi elmasa cevirmiyor)
   4. Kendimizi ve botlarimizi vurmuyoruz.                  */

import { dunyaKur, oyuncuKur } from "./dunya.mjs";
import { tickIlerlet, _durum } from "@minecraft/server";
import { readFileSync, existsSync } from "node:fs";

const KOK = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

const w = console.warn;
const sus = () => { console.warn = () => {}; };
const ac = () => { console.warn = w; };
sus();
await import("./pack/main.js");
ac();

const ayar  = await import("./pack/ayarlar.js");
const kayit = await import("./pack/yetenekler/kayit.js");

let hata = false;
const kontrol = (ad, gecti, detay = "") => {
  if (!gecti) hata = true;
  console.log("  " + (gecti ? "✓" : "✗") + " " + ad + (detay ? "  ::  " + detay : ""));
};

const BAS = { x: 0.5, y: 90.6, z: 0.5 };

function kur(id, ek = {}) {
  const D = dunyaKur();
  const o = oyuncuKur(D.boyut, { x: 0, y: 0, z: 1 }, BAS);
  o.id = id; o.typeId = "minecraft:player"; o.name = id;
  o._hasar = []; o._etki = []; o._itme = [];
  o.applyDamage = (m) => { o._hasar.push(m); return true; };
  o.addEffect = (a, s, sec) => { o._etki.push({ a, s, sec }); };
  o.applyKnockback = (a, b) => {
    o._itme.push(typeof a === "object" ? { x: a.x, z: a.z, y: b } : { x: a, z: b });
    return true;
  };
  o._yazilar = [];
  o.onScreenDisplay = {
    _son: null,
    setActionBar(t) { this._son = t; o._yazilar.push(String(t)); },
    setTitle() {}
  };
  Object.assign(o, ek);
  _durum.oyuncular = [o];
  return { D, o };
}

function hedef(id, tip, x, y, z) {
  return {
    id, typeId: tip, isValid: true, name: id, location: { x, y, z },
    _hasar: [], _etki: [], _itme: [],
    applyDamage(m) { this._hasar.push(m); return true; },
    addEffect(a, s, sec) { this._etki.push({ a, s, sec }); },
    applyKnockback(a, b) {
      this._itme.push(typeof a === "object" ? { x: a.x, z: a.z, y: b } : { x: a, z: b });
      return true;
    },
    applyImpulse() { return true; }
  };
}

function calistir(kimlik, o, tick = 0) {
  const t = kayit.yetenekAl(kimlik);
  if (!t) return undefined;
  sus();
  const is = t.olustur(o);
  if (is && tick > 0) {
    for (let i = 0; i < tick; i++) { tickIlerlet(1); if (is.calis()) break; }
    is.bitir();
  }
  ac();
  return is;
}
const yaz = (o) => o._yazilar.join(" | ");

console.log("=== 0. MARVEL PROJECT HALA DURUYOR (asil madde) ===");
{
  /* "Yerine koy" istegi FISKHEROES icindi. Marvel Project
     54 kahramanla duruyor ve bu madde onu bekciliyor --
     yoksa biri gun gelir "yerine koyduk" diye siler.     */
  kontrol("REFERANS_MARVEL.md duruyor",
          existsSync(KOK + "/REFERANS_MARVEL.md"));
  kontrol("marvel.js duruyor",
          existsSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/marvel.js"));
  kontrol("marvel_tablo.py duruyor", existsSync(KOK + "/marvel_tablo.py"));
  const hepsi = kayit.tumYetenekler();
  kontrol("marvel_ yetenekleri duruyor",
          hepsi.filter((x) => x.kimlik.startsWith("marvel_")).length >= 8,
          hepsi.filter((x) => x.kimlik.startsWith("marvel_")).length + " yetenek");
  /* FiskHeroes ise gercekten gitmis olmali. */
  kontrol("kahraman.js hala YOK (Fisk gitti)",
          !existsSync(KOK + "/Simsek_TNT_ToprakTopu/scripts/yetenekler/kahraman.js"));
  kontrol("REFERANS_POWERBORNE.md yazildi",
          existsSync(KOK + "/REFERANS_POWERBORNE.md"));
}

console.log("");
console.log("=== 1. ONBIR MEKANIK KAYITLI ===");
{
  const k = ["duvar_tirmanma", "orumcek_hissi", "ag_at", "kalkan_firlat",
             "cekic_cagir", "yukari_yumruk", "dalis_vurusu",
             "donduran_nefes", "gok_gurlemesi", "madde_donustur", "elde_pisir"];
  kontrol("onbir tane", k.length === 11);
  for (const x of k) if (!kayit.yetenekAl(x)) kontrol(x + " kayitli", false);
  kontrol("hepsi kayitli", k.every((x) => !!kayit.yetenekAl(x)));
  kontrol("hepsi esyasiz", k.every((x) => kayit.yetenekAl(x).esyasiz === true));
  kontrol("sira carpismasi yok", kayit.siraDenetimi().length === 0,
          kayit.siraDenetimi().join(" | ") || "temiz");
}

console.log("");
console.log("=== 2. AG HASAR VERMIYOR, TUTUYOR ===");
{
  const { D, o } = kur("a1");
  const z = hedef("z", "minecraft:zombie", 0.5, 90, 4.5);
  D.boyut._varliklar = [o, z];
  calistir("ag_at", o);
  /* Kaynakta da ag hasar vermez: isi tutmak. */
  kontrol("ag HASAR VERMIYOR", z._hasar.length === 0, z._hasar.join(",") || "0");
  kontrol("ag yavaslatiyor",
          z._etki.some((e) => e.a === "slowness"), JSON.stringify(z._etki.map((x) => x.a)));
  kontrol("yavaslik SURELI",
          z._etki.every((e) => e.s > 0 && e.s <= 400),
          z._etki.map((e) => e.a + ":" + e.s).join(" "));
}

console.log("");
console.log("=== 3. DONDURAN NEFES BLOK KOYMUYOR ===");
{
  /* Kaynak hedefi buz blogunun icine hapsediyor. Bir oyuncuyu
     blogun icine hapsetmek bu depoda yasak.              */
  const { D, o } = kur("d1");
  const z = hedef("z2", "minecraft:zombie", 0.5, 90, 3.5);
  D.boyut._varliklar = [o, z];
  const oncesi = D.sayac.setType;
  calistir("donduran_nefes", o);
  kontrol("hedef yavaslatildi", z._etki.some((e) => e.a === "slowness"));
  kontrol("hedefe hasar verildi", z._hasar.length > 0, z._hasar.join(","));
  kontrol("HIC BLOK KOYULMADI", D.sayac.setType === oncesi,
          (D.sayac.setType - oncesi) + " blok");
}

console.log("");
console.log("=== 4. CEKIC CAGIRMA ESYAYI SILMIYOR ===");
{
  const { D, o } = kur("c1");
  const e1 = hedef("e1", "minecraft:item", 5.5, 90, 5.5);
  const e2 = hedef("e2", "minecraft:item", 8.5, 90, 2.5);
  e1.remove = () => { e1._silindi = true; };
  e2.remove = () => { e2._silindi = true; };
  D.boyut._varliklar = [o, e1, e2];
  calistir("cekic_cagir", o);
  kontrol("esyalar cekildi", e1._itme.length > 0 && e2._itme.length > 0,
          e1._itme.length + "/" + e2._itme.length);
  /* ASIL MADDE: yerdeki esyayi yok etmek de esya
     kaybettirmektir.                                     */
  kontrol("esyalar SILINMEDI", !e1._silindi && !e2._silindi);
  /* Cekme yonu OYUNCUYA dogru olmali. e1 (+x,+z)'de, yani
     itme (-x,-z) yonunde olmali.                         */
  kontrol("cekme yonu oyuncuya dogru",
          e1._itme[0].x < 0 && e1._itme[0].z < 0,
          JSON.stringify(e1._itme[0]));
}

console.log("");
console.log("=== 5. DALIS VURUSU YERDEYKEN CALISMIYOR ===");
{
  /* Kaynakta da oyle; bu, yetenegi "her zaman basilabilir
     bir alan hasari" olmaktan cikariyor.                 */
  const { D, o } = kur("y1", { isFalling: false, isJumping: false });
  const z = hedef("z3", "minecraft:zombie", 0.5, 90, 2.5);
  D.boyut._varliklar = [o, z];
  calistir("dalis_vurusu", o);
  kontrol("YERDEYKEN hasar vermiyor", z._hasar.length === 0,
          z._hasar.join(",") || "0");
  kontrol("  ve sebebini yaziyor", yaz(o).indexOf("HAVADA") !== -1, yaz(o));

  const { D: D2, o: o2 } = kur("y2", { isFalling: true });
  const z2 = hedef("z4", "minecraft:zombie", 0.5, 90, 2.5);
  D2.boyut._varliklar = [o2, z2];
  calistir("dalis_vurusu", o2);
  kontrol("HAVADAYKEN calisiyor", z2._hasar.length > 0, z2._hasar.join(","));
  kontrol("  oyuncu asagi itiliyor",
          o2._itme.some((i) => i.y < 0), JSON.stringify(o2._itme));
}

console.log("");
console.log("=== 6. YUKARI YUMRUK IKISINI DE KALDIRIYOR ===");
{
  const { D, o } = kur("u1");
  const z = hedef("z5", "minecraft:zombie", 0.5, 90, 2.5);
  D.boyut._varliklar = [o, z];
  calistir("yukari_yumruk", o);
  kontrol("hedefe hasar", z._hasar.length > 0, z._hasar.join(","));
  kontrol("hedef havaya kalkti", z._itme.some((i) => i.y > 0),
          JSON.stringify(z._itme));
  kontrol("KENDIMIZ de kalktik", o._itme.some((i) => i.y > 0),
          JSON.stringify(o._itme));
  kontrol("kendimize HASAR vermedik", o._hasar.length === 0);
}

console.log("");
console.log("=== 7. GOK GURLEMESI SAVURUYOR ===");
{
  const { D, o } = kur("g1");
  const z = hedef("z6", "minecraft:zombie", 4.5, 90, 0.5);
  D.boyut._varliklar = [o, z];
  calistir("gok_gurlemesi", o);
  kontrol("hedef savruldu", z._itme.length > 0, JSON.stringify(z._itme));
  /* +x'te duran hedef +x yonune savrulmali (DISARI). */
  kontrol("savrulma DISARI dogru", z._itme[0].x > 0, JSON.stringify(z._itme[0]));
  kontrol("hasar dusuk (is savurmak)",
          z._hasar[0] === ayar.PB_GOK_HASAR && ayar.PB_GOK_HASAR <= 5,
          String(z._hasar[0]));
}

console.log("");
console.log("=== 8. KALKAN SEKERKEN GUC KAYBEDIYOR ===");
{
  const { D, o } = kur("k1");
  const a = hedef("a", "minecraft:zombie", 0.5, 90, 3.0);
  const b = hedef("b", "minecraft:zombie", 0.5, 90, 5.0);
  const c = hedef("c", "minecraft:zombie", 0.5, 90, 7.0);
  D.boyut._varliklar = [o, a, b, c];
  calistir("kalkan_firlat", o);
  const h = [a, b, c].map((x) => x._hasar[0]).filter((x) => x !== undefined);
  kontrol("uc hedefe de vurdu", h.length === 3, h.join(","));
  kontrol("her sekmede hasar AZALIYOR",
          h[0] > h[1] && h[1] > h[2], h.join(" > "));
  kontrol("sekme tavani ayardan",
          h.length === ayar.PB_KALKAN_SEKME, String(ayar.PB_KALKAN_SEKME));
}

console.log("");
console.log("=== 9. MADDE TABLOSU ZAYIF (hile degil) ===");
{
  /* "Tasi elmasa cevir" bir yetenek degil hile olurdu. */
  const degerli = ["diamond", "emerald", "netherite", "gold_block",
                   "diamond_block", "ancient_debris", "beacon"];
  const cikti = [...ayar.PB_MADDE_TABLO.values()];
  kontrol("tabloda degerli blok URETILMIYOR",
          !cikti.some((v) => degerli.some((d) => v.indexOf(d) !== -1)),
          cikti.join(" ").slice(0, 90));
  kontrol("kum -> cam", ayar.PB_MADDE_TABLO.get("minecraft:sand") ===
          "minecraft:glass");
  kontrol("tablo kucuk (10 civari)", ayar.PB_MADDE_TABLO.size <= 14,
          ayar.PB_MADDE_TABLO.size + " kayit");
}

console.log("");
console.log("=== 10. PISIRME TABLOSU ADEDI KORUYOR ===");
{
  /* Tabloda olmayan esyaya dokunulmuyor; olanin yalniz turu
     degisiyor. Bu depoda hicbir yetenek esya goturmez.   */
  class SahteEsya {
    constructor(typeId, amount) { this.typeId = typeId; this.amount = amount; }
  }
  let takilan;
  const { D, o } = kur("p1", {
    getComponent: (ad) => (ad === "minecraft:equippable") ? {
      getEquipment: () => new SahteEsya("minecraft:beef", 7),
      setEquipment: (yuva, e) => { takilan = e; return true; }
    } : undefined
  });
  D.boyut._varliklar = [o];
  calistir("elde_pisir", o);
  kontrol("ham et pismis ete dondu",
          takilan && takilan.typeId === "minecraft:cooked_beef",
          takilan ? takilan.typeId : "yok");
  kontrol("ADET KORUNDU (7)", takilan && takilan.amount === 7,
          takilan ? String(takilan.amount) : "yok");

  /* Tabloda olmayan esya: DOKUNULMAMALI. */
  let takilan2;
  const { D: D2, o: o2 } = kur("p2", {
    getComponent: (ad) => (ad === "minecraft:equippable") ? {
      getEquipment: () => new SahteEsya("minecraft:diamond", 3),
      setEquipment: (yuva, e) => { takilan2 = e; return true; }
    } : undefined
  });
  D2.boyut._varliklar = [o2];
  calistir("elde_pisir", o2);
  kontrol("tabloda olmayan esyaya DOKUNULMADI", takilan2 === undefined,
          takilan2 ? takilan2.typeId : "dokunulmadi");
}

console.log("");
console.log("=== 11. KENDIMIZI ve BOTU VURMUYORUZ ===");
{
  const bottipi = [...ayar.KILIT_ATLA_TIPLER][0];
  const { D, o } = kur("b1");
  const bot = hedef("bot", bottipi, 0.5, 90, 2.0);
  const z = hedef("z7", "minecraft:zombie", 0.5, 90, 3.0);
  D.boyut._varliklar = [o, bot, z];
  calistir("gok_gurlemesi", o);
  kontrol("mob vuruldu", z._hasar.length > 0);
  kontrol("KENDIMIZ vurulmadi", o._hasar.length === 0, o._hasar.join(",") || "0");
  kontrol("BOTUMUZ vurulmadi", bot._hasar.length === 0,
          bottipi + " :: " + (bot._hasar.join(",") || "0"));
}

console.log("");
console.log("=== 12. DUVAR TIRMANMA: DUVAR YOKSA TIRMANMIYOR ===");
{
  /* Duvar yoksa tirmanma olmuyor -- yani bu bir UCUS degil
     TIRMANMA. Sahte dunyada y<64 tas, ustu hava: oyuncu
     y=90'da, onunde hava var.                            */
  const { D, o } = kur("t1");
  D.boyut._varliklar = [o];
  calistir("duvar_tirmanma", o, ayar.PB_TIRMAN_ARA * 5);
  kontrol("havada tirmanmiyor", o._itme.length === 0,
          o._itme.length + " itme");

  /* Onunde blok VARSA tirmanmali: bakis yonunu asagi cevirip
     tasa bakiyoruz (y+1 hala tas cunku oyuncu y=30'da).   */
  const { D: D2, o: o2 } = kur("t2");
  o2.location = { x: 0.5, y: 30, z: 0.5 };
  D2.boyut._varliklar = [o2];
  calistir("duvar_tirmanma", o2, ayar.PB_TIRMAN_ARA * 5);
  kontrol("duvar varken tirmaniyor", o2._itme.length > 0,
          o2._itme.length + " itme");
  kontrol("  itme YUKARI dogru", o2._itme.every((i) => i.y > 0),
          JSON.stringify(o2._itme[0]));
}

console.log(hata ? ">>> SORUN VAR" : ">>> powerborne yerinde");
process.exit(hata ? 1 : 0);
